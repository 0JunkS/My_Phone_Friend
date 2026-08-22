/**
 * bedSelector.js
 * -------------------------------------------------------------
 * 방석(펫 침대) 선택 + 배치 + 펫 수면 감지/모션 모듈
 *
 * 사용법 (app.js 상단에 추가):
 *   import { initBedSelector } from './bedSelector.js';
 *   initBedSelector();
 *
 * 다른 레이어(예: 화면 위 플로팅/PiP 창)에도 방석을 띄우고 싶다면:
 *   import { registerBedLayer, unregisterBedLayer } from './bedSelector.js';
 *   registerBedLayer(layerEl, () => myCharacterControllerInstance);
 *   ... (창이 닫힐 때) unregisterBedLayer(layerEl);
 */

import { pushNativeSync } from './nativeSync.js';

const STORAGE_KEY = 'mpf_selected_bed';

const BED_PRESETS = [
  { id: 'bed-orange', name: '오렌지 방석', src: './assets/beds/bed-orange.png' },
  { id: 'bed-gray', name: '그레이 방석', src: './assets/beds/bed-gray.webp' },
  { id: 'bed-red', name: '레드 방석', src: './assets/beds/bed-red.png' },
];

// 방석이 배치된 모든 레이어(메인 앱의 global-character-layer, 플로팅 PiP 창 등)를
// 추적한다. 각 항목: { layerEl, bedEl, getController, intervalId, sleeping }
const mountedLayers = [];

function loadSelectedBedId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveSelectedBedId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    /* storage unavailable, ignore */
  }
}

/** 옷장 모달 안에 방석 선택 그리드를 그림 (없으면 자동 생성) */
function renderBedPicker() {
  let grid = document.getElementById('bed-picker-grid');

  if (!grid) {
    const closetBody = document.querySelector('#modal-closet .modal-body');
    if (!closetBody) return; // 옷장 모달 자체가 없으면 포기

    const subtitle = document.createElement('div');
    subtitle.className = 'section-subtitle';
    subtitle.textContent = '🛏️ 잠자리(방석) 선택';
    closetBody.appendChild(subtitle);

    grid = document.createElement('div');
    grid.className = 'bed-picker-grid';
    grid.id = 'bed-picker-grid';
    closetBody.appendChild(grid);
  }

  const selectedId = loadSelectedBedId();

  grid.innerHTML = '';
  BED_PRESETS.forEach((bed) => {
    const item = document.createElement('div');
    item.className = 'picker-item bed-picker-item' + (bed.id === selectedId ? ' active' : '');
    item.dataset.bedId = bed.id;
    item.innerHTML = `
      <img class="bed-picker-thumb" src="${bed.src}" alt="${bed.name}" />
      <span class="picker-name">${bed.name}</span>
    `;
    item.addEventListener('click', () => selectBed(bed.id));
    grid.appendChild(item);
  });
}

function selectBed(bedId) {
  saveSelectedBedId(bedId);
  renderBedPicker();
  mountedLayers.forEach(applyBedToLayer);
  // 포그라운드 앱 WebView와 백그라운드 오버레이 WebView는 localStorage를
  // 공유하지 않으므로, 방석 선택도 외형 데이터와 같은 네이티브 통로로 푸시한다.
  pushNativeSync({ bedId });
}

/**
 * 네이티브(오버레이 웹뷰)가 window.applySyncedPetData(...)로 내려준 데이터에
 * bedId가 포함되어 있을 때, 이 값을 로컬 선택 상태에 반영하고 이미 마운트된
 * 모든 레이어(예: 오버레이의 global-character-layer)에 다시 그린다.
 * 네이티브로 재푸시하지 않는다 — 이건 네이티브에서 "받은" 값을 반영하는
 * 것이므로, 다시 보내면 불필요한 왕복이 생긴다.
 */
export function applySyncedBedId(bedId) {
  if (bedId === undefined || bedId === null) return;
  saveSelectedBedId(bedId);
  renderBedPicker();
  mountedLayers.forEach(applyBedToLayer);
}

/** 저장된(또는 방금 고른) 방석 이미지를 특정 레이어의 <img>에 반영 */
function applyBedToLayer(entry) {
  const bedId = loadSelectedBedId();
  const bed = BED_PRESETS.find((b) => b.id === bedId);
  if (!bed) {
    entry.bedEl.style.display = 'none';
    return;
  }
  entry.bedEl.src = bed.src;
  entry.bedEl.alt = bed.name;
  entry.bedEl.style.display = 'block';
}

/** 사각형 두 개가 겹치는지(펫이 방석 위에 있는지) 판정 */
function rectsOverlap(a, b, marginRatio = 0.5) {
  const ax = a.left - a.width * marginRatio * 0.2;
  const ay = a.top - a.height * marginRatio * 0.2;
  const aw = a.width * (1 + marginRatio * 0.2);
  const ah = a.height * (1 + marginRatio * 0.2);
  return !(
    b.right < ax ||
    b.left > ax + aw ||
    b.bottom < ay ||
    b.top > ay + ah
  );
}

function checkSleepOverlap(entry) {
  const controller = entry.getController && entry.getController();
  if (!controller || !controller.el || !entry.bedEl.isConnected) {
    if (entry.sleeping) {
      entry.sleeping = false;
      if (controller) controller.setSleeping(false);
    }
    return;
  }

  // While the character is being dragged/lifted, don't fight the user's hand.
  if (controller.isDragging) return;

  const bedRect = entry.bedEl.getBoundingClientRect();
  const petRect = controller.el.getBoundingClientRect();
  const overlapping = bedRect.width > 0 && rectsOverlap(bedRect, petRect);

  if (overlapping === entry.sleeping) return;
  entry.sleeping = overlapping;

  if (overlapping) {
    // Snap the character onto the cushion so it looks properly seated/
    // lying inside it instead of just happening to overlap it mid-wander.
    // The cushion's "seat" (where a pet would actually rest) sits a bit
    // below the visual center of the bed art (raised rim at the top).
    const anchorX = bedRect.left + bedRect.width / 2 - controller.width / 2;
    const anchorY = bedRect.top + bedRect.height * 0.62 - controller.height * 0.62;
    controller.setSleeping(true, { x: anchorX, y: anchorY });
  } else {
    controller.setSleeping(false);
  }
}

/**
 * Places (or re-places) the pet bed inside `layerEl` and starts watching
 * for the given character controller resting on top of it. `getController`
 * is a function so the caller can swap out the underlying controller later
 * (e.g. customization changes) without having to re-register.
 */
export function registerBedLayer(layerEl, getController) {
  if (!layerEl) return null;

  let entry = mountedLayers.find((e) => e.layerEl === layerEl);
  if (!entry) {
    const doc = layerEl.ownerDocument || document;
    const bedEl = doc.createElement('img');
    bedEl.className = 'pet-bed-corner';
    bedEl.alt = '';
    bedEl.style.display = 'none';
    // Insert as the very first child so it renders BEHIND the character
    // element(s) already (or later) appended to this same layer.
    layerEl.insertBefore(bedEl, layerEl.firstChild || null);

    entry = { layerEl, bedEl, getController, sleeping: false, intervalId: null };
    entry.intervalId = setInterval(() => checkSleepOverlap(entry), 400);
    mountedLayers.push(entry);
  } else {
    entry.getController = getController;
  }

  applyBedToLayer(entry);
  return entry;
}

/** 레이어(예: 플로팅 창)가 닫힐 때 호출해서 감시/DOM을 정리 */
export function unregisterBedLayer(layerEl) {
  const idx = mountedLayers.findIndex((e) => e.layerEl === layerEl);
  if (idx === -1) return;
  const [entry] = mountedLayers.splice(idx, 1);
  if (entry.intervalId) clearInterval(entry.intervalId);
  if (entry.bedEl && entry.bedEl.parentNode) entry.bedEl.parentNode.removeChild(entry.bedEl);
}

export function initBedSelector() {
  renderBedPicker();

  // 메인 앱의 전역 캐릭터 레이어(#global-character-layer)에 방석을 배치.
  // 오버레이/화면 위 배회 모드에서도 이 레이어는 계속 보이므로(캐릭터와
  // 동일한 레이어) 방석도 함께 보인다.
  const mainLayer = document.getElementById('global-character-layer');
  if (mainLayer) {
    registerBedLayer(mainLayer, () => window.appInstance && window.appInstance.character);
  }

  const closetBtn = document.getElementById('btn-open-closet');
  if (closetBtn) {
    closetBtn.addEventListener('click', renderBedPicker);
  }
  const radialCustomBtn = document.getElementById('radial-btn-custom');
  if (radialCustomBtn) {
    radialCustomBtn.addEventListener('click', renderBedPicker);
  }
}

/**
 * bedSelector.js
 * -------------------------------------------------------------
 * 방석(펫 침대) 선택 + 배경 구석 배치 + 펫 수면 감지 모듈
 *
 * 통합 방법 (app.js 상단에 추가):
 *   import { initBedSelector } from './bedSelector.js';
 *   initBedSelector();
 *
 * index.html 에는 아래 두 줄만 추가하면 됩니다 (</head> 직전, app.js 보다 위):
 *   <link rel="stylesheet" href="./src/css/bedSelector.css" />
 *
 * 그리고 #modal-closet 의 .modal-body 안, "액세서리 꾸미기" 섹션 다음쯤에
 * 아래 마크업을 붙여주세요 (없어도 initBedSelector가 동적으로 만들어 붙여줍니다.
 * 직접 넣고 싶다면 id="bed-picker-grid" 인 빈 div 하나만 있으면 됩니다):
 *
 *   <div class="section-subtitle">🛏️ 잠자리(방석) 선택</div>
 *   <div class="bed-picker-grid" id="bed-picker-grid"></div>
 */

const STORAGE_KEY = 'mpf_selected_bed';

// 3개의 방석 프리셋. src 경로는 프로젝트에 넣은 실제 이미지 경로로 맞춰주세요.
// (이번 답변과 함께 assets/beds/ 안에 3개 파일을 같이 전달했습니다)
const BED_PRESETS = [
  { id: 'bed-orange', name: '오렌지 방석', src: './assets/beds/bed-orange.png' },
  { id: 'bed-gray', name: '그레이 방석', src: './assets/beds/bed-gray.webp' },
  { id: 'bed-red', name: '레드 방석', src: './assets/beds/bed-red.png' },
];

let sleepCheckInterval = null;
let isPetSleeping = false;

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
    // 자동 삽입: 옷장 모달 body 마지막 부분에 섹션을 붙인다
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
  placeBedInCorner(bedId);
}

/** 배회 화면(companion-view) 구석에 선택된 방석을 배치 */
function placeBedInCorner(bedId) {
  const bed = BED_PRESETS.find((b) => b.id === bedId);
  const companionView = document.getElementById('companion-view');
  if (!bed || !companionView) return;

  let bedEl = document.getElementById('pet-bed-corner');
  if (!bedEl) {
    bedEl = document.createElement('img');
    bedEl.id = 'pet-bed-corner';
    bedEl.className = 'pet-bed-corner';
    // backdrop 바로 다음, 캐릭터 레이어보다 아래에 오도록 맨 앞쪽에 삽입
    companionView.insertBefore(bedEl, companionView.firstChild.nextSibling || null);
  }
  bedEl.src = bed.src;
  bedEl.alt = bed.name;
  bedEl.style.display = 'block';

  startSleepWatcher();
}

/** 저장된 선택값으로 초기 배치 (앱 로드 시 호출) */
function restoreBedFromStorage() {
  const savedId = loadSelectedBedId();
  if (savedId) placeBedInCorner(savedId);
}

/** 펫의 루트 엘리먼트를 최대한 유연하게 탐색 */
function findPetElement() {
  return (
    document.querySelector('#global-character-layer [data-pet-root]') ||
    document.querySelector('#global-character-layer .pet-character') ||
    document.querySelector('#global-character-layer .pet-instance') ||
    document.getElementById('global-character-layer')?.firstElementChild ||
    null
  );
}

/** 사각형 두 개가 겹치는지(펫이 방석 위에 있는지) 판정 */
function rectsOverlap(a, b, marginRatio = 0.5) {
  // marginRatio: 방석 영역을 살짝 넉넉하게 잡아 판정 (펫 발밑이 방석 중앙 근처면 인정)
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

function startSleepWatcher() {
  if (sleepCheckInterval) return;
  sleepCheckInterval = setInterval(() => {
    const bedEl = document.getElementById('pet-bed-corner');
    const petEl = findPetElement();
    const companionView = document.getElementById('companion-view');
    if (!bedEl || !petEl || !companionView || companionView.classList.contains('hidden')) {
      setPetSleeping(false);
      return;
    }

    const bedRect = bedEl.getBoundingClientRect();
    const petRect = petEl.getBoundingClientRect();
    const overlapping = rectsOverlap(bedRect, petRect);

    setPetSleeping(overlapping);
  }, 400);
}

function setPetSleeping(shouldSleep) {
  if (shouldSleep === isPetSleeping) return;
  isPetSleeping = shouldSleep;

  const petEl = findPetElement();
  if (petEl) {
    petEl.classList.toggle('pet-sleeping-visual', shouldSleep);
  }

  // 캐릭터 로직(character.js)이 있으면 커스텀 이벤트로 상태를 넘겨서
  // 실제 "자는 모션"으로 전환하게 한다. character.js 쪽에서
  // window.addEventListener('pet-sleep-state', e => { ... e.detail.sleeping ... })
  // 로 받아서 처리해주면 됨.
  window.dispatchEvent(
    new CustomEvent('pet-sleep-state', { detail: { sleeping: shouldSleep } })
  );

  // 전역 헬퍼가 있다면 우선 사용 (있으면 이쪽이 더 정확한 모션 전환을 해줄 가능성이 높음)
  if (shouldSleep && typeof window.setPetEmotion === 'function') {
    window.setPetEmotion('sleep');
  } else if (!shouldSleep && typeof window.setPetEmotion === 'function') {
    window.setPetEmotion('idle');
  }
}

export function initBedSelector() {
  renderBedPicker();
  restoreBedFromStorage();

  // 옷장 모달이 열릴 때마다 최신 선택 상태로 다시 그려준다
  const closetBtn = document.getElementById('btn-open-closet');
  if (closetBtn) {
    closetBtn.addEventListener('click', renderBedPicker);
  }
  const radialCustomBtn = document.getElementById('radial-btn-custom');
  if (radialCustomBtn) {
    radialCustomBtn.addEventListener('click', renderBedPicker);
  }
}

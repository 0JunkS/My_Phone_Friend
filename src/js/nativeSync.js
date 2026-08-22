/**
 * nativeSync.js
 * -------------------------------------------------------------
 * 캐릭터 외형(타입/액세서리/색상/크기/사진)과 선택된 방석(bedId)을
 * 한 번에 묶어서 window.AndroidPetBridge.syncPetData 로 네이티브에 푸시한다.
 *
 * 왜 필요한가:
 *   포그라운드 앱 WebView와 백그라운드 오버레이 WebView는 서로 다른
 *   WebView 인스턴스라 localStorage를 공유하지 않는다. 외형 데이터는
 *   이미 이 통로(AndroidPetBridge.syncPetData → SharedPreferences →
 *   FloatingPetService → 오버레이의 window.applySyncedPetData)를 타고
 *   있었지만, 방석 선택(bedSelector.js)은 localStorage에만 저장되어
 *   오버레이 쪽에 반영되지 않았다. 이 모듈은 두 값을 함께 보내서
 *   같은 통로로 동기화되게 한다.
 */

import { CHARACTER_TYPES } from './character.js';

const CUSTOM_PREF_KEY = 'my_phone_friend_custom_pref_v1';
const BED_STORAGE_KEY = 'mpf_selected_bed';

function readAppearancePref() {
  try {
    const saved = localStorage.getItem(CUSTOM_PREF_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function readSelectedBedId() {
  try {
    return localStorage.getItem(BED_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * 현재 외형 + 방석 선택 상태를 네이티브로 푸시한다.
 * 호출부가 이미 최신 값을 메모리에 들고 있다면 localStorage를 다시 읽지
 * 않도록 overrides로 넘겨줄 수 있다.
 *
 * @param {Object} [overrides]
 * @param {Object} [overrides.appearance] - customizer의 pref 객체(type/accessory/...)
 * @param {string|null} [overrides.bedId] - 방금 선택한 bedId (없으면 localStorage에서 읽음)
 */
export function pushNativeSync(overrides = {}) {
  if (typeof window === 'undefined' || !window.AndroidPetBridge || !window.AndroidPetBridge.syncPetData) {
    return;
  }

  const appearance = overrides.appearance || readAppearancePref() || {};
  const bedId = overrides.bedId !== undefined ? overrides.bedId : readSelectedBedId();

  const payload = {
    type: appearance.type || CHARACTER_TYPES.NANO_BANANA,
    accessory: appearance.accessory || 'none',
    hueShift: appearance.hueShift || 0,
    scale: appearance.scale || 1.0,
    customPhotoUrl: appearance.customPhotoUrl || null,
    showLimbs: appearance.showLimbs !== false,
    bedId: bedId || null,
  };

  try {
    window.AndroidPetBridge.syncPetData(JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to push native sync:', e);
  }
}

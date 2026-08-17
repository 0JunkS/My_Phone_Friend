/**
 * Character Customization & Wardrobe Engine
 * Handles character switching, accessories, color hue shifts,
 * and custom photo uploads with integrated SafetyFilter moderation.
 */

import { SafetyFilter } from './safetyFilter.js';
import { CHARACTER_TYPES, CHARACTER_STATES } from './character.js';
import { sound } from './audio.js';

const CUSTOM_PREF_KEY = 'my_phone_friend_custom_pref_v1';

export class CustomizerEngine {
  constructor(characterController) {
    this.character = characterController;
    this.currentType = CHARACTER_TYPES.NANO_BANANA;
    this.currentAccessory = 'none';
    this.currentHue = 0;
    this.customPhotoUrl = null;
    this.currentScale = 1.0;
    this.showLimbs = true; // on/off for custom photo arms & legs

    this.loadPreferences();
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem(CUSTOM_PREF_KEY);
      if (saved) {
        const pref = JSON.parse(saved);
        this.currentType = pref.type || CHARACTER_TYPES.NANO_BANANA;
        this.currentAccessory = pref.accessory || 'none';
        this.currentHue = pref.hueShift || 0;
        this.currentScale = pref.scale || 1.0;
        this.customPhotoUrl = pref.customPhotoUrl || null;
        this.showLimbs = pref.showLimbs !== false; // default true

        this.applyCustomization();

        if (window.AndroidPetBridge && window.AndroidPetBridge.syncPetData) {
          window.AndroidPetBridge.syncPetData(saved);
        }
      }
    } catch (e) {
      console.warn('Failed to load customizer preferences:', e);
    }
  }

  savePreferences() {
    try {
      const pref = {
        type: this.currentType,
        accessory: this.currentAccessory,
        hueShift: this.currentHue,
        scale: this.currentScale,
        customPhotoUrl: this.customPhotoUrl,
        showLimbs: this.showLimbs
      };
      const jsonStr = JSON.stringify(pref);
      localStorage.setItem(CUSTOM_PREF_KEY, jsonStr);
      window.dispatchEvent(new Event('characterUpdated'));

      if (window.AndroidPetBridge && window.AndroidPetBridge.syncPetData) {
        window.AndroidPetBridge.syncPetData(jsonStr);
      }
    } catch (e) {
      console.warn('Failed to save customizer preferences:', e);
    }
  }

  applyCustomization() {
    this.character.updateCustomization({
      type: this.currentType,
      accessory: this.currentAccessory,
      hueShift: this.currentHue,
      scale: this.currentScale,
      customPhotoUrl: this.customPhotoUrl,
      showLimbs: this.showLimbs
    });
  }

  setCharacterType(type) {
    this.currentType = type;
    this.applyCustomization();
    this.savePreferences();
    sound.playTap();
    this.character.setState(CHARACTER_STATES.HAPPY, 1800);
  }

  setAccessory(accessory) {
    this.currentAccessory = accessory;
    this.applyCustomization();
    this.savePreferences();
    sound.playTap();
    this.character.setState(CHARACTER_STATES.HAPPY, 1500);
  }

  setHue(hueValue) {
    this.currentHue = parseInt(hueValue, 10) || 0;
    this.applyCustomization();
    this.savePreferences();
  }

  setScale(scaleValue) {
    this.currentScale = parseFloat(scaleValue) || 1.0;
    this.applyCustomization();
    this.savePreferences();
  }

  setShowLimbs(visible) {
    this.showLimbs = !!visible;
    this.applyCustomization();
    this.savePreferences();
  }

  /**
   * Uploads and evaluates custom image with content censorship
   * @param {File} file
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async handleImageUpload(file) {
    if (!file) {
      return { success: false, message: '파일이 선택되지 않았습니다.' };
    }

    try {
      // 1. Run through Safety Moderation Filter
      const safetyResult = await SafetyFilter.evaluateImage(file);

      if (!safetyResult.safe) {
        sound.playWarning();
        return {
          success: false,
          censored: true,
          message: `[업로드 차단] ${safetyResult.reason}\n${safetyResult.details || ''}`
        };
      }

      // 2. Image passed safety check: Read as Data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.customPhotoUrl = e.target.result;
          this.currentType = CHARACTER_TYPES.CUSTOM_PHOTO;
          this.applyCustomization();
          this.savePreferences();
          sound.playHappy();
          this.character.setState(CHARACTER_STATES.HAPPY, 2500);
          this.character.say('새로운 캐릭터로 변신 완료! ✨', 3000);
          resolve({
            success: true,
            censored: false,
            message: '건전하고 안전한 사진으로 확인되어 캐릭터로 설정되었습니다! 🍌✨'
          });
        };
        reader.onerror = () => {
          resolve({ success: false, message: '이미지를 읽는 도중 오류가 발생했습니다.' });
        };
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error('Image upload failed:', err);
      return { success: false, message: '이미지 처리 중 문제가 발생했습니다.' };
    }
  }

  removeCustomPhoto() {
    this.customPhotoUrl = null;
    this.currentType = CHARACTER_TYPES.NANO_BANANA;
    this.applyCustomization();
    this.savePreferences();
    sound.playTap();
  }
}

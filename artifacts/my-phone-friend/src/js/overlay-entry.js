/**
 * Dedicated Entry Point for Android Background Floating Pet Overlay Window
 * Contains ZERO main app UI / text / buttons. Renders ONLY the dynamic pet character.
 */

import { CharacterController, CHARACTER_TYPES } from './character.js';
import { CustomizerEngine } from './customizer.js';

class OverlayApp {
  constructor() {
    window.appInstance = this;
    document.documentElement.classList.add('mode-overlay');
    document.body.classList.add('mode-overlay');

    const container = document.getElementById('global-character-layer') || document.body;
    this.character = new CharacterController(container, {
      type: CHARACTER_TYPES.NANO_BANANA,
      onTap: () => {
        if (this.character) {
          this.character.petCare(10);
          this.character.say('반가워요! 🍌✨', 2500);
        }
      }
    });

    this.customizer = new CustomizerEngine(this.character);

    const syncCharacterPref = () => {
      if (this.customizer) {
        this.customizer.loadPreferences();
      }
    };

    window.addEventListener('storage', (e) => {
      if (e.key === 'my_phone_friend_custom_pref_v1') syncCharacterPref();
    });
    window.addEventListener('characterUpdated', syncCharacterPref);

    this.character.say('곁에 있을게요! 🍌✨', 5000);
  }
}

window.applySyncedPetData = function(data) {
  if (!data) return;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch(e) {}
  }
  try {
    localStorage.setItem('my_phone_friend_custom_pref_v1', JSON.stringify(data));
  } catch(e) {}
  if (window.appInstance && window.appInstance.customizer) {
    window.appInstance.customizer.currentType = data.type || CHARACTER_TYPES.NANO_BANANA;
    window.appInstance.customizer.currentAccessory = data.accessory || 'none';
    window.appInstance.customizer.currentHue = data.hueShift || 0;
    window.appInstance.customizer.currentScale = data.scale || 1.0;
    window.appInstance.customizer.customPhotoUrl = data.customPhotoUrl || null;
    window.appInstance.customizer.applyCustomization();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  new OverlayApp();
});

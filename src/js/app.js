/**
 * Main Application Orchestrator for My Phone Friend
 */

import { sound } from './audio.js';
import { CharacterController, CHARACTER_TYPES, CHARACTER_STATES } from './character.js';
import { memoryEngine } from './memoryEngine.js';
import { AiChatEngine } from './aiChat.js';
import { CustomizerEngine } from './customizer.js';
import { FloatingPetEngine } from './floatingPet.js';

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
    window.appInstance.customizer.showLimbs = data.showLimbs !== false;
    window.appInstance.customizer.applyCustomization();
  }
};

class App {
  constructor() {
    window.appInstance = this;
    this.currentView = 'home';
    this.character = null;
    this.aiChat = null;
    this.customizer = null;
    this.floatingPet = null;
    this.isOverlayMode = false;

    this.init();
  }

  init() {
    this.isOverlayMode =
      window.location.search.includes('mode=overlay') ||
      window.location.hash.includes('android-overlay') ||
      window.isOverlayMode;

    if (this.isOverlayMode) {
      document.body.classList.add('mode-overlay');
      this.initOverlayMode();
      return;
    }

    // 1. Initialize Character in global-character-layer for clean overlay isolation
    const container = document.getElementById('global-character-layer') || document.body;
    this.character = new CharacterController(container, {
      type: CHARACTER_TYPES.NANO_BANANA,
      onLongPress: (x, y) => this.showRadialMenu(x, y),
      onTripleTap: () => {
        this.openChatWithMic();
      },
      onTap: () => {
        this.character.say('헤헤 반가워요! 🍌✨', 2500);
      }
    });

    // 2. Initialize Subsystems
    this.aiChat = new AiChatEngine(this.character);
    this.customizer = new CustomizerEngine(this.character);
    this.floatingPet = new FloatingPetEngine(this);

    // Real-time character customization sync across app & overlay background service
    const syncCharacterPref = () => {
      if (this.customizer) {
        this.customizer.loadPreferences();
      }
    };
    window.addEventListener('storage', (e) => {
      if (e.key === 'my_phone_friend_custom_pref_v1') syncCharacterPref();
    });
    window.addEventListener('characterUpdated', syncCharacterPref);

    if (document.body.classList.contains('mode-overlay')) {
      this.character.say('헤헤 밖에서도 함께해요! 🍌✨', 3500);
    }

    // 3. Bind UI & Events
    this.bindNavigation();
    this.bindRadialMenu();
    this.bindChatModal();
    this.bindMemoryModal();
    this.bindClosetModal();
    this.bindSettingsModal();
    this.bindSafetyModal();
    this.bindFloatingPetButton();
    this.updateMemoryPreview();

    // Periodic memory preview update
    setInterval(() => {
      this.updateMemoryPreview();
      this.renderMemoryList();
    }, 15000);
  }

  /**
   * OVERLAY MODE: this is the SAME index.html, same App class, same
   * character.js / customizer.js / aiChat.js used by the normal in-app
   * view above (init()) — loaded with ?mode=overlay by the Android
   * background service instead of a separate duplicate HTML/JS file.
   * That means appearance, accessories, and movement logic can never
   * drift between the app and the background pet: it's literally the
   * same code path. The `mode-overlay` CSS class (see style.css) hides
   * every bit of app chrome and leaves only the transparent character
   * layer visible, so the real background (home screen / other apps)
   * shows through underneath the pet.
   */
  initOverlayMode() {
    let container = document.getElementById('global-character-layer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-character-layer';
      document.body.appendChild(container);
    }

    const isNativeOverlay = !!window.AndroidPetBridge;

    this.character = new CharacterController(container, {
      type: CHARACTER_TYPES.NANO_BANANA,
      startX: 25,
      startY: 44,
      minY: 40,
      // Native Android overlay: the OS-level window is a small tracking
      // surface, so hand wandering decisions the real screen size and
      // let this same physics code drive the native window position.
      windowFollow: isNativeOverlay,
      viewportOverride: { width: window.innerWidth, height: window.innerHeight },
      onPositionChange: isNativeOverlay
        ? (x, y) => { window.AndroidPetBridge.updatePetPosition(x, y); }
        : null,
      onTap: () => {
        this.character.petCare(10);
        this.character.say('반가워요! 🍌✨', 2500);
      },
      onTripleTap: () => {
        this.startOverlayMicListening();
      }
    });

    // 1. Initialize Customizer in Overlay Mode to load and apply exact pet type, accessory, hue, scale, photo
    this.customizer = new CustomizerEngine(this.character);

    // 2. Same AI voice/chat engine as the foreground app (memory, persona
    // replies, optional Gemini) — no separate simplified copy.
    this.aiChat = new AiChatEngine(this.character);

    // 3. Real-time character customization sync across main app & overlay service
    const syncCharacterPref = () => {
      if (this.customizer) {
        this.customizer.loadPreferences();
      }
    };
    window.addEventListener('storage', (e) => {
      if (e.key === 'my_phone_friend_custom_pref_v1') syncCharacterPref();
    });
    window.addEventListener('characterUpdated', syncCharacterPref);

    // 4. Bridge hooks called by FloatingPetService (native side). Defined
    // here rather than in a separate overlay-only script, so there is a
    // single implementation shared with the rest of the app.
    window.setOverlayScreenSize = (width, height) => {
      this.character.setViewportOverride(width, height);
    };
    window.syncNativeDragPosition = (x, y) => {
      this.character.syncPositionFromNative(x, y);
    };
    window.setOverlayDragging = (isDragging) => {
      this.character.setExternalDragging(isDragging);
    };
    window.petTouched = () => {
      this.character.registerTap();
    };

    this.character.say('곁에 있을게요! 🍌✨', 7000);
  }

  /**
   * Triple-tap mic trigger for overlay mode. Reuses the exact same
   * AiChatEngine (memory lookup, persona replies, optional Gemini) as
   * the in-app chat modal — the only difference is the reply is shown
   * via the character's speech bubble instead of the (hidden, in
   * overlay mode) chat modal UI.
   */
  startOverlayMicListening() {
    if (!this.aiChat) return;
    if (this.aiChat.isListening) {
      this.aiChat.stopListening();
      return;
    }

    this.character.setState(CHARACTER_STATES.HAPPY, 8000);
    this.character.say('말씀하세요! 듣고 있어요 🎙️✨', 2500);

    this.aiChat.startListening(
      (transcript) => {
        this.character.say(`"${transcript}"`, 1800);
        setTimeout(() => this.aiChat.processMessage(transcript), 1400);
      },
      () => {},
      (err) => {
        const msg = err === 'no-speech'
          ? '아무 소리도 안 들렸어요! 다시 세 번 눌러주세요 🎙️'
          : '이 기기에서는 음성 인식을 사용할 수 없어요 😢';
        this.character.say(msg, 3000);
      }
    );
  }

  /* ========================================================================
     NAVIGATION (HOME <-> COMPANION ROAM MODE)
     ======================================================================== */
  bindNavigation() {
    const homeView = document.getElementById('home-view');
    const companionView = document.getElementById('companion-view');
    const btnEnterCompanion = document.getElementById('btn-enter-companion');
    const btnCompanionBackHome = document.getElementById('btn-companion-back-home');

    const switchToCompanion = async () => {
      sound.playHappy();
      this.character.petCare(10);
      this.character.say('화면 배회 모드 시작! 🍌✨', 3000);

      // 1. Android APK Native Bridge: Start overlay service and move app immediately to phone background
      if (window.AndroidPetBridge) {
        if (!window.AndroidPetBridge.isOverlayGranted()) {
          window.AndroidPetBridge.requestPermission();
          alert('스마트폰 화면 위에 펫을 띄우려면 [다른 앱 위에 표시] 권한을 허용해주세요! 🍌');
          return;
        }
        window.AndroidPetBridge.moveToBackground();
        return;
      }

      // 2. Desktop/Web fallback: Launch picture-in-picture or companion view
      if ('documentPictureInPicture' in window || document.pictureInPictureEnabled) {
        await this.floatingPet.openFloatingPet();
      } else {
        this.currentView = 'companion';
        homeView.classList.add('hidden');
        companionView.classList.remove('hidden');
      }
    };

    const switchToHome = () => {
      this.currentView = 'home';
      companionView.classList.add('hidden');
      homeView.classList.remove('hidden');
      this.hideRadialMenu();
      sound.playTap();
      this.updateMemoryPreview();
    };

    btnEnterCompanion.addEventListener('click', switchToCompanion);
    btnCompanionBackHome.addEventListener('click', switchToHome);
  }

  /* ========================================================================
     ALWAYS-ON-TOP FLOATING PET BUTTON
     ======================================================================== */
  bindFloatingPetButton() {
    const btnTogglePip = document.getElementById('btn-toggle-pip');
    if (btnTogglePip) {
      btnTogglePip.addEventListener('click', async () => {
        await this.floatingPet.toggleFloatingPet();
      });
    }
  }

  /* ========================================================================
     LONG-PRESS RADIAL ACTION MENU
     ======================================================================== */
  showRadialMenu(x, y) {
    const menu = document.getElementById('radial-menu');
    const menuWidth = 220;
    const menuHeight = 240;
    const clampedX = Math.max(menuWidth / 2 + 10, Math.min(window.innerWidth - menuWidth / 2 - 10, x));
    const clampedY = Math.max(menuHeight / 2 + 10, Math.min(window.innerHeight - menuHeight / 2 - 10, y));

    menu.style.left = `${clampedX}px`;
    menu.style.top = `${clampedY}px`;
    menu.classList.add('active');
  }

  hideRadialMenu() {
    const menu = document.getElementById('radial-menu');
    menu.classList.remove('active');
  }

  bindRadialMenu() {
    const menu = document.getElementById('radial-menu');

    document.getElementById('radial-btn-talk').addEventListener('click', () => {
      this.hideRadialMenu();
      this.openChatWithMic();
    });

    document.getElementById('radial-btn-change').addEventListener('click', () => {
      this.hideRadialMenu();
      this.openModal('modal-closet');
      sound.playTap();
    });

    document.getElementById('radial-btn-custom').addEventListener('click', () => {
      this.hideRadialMenu();
      this.openModal('modal-closet');
      sound.playTap();
    });

    document.getElementById('radial-btn-memory').addEventListener('click', () => {
      this.hideRadialMenu();
      this.openModal('modal-memory');
      sound.playTap();
    });

    document.getElementById('radial-btn-home').addEventListener('click', () => {
      this.hideRadialMenu();
      document.getElementById('btn-companion-back-home').click();
      sound.playTap();
    });

    document.getElementById('radial-btn-close').addEventListener('click', () => {
      this.hideRadialMenu();
      sound.playTap();
    });

    window.addEventListener('pointerdown', (e) => {
      if (menu.classList.contains('active') && !menu.contains(e.target) && !e.target.closest('.character-container')) {
        this.hideRadialMenu();
      }
    });
  }

  /* ========================================================================
     MODAL MANAGEMENT
     ======================================================================== */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      sound.playMenuOpen();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      sound.playTap();
    }
  }

  bindSafetyModal() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close');
        this.closeModal(targetId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
  }

  /* ========================================================================
     MODAL 1: AI VOICE CHAT & TRIPLE TAP MIC TRIGGER
     ======================================================================== */
  openChatWithMic() {
    this.openModal('modal-chat');
    const btnMicToggle = document.getElementById('btn-mic-toggle');
    if (btnMicToggle && !this.aiChat.isListening) {
      btnMicToggle.click();
    }
  }

  bindChatModal() {
    const btnOpenTalk = document.getElementById('btn-open-talk');
    const btnMicToggle = document.getElementById('btn-mic-toggle');
    const micIcon = document.getElementById('mic-icon');
    const micStatusLabel = document.getElementById('mic-status-label');
    const chatWave = document.getElementById('chat-wave');
    const chatTextInput = document.getElementById('chat-text-input');
    const btnSendChat = document.getElementById('btn-send-chat');
    const chatHistory = document.getElementById('chat-history');
    const chatHeaderBtnMemory = document.getElementById('chat-header-btn-memory');

    btnOpenTalk.addEventListener('click', () => {
      this.openChatWithMic();
    });

    if (chatHeaderBtnMemory) {
      chatHeaderBtnMemory.addEventListener('click', () => {
        this.renderMemoryList();
        this.openModal('modal-memory');
      });
    }

    const addMessageToLog = (text, sender = 'bot') => {
      const msg = document.createElement('div');
      msg.className = `chat-msg ${sender}`;
      msg.innerHTML = text.replace(/\n/g, '<br>');
      chatHistory.appendChild(msg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    };

    const handleSendMessage = async (rawText) => {
      const text = (rawText || chatTextInput.value).trim();
      if (!text) return;
      chatTextInput.value = '';

      addMessageToLog(text, 'user');
      sound.playTap();

      this.character.say('💬 ' + text.substring(0, 30), 2500);

      const result = await this.aiChat.processMessage(text);
      addMessageToLog(result.reply, 'bot');
      this.updateMemoryPreview();
    };

    btnSendChat.addEventListener('click', () => handleSendMessage());
    chatTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });

    // Voice Mic Toggle (STT)
    btnMicToggle.addEventListener('click', () => {
      if (this.aiChat.isListening) {
        this.aiChat.stopListening();
        chatWave.classList.remove('listening');
        micIcon.textContent = '🎙️';
        micStatusLabel.textContent = '말하기 시작';
      } else {
        sound.playTap();
        chatWave.classList.add('listening');
        micIcon.textContent = '🛑';
        micStatusLabel.textContent = '듣고 있어요...';

        this.aiChat.startListening(
          (recognizedText) => {
            handleSendMessage(recognizedText);
          },
          () => {
            chatWave.classList.remove('listening');
            micIcon.textContent = '🎙️';
            micStatusLabel.textContent = '말하기 시작';
          },
          (err) => {
            chatWave.classList.remove('listening');
            micIcon.textContent = '🎙️';
            micStatusLabel.textContent = '말하기 시작';
            addMessageToLog(`음성 인식 안내: ${err}`, 'bot');
          }
        );
      }
    });
  }

  /* ========================================================================
     MODAL 2: 3-DAY MEMORY BOX
     ======================================================================== */
  bindMemoryModal() {
    const btnOpenMemory = document.getElementById('btn-open-memory');
    const bannerMemoryQuick = document.getElementById('banner-memory-quick');
    const memoryAddInput = document.getElementById('memory-add-input');
    const btnAddMemory = document.getElementById('btn-add-memory');

    const openMem = () => {
      this.renderMemoryList();
      this.openModal('modal-memory');
    };

    btnOpenMemory.addEventListener('click', openMem);
    bannerMemoryQuick.addEventListener('click', openMem);

    btnAddMemory.addEventListener('click', () => {
      const text = memoryAddInput.value.trim();
      if (!text) return;
      memoryEngine.addMemory(text);
      memoryAddInput.value = '';
      sound.playHappy();
      this.renderMemoryList();
      this.updateMemoryPreview();
      this.character.petCare(15);
      this.character.say(`"${text}" 기억 완료! 📦✨`, 3000);
    });

    memoryAddInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnAddMemory.click();
    });
  }

  renderMemoryList() {
    const container = document.getElementById('memory-list-container');
    if (!container) return;
    const memories = memoryEngine.getAll();

    if (memories.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 0.85rem;">
          🍌 저장된 기억이 없습니다.<br>"나중에 약 사야 돼"라고 말해보세요!
        </div>
      `;
      return;
    }

    container.innerHTML = memories.map(m => `
      <div class="memory-item-card" data-id="${m.id}">
        <div class="memory-item-content">
          <div class="memory-item-title">✨ ${this.escapeHtml(m.item)}</div>
          <div class="memory-item-timer">
            <span>⏳</span> <span>남은 시간: ${m.remainingTimeFormatted}</span>
            <span style="opacity: 0.6; margin-left: 6px;">(${m.timeAgoFormatted})</span>
          </div>
        </div>
        <button class="memory-del-btn" data-del="${m.id}" title="삭제">🗑️</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del');
        memoryEngine.delete(id);
        sound.playTap();
        this.renderMemoryList();
        this.updateMemoryPreview();
      });
    });
  }

  updateMemoryPreview() {
    const badge = document.getElementById('memory-quick-count');
    const textLabel = document.getElementById('memory-quick-text');
    const memories = memoryEngine.getAll();

    if (badge) badge.textContent = `${memories.length}개`;
    if (textLabel) {
      if (memories.length > 0) {
        textLabel.textContent = `최근: "${memories[0].item}" (${memories[0].remainingTimeFormatted} 남음)`;
      } else {
        textLabel.textContent = `"나중에 ~ 필요해"라고 말하면 3일간 기억해요!`;
      }
    }
  }

  /* ========================================================================
     MODAL 3: CLOSET & CUSTOMIZER
     ======================================================================== */
  bindClosetModal() {
    const btnOpenCloset = document.getElementById('btn-open-closet');
    const characterItems = document.querySelectorAll('.character-picker-grid .picker-item');
    const accessoryItems = document.querySelectorAll('.accessory-picker-grid .picker-item');
    const colorSlider = document.getElementById('color-hue-slider');
    const hueValueLabel = document.getElementById('hue-value-label');
    const btnUploadPhoto = document.getElementById('btn-upload-photo');
    const photoUploadInput = document.getElementById('photo-upload-input');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');
    const currentPetName = document.getElementById('current-pet-name');
    const limbsToggleRow = document.getElementById('limbs-toggle-row');
    const limbsCheckbox = document.getElementById('limbs-toggle-checkbox');
    const limbsTrack = document.getElementById('limbs-toggle-track');
    const limbsThumb = document.getElementById('limbs-toggle-thumb');

    // Helper to update toggle visual state
    const updateLimbsToggleUI = (checked) => {
      if (!limbsTrack || !limbsThumb) return;
      limbsTrack.style.background = checked ? 'var(--accent-primary, #a78bfa)' : 'rgba(255,255,255,0.2)';
      limbsThumb.style.left = checked ? '22px' : '3px';
    };

    // Show/hide and sync limbs toggle row with current state
    const showLimbsToggle = (show) => {
      if (limbsToggleRow) {
        limbsToggleRow.style.display = show ? 'flex' : 'none';
      }
      if (show && limbsCheckbox) {
        const current = this.customizer ? this.customizer.showLimbs : true;
        limbsCheckbox.checked = current;
        updateLimbsToggleUI(current);
      }
    };

    // Check if custom photo is already loaded on open
    btnOpenCloset.addEventListener('click', () => {
      this.openModal('modal-closet');
      const isCustom = this.customizer && this.customizer.currentType === 'custom_photo';
      if (isCustom && btnRemovePhoto) btnRemovePhoto.style.display = 'block';
      showLimbsToggle(isCustom);
    });

    const names = {
      nano_banana: '나노바나나',
      berry_cat: '딸기냥이',
      cloud_puppy: '구름댕이',
      choco_dino: '초코공룡',
      custom_photo: '내 사진 캐릭터'
    };

    characterItems.forEach(item => {
      item.addEventListener('click', () => {
        characterItems.forEach(c => c.classList.remove('active'));
        item.classList.add('active');
        const type = item.getAttribute('data-type');
        this.customizer.setCharacterType(type);
        if (currentPetName) currentPetName.textContent = names[type] || '내 폰 안의 친구';
        showLimbsToggle(false);
      });
    });

    accessoryItems.forEach(item => {
      item.addEventListener('click', () => {
        accessoryItems.forEach(a => a.classList.remove('active'));
        item.classList.add('active');
        const acc = item.getAttribute('data-accessory');
        this.customizer.setAccessory(acc);
      });
    });

    colorSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      hueValueLabel.textContent = `${val}°`;
      this.customizer.setHue(val);
    });

    const scaleSlider = document.getElementById('pet-scale-slider');
    const scaleValueLabel = document.getElementById('scale-value-label');

    if (scaleSlider) {
      if (this.customizer && this.customizer.currentScale) {
        scaleSlider.value = this.customizer.currentScale;
        if (scaleValueLabel) scaleValueLabel.textContent = `${Math.round(this.customizer.currentScale * 100)}%`;
      }
      scaleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        if (scaleValueLabel) scaleValueLabel.textContent = `${Math.round(val * 100)}%`;
        this.customizer.setScale(val);
      });
    }

    btnUploadPhoto.addEventListener('click', () => {
      photoUploadInput.click();
    });

    photoUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const uploadResult = await this.customizer.handleImageUpload(file);
      photoUploadInput.value = '';

      if (!uploadResult.success) {
        const alertMsg = document.getElementById('safety-alert-message');
        if (alertMsg) alertMsg.textContent = uploadResult.message;
        this.openModal('modal-safety-alert');
      } else {
        if (btnRemovePhoto) btnRemovePhoto.style.display = 'block';
        if (currentPetName) currentPetName.textContent = '내 사진 캐릭터';
        showLimbsToggle(true);
        this.closeModal('modal-closet');
      }
    });

    // Limbs toggle: directly bind the click on the visible switch instead of
    // only relying on native <label> → hidden checkbox forwarding, since some
    // Android WebView builds don't reliably forward clicks to a
    // display:none input even when wrapped in its <label>. This guarantees
    // the toggle works everywhere (desktop browser, in-app WebView, overlay).
    if (limbsCheckbox) {
      const toggleLimbs = () => {
        limbsCheckbox.checked = !limbsCheckbox.checked;
        updateLimbsToggleUI(limbsCheckbox.checked);
        this.customizer.setShowLimbs(limbsCheckbox.checked);
      };

      const limbsToggleLabel = limbsCheckbox.closest('.toggle-switch');
      if (limbsToggleLabel) {
        limbsToggleLabel.addEventListener('click', (e) => {
          e.preventDefault();
          toggleLimbs();
        });
      }

      // Still listen for 'change' in case the label forwarding does fire
      // natively (e.g. keyboard/space-bar toggling) so state stays in sync
      // without double-toggling.
      limbsCheckbox.addEventListener('change', () => {
        updateLimbsToggleUI(limbsCheckbox.checked);
        this.customizer.setShowLimbs(limbsCheckbox.checked);
      });
    }

    btnRemovePhoto.addEventListener('click', () => {
      this.customizer.removeCustomPhoto();
      btnRemovePhoto.style.display = 'none';
      showLimbsToggle(false);
      if (currentPetName) currentPetName.textContent = '나노바나나';
      characterItems.forEach(c => {
        if (c.getAttribute('data-type') === 'nano_banana') c.classList.add('active');
        else c.classList.remove('active');
      });
    });
  }

  /* ========================================================================
     MODAL 4: SETTINGS & ANDROID APK BUILD
     ======================================================================== */
  bindSettingsModal() {
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const soundStatusText = document.getElementById('sound-status-text');
    const geminiKeyInput = document.getElementById('gemini-key-input');
    const btnSaveGeminiKey = document.getElementById('btn-save-gemini-key');

    btnOpenSettings.addEventListener('click', () => {
      if (this.aiChat.geminiApiKey) {
        geminiKeyInput.value = this.aiChat.geminiApiKey;
      }
      this.openModal('modal-settings');
    });

    btnToggleSound.addEventListener('click', () => {
      const enabled = sound.toggleSound();
      soundStatusText.textContent = enabled ? '🔊 켜짐' : '🔇 꺼짐';
      if (enabled) sound.playTap();
    });

    btnSaveGeminiKey.addEventListener('click', () => {
      const key = geminiKeyInput.value.trim();
      this.aiChat.saveSettings({ geminiApiKey: key });
      sound.playHappy();
      alert('Gemini API 설정이 저장되었습니다! 🍌✨');
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});

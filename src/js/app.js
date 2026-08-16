/**
 * Main Application Orchestrator for My Phone Friend
 */

import { sound } from './audio.js';
import { CharacterController, CHARACTER_TYPES, CHARACTER_STATES } from './character.js';
import { memoryEngine } from './memoryEngine.js';
import { AiChatEngine } from './aiChat.js';
import { CustomizerEngine } from './customizer.js';
import { FloatingPetEngine } from './floatingPet.js';

class App {
  constructor() {
    this.currentView = 'home';
    this.character = null;
    this.aiChat = null;
    this.customizer = null;
    this.floatingPet = null;

    this.init();
  }

  init() {
    // 1. Initialize Character directly on document.body for 100% reliable mobile touch hit testing
    const container = document.body;
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

  /* ========================================================================
     NAVIGATION (HOME <-> COMPANION ROAM MODE)
     ======================================================================== */
  bindNavigation() {
    const homeView = document.getElementById('home-view');
    const companionView = document.getElementById('companion-view');
    const btnEnterCompanion = document.getElementById('btn-enter-companion');
    const btnCompanionBackHome = document.getElementById('btn-companion-back-home');

    const switchToCompanion = () => {
      this.currentView = 'companion';
      homeView.classList.add('hidden');
      companionView.classList.remove('hidden');
      sound.playHappy();
      this.character.petCare(10);
      this.character.say('화면 배회 모드 시작! 🍌✨', 3000);
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

    btnOpenCloset.addEventListener('click', () => {
      this.openModal('modal-closet');
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
        this.closeModal('modal-closet');
      }
    });

    btnRemovePhoto.addEventListener('click', () => {
      this.customizer.removeCustomPhoto();
      btnRemovePhoto.style.display = 'none';
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

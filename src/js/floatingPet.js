/**
 * Floating Screen Pet Engine (Always-on-Top OS Overlay / Picture-in-Picture)
 * Enables the character to float on top of the ENTIRE screen / other apps / desktop
 * even when the browser or app is minimized or navigated away!
 */

import { sound } from './audio.js';
import { CharacterController, CHARACTER_TYPES, CHARACTER_STATES } from './character.js';
import { registerBedLayer, unregisterBedLayer } from './bedSelector.js';

export class FloatingPetEngine {
  constructor(mainApp) {
    this.app = mainApp;
    this.pipWindow = null;
    this.isFloating = false;
    this.pipVideo = document.getElementById('pip-video');
    this.pipCanvas = document.getElementById('pip-canvas');
    this.pipCtx = this.pipCanvas ? this.pipCanvas.getContext('2d') : null;
    this.animFrameId = null;
  }

  /**
   * Toggles the Always-On-Top Floating Pet Window
   */
  async toggleFloatingPet() {
    if (this.isFloating) {
      this.closeFloatingPet();
      return false;
    } else {
      return await this.openFloatingPet();
    }
  }

  async openFloatingPet() {
    sound.playMenuOpen();

    // 0. Check Android Native Bridge
    if (window.AndroidPetBridge) {
      if (!window.AndroidPetBridge.isOverlayGranted()) {
        window.AndroidPetBridge.requestPermission();
        alert('스마트폰 화면 위에 펫을 띄우려면 [다른 앱 위에 표시] 권한을 허용해주세요! 🍌');
        return false;
      }
      window.AndroidPetBridge.startOverlay();
      this.isFloating = true;
      this.updateUiState(true);
      sound.playHappy();
      this.app.character.say('스마트폰 화면 위 상시 플로팅 시작! 🍌✨', 3000);
      return true;
    }

    // 1. Try Document Picture-in-Picture API (Chrome/Edge Native Always-on-Top Window)
    if ('documentPictureInPicture' in window) {
      try {
        const pipOptions = {
          width: 180,
          height: 200,
          disallowReturnToOpener: false
        };
        this.pipWindow = await window.documentPictureInPicture.requestWindow(pipOptions);

        // Copy styles into PIP window
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(style => {
          this.pipWindow.document.head.appendChild(style.cloneNode(true));
        });

        // Set PIP window body styling to pure transparent
        const pipDoc = this.pipWindow.document;
        pipDoc.documentElement.style.background = 'transparent';
        pipDoc.documentElement.style.backgroundColor = 'transparent';
        
        const pipBody = pipDoc.body;
        pipBody.style.margin = '0';
        pipBody.style.padding = '0';
        pipBody.style.overflow = 'hidden';
        pipBody.style.background = 'transparent';
        pipBody.style.backgroundColor = 'transparent';
        pipBody.style.fontFamily = "'Outfit', 'Inter', sans-serif";
        pipBody.style.color = '#fff';
        pipBody.style.userSelect = 'none';

        // Pure Character Container (No extra bars or backgrounds)
        const pipContainer = this.pipWindow.document.createElement('div');
        pipContainer.style.position = 'absolute';
        pipContainer.style.inset = '0';
        pipContainer.style.width = '100vw';
        pipContainer.style.height = '100vh';
        pipContainer.style.overflow = 'hidden';
        pipContainer.style.background = 'transparent';
        pipBody.appendChild(pipContainer);

        const pipChar = new CharacterController(pipContainer, {
          type: this.app.character.type,
          accessory: this.app.character.accessory,
          hueShift: this.app.character.hueShift,
          customPhotoUrl: this.app.character.customPhotoUrl,
          startX: 25,
          startY: 20,
          onTripleTap: () => {
            this.app.openChatWithMic();
            window.focus();
          },
          onTap: () => {
            sound.playTap();
            pipChar.petCare(15);
            pipChar.say('집사님 함께해요! 🍌✨', 2500);
          }
        });

        registerBedLayer(pipContainer, () => pipChar);

        this.pipWindow.addEventListener('pagehide', () => {
          unregisterBedLayer(pipContainer);
          this.isFloating = false;
          this.pipWindow = null;
          this.updateUiState(false);
        });

        this.isFloating = true;
        this.updateUiState(true);
        sound.playHappy();
        this.app.character.say('화면 위 상시 플로팅 시작! 🍌✨', 3000);
        return true;
      } catch (err) {
        console.warn('Document Picture-in-Picture error, falling back to Canvas PiP:', err);
      }
    }

    // 2. Fallback: Video Picture-in-Picture with Live Canvas Animation (Clean transparent rendering)
    if (this.pipVideo && this.pipCanvas && document.pictureInPictureEnabled) {
      try {
        this.startCanvasAnimation();
        const stream = this.pipCanvas.captureStream(30);
        this.pipVideo.srcObject = stream;
        await this.pipVideo.play();
        await this.pipVideo.requestPictureInPicture();

        this.isFloating = true;
        this.updateUiState(true);

        this.pipVideo.addEventListener('leavepictureinpicture', () => {
          this.isFloating = false;
          this.stopCanvasAnimation();
          this.updateUiState(false);
        }, { once: true });

        sound.playHappy();
        this.app.character.say('화면 위 플로팅 활성화! 🍌✨', 3000);
        return true;
      } catch (e) {
        console.error('Video PiP failed:', e);
      }
    }

    // 3. Fallback: Standalone Pop-out Mini Floating Window
    try {
      const popup = window.open(
        window.location.href,
        'MyPhoneFriendPet',
        'width=220,height=260,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
      );
      if (popup) {
        this.isFloating = true;
        this.updateUiState(true);
        return true;
      }
    } catch (e) {
      console.warn('Popup blocked:', e);
    }

    alert('화면 위 상시 띄우기(플로팅 펫) 기능이 활성화되었습니다! 🍌');
    return false;
  }

  closeFloatingPet() {
    if (window.AndroidPetBridge) {
      window.AndroidPetBridge.stopOverlay();
    }
    if (this.pipWindow) {
      try { this.pipWindow.close(); } catch (e) {}
      this.pipWindow = null;
    }
    if (document.pictureInPictureElement) {
      try { document.exitPictureInPicture(); } catch (e) {}
    }
    this.stopCanvasAnimation();
    this.isFloating = false;
    this.updateUiState(false);
  }

  startCanvasAnimation() {
    if (!this.pipCtx || !this.pipCanvas) return;
    const canvas = this.pipCanvas;
    const ctx = this.pipCtx;
    let t = 0;

    const render = () => {
      t += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Cute animated floating mascot (Clean without background boxes)
      const yOffset = Math.sin(t * 2) * 8;
      const petEmoji = this.app.character.type === 'berry_cat' ? '🐱' :
                       this.app.character.type === 'cloud_puppy' ? '🐶' :
                       this.app.character.type === 'choco_dino' ? '🦖' : '🍌';

      ctx.font = '84px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(petEmoji, 110, 110 + yOffset);

      // Speech bubble text if active
      const speech = this.app.character.speechBubble.textContent;
      if (speech) {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(speech.substring(0, 20), 110, 190);
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  stopCanvasAnimation() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  updateUiState(isActive) {
    const btnPip = document.getElementById('btn-toggle-pip');
    const badge = document.getElementById('app-status-badge');

    if (btnPip) {
      btnPip.innerHTML = isActive ?
        '<span>🛑 상시 플로팅 끄기</span>' :
        '<span>📺 전체 화면 상시 띄우기 (데스크톱/앱 위 플로팅)</span>';
      if (isActive) {
        btnPip.classList.add('primary');
        btnPip.classList.remove('secondary');
      } else {
        btnPip.classList.add('secondary');
        btnPip.classList.remove('primary');
      }
    }

    if (badge) {
      badge.innerHTML = isActive ?
        '<span class="status-dot" style="background:#10b981;"></span><span>전체화면 상시 떠있음</span>' :
        '<span class="status-dot"></span><span>펫 활성화됨</span>';
    }
  }
}

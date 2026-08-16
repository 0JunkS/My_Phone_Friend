/**
 * Nano Banana & Companion Character Engine
 * Features:
 * - Autonomous Emotion & Affection Engine (Happy on care/praise, Sad on neglect/idle, Walk, Lifted)
 * - Triple Tap (3 rapid clicks/taps) -> triggers AI Microphone Chat
 * - Idle / 1-hour inactivity boredom check & speech bubble
 * - Unflipped upright speech bubble system (never mirrored or distorted)
 * - Physics bounds, gravity, drag & drop inertia, long-press radial menu trigger
 * - Procedural vector rendering for Nano Banana & cute presets + Custom Uploaded Photo
 */

import { sound } from './audio.js';

export const CHARACTER_TYPES = {
  NANO_BANANA: 'nano_banana',
  BERRY_CAT: 'berry_cat',
  CLOUD_PUPPY: 'cloud_puppy',
  CHOCO_DINO: 'choco_dino',
  CUSTOM_PHOTO: 'custom_photo'
};

export const CHARACTER_STATES = {
  WALK: 'walk',
  LIFTED: 'lifted',
  SAD: 'sad',
  HAPPY: 'happy'
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export class CharacterController {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.type = options.type || CHARACTER_TYPES.NANO_BANANA;
    this.state = CHARACTER_STATES.WALK;
    this.customPhotoUrl = options.customPhotoUrl || null;
    this.accessory = options.accessory || 'none';
    this.hueShift = options.hueShift || 0;

    // Affection & Care Engine
    this.affection = 70; // 0 to 100
    this.lastCareTime = Date.now();
    this.lastSpeechTime = Date.now();
    this.careDecayTimer = null;

    // Spatial & Physics state
    this.x = options.startX || Math.max(50, window.innerWidth / 2 - 55);
    this.y = options.startY || Math.max(100, window.innerHeight - 240);
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = 0;
    this.width = 110;
    this.height = 120;
    this.facingRight = true;

    // Interaction & Tap State
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.pointerVx = 0;
    this.pointerVy = 0;
    this.longPressTimer = null;
    this.longPressThreshold = 450;
    this.hasTriggeredLongPress = false;
    this.dragDistance = 0;

    // Multi-tap detection (Triple Tap -> AI Mic)
    this.tapTimestamps = [];
    this.tripleTapWindow = 600; // ms

    // Emotion & Speech Timers
    this.emotionTimeout = null;
    this.speechTimeout = null;

    // Callbacks
    this.onLongPress = options.onLongPress || null;
    this.onTap = options.onTap || null;
    this.onTripleTap = options.onTripleTap || null;

    // DOM Structure
    this.el = document.createElement('div');
    this.el.className = 'character-container';
    this.el.setAttribute('data-state', this.state);

    this.speechBubble = document.createElement('div');
    this.speechBubble.className = 'character-speech-bubble';
    this.speechBubble.textContent = '';
    this.el.appendChild(this.speechBubble);

    this.longPressRing = document.createElement('div');
    this.longPressRing.className = 'long-press-ring';
    this.el.appendChild(this.longPressRing);

    this.bodyWrapper = document.createElement('div');
    this.bodyWrapper.className = 'character-body-wrapper';
    this.el.appendChild(this.bodyWrapper);

    this.container.appendChild(this.el);

    this.renderVisuals();
    this.attachEvents();
    this.startPhysicsLoop();
    this.startAffectionMonitor();
  }

  renderVisuals() {
    this.bodyWrapper.innerHTML = this.getCharacterSvg();
    this.updateTransform();
  }

  getCharacterSvg() {
    let accessorySvg = this.getAccessorySvg();

    if (this.type === CHARACTER_TYPES.CUSTOM_PHOTO && this.customPhotoUrl) {
      return this.renderCustomPhotoSvg(accessorySvg);
    } else if (this.type === CHARACTER_TYPES.BERRY_CAT) {
      return this.renderBerryCatSvg(accessorySvg);
    } else if (this.type === CHARACTER_TYPES.CLOUD_PUPPY) {
      return this.renderCloudPuppySvg(accessorySvg);
    } else if (this.type === CHARACTER_TYPES.CHOCO_DINO) {
      return this.renderChocoDinoSvg(accessorySvg);
    } else {
      return this.renderNanoBananaSvg(accessorySvg);
    }
  }

  renderNanoBananaSvg(accessorySvg) {
    let eyeLeft, eyeRight, mouth, extras = '';

    if (this.state === CHARACTER_STATES.LIFTED) {
      eyeLeft = `<circle cx="42" cy="46" r="5" fill="#1e293b" /><circle cx="44" cy="44" r="2" fill="#fff" />`;
      eyeRight = `<circle cx="68" cy="46" r="5" fill="#1e293b" /><circle cx="70" cy="44" r="2" fill="#fff" />`;
      mouth = `<ellipse cx="55" cy="62" rx="4" ry="6" fill="#ef4444" stroke="#1e293b" stroke-width="1.5" />`;
      extras = `<path d="M78 35 Q85 30 82 42" stroke="#38bdf8" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    } else if (this.state === CHARACTER_STATES.SAD) {
      eyeLeft = `<path d="M38 48 Q43 43 47 48" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" /><circle cx="39" cy="53" r="3.5" fill="#38bdf8" />`;
      eyeRight = `<path d="M63 48 Q67 43 72 48" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" /><circle cx="71" cy="53" r="3.5" fill="#38bdf8" />`;
      mouth = `<path d="M48 64 Q55 58 62 64" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    } else if (this.state === CHARACTER_STATES.HAPPY) {
      eyeLeft = `<path d="M38 46 Q43 38 48 46" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />`;
      eyeRight = `<path d="M62 46 Q67 38 72 46" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round" />`;
      mouth = `<path d="M46 58 Q55 72 64 58 Z" fill="#ef4444" stroke="#1e293b" stroke-width="1.5" /><circle cx="55" cy="64" r="2.5" fill="#fca5a5" />`;
    } else {
      eyeLeft = `<ellipse cx="43" cy="46" rx="4" ry="5.5" fill="#1e293b" /><circle cx="45" cy="44" r="2" fill="#fff" />`;
      eyeRight = `<ellipse cx="67" cy="46" rx="4" ry="5.5" fill="#1e293b" /><circle cx="69" cy="44" r="2" fill="#fff" />`;
      mouth = `<path d="M49 60 Q55 67 61 60" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
    }

    return `
      <svg viewBox="0 0 110 120" width="110" height="120" style="filter: hue-rotate(${this.hueShift}deg);">
        <defs>
          <linearGradient id="bananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="45%" stop-color="#fde047" />
            <stop offset="90%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#ca8a04" />
          </linearGradient>
          <linearGradient id="bananaTip" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#84cc16" />
            <stop offset="100%" stop-color="#65a30d" />
          </linearGradient>
          <filter id="nanoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="rgba(234,179,8,0.35)" />
          </filter>
        </defs>

        <ellipse cx="55" cy="112" rx="28" ry="6" fill="rgba(0,0,0,0.18)" />

        <g class="nano-leg-left" style="transform-origin: 42px 98px;">
          <ellipse cx="42" cy="104" rx="6" ry="8" fill="#ca8a04" stroke="#854d0e" stroke-width="1.5" />
          <ellipse cx="40" cy="110" rx="7" ry="4" fill="#a16207" />
        </g>

        <g class="nano-leg-right" style="transform-origin: 68px 98px;">
          <ellipse cx="68" cy="104" rx="6" ry="8" fill="#ca8a04" stroke="#854d0e" stroke-width="1.5" />
          <ellipse cx="70" cy="110" rx="7" ry="4" fill="#a16207" />
        </g>

        <g filter="url(#nanoGlow)">
          <path d="M 55 10 Q 57 3 62 2 Q 65 3 63 12 Z" fill="url(#bananaTip)" stroke="#4d7c0f" stroke-width="1" />
          <path d="M 55 10 C 78 18, 92 48, 88 80 C 85 96, 72 104, 55 103 C 38 104, 25 96, 22 80 C 18 48, 32 18, 55 10 Z" 
                fill="url(#bananaGrad)" stroke="#a16207" stroke-width="2.5" />
          <path d="M 55 14 C 72 24, 82 50, 78 80 C 76 90, 68 98, 55 99" 
                fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" />
          <path d="M 55 14 C 38 24, 28 50, 32 80" 
                fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" opacity="0.6" />
        </g>

        <ellipse cx="33" cy="56" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <ellipse cx="77" cy="56" rx="6" ry="4" fill="#fb7185" opacity="0.6" />

        ${eyeLeft}
        ${eyeRight}
        ${mouth}
        ${extras}

        <g class="nano-arm-left" style="transform-origin: 26px 60px;">
          <path d="M 26 60 Q 14 62 12 52" stroke="#a16207" stroke-width="4" stroke-linecap="round" fill="none" />
          <circle cx="12" cy="50" r="4.5" fill="#fde047" stroke="#a16207" stroke-width="1.5" />
        </g>

        <g class="nano-arm-right" style="transform-origin: 84px 60px;">
          <path d="M 84 60 Q 96 62 98 52" stroke="#a16207" stroke-width="4" stroke-linecap="round" fill="none" />
          <circle cx="98" cy="50" r="4.5" fill="#fde047" stroke="#a16207" stroke-width="1.5" />
        </g>

        ${accessorySvg}
      </svg>
    `;
  }

  renderBerryCatSvg(accessorySvg) {
    let mouth = this.state === CHARACTER_STATES.SAD ? `M48 64 Q55 60 62 64` :
                this.state === CHARACTER_STATES.HAPPY ? `M46 58 Q55 70 64 58 Z` : `M50 60 Q55 65 60 60`;
    return `
      <svg viewBox="0 0 110 120" width="110" height="120" style="filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#f43f5e" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#f43f5e" /></g>
        <polygon points="26,38 38,12 50,30" fill="#fb7185" stroke="#e11d48" stroke-width="2" />
        <polygon points="84,38 72,12 60,30" fill="#fb7185" stroke="#e11d48" stroke-width="2" />
        <polygon points="30,34 38,18 46,30" fill="#fecdd3" />
        <polygon points="80,34 72,18 64,30" fill="#fecdd3" />
        <circle cx="55" cy="62" r="38" fill="#fda4af" stroke="#e11d48" stroke-width="2.5" />
        <line x1="20" y1="56" x2="35" y2="58" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="20" y1="64" x2="35" y2="62" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="90" y1="56" x2="75" y2="58" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <line x1="90" y1="64" x2="75" y2="62" stroke="#be123c" stroke-width="2" stroke-linecap="round" />
        <circle cx="43" cy="52" r="4.5" fill="#1e293b" /><circle cx="45" cy="50" r="1.5" fill="#fff" />
        <circle cx="67" cy="52" r="4.5" fill="#1e293b" /><circle cx="69" cy="50" r="1.5" fill="#fff" />
        <polygon points="53,57 57,57 55,60" fill="#be123c" />
        <path d="${mouth}" stroke="#be123c" stroke-width="2" fill="${this.state === CHARACTER_STATES.HAPPY ? '#ef4444' : 'none'}" />
        <g class="nano-arm-left" style="transform-origin: 24px 68px;"><circle cx="20" cy="68" r="6" fill="#f43f5e" /></g>
        <g class="nano-arm-right" style="transform-origin: 86px 68px;"><circle cx="90" cy="68" r="6" fill="#f43f5e" /></g>
        ${accessorySvg}
      </svg>
    `;
  }

  renderCloudPuppySvg(accessorySvg) {
    return `
      <svg viewBox="0 0 110 120" width="110" height="120" style="filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#60a5fa" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#60a5fa" /></g>
        <ellipse cx="24" cy="42" rx="10" ry="18" fill="#3b82f6" transform="rotate(-15 24 42)" />
        <ellipse cx="86" cy="42" rx="10" ry="18" fill="#3b82f6" transform="rotate(15 86 42)" />
        <path d="M 55 26 C 70 26, 85 36, 88 52 C 96 56, 98 70, 90 78 C 88 92, 70 98, 55 96 C 40 98, 22 92, 20 78 C 12 70, 14 56, 22 52 C 25 36, 40 26, 55 26 Z" 
              fill="#93c5fd" stroke="#2563eb" stroke-width="2.5" />
        <circle cx="43" cy="52" r="4.5" fill="#1e293b" />
        <circle cx="67" cy="52" r="4.5" fill="#1e293b" />
        <ellipse cx="55" cy="58" rx="5" ry="4" fill="#1e293b" />
        <path d="M50 63 Q55 70 60 63" stroke="#1e293b" stroke-width="2" fill="none" />
        <g class="nano-arm-left" style="transform-origin: 22px 70px;"><circle cx="18" cy="70" r="6" fill="#3b82f6" /></g>
        <g class="nano-arm-right" style="transform-origin: 88px 70px;"><circle cx="92" cy="70" r="6" fill="#3b82f6" /></g>
        ${accessorySvg}
      </svg>
    `;
  }

  renderChocoDinoSvg(accessorySvg) {
    return `
      <svg viewBox="0 0 110 120" width="110" height="120" style="filter: hue-rotate(${this.hueShift}deg);">
        <ellipse cx="55" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.18)" />
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="8" ry="7" fill="#10b981" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="8" ry="7" fill="#10b981" /></g>
        <polygon points="55,16 62,6 68,18" fill="#f59e0b" />
        <polygon points="70,22 80,14 82,28" fill="#f59e0b" />
        <polygon points="38,22 28,14 26,28" fill="#f59e0b" />
        <circle cx="55" cy="60" r="36" fill="#34d399" stroke="#059669" stroke-width="2.5" />
        <circle cx="43" cy="50" r="4.5" fill="#1e293b" />
        <circle cx="67" cy="50" r="4.5" fill="#1e293b" />
        <path d="M47 62 Q55 70 63 62" stroke="#1e293b" stroke-width="2" fill="none" />
        <g class="nano-arm-left" style="transform-origin: 24px 66px;"><circle cx="18" cy="66" r="6" fill="#059669" /></g>
        <g class="nano-arm-right" style="transform-origin: 86px 66px;"><circle cx="92" cy="66" r="6" fill="#059669" /></g>
        ${accessorySvg}
      </svg>
    `;
  }

  renderCustomPhotoSvg(accessorySvg) {
    return `
      <svg viewBox="0 0 110 120" width="110" height="120">
        <defs>
          <clipPath id="customPhotoClip">
            <circle cx="55" cy="55" r="38" />
          </clipPath>
          <filter id="photoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />
          </filter>
        </defs>
        <ellipse cx="55" cy="112" rx="28" ry="6" fill="rgba(0,0,0,0.22)" />
        
        <g class="nano-leg-left" style="transform-origin: 40px 96px;"><ellipse cx="40" cy="102" rx="7" ry="7" fill="#64748b" /></g>
        <g class="nano-leg-right" style="transform-origin: 70px 96px;"><ellipse cx="70" cy="102" rx="7" ry="7" fill="#64748b" /></g>
        
        <g filter="url(#photoShadow)">
          <image href="${this.customPhotoUrl}" x="17" y="17" width="76" height="76" clip-path="url(#customPhotoClip)" preserveAspectRatio="xMidYMid slice" />
        </g>

        <g class="nano-arm-left" style="transform-origin: 18px 65px;"><circle cx="16" cy="65" r="6" fill="#64748b" /></g>
        <g class="nano-arm-right" style="transform-origin: 92px 65px;"><circle cx="94" cy="65" r="6" fill="#64748b" /></g>
        
        ${accessorySvg}
      </svg>
    `;
  }

  getAccessorySvg() {
    switch (this.accessory) {
      case 'party_hat':
        return `
          <g transform="translate(55, 12)">
            <polygon points="-12,0 0,-24 12,0" fill="#ec4899" stroke="#be185d" stroke-width="1.5" />
            <circle cx="0" cy="-24" r="4" fill="#facc15" />
            <circle cx="-4" cy="-8" r="2" fill="#38bdf8" />
            <circle cx="4" cy="-14" r="2" fill="#a855f7" />
          </g>
        `;
      case 'cat_ears':
        return `
          <g>
            <polygon points="34,22 42,4 50,20" fill="#f43f5e" stroke="#9f1239" stroke-width="1.5" />
            <polygon points="37,20 42,8 47,19" fill="#fecdd3" />
            <polygon points="76,22 68,4 60,20" fill="#f43f5e" stroke="#9f1239" stroke-width="1.5" />
            <polygon points="73,20 68,8 63,19" fill="#fecdd3" />
          </g>
        `;
      case 'sunglasses':
        return `
          <g transform="translate(26, 40)">
            <rect x="2" y="2" width="22" height="14" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
            <rect x="34" y="2" width="22" height="14" rx="4" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
            <line x1="24" y1="8" x2="34" y2="8" stroke="#0f172a" stroke-width="3" />
            <line x1="6" y1="5" x2="16" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
            <line x1="38" y1="5" x2="48" y2="5" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
          </g>
        `;
      case 'ribbon':
        return `
          <g transform="translate(55, 20)">
            <polygon points="0,0 -16,-10 -14,10" fill="#f43f5e" />
            <polygon points="0,0 16,-10 14,10" fill="#f43f5e" />
            <circle cx="0" cy="0" r="5" fill="#fb7185" stroke="#be123c" stroke-width="1" />
          </g>
        `;
      case 'angel_wings':
        return `
          <g>
            <path d="M 24 55 C 5 45, 0 25, 12 18 C 22 28, 22 40, 24 55 Z" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
            <path d="M 86 55 C 105 45, 110 25, 98 18 C 88 28, 88 40, 86 55 Z" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5" />
            <ellipse cx="55" cy="8" rx="20" ry="4" fill="none" stroke="#facc15" stroke-width="3" />
          </g>
        `;
      default:
        return '';
    }
  }

  /* ========================================================================
     AFFECTION & AUTONOMOUS EMOTION SYSTEM
     ======================================================================== */
  startAffectionMonitor() {
    // Check idle status every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const idleTime = now - Math.max(this.lastCareTime, this.lastSpeechTime);

      // If idle for over 1 hour (or in demo, if prolonged idle)
      if (idleTime > ONE_HOUR_MS) {
        this.affection = Math.max(10, this.affection - 5);
        this.triggerBoredomSpeech();
      } else if (idleTime > 5 * 60 * 1000 && Math.random() < 0.25) {
        // Subtle cute status bubble
        this.triggerBoredomSpeech();
      }
    }, 30000);
  }

  triggerBoredomSpeech() {
    const idleRemarks = [
      '주인님 뭐하고 계실까? 🍌💭',
      '심심해요... 같이 놀아요! ✨',
      '나노바나나는 집사님 기다리는 중! 🍌',
      '혹시 바쁘신가요? 💛',
      '기억해둘 일 있으시면 말씀해주세요! 📝'
    ];
    const remark = idleRemarks[Math.floor(Math.random() * idleRemarks.length)];
    this.say(remark, 4000);

    if (this.affection < 35 && this.state !== CHARACTER_STATES.LIFTED) {
      this.setState(CHARACTER_STATES.SAD, 5000);
    }
  }

  petCare(boost = 15) {
    this.lastCareTime = Date.now();
    this.affection = Math.min(100, this.affection + boost);
    if (this.state !== CHARACTER_STATES.LIFTED) {
      this.setState(CHARACTER_STATES.HAPPY, 2500);
    }
  }

  setState(newState, autoRevertMs = 0) {
    if (this.state === newState) return;
    this.state = newState;
    this.el.setAttribute('data-state', this.state);
    this.renderVisuals();

    if (this.emotionTimeout) {
      clearTimeout(this.emotionTimeout);
      this.emotionTimeout = null;
    }

    if (newState === CHARACTER_STATES.HAPPY) {
      sound.playHappy();
      this.spawnParticles('heart', 5);
      this.spawnParticles('star', 4);
    } else if (newState === CHARACTER_STATES.SAD) {
      sound.playSad();
      this.spawnParticles('tear', 4);
    } else if (newState === CHARACTER_STATES.LIFTED) {
      sound.playLift();
      this.spawnParticles('sweat', 3);
    }

    if (autoRevertMs > 0) {
      this.emotionTimeout = setTimeout(() => {
        // Revert to natural state based on affection level
        const defaultState = this.affection < 35 ? CHARACTER_STATES.SAD : CHARACTER_STATES.WALK;
        this.setState(defaultState);
      }, autoRevertMs);
    }
  }

  spawnParticles(type, count = 3) {
    const emojis = {
      heart: ['💖', '💕', '✨', '💛'],
      star: ['⭐', '🌟', '✨'],
      tear: ['💧', '💦', '😢'],
      sweat: ['💦', '❕', '❗']
    };
    const list = emojis[type] || ['✨'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle-fx';
      p.textContent = list[Math.floor(Math.random() * list.length)];
      p.style.fontSize = `${Math.floor(14 + Math.random() * 10)}px`;
      p.style.left = `${this.x + 30 + Math.random() * 40}px`;
      p.style.top = `${this.y + 10 + Math.random() * 30}px`;

      const dx = (Math.random() - 0.5) * 80;
      const dy = -(20 + Math.random() * 50);
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);

      this.container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  say(text, durationMs = 3500) {
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('active');
    sound.playTalkBlip();

    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.remove('active');
    }, durationMs);
  }

  /* ========================================================================
     EVENTS & TRIPLE TAP DETECTION
     ======================================================================== */
  attachEvents() {
    const onPointerDown = (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.hasTriggeredLongPress = false;
      this.dragDistance = 0;

      const pageX = e.touches ? e.touches[0].pageX : e.pageX;
      const pageY = e.touches ? e.touches[0].pageY : e.pageY;

      this.dragStartX = pageX - this.x;
      this.dragStartY = pageY - this.y;
      this.lastPointerX = pageX;
      this.lastPointerY = pageY;
      this.pointerVx = 0;
      this.pointerVy = 0;

      this.longPressRing.classList.add('charging');
      this.longPressTimer = setTimeout(() => {
        if (this.isDragging && this.dragDistance < 15) {
          this.hasTriggeredLongPress = true;
          this.longPressRing.classList.remove('charging');
          sound.playMenuOpen();
          if (this.onLongPress) {
            this.onLongPress(this.x + this.width / 2, this.y + this.height / 2);
          }
        }
      }, this.longPressThreshold);

      this.setState(CHARACTER_STATES.LIFTED);
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const pageX = e.touches ? e.touches[0].pageX : e.pageX;
      const pageY = e.touches ? e.touches[0].pageY : e.pageY;

      const dx = pageX - this.lastPointerX;
      const dy = pageY - this.lastPointerY;
      this.dragDistance += Math.abs(dx) + Math.abs(dy);

      if (this.dragDistance > 15 && this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.longPressRing.classList.remove('charging');
      }

      this.pointerVx = dx * 0.4;
      this.pointerVy = dy * 0.4;
      this.lastPointerX = pageX;
      this.lastPointerY = pageY;

      this.x = pageX - this.dragStartX;
      this.y = pageY - this.dragStartY;

      this.constrainBounds();
      this.updateTransform();
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.longPressRing.classList.remove('charging');

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (!this.hasTriggeredLongPress) {
        if (this.dragDistance < 10) {
          // Tap event -> Register multi-tap
          const now = Date.now();
          this.tapTimestamps.push(now);
          // Filter taps within window
          this.tapTimestamps = this.tapTimestamps.filter(t => now - t <= this.tripleTapWindow);

          if (this.tapTimestamps.length >= 3) {
            // Triple tap detected!
            this.tapTimestamps = [];
            sound.playHappy();
            this.say('말씀하세요! 듣고 있어요 🎙️✨', 2500);
            if (this.onTripleTap) {
              this.onTripleTap();
            }
          } else {
            // Single gentle tap/pet
            sound.playTap();
            this.petCare(10);
            if (this.onTap) this.onTap();
          }
        } else {
          // Released after dragging
          sound.playDrop();
          this.petCare(5);
          this.vx = Math.max(-8, Math.min(8, this.pointerVx));
          this.vy = Math.max(-8, Math.min(8, this.pointerVy));
          this.setState(CHARACTER_STATES.WALK);
        }
      } else {
        this.setState(CHARACTER_STATES.WALK);
      }
    };

    this.el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  getViewportSize() {
    try {
      const ownerDoc = this.container.ownerDocument || document;
      const ownerWin = ownerDoc.defaultView || window;
      const width = this.container.clientWidth || ownerWin.innerWidth || 300;
      const height = this.container.clientHeight || ownerWin.innerHeight || 400;
      return { width, height };
    } catch (e) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
  }

  constrainBounds() {
    const { width: vpWidth, height: vpHeight } = this.getViewportSize();
    const maxX = Math.max(0, vpWidth - this.width);
    const maxY = Math.max(10, vpHeight - this.height - 10);

    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx) * 0.6;
      this.facingRight = true;
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx) * 0.6;
      this.facingRight = false;
    }

    if (this.y < 10) {
      this.y = 10;
      this.vy = 0;
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = 0;
    }
  }

  startPhysicsLoop() {
    let lastTime = performance.now();
    let wanderTimer = 0;

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      if (!this.isDragging) {
        wanderTimer += dt;
        if (wanderTimer > 2.5) {
          wanderTimer = 0;
          if (Math.random() < 0.35) {
            this.vx = (Math.random() - 0.5) * (this.state === CHARACTER_STATES.SAD ? 0.9 : 2.4);
            this.facingRight = this.vx >= 0;
          }
          if (Math.random() < 0.15 && this.state === CHARACTER_STATES.WALK) {
            this.vy = -3;
          }
        }

        this.x += this.vx * 60 * dt;
        this.y += this.vy * 60 * dt;

        const { height: vpHeight } = this.getViewportSize();
        const floorY = Math.max(10, vpHeight - this.height - 15);
        if (this.y < floorY) {
          this.vy += 9.8 * dt * 0.8;
        } else {
          this.y = floorY;
          this.vy = 0;
        }

        this.constrainBounds();
        this.updateTransform();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /**
   * Updates coordinates on container and facing only on bodyWrapper.
   * Keeps speech bubble upright without being mirrored!
   */
  updateTransform() {
    this.el.style.left = `${this.x}px`;
    this.el.style.top = `${this.y}px`;
    const facingScale = this.facingRight ? 1 : -1;
    this.bodyWrapper.style.setProperty('--char-facing', facingScale);
    this.bodyWrapper.style.transform = `scaleX(${facingScale})`;
  }

  updateCustomization({ type, customPhotoUrl, accessory, hueShift }) {
    if (type !== undefined) this.type = type;
    if (customPhotoUrl !== undefined) this.customPhotoUrl = customPhotoUrl;
    if (accessory !== undefined) this.accessory = accessory;
    if (hueShift !== undefined) this.hueShift = hueShift;
    this.renderVisuals();
  }
}

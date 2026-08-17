/**
 * Dedicated Entry Point for Android Background Floating Pet Overlay Window
 * Features: Triple-tap mic, contextual emotion reactions, emote particles, full AI chat
 */

import { CharacterController, CHARACTER_TYPES, CHARACTER_STATES } from './character.js';
import { CustomizerEngine } from './customizer.js';

/* ============================================================
   EMOTE PARTICLE SYSTEM
   ============================================================ */
function spawnEmote(container, emoji, count = 3) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `
      position: fixed;
      font-size: ${18 + Math.random() * 14}px;
      pointer-events: none;
      z-index: 9999999;
      left: ${20 + Math.random() * 70}%;
      top:  ${30 + Math.random() * 40}%;
      opacity: 1;
      transition: transform 1.2s ease-out, opacity 1.2s ease-out;
      transform: translateY(0px) rotate(0deg);
      will-change: transform, opacity;
    `;
    document.body.appendChild(el);

    // Animate upward
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dy = -(60 + Math.random() * 60);
        const rotate = (Math.random() - 0.5) * 60;
        el.style.transform = `translateY(${dy}px) rotate(${rotate}deg)`;
        el.style.opacity = '0';
      });
    });

    setTimeout(() => el.remove(), 1400);
  }
}

/* ============================================================
   EMOTION CONTEXT ANALYZER
   Maps what the user says to an emotion + emote reaction
   ============================================================ */
const EMOTION_MAP = [
  {
    pattern: /(힘들|우울|지쳐|슬퍼|속상|망했|피곤|외로|울고|모르겠|포기|싫어)/,
    emotion: CHARACTER_STATES.SAD,
    emotes: ['💧','😢','🥺'],
    reacts: [
      '오늘 많이 힘드셨군요... 토닥토닥 💛',
      '제가 곁에 있을게요. 힘내세요! 🍌💛',
      '오늘 하루 정말 수고했어요 💕',
    ]
  },
  {
    pattern: /(귀여|좋아|사랑|이뻐|예뻐|착해|대단|최고|고마|감사|칭찬|최고다|짱이야)/,
    emotion: CHARACTER_STATES.HAPPY,
    emotes: ['💖','🎉','✨','🥰'],
    reacts: [
      '헤헤! 너무 감사해요! 🍌💖',
      '집사님이 세상에서 제일 좋아요! ✨',
      '와! 신난다! 뿅뿅! 🎉',
    ]
  },
  {
    pattern: /(기뻐|행복|좋겠|됐다|성공|합격|통과|잘했|됐어|이겼|완성)/,
    emotion: CHARACTER_STATES.HAPPY,
    emotes: ['🎉','🎊','⭐','🥳'],
    reacts: [
      '와아! 축하해요! 같이 기뻐요! 🎉',
      '최고예요! 나노바나나도 신난다! ⭐',
      '대단해요! 정말 잘하셨어요! 🎊',
    ]
  },
  {
    pattern: /(안녕|하이|반가|좋은아침|잘잤어|왔어|돌아왔|왔다)/,
    emotion: CHARACTER_STATES.HAPPY,
    emotes: ['👋','😊','🍌'],
    reacts: [
      '안녕하세요! 반가워요! 🍌👋',
      '오셨어요! 기다리고 있었어요! 😊',
      '와! 집사님! 오늘도 화이팅! 🍌',
    ]
  },
  {
    pattern: /(화나|짜증|열받|어이없|거지같|웃기네|미치겠|답답|못됐)/,
    emotion: CHARACTER_STATES.SAD,
    emotes: ['😤','💢','🌀'],
    reacts: [
      '많이 화나셨군요... 심호흡 한번요! 🌀',
      '충분히 화날 수 있어요. 제가 들을게요! 💛',
      '에고... 진정되면 이야기해줘요 🍌',
    ]
  },
  {
    pattern: /(배고파|먹고싶|맛있겠|배고프|먹었어|먹을거)/,
    emotion: CHARACTER_STATES.HAPPY,
    emotes: ['🍔','😋','🍜'],
    reacts: [
      '저도 바나나가 먹고 싶어요! 😋🍌',
      '맛있는 거 드세요! 🍜',
      '냠냠! 잘 드세요! 🍌',
    ]
  },
  {
    pattern: /(자고싶|졸려|피곤|자야겠|잘게|자려고|잠)/,
    emotion: CHARACTER_STATES.SAD,
    emotes: ['😴','💤','🌙'],
    reacts: [
      '편히 쉬세요! 저도 같이 조용히 있을게요 💤',
      '잘 자요! 좋은 꿈 꾸세요 🌙',
      '푹 주무세요! 내일도 파이팅! 🍌',
    ]
  },
];

function analyzeEmotion(text) {
  const lower = text.replace(/\s+/g, '').toLowerCase();
  for (const entry of EMOTION_MAP) {
    if (entry.pattern.test(lower)) {
      return {
        emotion: entry.emotion,
        emotes: entry.emotes,
        react: entry.reacts[Math.floor(Math.random() * entry.reacts.length)]
      };
    }
  }
  // Default: stay neutral/happy
  return {
    emotion: CHARACTER_STATES.WALK,
    emotes: ['💬'],
    react: null
  };
}

/* ============================================================
   SIMPLE INLINE TTS
   ============================================================ */
function speakTTS(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const clean = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
    if (!clean) return;
    const go = () => {
      const utt = new SpeechSynthesisUtterance(clean);
      utt.lang = 'ko-KR';
      utt.pitch = 1.35;
      utt.rate = 1.05;
      const voices = synth.getVoices();
      const koVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
      if (koVoice) utt.voice = koVoice;
      synth.speak(utt);
    };
    synth.getVoices().length === 0
      ? (synth.onvoiceschanged = () => { go(); synth.onvoiceschanged = null; })
      : go();
  } catch (e) {}
}

/* ============================================================
   OVERLAY MIC ENGINE
   Handles speech recognition inside background WebView
   ============================================================ */
class OverlayMicEngine {
  constructor(characterController) {
    this.character = characterController;
    this.recognition = null;
    this.isListening = false;
    this.init();
  }

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.lang = 'ko-KR';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;
  }

  start() {
    if (!this.recognition) {
      this.character.say('이 기기에서는 음성 인식을 지원하지 않아요 😢', 3000);
      return;
    }
    if (this.isListening) {
      try { this.recognition.stop(); } catch (e) {}
      return;
    }

    const micEl = document.getElementById('mic-indicator');

    // Request window focus so SpeechRecognition can acquire mic in overlay mode
    try {
      if (window.OverlayFocusBridge) window.OverlayFocusBridge.requestFocus();
    } catch(e) {}

    this.isListening = true;
    if (micEl) micEl.classList.add('active');
    this.character.setState(CHARACTER_STATES.HAPPY, 8000);
    this.character.say('말씀하세요! 듣고 있어요 🎙️✨', 3000);
    spawnEmote(document.body, '🎙️', 2);

    const done = () => {
      this.isListening = false;
      if (micEl) micEl.classList.remove('active');
      // Release focus back so overlay doesn't intercept other app touches
      try {
        if (window.OverlayFocusBridge) window.OverlayFocusBridge.releaseFocus();
      } catch(e) {}
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) this.processVoice(transcript);
    };

    this.recognition.onerror = (event) => {
      done();
      const msg = event.error === 'no-speech'
        ? '아무 소리도 안 들렸어요! 다시 눌러서 말해주세요 🎙️'
        : `음성 인식 오류: ${event.error}`;
      this.character.say(msg, 3500);
    };

    this.recognition.onend = () => {
      done();
    };

    try {
      this.recognition.start();
    } catch (e) {
      done();
      this.character.say('마이크를 시작할 수 없어요 😢', 3000);
    }
  }

  processVoice(transcript) {
    // Show what user said
    this.character.say(`"${transcript}"`, 2000);

    // Analyze emotion context
    const { emotion, emotes, react } = analyzeEmotion(transcript);

    setTimeout(() => {
      // Spawn emote particles
      emotes.forEach(e => spawnEmote(document.body, e, 2));

      // Set character emotion
      this.character.setState(emotion, 4000);

      // Determine reply
      let reply;
      if (react) {
        reply = react;
      } else {
        // Generic replies based on content length
        const replyBank = [
          '네! 들었어요! 언제든 말 걸어줘요! 🍌✨',
          '헤헤, 알겠어요! 항상 곁에 있을게요! 🍌💛',
          '저도 그렇게 생각해요! 파이팅! 🎉',
          '그렇군요! 오늘도 좋은 하루 되세요! 🍌',
        ];
        reply = replyBank[Math.floor(Math.random() * replyBank.length)];
      }

      this.character.say(reply, 5000);
      speakTTS(reply);
    }, 2200);
  }
}

/* ============================================================
   MAIN OVERLAY APP
   ============================================================ */
class OverlayApp {
  constructor() {
    window.appInstance = this;
    document.documentElement.classList.add('mode-overlay');
    document.body.classList.add('mode-overlay');

    const container = document.getElementById('global-character-layer') || document.body;

    this.character = new CharacterController(container, {
      type: CHARACTER_TYPES.NANO_BANANA,
      // The native FloatingPetService already drags/wanders the whole
      // overlay window around the screen, so the character must stay fixed
      // inside its own small window rather than also positioning itself.
      staticPosition: true,
      onTap: () => {
        // Single tap: random affection emote
        const taps = ['반가워요! 🍌✨', '헤헤! 간지러워요! 😄', '꼭 안아줘요! 💛', '오늘도 화이팅! 🎉'];
        const msg = taps[Math.floor(Math.random() * taps.length)];
        this.character.petCare(10);
        this.character.say(msg, 2500);
        spawnEmote(document.body, ['💛','✨','💕','🌟'][Math.floor(Math.random()*4)], 2);
      },
      onTripleTap: () => {
        // Triple tap: activate mic
        this.mic.start();
      }
    });

    this.customizer = new CustomizerEngine(this.character);
    this.mic = new OverlayMicEngine(this.character);

    // Sync preferences
    const syncPref = () => {
      if (this.customizer) this.customizer.loadPreferences();
    };
    window.addEventListener('storage', (e) => {
      if (e.key === 'my_phone_friend_custom_pref_v1') syncPref();
    });
    window.addEventListener('characterUpdated', syncPref);

    // Welcome
    setTimeout(() => {
      this.character.say('곁에 있을게요! 🍌✨', 4000);
      spawnEmote(document.body, '✨', 2);
    }, 600);
  }
}

/* ============================================================
   SYNCED DATA RECEIVER (from MainActivity via evaluateJavascript)
   ============================================================ */
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

window.addEventListener('DOMContentLoaded', () => {
  new OverlayApp();
});

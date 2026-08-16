/**
 * AI Voice & Conversation Engine
 * Integrated with Web Speech API (STT & TTS), 3-Day Ephemeral Memory,
 * Real-time Speech Bubble Sync, and Autonomous Emotion Updates.
 */

import { memoryEngine } from './memoryEngine.js';
import { CHARACTER_STATES } from './character.js';

const SETTINGS_KEY = 'my_phone_friend_settings_v1';

export class AiChatEngine {
  constructor(characterController) {
    this.character = characterController;
    this.recognition = null;
    this.isListening = false;
    this.speechSynthesis = window.speechSynthesis || null;
    this.geminiApiKey = '';
    this.loadSettings();
    this.initSpeechRecognition();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.geminiApiKey = parsed.geminiApiKey || '';
      }
    } catch (e) {
      console.warn('Failed to load chat settings:', e);
    }
  }

  saveSettings(newSettings) {
    try {
      this.geminiApiKey = newSettings.geminiApiKey || '';
      const data = { geminiApiKey: this.geminiApiKey };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save chat settings:', e);
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ko-KR';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.continuous = false;
    }
  }

  startListening(onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError('이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트 입력을 이용해주세요.');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.isListening = true;
    this.character.say('귀 기울여 듣는 중... 🎙️✨', 4000);

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (onError) onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      this.isListening = false;
      if (onError) onError(e.message);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  speak(text) {
    if (!this.speechSynthesis) return;

    this.speechSynthesis.cancel();
    const cleanSpeech = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'ko-KR';
    utterance.pitch = 1.35;
    utterance.rate = 1.08;

    const voices = this.speechSynthesis.getVoices();
    const koreanVoice = voices.find(v => v.lang.includes('ko') || v.lang.includes('KR'));
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    this.speechSynthesis.speak(utterance);
  }

  async processMessage(userMessage) {
    const text = userMessage.trim();
    if (!text) {
      return {
        reply: '말씀을 잘 못 들었어요! 다시 한번 말씀해주세요 🍌',
        emotion: CHARACTER_STATES.WALK,
        memorySaved: false
      };
    }

    // Update character interaction time & boost affection
    this.character.lastSpeechTime = Date.now();
    this.character.petCare(10);

    // 1. Check if user is asking about saved 3-day memories ("아까 내가 뭐 필요하다고 했었지?")
    if (memoryEngine.isQueryingNeeds(text)) {
      const memoryReply = memoryEngine.getMemoriesResponse();
      this.character.setState(CHARACTER_STATES.HAPPY, 3500);
      this.character.say('기억해둔 목록이에요! 🍌📦', 4000);
      this.speak(memoryReply);
      return {
        reply: memoryReply,
        emotion: CHARACTER_STATES.HAPPY,
        memorySaved: false
      };
    }

    // 2. Check if user wants to remember something ("나중에 ~ 필요해", "~ 사야 돼", "~ 기억해줘")
    const extractedNeed = memoryEngine.extractNeedOrTask(text);
    if (extractedNeed) {
      const savedEntry = memoryEngine.addMemory(text, extractedNeed);
      const reply = `알겠어요! "${savedEntry.item}" 기억해둘게요! 📝\n스마트폰에 3일 동안 잊지 않고 꼭 보관할게요! 🍌💛`;
      this.character.setState(CHARACTER_STATES.HAPPY, 3500);
      this.character.say(`"${savedEntry.item}" 3일간 기억 완료! ✨`, 4000);
      this.speak(`알겠습니다! ${savedEntry.item} 필요하신 것 3일 동안 꼭 기억해둘게요!`);
      return {
        reply: reply,
        emotion: CHARACTER_STATES.HAPPY,
        memorySaved: true
      };
    }

    // 3. If Gemini API Key is configured, use Gemini API
    if (this.geminiApiKey) {
      try {
        const geminiReply = await this.callGeminiApi(text);
        if (geminiReply) {
          this.character.setState(CHARACTER_STATES.HAPPY, 3000);
          this.character.say(geminiReply.substring(0, 35) + '...', 4000);
          this.speak(geminiReply);
          return {
            reply: geminiReply,
            emotion: CHARACTER_STATES.HAPPY,
            memorySaved: false
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to persona engine:', err);
      }
    }

    // 4. Built-in Smart Persona Engine (Rich offline replies)
    const personaResult = this.generatePersonaReply(text);
    this.character.setState(personaResult.emotion, 3500);
    this.character.say(personaResult.bubbleText, 4000);
    this.speak(personaResult.reply);

    return {
      reply: personaResult.reply,
      emotion: personaResult.emotion,
      memorySaved: false
    };
  }

  async callGeminiApi(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(this.geminiApiKey)}`;
    const systemPrompt = "너는 사용자의 스마트폰 화면 속에서 함께 살아가는 귀엽고 사랑스러운 펫 친구 '나노바나나'야. 애교 있고 다정하며 1~2문장으로 귀엽게 한국어로 답변해줘. 문장 끝에는 바나나 이모지나 하트를 붙여줘.";

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n사용자: ${prompt}` }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.8
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text.trim();
  }

  generatePersonaReply(text) {
    const lower = text.toLowerCase().replace(/\s+/g, '');

    // Sad / Tired / Hard feelings
    if (/(힘들|우울|지쳐|슬퍼|속상|망했|피곤|외로|울고)/.test(lower)) {
      this.character.affection = Math.max(10, this.character.affection - 5);
      const sadReplies = [
        { reply: '오늘 많이 힘드셨군요... 제가 곁에서 토닥토닥 해드릴게요. 기운 내세요! 🍌💛', bubbleText: '토닥토닥 힘내요! 💛', emotion: CHARACTER_STATES.SAD },
        { reply: '속상한 일 있으셨나요? 맛있는 거 드시고 푹 쉬셔야 해요! 제가 항상 응원하고 있어요! 🍌✨', bubbleText: '제가 응원해요! ✨', emotion: CHARACTER_STATES.SAD },
        { reply: '토닥토닥... 오늘 하루도 정말 수고 많으셨어요. 당신은 최고예요! 💖', bubbleText: '정말 수고했어요! 💕', emotion: CHARACTER_STATES.HAPPY }
      ];
      return sadReplies[Math.floor(Math.random() * sadReplies.length)];
    }

    // Love / Cute / Praise
    if (/(귀여|좋아|사랑|이뻐|예뻐|착해|대단|최고|고마|감사)/.test(lower)) {
      this.character.petCare(20);
      const happyReplies = [
        { reply: '헤헤! 그렇게 칭찬해주시니 바나나 껍질이 살살 녹아요~ 너무 감사해요! 🍌💖', bubbleText: '헤헤 너무 좋아요! 💖', emotion: CHARACTER_STATES.HAPPY },
        { reply: '저도 집사님이 세상에서 제일 좋아요! 언제나 곁에 있을게요! 🍌✨', bubbleText: '집사님 최고! 💛', emotion: CHARACTER_STATES.HAPPY },
        { reply: '와아! 신난다! 앞으로도 더 귀여운 모습 많이 보여드릴게요! 🍌🎉', bubbleText: '신난다 뿅뿅! 🎉', emotion: CHARACTER_STATES.HAPPY }
      ];
      return happyReplies[Math.floor(Math.random() * happyReplies.length)];
    }

    // Greetings
    if (/(안녕|하이|반가|좋은아침|잘잤|하이요)/.test(lower)) {
      this.character.petCare(10);
      return {
        reply: '안녕하세요! 오늘도 화면 속에서 신나게 뛰어놀고 있었어요! 반가워요! 🍌👋',
        bubbleText: '반가워요 안녕! 🍌👋',
        emotion: CHARACTER_STATES.HAPPY
      };
    }

    // Asking what the character is doing
    if (/(뭐해|뭐하고|심심|놀자|어디)/.test(lower)) {
      const activeReplies = [
        { reply: '스마트폰 화면 여기저기 산책하면서 집사님을 기다리고 있었어요! 같이 놀아요! 🍌🏃', bubbleText: '같이 놀아요! 🏃', emotion: CHARACTER_STATES.HAPPY },
        { reply: '방금 막 점프 연습하고 있었어요! 저 높이 뛸 수 있죠? 🍌✨', bubbleText: '점프 얍얍! ✨', emotion: CHARACTER_STATES.HAPPY },
        { reply: '집사님이 필요한 건 없는지 기억 상자를 살피고 있었답니다! 🍌📦', bubbleText: '기억 상자 확인 중! 📦', emotion: CHARACTER_STATES.WALK }
      ];
      return activeReplies[Math.floor(Math.random() * activeReplies.length)];
    }

    // Default cheerful response
    const defaultReplies = [
      { reply: `네, 듣고 있어요! 언제든 필요한 게 생기면 '나중에 ~ 사야 해'라고 말씀해주세요! 3일간 잊지 않을게요! 🍌✨`, bubbleText: '네 듣고 있어요! 🍌', emotion: CHARACTER_STATES.WALK },
      { reply: '헤헤, 말씀해주셔서 기뻐요! 언제나 화면 안에서 든든하게 지켜드릴게요! 🍌💛', bubbleText: '항상 함께해요! 💛', emotion: CHARACTER_STATES.HAPPY },
      { reply: '오늘도 행복하고 즐거운 하루 보내세요! 나노바나나가 응원합니다! 🍌🎉', bubbleText: '행복한 하루 되세요! 🎉', emotion: CHARACTER_STATES.HAPPY }
    ];
    return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
  }
}

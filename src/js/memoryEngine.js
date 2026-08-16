/**
 * Ephemeral 3-Day Memory Engine
 * Parses user needs/reminders, saves them with a 3-day (72-hour) TTL,
 * and automatically purges expired records.
 */

const STORAGE_KEY = 'my_phone_friend_memories_v1';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export class MemoryEngine {
  constructor() {
    this.memories = [];
    this.load();
    this.cleanExpired();

    // Auto cleanup timer every 60 seconds
    setInterval(() => {
      this.cleanExpired();
    }, 60000);
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.memories = JSON.parse(raw);
      } else {
        this.memories = [];
      }
    } catch (e) {
      console.warn('Failed to load memories from localStorage:', e);
      this.memories = [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memories));
    } catch (e) {
      console.warn('Failed to save memories to localStorage:', e);
    }
  }

  cleanExpired() {
    const now = Date.now();
    const beforeCount = this.memories.length;
    this.memories = this.memories.filter(m => m.expiresAt > now);
    if (this.memories.length !== beforeCount) {
      this.save();
      console.log(`[MemoryEngine] Auto-cleaned ${beforeCount - this.memories.length} expired memories.`);
    }
  }

  /**
   * Checks if user message contains an intention to store a need or reminder
   * @param {string} text
   * @returns {string|null} Extracted item or null
   */
  extractNeedOrTask(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();

    // Patterns for needing things, buying, remembering, preparing
    const patterns = [
      /(?:나중에|이따가|내일|오늘|다음에|꼭)?\s*(.+?)(?:이|가)?\s*(?:필요해|필요하다고|필요하다|필요할\s*거\s*같아)/i,
      /(?:나중에|이따가|내일|오늘|다음에|꼭)?\s*(.+?)(?:을|를)?\s*(?:사야\s*해|사야\s*돼|사야\s*겠다|사야\s*함|구매해야\s*해)/i,
      /(?:나중에|이따가|내일|오늘|다음에|꼭)?\s*(.+?)(?:을|를|이|가)?\s*(?:챙겨야\s*해|챙겨줘|챙겨봐|가져가야\s*해)/i,
      /(.+?)(?:을|를)?\s*(?:기억해줘|기억해봐|기억해|잊지마|적어둬|메모해줘)/i,
      /(?:나중에|이따가|내일|오늘|다음에|꼭)?\s*(.+?)(?:을|를)?\s*(?:해야\s*해|해야\s*돼|해야겠다)/i
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        let extracted = match[1].trim();
        // Remove common fillers
        extracted = extracted.replace(/^(내가|나|너|친구가|우리|집에서)\s+/, '');
        if (extracted.length >= 1 && extracted.length <= 40) {
          return extracted;
        }
      }
    }

    return null;
  }

  /**
   * Checks if the message is a query asking what was remembered
   * @param {string} text
   * @returns {boolean}
   */
  isQueryingNeeds(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim().replace(/\s+/g, '');

    const queryKeywords = [
      '뭐필요하다고했었지',
      '뭐필요하다고했지',
      '뭐필요하다고했더라',
      '뭐필요하다고했어',
      '뭐필요하다했지',
      '뭐필요했지',
      '뭐사야한다고했지',
      '뭐사야했지',
      '뭐챙기라고했지',
      '뭐기억하고있어',
      '기억하고있는거있어',
      '기억하고있는거알려줘',
      '기억한거있어',
      '기억한거알려줘',
      '아까내가뭐필요',
      '아까뭐필요',
      '내메모알려줘',
      '기억목록'
    ];

    return queryKeywords.some(keyword => clean.includes(keyword)) ||
           /아까.*(?:뭐|무엇).*(?:필요|사야|챙겨|기억)/.test(text) ||
           /내가.*(?:뭐|무엇).*(?:필요|사야|챙겨|기억)/.test(text);
  }

  /**
   * Add a new memory item (valid for 3 days)
   * @param {string} rawText
   * @param {string} [item]
   * @returns {object}
   */
  addMemory(rawText, item = null) {
    this.cleanExpired();
    const now = Date.now();
    const entry = {
      id: 'mem_' + now + '_' + Math.random().toString(36).substring(2, 6),
      rawText: rawText,
      item: item || rawText,
      createdAt: now,
      expiresAt: now + THREE_DAYS_MS
    };

    this.memories.unshift(entry);
    this.save();
    return entry;
  }

  /**
   * Returns formatted conversational response for remembered items
   * @returns {string}
   */
  getMemoriesResponse() {
    this.cleanExpired();
    if (this.memories.length === 0) {
      return '아직 기억해둔 것이 없어요! "나중에 우산 챙겨야 해"라고 말씀해주시면 3일 동안 잊지 않고 꼬옥 기억할게요! 🍌✨';
    }

    let response = `기억하고 있어요! (최대 3일 보관) 🍌📝\n\n`;
    this.memories.forEach((m, idx) => {
      const remainingTime = this.formatRemainingTime(m.expiresAt);
      response += `${idx + 1}. ✨ "${m.item}"\n   ⏳ 남은 기억 시간: ${remainingTime}\n`;
    });
    response += `\n필요하신 일 잘 챙기실 수 있게 계속 기억하고 있을게요!`;
    return response;
  }

  getAll() {
    this.cleanExpired();
    return this.memories.map(m => ({
      ...m,
      remainingTimeFormatted: this.formatRemainingTime(m.expiresAt),
      timeAgoFormatted: this.formatTimeAgo(m.createdAt)
    }));
  }

  delete(id) {
    this.memories = this.memories.filter(m => m.id !== id);
    this.save();
  }

  clearAll() {
    this.memories = [];
    this.save();
  }

  formatRemainingTime(expiresAt) {
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}일 ${remainHours}시간`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분 남음 (곧 만료)`;
    }
  }

  formatTimeAgo(createdAt) {
    const diff = Math.max(0, Date.now() - createdAt);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  }
}

export const memoryEngine = new MemoryEngine();

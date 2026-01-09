/**
 * automation-ai.js - OpenAI integration for YouTube automation
 */
const { getOpenAIClient } = require('./openai-client');

const FALLBACK_KEYWORDS = {
  music: ['kpop 2024', '인기 음악', 'lofi hip hop'],
  gaming: ['게임 리뷰', 'minecraft', 'valorant'],
  default: ['trending', '인기 동영상', '추천 영상']
};

class AutomationAI {
  constructor() { this.client = null; this.stats = { keywordsGenerated: 0, commentsGenerated: 0, fallbacksUsed: 0 }; }

  getClient() {
    if (!this.client) { try { this.client = getOpenAIClient(); } catch (e) { return null; } }
    return this.client;
  }

  async generateSearchKeyword(persona = null, options = {}) {
    const client = this.getClient();
    if (!client) return this._getFallbackKeyword();
    try {
      const response = await client.generateText(
        'Generate a YouTube search keyword (Korean or English). Output ONLY the keyword.',
        `Generate a varied, natural search term. ${options.recentKeywords?.length ? 'Avoid: ' + options.recentKeywords.join(', ') : ''}`
      );
      const keyword = response.replace(/["']/g, '').trim().substring(0, 30);
      if (keyword.length < 2) return this._getFallbackKeyword();
      this.stats.keywordsGenerated++;
      return { keyword, source: 'ai_generated' };
    } catch (e) { return this._getFallbackKeyword(); }
  }

  _getFallbackKeyword() {
    this.stats.fallbacksUsed++;
    const cats = Object.keys(FALLBACK_KEYWORDS);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const keywords = FALLBACK_KEYWORDS[cat];
    return { keyword: keywords[Math.floor(Math.random() * keywords.length)], source: 'fallback' };
  }

  async generateComment(videoInfo, persona = null) {
    const client = this.getClient();
    const fallbacks = ['좋은 영상이네요!', '유익한 내용이에요', '영상 잘 봤습니다 👍'];
    if (!client) { this.stats.fallbacksUsed++; return { comment: fallbacks[Math.floor(Math.random() * fallbacks.length)], source: 'fallback' }; }
    try {
      const response = await client.generateText(
        'Write a natural YouTube comment in Korean. Be friendly. Include 1-2 emojis. Max 100 chars.',
        `Video title: ${videoInfo.title}`
      );
      this.stats.commentsGenerated++;
      return { comment: response.substring(0, 100), source: 'ai_generated' };
    } catch (e) { this.stats.fallbacksUsed++; return { comment: fallbacks[0], source: 'fallback' }; }
  }

  getStats() { return { ...this.stats }; }
}

let instance = null;
function getAutomationAI() { if (!instance) instance = new AutomationAI(); return instance; }

module.exports = { AutomationAI, getAutomationAI, FALLBACK_KEYWORDS };

/**
 * automation-ai.js 단위 테스트
 */
const { AutomationAI, getAutomationAI, FALLBACK_KEYWORDS, COMMENT_TEMPLATES } = require('../src/services/openai/automation-ai');

describe('AutomationAI', () => {
  let ai;
  beforeEach(() => { ai = new AutomationAI(); });

  describe('Fallback Keywords', () => {
    test('returns valid structure', () => {
      const r = ai._getFallbackKeyword();
      expect(r).toHaveProperty('keyword');
      expect(r).toHaveProperty('source', 'fallback');
      expect(r).toHaveProperty('category');
    });

    test('keyword from valid category', () => {
      const r = ai._getFallbackKeyword();
      expect(FALLBACK_KEYWORDS[r.category]).toContain(r.keyword);
    });

    test('respects persona interests', () => {
      const persona = { id: 'test', traits: { interests: ['music'] }};
      for (let i = 0; i < 20; i++)
        expect(ai._getFallbackKeyword(persona).category).toBe('music');
    });
  });

  describe('Keyword Cleaning', () => {
    test('removes quotes', () => {
      expect(ai._cleanKeyword('"테스트"', 30)).toBe('테스트');
    });

    test('truncates to maxLength', () => {
      expect(ai._cleanKeyword('a'.repeat(50), 30).length).toBeLessThanOrEqual(30);
    });

    test('returns null for short', () => {
      expect(ai._cleanKeyword('a', 30)).toBeNull();
    });

    test('returns null for empty', () => {
      expect(ai._cleanKeyword('', 30)).toBeNull();
      expect(ai._cleanKeyword(null, 30)).toBeNull();
    });
  });

  describe('Fallback Comments', () => {
    test('returns valid structure', () => {
      const r = ai._getFallbackComment();
      expect(r).toHaveProperty('comment');
      expect(r).toHaveProperty('source', 'fallback');
      expect(['positive', 'emoji']).toContain(r.type);
    });

    test('comment from valid template', () => {
      for (let i = 0; i < 50; i++) {
        const r = ai._getFallbackComment();
        expect(COMMENT_TEMPLATES[r.type]).toContain(r.comment);
      }
    });
  });

  describe('Statistics', () => {
    test('initial values', () => {
      const s = ai.getStats();
      expect(s.fallbacksUsed).toBe(0);
      expect(s.errors).toBe(0);
    });

    test('tracks fallbacks', () => {
      ai._getFallbackKeyword();
      ai._getFallbackComment();
      expect(ai.getStats().fallbacksUsed).toBe(2);
    });

    test('resetStats clears counters', () => {
      ai._getFallbackKeyword();
      ai.resetStats();
      expect(ai.getStats().fallbacksUsed).toBe(0);
    });
  });

  describe('Data Validation', () => {
    test('all categories have keywords', () => {
      for (const kws of Object.values(FALLBACK_KEYWORDS))
        expect(kws.length).toBeGreaterThan(0);
    });

    test('all comment types have templates', () => {
      for (const comments of Object.values(COMMENT_TEMPLATES))
        expect(comments.length).toBeGreaterThan(0);
    });
  });

  describe('Singleton', () => {
    test('getAutomationAI returns singleton', () => {
      expect(getAutomationAI()).toBe(getAutomationAI());
    });
  });
});

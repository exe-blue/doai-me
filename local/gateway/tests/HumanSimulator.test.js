/**
 * HumanSimulator.js 단위 테스트
 */
const { HumanSimulator, getHumanSimulator } = require('../src/services/automation/HumanSimulator');

describe('HumanSimulator', () => {
  let simulator;
  beforeEach(() => { simulator = new HumanSimulator(); });

  describe('Delay Generation', () => {
    test('idle delay in 3000-7000ms range', () => {
      for (let i = 0; i < 100; i++) {
        const d = simulator.generateDelay('idle');
        expect(d).toBeGreaterThanOrEqual(3000);
        expect(d).toBeLessThanOrEqual(7000);
      }
    });

    test('queue delay in 5000-10000ms range', () => {
      for (let i = 0; i < 100; i++) {
        const d = simulator.generateDelay('queue');
        expect(d).toBeGreaterThanOrEqual(5000);
        expect(d).toBeLessThanOrEqual(10000);
      }
    });

    test('ad skip delay in 7000-20000ms range', () => {
      for (let i = 0; i < 100; i++) {
        const d = simulator.generateAdSkipDelay();
        expect(d).toBeGreaterThanOrEqual(7000);
        expect(d).toBeLessThanOrEqual(20000);
      }
    });
  });

  describe('Watch Duration', () => {
    test('idle duration 5-60s', () => {
      for (let i = 0; i < 100; i++) {
        const d = simulator.generateWatchDuration('idle');
        expect(d).toBeGreaterThanOrEqual(5);
        expect(d).toBeLessThanOrEqual(60);
      }
    });

    test('queue duration 120-600s', () => {
      for (let i = 0; i < 100; i++) {
        const d = simulator.generateWatchDuration('queue');
        expect(d).toBeGreaterThanOrEqual(120);
        expect(d).toBeLessThanOrEqual(600);
      }
    });

    test('caps at video duration', () => {
      for (let i = 0; i < 100; i++) {
        expect(simulator.generateWatchDuration('idle', 30)).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('Click Position', () => {
    test('applies jitter within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const { x, y } = simulator.generateClickPosition(720, 1480);
        expect(Math.abs(x - 720)).toBeLessThanOrEqual(20);
        expect(Math.abs(y - 1480)).toBeLessThanOrEqual(20);
      }
    });

    test('normalized position in 0-1 range', () => {
      for (let i = 0; i < 100; i++) {
        const { x, y } = simulator.generateNormalizedClickPosition(0.5, 0.5);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Probability Methods', () => {
    test('shouldLike ~10%', () => {
      let c = 0;
      for (let i = 0; i < 10000; i++) if (simulator.shouldLike()) c++;
      const rate = c / 10000;
      expect(rate).toBeGreaterThanOrEqual(0.08);
      expect(rate).toBeLessThanOrEqual(0.12);
    });

    test('shouldComment ~5%', () => {
      let c = 0;
      for (let i = 0; i < 10000; i++) if (simulator.shouldComment()) c++;
      const rate = c / 10000;
      expect(rate).toBeGreaterThanOrEqual(0.03);
      expect(rate).toBeLessThanOrEqual(0.07);
    });
  });

  describe('Random Actions', () => {
    test('valid action types', () => {
      const valid = new Set(['back_double', 'forward_double', 'scroll_comments']);
      const actions = simulator.generateQueueRandomActions(300);
      for (const a of actions) expect(valid.has(a.type)).toBe(true);
    });

    test('sorted by timestamp', () => {
      const actions = simulator.generateQueueRandomActions(300);
      if (actions.length > 1) {
        for (let i = 0; i < actions.length - 1; i++)
          expect(actions[i].timestampSec).toBeLessThanOrEqual(actions[i+1].timestampSec);
      }
    });
  });

  describe('Staged Delays', () => {
    test('correct count', () => {
      expect(simulator.generateStagedStartDelays(5)).toHaveLength(5);
    });

    test('first device 1000-3000ms', () => {
      const d = simulator.generateStagedStartDelays(5);
      expect(d[0]).toBeGreaterThanOrEqual(1000);
      expect(d[0]).toBeLessThanOrEqual(3000);
    });
  });

  describe('Video Rank', () => {
    test('in 1-10 range', () => {
      for (let i = 0; i < 100; i++) {
        const r = simulator.generateVideoRank();
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(10);
      }
    });

    test('biased to top', () => {
      const ranks = [];
      for (let i = 0; i < 10000; i++) ranks.push(simulator.generateVideoRank());
      const top3 = ranks.filter(r => r <= 3).length;
      const bottom3 = ranks.filter(r => r >= 8).length;
      expect(top3).toBeGreaterThan(bottom3 * 2);
    });
  });

  describe('Singleton', () => {
    test('getHumanSimulator returns singleton', () => {
      expect(getHumanSimulator()).toBe(getHumanSimulator());
    });
  });
});

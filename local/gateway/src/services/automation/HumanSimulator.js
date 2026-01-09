/**
 * HumanSimulator.js
 * Provides human-like behavior simulation for YouTube automation
 */

const EventEmitter = require('events');

class HumanSimulator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.idleConfig = {
      delayMinMs: 3000, delayMaxMs: 7000, clickErrorPx: 20,
      watchMinSeconds: 5, watchMaxSeconds: 60,
      likeProbability: 0.10, commentProbability: 0.05,
      scrollMinCount: 1, scrollMaxCount: 5, ...config.idle
    };
    this.queueConfig = {
      delayMinMs: 5000, delayMaxMs: 10000, clickErrorPx: 20,
      adSkipWaitMinMs: 7000, adSkipWaitMaxMs: 20000,
      watchMinSeconds: 120, watchMaxSeconds: 600,
      likeProbability: 0.10, commentProbability: 0.05,
      randomActions: { backDoubleProbability: 0.01, forwardDoubleProbability: 0.01, scrollCommentsProbability: 0.01 },
      ...config.queue
    };
    this.screenWidth = config.screenWidth || 1440;
    this.screenHeight = config.screenHeight || 2960;
    this.stats = { delaysGenerated: 0, clicksSimulated: 0, scrollsSimulated: 0 };
  }

  randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  randomFloat(min, max) { return Math.random() * (max - min) + min; }
  shouldOccur(probability) { return Math.random() < probability; }

  generateDelay(mode = 'idle') {
    const cfg = mode === 'queue' ? this.queueConfig : this.idleConfig;
    this.stats.delaysGenerated++;
    return this.randomInt(cfg.delayMinMs, cfg.delayMaxMs);
  }

  generateAdSkipDelay() {
    return this.randomInt(this.queueConfig.adSkipWaitMinMs, this.queueConfig.adSkipWaitMaxMs);
  }

  generateWatchDuration(mode = 'idle', videoDuration = null) {
    const cfg = mode === 'queue' ? this.queueConfig : this.idleConfig;
    let max = cfg.watchMaxSeconds;
    if (videoDuration && videoDuration > 0) max = Math.min(max, videoDuration);
    return this.randomInt(cfg.watchMinSeconds, max);
  }

  generateNormalizedClickPosition(targetX, targetY, mode = 'idle') {
    const cfg = mode === 'queue' ? this.queueConfig : this.idleConfig;
    const normalizedError = cfg.clickErrorPx / this.screenWidth;
    const offsetX = this.randomFloat(-normalizedError, normalizedError);
    const offsetY = this.randomFloat(-normalizedError, normalizedError);
    this.stats.clicksSimulated++;
    return { x: Math.max(0, Math.min(1, targetX + offsetX)), y: Math.max(0, Math.min(1, targetY + offsetY)) };
  }

  generateScrollParams(mode = 'idle') {
    const count = this.randomInt(this.idleConfig.scrollMinCount, this.idleConfig.scrollMaxCount);
    const segments = [];
    for (let i = 0; i < count; i++) {
      segments.push({ distance: this.randomInt(200, 600), duration: this.randomInt(200, 500), pauseAfter: this.randomInt(500, 2000) });
    }
    this.stats.scrollsSimulated++;
    return { totalScrolls: count, segments };
  }

  shouldLike(mode = 'idle') { return this.shouldOccur((mode === 'queue' ? this.queueConfig : this.idleConfig).likeProbability); }
  shouldComment(mode = 'idle') { return this.shouldOccur((mode === 'queue' ? this.queueConfig : this.idleConfig).commentProbability); }

  generateQueueRandomActions(watchDurationSeconds) {
    const actions = [];
    const { randomActions } = this.queueConfig;
    for (let sec = 1; sec < watchDurationSeconds; sec++) {
      if (this.shouldOccur(randomActions.backDoubleProbability)) actions.push({ type: 'back_double', timestampSec: sec });
      if (this.shouldOccur(randomActions.forwardDoubleProbability)) actions.push({ type: 'forward_double', timestampSec: sec });
      if (this.shouldOccur(randomActions.scrollCommentsProbability)) actions.push({ type: 'scroll_comments', timestampSec: sec });
    }
    return actions.sort((a, b) => a.timestampSec - b.timestampSec);
  }

  generateStagedStartDelays(deviceCount) {
    const delays = [];
    let cumulative = 0;
    for (let i = 0; i < deviceCount; i++) {
      if (i === 0) delays.push(this.randomInt(1000, 3000));
      else { cumulative += this.generateDelay('queue'); delays.push(cumulative); }
    }
    return delays;
  }

  generateVideoRank(maxRank = 10) {
    const weights = [];
    for (let i = 1; i <= maxRank; i++) weights.push(1 / i);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i + 1; }
    return 1;
  }

  getConfigSnapshot(mode = 'idle') {
    const cfg = mode === 'queue' ? this.queueConfig : this.idleConfig;
    return { mode, delayRange: `${cfg.delayMinMs}-${cfg.delayMaxMs}ms`, clickErrorPx: cfg.clickErrorPx };
  }

  getStats() { return { ...this.stats }; }
  async wait(mode = 'idle') { return new Promise(r => setTimeout(r, this.generateDelay(mode))); }
  async waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }
  async waitRange(min, max) { return new Promise(r => setTimeout(r, this.randomInt(min, max))); }
}

let instance = null;
function getHumanSimulator(config) { if (!instance) instance = new HumanSimulator(config); return instance; }

module.exports = { HumanSimulator, getHumanSimulator };

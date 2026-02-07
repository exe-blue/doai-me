/**
 * YouTube Web Automation Module
 *
 * Chrome 브라우저를 통한 YouTube 웹 자동화
 *
 * 주요 기능:
 * 1. 검색 및 동영상 찾기
 * 2. 동영상 시청 (광고 스킵 포함)
 * 3. 좋아요, 댓글, 구독
 * 4. 시청 시간 추적
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * YouTube 선택자
 */
const SELECTORS = {
    // 검색
    SEARCH_INPUT: 'input#search',
    SEARCH_BUTTON: 'button#search-icon-legacy',
    SEARCH_RESULTS: 'ytd-video-renderer',
    VIDEO_TITLE: '#video-title',

    // 플레이어
    PLAYER: '#movie_player',
    VIDEO: 'video.html5-main-video',
    PLAY_BUTTON: '.ytp-play-button',
    PROGRESS_BAR: '.ytp-progress-bar',
    TIME_CURRENT: '.ytp-time-current',
    TIME_DURATION: '.ytp-time-duration',

    // 광고
    AD_OVERLAY: '.ytp-ad-overlay-container',
    AD_SKIP_BUTTON: '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern',
    AD_PREVIEW: '.ytp-ad-preview-container',
    AD_TEXT: '.ytp-ad-text',

    // 상호작용
    LIKE_BUTTON: '#top-level-buttons-computed ytd-toggle-button-renderer:first-child button',
    LIKE_BUTTON_ARIA: 'button[aria-label*="like"], button[aria-label*="좋아요"]',
    DISLIKE_BUTTON: '#top-level-buttons-computed ytd-toggle-button-renderer:nth-child(2) button',
    SUBSCRIBE_BUTTON: '#subscribe-button button, ytd-subscribe-button-renderer button',
    COMMENT_INPUT: '#placeholder-area, #contenteditable-root',
    COMMENT_SUBMIT: '#submit-button button',

    // 채널
    CHANNEL_NAME: '#channel-name a',
    SUBSCRIBER_COUNT: '#owner-sub-count',

    // 추천 동영상
    RELATED_VIDEOS: 'ytd-compact-video-renderer',

    // 모달/오버레이
    CONSENT_DIALOG: 'ytd-consent-bump-v2-lightbox',
    CONSENT_ACCEPT: 'button[aria-label*="Accept"], button[aria-label*="동의"]',
    SIGNIN_PROMO: 'ytd-popup-container',
    DISMISS_BUTTON: 'button[aria-label="Dismiss"], button[aria-label="닫기"]'
};

/**
 * YouTube URL 패턴
 */
const YOUTUBE_URLS = {
    BASE: 'https://www.youtube.com',
    MOBILE: 'https://m.youtube.com',
    SEARCH: 'https://www.youtube.com/results?search_query=',
    VIDEO: 'https://www.youtube.com/watch?v=',
    CHANNEL: 'https://www.youtube.com/channel/',
    SHORTS: 'https://www.youtube.com/shorts/'
};

/**
 * 시청 결과
 * @typedef {Object} WatchResult
 * @property {boolean} success - 성공 여부
 * @property {number} watchDuration - 실제 시청 시간 (초)
 * @property {number} watchPercent - 시청 비율
 * @property {boolean} liked - 좋아요 여부
 * @property {boolean} commented - 댓글 여부
 * @property {boolean} subscribed - 구독 여부
 * @property {number} adSkipped - 스킵한 광고 수
 * @property {string} error - 에러 메시지
 */

class YouTubeWeb extends EventEmitter {
    /**
     * @param {Object} options
     * @param {import('./ChromeDriver')} options.chromeDriver
     * @param {Object} options.logger
     * @param {Object} options.humanSimulator - 인간 행동 시뮬레이터
     */
    constructor(options = {}) {
        super();

        this.chromeDriver = options.chromeDriver;
        this.logger = options.logger || console;
        this.humanSimulator = options.humanSimulator || null;

        // 설정
        this.useMobileVersion = options.useMobileVersion || false;
        this.adSkipDelay = options.adSkipDelay || 500; // 광고 스킵 전 대기
        this.watchCheckInterval = options.watchCheckInterval || 5000; // 시청 체크 간격
    }

    /**
     * YouTube 홈페이지로 이동
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<void>}
     */
    async goToHome(serial) {
        const url = this.useMobileVersion ? YOUTUBE_URLS.MOBILE : YOUTUBE_URLS.BASE;
        await this.chromeDriver.navigate(serial, url);
        await this._handleConsentDialog(serial);
    }

    /**
     * 키워드로 검색
     * @param {string} serial - 디바이스 시리얼
     * @param {string} keyword - 검색어
     * @returns {Promise<number>} 검색 결과 수
     */
    async search(serial, keyword) {
        this.logger.info('[YouTubeWeb] Searching', { serial, keyword });

        // 검색 URL로 직접 이동 (더 안정적)
        const searchUrl = `${YOUTUBE_URLS.SEARCH}${encodeURIComponent(keyword)}`;
        await this.chromeDriver.navigate(serial, searchUrl);

        // 결과 로딩 대기
        await this._sleep(2000);
        await this._handleConsentDialog(serial);

        // 검색 결과 수 확인
        const resultCount = await this.chromeDriver.evaluate(serial, (selector) => {
            return document.querySelectorAll(selector).length;
        }, SELECTORS.SEARCH_RESULTS);

        this.logger.info('[YouTubeWeb] Search results', { serial, keyword, count: resultCount });
        this.emit('search', { serial, keyword, resultCount });

        return resultCount;
    }

    /**
     * 검색 결과에서 동영상 선택
     * @param {string} serial - 디바이스 시리얼
     * @param {number} rank - 순위 (0부터 시작)
     * @returns {Promise<{ videoId: string, title: string } | null>}
     */
    async selectVideoByRank(serial, rank = 0) {
        try {
            // 검색 결과에서 n번째 동영상 찾기
            const videoInfo = await this.chromeDriver.evaluate(serial, (selector, idx) => {
                const videos = document.querySelectorAll(selector);
                if (videos.length <= idx) return null;

                const video = videos[idx];
                const titleEl = video.querySelector('#video-title');
                const linkEl = video.querySelector('a#video-title, a#thumbnail');

                if (!linkEl) return null;

                const href = linkEl.href;
                const videoIdMatch = href.match(/[?&]v=([^&]+)/);

                return {
                    videoId: videoIdMatch ? videoIdMatch[1] : null,
                    title: titleEl?.textContent?.trim() || '',
                    href
                };
            }, SELECTORS.SEARCH_RESULTS, rank);

            if (!videoInfo || !videoInfo.videoId) {
                this.logger.warn('[YouTubeWeb] Video not found at rank', { serial, rank });
                return null;
            }

            // 동영상 페이지로 이동
            await this.chromeDriver.navigate(serial, videoInfo.href);
            await this._sleep(2000);

            this.logger.info('[YouTubeWeb] Video selected', {
                serial,
                rank,
                videoId: videoInfo.videoId,
                title: videoInfo.title
            });

            this.emit('videoSelected', { serial, ...videoInfo, rank });
            return videoInfo;

        } catch (e) {
            this.logger.error('[YouTubeWeb] selectVideoByRank failed', { serial, error: e.message });
            return null;
        }
    }

    /**
     * 동영상 ID로 직접 이동
     * @param {string} serial - 디바이스 시리얼
     * @param {string} videoId - YouTube 동영상 ID
     * @returns {Promise<boolean>}
     */
    async goToVideo(serial, videoId) {
        try {
            const url = `${YOUTUBE_URLS.VIDEO}${videoId}`;
            await this.chromeDriver.navigate(serial, url);
            await this._sleep(2000);
            await this._handleConsentDialog(serial);

            this.logger.info('[YouTubeWeb] Navigated to video', { serial, videoId });
            return true;
        } catch (e) {
            this.logger.error('[YouTubeWeb] goToVideo failed', { serial, videoId, error: e.message });
            return false;
        }
    }

    /**
     * 동영상 시청
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} options
     * @param {number} options.targetSeconds - 목표 시청 시간 (초)
     * @param {number} options.targetPercent - 목표 시청 비율 (0-1)
     * @param {boolean} options.shouldLike - 좋아요 여부
     * @param {boolean} options.shouldComment - 댓글 여부
     * @param {string} options.commentText - 댓글 내용
     * @param {boolean} options.shouldSubscribe - 구독 여부
     * @returns {Promise<WatchResult>}
     */
    async watchVideo(serial, options = {}) {
        const {
            targetSeconds = 60,
            targetPercent = 0.7,
            shouldLike = false,
            shouldComment = false,
            commentText = '',
            shouldSubscribe = false
        } = options;

        const result = {
            success: false,
            watchDuration: 0,
            watchPercent: 0,
            liked: false,
            commented: false,
            subscribed: false,
            adSkipped: 0,
            error: null
        };

        try {
            // 동영상 길이 확인
            const videoDuration = await this._getVideoDuration(serial);
            const actualTargetSeconds = Math.min(
                targetSeconds,
                videoDuration * targetPercent
            );

            this.logger.info('[YouTubeWeb] Starting watch', {
                serial,
                videoDuration,
                targetSeconds: actualTargetSeconds
            });

            // 재생 시작
            await this._ensurePlaying(serial);

            // 시청 루프
            const startTime = Date.now();
            let watchedSeconds = 0;

            while (watchedSeconds < actualTargetSeconds) {
                // 광고 처리
                const adSkipped = await this._handleAds(serial);
                result.adSkipped += adSkipped ? 1 : 0;

                // 현재 재생 시간 확인
                const currentTime = await this._getCurrentTime(serial);
                watchedSeconds = currentTime;

                // 인간적인 행동 (가끔 스크롤, 마우스 움직임 등)
                if (this.humanSimulator && Math.random() < 0.1) {
                    await this._humanBehavior(serial);
                }

                // 체크 간격만큼 대기
                await this._sleep(this.watchCheckInterval);

                // 타임아웃 체크 (실제 경과 시간 기준)
                const elapsed = (Date.now() - startTime) / 1000;
                if (elapsed > actualTargetSeconds * 2) {
                    this.logger.warn('[YouTubeWeb] Watch timeout', { serial, elapsed });
                    break;
                }
            }

            result.watchDuration = watchedSeconds;
            result.watchPercent = videoDuration > 0 ? watchedSeconds / videoDuration : 0;

            // 좋아요
            if (shouldLike) {
                result.liked = await this.like(serial);
            }

            // 댓글
            if (shouldComment && commentText) {
                result.commented = await this.comment(serial, commentText);
            }

            // 구독
            if (shouldSubscribe) {
                result.subscribed = await this.subscribe(serial);
            }

            result.success = true;

            this.logger.info('[YouTubeWeb] Watch completed', { serial, result });
            this.emit('watchCompleted', { serial, result });

        } catch (e) {
            result.error = e.message;
            this.logger.error('[YouTubeWeb] Watch failed', { serial, error: e.message });
            this.emit('watchError', { serial, error: e });
        }

        return result;
    }

    /**
     * 좋아요 클릭
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<boolean>}
     */
    async like(serial) {
        try {
            // 좋아요 버튼 찾기 (여러 선택자 시도)
            const selectors = [SELECTORS.LIKE_BUTTON, SELECTORS.LIKE_BUTTON_ARIA];

            for (const selector of selectors) {
                const exists = await this.chromeDriver.exists(serial, selector);
                if (exists) {
                    // 이미 좋아요 상태인지 확인
                    const isLiked = await this.chromeDriver.evaluate(serial, (sel) => {
                        const btn = document.querySelector(sel);
                        return btn?.getAttribute('aria-pressed') === 'true';
                    }, selector);

                    if (!isLiked) {
                        await this.chromeDriver.click(serial, selector);
                        await this._sleep(500);
                        this.logger.info('[YouTubeWeb] Liked', { serial });
                        return true;
                    } else {
                        this.logger.info('[YouTubeWeb] Already liked', { serial });
                        return true;
                    }
                }
            }

            this.logger.warn('[YouTubeWeb] Like button not found', { serial });
            return false;
        } catch (e) {
            this.logger.error('[YouTubeWeb] Like failed', { serial, error: e.message });
            return false;
        }
    }

    /**
     * 댓글 작성
     * @param {string} serial - 디바이스 시리얼
     * @param {string} text - 댓글 내용
     * @returns {Promise<boolean>}
     */
    async comment(serial, text) {
        try {
            // 댓글 섹션으로 스크롤
            await this.chromeDriver.scroll(serial, { y: 500 });
            await this._sleep(1000);

            // 댓글 입력란 클릭
            await this.chromeDriver.click(serial, SELECTORS.COMMENT_INPUT);
            await this._sleep(500);

            // 댓글 입력
            await this.chromeDriver.type(serial, '#contenteditable-root', text);
            await this._sleep(500);

            // 댓글 제출
            await this.chromeDriver.click(serial, SELECTORS.COMMENT_SUBMIT);
            await this._sleep(1000);

            this.logger.info('[YouTubeWeb] Commented', { serial, textLength: text.length });
            return true;
        } catch (e) {
            this.logger.error('[YouTubeWeb] Comment failed', { serial, error: e.message });
            return false;
        }
    }

    /**
     * 구독하기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<boolean>}
     */
    async subscribe(serial) {
        try {
            const exists = await this.chromeDriver.exists(serial, SELECTORS.SUBSCRIBE_BUTTON);
            if (!exists) {
                this.logger.warn('[YouTubeWeb] Subscribe button not found', { serial });
                return false;
            }

            // 이미 구독 중인지 확인
            const isSubscribed = await this.chromeDriver.evaluate(serial, (sel) => {
                const btn = document.querySelector(sel);
                const text = btn?.textContent?.toLowerCase() || '';
                return text.includes('subscribed') || text.includes('구독중');
            }, SELECTORS.SUBSCRIBE_BUTTON);

            if (!isSubscribed) {
                await this.chromeDriver.click(serial, SELECTORS.SUBSCRIBE_BUTTON);
                await this._sleep(500);
                this.logger.info('[YouTubeWeb] Subscribed', { serial });
                return true;
            } else {
                this.logger.info('[YouTubeWeb] Already subscribed', { serial });
                return true;
            }
        } catch (e) {
            this.logger.error('[YouTubeWeb] Subscribe failed', { serial, error: e.message });
            return false;
        }
    }

    /**
     * 채널 정보 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<{ name: string, subscribers: string } | null>}
     */
    async getChannelInfo(serial) {
        try {
            const info = await this.chromeDriver.evaluate(serial, (nameSelector, subSelector) => {
                const nameEl = document.querySelector(nameSelector);
                const subEl = document.querySelector(subSelector);
                return {
                    name: nameEl?.textContent?.trim() || '',
                    subscribers: subEl?.textContent?.trim() || ''
                };
            }, SELECTORS.CHANNEL_NAME, SELECTORS.SUBSCRIBER_COUNT);

            return info;
        } catch {
            return null;
        }
    }

    // ==================== Private Methods ====================

    /**
     * 동의 다이얼로그 처리
     */
    async _handleConsentDialog(serial) {
        try {
            const exists = await this.chromeDriver.exists(serial, SELECTORS.CONSENT_ACCEPT);
            if (exists) {
                await this.chromeDriver.click(serial, SELECTORS.CONSENT_ACCEPT);
                await this._sleep(1000);
                this.logger.info('[YouTubeWeb] Consent accepted', { serial });
            }
        } catch {
            // 무시
        }
    }

    /**
     * 재생 보장
     */
    async _ensurePlaying(serial) {
        try {
            const isPaused = await this.chromeDriver.evaluate(serial, () => {
                const video = document.querySelector('video');
                return video?.paused;
            });

            if (isPaused) {
                await this.chromeDriver.click(serial, SELECTORS.PLAY_BUTTON);
                await this._sleep(500);
            }
        } catch {
            // 무시
        }
    }

    /**
     * 광고 처리
     */
    async _handleAds(serial) {
        try {
            // 스킵 버튼 확인
            const skipExists = await this.chromeDriver.exists(serial, SELECTORS.AD_SKIP_BUTTON);
            if (skipExists) {
                await this._sleep(this.adSkipDelay);
                await this.chromeDriver.click(serial, SELECTORS.AD_SKIP_BUTTON);
                this.logger.info('[YouTubeWeb] Ad skipped', { serial });
                return true;
            }

            // 광고 오버레이 닫기
            const overlayExists = await this.chromeDriver.exists(serial, SELECTORS.AD_OVERLAY);
            if (overlayExists) {
                await this.chromeDriver.evaluate(serial, (sel) => {
                    const overlay = document.querySelector(sel);
                    if (overlay) overlay.remove();
                }, SELECTORS.AD_OVERLAY);
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * 동영상 길이 가져오기
     */
    async _getVideoDuration(serial) {
        try {
            const duration = await this.chromeDriver.evaluate(serial, () => {
                const video = document.querySelector('video');
                return video?.duration || 0;
            });
            return duration;
        } catch {
            return 0;
        }
    }

    /**
     * 현재 재생 시간 가져오기
     */
    async _getCurrentTime(serial) {
        try {
            const currentTime = await this.chromeDriver.evaluate(serial, () => {
                const video = document.querySelector('video');
                return video?.currentTime || 0;
            });
            return currentTime;
        } catch {
            return 0;
        }
    }

    /**
     * 인간적인 행동 시뮬레이션
     */
    async _humanBehavior(serial) {
        const actions = ['scroll', 'pause', 'move'];
        const action = actions[Math.floor(Math.random() * actions.length)];

        switch (action) {
            case 'scroll':
                await this.chromeDriver.scroll(serial, {
                    y: Math.random() * 200 - 100
                });
                break;
            case 'pause':
                await this._sleep(Math.random() * 2000);
                break;
            case 'move':
                // 마우스 움직임 시뮬레이션 (Puppeteer)
                break;
        }
    }

    /**
     * Sleep 유틸리티
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = YouTubeWeb;
module.exports.SELECTORS = SELECTORS;
module.exports.YOUTUBE_URLS = YOUTUBE_URLS;

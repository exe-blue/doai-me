/**
 * Random Watch Service
 *
 * 디바이스가 랜덤 영상을 시청하고 결과를 보고
 *
 * 프로세스:
 * 1. 유휴 디바이스 감지
 * 2. 랜덤 영상 선택 (추천 피드 or 검색)
 * 3. 시청 시작 → 결과 보고
 *
 * 이는 Persona의 "자연스러운" 시청 패턴을 형성
 */

const { EventEmitter } = require('events');
const config = require('../lib/config');

class RandomWatchService extends EventEmitter {
    constructor(supabase, laixi) {
        super();
        this.supabase = supabase;
        this.laixi = laixi;
        this.activeWatches = new Map(); // serial -> { videoId, startTime }
    }

    /**
     * 랜덤 시청 시작
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} persona - Persona 정보 (취향 반영)
     */
    async startRandomWatch(serial, persona = null) {
        if (this.activeWatches.has(serial)) {
            console.log(`[RandomWatch] ${serial} 이미 시청 중`);
            return null;
        }

        try {
            // 1. 랜덤 시청 시간 결정
            const duration = this._getRandomDuration();

            // 2. 영상 선택 (Persona 취향 기반 or 완전 랜덤)
            const video = await this._selectRandomVideo(persona);

            if (!video) {
                console.log(`[RandomWatch] ${serial} 영상 선택 실패`);
                return null;
            }

            // 3. 시청 시작
            const watchSession = {
                serial,
                videoId: video.video_id,
                videoTitle: video.title,
                startTime: Date.now(),
                targetDuration: duration,
                persona: persona?.given_name || 'Unknown'
            };

            this.activeWatches.set(serial, watchSession);

            console.log(`[RandomWatch] ▶️ ${serial} 시청 시작`);
            console.log(`             영상: ${video.title?.slice(0, 30)}...`);
            console.log(`             시간: ${duration}초`);

            // 4. Laixi로 YouTube 열기
            await this._openYouTubeVideo(serial, video.video_id);

            // 5. 타이머 설정 → 시청 완료 후 보고
            setTimeout(() => {
                this._completeWatch(serial, watchSession);
            }, duration * 1000);

            this.emit('watch-started', watchSession);

            return watchSession;
        } catch (err) {
            console.error(`[RandomWatch] ${serial} 시청 시작 실패:`, err.message);
            this.activeWatches.delete(serial);
            return null;
        }
    }

    /**
     * 시청 완료 처리
     */
    async _completeWatch(serial, session) {
        if (!this.activeWatches.has(serial)) {
            return;
        }

        this.activeWatches.delete(serial);

        const actualDuration = Math.round((Date.now() - session.startTime) / 1000);

        // 좋아요/댓글 확률 계산
        const liked = Math.random() < config.LIKE_PROBABILITY;
        const commented = Math.random() < config.COMMENT_PROBABILITY;

        const result = {
            serial,
            videoId: session.videoId,
            videoTitle: session.videoTitle,
            watchDuration: actualDuration,
            targetDuration: session.targetDuration,
            liked,
            commented,
            completedAt: new Date().toISOString()
        };

        console.log(`[RandomWatch] ✅ ${serial} 시청 완료`);
        console.log(`             시간: ${actualDuration}초 / 목표: ${session.targetDuration}초`);
        console.log(`             좋아요: ${liked}, 댓글: ${commented}`);

        // Supabase에 결과 보고
        await this._reportWatchResult(result);

        // 이벤트 발행
        this.emit('watch-completed', result);

        return result;
    }

    /**
     * 시청 결과 보고 (Supabase)
     */
    async _reportWatchResult(result) {
        try {
            // traces 테이블에 기록
            const { error } = await this.supabase
                .from('traces')
                .insert({
                    device_serial: result.serial,
                    traced_at: new Date().toISOString(),
                    action_type: 'RANDOM_WATCH',
                    action_params: {
                        video_id: result.videoId,
                        video_title: result.videoTitle
                    },
                    outcome_success: true,
                    outcome_summary: {
                        watch_duration: result.watchDuration,
                        liked: result.liked,
                        commented: result.commented
                    },
                    path_contribution_weight: 0.01 // 랜덤 시청은 낮은 기여도
                });

            if (error) {
                console.error('[RandomWatch] 결과 보고 실패:', error.message);
            }

            return !error;
        } catch (err) {
            console.error('[RandomWatch] 결과 보고 오류:', err.message);
            return false;
        }
    }

    /**
     * 랜덤 영상 선택
     */
    async _selectRandomVideo(persona = null) {
        try {
            // 1. 추천 영상 풀에서 선택 시도
            const { data: videos, error } = await this.supabase
                .from('recommended_videos')
                .select('video_id, title, channel_name, category')
                .eq('active', true)
                .limit(50);

            if (!error && videos && videos.length > 0) {
                // Persona 취향에 맞는 영상 필터링 (선택적)
                let filtered = videos;

                if (persona?.preferred_categories) {
                    filtered = videos.filter(v =>
                        persona.preferred_categories.includes(v.category)
                    );

                    // 필터 결과 없으면 전체에서 선택
                    if (filtered.length === 0) filtered = videos;
                }

                // 랜덤 선택
                return filtered[Math.floor(Math.random() * filtered.length)];
            }

            // 2. 추천 영상 없으면 기본 카테고리에서 선택
            return this._getDefaultVideo();
        } catch (err) {
            console.error('[RandomWatch] 영상 선택 오류:', err.message);
            return this._getDefaultVideo();
        }
    }

    /**
     * 기본 영상 (추천 풀 없을 때)
     */
    _getDefaultVideo() {
        const defaultCategories = [
            { video_id: 'trending', title: 'Trending Video', type: 'trending' },
            { video_id: 'recommended', title: 'Recommended for You', type: 'home' }
        ];

        return defaultCategories[Math.floor(Math.random() * defaultCategories.length)];
    }

    /**
     * 랜덤 시청 시간
     */
    _getRandomDuration() {
        const min = config.MIN_WATCH_DURATION;
        const max = config.MAX_WATCH_DURATION;
        return Math.floor(min + Math.random() * (max - min));
    }

    /**
     * Laixi로 YouTube 영상 열기
     */
    async _openYouTubeVideo(serial, videoId) {
        if (!this.laixi) {
            console.log(`[RandomWatch] Laixi 없음, Mock 모드`);
            return true;
        }

        try {
            // 특수 타입 처리
            if (videoId === 'trending' || videoId === 'recommended') {
                // YouTube 앱 홈 열기
                await this.laixi.openApp(serial, 'com.google.android.youtube');
                return true;
            }

            // 일반 영상 URL 열기
            const url = `https://www.youtube.com/watch?v=${videoId}`;
            await this.laixi.openUrl(serial, url);
            return true;
        } catch (err) {
            console.error(`[RandomWatch] YouTube 열기 실패 (${serial}):`, err.message);
            return false;
        }
    }

    /**
     * 유휴 디바이스 찾아서 자동 시청 시작
     * @param {Array} devices - 온라인 디바이스 목록
     * @param {number} maxConcurrent - 동시 시청 최대 수
     */
    async autoStartWatches(devices, maxConcurrent = 10) {
        const idle = devices.filter(d =>
            !this.activeWatches.has(d.serial || d.id)
        );

        const toStart = idle.slice(0, maxConcurrent - this.activeWatches.size);

        for (const device of toStart) {
            await this.startRandomWatch(device.serial || device.id);
        }

        return toStart.length;
    }

    /**
     * 상태 조회
     */
    getStatus() {
        return {
            activeCount: this.activeWatches.size,
            activeWatches: Array.from(this.activeWatches.entries()).map(([serial, session]) => ({
                serial,
                videoTitle: session.videoTitle,
                elapsed: Math.round((Date.now() - session.startTime) / 1000),
                target: session.targetDuration
            }))
        };
    }
}

module.exports = RandomWatchService;

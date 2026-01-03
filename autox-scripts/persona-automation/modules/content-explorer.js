/**
 * Content Explorer
 * 페르소나 기반 컨텐츠 탐색
 * 
 * @author Axon (Builder)
 */

class ContentExplorer {
    constructor(config, logger, youtube) {
        this.config = config;
        this.logger = logger;
        this.youtube = youtube;
    }

    /**
     * 페르소나 기반 키워드 선택
     * 
     * 70% 선호 카테고리, 30% 랜덤 탐색
     */
    selectKeyword(persona) {
        const usePreferred = Math.random() < 0.7;
        
        if (usePreferred && persona.path_summary?.preferred_categories?.length > 0) {
            // 선호 카테고리에서 선택
            const categories = persona.path_summary.preferred_categories;
            const keyword = categories[Math.floor(Math.random() * categories.length)];
            
            this.logger.debug('🎯 선호 키워드 선택', { keyword });
            return keyword;
        } else {
            // 랜덤 탐색
            const pool = this.config.exploration?.keywordPool || ['일상'];
            const keyword = pool[Math.floor(Math.random() * pool.length)];
            
            this.logger.debug('🔀 랜덤 키워드 선택', { keyword });
            return keyword;
        }
    }

    /**
     * 자율 탐색 세션 실행
     */
    async explore(persona, durationMs) {
        this.logger.info('🌐 자율 탐색 시작', {
            duration: `${Math.floor(durationMs / 1000)}초`
        });
        
        const startTime = Date.now();
        const endTime = startTime + durationMs;
        
        let videoCount = 0;
        const maxVideos = this.config.exploration?.maxVideosPerSession || 5;
        
        while (Date.now() < endTime && videoCount < maxVideos) {
            try {
                // 1. 키워드 선택
                const keyword = this.selectKeyword(persona);
                
                // 2. YouTube 검색
                if (!this.youtube.launchYouTube()) {
                    this.logger.warn('YouTube 앱 실행 실패');
                    break;
                }
                
                if (!this.youtube.searchByKeyword(keyword)) {
                    this.logger.warn('검색 실패', { keyword });
                    continue;
                }
                
                // 3. 랜덤 비디오 선택
                const rankMax = this.config.exploration?.searchRankMax || 5;
                const rank = Math.floor(Math.random() * rankMax) + 1;
                
                if (!this.youtube.selectVideoByRank(rank)) {
                    this.logger.warn('비디오 선택 실패', { rank });
                    continue;
                }
                
                sleep(2000);
                
                // 4. 시청 시간 (변수에서 가져오기)
                const variables = JSON.parse(files.read('./config/variables.json'));
                const watchDuration = Math.floor(
                    Math.random() * (variables.behavior.maxWatchDuration - variables.behavior.minWatchDuration)
                ) + variables.behavior.minWatchDuration;
                
                this.logger.info('👀 자율 시청', {
                    keyword,
                    rank,
                    duration: watchDuration
                });
                
                sleep(watchDuration * 1000);
                
                videoCount++;
                
                // 5. 영상 간 간격
                const intervalMs = Math.floor(Math.random() * 10000) + 5000;  // 5-15초
                sleep(intervalMs);
                
            } catch (e) {
                this.logger.error('자율 탐색 에러', { error: e.message });
                sleep(10000);
            }
        }
        
        this.logger.info('✅ 자율 탐색 완료', {
            videoCount,
            duration: Math.floor((Date.now() - startTime) / 1000) + '초'
        });
        
        return {
            videoCount,
            duration: Date.now() - startTime
        };
    }
}

module.exports = ContentExplorer;

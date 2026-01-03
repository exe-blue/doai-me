/**
 * Persona Checker
 * 스냅샷 3장 + 키워드 추출
 * 
 * @author Axon (Builder)
 */

class PersonaChecker {
    constructor(config, logger, youtube) {
        this.config = config;
        this.logger = logger;
        this.youtube = youtube;
    }

    /**
     * 페르소나 체크 실행
     * 
     * 1. YouTube 앱 실행
     * 2. 현재 화면 스크린샷 3장
     * 3. 영상 제목/설명에서 키워드 추출
     * 
     * Returns: { success, screenshots, keywords, videoInfo }
     */
    async check() {
        this.logger.info('🔍 페르소나 체크 시작');
        
        try {
            // 1. YouTube 앱 실행
            if (!this.youtube.launchYouTube()) {
                return { success: false, reason: 'YouTube 앱 실행 실패' };
            }
            
            sleep(3000);
            
            // 2. 스크린샷 3장 캡처
            const screenshots = [];
            const screenshotCount = this.config.persona?.screenshotCount || 3;
            
            for (let i = 0; i < screenshotCount; i++) {
                const screenshot = this.captureScreen();
                if (screenshot) {
                    screenshots.push(screenshot);
                    this.logger.debug(`📸 스크린샷 ${i + 1}/${screenshotCount}`);
                }
                sleep(1000);
            }
            
            // 3. 현재 영상 정보 추출
            const videoInfo = this.extractCurrentVideoInfo();
            
            // 4. 키워드 추출 (간단한 패턴)
            const keywords = this.extractKeywords(videoInfo);
            
            this.logger.info('✅ 페르소나 체크 완료', {
                screenshots: screenshots.length,
                keywords: keywords.length,
                title: videoInfo.title
            });
            
            return {
                success: true,
                screenshots,
                keywords,
                videoInfo
            };
            
        } catch (e) {
            this.logger.error('❌ 페르소나 체크 실패', { error: e.message });
            return { success: false, reason: e.message };
        }
    }

    /**
     * 화면 캡처
     */
    captureScreen() {
        try {
            // AutoX.js 스크린샷
            const img = captureScreen();
            if (img) {
                // 파일로 저장
                const timestamp = Date.now();
                const path = `/sdcard/DoAi/screenshots/screenshot_${timestamp}.png`;
                images.save(img, path);
                img.recycle();
                
                return path;
            }
            return null;
        } catch (e) {
            this.logger.error('스크린샷 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 현재 영상 정보 추출
     */
    extractCurrentVideoInfo() {
        try {
            // 제목 추출 (YouTube 앱 UI 요소)
            const titleElement = className("android.widget.TextView").findOne(3000);
            const title = titleElement ? titleElement.text() : "Unknown";
            
            // 채널명 추출
            const channelElement = id("channel_name").findOne(2000);
            const channel = channelElement ? channelElement.text() : "Unknown";
            
            return {
                title: title || "Unknown",
                channel: channel || "Unknown",
                timestamp: Date.now()
            };
        } catch (e) {
            this.logger.error('영상 정보 추출 실패', { error: e.message });
            return {
                title: "Unknown",
                channel: "Unknown",
                timestamp: Date.now()
            };
        }
    }

    /**
     * 키워드 추출 (간단한 패턴)
     */
    extractKeywords(videoInfo) {
        const title = videoInfo.title || "";
        const keywords = [];
        
        // 한글 키워드 매칭
        const koreanKeywords = [
            '브이로그', '일상', '요리', '레시피', '여행',
            '게임', '음악', '운동', '영화', '리뷰',
            'ASMR', '반려동물', '뷰티', '과학', '역사'
        ];
        
        for (const keyword of koreanKeywords) {
            if (title.includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        // 최소 1개 보장
        if (keywords.length === 0) {
            keywords.push('일반');
        }
        
        return keywords;
    }
}

module.exports = PersonaChecker;

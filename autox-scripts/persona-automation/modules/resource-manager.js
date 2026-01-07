/**
 * Resource Manager
 * 리소스 관리 (파일, 메모리, Lock)
 * 
 * @author Axon (Builder)
 */

class ResourceManager {
    constructor(logger) {
        this.logger = logger;
        
        // Execution Lock
        this.isExecutingCommand = false;
        this.isExplo

ring = false;
        
        // File cleanup
        this.screenshotDir = '/sdcard/DoAi/screenshots/';
        this.maxScreenshots = 100;  // 최대 100장 유지
    }

    /**
     * Command 실행 Lock 획득
     */
    acquireCommandLock() {
        if (this.isExecutingCommand) {
            this.logger.warn('⚠️  이미 지시 실행 중, 스킵');
            return false;
        }
        
        this.isExecutingCommand = true;
        this.logger.debug('🔒 Command Lock 획득');
        return true;
    }

    /**
     * Command 실행 Lock 해제
     */
    releaseCommandLock() {
        this.isExecutingCommand = false;
        this.logger.debug('🔓 Command Lock 해제');
    }

    /**
     * Exploration Lock 획득
     */
    acquireExplorationLock() {
        if (this.isExploring) {
            return false;
        }
        
        this.isExploring = true;
        return true;
    }

    /**
     * Exploration Lock 해제
     */
    releaseExplorationLock() {
        this.isExploring = false;
    }

    /**
     * 스크린샷 파일 정리
     * 
     * 오래된 파일 자동 삭제
     */
    cleanupScreenshots() {
        try {
            // files 객체 및 필수 메서드 존재 여부 확인
            if (typeof files === 'undefined' ||
                typeof files.listDir !== 'function' ||
                typeof files.remove !== 'function') {
                this.logger.error('스크린샷 정리 실패: files 객체 또는 메서드가 정의되어 있지 않습니다.');
                return;
            }

            // 디렉토리 파일 목록
            const screenshotFiles = files.listDir(this.screenshotDir);
            
            if (!screenshotFiles || screenshotFiles.length === 0) {
                return;
            }
            
            // 파일 수 초과 시 오래된 것부터 삭제
            if (screenshotFiles.length > this.maxScreenshots) {
                this.logger.info('🗑️  스크린샷 정리', {
                    current: screenshotFiles.length,
                    max: this.maxScreenshots
                });
                
                // 날짜 기준 정렬
                screenshotFiles.sort();
                
                const deleteCount = screenshotFiles.length - this.maxScreenshots;
                for (let i = 0; i < deleteCount; i++) {
                    const filePath = this.screenshotDir + screenshotFiles[i];
                    files.remove(filePath);
                }
                
                this.logger.info('✅ 스크린샷 정리 완료', {
                    deleted: deleteCount
                });
            }
        } catch (e) {
            this.logger.error('스크린샷 정리 실패', { error: e.message });
        }
    }

    /**
     * 주기적 정리 시작
     */
    startPeriodicCleanup() {
        this.logger.info('🧹 주기적 정리 시작 (1시간마다)');
        
        const interval = setInterval(() => {
            this.cleanupScreenshots();
        }, 3600000);  // 1시간
        
        return () => clearInterval(interval);
    }
}

module.exports = ResourceManager;

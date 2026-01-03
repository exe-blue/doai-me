/**
 * Error Handler
 * 우아한 에러 처리 및 재시도
 * 
 * @author Axon (Builder)
 */

class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        
        // 에러 카운터
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 10;
        
        // Circuit Breaker
        this.circuitState = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.failureThreshold = 5;
        this.openDuration = 600000;  // 10분
        this.lastFailureTime = 0;
    }

    /**
     * 재시도 가능 함수 래퍼
     * 
     * @param fn - 실행할 함수
     * @param maxRetries - 최대 재시도 (기본 3)
     * @param delay - 재시도 간격 (기본 1000ms)
     */
    async withRetry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await fn();
                
                // 성공 시 에러 카운터 리셋
                this.consecutiveErrors = 0;
                return result;
                
            } catch (e) {
                lastError = e;
                this.consecutiveErrors++;
                
                this.logger.warn(`⚠️  재시도 ${attempt}/${maxRetries}`, {
                    error: e.message,
                    consecutiveErrors: this.consecutiveErrors
                });
                
                if (attempt < maxRetries) {
                    sleep(delay * attempt);  // Exponential backoff
                }
            }
        }
        
        // 모든 재시도 실패
        this.logger.error('❌ 재시도 실패', {
            attempts: maxRetries,
            error: lastError.message
        });
        
        throw lastError;
    }

    /**
     * Circuit Breaker로 보호
     */
    async withCircuitBreaker(fn, name = 'unknown') {
        // Circuit이 OPEN이면 즉시 실패
        if (this.circuitState === 'OPEN') {
            const elapsed = Date.now() - this.lastFailureTime;
            
            if (elapsed < this.openDuration) {
                throw new Error(`Circuit OPEN: ${name} (${Math.floor((this.openDuration - elapsed) / 1000)}초 후 재시도)`);
            } else {
                // Half-Open으로 전환
                this.circuitState = 'HALF_OPEN';
                this.logger.info('🔄 Circuit HALF_OPEN', { name });
            }
        }
        
        try {
            const result = await fn();
            
            // 성공 시
            if (this.circuitState === 'HALF_OPEN') {
                this.circuitState = 'CLOSED';
                this.failureCount = 0;
                this.logger.info('✅ Circuit CLOSED', { name });
            }
            
            return result;
            
        } catch (e) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            
            this.logger.error('❌ Circuit 실패', {
                name,
                failureCount: this.failureCount,
                threshold: this.failureThreshold
            });
            
            // Threshold 초과 시 OPEN
            if (this.failureCount >= this.failureThreshold) {
                this.circuitState = 'OPEN';
                this.logger.error('🚨 Circuit OPEN', {
                    name,
                    duration: `${this.openDuration / 1000}초`
                });
            }
            
            throw e;
        }
    }

    /**
     * 연속 에러 체크 (종료 판단)
     */
    shouldTerminate() {
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            this.logger.error('🛑 연속 에러 초과, 종료 필요', {
                consecutiveErrors: this.consecutiveErrors,
                maxAllowed: this.maxConsecutiveErrors
            });
            return true;
        }
        return false;
    }

    /**
     * 에러 리셋
     */
    reset() {
        this.consecutiveErrors = 0;
        this.failureCount = 0;
        this.circuitState = 'CLOSED';
        this.logger.info('🔄 에러 핸들러 리셋');
    }
}

module.exports = ErrorHandler;

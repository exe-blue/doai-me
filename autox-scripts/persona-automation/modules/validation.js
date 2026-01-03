/**
 * Input Validation
 * 비합리적 입력 방지
 * 
 * @author Axon (Builder)
 */

class Validator {
    /**
     * 변수 파일 검증
     */
    static validateVariables(variables) {
        const errors = [];
        
        // 1. behavior 검증
        if (variables.behavior) {
            const b = variables.behavior;
            
            // 확률 범위 (0-1)
            if (b.commentProbability < 0 || b.commentProbability > 1) {
                errors.push('commentProbability는 0-1 사이여야 함');
                b.commentProbability = Math.max(0, Math.min(1, b.commentProbability));
            }
            
            if (b.likeProbability < 0 || b.likeProbability > 1) {
                errors.push('likeProbability는 0-1 사이여야 함');
                b.likeProbability = Math.max(0, Math.min(1, b.likeProbability));
            }
            
            // 시청 시간 범위 (10-600초)
            if (b.minWatchDuration < 10 || b.minWatchDuration > 600) {
                errors.push('minWatchDuration은 10-600초 사이여야 함');
                b.minWatchDuration = Math.max(10, Math.min(600, b.minWatchDuration));
            }
            
            if (b.maxWatchDuration < b.minWatchDuration || b.maxWatchDuration > 600) {
                errors.push('maxWatchDuration은 minWatchDuration보다 크고 600초 이하여야 함');
                b.maxWatchDuration = Math.max(b.minWatchDuration, Math.min(600, b.maxWatchDuration));
            }
        }
        
        // 2. timing 검증
        if (variables.timing) {
            const t = variables.timing;
            
            // 슬립 범위 (5초-10분)
            if (t.minSleepMs < 5000 || t.minSleepMs > 600000) {
                errors.push('minSleepMs는 5000-600000ms 사이여야 함');
                t.minSleepMs = Math.max(5000, Math.min(600000, t.minSleepMs));
            }
            
            if (t.maxSleepMs < t.minSleepMs || t.maxSleepMs > 600000) {
                errors.push('maxSleepMs는 minSleepMs보다 크고 600000ms 이하여야 함');
                t.maxSleepMs = Math.max(t.minSleepMs, Math.min(600000, t.maxSleepMs));
            }
        }
        
        // 3. openai 검증
        if (variables.openai) {
            const o = variables.openai;
            
            // 토큰 범위 (10-1000)
            if (o.maxTokens < 10 || o.maxTokens > 1000) {
                errors.push('maxTokens는 10-1000 사이여야 함');
                o.maxTokens = Math.max(10, Math.min(1000, o.maxTokens));
            }
            
            // 온도 범위 (0-2)
            if (o.temperature < 0 || o.temperature > 2) {
                errors.push('temperature는 0-2 사이여야 함');
                o.temperature = Math.max(0, Math.min(2, o.temperature));
            }
        }
        
        // 4. exploration 검증
        if (variables.exploration) {
            const e = variables.exploration;
            
            // 키워드 풀 비어있으면 기본값
            if (!e.keywordPool || e.keywordPool.length === 0) {
                errors.push('keywordPool이 비어있음, 기본값 사용');
                e.keywordPool = ['일상', '영화', '음악'];
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            correctedVariables: variables
        };
    }

    /**
     * API 응답 검증
     */
    static validateApiResponse(response, expectedType) {
        if (response === null || response === undefined) {
            return { valid: false, error: 'Response is null or undefined' };
        }
        
        if (expectedType === 'array' && !Array.isArray(response)) {
            return { valid: false, error: 'Expected array, got ' + typeof response };
        }
        
        if (expectedType === 'object' && typeof response !== 'object') {
            return { valid: false, error: 'Expected object, got ' + typeof response };
        }
        
        return { valid: true };
    }

    /**
     * 디바이스 Serial 검증
     */
    static validateDeviceSerial(serial) {
        if (!serial || typeof serial !== 'string') {
            return { valid: false, error: 'Device serial is invalid' };
        }
        
        if (serial.length < 3 || serial.length > 50) {
            return { valid: false, error: 'Device serial length must be 3-50' };
        }
        
        return { valid: true };
    }
}

module.exports = Validator;

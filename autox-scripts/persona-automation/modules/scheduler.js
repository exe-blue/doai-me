/**
 * Scheduler
 * 24시간 행동 패턴 스케줄러
 * 
 * @author Axon (Builder)
 */

class Scheduler {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * 현재 시간대 행동 강도
     * 
     * Peak Hours: 높은 활동
     * Off Hours: 낮은 활동
     */
    getActivityLevel() {
        const currentHour = new Date().getHours();
        const peakHours = this.config.schedule?.peakHours || [10, 14, 20];
        
        // Peak Hour 체크
        const isPeak = peakHours.some(hour => 
            Math.abs(currentHour - hour) <= 1
        );
        
        if (isPeak) {
            return 'HIGH';  // 높은 활동
        } else if (currentHour >= 0 && currentHour < 6) {
            return 'LOW';   // 새벽 (낮은 활동)
        } else {
            return 'NORMAL'; // 일반
        }
    }

    /**
     * 활동 레벨에 따른 슬립 시간
     */
    getSleepDuration() {
        const level = this.getActivityLevel();
        const variables = JSON.parse(files.read('./config/variables.json'));
        
        const min = variables.timing.minSleepMs;
        const max = variables.timing.maxSleepMs;
        
        let duration;
        
        switch (level) {
            case 'HIGH':
                // 짧은 슬립 (5-30초)
                duration = Math.floor(Math.random() * 25000) + 5000;
                break;
            case 'LOW':
                // 긴 슬립 (30-100초)
                duration = Math.floor(Math.random() * 70000) + 30000;
                break;
            default:
                // 일반 슬립 (5-100초)
                duration = Math.floor(Math.random() * (max - min)) + min;
        }
        
        return duration;
    }

    /**
     * 활동 레벨에 따른 확률 조정
     */
    adjustProbabilities(baseProbability) {
        const level = this.getActivityLevel();
        
        switch (level) {
            case 'HIGH':
                return baseProbability * 1.2;  // 20% 증가
            case 'LOW':
                return baseProbability * 0.5;  // 50% 감소
            default:
                return baseProbability;
        }
    }
}

module.exports = Scheduler;

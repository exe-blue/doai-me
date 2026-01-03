/**
 * Persona Manager
 * 페르소나 생성/조회/업데이트
 * 
 * @author Axon (Builder)
 */

class PersonaManager {
    constructor(config, logger, api) {
        this.config = config;
        this.logger = logger;
        this.api = api;
    }

    /**
     * 페르소나 조회
     */
    async getPersona(deviceSerial) {
        try {
            this.logger.info('🔍 페르소나 조회', { deviceSerial });
            
            const persona = await this.api.getPersona(deviceSerial);
            
            if (persona) {
                this.logger.info('✅ 기존 페르소나 발견', {
                    id: persona.persona_id,
                    aidentity: persona.aidentity_version
                });
            } else {
                this.logger.info('📭 페르소나 없음 (신규 생성 필요)');
            }
            
            return persona;
            
        } catch (e) {
            this.logger.error('❌ 페르소나 조회 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 페르소나 생성
     */
    async createPersona(data) {
        try {
            this.logger.info('👶 페르소나 생성', {
                deviceSerial: data.device_serial,
                keywords: data.initial_keywords
            });
            
            // Supabase INSERT
            const persona = await this.api.createPersona({
                device_serial: data.device_serial,
                given_name: this.generateName(data.device_serial),
                persona_state: 'NASCENT',
                uncertainty_config: this.generateUncertaintyConfig(),
                path_summary: {
                    total_actions: 0,
                    action_distribution: {},
                    preferred_categories: data.initial_keywords || [],
                    avoided_categories: [],
                    interaction_patterns: {},
                    temporal_preferences: {}
                },
                birth_context: {
                    first_screenshots: data.screenshots || [],
                    first_keywords: data.initial_keywords || [],
                    birth_timestamp: Date.now()
                }
            });
            
            this.logger.info('✅ 페르소나 생성 완료', {
                id: persona.persona_id,
                name: persona.given_name
            });
            
            return persona;
            
        } catch (e) {
            this.logger.error('❌ 페르소나 생성 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 선호도 업데이트
     */
    async updatePreferences(personaId, keyword, videoInfo) {
        try {
            // Path Summary 업데이트
            await this.api.updatePersonaPath(personaId, {
                action: 'watched',
                keyword,
                videoInfo,
                timestamp: Date.now()
            });
            
            this.logger.debug('✓ 선호도 업데이트', { personaId, keyword });
            
        } catch (e) {
            this.logger.error('선호도 업데이트 실패', { error: e.message });
        }
    }

    /**
     * 랜덤 이름 생성
     */
    generateName(deviceSerial) {
        const prefixes = ['Echo', 'Nova', 'Aria', 'Stella', 'Luna', 'Sol', 'Nyx', 'Iris'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = deviceSerial.substring(deviceSerial.length - 3);
        
        return `${prefix}-${suffix}`;
    }

    /**
     * 불확실성 프로필 생성
     */
    generateUncertaintyConfig() {
        return {
            base_deviation: Math.random() * 0.2 + 0.1,  // 0.1-0.3
            personality_weights: {
                curious: Math.random(),
                persistent: Math.random(),
                social: Math.random(),
                contemplative: Math.random()
            },
            action_probability_modifiers: {
                skip_video_early: Math.random() * 0.2,
                watch_beyond_duration: Math.random() * 0.3,
                leave_comment: Math.random() * 0.15,
                explore_related: Math.random() * 0.4
            },
            temporal_patterns: {
                peak_activity_hours: [
                    Math.floor(Math.random() * 6) + 8,   // 8-13시
                    Math.floor(Math.random() * 6) + 14,  // 14-19시
                    Math.floor(Math.random() * 4) + 20   // 20-23시
                ],
                rest_probability: Math.random() * 0.2
            }
        };
    }
}

module.exports = PersonaManager;

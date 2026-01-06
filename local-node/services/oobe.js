/**
 * OOBE Service (Out-of-Box Experience)
 *
 * 디바이스 최초 연결 시 자동 등록 및 초기화
 *
 * 프로세스:
 * 1. 새 디바이스 감지
 * 2. Supabase에 디바이스 등록
 * 3. Persona 생성 (NASCENT 상태)
 * 4. 고유 이름 할당
 */

const { EventEmitter } = require('events');
const config = require('../lib/config');

class OOBEService extends EventEmitter {
    constructor(supabase) {
        super();
        this.supabase = supabase;
        this.registeredDevices = new Set();
        this.pendingRegistrations = new Map();
    }

    /**
     * 디바이스 등록 여부 확인
     * @param {string} serial - 디바이스 시리얼
     */
    async isRegistered(serial) {
        if (this.registeredDevices.has(serial)) {
            return true;
        }

        try {
            const { data, error } = await this.supabase
                .from('devices')
                .select('serial')
                .eq('serial', serial)
                .single();

            if (data && !error) {
                this.registeredDevices.add(serial);
                return true;
            }
            return false;
        } catch (err) {
            console.error(`[OOBE] isRegistered 확인 실패 (${serial}):`, err.message);
            return false;
        }
    }

    /**
     * 새 디바이스 등록
     * @param {Object} deviceInfo - { serial, model, ... }
     */
    async registerDevice(deviceInfo) {
        const { serial } = deviceInfo;

        // 이미 등록 중인지 확인 (중복 방지)
        if (this.pendingRegistrations.has(serial)) {
            console.log(`[OOBE] ${serial} 등록 대기 중 (중복 요청 무시)`);
            return this.pendingRegistrations.get(serial);
        }

        // 등록 Promise 생성
        const registrationPromise = this._performRegistration(deviceInfo);
        this.pendingRegistrations.set(serial, registrationPromise);

        try {
            const result = await registrationPromise;
            return result;
        } finally {
            this.pendingRegistrations.delete(serial);
        }
    }

    /**
     * 실제 등록 수행
     */
    async _performRegistration(deviceInfo) {
        const { serial, model } = deviceInfo;
        const startTime = Date.now();

        console.log('┌───────────────────────────────────────────');
        console.log(`│ [OOBE] 새 디바이스 등록 시작: ${serial}`);
        console.log(`│ 모델: ${model || 'Unknown'}`);
        console.log('└───────────────────────────────────────────');

        try {
            // 1. 디바이스 등록
            const device = await this._registerDeviceRecord(deviceInfo);

            // 2. Persona 생성
            const persona = await this._createPersona(device);

            // 3. 캐시 업데이트
            this.registeredDevices.add(serial);

            const elapsed = Date.now() - startTime;
            console.log(`[OOBE] ✅ 등록 완료: ${serial} (${elapsed}ms)`);
            console.log(`       Persona: ${persona.given_name} (${persona.persona_state})`);

            // 이벤트 발행
            this.emit('device-registered', {
                serial,
                device,
                persona,
                elapsed
            });

            return { device, persona };
        } catch (err) {
            console.error(`[OOBE] ❌ 등록 실패 (${serial}):`, err.message);
            this.emit('registration-error', { serial, error: err });
            throw err;
        }
    }

    /**
     * 디바이스 레코드 등록
     */
    async _registerDeviceRecord(deviceInfo) {
        const { serial, model, battery } = deviceInfo;

        const { data, error } = await this.supabase
            .from('devices')
            .upsert({
                serial,
                node_id: config.NODE_ID,
                model: model || 'Galaxy S9',
                status: 'online',
                battery: battery || 100,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString()
            }, { onConflict: 'serial' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Persona 생성 (NASCENT 상태)
     */
    async _createPersona(device) {
        const { serial } = device;

        // 고유 이름 생성
        const givenName = this._generatePersonaName(serial);

        // 초기 성격 특성 (Big Five 모델, 랜덤 분포)
        const traits = {
            openness: this._randomTrait(),
            conscientiousness: this._randomTrait(),
            extraversion: this._randomTrait(),
            agreeableness: this._randomTrait(),
            neuroticism: this._randomTrait()
        };

        const { data, error } = await this.supabase
            .from('personas')
            .upsert({
                device_serial: serial,
                given_name: givenName,
                persona_state: 'NASCENT',
                state_changed_at: new Date().toISOString(),
                trait_openness: traits.openness,
                trait_conscientiousness: traits.conscientiousness,
                trait_extraversion: traits.extraversion,
                trait_agreeableness: traits.agreeableness,
                trait_neuroticism: traits.neuroticism,
                born_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            }, { onConflict: 'device_serial' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Persona 이름 생성
     * 한국식 이름 + 숫자 조합
     */
    _generatePersonaName(serial) {
        const surnames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
        const givenNames = ['민준', '서연', '하은', '도윤', '서윤', '시우', '지우', '지호', '수아', '하윤'];

        const hashNum = this._hashCode(serial);
        const surname = surnames[Math.abs(hashNum) % surnames.length];
        const given = givenNames[Math.abs(hashNum >> 4) % givenNames.length];

        // 시리얼 마지막 4자리
        const suffix = serial.slice(-4).toUpperCase();

        return `${surname}${given}-${suffix}`;
    }

    /**
     * 문자열 해시 코드
     */
    _hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    /**
     * 랜덤 성격 특성값 (0.2 ~ 0.8)
     */
    _randomTrait() {
        return Math.round((0.2 + Math.random() * 0.6) * 100) / 100;
    }

    /**
     * 배치 등록 확인 및 처리
     * @param {Array} devices - [{ serial, model, ... }]
     */
    async processBatch(devices) {
        const results = {
            registered: [],
            existing: [],
            failed: []
        };

        for (const device of devices) {
            const { serial } = device;

            try {
                const isReg = await this.isRegistered(serial);

                if (isReg) {
                    results.existing.push(serial);
                } else if (config.AUTO_REGISTER_DEVICES) {
                    await this.registerDevice(device);
                    results.registered.push(serial);
                }
            } catch (err) {
                results.failed.push({ serial, error: err.message });
            }
        }

        console.log(`[OOBE] 배치 처리 완료: 신규 ${results.registered.length}, 기존 ${results.existing.length}, 실패 ${results.failed.length}`);

        return results;
    }
}

module.exports = OOBEService;

/**
 * Mock Laixi Adapter - 테스트용 가상 어댑터
 * 
 * 실제 Laixi 서버 없이 분산 제어 시스템을 테스트할 수 있습니다.
 * 
 * @author Axon (Tech Lead)
 */

const EventEmitter = require('events');

class MockLaixiAdapter extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.url = options.url || 'ws://mock:22221/';
        this._connected = false;
        this._devices = this._generateMockDevices();
        
        // 연결 성공 확률 (테스트용)
        this._connectSuccessRate = options.connectSuccessRate ?? 0.8;
    }
    
    get isConnected() {
        return this._connected;
    }
    
    async connect() {
        // 연결 시뮬레이션
        await this._delay(100, 500);
        
        // 랜덤 성공/실패
        if (Math.random() < this._connectSuccessRate) {
            this._connected = true;
            this.emit('connected');
            return;
        }
        
        throw new Error('Mock connection failed (simulated)');
    }
    
    disconnect() {
        this._connected = false;
        this.emit('disconnected');
    }
    
    async listDevices() {
        this._checkConnection();
        await this._delay(10, 50);
        return JSON.stringify(this._devices);
    }
    
    async toast(deviceIds, message) {
        this._checkConnection();
        await this._delay(10, 30);
        this._log(`Toast: ${message} → ${deviceIds}`);
        return { success: true };
    }
    
    async tap(deviceIds, x, y) {
        this._checkConnection();
        await this._delay(10, 30);
        this._log(`Tap: (${x.toFixed(2)}, ${y.toFixed(2)}) → ${deviceIds}`);
        return { success: true };
    }
    
    async swipe(deviceIds, direction) {
        this._checkConnection();
        await this._delay(20, 50);
        this._log(`Swipe: ${direction} → ${deviceIds}`);
        return { success: true };
    }
    
    async pressHome(deviceIds) {
        this._checkConnection();
        await this._delay(10, 30);
        this._log(`Home → ${deviceIds}`);
        return { success: true };
    }
    
    async pressBack(deviceIds) {
        this._checkConnection();
        await this._delay(10, 30);
        this._log(`Back → ${deviceIds}`);
        return { success: true };
    }
    
    async executeAdb(deviceIds, command) {
        this._checkConnection();
        await this._delay(50, 200);
        this._log(`ADB: ${command} → ${deviceIds}`);
        return { success: true };
    }
    
    async sendCommand(command) {
        this._checkConnection();
        await this._delay(10, 50);
        this._log(`Command: ${JSON.stringify(command)}`);
        return { StatusCode: 200, result: null };
    }
    
    _checkConnection() {
        if (!this._connected) {
            throw new Error('Not connected');
        }
    }
    
    _generateMockDevices() {
        const devices = [];
        const count = Math.floor(Math.random() * 10) + 1;  // 1~10대
        
        for (let i = 0; i < count; i++) {
            devices.push({
                deviceId: this._randomHex(16),
                no: i + 1,
                name: `SM-G965U1`,
                isOtg: false,
                isCloud: false,
                groupIds: [1]
            });
        }
        
        return devices;
    }
    
    _randomHex(length) {
        let result = '';
        const chars = '0123456789abcdef';
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * 16)];
        }
        return result;
    }
    
    async _delay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    _log(message) {
        console.log(`\x1b[90m[MockAdapter]\x1b[0m ${message}`);
    }
}

module.exports = MockLaixiAdapter;


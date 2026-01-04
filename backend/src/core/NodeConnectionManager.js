/**
 * Node Connection Manager - Self-Healing Connection Pool
 * 
 * 10개 워크스테이션에 대한 WebSocket 연결을 관리합니다.
 * - 서버 시작 시 nodes 테이블에서 목록 조회
 * - 각 노드에 WebSocket 연결 (Laixi)
 * - 연결 실패 시 exponential backoff로 재시도
 * - 상태를 DB에 실시간 업데이트
 * 
 * @author Axon (Tech Lead)
 * @version 2.0.0
 */

const EventEmitter = require('events');
const WebSocket = require('ws');

/**
 * 연결 상태 상수
 */
const CONNECTION_STATE = {
    OFFLINE: 'offline',
    CONNECTING: 'connecting',
    ONLINE: 'online',
    ERROR: 'error',
    RECONNECTING: 'reconnecting'
};

/**
 * 기본 설정
 */
const DEFAULT_CONFIG = {
    // 재연결 설정
    reconnectBaseDelay: 1000,           // 기본 재연결 딜레이 (1초)
    reconnectMaxDelay: 30000,           // 최대 재연결 딜레이 (30초)
    reconnectMaxAttempts: Infinity,     // 무한 재시도 (Self-Healing)
    
    // 하트비트 설정
    heartbeatInterval: 15000,           // 15초마다 하트비트
    heartbeatTimeout: 5000,             // 하트비트 응답 타임아웃
    
    // 연결 설정
    connectionTimeout: 10000,           // 연결 타임아웃
    
    // 동시 연결 제한
    maxConcurrentConnections: 5         // 동시에 연결 시도하는 노드 수
};

/**
 * 개별 노드 연결 상태
 */
class NodeConnection extends EventEmitter {
    constructor(node, adapter, dbClient) {
        super();
        
        this.node = node;
        this.adapter = adapter;
        this.dbClient = dbClient;
        
        this.state = CONNECTION_STATE.OFFLINE;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.devices = new Map();       // deviceId -> device info
        
        this._lastHeartbeat = null;
        this._lastError = null;
    }
    
    get isConnected() {
        return this.state === CONNECTION_STATE.ONLINE;
    }
    
    get nodeId() {
        return this.node.id;
    }
    
    get nodeName() {
        return this.node.name;
    }
    
    /**
     * 노드에 연결
     */
    async connect() {
        if (this.state === CONNECTION_STATE.CONNECTING) {
            return;
        }
        
        this.state = CONNECTION_STATE.CONNECTING;
        await this._updateDbStatus();
        
        this._log('연결 시도...');
        
        try {
            // Laixi Adapter 연결
            await this.adapter.connect();
            
            this.state = CONNECTION_STATE.ONLINE;
            this.reconnectAttempts = 0;
            this._lastHeartbeat = new Date();
            
            await this._updateDbStatus();
            await this._syncDevices();
            this._startHeartbeat();
            
            this._log('✅ 연결 성공');
            this.emit('connected', this.node);
            
        } catch (err) {
            this.state = CONNECTION_STATE.ERROR;
            this._lastError = err.message;
            
            await this._updateDbStatus();
            this._log(`❌ 연결 실패: ${err.message}`);
            
            this._scheduleReconnect();
        }
    }
    
    /**
     * 연결 해제
     */
    async disconnect() {
        this._stopHeartbeat();
        this._cancelReconnect();
        
        if (this.adapter.isConnected) {
            this.adapter.disconnect();
        }
        
        this.state = CONNECTION_STATE.OFFLINE;
        await this._updateDbStatus();
        
        this._log('연결 해제됨');
        this.emit('disconnected', this.node);
    }
    
    /**
     * 명령 전송
     */
    async sendCommand(command) {
        if (!this.isConnected) {
            throw new Error(`노드 ${this.nodeName}에 연결되어 있지 않음`);
        }
        
        return await this.adapter.sendCommand(command);
    }
    
    /**
     * 디바이스 동기화
     */
    async _syncDevices() {
        try {
            const response = await this.adapter.listDevices();
            let deviceList = [];
            
            if (typeof response === 'string') {
                try { deviceList = JSON.parse(response); } catch { deviceList = []; }
            } else if (Array.isArray(response)) {
                deviceList = response;
            }
            
            this.devices.clear();
            for (const device of deviceList) {
                this.devices.set(device.deviceId, device);
            }
            
            // DB 업데이트: 연결된 디바이스 수
            if (this.dbClient) {
                await this.dbClient.query(
                    'UPDATE nodes SET connected_devices = $1, updated_at = NOW() WHERE id = $2',
                    [this.devices.size, this.nodeId]
                );
            }
            
            this._log(`디바이스 동기화: ${this.devices.size}대`);
            this.emit('devices_synced', { nodeId: this.nodeId, devices: deviceList });
            
        } catch (err) {
            this._log(`디바이스 동기화 실패: ${err.message}`, 'warn');
        }
    }
    
    /**
     * 하트비트 시작
     */
    _startHeartbeat() {
        this._stopHeartbeat();
        
        this.heartbeatTimer = setInterval(async () => {
            try {
                await this.adapter.listDevices();
                this._lastHeartbeat = new Date();
                
                if (this.dbClient) {
                    await this.dbClient.query(
                        'UPDATE nodes SET last_heartbeat = NOW(), status = $1 WHERE id = $2',
                        [CONNECTION_STATE.ONLINE, this.nodeId]
                    );
                }
                
                this.emit('heartbeat', { nodeId: this.nodeId, timestamp: this._lastHeartbeat });
                
            } catch (err) {
                this._log(`하트비트 실패: ${err.message}`, 'warn');
                this._lastError = err.message;
                
                // 연결 끊김 감지
                if (this.state === CONNECTION_STATE.ONLINE) {
                    this.state = CONNECTION_STATE.ERROR;
                    await this._updateDbStatus();
                    this._scheduleReconnect();
                }
            }
        }, DEFAULT_CONFIG.heartbeatInterval);
    }
    
    /**
     * 하트비트 중지
     */
    _stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * 재연결 스케줄링 (Exponential Backoff)
     */
    _scheduleReconnect() {
        this._cancelReconnect();
        
        if (this.reconnectAttempts >= DEFAULT_CONFIG.reconnectMaxAttempts) {
            this._log('최대 재연결 시도 횟수 초과', 'error');
            return;
        }
        
        // Exponential backoff with jitter
        const baseDelay = DEFAULT_CONFIG.reconnectBaseDelay;
        const maxDelay = DEFAULT_CONFIG.reconnectMaxDelay;
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
        const jitter = exponentialDelay * 0.2 * Math.random();  // 20% jitter
        const delay = Math.round(exponentialDelay + jitter);
        
        this.reconnectAttempts++;
        this.state = CONNECTION_STATE.RECONNECTING;
        
        this._log(`재연결 예약: ${delay}ms 후 (시도 ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(async () => {
            await this.connect();
        }, delay);
    }
    
    /**
     * 재연결 취소
     */
    _cancelReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    
    /**
     * DB 상태 업데이트
     */
    async _updateDbStatus() {
        if (!this.dbClient) return;
        
        try {
            await this.dbClient.query(
                `UPDATE nodes SET 
                    status = $1, 
                    last_error = $2,
                    updated_at = NOW()
                 WHERE id = $3`,
                [this.state, this._lastError, this.nodeId]
            );
        } catch (err) {
            this._log(`DB 업데이트 실패: ${err.message}`, 'error');
        }
    }
    
    /**
     * 로깅
     */
    _log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[${this.nodeName}]`;
        
        const colors = {
            info: '\x1b[34m',
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };
        
        console.log(`\x1b[36m${timestamp}\x1b[0m ${colors[level] || ''}${prefix}\x1b[0m ${message}`);
    }
}

/**
 * Node Connection Manager - 전체 노드 풀 관리
 */
class NodeConnectionManager extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.dbClient - PostgreSQL 클라이언트 (pg.Pool)
     * @param {Function} options.createAdapter - Laixi 어댑터 생성 함수
     * @param {Object} options.config - 설정 오버라이드
     */
    constructor(options = {}) {
        super();
        
        // createAdapter 필수 검증 - 없으면 start()에서 런타임 오류 발생
        if (!options.createAdapter || typeof options.createAdapter !== 'function') {
            throw new TypeError('createAdapter must be a function');
        }
        
        this.dbClient = options.dbClient || null;
        this.createAdapter = options.createAdapter;
        this.config = { ...DEFAULT_CONFIG, ...options.config };
        
        this.nodes = new Map();         // nodeId -> NodeConnection
        this._started = false;
    }
    
    /**
     * 연결 풀 시작
     */
    async start() {
        if (this._started) {
            this._log('이미 시작됨');
            return;
        }
        
        this._log('Node Connection Manager 시작...');
        
        // 1. DB에서 노드 목록 조회
        const nodeList = await this._loadNodesFromDb();
        this._log(`노드 목록 로드: ${nodeList.length}개`);
        
        // 2. 각 노드에 대한 연결 객체 생성
        for (const node of nodeList) {
            const adapter = this.createAdapter({
                url: `ws://${node.host}:${node.port}/`,
                heartbeatInterval: this.config.heartbeatInterval,
                timeout: this.config.connectionTimeout
            });
            
            const connection = new NodeConnection(node, adapter, this.dbClient);
            
            // 이벤트 전파
            connection.on('connected', (n) => this.emit('node:connected', n));
            connection.on('disconnected', (n) => this.emit('node:disconnected', n));
            connection.on('heartbeat', (data) => this.emit('node:heartbeat', data));
            connection.on('devices_synced', (data) => this.emit('devices:synced', data));
            
            this.nodes.set(node.id, connection);
        }
        
        // 3. 동시 연결 제어 (maxConcurrentConnections씩 연결)
        await this._connectAllNodes();
        
        this._started = true;
        this._log('✅ Node Connection Manager 시작 완료');
        
        this.emit('started', { nodeCount: this.nodes.size });
    }
    
    /**
     * 연결 풀 중지
     */
    async stop() {
        this._log('Node Connection Manager 중지...');
        
        const disconnectPromises = [];
        for (const connection of this.nodes.values()) {
            disconnectPromises.push(connection.disconnect());
        }
        
        await Promise.all(disconnectPromises);
        
        this.nodes.clear();
        this._started = false;
        
        this._log('Node Connection Manager 중지됨');
        this.emit('stopped');
    }
    
    /**
     * 특정 노드 연결 가져오기
     */
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    
    /**
     * 온라인 노드 목록
     */
    getOnlineNodes() {
        return Array.from(this.nodes.values()).filter(n => n.isConnected);
    }
    
    /**
     * 특정 디바이스가 연결된 노드 찾기
     */
    findNodeForDevice(deviceId) {
        for (const connection of this.nodes.values()) {
            if (connection.devices.has(deviceId)) {
                return connection;
            }
        }
        return null;
    }
    
    /**
     * 최적 노드 선택 (로드 밸런싱)
     */
    selectOptimalNode() {
        const onlineNodes = this.getOnlineNodes();
        
        if (onlineNodes.length === 0) {
            return null;
        }
        
        // 가장 적게 사용 중인 노드 선택
        return onlineNodes.reduce((best, current) => {
            const bestLoad = best.devices.size / (best.node.device_capacity || 60);
            const currentLoad = current.devices.size / (current.node.device_capacity || 60);
            return currentLoad < bestLoad ? current : best;
        });
    }
    
    /**
     * 상태 요약
     */
    getStatus() {
        const nodeStats = {
            total: this.nodes.size,
            online: 0,
            offline: 0,
            connecting: 0,
            error: 0
        };
        
        let totalDevices = 0;
        
        for (const connection of this.nodes.values()) {
            nodeStats[connection.state] = (nodeStats[connection.state] || 0) + 1;
            totalDevices += connection.devices.size;
        }
        
        return {
            nodes: nodeStats,
            totalDevices,
            started: this._started
        };
    }
    
    /**
     * DB에서 노드 목록 조회
     */
    async _loadNodesFromDb() {
        if (!this.dbClient) {
            // 테스트용 더미 데이터
            return this._getDummyNodes();
        }
        
        try {
            const result = await this.dbClient.query(
                'SELECT id, name, host, port, device_capacity, metadata FROM nodes ORDER BY name'
            );
            
            // DB에 노드가 없으면 더미 데이터 사용
            if (!result.rows || result.rows.length === 0) {
                this._log('DB에 노드 없음, 더미 데이터 사용');
                return this._getDummyNodes();
            }
            
            return result.rows;
        } catch (err) {
            this._log(`DB 조회 실패: ${err.message}`, 'error');
            return this._getDummyNodes();
        }
    }
    
    /**
     * 테스트용 더미 노드 데이터
     */
    _getDummyNodes() {
        const nodes = [];
        for (let i = 1; i <= 10; i++) {
            nodes.push({
                id: `node-${i.toString().padStart(2, '0')}`,
                name: `WS-${i.toString().padStart(2, '0')}`,
                host: `192.168.50.${100 + i}`,
                port: 22221,
                device_capacity: 60
            });
        }
        return nodes;
    }
    
    /**
     * 모든 노드에 순차적으로 연결 (동시 제한 적용)
     */
    async _connectAllNodes() {
        const nodeConnections = Array.from(this.nodes.values());
        const maxConcurrent = this.config.maxConcurrentConnections;
        
        for (let i = 0; i < nodeConnections.length; i += maxConcurrent) {
            const batch = nodeConnections.slice(i, i + maxConcurrent);
            
            const connectPromises = batch.map(conn => 
                conn.connect().catch(err => {
                    this._log(`${conn.nodeName} 연결 실패: ${err.message}`, 'warn');
                })
            );
            
            await Promise.all(connectPromises);
            
            // 배치 간 짧은 딜레이
            if (i + maxConcurrent < nodeConnections.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    
    /**
     * 로깅
     */
    _log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = '[NodeManager]';
        
        const colors = {
            info: '\x1b[35m',   // 마젠타
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };
        
        console.log(`\x1b[36m${timestamp}\x1b[0m ${colors[level] || ''}${prefix}\x1b[0m ${message}`);
    }
}

module.exports = NodeConnectionManager;
module.exports.NodeConnection = NodeConnection;
module.exports.CONNECTION_STATE = CONNECTION_STATE;
module.exports.DEFAULT_CONFIG = DEFAULT_CONFIG;


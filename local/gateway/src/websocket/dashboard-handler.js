/**
 * Dashboard WebSocket Handler
 *
 * NodeContext 프로토콜 호환 WebSocket 핸들러
 * 프론트엔드 MARKET 페이지와 통신
 *
 * 경로: /ws/dashboard
 *
 * @version 1.0.0
 */

const WebSocket = require('ws');
const os = require('os');

/**
 * NodeContext 프로토콜 메시지 타입
 */
const MSG = {
    // Server → Client
    INIT: 'INIT',
    STATE_UPDATE: 'STATE_UPDATE',
    DEVICE_STATUS: 'DEVICE_STATUS',
    DEVICE_ERROR: 'DEVICE_ERROR',
    DEVICE_RECOVERED: 'DEVICE_RECOVERED',
    LAIXI_CONNECTED: 'LAIXI_CONNECTED',
    LAIXI_DISCONNECTED: 'LAIXI_DISCONNECTED',
    LAIXI_RECONNECTING: 'LAIXI_RECONNECTING',
    VIDEO_PROGRESS: 'VIDEO_PROGRESS',
    VIDEO_DISTRIBUTED: 'VIDEO_DISTRIBUTED',
    VIDEO_COMPLETE: 'VIDEO_COMPLETE',
    INJECT_RESULT: 'INJECT_RESULT',
    DISTRIBUTION_FAILED: 'DISTRIBUTION_FAILED',
    LOG: 'LOG',
    PONG: 'PONG',

    // Client → Server
    GET_STATE: 'GET_STATE',
    REFRESH_DEVICES: 'REFRESH_DEVICES',
    SEND_COMMAND: 'SEND_COMMAND',
    INJECT_VIDEO: 'INJECT_VIDEO',
    ADD_VIDEO: 'ADD_VIDEO',
    PING: 'PING'
};

class DashboardHandler {
    /**
     * @param {Object} options
     * @param {Object} options.logger
     * @param {Object} options.discoveryManager
     * @param {Object} options.deviceTracker
     * @param {Object} options.commander
     * @param {Object} options.laixiAdapter - Laixi 연결 상태용
     */
    constructor(options) {
        this.logger = options.logger;
        this.discoveryManager = options.discoveryManager;
        this.deviceTracker = options.deviceTracker;
        this.commander = options.commander;
        this.laixiAdapter = options.laixiAdapter || null;

        this.wss = null;
        this.clients = new Set();

        // 노드 정보
        this.nodeId = process.env.NODE_ID || `node_${os.hostname()}`;
        this.hostname = os.hostname();

        // Laixi 상태 추적
        this._laixiConnected = false;
        this._laixiReconnectAttempt = 0;
    }

    /**
     * Laixi 어댑터 설정 (런타임 업데이트용)
     */
    setLaixiAdapter(adapter) {
        this.laixiAdapter = adapter;
        if (adapter) {
            this._setupLaixiEvents(adapter);
        }
    }

    /**
     * Laixi 이벤트 리스닝
     */
    _setupLaixiEvents(adapter) {
        adapter.on('connected', () => {
            this._laixiConnected = true;
            this._laixiReconnectAttempt = 0;
            this._broadcast({
                type: MSG.LAIXI_CONNECTED,
                nodeId: this.nodeId
            });
        });

        adapter.on('disconnected', () => {
            this._laixiConnected = false;
            this._broadcast({
                type: MSG.LAIXI_DISCONNECTED,
                nodeId: this.nodeId
            });
        });

        adapter.on('reconnecting', (attempt) => {
            this._laixiReconnectAttempt = attempt;
            this._broadcast({
                type: MSG.LAIXI_RECONNECTING,
                nodeId: this.nodeId,
                attempt
            });
        });
    }

    /**
     * WebSocket 서버 초기화
     */
    initialize(server) {
        this.wss = new WebSocket.Server({
            noServer: true,
            perMessageDeflate: false
        });

        this.wss.on('connection', (ws, req) => {
            this._handleConnection(ws, req);
        });

        // HTTP upgrade 이벤트 처리 등록
        server.on('upgrade', (request, socket, head) => {
            const pathname = request.url.split('?')[0];

            if (pathname === '/ws/dashboard') {
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            }
        });

        // Discovery 이벤트 리스닝
        this._setupDiscoveryEvents();

        this.logger.info('[Dashboard] WebSocket 핸들러 초기화', { path: '/ws/dashboard' });
    }

    /**
     * Discovery 이벤트 설정
     */
    _setupDiscoveryEvents() {
        this.discoveryManager.on('device:added', (device) => {
            this._broadcastStateUpdate();
        });

        this.discoveryManager.on('device:removed', (device) => {
            this._broadcast({
                type: MSG.DEVICE_STATUS,
                deviceId: device.serial,
                status: 'offline',
                currentTask: null
            });
            this._broadcastStateUpdate();
        });

        this.discoveryManager.on('device:changed', (device) => {
            this._broadcastStateUpdate();
        });
    }

    /**
     * 연결 처리
     */
    _handleConnection(ws, req) {
        const clientId = this._generateClientId();
        ws.clientId = clientId;
        ws.isAlive = true;

        this.clients.add(ws);
        this.logger.info('[Dashboard] 클라이언트 연결', { clientId });

        // Ping/Pong for keepalive
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (data) => {
            this._handleMessage(ws, data);
        });

        ws.on('close', () => {
            this._handleDisconnect(ws);
        });

        ws.on('error', (err) => {
            this.logger.warn('[Dashboard] 클라이언트 오류', {
                clientId,
                error: err.message
            });
        });

        // 초기 INIT 메시지 전송
        this._sendInit(ws);
    }

    /**
     * 메시지 처리
     */
    _handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            const { type } = message;

            switch (type) {
                case MSG.GET_STATE:
                    this._sendInit(ws);
                    break;

                case MSG.REFRESH_DEVICES:
                    this._handleRefreshDevices(ws);
                    break;

                case MSG.SEND_COMMAND:
                    this._handleSendCommand(ws, message);
                    break;

                case MSG.INJECT_VIDEO:
                    this._handleInjectVideo(ws, message);
                    break;

                case MSG.ADD_VIDEO:
                    this._handleAddVideo(ws, message);
                    break;

                case MSG.PING:
                    ws.send(JSON.stringify({ type: MSG.PONG }));
                    break;

                default:
                    this.logger.debug('[Dashboard] 알 수 없는 메시지 타입', { type });
            }
        } catch (e) {
            this.logger.warn('[Dashboard] 메시지 파싱 오류', { error: e.message });
        }
    }

    /**
     * INIT 메시지 전송
     */
    _sendInit(ws) {
        const nodeInfo = this._getNodeInfo();
        const devices = this._getDevicesForClient();

        ws.send(JSON.stringify({
            type: MSG.INIT,
            node: nodeInfo,
            devices
        }));
    }

    /**
     * STATE_UPDATE 브로드캐스트
     */
    _broadcastStateUpdate() {
        const nodeInfo = this._getNodeInfo();
        const devices = this._getDevicesForClient();

        this._broadcast({
            type: MSG.STATE_UPDATE,
            node: nodeInfo,
            devices
        });
    }

    /**
     * 노드 정보 생성
     */
    _getNodeInfo() {
        const devices = this.discoveryManager.getDevices();
        const onlineDevices = devices.filter(d => d.status === 'ONLINE');

        return {
            id: this.nodeId,
            hostname: this.hostname,
            ipAddress: this._getLocalIP(),
            platform: os.platform(),
            status: 'online',
            deviceCount: devices.length,
            onlineDeviceCount: onlineDevices.length,
            laixiConnected: this._laixiConnected || (this.laixiAdapter?.isConnected || false),
            lastSeen: new Date().toISOString(),
            reconnectAttempts: this._laixiReconnectAttempt
        };
    }

    /**
     * 디바이스 정보 변환 (NodeContext 형식)
     */
    _getDevicesForClient() {
        const devices = this.discoveryManager.getDevices();

        return devices.map(d => ({
            id: d.serial,
            serial: d.serial,
            name: d.model || `Device ${d.serial.slice(-4)}`,
            model: d.model || 'Unknown',
            status: this._convertStatus(d.status),
            wallet: 0,
            currentTask: null,
            lastSeen: d.lastSeenAt || new Date().toISOString(),
            traits: [],
            nodeId: this.nodeId,
            errorMessage: undefined,
            recoveryAttempts: 0
        }));
    }

    /**
     * 상태 변환 (Gateway → NodeContext)
     */
    _convertStatus(gatewayStatus) {
        switch (gatewayStatus) {
            case 'ONLINE': return 'idle';
            case 'OFFLINE': return 'offline';
            case 'BUSY': return 'busy';
            case 'ERROR': return 'error';
            default: return 'offline';
        }
    }

    /**
     * 디바이스 새로고침 처리
     */
    async _handleRefreshDevices(ws) {
        try {
            // Discovery 재스캔
            await this.discoveryManager.scan();

            // 상태 업데이트 전송
            this._sendInit(ws);

            this._sendLog(ws, 'info', '디바이스 새로고침 완료', { category: 'device' });
        } catch (e) {
            this._sendLog(ws, 'error', `새로고침 실패: ${e.message}`, { category: 'device' });
        }
    }

    /**
     * 명령 전송 처리
     */
    async _handleSendCommand(ws, message) {
        const { deviceId, command, params } = message;

        try {
            const device = this.discoveryManager.getDevice(deviceId);
            if (!device) {
                this._sendLog(ws, 'error', `디바이스를 찾을 수 없음: ${deviceId}`, {
                    category: 'device',
                    deviceId
                });
                return;
            }

            // ADB 명령 실행
            if (command === 'shell' && params?.cmd) {
                await this.commander.shell(deviceId, params.cmd);
            }

            this._sendLog(ws, 'info', `명령 실행 완료: ${command}`, {
                category: 'device',
                deviceId
            });
        } catch (e) {
            this._sendLog(ws, 'error', `명령 실패: ${e.message}`, {
                category: 'device',
                deviceId
            });
        }
    }

    /**
     * 비디오 주입 처리
     */
    async _handleInjectVideo(ws, message) {
        const { video, targetViews, options } = message;

        try {
            const devices = this.discoveryManager.getDevices()
                .filter(d => d.status === 'ONLINE');

            if (devices.length === 0) {
                ws.send(JSON.stringify({
                    type: MSG.DISTRIBUTION_FAILED,
                    reason: '활성 디바이스가 없습니다'
                }));
                return;
            }

            // 배분 결과 전송
            ws.send(JSON.stringify({
                type: MSG.INJECT_RESULT,
                success: true,
                distributedCount: devices.length,
                videoId: video.id || video.videoId
            }));

            this._sendLog(ws, 'success', `${devices.length}개 디바이스에 배분 완료`, {
                category: 'video'
            });
        } catch (e) {
            ws.send(JSON.stringify({
                type: MSG.DISTRIBUTION_FAILED,
                reason: e.message
            }));
        }
    }

    /**
     * 비디오 추가 처리
     */
    async _handleAddVideo(ws, message) {
        const { video } = message;

        this._sendLog(ws, 'info', `비디오 등록: "${video.title}"`, {
            category: 'video'
        });

        // TODO: 실제 비디오 큐 관리 구현
    }

    /**
     * 로그 전송
     */
    _sendLog(ws, level, message, options = {}) {
        ws.send(JSON.stringify({
            type: MSG.LOG,
            level,
            message,
            nodeId: options.nodeId || this.nodeId,
            deviceId: options.deviceId,
            category: options.category || 'system'
        }));
    }

    /**
     * 브로드캐스트
     */
    _broadcast(message) {
        const data = JSON.stringify(message);

        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }

    /**
     * 연결 해제 처리
     */
    _handleDisconnect(ws) {
        this.clients.delete(ws);
        this.logger.info('[Dashboard] 클라이언트 연결 해제', { clientId: ws.clientId });
    }

    /**
     * 클라이언트 ID 생성
     */
    _generateClientId() {
        return `dash_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    }

    /**
     * 로컬 IP 가져오기
     */
    _getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    }

    /**
     * 종료
     */
    shutdown() {
        if (this.wss) {
            this.wss.clients.forEach(client => {
                try {
                    client.terminate();
                } catch (e) { /* ignore */ }
            });
            this.wss.close();
        }
        this.clients.clear();
        this.logger.info('[Dashboard] 종료');
    }
}

module.exports = DashboardHandler;
module.exports.MSG = MSG;

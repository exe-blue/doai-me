/**
 * DoAi.Me Distributed Control System
 * 
 * 10개 워크스테이션 분산 구조의 메인 진입점
 * 
 * 구성 요소:
 * 1. NodeConnectionManager - WebSocket 연결 풀 (Self-Healing)
 * 2. TaskRouter - 작업 라우팅
 * 3. LaixiAdapter - 디바이스 제어 (의존성 격리)
 * 4. SomaticEngine - 행동 로직 (Human Touch)
 * 
 * @author Axon (Tech Lead)
 * @version 2.0.0
 */

const EventEmitter = require('events');
const path = require('path');

// Core 모듈
const NodeConnectionManager = require('./core/NodeConnectionManager');
const TaskRouter = require('./core/TaskRouter');

// Laixi Adapter (의존성 격리: gateway에서 가져옴)
// 프로덕션에서는 npm 패키지로 분리하거나, 상대 경로로 참조
let LaixiAdapter;
let SomaticEngine;

try {
    // Gateway의 Laixi Adapter 사용
    LaixiAdapter = require('../../gateway/src/adapters/laixi/LaixiAdapter');
    SomaticEngine = require('../../gateway/src/adapters/laixi/SomaticEngine');
} catch {
    // Fallback: 간단한 Mock Adapter
    LaixiAdapter = require('./adapters/MockLaixiAdapter');
    SomaticEngine = null;
}

/**
 * 분산 제어 시스템 메인 클래스
 */
class DistributedControlSystem extends EventEmitter {
    /**
     * @param {Object} options
     * @param {Object} options.dbClient - PostgreSQL 클라이언트
     * @param {Object} options.config - 설정 오버라이드
     */
    constructor(options = {}) {
        super();
        
        this.dbClient = options.dbClient || null;
        this.config = {
            enableSomaticEngine: true,
            ...options.config
        };
        
        // NodeConnectionManager 생성
        this.nodeManager = new NodeConnectionManager({
            dbClient: this.dbClient,
            createAdapter: (nodeConfig) => new LaixiAdapter(nodeConfig),
            config: options.nodeConfig
        });
        
        // TaskRouter 생성
        this.taskRouter = new TaskRouter({
            nodeManager: this.nodeManager,
            dbClient: this.dbClient,
            somaticEngine: null  // 나중에 설정
        });
        
        this._started = false;
        this._setupEventForwarding();
    }
    
    /**
     * 시스템 시작
     */
    async start() {
        if (this._started) {
            this._log('이미 시작됨');
            return;
        }
        
        this._log('╔═══════════════════════════════════════════════════════════════╗');
        this._log('║     DoAi.Me Distributed Control System v2.0                    ║');
        this._log('║     10 Nodes Architecture - Starting...                        ║');
        this._log('╚═══════════════════════════════════════════════════════════════╝');
        
        // 1. NodeConnectionManager 시작
        await this.nodeManager.start();
        
        // 2. Somatic Engine 설정 (첫 번째 온라인 노드의 Adapter 사용)
        if (this.config.enableSomaticEngine && SomaticEngine) {
            const onlineNodes = this.nodeManager.getOnlineNodes();
            if (onlineNodes.length > 0) {
                const primaryAdapter = onlineNodes[0].adapter;
                this.taskRouter.somaticEngine = new SomaticEngine(primaryAdapter);
                this._log('Somatic Engine 활성화됨');
            }
        }
        
        this._started = true;
        
        // 상태 출력
        this._printStatus();
        
        this.emit('started', this.getStatus());
    }
    
    /**
     * 시스템 중지
     */
    async stop() {
        this._log('시스템 중지 중...');
        
        await this.nodeManager.stop();
        
        this._started = false;
        this.emit('stopped');
        
        this._log('시스템 중지됨');
    }
    
    /**
     * 작업 생성
     */
    async createTask(taskData) {
        if (!this._started) {
            throw new Error('시스템이 시작되지 않음');
        }
        
        return await this.taskRouter.createTask(taskData);
    }
    
    /**
     * 상태 조회
     */
    getStatus() {
        return {
            started: this._started,
            nodes: this.nodeManager.getStatus(),
            tasks: this.taskRouter.getStats()
        };
    }
    
    /**
     * 상태 출력
     */
    _printStatus() {
        const status = this.getStatus();
        
        console.log('');
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│                    📊 System Status                          │');
        console.log('├─────────────────────────────────────────────────────────────┤');
        console.log(`│  Nodes:    Total: ${status.nodes.nodes.total.toString().padEnd(3)} │ Online: ${status.nodes.nodes.online.toString().padEnd(3)} │ Offline: ${status.nodes.nodes.offline.toString().padEnd(3)} │`);
        console.log(`│  Devices:  Connected: ${status.nodes.totalDevices.toString().padEnd(4)}                                   │`);
        console.log(`│  Tasks:    Running: ${status.tasks.running.toString().padEnd(3)} │ Pending: ${status.tasks.pending.toString().padEnd(3)}                  │`);
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
    }
    
    /**
     * 이벤트 전달 설정
     */
    _setupEventForwarding() {
        // NodeManager 이벤트
        this.nodeManager.on('node:connected', (node) => {
            this._log(`✅ 노드 연결됨: ${node.name}`);
            this.emit('node:connected', node);
        });
        
        this.nodeManager.on('node:disconnected', (node) => {
            this._log(`⚠️ 노드 연결 해제: ${node.name}`);
            this.emit('node:disconnected', node);
        });
        
        this.nodeManager.on('node:heartbeat', (data) => {
            this.emit('node:heartbeat', data);
        });
        
        this.nodeManager.on('devices:synced', (data) => {
            this._log(`📱 디바이스 동기화: ${data.devices.length}대 (${data.nodeId})`);
            this.emit('devices:synced', data);
        });
        
        // TaskRouter 이벤트
        this.taskRouter.on('task:created', (task) => {
            this.emit('task:created', task);
        });
        
        this.taskRouter.on('task:completed', (task) => {
            this._log(`✅ 작업 완료: ${task.id}`);
            this.emit('task:completed', task);
        });
        
        this.taskRouter.on('task:failed', (task) => {
            this._log(`❌ 작업 실패: ${task.id}`, 'error');
            this.emit('task:failed', task);
        });
    }
    
    /**
     * 로깅
     */
    _log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = '[DCS]';
        
        const colors = {
            info: '\x1b[36m',    // 시안
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };
        
        console.log(`\x1b[36m${timestamp}\x1b[0m ${colors[level] || ''}${prefix}\x1b[0m ${message}`);
    }
}

module.exports = DistributedControlSystem;


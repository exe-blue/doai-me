/**
 * Task Router - 분산 작업 라우팅
 * 
 * 기능:
 * 1. create_task 요청 수신
 * 2. 타겟 디바이스가 연결된 노드 검색
 * 3. 해당 노드의 WebSocket으로 명령 라우팅
 * 4. 결과 수집 및 DB 업데이트
 * 
 * @author Axon (Tech Lead)
 * @version 2.0.0
 */

const EventEmitter = require('events');

/**
 * 작업 상태 상수
 */
const TASK_STATUS = {
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * 작업 타입 상수
 */
const TASK_TYPE = {
    WATCH: 'watch',
    SEARCH: 'search',
    COMMENT: 'comment',
    LIKE: 'like',
    SWIPE: 'swipe',
    TAP: 'tap',
    ADB: 'adb'
};

/**
 * Task Router 클래스
 */
class TaskRouter extends EventEmitter {
    /**
     * @param {Object} options
     * @param {NodeConnectionManager} options.nodeManager - 노드 연결 관리자
     * @param {Object} options.dbClient - PostgreSQL 클라이언트
     * @param {SomaticEngine} options.somaticEngine - 행동 엔진 (선택)
     */
    constructor(options = {}) {
        super();
        
        // nodeManager 필수 검증 - 없으면 작업 라우팅 불가
        if (!options.nodeManager) {
            throw new TypeError('nodeManager is required and must not be null');
        }
        
        this.nodeManager = options.nodeManager;
        this.dbClient = options.dbClient || null;
        this.somaticEngine = options.somaticEngine || null;
        
        this._taskQueue = new Map();        // taskId -> task info
        this._runningTasks = new Map();     // taskId -> execution context
        
        // TTL 기반 주기적 정리 (1시간마다, 24시간 이상 지난 완료된 작업 제거)
        this._taskRetentionMs = 24 * 60 * 60 * 1000; // 24시간
        this._cleanupInterval = setInterval(() => this._cleanupOldTasks(), 60 * 60 * 1000);
    }
    
    /**
     * TTL 기반 오래된 작업 정리
     */
    _cleanupOldTasks() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [taskId, task] of this._taskQueue.entries()) {
            // 완료/실패/취소된 작업만 정리 대상
            if (task.completedAt) {
                const age = now - new Date(task.completedAt).getTime();
                if (age > this._taskRetentionMs) {
                    this._taskQueue.delete(taskId);
                    cleanedCount++;
                }
            }
        }
        
        if (cleanedCount > 0) {
            this._log(`TTL 정리: ${cleanedCount}개 작업 제거됨`);
        }
    }
    
    /**
     * 리소스 정리 (shutdown 시 호출)
     */
    destroy() {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }
    }
    
    /**
     * 작업 생성 및 라우팅
     * 
     * @param {Object} taskData
     * @param {string} taskData.type - 작업 타입 (watch, search, comment, like)
     * @param {Object} taskData.params - 작업 파라미터
     * @param {string} taskData.targetDeviceId - 대상 디바이스 ID (선택)
     * @param {number} taskData.priority - 우선순위 (1-10, 기본 5)
     * @returns {Promise<Object>} - 생성된 작업 정보
     */
    async createTask(taskData) {
        const {
            type,
            params = {},
            targetDeviceId = null,
            priority = 5,
            videoId = null
        } = taskData;
        
        // 작업 ID 생성
        const taskId = this._generateTaskId();
        
        this._log(`작업 생성: ${taskId} (${type})`);
        
        // 1. 노드 결정
        let assignedNode = null;
        
        if (targetDeviceId) {
            // 특정 디바이스가 지정된 경우 → 해당 디바이스가 연결된 노드 찾기
            assignedNode = this.nodeManager.findNodeForDevice(targetDeviceId);
            
            if (!assignedNode) {
                throw new Error(`디바이스 ${targetDeviceId}가 연결된 노드를 찾을 수 없음`);
            }
        } else {
            // 디바이스 미지정 → 최적 노드 선택 (로드 밸런싱)
            assignedNode = this.nodeManager.selectOptimalNode();
            
            if (!assignedNode) {
                throw new Error('사용 가능한 노드가 없음');
            }
        }
        
        // 2. 작업 객체 생성
        const task = {
            id: taskId,
            type,
            params,
            targetDeviceId,
            assignedNodeId: assignedNode.nodeId,
            assignedNodeName: assignedNode.nodeName,
            videoId,
            priority,
            status: TASK_STATUS.ASSIGNED,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(),
            assignedAt: new Date()
        };
        
        // 3. DB에 저장
        if (this.dbClient) {
            await this._saveTaskToDb(task);
        }
        
        // 4. 큐에 추가
        this._taskQueue.set(taskId, task);
        
        // 5. 작업 실행
        this._executeTask(task, assignedNode).catch(err => {
            this._log(`작업 실행 실패: ${taskId} - ${err.message}`, 'error');
        });
        
        this.emit('task:created', task);
        
        return {
            taskId,
            status: task.status,
            assignedNode: assignedNode.nodeName
        };
    }
    
    /**
     * 작업 실행
     */
    async _executeTask(task, nodeConnection) {
        const { id: taskId, type, params, targetDeviceId } = task;
        
        // 상태 업데이트
        task.status = TASK_STATUS.RUNNING;
        task.startedAt = new Date();
        this._runningTasks.set(taskId, { task, nodeConnection });
        
        if (this.dbClient) {
            await this._updateTaskStatus(taskId, TASK_STATUS.RUNNING);
        }
        
        this._log(`작업 실행 시작: ${taskId} → ${nodeConnection.nodeName}`);
        this.emit('task:started', task);
        
        try {
            let result;
            
            // 대상 디바이스 결정
            const deviceIds = targetDeviceId || 'all';
            
            // 작업 타입별 처리
            switch (type) {
                case TASK_TYPE.WATCH:
                    result = await this._executeWatchTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.SEARCH:
                    result = await this._executeSearchTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.COMMENT:
                    result = await this._executeCommentTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.LIKE:
                    result = await this._executeLikeTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.TAP:
                    result = await this._executeTapTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.SWIPE:
                    result = await this._executeSwipeTask(nodeConnection, deviceIds, params);
                    break;
                    
                case TASK_TYPE.ADB:
                    result = await this._executeAdbTask(nodeConnection, deviceIds, params);
                    break;
                    
                default:
                    throw new Error(`알 수 없는 작업 타입: ${type}`);
            }
            
            // 성공 처리
            task.status = TASK_STATUS.COMPLETED;
            task.completedAt = new Date();
            task.result = result;
            
            if (this.dbClient) {
                await this._completeTask(taskId, result);
            }
            
            this._log(`✅ 작업 완료: ${taskId}`);
            this.emit('task:completed', task);
            
            return result;
            
        } catch (err) {
            // 실패 처리
            task.retryCount++;
            
            if (task.retryCount < task.maxRetries) {
                // 재시도
                this._log(`작업 재시도: ${taskId} (${task.retryCount}/${task.maxRetries})`);
                task.status = TASK_STATUS.ASSIGNED;
                
                // 지연 후 재시도
                await new Promise(resolve => setTimeout(resolve, 2000 * task.retryCount));
                return this._executeTask(task, nodeConnection);
                
            } else {
                // 최종 실패
                task.status = TASK_STATUS.FAILED;
                task.completedAt = new Date();
                task.errorMessage = err.message;
                
                if (this.dbClient) {
                    await this._failTask(taskId, err.message);
                }
                
                this._log(`❌ 작업 실패: ${taskId} - ${err.message}`, 'error');
                this.emit('task:failed', task);
                
                throw err;
            }
        } finally {
            this._runningTasks.delete(taskId);
            // 메모리 누수 방지: 완료된 작업 큐에서 제거
            this._taskQueue.delete(taskId);
        }
    }
    
    // ==================== 작업 타입별 실행 로직 ====================
    
    async _executeWatchTask(nodeConnection, deviceIds, params) {
        const { watchTime = 60, seekCount = null, keyword = null } = params;
        
        // Somatic Engine이 있으면 사용
        if (this.somaticEngine) {
            if (keyword) {
                await this.somaticEngine.searchAndSelect(deviceIds, keyword);
            }
            return await this.somaticEngine.watchVideo(deviceIds, watchTime, seekCount);
        }
        
        // 직접 Laixi 명령
        const adapter = nodeConnection.adapter;
        
        // 간단한 시청 시뮬레이션
        await adapter.tap(deviceIds, 0.5, 0.2);  // 플레이어 터치
        await new Promise(resolve => setTimeout(resolve, watchTime * 1000));
        
        return { watchTime, seeksDone: 0 };
    }
    
    async _executeSearchTask(nodeConnection, deviceIds, params) {
        const { keyword, maxRank = 3 } = params;
        
        // 키워드 검증 및 새니타이징
        const sanitizedKeyword = this._sanitizeTextInput(keyword, 'keyword', 100);
        
        if (this.somaticEngine) {
            return await this.somaticEngine.searchAndSelect(deviceIds, sanitizedKeyword, maxRank);
        }
        
        // 직접 명령
        const adapter = nodeConnection.adapter;
        
        // 검색 아이콘 탭
        await adapter.tap(deviceIds, 0.85, 0.05);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 텍스트 입력 - 클립보드 방식 사용 (안전)
        await adapter.sendCommand({
            action: 'writeclipboard',
            comm: {
                deviceIds: deviceIds,
                content: sanitizedKeyword
            }
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        await adapter.executeAdb(deviceIds, 'input keyevent 279'); // KEYCODE_PASTE
        await adapter.executeAdb(deviceIds, 'input keyevent 66');  // Enter
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 첫 번째 결과 클릭
        await adapter.tap(deviceIds, 0.5, 0.25);
        
        return { keyword: sanitizedKeyword, selectedRank: 1 };
    }
    
    async _executeCommentTask(nodeConnection, deviceIds, params) {
        const { text } = params;
        
        // 댓글 텍스트 검증 및 새니타이징
        const sanitizedText = this._sanitizeTextInput(text, 'comment', 500);
        
        if (this.somaticEngine) {
            await this.somaticEngine.writeComment(deviceIds, sanitizedText);
            return { commented: true, text: sanitizedText };
        }
        
        const adapter = nodeConnection.adapter;
        
        // 댓글 영역으로 스크롤
        await adapter.swipe(deviceIds, 'up');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 댓글 입력 - 클립보드 방식 사용 (안전)
        await adapter.tap(deviceIds, 0.5, 0.9);
        await adapter.sendCommand({
            action: 'writeclipboard',
            comm: {
                deviceIds: deviceIds,
                content: sanitizedText
            }
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        await adapter.executeAdb(deviceIds, 'input keyevent 279'); // KEYCODE_PASTE
        await adapter.executeAdb(deviceIds, 'input keyevent 66');  // Enter
        
        return { commented: true, text: sanitizedText };
    }
    
    /**
     * 사용자 입력 텍스트 새니타이징 (Command Injection 방지)
     * 
     * @param {string} input - 원본 입력
     * @param {string} fieldName - 필드명 (오류 메시지용)
     * @param {number} maxLength - 최대 길이
     * @returns {string} - 새니타이징된 텍스트
     * @throws {Error} - 유효하지 않은 입력 시
     */
    _sanitizeTextInput(input, fieldName, maxLength = 200) {
        if (!input || typeof input !== 'string') {
            throw new Error(`${fieldName}은(는) 유효한 문자열이어야 함`);
        }
        
        // 1. 길이 제한
        if (input.length > maxLength) {
            throw new Error(`${fieldName}이(가) 너무 깁니다 (최대 ${maxLength}자)`);
        }
        
        // 2. 정규화 및 제어문자 제거
        let sanitized = input
            .trim()
            .normalize('NFKC')
            .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
            .replace(/\u200B|\u200C|\u200D|\uFEFF/g, ''); // 제로폭 문자 제거
        
        // 3. 셸 메타문자 제거/이스케이프 (직접 shell 명령에 삽입되지 않도록)
        // 허용: 한글, 영문, 숫자, 공백, 일반 구두점 (. , ! ? @ # -)
        // 금지: ; & | ` $ ( ) { } [ ] < > \ " '
        const dangerousChars = /[;&|`$(){}[\]<>\\'"]/g;
        sanitized = sanitized.replace(dangerousChars, '');
        
        // 4. 빈 결과 검사
        if (sanitized.length === 0) {
            throw new Error(`${fieldName}이(가) 유효하지 않음 (빈 값이거나 위험한 문자만 포함)`);
        }
        
        return sanitized;
    }
    
    async _executeLikeTask(nodeConnection, deviceIds, params) {
        if (this.somaticEngine) {
            await this.somaticEngine.pressLike(deviceIds);
            return { liked: true };
        }
        
        const adapter = nodeConnection.adapter;
        await adapter.tap(deviceIds, 0.15, 0.35);  // 좋아요 버튼 위치
        
        return { liked: true };
    }
    
    async _executeTapTask(nodeConnection, deviceIds, params) {
        const { x, y } = params;
        
        const adapter = nodeConnection.adapter;
        await adapter.tap(deviceIds, x, y);
        
        return { tapped: true, x, y };
    }
    
    async _executeSwipeTask(nodeConnection, deviceIds, params) {
        const { direction = 'up' } = params;
        
        const adapter = nodeConnection.adapter;
        await adapter.swipe(deviceIds, direction);
        
        return { swiped: true, direction };
    }
    
    async _executeAdbTask(nodeConnection, deviceIds, params) {
        const { command } = params;
        
        // 보안: 명령어 검증 (화이트리스트 방식)
        const validatedCommand = this._validateAdbCommand(command);
        
        const adapter = nodeConnection.adapter;
        await adapter.executeAdb(deviceIds, validatedCommand);
        
        return { executed: true, command: validatedCommand };
    }
    
    /**
     * ADB 명령어 검증 (화이트리스트 + 블랙리스트)
     * 
     * @param {string} command - 원본 명령어
     * @returns {string} - 검증된 명령어
     * @throws {Error} - 위험한 명령어 감지 시
     */
    _validateAdbCommand(command) {
        if (!command || typeof command !== 'string') {
            throw new Error('ADB 명령어가 유효하지 않음');
        }
        
        // 1. 정규화: trim, 소문자 변환, NFKC 정규화, 제어문자 제거
        let normalized = command
            .trim()
            .normalize('NFKC')
            .replace(/[\x00-\x1F\x7F]/g, '') // 제어 문자 제거
            .replace(/\u200B|\u200C|\u200D|\uFEFF/g, ''); // 제로폭 문자 제거
        
        // 2. 화이트리스트 기반 허용된 ADB 서브 명령어
        const allowedCommands = [
            'input', 'am', 'pm', 'dumpsys', 'getprop', 'settings',
            'screencap', 'screenrecord', 'logcat', 'ps', 'top',
            'monkey', 'wm', 'content', 'service', 'cmd'
        ];
        
        // 3. 블랙리스트 기반 금지 명령어 (단어 단위 매칭)
        const forbiddenPatterns = [
            /\brm\b/i,
            /\bformat\b/i,
            /\bwipe\b/i,
            /\bfactory\b/i,
            /\breboot\b/i,
            /\bdd\b/i,
            /\bmkfs\b/i,
            /\bflash\b/i,
            /\bsideload\b/i,
            /\broot\b/i,
            /\bsu\b/i,
            /\bchmod\b/i,
            /\bchown\b/i,
            /\bkill\b/i,
            /\bpkill\b/i,
        ];
        
        const normalizedLower = normalized.toLowerCase();
        
        // 금지 명령어 검사
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(normalizedLower)) {
                this._log(`⚠️ 금지된 ADB 명령 감지: ${command}`, 'warn');
                throw new Error(`금지된 ADB 명령: 위험한 명령어 패턴 감지됨`);
            }
        }
        
        // shell 명령인 경우 추가 검증
        if (normalizedLower.startsWith('shell')) {
            // shell 뒤의 실제 명령어 추출
            const shellCmd = normalizedLower.replace(/^shell\s*/, '').trim();
            const firstToken = shellCmd.split(/\s+/)[0];
            
            // shell 내 명령어가 허용 목록에 있는지 확인
            if (firstToken && !allowedCommands.includes(firstToken)) {
                // 일부 안전한 shell 명령어 추가 허용
                const safeShellCommands = ['echo', 'cat', 'grep', 'ls', 'pwd', 'date', 'id', 'whoami'];
                if (!safeShellCommands.includes(firstToken)) {
                    this._log(`⚠️ 허용되지 않은 shell 명령: ${firstToken}`, 'warn');
                    throw new Error(`허용되지 않은 shell 명령: ${firstToken}`);
                }
            }
        }
        
        // 메타문자 검사 (명령 체이닝 방지)
        const dangerousChars = /[;&|`$(){}[\]<>\\]/;
        if (dangerousChars.test(normalized)) {
            this._log(`⚠️ 위험한 문자 감지: ${command}`, 'warn');
            throw new Error('ADB 명령에 허용되지 않은 문자가 포함됨');
        }
        
        return normalized;
    }
    
    // ==================== DB 연동 ====================
    
    async _saveTaskToDb(task) {
        try {
            await this.dbClient.query(
                `INSERT INTO tasks (id, type, priority, target_device_id, assigned_node_id, params, status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [task.id, task.type, task.priority, task.targetDeviceId, task.assignedNodeId,
                 JSON.stringify(task.params), task.status, task.createdAt]
            );
        } catch (err) {
            this._log(`DB 저장 실패: ${err.message}`, 'error');
        }
    }
    
    async _updateTaskStatus(taskId, status, startedAt = new Date()) {
        try {
            await this.dbClient.query(
                'UPDATE tasks SET status = $1, started_at = $2, updated_at = NOW() WHERE id = $3',
                [status, startedAt, taskId]
            );
        } catch (err) {
            this._log(`DB 업데이트 실패: ${err.message}`, 'error');
        }
    }
    
    async _completeTask(taskId, result) {
        try {
            await this.dbClient.query(
                'UPDATE tasks SET status = $1, result = $2, completed_at = $3, updated_at = NOW() WHERE id = $4',
                [TASK_STATUS.COMPLETED, JSON.stringify(result), new Date(), taskId]
            );
        } catch (err) {
            this._log(`DB 업데이트 실패: ${err.message}`, 'error');
        }
    }
    
    async _failTask(taskId, errorMessage) {
        try {
            await this.dbClient.query(
                'UPDATE tasks SET status = $1, error_message = $2, completed_at = $3, updated_at = NOW() WHERE id = $4',
                [TASK_STATUS.FAILED, errorMessage, new Date(), taskId]
            );
        } catch (err) {
            this._log(`DB 업데이트 실패: ${err.message}`, 'error');
        }
    }
    
    // ==================== 유틸리티 ====================
    
    /**
     * 작업 ID 생성
     */
    _generateTaskId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `task-${timestamp}-${random}`;
    }
    
    /**
     * 작업 상태 조회
     */
    getTask(taskId) {
        return this._taskQueue.get(taskId) || null;
    }
    
    /**
     * 실행 중인 작업 목록
     */
    getRunningTasks() {
        return Array.from(this._runningTasks.values()).map(ctx => ctx.task);
    }
    
    /**
     * 작업 취소
     */
    async cancelTask(taskId) {
        const task = this._taskQueue.get(taskId);
        
        if (!task) {
            throw new Error(`작업을 찾을 수 없음: ${taskId}`);
        }
        
        if (task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.CANCELLED) {
            throw new Error(`이미 완료되었거나 취소된 작업: ${taskId}`);
        }
        
        task.status = TASK_STATUS.CANCELLED;
        
        if (this.dbClient) {
            await this.dbClient.query(
                'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
                [TASK_STATUS.CANCELLED, taskId]
            );
        }
        
        this._log(`작업 취소됨: ${taskId}`);
        this.emit('task:cancelled', task);
        
        return task;
    }
    
    /**
     * 통계
     */
    getStats() {
        const stats = {
            total: this._taskQueue.size,
            running: this._runningTasks.size,
            pending: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
        };
        
        for (const task of this._taskQueue.values()) {
            if (stats[task.status] !== undefined) {
                stats[task.status]++;
            }
        }
        
        return stats;
    }
    
    /**
     * 로깅
     */
    _log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = '[TaskRouter]';
        
        const colors = {
            info: '\x1b[32m',   // 초록
            warn: '\x1b[33m',
            error: '\x1b[31m'
        };
        
        console.log(`\x1b[36m${timestamp}\x1b[0m ${colors[level] || ''}${prefix}\x1b[0m ${message}`);
    }
}

module.exports = TaskRouter;
module.exports.TASK_STATUS = TASK_STATUS;
module.exports.TASK_TYPE = TASK_TYPE;


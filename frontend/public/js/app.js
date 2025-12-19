/**
 * AIFarm Intranet - Main Application
 * 
 * Vercel 배포용 프론트엔드
 * config.js에서 API 설정을 가져옵니다.
 */

// ==================== Utilities ====================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return '완료';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 후`;
    if (hours > 0) return `${hours}시간 후`;
    if (minutes > 0) return `${minutes}분 후`;
    return '곧';
}

// ==================== Toast Notifications ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== Modal ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ==================== API Functions ====================

async function apiRequest(endpoint, options = {}) {
    // Use global API helper from config.js if available
    if (window.API) {
        if (options.method === 'POST') {
            return window.API.post(endpoint, JSON.parse(options.body || '{}'));
        } else if (options.method === 'PUT') {
            return window.API.put(endpoint, JSON.parse(options.body || '{}'));
        } else if (options.method === 'DELETE') {
            return window.API.delete(endpoint);
        } else {
            return window.API.get(endpoint);
        }
    }
    
    // Fallback to direct fetch
    const baseUrl = window.CONFIG?.API_BASE_URL || '/api';
    
    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== YouTube Tasks ====================

let currentTasks = [];

async function loadTasks() {
    try {
        const data = await apiRequest('/youtube-tasks');
        currentTasks = data.tasks || [];
        renderTaskTable();
        updateStats();
    } catch (error) {
        console.warn('태스크 로드 실패:', error.message);
        // Show demo data on error
        currentTasks = [];
        renderTaskTable();
    }
}

function renderTaskTable() {
    const tbody = document.getElementById('task-table-body');
    if (!tbody) return;
    
    if (currentTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fab fa-youtube"></i>
                        <h3>등록된 태스크가 없습니다</h3>
                        <p>새 YouTube 태스크를 추가해보세요</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentTasks.map(task => `
        <tr data-id="${task.id}">
            <td>
                <span class="status-badge ${task.status}">
                    <span class="status-dot"></span>
                    ${getStatusLabel(task.status)}
                </span>
            </td>
            <td>
                <div class="truncate" title="${task.keyword}">${task.keyword}</div>
            </td>
            <td>
                <div class="truncate" title="${task.title}">${task.title}</div>
            </td>
            <td>
                <span class="time-display scheduled">${formatRelativeTime(task.scheduled_at)}</span>
                <br>
                <span class="time-display">${formatDate(task.scheduled_at)}</span>
            </td>
            <td>
                <span class="agent-range">${task.agent_start} - ${task.agent_end}</span>
            </td>
            <td>
                <span class="probability">${Math.round(task.like_probability * 100)}%</span>
            </td>
            <td>
                <span class="probability">${Math.round(task.comment_probability * 100)}%</span>
            </td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm btn-secondary btn-icon" onclick="editTask('${task.id}')" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-icon" onclick="deleteTask('${task.id}')" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        pending: '대기중',
        scheduled: '예약됨',
        running: '실행중',
        completed: '완료',
        failed: '실패',
        cancelled: '취소'
    };
    return labels[status] || status;
}

function updateStats() {
    const stats = {
        total: currentTasks.length,
        pending: currentTasks.filter(t => t.status === 'pending' || t.status === 'scheduled').length,
        completed: currentTasks.filter(t => t.status === 'completed').length,
        failed: currentTasks.filter(t => t.status === 'failed').length
    };
    
    const totalEl = document.getElementById('stat-total');
    const pendingEl = document.getElementById('stat-pending');
    const completedEl = document.getElementById('stat-completed');
    const failedEl = document.getElementById('stat-failed');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (pendingEl) pendingEl.textContent = stats.pending;
    if (completedEl) completedEl.textContent = stats.completed;
    if (failedEl) failedEl.textContent = stats.failed;
}

// ==================== Task Form ====================

let isAddingToBatch = false;

function openNewTaskModal(addToBatch = false) {
    isAddingToBatch = addToBatch;
    
    const form = document.getElementById('task-form');
    const modalTitle = document.getElementById('modal-title');
    
    if (form) {
        form.reset();
        form.dataset.mode = 'create';
        form.dataset.taskId = '';
    }
    
    // 모달 제목 변경
    if (modalTitle) {
        modalTitle.textContent = addToBatch ? '배치에 태스크 추가' : '새 YouTube 태스크';
    }
    
    // 기본값 설정
    const likeProb = document.getElementById('like-probability');
    const likeValue = document.getElementById('like-value');
    const commentProb = document.getElementById('comment-probability');
    const commentValue = document.getElementById('comment-value');
    const subscribeProb = document.getElementById('subscribe-probability');
    const subscribeValue = document.getElementById('subscribe-value');
    const agentStart = document.getElementById('agent-start');
    const agentEnd = document.getElementById('agent-end');
    const watchMin = document.getElementById('watch-min');
    const watchMax = document.getElementById('watch-max');
    const useAiComment = document.getElementById('use-ai-comment');
    const scheduledTime = document.getElementById('scheduled-time');
    
    if (likeProb) likeProb.value = 30;
    if (likeValue) likeValue.textContent = '30%';
    if (commentProb) commentProb.value = 10;
    if (commentValue) commentValue.textContent = '10%';
    if (subscribeProb) subscribeProb.value = 5;
    if (subscribeValue) subscribeValue.textContent = '5%';
    if (agentStart) agentStart.value = 1;
    if (agentEnd) agentEnd.value = 600;
    if (watchMin) watchMin.value = 30;
    if (watchMax) watchMax.value = 180;
    if (useAiComment) useAiComment.checked = true;
    if (scheduledTime) scheduledTime.value = '즉시';
    
    openModal('task-modal');
}

async function editTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const form = document.getElementById('task-form');
    form.dataset.mode = 'edit';
    form.dataset.taskId = taskId;
    
    // Fill form
    document.getElementById('keyword').value = task.keyword;
    document.getElementById('title').value = task.title;
    document.getElementById('scheduled-time').value = task.scheduled_time;
    document.getElementById('video-url').value = task.video_url || '';
    document.getElementById('video-id').value = task.video_id || '';
    document.getElementById('channel-name').value = task.channel_name || '';
    document.getElementById('agent-start').value = task.agent_start;
    document.getElementById('agent-end').value = task.agent_end;
    
    document.getElementById('like-probability').value = task.like_probability * 100;
    document.getElementById('like-value').textContent = `${Math.round(task.like_probability * 100)}%`;
    
    document.getElementById('comment-probability').value = task.comment_probability * 100;
    document.getElementById('comment-value').textContent = `${Math.round(task.comment_probability * 100)}%`;
    
    document.getElementById('subscribe-probability').value = task.subscribe_probability * 100;
    document.getElementById('subscribe-value').textContent = `${Math.round(task.subscribe_probability * 100)}%`;
    
    document.getElementById('watch-min').value = task.watch_duration_min;
    document.getElementById('watch-max').value = task.watch_duration_max;
    
    document.getElementById('use-ai-comment').checked = task.use_ai_comment;
    document.getElementById('memo').value = task.memo || '';
    
    document.getElementById('modal-title').textContent = '태스크 수정';
    openModal('task-modal');
}

function getFormData() {
    return {
        keyword: document.getElementById('keyword')?.value || '',
        title: document.getElementById('title')?.value || '',
        upload_time: document.getElementById('scheduled-time')?.value || '즉시',
        url: document.getElementById('video-url')?.value || null,
        video_id: document.getElementById('video-id')?.value || null,
        channel_name: document.getElementById('channel-name')?.value || null,
        agent_start: Number.parseInt(document.getElementById('agent-start')?.value) || 1,
        agent_end: Number.parseInt(document.getElementById('agent-end')?.value) || 600,
        like_probability: Number.parseInt(document.getElementById('like-probability')?.value) || 30,
        comment_probability: Number.parseInt(document.getElementById('comment-probability')?.value) || 10,
        subscribe_probability: Number.parseInt(document.getElementById('subscribe-probability')?.value) || 5,
        watch_time_min: Number.parseInt(document.getElementById('watch-min')?.value) || 30,
        watch_time_max: Number.parseInt(document.getElementById('watch-max')?.value) || 180,
        ai_comment_enabled: document.getElementById('use-ai-comment')?.checked ?? true,
        comment_text: null,
        memo: document.getElementById('memo')?.value || null
    };
}

async function saveTask() {
    const form = document.getElementById('task-form');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = getFormData();
    
    // 배치에 추가 모드
    if (isAddingToBatch) {
        if (batchItems.length >= 5) {
            showToast('배치는 최대 5개까지 추가할 수 있습니다.', 'warning');
            return;
        }
        
        batchItems.push(data);
        renderBatchItems();
        closeModal('task-modal');
        showToast(`배치에 추가됨 (${batchItems.length}/5)`, 'success');
        return;
    }
    
    // 일반 태스크 생성
    const mode = form?.dataset.mode;
    const taskId = form?.dataset.taskId;
    
    try {
        if (mode === 'edit' && taskId) {
            await apiRequest(`/youtube-tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('태스크가 수정되었습니다.', 'success');
        } else {
            await apiRequest('/youtube-tasks', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('태스크가 생성되었습니다.', 'success');
        }
        
        closeModal('task-modal');
        loadTasks();
    } catch (error) {
        showToast(`저장 실패: ${error.message}`, 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await apiRequest(`/youtube-tasks/${taskId}`, {
            method: 'DELETE'
        });
        showToast('태스크가 삭제되었습니다', 'success');
        loadTasks();
    } catch (error) {
        showToast('삭제 실패: ' + error.message, 'error');
    }
}

// ==================== Range Input Handlers ====================

function setupRangeInputs() {
    const ranges = [
        { input: 'like-probability', display: 'like-value', suffix: '%' },
        { input: 'comment-probability', display: 'comment-value', suffix: '%' },
        { input: 'subscribe-probability', display: 'subscribe-value', suffix: '%' }
    ];
    
    ranges.forEach(({ input, display, suffix }) => {
        const inputEl = document.getElementById(input);
        const displayEl = document.getElementById(display);
        
        if (inputEl && displayEl) {
            inputEl.addEventListener('input', () => {
                displayEl.textContent = `${inputEl.value}${suffix}`;
            });
        }
    });
}

// ==================== Video URL Parser ====================

function parseVideoUrl() {
    const urlInput = document.getElementById('video-url');
    const idInput = document.getElementById('video-id');
    
    if (!urlInput || !idInput) return;
    
    const url = urlInput.value;
    
    // YouTube URL 패턴들
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            idInput.value = match[1];
            return;
        }
    }
}

// ==================== Batch System ====================

// 배치 데이터 저장소
let batchItems = [];

function renderBatchItems() {
    const container = document.getElementById('batch-items');
    const countEl = document.getElementById('batch-item-count');
    const submitBtn = document.getElementById('submit-batch-btn');
    
    if (!container) return;
    
    if (countEl) countEl.textContent = batchItems.length;
    if (submitBtn) submitBtn.disabled = batchItems.length === 0;
    
    if (batchItems.length === 0) {
        container.innerHTML = `
            <div class="batch-empty">
                <i class="fas fa-inbox"></i>
                <p>배치에 추가된 태스크가 없습니다.<br>아래에서 태스크를 생성하여 배치에 추가하세요.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = batchItems.map((item, index) => `
        <div class="batch-item">
            <div class="batch-item-index">${index + 1}</div>
            <div class="batch-item-content">
                <div class="batch-item-field">
                    <label>키워드</label>
                    <span class="truncate" title="${item.keyword}">${item.keyword}</span>
                </div>
                <div class="batch-item-field">
                    <label>제목</label>
                    <span class="truncate" title="${item.title}">${item.title}</span>
                </div>
                <div class="batch-item-field">
                    <label>실행 시간</label>
                    <span>${item.upload_time}</span>
                </div>
                <div class="batch-item-field">
                    <label>확률</label>
                    <span>👍${item.like_probability}% 💬${item.comment_probability}%</span>
                </div>
            </div>
            <button class="batch-item-remove" onclick="removeBatchItem(${index})" title="제거">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeBatchItem(index) {
    batchItems.splice(index, 1);
    renderBatchItems();
    showToast('배치에서 제거됨', 'info');
}

function clearBatch() {
    if (batchItems.length === 0) return;
    
    if (confirm(`${batchItems.length}개의 태스크를 모두 삭제하시겠습니까?`)) {
        batchItems = [];
        renderBatchItems();
        showToast('배치가 초기화되었습니다.', 'info');
    }
}

async function submitBatch() {
    if (batchItems.length === 0) {
        showToast('배치에 태스크를 추가해주세요.', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submit-batch-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 제출 중...';
    }
    
    try {
        const response = await apiRequest('/batch/submit', {
            method: 'POST',
            body: JSON.stringify({ tasks: batchItems })
        });
        
        showToast(`배치 제출 완료! (${response.task_count}개 태스크)`, 'success');
        batchItems = [];
        renderBatchItems();
        loadTasks();
        
    } catch (error) {
        showToast(`배치 제출 실패: ${error.message}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = batchItems.length === 0;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 배치 제출';
        }
    }
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AIFarm Frontend Initialized');
    
    setupRangeInputs();
    loadTasks();
    renderBatchItems();
    
    // Auto-refresh every 30 seconds
    setInterval(loadTasks, 30000);
    
    // Video URL change handler
    const videoUrlInput = document.getElementById('video-url');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('change', parseVideoUrl);
        videoUrlInput.addEventListener('paste', () => {
            setTimeout(parseVideoUrl, 100);
        });
    }
});

// Make functions globally available
window.openNewTaskModal = openNewTaskModal;
window.editTask = editTask;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.closeModal = closeModal;
window.removeBatchItem = removeBatchItem;
window.clearBatch = clearBatch;
window.submitBatch = submitBatch;
window.showToast = showToast;


/**
 * AIFarm Dashboard JavaScript
 * 
 * 600대 에이전트 실시간 모니터링 대시보드
 */

// ==================== Configuration ====================
const WEBSOCKET_URL = `ws://${window.location.host}/api/dashboard/ws`;
const RECONNECT_INTERVAL = 5000;

// Activity colors
const ACTIVITY_COLORS = {
    'shorts_remix': '#FF6B6B',
    'playlist_curator': '#4ECDC4',
    'persona_commenter': '#FFE66D',
    'trend_scout': '#95E1D3',
    'challenge_hunter': '#F38181',
    'thumbnail_lab': '#AA96DA',
};

// Activity names (Korean)
const ACTIVITY_NAMES = {
    'shorts_remix': 'Shorts 리믹스',
    'playlist_curator': '플레이리스트 큐레이터',
    'persona_commenter': '페르소나 코멘터',
    'trend_scout': '트렌드 스카우트',
    'challenge_hunter': '챌린지 헌터',
    'thumbnail_lab': '썸네일 랩',
};

// ==================== Global State ====================
let websocket = null;
let activityChart = null;
let timelineChart = null;
let isConnected = false;
let currentLeaderboardTab = 'tasks';
let leaderboardData = { top_by_tasks: [], top_by_watch_time: [] };

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initBoardGrid();
    initWebSocket();
    initEventListeners();
    
    // Load initial data via REST API
    loadInitialData();
});

function initCharts() {
    // Activity Distribution Pie Chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx) {
        activityChart = new Chart(activityCtx, {
            type: 'doughnut',
            data: {
                labels: Object.values(ACTIVITY_NAMES),
                datasets: [{
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: Object.values(ACTIVITY_COLORS),
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    // Timeline Chart
    const timelineCtx = document.getElementById('timeline-chart');
    if (timelineCtx) {
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        
        timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: '활성 디바이스',
                    data: Array(24).fill(0),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#6a6a7a'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#6a6a7a'
                        },
                        max: 600
                    }
                }
            }
        });
    }
}

function initBoardGrid() {
    const grid = document.getElementById('board-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 1; i <= 30; i++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell good';
        cell.textContent = i;
        cell.dataset.boardId = i;
        cell.title = `폰보드 ${i}`;
        cell.addEventListener('click', () => showBoardDetail(i));
        grid.appendChild(cell);
    }
}

function initWebSocket() {
    if (websocket) {
        websocket.close();
    }
    
    websocket = new WebSocket(WEBSOCKET_URL);
    
    websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus(true);
        
        // Request initial stats
        websocket.send(JSON.stringify({ action: 'refresh_stats' }));
    };
    
    websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus(false);
        
        // Attempt reconnect
        setTimeout(initWebSocket, RECONNECT_INTERVAL);
    };
    
    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus(false);
    };
    
    websocket.onmessage = (event) => {
        handleWebSocketMessage(JSON.parse(event.data));
    };
}

function initEventListeners() {
    // Leaderboard tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLeaderboardTab = btn.dataset.tab;
            updateLeaderboard();
        });
    });
}

// ==================== Data Loading ====================
async function loadInitialData() {
    try {
        // Load stats
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
            const stats = await statsRes.json();
            updateStats(stats);
        }
        
        // Load activities
        const activitiesRes = await fetch('/api/dashboard/activities');
        if (activitiesRes.ok) {
            const activities = await activitiesRes.json();
            updateActivityChart(activities);
        }
        
        // Load board health
        const healthRes = await fetch('/api/dashboard/boards/health');
        if (healthRes.ok) {
            const health = await healthRes.json();
            updateBoardHealth(health);
        }
        
        // Load leaderboard
        const leaderboardRes = await fetch('/api/dashboard/leaderboard');
        if (leaderboardRes.ok) {
            leaderboardData = await leaderboardRes.json();
            updateLeaderboard();
        }
        
        // Load discoveries
        const discoveriesRes = await fetch('/api/dashboard/discoveries?limit=10');
        if (discoveriesRes.ok) {
            const discoveries = await discoveriesRes.json();
            updateDiscoveryFeed(discoveries);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
        addAlert('error', '초기 데이터 로딩 실패');
    }
}

// ==================== WebSocket Message Handling ====================
function handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
        case 'stats':
            updateStats(data);
            break;
        case 'pool_status':
            updatePoolStatus(data);
            break;
        case 'activity_status':
            updateActivityChart(data);
            break;
        case 'leaderboard':
            leaderboardData = data;
            updateLeaderboard();
            break;
        case 'discovery':
            addDiscovery(data);
            break;
        case 'alert':
            addAlert(data.alert_type, data.message);
            break;
        case 'device_status':
            // Handle individual device updates
            break;
        default:
            console.log('Unknown message type:', type);
    }
}

// ==================== UI Updates ====================
function setConnectionStatus(connected) {
    isConnected = connected;
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('span');
        
        if (connected) {
            dot.className = 'status-dot online';
            text.textContent = '연결됨';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = '연결 끊김';
        }
    }
}

function updateStats(stats) {
    if (stats.devices) {
        document.getElementById('stat-total-devices').textContent = stats.devices.total;
        document.getElementById('stat-active').textContent = stats.devices.active;
        document.getElementById('stat-reserve').textContent = stats.devices.reserve;
        document.getElementById('stat-maintenance').textContent = stats.devices.maintenance;
    }
    
    if (stats.time) {
        updateTimeIntensity(stats.time.current_intensity);
    }
}

function updatePoolStatus(data) {
    if (data.pools) {
        document.getElementById('stat-active').textContent = data.pools.active;
        document.getElementById('stat-reserve').textContent = data.pools.reserve;
        document.getElementById('stat-maintenance').textContent = data.pools.maintenance;
    }
}

function updateTimeIntensity(intensity) {
    const fill = document.querySelector('.intensity-fill');
    const value = document.querySelector('.intensity-value');
    
    if (fill) {
        fill.style.width = `${intensity * 100}%`;
    }
    if (value) {
        value.textContent = `${Math.round(intensity * 100)}%`;
    }
}

function updateActivityChart(data) {
    if (!activityChart || !data.distribution) return;
    
    const activities = Object.keys(ACTIVITY_NAMES);
    const counts = activities.map(act => {
        const item = data.distribution.find(d => d.activity === act);
        return item ? item.count : 0;
    });
    
    activityChart.data.datasets[0].data = counts;
    activityChart.update('none');
    
    // Update legend
    updateActivityLegend(data.distribution);
    
    // Update badge
    const badge = document.getElementById('total-active-activities');
    if (badge) {
        badge.textContent = `${data.total_active}대 활동중`;
    }
}

function updateActivityLegend(distribution) {
    const legend = document.getElementById('activity-legend');
    if (!legend) return;
    
    legend.innerHTML = Object.entries(ACTIVITY_NAMES).map(([key, name]) => {
        const item = distribution.find(d => d.activity === key) || { count: 0, percent: 0 };
        return `
            <div class="legend-item">
                <div class="legend-color" style="background: ${ACTIVITY_COLORS[key]}"></div>
                <span class="legend-name">${name}</span>
                <span class="legend-count">${item.count}대</span>
                <span class="legend-percent">${item.percent}%</span>
            </div>
        `;
    }).join('');
}

function updateBoardHealth(health) {
    const cells = document.querySelectorAll('.board-cell');
    
    cells.forEach(cell => {
        const boardId = Number.parseInt(cell.dataset.boardId);
        const boardData = health[boardId];
        
        if (boardData) {
            cell.className = `board-cell ${boardData.health}`;
            cell.title = `폰보드 ${boardId}\n` +
                `활성: ${boardData.active}대\n` +
                `에러: ${boardData.error}대\n` +
                `에러율: ${boardData.error_rate}%`;
        }
    });
}

function updateLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;
    
    const data = currentLeaderboardTab === 'tasks' 
        ? leaderboardData.top_by_tasks 
        : leaderboardData.top_by_watch_time;
    
    if (!data || data.length === 0) {
        content.innerHTML = '<div class="leaderboard-empty">데이터 없음</div>';
        return;
    }
    
    content.innerHTML = data.slice(0, 5).map((item, index) => {
        const value = currentLeaderboardTab === 'tasks' 
            ? item.tasks 
            : formatWatchTime(item.watch_time);
        const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
        
        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${index + 1}</div>
                <span class="device-id">Device #${item.device_id}</span>
                <span class="score">${value}</span>
            </div>
        `;
    }).join('');
    
    // Update error-free count
    const errorFreeEl = document.getElementById('error-free-count');
    if (errorFreeEl && leaderboardData.error_free_count !== undefined) {
        errorFreeEl.textContent = `${leaderboardData.error_free_count}대`;
    }
}

function updateDiscoveryFeed(discoveries) {
    const feed = document.getElementById('discovery-feed');
    if (!feed) return;
    
    if (!discoveries || discoveries.length === 0) {
        feed.innerHTML = `
            <div class="discovery-empty">
                <i class="fas fa-satellite-dish"></i>
                <p>발견물을 기다리는 중...</p>
            </div>
        `;
        return;
    }
    
    feed.innerHTML = discoveries.map(d => createDiscoveryItem(d)).join('');
}

function addDiscovery(discovery) {
    const feed = document.getElementById('discovery-feed');
    if (!feed) return;
    
    // Remove empty state if present
    const empty = feed.querySelector('.discovery-empty');
    if (empty) {
        empty.remove();
    }
    
    // Add new discovery at top
    const item = document.createElement('div');
    item.innerHTML = createDiscoveryItem(discovery);
    feed.insertBefore(item.firstElementChild, feed.firstChild);
    
    // Limit to 20 items
    while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
    }
    
    // Show toast notification
    showDiscoveryToast(discovery);
}

function createDiscoveryItem(discovery) {
    const typeConfig = {
        'rising_star': { icon: '⭐', iconClass: 'star', label: 'Rising Star' },
        'challenge': { icon: '🔥', iconClass: 'fire', label: '챌린지' },
        'remix_idea': { icon: '💡', iconClass: 'idea', label: '리믹스 아이디어' },
        'high_performance_thumbnail': { icon: '🖼️', iconClass: 'image', label: '고성과 썸네일' },
    };
    
    const config = typeConfig[discovery.data_type] || { icon: '📌', iconClass: 'default', label: discovery.data_type };
    const time = new Date(discovery.discovered_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    return `
        <div class="discovery-item ${discovery.data_type}">
            <div class="discovery-icon ${config.iconClass}">${config.icon}</div>
            <div class="discovery-content">
                <div class="discovery-type">${config.label}</div>
                <div class="discovery-text">${JSON.stringify(discovery.content).slice(0, 50)}...</div>
                <div class="discovery-meta">
                    <span>Device #${discovery.device_id}</span>
                    <span>${time}</span>
                </div>
            </div>
        </div>
    `;
}

function showDiscoveryToast(discovery) {
    const typeEmoji = {
        'rising_star': '🌟',
        'challenge': '🔥',
        'remix_idea': '💡',
        'high_performance_thumbnail': '🖼️',
    };
    
    const emoji = typeEmoji[discovery.data_type] || '📌';
    showToast(`${emoji} Device #${discovery.device_id}이(가) ${discovery.data_type} 발견!`, 'success');
}

// ==================== Alerts ====================
function addAlert(type, message) {
    const list = document.getElementById('alerts-list');
    if (!list) return;
    
    const icons = {
        'info': 'fa-info-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle',
        'success': 'fa-check-circle',
    };
    
    const alert = document.createElement('div');
    alert.className = `alert-item ${type}`;
    alert.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <time>방금</time>
    `;
    
    list.insertBefore(alert, list.firstChild);
    
    // Limit to 10 alerts
    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}

function clearAlerts() {
    const list = document.getElementById('alerts-list');
    if (list) {
        list.innerHTML = '';
        addAlert('info', '알림이 지워졌습니다');
    }
}

// ==================== Board Detail ====================
function showBoardDetail(boardId) {
    // Request board detail via WebSocket
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'get_board_detail',
            board_id: boardId
        }));
    }
    
    showToast(`폰보드 ${boardId} 상세 정보 요청`, 'info');
}

// ==================== Utilities ====================
function formatWatchTime(seconds) {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4000);
}

// Make functions globally available
window.clearAlerts = clearAlerts;
window.showBoardDetail = showBoardDetail;


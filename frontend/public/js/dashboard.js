/**
 * AIFarm Dashboard JavaScript
 * 
 * 600대 에이전트 실시간 모니터링 대시보드
 * Vercel 배포용 프론트엔드
 */

// ==================== Configuration ====================
const ACTIVITY_COLORS = {
    'shorts_remix': '#FF6B6B',
    'playlist_curator': '#4ECDC4',
    'persona_commenter': '#FFE66D',
    'trend_scout': '#95E1D3',
    'challenge_hunter': '#F38181',
    'thumbnail_lab': '#AA96DA',
};

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
    console.log('📊 Dashboard Initialized');
    initCharts();
    initBoardGrid();
    initWebSocket();
    initEventListeners();
    loadInitialData();
});

function initCharts() {
    // Activity Distribution Pie Chart
    const activityCtx = document.getElementById('activity-chart');
    if (activityCtx && window.Chart) {
        activityChart = new Chart(activityCtx, {
            type: 'doughnut',
            data: {
                labels: Object.values(ACTIVITY_NAMES),
                datasets: [{
                    data: [100, 90, 80, 70, 60, 50],
                    backgroundColor: Object.values(ACTIVITY_COLORS),
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    }
    
    // Timeline Chart
    const timelineCtx = document.getElementById('timeline-chart');
    if (timelineCtx && window.Chart) {
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        
        timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [{
                    label: '활성 디바이스',
                    data: Array(24).fill(0).map(() => Math.floor(Math.random() * 400 + 200)),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#6a6a7a' } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#6a6a7a' }, max: 600 }
                }
            }
        });
    }
}

function initBoardGrid() {
    const grid = document.getElementById('board-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    const statuses = ['good', 'good', 'good', 'good', 'warning', 'critical'];
    
    for (let i = 1; i <= 30; i++) {
        const cell = document.createElement('div');
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        cell.className = `board-cell ${status}`;
        cell.textContent = i;
        cell.dataset.boardId = i;
        cell.title = `폰보드 ${i}`;
        cell.addEventListener('click', () => showBoardDetail(i));
        grid.appendChild(cell);
    }
}

function initWebSocket() {
    const wsUrl = window.CONFIG?.WS_BASE_URL 
        ? `${window.CONFIG.WS_BASE_URL}/api/dashboard/ws`
        : `ws://${window.location.host}/api/dashboard/ws`;
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
            console.log('WebSocket connected');
            setConnectionStatus(true);
        };
        
        websocket.onclose = () => {
            console.log('WebSocket disconnected');
            setConnectionStatus(false);
            setTimeout(initWebSocket, 5000);
        };
        
        websocket.onerror = () => {
            setConnectionStatus(false);
        };
        
        websocket.onmessage = (event) => {
            handleWebSocketMessage(JSON.parse(event.data));
        };
    } catch (err) {
        console.warn('WebSocket not available:', err);
        setConnectionStatus(false);
    }
}

function initEventListeners() {
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
    // Load demo data for static deployment
    updateStats({ devices: { total: 600, active: 500, reserve: 60, maintenance: 40 } });
    updateTimeIntensity(0.75);
    updateActivityLegend([
        { activity: 'shorts_remix', count: 100, percent: 20 },
        { activity: 'playlist_curator', count: 90, percent: 18 },
        { activity: 'persona_commenter', count: 80, percent: 16 },
        { activity: 'trend_scout', count: 70, percent: 14 },
        { activity: 'challenge_hunter', count: 60, percent: 12 },
        { activity: 'thumbnail_lab', count: 50, percent: 10 },
    ]);
    
    // Try to load real data from API
    if (window.API) {
        try {
            const stats = await window.API.get('/dashboard/stats');
            updateStats(stats);
        } catch (err) {
            console.warn('Could not load live stats');
        }
    }
}

// ==================== WebSocket Message Handling ====================
function handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
        case 'stats': updateStats(data); break;
        case 'pool_status': updatePoolStatus(data); break;
        case 'activity_status': updateActivityChart(data); break;
        case 'leaderboard': leaderboardData = data; updateLeaderboard(); break;
        case 'discovery': addDiscovery(data); break;
        case 'alert': addAlert(data.alert_type, data.message); break;
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
        const total = document.getElementById('stat-total-devices');
        const active = document.getElementById('stat-active');
        const reserve = document.getElementById('stat-reserve');
        const maintenance = document.getElementById('stat-maintenance');
        
        if (total) total.textContent = stats.devices.total;
        if (active) active.textContent = stats.devices.active;
        if (reserve) reserve.textContent = stats.devices.reserve;
        if (maintenance) maintenance.textContent = stats.devices.maintenance;
    }
}

function updatePoolStatus(data) {
    if (data.pools) {
        const active = document.getElementById('stat-active');
        const reserve = document.getElementById('stat-reserve');
        const maintenance = document.getElementById('stat-maintenance');
        
        if (active) active.textContent = data.pools.active;
        if (reserve) reserve.textContent = data.pools.reserve;
        if (maintenance) maintenance.textContent = data.pools.maintenance;
    }
}

function updateTimeIntensity(intensity) {
    const fill = document.querySelector('.intensity-fill');
    const value = document.querySelector('.intensity-value');
    
    if (fill) fill.style.width = `${intensity * 100}%`;
    if (value) value.textContent = `${Math.round(intensity * 100)}%`;
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
    updateActivityLegend(data.distribution);
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

function updateLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;
    
    // Demo data
    const demoData = [
        { device_id: 42, tasks: 156, watch_time: 7200 },
        { device_id: 128, tasks: 143, watch_time: 6800 },
        { device_id: 315, tasks: 138, watch_time: 6500 },
        { device_id: 87, tasks: 132, watch_time: 6200 },
        { device_id: 456, tasks: 127, watch_time: 5900 },
    ];
    
    const data = currentLeaderboardTab === 'tasks' 
        ? (leaderboardData.top_by_tasks?.length ? leaderboardData.top_by_tasks : demoData)
        : (leaderboardData.top_by_watch_time?.length ? leaderboardData.top_by_watch_time : demoData);
    
    content.innerHTML = data.slice(0, 5).map((item, index) => {
        const value = currentLeaderboardTab === 'tasks' ? item.tasks : formatWatchTime(item.watch_time);
        const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';
        
        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${index + 1}</div>
                <span class="device-id">Device #${item.device_id}</span>
                <span class="score">${value}</span>
            </div>
        `;
    }).join('');
}

function addDiscovery(discovery) {
    const feed = document.getElementById('discovery-feed');
    if (!feed) return;
    
    const empty = feed.querySelector('.discovery-empty');
    if (empty) empty.remove();
    
    const item = document.createElement('div');
    item.innerHTML = createDiscoveryItem(discovery);
    feed.insertBefore(item.firstElementChild, feed.firstChild);
    
    while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
    }
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

// ==================== Utilities ====================
function showBoardDetail(boardId) {
    showToast(`폰보드 ${boardId} 상세 정보`, 'info');
}

function formatWatchTime(seconds) {
    if (seconds < 60) return `${seconds}초`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
    return `${Math.floor(seconds / 3600)}시간`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Make functions globally available
window.clearAlerts = clearAlerts;
window.showBoardDetail = showBoardDetail;
window.showToast = showToast;


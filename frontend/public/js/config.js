/**
 * AIFarm Frontend Configuration
 * 
 * 이 파일에서 백엔드 API URL을 설정합니다.
 * Vercel 배포 시 환경에 맞게 수정하세요.
 */

// API Configuration
const CONFIG = {
    // 백엔드 API URL (배포 시 실제 URL로 변경)
    // 예: 'https://your-backend.railway.app' 또는 'https://your-api.render.com'
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8080'  // 로컬 개발 시
        : '/api',                  // Vercel 프록시 사용 시 (vercel.json의 rewrites 참조)
    
    // WebSocket URL
    WS_BASE_URL: window.location.hostname === 'localhost'
        ? 'ws://localhost:8080'
        : `wss://${window.location.host}`,
    
    // 디버그 모드
    DEBUG: window.location.hostname === 'localhost',
    
    // API 타임아웃 (ms)
    TIMEOUT: 30000,
    
    // 재시도 횟수
    RETRY_COUNT: 3,
    
    // WebSocket 재연결 간격 (ms)
    WS_RECONNECT_INTERVAL: 5000,
};

// API Helper Functions
const API = {
    /**
     * GET 요청
     */
    async get(endpoint) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return response.json();
    },
    
    /**
     * POST 요청
     */
    async post(endpoint, data) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API Error: ${response.status}`);
        }
        
        return response.json();
    },
    
    /**
     * PUT 요청
     */
    async put(endpoint, data) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `API Error: ${response.status}`);
        }
        
        return response.json();
    },
    
    /**
     * DELETE 요청
     */
    async delete(endpoint) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return response.json();
    },
    
    /**
     * WebSocket 연결
     */
    connectWebSocket(path) {
        const url = `${CONFIG.WS_BASE_URL}${path}`;
        return new WebSocket(url);
    },
    
    /**
     * API 연결 상태 확인
     */
    async checkHealth() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }
};

// 전역으로 사용 가능하게 설정
window.CONFIG = CONFIG;
window.API = API;

// 초기 API 상태 확인
document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('api-status');
    if (statusEl) {
        const isHealthy = await API.checkHealth();
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('span');
        
        if (isHealthy) {
            dot.className = 'status-dot online';
            text.textContent = 'API 연결됨';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = 'API 연결 실패';
        }
    }
});

console.log('🔧 AIFarm Config Loaded:', {
    API_BASE_URL: CONFIG.API_BASE_URL,
    DEBUG: CONFIG.DEBUG,
});


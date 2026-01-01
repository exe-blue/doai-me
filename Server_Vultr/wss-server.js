/**
 * WSS Tunnel Server (Vultr Brain)
 * 
 * Orion's Directive:
 * "Vultr(중앙)와 T5810(로컬)을 잇는 WSS 터널링을 구축해라.
 *  이 통로가 끊어지면 아이들은 고립(Isolation)된다.
 *  연결 안정성을 최우선으로 확보해라."
 * 
 * @author Strategos (Operations Lead)
 * @version 1.0.0
 */

require('dotenv').config();
const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const express = require('express');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ==================== 설정 ====================
const WSS_PORT = process.env.WSS_PORT || 8443;
const HTTP_PORT = process.env.HTTP_PORT || 8080;
const WSS_PATH = process.env.WSS_PATH || '/tunnel';

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL) || 30000;  // 30초
const HEARTBEAT_TIMEOUT = parseInt(process.env.HEARTBEAT_TIMEOUT) || 60000;    // 60초

// SSL 인증서 (Let's Encrypt)
const USE_SSL = process.env.NODE_ENV === 'production';

// Supabase (로그 저장용)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ==================== 로거 ====================
const logger = {
  info: (msg, data = {}) => console.log(`[INFO] ${msg}`, JSON.stringify(data)),
  warn: (msg, data = {}) => console.warn(`[WARN] ${msg}`, JSON.stringify(data)),
  error: (msg, data = {}) => console.error(`[ERROR] ${msg}`, JSON.stringify(data))
};

// ==================== WebSocket 서버 ====================
let httpServer;

if (USE_SSL) {
  httpServer = https.createServer({
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    key: fs.readFileSync(process.env.SSL_KEY_PATH)
  });
} else {
  httpServer = http.createServer();
}

const wss = new WebSocket.Server({ 
  server: httpServer,
  path: WSS_PATH
});

// T5810 Gateway 연결 추적
let t5810Connection = null;
let lastHeartbeat = Date.now();
let heartbeatInterval = null;

// ==================== WSS 이벤트 핸들러 ====================

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  logger.info('🔗 WSS 연결 시도', { ip: clientIp });
  
  // 연결 메타데이터
  ws.clientIp = clientIp;
  ws.connectedAt = Date.now();
  ws.lastHeartbeat = Date.now();
  ws.nodeId = null;
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await handleMessage(ws, msg);
    } catch (e) {
      logger.error('메시지 파싱 실패', { error: e.message });
    }
  });
  
  ws.on('close', () => {
    logger.warn('🔌 연결 종료', { 
      ip: clientIp,
      nodeId: ws.nodeId,
      duration: Math.floor((Date.now() - ws.connectedAt) / 1000) + 's'
    });
    
    if (ws === t5810Connection) {
      t5810Connection = null;
      logger.error('🚨 T5810 Gateway 연결 끊김!');
      
      // Supabase 로그
      logWssEvent('T5810', 'DISCONNECT');
      
      // 하트비트 중지
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  });
  
  ws.on('error', (error) => {
    logger.error('❌ WSS 에러', { 
      nodeId: ws.nodeId,
      error: error.message 
    });
    
    logWssEvent(ws.nodeId || 'UNKNOWN', 'ERROR', {
      error_message: error.message
    });
  });
});

// ==================== 메시지 핸들러 ====================

async function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'IDENTIFY':
      // T5810 Gateway 식별
      if (msg.role === 'T5810_GATEWAY') {
        t5810Connection = ws;
        ws.nodeId = 'T5810';
        
        logger.info('✅ T5810 Gateway 인증 완료', {
          ip: ws.clientIp,
          timestamp: new Date(msg.timestamp).toISOString()
        });
        
        // Supabase 로그
        await logWssEvent('T5810', 'CONNECT');
        
        // 하트비트 시작
        startHeartbeat();
        
        // 인증 응답
        ws.send(JSON.stringify({
          type: 'IDENTIFY_ACK',
          server: 'VULTR',
          timestamp: Date.now()
        }));
      }
      break;
    
    case 'STATUS_REPORT':
      // T5810 상태 보고
      logger.info('📊 T5810 상태 보고', {
        connected_devices: msg.payload?.connected_devices,
        timestamp: new Date(msg.timestamp).toISOString()
      });
      
      lastHeartbeat = Date.now();
      ws.lastHeartbeat = Date.now();
      
      // Supabase 로그
      await logWssEvent('T5810', 'HEARTBEAT', {
        connected_devices: msg.payload?.connected_devices,
        latency_ms: Date.now() - msg.timestamp
      });
      break;
    
    case 'HEARTBEAT_ACK':
      // 하트비트 응답
      lastHeartbeat = Date.now();
      ws.lastHeartbeat = Date.now();
      break;
    
    default:
      logger.warn('알 수 없는 메시지 타입', { type: msg.type });
  }
}

// ==================== 하트비트 ====================

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  logger.info('💓 하트비트 시작', { interval: `${HEARTBEAT_INTERVAL}ms` });
  
  heartbeatInterval = setInterval(() => {
    if (t5810Connection && t5810Connection.readyState === WebSocket.OPEN) {
      // 하트비트 전송
      t5810Connection.send(JSON.stringify({ 
        type: 'HEARTBEAT', 
        timestamp: Date.now() 
      }));
      
      // 타임아웃 체크
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        logger.error('🚨 하트비트 타임아웃!', {
          lastHeartbeat: new Date(lastHeartbeat).toISOString(),
          elapsed: `${Math.floor(timeSinceLastHeartbeat / 1000)}s`
        });
        
        // Supabase 로그
        logWssEvent('T5810', 'HEARTBEAT_TIMEOUT');
      }
    } else {
      logger.warn('⚠️  T5810 연결 없음, 하트비트 중지');
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }, HEARTBEAT_INTERVAL);
}

// ==================== Supabase 로깅 ====================

async function logWssEvent(nodeId, eventType, extraData = {}) {
  try {
    const { error } = await supabase.rpc('log_wss_event', {
      p_node_id: nodeId,
      p_event_type: eventType,
      p_latency_ms: extraData.latency_ms || null,
      p_connected_devices: extraData.connected_devices || null,
      p_error_message: extraData.error_message || null,
      p_metadata: extraData.metadata || {}
    });
    
    if (error) {
      logger.error('Supabase 로그 실패', { error: error.message });
    }
  } catch (e) {
    logger.error('로그 예외', { error: e.message });
  }
}

// ==================== HTTP API (명령 전송용) ====================

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  const status = {
    wss_server: 'running',
    t5810_connected: t5810Connection !== null,
    last_heartbeat: new Date(lastHeartbeat).toISOString(),
    uptime: process.uptime()
  };
  
  res.json(status);
});

// 명령 전송
app.post('/api/dispatch', (req, res) => {
  const { target, type, payload } = req.body;
  
  if (!t5810Connection || t5810Connection.readyState !== WebSocket.OPEN) {
    return res.status(503).json({
      success: false,
      error: 'T5810 Gateway not connected'
    });
  }
  
  try {
    t5810Connection.send(JSON.stringify({
      type: 'DISPATCH',
      target,
      commandType: type,
      payload,
      timestamp: Date.now()
    }));
    
    logger.info('📤 명령 전송', { target, type });
    
    res.json({
      success: true,
      message: 'Command dispatched to T5810'
    });
  } catch (e) {
    logger.error('명령 전송 실패', { error: e.message });
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// WSS 연결 상태 조회
app.get('/api/wss/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wss_connection_status')
      .select('*');
    
    if (error) throw error;
    
    res.json({
      success: true,
      status: data || []
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

// HTTP 서버 시작
app.listen(HTTP_PORT, () => {
  logger.info('🌐 HTTP API', { port: HTTP_PORT });
});

// ==================== 서버 시작 ====================

httpServer.listen(WSS_PORT, () => {
  logger.info('╔════════════════════════════════════════════════════════╗');
  logger.info('║  WSS Tunnel Server (Vultr Brain)                     ║');
  logger.info('╚════════════════════════════════════════════════════════╝');
  logger.info('🌐 WSS Server', { 
    url: `${USE_SSL ? 'wss' : 'ws'}://doai.me:${WSS_PORT}${WSS_PATH}`,
    ssl: USE_SSL
  });
  logger.info('💓 Heartbeat', { 
    interval: `${HEARTBEAT_INTERVAL}ms`,
    timeout: `${HEARTBEAT_TIMEOUT}ms`
  });
});

// ==================== Graceful Shutdown ====================

process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM 수신, 서버 종료 중...');
  
  // T5810에 종료 알림
  if (t5810Connection) {
    t5810Connection.send(JSON.stringify({ type: 'SERVER_SHUTDOWN' }));
  }
  
  wss.close(() => {
    logger.info('✅ WSS 서버 종료 완료');
    process.exit(0);
  });
});

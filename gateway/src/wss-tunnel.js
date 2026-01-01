/**
 * WSS Tunnel Client (T5810 Gateway)
 * 
 * Orion's Directive:
 * "Vultr(중앙)와 T5810(로컬)을 잇는 WSS 터널링을 구축해라."
 * 
 * 역할:
 * - Vultr WSS 서버에 연결
 * - 명령 수신 및 로컬 디바이스에 전달
 * - 상태 보고 (하트비트)
 * - 자동 재연결 (지수 백오프)
 * 
 * @author Strategos (Operations Lead)
 * @version 1.0.0
 */

const WebSocket = require('ws');

class WssTunnel {
  constructor(logger, dispatcher, config) {
    this.logger = logger;
    this.dispatcher = dispatcher;
    this.config = config || {
      serverUrl: process.env.WSS_SERVER_URL || 'wss://doai.me:8443/tunnel',
      reconnectMaxAttempts: parseInt(process.env.WSS_RECONNECT_MAX_ATTEMPTS) || 10,
      heartbeatInterval: 30000
    };
    
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.heartbeatInterval = null;
  }

  /**
   * 연결 시작
   */
  connect() {
    this.logger.info('🔗 WSS 터널 연결 시도', { 
      url: this.config.serverUrl 
    });

    this.ws = new WebSocket(this.config.serverUrl, {
      rejectUnauthorized: true,  // SSL 인증서 검증
      handshakeTimeout: 10000
    });

    this.ws.on('open', () => {
      this.logger.info('✅ WSS 터널 연결 성공');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // T5810 Gateway 식별
      this.send({
        type: 'IDENTIFY',
        role: 'T5810_GATEWAY',
        timestamp: Date.now()
      });

      // 하트비트 시작
      this.startHeartbeat();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (e) {
        this.logger.error('WSS 메시지 파싱 실패', { error: e.message });
      }
    });

    this.ws.on('close', (code, reason) => {
      this.logger.warn('🔌 WSS 터널 연결 종료', { 
        code, 
        reason: reason.toString() 
      });
      
      this.isConnected = false;
      
      // 하트비트 중지
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // 자동 재연결
      this.reconnect();
    });

    this.ws.on('error', (error) => {
      this.logger.error('❌ WSS 에러', { error: error.message });
    });
  }

  /**
   * 메시지 핸들러
   */
  handleMessage(msg) {
    switch (msg.type) {
      case 'IDENTIFY_ACK':
        // 서버 인증 확인
        this.logger.info('✅ Vultr 서버 인증 완료', {
          server: msg.server,
          timestamp: new Date(msg.timestamp).toISOString()
        });
        break;

      case 'HEARTBEAT':
        // 하트비트 수신 → 응답
        this.send({ 
          type: 'HEARTBEAT_ACK', 
          timestamp: Date.now() 
        });
        break;

      case 'DISPATCH':
        // 명령 수신 → 로컬 디바이스에 전달
        this.logger.info('📨 명령 수신', { 
          target: msg.target, 
          type: msg.commandType 
        });
        
        try {
          // Dispatcher를 통해 로컬 디바이스에 전달
          this.dispatcher.dispatch(msg.target, msg.commandType, msg.payload);
          
          // 성공 응답
          this.send({
            type: 'DISPATCH_ACK',
            success: true,
            timestamp: Date.now()
          });
        } catch (e) {
          this.logger.error('명령 전달 실패', { error: e.message });
          
          // 실패 응답
          this.send({
            type: 'DISPATCH_ACK',
            success: false,
            error: e.message,
            timestamp: Date.now()
          });
        }
        break;

      case 'SERVER_SHUTDOWN':
        // 서버 종료 알림
        this.logger.warn('🛑 Vultr 서버 종료 알림');
        this.isConnected = false;
        break;

      default:
        this.logger.warn('알 수 없는 메시지 타입', { type: msg.type });
    }
  }

  /**
   * 메시지 전송
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * 하트비트 (상태 보고)
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        const connectedDevices = this.dispatcher.getConnectedDeviceCount();
        
        this.send({
          type: 'STATUS_REPORT',
          payload: {
            connected_devices: connectedDevices,
            gateway_uptime: process.uptime(),
            memory_usage: process.memoryUsage()
          },
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 재연결 (지수 백오프)
   */
  reconnect() {
    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      this.logger.error('🚨 WSS 재연결 실패 (최대 시도 초과)', {
        attempts: this.reconnectAttempts
      });
      
      // TODO: 긴급 알림 (SMS/이메일)
      return;
    }

    this.reconnectAttempts++;
    
    // 지수 백오프: 1s, 2s, 4s, 8s, 16s, 32s (최대 30초)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.logger.info('🔄 WSS 재연결 시도', {
      attempt: `${this.reconnectAttempts}/${this.config.reconnectMaxAttempts}`,
      delay: `${delay}ms`
    });

    setTimeout(() => this.connect(), delay);
  }

  /**
   * 연결 상태 확인
   */
  isAlive() {
    return this.isConnected && 
           this.ws && 
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 수동 종료
   */
  close() {
    this.logger.info('🛑 WSS 터널 수동 종료');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = WssTunnel;

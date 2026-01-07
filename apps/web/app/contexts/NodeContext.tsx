'use client';

// ============================================
// DoAi.ME - Node Context v4.0
// 
// 용어:
// - Node (노드) = PC (Bridge 실행 컴퓨터)
// - Device (디바이스) = 스마트폰 (Android 기기)
// 
// 아키텍처: N개의 Node에 각각 M개의 Device가 연결됨
// 모든 Node는 WebSocket으로 연결
// ============================================

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';

// ============================================
// Types
// ============================================

export type DeviceStatus = 'idle' | 'busy' | 'error' | 'offline';
export type NodeStatus = 'online' | 'offline' | 'reconnecting';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Node = PC (Gateway Bridge)
export interface GatewayNode {
  id: string;
  hostname: string;
  ipAddress: string;
  platform: string;
  status: NodeStatus;
  deviceCount: number;
  onlineDeviceCount: number;
  laixiConnected: boolean;
  lastSeen: Date;
  reconnectAttempts: number;
}

// Device = 스마트폰
export interface Device {
  id: string;
  serial: string;
  name: string;
  model: string;
  status: DeviceStatus;
  wallet: number;
  currentTask: { videoId: string; title: string } | null;
  lastSeen: Date;
  traits: string[];
  nodeId: string; // 이 디바이스가 속한 노드 ID
  errorMessage?: string;
  recoveryAttempts: number;
}

export interface QueuedVideo {
  id: string;
  videoId: string;
  title: string;
  url: string;
  thumbnail?: string;
  channel?: string;
  registeredAt: Date;
  status: 'queued' | 'running' | 'paused';
  assignedDevices: string[];
  progress: number;
  targetViews: number;
  currentViews: number;
  source?: 'manual' | 'auto_subscribe';
}

export interface CompletedVideo {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  channel?: string;
  completedAt: Date;
  totalViews: number;
  successCount: number;
  errorCount: number;
  duration: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  nodeId?: string;
  deviceId?: string;
}

export interface SystemStats {
  totalNodes: number;
  onlineNodes: number;
  totalDevices: number;
  idleDevices: number;
  busyDevices: number;
  errorDevices: number;
  offlineDevices: number;
  totalViews: number;
  todayViews: number;
}

// ============================================
// State
// ============================================

interface NodeState {
  nodes: Map<string, GatewayNode>;
  devices: Map<string, Device>;
  queuedVideos: QueuedVideo[];
  completedVideos: CompletedVideo[];
  logs: LogEntry[];
  stats: SystemStats;
  connectionStatus: ConnectionStatus;
  lastError: string | null;
}

// ============================================
// Actions
// ============================================

type NodeAction =
  // Node 액션
  | { type: 'SET_NODE'; payload: GatewayNode }
  | { type: 'UPDATE_NODE'; payload: Partial<GatewayNode> & { id: string } }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'SET_NODE_OFFLINE'; payload: string }
  // Device 액션
  | { type: 'SET_DEVICES'; payload: { nodeId: string; devices: Device[] } }
  | { type: 'UPDATE_DEVICE'; payload: Partial<Device> & { id: string } }
  | { type: 'SET_DEVICE_OFFLINE'; payload: string }
  | { type: 'SET_ALL_DEVICES_OFFLINE'; payload: string } // nodeId
  // Video 액션
  | { type: 'ADD_QUEUED_VIDEO'; payload: QueuedVideo }
  | { type: 'UPDATE_QUEUED_VIDEO'; payload: Partial<QueuedVideo> & { id: string } }
  | { type: 'REMOVE_QUEUED_VIDEO'; payload: string }
  | { type: 'ADD_COMPLETED_VIDEO'; payload: CompletedVideo }
  // 기타 액션
  | { type: 'ADD_LOG'; payload: Omit<LogEntry, 'id' | 'timestamp'> }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_STATS' }
  | { type: 'RESET_STATE' };

// ============================================
// Initial State
// ============================================

const initialStats: SystemStats = {
  totalNodes: 0,
  onlineNodes: 0,
  totalDevices: 0,
  idleDevices: 0,
  busyDevices: 0,
  errorDevices: 0,
  offlineDevices: 0,
  totalViews: 0,
  todayViews: 0,
};

const initialState: NodeState = {
  nodes: new Map(),
  devices: new Map(),
  queuedVideos: [],
  completedVideos: [],
  logs: [],
  stats: initialStats,
  connectionStatus: 'disconnected',
  lastError: null,
};

// ============================================
// Reducer
// ============================================

function calculateStats(nodes: Map<string, GatewayNode>, devices: Map<string, Device>, prevStats: SystemStats): SystemStats {
  const nodeArray = Array.from(nodes.values());
  const deviceArray = Array.from(devices.values());

  return {
    totalNodes: nodeArray.length,
    onlineNodes: nodeArray.filter(n => n.status === 'online').length,
    totalDevices: deviceArray.length,
    idleDevices: deviceArray.filter(d => d.status === 'idle').length,
    busyDevices: deviceArray.filter(d => d.status === 'busy').length,
    errorDevices: deviceArray.filter(d => d.status === 'error').length,
    offlineDevices: deviceArray.filter(d => d.status === 'offline').length,
    totalViews: prevStats.totalViews,
    todayViews: prevStats.todayViews,
  };
}

function nodeReducer(state: NodeState, action: NodeAction): NodeState {
  switch (action.type) {
    // ─── Node 액션 ───
    case 'SET_NODE': {
      const newNodes = new Map(state.nodes);
      newNodes.set(action.payload.id, action.payload);
      const newStats = calculateStats(newNodes, state.devices, state.stats);
      return { ...state, nodes: newNodes, stats: newStats };
    }

    case 'UPDATE_NODE': {
      const newNodes = new Map(state.nodes);
      const existing = newNodes.get(action.payload.id);
      if (existing) {
        newNodes.set(action.payload.id, { ...existing, ...action.payload });
        const newStats = calculateStats(newNodes, state.devices, state.stats);
        return { ...state, nodes: newNodes, stats: newStats };
      }
      return state;
    }

    case 'REMOVE_NODE': {
      const newNodes = new Map(state.nodes);
      newNodes.delete(action.payload);
      // 해당 노드의 디바이스도 제거
      const newDevices = new Map(state.devices);
      state.devices.forEach((device, id) => {
        if (device.nodeId === action.payload) {
          newDevices.delete(id);
        }
      });
      const newStats = calculateStats(newNodes, newDevices, state.stats);
      return { ...state, nodes: newNodes, devices: newDevices, stats: newStats };
    }

    case 'SET_NODE_OFFLINE': {
      const newNodes = new Map(state.nodes);
      const node = newNodes.get(action.payload);
      if (node) {
        newNodes.set(action.payload, { 
          ...node, 
          status: 'offline',
          laixiConnected: false,
          onlineDeviceCount: 0,
        });
      }
      const newStats = calculateStats(newNodes, state.devices, state.stats);
      return { ...state, nodes: newNodes, stats: newStats };
    }

    // ─── Device 액션 ───
    case 'SET_DEVICES': {
      const newDevices = new Map(state.devices);
      // 먼저 해당 노드의 기존 디바이스 제거
      state.devices.forEach((device, id) => {
        if (device.nodeId === action.payload.nodeId) {
          newDevices.delete(id);
        }
      });
      // 새 디바이스 추가
      action.payload.devices.forEach(device => {
        newDevices.set(device.id, device);
      });
      const newStats = calculateStats(state.nodes, newDevices, state.stats);
      return { ...state, devices: newDevices, stats: newStats };
    }

    case 'UPDATE_DEVICE': {
      const newDevices = new Map(state.devices);
      const existing = newDevices.get(action.payload.id);
      if (existing) {
        newDevices.set(action.payload.id, { ...existing, ...action.payload });
        const newStats = calculateStats(state.nodes, newDevices, state.stats);
        return { ...state, devices: newDevices, stats: newStats };
      }
      return state;
    }

    case 'SET_DEVICE_OFFLINE': {
      const newDevices = new Map(state.devices);
      const device = newDevices.get(action.payload);
      if (device) {
        newDevices.set(action.payload, {
          ...device,
          status: 'offline',
          currentTask: null,
        });
        const newStats = calculateStats(state.nodes, newDevices, state.stats);
        return { ...state, devices: newDevices, stats: newStats };
      }
      return state;
    }

    case 'SET_ALL_DEVICES_OFFLINE': {
      const newDevices = new Map(state.devices);
      state.devices.forEach((device, id) => {
        if (device.nodeId === action.payload) {
          newDevices.set(id, {
            ...device,
            status: 'offline',
            currentTask: null,
          });
        }
      });
      const newStats = calculateStats(state.nodes, newDevices, state.stats);
      return { ...state, devices: newDevices, stats: newStats };
    }

    // ─── Video 액션 ───
    case 'ADD_QUEUED_VIDEO':
      return { ...state, queuedVideos: [...state.queuedVideos, action.payload] };

    case 'UPDATE_QUEUED_VIDEO':
      return {
        ...state,
        queuedVideos: state.queuedVideos.map(v =>
          v.id === action.payload.id ? { ...v, ...action.payload } : v
        ),
      };

    case 'REMOVE_QUEUED_VIDEO':
      return { ...state, queuedVideos: state.queuedVideos.filter(v => v.id !== action.payload) };

    case 'ADD_COMPLETED_VIDEO':
      return {
        ...state,
        completedVideos: [action.payload, ...state.completedVideos],
        stats: {
          ...state.stats,
          totalViews: state.stats.totalViews + action.payload.totalViews,
          todayViews: state.stats.todayViews + action.payload.totalViews,
        },
      };

    // ─── 기타 액션 ───
    case 'ADD_LOG': {
      const newLog: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date(),
        ...action.payload,
      };
      return { ...state, logs: [newLog, ...state.logs.slice(0, 199)] }; // 최대 200개
    }

    case 'CLEAR_LOGS':
      return { ...state, logs: [] };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_ERROR':
      return { ...state, lastError: action.payload };

    case 'UPDATE_STATS': {
      const newStats = calculateStats(state.nodes, state.devices, state.stats);
      return { ...state, stats: newStats };
    }

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// ============================================
// Context Interface
// ============================================

interface NodeContextValue {
  state: NodeState;
  
  // 노드(PC) 관리
  nodes: GatewayNode[];
  getNodeById: (id: string) => GatewayNode | undefined;
  getOnlineNodes: () => GatewayNode[];
  
  // 디바이스(스마트폰) 관리
  devices: Device[];
  getDeviceById: (id: string) => Device | undefined;
  getDevicesByNodeId: (nodeId: string) => Device[];
  getIdleDevices: () => Device[];
  getBusyDevices: () => Device[];
  
  // 비디오 관리
  addVideo: (video: Omit<QueuedVideo, 'id' | 'registeredAt' | 'status' | 'assignedDevices' | 'progress' | 'currentViews'>) => void;
  updateVideo: (video: Partial<QueuedVideo> & { id: string }) => void;
  completeVideo: (videoId: string, stats: { successCount: number; errorCount: number }) => void;
  injectVideo: (video: { videoId: string; title: string; url: string; thumbnail?: string; channel?: string }, targetViews: number, options?: Record<string, unknown>) => void;
  
  // 로그
  addLog: (level: LogEntry['level'], message: string, nodeId?: string, deviceId?: string) => void;
  clearLogs: () => void;
  
  // 연결
  connect: () => void;
  disconnect: () => void;
  refreshDevices: () => void;
  sendCommand: (deviceId: string, command: string, params?: Record<string, unknown>) => void;
}

const NodeContext = createContext<NodeContextValue | null>(null);

// ============================================
// Provider
// ============================================

const getWebSocketUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8080';
  return process.env.NEXT_PUBLIC_DOAI_WS_URL || 'ws://localhost:8080';
};

interface NodeProviderProps {
  children: ReactNode;
  wsEndpoint?: string;
}

export function NodeProvider({ children, wsEndpoint }: NodeProviderProps) {
  const effectiveWsEndpoint = wsEndpoint || getWebSocketUrl();
  const [state, dispatch] = useReducer(nodeReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 3000;
  const HEALTH_CHECK_INTERVAL = 30000;
  const DEVICE_TIMEOUT = 60000; // 60초 응답 없으면 오프라인

  // ─────────────────────────────────────────
  // WebSocket 연결 관리
  // ─────────────────────────────────────────

  const connect = useCallback(() => {
    if (!effectiveWsEndpoint) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      dispatch({ type: 'ADD_LOG', payload: { level: 'error', message: 'WebSocket URL이 설정되지 않았습니다' } });
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    dispatch({ type: 'ADD_LOG', payload: { level: 'info', message: `Bridge 연결 중: ${effectiveWsEndpoint}` } });

    try {
      const ws = new WebSocket(effectiveWsEndpoint);

      ws.onopen = () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
        dispatch({ type: 'SET_ERROR', payload: null });
        dispatch({ type: 'ADD_LOG', payload: { level: 'success', message: '✓ Bridge 연결 성공' } });
        reconnectAttemptsRef.current = 0;

        // 초기 상태 요청
        ws.send(JSON.stringify({ type: 'GET_STATE' }));
        
        // 헬스체크 시작
        startHealthCheck();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          dispatch({ type: 'ADD_LOG', payload: { level: 'error', message: `메시지 파싱 오류: ${error}` } });
        }
      };

      ws.onerror = () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'ADD_LOG', payload: { level: 'error', message: 'Bridge 연결 오류' } });
      };

      ws.onclose = () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
        wsRef.current = null;
        stopHealthCheck();

        // 모든 노드 오프라인 처리
        state.nodes.forEach((node) => {
          dispatch({ type: 'SET_NODE_OFFLINE', payload: node.id });
          dispatch({ type: 'SET_ALL_DEVICES_OFFLINE', payload: node.id });
        });

        // 재연결 시도
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          dispatch({
            type: 'ADD_LOG',
            payload: {
              level: 'warn',
              message: `연결 끊김. ${RECONNECT_DELAY / 1000}초 후 재연결 (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
            },
          });

          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        } else {
          dispatch({
            type: 'SET_ERROR',
            payload: '최대 재연결 시도 초과. 수동으로 재연결하세요.',
          });
          dispatch({ type: 'ADD_LOG', payload: { level: 'error', message: '❌ Bridge 연결 실패' } });
        }
      };

      wsRef.current = ws;
    } catch (error) {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: `연결 실패: ${error}` });
    }
  }, [effectiveWsEndpoint, state.nodes]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHealthCheck();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
  }, []);

  // ─────────────────────────────────────────
  // 헬스체크 (디바이스/노드 상태 모니터링)
  // ─────────────────────────────────────────

  const startHealthCheck = useCallback(() => {
    stopHealthCheck();
    
    healthCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // 디바이스 헬스체크
      state.devices.forEach((device) => {
        const lastSeen = new Date(device.lastSeen).getTime();
        if (now - lastSeen > DEVICE_TIMEOUT && device.status !== 'offline') {
          dispatch({ type: 'SET_DEVICE_OFFLINE', payload: device.id });
          dispatch({
            type: 'ADD_LOG',
            payload: {
              level: 'warn',
              message: `디바이스 오프라인: ${device.name}`,
              deviceId: device.id,
            },
          });
        }
      });

      // 노드 헬스체크
      state.nodes.forEach((node) => {
        const lastSeen = new Date(node.lastSeen).getTime();
        if (now - lastSeen > DEVICE_TIMEOUT && node.status !== 'offline') {
          dispatch({ type: 'SET_NODE_OFFLINE', payload: node.id });
          dispatch({ type: 'SET_ALL_DEVICES_OFFLINE', payload: node.id });
          dispatch({
            type: 'ADD_LOG',
            payload: {
              level: 'error',
              message: `노드 오프라인: ${node.hostname}`,
              nodeId: node.id,
            },
          });
        }
      });
    }, HEALTH_CHECK_INTERVAL);
  }, [state.devices, state.nodes]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────
  // WebSocket 메시지 핸들러
  // ─────────────────────────────────────────

  const handleWebSocketMessage = useCallback((data: Record<string, unknown>) => {
    switch (data.type) {
      case 'INIT':
      case 'STATE_UPDATE': {
        // 노드(PC) 정보 처리
        if (data.node) {
          const node = convertNodeData(data.node as Record<string, unknown>);
          dispatch({ type: 'SET_NODE', payload: node });
          
          if (data.type === 'INIT') {
            dispatch({
              type: 'ADD_LOG',
              payload: {
                level: 'success',
                message: `노드 연결됨: ${node.hostname} (${node.ipAddress})`,
                nodeId: node.id,
              },
            });
          }
        }
        
        // 디바이스(스마트폰) 정보 처리
        if (data.devices && Array.isArray(data.devices)) {
          const nodeId = (data.node as Record<string, unknown>)?.id as string || 'unknown';
          const devices = (data.devices as Array<Record<string, unknown>>).map(d => 
            convertDeviceData(d, nodeId)
          );
          dispatch({ type: 'SET_DEVICES', payload: { nodeId, devices } });
          
          if (data.type === 'INIT') {
            const onlineCount = devices.filter(d => d.status !== 'offline').length;
            dispatch({
              type: 'ADD_LOG',
              payload: {
                level: 'info',
                message: `${devices.length}개 디바이스 (${onlineCount}개 온라인)`,
                nodeId,
              },
            });
          }
        }
        break;
      }

      case 'DEVICE_STATUS': {
        dispatch({
          type: 'UPDATE_DEVICE',
          payload: {
            id: data.deviceId as string,
            status: data.status as DeviceStatus,
            currentTask: data.currentTask as { videoId: string; title: string } | null,
            lastSeen: new Date(),
          },
        });
        break;
      }

      case 'DEVICE_ERROR': {
        const deviceId = data.deviceId as string;
        dispatch({
          type: 'UPDATE_DEVICE',
          payload: {
            id: deviceId,
            status: 'error',
            errorMessage: data.error as string,
            currentTask: null,
          },
        });
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: 'error',
            message: `디바이스 오류: ${data.error}`,
            deviceId,
          },
        });
        break;
      }

      case 'DEVICE_RECOVERED': {
        const deviceId = data.deviceId as string;
        dispatch({
          type: 'UPDATE_DEVICE',
          payload: {
            id: deviceId,
            status: 'idle',
            errorMessage: undefined,
            recoveryAttempts: 0,
            lastSeen: new Date(),
          },
        });
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: 'success',
            message: `디바이스 복구됨`,
            deviceId,
          },
        });
        break;
      }

      case 'LAIXI_CONNECTED': {
        const nodeId = data.nodeId as string;
        dispatch({
          type: 'UPDATE_NODE',
          payload: { id: nodeId, laixiConnected: true, status: 'online' },
        });
        dispatch({
          type: 'ADD_LOG',
          payload: { level: 'success', message: '✓ Laixi 연결됨', nodeId },
        });
        break;
      }

      case 'LAIXI_DISCONNECTED': {
        const nodeId = data.nodeId as string;
        dispatch({
          type: 'UPDATE_NODE',
          payload: { id: nodeId, laixiConnected: false },
        });
        dispatch({ type: 'SET_ALL_DEVICES_OFFLINE', payload: nodeId });
        dispatch({
          type: 'ADD_LOG',
          payload: { level: 'error', message: '⚠ Laixi 연결 끊김 - 디바이스 오프라인', nodeId },
        });
        break;
      }

      case 'LAIXI_RECONNECTING': {
        const nodeId = data.nodeId as string;
        const attempt = data.attempt as number;
        dispatch({
          type: 'UPDATE_NODE',
          payload: { id: nodeId, status: 'reconnecting', reconnectAttempts: attempt },
        });
        dispatch({
          type: 'ADD_LOG',
          payload: { level: 'warn', message: `Laixi 재연결 시도 중 (${attempt}/10)`, nodeId },
        });
        break;
      }

      case 'VIDEO_PROGRESS': {
        dispatch({
          type: 'UPDATE_QUEUED_VIDEO',
          payload: {
            id: data.videoId as string,
            currentViews: data.currentViews as number,
            progress: data.progress as number,
          },
        });
        break;
      }

      case 'WATCH_PROGRESS': {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: 'info',
            message: `📺 시청 중: ${data.progress}%`,
            deviceId: data.deviceId as string,
          },
        });
        break;
      }

      case 'VIDEO_DISTRIBUTED': {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: 'success',
            message: `영상 배분: ${data.distributedCount}개 디바이스`,
          },
        });
        break;
      }

      case 'VIDEO_COMPLETE': {
        completeVideoFromWs(
          data.videoId as string,
          data.stats as { successCount: number; errorCount: number }
        );
        break;
      }

      case 'INJECT_RESULT': {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: data.success ? 'success' : 'error',
            message: data.success
              ? `✓ ${data.distributedCount}개 디바이스 배분`
              : `배분 실패: ${data.reason || '알 수 없는 오류'}`,
          },
        });
        break;
      }

      case 'DISTRIBUTION_FAILED': {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: 'error',
            message: `배분 실패: ${data.reason || '활성 디바이스 없음'}`,
          },
        });
        break;
      }

      case 'LOG': {
        dispatch({
          type: 'ADD_LOG',
          payload: {
            level: data.level as LogEntry['level'],
            message: data.message as string,
            nodeId: data.nodeId as string | undefined,
            deviceId: data.deviceId as string | undefined,
          },
        });
        break;
      }

      default:
        break;
    }
  }, []);

  // ─────────────────────────────────────────
  // 데이터 변환
  // ─────────────────────────────────────────

  const convertNodeData = (raw: Record<string, unknown>): GatewayNode => ({
    id: raw.id as string,
    hostname: raw.hostname as string || 'Unknown',
    ipAddress: raw.ipAddress as string || '127.0.0.1',
    platform: raw.platform as string || 'unknown',
    status: (raw.status as NodeStatus) || 'online',
    deviceCount: (raw.deviceCount as number) || 0,
    onlineDeviceCount: (raw.onlineDeviceCount as number) || 0,
    laixiConnected: (raw.laixiConnected as boolean) || false,
    lastSeen: raw.lastSeen ? new Date(raw.lastSeen as string) : new Date(),
    reconnectAttempts: (raw.reconnectAttempts as number) || 0,
  });

  const convertDeviceData = (raw: Record<string, unknown>, nodeId: string): Device => ({
    id: raw.id as string,
    serial: raw.serial as string || raw.id as string,
    name: raw.name as string || `Device ${raw.id}`,
    model: raw.model as string || 'Unknown',
    status: (raw.status as DeviceStatus) || 'idle',
    wallet: (raw.wallet as number) || 0,
    currentTask: raw.currentTask as { videoId: string; title: string } | null,
    lastSeen: raw.lastSeen ? new Date(raw.lastSeen as string) : new Date(),
    traits: (raw.traits as string[]) || [],
    nodeId: raw.nodeId as string || nodeId,
    errorMessage: raw.errorMessage as string | undefined,
    recoveryAttempts: (raw.recoveryAttempts as number) || 0,
  });

  // ─────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────

  const addVideo = useCallback((
    video: Omit<QueuedVideo, 'id' | 'registeredAt' | 'status' | 'assignedDevices' | 'progress' | 'currentViews'>
  ) => {
    const newVideo: QueuedVideo = {
      ...video,
      id: `video_${Date.now()}`,
      registeredAt: new Date(),
      status: 'queued',
      assignedDevices: [],
      progress: 0,
      currentViews: 0,
    };

    dispatch({ type: 'ADD_QUEUED_VIDEO', payload: newVideo });
    dispatch({
      type: 'ADD_LOG',
      payload: { level: 'info', message: `영상 등록: "${video.title}"` },
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ADD_VIDEO', video: newVideo }));
    }
  }, []);

  const updateVideo = useCallback((video: Partial<QueuedVideo> & { id: string }) => {
    dispatch({ type: 'UPDATE_QUEUED_VIDEO', payload: video });
  }, []);

  const completeVideo = useCallback((videoId: string, stats: { successCount: number; errorCount: number }) => {
    const video = state.queuedVideos.find(v => v.id === videoId);
    if (!video) return;

    const completedVideo: CompletedVideo = {
      id: video.id,
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      channel: video.channel,
      completedAt: new Date(),
      totalViews: video.currentViews,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      duration: Math.floor((Date.now() - video.registeredAt.getTime()) / 1000),
    };

    dispatch({ type: 'REMOVE_QUEUED_VIDEO', payload: videoId });
    dispatch({ type: 'ADD_COMPLETED_VIDEO', payload: completedVideo });
    dispatch({
      type: 'ADD_LOG',
      payload: { level: 'success', message: `완료: "${video.title}" (${stats.successCount}회)` },
    });
  }, [state.queuedVideos]);

  const completeVideoFromWs = useCallback((videoId: string, stats: { successCount: number; errorCount: number }) => {
    completeVideo(videoId, stats);
  }, [completeVideo]);

  const injectVideo = useCallback((
    video: { videoId: string; title: string; url: string; thumbnail?: string; channel?: string },
    targetViews: number,
    options: Record<string, unknown> = {}
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'INJECT_VIDEO',
        video: { id: `video_${Date.now()}`, ...video },
        targetViews,
        options,
      }));

      dispatch({
        type: 'ADD_LOG',
        payload: { level: 'info', message: `영상 주입: "${video.title}" (${targetViews}회)` },
      });
    } else {
      dispatch({
        type: 'ADD_LOG',
        payload: { level: 'error', message: 'Bridge 연결 안됨' },
      });
    }
  }, []);

  const refreshDevices = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REFRESH_DEVICES' }));
      dispatch({ type: 'ADD_LOG', payload: { level: 'info', message: '디바이스 새로고침' } });
    }
  }, []);

  const sendCommand = useCallback((deviceId: string, command: string, params: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SEND_COMMAND',
        deviceId,
        command,
        params,
      }));
    }
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string, nodeId?: string, deviceId?: string) => {
    dispatch({ type: 'ADD_LOG', payload: { level, message, nodeId, deviceId } });
  }, []);

  const clearLogs = useCallback(() => {
    dispatch({ type: 'CLEAR_LOGS' });
  }, []);

  // ─────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────

  const getNodeById = useCallback((id: string) => state.nodes.get(id), [state.nodes]);
  const getOnlineNodes = useCallback(() => Array.from(state.nodes.values()).filter(n => n.status === 'online'), [state.nodes]);
  
  const getDeviceById = useCallback((id: string) => state.devices.get(id), [state.devices]);
  const getDevicesByNodeId = useCallback((nodeId: string) => 
    Array.from(state.devices.values()).filter(d => d.nodeId === nodeId), [state.devices]);
  const getIdleDevices = useCallback(() => 
    Array.from(state.devices.values()).filter(d => d.status === 'idle'), [state.devices]);
  const getBusyDevices = useCallback(() => 
    Array.from(state.devices.values()).filter(d => d.status === 'busy'), [state.devices]);

  // ─────────────────────────────────────────
  // 초기 연결
  // ─────────────────────────────────────────

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // ─────────────────────────────────────────
  // Context Value
  // ─────────────────────────────────────────

  const contextValue: NodeContextValue = {
    state,
    
    // 노드
    nodes: Array.from(state.nodes.values()),
    getNodeById,
    getOnlineNodes,
    
    // 디바이스
    devices: Array.from(state.devices.values()),
    getDeviceById,
    getDevicesByNodeId,
    getIdleDevices,
    getBusyDevices,
    
    // 비디오
    addVideo,
    updateVideo,
    completeVideo,
    injectVideo,
    
    // 로그
    addLog,
    clearLogs,
    
    // 연결
    connect,
    disconnect,
    refreshDevices,
    sendCommand,
  };

  return (
    <NodeContext.Provider value={contextValue}>
      {children}
    </NodeContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useNodes() {
  const context = useContext(NodeContext);
  if (!context) {
    throw new Error('useNodes must be used within a NodeProvider');
  }
  return context;
}

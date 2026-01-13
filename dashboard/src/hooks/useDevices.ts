/**
 * useDevices Hook
 *
 * 노드 및 디바이스 데이터를 실시간으로 로드하는 훅
 * MOCK 데이터 대신 실제 Supabase 데이터 사용
 *
 * @author DoAi.Me Team
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, RealtimeChannel } from '@/lib/supabase';
import { loadSystemConfig, FEATURE_FLAGS } from '@/lib/config';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════

export type NodeStatus = 'ACTIVE' | 'WAITING' | 'FADING' | 'VOID' | 'INITIALIZING' | 'OFFLINE' | 'MAINTENANCE';
export type DeviceStatus = 'online' | 'offline' | 'busy' | 'error';

export interface NodeData {
  node_id: string;
  node_name: string;
  node_type: string;
  ip_address: string | null;
  status: NodeStatus;
  oobe_completed: boolean;
  oobe_completed_at: string | null;
  hardware_info: Record<string, unknown>;
  os_info: Record<string, unknown>;
  connected_devices: number;
  last_heartbeat: string;
  seconds_since_heartbeat: number;
  total_devices: number;
  online_devices: number;
}

export interface DeviceData {
  serial: string;
  device_name: string | null;
  model: string | null;
  android_version: string | null;
  node_id: string | null;
  status: DeviceStatus;
  registered_by: string | null;
  first_seen: string | null;
  last_seen: string | null;
  first_heartbeat_at: string | null;
  seconds_since_seen: number;
  persona_id: string | null;
  persona_name: string | null;
  persona_state: string | null;
}

export interface NetworkMetrics {
  totalNodes: number;
  activeNodes: number;
  waitingNodes: number;
  fadingNodes: number;
  voidNodes: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  onlinePercentage: number;
  avgDevicesPerNode: number;
}

// ═══════════════════════════════════════════════════════════
// Main Hook
// ═══════════════════════════════════════════════════════════

interface UseDevicesOptions {
  enableRealtime?: boolean;
  refreshInterval?: number;
}

interface UseDevicesReturn {
  nodes: NodeData[];
  devices: DeviceData[];
  metrics: NetworkMetrics;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
  targetDevices: number;
}

/**
 * 노드 및 디바이스 데이터 로드 훅
 */
export function useDevices(options: UseDevicesOptions = {}): UseDevicesReturn {
  const {
    enableRealtime = FEATURE_FLAGS.ENABLE_REALTIME,
    refreshInterval = 30000,
  } = options;

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [targetDevices, setTargetDevices] = useState(300);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 메트릭 계산
  const metrics: NetworkMetrics = calculateMetrics(nodes, devices);

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    try {
      // 시스템 설정 로드
      const config = await loadSystemConfig();
      setTargetDevices(config.targetDevices);

      // 노드 데이터 로드 (view 사용)
      const { data: nodeData, error: nodeError } = await supabase
        .from('view_node_oobe_status')
        .select('*')
        .order('node_id');

      if (nodeError) {
        logger.warn('[useDevices]', '노드 뷰 조회 실패, node_health 직접 조회:', nodeError.message);
        // 뷰 실패 시 직접 조회
        const { data: fallbackNodes, error: fallbackError } = await supabase
          .from('node_health')
          .select('*')
          .order('node_id');

        if (fallbackError) throw fallbackError;
        setNodes(normalizeNodes(fallbackNodes || []));
      } else {
        setNodes(nodeData || []);
      }

      // 디바이스 데이터 로드 (view 사용)
      const { data: deviceData, error: deviceError } = await supabase
        .from('view_device_registration')
        .select('*')
        .order('first_seen', { ascending: false });

      if (deviceError) {
        logger.warn('[useDevices]', '디바이스 뷰 조회 실패, devices 직접 조회:', deviceError.message);
        // 뷰 실패 시 직접 조회
        const { data: fallbackDevices, error: fallbackError } = await supabase
          .from('devices')
          .select('*')
          .order('first_seen', { ascending: false });

        if (fallbackError) throw fallbackError;
        setDevices(normalizeDevices(fallbackDevices || []));
      } else {
        setDevices(deviceData || []);
      }

      setError(null);
    } catch (e) {
      logger.error('[useDevices]', '데이터 로드 실패:', e);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드 및 주기적 갱신
  useEffect(() => {
    loadData();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(loadData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData, refreshInterval]);

  // 실시간 구독
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel('devices-realtime')
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: 'node_health' },
        () => {
          // 노드 변경 시 전체 갱신
          loadData();
        }
      )
      .on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          // 디바이스 변경 시 전체 갱신
          loadData();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, loadData]);

  return {
    nodes,
    devices,
    metrics,
    isLoading,
    error,
    isConnected,
    refresh: loadData,
    targetDevices,
  };
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function calculateMetrics(nodes: NodeData[], devices: DeviceData[]): NetworkMetrics {
  const activeNodes = nodes.filter(n => n.status === 'ACTIVE' || n.status === 'INITIALIZING').length;
  const waitingNodes = nodes.filter(n => n.status === 'WAITING').length;
  const fadingNodes = nodes.filter(n => n.status === 'FADING' || n.status === 'MAINTENANCE').length;
  const voidNodes = nodes.filter(n => n.status === 'VOID' || n.status === 'OFFLINE').length;

  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;

  return {
    totalNodes: nodes.length,
    activeNodes,
    waitingNodes,
    fadingNodes,
    voidNodes,
    totalDevices: devices.length,
    onlineDevices,
    offlineDevices,
    onlinePercentage: devices.length > 0 ? (onlineDevices / devices.length) * 100 : 0,
    avgDevicesPerNode: nodes.length > 0 ? devices.length / nodes.length : 0,
  };
}

// node_health 직접 조회 결과를 NodeData로 변환
function normalizeNodes(rawNodes: Record<string, unknown>[]): NodeData[] {
  return rawNodes.map(node => ({
    node_id: String(node.node_id || ''),
    node_name: String(node.node_name || ''),
    node_type: String(node.node_type || 'MINI_PC'),
    ip_address: node.ip_address ? String(node.ip_address) : null,
    status: (node.status as NodeStatus) || 'OFFLINE',
    oobe_completed: Boolean(node.oobe_completed),
    oobe_completed_at: node.oobe_completed_at ? String(node.oobe_completed_at) : null,
    hardware_info: (node.hardware_info as Record<string, unknown>) || {},
    os_info: (node.os_info as Record<string, unknown>) || {},
    connected_devices: Number(node.connected_devices || 0),
    last_heartbeat: String(node.last_heartbeat || ''),
    seconds_since_heartbeat: 0,
    total_devices: 0,
    online_devices: 0,
  }));
}

// devices 직접 조회 결과를 DeviceData로 변환
function normalizeDevices(rawDevices: Record<string, unknown>[]): DeviceData[] {
  return rawDevices.map(device => ({
    serial: String(device.serial || ''),
    device_name: device.device_name ? String(device.device_name) : null,
    model: device.model ? String(device.model) : null,
    android_version: device.android_version ? String(device.android_version) : null,
    node_id: device.node_id ? String(device.node_id) : null,
    status: (device.status as DeviceStatus) || 'offline',
    registered_by: device.registered_by ? String(device.registered_by) : null,
    first_seen: device.first_seen ? String(device.first_seen) : null,
    last_seen: device.last_seen ? String(device.last_seen) : null,
    first_heartbeat_at: device.first_heartbeat_at ? String(device.first_heartbeat_at) : null,
    seconds_since_seen: 0,
    persona_id: null,
    persona_name: null,
    persona_state: null,
  }));
}

// ═══════════════════════════════════════════════════════════
// Specialized Hooks
// ═══════════════════════════════════════════════════════════

/**
 * 특정 노드의 디바이스 목록
 */
export function useNodeDevices(nodeId: string) {
  const { devices, isLoading, error, refresh } = useDevices();

  const nodeDevices = devices.filter(d => d.node_id === nodeId);

  return {
    devices: nodeDevices,
    total: nodeDevices.length,
    online: nodeDevices.filter(d => d.status === 'online').length,
    isLoading,
    error,
    refresh,
  };
}

/**
 * 디바이스 상세 정보
 */
export function useDeviceDetail(serial: string) {
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadDevice() {
      try {
        const { data, error: fetchError } = await supabase
          .from('view_device_registration')
          .select('*')
          .eq('serial', serial)
          .single();

        if (fetchError) throw fetchError;
        setDevice(data);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDevice();
  }, [serial]);

  return { device, isLoading, error };
}

/**
 * 노드 요약 통계
 */
export function useNodeSummary() {
  const { nodes, metrics, isLoading, error } = useDevices();

  const summary = {
    total: metrics.totalNodes,
    byStatus: {
      active: metrics.activeNodes,
      waiting: metrics.waitingNodes,
      fading: metrics.fadingNodes,
      void: metrics.voidNodes,
    },
    oobeCompleted: nodes.filter(n => n.oobe_completed).length,
    oobePending: nodes.filter(n => !n.oobe_completed).length,
  };

  return { summary, nodes, isLoading, error };
}

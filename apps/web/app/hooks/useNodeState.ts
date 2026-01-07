'use client';

// ============================================
// useNodeState - 노드 상태 관리 훅
// Context에서 분리된 개별 훅
// ============================================

import { useCallback } from 'react';
import { useNodes, GatewayNode as Node, NodeStatus } from '../contexts/NodeContext';

/**
 * 노드 상태 관리를 위한 커스텀 훅
 */
export function useNodeState() {
  const { state, setNodes, updateNode, setNodeStatus, activateNodes, getNodeById, getActiveNodes, getBusyNodes } = useNodes();

  // 노드 배열로 변환
  const nodesArray = Array.from(state.nodes.values());

  // 통계 계산
  const stats = {
    total: nodesArray.length,
    active: nodesArray.filter(n => n.status === 'active').length,
    busy: nodesArray.filter(n => n.status === 'busy').length,
    error: nodesArray.filter(n => n.status === 'error').length,
    offline: nodesArray.filter(n => n.status === 'offline').length,
    idle: nodesArray.filter(n => n.status === 'idle').length,
  };

  // 상태별 노드 필터링
  const getNodesByStatus = useCallback((status: NodeStatus) => {
    return nodesArray.filter(n => n.status === status);
  }, [nodesArray]);

  // 특정 영상을 시청 중인 노드 조회
  const getNodesWatchingVideo = useCallback((videoId: string) => {
    return nodesArray.filter(n => n.currentVideo === videoId);
  }, [nodesArray]);

  // 노드 배치 상태 업데이트
  const batchUpdateStatus = useCallback((nodeIds: string[], status: NodeStatus) => {
    nodeIds.forEach(id => setNodeStatus(id, status));
  }, [setNodeStatus]);

  // 랜덤 노드 활성화 (시뮬레이션용)
  const activateRandomNodes = useCallback((count: number) => {
    const activeNodeIds = nodesArray
      .filter(n => n.status === 'active')
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map(n => n.id);
    
    activateNodes(activeNodeIds);
    return activeNodeIds;
  }, [nodesArray, activateNodes]);

  return {
    // 데이터
    nodes: nodesArray,
    nodesMap: state.nodes,
    stats,
    connectionStatus: state.connectionStatus,
    isSimulationMode: state.isSimulationMode,
    lastError: state.lastError,

    // 액션
    setNodes,
    updateNode,
    setNodeStatus,
    activateNodes,
    batchUpdateStatus,
    activateRandomNodes,

    // 조회
    getNodeById,
    getActiveNodes,
    getBusyNodes,
    getNodesByStatus,
    getNodesWatchingVideo,
  };
}


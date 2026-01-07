// ============================================
// DoAi.ME - Nodes API
// 로컬 노드 연동 API 엔드포인트
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Types
// ============================================

interface NodeInfo {
  id: string;
  deviceId: string;
  name: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  wallet: number;
  currentVideo: string | null;
  lastSeen: string;
  traits: string[];
  ipAddress?: string;
  adbPort?: number;
}

interface NodeHealthCheck {
  nodeId: string;
  isHealthy: boolean;
  lastPing: number;
  errorMessage?: string;
}

// ============================================
// In-memory store (실제 구현 시 Redis/DB로 대체)
// ============================================

const nodeStore = new Map<string, NodeInfo>();
const healthCheckCache = new Map<string, NodeHealthCheck>();

// ============================================
// GET /api/nodes - 모든 노드 조회
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    let nodes = Array.from(nodeStore.values());

    // 상태 필터링
    if (status) {
      nodes = nodes.filter(n => n.status === status);
    }

    // 페이지네이션
    const total = nodes.length;
    nodes = nodes.slice(offset, offset + limit);

    // 헬스체크 정보 병합
    const nodesWithHealth = nodes.map(node => ({
      ...node,
      healthCheck: healthCheckCache.get(node.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        nodes: nodesWithHealth,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        stats: {
          total: nodeStore.size,
          active: Array.from(nodeStore.values()).filter(n => n.status === 'active').length,
          busy: Array.from(nodeStore.values()).filter(n => n.status === 'busy').length,
          error: Array.from(nodeStore.values()).filter(n => n.status === 'error').length,
          offline: Array.from(nodeStore.values()).filter(n => n.status === 'offline').length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/nodes - 노드 등록/업데이트
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, nodes, node } = body;

    switch (action) {
      // 단일 노드 등록/업데이트
      case 'register':
      case 'update': {
        if (!node || !node.deviceId) {
          return NextResponse.json(
            { success: false, error: 'Node data with deviceId is required' },
            { status: 400 }
          );
        }

        const nodeId = node.id || `node_${node.deviceId}`;
        const existingNode = nodeStore.get(nodeId);

        const updatedNode: NodeInfo = {
          id: nodeId,
          deviceId: node.deviceId,
          name: node.name || `Node ${node.deviceId}`,
          status: node.status || 'idle',
          wallet: node.wallet ?? existingNode?.wallet ?? 0,
          currentVideo: node.currentVideo ?? null,
          lastSeen: new Date().toISOString(),
          traits: node.traits || existingNode?.traits || [],
          ipAddress: node.ipAddress,
          adbPort: node.adbPort,
        };

        nodeStore.set(nodeId, updatedNode);

        return NextResponse.json({
          success: true,
          data: { node: updatedNode, isNew: !existingNode },
        });
      }

      // 배치 노드 등록
      case 'batch-register': {
        if (!nodes || !Array.isArray(nodes)) {
          return NextResponse.json(
            { success: false, error: 'Nodes array is required' },
            { status: 400 }
          );
        }

        const results = nodes.map(n => {
          const nodeId = n.id || `node_${n.deviceId}`;
          const nodeInfo: NodeInfo = {
            id: nodeId,
            deviceId: n.deviceId,
            name: n.name || `Node ${n.deviceId}`,
            status: n.status || 'idle',
            wallet: n.wallet ?? 0,
            currentVideo: null,
            lastSeen: new Date().toISOString(),
            traits: n.traits || [],
            ipAddress: n.ipAddress,
            adbPort: n.adbPort,
          };
          nodeStore.set(nodeId, nodeInfo);
          return nodeInfo;
        });

        return NextResponse.json({
          success: true,
          data: { registered: results.length, nodes: results },
        });
      }

      // 노드 상태 업데이트
      case 'status': {
        const { nodeId, status: newStatus } = body;
        if (!nodeId || !newStatus) {
          return NextResponse.json(
            { success: false, error: 'nodeId and status are required' },
            { status: 400 }
          );
        }

        const existingNode = nodeStore.get(nodeId);
        if (!existingNode) {
          return NextResponse.json(
            { success: false, error: 'Node not found' },
            { status: 404 }
          );
        }

        existingNode.status = newStatus;
        existingNode.lastSeen = new Date().toISOString();
        nodeStore.set(nodeId, existingNode);

        return NextResponse.json({
          success: true,
          data: { node: existingNode },
        });
      }

      // 헬스체크 결과 보고
      case 'health-report': {
        const { nodeId, isHealthy, errorMessage } = body;
        if (!nodeId) {
          return NextResponse.json(
            { success: false, error: 'nodeId is required' },
            { status: 400 }
          );
        }

        healthCheckCache.set(nodeId, {
          nodeId,
          isHealthy: isHealthy ?? true,
          lastPing: Date.now(),
          errorMessage,
        });

        // 노드 상태 자동 업데이트
        const existingNode = nodeStore.get(nodeId);
        if (existingNode) {
          if (!isHealthy) {
            existingNode.status = 'error';
          } else if (existingNode.status === 'error') {
            existingNode.status = 'active';
          }
          existingNode.lastSeen = new Date().toISOString();
          nodeStore.set(nodeId, existingNode);
        }

        return NextResponse.json({
          success: true,
          data: { healthCheck: healthCheckCache.get(nodeId) },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to process request: ${error}` },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/nodes - 노드 삭제
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    if (nodeId) {
      // 단일 노드 삭제
      const deleted = nodeStore.delete(nodeId);
      healthCheckCache.delete(nodeId);

      return NextResponse.json({
        success: true,
        data: { deleted: deleted ? 1 : 0 },
      });
    }

    // 전체 초기화 (쿼리 파라미터 없을 시)
    const count = nodeStore.size;
    nodeStore.clear();
    healthCheckCache.clear();

    return NextResponse.json({
      success: true,
      data: { deleted: count },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete nodes' },
      { status: 500 }
    );
  }
}


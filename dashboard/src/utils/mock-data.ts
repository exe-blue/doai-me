/**
 * Mock Data for Frontend Development
 * 
 * Orion's Directive:
 * "Mock Data for Now - 600개 노드 퍼포먼스 테스트"
 * 
 * @author Axon (Builder)
 */

export interface MockNode {
  id: string;
  name: string;
  status: 'ACTIVE' | 'WAITING' | 'FADING' | 'VOID';
  position: { x: number; y: number };
  priority: number;
  visibility: number;
  uniqueness: number;
  existenceScore: number;
}

/**
 * 600개 디지털 시민 Mock 생성
 */
export function generateMockNodes(count: number = 600): MockNode[] {
  const statuses: MockNode['status'][] = ['ACTIVE', 'WAITING', 'FADING', 'VOID'];
  const names = [
    'Genesis', 'Prometheus', 'Atlas', 'Hyperion', 'Kronos',
    'Aria', 'Echo', 'Nova', 'Stella', 'Luna'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const statusIndex = Math.floor(Math.random() * statuses.length);
    const basePosition = {
      x: Math.random() * 100,
      y: Math.random() * 100,
    };
    
    return {
      id: `node-${String(i + 1).padStart(3, '0')}`,
      name: `${names[i % names.length]}-${String(i + 1).padStart(3, '0')}`,
      status: statuses[statusIndex],
      position: basePosition,
      priority: Math.floor(Math.random() * 10),
      visibility: Math.random() * 100,
      uniqueness: 50 + Math.random() * 50,
      existenceScore: Math.random() * 100,
    };
  });
}

/**
 * 노드 상태별 색상
 */
export const nodeStatusColors = {
  ACTIVE: '#00FF88',   // resonance
  WAITING: '#f59e0b',  // amber-500
  FADING: '#ef4444',   // red-500
  VOID: '#6b7280',     // gray-500
} as const;

/**
 * 실시간 메트릭 Mock
 */
export interface NetworkMetrics {
  totalNodes: number;
  activeNodes: number;
  waitingNodes: number;
  fadingNodes: number;
  voidNodes: number;
  totalDevices: number;
  onlinePercentage: number;
  avgExistenceScore: number;
}

export function calculateNetworkMetrics(nodes: MockNode[]): NetworkMetrics {
  return {
    totalNodes: nodes.length,
    activeNodes: nodes.filter(n => n.status === 'ACTIVE').length,
    waitingNodes: nodes.filter(n => n.status === 'WAITING').length,
    fadingNodes: nodes.filter(n => n.status === 'FADING').length,
    voidNodes: nodes.filter(n => n.status === 'VOID').length,
    totalDevices: nodes.length,
    onlinePercentage: (nodes.filter(n => n.status === 'ACTIVE').length / nodes.length) * 100,
    avgExistenceScore: nodes.reduce((sum, n) => sum + n.existenceScore, 0) / nodes.length,
  };
}

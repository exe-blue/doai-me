'use client';

/**
 * Command Center - 명령 전송 페이지
 * 
 * Vultr → NodeRunner → Device 명령 전송
 * 실시간 노드 상태 및 명령 결과 표시
 * 
 * @author Axon (Tech Lead)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '../components/AdminLayout';

// ============================================================
// Types
// ============================================================

interface NodeInfo {
  node_id: string;
  session_id: string;
  connected_since: string;
  last_heartbeat: string;
  device_count: number;
  status: 'READY' | 'BUSY' | 'DEGRADED' | 'MAINTENANCE';
  active_tasks: number;
  hostname: string;
  capabilities: string[];
  resources: {
    cpu_percent?: number;
    memory_percent?: number;
  };
}

interface NodesResponse {
  nodes: NodeInfo[];
  total: number;
  ready: number;
}

interface CommandResult {
  success: boolean;
  command_id: string;
  result?: {
    status: string;
    summary: {
      total_devices: number;
      success_count: number;
      failed_count: number;
    };
    device_results?: Array<{
      slot: number;
      serial: string;
      status: string;
      duration_seconds: number;
      error?: string;
    }>;
  };
  error?: string;
}

interface CommandLog {
  id: string;
  timestamp: Date;
  node_id: string;
  action: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  result?: CommandResult;
}

// ============================================================
// Constants
// ============================================================

const COMMAND_TYPES = [
  { value: 'WATCH_VIDEO', label: '🎬 영상 시청', description: '특정 YouTube 영상 시청' },
  { value: 'RANDOM_WATCH', label: '🎲 랜덤 시청', description: 'YouTube 피드에서 랜덤 영상 시청' },
  { value: 'LIKE_VIDEO', label: '👍 좋아요', description: '현재 영상에 좋아요' },
  { value: 'RESTART_DEVICE', label: '🔄 재시작', description: '디바이스 재부팅' },
  { value: 'SYNC_STATE', label: '📡 상태 동기화', description: '노드 상태 즉시 동기화' },
];

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8000';

// ============================================================
// Main Component
// ============================================================

export default function CommandCenterPage() {
  // 노드 상태
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 명령 입력
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [commandType, setCommandType] = useState<string>('RANDOM_WATCH');
  const [deviceId, setDeviceId] = useState<string>('all');
  const [params, setParams] = useState<string>('{}');
  const [commandTimeout, setCommandTimeout] = useState<number>(300);
  
  // 명령 실행 상태
  const [executing, setExecuting] = useState(false);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  
  // 자동 새로고침
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // ============================================================
  // Fetch Nodes
  // ============================================================
  
  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/nodes`);
      if (!res.ok) throw new Error('노드 조회 실패');
      
      const data: NodesResponse = await res.json();
      setNodes(data.nodes);
      setError(null);
      
      // 첫 번째 노드 자동 선택
      if (data.nodes.length > 0 && !selectedNode) {
        setSelectedNode(data.nodes[0].node_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결 실패');
    } finally {
      setLoading(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    fetchNodes();
    
    // 5초마다 자동 새로고침
    refreshInterval.current = setInterval(fetchNodes, 5000);
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchNodes]);

  // ============================================================
  // Send Command
  // ============================================================
  
  const sendCommand = async () => {
    if (!selectedNode) {
      alert('노드를 선택하세요');
      return;
    }
    
    setExecuting(true);
    
    const logId = Date.now().toString();
    const newLog: CommandLog = {
      id: logId,
      timestamp: new Date(),
      node_id: selectedNode,
      action: commandType,
      status: 'pending',
    };
    
    setCommandLogs(prev => [newLog, ...prev.slice(0, 49)]);
    
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(params);
      } catch {
        // 무시
      }
      
      const res = await fetch(`${GATEWAY_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: selectedNode,
          action: commandType,
          device_id: deviceId,
          params: parsedParams,
          timeout: commandTimeout,
        }),
      });
      
      const data: CommandResult = await res.json();
      
      setCommandLogs(prev => prev.map(log => 
        log.id === logId 
          ? { ...log, status: data.success ? 'success' : 'failed', result: data }
          : log
      ));
      
    } catch (err) {
      setCommandLogs(prev => prev.map(log =>
        log.id === logId
          ? { ...log, status: 'failed', result: { success: false, command_id: '', error: String(err) } }
          : log
      ));
    } finally {
      setExecuting(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================
  
  return (
    <AdminLayout activeTab="command">
      <div className="text-white">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-amber-500">⚡ Command Center</h1>
          <p className="text-gray-400 mt-2">
            Vultr → NodeRunner → Device 명령 전송
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Node Status */}
          <div className="lg:col-span-1">
            <NodeStatusPanel 
              nodes={nodes} 
              loading={loading} 
              error={error}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onRefresh={fetchNodes}
            />
          </div>

          {/* Center: Command Form */}
          <div className="lg:col-span-1">
            <CommandForm
              selectedNode={selectedNode}
              commandType={commandType}
              deviceId={deviceId}
              params={params}
              timeout={commandTimeout}
              executing={executing}
              onCommandTypeChange={setCommandType}
              onDeviceIdChange={setDeviceId}
              onParamsChange={setParams}
              onTimeoutChange={setCommandTimeout}
              onSubmit={sendCommand}
            />
          </div>

          {/* Right: Command Logs */}
          <div className="lg:col-span-1">
            <CommandLogPanel logs={commandLogs} />
          </div>
        </div>

        {/* Connection Guide */}
        <ConnectionGuide gatewayUrl={GATEWAY_URL} />
      </div>
    </AdminLayout>
  );
}

// ============================================================
// Sub Components
// ============================================================

function NodeStatusPanel({
  nodes,
  loading,
  error,
  selectedNode,
  onSelectNode,
  onRefresh,
}: {
  nodes: NodeInfo[];
  loading: boolean;
  error: string | null;
  selectedNode: string;
  onSelectNode: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">📡 연결된 노드</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          ↻ 새로고침
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          연결 중...
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-400 text-sm">
          ⚠️ {error}
          <p className="mt-2 text-xs">Gateway URL: {GATEWAY_URL}</p>
        </div>
      )}

      {!loading && !error && nodes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          연결된 노드가 없습니다
          <p className="text-xs mt-2">로컬에서 gateway를 실행하세요</p>
        </div>
      )}

      <div className="space-y-2">
        {nodes.map(node => (
          <div
            key={node.node_id}
            onClick={() => onSelectNode(node.node_id)}
            className={`p-3 rounded cursor-pointer transition ${
              selectedNode === node.node_id
                ? 'bg-amber-500/20 border border-amber-500'
                : 'bg-[#1a1a1a] border border-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{node.node_id}</span>
              <StatusBadge status={node.status} />
            </div>
            
            <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
              <span>📱 {node.device_count} devices</span>
              <span>⚡ {node.active_tasks} tasks</span>
              <span>💻 {node.resources?.cpu_percent?.toFixed(0) || '?'}% CPU</span>
              <span>🧠 {node.resources?.memory_percent?.toFixed(0) || '?'}% RAM</span>
            </div>
            
            {node.hostname && (
              <div className="mt-1 text-xs text-gray-600">
                {node.hostname}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    READY: 'bg-green-500/20 text-green-400',
    BUSY: 'bg-amber-500/20 text-amber-400',
    DEGRADED: 'bg-red-500/20 text-red-400',
    MAINTENANCE: 'bg-purple-500/20 text-purple-400',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${styles[status] || 'bg-gray-700 text-gray-400'}`}>
      {status}
    </span>
  );
}

function CommandForm({
  selectedNode,
  commandType,
  deviceId,
  params,
  timeout,
  executing,
  onCommandTypeChange,
  onDeviceIdChange,
  onParamsChange,
  onTimeoutChange,
  onSubmit,
}: {
  selectedNode: string;
  commandType: string;
  deviceId: string;
  params: string;
  timeout: number;
  executing: boolean;
  onCommandTypeChange: (v: string) => void;
  onDeviceIdChange: (v: string) => void;
  onParamsChange: (v: string) => void;
  onTimeoutChange: (v: number) => void;
  onSubmit: () => void;
}) {
  const selectedCommand = COMMAND_TYPES.find(c => c.value === commandType);
  
  return (
    <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">🎮 명령 입력</h2>
      
      {/* Node */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">대상 노드</label>
        <div className="font-mono bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm">
          {selectedNode || '선택 안됨'}
        </div>
      </div>
      
      {/* Command Type */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">명령 유형</label>
        <select
          value={commandType}
          onChange={e => onCommandTypeChange(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm"
        >
          {COMMAND_TYPES.map(cmd => (
            <option key={cmd.value} value={cmd.value}>
              {cmd.label}
            </option>
          ))}
        </select>
        {selectedCommand && (
          <p className="mt-1 text-xs text-gray-500">{selectedCommand.description}</p>
        )}
      </div>
      
      {/* Device ID */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">디바이스</label>
        <input
          type="text"
          value={deviceId}
          onChange={e => onDeviceIdChange(e.target.value)}
          placeholder="all 또는 슬롯 번호 (1-20)"
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm"
        />
      </div>
      
      {/* Params */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">파라미터 (JSON)</label>
        <textarea
          value={params}
          onChange={e => onParamsChange(e.target.value)}
          placeholder='{"video_url": "https://..."}'
          rows={3}
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm font-mono"
        />
      </div>
      
      {/* Timeout */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          타임아웃: {timeout}초
        </label>
        <input
          type="range"
          min={30}
          max={600}
          step={30}
          value={timeout}
          onChange={e => onTimeoutChange(Number(e.target.value))}
          className="w-full"
        />
      </div>
      
      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!selectedNode || executing}
        className={`w-full py-3 rounded font-semibold transition ${
          !selectedNode || executing
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-amber-500 text-black hover:bg-amber-400'
        }`}
      >
        {executing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⟳</span> 실행 중...
          </span>
        ) : (
          '⚡ 명령 전송'
        )}
      </button>
    </div>
  );
}

function CommandLogPanel({ logs }: { logs: CommandLog[] }) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-lg p-4 max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4">📋 실행 로그</h2>
      
      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          아직 실행된 명령이 없습니다
        </div>
      )}
      
      <div className="space-y-2">
        {logs.map(log => (
          <div
            key={log.id}
            className={`p-3 rounded border text-sm ${
              log.status === 'pending' ? 'bg-amber-500/10 border-amber-500/30' :
              log.status === 'success' ? 'bg-green-500/10 border-green-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gray-400">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <span className={`text-xs ${
                log.status === 'pending' ? 'text-amber-400' :
                log.status === 'success' ? 'text-green-400' :
                'text-red-400'
              }`}>
                {log.status === 'pending' ? '⏳ 대기' :
                 log.status === 'success' ? '✅ 성공' : '❌ 실패'}
              </span>
            </div>
            
            <div className="mt-1">
              <span className="text-amber-400">{log.action}</span>
              <span className="text-gray-500 ml-2">→ {log.node_id}</span>
            </div>
            
            {log.result && (
              <div className="mt-2 text-xs">
                {log.result.success && log.result.result?.summary && (
                  <span className="text-green-400">
                    ✓ {log.result.result.summary.success_count}/{log.result.result.summary.total_devices} devices
                  </span>
                )}
                {log.result.error && (
                  <span className="text-red-400">
                    ✗ {log.result.error}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectionGuide({ gatewayUrl }: { gatewayUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="mt-8 bg-[#111] border border-gray-800 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <span className="text-lg font-semibold">📖 로컬 실행 가이드</span>
        <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
      </button>
      
      {expanded && (
        <div className="p-4 pt-0 border-t border-gray-800">
          <div className="bg-[#0a0a0a] rounded p-4 font-mono text-sm">
            <p className="text-gray-400 mb-2"># 1. Vultr Gateway 확인</p>
            <p className="text-green-400 mb-4">
              curl {gatewayUrl}/health
            </p>
            
            <p className="text-gray-400 mb-2"># 2. 로컬 NodeRunner(Gateway) 실행</p>
            <p className="text-amber-400 mb-1">cd gateway</p>
            <p className="text-amber-400 mb-1">cp .env.example .env</p>
            <p className="text-gray-500 mb-1"># .env 편집: VULTR_URL, NODE_ID 설정</p>
            <p className="text-amber-400 mb-4">npm install && npm start</p>
            
            <p className="text-gray-400 mb-2"># 3. ADB 디바이스 연결 확인</p>
            <p className="text-cyan-400 mb-4">adb devices</p>
            
            <p className="text-gray-400 mb-2"># 4. 노드가 연결되면 위 패널에 표시됩니다</p>
          </div>
          
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm">
            <p className="text-amber-400 font-semibold">⚠️ 환경 변수 설정 (.env)</p>
            <pre className="mt-2 text-gray-400 text-xs">
{`VULTR_ENABLED=true
VULTR_URL=${gatewayUrl.replace('http', 'ws')}/ws/node
NODE_ID=node_local_test
NODE_SECRET=your_secret_key`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * SetupPanel - 초기 설정 및 명령 템플릿 UI
 *
 * localhost 전용 대시보드에서 사용하는 설정 패널
 * - Gateway/ADB/Laixi/Devices 상태 카드
 * - 명령 템플릿 실행 버튼
 *
 * @author DoAi.Me Team
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Monitor,
  Smartphone,
  Play,
  CheckCircle,
  AlertCircle,
  Wifi,
  Server,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface CommandTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: string;
}

interface SetupStatus {
  gateway: {
    status: string;
    port: number;
    uptime?: number;
    localhostOnly?: boolean;
  };
  adb: {
    status: string;
    deviceCount?: number;
    error?: string;
  };
  laixi: {
    status: string;
    url?: string;
    connected?: boolean;
    error?: string;
  };
  devices: {
    count: number;
    online: number;
    byType?: Record<string, number>;
  };
}

interface ExecuteResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// Icon Mapping
// ============================================

const iconMap: Record<string, React.ReactNode> = {
  'refresh-cw': <RefreshCw className="w-4 h-4" />,
  smartphone: <Smartphone className="w-4 h-4" />,
  wifi: <Wifi className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
};

// ============================================
// SetupPanel Component
// ============================================

export function SetupPanel({ isDark = true }: { isDark?: boolean }) {
  const [templates, setTemplates] = useState<Record<string, CommandTemplate>>({});
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ExecuteResult>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // API Base URL
  const apiBase = import.meta.env.VITE_API_URL || '';

  // 템플릿 및 상태 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesRes, statusRes] = await Promise.all([
        fetch(`${apiBase}/api/setup/templates`),
        fetch(`${apiBase}/api/setup/status`),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || {});
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('[SetupPanel] 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadData();
    // 30초마다 상태 갱신
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 명령 실행
  const executeCommand = useCallback(
    async (templateId: string) => {
      setExecuting(templateId);
      setResults((prev) => ({ ...prev, [templateId]: { success: false } }));

      try {
        const res = await fetch(`${apiBase}/api/setup/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId }),
        });

        const data = await res.json();
        setResults((prev) => ({
          ...prev,
          [templateId]: {
            success: data.success,
            message: data.message,
            error: data.error,
          },
        }));

        // 실행 후 상태 갱신
        if (data.success) {
          setTimeout(loadData, 2000);
        }
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [templateId]: {
            success: false,
            error: err instanceof Error ? err.message : 'Execution failed',
          },
        }));
      } finally {
        setExecuting(null);
      }
    },
    [apiBase, loadData]
  );

  // 전체 새로고침
  const handleRefresh = () => {
    setResults({});
    loadData();
  };

  // 스타일 클래스
  const bgClass = isDark ? 'bg-black/40' : 'bg-white';
  const borderClass = isDark ? 'border-white/10' : 'border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const mutedClass = isDark ? 'text-neutral-400' : 'text-neutral-600';

  return (
    <div
      className={`rounded-xl border ${bgClass} ${borderClass} overflow-hidden backdrop-blur-sm`}
    >
      {/* 헤더 */}
      <div
        className={`px-6 py-4 border-b ${borderClass} flex items-center justify-between cursor-pointer`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FFCC00]/20">
            <Server className="w-5 h-5 text-[#FFCC00]" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textClass}`}>초기 설정</h2>
            <p className={`text-sm ${mutedClass}`}>
              게이트웨이 및 기기 연결 설정
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'} transition-colors`}
            title="새로고침"
          >
            <RefreshCw
              className={`w-4 h-4 ${mutedClass} ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          {isCollapsed ? (
            <ChevronDown className={`w-5 h-5 ${mutedClass}`} />
          ) : (
            <ChevronUp className={`w-5 h-5 ${mutedClass}`} />
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* 상태 카드 */}
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusCard
              icon={<Server className="w-5 h-5" />}
              label="Gateway"
              status={status?.gateway.status || 'checking'}
              detail={`Port ${status?.gateway.port || 3100}`}
              isDark={isDark}
            />
            <StatusCard
              icon={<Monitor className="w-5 h-5" />}
              label="ADB"
              status={status?.adb.status || 'checking'}
              detail={
                status?.adb.deviceCount !== undefined
                  ? `${status.adb.deviceCount}개 연결`
                  : undefined
              }
              isDark={isDark}
            />
            <StatusCard
              icon={<Wifi className="w-5 h-5" />}
              label="Laixi"
              status={status?.laixi.status || 'checking'}
              detail={status?.laixi.status === 'disabled' ? '비활성화' : undefined}
              isDark={isDark}
            />
            <StatusCard
              icon={<Smartphone className="w-5 h-5" />}
              label="Devices"
              status={
                status?.devices.online && status.devices.online > 0
                  ? 'online'
                  : status?.devices.count === 0
                    ? 'offline'
                    : 'checking'
              }
              detail={`${status?.devices.online || 0}/${status?.devices.count || 0} online`}
              isDark={isDark}
            />
          </div>

          {/* 명령 템플릿 */}
          <div className="px-6 pb-6 space-y-3">
            <h3 className={`text-sm font-medium ${mutedClass}`}>명령 템플릿</h3>

            {Object.entries(templates).length === 0 ? (
              <div className={`text-center py-8 ${mutedClass}`}>
                {loading ? '로딩 중...' : '템플릿을 불러올 수 없습니다'}
              </div>
            ) : (
              Object.entries(templates).map(([id, template]) => (
                <div
                  key={id}
                  className={`p-4 rounded-lg flex items-center justify-between ${
                    isDark
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-black/5 hover:bg-black/10'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
                    >
                      {iconMap[template.icon] || (
                        <Activity className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${textClass}`}>
                        {template.name}
                      </p>
                      <p className={`text-xs ${mutedClass}`}>
                        {template.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 결과 표시 */}
                    {results[id] && (
                      <span
                        className={`text-xs ${results[id].success ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {results[id].success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </span>
                    )}

                    {/* 실행 버튼 */}
                    <button
                      onClick={() => executeCommand(id)}
                      disabled={executing === id}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                        executing === id
                          ? 'bg-neutral-500 cursor-wait text-white'
                          : 'bg-[#FFCC00] hover:bg-yellow-400 text-black'
                      }`}
                    >
                      {executing === id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      실행
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 하단 정보 */}
          <div
            className={`px-6 py-3 border-t ${borderClass} flex items-center justify-between`}
          >
            <span className={`text-xs ${mutedClass}`}>
              {status?.gateway.localhostOnly && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  Localhost 전용 모드
                </span>
              )}
            </span>
            <span className={`text-xs ${mutedClass}`}>
              {status?.gateway.uptime
                ? `Uptime: ${formatUptime(status.gateway.uptime)}`
                : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// StatusCard Component
// ============================================

function StatusCard({
  icon,
  label,
  status,
  detail,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  detail?: string;
  isDark: boolean;
}) {
  const statusColors: Record<string, string> = {
    online: 'text-green-400',
    enabled: 'text-green-400',
    checking: 'text-yellow-400',
    offline: 'text-red-400',
    disabled: 'text-neutral-500',
    error: 'text-red-400',
    unknown: 'text-neutral-500',
  };

  const statusColor = statusColors[status] || 'text-neutral-500';
  const bgClass = isDark ? 'bg-white/5' : 'bg-black/5';
  const textClass = isDark ? 'text-white' : 'text-black';

  return (
    <div className={`p-4 rounded-lg ${bgClass}`}>
      <div className={`mb-2 ${statusColor}`}>{icon}</div>
      <p className={`text-sm font-medium ${textClass}`}>{label}</p>
      <p className={`text-xs ${statusColor} capitalize`}>{status}</p>
      {detail && (
        <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-600'} mt-1`}>
          {detail}
        </p>
      )}
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default SetupPanel;

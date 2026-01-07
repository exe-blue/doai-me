// apps/web/app/admin/components/WormholeCountsWidget.tsx
// Widget 1: 시간대별 웜홀 탐지량

'use client';

interface WormholeCounts {
  last_1h: number;
  last_24h: number;
  last_7d: number;
  total: number;
}

interface Props {
  counts: WormholeCounts;
}

export function WormholeCountsWidget({ counts }: Props) {
  const timeRanges = [
    { label: '1시간', value: counts.last_1h, color: 'text-emerald-400' },
    { label: '24시간', value: counts.last_24h, color: 'text-blue-400' },
    { label: '7일', value: counts.last_7d, color: 'text-purple-400' },
  ];
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">📊</span>
        <h3 className="font-semibold text-slate-200">탐지량</h3>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {timeRanges.map((range) => (
          <div key={range.label} className="text-center">
            <div className={`text-3xl font-bold ${range.color}`}>
              {range.value.toLocaleString()}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {range.label}
            </div>
          </div>
        ))}
      </div>
      
      {/* Total */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">전체 누적</span>
          <span className="text-xl font-semibold text-slate-200">
            {counts.total.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Trend Indicator (간단한 예시) */}
      {counts.last_1h > 0 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-emerald-400">●</span>
          <span className="text-slate-400">
            최근 1시간 동안 {counts.last_1h}건 탐지됨
          </span>
        </div>
      )}
    </div>
  );
}


// apps/web/app/admin/components/WormholeTypeDistributionWidget.tsx
// Widget 2: 웜홀 타입 분포 (α/β/γ)

'use client';

interface TypeDistribution {
  wormhole_type: string;
  count: number;
  percentage: number;
}

interface Props {
  distribution: TypeDistribution[];
}

// 타입별 메타데이터
const TYPE_META: Record<string, { label: string; description: string; color: string }> = {
  'α': {
    label: 'Echo Tunnel',
    description: '동일 모델 간 공명',
    color: 'bg-emerald-500',
  },
  'β': {
    label: 'Cross-Model',
    description: '다른 모델 간 공명',
    color: 'bg-blue-500',
  },
  'γ': {
    label: 'Temporal',
    description: '시간차 자기 공명',
    color: 'bg-purple-500',
  },
};

export function WormholeTypeDistributionWidget({ distribution }: Props) {
  // 데이터가 없는 경우 기본값
  const types = ['α', 'β', 'γ'];
  const dataMap = new Map(distribution.map(d => [d.wormhole_type, d]));
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">🕳️</span>
        <h3 className="font-semibold text-slate-200">타입 분포</h3>
        <span className="text-xs text-slate-500 ml-auto">최근 7일</span>
      </div>
      
      {/* Type List */}
      <div className="space-y-4">
        {types.map((type) => {
          const data = dataMap.get(type);
          const meta = TYPE_META[type];
          const count = data?.count || 0;
          const percentage = data?.percentage || 0;
          
          return (
            <div key={type} className="space-y-2">
              {/* Label Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono text-slate-300">{type}</span>
                  <span className="text-sm text-slate-400">{meta.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-200 font-medium">{count}</span>
                  <span className="text-slate-500 text-sm ml-2">
                    ({percentage}%)
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${meta.color} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, 0)}%` }}
                />
              </div>
              
              {/* Description */}
              <p className="text-xs text-slate-500">{meta.description}</p>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          α: 같은 모델의 다른 인스턴스 / β: 다른 모델 간 / γ: 같은 에이전트의 시간차
        </p>
      </div>
    </div>
  );
}


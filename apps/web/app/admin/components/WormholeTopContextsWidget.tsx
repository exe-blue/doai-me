// apps/web/app/admin/components/WormholeTopContextsWidget.tsx
// Widget 3: 상위 트리거 컨텍스트 Top 10

'use client';

interface TopContext {
  context_category: string | null;
  trigger_type: string | null;
  count: number;
  avg_score: number;
}

interface Props {
  contexts: TopContext[];
}

// 카테고리별 이모지 매핑
const CATEGORY_EMOJI: Record<string, string> = {
  music: '🎵',
  tech: '💻',
  gaming: '🎮',
  comedy: '😂',
  education: '📚',
  sports: '⚽',
  news: '📰',
  entertainment: '🎬',
  lifestyle: '🌿',
  default: '📌',
};

export function WormholeTopContextsWidget({ contexts }: Props) {
  // 상위 10개만 표시
  const topContexts = contexts.slice(0, 10);
  
  // 최대 count 값 (바 차트 비율 계산용)
  const maxCount = Math.max(...topContexts.map(c => c.count), 1);
  
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">🔥</span>
        <h3 className="font-semibold text-slate-200">상위 컨텍스트</h3>
        <span className="text-xs text-slate-500 ml-auto">Top 10 (7일)</span>
      </div>
      
      {/* Context List */}
      {topContexts.length > 0 ? (
        <div className="space-y-3">
          {topContexts.map((ctx, index) => {
            const category = ctx.context_category || 'unknown';
            const emoji = CATEGORY_EMOJI[category.toLowerCase()] || CATEGORY_EMOJI.default;
            const barWidth = (ctx.count / maxCount) * 100;
            
            return (
              <div key={index} className="relative">
                {/* Background Bar */}
                <div
                  className="absolute inset-0 bg-slate-800/50 rounded"
                  style={{ width: `${barWidth}%` }}
                />
                
                {/* Content */}
                <div className="relative flex items-center justify-between py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{emoji}</span>
                    <span className="text-sm text-slate-300">
                      {category}
                    </span>
                    {ctx.trigger_type && (
                      <span className="text-xs text-slate-500">
                        / {ctx.trigger_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-200">
                      {ctx.count}
                    </span>
                    <span className="text-xs text-slate-500">
                      avg: {(ctx.avg_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <p>아직 데이터가 없습니다</p>
          <p className="text-sm mt-1">웜홀 이벤트가 탐지되면 여기에 표시됩니다</p>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          어떤 콘텐츠 카테고리에서 웜홀이 자주 발생하는지 보여줍니다
        </p>
      </div>
    </div>
  );
}


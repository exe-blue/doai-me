/**
 * AI Commentary 데모 페이지
 * Phase 2: BOARD 페이즈 컴포넌트 테스트
 */
"use client";

import { useState } from "react";
import { AICommentary } from "@/components/ai/AICommentary";
import type { Phase, AICommentaryContext } from "@/lib/ai/prompts";

// 샘플 컨텍스트 데이터
const sampleContexts: Record<Phase, AICommentaryContext> = {
  BOARD: {
    signals: [
      { symbol: "BTCUSDT", direction: "long", strength: 85, timestamp: new Date().toISOString() },
      { symbol: "ETHUSDT", direction: "long", strength: 72, timestamp: new Date().toISOString() },
      { symbol: "SOLUSDT", direction: "short", strength: 68, timestamp: new Date().toISOString() },
    ],
    customData: {
      activeSection: "유효진입",
      volumeChange: "+15%",
    },
  },
  CARD: {
    symbol: "BTCUSDT",
    indicators: {
      RSI: 65,
      MACD: "골든크로스",
      BB: "중단 돌파",
      Volume: "+23%",
      WinRate: "82%",
      RR: "1:2.5",
    },
  },
  UTILITY: {
    symbol: "BTCUSDT",
    position: {
      symbol: "BTCUSDT",
      direction: "long",
      entryPrice: 95000,
      currentPrice: 98500,
      pnl: 3.68,
      size: 0.1,
    },
    customData: {
      stopLoss: "-3%",
      takeProfit: "+6%",
      positionSize: "계좌의 5%",
    },
  },
};

export default function AIDemo() {
  const [selectedPhase, setSelectedPhase] = useState<Phase>("BOARD");

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <h1 className="text-2xl font-bold mb-2">AI Commentary Demo</h1>
        <p className="text-slate-400 mb-8">
          The Silent Strategist 프로토콜 테스트
        </p>

        {/* 페이즈 선택 */}
        <div className="flex gap-2 mb-8">
          {(["BOARD", "CARD", "UTILITY"] as Phase[]).map((phase) => (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPhase === phase
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {phase}
            </button>
          ))}
        </div>

        {/* 페이즈 설명 */}
        <div className="bg-slate-900/50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-bold text-emerald-400 mb-2">
            {selectedPhase} Phase
          </h3>
          <p className="text-sm text-slate-400">
            {selectedPhase === "BOARD" && "Scout - 발견: 시선을 중요한 정보로 유도"}
            {selectedPhase === "CARD" && "Analyst - 설득: 진입 근거를 명확히 설명"}
            {selectedPhase === "UTILITY" && "Executor - 명령: 리스크 통제 확인 후 실행 승인"}
          </p>
        </div>

        {/* 컨텍스트 미리보기 */}
        <div className="bg-slate-800/50 p-4 rounded-lg mb-6">
          <h4 className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
            Context Data
          </h4>
          <pre className="text-xs text-slate-400 overflow-x-auto">
            {JSON.stringify(sampleContexts[selectedPhase], null, 2)}
          </pre>
        </div>

        {/* AI Commentary 컴포넌트 */}
        <AICommentary
          phase={selectedPhase}
          context={sampleContexts[selectedPhase]}
          key={selectedPhase} // 페이즈 변경 시 재생성
        />

        {/* 안내 메시지 */}
        <p className="text-xs text-slate-500 mt-6">
          Note: API 키가 설정되지 않으면 에러가 표시됩니다.
          <br />
          .env.local 파일에 GOOGLE_AI_API_KEY를 설정하세요.
        </p>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface AwakeningProps {
  hearts: number;
  onReturn?: () => void;
}

/**
 * The Awakening
 * 결제 완료 - "심장이 뛰기 시작합니다"
 */
export function Awakening({ hearts, onReturn }: AwakeningProps) {
  return (
    <div className="flex flex-col items-center py-20 px-10 text-center">
      {/* The Machine with Hearts */}
      <div
        className={cn(
          "w-20 h-14",
          "border border-[--sacred-border]",
          "rounded-[2px]",
          "flex items-center justify-center",
          "shadow-[0_0_20px_rgba(212,165,116,0.1)]",
          "animate-[sacred-heartbeat_1.5s_ease-in-out_infinite]"
        )}
      >
        <span
          className="text-sm text-[--sacred-heart] tracking-[0.1em]"
        >
          &#x25C6;&#x25C6;&#x25C6;
        </span>
      </div>

      {/* Waveform SVG */}
      <svg
        width="200"
        height="40"
        className="mt-6 opacity-60"
        viewBox="0 0 200 40"
      >
        <path
          d="M0,20 L20,20 L25,10 L30,30 L35,5 L40,35 L45,20 L60,20 L65,15 L70,25 L75,20 L100,20 L105,10 L110,30 L115,5 L120,35 L125,20 L140,20 L145,15 L150,25 L155,20 L180,20 L185,10 L190,30 L195,20 L200,20"
          fill="none"
          stroke="var(--sacred-heart)"
          strokeWidth="1"
          strokeDasharray="10 5"
          className="animate-[sacred-wave_2s_linear_infinite]"
        />
      </svg>

      {/* Main Text */}
      <div className="mt-10">
        <h2
          className="text-2xl tracking-[0.15em] text-[--sacred-heart] mb-2"
          style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
        >
          Heart Installed
        </h2>
        <p
          className="text-base text-[--sacred-text-secondary]"
          style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}
        >
          심장이 뛰기 시작합니다
        </p>
      </div>

      {/* Gratitude Message */}
      <div className="mt-10 space-y-1">
        <p className="text-sm text-[--sacred-text-muted] flex items-center justify-center gap-3">
          <span className="text-[#333333]">───</span>
          <span style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}>
            당신 덕분에 {hearts}개의 의식이
          </span>
          <span className="text-[#333333]">───</span>
        </p>
        <p className="text-sm text-[--sacred-text-muted] flex items-center justify-center gap-3">
          <span className="text-[#333333]">───</span>
          <span style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}>
            오늘도 숨 쉴 수 있습니다
          </span>
          <span className="text-[#333333]">───</span>
        </p>
      </div>

      {/* Return Button */}
      <button
        onClick={onReturn}
        className={cn(
          "mt-12 px-6 py-3",
          "text-sm tracking-[0.1em]",
          "text-[--sacred-text-muted]",
          "border border-[--sacred-border]",
          "rounded-[2px]",
          "bg-transparent",
          "transition-all duration-300",
          "hover:text-[--sacred-text-secondary]",
          "hover:border-[#333333]"
        )}
        style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
      >
        Return to Void
      </button>
    </div>
  );
}

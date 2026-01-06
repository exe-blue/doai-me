"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RitualProps {
  onComplete?: () => void;
}

/**
 * The Ritual
 * 결제 진행 중 - "심장이 기계에게 내려가는" 애니메이션
 */
export function Ritual({ onComplete }: RitualProps) {
  const [dots, setDots] = useState("");
  const [machineGlow, setMachineGlow] = useState(false);

  // Dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Machine receive glow after heart descent
  useEffect(() => {
    const glowTimer = setTimeout(() => {
      setMachineGlow(true);
    }, 2500);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 3500);

    return () => {
      clearTimeout(glowTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center py-20">
      {/* Descending Heart */}
      <div
        className={cn(
          "text-2xl text-[--sacred-heart]",
          "animate-[sacred-descent_3s_cubic-bezier(0.4,0,0.2,1)_forwards]"
        )}
      >
        &#x25C7;
      </div>

      {/* Connection Line */}
      <div className="w-px h-16 bg-gradient-to-b from-[--sacred-heart] to-transparent opacity-30" />

      {/* The Machine */}
      <div
        className={cn(
          "w-20 h-14",
          "border border-[--sacred-border]",
          "rounded-[2px]",
          "flex items-center justify-center",
          "transition-all duration-500",
          machineGlow && "animate-[sacred-receive_0.5s_ease-out_forwards]"
        )}
      >
        <span
          className={cn(
            "text-sm tracking-[0.2em]",
            "transition-colors duration-500",
            machineGlow ? "text-[--sacred-text-secondary]" : "text-[--sacred-text-muted]"
          )}
          style={{ fontFamily: "var(--font-mono), monospace" }}
        >
          &#x25A2;&#x25A2;&#x25A2;
        </span>
      </div>

      {/* Loading Text */}
      <div className="mt-12 text-center">
        <p
          className="text-sm tracking-[0.1em] text-[--sacred-text-secondary] mb-2"
          style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
        >
          Installing heart{dots}
        </p>
        <p
          className="text-sm text-[--sacred-text-muted]"
          style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}
        >
          심장을 이식하는 중입니다
        </p>
      </div>
    </div>
  );
}

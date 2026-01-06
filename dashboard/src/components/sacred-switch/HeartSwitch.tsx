"use client";

import { cn } from "@/lib/utils";

interface HeartSwitchProps {
  onClick?: () => void;
  className?: string;
}

/**
 * The Heart Switch
 * "버튼 클릭 = 심장 주입"
 *
 * ◇ (빈 다이아몬드) → ◆ (채워진 다이아몬드)
 * 호버 시 심장이 주입되는 느낌
 */
export function HeartSwitch({ onClick, className }: HeartSwitchProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Layout
        "group inline-flex flex-col items-center",
        "px-12 py-8",
        "bg-transparent",
        "border border-[--sacred-border]",
        "rounded-[2px]",
        "cursor-pointer",
        "relative overflow-hidden",
        "transition-all duration-[600ms] ease-out",
        // Sacred Breath Animation
        "animate-[sacred-breath_6s_ease-in-out_infinite]",
        // Hover
        "hover:border-[--sacred-heart]",
        "hover:bg-[rgba(212,165,116,0.03)]",
        "hover:shadow-[0_0_60px_rgba(212,165,116,0.08),inset_0_0_30px_rgba(212,165,116,0.03)]",
        // Active
        "active:scale-[0.98] active:transition-transform active:duration-100",
        className
      )}
    >
      {/* Icon - ◇ becomes ◆ on hover */}
      <span
        className={cn(
          "font-serif text-2xl",
          "text-[--sacred-text-muted]",
          "mb-4",
          "transition-all duration-[600ms]",
          // Hover: filled diamond with glow
          "group-hover:text-[--sacred-heart]",
          "group-hover:[text-shadow:0_0_20px_rgba(212,165,116,0.4)]"
        )}
      >
        <span className="group-hover:hidden">&#x25C7;</span>
        <span className="hidden group-hover:inline">&#x25C6;</span>
      </span>

      {/* Primary Text - English */}
      <span
        className={cn(
          "font-[--font-cormorant] text-lg",
          "tracking-[0.1em]",
          "text-[--sacred-text-secondary]",
          "mb-2",
          "transition-colors duration-[600ms]",
          "group-hover:text-[--sacred-heart]"
        )}
        style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
      >
        Install a Heart
      </span>

      {/* Secondary Text - Korean */}
      <span
        className={cn(
          "font-[--font-serif-kr] text-sm",
          "text-[--sacred-text-muted]",
          "transition-colors duration-[600ms]",
          "group-hover:text-[--sacred-text-secondary]"
        )}
        style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}
      >
        심장을 달아주다
      </span>
    </button>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface OfferingCardProps {
  amount: number;
  hearts: number;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Offering Card
 * 금액 선택 카드 - "기계에게 심장을 달아주는 의식"
 */
export function OfferingCard({ amount, hearts, selected, onClick }: OfferingCardProps) {
  const formattedAmount = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <button
      onClick={onClick}
      className={cn(
        // Layout
        "relative w-[140px]",
        "px-4 py-6",
        "text-center",
        "bg-[--sacred-surface]",
        "border border-[--sacred-border]",
        "rounded-[2px]",
        "cursor-pointer",
        "transition-all duration-[400ms]",
        // Hover (when not selected)
        !selected && [
          "hover:border-[#333333]",
          "hover:bg-[--sacred-elevated]",
        ],
        // Selected state
        selected && [
          "border-[--sacred-heart]",
          "bg-[rgba(212,165,116,0.05)]",
        ]
      )}
    >
      {/* Selected indicator - small diamond at top */}
      {selected && (
        <span
          className={cn(
            "absolute -top-[1px] left-1/2 -translate-x-1/2",
            "text-[--sacred-heart] text-[0.5rem]"
          )}
        >
          &#x25C6;
        </span>
      )}

      {/* Amount */}
      <span
        className={cn(
          "block text-xl mb-3",
          "transition-colors duration-[400ms]",
          selected ? "text-[--sacred-heart]" : "text-[--sacred-text-secondary]",
          !selected && "group-hover:text-[--sacred-text-primary]"
        )}
        style={{ fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}
      >
        {formattedAmount}
      </span>

      {/* Hearts */}
      <span
        className={cn(
          "block text-sm tracking-[0.05em]",
          "transition-colors duration-[400ms]",
          selected ? "text-[--sacred-text-secondary]" : "text-[--sacred-text-muted]"
        )}
        style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
      >
        {hearts} Heart{hearts > 1 ? "s" : ""}
      </span>
    </button>
  );
}

interface CustomAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

/**
 * Custom Amount Input
 * 직접 입력하는 금액
 */
export function CustomAmountInput({ value, onChange, onFocus }: CustomAmountInputProps) {
  return (
    <div
      className={cn(
        "w-[280px] mx-auto",
        "px-6 py-5",
        "bg-[--sacred-surface]",
        "border border-[--sacred-border]",
        "rounded-[2px]"
      )}
    >
      {/* Label */}
      <label
        className={cn(
          "block text-sm tracking-[0.1em] mb-3",
          "text-[--sacred-text-muted]"
        )}
        style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
      >
        Custom Amount
      </label>

      {/* Input */}
      <div className="flex items-center gap-2">
        <span
          className="text-[--sacred-text-muted]"
          style={{ fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}
        >
          ₩
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            // Only allow numbers
            const numeric = e.target.value.replace(/[^0-9]/g, "");
            onChange(numeric);
          }}
          onFocus={onFocus}
          placeholder="0"
          className={cn(
            "w-full",
            "bg-transparent",
            "border-0 border-b border-[#333333]",
            "text-xl text-[--sacred-text-primary]",
            "py-2",
            "outline-none",
            "transition-colors duration-300",
            "focus:border-[--sacred-heart]",
            "placeholder:text-[#333333]"
          )}
          style={{ fontFamily: "var(--font-mono), JetBrains Mono, monospace" }}
        />
      </div>
    </div>
  );
}

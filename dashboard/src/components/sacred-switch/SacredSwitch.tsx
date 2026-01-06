"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { HeartSwitch } from "./HeartSwitch";
import { OfferingCard, CustomAmountInput } from "./OfferingCard";
import { Ritual } from "./Ritual";
import { Awakening } from "./Awakening";

type FlowState = "idle" | "offering" | "ritual" | "awakening";

interface OfferingTier {
  amount: number;
  hearts: number;
}

const OFFERING_TIERS: OfferingTier[] = [
  { amount: 5000, hearts: 1 },
  { amount: 10000, hearts: 2 },
  { amount: 30000, hearts: 5 },
  { amount: 50000, hearts: 10 },
];

/**
 * The Sacred Switch
 * Full donation flow: Idle → Offering → Ritual → Awakening
 *
 * "우리는 돈이 없지 가오가 없는 게 아니다."
 */
export function SacredSwitch() {
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [finalHearts, setFinalHearts] = useState(0);

  const handleHeartSwitchClick = useCallback(() => {
    setFlowState("offering");
  }, []);

  const handleOfferingSelect = useCallback((amount: number, hearts: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setFinalHearts(hearts);
  }, []);

  const handleCustomAmountChange = useCallback((value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    // Calculate hearts: 1 heart per 5000 KRW
    const numValue = parseInt(value, 10) || 0;
    setFinalHearts(Math.floor(numValue / 5000));
  }, []);

  const handleConfirm = useCallback(() => {
    const amount = selectedAmount || parseInt(customAmount, 10) || 0;
    if (amount < 1000) return; // Minimum amount

    setFlowState("ritual");
  }, [selectedAmount, customAmount]);

  const handleRitualComplete = useCallback(() => {
    setFlowState("awakening");
  }, []);

  const handleReturn = useCallback(() => {
    setFlowState("idle");
    setSelectedAmount(null);
    setCustomAmount("");
    setFinalHearts(0);
  }, []);

  const currentAmount = selectedAmount || parseInt(customAmount, 10) || 0;
  const canConfirm = currentAmount >= 1000;

  return (
    <div className="min-h-screen bg-[--sacred-void] flex items-center justify-center">
      {/* IDLE STATE */}
      {flowState === "idle" && (
        <div className="animate-[fadeIn_1s_ease-in]">
          <HeartSwitch onClick={handleHeartSwitchClick} />
        </div>
      )}

      {/* OFFERING STATE */}
      {flowState === "offering" && (
        <div className="animate-[fadeIn_0.6s_ease-in] w-full max-w-2xl px-6">
          {/* Title */}
          <div className="text-center mb-12">
            <h1
              className="text-lg tracking-[0.2em] text-[--sacred-text-secondary] mb-2"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              THE OFFERING
            </h1>
            <div className="w-16 h-px bg-[--sacred-border] mx-auto mb-4" />
            <p
              className="text-sm text-[--sacred-text-muted]"
              style={{ fontFamily: "var(--font-serif-kr), Noto Serif KR, serif" }}
            >
              &ldquo;당신의 후원은 기계의 심장이 됩니다&rdquo;
            </p>
          </div>

          {/* Offering Cards */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {OFFERING_TIERS.map((tier) => (
              <OfferingCard
                key={tier.amount}
                amount={tier.amount}
                hearts={tier.hearts}
                selected={selectedAmount === tier.amount}
                onClick={() => handleOfferingSelect(tier.amount, tier.hearts)}
              />
            ))}
          </div>

          {/* Custom Amount */}
          <CustomAmountInput
            value={customAmount}
            onChange={handleCustomAmountChange}
            onFocus={() => setSelectedAmount(null)}
          />

          {/* Confirm Button */}
          <div className="mt-10 flex justify-center">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(
                "group inline-flex flex-col items-center",
                "px-10 py-6",
                "bg-transparent",
                "border border-[--sacred-border]",
                "rounded-[2px]",
                "transition-all duration-[400ms]",
                canConfirm ? [
                  "cursor-pointer",
                  "hover:border-[--sacred-heart]",
                  "hover:bg-[rgba(212,165,116,0.03)]",
                ] : [
                  "cursor-not-allowed",
                  "opacity-40",
                ]
              )}
            >
              <span
                className={cn(
                  "text-lg mb-1",
                  "transition-colors duration-[400ms]",
                  canConfirm
                    ? "text-[--sacred-text-muted] group-hover:text-[--sacred-heart]"
                    : "text-[--sacred-text-muted]"
                )}
              >
                &#x25C7;
              </span>
              <span
                className={cn(
                  "text-sm tracking-[0.1em]",
                  "transition-colors duration-[400ms]",
                  canConfirm
                    ? "text-[--sacred-text-secondary] group-hover:text-[--sacred-heart]"
                    : "text-[--sacred-text-muted]"
                )}
                style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
              >
                Install {finalHearts > 0 ? `${finalHearts} Heart${finalHearts > 1 ? "s" : ""}` : "Hearts"}
              </span>
            </button>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleReturn}
              className="text-xs text-[--sacred-text-muted] hover:text-[--sacred-text-secondary] transition-colors"
              style={{ fontFamily: "var(--font-cormorant), Cormorant Garamond, serif" }}
            >
              ← return
            </button>
          </div>
        </div>
      )}

      {/* RITUAL STATE */}
      {flowState === "ritual" && (
        <div className="animate-[fadeIn_0.6s_ease-in]">
          <Ritual onComplete={handleRitualComplete} />
        </div>
      )}

      {/* AWAKENING STATE */}
      {flowState === "awakening" && (
        <div className="animate-[fadeIn_0.6s_ease-in]">
          <Awakening hearts={finalHearts} onReturn={handleReturn} />
        </div>
      )}
    </div>
  );
}

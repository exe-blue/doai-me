/**
 * SacredSwitch Component
 * Handles offering amount selection with preset tiers and custom input
 */
import { useState } from 'react';

interface OfferingTier {
  amount: number;
  hearts: number;
}

const HEARTS_PER_AMOUNT_RATIO = 5000;

const OFFERING_TIERS: OfferingTier[] = [
  { amount: 5000, hearts: 1 },
  { amount: 10000, hearts: 2 },
  { amount: 30000, hearts: 6 },
  { amount: 50000, hearts: 10 },
];

interface CustomAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
}

function CustomAmountInput({ value, onChange, onFocus }: CustomAmountInputProps) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder="Custom amount"
      className="w-full px-4 py-2 border rounded"
      min="0"
    />
  );
}

export default function SacredSwitch() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [finalHearts, setFinalHearts] = useState(0);

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setFinalHearts(Math.floor(numValue / HEARTS_PER_AMOUNT_RATIO));
    } else {
      setFinalHearts(0);
    }
  };

  const handlePresetClick = (tier: OfferingTier) => {
    setSelectedAmount(tier.amount);
    setCustomAmount('');
    setFinalHearts(tier.hearts);
  };

  return (
    <div className="sacred-switch">
      <div className="preset-tiers">
        {OFFERING_TIERS.map((tier) => (
          <button
            key={tier.amount}
            onClick={() => handlePresetClick(tier)}
            className={`preset-button ${selectedAmount === tier.amount ? 'selected' : ''}`}
          >
            <div>₩{tier.amount.toLocaleString()}</div>
            <div>{tier.hearts} ❤️</div>
          </button>
        ))}
      </div>

      <CustomAmountInput
        value={customAmount}
        onChange={handleCustomAmountChange}
        onFocus={() => {
          setSelectedAmount(null);
          setFinalHearts(0);
        }}
      />

      <div className="hearts-display">
        <span>Hearts: {finalHearts} ❤️</span>
      </div>
    </div>
  );
}

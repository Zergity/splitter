import { useState } from 'react';
import { Expense } from '../types';
import { useApp } from '../context/AppContext';

interface SignOffButtonProps {
  expense: Expense;
  compact?: boolean;
  targetMemberId?: string;  // If provided, force sign-off for this member
  isForceSignOff?: boolean;  // Changes visual style to amber/warning theme
}

export function SignOffButton({
  expense,
  compact = false,
  targetMemberId,
  isForceSignOff = false
}: SignOffButtonProps) {
  const { signOffExpense, group } = useApp();
  const [loading, setLoading] = useState(false);
  const isSettlement = expense.splitType === 'settlement';

  const handleSignOff = async () => {
    setLoading(true);
    try {
      await signOffExpense(expense, targetMemberId);
    } finally {
      setLoading(false);
    }
  };

  // Determine button text
  let buttonText: string;
  if (isForceSignOff && targetMemberId && group) {
    const targetMember = group.members.find(m => m.id === targetMemberId);
    buttonText = loading ? 'Accepting...' : `⚠️ Accept for ${targetMember?.name}`;
  } else if (isSettlement) {
    buttonText = loading ? 'Confirming...' : 'Confirm';
  } else {
    buttonText = loading ? 'Accepting...' : 'Accept';
  }

  // Determine button color (AMBER for force sign-off)
  const colorClass = isForceSignOff
    ? 'bg-amber-600 hover:bg-amber-700'  // Warning/amber theme for force actions
    : isSettlement
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-cyan-600 hover:bg-cyan-700';

  return (
    <button
      onClick={handleSignOff}
      disabled={loading}
      className={`text-white rounded-lg font-medium disabled:opacity-50 ${
        compact ? 'py-1 px-3 text-sm' : 'w-full py-2 px-4'
      } ${colorClass}`}
    >
      {buttonText}
    </button>
  );
}

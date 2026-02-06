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

  // Determine button styles
  const colorClass = isForceSignOff
    ? 'text-amber-400 hover:text-amber-300'  // Text link style for force actions
    : isSettlement
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-cyan-600 hover:bg-cyan-700';

  const sizeClass = isForceSignOff
    ? (compact ? 'text-xs' : 'text-sm')  // Text link is smaller
    : (compact ? 'py-1 px-3 text-sm' : 'w-full py-2 px-4');

  return (
    <button
      onClick={handleSignOff}
      disabled={loading}
      className={`text-white rounded-lg font-medium disabled:opacity-50 ${sizeClass} ${colorClass}`}
    >
      {buttonText}
    </button>
  );
}

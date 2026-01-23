import { useState } from 'react';
import { Expense } from '../types';
import { useApp } from '../context/AppContext';

interface SignOffButtonProps {
  expense: Expense;
}

export function SignOffButton({ expense }: SignOffButtonProps) {
  const { signOffExpense } = useApp();
  const [loading, setLoading] = useState(false);

  const handleSignOff = async () => {
    setLoading(true);
    try {
      await signOffExpense(expense);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOff}
      disabled={loading}
      className="w-full bg-cyan-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
    >
      {loading ? 'Signing...' : 'Sign Off'}
    </button>
  );
}

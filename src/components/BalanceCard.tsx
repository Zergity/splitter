import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MemberBalance, Settlement } from '../types';
import { formatCurrency } from '../utils/balances';
import { useApp } from '../context/AppContext';

interface BalanceCardProps {
  balance: MemberBalance;
  currency: string;
  isCurrentUser?: boolean;
  suggestedSettlement?: Settlement;
}

export function BalanceCard({
  balance,
  currency,
  isCurrentUser = false,
  suggestedSettlement,
}: BalanceCardProps) {
  const { removeMember } = useApp();
  const [deleting, setDeleting] = useState(false);
  const signedPositive = balance.signedBalance > 0.01;
  const signedNegative = balance.signedBalance < -0.01;
  const signedSettled = !signedPositive && !signedNegative;

  const hasPendingBalance = Math.abs(balance.pendingBalance) > 0.01;

  // Can delete if both signed and pending balances are 0
  const canDelete = !isCurrentUser && signedSettled && !hasPendingBalance;

  const handleDelete = async () => {
    if (!confirm(`Remove ${balance.memberName} from the group?`)) return;
    setDeleting(true);
    try {
      await removeMember(balance.memberId);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        isCurrentUser ? 'border-cyan-600 bg-cyan-900/30' : 'border-gray-700 bg-gray-800'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-medium">
          {isCurrentUser ? (
            <span className="text-cyan-400">You</span>
          ) : balance.memberName}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-semibold">
            <span
              className={
                signedPositive
                  ? 'text-green-400'
                  : signedNegative
                  ? 'text-red-400'
                  : 'text-gray-400'
              }
            >
              {signedPositive && '+'}
              {formatCurrency(balance.signedBalance, currency)}
            </span>
            {hasPendingBalance && (
              <span className={`ml-1 opacity-50 ${balance.pendingBalance > 0 ? 'text-green-500' : 'text-red-400'}`}>
                ({balance.pendingBalance > 0 ? '+' : ''}{formatCurrency(balance.pendingBalance, currency)})
              </span>
            )}
          </span>
          {signedNegative && (
            <Link
              to={suggestedSettlement
                ? `/settle?from=${balance.memberId}&to=${suggestedSettlement.to}&amount=${suggestedSettlement.amount}`
                : `/settle?from=${balance.memberId}`
              }
              className="text-sm bg-cyan-600 text-white px-3 py-1 rounded hover:bg-cyan-700"
            >
              Settle
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Removing...' : 'Remove User'}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {signedPositive && 'is owed money'}
        {signedNegative && 'owes money'}
        {signedSettled && 'is settled up'}
      </p>
    </div>
  );
}

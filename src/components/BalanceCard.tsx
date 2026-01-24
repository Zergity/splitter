import { MemberBalance } from '../types';
import { formatCurrency } from '../utils/balances';

interface BalanceCardProps {
  balance: MemberBalance;
  currency: string;
  isCurrentUser?: boolean;
}

export function BalanceCard({
  balance,
  currency,
  isCurrentUser = false,
}: BalanceCardProps) {
  const signedPositive = balance.signedBalance > 0.01;
  const signedNegative = balance.signedBalance < -0.01;
  const signedSettled = !signedPositive && !signedNegative;

  const hasPendingBalance = Math.abs(balance.pendingBalance) > 0.01;

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
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {signedPositive && 'is owed money'}
        {signedNegative && 'owes money'}
        {signedSettled && 'is settled up'}
      </p>
    </div>
  );
}

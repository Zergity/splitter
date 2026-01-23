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
  const isPositive = balance.balance > 0.01;
  const isNegative = balance.balance < -0.01;
  const isSettled = !isPositive && !isNegative;

  return (
    <div
      className={`p-4 rounded-lg border ${
        isCurrentUser ? 'border-cyan-600 bg-cyan-900/30' : 'border-gray-700 bg-gray-800'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-medium">
          {balance.memberName}
          {isCurrentUser && (
            <span className="text-xs text-cyan-400 ml-2">(You)</span>
          )}
        </span>
        <span
          className={`font-semibold ${
            isPositive
              ? 'text-green-400'
              : isNegative
              ? 'text-red-400'
              : 'text-gray-400'
          }`}
        >
          {isPositive && '+'}
          {formatCurrency(balance.balance, currency)}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {isPositive && 'is owed money'}
        {isNegative && 'owes money'}
        {isSettled && 'is settled up'}
      </p>
    </div>
  );
}

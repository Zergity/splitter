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
        isCurrentUser ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-medium">
          {balance.memberName}
          {isCurrentUser && (
            <span className="text-xs text-indigo-600 ml-2">(You)</span>
          )}
        </span>
        <span
          className={`font-semibold ${
            isPositive
              ? 'text-green-600'
              : isNegative
              ? 'text-red-600'
              : 'text-gray-600'
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

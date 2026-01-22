import { Expense, Member } from '../types';
import { formatCurrency } from '../utils/balances';
import { SignOffButton } from './SignOffButton';
import { useApp } from '../context/AppContext';

interface ExpenseCardProps {
  expense: Expense;
  members: Member[];
  currency: string;
  showSignOff?: boolean;
  onDelete?: () => void;
}

export function ExpenseCard({
  expense,
  members,
  currency,
  showSignOff = false,
  onDelete,
}: ExpenseCardProps) {
  const { currentUser } = useApp();
  const payer = members.find((m) => m.id === expense.paidBy);
  const allSigned = expense.splits.every((s) => s.signedOff);

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name || 'Unknown';

  const userSplit = currentUser
    ? expense.splits.find((s) => s.memberId === currentUser.id)
    : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium text-gray-900">{expense.description}</h3>
          <p className="text-sm text-gray-500">
            Paid by {payer?.name || 'Unknown'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg">
            {formatCurrency(expense.amount, currency)}
          </p>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              allSigned
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {allSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500 mb-2">
          Split ({expense.splitType}):
        </p>
        <div className="space-y-1">
          {expense.splits.map((split) => (
            <div
              key={split.memberId}
              className="flex justify-between items-center text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    split.signedOff ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                {getMemberName(split.memberId)}
              </span>
              <span className="text-gray-600">
                {formatCurrency(split.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showSignOff && userSplit && !userSplit.signedOff && (
        <div className="mt-3 pt-3 border-t">
          <SignOffButton expense={expense} />
        </div>
      )}

      {onDelete && (
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={onDelete}
            className="text-red-600 text-sm hover:text-red-700"
          >
            Delete expense
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {new Date(expense.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

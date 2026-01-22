import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Expense, Member } from '../types';
import { formatCurrency, formatRelativeTime } from '../utils/balances';
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
  const { currentUser, updateExpense } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(expense.description);
  const [saving, setSaving] = useState(false);

  const payer = members.find((m) => m.id === expense.paidBy);
  const creator = members.find((m) => m.id === expense.createdBy);
  const allSigned = expense.splits.every((s) => s.signedOff);

  const getMemberName = (id: string) =>
    members.find((m) => m.id === id)?.name || 'Unknown';

  const userSplit = currentUser
    ? expense.splits.find((s) => s.memberId === currentUser.id)
    : null;

  // Check if current user can edit (payer or creator)
  const canEdit = currentUser &&
    (currentUser.id === expense.paidBy || currentUser.id === expense.createdBy);

  const handleSaveDescription = async () => {
    if (!editDescription.trim()) return;
    setSaving(true);
    try {
      await updateExpense(expense.id, { description: editDescription.trim() });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDescription(expense.description);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="flex-1 border rounded px-2 py-1 text-sm"
                autoFocus
              />
              <button
                onClick={handleSaveDescription}
                disabled={saving}
                className="text-green-600 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{expense.description}</h3>
              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-600 text-xs hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/edit/${expense.id}`}
                    className="text-indigo-600 text-xs hover:text-indigo-800"
                  >
                    Edit amounts
                  </Link>
                </>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500">
            Paid by {payer?.name || 'Unknown'}
            {creator && creator.id !== expense.paidBy && (
              <span className="text-gray-400"> (added by {creator.name})</span>
            )}
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
                {split.signedOff && (
                  <span className="text-xs text-green-600 font-medium">Signed</span>
                )}
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
          {userSplit.previousAmount !== undefined && (
            <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              <p className="text-orange-800 font-medium">Amount changed</p>
              <p className="text-orange-600">
                {formatCurrency(userSplit.previousAmount, currency)} → {formatCurrency(userSplit.amount, currency)}
                {userSplit.amount > userSplit.previousAmount && (
                  <span className="text-red-600 ml-1">
                    (+{formatCurrency(userSplit.amount - userSplit.previousAmount, currency)})
                  </span>
                )}
                {userSplit.amount < userSplit.previousAmount && (
                  <span className="text-green-600 ml-1">
                    (-{formatCurrency(userSplit.previousAmount - userSplit.amount, currency)})
                  </span>
                )}
              </p>
            </div>
          )}
          <SignOffButton expense={expense} />
        </div>
      )}

      {onDelete && canEdit && (
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
        {formatRelativeTime(expense.createdAt)}
      </p>
    </div>
  );
}

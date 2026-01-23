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
  const [expanded, setExpanded] = useState(false);

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
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-100"
                autoFocus
              />
              <button
                onClick={handleSaveDescription}
                disabled={saving}
                className="text-green-400 text-sm font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-100">{expense.description}</h3>
              {canEdit && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-cyan-400 text-xs hover:text-cyan-300"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/edit/${expense.id}`}
                    className="text-cyan-400 text-xs hover:text-cyan-300"
                  >
                    Edit amounts
                  </Link>
                </>
              )}
            </div>
          )}
          <p className="text-sm text-gray-400">
            Paid by {payer?.name || 'Unknown'}
            {creator && creator.id !== expense.paidBy && (
              <span className="text-gray-500"> (added by {creator.name})</span>
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
                ? 'bg-green-900 text-green-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}
          >
            {allSigned ? 'Signed' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        {/* Collapsed view: show only user's split */}
        {!expanded && userSplit && (
          <div
            className="cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    userSplit.signedOff ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                Your share
                {userSplit.signedOff && (
                  <span className="text-xs text-green-400 font-medium">Signed</span>
                )}
              </span>
              <span className="text-gray-400">
                {formatCurrency(userSplit.amount, currency)}
              </span>
            </div>
            {expense.splits.length > 1 && (
              <p className="text-xs text-cyan-400 mt-1">
                Tap to see all {expense.splits.length} participants
              </p>
            )}
          </div>
        )}

        {/* Collapsed view: no user split, show summary */}
        {!expanded && !userSplit && (
          <div
            className="cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            <p className="text-sm text-gray-400">
              {expense.splits.length} participant{expense.splits.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-cyan-400 mt-1">
              Tap to see details
            </p>
          </div>
        )}

        {/* Expanded view: show all splits */}
        {expanded && (
          <div>
            <div
              className="flex justify-between items-center mb-2 cursor-pointer"
              onClick={() => setExpanded(false)}
            >
              <p className="text-xs text-gray-500">
                Split ({expense.splitType}):
              </p>
              <p className="text-xs text-cyan-400">
                Tap to collapse
              </p>
            </div>
            <div className="space-y-1">
              {expense.splits.map((split) => (
                <div
                  key={split.memberId}
                  className={`flex justify-between items-center text-sm ${
                    currentUser && split.memberId === currentUser.id ? 'font-medium' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        split.signedOff ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                    {currentUser && split.memberId === currentUser.id
                      ? `${getMemberName(split.memberId)} (you)`
                      : getMemberName(split.memberId)}
                    {split.signedOff && (
                      <span className="text-xs text-green-400 font-medium">Signed</span>
                    )}
                  </span>
                  <span className="text-gray-400">
                    {formatCurrency(split.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSignOff && userSplit && !userSplit.signedOff && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          {userSplit.previousAmount !== undefined && (
            <div className="mb-3 p-2 bg-orange-900/30 border border-orange-700 rounded-lg text-sm">
              <p className="text-orange-200 font-medium">Amount changed</p>
              <p className="text-orange-400">
                {formatCurrency(userSplit.previousAmount, currency)} → {formatCurrency(userSplit.amount, currency)}
                {userSplit.amount > userSplit.previousAmount && (
                  <span className="text-red-400 ml-1">
                    (+{formatCurrency(userSplit.amount - userSplit.previousAmount, currency)})
                  </span>
                )}
                {userSplit.amount < userSplit.previousAmount && (
                  <span className="text-green-400 ml-1">
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
        <div className="mt-3 pt-3 border-t border-gray-700">
          <button
            onClick={onDelete}
            className="text-red-400 text-sm hover:text-red-300"
          >
            Delete expense
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        {formatRelativeTime(expense.createdAt)}
      </p>
    </div>
  );
}

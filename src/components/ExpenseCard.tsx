import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Expense, Member } from '../types';
import { formatCurrency, formatRelativeTime, getTagColor } from '../utils/balances';
import { SignOffButton } from './SignOffButton';
import { useApp } from '../context/AppContext';

interface ExpenseCardProps {
  expense: Expense;
  members: Member[];
  currency: string;
  showSignOff?: boolean;
  compactSignOff?: boolean;
  onDelete?: () => void;
}

export function ExpenseCard({
  expense,
  members,
  currency,
  showSignOff = false,
  compactSignOff = false,
  onDelete,
}: ExpenseCardProps) {
  const { currentUser, updateExpense } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  const payer = members.find((m) => m.id === expense.paidBy);
  const creator = members.find((m) => m.id === expense.createdBy);
  const allSigned = expense.splits.every((s) => s.signedOff);
  const isSettlement = expense.splitType === 'settlement';

  // Check if expense has unassigned items (incomplete)
  const hasUnassignedItems = expense.items?.some((item) => !item.memberId) ?? false;

  // For settlements, get the recipient (the person in splits)
  const recipient = isSettlement ? members.find((m) => m.id === expense.splits[0]?.memberId) : null;

  const getMemberName = (id: string) => {
    if (currentUser && id === currentUser.id) return 'You';
    return members.find((m) => m.id === id)?.name || 'Unknown';
  };

  const userSplit = currentUser
    ? expense.splits.find((s) => s.memberId === currentUser.id)
    : null;

  // Only payer can edit/delete
  const canEdit = currentUser && currentUser.id === expense.paidBy;

  return (
    <div className={`bg-gray-800 rounded-lg shadow-sm border ${isSettlement ? 'border-green-700' : 'border-gray-700'} p-4`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {isSettlement ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">
                  Settlement
                </span>
                {canEdit && (
                  <button
                    onClick={onDelete}
                    className="text-red-400 text-xs hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-sm mt-2">
                <span className={currentUser && payer?.id === currentUser.id ? 'text-cyan-400 font-medium' : 'text-gray-100'}>
                  {currentUser && payer?.id === currentUser.id ? 'You' : (payer?.name || 'Unknown')}
                </span>
                <span className="text-gray-500 mx-2">paid</span>
                <span className={currentUser && recipient?.id === currentUser.id ? 'text-cyan-400 font-medium' : 'text-gray-100'}>
                  {currentUser && recipient?.id === currentUser.id ? 'You' : (recipient?.name || 'Unknown')}
                </span>
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-100">{expense.description}</h3>
                {canEdit && (
                  <Link
                    to={`/edit/${expense.id}`}
                    className="text-cyan-400 text-xs hover:text-cyan-300"
                  >
                    Edit
                  </Link>
                )}
              </div>
              <p className="text-sm text-gray-400">
                Paid by {currentUser && payer?.id === currentUser.id ? (
                  <span className="text-cyan-400">You</span>
                ) : (payer?.name || 'Unknown')}
                {creator && creator.id !== expense.paidBy && (
                  <span className="text-gray-500"> (added by {currentUser && creator.id === currentUser.id ? (
                    <span className="text-cyan-400">You</span>
                  ) : creator.name})</span>
                )}
              </p>
            </>
          )}
          {/* Tags - only show for non-settlements */}
          {!isSettlement && <div className="flex flex-wrap items-center gap-1 mt-1">
            {expense.tags?.map((tag) => {
              const color = getTagColor(tag);
              return (
                <button
                  key={tag}
                  onClick={async () => {
                    const newTags = expense.tags?.filter((t) => t !== tag) || [];
                    await updateExpense(expense.id, { tags: newTags });
                  }}
                  className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} hover:bg-red-900 hover:text-red-300`}
                  title="Click to remove"
                >
                  {tag} ×
                </button>
              );
            })}
            {currentUser && !editingTags && (
              <button
                onClick={() => setEditingTags(true)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                + tag
              </button>
            )}
            {editingTags && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      setSavingTags(true);
                      const newTags = [...(expense.tags || []), tagInput.trim().toLowerCase()];
                      await updateExpense(expense.id, { tags: [...new Set(newTags)] });
                      setTagInput('');
                      setSavingTags(false);
                    } else if (e.key === 'Escape') {
                      setEditingTags(false);
                      setTagInput('');
                    }
                  }}
                  placeholder="add tag"
                  className="w-20 text-xs bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-gray-100"
                  autoFocus
                  disabled={savingTags}
                />
                <button
                  onClick={async () => {
                    if (tagInput.trim()) {
                      setSavingTags(true);
                      const newTags = [...(expense.tags || []), tagInput.trim().toLowerCase()];
                      await updateExpense(expense.id, { tags: [...new Set(newTags)] });
                      setTagInput('');
                      setSavingTags(false);
                    }
                    setEditingTags(false);
                  }}
                  className="text-xs text-green-400"
                  disabled={savingTags}
                >
                  {savingTags ? '...' : 'OK'}
                </button>
                <button
                  onClick={() => {
                    setEditingTags(false);
                    setTagInput('');
                  }}
                  className="text-xs text-gray-500"
                >
                  ×
                </button>
              </div>
            )}
          </div>}
        </div>
        <div className="text-right">
          <p className="font-semibold text-lg">
            {formatCurrency(expense.amount, currency)}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1">
            {expense.receiptUrl && (
              <button
                onClick={() => setShowReceipt(true)}
                className="text-cyan-400 hover:text-cyan-300"
                title="View receipt"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                hasUnassignedItems
                  ? 'bg-orange-900 text-orange-300'
                  : allSigned
                  ? 'bg-green-900 text-green-300'
                  : 'bg-yellow-900 text-yellow-300'
              }`}
            >
              {hasUnassignedItems ? 'Incomplete' : allSigned ? 'Accepted' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Settlement: simple confirmation status */}
      {isSettlement ? (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  allSigned ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              {allSigned ? (
                <span className="text-green-400">Confirmed by recipient</span>
              ) : (
                <span className="text-yellow-400">
                  Awaiting confirmation from {recipient && currentUser && recipient.id === currentUser.id ? 'You' : (recipient?.name || 'recipient')}
                </span>
              )}
            </div>
            {showSignOff && userSplit && !userSplit.signedOff && (
              <SignOffButton expense={expense} compact />
            )}
          </div>
        </div>
      ) : (
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
                    <span className="text-xs text-green-400 font-medium">Accepted</span>
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
                      {currentUser && split.memberId === currentUser.id ? (
                        <span className="text-cyan-400">You</span>
                      ) : getMemberName(split.memberId)}
                      {split.signedOff && (
                        <span className="text-xs text-green-400 font-medium">Accepted</span>
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
      )}

      {showSignOff && userSplit && !userSplit.signedOff && !isSettlement && (
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
          <SignOffButton expense={expense} compact={compactSignOff} />
        </div>
      )}

      {onDelete && canEdit && !isSettlement && (
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

      {/* Receipt modal */}
      {showReceipt && expense.receiptUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceipt(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={expense.receiptUrl}
              alt="Receipt"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute top-2 right-2 bg-gray-900/70 text-gray-300 rounded-full p-2 hover:bg-gray-900"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

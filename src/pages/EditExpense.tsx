import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReceiptItems } from '../components/ReceiptItems';
import { ReceiptItem } from '../types';
import { roundNumber } from '../utils/balances';

export function EditExpense() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { group, expenses, currentUser, updateExpense } = useApp();

  const expense = expenses.find((e) => e.id === id);

  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing expense data
  useEffect(() => {
    if (expense && group) {
      setDescription(expense.description);
      setPaidBy(expense.paidBy);

      // Use stored items if available, otherwise convert splits to items
      if (expense.items && expense.items.length > 0) {
        setItems(expense.items);
      } else {
        // Convert splits to items for backward compatibility
        const convertedItems: ReceiptItem[] = expense.splits.map((split) => ({
          id: crypto.randomUUID(),
          description: '',
          amount: split.amount,
          memberId: split.memberId,
        }));
        setItems(convertedItems);
      }
    }
  }, [expense, group]);

  // Calculate totals from items
  const itemsTotal = items.reduce((sum, i) => sum + i.amount, 0);
  const totalAmount = manualTotal !== null ? manualTotal : itemsTotal;

  // Calculate which members are included
  const includedMemberIds = new Set(items.filter(i => i.memberId).map(i => i.memberId!));

  // Only payer can edit
  const canEdit =
    currentUser &&
    expense &&
    currentUser.id === expense.paidBy;

  // Calculate splits from items
  const calculateSplits = () => {
    const memberTotals = new Map<string, number>();
    for (const item of items) {
      if (item.memberId && item.amount > 0) {
        const current = memberTotals.get(item.memberId) || 0;
        memberTotals.set(item.memberId, roundNumber(current + item.amount, 2));
      }
    }

    // Payer takes the difference between total and assigned items sum
    if (paidBy && totalAmount > 0) {
      const currentItemsSum = Array.from(memberTotals.values()).reduce((sum, v) => sum + v, 0);
      const diff = roundNumber(totalAmount - currentItemsSum, 2);
      if (Math.abs(diff) > 0.001) {
        const payerCurrent = memberTotals.get(paidBy) || 0;
        memberTotals.set(paidBy, roundNumber(payerCurrent + diff, 2));
      }
    }

    return memberTotals;
  };

  const handleTotalChange = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      const currentSum = items.reduce((sum, i) => sum + i.amount, 0);
      const diff = roundNumber(parsed - currentSum, 2);

      if (Math.abs(diff) > 0.001 && items.length > 0) {
        const payerItem = items.find(i => i.memberId === paidBy);
        const targetItem = payerItem || items[0];
        const newAmount = roundNumber(targetItem.amount + diff, 2);
        setItems(items.map(item =>
          item.id === targetItem.id ? { ...item, amount: Math.max(0, newAmount) } : item
        ));
      }
      setManualTotal(null);
    } else if (value === '' || value === '0') {
      setManualTotal(null);
    }
  };

  const handleItemsChange = (newItems: ReceiptItem[]) => {
    setItems(newItems);
    setManualTotal(null);
  };

  const handleMemberTap = (memberId: string) => {
    if (selectedItemId) {
      handleItemsChange(items.map(item =>
        item.id === selectedItemId ? { ...item, memberId } : item
      ));
      setSelectedItemId(null);
      return;
    }

    const isIncluded = includedMemberIds.has(memberId);
    if (isIncluded) {
      handleItemsChange(items.map(item =>
        item.memberId === memberId ? { ...item, memberId: undefined } : item
      ));
    } else {
      const unassignedItem = items.find(item => !item.memberId);
      if (unassignedItem) {
        handleItemsChange(items.map(item =>
          item.id === unassignedItem.id ? { ...item, memberId } : item
        ));
      } else {
        const newItem: ReceiptItem = {
          id: crypto.randomUUID(),
          description: '',
          amount: 0,
          memberId,
        };
        handleItemsChange([...items, newItem]);
      }
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(selectedItemId === itemId ? null : itemId);
  };

  const handleMemberDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', memberId);
  };

  if (!group || !expense) {
    return (
      <div className="text-center py-8 text-gray-400">
        Transaction not found
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-gray-400">
        You don't have permission to edit this transaction
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (totalAmount <= 0) {
      setError('Total amount must be greater than 0');
      return;
    }

    if (!paidBy) {
      setError('Select who paid');
      return;
    }

    if (items.length === 0) {
      setError('Add at least one item');
      return;
    }

    setSubmitting(true);

    try {
      const memberTotals = calculateSplits();
      const oldSplitsMap = new Map(
        expense.splits.map((s) => [s.memberId, s])
      );

      // Build splits with sign-off logic
      const splits = Array.from(memberTotals.entries()).map(([memberId, amount]) => {
        const oldSplit = oldSplitsMap.get(memberId);

        // Payer always auto-signs
        if (memberId === paidBy) {
          return {
            memberId,
            value: amount,
            amount,
            signedOff: true,
            signedAt: new Date().toISOString(),
          };
        }

        // New participant or amount changed - require sign-off
        if (!oldSplit || Math.abs(oldSplit.amount - amount) > 0.01) {
          return {
            memberId,
            value: amount,
            amount,
            signedOff: false,
            signedAt: undefined,
            previousAmount: oldSplit?.amount,
          };
        }

        // Keep existing sign-off status
        return {
          memberId,
          value: amount,
          amount,
          signedOff: oldSplit.signedOff,
          signedAt: oldSplit.signedAt,
          previousAmount: oldSplit.previousAmount,
        };
      });

      await updateExpense(expense.id, {
        description: description.trim(),
        amount: totalAmount,
        paidBy,
        splitType: 'exact',
        splits,
        items,
      });

      navigate('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      <h2 className="text-xl font-bold mb-6">Edit Transaction</h2>

      <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6 text-sm">
        Changing amounts will require affected members to accept again.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this transaction for?"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Paid by
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100"
          >
            <option value="">Select who paid</option>
            {group.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        {/* Split between - draggable members */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Split between
          </label>
          <div className="flex flex-wrap gap-2">
            {group.members.map((member) => {
              const isIncluded = includedMemberIds.has(member.id);
              const isYou = currentUser && member.id === currentUser.id;
              return (
                <div
                  key={member.id}
                  draggable
                  onClick={() => handleMemberTap(member.id)}
                  onDragStart={(e) => handleMemberDragStart(e, member.id)}
                  className={`px-3 py-1.5 rounded-full text-sm cursor-grab active:cursor-grabbing select-none transition-colors ${
                    isIncluded
                      ? 'bg-cyan-600 text-white hover:bg-red-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isYou ? <span className="text-cyan-300">You</span> : member.name}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tap item then tap member, or drag member to item
          </p>
        </div>

        {/* Amounts section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Amounts
            </label>
            {includedMemberIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  const selectedMembers = Array.from(includedMemberIds);
                  if (selectedMembers.length === 0) return;
                  const splitAmount = roundNumber(totalAmount / selectedMembers.length, 2);
                  const newItems: ReceiptItem[] = selectedMembers.map(memberId => ({
                    id: crypto.randomUUID(),
                    description: '',
                    amount: splitAmount,
                    memberId,
                  }));
                  handleItemsChange(newItems);
                }}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Split equally
              </button>
            )}
          </div>
          <ReceiptItems
            items={items}
            members={group.members}
            currency={group.currency}
            totalAmount={totalAmount}
            onTotalChange={handleTotalChange}
            onChange={handleItemsChange}
            payerId={paidBy}
            selectedItemId={selectedItemId}
            onItemSelect={handleItemSelect}
          />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 bg-gray-700 text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="flex-1 bg-cyan-600 text-white py-3 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

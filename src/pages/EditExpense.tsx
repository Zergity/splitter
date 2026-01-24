import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SplitInput } from '../components/SplitInput';
import { SplitType } from '../types';
import { calculateSplits, validateSplits } from '../utils/splits';
import { roundNumber } from '../utils/balances';

interface SplitValue {
  memberId: string;
  value: number;
  selected: boolean;
}

export function EditExpense() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { group, expenses, currentUser, updateExpense } = useApp();

  const expense = expenses.find((e) => e.id === id);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('exact');
  const [splits, setSplits] = useState<SplitValue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with existing expense data
  useEffect(() => {
    if (expense && group) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setPaidBy(expense.paidBy);
      setSplitType(expense.splitType);

      // Build splits from expense and group members
      const expenseSplits = new Map(
        expense.splits.map((s) => [s.memberId, s])
      );

      setSplits(
        group.members.map((m) => {
          const existingSplit = expenseSplits.get(m.id);
          return {
            memberId: m.id,
            value: existingSplit?.value || 0,
            selected: !!existingSplit,
          };
        })
      );
    }
  }, [expense, group]);

  const amountNum = parseFloat(amount) || 0;

  // Only payer can edit
  const canEdit =
    currentUser &&
    expense &&
    currentUser.id === expense.paidBy;

  // Track selected member IDs to detect selection changes
  const selectedMemberIds = splits
    .filter((s) => s.selected)
    .map((s) => s.memberId)
    .join(',');

  // Auto-fill payer's value when amount, selection, or payer changes
  useEffect(() => {
    if (splitType === 'shares') return;

    const selected = splits.filter((s) => s.selected);
    if (selected.length === 0) return;

    // Find remainder recipient: payer if selected, otherwise first selected
    const payerSelected = selected.find((s) => s.memberId === paidBy);
    const recipientId = payerSelected ? paidBy : selected[0].memberId;

    // Calculate sum of others
    const othersSum = selected
      .filter((s) => s.memberId !== recipientId)
      .reduce((sum, s) => sum + s.value, 0);

    const targetTotal = splitType === 'exact' ? amountNum : 100;
    const remainder = Math.max(0, roundNumber(targetTotal - othersSum, 1));

    setSplits((prev) =>
      prev.map((s) =>
        s.memberId === recipientId ? { ...s, value: remainder } : s
      )
    );
  }, [amountNum, paidBy, splitType, selectedMemberIds]);

  if (!group || !expense) {
    return (
      <div className="text-center py-8 text-gray-400">
        Expense not found
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-gray-400">
        You don't have permission to edit this expense
      </div>
    );
  }

  const selectedSplits = splits.filter((s) => s.selected);

  // Calculate final amount for a split based on current type
  const getCalculatedAmount = (split: SplitValue, type: SplitType): number => {
    if (!split.selected) return 0;
    const selected = splits.filter((s) => s.selected);

    switch (type) {
      case 'exact':
        return split.value;
      case 'percentage':
        return (amountNum * split.value) / 100;
      case 'shares': {
        const totalShares = selected.reduce((sum, s) => sum + s.value, 0);
        return totalShares > 0 ? (amountNum * split.value) / totalShares : 0;
      }
      default:
        return split.value;
    }
  };

  // Convert splits when changing split type to preserve final amounts
  const handleSplitTypeChange = (newType: SplitType) => {
    if (newType === splitType) return;

    const selected = splits.filter((s) => s.selected);
    if (selected.length === 0 || amountNum <= 0) {
      setSplitType(newType);
      return;
    }

    // Calculate current final amounts
    const amounts = splits.map((s) => ({
      memberId: s.memberId,
      amount: getCalculatedAmount(s, splitType),
      selected: s.selected,
    }));

    // Convert to new type values
    const totalShares = selected.length;
    const newSplits = splits.map((s) => {
      const currentAmount = amounts.find((a) => a.memberId === s.memberId)?.amount || 0;

      let newValue: number;
      switch (newType) {
        case 'exact':
          newValue = roundNumber(currentAmount, 1);
          break;
        case 'percentage':
          newValue = amountNum > 0 ? roundNumber((currentAmount / amountNum) * 100, 1) : 0;
          break;
        case 'shares':
          newValue = amountNum > 0 ? roundNumber((currentAmount / amountNum) * totalShares, 1) : 0;
          break;
        default:
          newValue = roundNumber(currentAmount, 1);
      }

      return { ...s, value: s.selected ? newValue : s.value };
    });

    setSplits(newSplits);
    setSplitType(newType);
  };

  const handleSplitEqually = () => {
    const selectedCount = splits.filter((s) => s.selected).length;
    if (selectedCount === 0) return;

    let equalValue: number;
    switch (splitType) {
      case 'exact':
        equalValue = amountNum > 0 ? roundNumber(amountNum / selectedCount, 1) : 0;
        break;
      case 'percentage':
        equalValue = roundNumber(100 / selectedCount, 1);
        break;
      case 'shares':
        equalValue = 1;
        break;
      default:
        equalValue = 1;
    }

    setSplits(
      splits.map((s) => ({
        ...s,
        value: s.selected ? equalValue : s.value,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!paidBy) {
      setError('Select who paid');
      return;
    }

    if (selectedSplits.length === 0) {
      setError('Select at least one participant');
      return;
    }

    const validation = validateSplits(
      amountNum,
      splitType,
      selectedSplits.map((s) => ({ memberId: s.memberId, value: s.value }))
    );

    if (!validation.valid) {
      setError(validation.error || 'Invalid split');
      return;
    }

    setSubmitting(true);

    try {
      // Calculate new splits
      const newCalculatedSplits = calculateSplits(
        amountNum,
        splitType,
        selectedSplits.map((s) => ({ memberId: s.memberId, value: s.value })),
        paidBy
      );

      // Determine which members need to re-sign-off
      // Reset signedOff for members whose amount changed
      const oldSplitsMap = new Map(
        expense.splits.map((s) => [s.memberId, s])
      );

      const finalSplits = newCalculatedSplits.map((newSplit) => {
        const oldSplit = oldSplitsMap.get(newSplit.memberId);

        // If member is the payer, auto-sign
        if (newSplit.memberId === paidBy) {
          return {
            ...newSplit,
            signedOff: true,
            signedAt: new Date().toISOString(),
          };
        }

        // If this is a new participant or amount changed significantly, require re-sign-off
        if (!oldSplit || Math.abs(oldSplit.amount - newSplit.amount) > 0.01) {
          return {
            ...newSplit,
            signedOff: false,
            signedAt: undefined,
            // Store the previous amount so we can show the change
            previousAmount: oldSplit?.amount,
          };
        }

        // Keep existing sign-off status if amount didn't change
        return {
          ...newSplit,
          signedOff: oldSplit.signedOff,
          signedAt: oldSplit.signedAt,
          previousAmount: oldSplit.previousAmount, // preserve if already set
        };
      });

      await updateExpense(expense.id, {
        description: description.trim(),
        amount: amountNum,
        paidBy,
        splitType,
        splits: finalSplits,
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
      <h2 className="text-xl font-bold mb-6">Edit Expense</h2>

      <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-6 text-sm">
        Changing amounts will require affected members to sign off again.
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
            placeholder="What was this expense for?"
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

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Split between
          </label>
          <SplitInput
            members={group.members}
            splitType={splitType}
            splits={splits}
            totalAmount={amountNum}
            currency={group.currency}
            paidBy={paidBy}
            onChange={setSplits}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Split type
          </label>
          <div className="flex gap-2">
            {(['exact', 'percentage', 'shares'] as SplitType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize ${
                    splitType === type
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {type === 'percentage' ? '%' : type}
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Amounts
            </label>
            <button
              type="button"
              onClick={handleSplitEqually}
              className="text-sm text-cyan-400 hover:text-cyan-300 underline"
            >
              Split equally
            </button>
          </div>
          <SplitInput
            members={group.members}
            splitType={splitType}
            splits={splits}
            totalAmount={amountNum}
            currency={group.currency}
            paidBy={paidBy}
            onChange={setSplits}
            showAmounts
            amountValue={amount}
            onAmountChange={setAmount}
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
            disabled={submitting}
            className="flex-1 bg-cyan-600 text-white py-3 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

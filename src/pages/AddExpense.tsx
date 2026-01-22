import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { SplitInput } from '../components/SplitInput';
import { SplitType } from '../types';
import { calculateSplits, validateSplits } from '../utils/splits';

interface SplitValue {
  memberId: string;
  value: number;
  selected: boolean;
}

export function AddExpense() {
  const navigate = useNavigate();
  const { group, currentUser, createExpense } = useApp();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<SplitValue[]>(() =>
    group?.members.map((m) => ({
      memberId: m.id,
      value: 1,
      selected: true,
    })) || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) return null;

  const amountNum = parseFloat(amount) || 0;
  const selectedSplits = splits.filter((s) => s.selected);

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
      const calculatedSplits = calculateSplits(
        amountNum,
        splitType,
        selectedSplits.map((s) => ({ memberId: s.memberId, value: s.value })),
        paidBy
      );

      await createExpense({
        description: description.trim(),
        amount: amountNum,
        paidBy,
        splitType,
        splits: calculatedSplits,
      });

      navigate('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      <h2 className="text-xl font-bold mb-6">Add Expense</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({group.currency})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full border rounded-lg px-3 py-2 text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paid by
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Split type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium capitalize ${
                    splitType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Split between
          </label>
          <SplitInput
            members={group.members}
            splitType={splitType}
            splits={splits}
            totalAmount={amountNum}
            currency={group.currency}
            onChange={setSplits}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}

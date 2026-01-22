import { useState } from 'react';
import { Member, SplitType } from '../types';
import { formatCurrency, roundNumber } from '../utils/balances';

interface SplitValue {
  memberId: string;
  value: number;
  selected: boolean;
}

interface SplitInputProps {
  members: Member[];
  splitType: SplitType;
  splits: SplitValue[];
  totalAmount: number;
  currency: string;
  paidBy: string;
  onChange: (splits: SplitValue[]) => void;
}

export function SplitInput({
  members,
  splitType,
  splits,
  totalAmount,
  currency,
  paidBy,
  onChange,
}: SplitInputProps) {
  // Track which input is being edited and its text value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const selectedSplits = splits.filter((s) => s.selected);

  const getCalculatedAmount = (split: SplitValue): number => {
    if (!split.selected) return 0;

    switch (splitType) {
      case 'exact':
        return split.value;
      case 'percentage':
        return (totalAmount * split.value) / 100;
      case 'shares': {
        const totalShares = selectedSplits.reduce((sum, s) => sum + s.value, 0);
        return totalShares > 0 ? (totalAmount * split.value) / totalShares : 0;
      }
      default:
        return split.value;
    }
  };

  const toggleMember = (memberId: string) => {
    onChange(
      splits.map((s) =>
        s.memberId === memberId
          ? { ...s, selected: !s.selected, value: s.value || 1 }
          : s
      )
    );
  };

  // Find the remainder recipient: payer if selected, otherwise first selected
  const getRemainderRecipient = (): string | null => {
    const selected = splits.filter((s) => s.selected);
    if (selected.length === 0) return null;
    const payerSelected = selected.find((s) => s.memberId === paidBy);
    return payerSelected ? paidBy : selected[0].memberId;
  };

  const updateValue = (memberId: string, inputValue: string) => {
    // Accept both . and , as decimal separator
    const normalized = inputValue.replace(',', '.');
    const value = parseFloat(normalized) || 0;

    const remainderRecipient = getRemainderRecipient();

    // Calculate total for exact and percentage modes
    const getTargetTotal = () => {
      switch (splitType) {
        case 'exact':
          return totalAmount;
        case 'percentage':
          return 100;
        default:
          return 0; // shares don't need remainder calculation
      }
    };

    const targetTotal = getTargetTotal();

    if (targetTotal > 0 && remainderRecipient && memberId !== remainderRecipient) {
      // Calculate sum of all other participants except the remainder recipient
      const othersSum = splits
        .filter((s) => s.selected && s.memberId !== remainderRecipient && s.memberId !== memberId)
        .reduce((sum, s) => sum + s.value, 0);

      const remainder = Math.max(0, roundNumber(targetTotal - othersSum - value, 1));

      onChange(
        splits.map((s) => {
          if (s.memberId === memberId) {
            return { ...s, value: Math.max(0, value) };
          }
          if (s.memberId === remainderRecipient) {
            return { ...s, value: remainder };
          }
          return s;
        })
      );
    } else {
      onChange(
        splits.map((s) =>
          s.memberId === memberId ? { ...s, value: Math.max(0, value) } : s
        )
      );
    }
  };

  const formatInputValue = (value: number): string => {
    if (!value) return '';
    return roundNumber(value, 1).toString();
  };

  const handleFocus = (id: string, value: number) => {
    setEditingId(id);
    setEditingValue(value ? roundNumber(value, 1).toString() : '');
  };

  const handleBlur = (memberId: string) => {
    if (editingId === memberId) {
      updateValue(memberId, editingValue);
      setEditingId(null);
      setEditingValue('');
    }
  };

  const handleInputChange = (_memberId: string, value: string) => {
    // Allow digits, dots, and commas while editing
    const sanitized = value.replace(/[^0-9.,]/g, '');
    setEditingValue(sanitized);
  };

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const split = splits.find((s) => s.memberId === member.id);
        if (!split) return null;

        const isEditing = editingId === member.id;
        const displayValue = isEditing ? editingValue : formatInputValue(split.value);

        return (
          <div
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              split.selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              checked={split.selected}
              onChange={() => toggleMember(member.id)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="flex-1 font-medium">{member.name}</span>
            {split.selected && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={displayValue}
                  onChange={(e) => handleInputChange(member.id, e.target.value)}
                  onFocus={() => handleFocus(member.id, split.value)}
                  onBlur={() => handleBlur(member.id)}
                  placeholder="0"
                  className="w-20 border rounded px-2 py-1 text-right text-sm"
                />
                <span className="text-sm text-gray-500 w-6">
                  {splitType === 'exact' ? currency : splitType === 'percentage' ? '%' : ''}
                </span>
              </div>
            )}
            {split.selected && splitType !== 'exact' && (
              <span className="text-sm text-gray-500 w-16 text-right">
                {formatCurrency(getCalculatedAmount(split), currency)}
              </span>
            )}
          </div>
        );
      })}

    </div>
  );
}

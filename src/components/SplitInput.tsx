import { Member, SplitType } from '../types';
import { formatCurrency } from '../utils/balances';

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
  onChange: (splits: SplitValue[]) => void;
}

export function SplitInput({
  members,
  splitType,
  splits,
  totalAmount,
  currency,
  onChange,
}: SplitInputProps) {
  const selectedSplits = splits.filter((s) => s.selected);

  const getPlaceholder = () => {
    switch (splitType) {
      case 'equal':
        return 'Auto';
      case 'exact':
        return 'Amount';
      case 'percentage':
        return '%';
      case 'shares':
        return 'Shares';
    }
  };

  const getCalculatedAmount = (split: SplitValue): number => {
    if (!split.selected) return 0;

    switch (splitType) {
      case 'equal':
        return totalAmount / selectedSplits.length;
      case 'exact':
        return split.value;
      case 'percentage':
        return (totalAmount * split.value) / 100;
      case 'shares': {
        const totalShares = selectedSplits.reduce((sum, s) => sum + s.value, 0);
        return totalShares > 0 ? (totalAmount * split.value) / totalShares : 0;
      }
    }
  };

  const toggleMember = (memberId: string) => {
    onChange(
      splits.map((s) =>
        s.memberId === memberId
          ? { ...s, selected: !s.selected, value: s.selected ? 0 : 1 }
          : s
      )
    );
  };

  const updateValue = (memberId: string, value: number) => {
    onChange(
      splits.map((s) =>
        s.memberId === memberId ? { ...s, value: Math.max(0, value) } : s
      )
    );
  };

  const currentTotal = selectedSplits.reduce(
    (sum, s) => sum + getCalculatedAmount(s),
    0
  );

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const split = splits.find((s) => s.memberId === member.id);
        if (!split) return null;

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
            {split.selected && splitType !== 'equal' && (
              <input
                type="number"
                value={split.value || ''}
                onChange={(e) =>
                  updateValue(member.id, parseFloat(e.target.value) || 0)
                }
                placeholder={getPlaceholder()}
                className="w-20 border rounded px-2 py-1 text-right text-sm"
                min="0"
                step={splitType === 'exact' ? '0.01' : '1'}
              />
            )}
            {split.selected && (
              <span className="text-sm text-gray-500 w-20 text-right">
                {formatCurrency(getCalculatedAmount(split), currency)}
              </span>
            )}
          </div>
        );
      })}

      {totalAmount > 0 && selectedSplits.length > 0 && (
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Total split:</span>
          <span
            className={`font-medium ${
              Math.abs(currentTotal - totalAmount) < 0.01
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(currentTotal, currency)} / {formatCurrency(totalAmount, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

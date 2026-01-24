import { Expense, Member, MemberBalance, Settlement } from '../types';

export function calculateBalances(
  expenses: Expense[],
  members: Member[]
): MemberBalance[] {
  const signedMap = new Map<string, number>();
  const pendingMap = new Map<string, number>();

  // Initialize all members with 0 balance
  members.forEach((m) => {
    signedMap.set(m.id, 0);
    pendingMap.set(m.id, 0);
  });

  expenses.forEach((expense) => {
    expense.splits.forEach((split) => {
      const map = split.signedOff ? signedMap : pendingMap;
      const currentBalance = map.get(split.memberId) || 0;

      if (split.memberId === expense.paidBy) {
        // Payer: gets credit for what they paid minus what they owe
        map.set(
          split.memberId,
          currentBalance + expense.amount - split.amount
        );
      } else {
        // Participant: owes their split amount
        map.set(split.memberId, currentBalance - split.amount);
      }
    });

    // Handle case where payer is not in the splits
    const payerInSplits = expense.splits.some(
      (s) => s.memberId === expense.paidBy
    );
    if (!payerInSplits) {
      // Split by signed status
      const signedAmount = expense.splits
        .filter((s) => s.signedOff)
        .reduce((sum, s) => sum + s.amount, 0);
      const pendingAmount = expense.splits
        .filter((s) => !s.signedOff)
        .reduce((sum, s) => sum + s.amount, 0);

      if (signedAmount > 0) {
        const currentSigned = signedMap.get(expense.paidBy) || 0;
        signedMap.set(expense.paidBy, currentSigned + signedAmount);
      }
      if (pendingAmount > 0) {
        const currentPending = pendingMap.get(expense.paidBy) || 0;
        pendingMap.set(expense.paidBy, currentPending + pendingAmount);
      }
    }
  });

  return members.map((m) => {
    const signed = signedMap.get(m.id) || 0;
    const pending = pendingMap.get(m.id) || 0;
    return {
      memberId: m.id,
      memberName: m.name,
      signedBalance: signed,
      pendingBalance: pending,
      balance: signed + pending,
    };
  });
}

export function calculateSettlements(balances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Create mutable copies - use signedBalance only
  const debtors = balances
    .filter((b) => b.signedBalance < -0.01)
    .map((b) => ({ ...b, amount: Math.abs(b.signedBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.signedBalance > 0.01)
    .map((b) => ({ ...b, amount: b.signedBalance }))
    .sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.memberId,
        fromName: debtor.memberName,
        to: creditor.memberId,
        toName: creditor.memberName,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) debtorIdx++;
    if (creditor.amount < 0.01) creditorIdx++;
  }

  return settlements;
}

export function formatCurrency(amount: number, currency: string): string {
  // Round to 1 decimal place
  const rounded = Math.round(amount * 10) / 10;

  if (currency === 'K') {
    return `${rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(rounded);
}

// Format number with thousands separator
export function formatNumber(value: number, decimals: number = 1): string {
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// Round a number to specified decimal places
export function roundNumber(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Format date as relative time
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Get date key for grouping (YYYY-MM-DD)
export function getDateKey(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Format date key as display header
export function formatDateHeader(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
}

// Generate consistent color classes for tags based on name
const TAG_COLORS = [
  { bg: 'bg-purple-900', text: 'text-purple-300', hoverBg: 'hover:bg-purple-800' },
  { bg: 'bg-blue-900', text: 'text-blue-300', hoverBg: 'hover:bg-blue-800' },
  { bg: 'bg-green-900', text: 'text-green-300', hoverBg: 'hover:bg-green-800' },
  { bg: 'bg-pink-900', text: 'text-pink-300', hoverBg: 'hover:bg-pink-800' },
  { bg: 'bg-indigo-900', text: 'text-indigo-300', hoverBg: 'hover:bg-indigo-800' },
  { bg: 'bg-teal-900', text: 'text-teal-300', hoverBg: 'hover:bg-teal-800' },
  { bg: 'bg-amber-900', text: 'text-amber-300', hoverBg: 'hover:bg-amber-800' },
  { bg: 'bg-rose-900', text: 'text-rose-300', hoverBg: 'hover:bg-rose-800' },
];

export function getTagColor(tag: string): { bg: string; text: string; hoverBg: string } {
  // Simple hash based on tag characters
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[index];
}

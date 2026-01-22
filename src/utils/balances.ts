import { Expense, Member, MemberBalance, Settlement } from '../types';

export function calculateBalances(
  expenses: Expense[],
  members: Member[]
): MemberBalance[] {
  const balanceMap = new Map<string, number>();

  // Initialize all members with 0 balance
  members.forEach((m) => balanceMap.set(m.id, 0));

  expenses.forEach((expense) => {
    expense.splits.forEach((split) => {
      // Only count signed splits
      if (!split.signedOff) return;

      const currentBalance = balanceMap.get(split.memberId) || 0;

      if (split.memberId === expense.paidBy) {
        // Payer: gets credit for what they paid minus what they owe
        balanceMap.set(
          split.memberId,
          currentBalance + expense.amount - split.amount
        );
      } else {
        // Participant: owes their split amount
        balanceMap.set(split.memberId, currentBalance - split.amount);
      }
    });

    // Handle case where payer is not in the splits
    const payerInSplits = expense.splits.some(
      (s) => s.memberId === expense.paidBy && s.signedOff
    );
    if (!payerInSplits) {
      // Count signed amounts that the payer covered
      const signedAmount = expense.splits
        .filter((s) => s.signedOff)
        .reduce((sum, s) => sum + s.amount, 0);
      const currentBalance = balanceMap.get(expense.paidBy) || 0;
      balanceMap.set(expense.paidBy, currentBalance + signedAmount);
    }
  });

  return members.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    balance: balanceMap.get(m.id) || 0,
  }));
}

export function calculateSettlements(balances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = [];

  // Create mutable copies
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: Math.abs(b.balance) }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const amount = Math.min(debtor.balance, creditor.balance);

    if (amount > 0.01) {
      settlements.push({
        from: debtor.memberId,
        fromName: debtor.memberName,
        to: creditor.memberId,
        toName: creditor.memberName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) debtorIdx++;
    if (creditor.balance < 0.01) creditorIdx++;
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

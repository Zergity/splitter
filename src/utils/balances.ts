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
  if (currency === 'K') {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

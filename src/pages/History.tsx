import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/ExpenseCard';
import { formatCurrency } from '../utils/balances';

export function History() {
  const { group, expenses, currentUser } = useApp();

  if (!group) return null;

  if (!currentUser) {
    return (
      <div className="pb-20">
        <h2 className="text-xl font-bold mb-6">History</h2>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-center">
          <p className="text-yellow-200">
            Select your name from the dropdown above to see your history
          </p>
        </div>
      </div>
    );
  }

  // Fully signed expenses where current user participated
  const signedExpenses = expenses.filter(
    (e) =>
      e.splits.every((s) => s.signedOff) &&
      (e.paidBy === currentUser.id ||
        e.splits.some((s) => s.memberId === currentUser.id))
  );

  const sortedExpenses = [...signedExpenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="pb-20">
      <h2 className="text-xl font-bold mb-6">
        History ({sortedExpenses.length})
      </h2>

      {sortedExpenses.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-400">No completed expenses yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Expenses appear here once all participants have accepted
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedExpenses.map((expense) => {
            const userSplit = expense.splits.find(
              (s) => s.memberId === currentUser.id
            );
            const isPayer = expense.paidBy === currentUser.id;

            return (
              <div key={expense.id}>
                <ExpenseCard
                  expense={expense}
                  members={group.members}
                  currency={group.currency}
                />
                <div className="text-sm mt-2 px-4 text-gray-400">
                  {isPayer ? (
                    <span className="text-green-400">
                      You paid {formatCurrency(expense.amount, group.currency)}
                      {userSplit && ` (your share: ${formatCurrency(userSplit.amount, group.currency)})`}
                    </span>
                  ) : userSplit ? (
                    <span className="text-gray-400">
                      Your share: {formatCurrency(userSplit.amount, group.currency)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

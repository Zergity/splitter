import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/ExpenseCard';

export function PendingActions() {
  const { group, expenses, currentUser } = useApp();

  if (!group) return null;

  if (!currentUser) {
    return (
      <div className="pb-20">
        <h2 className="text-xl font-bold mb-6">Pending Actions</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800">
            Select your name from the dropdown above to see your pending actions
          </p>
        </div>
      </div>
    );
  }

  // Expenses where current user needs to sign off
  const toSignOff = expenses.filter((e) =>
    e.splits.some((s) => s.memberId === currentUser.id && !s.signedOff)
  );

  // Expenses current user paid, waiting for others to sign
  const awaitingOthers = expenses.filter(
    (e) =>
      e.paidBy === currentUser.id &&
      e.splits.some((s) => !s.signedOff && s.memberId !== currentUser.id)
  );

  return (
    <div className="pb-20 space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">
          To Sign Off ({toSignOff.length})
        </h2>
        {toSignOff.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {toSignOff.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                members={group.members}
                currency={group.currency}
                showSignOff
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">
          Awaiting Others ({awaitingOthers.length})
        </h2>
        {awaitingOthers.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">No expenses waiting for others</p>
          </div>
        ) : (
          <div className="space-y-4">
            {awaitingOthers.map((expense) => {
              const pendingMembers = expense.splits
                .filter((s) => !s.signedOff && s.memberId !== currentUser.id)
                .map(
                  (s) =>
                    group.members.find((m) => m.id === s.memberId)?.name ||
                    'Unknown'
                );

              return (
                <div key={expense.id}>
                  <ExpenseCard
                    expense={expense}
                    members={group.members}
                    currency={group.currency}
                  />
                  <p className="text-sm text-orange-600 mt-2 px-4">
                    Waiting for: {pendingMembers.join(', ')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

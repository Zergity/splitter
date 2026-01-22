import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { calculateBalances } from '../utils/balances';
import { formatCurrency } from '../utils/balances';

export function Dashboard() {
  const { group, expenses, currentUser } = useApp();

  if (!group) return null;

  const balances = calculateBalances(expenses, group.members);
  const currentUserBalance = currentUser
    ? balances.find((b) => b.memberId === currentUser.id)
    : null;

  const pendingForUser = currentUser
    ? expenses.filter((e) =>
        e.splits.some(
          (s) => s.memberId === currentUser.id && !s.signedOff
        )
      )
    : [];

  const waitingForOthers = currentUser
    ? expenses.filter(
        (e) =>
          e.paidBy === currentUser.id &&
          e.splits.some((s) => !s.signedOff && s.memberId !== currentUser.id)
      )
    : [];

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
        <p className="text-gray-500">{group.members.length} members</p>
      </div>

      {!currentUser ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800">
            Select your name from the dropdown above to get started
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
            <p className="text-sm text-gray-500 mb-1">Your balance</p>
            <p
              className={`text-3xl font-bold ${
                currentUserBalance && currentUserBalance.balance > 0.01
                  ? 'text-green-600'
                  : currentUserBalance && currentUserBalance.balance < -0.01
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}
            >
              {formatCurrency(currentUserBalance?.balance ?? 0, group.currency)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              (Based on signed expenses only)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/pending"
              className="bg-white rounded-lg shadow-sm border p-4 text-center hover:border-indigo-300"
            >
              <p className="text-2xl font-bold text-indigo-600">
                {pendingForUser.length}
              </p>
              <p className="text-sm text-gray-500">To sign off</p>
            </Link>
            <Link
              to="/pending"
              className="bg-white rounded-lg shadow-sm border p-4 text-center hover:border-indigo-300"
            >
              <p className="text-2xl font-bold text-orange-600">
                {waitingForOthers.length}
              </p>
              <p className="text-sm text-gray-500">Awaiting others</p>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/add"
              className="bg-indigo-600 text-white rounded-lg p-4 text-center font-medium hover:bg-indigo-700"
            >
              Add Expense
            </Link>
            <Link
              to="/balances"
              className="bg-white border border-indigo-600 text-indigo-600 rounded-lg p-4 text-center font-medium hover:bg-indigo-50"
            >
              View Balances
            </Link>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium mb-3">Recent Activity</h3>
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet</p>
        ) : (
          <div className="space-y-2">
            {expenses
              .slice(-5)
              .reverse()
              .map((expense) => {
                const payer = group.members.find((m) => m.id === expense.paidBy);
                return (
                  <div
                    key={expense.id}
                    className="flex justify-between text-sm py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-gray-500 text-xs">
                        by {payer?.name || 'Unknown'}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(expense.amount, group.currency)}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

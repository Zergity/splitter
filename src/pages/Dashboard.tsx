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

  // Calculate total pending amounts
  const toSignOffAmount = currentUser
    ? pendingForUser.reduce((sum, e) => {
        const userSplit = e.splits.find((s) => s.memberId === currentUser.id && !s.signedOff);
        return sum + (userSplit?.amount || 0);
      }, 0)
    : 0;

  const awaitingOthersAmount = currentUser
    ? waitingForOthers.reduce((sum, e) => {
        const othersUnsigned = e.splits
          .filter((s) => !s.signedOff && s.memberId !== currentUser.id)
          .reduce((s, split) => s + split.amount, 0);
        return sum + othersUnsigned;
      }, 0)
    : 0;

  return (
    <div className="space-y-6 pb-20">
      <div className="text-center py-6">
        <h2 className="text-2xl font-bold text-gray-100">{group.name}</h2>
        <p className="text-gray-400">{group.members.length} members</p>
      </div>

      {!currentUser ? (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-center">
          <p className="text-yellow-200">
            Select your name from the dropdown above to get started
          </p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-400 mb-1">Your balance</p>
            <p className="text-3xl font-bold">
              <span
                className={
                  currentUserBalance && currentUserBalance.signedBalance > 0.01
                    ? 'text-green-400'
                    : currentUserBalance && currentUserBalance.signedBalance < -0.01
                    ? 'text-red-400'
                    : 'text-gray-400'
                }
              >
                {formatCurrency(currentUserBalance?.signedBalance ?? 0, group.currency)}
              </span>
              {currentUserBalance && Math.abs(currentUserBalance.pendingBalance) > 0.01 && (
                <span className={`text-xl ml-1 opacity-50 ${currentUserBalance.pendingBalance > 0 ? 'text-green-500' : 'text-red-400'}`}>
                  ({currentUserBalance.pendingBalance > 0 ? '+' : ''}{formatCurrency(currentUserBalance.pendingBalance, group.currency)})
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/pending"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 text-center hover:border-cyan-500"
            >
              <p className="text-2xl font-bold text-cyan-400">
                {pendingForUser.length}
              </p>
              <p className="text-sm text-gray-400">To sign off</p>
              {toSignOffAmount > 0 && (
                <p className="text-xs text-red-400 mt-1">
                  {formatCurrency(toSignOffAmount, group.currency)}
                </p>
              )}
            </Link>
            <Link
              to="/pending"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 text-center hover:border-cyan-500"
            >
              <p className="text-2xl font-bold text-orange-400">
                {waitingForOthers.length}
              </p>
              <p className="text-sm text-gray-400">Awaiting others</p>
              {awaitingOthersAmount > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  {formatCurrency(awaitingOthersAmount, group.currency)}
                </p>
              )}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/add"
              className="bg-cyan-600 text-white rounded-lg p-4 text-center font-medium hover:bg-cyan-700"
            >
              Add Expense
            </Link>
            <Link
              to="/balances"
              className="bg-gray-800 border border-cyan-500 text-cyan-400 rounded-lg p-4 text-center font-medium hover:bg-cyan-900/30"
            >
              View Balances
            </Link>
          </div>
        </>
      )}

      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
        <h3 className="font-medium mb-3">Recent Activity</h3>
        {expenses.length === 0 ? (
          <p className="text-gray-400 text-sm">No expenses yet</p>
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
                    className="flex justify-between text-sm py-2 border-b border-gray-700 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-gray-400 text-xs">
                        by {currentUser && payer?.id === currentUser.id ? (
                          <span className="text-cyan-400">You</span>
                        ) : (payer?.name || 'Unknown')}
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

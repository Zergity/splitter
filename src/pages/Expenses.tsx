import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/ExpenseCard';

export function Expenses() {
  const { group, expenses, currentUser, deleteExpense } = useApp();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!group) return null;

  const filteredExpenses =
    filter === 'all'
      ? expenses
      : expenses.filter(
          (e) =>
            e.paidBy === currentUser?.id ||
            e.splits.some((s) => s.memberId === currentUser?.id)
        );

  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setDeleting(id);
    try {
      await deleteExpense(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">All Expenses</h2>
        <Link
          to="/add"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add
        </Link>
      </div>

      {currentUser && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'mine'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            My expenses
          </button>
        </div>
      )}

      {sortedExpenses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No expenses yet</p>
          <Link to="/add" className="text-indigo-600 font-medium mt-2 inline-block">
            Add your first expense
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedExpenses.map((expense) => (
            <div key={expense.id} className={deleting === expense.id ? 'opacity-50' : ''}>
              <ExpenseCard
                expense={expense}
                members={group.members}
                currency={group.currency}
                onDelete={() => handleDelete(expense.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

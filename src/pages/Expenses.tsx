import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ExpenseCard } from '../components/ExpenseCard';
import { getDateKey, formatDateHeader, getTagColor } from '../utils/balances';
import { Expense, Member } from '../types';

export function Expenses() {
  const { group, expenses, currentUser, deleteExpense } = useApp();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!group) return null;

  // Get all unique tags from expenses
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    expenses.forEach((e) => e.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [expenses]);

  // Apply filters
  let filteredExpenses = expenses;

  // Filter by mine/all
  if (filter === 'mine') {
    filteredExpenses = filteredExpenses.filter(
      (e) =>
        e.paidBy === currentUser?.id ||
        e.splits.some((s) => s.memberId === currentUser?.id)
    );
  }

  // Filter by tag
  if (selectedTag) {
    filteredExpenses = filteredExpenses.filter((e) =>
      e.tags?.includes(selectedTag)
    );
  }

  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Group expenses by day
  const groupedExpenses = useMemo(() => {
    const groups: { dateKey: string; expenses: Expense[] }[] = [];
    let currentDateKey = '';
    let currentGroup: Expense[] = [];

    sortedExpenses.forEach((expense) => {
      const dateKey = getDateKey(expense.createdAt);
      if (dateKey !== currentDateKey) {
        if (currentGroup.length > 0) {
          groups.push({ dateKey: currentDateKey, expenses: currentGroup });
        }
        currentDateKey = dateKey;
        currentGroup = [expense];
      } else {
        currentGroup.push(expense);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ dateKey: currentDateKey, expenses: currentGroup });
    }

    return groups;
  }, [sortedExpenses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setDeleting(id);
    try {
      await deleteExpense(id);
    } finally {
      setDeleting(null);
    }
  };

  const getMemberName = (id: string, members: Member[]) =>
    members.find((m) => m.id === id)?.name || 'Unknown';

  const exportToCSV = () => {
    if (!group) return;

    // CSV header
    const headers = ['Date', 'Description', 'Amount', 'Currency', 'Paid By', 'Participant', 'Share', 'Status', 'Tags'];

    // Build CSV rows - one row per split
    const rows: string[][] = [];

    sortedExpenses.forEach((expense) => {
      const date = new Date(expense.createdAt).toISOString().split('T')[0];
      const payer = getMemberName(expense.paidBy, group.members);
      const tags = expense.tags?.join(', ') || '';

      expense.splits.forEach((split) => {
        const participant = getMemberName(split.memberId, group.members);
        const status = split.signedOff ? 'Accepted' : 'Pending';

        rows.push([
          date,
          expense.description,
          expense.amount.toString(),
          group.currency,
          payer,
          participant,
          split.amount.toString(),
          status,
          tags,
        ]);
      });
    });

    // Convert to CSV string
    const escapeCSV = (str: string) => {
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">All Expenses</h2>
        <div className="flex gap-2">
          {expenses.length > 0 && (
            <button
              onClick={exportToCSV}
              className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600"
            >
              Export CSV
            </button>
          )}
          <Link
            to="/add"
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Add
          </Link>
        </div>
      </div>

      {currentUser && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'mine'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            My expenses
          </button>
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              selectedTag === null
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All tags
          </button>
          {allTags.map((tag) => {
            const color = getTagColor(tag);
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  selectedTag === tag
                    ? 'bg-cyan-600 text-white'
                    : `${color.bg} ${color.text} ${color.hoverBg}`
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {groupedExpenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No expenses yet</p>
          <Link to="/add" className="text-cyan-400 font-medium mt-2 inline-block">
            Add your first expense
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedExpenses.map(({ dateKey, expenses: dayExpenses }) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                {formatDateHeader(dateKey)}
              </h3>
              <div className="space-y-3">
                {dayExpenses.map((expense) => {
                  const canSignOff = currentUser
                    ? expense.splits.some((s) => s.memberId === currentUser.id && !s.signedOff)
                    : false;
                  return (
                    <div key={expense.id} className={deleting === expense.id ? 'opacity-50' : ''}>
                      <ExpenseCard
                        expense={expense}
                        members={group.members}
                        currency={group.currency}
                        showSignOff={canSignOff}
                        compactSignOff
                        onDelete={() => handleDelete(expense.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

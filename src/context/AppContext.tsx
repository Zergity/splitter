import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Group, Expense, Member } from '../types';
import * as api from '../api/client';

interface AppContextType {
  group: Group | null;
  expenses: Expense[];
  currentUser: Member | null;
  loading: boolean;
  error: string | null;
  setCurrentUser: (user: Member | null) => void;
  refreshData: () => Promise<void>;
  addMember: (name: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  updateGroupSettings: (name: string, currency: string) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  signOffExpense: (expense: Expense) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const CURRENT_USER_KEY = 'splitter_current_user';

export function AppProvider({ children }: { children: ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentUser, setCurrentUserState] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setCurrentUser = useCallback((user: Member | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [groupData, expensesData] = await Promise.all([
        api.getGroup(),
        api.getExpenses(),
      ]);
      setGroup(groupData);
      setExpenses(expensesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  const addMember = useCallback(
    async (name: string) => {
      if (!group) return;
      const newMember: Member = {
        id: crypto.randomUUID(),
        name,
      };
      const updated = await api.updateGroup({
        members: [...group.members, newMember],
      });
      setGroup(updated);
    },
    [group]
  );

  const removeMember = useCallback(
    async (id: string) => {
      if (!group) return;
      const updated = await api.updateGroup({
        members: group.members.filter((m) => m.id !== id),
      });
      setGroup(updated);
    },
    [group]
  );

  const updateGroupSettings = useCallback(
    async (name: string, currency: string) => {
      const updated = await api.updateGroup({ name, currency });
      setGroup(updated);
    },
    []
  );

  const createExpense = useCallback(
    async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      const created = await api.createExpense(expense);
      setExpenses((prev) => [...prev, created]);
    },
    []
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>) => {
      const updated = await api.updateExpense(id, updates);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    },
    []
  );

  const deleteExpense = useCallback(async (id: string) => {
    await api.deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const signOffExpense = useCallback(
    async (expense: Expense) => {
      if (!currentUser) return;
      const updated = await api.signOffExpense(expense, currentUser.id);
      setExpenses((prev) =>
        prev.map((e) => (e.id === expense.id ? updated : e))
      );
    },
    [currentUser]
  );

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Restore current user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as Member;
        setCurrentUserState(user);
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }, []);

  // Update current user if member list changes
  useEffect(() => {
    if (currentUser && group) {
      const memberExists = group.members.some((m) => m.id === currentUser.id);
      if (!memberExists) {
        setCurrentUser(null);
      }
    }
  }, [group, currentUser, setCurrentUser]);

  return (
    <AppContext.Provider
      value={{
        group,
        expenses,
        currentUser,
        loading,
        error,
        setCurrentUser,
        refreshData,
        addMember,
        removeMember,
        updateGroupSettings,
        createExpense,
        updateExpense,
        deleteExpense,
        signOffExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

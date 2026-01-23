interface Env {
  SPLITTER_KV: KVNamespace;
}

type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

interface ExpenseSplit {
  memberId: string;
  value: number;
  amount: number;
  signedOff: boolean;
  signedAt?: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdAt: string;
  receiptUrl?: string;
  receiptDate?: string;
}

async function getExpenses(kv: KVNamespace): Promise<Expense[]> {
  const expenses = await kv.get<Expense[]>('expenses', 'json');
  return expenses || [];
}

async function saveExpenses(kv: KVNamespace, expenses: Expense[]): Promise<void> {
  await kv.put('expenses', JSON.stringify(expenses));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const expenses = await getExpenses(context.env.SPLITTER_KV);
    return Response.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const expense = await context.request.json() as Omit<Expense, 'id' | 'createdAt'>;
    const expenses = await getExpenses(context.env.SPLITTER_KV);

    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    expenses.push(newExpense);
    await saveExpenses(context.env.SPLITTER_KV, expenses);

    return Response.json({
      success: true,
      data: newExpense,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
};

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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const updates = await context.request.json() as Partial<Expense>;
    const expenses = await getExpenses(context.env.SPLITTER_KV);

    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return Response.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    expenses[index] = {
      ...expenses[index],
      ...updates,
      id: expenses[index].id,
      createdAt: expenses[index].createdAt,
    };

    await saveExpenses(context.env.SPLITTER_KV, expenses);

    return Response.json({
      success: true,
      data: expenses[index],
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = context.params.id as string;
    const expenses = await getExpenses(context.env.SPLITTER_KV);

    const index = expenses.findIndex((e) => e.id === id);
    if (index === -1) {
      return Response.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    expenses.splice(index, 1);
    await saveExpenses(context.env.SPLITTER_KV, expenses);

    return Response.json({
      success: true,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
};

import { Group, Expense, ApiResponse, ReceiptOCRResult } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}

// Group API
export async function getGroup(): Promise<Group> {
  return fetchApi<Group>('/group');
}

export async function updateGroup(updates: Partial<Group>): Promise<Group> {
  return fetchApi<Group>('/group', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Expenses API
export async function getExpenses(): Promise<Expense[]> {
  return fetchApi<Expense[]>('/expenses');
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<Expense> {
  return fetchApi<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
}

export async function updateExpense(
  id: string,
  updates: Partial<Expense>
): Promise<Expense> {
  return fetchApi<Expense>(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await fetchApi<void>(`/expenses/${id}`, {
    method: 'DELETE',
  });
}

// Receipt processing
export async function processReceipt(file: File): Promise<ReceiptOCRResult> {
  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch(`${API_BASE}/receipts/process`, {
    method: 'POST',
    body: formData,
  });

  const data: ApiResponse<{ extracted: ReceiptOCRResult['extracted'] }> = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to process receipt');
  }

  return {
    success: true,
    extracted: data.data.extracted,
  };
}

// Sign-off helper
export async function signOffExpense(
  expense: Expense,
  memberId: string
): Promise<Expense> {
  const updatedSplits = expense.splits.map((split) => {
    if (split.memberId === memberId && !split.signedOff) {
      return {
        ...split,
        signedOff: true,
        signedAt: new Date().toISOString(),
        previousAmount: undefined, // Clear after signing off
      };
    }
    return split;
  });

  return updateExpense(expense.id, { splits: updatedSplits });
}

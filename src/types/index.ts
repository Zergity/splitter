// Member of the group
export interface Member {
  id: string;
  name: string;
}

// The single expense group
export interface Group {
  id: string;
  name: string;
  currency: string;
  members: Member[];
  createdAt: string;
}

// Split types
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

// Individual split within an expense
export interface ExpenseSplit {
  memberId: string;
  value: number; // meaning depends on splitType
  amount: number; // calculated actual amount
  signedOff: boolean;
  signedAt?: string;
}

// Expense with sign-off tracking
export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // member id
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Balance calculation types
export interface MemberBalance {
  memberId: string;
  memberName: string;
  balance: number; // positive = owed money, negative = owes money
}

export interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

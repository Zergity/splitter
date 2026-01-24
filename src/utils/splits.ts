import { SplitType, ExpenseSplit } from '../types';

interface SplitInput {
  memberId: string;
  value: number;
}

export function calculateSplits(
  amount: number,
  splitType: SplitType,
  splits: SplitInput[],
  payerId: string
): ExpenseSplit[] {
  let calculatedSplits: ExpenseSplit[];

  switch (splitType) {
    case 'equal': {
      const equalAmount = amount / splits.length;
      calculatedSplits = splits.map((s) => ({
        memberId: s.memberId,
        value: s.value,
        amount: equalAmount,
        signedOff: s.memberId === payerId,
        signedAt: s.memberId === payerId ? new Date().toISOString() : undefined,
      }));
      break;
    }

    case 'exact':
      calculatedSplits = splits.map((s) => ({
        memberId: s.memberId,
        value: s.value,
        amount: s.value,
        signedOff: s.memberId === payerId,
        signedAt: s.memberId === payerId ? new Date().toISOString() : undefined,
      }));
      break;

    case 'percentage':
      calculatedSplits = splits.map((s) => ({
        memberId: s.memberId,
        value: s.value,
        amount: (amount * s.value) / 100,
        signedOff: s.memberId === payerId,
        signedAt: s.memberId === payerId ? new Date().toISOString() : undefined,
      }));
      break;

    case 'shares': {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      calculatedSplits = splits.map((s) => ({
        memberId: s.memberId,
        value: s.value,
        amount: totalShares > 0 ? (amount * s.value) / totalShares : 0,
        signedOff: s.memberId === payerId,
        signedAt: s.memberId === payerId ? new Date().toISOString() : undefined,
      }));
      break;
    }

    case 'settlement':
    default:
      // Settlement: exact amounts, payer signs off automatically
      calculatedSplits = splits.map((s) => ({
        memberId: s.memberId,
        value: s.value,
        amount: s.value,
        signedOff: s.memberId === payerId,
        signedAt: s.memberId === payerId ? new Date().toISOString() : undefined,
      }));
      break;
  }

  return calculatedSplits;
}

export function validateSplits(
  amount: number,
  splitType: SplitType,
  splits: SplitInput[]
): { valid: boolean; error?: string } {
  if (splits.length === 0) {
    return { valid: false, error: 'At least one participant is required' };
  }

  switch (splitType) {
    case 'equal':
      return { valid: true };

    case 'exact': {
      const total = splits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(total - amount) > 0.01) {
        return {
          valid: false,
          error: `Split amounts (${total.toFixed(2)}) must equal total (${amount.toFixed(2)})`,
        };
      }
      return { valid: true };
    }

    case 'percentage': {
      const totalPercent = splits.reduce((sum, s) => sum + s.value, 0);
      if (Math.abs(totalPercent - 100) > 0.01) {
        return {
          valid: false,
          error: `Percentages must add up to 100% (currently ${totalPercent.toFixed(1)}%)`,
        };
      }
      return { valid: true };
    }

    case 'shares': {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      if (totalShares <= 0) {
        return { valid: false, error: 'Total shares must be greater than 0' };
      }
      return { valid: true };
    }

    case 'settlement':
    default:
      return { valid: true };
  }
}

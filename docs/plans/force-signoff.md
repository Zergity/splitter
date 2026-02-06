# Technical Design: Force Sign Off After 7 Days

## Problem Statement

**Issue:** Expenses get "stuck" indefinitely when participants don't accept them.

**Current Behavior:**
- When an expense is created, only the payer and creator are auto-signed off
- All other participants must manually click "Accept"
- If a participant never opens the app, the expense remains "Pending" forever
- This affects the group's balance calculations (pending vs. signed balances)

**Impact:**
- Group balances are inaccurate
- Users can't properly settle up
- Expired/unclaimed expenses clutter the system

## Proposed Solution

### 7-Day Fixed Grace Period

After **exactly 7 days** from expense creation, the **creator OR payer** can sign off on behalf of any participant who hasn't accepted yet.

**Key Principles:**
1. **Initial Period (0-7 days):** Everyone should accept their own expenses
2. **After 7 days:** Creator/Payer can force sign off for non-responsive participants (one at a time)
3. **Transparency:** Full audit trail tracking who performed each sign-off
4. **Scope:** Does NOT apply to settlements (`splitType='settlement'`)
5. **Edit Behavior:** Editing an expense after force sign-off resets the sign-off status (same as normal)

### Design Refinements (2026-02-06)

This design was refined through brainstorming to address:
- **Discoverability:** Added amber badge indicator on expense cards
- **Visual Distinction:** Force sign-offs show ⚠️ icon vs. ✓ for normal sign-offs
- **Audit Trail:** Added `signedBy` field to track who performed each action
- **Theme:** Amber/warning colors signal "proceed with awareness"
- **Feedback:** Silent updates (no toast) to keep UI clean
- **Individual Actions:** No bulk operations - deliberate one-by-one acceptance

---

## Implementation Status

✅ **IMPLEMENTED** (2026-02-06)

All features from this design have been implemented:
- ✅ Type definition with `signedBy` field
- ✅ Helper functions (`canForceSignOff`, `hasUnsignedParticipants`)
- ✅ Updated `signOffExpense` with force sign-off support
- ✅ SignOffButton with amber theme for force actions
- ✅ ExpenseCard with badge indicator and force-accept buttons
- ✅ Visual distinction (✓ vs. ⚠️) for normal vs. force sign-offs
- ✅ Full audit trail tracking

**Commits:**
- cd78c44: feat: add signedBy field to ExpenseSplit for audit trail
- 1d84548: feat: add canForceSignOff and hasUnsignedParticipants helpers
- af1cdd1: fix: add date validation and null checks to force sign-off helpers
- f6daaf5: feat: extend signOffExpense to support force sign-off with targetMemberId
- 3b1a4b3: fix: add validation and close self-force sign-off loophole
- 8f41ca6: feat: update AppContext signOffExpense to support targetMemberId
- 16de0eb: feat: update SignOffButton to support force sign-off with amber theme
- cc9b4bb: feat: add force sign-off badge, buttons, and indicators to ExpenseCard

## Implementation Details

### Changes Required

#### 0. `src/types/index.ts`

Add audit trail field to ExpenseSplit:

```typescript
export interface ExpenseSplit {
  memberId: string;
  value: number;
  amount: number;
  signedOff: boolean;
  signedAt?: string;
  signedBy?: string;  // NEW: tracks who performed the sign-off (self vs. forced)
  previousAmount?: number;
}
```

#### 1. `src/api/client.ts`

Add helper functions to check eligibility:

```typescript
export const GRACE_PERIOD_DAYS = 7;

// Check if current user can force sign-off this expense
export function canForceSignOff(expense: Expense, memberId: string): boolean {
  // Must be creator or payer
  const isCreatorOrPayer = expense.createdBy === memberId || expense.paidBy === memberId;
  if (!isCreatorOrPayer) return false;

  // Must be >=7 days old
  const createdAt = new Date(expense.createdAt);
  const now = new Date();
  const daysPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  // Must NOT be a settlement
  if (expense.splitType === 'settlement') return false;

  return daysPassed >= GRACE_PERIOD_DAYS;
}

// Check if expense has any unsigned participants (excluding optional memberId)
export function hasUnsignedParticipants(expense: Expense, excludeMemberId?: string): boolean {
  return expense.splits.some(
    split => !split.signedOff && split.memberId !== excludeMemberId
  );
}
```

Extend `signOffExpense` to support force signing:

```typescript
export async function signOffExpense(
  expense: Expense,
  memberId: string,
  targetMemberId?: string  // If provided, force sign-off for this member
): Promise<Expense> {
  const now = new Date().toISOString();

  // Validate force sign-off permissions
  if (targetMemberId && targetMemberId !== memberId) {
    if (!canForceSignOff(expense, memberId)) {
      throw new Error('Cannot force sign-off: grace period not reached or insufficient permissions');
    }
  }

  const updatedSplits = expense.splits.map((split) => {
    const shouldSign = targetMemberId
      ? split.memberId === targetMemberId && !split.signedOff
      : split.memberId === memberId && !split.signedOff;

    if (shouldSign) {
      return {
        ...split,
        signedOff: true,
        signedAt: now,
        signedBy: memberId,  // Track who performed the action (audit trail)
        previousAmount: undefined,
      };
    }
    return split;
  });

  return updateExpense(expense.id, { splits: updatedSplits });
}
```

#### 2. `src/components/SignOffButton.tsx`

Extend to support force sign-off with amber theme:

```typescript
interface SignOffButtonProps {
  expense: Expense;
  compact?: boolean;
  targetMemberId?: string;  // If provided, force sign-off for this member
  isForceSignOff?: boolean;  // Changes visual style to amber/warning theme
}

export function SignOffButton({
  expense,
  compact = false,
  targetMemberId,
  isForceSignOff = false
}: SignOffButtonProps) {
  const { signOffExpense, members } = useApp();
  const [loading, setLoading] = useState(false);
  const isSettlement = expense.splitType === 'settlement';

  const handleSignOff = async () => {
    setLoading(true);
    try {
      await signOffExpense(expense, targetMemberId);
    } finally {
      setLoading(false);
    }
  };

  // Determine button text
  let buttonText: string;
  if (isForceSignOff && targetMemberId) {
    const targetMember = members.find(m => m.id === targetMemberId);
    buttonText = loading ? 'Accepting...' : `⚠️ Accept for ${targetMember?.name}`;
  } else if (isSettlement) {
    buttonText = loading ? 'Confirming...' : 'Confirm';
  } else {
    buttonText = loading ? 'Accepting...' : 'Accept';
  }

  // Determine button color (AMBER for force sign-off)
  const colorClass = isForceSignOff
    ? 'bg-amber-600 hover:bg-amber-700'  // Warning/amber theme for force actions
    : isSettlement
      ? 'bg-green-600 hover:bg-green-700'
      : 'bg-cyan-600 hover:bg-cyan-700';

  return (
    <button
      onClick={handleSignOff}
      disabled={loading}
      className={`text-white rounded-lg font-medium disabled:opacity-50 ${
        compact ? 'py-1 px-3 text-sm' : 'w-full py-2 px-4'
      } ${colorClass}`}
    >
      {buttonText}
    </button>
  );
}
```

#### 3. `src/components/ExpenseCard.tsx`

Add badge indicator on collapsed card + force accept buttons in expanded view:

```typescript
import { canForceSignOff, hasUnsignedParticipants } from '../api/client';

// Inside ExpenseCard component:
const { currentUser, members } = useApp();
const canForceAccept = currentUser && canForceSignOff(expense, currentUser.id);
const hasUnsigned = hasUnsignedParticipants(expense, currentUser?.id);

// === COLLAPSED VIEW: Add badge indicator ===
{canForceAccept && hasUnsigned && (
  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
    ⏱️ Can force accept
  </span>
)}

// === EXPANDED SPLITS VIEW ===
{expense.splits.map((split) => {
  const member = members.find(m => m.id === split.memberId);
  const isCurrentUser = currentUser && split.memberId === currentUser.id;
  const isUnsigned = !split.signedOff;
  const canForceThisMember = canForceAccept && isUnsigned && !isCurrentUser;

  // Check if this was force-accepted (signedBy !== memberId)
  const isForceAccepted = split.signedOff &&
                          split.signedBy &&
                          split.signedBy !== split.memberId;

  return (
    <div key={split.memberId} className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full ${
          split.signedOff ? 'bg-green-500' : 'bg-yellow-500'
        }`} />

        <span>{member?.name}</span>
        <span>{formatCurrency(split.amount)}</span>

        {/* Normal sign-off: green checkmark */}
        {split.signedOff && !isForceAccepted && (
          <span className="text-xs text-green-400" title="Accepted">✓</span>
        )}

        {/* Force sign-off: amber warning icon with tooltip */}
        {isForceAccepted && (
          <span
            className="text-xs text-amber-400 cursor-help"
            title={`Force accepted by ${getMemberName(split.signedBy)}`}
          >
            ⚠️
          </span>
        )}
      </div>

      {/* Force accept button for unsigned non-self participants */}
      {canForceThisMember && (
        <SignOffButton
          expense={expense}
          compact
          targetMemberId={split.memberId}
          isForceSignOff
        />
      )}
    </div>
  );
})}
```

## UX Flow

1. **Day 0-6:** User creates expense, all participants see "Accept" button for themselves
2. **Day 7+:**
   - Creator/Payer sees amber badge "⏱️ Can force accept" on eligible expenses (collapsed view)
   - Clicks badge/card to expand and see all participants
   - Sees amber "⚠️ Accept for [name]" button next to each unsigned participant (except self)
   - Clicks individual buttons to force-accept one at a time
   - Silent update (no toast notification)
3. **After force sign-off:**
   - Participant's split immediately shows green dot + ⚠️ amber icon (force-accepted indicator)
   - Tooltip shows: "Force accepted by [Creator Name]"
   - Balance calculations move from pending to signed
   - When all splits signed, expense moves from Pending to Accepted
4. **If expense edited later:**
   - All force-accepted participants reset to unsigned (same as normal sign-offs)
   - Must be re-accepted (or force-accepted again after 7 days from original creation)

## Visual Design

**Color Semantics:**
- **Green** (`bg-green-500`): Normal signed-off splits, ✓ checkmark
- **Amber/Yellow** (`bg-amber-600`): Force sign-off actions, ⚠️ warning icon, badge
- **Cyan** (`bg-cyan-600`): Normal "Accept" button (self sign-off)
- **Yellow dot** (`bg-yellow-500`): Unsigned/pending splits

**Visual Indicators:**

| Sign-off Type | Indicator | Color | Tooltip |
|---------------|-----------|-------|---------|
| **Normal** (self-accepted) | ✓ | Green | "Accepted" |
| **Force** (accepted by creator/payer) | ⚠️ | Amber | "Force accepted by [Name]" |
| **Unsigned** | ○ (yellow dot) | Yellow | "Pending acceptance" |

**Badge on Expense Card:**
- Appears in collapsed view when expense >7 days old + has unsigned participants
- Text: `⏱️ Can force accept`
- Style: `bg-amber-500/20 text-amber-300`

## File Changes Summary

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add `signedBy?: string` field to `ExpenseSplit` |
| `src/api/client.ts` | Add `GRACE_PERIOD_DAYS`, `canForceSignOff()`, `hasUnsignedParticipants()`, extend `signOffExpense()` |
| `src/context/AppContext.tsx` | May need update if `signOffExpense` signature changes |
| `src/components/SignOffButton.tsx` | Add `targetMemberId` and `isForceSignOff` props, amber color theme |
| `src/components/ExpenseCard.tsx` | Add badge indicator, force accept buttons, visual distinction for force sign-offs |

## Testing

**1. Grace Period Validation:**
- Create expense with `createdAt` = 6 days ago → badge should NOT appear
- Create expense with `createdAt` = 7 days ago → badge "⏱️ Can force accept" should appear
- Create expense with `createdAt` = 14 days ago → badge should still appear

**2. Permission Validation:**
- Login as creator → should see badge + force-accept buttons
- Login as payer (different from creator) → should also see badge + force-accept buttons
- Login as regular participant → should NOT see badge or force-accept buttons
- Settlement expenses (`splitType='settlement'`) → never show force-accept regardless of age

**3. Visual Indicators:**
- Self sign-off: shows green ✓ checkmark
- Force sign-off: shows amber ⚠️ icon with tooltip "Force accepted by [Name]"
- Badge appears on collapsed expense card when eligible
- Badge color: `bg-amber-500/20 text-amber-300`

**4. Sign-Off Behavior:**
- Force-accept Alice → her split should show:
  - `signedOff: true`
  - `signedBy: creator.id` (not Alice's ID)
  - `signedAt: current timestamp`
- Verify balance calculations update correctly (pending → signed)
- Verify expense moves from "Pending" to "Accepted" when all splits signed

**5. Edit After Force Sign-Off:**
- Force-accept Alice → edit expense amount → Alice's split should reset to `signedOff: false`
- Verify `previousAmount` is set correctly
- Can force-accept again after 7 days from original `createdAt` (not from edit time)

**6. UI Feedback:**
- Click "⚠️ Accept for [Name]" button → silent update (no toast)
- UI immediately updates to show green dot + ⚠️ icon
- Hover over ⚠️ icon → tooltip shows who force-accepted

**7. Edge Cases:**
- User force-accepts all participants → expense immediately becomes fully signed
- Rapid clicking → button disabled during API call
- Multiple unsigned participants → each has individual force-accept button

## Design Decisions & Alternatives Considered

### Grace Period Options
| Option | Decision | Rationale |
|--------|----------|-----------|
| Fixed 7 days for all | ✅ **CHOSEN** | Simple, predictable, easy to understand |
| Configurable per-group | ❌ | Adds complexity, harder to explain |
| Vary by expense amount | ❌ | Arbitrary thresholds, confusing rules |
| Instant for settlements | ❌ | Settlements excluded entirely from force sign-off |

### Permission Model
| Option | Decision | Rationale |
|--------|----------|-----------|
| Creator OR Payer | ✅ **CHOSEN** | Most flexible, both have legitimate stake |
| Creator only | ❌ | Payer has financial interest too |
| Payer only | ❌ | Creator understands context |
| Consensus (AND) | ❌ | Could still get stuck if they disagree |

### UX Discoverability
| Option | Decision | Rationale |
|--------|----------|-----------|
| Badge indicator | ✅ **CHOSEN** | Discoverable yet clean UI |
| Hidden in expanded view | ❌ | Users won't find it |
| Dropdown menu | ❌ | Adds UI complexity |
| Auto-suggest banner | ❌ | Too prominent, noisy |

### Bulk Operations
| Option | Decision | Rationale |
|--------|----------|-----------|
| Individual only | ✅ **CHOSEN** | Deliberate, gives creator control |
| "Accept all" button | ❌ | Less transparency |
| Checkboxes + batch | ❌ | Over-engineered |

### Audit Trail
| Option | Decision | Rationale |
|--------|----------|-----------|
| Add `signedBy` field | ✅ **CHOSEN** | Transparency + minimal complexity |
| No tracking | ❌ | Loses important audit info |
| `forcedBy` only | ❌ | Inconsistent data model |
| Full audit log | ❌ | Over-engineered for this use case |

### Visual Theme
| Option | Decision | Rationale |
|--------|----------|-----------|
| Amber/warning theme | ✅ **CHOSEN** | Signals "proceed with awareness" |
| Primary/blue theme | ❌ | Doesn't distinguish from normal accept |
| Neutral/gray theme | ❌ | Too subtle, might be missed |
| Contextual by age | ❌ | Adds complexity |

### Overall Approach Comparison
| Approach | Pros | Cons |
|----------|------|------|
| Auto-sign all immediately | No stuck expenses | Zero transparency, users might dispute |
| Trust creator checkbox | Simple | Manual choice every time, easy to forget |
| Settlement separation | Clear boundary | Complex logic, doesn't solve expense problem |
| **This solution (7-day grace + force sign-off)** | Balances transparency, autonomy, and practicality | Slightly more complex implementation |

## References

- Existing sign-off flow: `src/api/client.ts:106-123`
- Sign-off button: `src/components/SignOffButton.tsx`
- Expense card: `src/components/ExpenseCard.tsx`
- Balance calculation: `src/utils/balances.ts`

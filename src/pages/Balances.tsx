import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BalanceCard } from '../components/BalanceCard';
import { calculateBalances, calculateSettlements, formatCurrency } from '../utils/balances';
import { PaymentModal } from '../components/PaymentModal';
import { Settlement } from '../types';

export function Balances() {
  const { group, expenses, currentUser } = useApp();
  const [paymentModal, setPaymentModal] = useState<Settlement | null>(null);

  if (!group) return null;

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances);

  const sortedBalances = [...balances].sort((a, b) => b.signedBalance - a.signedBalance);

  const handleBankTransfer = (settlement: Settlement) => {
    setPaymentModal(settlement);
  };

  const handleClosePaymentModal = () => {
    setPaymentModal(null);
  };

  const hasBankAccountInfo = (memberId: string): boolean => {
    const member = group?.members.find(m => m.id === memberId);
    return !!(member?.bankId && member?.accountNo && member?.accountName);
  };

  return (
    <div className="pb-20 space-y-8">
      <section>
        <h2 className="text-xl font-bold mb-4">Balances</h2>

        {group.members.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p className="text-gray-400">Add members to see balances</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBalances.map((balance) => {
              // Find suggested settlement where this member is the payer
              const suggestedSettlement = settlements.find(s => s.from === balance.memberId);
              return (
                <BalanceCard
                  key={balance.memberId}
                  balance={balance}
                  currency={group.currency}
                  isCurrentUser={balance.memberId === currentUser?.id}
                  suggestedSettlement={suggestedSettlement}
                />
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settlement Suggestions</h2>
          <Link
            to="/settle"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            + Manual
          </Link>
        </div>

        {settlements.length === 0 ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-200">Everyone is settled up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg border border-gray-700 p-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-medium truncate ${
                      settlement.from === currentUser?.id ? 'text-yellow-400' : ''
                    }`}
                  >
                    {settlement.from === currentUser?.id ? `[${settlement.fromName}]` : settlement.fromName}
                  </span>
                  <span className="text-gray-500 flex-shrink-0">→</span>
                  <span
                    className={`font-medium truncate ${
                      settlement.to === currentUser?.id ? 'text-yellow-400' : ''
                    }`}
                  >
                    {settlement.to === currentUser?.id ? `[${settlement.toName}]` : settlement.toName}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold">
                    {formatCurrency(settlement.amount, group.currency)}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleBankTransfer(settlement)}
                      disabled={!hasBankAccountInfo(settlement.to)}
                      className="text-sm bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!hasBankAccountInfo(settlement.to) ? "Recipient hasn't set up bank account" : "Pay via bank transfer"}
                    >
                      Bank Transfer
                    </button>
                    <Link
                      to={`/settle?from=${settlement.from}&to=${settlement.to}&amount=${settlement.amount}`}
                      className="text-sm bg-cyan-600 text-white px-3 py-1 rounded hover:bg-cyan-700"
                    >
                      Settle
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium mb-2">How it works</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>Positive balance = you are owed money</li>
          <li>Negative balance = you owe money</li>
          <li><span className="text-green-500">Accepted</span> = confirmed transactions</li>
          <li><span className="text-yellow-500">Pending</span> = awaiting acceptance</li>
          <li>Settlement suggestions based on accepted balances only</li>
          <li><span className="text-green-400">Settlements</span> = money transfers between members</li>
          <li>Recipients must confirm settlements received</li>
        </ul>
      </section>

      {/* Payment Modal */}
      {paymentModal && currentUser && (() => {
        const recipient = group.members.find(m => m.id === paymentModal.to);
        const payer = group.members.find(m => m.id === paymentModal.from);

        if (!recipient || !payer) {
          return null;
        }

        return (
          <PaymentModal
            isOpen={true}
            recipient={recipient}
            payer={payer}
            amount={paymentModal.amount}
            currency={group.currency}
            onClose={handleClosePaymentModal}
          />
        );
      })()}
    </div>
  );
}

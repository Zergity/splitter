import { useApp } from '../context/AppContext';
import { BalanceCard } from '../components/BalanceCard';
import { calculateBalances, calculateSettlements, formatCurrency } from '../utils/balances';

export function Balances() {
  const { group, expenses, currentUser } = useApp();

  if (!group) return null;

  const balances = calculateBalances(expenses, group.members);
  const settlements = calculateSettlements(balances);

  const sortedBalances = [...balances].sort((a, b) => b.signedBalance - a.signedBalance);

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
            {sortedBalances.map((balance) => (
              <BalanceCard
                key={balance.memberId}
                balance={balance}
                currency={group.currency}
                isCurrentUser={balance.memberId === currentUser?.id}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Settlement Suggestions</h2>

        {settlements.length === 0 ? (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
            <p className="text-green-200">Everyone is settled up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settlements.map((settlement, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      settlement.from === currentUser?.id ? 'text-cyan-400' : ''
                    }`}
                  >
                    {settlement.from === currentUser?.id ? 'You' : settlement.fromName}
                  </span>
                  <span className="text-gray-500">-&gt;</span>
                  <span
                    className={`font-medium ${
                      settlement.to === currentUser?.id ? 'text-cyan-400' : ''
                    }`}
                  >
                    {settlement.to === currentUser?.id ? 'You' : settlement.toName}
                  </span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(settlement.amount, group.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium mb-2">How balances work</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>Positive balance = you are owed money</li>
          <li>Negative balance = you owe money</li>
          <li><span className="text-green-500">Signed</span> = confirmed expenses</li>
          <li><span className="text-yellow-500">Pending</span> = awaiting sign-off</li>
          <li>Settlement suggestions based on signed balances only</li>
        </ul>
      </section>
    </div>
  );
}

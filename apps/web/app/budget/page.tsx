import {
  accountBalances,
  getMonthlySummary,
  getSpentByCategory,
  toCurrency,
  transactions,
} from "@/lib/budget/data";

export default function BudgetDashboardPage() {
  const summary = getMonthlySummary();
  const byCategory = getSpentByCategory();
  const netWorth = accountBalances.reduce((sum, account) => sum + account.balance, 0);
  const recent = [...transactions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <Card label="Income (Month)" value={toCurrency(summary.income)} />
        <Card label="Expenses (Month)" value={toCurrency(summary.expenses)} />
        <Card label="Savings (Month)" value={toCurrency(summary.savings)} />
        <Card label="Net Worth" value={toCurrency(netWorth)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold">Budget Utilization</h2>
          <div className="mt-4 space-y-3">
            {byCategory.map((row) => {
              const ratio = row.planned > 0 ? Math.min(100, Math.round((row.spent / row.planned) * 100)) : 0;
              return (
                <div key={row.category}>
                  <div className="mb-1 flex items-center justify-between text-xs text-white/70">
                    <span>{row.category}</span>
                    <span>
                      {toCurrency(row.spent)} / {toCurrency(row.planned)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className={ratio > 90 ? "h-2 rounded-full bg-red-400" : "h-2 rounded-full bg-emerald-400"}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold">Recent Transactions</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-white/65">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Merchant</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((tx) => (
                  <tr key={tx.id} className="border-t border-white/10">
                    <td className="px-3 py-2 text-white/75">{tx.date}</td>
                    <td className="px-3 py-2">{tx.merchant}</td>
                    <td className="px-3 py-2 text-white/75">{tx.category}</td>
                    <td className={tx.type === "income" ? "px-3 py-2 text-right text-emerald-300" : "px-3 py-2 text-right text-rose-300"}>
                      {tx.type === "income" ? "+" : "-"}
                      {toCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}


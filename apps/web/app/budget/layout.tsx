import BudgetNav from "@/components/budget/BudgetNav";

export default function BudgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.14em] text-emerald-300/80">
          Budget Tracker
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Personal Finance Workspace
        </h1>
        <p className="mt-2 text-sm text-white/65">
          Start with a practical dashboard and iterate toward bank sync and automation.
        </p>
        <div className="mt-4">
          <BudgetNav />
        </div>
      </section>

      {children}
    </div>
  );
}


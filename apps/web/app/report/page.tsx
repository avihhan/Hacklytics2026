const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs text-zinc-700">
    {children}
  </span>
);

const Card = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="text-sm font-semibold">{title}</div>
    <div className="mt-3">{children}</div>
  </div>
);

const FlagCard = ({
  title,
  impact,
  confidence,
  why,
  needed,
}: {
  title: string;
  impact: string;
  confidence: "High" | "Med" | "Low";
  why: string;
  needed: string[];
}) => (
  <div className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-zinc-600">{why}</div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <Pill>Impact: {impact}</Pill>
        <Pill>Confidence: {confidence}</Pill>
      </div>
    </div>

    <div className="mt-4">
      <div className="text-xs font-semibold text-zinc-700">Needed to confirm</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {needed.map((x) => (
          <Pill key={x}>{x}</Pill>
        ))}
      </div>
    </div>
  </div>
);

export default function ReportPage() {
  const snapshot = {
    filingStatus: "Single",
    income: 74250,
    w2Count: 1,
    has1099: true,
    has1098e: true,
    lastYearState: "GA",
  };

  const flags = [
    {
      title: "Student loan interest (1098-E)",
      impact: "Medium",
      confidence: "High" as const,
      why: "Detected a 1098-E. You may be able to deduct eligible student loan interest.",
      needed: ["1098-E", "MAGI threshold check"],
    },
    {
      title: "Education credit (AOTC/LLC)",
      impact: "High",
      confidence: "Med" as const,
      why: "If you paid qualified tuition, you may qualify for an education credit.",
      needed: ["1098-T", "Qualified expenses receipts"],
    },
    {
      title: "Itemized vs standard deduction check",
      impact: "Medium",
      confidence: "Low" as const,
      why: "If you have mortgage interest/charity/medical expenses, itemizing may help.",
      needed: ["Charity receipts", "Mortgage interest (1098)", "Medical expense totals"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Filing Readiness Report</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Sample report using mock data — backend will power this later.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">
            Export PDF
          </button>
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Ask a question
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Snapshot">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-zinc-600">Filing status</div>
            <div className="font-medium">{snapshot.filingStatus}</div>

            <div className="text-zinc-600">Income (est.)</div>
            <div className="font-medium">${snapshot.income.toLocaleString()}</div>

            <div className="text-zinc-600">W-2 count</div>
            <div className="font-medium">{snapshot.w2Count}</div>

            <div className="text-zinc-600">1099 present</div>
            <div className="font-medium">{snapshot.has1099 ? "Yes" : "No"}</div>

            <div className="text-zinc-600">1098-E present</div>
            <div className="font-medium">{snapshot.has1098e ? "Yes" : "No"}</div>

            <div className="text-zinc-600">State</div>
            <div className="font-medium">{snapshot.lastYearState}</div>
          </div>
        </Card>

        <Card title="Readiness">
          <div className="space-y-3">
            <Pill>Documents: 3/5</Pill>
            <Pill>Extraction: Complete</Pill>
            <Pill>Flags: {flags.length} found</Pill>
            <div className="rounded-xl border bg-zinc-50 p-3 text-sm text-zinc-700">
              Next step: upload 1098-T or confirm education expenses.
            </div>
          </div>
        </Card>

        <Card title="Safety & Grounding">
          <div className="space-y-3 text-sm text-zinc-600">
            <div className="rounded-xl border bg-zinc-50 p-3">
              Responses will be grounded in your uploaded documents (RAG). We’ll cite which doc/line informed the answer.
            </div>
            <div className="rounded-xl border bg-zinc-50 p-3">
              This tool is educational and organizational — not tax advice.
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Opportunity Flags</div>
        <div className="grid gap-4 md:grid-cols-2">
          {flags.map((f) => (
            <FlagCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </div>
  );
}
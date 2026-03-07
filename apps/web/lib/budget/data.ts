export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  category: string;
  account: string;
  type: "income" | "expense";
  amount: number;
};

export type BudgetLine = {
  category: string;
  planned: number;
};

export const transactions: Transaction[] = [
  { id: "t1", date: "2026-02-01", merchant: "Payroll", category: "Salary", account: "Checking", type: "income", amount: 5200 },
  { id: "t2", date: "2026-02-02", merchant: "Apartment Rent", category: "Housing", account: "Checking", type: "expense", amount: 1700 },
  { id: "t3", date: "2026-02-03", merchant: "Kroger", category: "Groceries", account: "Credit Card", type: "expense", amount: 124 },
  { id: "t4", date: "2026-02-05", merchant: "Georgia Power", category: "Utilities", account: "Checking", type: "expense", amount: 96 },
  { id: "t5", date: "2026-02-08", merchant: "Uber", category: "Transport", account: "Credit Card", type: "expense", amount: 42 },
  { id: "t6", date: "2026-02-11", merchant: "Trader Joe's", category: "Groceries", account: "Credit Card", type: "expense", amount: 88 },
  { id: "t7", date: "2026-02-13", merchant: "Freelance Payment", category: "Side Income", account: "Checking", type: "income", amount: 650 },
  { id: "t8", date: "2026-02-15", merchant: "AT&T", category: "Phone", account: "Checking", type: "expense", amount: 74 },
  { id: "t9", date: "2026-02-18", merchant: "CVS", category: "Health", account: "Credit Card", type: "expense", amount: 37 },
  { id: "t10", date: "2026-02-20", merchant: "Amazon", category: "Shopping", account: "Credit Card", type: "expense", amount: 129 },
];

export const budgets: BudgetLine[] = [
  { category: "Housing", planned: 1800 },
  { category: "Groceries", planned: 500 },
  { category: "Utilities", planned: 250 },
  { category: "Transport", planned: 300 },
  { category: "Phone", planned: 90 },
  { category: "Health", planned: 200 },
  { category: "Shopping", planned: 400 },
];

export const accountBalances = [
  { name: "Checking", balance: 6900 },
  { name: "Savings", balance: 14200 },
  { name: "Credit Card", balance: -950 },
];

export function toCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getMonthlySummary() {
  const income = transactions
    .filter((x) => x.type === "income")
    .reduce((sum, x) => sum + x.amount, 0);
  const expenses = transactions
    .filter((x) => x.type === "expense")
    .reduce((sum, x) => sum + x.amount, 0);
  return {
    income,
    expenses,
    savings: income - expenses,
  };
}

export function getSpentByCategory() {
  const spent = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    spent.set(tx.category, (spent.get(tx.category) ?? 0) + tx.amount);
  }
  return budgets.map((line) => ({
    category: line.category,
    planned: line.planned,
    spent: spent.get(line.category) ?? 0,
  }));
}


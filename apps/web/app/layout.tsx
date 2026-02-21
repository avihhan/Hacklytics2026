import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "TaxPilot",
  description: "AI-powered tax filing assistant (educational, not tax advice).",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-white/80 hover:text-white transition"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.55)]" />
              <div className="leading-tight">
                <div className="font-semibold tracking-tight">RefundRadar</div>
                <div className="text-xs text-white/60">Educational • Not tax advice</div>
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/upload" label="Upload" />
              <NavLink href="/report" label="Report" />
              <NavLink href="/chat" label="Chat" />
              <NavLink href="/call" label="Call" />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60">
            TaxPilot organizes documents and highlights potential opportunities. It does not provide tax advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
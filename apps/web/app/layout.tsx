import "./globals.css";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import TaxPilotIcon from "@/components/TaxPilotIcon";

export const metadata = {
  title: "TaxPilot",
  description:
    "AI-powered tax filing assistant (educational, not tax advice).",
};

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
            {/* Logo / Brand */}
            <Link href="/" className="flex items-center gap-3">
              <TaxPilotIcon className="h-9 w-9" />
              <div className="leading-tight">
                <div className="font-semibold tracking-tight">
                  TaxPilot
                </div>
                <div className="text-xs text-white/60">
                  Educational • Not tax advice
                </div>
              </div>
            </Link>

            {/* Animated Navigation */}
            <AppNav />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>

        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60">
            TaxPilot organizes documents and highlights potential
            opportunities. It does not provide tax advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
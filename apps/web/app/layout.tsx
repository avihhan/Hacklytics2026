import "./globals.css";
import Link from "next/link";
import NavAutoHide from "@/components/NavAutoHide";
import TaxPilotIcon from "@/components/TaxPilotIcon";

export const metadata = {
  title: "TaxPilot",
  description: "AI-powered tax filing assistant (educational, not tax advice).",
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
            <Link href="/" className="flex items-center gap-3 group">
              {/* Futuristic / Hackathon Flashy Icon */}
              <div className="relative flex h-12 w-12 items-center justify-center">
                {/* Radar pulse ring */}
                <div className="absolute h-12 w-12 rounded-full bg-emerald-400/20 animate-ping" />

                {/* Soft glow base */}
                <div className="absolute h-12 w-12 rounded-full bg-emerald-400/10 blur-xl" />

                {/* Icon container */}
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-[0_0_40px_rgba(52,211,153,0.35)] transition duration-300 group-hover:shadow-[0_0_60px_rgba(52,211,153,0.6)]">
                  <TaxPilotIcon className="h-7 w-7" />
                </div>
              </div>

              <div className="leading-tight">
                <div className="font-semibold tracking-tight">TaxPilot</div>
                <div className="text-xs text-white/60">
                  Educational • Not tax advice
                </div>
              </div>
            </Link>

            <NavAutoHide />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

        <footer className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60">
            TaxPilot organizes documents and highlights potential opportunities.
            It does not provide tax advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
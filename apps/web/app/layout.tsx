import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "RefundRadar",
  description: "AI-powered tax filing assistant (educational, not tax advice).",
};

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="text-sm text-zinc-700 hover:text-zinc-900 transition"
  >
    {label}
  </Link>
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-zinc-900" />
              <div className="leading-tight">
                <div className="font-semibold">RefundRadar</div>
                <div className="text-xs text-zinc-500">Not tax advice</div>
              </div>
            </Link>

            <nav className="flex items-center gap-4">
              <NavItem href="/upload" label="Upload" />
              <NavItem href="/report" label="Report" />
              <NavItem href="/chat" label="Chat" />
              <NavItem href="/call" label="Call Agent" />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="border-t bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
            TaxPilot is an educational tool to organize documents and surface
            potential opportunities. It does not provide tax advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
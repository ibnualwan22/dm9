import Link from "next/link";
import { Trophy, Bell } from "lucide-react";
import { EVENT_CONFIG } from "@/lib/constants";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col text-ink">
      {/* Header Navigasi Publik — Translucent FeralUI Glass */}
      <header className="sticky top-0 z-30 border-b border-[#2A2622]/[0.08] bg-[#FFFFFC]/45 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A2622]"
          >
            <img
              src="/images/logo-tanpa-tulisan.png"
              alt={`Logo ${EVENT_CONFIG.name}`}
              className="h-9 w-9 object-contain transition-transform duration-150 group-hover:scale-105"
            />
            <div>
              <span className="sonorous-display block text-lg font-normal leading-tight tracking-tight text-[#2A2622]">
                {EVENT_CONFIG.name}
              </span>
              <span className="block text-[11px] font-medium text-ink-secondary">
                Markaz Arabiyah
              </span>
            </div>
          </Link>

          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-secondary"
          >
            <Link
              href="/#katalog-lomba"
              className="inline-flex items-center gap-1.5 hover:text-[#2A2622] transition-colors"
            >
              <Trophy className="h-4 w-4 text-brand" />
              <span>Katalog Lomba</span>
            </Link>
            <Link
              href="/#papan-pengumuman"
              className="inline-flex items-center gap-1.5 hover:text-[#2A2622] transition-colors"
            >
              <Bell className="h-4 w-4 text-brand" />
              <span>Pengumuman</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="flex-1">{children}</main>

      {/* Footer Institutional */}
      <footer className="border-t border-[#2A2622]/[0.08] bg-[#FFFFFC]/45 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <img
                src="/images/logo-tanpa-tulisan.png"
                alt={`Logo ${EVENT_CONFIG.name}`}
                className="h-10 w-10 object-contain shrink-0 mt-0.5"
              />
              <div>
                <p className="sonorous-display text-lg font-normal text-[#2A2622]">
                  {EVENT_CONFIG.name} — Markaz Arabiyah
                </p>
                <p className="mt-1 text-xs text-ink-secondary max-w-md leading-relaxed">
                  {EVENT_CONFIG.tagline}. Sistem informasi pendaftaran lomba
                  terpadu, verifikasi kode unik pembayaran, dan penerbitan
                  e-Syahadah bervalidasi QR Code.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-ink-secondary">
              <Link
                href="/#katalog-lomba"
                className="hover:text-[#2A2622] transition-colors"
              >
                Katalog Lomba
              </Link>
              <span className="text-[#2A2622]/25">•</span>
              <Link
                href="/e-syahadah"
                className="hover:text-[#2A2622] transition-colors"
              >
                Unduh e-Syahadah
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-[#2A2622]/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2">
            <p>
              &copy; {EVENT_CONFIG.year} Panitia Pelaksana {EVENT_CONFIG.name}.
              Hak cipta dilindungi.
            </p>
            <p className="tabular-data">Format Kode Pendaftaran: DM9-XXXX</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

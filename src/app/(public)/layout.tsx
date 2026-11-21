import Link from "next/link";
import Image from "next/image";
import { Trophy, Bell } from "lucide-react";
import { EVENT_CONFIG } from "@/lib/constants";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-[#2A2622]/10 bg-[#FFE9C4]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo-tanpa-tulisan.png"
              alt="Logo Markaz Arabiyah"
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-contain"
            />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-sm font-bold tracking-tight text-ink">
                {EVENT_CONFIG.name}
              </span>
              <span className="text-[11px] font-medium text-ink-muted">
                Markaz Arabiyah
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/#katalog-lomba"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-[#FFFFFC]/60 hover:text-ink"
            >
              <Trophy className="h-4 w-4" />
              <span>Katalog Lomba</span>
            </Link>

            <Link
              href="/#papan-pengumuman"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-[#FFFFFC]/60 hover:text-ink"
            >
              <Bell className="h-4 w-4" />
              <span>Pengumuman</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#2A2622]/10 bg-[#FFFFFC]/50 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-bold text-ink">
              {EVENT_CONFIG.name} {EVENT_CONFIG.year}
            </p>
            <p className="text-xs leading-relaxed text-ink-secondary">
              {EVENT_CONFIG.tagline}. Sistem informasi pendaftaran terpadu,
              verifikasi pembayaran, absensi Hari-H, dan penerbitan e-Syahadah
              resmi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-ink-secondary">
            <Link href="/#katalog-lomba" className="hover:text-ink">
              Katalog Lomba
            </Link>
            <span className="text-[#2A2622]/25">•</span>
            <Link href="/e-syahadah" className="hover:text-ink">
              Unduh e-Syahadah
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

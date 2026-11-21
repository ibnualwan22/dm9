"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Trophy,
  Megaphone,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { logoutAdminAction } from "@/actions/admin-auth.action";
import { EVENT_CONFIG } from "@/lib/constants";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Ringkasan & Kuota",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/verifikasi-bayar",
    label: "Meja Bendahara",
    icon: CreditCard,
    exact: false,
  },
  {
    href: "/admin/peserta",
    label: "Peserta & Absensi",
    icon: Users,
    exact: false,
  },
  {
    href: "/admin/lomba",
    label: "Cabang Lomba",
    icon: Trophy,
    exact: false,
  },
  {
    href: "/admin/pengumuman",
    label: "Pengumuman & WA",
    icon: Megaphone,
    exact: false,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Halaman login ditampilkan penuh tanpa sidebar
  if (pathname === "/admin/login") {
    return <div className="min-h-screen">{children}</div>;
  }

  async function handleLogout() {
    await logoutAdminAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen text-ink">
      {/* Sidebar Desktop (240px sesuai Anti-Slop SaaS Application Shell) */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#2A2622]/10 bg-[#FFFFFC]/65 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 border-b border-[#2A2622]/10 px-5">
          <img
            src="/images/logo-tanpa-tulisan.png"
            alt={`Logo ${EVENT_CONFIG.name}`}
            className="h-8 w-8 object-contain"
          />
          <div className="min-w-0">
            <p className="sonorous-display truncate text-base font-normal text-[#2A2622]">
              Panel Panitia
            </p>
            <p className="truncate text-[11px] text-ink-secondary">
              {EVENT_CONFIG.name}
            </p>
          </div>
        </div>

        <nav
          aria-label="Navigasi Dashboard Panitia"
          className="flex-1 space-y-1 px-3 py-4"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2A2622] text-[#FFFFFC] font-semibold shadow-sm"
                    : "text-ink-secondary hover:bg-[#FFFFFC]/60 hover:text-[#2A2622] border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#2A2622]/10 p-3 space-y-1.5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-[#FFFFFC]/60 hover:text-[#2A2622] transition-colors"
          >
            <span>Lihat Portal Publik</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50/80 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Sesi Panitia</span>
          </button>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Header Mobile & Tablet */}
        <header className="sticky top-0 z-20 flex flex-col border-b border-[#2A2622]/10 bg-[#FFFFFC]/65 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/logo-tanpa-tulisan.png"
                alt={`Logo ${EVENT_CONFIG.name}`}
                className="h-7 w-7 object-contain"
              />
              <span className="sonorous-display text-base font-normal text-[#2A2622]">
                Panel Panitia {EVENT_CONFIG.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                target="_blank"
                className="rounded-lg border border-[#2A2622]/15 bg-[#FFFFFC]/60 px-2.5 py-1 text-xs font-medium text-ink-secondary"
              >
                Web Publik
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-600"
              >
                Keluar
              </button>
            </div>
          </div>

          {/* Bar Navigasi Horizontal di Mobile */}
          <nav
            aria-label="Navigasi Mobile Panitia"
            className="flex items-center gap-1.5 overflow-x-auto border-t border-[#2A2622]/10 bg-[#FFFFFC]/40 px-3 py-2"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? "bg-[#2A2622] text-[#FFFFFC]"
                      : "bg-[#FFFFFC]/65 text-ink-secondary border border-[#2A2622]/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

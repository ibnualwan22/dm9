import Link from "next/link";
import { ArrowRight, Download, ShieldCheck, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { EVENT_CONFIG } from "@/lib/constants";
import { CountdownTimer } from "@/components/public/countdown-timer";
import { AnnouncementBoard } from "@/components/public/announcement-board";
import {
  CompetitionCard,
  type CompetitionCatalogItem,
} from "@/components/public/competition-card";
import { Reveal } from "@/components/public/reveal";

export const dynamic = "force-dynamic";

export default async function PublicLandingPage() {
  const [competitionsRaw, announcements] = await Promise.all([
    prisma.competition.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    }),
    prisma.announcement.findMany({
      orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  const competitions: CompetitionCatalogItem[] = competitionsRaw.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    quota: c.quota,
    usedQuota: c._count.registrations,
    registrationFee: c.registrationFee,
    maxMembers: c.maxMembers,
    sopFileUrl: c.sopFileUrl,
    contactPerson: c.contactPerson,
    contactName: c.contactName,
    isActive: c.isActive,
  }));

  const totalCompetitions = competitions.length;
  const totalRemainingSlots = competitions.reduce(
    (acc, item) => acc + Math.max(0, item.quota - item.usedQuota),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 space-y-16">
      {/* SECTION 1: Open Editorial Hero (Tanpa Card agar Flow Gradient Terlihat Penuh) */}
      <section className="space-y-10 pt-2 sm:pt-6">
        <Reveal>
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2622]/15 bg-[#FFFFFC]/45 px-3.5 py-1.5 text-xs font-semibold text-[#2A2622] backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              <span>
                Portal Resmi Munaya (Musabaqoh Tsanawiyah Li Markazil Arabiyah) {EVENT_CONFIG.year}
              </span>
            </div>

            <h1 className="sonorous-display text-4xl sm:text-6xl lg:text-[4.25rem] font-normal tracking-tight text-[#2A2622] leading-[1.06]">
              {EVENT_CONFIG.name}{" "}
              <span className="italic">Markaz Arabiyah</span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-[#2A2622]/85 max-w-2xl">
              Daftarkan delegasi terbaik instansi, pesantren, atau sekolah Anda.
              Unduh petunjuk teknis (SOP), unggah bukti transfer dengan kode
              unik, dan unduh e-Syahadah resmi dalam satu portal terpadu.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <a href="#katalog-lomba" className="btn-primary">
                <span>Pilih Cabang Lomba</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <Link href="/e-syahadah" className="btn-secondary">
                <Download className="h-4 w-4 text-brand" />
                <span>Unduh e-Syahadah</span>
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Alur Ringkas 3 Langkah — Tanpa Card (Open Typographic Columns di atas Flow Gradient) */}
        <Reveal>
          <div className="grid grid-cols-1 gap-6 border-t border-[#2A2622]/15 pt-8 sm:grid-cols-3 sm:gap-8">
            {[
              {
                step: "01",
                title: "Isi Form & Unggah Bukti",
                desc: "Pilih cabang lomba, isi data peserta, lalu transfer sesuai 3 digit kode unik dan unggah bukti transfer.",
              },
              {
                step: "02",
                title: "Verifikasi & Masuk Grup WA",
                desc: "Setelah bendahara memverifikasi pembayaran, tautan Grup WhatsApp resmi cabang lomba dikirim otomatis ke nomor WhatsApp Anda.",
              },
              {
                step: "03",
                title: "Unduh e-Syahadah",
                desc: "Setelah hadir di Hari-H, unduh PDF e-Syahadah ber-QR Code.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="tabular-data text-xs font-bold uppercase tracking-wider text-brand">
                    Langkah {item.step}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                </div>
                <p className="sonorous-display text-xl font-normal text-[#2A2622]">
                  {item.title}
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-[#2A2622]/80">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Countdown Timer Real-time (Open Translucent Bar) */}
        <Reveal>
          <CountdownTimer deadlineISO={EVENT_CONFIG.deadlineISO} />
        </Reveal>
      </section>

      {/* SECTION 2: Katalog Cabang Perlombaan */}
      <Reveal>
        <section id="katalog-lomba" className="scroll-mt-20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#2A2622]/15 pb-4">
            <div>
              <h2 className="sonorous-display text-3xl sm:text-4xl font-normal tracking-tight text-[#2A2622]">
                Katalog Cabang Perlombaan
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Pilih cabang lomba untuk mengunduh SOP/Juknis, menghubungi Contact
                Person, atau mengisi formulir pendaftaran.
              </p>
            </div>
            <p className="tabular-data text-xs font-semibold text-[#2A2622]/80">
              {totalCompetitions} Cabang Lomba • {totalRemainingSlots} Total Slot
              Tersedia
            </p>
          </div>

          {competitions.length === 0 ? (
            <div className="card-surface p-8 text-center text-sm text-ink-muted">
              Belum ada cabang lomba yang tersedia saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {competitions.map((comp, idx) => (
                <Reveal key={comp.id} delay={Math.min(idx, 3) * 70}>
                  <CompetitionCard competition={comp} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* SECTION 3: Papan Pengumuman Resmi */}
      <Reveal>
        <section id="papan-pengumuman" className="scroll-mt-20 space-y-6">
          <div className="border-b border-[#2A2622]/15 pb-4">
            <h2 className="sonorous-display text-3xl sm:text-4xl font-normal tracking-tight text-[#2A2622]">
              Papan Pengumuman Resmi Panitia
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Informasi terbaru terkait petunjuk teknis, perubahan jadwal, dan
              ketentuan daftar ulang.
            </p>
          </div>

          <AnnouncementBoard announcements={announcements} />
        </section>
      </Reveal>
    </div>
  );
}

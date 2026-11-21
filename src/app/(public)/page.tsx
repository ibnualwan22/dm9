import Link from "next/link";
import { ArrowRight, Download, ShieldCheck, CheckCircle2 } from "lucide-react";
import prisma from "@/lib/prisma";
import { EVENT_CONFIG } from "@/lib/constants";
import { CompetitionCard } from "@/components/public/competition-card";
import { AnnouncementBoard } from "@/components/public/announcement-board";
import { CountdownTimer } from "@/components/public/countdown-timer";
import { Reveal } from "@/components/public/reveal";

export const dynamic = "force-dynamic";

export default async function PublicHomePage() {
  const competitions = await prisma.competition.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 space-y-16 sm:space-y-20">
      {/* SEKSI 1: Hero Utama */}
      <section className="relative overflow-hidden">
        <Reveal>
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2622]/12 bg-[#FFFFFC]/60 px-3 py-1 text-xs font-semibold text-brand backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Musabaqoh Tsanawiyah Li Markazil Arabiyah 2026</span>
              </span>
            </div>

            <h1 className="sonorous-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
              {EVENT_CONFIG.name}{" "}
              <span className="italic">Markaz Arabiyah</span>
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
              Daftarkan delegasi terbaik instansi, pesantren, atau sekolah Anda.
              Unduh petunjuk teknis (SOP), unggah bukti transfer dengan kode
              unik, dan unduh e-Syahadah resmi dalam satu portal terpadu.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="#katalog-lomba" className="btn-primary">
                <span>Pilih Cabang Lomba</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link href="/e-syahadah" className="btn-secondary">
                <Download className="h-4 w-4 text-brand" />
                <span>Unduh e-Syahadah</span>
              </Link>
            </div>

            <Reveal delay={120}>
              <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Isi Form & Unggah Bukti",
                    desc: "Pilih cabang lomba, isi data peserta, lalu transfer sesuai 3 digit kode unik dan unggah bukti transfer.",
                  },
                  {
                    number: "02",
                    title: "Verifikasi & Masuk Grup WA",
                    desc: "Setelah bendahara memverifikasi pembayaran, tautan Grup WhatsApp resmi cabang lomba dikirim otomatis ke nomor WhatsApp Anda.",
                  },
                  {
                    number: "03",
                    title: "Kunci Nama & Unduh e-Syahadah",
                    desc: "Konfirmasi ejaan nama peserta setelah kehadiran Hari-H, lalu unduh PDF sertifikat resmi dengan QR validasi.",
                  },
                ].map((step) => (
                  <div key={step.number} className="flex gap-3.5">
                    <span className="tabular-data font-mono text-sm font-bold text-brand">
                      {step.number}
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-ink">
                        {step.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-ink-secondary">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </Reveal>
      </section>

      {/* SEKSI 2: Timer Hitung Mundur Penutupan Pendaftaran */}
      <Reveal>
        <CountdownTimer deadlineISO={EVENT_CONFIG.deadlineISO} />
      </Reveal>

      {/* SEKSI 3: Katalog Cabang Lomba */}
      <Reveal>
        <section id="katalog-lomba" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#2A2622]/12 pb-4">
            <div className="space-y-1">
              <h2 className="sonorous-display text-2xl font-bold sm:text-3xl">
                Pilih Cabang Lomba Anda
              </h2>
              <p className="text-sm text-ink-secondary">
                Setiap cabang lomba memiliki juknis (SOP) dan kuota slot yang
                terbatas.
              </p>
            </div>

            <p className="flex items-center gap-2 text-xs font-semibold text-brand">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {competitions.length} Cabang Perlombaan Telah Dibuka
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {competitions.map((comp, idx) => (
              <Reveal key={comp.id} delay={Math.min(idx, 3) * 70}>
                <CompetitionCard competition={comp} />
              </Reveal>
            ))}
          </div>

          {competitions.length === 0 && (
            <div className="card-surface p-8 text-center text-sm text-ink-muted">
              Belum ada cabang lomba yang dibuka saat ini. Silakan pantau
              pengumuman panitia.
            </div>
          )}
        </section>
      </Reveal>

      {/* SEKSI 4: Papan Pengumuman */}
      <Reveal>
        <section id="papan-pengumuman" className="scroll-mt-24">
          <AnnouncementBoard announcements={announcements} />
        </section>
      </Reveal>
    </div>
  );
}

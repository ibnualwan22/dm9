import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  Users,
  User,
} from "lucide-react";
import prisma from "@/lib/prisma";
import {
  buildContactWhatsappUrl,
  formatRupiah,
  generateUniquePaymentCode,
} from "@/lib/utils";
import { RegistrationForm } from "@/components/public/registration-form";

export const dynamic = "force-dynamic";

interface CompetitionDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function CompetitionRegistrationPage({
  params,
}: CompetitionDetailPageProps) {
  const competition = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });

  if (!competition) {
    notFound();
  }

  const usedQuota = competition._count.registrations;
  const remainingQuota = Math.max(0, competition.quota - usedQuota);
  const isFullOrClosed = remainingQuota <= 0 || !competition.isActive;
  const initialUniqueCode =
    competition.registrationFee === 0 ? 0 : generateUniquePaymentCode();

  const waUrl = buildContactWhatsappUrl(
    competition.contactPerson,
    competition.contactName,
    competition.name
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* Breadcrumb Kembali */}
      <div>
        <Link
          href="/#katalog-lomba"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-[#2A2622]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Katalog Lomba</span>
        </Link>
      </div>

      {/* Header Informasi Cabang Lomba — Open Hero Header di atas Flow Gradient */}
      <div className="space-y-4 border-b border-[#2A2622]/15 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2622]/15 bg-[#FFFFFC]/50 px-3 py-1 text-xs font-medium text-[#2A2622] backdrop-blur-md">
            {competition.type === "TEAM" ? (
              <>
                <Users className="h-3.5 w-3.5 text-brand" />
                <span>Lomba Beregu (Maksimal {competition.maxMembers} Orang)</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-brand" />
                <span>Lomba Individu (1 Peserta)</span>
              </>
            )}
          </span>

          <span className="tabular-data rounded-full border border-[#2A2622]/15 bg-[#FFAE3F]/25 px-3.5 py-1 text-xs font-bold text-[#2A2622] backdrop-blur-md">
            Biaya: {formatRupiah(competition.registrationFee)}
          </span>
        </div>

        <h1 className="sonorous-display text-3xl sm:text-5xl font-normal tracking-tight text-[#2A2622]">
          Formulir Pendaftaran: {competition.name}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
          <div className="space-y-0.5">
            <span className="text-ink-secondary">Ketersediaan Slot Kuota:</span>
            <p
              className={`tabular-data text-sm font-bold ${
                isFullOrClosed ? "text-red-600" : "text-[#2A2622]"
              }`}
            >
              {isFullOrClosed
                ? "Kuota Penuh / Pendaftaran Ditutup"
                : `Tersisa ${remainingQuota} dari ${competition.quota} slot`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={competition.sopFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 px-3"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Baca SOP / Juknis Lomba</span>
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 px-3"
            >
              <MessageCircle className="h-3.5 w-3.5 text-brand" />
              <span>Tanya CP ({competition.contactName})</span>
            </a>
          </div>
        </div>
      </div>

      {/* Formulir Pendaftaran — keputusan tampil/tutup ada di dalam
          RegistrationForm, agar layar sukses tidak hilang saat pendaftaran
          mengambil slot terakhir dan halaman me-refresh kuota. */}
      <RegistrationForm
        competition={{
          id: competition.id,
          name: competition.name,
          slug: competition.slug,
          type: competition.type,
          registrationFee: competition.registrationFee,
          maxMembers: competition.maxMembers,
          quota: competition.quota,
          usedQuota,
          isActive: competition.isActive,
        }}
        initialUniqueCode={initialUniqueCode}
      />
    </div>
  );
}

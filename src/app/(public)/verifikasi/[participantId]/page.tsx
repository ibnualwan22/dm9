import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowLeft,
} from "lucide-react";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EVENT_CONFIG } from "@/lib/constants";
import { formatDateID } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface VerificationPageProps {
  params: {
    participantId: string;
  };
}

export default async function CertificateVerificationPage({
  params,
}: VerificationPageProps) {
  const participant = await prisma.participant.findUnique({
    where: { id: params.participantId },
    include: {
      registration: {
        include: {
          competition: true,
        },
      },
    },
  });

  if (!participant) {
    notFound();
  }

  const isPaymentVerified =
    participant.registration.paymentStatus === PaymentStatus.VERIFIED;
  const isCertificateValid = isPaymentVerified && participant.isPresent;
  const canDownloadPdf = isCertificateValid;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Beranda {EVENT_CONFIG.name}</span>
      </Link>

      <div className="card-surface overflow-hidden">
        {/* Header Status Validitas */}
        <div
          className={`p-6 text-white ${
            isCertificateValid ? "bg-brand" : "bg-amber-700"
          }`}
        >
          <div className="flex items-center gap-3">
            {isCertificateValid ? (
              <CheckCircle2 className="h-8 w-8 shrink-0" />
            ) : (
              <AlertTriangle className="h-8 w-8 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                Verifikasi Keaslian Dokumen e-Syahadah
              </p>
              <h1 className="text-xl font-bold">
                {isCertificateValid
                  ? "SERTIFIKAT SAH & TERDAFTAR RESMI"
                  : "SERTIFIKAT BELUM AKTIF / DALAM PROSES"}
              </h1>
            </div>
          </div>
        </div>

        {/* Rincian Data Pemegang Sertifikat */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-5 space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">Nomor e-Syahadah</span>
              <span className="tabular-data font-bold text-ink">
                {participant.certificateNumber || "Akan Terbit Saat Diunduh"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">
                Nama Pemegang Sertifikat
              </span>
              <span className="text-base font-bold text-ink">
                {participant.fullName}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">Status / Peran</span>
              <span className="font-semibold text-ink">{participant.role}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">Asal Instansi</span>
              <span className="font-medium text-ink">
                {participant.registration.teamName
                  ? `${participant.registration.teamName} — ${participant.registration.institution}`
                  : participant.registration.institution}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">Cabang Perlombaan</span>
              <span className="font-bold text-brand">
                {participant.registration.competition.name}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#2A2622]/12 pb-3">
              <span className="text-xs text-ink-muted">Kode Pendaftaran</span>
              <span className="tabular-data font-semibold text-ink">
                {participant.registration.registrationCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs text-ink-muted">Waktu Pengecekan</span>
              <span className="text-xs font-medium text-ink-secondary">
                {formatDateID(new Date(), true)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <ShieldCheck className="h-4 w-4 text-brand shrink-0" />
              <span>
                Data ini bersumber langsung dari pangkalan data resmi{" "}
                <strong>{EVENT_CONFIG.name}</strong>.
              </span>
            </div>

            {canDownloadPdf && (
              <a
                href={`/api/syahadah/${participant.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs w-full sm:w-auto whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Salinan PDF</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  Users,
  User,
  FileText,
  MessageCircle,
  ArrowRight,
  Lock,
} from "lucide-react";
import { buildContactWhatsappUrl, formatRupiah } from "@/lib/utils";

export interface CompetitionCatalogItem {
  id: string;
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "TEAM";
  quota: number;
  usedQuota: number;
  registrationFee: number;
  maxMembers: number;
  sopFileUrl: string;
  contactPerson: string;
  contactName: string;
  isActive: boolean;
}

interface CompetitionCardProps {
  competition: CompetitionCatalogItem;
}

export function CompetitionCard({ competition }: CompetitionCardProps) {
  const remainingQuota = Math.max(0, competition.quota - competition.usedQuota);
  const isFull = remainingQuota <= 0 || !competition.isActive;
  const occupancyPercent = Math.min(
    100,
    Math.round((competition.usedQuota / Math.max(1, competition.quota)) * 100)
  );

  const waUrl = buildContactWhatsappUrl(
    competition.contactPerson,
    competition.contactName,
    competition.name
  );

  return (
    <div className="card-surface flex flex-col justify-between p-5 sm:p-6 transition-all duration-150 hover:border-[#2A2622]/25">
      <div>
        {/* Header Metadata: Kategori & Biaya */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/60 px-2.5 py-1 text-xs font-medium text-ink-secondary">
            {competition.type === "TEAM" ? (
              <>
                <Users className="h-3.5 w-3.5 text-brand" />
                <span>Beregu (Maks. {competition.maxMembers} Orang)</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-brand" />
                <span>Individu</span>
              </>
            )}
          </span>

          <span className="tabular-data rounded-lg border border-[#2A2622]/12 bg-[#FFAE3F]/20 px-2.5 py-1 text-xs font-bold text-[#2A2622]">
            {formatRupiah(competition.registrationFee)}
          </span>
        </div>

        {/* Judul Cabang Lomba */}
        <h3 className="sonorous-display mt-3.5 text-2xl font-normal tracking-tight text-[#2A2622]">
          {competition.name}
        </h3>

        {/* Indikator Kuota Real-Time */}
        <div className="mt-4 rounded-xl border border-[#2A2622]/10 bg-[#FFFFFC]/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-secondary">
              Ketersediaan Kuota
            </span>
            <span
              className={`tabular-data font-bold ${isFull
                ? "text-red-600"
                : remainingQuota <= 5
                  ? "text-amber-700"
                  : "text-[#2A2622]"
                }`}
            >
              {isFull
                ? "Kuota Penuh"
                : `Tersisa ${remainingQuota} dari ${competition.quota} slot`}
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#2A2622]/10">
            <div
              className={`h-full transition-all duration-300 ${isFull
                ? "bg-red-600"
                : occupancyPercent >= 80
                  ? "bg-amber-600"
                  : "bg-[#2A2622]"
                }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Aksi (1 Primary CTA + 2 Secondary Links sesuai 1-to-3 Rule) */}
      <div className="mt-5 space-y-2.5 pt-4 border-t border-[#2A2622]/10">
        {isFull ? (
          <button
            type="button"
            disabled
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2A2622]/10 px-4 py-2.5 text-sm font-semibold text-ink-muted cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            <span>Pendaftaran Ditutup / Kuota Penuh</span>
          </button>
        ) : (
          <Link
            href={`/lomba/${competition.slug}`}
            className="btn-primary w-full"
          >
            <span>Daftar Cabang Lomba Ini</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a
            href={competition.sopFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-2 px-3 text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-ink-secondary" />
            <span>Unduh SOP</span>
          </a>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary py-2 px-3 text-xs"
          >
            <MessageCircle className="h-3.5 w-3.5 text-brand" />
            <span className="truncate">CP: {competition.contactName}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

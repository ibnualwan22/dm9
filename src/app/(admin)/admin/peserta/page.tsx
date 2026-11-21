import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { BatchEmailPanel } from "@/components/admin/batch-email-panel";
import {
  ParticipantTable,
  type AdminParticipantRow,
} from "@/components/admin/participant-table";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage() {
  const [competitions, participantsRaw] = await Promise.all([
    prisma.competition.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.participant.findMany({
      include: {
        registration: {
          include: {
            competition: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const participants: AdminParticipantRow[] = participantsRaw.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    role: p.role,
    isPresent: p.isPresent,
    isNameLocked: p.isNameLocked,
    certificateNumber: p.certificateNumber,
    certificateSentAt: p.certificateSentAt
      ? p.certificateSentAt.toISOString()
      : null,
    registration: {
      id: p.registration.id,
      registrationCode: p.registration.registrationCode,
      teamName: p.registration.teamName,
      institution: p.registration.institution,
      leaderEmail: p.registration.leaderEmail,
      leaderPhone: p.registration.leaderPhone,
      paymentStatus: p.registration.paymentStatus,
      paymentAmount: p.registration.paymentAmount,
      competition: p.registration.competition,
    },
  }));

  const totalEligibleUnsent = participantsRaw.filter(
    (p) =>
      p.isPresent &&
      !p.certificateSentAt &&
      p.registration.paymentStatus === PaymentStatus.VERIFIED
  ).length;

  const totalAlreadySent = participantsRaw.filter((p) =>
    Boolean(p.certificateSentAt)
  ).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2A2622]/12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Manajemen Peserta, Absensi Hari-H &amp; Distribusi e-Syahadah
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Centang kehadiran peserta pada Hari-H untuk membuka akses kunci nama
          dan unduh PDF e-Syahadah, ekspor rekapitulasi ke Excel/CSV, atau kirim
          sertifikat massal via email per batch.
        </p>
      </div>

      <BatchEmailPanel
        competitions={competitions}
        totalEligibleUnsent={totalEligibleUnsent}
        totalAlreadySent={totalAlreadySent}
      />

      <ParticipantTable
        participants={participants}
        competitions={competitions}
      />
    </div>
  );
}

import prisma from "@/lib/prisma";
import {
  SplitVerifier,
  type TreasurerQueueItem,
} from "@/components/admin/split-verifier";

export const dynamic = "force-dynamic";

export default async function TreasurerVerificationPage() {
  const registrations = await prisma.registration.findMany({
    include: {
      competition: {
        select: {
          id: true,
          name: true,
          registrationFee: true,
        },
      },
      participants: {
        select: {
          id: true,
          fullName: true,
          role: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const serialized: TreasurerQueueItem[] = registrations.map((r) => ({
    id: r.id,
    registrationCode: r.registrationCode,
    teamName: r.teamName,
    institution: r.institution,
    leaderEmail: r.leaderEmail,
    leaderPhone: r.leaderPhone,
    paymentStatus: r.paymentStatus,
    paymentProofUrl: r.paymentProofUrl,
    uniqueCode: r.uniqueCode,
    paymentAmount: r.paymentAmount,
    verifiedBy: r.verifiedBy,
    verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    competition: r.competition,
    participants: r.participants,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2A2622]/12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Meja Kerja Bendahara (Split-Screen Verification)
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Cocokkan 3 digit kode unik pada nominal tagihan dengan mutasi rekening
          panitia, lalu tekan <strong>Setujui Pembayaran</strong> atau{" "}
          <strong>Tolak + Alasan</strong> tanpa berpindah halaman.
        </p>
      </div>

      <SplitVerifier items={serialized} />
    </div>
  );
}

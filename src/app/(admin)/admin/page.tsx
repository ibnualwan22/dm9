import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowRight,
  Trophy,
  UserCheck,
} from "lucide-react";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [competitions, registrations, totalParticipantsCount, presentParticipantsCount] =
    await Promise.all([
      prisma.competition.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          registrations: {
            select: {
              id: true,
              paymentStatus: true,
              paymentAmount: true,
            },
          },
        },
      }),
      prisma.registration.findMany({
        select: {
          id: true,
          paymentStatus: true,
          paymentAmount: true,
        },
      }),
      prisma.participant.count(),
      prisma.participant.count({ where: { isPresent: true } }),
    ]);

  const totalRegistrations = registrations.length;
  const verifiedRegistrations = registrations.filter(
    (r) => r.paymentStatus === PaymentStatus.VERIFIED
  );
  const waitingRegistrations = registrations.filter(
    (r) => r.paymentStatus === PaymentStatus.WAITING
  );
  const pendingRegistrations = registrations.filter(
    (r) => r.paymentStatus === PaymentStatus.PENDING
  );

  const totalVerifiedCash = verifiedRegistrations.reduce(
    (sum, item) => sum + item.paymentAmount,
    0
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2622]/12 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Ringkasan Operasional &amp; Okupansi Kuota
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Pantau kas masuk terverifikasi, antrean meja bendahara, dan sisa
            slot kuota setiap cabang lomba secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/admin/verifikasi-bayar" className="btn-primary text-xs">
            <span>Buka Meja Bendahara ({waitingRegistrations.length})</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin/peserta" className="btn-secondary text-xs">
            <UserCheck className="h-4 w-4 text-brand" />
            <span>Absensi Peserta</span>
          </Link>
        </div>
      </div>

      {/* Top 4-Column KPI Grid (Single Source of Metric Truth) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Total Pendaftaran</span>
            <Users className="h-4 w-4 text-brand" />
          </div>
          <p className="tabular-data mt-2 text-2xl font-bold text-ink">
            {totalRegistrations}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Mencakup {totalParticipantsCount} peserta ({presentParticipantsCount}{" "}
            hadir Hari-H)
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Terverifikasi (Lunas)</span>
            <CheckCircle2 className="h-4 w-4 text-brand" />
          </div>
          <p className="tabular-data mt-2 text-2xl font-bold text-brand">
            {verifiedRegistrations.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {pendingRegistrations.length} pendaftaran menunggu bukti transfer (PENDING)
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Antrean Verifikasi TF</span>
            <Clock className="h-4 w-4 text-amber-accent" />
          </div>
          <p className="tabular-data mt-2 text-2xl font-bold text-amber-700">
            {waitingRegistrations.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Menunggu persetujuan meja bendahara
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
            <span>Total Kas Masuk (Lunas)</span>
            <Wallet className="h-4 w-4 text-brand" />
          </div>
          <p className="tabular-data mt-2 text-2xl font-bold text-ink">
            { totalVerifiedCash === 0 ? "Rp 0" : formatRupiah(totalVerifiedCash) }
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Akumulasi nominal + kode unik
          </p>
        </div>
      </div>

      {/* Tabel Okupansi Kuota per Cabang Lomba */}
      <div className="card-surface overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A2622]/12 p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold text-ink">
              Matriks Okupansi Kuota per Cabang Lomba
            </h2>
          </div>
          <Link
            href="/admin/lomba"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Kelola Cabang Lomba &amp; Kuota &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2A2622]/12 bg-[#FFFFFC]/50 text-xs font-semibold text-ink-secondary">
              <tr>
                <th className="px-5 py-3.5">Cabang Lomba</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Biaya</th>
                <th className="px-4 py-3.5 text-center">Lunas</th>
                <th className="px-4 py-3.5 text-center">Antrean TF</th>
                <th className="px-4 py-3.5 text-center">Pending</th>
                <th className="px-5 py-3.5">Terisi / Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4DF]">
              {competitions.map((comp) => {
                const used = comp.registrations.length;
                const verifiedCount = comp.registrations.filter(
                  (r) => r.paymentStatus === "VERIFIED"
                ).length;
                const waitingCount = comp.registrations.filter(
                  (r) => r.paymentStatus === "WAITING"
                ).length;
                const pendingCount = comp.registrations.filter(
                  (r) => r.paymentStatus === "PENDING"
                ).length;
                const percent = Math.min(
                  100,
                  Math.round((used / Math.max(1, comp.quota)) * 100)
                );

                return (
                  <tr
                    key={comp.id}
                    className="hover:bg-[#FFFFFC]/50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink">{comp.name}</div>
                      <div className="text-xs text-ink-muted">
                        CP: {comp.contactName} ({comp.contactPerson})
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-secondary">
                      {comp.type === "TEAM"
                        ? `Beregu (Maks. ${comp.maxMembers})`
                        : "Individu"}
                    </td>
                    <td className="px-4 py-3.5 tabular-data text-xs font-medium text-ink">
                      {formatRupiah(comp.registrationFee)}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-data text-xs font-bold text-brand">
                      {verifiedCount}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-data text-xs font-bold text-amber-700">
                      {waitingCount}
                    </td>
                    <td className="px-4 py-3.5 text-center tabular-data text-xs font-medium text-ink-secondary">
                      {pendingCount}
                    </td>
                    <td className="px-5 py-3.5 min-w-[170px]">
                      <div className="flex items-center justify-between text-xs tabular-data mb-1">
                        <span className="font-bold text-ink">
                          {used} / {comp.quota}
                        </span>
                        <span className="text-ink-muted">{percent}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className={`h-full ${
                            used >= comp.quota
                              ? "bg-red-600"
                              : percent >= 80
                                ? "bg-amber-600"
                                : "bg-brand"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

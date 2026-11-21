import prisma from "@/lib/prisma";
import {
  CompetitionManager,
  type AdminCompetitionItem,
} from "@/components/admin/competition-manager";

export const dynamic = "force-dynamic";

export default async function AdminCompetitionsPage() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  const items: AdminCompetitionItem[] = competitions.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    quota: c.quota,
    usedQuota: c._count.registrations,
    registrationFee: c.registrationFee,
    maxMembers: c.maxMembers,
    sopFileUrl: c.sopFileUrl,
    whatsappGroupUrl: c.whatsappGroupUrl,
    contactPerson: c.contactPerson,
    contactName: c.contactName,
    isActive: c.isActive,
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2A2622]/12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Manajemen Cabang Lomba, SOP &amp; Grup WhatsApp
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Atur kuota pendaftar, biaya pendaftaran, jumlah anggota maksimal tim,
          link PDF SOP/Juknis, serta link Grup WhatsApp masing-masing cabang
          lomba.
        </p>
      </div>

      <CompetitionManager competitions={items} />
    </div>
  );
}

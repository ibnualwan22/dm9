import prisma from "@/lib/prisma";
import {
  AnnouncementManager,
  type AdminAnnouncementItem,
} from "@/components/admin/announcement-manager";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
  });

  const items: AdminAnnouncementItem[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    content: a.content,
    isImportant: a.isImportant,
    attachmentUrl: a.attachmentUrl,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2A2622]/12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Papan Pengumuman &amp; Generator Teks Broadcast WhatsApp
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Kelola pengumuman resmi di halaman utama dan gunakan tombol{" "}
          <strong>Salin Format Broadcast WA</strong> untuk menyebarkan informasi
          ke seluruh Grup WhatsApp cabang lomba secara rapi.
        </p>
      </div>

      <AnnouncementManager announcements={items} />
    </div>
  );
}

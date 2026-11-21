import { PrismaClient, CompetitionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding data Dies Miladis ke-9...");

  const competitions = [
    {
      name: "Musabaqah Qira'atil Kutub (MQK) Fathul Mu'in",
      slug: "mqk-fathul-muin",
      type: CompetitionType.INDIVIDUAL,
      quota: 40,
      registrationFee: 75000,
      maxMembers: 1,
      sopFileUrl: "https://drive.google.com/file/d/1dm9-sop-mqk/view",
      whatsappGroupUrl: "https://chat.whatsapp.com/DiesMiladis9MQK",
      contactPerson: "081234567801",
      contactName: "Ust. Ahmad Fauzi",
      isActive: true,
    },
    {
      name: "Debat Bahasa Arab Ilmiah (Munazharah 'Ilmiyyah)",
      slug: "debat-bahasa-arab",
      type: CompetitionType.TEAM,
      quota: 24,
      registrationFee: 150000,
      maxMembers: 3,
      sopFileUrl: "https://drive.google.com/file/d/1dm9-sop-debat-arab/view",
      whatsappGroupUrl: "https://chat.whatsapp.com/DiesMiladis9DebatArab",
      contactPerson: "081234567802",
      contactName: "Ust. Zaidan Al-Farisi",
      isActive: true,
    },
    {
      name: "Cerdas Cermat Diniyah & Keislaman (Fahmil Kutub)",
      slug: "cerdas-cermat-diniyah",
      type: CompetitionType.TEAM,
      quota: 32,
      registrationFee: 120000,
      maxMembers: 3,
      sopFileUrl: "https://drive.google.com/file/d/1dm9-sop-fahmil/view",
      whatsappGroupUrl: "https://chat.whatsapp.com/DiesMiladis9Fahmil",
      contactPerson: "081234567803",
      contactName: "Kak Nabila Rahmah",
      isActive: true,
    },
    {
      name: "Karya Tulis Ilmiah Pesantren & Inovasi Umat",
      slug: "karya-tulis-ilmiah",
      type: CompetitionType.INDIVIDUAL,
      quota: 60,
      registrationFee: 0, // Cabang lomba gratis untuk uji otomatis VERIFIED
      maxMembers: 1,
      sopFileUrl: "https://drive.google.com/file/d/1dm9-sop-kti/view",
      whatsappGroupUrl: "https://chat.whatsapp.com/DiesMiladis9KTI",
      contactPerson: "081234567804",
      contactName: "Kak Luthfi Hakim",
      isActive: true,
    },
  ];

  for (const comp of competitions) {
    await prisma.competition.upsert({
      where: { slug: comp.slug },
      update: comp,
      create: comp,
    });
  }

  const announcements = [
    {
      title: "Pembukaan Resmi Pendaftaran Lomba Dies Miladis ke-9 Tahun 2026",
      slug: "pembukaan-pendaftaran-dies-miladis-9",
      content:
        "Pendaftaran seluruh cabang perlombaan Dies Miladis ke-9 resmi dibuka. Peserta wajib mengunduh Petunjuk Teknis (SOP/Juknis) masing-masing cabang lomba sebelum melakukan pendaftaran. Pastikan nominal transfer menyertakan 3 digit kode unik agar verifikasi bendahara berjalan cepat.",
      isImportant: true,
      attachmentUrl: "https://drive.google.com/file/d/1dm9-buku-panduan-utama/view",
    },
  ];

  for (const item of announcements) {
    await prisma.announcement.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });
  }

  console.log("✅ Seeding selesai!");
}

main()
  .catch((e) => {
    console.error("❌ Gagal melakukan seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

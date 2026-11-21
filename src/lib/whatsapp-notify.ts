import prisma from "@/lib/prisma";
import {
  sendWhatsAppMessage,
  formatVerificationMessage,
} from "@/lib/whatsapp";
import { toWhatsappInternational } from "@/lib/utils";

/**
 * Mengirim pesan WA otomatis "Pembayaran Terverifikasi" beserta tautan Grup WA
 * cabang lomba ke nomor ketua/pendamping pendaftaran.
 *
 * Dipanggil setelah status pendaftaran menjadi VERIFIED:
 * - oleh aksi verifikasi bendahara (verifyPaymentAction), dan
 * - oleh aksi pendaftaran untuk lomba gratis (auto-VERIFIED tanpa langkah admin).
 *
 * Ketahanan:
 * - Pengiriman TIDAK PERNAH menggagalkan verifikasi/pendaftaran (best-effort).
 * - Anti-kirim-ganda memakai kolom Registration.waVerifiedSentAt.
 * - Kirim ulang (force: true) dari Meja Bendahara melewati penanda
 *   anti-kirim-ganda, untuk pendaftaran yang WA-nya belum terkirim.
 * - Pembacaan & penulisan kolom flag dibungkus try/catch agar tetap jalan
 *   sebelum `prisma db push` kolom baru dijalankan di database live.
 */
export async function notifyRegistrationVerified(
  registrationId: string,
  options?: { force?: boolean }
): Promise<{ sent: boolean; skipped?: boolean; detail?: string }> {
  try {
    // Select eksplisit (tanpa waVerifiedSentAt) agar tetap jalan
    // sebelum kolom baru tersedia di database live.
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        registrationCode: true,
        teamName: true,
        institution: true,
        leaderPhone: true,
        paymentStatus: true,
        competition: {
          select: {
            name: true,
            type: true,
            whatsappGroupUrl: true,
          },
        },
        participants: {
          select: { fullName: true, role: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!reg) {
      return { sent: false, detail: "Data pendaftaran tidak ditemukan" };
    }

    if (reg.paymentStatus !== "VERIFIED") {
      return { sent: false, detail: "Pendaftaran belum terverifikasi" };
    }

    // Cek flag terkirim (best-effort) — dilewati bila kirim ulang (force).
    let alreadySent = false;
    try {
      const flag = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: { waVerifiedSentAt: true },
      });
      alreadySent = Boolean(flag?.waVerifiedSentAt);
    } catch {
      alreadySent = false;
    }

    if (alreadySent && !options?.force) {
      return { sent: false, skipped: true, detail: "Pesan sudah pernah terkirim" };
    }

    const leaderName =
      reg.participants.find((p) => p.role === "Ketua")?.fullName ||
      reg.participants[0]?.fullName ||
      "-";

    const message = formatVerificationMessage({
      competitionType: reg.competition.type,
      teamName: reg.teamName,
      leaderName,
      memberNames: reg.participants.map((p) => p.fullName),
      institution: reg.institution,
      competitionName: reg.competition.name,
      registrationCode: reg.registrationCode,
      whatsappGroupUrl: reg.competition.whatsappGroupUrl,
    });

    const result = await sendWhatsAppMessage(
      toWhatsappInternational(reg.leaderPhone),
      message
    );

    console.log("[whatsapp] notify", {
      registrationCode: reg.registrationCode,
      sent: result.success,
      detail: result.detail,
    });

    if (result.success) {
      try {
        await prisma.registration.update({
          where: { id: registrationId },
          data: { waVerifiedSentAt: new Date() },
        });
      } catch {
        // Kolom belum ada di DB live — abaikan, pesan sudah terkirim.
      }
    }

    return { sent: result.success, detail: result.detail };
  } catch (error) {
    return {
      sent: false,
      detail: error instanceof Error ? error.message : "Gagal mengirim WA",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  registrationFormSchema,
  type RegistrationFormValues,
} from "@/lib/validations";
import {
  generateRegistrationCode,
  generateUniquePaymentCode,
  toTitleCase,
} from "@/lib/utils";
import { notifyRegistrationVerified } from "@/lib/whatsapp-notify";

export interface ActionResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SubmittedRegistrationSummary {
  registrationCode: string;
  competitionName: string;
  institution: string;
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  uniqueCode: number;
  isFree: boolean;
  participants: Array<{
    fullName: string;
    role: string;
  }>;
}

/**
 * Server Action: Memproses Pendaftaran Peserta Baru (Individual / Tim)
 * Alur Bisnis Terintegrasi:
 * 1. Validasi Input (Zod Schema)
 * 2. Validasi Kuota Cabang Lomba (Semua status pendaftaran menahan 1 slot)
 * 3. Generate Kode Pendaftaran Unik (DM9-XXXX) & Kode Unik Pembayaran (3 Digit)
 * 4. Deduplikasi Kode Unik Pembayaran Antar Pendaftar yang Belum Lunas
 * 5. Simpan Transaksi Atomik (Registration + Participants)
 * 6. Lomba gratis langsung VERIFIED otomatis + kirim WA berisi link grup.
 *    Bukti transfer WAJIB diunggah saat daftar (opsi Bayar Nanti dihapus).
 */
export async function submitRegistrationAction(
  input: RegistrationFormValues
): Promise<ActionResponse<SubmittedRegistrationSummary>> {
  const parsed = registrationFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Data formulir pendaftaran tidak valid. Harap periksa kembali.",
    };
  }

  const data = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cek Ketersediaan Kuota Lomba
      const competition = await tx.competition.findUnique({
        where: { id: data.competitionId },
        select: {
          id: true,
          name: true,
          type: true,
          quota: true,
          registrationFee: true,
          isActive: true,
          maxMembers: true,
        },
      });

      if (!competition) {
        throw new Error("Cabang lomba tidak ditemukan.");
      }

      if (!competition.isActive) {
        throw new Error(
          "Pendaftaran untuk cabang lomba ini sudah ditutup panitia."
        );
      }

      const usedQuota = await tx.registration.count({
        where: { competitionId: data.competitionId },
      });

      if (usedQuota >= competition.quota) {
        throw new Error(
          `Kuota cabang lomba ${competition.name} sudah penuh (${usedQuota}/${competition.quota}).`
        );
      }

      // 2. Persiapan Data Finansial & Status
      const isFree = competition.registrationFee === 0;
      const uniqueCode = isFree ? 0 : data.uniqueCode;
      const paymentAmount = competition.registrationFee + uniqueCode;

      // Bukti transfer wajib diunggah saat daftar untuk lomba berbayar.
      const hasProof = Boolean(
        data.paymentProofUrl && data.paymentProofUrl.trim() !== ""
      );

      let initialStatus: PaymentStatus;

      if (isFree) {
        // Lomba gratis langsung VERIFIED otomatis
        initialStatus = PaymentStatus.VERIFIED;
      } else if (hasProof) {
        // Berbayar dengan bukti transfer -> Antrean Meja Bendahara (WAITING)
        initialStatus = PaymentStatus.WAITING;
      } else {
        // Seharusnya tidak terjadi karena skema mewajibkan bukti transfer,
        // tetapi dipertahankan sebagai jaring pengaman.
        initialStatus = PaymentStatus.PENDING;
      }

      // 3. Generate Kode Pendaftaran Unik (DM9-XXXX) + Dedup
      let registrationCode = generateRegistrationCode();
      let retries = 0;
      while (retries < 10) {
        const exists = await tx.registration.findUnique({
          where: { registrationCode },
          select: { id: true },
        });
        if (!exists) break;
        registrationCode = generateRegistrationCode();
        retries++;
      }

      // 4. Dedup Kode Unik Pembayaran
      let finalUniqueCode = uniqueCode;
      if (!isFree) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const conflict = await tx.registration.findFirst({
            where: {
              competitionId: data.competitionId,
              uniqueCode: finalUniqueCode,
              paymentAmount: {
                gte: competition.registrationFee + 100,
                lte: competition.registrationFee + 999,
              },
              paymentStatus: {
                in: [PaymentStatus.PENDING, PaymentStatus.WAITING],
              },
            },
            select: { id: true },
          });
          if (!conflict) break;
          finalUniqueCode = generateUniquePaymentCode();
        }
      }

      const finalAmount = competition.registrationFee + finalUniqueCode;

      // 5. Simpan Data Registration & Participants (Atomik)
      // Nama peserta & nama tim disimpan otomatis dalam Title Case;
      // nama instansi dipertahankan sesuai ketikan (singkatan seperti "PP." tidak boleh berubah).
      const cleanProofUrl =
        !isFree && data.paymentProofUrl?.trim()
          ? data.paymentProofUrl.trim()
          : null;

      const newRegistration = await tx.registration.create({
        data: {
          registrationCode,
          competitionId: data.competitionId,
          teamName:
            competition.type === "TEAM" && data.teamName
              ? toTitleCase(data.teamName)
              : null,
          institution: data.institution.trim(),
          leaderEmail: data.leaderEmail.trim(),
          leaderPhone: data.leaderPhone,
          paymentStatus: initialStatus,
          paymentProofUrl: cleanProofUrl,
          uniqueCode: finalUniqueCode,
          paymentAmount: finalAmount,
          verifiedBy: isFree ? "Sistem Otomatis (Gratis)" : null,
          verifiedAt: isFree ? new Date() : null,
          participants: {
            create: data.participants.map((p) => ({
              fullName: toTitleCase(p.fullName),
              role: p.role,
            })),
          },
        },
        include: {
          participants: {
            select: { fullName: true, role: true },
            orderBy: { createdAt: "asc" },
          },
          competition: {
            select: { name: true },
          },
        },
      });

      return {
        registrationCode: newRegistration.registrationCode,
        competitionName: newRegistration.competition.name,
        institution: newRegistration.institution,
        paymentStatus: newRegistration.paymentStatus,
        paymentAmount: newRegistration.paymentAmount,
        uniqueCode: newRegistration.uniqueCode,
        isFree,
        participants: newRegistration.participants,
      };
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");

    // Lomba gratis langsung VERIFIED otomatis -> kirim WA berisi link grup
    // (tanpa langkah admin). Best-effort: gagal kirim WA tidak membatalkan pendaftaran.
    if (result.paymentStatus === PaymentStatus.VERIFIED) {
      const reg = await prisma.registration.findUnique({
        where: { registrationCode: result.registrationCode },
        select: { id: true },
      });
      if (reg) {
        await notifyRegistrationVerified(reg.id);
      }
    }

    return {
      success: true,
      message: `Pendaftaran berhasil! Kode Pendaftaran Anda adalah ${result.registrationCode}.`,
      data: result,
    };
  } catch (error) {
    console.error("Gagal submit pendaftaran:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem saat menyimpan pendaftaran. Silakan coba lagi.",
    };
  }
}

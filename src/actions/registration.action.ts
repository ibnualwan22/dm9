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
  normalizePhone,
  toTitleCase,
} from "@/lib/utils";
import { notifyRegistrationVerified } from "@/lib/whatsapp-notify";

export interface ActionResponse<T = undefined> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface SubmittedRegistrationSummary {
  id: string;
  registrationCode: string;
  competitionName: string;
  competitionSlug: string;
  institution: string;
  paymentStatus: PaymentStatus;
  uniqueCode: number;
  paymentAmount: number;
  registrationFee: number;
}

/**
 * Server Action: Submit Pendaftaran Lomba (Individu maupun Beregu)
 * Dilengkapi Atomic Quota Check & Generator Kode Unik Anti-Bentrok di dalam $transaction.
 */
export async function submitRegistrationAction(
  rawInput: RegistrationFormValues
): Promise<ActionResponse<SubmittedRegistrationSummary>> {
  const parsed = registrationFormSchema.safeParse(rawInput);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message || "Data formulir pendaftaran tidak valid.",
    };
  }

  const input = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const competition = await tx.competition.findUnique({
        where: { id: input.competitionId },
      });

      if (!competition || !competition.isActive) {
        throw new Error(
          "Cabang perlombaan tidak ditemukan atau pendaftaran telah ditutup."
        );
      }

      // 1. Proteksi Race Condition Kuota:
      // Seluruh status pendaftaran (PENDING, WAITING, VERIFIED, REJECTED) menahan 1 slot kuota
      // agar peserta REJECTED tetap bisa mengunggah ulang bukti transfer tanpa kehilangan slot.
      const usedSlots = await tx.registration.count({
        where: {
          competitionId: competition.id,
        },
      });

      if (usedSlots >= competition.quota) {
        throw new Error(
          `Mohon maaf, kuota untuk cabang lomba "${competition.name}" baru saja penuh (${competition.quota} slot).`
        );
      }

      // Validasi jumlah anggota terhadap aturan cabang lomba di DB
      if (
        competition.type === "INDIVIDUAL" &&
        input.participants.length !== 1
      ) {
        throw new Error(
          "Cabang lomba individu hanya boleh terdiri dari 1 peserta."
        );
      }

      if (
        competition.type === "TEAM" &&
        input.participants.length > competition.maxMembers
      ) {
        throw new Error(
          `Jumlah anggota tim tidak boleh melebihi ${competition.maxMembers} orang.`
        );
      }

      // 2. Generate Kode Pendaftaran Unik (DM9-XXXX) bebas bentrok
      let registrationCode = generateRegistrationCode();
      for (let attempt = 0; attempt < 12; attempt++) {
        const existingCode = await tx.registration.findUnique({
          where: { registrationCode },
          select: { id: true },
        });
        if (!existingCode) break;
        registrationCode = generateRegistrationCode();
      }

      // 3. Kalkulasi Kode Unik 3 Digit (101-999) & Status Pembayaran
      const isFree = competition.registrationFee === 0;
      let finalUniqueCode = 0;
      let finalPaymentAmount = 0;
      let initialStatus: PaymentStatus = PaymentStatus.PENDING;

      if (isFree) {
        finalUniqueCode = 0;
        finalPaymentAmount = 0;
        initialStatus = PaymentStatus.VERIFIED;
      } else {
        // Cari kode unik yang sedang aktif (PENDING / WAITING) pada nominal biaya yang sama
        const activeRegistrations = await tx.registration.findMany({
          where: {
            paymentStatus: {
              in: [PaymentStatus.PENDING, PaymentStatus.WAITING],
            },
            competition: {
              registrationFee: competition.registrationFee,
            },
          },
          select: { uniqueCode: true },
        });

        const usedCodes = new Set(activeRegistrations.map((r) => r.uniqueCode));

        const clientCandidate =
          input.uniqueCode >= 101 && input.uniqueCode <= 999
            ? input.uniqueCode
            : generateUniquePaymentCode();

        if (!usedCodes.has(clientCandidate)) {
          finalUniqueCode = clientCandidate;
        } else {
          // Cari kode unik 101-999 yang belum terpakai
          let foundCode: number | null = null;
          for (let i = 0; i < 40; i++) {
            const candidate = generateUniquePaymentCode();
            if (!usedCodes.has(candidate)) {
              foundCode = candidate;
              break;
            }
          }
          finalUniqueCode = foundCode ?? generateUniquePaymentCode();
        }

        finalPaymentAmount = competition.registrationFee + finalUniqueCode;
        const hasProof = Boolean(
          input.paymentProofUrl && input.paymentProofUrl.trim() !== ""
        );

        initialStatus = hasProof
          ? PaymentStatus.WAITING
          : PaymentStatus.PENDING;
      }

      const cleanProofUrl =
        !isFree && input.paymentProofUrl && input.paymentProofUrl.trim() !== ""
          ? input.paymentProofUrl.trim()
          : null;

      // 4. Simpan Pendaftaran beserta Anggota Peserta
      const created = await tx.registration.create({
        data: {
          registrationCode,
          competitionId: competition.id,
          teamName:
            competition.type === "TEAM" && input.teamName
              ? toTitleCase(input.teamName)
              : null,
          institution: input.institution.trim(),
          leaderEmail: input.leaderEmail.trim().toLowerCase(),
          leaderPhone: normalizePhone(input.leaderPhone),
          paymentStatus: initialStatus,
          paymentProofUrl: cleanProofUrl,
          uniqueCode: finalUniqueCode,
          paymentAmount: finalPaymentAmount,
          verifiedBy: isFree ? "Sistem Otomatis (Gratis)" : null,
          verifiedAt: isFree ? new Date() : null,
          participants: {
            create: input.participants.map((p, idx) => ({
              fullName: toTitleCase(p.fullName),
              role:
                competition.type === "INDIVIDUAL"
                  ? "Peserta"
                  : idx === 0
                    ? "Ketua"
                    : "Anggota",
            })),
          },
        },
      });

      return {
        id: created.id,
        registrationCode: created.registrationCode,
        competitionName: competition.name,
        competitionSlug: competition.slug,
        institution: created.institution,
        paymentStatus: created.paymentStatus,
        uniqueCode: created.uniqueCode,
        paymentAmount: created.paymentAmount,
        registrationFee: competition.registrationFee,
      };
    });

    revalidatePath("/");
    revalidatePath(`/lomba/${result.competitionSlug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");

    // Lomba gratis langsung VERIFIED otomatis -> kirim WA berisi link grup
    // (tanpa langkah admin). Best-effort: gagal kirim WA tidak membatalkan pendaftaran.
    if (result.paymentStatus === PaymentStatus.VERIFIED) {
      await notifyRegistrationVerified(result.id);
    }

    return {
      success: true,
      message: "Pendaftaran berhasil disimpan.",
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses pendaftaran.",
    };
  }
}

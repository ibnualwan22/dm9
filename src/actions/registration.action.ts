"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  registrationFormSchema,
  checkStatusLookupSchema,
  reuploadPaymentProofSchema,
  type RegistrationFormValues,
  type ReuploadPaymentProofValues,
} from "@/lib/validations";
import {
  generateRegistrationCode,
  generateUniquePaymentCode,
  normalizePhone,
} from "@/lib/utils";

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
        const hasProof =
          !input.payLater &&
          Boolean(input.paymentProofUrl && input.paymentProofUrl.trim() !== "");

        initialStatus = hasProof
          ? PaymentStatus.WAITING
          : PaymentStatus.PENDING;
      }

      const cleanProofUrl =
        !isFree &&
        !input.payLater &&
        input.paymentProofUrl &&
        input.paymentProofUrl.trim() !== ""
          ? input.paymentProofUrl.trim()
          : null;

      // 4. Simpan Pendaftaran beserta Anggota Peserta
      const created = await tx.registration.create({
        data: {
          registrationCode,
          competitionId: competition.id,
          teamName:
            competition.type === "TEAM" && input.teamName
              ? input.teamName.trim()
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
              fullName: p.fullName.trim(),
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
    revalidatePath("/cek-status");
    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");

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

export interface RegistrationLookupItem {
  id: string;
  registrationCode: string;
  teamName: string | null;
  institution: string;
  leaderEmail: string;
  leaderPhone: string;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  uniqueCode: number;
  paymentAmount: number;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  competition: {
    id: string;
    name: string;
    slug: string;
    type: "INDIVIDUAL" | "TEAM";
    registrationFee: number;
    sopFileUrl: string;
    whatsappGroupUrl: string | null; // Hanya dikirim jika WAITING atau VERIFIED
    contactPerson: string;
    contactName: string;
  };
  participants: Array<{
    id: string;
    fullName: string;
    role: string;
    isNameLocked: boolean;
    isPresent: boolean;
    certificateNumber: string | null;
  }>;
}

/**
 * Server Action: Pencarian Pendaftaran di /cek-status berdasarkan Kode Unik (DM9-XXXX)
 * atau Nomor WhatsApp (mendukung multi-pendaftaran dari 1 guru pendamping/official).
 */
export async function lookupRegistrationsAction(
  rawQuery: string
): Promise<ActionResponse<RegistrationLookupItem[]>> {
  const parsed = checkStatusLookupSchema.safeParse({ query: rawQuery });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Kata kunci pencarian tidak valid.",
    };
  }

  const trimmed = parsed.data.query.trim();
  const isCodeFormat = /^DM9-[A-Z0-9]{4}$/i.test(trimmed);
  const normalizedPhone = normalizePhone(trimmed);

  try {
    const registrations = await prisma.registration.findMany({
      where: isCodeFormat
        ? {
            registrationCode: trimmed.toUpperCase(),
          }
        : {
            OR: [
              { registrationCode: trimmed.toUpperCase() },
              ...(normalizedPhone.length >= 9
                ? [{ leaderPhone: normalizedPhone }]
                : []),
            ],
          },
      include: {
        competition: true,
        participants: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (registrations.length === 0) {
      return {
        success: false,
        error:
          "Data pendaftaran tidak ditemukan. Pastikan Kode Pendaftaran (DM9-XXXX) atau Nomor WhatsApp yang dimasukkan sudah benar.",
      };
    }

    const items: RegistrationLookupItem[] = registrations.map((reg) => {
      const canAccessWhatsappGroup =
        reg.paymentStatus === PaymentStatus.WAITING ||
        reg.paymentStatus === PaymentStatus.VERIFIED;

      return {
        id: reg.id,
        registrationCode: reg.registrationCode,
        teamName: reg.teamName,
        institution: reg.institution,
        leaderEmail: reg.leaderEmail,
        leaderPhone: reg.leaderPhone,
        paymentStatus: reg.paymentStatus,
        paymentProofUrl: reg.paymentProofUrl,
        uniqueCode: reg.uniqueCode,
        paymentAmount: reg.paymentAmount,
        rejectionReason: reg.rejectionReason,
        verifiedAt: reg.verifiedAt ? reg.verifiedAt.toISOString() : null,
        createdAt: reg.createdAt.toISOString(),
        competition: {
          id: reg.competition.id,
          name: reg.competition.name,
          slug: reg.competition.slug,
          type: reg.competition.type,
          registrationFee: reg.competition.registrationFee,
          sopFileUrl: reg.competition.sopFileUrl,
          whatsappGroupUrl: canAccessWhatsappGroup
            ? reg.competition.whatsappGroupUrl
            : null,
          contactPerson: reg.competition.contactPerson,
          contactName: reg.competition.contactName,
        },
        participants: reg.participants.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          role: p.role,
          isNameLocked: p.isNameLocked,
          isPresent: p.isPresent,
          certificateNumber: p.certificateNumber,
        })),
      };
    });

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mencari data pendaftaran.",
    };
  }
}

/**
 * Server Action: Unggah / Unggah Ulang Bukti Transfer di /cek-status
 * Mengubah status PENDING atau REJECTED menjadi WAITING untuk diverifikasi bendahara.
 */
export async function reuploadPaymentProofAction(
  rawInput: ReuploadPaymentProofValues
): Promise<ActionResponse> {
  const parsed = reuploadPaymentProofSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Data bukti transfer yang dikirim tidak valid.",
    };
  }

  const code = parsed.data.registrationCode.toUpperCase();

  try {
    const registration = await prisma.registration.findUnique({
      where: { registrationCode: code },
    });

    if (!registration) {
      return {
        success: false,
        error: "Data pendaftaran tidak ditemukan.",
      };
    }

    if (registration.paymentStatus === PaymentStatus.VERIFIED) {
      return {
        success: false,
        error:
          "Pembayaran Anda sudah terverifikasi (LUNAS), tidak perlu mengunggah ulang bukti transfer.",
      };
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        paymentProofUrl: parsed.data.paymentProofUrl.trim(),
        paymentStatus: PaymentStatus.WAITING,
        rejectionReason: null,
      },
    });

    revalidatePath("/cek-status");
    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");

    return {
      success: true,
      message:
        "Bukti transfer berhasil dikirim! Status pendaftaran Anda kini menunggu verifikasi bendahara.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan bukti transfer.",
    };
  }
}

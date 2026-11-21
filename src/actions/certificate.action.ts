"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  certificateLookupSchema,
  lockParticipantNameSchema,
  type CertificateLookupValues,
  type LockParticipantNameValues,
} from "@/lib/validations";
import { toTitleCase } from "@/lib/utils";
import { sendCertificateEmail } from "@/lib/email";
import type { ActionResponse } from "@/actions/registration.action";

export interface CertificateLookupItem {
  registrationCode: string;
  teamName: string | null;
  institution: string;
  paymentStatus: PaymentStatus;
  competition: {
    name: string;
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
 * Server Action: Cari pendaftaran untuk unduh e-Syahadah di /e-syahadah,
 * hanya berdasarkan Kode Pendaftaran (DM9-XXXX).
 * Mengembalikan satu pendaftaran beserta seluruh pesertanya (individu atau tim).
 */
export async function lookupForCertificateAction(
  rawInput: CertificateLookupValues
): Promise<ActionResponse<CertificateLookupItem>> {
  const parsed = certificateLookupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message || "Kode pendaftaran tidak valid.",
    };
  }

  const registrationCode = parsed.data.registrationCode.toUpperCase();

  try {
    const registration = await prisma.registration.findUnique({
      where: { registrationCode },
      include: {
        competition: {
          select: { name: true },
        },
        participants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!registration) {
      return {
        success: false,
        error:
          "Data pendaftaran tidak ditemukan. Pastikan Kode Pendaftaran (DM9-XXXX) yang dimasukkan sudah benar.",
      };
    }

    return {
      success: true,
      data: {
        registrationCode: registration.registrationCode,
        teamName: registration.teamName,
        institution: registration.institution,
        paymentStatus: registration.paymentStatus,
        competition: {
          name: registration.competition.name,
        },
        participants: registration.participants.map((participant) => ({
          id: participant.id,
          fullName: participant.fullName,
          role: participant.role,
          isNameLocked: participant.isNameLocked,
          isPresent: participant.isPresent,
          certificateNumber: participant.certificateNumber,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mencari data peserta.",
    };
  }
}

/**
 * Server Action: Konfirmasi & Kunci Ejaan Nama Peserta (Self-Service 1x sebelum unduh e-Syahadah)
 */
export async function lockParticipantNameAction(
  rawInput: LockParticipantNameValues
): Promise<ActionResponse<{ fullName: string; isNameLocked: boolean }>> {
  const parsed = lockParticipantNameSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Format ejaan nama peserta tidak valid.",
    };
  }

  const { participantId, registrationCode, fullName } = parsed.data;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        registration: true,
      },
    });

    if (
      !participant ||
      participant.registration.registrationCode.toUpperCase() !==
        registrationCode.toUpperCase()
    ) {
      return {
        success: false,
        error: "Data peserta tidak ditemukan atau kode pendaftaran tidak cocok.",
      };
    }

    if (participant.registration.paymentStatus !== PaymentStatus.VERIFIED) {
      return {
        success: false,
        error:
          "Ejaan nama hanya dapat dikunci setelah pembayaran terverifikasi (LUNAS).",
      };
    }

    if (!participant.isPresent) {
      return {
        success: false,
        error:
          "Ejaan nama baru dapat dikunci setelah kehadiran Anda diverifikasi oleh panitia di Hari-H.",
      };
    }

    if (participant.isNameLocked) {
      return {
        success: false,
        error:
          "Ejaan nama peserta ini sudah dikunci sebelumnya dan tidak dapat diubah kembali.",
      };
    }

    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: {
        fullName: toTitleCase(fullName),
        isNameLocked: true,
      },
    });

    revalidatePath("/e-syahadah");
    revalidatePath("/admin/peserta");

    return {
      success: true,
      message:
        "Ejaan nama berhasil dikunci secara permanen. Anda kini dapat mengunduh PDF e-Syahadah.",
      data: {
        fullName: updated.fullName,
        isNameLocked: updated.isNameLocked,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengunci ejaan nama peserta.",
    };
  }
}

export interface BatchEmailResultSummary {
  processedCount: number;
  sentCount: number;
  failedCount: number;
  remainingEligibleCount: number;
  provider: string;
  errors: string[];
}

/**
 * Server Action (Admin): Mengirim email e-Syahadah secara bertahap (maksimal 25 peserta per batch)
 * hanya untuk peserta yang memenuhi syarat (VERIFIED & isPresent = true & certificateSentAt = null).
 */
export async function sendBatchCertificateEmailsAction(options?: {
  competitionId?: string;
  batchSize?: number;
}): Promise<ActionResponse<BatchEmailResultSummary>> {
  const limit = Math.min(Math.max(options?.batchSize ?? 25, 1), 25);

  try {
    const whereClause = {
      isPresent: true,
      certificateSentAt: null,
      registration: {
        paymentStatus: PaymentStatus.VERIFIED,
        ...(options?.competitionId && options.competitionId !== "ALL"
          ? { competitionId: options.competitionId }
          : {}),
      },
    };

    const totalEligible = await prisma.participant.count({
      where: whereClause,
    });

    if (totalEligible === 0) {
      return {
        success: true,
        message:
          "Tidak ada antrean peserta baru yang belum dikirimi email e-Syahadah.",
        data: {
          processedCount: 0,
          sentCount: 0,
          failedCount: 0,
          remainingEligibleCount: 0,
          provider: "none",
          errors: [],
        },
      };
    }

    const batchParticipants = await prisma.participant.findMany({
      where: whereClause,
      include: {
        registration: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });

    let sentCount = 0;
    let failedCount = 0;
    let lastProvider = "none";
    const errors: string[] = [];

    for (const participant of batchParticipants) {
      // Kunci otomatis nama peserta saat pengiriman sertifikat resmi jika belum dikunci
      const emailResult = await sendCertificateEmail({
        toEmail: participant.registration.leaderEmail,
        participantName: participant.fullName,
        participantId: participant.id,
        role: participant.role,
        competitionName: participant.registration.competition.name,
        institution: participant.registration.institution,
        registrationCode: participant.registration.registrationCode,
        certificateNumber: participant.certificateNumber,
      });

      lastProvider = emailResult.provider;

      if (emailResult.success) {
        sentCount++;
        await prisma.participant.update({
          where: { id: participant.id },
          data: {
            isNameLocked: true,
            certificateSentAt: new Date(),
          },
        });
      } else {
        failedCount++;
        if (emailResult.error && errors.length < 5) {
          errors.push(`${participant.fullName}: ${emailResult.error}`);
        }
      }
    }

    const remainingEligibleCount = Math.max(0, totalEligible - sentCount);

    revalidatePath("/admin/peserta");

    if (sentCount === 0 && failedCount > 0) {
      return {
        success: false,
        error:
          errors[0] ||
          "Gagal mengirim batch email e-Syahadah. Periksa konfigurasi Resend / SMTP di .env.",
        data: {
          processedCount: batchParticipants.length,
          sentCount,
          failedCount,
          remainingEligibleCount,
          provider: lastProvider,
          errors,
        },
      };
    }

    return {
      success: true,
      message: `Berhasil mengirim ${sentCount} dari ${batchParticipants.length} email e-Syahadah pada batch ini.`,
      data: {
        processedCount: batchParticipants.length,
        sentCount,
        failedCount,
        remainingEligibleCount,
        provider: lastProvider,
        errors,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memproses batch email e-Syahadah.",
    };
  }
}

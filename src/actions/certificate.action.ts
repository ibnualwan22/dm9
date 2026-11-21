"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  lockParticipantNameSchema,
  certificateLookupSchema,
  type LockParticipantNameValues,
  type CertificateLookupValues,
} from "@/lib/validations";
import { sendCertificateEmail } from "@/lib/email";
import { toTitleCase } from "@/lib/utils";
import type { ActionResponse } from "@/actions/registration.action";

/**
 * Server Action: Mencari Pendaftaran berdasarkan Kode (DM9-XXXX)
 * untuk halaman Unduh e-Syahadah (/e-syahadah).
 */
export interface CertificateLookupItem {
  id: string;
  registrationCode: string;
  teamName: string | null;
  institution: string;
  paymentStatus: PaymentStatus;
  verifiedAt: string | null;
  createdAt: string;
  competition: {
    name: string;
    slug: string;
    type: "INDIVIDUAL" | "TEAM";
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

export async function lookupForCertificateAction(
  rawInput: CertificateLookupValues
): Promise<ActionResponse<CertificateLookupItem>> {
  const parsed = certificateLookupSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Kode pendaftaran tidak valid. Periksa kembali.",
    };
  }

  const code = parsed.data.registrationCode.toUpperCase();

  const registration = await prisma.registration.findUnique({
    where: { registrationCode: code },
    include: {
      competition: true,
      participants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!registration) {
    return {
      success: false,
      error: `Data pendaftaran dengan kode ${code} tidak ditemukan. Periksa kembali kode Anda.`,
    };
  }

  return {
    success: true,
    data: {
      id: registration.id,
      registrationCode: registration.registrationCode,
      teamName: registration.teamName,
      institution: registration.institution,
      paymentStatus: registration.paymentStatus,
      verifiedAt: registration.verifiedAt
        ? registration.verifiedAt.toISOString()
        : null,
      createdAt: registration.createdAt.toISOString(),
      competition: {
        name: registration.competition.name,
        slug: registration.competition.slug,
        type: registration.competition.type,
      },
      participants: registration.participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
        isNameLocked: p.isNameLocked,
        isPresent: p.isPresent,
        certificateNumber: p.certificateNumber,
      })),
    },
  };
}

/**
 * Server Action: Mengunci Ejaan Nama Peserta untuk e-Syahadah
 * Syarat Mutlak:
 * 1. Pembayaran Pendaftaran Sudah VERIFIED (Lunas)
 * 2. Kehadiran Peserta di Hari-H Sudah Diverifikasi Panitia (isPresent === true)
 * 3. Nama Belum Pernah Dikunci Sebelumnya (isNameLocked === false)
 */
export async function lockParticipantNameAction(
  input: LockParticipantNameValues
): Promise<ActionResponse> {
  const parsed = lockParticipantNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Data penguncian nama tidak valid. Periksa kembali.",
    };
  }

  try {
    const participant = await prisma.participant.findUnique({
      where: { id: parsed.data.participantId },
      include: {
        registration: {
          select: {
            id: true,
            registrationCode: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!participant) {
      return {
        success: false,
        error: "Data peserta tidak ditemukan.",
      };
    }

    // Validasi Integritas Kode Pendaftaran
    if (
      participant.registration.registrationCode !==
      parsed.data.registrationCode.toUpperCase()
    ) {
      return {
        success: false,
        error: "Kode pendaftaran tidak cocok dengan data peserta.",
      };
    }

    // Syarat 1: Pembayaran Sudah Lunas
    if (participant.registration.paymentStatus !== PaymentStatus.VERIFIED) {
      return {
        success: false,
        error:
          "Nama belum bisa dikunci karena pembayaran pendaftaran belum terverifikasi (VERIFIED).",
      };
    }

    // Syarat 2: Sudah Absen Hari-H
    if (!participant.isPresent) {
      return {
        success: false,
        error:
          "Nama belum bisa dikunci karena kehadiran Anda di Hari-H belum diverifikasi panitia.",
      };
    }

    // Syarat 3: Nama Belum Dikunci
    if (participant.isNameLocked) {
      return {
        success: false,
        error: "Nama sudah terkunci sebelumnya dan tidak dapat diubah lagi.",
      };
    }

    await prisma.participant.update({
      where: { id: parsed.data.participantId },
      data: {
        fullName: toTitleCase(parsed.data.fullName),
        isNameLocked: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/peserta");
    revalidatePath("/e-syahadah");

    return {
      success: true,
      message: `Ejaan nama "${toTitleCase(parsed.data.fullName)}" berhasil dikunci. Silakan unduh PDF e-Syahadah Anda.`,
    };
  } catch (error) {
    console.error("Gagal mengunci nama peserta:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat mengunci ejaan nama.",
    };
  }
}

/**
 * Server Action: Mengirim Email e-Syahadah Massal (Admin, maks 25 per batch)
 * Memastikan 3 syarat penerbitan terpenuhi sebelum email dikirim.
 */
export async function sendBatchCertificateEmailsAction(
  participantIds: string[]
): Promise<
  ActionResponse<{ sentCount: number; failedCount: number; errors: string[] }>
> {
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return {
      success: false,
      error: "Tidak ada peserta yang dipilih.",
    };
  }

  if (participantIds.length > 25) {
    return {
      success: false,
      error: "Maksimal 25 peserta per pengiriman untuk menghindari spam.",
    };
  }

  try {
    const eligibleParticipants = await prisma.participant.findMany({
      where: {
        id: { in: participantIds },
        isPresent: true,
        isNameLocked: true,
        registration: { paymentStatus: PaymentStatus.VERIFIED },
      },
      include: {
        registration: {
          include: { competition: true },
        },
      },
    });

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const sentParticipantIds: string[] = [];

    for (const participant of eligibleParticipants) {
      try {
        const result = await sendCertificateEmail({
          toEmail: participant.registration.leaderEmail,
          participantName: participant.fullName,
          participantId: participant.id,
          role: participant.role,
          competitionName: participant.registration.competition.name,
          institution: participant.registration.institution,
          registrationCode: participant.registration.registrationCode,
          certificateNumber: participant.certificateNumber,
        });

        if (result.success) {
          sentCount++;
          sentParticipantIds.push(participant.id);
        } else {
          failedCount++;
          errors.push(
            `${participant.fullName}: ${result.error || "Gagal mengirim email."}`
          );
        }
      } catch (error) {
        failedCount++;
        errors.push(
          `${participant.fullName}: ${error instanceof Error ? error.message : "Gagal mengirim email."}`
        );
      }
    }

    // Update timestamp pengiriman untuk peserta yang berhasil
    if (sentParticipantIds.length > 0) {
      await prisma.participant.updateMany({
        where: { id: { in: sentParticipantIds } },
        data: { certificateSentAt: new Date() },
      });
    }

    const notEligibleCount = participantIds.length - eligibleParticipants.length;

    revalidatePath("/admin/peserta");

    return {
      success: true,
      message: `Berhasil mengirim ${sentCount} email, gagal ${failedCount} email${notEligibleCount > 0 ? `, ${notEligibleCount} peserta tidak memenuhi syarat (belum hadir / nama belum dikunci / belum lunas)` : ""}.`,
      data: { sentCount, failedCount, errors },
    };
  } catch (error) {
    console.error("Gagal mengirim email massal:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem saat mengirim email massal.",
    };
  }
}

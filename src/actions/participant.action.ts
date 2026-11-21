"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import type { ActionResponse } from "@/actions/registration.action";

async function assertAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);
  if (!isValid) {
    throw new Error("Akses ditolak. Silakan login sebagai panitia.");
  }
}

/**
 * Server Action: Toggle Kehadiran Peserta (isPresent) di Hari-H
 */
export async function toggleParticipantPresenceAction(
  participantId: string,
  isPresent: boolean
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    await prisma.participant.update({
      where: { id: participantId },
      data: { isPresent },
    });

    revalidatePath("/admin/peserta");
    revalidatePath("/e-syahadah");

    return {
      success: true,
      message: isPresent
        ? "Peserta ditandai HADIR."
        : "Status kehadiran peserta dibatalkan.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status kehadiran peserta.",
    };
  }
}

/**
 * Server Action: Bulk Update Kehadiran Peserta (Tandai Hadir Semua yang Difilter/Dipilih)
 */
export async function bulkMarkParticipantsPresentAction(
  participantIds: string[],
  isPresent: boolean
): Promise<ActionResponse<{ updatedCount: number }>> {
  try {
    await assertAdminAuthenticated();

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return {
        success: false,
        error: "Tidak ada peserta yang dipilih.",
      };
    }

    const result = await prisma.participant.updateMany({
      where: {
        id: {
          in: participantIds,
        },
      },
      data: {
        isPresent,
      },
    });

    revalidatePath("/admin/peserta");
    revalidatePath("/e-syahadah");

    return {
      success: true,
      message: `${result.count} peserta berhasil ditandai ${
        isPresent ? "HADIR" : "BELUM HADIR"
      }.`,
      data: { updatedCount: result.count },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal melakukan pembaruan kehadiran massal.",
    };
  }
}

/**
 * Server Action: Koreksi Nama & Status Kunci Nama oleh Admin (Override Darurat)
 * Ejaan nama dipertahankan persis sesuai ketikan admin (TANPA Title Case)
 * agar gelar seperti "S.Pd" tidak berubah.
 */
export async function updateParticipantNameByAdminAction(
  participantId: string,
  fullName: string,
  isNameLocked: boolean
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const cleanName = fullName.trim();
    if (cleanName.length < 3) {
      return {
        success: false,
        error: "Nama lengkap peserta minimal 3 karakter.",
      };
    }

    await prisma.participant.update({
      where: { id: participantId },
      data: {
        fullName: cleanName,
        isNameLocked,
      },
    });

    revalidatePath("/admin/peserta");
    revalidatePath("/e-syahadah");

    return {
      success: true,
      message: "Data nama peserta berhasil diperbarui oleh panitia.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui nama peserta.",
    };
  }
}

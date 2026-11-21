"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import {
  competitionUpsertSchema,
  type CompetitionUpsertValues,
} from "@/lib/validations";
import type { ActionResponse } from "@/actions/registration.action";

async function assertAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);
  if (!isValid) {
    throw new Error("Akses ditolak. Silakan login sebagai panitia.");
  }
}

export async function upsertCompetitionAction(
  rawInput: CompetitionUpsertValues
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const parsed = competitionUpsertSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Data cabang lomba tidak lengkap atau tidak valid.",
      };
    }

    const data = parsed.data;
    const normalizedMaxMembers = data.type === "INDIVIDUAL" ? 1 : data.maxMembers;

    if (data.id) {
      await prisma.competition.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          type: data.type,
          quota: data.quota,
          registrationFee: data.registrationFee,
          maxMembers: normalizedMaxMembers,
          sopFileUrl: data.sopFileUrl,
          whatsappGroupUrl: data.whatsappGroupUrl,
          contactPerson: data.contactPerson,
          contactName: data.contactName,
          isActive: data.isActive,
        },
      });
    } else {
      await prisma.competition.create({
        data: {
          name: data.name,
          slug: data.slug,
          type: data.type,
          quota: data.quota,
          registrationFee: data.registrationFee,
          maxMembers: normalizedMaxMembers,
          sopFileUrl: data.sopFileUrl,
          whatsappGroupUrl: data.whatsappGroupUrl,
          contactPerson: data.contactPerson,
          contactName: data.contactName,
          isActive: data.isActive,
        },
      });
    }

    revalidatePath("/");
    revalidatePath(`/lomba/${data.slug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/lomba");

    return {
      success: true,
      message: data.id
        ? "Cabang lomba berhasil diperbarui."
        : "Cabang lomba baru berhasil ditambahkan.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data cabang lomba.",
    };
  }
}

export async function toggleCompetitionActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    await prisma.competition.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/lomba");

    return {
      success: true,
      message: isActive
        ? "Pendaftaran cabang lomba dibuka."
        : "Pendaftaran cabang lomba ditutup sementara.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengubah status cabang lomba.",
    };
  }
}

export async function deleteCompetitionAction(
  id: string
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const regCount = await prisma.registration.count({
      where: { competitionId: id },
    });

    if (regCount > 0) {
      return {
        success: false,
        error: `Cabang lomba tidak dapat dihapus karena sudah memiliki ${regCount} data pendaftaran. Gunakan tombol Nonaktifkan agar pendaftaran ditutup tanpa menghapus riwayat peserta.`,
      };
    }

    await prisma.competition.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/lomba");

    return {
      success: true,
      message: "Cabang lomba berhasil dihapus.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus cabang lomba.",
    };
  }
}

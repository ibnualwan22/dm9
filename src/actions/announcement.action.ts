"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import {
  announcementUpsertSchema,
  type AnnouncementUpsertValues,
} from "@/lib/validations";
import type { ActionResponse } from "@/actions/registration.action";

async function assertAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);
  if (!isValid) {
    throw new Error("Akses ditolak. Silakan login sebagai panitia.");
  }
}

export async function upsertAnnouncementAction(
  rawInput: AnnouncementUpsertValues
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const parsed = announcementUpsertSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Data pengumuman tidak lengkap atau tidak valid.",
      };
    }

    const data = parsed.data;
    const cleanAttachment =
      data.attachmentUrl && data.attachmentUrl.trim() !== ""
        ? data.attachmentUrl.trim()
        : null;

    if (data.id) {
      await prisma.announcement.update({
        where: { id: data.id },
        data: {
          title: data.title,
          slug: data.slug,
          content: data.content,
          isImportant: data.isImportant,
          attachmentUrl: cleanAttachment,
        },
      });
    } else {
      await prisma.announcement.create({
        data: {
          title: data.title,
          slug: data.slug,
          content: data.content,
          isImportant: data.isImportant,
          attachmentUrl: cleanAttachment,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/pengumuman");

    return {
      success: true,
      message: data.id
        ? "Pengumuman berhasil diperbarui."
        : "Pengumuman baru berhasil diterbitkan.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan pengumuman.",
    };
  }
}

export async function deleteAnnouncementAction(
  id: string
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    await prisma.announcement.delete({
      where: { id },
    });

    revalidatePath("/");
    revalidatePath("/admin/pengumuman");

    return {
      success: true,
      message: "Pengumuman berhasil dihapus.",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menghapus pengumuman.",
    };
  }
}

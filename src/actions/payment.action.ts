"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import {
  verifyPaymentActionSchema,
  type VerifyPaymentActionValues,
} from "@/lib/validations";
import type { ActionResponse } from "@/actions/registration.action";

async function assertAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);
  if (!isValid) {
    throw new Error("Sesi panitia telah berakhir. Silakan login kembali.");
  }
}

/**
 * Server Action Bendahara: Setujui (VERIFIED) atau Tolak (REJECTED + Alasan)
 */
export async function verifyPaymentAction(
  rawInput: VerifyPaymentActionValues
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const parsed = verifyPaymentActionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ||
          "Data keputusan verifikasi tidak valid.",
      };
    }

    const { registrationId, decision, verifiedBy, rejectionReason } =
      parsed.data;

    const existing = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!existing) {
      return {
        success: false,
        error: "Data transaksi pendaftaran tidak ditemukan.",
      };
    }

    const isApproved = decision === "VERIFIED";

    await prisma.registration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: isApproved
          ? PaymentStatus.VERIFIED
          : PaymentStatus.REJECTED,
        verifiedBy: verifiedBy.trim(),
        verifiedAt: new Date(),
        rejectionReason: isApproved ? null : rejectionReason?.trim() || null,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");
    revalidatePath("/cek-status");
    revalidatePath("/");

    return {
      success: true,
      message: isApproved
        ? `Pembayaran ${existing.registrationCode} berhasil disetujui (VERIFIED).`
        : `Bukti transfer ${existing.registrationCode} ditolak (REJECTED) beserta catatan perbaikan.`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memproses verifikasi pembayaran.",
    };
  }
}

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
import { notifyRegistrationVerified } from "@/lib/whatsapp-notify";

/**
 * Server Action: Memverifikasi Pembayaran (Meja Bendahara)
 * - decision VERIFIED: status jadi VERIFIED (Lunas) + kirim WA otomatis
 *   berisi link Grup WA cabang lomba (non-blocking, anti-kirim-ganda).
 * - decision REJECTED: status jadi REJECTED + alasan penolakan wajib diisi.
 *   Peserta yang ditolak tidak mendapat WA penolakan — panitia menghubungi
 *   manual, dan peserta mendaftar ulang dari awal dengan bukti yang benar.
 */
export async function verifyPaymentAction(
  input: VerifyPaymentActionValues
): Promise<ActionResponse> {
  const parsed = verifyPaymentActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ||
        "Data verifikasi tidak valid. Periksa kembali.",
    };
  }

  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  const isAuthenticated = await verifyAdminSessionToken(token);
  if (!isAuthenticated) {
    return {
      success: false,
      error: "Akses ditolak. Silakan login ulang sebagai panitia.",
    };
  }

  try {
    // Select eksplisit (tanpa waVerifiedSentAt) agar tetap jalan
    // sebelum kolom baru tersedia di database live.
    const existing = await prisma.registration.findUnique({
      where: { id: parsed.data.registrationId },
      select: {
        id: true,
        registrationCode: true,
        paymentStatus: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Data pendaftaran tidak ditemukan.",
      };
    }

    const isApproved = parsed.data.decision === PaymentStatus.VERIFIED;

    await prisma.registration.update({
      where: { id: parsed.data.registrationId },
      data: {
        paymentStatus: parsed.data.decision,
        verifiedBy: parsed.data.verifiedBy,
        verifiedAt: new Date(),
        rejectionReason: isApproved
          ? null
          : parsed.data.rejectionReason?.trim() || null,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");

    // Kirim WA otomatis setelah VERIFIED (non-blocking).
    let waNote = "";
    if (isApproved) {
      const notify = await notifyRegistrationVerified(
        parsed.data.registrationId
      );
      waNote = notify.sent
        ? " Pesan WA otomatis terkirim ke peserta."
        : ` (Pesan WA otomatis gagal: ${notify.detail || "tidak diketahui"} — verifikasi tetap sah, klik Setujui lagi untuk mengirim ulang.)`;
    }

    return {
      success: true,
      message: isApproved
        ? `Pembayaran ${existing.registrationCode} berhasil disetujui (VERIFIED).${waNote}`
        : `Pembayaran ${existing.registrationCode} ditolak (REJECTED) dengan alasan yang tercatat.`,
    };
  } catch (error) {
    console.error("Gagal verifikasi pembayaran:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem saat menyimpan keputusan verifikasi.",
    };
  }
}

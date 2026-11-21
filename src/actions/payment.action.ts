"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth";
import {
  verifyPaymentActionSchema,
  resendVerificationWhatsAppSchema,
  type VerifyPaymentActionValues,
  type ResendVerificationWhatsAppValues,
} from "@/lib/validations";
import type { ActionResponse } from "@/actions/registration.action";
import { notifyRegistrationVerified } from "@/lib/whatsapp-notify";

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

    // Select eksplisit (tanpa kolom waVerifiedSentAt) agar verifikasi tetap
    // jalan bila kolom baru belum di-push ke database live.
    const existing = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        registrationCode: true,
        paymentStatus: true,
      },
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

    // Bila disetujui, kirim WA otomatis berisi link grup cabang (best-effort,
    // tidak menggagalkan verifikasi). Hasilnya dicatat di pesan sukses admin.
    let waNote = "";
    if (isApproved) {
      const waResult = await notifyRegistrationVerified(registrationId);
      waNote = waResult.skipped
        ? " (WA tidak dikirim: sudah terkirim sebelumnya)"
        : waResult.sent
          ? " Pesan WhatsApp otomatis sudah dikirim ke peserta."
          : ` (WA gagal dikirim: ${waResult.detail ?? "periksa konfigurasi WA"})`;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");
    revalidatePath("/e-syahadah");
    revalidatePath("/");

    return {
      success: true,
      message: isApproved
        ? `Pembayaran ${existing.registrationCode} berhasil disetujui (VERIFIED).${waNote}`
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

/**
 * Server Action Bendahara: Kirim ulang WA "Pembayaran Terverifikasi" untuk
 * pendaftaran yang sudah VERIFIED tapi pesannya belum terkirim (mis. gagal
 * saat verifikasi pertama). Melewati penanda anti-kirim-ganda (force).
 */
export async function resendVerificationWhatsAppAction(
  rawInput: ResendVerificationWhatsAppValues
): Promise<ActionResponse> {
  try {
    await assertAdminAuthenticated();

    const parsed = resendVerificationWhatsAppSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message || "Data kirim ulang WA tidak valid.",
      };
    }

    const { registrationId } = parsed.data;

    const existing = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        registrationCode: true,
        paymentStatus: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: "Data transaksi pendaftaran tidak ditemukan.",
      };
    }

    if (existing.paymentStatus !== PaymentStatus.VERIFIED) {
      return {
        success: false,
        error:
          "Kirim ulang WA hanya untuk pendaftaran yang sudah terverifikasi (VERIFIED).",
      };
    }

    const waResult = await notifyRegistrationVerified(registrationId, {
      force: true,
    });

    revalidatePath("/admin/verifikasi-bayar");
    revalidatePath("/admin/peserta");

    if (!waResult.sent) {
      return {
        success: false,
        error: `WA gagal dikirim: ${waResult.detail ?? "periksa konfigurasi WA"}`,
      };
    }

    return {
      success: true,
      message: `Pesan WhatsApp verifikasi untuk ${existing.registrationCode} berhasil dikirim ulang.`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengirim ulang WA.",
    };
  }
}

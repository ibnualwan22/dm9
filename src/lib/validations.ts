import { z } from "zod";
import { UPLOAD_CONSTRAINTS } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

// ============================================================================
// 1. HELPER VALIDASI NOMOR WHATSAPP & FILE BUKTI TRANSFER
// ============================================================================

export const indonesianPhoneSchema = z
  .string()
  .trim()
  .min(10, "Nomor WhatsApp minimal 10 digit.")
  .max(18, "Nomor WhatsApp maksimal 18 karakter.")
  .transform((val) => normalizePhone(val))
  .refine((val) => /^62[1-9][0-9]{7,12}$/.test(val), {
    message:
      "Format Nomor WhatsApp tidak valid (contoh yang benar: 081234567890 atau +6281234567890).",
  });

export const participantMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Nama lengkap minimal 3 karakter.")
    .max(100, "Nama lengkap maksimal 100 karakter."),
  role: z.enum(["Ketua", "Anggota", "Peserta"]),
});

// ============================================================================
// 2. SKEMA FORM PENDAFTARAN PESERTA (INDIVIDUAL & TEAM)
// ============================================================================

export const registrationFormSchema = z
  .object({
    competitionId: z.string().min(1, "Cabang lomba wajib dipilih."),
    competitionType: z.enum(["INDIVIDUAL", "TEAM"]),
    maxMembers: z.number().int().min(1),
    registrationFee: z.number().int().min(0),
    uniqueCode: z
      .number()
      .int()
      .min(0)
      .max(999, "Kode unik harus berada di rentang 0-999."),

    teamName: z
      .string()
      .trim()
      .max(80, "Nama tim maksimal 80 karakter.")
      .optional()
      .or(z.literal("")),

    institution: z
      .string()
      .trim()
      .min(3, "Asal instansi / pesantren / sekolah minimal 3 karakter.")
      .max(120, "Nama instansi maksimal 120 karakter."),

    leaderEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Alamat email tidak valid."),

    leaderPhone: indonesianPhoneSchema,

    participants: z
      .array(participantMemberSchema)
      .min(1, "Minimal harus ada 1 peserta terdaftar."),

    paymentProofUrl: z
      .string()
      .trim()
      .url("URL bukti transfer tidak valid.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // 1. Validasi Lomba Beregu (TEAM) vs Individu (INDIVIDUAL)
    if (data.competitionType === "TEAM") {
      if (!data.teamName || data.teamName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamName"],
          message: "Nama tim wajib diisi untuk cabang lomba beregu (minimal 2 karakter).",
        });
      }

      if (data.participants.length > data.maxMembers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["participants"],
          message: `Jumlah anggota melebihi batas maksimal (${data.maxMembers} orang).`,
        });
      }
    } else {
      // INDIVIDUAL wajib tepat 1 peserta
      if (data.participants.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["participants"],
          message: "Cabang lomba individu hanya boleh terdiri dari 1 peserta.",
        });
      }
    }

    // 2. Validasi Pembayaran & Bukti Transfer (wajib diunggah saat daftar,
    //    kecuali lomba gratis — opsi Bayar Nanti / Kunci Kuota sudah dihapus).
    const isFreeCompetition = data.registrationFee === 0;

    if (!isFreeCompetition) {
      if (!data.paymentProofUrl || data.paymentProofUrl.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentProofUrl"],
          message: "Silakan unggah bukti transfer terlebih dahulu.",
        });
      }
    }
  });

export type RegistrationFormValues = z.infer<typeof registrationFormSchema>;

// ============================================================================
// 3. SKEMA HALAMAN UNDUH E-SYAHADAH (/e-syahadah)
// ============================================================================

export const certificateLookupSchema = z.object({
  registrationCode: z
    .string()
    .trim()
    .regex(
      /^DM9-[A-Z0-9]{4}$/i,
      "Format kode pendaftaran tidak valid (contoh: DM9-XXXX)."
    ),
});

export type CertificateLookupValues = z.infer<typeof certificateLookupSchema>;

export const lockParticipantNameSchema = z.object({
  participantId: z.string().min(1, "ID Peserta tidak valid."),
  registrationCode: z
    .string()
    .trim()
    .regex(/^DM9-[A-Z0-9]{4}$/i, "Kode pendaftaran tidak valid."),
  fullName: z
    .string()
    .trim()
    .min(3, "Ejaan nama lengkap minimal 3 karakter.")
    .max(100, "Ejaan nama lengkap maksimal 100 karakter."),
});

export type LockParticipantNameValues = z.infer<
  typeof lockParticipantNameSchema
>;

// ============================================================================
// 4. SKEMA VALIDASI CLIENT-SIDE FILE UPLOAD HELPER
// ============================================================================

export function validateClientSideFile(file: File | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "File belum dipilih." };
  }

  const allowedTypes: readonly string[] = UPLOAD_CONSTRAINTS.allowedMimeTypes;
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Format file harus berupa JPG, PNG, WEBP, atau PDF.",
    };
  }

  if (file.size > UPLOAD_CONSTRAINTS.maxFileSizeBytes) {
    return {
      valid: false,
      error: `Ukuran file maksimal ${UPLOAD_CONSTRAINTS.maxFileSizeLabel}.`,
    };
  }

  return { valid: true };
}

// ============================================================================
// 5. SKEMA DASHBOARD ADMIN & MEJA KERJA BENDAHARA
// ============================================================================

export const verifyPaymentActionSchema = z
  .object({
    registrationId: z.string().min(1, "ID Pendaftaran wajib diisi."),
    decision: z.enum(["VERIFIED", "REJECTED"]),
    verifiedBy: z
      .string()
      .trim()
      .min(2, "Nama verifikator minimal 2 karakter.")
      .default("Bendahara Panitia"),
    rejectionReason: z
      .string()
      .trim()
      .max(500, "Alasan penolakan maksimal 500 karakter.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "REJECTED") {
      if (!data.rejectionReason || data.rejectionReason.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rejectionReason"],
          message:
            "Alasan penolakan wajib diisi (minimal 5 karakter) agar peserta tahu apa yang harus diperbaiki.",
        });
      }
    }
  });

export type VerifyPaymentActionValues = z.infer<
  typeof verifyPaymentActionSchema
>;

export const competitionUpsertSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(3, "Nama cabang lomba minimal 3 karakter.")
    .max(100, "Nama cabang lomba maksimal 100 karakter."),
  slug: z
    .string()
    .trim()
    .min(3, "Slug minimal 3 karakter.")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)."
    ),
  type: z.enum(["INDIVIDUAL", "TEAM"]),
  quota: z.coerce
    .number()
    .int()
    .min(1, "Kuota minimal 1 slot.")
    .max(10000, "Kuota maksimal 10.000 slot."),
  registrationFee: z.coerce
    .number()
    .int()
    .min(0, "Biaya pendaftaran tidak boleh negatif."),
  maxMembers: z.coerce
    .number()
    .int()
    .min(1, "Jumlah maksimal anggota minimal 1 orang.")
    .max(30, "Jumlah maksimal anggota 30 orang."),
  sopFileUrl: z
    .string()
    .trim()
    .url("Link PDF SOP / Juknis harus berupa URL yang valid."),
  whatsappGroupUrl: z
    .string()
    .trim()
    .url("Link Grup WhatsApp harus berupa URL yang valid."),
  contactPerson: indonesianPhoneSchema,
  contactName: z
    .string()
    .trim()
    .min(2, "Nama Contact Person minimal 2 karakter.")
    .max(60, "Nama Contact Person maksimal 60 karakter."),
  isActive: z.boolean().default(true),
});

export type CompetitionUpsertValues = z.infer<typeof competitionUpsertSchema>;

export const announcementUpsertSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(5, "Judul pengumuman minimal 5 karakter.")
    .max(150, "Judul pengumuman maksimal 150 karakter."),
  slug: z
    .string()
    .trim()
    .min(3, "Slug minimal 3 karakter.")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)."
    ),
  content: z
    .string()
    .trim()
    .min(10, "Isi pengumuman minimal 10 karakter."),
  isImportant: z.boolean().default(false),
  attachmentUrl: z
    .string()
    .trim()
    .url("Link lampiran harus berupa URL yang valid.")
    .optional()
    .or(z.literal("")),
});

export type AnnouncementUpsertValues = z.infer<typeof announcementUpsertSchema>;

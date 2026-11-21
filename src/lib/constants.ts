export const EVENT_CONFIG = {
  name: "Dies Miladis ke-9",
  tagline: "Memperkokoh Tradisi Ilmiah, Merajut Ukhuwah & Prestasi",
  year: 2026,
  certificateRomanEdition: "DM-IX",
  deadlineISO:
    process.env.NEXT_PUBLIC_EVENT_DEADLINE || "2026-12-20T23:59:59+07:00",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export const BANK_CONFIG = {
  bankName:
    process.env.NEXT_PUBLIC_BANK_NAME || "Bank Syariah Indonesia (BSI)",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "7234567898",
  accountHolder:
    process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ||
    "Panitia Dies Miladis Ke-9",
} as const;

export const UPLOAD_CONSTRAINTS = {
  maxFileSizeBytes: 2 * 1024 * 1024, // 2 MB
  maxFileSizeLabel: "2 MB",
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ] as const,
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"] as const,
} as const;

export const PARTICIPANT_ROLES = {
  LEADER: "Ketua",
  MEMBER: "Anggota",
  INDIVIDUAL: "Peserta",
} as const;

export type ParticipantRole =
  (typeof PARTICIPANT_ROLES)[keyof typeof PARTICIPANT_ROLES];


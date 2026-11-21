import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka ke mata uang Rupiah (contoh: Rp 75.342)
 */
export function formatRupiah(amount: number): string {
  if (amount === 0) return "Gratis";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Memisahkan nominal tagihan menjadi prefix utama dan 3 digit kode unik terakhir
 * untuk ditampilkan secara mencolok di Form Pendaftaran & Meja Kerja Bendahara.
 * Contoh: 75342 -> { prefix: "Rp 75.", uniqueDigits: "342" }
 */
export function splitPaymentAmountDisplay(amount: number): {
  prefix: string;
  uniqueDigits: string;
  isFree: boolean;
} {
  if (amount <= 0) {
    return { prefix: "Rp 0", uniqueDigits: "", isFree: true };
  }

  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  if (formatted.length <= 3) {
    return {
      prefix: "Rp ",
      uniqueDigits: formatted,
      isFree: false,
    };
  }

  return {
    prefix: `Rp ${formatted.slice(0, -3)}`,
    uniqueDigits: formatted.slice(-3),
    isFree: false,
  };
}

/**
 * Format tanggal ke Bahasa Indonesia lengkap
 */
export function formatDateID(
  dateInput: Date | string | null | undefined,
  includeTime = false
): string {
  if (typeof dateInput === "string") {
    // handled below
  }
  if (!dateInput) return "-";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
    ...(includeTime
      ? {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }
      : {}),
  }).format(date);
}

/**
 * Normalisasi nomor WhatsApp ke format internasional "628xxxxxxxxxx"
 * (tanpa tanda +) agar bisa langsung dipakai gateway WA otomatis.
 * Menerima input seperti "+62 812-3456-7890", "6281234567890", "081234567890".
 */
export function normalizePhone(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.startsWith("62")) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith("0")) {
    return `62${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith("8")) {
    return `62${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Mengubah nomor telepon "08xxx" menjadi format internasional "628xxx" untuk link wa.me
 */
export function toWhatsappInternational(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("0")) {
    return `62${normalized.slice(1)}`;
  }
  return normalized;
}

/**
 * Membuat URL Chat WhatsApp Contact Person dengan pesan pre-filled
 */
export function buildContactWhatsappUrl(
  contactPhone: string,
  contactName: string,
  competitionName: string
): string {
  const waNumber = toWhatsappInternational(contactPhone);
  const message = `Assalamu'alaikum Kak ${contactName}, saya ingin bertanya terkait perlombaan *${competitionName}* pada acara Dies Miladis ke-9.`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Mengubah teks menjadi Title Case (huruf besar di awal tiap kata).
 * Dipakai untuk nama peserta & nama tim agar tersimpan rapi di database
 * dan tampil rapi di pesan WA otomatis.
 * Contoh: "muhammad ali" -> "Muhammad Ali"; "tim al-ghazali" -> "Tim Al-Ghazali".
 * Nama instansi TIDAK ikut diubah (singkatan seperti "PP." harus dipertahankan).
 */
export function toTitleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s-])([a-z])/g,
      (_match: string, prefix: string, letter: string) =>
        `${prefix}${letter.toUpperCase()}`
    );
}

/**
 * Generator Kode Pendaftaran Unik: DM9-[4 Karakter Alfanumerik Acak]
 * Menghindari karakter ambigu seperti 0, O, 1, I, L
 */
export function generateRegistrationCode(): string {
  const charset = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    suffix += charset[randomIndex];
  }
  return `DM9-${suffix}`;
}

/**
 * Generator Kode Unik Pembayaran 3 Digit (101 - 999)
 */
export function generateUniquePaymentCode(): number {
  return Math.floor(Math.random() * (999 - 101 + 1)) + 101;
}

/**
 * Membuat slug URL-friendly dari judul
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

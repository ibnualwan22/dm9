import crypto from "crypto";
import { UPLOAD_CONSTRAINTS } from "@/lib/constants";

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

type AllowedMimeType = (typeof UPLOAD_CONSTRAINTS.allowedMimeTypes)[number];

/**
 * Verifikasi magic bytes (file signature) untuk mencegah spoofing ekstensi file.
 * Mendukung:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WEBP: "RIFF" .... "WEBP"
 * - PDF: "%PDF-" (25 50 44 46 2D)
 */
export function detectMimeTypeFromBuffer(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP ("RIFF" di byte 0..3 dan "WEBP" di byte 8..11)
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // PDF ("%PDF-")
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }

  return null;
}

/**
 * Validasi ketat objek File (format JPG/PNG/WEBP/PDF & ukuran <= 2MB)
 */
export async function validatePaymentProofFile(file: File): Promise<{
  buffer: Buffer;
  detectedMime: AllowedMimeType;
}> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new UploadValidationError("File bukti transfer tidak ditemukan.");
  }

  if (file.size <= 0) {
    throw new UploadValidationError("File bukti transfer kosong.");
  }

  if (file.size > UPLOAD_CONSTRAINTS.maxFileSizeBytes) {
    throw new UploadValidationError(
      `Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimal ${UPLOAD_CONSTRAINTS.maxFileSizeLabel}.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detectedMime = detectMimeTypeFromBuffer(buffer);

  if (!detectedMime) {
    throw new UploadValidationError(
      "Format file tidak didukung atau file rusak. Gunakan format JPG, PNG, WEBP, atau PDF."
    );
  }

  return { buffer, detectedMime };
}

/**
 * Membuat signature SHA-1 resmi sesuai spesifikasi Cloudinary Signed Upload API
 */
function signCloudinaryParams(
  paramsToSign: Record<string, string | number>,
  apiSecret: string
): string {
  const sortedQuery = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${sortedQuery}${apiSecret}`)
    .digest("hex");
}

/**
 * Upload file bukti transfer ke Cloudinary menggunakan Signed REST API.
 * Menerima File dari FormData (Server Action atau Route Handler).
 */
export async function uploadPaymentProofToCloudinary(
  file: File,
  options?: {
    registrationCodeHint?: string;
  }
): Promise<UploadResult> {
  const { buffer, detectedMime } = await validatePaymentProofFile(file);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder =
    process.env.CLOUDINARY_FOLDER?.trim() || "dies-miladis-9/bukti-transfer";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Konfigurasi Cloudinary belum lengkap. Pastikan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET sudah diatur di file .env."
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const safePrefix = (options?.registrationCodeHint || "proof")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const publicId = `${safePrefix}-${timestamp}-${randomSuffix}`;

  const paramsToSign: Record<string, string | number> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = signCloudinaryParams(paramsToSign, apiSecret);

  // Gunakan Data URI agar kompatibel untuk gambar maupun PDF pada endpoint /auto/upload
  const base64DataUri = `data:${detectedMime};base64,${buffer.toString("base64")}`;

  const cloudinaryForm = new FormData();
  cloudinaryForm.append("file", base64DataUri);
  cloudinaryForm.append("api_key", apiKey);
  cloudinaryForm.append("timestamp", String(timestamp));
  cloudinaryForm.append("folder", folder);
  cloudinaryForm.append("public_id", publicId);
  cloudinaryForm.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`;

  const response = await fetch(endpoint, {
    method: "POST",
    body: cloudinaryForm,
  });

  if (!response.ok) {
    let errorDetail = "Gagal mengunggah bukti transfer ke Cloudinary.";
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string };
      };
      if (errJson?.error?.message) {
        errorDetail = `Cloudinary Error: ${errJson.error.message}`;
      }
    } catch {
      // Abaikan error parsing JSON
    }
    throw new Error(errorDetail);
  }

  const data = (await response.json()) as {
    secure_url: string;
    public_id: string;
    format?: string;
    bytes: number;
  };

  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format || detectedMime.split("/")[1] || "file",
    bytes: data.bytes,
  };
}


import nodemailer from "nodemailer";
import { EVENT_CONFIG } from "@/lib/constants";

export interface CertificateEmailPayload {
  toEmail: string;
  participantName: string;
  participantId: string;
  role: string;
  competitionName: string;
  institution: string;
  registrationCode: string;
  certificateNumber: string | null;
}

export interface SendEmailResult {
  success: boolean;
  provider: "resend" | "smtp" | "simulated";
  error?: string;
}

function buildCertificateEmailHtml(payload: CertificateEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = EVENT_CONFIG.appUrl.replace(/\/+$/, "");
  const directDownloadUrl = `${baseUrl}/api/syahadah/${encodeURIComponent(payload.participantId)}`;
  const verificationUrl = `${baseUrl}/verifikasi/${encodeURIComponent(payload.participantId)}`;
  const portalUrl = `${baseUrl}/e-syahadah?q=${encodeURIComponent(payload.registrationCode)}`;

  const subject = `e-Syahadah Resmi ${EVENT_CONFIG.name} — ${payload.participantName}`;

  const text = [
    `Assalamu'alaikum Warahmatullahi Wabarakatuh,`,
    ``,
    `Yth. ${payload.participantName} (${payload.institution}),`,
    `Terima kasih atas partisipasi dan dedikasi Anda sebagai ${payload.role} pada cabang perlombaan "${payload.competitionName}" dalam rangkaian acara ${EVENT_CONFIG.name}.`,
    ``,
    `e-Syahadah (Sertifikat Resmi) Anda telah siap diunduh:`,
    `- Unduh PDF e-Syahadah: ${directDownloadUrl}`,
    `- Halaman Validasi Keaslian: ${verificationUrl}`,
    `- Halaman Unduh e-Syahadah (${payload.registrationCode}): ${portalUrl}`,
    ``,
    `Wassalamu'alaikum Warahmatullahi Wabarakatuh,`,
    `Panitia Pelaksana ${EVENT_CONFIG.name}`,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px;background-color:#FAF8F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181B;">
  <div style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E5E4DF;border-radius:12px;overflow:hidden;">
    <div style="background-color:#065F46;padding:24px;color:#FFFFFF;">
      <p style="margin:0;font-size:12px;letter-spacing:0.04em;opacity:0.9;">PANITIA PELAKSANA ${EVENT_CONFIG.name.toUpperCase()}</p>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;">Apresiasi &amp; Penerbitan e-Syahadah Resmi</h1>
    </div>
    <div style="padding:24px;line-height:1.6;font-size:14px;color:#27272A;">
      <p style="margin-top:0;">Assalamu'alaikum Warahmatullahi Wabarakatuh,</p>
      <p>Yth. <strong>${payload.participantName}</strong> dari <strong>${payload.institution}</strong>,</p>
      <p>Panitia Pelaksana <strong>${EVENT_CONFIG.name}</strong> menyampaikan apresiasi setinggi-tingginya atas partisipasi Anda sebagai <strong>${payload.role}</strong> pada cabang lomba <strong>${payload.competitionName}</strong>.</p>
      
      <div style="margin:20px 0;padding:16px;background-color:#FAF8F5;border:1px solid #E5E4DF;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:12px;color:#71717A;">Rincian Dokumen Sertifikat:</p>
        <p style="margin:0 0 4px;"><strong>Nama Tercetak:</strong> ${payload.participantName}</p>
        <p style="margin:0 0 4px;"><strong>Cabang Lomba:</strong> ${payload.competitionName}</p>
        <p style="margin:0;"><strong>Kode Pendaftaran:</strong> <span style="font-family:monospace;">${payload.registrationCode}</span></p>
      </div>

      <p style="margin:24px 0;">
        <a href="${directDownloadUrl}" style="display:inline-block;background-color:#065F46;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;">
          Unduh PDF e-Syahadah Sekarang
        </a>
      </p>

      <p style="font-size:13px;color:#52525B;">
        Jika tombol di atas tidak berfungsi, salin tautan berikut ke peramban Anda:<br />
        <a href="${directDownloadUrl}" style="color:#065F46;word-break:break-all;">${directDownloadUrl}</a>
      </p>

      <hr style="border:none;border-top:1px solid #E5E4DF;margin:24px 0;" />
      <p style="margin:0;font-size:12px;color:#71717A;">
        Keaslian e-Syahadah dapat diverifikasi publik melalui QR Code atau tautan: <a href="${verificationUrl}" style="color:#065F46;">${verificationUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();

  return { subject, html, text };
}

/**
 * Mengirim email e-Syahadah menggunakan Resend HTTP API (prioritas pertama)
 * atau Nodemailer SMTP (prioritas kedua).
 */
export async function sendCertificateEmail(
  payload: CertificateEmailPayload
): Promise<SendEmailResult> {
  const { subject, html, text } = buildCertificateEmailHtml(payload);
  const fromAddress =
    process.env.EMAIL_FROM?.trim() ||
    "Panitia Dies Miladis ke-9 <noreply@diesmiladis.id>";

  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  // 1. Gunakan Resend jika RESEND_API_KEY tersedia
  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [payload.toEmail],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          provider: "resend",
          error: `Resend API Error (${response.status}): ${errText}`,
        };
      }

      return { success: true, provider: "resend" };
    } catch (error) {
      return {
        success: false,
        provider: "resend",
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghubungi Resend API.",
      };
    }
  }

  // 2. Gunakan SMTP Nodemailer jika dikonfigurasi
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();

  if (smtpHost && smtpUser && smtpPass && smtpPass !== "your_app_password") {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: payload.toEmail,
        subject,
        text,
        html,
      });

      return { success: true, provider: "smtp" };
    } catch (error) {
      return {
        success: false,
        provider: "smtp",
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengirim email via SMTP.",
      };
    }
  }

  return {
    success: false,
    provider: "simulated",
    error:
      "Konfigurasi email (RESEND_API_KEY atau SMTP_HOST/SMTP_USER/SMTP_PASS) belum diatur di file .env.",
  };
}

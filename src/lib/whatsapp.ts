/**
 * WhatsApp via relay SIAKAD (VPS) — panggilan langsung dari Vercel ke
 * gateway wa-multi diblokir Cloudflare ("Just a moment...", 403 HTML),
 * jadi DM9 memanggil relay di Siakad yang meneruskan ke gateway
 * wa-multi Amtsilati Pusat (sesi 2, sama seperti SIAKAD).
 *
 * Endpoint: POST {SIAKAD_RELAY_URL} (default
 * https://siakad.markazarabiyah.site/api/relay/dm9-whatsapp)
 * Header: Authorization: Bearer {SIAKAD_RELAY_SECRET}
 * Body: { to: "628xxxxxxxxxx", message: "..." }
 *
 * Konfigurasi (di Vercel project dm9, Environment Variables):
 * - SIAKAD_RELAY_URL: alamat relay (opsional, ada default di bawah)
 * - SIAKAD_RELAY_SECRET: kunci relay (nilai sama seperti DM9_RELAY_SECRET
 *   di .env SIAKAD)
 * Nilai kredensial TIDAK PERNAH ditulis di kode / chat.
 */

const RELAY_URL =
  process.env.SIAKAD_RELAY_URL ||
  "https://siakad.markazarabiyah.site/api/relay/dm9-whatsapp";

/** Samarkan nomor di log (62***789) — log tidak boleh memuat nomor utuh. */
function maskPhone(phone: string): string {
  if (phone.length <= 7) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

export async function sendWhatsAppMessage(
  target: string,
  message: string
): Promise<{ success: boolean; detail?: string }> {
  const relaySecret = process.env.SIAKAD_RELAY_SECRET;

  if (!relaySecret) {
    console.warn("[whatsapp] SIAKAD_RELAY_SECRET belum dikonfigurasi");
    return { success: false, detail: "SIAKAD_RELAY_SECRET belum dikonfigurasi" };
  }

  const to = target.trim();
  if (!to) {
    console.warn("[whatsapp] nomor tujuan kosong");
    return { success: false, detail: "Nomor tujuan kosong" };
  }

  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${relaySecret}`,
      },
      body: JSON.stringify({ to, message }),
    });

    // Baca body mentah dulu: relay mengembalikan JSON { success, detail },
    // tapi bila relay/gateway bermasalah, isi body-lah yang menjelaskan.
    // Kunci relay TIDAK PERNAH ditulis ke log.
    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      data = {};
    }

    const logContext = {
      via: "siakad-relay",
      to: maskPhone(to),
      status: res.status,
    };

    if (res.ok && data.success === true) {
      console.log("[whatsapp] terkirim", logContext);
      return { success: true, detail: "Pesan terkirim" };
    }

    console.error("[whatsapp] gagal", {
      ...logContext,
      body: rawText.slice(0, 500),
    });

    return {
      success: false,
      detail:
        (typeof data.detail === "string" && data.detail) ||
        (typeof data.message === "string" && data.message) ||
        (typeof data.error === "string" && data.error) ||
        `HTTP Error ${res.status}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Network error";
    console.error("[whatsapp] network error", {
      via: "siakad-relay",
      to: maskPhone(to),
      error: errorMessage,
    });
    return {
      success: false,
      detail: errorMessage,
    };
  }
}

export interface VerificationMessageData {
  competitionType: "INDIVIDUAL" | "TEAM";
  teamName: string | null;
  leaderName: string;
  /** Nama seluruh peserta (urutan: Ketua dulu untuk tim, lalu Anggota). */
  memberNames: string[];
  institution: string;
  competitionName: string;
  registrationCode: string;
  whatsappGroupUrl: string;
}

/**
 * Format pesan otomatis "Pembayaran Terverifikasi" beserta tautan Grup WA
 * cabang lomba. Draf disetujui panitia 21 Nov 2026.
 */
export function formatVerificationMessage(
  data: VerificationMessageData
): string {
  const lines: string[] = [];
  const isTeam = data.competitionType === "TEAM";
  const greetName = isTeam
    ? data.leaderName
    : data.memberNames[0] || data.leaderName;

  lines.push(`Assalamu'alaikum Kak ${greetName},`);
  lines.push("");
  lines.push(
    `Alhamdulillah, pembayaran pendaftaran ${isTeam ? "tim Anda" : "Anda"} untuk *Dies Miladis ke-9 Markaz Arabiyah* sudah *TERVERIFIKASI* ✅`
  );
  lines.push("");
  lines.push("*Detail Pendaftaran*");

  if (isTeam) {
    lines.push(`• Nama Tim: ${data.teamName || "-"}`);
    lines.push(`• Ketua: ${data.leaderName}`);
    if (data.memberNames.length > 1) {
      lines.push("• Anggota:");
      data.memberNames.slice(1).forEach((name, index) => {
        lines.push(`  ${index + 1}. ${name}`);
      });
    }
  } else {
    lines.push(`• Nama Peserta: ${data.memberNames[0] || data.leaderName}`);
  }

  lines.push(`• Asal Instansi: ${data.institution}`);
  lines.push(`• Cabang Lomba: ${data.competitionName}`);
  lines.push(`• Kode Pendaftaran: *${data.registrationCode}*`);
  lines.push("");

  if (data.whatsappGroupUrl.trim() !== "") {
    lines.push("Silakan bergabung ke Grup WhatsApp resmi cabang lomba:");
    lines.push(data.whatsappGroupUrl.trim());
    lines.push("");
  }

  lines.push(
    "Mohon simpan kode pendaftaran Anda untuk keperluan selanjutnya." +
      (isTeam ? " Seluruh anggota tim bergabung melalui satu grup ini." : "")
  );
  lines.push("");
  lines.push("Jazakumullahu khoiron,");
  lines.push("Panitia Dies Miladis ke-9 Markaz Arabiyah");

  return lines.join("\n");
}

/**
 * WhatsApp Gateway — wa-multi Amtsilati Pusat (sesi 2, sama seperti SIAKAD).
 *
 * Endpoint: POST https://wa-multi-session.amtsilatipusat.com/api/v1/sessions/{sessionId}/send
 * Header: X-API-Key: {WA_API_KEY}
 * Body: { to: "628xxxxxxxxxx", message: "..." }
 *
 * Konfigurasi (di Vercel project dm9, Environment Variables):
 * - WA_API_KEY: kunci API gateway (nilai sama seperti .env SIAKAD)
 * - WA_SESSION_ID2: id sesi 2 (nilai sama seperti .env SIAKAD)
 * Nilai kredensial TIDAK PERNAH ditulis di kode / chat.
 */

const WA_API_URL = "https://wa-multi-session.amtsilatipusat.com/api/v1";

export async function sendWhatsAppMessage(
  target: string,
  message: string
): Promise<{ success: boolean; detail?: string }> {
  const apiKey = process.env.WA_API_KEY;
  const sessionId =
    process.env.WA_SESSION_ID2 || process.env.WA_SESSION_ID || "default";

  if (!apiKey) {
    return { success: false, detail: "WA_API_KEY belum dikonfigurasi" };
  }

  const to = target.trim();
  if (!to) {
    return { success: false, detail: "Nomor tujuan kosong" };
  }

  try {
    const res = await fetch(`${WA_API_URL}/sessions/${sessionId}/send`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { success: true, detail: "Pesan terkirim" };
    }

    return {
      success: false,
      detail: data.message || data.error || `HTTP Error ${res.status}`,
    };
  } catch (error) {
    return {
      success: false,
      detail: error instanceof Error ? error.message : "Network error",
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

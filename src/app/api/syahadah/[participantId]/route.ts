import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { PaymentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { EVENT_CONFIG } from "@/lib/constants";
import { formatDateID } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mengalokasikan nomor urut e-Syahadah secara idempoten dan bebas duplikasi.
 * Format: NO. 0001/SYH/DM-IX/2026
 */
async function ensureCertificateNumber(
  participantId: string,
  existingNumber: string | null
): Promise<string> {
  if (existingNumber) {
    return existingNumber;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const current = await prisma.participant.findUnique({
      where: { id: participantId },
      select: { certificateNumber: true },
    });

    if (current?.certificateNumber) {
      return current.certificateNumber;
    }

    const issuedCount = await prisma.participant.count({
      where: {
        certificateNumber: {
          not: null,
        },
      },
    });

    const sequence = issuedCount + 1 + attempt;
    const paddedSeq = String(sequence).padStart(4, "0");
    const candidateNumber = `NO. ${paddedSeq}/SYH/${EVENT_CONFIG.certificateRomanEdition}/${EVENT_CONFIG.year}`;

    try {
      const updated = await prisma.participant.update({
        where: { id: participantId },
        data: { certificateNumber: candidateNumber },
        select: { certificateNumber: true },
      });

      if (updated.certificateNumber) {
        return updated.certificateNumber;
      }
    } catch {
      // Jika terjadi bentrok @unique karena request paralel, ulangi loop dengan sequence berikutnya
    }
  }

  // Fallback unik berbasis ID peserta
  const fallback = `NO. ${participantId.slice(-4).toUpperCase()}/SYH/${EVENT_CONFIG.certificateRomanEdition}/${EVENT_CONFIG.year}`;
  await prisma.participant.update({
    where: { id: participantId },
    data: { certificateNumber: fallback },
  });
  return fallback;
}

export async function GET(
  _request: Request,
  context: { params: { participantId: string } }
) {
  const { participantId } = context.params;

  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        registration: {
          include: {
            competition: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: "Data peserta tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // Validasi 3 Syarat Mutlak Penerbitan e-Syahadah:
    // 1. Pembayaran VERIFIED (Lunas)
    if (participant.registration.paymentStatus !== PaymentStatus.VERIFIED) {
      return NextResponse.json(
        {
          success: false,
          error:
            "e-Syahadah belum dapat diterbitkan karena status pembayaran belum terverifikasi (VERIFIED).",
        },
        { status: 403 }
      );
    }

    // 2. Kehadiran Hari-H (isPresent === true)
    if (!participant.isPresent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "e-Syahadah belum dapat diterbitkan karena kehadiran peserta di Hari-H belum diverifikasi panitia.",
        },
        { status: 403 }
      );
    }

    // 3. Ejaan Nama Terkunci (isNameLocked === true)
    if (!participant.isNameLocked) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Silakan konfirmasi dan kunci ejaan nama Anda terlebih dahulu melalui halaman /e-syahadah sebelum mengunduh e-Syahadah.",
        },
        { status: 403 }
      );
    }

    // Pastikan nomor sertifikat sudah dialokasikan
    const certificateNumber = await ensureCertificateNumber(
      participant.id,
      participant.certificateNumber
    );

    // Cek apakah terdapat file template PDF kustom di public/templates/syahadah-template.pdf
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "syahadah-template.pdf"
    );

    let pdfDoc: PDFDocument;
    let hasCustomTemplate = false;

    try {
      const templateBytes = await fs.readFile(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
      hasCustomTemplate = pdfDoc.getPageCount() > 0;
    } catch {
      pdfDoc = await PDFDocument.create();
    }

    // Ukuran A4 Landscape: 841.89 x 595.28 pt
    const page = hasCustomTemplate
      ? pdfDoc.getPages()[0]
      : pdfDoc.addPage([841.89, 595.28]);

    const { width, height } = page.getSize();

    const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const fontSerifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

    const colorEmerald = rgb(0.024, 0.373, 0.275); // #065F46
    const colorGold = rgb(0.75, 0.52, 0.08); // Warm Gold/Amber
    const colorInk = rgb(0.094, 0.094, 0.106); // #18181B
    const colorMuted = rgb(0.38, 0.38, 0.42);
    const colorCanvas = rgb(0.98, 0.973, 0.961); // #FAF8F5

    // Helper untuk menggambar teks rata tengah secara presisi
    const drawCenteredText = (
      text: string,
      y: number,
      font: typeof fontSansBold,
      size: number,
      color = colorInk
    ) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    };

    // Jika tidak menggunakan template PDF eksternal, gambar kanvas & bingkai institusional
    if (!hasCustomTemplate) {
      // Latar belakang Warm Ivory
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: colorCanvas,
      });

      // Bingkai Luar Deep Emerald
      page.drawRectangle({
        x: 24,
        y: 24,
        width: width - 48,
        height: height - 48,
        borderColor: colorEmerald,
        borderWidth: 3,
      });

      // Bingkai Dalam Warm Gold
      page.drawRectangle({
        x: 32,
        y: 32,
        width: width - 64,
        height: height - 64,
        borderColor: colorGold,
        borderWidth: 1.2,
      });

      // Header Aksen Atas
      page.drawRectangle({
        x: 32,
        y: height - 44,
        width: width - 64,
        height: 12,
        color: colorEmerald,
      });

      // Header Institusional
      drawCenteredText(
        `PANITIA PELAKSANA ${EVENT_CONFIG.name.toUpperCase()}`,
        height - 82,
        fontSansBold,
        12,
        colorEmerald
      );

      drawCenteredText(
        EVENT_CONFIG.tagline,
        height - 100,
        fontSerifRegular,
        11,
        colorMuted
      );

      // Judul Utama Sertifikat
      drawCenteredText(
        "SYAHADAH PENGHARGAAN",
        height - 148,
        fontSerifBold,
        30,
        colorEmerald
      );
    }

    // Nomor Sertifikat Resmi
    drawCenteredText(
      certificateNumber,
      height - 174,
      fontMono,
      11,
      colorGold
    );

    drawCenteredText(
      "Diberikan dengan penuh apresiasi kepada:",
      height - 214,
      fontSansRegular,
      12,
      colorMuted
    );

    // Nama Lengkap Peserta (Auto-fit font size agar nama panjang tetap proporsional di tengah)
    const displayName = participant.fullName.trim();
    let nameFontSize = 30;
    const maxNameWidth = width - 160;
    while (
      nameFontSize > 16 &&
      fontSerifBold.widthOfTextAtSize(displayName, nameFontSize) > maxNameWidth
    ) {
      nameFontSize -= 1;
    }

    drawCenteredText(
      displayName,
      height - 258,
      fontSerifBold,
      nameFontSize,
      colorInk
    );

    // Garis bawah nama peserta
    const lineHalfWidth = Math.min(
      220,
      Math.max(
        140,
        fontSerifBold.widthOfTextAtSize(displayName, nameFontSize) / 2 + 20
      )
    );

    page.drawLine({
      start: { x: width / 2 - lineHalfWidth, y: height - 270 },
      end: { x: width / 2 + lineHalfWidth, y: height - 270 },
      thickness: 1,
      color: colorGold,
    });

    // Asal Instansi & Tim
    const institutionLine = participant.registration.teamName
      ? `${participant.registration.teamName} — ${participant.registration.institution}`
      : participant.registration.institution;

    drawCenteredText(
      `Utusan / Delegasi: ${institutionLine}`,
      height - 294,
      fontSansBold,
      12.5,
      colorMuted
    );

    // Peran & Cabang Lomba
    const roleLabel =
      participant.role === "Ketua"
        ? "Ketua Tim Peserta"
        : participant.role === "Anggota"
          ? "Anggota Tim Peserta"
          : "Peserta";

    drawCenteredText(
      `Atas partisipasi dan dedikasinya sebagai ${roleLabel} pada Cabang Perlombaan:`,
      height - 332,
      fontSansRegular,
      12,
      colorInk
    );

    drawCenteredText(
      participant.registration.competition.name,
      height - 360,
      fontSerifBold,
      20,
      colorEmerald
    );

    drawCenteredText(
      `Dalam rangkaian kegiatan ${EVENT_CONFIG.name} Tahun ${EVENT_CONFIG.year}.`,
      height - 386,
      fontSansRegular,
      11.5,
      colorMuted
    );

    // Tanggal Penerbitan & Tanda Tangan Panitia (Kanan Bawah)
    const issueDateText = `Diterbitkan pada ${formatDateID(new Date())}`;
    const signatureCenterX = width - 190;

    const dateWidth = fontSansRegular.widthOfTextAtSize(issueDateText, 10.5);
    page.drawText(issueDateText, {
      x: signatureCenterX - dateWidth / 2,
      y: 145,
      size: 10.5,
      font: fontSansRegular,
      color: colorMuted,
    });

    const committeeTitle = `Ketua Panitia ${EVENT_CONFIG.name}`;
    const titleWidth = fontSansBold.widthOfTextAtSize(committeeTitle, 11);
    page.drawText(committeeTitle, {
      x: signatureCenterX - titleWidth / 2,
      y: 128,
      size: 11,
      font: fontSansBold,
      color: colorInk,
    });

    page.drawLine({
      start: { x: signatureCenterX - 80, y: 74 },
      end: { x: signatureCenterX + 80, y: 74 },
      thickness: 0.8,
      color: colorMuted,
    });

    const authNote = "Tanda Tangan Elektronik Terverifikasi";
    const authNoteWidth = fontSansRegular.widthOfTextAtSize(authNote, 8.5);
    page.drawText(authNote, {
      x: signatureCenterX - authNoteWidth / 2,
      y: 60,
      size: 8.5,
      font: fontSansRegular,
      color: colorMuted,
    });

    // Generate & Embed QR Code Validasi Keaslian (Kiri Bawah)
    const baseUrl = EVENT_CONFIG.appUrl.replace(/\/+$/, "");
    const verificationUrl = `${baseUrl}/verifikasi/${participant.id}`;

    const qrPngBuffer = await QRCode.toBuffer(verificationUrl, {
      type: "png",
      width: 220,
      margin: 1,
      color: {
        dark: "#065F46",
        light: "#FFFFFF",
      },
    });

    const qrImage = await pdfDoc.embedPng(qrPngBuffer);
    const qrSize = 78;
    const qrX = 64;
    const qrY = 62;

    page.drawRectangle({
      x: qrX - 4,
      y: qrY - 4,
      width: qrSize + 8,
      height: qrSize + 8,
      color: rgb(1, 1, 1),
      borderColor: colorGold,
      borderWidth: 0.8,
    });

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    page.drawText("VALIDASI KEASLIAN QR", {
      x: qrX + qrSize + 14,
      y: qrY + 52,
      size: 9,
      font: fontSansBold,
      color: colorEmerald,
    });

    page.drawText(`Kode Reg: ${participant.registration.registrationCode}`, {
      x: qrX + qrSize + 14,
      y: qrY + 37,
      size: 9,
      font: fontMono,
      color: colorInk,
    });

    page.drawText("Pindai QR Code untuk memeriksa", {
      x: qrX + qrSize + 14,
      y: qrY + 22,
      size: 8.5,
      font: fontSansRegular,
      color: colorMuted,
    });

    page.drawText("validitas sertifikat di server resmi.", {
      x: qrX + qrSize + 14,
      y: qrY + 10,
      size: 8.5,
      font: fontSansRegular,
      color: colorMuted,
    });

    const pdfBytes = await pdfDoc.save();
    const safeFilename = participant.fullName
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="e-Syahadah-${participant.registration.registrationCode}-${safeFilename}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat merender dokumen PDF e-Syahadah.",
      },
      { status: 500 }
    );
  }
}

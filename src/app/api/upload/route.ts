import { NextResponse } from "next/server";
import {
  uploadPaymentProofToCloudinary,
  UploadValidationError,
} from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const registrationCodeHint =
      (formData.get("registrationCode") as string | null) || undefined;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "File bukti transfer tidak ditemukan dalam permintaan.",
        },
        { status: 400 }
      );
    }

    const result = await uploadPaymentProofToCloudinary(file, {
      registrationCodeHint,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 422 }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat mengunggah bukti transfer.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}


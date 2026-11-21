import type { Metadata } from "next";
import { StatusPortal } from "@/components/public/status-portal";

export const metadata: Metadata = {
  title: "Cek Status Pendaftaran & Unduh e-Syahadah",
  description:
    "Pantau status verifikasi pembayaran, unggah bukti transfer susulan, gabung Grup WhatsApp Lomba, dan unduh PDF e-Syahadah.",
};

export const dynamic = "force-dynamic";

interface CheckStatusPageProps {
  searchParams?: {
    q?: string;
  };
}

export default function CheckStatusPage({
  searchParams,
}: CheckStatusPageProps) {
  const initialQuery =
    typeof searchParams?.q === "string" ? searchParams.q : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
      <div className="space-y-2">
        <h1 className="sonorous-display text-3xl sm:text-5xl font-normal tracking-tight text-[#2A2622]">
          Portal Cek Status &amp; e-Syahadah
        </h1>
        <p className="text-sm sm:text-base text-[#2A2622]/85 max-w-2xl leading-relaxed">
          Masukkan Kode Pendaftaran (<span className="font-mono font-semibold">DM9-XXXX</span>
          ) atau Nomor WhatsApp untuk melihat status verifikasi bendahara,
          mengunggah bukti transfer susulan, mengakses Grup WhatsApp Lomba,
          serta mengunci ejaan nama untuk mengunduh PDF e-Syahadah.
        </p>
      </div>

      <StatusPortal initialQuery={initialQuery} />
    </div>
  );
}

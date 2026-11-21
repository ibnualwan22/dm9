import type { Metadata } from "next";
import { ESyahadahPortal } from "@/components/public/e-syahadah-portal";

export const metadata: Metadata = {
  title: "Unduh e-Syahadah",
  description:
    "Kunci ejaan nama peserta dan unduh PDF e-Syahadah resmi Dies Miladis ke-9 Markaz Arabiyah.",
};

export const dynamic = "force-dynamic";

export default function ESyahadahPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const initialQuery =
    typeof searchParams?.q === "string" ? searchParams.q : "";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 space-y-8">
      <div className="space-y-2">
        <h1 className="sonorous-display text-3xl font-bold tracking-tight sm:text-5xl">
          Unduh e-Syahadah
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
          Masukkan Kode Pendaftaran (DM9-XXXX) untuk mengunci ejaan nama
          peserta dan mengunduh PDF e-Syahadah resmi setelah kehadiran Hari-H
          diverifikasi panitia.
        </p>
      </div>

      <ESyahadahPortal initialQuery={initialQuery} />
    </div>
  );
}

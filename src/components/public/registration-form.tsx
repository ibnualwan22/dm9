"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  FileText,
  CreditCard,
} from "lucide-react";
import {
  registrationFormSchema,
  validateClientSideFile,
  type RegistrationFormValues,
} from "@/lib/validations";
import {
  submitRegistrationAction,
  type SubmittedRegistrationSummary,
} from "@/actions/registration.action";
import { BANK_CONFIG, UPLOAD_CONSTRAINTS } from "@/lib/constants";
import { formatRupiah, splitPaymentAmountDisplay } from "@/lib/utils";

interface RegistrationFormProps {
  competition: {
    id: string;
    name: string;
    slug: string;
    type: "INDIVIDUAL" | "TEAM";
    registrationFee: number;
    maxMembers: number;
    quota: number;
    usedQuota: number;
    isActive: boolean;
  };
  initialUniqueCode: number;
}

export function RegistrationForm({
  competition,
  initialUniqueCode,
}: RegistrationFormProps) {
  const isFree = competition.registrationFee === 0;
  const remainingQuota = Math.max(0, competition.quota - competition.usedQuota);
  const isFullOrClosed = remainingQuota <= 0 || !competition.isActive;
  const effectiveUniqueCode = isFree ? 0 : initialUniqueCode;
  const totalTransferAmount =
    competition.registrationFee + effectiveUniqueCode;
  const amountParts = splitPaymentAmountDisplay(totalTransferAmount);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submittedData, setSubmittedData] =
    useState<SubmittedRegistrationSummary | null>(null);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      competitionId: competition.id,
      competitionType: competition.type,
      maxMembers: competition.maxMembers,
      registrationFee: competition.registrationFee,
      uniqueCode: effectiveUniqueCode,
      teamName: "",
      institution: "",
      leaderEmail: "",
      leaderPhone: "",
      participants: [
        {
          fullName: "",
          role: competition.type === "TEAM" ? "Ketua" : "Peserta",
        },
      ],
      paymentProofUrl: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "participants",
  });

  const watchPaymentProofUrl = form.watch("paymentProofUrl");
  const isSubmitting = form.formState.isSubmitting;

  async function handleCopyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  }

  async function handleFileSelection(file: File | null | undefined) {
    setUploadError(null);
    if (!file) return;

    const clientCheck = validateClientSideFile(file);
    if (!clientCheck.valid) {
      setUploadError(clientCheck.error || "File tidak valid.");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("registrationCode", competition.slug);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as {
        success: boolean;
        data?: { url: string };
        error?: string;
      };

      if (!response.ok || !json.success || !json.data?.url) {
        throw new Error(json.error || "Gagal mengunggah bukti transfer.");
      }

      form.setValue("paymentProofUrl", json.data.url, {
        shouldValidate: true,
      });
      setUploadedFileName(file.name);

      if (file.type.startsWith("image/")) {
        setUploadPreviewUrl(URL.createObjectURL(file));
      } else {
        setUploadPreviewUrl(null);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengunggah file."
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function onSubmit(values: RegistrationFormValues) {
    setServerError(null);
    const response = await submitRegistrationAction(values);

    if (!response.success || !response.data) {
      setServerError(
        response.error || "Gagal menyimpan pendaftaran. Silakan coba lagi."
      );
      return;
    }

    setSubmittedData(response.data);
  }

  // Tampilan Bukti Pendaftaran Berhasil
  if (submittedData) {
    const finalAmountParts = splitPaymentAmountDisplay(
      submittedData.paymentAmount
    );

    return (
      <div className="card-surface p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="inline-flex items-center rounded-md bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand">
              Pendaftaran Berhasil Tercatat
            </span>
            <h2 className="mt-1 text-xl font-bold text-ink">
              Simpan Kode Pendaftaran Anda
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Simpan kode di bawah ini. Setelah bendahara memverifikasi
              pembayaran, tautan Grup WhatsApp lomba dikirim otomatis ke nomor
              WhatsApp Anda. Unduh e-Syahadah Anda di halaman{" "}
              <strong>Unduh e-Syahadah</strong> setelah Hari-H.
            </p>
          </div>
        </div>

        {/* Kotak Kode Pendaftaran DM9-XXXX */}
        <div className="rounded-xl border border-brand-border bg-brand-light/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink-secondary">
              Kode Pendaftaran Resmi
            </p>
            <p className="tabular-data mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-brand">
              {submittedData.registrationCode}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleCopyText(submittedData.registrationCode, "regCode")
            }
            className="btn-secondary text-xs py-2 px-3.5"
          >
            {copiedField === "regCode" ? (
              <>
                <Check className="h-4 w-4 text-brand" />
                <span>Kode Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin Kode</span>
              </>
            )}
          </button>
        </div>

        {/* Rincian Status & Tagihan */}
        <div className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Cabang Lomba</span>
            <span className="font-semibold text-ink">
              {submittedData.competitionName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Asal Instansi</span>
            <span className="font-medium text-ink">
              {submittedData.institution}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary">Status Pembayaran</span>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                submittedData.paymentStatus === "VERIFIED"
                  ? "bg-brand-light text-brand"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {submittedData.paymentStatus === "VERIFIED"
                ? "VERIFIED (Lunas / Gratis)"
                : "WAITING (Menunggu Verifikasi Bendahara)"}
            </span>
          </div>

          {!finalAmountParts.isFree && (
            <div className="border-t border-[#2A2622]/12 pt-3 flex items-center justify-between">
              <span className="text-ink-secondary">
                Nominal Transfer (Termasuk Kode Unik)
              </span>
              <span className="tabular-data text-base font-bold text-ink">
                {finalAmountParts.prefix}
                <mark className="rounded bg-amber-200 px-1 py-0.5 text-amber-950">
                  {finalAmountParts.uniqueDigits}
                </mark>
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href={`/e-syahadah?q=${encodeURIComponent(submittedData.registrationCode)}`}
            className="btn-primary w-full sm:w-auto"
          >
            <span>Unduh e-Syahadah</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/" className="btn-secondary w-full sm:w-auto">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // Pemberitahuan Kuota Penuh / Pendaftaran Ditutup.
  // Sengaja di sini (bukan di halaman lomba) dan SETELAH cabang sukses di
  // atas: saat pendaftaran mengambil slot terakhir, halaman me-refresh
  // kuota menjadi 0 — formulir harus tetap terpasang agar layar sukses
  // (nomor pendaftaran) tidak hilang tertimpa pemberitahuan ini.
  if (isFullOrClosed) {
    return (
      <div className="card-surface p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50/80 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="sonorous-display text-2xl font-normal text-[#2A2622]">
          Mohon Maaf, Pendaftaran Cabang Lomba Ini Tidak Tersedia
        </h2>
        <p className="text-sm text-ink-secondary max-w-md mx-auto">
          Kuota pendaftaran untuk <strong>{competition.name}</strong> telah
          terpenuhi ({competition.quota} slot) atau telah ditutup oleh
          panitia.
        </p>
        <div className="pt-2">
          <Link href="/#katalog-lomba" className="btn-primary">
            Lihat Cabang Lomba Lainnya
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="card-surface p-6 sm:p-8 space-y-8"
      noValidate
    >
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal Memproses Pendaftaran</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* BAGIAN 1: Identitas Instansi & Kontak Koordinator */}
      <section className="space-y-4">
        <div className="border-b border-[#2A2622]/12 pb-3">
          <h2 className="text-lg font-bold text-ink">
            1. Data Instansi &amp; Kontak Penanggung Jawab
          </h2>
          <p className="text-xs text-ink-secondary">
            Satu nomor WhatsApp pendamping dapat digunakan untuk mendaftarkan
            lebih dari satu tim/cabang lomba.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {competition.type === "TEAM" && (
            <div className="sm:col-span-2">
              <label htmlFor="teamName" className="label-field">
                Nama Tim / Regu <span className="text-red-600">*</span>
              </label>
              <input
                id="teamName"
                type="text"
                placeholder="Contoh: Tim Al-Ghazali Putra"
                className="input-field"
                {...form.register("teamName")}
              />
              {form.formState.errors.teamName && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.teamName.message}
                </p>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <label htmlFor="institution" className="label-field">
              Asal Instansi / Pondok Pesantren / Sekolah / Kampus{" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="institution"
              type="text"
              placeholder="Contoh: PP. Darul Ulum Jombang"
              className="input-field"
              {...form.register("institution")}
            />
            {form.formState.errors.institution && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.institution.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="leaderPhone" className="label-field">
              Nomor WhatsApp Aktif <span className="text-red-600">*</span>
            </label>
            <input
              id="leaderPhone"
              type="tel"
              autoComplete="tel"
              placeholder="081234567890"
              className="input-field tabular-data"
              {...form.register("leaderPhone")}
            />
            {form.formState.errors.leaderPhone && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.leaderPhone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="leaderEmail" className="label-field">
              Alamat Email Aktif (Untuk Pengiriman e-Syahadah){" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="leaderEmail"
              type="email"
              autoComplete="email"
              placeholder="delegasi@pesantren.ac.id"
              className="input-field"
              {...form.register("leaderEmail")}
            />
            {form.formState.errors.leaderEmail && (
              <p className="mt-1 text-xs text-red-600">
                {form.formState.errors.leaderEmail.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* BAGIAN 2: Data Peserta (Dinamis INDIVIDUAL vs TEAM) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2622]/12 pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink">
              2. Daftar Nama Peserta (Sesuai Ejaan e-Syahadah)
            </h2>
            <p className="text-xs text-ink-secondary">
              {competition.type === "TEAM"
                ? `Cabang lomba beregu: maksimal ${competition.maxMembers} peserta (1 Ketua & hingga ${competition.maxMembers - 1} Anggota).`
                : "Masukkan nama lengkap beserta gelar jika diperlukan untuk pencetakan e-Syahadah."}
            </p>
          </div>

          {competition.type === "TEAM" &&
            fields.length < competition.maxMembers && (
              <button
                type="button"
                onClick={() =>
                  append({
                    fullName: "",
                    role: "Anggota",
                  })
                }
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <Plus className="h-3.5 w-3.5 text-brand" />
                <span>
                  Tambah Anggota ({fields.length}/{competition.maxMembers})
                </span>
              </button>
            )}
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const roleLabel =
              competition.type === "INDIVIDUAL"
                ? "Peserta"
                : index === 0
                  ? "Ketua Tim"
                  : `Anggota ${index}`;

            return (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-3.5"
              >
                <div className="sm:w-36 shrink-0">
                  <span className="inline-flex items-center rounded-md bg-[#FFFFFC]/75 border border-[#2A2622]/12 px-2.5 py-2 text-xs font-semibold text-ink-secondary w-full justify-center">
                    {roleLabel}
                  </span>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor={`participant-${index}`}
                    className="sr-only"
                  >
                    Nama Lengkap {roleLabel}
                  </label>
                  <input
                    id={`participant-${index}`}
                    type="text"
                    placeholder={`Nama lengkap ${roleLabel.toLowerCase()} (tanpa singkatan)`}
                    className="input-field"
                    {...form.register(`participants.${index}.fullName`)}
                  />
                  {form.formState.errors.participants?.[index]?.fullName && (
                    <p className="mt-1 text-xs text-red-600">
                      {
                        form.formState.errors.participants[index]?.fullName
                          ?.message
                      }
                    </p>
                  )}
                </div>

                {competition.type === "TEAM" && index > 0 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Hapus ${roleLabel}`}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-[#FFFFFC]/75 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BAGIAN 3: Rincian Pembayaran & Upload Bukti Transfer */}
      <section className="space-y-4">
        <div className="border-b border-[#2A2622]/12 pb-3">
          <h2 className="text-lg font-bold text-ink">
            3. Pembayaran &amp; Verifikasi Kode Unik
          </h2>
          <p className="text-xs text-ink-secondary">
            {isFree
              ? "Cabang lomba ini tidak dipungut biaya pendaftaran (Gratis). Status pendaftaran Anda otomatis Terverifikasi."
              : "Transfer tepat hingga 3 digit terakhir agar bendahara dapat memverifikasi pembayaran Anda dengan cepat."}
          </p>
        </div>

        {isFree ? (
          <div className="rounded-xl border border-brand-border bg-brand-light/50 p-4 text-sm text-brand">
            <p className="font-semibold">
              Biaya Pendaftaran: Rp 0 (Gratis / Bebas Biaya)
            </p>
            <p className="mt-0.5 text-xs">
              Anda tidak perlu mengunggah bukti transfer. Tekan tombol Daftar
              Sekarang di bawah untuk mendapatkan kode pendaftaran.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Kalkulator Nominal Kode Unik & Rekening Panitia */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Kotak Rincian Tagihan */}
              <div className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span>Biaya Pendaftaran Pokok</span>
                  <span className="tabular-data font-medium text-ink">
                    {formatRupiah(competition.registrationFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink-secondary">
                  <span>Kode Unik Verifikasi (3 Digit)</span>
                  <span className="tabular-data font-bold text-amber-700">
                    +{effectiveUniqueCode}
                  </span>
                </div>
                <div className="border-t border-[#2A2622]/12 pt-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">
                    Total Nominal Transfer
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-data text-lg font-bold text-ink">
                      {amountParts.prefix}
                      <mark className="rounded bg-amber-200 px-1 py-0.5 text-amber-950">
                        {amountParts.uniqueDigits}
                      </mark>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(String(totalTransferAmount), "amount")
                      }
                      className="rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/75 px-2 py-1 text-[11px] font-medium text-ink-secondary hover:text-ink"
                    >
                      {copiedField === "amount" ? "Tersalin" : "Salin"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Kotak Rekening Panitia */}
              <div className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/75 p-4 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                  <CreditCard className="h-4 w-4" />
                  <span>Rekening Resmi Panitia</span>
                </div>
                <div className="my-2">
                  <p className="text-xs text-ink-secondary">
                    {BANK_CONFIG.bankName}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="tabular-data text-lg font-bold text-ink">
                      {BANK_CONFIG.accountNumber}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(BANK_CONFIG.accountNumber, "bankAcc")
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/50 px-2.5 py-1 text-xs font-medium text-ink hover:bg-zinc-100"
                    >
                      {copiedField === "bankAcc" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-brand" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-ink-muted">
                    a.n. {BANK_CONFIG.accountHolder}
                  </p>
                </div>
              </div>
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              Transfer harus sama persis dengan nominal di atas, termasuk 3
              digit kode uniknya. Nominal yang tidak sama akan memperlambat
              proses verifikasi oleh bendahara.
            </p>

            {/* Dropzone Upload Bukti Transfer (Wajib) */}
            <div className="space-y-2">
              <span className="label-field">
                Unggah Bukti Transfer <span className="text-red-600">*</span>
              </span>

              <label
                htmlFor="paymentProofFileInput"
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                  watchPaymentProofUrl
                    ? "border-brand bg-brand-light/30"
                    : "border-[#2A2622]/15 bg-[#FFFFFC]/75 hover:border-brand hover:bg-[#FFFFFC]/50"
                }`}
              >
                <input
                  id="paymentProofFileInput"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="sr-only"
                  disabled={uploadingFile}
                  onChange={(e) => handleFileSelection(e.target.files?.[0])}
                />

                {uploadingFile ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <Loader2 className="h-7 w-7 animate-spin text-brand" />
                    <p className="text-sm font-medium text-ink">
                      Mengunggah bukti transfer...
                    </p>
                  </div>
                ) : watchPaymentProofUrl ? (
                  <div className="space-y-3">
                    {uploadPreviewUrl ? (
                      <img
                        src={uploadPreviewUrl}
                        alt="Preview Bukti Transfer"
                        className="mx-auto max-h-48 rounded-lg border border-[#2A2622]/12 object-contain"
                      />
                    ) : (
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand">
                        <FileText className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-brand">
                        Bukti Transfer Siap Dikirim
                      </p>
                      <p className="text-xs text-ink-secondary">
                        {uploadedFileName || "Klik untuk mengganti file"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFFFC]/50 border border-[#2A2622]/12 text-ink-secondary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      Klik untuk memilih file bukti transfer
                    </p>
                    <p className="text-xs text-ink-muted">
                      Format JPG, PNG, WEBP, atau PDF (Maksimal{" "}
                      {UPLOAD_CONSTRAINTS.maxFileSizeLabel})
                    </p>
                  </div>
                )}
              </label>

              {uploadError && (
                <p className="text-xs font-medium text-red-600">
                  {uploadError}
                </p>
              )}

              {form.formState.errors.paymentProofUrl && (
                <p className="text-xs font-medium text-red-600">
                  {form.formState.errors.paymentProofUrl.message}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Tombol Submit */}
      <div className="border-t border-[#2A2622]/12 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-ink-muted">
          Pastikan seluruh data nama peserta dan nomor WhatsApp sudah benar
          sebelum mengirim pendaftaran.
        </p>

        <button
          type="submit"
          disabled={isSubmitting || uploadingFile}
          className="btn-primary w-full sm:w-auto min-w-[220px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memproses Pendaftaran...</span>
            </>
          ) : (
            <>
              <span>Kirim Pendaftaran Lomba</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Lock,
  Download,
  ExternalLink,
  MessageCircle,
  Loader2,
  CreditCard,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  lookupRegistrationsAction,
  reuploadPaymentProofAction,
  type RegistrationLookupItem,
} from "@/actions/registration.action";
import { lockParticipantNameAction } from "@/actions/certificate.action";
import { validateClientSideFile } from "@/lib/validations";
import { BANK_CONFIG, UPLOAD_CONSTRAINTS } from "@/lib/constants";
import { formatDateID, splitPaymentAmountDisplay } from "@/lib/utils";

interface StatusPortalProps {
  initialQuery?: string;
}

export function StatusPortal({ initialQuery = "" }: StatusPortalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RegistrationLookupItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // State re-upload bukti transfer
  const [uploadingProof, setUploadingProof] = useState(false);
  const [reuploadMessage, setReuploadMessage] = useState<string | null>(null);
  const [reuploadError, setReuploadError] = useState<string | null>(null);

  // State kunci nama peserta per participantId
  const [nameInputs, setNameInputs] = useState<Record<string, string>>({});
  const [lockingParticipantId, setLockingParticipantId] = useState<
    string | null
  >(null);
  const [lockFeedback, setLockFeedback] = useState<{
    participantId: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function executeLookup(searchQuery: string) {
    const clean = searchQuery.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setReuploadMessage(null);
    setReuploadError(null);
    setLockFeedback(null);

    try {
      const response = await lookupRegistrationsAction(clean);
      if (!response.success || !response.data) {
        setResults([]);
        setError(response.error || "Data pendaftaran tidak ditemukan.");
        return;
      }

      setResults(response.data);
      setSelectedIndex(0);

      // Inisialisasi input nama peserta
      const initialNames: Record<string, string> = {};
      for (const reg of response.data) {
        for (const p of reg.participants) {
          initialNames[p.id] = p.fullName;
        }
      }
      setNameInputs(initialNames);
    } catch {
      setError("Terjadi kesalahan saat mencari data pendaftaran.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery.trim().length >= 4) {
      executeLookup(initialQuery);
    }
  }, [initialQuery]);

  const activeRegistration = results[selectedIndex] || null;

  async function handleCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Abaikan
    }
  }

  async function handleProofUploadAndSubmit(
    file: File | null | undefined,
    registrationCode: string
  ) {
    setReuploadError(null);
    setReuploadMessage(null);

    if (!file) return;
    const validation = validateClientSideFile(file);
    if (!validation.valid) {
      setReuploadError(validation.error || "File bukti transfer tidak valid.");
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("registrationCode", registrationCode);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadJson = (await uploadRes.json()) as {
        success: boolean;
        data?: { url: string };
        error?: string;
      };

      if (!uploadRes.ok || !uploadJson.success || !uploadJson.data?.url) {
        throw new Error(
          uploadJson.error || "Gagal mengunggah file bukti transfer."
        );
      }

      const actionRes = await reuploadPaymentProofAction({
        registrationCode,
        paymentProofUrl: uploadJson.data.url,
      });

      if (!actionRes.success) {
        throw new Error(
          actionRes.error || "Gagal memperbarui bukti pembayaran."
        );
      }

      setReuploadMessage(
        actionRes.message || "Bukti transfer berhasil diperbarui!"
      );
      await executeLookup(query || registrationCode);
    } catch (err) {
      setReuploadError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengunggah bukti transfer."
      );
    } finally {
      setUploadingProof(false);
    }
  }

  async function handleLockName(
    participantId: string,
    registrationCode: string
  ) {
    const editedName = (nameInputs[participantId] || "").trim();
    if (editedName.length < 3) {
      setLockFeedback({
        participantId,
        type: "error",
        text: "Ejaan nama lengkap minimal 3 karakter.",
      });
      return;
    }

    setLockingParticipantId(participantId);
    setLockFeedback(null);

    try {
      const res = await lockParticipantNameAction({
        participantId,
        registrationCode,
        fullName: editedName,
      });

      if (!res.success) {
        setLockFeedback({
          participantId,
          type: "error",
          text: res.error || "Gagal mengunci ejaan nama.",
        });
        return;
      }

      setLockFeedback({
        participantId,
        type: "success",
        text:
          res.message ||
          "Ejaan nama berhasil dikunci. Silakan unduh e-Syahadah Anda.",
      });

      await executeLookup(query || registrationCode);
    } catch {
      setLockFeedback({
        participantId,
        type: "error",
        text: "Terjadi kesalahan jaringan saat mengunci nama.",
      });
    } finally {
      setLockingParticipantId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Bar Pencarian Utama */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeLookup(query);
        }}
        className="card-surface p-5 sm:p-6"
      >
        <label htmlFor="lookupQueryInput" className="label-field">
          Masukkan Kode Pendaftaran (<span className="font-mono">DM9-XXXX</span>
          ) atau Nomor WhatsApp Terdaftar
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <input
            id="lookupQueryInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contoh: DM9-7K4P atau 081234567890"
            className="input-field tabular-data flex-1"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length < 4}
            className="btn-primary sm:w-auto min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mencari...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Cek Status</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Pesan Error Pencarian */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Data Tidak Ditemukan</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Jika 1 Nomor WA Memiliki Banyak Pendaftaran (Multi-Registration Selector) */}
      {results.length > 1 && (
        <div className="card-surface p-4 space-y-2.5">
          <p className="text-xs font-semibold text-ink-secondary">
            Ditemukan {results.length} pendaftaran dengan Nomor WhatsApp ini.
            Pilih pendaftaran yang ingin Anda kelola:
          </p>
          <div className="flex flex-wrap gap-2">
            {results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? "border-brand bg-brand text-white"
                      : "border-[#2A2622]/12 bg-[#FFFFFC]/50 text-ink hover:border-[#2A2622]/25"
                  }`}
                >
                  <span className="tabular-data font-bold">
                    {item.registrationCode}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[180px]">
                    {item.competition.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Pendaftaran Aktif */}
      {activeRegistration && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Status & Pembayaran */}
          <div className="card-surface p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2622]/12 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="tabular-data rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-bold text-ink">
                    {activeRegistration.registrationCode}
                  </span>
                  <span className="text-xs text-ink-muted">
                    Terdaftar pada {formatDateID(activeRegistration.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-ink">
                  {activeRegistration.competition.name}
                </h2>
                <p className="text-sm text-ink-secondary">
                  {activeRegistration.teamName
                    ? `${activeRegistration.teamName} — ${activeRegistration.institution}`
                    : activeRegistration.institution}
                </p>
              </div>

              {/* Status Badge */}
              <div>
                {activeRegistration.paymentStatus === "VERIFIED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-light border border-brand-border px-3.5 py-2 text-xs font-bold text-brand">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>VERIFIED (Pembayaran Lunas)</span>
                  </span>
                )}
                {activeRegistration.paymentStatus === "WAITING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-900">
                    <Clock className="h-4 w-4" />
                    <span>WAITING (Menunggu Verifikasi Bendahara)</span>
                  </span>
                )}
                {activeRegistration.paymentStatus === "PENDING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 border border-zinc-300 px-3.5 py-2 text-xs font-bold text-zinc-800">
                    <Clock className="h-4 w-4" />
                    <span>PENDING (Belum Upload Bukti Transfer)</span>
                  </span>
                )}
                {activeRegistration.paymentStatus === "REJECTED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs font-bold text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span>REJECTED (Bukti Transfer Ditolak)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Banner Alasan Penolakan (Jika REJECTED) */}
            {activeRegistration.paymentStatus === "REJECTED" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-1">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Catatan Penolakan dari Bendahara:</span>
                </p>
                <p className="pl-6">
                  {activeRegistration.rejectionReason ||
                    "Bukti transfer tidak terbaca atau nominal tidak sesuai. Silakan unggah ulang bukti transfer yang valid."}
                </p>
                <p className="pl-6 text-xs text-red-700 pt-1">
                  Tenang, slot kuota Anda tetap terkunci dan aman. Silakan
                  unggah bukti transfer perbaikan di bawah ini.
                </p>
              </div>
            )}

            {/* Panel Upload / Re-upload Bukti Transfer (Untuk PENDING & REJECTED) */}
            {(activeRegistration.paymentStatus === "PENDING" ||
              activeRegistration.paymentStatus === "REJECTED") && (
              <div className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-brand" />
                      <span>Instruksi Pelunasan &amp; Unggah Bukti Transfer</span>
                    </h3>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Transfer tepat sesuai nominal kode unik ke{" "}
                      <strong>{BANK_CONFIG.bankName}</strong> No. Rek{" "}
                      <span className="font-mono font-bold">
                        {BANK_CONFIG.accountNumber}
                      </span>{" "}
                      a.n. {BANK_CONFIG.accountHolder}
                    </p>
                  </div>

                  {(() => {
                    const parts = splitPaymentAmountDisplay(
                      activeRegistration.paymentAmount
                    );
                    return (
                      <div className="flex items-center gap-2 rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/75 px-3.5 py-2">
                        <span className="tabular-data text-lg font-bold text-ink">
                          {parts.prefix}
                          <mark className="rounded bg-amber-200 px-1 py-0.5 text-amber-950">
                            {parts.uniqueDigits}
                          </mark>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              String(activeRegistration.paymentAmount),
                              "payAmt"
                            )
                          }
                          className="rounded border border-[#2A2622]/12 px-2 py-1 text-xs font-medium text-ink-secondary hover:text-ink"
                        >
                          {copiedKey === "payAmt" ? (
                            <Check className="h-3.5 w-3.5 text-brand" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {reuploadMessage && (
                  <div className="rounded-lg border border-brand-border bg-brand-light p-3 text-xs font-semibold text-brand">
                    {reuploadMessage}
                  </div>
                )}

                {reuploadError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {reuploadError}
                  </div>
                )}

                <label
                  htmlFor="reuploadProofInput"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#2A2622]/15 bg-[#FFFFFC]/75 p-5 text-center transition-colors hover:border-brand"
                >
                  <input
                    id="reuploadProofInput"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    disabled={uploadingProof}
                    className="sr-only"
                    onChange={(e) =>
                      handleProofUploadAndSubmit(
                        e.target.files?.[0],
                        activeRegistration.registrationCode
                      )
                    }
                  />
                  {uploadingProof ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-brand">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Mengunggah &amp; memperbarui bukti transfer...</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="mx-auto h-6 w-6 text-brand" />
                      <p className="text-sm font-semibold text-ink">
                        Klik untuk Mengunggah Bukti Transfer Sekarang
                      </p>
                      <p className="text-xs text-ink-muted">
                        JPG, PNG, WEBP, atau PDF (Maks.{" "}
                        {UPLOAD_CONSTRAINTS.maxFileSizeLabel})
                      </p>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Akses Grup WhatsApp Resmi & SOP Lomba */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeRegistration.competition.whatsappGroupUrl ? (
                <a
                  href={activeRegistration.competition.whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Gabung Grup WhatsApp Resmi Lomba</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 px-4 py-2.5 text-xs font-medium text-ink-muted">
                  <Lock className="h-4 w-4" />
                  <span>
                    Link Grup WhatsApp Terbuka Setelah Upload Bukti Transfer
                  </span>
                </div>
              )}

              <a
                href={activeRegistration.competition.sopFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full"
              >
                <span>Unduh Petunjuk Teknis (SOP) Lomba</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* KARTU E-SYAHADAH & KUNCI EJAAN NAMA PESERTA */}
          <div className="card-surface p-6 space-y-5">
            <div className="border-b border-[#2A2622]/12 pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand">
                <ShieldCheck className="h-4 w-4" />
                <span>Penerbitan e-Syahadah (Sertifikat Resmi)</span>
              </div>
              <h3 className="mt-1 text-lg font-bold text-ink">
                Daftar Peserta &amp; Konfirmasi Ejaan Nama
              </h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                e-Syahadah hanya dapat diunduh apabila status pembayaran{" "}
                <strong>VERIFIED (Lunas)</strong>, kehadiran Hari-H telah
                dicentang panitia (<strong>Hadir</strong>), dan Anda telah{" "}
                <strong>Mengunci Ejaan Nama</strong>.
              </p>
            </div>

            <div className="space-y-4">
              {activeRegistration.participants.map((participant) => {
                const isPaymentVerified =
                  activeRegistration.paymentStatus === "VERIFIED";
                const isEligibleToLock =
                  isPaymentVerified &&
                  participant.isPresent &&
                  !participant.isNameLocked;
                const isReadyToDownload =
                  isPaymentVerified &&
                  participant.isPresent &&
                  participant.isNameLocked;

                return (
                  <div
                    key={participant.id}
                    className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center rounded-md bg-[#FFFFFC]/75 border border-[#2A2622]/12 px-2 py-0.5 text-xs font-semibold text-ink-secondary">
                          {participant.role}
                        </span>
                        <h4 className="mt-1.5 text-base font-bold text-ink">
                          {participant.fullName}
                        </h4>
                        {participant.certificateNumber && (
                          <p className="tabular-data text-xs text-ink-muted mt-0.5">
                            No. Sertifikat: {participant.certificateNumber}
                          </p>
                        )}
                      </div>

                      {/* Indikator Syarat Kelayakan */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-md px-2.5 py-1 font-medium ${
                            isPaymentVerified
                              ? "bg-brand-light text-brand"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          1. Bayar: {isPaymentVerified ? "Lunas" : "Belum"}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-1 font-medium ${
                            participant.isPresent
                              ? "bg-brand-light text-brand"
                              : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          2. Absensi Hari-H:{" "}
                          {participant.isPresent ? "Hadir" : "Belum Absen"}
                        </span>
                        <span
                          className={`rounded-md px-2.5 py-1 font-medium ${
                            participant.isNameLocked
                              ? "bg-brand-light text-brand"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          3. Ejaan Nama:{" "}
                          {participant.isNameLocked
                            ? "Terkunci"
                            : "Belum Dikunci"}
                        </span>
                      </div>
                    </div>

                    {/* Kondisi 1: Siap Kunci Nama (1x Self-Service Edit) */}
                    {isEligibleToLock && (
                      <div className="rounded-lg border border-amber-300 bg-[#FFFDF7] p-4 space-y-3">
                        <p className="text-xs font-semibold text-amber-900">
                          Periksa dan koreksi ejaan nama lengkap Anda (maksimal
                          1 kali). Setelah dikunci, nama akan dicetak permanen
                          pada PDF e-Syahadah.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            aria-label={`Koreksi ejaan nama ${participant.fullName}`}
                            value={
                              nameInputs[participant.id] ?? participant.fullName
                            }
                            onChange={(e) =>
                              setNameInputs((prev) => ({
                                ...prev,
                                [participant.id]: e.target.value,
                              }))
                            }
                            className="input-field flex-1"
                          />
                          <button
                            type="button"
                            disabled={lockingParticipantId === participant.id}
                            onClick={() =>
                              handleLockName(
                                participant.id,
                                activeRegistration.registrationCode
                              )
                            }
                            className="btn-primary whitespace-nowrap"
                          >
                            {lockingParticipantId === participant.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Mengunci...</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4" />
                                <span>Simpan &amp; Kunci Ejaan Nama</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Feedback Kunci Nama */}
                    {lockFeedback?.participantId === participant.id && (
                      <p
                        className={`text-xs font-semibold ${
                          lockFeedback.type === "success"
                            ? "text-brand"
                            : "text-red-600"
                        }`}
                      >
                        {lockFeedback.text}
                      </p>
                    )}

                    {/* Kondisi 2: Sudah Terkunci & Siap Unduh PDF e-Syahadah */}
                    {isReadyToDownload ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2622]/12 pt-3">
                        <a
                          href={`/verifikasi/${participant.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
                        >
                          <span>Lihat Halaman Validasi QR Publik</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <a
                          href={`/api/syahadah/${participant.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-2 px-4"
                        >
                          <Download className="h-4 w-4" />
                          <span>Unduh PDF e-Syahadah</span>
                        </a>
                      </div>
                    ) : (
                      !isEligibleToLock && (
                        <p className="text-xs text-ink-muted border-t border-[#2A2622]/12 pt-3">
                          {!isPaymentVerified
                            ? "Menunggu pembayaran terverifikasi (VERIFIED) oleh bendahara."
                            : "Tombol kunci nama & unduh e-Syahadah akan terbuka otomatis setelah panitia menandai kehadiran Anda pada Hari-H perlombaan."}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

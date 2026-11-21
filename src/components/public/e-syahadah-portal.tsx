"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  Download,
  Lock,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import {
  lookupForCertificateAction,
  lockParticipantNameAction,
  type CertificateLookupItem,
} from "@/actions/certificate.action";

interface ESyahadahPortalProps {
  initialQuery?: string;
}

export function ESyahadahPortal({ initialQuery = "" }: ESyahadahPortalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<CertificateLookupItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [lockNames, setLockNames] = useState<Record<string, string>>({});
  const [lockFeedback, setLockFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const didAutoSearch = useRef(false);

  async function runLookup(code: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setSearching(true);
    setError(null);
    setLockFeedback(null);
    try {
      const res = await lookupForCertificateAction({
        registrationCode: cleanCode,
      });
      if (!res.success || !res.data) {
        setResult(null);
        setError(res.error || "Data pendaftaran tidak ditemukan.");
        return;
      }
      setResult(res.data);
      setLockNames(
        Object.fromEntries(
          res.data.participants.map((p) => [p.id, p.fullName])
        )
      );
    } finally {
      setSearching(false);
    }
  }

  // Cari otomatis bila halaman dibuka lewat tautan ?q=DM9-XXXX
  useEffect(() => {
    if (initialQuery && !didAutoSearch.current) {
      didAutoSearch.current = true;
      runLookup(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLock(participantId: string) {
    if (!result) return;
    const name = (lockNames[participantId] || "").trim();
    if (name.length < 3) {
      setLockFeedback({
        type: "error",
        text: "Ejaan nama lengkap minimal 3 karakter.",
      });
      return;
    }
    setLockingId(participantId);
    setLockFeedback(null);
    try {
      const res = await lockParticipantNameAction({
        participantId,
        registrationCode: result.registrationCode,
        fullName: name,
      });
      if (!res.success) {
        setLockFeedback({
          type: "error",
          text: res.error || "Gagal mengunci ejaan nama.",
        });
        return;
      }
      setLockFeedback({ type: "success", text: res.message || "Nama berhasil dikunci." });
      await runLookup(result.registrationCode);
    } finally {
      setLockingId(null);
    }
  }

  const isVerified = result?.paymentStatus === "VERIFIED";

  return (
    <div className="space-y-6">
      {/* Form Pencarian Kode Pendaftaran */}
      <div className="card-surface p-6 sm:p-8 space-y-4">
        <div>
          <label htmlFor="certificateCodeInput" className="label-field">
            Kode Pendaftaran
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="certificateCodeInput"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runLookup(query);
                }
              }}
              placeholder="Contoh: DM9-XXXX"
              className="input-field tabular-data uppercase"
              maxLength={9}
            />
            <button
              type="button"
              onClick={() => runLookup(query)}
              disabled={searching || query.trim().length < 5}
              className="btn-primary shrink-0"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Cari Pendaftaran</span>
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Kode pendaftaran tercantum di pesan WhatsApp verifikasi dan di
            bukti pendaftaran Anda.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Hasil Pencarian */}
      {result && (
        <div className="card-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#2A2622]/12 pb-4">
            <div>
              <p className="text-xs font-medium text-ink-secondary">
                Kode Pendaftaran
              </p>
              <p className="tabular-data mt-0.5 text-xl font-bold text-brand">
                {result.registrationCode}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {result.competition.name}
              </p>
              <p className="text-xs text-ink-secondary">
                {result.teamName
                  ? `${result.teamName} — ${result.institution}`
                  : result.institution}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                isVerified
                  ? "bg-brand-light text-brand"
                  : result.paymentStatus === "WAITING"
                    ? "bg-amber-100 text-amber-800"
                    : result.paymentStatus === "REJECTED"
                      ? "bg-red-100 text-red-700"
                      : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {result.paymentStatus}
            </span>
          </div>

          {!isVerified && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {result.paymentStatus === "WAITING"
                ? "Pembayaran Anda masih menunggu verifikasi bendahara. e-Syahadah baru bisa diunduh setelah pembayaran terverifikasi."
                : result.paymentStatus === "REJECTED"
                  ? "Pembayaran Anda ditolak bendahara. Silakan hubungi panitia atau mendaftar ulang dengan bukti transfer yang benar."
                  : "Pendaftaran Anda belum dilengkapi bukti transfer. Silakan hubungi panitia."}
            </div>
          )}

          {lockFeedback && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-semibold ${
                lockFeedback.type === "success"
                  ? "border-brand-border bg-brand-light text-brand"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {lockFeedback.text}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-ink">
              Daftar Peserta &amp; e-Syahadah
            </h2>
            {result.participants.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-ink">{p.fullName}</p>
                    <p className="text-xs text-ink-secondary">
                      {p.role}
                      {p.certificateNumber
                        ? ` • ${p.certificateNumber}`
                        : ""}
                    </p>
                  </div>
                  {p.isNameLocked ? (
                    <span className="inline-flex items-center gap-1 rounded bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                      <Lock className="h-3 w-3" />
                      <span>Nama Terkunci</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <span>Nama Belum Dikunci</span>
                    </span>
                  )}
                </div>

                {!p.isPresent ? (
                  <p className="text-xs text-ink-muted">
                    Kehadiran Hari-H belum diverifikasi panitia — penguncian
                    nama dan unduh e-Syahadah belum tersedia.
                  </p>
                ) : !p.isNameLocked ? (
                  <div className="space-y-2">
                    <label
                      htmlFor={`lock-name-${p.id}`}
                      className="label-field"
                    >
                      Konfirmasi Ejaan Nama untuk e-Syahadah
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id={`lock-name-${p.id}`}
                        type="text"
                        value={lockNames[p.id] || ""}
                        onChange={(e) =>
                          setLockNames((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        disabled={!isVerified || lockingId === p.id}
                        className="input-field"
                      />
                      <button
                        type="button"
                        onClick={() => handleLock(p.id)}
                        disabled={!isVerified || lockingId === p.id}
                        className="btn-primary shrink-0 text-xs"
                      >
                        {lockingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        <span>Kunci Nama</span>
                      </button>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Setelah dikunci, ejaan nama tidak dapat diubah lagi.
                      Pastikan ejaan sudah benar.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={`/api/syahadah/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs"
                    >
                      <Download className="h-4 w-4" />
                      <span>Unduh PDF e-Syahadah</span>
                    </a>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      <UserCheck className="h-3.5 w-3.5 text-brand" />
                      <span>Kehadiran Hari-H terverifikasi</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Penjelasan Syarat */}
      <div className="card-surface p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <div className="text-sm text-ink-secondary space-y-1.5">
            <p className="font-semibold text-ink">
              Syarat mengunduh e-Syahadah:
            </p>
            <p>
              1. Pembayaran pendaftaran sudah terverifikasi (VERIFIED) — 2.
              Kehadiran Hari-H sudah diverifikasi panitia — 3. Ejaan nama
              sudah dikunci di halaman ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

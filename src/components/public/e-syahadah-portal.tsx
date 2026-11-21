"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import {
  lookupForCertificateAction,
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
  const didAutoSearch = useRef(false);

  async function runLookup(code: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;
    setSearching(true);
    setError(null);
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
                </div>

                {!p.isPresent ? (
                  <p className="text-xs text-ink-muted">
                    Kehadiran Hari-H belum diverifikasi panitia — unduh
                    e-Syahadah belum tersedia.
                  </p>
                ) : !isVerified ? (
                  <p className="text-xs text-ink-muted">
                    Pembayaran belum terverifikasi — e-Syahadah baru bisa
                    diunduh setelah pembayaran terverifikasi.
                  </p>
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
              Kehadiran Hari-H sudah diverifikasi panitia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

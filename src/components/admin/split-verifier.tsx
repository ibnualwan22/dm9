"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Search,
  Loader2,
  FileText,
  Clock,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { PaymentStatus } from "@prisma/client";
import {
  verifyPaymentAction,
  resendVerificationWhatsAppAction,
} from "@/actions/payment.action";
import {
  formatDateID,
  formatRupiah,
  splitPaymentAmountDisplay,
} from "@/lib/utils";

export interface TreasurerQueueItem {
  id: string;
  registrationCode: string;
  teamName: string | null;
  institution: string;
  leaderEmail: string;
  leaderPhone: string;
  waVerifiedSentAt: string | null;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  uniqueCode: number;
  paymentAmount: number;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  competition: {
    id: string;
    name: string;
    registrationFee: number;
  };
  participants: Array<{
    id: string;
    fullName: string;
    role: string;
  }>;
}

interface SplitVerifierProps {
  items: TreasurerQueueItem[];
}

const REJECTION_PRESETS = [
  "Nominal transfer tidak sesuai dengan 3 digit kode unik tagihan.",
  "Gambar bukti transfer buram / terpotong sehingga nomor referensi tidak terbaca.",
  "Bukti transfer belum masuk ke mutasi rekening resmi panitia.",
];

export function SplitVerifier({ items }: SplitVerifierProps) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">(
    PaymentStatus.WAITING
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const firstWaiting = items.find(
      (i) => i.paymentStatus === PaymentStatus.WAITING
    );
    return firstWaiting?.id || items[0]?.id || null;
  });

  const [verifierName, setVerifierName] = useState("Bendahara Panitia");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "ALL" && item.paymentStatus !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.registrationCode.toLowerCase().includes(q) ||
        item.institution.toLowerCase().includes(q) ||
        (item.teamName && item.teamName.toLowerCase().includes(q)) ||
        String(item.uniqueCode).includes(q) ||
        String(item.paymentAmount).includes(q) ||
        item.leaderPhone.includes(q)
      );
    });
  }, [items, statusFilter, searchQuery]);

  const activeItem = useMemo(() => {
    return (
      filteredItems.find((i) => i.id === selectedId) ||
      filteredItems[0] ||
      null
    );
  }, [filteredItems, selectedId]);

  const counts = useMemo(() => {
    return {
      WAITING: items.filter((i) => i.paymentStatus === "WAITING").length,
      PENDING: items.filter((i) => i.paymentStatus === "PENDING").length,
      VERIFIED: items.filter((i) => i.paymentStatus === "VERIFIED").length,
      REJECTED: items.filter((i) => i.paymentStatus === "REJECTED").length,
      ALL: items.length,
    };
  }, [items]);

  async function handleDecision(decision: "VERIFIED" | "REJECTED") {
    if (!activeItem) return;

    if (decision === "REJECTED" && rejectionReason.trim().length < 5) {
      setFeedback({
        type: "error",
        text: "Harap isi alasan penolakan (minimal 5 karakter) agar peserta dapat memperbaiki bukti transfer.",
      });
      return;
    }

    setProcessing(true);
    setFeedback(null);

    try {
      const res = await verifyPaymentAction({
        registrationId: activeItem.id,
        decision,
        verifiedBy: verifierName.trim() || "Bendahara Panitia",
        rejectionReason:
          decision === "REJECTED" ? rejectionReason.trim() : undefined,
      });

      if (!res.success) {
        setFeedback({
          type: "error",
          text: res.error || "Gagal menyimpan keputusan verifikasi.",
        });
        return;
      }

      setFeedback({
        type: "success",
        text: res.message || "Verifikasi berhasil disimpan.",
      });
      setShowRejectBox(false);
      setRejectionReason("");
      setZoomLevel(1);

      // Pindah otomatis ke item berikutnya di antrean
      const nextCandidate = filteredItems.find((i) => i.id !== activeItem.id);
      if (nextCandidate) {
        setSelectedId(nextCandidate.id);
      }

      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Terjadi kesalahan saat menghubungi server.",
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleResendWhatsApp() {
    if (!activeItem) return;
    setResending(true);
    setFeedback(null);
    try {
      const res = await resendVerificationWhatsAppAction({
        registrationId: activeItem.id,
      });
      setFeedback({
        type: res.success ? "success" : "error",
        text: res.message || res.error || "Gagal mengirim ulang WA.",
      });
      if (res.success) router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Terjadi kesalahan saat menghubungi server.",
      });
    } finally {
      setResending(false);
    }
  }

  const isPdfProof =
    activeItem?.paymentProofUrl?.toLowerCase().endsWith(".pdf") || false;

  return (
    <div className="space-y-4">
      {/* Unified Page-Level Filter Bar */}
      <div className="card-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              {
                key: "WAITING",
                label: `Antrean Verifikasi (${counts.WAITING})`,
              },
              { key: "VERIFIED", label: `Lunas (${counts.VERIFIED})` },
              { key: "REJECTED", label: `Ditolak (${counts.REJECTED})` },
              { key: "PENDING", label: `Belum Upload (${counts.PENDING})` },
              { key: "ALL", label: `Semua (${counts.ALL})` },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setShowRejectBox(false);
                  setFeedback(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand text-white"
                    : "bg-[#FFFFFC]/50 text-ink-secondary hover:text-ink border border-[#2A2622]/12"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode unik (mis. 412), DM9-XXXX, instansi..."
            className="input-field pl-9 py-1.5 text-xs"
          />
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-brand-border bg-brand-light text-brand"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Split-Screen Workspace: Kiri (Daftar Antrean) & Kanan (Panel Verifikasi) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* PANEL KIRI: Daftar Antrean Transaksi (5 Kolom) */}
        <div className="lg:col-span-5 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="card-surface p-8 text-center text-sm text-ink-muted">
              Tidak ada transaksi pada kategori filter ini.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = activeItem?.id === item.id;
              const parts = splitPaymentAmountDisplay(item.paymentAmount);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setShowRejectBox(false);
                    setZoomLevel(1);
                    setFeedback(null);
                  }}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-brand bg-brand-light/40 ring-1 ring-brand"
                      : "border-[#2A2622]/12 bg-[#FFFFFC]/75 hover:border-[#2A2622]/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-data text-xs font-bold text-ink">
                      {item.registrationCode}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        item.paymentStatus === "VERIFIED"
                          ? "bg-brand-light text-brand"
                          : item.paymentStatus === "WAITING"
                            ? "bg-amber-100 text-amber-800"
                            : item.paymentStatus === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {item.paymentStatus}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm font-bold text-ink truncate">
                    {item.institution}
                  </p>
                  <p className="text-xs text-ink-secondary truncate">
                    {item.competition.name}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-[#2A2622]/12 pt-2.5">
                    <span className="text-[11px] text-ink-muted">
                      {formatDateID(item.createdAt)}
                    </span>
                    <span className="tabular-data text-sm font-bold text-ink">
                      {parts.isFree ? (
                        "Gratis"
                      ) : (
                        <>
                          {parts.prefix}
                          <mark className="rounded bg-amber-200 px-1 py-0.5 text-amber-950">
                            {parts.uniqueDigits}
                          </mark>
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* PANEL KANAN: Preview Bukti Transfer & Tombol Eksekusi Bendahara (7 Kolom) */}
        <div className="lg:col-span-7">
          {!activeItem ? (
            <div className="card-surface p-12 text-center text-sm text-ink-muted">
              Pilih salah satu transaksi di panel kiri untuk memeriksa bukti
              transfer.
            </div>
          ) : (
            <div className="card-surface p-5 sm:p-6 space-y-6">
              {/* Header Transaksi & Highlight 3 Digit Kode Unik */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2622]/12 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-data rounded bg-zinc-100 px-2.5 py-1 text-xs font-bold text-ink">
                      {activeItem.registrationCode}
                    </span>
                    <span className="text-xs text-ink-muted">
                      WA: {activeItem.leaderPhone}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-bold text-ink">
                    {activeItem.institution}
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {activeItem.competition.name} •{" "}
                    {activeItem.participants.map((p) => p.fullName).join(", ")}
                  </p>
                </div>

                {/* Highlight Nominal + 3 Digit Kode Unik Ukuran Besar */}
                <div className="rounded-xl border border-amber-300 bg-[#FFFDF7] px-4 py-3 text-right">
                  <p className="text-[11px] font-semibold text-amber-900">
                    Cocokkan Nominal Mutasi (Kode Unik +{activeItem.uniqueCode})
                  </p>
                  {(() => {
                    const parts = splitPaymentAmountDisplay(
                      activeItem.paymentAmount
                    );
                    return (
                      <p className="tabular-data mt-0.5 text-2xl font-bold text-ink">
                        {parts.isFree ? (
                          "Rp 0 (Gratis)"
                        ) : (
                          <>
                            {parts.prefix}
                            <mark className="rounded-md bg-amber-300 px-1.5 py-0.5 text-amber-950">
                              {parts.uniqueDigits}
                            </mark>
                          </>
                        )}
                      </p>
                    );
                  })()}
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Pokok: {formatRupiah(activeItem.competition.registrationFee)}
                  </p>
                </div>
              </div>

              {/* Area Preview Bukti Transfer + Kontrol Zoom */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink">
                    Lampiran Bukti Transfer Peserta
                  </span>

                  {activeItem.paymentProofUrl && (
                    <div className="flex items-center gap-1.5">
                      {!isPdfProof && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setZoomLevel((z) => Math.max(0.5, z - 0.25))
                            }
                            aria-label="Perkecil gambar"
                            className="rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/75 p-1.5 text-ink-secondary hover:text-ink"
                          >
                            <ZoomOut className="h-3.5 w-3.5" />
                          </button>
                          <span className="tabular-data text-xs font-medium text-ink-secondary px-1">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setZoomLevel((z) => Math.min(2.5, z + 0.25))
                            }
                            aria-label="Perbesar gambar"
                            className="rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/75 p-1.5 text-ink-secondary hover:text-ink"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setZoomLevel(1)}
                            aria-label="Reset ukuran gambar"
                            className="rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/75 p-1.5 text-ink-secondary hover:text-ink"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}

                      <a
                        href={activeItem.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-[#2A2622]/12 bg-[#FFFFFC]/50 px-2.5 py-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <span>Buka Tab Baru</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex min-h-[320px] max-h-[460px] items-center justify-center overflow-auto rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-4">
                  {!activeItem.paymentProofUrl ? (
                    <div className="text-center space-y-1.5 text-ink-muted">
                      <Clock className="mx-auto h-7 w-7 text-zinc-400" />
                      <p className="text-sm font-semibold">
                        Belum Ada File Bukti Transfer
                      </p>
                      <p className="text-xs">
                        Belum ada bukti transfer yang diunggah.
                      </p>
                    </div>
                  ) : isPdfProof ? (
                    <div className="text-center space-y-3">
                      <FileText className="mx-auto h-10 w-10 text-brand" />
                      <p className="text-sm font-semibold text-ink">
                        Dokumen Bukti Transfer Berformat PDF
                      </p>
                      <a
                        href={activeItem.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs"
                      >
                        <span>Buka Dokumen PDF di Tab Baru</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <img
                      src={activeItem.paymentProofUrl}
                      alt={`Bukti Transfer ${activeItem.registrationCode}`}
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top center",
                      }}
                      className="max-h-[420px] rounded-lg object-contain transition-transform duration-150 ease-out"
                    />
                  )}
                </div>
              </div>

              {/* Riwayat Verifikasi Sebelumnya (Jika Sudah Pernah Diproses) */}
              {activeItem.verifiedAt && (
                <div className="rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-3 text-xs text-ink-secondary flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Terakhir diproses oleh{" "}
                    <strong>{activeItem.verifiedBy || "Bendahara"}</strong> pada{" "}
                    {formatDateID(activeItem.verifiedAt, true)}
                  </span>
                  {activeItem.rejectionReason && (
                    <span className="text-red-600 font-medium">
                      Alasan tolak: {activeItem.rejectionReason}
                    </span>
                  )}
                </div>
              )}

              {/* Status WA Verifikasi (khusus baris yang sudah LUNAS) */}
              {activeItem.paymentStatus === "VERIFIED" && (
                <div className="rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-3 text-xs text-ink-secondary flex flex-wrap items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-brand" />
                  <span>
                    WA verifikasi:{" "}
                    {activeItem.waVerifiedSentAt ? (
                      <strong>
                        sudah terkirim{" "}
                        {formatDateID(activeItem.waVerifiedSentAt, true)}
                      </strong>
                    ) : (
                      <strong className="text-amber-800">belum terkirim</strong>
                    )}
                  </span>
                </div>
              )}

              {/* Kontrol Keputusan Bendahara (Setujui/Tolak; baris LUNAS: Kirim WA Ulang) */}
              <div className="border-t border-[#2A2622]/12 pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="verifierNameInput"
                      className="text-xs font-medium text-ink-secondary whitespace-nowrap"
                    >
                      Nama Verifikator:
                    </label>
                    <input
                      id="verifierNameInput"
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      className="input-field py-1.5 px-2.5 text-xs max-w-[180px]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => setShowRejectBox((prev) => !prev)}
                      className="btn-secondary text-xs border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Tolak + Alasan</span>
                    </button>

                    {activeItem.paymentStatus === "VERIFIED" ? (
                      <button
                        type="button"
                        disabled={resending}
                        onClick={handleResendWhatsApp}
                        className="btn-primary text-xs"
                      >
                        {resending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                        <span>Kirim WA Ulang</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => handleDecision("VERIFIED")}
                        className="btn-primary text-xs"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span>Setujui Pembayaran (LUNAS)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Popover/Drawer Form Alasan Penolakan */}
                {showRejectBox && (
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Pilih atau Tulis Alasan Penolakan (Disampaikan panitia
                        ke peserta)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {REJECTION_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setRejectionReason(preset)}
                          className="rounded-md border border-red-200 bg-[#FFFFFC]/75 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 text-left"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Tuliskan catatan jelas agar peserta dapat mendaftar ulang dengan bukti transfer yang benar..."
                      className="input-field text-xs"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectBox(false)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() => handleDecision("REJECTED")}
                        className="btn-danger text-xs py-1.5 px-3.5"
                      >
                        {processing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        <span>Konfirmasi Tolak Bukti Transfer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

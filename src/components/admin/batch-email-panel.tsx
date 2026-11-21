"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  sendBatchCertificateEmailsAction,
  type BatchEmailResultSummary,
} from "@/actions/certificate.action";

interface BatchEmailPanelProps {
  competitions: Array<{ id: string; name: string }>;
  totalEligibleUnsent: number;
  totalAlreadySent: number;
}

export function BatchEmailPanel({
  competitions,
  totalEligibleUnsent,
  totalAlreadySent,
}: BatchEmailPanelProps) {
  const router = useRouter();
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("ALL");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BatchEmailResultSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSendBatch() {
    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const res = await sendBatchCertificateEmailsAction({
        competitionId: selectedCompetitionId,
        batchSize: 25,
      });

      if (res.data) {
        setResult(res.data);
      }

      if (!res.success) {
        setError(res.error || "Gagal mengirim batch email e-Syahadah.");
        return;
      }

      setMessage(
        res.message || "Pengiriman batch email e-Syahadah selesai diproses."
      );
      router.refresh();
    } catch {
      setError("Terjadi kesalahan saat memproses pengiriman batch email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card-surface p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand">
            <Mail className="h-4 w-4" />
            <span>Distribusi Email e-Syahadah Otomatis (Maks. 25 Email / Batch)</span>
          </div>
          <p className="mt-1 text-xs text-ink-secondary">
            Mengirimkan email apresiasi beserta tautan unduh langsung PDF
            e-Syahadah kepada peserta yang berstatus{" "}
            <strong>VERIFIED (Lunas)</strong> dan <strong>Hadir Hari-H</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 px-3 py-2">
            <span className="text-ink-muted">Siap Kirim: </span>
            <span className="tabular-data font-bold text-amber-700">
              {totalEligibleUnsent} Peserta
            </span>
          </div>
          <div className="rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 px-3 py-2">
            <span className="text-ink-muted">Terkirim: </span>
            <span className="tabular-data font-bold text-brand">
              {totalAlreadySent} Peserta
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[#2A2622]/12 pt-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="batchCompetitionFilter"
            className="text-xs font-medium text-ink-secondary whitespace-nowrap"
          >
            Target Cabang Lomba:
          </label>
          <select
            id="batchCompetitionFilter"
            value={selectedCompetitionId}
            onChange={(e) => setSelectedCompetitionId(e.target.value)}
            className="input-field py-1.5 px-3 text-xs max-w-xs"
          >
            <option value="ALL">Semua Cabang Lomba</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={sending || totalEligibleUnsent === 0}
          onClick={handleSendBatch}
          className="btn-primary text-xs py-2 px-4"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Mengirim Batch (Maks. 25)...</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              <span>Kirim Batch Email e-Syahadah (Maks. 25)</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-brand-border bg-brand-light p-3 text-xs font-medium text-brand">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{message}</p>
            {result && (
              <p className="mt-0.5">
                Terkirim: {result.sentCount} • Gagal: {result.failedCount} •
                Sisa Antrean: {result.remainingEligibleCount}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error}</p>
            {result?.errors && result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {result.errors.map((errItem, idx) => (
                  <li key={idx}>{errItem}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

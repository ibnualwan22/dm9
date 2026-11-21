"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  UserCheck,
  FileSpreadsheet,
  Lock,
  Unlock,
  Edit3,
  Check,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { PaymentStatus } from "@prisma/client";
import {
  toggleParticipantPresenceAction,
  bulkMarkParticipantsPresentAction,
  updateParticipantNameByAdminAction,
} from "@/actions/participant.action";

export interface AdminParticipantRow {
  id: string;
  fullName: string;
  role: string;
  isPresent: boolean;
  isNameLocked: boolean;
  certificateNumber: string | null;
  certificateSentAt: string | null;
  registration: {
    id: string;
    registrationCode: string;
    teamName: string | null;
    institution: string;
    leaderEmail: string;
    leaderPhone: string;
    paymentStatus: PaymentStatus;
    paymentAmount: number;
    competition: {
      id: string;
      name: string;
      type: "INDIVIDUAL" | "TEAM";
    };
  };
}

interface ParticipantTableProps {
  participants: AdminParticipantRow[];
  competitions: Array<{ id: string; name: string }>;
}

export function ParticipantTable({
  participants,
  competitions,
}: ParticipantTableProps) {
  const router = useRouter();

  // Filter States (Unified Page-Level Control Bar)
  const [competitionFilter, setCompetitionFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">(
    "ALL"
  );
  const [presenceFilter, setPresenceFilter] = useState<
    "ALL" | "PRESENT" | "ABSENT"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Action Loading States
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editLockValue, setEditLockValue] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      if (
        competitionFilter !== "ALL" &&
        p.registration.competition.id !== competitionFilter
      ) {
        return false;
      }

      if (
        paymentFilter !== "ALL" &&
        p.registration.paymentStatus !== paymentFilter
      ) {
        return false;
      }

      if (presenceFilter === "PRESENT" && !p.isPresent) return false;
      if (presenceFilter === "ABSENT" && p.isPresent) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      return (
        p.fullName.toLowerCase().includes(q) ||
        p.registration.registrationCode.toLowerCase().includes(q) ||
        p.registration.institution.toLowerCase().includes(q) ||
        (p.registration.teamName &&
          p.registration.teamName.toLowerCase().includes(q)) ||
        p.registration.leaderPhone.includes(q) ||
        (p.certificateNumber &&
          p.certificateNumber.toLowerCase().includes(q))
      );
    });
  }, [
    participants,
    competitionFilter,
    paymentFilter,
    presenceFilter,
    searchQuery,
  ]);

  async function handleTogglePresence(
    participantId: string,
    nextState: boolean
  ) {
    setTogglingId(participantId);
    try {
      const res = await toggleParticipantPresenceAction(
        participantId,
        nextState
      );
      if (res.success) {
        router.refresh();
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleBulkPresence(markAsPresent: boolean) {
    const ids = filteredParticipants.map((p) => p.id);
    if (ids.length === 0) return;

    setBulkLoading(true);
    setFeedback(null);
    try {
      const res = await bulkMarkParticipantsPresentAction(ids, markAsPresent);
      if (res.success) {
        setFeedback(res.message || "Pembaruan kehadiran massal berhasil.");
        router.refresh();
      }
    } finally {
      setBulkLoading(false);
    }
  }

  function startEditing(row: AdminParticipantRow) {
    setEditingId(row.id);
    setEditNameValue(row.fullName);
    setEditLockValue(row.isNameLocked);
  }

  async function saveAdminEdit(participantId: string) {
    if (editNameValue.trim().length < 3) return;
    setSavingEdit(true);
    try {
      const res = await updateParticipantNameByAdminAction(
        participantId,
        editNameValue,
        editLockValue
      );
      if (res.success) {
        setEditingId(null);
        router.refresh();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  function handleExportData(format: "xlsx" | "csv") {
    const rows = filteredParticipants.map((p, index) => ({
      No: index + 1,
      "Kode Pendaftaran": p.registration.registrationCode,
      "Cabang Lomba": p.registration.competition.name,
      "Nama Lengkap Peserta": p.fullName,
      Peran: p.role,
      "Nama Tim": p.registration.teamName || "-",
      "Asal Instansi": p.registration.institution,
      "No. WhatsApp": p.registration.leaderPhone,
      Email: p.registration.leaderEmail,
      "Status Bayar": p.registration.paymentStatus,
      "Nominal Transfer": p.registration.paymentAmount,
      "Kehadiran Hari-H": p.isPresent ? "HADIR" : "BELUM HADIR",
      "Status Kunci Nama": p.isNameLocked ? "TERKUNCI" : "BELUM",
      "Nomor e-Syahadah": p.certificateNumber || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Peserta DM9");

    const timestamp = new Date().toISOString().slice(0, 10);
    if (format === "xlsx") {
      XLSX.writeFile(workbook, `Peserta-Dies-Miladis-9-${timestamp}.xlsx`);
    } else {
      XLSX.writeFile(workbook, `Peserta-Dies-Miladis-9-${timestamp}.csv`, {
        bookType: "csv",
      });
    }
  }

  return (
    <div className="space-y-4">
      {/* Unified Page-Level Control Bar */}
      <div className="card-surface p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="filterCompetition"
              className="block text-[11px] font-semibold text-ink-secondary mb-1"
            >
              Filter Cabang Lomba
            </label>
            <select
              id="filterCompetition"
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">Semua Cabang Lomba</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filterPayment"
              className="block text-[11px] font-semibold text-ink-secondary mb-1"
            >
              Status Pembayaran
            </label>
            <select
              id="filterPayment"
              value={paymentFilter}
              onChange={(e) =>
                setPaymentFilter(e.target.value as PaymentStatus | "ALL")
              }
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">Semua Status Bayar</option>
              <option value="VERIFIED">VERIFIED (Lunas)</option>
              <option value="WAITING">WAITING (Antrean TF)</option>
              <option value="PENDING">PENDING (Kunci Kuota)</option>
              <option value="REJECTED">REJECTED (Ditolak)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="filterPresence"
              className="block text-[11px] font-semibold text-ink-secondary mb-1"
            >
              Status Kehadiran Hari-H
            </label>
            <select
              id="filterPresence"
              value={presenceFilter}
              onChange={(e) =>
                setPresenceFilter(
                  e.target.value as "ALL" | "PRESENT" | "ABSENT"
                )
              }
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">Semua Kehadiran</option>
              <option value="PRESENT">Sudah Hadir (isPresent = true)</option>
              <option value="ABSENT">Belum Hadir</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="searchParticipantInput"
              className="block text-[11px] font-semibold text-ink-secondary mb-1"
            >
              Cari Peserta / Instansi / Kode
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-ink-muted" />
              <input
                id="searchParticipantInput"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama, DM9-XXXX, instansi, WA..."
                className="input-field pl-9 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Toolbar: Bulk Attendance & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2622]/12 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkLoading || filteredParticipants.length === 0}
              onClick={() => handleBulkPresence(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {bulkLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              <span>
                Tandai Hadir Semua Terfilter ({filteredParticipants.length})
              </span>
            </button>

            <button
              type="button"
              disabled={bulkLoading || filteredParticipants.length === 0}
              onClick={() => handleBulkPresence(false)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Reset Kehadiran Terfilter
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportData("xlsx")}
              disabled={filteredParticipants.length === 0}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-brand" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportData("csv")}
              disabled={filteredParticipants.length === 0}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV (.csv)</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-brand-border bg-brand-light p-3 text-xs font-semibold text-brand">
          {feedback}
        </div>
      )}

      {/* Tabel Data Peserta */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#2A2622]/12 bg-[#FFFFFC]/50 text-xs font-semibold text-ink-secondary">
              <tr>
                <th className="px-4 py-3.5">Kode &amp; Lomba</th>
                <th className="px-4 py-3.5">Nama Peserta (Ejaan Sertifikat)</th>
                <th className="px-4 py-3.5">Instansi &amp; Kontak WA</th>
                <th className="px-4 py-3.5 text-center">Status Bayar</th>
                <th className="px-4 py-3.5 text-center">Absensi Hari-H</th>
                <th className="px-4 py-3.5 text-center">e-Syahadah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4DF]">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-ink-muted"
                  >
                    Tidak ada data peserta yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isEditing = editingId === p.id;
                  const canDownloadCert =
                    p.registration.paymentStatus === "VERIFIED" &&
                    p.isPresent &&
                    p.isNameLocked;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#FFFFFC]/50/60 transition-colors"
                    >
                      {/* Kolom 1: Kode & Cabang Lomba */}
                      <td className="px-4 py-3.5 align-top">
                        <span className="tabular-data rounded bg-zinc-100 px-2 py-0.5 text-xs font-bold text-ink">
                          {p.registration.registrationCode}
                        </span>
                        <p className="mt-1 text-xs font-semibold text-ink">
                          {p.registration.competition.name}
                        </p>
                      </td>

                      {/* Kolom 2: Nama Peserta & Kunci Ejaan */}
                      <td className="px-4 py-3.5 align-top min-w-[240px]">
                        {isEditing ? (
                          <div className="space-y-2 rounded-lg border border-brand bg-[#FFFFFC]/75 p-2.5">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="input-field py-1 px-2 text-xs"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <label className="inline-flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editLockValue}
                                  onChange={(e) =>
                                    setEditLockValue(e.target.checked)
                                  }
                                  className="rounded border-zinc-300 text-brand"
                                />
                                <span>Kunci Ejaan Nama</span>
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={savingEdit}
                                  onClick={() => saveAdminEdit(p.id)}
                                  className="rounded bg-brand p-1 text-white hover:bg-brand-hover"
                                  aria-label="Simpan perubahan nama"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="rounded bg-zinc-200 p-1 text-zinc-700 hover:bg-zinc-300"
                                  aria-label="Batal edit nama"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-ink">
                                {p.fullName}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditing(p)}
                                aria-label={`Edit nama ${p.fullName}`}
                                className="text-ink-muted hover:text-brand"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-ink-secondary">
                                {p.role}
                              </span>
                              {p.isNameLocked ? (
                                <span className="inline-flex items-center gap-1 rounded bg-brand-light px-1.5 py-0.5 font-semibold text-brand">
                                  <Lock className="h-3 w-3" />
                                  <span>Nama Terkunci</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
                                  <Unlock className="h-3 w-3" />
                                  <span>Belum Dikunci</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Kolom 3: Instansi & Kontak */}
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-medium text-ink text-xs">
                          {p.registration.teamName
                            ? `${p.registration.teamName} — ${p.registration.institution}`
                            : p.registration.institution}
                        </p>
                        <p className="tabular-data text-xs text-ink-muted mt-0.5">
                          WA: {p.registration.leaderPhone}
                        </p>
                      </td>

                      {/* Kolom 4: Status Bayar */}
                      <td className="px-4 py-3.5 align-top text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                            p.registration.paymentStatus === "VERIFIED"
                              ? "bg-brand-light text-brand"
                              : p.registration.paymentStatus === "WAITING"
                                ? "bg-amber-100 text-amber-800"
                                : p.registration.paymentStatus === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {p.registration.paymentStatus}
                        </span>
                      </td>

                      {/* Kolom 5: Switch Kehadiran Hari-H */}
                      <td className="px-4 py-3.5 align-top text-center">
                        <button
                          type="button"
                          disabled={togglingId === p.id}
                          onClick={() =>
                            handleTogglePresence(p.id, !p.isPresent)
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            p.isPresent
                              ? "bg-brand text-white"
                              : "border border-[#2A2622]/12 bg-[#FFFFFC]/75 text-ink-secondary hover:border-[#2A2622]/25"
                          }`}
                        >
                          {togglingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          <span>{p.isPresent ? "Hadir" : "Tandai Hadir"}</span>
                        </button>
                      </td>

                      {/* Kolom 6: Aksi Unduh e-Syahadah */}
                      <td className="px-4 py-3.5 align-top text-center">
                        {canDownloadCert ? (
                          <div className="flex flex-col items-center gap-1">
                            <a
                              href={`/api/syahadah/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-brand-light border border-brand-border px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>PDF Syahadah</span>
                            </a>
                            <a
                              href={`/verifikasi/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-[11px] text-ink-muted hover:text-brand"
                            >
                              <span>Cek QR</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ink-muted">
                            {!p.isPresent
                              ? "Menunggu Absen"
                              : !p.isNameLocked
                                ? "Nama Belum Dikunci"
                                : "Belum Lunas"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

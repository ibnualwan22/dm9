"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit3,
  Trash2,
  Copy,
  Check,
  Pin,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  upsertAnnouncementAction,
  deleteAnnouncementAction,
} from "@/actions/announcement.action";
import { EVENT_CONFIG } from "@/lib/constants";
import { formatDateID, slugify } from "@/lib/utils";
import type { AnnouncementUpsertValues } from "@/lib/validations";

export interface AdminAnnouncementItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  isImportant: boolean;
  attachmentUrl: string | null;
  createdAt: string;
}

interface AnnouncementManagerProps {
  announcements: AdminAnnouncementItem[];
}

const EMPTY_FORM: AnnouncementUpsertValues = {
  id: undefined,
  title: "",
  slug: "",
  content: "",
  isImportant: false,
  attachmentUrl: "",
};

export function AnnouncementManager({
  announcements,
}: AnnouncementManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] =
    useState<AnnouncementUpsertValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setFormData(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEdit(item: AdminAnnouncementItem) {
    setFormData({
      id: item.id,
      title: item.title,
      slug: item.slug,
      content: item.content,
      isImportant: item.isImportant,
      attachmentUrl: item.attachmentUrl || "",
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await upsertAnnouncementAction(formData);
      if (!res.success) {
        setError(res.error || "Gagal menyimpan pengumuman.");
        return;
      }

      setMessage(res.message || "Pengumuman berhasil disimpan.");
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Hapus pengumuman "${title}"?`)) return;

    const res = await deleteAnnouncementAction(id);
    if (!res.success) {
      setError(res.error || "Gagal menghapus pengumuman.");
      return;
    }
    setMessage(res.message || "Pengumuman dihapus.");
    router.refresh();
  }

  async function handleCopyWhatsappBroadcast(item: AdminAnnouncementItem) {
    const lines = [
      `📢 *PENGUMUMAN RESMI ${EVENT_CONFIG.name.toUpperCase()}*`,
      item.isImportant ? `⚠️ *[INFORMASI PENTING]*` : ``,
      ``,
      `*${item.title}*`,
      ``,
      item.content,
      ...(item.attachmentUrl
        ? [``, `📎 *Unduh Lampiran / Dokumen:*`, item.attachmentUrl]
        : []),
      ``,
      `🌐 *Portal Resmi & Cek Status:*`,
      `${EVENT_CONFIG.appUrl}`,
      ``,
      `— _Panitia Pelaksana ${EVENT_CONFIG.name}_`,
    ].filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""));

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-secondary">
          Total {announcements.length} Pengumuman Diterbitkan
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-brand-border bg-brand-light p-3.5 text-xs font-semibold text-brand">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-surface p-6 space-y-4 border-brand"
        >
          <div className="flex items-center justify-between border-b border-[#2A2622]/12 pb-3">
            <h2 className="text-base font-bold text-ink">
              {formData.id ? "Edit Pengumuman" : "Terbitkan Pengumuman Baru"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label-field">Judul Pengumuman</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    title,
                    slug: prev.id ? prev.slug : slugify(title),
                  }));
                }}
                placeholder="Contoh: Jadwal Technical Meeting Seluruh Cabang Lomba"
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Slug URL</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                  }))
                }
                className="input-field font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="label-field">Isi Pengumuman Lengkap</label>
              <textarea
                rows={4}
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Tuliskan informasi detail yang akan ditampilkan di Landing Page dan format Broadcast WhatsApp..."
                className="input-field"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="label-field">
                Link Lampiran PDF / Dokumen (Opsional)
              </label>
              <input
                type="url"
                value={formData.attachmentUrl || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    attachmentUrl: e.target.value,
                  }))
                }
                placeholder="https://drive.google.com/..."
                className="input-field text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2A2622]/12 pt-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isImportant}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isImportant: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-brand"
              />
              <span>
                Sematkan sebagai Pengumuman Penting (Pin di Posisi Teratas)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary text-xs"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Simpan Pengumuman</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Daftar Pengumuman */}
      <div className="space-y-3">
        {announcements.map((item) => (
          <div
            key={item.id}
            className={`card-surface p-5 space-y-3 ${
              item.isImportant ? "border-amber-300 bg-[#FFFDF7]" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.isImportant && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    <Pin className="h-3 w-3" />
                    <span>Penting</span>
                  </span>
                )}
                <span className="text-xs text-ink-muted">
                  {formatDateID(item.createdAt, true)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyWhatsappBroadcast(item)}
                  className="btn-primary py-1.5 px-3 text-xs"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Teks Broadcast WA Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Format Broadcast WA</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="btn-secondary py-1.5 px-2.5 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.title)}
                  aria-label={`Hapus ${item.title}`}
                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-base font-bold text-ink">{item.title}</h3>
            <p className="text-sm text-ink-secondary whitespace-pre-line">
              {item.content}
            </p>

            {item.attachmentUrl && (
              <div className="pt-1">
                <a
                  href={item.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  <span>Lampiran: {item.attachmentUrl}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

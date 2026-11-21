"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit3,
  Trash2,
  Power,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import {
  upsertCompetitionAction,
  toggleCompetitionActiveAction,
  deleteCompetitionAction,
} from "@/actions/competition.action";
import { formatRupiah, slugify } from "@/lib/utils";
import type { CompetitionUpsertValues } from "@/lib/validations";

export interface AdminCompetitionItem {
  id: string;
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "TEAM";
  quota: number;
  usedQuota: number;
  registrationFee: number;
  maxMembers: number;
  sopFileUrl: string;
  whatsappGroupUrl: string;
  contactPerson: string;
  contactName: string;
  isActive: boolean;
}

interface CompetitionManagerProps {
  competitions: AdminCompetitionItem[];
}

const EMPTY_FORM: CompetitionUpsertValues = {
  id: undefined,
  name: "",
  slug: "",
  type: "INDIVIDUAL",
  quota: 32,
  registrationFee: 75000,
  maxMembers: 1,
  sopFileUrl: "https://drive.google.com/",
  whatsappGroupUrl: "https://chat.whatsapp.com/",
  contactPerson: "081234567890",
  contactName: "Panitia Lomba",
  isActive: true,
};

export function CompetitionManager({ competitions }: CompetitionManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CompetitionUpsertValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function openCreateForm() {
    setFormData(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function openEditForm(item: AdminCompetitionItem) {
    setFormData({
      id: item.id,
      name: item.name,
      slug: item.slug,
      type: item.type,
      quota: item.quota,
      registrationFee: item.registrationFee,
      maxMembers: item.maxMembers,
      sopFileUrl: item.sopFileUrl,
      whatsappGroupUrl: item.whatsappGroupUrl,
      contactPerson: item.contactPerson,
      contactName: item.contactName,
      isActive: item.isActive,
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
      const res = await upsertCompetitionAction(formData);
      if (!res.success) {
        setError(res.error || "Gagal menyimpan cabang lomba.");
        return;
      }

      setMessage(res.message || "Cabang lomba berhasil disimpan.");
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, nextActive: boolean) {
    setError(null);
    setMessage(null);
    const res = await toggleCompetitionActiveAction(id, nextActive);
    if (!res.success) {
      setError(res.error || "Gagal mengubah status cabang lomba.");
      return;
    }
    setMessage(res.message || "Status cabang lomba diperbarui.");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus cabang lomba "${name}"?`
      )
    ) {
      return;
    }

    setError(null);
    setMessage(null);
    const res = await deleteCompetitionAction(id);
    if (!res.success) {
      setError(res.error || "Gagal menghapus cabang lomba.");
      return;
    }
    setMessage(res.message || "Cabang lomba berhasil dihapus.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-secondary">
          Total {competitions.length} Cabang Perlombaan Terdaftar
        </p>
        <button
          type="button"
          onClick={openCreateForm}
          className="btn-primary text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Cabang Lomba Baru</span>
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

      {/* Form Tambah / Edit Cabang Lomba */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-surface p-6 space-y-5 border-brand"
        >
          <div className="flex items-center justify-between border-b border-[#2A2622]/12 pb-3">
            <h2 className="text-base font-bold text-ink">
              {formData.id
                ? "Edit Cabang Perlombaan"
                : "Tambah Cabang Perlombaan Baru"}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label-field">Nama Cabang Lomba</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name,
                    slug: prev.id ? prev.slug : slugify(name),
                  }));
                }}
                placeholder="Contoh: Musabaqah Qira'atil Kutub"
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
                placeholder="mqk-fathul-muin"
                className="input-field font-mono text-xs"
              />
            </div>

            <div>
              <label className="label-field">Tipe Kepesertaan</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const nextType = e.target.value as "INDIVIDUAL" | "TEAM";
                  setFormData((prev) => ({
                    ...prev,
                    type: nextType,
                    maxMembers: nextType === "INDIVIDUAL" ? 1 : 3,
                  }));
                }}
                className="input-field"
              >
                <option value="INDIVIDUAL">INDIVIDUAL (Individu)</option>
                <option value="TEAM">TEAM (Beregu / Tim)</option>
              </select>
            </div>

            <div>
              <label className="label-field">Maksimal Anggota per Tim</label>
              <input
                type="number"
                min={1}
                max={30}
                disabled={formData.type === "INDIVIDUAL"}
                value={formData.type === "INDIVIDUAL" ? 1 : formData.maxMembers}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxMembers: Number(e.target.value),
                  }))
                }
                className="input-field tabular-data"
              />
            </div>

            <div>
              <label className="label-field">Total Kuota Slot</label>
              <input
                type="number"
                min={1}
                required
                value={formData.quota}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quota: Number(e.target.value),
                  }))
                }
                className="input-field tabular-data"
              />
            </div>

            <div>
              <label className="label-field">
                Biaya Pendaftaran (Rp — Isi 0 untuk Gratis)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={formData.registrationFee}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    registrationFee: Number(e.target.value),
                  }))
                }
                className="input-field tabular-data"
              />
            </div>

            <div>
              <label className="label-field">Nama Contact Person (CP)</label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactName: e.target.value,
                  }))
                }
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">No. WhatsApp CP</label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactPerson: e.target.value,
                  }))
                }
                className="input-field tabular-data"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">
                  Link PDF SOP / Juknis Lomba (Google Drive / URL)
                </label>
                <input
                  type="url"
                  required
                  value={formData.sopFileUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sopFileUrl: e.target.value,
                    }))
                  }
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="label-field">
                  Link Grup WhatsApp Resmi Cabang Lomba
                </label>
                <input
                  type="url"
                  required
                  value={formData.whatsappGroupUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      whatsappGroupUrl: e.target.value,
                    }))
                  }
                  className="input-field text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#2A2622]/12 pt-4">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-zinc-300 text-brand"
              />
              <span>Buka Pendaftaran Cabang Lomba Ini (Aktif)</span>
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
                <span>Simpan Cabang Lomba</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Daftar Cabang Lomba */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {competitions.map((comp) => (
          <div
            key={comp.id}
            className="card-surface p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    comp.isActive
                      ? "bg-brand-light text-brand"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {comp.isActive ? "Aktif (Dibuka)" : "Ditutup"}
                </span>
                <span className="tabular-data text-xs font-bold text-ink">
                  {formatRupiah(comp.registrationFee)}
                </span>
              </div>

              <h3 className="mt-2.5 text-base font-bold text-ink">
                {comp.name}
              </h3>
              <p className="font-mono text-xs text-ink-muted">/lomba/{comp.slug}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#2A2622]/12 bg-[#FFFFFC]/50 p-3 text-xs">
                <div>
                  <span className="text-ink-muted block">Kategori</span>
                  <span className="font-semibold text-ink">
                    {comp.type === "TEAM"
                      ? `Beregu (Maks. ${comp.maxMembers})`
                      : "Individu"}
                  </span>
                </div>
                <div>
                  <span className="text-ink-muted block">Terisi / Kuota</span>
                  <span className="tabular-data font-bold text-ink">
                    {comp.usedQuota} / {comp.quota} Slot
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-ink-muted block">Contact Person</span>
                  <span className="font-medium text-ink">
                    {comp.contactName} ({comp.contactPerson})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2A2622]/12 pt-3">
              <div className="flex items-center gap-2 text-xs">
                <a
                  href={comp.sopFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>SOP</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>•</span>
                <a
                  href={comp.whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Grup WA</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditForm(comp)}
                  className="btn-secondary py-1.5 px-2.5 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(comp.id, !comp.isActive)}
                  className="btn-secondary py-1.5 px-2.5 text-xs"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{comp.isActive ? "Tutup" : "Buka"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(comp.id, comp.name)}
                  aria-label={`Hapus ${comp.name}`}
                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

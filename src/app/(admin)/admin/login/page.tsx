"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { loginAdminAction } from "@/actions/admin-auth.action";
import { EVENT_CONFIG } from "@/lib/constants";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/admin";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdminAction(password);
      if (!res.success) {
        setError(res.error || "Kata sandi tidak valid.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan saat memverifikasi kredensial.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Portal Publik</span>
        </Link>

        <div className="card-surface p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">
                Autentikasi Panitia
              </h1>
              <p className="text-xs text-ink-secondary">
                Dashboard Internal &amp; Meja Bendahara {EVENT_CONFIG.name}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="adminPasswordInput" className="label-field">
                Kata Sandi Akses Panitia
              </label>
              <input
                id="adminPasswordInput"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi panitia..."
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AdminLoginForm />
    </Suspense>
  );
}

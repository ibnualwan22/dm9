"use server";

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/auth";
import type { ActionResponse } from "@/actions/registration.action";

export async function loginAdminAction(
  password: string
): Promise<ActionResponse> {
  if (!password || !verifyAdminPassword(password.trim())) {
    return {
      success: false,
      error: "Kata sandi panitia tidak sesuai. Silakan periksa kembali.",
    };
  }

  const { token, expiresAt } = await createAdminSessionToken();

  cookies().set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return {
    success: true,
    message: "Berhasil masuk ke Dashboard Panitia.",
  };
}

export async function logoutAdminAction(): Promise<ActionResponse> {
  cookies().delete(ADMIN_COOKIE_NAME);
  return {
    success: true,
    message: "Sesi panitia berhasil diakhiri.",
  };
}

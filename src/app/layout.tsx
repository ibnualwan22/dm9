import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google";
import { EVENT_CONFIG } from "@/lib/constants";
import { FeralFlowBackground } from "@/components/public/feral-flow-background";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${EVENT_CONFIG.name} — Portal Resmi Pendaftaran & e-Syahadah`,
    template: `%s | ${EVENT_CONFIG.name}`,
  },
  description: `${EVENT_CONFIG.tagline}. Portal pendaftaran lomba, cek status verifikasi pembayaran, dan unduh e-Syahadah resmi ${EVENT_CONFIG.name}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased selection:bg-[#FFAE3F]/30 selection:text-[#2A2622]">
        {/* Global Animated FeralUI FLOW Gradient Background: SAKURA MIST #FFE9C4 · SAPPAN ROSE #FFAE3F · SHELL WHITE #FFFFFC */}
        <FeralFlowBackground />

        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { formatDateID } from "@/lib/utils";

interface CountdownTimerProps {
  deadlineISO: string;
}

interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(deadlineISO: string): TimeLeft {
  const target = new Date(deadlineISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  return {
    totalMs: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function CountdownTimer({ deadlineISO }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(deadlineISO)
  );

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(deadlineISO));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadlineISO));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineISO]);

  const isClosed = mounted && timeLeft.totalMs <= 0;

  return (
    <div className="border-y border-[#2A2622]/15 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand">
            <Clock className="h-4 w-4" />
            <span>Batas Akhir Pendaftaran</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#2A2622]">
            {formatDateID(deadlineISO, true)}
          </p>
        </div>

        {isClosed ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-red-300/60 bg-red-50/80 px-3.5 py-2 text-xs font-semibold text-red-700 backdrop-blur-md">
            <AlertCircle className="h-4 w-4" />
            <span>Waktu Pendaftaran Telah Berakhir</span>
          </div>
        ) : (
          <div
            className="grid grid-cols-4 gap-2 sm:gap-3"
            aria-label="Hitung mundur penutupan pendaftaran"
          >
            {[
              { label: "Hari", value: mounted ? timeLeft.days : 0 },
              { label: "Jam", value: mounted ? timeLeft.hours : 0 },
              { label: "Menit", value: mounted ? timeLeft.minutes : 0 },
              { label: "Detik", value: mounted ? timeLeft.seconds : 0 },
            ].map((unit) => (
              <div
                key={unit.label}
                className="flex flex-col items-center justify-center rounded-xl border border-[#2A2622]/12 bg-[#FFFFFC]/45 px-3 py-2 min-w-[66px] backdrop-blur-md"
              >
                <span className="tabular-data text-xl sm:text-2xl font-bold text-[#2A2622]">
                  {String(unit.value).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-medium text-ink-secondary">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

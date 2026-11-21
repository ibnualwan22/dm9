"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Jeda animasi dalam milidetik (untuk efek berurutan). */
  delay?: number;
}

/**
 * Pembungkus animasi reveal saat elemen masuk viewport (scroll ke bawah).
 * Tanpa library tambahan — memakai IntersectionObserver + CSS di globals.css.
 * Menghormati prefers-reduced-motion (langsung tampil tanpa animasi).
 */
export function Reveal({ children, className = "", delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

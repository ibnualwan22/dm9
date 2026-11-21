"use client";

import { useEffect, useRef } from "react";

/**
 * FeralUI Gradient Studio — Authentic Animated "FLOW" Engine
 * Palette: SAKURA MIST #FFE9C4 · SAPPAN ROSE #FFAE3F · SHELL WHITE #FFFFFC
 * Ported 1:1 from FeralUI JapaneseGradients FLOW renderer (pF) with 60fps animation.
 */

const STOPS_RGB: [number, number, number][] = [
  [255, 233, 196], // SAKURA MIST #FFE9C4
  [255, 174, 63],  // SAPPAN ROSE #FFAE3F
  [255, 255, 252], // SHELL WHITE #FFFFFC
];

// Balanced stop weights so Sappan Rose (#FFAE3F) and Shell White (#FFFFFC)
// create a rich, expressive wave sweep across Sakura Mist (#FFE9C4)
const STOP_WEIGHTS = [0.95, 1.25, 0.95];

const FLOW_PARAMS = {
  scale: 48,
  distortion: 64,
  swirl: 14,
};

const INITIAL_FLOW_T = 20.75; // FeralUI `xe` constant
const FLOW_SPEED = 0.55; // Smooth organic flow velocity (rad/sec)

function fract(x: number): number {
  return x - Math.floor(x);
}

function smoothstep01(x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  return t * t * (3 - 2 * t);
}

function getStopCenter(index: number, t: number): [number, number] {
  const s = index * 0.37;
  const freqX = 0.6 + fract(index / 3) * 0.9;
  const freqY = 0.8 + fract((index + 1) / 4);
  return [
    0.5 + 0.42 * Math.sin(t * freqX + s),
    0.5 + 0.42 * Math.cos(t * freqY + s * 1.5),
  ];
}

export function FeralFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // FeralUI animated preview internal resolution (wF=240, SF=150)
    const width = 220;
    const height = 138;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const f = FLOW_PARAMS.distortion / 100;
    const p = FLOW_PARAMS.swirl / 100;
    const g = 0.4 + (FLOW_PARAMS.scale / 100) * 1.2;

    let flowT = INITIAL_FLOW_T;
    let lastTime = performance.now();
    let animId = 0;
    let isCancelled = false;

    const renderFrame = (now: number) => {
      if (isCancelled) return;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      flowT += dt * FLOW_SPEED;

      const c0 = getStopCenter(0, flowT);
      const c1 = getStopCenter(1, flowT);
      const c2 = getStopCenter(2, flowT);

      const m0x = c0[0], m0y = c0[1];
      const m1x = c1[0], m1y = c1[1];
      const m2x = c2[0], m2y = c2[1];

      const r0 = STOPS_RGB[0][0], g0 = STOPS_RGB[0][1], b0 = STOPS_RGB[0][2];
      const r1 = STOPS_RGB[1][0], g1 = STOPS_RGB[1][1], b1 = STOPS_RGB[1][2];
      const r2 = STOPS_RGB[2][0], g2 = STOPS_RGB[2][1], b2 = STOPS_RGB[2][2];

      const w0 = STOP_WEIGHTS[0];
      const w1 = STOP_WEIGHTS[1];
      const w2 = STOP_WEIGHTS[2];

      let ptr = 0;
      for (let E = 0; E < height; E++) {
        const j = (E + 0.5) / height;
        const yBase = (j - 0.5) / g + 0.5;

        for (let D = 0; D < width; D++) {
          let T = ((D + 0.5) / width - 0.5) / g + 0.5;
          let y = yBase;

          const dx0 = T - 0.5;
          const dy0 = y - 0.5;
          const S = smoothstep01(Math.hypot(dx0, dy0));
          const v = 1 - S;

          // Octave 1
          const py1 = smoothstep01(y);
          T +=
            f *
            v *
            Math.sin(flowT + 0.4 * py1) *
            Math.cos(0.2 * flowT + 2.4 * py1);
          const pt1 = smoothstep01(T);
          y += f * v * Math.cos(flowT + 2.0 * pt1);

          // Octave 2
          const py2 = smoothstep01(y);
          T +=
            0.5 *
            f *
            v *
            Math.sin(flowT + 0.8 * py2) *
            Math.cos(0.2 * flowT + 4.8 * py2);
          const pt2 = smoothstep01(T);
          y += 0.5 * f * v * Math.cos(flowT + 4.0 * pt2);

          // Swirl rotation
          const w = 3 * p * S;
          const cosW = Math.cos(-w);
          const sinW = Math.sin(-w);
          const L = T - 0.5;
          const k = y - 0.5;
          T = cosW * L - sinW * k + 0.5;
          y = sinW * L + cosW * k + 0.5;

          // Inverse-distance squared mesh blending
          const d0x = T - m0x, d0y = y - m0y;
          const z0 = d0x * d0x + d0y * d0y;
          const Y0 = w0 / (z0 * z0 + 1e-4);

          const d1x = T - m1x, d1y = y - m1y;
          const z1 = d1x * d1x + d1y * d1y;
          const Y1 = w1 / (z1 * z1 + 1e-4);

          const d2x = T - m2x, d2y = y - m2y;
          const z2 = d2x * d2x + d2y * d2y;
          const Y2 = w2 / (z2 * z2 + 1e-4);

          const invB = 1 / Math.max(1e-4, Y0 + Y1 + Y2);

          data[ptr] = (r0 * Y0 + r1 * Y1 + r2 * Y2) * invB;
          data[ptr + 1] = (g0 * Y0 + g1 * Y1 + g2 * Y2) * invB;
          data[ptr + 2] = (b0 * Y0 + b1 * Y1 + b2 * Y2) * invB;
          data[ptr + 3] = 255;
          ptr += 4;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame(lastTime);

    return () => {
      isCancelled = true;
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="gradient" role="img" aria-label="Untitled blend">
      {/* Live Animated FeralUI FLOW Field Canvas */}
      <canvas
        ref={canvasRef}
        className="h-full w-full block object-cover"
        style={{
          width: "100%",
          height: "100%",
          imageRendering: "auto",
        }}
      />
      {/* Authentic FeralUI Grain Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/backgrounds/feral-grain.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.075,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}

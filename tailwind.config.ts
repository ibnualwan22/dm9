import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        canvas: "#FFE9C4",
        surface: "#FFFFFC",
        feral: {
          sakura: "#FFE9C4",
          sappan: "#FFAE3F",
          shell: "#FFFFFC",
          ink: "#2A2622",
        },
        ink: {
          DEFAULT: "#2A2622",
          secondary: "#4A433C",
          muted: "#786F65",
        },
        brand: {
          DEFAULT: "#B45309",
          hover: "#92400E",
          light: "#FEF3C7",
          border: "#F59E0B",
        },
        amber: {
          accent: "#D97706",
          light: "#FFFBEB",
        },
      },
    },
  },
  plugins: [],
};

export default config;

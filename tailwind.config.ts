import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Plug & Play Trading design system tokens
        pp: {
          bg: "#0F100F",
          "bg-elevated": "#1A1C1A",
          "bg-deep": "#062D17",
          black: "#000000",
          brand: "#64E79E",
          "brand-dark": "#235137",
          "brand-deep": "#062D17",
          "accent-hover": "#4FD589",
          "accent-press": "#3CC078",
          fg: "#FFFFFF",
          "fg-muted": "#A8AFA9",
          "fg-subtle": "#6E756F",
          "fg-on-light": "#0A0630",
          up: "#64E79E",
          down: "#FF6B6B",
          flat: "#A8AFA9",
          border: "#FFFFFF14",
          "border-strong": "#FFFFFF26",
        },
        // Legacy aliases — every existing page using `midnight` / `accent`
        // automatically gets the new look without code changes.
        midnight: {
          DEFAULT: "#0F100F",
          dark: "#000000",
          light: "#1A1C1A",
          50: "#235137",
        },
        accent: {
          DEFAULT: "#64E79E",
          dim: "#4FD589",
        },
      },
      borderRadius: {
        "pp-sm": "8px",
        "pp-md": "12px",
        "pp-lg": "16px",
        "pp-xl": "24px",
        "pp-2xl": "32px",
        "pp-pill": "9999px",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)"],
      },
      boxShadow: {
        "pp-sm": "0 1px 2px rgba(0,0,0,.4)",
        "pp-md": "0 4px 16px rgba(0,0,0,.5)",
        "pp-lg": "0 12px 40px rgba(0,0,0,.55)",
        "pp-glow": "0 0 0 4px rgba(100,231,158,.18), 0 8px 32px rgba(100,231,158,.25)",
      },
      transitionTimingFunction: {
        "pp-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
export default config;

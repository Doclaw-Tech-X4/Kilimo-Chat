/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f7e39",
          dark: "#0d6b32",
          light: "#16813a",
          soft: "#2b8b3a",
          pale: "#e6f5e9",
          container: "#c8e6c8",
        },
        accent: {
          DEFAULT: "#eab308",
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        body: ["Lexend", "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 44, 24, 0.06), 0 8px 24px rgba(16, 44, 24, 0.05)",
        "card-hover": "0 4px 12px rgba(16, 44, 24, 0.10), 0 16px 40px rgba(16, 44, 24, 0.08)",
        soft: "0 10px 40px rgba(15, 126, 57, 0.18)",
      },
      animation: {
        "fade-in": "fadeIn .45s ease-out both",
        "fade-in-up": "fadeInUp .55s ease-out both",
        "scale-in": "scaleIn .3s ease-out both",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseRing: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".45" },
        },
      },
    },
  },
  plugins: [],
};
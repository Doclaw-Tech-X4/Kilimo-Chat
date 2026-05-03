/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Semantic tokens used by RecordPage (Material-style names)
      colors: {
        primary: {
          DEFAULT: "#1f8d46",
          fixed: "#0d6b32",
          container: "#c8e6c8",
        },
        secondary: {
          DEFAULT: "#5c5c5c",
          fixed: "#f0f0f0",
          container: "#e8e8e8",
        },
        "on-background": "#1a1a1a",
        "on-primary-container": "#0d2d16",
        "on-secondary-fixed": "#2d2d2d",
      },
      spacing: {
        "container-padding": "1.25rem",
      },
      fontFamily: {
        headline: [
          '"Plus Jakarta Sans"',
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        body: ["Lexend", "system-ui", "Segoe UI", "sans-serif"],
        "label-lg": [
          '"Plus Jakarta Sans"',
          "system-ui",
          "sans-serif",
        ],
        "button-text": [
          '"Plus Jakarta Sans"',
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};


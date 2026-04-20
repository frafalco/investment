/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        surface: "#141414",
        "surface-hi": "#1F1F1F",
        border: "#262626",
        muted: "#737373",
        soft: "#A3A3A3",
        primary: "#007AFF",
        "primary-hi": "#3395FF",
        success: "#00FF88",
        danger: "#FF3B30",
        warning: "#F59E0B",
      },
      fontFamily: {
        heading: ["Chivo", "ui-sans-serif", "system-ui"],
        body: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 10px 40px -20px rgba(0,122,255,0.35)",
      },
      animation: {
        "pulse-dot": "pulsedot 1.8s ease-in-out infinite",
        "slide-up": "slideup 0.4s ease-out",
      },
      keyframes: {
        pulsedot: {
          "0%,100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.5, transform: "scale(1.4)" },
        },
        slideup: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

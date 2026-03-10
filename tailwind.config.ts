import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      colors: {
        status: {
          active: "#dcfce7",
          "active-border": "#16a34a",
          due: "#fef9c3",
          "due-border": "#ca8a04",
          grace: "#ffedd5",
          "grace-border": "#ea580c",
          expired: "#fee2e2",
          "expired-border": "#dc2626",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "zoom-in-95": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" },
        },
        "zoom-out-95": {
          from: { transform: "scale(1)" },
          to: { transform: "scale(0.95)" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-4px)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "zoom-in-95": "zoom-in-95 0.15s ease-out",
        "zoom-out-95": "zoom-out-95 0.15s ease-in",
        "slide-in-from-top": "slide-in-from-top 0.2s ease-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        ".animate-in": {
          animationDuration: "150ms",
          animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          animationFillMode: "forwards",
        },
        ".animate-out": {
          animationDuration: "150ms",
          animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
          animationFillMode: "forwards",
        },
        ".fade-in-0": { animationName: "fade-in" },
        ".fade-out-0": { animationName: "fade-out" },
        ".zoom-in-95": { animationName: "zoom-in-95" },
        ".zoom-out-95": { animationName: "zoom-out-95" },
        ".slide-in-from-left-1\\/2": {},
        ".slide-in-from-top-\\[48\\%\\]": {},
        ".slide-out-to-left-1\\/2": {},
        ".slide-out-to-top-\\[48\\%\\]": {},
      });
    },
  ],
} satisfies Config;

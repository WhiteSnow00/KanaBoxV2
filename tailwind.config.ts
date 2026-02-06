import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        status: {
          active: "#dcfce7", // green-100
          "active-border": "#16a34a", // green-600
          due: "#fef9c3", // yellow-100
          "due-border": "#ca8a04", // yellow-600
          grace: "#ffedd5", // orange-100
          "grace-border": "#ea580c", // orange-600
          expired: "#fee2e2", // red-100
          "expired-border": "#dc2626", // red-600
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

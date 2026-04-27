import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#0a0a0a", 800: "#111111", 700: "#1f1f1f" },
        accent: { DEFAULT: "#6366f1", hot: "#ec4899", ok: "#10b981", warn: "#f59e0b" },
      },
      fontFamily: {
        display: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-fade": "radial-gradient(ellipse at top, rgba(99,102,241,0.15), transparent 60%)",
      },
    },
  },
  plugins: [],
};
export default config;

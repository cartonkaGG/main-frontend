import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cb: {
          void: "#030308",
          panel: "#08060c",
          stroke: "#241418",
          flame: "#ff3131",
          red: "#ef4444",
          blood: "#5e0000",
          glow: "#ff3131",
        },
      },
      backgroundImage: {
        "cb-mesh":
          "radial-gradient(ellipse 80% 45% at 50% -25%, rgba(255,49,49,0.2), transparent), radial-gradient(ellipse 55% 35% at 100% 0%, rgba(239,68,68,0.12), transparent)",
      },
      animation: {
        marquee: "marquee 38s linear infinite",
        "ug-glow-pulse": "ug-glow-pulse 3.2s ease-in-out infinite",
        "ug-halo-spin": "ug-halo-spin 28s linear infinite",
        "ug-needle-idle": "ug-needle-idle 2.4s ease-in-out infinite",
        "ug-hub-breathe": "ug-hub-breathe 2.8s ease-in-out infinite",
        "ug-bar-shine": "ug-bar-shine 2.6s ease-in-out infinite",
        "ug-tick-fade": "ug-tick-fade 0.6s ease-out forwards",
        "ug-arc-soft": "ug-arc-soft 2.5s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "ug-glow-pulse": {
          "0%, 100%": { opacity: "0.32", transform: "scale(1)" },
          "50%": { opacity: "0.52", transform: "scale(1.04)" },
        },
        "ug-halo-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "ug-needle-idle": {
          "0%, 100%": {
            filter: "drop-shadow(0 0 8px rgba(255,70,70,0.55))",
          },
          "50%": {
            filter: "drop-shadow(0 0 16px rgba(255,90,90,0.95))",
          },
        },
        "ug-hub-breathe": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(220,38,38,0.22), inset 0 0 0 1px rgba(255,49,49,0.12)",
          },
          "50%": {
            boxShadow:
              "0 0 32px rgba(220,38,38,0.42), inset 0 0 0 1px rgba(255,80,80,0.2)",
          },
        },
        "ug-bar-shine": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        "ug-tick-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ug-arc-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

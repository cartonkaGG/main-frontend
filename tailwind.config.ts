import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
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
        "case-roulette-wait": "caseRouletteWait 0.48s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        caseRouletteWait: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-136px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

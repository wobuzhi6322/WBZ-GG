import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-base": "rgb(var(--wbz-base) / <alpha-value>)",
        "dark-surface": "rgb(var(--wbz-surface) / <alpha-value>)",
        wbz: {
          dark: "rgb(var(--wbz-dark) / <alpha-value>)",
          card: "rgb(var(--wbz-card) / <alpha-value>)",
          gold: "rgb(var(--wbz-gold) / <alpha-value>)",
          mute: "rgb(var(--wbz-mute) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        mono: ["var(--font-roboto-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;

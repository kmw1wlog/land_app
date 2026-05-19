import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        paper: "#f7f5ef",
        moss: "#2f5d50",
        coral: "#e26045",
        gold: "#d8a33f",
        sky: "#6fa8dc"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(20, 20, 20, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

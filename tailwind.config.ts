import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#142B4A",
          gold: "#C6A45C",
          cream: "#F8F6F0",
        },
      },
    },
  },
  plugins: [],
};

export default config;

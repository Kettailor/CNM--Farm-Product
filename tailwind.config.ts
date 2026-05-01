import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ketkat: {
          la: "#2f855a",
          dat: "#8b5e3c",
          troi: "#0ea5e9",
        },
      },
    },
  },
  plugins: [],
};

export default config;


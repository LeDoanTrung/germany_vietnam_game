import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // GitHub Pages serves from /<repo>/, so the deploy sets VITE_BASE_URL.
  base: process.env.VITE_BASE_URL || "/",
  plugins: [vue()],
  server: {
    // 3000 is taken by the portfolio dev server.
    port: 3100,
    host: true,
  },
});

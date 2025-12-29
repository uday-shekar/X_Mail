import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 🔥 IMPORTANT: makes assets relative
  // fixes refresh + Render + Express serving
  base: "./",
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 🔥 Required for SPA routing on Render / Express
  base: "/",

  // 🔥 Build output goes directly into Backend
  build: {
    outDir: "../Backend/public",
    emptyOutDir: true,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",   // ✅ MUST be "/"
  // Vite automatically handles SPA routing in dev and preview modes
});

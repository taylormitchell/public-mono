import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Todo Web App",
        short_name: "Todo",
        start_url: "/",
        display: "standalone",
      },
    }),
  ],
  resolve: {
    alias: {
      "@common": path.resolve(__dirname, "../../packages/common"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});

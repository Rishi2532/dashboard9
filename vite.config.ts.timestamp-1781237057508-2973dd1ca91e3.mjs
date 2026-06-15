// vite.config.ts
import { defineConfig } from "file:///C:/Users/12626/dashboard8/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/12626/dashboard8/node_modules/@vitejs/plugin-react/dist/index.js";
import themePlugin from "file:///C:/Users/12626/dashboard8/node_modules/@replit/vite-plugin-shadcn-theme-json/dist/index.mjs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/12626/dashboard8/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("file:///C:/Users/12626/dashboard8/node_modules/@replit/vite-plugin-cartographer/dist/index.mjs").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    hmr: {
      overlay: false
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwxMjYyNlxcXFxkYXNoYm9hcmQ4XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwxMjYyNlxcXFxkYXNoYm9hcmQ4XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8xMjYyNi9kYXNoYm9hcmQ4L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGhlbWVQbHVnaW4gZnJvbSBcIkByZXBsaXQvdml0ZS1wbHVnaW4tc2hhZGNuLXRoZW1lLWpzb25cIjtcclxuaW1wb3J0IHBhdGgsIHsgZGlybmFtZSB9IGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgdGhlbWVQbHVnaW4oKSxcclxuICAgIC4uLihwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gXCJwcm9kdWN0aW9uXCIgJiZcclxuICAgICAgcHJvY2Vzcy5lbnYuUkVQTF9JRCAhPT0gdW5kZWZpbmVkXHJcbiAgICAgID8gW1xyXG4gICAgICAgIGF3YWl0IGltcG9ydChcIkByZXBsaXQvdml0ZS1wbHVnaW4tY2FydG9ncmFwaGVyXCIpLnRoZW4oKG0pID0+XHJcbiAgICAgICAgICBtLmNhcnRvZ3JhcGhlcigpLFxyXG4gICAgICAgICksXHJcbiAgICAgIF1cclxuICAgICAgOiBbXSksXHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJjbGllbnRcIiwgXCJzcmNcIiksXHJcbiAgICAgIFwiQHNoYXJlZFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcInNoYXJlZFwiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICByb290OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcImNsaWVudFwiKSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcImRpc3QvcHVibGljXCIpLFxyXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXHJcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBobXI6IHtcclxuICAgICAgb3ZlcmxheTogZmFsc2VcclxuICAgIH1cclxuICB9XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFRLFNBQVMsb0JBQW9CO0FBQ2xTLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFFBQVEsZUFBZTtBQUM5QixTQUFTLHFCQUFxQjtBQUptSSxJQUFNLDJDQUEyQztBQU1sTixJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksUUFBUSxVQUFVO0FBRXBDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLEdBQUksUUFBUSxJQUFJLGFBQWEsZ0JBQzNCLFFBQVEsSUFBSSxZQUFZLFNBQ3RCO0FBQUEsTUFDQSxNQUFNLE9BQU8sZ0dBQWtDLEVBQUU7QUFBQSxRQUFLLENBQUMsTUFDckQsRUFBRSxhQUFhO0FBQUEsTUFDakI7QUFBQSxJQUNGLElBQ0UsQ0FBQztBQUFBLEVBQ1A7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsVUFBVSxLQUFLO0FBQUEsTUFDNUMsV0FBVyxLQUFLLFFBQVEsV0FBVyxRQUFRO0FBQUEsSUFDN0M7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNLEtBQUssUUFBUSxXQUFXLFFBQVE7QUFBQSxFQUN0QyxPQUFPO0FBQUEsSUFDTCxRQUFRLEtBQUssUUFBUSxXQUFXLGFBQWE7QUFBQSxJQUM3QyxhQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsRUFDYjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

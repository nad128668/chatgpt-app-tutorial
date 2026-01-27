import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "http://localhost:5173/",
  plugins: [react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }), tailwindcss()],
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        "places-map": resolve(__dirname, "places-map/index.html"),
      },
      output: {
        manualChunks: undefined,
        entryFileNames: ({ name }) => `${name}/assets/[name].js`,
        // Put *all* chunks (if any) alongside the entry that imports them.
        // With manualChunks undefined, you should get very few chunks.
        chunkFileNames: ({ facadeModuleId }) => {
          // try to infer the page from where the chunk comes from
          const id = (facadeModuleId || "").replace(/\\/g, "/");
          const m = id.match(/\/src\/pages\/([^/]+)\//); // src/pages/<page>/
          const page = m?.[1] || "places-map"; // fallback
          return `${page}/assets/[name].js`;
        },

        // Put assets under the inferred page folder too
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name?.replace(/\\/g, "/") || "";
          const m = name.match(/src\/pages\/([^/]+)\//);
          const page = m?.[1] || "places-map";
          return `${page}/assets/[name][extname]`;
        },
      }
    },
  },
});

import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        arcade: resolve(__dirname, "index.html"),
        space: resolve(__dirname, "space.html"),
      },
    },
  },
});

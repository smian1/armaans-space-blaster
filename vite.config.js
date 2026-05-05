import { resolve } from "node:path";
import { defineConfig } from "vite";

function serveSnakeDirectoryIndex() {
  return {
    name: "serve-snake-directory-index",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const url = request.url?.split("?")[0];
        if (url === "/snake/" || url === "/snake") {
          request.url = "/snake/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [serveSnakeDirectoryIndex()],
  build: {
    rollupOptions: {
      input: {
        arcade: resolve(__dirname, "index.html"),
        space: resolve(__dirname, "space.html"),
      },
    },
  },
});

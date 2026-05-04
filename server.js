import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = process.env.PORT || 5174;
const root = join(process.cwd(), "dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function resolvePath(url) {
  const path = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const normalized = normalize(path).replace(/^(\.\.[/\\])+/, "");
  const target = join(root, normalized);

  if (existsSync(target) && statSync(target).isDirectory()) {
    return join(target, "index.html");
  }

  if (existsSync(target)) {
    return target;
  }

  return join(root, "index.html");
}

createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Serving Armaan's Arcade on port ${port}`);
});

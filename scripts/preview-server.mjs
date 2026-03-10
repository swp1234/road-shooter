import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const portArg = Number(process.argv[2]) || 5173;
const HOST = "127.0.0.1";

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function safeResolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const cleaned = decoded.startsWith("/") ? decoded.slice(1) : decoded;
  const candidate = cleaned === "" ? "index.html" : cleaned;
  const abs = path.resolve(ROOT, candidate);
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const reqPath = req.url || "/";
  const abs = safeResolvePath(reqPath);
  if (!abs) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  let target = abs;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }

  if (!fs.existsSync(target)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const type = mimeByExt[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  fs.createReadStream(target).pipe(res);
});

server.listen(portArg, HOST, () => {
  console.log(`Preview server: http://${HOST}:${portArg}`);
  console.log(`Root: ${ROOT}`);
});

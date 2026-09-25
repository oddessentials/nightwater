import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../docs", import.meta.url));
const base = "/nightwater/";
const port = Number(process.env.PORT) || 4190;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const compressible = /^(text\/|application\/(json|manifest|xml)|image\/svg)/;

async function resolve(pathname) {
  const file = normalize(join(root, decodeURIComponent(pathname)));
  if (file !== root && !file.startsWith(root + sep)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return resolve(join(pathname, "index.html"));
  return info?.isFile() ? file : null;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  if (pathname === base.slice(0, -1)) {
    response.writeHead(301, { location: base }).end();
    return;
  }
  let file = pathname.startsWith(base)
    ? await resolve(pathname.slice(base.length))
    : null;
  let status = 200;
  if (!file) {
    status = 404;
    file = pathname.startsWith(base) ? await resolve("404.html") : null;
  }
  if (!file) {
    response.writeHead(404, { "content-type": types[".txt"] }).end("404");
    return;
  }
  const type = types[extname(file)] ?? "application/octet-stream";
  let body = await readFile(file);
  const headers = { "content-type": type, "cache-control": "max-age=600" };
  const accepts = String(request.headers["accept-encoding"] ?? "");
  if (compressible.test(type) && /\bgzip\b/.test(accepts)) {
    body = gzipSync(body);
    headers["content-encoding"] = "gzip";
  }
  headers["content-length"] = body.length;
  response.writeHead(status, headers);
  response.end(request.method === "HEAD" ? undefined : body);
}).listen(port, "127.0.0.1", () =>
  console.log(`Nightwater site: http://127.0.0.1:${port}${base}`),
);

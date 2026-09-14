import { mkdir, readFile, writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { launch } from "./support/browser.mjs";
import { outlineWordmark } from "./support/wordmark.mjs";

// Renders every raster brand asset from the vector masters in art/.
// The masters are the source of truth; run `npm run art` after editing them.
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const preview = process.argv.includes("--preview");
const ORIGIN = "http://nightwater.art";

const ICON = "art/icon.svg";
const OG = "art/og-image.svg";
const variants = {
  tile: (svg) => svg,
  square: (svg) =>
    svg.replace(/(<clipPath id="tile">\s*<rect[^>]*?)rx="112"/, '$1rx="0"'),
};
const targets = [
  { file: "public/icon-512.png", source: ICON, size: 512 },
  { file: "public/icon-192.png", source: ICON, size: 192 },
  {
    file: "public/icon-maskable-512.png",
    source: ICON,
    size: 512,
    variant: "square",
  },
  {
    file: "public/apple-touch-icon.png",
    source: ICON,
    size: 180,
    variant: "square",
  },
  { file: "public/og-image.png", source: OG, width: 1200, height: 630 },
  {
    file: "art/exports/icon-1024.png",
    source: ICON,
    size: 1024,
    variant: "square",
  },
];
const icoFrames = [16, 32, 48];

const sized = (svg, width, height) =>
  svg.replace(
    /^(<svg[^>]*?)\swidth="\d+"\sheight="\d+"/,
    `$1 width="${width}" height="${height}"`,
  );
const html = (svg) =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block}</style>${svg}`;
const types = { svg: "image/svg+xml", ttf: "font/ttf", png: "image/png" };

const browser = await launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
let pageHtml = "";
await page.route(`${ORIGIN}/**`, async (route) => {
  const path = new URL(route.request().url()).pathname;
  if (path === "/render.html")
    return route.fulfill({ body: pageHtml, contentType: "text/html" });
  try {
    return route.fulfill({
      body: await readFile(`art${path}`),
      contentType: types[path.split(".").pop()] ?? "application/octet-stream",
    });
  } catch {
    return route.fulfill({ status: 404 });
  }
});
const sources = new Map();
const source = async (file) => {
  if (!sources.has(file)) sources.set(file, await readFile(file, "utf8"));
  return sources.get(file);
};

async function render({
  source: file,
  size,
  width = size,
  height = size,
  variant = "tile",
}) {
  const svg = variants[variant](sized(await source(file), width, height));
  pageHtml = html(svg);
  await page.setViewportSize({ width, height });
  await page.goto(`${ORIGIN}/render.html`);
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: true, type: "png" });
}

// Chromium screenshots are 8-bit RGBA, non-interlaced. Decode them for the BMP frames of the .ico.
function decodePng(png) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (png.readUInt8(24) !== 8 || png.readUInt8(25) !== 6 || png.readUInt8(28))
    throw new Error("expected an 8-bit RGBA, non-interlaced PNG");
  const idat = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const type = png.toString("ascii", at + 4, at + 8);
    if (type === "IDAT") idat.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a),
      pb = Math.abs(p - b),
      pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const b = y ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y ? pixels[(y - 1) * stride + x - 4] : 0;
      const v = raw[line + x];
      pixels[y * stride + x] =
        (filter === 0
          ? v
          : filter === 1
            ? v + a
            : filter === 2
              ? v + b
              : filter === 3
                ? v + ((a + b) >> 1)
                : v + paeth(a, b, c)) & 255;
    }
  }
  return { width, height, pixels };
}

// A classic .ico: 32-bit BGRA DIB frames with 1-bit AND masks, which every browser and Windows shell reads.
function packIco(frames) {
  const images = frames.map(({ width, height, pixels }) => {
    const maskStride = Math.ceil(width / 32) * 4;
    const dib = Buffer.alloc(40 + width * height * 4 + maskStride * height);
    dib.writeUInt32LE(40, 0);
    dib.writeInt32LE(width, 4);
    dib.writeInt32LE(height * 2, 8);
    dib.writeUInt16LE(1, 12);
    dib.writeUInt16LE(32, 14);
    dib.writeUInt32LE(width * height * 4 + maskStride * height, 20);
    let at = 40;
    for (let y = height - 1; y >= 0; y--)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        dib[at++] = pixels[i + 2];
        dib[at++] = pixels[i + 1];
        dib[at++] = pixels[i];
        dib[at++] = pixels[i + 3];
      }
    for (let y = height - 1; y >= 0; y--) {
      const row = at;
      for (let x = 0; x < width; x++)
        if (pixels[(y * width + x) * 4 + 3] === 0)
          dib[row + (x >> 3)] |= 0x80 >> (x & 7);
      at += maskStride;
    }
    return { width, height, dib };
  });
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ width, height, dib }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(width % 256, entry);
    header.writeUInt8(height % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(dib.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += dib.length;
  });
  return Buffer.concat([header, ...images.map(({ dib }) => dib)]);
}

try {
  await outlineWordmark();
  sources.clear();
  await mkdir("public", { recursive: true });
  await mkdir("art/exports", { recursive: true });
  for (const target of targets) {
    const png = await render(target);
    await writeFile(target.file, png);
    console.log(`${target.file}  ${png.length.toLocaleString("en-US")} bytes`);
  }
  const frames = [];
  for (const size of icoFrames)
    frames.push(decodePng(await render({ source: ICON, size })));
  const ico = packIco(frames);
  await writeFile("public/favicon.ico", ico);
  console.log(
    `public/favicon.ico  ${ico.length.toLocaleString("en-US")} bytes (16, 32, 48)`,
  );
  await writeFile("public/favicon.svg", await source(ICON));
  console.log("public/favicon.svg  copied from art/icon.svg");
  if (preview) {
    await mkdir("artifacts/art", { recursive: true });
    const sheet = [];
    for (const size of [16, 32, 48, 64, 128]) {
      const png = await render({ source: ICON, size });
      const zoom = size < 64 ? 8 : 4;
      sheet.push(
        `<figure><img src="data:image/png;base64,${png.toString("base64")}" width="${size * zoom}" height="${size * zoom}"><figcaption>${size}px</figcaption></figure>`,
      );
    }
    pageHtml = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#8a949c;font:12px monospace;color:#111;display:flex;gap:24px;align-items:flex-end}img{image-rendering:pixelated;display:block;background:#fff}figure{margin:0}figcaption{margin-top:6px}</style>${sheet.join("")}`;
    await page.setViewportSize({ width: 1400, height: 620 });
    await page.goto(`${ORIGIN}/render.html`);
    await writeFile("artifacts/art/favicon-sheet.png", await page.screenshot());
    console.log("artifacts/art/favicon-sheet.png  small sizes at 8x / 4x");
  }
} finally {
  await browser.close();
}

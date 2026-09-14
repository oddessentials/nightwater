import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (file: string) =>
  readFileSync(new URL(`../${file}`, import.meta.url));
const text = (file: string) => read(file).toString("utf8");

function pngSize(file: string) {
  const png = read(file);
  assert.equal(
    png.toString("hex", 0, 8),
    "89504e470d0a1a0a",
    `${file} is a PNG`,
  );
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("the icon family and social card are the sizes their consumers expect", () => {
  for (const [file, width, height] of [
    ["public/icon-192.png", 192, 192],
    ["public/icon-512.png", 512, 512],
    ["public/icon-maskable-512.png", 512, 512],
    ["public/apple-touch-icon.png", 180, 180],
    ["public/og-image.png", 1200, 630],
    ["art/exports/icon-1024.png", 1024, 1024],
  ] as const)
    assert.deepEqual(pngSize(file), { width, height }, file);
  assert.ok(
    read("public/og-image.png").length < 1_000_000,
    "og-image stays well under crawler limits",
  );
});

test("favicon.ico carries 16, 32 and 48 px 32-bit frames", () => {
  const ico = read("public/favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1, "icon resource type");
  const count = ico.readUInt16LE(4);
  assert.equal(count, 3);
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    sizes.push(ico.readUInt8(entry));
    assert.equal(
      ico.readUInt8(entry),
      ico.readUInt8(entry + 1),
      "square frame",
    );
    assert.equal(ico.readUInt16LE(entry + 6), 32, "32-bit frame");
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset + length <= ico.length, "frame lies inside the file");
    assert.equal(ico.readUInt32LE(offset), 40, "BITMAPINFOHEADER frame");
    assert.equal(
      ico.readInt32LE(offset + 8),
      sizes[i] * 2,
      "height counts the AND mask",
    );
  }
  assert.deepEqual(sizes, [16, 32, 48]);
});

test("the manifest and document reference icons that exist, at their real sizes", () => {
  const manifest = JSON.parse(text("public/manifest.webmanifest"));
  assert.equal(manifest.name, "Nightwater");
  assert.equal(manifest.theme_color, "#07191e");
  assert.ok(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  );
  for (const icon of manifest.icons) {
    const file = `public${icon.src}`;
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
    const { width, height } = pngSize(file);
    assert.equal(icon.sizes, `${width}x${height}`, file);
    assert.equal(icon.type, "image/png");
  }
  const html = text("index.html");
  for (const href of html.matchAll(
    /(?:href|content)="(?:%VITE_SITE_URL%)?(\/[^"]+\.(?:ico|svg|png|webmanifest))"/g,
  ))
    assert.ok(
      existsSync(new URL(`../public${href[1]}`, import.meta.url)),
      href[1],
    );
  const og = pngSize("public/og-image.png");
  assert.match(
    html,
    new RegExp(`property="og:image:width" content="${og.width}"`),
  );
  assert.match(
    html,
    new RegExp(`property="og:image:height" content="${og.height}"`),
  );
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"/);
  for (const env of [".env", ".env.production"])
    assert.match(
      text(env),
      /^VITE_SITE_URL=https?:\/\/\S+$/m,
      `${env} sets the site origin`,
    );
});

test("the shipped vectors are in sync with the masters and free of broken outlines", () => {
  const icon = text("art/icon.svg");
  assert.equal(
    text("public/favicon.svg"),
    icon,
    "run `npm run art` after editing art/icon.svg",
  );
  assert.match(
    icon,
    /@media \(max-width: 40px\)/,
    "the favicon simplifies itself at tab sizes",
  );
  const wordmark = text("art/wordmark.svg");
  const card = text("art/og-image.svg");
  const group = /<g class="wordmark">.*?<\/g>/s;
  assert.equal(
    card.match(group)?.[0],
    wordmark.match(group)?.[0],
    "the card carries the current lockup",
  );
  for (const [file, svg] of [
    ["art/icon.svg", icon],
    ["art/wordmark.svg", wordmark],
    ["art/og-image.svg", card],
  ])
    assert.doesNotMatch(svg, /NaN|undefined/, file);
  assert.equal(
    (wordmark.match(/<path /g) ?? []).length,
    2,
    "one path per line of the lockup",
  );
});

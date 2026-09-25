// Opens the game for frame-exact trailer capture. The dev server's main.ts is
// patched in flight (nothing in src/ changes): the pixel-ratio cap lifts so a
// 4K frame renders natively, the real-time loop stops drawing while QA frames
// are stepped manually, `?journey=` pins the question seed, and the ride state
// and input are exposed for the take scripts.
import { chromium } from "playwright";

export const BASE = process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";

const HIDE_CSS = `
#crosshair, #ride-hint, .control-hint, .tools, #touch-pad { display: none !important; }
#hud, #choices, #ride-bonus, #catch-toast, #ride-caption { transition: none !important; }
`;

const PATCHES = [
  ['quality === "high" ? 1.6 : 1', 'quality === "high" ? 8 : 1'],
  [
    "const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];",
    'const freshSeed = () => Number(params.get("journey")) || crypto.getRandomValues(new Uint32Array(1))[0];',
  ],
  [
    "\t\trender();\n\t\tframeCount++;",
    "\t\tif (!manualFrames) render();\n\t\tframeCount++;",
  ],
  [
    "Object.assign(window, { __nightwater: {",
    "Object.assign(window, { __nightwater: {\n\t\t\ttrailer: { input, state, camera, scene, renderer, composer, bloom, lens, render, journey: () => journey, basin: () => basin, clock: () => answerClock, tick: () => { manualNow += 1e3 / 60; }, now: () => manualNow, setNow: (ms) => { manualNow = ms; } },",
  ],
];

export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      "--ignore-gpu-blocklist",
      "--enable-webgl",
      "--enable-gpu-rasterization",
      "--use-angle=d3d11",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
}

export async function openGame(browser, { width, height, scale, query }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/src/main.ts", async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    for (const [from, to] of PATCHES) {
      if (!body.includes(from))
        throw new Error(`trailer patch anchor missing: ${from.slice(0, 40)}`);
      body = body.replace(from, to);
    }
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), "content-type": "text/javascript" },
    });
  });
  await page.goto(`${BASE}/?qa=1&music=&${query}`);
  await page.waitForFunction(() => !!window.__nightwater?.trailer);
  await page.addStyleTag({ content: HIDE_CSS });
  // Fonts: the math face loads lazily; force it before any frame is drawn.
  await page.evaluate(() => document.fonts.ready);
  const cdp = await context.newCDPSession(page);
  return { context, page, cdp, errors };
}

// A plain capture returns CSS pixels; the clip's scale asks for device pixels.
export async function screenshot(cdp, { width, height, scale }) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
    optimizeForSpeed: true,
    clip: { x: 0, y: 0, width, height, scale },
  });
  return Buffer.from(data, "base64");
}

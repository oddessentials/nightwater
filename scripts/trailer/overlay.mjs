// Renders the trailer typography as a transparent PNG sequence that the
// assembly composites over the captured game frames. The type is the brand
// system from art/README.md: Newsreader Display for lines and the lockup,
// Newsreader Text Italic for taglines, Inter Medium tracked caps for labels.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ASPECTS } from "./capture.mjs";
import { launchBrowser, screenshot } from "./page.mjs";

const FONTS = [
  ["Newsreader Display", "Newsreader-Display.ttf", "normal"],
  ["Newsreader Display", "Newsreader-DisplayItalic.ttf", "italic"],
  ["Newsreader Text", "Newsreader-TextItalic.ttf", "italic"],
  ["Inter Medium", "Inter-Medium.ttf", "normal"],
];

async function fontFaces() {
  const faces = [];
  for (const [family, file, style] of FONTS) {
    const data = await readFile(
      new URL(`../../art/fonts/${file}`, import.meta.url),
    );
    faces.push(
      `@font-face{font-family:"${family}";font-style:${style};src:url(data:font/ttf;base64,${data.toString("base64")}) format("truetype")}`,
    );
  }
  return faces.join("\n");
}

const CSS = `
html, body { margin: 0; background: transparent; overflow: hidden; }
body { width: var(--w); height: var(--h); position: relative; color: #eef3eb; font-family: "Inter Medium", Inter, Arial, sans-serif; }
.layer { position: absolute; inset: 0; pointer-events: none; }
.black { background: #000; }
.veil { background: linear-gradient(90deg, #020b14e6 0%, #020b1480 48%, #020b1400 85%); }
.portrait .veil { background: linear-gradient(180deg, #020b1400 0%, #020b1499 38%, #020b14f0 70%); }
.cue { position: absolute; left: 0; right: 0; text-align: center; will-change: transform, opacity; }
.eyebrow { font-size: 15px; letter-spacing: 4.8px; color: #d6e6df; text-shadow: 0 1px 4px #030c13cc, 0 4px 20px #030c13b3; }
.eyebrow i { display: inline-block; width: 6px; height: 6px; margin: 0 14px 2px 0; border-radius: 50%; background: #a3f0d6; box-shadow: 0 0 16px #80e9bc; vertical-align: middle; }
.line { font-family: "Newsreader Display", Georgia, serif; font-size: 64px; letter-spacing: -0.02em; line-height: 1.05; text-shadow: 0 2px 6px #030c13cc, 0 6px 40px #030c13b3; }
.line em { font-style: italic; color: #b9e4da; }
.small { font-family: "Newsreader Text", Georgia, serif; font-style: italic; font-size: 30px; color: #d1dfdc; letter-spacing: 0.01em; text-shadow: 0 2px 6px #030c13cc, 0 6px 30px #030c13b3; }
.lockup { position: absolute; text-align: left; font-family: "Newsreader Display", Georgia, serif; font-size: 190px; line-height: 0.85; letter-spacing: -0.03em; color: #eef3eb; text-shadow: 0 4px 60px #020b14b3; }
.lockup span { display: block; font-style: italic; color: #b9e4da; padding-left: 0.03em; }
.tag { position: absolute; text-align: left; font-family: "Newsreader Text", Georgia, serif; font-style: italic; font-size: 34px; line-height: 1.35; color: #d1dfdc; }
.url { position: absolute; text-align: left; font-size: 15px; letter-spacing: 4.4px; color: #cee1da; }
.url b { display: block; font-weight: normal; margin-top: 14px; font-size: 22px; letter-spacing: 1.4px; color: #eef3eb; }
.portrait .eyebrow { font-size: 12px; letter-spacing: 3.8px; }
.portrait .line { font-size: 40px; padding: 0 36px; }
.portrait .small { font-size: 21px; padding: 0 36px; }
.portrait .lockup { font-size: 112px; text-align: center; left: 0; right: 0; }
.portrait .tag { font-size: 22px; text-align: center; left: 0; right: 0; padding: 0 36px; }
.portrait .url { text-align: center; left: 0; right: 0; }
.portrait .url b { font-size: 18px; }
`;

const ease = {
  out: (x) => 1 - (1 - x) ** 3,
  in: (x) => x ** 3,
  expo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
};

// A cue's opacity/transform at time t. `at` starts the entrance, `until`
// starts the exit; `enter`/`leave` are durations.
function cueState(cue, t) {
  const enter = cue.enter ?? 0.45;
  const leave = cue.leave ?? 0.35;
  if (t < cue.at || t > cue.until + leave) return null;
  const rise = cue.motion === "hit" ? 0 : (cue.rise ?? 14);
  let alpha = 1;
  let y = 0;
  let scale = 1;
  if (t < cue.at + enter) {
    const u = (t - cue.at) / enter;
    if (cue.motion === "hit") {
      alpha = Math.min(1, u / 0.25);
      scale = 1 + 0.07 * (1 - ease.expo(u));
    } else {
      alpha = ease.out(u);
      y = rise * (1 - ease.out(u));
    }
  }
  if (t > cue.until) {
    const u = (t - cue.until) / leave;
    alpha = Math.min(alpha, 1 - ease.in(u) * 0.35 - u * 0.65);
    y -= rise * 0.4 * ease.in(u);
  }
  return { alpha: Math.max(0, alpha), y, scale };
}

export function overlayVisible(cues, t) {
  return cues.some((cue) => cueState(cue, t));
}

export async function renderOverlays({ aspect, cues, frames, out, scale }) {
  const profile = ASPECTS[aspect];
  const dir = path.join(out, "overlay", aspect);
  await mkdir(dir, { recursive: true });
  const html = `<!doctype html><meta charset="utf-8"><style>${await fontFaces()}${CSS}</style><body class="${aspect}" style="--w:${profile.width}px;--h:${profile.height}px"></body>`;
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: scale ?? profile.scale,
  });
  const page = await context.newPage();
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((cues) => {
    const body = document.body;
    const nodes = cues.map((cue) => {
      const node = document.createElement("div");
      node.className =
        cue.kind === "black" || cue.kind === "veil"
          ? `layer ${cue.kind}`
          : `cue ${cue.kind}`;
      if (cue.html) node.innerHTML = cue.html;
      if (cue.top !== undefined) node.style.top = cue.top;
      if (cue.left !== undefined) node.style.left = cue.left;
      if (cue.right !== undefined) node.style.right = cue.right;
      if (cue.bottom !== undefined) node.style.bottom = cue.bottom;
      node.style.opacity = "0";
      body.append(node);
      return node;
    });
    window.__set = (states) => {
      states.forEach((state, i) => {
        const node = nodes[i];
        if (!state) {
          node.style.opacity = "0";
          return;
        }
        node.style.opacity = String(state.alpha);
        node.style.transform = `translateY(${state.y}px) scale(${state.scale})`;
      });
    };
  }, cues);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  const shot = {
    width: profile.width,
    height: profile.height,
    scale: scale ?? profile.scale,
  };
  const blank = path.join(dir, "blank.png");
  let hasBlank = false;
  const started = performance.now();
  for (let i = 0; i < frames; i++) {
    const t = i / 60;
    const file = path.join(dir, `${String(i).padStart(5, "0")}.png`);
    const states = cues.map((cue) => cueState(cue, t));
    if (!states.some(Boolean)) {
      if (!hasBlank) {
        await page.evaluate((states) => window.__set(states), states);
        await writeFile(blank, await screenshot(cdp, shot));
        hasBlank = true;
      }
      await copyFile(blank, file);
      continue;
    }
    await page.evaluate((states) => window.__set(states), states);
    await writeFile(file, await screenshot(cdp, shot));
    if (i % 300 === 0)
      console.log(
        `  overlay/${aspect}: frame ${i}/${frames} (${((performance.now() - started) / 1000).toFixed(0)}s)`,
      );
  }
  await context.close();
  await browser.close();
  return dir;
}

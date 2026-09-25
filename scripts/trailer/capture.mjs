// Captures one trailer take as a numbered PNG sequence plus a per-frame log.
//   node scripts/trailer/capture.mjs <take> [--aspect landscape|portrait]
//        [--scale 2] [--every 1] [--from 0] [--to N] [--out artifacts/trailer]
// Every frame is one 1/60 s simulation step rendered once, so the sequence is
// exact at 60 fps regardless of how long each capture takes.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser, openGame, screenshot } from "./page.mjs";
import { install } from "./driver.mjs";

export const ASPECTS = {
  landscape: { width: 1920, height: 1080, scale: 2 },
  portrait: { width: 540, height: 960, scale: 4 },
};

// Method shorthand (`frame(q) {}`) needs the function keyword to evaluate.
const source = (fn) => {
  const text = fn.toString();
  return /^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(text)
    ? text
    : text.replace(/^(async\s+)?/, "$1function ");
};

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

export async function captureTake(
  take,
  { aspect, scale, every, from, to, out, browser },
) {
  const profile = ASPECTS[aspect];
  const dir = path.join(out, "takes", aspect, take.name);
  await mkdir(dir, { recursive: true });
  const own = !browser;
  browser ??= await launchBrowser();
  const shot = {
    width: profile.width,
    height: profile.height,
    scale: scale ?? profile.scale,
  };
  const { context, page, cdp, errors } = await openGame(browser, {
    ...shot,
    query: take.query,
  });
  const started = performance.now();
  const ctx = JSON.stringify({ aspect, ...take.params });
  try {
    await page.evaluate(`(${source(install)})()`);
    await page.evaluate(
      `(${source(take.setup)})(window.__nightwater, window.__drive, ${ctx})`,
    );
    const log = [];
    const pending = new Set();
    const total = Math.min(to ?? take.frames, take.frames);
    for (let i = from; i < total; i++) {
      const record = await page.evaluate(
        `(${source(take.frame)})(window.__nightwater, window.__drive, ${ctx}, ${i})`,
      );
      log.push(record);
      if (i % every === 0) {
        const png = await screenshot(cdp, shot);
        const write = writeFile(
          path.join(dir, `${String(i).padStart(5, "0")}.png`),
          png,
        ).finally(() => pending.delete(write));
        pending.add(write);
        if (pending.size >= 8) await Promise.race(pending);
      }
      if (i % 120 === 0 || i === total - 1) {
        const elapsed = (performance.now() - started) / 1000;
        const rate = (i + 1 - from) / elapsed;
        console.log(
          `  ${take.name}/${aspect}: frame ${i}/${total} ${record.phase} ${elapsed.toFixed(0)}s (${rate.toFixed(1)} f/s, ~${((total - i) / rate).toFixed(0)}s left)`,
        );
      }
    }
    await Promise.all(pending);
    await writeFile(
      path.join(dir, "log.json"),
      JSON.stringify(
        { take: take.name, aspect, fps: 60, frames: log },
        null,
        1,
      ),
    );
    if (errors.length) console.warn(`  ${take.name}: page errors`, errors);
    return { dir, log };
  } finally {
    await context.close();
    if (own) await browser.close();
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const name = process.argv[2];
  if (!name) {
    console.error(
      "usage: node scripts/trailer/capture.mjs <take> [--aspect landscape|portrait] [--scale N] [--every N] [--from N] [--to N]",
    );
    process.exit(2);
  }
  const [file, member = "default"] = name.split(":");
  const take = (await import(`./takes/${file}.mjs`))[member];
  if (!take) throw new Error(`no take ${name}`);
  await captureTake(take, {
    aspect: option("aspect", "landscape"),
    scale: option("scale") ? Number(option("scale")) : undefined,
    every: Number(option("every", 1)),
    from: Number(option("from", 0)),
    to: option("to") ? Number(option("to")) : undefined,
    out: option("out", "artifacts/trailer"),
  });
}

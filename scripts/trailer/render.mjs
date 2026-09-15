// Renders one complete trailer master: every take, the typography, the mix,
// and the encode. `--aspect portrait` gives the 9:16 master.
//   node scripts/trailer/render.mjs [--aspect landscape|portrait] [--out dir]
//        [--scale N] [--skip-capture] [--crf 13]
import path from "node:path";
import { assemble } from "./assemble.mjs";
import { captureTake } from "./capture.mjs";
import { TAKES } from "./edit.mjs";
import { ensureMusic } from "./music.mjs";
import { launchBrowser } from "./page.mjs";

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

const aspect = option("aspect", "landscape");
const out = option("out", "artifacts/trailer");
const scale = option("scale") ? Number(option("scale")) : undefined;
const started = performance.now();
if (!process.argv.includes("--skip-capture")) {
  const browser = await launchBrowser();
  try {
    for (const name of TAKES) {
      const [file, member = "default"] = name.split(":");
      const take = (await import(`./takes/${file}.mjs`))[member];
      console.log(`Capturing ${take.name} (${aspect})`);
      await captureTake(take, {
        aspect,
        scale,
        every: 1,
        from: 0,
        out,
        browser,
      });
    }
  } finally {
    await browser.close();
  }
}
const file = await assemble({
  aspect,
  out,
  scale,
  crf: Number(option("crf", 13)),
  music: option("music") ?? (await ensureMusic(out)),
});
console.log(
  `Done in ${((performance.now() - started) / 60000).toFixed(1)} min: ${path.resolve(file)}`,
);

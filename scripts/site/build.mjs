import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CURRICULUM } from "../../src/questions/index.ts";
import { Journey, newJourney } from "../../src/journey.ts";
import { runs } from "../../src/mathtext.ts";
import { POOLS, VIEWS } from "./pools.mjs";

process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const SITE_URL = (
  process.env.SITE_URL ?? "https://oddessentials.github.io/nightwater/"
).replace(/\/?$/, "/");
const OUT = "docs";
const ASSETS = `${OUT}/assets`;
const CACHE = "artifacts/site/build-cache.json";
const TAKES = "artifacts/site/takes";

const frame = (aspect, take, index) =>
  `${TAKES}/${aspect}/${take}/${String(index).padStart(5, "0")}.png`;

const IMAGES = [
  ...POOLS.flatMap(({ name }, i) => [
    {
      name: `${name}-wide`,
      source: frame("landscape", name, VIEWS.landscape.frame),
      widths: [1280, 1920, 2560],
      crf: i ? 32 : 30,
    },
    {
      name: `${name}-tall`,
      source: frame("portrait", name, VIEWS.portrait.frame),
      widths: [720, 1080, 1440],
      crf: i ? 32 : 30,
    },
  ]),
  ...[1, 2, 3].flatMap((exit) => [
    {
      name: `tube-${exit}-wide`,
      source: frame("landscape", `tube-${exit}`, 40),
      widths: [1280, 1920],
      crf: 34,
    },
    {
      name: `tube-${exit}-tall`,
      source: frame("portrait", `tube-${exit}`, 40),
      widths: [720, 1080],
      crf: 34,
    },
  ]),
  ...["ember", "lantern", "star", "mouth", "air"].flatMap((name) => [
    {
      name: `${name}-wide`,
      source: `${TAKES}/landscape/ride/${name}.png`,
      widths: [960, 1440, 1920],
      crf: 32,
    },
    {
      name: `${name}-tall`,
      source: `${TAKES}/portrait/ride/${name}.png`,
      widths: [540, 810, 1080],
      crf: 32,
    },
  ]),
];

const COPIES = [
  { name: "favicon", source: "public/favicon.svg" },
  { name: "favicon", source: "public/favicon.ico" },
  { name: "apple-touch-icon", source: "public/apple-touch-icon.png" },
  { name: "math-text", source: "public/fonts/stix-two-text.woff2" },
  { name: "math-symbols", source: "public/fonts/stix-two-math.woff2" },
  {
    name: "math-subscript",
    source: "public/fonts/noto-serif-subscript-n.woff2",
  },
  { name: "site", source: "site/site.js" },
];

const FONTS = [
  { name: "newsreader-display", source: "art/fonts/Newsreader-Display.ttf" },
  {
    name: "newsreader-display-italic",
    source: "art/fonts/Newsreader-DisplayItalic.ttf",
  },
  {
    name: "newsreader-text-italic",
    source: "art/fonts/Newsreader-TextItalic.ttf",
  },
  { name: "inter-medium", source: "art/fonts/Inter-Medium.ttf" },
];

const LICENCES = [
  "art/fonts/OFL-Newsreader.txt",
  "art/fonts/OFL-Inter.txt",
  "public/fonts/OFL-STIX.txt",
  "public/fonts/OFL-Noto-Serif.txt",
];

const hash = (bytes) =>
  createHash("sha256").update(bytes).digest("hex").slice(0, 8);
const extension = (file) => file.slice(file.lastIndexOf(".") + 1);

function run(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    maxBuffer: 1 << 28,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} failed: ${result.stderr?.toString().slice(-600)}`,
    );
  return result.stdout;
}

const cache = existsSync(CACHE)
  ? JSON.parse(await readFile(CACHE, "utf8"))
  : {};
const written = new Map();

async function emit(logical, bytes) {
  const file = `${logical.replace(/\.[^.]+$/, "")}.${hash(bytes)}.${extension(logical)}`;
  await writeFile(`${ASSETS}/${file}`, bytes);
  written.set(`assets/${logical}`, `assets/${file}`);
  return file;
}

const CODECS = {
  avif: {
    pixels: "yuv420p10le",
    args: (crf) => [
      "-c:v",
      "libaom-av1",
      "-still-picture",
      "1",
      "-crf",
      String(crf),
      "-cpu-used",
      "3",
      "-row-mt",
      "1",
      "-aq-mode",
      "1",
      "-f",
      "avif",
    ],
  },
  webp: {
    pixels: "yuv420p",
    args: () => [
      "-c:v",
      "libwebp",
      "-quality",
      "80",
      "-compression_level",
      "6",
      "-f",
      "webp",
    ],
  },
};

async function encode({ name, source, widths, crf }) {
  const bytes = await readFile(source);
  const fallback = widths[Math.floor((widths.length - 1) / 2)];
  const variants = [
    ...widths.map((width) => ["avif", width]),
    ["webp", fallback],
  ];
  for (const [format, width] of variants) {
    const logical = `${name}-${width}.${format}`;
    const stamp = createHash("sha256")
      .update(bytes)
      .update(JSON.stringify([format, width, CODECS[format].args(crf)]))
      .digest("hex");
    const cached = cache[logical];
    if (cached?.stamp === stamp && existsSync(`${ASSETS}/${cached.file}`)) {
      written.set(`assets/${logical}`, `assets/${cached.file}`);
      continue;
    }
    const { pixels, args } = CODECS[format];
    const temp = `artifacts/site/encode.${format}`;
    run("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-vf",
      `scale=${width}:-2:flags=lanczos,format=${pixels}`,
      ...args(crf),
      temp,
    ]);
    const image = await readFile(temp);
    const file = await emit(logical, image);
    cache[logical] = { stamp, file };
    console.log(`${file}  ${Math.round(image.length / 1024)} KB`);
  }
}

const WOFF2 = `
import sys
from fontTools.ttLib import TTFont
font = TTFont(sys.argv[1], recalcTimestamp=False)
font.flavor = "woff2"
font.save(sys.stdout.buffer)
`;

const escape = (text) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const math = (text) =>
  runs(text)
    .map(({ text, raised }) =>
      raised ? `<sup>${escape(text)}</sup>` : escape(text),
    )
    .join("");
const pad = (n) => String(n).padStart(2, "0");
const EXIT_NAMES = ["Tideline", "Afterglow", "Undertow"];
const where = (stage, level) =>
  `<span aria-hidden="true">Stage ${pad(stage)} · Level ${pad(level)}</span><span class="visually-hidden">Stage ${stage}, level ${level}</span>`;

function sources(name) {
  const set = {};
  for (const [art, suffix] of [
    ["wide", "wide"],
    ["tall", "tall"],
  ]) {
    const image = IMAGES.find((i) => i.name === `${name}-${suffix}`);
    const fallback = image.widths[Math.floor((image.widths.length - 1) / 2)];
    set[art] = {
      avif: image.widths
        .map((w) => `assets/${image.name}-${w}.avif ${w}w`)
        .join(", "),
      webp: `assets/${image.name}-${fallback}.webp`,
    };
  }
  return set;
}

function sample(stage) {
  const question = new Journey(newJourney(7, stage, 10)).question;
  return `<p class="sample"><span class="sample-label">Level 10 asks</span><span class="sample-prompt">${math(question.prompt)}</span></p>`;
}

function curriculum() {
  return CURRICULUM.map(
    ([number, stage]) =>
      `<li class="stage"><details><summary><span class="stage-number" aria-hidden="true">${pad(number)}</span><span class="stage-name"><span class="visually-hidden">Stage ${number}: </span>${escape(stage.name)}</span></summary><div class="stage-body"><ol class="skills">${stage.levels
        .map((level) => `<li>${escape(level.skill)}</li>`)
        .join("")}</ol>${sample(number)}</div></details></li>`,
  ).join("");
}

const waterline = (exits) =>
  +Math.max(
    ...exits.filter((e) => e.x > 0 && e.x < 1).map((e) => e.y + 0.84 * e.r),
  ).toFixed(4);

async function pools() {
  const out = [];
  for (const spec of POOLS) {
    const views = {};
    for (const aspect of Object.keys(VIEWS)) {
      const log = JSON.parse(
        await readFile(`${TAKES}/${aspect}/${spec.name}/log.json`, "utf8"),
      );
      views[aspect] = log.frames[VIEWS[aspect].frame];
    }
    const { question } = views.landscape;
    const stage = CURRICULUM.find(([n]) => n === question.stage)[1];
    const exits = { wide: views.landscape.exits, tall: views.portrait.exits };
    out.push({
      stage: question.stage,
      level: question.level,
      where: where(question.stage, question.level),
      skill: escape(stage.levels[question.level - 1].skill),
      prompt: math(question.prompt),
      figure: question.figure ?? "",
      choices: question.choices.map(math),
      answer: math(question.choices[question.correct]),
      correct: question.correct,
      exits,
      line: { wide: waterline(exits.wide), tall: waterline(exits.tall) },
      images: sources(spec.name),
    });
  }
  return out;
}

function panel(pool) {
  return `<p class="pool-where"><span class="pool-stage" data-where>${pool.where}</span><span class="pool-skill" data-skill>${pool.skill}</span></p><div class="pool-question"><div class="figure" data-figure${pool.figure ? "" : " hidden"}>${pool.figure}</div><p class="prompt" data-prompt>${pool.prompt}</p></div><div class="exits" role="group" aria-label="Choose an exit">${pool.choices
    .map(
      (choice, i) =>
        `<button class="exit" type="button" data-exit="${i}"><span class="route" aria-hidden="true">${pad(i + 1)}</span><span class="answer" data-answer>${choice}</span><span class="visually-hidden">, ${EXIT_NAMES[i]}</span><svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6"/></svg></button>`,
    )
    .join("")}</div>`;
}

function fill(html, name, content) {
  const start = new RegExp(`<([a-z]+)[^>]*\\bdata-fill="${name}"`, "g");
  let out = "";
  let from = 0;
  for (let match; (match = start.exec(html));) {
    const tag = match[1];
    const open = html.indexOf(">", match.index) + 1;
    const pattern = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
    pattern.lastIndex = open;
    let depth = 1;
    let close = -1;
    for (let inner; depth && (inner = pattern.exec(html));) {
      depth += inner[1] ? -1 : 1;
      if (!depth) close = inner.index;
    }
    if (close < 0) throw new Error(`unclosed <${tag} data-fill="${name}">`);
    out += html.slice(from, open) + content;
    from = close;
    start.lastIndex = close;
  }
  if (!out) throw new Error(`site/index.html has no data-fill="${name}"`);
  return out + html.slice(from);
}

await mkdir(ASSETS, { recursive: true });
await mkdir("artifacts/site", { recursive: true });
for (const image of IMAGES) {
  if (!existsSync(image.source))
    throw new Error(
      `${image.source} is missing: run node scripts/with-server.mjs scripts/site/capture.mjs`,
    );
  await encode(image);
}
await writeFile(CACHE, JSON.stringify(cache, null, 1));
if (process.argv.includes("--images")) process.exit(0);
for (const { name, source } of FONTS)
  await emit(`${name}.woff2`, run("python", ["-c", WOFF2, source]));
await emit(
  "og-image.jpg",
  run("ffmpeg", [
    "-loglevel",
    "error",
    "-i",
    "public/og-image.png",
    "-q:v",
    "2",
    "-pix_fmt",
    "yuvj444p",
    "-f",
    "mjpeg",
    "-",
  ]),
);
for (const { name, source } of COPIES)
  await emit(`${name}.${extension(source)}`, await readFile(source));
for (const source of LICENCES) {
  const file = source.slice(source.lastIndexOf("/") + 1);
  await writeFile(`${ASSETS}/${file}`, await readFile(source));
  written.set(`assets/${file}`, `assets/${file}`);
}

const wordmark = await readFile("art/wordmark.svg", "utf8");
let html = await readFile("site/index.html", "utf8");
html = fill(
  html,
  "wordmark",
  /<g class="wordmark">[\s\S]*?<\/g>/.exec(wordmark)[0],
);
const box = /viewBox="([^"]*)"/.exec(wordmark)[1];
const [, , boxWidth, boxHeight] = box.split(/\s+/);
html = html
  .replace(/viewBox="[^"]*"([^>]*data-fill="wordmark")/, `viewBox="${box}"$1`)
  .replace(
    /viewBox="[^"]*"([^>]*data-wordmark)/g,
    `viewBox="0 0 ${boxWidth} ${boxHeight}"$1`,
  );
html = fill(html, "curriculum", curriculum());
const data = await pools();
html = fill(html, "pool", panel(data[0]));
html = fill(
  html,
  "data",
  JSON.stringify({
    pools: data,
    tubes: [1, 2, 3].map((exit) => sources(`tube-${exit}`)),
    end: sources("air"),
  }).replaceAll("<", "\\u003c"),
);
html = html.replace(
  /<picture[^>]*\bdata-lazy\b[\s\S]*?<\/picture>/g,
  (block) => {
    const deferred = block
      .replace(/\ssrcset=/g, " data-srcset=")
      .replace(/(<img\b[^>]*?)\ssrc=/, "$1 data-src=");
    return `${deferred}<noscript>${block.replace(/\sdata-lazy\b/, "")}</noscript>`;
  },
);
html = html.replaceAll("%SITE_URL%", SITE_URL);
const missing = new Set();
html = html.replace(
  /assets\/[\w.-]+\.(?:avif|webp|jpg|png|svg|ico|woff2|js|txt)/g,
  (ref) => {
    if (!written.has(ref)) missing.add(ref);
    return written.get(ref) ?? ref;
  },
);
if (missing.size)
  throw new Error(
    `site/index.html references unknown assets: ${[...missing].join(", ")}`,
  );
await writeFile(`${OUT}/index.html`, html);
await writeFile(`${OUT}/.nojekyll`, "");
const host = new URL(SITE_URL).hostname;
if (!host.endsWith("github.io")) await writeFile(`${OUT}/CNAME`, `${host}\n`);
else await rm(`${OUT}/CNAME`, { force: true });

const keep = new Set([...written.values()].map((ref) => ref.slice(7)));
for (const file of await readdir(ASSETS))
  if (!keep.has(file)) await rm(`${ASSETS}/${file}`);
await mkdir("artifacts/site", { recursive: true });
await writeFile(CACHE, JSON.stringify(cache, null, 1));
let total = 0;
for (const file of await readdir(ASSETS))
  total += (await readFile(`${ASSETS}/${file}`)).length;
console.log(
  `${OUT}/index.html  ${Math.round(html.length / 1024)} KB; assets ${(total / 1048576).toFixed(2)} MB`,
);

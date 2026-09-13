import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const command = process.argv[2];
const bucket = "oddessentials-audio";
const prefix = "nightwater";
const local = "music/dist";
const cdn =
  process.env.NIGHTWATER_MUSIC_URL ||
  "https://audio.oddessentials.ai/nightwater";
const wrangler = "wrangler@4.131.1";
const windows = process.platform === "win32";
const quote = (arg) => (windows && /[\s,]/.test(arg) ? `"${arg}"` : arg);

function run(...args) {
  const result = spawnSync(
    windows ? "npx.cmd" : "npx",
    ["--yes", wrangler, ...args].map(quote),
    { stdio: "inherit", shell: windows, windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const put = (file, type, cache) =>
  run(
    "r2",
    "object",
    "put",
    `${bucket}/${prefix}/${file}`,
    "--file",
    `${local}/${file}`,
    "--content-type",
    type,
    "--cache-control",
    cache,
    "--remote",
  );
const get = (file) =>
  run(
    "r2",
    "object",
    "get",
    `${bucket}/${prefix}/${file}`,
    "--file",
    `${local}/${file}`,
    "--remote",
  );
async function served(file) {
  try {
    return (
      await fetch(`${cdn}/${file}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      })
    ).ok;
  } catch {
    return false;
  }
}

if (command === "push") {
  const { tracks } = JSON.parse(readFileSync(`${local}/manifest.json`, "utf8"));
  let uploaded = 0;
  for (const { src } of tracks) {
    if (!existsSync(`${local}/${src}`))
      throw new Error(`${src} is missing; run npm run music first`);
    if (await served(src)) continue;
    put(src, "audio/mp4", "public, max-age=31536000, immutable");
    uploaded++;
  }
  put("manifest.json", "application/json", "no-cache");
  console.log(
    `${tracks.length} tracks on ${cdn} (${uploaded} uploaded), manifest refreshed`,
  );
} else if (command === "pull") {
  mkdirSync(local, { recursive: true });
  get("manifest.json");
  const { tracks } = JSON.parse(readFileSync(`${local}/manifest.json`, "utf8"));
  let fetched = 0;
  for (const { src } of tracks) {
    if (existsSync(`${local}/${src}`)) continue;
    get(src);
    fetched++;
  }
  console.log(`${tracks.length} tracks in ${local} (${fetched} fetched)`);
} else {
  console.error("usage: node scripts/music-sync.mjs push|pull");
  process.exit(2);
}

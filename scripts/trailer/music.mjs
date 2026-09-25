// Fetches the album track the edit is cut to, from the same CDN the game
// streams from, unless a copy is already in the output folder.
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MUSIC } from "./edit.mjs";

const CDN =
  process.env.NIGHTWATER_MUSIC_URL ||
  "https://audio.oddessentials.ai/nightwater";

export async function ensureMusic(out) {
  const file = path.join(out, "music", MUSIC.file);
  try {
    await access(file);
    return file;
  } catch {}
  const url = `${CDN.replace(/\/?$/, "/")}${MUSIC.file}`;
  console.log(`Fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

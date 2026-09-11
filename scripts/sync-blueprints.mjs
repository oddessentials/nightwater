import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = path.resolve(root, process.argv[2] ?? "../math-game");
const out = path.join(root, "tests", "fixtures");
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, "figures"), { recursive: true });
let examples = 0;
let figures = 0;
const stages = (await readdir(source)).filter((dir) => /^\d{2}-/.test(dir));
for (const dir of stages.sort()) {
  const stage = dir.slice(0, 2);
  const lines = [];
  const text = await readFile(path.join(source, dir, "blueprint.md"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const heading = /^## (L\d+)\b/.exec(line);
    if (heading) lines.push(`## ${heading[1]}`);
    else if (/^\s*[1-3]\. Q:/.test(line)) {
      lines.push(line.trim());
      examples++;
    }
  }
  await writeFile(path.join(out, `${stage}.txt`), lines.join("\n") + "\n");
  const figureDir = path.join(source, dir, "figures");
  for (const file of await readdir(figureDir).catch(() => [])) {
    if (!file.endsWith(".svg")) continue;
    await copyFile(
      path.join(figureDir, file),
      path.join(out, "figures", `${stage}-${file}`),
    );
    figures++;
  }
}
console.log(`Synced ${examples} examples and ${figures} figures from ${source}`);

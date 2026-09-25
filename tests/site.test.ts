import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { CURRICULUM } from "../src/questions/index.ts";
import { Journey, newJourney } from "../src/journey.ts";
import { POOLS } from "../scripts/site/pools.mjs";

const root = new URL("../", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root));
const html = read("docs/index.html").toString("utf8");
const assets = readdirSync(new URL("docs/assets/", root));
const decode = (text: string) =>
  text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

test("every asset the page references exists, and every asset is referenced", () => {
  const referenced = new Set(
    [...html.matchAll(/assets\/([\w.-]+\.[a-z0-9]+)/g)].map((m) => m[1]),
  );
  for (const file of referenced) assert.ok(assets.includes(file), file);
  for (const file of assets) assert.ok(referenced.has(file), `${file} unused`);
});

test("fingerprinted assets are named after their content", () => {
  for (const file of assets) {
    const match = /\.([0-9a-f]{8})\.[a-z0-9]+$/.exec(file);
    if (!match) continue;
    const hash = createHash("sha256")
      .update(read(`docs/assets/${file}`))
      .digest("hex")
      .slice(0, 8);
    assert.equal(hash, match[1], `${file}: run npm run site`);
  }
});

test("the published script is the one in site/", () => {
  const published = assets.find((file) => /^site\.[0-9a-f]{8}\.js$/.test(file));
  assert.ok(published);
  assert.equal(
    read(`docs/assets/${published}`).toString("utf8"),
    read("site/site.js").toString("utf8"),
    "run npm run site",
  );
});

test("paths stay relative so the site works under /nightwater/ and on a custom domain", () => {
  assert.doesNotMatch(html, /\s(?:href|src|srcset|data-src|data-srcset)="\//);
  const own = [
    ...html.matchAll(
      /https:\/\/oddessentials\.github\.io\/nightwater\/[^"\s]*/g,
    ),
  ].map((m) => m.index);
  const head = html.indexOf("</head>");
  assert.ok(own.length > 0 && own.every((at) => at < head));
  assert.ok(existsSync(new URL("docs/.nojekyll", root)));
});

test("the curriculum on the page is the one in src/questions", () => {
  const stages = [
    ...html.matchAll(/<li class="stage">([\s\S]*?)<\/details><\/li>/g),
  ];
  assert.equal(stages.length, CURRICULUM.length);
  stages.forEach(([, body], i) => {
    const [, stage] = CURRICULUM[i];
    const name =
      /<span class="stage-name">(?:<span[^>]*>[^<]*<\/span>)?([^<]*)<\/span>/.exec(
        body,
      );
    assert.equal(decode(name![1]), stage.name);
    const skills = [
      ...body.matchAll(/<ol class="skills">([\s\S]*?)<\/ol>/g),
    ][0][1];
    assert.deepEqual(
      [...skills.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1])),
      stage.levels.map((level) => level.skill),
    );
  });
});

test("the playable pools ask the game's own questions", () => {
  const json =
    /<script[^>]*id="nightwater-data"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  const data = JSON.parse(json![1]);
  assert.equal(data.pools.length, POOLS.length);
  POOLS.forEach((spec, i) => {
    const question = new Journey(
      newJourney(spec.journey, spec.stage, spec.level),
    ).question!;
    const pool = data.pools[i];
    assert.equal(pool.stage, spec.stage);
    assert.equal(pool.level, spec.level);
    assert.equal(
      decode(pool.prompt),
      question.prompt.replace(/\^\(?([^)\s]*)\)?/g, "$1"),
    );
    assert.equal(pool.correct, question.correct);
    assert.equal(pool.choices.length, 3);
  });
});

test("the social card and the whole site fit their consumers' limits", () => {
  const card = assets.find((file) => file.startsWith("og-image."));
  const jpeg = read(`docs/assets/${card}`);
  assert.equal(jpeg.toString("hex", 0, 2), "ffd8");
  assert.ok(jpeg.length < 300_000, "WhatsApp and LinkedIn previews");
  let total = 0;
  for (const file of assets)
    total += statSync(new URL(`docs/assets/${file}`, root)).size;
  assert.ok(total < 10_000_000, `docs/assets is ${total} bytes`);
});

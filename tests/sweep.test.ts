import test from "node:test";
import assert from "node:assert/strict";
import { CURRICULUM, makeQuestion } from "../src/questions/index.ts";
import { GLYPHS, mix } from "../src/questions/kit.ts";
import { pad } from "./support/fixtures.ts";

const SEEDS = 300;
const MAX_PROMPT = 175;
const MAX_CHOICE = 36;
const allowed = new Set(GLYPHS);

export function lint(text: string) {
  const problems: string[] = [];
  if (/NaN|undefined|Infinity|null|\[object/.test(text))
    problems.push("a broken value");
  if (/-(?=\s?[\d(x])/.test(text)) problems.push("a hyphen as a minus");
  if (/\+ −/.test(text)) problems.push("+ −");
  if (/(?<![\d.,])1[nxyt](?![a-z])/.test(text)) problems.push("a coefficient of 1");
  if (/−0(?![.\d])/.test(text)) problems.push("−0");
  if (/ {2}/.test(text)) problems.push("a double space");
  if (text !== text.trim()) problems.push("an edge space");
  for (const c of text) if (!allowed.has(c)) problems.push(`the glyph ${c}`);
  return problems;
}

for (const [number, stage] of CURRICULUM) {
  test(`stage ${pad(number)}: ${SEEDS} seeds a level stay valid, varied and clean`, () => {
    for (let level = 1; level <= stage.levels.length; level++) {
      const positions = [0, 0, 0];
      for (let i = 0; i < SEEDS; i++) {
        const seed = mix(0x5eed, number, level, i);
        const q = makeQuestion(number, level, seed);
        const where = `${q.id} (${q.prompt})`;
        assert.equal(q.reseeds, 0, `${where} needed a re-seed`);
        assert.deepEqual(makeQuestion(number, level, seed), q, where);
        assert.equal(new Set(q.choices).size, 3, where);
        assert.ok(q.prompt.length <= MAX_PROMPT, `${where}: prompt too long`);
        for (const c of q.choices)
          assert.ok(c.length <= MAX_CHOICE, `${where}: choice ${c} too long`);
        for (const text of [q.prompt, ...q.choices])
          assert.deepEqual(lint(text), [], `${where}: ${text}`);
        positions[q.correct]++;
      }
      for (const count of positions)
        assert.ok(
          count >= 60 && count <= 140,
          `L${level} answer positions ${positions.join(" / ")}`,
        );
    }
  });
}

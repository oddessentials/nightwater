import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CURRICULUM, makeQuestion } from "../src/questions/index.ts";
import { mix } from "../src/questions/kit.ts";
import { pad } from "./support/fixtures.ts";
import type { Checks } from "./support/math.ts";

const SEEDS = 300;

for (const [number] of CURRICULUM) {
  const file = new URL(`./answers/s${pad(number)}.ts`, import.meta.url);
  test(`stage ${pad(number)}: answers re-derived by a second route`, async () => {
    assert.ok(existsSync(file), "no answer checks for this stage");
    const checks: Checks = (await import(file.href)).default;
    for (const [level, check] of Object.entries(checks))
      for (let i = 0; i < SEEDS; i++) {
        const q = makeQuestion(
          number,
          Number(level),
          mix(0xa11, number, Number(level), i),
        );
        let found: number;
        try {
          found = check(q);
        } catch (error) {
          assert.fail(
            `${q.id}: ${q.prompt} | ${q.choices.join(" / ")}: ${error}`,
          );
        }
        assert.equal(
          found,
          q.correct,
          `${q.id}: ${q.prompt} | ${q.choices.join(" / ")}`,
        );
      }
  });
}

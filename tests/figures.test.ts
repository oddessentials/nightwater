import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CURRICULUM } from "../src/questions/index.ts";
import { ScriptedRng } from "../src/questions/kit.ts";
import { py1 } from "../src/questions/figures.ts";
import type { Examples } from "./support/fixtures.ts";

test("figures round and print coordinates the way figures.py does", () => {
  assert.equal(py1(131.25), "131.2");
  assert.equal(py1(0.25), "0.2");
  assert.equal(py1(0.35), "0.3");
  assert.equal(py1(95), "95.0");
  assert.equal(py1(254.99999999999997), "255.0");
  assert.equal(py1(-12.25), "-12.2");
});

const folder = new URL("./fixtures/figures/", import.meta.url);
for (const file of readdirSync(folder).sort()) {
  const [, stage, level, index] = /^(\d{2})-L(\d+)-(\d)\.svg$/.exec(file)!;
  const built = CURRICULUM.find(([n]) => n === Number(stage));
  test(
    `figure ${file} is reproduced byte for byte`,
    { skip: built ? false : `stage ${stage} is not built yet` },
    async () => {
      const data: Examples = (await import(`./examples/s${stage}.ts`)).default;
      const vars = data.levels[Number(level)][Number(index) - 1];
      const draft = built![1].levels[Number(level) - 1].make(
        new ScriptedRng(vars),
      );
      const expected = readFileSync(new URL(file, folder), "utf8");
      assert.equal(draft.figure, expected.replace(/\r\n/g, "\n"));
    },
  );
}

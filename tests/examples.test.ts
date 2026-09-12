import test from "node:test";
import assert from "node:assert/strict";
import { CURRICULUM } from "../src/questions/index.ts";
import { ScriptedRng, separated, type Level } from "../src/questions/kit.ts";
import {
  loadExamples,
  pad,
  type Examples,
  type Vars,
} from "./support/fixtures.ts";

function replay(level: Level, vars: Vars) {
  const rng = new ScriptedRng(vars);
  const draft = level.make(rng);
  const three = [draft.answer, ...draft.wrong];
  return {
    prompt: separated(draft.prompt),
    choices: three.map((c) => separated(c.text)).sort(),
    correct: separated(draft.answer.text),
    keys: new Set(three.map((c) => c.key)).size,
    unused: rng.unused(),
  };
}

for (const [number, stage] of CURRICULUM) {
  test(`stage ${pad(number)}: every blueprint example replays exactly`, async () => {
    const data: Examples = (await import(`./examples/s${pad(number)}.ts`))
      .default;
    const examples = loadExamples(number);
    assert.equal(examples.length, 30);
    for (const example of examples) {
      const where = `${pad(number)} L${example.level} example ${example.index}`;
      const vars = data.levels[example.level]?.[example.index - 1];
      assert.ok(vars, `${where}: no variables`);
      const out = replay(stage.levels[example.level - 1], vars);
      assert.equal(out.prompt, example.prompt, where);
      assert.deepEqual(out.choices, [...example.choices].sort(), where);
      assert.equal(out.correct, example.correct, where);
      assert.equal(out.keys, 3, `${where}: two choices share a value`);
      assert.deepEqual(out.unused, [], `${where}: unused variables`);
    }
    for (const [i, extra] of (data.extra ?? []).entries()) {
      const where = `${pad(number)} L${extra.level} hand-worked ${i + 1}`;
      const out = replay(stage.levels[extra.level - 1], extra.vars);
      assert.equal(out.prompt, extra.prompt, where);
      assert.deepEqual(out.choices, [...extra.choices].sort(), where);
      assert.equal(out.correct, extra.correct, where);
      assert.equal(out.keys, 3, where);
      assert.deepEqual(out.unused, [], where);
    }
  });
}

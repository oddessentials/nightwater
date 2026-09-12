import test from "node:test";
import assert from "node:assert/strict";
import { makeQuestion } from "../src/questions/index.ts";
import { ScriptedRng } from "../src/questions/kit.ts";
import { levels } from "../src/questions/s18-functions-exponentials-logarithms.ts";
import checks from "./answers/s18.ts";
import { close, evaluate, type Asked } from "./support/math.ts";

const check = checks[8];
const positive = [0.25, 1, 3];

for (const e of ["expand", "condense"])
  test(`logarithm ${e}: all variants use the positive domain`, () => {
    for (const w of ["pow", "div"])
      for (const b of [2, 3, 5, 10])
        for (const m of [2, 3, 4, 5])
          for (const r of [1, 2, 3, 4]) {
            const draft = levels[7].make(
              new ScriptedRng({ form: "X", e, w, b, m, r }),
            );
            const asked: Asked = {
              prompt: draft.prompt,
              domain: draft.domain,
              choices: [draft.answer, ...draft.wrong].map((c) => c.text),
            };
            assert.deepEqual(asked.domain, { positive: ["x", "y"] });
            assert.equal(check(asked), 0, JSON.stringify({ e, w, b, m, r }));
            for (const x of positive)
              for (const y of positive) {
                const target = Math.log(x ** m / y ** r) / Math.log(b);
                const answer = evaluate(draft.answer.text, { x, y });
                assert.ok(Number.isFinite(answer) && close(answer, target));
              }
          }
  });

test("18-08-00000201 declares the domain its marked expansion requires", () => {
  const q = makeQuestion(18, 8, 0x201);
  assert.equal(q.id, "18-08-00000201");
  assert.ok(q.domain);
  assert.deepEqual(q.domain, { positive: ["x", "y"] });
  assert.equal(q.choices[q.correct], "2 log₂ x − 2 log₂ y");
  assert.equal(check(q), q.correct);

  for (const [x, y] of [
    [-2, 1],
    [1, -2],
    [-2, -1],
  ]) {
    const env: Record<string, number> = { x, y };
    assert.equal(evaluate("log₂(x²/y²)", { x, y }), Math.log2(x ** 2 / y ** 2));
    assert.ok(Number.isNaN(evaluate(q.choices[q.correct], { x, y })));
    assert.equal(
      q.domain.positive.every((v) => env[v] > 0),
      false,
    );
  }
});

for (const e of ["expand", "condense"])
  test(`logarithm ${e}: the checker requires metadata and rendered conditions`, () => {
    const draft = levels[7].make(
      new ScriptedRng({ form: "X", e, w: "pow", b: 2, m: 2, r: 2 }),
    );
    const q: Asked = {
      prompt: draft.prompt,
      domain: draft.domain,
      choices: [draft.answer, ...draft.wrong].map((c) => c.text),
    };
    const task = q.prompt.slice(q.prompt.indexOf("write "));
    assert.throws(() => check({ ...q, domain: undefined }), /domain required/);
    assert.throws(
      () => check({ ...q, domain: { positive: ["x"] } }),
      /domain required/,
    );
    assert.equal(check({ ...q, domain: { positive: ["y", "x"] } }), 0);
    for (const qualifier of [
      "",
      "For x > 0, ",
      "For y > 0, ",
      "For x ≥ 0 and y ≥ 0, ",
      "For x ≠ 0 and y ≠ 0, ",
      "For x > 0 or y > 0, ",
    ])
      assert.throws(() => check({ ...q, prompt: qualifier + task }));

    // Wording, order, spacing and equivalent inequality direction can change.
    for (const qualifier of [
      "Assume y>0 and x>0. ",
      "Given 0 < x, 0 < y, ",
      "With x > 0 & y > 0, ",
    ])
      assert.equal(check({ ...q, prompt: qualifier + task }), 0);
  });

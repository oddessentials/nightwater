import test from "node:test";
import assert from "node:assert/strict";
import { glue, runs } from "../src/mathtext.ts";

const shown = (text: string) => text.replace(/\u00a0/g, "~");
const raised = (text: string) =>
  runs(text)
    .map((run) => (run.raised ? `^[${run.text}]` : run.text))
    .join("");

test("expressions, units and sets hold together while prose can wrap", () => {
  const cases: [string, string][] = [
    [
      "Solve 2 sin x = −√3 for 0° ≤ x < 360°.",
      "Solve 2~sin~x~=~−√3 for 0°~≤~x~<~360°.",
    ],
    ["What is ∫₋₂¹ (4x² − 6x + 1) dx?", "What is ∫₋₂¹~(4x²~−~6x~+~1)~dx?"],
    [
      "What is lim x→3 (x² − 9)/(x − 3)?",
      "What is lim~x→3~(x²~−~9)/(x~−~3)?",
    ],
    [
      "θ is between 0° and 90°, and tan θ = √3/3.",
      "θ is between 0° and 90°, and tan~θ~=~√3/3.",
    ],
    ["6 sin x + 7 ln|x| + C", "6~sin~x~+~7~ln|x|~+~C"],
    ["289π/4 cm", "289π/4~cm"],
    ["{210°, 330°}", "{210°,~330°}"],
    ["9 units left and 2 units up", "9~units left and 2~units up"],
    ["The film lasts 5 h 55 min.", "The film lasts 5~h~55~min."],
    ["On Monday it was −5 °C", "On Monday it was −5~°C"],
    ["Round to 1 dp.", "Round to 1~dp."],
    ["What is x?   3/8 = x/20", "What is x?   3/8~=~x/20"],
    ["Take 2 3/4 cups.", "Take 2~3/4 cups."],
    ["Solve 2^(3x − 6) = 512.", "Solve 2^(3x~−~6)~=~512."],
  ];
  for (const [text, want] of cases) assert.equal(shown(glue(text)), want, text);
});

test("a long expression may break only after a top-level operator", () => {
  assert.equal(shown(glue("2 × 2 × 2 × 2", true)), "2~× 2~× 2~× 2");
  assert.equal(shown(glue("(2 × 2) × 2", true)), "(2~×~2)~× 2");
  assert.equal(
    shown(glue("−40x⁵ cos x − 8x⁵ sin x", true)),
    "−40x⁵~cos~x~− 8x⁵~sin~x",
  );
});

test("every caret becomes a raised exponent", () => {
  assert.equal(raised("What is 9^(1/2)?"), "What is 9^[1/2]?");
  assert.equal(raised("Simplify (2^3)^4."), "Simplify (2^[3])^[4].");
  assert.equal(raised("What is 3^−2?"), "What is 3^[−2]?");
  assert.equal(raised("Solve 5^x = 495."), "Solve 5^[x] = 495.");
  assert.equal(raised("x^(−1/2) + e^(3x − 1)"), "x^[−1/2] + e^[3x − 1]");
  assert.equal(raised("2^2 · 3^2 · 5"), "2^[2] · 3^[2] · 5");
});

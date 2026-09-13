import test from "node:test";
import assert from "node:assert/strict";
import {
  CapError,
  ScriptedRng,
  SeededRng,
  dec,
  duration,
  fixed,
  frac,
  int,
  mixed,
  money,
  nearBoundary,
  ordinal,
  over,
  pct,
  piMul,
  powers,
  q,
  ratio,
  roundHalfUp,
  sub,
  sup,
  surd,
  terms,
  time12,
} from "../src/questions/kit.ts";

test("printers reproduce the printed forms of every stage", () => {
  const cases: [string, string][] = [
    [int(707), "707"],
    [`${int(9)} R ${int(5)}`, "9 R 5"],
    [
      terms([
        [3, "n"],
        [2, ""],
      ]),
      "3n + 2",
    ],
    [
      terms([
        [4, "n"],
        [-3, ""],
      ]),
      "4n − 3",
    ],
    [
      terms([
        [1, "n"],
        [5, ""],
      ]),
      "n + 5",
    ],
    [ordinal(20), "20th"],
    [ordinal(31), "31st"],
    [ordinal(22), "22nd"],
    [ordinal(23), "23rd"],
    [ordinal(13), "13th"],
    [ordinal(111), "111th"],
    [int(43650, true), "43,650"],
    [int(4259020, true), "4,259,020"],
    [int(9000, true), "9,000"],
    [int(159, true), "159"],
    [int(22696), "22696"],
    [
      powers([
        [2, 3],
        [3, 2],
        [5, 1],
      ]),
      "2^3 · 3^2 · 5",
    ],
    [frac(q(10, 8)), "5/4"],
    [over(6, 8), "6/8"],
    [mixed(q(14, 5)), "2 4/5"],
    [frac(q(45)), "45"],
    [dec(q(7, 100)), "0.07"],
    [dec(q(6, 1000)), "0.006"],
    [dec(q(13), 1), "13.0"],
    [dec(q(3070, 100), 2), "30.70"],
    [money(q(60)), "$60.00"],
    [pct(q(25, 2)), "12.5%"],
    [pct(q(1, 8)), "0.125%"],
    [money(q(27360, 100)), "$273.60"],
    [money(q(99, 100)), "$0.99"],
    [time12(17 * 60), "5:00 PM"],
    [time12(10 * 60 + 30), "10:30 AM"],
    [time12(12 * 60 + 30), "12:30 PM"],
    [time12(24 * 60 + 105), "1:45 AM"],
    [time12(15), "12:15 AM"],
    [duration(155), "2 h 35 min"],
    [duration(240), "4 h"],
    [`${int(2400, true)} g`, "2,400 g"],
    [`${dec(q(35, 10))} m`, "3.5 m"],
    [ratio(7, 12), "7 : 12"],
    [`${dec(q(284, 10))} km`, "28.4 km"],
    [int(-8), "−8"],
    [`${int(-36)} ÷ (${int(-4)})`, "−36 ÷ (−4)"],
    [money(q(-16), 0), "−$16"],
    [`(${int(-3)})${sup(2)} − 8${sup(2)}`, "(−3)² − 8²"],
    [`${int(-12)} °C`, "−12 °C"],
    [`2^${int(-3)}`, "2^−3"],
    [int(100000, true), "100,000"],
    [surd(6, 2), "6√2"],
    [frac(q(25, 9)), "25/9"],
    [
      terms([
        [-2, "x"],
        [10, ""],
      ]),
      "−2x + 10",
    ],
    [
      terms([
        [1, "x"],
        [4, ""],
      ]),
      "x + 4",
    ],
    [money(q(8), 0), "$8"],
    [money(q(7, 2), "auto"), "$3.50"],
    [money(q(4), "auto"), "$4"],
    [dec(q(1, 4)), "0.25"],
    [`x ≥ ${int(-2)}`, "x ≥ −2"],
    [`${piMul(14)} cm`, "14π cm"],
    [`${piMul(169)} cm²`, "169π cm²"],
    [`${surd(5, 2)} cm`, "5√2 cm"],
    [`(${int(4)}, ${dec(q(5, 2))})`, "(4, 2.5)"],
    [frac(q(-5, 7)), "−5/7"],
    [`y = (${frac(q(-3, 2))})x − 9`, "y = (−3/2)x − 9"],
    [frac(q(2, 12)), "1/6"],
    [int(1296), "1296"],
    [
      terms([
        [-3, `x${sup(3)}`],
        [-13, `x${sup(2)}`],
        [6, ""],
      ]),
      "−3x³ − 13x² + 6",
    ],
    [`x = (${int(-11)} ± √57)/4`, "x = (−11 ± √57)/4"],
    [`log${sub(2)} 512 = 9`, "log₂ 512 = 9"],
    [`5${sup(3)} = 125`, "5³ = 125"],
    [money(q(100507, 100)), "$1,005.07"],
    [`${fixed(350.4096, 2)} mg`, "350.41 mg"],
    [`log${sub(10)}(x${sup(4)}/y)`, "log₁₀(x⁴/y)"],
    [`f${sup(-1)}(x)`, "f⁻¹(x)"],
    [`${fixed(6.8567, 1)} cm`, "6.9 cm"],
    [surd(q(7, 2), 3), "7√3/2"],
    [surd(q(1, 2), 3), "√3/2"],
    [surd(q(-1, 2), 3), "−√3/2"],
    [surd(q(1, 3), 3), "√3/3"],
    [piMul(q(7, 12)), "7π/12"],
    [piMul(1), "π"],
    [`${piMul(2)} m`, "2π m"],
    [int(-8748, true), "−8,748"],
    [frac(q(625, 7)), "625/7"],
    [frac(q(-1125, 2), true), "−1,125/2"],
    [`a${sub(29)}`, "a₂₉"],
    [`a${sub("n−1")}`, "aₙ₋₁"],
    [`(x + 3)${sup(7)}`, "(x + 3)⁷"],
    [frac(q(-56, 3)), "−56/3"],
    [int(1296, true), "1,296"],
    [`x${sup(-3)}`, "x⁻³"],
    [`e${sup("x")}`, "eˣ"],
    [`∫${sub(-2)}${sup(1)}`, "∫₋₂¹"],
    [`lim x→${int(-2)}`, "lim x→−2"],
    [
      terms([
        [-10, `x${sup(4)}`],
        [-3, "x^(1/2)"],
      ]),
      "−10x⁴ − 3x^(1/2)",
    ],
    [
      `${terms([
        [3, "cos x"],
        [-9, "ln|x|"],
      ])} + C`,
      "3 cos x − 9 ln|x| + C",
    ],
    [
      terms([
        [10, `x${sup(4)} sin x`],
        [2, `x${sup(5)} cos x`],
      ]),
      "10x⁴ sin x + 2x⁵ cos x",
    ],
    [terms([[-4, "sin(2x)"]]), "−4 sin(2x)"],
    [terms([[21, "e^(7x)"]]), "21e^(7x)"],
    [terms([[-1, "x"]]), "−x"],
    [
      terms([
        [0, "x"],
        [0, ""],
      ]),
      "0",
    ],
  ];
  for (const [actual, expected] of cases) assert.equal(actual, expected);
});

test("exact decimals never round silently", () => {
  assert.throws(() => dec(q(1, 3)));
  assert.throws(() => dec(q(1, 8), 2));
  assert.equal(dec(roundHalfUp(q(3085, 100), 1), 1), "30.9");
  assert.equal(dec(roundHalfUp(q(125, 10))), "13");
  assert.equal(nearBoundary(0.125, 2), true);
  assert.equal(nearBoundary(0.1251, 2), false);
  assert.throws(() => fixed(2.675, 2));
});

test("rationals reduce and compare exactly", () => {
  assert.equal(`${q(6, -8)}`, "-3/4");
  assert.ok(q(1, 3).add(q(1, 6)).eq(q(1, 2)));
  assert.equal(q(-7, 2).floor(), -4);
  assert.equal(q(7, 2).ceil(), 4);
  assert.equal(`${q(0, -5)}`, "0");
  assert.throws(() => q(1, 0));
});

test("scripted draws are range-checked, and every scripted value is used", () => {
  const r = new ScriptedRng({ a: 3, who: "Mia", s: -1, order: [2, 0, 1] });
  assert.equal(r.int("a", 1, 9), 3);
  assert.equal(r.pick("who", ["Ava", "Mia"]), "Mia");
  assert.equal(r.sign("s"), -1);
  assert.deepEqual(r.shuffle("order", [0, 1, 2]), [2, 0, 1]);
  assert.deepEqual(r.unused(), []);
  assert.throws(() => new ScriptedRng({ a: 10 }).int("a", 1, 9), RangeError);
  assert.throws(() => new ScriptedRng({}).int("a", 1, 2));
  assert.throws(() =>
    new ScriptedRng({ c: 5 }).resample(
      () => 5,
      (c) => c !== 5,
    ),
  );
  assert.deepEqual(new ScriptedRng({ a: 1, b: 2 }).unused(), ["a", "b"]);
});

test("seeded draws stay in range, repeat by seed, and stop at the cap", () => {
  const r = new SeededRng(7);
  for (let i = 0; i < 2000; i++) {
    const v = r.int("v", -3, 4);
    assert.ok(Number.isInteger(v) && v >= -3 && v <= 4);
  }
  assert.equal(
    new SeededRng(99).int("x", 1, 1000),
    new SeededRng(99).int("x", 1, 1000),
  );
  assert.throws(
    () =>
      r.resample(
        () => r.int("v", 1, 2),
        (v) => v > 2,
      ),
    CapError,
  );
});

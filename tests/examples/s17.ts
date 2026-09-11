import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      {
        op: "A",
        pw: [3, 2, 0],
        p2: -7,
        p1: -9,
        p0: 2,
        q2: 4,
        q1: -4,
        q0: 4,
      },
      {
        op: "S",
        pw: [2, 1, 0],
        p2: -7,
        p1: 9,
        p0: 5,
        q2: -1,
        q1: -7,
        q0: -3,
      },
      {
        op: "S",
        pw: [3, 2, 1],
        p2: 2,
        p1: -3,
        p0: -5,
        q2: -7,
        q1: -4,
        q0: 2,
      },
    ],
    2: [
      { form: "B", v: "M", a: -6, b: 5 },
      { form: "B", v: "C", a: 9, b: -2 },
      { form: "M", c: 9, p: 6, q: -2, r: -1 },
    ],
    3: [
      { form: "S", m: 4, a: 3, s: -1 },
      { form: "D", v: "K", m: 1, a: 15 },
      { form: "D", v: "L", m: 3, a: 11 },
    ],
    4: [
      { form: "T", r: -6, s: -3, d: 1 },
      { form: "G", v: "K", g: 4, a: 7, b: 5 },
      { form: "G", v: "M", g: 9, a: 4, b: -7 },
    ],
    5: [
      { form: "A", p: 3, q: 1, s: -10 },
      { form: "A", p: 3, q: -11, s: -4 },
      { form: "DS", m: 8, a: 3 },
    ],
    6: [
      { r: -10, s: 11, pair: [-55, 2] },
      { r: -15, s: -9, pair: [-45, -3] },
      { r: -13, s: 7, pair: [-91, 1] },
    ],
    7: [
      { form: "V", a: -1, h: 2, c: 3 },
      { form: "X", z: "hi", a: -2, h: 2, t: -5 },
      { form: "X", z: "lo", a: 2, h: -3, t: 1 },
    ],
    8: [
      { form: "R", k: 2, w: 7 },
      { form: "C", v: "S", h: 3, n: 30 },
      { form: "C", v: "R", h: -6, n: 10 },
    ],
    9: [
      { form: "N", k: 2, u: "P", a: 7, n: 7, sign: 1 },
      { form: "N", k: 0, m: 3, a: 2, sign: 1 },
      { form: "F", v: "R", a: 2, b: 11, c: 8 },
    ],
    10: [
      {
        form: "A",
        z: "near",
        context: "rectangle",
        x: 9,
        d: 7,
        f: 12,
      },
      { form: "P", v: "M", ctx: "stone", R: 7, L: 1 },
      { form: "P", v: "B", ctx: "ball", R: 11, L: 5 },
    ],
  },
  extra: [
    {
      level: 3,
      vars: { form: "S", m: 2, a: 5, s: 1 },
      prompt: "Expand (2x + 5)².",
      choices: ["4x² + 20x + 25", "4x² + 25", "4x² + 10x + 25"],
      correct: "4x² + 20x + 25",
    },
    {
      level: 5,
      vars: { form: "DS", m: 1, a: 7 },
      prompt: "Factor x² − 49.",
      choices: ["(x + 7)(x − 7)", "(x − 7)²", "(x + 49)(x − 49)"],
      correct: "(x + 7)(x − 7)",
    },
    {
      level: 6,
      vars: { r: 3, s: 8, pair: [4, 6] },
      prompt: "Solve x² − 11x + 24 = 0.",
      choices: ["x = 3 or x = 8", "x = −8 or x = −3", "x = 4 or x = 6"],
      correct: "x = 3 or x = 8",
    },
    {
      level: 7,
      vars: { form: "V", a: 2, h: -1, c: 5 },
      prompt: "What is the vertex of y = 2x² + 4x + 5?",
      choices: ["(−1, 3)", "(1, 11)", "(−1, 5)"],
      correct: "(−1, 3)",
    },
    {
      level: 8,
      vars: { form: "R", k: 5, w: -3 },
      prompt: "Solve (x − 3)² = 25.",
      choices: ["x = −2 or x = 8", "x = −22 or x = 28", "x = −8 or x = 2"],
      correct: "x = −2 or x = 8",
    },
    {
      level: 9,
      vars: { form: "N", k: 1, a: 4, c: 9, sign: -1 },
      prompt: "How many real solutions does 4x² − 12x + 9 = 0 have?",
      choices: ["0", "1", "2"],
      correct: "1",
    },
    {
      level: 9,
      vars: { form: "N", k: 1, a: -2, c: -8, sign: 1 },
      prompt: "How many real solutions does −2x² + 8x − 8 = 0 have?",
      choices: ["0", "1", "2"],
      correct: "1",
    },
    {
      level: 9,
      vars: { form: "N", k: 2, u: "N", a: -3, m: 2, sign: -1 },
      prompt: "How many real solutions does −3x² − 4x + 4 = 0 have?",
      choices: ["0", "1", "2"],
      correct: "2",
    },
    {
      level: 9,
      vars: { form: "F", v: "D", a: 3, b: 5, c: 1 },
      prompt: "Solve 3x² + 5x + 1 = 0. Give the exact solutions.",
      choices: [
        "x = (−5 ± √13)/6",
        "x = (−5 ± √13)/2",
        "x = (−5 ± √13)/3",
      ],
      correct: "x = (−5 ± √13)/6",
    },
    {
      level: 10,
      vars: {
        form: "A",
        z: "far",
        context: "garden bed",
        x: 6,
        d: 5,
        f: 3,
      },
      prompt:
        "A garden bed is 5 m longer than it is wide. Its area is 66 m². How wide is it?",
      choices: ["6 m", "11 m", "3 m"],
      correct: "6 m",
    },
    {
      level: 10,
      vars: { form: "A", z: "near", context: "numbers", x: 4, d: 5, f: 6 },
      prompt:
        "Two whole numbers differ by 5. Their product is 36. What is the smaller number?",
      choices: ["4", "9", "6"],
      correct: "4",
    },
    {
      level: 10,
      vars: { form: "A", z: "far", context: "numbers", x: 8, d: 2, f: 5 },
      prompt:
        "Two whole numbers differ by 2. Their product is 80. What is the smaller number?",
      choices: ["8", "10", "5"],
      correct: "8",
    },
    {
      level: 10,
      vars: { form: "P", v: "B", ctx: "rocket", R: 9, L: 1 },
      prompt:
        "A rocket is launched from a tower. Its height after t seconds is h = −16t² + 128t + 144 feet. When does it hit the ground?",
      choices: ["9 s", "1 s", "4 s"],
      correct: "9 s",
    },
    {
      level: 10,
      vars: { form: "P", v: "M", ctx: "drone", R: 12, L: 8 },
      prompt:
        "A drone is launched from a balcony. Its height after t seconds is h = −16t² + 64t + 1536 feet. When does it hit the ground?",
      choices: ["12 s", "100 s", "2 s"],
      correct: "12 s",
    },
  ],
} satisfies Examples;

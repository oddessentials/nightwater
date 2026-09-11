import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { d: 5, k: 3, s: 1 },
      { d: 2, k: 9, s: -1 },
      { d: 10, k: 4, s: 1 },
    ],
    2: [
      { m: 3, dir: 1, t1: 7, s: -1 },
      { m: 7, dir: -1, t1: 120, s: 1 },
      { m: 9, dir: 1, t1: 0, s: 1 },
    ],
    3: [
      { a: 7, d: 6, s: 1 },
      { a: 40, d: 12, s: -1 },
      { a: 91, d: 3, s: 1 },
    ],
    4: [
      { F: "D", a: 3, s: 1 },
      { F: "D", a: 7, s: -1 },
      { F: "H", a: 5 },
    ],
    5: [
      { a: 4, d: 3, s: 1 },
      { a: 5, d: 5, s: -1 },
      { a: 2, d: 8, s: 1 },
    ],
    6: [
      { m: 3, b: 5, c: 1, q: 6 },
      { m: 4, b: 2, c: 2, q: 9 },
      { m: 2, b: 7, c: 3, q: 10 },
    ],
    7: [
      { a: 5, p: 1, g: 1, s: 1 },
      { a: 2, p: 2, g: 2, s: -1 },
      { a: 12, p: 3, g: 1, s: -1 },
    ],
    8: [
      { t1: 2, a: 3, b: 2, s: 1 },
      { t1: 4, a: 5, b: 3, s: -1 },
      { t1: 15, a: 2, b: 2, s: 1 },
    ],
    9: [
      { a: 5, d: 3, n: 20 },
      { a: 2, d: 7, n: 15 },
      { a: 12, d: 4, n: 31 },
    ],
    10: [
      { m: 3, b: 2 },
      { m: 4, b: -3 },
      { m: 5, b: 9 },
    ],
  },
  extra: [
    {
      level: 5,
      vars: { a: 1, d: 9, s: -1 },
      prompt: "Which rule makes 1, 10, 19, 28?",
      choices: [
        "Add 9 each time",
        "Add 8 each time",
        "Multiply by 2 each time",
      ],
      correct: "Add 9 each time",
    },
    {
      level: 5,
      vars: { a: 3, d: 2, s: -1 },
      prompt: "Which rule makes 3, 5, 7, 9?",
      choices: [
        "Add 2 each time",
        "Add 1 each time",
        "Multiply by 2 each time",
      ],
      correct: "Add 2 each time",
    },
    {
      level: 6,
      vars: { m: 5, b: 4, c: 1, q: 5 },
      prompt: "in → out: 1→9, 2→14, 3→19, 5→?",
      choices: ["29", "25", "21"],
      correct: "29",
    },
    {
      level: 9,
      vars: { a: 3, d: 5, n: 12 },
      prompt: "The pattern starts 3, 8, 13, … What is the 12th term?",
      choices: ["58", "63", "60"],
      correct: "58",
    },
    {
      level: 9,
      vars: { a: 20, d: 9, n: 42 },
      prompt: "The pattern starts 20, 29, 38, … What is the 42nd term?",
      choices: ["389", "398", "378"],
      correct: "389",
    },
    {
      level: 9,
      vars: { a: 1, d: 2, n: 23 },
      prompt: "The pattern starts 1, 3, 5, … What is the 23rd term?",
      choices: ["45", "47", "46"],
      correct: "45",
    },
    {
      level: 10,
      vars: { m: 2, b: 1 },
      prompt: "The pattern is 3, 5, 7, 9, … Which rule gives term n?",
      choices: ["2n + 1", "n + 2", "2n + 3"],
      correct: "2n + 1",
    },
    {
      level: 10,
      vars: { m: 3, b: -1 },
      prompt: "The pattern is 2, 5, 8, 11, … Which rule gives term n?",
      choices: ["3n − 1", "n + 3", "3n + 2"],
      correct: "3n − 1",
    },
  ],
} satisfies Examples;

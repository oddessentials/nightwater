import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { n: 4, m: 10, s1: 1, s2: -1 },
      { n: 7, m: 6, s1: -1, s2: 1 },
      { n: 12, m: 9, s1: -1, s2: -1 },
    ],
    2: [
      { N: 45, f: 3, s: 1 },
      { N: 84, f: 12, s: -1 },
      { N: 63, f: 7, s: -1 },
    ],
    3: [
      { N: 28, s: 1 },
      { N: 36, s: -1 },
      { N: 25, s: 1 },
    ],
    4: [
      { p: 17, one: true, c1: 87 },
      { p: 41, one: false, c1: 77, c2: 49 },
      { p: 79, one: false, c1: 93, c2: 81 },
    ],
    5: [
      { k: 3, L: 4, c: 6927, d1: 2102, d2: 2186 },
      { k: 4, L: 5, c: 22696, d1: 57226, d2: 82598 },
      { k: 9, L: 4, c: 2169, d1: 5406, d2: 1520 },
    ],
    6: [
      { a: 6, b: 8, s: -1 },
      { a: 4, b: 5, s: 1 },
      { a: 9, b: 12, s: 1 },
    ],
    7: [
      { g: 12, u: 4, v: 5, s: -1 },
      { g: 15, u: 2, v: 5, s: 1 },
      { g: 6, u: 8, v: 9, s: 1 },
    ],
    8: [
      { N: 72, i: 1, j: 2, t: 1, s: 1 },
      { N: 200, i: 1, j: 2, t: 2, s: 1 },
      { N: 360, i: 1, j: 2, t: 3, s: 1 },
    ],
    9: [
      { form: "A", a: 12, b: 27, s: -1, c1: "green", c2: "yellow" },
      { form: "A", a: 6, b: 20, s: 1, c1: "green", c2: "red" },
      { form: "B", a: 20, b: 24, P: "Omar", cord: "string" },
    ],
    10: [
      { s: 1, g: 4, u: 11, v: 12 },
      { s: -1, g: 12, u: 8, v: 3 },
      { s: 1, g: 6, u: 12, v: 5 },
    ],
  },
  extra: [
    {
      level: 2,
      vars: { N: 36, f: 4, s: 1 },
      prompt: "Which is a factor of 36?",
      choices: ["4", "5", "8"],
      correct: "4",
    },
    {
      level: 5,
      vars: { k: 6, L: 4, c: 4752, d1: 5271, d2: 3016 },
      prompt: "Which is divisible by 6?",
      choices: ["4752", "5271", "3016"],
      correct: "4752",
    },
    {
      level: 5,
      vars: { k: 8, L: 5, c: 31568, d1: 47212, d2: 60938 },
      prompt: "Which is divisible by 8?",
      choices: ["31568", "47212", "60938"],
      correct: "31568",
    },
    {
      level: 8,
      vars: { N: 180, i: 1, j: 3, t: 2, s: -1 },
      prompt: "What is the prime factorization of 180?",
      choices: ["2^2 · 3^2 · 5", "2 · 3^2 · 5^2", "2^2 · 3 · 5"],
      correct: "2^2 · 3^2 · 5",
    },
    {
      level: 9,
      vars: { form: "B", a: 12, b: 18, s: -1, P: "Ava", cord: "ribbon" },
      prompt:
        "Ava has a ribbon 12 cm long and another 18 cm long, and cuts both into equal pieces, as long as possible, with none left over. How long is each piece?",
      choices: ["6 cm", "3 cm", "2 cm"],
      correct: "6 cm",
    },
    {
      level: 9,
      vars: { form: "B", a: 20, b: 30, s: 1, P: "Kai", cord: "tape" },
      prompt:
        "Kai has a tape 20 cm long and another 30 cm long, and cuts both into equal pieces, as long as possible, with none left over. How long is each piece?",
      choices: ["10 cm", "60 cm", "20 cm"],
      correct: "10 cm",
    },
    {
      level: 9,
      vars: { form: "B", a: 14, b: 21, P: "Noor", cord: "rope" },
      prompt:
        "Noor has a rope 14 cm long and another 21 cm long, and cuts both into equal pieces, as long as possible, with none left over. How long is each piece?",
      choices: ["7 cm", "42 cm", "14 cm"],
      correct: "7 cm",
    },
    {
      level: 10,
      vars: { s: -1, g: 8, u: 3, v: 8 },
      prompt:
        "Two numbers have a greatest common factor of 8 and a least common multiple of 192. One of the numbers is 24. What is the other?",
      choices: ["64", "1536", "3"],
      correct: "64",
    },
    {
      level: 10,
      vars: { s: 1, g: 5, u: 7, v: 5 },
      prompt:
        "Two numbers have a greatest common factor of 5 and a least common multiple of 175. One of the numbers is 35. What is the other?",
      choices: ["25", "875", "7"],
      correct: "25",
    },
    {
      level: 10,
      vars: { s: 1, g: 2, u: 9, v: 2 },
      prompt:
        "Two numbers have a greatest common factor of 2 and a least common multiple of 36. One of the numbers is 18. What is the other?",
      choices: ["4", "72", "9"],
      correct: "4",
    },
    {
      level: 10,
      vars: { s: -1, g: 6, u: 2, v: 3 },
      prompt:
        "Two numbers have a greatest common factor of 6 and a least common multiple of 36. One of the numbers is 12. What is the other?",
      choices: ["18", "3", "6"],
      correct: "18",
    },
  ],
} satisfies Examples;

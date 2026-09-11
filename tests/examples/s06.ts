import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { d: 5, n: 2, Name: "Mia", food: "pizza" },
      { d: 8, n: 3, Name: "Ben", food: "cake" },
      { d: 12, n: 7, Name: "Zoe", food: "pie" },
    ],
    2: [
      { b: 4, a: 3, k: 2, s: 1 },
      { b: 5, a: 2, k: 3, s: -1 },
      { b: 6, a: 5, k: 4, s: 1 },
    ],
    3: [
      { mode: "D", d: 8, x: 5, y: 3 },
      { mode: "H", q: 9, a: 4, swap: 0 },
      { mode: "E", b: 4, a: 3, k: 3, swap: 0 },
    ],
    4: [
      { q: 3, p: 2, g: 6, s: 1 },
      { q: 5, p: 3, g: 4, s: -1 },
      { q: 8, p: 5, g: 7, s: 1 },
    ],
    5: [
      { op: "+", d: 8, a: 3, b: 7, s: 1 },
      { op: "−", d: 10, a: 9, b: 3, s: -1 },
      { op: "+", d: 12, a: 5, b: 3, s: 1 },
    ],
    6: [
      { q: 5, w: 2, n: 4, form: "A", s: 1 },
      { q: 7, w: 3, n: 5, form: "B" },
      { q: 9, w: 4, n: 7, form: "A", s: -1 },
    ],
    7: [
      { op: "+", b: 4, d: 6, a: 3, c: 5, s: -1 },
      { op: "−", b: 8, d: 3, a: 5, c: 1, s: 1 },
      { op: "+", b: 5, d: 3, a: 2, c: 2, s: 1 },
    ],
    8: [
      { form: "A", b: 3, d: 4, a: 2, c: 3 },
      { form: "A", b: 2, d: 5, a: 1, c: 3 },
      { form: "B", b: 4, a: 3, t: 5 },
    ],
    9: [
      { form: "A", b: 4, d: 2, a: 3, c: 1 },
      { form: "A", b: 3, d: 6, a: 2, c: 5 },
      { form: "B", b: 3, a: 2, t: 2 },
    ],
    10: [
      { b: 3, d: 4, a: 1, c: 1, form: "left", Name: "Ava", item: "paint" },
      { b: 5, d: 3, a: 2, c: 1, form: "used", Name: "Raj", item: "honey" },
      { b: 4, d: 5, a: 1, c: 2, form: "left", Name: "Ivy", item: "jam" },
    ],
  },
} satisfies Examples;

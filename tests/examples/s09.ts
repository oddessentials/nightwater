import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { a: 7, b: 12, ord: "XY", pair: "cats/dogs" },
      { a: 8, b: 11, ord: "YX", pair: "oak trees/pine trees" },
      { a: 3, b: 5, ord: "YX", pair: "green tiles/white tiles" },
    ],
    2: [
      { A: 18, B: 33 },
      { A: 52, B: 40 },
      { A: 25, B: 35 },
    ],
    3: [
      { kind: "speed", t: 6, r: 60, s: -1, veh: "train" },
      { kind: "typing", t: 9, r: 40, s: 1, name: "Fay" },
      { kind: "reading", t: 3, r: 34, s: -1, name: "Jo" },
    ],
    4: [
      { a: 2, b: 3, k: 2, s: 1, mix: "flour/sugar" },
      { a: 3, b: 2, k: 3, s: 1, mix: "flour/sugar" },
      { a: 7, b: 12, k: 2, s: -1, mix: "juice/soda" },
    ],
    5: [
      {
        p: 3,
        q: 2,
        w: 1,
        v: "S",
        m: 2,
        N1: "Kai",
        N2: "Zoe",
        item: "stickers",
      },
      { p: 2, q: 3, w: 2, v: "H", m: 4, N1: "Gus", N2: "Ivy", item: "marbles" },
      { p: 7, q: 2, w: 2, v: "S", m: 7, N1: "Ben", N2: "Zoe", item: "sweets" },
    ],
    6: [
      { fam: "V", mode: "A", n1: 4, n2: 5, u: [45, 50], item: "pencils" },
      { fam: "V", mode: "B", n1: 3, n2: 4, u: [50, 45], item: "muffins" },
      {
        fam: "R",
        mode: "E",
        one: [12, 6],
        two: [14, 7],
        act: "read",
        N1: "Sam",
        N2: "Ivy",
      },
    ],
    7: [
      { a: 3, b: 8, k: 2, s: -1 },
      { a: 5, b: 4, k: 1, s: 1 },
      { a: 9, b: 4, k: 2, s: 1 },
    ],
    8: [
      { S: 25, mm: 34, feature: "road" },
      { S: 50, mm: 72, feature: "trail" },
      { S: 10, mm: 125, feature: "canal" },
    ],
    9: [
      { form: "D", v: "B", r: 20, t: 135, veh: "cyclist" },
      { form: "T", v: "B", r: 60, q: [3, 2], veh: "coach" },
      { form: "R", v: "A", t: 75, d: 60, veh: "bus" },
    ],
    10: [
      { n1: 3, n2: 2, d1: 6, v: "A", setting: "workers/days/paint a hall" },
      { n1: 2, n2: 3, d1: 6, v: "T", setting: "taps/minutes/fill a tank" },
      { n1: 12, n2: 6, d1: 22, v: "A", setting: "pickers/days/clear a field" },
    ],
  },
  extra: [
    {
      level: 3,
      vars: { kind: "price", t: 5, r: 8, s: -1, item: "pens" },
      prompt: "5 pens cost $40.00. What does one cost?",
      choices: ["$8.00", "$40.00", "$10.00"],
      correct: "$8.00",
    },
    {
      level: 4,
      vars: { a: 2, b: 5, k: 3, s: 1, mix: "blue/white paint" },
      prompt:
        "A paint mix uses 2 tins of blue paint for every 5 tins of white paint. How many tins of white paint are needed for 6 tins of blue paint?",
      choices: ["15 tins", "9 tins", "20 tins"],
      correct: "15 tins",
    },
    {
      level: 4,
      vars: { a: 5, b: 3, k: 4, s: -1, mix: "red/yellow paint" },
      prompt:
        "A paint mix uses 5 tins of red paint for every 3 tins of yellow paint. How many tins of yellow paint are needed for 20 tins of red paint?",
      choices: ["12 tins", "18 tins", "9 tins"],
      correct: "12 tins",
    },
    {
      level: 4,
      vars: { a: 4, b: 7, k: 2, s: -1, mix: "oats/raisins" },
      prompt:
        "A recipe uses 4 cups of oats for every 7 cups of raisins. How many cups of raisins are needed for 8 cups of oats?",
      choices: ["14 cups", "11 cups", "7 cups"],
      correct: "14 cups",
    },
    {
      level: 6,
      vars: {
        fam: "V",
        mode: "E",
        n1: 2,
        n2: 3,
        u: [60, 60],
        item: "tennis balls",
      },
      prompt:
        "Which is better value: 2 tennis balls for $1.20, or 3 tennis balls for $1.80?",
      choices: [
        "They are the same value.",
        "3 tennis balls for $1.80",
        "2 tennis balls for $1.20",
      ],
      correct: "They are the same value.",
    },
    {
      level: 6,
      vars: {
        fam: "R",
        mode: "A",
        one: [13, 5],
        two: [23, 10],
        act: "read",
        N1: "Kai",
        N2: "Leo",
      },
      prompt:
        "Kai reads 13 pages in 5 minutes. Leo reads 23 pages in 10 minutes. Who reads faster?",
      choices: ["Kai", "Leo", "They read at the same rate."],
      correct: "Kai",
    },
    {
      level: 6,
      vars: {
        fam: "R",
        mode: "B",
        one: [8, 4],
        two: [11, 5],
        act: "swim",
        N1: "Mia",
        N2: "Omar",
      },
      prompt:
        "Mia swims 8 laps in 4 minutes. Omar swims 11 laps in 5 minutes. Who swims faster?",
      choices: ["Omar", "Mia", "They swim at the same rate."],
      correct: "Omar",
    },
    {
      level: 8,
      vars: { S: 25, mm: 33, feature: "river" },
      prompt:
        "On a map, 1 cm represents 25 km. A river measures 3.3 cm on the map. How long is the real river?",
      choices: ["82.5 km", "75 km", "28.3 km"],
      correct: "82.5 km",
    },
    {
      level: 9,
      vars: { form: "D", v: "A", r: 40, t: 135, veh: "ferry" },
      prompt:
        "A ferry travels for 135 minutes at 40 km/h. How far is the trip?",
      choices: ["90 km", "54 km", "120 km"],
      correct: "90 km",
    },
    {
      level: 9,
      vars: { form: "T", v: "A", r: 45, q: [6, 5], veh: "bus" },
      prompt:
        "A bus covers 54 km at 45 km/h. How many minutes does the trip take?",
      choices: ["72 min", "120 min", "50 min"],
      correct: "72 min",
    },
    {
      level: 9,
      vars: { form: "R", v: "B", t: 90, d: 72, veh: "coach" },
      prompt: "A coach covers 72 km in 90 minutes. What is the speed in km/h?",
      choices: ["48 km/h", "80 km/h", "72 km/h"],
      correct: "48 km/h",
    },
    {
      level: 10,
      vars: {
        n1: 2,
        n2: 6,
        d1: 3,
        v: "A",
        setting: "workers/days/paint a hall",
      },
      prompt:
        "2 workers take 3 days to paint a hall. At the same rate, how long would 6 workers take?",
      choices: ["1 day", "9 days", "6 days"],
      correct: "1 day",
    },
    {
      level: 10,
      vars: {
        n1: 4,
        n2: 2,
        d1: 2,
        v: "A",
        setting: "machines/hours/print an order",
      },
      prompt:
        "4 machines take 2 hours to print an order. At the same rate, how long would 2 machines take?",
      choices: ["4 hours", "1 hour", "8 hours"],
      correct: "4 hours",
    },
  ],
} satisfies Examples;

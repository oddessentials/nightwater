import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { form: "P", n: 9 },
      { form: "T", case: "isosceles", unit: "cm", e: 3, f: 4 },
      { form: "A", case: "right" },
    ],
    2: [
      { form: "R", z: "lo", unit: "cm", l: 13, w: 5 },
      { form: "M", unit: "m", l: 19, w: 13, g: 19 },
      { form: "G", unit: "m", n: 9, a: 31, s: 1 },
    ],
    3: [
      { form: "A", z: "lo", unit: "cm", l: 22, w: 16 },
      { form: "M", z: "hi", unit: "m", g: 15, h: 8 },
      { form: "S", z: "hi", unit: "m", a: 6 },
    ],
    4: [
      { ctx: "point", z: "lo", a: 121, b: 19, c: 23, u: 1 },
      { ctx: "line", z: "lo", a: 27, b: 25, u: 2 },
      { ctx: "tri", z: "lo", a: 17, b: 53, u: 1 },
    ],
    5: [
      { rel: "co-interior", d: 59, pos: 1 },
      { rel: "alternate interior", d: 134, pos: 0 },
      { rel: "corresponding", d: 113, pos: 0 },
    ],
    6: [
      { shape: "tri", z: "lo", unit: "m", b: 16, h: 20, c: 26 },
      { shape: "trap", z: "hi", unit: "m", a: 7, b: 3, h: 5 },
      { shape: "para", z: "lo", unit: "cm", b: 30, h: 23, c: 29 },
    ],
    7: [
      { qty: "C", giv: "r", u: "hi", object: "bicycle wheel", r: 7 },
      { qty: "A", giv: "r", u: "lo", object: "round pond", r: 14 },
      { qty: "A", giv: "d", u: "mid", object: "clock face", d: 26 },
    ],
    8: [
      { ask: "area", W: 13, H: 17, p: 3, q: 6 },
      { ask: "perimeter", v: "hi", W: 19, H: 20, p: 10, q: 14 },
      { ask: "area", W: 19, H: 10, p: 11, q: 7 },
    ],
    9: [
      { solid: "cyl", qty: "V", sw: "lo", r: 5, h: 10 },
      { solid: "cube", qty: "V", sw: "lo", a: 9 },
      { solid: "box", qty: "SA", sw: "lo", l: 12, w: 4, h: 3 },
    ],
    10: [
      { form: "H", u: "hi", unit: "m", triple: [45, 60, 75] },
      { form: "L", u: "hi", unit: "m", triple: [9, 12, 15], g: 9 },
      { form: "R", unit: "cm", legs: [5, 5] },
    ],
  },
  extra: [
    {
      level: 1,
      vars: { form: "P", n: 10 },
      prompt: "A polygon has 10 sides. What is it called?",
      choices: ["decagon", "octagon", "nonagon"],
      correct: "decagon",
    },
    {
      level: 1,
      vars: { form: "P", n: 3 },
      prompt: "A polygon has 3 sides. What is it called?",
      choices: ["triangle", "quadrilateral", "pentagon"],
      correct: "triangle",
    },
    {
      level: 1,
      vars: { form: "A", case: "acute", d: 35 },
      prompt: "An angle measures 35°. Which name fits it?",
      choices: ["acute", "right", "obtuse"],
      correct: "acute",
    },
    {
      level: 1,
      vars: { form: "A", case: "obtuse", d: 120 },
      prompt: "An angle measures 120°. Which name fits it?",
      choices: ["acute", "right", "obtuse"],
      correct: "obtuse",
    },
    {
      level: 1,
      vars: { form: "T", case: "equilateral", unit: "m", e: 7 },
      prompt: "A triangle has sides 7 m, 7 m and 7 m. Which name fits it?",
      choices: ["scalene", "isosceles", "equilateral"],
      correct: "equilateral",
    },
    {
      level: 1,
      vars: { form: "T", case: "scalene", unit: "cm", x: 7, y: 4, z: 5 },
      prompt: "A triangle has sides 4 cm, 5 cm and 7 cm. Which name fits it?",
      choices: ["scalene", "isosceles", "equilateral"],
      correct: "scalene",
    },
    {
      level: 1,
      vars: { form: "T", case: "isosceles", unit: "m", e: 6, f: 2 },
      prompt: "A triangle has sides 2 m, 6 m and 6 m. Which name fits it?",
      choices: ["scalene", "isosceles", "equilateral"],
      correct: "isosceles",
    },
    {
      level: 2,
      vars: { form: "R", z: "hi", unit: "m", l: 9, w: 5 },
      prompt: "A rectangle is 9 m long and 5 m wide. What is its perimeter?",
      choices: ["28 m", "45 m", "36 m"],
      correct: "28 m",
    },
    {
      level: 2,
      vars: { form: "M", unit: "cm", l: 20, w: 12, g: 12 },
      prompt:
        "A rectangle has perimeter 64 cm. One side is 12 cm. How long is the side next to it?",
      choices: ["20 cm", "52 cm", "16 cm"],
      correct: "20 cm",
    },
    {
      level: 2,
      vars: { form: "G", unit: "cm", n: 5, a: 8 },
      prompt: "A regular pentagon has sides 8 cm long. What is its perimeter?",
      choices: ["40 cm", "48 cm", "32 cm"],
      correct: "40 cm",
    },
    {
      level: 2,
      vars: { form: "G", unit: "m", n: 10, a: 7 },
      prompt: "A regular decagon has sides 7 m long. What is its perimeter?",
      choices: ["70 m", "63 m", "28 m"],
      correct: "70 m",
    },
    {
      level: 2,
      vars: { form: "G", unit: "cm", n: 7, a: 12, s: -1 },
      prompt: "A regular heptagon has sides 12 cm long. What is its perimeter?",
      choices: ["84 cm", "72 cm", "48 cm"],
      correct: "84 cm",
    },
    {
      level: 3,
      vars: { form: "A", z: "hi", unit: "cm", l: 9, w: 4 },
      prompt: "A rectangle is 9 cm long and 4 cm wide. What is its area?",
      choices: ["36 cm²", "26 cm²", "81 cm²"],
      correct: "36 cm²",
    },
    {
      level: 3,
      vars: { form: "S", z: "lo", unit: "cm", a: 7 },
      prompt: "A square has sides 7 cm long. What is its area?",
      choices: ["49 cm²", "28 cm²", "14 cm²"],
      correct: "49 cm²",
    },
    {
      level: 3,
      vars: { form: "M", z: "lo", unit: "m", g: 5, h: 12 },
      prompt:
        "A rectangle has area 60 m² and one side 5 m. How long is the other side?",
      choices: ["12 m", "55 m", "6 m"],
      correct: "12 m",
    },
    {
      level: 4,
      vars: { ctx: "tri", z: "hi", a: 60, b: 70, u: 2 },
      prompt:
        "Two angles of a triangle are 60° and 70°. How big is the third angle?",
      choices: ["50°", "120°", "130°"],
      correct: "50°",
    },
    {
      level: 4,
      vars: { ctx: "point", z: "hi", a: 100, b: 90, c: 80, u: 3 },
      prompt:
        "Angles of 100°, 90°, 80° and x meet at a point. How big is x?",
      choices: ["90°", "170°", "270°"],
      correct: "90°",
    },
    {
      level: 4,
      vars: { ctx: "line", z: "hi", a: 48, b: 97, u: 1 },
      prompt:
        "Angles of 48°, 97° and x sit side by side on a straight line. How big is x?",
      choices: ["35°", "83°", "145°"],
      correct: "35°",
    },
    {
      level: 5,
      vars: { rel: "alternate exterior", d: 50, pos: 2 },
      prompt:
        "Two parallel lines are cut by a transversal. Angle a is 50°. Angle b is alternate exterior to a. How big is angle b?",
      choices: ["50°", "130°", "40°"],
      correct: "50°",
    },
    {
      level: 5,
      vars: { rel: "vertically opposite", d: 160, pos: 3 },
      prompt:
        "Two parallel lines are cut by a transversal. Angle a is 160°. Angle b is vertically opposite a. How big is angle b?",
      choices: ["160°", "20°", "70°"],
      correct: "160°",
    },
    {
      level: 5,
      vars: { rel: "co-interior", d: 140, pos: 2 },
      prompt:
        "Two parallel lines are cut by a transversal. Angle a is 140°. Angle b is co-interior (same side) with a. How big is angle b?",
      choices: ["40°", "140°", "50°"],
      correct: "40°",
    },
    {
      level: 6,
      vars: { shape: "tri", z: "hi", unit: "cm", b: 6, h: 4, c: 5 },
      prompt:
        "A triangle has base 6 cm, slanted side 5 cm and height 4 cm. What is its area?",
      choices: ["12 cm²", "24 cm²", "15 cm²"],
      correct: "12 cm²",
    },
    {
      level: 6,
      vars: { shape: "para", z: "hi", unit: "m", b: 5, h: 3, c: 4 },
      prompt:
        "A parallelogram has base 5 m, slanted side 4 m and height 3 m. What is its area?",
      choices: ["15 m²", "20 m²", "18 m²"],
      correct: "15 m²",
    },
    {
      level: 6,
      vars: { shape: "trap", z: "lo", unit: "cm", a: 4, b: 10, h: 6 },
      prompt:
        "A trapezoid has parallel sides 4 cm and 10 cm, 6 cm apart. What is its area?",
      choices: ["42 cm²", "84 cm²", "24 cm²"],
      correct: "42 cm²",
    },
    {
      level: 7,
      vars: { qty: "C", giv: "r", u: "lo", object: "circle", unit: "m", r: 9 },
      prompt:
        "A circle has radius 9 m. What is its circumference? Give your answer in terms of π.",
      choices: ["18π m", "9π m", "81π m"],
      correct: "18π m",
    },
    {
      level: 7,
      vars: { qty: "C", giv: "d", u: "lo", object: "dinner plate", d: 24 },
      prompt:
        "A dinner plate has diameter 24 cm. What is its circumference? Give your answer in terms of π.",
      choices: ["24π cm", "12π cm", "48π cm"],
      correct: "24π cm",
    },
    {
      level: 7,
      vars: { qty: "C", giv: "d", u: "hi", object: "circular rug", d: 10 },
      prompt:
        "A circular rug has diameter 10 m. What is its circumference? Give your answer in terms of π.",
      choices: ["10π m", "25π m", "20π m"],
      correct: "10π m",
    },
    {
      level: 7,
      vars: {
        qty: "A",
        giv: "r",
        u: "mid",
        object: "circle",
        unit: "cm",
        r: 5,
      },
      prompt:
        "A circle has radius 5 cm. What is its area? Give your answer in terms of π.",
      choices: ["25π cm²", "10π cm²", "50π cm²"],
      correct: "25π cm²",
    },
    {
      level: 7,
      vars: { qty: "A", giv: "r", u: "hi", object: "clock face", r: 12 },
      prompt:
        "A clock face has radius 12 cm. What is its area? Give your answer in terms of π.",
      choices: ["144π cm²", "288π cm²", "576π cm²"],
      correct: "144π cm²",
    },
    {
      level: 7,
      vars: { qty: "A", giv: "d", u: "lo", object: "round pond", d: 20 },
      prompt:
        "A round pond has diameter 20 m. What is its area? Give your answer in terms of π.",
      choices: ["100π m²", "10π m²", "20π m²"],
      correct: "100π m²",
    },
    {
      level: 7,
      vars: { qty: "A", giv: "d", u: "hi", object: "bicycle wheel", d: 60 },
      prompt:
        "A bicycle wheel has diameter 60 cm. What is its area? Give your answer in terms of π.",
      choices: ["900π cm²", "3,600π cm²", "1,800π cm²"],
      correct: "900π cm²",
    },
    {
      level: 8,
      vars: { ask: "perimeter", v: "lo", W: 12, H: 10, p: 4, q: 3 },
      prompt:
        "An L-shaped plot has six sides. Going round from one corner they measure 12 m, 7 m, 4 m, 3 m, 8 m and 10 m. What is its perimeter?",
      choices: ["44 m", "37 m", "30 m"],
      correct: "44 m",
    },
    {
      level: 9,
      vars: { solid: "box", qty: "V", sw: "hi", l: 3, w: 4, h: 5 },
      prompt: "A box measures 3 cm by 4 cm by 5 cm. What is its volume?",
      choices: ["60 cm³", "94 cm³", "12 cm³"],
      correct: "60 cm³",
    },
    {
      level: 9,
      vars: { solid: "box", qty: "V", sw: "lo", l: 10, w: 8, h: 6 },
      prompt: "A box measures 10 cm by 8 cm by 6 cm. What is its volume?",
      choices: ["480 cm³", "376 cm³", "80 cm³"],
      correct: "480 cm³",
    },
    {
      level: 9,
      vars: { solid: "box", qty: "SA", sw: "hi", l: 10, w: 8, h: 6 },
      prompt:
        "A box measures 10 cm by 8 cm by 6 cm. What is its surface area?",
      choices: ["376 cm²", "480 cm²", "188 cm²"],
      correct: "376 cm²",
    },
    {
      level: 9,
      vars: { solid: "cube", qty: "V", sw: "hi", a: 4 },
      prompt: "A cube has edges 4 cm long. What is its volume?",
      choices: ["64 cm³", "96 cm³", "12 cm³"],
      correct: "64 cm³",
    },
    {
      level: 9,
      vars: { solid: "cube", qty: "SA", sw: "hi", a: 8 },
      prompt: "A cube has edges 8 cm long. What is its surface area?",
      choices: ["384 cm²", "512 cm²", "64 cm²"],
      correct: "384 cm²",
    },
    {
      level: 9,
      vars: { solid: "cube", qty: "SA", sw: "lo", a: 3 },
      prompt: "A cube has edges 3 cm long. What is its surface area?",
      choices: ["54 cm²", "27 cm²", "9 cm²"],
      correct: "54 cm²",
    },
    {
      level: 9,
      vars: { solid: "cyl", qty: "SA", sw: "hi", r: 5, h: 10 },
      prompt:
        "A cylinder has radius 5 cm and height 10 cm. What is its surface area? Give your answer in terms of π.",
      choices: ["150π cm²", "250π cm²", "100π cm²"],
      correct: "150π cm²",
    },
    {
      level: 9,
      vars: { solid: "cyl", qty: "SA", sw: "lo", r: 3, h: 4 },
      prompt:
        "A cylinder has radius 3 cm and height 4 cm. What is its surface area? Give your answer in terms of π.",
      choices: ["42π cm²", "36π cm²", "24π cm²"],
      correct: "42π cm²",
    },
    {
      level: 9,
      vars: { solid: "cyl", qty: "V", sw: "hi", r: 3, h: 7 },
      prompt:
        "A cylinder has radius 3 cm and height 7 cm. What is its volume? Give your answer in terms of π.",
      choices: ["63π cm³", "42π cm³", "252π cm³"],
      correct: "63π cm³",
    },
    {
      level: 10,
      vars: { form: "H", u: "lo", unit: "cm", triple: [8, 15, 17] },
      prompt:
        "A right triangle has legs 8 cm and 15 cm. How long is the hypotenuse?",
      choices: ["17 cm", "23 cm", "7 cm"],
      correct: "17 cm",
    },
    {
      level: 10,
      vars: { form: "L", u: "lo", unit: "m", triple: [5, 12, 13], g: 12 },
      prompt:
        "A right triangle has hypotenuse 13 m and one leg 12 m. How long is the other leg?",
      choices: ["5 m", "1 m", "25 m"],
      correct: "5 m",
    },
    {
      level: 10,
      vars: { form: "R", unit: "cm", legs: [2, 4] },
      prompt:
        "A right triangle has legs 2 cm and 4 cm. How long is the hypotenuse? Give your answer in simplest radical form.",
      choices: ["2√5 cm", "5√2 cm", "6 cm"],
      correct: "2√5 cm",
    },
  ],
} satisfies Examples;

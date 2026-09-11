import type { Examples } from "../support/fixtures.ts";

export default {
  levels: {
    1: [
      { form: "N", role: "hypotenuse", T: "BNR", c: "R", a: "B" },
      { form: "S", role: "adjacent side", T: "GMR", c: "G", a: "R" },
      { form: "N", role: "opposite side", T: "BNY", c: "Y", a: "N" },
    ],
    2: [
      { f: "cos", X: "A", gs: "AC", z: "top", tri: [16, 30, 34], BC: 16 },
      { f: "sin", X: "A", gs: "BC", z: "bottom", tri: [16, 63, 65], BC: 16 },
      { f: "tan", X: "B", gs: "BC", v: "H", tri: [32, 60, 68], BC: 60 },
    ],
    3: [
      { form: "HO", v: "R", t: 59, s: 8, U: "cm" },
      { form: "OA", v: "P", t: 23, s: 11, U: "cm" },
      { form: "AH", v: "P", t: 43, s: 28, U: "cm" },
    ],
    4: [
      { form: "OA", v: "W", U: "cm", x: 14, y: 12 },
      { form: "AH", v: "P", U: "m", x: 12, y: 18 },
      { form: "OH", v: "W", U: "m", x: 16, y: 25 },
    ],
    5: [
      { form: "V", fact: ["cos", 30], k: 7, pair: ["N-", "N+"] },
      { form: "V", fact: ["tan", 45], k: 2, pair: ["Ws", "M"] },
      { form: "A", fact: ["tan", 60], pair: ["C", "N+"] },
    ],
    6: [
      { form: "KH", v: "P", z: "same", L: 61, t: 67 },
      {
        form: "DP",
        v: "P",
        z: "same",
        H: 73,
        t: 51,
        look: ["tower", "car", "ground"],
      },
      {
        form: "EY",
        v: "P",
        z: "split",
        d: 27,
        t: 59,
        e: 1.4,
        name: "Zoe",
        thing: "tower",
      },
    ],
    7: [
      { form: "DR", y: "H", set: "F", d: 105 },
      { form: "RD", z: "same", d: 310, pair: ["T", "K"] },
      { form: "AD", pair: "DH", r: 12, theta: 30, U: "m" },
    ],
    8: [
      { form: "D", shape: "T3", f: "sin", t: 300 },
      { form: "D", shape: "T2", f: "cos", t: 150 },
      { form: "R", shape: "T1", f: "tan", t: 315 },
    ],
    9: [
      { form: "C", v1: "P", v2: "W", a: 8, b: 9, C: 39, U: "m" },
      { form: "C", v1: "N", v2: "W", a: 9, b: 5, C: 113, U: "m" },
      { form: "S", v: "X", A: 37, B: 96, a: 9, U: "cm" },
    ],
    10: [
      { f: "sin", sigma: -1, u: "1/2", a: 2, print: "value", pair: ["Q", "P"] },
      { f: "cos", sigma: 1, u: "1/2", a: 4, print: "value", pair: ["Q", "G"] },
      { f: "tan", sigma: -1, u: "√3", a: 2, print: "zero", pair: ["Q", "S"] },
    ],
  },
  extra: [
    {
      level: 1,
      vars: { form: "N", role: "adjacent side", T: "DKP", c: "K", a: "P" },
      prompt:
        "Triangle DKP has a right angle at K. Relative to angle P, side KP is the…",
      choices: ["opposite side", "adjacent side", "hypotenuse"],
      correct: "adjacent side",
    },
    {
      level: 1,
      vars: { form: "S", role: "hypotenuse", T: "ELT", c: "E", a: "T" },
      prompt:
        "Triangle ELT has a right angle at E. Relative to angle T, which side is the hypotenuse?",
      choices: ["LT", "EL", "ET"],
      correct: "LT",
    },
    {
      level: 1,
      vars: { form: "S", role: "opposite side", T: "AQZ", c: "Q", a: "Z" },
      prompt:
        "Triangle AQZ has a right angle at Q. Relative to angle Z, which side is the opposite side?",
      choices: ["AZ", "AQ", "QZ"],
      correct: "AQ",
    },
    {
      level: 2,
      vars: { f: "tan", X: "A", gs: "AC", v: "D", tri: [5, 12, 13], BC: 5 },
      prompt:
        "Triangle ABC has a right angle at C, with AB = 13 and AC = 12. What is tan A?",
      choices: ["5/12", "12/13", "1/12"],
      correct: "5/12",
    },
    {
      level: 2,
      vars: {
        f: "sin",
        X: "B",
        gs: "BC",
        z: "middle",
        tri: [20, 21, 29],
        BC: 21,
      },
      prompt:
        "Triangle ABC has a right angle at C, with AB = 29 and BC = 21. What is sin B?",
      choices: ["20/29", "21/29", "8/29"],
      correct: "20/29",
    },
    {
      level: 3,
      vars: { form: "HA", v: "P", t: 32, s: 20, U: "m" },
      prompt:
        "A right triangle has a 32° angle. The hypotenuse is 20 m. How long is the side adjacent to the 32° angle? Round to 1 dp.",
      choices: ["17.0 m", "10.6 m", "16.0 m"],
      correct: "17.0 m",
    },
    {
      level: 3,
      vars: { form: "AO", v: "R", t: 20, s: 25, U: "cm" },
      prompt:
        "A right triangle has a 20° angle. The side adjacent to the 20° angle is 25 cm. How long is the side opposite the 20° angle? Round to 1 dp.",
      choices: ["9.1 cm", "68.7 cm", "55.9 cm"],
      correct: "9.1 cm",
    },
    {
      level: 3,
      vars: { form: "OH", v: "R", t: 40, s: 9, U: "cm" },
      prompt:
        "A right triangle has a 40° angle. The side opposite the 40° angle is 9 cm. How long is the hypotenuse? Round to 1 dp.",
      choices: ["14.0 cm", "11.7 cm", "12.1 cm"],
      correct: "14.0 cm",
    },
    {
      level: 4,
      vars: { form: "OA", v: "P", U: "m", x: 7, y: 9 },
      prompt:
        "In a right triangle, the side opposite angle θ is 7 m and the side adjacent to it is 9 m. What is θ to the nearest degree?",
      choices: ["38°", "52°", "39°"],
      correct: "38°",
    },
    {
      level: 4,
      vars: { form: "OH", v: "P", U: "cm", x: 5, y: 13 },
      prompt:
        "In a right triangle, the side opposite angle θ is 5 cm and the hypotenuse is 13 cm. What is θ to the nearest degree?",
      choices: ["23°", "67°", "24°"],
      correct: "23°",
    },
    {
      level: 4,
      vars: { form: "AH", v: "W", U: "m", x: 9, y: 11 },
      prompt:
        "In a right triangle, the side adjacent to angle θ is 9 m and the hypotenuse is 11 m. What is θ to the nearest degree?",
      choices: ["35°", "55°", "39°"],
      correct: "35°",
    },
    {
      level: 5,
      vars: { form: "V", fact: ["sin", 0], k: 1, pair: ["C", "N+"] },
      prompt: "What is the exact value of sin 0°?",
      choices: ["0", "1", "1/2"],
      correct: "0",
    },
    {
      level: 5,
      vars: { form: "V", fact: ["tan", 30], k: 3, pair: ["N+", "Wc"] },
      prompt: "What is the exact value of 3 tan 30°?",
      choices: ["√3", "3", "3√3/2"],
      correct: "√3",
    },
    {
      level: 5,
      vars: { form: "A", fact: ["cos", 45], pair: ["N-", "N+"] },
      prompt: "θ is between 0° and 90°, and cos θ = √2/2. What is θ?",
      choices: ["45°", "30°", "60°"],
      correct: "45°",
    },
    {
      level: 6,
      vars: { form: "LH", z: "same", L: 8, t: 57 },
      prompt:
        "An 8 m ladder leans against a wall, making an angle of 57° with the level ground. How high up the wall does it reach? Round to 1 dp.",
      choices: ["6.7 m", "4.4 m", "6.4 m"],
      correct: "6.7 m",
    },
    {
      level: 6,
      vars: { form: "LF", z: "split", L: 12, t: 70 },
      prompt:
        "A 12 m ladder leans against a wall, making an angle of 70° with the level ground. How far is its foot from the wall? Round to 1 dp.",
      choices: ["4.1 m", "11.3 m", "3.6 m"],
      correct: "4.1 m",
    },
    {
      level: 6,
      vars: { form: "EL", v: "R", z: "split", d: 30, t: 35, thing: "building" },
      prompt:
        "From a point 30 m from the foot of a building, on level ground, the angle of elevation to its top is 35°. How tall is the building? Round to 1 dp.",
      choices: ["21.0 m", "42.8 m", "14.2 m"],
      correct: "21.0 m",
    },
    {
      level: 6,
      vars: {
        form: "EY",
        v: "E",
        z: "same",
        d: 20,
        t: 50,
        e: 1.6,
        name: "Omar",
        thing: "mast",
      },
      prompt:
        "Omar's eyes are 1.6 m above the level ground. From 20 m away, Omar sees the top of a mast at an angle of elevation of 50°. How tall is the mast? Round to 1 dp.",
      choices: ["25.4 m", "18.4 m", "23.8 m"],
      correct: "25.4 m",
    },
    {
      level: 6,
      vars: {
        form: "DP",
        v: "R",
        z: "same",
        H: 40,
        t: 20,
        look: ["bridge", "buoy", "water"],
      },
      prompt:
        "From the top of a bridge 40 m above the water, the angle of depression to a buoy is 20°. How far is the buoy from the foot of the bridge? Round to 1 dp.",
      choices: ["109.9 m", "14.6 m", "17.9 m"],
      correct: "109.9 m",
    },
    {
      level: 6,
      vars: { form: "KH", v: "R", z: "same", L: 84, t: 40 },
      prompt:
        "A kite is flying on an 84 m string that makes an angle of 40° with the level ground. How high is the kite above the point where the string is held? Round to 1 dp.",
      choices: ["54.0 m", "64.3 m", "62.6 m"],
      correct: "54.0 m",
    },
    {
      level: 7,
      vars: { form: "DR", y: "T", set: "flip", d: 150 },
      prompt: "Write 150° in radians.",
      choices: ["5π/6", "5π/3", "3π/5"],
      correct: "5π/6",
    },
    {
      level: 7,
      vars: { form: "RD", z: "split", d: 120, pair: ["T", "F"] },
      prompt: "Write 2π/3 in degrees.",
      choices: ["120°", "60°", "270°"],
      correct: "120°",
    },
    {
      level: 7,
      vars: { form: "AR", pair: "AD", r: 5, theta: [3, 4], U: "cm" },
      prompt:
        "A circle has radius 5 cm. An arc subtends an angle of 3π/4 at the centre. How long is the arc? Give an exact answer.",
      choices: ["15π/4 cm", "75π/8 cm", "15π/2 cm"],
      correct: "15π/4 cm",
    },
    {
      level: 7,
      vars: { form: "AD", pair: "AH", r: 6, theta: 120, U: "m" },
      prompt:
        "A circle has radius 6 m. An arc subtends an angle of 120° at the centre. How long is the arc? Give an exact answer.",
      choices: ["4π m", "12π m", "2π m"],
      correct: "4π m",
    },
    {
      level: 8,
      vars: { form: "R", shape: "T2", f: "sin", t: 225 },
      prompt: "What is the exact value of sin(5π/4)?",
      choices: ["−√2/2", "−1", "1"],
      correct: "−√2/2",
    },
    {
      level: 8,
      vars: { form: "D", shape: "T1", f: "tan", t: 150 },
      prompt: "What is the exact value of tan 150°?",
      choices: ["−√3/3", "√3/3", "−√3"],
      correct: "−√3/3",
    },
    {
      level: 9,
      vars: { form: "C", U: "cm", v1: "P", v2: "R", a: 7, b: 9, C: 60 },
      prompt:
        "In triangle ABC, a = 7 cm, b = 9 cm and angle C = 60°. How long is side c? Round to 1 dp.",
      choices: ["8.2 cm", "13.9 cm", "15.8 cm"],
      correct: "8.2 cm",
    },
    {
      level: 9,
      vars: { form: "S", U: "m", v: "R", A: 40, B: 90, a: 10 },
      prompt:
        "In triangle ABC, angle A = 40°, angle B = 90° and a = 10 m. How long is side b? Round to 1 dp.",
      choices: ["15.6 m", "6.4 m", "12.0 m"],
      correct: "15.6 m",
    },
    {
      level: 10,
      vars: {
        f: "tan",
        sigma: 1,
        u: "√3",
        a: 1,
        print: "zero",
        pair: ["P", "G"],
      },
      prompt: "Solve tan x − √3 = 0 for 0° ≤ x < 360°.",
      choices: ["{60°, 240°}", "{60°, 300°}", "{120°, 300°}"],
      correct: "{60°, 240°}",
    },
    {
      level: 10,
      vars: {
        f: "cos",
        sigma: -1,
        u: "√3/2",
        a: 6,
        print: "zero",
        pair: ["G", "S"],
      },
      prompt: "Solve 6 cos x + 3√3 = 0 for 0° ≤ x < 360°.",
      choices: ["{150°, 210°}", "{30°, 330°}", "{120°, 240°}"],
      correct: "{150°, 210°}",
    },
    {
      level: 10,
      vars: {
        f: "sin",
        sigma: 1,
        u: "√3/2",
        a: 4,
        print: "value",
        pair: ["P", "S"],
      },
      prompt: "Solve 4 sin x = 2√3 for 0° ≤ x < 360°.",
      choices: ["{60°, 120°}", "{60°, 240°}", "{30°, 150°}"],
      correct: "{60°, 120°}",
    },
  ],
} satisfies Examples;

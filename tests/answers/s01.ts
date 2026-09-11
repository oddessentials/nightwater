import { evaluate, only, type Asked, type Checks } from "../support/math.ts";

const worked = (q: Asked) => {
  const target = evaluate(q.prompt.replace(/ = \?$/, ""));
  return only(q.choices, (c) => evaluate(c) === target);
};

const balanced = (q: Asked) => {
  const [left, right] = q.prompt.split(" = ");
  return only(
    q.choices,
    (c) => evaluate(left.replace("?", c)) === evaluate(right.replace("?", c)),
  );
};

const compared = (q: Asked) => {
  const [, a, b] = /^Which is greater: (.+) or (.+)\?$/.exec(q.prompt)!;
  const left = evaluate(a);
  const right = evaluate(b);
  const want = left > right ? a : right > left ? b : "They are equal";
  return only(q.choices, (c) => c === want);
};

export default {
  1: worked,
  2: worked,
  3: worked,
  4: worked,
  5: balanced,
  6: compared,
  7: worked,
  9: balanced,
} satisfies Checks;

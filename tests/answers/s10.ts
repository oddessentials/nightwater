import { evaluate, only, type Asked, type Checks } from "../support/math.ts";

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

const signed = (text: string) => {
  if (!/^−?\$?\d+$/.test(text)) throw new Error(`unreadable amount ${text}`);
  return evaluate(text.replace("$", ""));
};

const worked = (q: Asked) => {
  const target = evaluate(read(/^What is (.+)\?$/, q)[1]);
  return only(q.choices, (c) => evaluate(c) === target);
};

const ordered = (q: Asked) => {
  const match =
    /^On (\w+) it was (\S+) °C, on (\w+) it was (\S+) °C, on (\w+) it was (\S+) °C\. Which day was (coldest|warmest)\?$/.exec(
      q.prompt,
    ) ??
    read(
      /^(\w+)'s balance is (\S+), (\w+)'s is (\S+), (\w+)'s is (\S+)\. Whose balance is (lowest|highest)\?$/,
      q,
    );
  const named = [1, 3, 5].map((i) => ({
    who: match[i],
    value: signed(match[i + 1]),
  }));
  if (
    named
      .map((n) => n.who)
      .sort()
      .join() !== [...q.choices].sort().join()
  )
    throw new Error("the choices are not the three labels");
  const low = match[7] === "coldest" || match[7] === "lowest";
  const values = named.map((n) => n.value);
  const extreme = low ? Math.min(...values) : Math.max(...values);
  return only(
    q.choices,
    (c) => named.find((n) => n.who === c)!.value === extreme,
  );
};

const apart = (q: Asked) => {
  const far = /^How far apart are (\S+) and (\S+) on the number line\?$/.exec(
    q.prompt,
  );
  if (!far) return worked(q);
  const [from, to] = [evaluate(far[1]), evaluate(far[2])].sort((x, y) => x - y);
  let steps = 0;
  for (let at = from; at < to; at++) steps++;
  return only(q.choices, (c) => evaluate(c) === steps);
};

const STORIES = [
  {
    pattern:
      /^The temperature is (?<start>\S+) °C\. It (?<steps>.+)\. What is the temperature now\?$/,
    moves: { rises: 1, drops: -1 } as Record<string, number>,
    step: /^(\d+)°$/,
    unit: /^(\S+) °C$/,
    ceiling: 50,
  },
  {
    pattern:
      /^A submarine is at (?<start>\S+) m\. It (?<steps>.+)\. What is the depth now\?$/,
    moves: { rises: 1, dives: -1 } as Record<string, number>,
    step: /^(\d+) m$/,
    unit: /^(\S+) m$/,
    ceiling: 0,
  },
  {
    pattern:
      /^(?<who>[A-Z][a-z]+)'s balance is (?<start>\S+)\. \k<who> (?<steps>.+)\. What is the balance now\?$/,
    moves: { "pays in": 1, spends: -1 } as Record<string, number>,
    step: /^\$(\d+)$/,
    unit: /^(−?\$\d+)$/,
    ceiling: 50,
  },
];

const story = (q: Asked) => {
  for (const { pattern, moves, step, unit, ceiling } of STORIES) {
    const match = pattern.exec(q.prompt);
    if (!match) continue;
    const path = [signed(match.groups!.start)];
    for (const part of match.groups!.steps.split(", then ")) {
      const move = /^(rises|drops|dives|pays in|spends) (.+)$/.exec(part);
      const size = move && move[1] in moves ? step.exec(move[2]) : null;
      if (!move || !size) throw new Error(`unreadable step ${part}`);
      path.push(path[path.length - 1] + moves[move[1]] * Number(size[1]));
    }
    for (const at of path)
      if (at > ceiling) throw new Error(`${at} passes the ceiling ${ceiling}`);
    const now = path[path.length - 1];
    const value = (c: string) => {
      const found = unit.exec(c);
      if (!found) throw new Error(`${c} does not carry the question's unit`);
      return signed(found[1]);
    };
    for (const c of q.choices)
      if (value(c) > ceiling)
        throw new Error(`${c} passes the ceiling ${ceiling}`);
    return only(q.choices, (c) => value(c) === now);
  }
  throw new Error(`unexpected prompt: ${q.prompt}`);
};

const grouped = (q: Asked) => {
  const [, plain, target] = read(/^Which brackets make (.+) equal (\S+)\?$/, q);
  const want = evaluate(target);
  return only(
    q.choices,
    (c) =>
      c.split("(").length === 2 &&
      c.replace(/[()]/g, "") === plain &&
      evaluate(c) === want,
  );
};

export default {
  1: ordered,
  2: worked,
  3: worked,
  4: worked,
  5: worked,
  6: worked,
  7: apart,
  8: story,
  9: grouped,
  10: worked,
} satisfies Checks;

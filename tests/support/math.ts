import type { Question } from "../../src/questions/index.ts";

type Env = Record<string, number>;
type Node = (env: Env) => number;
type Token =
  | { type: "num"; value: number }
  | { type: "name"; value: string }
  | { type: "op"; value: string }
  | { type: "sup"; value: string }
  | { type: "sub"; value: string };

const SUPERS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  ˣ: "x",
};
const SUBS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₋": "-",
  ₙ: "n",
};
const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  ln: Math.log,
};
const OPS: Record<string, string> = {
  "-": "−",
  "·": "×",
  "*": "×",
  "[": "(",
  "]": ")",
};

function tokenize(text: string) {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const rest = text.slice(i);
    if (c === " ") {
      i++;
      continue;
    }
    const fraction =
      /^(\d{1,3}(?:,\d{3})+|\d+)\/(\d{1,3}(?:,\d{3})+|\d+)(?![\d.])/.exec(rest);
    if (fraction) {
      const [top, bottom] = [fraction[1], fraction[2]].map((part) =>
        Number(part.replace(/,/g, "")),
      );
      tokens.push({ type: "num", value: top / bottom });
      i += fraction[0].length;
      continue;
    }
    const number = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/.exec(rest);
    if (number) {
      tokens.push({ type: "num", value: Number(number[0].replace(/,/g, "")) });
      i += number[0].length;
      continue;
    }
    for (const [type, map] of [
      ["sup", SUPERS],
      ["sub", SUBS],
    ] as const)
      if (c in map) {
        let value = "";
        while (i < text.length && text[i] in map) value += map[text[i++]];
        tokens.push({ type, value });
      }
    if (i < text.length && (text[i] in SUPERS || text[i] in SUBS)) continue;
    if (c !== text[i]) continue;
    const word = /^(sin|cos|tan|ln|log)/.exec(rest);
    if (word) {
      tokens.push({ type: "name", value: word[0] });
      i += word[0].length;
      continue;
    }
    if (/[a-zA-Zπθ]/.test(c)) tokens.push({ type: "name", value: c });
    else tokens.push({ type: "op", value: OPS[c] ?? c });
    i++;
  }
  return tokens;
}

export function parse(text: string): Node {
  const tokens = tokenize(text);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (value: string) =>
    peek()?.type === "op" && peek().value === value;
  const expect = (value: string) => {
    if (!isOp(value)) throw new SyntaxError(`expected ${value} in ${text}`);
    pos++;
  };
  const startsAtom = () => {
    const t = peek();
    return (
      !!t &&
      (t.type === "num" ||
        t.type === "name" ||
        (t.type === "op" && ["(", "√", "∛"].includes(t.value)))
    );
  };
  function expression(): Node {
    let left = term();
    while (isOp("+") || isOp("−")) {
      const op = tokens[pos++].value;
      const right = term();
      const l = left;
      left = op === "+" ? (e) => l(e) + right(e) : (e) => l(e) - right(e);
    }
    return left;
  }
  function term(): Node {
    let left = unary();
    for (;;) {
      if (isOp("×") || isOp("÷") || isOp("/")) {
        const op = tokens[pos++].value;
        const right = unary();
        const l = left;
        left = op === "×" ? (e) => l(e) * right(e) : (e) => l(e) / right(e);
      } else if (startsAtom()) {
        const right = power();
        const l = left;
        left = (e) => l(e) * right(e);
      } else return left;
    }
  }
  function unary(): Node {
    if (isOp("−")) {
      pos++;
      const inner = unary();
      return (e) => -inner(e);
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }
  function power(): Node {
    const base = postfix();
    if (!isOp("^")) return base;
    pos++;
    const exponent = unary();
    return (e) => base(e) ** exponent(e);
  }
  function postfix(): Node {
    let base = atom();
    while (peek()?.type === "sup") {
      const exponent = parse(String(tokens[pos++].value));
      const b = base;
      base = (e) => b(e) ** exponent(e);
    }
    return base;
  }
  function atom(): Node {
    const token = tokens[pos++];
    if (!token) throw new SyntaxError(`unexpected end of ${text}`);
    if (token.type === "num") {
      const value = token.value;
      return () => value;
    }
    if (token.type === "name") {
      const name = token.value;
      if (name in FUNCS) {
        const f = FUNCS[name];
        const arg = postfix();
        return (e) => f(arg(e));
      }
      if (name === "log") {
        const base = tokens[pos++];
        if (base?.type !== "sub")
          throw new SyntaxError(`log needs a base in ${text}`);
        const b = Number(base.value);
        const arg = postfix();
        return (e) => Math.log(arg(e)) / Math.log(b);
      }
      if (name === "π") return () => Math.PI;
      if (name === "e") return () => Math.E;
      return (env) => {
        if (!(name in env))
          throw new ReferenceError(`unknown ${name} in ${text}`);
        return env[name];
      };
    }
    if (token.type === "op") {
      if (token.value === "(") {
        const inner = expression();
        expect(")");
        return inner;
      }
      if (token.value === "|") {
        const inner = expression();
        expect("|");
        return (e) => Math.abs(inner(e));
      }
      if (token.value === "√") {
        const inner = postfix();
        return (e) => Math.sqrt(inner(e));
      }
      if (token.value === "∛") {
        const inner = postfix();
        return (e) => Math.cbrt(inner(e));
      }
    }
    throw new SyntaxError(`unexpected ${token.value} in ${text}`);
  }
  const node = expression();
  if (pos < tokens.length)
    throw new SyntaxError(`unexpected ${tokens[pos].value} in ${text}`);
  return node;
}

export const evaluate = (text: string, env: Env = {}) => parse(text)(env);

export type Asked = Pick<Question, "prompt" | "choices" | "domain">;
export type Check = (question: Asked) => number;
export type Checks = Record<number, Check>;

export function only(choices: string[], ok: (choice: string) => boolean) {
  const hits = choices.flatMap((choice, i) => (ok(choice) ? [i] : []));
  if (hits.length !== 1)
    throw new Error(`${hits.length} choices fit: ${choices.join(" / ")}`);
  return hits[0];
}

export const close = (a: number, b: number, tolerance = 1e-9) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

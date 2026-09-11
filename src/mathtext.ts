export type Run = { readonly text: string; readonly raised: boolean };

const NBSP = "\u00a0";
const EXPONENT = /\^(?:\(([^()]*)\)|([−-]?[0-9A-Za-z]+))/g;
const OPERATORS = new Set([
  "+",
  "−",
  "×",
  "÷",
  "·",
  "=",
  "≠",
  "<",
  ">",
  "≤",
  "≥",
  "±",
  "≈",
  ":",
  "→",
]);
const BINARY = new Set([
  "+",
  "−",
  "×",
  "÷",
  "·",
  "=",
  "≠",
  "<",
  ">",
  "≤",
  "≥",
  "±",
  "≈",
]);
const FUNCTION = /^(?:sin|cos|tan|ln|lim|log[₀-₉]*)$/;
const OPENS_FUNCTION = /^(?:sin|cos|tan|ln|log)(?![a-z])/;
const WORD = /^[A-Za-z]{2,}[.,;:]?$/;
const UNIT =
  /^(?:[mck]?m|[mk]?g|[mk]?L|h|min|s|ft|in|lb|oz|AM|PM|units?|km\/h|m\/s|°[CF])[²³]?[.,;:?!)]*$/;
const RAISED_SIZE = 0.68;
const RAISED_LIFT = 0.36;

export function runs(text: string): Run[] {
  const out: Run[] = [];
  let last = 0;
  for (const match of text.matchAll(EXPONENT)) {
    if (match.index > last)
      out.push({ text: text.slice(last, match.index), raised: false });
    out.push({ text: match[1] ?? match[2], raised: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), raised: false });
  return out;
}

function sticks(words: readonly string[], i: number, depth: number) {
  const a = words[i];
  const b = words[i + 1];
  if (!a || !b) return false;
  return (
    depth > 0 ||
    OPERATORS.has(a) ||
    OPERATORS.has(b) ||
    FUNCTION.test(a) ||
    (OPENS_FUNCTION.test(b) && !WORD.test(a)) ||
    a.startsWith("∫") ||
    /^[a-zθ]→/.test(a) ||
    /^d\/d[a-z]$/.test(a) ||
    /^d[a-zθ][.,;:?!]*$/.test(b) ||
    (/[\dπ]$/.test(a) && UNIT.test(b)) ||
    (UNIT.test(a) && /^\d/.test(b) && UNIT.test(words[i + 2] ?? "")) ||
    (/^\d+$/.test(a) && /^\d+\/\d+/.test(b))
  );
}

export function glue(text: string, breaks = false) {
  const words = text.split(" ");
  let depth = 0;
  let out = words[0];
  for (let i = 0; i + 1 < words.length; i++) {
    for (const c of words[i]) {
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
    }
    const open = breaks && depth === 0 && BINARY.has(words[i]);
    out += (!open && sticks(words, i, depth) ? NBSP : " ") + words[i + 1];
  }
  return out;
}

const spaced = (text: string) => text.replace(/\u00a0/g, " ");

export function widthOf(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  family: string,
) {
  let width = 0;
  for (const run of runs(text)) {
    ctx.font = `${run.raised ? size * RAISED_SIZE : size}px ${family}`;
    width += ctx.measureText(spaced(run.text)).width;
  }
  return width;
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  centre: number,
  y: number,
  size: number,
  family: string,
) {
  let x = centre - widthOf(ctx, text, size, family) / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  for (const run of runs(text)) {
    const piece = spaced(run.text);
    ctx.font = `${run.raised ? size * RAISED_SIZE : size}px ${family}`;
    ctx.fillText(piece, x, run.raised ? y - size * RAISED_LIFT : y);
    x += ctx.measureText(piece).width;
  }
  ctx.textAlign = align;
}

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  size: number,
  family: string,
) {
  const lines: string[] = [];
  let line = "";
  for (const word of glue(text).split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && widthOf(ctx, next, size, family) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

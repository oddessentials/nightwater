import { readFileSync } from "node:fs";

export type Example = {
  level: number;
  index: number;
  prompt: string;
  choices: string[];
  correct: string;
};

export type Vars = Record<string, unknown>;

export type Examples = {
  levels: Record<number, Vars[]>;
  extra?: {
    level: number;
    vars: Vars;
    prompt: string;
    choices: string[];
    correct: string;
  }[];
};

export function splitChoices(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (depth === 0 && text.startsWith(", ", i)) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

export function loadExamples(stage: number) {
  const file = new URL(
    `../fixtures/${String(stage).padStart(2, "0")}.txt`,
    import.meta.url,
  );
  const examples: Example[] = [];
  let level = 0;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const heading = /^## L(\d+)$/.exec(line);
    if (heading) {
      level = Number(heading[1]);
      continue;
    }
    const match =
      /^([1-3])\. Q: (.*?) \| Choices: (.*?) \| Correct: (.*?) \| Why: (.*)$/.exec(
        line,
      );
    if (match)
      examples.push({
        level,
        index: Number(match[1]),
        prompt: match[2],
        choices: splitChoices(match[3]),
        correct: match[4],
      });
  }
  return examples;
}

export const pad = (n: number) => String(n).padStart(2, "0");

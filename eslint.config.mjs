import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["node_modules/", "dist/", "artifacts/", "music/dist/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  { files: ["src/**/*.ts"], languageOptions: { globals: globals.browser } },
  {
    files: [
      "*.mjs",
      "*.ts",
      "scripts/**/*.mjs",
      "music/*.mjs",
      "tests/**/*.ts",
    ],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  { rules: { "no-empty": ["error", { allowEmptyCatch: true }] } },
);

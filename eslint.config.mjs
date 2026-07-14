// eslint.config.mjs
import css from "@eslint/css";
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import jsoncParser from "jsonc-eslint-parser";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Run validate-manifest on manifest.json using jsonc-eslint-parser (produces TSESTree-compatible AST)
  {
    files: ["manifest.json"],
    plugins: { obsidianmd },
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      "no-irregular-whitespace": "off",
      "obsidianmd/validate-manifest": "warn",
    },
  },
  // Disable JS/TS-only rules that bleed into CSS
  {
    files: ["**/*.css"],
    rules: {
      "no-irregular-whitespace": "off",
    },
  },
  {
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css },
    rules: {
      ...css.configs.recommended.rules,
      "css/no-invalid-properties": "off",
    },
  },
]);

import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * API: root flat config + type-aware parser (replaces `apps/api/.eslintrc.cjs` + `@energivia/config/eslint/nest`).
 * Repo-wide `pnpm run format:check` is available locally; CI stays lint + builds until formatting is normalized.
 */
const apiTypeAware = {
  // Only Nest `src` is in `apps/api/tsconfig.json`; prisma scripts live outside `include`.
  files: ["apps/api/src/**/*.ts"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      project: "./apps/api/tsconfig.json",
      tsconfigRootDir: repoRoot,
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
  },
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
  },
};

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**", "**/.turbo/**"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  apiTypeAware,
  eslintConfigPrettier,
];

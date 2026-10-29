// Evermora shared ESLint base config (flat).
// Non-type-aware by design in Phase 0 — fast, and sufficient for the foundation.
// Type-aware rules can be layered on per-package later where the value is clear.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "**/next-env.d.ts",
      // Serwist-generated service worker bundle (built from apps/*/sw.ts)
      "**/public/sw.js",
      "**/public/sw.js.map",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "**/*.config.{ts,mts,js,mjs,cjs}", "**/vitest.setup.ts"],
    rules: {
      "no-console": "off",
    },
  },
  eslintConfigPrettier,
];

export default baseConfig;

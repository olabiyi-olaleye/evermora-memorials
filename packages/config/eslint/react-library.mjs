// Evermora shared ESLint config for framework-agnostic React libraries (flat).
import globals from "globals";
import { baseConfig } from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
export const reactLibraryConfig = [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];

export default reactLibraryConfig;

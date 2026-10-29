// Evermora shared ESLint config for Node-targeted libraries (flat).
import globals from "globals";
import { baseConfig } from "./base.mjs";

/** @type {import("eslint").Linter.Config[]} */
export const nodeLibraryConfig = [
  ...baseConfig,
  {
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];

export default nodeLibraryConfig;

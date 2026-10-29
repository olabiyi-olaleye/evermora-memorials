import nodeLibrary from "@evermora/config/eslint/node-library";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nodeLibrary,
  {
    // Local maintenance scripts may log progress to the console.
    files: ["scripts/**/*.mjs"],
    rules: { "no-console": "off" },
  },
];

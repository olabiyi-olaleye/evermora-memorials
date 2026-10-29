import base from "@evermora/config/eslint/base";

/**
 * The domain layer is framework-independent. These bans are a guardrail:
 * a React or Next.js import here is an architecture violation, not a nit.
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...base,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "@evermora/domain must stay framework-independent." },
            { name: "react-dom", message: "@evermora/domain must stay framework-independent." },
            { name: "next", message: "@evermora/domain must stay framework-independent." },
          ],
          patterns: [
            {
              group: ["next/*", "react/*", "react-dom/*"],
              message: "@evermora/domain must stay framework-independent.",
            },
          ],
        },
      ],
    },
  },
];

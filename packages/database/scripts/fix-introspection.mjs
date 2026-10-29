// Post-process the drizzle-kit `pull` output.
//
// drizzle-kit 0.31 cannot parse the Postgres `citext` type and emits an
// undefined `unknown("col")` helper. We map it to a small `customType` so the
// introspected schema type-checks. Run automatically after `db:pull`.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "drizzle",
  "schema.ts",
);
let src = readFileSync(schemaPath, "utf8");

if (src.includes("failed to parse database type 'citext'") || /\bunknown\(/.test(src)) {
  src = src.replace(/^\s*\/\/ TODO: failed to parse database type 'citext'\n/gm, "");
  src = src.replace(/\bunknown\("/g, 'citext("');

  const helper = [
    'import { customType } from "drizzle-orm/pg-core"',
    "",
    "/** Postgres `citext` (case-insensitive text); text-like on the TS side. */",
    'const citext = customType<{ data: string }>({ dataType: () => "citext" })',
    "",
  ].join("\n");

  // Insert after the final top-of-file import line.
  const lines = src.split("\n");
  let lastImport = 0;
  lines.forEach((l, i) => {
    if (l.startsWith("import ")) lastImport = i;
  });
  lines.splice(lastImport + 1, 0, "", helper);
  src = lines.join("\n");

  writeFileSync(schemaPath, src, "utf8");
  console.log("fix-introspection: mapped citext columns");
} else {
  console.log("fix-introspection: nothing to do");
}

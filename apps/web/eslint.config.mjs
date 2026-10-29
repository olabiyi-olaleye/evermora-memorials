import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@evermora/config/eslint/next";

// sw.ts runs in a WebWorker global scope (self, ServiceWorkerGlobalScope,
// __SW_MANIFEST) that the browser/Node lint globals don't model; it also
// carries its own `@ts-nocheck` for the same reason (see the file).
export default defineConfig([...nextConfig, globalIgnores(["sw.ts"])]);

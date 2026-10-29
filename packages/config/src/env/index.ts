import { z, type ZodError, type ZodRawShape, type ZodObject } from "zod";

/**
 * Evermora environment-validation foundation.
 *
 * Goals:
 *   - One place to declare which variables an app needs and their shape.
 *   - Fail fast, with a readable message, when something is missing or invalid.
 *   - A hard boundary between client-safe and server-only variables: any key
 *     that is not `NEXT_PUBLIC_`-prefixed is treated as server-only and is not
 *     readable from browser code.
 *
 * This module is intentionally tiny and dependency-light (Zod only). Each app
 * composes its own schema in `src/env.ts`.
 */

export type EnvSource = Record<string, string | undefined>;

const DEFAULT_CLIENT_PREFIX = "NEXT_PUBLIC_";

export interface CreateEnvOptions<TServer extends ZodRawShape, TClient extends ZodRawShape> {
  /** Server-only variables. Keys must NOT use the client prefix. */
  server: TServer;
  /** Client-safe variables. Keys MUST use the client prefix. */
  client: TClient;
  /** The raw source of values, usually `process.env`. */
  runtimeEnv: EnvSource;
  /** Prefix that marks a variable as safe to expose to the browser. */
  clientPrefix?: string;
  /** Escape hatch for tooling (e.g. lint/docs builds). Avoid in real runtimes. */
  skipValidation?: boolean;
  /** Treat empty strings as "not set". Defaults to true. */
  emptyStringAsUndefined?: boolean;
}

export type InferEnv<TServer extends ZodRawShape, TClient extends ZodRawShape> = z.infer<
  ZodObject<TServer>
> &
  z.infer<ZodObject<TClient>>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment variables:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "EnvValidationError";
  }
}

function flattenIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
}

const isBrowser = (): boolean => typeof (globalThis as { window?: unknown }).window !== "undefined";

/**
 * Build a validated, typed environment object.
 *
 * @throws {EnvValidationError} when validation fails
 * @throws {Error} when a client key is missing the required prefix
 */
export function createEnv<TServer extends ZodRawShape, TClient extends ZodRawShape>(
  options: CreateEnvOptions<TServer, TClient>,
): Readonly<InferEnv<TServer, TClient>> {
  const {
    server,
    client,
    runtimeEnv,
    clientPrefix = DEFAULT_CLIENT_PREFIX,
    skipValidation = false,
    emptyStringAsUndefined = true,
  } = options;

  for (const key of Object.keys(client)) {
    if (!key.startsWith(clientPrefix)) {
      throw new Error(
        `Client env key "${key}" must start with "${clientPrefix}". Move it to \`server\` if it is a secret.`,
      );
    }
  }
  for (const key of Object.keys(server)) {
    if (key.startsWith(clientPrefix)) {
      throw new Error(
        `Server env key "${key}" must not start with "${clientPrefix}". Move it to \`client\` if it is safe to expose.`,
      );
    }
  }

  const normalizedSource: EnvSource = { ...runtimeEnv };
  if (emptyStringAsUndefined) {
    for (const [key, value] of Object.entries(normalizedSource)) {
      if (value === "") normalizedSource[key] = undefined;
    }
  }

  const serverSchema = z.object(server);
  const clientSchema = z.object(client);

  if (skipValidation) {
    return Object.freeze({
      ...(runtimeEnv as unknown as z.infer<typeof serverSchema>),
      ...(runtimeEnv as unknown as z.infer<typeof clientSchema>),
    }) as Readonly<InferEnv<TServer, TClient>>;
  }

  const runningInBrowser = isBrowser();

  const clientResult = clientSchema.safeParse(normalizedSource);
  const serverResult = runningInBrowser ? null : serverSchema.safeParse(normalizedSource);

  const issues: string[] = [];
  if (!clientResult.success) issues.push(...flattenIssues(clientResult.error));
  if (serverResult && !serverResult.success) {
    issues.push(...flattenIssues(serverResult.error));
  }
  if (issues.length > 0) throw new EnvValidationError(issues);

  const clientValues = clientResult.success ? clientResult.data : {};
  const serverValues = serverResult?.success ? serverResult.data : {};
  const serverKeys = new Set(Object.keys(server));

  const merged = { ...serverValues, ...clientValues } as InferEnv<TServer, TClient>;

  return Object.freeze(
    new Proxy(merged, {
      get(target, prop) {
        if (
          typeof prop === "string" &&
          runningInBrowser &&
          serverKeys.has(prop) &&
          !prop.startsWith(clientPrefix)
        ) {
          throw new Error(`Attempted to read server-only env var "${prop}" from browser code.`);
        }
        return Reflect.get(target, prop);
      },
    }),
  ) as Readonly<InferEnv<TServer, TClient>>;
}

/** Common reusable field schemas for Evermora apps. */
export const envField = {
  url: () => z.string().url(),
  nonEmpty: () => z.string().min(1),
  appEnv: () => z.enum(["development", "staging", "production"]).default("development"),
} as const;

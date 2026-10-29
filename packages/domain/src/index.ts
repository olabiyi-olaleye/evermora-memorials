/**
 * @evermora/domain — framework-independent Evermora business layer.
 *
 * Implemented: the core-memorial lifecycle — `createMemorial`,
 * `publishMemorial`, `changeMemorialSlug` (Phase 5A) — and the memorial-editing
 * operations `updateMemorialProfile`, `updateMemorialPrivacy`,
 * `updateMemorialFeatures` (Phase 5C), plus the shared patterns (ports, unit of
 * work, permissions, validation, errors, events, clock, id generator). The
 * remaining documented operations are SPECIFIED-only (`docs/domain/`).
 *
 * This package MUST NOT import React, `next/*`, or browser-only APIs.
 */

export * from "./errors";
export * from "./context";
export * from "./events";
export * from "./clock";
export * from "./id-generator";
export * from "./authorization/permissions";
export * from "./validation/slug";
export * from "./ports/index";
export * from "./operations/index";

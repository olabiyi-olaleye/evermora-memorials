/**
 * Shared between the client upload flow and the server-side finalize action —
 * plain constants only (no "use server"/"use client"), safe to import from
 * either side.
 */
export const PHOTO_BUCKET = "memorial-private";
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

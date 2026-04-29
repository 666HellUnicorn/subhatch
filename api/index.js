/**
 * Vercel serverless function entry point.
 * Re-exports the Vercel Edge adapter so Vercel can discover it at /api/[...path].
 */
export { default } from "./vercel.js";

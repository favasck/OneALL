// Thin Vercel serverless function entry, deliberately plain JS with zero
// decorators. Vercel's zero-config /api/*.ts handling uses esbuild, which
// does not implement emitDecoratorMetadata -- fine here because this file
// does none of the NestJS work itself. It just re-exports the already-
// compiled (real tsc, decorator metadata intact) handler built by the
// Vercel build command from apps/api/src/serverless.ts.
//
// See apps/api/src/serverless.ts for why this split exists.
module.exports = require("../apps/api/dist/serverless.js").default;

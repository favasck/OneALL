import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
import { AppModule } from "./app.module";

// Serverless entry point for Vercel. Kept separate from main.ts (which
// still does app.listen() for local dev via `npm run dev:api`) because a
// serverless function must hand a request/response pair to Express
// directly rather than binding a port.
//
// This file is compiled by `tsc` (apps/api's normal build step, run in the
// Vercel build command), NOT by Vercel's zero-config esbuild bundler for
// /api/*.ts files. That distinction matters: esbuild does not implement
// TypeScript's `emitDecoratorMetadata`, which NestJS's constructor
// injection depends on to resolve dependencies by type. Compiling with
// real tsc first, then pointing the thin /api/index.js wrapper at the
// compiled output, keeps Nest's DI working. Do not "simplify" this by
// having Vercel build this file directly.
//
// Global prefix: root vercel.json rewrites "/api/(.*)" to "/api/index",
// but Vercel preserves the ORIGINAL request path (e.g. "/api/auth/login")
// as req.url when it reaches this function — the rewrite target is just
// which function handles it, not a path transform. Controllers below are
// declared without an "/api" prefix (so main.ts / local dev, which the
// browser calls directly at "http://localhost:3000/auth/login" with no
// "/api" segment, keeps working unchanged). So this serverless entry point
// alone must tell Nest's router to expect the leading "/api" segment, or
// every route 404s in production while looking completely fine locally.
const server = express();
let bootstrapped: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.setGlobalPrefix("api");
  app.enableCors();
  await app.init();
}

export default async function handler(req: express.Request, res: express.Response) {
  if (!bootstrapped) bootstrapped = bootstrap();
  await bootstrapped;
  server(req, res);
}

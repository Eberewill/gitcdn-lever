import "dotenv/config";
import { createApiApp } from "../src/backend/api-app.js";

const app = createApiApp();

function splitUrl(url: string | undefined): { path: string; query: string } {
  const raw = url ?? "/";
  const [rawPath, rawQuery] = raw.split("?");
  const path = rawPath || "/";
  const query = rawQuery ? `?${rawQuery}` : "";

  return { path, query };
}

export function forwardToExact(exactPath: string) {
  return function handler(req: any, res: any) {
    const { query } = splitUrl(typeof req.url === "string" ? req.url : "/");
    req.url = `${exactPath}${query}`;
    return app(req, res);
  };
}

export function forwardWithBase(basePath: string) {
  return function handler(req: any, res: any) {
    const { path, query } = splitUrl(typeof req.url === "string" ? req.url : "/");

    const normalizedPath =
      path === "/api" || path.startsWith("/api/")
        ? path
        : path === "/"
          ? basePath
          : `${basePath}${path.startsWith("/") ? path : `/${path}`}`;

    req.url = `${normalizedPath}${query}`;
    return app(req, res);
  };
}

export const defaultApiHandler = forwardWithBase("/api");

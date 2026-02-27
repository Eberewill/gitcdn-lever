import "dotenv/config";
import { createApiApp } from "../src/backend/api-app.js";

const app = createApiApp();

function normalizeApiUrl(inputUrl: string): string {
  const [rawPath, rawQuery] = inputUrl.split("?");
  const path = rawPath || "/";

  const normalizedPath =
    path === "/api" || path.startsWith("/api/")
      ? path
      : path === "/"
        ? "/api"
        : `/api${path.startsWith("/") ? path : `/${path}`}`;

  return rawQuery ? `${normalizedPath}?${rawQuery}` : normalizedPath;
}

export default function handler(req: any, res: any) {
  if (typeof req.url === "string") {
    req.url = normalizeApiUrl(req.url);
  }

  return app(req, res);
}

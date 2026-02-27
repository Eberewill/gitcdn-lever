import crypto from "crypto";
import express, { type Request, type Response } from "express";
import axios from "axios";
import { Octokit } from "@octokit/rest";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PRODUCTION = NODE_ENV === "production";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";
const APP_URL = process.env.APP_URL?.trim() ?? "";
const SESSION_SECRET = process.env.SESSION_SECRET ?? "";
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY ?? "";

const SESSION_COOKIE_NAME = "gitcdn_session";
const OAUTH_STATE_COOKIE_NAME = "gitcdn_oauth_state";

if (IS_PRODUCTION) {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required in production.");
  }

  if (!SESSION_SECRET && !TOKEN_ENCRYPTION_KEY) {
    throw new Error("SESSION_SECRET or TOKEN_ENCRYPTION_KEY is required in production.");
  }
}

if (!SESSION_SECRET && !TOKEN_ENCRYPTION_KEY) {
  console.warn("SESSION_SECRET/TOKEN_ENCRYPTION_KEY not set. Using local development fallback key.");
}
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.warn("GitHub OAuth env vars are missing. Auth routes will return configuration errors.");
}

const effectiveCryptoSeed = TOKEN_ENCRYPTION_KEY || SESSION_SECRET || "local-dev-only-change-me";
const cryptoKey = crypto.createHash("sha256").update(effectiveCryptoSeed).digest();

type UserSession = {
  github_token: string;
  username: string;
  avatar_url: string;
  selected_repo: string | null;
  selected_branch: string | null;
  issued_at: number;
  expires_at: number;
};

type OAuthState = {
  state: string;
  expires_at: number;
};

type RepoSelection = {
  owner: string;
  repo: string;
  branch: string;
};

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value.split(",")[0]?.trim();
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getBaseUrl(req: Request): string {
  if (APP_URL) {
    return trimTrailingSlash(APP_URL);
  }

  const proto = firstHeaderValue(req.headers["x-forwarded-proto"]) ?? "http";
  const host = firstHeaderValue(req.headers["x-forwarded-host"]) ?? req.headers.host;

  if (!host) {
    throw new Error("Could not resolve request host.");
  }

  return `${proto}://${host}`;
}

function getOrigin(req: Request): string {
  return new URL(getBaseUrl(req)).origin;
}

function encryptPayload(payload: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", cryptoKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptPayload<T>(value: string): T | null {
  try {
    const [ivB64, tagB64, dataB64] = value.split(".");
    if (!ivB64 || !tagB64 || !dataB64) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      cryptoKey,
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) {
    return {};
  }

  const cookieEntries = rawCookie.split(";");
  const parsed: Record<string, string> = {};

  for (const entry of cookieEntries) {
    const [rawName, ...rawValueParts] = entry.trim().split("=");
    if (!rawName || rawValueParts.length === 0) {
      continue;
    }

    const rawValue = rawValueParts.join("=");
    try {
      parsed[rawName] = decodeURIComponent(rawValue);
    } catch {
      parsed[rawName] = rawValue;
    }
  }

  return parsed;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function clearCookie(res: Response, name: string) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
  });
}

function readEncryptedCookie<T>(req: Request, name: string): T | null {
  const cookies = parseCookies(req);
  const value = cookies[name];
  if (!value) {
    return null;
  }

  return decryptPayload<T>(value);
}

function writeEncryptedCookie(res: Response, name: string, payload: unknown, maxAge: number) {
  const encrypted = encryptPayload(payload);
  res.cookie(name, encrypted, cookieOptions(maxAge));
}

function parseRepoFullName(value: unknown): { owner: string; repo: string } | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) {
    return null;
  }

  const [owner, repo] = trimmed.split("/");
  return { owner, repo };
}

function parseBranchName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^(?!\.)(?!.*\.\.)[A-Za-z0-9._/-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function sanitizeAssetName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    return null;
  }

  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return null;
  }

  return trimmed;
}

function extractBase64Payload(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const commaIndex = value.indexOf(",");
  if (commaIndex <= 0 || commaIndex === value.length - 1) {
    return null;
  }

  return value.slice(commaIndex + 1);
}

function getRepoSelection(session: UserSession): RepoSelection | null {
  if (!session.selected_repo) {
    return null;
  }

  const parsed = parseRepoFullName(session.selected_repo);
  if (!parsed) {
    return null;
  }

  const branch = parseBranchName(session.selected_branch ?? "") ?? "main";
  return { ...parsed, branch };
}

function toCdnUrl(selection: RepoSelection, filePath: string): string {
  return `https://cdn.jsdelivr.net/gh/${selection.owner}/${selection.repo}@${selection.branch}/${filePath}`;
}

function readSession(req: Request): UserSession | null {
  const payload = readEncryptedCookie<UserSession>(req, SESSION_COOKIE_NAME);
  if (!payload) {
    return null;
  }

  if (Date.now() > payload.expires_at) {
    return null;
  }

  if (typeof payload.github_token !== "string" || !payload.github_token) {
    return null;
  }

  return payload;
}

function writeSession(
  res: Response,
  partial: Omit<UserSession, "issued_at" | "expires_at">,
) {
  const now = Date.now();
  const payload: UserSession = {
    ...partial,
    issued_at: now,
    expires_at: now + SESSION_TTL_MS,
  };

  writeEncryptedCookie(res, SESSION_COOKIE_NAME, payload, SESSION_TTL_MS);
}

function clearAuthCookies(res: Response) {
  clearCookie(res, SESSION_COOKIE_NAME);
  clearCookie(res, OAUTH_STATE_COOKIE_NAME);
}

function requireSession(req: Request, res: Response): UserSession | null {
  const session = readSession(req);
  if (!session) {
    clearCookie(res, SESSION_COOKIE_NAME);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  return session;
}

export function createApiApp() {
  const app = express();

  if (IS_PRODUCTION) {
    app.set("trust proxy", 1);
  }

  app.use(express.json({ limit: "15mb" }));

  app.get("/api/auth/url", (req, res) => {
    if (!GITHUB_CLIENT_ID) {
      return res.status(500).json({ error: "GitHub OAuth is not configured" });
    }

    const state = crypto.randomBytes(24).toString("hex");
    writeEncryptedCookie(
      res,
      OAUTH_STATE_COOKIE_NAME,
      {
        state,
        expires_at: Date.now() + OAUTH_STATE_TTL_MS,
      } as OAuthState,
      OAUTH_STATE_TTL_MS,
    );

    const redirectUri = `${getBaseUrl(req)}/api/auth/callback`;
    const query = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "repo,user",
      state,
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${query.toString()}` });
  });

  app.get("/api/auth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";

    const oauthState = readEncryptedCookie<OAuthState>(req, OAUTH_STATE_COOKIE_NAME);
    clearCookie(res, OAUTH_STATE_COOKIE_NAME);

    if (!code || !state) {
      return res.status(400).send("Missing OAuth code or state.");
    }

    if (!oauthState || oauthState.state !== state || Date.now() > oauthState.expires_at) {
      return res.status(400).send("Invalid or expired OAuth state. Please try again.");
    }

    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return res.status(500).send("GitHub OAuth is not configured.");
    }

    try {
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${getBaseUrl(req)}/api/auth/callback`,
        },
        { headers: { Accept: "application/json" } },
      );

      const accessToken = tokenResponse.data?.access_token;
      if (typeof accessToken !== "string" || !accessToken) {
        throw new Error("No access token received");
      }

      const octokit = new Octokit({ auth: accessToken });
      const { data: githubUser } = await octokit.users.getAuthenticated();

      const existingSession = readSession(req);

      writeSession(res, {
        github_token: accessToken,
        username: githubUser.login,
        avatar_url: githubUser.avatar_url,
        selected_repo: existingSession?.selected_repo ?? null,
        selected_branch: existingSession?.selected_branch ?? null,
      });

      res.type("html").send(`
        <!doctype html>
        <html>
          <body>
            <script>
              const appOrigin = ${JSON.stringify(getOrigin(req))};
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS" }, appOrigin);
                window.close();
              } else {
                window.location.href = "/";
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/me", (req, res) => {
    const session = readSession(req);
    if (!session) {
      clearCookie(res, SESSION_COOKIE_NAME);
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.json({
      username: session.username,
      avatar_url: session.avatar_url,
      selected_repo: session.selected_repo,
      selected_branch: session.selected_branch,
    });
  });

  app.post("/api/logout", (_req, res) => {
    clearAuthCookies(res);
    res.json({ success: true });
  });

  app.get("/api/repos", async (req, res) => {
    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
      });

      res.json(
        repos.map((repo) => ({
          full_name: repo.full_name,
          name: repo.name,
          private: repo.private,
          default_branch: repo.default_branch,
        })),
      );
    } catch {
      res.status(500).json({ error: "Failed to fetch repos" });
    }
  });

  app.post("/api/select-repo", (req, res) => {
    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const parsedRepo = parseRepoFullName(req.body?.repo);
    if (!parsedRepo) {
      return res.status(400).json({ error: "Repository must be in owner/repo format." });
    }

    const branchInput = req.body?.branch;
    const branch = branchInput == null ? "main" : parseBranchName(branchInput);
    if (!branch) {
      return res.status(400).json({ error: "Invalid branch name." });
    }

    writeSession(res, {
      ...session,
      selected_repo: `${parsedRepo.owner}/${parsedRepo.repo}`,
      selected_branch: branch,
    });

    res.json({ success: true });
  });

  app.get("/api/assets", async (req, res) => {
    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.json([]);
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      const { data: content } = await octokit.repos.getContent({
        owner: selection.owner,
        repo: selection.repo,
        path: "assets",
        ref: selection.branch,
      });

      if (!Array.isArray(content)) {
        return res.json([]);
      }

      res.json(
        content
          .filter((file) => file.type === "file")
          .map((file) => ({
            name: file.name,
            path: file.path,
            sha: file.sha,
            size: file.size,
            download_url: file.download_url,
            cdn_url: toCdnUrl(selection, file.path),
          })),
      );
    } catch (error: any) {
      if (error.status === 404) {
        return res.json([]);
      }

      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.post("/api/upload", async (req, res) => {
    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before uploading." });
    }

    const assetName = sanitizeAssetName(req.body?.name);
    if (!assetName) {
      return res.status(400).json({ error: "Invalid asset name." });
    }

    const base64Content = extractBase64Payload(req.body?.content);
    if (!base64Content) {
      return res.status(400).json({ error: "Invalid upload payload." });
    }

    const commitMessage =
      typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim()
        : `Upload ${assetName} via GitCDN`;

    const octokit = new Octokit({ auth: session.github_token });
    const assetPath = `assets/${assetName}`;

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: selection.owner,
        repo: selection.repo,
        path: assetPath,
        branch: selection.branch,
        message: commitMessage,
        content: base64Content,
      });

      res.json({
        success: true,
        cdn_url: toCdnUrl(selection, assetPath),
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.delete("/api/assets/:name", async (req, res) => {
    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before deleting assets." });
    }

    const assetName = sanitizeAssetName(req.params.name);
    if (!assetName) {
      return res.status(400).json({ error: "Invalid asset name." });
    }

    const sha = typeof req.query.sha === "string" ? req.query.sha.trim() : "";
    if (!sha) {
      return res.status(400).json({ error: "sha query param is required." });
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      await octokit.repos.deleteFile({
        owner: selection.owner,
        repo: selection.repo,
        path: `assets/${assetName}`,
        branch: selection.branch,
        message: `Delete ${assetName} via GitCDN`,
        sha,
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Delete failed" });
    }
  });

  return app;
}

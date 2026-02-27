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
const HAS_GITHUB_CLIENT_ID = Boolean(GITHUB_CLIENT_ID);
const HAS_GITHUB_CLIENT_SECRET = Boolean(GITHUB_CLIENT_SECRET);
const HAS_GITHUB_OAUTH_CONFIG = HAS_GITHUB_CLIENT_ID && HAS_GITHUB_CLIENT_SECRET;
const HAS_CRYPTO_CONFIG = Boolean(SESSION_SECRET || TOKEN_ENCRYPTION_KEY);

const SESSION_COOKIE_NAME = "gitcdn_session";
const OAUTH_STATE_COOKIE_NAME = "gitcdn_oauth_state";
const ASSETS_ROOT_PATH = "assets";

if (!HAS_CRYPTO_CONFIG) {
  const level = IS_PRODUCTION ? "ERROR" : "WARN";
  console.warn(
    `[${level}] SESSION_SECRET/TOKEN_ENCRYPTION_KEY not set. Using local fallback key; auth is not safe for production.`,
  );
}
if (!HAS_GITHUB_OAUTH_CONFIG) {
  const level = IS_PRODUCTION ? "ERROR" : "WARN";
  console.warn(`[${level}] GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET missing. OAuth routes will fail.`);
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

type AssetBlobEntry = {
  repoPath: string;
  relativePath: string;
  sha: string;
  size: number;
};

type AssetFile = {
  name: string;
  path: string;
  folder: string;
  sha: string;
  size: number;
  download_url: string;
};

type AssetFolder = {
  name: string;
  path: string;
  parent: string | null;
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

function ensureCryptoConfigured(res: Response): boolean {
  if (HAS_CRYPTO_CONFIG) {
    return true;
  }

  res.status(500).json({ error: "Server session encryption is not configured." });
  return false;
}

function ensureGitHubClientConfigured(res: Response): boolean {
  if (HAS_GITHUB_CLIENT_ID) {
    return true;
  }

  res.status(500).json({ error: "GitHub OAuth is not configured." });
  return false;
}

function ensureGitHubOAuthConfigured(res: Response): boolean {
  if (HAS_GITHUB_OAUTH_CONFIG) {
    return true;
  }

  res.status(500).json({ error: "GitHub OAuth is not configured." });
  return false;
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

function sanitizePathSegment(value: string): string | null {
  if (!value || value === "." || value === "..") {
    return null;
  }

  if (!/^[A-Za-z0-9._ -]{1,128}$/.test(value)) {
    return null;
  }

  return value;
}

function normalizeFolderPath(value: unknown): string | null {
  if (value == null) {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  let normalized = trimmed.replaceAll("\\", "/");
  if (normalized === ASSETS_ROOT_PATH) {
    return "";
  }

  if (normalized.startsWith(`${ASSETS_ROOT_PATH}/`)) {
    normalized = normalized.slice(ASSETS_ROOT_PATH.length + 1);
  }

  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return "";
  }

  const validatedSegments: string[] = [];
  for (const segment of segments) {
    const safeSegment = sanitizePathSegment(segment);
    if (!safeSegment) {
      return null;
    }

    validatedSegments.push(safeSegment);
  }

  return validatedSegments.join("/");
}

function normalizeAssetRelativePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  let normalized = value.trim().replaceAll("\\", "/");
  if (!normalized) {
    return null;
  }

  if (normalized === ASSETS_ROOT_PATH) {
    return null;
  }

  if (normalized.startsWith(`${ASSETS_ROOT_PATH}/`)) {
    normalized = normalized.slice(ASSETS_ROOT_PATH.length + 1);
  }

  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized) {
    return null;
  }

  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const validatedSegments: string[] = [];
  for (const segment of segments) {
    const safeSegment = sanitizePathSegment(segment);
    if (!safeSegment) {
      return null;
    }

    validatedSegments.push(safeSegment);
  }

  return validatedSegments.join("/");
}

function parentFolderPath(path: string): string {
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex < 0) {
    return "";
  }

  return path.slice(0, lastSlashIndex);
}

function fileNameFromPath(path: string): string {
  const lastSlashIndex = path.lastIndexOf("/");
  if (lastSlashIndex < 0) {
    return path;
  }

  return path.slice(lastSlashIndex + 1);
}

function joinAssetRepoPath(relativePath: string): string {
  return relativePath ? `${ASSETS_ROOT_PATH}/${relativePath}` : ASSETS_ROOT_PATH;
}

function toRawGitHubUrl(selection: RepoSelection, filePath: string): string {
  const encodedPath = filePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `https://raw.githubusercontent.com/${selection.owner}/${selection.repo}/${selection.branch}/${encodedPath}`;
}

function addFolderWithAncestors(target: Set<string>, folderPath: string) {
  if (!folderPath) {
    return;
  }

  let current = folderPath;
  while (current) {
    target.add(current);
    current = parentFolderPath(current);
  }
}

function extractExtensionFromName(name: string | null): string | null {
  if (!name) {
    return null;
  }

  const lastDotIndex = name.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === name.length - 1) {
    return null;
  }

  const extension = name.slice(lastDotIndex + 1).toLowerCase();
  if (!/^[a-z0-9]{1,10}$/.test(extension)) {
    return null;
  }

  return extension;
}

function extractMimeType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^data:([^;,]+)[;,]/i);
  if (!match) {
    return null;
  }

  return match[1].toLowerCase();
}

function extensionFromMimeType(mimeType: string | null): string | null {
  if (!mimeType) {
    return null;
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/json": "json",
  };

  return mimeToExt[mimeType] ?? null;
}

function generateAnonymousAssetName(
  originalName: string | null,
  encodedContent: unknown,
): string {
  const extension =
    extractExtensionFromName(originalName) ??
    extensionFromMimeType(extractMimeType(encodedContent));
  const baseName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

  return extension ? `${baseName}.${extension}` : baseName;
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

async function getAssetBlobEntries(
  octokit: Octokit,
  selection: RepoSelection,
): Promise<AssetBlobEntry[]> {
  const { data: branchData } = await octokit.repos.getBranch({
    owner: selection.owner,
    repo: selection.repo,
    branch: selection.branch,
  });

  const treeSha = branchData.commit.commit.tree.sha;
  const { data: treeData } = await octokit.git.getTree({
    owner: selection.owner,
    repo: selection.repo,
    tree_sha: treeSha,
    recursive: "1",
  });

  const entries: AssetBlobEntry[] = [];

  for (const treeNode of treeData.tree) {
    if (treeNode.type !== "blob") {
      continue;
    }

    if (!treeNode.path || !treeNode.sha) {
      continue;
    }

    if (!treeNode.path.startsWith(`${ASSETS_ROOT_PATH}/`)) {
      continue;
    }

    const relativePath = normalizeAssetRelativePath(treeNode.path);
    if (!relativePath) {
      continue;
    }

    entries.push({
      repoPath: joinAssetRepoPath(relativePath),
      relativePath,
      sha: treeNode.sha,
      size: treeNode.size ?? 0,
    });
  }

  return entries;
}

function buildAssetInventory(selection: RepoSelection, blobEntries: AssetBlobEntry[]) {
  const files: AssetFile[] = [];
  const folderSet = new Set<string>();

  for (const entry of blobEntries) {
    const fileName = fileNameFromPath(entry.relativePath);
    const folderPath = parentFolderPath(entry.relativePath);
    addFolderWithAncestors(folderSet, folderPath);

    if (fileName === ".gitkeep") {
      continue;
    }

    files.push({
      name: fileName,
      path: entry.relativePath,
      folder: folderPath,
      sha: entry.sha,
      size: entry.size,
      download_url: toRawGitHubUrl(selection, entry.repoPath),
    });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const folders: AssetFolder[] = Array.from(folderSet)
    .sort((a, b) => a.localeCompare(b))
    .map((folderPath) => ({
      path: folderPath,
      name: fileNameFromPath(folderPath),
      parent: parentFolderPath(folderPath) || null,
    }));

  return { files, folders };
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

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      env: NODE_ENV,
      configured: {
        app_url: Boolean(APP_URL),
        github_client_id: HAS_GITHUB_CLIENT_ID,
        github_client_secret: HAS_GITHUB_CLIENT_SECRET,
        session_secret: Boolean(SESSION_SECRET),
        token_encryption_key: Boolean(TOKEN_ENCRYPTION_KEY),
      },
    });
  });

  app.get("/api/auth/url", (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    if (!ensureGitHubClientConfigured(res)) {
      return;
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
    if (!ensureCryptoConfigured(res) || !ensureGitHubOAuthConfigured(res)) {
      return;
    }

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
    if (!ensureCryptoConfigured(res)) {
      return;
    }

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
    if (!ensureCryptoConfigured(res)) {
      return;
    }

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
    if (!ensureCryptoConfigured(res)) {
      return;
    }

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
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.json({
        current_folder: "",
        folders: [],
        files: [],
        all_folders: [],
      });
    }

    const requestedFolder = normalizeFolderPath(req.query.folder);
    if (requestedFolder == null) {
      return res.status(400).json({ error: "Invalid folder path." });
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      const blobEntries = await getAssetBlobEntries(octokit, selection);
      const inventory = buildAssetInventory(selection, blobEntries);

      const childFolders = inventory.folders
        .filter((folder) => (folder.parent ?? "") === requestedFolder)
        .map((folder) => ({ name: folder.name, path: folder.path }));

      const folderFiles = inventory.files
        .filter((file) => file.folder === requestedFolder)
        .map((file) => ({
          ...file,
          cdn_url: toCdnUrl(selection, joinAssetRepoPath(file.path)),
        }));

      res.json({
        current_folder: requestedFolder,
        folders: childFolders,
        files: folderFiles,
        all_folders: inventory.folders.map((folder) => folder.path),
      });
    } catch (error: any) {
      if (error.status === 404) {
        return res.json({
          current_folder: requestedFolder,
          folders: [],
          files: [],
          all_folders: [],
        });
      }

      console.error("List assets error:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/folders", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.json({ folders: [] });
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      const blobEntries = await getAssetBlobEntries(octokit, selection);
      const inventory = buildAssetInventory(selection, blobEntries);

      res.json({
        folders: inventory.folders,
      });
    } catch (error: any) {
      if (error.status === 404) {
        return res.json({ folders: [] });
      }

      console.error("List folders error:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before creating folders." });
    }

    const folderPath = normalizeFolderPath(req.body?.path);
    if (folderPath == null || !folderPath) {
      return res.status(400).json({ error: "Folder path is required." });
    }

    const octokit = new Octokit({ auth: session.github_token });
    const folderRepoPath = joinAssetRepoPath(folderPath);
    const gitkeepPath = `${folderRepoPath}/.gitkeep`;

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: selection.owner,
        repo: selection.repo,
        path: gitkeepPath,
        branch: selection.branch,
        message: `Create folder ${folderPath} via GitCDN`,
        content: Buffer.from("gitcdn-folder\n").toString("base64"),
      });

      res.json({ success: true, path: folderPath });
    } catch (error) {
      console.error("Create folder error:", error);
      res.status(500).json({ error: "Failed to create folder." });
    }
  });

  app.delete("/api/folders", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before deleting folders." });
    }

    const folderPath = normalizeFolderPath(req.query.path);
    if (folderPath == null || !folderPath) {
      return res.status(400).json({ error: "Folder path query param is required." });
    }

    const octokit = new Octokit({ auth: session.github_token });

    try {
      const blobEntries = await getAssetBlobEntries(octokit, selection);
      const prefix = `${folderPath}/`;
      const entriesToDelete = blobEntries.filter((entry) => entry.relativePath.startsWith(prefix));

      if (entriesToDelete.length === 0) {
        return res.status(404).json({ error: "Folder not found or empty." });
      }

      for (const entry of entriesToDelete) {
        await octokit.repos.deleteFile({
          owner: selection.owner,
          repo: selection.repo,
          path: entry.repoPath,
          branch: selection.branch,
          message: `Delete ${folderPath} via GitCDN`,
          sha: entry.sha,
        });
      }

      res.json({ success: true, deleted: entriesToDelete.length });
    } catch (error) {
      console.error("Delete folder error:", error);
      res.status(500).json({ error: "Failed to delete folder." });
    }
  });

  app.post("/api/upload", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before uploading." });
    }

    const folderPath = normalizeFolderPath(req.body?.folder);
    if (folderPath == null) {
      return res.status(400).json({ error: "Invalid folder path." });
    }

    const originalName = sanitizeAssetName(req.body?.name);

    const base64Content = extractBase64Payload(req.body?.content);
    if (!base64Content) {
      return res.status(400).json({ error: "Invalid upload payload." });
    }

    const assetName = generateAnonymousAssetName(originalName, req.body?.content);

    const commitMessage =
      typeof req.body?.message === "string" && req.body.message.trim()
        ? req.body.message.trim()
        : `Upload ${assetName} via GitCDN`;

    const octokit = new Octokit({ auth: session.github_token });
    const relativeAssetPath = folderPath ? `${folderPath}/${assetName}` : assetName;
    const assetPath = joinAssetRepoPath(relativeAssetPath);

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
        name: assetName,
        path: relativeAssetPath,
        folder: folderPath,
        cdn_url: toCdnUrl(selection, assetPath),
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/assets/move", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before moving assets." });
    }

    const sourcePath = normalizeAssetRelativePath(req.body?.path);
    if (!sourcePath) {
      return res.status(400).json({ error: "Invalid source asset path." });
    }

    const destinationFolder = normalizeFolderPath(req.body?.destination_folder);
    if (destinationFolder == null) {
      return res.status(400).json({ error: "Invalid destination folder path." });
    }

    const fileName = fileNameFromPath(sourcePath);
    const targetPath = destinationFolder ? `${destinationFolder}/${fileName}` : fileName;
    if (targetPath === sourcePath) {
      return res.status(400).json({ error: "Source and destination are the same." });
    }

    const octokit = new Octokit({ auth: session.github_token });
    const sourceRepoPath = joinAssetRepoPath(sourcePath);
    const targetRepoPath = joinAssetRepoPath(targetPath);

    try {
      try {
        await octokit.repos.getContent({
          owner: selection.owner,
          repo: selection.repo,
          path: targetRepoPath,
          ref: selection.branch,
        });

        return res.status(409).json({ error: "A file already exists in the destination folder." });
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
      }

      const sourceResponse = await octokit.repos.getContent({
        owner: selection.owner,
        repo: selection.repo,
        path: sourceRepoPath,
        ref: selection.branch,
      });

      if (Array.isArray(sourceResponse.data) || sourceResponse.data.type !== "file") {
        return res.status(400).json({ error: "Source path must be a file." });
      }

      const sourceFile = sourceResponse.data;
      const content = sourceFile.content?.replace(/\n/g, "");
      if (!content || sourceFile.encoding !== "base64") {
        return res.status(500).json({ error: "Could not read source file content." });
      }

      await octokit.repos.createOrUpdateFileContents({
        owner: selection.owner,
        repo: selection.repo,
        path: targetRepoPath,
        branch: selection.branch,
        message: `Move ${sourcePath} to ${targetPath} via GitCDN`,
        content,
      });

      await octokit.repos.deleteFile({
        owner: selection.owner,
        repo: selection.repo,
        path: sourceRepoPath,
        branch: selection.branch,
        message: `Delete ${sourcePath} after move via GitCDN`,
        sha: sourceFile.sha,
      });

      res.json({
        success: true,
        path: targetPath,
        folder: destinationFolder,
        cdn_url: toCdnUrl(selection, targetRepoPath),
      });
    } catch (error) {
      console.error("Move asset error:", error);
      res.status(500).json({ error: "Failed to move asset." });
    }
  });

  app.delete("/api/assets", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

    const session = requireSession(req, res);
    if (!session) {
      return;
    }

    const selection = getRepoSelection(session);
    if (!selection) {
      return res.status(400).json({ error: "Select a repository before deleting assets." });
    }

    const assetPath = normalizeAssetRelativePath(req.query.path);
    if (!assetPath) {
      return res.status(400).json({ error: "path query param is required." });
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
        path: joinAssetRepoPath(assetPath),
        branch: selection.branch,
        message: `Delete ${assetPath} via GitCDN`,
        sha,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete asset error:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  app.delete("/api/assets/:name", async (req, res) => {
    if (!ensureCryptoConfigured(res)) {
      return;
    }

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
        path: joinAssetRepoPath(assetName),
        branch: selection.branch,
        message: `Delete ${assetName} via GitCDN`,
        sha,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Delete asset error:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  return app;
}

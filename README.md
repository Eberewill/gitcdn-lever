# GitCDN

GitCDN turns a GitHub repository into a lightweight public asset CDN.

Users authenticate with GitHub, select a repo, upload assets into `assets/`, and get copyable jsDelivr URLs immediately.

## Why This Project

- No external storage provider required
- Free-tier friendly deployment on Vercel
- Your files stay in your GitHub repository

## Current Architecture

- Frontend: React + Vite static build (`dist`)
- API: Express app running in Vercel Function (`api/[...route].ts`)
- Auth/session: GitHub OAuth + encrypted `httpOnly` cookie session
- Asset source: GitHub repository contents
- Public delivery: jsDelivr (`cdn.jsdelivr.net/gh/...`)

## Project Structure

- `src/` React app
- `src/backend/api-app.ts` Shared API app used by local dev and Vercel
- `api/[...route].ts` Vercel serverless entrypoint
- `server.ts` Local development server (API + Vite middleware)
- `vercel.json` Vercel build/output config
- `.env.example` Required environment variables

## Prerequisites

- Node.js 20+
- A GitHub OAuth App
- Vercel account (for deployment)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create local env file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill env vars in `.env.local`.
4. Set GitHub OAuth callback URL to:
   ```text
   http://localhost:3000/api/auth/callback
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```
6. Open:
   ```text
   http://localhost:3000
   ```

## Deploy to Vercel

1. Import this repository in Vercel.
2. In project settings, configure environment variables:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `TOKEN_ENCRYPTION_KEY`
   - `APP_URL` (recommended)
3. Update GitHub OAuth callback URL to:
   ```text
   https://<your-vercel-domain>/api/auth/callback
   ```
4. Deploy.

## Vercel Production Checks

After deploy, verify these endpoints:

- `GET /api/health` should return `ok: true` and all required config flags as `true`.
- `GET /api/auth/url` should return a JSON payload with GitHub authorize URL.
- `GET /api/me` should return `401` before login, then user JSON after login.

If `/api/auth/url` is `404`, redeploy and confirm your deployment includes `api/[...route].ts`.
If `/api/me` is `500`, check Vercel environment variables (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and one of `SESSION_SECRET` or `TOKEN_ENCRYPTION_KEY`).

## GitHub OAuth App Setup

- Homepage URL: your app URL (local or deployed)
- Authorization callback URL: must exactly match `/api/auth/callback`
- Example deployed callback URL: `https://gitcdn-lever.vercel.app/api/auth/callback`
- OAuth scopes requested by app: `repo`, `user`

## Environment Variables

- `APP_URL`
  - Optional base URL for callback and origin handling.
  - Example: `https://your-app.vercel.app`
- `GITHUB_CLIENT_ID`
  - GitHub OAuth client ID.
- `GITHUB_CLIENT_SECRET`
  - GitHub OAuth client secret.
- `SESSION_SECRET`
  - Secret for session/cookie cryptography.
- `TOKEN_ENCRYPTION_KEY`
  - Optional extra crypto key; if present, preferred over `SESSION_SECRET`.

## Scripts

- `npm run dev` Run local API + Vite app
- `npm run build` Build static frontend with Vite
- `npm run preview` Preview production frontend build
- `npm run lint` Type-check using TypeScript

## Free-Tier Notes

- Works without paid infrastructure (no managed DB required).
- Vercel Hobby has usage and fair-use limits.
- GitHub API rate limits apply.
- Large files and heavy traffic may require moving to paid tiers later.

## Known Constraints

- Session is cookie-based, so avoid storing large extra user state.
- GitHub repository permissions and rate limits drive API behavior.
- Private repository assets are not public via jsDelivr.

## Product Direction

See `project.md` for the product flow, MVP scope, and UX notes.

## Open Source Docs

- `LICENSE` (MIT)
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/*`

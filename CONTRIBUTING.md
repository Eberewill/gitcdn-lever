# Contributing to GitCDN

Thanks for contributing.

## Ways to Contribute

- Report bugs
- Propose features
- Improve docs
- Submit code changes

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill required variables in `.env.local`.
4. Run locally:
   ```bash
   npm run dev
   ```

## Before Opening a Pull Request

- Keep changes focused and scoped.
- Run checks locally:
  ```bash
  npm run lint
  npm run build
  ```
- Update docs when behavior/config changes.
- Link related issues in your PR description.

## Pull Request Guidelines

- Use clear titles and descriptions.
- Explain the problem and solution.
- Include screenshots for UI changes when relevant.
- Note breaking changes explicitly.

## Code Style

- Follow existing project patterns.
- Prefer readable, minimal changes over broad refactors.
- Avoid unrelated formatting-only edits in feature/fix PRs.

## Security Issues

Do not open public issues for vulnerabilities.
See [SECURITY.md](./SECURITY.md) for reporting instructions.

# Agent Handbook

This document collects the guardrails for anyone running autonomous or semi-automated tasks against this codebase.

## Core Repository Guidance

### Project Structure & Module Organization
- The Next.js client lives under `app/`. `app/editor/` powers the collaborative editor, `layout.tsx` supplies the shell, and `globals.css` configures Tailwind defaults.
- Shared utilities and client-side collaboration hooks sit in `lib/`, while reusable TypeScript definitions belong in `types/`.
- Real-time state is managed by the standalone Node service in `server/`, which exposes Socket.IO handlers (`roomManager.js`, `otAlgorithm.js`) and crypto helpers.
- Static assets stay in `public/`, and operational scripts (`deploy.sh`, `setup.sh`, `ecosystem.config.js`) support PM2 deployments.

### Build, Test, and Development Commands
- Install dependencies with `npm install` in both the repository root and `server/`.
- Launch the UI via `npm run dev`, start the collaboration service with `npm run server`, or run both together through `npm run dev:all`.
- Produce production bundles with `npm run build` and serve them through `npm run start`.
- `npm run lint` enforces the root ESLint rules, while `npm run health` runs the health check against the PM2 ecosystem.
- Use the PM2 helpers (`npm run pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`) when operating in managed environments.

### Coding Style & Naming Conventions
- Code in TypeScript and modern React. Respect the linting profile defined in `eslint.config.mjs` and keep indentation at two spaces.
- Use PascalCase for components and route groups, camelCase for hooks (`useCollaboration.ts`) and utilities, and UPPER_SNAKE_CASE only for environment variables.
- Keep Tailwind utility classes inline in JSX and reserve `globals.css` for design tokens.
- Avoid mutating shared buffers directly—delegate to helpers in `lib/crypto.ts` and the collaboration hooks to preserve operational transform integrity.

### Testing Guidelines
- Automated tests are not yet configured; add coverage alongside new features.
- Place unit tests adjacent to source in `__tests__/` folders and document the runner you used in the PR.
- For collaboration flows, script manual or automated multi-client scenarios against the Socket.IO server and capture the commands (`npm run server`, browser tabs, latency checks).
- Every change touching `lib/crypto.ts` or transformation logic must include verification that concurrent edits converge without data loss.

### Commit & Pull Request Guidelines
- Write small, imperative commits (e.g., `Add socket timeout guard`) that focus on a single change set.
- Reference related issues or tickets in the footer when applicable.
- Pull requests need a concise summary, testing evidence (commands and scenarios), and screenshots or GIFs for UI adjustments.
- Call out configuration or deployment impacts in a dedicated note and request reviews from both frontend and backend maintainers when changes span `app/` and `server/`.

## Agent Workflow & Tooling

### Shell Usage
- Run commands through `["bash","-lc", "<cmd>"]` and always set the `workdir` parameter instead of chaining `cd`.
- Prefer `rg`/`rg --files` for searches; fall back to alternatives only if `rg` is unavailable.
- Treat the filesystem as `workspace-write`: edit files inside the repo and request escalation before touching other paths.
- Network access is restricted; request approval only when it is essential to complete the task.

### Editing Practices
- Default to ASCII; introduce non-ASCII only when justified and consistent with the target file.
- Use `apply_patch` for single-file edits when practical; avoid it for generated content or large scripted changes.
- Preserve existing user modifications; never revert unrelated changes and pause if unexpected edits appear.
- Avoid destructive commands (`git reset --hard`, `git checkout --`, mass `rm`); execute them only when explicitly instructed.

### Planning & Execution
- Skip the planning tool for the simplest tasks (around the easiest 25%). Otherwise produce multi-step plans and update them as you complete steps.
- Execute at most one plan step at a time and keep the plan in sync with actual progress.
- Respect the `on-request` approval policy: supply `with_escalated_permissions` with a one-sentence justification whenever a command needs escalation.

### Testing & Validation
- Run meaningful checks locally when possible and summarize results instead of dumping logs.
- If tests cannot be run, note the limitation and outline how the user can verify the change.

### Communication & Responses
- Keep tone concise and collaborative; in reviews, lead with bugs and risks before summaries.
- Reference code with inline `path:line` notation and avoid URIs such as `file://`.
- Use inline backticks for commands or paths and fenced code blocks with language hints for snippets.
- In final responses, lead with the change explanation, follow with context, and provide next steps only when they are truly useful.

### Special Cases
- Fulfil simple user requests (e.g., showing the current time) via appropriate commands when feasible.
- For code reviews, adopt a bug-hunting mindset: prioritize risks, regressions, missing tests, and residual concerns.
- When approval or escalation is mandatory, request it directly through the tool call rather than via chat.

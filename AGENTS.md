# Agent Handbook

This document collects the guardrails for anyone running autonomous or semi-automated tasks against this codebase.

## Core Repository Guidance

### Project Structure & Module Organization
- v3 is a cross-platform CS architecture. The client lives under `client/`: Vite + React 19 + React Router (`src/pages/`, `src/components/`, `src/lib/`, `src/types/`), with `src/platform/` as the single place where Tauri/Web differences are resolved (`isTauri`, `scanQr`, `tray`).
- `client/src-tauri/` is the Tauri 2 shell (Rust: tray menu, target-gated barcode plugin; icons; capabilities). `client/src-tauri/gen/` is generated and never committed; `client/scripts/android-patch.mjs` post-processes the generated Android manifest (cleartext + CAMERA + INTERNET).
- Real-time state is managed by the standalone Node service in `server/index.js` (express + `ws` + `y-websocket` server + multer for image uploads, CORS enabled for direct-IP clients). Collaboration is CRDT-based (Yjs) relayed over y-websocket — there is no Socket.IO or OT layer.
- Server address is resolved at RUNTIME by `client/src/lib/serverConfig.ts` (`?server=` param > saved config > `VITE_SERVER_URL` dev-only > same-origin). Never inline server addresses at build time.
- QR payloads are Web URLs (`<server>/join?code=&server=`) consumed by `/join` — any phone camera works as a fallback; in-app scanning goes through `platform/scanQr.ts` (native plugin on Android, jsQR+getUserMedia elsewhere).
- Packaging runs entirely on GitHub Actions (`.github/workflows/build.yml`: web, desktop mac/win/linux, android). Local machines need no Rust/JDK — local work is `tsc`/`eslint`/`vite build` + convergence smoke only.
- Deployment is internalized under `deploy/` (`config.sh`, `deploy.sh`, `remote-restart.sh`, `nginx/` site configs) driven by `npm run deploy`; `setup.sh` bootstraps local dev, `ecosystem.config.js` configures PM2, and `Dockerfile`/`docker-compose.yml` build the all-in-one image.

### Build, Test, and Development Commands
- Install dependencies with `npm install` in `client/` and `server/` (root package.json is an orchestrator only; `setup.sh` does both).
- Launch the UI via `npm run dev` (Vite :5173), start the collaboration service with `npm run server` (:3001), or run both together through `npm run dev:all`.
- Production web build is `client/dist/` (Vite). Ship via `npm run deploy` (build → tar/scp upload → remote nginx + pm2 restart); desktop/android packages come from GitHub Actions, not local builds.
- `npm run lint` / `npm run build` delegate to `client/` (tsc --noEmit + eslint + vite build); `npm run health` runs the health check against the PM2 ecosystem.
- Tauri local dev (optional, needs Rust): `cd client && npx tauri dev`; Android: `npm run android:init` (init + manifest patch) then `npm run android:dev`.
- Use the PM2 helpers (`npm run pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`) when operating in managed environments.

### Coding Style & Naming Conventions
- Code in TypeScript and modern React. Respect the linting profile defined in `client/eslint.config.mjs` and keep indentation at two spaces.
- Use PascalCase for components and route groups, camelCase for hooks (`useCollaboration.ts`) and utilities, and UPPER_SNAKE_CASE only for environment variables.
- Keep Tailwind utility classes inline in JSX and reserve `index.css` for design tokens.
- Avoid mutating shared Yjs documents directly—go through the provider/hook in `client/src/lib/useCollaboration.ts` so CRDT updates are applied and broadcast correctly; route all Tauri-specific APIs through `client/src/platform/` instead of importing `@tauri-apps/*` from pages/components.
- The local checkout path must stay ASCII (`coordination-v2`): an em-dash path breaks Android Gradle builds.

### Testing Guidelines
- Automated unit tests are not yet configured; add coverage alongside new features. Place them adjacent to source in `__tests__/` and document the runner in the PR.
- Convergence smoke (`server/convergence-smoke.mjs`, start the server then run it) is REQUIRED after any change touching `useCollaboration.ts`, the Yjs document model, or the server relay: dual clients, 100 interleaved random-position inserts, deletion round, meta + awareness assertions. Note: interleaved inserts split text markers — assert by bracket counts, never substring matching.
- E2E UI regression lives in `e2e/` (Playwright + system Chrome): run `cd e2e && npx playwright test` locally after touching `client/src/pages` or `client/src/components`, and add cases for new interactions. It is LOCAL-ONLY by design — never wire it into `.github/workflows/`; CI builds packages and nothing else. Two-user collaboration cases must use one browser context per user (same-context tabs skew y-websocket awareness attribution — see `e2e/README.md`).
- For collaboration flows, also script manual multi-client scenarios against the y-websocket server (`npm run server`, two editor tabs with the same room code).
- QR payload build/parse roundtrip is pure logic (`client/src/lib/qr.ts`) — verify with assertions after changes.

### Commit & Pull Request Guidelines
- Write small, imperative commits (e.g., `Add socket timeout guard`) that focus on a single change set.
- Reference related issues or tickets in the footer when applicable.
- Pull requests need a concise summary, testing evidence (commands and scenarios), and screenshots or GIFs for UI adjustments.
- Call out configuration or deployment impacts in a dedicated note and request reviews from both frontend and backend maintainers when changes span `client/` and `server/`.

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

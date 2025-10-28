# Repository Guidelines

## Project Structure & Module Organization
The Next.js client lives under `app/`, with `app/editor/` powering the collaborative editor, `layout.tsx` supplying the shell, and `globals.css` configuring Tailwind defaults. Shared utilities and client-side collaboration hooks sit in `lib/`, while reusable TypeScript definitions belong in `types/`. Real-time state is managed by the standalone Node service in `server/`, which exposes Socket.IO handlers (`roomManager.js`, `otAlgorithm.js`) and crypto helpers. Static assets stay in `public/`, and operational scripts (`deploy.sh`, `setup.sh`, `ecosystem.config.js`) support PM2 deployments.

## Build, Test, and Development Commands
Install dependencies with `npm install` in both the repository root and `server/`. Launch the UI via `npm run dev`, start the collaboration service with `npm run server`, or run both together through `npm run dev:all`. Produce production bundles with `npm run build` and serve them through `npm run start`. `npm run lint` enforces the root ESLint rules, while `npm run health` runs the health check against the PM2 ecosystem. Use the PM2 helpers (`npm run pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`) when operating in managed environments.

## Coding Style & Naming Conventions
Code in TypeScript and modern React. Respect the linting profile defined in `eslint.config.mjs` and keep indentation at two spaces. Use PascalCase for components and route groups, camelCase for hooks (`useCollaboration.ts`) and utilities, and UPPER_SNAKE_CASE only for environment variables. Tailwind utility classes should live inline in JSX; reserve `globals.css` for design tokens. Avoid mutating shared buffers directly—delegate to helpers in `lib/crypto.ts` and collaboration hooks to preserve operational transform integrity.

## Testing Guidelines
Automated tests are not yet configured; add coverage alongside new features. Place unit tests adjacent to source in `__tests__/` folders and document the runner you used in the PR. For collaboration flows, script manual or automated multi-client scenarios against the Socket.IO server and capture the commands (`npm run server`, browser tabs, latency checks). Every change touching `lib/crypto.ts` or transformation logic must include verification that concurrent edits converge without data loss.

## Commit & Pull Request Guidelines
Write small, imperative commits (e.g., `Add socket timeout guard`) that focus on a single change set. Reference related issues or tickets in the footer when applicable. Pull requests need a concise summary, testing evidence (commands and scenarios), and screenshots or GIFs for UI adjustments. Call out configuration or deployment impacts in a dedicated note and request reviews from both frontend and backend maintainers when changes span `app/` and `server/`.

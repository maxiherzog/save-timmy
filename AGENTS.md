# OpenCode Instructions

## Scripts & Verification
- `npm run dev:host`: Expose dev server to local network (essential for testing mobile controllers).
- `npm run lint`: Lints the codebase.
- `npm run typecheck`: Runs the TypeScript compiler (`tsc --noEmit -p tsconfig.app.json`).
- There is no dedicated test script. Use `lint` and `typecheck` for verification.

## Architecture & Performance
- **Client/Host Split:** The game is hosted in one browser (acts as server) and controlled by phones (clients) via local network. `src/game/useHost.ts` drives the game simulation.
- **Supabase Payload Optimization (CRITICAL):** Do not send full game state to clients. In `src/game/net.ts` (`sendState`), non-essential data (`sandbanks`, `whale`, `fx`) is stripped before broadcasting. Sending full state causes severe latency (>100ms) and disconnects. Maintain this optimization.
- **Multitouch Controllers:** Controller components (`src/controller/*.tsx`) must track the specific `pointerId` of each touch event. Avoiding this causes one action (e.g., steering) to cancel another (e.g., throttle).

## Build & Deployment
- The project is deployed via GitHub Actions (`.github/workflows/deploy.yml`) to GitHub Pages.
- **Base Path & Assets:** In `vite.config.ts`, `base` is `/` for dev and `/save-timmy/` for build. To support both, asset paths in `index.html` must be root-absolute (e.g., `/favicon.ico`).

## Supabase Workflow
- Schema changes: `npx supabase db push`
- Edge Functions (e.g., role assignment): `npx supabase functions deploy`
- Requires `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
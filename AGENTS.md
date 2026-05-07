# AGENTS.md

This document provides essential information for agents working on this repository.

## Project Overview

This is a local multiplayer party game built with React, TypeScript, Vite, and Tailwind CSS. The backend, including real-time features and database, is handled by Supabase. The game is designed to be hosted from any device with a browser (e.g., an iPad) and played by others on the local network using their phones as controllers.

## Key Scripts

- **`npm run dev`**: Starts the Vite dev server. The `base` path is correctly set to `/` for this command.
- **`npm run dev:host`**: Exposes the dev server to the local network for testing with mobile controllers.
- **`npm run lint`**: Lints the codebase.
- **`npm run typecheck`**: Runs the TypeScript compiler for type-checking (`tsc --noEmit -p tsconfig.app.json`).
- **`npm run build`**: Builds the app for production. The `base` path is correctly set to `/save-timmy/` for this command.

**Note:** There is no dedicated test script.

## Development Workflow

1.  **Install:** `npm install`
2.  **Set up `.env`:** Create a `.env` file with your Supabase URL and anon key.
3.  **Set up Supabase:**
    - `npx supabase login`
    - `npx supabase link --project-ref YOUR_PROJECT_ID`
    - `npx supabase db push`
    - `npx supabase functions deploy`
4.  **Run:** `npm run dev` or `npm run dev:host`.

## Architecture & Performance Notes

- **CRITICAL: Supabase Payload Optimization:** The single most important performance factor is the size of the real-time payload sent from the host to the players. Previously, sending the entire game state (including static map geometry) caused severe latency (>100ms) and disconnects.
  - **The Solution:** In `src/game/net.ts`, the `sendState` function now strips all non-essential data (e.g., `sandbanks`, `whale`, `fx`) before broadcasting. Players only receive the data they need for their UI (phase, player list, etc.). **Maintain this optimization.** Do not send unnecessary data to player clients.

- **Mobile as Controller & Multitouch:**
  - The game is designed for players to use their phones. The `dev:host` script is crucial for testing this.
  - **The Fix:** Controller components (`src/controller/*.tsx`) must track the specific `pointerId` of each touch event. This prevents bugs where one action (e.g., pressing a button) would incorrectly cancel another (e.g., steering). This is essential for robust multi-touch input.

- **Vite `base` Configuration:**
  - In `vite.config.ts`, the `base` path is conditionally set: `/` for local development (`serve`) and `/save-timmy/` for production (`build`).
  - Correspondingly, all asset paths in `index.html` (icons, manifest, etc.) **must be root-absolute** (e.g., `/favicon.ico`) to work correctly in both environments.

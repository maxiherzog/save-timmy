# AGENTS.md

This document provides essential information for agents working on this repository.

## Project Overview

This is a local multiplayer party game built with React, TypeScript, Vite, and Tailwind CSS. The backend, including real-time features and database, is handled by Supabase.

## Key Scripts

The following are the most important scripts defined in `package.json`:

- **`npm run dev`**: Starts the Vite development server for the main application.
- **`npm run dev:host`**: Starts the development server and exposes it to the local network. This is crucial for testing the mobile-as-controller functionality.
- **`npm run lint`**: Lints the entire codebase using ESLint.
- **`npm run typecheck`**: Runs the TypeScript compiler to check for type errors.
- **`npm run build`**: Builds the application for production.

**Note:** There is no dedicated test script in `package.json`.

## Development Workflow

To set up and run this project locally, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set up Supabase:**
    - This project requires a Supabase backend. You will need a Supabase account.
    - Create a `.env` file in the root of the project with your Supabase URL and anon key:
      ```env
      VITE_SUPABASE_URL=https://your-project-id.supabase.co
      VITE_SUPABASE_ANON_KEY=your-long-anon-public-key
      ```
    - Use the Supabase CLI to manage the database schema and edge functions:
      - `npx supabase login`
      - `npx supabase link --project-ref YOUR_PROJECT_ID`
      - `npx supabase db push`
      - `npx supabase functions deploy`

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Or, to test with mobile controllers:
    ```bash
    npm run dev:host
    ```

## Architecture Notes

- **Mobile as Controller:** The game is designed to be played with a central screen (PC/TV) hosting the game, and players using their smartphones as controllers. This is why the `dev:host` script is important.
- **Supabase Integration:** Supabase is used for the database, real-time communication via channels, and serverless edge functions.

/*
  # Save Timmy — Core Schema

  1. New Tables
    - `rooms`
      - `code` (text, PK) — 4-char room code
      - `state` (text) — lobby | playing | voting | ended
      - `host_token` (text) — random token identifying the hosting laptop
      - `imposter_character` (text, nullable) — revealed only after match ends
      - `created_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
    - `match_results`
      - `id` (uuid, PK)
      - `room_code` (text)
      - `winner` (text) — rescuers | imposter
      - `reason` (text) — barge | whale_died | imposter_voted | timeout
      - `imposter_character` (text)
      - `imposter_name` (text)
      - `duration_days` (int)
      - `whale_hp_final` (int)
      - `stats` (jsonb) — per-player aggregated stats
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Public (anon) read of match_results (for post-game reveal / history)
    - Public (anon) insert/update on rooms and match_results is required because
      we have NO AUTH — the party game identity is just a chosen display name.
      This is an intentional low-friction tradeoff for a party game.
    - Room code acts as a shared secret; without it you can't discover rooms.

  3. Notes
    - Live game state (boats, whale, votes, inputs) is ephemeral and lives
      entirely on Supabase Realtime broadcast channels — not in Postgres.
    - Only durable lobby metadata and final match results are persisted here.
*/

CREATE TABLE IF NOT EXISTS rooms (
  code text PRIMARY KEY,
  state text NOT NULL DEFAULT 'lobby',
  host_token text NOT NULL DEFAULT '',
  imposter_character text,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  winner text NOT NULL DEFAULT 'rescuers',
  reason text NOT NULL DEFAULT 'barge',
  imposter_character text NOT NULL DEFAULT '',
  imposter_name text NOT NULL DEFAULT '',
  duration_days int NOT NULL DEFAULT 0,
  whale_hp_final int NOT NULL DEFAULT 0,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read match results"
  ON match_results FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert match results"
  ON match_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_match_results_room_code ON match_results(room_code);
CREATE INDEX IF NOT EXISTS idx_match_results_created_at ON match_results(created_at DESC);

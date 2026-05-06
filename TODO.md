# TODO

This document tracks planned improvements and feature ideas for the "Ab in die Barge!" game.

## Quality & Test Infrastructure

- [ ] **Set up `vitest`:** Integrate the Vite-native unit testing framework into the project.
  - `npm install --save-dev vitest`
  - Add a `"test": "vitest"` script to `package.json`.
  - Create a `vite.config.ts` entry for test configuration.

- [ ] **Write Unit Tests for `simulation.ts`:** Create a `simulation.test.ts` file to test the core game logic. This is the highest-value testing we can do.
  - **Player Movement:** Verify that applying throttle/steering inputs results in expected changes to boat `x`, `y`, and `heading`.
  - **Game Rules & State:**
    - Test that the whale's health decreases on sandbanks and increases in heal zones.
    - Test that the `bargeTimer` increments correctly when the whale is in the barge zone.
  - **Win/Loss Conditions:**
    - Create a scenario where the whale's HP drops to 0 and confirm the game ends with the correct winner.
    - Create a scenario where the `bargeTimer` reaches the win threshold and confirm the game ends correctly.
  - **Collisions & Interactions:**
    - Test that boat-on-boat collisions trigger the `stunnedUntil` state for both parties.
    - Test that a boat ramming the whale decreases its HP.

- [ ] **Test Helper Utilities:** Add tests for any pure utility functions (e.g., collision detection, map generation logic if it can be made deterministic for testing).

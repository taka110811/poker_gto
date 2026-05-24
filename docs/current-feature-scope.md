# Current Feature Scope

## Purpose

This document summarizes the app state after Phase 5.
The app is a static browser-based poker study tool that approximates GTO-style workflows, but it is not a full GTO solver.

## Current Capabilities

### Solver workspace

- Static web app that runs from a local HTTP server.
- Heads-up, Chip EV, no-rake study workflow.
- Inputs for hero cards, board cards, pot, call amount, effective stack, bet size, and position.
- `Random spot`, `Clear spot`, and `Solve Spot` flows.
- Monte Carlo equity estimate for the selected hero hand.
- Approx EV action mix for Raise / Call / Fold.
- Pot odds, SPR, samples, and reasoning output.

### Range Builder

- 13x13 range matrix.
- Separate OOP and IP ranges.
- Per-hand frequencies: 0%, 25%, 50%, 75%, 100%.
- Presets: Tight, Standard, Wide, Any two.
- Edited range frequencies feed the approximate simulation and solver-lite outputs.

### River Mini Solver

- Board 5 cards.
- Heads-up, no-rake, no-raise river tree.
- Fixed bet size candidates:
  - 33% pot
  - 75% pot
  - 125% pot
  - All-in
- Live CFR-style approximation runs in a Web Worker when available.
- Main-thread fallback remains available.
- Solver result cache reuses repeated river calculations.
- Outputs:
  - OOP bet / check
  - IP call vs bet
  - IP bet vs check
  - OOP call vs probe
  - OOP EV
  - size comparison table

### Turn Solver Lite

- Board 4 cards.
- Enumerates a capped set of river runouts.
- Calls the existing River Mini Solver path for each sampled river.
- Uses a smaller combo cap for responsiveness.
- Outputs:
  - average OOP bet / check
  - average IP call vs bet
  - average IP bet vs check
  - average OOP call vs probe
  - average OOP EV
  - best sampled river
  - calculation time
  - solver settings and accuracy label
  - per-river result rows

### Flop Solver Lite

- Board 3 cards.
- Classifies flop texture.
- Computes lightweight OOP/IP range scores with capped range combos.
- Shows range advantage.
- Enumerates capped turn samples.
- Shows runout volatility from sampled turn range-advantage movement.
- Shows heuristic strategy mix:
  - OOP c-bet
  - OOP check
  - IP continue
- Outputs per-turn sample rows with texture, OOP/IP score, and advantage.

### Precomputed DB Reference

- Loads `data/precomputed_spots.sqlite` directly in the browser through `sql.js`.
- Keeps the static app deployment model.
- Searches the closest solved river spot.
- Shows exact/approx match status and rounding reasons.
- Displays referenced spot metadata, DB stats, solver version, and action rows.

### Testing And CI

- `npm run check`: JavaScript syntax checks.
- `npm run db:validate`: validates generated seed, SQLite, and browser artifacts.
- `npm run test:db`: DB query unit tests.
- `npm run test:e2e`: Playwright smoke tests.
- GitHub Actions runs the app checks for PRs and main pushes.

## Explicit Boundaries

### Not A Full GTO Solver

The current app uses a mix of:

- Monte Carlo equity approximation.
- River-only CFR-style approximation.
- Turn Solver Lite that rolls out river samples and reuses the River Mini Solver.
- Flop Solver Lite that uses range/texture heuristics and capped turn samples.
- Precomputed sample spots stored in SQLite.

It does not solve a complete no-limit hold'em game tree.

### Street Boundaries

- River is the only street with a CFR-style action tree.
- Turn is a rollout layer over the River Mini Solver.
- Flop is currently a texture/range heuristic layer.
- Full Turn CFR is tracked separately in #40.
- Full Flop CFR should be separated into a future issue if needed.

### Data Boundaries

- The precomputed DB currently contains a small sample dataset.
- Browser SQLite is selected as the current storage path.
- Larger datasets need continued mobile/Tailscale load-time checks.
- The strategy data is suitable for UI and workflow validation, not production-grade solver accuracy.

### Performance Boundaries

- Solver-lite paths use caps for responsiveness.
- Test mode lowers iteration/runout counts.
- Web Worker support avoids blocking the UI for River calculations, with fallback support.
- Turn and Flop outputs should stay bounded until a stronger calculation backend is introduced.

## Current User-Facing Workflow

1. Select or randomize cards.
2. Choose pot, stack, bet size, and position inputs.
3. Edit OOP/IP ranges.
4. Click `Solve Spot`.
5. Interpret the output by board street:
   - 3-card board: Flop Solver Lite.
   - 4-card board: Turn Solver Lite.
   - 5-card board: River Mini Solver and Precomputed DB reference.

## Recommended Next Step Before Phase 6

Before implementing the Preflop Spot Browser, keep the current scope visible in the UI/docs:

- Solver outputs are useful for study workflow prototyping.
- River has the strongest calculation logic.
- Turn and Flop are Lite approximations.
- Precomputed DB reference is sample-backed and currently river-oriented.

This keeps future Phase 6 work grounded: preflop spots should prefill ranges, pot, stack, position, and board workflow without implying that every spot has a full solved GTO tree.

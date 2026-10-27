# Boiler Troubleshooting — project notes

A training game for military HVAC technicians, the sister game of Package Unit Troubleshooting. Trainees troubleshoot a
simulated commercial hot-water boiler (1,000 MBH, on/off power burner, 7800-series flame safeguard) with a meter, clamp,
manometer, pump gauges, pipe thermometers and a combustion analyzer. It ships as ONE self-contained offline HTML file.

## Build and test
- Edit the separate source files, never the built HTML.
- `python3 build.py` joins the JS (order in build.py) and CSS into `shell.html` and writes `boiler-troubleshooting.html`,
  `index.html` (same file, for GitHub Pages) and `bundle.js`.
- No transpiler: write ES2017 by hand (the classroom smartboard browser is old). build.py refuses to build if it finds
  `?.`, `??`, object spread, flat/flatMap, Object.fromEntries, `catch {`, regex lookbehind or named groups.
- Tests: serve the folder (`python3 -m http.server 8765`) and open `test.html`; it must print `0 FAIL`.
  The tests drive the engine only (every level: found broken, stays broken without a repair, runs normally once repaired).
- Check the game itself in a browser for page errors in desktop, phone and smartboard views.

## Files
engine.js (simulation: resistor-network solver for volts/ohms, flame safeguard state machine, water, gas, combustion),
parts.js (parts, FIXES fault→part, inspect text for the boiler-room picture), levels.js (20 levels), panel.js (probe
points), ladder.js (ladder schematic), pic.js (boiler room picture), app.js (UI), style.css (shared with the package unit
game, copied as-is) + boiler.css (additions).

## How the simulation works
- Every wire run is a net (NETS); every switch, coil, motor and fuse is an element with a resistance (0 closed, Infinity
  open). Volts come from a nodal solve with L1 = 120 V and neutral = 0, so readings across open switches, loads in series
  and parallel coils all fall out naturally. Ohms is the same network unpowered (e.g. V1 reads in parallel with V2 unless
  isolated; the PR coil reads in parallel with the relay module while the heating call is closed).
- Flame safeguard (rmStep): INITIATE 10 s → STANDBY → PREPURGE 30 s (terminal 7 must prove within 10 s) → PFEP 10 s
  (3, 8, 10) → MFEP 10 s (3, 8, 9) → RUN (3, 9) → POSTPURGE 15 s. Timers run at 2× (SPEED). Lockout needs the Reset
  button and survives a power cycle. Terminal 6 = limit string, 7 = lockout interlocks (LGPS, HGPS, air switch).
- Before the trainee arrives the boiler is run for `pre` seconds (and reset `resets` times) so it is found as the customer
  left it, with the lockout history to match.
- A level is complete when no faults remain, no switch is latched, and the burner has been in RUN for 4 s.

## Rules from the instructor (same as the package unit game — do not break)
- Apply every change to all views (desktop, phone, smartboard) unless one view is named.
- Customer tickets never name the faulty part. No money values anywhere. No visual giveaways of the fault (clues only
  appear when the trainee inspects a part, measures, or reads a gauge).
- Stars drop only for safety strikes, wrong parts, hints and readings over twice par. No readings counter in the HUD.
- Meter leads are sticky. Ohms on a live circuit, ohms on the line side of the disconnect, repairs with the power on, and a
  third reset of a locked-out burner without a repair are safety strikes.
- Accounts (when added): share the package unit game's Supabase project. Only the publishable key goes in the code;
  never a secret / service_role key.
- localStorage keys start with `blr_` so they never collide with the package unit game (`put_`) on the same github.io origin.

## Assumptions to confirm with the instructor
- Burner modelled as on/off with an interrupted pilot (pilot off at the end of MFEP); no low/high fire or firing-rate motor yet.
- 7800-series terminal numbers used: L1, L2, 3 blower, 4 alarm, 6 limits in, 7 lockout interlock in, 8 pilot, 9 main,
  10 ignition, F/G scanner. Lockout messages are written in plain words, not the exact Honeywell fault codes.
- All 120 V single phase, including a 3/4 hp pump. Values (pressures, amps, flame signal, analyzer readings) are typical,
  not from one manufacturer's literature.

## Still to do
- Accounts and training record shared with the package unit game (Supabase; boiler result tables).
- Carrier-style field wiring diagram next to the ladder, like the package unit game.
- Random service calls and instructor jobs; low/high fire; steam boiler; condensing boiler with an integrated board.
- Installable app (PWA).

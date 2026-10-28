# Boiler Troubleshooting — project notes

A training game for military HVAC technicians, the sister game of Package Unit Troubleshooting. Trainees troubleshoot a
simulated **Thermal Solutions EVA-3000** hot-water boiler (rating plate: model EVA3000BN1-UEBM, serial 65055391) with a
meter, clamp, manometer, pump gauges, pipe thermometers and a combustion analyzer. It ships as ONE self-contained offline
HTML file, published at https://ethanpliska.github.io/boiler-troubleshooting/ (repo ethanpliska/boiler-troubleshooting).

## Source of truth for the boiler
Thermal Solutions EVA I&O manual, file MH25585, 81456001 R12-6/16 (covers EVA-500 to EVA-3000). Key pages: capacities
and electrical (p. 4–5), Table 2 flow and pressure drop, Table 3 gas inlet pressure, Figure 9c "Standard UL/FM/CSD-1
Wiring Diagram (Modulation) EVA 2000S-3000" (p. 28), section VI sequence of operation (p. 42), safety controls (p. 44),
troubleshooting guide (p. 45–46), DB&B gas train figure 22e (p. 59), controls parts list (p. 63). A newer revision
(rev 13, 9/24) exists on ManualsLib. The suffix "BN1-UEBM" is not decoded in the manual.

## Build and test
- Edit the separate source files, never the built HTML.
- `python3 build.py` joins the JS (order in build.py) and CSS into `shell.html` and writes `boiler-troubleshooting.html`,
  `index.html` (same file, for GitHub Pages) and `bundle.js`.
- No transpiler: write ES2017 by hand (the classroom smartboard browser is old). build.py refuses to build if it finds
  `?.`, `??`, object spread, flat/flatMap, Object.fromEntries, `catch {`, regex lookbehind or named groups.
- Tests: serve the folder (`python3 -m http.server 8765`) and open `test.html`; it must print `0 FAIL`.
  The tests drive the engine only (every level: found broken, stays broken without a repair, runs normally once repaired;
  plus sequence timing, meter readings and fault behaviour from the manual).
- Check the game itself in a browser for page errors in desktop, phone and smartboard views.
- Publish: commit, then `git push` (the GitHub CLI is at ~/.local/bin/gh); Pages updates in about a minute.

## Files
engine.js (simulation: phasor resistor-network solver for volts/ohms, RM7896D state machine, VFD, RWF55 modulation, water,
gas, combustion), parts.js (parts, FIXES fault→part, inspect text), ptdraw.js (the package unit game's PT part artwork,
copied unchanged so both panels look alike), levels.js (22 levels), panel.js (probe points, drawn with PT), ladder.js
(ladder schematic after Figure 9c), pic.js (boiler room picture), app.js (UI), style.css (shared with the package unit
game, copied as-is) + boiler.css (additions).

## How the simulation works (follows Figure 9c)
- Power: 208 V 3-phase wye (120 V leg to ground) → fused disconnect F1–F3 (by others) → VFD (A/C Tech SCF) L1/L2/L3 →
  U/V/W to the 2 hp combustion blower; and L1/L2 → two primary fuses FU1 → control transformer (208 tap, 115 V) → X1 = TB1,
  X2 = TB2 (grounded) → 5 A control circuit breaker → TB3.
- 115 V control: TB3 → burner ON/OFF switch (with light) → TB4 → blocked air filter switch → CHANGE FILTER light; TB4 →
  field enable / heat call (TB4–TB5, factory jumper removed) → TB5 → high limit L4008E (manual reset, 210°F) → RWF55
  Q13–Q14 → low gas switch → high gas switch (both manual reset, in the limit string, so they hold off without lockout) →
  flow switch FS4-3 → low-water cutoff → vestibule fuse switch → TB6 → RM 6. TB6 → combustion airflow switch → TB7 → RM 7.
- RM7896D subbase: 5 = power (from TB3), L2 = neutral, 4 = blower (→ TB11 → CRA1 → VFD run), 8 = pilot V4046 (TB8),
  9 = main valves (TB9: SKP75 actuator/ratio regulator, secondary valve, N.O. vent valve, and TD-1 → 20 s → TB12 → CRA2
  "release to modulation"), 10 = ignition (TB10), 3 = alarm, F = UV scanner via R7849A amplifier.
- Sequence (manual section VI; timers ×2 via SPEED): INITIATE → STANDBY → PREPURGE 30 s (airflow must prove in 10 s) →
  PFEP 10 s (pilot + ignition, early spark termination after 5 s) → MFEP 5 s (pilot + main) → RUN (pilot off) →
  POSTPURGE 60 s. Flame proves at 1.25 V dc; normal 1.5–5.0 V dc. Lockout needs Reset and survives a power cycle.
- Modulation: RWF55 setpoint 180°F (factory), burner on at 175 / off at 185 (assumed). Low fire hold until CRA2, then the
  firing rate follows the load; VFD speed 15–60 Hz; the SKP75 ratio valve makes the manifold pressure follow the air.
- The VFD needs all three input legs and trips (latched) on input or output phase loss; removing power clears the trip.
- System pump (by others) runs continuously from TB3 through its overload; on two legs it hums and trips the overload.
- Every wire run is a net (NETS); every switch, coil, winding and fuse is an element with a resistance. Volts are phasors
  from a nodal solve, so open-switch readings, parallel coils (TB9 devices, TB3 loads), phantom voltage on a dead leg and
  in-circuit fuse readings all fall out of the circuit. VFD output volts are modelled separately (V/Hz).
- Before the trainee arrives the boiler runs for `pre` seconds (and is reset `resets` times) so it is found as the
  customer left it, with the lockout history to match. A level is complete when no faults remain, nothing is latched,
  and the burner has been in RUN for 4 s.

## Rules from the instructor (same as the package unit game — do not break)
- Apply every change to all views (desktop, phone, smartboard) unless one view is named.
- Customer tickets never name the faulty part. No money values anywhere. No visual giveaways of the fault (clues only
  appear when the trainee inspects a part, measures, reads a gauge, or sees a real indicator such as the CHANGE FILTER
  light, the LOW WATER light or the VFD keypad).
- Stars drop only for safety strikes, wrong parts, hints and readings over twice par. No readings counter in the HUD.
- Meter leads are sticky. Ohms on a live circuit, ohms on the line side of the disconnect, repairs with the power on, and a
  third reset of a locked-out burner without a repair are safety strikes.
- The system pump runs continuously (the user asked for this; the EVA diagram's own pump output 1M is not used).
- Accounts (when added): share the package unit game's Supabase project. Only the publishable key goes in the code;
  never a secret / service_role key.
- localStorage keys start with `blr_` so they never collide with the package unit game (`put_`) on the same github.io origin.

## Assumptions not in the manual (confirm with the instructor / rating label / firetest report)
- Relief valve 50 psi (set at time of purchase); cold fill 15 psi; flow switch make ~110 gpm; system flow 200 gpm.
- Gas switch set points (low 5.0 in. w.c. inlet, high 3.0 in. w.c. after the valves), manifold pressures, O2/CO values.
- RWF55 switching points 175/185°F; high limit set 210°F (L4008E max 240°F).
- VFD fault text is plain words, not A/C Tech fault codes. Lockout messages are plain words, not Honeywell codes.
- Fused disconnect F1–F3 and the 5 hp system pump are "by others" field equipment.

## Still to do
- Accounts and training record shared with the package unit game (Supabase; boiler result tables).
- Random service calls and instructor jobs; more EVA faults (vent valve, vestibule fuse switch, amplifier, RWF55 sensor).
- Installable app (PWA).

/* ===== Tests. Open test.html in a browser (or the built-in browser) after `python3 build.py`; it must print 0 FAIL.
   Uses only the engine, parts and levels (no screen). ===== */
(function () {
  const out = [], B = Boiler;
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; out.push('FAIL ' + m); } };
  const run = s => { for (let i = 0; i < s * 2; i++) B.tick(0.5); };

  /* every level: found broken, cured by its own repairs, not cured without them */
  LEVELS.forEach((l, i) => {
    B.reset(l.faults, i + 3, { pre: l.pre, resets: l.resets });
    ok(!B.healthy(), 'L' + l.n + ' should not be healthy when found');
    l.faults.forEach(f => ok(PARTS[FIXES[f]], 'L' + l.n + ' fault ' + f + ' has a part'));
    run(60); ok(!B.healthy(), 'L' + l.n + ' should stay broken without a repair');
    l.faults.forEach(f => B.faults.delete(f));
    run(100); B.lgTrip = false; B.hgTrip = false; B.hlTrip = false; if (B.rm.st === 'LOCKOUT') B.rmReset(true);
    let healthy = false; for (let t = 0; t < 400 && !healthy; t++) { B.tick(0.5); healthy = B.healthy(); }
    ok(healthy, 'L' + l.n + ' should run normally once repaired (state ' + B.rm.st + ' ' + B.rm.lock + ')');
    ok(!l.faults.some(f => /pump relay|aquastat|fuse|scanner|transformer|valve coil/i.test(l.ticket)), 'L' + l.n + ' ticket should not name the part');
  });

  /* a healthy boiler cycles on its operating control and never locks out */
  B.reset([], 5, { pre: 0 }); run(600);
  ok(B.rm.hist.length === 0, 'healthy boiler should never lock out: ' + (B.rm.hist[0] && B.rm.hist[0].msg));
  ok(B.Tb > 160 && B.Tb < 185, 'healthy boiler holds 165-180°F, got ' + B.Tb.toFixed(1));
  ok(B.P > 17 && B.P < 23, 'healthy pressure near 20 psi, got ' + B.P.toFixed(1));

  /* meter: line voltage, open fuse, ohms */
  B.reset(['fuse_open'], 1, { pre: 20 });
  ok(Math.abs(B.volts('LN_L1', 'LN_N') - 120) < 3, 'line voltage ~120');
  ok(B.volts('F1_IN', 'F1_OUT') > 100, 'open fuse reads line voltage across it with power on');
  ok(B.volts('F1_OUT', 'NB') < 5, 'no voltage after an open fuse');
  B.disc = false; B.tick(0.1);
  ok(B.ohms('F1_IN', 'F1_OUT') === Infinity, 'open fuse reads OL');
  ok(B.volts('LN_L1', 'NB') > 100, 'line side is still live with the disconnect off');
  B.reset([], 1, { pre: 20 }); B.disc = false; B.tick(0.1);
  ok(Math.abs(B.ohms('PR_A', 'PR_B') - 341) < 5, 'pump relay coil reads in parallel with the relay module while the heating call is closed, got ' + B.ohms('PR_A', 'PR_B'));
  B.call = false;
  ok(Math.abs(B.ohms('PR_A', 'PR_B') - 380) < 5, 'pump relay coil isolated ~380 ohms, got ' + B.ohms('PR_A', 'PR_B'));
  B.call = true;
  const v = B.ohms('V1_1', 'V1_2');
  ok(v > 500 && v < 600, 'main valve coils read in parallel (~575) unless isolated, got ' + v.toFixed(0));
  B.reset(['v1_open'], 1, { pre: 20 }); B.disc = false; B.tick(0.1);
  ok(Math.abs(B.ohms('V1_1', 'V1_2') - 1150) < 20, 'with V1 open you read V2 through the shared wiring, got ' + B.ohms('V1_1', 'V1_2').toFixed(0));

  /* flame signal */
  B.reset([], 2, { pre: 0 }); let seen = 0;
  for (let i = 0; i < 300; i++) { B.tick(0.25); if (B.rm.st === 'RUN') seen = Math.max(seen, B.dcVolts('FT_P', 'FT_N')); }
  ok(seen > 3.4 && seen < 4.6, 'main flame signal 3.5-4.5 V, got ' + seen.toFixed(2));
  B.reset(['lens_dirty'], 2, { pre: 0 }); let pf = 0;
  for (let i = 0; i < 300; i++) { B.tick(0.25); if (B.rm.st === 'PFEP') pf = Math.max(pf, B.sig); }
  ok(pf > 0.5 && pf < FLAME_MIN, 'dirty lens pilot signal below 1.25 V, got ' + pf.toFixed(2));

  /* gauges */
  B.reset(['gas_closed'], 2, { pre: 30 }); ok(B.pin === 0 && B.lgTrip, 'closed gas cock: no inlet pressure and LGPS tripped');
  B.reset(['coupler'], 2, { pre: 30 }); ok(B.pumpRun && B.dp === 0 && B.amps('pump') < 5, 'broken coupler: motor runs, no differential, low amps');
  B.reset(['iso_closed'], 2, { pre: 30 }); ok(B.dp > 12 && B.flow === 0, 'closed valve: shutoff head, no flow');
  B.reset(['tank_logged'], 2, { pre: 200 }); ok(B.relief === 'discharging', 'waterlogged tank lifts the relief valve, got ' + B.relief + ' at ' + B.P.toFixed(1));
  B.reset(['blower_dirty'], 2, { pre: 0 }); run(60); const a = B.analyzer();
  ok(a && a.co > 400 && a.o2 < 2, 'dirty blower: high CO, low O2');

  out.unshift(pass + ' pass, ' + fail + ' FAIL');
  const pre = document.getElementById('out'); if (pre) pre.textContent = out.join('\n');
  window.TEST_RESULT = out.join('\n');
})();

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
    run(100); B.lgTrip = false; B.hgTrip = false; B.hlTrip = false; B.olTrip = false; if (B.rm.st === 'LOCKOUT') B.rmReset(true);
    let healthy = false; for (let t = 0; t < 400 && !healthy; t++) { B.tick(0.5); healthy = B.healthy(); }
    ok(healthy, 'L' + l.n + ' should run normally once repaired (state ' + B.rm.st + ' ' + B.rm.lock + ')');
    ok(!l.faults.some(f => /pump relay|aquastat|fuse|scanner|transformer|valve coil/i.test(l.ticket)), 'L' + l.n + ' ticket should not name the part');
  });

  /* a healthy boiler cycles on its operating control and never locks out */
  B.reset([], 5, { pre: 0 }); run(600);
  ok(B.rm.hist.length === 0, 'healthy boiler should never lock out: ' + (B.rm.hist[0] && B.rm.hist[0].msg));
  ok(B.Tb > 160 && B.Tb < 185, 'healthy boiler holds 165-180°F, got ' + B.Tb.toFixed(1));
  ok(B.P > 17 && B.P < 23, 'healthy pressure near 20 psi, got ' + B.P.toFixed(1));

  /* meter: 208 V 3 phase, control transformer, open control fuse, ohms */
  B.reset(['fuse_open'], 1, { pre: 20 });
  ok(Math.abs(B.volts('LN_L1', 'LN_L2') - 208) < 6, 'line to line ~208, got ' + B.volts('LN_L1', 'LN_L2').toFixed(1));
  ok(Math.abs(B.volts('LN_L3', 'GND') - 120) < 4, 'leg to ground ~120');
  ok(Math.abs(B.volts('XF_X1', 'XF_X2') - 120) < 4, 'control transformer secondary ~120, got ' + B.volts('XF_X1', 'XF_X2').toFixed(1));
  ok(B.volts('FU_IN', 'FU_OUT') > 100, 'open control fuse reads 120 V across it with power on');
  ok(B.volts('FU_OUT', 'NB') < 5, 'no voltage after an open control fuse');
  B.disc = false; B.tick(0.1);
  ok(B.ohms('FU_IN', 'FU_OUT') === Infinity, 'open fuse reads OL');
  ok(B.volts('LN_L1', 'LN_L2') > 190, 'line side is still live with the disconnect off');
  B.reset([], 1, { pre: 20 }); B.disc = false; B.tick(0.1);
  ok(Math.abs(B.ohms('PS_A', 'PS_B') - 241) < 6, 'pump starter coil reads in parallel with the relay module while the heating call is closed, got ' + B.ohms('PS_A', 'PS_B').toFixed(0));
  B.call = false;
  ok(Math.abs(B.ohms('PS_A', 'PS_B') - 260) < 5, 'pump starter coil isolated ~260 ohms, got ' + B.ohms('PS_A', 'PS_B').toFixed(0));
  B.call = true;
  const w = ['PM_T1,PM_T2', 'PM_T2,PM_T3', 'PM_T3,PM_T1'].map(pr => B.ohms(pr.split(',')[0], pr.split(',')[1]));
  ok(w.every(x => Math.abs(x - 4.8) < 0.3), 'pump windings in delta read equal (~4.8 ohms), got ' + w.map(x => x.toFixed(2)).join(' '));
  /* a blown leg fuse: the pump hums, the dead leg shows about half voltage by back-feed, the overload trips */
  B.reset(['fuse_L3'], 2, { pre: 0 });
  let phantom = 0, humSeen = false, lra = false;
  for (let i = 0; i < 40; i++) { B.tick(0.25); if (B.pumpHum) { humSeen = true; phantom = Math.max(phantom, B.volts('F3_OUT', 'F1_OUT')); if (B.amps('pump3') === 0 && B.amps('pump1') > 12) lra = true; } }
  ok(humSeen, 'single-phased pump hums');
  ok(phantom > 80 && phantom < 130, 'dead leg reads a phantom ~104 V to a live leg while the motor is on, got ' + phantom.toFixed(0));
  ok(lra, 'dead leg carries no current, live legs carry locked-rotor current');
  for (let i = 0; i < 60; i++) B.tick(0.25);
  ok(B.olTrip && !B.pumpHum, 'overload trips and drops the starter');
  B.reset([], 3, { pre: 0 }); run(60);
  ok(Math.abs(B.amps('pump2') - 3.3) < 0.2 && Math.abs(B.amps('blower3') - 2.6) < 0.2, 'running motor currents per leg');
  B.reset([], 1, { pre: 20 }); B.disc = false; B.tick(0.1);
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

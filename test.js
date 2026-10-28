/* ===== Tests. Open test.html in a browser (or the built-in browser) after `python3 build.py`; it must print 0 FAIL.
   Uses only the engine, parts and levels (no screen). ===== */
(function () {
  const out = [], B = Boiler;
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; out.push('FAIL ' + m); } };
  const run = s => { for (let i = 0; i < s * 2; i++) B.tick(0.5); };
  const off = () => { B.disc = false; B.tick(0.1); };

  /* every level: found broken, cured by its own repairs, not cured without them */
  LEVELS.forEach((l, i) => {
    B.reset(l.faults, i + 3, { pre: l.pre, resets: l.resets });
    ok(!B.healthy(), 'L' + l.n + ' should not be healthy when found');
    l.faults.forEach(f => ok(PARTS[FIXES[f]], 'L' + l.n + ' fault ' + f + ' has a part'));
    run(60); ok(!B.healthy(), 'L' + l.n + ' should stay broken without a repair');
    l.faults.forEach(f => B.faults.delete(f));
    off(); B.disc = true;
    run(100); B.lgTrip = false; B.hgTrip = false; B.hlTrip = false; B.olTrip = false; B.vfdFault = ''; if (B.rm.st === 'LOCKOUT') B.rmReset(true);
    let healthy = false; for (let t = 0; t < 600 && !healthy; t++) { B.tick(0.5); healthy = B.healthy(); }
    ok(healthy, 'L' + l.n + ' should run normally once repaired (state ' + B.rm.st + ' ' + B.rm.lock + ')');
  });
  ok(Object.keys(FIXES).every(f => PARTS[FIXES[f]]), 'every fault maps to a real part');

  /* a healthy EVA modulates near setpoint and never locks out */
  B.reset([], 5, { pre: 0 }); run(1200);
  ok(B.rm.hist.length === 0, 'healthy boiler should never lock out: ' + (B.rm.hist[0] && B.rm.hist[0].msg));
  ok(B.Tb > 170 && B.Tb < 186, 'healthy boiler holds about 180°F, got ' + B.Tb.toFixed(1));
  ok(B.rate > 0.3 && B.rate < 1, 'it modulates below high fire at steady load, got ' + B.rate.toFixed(2));
  ok(B.P > 20 && B.P < 26, 'healthy pressure about 23 psi, got ' + B.P.toFixed(1));
  ok(B.sig >= 1.5 && B.sig <= 5, 'main flame signal in the manual range 1.5-5.0 V, got ' + B.sig.toFixed(2));
  ok(B.en.cra2 && B.en.cra1, 'CRA1 (blower) and CRA2 (release to mod) pulled in while running');
  ok(Math.abs(B.volts('TB3', 'TB2') - 115) < 5, 'control circuit about 115 V, got ' + B.volts('TB3', 'TB2').toFixed(1));
  ok(B.volts('VFD_U', 'VFD_V') > 60 && B.volts('VFD_U', 'VFD_V') < 210, 'VFD output voltage follows speed, got ' + B.volts('VFD_U', 'VFD_V').toFixed(0));
  const a = B.analyzer(); ok(a && a.o2 > 4 && a.o2 < 6 && a.co < 100, 'healthy combustion O2 4-6 %, low CO');

  /* sequence timing from the manual: ignition only the first 5 s of the pilot trial, low fire hold until TD-1 */
  B.reset([], 2, { pre: 0 }); let ignAt = null, ignOff = null, mfep = false, relAt = null, t = 0;
  for (let i = 0; i < 400; i++) { B.tick(0.25); t += 0.25;
    if (B.rm.st === 'PFEP') { if (B.en.ig && ignAt === null) ignAt = B.rm.el; if (!B.en.ig && ignAt !== null && ignOff === null) ignOff = B.rm.el; }
    if (B.rm.st === 'MFEP') mfep = true;
    if (B.rm.st === 'RUN' && B.en.cra2 && relAt === null) relAt = t;
  }
  ok(ignOff !== null && ignOff >= 4.5 && ignOff <= 5.6, 'early spark termination at 5 s of PFEP, got ' + ignOff);
  ok(mfep && relAt !== null, 'MFEP then release to modulation');
  B.reset([], 2, { pre: 0 }); let held = true;
  for (let i = 0; i < 400; i++) { B.tick(0.25); if (B.rm.st === 'RUN' && !B.en.cra2 && B.rate > 0.27) held = false; }
  ok(held, 'low fire hold until CRA2 releases modulation');

  /* meter: 208 V 3 phase, control transformer, open primary fuse, ohms */
  B.reset(['fuse_open'], 1, { pre: 20 });
  ok(Math.abs(B.volts('LN_L1', 'LN_L2') - 208) < 6, 'line to line ~208, got ' + B.volts('LN_L1', 'LN_L2').toFixed(1));
  ok(Math.abs(B.volts('LN_L3', 'GND') - 120) < 4, 'leg to ground ~120');
  ok(B.volts('FUA_IN', 'FUA_OUT') > 100, 'open primary fuse reads voltage across it with power on, got ' + B.volts('FUA_IN', 'FUA_OUT').toFixed(0));
  ok(B.volts('TB3', 'TB2') < 5, 'no control power with the primary fuse open');
  ok(!B.pumpRun, 'system pump is off without control power');
  off();
  const fo = B.ohms('FUA_IN', 'FUA_OUT');
  ok(fo > 40 && fo < Infinity, 'an open fuse ohmed in circuit reads back through the transformer and VFD input, not OL (got ' + fo.toFixed(0) + ')');
  ok(B.volts('LN_L1', 'LN_L2') > 190, 'line side is still live with the disconnect off');
  B.reset([], 1, { pre: 20 }); off();
  ok(B.ohms('PS_A', 'PS_B') < 255, 'pump starter coil reads in parallel with other TB3 loads, got ' + B.ohms('PS_A', 'PS_B').toFixed(0));
  B.olTrip = true; ok(Math.abs(B.ohms('PS_A', 'PS_B') - 260) < 5, 'pump starter coil isolated ~260 ohms with the overload contact open'); B.olTrip = false;
  const w = ['PM_T1,PM_T2', 'PM_T2,PM_T3', 'PM_T3,PM_T1'].map(pr => B.ohms(pr.split(',')[0], pr.split(',')[1]));
  ok(w.every(x => Math.abs(x - 0.6) < 0.1), 'pump windings in delta read equal (~0.6 ohm), got ' + w.map(x => x.toFixed(2)).join(' '));
  const bw = B.ohms('BM_U', 'BM_V');
  ok(Math.abs(bw - 1.6) < 0.2, 'blower windings behind the VFD read ~1.6 ohm, got ' + bw.toFixed(2));
  const v1 = B.ohms('V1_1', 'V1_2');
  B.reset(['v1_open'], 1, { pre: 20 }); off();
  const v1o = B.ohms('V1_1', 'V1_2');
  ok(v1o > v1 && v1o < Infinity, 'with the SKP75 open you still read the secondary valve, vent valve and TD-1 in parallel (' + v1.toFixed(0) + ' → ' + v1o.toFixed(0) + ')');

  /* faults behave the way the manual describes */
  B.reset(['gas_closed'], 2, { pre: 60 });
  ok(B.lgTrip && B.rm.st === 'STANDBY' && !B.en.alarm, 'closed gas: low gas switch holds the burner in STANDBY with no lockout');
  B.reset(['reg_high'], 2, { pre: 200 });
  ok(B.hgTrip && B.rm.st === 'STANDBY', 'SKP75 regulating high trips the high gas switch once it ramps up');
  B.reset(['blower_open'], 2, { pre: 60 });
  ok(/OUTPUT PHASE LOSS/.test(B.vfdFault) && B.rm.st === 'LOCKOUT', 'open blower winding trips the VFD and locks out on airflow');
  B.reset(['cra1_coil'], 2, { pre: 60 });
  ok(!B.blowerRun && B.vfdText() === 'STOP' && B.rm.st === 'LOCKOUT', 'CRA1 coil open: drive never gets a run command');
  B.reset(['filter_dirty'], 2, { pre: 0 }); run(120);
  const df = B.analyzer(); ok(df && df.co > 300 && df.o2 < 2.5 && B.status().filterLamp, 'dirty air filter: CHANGE FILTER light, low O2, high CO');
  B.reset(['sensor_low'], 2, { pre: 300 }); ok(B.hlTrip, 'a sensor reading low overfires the boiler until the high limit trips');
  B.reset(['coupler'], 2, { pre: 30 }); ok(B.pumpRun && B.dp === 0 && B.amps('pump1') < 7, 'broken coupler: motor runs, no differential, low amps');
  B.reset(['tank_logged'], 2, { pre: 260 }); ok(B.relief === 'discharging', 'waterlogged tank lifts the relief valve, got ' + B.relief);
  /* a blown leg fuse: the pump hums, the dead leg shows about half voltage by back-feed, the overload trips */
  B.reset(['fuse_L3'], 2, { pre: 0 });
  let phantom = 0, humSeen = false, lra = false;
  for (let i = 0; i < 40; i++) { B.tick(0.25); if (B.pumpHum) { humSeen = true; phantom = Math.max(phantom, B.volts('F3_OUT', 'F1_OUT')); if (B.amps('pump3') === 0 && B.amps('pump1') > 50) lra = true; } }
  ok(humSeen, 'single-phased pump hums');
  ok(phantom > 80 && phantom < 130, 'dead leg reads a phantom ~104 V to a live leg while the motor is on, got ' + phantom.toFixed(0));
  ok(lra, 'dead leg carries no current, live legs carry locked-rotor current');
  run(30); ok(B.olTrip && !B.pumpHum, 'overload trips and drops the starter');

  out.unshift(pass + ' pass, ' + fail + ' FAIL');
  const pre = document.getElementById('out'); if (pre) pre.textContent = out.join('\n');
  window.TEST_RESULT = out.join('\n');
})();

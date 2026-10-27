/* ---- engine.js ---- */
/* ===== Hot-water boiler simulation: 120 V control circuit, 7800-series flame safeguard (on/off burner),
   water side (pump, flow, pressure, expansion tank, relief valve) and combustion (gas pressures, air, flue gas).
   Written in plain ES2017 on purpose: the classroom smartboard browser is old. ===== */

const SPEED = 2;            /* flame safeguard timers run at twice real time so a full start takes about 40 s, not 80 s */
const FLAME_MIN = 1.25;     /* flame signal (V dc at the test jacks) needed to prove flame */
const OC_SET = 180, OC_DIFF = 15, HL_SET = 210;   /* operating aquastat opens at 180 and closes at 165; manual reset high limit 210 */

/* every probe point on the panel, in the words a tech would use */
const NODES = {
  LN_L1: 'Disconnect, line side L1 (always live)', LN_N: 'Disconnect, line side neutral',
  DS_L1: 'Disconnect, load side L1', F1_IN: 'Control fuse F1, in', F1_OUT: 'Control fuse F1, out (L1 bus)',
  NB: 'Neutral bar', GND: 'Ground lug (bare metal)',
  EN_1: 'Heating call contact (building controls), in', EN_2: 'Heating call contact (building controls), out',
  PR_A: 'Pump relay PR coil, terminal A', PR_B: 'Pump relay PR coil, terminal B (neutral)',
  PR_C: 'Pump relay PR contact, common (L1 bus)', PR_NO: 'Pump relay PR contact, normally open (to pump)',
  PM_1: 'Pump motor lead 1 (from PR)', PM_2: 'Pump motor lead 2 (neutral)',
  BS_1: 'Burner switch, in', BS_2: 'Burner switch, out',
  OC_1: 'Operating aquastat, in', OC_2: 'Operating aquastat, out',
  HL_1: 'High limit (manual reset), in', HL_2: 'High limit (manual reset), out',
  LW_1: 'Low-water cutoff, in', LW_2: 'Low-water cutoff, out',
  FS_1: 'Flow switch, in', FS_2: 'Flow switch, out (to RM terminal 6)',
  LG_1: 'Low gas pressure switch, in', LG_2: 'Low gas pressure switch, out',
  HG_1: 'High gas pressure switch, in', HG_2: 'High gas pressure switch, out',
  AP_1: 'Air proving switch, common', AP_2: 'Air proving switch, normally open (to RM terminal 7)',
  RM_L1: 'Relay module L1 (power in)', RM_L2: 'Relay module L2 (neutral)',
  RM_3: 'Relay module 3 (blower motor out)', RM_4: 'Relay module 4 (alarm out)',
  RM_6: 'Relay module 6 (limits and operating control in)', RM_7: 'Relay module 7 (lockout interlock in)',
  RM_8: 'Relay module 8 (pilot valve out)', RM_9: 'Relay module 9 (main valves out)', RM_10: 'Relay module 10 (ignition out)',
  FT_P: 'Flame signal test jack + (V dc)', FT_N: 'Flame signal test jack − (common)',
  BM_1: 'Blower motor lead 1 (from RM 3)', BM_2: 'Blower motor lead 2 (neutral)',
  AL_1: 'Alarm light, from RM 4', AL_2: 'Alarm light, neutral',
  PV_1: 'Pilot valve coil, from RM 8', PV_2: 'Pilot valve coil, neutral',
  V1_1: 'Main valve V1 coil, from RM 9', V1_2: 'Main valve V1 coil, neutral',
  V2_1: 'Main valve V2 coil, from RM 9', V2_2: 'Main valve V2 coil, neutral',
  IG_1: 'Ignition transformer primary, from RM 10', IG_2: 'Ignition transformer primary, neutral'
};

/* points joined by wire (one list per wire run) */
const NETS = [
  ['LN_L1'], ['DS_L1', 'F1_IN'], ['F1_OUT', 'EN_1', 'PR_C', 'RM_L1'], ['EN_2', 'PR_A', 'BS_1'], ['PR_NO', 'PM_1'],
  ['BS_2', 'OC_1'], ['OC_2', 'HL_1'], ['HL_2', 'LW_1'], ['LW_2', 'FS_1'], ['FS_2', 'RM_6', 'LG_1'], ['LG_2', 'HG_1'], ['HG_2', 'AP_1'], ['AP_2', 'RM_7'],
  ['RM_3', 'BM_1'], ['RM_4', 'AL_1'], ['RM_8', 'PV_1'], ['RM_9', 'V1_1', 'V2_1'], ['RM_10', 'IG_1'],
  ['LN_N', 'NB', 'GND', 'PR_B', 'PM_2', 'RM_L2', 'BM_2', 'AL_2', 'PV_2', 'V1_2', 'V2_2', 'IG_2'],
  ['FT_P'], ['FT_N']
];
const NET_OF = {};
NETS.forEach((n, i) => n.forEach(x => { NET_OF[x] = i; }));

/* ---------- a small resistor-network solver: voltages with the power on, ohms with it off ---------- */
function netGroups(els) {
  const par = NETS.map((n, i) => i);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  els.forEach(e => { if (e[2] === 0) { const a = find(NET_OF[e[0]]), b = find(NET_OF[e[1]]); if (a !== b) par[a] = b; } });
  const g = NETS.map((n, i) => find(i));
  const res = els.filter(e => e[2] > 0 && e[2] < Infinity).map(e => [g[NET_OF[e[0]]], g[NET_OF[e[1]]], e[2]]).filter(e => e[0] !== e[1]);
  return { g, res };
}
function gauss(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    const t = A[c]; A[c] = A[p]; A[p] = t; const tb = b[c]; b[c] = b[p]; b[p] = tb;
    if (Math.abs(A[c][c]) < 1e-15) continue;
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; if (!f) continue; for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  return b.map((v, i) => Math.abs(A[i][i]) < 1e-15 ? 0 : v / A[i][i]);
}
function component(start, res) {
  const seen = new Set([start]), q = [start];
  while (q.length) { const x = q.pop(); res.forEach(e => { const o = e[0] === x ? e[1] : e[1] === x ? e[0] : null; if (o !== null && !seen.has(o)) { seen.add(o); q.push(o); } }); }
  return seen;
}
/* potentials (V) of every wire run; fixed = {groupNode: volts}; anything not tied to a source floats (null) */
function solveVolts(els, fixed) {
  const G = netGroups(els), V = {}, fixedG = {};
  Object.keys(fixed).forEach(id => { fixedG[G.g[NET_OF[id]]] = fixed[id]; });
  const reach = new Set();
  Object.keys(fixedG).forEach(k => component(+k, G.res).forEach(x => reach.add(x)));
  const unk = [...reach].filter(x => fixedG[x] === undefined), idx = {};
  unk.forEach((x, i) => { idx[x] = i; });
  const A = unk.map(() => unk.map(() => 0)), b = unk.map(() => 0);
  G.res.forEach(e => {
    const c = 1 / e[2];
    [[e[0], e[1]], [e[1], e[0]]].forEach(p => {
      const i = idx[p[0]]; if (i === undefined) return;
      A[i][i] += c;
      if (idx[p[1]] !== undefined) A[i][idx[p[1]]] -= c; else if (fixedG[p[1]] !== undefined) b[i] += c * fixedG[p[1]];
    });
  });
  const sol = unk.length ? gauss(A, b) : [];
  NETS.forEach((n, i) => { const g = G.g[i]; V[i] = fixedG[g] !== undefined ? fixedG[g] : idx[g] !== undefined ? sol[idx[g]] : null; });
  return V;
}
function solveOhms(els, a, b) {
  const G = netGroups(els), ga = G.g[NET_OF[a]], gb = G.g[NET_OF[b]];
  if (ga === gb) return 0.05;
  const comp = component(ga, G.res); if (!comp.has(gb)) return Infinity;
  const unk = [...comp].filter(x => x !== gb), idx = {}; unk.forEach((x, i) => { idx[x] = i; });
  const A = unk.map(() => unk.map(() => 0)), bb = unk.map(() => 0);
  G.res.forEach(e => {
    const c = 1 / e[2];
    [[e[0], e[1]], [e[1], e[0]]].forEach(p => { const i = idx[p[0]]; if (i === undefined) return; A[i][i] += c; if (idx[p[1]] !== undefined) A[i][idx[p[1]]] -= c; });
  });
  bb[idx[ga]] = 1;
  return gauss(A, bb)[idx[ga]];
}

/* ---------- the boiler ---------- */
const RM_TEXT = { OFF: 'NO POWER', INIT: 'INITIATE', STANDBY: 'STANDBY', PURGE: 'PREPURGE', PFEP: 'PILOT IGN (PFEP)', MFEP: 'MAIN IGN (MFEP)', RUN: 'RUN', POST: 'POSTPURGE', LOCKOUT: 'LOCKOUT', HOLD: 'STANDBY HOLD' };
const RM_OUT = { 3: ['PURGE', 'PFEP', 'MFEP', 'RUN', 'POST'], 8: ['PFEP', 'MFEP'], 10: ['PFEP'], 9: ['MFEP', 'RUN'], 4: ['LOCKOUT'] };

const Boiler = {
  faults: new Set(), disc: true, call: true, burnerSw: true,
  rm: null, Tb: 140, ocOpen: false, hlTrip: false, lgTrip: false, hgTrip: false, lockedOnce: false,
  pilot: false, main: false, spark: false, sig: 0, air: 0, flow: 0, dp: 0, pin: 7.2, man: 0, pilotP: 0,
  pumpRun: false, blowerRun: false, P: 18, relief: 'dry', time: 0, seed: 1, quiet: false, V: {}, en: {}, onLog: null, resetsSinceFix: 0,

  has(f) { return this.faults.has(f); },
  reset(faults, seed, opt) {
    opt = opt || {};
    this.faults = new Set(faults); this.seed = seed || 1;
    this.disc = true; this.call = true; this.burnerSw = true;
    this.rm = { st: 'OFF', t: 0, el: 0, ilk: false, hold: 0, hist: [], lock: '', runT: 0, lowSig: 0 };
    this.Tb = opt.Tb != null ? opt.Tb : 138 + (seed % 5) * 2; this.ocOpen = false; this.hlTrip = false; this.lgTrip = false; this.hgTrip = false;
    this.pilot = false; this.main = false; this.spark = false; this.sig = 0; this.air = 0; this.flow = 0; this.dp = 0;
    this.pumpRun = false; this.blowerRun = false; this.time = 0; this.resetsSinceFix = 0; this.en = {};
    this.line = 119 + (seed % 4) * 0.8;
    /* the boiler ran (or tried to) before the tech got there: play that out so the job is found as the customer left it */
    this.quiet = true;
    const pre = opt.pre != null ? opt.pre : 260;
    for (let i = 0; i < pre * 2; i++) this.tick(0.5);
    if (opt.resets) for (let r = 0; r < opt.resets; r++) { if (this.rm.st === 'LOCKOUT') this.rmReset(true); for (let i = 0; i < 120; i++) this.tick(0.5); }
    this.quiet = false; this.resetsSinceFix = 0;
  },

  /* ----- switch positions decided by the physical state ----- */
  ocClosed() { if (this.has('oc_bad')) return false; if (this.has('oc_stuck')) return true; return !this.ocOpen; },
  hlClosed() { return !this.has('hl_bad') && !this.hlTrip; },
  lowWater() { return this.has('low_water'); },
  lwClosed() { if (this.has('jmp_lwco')) return true; return !this.has('lwco_dirty') && !this.lowWater(); },
  fsClosed() { return !this.has('fs_bad') && this.flow >= 20; },
  apClosed() { if (this.has('aps_weld')) return true; return !this.has('aps_bad') && !this.has('aps_tube') && this.air >= 0.5; },
  rmPowered() { return this.rmOK() && this.vAt('RM_L1') > 90; },
  rmOK() { return !this.has('rm_bad'); },
  out(n) { const r = this.rm; return !!(r && this.rmOK() && this.lastPow && RM_OUT[n].indexOf(r.st) >= 0); },

  elements() {
    const f = this.faults, O = Infinity, sw = on => on ? 0 : O;
    return [
      ['LN_L1', 'DS_L1', sw(this.disc)], ['F1_IN', 'F1_OUT', f.has('fuse_open') ? O : 0],
      ['EN_1', 'EN_2', sw(this.call)], ['PR_A', 'PR_B', f.has('pr_coil') ? O : 380], ['PR_C', 'PR_NO', sw(this.en.pr)],
      ['PM_1', 'PM_2', f.has('pm_open') ? O : 1.3],
      ['BS_1', 'BS_2', sw(this.burnerSw)], ['OC_1', 'OC_2', sw(this.ocClosed())], ['HL_1', 'HL_2', sw(this.hlClosed())],
      ['LW_1', 'LW_2', sw(this.lwClosed())], ['FS_1', 'FS_2', sw(this.fsClosed())],
      ['LG_1', 'LG_2', sw(!this.lgTrip)], ['HG_1', 'HG_2', sw(!this.hgTrip)], ['AP_1', 'AP_2', sw(this.apClosed())],
      ['RM_L1', 'RM_L2', 3300], ['RM_6', 'RM_L2', 22000], ['RM_7', 'RM_L2', 22000],
      ['RM_L1', 'RM_3', sw(this.out(3))], ['RM_L1', 'RM_4', sw(this.out(4))], ['RM_L1', 'RM_8', sw(this.out(8))], ['RM_L1', 'RM_9', sw(this.out(9))], ['RM_L1', 'RM_10', sw(this.out(10))],
      ['BM_1', 'BM_2', f.has('blower_open') ? O : 1.9], ['AL_1', 'AL_2', 150], ['PV_1', 'PV_2', f.has('pv_open') ? O : 640],
      ['V1_1', 'V1_2', f.has('v1_open') ? O : 1150], ['V2_1', 'V2_2', f.has('v2_open') ? O : 1150], ['IG_1', 'IG_2', f.has('ig_open') ? O : 2.2]
    ];
  },
  solve() { this.V = solveVolts(this.elements(), { LN_L1: this.line, LN_N: 0 }); },
  vAt(id) { const v = this.V[NET_OF[id]]; return v == null ? null : v; },
  across(a, b) { const x = this.vAt(a), y = this.vAt(b); if (x == null || y == null) return 0; return Math.abs(x - y); },
  volts(a, b) {
    if (a === 'FT_P' || a === 'FT_N' || b === 'FT_P' || b === 'FT_N') return 0;
    return this.across(a, b);
  },
  dcVolts(a, b) {
    const pair = [a, b].sort().join();
    if (pair === 'FT_N,FT_P') { const s = this.rmPowered() ? this.sig : 0; return a === 'FT_P' ? s : -s; }
    return 0;
  },
  ohms(a, b) {
    if (a === 'FT_P' || a === 'FT_N' || b === 'FT_P' || b === 'FT_N') return [a, b].sort().join() === 'FT_N,FT_P' ? 1e6 : Infinity;
    return solveOhms(this.elements(), a, b);
  },

  /* ----- one step of time (seconds) ----- */
  tick(dt) {
    this.time += dt;
    const f = this.faults;
    for (let k = 0; k < 2; k++) {        /* settle: relay coils pull in, then their contacts change the circuit */
      this.solve();
      this.lastPow = this.rmOK() && (this.vAt('RM_L1') || 0) > 90;
      this.en.pr = this.across('PR_A', 'PR_B') > 85 && !f.has('pr_coil');
    }
    const on = (a, b) => this.across(a, b) > 90;
    const pumpV = on('PM_1', 'PM_2'), blowV = on('BM_1', 'BM_2');
    this.en.pumpV = pumpV; this.en.blowV = blowV;
    this.en.pv = on('PV_1', 'PV_2') && !f.has('pv_open');
    this.en.v1 = on('V1_1', 'V1_2') && !f.has('v1_open');
    this.en.v2 = on('V2_1', 'V2_2') && !f.has('v2_open');
    this.en.ig = on('IG_1', 'IG_2') && !f.has('ig_open');
    this.en.alarm = on('AL_1', 'AL_2');

    /* water side */
    this.pumpRun = pumpV && !f.has('pm_open');
    let flow = 0, dp = 0;
    if (this.pumpRun) {
      if (f.has('coupler')) { flow = 0; dp = 0; }
      else if (f.has('iso_closed')) { flow = 0; dp = 13.8; }
      else if (f.has('air_bound')) { const w = Math.sin(this.time * 0.9) * 0.5 + Math.sin(this.time * 2.3) * 0.5; flow = 13 + 10 * w; dp = 2.2 + 1.4 * w; }
      else if (f.has('strainer')) { flow = 38; dp = 12.6; }
      else { flow = 80; dp = 9.4; }
    }
    this.flow = flow; this.dp = dp;

    /* air: blower static pressure at the air switch port, in. w.c. */
    this.blowerRun = blowV && !f.has('blower_open');
    this.air = this.blowerRun ? (f.has('blower_dirty') ? 0.62 : 1.40) : 0;

    /* gas pressures, in. w.c. */
    const firing = this.main;
    this.pin = f.has('gas_closed') ? 0 : f.has('gas_low') ? (firing ? 2.4 : 3.0) : (firing ? 6.6 : 7.2);
    if (this.pin < 3.5) this.lgTrip = true;
    const mainOpen = this.en.v1 && this.en.v2;
    this.man = mainOpen && this.pin > 0.3 ? Math.min(this.pin - 0.2, f.has('reg_high') ? 6.2 : f.has('reg_low') ? 1.6 : 3.5) : 0;
    if (this.man > 5.0) this.hgTrip = true;
    this.pilotP = this.en.pv && this.pin > 0.3 && !f.has('pilot_cock') ? 3.0 : 0;

    /* flame */
    this.spark = this.en.ig && !f.has('electrode');
    const pilotGas = this.pilotP > 1;
    this.pilot = pilotGas && (this.spark || this.pilot);
    this.main = mainOpen && this.man > 0.8 && (this.pilot || this.main) && this.blowerRun;
    let s = 0;
    if (this.main) s = f.has('linkage') ? 2.1 : f.has('reg_low') ? 2.4 : 3.9;
    if (this.pilot) s = this.main ? s + 0.3 : 2.6;
    if (f.has('lens_dirty')) s *= 0.35;
    if (f.has('scanner_bad') || f.has('amp_bad')) s = 0;
    s = s ? Math.min(5, s * (1 + Math.sin(this.time * 1.7) * 0.03)) : 0;
    this.sig = s;

    this.rmStep(dt * SPEED);

    /* boiler water temperature: burner heat in, building load out */
    const qIn = this.main ? (f.has('reg_low') ? 680 : 1000) * this.eff() / 100 : 0;
    const qLoad = (this.flow > 5 ? 450 * Math.min(1, this.flow / 60) : 25) * Math.max(0, this.Tb - 70) / 110;
    this.qLoad = qLoad;
    this.Tb += (qIn - qLoad) / 509 * dt;
    if (this.Tb >= OC_SET) this.ocOpen = true; else if (this.Tb <= OC_SET - OC_DIFF) this.ocOpen = false;
    if (this.Tb >= HL_SET && !f.has('hl_bad')) { if (!this.hlTrip) this.note('High limit tripped at ' + Math.round(this.Tb) + '°F.'); this.hlTrip = true; }

    /* system pressure: cold fill plus expansion; a waterlogged tank lets it climb to the relief valve */
    const base = this.lowWater() ? 3.2 : 12;
    let P = base + (this.Tb - 70) * (f.has('tank_logged') ? 0.32 : 0.075);
    this.relief = 'dry';
    if (P >= 30) { P = 30 + (P - 30) * 0.05; this.relief = 'discharging'; }
    else if (f.has('relief_bad') && P > 19) this.relief = 'dripping';
    this.P = P;
  },
  eff() { const f = this.faults; return f.has('tubes_soot') ? 76.8 : f.has('linkage') ? 77.5 : f.has('blower_dirty') ? 80.6 : f.has('reg_low') ? 80.2 : 82.1; },
  note(m) { if (!this.quiet && this.onLog) this.onLog(m); },

  /* ----- the flame safeguard ----- */
  rmStep(d) {
    const r = this.rm, pow = this.rmOK() && (this.vAt('RM_L1') || 0) > 90;
    const t6 = (this.vAt('RM_6') || 0) > 90, t7 = (this.vAt('RM_7') || 0) > 90, flame = this.sig >= FLAME_MIN;
    const go = (st, t) => { r.st = st; r.t = t || 0; r.el = 0; r.ilk = false; r.hold = 0; };
    const lock = msg => { r.hist.unshift({ msg, at: RM_TEXT[r.st] }); r.hist = r.hist.slice(0, 6); r.lock = msg; go('LOCKOUT'); this.note('Flame safeguard LOCKOUT: ' + msg); };
    if (!pow) { if (r.st !== 'LOCKOUT') go('OFF'); return; }
    r.t -= d; r.el += d;
    switch (r.st) {
      case 'OFF': go('INIT', 10); break;
      case 'INIT': if (r.t <= 0) go('STANDBY'); break;
      case 'STANDBY': case 'HOLD':
        if (flame) { r.st = 'HOLD'; r.hold += d; if (r.hold > 30) lock('Flame signal with no call for burner (flame detected out of sequence)'); break; }
        if (t6 && t7) { r.st = 'HOLD'; r.hold += d; if (r.hold > 30) lock('Lockout interlock closed before the blower started (airflow switch made in standby)'); break; }
        if (r.st === 'HOLD') { r.st = 'STANDBY'; r.hold = 0; }
        if (t6) go('PURGE', 30);
        break;
      case 'PURGE':
        if (!t6) { go('STANDBY'); break; }
        if (t7) r.ilk = true;
        else if (r.ilk) { lock('Lockout interlock opened during prepurge'); break; }
        else if (r.el > 10) { lock('Lockout interlock did not prove in prepurge (airflow / gas pressure switches)'); break; }
        if (flame) { lock('Flame signal during prepurge'); break; }
        if (r.t <= 0 && r.ilk) go('PFEP', 10);
        break;
      case 'PFEP':
        if (!t6) { go('POST', 15); break; }
        if (!t7) { lock('Lockout interlock opened during pilot ignition'); break; }
        if (r.t <= 0) { if (flame) go('MFEP', 10); else lock('Pilot flame fail (PFEP): no flame proven at end of pilot trial'); }
        break;
      case 'MFEP':
        if (!t6) { go('POST', 15); break; }
        if (!t7) { lock('Lockout interlock opened during main ignition'); break; }
        if (!flame) { lock('Flame fail during main flame establishing period (MFEP)'); break; }
        if (r.t <= 0) { go('RUN'); r.runT = 0; r.lowSig = 0; }
        break;
      case 'RUN':
        r.runT += d;
        if (!t6) { go('POST', 15); break; }
        if (!t7) { lock('Lockout interlock opened while running (airflow / gas pressure)'); break; }
        if (!flame) { r.lowSig += d; if (r.lowSig >= 1.5) { lock(r.runT < 6 ? 'Main flame did not prove at end of MFEP (main flame ignition)' : 'Main flame fail (RUN)'); break; } } else r.lowSig = 0;
        break;
      case 'POST': if (r.t <= 0) go('STANDBY'); break;
      case 'LOCKOUT': break;
    }
  },
  rmReset(silent) {
    const r = this.rm;
    if (r.st !== 'LOCKOUT') return false;
    if (!this.rmOK() || (this.vAt('RM_L1') || 0) < 90) return false;
    r.st = 'INIT'; r.t = 10; r.el = 0; r.lock = '';
    if (!silent) this.resetsSinceFix++;
    return true;
  },

  /* ----- readings for the tools ----- */
  amps(where) {
    const j = v => v * (1 + Math.sin(this.time * 3.1) * 0.01), f = this.faults;
    const pump = !this.pumpRun ? 0 : f.has('coupler') ? 3.6 : f.has('iso_closed') ? 6.9 : f.has('air_bound') ? 6.0 + Math.sin(this.time * 0.9) * 0.8 : f.has('strainer') ? 8.3 : 10.2;
    const blow = this.blowerRun ? (f.has('blower_dirty') ? 4.5 : 5.8) : 0;
    const ign = this.en.ig ? 1.3 : 0, pv = this.en.pv ? 0.19 : 0, mv = (this.en.v1 ? 0.1 : 0) + (this.en.v2 ? 0.1 : 0), al = this.en.alarm ? 0.35 : 0;
    const prc = this.en.pr ? 0.06 : 0, rmc = this.lastPow ? 0.04 : 0;
    const m = { pump, blower: blow, ign, line: pump + blow + ign + pv + mv + al + prc + rmc };
    return j(m[where] || 0);
  },
  analyzer() {
    if (!this.main) return null;
    const f = this.faults;
    let o2 = 4.5, co = 35, st = 405;
    if (f.has('blower_dirty')) { o2 = 1.2; co = 780; st = 430; }
    if (f.has('linkage')) { o2 = 9.4; co = 18; st = 440; }
    if (f.has('tubes_soot')) { o2 = Math.min(o2, 4.3); co = Math.max(co, 62); st = 575; }
    if (f.has('reg_low')) { o2 = 8.1; co = 25; st = 330; }
    const co2 = (20.9 - o2) / 20.9 * 11.7;
    const coAF = co * 20.9 / (20.9 - o2);
    const w = 1 + Math.sin(this.time * 1.3) * 0.02;
    return { o2: o2 * w, co: Math.round(co * w), co2, coAF: Math.round(coAF * w), stack: Math.round(st * (1 + Math.sin(this.time) * 0.004)), eff: this.eff(), draft: -0.02 };
  },
  returnT() { if (this.flow < 5) return this.Tb - 25; return this.Tb - Math.min(60, (this.qLoad || 0) * 1000 / (500 * this.flow)); },
  status() {
    const f = this.faults;
    return {
      rm: this.rm.st, flame: this.main ? 'main' : this.pilot ? 'pilot' : this.spark ? 'spark' : 'none',
      blower: this.blowerRun ? 'run' : this.en.blowV ? 'hum' : 'off',
      pump: this.pumpRun ? 'run' : this.en.pumpV ? 'hum' : 'off',
      alarm: this.en.alarm, Tb: this.Tb, P: this.P, Tr: this.returnT(), relief: this.relief,
      lwLamp: this.lastPow !== undefined && (this.vAt('F1_OUT') || 0) > 90 && (f.has('lwco_dirty') || this.lowWater()),
      hlTrip: this.hlTrip, lgTrip: this.lgTrip, hgTrip: this.hgTrip
    };
  },
  healthy() {
    return this.faults.size === 0 && !this.hlTrip && !this.lgTrip && !this.hgTrip && this.rm.st === 'RUN' && this.rm.runT > 4;
  }
};

/* ---- parts.js ---- */
/* ===== Parts counter: every part or action a trainee can pick, and which fault each one cures ===== */
const PARTS = {
  fuse:      { name: 'Control fuse F1 (10 A)', g: 'Power and controls' },
  prelay:    { name: 'Pump relay PR (120 V coil)', g: 'Power and controls' },
  oc:        { name: 'Operating aquastat', g: 'Power and controls' },
  hl:        { name: 'High limit aquastat (manual reset)', g: 'Power and controls' },
  hlreset:   { name: 'Press the reset button on the high limit', g: 'Power and controls', live: true, reset: 'hl' },
  rm:        { name: 'Flame safeguard relay module', g: 'Flame safeguard' },
  amp:       { name: 'Flame amplifier (plug-in card)', g: 'Flame safeguard' },
  scanner:   { name: 'UV flame scanner', g: 'Flame safeguard' },
  scanclean: { name: 'Clean the flame scanner lens and sight tube', g: 'Flame safeguard' },
  ignx:      { name: 'Ignition transformer', g: 'Burner' },
  electrode: { name: 'Ignition electrode (set the gap)', g: 'Burner' },
  pilotv:    { name: 'Pilot gas valve', g: 'Burner' },
  pilotcock: { name: 'Open the pilot gas cock', g: 'Burner', live: true },
  blower:    { name: 'Burner blower motor', g: 'Burner' },
  blowclean: { name: 'Clean the blower wheel and air inlet', g: 'Burner' },
  aps:       { name: 'Air proving switch', g: 'Burner' },
  apstube:   { name: 'Air proving switch sensing tube', g: 'Burner' },
  linkage:   { name: 'Reset the air damper linkage (combustion setup)', g: 'Burner', live: true },
  tubes:     { name: 'Brush the fire tubes and clean the flue passages', g: 'Burner' },
  gascock:   { name: 'Open the main manual gas valve', g: 'Gas train', live: true },
  gasutil:   { name: 'Call the gas utility about low supply pressure', g: 'Gas train', live: true },
  gasreg:    { name: 'Main gas pressure regulator', g: 'Gas train' },
  lgps:      { name: 'Low gas pressure switch', g: 'Gas train' },
  lgpsreset: { name: 'Press the reset button on the low gas pressure switch', g: 'Gas train', live: true, reset: 'lg' },
  hgpsreset: { name: 'Press the reset button on the high gas pressure switch', g: 'Gas train', live: true, reset: 'hg' },
  mainv1:    { name: 'Main gas valve V1 (actuator / coil)', g: 'Gas train' },
  mainv2:    { name: 'Main gas valve V2 (actuator / coil)', g: 'Gas train' },
  pump:      { name: 'Circulating pump motor', g: 'Water side' },
  coupler:   { name: 'Pump coupler', g: 'Water side' },
  isoopen:   { name: 'Open the pump isolation valves', g: 'Water side', live: true },
  purgeair:  { name: 'Purge air from the system (vents and purge valve)', g: 'Water side', live: true },
  strainer:  { name: 'Clean the pump suction strainer', g: 'Water side' },
  flowsw:    { name: 'Flow switch', g: 'Water side' },
  lwcoclean: { name: 'Clean the low-water cutoff probe', g: 'Water side' },
  fillopen:  { name: 'Open the make-up water valve and fill the system', g: 'Water side', live: true },
  exptank:   { name: 'Expansion tank (drain, recharge air to fill pressure)', g: 'Water side' },
  relief:    { name: 'Pressure relief valve', g: 'Water side' },
  jmplwco:   { name: 'Remove jumper: low-water cutoff', g: 'Remove a jumper', jumper: true }
};
const FIXES = {
  fuse_open: 'fuse', pr_coil: 'prelay', oc_bad: 'oc', oc_stuck: 'oc', hl_bad: 'hl', rm_bad: 'rm', amp_bad: 'amp', scanner_bad: 'scanner',
  lens_dirty: 'scanclean', ig_open: 'ignx', electrode: 'electrode', pv_open: 'pilotv', pilot_cock: 'pilotcock', blower_open: 'blower',
  blower_dirty: 'blowclean', aps_bad: 'aps', aps_weld: 'aps', aps_tube: 'apstube', linkage: 'linkage', tubes_soot: 'tubes',
  gas_closed: 'gascock', gas_low: 'gasutil', reg_high: 'gasreg', reg_low: 'gasreg', v1_open: 'mainv1', v2_open: 'mainv2',
  pm_open: 'pump', coupler: 'coupler', iso_closed: 'isoopen', air_bound: 'purgeair', strainer: 'strainer', fs_bad: 'flowsw',
  lwco_dirty: 'lwcoclean', low_water: 'fillopen', tank_logged: 'exptank', relief_bad: 'relief', jmp_lwco: 'jmplwco'
};
const PART_GROUPS = ['Power and controls', 'Flame safeguard', 'Burner', 'Gas train', 'Water side', 'Remove a jumper'];

/* what a tech finds when they look closely at a part (unit picture). Only the clicked part tells anything */
function inspectText(k, B) {
  const f = B.faults, off = !B.disc;
  const T = {
    burner: () => 'Burner head and blower housing. ' + (B.blowerRun ? 'The blower is running.' : 'The blower is stopped.'),
    blower: () => !off ? 'Open the disconnect before you reach into the blower housing.' : f.has('blower_dirty') ? 'The blower wheel blades are packed with lint and dust, and the air inlet screen is matted over.' : 'The blower wheel is clean and spins freely by hand. The inlet screen is clear.',
    damper: () => f.has('linkage') ? 'The air damper is much further open than the paint mark on the shaft. The linkage set screw is loose.' : 'The air damper lines up with the paint mark on its shaft. The linkage is tight.',
    aps: () => f.has('aps_tube') ? 'The sensing tube from the blower housing to the switch is cracked through at a tight bend.' : 'The sensing tube is soft and whole, pushed fully on both barbs. Setpoint 0.5 in. w.c.',
    sight: () => B.main ? 'Through the sight glass: a steady main flame' + (f.has('linkage') ? ', short and lifting off the burner head, very blue.' : f.has('blower_dirty') ? ', long, lazy and yellow-tipped.' : ', blue with a firm shape.') : B.pilot ? 'Through the sight glass: a pilot flame.' : B.spark ? 'Through the sight glass: a spark snapping at the pilot, but no flame.' : 'Through the sight glass: dark.',
    scanner: () => !off ? 'Open the disconnect before you pull the scanner.' : f.has('lens_dirty') ? 'The scanner lens and sight tube are coated with a grey-brown film.' : 'The scanner lens is clear and the sight tube is clean.',
    electrode: () => !off ? 'Open the disconnect before you pull the pilot assembly.' : f.has('electrode') ? 'The electrode porcelain has a hairline crack, with a black carbon track across it.' : 'The electrode porcelain is clean and whole. Gap is about 1/8 inch.',
    ignx: () => 'Ignition transformer, 120 V primary, 6,000 V secondary.' + (B.en.ig ? ' It is buzzing.' : ''),
    pilotcock: () => f.has('pilot_cock') ? 'The pilot gas cock handle is across the pipe.' : 'The pilot gas cock handle is in line with the pipe.',
    gascock: () => f.has('gas_closed') ? 'The main manual gas valve handle is across the pipe.' : 'The main manual gas valve handle is in line with the pipe.',
    lgps: () => 'Low gas pressure switch, set at 3.5 in. w.c., manual reset. ' + (B.lgTrip ? 'The reset button is popped out.' : 'The reset button is in.'),
    hgps: () => 'High gas pressure switch, set at 5.0 in. w.c., manual reset. ' + (B.hgTrip ? 'The reset button is popped out.' : 'The reset button is in.'),
    reg: () => 'Main gas pressure regulator. The vent is clear.',
    v1: () => 'Main gas valve V1 actuator. ' + (B.en.v1 ? 'The OPEN indicator shows.' : 'The indicator shows CLOSED.'),
    v2: () => 'Main gas valve V2 actuator. ' + (B.en.v2 ? 'The OPEN indicator shows.' : 'The indicator shows CLOSED.'),
    pv: () => 'Pilot solenoid valve. ' + (B.en.pv ? 'It is warm and humming.' : 'It is quiet.'),
    pump: () => B.pumpRun ? (f.has('coupler') ? 'The pump motor is running. The coupler guard is warm. Through the guard slots the motor shaft spins but the pump shaft does not.' : f.has('air_bound') ? 'The pump is running and you can hear gravel-like rattling in the volute.' : 'The pump is running smoothly.') : B.en.pumpV ? 'The pump motor hums but does not turn. Hot to the touch.' : 'The pump is stopped.',
    coupler: () => !off ? 'Open the disconnect before you take the coupler guard off.' : f.has('coupler') ? 'With the guard off: the rubber coupler insert is shredded. The motor half spins free.' : 'With the guard off: the coupler is whole and tight.',
    iso: () => f.has('iso_closed') ? 'The suction isolation valve handle is across the pipe.' : 'Both pump isolation valves have their handles in line with the pipe.',
    strainer: () => 'Y-strainer on the pump suction. ' + (off && f.has('strainer') ? 'With the cap off: the basket is packed with scale and debris.' : off ? 'With the cap off: the basket is clean.' : 'Isolate and shut off the pump before you open it.'),
    fs: () => 'Paddle flow switch on the supply pipe. Closes at about 20 gpm.',
    lwco: () => (B.status().lwLamp ? 'The LOW WATER light is on. ' : 'The LOW WATER light is off. ') + (off && f.has('lwco_dirty') ? 'With the probe pulled: it is thick with scale and sludge.' : off ? 'With the probe pulled: it is clean.' : 'Probe-type low-water cutoff.'),
    gauge: () => 'Boiler pressure/temperature gauge: ' + B.P.toFixed(0) + ' psi, ' + Math.round(B.Tb) + '°F.',
    relief: () => 'Pressure relief valve, set at 30 psi. ' + (B.relief === 'discharging' ? 'Water is pouring out of the discharge pipe onto the floor.' : B.relief === 'dripping' ? 'The discharge pipe is dripping steadily.' : 'The discharge pipe is dry.'),
    exptank: () => off && f.has('tank_logged') ? 'Tapped along its side, the tank sounds full of water top to bottom. A drop of water comes out of the air valve.' : off ? 'Tapped along its side, the top half sounds hollow. The air valve gives air.' : 'Diaphragm expansion tank. Tap it or check the air charge with the system pressure off it.',
    fill: () => f.has('low_water') ? 'The make-up water valve is closed. The pressure-reducing fill valve is set at 12 psi.' : 'The make-up water valve is open. The pressure-reducing fill valve is set at 12 psi.',
    vent: () => 'Automatic air vent on the air separator. ' + (f.has('air_bound') ? 'It hisses air when you push the cap.' : 'Quiet.'),
    stack: () => 'Flue outlet and the analyzer test port.',
    tubes: () => !off ? 'Open the disconnect before you open the boiler door.' : f.has('tubes_soot') ? 'With the rear door open: the fire tubes are lined with soft black soot.' : 'With the rear door open: the fire tubes are clean.',
    rm: () => 'Flame safeguard relay module with keyboard display. ' + (B.rmOK() ? '' : 'The display and all LEDs are dark.'),
    alarm: () => B.en.alarm ? 'The red alarm light is on.' : 'The alarm light is off.',
    jumper: () => f.has('jmp_lwco') ? 'In the control cabinet, a short wire jumper is screwed across the two low-water cutoff terminals.' : 'No jumpers on the safety terminals.'
  };
  return T[k] ? T[k]() : '';
}

/* ---- levels.js ---- */
/* ===== Twenty service calls, from the basics to compound faults. Tickets are in the customer's words and never name the part.
   cust: answers to the questions in "Talk to the customer". pre: seconds the boiler ran before you arrived. resets: times the
   customer already pushed the reset button. ===== */
const RANKS = ['Apprentice', 'Apprentice', 'Apprentice', 'Apprentice', 'Apprentice', 'Journeyman', 'Journeyman', 'Journeyman', 'Journeyman', 'Journeyman',
  'Journeyman', 'Journeyman', 'Journeyman', 'Journeyman', 'Senior tech', 'Senior tech', 'Senior tech', 'Senior tech', 'Senior tech', 'Senior tech'];
const LEVELS = [
  { id: 1, title: 'Dead quiet', site: 'Bldg 114, Motor Pool office', faults: ['fuse_open'], par: 6,
    ticket: 'Nothing is running in the boiler room. No lights on the boiler, no hum, nothing. The offices are getting cold.',
    cust: { when: 'Sometime overnight. It was fine at close of business.', work: 'Nobody has touched it in months.', lights: 'No lights at all on the burner panel. Usually there is a green one.', noise: 'It is completely silent in there.' },
    hints: ['Start at the disconnect. Is there 120 V on the line side and the load side?', 'Follow L1 into the panel. Read across the control fuse with the power on.', 'Voltage across a fuse with the power on means the fuse is open. Confirm with ohms, power off.'] },
  { id: 2, title: 'Pump will not start', site: 'Bldg 207, Dental Clinic', faults: ['pr_coil'], par: 8,
    ticket: 'The boiler is not firing and the pipes in the mechanical room are cold. The building controls show heat is on.',
    cust: { when: 'This morning. The front desk noticed the cold first.', work: 'No work done.', lights: 'The burner display just says STANDBY.', noise: 'Very quiet. Usually you can hear the pump.' },
    hints: ['The burner waits for the flow switch, and the flow switch waits for the pump. Is the pump running?', 'Check for 120 V across the pump relay coil, then across its contacts.', 'Coil has 120 V across it but the contacts never close: ohm the coil with the power off.'] },
  { id: 3, title: 'Pump runs, burner waits', site: 'Bldg 31, Chapel annex', faults: ['oc_bad'], par: 8,
    ticket: 'The pump is running but the boiler never lights. The water gauge says it is barely warm.',
    cust: { when: 'Two days ago it started taking longer to warm up, then today it just stopped heating.', work: 'Nobody has been in there.', lights: 'The screen on the burner says STANDBY.', noise: 'Just the pump.' },
    hints: ['In STANDBY the relay module is waiting for terminal 6. Measure terminal 6 to neutral.', 'Walk the limit string from the burner switch to terminal 6. Where does the 120 V stop?', 'The water is far below the 180°F setpoint, so the operating control should be closed.'] },
  { id: 4, title: 'Red light after the gas work', site: 'Bldg 9, Headquarters', faults: ['gas_closed'], par: 7, resets: 1,
    ticket: 'The gas company was working on the meter yesterday. Now the boiler has a red light on and will not stay on. We pushed the reset once.',
    cust: { when: 'Since the gas crew left yesterday afternoon.', work: 'The gas company swapped the building meter.', lights: 'A red alarm light, and the screen says LOCKOUT.', noise: 'The fan ran for a little while after we pushed reset, then it stopped again.' },
    hints: ['Read the lockout message on the keyboard display. What does it name?', 'The lockout interlock string runs through the gas pressure switches and the air switch. Find where 120 V stops between terminal 6 and terminal 7.', 'Put the manometer on the gas inlet port. What is the supply pressure?'] },
  { id: 5, title: 'Click, click, no fire', site: 'Bldg 52, Barracks B', faults: ['ig_open'], par: 9, resets: 1,
    ticket: 'The boiler starts its fan, waits, then gives up with an alarm. Showers are lukewarm.',
    cust: { when: 'Early this morning.', work: 'Nothing.', lights: 'Red alarm light. The screen says something about pilot.', noise: 'The fan runs for a while, then nothing.' },
    hints: ['Reset and watch the sequence. During pilot ignition, look through the sight glass. Is there a spark?', 'During PFEP, read terminal 10 to neutral and across the ignition transformer primary.', '120 V across the primary and no spark: ohm the primary with the power off.'] },
  { id: 6, title: 'Spark but no pilot', site: 'Bldg 52, Barracks C', faults: ['pv_open'], par: 9, resets: 2,
    ticket: 'Same as the other barracks last week: alarm light, no heat. Our building manager pushed reset twice.',
    cust: { when: 'Last night.', work: 'No one has worked on it.', lights: 'Red light, the display says pilot flame fail.', noise: 'You can hear a ticking during start, then it stops.' },
    hints: ['During pilot ignition there is a spark but no flame. Is gas getting to the pilot? Check the pilot pressure.', 'Read terminal 8 to neutral during PFEP, and across the pilot valve coil.', '120 V at the pilot valve and no pilot gas: ohm the coil.'] },
  { id: 7, title: 'Flame you can see', site: 'Bldg 340, Gym', faults: ['lens_dirty'], par: 8, resets: 1,
    ticket: 'The boiler tries to light and you can actually see a little flame through the window, but then it shuts off and alarms.',
    cust: { when: 'It has done it on and off for a week, now every time.', work: 'Nothing.', lights: 'Red alarm. The screen says pilot flame fail.', noise: 'Normal start-up noises, then it shuts off.' },
    hints: ['A flame is there but the relay module does not believe it. What does the flame signal read in DC volts?', 'Normal pilot signal is 2 V dc or more. Minimum to prove flame is 1.25 V.', 'Low signal with a good flame: look at what the scanner looks through.'] },
  { id: 8, title: 'Fan runs, no prove', site: 'Bldg 18, Supply warehouse', faults: ['aps_bad'], par: 8, resets: 1,
    ticket: 'The boiler fan comes on and then it alarms within a few seconds. No heat in the warehouse office.',
    cust: { when: 'This morning.', work: 'No.', lights: 'Red light. Display says lockout something interlock.', noise: 'Fan runs, then quits.' },
    hints: ['The lockout says the interlock did not prove in prepurge. Which switches are in that string?', 'With the blower running, read the blower static pressure at the air switch port.', 'Good air pressure at the switch, but 120 V across its contacts with the blower running.'] },
  { id: 9, title: 'Hot smell from the burner', site: 'Bldg 405, Clinic', faults: ['blower_open'], par: 9, resets: 1,
    ticket: 'There was a hot electrical smell near the burner and now it has an alarm light. We did not touch anything else.',
    cust: { when: 'Around noon.', work: 'No work done.', lights: 'Red alarm light.', noise: 'It was humming loud before it quit. Now it is quiet.' },
    hints: ['During prepurge, is the blower turning?', 'Read terminal 3 to neutral, then across the blower motor leads.', 'Voltage is there and the motor does not run: ohm the motor, power off.'] },
  { id: 10, title: 'Pilot lights, main does not', site: 'Bldg 77, Dining facility', faults: ['v1_open'], par: 10, resets: 1,
    ticket: 'The boiler lights a little flame, then shuts down with an alarm. The kitchen needs hot water for the noon meal.',
    cust: { when: 'Since breakfast.', work: 'No.', lights: 'Red alarm. Something about main flame.', noise: 'A puff of a start, then it goes off.' },
    hints: ['The pilot proves. The main flame never lights. What does the main gas valve need?', 'During MFEP read terminal 9 to neutral, then across each main valve coil.', 'Both valves are in series in the gas line: if one does not open, no gas reaches the burner. Isolate each coil before you ohm it.'] },
  { id: 11, title: 'After the leak repair', site: 'Bldg 2, Family housing office', faults: ['low_water'], par: 6,
    ticket: 'A plumber fixed a leaking radiator valve upstairs yesterday. Today there is no heat at all.',
    cust: { when: 'This morning.', work: 'A plumber drained down part of the system and fixed a valve on the second floor.', lights: 'There is a light that says LOW WATER on a box on the side of the boiler.', noise: 'The pump is running.' },
    hints: ['What is the boiler pressure gauge reading? Cold fill is about 12 psi.', 'A probe-type low-water cutoff opens the limit string when the water drops below its probe.', 'After water is drained, it has to be put back.'] },
  { id: 12, title: 'Low water, full boiler', site: 'Bldg 60, Fire station', faults: ['lwco_dirty'], par: 8,
    ticket: 'The boiler says low water, but the pressure gauge looks normal. We added water anyway and nothing changed.',
    cust: { when: 'Yesterday.', work: 'We opened the water feed for a minute. The gauge went a little higher.', lights: 'LOW WATER light on.', noise: 'Pump runs. Burner never starts.' },
    hints: ['Is the boiler really low? Check the pressure gauge against the cold fill pressure.', 'Measure across the low-water cutoff contacts.', 'A probe senses water by conducting through it. What happens when it is coated?'] },
  { id: 13, title: 'Pump hums along, no heat', site: 'Bldg 115, Training center', faults: ['coupler'], par: 9,
    ticket: 'We hear the pump motor running, but the boiler will not fire and the building is cold.',
    cust: { when: 'This morning after the weekend.', work: 'No.', lights: 'Screen says STANDBY.', noise: 'The pump sounds louder than normal. Kind of a rattle.' },
    hints: ['The burner is waiting on terminal 6. Walk the limit string.', 'The flow switch is open. Is the pump actually moving water? Check the pump differential pressure.', 'Clamp the pump motor. Running current far below nameplate means the motor is not loaded.'] },
  { id: 14, title: 'After the pump service', site: 'Bldg 115, Training center', faults: ['iso_closed'], par: 8,
    ticket: 'A contractor rebuilt our pump yesterday. It is running but the building never heats up.',
    cust: { when: 'Since the pump was put back together.', work: 'The pump was rebuilt by a contractor.', lights: 'Screen says STANDBY.', noise: 'The pump runs.' },
    hints: ['Is water moving? Check the pump differential pressure.', 'A pump that runs at shutoff head shows high differential and low current.', 'Something on the pump piping is not where it should be after the service.'] },
  { id: 15, title: 'Gurgling and short cycling', site: 'Bldg 3, Recruiting office', faults: ['air_bound'], par: 10,
    ticket: 'The boiler keeps starting and stopping and there is a gurgling noise in the pipes. Some rooms are cold.',
    cust: { when: 'Since the system was drained and refilled for a valve change last week.', work: 'A valve was changed and the system was refilled.', lights: 'No alarms. It just keeps cycling.', noise: 'Gurgling in the pipes and a rattle at the pump.' },
    hints: ['Watch the flow switch and the pump differential over time. Is it steady?', 'Low, swinging pump differential and low amps: the pump is not full of water.', 'After a refill the air has to go somewhere.'] },
  { id: 16, title: 'Water on the floor', site: 'Bldg 220, Admin', faults: ['tank_logged'], par: 8,
    ticket: 'There is water on the boiler room floor every morning. The boiler seems to heat fine.',
    cust: { when: 'Over the last two weeks, getting worse.', work: 'No work.', lights: 'No alarm lights.', noise: 'Sometimes a hiss and a splash.' },
    hints: ['Watch the pressure gauge as the water heats up.', 'Normal system pressure rises only a few psi from cold to 180°F. This one climbs to the relief setting.', 'What in the system takes up the water as it expands?'] },
  { id: 17, title: 'Too hot, then nothing', site: 'Bldg 41, Medical logistics', faults: ['oc_stuck'], par: 10, pre: 300,
    ticket: 'Yesterday the radiators were too hot to touch. Today the boiler is off and the building is cooling down.',
    cust: { when: 'It got very hot yesterday afternoon, then off this morning.', work: 'No.', lights: 'The burner display says STANDBY.', noise: 'Some banging in the pipes yesterday when it was hot.' },
    hints: ['Walk the limit string. Which control has opened?', 'A manual reset high limit only trips when the water gets too hot. Why did it get that hot?', 'The operating control should have stopped the burner at 180°F. Watch it after you reset the high limit.'] },
  { id: 18, title: 'Trips while running', site: 'Bldg 9, Headquarters', faults: ['reg_high'], par: 10, resets: 1,
    ticket: 'The boiler starts, runs for a few seconds and then shuts down with an alarm. The gas company says our supply is fine.',
    cust: { when: 'Since yesterday.', work: 'No.', lights: 'Red light. Lockout.', noise: 'It lights with a louder roar than usual, then shuts off.' },
    hints: ['Read the lockout history. When in the sequence does it trip?', 'Check the gas pressure switches. One has a popped reset button.', 'Put the manometer on the manifold port during a start. What should manifold pressure be?'] },
  { id: 19, title: 'Exhaust smell', site: 'Bldg 500, Child development center', faults: ['blower_dirty'], par: 8,
    ticket: 'Staff noticed an exhaust smell near the boiler room door and the boiler window is getting dark. The heat is working.',
    cust: { when: 'The smell started this week.', work: 'Nobody has cleaned anything in there for a long time.', lights: 'No alarm.', noise: 'Sounds normal.' },
    hints: ['The boiler runs. This job is about combustion. Use the analyzer in the stack.', 'Low O2 and high CO mean not enough air for the gas.', 'Check the blower static pressure, then look at what moves the air.'] },
  { id: 20, title: 'Someone got it running', site: 'Bldg 8, Old armory', faults: ['jmp_lwco', 'low_water'], par: 10,
    ticket: 'Another company came out last night and got the boiler going. Now it is making loud banging and kettle noises.',
    cust: { when: 'The noise started this morning.', work: 'Another contractor came out last night. He said he got it running and would come back for parts.', lights: 'There is a LOW WATER light on, but the boiler is running anyway.', noise: 'Banging and rumbling like a kettle.' },
    hints: ['The LOW WATER light is on but the burner runs. How can that be?', 'Look at the low-water cutoff terminals in the cabinet.', 'Never leave a safety jumped. Fix the reason it tripped, then remove the jumper.'] }
];
LEVELS.forEach((l, i) => { l.rank = RANKS[i]; l.n = i + 1; });

/* ---- panel.js ---- */
/* ===== Boiler control panel: every probe point the meter can touch, grouped the way the cabinet is laid out ===== */
const PANEL_W = 1100, PANEL_H = 1660;
const TPOS = {};
const NAV = [['Power', 0], ['Pump', 250], ['Limit string', 500], ['Interlocks', 790], ['Flame safeguard', 1010], ['Burner loads', 1330]];
const TLBL = {
  LN_L1: 'L1', LN_N: 'N', DS_L1: 'L1', F1_IN: 'IN', F1_OUT: 'OUT', NB: 'N', GND: 'G', EN_1: '1', EN_2: '2',
  PR_A: 'A', PR_B: 'B', PR_C: 'C', PR_NO: 'NO', PM_1: '1', PM_2: '2',
  BS_1: '1', BS_2: '2', OC_1: '1', OC_2: '2', HL_1: '1', HL_2: '2', LW_1: '1', LW_2: '2', FS_1: '1', FS_2: '2',
  LG_1: 'C', LG_2: 'NO', HG_1: 'C', HG_2: 'NC', AP_1: 'C', AP_2: 'NO',
  RM_L1: 'L1', RM_L2: 'L2', RM_3: '3', RM_4: '4', RM_6: '6', RM_7: '7', RM_8: '8', RM_9: '9', RM_10: '10', FT_P: '+', FT_N: '−',
  BM_1: '1', BM_2: '2', AL_1: '1', AL_2: '2', PV_1: '1', PV_2: '2', V1_1: '1', V1_2: '2', V2_1: '1', V2_2: '2', IG_1: '1', IG_2: '2'
};
function term(id, x, y, lblPos) {
  TPOS[id] = [x, y];
  const ly = lblPos === 'b' ? y + 30 : y - 16;
  return `<g class="term" data-id="${id}" tabindex="0" role="button" aria-label="${esc(NODES[id])}"><circle class="pad" cx="${x}" cy="${y}" r="22"/><circle class="hit" cx="${x}" cy="${y}" r="9"/><circle class="ring-r" cx="${x}" cy="${y}" r="15" style="display:none"/><circle class="ring-b" cx="${x}" cy="${y}" r="19" style="display:none"/><text x="${x}" y="${ly}" text-anchor="middle">${TLBL[id] || id}</text></g>`;
}
function box(x, y, w, h, label, sub) {
  return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text class="boxlabel" x="${x + 12}" y="${y + 24}">${label}</text>` + (sub ? `<text class="sub" x="${x + 12}" y="${y + 44}">${sub}</text>` : '');
}
function sect(y, label) { return `<text x="20" y="${y}" style="font:700 13px var(--head);letter-spacing:.16em;fill:var(--yellow);text-transform:uppercase">${label}</text><line x1="20" x2="1080" y1="${y + 8}" y2="${y + 8}" stroke="#33414f"/>`; }
function twoTermDevice(x, y, w, label, sub, a, b, glyph) {
  return box(x, y, w, 150, label, sub) + (glyph || '') + term(a, x + 40, y + 115, 'b') + term(b, x + w - 40, y + 115, 'b');
}
/* small drawings inside the boxes (no faults are ever shown here) */
const G_SW = (x, y) => `<path d="M${x} ${y} h18 l26 -14 M${x + 50} ${y} h18" stroke="#b9c6d3" stroke-width="2.5" fill="none"/>`;
const G_COIL = (x, y) => `<rect x="${x}" y="${y - 12}" width="60" height="24" rx="4" fill="#4a3a1e" stroke="#b9873a"/><path d="M${x + 6} ${y} q5 -9 10 0 t10 0 t10 0 t10 0 t10 0" stroke="#e8a33b" fill="none"/>`;
const G_MOTOR = (x, y, key) => `<circle cx="${x}" cy="${y}" r="26" fill="#2b3642" stroke="#6a7d90" stroke-width="2"/><g class="spin" data-fan="${key}" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y - 20} L${x} ${y + 20} M${x - 20} ${y} L${x + 20} ${y}" stroke="#9fb1c3" stroke-width="4"/></g><text x="${x}" y="${y + 44}" text-anchor="middle" class="sub">M</text>`;

function buildPanel() {
  let s = '';
  /* ---- power ---- */
  s += sect(26, 'Power entry');
  s += box(30, 44, 250, 180, 'Disconnect', '120 V, 1 phase') + term('LN_L1', 90, 120) + term('LN_N', 220, 120) + term('DS_L1', 90, 196, 'b');
  s += `<text class="sub" x="122" y="124">LINE</text><text class="sub" x="122" y="200">LOAD</text>`;
  s += box(310, 44, 150, 180, 'Fuse F1', '10 A') + `<rect x="368" y="126" width="34" height="46" rx="6" fill="#d9d2c0" stroke="#8a826e"/>` + term('F1_IN', 385, 112) + term('F1_OUT', 385, 192, 'b');
  s += box(490, 44, 240, 80, 'Neutral bar', '') + term('NB', 680, 84);
  s += box(490, 144, 240, 80, 'Ground lug', '') + term('GND', 680, 184);
  s += box(760, 44, 310, 180, 'Heating call', 'Contact from the building controls') + G_SW(865, 150) + term('EN_1', 830, 150) + term('EN_2', 1000, 150);
  /* ---- pump ---- */
  s += sect(266, 'Pump circuit');
  s += box(30, 284, 420, 190, 'Pump relay PR', '120 V coil, NO contact') + G_COIL(60, 380) + `<text class="sub" x="62" y="350">coil</text>` + G_SW(285, 380) + `<text class="sub" x="285" y="350">contact</text>`;
  s += term('PR_A', 70, 440, 'b') + term('PR_B', 160, 440, 'b') + term('PR_C', 280, 440, 'b') + term('PR_NO', 400, 440, 'b');
  s += box(480, 284, 340, 190, 'Pump motor', '3/4 hp, 120 V, 1 phase') + G_MOTOR(650, 370, 'pump') + term('PM_1', 540, 440, 'b') + term('PM_2', 760, 440, 'b');
  /* ---- limit string ---- */
  s += sect(516, 'Limit string (to relay module terminal 6)');
  const lim = [['BS', 'Burner switch', 'ON / OFF'], ['OC', 'Operating', 'aquastat 180°F'], ['HL', 'High limit', '210°F, man. reset'], ['LW', 'Low-water', 'cutoff (probe)'], ['FS', 'Flow switch', 'paddle, ~20 gpm']];
  lim.forEach((d, i) => { const x = 30 + i * 210; s += twoTermDevice(x, 534, 196, d[1], d[2], d[0] + '_1', d[0] + '_2', G_SW(x + 64, 610)); });
  s += `<text class="sub" x="30" y="716">Left to right is the order the wire runs: burner switch → operating aquastat → high limit → low-water cutoff → flow switch → RM terminal 6.</text>`;
  /* ---- interlocks ---- */
  s += sect(806, 'Lockout interlocks (terminal 6 to terminal 7)');
  const ilk = [['LG', 'Low gas press.', '3.5 in. w.c., man. reset'], ['HG', 'High gas press.', '5.0 in. w.c., man. reset'], ['AP', 'Air proving sw.', '0.5 in. w.c.']];
  ilk.forEach((d, i) => { const x = 30 + i * 260; s += twoTermDevice(x, 824, 240, d[1], d[2], d[0] + '_1', d[0] + '_2', G_SW(x + 86, 900)); });
  s += `<text class="sub" x="820" y="870">Order: terminal 6 →</text><text class="sub" x="820" y="890">low gas → high gas →</text><text class="sub" x="820" y="910">air switch → terminal 7</text>`;
  /* ---- relay module ---- */
  s += sect(1026, 'Flame safeguard relay module (7800 series, on/off)');
  s += box(30, 1044, 1040, 260, 'Relay module on its subbase', 'Keyboard display, plug-in flame amplifier, UV scanner on F and G');
  s += `<rect x="560" y="1062" width="230" height="80" rx="6" fill="#0d1822" stroke="#25343f"/><text id="pnlKdm" x="675" y="1098" text-anchor="middle" style="font:700 16px var(--mono);fill:#7fd7ff">---</text><text id="pnlKdm2" x="675" y="1124" text-anchor="middle" style="font:12px var(--mono);fill:#7fd7ff"></text>`;
  s += `<rect x="830" y="1062" width="210" height="80" rx="6" fill="#273340" stroke="#51657a"/><text class="sub" x="842" y="1082">Flame amplifier</text><text class="sub" x="842" y="1100">test jacks (V dc)</text>`;
  s += term('FT_P', 940, 1124) + term('FT_N', 1000, 1124);
  const rmT = ['RM_L1', 'RM_L2', 'RM_3', 'RM_4', 'RM_6', 'RM_7', 'RM_8', 'RM_9', 'RM_10'];
  rmT.forEach((id, i) => { const x = 80 + i * 110; s += `<rect x="${x - 26}" y="1196" width="52" height="56" rx="4" fill="#1a222b" stroke="#51657a"/>` + term(id, x, 1236); });
  s += `<text class="sub" x="54" y="1286">Subbase terminals. F and G (scanner) are not probe points; read the flame signal at the test jacks.</text>`;
  /* ---- loads ---- */
  s += sect(1346, 'Burner loads');
  const lds = [['BM', 'Blower motor', '1/3 hp', G_MOTOR], ['IG', 'Ignition xfmr', '120 / 6,000 V'], ['PV', 'Pilot valve', '120 V coil'], ['V1', 'Main valve V1', '120 V'], ['V2', 'Main valve V2', '120 V'], ['AL', 'Alarm light', '120 V']];
  lds.forEach((d, i) => {
    const x = 30 + (i % 3) * 350, y = 1364 + Math.floor(i / 3) * 150;
    const gl = d[0] === 'BM' ? G_MOTOR(x + 230, y + 70, 'blw') : d[0] === 'AL' ? `<circle id="pnlAlarm" cx="${x + 230}" cy="${y + 70}" r="18" fill="#3a1d1a" stroke="#7a3a33" stroke-width="3"/>` : G_COIL(x + 200, y + 70);
    s += box(x, y, 330, 136, d[1], d[2]) + gl + term(d[0] + '_1', x + 40, y + 100, 'b') + term(d[0] + '_2', x + 130, y + 100, 'b');
  });
  s += buildWires();
  return s;
}
/* field wiring, drawn when "Wires: On" (orange: hot side, white: neutral, green: ground) */
function buildWires() {
  let s = '';
  NETS.forEach((n, i) => {
    if (n.length < 2) return;
    const neutral = n.indexOf('NB') >= 0;
    const col = neutral ? '#d0d6dc' : '#e8a33b';
    const pts = n.filter(id => TPOS[id]).map(id => TPOS[id]);
    for (let k = 1; k < pts.length; k++) {
      const a = neutral ? TPOS.NB : pts[k - 1], b = pts[k];
      const midY = Math.max(a[1], b[1]) + 18 + (i % 5) * 4;
      const d = `M${a[0]} ${a[1]} V${midY} H${b[0]} V${b[1]}`;
      s += `<path class="wr" d="${d}" stroke="${n.indexOf('GND') >= 0 && b === TPOS.GND ? '#38c172' : col}" stroke-width="3" fill="none" opacity=".75"/>`;
    }
  });
  return s;
}

/* ---- ladder.js ---- */
/* ===== Ladder schematic: how 120 V flows from L1 through each control to neutral ===== */
const LAD_W = 900, LAD_H = 1060, RAIL_L = 70, RAIL_R = 840;

/* symbols. Each returns [svg, width] drawn from x along a rung at height y */
const SYM = {
  no: (x, y, t) => [`<path class="w" d="M${x} ${y} h14 M${x + 14} ${y - 12} v24 M${x + 30} ${y - 12} v24 M${x + 30} ${y} h14"/><text x="${x + 22}" y="${y - 18}" text-anchor="middle">${t}</text>`, 44],
  nc: (x, y, t) => [`<path class="w" d="M${x} ${y} h14 M${x + 14} ${y - 12} v24 M${x + 30} ${y - 12} v24 M${x + 30} ${y} h14 M${x + 8} ${y + 12} l28 -24"/><text x="${x + 22}" y="${y - 18}" text-anchor="middle">${t}</text>`, 44],
  coil: (x, y, t) => [`<path class="w" d="M${x} ${y} h10 M${x + 46} ${y} h10"/><circle class="p" cx="${x + 28}" cy="${y}" r="18"/><text x="${x + 28}" y="${y + 4}" text-anchor="middle">${t}</text>`, 56],
  motor: (x, y, t) => [`<path class="w" d="M${x} ${y} h10 M${x + 50} ${y} h10"/><circle class="p" cx="${x + 30}" cy="${y}" r="20"/><text x="${x + 30}" y="${y + 5}" text-anchor="middle">M</text><text x="${x + 30}" y="${y - 26}" text-anchor="middle">${t}</text>`, 60],
  lamp: (x, y, t) => [`<path class="w" d="M${x} ${y} h10 M${x + 46} ${y} h10"/><circle class="p" cx="${x + 28}" cy="${y}" r="16"/><path class="w" d="M${x + 17} ${y - 11} l22 22 M${x + 39} ${y - 11} l-22 22"/><text x="${x + 28}" y="${y - 24}" text-anchor="middle">${t}</text>`, 56],
  xfmr: (x, y, t) => [`<path class="w" d="M${x} ${y} h8 q6 -14 12 0 q6 -14 12 0 q6 -14 12 0 h8 M${x + 20} ${y - 18} h24 M${x + 20} ${y - 22} h24"/><text x="${x + 26}" y="${y - 30}" text-anchor="middle">${t}</text>`, 52],
  fuse: (x, y, t) => [`<path class="w" d="M${x} ${y} h8 M${x + 48} ${y} h8"/><rect class="p" x="${x + 8}" y="${y - 8}" width="40" height="16" rx="3"/><path class="w" d="M${x + 8} ${y} h40"/><text x="${x + 28}" y="${y - 16}" text-anchor="middle">${t}</text>`, 56],
  /* temperature switch (opens on rise), pressure switch, float/probe, flow paddle: contact with a sensing mark under it */
  temp: (x, y, t, nc) => { const c = SYM[nc ? 'nc' : 'no'](x, y, t); return [c[0] + `<path class="w" d="M${x + 22} ${y + 14} v10 h-8 l8 10 l8 -10 h-8"/>`, 44]; },
  press: (x, y, t, nc) => { const c = SYM[nc ? 'nc' : 'no'](x, y, t); return [c[0] + `<path class="w" d="M${x + 22} ${y + 14} v8 M${x + 10} ${y + 32} q12 -14 24 0 z"/>`, 44]; },
  probe: (x, y, t) => { const c = SYM.no(x, y, t); return [c[0] + `<path class="w" d="M${x + 22} ${y + 14} v16 M${x + 14} ${y + 32} h16"/>`, 44]; },
  flow: (x, y, t) => { const c = SYM.no(x, y, t); return [c[0] + `<path class="w" d="M${x + 22} ${y + 14} v14 l10 8"/>`, 44]; },
  rmT: (x, y, t) => [`<rect class="p" x="${x}" y="${y - 12}" width="30" height="24" rx="2"/><text class="n" x="${x + 15}" y="${y + 4}" text-anchor="middle">${t}</text>`, 30],
  wire: (x, y, t, w) => [`<path class="w" d="M${x} ${y} h${w}"/>` + (t ? `<text x="${x + w / 2}" y="${y - 8}" text-anchor="middle">${t}</text>` : ''), w]
};
function rung(y, items, opt) {
  opt = opt || {};
  let x = opt.from || RAIL_L, s = '';
  const total = items.reduce((a, it) => a + SYM[it[0]](0, 0, '', it[2])[1], 0);
  const end = opt.to || RAIL_R;
  const gaps = items.length + 1, gap = Math.max(10, (end - x - total) / gaps);
  s += `<path class="w" d="M${x} ${y} h${gap}"/>`; x += gap;
  items.forEach((it, i) => {
    const r = SYM[it[0]](x, y, it[1], it[2]); s += r[0]; x += r[1];
    const g = i === items.length - 1 ? end - x : gap; s += `<path class="w" d="M${x} ${y} h${g}"/>`; x += g;
  });
  if (opt.label) s += `<text class="t" x="${RAIL_R + 14}" y="${y + 4}">${opt.label}</text>`;
  return s;
}
function buildLadder() {
  let s = '';
  s += `<text class="t" x="${RAIL_L - 30}" y="30">L1 120 V</text><text class="t" x="${RAIL_R - 6}" y="30">N</text>`;
  /* supply: disconnect and fuse feeding the left rail */
  s += `<path class="w" d="M${RAIL_L - 40} 60 h12"/>` + SYM.no(RAIL_L - 28, 60, 'DISC')[0] + `<path class="w" d="M${RAIL_L + 16} 60 h10"/>` + SYM.fuse(RAIL_L + 26, 60, 'F1 10A')[0] + `<path class="w" d="M${RAIL_L + 82} 60 h20 v20 H${RAIL_L} V1010"/>`;
  s += `<path class="w" d="M${RAIL_R} 46 V1010"/>`;
  /* rung 1: heating call to the pump relay coil, and node A */
  s += rung(130, [['no', 'HEAT CALL'], ['wire', 'A', 290], ['coil', 'PR']], { label: '1' });
  s += rung(210, [['no', 'PR'], ['motor', 'PUMP']], { label: '2' });
  /* rung 3: from A through the limit string to terminal 6 */
  const ax = 310;
  s += `<path class="w" d="M${ax} 130 V290"/><circle cx="${ax}" cy="130" r="4" fill="#b9c6d3"/>`;
  s += rung(290, [['no', 'BURNER SW'], ['temp', 'OPER 180°', true], ['temp', 'HI LIM MR', true], ['probe', 'LWCO'], ['flow', 'FLOW SW'], ['rmT', '6']], { from: ax, label: '3' });
  s += `<text x="${ax + 4}" y="330" style="font:11px var(--mono);fill:#8fa1b3">operating and high limit open on temperature rise</text>`;
  /* rung 4: lockout interlocks 6 to 7 */
  s += rung(390, [['rmT', '6'], ['press', 'LGPS (MR)'], ['press', 'HGPS (MR)', true], ['press', 'AIR SW'], ['rmT', '7']], { from: 180, to: 780, label: '4' });
  s += `<text x="180" y="430" style="font:11px var(--mono);fill:#8fa1b3">gas pressure switches are manual reset. 6 and 7 are inputs to the relay module.</text>`;
  /* the relay module outputs */
  s += `<rect x="${RAIL_L + 30}" y="470" width="150" height="440" rx="6" fill="none" stroke="#4aa3df" stroke-dasharray="6 4"/><text class="t" x="${RAIL_L + 40}" y="490">RELAY MODULE</text><text class="t" x="${RAIL_L + 40}" y="506">internal relays</text>`;
  const outs = [[550, '3', 'motor', 'BLOWER', '5'], [620, '10', 'xfmr', 'IGN XFMR', '6'], [690, '8', 'coil', 'PV', '7'], [760, '9', 'coil', 'V1', '8'], [870, '4', 'lamp', 'ALARM', '10']];
  outs.forEach(o => { s += rung(o[0], [['no', ''], ['rmT', o[1]], ['wire', '', 120], [o[2], o[3]]], { label: o[4] }); });
  s += `<path class="w" d="M520 760 V800 H${RAIL_R - 120}"/><circle cx="520" cy="760" r="4" fill="#b9c6d3"/>` + SYM.coil(RAIL_R - 120, 800, 'V2')[0] + `<path class="w" d="M${RAIL_R - 64} 800 H${RAIL_R}"/><text class="t" x="${RAIL_R + 14}" y="804">9</text>`;
  s += rung(970, [['rmT', 'L1'], ['wire', 'RELAY MODULE POWER', 380], ['rmT', 'L2']], { label: '11' });
  s += `<text x="${RAIL_L + 40}" y="530" style="font:11px var(--mono);fill:#8fa1b3">3: prepurge→postpurge · 10: pilot trial · 8: PFEP+MFEP · 9: MFEP+run · 4: lockout</text>`;
  s += `<text x="${RAIL_L}" y="1040" style="font:12px var(--mono);fill:#8fa1b3">UV scanner wires to F and G on the subbase (flame signal: 1.25 V dc minimum at the amplifier test jacks).</text>`;
  return s;
}

/* ---- pic.js ---- */
/* ===== Boiler room picture: piping, pump, gas train, burner and stack. Click a part to look at it closely. ===== */
const PIC_W = 1100, PIC_H = 760;
const SPOTS = {
  burner: [250, 470, 'Burner'], blower: [215, 420, 'Blower'], damper: [205, 515, 'Air damper'], aps: [262, 372, 'Air switch'],
  sight: [312, 470, 'Sight glass'], scanner: [300, 430, 'UV scanner'], electrode: [292, 512, 'Ignition electrode'], ignx: [228, 560, 'Ignition xfmr'],
  gascock: [42, 652, 'Main gas cock'], reg: [92, 652, 'Gas regulator'], lgps: [140, 612, 'Low gas sw.'], v1: [178, 652, 'Main valve V1'], v2: [220, 652, 'Main valve V2'],
  hgps: [258, 612, 'High gas sw.'], pilotcock: [128, 576, 'Pilot cock'], pv: [176, 576, 'Pilot valve'],
  stack: [725, 210, 'Stack / analyzer port'], tubes: [560, 470, 'Fire tubes'], gauge: [420, 270, 'P/T gauge'], relief: [520, 262, 'Relief valve'],
  lwco: [790, 400, 'Low-water cutoff'], fs: [850, 126, 'Flow switch'], vent: [960, 92, 'Air vent'], exptank: [960, 300, 'Expansion tank'],
  fill: [1044, 212, 'Make-up water'], pump: [900, 612, 'Pump'], coupler: [930, 642, 'Pump coupler'], iso: [1010, 612, 'Isolation valves'], strainer: [968, 650, 'Strainer'],
  rm: [118, 186, 'Control cabinet'], alarm: [118, 104, 'Alarm light'], jumper: [150, 250, 'Cabinet terminals']
};
function buildPic() {
  let s = `<defs><linearGradient id="gJk" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#9b2d22"/><stop offset="1" stop-color="#5e1a14"/></linearGradient>
    <linearGradient id="gPipe" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5d6d7d"/><stop offset=".5" stop-color="#8697a8"/><stop offset="1" stop-color="#4a5866"/></linearGradient>
    <radialGradient id="gFl"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#5aa7ff"/><stop offset="1" stop-color="#173a6b"/></radialGradient></defs>`;
  s += `<rect x="0" y="0" width="${PIC_W}" height="${PIC_H}" fill="#1a2129"/><rect x="0" y="700" width="${PIC_W}" height="60" fill="#262e37"/><path d="M0 700 H${PIC_W}" stroke="#3a4652" stroke-width="3"/>`;
  /* relief valve discharge pipe, run behind the stack and down to the floor */
  s += `<path d="M534 262 H818 V690" stroke="#8697a8" stroke-width="8" fill="none"/>`;
  /* stack */
  s += `<rect x="700" y="40" width="50" height="270" fill="#6b7682" stroke="#4a545e"/><circle cx="725" cy="210" r="6" fill="#222"/><text class="pl" x="760" y="60">Flue</text>`;
  /* boiler shell */
  s += `<rect x="330" y="300" width="440" height="340" rx="22" fill="url(#gJk)" stroke="#3a0f0b" stroke-width="3"/><rect x="350" y="320" width="400" height="300" rx="14" fill="none" stroke="#c2513f" stroke-opacity=".35"/>`;
  s += `<text class="sl" x="590" y="420" text-anchor="middle">HOT WATER BOILER · 1,000 MBH</text>`;
  s += `<path d="M380 640 v40 M720 640 v40" stroke="#2b333c" stroke-width="16"/><rect x="360" y="680" width="380" height="20" fill="#2b333c"/>`;
  /* supply: up from the boiler, across the top to the building */
  s += `<path d="M460 300 V120 H1100" stroke="url(#gPipe)" stroke-width="22" fill="none"/><path id="supFlow" d="M460 300 V120 H1100" stroke="#e86b4a" stroke-width="3" fill="none" stroke-dasharray="8 20" opacity="0"/>`;
  s += `<text class="pl" x="1000" y="106">Supply →</text>`;
  /* P/T gauge and relief valve on top */
  s += `<path d="M420 300 v-14" stroke="#8697a8" stroke-width="6"/><circle cx="420" cy="270" r="18" fill="#f2f2ea" stroke="#333" stroke-width="3"/><path id="ptNeedle" d="M420 270 l0 -13" stroke="#b00" stroke-width="2.5"/>`;
  s += `<path d="M520 300 v-26" stroke="#8697a8" stroke-width="10"/><rect x="506" y="246" width="28" height="30" rx="4" fill="#c9a640" stroke="#7d6420"/>`;
  s += `<path id="reliefDrip" d="M818 690 v14" stroke="#4aa3df" stroke-width="4" stroke-dasharray="4 6" class="cdrip" opacity="0"/><ellipse id="puddle" cx="830" cy="712" rx="0" ry="5" fill="#3a6f9a" opacity=".7"/>`;
  /* flow switch and air separator with vent, expansion tank and fill below */
  s += `<rect x="838" y="96" width="24" height="16" fill="#4a5866"/><rect x="842" y="80" width="16" height="18" fill="#2e3a46"/>`;
  s += `<rect x="938" y="104" width="44" height="60" rx="10" fill="#6d7c8b" stroke="#3d4955"/><rect x="954" y="80" width="12" height="24" fill="#b0b9c2"/>`;
  s += `<path d="M960 164 V230" stroke="#8697a8" stroke-width="8"/><rect x="926" y="230" width="68" height="140" rx="30" fill="#3d77b5" stroke="#244a73" stroke-width="3"/><text class="pl" x="1000" y="300">Exp. tank</text>`;
  s += `<path d="M960 196 H1080 V700" stroke="#8697a8" stroke-width="6" fill="none"/><rect x="1032" y="200" width="24" height="24" rx="4" fill="#b9873a"/><text class="pl" x="1000" y="250">City water</text>`;
  /* return: from the building, through valves, strainer and pump into the boiler */
  s += `<path d="M1100 620 H770" stroke="url(#gPipe)" stroke-width="22" fill="none"/><path id="retFlow" d="M1100 620 H770" stroke="#5aa7ff" stroke-width="3" fill="none" stroke-dasharray="8 20" opacity="0"/>`;
  s += `<text class="pl" x="1000" y="596">← Return</text>`;
  s += `<rect x="1000" y="600" width="20" height="40" fill="#b9873a"/><rect x="842" y="600" width="20" height="40" fill="#b9873a"/>`;
  s += `<path d="M955 630 l18 0 l0 28 l-18 -8 z" fill="#6d7c8b" stroke="#3d4955"/>`;
  s += `<rect x="870" y="588" width="64" height="64" rx="8" fill="#2f6f9e" stroke="#1d4a6b" stroke-width="3"/><circle cx="902" cy="620" r="20" fill="#24577c"/><g class="spin" data-fan="pump2" style="transform-origin:902px 620px"><path d="M902 604 V636 M886 620 H918" stroke="#9fc6e3" stroke-width="4"/></g>`;
  s += `<rect x="908" y="640" width="42" height="20" fill="#5a6672"/><rect x="920" y="660" width="70" height="36" rx="6" fill="#2f6f9e" stroke="#1d4a6b"/>`;
  /* low-water cutoff on the side of the boiler, with its lamp */
  s += `<rect x="772" y="372" width="40" height="60" rx="6" fill="#56636f" stroke="#2c343c"/><circle id="lwLamp" cx="792" cy="388" r="6" fill="#3a2a1a"/>`;
  /* burner and blower on the front */
  s += `<rect x="190" y="380" width="140" height="180" rx="12" fill="#5f6d7a" stroke="#38424c" stroke-width="3"/><circle cx="222" cy="430" r="34" fill="#38424c"/><g class="spin" data-fan="blw2" style="transform-origin:222px 430px"><path d="M222 400 V460 M192 430 H252 M200 408 L244 452 M244 408 L200 452" stroke="#9fb1c3" stroke-width="5"/></g>`;
  s += `<rect x="180" y="500" width="40" height="34" fill="#4a5866" stroke="#2c343c"/><path id="damperBlade" d="M186 517 h28" stroke="#c9d3dd" stroke-width="4"/>`;
  s += `<circle cx="312" cy="470" r="14" fill="#0b0f14" stroke="#b9c6d3" stroke-width="3"/><circle id="flameGlow" cx="312" cy="470" r="11" fill="url(#gFl)" opacity="0"/>`;
  s += `<rect x="290" y="420" width="22" height="16" rx="3" fill="#7a3fae"/><rect x="214" y="548" width="34" height="24" rx="3" fill="#3b4652"/><circle id="sparkDot" cx="292" cy="512" r="5" fill="#cfe9ff" opacity="0"/>`;
  s += `<path d="M262 380 v-10" stroke="#ddd" stroke-width="3"/><rect x="250" y="356" width="26" height="18" rx="3" fill="#2d6a9f"/>`;
  /* gas train along the floor into the burner */
  s += `<path d="M0 652 H300 V560" stroke="#d4b73a" stroke-width="12" fill="none"/><path d="M110 652 V576 H300" stroke="#d4b73a" stroke-width="6" fill="none"/>`;
  s += `<rect x="32" y="640" width="20" height="24" fill="#c33"/><rect x="78" y="628" width="30" height="40" rx="6" fill="#4a5866"/><rect x="128" y="600" width="24" height="22" rx="3" fill="#2d6a9f"/>`;
  s += `<rect x="164" y="634" width="28" height="36" rx="4" fill="#3b4652"/><rect x="206" y="634" width="28" height="36" rx="4" fill="#3b4652"/><rect x="246" y="600" width="24" height="22" rx="3" fill="#2d6a9f"/>`;
  s += `<rect x="120" y="568" width="16" height="16" fill="#c33"/><rect x="164" y="566" width="24" height="20" rx="3" fill="#3b4652"/><text class="pl" x="6" y="690">Gas in</text>`;
  /* control cabinet on the wall with the alarm light */
  s += `<rect x="50" y="120" width="140" height="160" rx="6" fill="#56636f" stroke="#2c343c" stroke-width="3"/><rect x="66" y="140" width="80" height="34" rx="3" fill="#0d1822"/><text id="picKdm" x="106" y="162" text-anchor="middle" style="font:700 10px var(--mono);fill:#7fd7ff">---</text>`;
  s += `<circle id="picAlarm" cx="118" cy="104" r="12" fill="#3a1d1a" stroke="#222" stroke-width="2"/><rect x="20" y="140" width="24" height="60" rx="3" fill="#6d7c8b"/><text class="pl" x="16" y="220">Disc.</text>`;
  /* clickable spots */
  Object.keys(SPOTS).forEach(k => {
    const p = SPOTS[k];
    s += `<g class="spot" data-spot="${k}" tabindex="0" role="button" aria-label="${p[2]}"><circle class="pad" cx="${p[0]}" cy="${p[1]}" r="20"/><circle class="ring" cx="${p[0]}" cy="${p[1]}" r="17" fill="none" stroke="#ffd23f" stroke-width="3" style="display:none"/></g>`;
  });
  return s;
}
/* keep the picture in step with the boiler */
function renderPicLive(B) {
  const st = B.status(), set = (id, a, v) => { const e = document.getElementById(id); if (e) e.setAttribute(a, v); };
  set('flameGlow', 'opacity', st.flame === 'main' ? (B.has('blower_dirty') ? 0.95 : 0.85) : st.flame === 'pilot' ? 0.45 : 0);
  set('flameGlow', 'r', st.flame === 'main' ? 11 : 6);
  set('sparkDot', 'opacity', B.spark ? (Math.random() > 0.4 ? 1 : 0.2) : 0);
  set('picAlarm', 'fill', st.alarm ? '#ff3b2e' : '#3a1d1a');
  set('lwLamp', 'fill', st.lwLamp ? '#ffb020' : '#3a2a1a');
  set('reliefDrip', 'opacity', st.relief === 'dry' ? 0 : 1);
  set('puddle', 'rx', st.relief === 'discharging' ? 46 : st.relief === 'dripping' ? 18 : 0);
  set('supFlow', 'opacity', B.flow > 5 ? 0.9 : 0); set('retFlow', 'opacity', B.flow > 5 ? 0.9 : 0);
  ['supFlow', 'retFlow'].forEach(id => { const e = document.getElementById(id); if (e) e.classList.toggle('dflow', B.flow > 5); });
  const ang = Math.max(-130, Math.min(130, -130 + (B.P / 60) * 260));
  set('ptNeedle', 'transform', `rotate(${ang} 420 270)`);
  const k = document.getElementById('picKdm'); if (k) k.textContent = B.rmOK() && B.lastPow ? RM_TEXT[B.rm.st] : '';
}

/* ---- app.js ---- */
/* ===== Game: levels, meter, tools, parts, scoring and screens ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const B = Boiler;
let li = 0, mode = 'V', probes = { red: null, black: null }, probeSel = null;
let strikes = 0, readings = 0, wrongParts = 0, partsUsed = 0, hintsUsed = 0, active = false, explore = false, t0 = Date.now(), winWait = 0;
let doneSet = new Set();
try { doneSet = new Set(JSON.parse(localStorage.getItem('blr_done') || '[]')); } catch (e) {}
const saveDone = () => { try { localStorage.setItem('blr_done', JSON.stringify([...doneSet])); } catch (e) {} };
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function log(msg, cls) {
  const d = document.createElement('div'); d.textContent = msg; if (cls) d.className = cls;
  $('log').appendChild(d); $('log').scrollTop = $('log').scrollHeight;
}
B.onLog = m => { if (active) log(m, 'h'); };
function sheet(html) { $('sheet').className = 'sheet'; $('sheet').innerHTML = html; $('modal').hidden = false; const b = $('sheet').querySelector('button'); if (b) b.focus(); }
const closeSheet = () => { $('modal').hidden = true; };

/* ---------- normal readings and specs ---------- */
const GUIDE = [['Line L1 to neutral', '≈ 120 V'], ['Across a closed switch, power on', '0 V'], ['Across an open switch in a live string', '≈ 120 V'],
  ['Flame signal, pilot', '2.0 – 3.0 V dc'], ['Flame signal, main', '3.5 – 4.5 V dc'], ['Minimum to prove flame', '1.25 V dc'],
  ['Gas inlet, natural gas', '6.5 – 7.5 in. w.c.'], ['Manifold, full fire', '3.5 in. w.c.'], ['Blower static at the air switch', '≈ 1.4 in. w.c.'],
  ['Boiler pressure, cold / at 180°F', '12 / about 20 psi'], ['Pump differential', '≈ 9.4 psi'], ['Pump motor current', '≈ 10.2 A'], ['Blower motor current', '≈ 5.8 A']];
function buildSpecs() {
  const t = (h, rows) => `<h3>${h}</h3><table><tr><th>Item</th><th>Value</th></tr>` + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  return t('Electrical', [['Supply', '120 V, 1 phase, 60 Hz'], ['Control fuse F1', '10 A'], ['Blower motor', '1/3 hp, 5.8 A running'], ['Circulating pump motor', '3/4 hp, 10.2 A running'], ['Ignition transformer', '120 V primary, about 1.3 A'], ['Relay coils and valve coils', '120 V']]) +
    t('Flame safeguard sequence (this game runs it at 2× speed)', [['Initiate after power-up', '10 s'], ['Prepurge (blower on, airflow proven within 10 s)', '30 s'], ['Pilot flame establishing period, PFEP (ignition + pilot)', '10 s'], ['Main flame establishing period, MFEP (pilot + main)', '10 s'], ['Run (main valves only, interrupted pilot)', 'until the limits open'], ['Postpurge', '15 s'], ['Flame signal to prove flame', '1.25 V dc minimum'], ['Normal flame signal, pilot / main', '2 – 3 / 3.5 – 4.5 V dc']]) +
    t('Gas train (natural gas)', [['Inlet pressure', '7 in. w.c. (6.5 firing)'], ['Manifold pressure, full fire', '3.5 in. w.c.'], ['Pilot pressure', '3.0 in. w.c.'], ['Low gas pressure switch (manual reset)', 'opens below 3.5 in. w.c.'], ['High gas pressure switch (manual reset)', 'opens above 5.0 in. w.c.'], ['Air proving switch', 'closes at 0.5 in. w.c.'], ['Blower static at the switch port', 'about 1.4 in. w.c.']]) +
    t('Combustion (flue gas at the stack)', [['O2', '3 – 6 %'], ['CO2', '8.5 – 10 %'], ['CO, as measured', 'under 100 ppm'], ['Stack temperature', '380 – 450°F'], ['Combustion efficiency', 'about 82 %']]) +
    t('Water side', [['Operating aquastat', 'opens 180°F, closes 165°F'], ['High limit (manual reset)', '210°F'], ['Cold fill pressure', '12 psi'], ['Pressure at 180°F', 'about 20 psi'], ['Relief valve', '30 psi'], ['Design flow / ΔT', '80 gpm / about 20°F at full load'], ['Pump differential', 'about 9.4 psi'], ['Flow switch', 'closes at about 20 gpm']]) +
    `<p>Values not taken from a specific manufacturer's literature are typical for a 1,000 MBH commercial hot-water boiler with an on/off power burner. Confirm against the equipment on your site.</p>`;
}
function buildPlate() {
  return `<div class="plate"><h3>Hot water boiler</h3><div class="plm">Model HWB-1000 · Serial 24B-1187</div>
    <div class="plr">Input: 1,000,000 Btu/h natural gas</div><div class="plr">Gross output: 820,000 Btu/h</div>
    <div class="plr">Max. allowable working pressure: 80 psi water</div><div class="plr">Relief valve setting: 30 psi</div>
    <div class="plr">Max. water temperature: 250°F</div><div class="plr">Manifold pressure: 3.5 in. w.c. · Min. inlet: 5.0 in. w.c.</div>
    <div class="plr">Electrical: 120 V, 1 ph, 60 Hz · Burner 7.5 FLA</div></div>
    <div class="plate"><h3>Circulating pump</h3><div class="plm">In-line, close-coupled</div><div class="plr">80 gpm at 22 ft head</div><div class="plr">3/4 hp · 120 V · 1 ph · 10.6 FLA</div></div>`;
}

/* ---------- screens ---------- */
function renderTabs() {
  $('lvlTabs').innerHTML = `<select id="lvlSel" class="lvlsel" aria-label="Choose a level">` + LEVELS.map((l, i) =>
    `<option value="${i}"${i === li ? ' selected' : ''}>${doneSet.has(l.id) ? '✓ ' : ''}Level ${l.n} · ${esc(l.title)}</option>`).join('') + `</select>`;
  $('lvlSel').onchange = e => startLevel(+e.target.value);
}
function renderHud() { $('strikes').innerHTML = `Safety strikes<b class="${strikes ? 'bad' : ''}">${strikes}/3</b>`; }
function renderTicket() {
  const l = LEVELS[li];
  $('ticket').innerHTML = `<h2>Work order · ${esc(l.rank)}</h2><p><b>${esc(l.title)}</b></p><p class="site">${esc(l.site)}</p><p>${esc(l.ticket)}</p><div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="custBtn2">Talk to the customer</button></div>`;
  $('custBtn2').onclick = custSheet;
  const g = $('guide');
  if (l.n <= 10) { g.className = 'card'; g.innerHTML = '<h2>Normal readings (training aid)</h2><table>' + GUIDE.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>'; }
  else { g.className = 'card hide'; g.innerHTML = ''; }
}
function setTab(t) {
  ['Unit', 'Schem', 'Pic', 'Order', 'Plate', 'Spec'].forEach(k => { $('tab' + k).classList.toggle('on', k === t); $('view' + k).hidden = k !== t; });
  document.documentElement.dataset.tab = t; $('tabSel').value = t; $('zoomBox').hidden = t !== 'Unit';
}

/* ---------- live status ---------- */
const FLAME_TXT = { none: 'Dark', spark: 'Spark, no flame', pilot: 'Pilot flame', main: 'Main flame' };
function updateStatus() {
  const s = B.status(), row = (k, v, c) => `<span>${k}</span><b class="${c || ''}">${v}</b>`;
  const noise = B.main && B.lowWater() ? 'Banging and kettling in the boiler' : B.has('air_bound') && B.pumpRun ? 'Gurgling in the pipes' : '';
  $('status').innerHTML =
    row('Sight glass', FLAME_TXT[s.flame], s.flame === 'main' ? 'ok' : s.flame === 'none' ? '' : 'warn') +
    row('Burner blower', s.blower === 'run' ? 'Running' : s.blower === 'hum' ? 'Humming, not turning' : 'Stopped', s.blower === 'hum' ? 'bad' : '') +
    row('Pump', s.pump === 'run' ? 'Running' : s.pump === 'hum' ? 'Humming, not turning' : 'Stopped', s.pump === 'hum' ? 'bad' : '') +
    row('Alarm light', s.alarm ? 'ON' : 'off', s.alarm ? 'bad' : '') +
    row('LOW WATER light', s.lwLamp ? 'ON' : 'off', s.lwLamp ? 'warn' : '') +
    row('Boiler gauge', Math.round(s.Tb) + '°F · ' + s.P.toFixed(0) + ' psi') +
    row('Relief valve', s.relief === 'dry' ? 'Dry' : s.relief === 'dripping' ? 'Dripping' : 'Discharging', s.relief === 'dry' ? '' : 'bad') +
    (noise ? row('Sound', noise, 'warn') : '');
  /* keyboard display and LEDs */
  const r = B.rm, pow = B.rmOK() && B.lastPow, k = $('kdm');
  k.className = !pow && r.st !== 'LOCKOUT' ? 'dark' : r.st === 'LOCKOUT' ? 'lock' : '';
  if (r.st === 'LOCKOUT' && !pow) k.className = 'dark';
  let l2 = '';
  if (r.st === 'LOCKOUT') l2 = r.lock;
  else if (['INIT', 'PURGE', 'PFEP', 'MFEP', 'POST'].indexOf(r.st) >= 0) l2 = Math.max(0, Math.ceil(r.t)) + ' s' + (r.st === 'PURGE' || r.st === 'PFEP' || r.st === 'MFEP' ? ' · Flame ' + B.sig.toFixed(1) + ' V' : '');
  else if (r.st === 'RUN' || r.st === 'HOLD' || r.st === 'STANDBY') l2 = 'Flame ' + B.sig.toFixed(1) + ' V';
  $('kdm1').textContent = RM_TEXT[r.st]; $('kdm2').textContent = l2;
  const led = (id, on) => $(id).classList.toggle('on', !!on);
  led('ledPow', pow); led('ledPilot', pow && B.out(8)); led('ledFlame', pow && B.sig >= FLAME_MIN); led('ledMain', pow && B.out(9)); led('ledAlarm', pow && r.st === 'LOCKOUT');
  const p1 = $('pnlKdm'), p2 = $('pnlKdm2'); if (p1) { p1.textContent = pow ? RM_TEXT[r.st] : ''; p2.textContent = pow ? l2.slice(0, 30) : ''; }
  const al = $('pnlAlarm'); if (al) al.setAttribute('fill', s.alarm ? '#ff3b2e' : '#3a1d1a');
  /* spinning motors */
  document.querySelectorAll('[data-fan]').forEach(el => {
    const kk = el.dataset.fan, on = /^pump/.test(kk) ? B.pumpRun : B.blowerRun;
    el.classList.toggle('on', on); el.style.setProperty('--d', /^pump/.test(kk) && B.has('coupler') ? '.25s' : '.3s');
  });
  renderPicLive(B);
  setSwitches();
}

/* ---------- meter ---------- */
function lcd(text, sub, err) { $('lcd').textContent = text; $('lcd').className = err ? 'err' : ''; $('lcdSub').textContent = sub || ''; }
const jit = v => v * (1 + (Math.random() - 0.5) * 0.006);
const lineSide = id => /^LN_/.test(id);
function measure(act) {
  const r = probes.red, b = probes.black;
  $('pRed').textContent = r || '—'; $('pBlk').textContent = b || '—';
  $('chipR').classList.toggle('sel', probeSel === 'red'); $('chipK').classList.toggle('sel', probeSel === 'black');
  document.querySelectorAll('#unitSvg .term').forEach(t => {
    const id = t.dataset.id;
    t.querySelector('.ring-r').style.display = id === r ? '' : 'none';
    t.querySelector('.ring-b').style.display = id === b ? '' : 'none';
  });
  if (!r || !b) return lcd('---', 'Place both probes');
  if (r === b) return lcd('0.0', 'Both probes on the same point');
  const name = id => NODES[id] || id;
  if (mode === 'V') {
    const v = B.volts(r, b), vt = v < 0.5 ? '0.0 V' : jit(v).toFixed(1) + ' V';
    if (act) { readings++; log('AC volts, ' + name(r) + ' to ' + name(b) + ': ' + vt); }
    lcd(vt, 'AC volts');
  } else if (mode === 'D') {
    const v = B.dcVolts(r, b), vt = Math.abs(v) < 0.05 ? '0.00 V' : jit(v).toFixed(2) + ' V';
    if (act) { readings++; log('DC volts, ' + name(r) + ' to ' + name(b) + ': ' + vt); }
    lcd(vt, 'DC volts');
  } else {
    if (lineSide(r) || lineSide(b)) { if (act) strike('You put the meter in ohms on the line side of the disconnect. That side is live even with the handle off.'); return lcd('ERR', 'Line side is always live.', true); }
    if (B.disc) { if (act) strike('You took an ohm reading on a live circuit. Open the disconnect first.'); return lcd('ERR', 'Circuit is live. Open the disconnect.', true); }
    const o = B.ohms(r, b), ot = o === Infinity ? 'OL' : o >= 1e5 ? 'OL' : (o < 1 ? jit(o).toFixed(2) : o >= 1000 ? (jit(o) / 1000).toFixed(2) + ' k' : jit(o).toFixed(1)) + (o === Infinity || o >= 1e5 ? '' : ' Ω');
    if (act) { readings++; log('Ohms, ' + name(r) + ' to ' + name(b) + ': ' + ot); }
    lcd(ot, o === Infinity || o >= 1e5 ? 'Open circuit' : 'Resistance');
  }
}
function setMode(m) { mode = m; ['V', 'R', 'D'].forEach(k => $('m' + k).classList.toggle('on', k === m)); measure(!!(probes.red && probes.black)); }
function probeClick(id) {
  if (!active) return;
  if (probeSel) { const other = probeSel === 'red' ? 'black' : 'red'; if (probes[other] === id) probes[other] = null; probes[probeSel] = id; probeSel = null; }
  else if (probes.red === id) probes.red = null;
  else if (probes.black === id) probes.black = null;
  else if (!probes.red) probes.red = id;
  else if (!probes.black) probes.black = id;
  else probes.red = id;
  measure(!!(probes.red && probes.black));
}
function chipClick(which) {
  if (!active) return;
  if (probes[which] && probeSel !== which) { probes[which] = null; probeSel = which; }
  else probeSel = probeSel === which ? null : which;
  measure(false);
}

/* ---------- tools ---------- */
function clamp() {
  if (!active) return; readings++;
  const k = $('clampSel').value, a = B.amps(k), t = a < 0.05 ? '0.0 A' : a.toFixed(a < 1 ? 2 : 1) + ' A';
  $('clampOut').textContent = t; log('Clamp, ' + $('clampSel').selectedOptions[0].text.toLowerCase() + ': ' + t);
}
function mano() {
  if (!active) return; readings++;
  const k = $('manoSel').value, v = { inlet: B.pin, manifold: B.man, pilot: B.pilotP, air: B.air }[k];
  const t = (v * (1 + (Math.random() - 0.5) * 0.02)).toFixed(1) + ' in. w.c.';
  $('manoOut').textContent = t; log($('manoSel').selectedOptions[0].text + ': ' + t);
}
function pumpGauge() {
  if (!active) return; readings++;
  const k = $('pgSel').value; let t;
  if (k === 'dp') { const suc = B.P - 1.5 - (B.has('strainer') && B.pumpRun ? 3 : 0), dis = suc + B.dp; t = 'Suction ' + suc.toFixed(1) + ' psi · discharge ' + dis.toFixed(1) + ' psi · difference ' + B.dp.toFixed(1) + ' psi'; }
  else if (k === 'ret') t = 'Return water ' + Math.round(B.returnT()) + '°F';
  else t = 'Supply water ' + Math.round(B.Tb - 1) + '°F';
  $('pgOut').textContent = t; log(t);
}
function analyzer() {
  if (!active) return; readings++;
  const a = B.analyzer();
  if (!a) { $('anaOut').textContent = 'No combustion: O2 20.9 %, CO 0 ppm. The burner is not firing.'; log('Combustion analyzer: burner not firing (room air).'); return; }
  $('anaOut').innerHTML = '<table>' + [['O2', a.o2.toFixed(1) + ' %'], ['CO2', a.co2.toFixed(1) + ' %'], ['CO (measured)', a.co + ' ppm'], ['CO (air free)', a.coAF + ' ppm'], ['Stack temp', a.stack + '°F'], ['Efficiency', a.eff.toFixed(1) + ' %']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  log('Combustion analyzer: O2 ' + a.o2.toFixed(1) + '%, CO ' + a.co + ' ppm, stack ' + a.stack + '°F, efficiency ' + a.eff.toFixed(1) + '%.');
}

/* ---------- rules ---------- */
function strike(msg) {
  strikes++; log('SAFETY STRIKE: ' + msg, 's'); renderHud();
  if (strikes >= 3) endLevel(false, 'Three safety strikes. A real tech gets sent home after that. Go over your safety routine and try again.');
}
function rmReset() {
  if (!active) return;
  if (B.rm.st !== 'LOCKOUT') { log('Reset pressed. The relay module is not locked out, so nothing happens.'); return; }
  if (!B.rmOK() || !B.lastPow) { log('The display is dark. No power to the relay module, so the reset does nothing.'); return; }
  B.rmReset();
  log('Relay module reset. It starts the sequence again.', 'h');
  if (B.resetsSinceFix >= 3) strike('You reset a locked-out burner three times without finding the cause. Each failed light-off can leave unburned gas in the combustion chamber.');
}
function rmHistory() {
  const h = B.rm.hist;
  sheet(`<div class="kick">Keyboard display · lockout history</div><h3>Last lockouts</h3>` + (h.length ? '<table class="hist">' + h.map((x, i) => `<tr><td>${i + 1}. during ${esc(x.at)}</td><td>${esc(x.msg)}</td></tr>`).join('') + '</table>' : '<p>No lockouts stored.</p>') + `<div class="row"><button class="btn go" type="button" id="hClose">Close</button></div>`);
  $('hClose').onclick = closeSheet;
}
function setSwitches() {
  [['discBtn', B.disc], ['callBtn', B.call], ['bsBtn', B.burnerSw]].forEach(p => { const b = $(p[0]); b.className = 'btn sw ' + (p[1] ? 'on' : 'off'); b.querySelector('em').textContent = p[1] ? 'ON' : 'OFF'; });
}
function installPart(k) {
  if (!active) return;
  const p = PARTS[k];
  if (!p.live && B.disc) return strike('You started work on the boiler with the disconnect closed. 120 V was live in the cabinet and the burner could start.');
  partsUsed++;
  if (p.reset) {
    const was = p.reset === 'hl' ? B.hlTrip : p.reset === 'lg' ? B.lgTrip : B.hgTrip;
    if (!was) { wrongParts++; log(p.name + ': it was not tripped.', 's'); return; }
    if (p.reset === 'hl') { if (B.Tb > HL_SET - 15) { partsUsed--; log('The high limit will not reset yet. The water is still ' + Math.round(B.Tb) + '°F. Let it cool below ' + (HL_SET - 15) + '°F.', 'h'); return; } B.hlTrip = false; }
    if (p.reset === 'lg') { B.lgTrip = false; B.tick(0.01); if (B.lgTrip) { log('Low gas pressure switch reset. It popped right back out: the gas pressure at the switch is still too low.', 's'); return; } }
    if (p.reset === 'hg') B.hgTrip = false;
    B.resetsSinceFix = 0; log(p.name.replace('Press', 'Pressed') + '. It latched in.', 'g'); updateStatus(); return;
  }
  const cured = [...B.faults].filter(f => FIXES[f] === k);
  if (cured.length) {
    cured.forEach(f => B.faults.delete(f));
    B.resetsSinceFix = 0;
    if (k === 'rm') { B.rm.st = 'OFF'; B.rm.lock = ''; }
    log('Done: ' + p.name + '.', 'g');
    if (B.faults.size) log('Watch how the boiler behaves now.', 'g');
    else log('That should take care of it. Make sure every switch and the relay module are reset, then watch the boiler fire normally.', 'g');
  } else if (p.jumper) { wrongParts++; log('You looked at those terminals. There is no jumper on them.', 's'); }
  else { wrongParts++; log('Done: ' + p.name + '. It made no difference. That part was fine.', 's'); }
  updateStatus(); measure(false);
}

/* ---------- levels ---------- */
function startLevel(i) {
  li = i; const l = LEVELS[i];
  B.reset(l.faults, i + 3, { pre: l.pre, resets: l.resets });
  probes = { red: null, black: null }; probeSel = null;
  strikes = 0; readings = 0; wrongParts = 0; partsUsed = 0; hintsUsed = 0; active = false; explore = false; winWait = 0;
  $('log').innerHTML = ''; ['clampOut', 'manoOut', 'pgOut', 'anaOut'].forEach(id => { $(id).textContent = '---'; });
  $('picSel').innerHTML = '<h3>Look closely</h3><p class="dim">Click any part of the boiler room to inspect it.</p>';
  document.querySelectorAll('.spot .ring').forEach(r => { r.style.display = 'none'; });
  renderTabs(); renderHud(); renderTicket(); updateStatus(); measure(false);
  sheet(`<div class="kick">Level ${l.n} · ${esc(l.rank)}</div><h3>${esc(l.title)}</h3><p style="color:var(--dim)">${esc(l.site)}</p><p>${esc(l.ticket)}</p>
    <p style="color:var(--dim);font-size:13px">Tools: multimeter (AC volts, ohms, DC volts for the flame signal), clamp meter, manometer, pump gauges, pipe thermometers and a combustion analyzer. Open the disconnect before any ohm reading or repair.</p>
    <div class="row"><button class="btn" id="custBtn0" type="button">Talk to the customer first</button><button class="btn go" id="goBtn" type="button">Start job</button></div>`);
  $('goBtn').onclick = () => { closeSheet(); active = true; t0 = Date.now(); log('On site. The building controls are calling for heat.'); };
  $('custBtn0').onclick = () => { $('goBtn').onclick(); custSheet(); };
}
function endLevel(win, msg) {
  active = false; const l = LEVELS[li];
  if (!win) {
    sheet(`<div class="kick">Job failed</div><h3>${esc(l.title)}</h3><p>${esc(msg)}</p><div class="row"><button class="btn go" id="rBtn" type="button">Try again</button></div>`);
    $('rBtn').onclick = () => startLevel(li); return;
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  let stars = 3 - (strikes ? 1 : 0) - (wrongParts ? 1 : 0) - (hintsUsed || readings > l.par * 2 ? 1 : 0);
  stars = Math.max(1, stars);
  doneSet.add(l.id); saveDone(); renderTabs();
  const last = li === LEVELS.length - 1;
  sheet(`<div class="kick">Job complete</div><h3>${esc(l.title)}</h3>
    <div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
    <p>${last ? 'Every call is done. The boiler is firing normally and the building is warm.' : 'The boiler is firing normally and the building is warming up.'}</p>
    <table><tr><td>Readings taken (par ${l.par})</td><td>${readings}</td></tr><tr><td>Hints used</td><td>${hintsUsed}</td></tr><tr><td>Safety strikes</td><td>${strikes}</td></tr>
    <tr><td>Wrong parts</td><td>${wrongParts}</td></tr><tr><td>Parts and repairs</td><td>${partsUsed}</td></tr><tr><td>Time on the job</td><td>${mmss(secs)}</td></tr></table>
    <div class="row"><button class="btn" id="exploreBtn" type="button">Keep exploring</button><button class="btn" id="againBtn" type="button">Replay</button>${last ? '' : '<button class="btn go" id="nextBtn" type="button">Next job</button>'}</div>`);
  $('againBtn').onclick = () => startLevel(li);
  $('exploreBtn').onclick = () => { explore = true; active = true; closeSheet(); log('Job closed out. Free look: keep using the meters and tools. Nothing is scored now.', 'h'); };
  if (!last) $('nextBtn').onclick = () => startLevel(li + 1);
}
function hint() {
  if (!active || explore) return;
  const h = LEVELS[li].hints || []; if (!h.length) return;
  const i = Math.min(hintsUsed, h.length - 1); hintsUsed++;
  log('Hint: ' + h[i], 'h');
}
function custSheet() {
  const l = LEVELS[li], Q = [['when', 'When did this start?'], ['work', 'Has anyone worked on it lately?'], ['lights', 'Any lights or messages on the boiler?'], ['noise', 'Any noises or smells?']];
  sheet(`<div class="kick">${esc(l.site)}</div><h3>Talk to the customer</h3><div class="qa">` + Q.map(q => `<button class="btn" type="button" data-q="${q[0]}">${q[1]}</button>`).join('') + `</div><div class="ans" id="ans">Ask a question.</div><div class="row"><button class="btn go" type="button" id="cClose">Back to work</button></div>`);
  $('sheet').querySelectorAll('[data-q]').forEach(b => { b.onclick = () => { $('ans').textContent = '“' + (l.cust[b.dataset.q] || 'I am not sure.') + '”'; }; });
  $('cClose').onclick = closeSheet;
}
function inspect(k) {
  document.querySelectorAll('.spot .ring').forEach(r => { r.style.display = r.parentNode.dataset.spot === k ? '' : 'none'; });
  const t = inspectText(k, B);
  $('picSel').innerHTML = `<h3>${esc(SPOTS[k][2])}</h3><p>${esc(t)}</p>`;
  if (active) log('Looked at ' + SPOTS[k][2].toLowerCase() + ': ' + t);
}

/* ---------- start-up ---------- */
function buildPartOptions() {
  $('partSel').innerHTML = PART_GROUPS.map(g => `<optgroup label="${g}">` + Object.keys(PARTS).filter(k => PARTS[k].g === g).map(k => `<option value="${k}">${esc(PARTS[k].name)}</option>`).join('') + '</optgroup>').join('');
}
function buildNav() {
  const sc = $('unitScroll'), svg = $('unitSvg'), scale = () => svg.getBoundingClientRect().width / PANEL_W;
  /* old smartboard browsers have no element.scrollTo: set scrollTop there */
  const scrollPanel = y => { y = Math.max(0, y); if (sc.scrollTo) sc.scrollTo({ top: y, behavior: 'smooth' }); else sc.scrollTop = y; };
  const groups = NAV.map(() => []);
  Object.keys(TPOS).forEach(id => { let k = 0; NAV.forEach((n, q) => { if (n[1] <= TPOS[id][1]) k = q; }); groups[k].push(id); });
  $('unitNav').innerHTML = NAV.map((n, i) => `<button class="chip" data-i="${i}" type="button">${esc(n[0])}</button>`).join('') +
    '<select id="findTerm" aria-label="Find a terminal"><option value="">Find a terminal…</option>' + groups.map((g, q) => g.length ? `<optgroup label="${esc(NAV[q][0])}">` + g.map(id => `<option value="${id}">${esc(NODES[id])}</option>`).join('') + '</optgroup>' : '').join('') + '</select>';
  $('unitNav').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; scrollPanel(NAV[+c.dataset.i][1] * scale() - 6); };
  $('findTerm').onchange = e => {
    const id = e.target.value; if (!id) return;
    scrollPanel((TPOS[id][1] - 120) * scale());
    const t = document.querySelector(`#unitSvg .term[data-id="${id}"]`); if (t) { t.classList.remove('flash'); void t.getBoundingClientRect(); t.classList.add('flash'); }
    e.target.value = '';
  };
}
function initViews() {
  const VIEWS = ['desktop', 'phone', 'board'], VLABEL = { desktop: 'View: Desktop', phone: 'View: Phone', board: 'View: Smartboard' };
  let viewMode = 'desktop', boardAdj = 1;
  try { boardAdj = +localStorage.getItem('blr_bz') || 1; } catch (e) {}
  const applyBoardZoom = () => { const z = Math.max(1, Math.min(3.5, window.innerWidth / 1536 * boardAdj)); document.documentElement.style.setProperty('--bz', viewMode === 'board' ? z.toFixed(3) : '1'); };
  const setView = (m, save) => {
    viewMode = m; const r = document.documentElement.classList;
    r.toggle('phone', m === 'phone'); r.toggle('board', m === 'board'); applyBoardZoom();
    $('viewBtn').textContent = VLABEL[m];
    if (save) try { localStorage.setItem('blr_view', m); } catch (e) {}
  };
  let v = null; try { v = localStorage.getItem('blr_view'); } catch (e) {}
  setView(VIEWS.indexOf(v) >= 0 ? v : window.innerWidth >= 2560 ? 'board' : window.innerWidth <= 900 ? 'phone' : 'desktop', false);
  $('viewBtn').onclick = () => setView(VIEWS[(VIEWS.indexOf(viewMode) + 1) % 3], true);
  const bz = d => { boardAdj = Math.max(0.6, Math.min(2, boardAdj + d)); try { localStorage.setItem('blr_bz', boardAdj); } catch (e) {} applyBoardZoom(); };
  $('bzUp').onclick = () => bz(0.1); $('bzDn').onclick = () => bz(-0.1);
  window.addEventListener('resize', applyBoardZoom);
  /* panel zoom */
  const Z = [100, 130, 160, 200, 250, 300]; let zi = 0;
  const applyZoom = () => { $('unitSvg').style.width = Z[zi] + '%'; $('zLbl').textContent = Z[zi] + '%'; };
  $('zIn').onclick = () => { zi = Math.min(Z.length - 1, zi + 1); applyZoom(); };
  $('zOut').onclick = () => { zi = Math.max(0, zi - 1); applyZoom(); };
  if (viewMode === 'phone') { zi = 3; applyZoom(); }
}
function init() {
  $('unitSvg').innerHTML = buildPanel();
  $('schemSvg').innerHTML = buildLadder();
  $('picSvg').innerHTML = buildPic();
  $('specBody').innerHTML = buildSpecs(); $('plateBody').innerHTML = buildPlate();
  buildPartOptions(); buildNav(); initViews();
  ['Unit', 'Schem', 'Pic', 'Order', 'Plate', 'Spec'].forEach(k => { $('tab' + k).onclick = () => setTab(k); });
  $('tabSel').onchange = e => setTab(e.target.value);
  $('unitSvg').addEventListener('click', e => { const t = e.target.closest('.term'); if (t) probeClick(t.dataset.id); });
  $('unitSvg').addEventListener('keydown', e => { const t = e.target.closest('.term'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); probeClick(t.dataset.id); } });
  $('picSvg').addEventListener('click', e => { const t = e.target.closest('.spot'); if (t) inspect(t.dataset.spot); });
  $('picSvg').addEventListener('keydown', e => { const t = e.target.closest('.spot'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inspect(t.dataset.spot); } });
  $('mV').onclick = () => setMode('V'); $('mR').onclick = () => setMode('R'); $('mD').onclick = () => setMode('D');
  $('chipR').onclick = () => chipClick('red'); $('chipK').onclick = () => chipClick('black');
  $('clearP').onclick = () => { probes = { red: null, black: null }; probeSel = null; measure(false); };
  $('wireTog').onclick = () => { const on = $('unitSvg').classList.toggle('nowires'); $('wireTog').textContent = 'Wires: ' + (on ? 'Off' : 'On'); $('wireTog').setAttribute('aria-pressed', String(!on)); };
  $('discBtn').onclick = () => { if (!active) return; B.disc = !B.disc; log(B.disc ? 'Disconnect closed. Power is on.' : 'Disconnect opened. Power is off to the boiler controls (the line side is still live).'); B.tick(0.01); updateStatus(); measure(false); };
  $('callBtn').onclick = () => { if (!active) return; B.call = !B.call; log('Heating call from the building controls ' + (B.call ? 'ON.' : 'OFF.')); B.tick(0.01); updateStatus(); measure(false); };
  $('bsBtn').onclick = () => { if (!active) return; B.burnerSw = !B.burnerSw; log('Burner switch ' + (B.burnerSw ? 'ON.' : 'OFF.')); B.tick(0.01); updateStatus(); measure(false); };
  $('custBtn').onclick = custSheet; $('rmReset').onclick = rmReset; $('rmHist').onclick = rmHistory;
  $('clampBtn').onclick = clamp; $('manoBtn').onclick = mano; $('pgBtn').onclick = pumpGauge; $('anaBtn').onclick = analyzer;
  $('installBtn').onclick = () => installPart($('partSel').value);
  $('hintBtn').onclick = hint; $('restartBtn').onclick = () => startLevel(li);
  $('resetProg').onclick = () => { if (!confirm('Clear all completed levels?')) return; doneSet = new Set(); saveDone(); startLevel(0); };
  setTab('Unit');
  const first = LEVELS.findIndex(l => !doneSet.has(l.id));
  startLevel(first < 0 ? 0 : first);
  setInterval(() => {
    if (!active) return;
    B.tick(0.25);
    updateStatus(); measure(false);
    if (!explore && B.healthy()) { winWait += 0.25; if (winWait >= 2) endLevel(true); } else winWait = 0;
  }, 250);
}
if ($('unitSvg')) init();   /* test.html loads the same code without the game screen */

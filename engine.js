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

/* ===== Hot-water boiler simulation: 208 V 3-phase power (blower and pump motors), 120 V control circuit from a control
   transformer, 7800-series flame safeguard (on/off burner), water side (pump, flow, pressure, expansion tank, relief valve)
   and combustion (gas pressures, air, flue gas).
   Written in plain ES2017 on purpose: the classroom smartboard browser is old. ===== */

const SPEED = 2;            /* flame safeguard timers run at twice real time so a full start takes about 40 s, not 80 s */
const FLAME_MIN = 1.25;     /* flame signal (V dc at the test jacks) needed to prove flame */
const OC_SET = 180, OC_DIFF = 15, HL_SET = 210;   /* operating aquastat opens at 180 and closes at 165; manual reset high limit 210 */
const XF_RATIO = 120 / 208; /* control transformer 208 V primary, 120 V secondary */

/* every probe point on the panel, in the words a tech would use */
const NODES = {
  LN_L1: 'Disconnect, line side L1 (always live)', LN_L2: 'Disconnect, line side L2 (always live)', LN_L3: 'Disconnect, line side L3 (always live)',
  F1_IN: 'Disconnect fuse F1, in', F2_IN: 'Disconnect fuse F2, in', F3_IN: 'Disconnect fuse F3, in',
  F1_OUT: 'Disconnect fuse F1, out', F2_OUT: 'Disconnect fuse F2, out', F3_OUT: 'Disconnect fuse F3, out',
  XF_H1: 'Control transformer H1 (208 V primary)', XF_H2: 'Control transformer H2 (208 V primary)',
  XF_X1: 'Control transformer X1 (120 V secondary)', XF_X2: 'Control transformer X2 (secondary, grounded)',
  FU_IN: 'Control fuse FU4, in', FU_OUT: 'Control fuse FU4, out (120 V bus)',
  NB: 'Neutral bar (X2)', GND: 'Ground lug (bare metal)',
  M1_L1: 'Blower contactor M1 L1 (line)', M1_L2: 'Blower contactor M1 L2 (line)', M1_L3: 'Blower contactor M1 L3 (line)',
  M1_T1: 'Blower contactor M1 T1 (load)', M1_T2: 'Blower contactor M1 T2 (load)', M1_T3: 'Blower contactor M1 T3 (load)',
  M1_A: 'Blower contactor M1 coil A (from RM 3)', M1_B: 'Blower contactor M1 coil B (neutral)',
  BM_T1: 'Blower motor T1', BM_T2: 'Blower motor T2', BM_T3: 'Blower motor T3',
  PS_L1: 'Pump starter L1 (line)', PS_L2: 'Pump starter L2 (line)', PS_L3: 'Pump starter L3 (line)',
  PS_T1: 'Pump starter T1 (to motor)', PS_T2: 'Pump starter T2 (to motor)', PS_T3: 'Pump starter T3 (to motor)',
  PS_A: 'Pump starter coil A', PS_B: 'Pump starter coil B (neutral)',
  OL_95: 'Pump overload contact 95 (NC, in from the 120 V bus)', OL_96: 'Pump overload contact 96 (NC, out to coil)',
  PM_T1: 'Pump motor T1', PM_T2: 'Pump motor T2', PM_T3: 'Pump motor T3',
  EN_1: 'Heating call contact (building controls), in', EN_2: 'Heating call contact (building controls), out (burner enable)',
  BS_1: 'Burner switch, in', BS_2: 'Burner switch, out',
  OC_1: 'Operating aquastat, in', OC_2: 'Operating aquastat, out',
  HL_1: 'High limit (manual reset), in', HL_2: 'High limit (manual reset), out',
  LW_1: 'Low-water cutoff, in', LW_2: 'Low-water cutoff, out',
  FS_1: 'Flow switch, in', FS_2: 'Flow switch, out (to RM terminal 6)',
  LG_1: 'Low gas pressure switch, in', LG_2: 'Low gas pressure switch, out',
  HG_1: 'High gas pressure switch, in', HG_2: 'High gas pressure switch, out',
  AP_1: 'Air proving switch, common', AP_2: 'Air proving switch, normally open (to RM terminal 7)',
  RM_L1: 'Relay module L1 (power in)', RM_L2: 'Relay module L2 (neutral)',
  RM_3: 'Relay module 3 (blower contactor out)', RM_4: 'Relay module 4 (alarm out)',
  RM_6: 'Relay module 6 (limits and operating control in)', RM_7: 'Relay module 7 (lockout interlock in)',
  RM_8: 'Relay module 8 (pilot valve out)', RM_9: 'Relay module 9 (main valves out)', RM_10: 'Relay module 10 (ignition out)',
  FT_P: 'Flame signal test jack + (V dc)', FT_N: 'Flame signal test jack − (common)',
  AL_1: 'Alarm light, from RM 4', AL_2: 'Alarm light, neutral',
  PV_1: 'Pilot valve coil, from RM 8', PV_2: 'Pilot valve coil, neutral',
  V1_1: 'Main valve V1 coil, from RM 9', V1_2: 'Main valve V1 coil, neutral',
  V2_1: 'Main valve V2 coil, from RM 9', V2_2: 'Main valve V2 coil, neutral',
  IG_1: 'Ignition transformer primary, from RM 10', IG_2: 'Ignition transformer primary, neutral'
};

/* points joined by wire (one list per wire run) */
const NETS = [
  ['LN_L1'], ['LN_L2'], ['LN_L3'], ['F1_IN'], ['F2_IN'], ['F3_IN'],
  ['F1_OUT', 'XF_H1', 'M1_L1', 'PS_L1'], ['F2_OUT', 'XF_H2', 'M1_L2', 'PS_L2'], ['F3_OUT', 'M1_L3', 'PS_L3'],
  ['M1_T1', 'BM_T1'], ['M1_T2', 'BM_T2'], ['M1_T3', 'BM_T3'], ['PS_T1', 'PM_T1'], ['PS_T2', 'PM_T2'], ['PS_T3', 'PM_T3'],
  ['XF_X1', 'FU_IN'], ['FU_OUT', 'EN_1', 'RM_L1', 'OL_95'], ['EN_2', 'BS_1'], ['OL_96', 'PS_A'],
  ['BS_2', 'OC_1'], ['OC_2', 'HL_1'], ['HL_2', 'LW_1'], ['LW_2', 'FS_1'], ['FS_2', 'RM_6', 'LG_1'], ['LG_2', 'HG_1'], ['HG_2', 'AP_1'], ['AP_2', 'RM_7'],
  ['RM_3', 'M1_A'], ['RM_4', 'AL_1'], ['RM_8', 'PV_1'], ['RM_9', 'V1_1', 'V2_1'], ['RM_10', 'IG_1'],
  ['XF_X2', 'NB', 'GND', 'PS_B', 'M1_B', 'RM_L2', 'AL_2', 'PV_2', 'V1_2', 'V2_2', 'IG_2'],
  ['FT_P'], ['FT_N']
];
const NET_OF = {};
NETS.forEach((n, i) => n.forEach(x => { NET_OF[x] = i; }));

/* ---------- a small resistor-network solver: AC voltages (as phasors) with the power on, ohms with it off ---------- */
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
/* potentials of every wire run as [re, im] phasors; fixed = {node: [re, im]}; anything not tied to a source floats (null).
   Everything is resistive, so the real and imaginary parts solve separately with the same matrix. */
function solveVolts(els, fixed) {
  const G = netGroups(els), V = {}, fixedG = {};
  Object.keys(fixed).forEach(id => { fixedG[G.g[NET_OF[id]]] = fixed[id]; });
  const reach = new Set();
  Object.keys(fixedG).forEach(k => component(+k, G.res).forEach(x => reach.add(x)));
  const unk = [...reach].filter(x => fixedG[x] === undefined), idx = {};
  unk.forEach((x, i) => { idx[x] = i; });
  const mk = () => unk.map(() => unk.map(() => 0));
  const A = mk(), br = unk.map(() => 0), bi = unk.map(() => 0);
  G.res.forEach(e => {
    const c = 1 / e[2];
    [[e[0], e[1]], [e[1], e[0]]].forEach(p => {
      const i = idx[p[0]]; if (i === undefined) return;
      A[i][i] += c;
      if (idx[p[1]] !== undefined) A[i][idx[p[1]]] -= c; else if (fixedG[p[1]] !== undefined) { br[i] += c * fixedG[p[1]][0]; bi[i] += c * fixedG[p[1]][1]; }
    });
  });
  const A2 = A.map(r => r.slice());
  const sr = unk.length ? gauss(A, br) : [], si = unk.length ? gauss(A2, bi) : [];
  NETS.forEach((n, i) => { const g = G.g[i]; V[i] = fixedG[g] !== undefined ? fixedG[g] : idx[g] !== undefined ? [sr[idx[g]], si[idx[g]]] : null; });
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
const phasor = (mag, deg) => [mag * Math.cos(deg * Math.PI / 180), mag * Math.sin(deg * Math.PI / 180)];

/* ---------- the boiler ---------- */
const RM_TEXT = { OFF: 'NO POWER', INIT: 'INITIATE', STANDBY: 'STANDBY', PURGE: 'PREPURGE', PFEP: 'PILOT IGN (PFEP)', MFEP: 'MAIN IGN (MFEP)', RUN: 'RUN', POST: 'POSTPURGE', LOCKOUT: 'LOCKOUT', HOLD: 'STANDBY HOLD' };
const RM_OUT = { 3: ['PURGE', 'PFEP', 'MFEP', 'RUN', 'POST'], 8: ['PFEP', 'MFEP'], 10: ['PFEP'], 9: ['MFEP', 'RUN'], 4: ['LOCKOUT'] };

const Boiler = {
  faults: new Set(), disc: true, call: true, burnerSw: true,
  rm: null, Tb: 140, ocOpen: false, hlTrip: false, lgTrip: false, hgTrip: false, lockedOnce: false,
  pilot: false, main: false, spark: false, sig: 0, air: 0, flow: 0, dp: 0, pin: 7.2, man: 0, pilotP: 0,
  pumpRun: false, blowerRun: false, pumpHum: false, blowerHum: false, olTrip: false, humT: 0, P: 18, relief: 'dry', time: 0, seed: 1, quiet: false, V: {}, en: {}, onLog: null, resetsSinceFix: 0,

  has(f) { return this.faults.has(f); },
  reset(faults, seed, opt) {
    opt = opt || {};
    this.faults = new Set(faults); this.seed = seed || 1;
    this.disc = true; this.call = true; this.burnerSw = true;
    this.rm = { st: 'OFF', t: 0, el: 0, ilk: false, hold: 0, hist: [], lock: '', runT: 0, lowSig: 0 };
    this.Tb = opt.Tb != null ? opt.Tb : 138 + (seed % 5) * 2; this.ocOpen = false; this.hlTrip = false; this.lgTrip = false; this.hgTrip = false;
    this.pilot = false; this.main = false; this.spark = false; this.sig = 0; this.air = 0; this.flow = 0; this.dp = 0;
    this.pumpRun = false; this.blowerRun = false; this.pumpHum = false; this.blowerHum = false; this.olTrip = false; this.humT = 0; this.time = 0; this.resetsSinceFix = 0; this.en = {};
    this.line = 205 + (seed % 4) * 1.3;
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
  rmPowered() { return this.rmOK() && this.mag('RM_L1') > 90; },
  rmOK() { return !this.has('rm_bad'); },
  out(n) { const r = this.rm; return !!(r && this.rmOK() && this.lastPow && RM_OUT[n].indexOf(r.st) >= 0); },

  elements() {
    const f = this.faults, O = Infinity, sw = on => on ? 0 : O, en = this.en;
    const leg = k => f.has('fuse_L' + k) ? O : 0;
    const m1 = k => sw(en.m1 && !(k === 3 && f.has('m1_pole')));
    return [
      /* 208 V power */
      ['LN_L1', 'F1_IN', sw(this.disc)], ['LN_L2', 'F2_IN', sw(this.disc)], ['LN_L3', 'F3_IN', sw(this.disc)],
      ['F1_IN', 'F1_OUT', leg(1)], ['F2_IN', 'F2_OUT', leg(2)], ['F3_IN', 'F3_OUT', leg(3)],
      ['XF_H1', 'XF_H2', f.has('xfmr_open') ? O : 45],
      ['M1_L1', 'M1_T1', m1(1)], ['M1_L2', 'M1_T2', m1(2)], ['M1_L3', 'M1_T3', m1(3)],
      ['PS_L1', 'PS_T1', sw(en.ps)], ['PS_L2', 'PS_T2', sw(en.ps)], ['PS_L3', 'PS_T3', sw(en.ps)],
      /* motor windings in delta */
      ['BM_T1', 'BM_T2', f.has('blower_open') ? O : 9.6], ['BM_T2', 'BM_T3', 9.6], ['BM_T3', 'BM_T1', 9.6],
      ['PM_T1', 'PM_T2', f.has('pm_open') ? O : 7.2], ['PM_T2', 'PM_T3', 7.2], ['PM_T3', 'PM_T1', 7.2],
      /* 120 V control */
      ['FU_IN', 'FU_OUT', f.has('fuse_open') ? O : 0],
      ['EN_1', 'EN_2', sw(this.call)], ['OL_95', 'OL_96', sw(!this.olTrip)], ['PS_A', 'PS_B', f.has('ps_coil') ? O : 260],
      ['M1_A', 'M1_B', f.has('m1_coil') ? O : 280],
      ['BS_1', 'BS_2', sw(this.burnerSw)], ['OC_1', 'OC_2', sw(this.ocClosed())], ['HL_1', 'HL_2', sw(this.hlClosed())],
      ['LW_1', 'LW_2', sw(this.lwClosed())], ['FS_1', 'FS_2', sw(this.fsClosed())],
      ['LG_1', 'LG_2', sw(!this.lgTrip)], ['HG_1', 'HG_2', sw(!this.hgTrip)], ['AP_1', 'AP_2', sw(this.apClosed())],
      ['RM_L1', 'RM_L2', 3300], ['RM_6', 'RM_L2', 22000], ['RM_7', 'RM_L2', 22000],
      ['RM_L1', 'RM_3', sw(this.out(3))], ['RM_L1', 'RM_4', sw(this.out(4))], ['RM_L1', 'RM_8', sw(this.out(8))], ['RM_L1', 'RM_9', sw(this.out(9))], ['RM_L1', 'RM_10', sw(this.out(10))],
      ['AL_1', 'AL_2', 150], ['PV_1', 'PV_2', f.has('pv_open') ? O : 640],
      ['V1_1', 'V1_2', f.has('v1_open') ? O : 1150], ['V2_1', 'V2_2', f.has('v2_open') ? O : 1150], ['IG_1', 'IG_2', f.has('ig_open') ? O : 2.2]
    ];
  },
  /* wye 208 V service with a grounded neutral: each leg is 120 V to ground. The control transformer secondary follows
     whatever its primary sees, so it is solved in two passes: power side first, then the 120 V side from X1 */
  solve() {
    const L = this.line / Math.sqrt(3), src = { LN_L1: phasor(L, 0), LN_L2: phasor(L, -120), LN_L3: phasor(L, 120), GND: [0, 0] };
    const els = this.elements();
    let V = solveVolts(els, src);
    const h1 = V[NET_OF.XF_H1], h2 = V[NET_OF.XF_H2];
    if (h1 && h2 && !this.faults.has('xfmr_open')) {
      src.XF_X1 = [(h1[0] - h2[0]) * XF_RATIO, (h1[1] - h2[1]) * XF_RATIO];
      if (Math.hypot(src.XF_X1[0], src.XF_X1[1]) > 1) V = solveVolts(els, src); else delete src.XF_X1;
    }
    this.V = V;
  },
  vAt(id) { const v = this.V[NET_OF[id]]; return v == null ? null : v; },
  mag(id) { const v = this.vAt(id); return v ? Math.hypot(v[0], v[1]) : 0; },
  across(a, b) { const x = this.vAt(a), y = this.vAt(b); if (x == null || y == null) return 0; return Math.hypot(x[0] - y[0], x[1] - y[1]); },
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
    for (let k = 0; k < 3; k++) {        /* settle: coils pull in, then their contacts change the circuit */
      this.solve();
      this.lastPow = this.rmOK() && this.mag('RM_L1') > 90;
      this.en.ps = this.across('PS_A', 'PS_B') > 85 && !f.has('ps_coil');
      this.en.m1 = this.across('M1_A', 'M1_B') > 85 && !f.has('m1_coil');
    }
    const on = (a, b) => this.across(a, b) > 90;
    /* a 3-phase motor starts only with all three legs; on two legs (single-phasing) or with a winding open it hums */
    const three = (p, k) => on(p + '1', p + '2') && on(p + '2', p + '3') && on(p + '3', p + '1') && Math.min(this.across(p + '1', p + '2'), this.across(p + '2', p + '3'), this.across(p + '3', p + '1')) > 180;
    const any = p => on(p + '1', p + '2') || on(p + '2', p + '3') || on(p + '3', p + '1');
    const pumpV = three('PM_T') && !f.has('pm_open'), blowV = three('BM_T') && !f.has('blower_open');
    this.pumpHum = !pumpV && any('PM_T'); this.blowerHum = !blowV && any('BM_T');
    /* the pump overload trips after a few seconds of locked-rotor current and stays out until someone resets it */
    if (this.pumpHum) { this.humT += dt; if (this.humT > 8) { this.olTrip = true; this.note('Pump overload tripped.'); } } else this.humT = 0;
    this.en.pumpV = pumpV || this.pumpHum; this.en.blowV = blowV || this.blowerHum;
    this.en.pv = on('PV_1', 'PV_2') && !f.has('pv_open');
    this.en.v1 = on('V1_1', 'V1_2') && !f.has('v1_open');
    this.en.v2 = on('V2_1', 'V2_2') && !f.has('v2_open');
    this.en.ig = on('IG_1', 'IG_2') && !f.has('ig_open');
    this.en.alarm = on('AL_1', 'AL_2');

    /* water side */
    this.pumpRun = pumpV;
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
    this.blowerRun = blowV;
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
    const r = this.rm, pow = this.rmOK() && this.mag('RM_L1') > 90;
    const t6 = this.mag('RM_6') > 90, t7 = this.mag('RM_7') > 90, flame = this.sig >= FLAME_MIN;
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
    if (!this.rmOK() || this.mag('RM_L1') < 90) return false;
    r.st = 'INIT'; r.t = 10; r.el = 0; r.lock = '';
    if (!silent) this.resetsSinceFix++;
    return true;
  },

  /* ----- readings for the tools ----- */
  /* clamp readings. Motor legs: running current, or locked-rotor current on the legs that still have power */
  amps(where) {
    const j = v => v * (1 + Math.sin(this.time * 3.1) * 0.01), f = this.faults;
    const pumpRun = f.has('coupler') ? 1.4 : f.has('iso_closed') ? 2.4 : f.has('air_bound') ? 2.1 + Math.sin(this.time * 0.9) * 0.3 : f.has('strainer') ? 2.9 : 3.3;
    /* on a lost leg the dead terminal only shows a phantom voltage (about half) to the others, and carries no current */
    const motor = (run, hum, p, runA, lra, k) => run ? runA : !hum ? 0 : [1, 2, 3].some(o => o !== k && this.across(p + k, p + o) > 180) ? lra : 0;
    const m = {};
    [1, 2, 3].forEach(k => {
      m['pump' + k] = motor(this.pumpRun, this.pumpHum, 'PM_T', pumpRun, 16.5, k);
      m['blower' + k] = motor(this.blowerRun, this.blowerHum, 'BM_T', f.has('blower_dirty') ? 2.0 : 2.6, 13.8, k);
    });
    const ign = this.en.ig ? 1.3 : 0, pv = this.en.pv ? 0.19 : 0, mv = (this.en.v1 ? 0.1 : 0) + (this.en.v2 ? 0.1 : 0), al = this.en.alarm ? 0.35 : 0;
    const coils = (this.en.ps ? 0.45 : 0) + (this.en.m1 ? 0.4 : 0), rmc = this.lastPow ? 0.04 : 0;
    m.ign = ign;
    m.x1 = ign + pv + mv + al + coils + rmc;
    m.line = m.pump1 + m.blower1 + m.x1 * XF_RATIO;
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
      blower: this.blowerRun ? 'run' : this.blowerHum ? 'hum' : 'off',
      pump: this.pumpRun ? 'run' : this.pumpHum ? 'hum' : 'off',
      alarm: this.en.alarm, Tb: this.Tb, P: this.P, Tr: this.returnT(), relief: this.relief,
      lwLamp: this.lastPow !== undefined && this.mag('FU_OUT') > 90 && (f.has('lwco_dirty') || this.lowWater()),
      hlTrip: this.hlTrip, lgTrip: this.lgTrip, hgTrip: this.hgTrip, olTrip: this.olTrip
    };
  },
  healthy() {
    return this.faults.size === 0 && !this.hlTrip && !this.lgTrip && !this.hgTrip && !this.olTrip && this.rm.st === 'RUN' && this.rm.runT > 4;
  }
};

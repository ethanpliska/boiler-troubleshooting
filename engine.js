/* ===== Simulation of a Thermal Solutions EVA-3000 hot-water boiler (EVA3000BN1-UEBM), modelled on the EVA I&O manual
   (81456001 R12-6/16), Figure 9c "Standard UL/FM/CSD-1 Wiring Diagram (Modulation) EVA 2000S-3000":
   - 208 V 3-phase supply to a variable frequency drive (A/C Tech SCF) that runs the 2 hp combustion blower, and through
     two primary fuses to a control transformer (115 V secondary, X2 grounded) -> 5 A control circuit breaker.
   - Terminal strip TB1-TB13 exactly as the diagram numbers it; Honeywell RM7896D flame safeguard on its subbase
     (5 = power, 4 = blower, 6 = limits in, 7 = lockout interlock in, 8 = pilot, 9 = main valves, 10 = ignition, 3 = alarm).
   - Limit string TB5 -> high limit (L4008E, manual reset) -> operating switch (RWF55 Q13-Q14) -> low gas -> high gas ->
     flow switch (FS4-3) -> low-water cutoff -> vestibule fuse switch -> TB6. Combustion airflow switch TB6 -> TB7.
   - Modulation: RWF55 holds low fire until CRA2 "release to mod" (TD-1, 20 s after the main valves open), then
     sets blower speed (VFD) to the load; the SKP75 ratio valve follows the air.
   Written in plain ES2017 on purpose: the classroom smartboard browser is old. ===== */

const SPEED = 2;            /* flame safeguard timers run at twice real time */
const FLAME_MIN = 1.25;     /* RM7896 proves flame at 1.25 V dc; the manual's normal range is 1.5 - 5.0 V dc */
const RWF_SP = 180, RWF_ON = 175, RWF_OFF = 185, HL_SET = 210;   /* RWF55 setpoint (factory 180°F), burner on/off points; L4008E high limit */
const XF_RATIO = 115 / 208; /* control transformer, 208 V tap to 115 V */
const FS_MAKE = 110;        /* gpm at which the flow switch paddle closes (EVA-3000 minimum flow 131 gpm) */
const RELIEF = 50;          /* relief valve setting (set at time of purchase; 50 psi assumed) */

/* every probe point, in the words a tech would use */
const NODES = {
  LN_L1: 'Fused disconnect, line side L1 (always live)', LN_L2: 'Fused disconnect, line side L2 (always live)', LN_L3: 'Fused disconnect, line side L3 (always live)',
  F1_IN: 'Disconnect fuse F1, in', F2_IN: 'Disconnect fuse F2, in', F3_IN: 'Disconnect fuse F3, in',
  F1_OUT: 'Disconnect fuse F1, out (boiler L1)', F2_OUT: 'Disconnect fuse F2, out (boiler L2)', F3_OUT: 'Disconnect fuse F3, out (boiler L3)',
  VFD_L1: 'VFD input L1', VFD_L2: 'VFD input L2/N', VFD_L3: 'VFD input L3',
  VFD_U: 'VFD output U (to blower)', VFD_V: 'VFD output V (to blower)', VFD_W: 'VFD output W (to blower)',
  BM_U: 'Blower motor lead U', BM_V: 'Blower motor lead V', BM_W: 'Blower motor lead W',
  FUA_IN: 'Control transformer primary fuse FU1 (L1), in', FUA_OUT: 'Control transformer primary fuse FU1 (L1), out',
  FUB_IN: 'Control transformer primary fuse FU1 (L2), in', FUB_OUT: 'Control transformer primary fuse FU1 (L2), out',
  XF_H1: 'Control transformer H1', XF_H2: 'Control transformer H2 (208 V tap)', XF_X1: 'Control transformer X1 (115 V)', XF_X2: 'Control transformer X2 (grounded)',
  CB_1: '115 V control circuit breaker, line', CB_2: '115 V control circuit breaker, load',
  BS_1: 'Burner ON/OFF switch, terminal 1', BS_2: 'Burner ON/OFF switch, terminal 2',
  FL_C: 'Blocked air filter switch C', FL_NO: 'Blocked air filter switch NO (to filter light)',
  EN_1: 'Field enable / heating call (TB4 side)', EN_2: 'Field enable / heating call (TB5 side)',
  HL_1: 'High limit L4008E (manual reset), C', HL_2: 'High limit L4008E (manual reset), NC',
  OC_1: 'Operating switch RWF55 Q13', OC_2: 'Operating switch RWF55 Q14',
  LG_1: 'Low gas pressure switch C', LG_2: 'Low gas pressure switch NO',
  HG_1: 'High gas pressure switch C', HG_2: 'High gas pressure switch NC',
  FS_1: 'Water flow switch NO', FS_2: 'Water flow switch C',
  LW_1: 'Low-water cutoff, in', LW_2: 'Low-water cutoff, out',
  VF_1: 'Vestibule fuse switch, in', VF_2: 'Vestibule fuse switch, out (to TB6)',
  AP_1: 'Combustion airflow switch C', AP_2: 'Combustion airflow switch NO (to TB7)',
  RM_L2: 'RM7896D subbase L2 (neutral)', RM_3: 'RM7896D subbase 3 (alarm)', RM_4: 'RM7896D subbase 4 (blower)', RM_5: 'RM7896D subbase 5 (power)',
  RM_6: 'RM7896D subbase 6 (limits in)', RM_7: 'RM7896D subbase 7 (lockout interlock)', RM_8: 'RM7896D subbase 8 (pilot valve)',
  RM_9: 'RM7896D subbase 9 (main valves)', RM_10: 'RM7896D subbase 10 (ignition)',
  FT_P: 'Flame amplifier test jack + (V dc)', FT_N: 'Flame amplifier test jack − (common)',
  CR1_A: 'Relay CRA1 (enable blower) coil 14', CR1_B: 'Relay CRA1 (enable blower) coil 13',
  CR2_A: 'Relay CRA2 (release to mod) coil 14', CR2_B: 'Relay CRA2 (release to mod) coil 13',
  TD_1: 'Time delay TD-1, in (from TB9)', TD_2: 'Time delay TD-1, common',
  PV_1: 'Pilot gas valve V4046, lead 1', PV_2: 'Pilot gas valve V4046, lead 2',
  V1_1: 'SKP75 air/gas ratio actuator, L', V1_2: 'SKP75 air/gas ratio actuator, N',
  V2_1: 'Secondary gas valve, lead 1', V2_2: 'Secondary gas valve, lead 2',
  VV_1: 'Vent valve (normally open), lead 1', VV_2: 'Vent valve (normally open), lead 2',
  IG_1: 'Ignition transformer, lead 1', IG_2: 'Ignition transformer, lead 2',
  AL_1: 'Alarm light, from RM 3', AL_2: 'Alarm light, neutral',
  OL_95: 'System pump overload 95 (from TB3)', OL_96: 'System pump overload 96 (to starter coil)',
  PS_A: 'System pump starter coil A', PS_B: 'System pump starter coil B (neutral)',
  PS_L1: 'System pump starter L1', PS_L2: 'System pump starter L2', PS_L3: 'System pump starter L3',
  PS_T1: 'System pump starter T1', PS_T2: 'System pump starter T2', PS_T3: 'System pump starter T3',
  PM_T1: 'System pump motor T1', PM_T2: 'System pump motor T2', PM_T3: 'System pump motor T3',
  GND: 'Ground lug (chassis)'
};
for (let n = 1; n <= 12; n++) NODES['TB' + n] = 'Terminal block TB' + n;

/* points joined by wire (one list per wire run), following the Figure 9c wire numbers */
const NETS = [
  ['LN_L1'], ['LN_L2'], ['LN_L3'], ['F1_IN'], ['F2_IN'], ['F3_IN'],
  ['F1_OUT', 'VFD_L1', 'FUA_IN', 'PS_L1'], ['F2_OUT', 'VFD_L2', 'FUB_IN', 'PS_L2'], ['F3_OUT', 'VFD_L3', 'PS_L3'],
  ['VFD_U', 'BM_U'], ['VFD_V', 'BM_V'], ['VFD_W', 'BM_W'],
  ['FUA_OUT', 'XF_H1'], ['FUB_OUT', 'XF_H2'],
  ['XF_X1', 'TB1', 'CB_1'], ['CB_2', 'TB3', 'BS_1', 'RM_5', 'OL_95'], ['BS_2', 'TB4', 'FL_C', 'EN_1'], ['FL_NO'],
  ['EN_2', 'TB5', 'HL_1'], ['HL_2', 'OC_1'], ['OC_2', 'LG_1'], ['LG_2', 'HG_1'], ['HG_2', 'FS_1'], ['FS_2', 'LW_1'], ['LW_2', 'VF_1'],
  ['VF_2', 'TB6', 'RM_6', 'AP_1'], ['AP_2', 'TB7', 'RM_7'],
  ['RM_4', 'TB11', 'CR1_A'], ['RM_8', 'TB8', 'PV_1'], ['RM_9', 'TB9', 'V1_1', 'V2_1', 'VV_1', 'TD_1'], ['RM_10', 'TB10', 'IG_1'], ['RM_3', 'AL_1'],
  ['TB12', 'CR2_A'], ['OL_96', 'PS_A'],
  ['PS_T1', 'PM_T1'], ['PS_T2', 'PM_T2'], ['PS_T3', 'PM_T3'],
  ['XF_X2', 'TB2', 'GND', 'RM_L2', 'CR1_B', 'CR2_B', 'TD_2', 'PV_2', 'V1_2', 'V2_2', 'VV_2', 'IG_2', 'AL_2', 'PS_B'],
  ['FT_P'], ['FT_N']
];
const NET_OF = {};
NETS.forEach((n, i) => n.forEach(x => { NET_OF[x] = i; }));
const VFD_OUT = ['VFD_U', 'VFD_V', 'VFD_W', 'BM_U', 'BM_V', 'BM_W'];

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
const RM_TEXT = { OFF: 'NO POWER', INIT: 'INITIATE', STANDBY: 'STANDBY', HOLD: 'STANDBY HOLD', PURGE: 'PREPURGE', PFEP: 'PILOT IGN', MFEP: 'MAIN IGN', RUN: 'RUN', POST: 'POSTPURGE', LOCKOUT: 'LOCKOUT' };
const RM_OUT = { 4: ['PURGE', 'PFEP', 'MFEP', 'RUN', 'POST'], 8: ['PFEP', 'MFEP'], 10: ['PFEP'], 9: ['MFEP', 'RUN'], 3: ['LOCKOUT'] };

const Boiler = {
  faults: new Set(), disc: true, call: true, burnerSw: true,
  rm: null, Tb: 140, ocOpen: false, hlTrip: false, lgTrip: false, hgTrip: false, olTrip: false,
  pilot: false, main: false, spark: false, sig: 0, air: 0, flow: 0, dp: 0, pin: 10.5, man: 0, pilotP: 0,
  rate: 0, hz: 0, vfdFault: '', tdT: 0, pumpRun: false, blowerRun: false, pumpHum: false, humT: 0,
  P: 20, relief: 'dry', time: 0, seed: 1, quiet: false, V: {}, en: {}, onLog: null, resetsSinceFix: 0,

  has(f) { return this.faults.has(f); },
  reset(faults, seed, opt) {
    opt = opt || {};
    this.faults = new Set(faults); this.seed = seed || 1;
    this.disc = true; this.call = true; this.burnerSw = true;
    this.rm = { st: 'OFF', t: 0, el: 0, ilk: false, hold: 0, hist: [], lock: '', runT: 0, lowSig: 0 };
    this.Tb = opt.Tb != null ? opt.Tb : 138 + (seed % 5) * 2; this.ocOpen = false; this.hlTrip = false; this.lgTrip = false; this.hgTrip = false; this.olTrip = false;
    this.pilot = false; this.main = false; this.spark = false; this.sig = 0; this.air = 0; this.flow = 0; this.dp = 0;
    this.rate = 0; this.hz = 0; this.vfdFault = ''; this.tdT = 0;
    this.pumpRun = false; this.blowerRun = false; this.pumpHum = false; this.humT = 0; this.time = 0; this.resetsSinceFix = 0; this.en = {};
    this.line = 205 + (seed % 4) * 1.3;
    /* the boiler ran (or tried to) before the tech got there: play that out so the job is found as the customer left it */
    this.quiet = true;
    const pre = opt.pre != null ? opt.pre : 260;
    for (let i = 0; i < pre * 2; i++) this.tick(0.5);
    if (opt.resets) for (let r = 0; r < opt.resets; r++) { if (this.rm.st === 'LOCKOUT') this.rmReset(true); for (let i = 0; i < 120; i++) this.tick(0.5); }
    this.quiet = false; this.resetsSinceFix = 0;
  },

  /* ----- switch positions decided by the physical state ----- */
  ocClosed() { if (this.has('oc_bad') || this.has('rwf_sensor')) return false; return !this.ocOpen; },
  /* what the RWF55 thinks the water is: a drifted sensor reads 45°F low, so the controller overfires */
  rwfT() { return this.has('sensor_low') ? this.Tb - 45 : this.Tb; },
  hlClosed() { return !this.has('hl_bad') && !this.hlTrip; },
  lowWater() { return this.has('low_water'); },
  lwClosed() { if (this.has('jmp_lwco')) return true; return !this.has('lwco_dirty') && !this.lowWater(); },
  fsClosed() { return !this.has('fs_bad') && this.flow >= FS_MAKE; },
  apClosed() { if (this.has('aps_weld')) return true; return !this.has('aps_bad') && !this.has('aps_tube') && this.air >= 0.3; },
  filterDirty() { return this.has('filter_dirty'); },
  rmOK() { return !this.has('rm_bad'); },
  rmPowered() { return this.rmOK() && this.mag('RM_5') > 90; },
  out(n) {
    const r = this.rm;
    if (!(r && this.rmOK() && this.lastPow && RM_OUT[n].indexOf(r.st) >= 0)) return false;
    return n !== 10 || r.el < 5;          /* early spark termination: ignition only the first 5 s of the pilot trial */
  },

  elements() {
    const f = this.faults, O = Infinity, sw = on => on ? 0 : O, en = this.en;
    const leg = k => f.has('fuse_L' + k) ? O : 0;
    return [
      /* 208 V power */
      ['LN_L1', 'F1_IN', sw(this.disc)], ['LN_L2', 'F2_IN', sw(this.disc)], ['LN_L3', 'F3_IN', sw(this.disc)],
      ['F1_IN', 'F1_OUT', leg(1)], ['F2_IN', 'F2_OUT', leg(2)], ['F3_IN', 'F3_OUT', leg(3)],
      ['VFD_L1', 'VFD_L2', 300], ['VFD_L2', 'VFD_L3', 300], ['VFD_L3', 'VFD_L1', 300],
      ['FUA_IN', 'FUA_OUT', f.has('fuse_open') ? O : 0], ['FUB_IN', 'FUB_OUT', 0], ['XF_H1', 'XF_H2', f.has('xfmr_open') ? O : 45],
      ['PS_L1', 'PS_T1', sw(en.ps)], ['PS_L2', 'PS_T2', sw(en.ps)], ['PS_L3', 'PS_T3', sw(en.ps)],
      /* motor windings (delta): 2 hp blower behind the VFD, 5 hp system pump */
      ['BM_U', 'BM_V', f.has('blower_open') ? O : 2.4], ['BM_V', 'BM_W', 2.4], ['BM_W', 'BM_U', 2.4],
      ['PM_T1', 'PM_T2', f.has('pm_open') ? O : 0.9], ['PM_T2', 'PM_T3', 0.9], ['PM_T3', 'PM_T1', 0.9],
      /* 115 V control */
      ['CB_1', 'CB_2', f.has('cb_bad') ? O : 0],
      ['BS_1', 'BS_2', sw(this.burnerSw && !f.has('bs_bad'))], ['TB4', 'TB2', this.burnerSw ? 3000 : O],
      ['FL_C', 'FL_NO', sw(this.filterDirty())], ['FL_NO', 'TB2', 3000],
      ['EN_1', 'EN_2', sw(this.call)], ['HL_1', 'HL_2', sw(this.hlClosed())], ['OC_1', 'OC_2', sw(this.ocClosed())],
      ['LG_1', 'LG_2', sw(!this.lgTrip)], ['HG_1', 'HG_2', sw(!this.hgTrip)], ['FS_1', 'FS_2', sw(this.fsClosed())],
      ['LW_1', 'LW_2', sw(this.lwClosed())], ['VF_1', 'VF_2', sw(!f.has('vf_open'))], ['AP_1', 'AP_2', sw(this.apClosed())],
      ['RM_5', 'RM_L2', 3300], ['RM_6', 'RM_L2', 22000], ['RM_7', 'RM_L2', 22000],
      ['RM_5', 'RM_3', sw(this.out(3))], ['RM_5', 'RM_4', sw(this.out(4))], ['RM_5', 'RM_8', sw(this.out(8))], ['RM_5', 'RM_9', sw(this.out(9))], ['RM_5', 'RM_10', sw(this.out(10))],
      ['CR1_A', 'CR1_B', f.has('cra1_coil') ? O : 1100], ['TD_1', 'TD_2', 6000], ['TD_1', 'TB12', sw(this.tdT >= 20)], ['CR2_A', 'CR2_B', 1100],
      ['PV_1', 'PV_2', f.has('pv_open') ? O : 640], ['V1_1', 'V1_2', f.has('v1_open') ? O : 900], ['V2_1', 'V2_2', f.has('v2_open') ? O : 1150],
      ['VV_1', 'VV_2', 1150], ['IG_1', 'IG_2', f.has('ig_open') ? O : 2.2], ['AL_1', 'AL_2', 150],
      ['OL_95', 'OL_96', sw(!this.olTrip)], ['PS_A', 'PS_B', f.has('ps_coil') ? O : 260]
    ];
  },
  /* wye 208 V service with a grounded neutral: each leg is 120 V to ground. The control transformer secondary follows
     whatever its primary sees, so it is solved in two passes: power side first, then the 115 V side from X1 */
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
  /* the VFD output is a variable-frequency supply of its own: about 208 V at 60 Hz, falling with speed (V/Hz) */
  vfdOutV() { return this.blowerRun || (this.en.vfdRun && this.has('blower_open')) ? 208 * this.hz / 60 : 0; },
  volts(a, b) {
    if (a === 'FT_P' || a === 'FT_N' || b === 'FT_P' || b === 'FT_N') return 0;
    const ao = VFD_OUT.indexOf(a) >= 0, bo = VFD_OUT.indexOf(b) >= 0;
    if (ao || bo) {
      const v = this.vfdOutV(), pa = ao ? a.slice(-1) : null, pb = bo ? b.slice(-1) : null;
      if (ao && bo) return pa === pb ? 0 : v;
      const other = ao ? b : a;
      return NET_OF[other] === NET_OF.GND ? v / Math.sqrt(3) : 0;
    }
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
      this.lastPow = this.rmOK() && this.mag('RM_5') > 90;
      this.en.ps = this.across('PS_A', 'PS_B') > 85 && !f.has('ps_coil');
    }
    const on = (a, b) => this.across(a, b) > 90;
    this.en.cra1 = on('CR1_A', 'CR1_B') && !f.has('cra1_coil');
    this.en.cra2 = on('CR2_A', 'CR2_B');
    this.en.pv = on('PV_1', 'PV_2') && !f.has('pv_open');
    this.en.v1 = on('V1_1', 'V1_2') && !f.has('v1_open');
    this.en.v2 = on('V2_1', 'V2_2') && !f.has('v2_open');
    this.en.vv = on('VV_1', 'VV_2');                                 /* vent valve closes when energized */
    this.en.ig = on('IG_1', 'IG_2') && !f.has('ig_open');
    this.en.alarm = on('AL_1', 'AL_2');
    this.en.td = on('TD_1', 'TD_2');
    this.tdT = this.en.td ? this.tdT + dt * SPEED : 0;

    /* system pump (by others): a 3-phase motor starts only with all three legs; on two legs it hums and the overload trips */
    const three = p => Math.min(this.across(p + '1', p + '2'), this.across(p + '2', p + '3'), this.across(p + '3', p + '1')) > 180;
    const any = p => on(p + '1', p + '2') || on(p + '2', p + '3') || on(p + '3', p + '1');
    const pumpV = three('PM_T') && !f.has('pm_open');
    this.pumpHum = !pumpV && any('PM_T');
    if (this.pumpHum) { this.humT += dt; if (this.humT > 8) { this.olTrip = true; this.note('System pump overload tripped.'); } } else this.humT = 0;
    this.pumpRun = pumpV;
    let flow = 0, dp = 0;
    if (this.pumpRun) {
      if (f.has('coupler')) { flow = 0; dp = 0; }
      else if (f.has('iso_closed')) { flow = 0; dp = 24.5; }
      else if (f.has('air_bound')) { const w = Math.sin(this.time * 0.9) * 0.5 + Math.sin(this.time * 2.3) * 0.5; flow = 105 + 45 * w; dp = 7 + 3 * w; }
      else if (f.has('strainer')) { flow = 122; dp = 21; }
      else { flow = 200; dp = 18; }
    }
    this.flow = flow; this.dp = dp;

    /* VFD and blower: CRA1 gives the run command; the drive needs all three input legs; it trips and latches on a fault */
    const vfdPow = !f.has('vfd_bad') && Math.min(this.across('VFD_L1', 'VFD_L2'), this.across('VFD_L2', 'VFD_L3'), this.across('VFD_L3', 'VFD_L1')) > 150;
    const vfdLive = !f.has('vfd_bad') && this.across('VFD_L1', 'VFD_L2') > 150;
    if (!vfdLive) this.vfdFault = '';                 /* removing power clears a latched drive fault */
    this.en.vfdLive = vfdLive;
    this.en.vfdRun = this.en.cra1 && vfdLive && !this.vfdFault;
    if (this.en.vfdRun && !vfdPow) { this.vfdFault = 'INPUT PHASE LOSS'; this.note('VFD tripped: input phase loss.'); }
    else if (this.en.vfdRun && f.has('blower_open')) { this.vfdFault = 'OUTPUT PHASE LOSS'; this.note('VFD tripped: output phase loss.'); }
    this.en.vfdRun = this.en.cra1 && vfdLive && !this.vfdFault;

    /* firing rate from the RWF55: low fire hold until CRA2 releases modulation, then follow the load */
    const want = this.en.cra2 ? Math.max(0.25, Math.min(1, 0.25 + (RWF_SP + 8 - this.rwfT()) * 0.05)) : 0.25;
    this.rate = this.en.vfdRun ? this.rate + (want - this.rate) * Math.min(1, dt * 0.4) : 0;
    this.hz = this.en.vfdRun ? 15 + 45 * this.rate : 0;
    this.blowerRun = this.en.vfdRun;
    this.air = this.blowerRun ? (0.08 + 2.0 * Math.pow(this.hz / 60, 2)) * (this.filterDirty() ? 0.72 : 1) : 0;

    /* gas pressures, in. w.c. */
    const firing = this.main;
    this.pin = f.has('gas_closed') ? 0 : f.has('gas_low') ? (firing ? 5.4 - 1.4 * this.rate : 5.6) : (firing ? 10.5 - 1.6 * this.rate : 10.6);
    if (this.pin < 5.0) { if (!this.lgTrip) this.note('Low gas pressure switch tripped.'); this.lgTrip = true; }
    const mainOpen = this.en.v1 && this.en.v2;
    this.man = mainOpen && this.pin > 0.3 ? Math.min(this.pin - 0.3, (0.35 + 1.65 * this.rate) * (f.has('ratio_lean') ? 0.8 : 1) + (f.has('reg_high') ? 1.7 * this.rate : 0)) : 0;
    if (f.has('vent_open') && mainOpen) this.man *= 0.15;                  /* a vent valve stuck open bleeds the gas between the valves to outdoors */
    if (this.man > 3.0) { if (!this.hgTrip) this.note('High gas pressure switch tripped.'); this.hgTrip = true; }
    this.pilotP = this.en.pv && this.pin > 0.3 && !f.has('pilot_cock') ? 3.0 : 0;

    /* flame: interrupted pilot lit by the ignitor, main lit from the pilot; UV scanner sees both */
    this.spark = this.en.ig && !f.has('electrode');
    this.pilot = this.pilotP > 1 && (this.spark || this.pilot);
    this.main = mainOpen && this.man > 0.3 && (this.pilot || this.main) && this.blowerRun;
    let s = 0;
    if (this.main) s = f.has('ratio_lean') ? 1.7 + 0.6 * this.rate : 3.0 + 1.0 * this.rate;
    if (this.pilot) s = this.main ? s + 0.2 : 2.3;
    if (f.has('lens_dirty')) s *= 0.4;
    if (f.has('scanner_bad') || f.has('amp_bad')) s = 0;
    s = s ? Math.min(5, s * (1 + Math.sin(this.time * 1.7) * 0.03)) : 0;
    this.sig = s;

    this.rmStep(dt * SPEED);

    /* boiler water temperature: burner heat in, building load out (system water keeps moving) */
    const qIn = this.main ? 3000 * this.rate * this.eff() / 100 : 0;
    const qLoad = (this.flow > 20 ? 1800 * Math.min(1, this.flow / 150) : 40) * Math.max(0, this.Tb - 70) / 110;
    this.qLoad = qLoad;
    this.Tb += (qIn - qLoad) / 1465 * dt;
    if (this.has('rwf_sensor')) this.ocOpen = true;
    else if (this.rwfT() >= RWF_OFF) this.ocOpen = true; else if (this.rwfT() <= RWF_ON) this.ocOpen = false;
    if (this.Tb >= HL_SET && !f.has('hl_bad')) { if (!this.hlTrip) this.note('High limit tripped at ' + Math.round(this.Tb) + '°F.'); this.hlTrip = true; }

    /* system pressure: cold fill plus expansion; a waterlogged tank lets it climb to the relief valve */
    const base = this.lowWater() ? 4 : 15;
    let P = base + (this.Tb - 70) * (f.has('tank_logged') ? 0.35 : 0.075);
    this.relief = 'dry';
    if (P >= RELIEF) { P = RELIEF + (P - RELIEF) * 0.05; this.relief = 'discharging'; }
    else if (f.has('relief_bad') && P > 21) this.relief = 'dripping';
    this.P = P;
  },
  eff() { const f = this.faults; return f.has('hx_soot') ? 83.0 : f.has('ratio_lean') ? 84.5 : f.has('filter_dirty') ? 85.8 : 87.0; },
  note(m) { if (!this.quiet && this.onLog) this.onLog(m); },

  /* ----- the flame safeguard (RM7896D, 30 s purge card) ----- */
  rmStep(d) {
    const r = this.rm, pow = this.rmOK() && this.mag('RM_5') > 90;
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
        else if (r.ilk) { lock('Lockout interlock (combustion airflow switch) opened during prepurge'); break; }
        else if (r.el > 10) { lock('Lockout interlock (combustion airflow switch) did not prove in prepurge'); break; }
        if (flame) { lock('Flame signal during prepurge'); break; }
        if (r.t <= 0 && r.ilk) go('PFEP', 10);
        break;
      case 'PFEP':
        if (!t6) { go('POST', 60); break; }
        if (!t7) { lock('Lockout interlock (combustion airflow switch) opened during pilot ignition'); break; }
        if (r.t <= 0) { if (flame) go('MFEP', 5); else lock('Pilot flame fail (PFEP): no flame proven at end of pilot trial'); }
        break;
      case 'MFEP':
        if (!t6) { go('POST', 60); break; }
        if (!t7) { lock('Lockout interlock (combustion airflow switch) opened during main ignition'); break; }
        if (!flame) { lock('Flame fail during main flame establishing period (MFEP)'); break; }
        if (r.t <= 0) { go('RUN'); r.runT = 0; r.lowSig = 0; }
        break;
      case 'RUN':
        r.runT += d;
        if (!t6) { go('POST', 60); break; }
        if (!t7) { lock('Lockout interlock (combustion airflow switch) opened while running'); break; }
        if (!flame) { r.lowSig += d; if (r.lowSig >= 1.5) { lock(r.runT < 6 ? 'Main flame did not prove at end of MFEP (main flame ignition)' : 'Main flame fail (RUN)'); break; } } else r.lowSig = 0;
        break;
      case 'POST': if (r.t <= 0) go('STANDBY'); break;
      case 'LOCKOUT': break;
    }
  },
  rmReset(silent) {
    const r = this.rm;
    if (r.st !== 'LOCKOUT') return false;
    if (!this.rmOK() || this.mag('RM_5') < 90) return false;
    r.st = 'INIT'; r.t = 10; r.el = 0; r.lock = '';
    if (!silent) this.resetsSinceFix++;
    return true;
  },

  /* ----- readings for the tools ----- */
  amps(where) {
    const j = v => v * (1 + Math.sin(this.time * 3.1) * 0.01), f = this.faults;
    const pumpRun = f.has('coupler') ? 5.2 : f.has('iso_closed') ? 9.6 : f.has('air_bound') ? 8.5 + Math.sin(this.time * 0.9) * 1.2 : f.has('strainer') ? 11.4 : 13.6;
    /* on a lost leg the dead terminal only shows a phantom voltage to the others, and carries no current */
    const motor = (run, hum, p, runA, lra, k) => run ? runA : !hum ? 0 : [1, 2, 3].some(o => o !== k && this.across(p + k, p + o) > 180) ? lra : 0;
    const m = {};
    [1, 2, 3].forEach(k => { m['pump' + k] = motor(this.pumpRun, this.pumpHum, 'PM_T', pumpRun, 92, k); });
    const bl = this.blowerRun ? (1.6 + 5.0 * Math.pow(this.rate, 2)) * (f.has('filter_dirty') ? 0.82 : 1) : 0;
    m.blower = bl;
    m.vfdin = this.en.vfdLive ? 0.25 + bl * (this.hz / 60) * 0.95 : 0;
    const ign = this.en.ig ? 1.3 : 0, pv = this.en.pv ? 0.19 : 0, mv = (this.en.v1 ? 0.14 : 0) + (this.en.v2 ? 0.1 : 0) + (this.en.vv ? 0.1 : 0);
    const coils = (this.en.ps ? 0.45 : 0) + (this.en.cra1 ? 0.1 : 0) + (this.en.cra2 ? 0.1 : 0) + (this.en.alarm ? 0.35 : 0), rmc = this.lastPow ? 0.04 : 0;
    m.ign = ign;
    m.x1 = ign + pv + mv + coils + rmc + (this.burnerSw ? 0.04 : 0);
    m.line = m.pump1 + m.vfdin + m.x1 * XF_RATIO;
    return j(m[where] || 0);
  },
  analyzer() {
    if (!this.main) return null;
    const f = this.faults;
    let o2 = 5.2 - this.rate * 0.6, co = 22, st = 250 + 70 * this.rate;
    if (f.has('filter_dirty')) { o2 = 1.6; co = 520; st += 8; }
    if (f.has('ratio_lean')) { o2 = 9.0; co = 14; st += 15; }
    if (f.has('hx_soot')) { co = Math.max(co, 60); st += 110; }
    const co2 = (20.9 - o2) / 20.9 * 11.7, coAF = co * 20.9 / (20.9 - o2), w = 1 + Math.sin(this.time * 1.3) * 0.02;
    return { o2: o2 * w, co: Math.round(co * w), co2, coAF: Math.round(coAF * w), stack: Math.round(st * (1 + Math.sin(this.time) * 0.004)), eff: this.eff(), rate: this.rate };
  },
  returnT() { if (this.flow < 20) return this.Tb - 25; return this.Tb - Math.min(60, (this.qLoad || 0) * 1000 / (500 * this.flow)); },
  vfdText() { if (!this.en.vfdLive) return ''; if (this.vfdFault) return 'FAULT: ' + this.vfdFault; return this.en.vfdRun ? 'RUN ' + this.hz.toFixed(1) + ' Hz' : 'STOP'; },
  status() {
    const f = this.faults, ctl = this.mag('TB3') > 90;
    return {
      rm: this.rm.st, flame: this.main ? 'main' : this.pilot ? 'pilot' : this.spark ? 'spark' : 'none',
      blower: this.blowerRun ? 'run' : 'off',
      pump: this.pumpRun ? 'run' : this.pumpHum ? 'hum' : 'off',
      alarm: this.en.alarm, Tb: this.Tb, P: this.P, Tr: this.returnT(), relief: this.relief,
      lwLamp: ctl && (f.has('lwco_dirty') || this.lowWater()), filterLamp: this.mag('FL_NO') > 90, burnerLamp: this.mag('TB4') > 90,
      hlTrip: this.hlTrip, lgTrip: this.lgTrip, hgTrip: this.hgTrip, olTrip: this.olTrip, vfd: this.vfdText(), rate: this.main ? this.rate : 0
    };
  },
  healthy() {
    return this.faults.size === 0 && !this.hlTrip && !this.lgTrip && !this.hgTrip && !this.olTrip && !this.vfdFault && this.rm.st === 'RUN' && this.rm.runT > 4;
  }
};

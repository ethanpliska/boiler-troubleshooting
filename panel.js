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

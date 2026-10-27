/* ===== Boiler control panel: every probe point the meter can touch, drawn with the same part artwork (ptdraw.js) as the
   package unit game. Art goes behind; brass lugs sit under every terminal dot; wires (toggle) on top of the art. ===== */
const PANEL_W = 1120, PANEL_H = 2110;
let TPOS = {};
const NAV = [['Power', 0], ['Motor starters', 360], ['Limit string', 1075], ['Interlocks', 1285], ['Flame safeguard', 1495], ['Burner loads', 1875]];
const TLBL = {
  LN_L1: 'L1', LN_L2: 'L2', LN_L3: 'L3', F1_IN: 'F1', F2_IN: 'F2', F3_IN: 'F3', F1_OUT: 'F1', F2_OUT: 'F2', F3_OUT: 'F3',
  XF_H1: 'H1', XF_H2: 'H2', XF_X1: 'X1', XF_X2: 'X2', FU_IN: 'IN', FU_OUT: 'OUT', NB: 'N', GND: 'GND',
  M1_L1: 'L1', M1_L2: 'L2', M1_L3: 'L3', M1_T1: 'T1', M1_T2: 'T2', M1_T3: 'T3', M1_A: 'A', M1_B: 'B',
  BM_T1: 'T1', BM_T2: 'T2', BM_T3: 'T3', PS_L1: 'L1', PS_L2: 'L2', PS_L3: 'L3', PS_T1: 'T1', PS_T2: 'T2', PS_T3: 'T3', PS_A: 'A', PS_B: 'B',
  OL_95: '95', OL_96: '96', PM_T1: 'T1', PM_T2: 'T2', PM_T3: 'T3', EN_1: '1', EN_2: '2', AL_1: '1', AL_2: '2', BS_1: '1', BS_2: '2',
  OC_1: '1', OC_2: '2', HL_1: '1', HL_2: '2', LW_1: '1', LW_2: '2', FS_1: '1', FS_2: '2',
  LG_1: 'C', LG_2: 'NO', HG_1: 'C', HG_2: 'NC', AP_1: 'C', AP_2: 'NO',
  RM_L1: 'L1', RM_L2: 'L2', RM_3: '3', RM_4: '4', RM_6: '6', RM_7: '7', RM_8: '8', RM_9: '9', RM_10: '10', FT_P: '+', FT_N: '−',
  PV_1: '1', PV_2: '2', V1_1: '1', V1_2: '2', V2_1: '1', V2_2: '2', IG_1: '1', IG_2: '2'
};
/* terminal positions [id, x, y, label side: 'a' above (default below)] */
const TERMS = [
  ['LN_L1', 120, 122, 'r'], ['LN_L2', 240, 122, 'r'], ['LN_L3', 360, 122, 'r'], ['F1_IN', 120, 196, 'r'], ['F2_IN', 240, 196, 'r'], ['F3_IN', 360, 196, 'r'],
  ['F1_OUT', 120, 304], ['F2_OUT', 240, 304], ['F3_OUT', 360, 304],
  ['XF_H1', 570, 140, 'a'], ['XF_H2', 570, 270], ['XF_X1', 690, 140, 'a'], ['XF_X2', 690, 270],
  ['FU_IN', 840, 190], ['FU_OUT', 890, 190], ['NB', 1030, 130], ['GND', 1030, 270],
  ['M1_L1', 120, 475], ['M1_L2', 240, 475], ['M1_L3', 360, 475], ['M1_T1', 120, 605], ['M1_T2', 240, 605], ['M1_T3', 360, 605], ['M1_A', 420, 475], ['M1_B', 420, 605],
  ['BM_T1', 560, 640], ['BM_T2', 630, 640], ['BM_T3', 700, 640],
  ['EN_1', 870, 610], ['EN_2', 1030, 610],
  ['PS_L1', 120, 795], ['PS_L2', 240, 795], ['PS_L3', 360, 795], ['PS_T1', 120, 925], ['PS_T2', 240, 925], ['PS_T3', 360, 925], ['PS_A', 420, 795], ['PS_B', 420, 925],
  ['OL_95', 320, 1000], ['OL_96', 410, 1000],
  ['PM_T1', 560, 985], ['PM_T2', 630, 985], ['PM_T3', 700, 985],
  ['AL_1', 870, 830], ['AL_2', 1030, 830], ['BS_1', 870, 1020], ['BS_2', 1030, 1020],
  ['OC_1', 85, 1220], ['OC_2', 245, 1220], ['HL_1', 350, 1220], ['HL_2', 510, 1220], ['LW_1', 615, 1220], ['LW_2', 775, 1220], ['FS_1', 880, 1220], ['FS_2', 1040, 1220],
  ['LG_1', 100, 1430], ['LG_2', 300, 1430], ['HG_1', 460, 1430], ['HG_2', 660, 1430], ['AP_1', 820, 1430], ['AP_2', 1020, 1430],
  ['FT_P', 960, 1640], ['FT_N', 1040, 1640],
  ['RM_L1', 120, 1790, 'ad'], ['RM_L2', 225, 1790, 'ad'], ['RM_3', 330, 1790, 'ad'], ['RM_4', 435, 1790, 'ad'], ['RM_6', 540, 1790, 'ad'], ['RM_7', 645, 1790, 'ad'], ['RM_8', 750, 1790, 'ad'], ['RM_9', 855, 1790, 'ad'], ['RM_10', 960, 1790, 'ad'],
  ['IG_1', 85, 2030], ['IG_2', 245, 2030], ['PV_1', 350, 2030], ['PV_2', 510, 2030], ['V1_1', 615, 2030], ['V1_2', 775, 2030], ['V2_1', 880, 2030], ['V2_2', 1040, 2030]
];
TERMS.forEach(t => { TPOS[t[0]] = [t[1], t[2]]; });

function pbox(x, y, w, h, t, s) {
  return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text class="boxlabel" x="${x + 16}" y="${y + 30}">${t}</text>` + (s ? `<text class="sub" x="${x + 16}" y="${y + 52}">${s}</text>` : '');
}
function psect(y, label) { return `<text x="24" y="${y}" style="font:700 13px var(--head);letter-spacing:.16em;fill:var(--yellow);text-transform:uppercase">${label}</text>`; }

/* boiler parts not in the package unit set, drawn in the same style */
const BX = {
  /* cartridge fuse in a black holder between an in and an out lug */
  cartridge(x, y1, y2, amps) {
    const h = y2 - y1;
    return `<rect x="${x - 6}" y="${y1}" width="12" height="40" fill="url(#ptBrass)" stroke="#5c3f10"/><rect x="${x - 6}" y="${y2 - 40}" width="12" height="40" fill="url(#ptBrass)" stroke="#5c3f10"/>` +
      `<rect x="${x - 28}" y="${y1 + 22}" width="56" height="${h - 44}" rx="7" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/>` +
      `<rect x="${x - 15}" y="${y1 + h / 2 - 24}" width="30" height="48" fill="url(#ptBeige)" stroke="#8d8672"/><rect x="${x - 17}" y="${y1 + h / 2 - 28}" width="34" height="10" rx="3" fill="url(#ptBrass)" stroke="#5c3f10"/><rect x="${x - 17}" y="${y1 + h / 2 + 18}" width="34" height="10" rx="3" fill="url(#ptBrass)" stroke="#5c3f10"/>` +
      `<text x="${x}" y="${y1 + h / 2 + 4}" text-anchor="middle" style="font:700 9px sans-serif;fill:#3a3a3a">${amps}</text>`;
  },
  /* disconnect switch blades between the line lugs and the fuse lugs */
  blades(xs, y1, y2) {
    let s = `<rect x="${xs[0] - 40}" y="${y1 - 22}" width="${xs[xs.length - 1] - xs[0] + 80}" height="${y2 - y1 + 44}" rx="8" fill="#20262c" stroke="#0b0e11" stroke-width="2"/>`;
    xs.forEach(x => { s += `<rect x="${x - 5}" y="${y1 + 10}" width="10" height="${y2 - y1 - 20}" rx="3" fill="url(#ptMetal)" stroke="#3d4650"/>`; });
    s += `<rect x="${xs[0] - 30}" y="${(y1 + y2) / 2 - 6}" width="${xs[xs.length - 1] - xs[0] + 60}" height="12" rx="5" fill="#b3302a" stroke="#6e1712"/>`;
    return s;
  },
  /* overload relay block hung under a starter, with a blue reset button and the 95-96 contact */
  overload(x, y, w) {
    return `<rect x="${x}" y="${y}" width="${w}" height="64" rx="8" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/><rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="12" rx="3" fill="#2d343b"/>` +
      `<circle cx="${x + 60}" cy="${y + 38}" r="15" fill="url(#ptBlue)" stroke="#0e2a4f" stroke-width="2"/><text x="${x + 60}" y="${y + 42}" text-anchor="middle" style="font:800 9px sans-serif;fill:#fff">RESET</text>` +
      `<rect x="${x + 96}" y="${y + 26}" width="54" height="22" rx="4" fill="#d9dde1" stroke="#7b848c"/><text x="${x + 123}" y="${y + 41}" text-anchor="middle" style="font:700 10px sans-serif;fill:#20262c">OL 2–4 A</text>`;
  },
  /* aquastat / high limit: beige case with a setpoint dial (high limit adds a red manual reset button) */
  aquastat(x, y, w, set, reset) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="70" rx="8" fill="url(#ptBeige)" stroke="#8d8672" stroke-width="2"/>`;
    s += `<circle cx="${x + 46}" cy="${y + 35}" r="24" fill="#f4f6f8" stroke="#6b7480" stroke-width="2"/><line x1="${x + 46}" y1="${y + 35}" x2="${x + 60}" y2="${y + 22}" stroke="#b3302a" stroke-width="3"/><circle cx="${x + 46}" cy="${y + 35}" r="3" fill="#333"/>`;
    s += `<text x="${x + 46}" y="${y + 66}" text-anchor="middle" style="font:700 9px sans-serif;fill:#3a434c">${set}</text>`;
    if (reset) s += `<circle cx="${x + w - 34}" cy="${y + 35}" r="13" fill="#c33" stroke="#6e1712" stroke-width="2"/><text x="${x + w - 34}" y="${y + 60}" text-anchor="middle" style="font:700 8px sans-serif;fill:#6e1712">RESET</text>`;
    else s += `<path d="M${x + 90} ${y + 52} q10 -30 20 0 q10 30 20 0" fill="none" stroke="#6b7480" stroke-width="2"/>`;
    return s;
  },
  /* probe low-water cutoff: grey control with its LOW WATER and POWER lamps (lamps are live, like the real one) */
  lwco(x, y, w) {
    return `<rect x="${x}" y="${y}" width="${w}" height="70" rx="8" fill="#aab4be" stroke="#4a525b" stroke-width="2"/><rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="18" rx="3" fill="#20262c"/>` +
      `<text x="${x + 18}" y="${y + 23}" style="font:700 9px sans-serif;fill:#cfd8e0">LOW WATER CUTOFF</text>` +
      `<circle id="pnlLwLamp" cx="${x + 40}" cy="${y + 48}" r="8" fill="#3a2a1a" stroke="#222"/><text x="${x + 54}" y="${y + 52}" style="font:700 9px sans-serif;fill:#20262c">LOW WATER</text>` +
      `<rect x="${x + w - 44}" y="${y + 40}" width="30" height="16" rx="4" fill="#c33" stroke="#6e1712"/><text x="${x + w - 29}" y="${y + 51}" text-anchor="middle" style="font:800 7px sans-serif;fill:#fff">TEST</text>`;
  },
  /* paddle flow switch on a pipe tee */
  flowsw(x, y, w) {
    return `<rect x="${x}" y="${y + 40}" width="${w}" height="26" rx="6" fill="url(#ptMetalV)" stroke="#3d4650"/><rect x="${x + w / 2 - 34}" y="${y}" width="68" height="44" rx="6" fill="#2d6a9f" stroke="#173f6b" stroke-width="2"/>` +
      `<path d="M${x + w / 2} ${y + 66} v12 l18 10" stroke="#c9d3dd" stroke-width="4" fill="none"/><text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" style="font:800 10px sans-serif;fill:#fff">FLOW</text>`;
  },
  /* round diaphragm pressure switch (gas or air) with a manual reset where it has one */
  dswitch(cx, cy, col, label, note) {
    let s = `<circle cx="${cx}" cy="${cy}" r="36" fill="#3b4652" stroke="#1d242b" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="29" fill="${col}" stroke="#0e2a4f" stroke-width="2"/>`;
    s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" style="font:800 11px sans-serif;fill:#fff;paint-order:stroke;stroke:#0e2a4f;stroke-width:2px">${label}</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" style="font:700 9px sans-serif;fill:#fff;paint-order:stroke;stroke:#0e2a4f;stroke-width:2px">${note}</text>`;
    s += `<rect x="${cx - 7}" y="${cy + 34}" width="14" height="10" fill="url(#ptBrass)" stroke="#5c3f10"/>`;
    if (/MR/.test(note)) s += `<circle cx="${cx + 30}" cy="${cy - 24}" r="8" fill="#c33" stroke="#6e1712" stroke-width="2"/>`;
    return s;
  },
  /* toggle switch on a plate */
  toggle(cx, cy) {
    return `<rect x="${cx - 40}" y="${cy - 34}" width="80" height="68" rx="6" fill="#d9dde1" stroke="#7b848c" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="14" fill="url(#ptMetal)" stroke="#3d4650"/><rect x="${cx - 4}" y="${cy - 30}" width="8" height="30" rx="4" fill="url(#ptMetalV)" stroke="#3d4650"/>` +
      `<text x="${cx}" y="${cy + 30}" text-anchor="middle" style="font:700 8px sans-serif;fill:#20262c">ON / OFF</text>`;
  },
  /* solenoid coil (pilot valve) */
  solenoid(cx, cy) {
    return `<rect x="${cx - 34}" y="${cy - 40}" width="68" height="70" rx="10" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/><rect x="${cx - 26}" y="${cy - 30}" width="52" height="30" rx="4" fill="#d9dde1"/><text x="${cx}" y="${cy - 11}" text-anchor="middle" style="font:700 9px sans-serif;fill:#20262c">120 V</text>` +
      `<rect x="${cx - 12}" y="${cy + 30}" width="24" height="18" fill="url(#ptBrass)" stroke="#5c3f10"/>`;
  },
  /* motorized main gas valve actuator with OPEN/CLOSED window */
  actuator(cx, cy, id) {
    return `<rect x="${cx - 60}" y="${cy - 44}" width="120" height="80" rx="8" fill="#6d7c8b" stroke="#3d4955" stroke-width="2"/><rect x="${cx - 40}" y="${cy - 30}" width="80" height="22" rx="3" fill="#20262c"/>` +
      `<text id="${id}" x="${cx}" y="${cy - 14}" text-anchor="middle" style="font:800 11px sans-serif;fill:#e5483b">CLOSED</text><rect x="${cx - 70}" y="${cy + 36}" width="140" height="8" rx="3" fill="#d4b73a" stroke="#7d6510"/>`;
  },
  /* ignition transformer with two porcelain HV posts */
  ignx(cx, cy) {
    return `<rect x="${cx - 62}" y="${cy - 34}" width="124" height="64" rx="6" fill="#3b4652" stroke="#1d242b" stroke-width="2"/><rect x="${cx - 40}" y="${cy - 56}" width="16" height="24" rx="6" fill="#efe9da" stroke="#8d8672"/><rect x="${cx + 24}" y="${cy - 56}" width="16" height="24" rx="6" fill="#efe9da" stroke="#8d8672"/>` +
      `<rect x="${cx - 34}" y="${cy - 18}" width="68" height="26" rx="3" fill="#f1f3f5"/><text x="${cx}" y="${cy - 1}" text-anchor="middle" style="font:700 9px sans-serif;fill:#20262c">6000 V</text>`;
  }
};

function buildPanel() {
  let g = PT.defs + `<rect x="0" y="0" width="${PANEL_W}" height="${PANEL_H}" rx="10" fill="#1a222b"/>`;
  /* ---- power ---- */
  g += pbox(40, 30, 420, 310, 'Fused disconnect', '208 V 3 phase · 15 A fuses') + BX.blades([120, 240, 360], 122, 196);
  [120, 240, 360].forEach(x => { g += BX.cartridge(x, 198, 302, '15 A'); });
  g += `<text class="sub" x="438" y="126" text-anchor="end" style="font-size:11px">LINE</text><text class="sub" x="438" y="200" text-anchor="end" style="font-size:11px">LOAD</text>`;
  g += pbox(480, 30, 300, 310, 'Control transformer', '208 V in · 120 V out') + PT.xfmr(492, 100, 276, 210, 570, 690, 140, 270, '208 V', '120 V');
  g += pbox(800, 30, 140, 240, 'Fuse FU4', '120 V, 3 A') + PT.fuse(840, 890, 190);
  g += pbox(960, 30, 140, 310, 'Neutral', 'X2 bar · ground') + PT.tbar(990, 1070, 130) + PT.ground(1030, 270);
  /* ---- motor starters ---- */
  g += psect(370, 'Motor starters');
  g += pbox(40, 380, 420, 300, 'Blower contactor M1', '') + PT.contactor(50, 432, 410, 216, [120, 240, 360], 475, 605, [420, 475, 605], 'm1');
  g += pbox(480, 380, 300, 300, 'Burner blower', '3/4 hp, 208 V, 3 phase') + PT.wheel(630, 520, 64, 'blw') + PT.tbar(520, 740, 640);
  g += pbox(800, 380, 300, 300, 'Heating call', 'Contact from building controls') + PT.module(820, 450, 260, 90, '#e7ebee') + PT.pswitch(870, 1030, 610, 'call');
  g += pbox(40, 700, 420, 360, 'Pump starter', '') + PT.contactor(50, 752, 410, 216, [120, 240, 360], 795, 925, [420, 795, 925], 'ps') + BX.overload(60, 968, 390);
  g += pbox(480, 700, 300, 360, 'Circulating pump', '1 hp, 208 V, 3 phase') + PT.motor(520, 790, 200, 110) + PT.tbar(520, 740, 985);
  g += pbox(800, 700, 300, 170, 'Alarm light', 'Panel door, 120 V') + `<circle id="pnlAlarm" cx="950" cy="788" r="24" fill="#3a1d1a" stroke="#7a3a33" stroke-width="4"/>`;
  g += pbox(800, 890, 300, 170, 'Burner switch', '') + BX.toggle(950, 972);
  /* ---- limit string ---- */
  g += psect(1080, 'Limit string · burner switch → operating → high limit → low water → flow → RM 6');
  g += pbox(40, 1090, 250, 170, 'Operating aquastat', '') + BX.aquastat(60, 1140, 210, '180°F');
  g += pbox(305, 1090, 250, 170, 'High limit (MR)', '') + BX.aquastat(325, 1140, 210, '210°F', true);
  g += pbox(570, 1090, 250, 170, 'Low-water cutoff', '') + BX.lwco(590, 1140, 210);
  g += pbox(835, 1090, 250, 170, 'Flow switch', '') + BX.flowsw(855, 1132, 210);
  /* ---- interlocks ---- */
  g += psect(1290, 'Lockout interlocks · RM 6 → low gas → high gas → air switch → RM 7');
  g += pbox(40, 1300, 340, 170, 'Low gas pressure', '') + BX.dswitch(200, 1378, 'url(#ptBlue)', 'LOW GAS', '3.5 in. MR');
  g += pbox(400, 1300, 340, 170, 'High gas pressure', '') + BX.dswitch(560, 1378, '#b3302a', 'HIGH GAS', '5.0 in. MR');
  g += pbox(760, 1300, 340, 170, 'Air proving switch', '') + BX.dswitch(920, 1378, '#6d7c8b', 'AIR', '0.5 in.');
  /* ---- relay module ---- */
  g += psect(1500, 'Flame safeguard relay module (7800 series, on/off)');
  g += pbox(40, 1510, 1060, 340, 'Relay module on its subbase', 'Keyboard display, plug-in flame amplifier, UV scanner on F and G');
  g += `<rect x="70" y="1570" width="820" height="160" rx="10" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/><rect x="80" y="1580" width="800" height="14" rx="4" fill="#2d343b"/>`;
  g += `<rect x="110" y="1610" width="330" height="96" rx="8" fill="#0d1822" stroke="#25343f" stroke-width="3"/><text id="pnlKdm" x="275" y="1650" text-anchor="middle" style="font:700 20px var(--mono);fill:#7fd7ff">---</text><text id="pnlKdm2" x="275" y="1680" text-anchor="middle" style="font:13px var(--mono);fill:#7fd7ff"></text>`;
  ['POWER', 'PILOT', 'FLAME', 'MAIN', 'ALARM'].forEach((t, i) => { g += `<circle class="pled" data-led="${t}" cx="${490 + i * 76}" cy="1640" r="8" fill="#3b4652"/><text x="${490 + i * 76}" y="1668" text-anchor="middle" style="font:700 10px sans-serif;fill:#c8d2dc">${t}</text>`; });
  g += `<rect x="910" y="1570" width="170" height="110" rx="8" fill="#17543a" stroke="#0a2a1c" stroke-width="2"/><text x="995" y="1596" text-anchor="middle" style="font:700 10px sans-serif;fill:#e9efe9">FLAME AMPLIFIER</text><text x="995" y="1610" text-anchor="middle" style="font:700 9px sans-serif;fill:#bfe6cf">TEST JACKS V dc</text>`;
  g += `<rect x="70" y="1748" width="1000" height="80" rx="8" fill="url(#ptBeige)" stroke="#8d8672" stroke-width="2"/><text x="1056" y="1820" text-anchor="end" style="font:700 10px sans-serif;fill:#3a434c">SUBBASE</text>`;
  /* ---- loads ---- */
  g += psect(1880, 'Burner loads (120 V)');
  g += pbox(40, 1890, 250, 190, 'Ignition xfmr', '') + BX.ignx(165, 1985);
  g += pbox(305, 1890, 250, 190, 'Pilot valve', '') + BX.solenoid(430, 1975);
  g += pbox(570, 1890, 250, 190, 'Main valve V1', '') + BX.actuator(695, 1975, 'pnlV1');
  g += pbox(835, 1890, 250, 190, 'Main valve V2', '') + BX.actuator(960, 1975, 'pnlV2');
  /* brass lugs under every terminal, wires, then the terminal dots */
  g += PT.lugs(TERMS.filter(t => !/^FT_/.test(t[0])).map(t => [t[1], t[2]]));
  g += `<circle cx="960" cy="1640" r="12" fill="#c33" stroke="#6e1712" stroke-width="2"/><circle cx="1040" cy="1640" r="12" fill="#222" stroke="#000" stroke-width="2"/>`;
  g += buildWires();
  TERMS.forEach(t => {
    const id = t[0], x = t[1], y = t[2], side = t[3] === 'r', up = t[3] === 'a' || t[3] === 'ad', ly = side ? y + 5 : up ? y - 20 : y + 34, lx = side ? x + 24 : x;
    g += `<g class="term" data-id="${id}" tabindex="0" role="button" aria-label="${esc(NODES[id])}"><title>${esc(NODES[id])}</title>` +
      `<circle class="ring-r" r="20" cx="${x}" cy="${y}" style="display:none"/><circle class="ring-b" r="20" cx="${x}" cy="${y}" style="display:none"/>` +
      `<circle class="pad" cx="${x}" cy="${y}" r="24"/><circle class="hit" cx="${x}" cy="${y}" r="11"/><text x="${lx}" y="${ly}" text-anchor="${side ? 'start' : 'middle'}"${t[3] === 'ad' ? ' style="fill:#20262c"' : ''}>${TLBL[id] || id}</text></g>`;
  });
  return g;
}
/* field wiring, drawn when "Wires: On". Leg colours as in the package unit game; red 120 V hot, blue neutral */
function buildWires() {
  const LEG = { 1: '#e8a33b', 2: '#b48cff', 3: '#4ac9c0' };
  let s = '';
  NETS.forEach((n, i) => {
    const pts = n.filter(id => TPOS[id]);
    if (pts.length < 2) return;
    const neutral = n.indexOf('NB') >= 0;
    const lm = n.join(' ').match(/\b(?:F|M1_T|PS_T)([123])/);
    const col = neutral ? '#4aa3df' : lm ? LEG[lm[1]] : '#e5483b';
    const root = neutral ? 'NB' : pts[0];
    for (let k = neutral ? 0 : 1; k < pts.length; k++) {
      const a = TPOS[neutral ? root : pts[k - 1]], b = TPOS[pts[k]];
      if (a === b) continue;
      const lane = 22 + (i % 6) * 5;
      const d = Math.abs(a[1] - b[1]) < 4 ? `M${a[0]} ${a[1]} V${a[1] + lane} H${b[0]} V${b[1]}` : `M${a[0]} ${a[1]} V${Math.max(a[1], b[1]) + lane} H${b[0]} V${b[1]}`;
      s += `<path class="wr" d="${d}" stroke="${col}" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;
    }
  });
  return s;
}

/* ===== EVA-3000 control panel: every probe point the meter can touch, laid out like the boiler's control panel and drawn
   with the same part artwork (ptdraw.js) as the package unit game. Art goes behind; brass lugs sit under every terminal
   dot; wires (toggle) on top of the art. Terminal numbers follow Figure 9c of the EVA manual. ===== */
const PANEL_W = 1120, PANEL_H = 2420;
let TPOS = {};
const NAV = [['Power', 0], ['Blower and switches', 360], ['Terminal strip', 700], ['Limit string', 840], ['RM7896D', 1240], ['Relays', 1600], ['Burner loads', 1800], ['System pump', 2010]];
const TLBL = {
  LN_L1: 'L1', LN_L2: 'L2', LN_L3: 'L3', F1_IN: 'F1', F2_IN: 'F2', F3_IN: 'F3', F1_OUT: 'F1', F2_OUT: 'F2', F3_OUT: 'F3',
  VFD_L1: 'L1', VFD_L2: 'L2/N', VFD_L3: 'L3', VFD_U: 'U', VFD_V: 'V', VFD_W: 'W', BM_U: 'U', BM_V: 'V', BM_W: 'W',
  FUA_IN: 'IN', FUA_OUT: 'OUT', FUB_IN: 'IN', FUB_OUT: 'OUT', XF_H1: 'H1', XF_H2: 'H2', XF_X1: 'X1', XF_X2: 'X2',
  CB_1: 'LINE', CB_2: 'LOAD', BS_1: '1', BS_2: '2', FL_C: 'C', FL_NO: 'NO', EN_1: 'TB4', EN_2: 'TB5', GND: 'GND',
  HL_1: 'C', HL_2: 'NC', OC_1: 'Q13', OC_2: 'Q14', LG_1: 'C', LG_2: 'NO', HG_1: 'C', HG_2: 'NC', FS_1: 'NO', FS_2: 'C',
  LW_1: '1', LW_2: '2', VF_1: '1', VF_2: '2', AP_1: 'C', AP_2: 'NO',
  RM_L2: 'L2', RM_3: '3', RM_4: '4', RM_5: '5', RM_6: '6', RM_7: '7', RM_8: '8', RM_9: '9', RM_10: '10', FT_P: '+', FT_N: '−',
  CR1_A: '14', CR1_B: '13', CR2_A: '14', CR2_B: '13', TD_1: 'IN', TD_2: 'COM', AL_1: '1', AL_2: '2',
  IG_1: '1', IG_2: '2', PV_1: '1', PV_2: '2', V1_1: 'L', V1_2: 'N', V2_1: '1', V2_2: '2', VV_1: '1', VV_2: '2',
  OL_95: '95', OL_96: '96', PS_A: 'A', PS_B: 'B', PS_L1: 'L1', PS_L2: 'L2', PS_L3: 'L3', PS_T1: 'T1', PS_T2: 'T2', PS_T3: 'T3', PM_T1: 'T1', PM_T2: 'T2', PM_T3: 'T3'
};
for (let n = 1; n <= 12; n++) TLBL['TB' + n] = String(n);
/* terminal positions [id, x, y, label: 'a' above, 'ad' above dark (on a light plate), 'r' right; default below] */
const TERMS = [
  ['LN_L1', 120, 122, 'r'], ['LN_L2', 240, 122, 'r'], ['LN_L3', 360, 122, 'r'], ['F1_IN', 120, 196, 'r'], ['F2_IN', 240, 196, 'r'], ['F3_IN', 360, 196, 'r'],
  ['F1_OUT', 120, 304], ['F2_OUT', 240, 304], ['F3_OUT', 360, 304],
  ['VFD_L1', 510, 300], ['VFD_L2', 555, 300], ['VFD_L3', 600, 300], ['VFD_U', 660, 300], ['VFD_V', 705, 300], ['VFD_W', 750, 300],
  ['FUA_IN', 830, 140], ['FUA_OUT', 880, 140], ['FUB_IN', 960, 140], ['FUB_OUT', 1010, 140],
  ['XF_H1', 890, 230, 'a'], ['XF_H2', 890, 310], ['XF_X1', 1010, 230, 'a'], ['XF_X2', 1010, 310],
  ['BM_U', 120, 630], ['BM_V', 190, 630], ['BM_W', 260, 630],
  ['CB_1', 400, 480], ['CB_2', 490, 480], ['BS_1', 590, 480], ['BS_2', 680, 480], ['FL_C', 410, 640], ['FL_NO', 520, 640],
  ['GND', 1040, 470], ['EN_1', 800, 640], ['EN_2', 1040, 640],
  ['OL_95', 320, 2340], ['OL_96', 410, 2340], ['PS_A', 420, 2135], ['PS_B', 420, 2265],
  ['PS_L1', 120, 2135], ['PS_L2', 240, 2135], ['PS_L3', 360, 2135], ['PS_T1', 120, 2265], ['PS_T2', 240, 2265], ['PS_T3', 360, 2265],
  ['PM_T1', 560, 2330], ['PM_T2', 630, 2330], ['PM_T3', 700, 2330],
  ['HL_1', 85, 1000], ['HL_2', 245, 1000], ['OC_1', 350, 1000], ['OC_2', 510, 1000], ['LG_1', 615, 1000], ['LG_2', 775, 1000], ['HG_1', 880, 1000], ['HG_2', 1040, 1000],
  ['FS_1', 85, 1190], ['FS_2', 245, 1190], ['LW_1', 350, 1190], ['LW_2', 510, 1190], ['VF_1', 615, 1190], ['VF_2', 775, 1190], ['AP_1', 880, 1190], ['AP_2', 1040, 1190],
  ['FT_P', 960, 1390], ['FT_N', 1040, 1390],
  ['RM_L2', 120, 1540, 'ad'], ['RM_3', 225, 1540, 'ad'], ['RM_4', 330, 1540, 'ad'], ['RM_5', 435, 1540, 'ad'], ['RM_6', 540, 1540, 'ad'], ['RM_7', 645, 1540, 'ad'], ['RM_8', 750, 1540, 'ad'], ['RM_9', 855, 1540, 'ad'], ['RM_10', 960, 1540, 'ad'],
  ['CR1_A', 248, 1692, 'r'], ['CR1_B', 248, 1762, 'r'], ['CR2_A', 513, 1692, 'r'], ['CR2_B', 513, 1762, 'r'], ['TD_1', 620, 1760], ['TD_2', 780, 1760], ['AL_1', 880, 1760], ['AL_2', 1040, 1760],
  ['IG_1', 75, 1965], ['IG_2', 205, 1965], ['PV_1', 287, 1965], ['PV_2', 417, 1965], ['V1_1', 499, 1965], ['V1_2', 629, 1965], ['V2_1', 711, 1965], ['V2_2', 841, 1965], ['VV_1', 923, 1965], ['VV_2', 1053, 1965]
];
for (let n = 1; n <= 12; n++) TERMS.push(['TB' + n, 85 + (n - 1) * 88, 790, 'ad']);
TERMS.forEach(t => { TPOS[t[0]] = [t[1], t[2]]; });

function pbox(x, y, w, h, t, s) {
  return `<rect class="box" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text class="boxlabel" x="${x + 16}" y="${y + 30}">${t}</text>` + (s ? `<text class="sub" x="${x + 16}" y="${y + 52}">${s}</text>` : '');
}
function psect(y, label) { return `<text x="24" y="${y}" style="font:700 13px var(--head);letter-spacing:.16em;fill:var(--yellow);text-transform:uppercase">${label}</text>`; }

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
Object.assign(BX, {
  /* variable frequency drive: grey body, keypad with a live display, heat-sink fins */
  vfd(x, y, w, h) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#5f6b77" stroke="#2c343c" stroke-width="2"/>`;
    for (let xx = x + 12; xx < x + w - 8; xx += 12) s += `<line x1="${xx}" y1="${y + h - 46}" x2="${xx}" y2="${y + h - 10}" stroke="#3d4650" stroke-width="3"/>`;
    s += `<rect x="${x + 20}" y="${y + 16}" width="${w - 40}" height="54" rx="5" fill="#0d1822" stroke="#25343f" stroke-width="2"/><text id="pnlVfd" x="${x + w / 2}" y="${y + 50}" text-anchor="middle" style="font:700 15px var(--mono);fill:#7fd7ff"></text>`;
    ['STOP', 'RUN', 'FWD'].forEach((t, i) => { s += `<rect x="${x + 30 + i * 74}" y="${y + 84}" width="60" height="26" rx="5" fill="${i ? '#2f3943' : '#b3302a'}" stroke="#1d242b"/><text x="${x + 60 + i * 74}" y="${y + 101}" text-anchor="middle" style="font:700 10px sans-serif;fill:#fff">${t}</text>`; });
    return s;
  },
  /* RWF55 temperature controller: red actual value, green setpoint, burner-on LED */
  rwf(x, y, w) {
    return `<rect x="${x}" y="${y}" width="${w}" height="76" rx="6" fill="#20262c" stroke="#0b0e11" stroke-width="2"/><rect x="${x + 10}" y="${y + 8}" width="${w - 20}" height="34" rx="3" fill="#0b0f12"/>` +
      `<text id="pnlRwfPV" x="${x + w - 18}" y="${y + 34}" text-anchor="end" style="font:700 22px var(--mono);fill:#ff4a3d">---</text><text x="${x + 16}" y="${y + 34}" style="font:700 10px sans-serif;fill:#8fa1b3">RWF55</text>` +
      `<text id="pnlRwfSP" x="${x + w - 18}" y="${y + 64}" text-anchor="end" style="font:700 15px var(--mono);fill:#38e08a">180</text><circle id="pnlRwfLed" cx="${x + 20}" cy="${y + 58}" r="5" fill="#3b4652"/><text x="${x + 30}" y="${y + 62}" style="font:700 8px sans-serif;fill:#8fa1b3">BURNER</text>`;
  },
  /* small panel lamp */
  lamp(cx, cy, id, col, label) {
    return `<circle id="${id}" data-on="${col}" cx="${cx}" cy="${cy}" r="13" fill="#3b4652" stroke="#1d242b" stroke-width="3"/><text x="${cx}" y="${cy + 30}" text-anchor="middle" style="font:700 9px sans-serif;fill:#c8d2dc">${label}</text>`;
  },
  /* 5 A control circuit breaker */
  breaker(cx, cy) {
    return `<rect x="${cx - 26}" y="${cy - 30}" width="52" height="60" rx="5" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/><rect x="${cx - 9}" y="${cy - 22}" width="18" height="26" rx="3" fill="#d9dde1" stroke="#7b848c"/><text x="${cx}" y="${cy + 22}" text-anchor="middle" style="font:700 10px sans-serif;fill:#e9edf1">5 A</text>`;
  },
  /* time delay module */
  timer(x, y, w) {
    return `<rect x="${x}" y="${y}" width="${w}" height="56" rx="6" fill="#e7ebee" stroke="#7d8892" stroke-width="2"/><circle cx="${x + 30}" cy="${y + 28}" r="14" fill="#f4f6f8" stroke="#6b7480" stroke-width="2"/><line x1="${x + 30}" y1="${y + 28}" x2="${x + 38}" y2="${y + 18}" stroke="#b3302a" stroke-width="2.5"/>` +
      `<text x="${x + 56}" y="${y + 24}" style="font:700 11px sans-serif;fill:#20262c">TD-1</text><text x="${x + 56}" y="${y + 42}" style="font:700 10px sans-serif;fill:#3a434c">20 SEC</text><circle id="pnlTdLed" cx="${x + w - 18}" cy="${y + 28}" r="5" fill="#3b4652"/>`;
  }
});

function buildPanel() {
  let g = PT.defs + `<rect x="0" y="0" width="${PANEL_W}" height="${PANEL_H}" rx="10" fill="#1a222b"/>`;
  /* ---- power ---- */
  g += pbox(40, 30, 420, 320, 'Fused disconnect', 'by others · 208 V 3 phase') + BX.blades([120, 240, 360], 122, 196);
  [120, 240, 360].forEach(x => { g += BX.cartridge(x, 198, 302, '15 A'); });
  g += `<text class="sub" x="438" y="126" text-anchor="end" style="font-size:11px">LINE</text><text class="sub" x="438" y="200" text-anchor="end" style="font-size:11px">LOAD</text>`;
  g += pbox(480, 30, 300, 330, 'VFD', 'A/C Tech SCF · L1-L3 in, U V W out') + BX.vfd(495, 90, 270, 175) + PT.tbar(486, 774, 300);
  g += pbox(800, 30, 300, 330, 'Control transformer', '') + PT.fuse(830, 880, 140) + PT.fuse(960, 1010, 140) + PT.xfmr(812, 200, 276, 140, 890, 1010, 230, 310, '208 V', '115 V');
  /* ---- blower and switches ---- */
  g += psect(370, 'Blower, control power and switches');
  g += pbox(40, 380, 300, 300, 'Combustion blower', '2 hp, 3 phase (from VFD)') + PT.wheel(190, 520, 60, 'blw') + PT.tbar(80, 300, 630);
  g += pbox(360, 380, 170, 140, 'Circuit breaker', '') + BX.breaker(445, 452);
  g += pbox(550, 380, 170, 140, 'Burner switch', '') + BX.lamp(635, 440, 'pnlBsLamp', '#f5c400', 'ON');
  g += pbox(360, 540, 360, 140, 'Blocked air filter switch', '') + BX.lamp(640, 600, 'pnlFltLamp', '#ffb020', 'CHANGE FILTER');
  g += pbox(740, 380, 360, 140, 'Ground', 'X2 is grounded at TB2') + PT.ground(1040, 470);
  g += pbox(740, 540, 360, 140, 'Field enable / heat call', 'TB4 to TB5 (factory jumper removed)') + PT.pswitch(800, 1040, 640, 'call');
  /* ---- terminal strip ---- */
  g += psect(710, 'Terminal strip (Figure 9c)');
  g += `<rect x="40" y="720" width="1060" height="110" rx="8" fill="url(#ptBeige)" stroke="#8d8672" stroke-width="2"/>`;
  [['1', 'X1'], ['2', 'N'], ['3', 'CB'], ['4', 'SW'], ['5', 'LIM'], ['6', 'RM6'], ['7', 'RM7'], ['8', 'PILOT'], ['9', 'MAIN'], ['10', 'IGN'], ['11', 'CRA1'], ['12', 'CRA2']].forEach((t, i) => {
    g += `<text x="${85 + i * 88}" y="826" text-anchor="middle" style="font:700 9px sans-serif;fill:#3a434c">${t[1]}</text>`;
  });
  /* ---- limit string ---- */
  g += psect(850, 'Limit string · TB5 → high limit → RWF55 → low gas → high gas → flow → low water → vestibule fuse → TB6');
  g += pbox(40, 860, 250, 170, 'High limit L4008E', '') + BX.aquastat(60, 905, 210, '210°F', true);
  g += pbox(305, 860, 250, 170, 'Operating (RWF55)', '') + BX.rwf(320, 900, 220);
  g += pbox(570, 860, 250, 170, 'Low gas pressure', '') + BX.dswitch(695, 935, 'url(#ptBlue)', 'LOW GAS', 'MR');
  g += pbox(835, 860, 250, 170, 'High gas pressure', '') + BX.dswitch(960, 935, '#b3302a', 'HIGH GAS', 'MR');
  g += pbox(40, 1050, 250, 170, 'Flow switch FS4-3', '') + BX.flowsw(60, 1092, 210);
  g += pbox(305, 1050, 250, 170, 'Low-water cutoff', '') + BX.lwco(325, 1092, 210);
  g += pbox(570, 1050, 250, 170, 'Vestibule fuse switch', '') + `<rect x="645" y="1100" width="100" height="44" rx="6" fill="url(#ptBlack)" stroke="#0b0e11"/><rect x="665" y="1114" width="60" height="16" rx="3" fill="url(#ptBrass)" stroke="#5c3f10"/>`;
  g += pbox(835, 1050, 250, 170, 'Combustion airflow sw.', '') + BX.dswitch(960, 1130, '#6d7c8b', 'AIR', '');
  /* ---- relay module ---- */
  g += psect(1250, 'Flame safeguard RM7896D (30 s purge card ST7800A)');
  g += pbox(40, 1260, 1060, 330, '', '');
  g += `<rect x="70" y="1280" width="820" height="170" rx="10" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/><rect x="80" y="1290" width="800" height="14" rx="4" fill="#2d343b"/>`;
  g += `<text x="96" y="1326" style="font:700 12px sans-serif;fill:#c8d2dc">HONEYWELL RM7896D</text>`;
  g += `<rect x="110" y="1340" width="330" height="96" rx="8" fill="#0d1822" stroke="#25343f" stroke-width="3"/><text id="pnlKdm" x="275" y="1380" text-anchor="middle" style="font:700 20px var(--mono);fill:#7fd7ff">---</text><text id="pnlKdm2" x="275" y="1410" text-anchor="middle" style="font:13px var(--mono);fill:#7fd7ff"></text>`;
  ['POWER', 'PILOT', 'FLAME', 'MAIN', 'ALARM'].forEach((t, i) => { g += `<circle class="pled" data-led="${t}" cx="${490 + i * 76}" cy="1370" r="8" fill="#3b4652"/><text x="${490 + i * 76}" y="1398" text-anchor="middle" style="font:700 10px sans-serif;fill:#c8d2dc">${t}</text>`; });
  g += `<rect x="910" y="1300" width="170" height="130" rx="8" fill="#17543a" stroke="#0a2a1c" stroke-width="2"/><text x="995" y="1326" text-anchor="middle" style="font:700 10px sans-serif;fill:#e9efe9">R7849A UV AMPLIFIER</text><text x="995" y="1342" text-anchor="middle" style="font:700 9px sans-serif;fill:#bfe6cf">TEST JACKS V dc</text>`;
  g += `<rect x="70" y="1498" width="1000" height="80" rx="8" fill="url(#ptBeige)" stroke="#8d8672" stroke-width="2"/><text x="1056" y="1570" text-anchor="end" style="font:700 10px sans-serif;fill:#3a434c">SUBBASE · F to UV scanner</text>`;
  /* ---- relays ---- */
  g += psect(1610, 'Relays and timer');
  g += pbox(40, 1620, 255, 170, 'CRA1 enable blower', '') + PT.relay(48, 1662, 240, 118, 'cra1');
  g += pbox(305, 1620, 255, 170, 'CRA2 release to mod', '') + PT.relay(313, 1662, 240, 118, 'cra2');
  g += pbox(570, 1620, 255, 170, 'Time delay TD-1', 'from TB9 → TB12') + BX.timer(600, 1676, 200);
  g += pbox(835, 1620, 255, 170, 'Alarm light', 'from RM 3') + `<circle id="pnlAlarm" cx="960" cy="1700" r="24" fill="#3a1d1a" stroke="#7a3a33" stroke-width="4"/>`;
  /* ---- loads ---- */
  g += psect(1810, 'Burner loads (115 V)');
  g += pbox(40, 1820, 200, 190, 'Ignition xfmr', '') + BX.ignx(140, 1915);
  g += pbox(252, 1820, 200, 190, 'Pilot V4046', '') + BX.solenoid(352, 1895);
  g += pbox(464, 1820, 200, 190, 'SKP75 actuator', '') + BX.actuator(564, 1900, 'pnlV1');
  g += pbox(676, 1820, 200, 190, 'Secondary valve', '') + BX.solenoid(776, 1895).replace('120 V', '115 V') + `<text id="pnlV2" x="776" y="1935" text-anchor="middle" style="font:800 10px sans-serif;fill:#e5483b">CLOSED</text>`;
  g += pbox(888, 1820, 200, 190, 'Vent valve (N.O.)', '') + BX.solenoid(988, 1895).replace('120 V', 'VENT');
  /* ---- system pump (by others) ---- */
  g += psect(2020, 'System pump (by others) · fed from TB3, runs whenever the boiler has power');
  g += pbox(40, 2030, 420, 360, 'System pump starter', '') + PT.contactor(50, 2092, 410, 216, [120, 240, 360], 2135, 2265, [420, 2135, 2265], 'ps') + BX.overload(60, 2308, 390);
  g += pbox(480, 2030, 300, 360, 'System pump motor', '5 hp, 208 V, 3 phase') + PT.motor(520, 2130, 200, 110) + PT.tbar(520, 740, 2330);
  g += pbox(800, 2030, 300, 360, 'Field wiring', '') + `<text class="sub" x="816" y="2100">The pump keeps water moving</text><text class="sub" x="816" y="2122">through the building at all times.</text><text class="sub" x="816" y="2160">Starter coil: TB3 → OL 95-96 → A,</text><text class="sub" x="816" y="2182">B → TB2 (neutral).</text>`;
  /* brass lugs under every terminal, wires, then the terminal dots */
  g += PT.lugs(TERMS.filter(t => !/^FT_/.test(t[0])).map(t => [t[1], t[2]]));
  g += `<circle cx="960" cy="1390" r="12" fill="#c33" stroke="#6e1712" stroke-width="2"/><circle cx="1040" cy="1390" r="12" fill="#222" stroke="#000" stroke-width="2"/>`;
  g += buildWires();
  TERMS.forEach(t => {
    const id = t[0], x = t[1], y = t[2], side = t[3] === 'r', up = t[3] === 'a' || t[3] === 'ad', ly = side ? y + 5 : up ? y - 20 : y + 34, lx = side ? x + 24 : x;
    g += `<g class="term" data-id="${id}" tabindex="0" role="button" aria-label="${esc(NODES[id])}"><title>${esc(NODES[id])}</title>` +
      `<circle class="ring-r" r="20" cx="${x}" cy="${y}" style="display:none"/><circle class="ring-b" r="20" cx="${x}" cy="${y}" style="display:none"/>` +
      `<circle class="pad" cx="${x}" cy="${y}" r="24"/><circle class="hit" cx="${x}" cy="${y}" r="11"/><text x="${lx}" y="${ly}" text-anchor="${side ? 'start' : 'middle'}"${t[3] === 'ad' ? ' style="fill:#20262c"' : ''}>${TLBL[id] || id}</text></g>`;
  });
  return g;
}
/* field wiring, drawn when "Wires: On". Leg colours as in the package unit game; red 115 V hot, blue neutral */
function buildWires() {
  const LEG = { 1: '#e8a33b', 2: '#b48cff', 3: '#4ac9c0' };
  let s = '';
  NETS.forEach((n, i) => {
    const pts = n.filter(id => TPOS[id]);
    if (pts.length < 2) return;
    const neutral = n.indexOf('TB2') >= 0;
    const lm = n.join(' ').match(/\bF([123])_OUT|\bPS_T([123])|\bVFD_([UVW])/);
    const col = neutral ? '#4aa3df' : lm ? LEG[lm[1] || lm[2] || ({ U: 1, V: 2, W: 3 })[lm[3]]] : '#e5483b';
    const root = neutral ? 'TB2' : pts[0];
    for (let k = neutral ? 0 : 1; k < pts.length; k++) {
      const a = TPOS[neutral ? root : pts[k - 1]], b = TPOS[pts[k]];
      if (a === b) continue;
      const lane = 22 + (i % 6) * 5;
      const d = `M${a[0]} ${a[1]} V${Math.max(a[1], b[1]) + lane} H${b[0]} V${b[1]}`;
      s += `<path class="wr" d="${d}" stroke="${col}" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;
    }
  });
  return s;
}

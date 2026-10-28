/* ===== Ladder schematic: how 120 V flows from L1 through each control to neutral ===== */
const LAD_W = 900, LAD_H = 1390, RAIL_L = 70, RAIL_R = 840;

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
/* 208 V power section drawn above the control ladder: vertical legs, horizontal buses, contacts drawn vertically */
const VS = {
  no: (x, y, t) => `<path class="w" d="M${x} ${y} v12 M${x - 10} ${y + 12} h20 M${x - 10} ${y + 24} h20 M${x} ${y + 24} v12"/>` + (t ? `<text x="${x + 14}" y="${y + 22}">${t}</text>` : ''),
  fuse: (x, y, t) => `<path class="w" d="M${x} ${y} v8 M${x} ${y + 40} v8"/><rect class="p" x="${x - 7}" y="${y + 8}" width="14" height="32" rx="3"/><path class="w" d="M${x} ${y + 8} v32"/>` + (t ? `<text x="${x + 12}" y="${y + 28}">${t}</text>` : ''),
  ol: (x, y) => `<path class="w" d="M${x} ${y} v6 q8 4 0 8 q-8 4 0 8 q8 4 0 8 v6"/>`,
  motor: (cx, cy, t) => `<circle class="p" cx="${cx}" cy="${cy}" r="26"/><text x="${cx}" y="${cy - 2}" text-anchor="middle">M</text><text x="${cx}" y="${cy + 12}" text-anchor="middle" style="font-size:10px">3~</text><text class="t" x="${cx}" y="${cy + 44}" text-anchor="middle">${t}</text>`
};
function powerLadder() {
  let s = `<text class="t" x="70" y="22">208 V 3 PHASE</text>`;
  const L = [100, 140, 180], BUS = [150, 170, 190], COL = ['#e8a33b', '#b48cff', '#4ac9c0'];
  L.forEach((x, i) => {
    s += `<text x="${x}" y="44" text-anchor="middle">L${i + 1}</text><path class="w" d="M${x} 50 v8" style="stroke:${COL[i]}"/>` + VS.no(x, 58, i === 2 ? 'DISC (BY OTHERS)' : '') + VS.fuse(x, 94, i === 2 ? 'F1-F3' : '');
    s += `<path class="w" d="M${x} 142 V${BUS[i]} H700" style="stroke:${COL[i]}"/>`;
  });
  s += `<path class="w" d="M70 76 H200" style="stroke-dasharray:4 4"/>`;
  /* VFD to the 2 hp blower */
  [300, 330, 360].forEach((x, i) => { s += `<circle cx="${x}" cy="${BUS[i]}" r="3.5" fill="#b9c6d3"/><path class="w" d="M${x} ${BUS[i]} V210"/>`; });
  s += `<rect class="p" x="280" y="210" width="100" height="40" rx="4"/><text x="330" y="235" text-anchor="middle">VFD</text><text x="390" y="226">RUN: CRA1</text><text x="390" y="242">SPEED: RWF55</text>`;
  s += `<path class="w" d="M300 250 V262 L330 270 M330 250 V270 M360 250 V262 L330 270"/>` + VS.motor(330, 296, 'BLOWER 2 HP');
  /* system pump starter (by others) */
  [490, 520, 550].forEach((x, i) => { s += `<circle cx="${x}" cy="${BUS[i]}" r="3.5" fill="#b9c6d3"/><path class="w" d="M${x} ${BUS[i]} V206"/>` + VS.no(x, 206, i === 2 ? 'PS' : '') + VS.ol(x, 242) + `<path class="w" d="M${x} 270 V272 L520 276"/>`; });
  s += `<text x="566" y="262">OL</text>` + VS.motor(520, 300, 'SYSTEM PUMP');
  /* control transformer through two primary fuses on L1-L2 */
  s += `<path class="w" d="M640 150 V170 M670 170 V170"/><circle cx="640" cy="150" r="3.5" fill="#b9c6d3"/><circle cx="670" cy="170" r="3.5" fill="#b9c6d3"/>`;
  s += VS.fuse(640, 152, '') + VS.fuse(670, 172, 'FU1').replace('M670 172 v8', 'M670 172 v8');
  s += `<path class="w" d="M640 200 V214 M670 220 V214 M630 214 h50 M640 216 q8 4 0 8 q8 4 0 8 q8 4 0 8 M670 216 q8 4 0 8 q8 4 0 8 q8 4 0 8 M630 246 h50 M630 250 h50"/>`;
  s += `<text x="690" y="236">208 / 115 V</text>`;
  s += `<path class="w" d="M640 250 V362 H${RAIL_L - 40} V${330 + 60}"/><path class="w" d="M670 250 V276 H${RAIL_R} V${330 + 46}"/><text x="${RAIL_R - 60}" y="270">X2 = TB2 (grounded)</text><text x="${RAIL_L - 36}" y="356">X1 = TB1</text>`;
  return s;
}
function buildLadder() {
  let s = powerLadder() + '<g transform="translate(0,330)">';
  s += `<text class="t" x="${RAIL_L + 60}" y="22">115 V CONTROL (TB3 after the 5 A breaker)</text><text class="t" x="${RAIL_R - 6}" y="30">TB2</text>`;
  s += SYM.fuse(RAIL_L - 40, 60, 'CB 5A')[0] + `<path class="w" d="M${RAIL_L + 16} 60 h20 v20 H${RAIL_L} V1010"/><text x="${RAIL_L + 40}" y="96">TB3</text>`;
  s += `<path class="w" d="M${RAIL_R} 46 V1010"/>`;
  /* rung 1: burner switch to TB4, with its light */
  s += rung(130, [['no', 'BURNER SW'], ['wire', 'TB4', 420], ['lamp', 'ON']], { label: '1' });
  /* rung 2: blocked air filter switch and light */
  const t4 = 230;
  s += `<path class="w" d="M${t4} 130 V390"/><circle cx="${t4}" cy="130" r="4" fill="#b9c6d3"/>`;
  s += rung(200, [['press', 'BLOCKED FILTER'], ['lamp', 'CHANGE FILTER']], { from: t4, label: '2' });
  /* rung 3: field enable, then the limit string to terminal 6 */
  s += rung(290, [['no', 'EN'], ['temp', 'HL', true], ['temp', 'RWF', true], ['press', 'LGPS'], ['press', 'HGPS', true], ['flow', 'FS'], ['probe', 'LWCO'], ['nc', 'VF'], ['rmT', '6']], { from: t4, label: '3' });
  s += `<path class="w" d="M${t4} 390 H${t4}"/>`;
  s += `<text x="${t4 + 4}" y="334" style="font:11px var(--mono);fill:#8fa1b3">EN field enable TB4-5 · HL high limit L4008E · RWF RWF55 Q13-14</text><text x="${t4 + 4}" y="350" style="font:11px var(--mono);fill:#8fa1b3">LGPS/HGPS gas switches (manual reset, no lockout) · FS flow · VF vestibule fuse</text>`;
  /* rung 4: combustion airflow switch 6 to 7 */
  s += rung(390, [['rmT', '6'], ['press', 'COMB. AIRFLOW'], ['rmT', '7']], { from: 300, to: 620, label: '4' });
  s += `<text x="300" y="430" style="font:11px var(--mono);fill:#8fa1b3">TB6 → airflow switch → TB7: the RM7896D lockout interlock</text>`;
  /* relay module outputs */
  s += `<rect x="${RAIL_L + 30}" y="460" width="150" height="460" rx="6" fill="none" stroke="#4aa3df" stroke-dasharray="6 4"/><text class="t" x="${RAIL_L + 40}" y="480">RM7896D</text><text class="t" x="${RAIL_L + 40}" y="496">power on 5</text>`;
  const outs = [[540, '4', 'coil', 'CRA1', '5', 'TB11'], [610, '8', 'coil', 'PILOT', '6', 'TB8'], [680, '9', 'coil', 'SKP75', '7', 'TB9'], [860, '10', 'xfmr', 'IGN XFMR', '10', 'TB10'], [920, '3', 'lamp', 'ALARM', '11', '']];
  outs.forEach(o => { s += rung(o[0], [['no', ''], ['rmT', o[1]], ['wire', o[5], 120], [o[2], o[3]]], { label: o[4] }); });
  /* TB9 also feeds the secondary valve, vent valve and TD-1 (which releases modulation through CRA2 after 20 s) */
  const bx = 520;
  s += `<path class="w" d="M${bx} 680 V800"/><circle cx="${bx}" cy="680" r="4" fill="#b9c6d3"/>`;
  [[720, 'coil', 'SEC'], [760, 'coil', 'VENT']].forEach(b => { s += `<path class="w" d="M${bx} ${b[0]} H${RAIL_R - 120}"/>` + SYM[b[1]](RAIL_R - 120, b[0], b[2])[0] + `<path class="w" d="M${RAIL_R - 64} ${b[0]} H${RAIL_R}"/>`; });
  s += `<path class="w" d="M${bx} 800 H560"/>` + SYM.rmT(560, 800, 'TD')[0] + `<path class="w" d="M590 800 H610"/>` + SYM.no(610, 800, '20 s')[0] + `<path class="w" d="M654 800 H${RAIL_R - 120}"/><text x="670" y="792">TB12</text>` + SYM.coil(RAIL_R - 120, 800, 'CRA2')[0] + `<path class="w" d="M${RAIL_R - 64} 800 H${RAIL_R}"/>`;
  [[720, '8'], [760, '8'], [800, '9']].forEach(l => { s += `<text class="t" x="${RAIL_R + 14}" y="${l[0] + 4}">${l[1]}</text>`; });
  /* rung 12: system pump (by others) from TB3 through its overload */
  s += rung(980, [['nc', 'OL 95-96'], ['coil', 'PS']], { label: '12' }) + `<text x="${RAIL_L + 300}" y="1010" style="font:11px var(--mono);fill:#8fa1b3">PS = system pump starter (by others), runs continuously</text>`;
  s += `<text x="${RAIL_L + 40}" y="516" style="font:11px var(--mono);fill:#8fa1b3">4: purge→postpurge · 8: pilot trial + MFEP · 10: first 5 s of pilot trial · 9: MFEP + run · 3: lockout</text>`;
  s += `<text x="${RAIL_L}" y="1058" style="font:12px var(--mono);fill:#8fa1b3">SEC = secondary gas valve · VENT = normally open vent valve · TD = time delay TD-1</text>`;
  s += `<text x="${RAIL_L}" y="1040" style="font:12px var(--mono);fill:#8fa1b3">UV scanner on F (R7849A amplifier: 1.5–5.0 V dc normal at the test jacks). Based on EVA manual Figure 9c.</text>`;
  return s + '</g>';
}

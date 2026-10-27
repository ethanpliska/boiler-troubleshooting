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
    s += `<text x="${x}" y="44" text-anchor="middle">L${i + 1}</text><path class="w" d="M${x} 50 v8" style="stroke:${COL[i]}"/>` + VS.no(x, 58, i === 2 ? 'DISC' : '') + VS.fuse(x, 94, i === 2 ? 'F1-F3 15A' : '');
    s += `<path class="w" d="M${x} 142 V${BUS[i]} H700" style="stroke:${COL[i]}"/>`;
  });
  s += `<path class="w" d="M70 76 H200" style="stroke-dasharray:4 4"/>`;
  /* blower: M1 contacts to the motor */
  [310, 340, 370].forEach((x, i) => { s += `<circle cx="${x}" cy="${BUS[i]}" r="3.5" fill="#b9c6d3"/><path class="w" d="M${x} ${BUS[i]} V206"/>` + VS.no(x, 206, i === 2 ? 'M1' : '') + `<path class="w" d="M${x} 242 V262 L340 270"/>`; });
  s += VS.motor(340, 296, 'BLOWER');
  /* pump: starter contacts and overload heaters */
  [490, 520, 550].forEach((x, i) => { s += `<circle cx="${x}" cy="${BUS[i]}" r="3.5" fill="#b9c6d3"/><path class="w" d="M${x} ${BUS[i]} V206"/>` + VS.no(x, 206, i === 2 ? 'PS' : '') + VS.ol(x, 242) + `<path class="w" d="M${x} 270 V272 L520 276"/>`; });
  s += `<text x="566" y="262">OL</text>` + VS.motor(520, 300, 'PUMP');
  /* control transformer on L1-L2 */
  s += `<path class="w" d="M640 150 V214 M670 170 V214"/><circle cx="640" cy="150" r="3.5" fill="#b9c6d3"/><circle cx="670" cy="170" r="3.5" fill="#b9c6d3"/>`;
  s += `<path class="w" d="M630 214 h50 M640 214 q-2 8 0 8 M640 216 q8 4 0 8 q8 4 0 8 q8 4 0 8 M670 216 q8 4 0 8 q8 4 0 8 q8 4 0 8 M630 246 h50 M630 250 h50"/>`;
  s += `<text x="690" y="222">H1-H2 208 V</text><text x="690" y="262">X1-X2 120 V</text>`;
  s += `<path class="w" d="M640 250 V362 H${RAIL_L - 40} V${330 + 60}"/><path class="w" d="M670 250 V276 H${RAIL_R} V${330 + 46}"/><text x="${RAIL_R - 40}" y="270">X2 (grounded)</text><text x="${RAIL_L - 36}" y="356">X1</text>`;
  return s;
}
function buildLadder() {
  let s = powerLadder() + '<g transform="translate(0,330)">';
  s += `<text class="t" x="${RAIL_L + 60}" y="22">120 V CONTROL (X1 after FU4)</text><text class="t" x="${RAIL_R - 6}" y="30">X2</text>`;
  /* control fuse FU4 feeding the left rail */
  s += SYM.fuse(RAIL_L - 40, 60, 'FU4 3A')[0] + `<path class="w" d="M${RAIL_L + 16} 60 h20 v20 H${RAIL_L} V1010"/>`;
  s += `<path class="w" d="M${RAIL_R} 46 V1010"/>`;
  /* rung 1: heating call, pump overload contact, pump starter coil; node A feeds the burner */
  s += rung(130, [['no', 'HEAT CALL'], ['wire', 'A', 120], ['nc', 'OL 95-96'], ['coil', 'PS']], { label: '1' });
  s += `<text x="${RAIL_L + 300}" y="200" style="font:11px var(--mono);fill:#8fa1b3">PS = pump starter. OL opens on motor overload (manual reset).</text>`;
  /* rung 3: from A through the limit string to terminal 6 */
  const ax = 330;
  s += `<path class="w" d="M${ax} 130 V290"/><circle cx="${ax}" cy="130" r="4" fill="#b9c6d3"/>`;
  s += rung(290, [['no', 'BURNER SW'], ['temp', 'OPER 180°', true], ['temp', 'HI LIM MR', true], ['probe', 'LWCO'], ['flow', 'FLOW SW'], ['rmT', '6']], { from: ax, label: '3' });
  s += `<text x="${ax + 4}" y="330" style="font:11px var(--mono);fill:#8fa1b3">operating and high limit open on temperature rise</text>`;
  /* rung 4: lockout interlocks 6 to 7 */
  s += rung(390, [['rmT', '6'], ['press', 'LGPS (MR)'], ['press', 'HGPS (MR)', true], ['press', 'AIR SW'], ['rmT', '7']], { from: 180, to: 780, label: '4' });
  s += `<text x="180" y="430" style="font:11px var(--mono);fill:#8fa1b3">gas pressure switches are manual reset. 6 and 7 are inputs to the relay module.</text>`;
  /* the relay module outputs */
  s += `<rect x="${RAIL_L + 30}" y="470" width="150" height="440" rx="6" fill="none" stroke="#4aa3df" stroke-dasharray="6 4"/><text class="t" x="${RAIL_L + 40}" y="490">RELAY MODULE</text><text class="t" x="${RAIL_L + 40}" y="506">internal relays</text>`;
  const outs = [[550, '3', 'coil', 'M1', '5'], [620, '10', 'xfmr', 'IGN XFMR', '6'], [690, '8', 'coil', 'PV', '7'], [760, '9', 'coil', 'V1', '8'], [870, '4', 'lamp', 'ALARM', '10']];
  outs.forEach(o => { s += rung(o[0], [['no', ''], ['rmT', o[1]], ['wire', '', 120], [o[2], o[3]]], { label: o[4] }); });
  s += `<path class="w" d="M520 760 V800 H${RAIL_R - 120}"/><circle cx="520" cy="760" r="4" fill="#b9c6d3"/>` + SYM.coil(RAIL_R - 120, 800, 'V2')[0] + `<path class="w" d="M${RAIL_R - 64} 800 H${RAIL_R}"/><text class="t" x="${RAIL_R + 14}" y="804">9</text>`;
  s += rung(970, [['rmT', 'L1'], ['wire', 'RELAY MODULE POWER', 380], ['rmT', 'L2']], { label: '11' });
  s += `<text x="${RAIL_L + 40}" y="530" style="font:11px var(--mono);fill:#8fa1b3">3: prepurge→postpurge · 10: pilot trial · 8: PFEP+MFEP · 9: MFEP+run · 4: lockout</text>`;
  s += `<text x="${RAIL_L}" y="1040" style="font:12px var(--mono);fill:#8fa1b3">M1 = blower contactor. UV scanner wires to F and G on the subbase (1.25 V dc minimum at the amplifier test jacks).</text>`;
  return s + '</g>';
}

/* Copied unchanged from the Package Unit Troubleshooting game (parts.js, the PT artwork helpers) so both games' panels look alike. */
/* ===== Realistic component artwork for the unit panel pages =====
   Every helper returns SVG drawn BEHIND the terminal dots. Terminals keep their positions;
   the art is placed around them so each dot looks like a screw on the real part. */
const PT = {
  defs: '<defs>' +
    '<linearGradient id="ptMetal" x1="0" x2="1"><stop offset="0" stop-color="#6b7886"/><stop offset=".35" stop-color="#cfd8e0"/><stop offset=".7" stop-color="#8c99a6"/><stop offset="1" stop-color="#58646f"/></linearGradient>' +
    '<linearGradient id="ptMetalV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dfe6"/><stop offset=".5" stop-color="#8c99a6"/><stop offset="1" stop-color="#56626d"/></linearGradient>' +
    '<linearGradient id="ptBrass" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f0cf80"/><stop offset=".5" stop-color="#c9953a"/><stop offset="1" stop-color="#8a5f1c"/></linearGradient>' +
    '<linearGradient id="ptBlack" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a4048"/><stop offset=".5" stop-color="#22272d"/><stop offset="1" stop-color="#14181c"/></linearGradient>' +
    '<linearGradient id="ptBlue" x1="0" x2="1"><stop offset="0" stop-color="#1d4e8f"/><stop offset=".4" stop-color="#3b82d6"/><stop offset="1" stop-color="#173f73"/></linearGradient>' +
    '<linearGradient id="ptCopper" x1="0" x2="1"><stop offset="0" stop-color="#8a4a20"/><stop offset=".5" stop-color="#e0995a"/><stop offset="1" stop-color="#7a3f18"/></linearGradient>' +
    '<linearGradient id="ptBeige" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e9e4d6"/><stop offset="1" stop-color="#c9c2ad"/></linearGradient>' +
    '</defs>',
  /* brass screw lug behind a terminal dot */
  lug(x, y, dir) {
    const w = 34, h = 22; dir = dir || 'c';
    return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="3" fill="url(#ptBrass)" stroke="#5c3f10" stroke-width="1.2"/>`;
  },
  lugs(list) { return list.map(([x, y]) => PT.lug(x, y)).join(''); },
  /* contactor: moulded body, fixed contact stems (line above / load below), a moving carrier with
     copper bridges that slides up (open) and down (closed), and a coil can with an armature plate.
     k = id used by app.js to animate it (data-k). */
  contactor(x, y, w, h, poles, yt, yb, coil, k) {
    const mid = (yt + yb) / 2;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/>`;
    s += `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="6" fill="none" stroke="#4a525b" stroke-width="1" opacity=".7"/>`;
    s += `<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="10" rx="3" fill="#2d343b"/><rect x="${x + 8}" y="${y + h - 18}" width="${w - 16}" height="10" rx="3" fill="#2d343b"/>`;
    [[x + 14, y + 13], [x + w - 14, y + 13], [x + 14, y + h - 13], [x + w - 14, y + h - 13]].forEach(([cx, cy]) => { s += `<circle cx="${cx}" cy="${cy}" r="4" fill="#0e1114" stroke="#6b7886"/>`; });
    poles.forEach(px => {
      s += `<rect x="${px - 22}" y="${yt - 16}" width="44" height="${yb - yt + 32}" rx="6" fill="#1b2026" stroke="#0a0d10"/>`;
      s += `<rect x="${px - 6}" y="${yt + 10}" width="12" height="${mid - 8 - yt - 10}" fill="url(#ptCopper)"/><rect x="${px - 6}" y="${mid + 8}" width="12" height="${yb - 10 - mid - 8}" fill="url(#ptCopper)"/>`;
      s += `<rect x="${px - 9}" y="${mid - 14}" width="18" height="6" rx="2" fill="url(#ptMetal)" stroke="#3d4650"/><rect x="${px - 9}" y="${mid + 8}" width="18" height="6" rx="2" fill="url(#ptMetal)" stroke="#3d4650"/>`;
    });
    if (coil) {
      const [cx, c1, c2] = coil;
      s += `<rect x="${cx - 28}" y="${c1 - 10}" width="56" height="${c2 - c1 + 20}" rx="8" fill="#3a4048" stroke="#10151a"/>`;
      for (let yy = c1 + 12; yy < c2 - 8; yy += 7) s += `<line x1="${cx - 22}" y1="${yy}" x2="${cx + 22}" y2="${yy}" stroke="#8a5f1c" stroke-width="3"/>`;
      s += `<rect class="coilglow" data-k="${k}" x="${cx - 28}" y="${c1 - 10}" width="56" height="${c2 - c1 + 20}" rx="8" fill="#38e08a" opacity="0" style="transition:opacity .25s;pointer-events:none"/>`;
    }
    const lx = poles[0] - 26, rx = coil ? coil[0] - 38 : poles[poles.length - 1] + 26;
    let g = `<rect x="${lx}" y="${mid - 7}" width="${rx - lx}" height="14" rx="4" fill="url(#ptMetalV)" stroke="#3d4650"/>`;
    poles.forEach(px => { g += `<rect x="${px - 15}" y="${mid - 22}" width="30" height="44" rx="5" fill="url(#ptCopper)" stroke="#4a2410"/><rect x="${px - 15}" y="${mid - 22}" width="30" height="5" fill="#f0cf80" opacity=".6"/>`; });
    s += `<g class="armg" data-k="${k}" style="transform:translateY(-26px)">${g}</g>`;
    if (coil) {
      // laminated pole face on the coil, and the armature plate that is pulled in against it when the coil energizes
      const [cx, c1, c2] = coil;
      s += `<rect x="${cx - 30}" y="${mid - 40}" width="4" height="80" rx="2" fill="#2f3943" stroke="#10151a"/>`;
      let pl = `<rect x="${cx - 38}" y="${mid - 38}" width="10" height="76" rx="3" fill="url(#ptMetal)" stroke="#2f3943" stroke-width="1.5"/>`;
      for (let yy = mid - 30; yy < mid + 34; yy += 8) pl += `<line x1="${cx - 37}" y1="${yy}" x2="${cx - 29}" y2="${yy}" stroke="#56626d" stroke-width="1"/>`;
      pl += `<circle cx="${cx - 33}" cy="${mid}" r="3.5" fill="#c9953a" stroke="#5c3f10"/>`;
      s += `<g class="armp" data-k="${k}" style="transform:translateX(-7px)">${pl}</g>`;
    }
    s += `<rect x="${x + w / 2 - 43}" y="${y + 3}" width="86" height="17" rx="8" fill="#14181c" stroke="#3d4650"/><circle class="kled" data-k="${k}" cx="${x + w / 2 - 31}" cy="${y + 11.5}" r="4" fill="#55616d"/><text class="kbadge" data-k="${k}" x="${x + w / 2 + 8}" y="${y + 15}" text-anchor="middle" style="font:700 10px sans-serif;fill:#c8d2dc">K OPEN</text>`;
    return s + PT.lugs(poles.reduce((a, px) => a.concat([[px, yt], [px, yb]]), []).concat(coil ? [[coil[0], coil[1]], [coil[0], coil[2]]] : []));
  },
  /* oval dual run capacitor can with terminals on top */
  can(x, y, w, h, lab, sub) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.28}" fill="url(#ptMetal)" stroke="#3d4650" stroke-width="2"/>`;
    s += `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="26" rx="8" fill="#26303a"/>`;
    s += `<rect x="${x + w * 0.22}" y="${y + h * 0.42}" width="${w * 0.56}" height="${h * 0.34}" rx="4" fill="#f1f3f5" opacity=".92"/>`;
    s += `<text x="${x + w / 2}" y="${y + h * 0.42 + 16}" text-anchor="middle" style="font:700 12px sans-serif;fill:#20262c">${lab}</text><text x="${x + w / 2}" y="${y + h * 0.42 + 32}" text-anchor="middle" style="font:600 10px sans-serif;fill:#3a434c">${sub || ''}</text>`;
    return s;
  },
  /* capacitor seen from above: aluminum can rim, dark plastic top with a raised base under every terminal,
     a pressure-relief vent, and the printed rating sticker. terms = [[x,y],...]; stick = [cx,cy,w,h]; vent = [x,y] */
  cap(x, y, w, h, lab, sub, terms, stick, vent) {
    const r = Math.min(w, h) / 2;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#ptMetal)" stroke="#3d4650" stroke-width="2.5"/>`;
    s += `<rect x="${x + 7}" y="${y + 7}" width="${w - 14}" height="${h - 14}" rx="${r - 7}" fill="#8c99a6" stroke="#56626d"/>`;
    s += `<rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${h - 24}" rx="${r - 12}" fill="#232a31" stroke="#0e1114" stroke-width="1.5"/>`;
    s += `<rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="${Math.max(r - 16, 4)}" fill="none" stroke="#3a434c" stroke-width="1"/>`;
    terms.forEach(([tx, ty]) => { s += `<circle cx="${tx}" cy="${ty}" r="22" fill="#12161a" stroke="#4a525b" stroke-width="2"/><circle cx="${tx}" cy="${ty}" r="17" fill="none" stroke="#2c343c" stroke-width="2"/>`; });
    if (vent) s += `<circle cx="${vent[0]}" cy="${vent[1]}" r="9" fill="#303840" stroke="#5c6670"/><path d="M${vent[0] - 5} ${vent[1]} h10 M${vent[0]} ${vent[1] - 5} v10" stroke="#8c99a6" stroke-width="2"/>`;
    return s;
  },
  /* hermetic compressor shell with terminal plate */
  hermetic(x, y, w, h) {
    const cx = x + w / 2;
    let s = `<path d="M${x + 10} ${y + h * 0.28} Q${x + 10} ${y} ${cx} ${y} Q${x + w - 10} ${y} ${x + w - 10} ${y + h * 0.28} V${y + h - 30} Q${x + w - 10} ${y + h} ${cx} ${y + h} Q${x + 10} ${y + h} ${x + 10} ${y + h - 30} Z" fill="url(#ptMetal)" stroke="#2f3943" stroke-width="2.5"/>`;
    s += `<path d="M${x + 11} ${y + h * 0.3} H${x + w - 11}" stroke="#2a323a" stroke-width="3"/>`;
    s += `<rect x="${x + 11}" y="${y + h * 0.78}" width="${w - 22}" height="14" fill="#2a323a" opacity=".55"/>`;
    s += `<rect x="${x + w - 62}" y="${y + h * 0.43}" width="42" height="26" rx="3" fill="#e9edf1" stroke="#6b7886"/><path d="M${x + w - 56} ${y + h * 0.43 + 8} h30 M${x + w - 56} ${y + h * 0.43 + 14} h24 M${x + w - 56} ${y + h * 0.43 + 20} h28" stroke="#6b7886"/>`;
    return s;
  },
  /* compressor terminal head ("pecker head"): steel weld flange around three glass-sealed fusite pins, with a mounting stud and
     a spring retainer clip across the top. pins = [[x,y],[x,y],[x,y]] */
  peckerA(pins) {
    const pts = pins.map(p => p.join(',')).join(' ');
    const cx = pins.reduce((a, p) => a + p[0], 0) / pins.length, cy = pins.reduce((a, p) => a + p[1], 0) / pins.length;
    let s = `<polygon points="${pts}" fill="#2f3943" stroke="#2f3943" stroke-width="76" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts}" fill="url(#ptMetal)" stroke="url(#ptMetal)" stroke-width="68" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts}" fill="none" stroke="#56626d" stroke-width="56" stroke-linejoin="round" opacity=".7"/>`;
    s += `<polygon points="${pts}" fill="#8c99a6" stroke="#6b7886" stroke-width="40" stroke-linejoin="round" opacity=".55"/>`;
    pins.forEach(([x, y]) => {
      s += `<circle cx="${x}" cy="${y}" r="27" fill="#1b2026" stroke="#0b0e11" stroke-width="2"/><circle cx="${x}" cy="${y}" r="22" fill="url(#ptBlack)" stroke="#4a525b" stroke-width="2"/>`;
      s += `<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#6b7886" stroke-width="1.5" opacity=".7"/>`;
    });
    s += `<circle cx="${cx}" cy="${cy + 8}" r="9" fill="url(#ptMetalV)" stroke="#3d4650"/><path d="M${cx - 5} ${cy + 8} h10 M${cx} ${cy + 3} v10" stroke="#3d4650" stroke-width="1.5"/>`;
    return s;
  },
  /* compressor terminal head, molded-block style: a black plastic terminal box with ribbed sides, a raised lid lip, corner screws and
     a round brass-collared socket for each pin. pins = [[x,y],[x,y],[x,y]] */
  pecker(pins, box) {
    const xs = pins.map(p => p[0]), ys = pins.map(p => p[1]);
    const x1 = box ? box[0] : Math.min(...xs) - 38, y1 = box ? box[1] : Math.min(...ys) - 38, x2 = box ? box[0] + box[2] : Math.max(...xs) + 38, y2 = box ? box[1] + box[3] : Math.max(...ys) + 38, w = x2 - x1, h = y2 - y1;
    let s = `<rect x="${x1 - 6}" y="${y1 + 10}" width="${w + 12}" height="${h - 20}" rx="10" fill="#2a3036" stroke="#0b0e11" stroke-width="2"/>`;
    for (let yy = y1 + 22; yy < y2 - 18; yy += 9) s += `<line x1="${x1 - 6}" y1="${yy}" x2="${x1}" y2="${yy}" stroke="#4a525b" stroke-width="2"/><line x1="${x2}" y1="${yy}" x2="${x2 + 6}" y2="${yy}" stroke="#4a525b" stroke-width="2"/>`;
    s += `<rect x="${x1}" y="${y1}" width="${w}" height="${h}" rx="14" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2.5"/>`;
    s += `<rect x="${x1 + 7}" y="${y1 + 7}" width="${w - 14}" height="${h - 14}" rx="9" fill="#1d2329" stroke="#4a525b" stroke-width="1.5"/>`;
    [[x1 + 14, y1 + 14], [x2 - 14, y1 + 14], [x1 + 14, y2 - 14], [x2 - 14, y2 - 14]].forEach(([x, y]) => { s += `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#ptMetalV)" stroke="#2f3943"/><path d="M${x - 3} ${y} h6" stroke="#2f3943" stroke-width="1.5"/>`; });
    pins.forEach(([x, y]) => {
      s += `<circle cx="${x}" cy="${y}" r="27" fill="#0e1114" stroke="#4a525b" stroke-width="2"/><circle cx="${x}" cy="${y}" r="22" fill="url(#ptBrass)" stroke="#5c3f10" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="17" fill="#1b2026" stroke="#5c3f10"/>`;
    });
    s += `<rect x="${(x1 + x2) / 2 - 22}" y="${y2 - 20}" width="44" height="12" rx="3" fill="#2f3943" stroke="#4a525b"/><path d="M${(x1 + x2) / 2 - 14} ${y2 - 14} h28" stroke="#6b7886"/>`;
    return s;
  },
  /* terminal cover with three pins (fusite) */
  fusite(x, y, w, h) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/>`; },
  /* PSC fan motor: finned can, shaft, bracket */
  motor(x, y, w, h, shaft) {
    const cy = y + h / 2;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2.4}" fill="url(#ptBlue)" stroke="#0e2a4f" stroke-width="2"/>`;
    for (let xx = x + 22; xx < x + w - 14; xx += 14) s += `<line x1="${xx}" y1="${y + 6}" x2="${xx}" y2="${y + h - 6}" stroke="#0e2a4f" stroke-width="2" opacity=".55"/>`;
    s += `<rect x="${x + w * 0.35}" y="${y - 10}" width="${w * 0.3}" height="14" rx="3" fill="#8c99a6" stroke="#3d4650"/>`;
    if (shaft !== false) s += `<rect x="${x + w - 2}" y="${cy - 7}" width="24" height="14" fill="url(#ptMetalV)" stroke="#3d4650"/>`;
    s += `<rect x="${x + 12}" y="${y + h - 14}" width="${w - 24}" height="8" rx="3" fill="#20262c" opacity=".5"/>`;
    return s;
  },
  /* control transformer: steel E-I core with two coil bobbins. Primary (high-voltage H1/H2) on the left, secondary (24 V / C) on the right.
     c1/c2 = x of the primary/secondary terminal columns, t/b = y of the top/bottom terminal rows. */
  xfmr(x, y, w, h, c1, c2, t, b, pl, sl) {
    let s = `<rect x="${x - 8}" y="${y + h - 12}" width="24" height="10" rx="2" fill="url(#ptMetalV)" stroke="#2f3943"/><rect x="${x + w - 16}" y="${y + h - 12}" width="24" height="10" rx="2" fill="url(#ptMetalV)" stroke="#2f3943"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h - 10}" rx="3" fill="url(#ptMetalV)" stroke="#2f3943" stroke-width="2"/>`;
    for (let yy = y + 4; yy < y + h - 12; yy += 4) s += `<line x1="${x + 1}" y1="${yy}" x2="${x + w - 1}" y2="${yy}" stroke="#3d4650" stroke-width=".8" opacity=".55"/>`;
    s += `<rect x="${(c1 + c2) / 2 - 6}" y="${y + 4}" width="12" height="${h - 18}" fill="#aeb9c3" opacity=".6"/>`;
    const coil = (cx, wire, hi, tag) => {
      const y1 = t - 20, y2 = b + 20;
      let q = `<rect x="${cx - 32}" y="${y1}" width="64" height="${y2 - y1}" rx="6" fill="#10151a" stroke="#0a0d10"/>`;
      q += `<rect x="${cx - 27}" y="${y1 + 5}" width="54" height="${y2 - y1 - 10}" rx="4" fill="${wire}"/>`;
      for (let yy = y1 + 9; yy < y2 - 6; yy += 4) q += `<line x1="${cx - 25}" y1="${yy}" x2="${cx + 25}" y2="${yy}" stroke="${hi}" stroke-width="2" opacity=".7"/>`;
      return q;
    };
    s += coil(c1, '#2a2f36', '#6b7480') + coil(c2, '#a4601f', '#f0b070');
    [[c1, pl, 'PRIMARY'], [c2, sl, 'SECONDARY']].forEach(([cx, v, nm]) => {
      const my = t + 52;
      s += `<rect x="${cx - 27}" y="${my - 12}" width="54" height="24" rx="4" fill="#f1f3f5" stroke="#6b7886"/><text x="${cx}" y="${my - 2}" text-anchor="middle" style="font:700 9px sans-serif;fill:#20262c">${nm}</text><text x="${cx}" y="${my + 9}" text-anchor="middle" style="font:700 10px sans-serif;fill:#20262c">${v}</text>`;
    });
    return s;
  },
  /* 3 A blade fuse (ATO/ATC style, violet) standing in a black fuse block. The two blade terminals sit side by side at the foot of the
     fuse: x1 = IN, x2 = OUT, y = terminal row. The blades run down from the fuse body into the brass lugs. */
  fuse(x1, x2, y) {
    const mid = (x1 + x2) / 2, w = x2 - x1 + 22, top = y - 60, bot = y - 12, L = mid - w / 2, R = mid + w / 2;
    let s = `<rect x="${x1 - 30}" y="${y - 30}" width="${x2 - x1 + 60}" height="56" rx="10" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="2"/>`;
    s += `<rect x="${x1 - 30}" y="${y - 30}" width="${x2 - x1 + 60}" height="8" rx="4" fill="#4a525b" opacity=".6"/>`;
    s += `<rect x="${x1 - 14}" y="${y - 24}" width="28" height="12" rx="3" fill="#07090b"/><rect x="${x2 - 14}" y="${y - 24}" width="28" height="12" rx="3" fill="#07090b"/>`;
    s += `<rect x="${x1 - 5}" y="${y - 24}" width="10" height="26" fill="url(#ptMetal)" stroke="#3d4650"/><rect x="${x2 - 5}" y="${y - 24}" width="10" height="26" fill="url(#ptMetal)" stroke="#3d4650"/>`;
    s += PT.lug(x1, y) + PT.lug(x2, y);
    s += `<defs><linearGradient id="ptViolet" x1="0" x2="1"><stop offset="0" stop-color="#6d4fb8"/><stop offset=".3" stop-color="#b79cf2"/><stop offset=".75" stop-color="#8d6ed3"/><stop offset="1" stop-color="#58409a"/></linearGradient></defs>`;
    s += `<path d="M${L} ${bot} V${top + 10} Q${L} ${top} ${L + 10} ${top} H${R - 10} Q${R} ${top} ${R} ${top + 10} V${bot} Z" fill="url(#ptViolet)" stroke="#33236b" stroke-width="2"/>`;
    for (let i = 0; i < 3; i++) s += `<line x1="${mid - 16}" y1="${top + 8 + i * 5}" x2="${mid + 16}" y2="${top + 8 + i * 5}" stroke="#2c1d5e" stroke-width="1.6" opacity=".55"/>`;
    s += `<rect x="${L + 4}" y="${top + 26}" width="${w - 8}" height="${bot - top - 32}" rx="3" fill="#000" opacity=".08"/>`;
    s += `<text x="${mid}" y="${top + 44}" text-anchor="middle" style="font:700 19px sans-serif;fill:#f6f2ff;paint-order:stroke;stroke:#33236b;stroke-width:2.5px">3 A</text>`;
    return s;
  },
  /* dark terminal bar behind a row of lugs (motor lead block) */
  tbar(x1, x2, y) { return `<rect x="${x1}" y="${y - 14}" width="${x2 - x1}" height="28" rx="8" fill="url(#ptBlack)" stroke="#0b0e11" stroke-width="1.5"/>`; },
  /* axial fan seen from the front: guard ring, five pitched blades, blue motor hub */
  fan(cx, cy, r, hr, k) {
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#171c21" stroke="#4a525b" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#2c343c" stroke-width="1.5"/>`;
    let b = '';
    for (let i = 0; i < 5; i++) {
      const a = i * 72, R = r - 9, h = hr - 2;
      b += `<path transform="rotate(${a} ${cx} ${cy})" d="M${cx - 7} ${cy - h} C${cx - 34} ${cy - R * 0.45} ${cx - 30} ${cy - R * 0.9} ${cx + 4} ${cy - R} C${cx + 26} ${cy - R * 0.85} ${cx + 22} ${cy - R * 0.45} ${cx + 9} ${cy - h} Z" fill="url(#ptMetal)" stroke="#2f3943" stroke-width="1.5"/>`;
    }
    s += `<g class="fanblades spin" data-fan="${k}" style="transform-origin:${cx}px ${cy}px">${b}</g>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${hr}" fill="url(#ptBlue)" stroke="#0e2a4f" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${hr * 0.55}" fill="none" stroke="#0e2a4f" stroke-width="2" opacity=".6"/>`;
    return s;
  },
  /* squirrel-cage blower wheel seen end-on: housing ring, forward-curved blade slots, blue motor hub */
  wheel(cx, cy, r, k) {
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#171c21" stroke="#4a525b" stroke-width="3"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r - 7}" fill="url(#ptMetal)" stroke="#2f3943" stroke-width="2"/>`;
    let b = '';
    for (let i = 0; i < 28; i++) {
      const a = i * 360 / 28 * Math.PI / 180, r1 = r * 0.5, r2 = r - 10;
      const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1, x2 = cx + Math.cos(a + 0.35) * r2, y2 = cy + Math.sin(a + 0.35) * r2;
      b += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#20272e" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    s += `<g class="fanblades spin" data-fan="${k}" style="transform-origin:${cx}px ${cy}px">${b}</g><circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="#171c21" stroke="#4a525b"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r * 0.34}" fill="url(#ptBlue)" stroke="#0e2a4f" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.1}" fill="#cfd8e0" stroke="#3d4650"/>`;
    return s;
  },
  /* terminal strip plate (thermostat subbase / board) */
  plate(x, y, w, h, color) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${color || 'url(#ptBeige)'}" stroke="#8d8672" stroke-width="2"/>`;
  },
  /* safety switches between their in and out terminals. kind: hp, lp, float, frz, filter, phase */
  pswitch(x1, x2, y, kind) {
    const mid = (x1 + x2) / 2, L = x1 - 8, W = x2 - x1 + 16;
    const hex = (cx, cy, r) => { let pts = ''; for (let a = 0; a < 6; a++) pts += (cx + r * Math.cos(a * Math.PI / 3)).toFixed(1) + ',' + (cy + r * Math.sin(a * Math.PI / 3)).toFixed(1) + ' '; return `<polygon points="${pts}" fill="url(#ptBrass)" stroke="#5c3f10"/>`; };
    const blades = `<rect x="${x1 - 4}" y="${y - 3}" width="12" height="6" fill="#b9c3cc" stroke="#4a525b"/><rect x="${x2 - 8}" y="${y - 3}" width="12" height="6" fill="#b9c3cc" stroke="#4a525b"/>`;
    if (kind === 'hp' || kind === 'lp') {
      const col = kind === 'hp' ? '#b3302a' : '#2f6fb5', dk = kind === 'hp' ? '#6e1712' : '#173f6b';
      let s = `<rect x="${L}" y="${y - 15}" width="${W}" height="30" rx="6" fill="url(#ptBlack)" stroke="#0b0e11"/>`;
      s += `<rect x="${mid - 16}" y="${y - 18}" width="32" height="36" rx="6" fill="${col}" stroke="${dk}" stroke-width="2"/><ellipse cx="${mid - 4}" cy="${y - 8}" rx="9" ry="4" fill="#fff" opacity=".18"/>`;
      s += `<text x="${mid}" y="${y + 5}" text-anchor="middle" style="font:800 12px sans-serif;fill:#fff;paint-order:stroke;stroke:${dk};stroke-width:2px">${kind === 'hp' ? 'HP' : 'LP'}</text>`;
      return s + blades;
    }
    if (kind === 'float') {
      let s = `<rect x="${L}" y="${y - 15}" width="${W}" height="30" rx="6" fill="url(#ptBlack)" stroke="#0b0e11"/>`;
      s += `<line x1="${mid - 18}" y1="${y + 6}" x2="${mid + 8}" y2="${y - 4}" stroke="#aab4be" stroke-width="3" stroke-linecap="round"/>`;
      s += `<circle cx="${mid + 14}" cy="${y - 4}" r="10" fill="#e8c24a" stroke="#7d6510" stroke-width="2"/><ellipse cx="${mid + 11}" cy="${y - 8}" rx="4" ry="2.5" fill="#fff" opacity=".45"/>`;
      s += `<circle cx="${mid - 18}" cy="${y + 6}" r="3.5" fill="url(#ptMetal)" stroke="#3d4650"/>`;
      return s + blades;
    }
    if (kind === 'frz') {
      let s = `<rect x="${L}" y="${y - 15}" width="${W}" height="30" rx="6" fill="#d9dde1" stroke="#7b848c" stroke-width="1.5"/>`;
      s += `<circle cx="${mid - 12}" cy="${y}" r="10" fill="#f4f6f8" stroke="#6b7480" stroke-width="1.5"/><line x1="${mid - 12}" y1="${y}" x2="${mid - 6}" y2="${y - 6}" stroke="#b3302a" stroke-width="2"/>`;
      let w = `M${mid + 4} ${y}`; for (let k = 0; k < 3; k++) w += ' q3 -9 6 0 q3 9 6 0';
      s += `<path d="${w}" fill="none" stroke="#6b7480" stroke-width="2"/>`;
      return s + blades;
    }
    if (kind === 'filter') {
      let s = `<rect x="${L}" y="${y - 15}" width="${W}" height="30" rx="6" fill="#aab4be" stroke="#4a525b" stroke-width="1.5"/>`;
      s += `<circle cx="${mid}" cy="${y}" r="11" fill="#1b2128" stroke="#4a525b" stroke-width="2"/><line x1="${mid}" y1="${y}" x2="${mid + 6}" y2="${y - 7}" stroke="#e8c24a" stroke-width="2"/><circle cx="${mid}" cy="${y}" r="2" fill="#cfd8e0"/>`;
      s += `<rect x="${mid - 22}" y="${y - 20}" width="6" height="7" fill="#c9953a" stroke="#5c3f10"/><rect x="${mid + 16}" y="${y - 20}" width="6" height="7" fill="#c9953a" stroke="#5c3f10"/>`;
      return s + blades;
    }
    if (kind === 'phase') {
      let s = `<rect x="${L}" y="${y - 16}" width="${W}" height="32" rx="5" fill="#1d4d34" stroke="#0b2418" stroke-width="1.5"/>`;
      s += `<circle cx="${mid - 8}" cy="${y}" r="5" fill="#38e08a" stroke="#0b2418"/><circle cx="${mid + 8}" cy="${y}" r="5" fill="#7a2a24" stroke="#0b2418"/>`;
      return s + blades;
    }
    return `<rect x="${L}" y="${y - 18}" width="${W}" height="36" rx="7" fill="url(#ptBlack)" stroke="#0b0e11"/>` + hex(mid, y, 11) + blades;
  },
  /* plug-in SPDT relay. Lug layout (relative to x,y): COM (70,30) top-left, NC (30,100), NO (110,100) bottom-left,
     coil A (200,30) / B (200,100) down the right. The blade is hinged at COM and swings to NC (de-energized) or NO (energized). */
  relay(x, y, w, h, k) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#16202a" stroke="#0b0e11" stroke-width="2"/>`;
    s += `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 12}" rx="6" fill="#9ec4de" opacity=".14" stroke="#9ec4de" stroke-opacity=".5"/>`;
    s += `<line x1="${x + 156}" y1="${y + 12}" x2="${x + 156}" y2="${y + h - 12}" stroke="#4a5560" stroke-dasharray="4 4"/>`;
    s += `<text x="${x + 112}" y="${y + 20}" text-anchor="middle" style="font:700 10px sans-serif;fill:#8fa1b3">CONTACTS</text>`;
    const cx = x + 200;
    s += `<rect x="${cx - 24}" y="${y + 14}" width="48" height="${h - 28}" rx="8" fill="#3a4048" stroke="#10151a"/>`;
    for (let yy = y + 26; yy < y + h - 22; yy += 6) s += `<line x1="${cx - 18}" y1="${yy}" x2="${cx + 18}" y2="${yy}" stroke="#b4691f" stroke-width="3"/>`;
    s += `<rect class="coilglow" data-k="${k}" x="${cx - 24}" y="${y + 14}" width="48" height="${h - 28}" rx="8" fill="#38e08a" opacity="0" style="transition:opacity .25s;pointer-events:none"/>`;
    s += `<text x="${cx}" y="${y + 82}" text-anchor="middle" style="font:700 9px sans-serif;fill:#f3f6f9;paint-order:stroke;stroke:#000;stroke-width:3px">COIL</text>`;
    const px = x + 70, py = y + 30, L = 58;
    const dirs = [[-40, 70], [40, 70]].map(([dx, dy]) => { const n = Math.hypot(dx, dy); return [dx / n, dy / n]; });
    const [nc, no] = dirs;
    s += [nc, no].map(d => `<circle cx="${px + d[0] * L}" cy="${py + d[1] * L}" r="6" fill="url(#ptMetal)" stroke="#3d4650"/>`).join('');
    const rot = (Math.atan2(no[1], no[0]) - Math.atan2(nc[1], nc[0])) * 180 / Math.PI;
    const ex = px + nc[0] * (L - 4), ey = py + nc[1] * (L - 4);
    s += `<g class="rblade" data-k="${k}" data-rot="${rot.toFixed(1)}" style="transform-origin:${px}px ${py}px;transition:transform .2s"><line x1="${px}" y1="${py}" x2="${ex}" y2="${ey}" stroke="url(#ptBrass)" stroke-width="7" stroke-linecap="round"/><circle cx="${ex}" cy="${ey}" r="4" fill="#e8e8e8" stroke="#555"/></g>`;
    s += `<circle cx="${px}" cy="${py}" r="7" fill="#c9953a" stroke="#5c3f10"/>`;
    return s;
  },
  /* small round capacitor */
  roundCap(x, y, w, h) { return PT.can(x, y, w, h, '10 µF', '370 VAC'); },
  /* copper ground lug on a bolt */
  ground(x, y) { return `<rect x="${x - 28}" y="${y - 12}" width="56" height="24" rx="4" fill="url(#ptCopper)" stroke="#4a2410"/><circle cx="${x - 20}" cy="${y}" r="4" fill="#3a4048"/>`; },
  /* belly-band crankcase heater: flexible black silicone band with seams, a leaf-spring clamp at one end and short black leads at the other */
  band(x, y, w, h) {
    const cy = y + h / 2, bx = x + 22, bw = w - 22 - 54, id = 'ptBand' + Math.round(x + y);
    let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b535c"/><stop offset=".25" stop-color="#2a3036"/><stop offset=".7" stop-color="#14181c"/><stop offset="1" stop-color="#2b3238"/></linearGradient></defs>`;
    // leads out of the left end
    s += `<path d="M${x + 4} ${cy} H${bx + 6}" stroke="#0b0e11" stroke-width="7" stroke-linecap="round"/><path d="M${x + 4} ${cy} H${bx + 6}" stroke="#3a434c" stroke-width="2" stroke-linecap="round"/>`;
    s += `<rect x="${bx - 8}" y="${cy - 9}" width="22" height="18" rx="5" fill="#1d2329" stroke="#0b0e11"/>`;
    // the band
    s += `<rect x="${bx}" y="${y + 2}" width="${bw}" height="${h - 4}" rx="7" fill="url(#${id})" stroke="#0b0e11" stroke-width="2"/>`;
    for (let xx = bx + 18; xx < bx + bw - 6; xx += 13) s += `<line x1="${xx}" y1="${y + 6}" x2="${xx}" y2="${y + h - 6}" stroke="#5a636c" stroke-width="1.3" opacity=".45"/>`;
    s += `<rect x="${bx + 4}" y="${y + 6}" width="${bw - 8}" height="4" rx="2" fill="#7b858f" opacity=".35"/>`;
    // spring clamp at the right end
    const sx = bx + bw;
    s += `<rect x="${sx - 4}" y="${y - 1}" width="14" height="${h + 2}" rx="3" fill="url(#ptMetalV)" stroke="#3d4650"/>`;
    let sp = `M${sx + 10} ${cy}`;
    for (let i = 0; i < 6; i++) sp += ` l5 ${i % 2 ? 9 : -9} l0 0`;
    s += `<path d="M${sx + 10} ${cy} l5 -9 l5 18 l5 -18 l5 18 l5 -18 l5 18 l5 -9" fill="none" stroke="#aeb9c3" stroke-width="2.6" stroke-linejoin="round"/>`;
    s += `<path d="M${sx + 40} ${cy} H${x + w - 4}" stroke="#0b0e11" stroke-width="7" stroke-linecap="round"/><path d="M${sx + 40} ${cy} H${x + w - 4}" stroke="#3a434c" stroke-width="2" stroke-linecap="round"/>`;
    s += `<circle cx="${sx + 40}" cy="${cy}" r="5" fill="url(#ptMetalV)" stroke="#3d4650"/>`;
    return s;
  },
  /* DIN-rail module (phase monitor, lead/lag board) */
  module(x, y, w, h, color) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${color || '#e7ebee'}" stroke="#7d8892" stroke-width="2"/>`;
    s += `<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="16" rx="3" fill="#20262c"/><circle cx="${x + 20}" cy="${y + 16}" r="3" fill="#37d67a"/><circle cx="${x + 34}" cy="${y + 16}" r="3" fill="#f5c400"/>`;
    return s;
  },
  /* green PCB (lead/lag board) with mounting holes, traces and a couple of chips */
  board(x, y, w, h) {
    const t = (tx, ty, str, sz, col, anc) => `<text x="${tx}" y="${ty}" text-anchor="${anc || 'start'}" style="font:700 ${sz || 9}px sans-serif;fill:${col || '#e9efe9'};letter-spacing:.06em">${str}</text>`;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#17543a" stroke="#0a2a1c" stroke-width="2"/>`;
    s += `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="4" fill="none" stroke="#2c7a56" stroke-width="1" opacity=".7"/>`;
    [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]].forEach(([cx, cy]) => { s += `<circle cx="${cx}" cy="${cy}" r="6" fill="#0e1a12" stroke="#c9d3cc" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="#c9a24a" stroke-width="1" opacity=".6"/>`; });
    /* traces */
    s += `<path d="M${x + 60} ${y + 60} V${y + 100} H${x + 120} M${x + 160} ${y + 60} V${y + 92} H${x + 170} M${x + 260} ${y + 70} V${y + 118} M${x + 360} ${y + 70} V${y + 118} M${x + 40} ${y + 140} H${x + 200} M${x + 120} ${y + 150} H${x + 230} V${y + 128}" fill="none" stroke="#3f9a6e" stroke-width="2.5" opacity=".7"/>`;
    /* input terminal block (R C Y1 Y2) */
    s += `<rect x="${x + 22}" y="${y + 5}" width="${w - 44 - 60}" height="32" rx="5" fill="#2b6fb0" stroke="#10304f" stroke-width="1.5"/><rect x="${x + 22}" y="${y + 5}" width="${w - 104}" height="8" rx="3" fill="#4f93d1" opacity=".6"/>`;
    for (let k = 0; k < 4; k++) s += `<line x1="${x + 98 + k * 100}" y1="${y + 8}" x2="${x + 98 + k * 100}" y2="${y + 34}" stroke="#10304f" stroke-width="1.5"/>`;
    /* output terminal block (OUT 1, OUT 2) */
    s += `<rect x="${x + 198}" y="${y + 96}" width="200" height="30" rx="5" fill="#d9dde1" stroke="#7b848c" stroke-width="1.5"/>`;
    s += `<line x1="${x + 298}" y1="${y + 99}" x2="${x + 298}" y2="${y + 123}" stroke="#7b848c" stroke-width="1.5"/>`;
    /* microcontroller */
    const mx = x + 36, my = y + 78;
    s += `<rect x="${mx}" y="${my}" width="64" height="40" rx="3" fill="url(#ptBlack)" stroke="#0b0e11"/><circle cx="${mx + 8}" cy="${my + 8}" r="2.5" fill="#6b7886"/>`;
    for (let k = 0; k < 8; k++) s += `<line x1="${mx + 6 + k * 7.5}" y1="${my - 5}" x2="${mx + 6 + k * 7.5}" y2="${my}" stroke="#c9d3cc" stroke-width="2"/><line x1="${mx + 6 + k * 7.5}" y1="${my + 40}" x2="${mx + 6 + k * 7.5}" y2="${my + 45}" stroke="#c9d3cc" stroke-width="2"/>`;
    s += t(mx + 32, my + 28, 'CTRL', 8, '#9aa6b2', 'middle');
    /* crystal, delay pot, DIP bank, LEDs */
    s += `<rect x="${x + 112}" y="${y + 90}" width="22" height="12" rx="6" fill="url(#ptMetal)" stroke="#3d4650"/>`;
    s += `<rect x="${x + 112}" y="${y + 140}" width="46" height="26" rx="3" fill="#2d6bb0" stroke="#10304f"/><circle cx="${x + 135}" cy="${y + 153}" r="9" fill="url(#ptBrass)" stroke="#5c3f10"/><line x1="${x + 135}" y1="${y + 153}" x2="${x + 141}" y2="${y + 147}" stroke="#3a2a10" stroke-width="2"/>`;
    s += t(x + 135, y + h - 4, 'DELAY', 8, '#e9efe9', 'middle');
    s += `<rect x="${x + 40}" y="${y + 138}" width="52" height="26" rx="2" fill="#d6b43c" stroke="#7d6510"/>`;
    for (let k = 0; k < 4; k++) s += `<rect x="${x + 46 + k * 11}" y="${y + 143 + (k % 2) * 8}" width="8" height="10" rx="1" fill="#f4f6f8" stroke="#7d6510"/>`;
    s += t(x + 66, y + h - 4, 'SW1', 8, '#e9efe9', 'middle');
    s += `<circle cx="${x + 190}" cy="${y + 108}" r="4.5" fill="#38e08a" stroke="#0a2a1c"/><circle cx="${x + 190}" cy="${y + 124}" r="4.5" fill="#e8c24a" stroke="#0a2a1c"/>`;
    s += t(x + 178, y + 111, 'PWR', 7, '#e9efe9', 'end') + t(x + 178, y + 127, 'CALL', 7, '#e9efe9', 'end');
    /* output relays and diodes near outputs */
    s += `<rect x="${x + 410}" y="${y + 70}" width="30" height="42" rx="3" fill="#2e86c9" stroke="#0e2a4f"/><rect x="${x + 410}" y="${y + 122}" width="30" height="42" rx="3" fill="#2e86c9" stroke="#0e2a4f"/>`;
    s += t(x + 425, y + 95, 'K1', 8, '#fff', 'middle') + t(x + 425, y + 147, 'K2', 8, '#fff', 'middle');
    s += `<rect x="${x + 216}" y="${y + 150}" width="30" height="8" rx="3" fill="#2b2b2b" stroke="#000"/><rect x="${x + 222}" y="${y + 150}" width="4" height="8" fill="#c9d3cc"/>`;
    s += t(x + w - 10, y + h - 6, 'LEAD / LAG CONTROL', 8, '#bfe6cf', 'end');
    return s;
  }
};

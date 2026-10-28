/* ===== Boiler room picture: piping, pump, gas train, burner and stack. Click a part to look at it closely. ===== */
const PIC_W = 1100, PIC_H = 760;
const SPOTS = {
  burner: [250, 470, 'Burner'], blower: [215, 420, 'Blower'], filter: [205, 515, 'Air filter'], aps: [262, 372, 'Combustion airflow switch'], vfd: [80, 250, 'VFD'],
  sight: [312, 470, 'Sight glass'], scanner: [300, 430, 'UV scanner'], electrode: [292, 512, 'Ignition electrode'], ignx: [228, 560, 'Ignition xfmr'],
  gascock: [42, 652, 'Manual gas valves'], lgps: [140, 612, 'Low gas sw.'], v1: [178, 652, 'SKP75 main valve'], vent: [199, 690, 'Vent valve'], v2: [220, 652, 'Secondary valve'],
  hgps: [258, 612, 'High gas sw.'], pilotcock: [128, 576, 'Pilot cock'], pv: [176, 576, 'Pilot valve V4046'],
  stack: [725, 210, 'Stack / analyzer port'], tubes: [560, 470, 'Heat exchanger'], gauge: [420, 270, 'P/T gauge'], relief: [520, 262, 'Relief valve'],
  lwco: [790, 400, 'Low-water cutoff'], fs: [850, 126, 'Flow switch FS4-3'], vent2: [960, 92, 'Air vent'], exptank: [960, 300, 'Expansion tank'],
  fill: [1044, 212, 'Make-up water'], pump: [900, 612, 'System pump'], coupler: [930, 642, 'Pump coupler'], iso: [1010, 612, 'Isolation valves'], strainer: [968, 650, 'Strainer'],
  rm: [118, 186, 'Control panel'], alarm: [118, 104, 'Alarm light'], jumper: [150, 250, 'Cabinet terminals']
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
  s += `<text class="sl" x="590" y="420" text-anchor="middle">THERMAL SOLUTIONS EVA-3000 · 3,000 MBH</text>`;
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

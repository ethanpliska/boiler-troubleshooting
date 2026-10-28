/* ===== Game: levels, meter, tools, parts, scoring and screens ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const B = Boiler;
let li = 0, mode = 'V', probes = { red: null, black: null }, probeSel = null;
let strikes = 0, readings = 0, wrongParts = 0, partsUsed = 0, hintsUsed = 0, active = false, explore = false, t0 = Date.now(), winWait = 0;
let doneSet = new Set();
try { doneSet = new Set(JSON.parse(localStorage.getItem('blr_done') || '[]')); } catch (e) {}
const saveDone = () => { try { localStorage.setItem('blr_done', JSON.stringify([...doneSet])); } catch (e) {} };
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function log(msg, cls) {
  const d = document.createElement('div'); d.textContent = msg; if (cls) d.className = cls;
  $('log').appendChild(d); $('log').scrollTop = $('log').scrollHeight;
}
B.onLog = m => { if (active) log(m, 'h'); };
function sheet(html) { $('sheet').className = 'sheet'; $('sheet').innerHTML = html; $('modal').hidden = false; const b = $('sheet').querySelector('button'); if (b) b.focus(); }
const closeSheet = () => { $('modal').hidden = true; };

/* ---------- normal readings and specs ---------- */
const GUIDE = [['Any two legs (L1-L2, L2-L3, L3-L1)', '≈ 208 V'], ['Any leg to ground', '≈ 120 V'], ['Control transformer X1 to X2 (TB1 to TB2)', '≈ 115 V'],
  ['Across a closed switch, power on', '0 V'], ['Across an open switch in a live string', '≈ 115 V'],
  ['Flame signal, pilot and main (UV)', '1.5 – 5.0 V dc'], ['Minimum to prove flame (RM7896)', '1.25 V dc'],
  ['Gas inlet (natural gas)', '6.0 in. w.c. min, 5 psi max'], ['Combustion air at the airflow switch, low / high fire', '≈ 0.4 / 2.0 in. w.c.'],
  ['Boiler pressure, cold / at 180°F', '15 / about 23 psi'], ['System pump differential', '≈ 18 psi'], ['System pump current, each leg', '≈ 13.6 A'], ['Blower (VFD output), high fire', '≈ 6.6 A']];
function buildSpecs() {
  const t = (h, rows) => `<h3>${h}</h3><table><tr><th>Item</th><th>Value</th></tr>` + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  return t('Electrical (EVA-3000, 208/60/3)', [['Supply', '208 V, 3 phase, 60 Hz (120 V leg to ground)'], ['Nominal power draw', '7.4 A'], ['Combustion blower', '2 hp, 3 phase, on a variable frequency drive'], ['Control transformer', '208 V tap to 115 V, two primary fuses FU1, X2 grounded'], ['Control circuit breaker', '115 V, trips at about 5 A'], ['Flame safeguard', 'Honeywell RM7896D, 30 s purge card, R7849A UV amplifier'], ['Operating limit', 'Siemens RWF55, factory setpoint 180°F'], ['High limit', 'Honeywell L4008E, manual reset, set 210°F (max 240°F)'], ['System pump (by others)', '5 hp, 208 V 3 phase, runs continuously from TB3'], ['Do not connect low-voltage controls directly', 'use isolating relays (manual, Electrical section)']]) +
    t('Sequence of operation (manual section VI; this game runs it at 2× speed)', [['Standby', 'limits closed, no flame signal, airflow switch open'], ['Call for heat', 'terminal 6 powered; terminal 4 starts the blower (CRA1 → VFD)'], ['Combustion airflow switch makes', 'must prove within 10 s'], ['Prepurge', '30 s'], ['Pilot trial (PFEP)', 'pilot valve + ignition; ignition off after 5 s (early spark termination)'], ['Pilot proven', 'flame signal above 1.5 V dc'], ['Main flame (MFEP)', 'main valves (terminal 9) open, pilot stays on 5 s'], ['Run', 'pilot off; TD-1 releases modulation 20 s after terminal 9 (CRA2)'], ['Postpurge', 'fan runs 60 s after the main valves close']]) +
    t('Gas train (DB&B, figure 22e)', [['Inlet pressure', '6.0 in. w.c. minimum, 5 psi maximum (natural gas)'], ['Order', 'manual valve (pilot tapping) → low gas switch → SKP75 main valve → vent valve → secondary valve → high gas switch → manual valve → burner'], ['Low gas pressure switch', 'manual reset, set 5.0 in. w.c. (assumed)'], ['High gas pressure switch', 'manual reset, set 3.0 in. w.c. downstream (assumed)'], ['Main valve pressure, low / high fire', 'about 0.4 / 2.0 in. w.c. (match the firetest label)'], ['Pilot', 'V4046 solenoid, pilot regulator, about 3.0 in. w.c.'], ['Gas connection', '2 in. NPT']]) +
    t('Combustion (flue gas at the stack)', [['O2', 'about 4.5 – 5.5 % (match the firetest report)'], ['CO', 'keep well under 400 ppm (manual limit)'], ['Stack temperature', 'about 250 – 320°F'], ['Efficiency', 'about 87 % (2,610 MBH out / 3,000 in)'], ['Burner element', 'evenly orange, no flicker']]) +
    t('Water side (EVA-3000)', [['Input / gross output / net AHRI', '3,000 / 2,610 / 2,270 MBH'], ['Water volume', '43.1 gal'], ['Flow, 20°F ΔT / 40°F ΔT', '261 gpm (4.41 ft) / 131 gpm (1.73 ft)'], ['Minimum / maximum flow', '131 / 261 gpm'], ['Supply / return pipe', '4 in.'], ['Flow switch FS4-3', 'makes at about 110 gpm (assumed)'], ['RWF55 burner on / off', '175°F / 185°F (assumed switching points)'], ['Max allowable working pressure', '160 psi'], ['Relief valve', 'set at time of purchase (50 psi assumed)'], ['Cold fill / at 180°F', '15 / about 23 psi']]) +
    `<p>From the Thermal Solutions EVA I&O manual 81456001 R12-6/16 (EVA-3000 data, Figure 9c wiring). Items marked assumed are not in the manual; confirm against your boiler's rating label and firetest report.</p>`;
}
function buildPlate() {
  return `<div class="plate"><h3>Thermal Solutions</h3><div class="plm">Model EVA3000BN1-UEBM · Serial 65055391</div>
    <div class="plr">Input: 3,000,000 Btu/h natural gas</div><div class="plr">Gross output: 2,610 MBH · Net AHRI: 2,270 MBH</div>
    <div class="plr">Max. allowable working pressure: 160 psi water</div><div class="plr">Relief valve setting: 50 psi</div>
    <div class="plr">Water volume: 43.1 gal</div><div class="plr">Gas inlet: 6.0 in. w.c. min · 5 psi max</div>
    <div class="plr">Electrical: 208 V, 3 ph, 60 Hz · 7.4 A · blower 2 hp</div><div class="plr">Control circuit: 115 V</div>
    <div class="dim">Relief setting is chosen when the boiler is ordered; 50 psi is assumed here.</div></div>
    <div class="plate"><h3>System pump (by others)</h3><div class="plm">In-line, close-coupled</div><div class="plr">200 gpm at 41 ft head</div><div class="plr">5 hp · 208 V · 3 ph · 15.2 FLA</div></div>`;
}

/* ---------- screens ---------- */
function renderTabs() {
  $('lvlTabs').innerHTML = `<select id="lvlSel" class="lvlsel" aria-label="Choose a level">` + LEVELS.map((l, i) =>
    `<option value="${i}"${i === li ? ' selected' : ''}>${doneSet.has(l.id) ? '✓ ' : ''}Level ${l.n} · ${esc(l.title)}</option>`).join('') + `</select>`;
  $('lvlSel').onchange = e => startLevel(+e.target.value);
}
function renderHud() { $('strikes').innerHTML = `Safety strikes<b class="${strikes ? 'bad' : ''}">${strikes}/3</b>`; }
function renderTicket() {
  const l = LEVELS[li];
  $('ticket').innerHTML = `<h2>Work order · ${esc(l.rank)}</h2><p><b>${esc(l.title)}</b></p><p class="site">${esc(l.site)}</p><p>${esc(l.ticket)}</p><div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="custBtn2">Talk to the customer</button></div>`;
  $('custBtn2').onclick = custSheet;
  const g = $('guide');
  if (l.n <= 10) { g.className = 'card'; g.innerHTML = '<h2>Normal readings (training aid)</h2><table>' + GUIDE.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>'; }
  else { g.className = 'card hide'; g.innerHTML = ''; }
}
function setTab(t) {
  ['Unit', 'Schem', 'Pic', 'Order', 'Plate', 'Spec'].forEach(k => { $('tab' + k).classList.toggle('on', k === t); $('view' + k).hidden = k !== t; });
  document.documentElement.dataset.tab = t; $('tabSel').value = t; $('zoomBox').hidden = t !== 'Unit';
}

/* ---------- live status ---------- */
const FLAME_TXT = { none: 'Dark', spark: 'Spark, no flame', pilot: 'Pilot flame', main: 'Main flame' };
function updateStatus() {
  const s = B.status(), row = (k, v, c) => `<span>${k}</span><b class="${c || ''}">${v}</b>`;
  const noise = B.main && B.lowWater() ? 'Banging and kettling in the boiler' : B.has('air_bound') && B.pumpRun ? 'Gurgling in the pipes' : '';
  $('status').innerHTML =
    row('Sight glass', FLAME_TXT[s.flame], s.flame === 'main' ? 'ok' : s.flame === 'none' ? '' : 'warn') +
    row('Burner blower', s.blower === 'run' ? 'Running' : 'Stopped') +
    row('System pump', s.pump === 'run' ? 'Running' : s.pump === 'hum' ? 'Humming, not turning' : 'Stopped', s.pump === 'hum' ? 'bad' : '') +
    row('Burner switch light', s.burnerLamp ? 'ON' : 'off') +
    row('CHANGE FILTER light', s.filterLamp ? 'ON' : 'off', s.filterLamp ? 'warn' : '') +
    row('Alarm light', s.alarm ? 'ON' : 'off', s.alarm ? 'bad' : '') +
    row('LOW WATER light', s.lwLamp ? 'ON' : 'off', s.lwLamp ? 'warn' : '') +
    row('Boiler gauge', Math.round(s.Tb) + '°F · ' + s.P.toFixed(0) + ' psi') +
    row('Relief valve', s.relief === 'dry' ? 'Dry' : s.relief === 'dripping' ? 'Dripping' : 'Discharging', s.relief === 'dry' ? '' : 'bad') +
    (noise ? row('Sound', noise, 'warn') : '');
  /* keyboard display and LEDs */
  const r = B.rm, pow = B.rmOK() && B.lastPow, k = $('kdm');
  k.className = !pow && r.st !== 'LOCKOUT' ? 'dark' : r.st === 'LOCKOUT' ? 'lock' : '';
  if (r.st === 'LOCKOUT' && !pow) k.className = 'dark';
  let l2 = '';
  if (r.st === 'LOCKOUT') l2 = r.lock;
  else if (['INIT', 'PURGE', 'PFEP', 'MFEP', 'POST'].indexOf(r.st) >= 0) l2 = Math.max(0, Math.ceil(r.t)) + ' s' + (r.st === 'PURGE' || r.st === 'PFEP' || r.st === 'MFEP' ? ' · Flame ' + B.sig.toFixed(1) + ' V' : '');
  else if (r.st === 'RUN' || r.st === 'HOLD' || r.st === 'STANDBY') l2 = 'Flame ' + B.sig.toFixed(1) + ' V';
  $('kdm1').textContent = RM_TEXT[r.st]; $('kdm2').textContent = l2;
  const led = (id, on) => $(id).classList.toggle('on', !!on);
  led('ledPow', pow); led('ledPilot', pow && B.out(8)); led('ledFlame', pow && B.sig >= FLAME_MIN); led('ledMain', pow && B.out(9)); led('ledAlarm', pow && r.st === 'LOCKOUT');
  const p1 = $('pnlKdm'), p2 = $('pnlKdm2'); if (p1) { p1.textContent = pow ? RM_TEXT[r.st] : ''; p2.textContent = pow ? l2.slice(0, 30) : ''; }
  const al = $('pnlAlarm'); if (al) al.setAttribute('fill', s.alarm ? '#ff3b2e' : '#3a1d1a');
  /* spinning motors */
  document.querySelectorAll('[data-fan]').forEach(el => {
    const kk = el.dataset.fan, on = /^pump/.test(kk) ? B.pumpRun : B.blowerRun;
    el.classList.toggle('on', on); el.style.setProperty('--d', /^pump/.test(kk) && B.has('coupler') ? '.25s' : '.3s');
  });
  syncPanel(s, pow);
  renderPicLive(B);
  setSwitches();
}

/* contactors and relays pull in; displays, LEDs and lamps on the panel follow the boiler */
function syncPanel(s, pow) {
  const st = { ps: !!B.en.ps, cra1: !!B.en.cra1, cra2: !!B.en.cra2 }, NAME = { ps: 'PUMP' };
  document.querySelectorAll('#unitSvg [data-k]').forEach(el => {
    const k = el.dataset.k, on = !!st[k], c = el.classList;
    if (c.contains('armg') || c.contains('armp')) {
      const was = el.dataset.on; el.dataset.on = on ? '1' : '0';
      if (was !== el.dataset.on) el.style.transition = on ? 'transform .09s cubic-bezier(.6,0,1,.55)' : 'transform .22s cubic-bezier(.2,1.35,.5,1)';
      el.style.transform = c.contains('armg') ? (on ? 'translateY(0)' : 'translateY(-26px)') : (on ? 'translateX(0)' : 'translateX(-7px)');
    } else if (c.contains('coilglow')) el.setAttribute('opacity', on ? 0.45 : 0);
    else if (c.contains('rblade')) el.style.transform = on ? 'rotate(' + el.dataset.rot + 'deg)' : 'none';
    else if (c.contains('kled')) el.setAttribute('fill', on ? '#38e08a' : '#55616d');
    else if (c.contains('kbadge')) el.textContent = (NAME[k] || k.toUpperCase()) + (on ? ' CLOSED' : ' OPEN');
  });
  const led = { POWER: pow, PILOT: pow && B.out(8), FLAME: pow && B.sig >= FLAME_MIN, MAIN: pow && B.out(9), ALARM: pow && B.rm.st === 'LOCKOUT' };
  document.querySelectorAll('#unitSvg .pled').forEach(el => { const k = el.dataset.led; el.setAttribute('fill', led[k] ? (k === 'ALARM' ? '#ff3b2e' : '#38e08a') : '#3b4652'); });
  const set = (id, a, v) => { const e = $(id); if (e) e.setAttribute(a, v); }, txt = (id, v, col) => { const e = $(id); if (e) { e.textContent = v; if (col) e.style.fill = col; } };
  set('pnlLwLamp', 'fill', s.lwLamp ? '#ffb020' : '#3a2a1a');
  set('pnlBsLamp', 'fill', s.burnerLamp ? '#f5c400' : '#3b4652');
  set('pnlFltLamp', 'fill', s.filterLamp ? '#ffb020' : '#3b4652');
  set('pnlTdLed', 'fill', B.en.td ? '#38e08a' : '#3b4652');
  txt('pnlV1', B.en.v1 ? 'OPEN' : 'CLOSED', B.en.v1 ? '#38e08a' : '#e5483b');
  txt('pnlV2', B.en.v2 ? 'OPEN' : 'CLOSED', B.en.v2 ? '#38e08a' : '#e5483b');
  txt('pnlVfd', s.vfd, B.vfdFault ? '#ff8a80' : '#7fd7ff');
  const ctl = B.mag('TB3') > 90 && !B.has('rwf_bad');
  txt('pnlRwfPV', ctl ? (B.has('rwf_sensor') ? 'OPEN' : String(Math.round(B.rwfT()))) : '');
  txt('pnlRwfSP', ctl ? String(RWF_SP) : '');
  set('pnlRwfLed', 'fill', ctl && B.ocClosed() ? '#38e08a' : '#3b4652');
}

/* ---------- meter ---------- */
function lcd(text, sub, err) { $('lcd').textContent = text; $('lcd').className = err ? 'err' : ''; $('lcdSub').textContent = sub || ''; }
const jit = v => v * (1 + (Math.random() - 0.5) * 0.006);
const lineSide = id => /^LN_/.test(id);
function measure(act) {
  const r = probes.red, b = probes.black;
  $('pRed').textContent = r || '—'; $('pBlk').textContent = b || '—';
  $('chipR').classList.toggle('sel', probeSel === 'red'); $('chipK').classList.toggle('sel', probeSel === 'black');
  document.querySelectorAll('#unitSvg .term').forEach(t => {
    const id = t.dataset.id;
    t.querySelector('.ring-r').style.display = id === r ? '' : 'none';
    t.querySelector('.ring-b').style.display = id === b ? '' : 'none';
  });
  if (!r || !b) return lcd('---', 'Place both probes');
  if (r === b) return lcd('0.0', 'Both probes on the same point');
  const name = id => NODES[id] || id;
  if (mode === 'V') {
    const v = B.volts(r, b), vt = v < 0.5 ? '0.0 V' : jit(v).toFixed(1) + ' V';
    if (act) { readings++; log('AC volts, ' + name(r) + ' to ' + name(b) + ': ' + vt); }
    lcd(vt, 'AC volts');
  } else if (mode === 'D') {
    const v = B.dcVolts(r, b), vt = Math.abs(v) < 0.05 ? '0.00 V' : jit(v).toFixed(2) + ' V';
    if (act) { readings++; log('DC volts, ' + name(r) + ' to ' + name(b) + ': ' + vt); }
    lcd(vt, 'DC volts');
  } else {
    if (lineSide(r) || lineSide(b)) { if (act) strike('You put the meter in ohms on the line side of the disconnect. That side is live even with the handle off.'); return lcd('ERR', 'Line side is always live.', true); }
    if (B.disc) { if (act) strike('You took an ohm reading on a live circuit. Open the disconnect first.'); return lcd('ERR', 'Circuit is live. Open the disconnect.', true); }
    const o = B.ohms(r, b), ot = o === Infinity ? 'OL' : o >= 1e5 ? 'OL' : (o < 1 ? jit(o).toFixed(2) : o >= 1000 ? (jit(o) / 1000).toFixed(2) + ' k' : jit(o).toFixed(1)) + (o === Infinity || o >= 1e5 ? '' : ' Ω');
    if (act) { readings++; log('Ohms, ' + name(r) + ' to ' + name(b) + ': ' + ot); }
    lcd(ot, o === Infinity || o >= 1e5 ? 'Open circuit' : 'Resistance');
  }
}
function setMode(m) { mode = m; ['V', 'R', 'D'].forEach(k => $('m' + k).classList.toggle('on', k === m)); measure(!!(probes.red && probes.black)); }
function probeClick(id) {
  if (!active) return;
  if (probeSel) { const other = probeSel === 'red' ? 'black' : 'red'; if (probes[other] === id) probes[other] = null; probes[probeSel] = id; probeSel = null; }
  else if (probes.red === id) probes.red = null;
  else if (probes.black === id) probes.black = null;
  else if (!probes.red) probes.red = id;
  else if (!probes.black) probes.black = id;
  else probes.red = id;
  measure(!!(probes.red && probes.black));
}
function chipClick(which) {
  if (!active) return;
  if (probes[which] && probeSel !== which) { probes[which] = null; probeSel = which; }
  else probeSel = probeSel === which ? null : which;
  measure(false);
}

/* ---------- tools ---------- */
function clamp() {
  if (!active) return; readings++;
  const k = $('clampSel').value, a = B.amps(k), t = a < 0.05 ? '0.0 A' : a.toFixed(a < 1 ? 2 : 1) + ' A';
  $('clampOut').textContent = t; log('Clamp, ' + $('clampSel').selectedOptions[0].text.toLowerCase() + ': ' + t);
}
function mano() {
  if (!active) return; readings++;
  const k = $('manoSel').value, v = { inlet: B.pin, manifold: B.man, pilot: B.pilotP, air: B.air }[k];
  const t = (v * (1 + (Math.random() - 0.5) * 0.02)).toFixed(1) + ' in. w.c.';
  $('manoOut').textContent = t; log($('manoSel').selectedOptions[0].text + ': ' + t);
}
function pumpGauge() {
  if (!active) return; readings++;
  const k = $('pgSel').value; let t;
  if (k === 'dp') { const suc = B.P - 1.5 - (B.has('strainer') && B.pumpRun ? 3 : 0), dis = suc + B.dp; t = 'Suction ' + suc.toFixed(1) + ' psi · discharge ' + dis.toFixed(1) + ' psi · difference ' + B.dp.toFixed(1) + ' psi'; }
  else if (k === 'ret') t = 'Return water ' + Math.round(B.returnT()) + '°F';
  else t = 'Supply water ' + Math.round(B.Tb - 1) + '°F';
  $('pgOut').textContent = t; log(t);
}
function analyzer() {
  if (!active) return; readings++;
  const a = B.analyzer();
  if (!a) { $('anaOut').textContent = 'No combustion: O2 20.9 %, CO 0 ppm. The burner is not firing.'; log('Combustion analyzer: burner not firing (room air).'); return; }
  $('anaOut').innerHTML = '<table>' + [['O2', a.o2.toFixed(1) + ' %'], ['CO2', a.co2.toFixed(1) + ' %'], ['CO (measured)', a.co + ' ppm'], ['CO (air free)', a.coAF + ' ppm'], ['Stack temp', a.stack + '°F'], ['Efficiency', a.eff.toFixed(1) + ' %']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  log('Combustion analyzer: O2 ' + a.o2.toFixed(1) + '%, CO ' + a.co + ' ppm, stack ' + a.stack + '°F, efficiency ' + a.eff.toFixed(1) + '%.');
}

/* ---------- rules ---------- */
function strike(msg) {
  strikes++; log('SAFETY STRIKE: ' + msg, 's'); renderHud();
  if (strikes >= 3) endLevel(false, 'Three safety strikes. A real tech gets sent home after that. Go over your safety routine and try again.');
}
function rmReset() {
  if (!active) return;
  if (B.rm.st !== 'LOCKOUT') { log('Reset pressed. The relay module is not locked out, so nothing happens.'); return; }
  if (!B.rmOK() || !B.lastPow) { log('The display is dark. No power to the relay module, so the reset does nothing.'); return; }
  B.rmReset();
  log('Relay module reset. It starts the sequence again.', 'h');
  if (B.resetsSinceFix >= 3) strike('You reset a locked-out burner three times without finding the cause. Each failed light-off can leave unburned gas in the combustion chamber.');
}
function rmHistory() {
  const h = B.rm.hist;
  sheet(`<div class="kick">Keyboard display · lockout history</div><h3>Last lockouts</h3>` + (h.length ? '<table class="hist">' + h.map((x, i) => `<tr><td>${i + 1}. during ${esc(x.at)}</td><td>${esc(x.msg)}</td></tr>`).join('') + '</table>' : '<p>No lockouts stored.</p>') + `<div class="row"><button class="btn go" type="button" id="hClose">Close</button></div>`);
  $('hClose').onclick = closeSheet;
}
function setSwitches() {
  [['discBtn', B.disc], ['callBtn', B.call], ['bsBtn', B.burnerSw]].forEach(p => { const b = $(p[0]); b.className = 'btn sw ' + (p[1] ? 'on' : 'off'); b.querySelector('em').textContent = p[1] ? 'ON' : 'OFF'; });
}
function installPart(k) {
  if (!active) return;
  const p = PARTS[k];
  if (!p.live && B.disc) return strike('You started work on the boiler with the disconnect closed. 120 V was live in the cabinet and the burner could start.');
  partsUsed++;
  if (p.reset) {
    const was = p.reset === 'hl' ? B.hlTrip : p.reset === 'lg' ? B.lgTrip : p.reset === 'ol' ? B.olTrip : p.reset === 'vfd' ? !!B.vfdFault : B.hgTrip;
    if (!was) { wrongParts++; log(p.name + ': it was not tripped.', 's'); return; }
    if (p.reset === 'hl') { if (B.Tb > HL_SET - 15) { partsUsed--; log('The high limit will not reset yet. The water is still ' + Math.round(B.Tb) + '°F. Let it cool below ' + (HL_SET - 15) + '°F.', 'h'); return; } B.hlTrip = false; }
    if (p.reset === 'lg') { B.lgTrip = false; B.tick(0.01); if (B.lgTrip) { log('Low gas pressure switch reset. It popped right back out: the gas pressure at the switch is still too low.', 's'); return; } }
    if (p.reset === 'hg') B.hgTrip = false;
    if (p.reset === 'ol') { B.olTrip = false; B.humT = 0; }
    if (p.reset === 'vfd') B.vfdFault = '';
    B.resetsSinceFix = 0; log(p.name.replace('Press', 'Pressed') + '. It latched in.', 'g'); updateStatus(); return;
  }
  const cured = [...B.faults].filter(f => FIXES[f] === k);
  if (cured.length) {
    cured.forEach(f => B.faults.delete(f));
    B.resetsSinceFix = 0;
    if (k === 'rm') { B.rm.st = 'OFF'; B.rm.lock = ''; }
    log('Done: ' + p.name + '.', 'g');
    if (B.faults.size) log('Watch how the boiler behaves now.', 'g');
    else log('That should take care of it. Make sure every switch and the relay module are reset, then watch the boiler fire normally.', 'g');
  } else if (p.jumper) { wrongParts++; log('You looked at those terminals. There is no jumper on them.', 's'); }
  else { wrongParts++; log('Done: ' + p.name + '. It made no difference. That part was fine.', 's'); }
  updateStatus(); measure(false);
}

/* ---------- levels ---------- */
function startLevel(i) {
  li = i; const l = LEVELS[i];
  B.reset(l.faults, i + 3, { pre: l.pre, resets: l.resets });
  probes = { red: null, black: null }; probeSel = null;
  strikes = 0; readings = 0; wrongParts = 0; partsUsed = 0; hintsUsed = 0; active = false; explore = false; winWait = 0;
  $('log').innerHTML = ''; ['clampOut', 'manoOut', 'pgOut', 'anaOut'].forEach(id => { $(id).textContent = '---'; });
  $('picSel').innerHTML = '<h3>Look closely</h3><p class="dim">Click any part of the boiler room to inspect it.</p>';
  document.querySelectorAll('.spot .ring').forEach(r => { r.style.display = 'none'; });
  renderTabs(); renderHud(); renderTicket(); updateStatus(); measure(false);
  sheet(`<div class="kick">Level ${l.n} · ${esc(l.rank)}</div><h3>${esc(l.title)}</h3><p style="color:var(--dim)">${esc(l.site)}</p><p>${esc(l.ticket)}</p>
    <p style="color:var(--dim);font-size:13px">Tools: multimeter (AC volts, ohms, DC volts for the flame signal), clamp meter, manometer, pump gauges, pipe thermometers and a combustion analyzer. Open the disconnect before any ohm reading or repair.</p>
    <div class="row"><button class="btn" id="custBtn0" type="button">Talk to the customer first</button><button class="btn go" id="goBtn" type="button">Start job</button></div>`);
  $('goBtn').onclick = () => { closeSheet(); active = true; t0 = Date.now(); log('On site at a Thermal Solutions EVA-3000. The system pump runs all the time, and the building is calling for heat.'); };
  $('custBtn0').onclick = () => { $('goBtn').onclick(); custSheet(); };
}
function endLevel(win, msg) {
  active = false; const l = LEVELS[li];
  if (!win) {
    sheet(`<div class="kick">Job failed</div><h3>${esc(l.title)}</h3><p>${esc(msg)}</p><div class="row"><button class="btn go" id="rBtn" type="button">Try again</button></div>`);
    $('rBtn').onclick = () => startLevel(li); return;
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  let stars = 3 - (strikes ? 1 : 0) - (wrongParts ? 1 : 0) - (hintsUsed || readings > l.par * 2 ? 1 : 0);
  stars = Math.max(1, stars);
  doneSet.add(l.id); saveDone(); renderTabs();
  const last = li === LEVELS.length - 1;
  sheet(`<div class="kick">Job complete</div><h3>${esc(l.title)}</h3>
    <div class="stars">${'★'.repeat(stars)}<span class="off">${'★'.repeat(3 - stars)}</span></div>
    <p>${last ? 'Every call is done. The boiler is firing normally and the building is warm.' : 'The boiler is firing normally and the building is warming up.'}</p>
    <table><tr><td>Readings taken (par ${l.par})</td><td>${readings}</td></tr><tr><td>Hints used</td><td>${hintsUsed}</td></tr><tr><td>Safety strikes</td><td>${strikes}</td></tr>
    <tr><td>Wrong parts</td><td>${wrongParts}</td></tr><tr><td>Parts and repairs</td><td>${partsUsed}</td></tr><tr><td>Time on the job</td><td>${mmss(secs)}</td></tr></table>
    <div class="row"><button class="btn" id="exploreBtn" type="button">Keep exploring</button><button class="btn" id="againBtn" type="button">Replay</button>${last ? '' : '<button class="btn go" id="nextBtn" type="button">Next job</button>'}</div>`);
  $('againBtn').onclick = () => startLevel(li);
  $('exploreBtn').onclick = () => { explore = true; active = true; closeSheet(); log('Job closed out. Free look: keep using the meters and tools. Nothing is scored now.', 'h'); };
  if (!last) $('nextBtn').onclick = () => startLevel(li + 1);
}
function hint() {
  if (!active || explore) return;
  const h = LEVELS[li].hints || []; if (!h.length) return;
  const i = Math.min(hintsUsed, h.length - 1); hintsUsed++;
  log('Hint: ' + h[i], 'h');
}
function custSheet() {
  const l = LEVELS[li], Q = [['when', 'When did this start?'], ['work', 'Has anyone worked on it lately?'], ['lights', 'Any lights or messages on the boiler?'], ['noise', 'Any noises or smells?']];
  sheet(`<div class="kick">${esc(l.site)}</div><h3>Talk to the customer</h3><div class="qa">` + Q.map(q => `<button class="btn" type="button" data-q="${q[0]}">${q[1]}</button>`).join('') + `</div><div class="ans" id="ans">Ask a question.</div><div class="row"><button class="btn go" type="button" id="cClose">Back to work</button></div>`);
  $('sheet').querySelectorAll('[data-q]').forEach(b => { b.onclick = () => { $('ans').textContent = '“' + (l.cust[b.dataset.q] || 'I am not sure.') + '”'; }; });
  $('cClose').onclick = closeSheet;
}
function inspect(k) {
  document.querySelectorAll('.spot .ring').forEach(r => { r.style.display = r.parentNode.dataset.spot === k ? '' : 'none'; });
  const t = inspectText(k, B);
  $('picSel').innerHTML = `<h3>${esc(SPOTS[k][2])}</h3><p>${esc(t)}</p>`;
  if (active) log('Looked at ' + SPOTS[k][2].toLowerCase() + ': ' + t);
}

/* ---------- start-up ---------- */
function buildPartOptions() {
  $('partSel').innerHTML = PART_GROUPS.map(g => `<optgroup label="${g}">` + Object.keys(PARTS).filter(k => PARTS[k].g === g).map(k => `<option value="${k}">${esc(PARTS[k].name)}</option>`).join('') + '</optgroup>').join('');
}
function buildNav() {
  const sc = $('unitScroll'), svg = $('unitSvg'), scale = () => svg.getBoundingClientRect().width / PANEL_W;
  /* old smartboard browsers have no element.scrollTo: set scrollTop there */
  const scrollPanel = y => { y = Math.max(0, y); if (sc.scrollTo) sc.scrollTo({ top: y, behavior: 'smooth' }); else sc.scrollTop = y; };
  const groups = NAV.map(() => []);
  Object.keys(TPOS).forEach(id => { let k = 0; NAV.forEach((n, q) => { if (n[1] <= TPOS[id][1]) k = q; }); groups[k].push(id); });
  $('unitNav').innerHTML = NAV.map((n, i) => `<button class="chip" data-i="${i}" type="button">${esc(n[0])}</button>`).join('') +
    '<select id="findTerm" aria-label="Find a terminal"><option value="">Find a terminal…</option>' + groups.map((g, q) => g.length ? `<optgroup label="${esc(NAV[q][0])}">` + g.map(id => `<option value="${id}">${esc(NODES[id])}</option>`).join('') + '</optgroup>' : '').join('') + '</select>';
  $('unitNav').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; scrollPanel(NAV[+c.dataset.i][1] * scale() - 6); };
  $('findTerm').onchange = e => {
    const id = e.target.value; if (!id) return;
    scrollPanel((TPOS[id][1] - 120) * scale());
    const t = document.querySelector(`#unitSvg .term[data-id="${id}"]`); if (t) { t.classList.remove('flash'); void t.getBoundingClientRect(); t.classList.add('flash'); }
    e.target.value = '';
  };
}
function initViews() {
  const VIEWS = ['desktop', 'phone', 'board'], VLABEL = { desktop: 'View: Desktop', phone: 'View: Phone', board: 'View: Smartboard' };
  let viewMode = 'desktop', boardAdj = 1;
  try { boardAdj = +localStorage.getItem('blr_bz') || 1; } catch (e) {}
  const applyBoardZoom = () => { const z = Math.max(1, Math.min(3.5, window.innerWidth / 1536 * boardAdj)); document.documentElement.style.setProperty('--bz', viewMode === 'board' ? z.toFixed(3) : '1'); };
  const setView = (m, save) => {
    viewMode = m; const r = document.documentElement.classList;
    r.toggle('phone', m === 'phone'); r.toggle('board', m === 'board'); applyBoardZoom();
    $('viewBtn').textContent = VLABEL[m];
    if (save) try { localStorage.setItem('blr_view', m); } catch (e) {}
  };
  let v = null; try { v = localStorage.getItem('blr_view'); } catch (e) {}
  setView(VIEWS.indexOf(v) >= 0 ? v : window.innerWidth >= 2560 ? 'board' : window.innerWidth <= 900 ? 'phone' : 'desktop', false);
  $('viewBtn').onclick = () => setView(VIEWS[(VIEWS.indexOf(viewMode) + 1) % 3], true);
  const bz = d => { boardAdj = Math.max(0.6, Math.min(2, boardAdj + d)); try { localStorage.setItem('blr_bz', boardAdj); } catch (e) {} applyBoardZoom(); };
  $('bzUp').onclick = () => bz(0.1); $('bzDn').onclick = () => bz(-0.1);
  window.addEventListener('resize', applyBoardZoom);
  /* panel zoom */
  const Z = [100, 130, 160, 200, 250, 300]; let zi = 0;
  const applyZoom = () => { $('unitSvg').style.width = Z[zi] + '%'; $('zLbl').textContent = Z[zi] + '%'; };
  $('zIn').onclick = () => { zi = Math.min(Z.length - 1, zi + 1); applyZoom(); };
  $('zOut').onclick = () => { zi = Math.max(0, zi - 1); applyZoom(); };
  if (viewMode === 'phone') { zi = 3; applyZoom(); }
}
function init() {
  $('unitSvg').innerHTML = buildPanel();
  $('schemSvg').innerHTML = buildLadder();
  $('picSvg').innerHTML = buildPic();
  $('specBody').innerHTML = buildSpecs(); $('plateBody').innerHTML = buildPlate();
  buildPartOptions(); buildNav(); initViews();
  ['Unit', 'Schem', 'Pic', 'Order', 'Plate', 'Spec'].forEach(k => { $('tab' + k).onclick = () => setTab(k); });
  $('tabSel').onchange = e => setTab(e.target.value);
  $('unitSvg').addEventListener('click', e => { const t = e.target.closest('.term'); if (t) probeClick(t.dataset.id); });
  $('unitSvg').addEventListener('keydown', e => { const t = e.target.closest('.term'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); probeClick(t.dataset.id); } });
  $('picSvg').addEventListener('click', e => { const t = e.target.closest('.spot'); if (t) inspect(t.dataset.spot); });
  $('picSvg').addEventListener('keydown', e => { const t = e.target.closest('.spot'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inspect(t.dataset.spot); } });
  $('mV').onclick = () => setMode('V'); $('mR').onclick = () => setMode('R'); $('mD').onclick = () => setMode('D');
  $('chipR').onclick = () => chipClick('red'); $('chipK').onclick = () => chipClick('black');
  $('clearP').onclick = () => { probes = { red: null, black: null }; probeSel = null; measure(false); };
  $('wireTog').onclick = () => { const on = $('unitSvg').classList.toggle('nowires'); $('wireTog').textContent = 'Wires: ' + (on ? 'Off' : 'On'); $('wireTog').setAttribute('aria-pressed', String(!on)); };
  $('discBtn').onclick = () => { if (!active) return; B.disc = !B.disc; log(B.disc ? 'Disconnect closed. Power is on.' : 'Disconnect opened. Power is off to the boiler controls (the line side is still live).'); B.tick(0.01); updateStatus(); measure(false); };
  $('callBtn').onclick = () => { if (!active) return; B.call = !B.call; log('Heating call from the building controls ' + (B.call ? 'ON. The burner is enabled.' : 'OFF. The burner is disabled; the pump keeps running.')); B.tick(0.01); updateStatus(); measure(false); };
  $('bsBtn').onclick = () => { if (!active) return; B.burnerSw = !B.burnerSw; log('Burner switch ' + (B.burnerSw ? 'ON.' : 'OFF.')); B.tick(0.01); updateStatus(); measure(false); };
  $('custBtn').onclick = custSheet; $('rmReset').onclick = rmReset; $('rmHist').onclick = rmHistory;
  $('clampBtn').onclick = clamp; $('manoBtn').onclick = mano; $('pgBtn').onclick = pumpGauge; $('anaBtn').onclick = analyzer;
  $('installBtn').onclick = () => installPart($('partSel').value);
  $('hintBtn').onclick = hint; $('restartBtn').onclick = () => startLevel(li);
  $('resetProg').onclick = () => { if (!confirm('Clear all completed levels?')) return; doneSet = new Set(); saveDone(); startLevel(0); };
  setTab('Unit');
  const first = LEVELS.findIndex(l => !doneSet.has(l.id));
  startLevel(first < 0 ? 0 : first);
  setInterval(() => {
    if (!active) return;
    B.tick(0.25);
    updateStatus(); measure(false);
    if (!explore && B.healthy()) { winWait += 0.25; if (winWait >= 2) endLevel(true); } else winWait = 0;
  }, 250);
}
if ($('unitSvg')) init();   /* test.html loads the same code without the game screen */

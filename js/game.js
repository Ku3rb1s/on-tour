/* On Tour – Karte, Stationen und Aufgaben
   Eine Reise durch die Musikgeschichte: 24 Stationen (js/stations.js) in fester Reihenfolge. An jeder Station 6 Aufgaben mit Musik,
   gezogen aus 12 fest gebauten (data/tour.json, scripts/build-data.js): Erkennen (4 Titel), Älter oder neuer, Hit or Miss
   (Behauptung wie in Hit or Miss), Gold-Frage (Wer singt? / Aus welchem Jahr?). Keine Leben, nur Sterne:
   1 Stern ab 3 richtigen, 2 ab 5, 3 bei allen 6. Mit 1 Stern ist die nächste Station offen. Konzept: KONZEPT.md */
const APP_VERSION = '1.0.0', APP_DATE = '08.11.2026'; // bei jedem Update erhöhen + CHANGELOG.md ergänzen
// Eigene Version für data/tour.json – nur erhöhen, wenn sich die Songdaten geändert haben (scripts/build-data.js)
const DATA_V = 'd2';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const Q_PER_STATION = 6;
const starsFor = right => right >= 6 ? 3 : right >= 5 ? 2 : right >= 3 ? 1 : 0;
const THEMES = [['graphit', 'Graphit', '#3a4252', '#1f3a32'], ['ozean', 'Ozean', '#0b4f75', '#0d6e66'], ['wald', 'Wald', '#1d5a3a', '#4c5b1a'],
  ['abend', 'Abend', '#7a2e1c', '#7d1f4a'], ['lila', 'Lila', '#4a22a0', '#8a1458'], ['oled', 'OLED', '#000', '#000']];
const LOC = () => ({ de: 'de-DE', en: 'en-GB', fr: 'fr-FR', es: 'es-ES', nb: 'nb-NO' }[curLang] || 'de-DE');
const fmtN = n => Math.round(n).toLocaleString(LOC());
const SITE = 'https://ku3rb1s.github.io/on-tour/';
// „Mehr davon in …“ am Ende einer Station (Feld game in js/stations.js)
const GAME_LINKS = {
  nd: ['Needle Drop', 'https://ku3rb1s.github.io/needle-drop/', 'Songs am ersten Ton erkennen'],
  oon: ['Older or Newer', 'https://ku3rb1s.github.io/older-or-newer/', 'Älter oder neuer – Song für Song'],
  hom: ['Hit or Miss', 'https://ku3rb1s.github.io/hit-or-miss/', 'Stimmt’s oder stimmt’s nicht?'],
  gr: ['Gold Record', 'https://ku3rb1s.github.io/gold-record/', 'Interpreten und Jahre raten'],
};
const KIND = {
  rec: ['Erkennen', 'Welcher Song läuft?'],
  old: ['Älter oder neuer', 'Welcher Song ist älter?'],
  claim: ['Hit or Miss', 'Stimmt das?'],
  who: ['Gold-Frage', 'Wer singt das?'],
  year: ['Gold-Frage', 'Aus welchem Jahr ist der Song?'],
  feat: ['Mit wem?', 'Mit wem singt {a} hier?'],
};
const KIND_NAMES = { rec: 'Erkennen', old: 'Älter oder neuer', claim: 'Hit or Miss', gold: 'Gold-Frage', feat: 'Mit wem?' };

// Gespeichert wird mit „ot.“ vorne – alle Spiele teilen sich den Browser-Speicher von ku3rb1s.github.io
const LS = {
  get(k, d) { try { const v = localStorage.getItem('ot.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ot.' + k, JSON.stringify(v)); } catch {} },
};
const sharedTheme = {
  get() { try { return JSON.parse(localStorage.getItem('mq.theme')) || 'graphit'; } catch { return 'graphit'; } },
  set(v) { try { localStorage.setItem('mq.theme', JSON.stringify(v)); } catch {} },
};
const opt = { sfx: LS.get('sfx', true), vib: LS.get('vib', true), vol: LS.get('vol', 80), muted: false, theme: sharedTheme.get() };

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString(LOC(), { day: 'numeric', month: 'long', year: 'numeric' });
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const starTxt = n => '★'.repeat(n) + '☆'.repeat(3 - n);

/* ---------- Touren ----------
   Eine Tour ist eine Liste von Stationen mit festen Aufgaben. Die Sterne stehen in ot.<key> = { Stations-Schlüssel: Sterne }
   und werden mit „mapmax“ abgeglichen (pro Station zählt der beste Wert):
     Haupt-Tour   ot.stars   Schlüssel = id aus js/stations.js
     Künstler     ot.astars  Schlüssel = <Künstler-id>.<Nr.> (Nr. ab 1)
   tourOf(id) baut daraus ein einheitliches Objekt, mit dem Karte, Station und Ergebnis arbeiten. */
const cityName = st => tx(st.city);
const stLabel = st => st.id === 'today' ? tx('Heute') : `${cityName(st)} ${st.year}`;
const decLabel = y => tx('{d}er', { d: Math.floor(y / 10) * 10 });
const yrs = y => y[0] === y[1] ? String(y[0]) : `${y[0]}–${y[1]}`;
function tourOf(id = 'main') {
  if (id === 'main') return {
    id, kind: 'main', key: 'stars',
    stations: STATIONS.map(st => ({ sid: st.id, st, icon: st.icon, name: () => st.id === 'today' ? tx('Heute') : cityName(st), label: () => stLabel(st),
      sub: () => (st.id === 'today' ? '' : st.year + ' · ') + tx(st.theme), y: st.y, dec: st.year, game: st.game, pool: () => DATA?.tours.main[st.id] })),
  };
  const a = DATA?.artists.find(x => 'a:' + x.id === id);
  if (!a) return null;
  return {
    id, kind: 'artist', key: 'astars', artist: a,
    stations: a.st.map((st, i) => ({ sid: `${a.id}.${i + 1}`, icon: '🎤', img: stImg(st), name: () => tx('Station {n}', { n: i + 1 }),
      label: () => `${a.A} · ${tx('Station {n}', { n: i + 1 })}`, sub: () => yrs(st.y), y: st.y, pool: () => st.q })),
  };
}
// Bild einer Künstler-Station: Cover eines Songs aus ihren Aufgaben
function stImg(st) { const q = st.q.find(x => x.s != null && x.k !== 'rec') || st.q[0];   // nicht ein Song, nach dem bei „Welcher Song?“ gefragt wird
  const s = DATA.S[q.s ?? q.a]; return s ? cover(s, 120) : ''; }
const starsMap = t => LS.get(t.key, {}) || {};
const starOf = (t, i) => +starsMap(t)[t.stations[i].sid] || 0;
const totalStars = (t = tourOf()) => t.stations.reduce((n, _, i) => n + starOf(t, i), 0);
// Wie viele Stationen sind offen? Die erste plus jede, deren Vorgänger mindestens 1 Stern hat
function openCount(t = tourOf()) { let n = 1; while (n < t.stations.length && starOf(t, n - 1) >= 1) n++; return n; }
const doneCount = (t = tourOf()) => t.stations.filter((_, i) => starOf(t, i) >= 1).length;

/* ---------- Cover ---------- */
const dzCover = (c, size) => `https://e-cdns-images.dzcdn.net/images/cover/${c}/${size}x${size}-000000-80-0-0.jpg`;
const COVER_FALLBACK = new Map();
const cover = (s, size = 500) => {
  if (!s.c) return '';
  if (!s.c.startsWith('mb:')) return dzCover(s.c, size);
  const url = `https://coverartarchive.org/release-group/${s.c.slice(3)}/front-${size <= 250 ? 250 : 500}`;
  if (s.c0) COVER_FALLBACK.set(url, dzCover(s.c0, size));
  return url;
};
addEventListener('error', e => { const i = e.target; if (i?.tagName === 'IMG' && COVER_FALLBACK.has(i.src)) i.src = COVER_FALLBACK.get(i.src); }, true);

/* ---------- Daten ---------- */
let DATA = null;
async function loadData() {
  if (DATA) return DATA;
  const r = await fetch('data/tour.json?v=' + DATA_V);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const raw = await r.json();
  // songs: [id, Titel, Interpret, Jahr, Cover, Ersatz-Cover, Streams (Mio.), Interpretenfeld]
  raw.S = raw.songs.map(([i, T, A, y, c, c0, n, a0]) => ({ i, T, A, y, c, c0: c0 || '', n: n || 0, a0: a0 || A }));
  raw.byId = new Map(raw.S.map(s => [s.i, s]));
  DATA = raw;
  return DATA;
}

/* ---------- Musik: zwei Player im Wechsel (wie Hit or Miss) ----------
   Der Ausschnitt der nächsten Aufgabe lädt schon im zweiten Player. Deezer-Links laufen nach ca. 15 Minuten ab –
   previewOf holt bei Bedarf einen frischen. */
if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) document.documentElement.classList.add('ios');
const players = [new Audio(), new Audio()];
players.forEach(p => { p.preload = 'auto'; p.addEventListener('playing', renderPlaying); p.addEventListener('pause', renderPlaying); });
let active = players[0];
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
const previews = new Map();
const linkUntil = url => { const m = String(url).match(/exp=(\d{9,})/); return m ? +m[1] * 1000 : Date.now() + 10 * 60e3; };
function previewOf(s, fresh = false) {
  const hit = previews.get(s.i);
  if (fresh || !hit || hit.until < Date.now() + 60e3) {
    const e = { until: Infinity };
    e.p = DZ.track(s.i).then(t => {
      if (!t.preview) throw new Error(tx('Keine Vorschau'));
      if (!s.c && t.album?.md5_image) s.c = t.album.md5_image;
      e.until = linkUntil(t.preview);
      return t.preview;
    });
    e.p.catch(() => { if (previews.get(s.i) === e) previews.delete(s.i); });
    previews.set(s.i, e);
  }
  return previews.get(s.i).p;
}
// iPhone: Ton geht erst nach einem Tipp – beim Start beide Player einmal „anstoßen“
function unlockAudio() {
  for (const p of players) { p._id = null; p._url = null; p.src = SILENT; p.play().then(() => p.pause()).catch(() => {}); }
}
function load(p, s) {
  p._id = s.i;
  return previewOf(s).then(url => { if (p._id === s.i && p._url !== url) { p._url = url; p.src = url; p.load(); } return url; });
}
function preloadNext(s) { if (!s) return; const p = players.find(x => x !== active); if (p._id !== s.i) load(p, s).catch(() => {}); }
async function playSong(s, retry = true, restart = true) {
  for (const p of players) if (p._id !== s.i) p.pause();
  const p = players.find(x => x._id === s.i) || players.find(x => x !== active);
  active = p;
  try {
    await load(p, s);
    if (active !== p || p._id !== s.i) return;
    applyVol();
    if (restart && p.currentTime > 0.5) p.currentTime = 0;
    await p.play();
  } catch (e) {
    if (e?.name === 'AbortError' || active !== p) return;
    if (retry && e?.name !== 'NotAllowedError') { previews.delete(s.i); p._url = null; return playSong(s, false); }
    if (e?.name !== 'NotAllowedError') toast(tx('Der Ausschnitt lädt gerade nicht – tippe auf die Platte, um es nochmal zu versuchen.'));
  }
}
function stopAudio() { for (const p of players) p.pause(); renderPlaying(); }
function renderPlaying() {
  const on = !active.paused && active._id;
  $$('[data-song]').forEach(el => el.classList.toggle('playing', !!on && +el.dataset.song === active._id));
}
function applyVol() {
  for (const p of players) { p.muted = opt.muted; p.volume = opt.vol / 100; }
  $('#volBox').classList.toggle('off', opt.muted);
  const r = $('#vol'); r.value = opt.vol; r.style.setProperty('--p', opt.vol + '%');
  $('#volVal').textContent = opt.muted ? '–' : opt.vol;
  $('#volMute use').setAttribute('href', opt.muted || !opt.vol ? '#i-mute' : '#i-vol');
}

/* ---------- Texte der Behauptungen (wie Hit or Miss) ---------- */
const bn = n => (n / 1000).toLocaleString(LOC(), { maximumFractionDigits: 2 });
const nm = s => `<span class="nm">${esc(s)}</span>`;
function claimHtml(c) {
  switch (c.k) {
    case 'artist': return tx('ist von {a}', { a: nm(c.A) });
    case 'title': return tx('heißt »{t}«', { t: nm(c.T) });
    case 'streams': return tx('hat über {n} Streams bei Spotify', { n: tx('{n} Mrd.', { n: bn(c.n) }) });
    case 'older': { const o = DATA.S[c.o]; return c.cmp === 'older' ? tx('ist älter als »{t}« von {a}', { t: nm(o.T), a: nm(o.A) }) : tx('ist neuer als »{t}« von {a}', { t: nm(o.T), a: nm(o.A) }); }
  }
  return '';
}
function factHtml(c, s) {
  switch (c.k) {
    case 'artist': return tx('ist von {a}', { a: `<b>${esc(s.A)}</b>` });
    case 'title': return tx('heißt »{t}«', { t: `<b>${esc(s.T)}</b>` });
    case 'streams': return tx('{n} Streams (Stand {d})', { n: `<b>${tx('{n} Mrd.', { n: bn(s.n) })}</b>`, d: fmtDate(DATA.streamsAt) });
    case 'older': { const o = DATA.S[c.o]; return tx('erschien {y}', { y: `<b>${s.y}</b>` }) + ' · ' + tx('»{t}«: {y}', { t: esc(o.T), y: `<b>${o.y}</b>` }); }
  }
  return '';
}

/* ---------- Aufgaben einer Station ziehen ----------
   Aus den gebauten Aufgaben (8–12) kommen 6 dran: je Art mindestens eine, kein Song doppelt, Reihenfolge gemischt. */
const groupOf = q => q.k === 'who' || q.k === 'year' ? 'gold' : q.k;
const songsOfQ = q => [q.s, q.a, q.b, q.k === 'claim' && q.c.k === 'older' ? q.c.o : null].filter(x => x != null);
function pickQuestions(pool) {
  const out = [], used = new Set();
  const fits = q => songsOfQ(q).every(i => !used.has(i));
  const take = q => { out.push(q); songsOfQ(q).forEach(i => used.add(i)); };
  const rest = shuffle(pool);
  for (const g of shuffle(['rec', 'old', 'claim', 'gold', 'feat'])) { const q = rest.find(x => groupOf(x) === g && !out.includes(x) && fits(x)); if (q) take(q); }
  for (const q of rest) { if (out.length >= Q_PER_STATION) break; if (!out.includes(q) && fits(q)) take(q); }
  for (const q of rest) { if (out.length >= Q_PER_STATION) break; if (!out.includes(q)) take(q); }   // notfalls doch ein Song doppelt
  return shuffle(out.slice(0, Q_PER_STATION));
}
// Überschrift je Art – in Künstler-Touren mit dem Namen des Stars
function kindText(q) {
  const a = G?.t.kind === 'artist' ? G.t.artist.A : null;
  if (a && q.k === 'rec') return [KIND.rec[0], tx('Welcher Song von {a} läuft?', { a })];
  if (a && q.k === 'old') return [KIND.old[0], tx('Was kam zuerst?')];
  if (q.k === 'feat') return [KIND.feat[0], tx('Mit wem singt {a} hier?', { a: a || '' })];
  if (a && q.k === 'claim') return [tx('Streams'), tx(KIND.claim[1])];
  return [tx(KIND[q.k][0]), tx(KIND[q.k][1])];
}

/* ---------- Spiel ---------- */
let G = null;
async function startStation(tid, idx) {
  if (G && !G.ended) return;
  unlockAudio();   // muss direkt im Tipp passieren (iPhone)
  $('#loading').classList.remove('hidden');
  try { await loadData(); } catch { $('#loading').classList.add('hidden'); return toast(tx('Die Songliste konnte nicht geladen werden.')); }
  $('#loading').classList.add('hidden');
  const t = tourOf(tid), st = t?.stations[idx], pool = st?.pool();
  if (!pool?.length) return toast(tx('Die Songliste konnte nicht geladen werden.'));
  const qs = pickQuestions(pool).map(q => {
    // Antworten mischen (die richtige steht im Paket immer vorne)
    if (q.k === 'rec') return { ...q, opts: shuffle([q.s, ...q.o]) };
    if (q.k === 'who') return { ...q, opts: shuffle([DATA.S[q.s].A, ...q.o]) };
    if (q.k === 'feat') return { ...q, opts: shuffle([q.A, ...q.o]) };
    if (q.k === 'year') return { ...q, opts: [DATA.S[q.s].y, ...q.o].sort((a, b) => a - b) };
    if (q.k === 'old') return Math.random() < .5 ? { ...q, a: q.b, b: q.a } : q;
    return q;
  });
  G = { t, tid, idx, st, qs, n: 0, log: [], right: 0, ended: false, answered: false, before: starOf(t, idx), openBefore: openCount(t) };
  show('game');
  $('#gStation').textContent = `${st.icon} ${st.label()}`;
  for (const s of songsOfQ(qs[0])) previewOf(DATA.S[s]).catch(() => {});
  renderQ();
}
const curQ = () => G?.qs[G.n];
const mainSong = q => DATA.S[q.k === 'old' ? q.a : q.s];
const yTxt = s => s.y ? ' · ' + s.y : '';   // ergänzte Deezer-Songs haben kein geprüftes Jahr

function songCard(s, { hideA = false, hideT = false, blur = false, aTxt = null } = {}) {
  const img = cover(s, 250);
  return `<div class="song ${blur ? 'blur' : ''}" data-song="${s.i}" data-play="${s.i}">
    <div class="cv">${img ? `<img src="${img}" alt="" draggable="false">` : ''}<span class="eq"><i></i><i></i><i></i><i></i></span></div>
    <div class="info"><div class="t">${hideT ? '<span class="qm">? ? ?</span>' : esc(s.T)}</div><div class="a">${aTxt ?? (hideA ? `<span class="qm">${tx('Wer ist das?')}</span>` : esc(s.A))}</div></div>
  </div>`;
}
function discHtml(s) {
  return `<button class="disc-btn" data-song="${s.i}" data-play="${s.i}" aria-label="${esc(tx('Nochmal von vorn'))}"><span class="vinyl"><span class="lbl"></span></span><span class="eq"><i></i><i></i><i></i><i></i></span></button>
    <div class="tap-hint">${tx('Tippen: nochmal von vorn')}</div>`;
}
const optBtn = (v, k, main, small = '') => `<button class="opt" data-v="${esc(v)}"><kbd>${k + 1}</kbd><span><b>${esc(main)}</b>${small ? `<small>${esc(small)}</small>` : ''}</span></button>`;
function renderQ() {
  const q = curQ(); if (!q) return;
  G.answered = false;
  const [kicker, title] = kindText(q);
  $('#qKind').textContent = kicker + ' · ' + tx('Aufgabe {n} von {m}', { n: G.n + 1, m: G.qs.length });
  $('#qTitle').textContent = title;
  $('#qFact').innerHTML = '';
  $('#qNextBox').classList.add('hidden');
  renderDots();
  const s = mainSong(q), body = $('#qBody'), opts = $('#qOpts'), artistTour = G.t.kind === 'artist';
  opts.className = 'q-opts';
  if (q.k === 'rec') {
    body.innerHTML = discHtml(s);
    // Künstler-Tour: alle vier vom selben Star – darum ohne Interpret darunter
    opts.innerHTML = q.opts.map((i, k) => { const o = DATA.S[i]; return optBtn(i, k, o.T, artistTour ? '' : o.A); }).join('');
  } else if (q.k === 'who') {
    body.innerHTML = songCard(s, { hideA: true, blur: true });
    opts.innerHTML = q.opts.map((a, k) => optBtn(a, k, a)).join('');
  } else if (q.k === 'feat') {
    // Mit wem? – der Titel steht da, die Interpreten nicht (sonst stünde die Antwort schon da)
    body.innerHTML = songCard(s, { aTxt: `${esc(G.t.artist.A)} &amp; <span class="qm">?</span>` });
    opts.innerHTML = q.opts.map((a, k) => optBtn(a, k, a)).join('');
  } else if (q.k === 'year') {
    body.innerHTML = songCard(s);
    opts.className = 'q-opts years';
    opts.innerHTML = q.opts.map((y, k) => optBtn(y, k, y)).join('');
  } else if (q.k === 'claim') {
    // wie Hit or Miss: Bei „ist von …“ ist der Interpret verdeckt, bei „heißt …“ der Titel (und das Cover unscharf)
    const hide = q.c.k === 'artist' ? 'a' : q.c.k === 'title' ? 't' : null;
    body.innerHTML = songCard(s, { hideA: hide === 'a', hideT: hide === 't', blur: !!hide }) + `<div class="claim">${claimHtml(q.c)}</div>`;
    opts.className = 'q-opts two';
    opts.innerHTML = `<button class="opt miss" data-v="0"><kbd>←</kbd><span><b>✗ ${tx('Stimmt nicht')}</b></span></button><button class="opt hit" data-v="1"><kbd>→</kbd><span><b>✓ ${tx('Stimmt')}</b></span></button>`;
  } else if (q.k === 'old') {
    const a = DATA.S[q.a], b = DATA.S[q.b];
    body.innerHTML = '';
    opts.className = 'q-opts pair';
    opts.innerHTML = [a, b].map((o, k) => `<button class="opt tile" data-v="${o.i}" data-song="${o.i}"><kbd>${k + 1}</kbd>
      <span class="cv">${cover(o, 250) ? `<img src="${cover(o, 250)}" alt="" draggable="false">` : ''}<span class="eq"><i></i><i></i><i></i><i></i></span></span>
      <span class="tile-t"><b>${esc(o.T)}</b>${artistTour ? '' : `<small>${esc(o.A)}</small>`}</span>
      <span class="tile-play" data-play="${o.i}" role="button" aria-label="${esc(tx('Anhören'))}"><svg class="ic"><use href="#i-play"/></svg>${tx('Anhören')}</span></button>`).join('<span class="vs">vs</span>');
  }
  fitClaim();
  renderPlaying();
  playSong(s);
  // nächste Aufgabe schon laden
  const nq = G.qs[G.n + 1]; if (nq) preloadNext(mainSong(nq));
  G.qStart = performance.now();
}
function renderDots() {
  $('#gDots').innerHTML = G.qs.map((_, i) => { const l = G.log[i]; return `<i class="${l ? (l.ok ? 'ok' : 'bad') : i === G.n ? 'cur' : ''}"></i>`; }).join('');
}
// Lange Behauptungen passend machen (wie Hit or Miss), nicht kleiner als 14 px
function fitClaim() {
  const cl = $('#qBody .claim'); if (!cl) return;
  cl.style.fontSize = '';
  let size = parseFloat(getComputedStyle(cl).fontSize);
  while (cl.scrollWidth > cl.clientWidth + 1 && size > 14) { size -= 1; cl.style.fontSize = size + 'px'; }
}
function rightOf(q) {
  const s = mainSong(q);
  if (q.k === 'rec') return String(q.s);
  if (q.k === 'who') return s.A;
  if (q.k === 'feat') return q.A;
  if (q.k === 'year') return String(s.y);
  if (q.k === 'claim') return q.c.ok ? '1' : '0';
  if (q.k === 'old') { const a = DATA.S[q.a], b = DATA.S[q.b]; return String(a.y < b.y ? a.i : b.i); }
}
function answer(v) {
  const q = curQ();
  if (!q || G.answered || G.ended) return;
  G.answered = true;
  const s = mainSong(q), right = rightOf(q), ok = v != null && String(v) === right;
  if (ok) G.right++;
  G.log.push({ q, ok, said: v });
  // Knöpfe einfärben: richtige Antwort grün, falsch gewählte rot
  for (const b of $$('#qOpts .opt')) {
    b.disabled = true;
    if (b.dataset.v === right) b.classList.add('right');
    else if (b.dataset.v === String(v)) b.classList.add('wrong');
  }
  $$('#qOpts .tile').forEach(t => { const o = DATA.byId.get(+t.dataset.v); if (o) t.querySelector('.tile-t').insertAdjacentHTML('beforeend', `<em>${o.y}</em>`); });
  // Auflösung: Song zeigen (Cover scharf, Interpret und Titel)
  $$('#qBody .song').forEach(el => el.classList.remove('blur'));
  // Erkennen: kein zweiter Titel oben (steht schon im grünen Knopf) – nur das Cover erscheint in der Mitte der Platte
  if (q.k === 'rec') { const l = $('#qBody .vinyl .lbl'), img = cover(s, 250); if (l && img) { l.style.backgroundImage = `url("${img}")`; l.classList.add('cov'); } $('#qBody .tap-hint')?.remove(); }
  else if (q.k === 'who' || q.k === 'claim' || q.k === 'feat') { const t = $('#qBody .song .t'), a = $('#qBody .song .a'); if (t) t.textContent = s.T; if (a) a.textContent = s.a0; }
  const fact = q.k === 'claim' ? `<b>${esc(s.T)}</b> ${factHtml(q.c, s)}` : q.k === 'old' ? '' : `<b>${esc(s.T)}</b> · ${esc(s.a0)}${yTxt(s)}`;
  $('#qFact').innerHTML = `<span class="${ok ? 'good' : 'wrong'}">${ok ? '✓ ' + tx('Richtig!') : v == null ? '⏱ ' + tx('Zeit abgelaufen') : '✗ ' + tx('Daneben!')}</span> ${fact}`;
  $('#game').classList.remove('ok', 'bad'); void $('#game').offsetWidth; $('#game').classList.add(ok ? 'ok' : 'bad');
  sound(ok ? 'ok' : 'miss');
  if (!ok && opt.vib && navigator.vibrate) navigator.vibrate(90);
  renderDots();
  const last = G.n >= G.qs.length - 1;
  $('#qNextLbl').textContent = last ? tx('Zum Ergebnis') : tx('Weiter');
  $('#qNextBox').classList.remove('hidden');
  $('#qNext').focus({ preventScroll: true });
}
function nextQ() {
  if (!G || !G.answered) return;
  if (G.n >= G.qs.length - 1) return endStation();
  G.n++;
  renderQ();
}

/* ---------- Ende einer Station ---------- */
let fresh = null;   // für die Karte: was sich gerade geändert hat (Sterne ploppen, nächste Station leuchtet)
function endStation() {
  if (!G || G.ended) return;
  G.ended = true;
  stopAudio();
  const { t, st, idx } = G, stars = starsFor(G.right), map = starsMap(t), had = +map[st.sid] || 0, best = Math.max(had, stars);
  if (stars > had) { map[st.sid] = stars; LS.set(t.key, map); }
  const opened = openCount(t) > G.openBefore;
  fresh = { tid: t.id, sid: st.sid, gained: stars > G.before, opened: opened ? t.stations[openCount(t) - 1].sid : null };
  recordStats(G);
  const ach = checkAch(G);
  const next = t.stations[idx + 1];
  $('#endStation').textContent = `${st.icon} ${st.label()}`;
  $('#endBest').textContent = tx('Bestwert: {s}', { s: starTxt(best) });
  $('#endKicker').textContent = stars === 3 ? tx('Perfekt!') : stars ? tx('Station geschafft') : tx('Knapp daneben');
  $('#endStars').innerHTML = [0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}" style="animation-delay:${.25 + i * .18}s">★</i>`).join('');
  window.countUp ? countUp($('#endScore'), G.right, n => tx('{n} von {m}', { n, m: G.qs.length })) : $('#endScore').textContent = tx('{n} von {m}', { n: G.right, m: G.qs.length });
  $('#endSub').textContent = stars === 3 ? tx('Alle richtig – drei Sterne!') : stars === 2 ? tx('Noch 1 richtig mehr für drei Sterne') : stars === 1 ? tx('Für zwei Sterne brauchst du 5 richtige') : tx('Ab 3 richtigen gibt es den ersten Stern');
  const finished = !next && stars && G.before === 0;
  let note = '';
  if (opened && next) note = '🎉 ' + tx('Neue Station offen: {s}', { s: `${next.icon} ${next.label()}` });
  else if (finished) note = '🏁 ' + (t.kind === 'artist' ? tx('Du hast die Tour von {a} geschafft!', { a: t.artist.A }) : tx('Du hast die ganze Tour geschafft – von Memphis bis heute!'));
  else if (!stars && G.before === 0) note = tx('Versuch es nochmal – die Songs bleiben dieselben, nur die Aufgaben wechseln.');
  $('#endNote').textContent = note; $('#endNote').classList.toggle('hidden', !note);
  const gl = GAME_LINKS[st.game];
  $('#moreLink').classList.toggle('hidden', !gl);
  if (gl) { $('#moreLink').href = gl[1]; $('#moreLink').innerHTML = `${tx('Mehr davon in {g}', { g: `<b>${gl[0]}</b>` })}<small>${tx(gl[2])}</small>`; }
  // Weiter-Knopf: nächste Station, wenn offen – sonst nochmal
  const canNext = next && starOf(t, idx) >= 1;
  $('#goNextBtn').classList.toggle('hidden', !canNext);
  $('#goNextLbl').textContent = !canNext ? '' : t.kind === 'artist' ? tx('Weiter: {s}', { s: next.name() }) : next.st.id === 'today' ? tx('Weiter: {s}', { s: tx('Heute') }) : tx('Nach {s}', { s: next.name() });
  $('#againBtn').classList.toggle('big', !canNext); $('#againBtn').classList.toggle('ghost', !!canNext);
  renderEndList();
  show('end');
  sound(stars ? 'end' : 'miss');
  if (stars === 3 || finished) confetti(140);
  ach.forEach((a, k) => setTimeout(() => toast(`${a[1]} ${tx(a[2])}`, 2600), 900 + k * 2800));
}
function renderEndList() {
  $('#endList').innerHTML = G.log.map(l => {
    const q = l.q, s = mainSong(q), img = cover(s, 120);
    let line = '';
    if (q.k === 'claim') line = `„${claimHtml(q.c)}“ → ${q.c.ok ? tx('stimmt') : tx('stimmt nicht')}<span class="fact-line">${factHtml(q.c, s)}</span>`;
    else if (q.k === 'old') { const b = DATA.S[q.b], a = DATA.S[q.a]; line = tx('Älter: {t}', { t: `<b>${esc((a.y < b.y ? a : b).T)}</b>` }) + ` · ${esc(a.T)} ${a.y} · ${esc(b.T)} ${b.y}`; }
    else line = kindText(q)[1] + ' → ' + `<b>${esc(rightOf(q) === String(q.s) ? s.T : rightOf(q))}</b>`;
    return `<div class="cell res ${l.ok ? 'ok' : 'bad'}" data-song="${s.i}" data-play="${s.i}">
      <span class="res-cv">${img ? `<img src="${img}" alt="" loading="lazy">` : ''}<span class="eq"><i></i><i></i><i></i></span></span>
      <span class="grow"><b>${esc(s.T)}</b> · ${esc(s.A)}${yTxt(s)}<span class="sub">${line}</span></span>
      <span class="res-mark">${l.ok ? '✓' : '✗'}</span></div>`;
  }).join('');
  renderPlaying();
}

/* ---------- Statistik & Erfolge ---------- */
function recordStats(g) {
  const st = LS.get('stats', { games: 0, right: 0, asked: 0, perfect: 0, types: {} });
  st.games++; st.right += g.right; st.asked += g.log.length; if (g.right === g.qs.length) st.perfect = (st.perfect || 0) + 1;
  st.types ||= {};
  for (const l of g.log) { const t = (st.types[groupOf(l.q)] ||= [0, 0]); t[1]++; if (l.ok) t[0]++; }
  LS.set('stats', st);
}
const ACH = [
  ['first', '🎫', 'Erste Station', 'Eine Station gespielt'],
  ['perfect', '⭐', 'Glatte Sechs', 'Eine Station mit allen 6 richtig'],
  ['sixties', '🎸', 'Die wilden Sechziger', 'Alle Stationen bis 1969 geschafft'],
  ['half', '🗺️', 'Halbzeit', '12 Stationen geschafft'],
  ['all', '🏁', 'Tour beendet', 'Alle 24 Stationen geschafft'],
  ['s36', '🌟', 'Sternensammler', '36 Sterne gesammelt'],
  ['s72', '👑', 'Alle Sterne', 'Alle 72 Sterne der Tour'],
  ['fan', '🎤', 'Echter Fan', 'Eine Künstler-Tour ganz geschafft'],
  ['fans3', '💿', 'Plattensammlung', 'Drei Künstler-Touren ganz geschafft'],
];
function checkAch(g) {
  const have = LS.get('ach', {}), fresh = [], m = tourOf(), s = starsMap(m), done = doneCount(m), tot = totalStars(m);
  const artistsDone = (DATA?.artists || []).filter(a => { const t = tourOf('a:' + a.id); return doneCount(t) === t.stations.length; }).length;
  const ok = {
    first: true, perfect: g.right === g.qs.length, sixties: STATIONS.filter(x => x.year < 1970).every(x => (+s[x.id] || 0) >= 1),
    half: done >= 12, all: done >= STATIONS.length, s36: tot >= 36, s72: tot >= STATIONS.length * 3, fan: artistsDone >= 1, fans3: artistsDone >= 3,
  };
  for (const a of ACH) if (ok[a[0]] && !have[a[0]]) { have[a[0]] = today(); fresh.push(a); }
  if (fresh.length) LS.set('ach', have);
  return fresh;
}
function renderStats() {
  const st = Sync.view('ot.stats', LS.get('stats', null)), m = tourOf();
  const pct = (r, n) => n ? Math.round(r / n * 100) + ' %' : '–';
  const rows = [
    [tx('Stationen geschafft'), `${doneCount(m)} / ${STATIONS.length}`],
    [tx('Sterne'), `${totalStars(m)} / ${STATIONS.length * 3}`],
  ];
  const as = Object.values(LS.get('astars', {}) || {}).reduce((a, b) => a + (+b || 0), 0);
  if (as) rows.push([tx('Sterne in Künstler-Touren'), fmtN(as)]);
  if (st?.games) rows.push([tx('Gespielte Stationen'), fmtN(st.games)], [tx('Richtige Antworten'), `${fmtN(st.right)} (${pct(st.right, st.asked)})`]);
  const types = Object.entries(KIND_NAMES).filter(([k]) => st?.types?.[k]?.[1]).map(([k, n]) => [tx(n), pct(...st.types[k])]);
  const have = LS.get('ach', {});
  $('#statsBox').innerHTML = `<div class="group" style="margin-top:14px">${rows.map(([k, v]) => `<div class="cell"><span class="grow">${k}</span><b>${v}</b></div>`).join('')}</div>`
    + (types.length ? `<div class="group-h">${tx('Treffer je Art')}</div><div class="group">${types.map(([k, v]) => `<div class="cell"><span class="grow">${k}</span><b>${v}</b></div>`).join('')}</div>` : '')
    + `<div class="group-h">${tx('Erfolge')} · ${Object.keys(have).length}/${ACH.length}</div><div class="group icons">${ACH.map(a => `<div class="cell ach ${have[a[0]] ? '' : 'locked'}"><span class="cell-ic ach-ic">${a[1]}</span><span class="grow">${tx(a[2])}<span class="sub">${tx(a[3])}</span></span>${have[a[0]] ? '<b>✓</b>' : ''}</div>`).join('')}</div>`;
}

/* ---------- Karte ----------
   Unten fängt es an (Memphis 1956 bzw. die erste Station einer Karriere), oben ist das Ende. Die Stationen liegen in
   Schlangenlinien, dazwischen die Straße (SVG). Der schon gefahrene Teil der Straße ist farbig. */
const ROW = 134, DEC_ROW = 40, PAD_TOP = 24, PAD_BOT = 20;
function mapLayout(t) {
  const items = []; let y = PAD_TOP;
  for (let i = t.stations.length - 1; i >= 0; i--) {   // von oben nach unten: letzte Station zuerst
    const st = t.stations[i], prev = t.stations[i - 1];
    items.push({ i, y: y + 6, x: 50 + Math.sin(i * 1.15 + .4) * 26 });
    y += ROW;
    if (st.dec && (!prev || Math.floor(prev.dec / 10) !== Math.floor(st.dec / 10))) { items.push({ dec: st.dec, y: y + 2 }); y += DEC_ROW; }
  }
  return { items, h: y + PAD_BOT };
}
function renderMap(t) {
  const { items, h } = mapLayout(t), open = openCount(t);
  const wrap = $('#mapWrap');
  wrap.style.height = h + 'px';
  $('#map').innerHTML = items.map(it => {
    if (it.dec) return `<div class="dec" style="top:${it.y}px"><span>${decLabel(it.dec)}</span></div>`;
    const st = t.stations[it.i], n = starOf(t, it.i), locked = it.i >= open, cur = it.i === open - 1 && n === 0;
    const mine = fresh?.tid === t.id;
    const cls = [locked ? 'locked' : n ? 'done' : 'next', cur ? 'cur' : '', mine && fresh.sid === st.sid && fresh.gained ? 'fresh' : '', mine && fresh.opened === st.sid ? 'opened' : '', st.img ? 'has-img' : ''].join(' ');
    return `<button class="stn ${cls}" data-i="${it.i}" style="left:${it.x}%;top:${it.y}px" aria-label="${esc(st.label() + ' · ' + st.sub())}">
      <span class="dot">${st.img ? `<img src="${st.img}" alt="" loading="lazy">` : `<span class="ic-e">${st.icon}</span>`}${locked ? '<svg class="ic lock"><use href="#i-lock"/></svg>' : ''}<span class="no">${it.i + 1}</span></span>
      <span class="nm">${esc(st.name())}</span>
      <span class="yr">${esc(st.sub())}</span>
      <span class="st">${locked ? '' : [0, 1, 2].map(k => `<i class="${k < n ? 'on' : ''}">★</i>`).join('')}</span>
    </button>`;
  }).join('');
  drawRoad(items, open);
}
function drawRoad(items, open) {
  const svg = $('#road'), w = $('#mapWrap').clientWidth || 320, h = parseFloat($('#mapWrap').style.height);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const pts = items.filter(it => it.dec == null).sort((a, b) => a.i - b.i).map(it => ({ i: it.i, x: it.x / 100 * w, y: it.y + 32 }));
  const path = list => list.map((p, k) => {
    if (!k) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const q = list[k - 1], my = (q.y + p.y) / 2;
    return `C${q.x.toFixed(1)} ${my.toFixed(1)},${p.x.toFixed(1)} ${my.toFixed(1)},${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join('');
  const done = pts.slice(0, open);
  svg.innerHTML = `<defs><linearGradient id="roadG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--road1)"/><stop offset="1" stop-color="var(--road2)"/></linearGradient></defs>
    <path d="${path(pts)}" class="r-base"/><path d="${path(pts)}" class="r-dash"/>
    ${done.length > 1 ? `<path d="${path(done)}" class="r-done"/>` : ''}`;
}
function scrollToStation(i, smooth = false) {
  const el = $(`#map .stn[data-i="${i}"]`); if (!el) return;
  const r = el.getBoundingClientRect();
  window.scrollTo({ top: Math.max(0, scrollY + r.top - innerHeight * .45), behavior: smooth && !reduced() ? 'smooth' : 'auto' });
}

/* ---------- Startseite: Haupt-Tour · Künstler (Auswahl) · eine Künstler-Tour ---------- */
let view = LS.get('view', 'main');   // 'main' | 'artists' | 'a:<Künstler-id>'
const curTour = () => view === 'artists' ? null : tourOf(view);
function setView(v) { view = v; LS.set('view', v); renderHome(); window.scrollTo(0, 0); }
function renderHome() {
  if (view !== 'main' && !DATA) {   // Künstler stehen in data/tour.json – erst laden
    $('#mapWrap').classList.add('hidden'); $('#artistGrid').classList.remove('hidden'); $('#artistGrid').innerHTML = '<div class="loader"></div>';
    loadData().then(renderHome).catch(() => setView('main')); return;
  }
  if (view.startsWith('a:') && !tourOf(view)) view = 'artists';
  $$('#tourTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === (view === 'main' ? 'main' : 'artists')));
  const t = curTour(), artists = view === 'artists';
  $('#mapWrap').classList.toggle('hidden', artists);
  $('#artistGrid').classList.toggle('hidden', !artists);
  $('#backArtists').classList.toggle('hidden', !view.startsWith('a:'));
  if (artists) {
    $('#tourKicker').textContent = tx('Künstler-Touren');
    $('#homeTitle').textContent = tx('Wähle einen Star');
    $('#tourProg').innerHTML = '';
    $('#tourSub').textContent = tx('Jede Tour führt durch eine Karriere – mit Fragen nur zu diesem Star: Welcher Song läuft? Was kam zuerst? Mit wem gesungen?');
    $('#tourSub').classList.remove('hidden');
    $('#nextBtn').parentElement.classList.add('hidden');
    renderArtists();
    return;
  }
  const open = openCount(t), tot = totalStars(t), done = doneCount(t), n = t.stations.length;
  const nextIdx = done >= n ? t.stations.findIndex((_, i) => starOf(t, i) < 3) : open - 1;
  $('#tourKicker').textContent = t.kind === 'artist' ? tx('Künstler-Tour') : tx('Eine Reise durch die Musikgeschichte');
  $('#homeTitle').textContent = t.kind === 'artist' ? t.artist.A : 'On Tour';
  $('#tourProg').innerHTML = `<span>🗺️ ${tx('Station {n} von {m}', { n: Math.min(open, n), m: n })}</span><span>⭐ ${tx('{n} von {m} Sternen', { n: tot, m: n * 3 })}</span>
    <i class="bar"><b style="width:${(tot / (n * 3) * 100).toFixed(1)}%"></b></i>`;
  const st = t.stations[nextIdx];
  $('#nextBtn').dataset.i = nextIdx;
  $('#nextBtn').parentElement.classList.toggle('hidden', nextIdx < 0);
  if (st) $('#nextLbl').textContent = !tot ? tx('Los geht’s: {s}', { s: st.label() }) : done >= n ? tx('Sterne sammeln: {s}', { s: st.label() }) : tx('Weiter: {s}', { s: st.label() });
  $('#tourSub').textContent = t.kind === 'artist' ? tx('Fragen nur zu {a}: Welcher Song? Was kam zuerst? Mit wem gesungen? Über eine Milliarde Streams?', { a: t.artist.A })
    : tx('An jeder Station laufen Songs aus dieser Zeit. Sechs Aufgaben – ab 3 richtigen gibt es einen Stern, und die nächste Station ist offen.');
  $('#tourSub').classList.toggle('hidden', tot > 0);
  renderMap(t);
}
function renderArtists() {
  if (!DATA) { $('#artistGrid').innerHTML = '<div class="loader"></div>'; return; }
  $('#artistGrid').innerHTML = DATA.artists.map(a => {
    const t = tourOf('a:' + a.id), tot = totalStars(t), max = t.stations.length * 3, done = doneCount(t) === t.stations.length;
    const img = a.c ? cover(a, 250) : '';
    return `<button class="artist ${done ? 'done' : ''}" data-a="${a.id}">
      <span class="a-cv">${img ? `<img src="${img}" alt="" loading="lazy">` : '🎤'}${done ? '<span class="a-done">✓</span>' : ''}</span>
      <b>${esc(a.A)}</b><small>${tot ? `⭐ ${tot}/${max}` : tx('{n} Stationen', { n: t.stations.length })}</small>
      <i class="bar"><b style="width:${(tot / max * 100).toFixed(1)}%"></b></i></button>`;
  }).join('');
}

/* ---------- Station antippen ---------- */
const stSheet = $('#sheetStation');
let sheetAt = null;   // [Tour-id, Nr.]
function openStation(tid, i) {
  const t = tourOf(tid), st = t.stations[i], n = starOf(t, i), locked = i >= openCount(t);
  sheetAt = [tid, i];
  $('#stTitle').textContent = tx('Station {n}', { n: i + 1 });
  $('#stHero').innerHTML = `${st.img ? `<img class="st-img" src="${st.img}" alt="">` : `<span class="st-ic">${st.icon}</span>`}<b>${esc(t.kind === 'artist' ? t.artist.A : st.label())}</b><span>${esc(st.sub())}</span>
    <span class="st-stars">${[0, 1, 2].map(k => `<i class="${k < n ? 'on' : ''}">★</i>`).join('')}</span>`;
  $('#stInfo').innerHTML = [
    ['🎧', tx('6 Aufgaben mit Musik'), t.kind === 'artist' ? tx('Welcher Song?, Was kam zuerst?, Mit wem?, Streams und Jahre') : tx('Erkennen, Älter oder neuer, Hit or Miss und Gold-Fragen')],
    ['⭐', tx('Sterne'), tx('1 Stern ab 3 richtigen, 2 ab 5, 3 bei allen 6')],
    ['📅', t.kind === 'artist' ? tx('Songs aus diesen Jahren') : tx('Songs aus der Zeit'), yrs([st.y[0], Math.min(st.y[1], new Date().getFullYear())])],
  ].map(([ic, tt, sub]) => `<div class="cell"><span class="cell-ic ach-ic">${ic}</span><span class="grow">${tt}<span class="sub">${esc(sub)}</span></span></div>`).join('');
  const prev = t.stations[i - 1];
  $('#stFoot').textContent = locked ? tx('Noch zu: Hol erst einen Stern in {s}.', { s: prev.label() }) : n === 3 ? tx('Alle Sterne geholt – du kannst die Station trotzdem jederzeit nochmal spielen.') : n ? tx('Beliebig oft spielbar – es zählt dein bester Wert.') : '';
  $('#stStart').disabled = locked;
  $('#stStartLbl').textContent = locked ? tx('Noch nicht offen') : n ? tx('Nochmal spielen') : tx('Station starten');
  if (!stSheet.open) stSheet.showModal();
}

/* ---------- Töne & Konfetti ---------- */
let actx = null;
function sound(type) {
  if (!opt.sfx || opt.muted) return;
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = type === 'ok' ? [[740, 0], [1110, .06]] : type === 'end' ? [[520, 0], [660, .12], [880, .24]] : [[260, 0], [180, .1]];
    for (const [f, t] of notes) {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + t;
      o.type = type === 'miss' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(type === 'miss' ? .07 : .14, at + .012); g.gain.exponentialRampToValueAtTime(0.0001, at + .16);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + .2);
    }
  } catch {}
}
function confetti(n = 90) {
  if (!opt.sfx || reduced()) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#fbbf24', '#2dd4bf', '#f59e0b', '#ffffff', '#99f6e4'];
  box.innerHTML = Array.from({ length: n }, () => `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${1.8 + Math.random() * 1.6}s;animation-delay:${Math.random() * .4}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 4200);
}

/* ---------- Anzeige ---------- */
function show(id) {
  for (const s of ['home', 'game', 'end']) $('#' + s).classList.toggle('hidden', s !== id);
  $('#btnQuit').classList.toggle('hidden', id !== 'game');
  if (id !== 'home') window.scrollTo(0, 0);
}
let toastT = 0;
function toast(msg, ms = 3500) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms); }
// Rückfrage im Stil des Spiels statt confirm()
function ask(text, okLabel, danger = false) {
  const d = $('#askDlg');
  $('#askText').textContent = text; $('#askOk').textContent = okLabel; $('#askOk').classList.toggle('danger', danger);
  return new Promise(res => {
    const done = v => { d.onclose = null; if (d.open) d.close(); res(v); };
    $('#askOk').onclick = () => done(true); $('#askNo').onclick = () => done(false);
    d.onclick = e => { if (e.target === d) done(false); };
    d.onclose = () => res(false);
    d.showModal(); $('#askOk').focus();
  });
}
// Zurück zur Karte – frisch geholte Sterne und die neue Station kurz hervorheben
function goMap() {
  stopAudio();
  if (G && !G.ended) G.ended = true;
  const idx = G?.idx;
  if (G) view = G.tid;   // zurück zur Karte der Tour, in der gespielt wurde
  G = null;
  show('home');
  renderHome();
  const t = curTour(), target = !t ? 0 : fresh?.opened ? t.stations.findIndex(s => s.sid === fresh.opened) : idx ?? openCount(t) - 1;
  requestAnimationFrame(() => scrollToStation(target));
  setTimeout(() => { fresh = null; $$('#map .stn.fresh,#map .stn.opened').forEach(el => el.classList.remove('fresh', 'opened')); }, 3200);
}

/* ---------- Einstellungen ---------- */
function applyTheme() {
  const th = THEMES.find(x => x[0] === opt.theme) ? opt.theme : 'graphit';
  document.documentElement.dataset.theme = th;
  $('meta[name=theme-color]').content = { graphit: '#0c0c0f', lila: '#0d0a1a', ozean: '#05111a', abend: '#130a0b', wald: '#08110c', oled: '#000000' }[th];
  $('#themeRow').innerHTML = THEMES.map(([id, name, a, b]) => `<button class="theme-pick ${th === id ? 'on' : ''}" data-theme-pick="${id}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${tx(name)}</button>`).join('');
}
function renderSettings() {
  $('#setSfx').checked = !!opt.sfx; $('#setVib').checked = !!opt.vib;
  $('#subHelp').textContent = [opt.sfx ? 'Töne an' : 'Töne aus', opt.vib ? 'Vibration an' : 'Vibration aus'].map(s => tx(s)).join(' · ');
  $('#subDesign').textContent = tx((THEMES.find(x => x[0] === opt.theme) || THEMES[0])[1]);
  $('#langSel').innerHTML = langOptions();
  $('#subStats').textContent = tx('{n} von {m} Sternen', { n: totalStars(tourOf()), m: STATIONS.length * 3 }) + ' · ' + tx('{n} Stationen geschafft', { n: doneCount(tourOf()) });
  if (DATA) $('#streamsInfo').textContent = tx('Spotify-Streams von kworb.net, Stand {d}. Die Zahlen wachsen – darum gibt es nur „über …“-Fragen.', { d: fmtDate(DATA.streamsAt) });
  $('#appVersion').innerHTML = `On Tour · ${tx('Version')} ${APP_VERSION} · ${APP_DATE}<span>${tx('Neuerungen ansehen')} ›</span>`;
  applyTheme(); applyVol();
}
function renderProfile() {
  const p = Profile.get(), s = Sync.status();
  let saved = false; try { saved = JSON.parse(localStorage.getItem('hub.codeSaved')) === s.code; } catch {}
  const unsaved = s.connected && !saved;
  $('#syncTitle').textContent = s.connected ? tx('Dein Code') : tx('Auf anderen Geräten weiterspielen');
  $('#syncSub').textContent = unsaved ? '⚠️ ' + tx('Noch nicht gesichert – in der Jukebox sichern')
    : s.connected ? '✓ ' + tx('Abgeglichen · verwalten in der Jukebox') : tx('Sterne und Profil mit einem Code mitnehmen – ohne E-Mail und Passwort');
  $('#syncIc').style.background = unsaved ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : s.connected ? 'linear-gradient(135deg,#10b981,#0ea5e9)' : 'linear-gradient(135deg,#ff4f86,#fbbf24)';
  $('#profEmoji').textContent = p.emoji;
  if (document.activeElement !== $('#profName')) $('#profName').value = p.name;
}
function goPage(p, back = false) {
  const page = $(`#sheetSettings .page[data-page="${p}"]`) || $('#sheetSettings .page[data-page="main"]');
  $$('#sheetSettings .page').forEach(x => x.classList.toggle('active', x === page));
  page.classList.toggle('back', back);
  $('#navTitle').textContent = page.dataset.title;
  $('#navBack').classList.toggle('invisible', page.dataset.page === 'main');
  $('#sheetSettings .sheet-body').scrollTop = 0;
  if (page.dataset.page === 'changes') renderChanges();
  if (page.dataset.page === 'stats') renderStats();
}
let changesCache = null;
async function renderChanges() {
  const box = $('#changesList');
  if (!changesCache) {
    box.innerHTML = '<div class="cell muted"><span class="loader"></span></div>';
    try {
      const r = await fetch('CHANGELOG.md?v=' + APP_VERSION);
      if (!r.ok) throw new Error();
      changesCache = []; let cur = null;
      for (const line of (await r.text()).split(/\r?\n/)) {
        const hd = line.match(/^##\s+(\S+)(?:\s+[–-]\s+(.+))?$/);
        if (hd) { cur = { ver: hd[1], date: hd[2] || '', items: [] }; changesCache.push(cur); continue; }
        const li = line.match(/^\s*[-*]\s+(.*)$/);
        if (li && cur) cur.items.push(li[1]);
      }
    } catch { box.innerHTML = `<div class="cell muted">${tx('Die Neuerungen konnten nicht geladen werden.')}</div>`; return; }
  }
  const fmt = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  box.innerHTML = changesCache.map(v => `<div class="chg"><div class="chg-h"><b>${esc(v.ver)}</b>${v.ver === APP_VERSION ? `<span class="chg-now">${tx('aktuell')}</span>` : ''}<span class="chg-d">${esc(v.date)}</span></div>
    <ul>${v.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul></div>`).join('');
}

/* ---------- Ereignisse ---------- */
$('#map').onclick = e => { const b = e.target.closest('.stn'); if (b && curTour()) openStation(curTour().id, +b.dataset.i); };
$('#tourTabs').onclick = e => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); };
$('#artistGrid').onclick = e => { const b = e.target.closest('[data-a]'); if (b) { setView('a:' + b.dataset.a); const t = curTour(); if (totalStars(t)) requestAnimationFrame(() => scrollToStation(openCount(t) - 1)); } };
$('#backArtists').onclick = () => setView('artists');
$('#nextBtn').onclick = () => { const i = +$('#nextBtn').dataset.i; if (i >= 0 && curTour()) startStation(curTour().id, i); };
$('#stStart').onclick = () => { const [tid, i] = sheetAt; stSheet.close(); startStation(tid, i); };
stSheet.addEventListener('click', e => { if (e.target === stSheet || e.target.closest('[data-close]')) stSheet.close(); });
$('#qOpts').onclick = e => {
  const pl = e.target.closest('.tile-play');
  if (pl) { e.stopPropagation(); const s = DATA.byId.get(+pl.dataset.play); if (active._id === s.i && !active.paused) stopAudio(); else playSong(s); return; }
  const b = e.target.closest('.opt'); if (b && !b.disabled) answer(b.dataset.v);
};
$('#qBody').onclick = e => { const p = e.target.closest('[data-play]'); if (p && DATA) { const s = DATA.byId.get(+p.dataset.play); if (active._id === s.i && !active.paused && G?.answered) stopAudio(); else playSong(s); } };
$('#qNext').onclick = nextQ;
$('#goNextBtn').onclick = () => { const i = G.idx + 1, t = G.tid; G = null; startStation(t, i); };
$('#againBtn').onclick = () => { const i = G.idx, t = G.tid; G = null; startStation(t, i); };
$('#mapBtn').onclick = goMap;
$('#endList').onclick = e => {
  const r = e.target.closest('[data-play]'); if (!r || !DATA) return;
  const s = DATA.byId.get(+r.dataset.play);
  if (active._id === s.i && !active.paused) stopAudio(); else playSong(s);
};
async function leave() {
  if (G && !G.ended && !$('#game').classList.contains('hidden') && G.log.length) {
    if (!(await ask(tx('Station verlassen? Diese Runde wird nicht gewertet.'), tx('Verlassen'), true))) return;
  }
  goMap();
}
$('#btnQuit').onclick = leave;
$('#logoBtn').onclick = leave;

const sheet = $('#sheetSettings');
$('#btnSettings').onclick = () => { renderSettings(); renderProfile(); goPage('main'); sheet.showModal(); };
sheet.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) goPage(g.dataset.go); });
sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('[data-close]')) sheet.close(); });
sheet.addEventListener('close', () => { if (!$('#home').classList.contains('hidden')) renderHome(); });
$('#navBack').onclick = () => goPage('main', true);
$('#profEmoji').onclick = () => Profile.pick(e => { $('#profEmoji').textContent = e; });
$('#profName').oninput = () => Profile.set({ name: $('#profName').value });
$('#profName').onkeydown = e => { if (e.key === 'Enter') $('#profName').blur(); };
$('#setSfx').onchange = e => { opt.sfx = e.target.checked; LS.set('sfx', opt.sfx); renderSettings(); sound('ok'); };
$('#setVib').onchange = e => { opt.vib = e.target.checked; LS.set('vib', opt.vib); renderSettings(); if (opt.vib && navigator.vibrate) navigator.vibrate(60); };
$('#vol').oninput = e => { opt.vol = +e.target.value; opt.muted = false; LS.set('vol', opt.vol); applyVol(); };
$('#volMute').onclick = () => { opt.muted = !opt.muted; applyVol(); };
$('#themeRow').onclick = e => { const b = e.target.closest('[data-theme-pick]'); if (!b) return; opt.theme = b.dataset.themePick; sharedTheme.set(opt.theme); renderSettings(); };
$('#langSel').onchange = e => setLang(e.target.value);
$('#btnResetAll').onclick = async () => {
  if (!(await ask(tx('Alles löschen, was On Tour auf diesem Gerät gespeichert hat – auch alle Sterne?'), tx('Löschen'), true))) return;
  try { Object.keys(localStorage).filter(k => k.startsWith('ot.')).forEach(k => localStorage.removeItem(k)); } catch {}
  Sync.leave(); // vom persönlichen Code trennen, sonst käme beim nächsten Abgleich alles zurück
  location.reload();
};
self.liveLang = () => {
  if (!$('#home').classList.contains('hidden')) renderHome();
  if (sheet.open) { renderSettings(); goPage($('#sheetSettings .page.active')?.dataset.page || 'main'); }
  if (stSheet.open && sheetAt) openStation(...sheetAt);
  if (G && !$('#game').classList.contains('hidden')) {
    const was = G.answered, log = G.log[G.n];
    if (!was) renderQ();
    else { const [k, t] = kindText(curQ()); $('#qKind').textContent = k + ' · ' + tx('Aufgabe {n} von {m}', { n: G.n + 1, m: G.qs.length }); $('#qTitle').textContent = t; $('#qNextLbl').textContent = G.n >= G.qs.length - 1 ? tx('Zum Ergebnis') : tx('Weiter'); void log; }
    $('#gStation').textContent = `${G.st.icon} ${G.st.label()}`;
  }
  if (G && !$('#end').classList.contains('hidden')) renderEndList();
};
document.addEventListener('keydown', e => {
  if ($('#game').classList.contains('hidden') || sheet.open || stSheet.open || $('#askDlg').open || e.target.matches?.('input,select,textarea')) return;
  const q = curQ(); if (!q) return;
  if (e.key === 'm' || e.key === 'M') { opt.muted = !opt.muted; applyVol(); return; }
  if (G.answered) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); nextQ(); } return; }
  const btns = $$('#qOpts .opt');
  if (q.k === 'claim' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); return answer(e.key === 'ArrowRight' ? '1' : '0'); }
  const n = +e.key;
  if (n >= 1 && n <= btns.length) { e.preventDefault(); answer(btns[n - 1].dataset.v); }
});
addEventListener('resize', () => { if (!$('#home').classList.contains('hidden') && curTour()) renderMap(curTour()); fitClaim(); });

/* ---------- Start ---------- */
applyTheme(); applyVol(); renderHome();
{ const t = curTour(); if (t && totalStars(t)) requestAnimationFrame(() => scrollToStation(Math.max(0, openCount(t) - 1))); }   // Neulinge sehen zuerst die Erklärung
loadData().catch(() => {});
addEventListener('jukebox-sync', () => { if (!G) renderHome(); if (sheet.open) renderSettings(); });

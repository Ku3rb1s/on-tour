#!/usr/bin/env node
/* Datenpaket für On Tour bauen: node scripts/build-data.js
   Liest das Paket von Hit or Miss (../Hit-or-Miss/data/tracks.json: geprüfte Jahre, Streams, Gäste, verwandte Interpreten)
   und Gold Record (deutsche Songs, Bekanntheit, geprüfte Jahre aus data/years.json, Gäste aus data/feat.json).
   Daraus werden für jede Station (js/stations.js) die Songs EINMAL fest ausgewählt und 12 Aufgaben gebaut – im Spiel
   kommen davon 6 dran (je Art mindestens eine, Reihenfolge gemischt). So bleibt eine Station beim Wiederholen gleich.
   Alle Behauptungen laufen durch die Gegenprüfung von Hit or Miss (HM.verify in ../Hit-or-Miss/js/claims.js).

   Ergebnis: data/tour.json, Prüfbericht scripts/.cache/report.txt (vor dem Hochladen überfliegen).
   Danach DATA_V in js/game.js erhöhen (macht scripts/update-songs.js der Jukebox von selbst).

   tour.json:
     songs: [[Deezer-ID, Titel, Interpret, Jahr, Cover, Ersatz-Cover|0, Streams in Mio.|0, Interpretenfeld (mit Gästen)|0], …]
     tours: { main: { <Station-id>: [Aufgabe, …] }, … }
     Aufgabe (s, o, a, b = Nummern in songs):
       { k: 'rec',   s, o: [3 falsche Songs] }                 Welcher Song läuft? (4 Titel)
       { k: 'old',   a, b }                                    Welcher ist älter? (der mit dem kleineren Jahr)
       { k: 'claim', s, c: { k: artist|title|streams|older, ok, A|T|n|cmp+o } }   Stimmt’s? (wie Hit or Miss)
       { k: 'who',   s, o: [3 falsche Interpreten] }           Wer singt das? (4 Namen)
       { k: 'year',  s, o: [3 falsche Jahre] }                 Aus welchem Jahr? (4 Jahre)
       { k: 'feat',  s, o: [3 falsche Namen], A: richtiger }   Mit wem singt …? (nur Künstler-Touren) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DOCS = path.join(ROOT, '..');
const HM = require(path.join(DOCS, 'Hit-or-Miss', 'js', 'claims.js'));
const STATIONS = require('../js/stations.js');
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const GR = p => readJson(path.join(DOCS, 'Gold-Record', 'data', p), null);

/* ---------- 1. Songs zusammenführen ---------- */
const HOM = readJson(path.join(DOCS, 'Hit-or-Miss', 'data', 'tracks.json'), null);
if (!HOM) { console.error('FEHLER: ../Hit-or-Miss/data/tracks.json fehlt'); process.exit(1); }
const years = GR('years.json') || {}, feat = GR('feat.json') || {}, covers = GR('covers.json')?.covers || {};
const grAll = [...GR('songs.json').songs, ...GR('extra.json').songs, ...GR('more.json').songs.map(s => ({ ...s, pl: 1 }))];
for (const s of grAll) { if (years[s.id]) { s.y = years[s.id]; delete s.ya; } if (covers[s.id]) { s.c0 = s.c; s.c = covers[s.id]; } }
const grById = new Map(grAll.map(s => [s.id, s]));
const deIds = new Set(grAll.filter(s => s.de).map(s => s.id));
const songKey = (t, a) => HM.key(String(a).split(/\s*(?:feat\.?|ft\.?|featuring|with|&|,| x )\s*/i)[0]) + '|' + HM.titleKey(t);
const FAKE = /cover band|hello i'?m |karaoke|tribute|made famous|in the style of|various artists|verschiedene interpreten|original cast/i;

const artists = [...HOM.artists];
const mergeKey = a => String(a).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]+/gu, '');
const aIdx = new Map(artists.map((a, i) => [mergeKey(a), i]));
const tracks = HOM.tracks.map(t => ({ ...t }));
const seen = new Set(tracks.map(t => songKey(t.t, artists[t.a])));
let addedDe = 0;
// Deutsche Songs aus den Playlists von Gold Record (Hit or Miss lässt sie weg) – für Berlin, Hamburg …
for (const s of grAll) {
  if (!s.de || FAKE.test(s.a) || FAKE.test(s.t)) continue;
  const k = songKey(s.t, s.a);
  if (seen.has(k)) continue;
  seen.add(k);
  const disp = HM.mainArtist(s.a), mk = mergeKey(disp);
  if (!aIdx.has(mk)) { aIdx.set(mk, artists.length); artists.push(disp); }
  const r = { i: s.id, t: s.t, a: aIdx.get(mk), y: s.y, q: s.ya ? 0 : 1, c: s.c };
  if (s.a !== disp) r.a0 = s.a;
  if (s.c0) r.c0 = s.c0;
  if (feat[s.id]?.length) r.p = feat[s.id];
  if (s.g) r.g = s.g;
  tracks.push(r); addedDe++;
}
// Bekanntheit neu über alle Songs: Deezer-Rang aus Gold Record, 0 = größter Hit … 999
const rank = t => grById.get(t.i)?.r || 0;
[...tracks].sort((a, b) => rank(b) - rank(a) || a.i - b.i).forEach((t, i, arr) => { t.f = Math.floor(i / arr.length * 1000); });
const data = { built: HOM.built, streamsAt: HOM.streamsAt, artists, rel: HOM.rel, tracks };
const D = HM.prepare(data, new Date(HOM.built));
// „de“ heißt bei Gold Record: aus deutschen Playlists – da sind auch Usher und France Gall dabei. Deutsch singt, wer nur dort
// vorkommt (deutsche Interpreten) – für die deutschen Stationen zählt zusätzlich ein deutsch aussehender Titel oder die boost-Liste.
const isDe = s => deIds.has(s.i);
for (const e of D.byArtist.values()) e.de = e.songs.every(isDe);
const deArtist = s => D.byArtist.get(s.ai).de;
const GERMAN = /[äöüß]|\b(der|die|das|und|ich|du|nicht|ein|eine|mit|wir|ist|im|auf|für|mein|dein|zu|von|wie|was|wenn|nur|alles|kein|nie|noch|mal|doch|sie|er|es|uns|dich|mich|dir|mir|hier|heute|immer|wieder|liebe|herz|nacht|tag|zeit|leben|welt|junge|sonne|bist|bin|sind|haben|geht|komm|kann|will|keine|ohne|bis|seit|aus|vom|zum|zur|am|wo|warum|tanz|lied|stadt|land|haus|see|meer|himmel|stern|sterne|engel|feuer|wasser|luft|frei|allein|zusammen|gut|neu|alt|jung|klein)\b/i;
const FRENCH = /\b(la|le|les|du|des|et|est|une|pour|que|qui|toi|moi|je|tu|il|elle|ça|ce|mon|ma)\b|l'a\b|j'ai/i;
const germanTitle = s => GERMAN.test(s.T) && !FRENCH.test(s.T);
const XMAS = /christmas|wonderful time|xmas|weihnacht|navidad|\bjul\b|\bsnow\b|santa|jingle|winter wonderland|feliz/i;

/* ---------- 2. Hilfen ---------- */
const lerp = (a, b, k) => a + (b - a) * k;
const pick = (a, R) => a[Math.floor(R() * a.length)];
const shuffle = (a, R) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Jahr sicher genug für Jahres-Fragen: geprüft, keine Cover-Version, keine Neuaufnahme (wie Hit or Miss)
const yearOk = s => s.q >= 1 && !s.multi && !s.reissue;
const years2 = s => [s.y, ...(s.y2 ? [s.y2] : [])];
const kin = (x, s) => { const g = D.relOf.get(HM.key(x)); return !!g && (g.has(s.ak) || s.parts.some(p => g.has(HM.key(p)))); };
// Darf Interpret e bei Song s als falsche Antwort kommen? (nicht beteiligt, nicht verwandt, keine eigene Fassung)
const okFalseArtist = (A, s) => HM.key(A) !== s.ak && !HM.related(A, s.parts) && !HM.related(A, s.v) && !kin(A, s) && !D.titleArt.get(s.tk)?.has(HM.key(A));

/** n falsche Interpreten für Song s: aus derselben Zeit, ähnlich bekannt, deutsch zu deutsch */
function falseArtists(s, n, h, R, st = null) {
  const win = Math.round(lerp(10, 4, h)), fame = Math.max(lerp(250, 700, h), s.f + 120), de = deArtist(s);
  let c = st?.de || st?.only ? [...new Set(D.tracks.filter(o => inStation(st, o, 6)).map(o => D.byArtist.get(o.ai)))].filter(e => e.ak !== s.ak)   // deutsche Station: nur deutsche Interpreten
    : [...D.byArtist.values()].filter(e => e.ak !== s.ak && e.de === de && e.best <= fame && e.songs.some(o => o.q >= 1 && Math.abs(o.y - s.y) <= win));
  if (h > .35 && s.g) { const sg = c.filter(e => e.g.has(s.g)); if (sg.length >= 8) c = sg; }
  const out = [];
  for (const e of shuffle(c, R)) {
    if (out.length >= n) break;
    if (!okFalseArtist(e.A, s) || out.some(x => HM.related(x, [e.A]))) continue;
    out.push(e.A);
  }
  return out.length === n ? out : null;
}
/** n falsche Titel (als Songs) für Song s – aus derselben Zeit; schwer: auch andere Songs desselben Interpreten */
function falseTitles(s, n, h, R, st = null) {
  const de = deArtist(s), ws = HM.words(s.T);
  const fine = o => o !== s && o.q >= 1 && o.T && o.T.length <= 40 && !XMAS.test(o.t) && o.tk !== s.tk && (st?.de || st?.only ? inStation(st, o, 4) : deArtist(o) === de) && !HM.words(o.T).includes(ws) && !ws.includes(HM.words(o.T))
    && !D.titleArt.get(o.tk).has(s.ak) && HM.key(o.T) !== HM.key(s.T);
  const out = [];
  const add = list => { for (const o of shuffle(list, R)) { if (out.length >= n) break; if (fine(o) && !out.some(x => x.tk === o.tk || HM.words(x.T).includes(HM.words(o.T)) || HM.words(o.T).includes(HM.words(x.T)))) out.push(o); } };
  if (h > .45) add(D.byArtist.get(s.ai).songs.filter(o => o !== s).slice(0, 1));
  const win = Math.round(lerp(5, 3, h));
  if (st?.de || st?.only) add(D.tracks.filter(o => o.ak !== s.ak && inStation(st, o, 4)));   // deutsche Station: deutsche Titel
  add(D.tracks.filter(o => o.ak !== s.ak && Math.abs(o.y - s.y) <= win && o.f <= Math.max(lerp(350, 800, h), s.f + 100)));
  if (out.length < n) add(D.tracks.filter(o => o.ak !== s.ak && Math.abs(o.y - s.y) <= 8));
  return out.length === n ? out : null;
}
/** 3 falsche Jahre (nah am echten, nicht in der Zukunft) */
function falseYears(s, R) {
  if (!yearOk(s) || (s.y2 && s.y2 !== s.y)) return null;
  const offs = shuffle([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5], R).filter(d => s.y + d <= D.builtYear && s.y + d >= 1950);
  const pickd = [];
  for (const d of offs) { if (pickd.length >= 3) break; if (!pickd.some(x => Math.abs(x - d) < 2)) pickd.push(d); }   // mindestens 2 Jahre auseinander
  return pickd.length === 3 ? pickd.map(d => s.y + d) : null;
}
/** Sind a und b sicher genug auseinander für „älter oder neuer“? (alle Quellen-Jahre ≥ gap auseinander, gleiche Reihenfolge) */
function orderOk(a, b, gap = 3) {
  if (!yearOk(a) || !yearOk(b) || a.ak === b.ak && a.tk === b.tk) return false;
  const A = years2(a), B = years2(b), older = a.y < b.y;
  return A.every(x => B.every(y => Math.abs(x - y) >= gap && (x < y) === older));
}
/** Behauptung wie in Hit or Miss – geprüft mit HM.verify */
function makeClaim(s, want, h, R, kinds, st) {
  for (const k of shuffle(kinds, R)) {
    let c = null;
    if (k === 'artist') {
      if (want) c = { k, A: s.A, ok: true, hide: 'a' };
      else { const f = falseArtists(s, 1, h, R, st); if (f) c = { k, A: f[0], ok: false, hide: 'a' }; }
    } else if (k === 'title') {
      if (!s.T || s.T.length > 40) continue;
      if (want) c = { k, T: s.T, ok: true, hide: 't' };
      else { const f = falseTitles(s, 1, h, R, st); if (f) c = { k, T: f[0].T, ok: false, hide: 't' }; }
    } else if (k === 'streams') c = HM.GEN.streams(s, want, h, R);
    else if (k === 'older') c = HM.GEN.older(s, want, Math.max(h, .65), R);   // nicht 40 Jahre auseinander – sonst zu leicht
    if (!c) continue;
    c.s = s; c.hide ??= null;
    if (k === 'older' && (deArtist(c.o) || XMAS.test(c.o.t))) continue;
    if (HM.verify(c)) return c;
  }
  return null;
}

/* ---------- 3. Songs je Station auswählen ---------- */
const songsOut = [], songIdx = new Map();
const ref = s => { if (!songIdx.has(s.i)) { songIdx.set(s.i, songsOut.length); songsOut.push(s); } return songIdx.get(s.i); };
const boostKeys = st => new Set((st.boost || []).map(HM.key));
const L = [];   // Bericht

/** Passt Song s zur Station? Jahr geprüft und im Zeitraum, deutsch/nicht deutsch, bei only: nur boost-Interpreten */
function inStation(st, s, pad = 0) {
  if (s.q < 1 || !s.T || XMAS.test(s.t) || s.y < st.y[0] - pad || s.y > st.y[1] + pad) return false;
  const bk = boostKeys(st), boosted = bk.has(s.ak) || s.parts.some(p => bk.has(HM.key(p)));
  if (st.only && !bk.has(s.ak)) return false;   // K-Pop: nur Songs der Stars selbst (nicht Remixe mit Gast)
  if (st.de) return isDe(s) && (boosted || (germanTitle(s) && deArtist(s)));
  return !deArtist(s);
}
/** Kandidaten einer Station, beste zuerst. opt.used = schon vergebene Songs, opt.band = [von, bis] Bekanntheit */
function candidates(st, opt) {
  const bk = boostKeys(st), [f0, f1] = opt.band;
  return D.tracks.filter(s => inStation(st, s) && !opt.used.has(s.i) && s.f >= f0 && s.f <= f1)
    .map(s => ({ s, score: s.f - (bk.has(s.ak) || s.parts.some(p => bk.has(HM.key(p))) ? 300 : 0) + (st.g.length && !st.g.includes(s.g) ? 220 : 0) }))
    .sort((a, b) => a.score - b.score || a.s.i - b.s.i).map(x => x.s);
}

const byFame = [...D.tracks].sort((a, b) => a.f - b.f || a.i - b.i);
const TYPES = ['rec', 'rec', 'rec', 'old', 'old', 'old', 'claim', 'claim', 'claim', 'who', 'who', 'year'];
/** 12 Aufgaben für eine Station */
function buildStation(st, opt) {
  const R = HM.seeded(opt.seed + st.id), h = opt.h;
  const cand = candidates(st, opt);
  const perArtist = new Map(), core = [];
  for (const s of cand) {
    if (core.length >= 30) break;
    const n = perArtist.get(s.ak) || 0, tot = opt.artistUse.get(s.ak) || 0;
    if (n >= (cand.length < 40 ? 3 : 2) || tot >= opt.maxArtist + (cand.length < 40 ? 1 : 0)) continue;
    perArtist.set(s.ak, n + 1); core.push(s);
  }
  const prim = new Set(), qs = [], claimWants = shuffle([true, false, R() < .5], R);
  const free = () => core.filter(s => !prim.has(s.i));
  for (const type of TYPES) {
    let q = null;
    for (const s of free().slice(0, 18)) {
      if (type === 'rec') { const o = falseTitles(s, 3, h, R, st); if (o) q = { k: 'rec', s, o }; }
      else if (type === 'old') {
        const b = free().find(o => o !== s && o.ak !== s.ak && orderOk(s, o))
          || byFame.find(o => o !== s && o.ak !== s.ak && !opt.used.has(o.i) && !prim.has(o.i) && inStation(st, o, 2) && o.f <= opt.band[1] && orderOk(s, o));
        if (b) q = { k: 'old', a: s, b };
      } else if (type === 'claim') { const c = makeClaim(s, claimWants[qs.filter(x => x.k === 'claim').length], h, R, ['artist', 'artist', 'title', 'streams', 'older'], st); if (c) q = { k: 'claim', s, c }; }
      else if (type === 'who') { const o = falseArtists(s, 3, h, R, st); if (o) q = { k: 'who', s, o }; }
      else if (type === 'year') { const o = falseYears(s, R); if (o) q = { k: 'year', s, o }; }
      if (q) break;
    }
    if (!q && type === 'year') for (const s of free().slice(0, 18)) { const o = falseArtists(s, 3, h, R, st); if (o) { q = { k: 'who', s, o }; break; } }
    if (!q) { L.push(`  ⚠️ ${st.id}: keine Aufgabe „${type}“ gefunden`); continue; }
    for (const s of [q.s, q.a, q.b].filter(Boolean)) prim.add(s.i);
    qs.push(q);
  }
  for (const i of prim) { opt.used.add(i); const s = D.byId.get(i); opt.artistUse.set(s.ak, (opt.artistUse.get(s.ak) || 0) + 1); }
  return qs;
}

/* ---------- 4. Ausgabe ---------- */
function encode(q) {
  switch (q.k) {
    case 'rec': return { k: 'rec', s: ref(q.s), o: q.o.map(ref) };
    case 'old': return { k: 'old', a: ref(q.a), b: ref(q.b) };
    case 'who': case 'feat': return { k: q.k, s: ref(q.s), o: q.o, ...(q.A ? { A: q.A } : {}) };
    case 'year': return { k: 'year', s: ref(q.s), o: q.o };
    case 'claim': {
      const c = q.c, o = { k: c.k, ok: c.ok };
      if (c.k === 'artist') o.A = c.A; if (c.k === 'title') o.T = c.T; if (c.k === 'streams') o.n = c.n;
      if (c.k === 'older') { o.cmp = c.cmp; o.o = ref(c.o); }
      return { k: 'claim', s: ref(q.s), c: o };
    }
  }
}
const fmtQ = q => {
  const t = s => `»${s.T}« (${s.A}, ${s.y})`;
  switch (q.k) {
    case 'rec': return `ERKENNEN  ${t(q.s)}  ✗ ${q.o.map(o => o.T).join(' · ')}`;
    case 'old': return `ÄLTER     ${t(q.a)} vs ${t(q.b)}`;
    case 'who': return `WER       ${t(q.s)}  ✗ ${q.o.join(' · ')}`;
    case 'feat': return `MIT WEM   ${t(q.s)}  ✓ ${q.A}  ✗ ${q.o.join(' · ')}`;
    case 'year': return `JAHR      ${t(q.s)}  ✗ ${q.o.join(' · ')}`;
    case 'claim': { const c = q.c; return `${c.ok ? 'STIMMT    ' : 'STIMMT NI.'} ${t(q.s)}: ` + ({ artist: `ist von ${c.A}`, title: `heißt »${c.T}«`, streams: `über ${(c.n / 1000)} Mrd. Streams [${(q.s.n / 1000).toFixed(2)}]`, older: `ist ${c.cmp === 'older' ? 'älter' : 'neuer'} als ${c.o && t(c.o)}` }[c.k]); }
  }
};

/* Stationen bleiben, wie sie sind: Was schon in data/tour.json steht, wird übernommen, solange alle Songs noch da sind und
   die Behauptungen die Gegenprüfung bestehen (Streams wachsen …). Neu gebaut wird nur, was fehlt oder kaputt ist.
   Alles neu: node scripts/build-data.js --neu */
const OUT = path.join(ROOT, 'data', 'tour.json');
const old = readJson(OUT, null), NEU = process.argv.includes('--neu');
function keepStation(name, st) {
  const pool = !NEU && old?.tours?.[name]?.[st.id];
  if (!pool?.length) return null;
  const S = i => D.byId.get(old.songs[i]?.[0]);
  try {
    return pool.map(e => {
      let q;
      if (e.k === 'rec') q = { k: 'rec', s: S(e.s), o: e.o.map(S) };
      else if (e.k === 'old') q = { k: 'old', a: S(e.a), b: S(e.b) };
      else if (e.k === 'who' || e.k === 'year' || e.k === 'feat') q = { ...e, s: S(e.s) };
      else if (e.k === 'claim') q = { k: 'claim', s: S(e.s), c: { ...e.c, ...(e.c.o != null ? { o: S(e.c.o) } : {}) } };
      const songs = [q.s, q.a, q.b, ...(q.k === 'rec' ? q.o : []), q.c?.o].filter(x => x !== undefined);
      if (songs.some(x => !x)) throw new Error('Song fehlt');
      if (q.k === 'old' && !orderOk(q.a, q.b)) throw new Error('Jahre');
      if (q.k === 'year' && !falseYears(q.s, Math.random)) throw new Error('Jahr');
      if (q.k === 'claim') { const c = { ...q.c, s: q.s, hide: null }; if (!HM.verify(c)) throw new Error('Behauptung'); q.c = c; }
      return q;
    });
  } catch (e) { L.push(`  ↻ ${name}/${st.id}: neu gebaut (${e.message})`); return null; }
}
const tours = {};
function buildTour(name, opt) {
  tours[name] = {};
  L.push(`════ Tour „${name}“ ════`);
  // erst alle Stationen übernehmen, die bleiben können (ihre Songs sind dann vergeben), dann die übrigen neu bauen
  const kept = STATIONS.map(st => keepStation(name, st));
  kept.forEach(qs => qs?.forEach(q => [q.s, q.a, q.b].filter(Boolean).forEach(s => { if (!opt.used.has(s.i)) { opt.used.add(s.i); opt.artistUse.set(s.ak, (opt.artistUse.get(s.ak) || 0) + 1); } })));
  STATIONS.forEach((st, i) => {
    const qs = kept[i] || buildStation(st, { ...opt, h: lerp(opt.h0, opt.h1, i / (STATIONS.length - 1)) });
    tours[name][st.id] = qs.map(encode);
    const kinds = qs.reduce((m, q) => (m[q.k] = (m[q.k] || 0) + 1, m), {});
    L.push(`--- ${i + 1}. ${st.city} ${st.year} · ${st.theme}: ${qs.length} Aufgaben ${JSON.stringify(kinds)}${kept[i] ? ' (unverändert)' : ''}`, ...qs.map(q => '  ' + fmtQ(q)), '');
  });
}

/* ---------- 5. Künstler-Touren ----------
   Man wählt einen Star, die Tour führt in 3–5 Stationen durch seine Karriere (Songs nach Jahr geordnet).
   Fragen nur zu ihm: Welcher Song? (4 eigene Titel), Was kam zuerst?, Mit wem singt er/sie hier?, Streams, Aus welchem Jahr?
   Hat ein Star wenige Songs im Pool, ergänzt die Deezer-Top-Liste (Zwischenspeicher scripts/.cache/deezer-artists.json).
   Diese Songs haben kein geprüftes Jahr – sie kommen nur bei „Welcher Song?“ und „Mit wem?“ vor, nie bei Jahres-Fragen.
   Ohne Netz: node scripts/build-data.js --offline (nimmt nur den Zwischenspeicher). */
const STARS = ['The Beatles', 'Queen', 'ABBA', 'Michael Jackson', 'Eminem', 'Linkin Park', 'Coldplay', 'Beyoncé', 'Rihanna', 'Shakira',
  'Lady Gaga', 'David Guetta', 'Avicii', 'Bruno Mars', 'Ed Sheeran', 'Taylor Swift', 'The Weeknd', 'Drake', 'Billie Eilish', 'Bad Bunny'];
const WANT_SONGS = 24, OFFLINE = process.argv.includes('--offline');
const slug = a => String(a).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DZ_CACHE = path.join(__dirname, '.cache', 'deezer-artists.json');
const dzCache = readJson(DZ_CACHE, {});
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function dz(p) {
  if (dzCache[p]) return dzCache[p];
  if (OFFLINE) return null;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch('https://api.deezer.com' + p); const j = await r.json();
      if (j.error) { if (j.error.code === 4) { await sleep(2000); continue; } return null; }
      await sleep(120);
      return (dzCache[p] = j);
    } catch { await sleep(1000); }
  }
  return null;
}
/** Songs eines Stars: eigene und mit Gast-Auftritt (aus dem Pool), dazu Deezer-Top-Songs, bis WANT_SONGS erreicht sind.
    Deezer-Songs bekommen ein Jahr nur aus einem Original-Album/-Single (kein Remaster, keine Best-of) – sonst y = 0:
    dann kommen sie nur als falsche Antwort bei „Welcher Song?“ vor. */
const NOT_ORIGINAL = /remaster|best of|greatest|hits|collection|anniversary|essential|anthology|gold|live|deluxe|edition|years|platinum/i;
const EXTRA_PART = /live|remix|acoustic|instrumental|karaoke|demo|version|edit\b|sped up|slowed|mix\)/i;
async function songsOfStar(name) {
  const k = HM.key(name);
  const list = D.tracks.filter(s => s.T && !XMAS.test(s.t) && (s.ak === k || s.parts.some(p => HM.key(p) === k)));
  const firstYear = Math.min(...list.filter(s => s.q >= 1).map(s => s.y));
  if (list.length < WANT_SONGS) {
    // gleichnamige Interpreten (es gibt mehrere „Queen“): der mit den meisten Fans
    const found = ((await dz('/search/artist?q=' + encodeURIComponent(name) + '&limit=10'))?.data || []).filter(a => HM.key(a.name) === k).sort((a, b) => b.nb_fan - a.nb_fan)[0];
    const top = found ? (await dz(`/artist/${found.id}/top?limit=80`))?.data || [] : [];
    for (const t of top) {
      if (list.length >= WANT_SONGS) break;
      const extra = String(t.title).replace(/^[^([\-–—]*/, '');
      const T = HM.cleanTitle(t.title), tk = HM.titleKey(t.title);
      if (!T || T.length > 40 || XMAS.test(t.title) || EXTRA_PART.test(extra) || t.artist.id !== found.id) continue;   // nur Songs, bei denen der Star Hauptinterpret ist
      if (list.some(s => s.tk === tk || HM.words(s.T).includes(HM.words(T)) || HM.words(T).includes(HM.words(s.T)))) continue;
      const alb = await dz('/album/' + t.album.id);
      let y = +String(alb?.release_date || '').slice(0, 4) || 0;
      // ältere Stars: Deezer hat fast nur Neuausgaben (Jahr der Neuausgabe) – darum dort kein Jahr
      if (!alb || !['album', 'single', 'ep'].includes(alb.record_type) || NOT_ORIGINAL.test(alb.title) || y < firstYear - 1 || firstYear < 1995) y = 0;
      const contrib = (t.contributors || []).map(c => c.name);
      list.push({ i: t.id, t: t.title, T, A: t.artist.name, a0: t.artist.name, ak: HM.key(t.artist.name), tk, y, ylo: y, yhi: y, q: 0, dz: true, n: 0,
        c: t.album.md5_image || '', parts: [t.artist.name, ...contrib], v: [], multi: false, reissue: false, f: 500 });
    }
  }
  return list;
}
/** Gäste eines Songs aus Sicht des Stars k (der Hauptinterpret zählt mit, wenn der Star selbst nur Gast ist) */
function guestsOf(s, k) {
  const names = [s.A, ...(s.p || []), ...(s.dz ? s.parts : [])];
  for (const m of String(s.t).matchAll(/[([]\s*(?:feat\.?|ft\.?|featuring|with)\s+([^)\]]+)[)\]]/gi)) names.push(...m[1].split(/\s*(?:,|&| and | x )\s*/i));
  const out = [];
  for (const n of names.map(x => String(x).trim()).filter(Boolean)) {
    const nk = HM.key(n);
    if (nk === k || HM.related(n, [STAR_NAME.get(k)]) || out.some(o => HM.key(o) === nk)) continue;
    out.push(n);
  }
  return out;
}
const STAR_NAME = new Map(STARS.map(n => [HM.key(n), n]));
const notSameTitle = (x, s) => x !== s && x.tk !== s.tk && !HM.words(x.T).includes(HM.words(s.T)) && !HM.words(s.T).includes(HM.words(x.T));
const uniqBy = (arr, f) => arr.filter((x, i) => arr.findIndex(y => f(y) === f(x)) === i);

async function buildArtist(name) {
  const k = HM.key(name), R = HM.seeded('ontour-artist-' + k);
  const all = await songsOfStar(name);
  // Karriere nach Jahr in 3–5 gleich große Abschnitte – nur Songs mit sicherem Jahr (geprüft oder Original-Album bei Deezer)
  const dated = all.filter(s => s.q >= 1 || (s.dz && s.y)).sort((a, b) => a.y - b.y || a.f - b.f);
  const nSt = Math.max(3, Math.min(5, Math.round(dated.length / 7)));
  const chunks = Array.from({ length: nSt }, (_, i) => dated.slice(Math.round(i * dated.length / nSt), Math.round((i + 1) * dated.length / nSt)));
  const allGuests = uniqBy(all.flatMap(s => guestsOf(s, k)), HM.key);   // falsche Gäste: andere Gäste des Stars …
  const stations = chunks.map((chunk, ci) => {
    const h = .3 + .4 * ci / Math.max(1, nSt - 1);
    // alle möglichen Aufgaben je Song
    const make = {
      rec: s => { const o = uniqBy(shuffle(all.filter(x => notSameTitle(x, s)), R), x => x.tk).slice(0, 3); return o.length === 3 ? { k: 'rec', s, o } : null; },
      old: s => { if (s.dz || !yearOk(s)) return null; const b = shuffle(all.filter(x => !x.dz && x !== s && orderOk(s, x, 2)), R)[0]; return b ? { k: 'old', a: s, b } : null; },
      feat: s => {
        const g = guestsOf(s, k); if (!g.length) return null;
        const pool = shuffle([...allGuests, ...(s.dz ? [] : falseArtists(s, 3, .6, R) || [])], R)   // … und bekannte Interpreten aus der Zeit
          .filter(x => HM.key(x) !== k && !g.some(y => HM.key(y) === HM.key(x)) && !HM.related(x, g) && !HM.related(x, s.parts) && okFalseArtist(x, s));
        const o = uniqBy(pool, HM.key).slice(0, 3);
        return o.length === 3 ? { k: 'feat', s, A: g[0], o } : null;
      },
      claim: s => { if (s.dz || !s.n) return null; const c = HM.GEN.streams(s, R() < .55, h, R); if (!c) return null; c.s = s; c.hide = null; return HM.verify(c) ? { k: 'claim', s, c } : null; },
      year: s => { if (s.dz) return null; const o = falseYears(s, R); return o ? { k: 'year', s, o } : null; },
    };
    const CAP = { rec: 3, old: 2, feat: 2, claim: 2, year: 2 }, qs = [], prim = new Set(), count = {};
    // erst jeder Song höchstens einmal, dann darf ein Song eine zweite (andere) Aufgabe tragen, bis 8–10 Aufgaben da sind
    for (const pass of [0, 1]) for (const kind of ['rec', 'old', 'feat', 'claim', 'year']) for (const s of shuffle(chunk, R)) {
      if (qs.length >= 10 || (count[kind] || 0) >= CAP[kind] || (pass === 1 && qs.length >= 8)) break;
      if (pass === 0 ? prim.has(s.i) : qs.some(q => q.k === kind && (q.s || q.a) === s)) continue;
      const q = make[kind](s); if (!q) continue;
      qs.push(q); prim.add(s.i); count[kind] = (count[kind] || 0) + 1;
    }
    const ys = chunk.map(s => s.y);
    return { y: [Math.min(...ys), Math.max(...ys)], qs };
  });
  const top = all.filter(s => s.ak === k && s.c && !s.dz).sort((a, b) => a.f - b.f)[0] || all[0];
  return { id: slug(name), A: name, c: top?.c || '', c0: top?.c0 || 0, songs: all.length, dzSongs: all.filter(s => s.dz).length, stations };
}

/* ---------- 6. Schreiben ---------- */
(async () => {
  const used = new Set(), artistUse = new Map();
  buildTour('main', { seed: 'ontour-main-', used, artistUse, band: [0, 700], h0: .05, h1: .6, maxArtist: 3 });

  const artistsOut = [];
  L.push('════ Künstler-Touren ════');
  for (const name of STARS) {
    const a = await buildArtist(name);
    artistsOut.push({ id: a.id, A: a.A, c: a.c, ...(a.c0 ? { c0: a.c0 } : {}), st: a.stations.map(st => ({ y: st.y, q: st.qs.map(encode) })) });
    L.push(`--- ${name}: ${a.songs} Songs (davon ${a.dzSongs} von Deezer ergänzt) · ${a.stations.length} Stationen`);
    a.stations.forEach((st, i) => {
      const kinds = st.qs.reduce((m, q) => (m[q.k] = (m[q.k] || 0) + 1, m), {});
      L.push(`  Station ${i + 1} (${st.y.join('–')}): ${st.qs.length} Aufgaben ${JSON.stringify(kinds)}`, ...st.qs.map(q => '    ' + fmtQ(q)));
    });
    L.push('');
  }
  fs.mkdirSync(path.dirname(DZ_CACHE), { recursive: true });
  fs.writeFileSync(DZ_CACHE, JSON.stringify(dzCache));

  const built = new Date().toISOString().slice(0, 10);
  const songs = songsOut.map(s => {
    const r = [s.i, s.T, s.A, s.y, s.c || '', s.c0 || 0, s.n || 0];
    if ((s.a0 || s.A) !== s.A) r.push(s.a0);
    return r;
  });
  const same = !!old && JSON.stringify([old.streamsAt, old.songs, old.tours, old.artists]) === JSON.stringify([HOM.streamsAt, songs, tours, artistsOut]);
  const out = { _hinweis: 'Erstellt mit scripts/build-data.js aus den Daten von Hit or Miss und Gold Record – nicht von Hand ändern',
    built: same ? old.built : built, streamsAt: HOM.streamsAt, songs, tours, artists: artistsOut };
  const json = JSON.stringify(out);

  // Probleme: jede Station braucht mindestens 6 Aufgaben mit allen vier Arten (who/year zählen als „Gold-Frage“),
  // jede Künstler-Station mindestens 6 Aufgaben aus mindestens 3 Arten
  const problems = [];
  for (const [t, sts] of Object.entries(tours)) for (const [id, qs] of Object.entries(sts)) {
    const k = new Set(qs.map(q => q.k === 'year' || q.k === 'who' || q.k === 'feat' ? 'gold' : q.k));
    if (qs.length < 8 || !['rec', 'old', 'claim', 'gold'].every(x => k.has(x))) problems.push(`${t}/${id}: nur ${qs.length} Aufgaben (${[...k].join(', ')})`);
  }
  for (const a of artistsOut) a.st.forEach((st, i) => {
    const k = new Set(st.q.map(q => q.k));
    if (st.q.length < 6 || k.size < 3) problems.push(`Künstler ${a.A} / Station ${i + 1}: nur ${st.q.length} Aufgaben (${[...k].join(', ')})`);
  });
  const head = [`On Tour – Datenpaket ${out.built} (Streams Stand ${HOM.streamsAt})`,
    `Songs im Pool: ${tracks.length} (davon ${addedDe} deutsche aus Gold Record dazu) · im Paket: ${songs.length} · Künstler: ${artistsOut.length} · Datei ${(Buffer.byteLength(json) / 1024).toFixed(0)} KB`, ''];
  fs.mkdirSync(path.join(__dirname, '.cache'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '.cache', 'report.txt'), [...head, ...L].join('\n'));
  console.log(head.join('\n'));
  console.log('Bericht: scripts/.cache/report.txt');
  if (problems.length) { console.error('FEHLER – data/tour.json NICHT geschrieben:\n  ' + problems.join('\n  ')); process.exit(1); }
  if (same) console.log('Keine Änderung – data/tour.json bleibt, wie sie ist.');
  else { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, json); console.log('data/tour.json geschrieben.'); }
})();

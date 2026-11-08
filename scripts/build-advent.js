#!/usr/bin/env node
/* Adventskalender für On Tour bauen: node scripts/build-advent.js
   1. Weihnachtsliste: Songs aus Deezer-Playlists (Weihnachtshits, Christmas Classics, deutsche Weihnachtslieder …) plus
      feste Suchen (MUST, WINTER). Ohne Karaoke-, Cover-, Tribute-Fassungen (JUNK wie in Needle Drop build-billions.js),
      nur Songs mit lesbarer 30-s-Vorschau. Originaljahr: geprüftes Jahr aus Hit or Miss, sonst MusicBrainz (frühestes
      Erscheinen einer Aufnahme dieses Interpreten), YEAR_FIX geht vor. Jahreshits: die bekanntesten Songs 2025/2026 aus Hit or Miss.
   2. Für jedes der 24 Türchen ein Aufgaben-Vorrat (wie die Stationen in scripts/build-data.js): 12 Aufgaben (Tür 24: 16),
      im Spiel kommen davon 6 dran (Tür 24: 10) – gezogen mit einem Startwert aus Jahr und Tür (js/game.js), für alle gleich.
   Zwischenspeicher: scripts/.cache/advent-dz.json (Deezer), scripts/.cache/advent-mb.json (MusicBrainz).
   Die Türchen sollen die ganze Saison gleich bleiben: Steht data/advent.json schon da, bleibt sie, wie sie ist –
   neu bauen (z. B. für das nächste Jahr, vor dem 1. November): --neu. Playlists neu von Deezer holen: --refresh (baut auch neu). Ohne Netz: --offline.
   Ergebnis: data/advent.json, Bericht scripts/.cache/advent-report.txt. Danach DATA_V in js/game.js erhöhen.

   advent.json:
     songs: [[Deezer-ID, Titel, Interpret, Jahr|0, Cover, 0, Streams in Mio.|0], …]   (wie data/tour.json)
     list:  [[Nr. in songs, Merkmale], …]  die Weihnachtsliste (auch für andere Spiele): x = Weihnachten, de = deutsch,
            sw = Swing-Klassiker, w = Winterhit, y = Jahreshit, top = großer Klassiker, q = Jahr geprüft
     doors: { "1": [Aufgabe, …], … }  Aufgaben wie in data/tour.json (rec, old, claim, who, year)
     meta:  { "1": { i: Symbol, t: Thema (deutsch, tx), c: Cover }, … }  – dasselbe steht in data/advent-doors.json (für die Jukebox) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), DOCS = path.join(ROOT, '..');
const HM = require(path.join(DOCS, 'Hit-or-Miss', 'js', 'claims.js'));
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return d; } };
const ARGS = process.argv.slice(2), REFRESH = ARGS.includes('--refresh'), OFFLINE = ARGS.includes('--offline');
const CACHE = path.join(__dirname, '.cache');
fs.mkdirSync(CACHE, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Quellen ---------- */
// Deezer-Playlists (de: deutsche Weihnachtslieder – daraus kommen die Songs für Tür 10)
const PLAYLISTS = [
  { id: 1055602641, name: 'Weihnachten Hits (Deezer DE)' },
  { id: 8454338222, name: 'Christmas Hits (Deezer Pop)' },
  { id: 3773404202, name: 'Christmas Classics (Deezer)' },
  { id: 3833591862, name: 'Christmas Pop (Deezer)' },
  { id: 1461700645, name: 'Weihnachtssongs 2026 (Filtr)' },
  { id: 152114933, name: 'Christmas Greatest Hits & Holiday Classics' },
  { id: 1297164545, name: 'CHRISTMAS HITS (Digster)' },
  { id: 10805328862, name: 'Deutsche Weihnachtslieder Pop', de: true },
  { id: 13253557403, name: 'Deutsche Weihnachtslieder', de: true },
  { id: 12032759371, name: 'Weihnachten mit Rolf Zuckowski', de: true },
];
// Diese Songs sollen auf jeden Fall dabei sein (falls nicht schon in den Playlists): [Interpret, Titel]
const MUST = [
  ['Wham!', 'Last Christmas'], ['Mariah Carey', 'All I Want for Christmas Is You'], ['Chris Rea', 'Driving Home for Christmas'],
  ['Band Aid', "Do They Know It's Christmas?"], ['José Feliciano', 'Feliz Navidad'], ['Brenda Lee', "Rockin' Around the Christmas Tree"],
  ['Bobby Helms', 'Jingle Bell Rock'], ['Bing Crosby', 'White Christmas'], ['Dean Martin', 'Let It Snow! Let It Snow! Let It Snow!'],
  ['Frank Sinatra', 'Have Yourself a Merry Little Christmas'], ['Nat King Cole', 'The Christmas Song'], ['Andy Williams', "It's the Most Wonderful Time of the Year"],
  ['Michael Bublé', "It's Beginning to Look a Lot Like Christmas"], ["Shakin' Stevens", 'Merry Christmas Everyone'], ['Wizzard', 'I Wish It Could Be Christmas Everyday'],
  ['Slade', 'Merry Xmas Everybody'], ['The Pogues', 'Fairytale of New York'], ['John Lennon', 'Happy Xmas (War Is Over)'], ['Paul McCartney', 'Wonderful Christmastime'],
  ['Elvis Presley', 'Blue Christmas'], ['Ariana Grande', 'Santa Tell Me'], ['Sia', 'Snowman'], ['Justin Bieber', 'Mistletoe'], ['Kelly Clarkson', 'Underneath the Tree'],
  ['Michael Bublé', 'Holly Jolly Christmas'], ['Ed Sheeran', 'Merry Christmas'], ['Coldplay', 'Christmas Lights'], ['Taylor Swift', 'Christmas Tree Farm'],
  ['Pentatonix', 'Mary, Did You Know?'], ['Leona Lewis', 'One More Sleep'], ['Gwen Stefani', 'You Make It Feel Like Christmas'],
  ['Ariana Grande', 'Last Christmas'], ['Sia', 'Candy Cane Lane'], ['Meghan Trainor', 'I Believe'], ['Kylie Minogue', 'Santa Baby'],
  ['Frank Sinatra', 'Jingle Bells'], ['Dean Martin', "Baby, It's Cold Outside"], ['Ella Fitzgerald', 'Sleigh Ride'], ['Louis Armstrong', 'Christmas in New Orleans'],
  ['Eartha Kitt', 'Santa Baby'], ['Bing Crosby', "I'll Be Home for Christmas"], ['Perry Como', "It's Beginning to Look a Lot Like Christmas"], ['Burl Ives', 'A Holly Jolly Christmas'],
  ['Gene Autry', 'Rudolph the Red-Nosed Reindeer'], ['The Ronettes', 'Sleigh Ride'], ['Darlene Love', 'Christmas (Baby Please Come Home)'], ['Chuck Berry', 'Run Rudolph Run'],
  ['Dean Martin', 'Winter Wonderland'], ['Frank Sinatra', 'Let It Snow! Let It Snow! Let It Snow!'], ['Bing Crosby', 'Silent Night'],
  ['Rolf Zuckowski', 'In der Weihnachtsbäckerei'], ['Sarah Connor', 'Christmas in My Heart'], ['Die Toten Hosen', 'Weihnachtsmann vom Dach'],
  ['Peter Alexander', 'Leise rieselt der Schnee'], ['Helene Fischer', 'Weihnachten'],
];
// Winterhits ohne Weihnachten (Tür 13)
const WINTER = [
  ['Red Hot Chili Peppers', 'Snow (Hey Oh)'], ['The Mamas & The Papas', "California Dreamin'"], ['The Bangles', 'Hazy Shade of Winter'],
  ['Simon & Garfunkel', 'A Hazy Shade of Winter'], ['Madonna', 'Frozen'], ['Idina Menzel', 'Let It Go'], ['Kristen Bell', 'Do You Want to Build a Snowman?'],
  ['Vanilla Ice', 'Ice Ice Baby'], ['Foreigner', 'Cold as Ice'], ['Grauzone', 'Eisbär'], ['Elton John', 'Cold Heart (PNAU Remix)'],
  ['Fleet Foxes', 'White Winter Hymnal'], ['Sara Bareilles', 'Winter Song'], ['Tori Amos', 'Winter'], ['Kate Bush', 'Snowflake'],
  ['Taylor Swift', 'Snow On The Beach'], ['Aled Jones', 'Walking in the Air'],
];
// Swing-Weihnacht (Tür 4): diese Interpreten
const SWING = ['Bing Crosby', 'Dean Martin', 'Frank Sinatra', 'Nat King Cole', 'Ella Fitzgerald', 'Louis Armstrong', 'Perry Como', 'Andy Williams',
  'Bobby Helms', 'Brenda Lee', 'Eartha Kitt', 'Peggy Lee', 'The Andrews Sisters', 'Judy Garland', 'Gene Autry', 'Burl Ives', 'Doris Day', 'Johnny Mathis',
  'Bing Crosby & The Andrews Sisters', 'Elvis Presley', 'Chuck Berry', 'The Ronettes', 'Darlene Love', 'Mel Tormé', 'Tony Bennett', 'Sammy Davis Jr.', 'Vince Guaraldi Trio', 'Jackson 5', 'The Jackson 5', 'The Drifters'];
// Karaoke, Cover-Bands, Tribute – wie JUNK in Musik-Quiz/scripts/build-billions.js, dazu Zusätze, die keine Originalaufnahme sind
const JUNK = /karaoke|cover band|\bcover\)|tribute|in the style of|originally (performed|by)|made famous|instrumental|lullaby|8-bit|sped up|slowed|nightcore|piano version|vocal melody|music box|spieluhr|kinderchor|orchestra version/i;
const NOT_ORIG = /\blive\b|remix|acoustic|a cappella|demo|rehearsal|\bedit\b|re-?recorded|mix\)|version\)|unplugged/i;   // in Zusätzen (title_version)

/* ---------- Deezer ---------- */
const DZ_FILE = path.join(CACHE, 'advent-dz.json');
const dzCache = readJson(DZ_FILE, {});
async function dz(p, fresh = false) {
  if (dzCache[p] && !fresh) return dzCache[p];
  if (OFFLINE) return dzCache[p] || null;
  for (let t = 0; t < 4; t++) {
    try {
      const j = await (await fetch('https://api.deezer.com' + p)).json();
      if (j.error) { if (j.error.code === 4) { await sleep(2500); continue; } return null; }
      await sleep(110);
      return (dzCache[p] = j);
    } catch { await sleep(1200); }
  }
  return dzCache[p] || null;
}
async function playlistTracks(id) {
  const out = [];
  for (let i = 0; i < 1000; i += 100) {
    const j = await dz(`/playlist/${id}/tracks?limit=100&index=${i}`, REFRESH);
    if (!j?.data?.length) break;
    out.push(...j.data);
    if (j.data.length < 100) break;
  }
  return out;
}
const fake = t => JUNK.test(`${t.title} ${t.artist?.name} ${t.album?.title || ''}`) || NOT_ORIG.test(t.title_version || '') || NOT_ORIG.test(String(t.title).replace(/^[^([\-–—]*/, ''));
const EXTRA = /remaster|feat\.|ft\.|\bwith\b|version|\bedit\b|mono|stereo|\blive\b|\bmix\b|\bfrom\b|soundtrack|recorded|anniversary|deluxe|bonus|single|radio|\b(19|20)\d\d\b/i;
const cleanT = t => String(t.title_short || t.title).replace(/\s*[([]([^)\]]*)[)\]]/g, (m, x) => EXTRA.test(x) ? '' : m).replace(/\s+[-–—]\s+(.*)$/, (m, x) => EXTRA.test(x) ? '' : m).replace(/\s+/g, ' ').trim();
const mainA = a => HM.mainArtist(a);
const songKey = (T, A) => HM.key(String(A).split(/\s*(?:feat\.?|ft\.?|featuring|with|&|,| x | and )\s*/i)[0]) + '|' + HM.titleKey(T);
const similar = (a, b) => { const x = HM.key(a), y = HM.key(b); return x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x))); };
/** Suche nach einem bestimmten Song: Interpret muss passen, Titel muss passen, lesbar mit Vorschau, keine Fassung */
async function find(A, T) {
  const j = await dz('/search?limit=25&q=' + encodeURIComponent(`${A} ${HM.cleanTitle(T)}`));
  const hits = (j?.data || []).filter(t => t.readable && t.preview && !JUNK.test(t.title + ' ' + t.artist.name) && similar(t.artist.name, A) && HM.titleKey(cleanT(t)) === HM.titleKey(T));
  return hits.sort((a, b) => b.rank - a.rank)[0] || null;
}


/* ---------- 1. Weihnachtsliste sammeln ---------- */
async function collect() {
  const by = new Map();   // songKey → Eintrag
  const add = (t, src) => {
    if (!t.readable || !t.preview) return;
    const T = cleanT(t), A = t.artist.name, k = songKey(T, A);
    if (!T || T.length > 48 || /\b(19|20)\d\d\b/.test(T)) return;   // „Shake up Christmas 2011“ & Co.
    let e = by.get(k);
    if (!e) by.set(k, e = { k, T, A, tr: t, pls: new Set(), tags: new Set() });
    else if (t.rank > e.tr.rank) e.tr = t;
    if (src) { e.pls.add(src.id); if (src.de) e.dePl = true; }
    return e;
  };
  for (const pl of PLAYLISTS) {
    const ts = await playlistTracks(pl.id);
    L.push(`Playlist ${pl.name}: ${ts.length} Songs`);
    for (const t of ts) if (!fake(t)) add(t, pl)?.tags.add('x');
  }
  for (const [A, T] of MUST) {
    const t = await find(A, T); if (!t) { L.push(`  ⚠️ nicht gefunden: ${A} – ${T}`); continue; }
    const e = add(t, null); if (e) { e.must = true; e.tags.add('x'); }
  }
  for (const [A, T] of WINTER) {
    const t = await find(A, T); if (!t) { L.push(`  ⚠️ Winterhit nicht gefunden: ${A} – ${T}`); continue; }
    const e = add(t, null); if (e) { e.tags.add('w'); e.tags.delete('x'); }
  }
  fs.writeFileSync(DZ_FILE, JSON.stringify(dzCache));
  return [...by.values()];
}

/* ---------- Merkmale ---------- */
// Weihnachtlich am Titel erkennbar (sonst nur, wenn in mindestens 3 Playlists oder in MUST): hält „What a Wonderful World“ & Co. draußen
const XMAS_WORDS = /christmas|xmas|santa|snow|sleigh|jingle|mistletoe|reindeer|rudolph|no[eë]l|navidad|holiday|silent night|holy night|december|bells|weihnacht|advent|nikolaus|schnee|christkind|tannenbaum|stille nacht|glöckchen|engel|kinderlein|winter|frosty|grinch|merry|joy to the world|herald angels|drummer boy|deck the hall|carol|wonderful time|feliz|mary's boy child|do you hear what i hear|fröhliche|heilige|krippe|bethlehem|tochter zion|dornwald|entsprungen|lichter|kranz|bäckerei|dezember|frieden für die welt|morgen kommt/i;
const BAD_ARTIST = /chor\b|choir|kids\b|kinder|orchest|ensemble|sing-?along|various|verschiedene|john williams|lullaby/i;
const DE_ARTISTS = new Set(['Rolf Zuckowski', 'Helene Fischer', 'Vanessa Mai', 'Odette und Dominique', 'Frank Schöbel', 'Tom Gaebel', 'Unheilig', 'Broilers',
  'Wincent Weiss', 'SOPHIA', 'Revelle', 'Roy Black', 'Karel Gott', 'Peter Alexander', 'Roger Whittaker', 'Sarah Connor', 'Rea Garvey', 'Roger Cicero', 'No Angels',
  'Tokio Hotel', 'Mike Singer', 'Esther Graf', 'KATI K', '01099', 'RIAN', 'Gregor Hägele', 'Andrea Berg', 'Howard Carpendale', 'Dieter Thomas Kuhn & Band',
  'Patricia Kelly', 'Leony', 'Michael Schulte', 'Max Giesinger', 'LEA', 'Mark Forster', 'Die Toten Hosen', 'Mireille Mathieu', 'Grauzone', 'Andreas Bourani',
  'Cro', 'Nena', 'Max Raabe', 'Udo Jürgens', 'Heino', 'Semino Rossi', 'Beatrice Egli', 'Giovanni Zarrella', 'Michelle', 'Kerstin Ott', 'Ben Zucker'].map(HM.key));
const GERMAN = /[äöüß]|\b(der|die|das|und|ich|du|nicht|ein|eine|mit|wir|ist|im|auf|für|mein|dein|kommt?|morgen|alle|jahre|wieder|leise|kinder\w*|tannenbaum|nikolaus|zeit|weihnacht\w*|schnee\w*|nacht|bald|lieber|guter|sterne?)\b/i;
const ENGLISH = /\b(i|a|the|you|your|my|me|this|that|of|and|on|it|is|we|love|baby|christmas|night|time|all)\b/i;
const germanTitle = T => GERMAN.test(T) && !ENGLISH.test(T);
const SWING_KEYS = new Set(SWING.map(HM.key));
const isSwing = s => SWING_KEYS.has(s.ak) || s.parts.some(p => SWING_KEYS.has(HM.key(p)));

/* ---------- Originaljahre ---------- */
// Von Hand geprüft (gehen vor allem anderen): songKey → Jahr. Alle Jahre mit Quelle stehen in scripts/.cache/advent-report.txt.
const YEAR_FIX = {   // 0 = Jahr nicht eindeutig (mehrere Aufnahmen, Neuausgabe) → keine Jahres-Fragen mit diesem Song
  'johnlennon|happyxmas': 1971, 'elvispresley|bluechristmas': 1957, 'wizzard|iwishitcouldbechristmaseveryday': 1973, 'edsheeran|merrychristmas': 2021,
  'destinyschild|8daysofchristmas': 2001, 'earthakitt|santababy': 1953, 'kylieminogue|santababy': 2000, 'andywilliams|happyholidaytheholidayseason': 1963,
  'franksinatra|haveyourselfamerrylittlechristmas': 1957, 'louisarmstrong|christmasinneworleans': 1955, 'bingcrosby|illbehomeforchristmas': 1943,
  'perrycomo|itsbeginningtolooklikechristmas': 1951, 'toriamos|winter': 1992,
  'natkingcole|christmassong': 0, 'franksinatra|whitechristmas': 0, 'bingcrosby|whitechristmas': 0, 'ladygaga|santaclausiscomingtotown': 0,
  'meghantrainor|rockinaroundthechristmastree': 0, 'jamiecullum|letitsnow': 0, 'noangels|santaclausiscomintotown': 0, 'rogercicero|mychristmaspresentforyou': 0,
  'grauzone|eisbar': 0,
};
// Volks- und Kirchenlieder (Hunderte Jahre alt): das Jahr wäre nur das der Aufnahme – darum keine Jahres-Fragen mit ihnen
const TRAD = /stille nacht|o du fröhliche|tochter zion|dornwald|ros' entsprungen|kinderlein|alle jahre wieder|tannenbaum|leise rieselt|kling,? glöckchen|süßer die glocken|lasst uns froh|am weihnachtsbaum|schneeflöckchen|heilige nacht|still, still|ave maria|silent night|holy night|joy to the world|herald angels|first no[eë]l|deck the hall|god rest ye|drummer boy|o come all|^jingle bells|we wish you|twelve days|carol of the bells|o christmas tree|hallelujah|o tannenbaum/i;
const MB_FILE = path.join(CACHE, 'advent-mb.json');
const mbCache = readJson(MB_FILE, {});
let mbLast = 0;
/** Frühestes Erscheinen einer Aufnahme dieses Interpreten mit diesem Titel laut MusicBrainz: { y, n } (n = Aufnahmen mit Jahr y oder y+1) */
async function mbYear(A, T) {
  const k = `${HM.key(mainA(A))}|${HM.titleKey(T)}`;
  if (k in mbCache) return mbCache[k];
  if (OFFLINE) return null;
  const A0 = mainA(A).split(/\s*(?:&|,| feat\.? | x | and | und )\s*/i)[0];
  const q = `recording:"${HM.cleanTitle(T).replace(/"/g, '')}" AND artist:"${A0.replace(/"/g, '')}"`;
  for (let t = 0; t < 4; t++) {
    const wait = mbLast + 1100 - Date.now(); if (wait > 0) await sleep(wait);
    mbLast = Date.now();
    try {
      const r = await fetch('https://musicbrainz.org/ws/2/recording?fmt=json&limit=50&query=' + encodeURIComponent(q), { headers: { 'User-Agent': 'JukeboxAdventskalender/1.0 ( https://ku3rb1s.github.io/jukebox/ )' } });
      if (r.status === 503) { await sleep(3000); continue; }
      const j = await r.json();
      const ys = (j.recordings || []).filter(rec => rec.score >= 70 && HM.titleKey(rec.title) === HM.titleKey(T)
        && (rec['artist-credit'] || []).some(c => similar(c.name || '', A0) || similar(c.artist?.name || '', A0)))
        .map(rec => +String(rec['first-release-date'] || '').slice(0, 4)).filter(y => y >= 1920 && y <= 2026).sort((a, b) => a - b);
      const res = ys.length ? { y: ys[0], n: ys.filter(y => y <= ys[0] + 1).length } : { y: 0, n: 0 };
      mbCache[k] = res;
      if (Object.keys(mbCache).length % 20 === 0) fs.writeFileSync(MB_FILE, JSON.stringify(mbCache));
      return res;
    } catch { await sleep(2000); }
  }
  return null;
}

/* ---------- Hilfen ---------- */
const L = [];   // Bericht
const lerp = (a, b, k) => a + (b - a) * k;
const shuffle = (a, R) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let titleArt = new Map();   // Titel-Schlüssel → Interpreten, die ihn singen (aus allen gesammelten Songs)
// Leicht gehalten (es geht um Weihnachten): „Älter oder neuer“ nur bei deutlichem Abstand – GAP je Tür (build)
let GAP = 10;
const orderOk = (a, b, gap = GAP) => !!(a.q && b.q) && a.ak !== b.ak && a.tk !== b.tk && Math.abs(a.y - b.y) >= gap;
const near = (s, o, win) => !s.y || !o.y || Math.abs(s.y - o.y) <= win;
const wordsIn = (a, b) => HM.words(a).includes(HM.words(b)) || HM.words(b).includes(HM.words(a));
/** n falsche Titel (als Songs) aus dem Vorrat: andere Interpreten, kein ähnlicher Titel, bevorzugt aus derselben Zeit */
function falseTitles(s, n, pool, R) {
  const fine = o => o !== s && o.tk !== s.tk && o.ak !== s.ak && o.T.length <= 40 && !wordsIn(o.T, s.T) && !titleArt.get(o.tk)?.has(s.ak);
  const out = [];
  for (const win of [99]) for (const o of shuffle(pool, R)) {
    if (out.length >= n) break;
    if (fine(o) && near(s, o, win) && !out.includes(o) && !out.some(x => x.tk === o.tk || wordsIn(x.T, o.T))) out.push(o);
  }
  return out.length >= n ? out.slice(0, n) : null;
}
/** n falsche Interpreten aus dem Vorrat: nicht beteiligt, nicht verwandt, haben den Titel nicht selbst im Programm */
function falseArtists(s, n, pool, R) {
  const bad = A => HM.key(A) === s.ak || HM.related(A, s.parts) || titleArt.get(s.tk)?.has(HM.key(A));
  const out = [];
  for (const win of [99]) for (const o of shuffle(pool, R)) {
    if (out.length >= n) break;
    if (!bad(o.A) && near(s, o, win) && !out.some(x => HM.key(x) === o.ak || HM.related(x, [o.A]))) out.push(o.A);
  }
  return out.length >= n ? out.slice(0, n) : null;
}
/** 3 falsche Jahre (nah am echten, mindestens 2 auseinander, nicht in der Zukunft) */
function falseYears(s, R) {
  if (!s.q) return null;
  const offs = shuffle([-12, -10, -8, -6, -4, 4, 6, 8, 10, 12], R).filter(d => s.y + d <= 2026 && s.y + d >= 1930), pick = [];
  for (const d of offs) { if (pick.length >= 3) break; if (!pick.some(x => Math.abs(x - d) < 4)) pick.push(d); }
  return pick.length === 3 ? pick.map(d => s.y + d) : null;
}
/** Behauptung wie in Hit or Miss: ist von …, heißt …, ist älter/neuer als …, über … Streams */
function makeClaim(s, want, pool, R) {
  for (const k of shuffle(['artist', 'artist', 'title', 'older', 'streams'], R)) {
    if (k === 'artist') { if (want) return { k, A: s.A, ok: true }; const f = falseArtists(s, 1, pool, R); if (f) return { k, A: f[0], ok: false }; }
    else if (k === 'title') { if (s.T.length > 40) continue; if (want) return { k, T: s.T, ok: true }; const f = falseTitles(s, 1, pool, R); if (f) return { k, T: f[0].T, ok: false }; }
    else if (k === 'older') {
      if (!s.q) continue;
      const o = shuffle(pool, R).find(o => o !== s && orderOk(s, o) && o.tk !== s.tk); if (!o) continue;
      const older = s.y < o.y;
      return { k, cmp: want === older ? 'older' : 'newer', o, ok: want };
    } else if (k === 'streams') {
      if (!(s.n >= 1000)) continue;   // nur Songs über 1 Mrd. (Milliarden-Liste von Needle Drop)
      if (want) return { k, n: Math.floor(s.n / 250) * 250, ok: true };
      return { k, n: Math.ceil(s.n / .85 / 250) * 250, ok: false };
    }
  }
  return null;
}
const TYPES = ['rec', 'rec', 'rec', 'old', 'old', 'claim', 'claim', 'claim', 'who', 'who', 'year', 'year'];
const FINAL_TYPES = [...TYPES, 'rec', 'old', 'claim', 'claim', 'who', 'year'];
const WHO_TYPES = Array(11).fill('who');
/** Aufgaben eines Türchens: core = Songs für die Aufgaben (beste zuerst), pool = woraus falsche Antworten kommen */
const ASKED = new Set();   // „Song|Art“ schon in einem Türchen dran – nicht dieselbe Frage zweimal im Kalender
function makeTasks(door, core, pools, types, R) {
  const P = s => typeof pools === 'function' ? pools(s) : pools;
  const prim = new Set(), qs = [], wants = shuffle([true, false, true, false, R() < .5, R() < .5], R);
  let nc = 0;
  for (const type of types) {
    let q = null;
    const free = core.filter(s => !prim.has(s.i));
    for (const s of free.filter(x => !ASKED.has(x.i + '|' + type)).slice(0, 18)) {
      const pool = P(s);
      if (type === 'rec') { const o = falseTitles(s, 3, pool, R); if (o) q = { k: 'rec', s, o }; }
      else if (type === 'old') {
        const b = free.find(o => o !== s && orderOk(s, o)) || shuffle(pool, R).find(o => o !== s && !prim.has(o.i) && orderOk(s, o));
        if (b) q = { k: 'old', a: s, b };
      } else if (type === 'claim') { const c = makeClaim(s, wants[nc % wants.length], pool, R); if (c) q = { k: 'claim', s, c }; }
      else if (type === 'who') { const o = falseArtists(s, 3, pool, R); if (o) q = { k: 'who', s, o }; }
      else if (type === 'year') { const o = falseYears(s, R); if (o) q = { k: 'year', s, o }; }
      if (q) break;
    }
    if (!q && type === 'year') for (const s of free.slice(0, 18)) { const o = falseArtists(s, 3, P(s), R); if (o) { q = { k: 'who', s, o }; break; } }
    if (!q) { L.push(`  ⚠️ Tür ${door}: keine Aufgabe „${type}“ gefunden`); continue; }
    if (type === 'claim') nc++;
    ASKED.add((q.s || q.a).i + '|' + q.k);
    for (const s of [q.s, q.a, q.b].filter(Boolean)) prim.add(s.i);
    qs.push(q);
  }
  return qs;
}

/* ---------- 2. Die Türchen ----------
   Themen-Türchen laut Konzept (Konzepte/Adventskalender.md), alle anderen: Weihnachtsmix (h = Schwierigkeit 0 … 1, steigt im Dezember).
   Symbol und Thema (t, deutsch – läuft im Spiel und in der Jukebox über tx()) stehen in data/advent-doors.json. */
const DOOR_ICONS = ['', '🎄', '🔔', '🕯️', '🎺', '🍪', '🎅', '🦌', '🧦', '⛄', '🇩🇪', '🎶', '🌟', '❄️', '🛷', '🧣', '☕', '🎧', '🍫', '🎀', '📅', '✨', '🎵', '🥛', '🎁'];
const THEME = { 1: 'Die großen Klassiker', 4: 'Swing-Weihnacht', 6: 'Nikolaus: Wer singt?', 10: 'Deutsche Weihnacht', 13: 'Winterhits ohne Weihnachten',
  17: 'Weihnachten der 2010er', 20: 'Der Jahresrückblick: die größten Hits des Jahres', 24: 'Heiligabend-Finale' };
const MIX = 'Weihnachtsmix';

(async () => {
  if (!ARGS.includes('--neu') && !REFRESH && fs.existsSync(path.join(ROOT, 'data', 'advent.json'))) {
    console.log('Adventskalender: data/advent.json bleibt, wie sie ist (die Türchen sollen die Saison über gleich bleiben). Neu bauen: --neu');
    return;
  }
  const entries = await collect();
  // Streams (Mio.) aus der Milliarden-Liste von Needle Drop – nach Deezer-ID, sonst nach Titel und Interpret
  const BN = readJson(path.join(DOCS, 'Musik-Quiz', 'data', 'billions.json'), { tracks: [] }).tracks;
  const bnById = new Map(BN.map(t => [t.id, t.streams])), bnByKey = new Map(BN.map(t => [songKey(t.title, t.artist), t.streams]));
  // geprüfte Jahre aus Hit or Miss
  const HOM = readJson(path.join(DOCS, 'Hit-or-Miss', 'data', 'tracks.json'), null);
  if (!HOM) { console.error('FEHLER: ../Hit-or-Miss/data/tracks.json fehlt'); process.exit(1); }
  const homYear = new Map(HOM.tracks.filter(t => t.q >= 1).map(t => [songKey(t.t, HOM.artists[t.a]), t.y]));
  const NO_PREVIEW = new Set(readJson(path.join(CACHE, 'no-preview.json'), []));

  const toSong = e => {
    const t = e.tr, A = t.artist.name, s = { i: t.id, T: e.T, A, c: t.album?.md5_image || '', c0: '', rank: t.rank, pls: e.pls.size, must: !!e.must, tags: new Set(e.tags) };
    s.ak = HM.key(mainA(A)); s.tk = HM.titleKey(e.T); s.k = e.k;
    s.parts = HM.participants({ A, t: t.title });
    const n = bnById.get(t.id) || bnByKey.get(e.k); s.n = n ? Math.round(n / 1e6) : 0;
    s.score = s.pls + s.rank / 1e6 + (s.must ? 1.5 : 0);
    s.de = DE_ARTISTS.has(s.ak) || germanTitle(s.T);
    return s;
  };
  const all = entries.map(toSong);
  titleArt = new Map();
  for (const s of all) (titleArt.get(s.tk) || titleArt.set(s.tk, new Set()).get(s.tk)).add(s.ak);

  // Weihnachtslieder: weihnachtlicher Titel, in MUST oder in mindestens 3 Playlists; keine Chöre, Kinder-Sampler, Orchester
  const xmas = all.filter(s => s.tags.has('x') && !BAD_ARTIST.test(s.A) && (s.must || s.pls >= 3 || XMAS_WORDS.test(s.T)) && !NO_PREVIEW.has(s.i))
    .sort((a, b) => b.score - a.score || a.i - b.i);
  const capped = (list, n, perArtist, perTitle) => {
    const ca = new Map(), ct = new Map(), out = [];
    for (const s of list) {
      if (out.length >= n) break;
      if ((ca.get(s.ak) || 0) >= perArtist || (ct.get(s.tk) || 0) >= perTitle) continue;
      ca.set(s.ak, (ca.get(s.ak) || 0) + 1); ct.set(s.tk, (ct.get(s.tk) || 0) + 1); out.push(s);
    }
    return out;
  };
  const XM = capped(xmas.filter(s => !s.de), 100, 4, 2);
  const DE = capped(xmas.filter(s => s.de).sort((a, b) => germanTitle(b.T) - germanTitle(a.T) || b.score - a.score), 26, 4, 1);
  for (const s of DE) s.tags.add('de');
  const WIN = all.filter(s => s.tags.has('w') && !NO_PREVIEW.has(s.i));
  // Jahreshits: die bekanntesten Songs von 2025/2026 aus Hit or Miss (geprüfte Jahre), höchstens 2 je Interpret
  const homSong = (t, tag) => { const A = HOM.artists[t.a], T = HM.cleanTitle(t.t);
    return { i: t.i, T, A, y: t.y, q: 1, src: 'hom', c: t.c || '', c0: t.c0 || '', n: Math.round((bnById.get(t.i) || 0) / 1e6), ak: HM.key(mainA(A)), tk: HM.titleKey(T), k: songKey(T, A), parts: HM.participants({ A, t: t.t }), tags: new Set([tag]), f: t.f }; };
  const byRank = async (list, n) => { for (const s of list) s.rank = (await dz('/track/' + s.i))?.rank || 0; return capped(list.sort((a, b) => b.rank - a.rank || a.i - b.i), n, 2, 1); };
  const homPick = t => t.q >= 1 && !NO_PREVIEW.has(t.i) && !BAD_ARTIST.test(HOM.artists[t.a]) && t.f < 400;
  // Jahreshits: nur bekannte Namen – Interpreten mit mindestens 3 Songs in Hit or Miss oder Songs über 1 Mrd. Streams (sonst landen Eintagsfliegen aus fremden Charts drin)
  const homCount = HOM.tracks.reduce((m, t) => m.set(t.a, (m.get(t.a) || 0) + 1), new Map());
  const YH = await byRank(HOM.tracks.filter(t => t.y >= 2025 && homPick(t) && t.f < 120 && (homCount.get(t.a) >= 3 || bnById.get(t.i) >= 1e9)).map(t => homSong(t, 'y')), 20);
  const YH_OLD = await byRank(HOM.tracks.filter(t => t.y >= 2005 && t.y <= 2017 && homPick(t) && t.f < 120).map(t => homSong(t, 'v')), 16);   // nur Vergleich in Tür 20
  for (const s of [...YH, ...YH_OLD]) { s.score = s.rank / 1e6; (titleArt.get(s.tk) || titleArt.set(s.tk, new Set()).get(s.tk)).add(s.ak); }

  // Mitwirkende laut Deezer (Duette, Gäste) – damit ein Beteiligter nie als falsche Antwort kommt
  for (const s of [...XM, ...DE, ...WIN, ...YH]) {
    const t = await dz('/track/' + s.i);
    for (const c of t?.contributors || []) if (c.name && !s.parts.some(p => HM.key(p) === HM.key(c.name))) s.parts.push(c.name);
    s.dzDate = t?.release_date || '';
  }
  fs.writeFileSync(DZ_FILE, JSON.stringify(dzCache));
  // Originaljahre
  for (const s of [...XM, ...DE, ...WIN]) {
    const fix = YEAR_FIX[s.k], hy = homYear.get(s.k);
    if (fix != null) { s.y = fix; s.q = fix ? 1 : 0; s.src = 'fix'; continue; }
    if (hy) { s.y = hy; s.q = 1; s.src = 'hom'; continue; }
    const mb = await mbYear(s.A, s.T);
    s.y = mb?.y || 0; s.q = mb?.y ? 1 : 0; s.src = mb?.y ? `mb${mb.n}` : '–';
  }
  fs.writeFileSync(MB_FILE, JSON.stringify(mbCache));
  for (const s of [...XM, ...DE]) if (TRAD.test(s.T)) { s.q = 0; s.src = 'trad'; }
  XM.slice(0, 18).forEach(s => s.tags.add('top'));
  for (const s of XM) if (isSwing(s)) s.tags.add('sw');

  /* Türchen bauen */
  const use = new Map();   // wie oft ein Song schon Hauptsong einer Aufgabe ist
  const used = s => use.get(s.i) || 0;
  const markUse = qs => qs.forEach(q => [q.s, q.a, q.b].filter(Boolean).forEach(s => use.set(s.i, used(s) + 1)));
  const byUse = list => [...list].sort((a, b) => used(a) - used(b) || b.score - a.score);
  const S = {
    top: XM.filter(s => s.tags.has('top')),
    sw: XM.filter(s => s.tags.has('sw')),
    s10: XM.filter(s => s.q && s.y >= 2010 && s.y <= 2019),
  };
  const doors = {};
  const build = (n, core, pool, types) => {
    const R = HM.seeded('advent-door-' + n);
    const qs = makeTasks(n, core, pool, types, R);
    markUse(qs);
    doors[n] = qs;
  };
  // erst die Themen-Türchen (ihre Songs sind fest), dann der Weihnachtsmix mit den übrigen
  build(1, S.top, XM.slice(0, 60), TYPES);
  build(4, byUse(S.sw), [...S.sw, ...XM.filter(s => s.q && s.y < 1975)], TYPES);
  build(10, DE, DE, TYPES);
  build(13, WIN, WIN, TYPES);
  GAP = 6; build(17, byUse(S.s10), XM.filter(s => !s.q || s.y >= 1990), TYPES); GAP = 10;
  GAP = 8; build(20, YH, [...YH, ...YH_OLD], TYPES); GAP = 10;
  build(6, byUse(XM.slice(0, 70)).slice(0, 30), XM, WHO_TYPES);
  const mixDoors = Array.from({ length: 23 }, (_, i) => i + 1).filter(n => !THEME[n]);
  mixDoors.forEach((n, k) => {
    // Schwierigkeit steigt: frühe Türchen bekanntere Songs (vorn in XM), späte auch unbekanntere
    const target = lerp(.03, .45, k / (mixDoors.length - 1)) * XM.length;
    // bekannte Songs zuerst: ein schon benutzter Song zählt wie 12 Plätze weiter hinten (große Hits dürfen öfter vorkommen)
    const cost = x => used(x) * 12 + Math.abs(XM.indexOf(x) - target);
    const core = [...XM].sort((a, b) => cost(a) - cost(b) || XM.indexOf(a) - XM.indexOf(b)).slice(0, 18);
    build(n, core, XM, TYPES);
  });
  // Heiligabend: 16 Aufgaben aus allem (weniger bekannte Songs, auch deutsche), schwerer
  const xs = byUse(XM.slice(10, 70)), ds = byUse(DE), mixed = [];
  while (mixed.length < 30 && (xs.length || ds.length)) { if (xs.length) mixed.push(xs.shift()); if (xs.length) mixed.push(xs.shift()); if (ds.length) mixed.push(ds.shift()); }
  build(24, mixed, s => s.de ? DE : XM, FINAL_TYPES);

  /* Ausgabe */
  const songsOut = [], idx = new Map();
  const ref = s => { if (!idx.has(s.i)) { idx.set(s.i, songsOut.length); songsOut.push(s); } return idx.get(s.i); };
  const encode = q => {
    switch (q.k) {
      case 'rec': return { k: 'rec', s: ref(q.s), o: q.o.map(ref) };
      case 'old': return { k: 'old', a: ref(q.a), b: ref(q.b) };
      case 'who': return { k: 'who', s: ref(q.s), o: q.o };
      case 'year': return { k: 'year', s: ref(q.s), o: q.o };
      case 'claim': { const c = q.c, o = { k: c.k, ok: c.ok }; if (c.k === 'artist') o.A = c.A; if (c.k === 'title') o.T = c.T; if (c.k === 'streams') o.n = c.n; if (c.k === 'older') { o.cmp = c.cmp; o.o = ref(c.o); } return { k: 'claim', s: ref(q.s), c: o }; }
    }
  };
  const fmt = s => `»${s.T}« (${s.A}, ${s.y || '?'})`;
  const fmtQ = q => ({
    rec: () => `ERKENNEN  ${fmt(q.s)}  ✗ ${q.o.map(o => o.T).join(' · ')}`,
    old: () => `ÄLTER     ${fmt(q.a)} vs ${fmt(q.b)}`,
    who: () => `WER       ${fmt(q.s)}  ✗ ${q.o.join(' · ')}`,
    year: () => `JAHR      ${fmt(q.s)}  ✗ ${q.o.join(' · ')}`,
    claim: () => { const c = q.c; return `${c.ok ? 'STIMMT    ' : 'STIMMT NI.'} ${fmt(q.s)}: ` + ({ artist: `ist von ${c.A}`, title: `heißt »${c.T}«`, streams: `über ${c.n / 1000} Mrd. Streams [${(q.s.n / 1000).toFixed(2)}]`, older: `ist ${c.cmp === 'older' ? 'älter' : 'neuer'} als ${c.o && fmt(c.o)}` }[c.k]); },
  }[q.k]());
  const outDoors = {}, meta = {}, problems = [];
  for (let n = 1; n <= 24; n++) {
    const qs = doors[n] || [];
    const groups = new Set(qs.map(q => q.k === 'who' || q.k === 'year' ? 'gold' : q.k));
    const need = n === 24 ? 14 : n === 6 ? 8 : 10;
    if (qs.length < need || (n !== 6 && !['rec', 'old', 'claim', 'gold'].every(g => groups.has(g)))) problems.push(`Tür ${n}: nur ${qs.length} Aufgaben (${[...groups].join(', ')})`);
    const main = qs.map(q => q.s || q.a).find(s => s?.c) || qs[0]?.s;
    outDoors[n] = qs.map(encode);
    meta[n] = { i: DOOR_ICONS[n], t: THEME[n] || MIX, c: main?.c || '', ...(main?.c0 ? { c0: main.c0 } : {}) };
    L.push(`--- Tür ${n} ${DOOR_ICONS[n]} ${THEME[n] || MIX}: ${qs.length} Aufgaben`, ...qs.map(q => '  ' + fmtQ(q)), '');
  }
  const tagStr = s => [...s.tags, ...(s.q ? ['q'] : [])].join(' ');
  const list = [...XM, ...DE, ...WIN, ...YH].map(s => [ref(s), tagStr(s)]);
  const songs = songsOut.map(s => [s.i, s.T, s.A, s.y || 0, s.c || '', s.c0 || 0, s.n || 0]);
  const built = new Date().toISOString().slice(0, 10);
  const OUT = path.join(ROOT, 'data', 'advent.json'), OUT2 = path.join(ROOT, 'data', 'advent-doors.json');
  const old = readJson(OUT, null);
  const same = !!old && JSON.stringify([old.songs, old.list, old.doors, old.meta]) === JSON.stringify([songs, list, outDoors, meta]);
  const out = { _hinweis: 'Erstellt mit scripts/build-advent.js – nicht von Hand ändern', built: same ? old.built : built, songs, list, doors: outDoors, meta };
  const head = [`Adventskalender – Datenpaket ${out.built}`,
    `Weihnachtslieder: ${XM.length} international + ${DE.length} deutsch · Winterhits: ${WIN.length} · Jahreshits: ${YH.length} · Songs im Paket: ${songs.length}`,
    `Jahre: ${[...XM, ...DE, ...WIN].filter(s => s.q).length} bekannt, ${[...XM, ...DE, ...WIN].filter(s => !s.q).length} unbekannt`, ''];
  const listRep = ['════ Weihnachtsliste (Jahr · Quelle · Playlists · Merkmale) ════',
    ...[...XM, ...DE, ...WIN, ...YH].map(s => `  ${String(s.y || '????')} ${String(s.src).padEnd(4)} ${String(s.pls ?? '').padStart(2)}  ${s.A} – ${s.T}  [${tagStr(s)}]${s.n ? ` ${(s.n / 1000).toFixed(2)} Mrd.` : ''}   ${s.k}`), ''];
  fs.writeFileSync(path.join(CACHE, 'advent-report.txt'), [...head, ...listRep, ...L].join('\n'));
  console.log(head.join('\n'));
  console.log('Bericht: scripts/.cache/advent-report.txt');
  if (problems.length) { console.error('FEHLER – data/advent.json NICHT geschrieben:\n  ' + problems.join('\n  ')); process.exit(1); }
  if (same) console.log('Keine Änderung – data/advent.json bleibt, wie sie ist.');
  else { fs.writeFileSync(OUT, JSON.stringify(out)); console.log('data/advent.json geschrieben.'); }
  fs.writeFileSync(OUT2, JSON.stringify({ _hinweis: 'Erstellt mit scripts/build-advent.js – Symbol, Thema und Cover je Türchen (für die Jukebox)', doors: meta }));
})();

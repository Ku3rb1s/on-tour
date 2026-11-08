/* On Tour – Adventskalender (Tour-Art „advent“). Konzept: Konzepte/Adventskalender.md
   Vom 1. bis 24. Dezember öffnet jeden Tag ein Türchen: eine kurze Runde (6 Aufgaben, Tür 24: 10) aus data/advent.json
   (scripts/build-advent.js). Die Aufgaben je Tür zieht ein Startwert aus Jahr und Tür – für alle gleich. Verpasste Türchen
   lassen sich bis 6. Januar nachholen (Sterne zählen, die Serie nicht). Die Jukebox zeigt Karte und Kalender und öffnet
   ein Türchen mit on-tour/?advent=7; zurück geht es in den Kalender (jukebox/#advent).
   Gespeichert (abgeglichen mit „mapmax“, siehe RULES in js/sync.js):
     ot.advent     { "<Jahr>.<Tür>": Sterne }   0 = gespielt ohne Stern (zählt als geöffnet); Tür 24: bis 4 (Bonusstern bei 10/10)
     ot.adventDay  { "<Jahr>.<Tür>": 1 }        am Tag selbst gespielt (für die Türchen-Serie)
   Exklusive Avatare hinter Tür 6, 12, 18, 24 → jb.avatars (js/profile.js).
   Test-Datum nur lokal: ?date=2026-12-07 (wird an die Links zur Jukebox weitergegeben). */
const Advent = (() => {
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const params = new URLSearchParams(location.search);
  const testDate = LOCAL && /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
  const doorParam = +params.get('advent') || 0;
  const DOORS = 24, FINAL = 24;
  const AVATARS = { 6: '🎅🏻', 12: '☃️', 18: '🧑‍🎄', 24: '🌠' };
  const pad = n => String(n).padStart(2, '0');
  const today = () => testDate || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  /** Saison (Jahr des Dezembers) für ein Datum: 1.11.–6.1. (vor dem 1.12. sind alle Türchen noch zu) – sonst null */
  function season(d = today()) {
    const [y, m, day] = d.split('-').map(Number);
    return m >= 11 ? y : m === 1 && day <= 6 ? y - 1 : null;
  }
  // Ohne laufende Saison: die letzte (für Statistik und Erfolge)
  const curYear = () => season() ?? +today().slice(0, 4) - 1;
  const doorDate = (Y, n) => `${Y}-12-${pad(n)}`;
  const isOpen = (Y, n, d = today()) => d >= doorDate(Y, n) && d <= `${Y + 1}-01-06`;
  const daysTo = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const sid = (Y, n) => `${Y}.${n}`;
  const map = () => LS.get('advent', {}) || {};
  const dayMap = () => LS.get('adventDay', {}) || {};
  const maxStars = n => n === FINAL ? 4 : 3;
  /** Sterne einer Runde: 6 Aufgaben wie On Tour (3/5/6), Tür 24 mit 10 Aufgaben: 5/7/9 und ein Bonusstern bei 10 */
  const starsFor = (right, total) => total >= 10 ? (right >= 10 ? 4 : right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0)
    : right >= 6 ? 3 : right >= 5 ? 2 : right >= 3 ? 1 : 0;
  const starsSub = (right, total) => {
    const s = starsFor(right, total);
    if (total >= 10) return s === 4 ? tx('Alle zehn richtig – mit Bonusstern!') : s === 3 ? tx('Noch 1 richtig mehr für den Bonusstern') : s === 2 ? tx('Für drei Sterne brauchst du 9 richtige') : s === 1 ? tx('Für zwei Sterne brauchst du 7 richtige') : tx('Ab 5 richtigen gibt es den ersten Stern');
    return s === 3 ? tx('Alle richtig – drei Sterne!') : s === 2 ? tx('Noch 1 richtig mehr für drei Sterne') : s === 1 ? tx('Für zwei Sterne brauchst du 5 richtige') : tx('Ab 3 richtigen gibt es den ersten Stern');
  };
  const starRow = (n, door) => Array.from({ length: maxStars(door) }, (_, k) => `<i class="${k < n ? 'on' : ''}${k === 3 ? ' bonus' : ''}">★</i>`).join('');

  /** Türchen-Serie: Türchen in Folge am Tag selbst geöffnet – endet heute oder gestern (sonst 0). best: längste der Saison */
  function streak(Y = curYear()) {
    const dm = dayMap(), on = n => !!dm[sid(Y, n)];
    const d = today(), dn = d.slice(0, 7) === `${Y}-12` ? Math.min(+d.slice(8), DOORS) : d > `${Y}-12-24` ? DOORS : 0;
    let n = on(dn) ? dn : dn - 1, cur = 0;
    if (d <= `${Y}-12-24` || on(dn)) while (n >= 1 && on(n)) { cur++; n--; }
    let best = 0, run = 0;
    for (let k = 1; k <= DOORS; k++) { run = on(k) ? run + 1 : 0; best = Math.max(best, run); }
    return { cur, best };
  }
  const summary = (Y = curYear()) => {
    const m = map(), done = [], stars = Array.from({ length: DOORS + 1 }, () => 0);
    for (let n = 1; n <= DOORS; n++) { const v = m[sid(Y, n)]; if (v != null) { done.push(n); stars[n] = +v || 0; } }
    return { Y, done, stars, total: stars.reduce((a, b) => a + b, 0), onDay: Array.from({ length: DOORS }, (_, k) => !!dayMap()[sid(Y, k + 1)]).filter(Boolean).length, ...streak(Y) };
  };

  /* ---------- Daten: data/advent.json kommt hinter die Songs der Tour (gleiche Aufgaben-Form, Nummern verschoben) ---------- */
  let ADV = null;
  async function load() {
    if (ADV) return ADV;
    await loadData();
    const r = await fetch('data/advent.json?v=' + DATA_V);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const raw = await r.json(), off = DATA.S.length;
    for (const [i, T, A, y, c, c0, n] of raw.songs) { const s = { i, T, A, y, c, c0: c0 || '', n: n || 0, a0: A }; DATA.S.push(s); if (!DATA.byId.has(i)) DATA.byId.set(i, s); }
    const mv = q => ({ ...q, ...(q.s != null ? { s: q.s + off } : {}), ...(q.a != null ? { a: q.a + off, b: q.b + off } : {}),
      ...(q.k === 'rec' ? { o: q.o.map(x => x + off) } : {}), ...(q.k === 'claim' && q.c.o != null ? { c: { ...q.c, o: q.c.o + off } } : {}) });
    ADV = { doors: Object.fromEntries(Object.entries(raw.doors).map(([n, qs]) => [n, qs.map(mv)])), meta: raw.meta || {} };
    return ADV;
  }
  const meta = n => ADV?.meta?.[n] || {};
  const themeOf = n => { const t = meta(n).t; return t ? tx(t) : tx('Weihnachtsmix'); };
  const iconOf = n => meta(n).i || '🎁';
  const doorName = n => tx('Türchen {n}', { n });
  /** Die Tour für Karte, Station und Ergebnis (wie tourOf in js/game.js) */
  function tour(Y = curYear()) {
    return {
      id: 'advent', kind: 'advent', key: 'advent', Y,
      stations: Array.from({ length: DOORS }, (_, k) => { const n = k + 1; return {
        sid: sid(Y, n), n, get icon() { return iconOf(n); }, name: () => doorName(n), label: () => doorName(n), sub: () => themeOf(n), y: [1940, 2026],
        pool: () => ADV?.doors[n] }; }),
    };
  }
  /** Startwert für die Auswahl der Aufgaben: hängt nur von Jahr und Tür ab (für alle gleich) */
  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    let a = h >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- Links zur Jukebox (Test-Datum wird mitgegeben) ---------- */
  const withDate = u => testDate ? u + (u.includes('?') ? '&' : '?') + 'date=' + testDate : u;
  const calendarUrl = () => { const u = withDate('../jukebox/'); return u + '#advent'; };

  /* ---------- Ende einer Runde ---------- */
  /** Speichert Sterne (auch 0 = geöffnet), Tag-selbst-Markierung und Avatar. Gibt { stars, had, avatar } zurück */
  function record(t, n, right, total, startDay = today()) {
    const Y = t.Y, k = sid(Y, n), m = map(), had = m[k] == null ? -1 : +m[k], stars = starsFor(right, total);
    if (stars > had) { m[k] = stars; LS.set('advent', m); }
    // am Tag selbst: zählt der Tag, an dem die Runde begann (kurz vor Mitternacht gestartet = am Tag selbst)
    if (startDay === doorDate(Y, n)) { const dm = dayMap(); if (!dm[k]) { dm[k] = 1; LS.set('adventDay', dm); } }
    let avatar = null;
    const e = AVATARS[n];
    if (e && !Profile.isUnlocked(e)) { Profile.unlock(e); avatar = e; }
    return { stars, had: Math.max(0, had), first: had < 0, avatar };
  }
  /** Erfolge (Liste ACH in js/game.js) */
  function achOk() {
    const s = summary();
    return { adv24: s.done.length >= DOORS, adv72: s.done.length >= DOORS && s.stars.slice(1).every(x => x >= 3), advday: s.onDay >= DOORS };
  }

  /* ---------- Türchen-Bildschirm (vor dem Start: ein Tipp entsperrt den Ton auf dem iPhone) ---------- */
  // ?advent=7 – nur ganze Zahlen 1–24; sonst (kaputter Link) im Dezember das Türchen von heute, sonst Tür 1
  const fallbackDoor = () => { const d = today(); return d.slice(5, 7) === '12' ? Math.min(+d.slice(8), DOORS) : 1; };
  let door = Number.isInteger(doorParam) && doorParam >= 1 && doorParam <= DOORS ? doorParam : 0;
  async function showIntro(n = door) {
    if (!n && season() != null) n = fallbackDoor();
    door = n;
    show('advent');
    const Y = season(), box = $('#advent');
    $('#advBack').href = calendarUrl();
    $('#advStart').disabled = true;
    $('#advStars').innerHTML = '';
    if (Y == null || !n) {
      // außerhalb der Saison (7. Januar bis Ende Oktober)
      $('#advDoor').textContent = '🎄';
      $('#advKicker').textContent = tx('Adventskalender');
      $('#advTitle').textContent = today().slice(5) >= '07-01' ? tx('Bald geht es los') : tx('Der Adventskalender ist vorbei');
      $('#advInfo').textContent = tx('Vom 1. bis 24. Dezember öffnet sich in der Jukebox jeden Tag ein Türchen mit einer kurzen Musikrunde.');
      $('#advFoot').textContent = '';
      $('#advStart').classList.add('hidden');
      return;
    }
    $('#advStart').classList.remove('hidden');
    try { await load(); } catch { $('#advInfo').textContent = tx('Die Songliste konnte nicht geladen werden.'); return; }
    const t = tour(Y), st = t.stations[n - 1], had = map()[st.sid], open = isOpen(Y, n);
    box.style.setProperty('--adv-c', '');
    $('#advDoor').innerHTML = `<b>${n}</b><span>${iconOf(n)}</span>`;
    $('#advKicker').textContent = tx('Adventskalender {y}', { y: Y }) + ' · ' + doorName(n);
    $('#advTitle').textContent = themeOf(n);
    $('#advStars').innerHTML = had != null ? starRow(+had, n) : '';
    const q = n === FINAL ? 10 : 6;
    $('#advInfo').textContent = n === 6 ? tx('Heute nur eine Frage: Wer singt das? {q} Songs, ca. 2 Minuten.', { q })
      : n === FINAL ? tx('Das Finale: {q} Aufgaben aus allen Arten – und ein Bonusstern, wenn alles stimmt.', { q })
      : tx('{q} Aufgaben mit Musik, ca. 2 Minuten: Erkennen, Älter oder neuer, Hit or Miss und Gold-Fragen.', { q });
    const days = daysTo(today(), doorDate(Y, n));
    $('#advFoot').textContent = !open ? (days > 0 ? (days === 1 ? tx('Noch 1 Tag Geduld') : tx('Noch {n} Tage Geduld', { n: days })) : tx('Dieses Türchen lässt sich nicht mehr öffnen.'))
      : AVATARS[n] && !Profile.isUnlocked(AVATARS[n]) ? '🎁 ' + tx('Hinter diesem Türchen wartet ein Avatar, den es nur im Adventskalender gibt.')
      : had != null ? tx('Beliebig oft spielbar – es zählt dein bester Wert.')
      : today() > doorDate(Y, n) ? tx('Nachgeholt zählen die Sterne, aber nicht die Serie.') : '';
    $('#advStart').disabled = !open;
    $('#advStartLbl').textContent = !open ? tx('Noch zu') : had != null ? tx('Nochmal spielen') : tx('Türchen öffnen');
  }
  let starting = false;
  async function start() {
    if (!door || starting) return;
    const Y = season(); if (Y == null || !isOpen(Y, door)) return;
    unlockAudio();   // muss direkt im Tipp passieren (iPhone)
    starting = true;
    $('#loading').classList.remove('hidden');
    try { await load(); } catch { $('#loading').classList.add('hidden'); starting = false; return toast(tx('Die Songliste konnte nicht geladen werden.')); }
    $('#loading').classList.add('hidden');
    try { await startStation('advent', door - 1); } finally { starting = false; }
  }

  /* ---------- Abschlussbild zum Teilen ---------- */
  /** Bild bauen (1080 × 1350) – fertig vorbereitet, damit das Teilen auf dem iPhone direkt im Tipp starten kann */
  let prepared = null;
  const prepareImage = () => (prepared = buildImage());
  async function buildImage() {
    const s = summary(), W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    try { await document.fonts.load('900 80px Outfit'); await document.fonts.load('600 40px Outfit'); } catch {}
    const x = cv.getContext('2d');
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b2a26'); bg.addColorStop(1, '#2a0c14');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // Schnee
    const R = rng('share-' + s.Y);
    x.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 140; i++) { x.beginPath(); x.arc(R() * W, R() * H, 1.5 + R() * 4, 0, 7); x.fill(); }
    x.textAlign = 'center'; x.fillStyle = '#fff';
    const fit = (t, font, size, y) => { do x.font = font.replace('#', size); while (x.measureText(t).width > W - 120 && --size > 16); x.fillText(t, W / 2, y); };
    fit('🎄 ' + tx('Mein Adventskalender {y}', { y: s.Y }), '900 #px Outfit, system-ui, sans-serif', 68, 150);
    x.fillStyle = '#fde68a'; x.font = '900 190px Outfit, system-ui, sans-serif'; x.fillText(`${s.total} ⭐`, W / 2, 380);
    x.fillStyle = 'rgba(255,255,255,.9)';
    fit([tx('{n} von 24 Türchen', { n: s.done.length }), s.best ? '🔥 ' + tx('{n} Tage Serie', { n: s.best }) : ''].filter(Boolean).join(' · '), '700 #px Outfit, system-ui, sans-serif', 50, 470);
    // 24 Türchen: 6 × 4, Sterne darunter
    const cw = 150, ch = 150, gx = (W - 6 * cw - 5 * 20) / 2, gy = 540;
    for (let n = 1; n <= DOORS; n++) {
      const c = (n - 1) % 6, r = Math.floor((n - 1) / 6), px = gx + c * (cw + 20), py = gy + r * (ch + 24), on = s.done.includes(n);
      x.fillStyle = on ? 'rgba(251,191,36,.22)' : 'rgba(255,255,255,.07)';
      x.beginPath(); if (x.roundRect) x.roundRect(px, py, cw, ch, 22); else x.rect(px, py, cw, ch); x.fill();
      x.fillStyle = on ? '#fff' : 'rgba(255,255,255,.35)'; x.font = '800 54px Outfit, system-ui, sans-serif'; x.fillText(String(n), px + cw / 2, py + 78);
      x.fillStyle = '#fbbf24'; x.font = '700 30px system-ui, sans-serif';
      if (on) x.fillText('★'.repeat(Math.min(3, s.stars[n])) + (s.stars[n] > 3 ? '+' : ''), px + cw / 2, py + 124);
    }
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '700 38px Outfit, system-ui, sans-serif';
    x.fillText('ku3rb1s.github.io/jukebox', W / 2, H - 70);
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    const file = new File([blob], `adventskalender-${s.Y}.png`, { type: 'image/png' });
    const text = s.best ? tx('Mein Adventskalender: {s} ⭐, {d} Tage Serie', { s: s.total, d: s.best }) : tx('Mein Adventskalender: {s} ⭐', { s: s.total });
    return { blob, file, text };
  }
  async function shareImage() {
    const { blob, file, text } = await (prepared || buildImage());
    prepared = null;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /** Zeilen für die Statistik (Einstellungen → Deine Statistik), wenn es Ergebnisse gibt */
  function statRows() {
    let s = summary();
    if (!s.done.length) s = summary(s.Y - 1);   // im November: noch die letzte Saison
    if (!s.done.length) return [];
    return [[tx('Adventskalender {y}', { y: s.Y }), `${tx('{n} von 24 Türchen', { n: s.done.length })} · ${s.total} ⭐`], ...(s.best ? [[tx('Türchen-Serie'), tx('{n} Tage', { n: s.best })]] : [])];
  }
  return { active: !!doorParam || params.has('advent'), door: () => door, today, season, isOpen, tour, load, rng, starsFor, starsSub, starRow, maxStars,
    record, achOk, summary, showIntro, start, shareImage, prepareImage, statRows, calendarUrl, FINAL, AVATARS };
})();

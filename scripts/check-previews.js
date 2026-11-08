#!/usr/bin/env node
/* Prüft, ob Deezer für jeden Song in data/tour.json einen 30-s-Ausschnitt liefert: node scripts/check-previews.js
   Ohne Ausschnitt bliebe eine Aufgabe stumm. Ergebnis: scripts/.cache/no-preview.json (Deezer-IDs) – build-data.js lässt
   diese Songs weg. Zwischenspeicher scripts/.cache/previews.json (Deezer-ID → true/false), nach 30 Tagen neu prüfen: --neu */
'use strict';
const fs = require('fs'), path = require('path');
const C = path.join(__dirname, '.cache'), F = path.join(C, 'previews.json');
const cache = process.argv.includes('--neu') ? {} : (() => { try { return JSON.parse(fs.readFileSync(F, 'utf8')); } catch { return {}; } })();
const songs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'tour.json'), 'utf8')).songs;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let n = 0;
  for (const [id, T, A] of songs) {
    if (id in cache) continue;
    for (let t = 0; t < 3; t++) {
      try {
        const j = await (await fetch('https://api.deezer.com/track/' + id)).json();
        if (j.error?.code === 4) { await sleep(2000); continue; }
        cache[id] = !j.error && !!j.preview && j.readable !== false;
        break;
      } catch { await sleep(1000); }
    }
    if (++n % 100 === 0) { fs.writeFileSync(F, JSON.stringify(cache)); console.log(n, 'geprüft'); }
    await sleep(60);
  }
  fs.mkdirSync(C, { recursive: true }); fs.writeFileSync(F, JSON.stringify(cache));
  const bad = songs.filter(([id]) => cache[id] === false);
  fs.writeFileSync(path.join(C, 'no-preview.json'), JSON.stringify(bad.map(s => s[0])));
  console.log(`${songs.length} Songs, ohne Ausschnitt: ${bad.length}`);
  for (const s of bad) console.log('  ' + s[1] + ' – ' + s[2]);
})();

# On Tour

@../Spiele-Hub/JUKEBOX.md

Gemeinsame Dateien (css/base.css, css/fonts.css, fonts/, js/i18n.js, js/profile.js, js/sync.js, js/pwa.js, sw.js)
hier **nicht** direkt ändern, sondern das Original in `../Spiele-Hub/shared/` und dann `node ../Spiele-Hub/scripts/share.js --write`.

Stationen: `js/stations.js` (gilt für Spiel und Datenskript; `id` nie ändern, daran hängen die Sterne `ot.stars`).
Songdaten: `data/tour.json` nur mit `node scripts/build-data.js` bauen (liest Hit or Miss und Gold Record), dann
`scripts/.cache/report.txt` überfliegen und `DATA_V` in `js/game.js` erhöhen. Die Behauptungen prüft `../Hit-or-Miss/js/claims.js`.
Bestehende Stationen bleiben dabei gleich (nur Stationen mit verschwundenen Songs oder veralteten Behauptungen werden neu gebaut);
alles neu auswählen: `node scripts/build-data.js --neu`.
Künstler-Touren: Liste STARS in scripts/build-data.js, Profile (Alben, Herkunft, Fans, Erfolg) in scripts/artists.js – nur Belegtes;
Stationen = Album-Ären (Album je Song laut Deezer, kleine Ären werden zusammengelegt), Farbe je Ära aus dem Cover (js/game.js coverColor), Wissensfragen je Star in scripts/facts.js (nur Fakten, die sich nicht ändern). Fehlen einem Star Songs, ergänzt das Skript seine Deezer-Top-Songs
(Zwischenspeicher scripts/.cache/deezer-artists.json, ohne Netz: --offline). Sterne in ot.astars, Schlüssel <id>.<Nr.>.
Logo: `node scripts/logo-options.js <id> > logo.svg`, dann `node scripts/render-icons.js`.

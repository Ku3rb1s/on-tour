// On Tour – Besonderheiten für scripts/check-lang.js (das Skript selbst ist gemeinsam für alle Spiele)
// add: Themen der Stationen (js/stations.js, angezeigt mit tx(st.theme)) und Texte, die nur zusammengesetzt vorkommen
module.exports = {
  ignore: ['On Tour', 'vs', 'Needle Drop', 'Older or Newer', 'Gold Record', 'claim', 'gold', 'Enter', 'M', 'rec', 'old'],
  tables: ['KIND', 'KIND_NAMES', 'GAME_LINKS'],
  add: ['Töne an', 'Töne aus', 'Vibration an', 'Vibration aus',
    'Rock ’n’ Roll', 'Beat', 'Motown & Soul', 'Rock & Flower Power', 'Pop', 'Disco', 'Punk & Rock', 'Neue Deutsche Welle', 'MTV', 'Synth-Pop',
    'Welcher Song läuft?', 'Welcher Song ist älter?', 'Stimmt das?', 'Wer singt das?', 'Aus welchem Jahr ist der Song?', 'Mit wem?', 'Mit wem singt {a} hier?', 'Wissen',   // KIND
    'Songs am ersten Ton erkennen', 'Älter oder neuer – Song für Song', 'Stimmt’s oder stimmt’s nicht?', 'Interpreten und Jahre raten',   // GAME_LINKS
    'Grunge', 'Britpop', 'Techno & Eurodance', 'Hip-Hop', 'French House', 'R&B & Crunk', 'Deutschpop', 'EDM', 'Deutschrap', 'K-Pop', 'Latin', 'Die größten Hits jetzt'],
  keep: ['OLED', 'Design', 'Hit or Miss', 'Beat', 'Pop', 'Disco', 'MTV', 'Grunge', 'Britpop', 'EDM', 'Latin', 'Rock ’n’ Roll', 'Motown & Soul', 'Rock & Flower Power', 'Techno & Eurodance', 'R&B & Crunk', 'French House', 'Punk & Rock', 'Version', 'Streams', 'Vibration', 'Perfekt!'],
};

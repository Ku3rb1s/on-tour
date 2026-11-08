# Konzept: Musik-Reise (Arbeitstitel „On Tour“)

Stand: 08.11.2026 · noch nicht gebaut

## Die Idee in einem Satz
Eine Tour durch die Musikgeschichte: Jede Station ist ein Ort zu einer Zeit (Memphis 1956, Liverpool 1963 …
Berlin 2020er). Dort spielt man eine kurze Runde mit Songs aus genau dieser Zeit und sammelt bis zu 3 Sterne.
Mit Sternen geht es zur nächsten Station.

## Warum das gut in die Jukebox passt
- **Ein Ziel:** Die anderen Spiele haben Rekorde und Tages-Challenges. Hier gibt es einen Weg mit Ende,
  den man über Tage und Wochen weitergeht. Das ist ein Grund wiederzukommen, auch ohne Ehrgeiz für Highscores.
- **Alle Spiele in einem:** Jede Station mischt die Aufgaben aus Needle Drop, Older or Newer, Hit or Miss und
  Gold Record. Wer nur eins kennt, lernt die anderen kennen. Die Stationen verlinken am Ende auf das passende Spiel.
- **Daten gibt es schon:** Rund 6.000 Songs mit geprüften Jahren (Gold Record) und die Behauptungen aus Hit or Miss.
  Es braucht keine neuen Quellen.

## Die Karte
- Eine senkrechte Strecke zum Scrollen (wie ein Tourplan), unten fängt es an.
  Jede Station ist ein runder Knopf: Stadt, Jahr, kleines Symbol, darunter die Sterne.
- **Hauptroute (24 Stationen), etwa 3 pro Jahrzehnt**, zum Beispiel:
  | Jahrzehnt | Stationen (Ort · Thema) |
  |---|---|
  | 50er | Memphis 1956 · Rock'n'Roll |
  | 60er | Liverpool 1963 · Beat · Detroit 1965 · Motown · Woodstock 1969 · Rock |
  | 70er | Stockholm 1974 · Pop · New York 1977 · Disco · London 1977 · Punk & Rock |
  | 80er | Los Angeles 1983 · MTV · Berlin 1982 · Neue Deutsche Welle · London 1985 · Synth-Pop |
  | 90er | Seattle 1991 · Grunge · Frankfurt 1994 · Techno & Eurodance · New York 1996 · Hip-Hop |
  | 2000er | London 2004 · Pop · Atlanta 2006 · R&B · Hamburg 2008 · Deutschpop |
  | 2010er | Stockholm 2013 · EDM · Los Angeles 2015 · Pop · Berlin 2017 · Deutschrap |
  | 2020er | Seoul 2021 · K-Pop · Puerto Rico 2022 · Latin · Heute · die größten Hits jetzt |
- Die Orte sind Stimmung, keine Bedingung. Die Songs kommen aus dem Jahrzehnt, nach Möglichkeit passend zum
  Genre und zur Sprache (Berlin → deutsch). In den 50ern gibt es nur 17 Songs, darum dort nur eine Station.
- **Zugaben (Bonus-Stationen):** Werden mit Sternen freigeschaltet (zum Beispiel bei 20, 40 und 60 Sternen).
  Etwa „Nur Deutsch“, „Milliarden-Club“ (über 1 Mrd. Streams), „One-Hit-Wonder“.

## Eine Station (etwa 2 Minuten)
- **6 Aufgaben**, gemischt aus 4 Arten, alle mit Musik (30-Sekunden-Vorschau von Deezer):
  1. **Erkennen:** Ein Ausschnitt läuft, du wählst aus 4 Titeln (wie Needle Drop, aber Antippen statt Tippen,
     damit es flott bleibt).
  2. **Älter oder neuer:** Zwei Songs aus dieser Zeit, welcher ist älter? (wie Older or Newer).
  3. **Hit oder Miss:** Eine Behauptung zum Song, stimmt sie? (wie Hit or Miss, mit dessen Behauptungen).
  4. **Gold-Frage:** Wer singt das? oder: Aus welchem Jahr? (wie Gold Record, 4 Antworten).
- **Sterne:** 1 Stern ab 3 richtigen, 2 ab 5, 3 bei allen 6. Mit 1 Stern ist die nächste Station offen.
- Kein Zeitdruck in den ersten Stationen. Ab den 90ern läuft eine sanfte Uhr mit, für etwas Spannung.
- Am Ende: Sterne fliegen auf die Karte, die nächste Station leuchtet auf. Dazu ein Link „Mehr davon in …“
  zum Spiel, das am besten zur Station passt.

## Fortschritt und Jukebox
- Sterne je Station werden gespeichert und zwischen Geräten abgeglichen. Die Regel `mapmax` gibt es im Abgleich
  schon: Pro Station zählt der beste Wert.
- In der Jukebox zeigt die Karte des Spiels „🗺️ Station 9 von 24 · ⭐ 21“.
- Bestenliste (optional): eine neue Wertung „Sterne gesamt“.
- Keine Tages-Challenge. Die Reise geht in deinem Tempo weiter.

## Technisch (für später)
- Neues Spiel im eigenen Ordner, wie Hit or Miss, mit den gemeinsamen Dateien (Design, Profil, Abgleich, Menü).
- Ein Datenpaket aus Gold Record (Jahre, Genres, Sprache) und dem Paket von Hit or Miss (Behauptungen).
  Es wird mit `update-songs.js` mitgebaut.
- Die Stationen stehen fest in einer Liste (Ort, Jahr, Jahrzehnt, Genre-Filter, Sprache). Die Songs je Station
  werden einmal fest ausgewählt, damit eine Station beim Wiederholen gleich bleibt. Gemischt wird nur die Reihenfolge.
- Aufwand: etwa so groß wie Hit or Miss. Am besten in einer eigenen Sitzung bauen.

## Offene Fragen an dich
1. **Name:** „Musik-Reise“, „On Tour“ oder etwas anderes?
2. **Erkennen** per Antippen aus 4 Titeln (schneller) oder Eintippen wie in Needle Drop (schwerer)?
3. **Fehler:** Ist eine Station mit wenig Sternen einfach nur „bestanden“, oder gibt es Leben (3 Fehler = neu starten)?
4. **Reihenfolge:** Streng von den 50ern bis heute, oder darf man auch in der Mitte anfangen (zum Beispiel bei
   den eigenen Lieblings-Jahrzehnten)?

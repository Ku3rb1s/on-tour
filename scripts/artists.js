/* On Tour – Profile der Stars für die Künstler-Touren (recherchiert am 08.11.2026, Wikipedia: Artikel und Diskografien).
   Nur Belegtes – fehlt etwas (Spitzname, Fan-Name), bleibt das Feld leer, statt etwas zu erfinden.

   albums: Studioalben (bei manchen auch prägende Mixtapes/EPs) [Titel, Jahr] – daraus werden die Stationen („Ären“):
           Jeder Song kommt zu dem Album, auf dem er bei Deezer liegt; sonst zum letzten Album vor seinem Jahr.
   from:   Herkunft (Stadt, Land) in 5 Sprachen     who: Band-Mitglieder oder bürgerlicher Name
   nick:   Spitzname (nur belegt)                   fans: Name der Fans (Wikipedia „List of fandom names“)
   ach:    Name des Erfolgs für die ganze Tour – der Fan-Name, sonst ein Song des Stars, der zum Abschluss passt */
'use strict';
const L = (de, en, fr, es, nb) => ({ de, en, fr, es, nb });
const P = (city, de, en, fr, es, nb) => L(`${city}, ${de}`, `${city}, ${en}`, `${city}, ${fr}`, `${city}, ${es}`, `${city}, ${nb}`);
const ENG = ['England', 'England', 'Angleterre', 'Inglaterra', 'England'];
const SWE = ['Schweden', 'Sweden', 'Suède', 'Suecia', 'Sverige'];
const CAN = ['Kanada', 'Canada', 'Canada', 'Canadá', 'Canada'];
const USA = s => [s, s, s, s, s];

module.exports = {
  'The Beatles': { from: P('Liverpool', ...ENG), who: 'John Lennon · Paul McCartney · George Harrison · Ringo Starr', nick: 'Fab Four', fans: 'Beatlemaniacs',
    albums: [['Please Please Me', 1963], ['With the Beatles', 1963], ["A Hard Day's Night", 1964], ['Beatles for Sale', 1964], ['Help!', 1965], ['Rubber Soul', 1965],
      ['Revolver', 1966], ["Sgt. Pepper's Lonely Hearts Club Band", 1967], ['The Beatles', 1968], ['Abbey Road', 1969], ['Let It Be', 1970]] },
  'Queen': { from: P('London', ...ENG), who: 'Freddie Mercury · Brian May · Roger Taylor · John Deacon', ach: 'We Are the Champions',
    albums: [['Queen', 1973], ['Queen II', 1974], ['Sheer Heart Attack', 1974], ['A Night at the Opera', 1975], ['A Day at the Races', 1976], ['News of the World', 1977], ['Jazz', 1978],
      ['The Game', 1980], ['Flash Gordon', 1980], ['Hot Space', 1982], ['The Works', 1984], ['A Kind of Magic', 1986], ['The Miracle', 1989], ['Innuendo', 1991], ['Made in Heaven', 1995]] },
  'ABBA': { from: P('Stockholm', ...SWE), who: 'Agnetha Fältskog · Björn Ulvaeus · Benny Andersson · Anni-Frid Lyngstad', ach: 'The Winner Takes It All',
    albums: [['Ring Ring', 1973], ['Waterloo', 1974], ['ABBA', 1975], ['Arrival', 1976], ['ABBA: The Album', 1977], ['Voulez-Vous', 1979], ['Super Trouper', 1980], ['The Visitors', 1981], ['Voyage', 2021]] },
  'Michael Jackson': { from: P('Gary', ...USA('Indiana (USA)')), nick: 'King of Pop', fans: 'Moonwalkers',
    albums: [['Off the Wall', 1979], ['Thriller', 1982], ['Bad', 1987], ['Dangerous', 1991], ['HIStory', 1995], ['Invincible', 2001]] },
  'Eminem': { from: P('Detroit', ...USA('Michigan (USA)')), who: 'Marshall Bruce Mathers III', fans: 'Stans',
    albums: [['The Slim Shady LP', 1999], ['The Marshall Mathers LP', 2000], ['The Eminem Show', 2002], ['Encore', 2004], ['Relapse', 2009], ['Recovery', 2010],
      ['The Marshall Mathers LP 2', 2013], ['Revival', 2017], ['Kamikaze', 2018], ['Music to Be Murdered By', 2020], ['The Death of Slim Shady (Coup de Grâce)', 2024]] },
  'Linkin Park': { from: P('Agoura Hills', 'Kalifornien (USA)', 'California (USA)', 'Californie (USA)', 'California (EE. UU.)', 'California (USA)'), who: 'Chester Bennington · Mike Shinoda', fans: 'Soldiers',
    albums: [['Hybrid Theory', 2000], ['Meteora', 2003], ['Minutes to Midnight', 2007], ['A Thousand Suns', 2010], ['Living Things', 2012], ['The Hunting Party', 2014],
      ['One More Light', 2017], ['From Zero', 2024]] },
  'Coldplay': { from: P('London', ...ENG), who: 'Chris Martin · Jonny Buckland · Guy Berryman · Will Champion', fans: 'Coldplayers',
    albums: [['Parachutes', 2000], ['A Rush of Blood to the Head', 2002], ['X&Y', 2005], ['Viva la Vida or Death and All His Friends', 2008], ['Mylo Xyloto', 2011],
      ['Ghost Stories', 2014], ['A Head Full of Dreams', 2015], ['Everyday Life', 2019], ['Music of the Spheres', 2021], ['Moon Music', 2024]] },
  'Beyoncé': { from: P('Houston', ...USA('Texas (USA)')), who: 'Beyoncé Giselle Knowles-Carter', nick: 'Queen B', fans: 'BeyHive',
    albums: [['Dangerously in Love', 2003], ["B'Day", 2006], ['I Am... Sasha Fierce', 2008], ['4', 2011], ['Beyoncé', 2013], ['Lemonade', 2016], ['Renaissance', 2022], ['Cowboy Carter', 2024]] },
  'Rihanna': { from: L('Saint Michael, Barbados', 'Saint Michael, Barbados', 'Saint Michael, Barbade', 'Saint Michael, Barbados', 'Saint Michael, Barbados'), who: 'Robyn Rihanna Fenty', fans: 'Navy',
    albums: [['Music of the Sun', 2005], ['A Girl Like Me', 2006], ['Good Girl Gone Bad', 2007], ['Rated R', 2009], ['Loud', 2010], ['Talk That Talk', 2011], ['Unapologetic', 2012], ['Anti', 2016]] },
  'Shakira': { from: P('Barranquilla', 'Kolumbien', 'Colombia', 'Colombie', 'Colombia', 'Colombia'), who: 'Shakira Isabel Mebarak Ripoll', fans: 'Shakifans',
    albums: [['Pies Descalzos', 1995], ['¿Dónde Están los Ladrones?', 1998], ['Laundry Service', 2001], ['Fijación Oral, Vol. 1', 2005], ['Oral Fixation, Vol. 2', 2005],
      ['She Wolf', 2009], ['Sale el Sol', 2010], ['Shakira', 2014], ['El Dorado', 2017], ['Las Mujeres Ya No Lloran', 2024]] },
  'Lady Gaga': { from: L('New York City', 'New York City', 'New York', 'Nueva York', 'New York City'), who: 'Stefani Joanne Angelina Germanotta', fans: 'Little Monsters',
    albums: [['The Fame', 2008], ['The Fame Monster', 2009], ['Born This Way', 2011], ['Artpop', 2013], ['Cheek to Cheek', 2014], ['Joanne', 2016], ['A Star Is Born', 2018],
      ['Chromatica', 2020], ['Love for Sale', 2021], ['Harlequin', 2024], ['Mayhem', 2025]] },
  'David Guetta': { from: P('Paris', 'Frankreich', 'France', 'France', 'Francia', 'Frankrike'), who: 'Pierre David Guetta', ach: 'Titanium',
    albums: [['Just a Little More Love', 2002], ['Guetta Blaster', 2004], ['Pop Life', 2007], ['One Love', 2009], ['Nothing but the Beat', 2011], ['Listen', 2014], ['7', 2018]] },
  'Avicii': { from: P('Stockholm', ...SWE), who: 'Tim Bergling', ach: 'Levels',
    albums: [['True', 2013], ['Stories', 2015], ['Avīci (01)', 2017], ['Tim', 2019]] },
  'Kygo': { from: L('Norwegen', 'Norway', 'Norvège', 'Noruega', 'Norge'), who: 'Kyrre Gørvell-Dahll', ach: 'Firestone',
    albums: [['Cloud Nine', 2016], ['Stargazing', 2017], ['Kids in Love', 2017], ['Golden Hour', 2020], ['Thrill of the Chase', 2022], ['Kygo', 2024]] },
  'Bruno Mars': { from: P('Honolulu', ...USA('Hawaii (USA)')), who: 'Peter Gene Hernandez', fans: 'Hooligans',
    albums: [['Doo-Wops & Hooligans', 2010], ['Unorthodox Jukebox', 2012], ['24K Magic', 2016], ['An Evening with Silk Sonic', 2021], ['The Romantic', 2026]] },
  'Ed Sheeran': { from: L('Framlingham, England', 'Framlingham, England', 'Framlingham, Angleterre', 'Framlingham, Inglaterra', 'Framlingham, England'), who: 'Edward Christopher Sheeran', fans: 'Sheerios',
    albums: [['+', 2011], ['x', 2014], ['÷', 2017], ['=', 2021], ['-', 2023], ['Play', 2025]] },
  'Taylor Swift': { from: P('West Reading', ...USA('Pennsylvania (USA)')), fans: 'Swifties',
    albums: [['Taylor Swift', 2006], ['Fearless', 2008], ['Speak Now', 2010], ['Red', 2012], ['1989', 2014], ['Reputation', 2017], ['Lover', 2019], ['Folklore', 2020],
      ['Evermore', 2020], ['Midnights', 2022], ['The Tortured Poets Department', 2024], ['The Life of a Showgirl', 2025]] },
  'The Weeknd': { from: P('Toronto', ...CAN), who: 'Abel Makkonen Tesfaye', fans: 'XO',
    albums: [['House of Balloons', 2011], ['Kiss Land', 2013], ['Beauty Behind the Madness', 2015], ['Starboy', 2016], ['My Dear Melancholy,', 2018], ['After Hours', 2020],
      ['Dawn FM', 2022], ['Hurry Up Tomorrow', 2025]] },
  'Drake': { from: P('Toronto', ...CAN), who: 'Aubrey Drake Graham', nick: '6 God', ach: 'Started from the Bottom',
    albums: [['So Far Gone', 2009], ['Thank Me Later', 2010], ['Take Care', 2011], ['Nothing Was the Same', 2013], ["If You're Reading This It's Too Late", 2015], ['Views', 2016],
      ['More Life', 2017], ['Scorpion', 2018], ['Certified Lover Boy', 2021], ['Honestly, Nevermind', 2022], ['Her Loss', 2022], ['For All the Dogs', 2023], ['Some Sexy Songs 4 U', 2025], ['Iceman', 2026]] },
  'Billie Eilish': { from: L('Los Angeles, Kalifornien (USA)', 'Los Angeles, California (USA)', 'Los Angeles, Californie (USA)', 'Los Ángeles, California (EE. UU.)', 'Los Angeles, California (USA)'), who: "Billie Eilish Pirate Baird O'Connell", ach: 'Happier Than Ever',
    albums: [["Don't Smile at Me", 2017], ['When We All Fall Asleep, Where Do We Go?', 2019], ['Happier Than Ever', 2021], ['Hit Me Hard and Soft', 2024]] },
  'Bad Bunny': { from: L('Bayamón, Puerto Rico', 'Bayamón, Puerto Rico', 'Bayamón, Porto Rico', 'Bayamón, Puerto Rico', 'Bayamón, Puerto Rico'), who: 'Benito Antonio Martínez Ocasio', ach: 'Me Porto Bonito',
    albums: [['X 100pre', 2018], ['Oasis', 2019], ['YHLQMDLG', 2020], ['El Último Tour del Mundo', 2020], ['Un Verano Sin Ti', 2022], ['Nadie Sabe Lo Que Va a Pasar Mañana', 2023], ['Debí Tirar Más Fotos', 2025]] },
  '50 Cent': { from: L('Queens, New York (USA)', 'Queens, New York (USA)', 'Queens, New York (USA)', 'Queens, Nueva York (EE. UU.)', 'Queens, New York (USA)'), who: 'Curtis James Jackson III', ach: 'In da Club',
    albums: [["Get Rich or Die Tryin'", 2003], ['The Massacre', 2005], ['Curtis', 2007], ['Before I Self Destruct', 2009], ['Animal Ambition', 2014]] },
  'Justin Bieber': { from: P('Stratford', 'Ontario (Kanada)', 'Ontario (Canada)', 'Ontario (Canada)', 'Ontario (Canadá)', 'Ontario (Canada)'), who: 'Justin Drew Bieber', fans: 'Beliebers',
    albums: [['My World', 2009], ['My World 2.0', 2010], ['Under the Mistletoe', 2011], ['Believe', 2012], ['Purpose', 2015], ['Changes', 2020], ['Justice', 2021], ['Swag', 2025], ['Swag II', 2025]] },
  'Travis Scott': { from: P('Houston', ...USA('Texas (USA)')), who: 'Jacques Bermon Webster II', fans: 'Ragers',
    albums: [['Days Before Rodeo', 2014], ['Rodeo', 2015], ['Birds in the Trap Sing McKnight', 2016], ['Huncho Jack, Jack Huncho', 2017], ['Astroworld', 2018], ['Utopia', 2023]] },
  'Post Malone': { from: P('Syracuse', ...USA('New York (USA)')), who: 'Austin Richard Post', ach: 'rockstar',
    albums: [['Stoney', 2016], ['Beerbongs & Bentleys', 2018], ["Hollywood's Bleeding", 2019], ['Twelve Carat Toothache', 2022], ['Austin', 2023], ['F-1 Trillion', 2024]] },
  'Juice WRLD': { from: P('Chicago', ...USA('Illinois (USA)')), who: 'Jarad Anthony Higgins', ach: 'Legends',
    albums: [['Goodbye & Good Riddance', 2018], ['Wrld on Drugs', 2018], ['Death Race for Love', 2019], ['Legends Never Die', 2020], ['Fighting Demons', 2021], ['The Party Never Ends', 2024]] },
};

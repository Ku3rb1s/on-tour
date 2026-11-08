// Logo- und Farbkonzepte für On Tour → logo-options/index.html (zum Auswählen, mit kleiner Vorschau der Karte)
// Aufruf: node scripts/logo-options.js                 (Übersicht schreiben)
//         node scripts/logo-options.js <id> > logo.svg  (ein Konzept als Logo ausgeben)
const fs = require('fs'), path = require('path');

// bg = Hintergrund, a = Hauptfarbe [hell, kräftig], b = zweite Farbe
const V = {
  route: {
    name: 'Tourplan', sub: 'Eine geschwungene Straße mit drei Stationen, oben wartet der Stern. Die Startstation ist eine Platte. Bernstein & Türkis auf Nachtblau – nach Reise und Abenteuer.',
    bg: ['#0f2a3f', '#06121d'], a: ['#fde68a', '#f59e0b'], b: ['#99f6e4', '#14b8a6'],
  },
  pin: {
    name: 'Platten-Pin', sub: 'Eine Kartennadel, deren Kopf eine Schallplatte ist. Koralle & Gold auf Tinte – sofort klar: Musik + Ort, auch ganz klein gut lesbar.',
    bg: ['#2b1636', '#110814'], a: ['#fecaca', '#f43f5e'], b: ['#fde68a', '#f59e0b'],
  },
  ticket: {
    name: 'Tour-Ticket', sub: 'Eine Konzertkarte mit Abriss, darauf Platte und drei Sterne. Gold auf Rot – nach Konzertabend und Backstage.',
    bg: ['#4a0f1d', '#1a0509'], a: ['#fde68a', '#f59e0b'], b: ['#fecdd3', '#fb7185'],
  },
  bus: {
    name: 'Tourbus', sub: 'Ein kleiner Tourbus, die Räder sind Platten, auf dem Dach die Sterne. Minze & Gelb auf Violett – verspielt und fröhlich.',
    bg: ['#2e1a5c', '#120a26'], a: ['#a7f3d0', '#10b981'], b: ['#fde68a', '#facc15'],
  },
};

const grad = (id, [a, b], x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shadow = p => `<filter id="${p}sh" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".55"/></filter>`;
const glow = (p, c) => `<radialGradient id="${p}gl" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${c}" stop-opacity=".32"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const star = (cx, cy, r, fill, rot = 0) => {
  const pts = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2 + rot, rr = i % 2 ? r * .45 : r; pts.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1)); }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke-linejoin="round"/>`;
};
const vinyl = (cx, cy, r, label) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0a0810"/>
  <g fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="${Math.max(1.5, r / 30)}">${[.86, .72, .58].map(k => `<circle cx="${cx}" cy="${cy}" r="${(r * k).toFixed(1)}"/>`).join('')}</g>
  <path d="M${cx} ${cy}L${cx - r * .7} ${cy - r * .71}A${r} ${r} 0 0 1 ${cx - r * .38} ${cy - r * .92}Z" fill="#fff" fill-opacity=".1"/>
  <circle cx="${cx}" cy="${cy}" r="${(r * .36).toFixed(1)}" fill="${label}"/><circle cx="${cx}" cy="${cy}" r="${(r * .07).toFixed(1)}" fill="#0a0810"/>`;

function logo(id, p = '') {
  const v = V[id];
  let d = grad(p + 'bg', v.bg, 1, 1) + grad(p + 'a', v.a) + grad(p + 'b', v.b) + shadow(p) + glow(p, v.a[1]), b = `<rect width="512" height="512" fill="url(#${p}gl)"/>`;
  if (id === 'route') {
    const road = 'M150 440 C 150 360, 360 380, 360 300 S 150 230, 170 160';
    b += `<path d="${road}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="58" stroke-linecap="round" transform="translate(0 10)"/>
      <path d="${road}" fill="none" stroke="url(#${p}b)" stroke-width="46" stroke-linecap="round"/>
      <path d="${road}" fill="none" stroke="#06121d" stroke-opacity=".55" stroke-width="5" stroke-dasharray="16 18" stroke-linecap="round"/>
      <g filter="url(#${p}sh)">${vinyl(150, 432, 58, `url(#${p}a)`)}</g>
      <g filter="url(#${p}sh)"><circle cx="360" cy="300" r="30" fill="#fff"/><circle cx="360" cy="300" r="17" fill="url(#${p}b)"/></g>
      <g filter="url(#${p}sh)">${star(176, 128, 88, `url(#${p}a)`)}</g>
      ${star(176, 132, 40, '#fff8')}`;
  } else if (id === 'pin') {
    b += `<g filter="url(#${p}sh)"><path d="M256 470 L180 300 A110 110 0 1 1 332 300 Z" fill="url(#${p}a)"/></g>
      ${vinyl(256, 220, 92, `url(#${p}b)`)}
      <ellipse cx="256" cy="478" rx="56" ry="12" fill="#000" fill-opacity=".35"/>`;
  } else if (id === 'ticket') {
    const tk = 'M86 150 h340 a0 0 0 0 1 0 0 v60 a28 28 0 0 0 0 56 v96 h-340 v-96 a28 28 0 0 0 0 -56 z';
    b += `<g filter="url(#${p}sh)" transform="rotate(-10 256 256)"><path d="${tk}" fill="url(#${p}a)"/>
        <path d="M330 162 v236" stroke="#4a0f1d" stroke-opacity=".5" stroke-width="5" stroke-dasharray="12 12"/>
        ${vinyl(205, 281, 82, `url(#${p}b)`)}
        ${star(378, 210, 22, '#4a0f1d')}${star(378, 281, 22, '#4a0f1d')}${star(378, 352, 22, '#4a0f1d')}</g>`;
  } else if (id === 'bus') {
    b += `<g filter="url(#${p}sh)"><rect x="70" y="176" width="372" height="190" rx="46" fill="url(#${p}a)"/>
        <rect x="70" y="300" width="372" height="22" fill="#064e3b" fill-opacity=".35"/>
        ${[0, 1, 2].map(i => `<rect x="${108 + i * 92}" y="206" width="70" height="64" rx="14" fill="#123b33" fill-opacity=".75"/>`).join('')}
        <rect x="384" y="206" width="38" height="96" rx="12" fill="#123b33" fill-opacity=".75"/></g>
      <g filter="url(#${p}sh)">${vinyl(156, 368, 50, `url(#${p}b)`)}${vinyl(356, 368, 50, `url(#${p}b)`)}</g>
      ${star(170, 132, 34, `url(#${p}b)`, -.2)}${star(256, 116, 40, `url(#${p}b)`)}${star(342, 132, 34, `url(#${p}b)`, .2)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${d}</defs><rect width="512" height="512" fill="url(#${p}bg)"/>${b}</svg>`;
}

if (process.argv[2]) { process.stdout.write(logo(process.argv[2])); process.exit(0); }

// Kleine Kartenvorschau (drei Stationen) in den Farben des Konzepts
const mapPrev = (id, p) => {
  const v = V[id];
  const st = [['Memphis', 1956, '🎸', 3], ['Liverpool', 1963, '🎤', 2], ['Detroit', 1965, '🎙️', 0]];
  return `<div class="map" style="--a:${v.a[1]};--a2:${v.a[0]};--b:${v.b[1]};--bg1:${v.bg[0]};--bg2:${v.bg[1]}">
    <svg class="road" viewBox="0 0 200 300" preserveAspectRatio="none"><path d="M100 290 C 30 240, 170 200, 100 150 S 30 60, 100 10" fill="none" stroke="var(--b)" stroke-opacity=".35" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 14"/></svg>
    ${st.map(([c, y, ic, s], i) => `<div class="stn ${i === 2 ? 'next' : ''}" style="top:${[220, 120, 22][i]}px;left:${[38, 56, 38][i]}%"><span class="dot">${ic}</span><b>${c}</b><small>${y}</small><i>${s ? '★'.repeat(s) + '☆'.repeat(3 - s) : 'neu'}</i></div>`).join('')}
  </div>`;
};

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>On Tour – Logo-Entwürfe</title><style>
body{margin:0;background:#0c0c0f;color:#eee;font:16px/1.45 system-ui,sans-serif;padding:24px}
h1{font-size:1.5rem;margin:0 0 6px}p.lead{color:#aaa;margin:0 0 24px;max-width:46em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.opt{background:#17171c;border:1px solid #2a2a33;border-radius:22px;padding:18px}
.opt h2{margin:0 0 4px;font-size:1.15rem}.opt h2 small{color:#888;font-weight:500;font-size:.85rem;margin-left:6px}
.opt p{margin:0 0 14px;color:#aaa;font-size:.9rem}
.row{display:flex;gap:14px;align-items:flex-end}
.big{width:140px;height:140px;border-radius:32px;overflow:hidden;box-shadow:0 12px 30px -10px #000}
.small{width:44px;height:44px;border-radius:11px;overflow:hidden}.tiny{width:20px;height:20px;border-radius:5px;overflow:hidden}
.big svg,.small svg,.tiny svg{width:100%;height:100%;display:block}
.map{position:relative;height:300px;margin-top:16px;border-radius:18px;overflow:hidden;background:linear-gradient(180deg,var(--bg1),var(--bg2))}
.road{position:absolute;inset:0;width:100%;height:100%}
.stn{position:absolute;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px;font-size:.78rem}
.dot{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-size:1.3rem;background:radial-gradient(circle at 50% 35%,#ffffff30,#0006);border:3px solid var(--a)}
.stn b{margin-top:4px}.stn small{color:#bbb}.stn i{font-style:normal;color:var(--a2);letter-spacing:1px}
.stn.next .dot{box-shadow:0 0 0 6px color-mix(in srgb,var(--a) 30%,transparent);animation:p 1.6s infinite}
@keyframes p{50%{box-shadow:0 0 0 12px transparent}}
</style></head><body>
<h1>On Tour – Logo-Entwürfe</h1>
<p class="lead">Vier Ideen zur Auswahl, jeweils groß, als App-Symbol und ganz klein (Browser-Tab). Darunter die Karte in den Farben des Entwurfs. Sag einfach, welcher dir gefällt – auch Mischungen gehen (z. B. Form von A, Farben von B).</p>
<div class="grid">${Object.keys(V).map((id, i) => `<div class="opt"><h2>${'ABCD'[i]} · ${V[id].name}<small>${id}</small></h2><p>${V[id].sub}</p>
<div class="row"><div class="big">${logo(id, id + 'B')}</div><div class="small">${logo(id, id + 'S')}</div><div class="tiny">${logo(id, id + 'T')}</div></div>${mapPrev(id)}</div>`).join('')}</div>
</body></html>`;
const out = path.join(__dirname, '..', 'logo-options', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('logo-options/index.html geschrieben');

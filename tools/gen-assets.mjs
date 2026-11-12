/**
 * Generates every SVG asset used by the site (products, categories, scenes, logos,
 * payment marks). Run with:  node tools/gen-assets.mjs
 * Output: frontend/assets/img/**
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(ROOT, 'frontend', 'assets', 'img');

const out = (rel, svg) => {
  const p = join(IMG, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, svg.replace(/\n\s*\n/g, '\n').trim() + '\n', 'utf8');
};

/* ------------------------------------------------------------------ palette */
const C = {
  green: '#1f6b2e',
  greenDark: '#14532d',
  greenMid: '#2f8f43',
  greenLight: '#7bbd6a',
  leaf: '#4c9a3f',
  cream: '#f7efd9',
  creamDark: '#e6d6ab',
  sand: '#efe3c4',
  gold: '#d99b2b',
  goldLight: '#f0c65a',
  amber: '#c8811f',
  brown: '#8a5a2b',
  brownDark: '#5e3b18',
  clay: '#b4703a',
  red: '#b5342a',
  redLight: '#d9563f',
  white: '#ffffff',
  ink: '#243029',
  glass: '#cfe3d2',
};

const wrap = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"${extra}>${body}</svg>`;

/* Soft studio backdrop used behind every product shot. */
const studio = (w, h, tint = '#f4efe1') => `
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="70%">
    <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${tint}"/>
  </radialGradient>
  <linearGradient id="shelf" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#00000012"/><stop offset="1" stop-color="#00000000"/>
  </linearGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<ellipse cx="${w / 2}" cy="${h - 26}" rx="${w * 0.36}" ry="14" fill="#00000010"/>`;

/* A couple of decorative leaves, positioned by caller. */
const leaf = (x, y, s, rot, fill = C.leaf) => `
<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0 0 C 26 -20 62 -14 74 6 C 52 30 18 26 0 0 Z" fill="${fill}"/>
  <path d="M2 2 C 24 6 50 10 70 8" stroke="#ffffff66" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</g>`;

const grain = (cx, cy, r, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.55}" fill="${fill}" transform="rotate(-18 ${cx} ${cy})"/>`;

/* --------------------------------------------------------------- bottle art */
function bottle({ w = 420, h = 420, liquid = '#e6a92a', liquid2 = '#c9861a', cap = C.greenDark, label = C.cream, labelText = C.greenDark, tint }) {
  const cx = w / 2;
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(24, 96, 0.7, -18)}
${leaf(w - 96, h - 120, 0.62, 152, C.greenMid)}
<defs>
  <linearGradient id="lq" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${liquid2}"/><stop offset="0.42" stop-color="${liquid}"/><stop offset="1" stop-color="${liquid2}"/>
  </linearGradient>
  <linearGradient id="gl" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff00"/><stop offset="0.22" stop-color="#ffffffcc"/><stop offset="0.4" stop-color="#ffffff22"/><stop offset="1" stop-color="#00000018"/>
  </linearGradient>
</defs>
<!-- neck + cap -->
<rect x="${cx - 26}" y="72" width="52" height="46" rx="8" fill="${liquid2}" opacity=".55"/>
<rect x="${cx - 32}" y="52" width="64" height="34" rx="9" fill="${cap}"/>
<rect x="${cx - 32}" y="60" width="64" height="5" fill="#ffffff2e"/>
<!-- body -->
<path d="M${cx - 74} 168 q0 -34 30 -50 l0 -6 h88 l0 6 q30 16 30 50 v152 q0 24 -24 24 h-100 q-24 0 -24 -24 z" fill="url(#lq)"/>
<path d="M${cx - 74} 168 q0 -34 30 -50 l0 -6 h88 l0 6 q30 16 30 50 v152 q0 24 -24 24 h-100 q-24 0 -24 -24 z" fill="url(#gl)" opacity=".65"/>
<!-- label -->
<rect x="${cx - 66}" y="196" width="132" height="92" rx="10" fill="${label}" stroke="#00000018"/>
<circle cx="${cx}" cy="222" r="15" fill="none" stroke="${labelText}" stroke-width="2.5"/>
${leaf(cx - 11, 222, 0.3, -22, labelText)}
<rect x="${cx - 44}" y="246" width="88" height="7" rx="3.5" fill="${labelText}"/>
<rect x="${cx - 34}" y="260" width="68" height="5" rx="2.5" fill="${labelText}" opacity=".55"/>
<rect x="${cx - 24}" y="272" width="48" height="5" rx="2.5" fill="${labelText}" opacity=".35"/>`);
}

/* ----------------------------------------------------------------- pouch art */
function pouch({ w = 420, h = 420, bag = '#e7d6ac', bag2 = '#cdb478', band = C.greenDark, seed = '#efe0bb', tint, seedCount = 26 }) {
  const cx = w / 2;
  let seeds = '';
  for (let i = 0; i < seedCount; i++) {
    const a = (i * 137.5) % 360, r = 18 + (i % 6) * 9;
    seeds += grain(cx + Math.cos(a) * r * 1.5, 300 + Math.sin(a) * r * 0.42, 4.6, seed);
  }
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(22, 92, 0.66, -16)}
${leaf(w - 92, 108, 0.5, 168, C.greenMid)}
<defs>
  <linearGradient id="bagg" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${bag2}"/><stop offset="0.32" stop-color="${bag}"/><stop offset="0.74" stop-color="${bag}"/><stop offset="1" stop-color="${bag2}"/>
  </linearGradient>
</defs>
<!-- gusset top -->
<path d="M${cx - 84} 108 h168 l-14 26 h-140 z" fill="${bag2}"/>
<rect x="${cx - 92}" y="96" width="184" height="18" rx="6" fill="${band}"/>
<!-- body -->
<path d="M${cx - 98} 132 h196 v186 q0 22 -22 22 h-152 q-22 0 -22 -22 z" fill="url(#bagg)"/>
<path d="M${cx - 98} 132 h196 v186 q0 22 -22 22 h-152 q-22 0 -22 -22 z" fill="#ffffff" opacity=".14"/>
<!-- window -->
<rect x="${cx - 62}" y="268" width="124" height="60" rx="8" fill="#ffffff" opacity=".85"/>
<clipPath id="win"><rect x="${cx - 62}" y="268" width="124" height="60" rx="8"/></clipPath>
<g clip-path="url(#win)"><rect x="${cx - 62}" y="268" width="124" height="60" fill="${seed}"/>${seeds}</g>
<rect x="${cx - 62}" y="268" width="124" height="60" rx="8" fill="none" stroke="#00000022"/>
<!-- label block -->
<rect x="${cx - 74}" y="152" width="148" height="98" rx="10" fill="#fffdf6" stroke="#00000014"/>
<circle cx="${cx}" cy="182" r="17" fill="none" stroke="${band}" stroke-width="2.5"/>
${leaf(cx - 12, 182, 0.32, -22, band)}
<rect x="${cx - 50}" y="210" width="100" height="8" rx="4" fill="${band}"/>
<rect x="${cx - 38}" y="226" width="76" height="5" rx="2.5" fill="${band}" opacity=".5"/>
<rect x="${cx - 26}" y="238" width="52" height="5" rx="2.5" fill="${band}" opacity=".32"/>`);
}

/* ------------------------------------------------------------------- jar art */
function jar({ w = 420, h = 420, fill = '#b8391f', lid = C.greenDark, label = '#fffdf6', accent = C.greenDark, tint, chunky = true }) {
  const cx = w / 2;
  let bits = '';
  if (chunky) for (let i = 0; i < 16; i++) {
    const a = (i * 97) % 360, r = 12 + (i % 5) * 11;
    bits += `<rect x="${cx + Math.cos(a) * r - 8}" y="${252 + Math.sin(a) * r * 0.6 - 6}" width="17" height="13" rx="4" fill="#ffffff" opacity=".2" transform="rotate(${a % 45} ${cx} 252)"/>`;
  }
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(20, 100, 0.62, -14)}
${leaf(w - 88, h - 128, 0.55, 158, C.greenMid)}
<defs>
  <linearGradient id="jf" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#00000033"/><stop offset="0.3" stop-color="#ffffff00"/><stop offset="0.72" stop-color="#ffffff00"/><stop offset="1" stop-color="#00000033"/>
  </linearGradient>
</defs>
<!-- lid -->
<rect x="${cx - 68}" y="92" width="136" height="34" rx="10" fill="${lid}"/>
<rect x="${cx - 68}" y="100" width="136" height="5" fill="#ffffff26"/>
<rect x="${cx - 58}" y="124" width="116" height="12" rx="4" fill="${lid}" opacity=".8"/>
<!-- glass body -->
<rect x="${cx - 78}" y="134" width="156" height="196" rx="22" fill="#e9f1ea"/>
<rect x="${cx - 68}" y="146" width="136" height="176" rx="16" fill="${fill}"/>
<g>${bits}</g>
<rect x="${cx - 78}" y="134" width="156" height="196" rx="22" fill="url(#jf)"/>
<rect x="${cx - 62}" y="150" width="14" height="150" rx="7" fill="#ffffff" opacity=".28"/>
<!-- label -->
<rect x="${cx - 62}" y="204" width="124" height="88" rx="9" fill="${label}" stroke="#00000018"/>
<circle cx="${cx}" cy="232" r="15" fill="none" stroke="${accent}" stroke-width="2.4"/>
${leaf(cx - 11, 232, 0.3, -22, accent)}
<rect x="${cx - 42}" y="256" width="84" height="7" rx="3.5" fill="${accent}"/>
<rect x="${cx - 30}" y="270" width="60" height="5" rx="2.5" fill="${accent}" opacity=".5"/>`);
}

/* ------------------------------------------------------------------ soap art */
function soap({ w = 420, h = 420, body = '#cdb083', body2 = '#b08f61', stamp = C.brownDark, tint }) {
  const bar = (x, y, s, rot) => `
<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0 26 q0 -14 14 -14 h150 q14 0 14 14 v58 q0 14 -14 14 h-150 q-14 0 -14 -14 z" fill="${body2}"/>
  <path d="M0 20 q0 -14 14 -14 h150 q14 0 14 14 v46 q0 14 -14 14 h-150 q-14 0 -14 -14 z" fill="${body}"/>
  <ellipse cx="90" cy="40" rx="46" ry="20" fill="none" stroke="${stamp}" stroke-width="3" opacity=".55"/>
  ${leaf(70, 40, 0.24, -20, stamp)}
  <rect x="46" y="54" width="88" height="5" rx="2.5" fill="${stamp}" opacity=".5"/>
</g>`;
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(18, 104, 0.66, -12)}
${leaf(w - 96, h - 116, 0.6, 160, C.greenMid)}
${bar(112, 216, 1.02, -6)}
${bar(96, 158, 0.94, 4)}
<ellipse cx="${w / 2}" cy="${h - 42}" rx="120" ry="16" fill="#00000010"/>`);
}

/* ------------------------------------------------------------------ tin/can */
function tin({ w = 420, h = 420, body = '#f2c94c', body2 = '#d9a726', lid = '#c98f1c', label = '#fffdf6', accent = C.greenDark, tint }) {
  const cx = w / 2;
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(22, 98, 0.62, -16)}
${leaf(w - 92, 112, 0.5, 166, C.greenMid)}
<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${body2}"/><stop offset="0.34" stop-color="${body}"/><stop offset="0.7" stop-color="${body}"/><stop offset="1" stop-color="${body2}"/>
</linearGradient></defs>
<ellipse cx="${cx}" cy="126" rx="86" ry="22" fill="${lid}"/>
<ellipse cx="${cx}" cy="120" rx="86" ry="22" fill="${body}"/>
<ellipse cx="${cx}" cy="120" rx="60" ry="14" fill="${lid}" opacity=".45"/>
<path d="M${cx - 86} 126 v168 q0 26 86 26 t86 -26 v-168 z" fill="url(#tg)"/>
<rect x="${cx - 70}" y="178" width="140" height="104" rx="10" fill="${label}" stroke="#00000018"/>
<circle cx="${cx}" cy="210" r="17" fill="none" stroke="${accent}" stroke-width="2.5"/>
${leaf(cx - 12, 210, 0.32, -22, accent)}
<rect x="${cx - 48}" y="238" width="96" height="8" rx="4" fill="${accent}"/>
<rect x="${cx - 36}" y="254" width="72" height="5" rx="2.5" fill="${accent}" opacity=".5"/>
<rect x="${cx - 24}" y="266" width="48" height="5" rx="2.5" fill="${accent}" opacity=".32"/>`);
}

/* ------------------------------------------------------------- bowl (powder) */
function bowl({ w = 420, h = 420, powder = '#c98f3f', powder2 = '#a86f26', tint }) {
  const cx = w / 2;
  let dots = '';
  for (let i = 0; i < 30; i++) {
    const a = (i * 137.5) % 360, r = 10 + (i % 7) * 9;
    dots += grain(cx + Math.cos(a) * r * 1.6, 214 + Math.sin(a) * r * 0.45, 4, '#ffffff44');
  }
  return wrap(w, h, `
${studio(w, h, tint)}
${leaf(20, 98, 0.66, -16)}
${leaf(w - 92, h - 120, 0.58, 158, C.greenMid)}
<path d="M${cx - 118} 216 q0 106 118 106 t118 -106 z" fill="#8a5a2b"/>
<path d="M${cx - 118} 216 q0 96 118 96 t118 -96 z" fill="#a3703a"/>
<ellipse cx="${cx}" cy="216" rx="118" ry="34" fill="#6f4620"/>
<ellipse cx="${cx}" cy="212" rx="106" ry="29" fill="${powder2}"/>
<ellipse cx="${cx}" cy="206" rx="98" ry="25" fill="${powder}"/>
<g opacity=".8">${dots}</g>
<path d="M${cx - 40} 194 q40 -26 80 0 q-40 12 -80 0 z" fill="#ffffff" opacity=".18"/>`);
}

/* ------------------------------------------------------------------- honey */
function honeyJar({ w = 420, h = 420 }) {
  const cx = w / 2;
  return wrap(w, h, `
${studio(w, h, '#fbf3dd')}
${leaf(20, 100, 0.6, -14)}
${leaf(w - 88, h - 124, 0.54, 158, C.greenMid)}
<defs><linearGradient id="hn" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#f4bc3f"/><stop offset="0.5" stop-color="#e09a1c"/><stop offset="1" stop-color="#c07d12"/>
</linearGradient></defs>
<rect x="${cx - 46}" y="104" width="92" height="26" rx="9" fill="${C.greenDark}"/>
<path d="M${cx - 92} 148 q0 -18 22 -18 h140 q22 0 22 18 v96 q0 86 -92 86 t-92 -86 z" fill="#eaf1ea"/>
<path d="M${cx - 80} 152 h160 v92 q0 74 -80 74 t-80 -74 z" fill="url(#hn)"/>
<rect x="${cx - 74}" y="158" width="14" height="140" rx="7" fill="#ffffff" opacity=".3"/>
<rect x="${cx - 62}" y="212" width="124" height="82" rx="9" fill="#fffdf6" stroke="#00000018"/>
<g transform="translate(${cx - 18} 226) scale(0.9)">
  <path d="M18 0 l16 9 v18 l-16 9 -16 -9 v-18 z" fill="none" stroke="${C.greenDark}" stroke-width="2.6"/>
</g>
<rect x="${cx - 42}" y="264" width="84" height="7" rx="3.5" fill="${C.greenDark}"/>
<rect x="${cx - 28}" y="278" width="56" height="5" rx="2.5" fill="${C.greenDark}" opacity=".5"/>`);
}

/* ------------------------------------------------------------- combo (3 jars) */
function combo({ w = 420, h = 420 }) {
  const mini = (x, y, s, fill) => `
<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-44" y="-8" width="88" height="24" rx="8" fill="${C.greenDark}"/>
  <rect x="-52" y="18" width="104" height="140" rx="18" fill="#e9f1ea"/>
  <rect x="-44" y="26" width="88" height="124" rx="13" fill="${fill}"/>
  <rect x="-40" y="30" width="10" height="106" rx="5" fill="#ffffff" opacity=".3"/>
  <rect x="-40" y="74" width="80" height="56" rx="7" fill="#fffdf6" stroke="#00000018"/>
  <rect x="-26" y="92" width="52" height="6" rx="3" fill="${C.greenDark}"/>
  <rect x="-18" y="106" width="36" height="4" rx="2" fill="${C.greenDark}" opacity=".5"/>
</g>`;
  return wrap(w, h, `
${studio(w, h, '#f7efdc')}
${leaf(18, 96, 0.6, -14)}
${leaf(w - 84, h - 122, 0.52, 158, C.greenMid)}
${mini(120, 178, 0.86, '#a63a20')}
${mini(300, 178, 0.86, '#7a8c22')}
${mini(210, 150, 1.06, '#b8531f')}`);
}

/* ------------------------------------------------------------------ products */
const products = {
  'groundnut-oil': bottle({ liquid: '#e8b23a', liquid2: '#c98a19', tint: '#f6f0de' }),
  'coconut-oil': bottle({ liquid: '#f6f4ea', liquid2: '#dcd7c2', cap: C.green, tint: '#f2f5ef' }),
  'sesame-oil': bottle({ liquid: '#d99b2b', liquid2: '#a86b12', tint: '#f7f0dd' }),
  'sunflower-oil': bottle({ liquid: '#f2ce4a', liquid2: '#d3a41c', tint: '#f9f4e0' }),
  'castor-oil': bottle({ liquid: '#e3e6c8', liquid2: '#bcc19a', cap: C.greenMid, tint: '#f3f5ea' }),
  'mustard-oil': bottle({ liquid: '#d6a022', liquid2: '#a97812', tint: '#f7f1de' }),

  'ponni-rice': pouch({ bag: '#efe3c2', bag2: '#d3c396', seed: '#f7f2e4', tint: '#f6f3e6' }),
  'mappillai-samba': pouch({ bag: '#e0c9a6', bag2: '#bda179', seed: '#c98a6a', tint: '#f6efe2' }),
  'karuppu-kavuni': pouch({ bag: '#d5cbbd', bag2: '#a89a8a', band: '#3b2a3f', seed: '#4a3a4f', tint: '#f2eeea' }),
  'kichadi-samba': pouch({ bag: '#ecdfbc', bag2: '#cbb98c', seed: '#f2e9d3', tint: '#f7f3e5' }),
  'seeraga-samba': pouch({ bag: '#f0e6c9', bag2: '#d2c39a', seed: '#f6f0dd', tint: '#f8f4e7' }),

  'kambu-millet': pouch({ bag: '#dfd3b2', bag2: '#bcae88', seed: '#9d8a63', tint: '#f5f2e6' }),
  'thinai-millet': pouch({ bag: '#ecdfb6', bag2: '#cbba85', seed: '#d9c37e', tint: '#f8f4e3' }),
  'ragi-millet': pouch({ bag: '#d9c9b4', bag2: '#b09a80', seed: '#7d5f43', tint: '#f4efe8' }),
  'varagu-millet': pouch({ bag: '#e6dcbd', bag2: '#c3b68f', seed: '#c0aa78', tint: '#f6f3e6' }),
  'samai-millet': pouch({ bag: '#eee3c4', bag2: '#cbbd93', seed: '#e2d3a8', tint: '#f8f4e8' }),
  'millet-mix': pouch({ bag: '#e9dcba', bag2: '#c6b489', seed: '#c9a86e', tint: '#f7f3e4', seedCount: 34 }),

  'instant-ragi-malt': tin({ body: '#c69a6c', body2: '#a77a4c', lid: '#8f6236', tint: '#f5efe6' }),
  'millet-dosa-mix': pouch({ bag: '#f0e7cd', bag2: '#cfc298', seed: '#e8dcbb', tint: '#f8f5ea' }),
  'instant-kanji-mix': pouch({ bag: '#e7ddc6', bag2: '#c4b795', seed: '#dccfae', tint: '#f7f4ea' }),

  'health-mix-powder': pouch({ bag: '#d9b98c', bag2: '#b7965f', seed: '#a8763f', tint: '#f6f0e4' }),
  'sathu-maavu': pouch({ bag: '#e3c79c', bag2: '#c0a271', seed: '#b58650', tint: '#f7f2e6' }),
  'badam-health-mix': tin({ body: '#e8c98f', body2: '#c9a662', lid: '#a8833f', tint: '#f8f2e4' }),

  'ragi-flour': bowl({ powder: '#a3805e', powder2: '#8a6647', tint: '#f5f0e8' }),
  'kambu-flour': bowl({ powder: '#c2ab84', powder2: '#a48d64', tint: '#f6f2e8' }),
  'wheat-flour': bowl({ powder: '#e3cfa4', powder2: '#c4ad7c', tint: '#f8f4e9' }),
  'rice-flour': bowl({ powder: '#f4efe0', powder2: '#d9d1bb', tint: '#f8f6ee' }),

  'multani-mitti-soap': soap({ body: '#cdb083', body2: '#ac8d5e', tint: '#f6f2e6' }),
  'neem-soap': soap({ body: '#8fae5e', body2: '#6f8c44', stamp: '#2f4a1c', tint: '#f0f4e8' }),
  'turmeric-soap': soap({ body: '#e5bd4a', body2: '#c39a26', stamp: '#7a5a10', tint: '#f9f4e2' }),
  'sandal-soap': soap({ body: '#dfc39c', body2: '#bea078', stamp: '#6f5232', tint: '#f7f3ea' }),
  'herbal-hair-oil': bottle({ liquid: '#3f6b2c', liquid2: '#2b4d1c', cap: '#1d3512', tint: '#eef3ea' }),

  'pickle-combo': combo({}),
  'mango-pickle': jar({ fill: '#c98418', lid: C.greenDark, tint: '#f8f2e0' }),
  'lemon-pickle': jar({ fill: '#d9b520', lid: C.greenDark, tint: '#f9f5e0' }),
  'idli-podi': bowl({ powder: '#b8431f', powder2: '#963314', tint: '#f7ede6' }),
  'curry-leaf-podi': bowl({ powder: '#4d6b25', powder2: '#3a5219', tint: '#eff3e8' }),
  'sambar-powder': bowl({ powder: '#b03a18', powder2: '#8d2c10', tint: '#f8ede7' }),

  'cow-ghee': jar({ fill: '#f0c750', lid: C.greenDark, tint: '#faf5e2', chunky: false }),
  'a2-ghee': jar({ fill: '#f6d979', lid: C.green, tint: '#faf6e6', chunky: false }),
  'forest-honey': honeyJar({}),
  'nattu-sakkarai': pouch({ bag: '#c99a63', bag2: '#a87c45', seed: '#8a5f30', tint: '#f6f0e5' }),

  'hibiscus-hair-powder': pouch({ bag: '#c9788f', bag2: '#a85a70', band: '#5e2033', seed: '#6b4a52', tint: '#f8eef1' }),
  'shikakai-powder': pouch({ bag: '#b09a6e', bag2: '#8f7c50', seed: '#7a6740', tint: '#f5f2e6' }),
  'amla-powder': pouch({ bag: '#a8b86a', bag2: '#8a9a4c', seed: '#6f7d38', tint: '#f2f5e8' }),
  'neem-powder': pouch({ bag: '#7fa055', bag2: '#5f7f38', seed: '#4a6b28', tint: '#f0f4e8' }),
};
for (const [k, v] of Object.entries(products)) out(`products/${k}.svg`, v);

/* ---------------------------------------------------------- category tiles */
function tile(inner, tint = '#f6f2e4') {
  return wrap(300, 220, `
<defs><radialGradient id="tg2" cx="50%" cy="40%" r="72%">
  <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${tint}"/>
</radialGradient></defs>
<rect width="300" height="220" fill="url(#tg2)"/>
<ellipse cx="150" cy="198" rx="104" ry="12" fill="#00000010"/>
${inner}`);
}

const catTiles = {
  'cold-pressed-oils': tile(`
${leaf(10, 54, 0.5, -18)}${leaf(232, 150, 0.44, 158, C.greenMid)}
<g transform="translate(150 118) scale(0.62)">
  <rect x="-20" y="-104" width="40" height="24" rx="7" fill="${C.greenDark}"/>
  <path d="M-52 -60 q0 -22 20 -34 h64 q20 12 20 34 v100 q0 16 -16 16 h-72 q-16 0 -16 -16 z" fill="#e2a52c"/>
  <rect x="-44" y="-24" width="88" height="60" rx="8" fill="#fdf7e6" stroke="#00000018"/>
  <rect x="-28" y="-4" width="56" height="7" rx="3.5" fill="${C.greenDark}"/>
</g>
<g transform="translate(74 150) scale(0.5)">
  <ellipse cx="0" cy="0" rx="46" ry="17" fill="#8a5a2b"/><ellipse cx="0" cy="-5" rx="46" ry="17" fill="#a3703a"/>
  ${grain(-16, -8, 8, '#d9b27a')}${grain(6, -10, 8, '#c9a069')}${grain(24, -6, 8, '#d9b27a')}
</g>`, '#f7f1de'),

  'traditional-rice': tile(`
${leaf(12, 50, 0.46, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<path d="M96 152 q0 -46 54 -46 t54 46 z" fill="#8a5a2b"/>
<ellipse cx="150" cy="152" rx="66" ry="16" fill="#a3703a"/>
<path d="M92 106 q22 -34 58 -34 t58 34 z" fill="#f6f1e2"/>
<g>${grain(122, 96, 6, '#e8e0c8')}${grain(150, 88, 6, '#efe8d4')}${grain(178, 98, 6, '#e8e0c8')}${grain(136, 102, 5, '#f4efdf')}${grain(166, 102, 5, '#f4efdf')}</g>`, '#f8f4e6'),

  millets: tile(`
${leaf(12, 52, 0.46, -16)}${leaf(234, 150, 0.4, 158, C.greenMid)}
<ellipse cx="98" cy="150" rx="52" ry="16" fill="#8a5a2b"/><ellipse cx="98" cy="144" rx="52" ry="16" fill="#a3703a"/>
<ellipse cx="98" cy="140" rx="42" ry="12" fill="#c9a86e"/>
<ellipse cx="204" cy="152" rx="46" ry="14" fill="#8a5a2b"/><ellipse cx="204" cy="146" rx="46" ry="14" fill="#a3703a"/>
<ellipse cx="204" cy="142" rx="36" ry="10" fill="#e8dcb4"/>
<path d="M150 118 q-10 -44 6 -62 q16 20 8 62 z" fill="${C.greenMid}"/>`, '#f7f3e2'),

  'instant-foods': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<ellipse cx="150" cy="148" rx="76" ry="22" fill="#8a5a2b"/><ellipse cx="150" cy="140" rx="76" ry="22" fill="#a3703a"/>
<ellipse cx="150" cy="136" rx="62" ry="17" fill="#f4efdd"/>
<circle cx="126" cy="130" r="15" fill="#fbf7ea" stroke="#e0d6ba"/><circle cx="160" cy="126" r="17" fill="#fbf7ea" stroke="#e0d6ba"/>
<circle cx="186" cy="134" r="13" fill="#fbf7ea" stroke="#e0d6ba"/>
<path d="M118 96 q6 -14 -4 -22 M150 90 q6 -14 -4 -22" stroke="#c9bda0" stroke-width="3" fill="none" stroke-linecap="round"/>`, '#f8f5ea'),

  'health-mix': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<ellipse cx="150" cy="152" rx="72" ry="20" fill="#8a5a2b"/><ellipse cx="150" cy="144" rx="72" ry="20" fill="#a3703a"/>
<ellipse cx="150" cy="140" rx="58" ry="15" fill="#c08a4a"/>
<path d="M112 130 q38 -30 76 0 q-38 12 -76 0 z" fill="#d9a866"/>
<circle cx="96" cy="112" r="11" fill="#e8d5ae"/><circle cx="118" cy="100" r="9" fill="#d9bd88"/>
<circle cx="200" cy="108" r="10" fill="#e8d5ae"/>`, '#f7f2e4'),

  'flour-varieties': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<g>
  <rect x="66" y="112" width="58" height="42" rx="6" fill="#e0c9a0"/><rect x="66" y="112" width="58" height="10" rx="5" fill="#efdcb8"/>
  <rect x="122" y="98" width="58" height="56" rx="6" fill="#d9bd8e"/><rect x="122" y="98" width="58" height="10" rx="5" fill="#e8d3a8"/>
  <rect x="178" y="118" width="56" height="36" rx="6" fill="#e8d3ae"/><rect x="178" y="118" width="56" height="9" rx="4.5" fill="#f2e2c2"/>
</g>
<rect x="66" y="152" width="168" height="8" rx="4" fill="#c9ae80"/>`, '#f8f4e8'),

  'bath-body-care': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<g transform="translate(70 108)">
  <rect x="0" y="16" width="92" height="34" rx="10" fill="#3f6b2c"/><rect x="0" y="10" width="92" height="28" rx="9" fill="#5f8c3f"/>
  <ellipse cx="46" cy="24" rx="24" ry="10" fill="none" stroke="#2b4a1a" stroke-width="2.5" opacity=".6"/>
</g>
<g transform="translate(150 132)">
  <rect x="0" y="16" width="86" height="32" rx="10" fill="#3f6b2c"/><rect x="0" y="10" width="86" height="26" rx="9" fill="#6f9a4a"/>
  <ellipse cx="43" cy="23" rx="22" ry="9" fill="none" stroke="#2b4a1a" stroke-width="2.5" opacity=".6"/>
</g>`, '#f0f4e8'),

  'pickles-powders': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<g transform="translate(104 96) scale(0.62)">
  <rect x="-38" y="-16" width="76" height="20" rx="7" fill="${C.greenDark}"/>
  <rect x="-44" y="6" width="88" height="112" rx="16" fill="#e9f1ea"/><rect x="-36" y="14" width="72" height="96" rx="11" fill="#b8391f"/>
  <rect x="-30" y="52" width="60" height="40" rx="6" fill="#fffdf6"/>
</g>
<g transform="translate(196 104) scale(0.56)">
  <rect x="-38" y="-16" width="76" height="20" rx="7" fill="${C.greenDark}"/>
  <rect x="-44" y="6" width="88" height="112" rx="16" fill="#e9f1ea"/><rect x="-36" y="14" width="72" height="96" rx="11" fill="#c98418"/>
  <rect x="-30" y="52" width="60" height="40" rx="6" fill="#fffdf6"/>
</g>`, '#f8f0e2'),

  'ghee-honey': tile(`
${leaf(12, 52, 0.44, -16)}${leaf(236, 152, 0.4, 158, C.greenMid)}
<g transform="translate(150 100) scale(0.72)">
  <rect x="-30" y="-14" width="60" height="20" rx="7" fill="${C.greenDark}"/>
  <path d="M-56 22 q0 -14 16 -14 h80 q16 0 16 14 v46 q0 46 -56 46 t-56 -46 z" fill="#eaf1ea"/>
  <path d="M-46 26 h92 v42 q0 38 -46 38 t-46 -38 z" fill="#f0c134"/>
  <rect x="-38" y="52" width="76" height="34" rx="6" fill="#fffdf6"/>
</g>`, '#faf5e0'),

  'herbs-hair-care': tile(`
${leaf(14, 56, 0.5, -18)}${leaf(228, 148, 0.46, 158, C.greenMid)}
<g transform="translate(150 116) scale(0.6)">
  <rect x="-18" y="-96" width="36" height="22" rx="7" fill="#1d3512"/>
  <path d="M-46 -54 q0 -20 18 -30 h56 q18 10 18 30 v92 q0 14 -14 14 h-64 q-14 0 -14 -14 z" fill="#3f6b2c"/>
  <rect x="-38" y="-20" width="76" height="52" rx="7" fill="#f2f6ec" stroke="#00000018"/>
  <rect x="-24" y="-2" width="48" height="6" rx="3" fill="#2b4a1a"/>
</g>
${leaf(66, 148, 0.4, -34, '#5f8c3f')}${leaf(196, 152, 0.36, 24, '#5f8c3f')}`, '#eff4e8'),
};
for (const [k, v] of Object.entries(catTiles)) out(`categories/${k}.svg`, v);

/* --------------------------------------------------------------- hero scene */
out('scenes/hero.svg', wrap(760, 520, `
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#eef6e6"/><stop offset="1" stop-color="#f9f4e2"/>
  </linearGradient>
  <linearGradient id="oil" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#c98a19"/><stop offset="0.4" stop-color="#eab63c"/><stop offset="1" stop-color="#c98a19"/>
  </linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6f4620"/><stop offset="0.45" stop-color="#8a5a2b"/><stop offset="1" stop-color="#5e3b18"/>
  </linearGradient>
</defs>
<rect width="760" height="520" fill="url(#sky)"/>
<circle cx="150" cy="120" r="150" fill="#ffffff" opacity=".55"/>
<!-- leaf frame -->
${leaf(8, 60, 1.15, -22, '#63a54f')}${leaf(0, 150, 0.9, 12, '#7bbd6a')}
${leaf(690, 40, 1.0, 160, '#63a54f')}${leaf(700, 130, 0.8, 196, '#8fc97c')}
${leaf(20, 470, 0.85, -46, '#5f9c4a')}${leaf(690, 462, 0.8, 220, '#5f9c4a')}
<!-- wooden chekku (cold press) -->
<g transform="translate(300 92)">
  <rect x="0" y="0" width="34" height="230" rx="8" fill="url(#wood)"/>
  <rect x="120" y="0" width="34" height="230" rx="8" fill="url(#wood)"/>
  <rect x="-14" y="-4" width="182" height="26" rx="8" fill="#5e3b18"/>
  <rect x="-14" y="188" width="182" height="24" rx="8" fill="#5e3b18"/>
  <rect x="46" y="26" width="62" height="150" rx="10" fill="#a3703a"/>
  <rect x="60" y="40" width="34" height="120" rx="8" fill="#6f4620"/>
  <circle cx="77" cy="100" r="20" fill="#c9a069"/><circle cx="77" cy="100" r="9" fill="#6f4620"/>
  <path d="M-30 212 h214" stroke="#4a2d11" stroke-width="10" stroke-linecap="round"/>
</g>
<!-- oil bottles -->
<g transform="translate(474 148)">
  <rect x="-14" y="-30" width="28" height="18" rx="6" fill="${C.greenDark}"/>
  <path d="M-38 6 q0 -20 16 -30 v-6 h44 v6 q16 10 16 30 v128 q0 16 -16 16 h-44 q-16 0 -16 -16 z" fill="url(#oil)"/>
  <rect x="-30" y="52" width="60" height="52" rx="7" fill="#fbf3dd" stroke="#00000018"/>
  <rect x="-18" y="70" width="36" height="6" rx="3" fill="${C.greenDark}"/>
  <rect x="-12" y="82" width="24" height="4" rx="2" fill="${C.greenDark}" opacity=".55"/>
</g>
<g transform="translate(560 176)">
  <rect x="-12" y="-26" width="24" height="16" rx="5" fill="${C.green}"/>
  <path d="M-32 6 q0 -18 14 -26 v-6 h36 v6 q14 8 14 26 v106 q0 14 -14 14 h-36 q-14 0 -14 -14 z" fill="#eab63c"/>
  <rect x="-25" y="44" width="50" height="44" rx="6" fill="#fbf3dd" stroke="#00000018"/>
  <rect x="-15" y="60" width="30" height="5" rx="2.5" fill="${C.greenDark}"/>
</g>
<g transform="translate(630 200)">
  <rect x="-11" y="-24" width="22" height="15" rx="5" fill="${C.greenDark}"/>
  <path d="M-28 4 q0 -16 12 -24 v-5 h32 v5 q12 8 12 24 v92 q0 12 -12 12 h-32 q-12 0 -12 -12 z" fill="#d99b2b"/>
  <rect x="-22" y="38" width="44" height="38" rx="6" fill="#fbf3dd" stroke="#00000018"/>
  <rect x="-13" y="52" width="26" height="5" rx="2.5" fill="${C.greenDark}"/>
</g>
<!-- rice sack -->
<g transform="translate(150 300)">
  <path d="M-70 26 h140 l-12 22 h-116 z" fill="#cdb480"/>
  <rect x="-78" y="14" width="156" height="16" rx="6" fill="${C.greenDark}"/>
  <path d="M-84 46 h168 v122 q0 18 -18 18 h-132 q-18 0 -18 -18 z" fill="#e7d9b2"/>
  <rect x="-56" y="70" width="112" height="60" rx="9" fill="#fffdf6" stroke="#00000014"/>
  <circle cx="0" cy="90" r="13" fill="none" stroke="${C.greenDark}" stroke-width="2.4"/>
  ${leaf(-9, 90, 0.24, -22, C.greenDark)}
  <rect x="-34" y="110" width="68" height="6" rx="3" fill="${C.greenDark}"/>
  <rect x="-44" y="140" width="88" height="40" rx="7" fill="#ffffff" opacity=".8"/>
  ${grain(-24, 160, 5, '#e8dcb8')}${grain(-4, 156, 5, '#efe4c6')}${grain(16, 162, 5, '#e8dcb8')}
</g>
<!-- wooden bowl of rice -->
<g transform="translate(470 400)">
  <path d="M-92 0 q0 74 92 74 t92 -74 z" fill="#6f4620"/>
  <path d="M-92 0 q0 66 92 66 t92 -66 z" fill="#8a5a2b"/>
  <ellipse cx="0" cy="0" rx="92" ry="26" fill="#5e3b18"/>
  <ellipse cx="0" cy="-4" rx="82" ry="22" fill="#f4efdf"/>
  <path d="M-46 -14 q46 -26 92 0 q-46 12 -92 0 z" fill="#fbf8ee"/>
</g>
<!-- millet bowl -->
<g transform="translate(636 428)">
  <path d="M-54 0 q0 44 54 44 t54 -44 z" fill="#6f4620"/>
  <ellipse cx="0" cy="0" rx="54" ry="15" fill="#5e3b18"/>
  <ellipse cx="0" cy="-3" rx="47" ry="12" fill="#d9b97e"/>
</g>
<!-- ground shadow -->
<ellipse cx="380" cy="494" rx="330" ry="18" fill="#00000010"/>`));

/* --------------------------------------------------------------- farm scene */
out('scenes/farm.svg', wrap(560, 300, `
<defs>
  <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#dcefd2"/><stop offset="1" stop-color="#f4f0da"/>
  </linearGradient>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8fbb63"/><stop offset="1" stop-color="#5f8c3f"/>
  </linearGradient>
</defs>
<rect width="560" height="300" fill="url(#fsky)"/>
<circle cx="470" cy="58" r="34" fill="#f4d77a" opacity=".85"/>
<path d="M0 168 q140 -26 280 -6 t280 -10 v148 h-560 z" fill="url(#field)"/>
<path d="M0 196 q150 -20 290 -2 t270 -12" stroke="#4c7a30" stroke-width="3" fill="none" opacity=".6"/>
<!-- distant trees -->
<g opacity=".8">
  <circle cx="60" cy="150" r="26" fill="#4c8a3a"/><rect x="56" y="152" width="7" height="26" fill="#6f4620"/>
  <circle cx="108" cy="158" r="18" fill="#5f9c4a"/><rect x="105" y="160" width="6" height="20" fill="#6f4620"/>
  <circle cx="510" cy="146" r="30" fill="#4c8a3a"/><rect x="506" y="150" width="8" height="28" fill="#6f4620"/>
</g>
<!-- bullocks -->
<g transform="translate(300 210)">
  <g fill="#e8e2d2">
    <path d="M-108 0 q-8 -30 24 -34 h74 q30 4 24 34 z"/><rect x="-104" y="0" width="12" height="36" rx="5"/>
    <rect x="-56" y="0" width="12" height="36" rx="5"/><rect x="4" y="0" width="12" height="36" rx="5"/><rect x="52" y="0" width="12" height="36" rx="5"/>
    <path d="M6 -34 q34 -6 40 12 q-6 16 -30 14 z"/>
  </g>
  <path d="M38 -34 q10 -18 24 -14 M52 -32 q12 -14 24 -8" stroke="#cbbfa6" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="52" cy="-20" r="3" fill="#3d352a"/>
  <path d="M-96 -30 q26 -14 60 -12" stroke="#8a5a2b" stroke-width="5" fill="none" stroke-linecap="round"/>
</g>
<!-- plough + farmer -->
<g transform="translate(196 216)">
  <path d="M0 0 l-46 30 M-46 30 l-14 18" stroke="#6f4620" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M-60 48 l16 6 -8 12 z" fill="#5e3b18"/>
</g>
<g transform="translate(158 176)">
  <circle cx="0" cy="0" r="13" fill="#c98a5e"/>
  <path d="M-18 -6 q18 -18 36 0 z" fill="#e6d6a8"/>
  <path d="M-12 14 h24 l6 44 h-36 z" fill="#3f7ba8"/>
  <rect x="-14" y="58" width="12" height="34" rx="5" fill="#e8e2d2"/><rect x="4" y="58" width="12" height="34" rx="5" fill="#e8e2d2"/>
  <path d="M12 18 q26 8 34 22" stroke="#c98a5e" stroke-width="8" fill="none" stroke-linecap="round"/>
</g>
<!-- foreground crop -->
<g>
  ${Array.from({ length: 26 }, (_, i) => {
    const x = 8 + i * 22, hh = 26 + (i % 4) * 8;
    return `<path d="M${x} 300 q4 -${hh} 0 -${hh + 14}" stroke="#4c7a30" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="${x}" cy="${300 - hh - 16}" rx="4" ry="9" fill="#d9c07e"/>`;
  }).join('')}
</g>`));

/* ------------------------------------------------------------ banner scenes */
const banner = (id, tint, inner) => out(`scenes/${id}.svg`, wrap(260, 190, `
<rect width="260" height="190" fill="none"/>${inner}`, ' preserveAspectRatio="xMidYMid meet"'));

banner('banner-oils', null, `
<g transform="translate(130 100)">
  <g transform="translate(-58 8) scale(0.78)">
    <rect x="-13" y="-84" width="26" height="17" rx="6" fill="#0f3d20"/>
    <path d="M-34 -50 q0 -18 14 -27 v-6 h40 v6 q14 9 14 27 v110 q0 14 -14 14 h-40 q-14 0 -14 -14 z" fill="#eab63c"/>
    <rect x="-27" y="-6" width="54" height="44" rx="6" fill="#fbf3dd"/>
    <rect x="-16" y="10" width="32" height="5" rx="2.5" fill="#0f3d20"/>
  </g>
  <g transform="translate(4 0) scale(0.92)">
    <rect x="-14" y="-88" width="28" height="18" rx="6" fill="#0f3d20"/>
    <path d="M-36 -52 q0 -19 15 -28 v-7 h42 v7 q15 9 15 28 v116 q0 15 -15 15 h-42 q-15 0 -15 -15 z" fill="#f0c243"/>
    <rect x="-29" y="-6" width="58" height="46" rx="6" fill="#fbf3dd"/>
    <rect x="-17" y="11" width="34" height="5" rx="2.5" fill="#0f3d20"/>
  </g>
  <g transform="translate(62 12) scale(0.72)">
    <rect x="-12" y="-80" width="24" height="16" rx="5" fill="#0f3d20"/>
    <path d="M-32 -48 q0 -17 13 -25 v-7 h38 v7 q13 8 13 25 v104 q0 13 -13 13 h-38 q-13 0 -13 -13 z" fill="#d99b2b"/>
    <rect x="-25" y="-6" width="50" height="40" rx="6" fill="#fbf3dd"/>
    <rect x="-15" y="9" width="30" height="5" rx="2.5" fill="#0f3d20"/>
  </g>
  <g transform="translate(-14 78)">
    <ellipse cx="0" cy="0" rx="70" ry="14" fill="#00000022"/>
    ${grain(-40, -4, 8, '#d9b27a')}${grain(-18, -8, 8, '#c9a069')}${grain(6, -4, 8, '#d9b27a')}${grain(30, -8, 8, '#c9a069')}${grain(50, -2, 7, '#d9b27a')}
  </g>
</g>`);

banner('banner-rice', null, `
<g transform="translate(130 104)">
  <path d="M-104 26 q0 -54 52 -54 t52 54 z" fill="#f4efdf"/>
  <ellipse cx="-52" cy="26" rx="52" ry="14" fill="#e0d6bb"/>
  <path d="M4 30 q0 -44 44 -44 t44 44 z" fill="#e8c96f"/>
  <ellipse cx="48" cy="30" rx="44" ry="12" fill="#d3b25a"/>
  <path d="M-100 44 h196" stroke="#c9bda0" stroke-width="6" stroke-linecap="round"/>
  <g>${Array.from({ length: 7 }, (_, i) => grain(-92 + i * 12, 58, 6, '#efe6cd')).join('')}</g>
  <g>${Array.from({ length: 6 }, (_, i) => grain(10 + i * 13, 62, 6, '#d9b95f')).join('')}</g>
  <path d="M-30 -34 q-8 -40 6 -56 q14 18 6 56 z" fill="#7bbd6a"/>
</g>`);

banner('banner-soaps', null, `
<g transform="translate(130 100)">
  <g transform="translate(-66 6) rotate(-8)">
    <rect x="0" y="14" width="92" height="34" rx="10" fill="#5f8c3f"/><rect x="0" y="6" width="92" height="30" rx="9" fill="#8fae5e"/>
    <ellipse cx="46" cy="21" rx="24" ry="10" fill="none" stroke="#3f6b2c" stroke-width="2.6" opacity=".6"/>
  </g>
  <g transform="translate(-24 -40) rotate(6)">
    <rect x="0" y="14" width="88" height="32" rx="10" fill="#ac8d5e"/><rect x="0" y="6" width="88" height="28" rx="9" fill="#cdb083"/>
    <ellipse cx="44" cy="20" rx="22" ry="9" fill="none" stroke="#6f5232" stroke-width="2.6" opacity=".6"/>
  </g>
  ${leaf(-88, 62, 0.5, -24, '#5f9c4a')}${leaf(30, 66, 0.44, 16, '#63a54f')}
</g>`);

/* ------------------------------------------------------------------- logos */
const logoBody = (scale = 1) => `
<g transform="scale(${scale})">
  <g transform="translate(6 6)">
    <path d="M20 44 C 20 18 42 4 66 4 C 66 30 46 46 20 44 Z" fill="#3f8f3a"/>
    <path d="M4 30 C 22 30 34 40 38 54 C 20 58 6 48 4 30 Z" fill="#2f7a2c"/>
    <path d="M34 56 C 40 40 52 26 66 18" stroke="#1d5e1f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M14 62 q22 -6 44 2" stroke="#d99b2b" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</g>`;

out('logo.svg', wrap(230, 78, `
<rect width="230" height="78" fill="none"/>
${logoBody(0.92)}
<text x="80" y="30" font-family="'Noto Sans Tamil','Latha',sans-serif" font-size="25" font-weight="700" fill="#1f6b2e">சண்முகி</text>
<text x="80" y="50" font-family="'Noto Sans Tamil','Latha',sans-serif" font-size="14" fill="#3f7a2f">ஆயில் &amp; புட்ஸ்</text>
<text x="80" y="68" font-family="Georgia,serif" font-size="10.5" letter-spacing="1.6" fill="#8a7a52">TRADITIONAL &amp; NATURAL</text>`));

out('logo-light.svg', wrap(230, 78, `
<rect width="230" height="78" fill="none"/>
${logoBody(0.92)}
<text x="80" y="30" font-family="'Noto Sans Tamil','Latha',sans-serif" font-size="25" font-weight="700" fill="#2f8f43">சண்முகி</text>
<text x="80" y="50" font-family="'Noto Sans Tamil','Latha',sans-serif" font-size="14" fill="#4c9a3f">ஆயில் &amp; புட்ஸ்</text>
<text x="80" y="68" font-family="Georgia,serif" font-size="10.5" letter-spacing="1.6" fill="#b8a878">TRADITIONAL &amp; NATURAL</text>`));

out('favicon.svg', wrap(64, 64, `
<rect width="64" height="64" rx="14" fill="#1f6b2e"/>
<path d="M18 42 C 18 20 36 10 52 10 C 52 32 36 44 18 42 Z" fill="#8fd07a"/>
<path d="M10 30 C 22 30 30 36 33 46 C 20 49 11 42 10 30 Z" fill="#5fae4a"/>
<path d="M14 54 q20 -6 38 2" stroke="#f0c243" stroke-width="4" fill="none" stroke-linecap="round"/>`));

/* ---------------------------------------------------------- payment marks */
out('pay/visa.svg', wrap(64, 40, `
<rect width="64" height="40" rx="6" fill="#ffffff" stroke="#dfd8c6"/>
<text x="32" y="26" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="14" font-style="italic" font-weight="bold" fill="#1a1f71">VISA</text>`));
out('pay/mastercard.svg', wrap(64, 40, `
<rect width="64" height="40" rx="6" fill="#ffffff" stroke="#dfd8c6"/>
<circle cx="27" cy="20" r="11" fill="#eb001b"/><circle cx="39" cy="20" r="11" fill="#f79e1b" opacity=".9"/>
<path d="M33 11 a11 11 0 0 0 0 18 a11 11 0 0 0 0 -18" fill="#ff5f00"/>`));
out('pay/rupay.svg', wrap(64, 40, `
<rect width="64" height="40" rx="6" fill="#ffffff" stroke="#dfd8c6"/>
<text x="30" y="25" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="bold" fill="#097b3c">Ru</text>
<text x="46" y="25" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="bold" fill="#f47216">Pay</text>
<path d="M8 30 l8 -6 8 6" stroke="#097b3c" stroke-width="2" fill="none"/>`));
out('pay/upi.svg', wrap(64, 40, `
<rect width="64" height="40" rx="6" fill="#ffffff" stroke="#dfd8c6"/>
<text x="30" y="26" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="bold" fill="#3f6b2c">UPI</text>
<path d="M46 12 l8 8 -8 8 z" fill="#f47216"/><path d="M52 12 l8 8 -8 8 z" fill="#097b3c"/>`));

/* ------------------------------------------------------------------ avatars */
const avatar = (id, skin, cloth) => out(`avatars/${id}.svg`, wrap(64, 64, `
<circle cx="32" cy="32" r="32" fill="#eef3e6"/>
<circle cx="32" cy="25" r="12" fill="${skin}"/>
<path d="M8 64 q6 -22 24 -22 t24 22 z" fill="${cloth}"/>
<path d="M20 20 q12 -14 24 0 q-12 -6 -24 0 z" fill="#3d2a1c"/>`));
avatar('a1', '#d9a37a', '#b5484f');
avatar('a2', '#c98a5e', '#3f7ba8');
avatar('a3', '#e0b48c', '#5f8c3f');
avatar('a4', '#cf9a6e', '#8a5a2b');
avatar('a5', '#dda87f', '#6f4f9c');

/* ------------------------------------------------------------------- recipes */
const recipe = (id, a, b, inner) => out(`recipes/${id}.svg`, wrap(400, 260, `
<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="400" height="260" fill="url(#rg)"/>
${leaf(12, 40, 0.6, -20, '#5f9c4a')}${leaf(322, 190, 0.55, 158, '#4c8a3a')}
${inner}`));

recipe('kanji', '#f4efdd', '#e6dcbd', `
<g transform="translate(200 150)">
  <path d="M-84 0 q0 66 84 66 t84 -66 z" fill="#8a5a2b"/><ellipse cx="0" cy="0" rx="84" ry="23" fill="#6f4620"/>
  <ellipse cx="0" cy="-3" rx="74" ry="19" fill="#f2ead4"/>
  <path d="M-30 -40 q6 -16 -4 -26 M6 -44 q6 -16 -4 -26" stroke="#c9bda0" stroke-width="4" fill="none" stroke-linecap="round"/>
</g>`);
recipe('dosa', '#f7f0dc', '#ecdfb8', `
<g transform="translate(200 148)">
  <ellipse cx="0" cy="0" rx="104" ry="34" fill="#3d3226" opacity=".18"/>
  <ellipse cx="0" cy="-8" rx="100" ry="32" fill="#e0b46a"/>
  <ellipse cx="0" cy="-8" rx="76" ry="22" fill="#efd292"/>
  <circle cx="-30" cy="-10" r="9" fill="#c98418"/><circle cx="16" cy="-14" r="7" fill="#c98418"/>
  <g transform="translate(56 -46)"><circle cx="0" cy="0" r="20" fill="#f4efdf"/><circle cx="0" cy="0" r="14" fill="#fbf8ee"/></g>
</g>`);
recipe('podi-rice', '#f8f0e4', '#eddcc4', `
<g transform="translate(200 150)">
  <path d="M-80 0 q0 60 80 60 t80 -60 z" fill="#a3703a"/><ellipse cx="0" cy="0" rx="80" ry="22" fill="#6f4620"/>
  <ellipse cx="0" cy="-4" rx="70" ry="18" fill="#f6f1e2"/>
  <ellipse cx="0" cy="-10" rx="26" ry="9" fill="#b8431f"/>
  <ellipse cx="26" cy="-6" rx="12" ry="5" fill="#e2a52c"/>
</g>`);
recipe('millet-upma', '#f4f5e4', '#e2e6c2', `
<g transform="translate(200 150)">
  <path d="M-82 0 q0 62 82 62 t82 -62 z" fill="#8a5a2b"/><ellipse cx="0" cy="0" rx="82" ry="22" fill="#6f4620"/>
  <ellipse cx="0" cy="-4" rx="72" ry="19" fill="#e2cf9a"/>
  <circle cx="-24" cy="-8" r="7" fill="#4c7a30"/><circle cx="10" cy="-12" r="6" fill="#b8431f"/><circle cx="34" cy="-6" r="6" fill="#4c7a30"/>
</g>`);
recipe('ghee-sweet', '#faf3df', '#f0e2b8', `
<g transform="translate(200 150)">
  <ellipse cx="0" cy="30" rx="96" ry="20" fill="#00000012"/>
  <g fill="#e0a94a"><rect x="-70" y="-10" width="52" height="34" rx="9"/><rect x="-8" y="-24" width="52" height="48" rx="9"/><rect x="52" y="-4" width="44" height="28" rx="9"/></g>
  <g fill="#f0c65a"><rect x="-66" y="-14" width="44" height="26" rx="8"/><rect x="-4" y="-28" width="44" height="38" rx="8"/></g>
</g>`);
recipe('herbal-hair', '#eff5e8', '#dcebd0', `
<g transform="translate(200 146)">
  <rect x="-16" y="-86" width="32" height="20" rx="7" fill="#1d3512"/>
  <path d="M-42 -50 q0 -18 16 -27 v-6 h52 v6 q16 9 16 27 v96 q0 14 -14 14 h-56 q-14 0 -14 -14 z" fill="#3f6b2c"/>
  <rect x="-34" y="-14" width="68" height="48" rx="7" fill="#f2f6ec"/>
  <rect x="-20" y="4" width="40" height="6" rx="3" fill="#2b4a1a"/>
  ${leaf(-96, 54, 0.5, -30, '#5f9c4a')}${leaf(48, 58, 0.46, 20, '#5f9c4a')}
</g>`);

/* -------------------------------------------------------------- store map */
out('scenes/map.svg', wrap(560, 320, `
<rect width="560" height="320" fill="#eef2e6"/>
<g stroke="#dbe3cf" stroke-width="2">
  ${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${i * 40} H560"/>`).join('')}
  ${Array.from({ length: 15 }, (_, i) => `<path d="M${i * 40} 0 V320"/>`).join('')}
</g>
<path d="M0 180 q140 -40 280 0 t280 -20" stroke="#c9d6b8" stroke-width="16" fill="none"/>
<path d="M200 0 v320" stroke="#c9d6b8" stroke-width="14" fill="none"/>
<g>
  <circle cx="200" cy="180" r="34" fill="#1f6b2e" opacity=".14"/>
  <path d="M200 152 a18 18 0 0 1 18 18 c0 14 -18 30 -18 30 s-18 -16 -18 -30 a18 18 0 0 1 18 -18 z" fill="#1f6b2e"/>
  <circle cx="200" cy="170" r="7" fill="#ffffff"/>
</g>
<rect x="240" y="150" width="150" height="44" rx="8" fill="#ffffff" stroke="#dfd8c6"/>
<text x="252" y="170" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#1f6b2e">Shanmuga Organics</text>
<text x="252" y="186" font-family="Arial,sans-serif" font-size="10" fill="#6b7a6e">Dharapuram Road, Erode</text>`));

out('leaf-spray.svg', wrap(320, 320, `
<g opacity=".9">
  ${leaf(40, 60, 1.3, -30, '#7fc06c')}
  ${leaf(30, 140, 1.05, 6, '#9ad089')}
  ${leaf(120, 30, 1.15, 42, '#63a54f')}
  ${leaf(150, 170, .9, -14, '#8ac977')}
  ${leaf(60, 220, .8, 28, '#a3d992')}
  <path d="M20 40 C 90 90 140 160 170 250" stroke="#5f9c4a" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
</g>`));

console.log('Generated SVG assets into frontend/assets/img');

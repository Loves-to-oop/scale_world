// solar.js -- the solar system with the Earth as a 12-inch desk globe: 1 : 41.8 million.
// Built into solar_system.html by build.py (three.js and the Earth and Moon maps are inlined).
//
// Everything is at its real size and real distance for that scale, at its real position on the day
// you open the page (planet orbits from JPL's approximate Keplerian elements, valid 1800-2050).
// The ground is the plane of the Earth's orbit (the ecliptic); a planet's height above or below it
// becomes a hill or a valley on the road that leads to it.

const K = 0.3048 / 12742e3;                  // metres here per real metre: 12 inches / Earth's diameter
const AU = 1.495978707e11 * K;               // 3.58 km
const C_HERE = 299792458 * K;                // the speed of light here: 7.17 m/s
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ec9ec);
scene.fog = new THREE.FogExp2(0xb4d3ec, IS_HEADSET ? 1.2e-5 : 3.5e-6);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, IS_HEADSET ? 0.05 : 0.004, 400000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.65;
scene.add(new THREE.HemisphereLight(0xe4f0ff, 0x56663e, 1.5));
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const deg = Math.PI / 180;
const fmtM = m => m >= 1000 ? `${(m / 1000).toFixed(m >= 1e4 ? 0 : 2)} km` : m >= 1 ? `${m.toFixed(m >= 10 ? 0 : 1)} m` : m >= 0.01 ? `${(m * 100).toFixed(1)} cm` : `${(m * 1000).toFixed(1)} mm`;
const fmtKm = km => km >= 1e9 ? `${(km / 1e9).toFixed(2)} billion km` : km >= 1e6 ? `${(km / 1e6).toFixed(1)} million km` : `${Math.round(km).toLocaleString()} km`;
const fmtT = s => s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min` : s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${s.toFixed(1)} s`;

// ---------- where everything is today ----------
const NOW = new Date(), JD = NOW.getTime() / 86400000 + 2440587.5, D = JD - 2451545, T = D / 36525;
// a, e, I, L, long. of perihelion, long. of node (J2000) and their rates per century -- Standish, JPL
const EL = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
  pluto:   [39.48211675, -0.00031596, 0.24882730, 0.00005170, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
};
function helio(id) {                                   // heliocentric ecliptic position, AU
  const q = EL[id], a = q[0] + q[1] * T, e = q[2] + q[3] * T, I = (q[4] + q[5] * T) * deg, L = q[6] + q[7] * T, wb = q[8] + q[9] * T, Om = (q[10] + q[11] * T) * deg;
  const w = wb * deg - Om; let Mn = ((L - wb) % 360 + 540) % 360 - 180; Mn *= deg;
  let E = Mn + e * Math.sin(Mn); for (let k = 0; k < 10; k++) E -= (E - e * Math.sin(E) - Mn) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
  return V3((cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp, sw * sI * xp + cw * sI * yp);
}
const EPS = 23.4393 * deg;
const eclToWorld = v => V3(v.x, v.z, -v.y);          // ecliptic x, y, z → world: the ground is the ecliptic, its north is up
const eqToEcl = v => V3(v.x, v.y * Math.cos(EPS) + v.z * Math.sin(EPS), -v.y * Math.sin(EPS) + v.z * Math.cos(EPS));
const eqToWorld = v => eclToWorld(eqToEcl(v));
const radec = (ra, dec) => eqToWorld(V3(Math.cos(dec * deg) * Math.cos(ra * deg), Math.cos(dec * deg) * Math.sin(ra * deg), Math.sin(dec * deg)));
const EARTH = helio("earth");
const Y0 = 1.06;                                       // the globe's centre above the ground: the ecliptic runs through it

// ---------- the bodies ----------
const BODIES = [
  { id: "sun", name: "the Sun", dkm: 1392700, pole: [286.13, 63.87], col: "#ffd27a", beacon: 0xffd040 },
  { id: "mercury", name: "Mercury", dkm: 4879, pole: [281.01, 61.42], col: "#9a948c", beacon: 0xb0a898 },
  { id: "venus", name: "Venus", dkm: 12104, pole: [272.76, 67.16], col: "#e8d9a8", beacon: 0xf0e0a0 },
  { id: "mars", name: "Mars", dkm: 6779, pole: [317.68, 52.89], col: "#c1440e", beacon: 0xff6030 },
  { id: "jupiter", name: "Jupiter", dkm: 139820, pole: [268.06, 64.50], col: "#d8b48a", beacon: 0xf0c090 },
  { id: "saturn", name: "Saturn", dkm: 116460, pole: [40.59, 83.54], col: "#e3cf9a", beacon: 0xf0e0a0 },
  { id: "uranus", name: "Uranus", dkm: 50724, pole: [257.31, -15.18], col: "#a6e0e8", beacon: 0x90f0ff },
  { id: "neptune", name: "Neptune", dkm: 49244, pole: [299.36, 43.46], col: "#4a6fd8", beacon: 0x5080ff },
  { id: "pluto", name: "Pluto", dkm: 2377, pole: [132.99, -6.16], col: "#d8c0a0", beacon: 0xffe0c0 },
];
for (const b of BODIES) {
  const rel = b.id === "sun" ? EARTH.clone().negate() : helio(b.id).sub(EARTH);
  b.distKm = rel.length() * 149597870.7; b.w = eclToWorld(rel).multiplyScalar(AU);   // world position, from the globe
  b.h = b.w.y; b.r = b.dkm * 1000 * K / 2; b.lat = Math.asin(rel.z / rel.length()) / deg;
}
const SUN = BODIES[0];
// the Moon, low-precision geocentric position
{ const L = 218.316 + 13.176396 * D, Mm = (134.963 + 13.064993 * D) * deg, F = (93.272 + 13.229350 * D) * deg;
  var MOON = { lon: (L + 6.289 * Math.sin(Mm)) * deg, lat: 5.128 * Math.sin(F) * deg, km: 385001 - 20905 * Math.cos(Mm) };
  MOON.w = eclToWorld(V3(Math.cos(MOON.lat) * Math.cos(MOON.lon), Math.cos(MOON.lat) * Math.sin(MOON.lon), Math.sin(MOON.lat))).multiplyScalar(MOON.km * 1000 * K); }

// ---------- signs ----------
function boardMesh(lines, width, { bg = "#1b3a4b", fg = "#ffffff", sub = "#d5e6ee", gold = true, title = 1 } = {}) {
  const c = document.createElement("canvas"), g = c.getContext("2d"), px = 46;
  const font = i => `${i < title ? 700 : 400} ${i < title ? px : px * 0.72}px -apple-system, Helvetica, sans-serif`;
  const w = Math.max(...lines.map((l, i) => { g.font = font(i); return g.measureText(l).width; })) + 50;
  c.width = Math.ceil(w); c.height = Math.ceil(px * 1.4 + (lines.length - 1) * px * 0.92 + 26);
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  if (gold) { g.strokeStyle = "#c9a227"; g.lineWidth = 6; g.strokeRect(3, 3, c.width - 6, c.height - 6); }
  lines.forEach((l, i) => { g.font = font(i); g.fillStyle = i < title ? fg : sub; g.fillText(l, 25, px * 1.15 + i * px * 0.92 + 4); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width * c.height / c.width), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide }));
  return m;
}
function postSign(lines, x, z, faceX, faceZ, width = 3, bottom = 1.2, opts) {   // a board on two posts at (x, z), facing the point (faceX, faceZ)
  const g = new THREE.Group(), y0 = terrainH(x, z); g.position.set(x, y0, z); g.rotation.y = Math.atan2(faceX - x, faceZ - z); scene.add(g);
  const b = boardMesh(lines, width, opts), h = b.geometry.parameters.height; b.position.y = bottom + h / 2; g.add(b);
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, bottom + h, 8), M(0x34495e)); p.position.set(sx * width * 0.42, (bottom + h) / 2, -0.06); g.add(p); }
  return g;
}

// ---------- roads: the interstate, exits and one road to each body ----------
// Bodies to the east leave from the eastbound side, bodies to the west from the westbound side, so no road
// doubles back past the desk. Headings are map angles (x east, y north); a ramp is a circular arc of radius RR.
const ZH = 60, ZE = ZH + 4, ZW = ZH - 4, RR = 160;      // interstate centre line; eastbound and westbound lanes; ramp radius
const wrap = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
function arcPt(S, h0, turn, th) {                      // turn +1 left, -1 right; th = angle swept so far
  const mx = turn * RR * (-Math.sin(h0) + Math.sin(h0 + turn * th)), my = turn * RR * (Math.cos(h0) - Math.cos(h0 + turn * th));
  return V3(S.x + mx, 0, S.z - my); }
function sweep(h0, H) { const l = wrap(H - h0); return l <= Math.PI ? [1, l] : [-1, 2 * Math.PI - l]; }
{ const groups = { el: [], er: [], wl: [], wr: [] };
  for (const b of BODIES) { b.east = b.w.x >= 0; b.h0 = b.east ? 0 : Math.PI; const [turn, th] = sweep(b.h0, Math.atan2(-b.w.z, b.w.x)); b.turn = turn; b.th = th;
    groups[(b.east ? "e" : "w") + (turn > 0 ? "l" : "r")].push(b); }
  for (const [k, list] of Object.entries(groups)) list.sort((p, q) => q.th - p.th).forEach((b, i) => { const d = (k[1] === "l" ? 900 : 1300) + 800 * i; b.x0 = b.east ? d : -d; });
  for (const b of BODIES) { b.S = V3(b.x0, 0, b.east ? ZE : ZW);
    for (let it = 0; it < 12; it++) { const E = arcPt(b.S, b.h0, b.turn, b.th), [turn, th] = sweep(b.h0, Math.atan2(-(b.w.z - E.z), b.w.x - E.x)); b.turn = turn; b.th = th; }
    b.E = arcPt(b.S, b.h0, b.turn, b.th);
    const dir = V3(b.w.x - b.E.x, 0, b.w.z - b.E.z).normalize(); b.stop = V3(b.w.x, 0, b.w.z).addScaledVector(dir, -(b.r + 14));
    b.sigma = 1200 + 1.5 * Math.abs(b.h); }
}
BODIES.slice().sort((p, q) => Math.abs(p.x0) - Math.abs(q.x0)).forEach((b, k) => b.exit = k + 1);

// ---------- the ground: flat, except that each road climbs or dips to its body's height ----------
// Two grids: a fine one (40 m) over the inner 16 km, where the Sun, Mercury, Venus and Mars are, and a coarse
// one beyond. After the smooth road-following shape is laid down, each grid is pulled to every body's true
// height at the body itself, so the ground really reaches it.
const SEGS = BODIES.map(b => ({ ax: b.E.x, az: b.E.z, bx: b.w.x, bz: b.w.z, h: b.h, s2: b.sigma * b.sigma }));
const flatAt = (x, z) => THREE.MathUtils.smoothstep(Math.hypot(x, z - 30), 250, 700);   // the desk, car park and interchange stay level
function baseH(x, z) { let sw = 0, sh = 0;
  for (const s of SEGS) { const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / L2));
    const ex = s.ax + t * dx - x, ez = s.az + t * dz - z, w = Math.exp(-(ex * ex + ez * ez) / s.s2); sw += w; sh += w * s.h * t; }
  return flatAt(x, z) * sh / Math.max(1, sw); }
function mkGrid(half, N) { const cell = 2 * half / N, H = new Float32Array((N + 1) * (N + 1));
  for (let iz = 0; iz <= N; iz++) for (let ix = 0; ix <= N; ix++) H[iz * (N + 1) + ix] = baseH(ix * cell - half, iz * cell - half);
  return { half, N, cell, H }; }
function gridH(G, x, z) {                              // exactly the grid's triangles (as PlaneGeometry splits them)
  const fx = THREE.MathUtils.clamp((x + G.half) / G.cell, 0, G.N - 1e-6), fz = THREE.MathUtils.clamp((z + G.half) / G.cell, 0, G.N - 1e-6);
  const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, n = G.N + 1, H = G.H;
  const a = H[iz * n + ix], b = H[(iz + 1) * n + ix], c = H[(iz + 1) * n + ix + 1], d = H[iz * n + ix + 1];
  return u + v <= 1 ? a + u * (d - a) + v * (b - a) : c + (1 - u) * (b - c) + (1 - v) * (d - c); }
function pullTo(G, list, sOf) {                        // bend the ground so it meets each body at its true height
  const n = G.N + 1;
  for (let pass = 0; pass < 5; pass++) for (const b of list) {
    const target = b.id === "sun" ? 0 : b.h, d = target - gridH(G, b.w.x, b.w.z); if (Math.abs(d) < 0.02) continue;
    const s = sOf(b), r = Math.ceil(3 * s / G.cell), cx = Math.round((b.w.x + G.half) / G.cell), cz = Math.round((b.w.z + G.half) / G.cell);
    for (let iz = Math.max(0, cz - r); iz <= Math.min(G.N, cz + r); iz++) for (let ix = Math.max(0, cx - r); ix <= Math.min(G.N, cx + r); ix++) {
      const x = ix * G.cell - G.half, z = iz * G.cell - G.half, e = ((x - b.w.x) ** 2 + (z - b.w.z) ** 2) / (s * s);
      G.H[iz * n + ix] += d * Math.exp(-e) * flatAt(x, z); } } }
const RX = Math.max(...BODIES.map(b => Math.hypot(b.w.x, b.w.z))) + 20000;
const INNER = mkGrid(8000, IS_HEADSET ? 200 : 400), OUTER = mkGrid(RX, IS_HEADSET ? 256 : 512);
const inInner = (x, z) => Math.abs(x) < INNER.half && Math.abs(z) < INNER.half;
pullTo(INNER, BODIES.filter(b => Math.abs(b.w.x) < INNER.half - 1500 && Math.abs(b.w.z) < INNER.half - 1500), b => b.id === "sun" ? 120 : 260);
pullTo(OUTER, BODIES.filter(b => !inInner(b.w.x, b.w.z)), () => Math.max(1600, 2.5 * OUTER.cell));
{ const n = INNER.N + 1, band = 2.2 * OUTER.cell;            // the fine grid's edge blends into the coarse surface, so the two meet exactly at the seam
  for (let iz = 0; iz <= INNER.N; iz++) for (let ix = 0; ix <= INNER.N; ix++) { const x = ix * INNER.cell - INNER.half, z = iz * INNER.cell - INNER.half, e = INNER.half - Math.max(Math.abs(x), Math.abs(z));
    if (e < band) { const w = THREE.MathUtils.smoothstep(band - e, 0, band); INNER.H[iz * n + ix] += (gridH(OUTER, x, z) + 0.6 - INNER.H[iz * n + ix]) * w; } } }   // 0.6 m proud: no coarse cell can poke through
let OUTER_DRAWN = OUTER;                                // the coarse grid as actually drawn (set once its mesh is built)
function terrainH(x, z) { return gridH(inInner(x, z) ? INNER : OUTER_DRAWN, x, z); }
{ const gc = document.createElement("canvas"); gc.width = gc.height = 256; const g = gc.getContext("2d"); g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 5000; k++) { const v = 150 + rnd() * 105 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * 256, rnd() * 256, 1.5, 3); }
  OUTER.Hr = new Float32Array(OUTER.H.length);
  const mesh = (G, sinkInner) => {
    const geo = new THREE.PlaneGeometry(2 * G.half, 2 * G.half, G.N, G.N).rotateX(-Math.PI / 2), p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const h = G.H[i], x = p.getX(i), z = p.getZ(i);
      // inside the fine grid's square the coarse grid is pushed far down out of sight: its 570 m cells would otherwise
      // bridge the narrow valleys dug for Mercury and Venus and poke up through them; its last ring stays 5 m under
      const ax = Math.max(Math.abs(x), Math.abs(z)), yy = !sinkInner || ax >= INNER.half ? h : ax < INNER.half - G.cell * 1.01 ? -800 : Math.min(h, gridH(INNER, x, z)) - 5;
      p.setY(i, yy); if (G.Hr) G.Hr[i] = yy;
      const n = 0.5 + 0.25 * Math.sin(x * 0.00031 + Math.sin(z * 0.00017) * 3) + 0.25 * Math.sin(z * 0.00043 + x * 0.0001);
      c.setHSL(0.25 + 0.04 * n, 0.42, 0.33 + 0.08 * n);
      if (h > 900) c.lerp(new THREE.Color(0x8a8478), Math.min(1, (h - 900) / 900)); if (h > 2600) c.lerp(new THREE.Color(0xf4f6f8), Math.min(1, (h - 2600) / 600));
      if (h < -300) c.lerp(new THREE.Color(0x5a7a48), Math.min(1, -h / 2000));
      col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(2 * G.half / 6, 2 * G.half / 6); gt.anisotropy = 8;
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: gt, roughness: 0.95 }))); };
  mesh(OUTER, true); mesh(INNER, false); OUTER_DRAWN = { ...OUTER, H: OUTER.Hr }; }

// a paved ribbon along xz points, laid on the ground
function densify(pts, step = 8) { const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 1; k <= n; k++) out.push(V3(a.x + (b.x - a.x) * k / n, 0, a.z + (b.z - a.z) * k / n)); } return out; }
const ROAD_LIFT = 0.3;
function ribbon(pts, width, mat, lift = ROAD_LIFT, uvLen = 12) { pts = densify(pts);
  const pos = [], uv = [], idx = []; let run = 0;
  pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = V3(b.x - a.x, 0, b.z - a.z).normalize(), n = V3(-t.z, 0, t.x);
    if (i) run += Math.hypot(q.x - pts[i - 1].x, q.z - pts[i - 1].z);
    for (const s of [1, -1]) { const x = q.x + n.x * width / 2 * s, z = q.z + n.z * width / 2 * s; pos.push(x, terrainH(x, z) + lift, z); }
    uv.push(0, run / uvLen, 1, run / uvLen); if (i) { const k = 2 * i; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } });   // wound to face up
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); scene.add(m); return m;
}
const roadTex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; };
const asphalt = (g, w, h) => { g.fillStyle = "#3b3e41"; g.fillRect(0, 0, w, h); for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},0.07)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } };
const roadOff = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.9 };
const hwyMat = new THREE.MeshStandardMaterial({ map: roadTex(512, 256, (g, w, h) => { asphalt(g, w, h);
  const ln = (x, col, dash) => { g.fillStyle = col; for (let y = 0; y < h; y += dash ? 128 : h) g.fillRect(x, y, 5, dash ? 64 : h); };
  ln(20, "#f2f2f2"); ln(130, "#f2f2f2", true); ln(236, "#f1c40f"); g.fillStyle = "#5a6a40"; g.fillRect(244, 0, 24, h); ln(271, "#f1c40f"); ln(377, "#f2f2f2", true); ln(487, "#f2f2f2"); }), ...roadOff });
const laneMat = new THREE.MeshStandardMaterial({ map: roadTex(256, 256, (g, w, h) => { asphalt(g, w, h); g.fillStyle = "#f2f2f2"; g.fillRect(10, 0, 5, h); g.fillRect(w - 15, 0, 5, h);
  g.fillStyle = "#f1c40f"; for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 3, y, 6, 64); }), ...roadOff });
const XMAX = Math.max(0, ...BODIES.map(b => b.x0)) + 1500, XMIN = Math.min(0, ...BODIES.map(b => b.x0)) - 1500;
const hwyPts = []; for (let x = XMIN; x <= XMAX; x += 40) hwyPts.push(V3(x, 0, ZH));
ribbon(hwyPts, 26, hwyMat, ROAD_LIFT, 26);
const ONRAMP = [V3(2, 0, 36), V3(30, 0, 37), V3(80, 0, 42), V3(140, 0, 52), V3(200, 0, 60), V3(260, 0, ZE)];
const ONRAMP_W = [V3(6, 0, 36), V3(-20, 0, 37), V3(-70, 0, 42), V3(-130, 0, 50), V3(-200, 0, ZW)];
ribbon(new THREE.CatmullRomCurve3(ONRAMP).getPoints(40), 7, laneMat, ROAD_LIFT + 0.04, 8); ribbon(new THREE.CatmullRomCurve3(ONRAMP_W).getPoints(30), 7, laneMat, ROAD_LIFT + 0.04, 8);
{ const pad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.1, 12), M(0x4a4d50, { roughness: 0.9 })); pad.position.set(4, 0.06, 36); scene.add(pad); }
for (const b of BODIES) {
  b.arc = []; const n = Math.max(4, Math.ceil(b.th * RR / 8)); for (let k = 0; k <= n; k++) b.arc.push(arcPt(b.S, b.h0, b.turn, b.th * k / n));
  const L = Math.hypot(b.stop.x - b.E.x, b.stop.z - b.E.z), m = Math.max(2, Math.ceil(L / 40)); b.line = [];
  for (let k = 1; k <= m; k++) b.line.push(V3(b.E.x + (b.stop.x - b.E.x) * k / m, 0, b.E.z + (b.stop.z - b.E.z) * k / m));
  const loop = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 2; loop.push(V3(b.w.x + (b.r + 14) * Math.cos(a), 0, b.w.z + (b.r + 14) * Math.sin(a))); }
  ribbon([b.S.clone().add(V3(b.east ? -60 : 60, 0, 0)), ...b.arc, ...b.line], 8, laneMat, ROAD_LIFT + 0.06, 10); ribbon(loop, 8, laneMat, ROAD_LIFT + 0.06, 10);
}

// ---------- the desk, the globe, the satellites and the Moon ----------
const POLE = radec(0, 90);                              // the Earth's axis points at the celestial pole
{ const wood = M(0x7a4e2c, { roughness: 0.5 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.8), wood); top.position.y = 0.725; scene.add(top);
  for (const [x, z] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), wood); l.position.set(x, 0.35, z); scene.add(l); }
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48).rotateX(-Math.PI / 2), M(0x8a3a2a, { roughness: 1 })); rug.position.y = 0.02; scene.add(rug); }
const RE = 0.1524, GC = V3(0, Y0, 0);
const earthTex = new THREE.TextureLoader().load(EARTH_JPG); earthTex.colorSpace = THREE.SRGBColorSpace; earthTex.anisotropy = 8;
const moonTex = new THREE.TextureLoader().load(MOON_JPG); moonTex.colorSpace = THREE.SRGBColorSpace;
const globe = new THREE.Mesh(new THREE.SphereGeometry(RE, 128, 64), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.55 }));
globe.position.copy(GC); scene.add(globe);
function orientGlobe() {                                // spin it to the real time of day: the night side faces away from the Sun
  const d = (Date.now() / 86400000 + 2440587.5) - 2451545, G = (280.46061837 + 360.98564736629 * d) * deg;
  const c0 = eqToWorld(V3(Math.cos(G), Math.sin(G), 0)), c1 = eqToWorld(V3(0, 0, 1)), c2 = eqToWorld(V3(Math.sin(G), -Math.cos(G), 0));
  globe.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(c0, c1, c2)); }
orientGlobe();
{ const brass = M(0xc9a227, { metalness: 0.7, roughness: 0.3 }), st = new THREE.Group(); st.position.copy(GC); st.quaternion.setFromUnitVectors(V3(0, 1, 0), POLE); scene.add(st);
  const mer = new THREE.Mesh(new THREE.TorusGeometry(RE + 0.012, 0.004, 8, 64, Math.PI), brass); mer.rotation.z = -Math.PI / 2; st.add(mer);
  for (const s of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), brass); pin.position.y = s * (RE + 0.006); st.add(pin); }
  const sp = GC.clone().addScaledVector(POLE, -(RE + 0.012)), base = V3(sp.x, 0.75, sp.z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, sp.y - 0.75, 12), brass); stem.position.copy(base).lerp(sp, 0.5); scene.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.02, 32), M(0x2a1a10, { roughness: 0.4 })); foot.position.copy(base).add(V3(0, 0.01, 0)); scene.add(foot); }
// satellites, in the globe's frame (attached to it, so they turn with it -- fine for rings of them)
const SAT = new THREE.Group(); SAT.position.copy(GC); SAT.quaternion.setFromUnitVectors(V3(0, 1, 0), POLE); scene.add(SAT);
const ringLine = (r, tilt, node, col, op = 0.5) => { const pts = []; for (let k = 0; k <= 128; k++) { const a = k / 128 * Math.PI * 2; pts.push(V3(r * Math.cos(a), 0, r * Math.sin(a))); }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op }));
  const g = new THREE.Group(); g.rotation.y = node; l.rotation.x = tilt; g.add(l); SAT.add(g); return l; };
const dotsOn = (r, tilt, node, n, col, size) => { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 6, 4), new THREE.MeshBasicMaterial({ color: col }), n), o = new THREE.Object3D(), g = new THREE.Group();
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + rnd() * 0.05; o.position.set(r * Math.cos(a), 0, r * Math.sin(a)); o.updateMatrix(); im.setMatrixAt(k, o.matrix); }
  const t = new THREE.Group(); t.rotation.x = tilt; t.add(im); g.rotation.y = node; g.add(t); SAT.add(g); };
const alt = km => RE * (6371 + km) / 6371;
ringLine(alt(420), 51.6 * deg, 0.4, 0xffffff, 0.8); dotsOn(alt(420), 51.6 * deg, 0.4, 1, 0xffffff, 0.0018);         // ISS
for (let p = 0; p < 6; p++) { ringLine(alt(20200), 55 * deg, p * Math.PI / 3, 0x7fd0ff, 0.35); dotsOn(alt(20200), 55 * deg, p * Math.PI / 3, 5, 0x7fd0ff, 0.004); }   // GPS
ringLine(alt(35786), 0, 0, 0xffc060, 0.5); dotsOn(alt(35786), 0, 0, 80, 0xffc060, 0.003);                           // geostationary
{ const n = 7000, pos = new Float32Array(n * 3), r = alt(550);                                                        // Starlink
  for (let k = 0; k < n; k++) { const y = rnd() * 2 - 1, f = rnd() * Math.PI * 2, s = Math.sqrt(1 - y * y) ; const yy = y * 0.89; pos.set([r * s * Math.cos(f), r * yy, r * s * Math.sin(f)], k * 3); }
  SAT.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xe8f4ff, size: 0.0005, sizeAttenuation: true, transparent: true, opacity: 0.7 }))); }
// the Moon, 8.3 cm across, 9.2 m away, in its real direction today
const RM = 3474.8e3 * K / 2, MC = GC.clone().add(MOON.w);
{ const moon = new THREE.Mesh(new THREE.SphereGeometry(RM, 64, 32), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9 }));
  moon.position.copy(MC); moon.quaternion.setFromUnitVectors(V3(0, 1, 0), radec(266.86, 65.64)); moon.lookAt(GC); moon.rotateY(Math.PI / 2); scene.add(moon);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, MC.y - RM, 8), new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.35 }));
  rod.position.set(MC.x, (MC.y - RM) / 2, MC.z); scene.add(rod);
  const dir = V3(MC.x, 0, MC.z).normalize(), side = V3(-dir.z, 0, dir.x);
  postSign(["the Moon", `real 3,475 km across  ·  here ${fmtM(2 * RM)}`, `today ${fmtKm(MOON.km)} away  ·  here ${fmtM(MOON.km * 1000 * K)} from the globe`,
    "lit by the scale Sun, so its phase here is today's real phase", `light takes ${(MOON.km / 299792.458).toFixed(2)} s to cross that gap, here as there`,
    "the 12 Apollo astronauts who walked on it travelled these 9 metres"], MC.x + side.x * 0.9, MC.z + side.z * 0.9, 0, 0, 1.6, 0.6); }
{ const toSun = V3(SUN.w.x, 0, SUN.w.z).normalize();
  postSign(["THE SOLAR SYSTEM ON A DESK", `the Earth is a 12-inch globe: everything is 1 : ${(1 / K / 1e6).toFixed(1)} million, its real size and distance`,
    "the planets are where they really are today, all around you; the ground is the plane of the Earth's orbit",
    `the Sun is a ${fmtM(2 * SUN.r)} ball ${fmtM(Math.hypot(SUN.w.x, SUN.w.z))} away (look ${compass(SUN.w)}): from here it looks exactly as big as the real Sun`,
    "the globe is turned to the real time of day and lit by that scale Sun",
    "white ring 1 cm up: the Space Station  ·  the haze 1.3 cm up: ~7,000 Starlink satellites",
    "blue rings 48 cm out: GPS  ·  gold ring 86 cm out: geostationary TV and weather satellites",
    `light, here, crawls at ${C_HERE.toFixed(1)} m/s (${(C_HERE * 3.6).toFixed(0)} km/h): you can outrun it, even on foot at a sprint`,
    "the car by the interstate drives to every planet: each road climbs or dips by that planet's height above the Earth's orbit"],
    -1.9, -1.4, 0, 1.5, 2.6, 0.5); }
function compass(w) { const a = (Math.atan2(w.x, -w.z) / deg + 360) % 360; return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8]; }

// ---------- the Sun and planets ----------
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const bands = (cols, extra) => canvasTex(1024, 512, (g, w, h) => { let y = 0; while (y < h) { const bh = 8 + rnd() * 30; g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(0, y, w, bh + 1); y += bh; }
  for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 30 + rnd() * 120, 2 + rnd() * 4); } if (extra) extra(g, w, h); });
const mottled = (base, spots, extra) => canvasTex(1024, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 900; k++) { g.fillStyle = spots[(rnd() * spots.length) | 0]; g.globalAlpha = 0.15 + rnd() * 0.3; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 26, 0, 6.283); g.fill(); }
  g.globalAlpha = 1; if (extra) extra(g, w, h); });
const TEX = {
  mercury: () => mottled("#8f8a84", ["#6e6a66", "#a8a39c", "#5a5652"]),
  venus: () => bands(["#e8d9a8", "#efe2b8", "#dcc890", "#f2e6c4"]),
  mars: () => mottled("#b5532a", ["#8a3a1c", "#c86a3a", "#6a2e18"], (g, w, h) => { g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 16, w, 16); }),
  jupiter: () => bands(["#d8b48a", "#e8d4b0", "#b88a62", "#f0e2c8", "#a8784e"], (g, w, h) => { g.fillStyle = "#c0603a"; g.beginPath(); g.ellipse(w * 0.62, h * 0.64, 46, 24, 0, 0, 6.283); g.fill(); }),
  saturn: () => bands(["#e3cf9a", "#ead9b0", "#cdb680", "#f0e4c4"]),
  uranus: () => bands(["#a6e0e8", "#b0e6ec", "#9cd8e2"]),
  neptune: () => bands(["#4a6fd8", "#3f62c8", "#5a80e2", "#3555b0"], (g, w, h) => { g.fillStyle = "#26386e"; g.beginPath(); g.ellipse(w * 0.4, h * 0.6, 30, 16, 0, 0, 6.283); g.fill(); }),
  pluto: () => mottled("#c8b090", ["#a07850", "#e8dcc8", "#8a6040"], (g, w, h) => { g.fillStyle = "#f2ebe0"; g.beginPath(); g.ellipse(w * 0.55, h * 0.55, 70, 60, 0, 0, 6.283); g.fill(); }),
};
// the larger moons: name, diameter km, orbit radius km, inclination to the planet's equator (°), colour
const MOONS = {
  mars: [["Phobos", 22, 9376, 1.1, "#8a7a6a"], ["Deimos", 12, 23463, 1.8, "#9a8a7a"]],
  jupiter: [["Io", 3643, 421700, 0.04, "#e8d060"], ["Europa", 3122, 671034, 0.47, "#e8dcc8"], ["Ganymede", 5268, 1070412, 0.2, "#9a8e80"], ["Callisto", 4821, 1882709, 0.2, "#5e564e"]],
  saturn: [["Mimas", 396, 185539, 1.6, "#c8c8c4"], ["Enceladus", 504, 237948, 0.0, "#f4f6f8"], ["Tethys", 1062, 294619, 1.1, "#dcdcd8"], ["Dione", 1123, 377396, 0.0, "#d0ccc4"],
    ["Rhea", 1527, 527108, 0.3, "#c8c4bc"], ["Titan", 5150, 1221870, 0.3, "#d89a4a"], ["Iapetus", 1469, 3560820, 15.5, "#8a7a62"]],
  uranus: [["Miranda", 472, 129390, 4.3, "#b8b8b4"], ["Ariel", 1158, 191020, 0.3, "#c4c0b8"], ["Umbriel", 1169, 266000, 0.1, "#7a766e"], ["Titania", 1578, 435910, 0.1, "#b0a89c"], ["Oberon", 1523, 583520, 0.1, "#a09486"]],
  neptune: [["Proteus", 420, 117647, 0.5, "#7a7470"], ["Triton", 2707, 354759, 157, "#d8c8c0"]],
  pluto: [["Charon", 1212, 19591, 0.0, "#9a948e"]],
};
const MOON_LIST = [];                                    // for the markers
const sunLight = new THREE.PointLight(0xfff4e0, 3.2, 0, 0);
for (const b of BODIES) {
  const B = V3(b.w.x, 0, b.w.z), gh = terrainH(B.x, B.z);
  const padG = new THREE.CircleGeometry(b.r + 10, 48, 0, Math.PI * 2).rotateX(-Math.PI / 2), pp = padG.attributes.position;   // paving that follows the ground
  for (let i = 0; i < pp.count; i++) pp.setY(i, terrainH(B.x + pp.getX(i), B.z + pp.getZ(i)) + 0.08);
  padG.computeVertexNormals(); const pad = new THREE.Mesh(padG, M(0xb8b0a0, { roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  pad.position.set(B.x, 0, B.z); scene.add(pad);
  if (b.r < 0.5) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: b.beacon, toneMapped: false }));
    ring.position.set(B.x, gh + 0.15, B.z); scene.add(ring); }   // small planets are marbles: a bright ring round the foot of the column
  let cy;
  if (b.id === "sun") cy = gh + b.r + 0.6;                       // raised out of the ground (its centre is really at globe height)
  else if (b.r < Y0 - 0.15) cy = Math.max(Y0 + b.h, gh + b.r + 0.05);   // small planets: on a column, at their true height (never underground)
  else cy = Math.max(Y0 + b.h, gh + b.r + 0.4);
  b.c = V3(B.x, cy, B.z);
  const mat = b.id === "sun"
    ? new THREE.MeshBasicMaterial({ map: canvasTex(1024, 512, (g, w, h) => { g.fillStyle = "#fff2c0"; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { g.fillStyle = `rgba(255,${180 + rnd() * 60 | 0},80,${rnd() * 0.25})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 4, 0, 6.283); g.fill(); } }), toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: TEX[b.id](), roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(b.r, 96, 48), mat); body.position.copy(b.c); body.quaternion.setFromUnitVectors(V3(0, 1, 0), radec(...b.pole)); scene.add(body);
  if (b.id === "sun") { sunLight.position.copy(b.c); scene.add(sunLight);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,230,160,.7)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false, toneMapped: false }));
    glow.scale.setScalar(b.r * 4.5); glow.position.copy(b.c); scene.add(glow);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(b.r * 0.75, 0.6, 12, 64).rotateX(Math.PI / 2), M(0x5a5a5a, { metalness: 0.6 })); ring.position.set(B.x, gh + 0.6, B.z); scene.add(ring); }
  else if (b.r < Y0 - 0.15) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, Math.max(0.05, cy - b.r - gh), 12), M(0x2c3e50, { metalness: 0.4 })); col.position.set(B.x, (gh + cy - b.r) / 2, B.z); scene.add(col); }
  else { const stand = new THREE.Mesh(new THREE.CylinderGeometry(b.r * 0.3, b.r * 0.45, Math.max(0.1, cy - b.r * 0.85 - gh), 24), M(0x2c3e50, { metalness: 0.4 })); stand.position.set(B.x, (gh + cy - b.r * 0.85) / 2, B.z); scene.add(stand); }
  if (b.id === "saturn" || b.id === "uranus") {                  // rings, in the planet's equator
    const [ri, ro] = b.id === "saturn" ? [74500, 140220] : [41800, 51150], rg = new THREE.RingGeometry(ri * 1000 * K, ro * 1000 * K, 160, 1), p = rg.attributes.position, uv = rg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) / (1000 * K) - ri) / (ro - ri), 0.5);
    rg.rotateX(-Math.PI / 2);
    const rt = canvasTex(512, 4, (g, w) => { for (let x = 0; x < w; x++) { const km = ri + (ro - ri) * x / w; let a = b.id === "saturn" ? (km < 92000 ? 0.25 : km < 117580 ? 0.85 : km < 122170 ? 0.05 : km < 136775 ? 0.65 : km < 139380 ? 0.1 : 0.55) : (x % 64 < 6 ? 0.7 : 0.05);
      g.fillStyle = `rgba(${b.id === "saturn" ? "226,206,160" : "200,220,230"},${a * (0.85 + 0.15 * Math.sin(x * 1.7))})`; g.fillRect(x, 0, 1, 4); } });
    const rm = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.8 }));
    rm.position.copy(b.c); rm.quaternion.copy(body.quaternion); scene.add(rm); }
  if (MOONS[b.id]) {                                   // moons on glass rods, each on its real orbit (the spot on the orbit is illustrative)
    const P = radec(...b.pole), u = new THREE.Vector3().crossVectors(P, V3(0, 1, 0)); if (u.length() < 0.1) u.set(1, 0, 0); u.normalize(); const v = new THREE.Vector3().crossVectors(P, u).normalize();
    const glassRod = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.3 }), names = [];
    for (const [mn, md, ma, mi, mc] of MOONS[b.id]) {
      const a = ma * 1000 * K, mr = Math.max(md * 1000 * K / 2, 0.0002), inc = mi * deg, ax = new THREE.Vector3().copy(v).multiplyScalar(Math.cos(inc)).addScaledVector(P, Math.sin(inc));
      let pos = null;
      for (let k = 0; k < 64 && !pos; k++) { const th = (k * 137.5 + mn.length * 40) * deg, q = b.c.clone().addScaledVector(u, a * Math.cos(th)).addScaledVector(ax, a * Math.sin(th));
        if (q.y - mr > terrainH(q.x, q.z) + 0.3 && Math.hypot(q.x - b.c.x, q.z - b.c.z) > b.r * 0.6) pos = q; }
      if (!pos) continue;
      const m = new THREE.Mesh(new THREE.SphereGeometry(mr, 32, 16), M(mc, { roughness: 0.85 })); m.position.copy(pos); scene.add(m);
      MOON_LIST.push({ name: mn, col: mc, pos: () => pos, r: mr, planet: b, orbit: a, desc: `moon of ${b.name} · ${md.toLocaleString()} km → ${fmtM(2 * mr)} · ${fmtM(a)} from it` });
      const g0 = terrainH(pos.x, pos.z), rr = Math.min(0.006, Math.max(0.001, mr * 0.15));
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr * 1.5, pos.y - mr - g0, 6), glassRod); rod.position.set(pos.x, (pos.y - mr + g0) / 2, pos.z); scene.add(rod);
      const orbit = []; for (let k = 0; k <= 180; k++) { const th = k / 180 * Math.PI * 2; orbit.push(b.c.clone().addScaledVector(u, a * Math.cos(th)).addScaledVector(ax, a * Math.sin(th))); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbit), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));
      names.push(`${mn}: ${md.toLocaleString()} km → ${fmtM(2 * mr)}, orbit ${fmtKm(ma)} → ${fmtM(a)}`); }
    const fwd2 = V3(b.w.x - b.E.x, 0, b.w.z - b.E.z).normalize(), side2 = V3(-fwd2.z, 0, fwd2.x), mp = b.stop.clone().addScaledVector(side2, -12).addScaledVector(fwd2, -6);
    postSign([`the moons of ${b.name}`, ...names, "faint white lines: their orbits, tilted with the planet's equator", "each moon is shown at one point on its orbit, not today's exact spot"],
      mp.x, mp.z, b.w.x, b.w.z, Math.max(3, Math.min(6, names.length * 0.9)), 1.2); }
  // (no sky beacons: the markers show where every body is)
  const lt = b.distKm / 299792.458, grade = b.h / Math.hypot(b.w.x - b.E.x, b.w.z - b.E.z) * 100;
  const facts = {
    sun: ["the Sun: a star, 109 Earths across, 99.86% of the solar system's mass", "the glowing ring at its foot marks where the ground would be: its centre is really at globe height, buried 17 m"],
    mercury: ["the smallest planet, and the closest to the Sun", "its orbit is tilted 7° to the Earth's: the steepest road of the eight planets"],
    venus: ["the hottest planet (465 °C): thick CO₂ clouds trap the heat", "lit by the scale Sun, so it shows its real phase today"],
    mars: ["half the Earth's width: the rovers drive on that ball", "its distance swings from 55 to 400 million km as the two planets lap each other"],
    jupiter: ["11 Earths across, more than twice the mass of all the other planets together", "the Great Red Spot, a storm wider than the Earth, is a 3 cm smudge here"],
    saturn: ["its rings are 280,000 km wide but only ~10 m thick: here, 1/4000 of a millimetre", "the rings are tilted with its axis, 26.7°, as they really are"],
    uranus: ["it rolls on its side: its axis is tipped 98°", "so its faint rings stand almost upright"],
    neptune: ["the windiest planet: 2,000 km/h", "found in 1846 by mathematics before anyone saw it"],
    pluto: ["a dwarf planet, smaller than the Moon", "its orbit is tilted 17°: its road has the biggest hill or valley here"],
  }[b.id];
  const fwd = V3(b.w.x - b.E.x, 0, b.w.z - b.E.z).normalize(), side = V3(-fwd.z, 0, fwd.x), sp = b.stop.clone().addScaledVector(side, 12).addScaledVector(fwd, -6);
  postSign([b.name === "the Sun" ? "THE SUN" : b.name.toUpperCase(), `real ${b.dkm.toLocaleString()} km across  ·  here ${fmtM(2 * b.r)}`,
    `today ${fmtKm(b.distKm)} from the Earth  ·  here ${fmtM(b.w.length())} from the globe`,
    `light takes ${fmtT(lt)} to get here from the Earth: at the scale's light speed (${C_HERE.toFixed(1)} m/s) exactly the same`,
    b.id === "sun" ? "it sits in the plane of the Earth's orbit: no hill on this road" :
      `today it is ${Math.abs(b.lat).toFixed(2)}° ${b.lat >= 0 ? "above" : "below"} the plane of the Earth's orbit: ${fmtM(Math.abs(b.h))} ${b.h >= 0 ? "up" : "down"} here, an average grade of ${Math.abs(grade).toFixed(1)}%`,
    ...facts], sp.x, sp.z, b.w.x, b.w.z, Math.max(3, Math.min(8, b.r * 2.5)), 1.2);
  // the exit sign, on the interstate before its exit
  const back = b.east ? -1 : 1, ex = b.S.x + back * 260, ez = b.east ? ZH + 15 : ZH - 15;   // on the right of the carriageway, facing oncoming cars
  postSign([`EXIT ${b.exit}`, `${b.turn > 0 ? "←" : "→"}  ${b.name === "the Sun" ? "The Sun" : b.name}  ${fmtM(b.w.length())}`, `(real ${fmtKm(b.distKm)})`],
    ex, ez, ex + back * 100, ez, 7, 4.5, { bg: "#0b6b3a", fg: "#ffffff", sub: "#e8f5ec", gold: false, title: 2 });
}
postSign(["INTERSTATE SOL", "exits to the Sun and every planet, east and west", "(they are where the planets really are today, all around)"], 300, ZH + 16, 0, ZH + 16, 6, 3.5, { bg: "#1f4e9c", gold: false });
// sunlight: a wavefront leaves the Sun every minute and crawls outward at the scale's speed of light
const WAVES = [];
const waveGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 361 }, (_, k) => V3(Math.cos(k * deg), 0, Math.sin(k * deg))));
function spawnWave(t) { const l = new THREE.Line(waveGeo, new THREE.LineBasicMaterial({ color: 0xffe070, transparent: true, opacity: 0.9 })); l.position.set(SUN.w.x, Y0, SUN.w.z); scene.add(l); WAVES.push({ l, t }); }

// ---------- the car ----------
const car = new THREE.Group(); scene.add(car);
{ const paint = M(0xc0392b, { metalness: 0.5, roughness: 0.3 }), dark = M(0x1a1a1a), chrome = M(0xdddddd, { metalness: 0.9, roughness: 0.2 });
  const part = (w, h, d, x, y, z, m = paint) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); car.add(b); };   // an open two-seater
  part(1.8, 0.25, 4.4, 0, 0.45, 0); part(1.8, 0.45, 1.5, 0, 0.8, -1.45); part(1.8, 0.4, 1.1, 0, 0.78, 1.65);
  for (const x of [-0.85, 0.85]) part(0.1, 0.4, 1.8, x, 0.77, 0.0);
  part(1.6, 0.2, 0.1, 0, 0.84, -0.7, dark);
  const seatM = M(0xe8dcc8, { roughness: 0.8 });
  for (const x of [-0.42, 0.42]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), seatM); s.position.set(x, 0.75, 0.25); car.add(s);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.1), seatM); bk.position.set(x, 1.05, 0.55); car.add(bk); }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.03), new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.25 })); glass.position.set(0, 1.12, -0.85); glass.rotation.x = -0.35; car.add(glass);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), dark); wheel.position.set(-0.42, 0.86, -0.36); wheel.rotation.x = -0.75; car.add(wheel);
  for (const [x, z] of [[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.4], [0.85, 1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20).rotateZ(Math.PI / 2), dark); w.position.set(x, 0.34, z); car.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16).rotateZ(Math.PI / 2), chrome); h.position.copy(w.position); car.add(h); } }
// the dashboard: a touch screen. Press a planet to drive there (click it, or point a controller at it and pull the trigger)
const dashC = document.createElement("canvas"); dashC.width = 1024; dashC.height = 560;
const dashT = new THREE.CanvasTexture(dashC); dashT.colorSpace = THREE.SRGBColorSpace;
const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.45), new THREE.MeshBasicMaterial({ map: dashT, toneMapped: false })); dash.position.set(0.05, 1.0, -0.66); dash.rotation.x = -0.6; car.add(dash);
const DASH_BTNS = [];
BODIES.forEach((b, k) => DASH_BTNS.push({ x: 20 + (k % 5) * 198, y: 236 + Math.floor(k / 5) * 96, w: 188, h: 84, label: b.name === "the Sun" ? "Sun" : b.name, col: b.col, act: () => driveTo(b), body: b }));
DASH_BTNS.push({ x: 812, y: 332, w: 188, h: 84, label: "Desk", col: "#3d7cc9", act: () => driveHome() });
[["slower", () => { speedI = Math.max(1, speedI - 1); }], ["stop / go", () => { speedI = speedI ? 0 : 4; }], ["faster", () => { speedI = Math.min(SPEEDS.length - 1, speedI + 1); }], ["get out", () => exitCar()]]
  .forEach(([label, act], k) => DASH_BTNS.push({ x: 20 + k * 250, y: 440, w: 236, h: 100, label, col: k === 3 ? "#b84a3a" : "#4a6a8a", act }));
function pressDash(uv) { const px = uv.x * 1024, py = (1 - uv.y) * 560, b = DASH_BTNS.find(q => px > q.x && px < q.x + q.w && py > q.y && py < q.y + q.h); if (b) { b.act(); b.flash = 0.25; dashTimer = 0; } return !!b; }
const SPEEDS = [0, 5, 30, 60, 100, 200, 500, 1000, 3000, 10000, 30000, 100000];   // km/h, here
let carRoute = null, carS = 0, speedI = 4, inCar = false, dest = null;
function routeFor(b) {
  const pts = [...new THREE.CatmullRomCurve3(b.east ? ONRAMP : ONRAMP_W).getPoints(30)];
  if (b.east) for (let x = 300; x < b.S.x; x += 50) pts.push(V3(x, 0, ZE)); else for (let x = -240; x > b.S.x; x -= 50) pts.push(V3(x, 0, ZW));
  pts.push(...b.arc, ...b.line);
  return mkRoute(pts);
}
function mkRoute(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)); return { pts, cum, L: cum[cum.length - 1] }; }
function routeAt(r, s) { s = THREE.MathUtils.clamp(s, 0, r.L); let lo = 0, hi = r.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.cum[m] <= s) lo = m; else hi = m; }
  const a = r.pts[lo], b = r.pts[hi], f = (s - r.cum[lo]) / Math.max(1e-6, r.cum[hi] - r.cum[lo]);
  return { p: V3(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f), dir: V3(b.x - a.x, 0, b.z - a.z).normalize(), i: lo }; }
function driveTo(b) {                                  // from wherever the car is: back along its road to the car park, then out to b
  const next = routeFor(b);
  if (carRoute && carS > 1) { const at = routeAt(carRoute, carS), back = [at.p, ...carRoute.pts.slice(0, at.i + 1).reverse()]; carRoute = mkRoute([...back, ...next.pts]); }
  else carRoute = next;
  carS = 0; dest = b; if (speedI === 0) speedI = 4; enterCar(); }
function driveHome() {                                // back along the road to the car park by the desk
  if (carRoute && carS > 1) { const at = routeAt(carRoute, carS); carRoute = mkRoute([at.p, ...carRoute.pts.slice(0, at.i + 1).reverse()]); carS = 0; dest = { name: "the desk" }; if (!speedI) speedI = 4; } }
function placeCar() {
  const r = carRoute ? routeAt(carRoute, carS) : { p: V3(4, 0, 36), dir: V3(1, 0, 0) };
  const ahead = r.p.clone().addScaledVector(r.dir, 2), behind = r.p.clone().addScaledVector(r.dir, -2);
  const y = terrainH(r.p.x, r.p.z) + ROAD_LIFT + 0.08, pitch = Math.atan2(terrainH(ahead.x, ahead.z) - terrainH(behind.x, behind.z), 4);
  car.position.set(r.p.x, y, r.p.z); car.rotation.set(pitch, Math.atan2(-r.dir.x, -r.dir.z), 0, "YXZ"); }
placeCar();
function enterCar() { if (!inCar) { yaw = 0; pitch = -0.1; vrTurn = 0; } inCar = true; flying = false; }   // look out over the hood: in the car, the view is relative to the car
function exitCar() { inCar = false; yaw += car.rotation.y; const s = V3(-2.2, 0, 0.3).applyEuler(new THREE.Euler(0, car.rotation.y, 0)); rig.position.set(car.position.x + s.x, terrainH(car.position.x + s.x, car.position.z + s.z), car.position.z + s.z); rig.rotation.set(0, 0, 0); camera.position.y = 1.65; }
function drawDash(v) {
  const g = dashC.getContext("2d"); g.fillStyle = "#0d1a22"; g.fillRect(0, 0, 1024, 560); g.strokeStyle = "#c9a227"; g.lineWidth = 6; g.strokeRect(3, 3, 1018, 554);
  for (const b of DASH_BTNS) { g.fillStyle = b.flash > 0 ? "#ffe9a8" : b.body && b.body === dest ? "#2a4a3a" : "#1e2e3a"; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 12); g.fill();
    g.strokeStyle = b.col; g.lineWidth = 4; g.stroke(); g.fillStyle = b.flash > 0 ? "#1a1a1a" : "#ffffff"; g.font = "700 30px -apple-system, Helvetica, sans-serif"; g.textAlign = "center"; g.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 11); g.textAlign = "left"; }
  const t = (s, y, sz, col = "#e6f3f9", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; g.fillText(s, 22, y); };
  t(dest ? `→ ${dest.name}` : "pick a destination", 52, 40, "#ffe9a8", 700);
  t(`${SPEEDS[speedI].toLocaleString()} km/h here  =  ${(v / C_HERE).toFixed(v / C_HERE < 10 ? 1 : 0)} × the speed of light here`, 112, 30);
  t(`at real size: ${fmtKm(v / K * 3.6)}/h = ${(v / K / 299792458).toFixed(v / K / 299792458 < 10 ? 1 : 0)} × the real speed of light`, 156, 26, "#a9c6d4");
  if (carRoute) { const left = carRoute.L - carS; t(`${fmtM(left)} to go${v > 0 ? `  ·  ${fmtT(left / v)}` : ""}${left < 1 && dest ? "  ·  arrived: press another planet, or get out" : ""}`, 196, 28); }
  t(IS_HEADSET ? "point at a button and pull the trigger" : "click a button  ·  or W / S speed, 1–9 destination, E get out", 222, 20, "#a9c6d4");
  dashT.needsUpdate = true; }

// ---------- getting about ----------
const keys = {}; let yaw = 0, pitch = -0.15, flying = false, speed = 3, vy = 0, dragging = false;
rig.position.set(0, 0, 1.7);
const intro = document.getElementById("intro");
function start() { intro?.classList.add("gone"); }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (e.code === "KeyF" && !inCar) flying = !flying;
  if (e.code === "KeyE") { if (inCar) exitCar(); else if (car.position.distanceTo(rig.position) < 8) enterCar(); }
  if (/^Digit[1-9]$/.test(e.code)) driveTo(BODIES[+e.code.slice(5) - 1]);
  if (inCar && e.code === "KeyW") speedI = Math.min(SPEEDS.length - 1, speedI + 1);
  if (inCar && e.code === "KeyS") speedI = Math.max(0, speedI - 1);
  if (inCar && e.code === "Space") speedI = 0;
  if (e.code === "Equal") speed = Math.min(5000, speed * 2); if (e.code === "Minus") speed = Math.max(0.05, speed / 2); });
addEventListener("keyup", e => { keys[e.code] = false; });
addEventListener("wheel", e => { if (renderer.xr.isPresenting) return; speed = THREE.MathUtils.clamp(speed * (e.deltaY < 0 ? 1.25 : 0.8), 0.05, 5000); });
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener("pointerdown", e => { start();
  if (inCar) { ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera); const hit = ray.intersectObject(dash)[0]; if (hit && pressDash(hit.uv)) return; }
  dragging = true; });
// VR: a laser from each controller; pull the trigger while pointing at the dashboard to press a button
for (const i of [0, 1]) { const c = renderer.xr.getController(i); rig.add(c);
  const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe9a8 })); laser.scale.z = 2; laser.visible = false; c.add(laser); c.userData.laser = laser;
  c.addEventListener("selectstart", () => { if (!inCar) return; const m = new THREE.Matrix4().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
    const hit = ray.intersectObject(dash)[0]; if (hit) pressDash(hit.uv); }); }
addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
const guide = document.getElementById("guide");
guide.innerHTML = "<b>Go to</b><button data-go='desk'><i style='background:#3d7cc9'></i>the globe</button>" +
  BODIES.map((b, k) => `<div class="row"><button data-go="${k}"><i style="background:${b.col}"></i>${b.name}</button><button class="drive" data-drive="${k}" title="drive there">🚗 ${k + 1}</button></div>`).join("");
guide.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); start();
  if (b.dataset.drive) return driveTo(BODIES[+b.dataset.drive]);
  if (inCar) exitCar();
  if (b.dataset.go === "desk") { rig.position.set(0, 0, 1.7); yaw = 0; pitch = -0.15; return; }
  const t = BODIES[+b.dataset.go], p = t.stop; rig.position.set(p.x, terrainH(p.x, p.z), p.z); yaw = Math.atan2(-(t.w.x - p.x), -(t.w.z - p.z)); pitch = 0; flying = false; });
const hud = document.getElementById("hud");
function readout(v) {
  const d = rig.position.distanceTo(GC), near = BODIES.reduce((a, b) => V3(b.w.x, 0, b.w.z).distanceTo(rig.position) < V3(a.w.x, 0, a.w.z).distanceTo(rig.position) ? b : a);
  hud.innerHTML = `<b>1 : ${(1 / K / 1e6).toFixed(1)} million</b> &nbsp;·&nbsp; the Earth is a 12-inch globe &nbsp;·&nbsp; positions for ${NOW.toDateString()}<br>
    ${inCar ? "driving" : flying ? "jetpack" : "walking"} ${inCar ? "" : `<span class="k">F</span>`} &nbsp;·&nbsp; ${v.toFixed(v < 10 ? 1 : 0)} m/s here = ${(v / C_HERE).toFixed(2)} × light speed here (${C_HERE.toFixed(1)} m/s)<br>
    from the globe: ${fmtM(d)} = ${fmtKm(d / K / 1000)} real &nbsp;·&nbsp; nearest: <b>${near.name}</b><br>
    <span class="dim">${inCar ? "W / S faster / slower · space stop · 1–9 pick a destination · E get out" : "WASD walk · drag to look · scroll or − = speed · F jetpack (space / C) · E at the car to get in · 1–9 drive to a planet · H markers"}</span>`;
}

// ---------- VR ----------
const VRB = document.getElementById("vr"); let snap = true; const prevB = {};
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor");
    renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);   // fewer pixels per eye: steadier frame rate
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); s.addEventListener("end", () => { camera.position.set(0, 1.65, 0); rig.rotation.set(0, 0, 0); }); }; });
const stick = a => { if (!a) return [0, 0]; const p = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[p] || 0, y = a[p + 1] || 0; return [Math.abs(x) > 0.12 ? x : 0, Math.abs(y) > 0.12 ? y : 0]; };
let vrTurn = 0;

// ---------- markers: where everything is, at all times (H turns them off) ----------
// On screen: a slim arrow in the object's colour, just above it and pointing down at it, with its name and distance.
// Off screen or behind you: an arrow on the screen edge pointing the way to turn, with the name.
// A marker fades out as the object grows on screen (by its apparent size, not distance), so it never covers it.
// VR: the same arrow and name, floating in the object's direction, drawn over everything.
const TARGETS = [{ name: "Earth (the globe)", col: "#5a9ae8", pos: () => GC, r: RE }, { name: "the Moon", col: "#d8d8d8", pos: () => MC, r: RM },
  ...BODIES.map(b => ({ name: b.name === "the Sun" ? "Sun" : b.name, col: b.col, pos: () => b.c, r: b.r, big: true })),
  ...MOON_LIST.map(q => ({ ...q, small: true })), { name: "your car", col: "#ff6a5a", pos: () => car.position, r: 1.2, car: true }];
let markersOn = true;
addEventListener("keydown", e => { if (e.code === "KeyH") { markersOn = !markersOn; markLayer.style.display = markersOn ? "block" : "none"; } });
const markLayer = document.createElement("div"); markLayer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:1;font:600 13px -apple-system,Helvetica,sans-serif";
document.body.appendChild(markLayer);
const DOWN = col => `<svg width="18" height="14" viewBox="0 0 18 14" style="display:block;margin:2px auto 0;overflow:visible"><path d="M1 1 L9 13 L17 1 L9 5 Z" fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const SIDE = col => `<svg width="22" height="22" viewBox="0 0 22 22" style="overflow:visible"><path d="M2 3 L20 11 L2 19 L7 11 Z" fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
for (const t of TARGETS) {
  t.el = document.createElement("div"); t.el.style.cssText = "position:absolute;white-space:nowrap;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 5px rgba(0,0,0,.7);text-align:center;display:none";
  markLayer.appendChild(t.el); t.mode = "";
  const c = document.createElement("canvas"); c.width = 512; c.height = 160; t.ctx = c.getContext("2d"); t.tex = new THREE.CanvasTexture(c); t.tex.colorSpace = THREE.SRGBColorSpace;
  t.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false })); t.spr.renderOrder = 999; t.spr.visible = false; scene.add(t.spr); }
const camP = V3(0, 0, 0), tmpV = V3(0, 0, 0), upV2 = V3(0, 0, 0);
function setMode(t, mode, txt) { if (t.mode === mode && t.txt === txt) return; t.mode = mode; t.txt = txt;
  const [name, dist] = txt.split("|"), fs = t.small ? 11.5 : 13;
  t.el.innerHTML = mode === "on" ? `<div style="font-size:${fs}px"><b>${name}</b> <span style="font-weight:400;opacity:.85">${dist}</span></div>${DOWN(t.col)}`
    : `<div style="display:flex;align-items:center;gap:5px;background:rgba(8,20,30,.55);padding:2px 8px 2px 4px;border-radius:12px"><span class="arr" style="display:inline-block">${SIDE(t.col)}</span><b style="font-size:12.5px">${name}</b></div>`;
  t.arr = t.el.querySelector(".arr"); }
function updateMarkers(vr) {
  camera.getWorldPosition(camP); const placed = [], fovK = 1 / Math.tan(camera.fov * Math.PI / 360);
  for (const t of TARGETS) {
    const wp = t.pos(), d = Math.max(0.01, camP.distanceTo(wp)), ang = Math.atan(t.r / d);   // apparent radius, radians
    const rPx = Math.tan(ang) * fovK * innerHeight / 2, fade = THREE.MathUtils.clamp((0.05 - ang) / 0.025, 0, 1);   // gone once the object is ~5° across
    const nearPlanet = !t.planet || camP.distanceTo(t.planet.c) < Math.max(60, 3 * t.orbit);
    const show = markersOn && fade > 0.01 && nearPlanet && !(t.car && inCar);
    const txt = `${t.name}|${fmtM(d)}`;
    if (vr) { t.el.style.display = "none"; t.spr.visible = show;
      if (show) { tmpV.copy(wp).sub(camP).normalize(); const D = 30; upV2.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
        t.spr.position.copy(camP).addScaledVector(tmpV, D).addScaledVector(upV2, D * Math.tan(ang) + 1.0); t.spr.scale.set(t.small ? 4.6 : 6, t.small ? 1.45 : 1.9, 1); t.spr.material.opacity = fade;
        if (t.vtxt !== txt) { t.vtxt = txt; const g = t.ctx, [name, dist] = txt.split("|"); g.clearRect(0, 0, 512, 160); g.textAlign = "center";
          g.font = "700 46px -apple-system, Helvetica, sans-serif"; const w = Math.min(500, g.measureText(name + "  " + dist).width + 30);
          g.fillStyle = "rgba(8,20,30,.55)"; g.beginPath(); g.roundRect(256 - w / 2, 6, w, 62, 30); g.fill();
          g.fillStyle = "#fff"; g.fillText(name, 256 - g.measureText("  " + dist).width / 2 * 0.9, 54); g.font = "400 36px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#cfe0ea";
          g.textAlign = "left"; g.fillText(dist, 256 + (g.measureText(name).width * 0.62) - 40, 54);
          g.fillStyle = t.col; g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(232, 84); g.lineTo(256, 150); g.lineTo(280, 84); g.lineTo(256, 100); g.closePath(); g.fill(); g.stroke(); t.tex.needsUpdate = true; } }
      continue; }
    t.spr.visible = false;
    tmpV.copy(wp).project(camera); let x = tmpV.x, y = tmpV.y; const behind = tmpV.z > 1; if (behind) { x = -x; y = -y; }
    const off = behind || Math.abs(x) > 0.96 || Math.abs(y) > 0.94;
    if (!show || (off && t.small)) { t.el.style.display = "none"; continue; }
    t.el.style.display = "block"; t.el.style.opacity = fade;
    if (off) { const m = Math.max(Math.abs(x) / 0.94, Math.abs(y) / 0.9, 1e-6); x /= m; y /= m; if (behind && Math.abs(x) < 0.94 && Math.abs(y) < 0.9) y = -0.9;
      setMode(t, "off", txt); t.arr.style.transform = `rotate(${Math.atan2(-y, x)}rad)`;
      const px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight;
      placed.push({ t, px, py, side: Math.abs(y) >= 0.89 && Math.abs(x) < 0.6 ? (y > 0 ? "top" : "bottom") : x > 0 ? "right" : "left" });
      t.el.style.transform = `translate(${x > 0.6 ? "-100%" : x < -0.6 ? "0%" : "-50%"},-50%)`; }
    else { setMode(t, "on", txt); const px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight - rPx - 4;   // the arrow's tip just above the object
      t.el.style.transform = "translate(-50%,-100%)"; t.el.style.left = `${px}px`; t.el.style.top = `${py}px`; } }
  // edge arrows: sorted along each edge and spaced so none overlap
  for (const side of ["left", "right", "top", "bottom"]) {
    const g = placed.filter(q => q.side === side), vert = side === "left" || side === "right", gap = vert ? 30 : 140, key = vert ? "py" : "px";
    const lo = side === "right" && guide.style.display !== "none" ? (guide.getBoundingClientRect().bottom + 20) : vert ? 140 : 30, hi = vert ? innerHeight - 20 : innerWidth - 30;
    g.sort((a, b) => a[key] - b[key]);
    for (let i = 1; i < g.length; i++) g[i][key] = Math.max(g[i][key], g[i - 1][key] + gap);
    const over = g.length ? g[g.length - 1][key] - hi : 0; if (over > 0) for (const q of g) q[key] -= over;
    for (let i = 0; i < g.length; i++) { if (g[i][key] < lo + i * gap) g[i][key] = lo + i * gap; g[i].t.el.style.left = `${g[i].px}px`; g[i].t.el.style.top = `${g[i].py}px`; } } }

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), sideV = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, waveT = -1e9, orientT = 0, dashTimer = 0;
// an error in one frame must not stop the loop: in VR that freezes the headset on its last picture
let loopErrs = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.15), t = clock.elapsedTime, vr = renderer.xr.isPresenting; let moved = 0;
  if (vr) { const s = renderer.xr.getSession(); let mx = 0, my = 0, boost = 1;
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay;
        if (tap("L", gp, 4)) { if (inCar) exitCar(); else { carRoute = carRoute; enterCar(); } }
        if (tap("L", gp, 5)) { const k = dest ? (BODIES.indexOf(dest) + 1) % BODIES.length : 0; driveTo(BODIES[k]); } }
      else { if (gp.buttons[0]?.value > 0.3 && !inCar) boost = 6; my += ay;
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true;
        if (inCar && tap("R", gp, 4)) speedI = Math.max(0, speedI - 1); if (inCar && tap("R", gp, 5)) speedI = Math.min(SPEEDS.length - 1, speedI + 1); } }
    if (!inCar) { rig.rotation.y = vrTurn;
      if (mx || my) { fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); fwd.y = 0; fwd.normalize(); sideV.crossVectors(fwd, UP).normalize();
        const sp = 1.5 * boost; rig.position.addScaledVector(fwd, -my * sp * dt).addScaledVector(sideV, mx * sp * dt); moved = sp; }
      rig.position.y = terrainH(rig.position.x, rig.position.z); } }
  else if (!inCar) { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.position.y = 1.65;
    const sp = speed * (keys.ShiftLeft || keys.ShiftRight ? 5 : 1) * dt, before = rig.position.clone();
    camera.getWorldDirection(fwd); if (!flying) { fwd.y = 0; fwd.normalize(); } sideV.crossVectors(fwd, UP).normalize();
    if (keys.KeyW || keys.ArrowUp) rig.position.addScaledVector(fwd, sp); if (keys.KeyS || keys.ArrowDown) rig.position.addScaledVector(fwd, -sp);
    if (keys.KeyD) rig.position.addScaledVector(sideV, sp); if (keys.KeyA) rig.position.addScaledVector(sideV, -sp);
    if (flying && keys.Space) rig.position.y += sp; if (flying && (keys.KeyC || keys.ControlLeft)) rig.position.y -= sp;
    if (keys.ArrowLeft) yaw += 1.5 * dt; if (keys.ArrowRight) yaw -= 1.5 * dt;
    moved = before.distanceTo(rig.position) / Math.max(dt, 1e-4);
    const gh = terrainH(rig.position.x, rig.position.z); if (!flying) rig.position.y = gh; else rig.position.y = Math.max(gh, rig.position.y); }
  if (inCar) { const v = SPEEDS[speedI] / 3.6;
    if (carRoute) { carS = Math.min(carRoute.L, carS + v * dt); if (carS >= carRoute.L) speedI = 0; }
    placeCar(); moved = carRoute && carS < carRoute.L ? v : 0;
    const seat = V3(-0.42, 0.7, 0.3).applyEuler(car.rotation).add(car.position); rig.position.copy(seat);
    if (vr) rig.rotation.set(0, car.rotation.y + vrTurn, 0); else { rig.rotation.set(0, car.rotation.y, 0); camera.position.y = 0.55; camera.rotation.set(pitch, yaw, 0, "YXZ"); }
    for (const b of DASH_BTNS) if (b.flash > 0) b.flash -= dt;
    dashTimer -= dt; if (dashTimer <= 0) { drawDash(v); dashTimer = 0.2; } }
  else if (!vr) rig.rotation.set(0, 0, 0);
  if (guide.style.display !== (inCar ? "none" : "")) guide.style.display = inCar ? "none" : "";   // the dashboard replaces the guide while you drive
  for (const i of [0, 1]) { const l = renderer.xr.getController(i).userData.laser; if (l) l.visible = vr && inCar; }
  if (t - waveT > 60) { spawnWave(t); waveT = t; }
  for (let i = WAVES.length - 1; i >= 0; i--) { const w = WAVES[i], r = SUN.r + (t - w.t) * C_HERE; w.l.scale.setScalar(r);
    if (r > 6000) { scene.remove(w.l); w.l.material.dispose(); WAVES.splice(i, 1); } }
  orientT -= dt; if (orientT <= 0) { orientGlobe(); orientT = 10; }
  hudT -= dt; if (hudT <= 0 && !vr) { readout(moved); hudT = 0.25; }
  updateMarkers(vr);
  renderer.render(scene, camera);
}

// medieval_train.js -- a train journey from London to Rome in the summer of 1250. Built into medieval_train.html by build.py.
//
// You ride a comfortable modern train (sleeping cars, a dining car, a lounge, an open observation platform) that no one in
// 1250 can see. Outside, at their real places, are the landmarks of the time as they then stood; between them a countryside
// generated region by region (fields, villages, mills, castles, monasteries, people at work) from what historians describe.
// Positions come from latitude and longitude. The whole world is drawn relative to a moving origin near the train, so nothing
// shakes even 1,800 km from London.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60000);
const rig = new THREE.Group(); rig.add(camera); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const O3 = new THREE.Object3D(), clampN = THREE.MathUtils.clamp, sstepN = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
let s0 = 48271; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ 40503) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4) { let a = 0, f = 1, w = 0.5, s = 0; for (let k = 0; k < n; k++) { a += w * vnoise(x * f, z * f); s += w; f *= 2.03; w *= 0.5; } return a / s; }
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const speckle = (base, n, cols, sw = 2, sh = 2) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.globalAlpha = 0.25 + rnd() * 0.4; g.fillRect(rnd() * w, rnd() * h, sw * (0.5 + rnd()), sh * (0.5 + rnd())); } g.globalAlpha = 1; };

// ---------- the map: latitude and longitude to metres (x east, z south), around 46° N ----------
const LAT0 = 46, LON0 = 4, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const LL = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
// polygons in metres, and an inside test with distance to the edge (for soft coasts)
function poly(pts) { const P = pts.map(([a, b]) => LL(a, b)); let x0 = 1e12, x1 = -1e12, z0 = 1e12, z1 = -1e12; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P, box: [x0, x1, z0, z1], inside(x, z) { if (x < x0 || x > x1 || z < z0 || z > z1) return false; let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; },
    edge(x, z) { let b = 1e12; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0; b = Math.min(b, Math.hypot(ax + t * dx - x, az + t * dz - z)); } return b; } }; }
function line(pts) { const P = pts.map(([a, b]) => LL(a, b)); let x0 = 1e12, x1 = -1e12, z0 = 1e12, z1 = -1e12; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P, box: [x0, x1, z0, z1], d(x, z, m = 1e12) { if (x < x0 - m || x > x1 + m || z < z0 - m || z > z1 + m) return 1e12; let b = 1e12; for (let i = 1; i < P.length; i++) { const [ax, az] = P[i - 1], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0; b = Math.min(b, Math.hypot(ax + t * dx - x, az + t * dz - z)); } return b; } }; }

// ---------- land and sea: rough coastlines near the route (Great Britain, the Channel and North Sea, the western Mediterranean) ----------
const GB = poly([[50.0, -5.7], [50.2, -5.0], [50.35, -4.2], [50.6, -3.4], [50.62, -2.4], [50.7, -1.9], [50.78, -1.1], [50.8, -0.6], [50.76, 0.25], [50.92, 0.75], [51.0, 1.0], [51.12, 1.38], [51.38, 1.44],
  [51.45, 0.95], [51.5, 0.6], [51.55, 0.75], [51.77, 1.2], [52.1, 1.6], [52.7, 1.75], [53.0, 0.5], [53.6, 0.1], [54.6, -1.2], [55.8, -2.0], [56.0, -3.0], [57.6, -1.8], [58.6, -3.0], [58.5, -5.0], [57.0, -6.0],
  [55.5, -5.6], [54.8, -3.4], [53.8, -3.0], [53.3, -4.6], [52.4, -4.1], [51.6, -5.1], [51.4, -3.2], [51.1, -4.2]]);
const NSEA = poly([[48.6, -7], [48.6, -4.7], [48.8, -3.0], [48.65, -1.6], [49.65, -1.9], [49.65, -1.3], [49.35, -0.4], [49.45, 0.1], [49.85, 0.6], [49.95, 1.15], [50.2, 1.55], [50.73, 1.58], [50.88, 1.62],
  [50.97, 1.95], [51.05, 2.4], [51.35, 3.2], [51.9, 4.0], [53.4, 5.5], [53.6, 8], [61, 8], [61, -7]]);
const MED = poly([[43.3, 2.9], [43.5, 4.6], [43.35, 5.35], [43.1, 6.0], [43.5, 7.0], [43.75, 7.5], [43.95, 8.15], [44.35, 8.85], [44.32, 9.35], [44.05, 9.9], [43.85, 10.22], [43.5, 10.32], [43.0, 10.5],
  [42.75, 10.85], [42.42, 11.18], [42.05, 11.85], [41.73, 12.25], [41.45, 12.6], [41.2, 13.1], [40.8, 14.2], [37.5, 15.6], [37.5, 2.9]]);
function seaDist(x, z) {   // + metres out to sea, - metres inland
  const inGB = GB.inside(x, z), inN = NSEA.inside(x, z), inM = MED.inside(x, z), sea = (inN && !inGB) || inM;
  let d = 1e9; if (inN || inGB || NSEA.box[0] - 3e4 < x) { d = Math.min(d, NSEA.edge(x, z), GB.edge(x, z)); } d = Math.min(d, MED.edge(x, z));
  return sea ? d : -d; }

// ---------- relief: mountains, hills and rivers ----------
const ALPS = line([[43.9, 7.5], [44.2, 7.0], [44.7, 6.85], [45.2, 6.95], [45.6, 7.05], [45.9, 7.0], [46.0, 7.8], [46.4, 8.5], [46.5, 9.4], [46.6, 10.2], [46.9, 11.5], [47.1, 13.0]]);
const APEN = line([[44.4, 8.9], [44.45, 9.6], [44.3, 10.2], [44.1, 10.8], [43.7, 11.7], [43.3, 12.4], [42.8, 13.1], [42.3, 13.6], [41.6, 14.2]]);
const JURA = line([[46.2, 5.8], [46.6, 6.2], [47.0, 6.7], [47.4, 7.3]]), MORVAN = line([[47.4, 4.0], [46.9, 4.1]]), MASSIF = line([[45.9, 3.6], [45.3, 3.4], [44.8, 3.0]]);
const RIVERS = [
  ["the Thames", line([[51.47, 0.3], [51.49, 0.05], [51.5, -0.05], [51.507, -0.09], [51.51, -0.12], [51.49, -0.2], [51.47, -0.3], [51.45, -0.45]]), 130],
  ["the Medway", line([[51.42, 0.62], [51.39, 0.5], [51.3, 0.45]]), 50], ["the Somme", line([[50.2, 1.6], [50.1, 1.85], [49.95, 2.15], [49.894, 2.3], [49.88, 2.6]]), 40],
  ["the Seine", line([[49.0, 2.0], [48.95, 2.25], [48.88, 2.38], [48.858, 2.343], [48.853, 2.355], [48.83, 2.4], [48.8, 2.5], [48.4, 3.0], [48.2, 3.3]]), 110], ["the Yonne", line([[48.2, 3.3], [47.95, 3.45], [47.8, 3.57], [47.5, 3.6]]), 50],
  ["the Saône", line([[47.0, 4.9], [46.6, 4.9], [46.307, 4.85], [46.0, 4.78], [45.765, 4.83]]), 120], ["the Rhône", line([[46.2, 5.4], [45.9, 5.3], [45.77, 4.86], [45.5, 4.85], [45.0, 4.85], [44.5, 4.75]]), 200],
  ["the Arc", line([[45.6, 6.0], [45.28, 6.35], [45.25, 6.7], [45.29, 6.88]]), 25], ["the Dora Riparia", line([[45.14, 7.05], [45.1, 7.35], [45.08, 7.65]]), 30],
  ["the Po", line([[45.0, 7.6], [45.07, 7.7], [45.1, 8.4], [45.15, 9.1], [45.06, 9.7], [45.0, 10.3], [44.95, 11.6]]), 180],
  ["the Arno", line([[43.68, 10.3], [43.71, 10.6], [43.73, 10.9], [43.768, 11.25], [43.77, 11.4]]), 70], ["the Tiber", line([[41.73, 12.25], [41.86, 12.46], [41.9, 12.475], [42.0, 12.5], [42.4, 12.45]]), 90]];
function mountainH(x, z) { let h = 0;
  const da = ALPS.d(x, z, 9e4); if (da < 9e4) { const k = 1 - sstepN(da, 1e4, 9e4); h = Math.max(h, k * (2200 + 1500 * fbm(x / 9000, z / 9000, 4)) * (0.55 + 0.45 * Math.pow(1 - Math.abs(2 * fbm(x / 4000 + 3, z / 4000, 4) - 1), 1.5))); }
  const dp = APEN.d(x, z, 6e4); if (dp < 6e4) { const k = 1 - sstepN(dp, 8e3, 6e4); h = Math.max(h, k * (900 + 800 * fbm(x / 7000 + 5, z / 7000, 4))); }
  const dj = JURA.d(x, z, 3e4); if (dj < 3e4) h = Math.max(h, (1 - sstepN(dj, 4e3, 3e4)) * (700 + 400 * fbm(x / 5000, z / 5000, 3)));
  const dm = MORVAN.d(x, z, 3e4); if (dm < 3e4) h = Math.max(h, (1 - sstepN(dm, 5e3, 3e4)) * 450);
  const dc = MASSIF.d(x, z, 5e4); if (dc < 5e4) h = Math.max(h, (1 - sstepN(dc, 1e4, 5e4)) * 900);
  return h; }

// ---------- the route: London to Rome, through the towns a traveller of 1250 would pass ----------
// [name, lat, lon, ground elevation (m), stop?] The line follows the old roads (Watling Street to Dover; Wissant, the usual Channel
// port then; Paris; Burgundy; the papal court at Lyon; over the Mont Cenis pass; Turin; the Po plain; the Cisa pass; the Via
// Francigena through Tuscany to Rome).
const WAY = [["London", 51.5025, -0.094, 8, 1], ["Rochester", 51.385, 0.513, 10, 1], ["Canterbury", 51.276, 1.089, 15, 1], ["Dover", 51.123, 1.312, 6, 1], ["", 51.0, 1.48, 6],
  ["Wissant", 50.886, 1.663, 6, 1], ["Montreuil", 50.464, 1.763, 40, 0], ["Abbeville", 50.105, 1.835, 10, 0], ["Amiens", 49.889, 2.311, 30, 1], ["Beauvais", 49.428, 2.089, 70, 1],
  ["Beaumont-sur-Oise", 49.142, 2.287, 30, 0], ["Saint-Denis", 48.933, 2.369, 35, 0], ["", 48.88, 2.375, 40], ["Paris", 48.851, 2.364, 35, 1], ["", 48.6, 3.1, 90], ["Troyes", 48.294, 4.068, 110, 1], ["", 47.75, 4.5, 280],
  ["Beaune", 47.025, 4.840, 220, 0], ["Chalon-sur-Saône", 46.781, 4.854, 180, 0], ["Mâcon", 46.307, 4.832, 175, 0], ["Lyon", 45.766, 4.836, 170, 1], ["", 45.65, 5.4, 300], ["Chambéry", 45.564, 5.917, 270, 0],
  ["Saint-Jean-de-Maurienne", 45.276, 6.345, 560, 0], ["", 45.22, 6.65, 1050], ["Lanslebourg", 45.287, 6.880, 1400, 0], ["the Mont Cenis pass", 45.25, 6.90, 2083, 1], ["Susa", 45.138, 7.049, 500, 0],
  ["", 45.10, 7.30, 380], ["Turin", 45.066, 7.692, 240, 1], ["Vercelli", 45.322, 8.419, 130, 0], ["Pavia", 45.185, 9.158, 75, 1], ["Piacenza", 45.053, 9.693, 60, 0], ["Fidenza", 44.866, 10.061, 75, 0],
  ["", 44.62, 10.0, 500], ["the Cisa pass", 44.47, 9.93, 1041, 0], ["Pontremoli", 44.376, 9.880, 240, 0], ["Luni", 44.11, 9.96, 20, 0], ["Lucca", 43.847, 10.498, 20, 1],
  ["", 43.78, 10.85, 30], ["Florence", 43.7675, 11.263, 50, 1], ["", 43.6, 11.15, 200], ["San Gimignano", 43.468, 11.043, 320, 0], ["Siena", 43.322, 11.337, 320, 1],
  ["Radicofani", 42.896, 11.769, 700, 0], ["Bolsena", 42.645, 11.986, 350, 0], ["Viterbo", 42.421, 12.108, 330, 0], ["Sutri", 42.245, 12.216, 290, 0], ["", 42.05, 12.38, 120], ["Rome", 41.9065, 12.4585, 20, 1]];
const ROUTE = (() => { const P = WAY.map(w => { const [x, z] = LL(w[1], w[2]); return new THREE.Vector3(x, w[3], z); });
  const curve = new THREE.CatmullRomCurve3(P, false, "centripetal"); curve.arcLengthDivisions = 20000;
  const L = curve.getLength(), n = Math.ceil(L / 40), X = new Float64Array(n + 1), Z = new Float64Array(n + 1), E = new Float32Array(n + 1), HY = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) { const p = curve.getPointAt(i / n); X[i] = p.x; Z[i] = p.z; E[i] = p.y; }
  for (let pass = 0; pass < 3; pass++) { const c = E.slice(); for (let i = 0; i <= n; i++) { let s = 0, k = 0; for (let j = -40; j <= 40; j++) { const q = i + j; if (q >= 0 && q <= n) { s += c[q]; k++; } } E[i] = s / k; } }   // gentle grades
  let prev = 0; for (let i = 0; i <= n; i++) { const a = Math.max(0, i - 8), b = Math.min(n, i + 8); let y = Math.atan2(-(X[b] - X[a]), -(Z[b] - Z[a])); if (i) y = prev + Math.atan2(Math.sin(y - prev), Math.cos(y - prev)); HY[i] = prev = y; }
  const stops = WAY.map((w, k) => { const [x, z] = LL(w[1], w[2]); let best = 0, bd = 1e18; for (let i = 0; i <= n; i += 2) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return { name: w[0], s: best * 40, i: best, stop: !!w[4], lat: w[1], lon: w[2] }; }).filter(s => s.name);
  return { X, Z, E, HY, n, step: L / n, L, stops }; })();
function routeAt(s) { const f = clampN(s / ROUTE.step, 0, ROUTE.n - 1e-6), i = Math.floor(f), u = f - i, R = ROUTE;
  return { x: R.X[i] + (R.X[i + 1] - R.X[i]) * u, z: R.Z[i] + (R.Z[i + 1] - R.Z[i]) * u, y: R.E[i] + (R.E[i + 1] - R.E[i]) * u, h: R.HY[i] + (R.HY[i + 1] - R.HY[i]) * u }; }
// the nearest point of the route (a coarse grid of route samples, then a local search)
const RGRID = new Map(); for (let i = 0; i <= ROUTE.n; i += 5) { const k = Math.floor(ROUTE.X[i] / 4000) + "," + Math.floor(ROUTE.Z[i] / 4000); if (!RGRID.has(k)) RGRID.set(k, []); RGRID.get(k).push(i); }
function routeNear(x, z) { const gx = Math.floor(x / 4000), gz = Math.floor(z / 4000); let best = -1, bd = 1e18;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of RGRID.get((gx + a) + "," + (gz + b)) || []) { const d = (ROUTE.X[i] - x) ** 2 + (ROUTE.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
  if (best < 0) return null; for (let i = Math.max(0, best - 5); i <= Math.min(ROUTE.n, best + 5); i++) { const d = (ROUTE.X[i] - x) ** 2 + (ROUTE.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
  return { i: best, d: Math.sqrt(bd), e: ROUTE.E[best] }; }

// ---------- the ground's height: lowland hills, mountains, rivers, sea; the train's way runs in a gentle corridor ----------
// The lowland ground follows the elevation of the towns along the way (from the nearest stretch of route), with rolling hills on
// top; mountains rise from that; rivers and the sea are cut in. Near the line, hills are eased down to the train's level (a broad,
// gentle cutting); where the ground falls away the invisible train simply runs above it.
const WATER = 0;
const RGRID2 = new Map(); for (let i = 0; i <= ROUTE.n; i += 25) { const k = Math.floor(ROUTE.X[i] / 20000) + "," + Math.floor(ROUTE.Z[i] / 20000); if (!RGRID2.has(k)) RGRID2.set(k, []); RGRID2.get(k).push(i); }
function baseLevel(x, z) { const gx = Math.floor(x / 20000), gz = Math.floor(z / 20000); let bd = 1e18, e = 120;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of RGRID2.get((gx + a) + "," + (gz + b)) || []) { const d = (ROUTE.X[i] - x) ** 2 + (ROUTE.Z[i] - z) ** 2; if (d < bd) { bd = d; e = ROUTE.E[i]; } }
  return lerpN(Math.min(e, 600), 120, sstepN(Math.sqrt(bd), 15000, 40000)); }
function naturalH(x, z) { const sd = seaDist(x, z); if (sd > 0) return -Math.min(40, 3 + sd / 200);
  let h = baseLevel(x, z) + 70 * fbm(x / 9000 + 7, z / 9000, 4) + 25 * (fbm(x / 2500, z / 2500 + 9, 3) - 0.5);
  h = Math.max(h, mountainH(x, z) + 120 * (fbm(x / 1500, z / 1500, 3) - 0.5) * sstepN(mountainH(x, z), 300, 1500));
  h *= sstepN(-sd, 0, 2500); h = Math.max(h, 1.5 * sstepN(-sd, 0, 300));                                         // down to the shore
  for (const [, R, w] of RIVERS) { const d = R.d(x, z, 3000); if (d < w + 1500) h = lerpN(Math.min(h, -2.5), h, sstepN(d, w * 0.5, w + 1200)); }
  return h; }
function terrainH(x, z) { const h = naturalH(x, z); if (h < 0) return h; const r = routeNear(x, z); if (!r || r.d > 2500 || h <= r.e - 0.5) return h;   // water stays water; low ground stays low
  return lerpN(r.e - 0.5, h, sstepN(r.d, 40, h > r.e + 80 ? 2500 : 1000)); }

// ---------- the moving origin: everything outside is drawn relative to ORIGIN, which jumps to keep up with the train ----------
const ORIGIN = { x: 0, z: 0 }, WORLD = new THREE.Group(); scene.add(WORLD);
const ANCHORED = [];                                         // objects placed in world coordinates: { obj, x, y, z }
function anchor(obj, x, y, z) { obj.position.set(x - ORIGIN.x, y, z - ORIGIN.z); ANCHORED.push({ obj, x, y, z }); WORLD.add(obj); return obj; }
function unanchor(obj) { const i = ANCHORED.findIndex(a => a.obj === obj); if (i >= 0) ANCHORED.splice(i, 1); WORLD.remove(obj); }
function recentre(x, z) { ORIGIN.x = Math.round(x / 1000) * 1000; ORIGIN.z = Math.round(z / 1000) * 1000; for (const a of ANCHORED) a.obj.position.set(a.x - ORIGIN.x, a.y, a.z - ORIGIN.z); for (const L of LEVELS) L.dirty = true; }

// ---------- sky, sun, haze ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.5)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(50000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc8d6dc, IS_HEADSET ? 0.00009 : 0.00006);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x6a7a4a, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false, toneMapped: false })); scene.add(sunDisc);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x47686c, roughness: 0.2, metalness: 0.1, map: tex(256, 256, speckle("#ffffff", 1500, ["#d8e4e4", "#ffffff", "#c0d0d0"], 6, 1.2), [6000, 6000]) });
const water = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000).rotateX(-Math.PI / 2), waterMat); water.position.y = WATER; scene.add(water);
// the sun's position for a date and place: 21 June 1250 (Julian calendar 14 June), declination +23.4°
function sunDir(hour, latDeg) { const dec = 23.44 * Math.PI / 180, lat = latDeg * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H));
  return { el, v: V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)) }; }

// ---------- the ground: nested grids, each twice as coarse as the last, following the train (positions relative to ORIGIN) ----------
const GN = IS_HEADSET ? 96 : 128, NLV = IS_HEADSET ? 9 : 10, CELL0 = 2;
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: tex(256, 256, speckle("#c4c4c4", 6000, ["#eeeeee", "#8a8a8a", "#a8a8a8", "#d8d8d8"], 1.5, 3)) });
const LEVELS = [];
for (let k = 0; k < NLV; k++) { const n = GN + 1, geo = new THREE.BufferGeometry(), idx = new Uint16Array(GN * GN * 6); let o = 0;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  for (const [nm, sz] of [["position", 3], ["color", 3], ["uv", 2], ["normal", 3]]) geo.setAttribute(nm, new THREE.BufferAttribute(new Float32Array(n * n * sz), sz));
  const mesh = new THREE.Mesh(geo, groundMat); mesh.frustumCulled = false; scene.add(mesh);
  LEVELS.push({ c: CELL0 * 2 ** k, ox: NaN, oz: NaN, H: new Float32Array(n * n), C: new Float32Array(n * n * 3), geo, mesh, dirty: true }); }
const _gc = new THREE.Color(), _c1 = new THREE.Color();
function levelRecentre(L, cx, cz) { const c = L.c, n = GN + 1, step = 2 * c, ox = Math.round(cx / step) * step, oz = Math.round(cz / step) * step;
  if (ox === L.ox && oz === L.oz) return false;
  const H2 = new Float32Array(n * n), C2 = new Float32Array(n * n * 3), had = !isNaN(L.ox), di = had ? Math.round((ox - L.ox) / c) : 0, dj = had ? Math.round((oz - L.oz) / c) : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, si = i + di, sj = j + dj;
    if (had && si >= 0 && si <= GN && sj >= 0 && sj <= GN) { const q = sj * n + si; H2[k] = L.H[q]; C2[3 * k] = L.C[3 * q]; C2[3 * k + 1] = L.C[3 * q + 1]; C2[3 * k + 2] = L.C[3 * q + 2]; continue; }
    const x = ox + (i - GN / 2) * c, z = oz + (j - GN / 2) * c, h = terrainH(x, z); H2[k] = h; groundColor(x, z, h, _gc); C2[3 * k] = _gc.r; C2[3 * k + 1] = _gc.g; C2[3 * k + 2] = _gc.b; }
  L.H = H2; L.C = C2; L.ox = ox; L.oz = oz; L.dirty = true; return true; }
function levelWrite(L, F) { const c = L.c, n = GN + 1, p = L.geo.attributes.position.array, uv = L.geo.attributes.uv.array, half = F ? GN / 2 * F.c - c * 1.01 : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, x = L.ox + (i - GN / 2) * c, z = L.oz + (j - GN / 2) * c;
    const ex = F ? Math.max(Math.abs(x - F.ox), Math.abs(z - F.oz)) : 1e9, inner = ex < half, edge = !inner && ex < half + c * 0.99;
    p[3 * k] = x - ORIGIN.x; p[3 * k + 1] = inner ? L.H[k] - 80 : edge ? L.H[k] - 0.15 - 0.03 * c : L.H[k]; p[3 * k + 2] = z - ORIGIN.z; uv[2 * k] = (x % 6000) / 6; uv[2 * k + 1] = (z % 6000) / 6; }
  const nr = L.geo.attributes.normal.array, H = L.H;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, gx = (H[j * n + Math.min(GN, i + 1)] - H[j * n + Math.max(0, i - 1)]) / ((Math.min(GN, i + 1) - Math.max(0, i - 1)) * c),
    gz = (H[Math.min(GN, j + 1) * n + i] - H[Math.max(0, j - 1) * n + i]) / ((Math.min(GN, j + 1) - Math.max(0, j - 1)) * c), l = Math.hypot(gx, 1, gz); nr[3 * k] = -gx / l; nr[3 * k + 1] = 1 / l; nr[3 * k + 2] = -gz / l; }
  L.geo.attributes.color.array.set(L.C); for (const a of ["position", "color", "uv", "normal"]) L.geo.attributes[a].needsUpdate = true; L.dirty = false; }
function updateGround(x, z, budget = 2) { const moved = [];
  for (let k = 0; k < NLV; k++) if (budget > 0 && levelRecentre(LEVELS[k], x, z)) { budget--; moved[k] = true; }
  for (let k = 0; k < NLV; k++) { const L = LEVELS[k]; if (isNaN(L.ox)) continue; if (L.dirty || moved[k - 1]) levelWrite(L, k ? LEVELS[k - 1] : null); } }
// the colour of the land: fields and meadows (a patchwork near villages), woods, heath, rock and snow up high, beaches
function regionOf(x, z) { const lat = LAT0 - z / KZ; return lat > 50.8 ? "england" : lat > 45.6 ? "france" : lat > 45.0 && x > LL(45, 6.6)[0] ? "alps" : "italy"; }
function woodAt(x, z, h) { if (h < 1) return 0; return clampN(sstepN(fbm(x / 6000 + 31, z / 6000 - 7, 4), 0.5, 0.62) + (h > 900 ? 0.5 * sstepN(h, 900, 1300) * (1 - sstepN(h, 1700, 2100)) : 0), 0, 1); }
function farmAt(x, z, h) { if (h < 1 || h > 1300) return 0; return clampN((1 - woodAt(x, z, h)) * sstepN(fbm(x / 9000 - 3, z / 9000 + 11, 3), 0.3, 0.45) * (1 - sstepN(h, 700, 1300)), 0, 1); }
function groundColor(x, z, h, c) { const n1 = fbm(x / 60, z / 60, 3), n2 = fbm(x / 900 + 5, z / 900, 3), reg = regionOf(x, z), south = reg === "italy";
  if (h < 0) { c.setRGB(0.42, 0.40, 0.33); return c; }
  c.setRGB(0.30 + 0.08 * n2, 0.45 + 0.08 * n1, 0.18);                                                       // meadow and pasture
  if (south) c.lerp(_c1.setRGB(0.52 + 0.06 * n1, 0.50 + 0.05 * n1, 0.28), 0.5);                                   // drier southern grass in June
  const farm = farmAt(x, z, h); if (farm > 0.05) { const strip = Math.floor((x * 0.7 + z * 0.3) / 18 + 7 * fbm(x / 400, z / 400, 2)) + Math.floor((z * 0.8 - x * 0.2) / 220) * 13, kind = hash(strip, 3);
    const fc = kind < 0.35 ? _c1.setRGB(0.70, 0.62, 0.32) : kind < 0.55 ? _c1.setRGB(0.46, 0.55, 0.22) : kind < 0.7 ? _c1.setRGB(0.55, 0.45, 0.32) : _c1.setRGB(0.38, 0.52, 0.20);   // ripening grain, green crops, fallow, hay
    c.lerp(fc, farm * 0.85); }
  const w = woodAt(x, z, h); if (w > 0.1) c.lerp(_c1.setRGB(0.13 + 0.04 * n1, 0.24 + 0.05 * n1, 0.10), w * 0.85);
  if (h > 1500) c.lerp(_c1.setRGB(0.48 + 0.1 * n1, 0.47 + 0.08 * n1, 0.43), sstepN(h, 1500, 2300));                // bare rock above the trees
  if (h > 2600) c.lerp(_c1.setRGB(0.92, 0.94, 0.96), sstepN(h, 2600, 3000));                                        // snow on the high peaks, even in June
  if (h < 2.5) c.lerp(_c1.setRGB(0.66, 0.62, 0.48), sstepN(2.5 - h, 0, 1.5) * 0.7);
  return c; }

// ---------- the train: five cars you can walk through (front to back): two sleeping cars, the dining car, the lounge, and the
// observation car with its open rear platform. Train coordinates: x across (+ right), z along (- toward the front), y up from the floor.
const TRAIN = new THREE.Group(); scene.add(TRAIN); TRAIN.add(rig);
const CAR_L = 24, GAP = 1.2, CAR_W = 3.0, CAR_H = 2.5, NCARS = 5, CARS = ["sleeping car (Ambleside)", "sleeping car (Burgundy)", "dining car", "lounge car", "observation car"];
const carZ = k => (k - (NCARS - 1) / 2) * (CAR_L + GAP);       // centre of car k
const WALK = [];                                               // walkable rectangles: [x0, x1, z0, z1]
const woodT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6a3e22"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${40 + 30 * Math.sin(y * 0.21)},${20 + 15 * Math.sin(y * 0.13)},10,.18)`; g.fillRect(0, y, w, 1); } }, [2, 1]);
const carpetT = tex(128, 128, (g, w, h) => { g.fillStyle = "#6a1e24"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(220,180,90,.35)"; g.lineWidth = 2; for (let k = -w; k < w * 2; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); } }, [3, 18]);
const IMT = { wood: new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.55 }), panel: M(0xe8dcc0, { roughness: 0.7 }), carpet: new THREE.MeshStandardMaterial({ map: carpetT, roughness: 1 }), brass: M(0xc9a227, { metalness: 0.8, roughness: 0.3 }),
  velvet: M(0x2a4a6a, { roughness: 0.95 }), green: M(0x2e5a3e, { roughness: 0.95 }), linen: M(0xf2ede0, { roughness: 0.9 }), dark: M(0x2a241e, { roughness: 0.8 }), glass: new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }), outside: M(0x1f3a5a, { metalness: 0.4, roughness: 0.4 }), roofM: M(0x3a3e44, { metalness: 0.5, roughness: 0.5 }) };
function box(g, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); g.add(m); return m; }
// a car shell: floor, walls with a long band of windows (or all glass), roof, and the end doors
function shell(k, opts = {}) { const g = new THREE.Group(), z0 = carZ(k); g.position.z = z0; TRAIN.add(g); const L = CAR_L, W = CAR_W, H = CAR_H, wy0 = opts.glass ? 0.45 : 0.85, wy1 = opts.glass ? 2.35 : 1.95;
  box(g, W, 0.08, L, 0, -0.04, 0, IMT.carpet); box(g, W + 0.2, 0.25, L + 0.2, 0, -0.2, 0, IMT.outside);
  for (const sd of [-1, 1]) { box(g, 0.08, wy0, L, sd * W / 2, wy0 / 2, 0, IMT.wood); box(g, 0.08, H - wy1, L, sd * W / 2, (H + wy1) / 2, 0, IMT.panel);
    for (let p = -L / 2; p <= L / 2 + 0.01; p += opts.glass ? 2.4 : 1.6) box(g, 0.1, wy1 - wy0, 0.12, sd * W / 2, (wy0 + wy1) / 2, p, IMT.wood);
    box(g, 0.02, wy1 - wy0, L, sd * W / 2, (wy0 + wy1) / 2, 0, IMT.glass);
    box(g, 0.25, 0.4, L, sd * (W / 2 + 0.12), H + 0.1, 0, IMT.outside); }
  if (opts.glass) { box(g, W, 0.02, L * 0.8, 0, H + 0.3, 0, IMT.glass); for (let p = -L / 2; p <= L / 2; p += 2.4) box(g, W, 0.08, 0.1, 0, H + 0.3, p, IMT.wood); }
  else box(g, W, 0.06, L, 0, H, 0, IMT.panel);
  box(g, W + 0.25, 0.3, L + 0.2, 0, H + (opts.glass ? 0.45 : 0.2), opts.glass ? L * 0.45 : 0, IMT.roofM).scale.z = opts.glass ? 0.1 : 1;
  for (const e of opts.noFront ? [1] : opts.noBack ? [-1] : [-1, 1]) { box(g, (W - 1) / 2, H, 0.08, -(W + 1) / 4, H / 2, e * L / 2, IMT.panel); box(g, (W - 1) / 2, H, 0.08, (W + 1) / 4, H / 2, e * L / 2, IMT.panel); box(g, 1, H - 2.1, 0.08, 0, 2.1 + (H - 2.1) / 2, e * L / 2, IMT.panel); }
  for (let p = -L / 2 + 2; p < L / 2; p += 4) { box(g, 0.5, 0.04, 0.3, 0, H - 0.04, p, IMT.lamp); }   // ceiling lamps
  return g; }
function addLight(g, x, y, z, i = 0.6) { const l = new THREE.PointLight(0xffd8a0, i, 7, 1.5); l.position.set(x, y, z); g.add(l); return l; }
const LAMPS = [];
// gangways between cars
for (let k = 0; k < NCARS - 1; k++) { const z = carZ(k) + CAR_L / 2 + GAP / 2, g = new THREE.Group(); TRAIN.add(g); box(g, 1.1, 0.05, GAP + 0.1, 0, -0.02, z, IMT.dark); for (const sd of [-1, 1]) box(g, 0.05, 2.1, GAP, sd * 0.58, 1.05, z, M(0x222222)); box(g, 1.1, 0.05, GAP, 0, 2.12, z, M(0x222222)); WALK.push([-0.5, 0.5, z - GAP / 2 - 0.3, z + GAP / 2 + 0.3]); }
const BEDS = [];
// two sleeping cars: a corridor along the right side, compartments on the left with an upper and lower berth, a washbasin, a window
for (const k of [0, 1]) { const g = shell(k, { noFront: k === 0 }), L = CAR_L, nC = 8, cw = L / nC;
  WALK.push([0.55, 1.4, carZ(k) - L / 2 + 0.2, carZ(k) + L / 2 - 0.2]); WALK.push([-0.5, 0.6, carZ(k) - L / 2 - 0.1, carZ(k) - L / 2 + 0.6]); WALK.push([-0.5, 0.6, carZ(k) + L / 2 - 0.6, carZ(k) + L / 2 + 0.1]);
  box(g, 0.08, CAR_H, L - 1.2, 0.45, CAR_H / 2, 0, IMT.wood);                              // the corridor wall, with compartment doors
  for (let c = 0; c < nC; c++) { const zc = -L / 2 + 0.6 + cw * c + cw / 2 - 0.15, zz = zc;
    if (c) box(g, 1.9, CAR_H, 0.06, -0.5, CAR_H / 2, -L / 2 + 0.6 + cw * c - 0.15, IMT.wood);
    box(g, 0.1, CAR_H, 0.8, 0.45, CAR_H / 2, zz, M(0x3a2a1e)).visible = false;          // (the doorway opening)
    box(g, 1.05, 0.5, cw - 0.4, -0.95, 0.25, zz, IMT.wood); box(g, 1.0, 0.16, cw - 0.45, -0.95, 0.58, zz, IMT.linen); box(g, 0.95, 0.12, 0.3, -0.95, 0.7, zz - (cw - 0.45) / 2 + 0.2, IMT.linen);   // lower berth, pillow
    box(g, 1.0, 0.06, cw - 0.45, -0.95, 1.55, zz, IMT.wood); box(g, 1.0, 0.14, cw - 0.45, -0.95, 1.65, zz, IMT.velvet);   // upper berth
    box(g, 0.25, 0.04, 0.3, -0.2, 0.95, zz + cw / 2 - 0.45, IMT.brass); box(g, 0.08, 0.5, 0.08, -0.2, 1.4, zz + cw / 2 - 0.4, M(0xdddddd, { metalness: 0.6 }));   // washbasin
    BEDS.push(V3(-0.95, 0, carZ(k) + zz)); WALK.push([-1.42, 0.55, carZ(k) + zz - cw / 2 + 0.25, carZ(k) + zz + cw / 2 - 0.25]);
    addLight(g, -0.6, 2.1, zz, 0.25); }
  box(g, 0.6, 0.04, L - 1.4, 1.1, 0.95, 0, IMT.brass).scale.set(0.1, 1, 1); }                // corridor hand rail
// the dining car: tables for four with white cloths and lamps along both sides, an aisle down the middle
{ const k = 2, g = shell(k); WALK.push([-0.45, 0.45, carZ(k) - CAR_L / 2 - 0.1, carZ(k) + CAR_L / 2 + 0.1]);
  for (let r = 0; r < 7; r++) { const z = -CAR_L / 2 + 2.5 + r * 3.2; for (const sd of [-1, 1]) { const x = sd * 1.0;
      box(g, 0.9, 0.05, 0.9, x, 0.75, z, IMT.linen); box(g, 0.1, 0.72, 0.1, x, 0.36, z, IMT.dark);
      for (const e of [-1, 1]) { box(g, 0.95, 0.45, 0.5, x, 0.22, z + e * 0.9, IMT.green); box(g, 0.95, 0.75, 0.12, x, 0.75, z + e * 1.12, IMT.green); }
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.14, 12), IMT.lamp); lamp.position.set(x, 0.92, z); g.add(lamp); box(g, 0.02, 0.15, 0.02, x, 0.82, z, IMT.brass);
      for (const e of [-1, 1]) { box(g, 0.22, 0.012, 0.22, x + 0.2 * e, 0.78, z + e * 0.2, M(0xffffff)); box(g, 0.05, 0.12, 0.05, x - 0.25 * e, 0.84, z - e * 0.1, new THREE.MeshStandardMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.4 })); } } }
  addLight(g, 0, 2.2, -6, 0.6); addLight(g, 0, 2.2, 6, 0.6); }
// the lounge: armchairs and sofas facing the windows, a bar, the route map and controls at the front end
const MAPC = document.createElement("canvas"); MAPC.width = 1024; MAPC.height = 640; const mapT = new THREE.CanvasTexture(MAPC); mapT.colorSpace = THREE.SRGBColorSpace;
let mapPanel;
{ const k = 3, g = shell(k); WALK.push([-1.3, 1.3, carZ(k) - CAR_L / 2 + 1.1, carZ(k) + CAR_L / 2 - 0.2]); WALK.push([-0.5, 0.5, carZ(k) - CAR_L / 2 - 0.1, carZ(k) - CAR_L / 2 + 1.2]);
  for (let r = 0; r < 5; r++) { const z = -CAR_L / 2 + 4 + r * 3.6; for (const sd of [-1, 1]) { const x = sd * 0.95;
      box(g, 0.7, 0.42, 0.7, x, 0.21, z, IMT.velvet); box(g, 0.12, 0.6, 0.7, x - sd * 0.32, 0.6, z, IMT.velvet); box(g, 0.7, 0.3, 0.12, x, 0.55, z - 0.32, IMT.velvet); box(g, 0.7, 0.3, 0.12, x, 0.55, z + 0.32, IMT.velvet); } }
  box(g, 2.2, 1.05, 0.5, 0, 0.52, CAR_L / 2 - 1.2, IMT.wood); box(g, 2.3, 0.05, 0.6, 0, 1.06, CAR_L / 2 - 1.2, IMT.brass);   // the bar
  mapPanel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: mapT, toneMapped: false })); mapPanel.position.set(0, 1.45, -CAR_L / 2 + 0.95); g.add(mapPanel);   // facing back into the car
  box(g, 2.6, 1.7, 0.06, 0, 1.45, -CAR_L / 2 + 0.9, IMT.wood);
  addLight(g, 0, 2.2, -5, 0.5); addLight(g, 0, 2.2, 5, 0.5); }
// the observation car: glass walls and roof, armchairs turned outward, and an open platform with a railing at the very back
{ const k = 4, g = shell(k, { glass: true, noBack: true }); WALK.push([-1.3, 1.3, carZ(k) - CAR_L / 2 - 0.1, carZ(k) + CAR_L / 2 + 0.05]); WALK.push([-1.35, 1.35, carZ(k) + CAR_L / 2, carZ(k) + CAR_L / 2 + 2.3]);
  for (let r = 0; r < 6; r++) { const z = -CAR_L / 2 + 3 + r * 3.3; for (const sd of [-1, 1]) { const x = sd * 0.85; const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = -sd * Math.PI / 2 * 0.7; g.add(ch);
      box(ch, 0.7, 0.42, 0.7, 0, 0.21, 0, IMT.green); box(ch, 0.7, 0.6, 0.12, 0, 0.6, 0.32, IMT.green); } }
  const pz = CAR_L / 2 + 1.2; box(g, CAR_W, 0.08, 2.4, 0, -0.04, pz, M(0x5a4a3a)); for (const sd of [-1, 1]) box(g, 0.05, 1.05, 2.4, sd * CAR_W / 2, 0.52, pz, IMT.brass); box(g, CAR_W, 1.05, 0.05, 0, 0.52, pz + 1.2, IMT.brass);
  for (const sd of [-1, 1]) box(g, 0.04, 1.05, 0.04, sd * CAR_W / 2, 0.52, pz + 1.2, IMT.brass); box(g, CAR_W, 0.05, 0.05, 0, 1.05, pz + 1.2, IMT.brass);
  addLight(g, 0, 2.2, 0, 0.4); }
// the front of the train: a streamlined nose (seen only from the windows on curves)
{ const g = new THREE.Group(); g.position.z = carZ(0) - CAR_L / 2 - 4; TRAIN.add(g); const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), IMT.outside); nose.scale.set(1.6, 1.4, 4); nose.position.y = 1.3; g.add(nose); }
function walkable(x, z) { for (const [x0, x1, z0, z1] of WALK) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return true; return false; }
function carAt(z) { for (let k = 0; k < NCARS; k++) if (Math.abs(z - carZ(k)) < CAR_L / 2 + GAP / 2) return k; return z > carZ(NCARS - 1) ? 4 : 0; }

// ---------- building kit: unit shapes drawn as instances (one draw per shape per tile) ----------
const UG = { box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), gable: (() => { const g = new THREE.BufferGeometry(), v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, 0.5,
    -0.5, 0, -0.5, 0, 1, -0.5, 0, 1, 0.5, -0.5, 0, -0.5, 0, 1, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5];
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; })(),
  cone: new THREE.ConeGeometry(0.5, 1, 8).translate(0, 0.5, 0), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0), pyr: new THREE.ConeGeometry(0.71, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  tree: new THREE.IcosahedronGeometry(1, 1), trunk: new THREE.CylinderGeometry(0.15, 0.25, 1, 5).translate(0, 0.5, 0), sail: new THREE.BoxGeometry(0.8, 9, 0.05).translate(0, 4.5, 0),
  dome: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), arch: new THREE.TorusGeometry(0.5, 0.12, 4, 10, Math.PI) };
const KM = { wall: new THREE.MeshStandardMaterial({ roughness: 0.9 }), roof: new THREE.MeshStandardMaterial({ roughness: 0.95 }), leaf: new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }),
  wood: M(0x6a4a2c), sail: M(0xe8dcc0, { side: THREE.DoubleSide }), lead: M(0x8a9098, { metalness: 0.3, roughness: 0.6 }) };
const _kc = new THREE.Color();
class Kit { constructor() { this.L = {}; }
  add(shape, mat, x, y, z, sx, sy, sz, ry, col) { (this.L[shape + "|" + mat] ||= []).push([x, y, z, sx, sy, sz, ry || 0, col ?? 0xffffff]); }
  build() { const g = new THREE.Group(); for (const key in this.L) { const [shape, mat] = key.split("|"), list = this.L[key], im = new THREE.InstancedMesh(UG[shape], KM[mat], list.length);
      list.forEach(([x, y, z, sx, sy, sz, ry, col], i) => { O3.position.set(x, y, z); O3.rotation.set(0, ry, 0); O3.scale.set(sx, sy, sz); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); im.setColorAt(i, _kc.setHex(col)); });
      im.frustumCulled = false; g.add(im); } return g; } }
// building types (positions relative to the kit's origin; gy = ground height there)
const STYLE = { england: { wall: [0xd8ccb0, 0xc8b898, 0xe0d4bc], roof: [0x9a8a5a, 0x8a7a4e, 0xa8985e], stone: 0xb8b0a0 }, france: { wall: [0xdcd0b4, 0xd0c4a4, 0xe4d8c0], roof: [0x9a8a5a, 0x7a5a48, 0x8a6a50], stone: 0xc8bea8 },
  alps: { wall: [0x8a7a66, 0x9a8a72, 0x7a6a56], roof: [0x5a5a5a, 0x6a6460, 0x4e4a46], stone: 0x9a948a }, italy: { wall: [0xd8b890, 0xc8a07a, 0xe0c8a0], roof: [0xa85a3a, 0xb8683e, 0x9a4e32], stone: 0xd0c0a0 } };
function house(K, x, gy, z, w, d, ry, reg, r) { const S = STYLE[reg], wh = reg === "italy" ? 4.5 + r() * 3 : 2.6 + r() * 1.2;
  K.add("box", "wall", x, gy - 0.4, z, w, wh + 0.4, d, ry, S.wall[(r() * 3) | 0]); K.add("gable", "roof", x, gy + wh, z, w + 0.6, reg === "italy" ? 1.4 : 3.2, d + 0.6, ry, S.roof[(r() * 3) | 0]); }
function church(K, x, gy, z, ry, reg, big = 1) { const S = STYLE[reg], L = 22 * big, W = 9 * big, H = 9 * big, c = Math.cos(ry), s = Math.sin(ry);
  K.add("box", "wall", x, gy - 0.5, z, W, H + 0.5, L, ry, S.stone); K.add("gable", "roof", x, gy + H, z, W + 0.6, 5 * big, L + 0.6, ry, reg === "italy" ? S.roof[0] : 0x6a6a68);
  const tx = x + s * (L / 2 + 2.5 * big), tz = z + c * (L / 2 + 2.5 * big); K.add("box", "wall", tx, gy - 0.5, tz, 6 * big, 20 * big, 6 * big, ry, S.stone);
  if (reg === "italy") K.add("pyr", "roof", tx, gy + 19.5 * big, tz, 6.4 * big, 3 * big, 6.4 * big, ry, S.roof[0]); else K.add("cone", "lead", tx, gy + 19.5 * big, tz, 6 * big, 14 * big, 6 * big, ry); }
function windmill(K, x, gy, z, ry, sails) { K.add("box", "wood", x, gy, z, 0.6, 3, 0.6, 0); K.add("box", "wall", x, gy + 3, z, 4, 5, 5, ry, 0xb89a6a); K.add("gable", "roof", x, gy + 8, z, 4.4, 1.6, 5.4, ry, 0x8a7a5a); sails.push([x, gy + 6.5, z, ry]); }
function castle(K, x, gy, z, ry, reg) { const S = STYLE[reg]; K.add("box", "wall", x, gy - 1, z, 16, 24, 16, ry, S.stone); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add("cyl", "wall", x + a * 28, gy - 1, z + b * 28, 7, 14, 7, 0, S.stone);
  for (const [a, b, w, d] of [[0, -1, 56, 2], [0, 1, 56, 2], [-1, 0, 2, 56], [1, 0, 2, 56]]) K.add("box", "wall", x + a * 28, gy - 1, z + b * 28, w, 10, d, 0, S.stone); }
function trees(K, x, gy, z, s, reg, conifer) { if (conifer) { K.add("trunk", "wood", x, gy, z, s, 3 * s, s, 0); K.add("cone", "leaf", x, gy + 2 * s, z, 4 * s, 12 * s, 4 * s, 0, 0x2e4a2a); return; }
  K.add("trunk", "wood", x, gy, z, s, 4 * s, s, 0); K.add("tree", "leaf", x, gy + 6 * s, z, 3.6 * s, 3.2 * s, 3.6 * s, hash(x | 0, z | 0) * 6, reg === "italy" ? 0x4a5a2e : 0x355a28); }

// ---------- the countryside, generated 1 km square by 1 km square around the train ----------
const TILE = 1000, TR = IS_HEADSET ? 3 : 4, TILES = new Map(), SAILS = [];
function nearTown(x, z) { for (const T of TOWNS) { const d = Math.hypot(x - T.x, z - T.z); if (d < T.r + 150) return T; } return null; }
function genTile(ti, tj) { const r = seeded(ti * 7919 + tj * 104729 + 11), x0 = ti * TILE, z0 = tj * TILE, K = new Kit(), sails = [];
  const reg = regionOf(x0 + 500, z0 + 500), conifer = reg === "alps";
  const put = (fn) => { };
  // woods
  for (let k = 0; k < (IS_HEADSET ? 220 : 400); k++) { const x = x0 + r() * TILE, z = z0 + r() * TILE, h = terrainH(x, z), w = woodAt(x, z, h); if (h < 1 || r() > w || nearTown(x, z)) continue;
    const rn = routeNear(x, z); if (rn && rn.d < 30) continue; trees(K, x - x0, h, z - z0, 0.8 + r() * 0.7, reg, conifer || h > 1100); }
  // scattered trees, hedgerow trees and orchards near farms
  for (let k = 0; k < 60; k++) { const x = x0 + r() * TILE, z = z0 + r() * TILE, h = terrainH(x, z); if (h < 1 || h > 1800 || farmAt(x, z, h) < 0.2 || nearTown(x, z)) continue; const rn = routeNear(x, z); if (rn && rn.d < 30) continue; trees(K, x - x0, h, z - z0, 0.7 + r() * 0.5, reg, conifer); }
  // a village (most farmland squares near the old road have one): houses round a church, a mill
  const cx = x0 + 250 + r() * 500, cz = z0 + 250 + r() * 500, ch = terrainH(cx, cz), rn = routeNear(cx, cz);
  if (ch > 1 && ch < 1600 && farmAt(cx, cz, ch) > 0.25 && r() < 0.55 && !nearTown(cx, cz) && (!rn || rn.d > 90)) { const ry = r() * 3, nh = 8 + Math.floor(r() * 18);
    church(K, cx - x0, ch, cz - z0, ry, reg, 0.8 + r() * 0.3);
    for (let q = 0; q < nh; q++) { const a = r() * 6.28, d = 30 + r() * 110, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = terrainH(x, z); if (h < 1) continue; const rq = routeNear(x, z); if (rq && rq.d < 25) continue;
      house(K, x - x0, h, z - z0, 6 + r() * 4, 9 + r() * 6, a + Math.PI / 2 + (r() - 0.5) * 0.3, reg, r); }
    if ((reg === "england" || reg === "france") && r() < 0.7) { const a = r() * 6.28, x = cx + Math.cos(a) * 260, z = cz + Math.sin(a) * 260, h = terrainH(x, z); if (h > 1) windmill(K, x - x0, h, z - z0, r() * 6, sails); }
    VILLAGERS.push({ x: cx, z: cz, tile: ti + "," + tj, reg }); }
  // a castle on a rise, now and then; a monastery or grange
  if (r() < 0.05) { const x = x0 + 200 + r() * 600, z = z0 + 200 + r() * 600, h = terrainH(x, z); const rq = routeNear(x, z); if (h > 20 && !nearTown(x, z) && (!rq || rq.d > 200)) castle(K, x - x0, h, z - z0, r() * 3, reg); }
  if (r() < 0.04) { const x = x0 + 200 + r() * 600, z = z0 + 200 + r() * 600, h = terrainH(x, z); const rq = routeNear(x, z); if (h > 1 && h < 1500 && !nearTown(x, z) && (!rq || rq.d > 150)) { church(K, x - x0, h, z - z0, 0.3, reg, 1.4);
      for (const [a, b] of [[-30, 10], [-30, -15], [-15, -30]]) house(K, x - x0 + a, h, z - z0 + b, 10, 26, 0.3, reg, r); } }
  // sheep on pasture, as white specks
  const g = K.build(); if (sails.length) { const sm = new THREE.InstancedMesh(UG.sail, KM.sail, sails.length * 4); sm.frustumCulled = false; g.add(sm); SAILS.push({ sm, sails, x0, z0 }); g.userData.sails = sm; }
  return anchor(g, x0, 0, z0); }
function streamTiles(x, z) { const ci = Math.floor(x / TILE), cj = Math.floor(z / TILE); let made = 0;
  for (let d = 0; d <= TR; d++) for (let i = ci - d; i <= ci + d; i++) for (let j = cj - d; j <= cj + d; j++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== d) continue;
    const k = i + "," + j; if (!TILES.has(k) && made < 2) { TILES.set(k, genTile(i, j)); made++; } }
  for (const [k, g] of TILES) { const [i, j] = k.split(",").map(Number); if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) > TR + 1) { unanchor(g); g.traverse(o => o.isInstancedMesh && o.dispose()); TILES.delete(k);
      const si = SAILS.findIndex(S => S.sm === g.userData.sails); if (si >= 0) SAILS.splice(si, 1); for (let q = VILLAGERS.length - 1; q >= 0; q--) if (VILLAGERS[q].tile === k) VILLAGERS.splice(q, 1); } } }
const VILLAGERS = [];
function turnSails(t) { for (const S of SAILS) { let k = 0; for (const [x, y, z, ry] of S.sails) for (let b = 0; b < 4; b++) { O3.position.set(x - S.x0 + Math.sin(ry) * 2.7, y, z - S.z0 + Math.cos(ry) * 2.7); O3.rotation.set(0, ry, t * 0.8 + b * Math.PI / 2, "YXZ"); O3.scale.set(1, 1, 1); O3.updateMatrix(); S.sm.setMatrixAt(k++, O3.matrix); } S.sm.instanceMatrix.needsUpdate = true; } }

// ---------- landmark builders (in metres, relative to the point given; ry = rotation; sizes from the sources noted in TOWNS) ----------
function crane(K, x, gy, z, ry) { K.add("box", "wood", x, gy, z, 0.6, 30, 0.6, ry); K.add("box", "wood", x + Math.sin(ry) * 6, gy + 29, z + Math.cos(ry) * 6, 0.4, 0.4, 14, ry); K.add("cyl", "wood", x, gy, z + 2, 4, 1, 4, 0); }   // a timber crane with its treadwheel
function scaffold(K, x, gy, z, w, h, d, ry) { for (let a = -w / 2; a <= w / 2; a += 4) for (const e of [-1, 1]) K.add("box", "wood", x + Math.cos(ry) * a + Math.sin(ry) * e * d / 2, gy, z - Math.sin(ry) * a + Math.cos(ry) * e * d / 2, 0.2, h, 0.2, ry); }
// a great church: nave (with aisles), transept, choir/apse, and towers; options say what was built by 1250
function bigChurch(K, x, gy, z, ry, o) { const c = Math.cos(ry), s = Math.sin(ry), at = (a, b) => [x + s * b + c * a, z + c * b - s * a], col = o.col ?? 0xd0c4a8, roofC = o.roof ?? 0x6a6e72, Lh = o.L / 2;
  const piece = (a, b, w, h, d, rc) => { const [px, pz] = at(a, b); K.add("box", "wall", px, gy - 1, pz, w, h + 1, d, ry, col); if (rc !== null) K.add("gable", "roof", px, gy + h, pz, w + 0.8, Math.min(w * 0.55, 14), d + 0.8, ry, rc ?? roofC); };
  if (o.nave !== false) { piece(0, -Lh * 0.3, o.W * 0.45, o.H, o.L * 0.55); piece(-o.W * 0.36, -Lh * 0.3, o.W * 0.28, o.H * 0.5, o.L * 0.55); piece(o.W * 0.36, -Lh * 0.3, o.W * 0.28, o.H * 0.5, o.L * 0.55); }
  if (o.transept !== false) piece(0, Lh * 0.15, o.W * 1.25, o.H * 0.95, o.W * 0.4);
  if (o.choir !== false) { piece(0, Lh * 0.55, o.W * 0.45, o.H, o.L * 0.35); const [px, pz] = at(0, Lh * 0.72 + o.W * 0.1); K.add("cyl", "wall", px, gy - 1, pz, o.W * 0.45, o.H + 1, o.W * 0.45, 0, col); K.add("cone", "roof", px, gy + o.H, pz, o.W * 0.5, o.W * 0.3, o.W * 0.5, 0, roofC); }
  for (const t of o.towers || []) { const [px, pz] = at(t[0], t[1]); K.add("box", "wall", px, gy - 1, pz, t[2], t[3] + 1, t[2], ry, col); if (t[4]) K.add(o.italian ? "pyr" : "cone", o.italian ? "roof" : "lead", px, gy + t[3], pz, t[2] * 0.95, t[4], t[2] * 0.95, ry, o.italian ? 0xa85a3a : undefined); }
  for (const cr of o.cranes || []) { const [px, pz] = at(cr[0], cr[1]); crane(K, px, gy + (cr[2] ?? 0), pz, ry + 1); }
  if (o.scaffold) { const [px, pz] = at(o.scaffold[0], o.scaffold[1]); scaffold(K, px, gy, pz, o.scaffold[2], o.scaffold[3], o.scaffold[4], ry); } }
function keep(K, x, gy, z, ry, w, h, col = 0xd8d4cc) { K.add("box", "wall", x, gy - 1, z, w, h + 1, w * 0.9, ry, col); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = Math.cos(ry), s = Math.sin(ry), dx = a * w / 2, dz = b * w * 0.45; K.add("box", "wall", x + c * dx + s * dz, gy + h, z - s * dx + c * dz, 3, 4, 3, ry, col); } }
function curtain(K, x, gy, z, rx, rz, n, h, col) { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, px = x + Math.cos((a0 + a1) / 2) * rx, pz = z + Math.sin((a0 + a1) / 2) * rz, len = Math.hypot(Math.cos(a1) * rx - Math.cos(a0) * rx, Math.sin(a1) * rz - Math.sin(a0) * rz);
    K.add("box", "wall", px, gy - 1, pz, len + 1, h + 1, 2.2, -(a0 + a1) / 2 + Math.PI / 2, col); K.add("cyl", "wall", x + Math.cos(a0) * rx, gy - 1, z + Math.sin(a0) * rz, 6, h + 5, 6, 0, col); } }
function towerHouses(K, x, gy, z, n, r, hmax, rnd2, col = 0xc8a882) { for (let k = 0; k < n; k++) { const a = rnd2() * 6.28, d = Math.sqrt(rnd2()) * r, h = hmax * (0.5 + 0.5 * rnd2()), w = 5 + rnd2() * 3; K.add("box", "wall", x + Math.cos(a) * d, gy - 1, z + Math.sin(a) * d, w, h + 1, w, 0, col); } }
function townHouses(K, T, x0, z0, r) { const reg = T.reg, n = Math.round(T.r * T.r / 900 * (T.dens ?? 1)), rr = seeded(T.name.length * 97 + 13);
  for (let k = 0; k < n; k++) { const a = rr() * 6.28, d = Math.sqrt(rr()) * T.r, x = T.x + Math.cos(a) * d, z = T.z + Math.sin(a) * d, h = terrainH(x, z); if (h < 0.5) continue; const rq = routeNear(x, z); if (rq && rq.d < 28) continue;
    if (T.keepOut && T.keepOut.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
    const ry = Math.round((a + (rr() - 0.5) * 0.4) / (Math.PI / 2)) * Math.PI / 2 + (rr() - 0.5) * 0.15; house(K, x - x0, h, z - z0, 6 + rr() * 4, 8 + rr() * 6, ry, reg, rr); if (reg === "italy" || T.big) { /* (taller, packed) */ } } }
// ---------- towns along the way and their landmarks, as they stood in summer 1250 ----------
// SOURCES (via the project research notes): Old St Paul's (spire c.140-150 m, finished 1221; Gothic east end only from 1256), London Bridge
// (1209; 19 arches, 282 m, houses and St Thomas's chapel), the White Tower (whitewashed 1240), Westminster (rebuilding from 1245), Rochester
// keep (rebuilt corner 1220s), Canterbury (Trinity Chapel, Becket's shrine 1220; no Bell Harry), Dover Castle; Amiens (nave done, choir
// building 1241-69, no west towers), Beauvais (choir only, building), Saint-Denis (rebuilding 1231-81), Notre-Dame (towers finished c.1250),
// Sainte-Chapelle (1248), the Louvre keep (30 m), Philip II's wall; Troyes; Lyon (St-Jean building; the pope's court here 1244-51); the Mont
// Cenis hospice, Susa's arch, the Sacra di San Michele; Turin, Pavia, Lucca (San Martino front 1204), Florence (Baptistery; old Santa Reparata;
// tower houses capped ~29 m in 1250; no Duomo), San Gimignano towers, Siena (cathedral building, no dome yet), Viterbo; Rome: Old St Peter's
// (119 x 63 m), the Colosseum (a fortress, outer ring more complete than today), the Pantheon, Castel Sant'Angelo, the Torre delle Milizie.
const P2 = (lat, lon) => LL(lat, lon);
const TOWNS = [];
function T(name, lat, lon, r, reg, extra = {}) { const [x, z] = P2(lat, lon); const t = { name, x, z, r, reg, built: null, ...extra }; TOWNS.push(t); return t; }
T("London", 51.5125, -0.095, 900, "england", { walls: [1000, 520], dens: 0.6, big: 1, build(K, ox, oz) { const at = (la, lo) => { const [x, z] = P2(la, lo); return [x - ox, z - oz, terrainH(x, z)]; };
  { const [x, z, g] = at(51.5138, -0.0984); bigChurch(K, x, g, z, Math.PI / 2, { L: 180, W: 32, H: 28, towers: [[0, 18, 14, 60, 90]], choir: true, col: 0xd8d2c0 }); }      // Old St Paul's, its lead-covered spire ~150 m
  { const [x, z] = at(51.5085, -0.0875); const g = 1.5; for (let k = 0; k < 19; k++) K.add("box", "wall", x, g - 6, z - 140 + k * 15, 13, 9, 4, 0, 0xc8c0b0);                 // London Bridge: 19 piers
    K.add("box", "wall", x, g + 2, z, 13, 1.2, 282, 0, 0xc8c0b0); for (let k = 0; k < 30; k++) { const zz = z - 130 + k * 9; if (Math.abs(zz - z) < 10) continue; for (const e of [-1, 1]) house(K, x + e * 4.5, g + 3.2, zz, 4, 8, 0, "england", seeded(k * 3 + e)); }
    bigChurch(K, x, g + 3.2, z, 0, { L: 18, W: 8, H: 8, towers: [], transept: false, col: 0xd0c8b8 }); }                                                                        // St Thomas's chapel on the central pier
  { const [x, z, g] = at(51.5081, -0.0759); keep(K, x, g, z, 0, 36, 27, 0xf4f2ec); curtain(K, x, g, z, 75, 70, 10, 10, 0xd8d0c0); }                                          // the Tower, the White Tower freshly whitewashed (1240)
  { const [x, z, g] = at(51.4993, -0.1273); bigChurch(K, x, g, z, Math.PI / 2, { L: 100, W: 30, H: 30, nave: true, choir: true, towers: [], cranes: [[0, 30], [10, 40]], scaffold: [0, 35, 30, 30, 26], col: 0xe0d8c4 });   // Westminster Abbey: the new east end in scaffolding
    K.add("box", "wall", x + 60, g - 1, z + 70, 22, 18, 73, 0, 0xd0c8b4); K.add("gable", "roof", x + 60, g + 17, z + 70, 23, 10, 74, 0, 0x6a6e72); } } });                   // Westminster Hall
T("Rochester", 51.3895, 0.503, 280, "england", { walls: [300, 260], build(K, ox, oz) { const at = (la, lo) => { const [x, z] = P2(la, lo); return [x - ox, z - oz, terrainH(x, z)]; };
  { const [x, z, g] = at(51.3900, 0.5013); keep(K, x, g, z, 0.2, 21, 34, 0xb8b4a8); } { const [x, z, g] = at(51.3889, 0.5032); bigChurch(K, x, g, z, Math.PI / 2, { L: 95, W: 22, H: 17, towers: [[0, 10, 8, 30, 12]] }); } } });
T("Canterbury", 51.2795, 1.0815, 420, "england", { walls: [450, 400], build(K, ox, oz) { const [x, z] = P2(51.2798, 1.0828), g = terrainH(x, z);
  bigChurch(K, x - ox, g, z - oz, Math.PI / 2 + 0.1, { L: 155, W: 34, H: 24, towers: [[0, 10, 12, 38, 6], [-10, -76, 9, 34], [10, -76, 9, 34]], col: 0xd8ccb0 }); } });                 // the cathedral and Becket's shrine (Angel Steeple; no Bell Harry yet)
T("Dover", 51.1255, 1.3125, 220, "england", { build(K, ox, oz) { const [x, z] = P2(51.1295, 1.3214), g = terrainH(x, z); keep(K, x - ox, g, z - oz, 0.4, 30, 25, 0xc8c0b0); curtain(K, x - ox, g, z - oz, 120, 90, 12, 9, 0xc0b8a8); } });
T("Wissant", 50.886, 1.664, 160, "france", {});
T("Montreuil", 50.464, 1.763, 250, "france", { walls: [260, 260] });
T("Abbeville", 50.106, 1.834, 300, "france", {});
T("Amiens", 49.894, 2.299, 520, "france", { walls: [560, 520], build(K, ox, oz) { const [x, z] = P2(49.8946, 2.3022), g = terrainH(x, z);
  bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 145, W: 46, H: 42, towers: [[-14, -70, 12, 30], [14, -70, 12, 30]], choir: true, cranes: [[0, 50, 20], [-14, 62, 10]], scaffold: [0, 50, 40, 42, 30], col: 0xe0d8c4 }); } });   // Amiens: nave finished, choir rising, west towers not yet
T("Beauvais", 49.432, 2.084, 380, "france", { walls: [400, 380], build(K, ox, oz) { const [x, z] = P2(49.4326, 2.0807), g = terrainH(x, z);
  bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 70, W: 46, H: 46, nave: false, transept: false, towers: [], cranes: [[0, 10, 30], [12, 20, 20]], scaffold: [0, 20, 40, 48, 40], col: 0xe4dcc8 }); } });   // Beauvais: only the giant choir, building
T("Beaumont-sur-Oise", 49.142, 2.287, 200, "france", {});
T("Saint-Denis", 48.9355, 2.3594, 300, "france", { build(K, ox, oz) { const [x, z] = P2(48.9355, 2.3594), g = terrainH(x, z); bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 108, W: 39, H: 29, towers: [[-10, -50, 10, 42, 18], [10, -50, 10, 40]], cranes: [[0, -10, 25]], col: 0xd8d0bc }); } });
T("Paris", 48.857, 2.347, 1250, "france", { walls: [1400, 1150], dens: 0.55, big: 1, keepOut: [], build(K, ox, oz) { const at = (la, lo) => { const [x, z] = P2(la, lo); return [x - ox, z - oz, terrainH(x, z)]; };
  { const [x, z, g] = at(48.853, 2.3499); bigChurch(K, x, Math.max(g, 2), z, Math.PI / 2 + 0.25, { L: 128, W: 48, H: 33, towers: [[-15, -60, 16, 69], [15, -60, 16, 69]], cranes: [[24, 12, 20]], col: 0xe6dcc6 });   // Notre-Dame: the west towers just finished
    const [sx, sz] = at(48.853, 2.3505); K.add("cone", "lead", sx, Math.max(g, 2) + 40, sz, 4, 38, 4, 0); }                                                               // the crossing spire
  { const [x, z, g] = at(48.8554, 2.345); bigChurch(K, x, Math.max(g, 2), z, Math.PI / 2, { L: 36, W: 17, H: 42, nave: false, transept: false, towers: [], choir: true, col: 0xe8e0d0 });   // Sainte-Chapelle, new in 1248
    curtain(K, x - 30, Math.max(g, 2), z + 10, 110, 70, 10, 9, 0xd8d0c0); }                                                                                                  // the royal palace on the Cité
  { const [x, z, g] = at(48.8605, 2.3378); K.add("cyl", "wall", x, g - 1, z, 15.6, 31, 15.6, 0, 0xe0d8c8); K.add("cone", "lead", x, g + 30, z, 16, 10, 16, 0); curtain(K, x, g, z, 39, 36, 10, 14, 0xd8d0c0); } } });   // the Louvre's round keep
T("Troyes", 48.2975, 4.0745, 450, "france", { walls: [480, 450], build(K, ox, oz) { const [x, z] = P2(48.2985, 4.0795), g = terrainH(x, z); bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 114, W: 40, H: 29, towers: [], cranes: [[0, -30, 15]], col: 0xe0d6c0 }); } });
T("Beaune", 47.025, 4.840, 300, "france", { walls: [300, 300] });
T("Chalon-sur-Saône", 46.781, 4.854, 320, "france", { walls: [320, 300] });
T("Mâcon", 46.307, 4.832, 320, "france", {});
T("Cluny", 46.4345, 4.6593, 300, "france", { build(K, ox, oz) { const [x, z] = P2(46.4345, 4.6593), g = terrainH(x, z);
  bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 187, W: 40, H: 30, italian: false, towers: [[0, 30, 14, 60, 18], [0, 0, 12, 50, 14], [-28, 30, 9, 42, 10], [28, 30, 9, 42, 10], [-12, -85, 9, 38, 8], [12, -85, 9, 38, 8]], roof: 0x7a5a48, col: 0xd8ccb0 }); } });   // Cluny III, the largest church in Christendom
T("Lyon", 45.762, 4.829, 700, "france", { walls: [700, 650], dens: 0.6, build(K, ox, oz) { const [x, z] = P2(45.7606, 4.8274), g = terrainH(x, z);
  bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 80, W: 32, H: 32, towers: [[-17, 14, 8, 40], [17, 14, 8, 40]], cranes: [[0, -30, 15]], scaffold: [0, -25, 28, 30, 30], col: 0xe0d6c0 }); } });   // St-Jean, its nave still building; the pope's court is in the city
T("Chambéry", 45.564, 5.917, 250, "alps", {}); T("Saint-Jean-de-Maurienne", 45.276, 6.345, 220, "alps", {}); T("Lanslebourg", 45.287, 6.880, 150, "alps", {});
T("Mont Cenis hospice", 45.252, 6.918, 60, "alps", { dens: 0.3, build(K, ox, oz) { const [x, z] = P2(45.252, 6.918), g = terrainH(x, z); church(K, x - ox, g, z - oz, 0.4, "alps", 0.9); house(K, x - ox + 25, g, z - oz, 10, 28, 0.4, "alps", seeded(5)); } });
T("Susa", 45.138, 7.049, 280, "italy", { walls: [300, 280], build(K, ox, oz) { const [x, z] = P2(45.1376, 7.0459), g = terrainH(x, z); K.add("box", "wall", x - ox, g, z - oz, 12, 13, 7, 0.3, 0xe8e0d0); } });   // the Arch of Augustus
T("Sacra di San Michele", 45.098, 7.343, 40, "italy", { dens: 0, build(K, ox, oz) { const [x, z] = P2(45.098, 7.343), g = terrainH(x, z) + 30; bigChurch(K, x - ox, g, z - oz, 0.3, { L: 50, W: 20, H: 26, towers: [[0, 20, 9, 30, 6]], italian: true, col: 0xa89a88 }); K.add("box", "wall", x - ox, g - 40, z - oz, 40, 42, 34, 0.3, 0x9a8e7e); } });
T("Turin", 45.0705, 7.687, 380, "italy", { walls: [400, 380], build(K, ox, oz) { const [x, z] = P2(45.0749, 7.6847), g = terrainH(x, z); for (const e of [-1, 1]) K.add("cyl", "wall", x - ox + e * 12, g, z - oz, 9, 30, 9, 0, 0xb8704a); K.add("box", "wall", x - ox, g, z - oz, 18, 16, 8, 0, 0xb8704a); } });   // the Roman Porta Palatina
T("Vercelli", 45.322, 8.419, 320, "italy", { walls: [320, 320] });
T("Pavia", 45.186, 9.155, 500, "italy", { walls: [520, 480], build(K, ox, oz) { const [x, z] = P2(45.186, 9.155), g = terrainH(x, z); towerHouses(K, x - ox, g, z - oz, 40, 350, 55, seeded(77), 0xb8704a); bigChurch(K, x - ox + 80, g, z - oz - 60, 0, { L: 60, W: 22, H: 18, italian: true, towers: [[14, 10, 7, 30, 4]], col: 0xc8a882, roof: 0xa85a3a }); } });
T("Piacenza", 45.053, 9.693, 420, "italy", { walls: [440, 420], build(K, ox, oz) { const [x, z] = P2(45.0516, 9.6935), g = terrainH(x, z); bigChurch(K, x - ox, g, z - oz, 0, { L: 85, W: 32, H: 32, italian: true, towers: [[20, 20, 9, 67, 6]], col: 0xc89a78, roof: 0xa85a3a }); } });
T("Fidenza", 44.866, 10.061, 200, "italy", {}); T("Pontremoli", 44.376, 9.880, 200, "italy", {}); T("Luni", 44.11, 9.96, 160, "italy", {});
T("Lucca", 43.8425, 10.505, 500, "italy", { walls: [550, 480], build(K, ox, oz) { const [x, z] = P2(43.8405, 10.5058), g = terrainH(x, z); bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 85, W: 28, H: 22, italian: true, towers: [[16, -30, 8, 69, 4]], col: 0xf0ece0, roof: 0xa85a3a });   // San Martino, its arcaded white front of 1204
  towerHouses(K, x - ox - 100, g, z - oz + 80, 30, 300, 45, seeded(91)); } });
T("Florence", 43.7715, 11.2545, 600, "italy", { walls: [700, 550], dens: 0.7, build(K, ox, oz) { const at = (la, lo) => { const [x, z] = P2(la, lo); return [x - ox, z - oz, terrainH(x, z)]; };
  { const [x, z, g] = at(43.7731, 11.2550); K.add("cyl", "wall", x, g, z, 25, 26, 25, 0, 0xeef0e4); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; K.add("box", "wall", x + Math.cos(a) * 12.5, g, z + Math.sin(a) * 12.5, 1.2, 26, 1.2, -a, 0x3a5a40); } K.add("pyr", "roof", x, g + 26, z, 22, 9, 22, Math.PI / 8, 0xf2f0e8); }   // the Baptistery: green and white marble
  { const [x, z, g] = at(43.7729, 11.2563); bigChurch(K, x, g, z, Math.PI / 2, { L: 60, W: 22, H: 16, italian: true, towers: [[12, 20, 6, 30, 4]], col: 0xd8c8a8, roof: 0xa85a3a }); }   // old Santa Reparata (no Duomo yet)
  { const [x, z, g] = at(43.7712, 11.2545); towerHouses(K, x, g, z, 120, 450, 29, seeded(1250)); }                                                                       // tower houses, capped about 29 m in 1250
  { const [x, z, g] = at(43.7680, 11.2530); for (let k = 0; k < 5; k++) K.add("box", "wall", x - 40 + k * 20, g - 3, z, 6, 6, 12, 0, 0xc8b898); K.add("box", "wall", x, g + 2, z, 100, 1.5, 12, 0, 0xc8b898); } } });   // a bridge over the Arno
T("San Gimignano", 43.468, 11.043, 220, "italy", { walls: [240, 200], build(K, ox, oz) { const [x, z] = P2(43.468, 11.043), g = terrainH(x, z); towerHouses(K, x - ox, g, z - oz, 60, 160, 52, seeded(31), 0xd0b48a); } });
T("Siena", 43.3195, 11.3315, 450, "italy", { walls: [480, 420], build(K, ox, oz) { const [x, z] = P2(43.3177, 11.3289), g = terrainH(x, z); bigChurch(K, x - ox, g, z - oz, Math.PI / 2, { L: 90, W: 26, H: 24, italian: true, towers: [[14, 10, 7, 60, 4]], cranes: [[0, 20, 20]], scaffold: [0, 15, 26, 26, 30], col: 0xe8e4dc, roof: 0x7a7a7a });
  towerHouses(K, x - ox + 150, g, z - oz - 100, 40, 300, 40, seeded(53)); } });
T("Radicofani", 42.896, 11.769, 150, "italy", { build(K, ox, oz) { const [x, z] = P2(42.897, 11.765), g = terrainH(x, z); keep(K, x - ox, g, z - oz, 0, 14, 30, 0x8a8278); } });
T("Bolsena", 42.645, 11.986, 200, "italy", {}); T("Viterbo", 42.421, 12.108, 400, "italy", { walls: [420, 400] }); T("Sutri", 42.245, 12.216, 200, "italy", {});
T("Rome", 41.898, 12.474, 800, "italy", { dens: 0.45, build(K, ox, oz) { const at = (la, lo) => { const [x, z] = P2(la, lo); return [x - ox, z - oz, terrainH(x, z)]; };
  { const [x, z, g] = at(41.9022, 12.4539); bigChurch(K, x, g, z, Math.PI / 2, { L: 119, W: 63, H: 37, transept: true, choir: true, towers: [[25, -60, 9, 40, 6]], italian: true, col: 0xd8c8a8, roof: 0x9a5a3a });   // Old St Peter's
    K.add("box", "wall", x - 95, g - 1, z, 70, 12, 60, 0, 0xd0c0a0); }                                                                                                    // its atrium
  { const [x, z, g] = at(41.8902, 12.4922); for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, h = 48 * (0.8 + 0.2 * Math.sin(k * 1.7)); K.add("box", "wall", x + Math.cos(a) * 94, g - 1, z + Math.sin(a) * 78, 15, h, 12, -a, 0xd0b890); }   // the Colosseum, a baronial fortress
    for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; K.add("box", "wall", x + Math.cos(a) * 70, g - 1, z + Math.sin(a) * 56, 12, 28, 10, -a, 0xc8b088); } }
  { const [x, z, g] = at(41.8986, 12.4769); K.add("cyl", "wall", x, g - 1, z, 58, 23, 58, 0, 0xd8ccb0); K.add("dome", "lead", x, g + 21, z, 58, 30, 58, 0); K.add("box", "wall", x, g - 1, z - 38, 34, 18, 16, 0, 0xd8ccb0); K.add("gable", "roof", x, g + 17, z - 38, 34, 7, 16, Math.PI / 2, 0x9a5a3a); }   // the Pantheon, a church
  { const [x, z, g] = at(41.9031, 12.4663); K.add("box", "wall", x, g - 1, z, 84, 14, 84, 0, 0xc8b898); K.add("cyl", "wall", x, g - 1, z, 64, 32, 64, 0, 0xc0b090); }   // Castel Sant'Angelo
  { const [x, z, g] = at(41.8961, 12.4867); K.add("box", "wall", x, g - 1, z, 10.5, 61, 9.5, 0, 0xb8906a); } { const [x, z, g] = at(41.8925, 12.4885); K.add("box", "wall", x, g - 1, z, 14, 56, 14, 0, 0xb8906a); }   // Torre delle Milizie, Torre dei Conti
  { const [x, z, g] = at(41.8860, 12.5056); bigChurch(K, x, g, z, Math.PI / 2, { L: 100, W: 50, H: 28, italian: true, towers: [], col: 0xd8c8a8, roof: 0x9a5a3a }); }       // the Lateran
  { const [x, z, g] = at(41.880, 12.52); for (let k = 0; k < 60; k++) K.add("box", "wall", x + k * 22, terrainH(x + ox + k * 22, z + oz + k * 14) - 1, z + k * 14, 4, 22, 6, -0.57, 0xc8b088); } } });   // a ruined aqueduct striding over the Campagna
for (const t of TOWNS) { const rq = routeNear(t.x, t.z); t.onRoute = rq && rq.d < 3000; }
function streamTowns(x, z) { const R = IS_HEADSET ? 5000 : 7000;
  for (const t of TOWNS) { const d = Math.hypot(x - t.x, z - t.z);
    if (d < R && !t.built) { const K = new Kit(), ox = t.x, oz = t.z; if (t.walls) curtain(K, 0, terrainH(t.x, t.z), 0, t.walls[0], t.walls[1], 24, 9, STYLE[t.reg].stone); townHouses(K, t, ox, oz);
      if (t.dens !== 0) { const rr = seeded(t.name.length * 31); for (let c = 0; c < Math.max(1, Math.round(t.r / 250)); c++) { const a = rr() * 6.28, dd = rr() * t.r * 0.8, cx = t.x + Math.cos(a) * dd, cz = t.z + Math.sin(a) * dd; const rq = routeNear(cx, cz); if (rq && rq.d < 40) continue; church(K, cx - ox, terrainH(cx, cz), cz - oz, rr() * 3, t.reg, 0.9); } }
      t.build?.(K, ox, oz); t.built = anchor(K.build(), ox, 0, oz); }
    else if (d > R + 2000 && t.built) { unanchor(t.built); t.built.traverse(o => o.isInstancedMesh && o.dispose()); t.built = null; } } }

// ---------- the old road beside the line, and the people on it and in the fields ----------
// The line follows the old road; the road runs beside it (a rutted earth track; on Roman roads in places). On it: pilgrims with staff
// and hat, merchants with packhorses, carts behind oxen, friars. In June: haymaking in the meadows, shearing, weeding the grain.
const roadMat = new THREE.MeshStandardMaterial({ map: tex(128, 128, speckle("#8a7a5a", 2000, ["#6a5a40", "#a89878", "#7a6a4a"], 2, 2)), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
let roadMesh = null, roadAt = -1e9; const ROAD_OFF = 16;
function buildRoad(s) { if (roadMesh) { unanchor(roadMesh); roadMesh.geometry.dispose(); } const pos = [], idx = [], uv = [], ax = routeAt(s).x, az = routeAt(s).z; let n = 0;
  for (let q = s - 8000; q <= s + 8000; q += 20) { if (q < 0 || q > ROUTE.L) continue; const R = routeAt(q), nx = Math.cos(R.h), nz = -Math.sin(R.h);
    for (const e of [-1, 1]) { const x = R.x + nx * (ROAD_OFF + e * 2.5), z = R.z + nz * (ROAD_OFF + e * 2.5), h = terrainH(x, z); pos.push(x - ax, Math.max(h, 0.2) + 0.15, z - az); uv.push(e > 0 ? 1 : 0, q / 8); }
    if (n) { const k = 2 * n; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } n++; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  roadMesh = new THREE.Mesh(g, roadMat); roadMesh.frustumCulled = false; anchor(roadMesh, ax, 0, az); roadAt = s; }
// people: simple figures (tunic, hood or hat, legs, arms), drawn as instances
const NPEOPLE = IS_HEADSET ? 90 : 160, CLOTH = [0x7a6a52, 0x5a4a3a, 0x8a7a5a, 0x9a8a6a, 0x3e4e6a, 0x6a3a2a, 0x4e5a3a, 0xc8bca0, 0x8a2e24, 0x2e3e5a];
const pG = { body: new THREE.CylinderGeometry(0.2, 0.3, 1.0, 8).translate(0, 1.0, 0), head: new THREE.SphereGeometry(0.12, 10, 8).translate(0, 1.66, 0), hood: new THREE.ConeGeometry(0.17, 0.3, 8).translate(0, 1.78, 0),
  leg: new THREE.BoxGeometry(0.11, 0.55, 0.13).translate(0, -0.28, 0), arm: new THREE.BoxGeometry(0.09, 0.55, 0.1).translate(0, -0.27, 0), staff: new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4).translate(0, 0.9, 0) };
const PIM = {}; for (const k of ["body", "head", "hood", "legL", "legR", "armL", "armR", "staff"]) { const geo = pG[k.replace(/[LR]$/, "")], im = new THREE.InstancedMesh(geo, M(0xffffff, { roughness: 0.95 }), NPEOPLE); im.frustumCulled = false; scene.add(im); PIM[k] = im; }
{ const c = new THREE.Color(); for (let i = 0; i < NPEOPLE; i++) { c.setHex(CLOTH[(hash(i, 1) * CLOTH.length) | 0]); PIM.body.setColorAt(i, c); PIM.armL.setColorAt(i, c); PIM.armR.setColorAt(i, c); c.setHex(CLOTH[(hash(i, 2) * CLOTH.length) | 0]); PIM.hood.setColorAt(i, c);
    c.setHex([0xc8a080, 0xd8b090, 0xb88a68][(hash(i, 3) * 3) | 0]); PIM.head.setColorAt(i, c); c.setHex(0x5a4a3a); PIM.legL.setColorAt(i, c); PIM.legR.setColorAt(i, c); PIM.staff.setColorAt(i, new THREE.Color(0x6a4a2c)); } }
const SHEEP = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6).scale(1.3, 0.8, 0.8), M(0xe8e0d0, { roughness: 1 }), 400); SHEEP.frustumCulled = false; scene.add(SHEEP);
const OXEN = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 1.1, 2.2).translate(0, 1.0, 0), M(0x7a5a3a), 60); OXEN.frustumCulled = false; scene.add(OXEN);
const CARTS = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.8, 2.6).translate(0, 1.0, 0), M(0x6a4a2c), 30); CARTS.frustumCulled = false; scene.add(CARTS);
const PEOPLE = []; for (let i = 0; i < NPEOPLE; i++) PEOPLE.push({ i, kind: "", x: 0, z: 0, h: 0, ph: hash(i, 9) * 10, home: null });
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler(), _ps = V3(1, 1, 1), _pp = V3(0, 0, 0), ZM = new THREE.Matrix4().makeScale(0, 0, 0);
function placeFig(i, x, y, z, h, sw, armUp, staff) { const lx = x - ORIGIN.x, lz = z - ORIGIN.z; _pe.set(0, h, 0); _pq.setFromEuler(_pe); _pm.compose(_pp.set(lx, y, lz), _pq, _ps); PIM.body.setMatrixAt(i, _pm); PIM.head.setMatrixAt(i, _pm); PIM.hood.setMatrixAt(i, _pm);
  for (const [k, sd, a] of [["legL", 1, sw], ["legR", -1, -sw], ["armL", 1, armUp ?? -sw], ["armR", -1, armUp ?? sw]]) { const arm = k.startsWith("arm"); _pe.set(a, h, 0, "YXZ"); _pq.setFromEuler(_pe);
    _pm.compose(_pp.set(lx + Math.cos(h) * (arm ? 0.27 : 0.1) * sd, y + (arm ? 1.45 : 0.55), lz - Math.sin(h) * (arm ? 0.27 : 0.1) * sd), _pq, _ps); PIM[k].setMatrixAt(i, _pm); }
  if (staff) { _pe.set(0.15, h, 0); _pq.setFromEuler(_pe); _pm.compose(_pp.set(lx + Math.cos(h) * 0.35, y, lz - Math.sin(h) * 0.35), _pq, _ps); PIM.staff.setMatrixAt(i, _pm); } else PIM.staff.setMatrixAt(i, ZM); }
let peopleAt = -1e9;
function assignPeople(s) { const r = seeded(Math.floor(s / 500)); let ki = 0, si = 0, oi = 0, ci = 0;
  PEOPLE.forEach((p, n) => { const roadSide = n < NPEOPLE * 0.4; if (roadSide) { p.kind = r() < 0.6 ? "pilgrim" : r() < 0.6 ? "merchant" : "friar"; p.s = s + (r() - 0.25) * 9000; p.dir = r() < 0.6 ? 1 : -1; p.v = 1.1 + r() * 0.3; p.off = ROAD_OFF + (r() - 0.5) * 3; }
    else { const V = VILLAGERS[(r() * VILLAGERS.length) | 0]; if (!V) { p.kind = ""; return; } p.kind = r() < 0.55 ? "hay" : r() < 0.5 ? "shepherd" : "walk"; const a = r() * 6.28, d = 120 + r() * 250; p.x = V.x + Math.cos(a) * d; p.z = V.z + Math.sin(a) * d; p.h = r() * 6.28; p.home = V;
      if (p.kind === "shepherd") { p.flock = []; for (let q = 0; q < 12 && si < 400; q++) p.flock.push([si++, (r() - 0.5) * 30, (r() - 0.5) * 30]); } } });
  for (let q = 0; q < 400; q++) SHEEP.setMatrixAt(q, ZM); peopleAt = s; }
function animatePeople(t, dt) { let oi = 0, ci = 0;
  for (const p of PEOPLE) { if (!p.kind) { placeFig(p.i, 0, -500, 0, 0, 0); continue; }
    if (p.kind === "pilgrim" || p.kind === "merchant" || p.kind === "friar") { p.s += p.dir * p.v * dt; const R = routeAt(p.s), nx = Math.cos(R.h), nz = -Math.sin(R.h), x = R.x + nx * p.off, z = R.z + nz * p.off, y = Math.max(terrainH(x, z), 0.2) + 0.15;
      placeFig(p.i, x, y, z, R.h + (p.dir > 0 ? 0 : Math.PI), 0.4 * Math.sin(t * 5 + p.ph), undefined, p.kind !== "merchant");
      if (p.kind === "merchant" && oi < 60 && p.i % 2 === 0) { O3.position.set(x - ORIGIN.x - Math.sin(R.h) * 2.5 * p.dir, y, z - ORIGIN.z - Math.cos(R.h) * 2.5 * p.dir); O3.rotation.set(0, R.h, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); OXEN.setMatrixAt(oi++, O3.matrix);
        if (ci < 30) { O3.position.set(x - ORIGIN.x + Math.sin(R.h) * 1.8 * p.dir, y, z - ORIGIN.z + Math.cos(R.h) * 1.8 * p.dir); O3.updateMatrix(); CARTS.setMatrixAt(ci++, O3.matrix); } } }
    else if (p.kind === "hay") { const y = terrainH(p.x, p.z); placeFig(p.i, p.x, y, p.z, p.h + 0.6 * Math.sin(t * 1.6 + p.ph), 0.1, -1.0 - 0.6 * Math.sin(t * 1.6 + p.ph), true); }   // swinging a scythe in the hay
    else if (p.kind === "shepherd") { const y = terrainH(p.x, p.z); placeFig(p.i, p.x, y, p.z, p.h, 0, undefined, true); for (const [q, dx, dz] of p.flock) { const sx = p.x + dx + Math.sin(t * 0.1 + q) * 2, sz = p.z + dz + Math.cos(t * 0.13 + q) * 2; O3.position.set(sx - ORIGIN.x, terrainH(sx, sz) + 0.4, sz - ORIGIN.z); O3.rotation.set(0, q, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); SHEEP.setMatrixAt(q, O3.matrix); } }
    else { const a = t * 0.05 + p.ph, x = p.home.x + Math.cos(a) * 150, z = p.home.z + Math.sin(a) * 150; placeFig(p.i, x, terrainH(x, z), z, -a, 0.4 * Math.sin(t * 5 + p.ph)); } }
  for (let q = oi; q < 60; q++) OXEN.setMatrixAt(q, ZM); for (let q = ci; q < 30; q++) CARTS.setMatrixAt(q, ZM);
  for (const im of [...Object.values(PIM), SHEEP, OXEN, CARTS]) im.instanceMatrix.needsUpdate = true; }

// ---------- stars for the short June nights (no light pollution: the Milky Way is bright) ----------
const STARS = (() => { const n = 2500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * 6.283, band = rnd() < 0.4, r = Math.sqrt(1 - u * u); let x = r * Math.cos(a), y = Math.abs(u), z = r * Math.sin(a);
    if (band) { const b = rnd() * 6.283; x = Math.cos(b); y = 0.25 + 0.6 * Math.abs(Math.sin(b)) + (rnd() - 0.5) * 0.1; z = Math.sin(b) * 0.5 + (rnd() - 0.5) * 0.15; } const l = Math.hypot(x, y, z); pos.set([x / l * 40000, y / l * 40000, z / l * 40000], i * 3); }
  const p = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false })); p.renderOrder = -1; scene.add(p); return p; })();

// ---------- what you are passing: notes for the guide ----------
const NOTES = {
  London: "London, perhaps 40,000-80,000 people, the largest town in England. Across the river: London Bridge (stone, finished 1209, 19 arches, houses on it and the chapel of St Thomas Becket on the middle pier), the City behind its Roman walls, the Tower with the White Tower freshly whitewashed (1240), and Old St Paul's, its lead-sheathed spire perhaps 140-150 m tall: by some accounts the tallest building in the world. Upriver Henry III is rebuilding Westminster Abbey: its new east end stands in scaffolding.",
  Rochester: "Rochester: the great keep, its corner rebuilt round after King John's miners brought it down in the siege of 1215, and the cathedral with its new Gothic choir.",
  Canterbury: "Canterbury: pilgrims' goal. Becket's shrine stands in the Trinity Chapel (since 1220); the nave is still the old Norman one and Bell Harry tower is 250 years away. Look for pilgrims with lead badges of St Thomas.",
  Dover: "Dover: the castle on its cliff, rebuilt after the French siege of 1216, with a Roman lighthouse inside. Ships cross from here to Wissant.",
  Wissant: "Wissant, the usual Channel port in 1250 (not Calais). The crossing is about 35 km of sea.",
  Amiens: "Amiens: the new cathedral (begun 1220): its nave, 42 m high to the vault, is finished; the choir is still rising among cranes and scaffolding; the west towers do not exist yet. The woad grown around Amiens, for blue dye, pays for much of it.",
  Beauvais: "Beauvais: only the choir of the cathedral, heading for a record 48 m vault, is building. (In 1284 part of it will fall.)",
  "Saint-Denis": "Saint-Denis, the royal abbey: Abbot Suger's west front and choir, and a new nave being rebuilt.",
  Paris: "Paris, the largest city of Latin Europe (perhaps 80,000-150,000). Notre-Dame's west towers were finished about now; Sainte-Chapelle in the royal palace was consecrated in 1248; Philip II's round keep of the Louvre stands outside the wall. King Louis IX is far away, captured on crusade in Egypt this spring; his mother Blanche of Castile rules.",
  Troyes: "Troyes, a town of the Champagne fairs, where merchants from Flanders and Italy meet; the 'warm fair' is held in July-August.",
  Cluny: "Cluny Abbey, to the west: at 187 m the largest church in Christendom.",
  Lyon: "Lyon: for now the capital of Christendom. Pope Innocent IV and his court have lived here since 1244, fleeing the emperor Frederick II; the cathedral of St-Jean is still building. Couriers, envoys and clerics crowd the roads.",
  "Mont Cenis hospice": "The Mont Cenis pass, 2,083 m: the main crossing of the Alps for travellers from England and France. A hospice for travellers has stood here since the 9th century. Mule trains carry goods over.",
  Susa: "Susa, with the Roman Arch of Augustus.", "Sacra di San Michele": "On the peak above: the Sacra di San Michele, an abbey 962 m up, with a guesthouse for pilgrims.",
  Turin: "Turin, a small walled town on the old Roman grid; its Roman Porta Palatina still stands.", Pavia: "Pavia, 'city of a hundred towers', of brick; a supporter of the emperor.",
  Piacenza: "Piacenza, its cathedral just finished (1233).", Lucca: "Lucca: San Martino's white arcaded front (1204), and the Volto Santo crucifix that draws pilgrims; tower houses everywhere.",
  Florence: "Florence: perhaps 30,000-60,000 people. The Baptistery's green and white marble stands beside the old cathedral of Santa Reparata; the great Duomo will not be begun until 1296. This year the new merchant government (the Primo Popolo) capped the tower houses at about 29 m.",
  "San Gimignano": "San Gimignano, bristling with family towers.", Siena: "Siena: the cathedral is building; its dome will not be finished until 1264, and the Campo and town hall do not exist yet.",
  Rome: "Rome: a town of perhaps 25,000-35,000 people inside the vast ancient walls, the rest ruins, vineyards and pasture; the pope is away in Lyon. Old St Peter's, Constantine's basilica; the Colosseum held as a fortress by baronial families, its outer ring more complete than today; the Pantheon, a church; barons' towers like the Torre delle Milizie." };

// ---------- the journey: the train's place on the route, its speed, the clock ----------
const SPEEDS = [[0, "stopped"], [40, "40 km/h"], [80, "80 km/h"], [160, "160 km/h"], [400, "400 km/h"], [1200, "1,200 km/h"], [4000, "4,000 km/h"]];
let trainS = ROUTE.stops[0].s + 60, speedI = 2, vNow = 0, hour = 7.0, day = 0, started = false;
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false;
const P_ = { x: 1.0, z: carZ(3) + 3 };                     // you start in the lounge car
function nextStop() { return ROUTE.stops.find(s => s.s > trainS + 100) || ROUTE.stops[ROUTE.stops.length - 1]; }
function prevStop() { let p = ROUTE.stops[0]; for (const s of ROUTE.stops) if (s.s <= trainS + 100) p = s; return p; }
function skipTo(s) { const ds = s - trainS; trainS = s; hour += ds / 1000 / 80; while (hour >= 24) { hour -= 24; day++; } }
const intro = document.getElementById("intro");
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(30,24,16,.75);color:#f4ead8;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:620px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(30,24,16,.86);color:#f4ead8;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:780px;display:none";
const FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 1.2s;z-index:5";
document.body.append(HUD, MSG, FADE);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 16) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone");
  say("Summer, 1250. You are in the lounge car of a train no one in this century can see, waiting on the south bank of the Thames opposite London. Walk through the cars (the observation car with its open platform is at the back). The train sets off now; − / = change its speed, N jumps to the next town, and you can sleep in a berth in the sleeping cars. Press E by the map at the front of the lounge for where you are.", 24); }
let sleeping = false;
function goSleep() { if (sleeping) return; sleeping = true; FADE.style.opacity = 1; setTimeout(() => { const h = (24 - hour) + 6.5; skipTo(trainS + h * 80000); hour = 6.5; recentre(routeAt(trainS).x, routeAt(trainS).z); for (const L of LEVELS) { L.ox = NaN; } updateGround(routeAt(trainS).x, routeAt(trainS).z, 99);
    FADE.style.opacity = 0; sleeping = false; say(`You wake at half past six. In the night the train ran on to ${prevStop().name}.`, 10); }, 1400); }
function interact() { if (!started) return start(); for (const b of BEDS) if (Math.hypot(P_.x - b.x, P_.z - b.z) < 1.4) { goSleep(); return; }
  if (carAt(P_.z) === 3 && P_.z < carZ(3) - CAR_L / 2 + 4) { const p = prevStop(), n = nextStop(); say(`<b>${p.name}</b> behind you; next, <b>${n.name}</b>, ${((n.s - trainS) / 1000).toFixed(0)} km.<br>${NOTES[n.name] || NOTES[p.name] || ""}`, 20); return; }
  const near = nearTownNote(); if (near) say(`<b>${near.name}</b> · ${NOTES[near.name]}`, 20); else say("Walk to a berth in a sleeping car and press E to sleep until morning; press E at the map at the front of the lounge for where you are.", 8); }
function nearTownNote() { const R = routeAt(trainS); let best = null, bd = 6000; for (const t of TOWNS) { if (!NOTES[t.name]) continue; const d = Math.hypot(t.x - R.x, t.z - R.z); if (d < bd) { bd = d; best = t; } } return best; }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyE") interact(); if (e.code === "Equal") speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (e.code === "Minus") speedI = Math.max(0, speedI - 1);
  if (e.code === "KeyN") { skipTo(nextStop().s - 1500); say(`Approaching <b>${nextStop().name}</b>.`, 6); } if (e.code === "KeyP") speedI = speedI ? 0 : 2; });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// the route map in the lounge: Europe's outline, the line, the towns, where we are
function drawMap() { const g = MAPC.getContext("2d"), W = 1024, H = 640; g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, W, H); g.strokeStyle = "#8a6a3a"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  const x0 = LL(52, -1.5)[0], x1 = LL(41, 13.5)[0], z0 = LL(52.2, 0)[1], z1 = LL(41.2, 0)[1], sx = x => 60 + (x - x0) / (x1 - x0) * (W - 400), sz = z => 50 + (z - z0) / (z1 - z0) * (H - 100);
  g.fillStyle = "#b8d0d8"; for (const P of [NSEA, MED]) { g.beginPath(); P.P.forEach(([x, z], i) => i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))); g.closePath(); g.fill(); }
  g.fillStyle = "#e8dcc0"; g.beginPath(); GB.P.forEach(([x, z], i) => i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))); g.closePath(); g.fill();
  g.strokeStyle = "#7a2e1e"; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= ROUTE.n; i += 50) i ? g.lineTo(sx(ROUTE.X[i]), sz(ROUTE.Z[i])) : g.moveTo(sx(ROUTE.X[i]), sz(ROUTE.Z[i])); g.stroke();
  g.font = "600 18px Georgia, serif"; for (const s of ROUTE.stops) if (s.stop) { const x = sx(ROUTE.X[s.i]), z = sz(ROUTE.Z[s.i]); g.fillStyle = "#3a2a1a"; g.beginPath(); g.arc(x, z, 5, 0, 6.283); g.fill(); g.fillText(s.name.replace("the Mont Cenis pass", "Mont Cenis"), x + 8, z + 5); }
  const R = routeAt(trainS); g.fillStyle = "#d8322a"; g.beginPath(); g.arc(sx(R.x), sz(R.z), 11, 0, 6.283); g.fill();
  const p = prevStop(), n = nextStop(), t = (s, y, sz2 = 26, col = "#3a2a1a", w = 600) => { g.fillStyle = col; g.font = `${w} ${sz2}px Georgia, serif`; g.fillText(s, W - 330, y); };
  t("London to Rome", 60, 32); t("Summer 1250", 96, 22, "#6a5a3a", 400); t(`${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor(hour % 1 * 60)).padStart(2, "0")} · day ${day + 1}`, 140, 24);
  t(`speed ${SPEEDS[speedI][1]}`, 180, 24); t(`last: ${p.name}`, 230, 20, "#3a2a1a", 400); t(`next: ${n.name}`, 262, 20, "#3a2a1a", 400); t(`${((n.s - trainS) / 1000).toFixed(0)} km · ${((ROUTE.L - trainS) / 1000).toFixed(0)} km to Rome`, 294, 20, "#3a2a1a", 400);
  t("− / = speed · N next town", 560, 18, "#6a5a3a", 400); t("E here: about this place", 588, 18, "#6a5a3a", 400); mapT.needsUpdate = true; }

// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(txt) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); if (!txt) { vrT.needsUpdate = true; return; } g.fillStyle = "rgba(30,24,16,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  g.fillStyle = "#f4ead8"; g.font = "27px -apple-system, Helvetica, sans-serif"; const words = txt.replace(/<br>/g, " ").replace(/<[^>]+>/g, "").split(" "); let ln = "", y = 46, n = 0;
  for (const w of words) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += 34; ln = ""; if (++n >= 9) break; } ln += w + " "; } g.fillText(ln, 26, y); vrT.needsUpdate = true; }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; vrDirty = true; s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); vrPanel.visible = false; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, mapTm = 0, loopErrs = 0, lastNote = "";
{ const R = routeAt(trainS); recentre(R.x, R.z); updateGround(R.x, R.z, 99); buildRoad(trainS); }
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  // the train: ease toward the chosen speed, never jolting; stop at Rome
  const vT = started && trainS < ROUTE.L - 300 ? SPEEDS[speedI][0] / 3.6 : 0; vNow += clampN(vT - vNow, -2.5 * dt * Math.max(1, vNow / 40), 1.2 * dt * Math.max(1, vNow / 40)); trainS = Math.min(ROUTE.L - 300, trainS + vNow * dt);
  if (started) { hour += dt / 3600 * 1; if (hour >= 24) { hour -= 24; day++; } }
  const R = routeAt(trainS), Ra = routeAt(trainS + 40), Rb = routeAt(trainS - 40); if (Math.hypot(R.x - ORIGIN.x, R.z - ORIGIN.z) > 1500) recentre(R.x, R.z);
  const ty = Math.max(R.y, terrainH(R.x, R.z) + 0.3) + 0.5; TRAIN.position.set(R.x - ORIGIN.x, ty, R.z - ORIGIN.z); TRAIN.rotation.set(0, R.h, 0); TRAIN.rotateX(Math.atan2(Ra.y - Rb.y, 80) * 0.5);
  // you, walking through the cars
  let mx = 0, my = 0, run = 1;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) speedI = Math.max(0, speedI - 1); if (tap("L", gp, 5)) { skipTo(nextStop().s - 1500); say(`Approaching <b>${nextStop().name}</b>.`, 6); } }
      else { if (tap("R", gp, 4)) interact(); if (tap("R", gp, 5)) speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyAxisAngle(UP, vrTurn); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ShiftLeft) run = 1.8;
    if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.set(-fwd.z, 0, fwd.x);
  if (mx || my) { const sp = 1.3 * run * dt, nx = P_.x + (fwd.x * -my + side.x * mx) * sp, nz = P_.z + (fwd.z * -my + side.z * mx) * sp; if (walkable(nx, nz)) { P_.x = nx; P_.z = nz; } else if (walkable(nx, P_.z)) P_.x = nx; else if (walkable(P_.x, nz)) P_.z = nz; }
  rig.position.set(P_.x, 0, P_.z);
  // the world around: ground, countryside, towns, the road and its people
  updateGround(R.x, R.z); streamTiles(R.x, R.z); streamTowns(R.x, R.z); if (Math.abs(trainS - roadAt) > 3000) buildRoad(trainS); if (Math.abs(trainS - peopleAt) > 2500) assignPeople(trainS);
  animatePeople(t, dt); turnSails(t);
  // sun, sky, stars
  const lat = LAT0 - R.z / KZ, S = sunDir(hour, lat), el = S.el, dayL = clampN(Math.sin(el) * 4 + 0.35, 0, 1), dusk = clampN(1 - Math.abs(Math.sin(el)) * 5, 0, 1) * (el > -0.2 ? 1 : 0);
  sun.position.copy(S.v).multiplyScalar(800); sun.target.position.set(0, 0, 0); sun.intensity = 2.5 * clampN(Math.sin(el) * 3, 0, 1); sun.color.setRGB(1, 0.9 - 0.3 * dusk, 0.78 - 0.45 * dusk); hemi.intensity = 0.08 + 1.0 * dayL;
  const upC = new THREE.Color(0.32, 0.52, 0.82).multiplyScalar(0.03 + 0.97 * dayL), hor = new THREE.Color(0.80, 0.85, 0.87).multiplyScalar(0.04 + 0.96 * dayL).lerp(new THREE.Color(0.95, 0.55, 0.30), dusk * 0.6);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); scene.fog.color.copy(hor); sky.position.copy(TRAIN.position); STARS.position.copy(TRAIN.position); STARS.material.opacity = clampN(1 - dayL * 2.5, 0, 1);
  sunDisc.position.copy(TRAIN.position).addScaledVector(S.v, 45000); sunDisc.lookAt(TRAIN.position); sunDisc.visible = el > -0.03; water.position.set(TRAIN.position.x, WATER, TRAIN.position.z);
  for (const L of TRAIN.children) L.traverse?.(o => { if (o.isPointLight) o.intensity = (o.userData.i ??= o.intensity) * (0.35 + 0.65 * (1 - dayL)); });
  // the guide: a note as each town comes near
  const nt = nearTownNote(); if (nt && nt.name !== lastNote && Math.hypot(nt.x - R.x, nt.z - R.z) < 4000) { lastNote = nt.name; say(`<b>${nt.name}</b> · ${NOTES[nt.name]}`, 22); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapTm -= dt; if (mapTm <= 0) { mapTm = 1; drawMap(); }
  hudT -= dt; if (hudT <= 0) { hudT = 0.4; const p = prevStop(), n = nextStop();
    HUD.innerHTML = `<b>Summer 1250</b> (14 June by the calendar of the time) · ${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor(hour % 1 * 60)).padStart(2, "0")}, day ${day + 1} · ${CARS[carAt(P_.z)]}<br>
      ${vNow < 0.5 ? "standing" : Math.round(vNow * 3.6) + " km/h"} · last ${p.name} · next <b>${n.name}</b> in ${((n.s - trainS) / 1000).toFixed(0)} km · ${((ROUTE.L - trainS) / 1000).toFixed(0)} km to Rome<br>
      <span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · − / = speed · N next town · P stop / go · E: sleep in a berth, or read the map in the lounge</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(msgText || `${vNow < 0.5 ? "Standing" : Math.round(vNow * 3.6) + " km/h"} · next ${n.name} in ${((n.s - trainS) / 1000).toFixed(0)} km · left stick walk · right stick turn · A: sleep / map · B faster · X slower · Y next town`); vrDirty = false; } }
  renderer.render(scene, camera);
}

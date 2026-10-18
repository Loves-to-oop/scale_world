// cahokia.js -- Cahokia, about 1100 CE: an open world at real size (1 m = 1 m). Built into cahokia.html by build.py.
//
// Monks Mound stands at the origin; x is east, -z is north. Positions come from latitude and longitude (LL below).
// The central city, the East St. Louis and St. Louis mound groups, Horseshoe Lake, the creeks, the bluffs and the
// Emerald Acropolis on the uplands are placed from archaeological maps and reports (see the SOURCES notes by each);
// everything between and beyond them (farmsteads, fields, woods, prairie, the land past the map) is generated.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const Q = new URLSearchParams(location.search), SEED = Math.max(1, Number(Q.get("seed") || 1) | 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 60000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const O3 = new THREE.Object3D(), clampN = THREE.MathUtils.clamp, sstepN = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
let s0 = (SEED * 48271) % 2147483647 || 1; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ (SEED * 40503)) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4) { let a = 0, f = 1, w = 0.5, s = 0; for (let k = 0; k < n; k++) { a += w * vnoise(x * f, z * f); s += w; f *= 2.03; w *= 0.5; } return a / s; }

// ---------- textures ----------
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const speckle = (base, n, cols, sw = 2, sh = 2) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.globalAlpha = 0.25 + rnd() * 0.4; g.fillRect(rnd() * w, rnd() * h, sw * (0.5 + rnd()), sh * (0.5 + rnd())); } g.globalAlpha = 1; };

// ---------- the map: latitude and longitude to metres from Monks Mound ----------
const LAT0 = 38.66052, LON0 = -90.06208, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const LL = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
// a polyline (in lat/long, or in metres with lineM) with a fast "how far from it" test; side() is + to the right going along it
const lineM = P => line(P, true);
function line(pts, metres) { const P = metres ? pts : pts.map(([a, b]) => LL(a, b)), S = [];
  for (let i = 1; i < P.length; i++) S.push([P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]]);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P, S, box: [x0, x1, z0, z1],
    d(x, z) { let best = 1e9; for (const [ax, az, bx, bz] of S) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
      const ex = ax + t * dx - x, ez = az + t * dz - z, d2 = ex * ex + ez * ez; if (d2 < best) best = d2; } return Math.sqrt(best); },
    side(x, z) { let best = 1e9, sg = 1; for (const [ax, az, bx, bz] of S) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
      const ex = x - (ax + t * dx), ez = z - (az + t * dz), d2 = ex * ex + ez * ez; if (d2 < best) { best = d2; sg = Math.sign(dx * ez - dz * ex) || 1; } } return Math.sqrt(best) * sg; } }; }

// ---------- the land: the American Bottom floodplain, the bluffs, the rivers, the lakes ----------
// The floodplain is level 0 (about 125 m above sea level; Monks Mound's base is at 128-130 m). The Collinsville bluffs rise about
// 36-40 m to the uplands some 5-6 km east; the uplands climb gently to the Emerald ridge 24 km east. The Mississippi runs ~10 km
// west, with St. Louis on its terrace and bluffs beyond (its mound group ~27 m above the river); the Missouri comes in from the
// west 17 km north-west. Cahokia Creek ran just north of Monks Mound, with Canteen Creek between Monks and the Kunnemann group.
// Ridges and swales of old meanders cross the floodplain, many holding sloughs. Horseshoe Lake, an oxbow, existed by then (lake
// cores show it 600-1400 CE). The river's exact course in 1100 is not known: it follows today's, kept east of the St. Louis mounds.
const WATER = -2.2;
const MISSISSIPPI = line([[39.05, -90.47], [38.97, -90.43], [38.93, -90.30], [38.89, -90.18], [38.85, -90.14], [38.81, -90.12], [38.77, -90.165],
  [38.72, -90.18], [38.67, -90.177], [38.643, -90.1755], [38.629, -90.178], [38.59, -90.20], [38.555, -90.225], [38.50, -90.28], [38.43, -90.35], [38.30, -90.39], [38.10, -90.32]]);
const MISSOURI = line([[38.81, -90.12], [38.835, -90.20], [38.80, -90.30], [38.79, -90.44], [38.75, -90.60], [38.62, -90.80]]);
const CAHOKIA_CK = line([[38.80, -89.985], [38.75, -90.005], [38.715, -90.02], [38.688, -90.035], [38.6705, -90.046], [38.6650, -90.056], [38.6642, -90.066],
  [38.6655, -90.080], [38.662, -90.097], [38.655, -90.12], [38.648, -90.15], [38.645, -90.168]]);
const CANTEEN_CK = line([[38.70, -89.99], [38.687, -90.02], [38.6735, -90.045], [38.6705, -90.058], [38.6668, -90.0625], [38.6642, -90.066]]);   // between Monks Mound and the Kunnemann group
const BLUFF_E = line([[39.0, -90.25], [38.90, -90.16], [38.86, -90.08], [38.82, -90.01], [38.78, -89.995], [38.72, -89.995], [38.68, -89.996], [38.64, -89.998],
  [38.60, -90.025], [38.56, -90.075], [38.52, -90.13], [38.48, -90.19], [38.40, -90.27], [38.25, -90.33], [38.0, -90.3]]);   // traced north to south: the uplands are on its east
const HORSESHOE = (() => { const [cx, cz] = LL(38.6994, -90.0850), P = [];   // an oxbow loop round its centre (lake cores: Munoz et al. 2015); the open side to the south
  for (let a = 215; a >= -35; a -= 10) { const t = a * Math.PI / 180, r = 1500 + 180 * Math.sin(t * 2.3); P.push([cx + r * Math.cos(t), cz - r * Math.sin(t) * 0.85]); } return lineM(P); })();
const BORROW = [];                                      // borrow pits, filled in with the mounds
// the Emerald Acropolis stands on a natural loess ridge, levelled and built up along its sides to line up with the moon's
// northernmost rising (azimuth ~53°); 24 km east, 3.3 km south of Monks Mound (38.6306 N, 89.7858 W)
const [EMX, EMZ] = LL(38.6306, -89.7858), EMA = 53 * Math.PI / 180, EMU = [Math.sin(EMA), -Math.cos(EMA)];
function emeraldRidge(x, z) { const dx = x - EMX, dz = z - EMZ; if (Math.abs(dx) > 1500 || Math.abs(dz) > 1500) return 0;
  const a = dx * EMU[0] + dz * EMU[1], b = -dx * EMU[1] + dz * EMU[0], q = Math.hypot(Math.max(0, Math.abs(a) - 260) / 340, b / 150);
  return q >= 1 ? 0 : 9 * Math.min(1, 2 * (1 - q * q)); }   // its top levelled flat
const PLAZAS = [];                                      // levelled plazas: [x, z, halfX, halfZ, level]
const ALL_LINES = () => [MISSISSIPPI, MISSOURI, CAHOKIA_CK, CANTEEN_CK, HORSESHOE];
function near(L, x, z, m) { const [a, b, c, d] = L.box; return x > a - m && x < b + m && z > c - m && z < d + m; }
function carve(h, d, halfW, depth, bank) { if (d > halfW + bank) return h; const t = sstepN(d, halfW * 0.55, halfW + bank); return Math.min(h, lerpN(WATER - depth, h, t)); }
function baseH(x, z) {
  let h = (fbm(x / 1400 + 3, z / 1400) - 0.5) * 2.4 + (fbm(x / 260, z / 260 + 9, 3) - 0.5) * 0.7;          // ridges and swales of old channels
  const sw = Math.abs(fbm(x / 2600 + 40, z / 2600 - 7, 3) - 0.5) + 0.2 * Math.max(0, 1 - Math.hypot(x + 100, z - 300) / 2200);   // old meander scars (none in the built-up centre)
  if (sw < 0.045) h = lerpN(h, WATER - 0.4, sstepN(0.045 - sw, 0, 0.025));                                    // sloughs and marsh in them
  // west of the Mississippi: St. Louis on its limestone bluffs
  const dm = MISSISSIPPI.side(x, z);
  if (dm > 480) h += sstepN(dm, 480, 950) * (21 + 4 * (fbm(x / 900, z / 900 + 4) - 0.5)) + sstepN(dm, 2500, 5000) * (22 + 16 * (fbm(x / 1800, z / 1800 + 4) - 0.5));
  // the eastern bluffs and the uplands
  const db = -BLUFF_E.side(x, z);
  if (db > -150) { const up = 38 + 18 * sstepN(db, 1000, 16000) + 14 * (fbm(x / 3500 + 8, z / 3500) - 0.5) + 6 * (fbm(x / 600, z / 600) - 0.5) + emeraldRidge(x, z);
    const rav = Math.pow(1 - Math.abs(2 * fbm(x / 900 + 2, z / 900 + 5, 3) - 1), 5) * 38 * (1 - sstepN(db, 1500, 5000)) + Math.pow(1 - Math.abs(2 * fbm(x / 380, z / 380, 3) - 1), 6) * 14 * (1 - sstepN(db, 600, 2500));
    h = lerpN(h, Math.max(up - rav, 4), sstepN(db, -150, 420)); }
  // water
  h = carve(h, MISSISSIPPI.d(x, z), 480, 9, 140);
  if (near(MISSOURI, x, z, 800)) h = carve(h, MISSOURI.d(x, z), 300, 7, 120);
  if (near(CAHOKIA_CK, x, z, 120)) h = carve(h, CAHOKIA_CK.d(x, z), 14, 2.2, 22);
  if (near(CANTEEN_CK, x, z, 100)) h = carve(h, CANTEEN_CK.d(x, z), 7, 1.6, 16);
  if (near(HORSESHOE, x, z, 500)) h = carve(h, HORSESHOE.d(x, z), 300, 3.5, 90);
  for (const [bx, bz, br, bd] of BORROW) { const d = Math.hypot(x - bx, z - bz); if (d < br + 25) h = carve(h, d, br, bd, 18); }
  for (const [px, pz, hx, hz, lv] of PLAZAS) { const e = Math.max(Math.abs(x - px) - hx, Math.abs(z - pz) - hz); if (e < 30) h = lerpN(lv, h, sstepN(e, 0, 30)); }
  return h; }

// ---------- mounds: platform (flat-topped), conical, ridge-top, and Monks Mound's terraces ----------
// Each mound: { name, kind, x, z, w (east-west base, m), d (north-south base), h (height), rot (degrees from north), top }.
// Shapes are exact functions, so walking on a mound and drawing it agree.
const MOUNDS = [];
const RUN = 1.35;                                       // horizontal run per metre of height on a mound's side (~36°, as surveyed slopes)
function rrect(x, z, ax, az, r) { const qx = Math.abs(x) - ax + r, qz = Math.abs(z) - az + r; return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r; }
const shoulder = t => t <= 0 ? 0 : t >= 1 ? 1 : 0.8 * t + 0.2 * t * t * (3 - 2 * t);
function platform(lx, lz, w, d, h, r = 4, rf = RUN) { const run = h * rf, ax = Math.max(1, w / 2 - run), az = Math.max(1, d / 2 - run), e = rrect(lx, lz, ax, az, Math.min(r, ax, az));
  return e <= 0 ? h : e >= run ? 0 : h * (1 - shoulder(e / run)); }
function cone(lx, lz, w, d, h) { const q = (lx / (w / 2)) ** 2 + (lz / (d / 2)) ** 2; return q >= 1 ? 0 : h * Math.pow(1 - q, 0.8); }
function ridge(lx, lz, w, d, h) { const a = Math.max(0, w / 2 - d / 2), qx = Math.max(0, Math.abs(lx) - a), q = Math.hypot(qx, lz) / (d / 2); return q >= 1 ? 0 : h * Math.pow(1 - q * q, 0.85); }
function moundLocal(m, x, z) { const c = Math.cos(m.r), s = Math.sin(m.r), dx = x - m.x, dz = z - m.z; return [dx * c - dz * s, dx * s + dz * c]; }
function moundHeight(m, x, z) { const [lx, lz] = moundLocal(m, x, z);
  if (m.kind === "platform") return platform(lx, lz, m.w, m.d, m.h, m.round ?? 4, m.run ?? RUN);
  if (m.kind === "cone") return cone(lx, lz, m.w, m.d, m.h);
  if (m.kind === "ridge") return ridge(lx, lz, m.w, m.d, m.h);
  if (m.kind === "parts") { let h = 0; for (const p of m.parts) h = Math.max(h, p(lx, lz)); return h; }
  return 0; }
const MCELL = 250, MGRID = new Map();
function indexMound(m) { m.r = (m.rot || 0) * Math.PI / 180; m.base = baseH(m.x, m.z); const R = Math.hypot(m.w, m.d) / 2 + 2;
  for (let i = Math.floor((m.x - R) / MCELL); i <= Math.floor((m.x + R) / MCELL); i++) for (let j = Math.floor((m.z - R) / MCELL); j <= Math.floor((m.z + R) / MCELL); j++) {
    const k = i + "," + j; if (!MGRID.has(k)) MGRID.set(k, []); MGRID.get(k).push(m); } }
function moundTop(x, z) { const L = MGRID.get(Math.floor(x / MCELL) + "," + Math.floor(z / MCELL)); if (!L) return -1e9; let h = -1e9;   // each mound is built level from the ground at its centre
  for (const m of L) { const v = moundHeight(m, x, z); if (v > 0.01 && m.base + v > h) h = m.base + v; } return h; }
const groundH = (x, z) => Math.max(baseH(x, z), moundTop(x, z));
const onMound = (x, z) => moundTop(x, z) > baseH(x, z) + 0.05;
// a mound's own mesh: a fine grid over its footprint, sunk into the ground outside it
const moundGrass = tex(256, 256, speckle("#7a9a4a", 5000, ["#8eb05a", "#5e7e3a", "#a4bc6a", "#6a8a40"], 1.2, 3));
const moundMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: moundGrass, roughness: 0.95 });
function moundMesh(m) { const R = Math.hypot(m.w, m.d) / 2 + 4, cell = IS_HEADSET ? clampN(Math.max(m.w, m.d) / 36, 1.8, 5) : clampN(Math.max(m.w, m.d) / 60, 1.1, 3.2), n = Math.ceil(2 * R / cell);
  const geo = new THREE.PlaneGeometry(2 * R, 2 * R, n, n).rotateX(-Math.PI / 2), p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const X = m.x + p.getX(i), Z = m.z + p.getZ(i), v = moundHeight(m, X, Z), b = baseH(X, Z), on = v > 0.01 && m.base + v > b;
    p.setXYZ(i, X, on ? m.base + v + 0.04 : b - 0.8, Z); uv.setXY(i, X / 4, Z / 4);
    const n1 = fbm(X / 25, Z / 25, 2); c.setRGB(0.36 + 0.08 * n1, 0.52 + 0.08 * n1, 0.22);                       // kept in grass, as the mural shows
    if (m.bare && v > m.h - 0.3) c.lerp(new THREE.Color(0.62, 0.52, 0.36), 0.6);                               // a trodden summit
    col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, moundMat); scene.add(mesh); m.mesh = mesh; return mesh; }

// ---------- sky, sun, haze ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.5)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(50000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc8d6dc, IS_HEADSET ? 0.00016 : 0.00011);   // a humid Midwestern summer haze: the far bluffs fade blue
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x6a7a4a, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false, toneMapped: false })); scene.add(sunDisc);
const water = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x4f6e6a, roughness: 0.25, metalness: 0.1, map: tex(256, 256, speckle("#ffffff", 1500, ["#d8e4e4", "#ffffff", "#c0d0d0"], 6, 1.2), [9000, 9000]) }));
water.position.y = WATER; scene.add(water);

// ---------- the ground: nested grids, each twice as coarse as the last, that follow you ----------
// Heights and colours are kept from step to step; only the new rows and columns are worked out.
const GN = IS_HEADSET ? 96 : 128, NLV = IS_HEADSET ? 8 : 9, CELL0 = IS_HEADSET ? 2 : 1;
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95,
  map: tex(256, 256, speckle("#c4c4c4", 6000, ["#eeeeee", "#8a8a8a", "#a8a8a8", "#d8d8d8"], 1.5, 3)) });
const LEVELS = [];
for (let k = 0; k < NLV; k++) { const n = GN + 1, geo = new THREE.BufferGeometry(), idx = new Uint16Array(GN * GN * 6); let o = 0;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * n * 2), 2)); geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  const mesh = new THREE.Mesh(geo, groundMat); mesh.frustumCulled = false; scene.add(mesh);
  LEVELS.push({ c: CELL0 * 2 ** k, ox: NaN, oz: NaN, H: new Float32Array(n * n), C: new Float32Array(n * n * 3), geo, mesh, dirty: true }); }
const _gc = new THREE.Color();
function levelRecentre(L, cx, cz) { const c = L.c, n = GN + 1, step = 2 * c, ox = Math.round(cx / step) * step, oz = Math.round(cz / step) * step;
  if (ox === L.ox && oz === L.oz) return false;
  const H2 = new Float32Array(n * n), C2 = new Float32Array(n * n * 3), had = !isNaN(L.ox), di = had ? Math.round((ox - L.ox) / c) : 0, dj = had ? Math.round((oz - L.oz) / c) : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, si = i + di, sj = j + dj;
    if (had && si >= 0 && si <= GN && sj >= 0 && sj <= GN) { const q = sj * n + si; H2[k] = L.H[q]; C2[3 * k] = L.C[3 * q]; C2[3 * k + 1] = L.C[3 * q + 1]; C2[3 * k + 2] = L.C[3 * q + 2]; continue; }
    const x = ox + (i - GN / 2) * c, z = oz + (j - GN / 2) * c, h = baseH(x, z); H2[k] = h; groundColor(x, z, h, _gc); C2[3 * k] = _gc.r; C2[3 * k + 1] = _gc.g; C2[3 * k + 2] = _gc.b; }
  L.H = H2; L.C = C2; L.ox = ox; L.oz = oz; L.dirty = true; return true; }
function levelWrite(L, F) { const c = L.c, n = GN + 1, p = L.geo.attributes.position.array, uv = L.geo.attributes.uv.array, half = F ? GN / 2 * F.c - c * 1.01 : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, x = L.ox + (i - GN / 2) * c, z = L.oz + (j - GN / 2) * c;
    const ex = F ? Math.max(Math.abs(x - F.ox), Math.abs(z - F.oz)) : 1e9, inner = ex < half, edge = !inner && ex < half + c * 0.99;   // under the finer grid: pushed down out of sight
    p[3 * k] = x; p[3 * k + 1] = inner ? L.H[k] - 60 : edge ? L.H[k] - 0.15 - 0.03 * c : L.H[k]; p[3 * k + 2] = z; uv[2 * k] = x / 6; uv[2 * k + 1] = z / 6; }   // (the overlap row tucked just under it)
  const nr = L.geo.attributes.normal.array, H = L.H;                                     // normals from the true heights, not the sunk ones
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, gx = (H[j * n + Math.min(GN, i + 1)] - H[j * n + Math.max(0, i - 1)]) / ((Math.min(GN, i + 1) - Math.max(0, i - 1)) * c),
    gz = (H[Math.min(GN, j + 1) * n + i] - H[Math.max(0, j - 1) * n + i]) / ((Math.min(GN, j + 1) - Math.max(0, j - 1)) * c), l = Math.hypot(gx, 1, gz); nr[3 * k] = -gx / l; nr[3 * k + 1] = 1 / l; nr[3 * k + 2] = -gz / l; }
  L.geo.attributes.color.array.set(L.C);
  for (const a of ["position", "color", "uv", "normal"]) L.geo.attributes[a].needsUpdate = true; L.dirty = false; }
function updateGround(x, z, budget = 3) { let moved = [];
  for (let k = 0; k < NLV; k++) { const L = LEVELS[k]; if (budget > 0 && levelRecentre(L, x, z)) { budget--; moved[k] = true; } }
  for (let k = 0; k < NLV; k++) { const L = LEVELS[k]; if (isNaN(L.ox)) continue; if (L.dirty || moved[k - 1]) levelWrite(L, k ? LEVELS[k - 1] : null); } }

// ---------- land cover: town, fields, prairie, woods ----------
// SITES are the mapped settlements, each a density of houses falling off from its centre. Everything else is countryside:
// tallgrass prairie on the floodplain, woods along the water and up the bluff ravines, oak savanna and woods on the uplands.
function cityAt(x, z) { let d = 0; for (const s of SITES) { const q = Math.hypot((x - s.x) / s.rx, (z - s.z) / s.rz); if (q < 1.3) d = Math.max(d, s.dens * (1 - sstepN(q, 0.55, 1.3))); } return d; }
function ruralAt(x, z) { const h = baseH(x, z); if (h < WATER + 0.5) return 0; return clampN(0.35 + 0.9 * (fbm(x / 6000 + 21, z / 6000) - 0.5), 0.05, 1); }
function forestAt(x, z, h) { if (h < WATER + 0.3) return 0;
  let f = sstepN(fbm(x / 1500 + 7, z / 1500 - 3, 3), 0.52, 0.66) * 0.25;                                     // groves on the floodplain
  const dw = Math.min(near(CAHOKIA_CK, x, z, 250) ? CAHOKIA_CK.d(x, z) : 999, near(HORSESHOE, x, z, 500) ? Math.max(0, HORSESHOE.d(x, z) - 210) : 999, Math.max(0, MISSISSIPPI.d(x, z) - 520));
  if (dw < 240) f = Math.max(f, 0.55 * (1 - sstepN(dw, 30, 240)));                                           // cottonwood, willow and sycamore along the water
  if (h > 4) f = Math.max(f, 0.45 + 0.4 * sstepN(fbm(x / 900 + 3, z / 900, 3), 0.4, 0.6) - (h > 45 ? 0.25 : 0));   // oak-hickory up the bluffs, savanna on top
  return clampN(f * (1 - 1.6 * cityAt(x, z)), 0, 0.9); }
function plazaAt(x, z) { for (const [px, pz, hx, hz] of PLAZAS) { const e = Math.max(Math.abs(x - px) - hx, Math.abs(z - pz) - hz); if (e < 0) return 1; if (e < 12) return 1 - e / 12; } return 0; }
function groundColor(x, z, h, c) {
  const n1 = fbm(x / 70, z / 70, 3), n2 = fbm(x / 900 + 5, z / 900, 3);
  c.setRGB(0.40 + 0.16 * n2, 0.47 + 0.10 * n1, 0.22 + 0.04 * n1);                                                // tallgrass prairie in high summer
  if (h < WATER + 1.2) c.lerp(_c1.setRGB(0.27, 0.38, 0.20), clampN((WATER + 1.2 - h) / 1.0, 0, 1));                   // wet ground: sedges and marsh
  if (h < WATER + 0.25) c.lerp(_c1.setRGB(0.38, 0.33, 0.25), 0.8);                                                // mud at the water's edge
  const f = forestAt(x, z, h); if (f > 0.2) c.lerp(_c1.setRGB(0.17 + 0.05 * n1, 0.27 + 0.05 * n1, 0.12), clampN((f - 0.2) * 1.8, 0, 0.85));   // leaf litter and shade under woods
  const t = cityAt(x, z); if (t > 0.05) c.lerp(_c1.setRGB(0.55 + 0.08 * n1, 0.50 + 0.06 * n1, 0.36), clampN(t * 1.1, 0, 0.7));          // trodden yards and paths between houses
  if (near(AVENUE, x, z, 10)) { const d = AVENUE.d(x, z); if (d < 3) c.lerp(_c1.setRGB(0.58, 0.50, 0.34), 0.75 * (1 - d / 3)); }   // the footpath east
  const p = plazaAt(x, z); if (p > 0) c.lerp(_c1.setRGB(0.68 + 0.05 * n1, 0.56 + 0.04 * n1, 0.38), p);                                   // the plazas: bare packed earth, swept
  return c; }
const _c1 = new THREE.Color();

// ---------- building parts ----------
const thatch = tex(256, 256, (g, w, h) => { g.fillStyle = "#a8854e"; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 2600; k++) { const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 18; g.strokeStyle = ["#c9a465", "#8a6a3a", "#b8945a", "#6e5430"][(rnd() * 4) | 0]; g.globalAlpha = 0.5; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y + l); g.stroke(); }
  g.globalAlpha = 1; for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(60,40,20,.25)"; g.fillRect(0, y, w, 3); } }, [3, 3]);
const daub = tex(256, 256, (g, w, h) => { g.fillStyle = "#b8a27c"; g.fillRect(0, 0, w, h);   // walls of poles and woven cane mats (wattle-and-daub is not found in the American Bottom)
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const a = ((x + y) / 8) % 2; g.fillStyle = a ? "rgba(90,70,40,.28)" : "rgba(230,210,170,.22)"; g.fillRect(x, y, a ? 8 : 3, a ? 3 : 8); }
  for (let x = 0; x < w; x += 32) { g.fillStyle = "rgba(60,44,26,.45)"; g.fillRect(x, 0, 3, h); } }, [2, 1]);
const plaster = tex(256, 256, speckle("#d8ccb4", 2500, ["#c8bca0", "#e8dcc4", "#b8a888"]), [3, 1]);
const logs = tex(256, 128, (g, w, h) => { g.fillStyle = "#6e5236"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = ["#7e6040", "#5e4428", "#8a6a48"][(x / 16) % 3]; g.fillRect(x + 1, 0, 14, h);
  g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x, 0, 2, h); } for (let k = 0; k < 400; k++) { g.fillStyle = "rgba(30,20,10,.25)"; g.fillRect(rnd() * w, rnd() * h, 1, 4 + rnd() * 10); } }, [8, 1]);
// a steep hipped roof over a 1 x 1 base, 1 tall, with a short ridge along x (the mural's houses)
function hipRoof(ridge = 0.22) { const b = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]], r0 = [-ridge, 1, 0], r1 = [ridge, 1, 0];
  const tri = [], uv = [], T = (a, b2, c, ua, ub, uc) => { tri.push(...a, ...b2, ...c); uv.push(...ua, ...ub, ...uc); };
  T(b[3], b[2], r1, [0, 0], [1, 0], [0.5 + ridge, 1]); T(b[3], r1, r0, [0, 0], [0.5 + ridge, 1], [0.5 - ridge, 1]);
  T(b[1], b[0], r0, [0, 0], [1, 0], [0.5 + ridge, 1]); T(b[1], r0, r1, [0, 0], [0.5 + ridge, 1], [0.5 - ridge, 1]);
  T(b[2], b[1], r1, [0, 0], [1, 0], [0.5, 1]); T(b[0], b[3], r0, [0, 0], [1, 0], [0.5, 1]);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
const ROOF_G = hipRoof(0.18), WALL_G = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), CONE_G = new THREE.ConeGeometry(0.5, 1, 12, 1).translate(0, 0.5, 0), POST_G = new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0);
const thatchM = new THREE.MeshStandardMaterial({ map: thatch, roughness: 1 }), daubM = new THREE.MeshStandardMaterial({ map: daub, roughness: 0.95 }), plasterM = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.9 });
const logM = new THREE.MeshStandardMaterial({ map: logs, roughness: 0.95 }), postM = M(0x7a5a3a), cedarM = M(0x8a4a30);
// a set of instanced pieces, filled from a list of [x, y, z, sx, sy, sz, rotY]
function instances(geo, mat, list, colorFn) { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), c = new THREE.Color();
  list.forEach(([x, y, z, sx, sy, sz, ry], i) => { O3.position.set(x, y, z); O3.rotation.set(0, ry || 0, 0); O3.scale.set(sx, sy, sz); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); if (colorFn) { colorFn(i, c); im.setColorAt(i, c); } });
  if (!list.length) im.count = 0; im.frustumCulled = false; return im; }
// a house: walls and a hipped thatched roof. L = { walls, roofs } lists; w across the ridge, d along it
function addHouse(L, x, z, w, d, wallH, roofH, ry, gy) { const y = gy ?? groundH(x, z);
  L.walls.push([x, y - 0.3, z, d, wallH + 0.3, w, ry]); L.roofs.push([x, y + wallH, z, d + 1.0, roofH, w + 1.0, ry]); }
function addFence(L, pts, h, gyFn) { for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2;
  const y = gyFn ? gyFn(mx, mz) : groundH(mx, mz); L.fences.push([mx, y - 0.4, mz, len + 0.2, h + 0.4, 0.35, Math.atan2(-(bz - az), bx - ax)]); } }
function buildSet(L, group) { if (L.walls?.length) group.add(instances(WALL_G, daubM, L.walls, (i, c) => c.setHSL(0.09, 0.2 + 0.1 * hash(i, 3), 0.7 + 0.12 * hash(i, 5))));
  if (L.plaster?.length) group.add(instances(WALL_G, plasterM, L.plaster));
  if (L.roofs?.length) group.add(instances(ROOF_G, thatchM, L.roofs, (i, c) => c.setHSL(0.09, 0.25 + 0.15 * hash(i, 7), 0.62 + 0.18 * hash(i, 9))));
  if (L.fences?.length) group.add(instances(WALL_G, logM, L.fences));
  if (L.cones?.length) group.add(instances(CONE_G, thatchM, L.cones));
  if (L.posts?.length) group.add(instances(POST_G, postM, L.posts));
  if (L.cedar?.length) group.add(instances(POST_G, cedarM, L.cedar));
  if (L.trunks?.length) group.add(instances(TRUNK_G, postM, L.trunks));
  if (L.crowns?.length) group.add(instances(CROWN_G, crownM, L.crowns, (i, c) => c.setHSL(0.2 + 0.07 * hash(i, 1), 0.38, 0.22 + 0.1 * hash(i, 2))));
  if (L.fields?.length) for (const f of L.fields) group.add(fieldMesh(...f)); }
const TRUNK_G = new THREE.CylinderGeometry(0.18, 0.3, 1, 6).translate(0, 0.5, 0), CROWN_G = new THREE.IcosahedronGeometry(1, 0), crownM = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
function addTree(L, x, z, s, wet, gy) { const y = gy ?? groundH(x, z), th = (wet ? 7 : 5) * s; L.trunks.push([x, y, z, s, th, s, 0]); L.crowns.push([x, y + th + 2.4 * s, z, 3.4 * s, (wet ? 4.6 : 3.4) * s, 3.4 * s, hash(x | 0, z | 0) * 6]); }
// a maize field: rows of green hills laid on the ground
const maize = tex(128, 128, (g, w, h) => { g.fillStyle = "#7a6e44"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = "#5e7a34"; g.fillRect(x + 4, 0, 8, h); g.fillStyle = "#6e8a3c"; for (let y = 0; y < h; y += 8) g.fillRect(x + 4 + (rnd() - 0.5) * 3, y, 7, 5); } });
const maizeM = new THREE.MeshStandardMaterial({ map: maize, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
function fieldMesh(x, z, w, d, ry) { const nx = Math.max(2, Math.ceil(w / 8)), nz = Math.max(2, Math.ceil(d / 8)), geo = new THREE.PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2), p = geo.attributes.position, uv = geo.attributes.uv, c = Math.cos(ry), s = Math.sin(ry);
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), X = x + lx * c - lz * s, Z = z + lx * s + lz * c; p.setXYZ(i, X, groundH(X, Z) + 0.25, Z); uv.setXY(i, lx / 3.2, lz / 3.2); }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, maizeM); m.frustumCulled = false; return m; }

// ---------- the land beyond the mapped places, generated 1 km square by 1 km square as you go ----------
const TILE = 1000, TR = IS_HEADSET ? 2 : 3, TILES = new Map();
function okToBuild(x, z, pad = 6) { if (baseH(x, z) < WATER + 0.8 || onMound(x, z)) return false; for (const [px, pz, hx, hz] of PLAZAS) if (Math.abs(x - px) < hx + pad && Math.abs(z - pz) < hz + pad) return false;
  for (const k of KEEP_CLEAR) if (Math.hypot(x - k[0], z - k[1]) < k[2] + pad) return false; return true; }
function genTile(ti, tj) { const r = seeded(ti * 7919 + tj * 104729 + 11), x0 = ti * TILE, z0 = tj * TILE, L = { walls: [], roofs: [], cones: [], posts: [], trunks: [], crowns: [], fields: [], fences: [] }, group = new THREE.Group();
  // trees, by the woodland density
  const nT = IS_HEADSET ? 500 : 1100;
  for (let k = 0; k < nT; k++) { const x = x0 + r() * TILE, z = z0 + r() * TILE, h = baseH(x, z), f = forestAt(x, z, h); if (r() > f || !okToBuild(x, z, 2)) continue; addTree(L, x, z, 0.8 + r() * 0.8, h < 1.5, h); }
  // town houses: courtyard groups on Cahokia's grid (about 5° east of north), houses lined round a small yard, a granary or two,
  // as excavated neighbourhoods were laid out; fields only out at the edges of town
  const GRID = 5 * Math.PI / 180, cg = Math.cos(GRID), sg = Math.sin(GRID), BLK = 56;
  const gw = (u, v) => [u * cg - v * sg, u * sg + v * cg];                                  // grid coordinates to world
  const [u0, v0] = [x0 * cg + z0 * sg, -x0 * sg + z0 * cg];
  for (let bu = Math.floor((u0 - 300) / BLK); bu < (u0 + TILE + 300) / BLK; bu++) for (let bv = Math.floor((v0 - 300) / BLK); bv < (v0 + TILE + 300) / BLK; bv++) {
    const [cx, cz] = gw((bu + 0.5) * BLK, (bv + 0.5) * BLK); if (cx < x0 || cx >= x0 + TILE || cz < z0 || cz >= z0 + TILE) continue;
    const br = seeded(bu * 7349 + bv * 9203 + 5), dens = cityAt(cx, cz); if (dens < 0.02 || br() > dens * 3.2) continue;
    const yard = 16 + br() * 8, per = 2 + Math.floor(br() * 2);
    for (let side = 0; side < 4; side++) for (let q = 0; q < per; q++) { if (br() < 0.22) continue;
      const along = (q - (per - 1) / 2) * 8.2 + (br() - 0.5) * 1.2, out = yard / 2 + 3.2 + br() * 1.2;
      const [lu, lv] = side === 0 ? [along, -out] : side === 1 ? [out, along] : side === 2 ? [along, out] : [-out, along];
      const [dx, dz] = gw(lu, lv), x = cx + dx, z = cz + dz; if (!okToBuild(x, z, 4)) continue;
      const big = br() < 0.06, w = big ? 6 + br() * 2 : 3.6 + br() * 1.3, d = big ? 9 + br() * 3 : 5 + br() * 2;
      addHouse(L, x, z, w, d, 1.9 + br() * 0.4, (big ? 4.6 : 3.3) + br() * 1.1, -GRID + (side % 2 ? Math.PI / 2 : 0), groundH(x, z)); }
    if (br() < 0.6) { const [dx, dz] = gw((br() - 0.5) * yard * 0.5, (br() - 0.5) * yard * 0.5), sx = cx + dx, sz = cz + dz; if (okToBuild(sx, sz, 2)) { const sh = groundH(sx, sz);   // a raised granary in the yard
        for (const [px, pz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) L.posts.push([sx + px, sh, sz + pz, 0.18, 1.3, 0.18, 0]);
        L.walls.push([sx, sh + 1.3, sz, 2.2, 1.4, 2.2, -GRID]); L.cones.push([sx, sh + 2.7, sz, 3.2, 2.0, 3.2, 0]); } }
    if (dens < 0.07 && br() < 0.35) { const [dx, dz] = gw(BLK * (br() < 0.5 ? 1 : -1), 0), fx = cx + dx, fz = cz + dz; if (okToBuild(fx, fz, 20)) L.fields.push([fx, fz, 30 + br() * 25, 40 + br() * 25, -GRID]); } }
  // farmsteads out in the countryside: a house or two, a granary, a maize field
  const nF = Math.floor(r() * 4 * ruralAt(x0 + TILE / 2, z0 + TILE / 2));
  for (let k = 0; k < nF; k++) { const x = x0 + 100 + r() * 800, z = z0 + 100 + r() * 800, h = baseH(x, z); if (!okToBuild(x, z, 30) || cityAt(x, z) > 0.02) continue;
    const ry = r() * 0.3 - GRID, nh = 1 + Math.floor(r() * 3);
    for (let q = 0; q < nh; q++) addHouse(L, x + q * 9 * Math.cos(ry), z + q * 9 * Math.sin(ry), 3.6 + r(), 5 + r() * 2, 1.9, 3.4 + r(), ry);
    const sx = x - 7 * Math.sin(ry), sz = z + 7 * Math.cos(ry), sh = groundH(sx, sz); for (const [px, pz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) L.posts.push([sx + px, sh, sz + pz, 0.18, 1.3, 0.18, 0]);
    L.walls.push([sx, sh + 1.3, sz, 2.2, 1.4, 2.2, ry]); L.cones.push([sx, sh + 2.7, sz, 3.2, 2, 3.2, 0]);
    const fx = x + 50 * Math.cos(ry + 1), fz = z + 50 * Math.sin(ry + 1); if (okToBuild(fx, fz, 20)) L.fields.push([fx, fz, 40 + r() * 40, 50 + r() * 50, ry]); }
  buildSet(L, group); scene.add(group); return group; }
function streamTiles(x, z) { const ci = Math.floor(x / TILE), cj = Math.floor(z / TILE); let made = 0;
  for (let d = 0; d <= TR; d++) for (let i = ci - d; i <= ci + d; i++) for (let j = cj - d; j <= cj + d; j++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== d) continue;
    const k = i + "," + j; if (!TILES.has(k) && made < 1) { TILES.set(k, genTile(i, j)); made++; } }
  for (const [k, g] of TILES) { const [i, j] = k.split(",").map(Number); if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) > TR + 1) { scene.remove(g); g.traverse(o => { if (o.isMesh) { o.geometry !== WALL_G && o.geometry !== ROOF_G && o.geometry !== CONE_G && o.geometry !== POST_G && o.geometry !== TRUNK_G && o.geometry !== CROWN_G && o.geometry.dispose(); o.dispose?.(); } }); TILES.delete(k); } } }

// ---------- Cahokia's centre: plazas, mounds, buildings ----------
// SOURCES: mound offsets from GPS readings (jqjacobs.net/archaeo/cahokia.html) and the Fowler "Cahokia Atlas" entries on
// cahokiamounds.org; Monks Mound's form from the same; plaza boundaries from the Cahokia plaza studies (Holley, Dalan & Smith 1993;
// UNF summary); Woodhenge from Wittry's excavations; East St. Louis from Pauketat et al. (the burned compound); St. Louis from the
// Peale/Romain mapping of Big Mound; Emerald from Pauketat, Alt & Kruchten 2017 (Antiquity). Mounds marked "est" are known by
// name but their exact positions or sizes were not found: they are placed and sized from published maps by eye.
// Plazas: [x, z, half-width E-W, half-length N-S, level]  (x east, z south, metres from the Monks Mound summit)
PLAZAS.push([-38, 420, 190, 233, 0.4],     // the Grand Plaza: ~490 x 270+ m, about 19-20 ha, levelled
  [-395, 0, 85, 150, 0.4],                  // the West Plaza, ~9 ha (est)
  [340, -20, 110, 120, 0.4],                // the East Plaza, ~5.8 ha (est)
  [40, -450, 140, 110, -0.2],               // the North Plaza, low and seasonally wet (est)
  [880, -20, 70, 70, 0.4]);                 // the Ramey Plaza (est)
BORROW.push([400, 560, 55, 1.8], [300, 705, 42, 1.5], [-520, 330, 38, 1.4], [620, 250, 34, 1.2]);   // borrow pits, where the mound earth was dug
// [name, kind, east, north, w (E-W), d (N-S), h, rot (°), extra]
const MD = [
  ["Mound 39 (Sawmill)", "platform", -152, 0, 48, 42, 5.8],
  ["Mound 40 (est)", "platform", -262, -60, 44, 40, 4],
  ["Mound 41", "platform", -266, -79 - 0, 83, 83, 5.7],
  ["Mound 77 (est)", "platform", -250, 150, 40, 36, 3.5],
  ["Mound 42 (Merrell)", "platform", -520, -64, 79, 122, 8.3],
  ["Mound 42, its upper platform", "platform", -545, -104, 24, 24, 10.5, 0, { round: 10 }],
  ["Mound 44", "platform", -1003, -82, 55, 80, 5.5],
  ["Mound 48", "platform", -305, -289, 112, 111, 7.5],
  ["Mound 49", "platform", -92, -326, 40, 32, 3],
  ["Mound 51 (Persimmon)", "platform", 198, -243, 49, 43, 5.5, 0, { round: 16 }],
  ["Mound 54 (est)", "platform", 200, -360, 50, 45, 4],
  ["Mound 55 (Murdock)", "platform", 190, -474, 55, 50, 4.5],
  ["Mound 56 (Jesse Ramey)", "platform", -54, -514, 70, 70, 3.9, 0, { round: 22 }],
  ["Mound 57", "cone", -305, -390, 40, 40, 3],
  ["Mound 59 (Round Top)", "cone", -206, -675, 66, 66, 12.1],
  ["Mound 60 (Fox)", "platform", -88, -687, 38, 49, 12.3, 0, { run: 0.9 }],
  ["Mound 61 (est)", "cone", 340, -610, 36, 28, 2.5],
  ["Mound 62 (est)", "cone", 410, -660, 26, 26, 1.8],
  ["Mound 72", "ridge", -143, -1038, 42.6, 21.9, 1.8, 30],
  ["the Rattlesnake Causeway", "ridge", -113, -1392, 800, 18, 0.7, 90],
  ["Mound 66 (Rattlesnake)", "ridge", -116, -1810, 132, 51, 7.4],
  ["Mound 86 (Powell)", "ridge", -2430, 80, 91, 49, 11],
  ["Mound 67", "platform", -569, -863, 30, 30, 2.5],
  ["Mound 68", "platform", -583, -927, 30, 30, 2.5],
  ["Mound 28", "platform", 741, -172, 50, 50, 4],
  ["Mound 36 (est)", "platform", 205, 60, 45, 40, 4],
  ["Mound 37 (est)", "platform", 205, -60, 42, 40, 3.5],
  ["Mound 31 (est)", "platform", 480, 80, 40, 40, 3.5],
  ["Mound 32 (est)", "platform", 490, -20, 36, 36, 3],
  ["Mound 34 (est)", "platform", 470, -120, 40, 38, 3.5],
  ["Mound 13 (est)", "platform", 150, 500, 40, 36, 3],
  ["Mound 14 (est)", "cone", 250, 600, 30, 30, 2.5],
  ["Mound 15 (est)", "platform", -80, 550, 36, 36, 3],
  ["Mound 16 (est)", "cone", -150, 650, 28, 28, 2.5],
  ["Kunnemann Mound (Mound 5, est)", "platform", 330, 1200, 90, 70, 6],
  ["Mound 6", "cone", 363, 1285, 22, 30, 1.8],
  ["Mound 9 (est)", "platform", 250, 1300, 34, 30, 3],
  ["Mound 25 (est)", "platform", 850, 60, 40, 36, 3.5],
  ["Mound 26 (est)", "cone", 950, -20, 30, 30, 3],
  ["Mound 27 (est)", "platform", 880, -110, 40, 40, 3.5]];
for (const [name, kind, e, n, w, d, h, rot, extra] of MD) MOUNDS.push({ name, kind, x: e, z: -n, w, d, h, rot: rot || 0, ...(extra || {}) });
// Monks Mound (Mound 38): 291 m N-S with the ramp, 236 m E-W, 30 m high; its axis N 6° E. The summit (terraces 3-4) is the origin.
// The first terrace, ~10.7 m high, spreads south; a ramp runs down from it a little east of centre. Terrace 2, the lobe on the
// west, may be slumping from about 1200 (Collins & Chalfant 1993), so it is left off for 1100.
const MONKS = { name: "Monks Mound", kind: "parts", x: 0, z: 0, w: 236, d: 300, h: 29.5, rot: -6, bare: false,
  parts: [(lx, lz) => platform(lx, lz, 236, 210, 29.5, 8, 2.0),
    (lx, lz) => platform(lx, lz - 110, 151, 120, 10.7, 6, 1.35),
    (lx, lz) => { const e = Math.abs(lx - 19) - 7; if (e > 4 || lz < 140) return 0; return 10.7 * clampN((190 - lz) / 38, 0, 1) * (e > 0 ? 1 - e / 4 : 1); }] };
MOUNDS.push(MONKS);
// The East St. Louis group: 45-50 mounds round a levelled plaza, two of them large pyramids, 7.8 km west and 2.1 km south of Monks
// Mound (38.642 N, 90.152 W). Their individual positions are under the modern city: here they are illustrative.
const [ESX, ESZ] = LL(38.642, -90.152);
PLAZAS.push([ESX, ESZ, 160, 95, 0.3]);
MOUNDS.push({ name: "East St. Louis, the great platform mound", kind: "platform", x: ESX - 230, z: ESZ - 30, w: 90, d: 72, h: 9 },
  { name: "East St. Louis, the second platform mound", kind: "platform", x: ESX + 225, z: ESZ + 40, w: 72, d: 60, h: 7 });
{ const r = seeded(4242); for (let k = 0, n = 0; k < 400 && n < 42; k++) { const a = r() * 6.283, d = 230 + r() * 520, x = ESX + Math.cos(a) * d * 1.3, z = ESZ + Math.sin(a) * d * 0.8;
    if (MOUNDS.some(m => Math.hypot(m.x - x, m.z - z) < Math.max(m.w, m.d) / 2 + 30) || Math.abs(x - (ESX + 260)) < 90 && Math.abs(z - (ESZ - 230)) < 70) continue;
    const cone_ = r() < 0.35, s = 18 + r() * 30; MOUNDS.push({ name: "East St. Louis, a mound", kind: cone_ ? "cone" : "platform", x, z, w: s, d: s * (0.8 + r() * 0.4), h: 1.5 + r() * 3.5, rot: -5, est: true }); n++; } }
// The St. Louis group: at least 25-27 mounds on the river terrace, ~27 m above the river. Big Mound (Peale's no. 27): an oval
// ridge-top mound 97.2 x 48.2 m, 10.4 m high, with a terrace ~24 m long on its east side, at N. Broadway and Mound St.
const [BMX, BMZ] = LL(38.64298, -90.18630);
MOUNDS.push({ name: "Big Mound, St. Louis", kind: "ridge", x: BMX, z: BMZ, w: 97.2, d: 48.2, h: 10.4 },
  { name: "Big Mound's east terrace", kind: "platform", x: BMX + 50, z: BMZ, w: 30, d: 26, h: 5 });
const SLX = BMX - 250, SLZ = BMZ + 420; PLAZAS.push([SLX, SLZ, 110, 150, baseH(BMX - 250, BMZ + 420)]);
{ const r = seeded(777); for (let k = 0, n = 0; k < 300 && n < 24; k++) { const side = (r() * 4) | 0, t = r() * 2 - 1, x = SLX + (side === 0 ? -150 : side === 1 ? 150 : t * 140), z = SLZ + (side === 2 ? -200 : side === 3 ? 200 : t * 190);
    if (MOUNDS.some(m => Math.hypot(m.x - x, m.z - z) < Math.max(m.w, m.d) / 2 + 28)) continue; const s = 20 + r() * 26;
    MOUNDS.push({ name: "St. Louis, a mound", kind: r() < 0.4 ? "cone" : "platform", x, z, w: s, d: s * (0.8 + r() * 0.4), h: 1.5 + r() * 4, rot: 0, est: true }); n++; } }
// The Emerald Acropolis: twelve mounds on its levelled ridge: Mound 12 (about 91 m across, some 6 m above the ridge, with a
// lower terrace on its north-west), and two rows of small round flat-topped mounds along the ridge's edges.
const emW = (a, b) => [EMX + a * EMU[0] - b * EMU[1], EMZ + a * EMU[1] + b * EMU[0]];
{ const [x, z] = emW(-130, 0); MOUNDS.push({ name: "Emerald Mound (Mound 12)", kind: "platform", x, z, w: 91, d: 91, h: 6, rot: -53 });
  const [tx, tz] = emW(-150, -55); MOUNDS.push({ name: "Emerald Mound's lower terrace", kind: "platform", x: tx, z: tz, w: 40, d: 30, h: 3, rot: -53 });
  for (let k = 0; k < 11; k++) { const row = k % 2 ? 1 : -1, a = -40 + Math.floor(k / 2) * 52, [mx, mz] = emW(a, row * 52); MOUNDS.push({ name: "Emerald, a small round mound", kind: "platform", x: mx, z: mz, w: 18, d: 18, h: 1.8, round: 9, rot: -53 }); } }
MOUNDS.forEach(indexMound);
for (const m of MOUNDS) moundMesh(m);

// ---------- what stood on the mounds, and the other works of the centre ----------
const toW = (m, lx, lz) => { const c = Math.cos(m.r), s = Math.sin(m.r); return [m.x + lx * c + lz * s, m.z - lx * s + lz * c]; };
const CORE = { walls: [], roofs: [], fences: [], posts: [], cedar: [], cones: [], steps: [], plaster: [] };
function stairs(m, lx, lz0, lz1, width) { const n = Math.ceil(Math.abs(lz1 - lz0) / 0.42);   // log steps up a mound face, each lying on the slope
  for (let k = 0; k <= n; k++) { const lz = lz0 + (lz1 - lz0) * k / n, [x, z] = toW(m, lx, lz); CORE.steps.push([x, groundH(x, z) - 0.12, z, width, 0.3, 0.38, m.r]); } }
function compound(m, lx, lz, hx, hz, gateSide = 1) { const g = m.base + m.h, P = [[-hx, -hz], [hx, -hz], [hx, hz], [5, hz]], Q = [[-5, hz], [-hx, hz], [-hx, -hz]];
  const tw = q => q.map(([a, b]) => toW(m, lx + a, lz + b * gateSide)); addFence(CORE, tw(P), 2.6, () => g); addFence(CORE, tw(Q), 2.6, () => g); }
// Monks Mound's summit building: ~31.7 x 14.6 m (104 x 48 ft), its roof perhaps 12 m high, a fenced courtyard and a great post in
// front (Reed's excavations, 1971). Its orientation was not reported: here its long side faces south, along the mound's axis.
{ const m = MONKS, top = m.base + 29.5, [bx, bz] = toW(m, 0, -22);
  CORE.walls.push([bx, top - 0.3, bz, 31.7, 3.6, 14.6, m.r]); CORE.roofs.push([bx, top + 3.3, bz, 33.5, 8.7, 16.4, m.r]);
  const [px, pz] = toW(m, 0, 22); CORE.cedar.push([px, top - 1, pz, 0.9, 16, 0.9, 0]);
  compound(m, 0, -5, 30, 33, 1);
  stairs(m, 19, 189, 152, 6);           // the ramp's log steps (impressions found in 1971)
  stairs(m, 0, 84, 43, 5); }            // up the upper face: a reconstruction, as in the mural
// a building, often walled, on each platform mound with room for one (the mural shows them so)
for (const m of MOUNDS) { if (m.kind !== "platform" || m.h < 2.5 || m.name.includes("upper") || m.name.includes("terrace")) continue;
  const run = m.h * (m.run ?? RUN), tw_ = m.w - 2 * run, td = m.d - 2 * run; if (tw_ < 8 || td < 8) continue;
  const bw = clampN(tw_ * 0.45, 5, 20), bd = clampN(td * 0.32, 4, 11), g = m.base + m.h, [bx, bz] = toW(m, 0, -td * 0.12);
  CORE.walls.push([bx, g - 0.3, bz, bw, 2.6, bd, m.r]); CORE.roofs.push([bx, g + 2.3, bz, bw + 1.2, clampN(bw * 0.42, 3, 8), bd + 1.2, m.r]);
  if (m.h >= 4 && tw_ > 20 && td > 16) compound(m, 0, 0, tw_ / 2 - 2, td / 2 - 2, 1); }
{ const m = MOUNDS.find(q => q.name.startsWith("Mound 60")); stairs(m, 0, -28, -12, 3); }   // Fox Mound's stair, from the plaza side
// Woodhenge (III): 48 red cedar posts in a circle 125 m across, 7.5° apart, ~6 m tall, and a centre post 1.7 m east of centre.
// About 1.1 km west of Monks Mound (38.6599 N, 90.0750 W). Whether this circle still stood in 1100 is uncertain.
const [WHX, WHZ] = LL(38.65992, -90.07503);
for (let k = 0; k < 48; k++) { const a = k * 7.5 * Math.PI / 180, x = WHX + 62.5 * Math.sin(a), z = WHZ - 62.5 * Math.cos(a); CORE.cedar.push([x, groundH(x, z) - 0.3, z, 0.7, 6.3, 0.7, 0]); }
CORE.cedar.push([WHX + 1.7, groundH(WHX + 1.7, WHZ) - 0.3, WHZ, 0.7, 6.3, 0.7, 0]);
// a marker post on the Grand Plaza, as in the mural
CORE.cedar.push([-60, 0.1, 430, 0.6, 14, 0.6, 0]);
// East St. Louis: the walled compound of small storage or ritual huts (as many as 100), which burned together about 1160
{ const cx = ESX + 260, cz = ESZ - 230, hx = 70, hz = 45, g = baseH(cx, cz);
  addFence(CORE, [[cx - hx, cz - hz], [cx + hx, cz - hz], [cx + hx, cz + hz], [cx + 5, cz + hz]], 3, () => g); addFence(CORE, [[cx - 5, cz + hz], [cx - hx, cz + hz], [cx - hx, cz - hz]], 3, () => g);
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { const x = cx - hx + 9 + i * 13.6, z = cz - hz + 7 + j * 8.4; addHouse(CORE, x, z, 2.4, 3, 1.4, 1.8, -0.09, g); } }
// the Emerald Acropolis: shrine houses on the ridge, set to the lunar axis (up to ~100 at a time; ~140 found in all)
{ const r = seeded(53); for (let k = 0; k < 90; k++) { const a = -260 + r() * 520, b = (r() - 0.5) * 120, [x, z] = emW(a, b); if (onMound(x, z)) continue;
    addHouse(CORE, x, z, 3 + r() * 1.5, 4 + r() * 2, 1.7, 2.8 + r(), -EMA + Math.PI / 2, groundH(x, z)); } }
const coreGroup = new THREE.Group(); buildSet(CORE, coreGroup); scene.add(coreGroup);
if (CORE.steps.length) coreGroup.add(instances(WALL_G, logM, CORE.steps));

// ---------- the settled land: where houses stand thickly ----------
// Cahokia at about 1100: estimates of 10,000-15,000 people in the Lohmann phase (1050-1100), fewer after; houses were rectangular,
// built with wall trenches, walls of poles and woven mats, steep thatched roofs; most 11 m² or more, some much bigger.
const SITES = [{ x: -150, z: 150, rx: 2300, rz: 1800, dens: 0.2 }, { x: 200, z: -1100, rx: 900, rz: 500, dens: 0.14 },
  { x: ESX, z: ESZ, rx: 950, rz: 700, dens: 0.18 }, { x: SLX, z: SLZ - 200, rx: 700, rz: 650, dens: 0.14 }, { x: EMX, z: EMZ, rx: 600, rz: 450, dens: 0.07 }];
const KEEP_CLEAR = [[WHX, WHZ, 72], [ESX + 260, ESZ - 230, 90]];
// a footpath toward Emerald, along the line of the avenue Pauketat proposes; its real course is not established
const AVENUE = lineM([[900, 0], [3300, 350], [5600, 700], [7400, 1000], [10500, 1500], [15000, 2200], [19500, 2900], emW(-330, 0)]);

// ---------- places to find ----------
const PL = (name, short, hint, x, z, r, at, look, text) => ({ name, short, hint, x, z, r, at, look, text });
const [CKX, CKZ] = LL(38.6648, -90.064), [HSX, HSZ] = (() => { let best = null, bd = 1e9; for (const [x, z] of HORSESHOE.P) { const d = Math.hypot(x, z); if (d < bd) { bd = d; best = [x, z]; } } return best; })();
const [BLX, BLZ] = LL(38.655, -89.993), [MRX, MRZ] = LL(38.637, -90.170);
const PLACES = [
  PL("The summit of Monks Mound", "Monks Mound", "the top of the great mound", 0, 0, 60, [0, 40], [0, 600],
    "The largest earthwork in the Americas north of Mexico: 291 m north to south with its ramp, 236 m east to west, 30 m high, over 600,000 m³ of earth carried up in baskets, built in stages from about 900-950 to 1100. On the summit stood a building about 32 × 15 m with a roof perhaps 12 m high, a fenced courtyard, and a great post in front (excavated 1971). The mound's axis runs N 6° E, close to the city's grid."),
  PL("Monks Mound's first terrace and ramp", "First terrace", "a broad terrace partway up", 0, 120, 55, [19, 200], [0, 0],
    "The broad lower terrace on the south side, about 10.7 m up. A ramp ran down from its south edge toward the Grand Plaza, a little east of centre; excavations found what may be the impressions of log steps. The stair up the upper face is a reconstruction, as the museum mural shows it."),
  PL("The Grand Plaza", "Grand Plaza", "a great open square", -38, 420, 140, [-38, 560], [0, 0],
    "About 19-20 hectares, some 490 by 270 m: levelled by hand, the natural ridges and swales cut down and filled with carried earth (a quarter to a third of it alone took more than 10,000 person-days). Monks Mound closes the north side; Mounds 48 and 57 the west; 50, 51, 54 and 55 the east; the Twin Mounds the south; Mounds 49 and 56 stand inside it. Chunkey (rolling a stone disc and throwing poles after it) was played across the Mississippian world and chunkey stones are common here; play on this plaza is inferred, as the mural shows."),
  PL("The Twin Mounds: Fox and Round Top", "Twin Mounds", "two tall mounds side by side", -150, 680, 60, [-88, 675], [0, 0],
    "Mound 60 (Fox), a platform 49 × 38 m and 12.3 m high, and Mound 59 (Round Top), a cone 12.1 m high, close the south end of the Grand Plaza; they may have shared a platform. The museum mural looks north to Monks Mound from much this point."),
  PL("Mound 48", "Mound 48", "a big square mound west of the plaza", -305, 289, 60, [-230, 289], [-305, 289],
    "A square platform 112 × 111 m and 7.5 m high, set to the cardinal directions, on the west side of the Grand Plaza (Lohmann phase)."),
  PL("Mound 72", "Mound 72", "a low ridge mound to the south", -143, 1038, 35, [-143, 1000], [-143, 1038],
    "A low ridge-top mound, 43 × 22 m and 1.8 m high, its long axis about 30° off east-west. Under it, about 1000-1050, some 270 people were buried: among them two laid with a falcon-shaped array of some 20,000 shell beads, and groups of young women who were sacrificed. A tall post had stood here before, about 950."),
  PL("Rattlesnake Mound and its causeway", "Rattlesnake Mound", "a long mound far to the south", -116, 1810, 80, [-116, 1730], [-116, 1810],
    "Mound 66, at the south end of Cahokia's main axis: a ridge-top mound 132 × 51 m and 7.4 m high, reached by the Rattlesnake Causeway, an embankment about 18 m wide running some 800 m south through the wet ground from the plazas."),
  PL("Woodhenge", "Woodhenge", "a ring of tall posts to the west", WHX, WHZ, 70, [WHX + 1.7, WHZ], [0, 0],
    "A circle of 48 red cedar posts 125 m across, with an observing post 1.7 m east of centre (Woodhenge III, excavated by Warren Wittry). From that post, the equinox sun rises over the front of Monks Mound; other posts mark the solstices. Several circles stood here between about 900-1000 and 1100; whether this one still stood in 1100 is not certain."),
  PL("The West Plaza and Merrell Mound", "West Plaza", "a second plaza west of the great mound", -420, 0, 110, [-395, 120], [-395, 0],
    "A plaza of about 9 ha west of Monks Mound, bounded on the east by Mounds 39, 40, 41 and 77. To its west, Mound 42 (Merrell), 79 × 122 m and about 8 m high, with a small upper platform on its south-west corner."),
  PL("Powell Mound", "Powell Mound", "a great mound at the city's western edge", -2430, -80, 80, [-2430, 0], [-2430, -80],
    "Mound 86, the great ridge-top mound at Cahokia's western edge: about 91 × 49 m and 9-14 m high. It was levelled in 1930-31."),
  PL("The East Plaza", "East Plaza", "a plaza east of the great mound", 340, -20, 100, [340, 90], [340, -20],
    "A plaza of about 5.8 ha east of Monks Mound: Mounds 36 and 37 on its west side, 31, 32 and 34 on its east. At Mound 34 archaeologists found a copper workshop, where sheets of copper were worked into ornaments. (Mound positions here approximate.)"),
  PL("The North Plaza", "North Plaza", "a low plaza north of the great mound", 40, -450, 100, [40, -330], [40, -450],
    "A plaza north of Monks Mound with Mounds 13-16 around it: low ground, probably flooded in wet seasons. (Positions approximate.)"),
  PL("Cahokia Creek", "Cahokia Creek", "a creek north of the great mound", CKX, CKZ, 60, [CKX, CKZ + 40], [CKX - 300, CKZ],
    "Cahokia Creek ran just north of Monks Mound on its way to the Mississippi: the city's way by dugout canoe to the river and the whole continent beyond. Canteen Creek joins it between Monks Mound and the Kunnemann group. (Their courses in 1100 are approximate.)"),
  PL("The Kunnemann group", "Kunnemann", "mounds north across the creek", 330, -1200, 110, [330, -1100], [330, -1200],
    "North of Monks Mound across Canteen Creek: Kunnemann Mound and its group (Mounds 5-11). (Positions approximate.)"),
  PL("The Ramey Plaza", "Ramey Plaza", "a plaza far east of the centre", 880, -20, 80, [880, 60], [880, -20],
    "Mounds 25-27 around the Ramey Plaza, east of the centre. (Positions approximate.)"),
  PL("Horseshoe Lake", "Horseshoe Lake", "a lake to the north-west", HSX, HSZ, 260, [HSX * 0.93, HSZ * 0.93], [HSX * 1.3, HSZ * 1.3],
    "An oxbow, a loop the Mississippi cut off long before. Its mud records Cahokia's whole story: cores show the lake was here and rich with life from 600 to 1400 CE, and the fecal stanols in them track the rise and fall of the city's population (White et al. 2019). Its outline in 1100 is approximate."),
  PL("East St. Louis", "East St. Louis", "a mound centre far to the west", ESX, ESZ, 350, [ESX, ESZ + 150], [ESX, ESZ],
    "Cahokia's second centre, 8 km west beside the Mississippi: 45-50 mounds, two of them large pyramids, round a levelled plaza, with perhaps a few thousand people. Its mounds now lie under the modern city, so their positions here are illustrative. There is no archaeological evidence of a marketplace."),
  PL("The walled compound at East St. Louis", "Hut compound", "a walled enclosure near the western centre", ESX + 260, ESZ - 230, 80, [ESX + 260, ESZ - 150], [ESX + 260, ESZ - 230],
    "A walled compound of small buildings, as many as 100: storage or ritual huts, some holding maize. About 1160 they all burned in a single fire, perhaps a deliberate, ritual burning. Here they still stand."),
  PL("The Mississippi", "Mississippi", "the great river to the west", MRX, MRZ, 300, [MRX + 520, MRZ], [MRX - 500, MRZ],
    "The Mississippi, about 1 km wide. In dugout canoes Cahokia's people travelled it and its tributaries to the Gulf, the Great Lakes and the Plains. Its course in 1100 is not known exactly; it is drawn on today's line."),
  PL("The St. Louis mound group", "St. Louis mounds", "mounds on the far bank", BMX, BMZ, 260, [BMX + 100, BMZ + 80], [BMX, BMZ],
    "At least 25-27 mounds on the river terrace of today's north St. Louis, some 27 m above the river: 'Mound City'. The largest, Big Mound, an oval ridge-top mound 97 × 48 m and 10.4 m high with a terrace on its east side, was dug away in 1869. The other mounds' positions here are illustrative."),
  PL("The bluffs", "The bluffs", "the high ground to the east", BLX, BLZ, 180, [BLX + 300, BLZ], [0, 0],
    "The edge of the American Bottom: bluffs some 36-40 m above the floodplain. From the top the whole bottomland lies below, Monks Mound 5-6 km to the west. The wooded slopes gave nuts, game and timber; beyond lies upland prairie."),
  PL("The Emerald Acropolis", "Emerald", "a sacred ridge far to the east", EMX, EMZ, 320, emW(-300, 20), [EMX, EMZ],
    "A ceremonial centre 24 km east of Cahokia, on a natural ridge levelled and built up so the whole site lines up with the moon's northernmost rising (about 53°, every 18.6 years). Twelve mounds: Mound 12, about 91 m across and some 6 m high on the ridge, and two rows of small round flat-topped mounds. More than 140 pole-and-thatch buildings, mostly 1020-1120; many were shrine houses with yellow plastered floors. Pauketat proposes an avenue about 24 km long linking it to Cahokia; the path you may have followed is a guess at its line.")];
for (const m of MOUNDS) m.info = m.est ? `${m.name}: its position here is illustrative.` : `${m.name}: ${m.kind === "cone" ? "a conical mound" : m.kind === "ridge" ? "a ridge-top mound" : m.kind === "parts" ? "the great platform mound" : "a platform mound"}, about ${Math.round(m.w)} × ${Math.round(m.d)} m and ${m.h.toFixed(1)} m high.${m.name.includes("est") ? " (Position and size approximate.)" : ""}`;
const START = { x: -88, z: 672, yaw: 0 };
const FIRES = [];

// ---------- people ----------
// Simple figures walking about the plazas and neighbourhoods; a chunkey game in a yard on the Grand Plaza, as the mural shows
// (the game is well attested across the Mississippian world; its being played on this plaza is inferred); canoes on the water.
const SKIN = [0x8d5a3b, 0x9a6646, 0x7a4a2e, 0xa36e4a, 0x84553a], CLOTH = [0xcdb48a, 0xb89a6a, 0x8a6a48, 0xd8c8a0, 0x9a4a2a, 0x6a5040, 0xe0d2b0, 0x7a6a50];
const CHUNKEY = [-70, 372, 12, 44];                                    // the yard: x, z, half-width, half-length
const NP = IS_HEADSET ? 140 : 280, PEOPLE = [];
const ZONES = [[-38, 420, 180, 220, 0.34], [0, 0, 50, 40, 0.05], [-200, 150, 900, 700, 0.35], [ESX, ESZ, 400, 300, 0.12], [EMX, EMZ, 250, 150, 0.06], [-395, 0, 80, 140, 0.08]];
{ const r = seeded(99), tot = ZONES.reduce((s, z) => s + z[4], 0), pick = () => { let a = r() * tot; for (const Z of ZONES) { a -= Z[4]; if (a <= 0) return Z; } return ZONES[0]; };
  for (let k = 0; k < NP; k++) { const Z = pick(), p = { Z, x: Z[0] + (r() - 0.5) * 2 * Z[2], z: Z[1] + (r() - 0.5) * 2 * Z[3], tx: 0, tz: 0, v: 0.9 + r() * 0.6, wait: r() * 8, h: r() * 6, s: 0.92 + r() * 0.14, ph: r() * 6, r };
    p.tx = p.x; p.tz = p.z; PEOPLE.push(p); } }
// spectators along the chunkey yard, standing and sitting
const WATCH = []; { const r = seeded(31); for (let k = 0; k < (IS_HEADSET ? 14 : 26); k++) { const sd = r() < 0.5 ? -1 : 1, z = CHUNKEY[1] + (r() - 0.5) * 2 * CHUNKEY[3], x = CHUNKEY[0] + sd * (CHUNKEY[2] + 2 + r() * 3);
  WATCH.push({ x, z, h: sd > 0 ? -Math.PI / 2 : Math.PI / 2, sit: r() < 0.4, s: 0.92 + r() * 0.14 }); } }
const NALL = NP + WATCH.length + 2;
const torsoG = new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8).translate(0, 1.07, 0), headG = new THREE.SphereGeometry(0.12, 10, 8).translate(0, 1.68, 0), legG = new THREE.BoxGeometry(0.11, 0.62, 0.13).translate(0, -0.31, 0);
const torsos = new THREE.InstancedMesh(torsoG, M(0xffffff, { roughness: 0.95 }), NALL), heads = new THREE.InstancedMesh(headG, M(0xffffff), NALL), legsL = new THREE.InstancedMesh(legG, M(0xffffff), NALL), legsR = new THREE.InstancedMesh(legG, M(0xffffff), NALL);
{ const c = new THREE.Color(); for (let i = 0; i < NALL; i++) { c.setHex(CLOTH[(hash(i, 1) * CLOTH.length) | 0]); torsos.setColorAt(i, c); c.setHex(SKIN[(hash(i, 2) * SKIN.length) | 0]); heads.setColorAt(i, c); legsL.setColorAt(i, c); legsR.setColorAt(i, c); } }
for (const m of [torsos, heads, legsL, legsR]) { m.frustumCulled = false; scene.add(m); }
const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16).rotateZ(Math.PI / 2), M(0x8a8478)); scene.add(stone);
const poles = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6).rotateX(Math.PI / 2), M(0x8a6a3a)); scene.add(m); return m; });
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = V3(1, 1, 1), _m = new THREE.Matrix4(), _p = V3(0, 0, 0);
function placePerson(i, x, z, h, s, walk, sit) { const g = groundH(x, z) - (sit ? 0.55 * s : 0); _s.set(s, s, s);
  _e.set(0, h, 0, "YXZ"); _q.setFromEuler(_e); _p.set(x, g, z); _m.compose(_p, _q, _s); torsos.setMatrixAt(i, _m); heads.setMatrixAt(i, _m);
  for (const [im, sd] of [[legsL, 1], [legsR, -1]]) { _e.set(sit ? -1.5 : sd * walk, h, 0, "YXZ"); _q.setFromEuler(_e); _p.set(x + Math.cos(h) * 0.1 * sd * s, g + 0.62 * s, z - Math.sin(h) * 0.1 * sd * s); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); } }
// dugout canoes: hollowed logs some 6.5 m long, drifting along the creek and the river
const CANOES = []; { const r = seeded(808); for (let k = 0; k < 10; k++) CANOES.push({ line: k < 4 ? CAHOKIA_CK : MISSISSIPPI, s: r() * 4000 + (k < 4 ? 1800 : 3400), v: (k < 4 ? 0.9 : 1.4) * (r() < 0.5 ? 1 : -1), off: k < 4 ? (r() - 0.5) * 8 : (r() - 0.5) * 500 }); }
const canoeIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.35, 6.5, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), M(0x5a3e26, { side: THREE.DoubleSide }), CANOES.length);
canoeIM.frustumCulled = false; scene.add(canoeIM);
let chT = 0;
function animatePeople(t, dt) {
  const near = p => Math.abs(p.x - P_.x) < 1500 && Math.abs(p.z - P_.z) < 1500;
  PEOPLE.forEach((p, i) => { if (!near(p)) { placePerson(i, p.x, p.z, p.h, 0.0001, 0, false); return; }
    let walk = 0; if (p.wait > 0) p.wait -= dt;
    else { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { p.wait = 2 + p.r() * 14; const Z = p.Z; p.tx = Z[0] + (p.r() - 0.5) * 2 * Z[2]; p.tz = Z[1] + (p.r() - 0.5) * 2 * Z[3];
        if (Math.hypot(p.tx - p.x, p.tz - p.z) > 160) { p.tx = p.x + (p.tx - p.x) * 0.3; p.tz = p.z + (p.tz - p.z) * 0.3; } }
      else { p.x += dx / d * p.v * dt; p.z += dz / d * p.v * dt; p.h = Math.atan2(dx, dz); walk = 0.45 * Math.sin(t * 6 * p.v + p.ph); } }
    placePerson(i, p.x, p.z, p.h, p.s, walk, false); });
  WATCH.forEach((w, k) => placePerson(NP + k, w.x, w.z, w.h, w.s, 0, w.sit));
  // chunkey: a player bowls the stone down the yard; both run after it and throw their poles to land nearest where it stops
  chT = (chT + dt) % 24; const dir = Math.floor(t / 24) % 2 ? -1 : 1, L = CHUNKEY[3] - 4, z0 = CHUNKEY[1] - dir * L, ph = chT;
  const tt = clampN(ph - 1.5, 0, 11.1), sz = z0 + dir * (8 * tt - 0.36 * tt * tt), szEnd = z0 + dir * 44.4, visible = near({ x: CHUNKEY[0], z: CHUNKEY[1] });   // it rolls 44 m and stops
  const stopped = ph > 11; stone.position.set(CHUNKEY[0], groundH(CHUNKEY[0], sz) + 0.1, sz); if (!stopped) stone.rotation.x = -dir * ph * 25; stone.visible = visible;
  for (const q of [0, 1]) { const px = CHUNKEY[0] + (q ? 2.2 : -2.2), run = ph < 1.5 ? 0 : Math.min(40, (ph - 1.5) * 6.2), pz = z0 + dir * run, wk = ph > 1.5 && run < 40 ? 0.8 * Math.sin(t * 13 + q) : 0;
    placePerson(NP + WATCH.length + q, px, pz, dir > 0 ? 0 : Math.PI, 1, wk, false);
    const thrown = ph > 4 + q * 0.6, f = clampN((ph - 4 - q * 0.6) / 1.4, 0, 1), tz = szEnd + (q ? 1.1 : -0.8), lz = thrown ? lerpN(pz, tz, f) : pz, ly = thrown ? 1.4 + Math.sin(f * Math.PI) * 2.5 - f * 1.3 : 1.3;
    poles[q].position.set(px + (q ? -0.4 : 0.4) * f, groundH(px, lz) + ly, lz); poles[q].rotation.set(thrown ? 0.3 - f * 0.25 : -0.1, 0, 0); poles[q].visible = visible; }
  for (const m of [torsos, heads, legsL, legsR]) m.instanceMatrix.needsUpdate = true;
  CANOES.forEach((c, i) => { c.s += c.v * dt; const L2 = c.line, n = L2.S.length, u = c.s / 400, seg = L2.S[((Math.floor(u) % n) + n) % n], f = ((u % 1) + 1) % 1;
    const x = seg[0] + (seg[2] - seg[0]) * f, z = seg[1] + (seg[3] - seg[1]) * f;
    O3.position.set(x + c.off, WATER + 0.12, z); O3.rotation.set(0, Math.atan2(seg[2] - seg[0], seg[3] - seg[1]), 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); canoeIM.setMatrixAt(i, O3.matrix); });
  canoeIM.instanceMatrix.needsUpdate = true; }

// ---------- you: walking, running, travelling, discovering ----------
const SPEEDS = [[1.4, "walking"], [3.5, "jogging"], [12, "fast"], [40, "very fast"], [120, "flying over the land"]];
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false, started = false, speedI = 0, flying = false;
const P_ = { x: START.x, z: START.z, y: 0 }; yaw = START.yaw; P_.y = groundAt(P_.x, P_.z);
const intro = document.getElementById("intro");
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(28,22,14,.74);color:#f4ead8;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:600px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(28,22,14,.84);color:#f4ead8;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:760px;display:none";
const GUIDE = document.createElement("div"); GUIDE.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(28,22,14,.74);color:#f4ead8;padding:10px 12px;border-radius:10px;font:13px/1.45 -apple-system,Helvetica,sans-serif;max-height:calc(100vh - 290px);overflow-y:auto;min-width:220px";
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 240; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:10px;border:2px solid rgba(201,162,39,.7);width:240px;height:240px";
document.body.append(HUD, MSG, GUIDE, MAPC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone");
  say("You stand on the Grand Plaza, about 1100 CE, at the height of Cahokia. Ahead, north, is Monks Mound. Walk anywhere: places you reach are added to your journal (top right), and you can travel back to any of them. − / = (or scroll) changes your pace.", 16); }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (e.code === "Equal") speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (e.code === "Minus") speedI = Math.max(0, speedI - 1);
  if (e.code === "KeyF") flying = !flying; if (e.code === "KeyE") interact(); if (e.code === "KeyM") MAPC.style.display = MAPC.style.display === "none" ? "" : "none"; });
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("wheel", e => { if (renderer.xr.isPresenting) return; speedI = clampN(speedI + (e.deltaY < 0 ? 1 : -1), 0, SPEEDS.length - 1); });
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
function groundAt(x, z) { const g = groundH(x, z); return g < WATER - 1.3 ? WATER - 1.3 : g; }   // in deep water you swim, head above the surface
// the journal: every place is found by walking to it; then you can travel back from the list
const FOUND = new Set();
function discover(p) { if (FOUND.has(p)) return; FOUND.add(p); say(`<b>${p.name}</b> · ${p.text}`, 22); drawGuide(); }
function travelTo(p) { P_.x = p.at[0]; P_.z = p.at[1]; P_.y = groundAt(P_.x, P_.z); if (p.look) { const dx = p.look[0] - P_.x, dz = p.look[1] - P_.z; yaw = Math.atan2(-dx, -dz); if (renderer.xr.isPresenting) vrTurn = yaw; }
  flying = false; updateGround(P_.x, P_.z, 99); say(`<b>${p.name}</b> · ${p.text}`, 18); }
function drawGuide() { GUIDE.innerHTML = `<b>Journal</b> · ${FOUND.size} of ${PLACES.length} places found<br><span style="color:#c8b898;font-size:12px">click a found place to go back to it</span>` +
  PLACES.map((p, i) => FOUND.has(p) ? `<div data-i="${i}" style="cursor:pointer;padding:2px 4px;border-radius:5px">✦ ${p.name}</div>` : `<div style="color:#8a7a60;padding:2px 4px">· ${p.hint}</div>`).join(""); }
GUIDE.addEventListener("click", e => { const d = e.target.closest("[data-i]"); if (!d) return; e.stopPropagation(); start(); travelTo(PLACES[+d.dataset.i]); });
drawGuide();
function interact() { if (!started) return start(); let best = null, bd = 1e9;
  for (const p of PLACES) { const d = Math.hypot(p.x - P_.x, p.z - P_.z); if (d < p.r * 1.5 && d < bd) { bd = d; best = p; } }
  if (best) { discover(best); say(`<b>${best.name}</b> · ${best.text}`, 22); return; }
  let mb = null, md = 1e9; for (const m of MOUNDS) { const d = Math.hypot(m.x - P_.x, m.z - P_.z) - Math.max(m.w, m.d) / 2; if (d < 25 && d < md) { md = d; mb = m; } }
  if (mb) { say(mb.info, 12); return; }
  say("Nothing to read here. Places you find go into your journal; the map (bottom right, M to hide) shows where you are.", 6); }

// ---------- the map: drawn once for 48 km around Monks Mound, then a window of it follows you ----------
const MAP_R = 24000, MAP_N = IS_HEADSET ? 240 : 320, MAPBASE = document.createElement("canvas"); MAPBASE.width = MAPBASE.height = MAP_N;
{ const g = MAPBASE.getContext("2d"), img = g.createImageData(MAP_N, MAP_N);
  for (let j = 0; j < MAP_N; j++) for (let i = 0; i < MAP_N; i++) { const x = (i / MAP_N * 2 - 1) * MAP_R, z = (j / MAP_N * 2 - 1) * MAP_R, h = baseH(x, z), k = 4 * (j * MAP_N + i);
    let r = 150, gr = 168, b = 108; if (h < WATER + 0.05) { r = 70; gr = 110; b = 130; } else if (h > 12) { const t = clampN((h - 12) / 50, 0, 1); r = 150 - 30 * t; gr = 160 - 30 * t; b = 100 - 20 * t; }
    if (forestAt(x, z, h) > 0.5) { r *= 0.75; gr *= 0.82; b *= 0.7; }
    img.data[k] = r; img.data[k + 1] = gr; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); g.fillStyle = "#6a4a2a";
  for (const m of MOUNDS) { const i = (m.x / MAP_R + 1) / 2 * MAP_N, j = (m.z / MAP_R + 1) / 2 * MAP_N, s = Math.max(1, Math.min(m.w, m.d) / (2 * MAP_R) * MAP_N); g.fillRect(i - s / 2, j - s / 2, s, s); } }
function drawMap(target, size, span) { const g = target.getContext("2d"), px = (P_.x / MAP_R + 1) / 2 * MAP_N, pz = (P_.z / MAP_R + 1) / 2 * MAP_N, sp = span / (2 * MAP_R) * MAP_N;
  g.fillStyle = "#2a2418"; g.fillRect(0, 0, size, size); g.imageSmoothingEnabled = true; g.drawImage(MAPBASE, px - sp / 2, pz - sp / 2, sp, sp, 0, 0, size, size);
  const k = size / span, to = (x, z) => [size / 2 + (x - P_.x) * k, size / 2 + (z - P_.z) * k];
  g.font = `600 ${Math.round(size / 22)}px -apple-system, Helvetica, sans-serif`; g.textAlign = "center";
  for (const p of PLACES) { const [u, v] = to(p.x, p.z); if (u < -40 || v < -20 || u > size + 40 || v > size + 20) continue;
    g.fillStyle = FOUND.has(p) ? "#ffe9a8" : "rgba(255,240,200,.45)"; g.beginPath(); g.arc(u, v, size / 80, 0, 6.283); g.fill(); if (FOUND.has(p)) { g.fillStyle = "#fff6dc"; g.fillText(p.short || p.name, u, v - size / 50); } }
  g.save(); g.translate(size / 2, size / 2); g.rotate(-yawNow()); g.fillStyle = "#ff5a3a"; g.beginPath(); g.moveTo(0, -size / 28); g.lineTo(size / 50, size / 50); g.lineTo(-size / 50, size / 50); g.closePath(); g.fill(); g.restore();
  g.fillStyle = "#f4ead8"; g.textAlign = "left"; g.fillText(`N ↑ · ${span >= 2000 ? span / 1000 + " km" : span + " m"} across`, 8, size - 8); }
const MAP_SPANS = [2000, 6000, 16000, 44000]; let mapSpanI = 1;
MAPC.addEventListener("click", e => { e.stopPropagation(); mapSpanI = (mapSpanI + 1) % MAP_SPANS.length; });
function yawNow() { const d = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(-d.x, -d.z); }

// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(line1, line2) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); g.fillStyle = "rgba(28,22,14,.8)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  const wrap = (txt, y, sz, col, maxLines) => { g.fillStyle = col; g.font = `${sz}px -apple-system, Helvetica, sans-serif`; const words = txt.replace(/<[^>]+>/g, "").split(" "); let ln = "", n = 0;
    for (const w of words) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += sz * 1.25; ln = ""; if (++n >= maxLines) return; } ln += w + " "; } g.fillText(ln, 26, y); };
  wrap(line1, 52, 32, "#ffe9a8", 2); if (line2) wrap(line2, 140, 27, "#f4ead8", 7); vrT.needsUpdate = true; }
// the map on your left wrist; X travels to the next place in your journal
const wristC = document.createElement("canvas"); wristC.width = wristC.height = 512; const wristT = new THREE.CanvasTexture(wristC); wristT.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: wristT, toneMapped: false, fog: false })); wrist.position.set(0, 0.05, 0.06); wrist.rotation.x = -1.0; wrist.visible = false;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
let travelI = -1;
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrTurn = yaw; vrPanel.visible = true; wrist.visible = true; vrDirty = true;
    s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; wrist.visible = false; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hour = 9.5, hudT = 0, mapT = 0, cullT = 0, loopErrs = 0;
const DAY_MIN = 40;                                         // real minutes for a whole day
updateGround(P_.x, P_.z, 99);
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started) hour = (hour + dt * 24 / (DAY_MIN * 60)) % 24;
  let mx = 0, my = 0, run = 1, up = 0;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) { const L = PLACES.filter(p => FOUND.has(p)); if (L.length) { travelI = (travelI + 1) % L.length; travelTo(L[travelI]); } }
        if (tap("L", gp, 5)) flying = !flying; }
      else { if (gp.buttons[0]?.value > 0.3) run = 3; if (tap("R", gp, 4)) interact(); if (tap("R", gp, 5)) speedI = (speedI + 1) % SPEEDS.length;
        if (flying) up = -ay; if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 3; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; if (flying) up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  const sp = SPEEDS[speedI][0] * run;
  if (mx || my) { P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt; }
  const g = groundAt(P_.x, P_.z);
  if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + Math.max(3.2, sp * 1.2) * dt) : Math.max(g, P_.y - Math.max(7, sp) * dt);
  rig.position.set(P_.x, P_.y, P_.z);
  updateGround(P_.x, P_.z); streamTiles(P_.x, P_.z);
  for (const p of PLACES) if (!FOUND.has(p) && Math.hypot(p.x - P_.x, p.z - P_.z) < p.r) discover(p);
  // sun, sky and light through the day
  const dayA = (hour - 6) / 12 * Math.PI, el = Math.sin(dayA), sunDir = V3(-Math.cos(dayA), Math.max(el, -0.3), 0.45).normalize();
  sun.position.copy(rig.position).addScaledVector(sunDir, 800); sun.target.position.copy(rig.position);
  const day = clampN(el * 3 + 0.3, 0, 1), dusk = clampN(1 - Math.abs(el) * 4, 0, 1) * (el > -0.15 ? 1 : 0);
  sun.intensity = 2.6 * clampN(el * 3, 0, 1); sun.color.setRGB(1, 0.9 - 0.3 * dusk, 0.78 - 0.45 * dusk); hemi.intensity = 0.15 + 1.0 * day;
  const upC = new THREE.Color(0.32, 0.52, 0.80).multiplyScalar(0.05 + 0.95 * day), hor = new THREE.Color(0.80, 0.85, 0.87).multiplyScalar(0.06 + 0.94 * day).lerp(new THREE.Color(0.95, 0.55, 0.30), dusk * 0.6);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); scene.fog.color.copy(hor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(sunDir, 45000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.05; sunDisc.material.color.setRGB(1, 0.95 - 0.35 * dusk, 0.85 - 0.5 * dusk);
  water.position.x = Math.round(P_.x / 1000) * 1000; water.position.z = Math.round(P_.z / 1000) * 1000;
  for (const f of FIRES) f.intensity = (1 - day) * 3 * (0.8 + 0.2 * Math.sin(t * 13 + f.position.x));
  animatePeople(t, dt);
  cullT -= dt; if (cullT <= 0) { cullT = 1; for (const m of MOUNDS) if (m.mesh) m.mesh.visible = m.h >= 9 || Math.hypot(m.x - P_.x, m.z - P_.z) < (IS_HEADSET ? 4500 : 8000); }   // small mounds far off are lost in the haze anyway
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.25; if (MAPC.style.display !== "none" && !vr) drawMap(MAPC, 240, MAP_SPANS[mapSpanI]); if (vr) { drawMap(wristC, 512, MAP_SPANS[mapSpanI]); wristT.needsUpdate = true; } }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    let nearP = null, nd = 1e9; for (const p of PLACES) { const d = Math.hypot(p.x - P_.x, p.z - P_.z); if (d < nd) { nd = d; nearP = p; } }
    const yw = yawNow(), dir = p => { const a = Math.atan2(p.x - P_.x, -(p.z - P_.z)), rel = a + yw, r = Math.atan2(Math.sin(rel), Math.cos(rel)), cmp = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
      return `${cmp}, ${Math.abs(r) < 0.4 ? "ahead" : Math.abs(r) > 2.6 ? "behind you" : r > 0 ? "to your right" : "to your left"}`; };
    const where = nearP ? (nd < nearP.r ? `at <b>${nearP.name}</b>` : `nearest: <b>${FOUND.has(nearP) ? nearP.name : nearP.hint}</b>, ${nd < 1000 ? Math.round(nd) + " m" : (nd / 1000).toFixed(1) + " km"} ${dir(nearP)}`) : "";
    HUD.innerHTML = `<b>Cahokia, about 1100 CE</b> · ${hh}:${String(mm).padStart(2, "0")} · ${flying ? "flying" : SPEEDS[speedI][1] + (run > 1 ? ", running" : "")} (${(sp * 3.6).toFixed(sp < 3 ? 1 : 0)} km/h) · height ${Math.round(P_.y - baseH(P_.x, P_.z))} m above the plain<br>${where}<br>
      <span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · − / = pace · F fly · E read · M map (click it to zoom) · journal: click a found place to go back</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(where.replace(/<[^>]+>/g, "") + ` · ${flying ? "flying" : SPEEDS[speedI][1]}`, msgText || "Left stick walk · right stick turn · trigger run · A read · B pace · X travel to a found place · Y fly"); vrDirty = false; } }
  renderer.render(scene, camera);
}

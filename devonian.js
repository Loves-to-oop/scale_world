// devonian.js -- a day in the Late Devonian, about 380 million years ago: a biologist with scuba gear, on the coasts, rivers and reefs
// of five real places of that time. Built into devonian.html by build.py; the world is generated without end (?seed=2 for another).
// It runs on the same engine as cambrian.js; the date, air, plants and animals follow the literature (see the notes by each).
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


// ---------- sky, sun, haze ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.5)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(50000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);

// ---------- the land and the sea ----------
// No plants anywhere on land: bare rock, sand and gravel, dry braided river washes (with nothing to hold banks, rivers spread
// in wide sheets), dunes, and dark microbial crusts where the ground stays damp. At the coast a broad, gently sloping tidal flat;
// offshore a shallow muddy shelf, deepening slowly. Sea level 0 is mean sea level; the tide moves it up and down.
// Near the start (the origin) the coast runs roughly north-south, land to the west, sea to the east.
// each place you can visit is its own stretch of coast: SG holds its settings (set when you arrive)
const SG = { ox: 0, oz: 0, wetBias: 0, carbonate: false, deep: 1, mud: [0.42, 0.40, 0.33], sand: [0.66, 0.60, 0.47], land: 1, stroma: false, reef: false };
function landMask(x, z) { const r = Math.hypot(x, z);
  return fbm(x / 9000 + 31 + SG.ox, z / 9000 - 17 + SG.oz, 4) - 0.5 + 0.22 * Math.tanh(-(x + 120 * Math.sin(z / 700)) / 2500) * Math.exp(-r / 30000) + 0.03 * (fbm(x / 900, z / 900 + 4, 3) - 0.5); }
// Environments on land (no plants, so they differ by water, rock and microbes, not vegetation): a moisture field across the
// region decides dry red sand seas and gravel plains, or humid lowlands darkened by microbial mats with wet hollows; braided
// river plains run through both; bedrock uplands rise inland; tidal flats with wrinkled mats and small microbial mounds edge the sea.
const wetness = (x, z) => fbm(x / 14000 + 120 + SG.ox, z / 14000 - 60 + SG.oz, 4) + SG.wetBias;
const washW = (x, z) => Math.abs(fbm(x / 2200 + 70, z / 2200 - 30, 3) - 0.5);
function baseH(x, z) { const c = landMask(x, z);
  if (c < 0) { const d = -c;                                                          // the sea: tidal flats, a shallow shelf, then deeper water
    let h = -lerpN(0, 3, sstepN(d, 0, 0.012)) - 27 * SG.deep * sstepN(d, 0.006, 0.09) - 90 * SG.deep * sstepN(d, 0.12, 0.3);
    h += (fbm(x / 120, z / 120 + 7, 3) - 0.5) * 1.2 * sstepN(d, 0.004, 0.03);         // a gently rolling muddy floor
    return h + 0.25 * Math.sin(x * 0.9 + Math.sin(z * 0.37) * 2) * sstepN(d, 0.0, 0.01) * (1 - sstepN(d, 0.02, 0.05));   // ripple marks in the shallows
  }
  const wet = wetness(x, z), dry = 1 - sstepN(wet, 0.38, 0.5);
  let h = 0.6 + 40 * sstepN(c, 0.0, 0.25) * (0.6 + 0.8 * fbm(x / 2500 + 9, z / 2500, 3)) + 140 * sstepN(c, 0.2, 0.5) * fbm(x / 6000, z / 6000 + 3, 4);
  h += Math.pow(1 - Math.abs(2 * fbm(x / 700 + 2, z / 700 - 5, 4) - 1), 4) * 22 * sstepN(c, 0.006, 0.06) + 6 * Math.pow(fbm(x / 140 + 9, z / 140, 3), 3) * sstepN(c, 0.004, 0.03);   // rocky ridges, knolls and outcrops
  h += (2.2 + 9 * dry) * Math.max(0, Math.sin((x * 0.8 + z * 0.6) / (18 + 30 * dry) + 3 * fbm(x / 300, z / 300, 2))) * Math.max(dry * sstepN(fbm(x / 2500 + 50, z / 2500, 3), 0.42, 0.55), sstepN(fbm(x / 1800 + 50, z / 1800, 3), 0.55, 0.7)) * sstepN(c, 0.01, 0.05);   // dune fields, big in the dry country
  if (wet > 0.58) h -= 1.4 * sstepN(fbm(x / 90 + 40, z / 90, 3), 0.55, 0.7) * sstepN(c, 0.01, 0.04);                                // wet hollows in the humid lowlands
  const w = washW(x, z), ww = 0.05 + 0.03 * (1 - dry);                              // braided river washes: wide, flat, shallow beds
  if (w < ww) h = lerpN(h, Math.min(h, 0.3 + 6 * sstepN(c, 0, 0.15)), sstepN(ww - w, 0, 0.02));
  return h * sstepN(c, 0, 0.004); }
function biomeAt(x, z) { const c = landMask(x, z), h = baseH(x, z);
  if (c < 0) { if (h > -0.3) return "tidal"; if (h < -50) return "deep"; if (h > -8) return "shoal"; return "delta"; }
  if (h < 1.6 && c < 0.01) return "tidal"; if (h > 45) return "upland"; if (washW(x, z) < 0.06 + 0.02 * (wetness(x, z) > 0.45)) return "river";
  const wet = wetness(x, z); return wet < 0.42 ? "desert" : wet > 0.53 ? "humid" : "plain"; }
const BIOMES = {
  tidal: ["Tidal flats", "Mud and sand flooded and drained twice a day. Microbial mats (cyanobacteria and other microbes) bind the surface into wrinkled skins and build small domes and mounds: microbial reefs and stromatolites were still common in the Cambrian. Animals had not yet come onto the flats; the first tracks appear about 20 million years later."],
  plain: ["Gravel and sand plain", "Bare, rolling ground of rock fragments and sand. With no roots there is no real soil, only rubble broken by heat, frost and water, and patches of dark microbial crust where moisture lingers."],
  desert: ["Dry sand sea", "The dry interior: red-brown sand piled by the wind into big dunes, and stony flats between. Bare land everywhere made the Cambrian far dustier than today, hazing the sky."],
  humid: ["Humid lowland", "Where rain falls often, much of the ground is dark with biological soil crusts and microbial mats, and water stands in hollows. It is the nearest thing to green on land: no plants, only microbes, and perhaps some algae."],
  river: ["Braided river plain", "With no plants to hold its banks, a river spreads into a wide sheet of shifting channels and gravel and sand bars, flooding across the plain after storms and carrying mud out to the delta, where the Chengjiang animals lived and were buried."],
  upland: ["Bare bedrock uplands", "Bare rock, weathering in place: no soil, no plants, only lichen-free stone (lichens are not known until the Devonian) and scattered rubble."],
  shoal: ["Sandy shallows", "Warm shallow water over rippled sand: the outer delta, stirred by waves."],
  delta: ["The muddy delta front", "Soft grey mud under murky water, fed by river floods: the home of the Chengjiang animals. Floods and storms sometimes buried them alive, which is why they are preserved so well."],
  deep: ["The oxygen-poor deep", "Below about 50 m the outer shelf held an oxygen-poor water mass. Little or nothing lived here."] };
function groundColor(x, z, h, c) { const n1 = fbm(x / 40, z / 40, 3), n2 = fbm(x / 700 + 5, z / 700, 3), m = landMask(x, z);
  if (m < 0) { c.setRGB(SG.mud[0] + 0.06 * n1, SG.mud[1] + 0.05 * n1, SG.mud[2] + 0.03 * n1);                     // the seafloor: mud, or pale lime sand
    if (h > -6 * SG.deep) c.lerp(_c1.setRGB(SG.sand[0] + 0.06 * n1, SG.sand[1] + 0.05 * n1, SG.sand[2]), sstepN(h, -6 * SG.deep, -1.5));   // sand in the shallows
    if (fbm(x / 60 + 11, z / 60, 3) > 0.6 && h > -25) c.lerp(_c1.setRGB(0.32, 0.32, 0.27), 0.4);                   // darker, organic-rich mud
    if (h > -1.5) c.lerp(_c1.setRGB(0.22 + 0.06 * n1, 0.24 + 0.05 * n1, 0.17), 0.5 * sstepN(fbm(x / 30 + 2, z / 30, 3), 0.45, 0.65));   // wrinkled microbial mats on the low flats
    return c; }
  const wet = wetness(x, z), dry = 1 - sstepN(wet, 0.38, 0.5), hum = sstepN(wet, 0.47, 0.55);
  c.setRGB(0.55 + 0.12 * n2, 0.44 + 0.08 * n2, 0.34 + 0.05 * n1);                                                  // weathered rock and regolith: browns, reds, greys
  c.lerp(_c1.setRGB(0.72 + 0.06 * n1, 0.45 + 0.05 * n1, 0.30), dry * 0.75);                                         // dry country: red-brown iron-stained sand
  const sand = sstepN(fbm(x / 1800 + 50, z / 1800, 3), 0.5, 0.65); c.lerp(_c1.setRGB(0.76 + 0.05 * n1, 0.62 + 0.05 * n1, 0.46), sand * 0.6 * (1 - dry * 0.5));
  if (h < 1.6) c.lerp(SG.carbonate ? _c1.setRGB(0.70 + 0.05 * n1, 0.68, 0.58) : _c1.setRGB(0.42 + 0.05 * n1, 0.42, 0.34), sstepN(1.6 - h, 0, 1.2) * 0.8);   // wet tidal sand and mud (lime mud on carbonate coasts)
  const damp = Math.max(sstepN(1 - Math.abs(2 * fbm(x / 160 + 3, z / 160, 3) - 1), 0.75, 0.95) * (h < 6 ? 1 : 0.4), hum * (0.8 + 0.2 * sstepN(n1, 0.3, 0.6)));
  c.lerp(_c1.setRGB(0.07 + 0.03 * n1, 0.11 + 0.05 * n1, 0.04), damp * 0.92);   // (Devonian: plant litter and low green cover where it is damp)                                         // dark microbial crusts and mats
  if (wet > 0.58 && fbm(x / 90 + 40, z / 90, 3) > 0.62) c.lerp(_c1.setRGB(0.20, 0.27, 0.27), 0.7);                    // standing water in hollows
  const w = washW(x, z); if (w < 0.08) c.lerp(_c1.setRGB(0.58 + 0.08 * n1, 0.56 + 0.06 * n1, 0.50), 0.7 * sstepN(0.08 - w, 0, 0.03) * (0.5 + 0.5 * sstepN(n1, 0.4, 0.6)));   // river gravel bars
  if (h > 25) c.lerp(_c1.setRGB(0.47 + 0.08 * n1, 0.45 + 0.06 * n1, 0.43), sstepN(h, 25, 80));                     // grey bedrock uplands
  return c; }
const _c1 = new THREE.Color();

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


// ---------- life: body plans built at real size (lengths in metres), placed by habitat and abundance near you ----------
// Colours are unknown for almost all Cambrian animals: they are drawn in muted natural tones (and comb jellies translucent).
function mergeG(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); if (q.attributes.uv) q.deleteAttribute("uv"); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const q of gs) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); return out; }
const TM = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
const SPH = (w = 8, h = 6) => new THREE.SphereGeometry(1, w, h), CYL = (s = 6) => new THREE.CylinderGeometry(1, 1, 1, s), CONE = (s = 6) => new THREE.ConeGeometry(1, 1, s), BOX = () => new THREE.BoxGeometry(1, 1, 1);
const between = (a, b, r, seg = 5) => { const d = b.clone().sub(a), m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()); m.compose(a.clone().add(b).multiplyScalar(0.5), q, V3(r, d.length(), r)); return [CYL(seg), m]; };
// every template builds an animal pointing along +z (head forward), lying on y = 0 for bottom dwellers
const BODY = {
  // segmented arthropod: head shield, tapering trunk, tail; pairs of legs; antennae; optional great appendages, bivalved carapace, eyes
  arthropod(o) { const L = o.L, W = o.W ?? L * 0.4, P = [], n = o.segs ?? 10, hl = L * (o.head ?? 0.25), th = W * (o.flat ?? 0.18);
    P.push([SPH(10, 6), TM(0, th, L / 2 - hl / 2, W / 2 * (o.headW ?? 1), th, hl / 2)]);
    for (let k = 0; k < n; k++) { const f = k / n, z = L / 2 - hl - (L - hl) * (k + 0.5) / n * (o.tailGap ? 0.9 : 1), w = W * (1 - f * (o.taper ?? 0.6)); P.push([SPH(8, 4), TM(0, th * 0.9, z, w / 2, th * 0.85, (L - hl) / n * 0.62)]);
      if (o.legs !== false) for (const sd of [-1, 1]) P.push(between(V3(sd * w * 0.3, th * 0.4, z), V3(sd * w * 0.68, 0, z + 0.004 * L * 10), Math.max(0.0006, L * 0.012), 4)); }
    if (o.tail) P.push([CONE(5), TM(0, th * 0.6, -L / 2 - L * o.tail / 2 + L * 0.05, W * 0.12, L * o.tail, W * 0.08, -Math.PI / 2)]);
    if (o.antennae) for (const sd of [-1, 1]) P.push(between(V3(sd * W * 0.12, th, L / 2 - hl * 0.1), V3(sd * W * 0.5, th * 1.5, L / 2 + L * o.antennae), Math.max(0.0005, L * 0.008), 4));
    if (o.great) for (const sd of [-1, 1]) { const b = V3(sd * W * 0.15, th, L / 2); P.push(between(b, V3(sd * W * 0.3, th * 1.6, L / 2 + L * o.great * 0.5), L * 0.02, 5)); P.push(between(V3(sd * W * 0.3, th * 1.6, L / 2 + L * o.great * 0.5), V3(sd * W * 0.2, th * 0.4, L / 2 + L * o.great), L * 0.012, 4)); }
    if (o.shell) P.push([SPH(12, 6), TM(0, th * 1.4, L * 0.05, W * 0.62, th * 2.2, L * 0.48)]);
    if (o.eyes) for (const sd of [-1, 1]) P.push([SPH(6, 4), TM(sd * W * (o.eyes === "stalk" ? 0.42 : 0.2), th * 1.6, L / 2 - hl * 0.25, L * 0.04, L * 0.04, L * 0.04)]);
    return mergeG(P); },
  trilobite(o) { const L = o.L, W = L * 0.55, P = [], th = L * 0.07;
    P.push([SPH(12, 6), TM(0, th, L * 0.32, W / 2, th, L * 0.2)]); P.push([SPH(6, 4), TM(0, th * 1.6, L * 0.33, W * 0.12, th * 0.9, L * 0.15)]);
    for (const sd of [-1, 1]) { P.push([CONE(4), TM(sd * W * 0.47, th * 0.6, L * 0.08, L * 0.025, L * 0.3, L * 0.02, -Math.PI / 2)]); P.push([SPH(6, 4), TM(sd * W * 0.2, th * 1.9, L * 0.35, L * 0.04, L * 0.035, L * 0.05)]); }
    for (let k = 0; k < (o.segs ?? 14); k++) { const z = L * 0.12 - k * L * 0.042, w = W * (0.92 - k * 0.035); P.push([SPH(8, 3), TM(0, th * 0.9, z, w / 2, th * 0.7, L * 0.022)]); P.push([SPH(6, 3), TM(0, th * 1.4, z, w * 0.13, th * 0.6, L * 0.02)]); }
    P.push([SPH(8, 4), TM(0, th * 0.8, -L * 0.45, W * 0.12, th * 0.6, L * 0.05)]); return mergeG(P); },
  radiodont(o) { const L = o.L, P = [], W = L * 0.3, th = L * 0.08;
    P.push([SPH(12, 8), TM(0, th, L * 0.1, W * 0.35, th, L * 0.38)]); P.push([SPH(10, 6), TM(0, th * 1.1, L * 0.42, W * 0.3, th * 0.8, L * 0.1)]);
    for (let k = 0; k < (o.flaps ?? 11); k++) { const z = L * 0.35 - k * L * 0.065, w = W * (1 - k * 0.05); for (const sd of [-1, 1]) P.push([SPH(6, 3), TM(sd * w * 0.62, th * 0.8, z, w * 0.42, th * 0.12, L * 0.045, 0, sd * 0.35)]); }
    for (const sd of [-1, 1]) { P.push([SPH(5, 4), TM(sd * L * 0.15, th * 0.7, -L * 0.42, L * 0.12, th * 0.1, L * 0.05, 0, sd * 0.6)]); P.push(between(V3(sd * W * 0.25, th * 1.4, L * 0.43), V3(sd * W * 0.55, th * 2.2, L * 0.47), L * 0.012, 4)); P.push([SPH(7, 5), TM(sd * W * 0.58, th * 2.3, L * 0.47, L * 0.045, L * 0.035, L * 0.035)]);
      let a = V3(sd * W * 0.12, th * 0.8, L * 0.5); for (let k = 0; k < 6; k++) { const b = a.clone().add(V3(0, -L * 0.03 * Math.sin(k * 0.5), L * 0.045 * Math.cos(k * 0.35))); P.push(between(a, b, L * (0.025 - k * 0.003), 5)); P.push(between(b, b.clone().add(V3(0, -L * 0.04, 0)), L * 0.004, 3)); a = b; } }
    return mergeG(P); },
  lobopodian(o) { const L = o.L, r = o.r ?? L * 0.05, P = [], n = o.legs ?? 9;
    for (let k = 0; k <= 12; k++) { const z = L / 2 - k * L / 12; P.push([SPH(7, 5), TM(0, r * 2.2, z, r, r, L / 12 * 0.7)]); }
    P.push([SPH(7, 5), TM(0, r * 2.4, L / 2 + r * 0.6, r * 0.9, r * 0.9, r * 1.1)]);
    for (let k = 0; k < n; k++) { const z = L / 2 - L * 0.12 - k * (L * 0.8) / Math.max(1, n - 1); for (const sd of [-1, 1]) P.push(between(V3(sd * r * 0.6, r * 2, z), V3(sd * r * 2.2, 0, z), r * 0.42, 5));
      if (o.spines) P.push(between(V3(0, r * 3, z), V3(0, r * 3 + L * o.spines, z + L * 0.02), r * 0.25, 4));
      if (o.plates) for (const sd of [-1, 1]) P.push([CYL(8), TM(sd * r * 1.2, r * 2.6, z, r * 0.9, r * 0.12, r * 0.9, 0, 0, sd * 0.6)]); }
    return mergeG(P); },
  worm(o) { const L = o.L, r = o.r ?? L * 0.04, P = [], n = 16, curl = o.curl ?? 0.5;
    for (let k = 0; k <= n; k++) { const f = k / n, a = (f - 0.5) * curl * Math.PI, x = Math.sin(a) * L * 0.25, z = L / 2 - f * L; P.push([SPH(7, 5), TM(x, r, z, r * (o.taper ? 1 - f * 0.4 : 1), r, L / n * 0.75)]); }
    if (o.proboscis) { P.push([SPH(7, 5), TM(0, r * 1.1, L / 2 + r * 1.5, r * 1.25, r * 1.25, r * 2)]); for (let k = 0; k < 8; k++) P.push([CONE(4), TM(Math.cos(k) * r, r * 1.1 + Math.sin(k) * r, L / 2 + r * 2.6, r * 0.2, r * 0.8, r * 0.2, Math.PI / 2)]); }
    return mergeG(P); },
  brachiopod(o) { const L = o.L, P = []; P.push([SPH(12, 6), TM(0, L * 0.25, 0, L * 0.45, L * 0.12, L * 0.5)]); P.push([SPH(12, 6), TM(0, L * 0.37, 0, L * 0.43, L * 0.1, L * 0.48)]);
    if (o.pedicle) P.push(between(V3(0, L * 0.25, -L * 0.45), V3(0, 0, -L * (0.45 + o.pedicle)), L * 0.05, 5)); return mergeG(P); },
  hyolith(o) { const L = o.L, P = []; P.push([CONE(10), TM(0, L * 0.12, 0, L * 0.14, L, L * 0.1, Math.PI / 2)]); P.push([CYL(10), TM(0, L * 0.12, L * 0.5, L * 0.15, L * 0.03, L * 0.11, Math.PI / 2)]);
    for (const sd of [-1, 1]) P.push(between(V3(sd * L * 0.1, L * 0.1, L * 0.45), V3(sd * L * 0.5, 0, L * 0.2), L * 0.012, 4)); return mergeG(P); },
  sponge(o) { const H = o.H, R = o.R ?? H * 0.15, P = [];
    if (o.shape === "tube") { P.push([new THREE.CylinderGeometry(1, 0.7, 1, 10, 1, true), TM(0, H / 2, 0, R, H, R)]); for (let k = 0; k < 6; k++) P.push(between(V3(Math.cos(k) * R, H, Math.sin(k) * R), V3(Math.cos(k) * R * 1.6, H * 1.1, Math.sin(k) * R * 1.6), R * 0.05, 3)); }
    else if (o.shape === "disc") { P.push([SPH(12, 5), TM(0, R * 0.25, 0, R, R * 0.25, R)]); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; P.push(between(V3(Math.cos(a) * R * 0.8, R * 0.2, Math.sin(a) * R * 0.8), V3(Math.cos(a) * R * 2.2, R * 0.05, Math.sin(a) * R * 2.2), R * 0.025, 3)); } }
    else { P.push([new THREE.CylinderGeometry(1, 0.4, 1, 10, 1, true), TM(0, H / 2, 0, R, H, R)]); }
    return mergeG(P); },
  polyp(o) { const H = o.H, R = o.R ?? H * 0.12, P = []; P.push([new THREE.CylinderGeometry(1, 1.2, 1, 10), TM(0, H * 0.4, 0, R, H * 0.8, R)]);
    for (let k = 0; k < (o.tent ?? 18); k++) { const a = k / (o.tent ?? 18) * Math.PI * 2; P.push(between(V3(Math.cos(a) * R * 0.8, H * 0.8, Math.sin(a) * R * 0.8), V3(Math.cos(a) * R * 2.2, H * 1.15, Math.sin(a) * R * 2.2), R * 0.08, 3)); }
    return mergeG(P); },
  ctenophore(o) { const L = o.L, P = []; P.push([SPH(14, 10), TM(0, 0, 0, L * 0.38, L * 0.5, L * 0.38)]); P.push([CONE(10), TM(0, -L * 0.5, 0, L * 0.12, L * 0.08, L * 0.12, Math.PI)]); return mergeG(P); },
  combs(o) { const L = o.L, P = []; for (let k = 0; k < (o.rows ?? 8); k++) { const a = k / (o.rows ?? 8) * Math.PI * 2;   // eight rows of comb plates running pole to pole over the body's surface
    for (let j = 1; j < 12; j++) { const th = j / 12 * Math.PI, r = Math.sin(th) * L * 0.385, y = Math.cos(th) * L * 0.505; P.push([BOX(), TM(Math.cos(a) * r, y, Math.sin(a) * r, L * 0.022, L * 0.012, L * 0.022, 0, -a)]); } } return mergeG(P); },
  fish(o) { const L = o.L, P = []; P.push([SPH(10, 6), TM(0, 0, 0, L * 0.08, L * 0.12, L * 0.5)]); P.push([SPH(6, 4), TM(0, L * 0.11, -L * 0.1, L * 0.012, L * 0.06, L * 0.3)]); P.push([SPH(6, 4), TM(0, -L * 0.08, -L * 0.25, L * 0.012, L * 0.05, L * 0.2)]);
    for (const sd of [-1, 1]) P.push([SPH(5, 4), TM(sd * L * 0.06, L * 0.03, L * 0.38, L * 0.025, L * 0.025, L * 0.025)]); return mergeG(P); },
  vetulicolian(o) { const L = o.L, P = []; P.push([BOX(), TM(0, 0, L * 0.22, L * 0.26, L * 0.3, L * 0.44)]); P.push([SPH(8, 6), TM(0, 0, L * 0.45, L * 0.12, L * 0.14, L * 0.04)]);   // a boxy front with a mouth
    for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) P.push([SPH(6, 4), TM(sd * L * 0.131, L * 0.04, L * 0.34 - k * L * 0.07, L * 0.004, L * 0.06, L * 0.022)]);   // five gill openings each side
    for (let k = 0; k < 7; k++) P.push([SPH(7, 5), TM(0, 0, -L * 0.04 - k * L * 0.07, L * 0.07 * (1 - k * 0.07), L * 0.13 * (1 - k * 0.09), L * 0.04)]); return mergeG(P); },   // a jointed tail of seven segments
  eldonid(o) { const R = o.R, P = []; P.push([SPH(16, 6), TM(0, R * 0.12, 0, R, R * 0.14, R)]); P.push([new THREE.TorusGeometry(R * 0.5, R * 0.06, 6, 20), TM(0, R * 0.2, 0, 1, 1, 1, Math.PI / 2)]);
    for (let k = 0; k < 3; k++) P.push(between(V3(Math.cos(k * 2.1) * R * 0.2, R * 0.1, Math.sin(k * 2.1) * R * 0.2), V3(Math.cos(k * 2.1) * R * 0.45, -R * 0.15, Math.sin(k * 2.1) * R * 0.45), R * 0.05, 4)); return mergeG(P); },
  arrow(o) { const L = o.L, P = []; P.push([SPH(8, 5), TM(0, 0, 0, L * 0.04, L * 0.04, L * 0.5)]); for (const sd of [-1, 1]) P.push([BOX(), TM(sd * L * 0.06, 0, -L * 0.25, L * 0.08, L * 0.004, L * 0.12)]);
    for (let k = 0; k < 8; k++) P.push([CONE(3), TM(Math.cos(k) * L * 0.035, Math.sin(k) * L * 0.035, L * 0.52, L * 0.005, L * 0.06, L * 0.005, Math.PI / 2)]); return mergeG(P); },
  cup(o) { const H = o.H, P = []; P.push(between(V3(0, 0, 0), V3(0, H * 0.6, 0), H * 0.05, 5)); P.push([new THREE.CylinderGeometry(1, 0.3, 1, 10, 1, true), TM(0, H * 0.8, 0, H * 0.18, H * 0.4, H * 0.18)]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; P.push(between(V3(Math.cos(a) * H * 0.17, H, Math.sin(a) * H * 0.17), V3(Math.cos(a) * H * 0.26, H * 1.12, Math.sin(a) * H * 0.26), H * 0.012, 3)); } return mergeG(P); },
  alga(o) { const H = o.H, P = []; for (let k = 0; k < (o.n ?? 5); k++) { const a = k * 1.3, x = Math.cos(a) * H * 0.08, z = Math.sin(a) * H * 0.08; let p = V3(x, 0, z);
      for (let s = 0; s < 4; s++) { const q = p.clone().add(V3(Math.sin(a + s) * H * 0.05, H * (0.22 + 0.04 * k / 5), Math.cos(a + s) * H * 0.05)); P.push(between(p, q, H * (0.02 - s * 0.003), 4)); p = q; } } return mergeG(P); } };
// ---------- more body plans: reef builders and the animals of the other sites ----------
// an archaeocyath: a porous, double-walled cup (a reef-building sponge); single, or branching into several cups
BODY.archaeo = o => { const H = o.H, R = o.R ?? H * 0.3, P = [], cup = (x, z, h, r, ry, tilt) => { const m = new THREE.Matrix4().compose(V3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, ry, 0)), V3(1, 1, 1));
    P.push([new THREE.CylinderGeometry(r, r * 0.25, h, 12, 3, true).translate(0, h / 2, 0).applyMatrix4(m), new THREE.Matrix4()]); P.push([new THREE.CylinderGeometry(r * 0.62, r * 0.18, h * 0.96, 10, 1, true).translate(0, h / 2, 0).applyMatrix4(m), new THREE.Matrix4()]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; P.push([new THREE.BoxGeometry(r * 0.36, h * 0.9, r * 0.02).translate(Math.cos(a) * r * 0.75, h * 0.47, Math.sin(a) * r * 0.75).applyMatrix4(new THREE.Matrix4().makeRotationY(-a)).applyMatrix4(m), new THREE.Matrix4()]); } };   // the radial partitions (septa)
  if (o.branch) for (let k = 0; k < o.branch; k++) { const a = k * 2.4; cup(Math.cos(a) * R * 0.8 * (k ? 1 : 0), Math.sin(a) * R * 0.8 * (k ? 1 : 0), H * (0.6 + 0.4 * ((k * 7) % 3) / 2), R * 0.6, a, k ? 0.35 : 0); }
  else cup(0, 0, H, R, 0, 0); return mergeG(P); };
// calcimicrobes (Epiphyton): dark, bushy, branching growths of calcified microbes; Renalcis: clotted, kidney-shaped lumps
BODY.bush = o => { const H = o.H, P = []; const grow = (p, d, len, r, depth) => { const q = p.clone().addScaledVector(d, len); P.push(between(p, q, r, 4)); if (depth <= 0) { P.push([new THREE.SphereGeometry(1, 5, 4), TM(q.x, q.y, q.z, r * 2.2, r * 2.2, r * 2.2)]); return; }
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + depth, d2 = d.clone().add(V3(Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6)).normalize(); grow(q, d2, len * 0.72, r * 0.72, depth - 1); } };
  for (let k = 0; k < (o.n ?? 4); k++) grow(V3(Math.cos(k * 1.6) * H * 0.08, 0, Math.sin(k * 1.6) * H * 0.08), V3(Math.cos(k * 1.6) * 0.3, 1, Math.sin(k * 1.6) * 0.3).normalize(), H * 0.35, H * 0.035, 3); return mergeG(P); };
BODY.clot = o => { const H = o.H, P = []; for (let k = 0; k < 14; k++) { const a = k * 2.4, r = Math.sqrt(k / 14) * H * 0.5; P.push([new THREE.SphereGeometry(1, 7, 5), TM(Math.cos(a) * r, H * (0.25 + 0.5 * ((k * 5) % 7) / 7), Math.sin(a) * r, H * 0.22, H * 0.18, H * 0.2)]); } return mergeG(P); };
// a chancelloriid: an upright bag-shaped body studded with star-shaped spiny sclerites
BODY.chancellorid = o => { const H = o.H, R = o.R ?? H * 0.18, P = [[new THREE.CylinderGeometry(R, R * 0.5, H, 10, 4), TM(0, H / 2, 0)]];
  for (let k = 0; k < 40; k++) { const y = H * (0.08 + 0.88 * ((k * 0.618) % 1)), a = k * 2.4, rr = R * (0.5 + 0.5 * y / H); for (let s = 0; s < 5; s++) { const b = s / 5 * Math.PI * 2;
      const d = V3(Math.cos(a), 0, Math.sin(a)), up = V3(0, 1, 0), t = d.clone().cross(up), dir = d.clone().multiplyScalar(0.6).addScaledVector(t, Math.cos(b)).addScaledVector(up, Math.sin(b)).normalize();
      const p = V3(Math.cos(a) * rr, y, Math.sin(a) * rr); P.push(between(p, p.clone().addScaledVector(dir, R * 0.6), R * 0.03, 3)); } } return mergeG(P); };
// Halkieria: a flattened slug covered in rows of scale-like sclerites, with a shell at each end
BODY.halkieria = o => { const L = o.L, P = [[SPH(10, 6), TM(0, L * 0.06, 0, L * 0.18, L * 0.06, L * 0.5)]];
  for (let k = 0; k < 22; k++) { const z = L * 0.4 - k * L * 0.036; for (const sd of [-1, 0, 1]) P.push([BOX(), TM(sd * L * 0.1, L * 0.1 + (sd ? 0 : 0.01 * L), z, L * 0.09, L * 0.008, L * 0.035, 0, 0, sd * 0.5)]); }
  for (const z of [0.42, -0.42]) P.push([SPH(10, 5), TM(0, L * 0.12, z * L, L * 0.13, L * 0.05, L * 0.1)]); return mergeG(P); };
// a gilled lobopodian (Kerygmachela, Pambdelurion): a soft body with flaps along its sides, stubby legs, and great frontal limbs
BODY.gilled = o => { const L = o.L, P = [], n = 11, th = L * 0.06;
  for (let k = 0; k < n; k++) { const z = L * 0.38 - k * L * 0.07, w = L * 0.16 * (1 - k * 0.04); P.push([SPH(8, 5), TM(0, th, z, w * 0.5, th, L * 0.045)]);
    for (const sd of [-1, 1]) { P.push([SPH(5, 3), TM(sd * w * 0.75, th, z, w * 0.45, th * 0.12, L * 0.04, 0, sd * 0.3)]); P.push(between(V3(sd * w * 0.3, th * 0.5, z), V3(sd * w * 0.5, -th * 0.4, z), L * 0.012, 4)); } }
  for (const sd of [-1, 1]) { let a = V3(sd * L * 0.04, th, L * 0.44); for (let k = 0; k < 5; k++) { const b = a.clone().add(V3(sd * L * 0.01, -L * 0.012 * k, L * 0.05)); P.push(between(a, b, L * (0.018 - k * 0.002), 4)); a = b; } }
  if (o.tail) for (const sd of [-1, 1]) P.push(between(V3(sd * L * 0.03, th, -L * 0.4), V3(sd * L * 0.08, th, -L * (0.4 + o.tail)), L * 0.008, 3));
  return mergeG(P); };
// ---------- Devonian body plans: fish, reef builders, shelled cephalopods, and land plants ----------
// a fish body along +z: spindle body, tail fin, paired fins; options: armour (placoderm head and trunk shields with a jointed neck),
// box (antiarch armour with jointed arm-like fins), shark (heterocercal tail, pointed snout), lobe (fleshy lobed fins), flat (a flattened
// head, as in Tiktaalik), eel, deep (tall body)
BODY.fish2 = o => { const L = o.L, P = [], H = L * (o.deep ?? 0.12), W = L * (o.wide ?? 0.09);
  P.push([SPH(12, 8), TM(0, 0, 0, W, H, L * 0.42)]);
  if (o.flat) P.push([SPH(10, 6), TM(0, H * 0.1, L * 0.3, W * 1.5, H * 0.55, L * 0.17)]);
  if (o.armour) { P.push([SPH(12, 7), TM(0, H * 0.15, L * 0.24, W * 1.25, H * 1.15, L * 0.2)]); P.push([SPH(10, 6), TM(0, H * 0.1, L * 0.05, W * 1.2, H * 1.1, L * 0.14)]);
    P.push([BOX(), TM(0, -H * 0.55, L * 0.36, W * 0.9, H * 0.18, L * 0.08)]); P.push([SPH(6, 4), TM(W * 0.9, H * 0.45, L * 0.33, L * 0.025, L * 0.025, L * 0.025)]); P.push([SPH(6, 4), TM(-W * 0.9, H * 0.45, L * 0.33, L * 0.025, L * 0.025, L * 0.025)]); }
  if (o.box) { P.push([BOX(), TM(0, H * 0.1, L * 0.18, W * 2.1, H * 1.5, L * 0.36)]); for (const sd of [-1, 1]) { P.push(between(V3(sd * W, 0, L * 0.3), V3(sd * W * 2.2, -H * 0.3, L * 0.12), L * 0.025, 5)); P.push(between(V3(sd * W * 2.2, -H * 0.3, L * 0.12), V3(sd * W * 2.4, -H * 0.5, -L * 0.08), L * 0.02, 5)); }
    P.push([SPH(5, 4), TM(0, H * 0.95, L * 0.28, L * 0.03, L * 0.03, L * 0.03)]); }
  const tz = -L * 0.42; if (o.shark) { P.push([BOX(), TM(0, H * 0.6, tz - L * 0.06, L * 0.01, H * 1.6, L * 0.12, 0.6)]); P.push([BOX(), TM(0, -H * 0.4, tz - L * 0.04, L * 0.01, H * 0.9, L * 0.08, -0.5)]); P.push([CONE(8), TM(0, 0, L * 0.47, W * 0.8, L * 0.1, H * 0.8, Math.PI / 2)]); }
  else if (o.eel) P.push([BOX(), TM(0, 0, tz - L * 0.05, L * 0.006, H * 1.5, L * 0.18)]);
  else { P.push([BOX(), TM(0, H * (o.armour || o.box ? 0.3 : 0.15), tz - L * 0.06, L * 0.008, H * 2.2, L * 0.13, o.armour || o.box || o.lobe ? 0.25 : 0)]); }
  P.push([BOX(), TM(0, H * 1.0, -L * 0.05, L * 0.006, H * 0.8, L * 0.12, -0.3)]); if (o.lobe || o.second) P.push([BOX(), TM(0, H * 0.85, -L * 0.25, L * 0.006, H * 0.6, L * 0.08, -0.3)]);
  for (const sd of [-1, 1]) { const fz = L * (o.box ? 0.08 : 0.18), fl = L * 0.11; if (o.lobe) { P.push(between(V3(sd * W * 0.8, -H * 0.4, fz), V3(sd * W * 2.2, -H * 0.8, fz - fl), L * 0.022, 5)); P.push([SPH(5, 3), TM(sd * W * 2.4, -H * 0.85, fz - fl * 1.2, L * 0.03, L * 0.008, L * 0.05)]);
      P.push(between(V3(sd * W * 0.6, -H * 0.6, -L * 0.16), V3(sd * W * 1.6, -H * 0.9, -L * 0.25), L * 0.016, 5)); }
    else if (!o.box) { P.push([BOX(), TM(sd * W * 1.6, -H * 0.4, fz, W * 1.6, L * 0.006, fl, 0, sd * 0.35, sd * 0.3)]); P.push([BOX(), TM(sd * W * 1.0, -H * 0.6, -L * 0.18, W, L * 0.005, L * 0.06, 0, sd * 0.3, sd * 0.3)]); }
    if (!o.armour && !o.box) P.push([SPH(5, 4), TM(sd * W * 0.75, H * 0.35, L * 0.36, L * 0.022, L * 0.022, L * 0.022)]); }
  return mergeG(P); };
// an ammonoid (goniatite): a coiled shell with the animal's arms at the opening; a nautiloid: a long straight cone
BODY.ammonoid = o => { const D = o.D, P = []; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 4, r = D * 0.07 * Math.exp(a * 0.17); P.push([SPH(8, 6), TM(Math.cos(a) * r, Math.sin(a) * r, 0, r * 0.55, r * 0.55, r * 0.35)]); }
  const a = Math.PI * 4, r = D * 0.07 * Math.exp(a * 0.17); for (let k = 0; k < 8; k++) P.push(between(V3(Math.cos(a) * r, Math.sin(a) * r - r * 0.3, 0), V3(Math.cos(a) * r + D * 0.25, Math.sin(a) * r - r * 0.3 - D * 0.08 + k * D * 0.02, (k - 3.5) * D * 0.02), D * 0.012, 3));
  return mergeG(P).rotateY(Math.PI / 2); };
BODY.nautiloid = o => { const L = o.L, P = [[CONE(10), TM(0, 0, -L * 0.1, L * 0.08, L, L * 0.08, -Math.PI / 2)]]; for (let k = 0; k < 10; k++) P.push(between(V3(0, 0, L * 0.4), V3(Math.sin(k) * L * 0.06, Math.cos(k) * L * 0.06, L * 0.55), L * 0.008, 3)); P.push([SPH(6, 4), TM(L * 0.06, L * 0.03, L * 0.38, L * 0.02, L * 0.02, L * 0.02)]); return mergeG(P); };
// a crinoid: a long jointed stalk, a cup, and feathery arms; a rugose 'horn' coral; a tabulate coral colony; a stromatoporoid dome
BODY.crinoid = o => { const H = o.H, P = [between(V3(0, 0, 0), V3(0, H * 0.75, 0), H * 0.012, 6), [new THREE.CylinderGeometry(1, 0.5, 1, 10), TM(0, H * 0.78, 0, H * 0.04, H * 0.06, H * 0.04)]];
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; let p = V3(Math.cos(a) * H * 0.04, H * 0.8, Math.sin(a) * H * 0.04); for (let s = 0; s < 4; s++) { const q = p.clone().add(V3(Math.cos(a) * H * 0.05, H * 0.05 - s * H * 0.01, Math.sin(a) * H * 0.05)); P.push(between(p, q, H * 0.006, 3)); p = q; } }
  return mergeG(P); };
BODY.horncoral = o => { const H = o.H, P = [[new THREE.CylinderGeometry(1, 0.15, 1, 12, 1, false), TM(H * 0.15, H * 0.45, 0, H * 0.22, H, H * 0.22, 0, 0, -0.35)]]; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; P.push(between(V3(H * 0.32 + Math.cos(a) * H * 0.18, H * 0.92, Math.sin(a) * H * 0.18), V3(H * 0.32 + Math.cos(a) * H * 0.3, H * 1.1, Math.sin(a) * H * 0.3), H * 0.02, 3)); } return mergeG(P); };
BODY.tabulate = o => { const H = o.H, P = []; for (let k = 0; k < 40; k++) { const a = k * 2.4, r = Math.sqrt(k / 40) * H * 0.7, h = H * (1 - (r / (H * 0.7)) ** 2 * 0.6); P.push([new THREE.CylinderGeometry(H * 0.07, H * 0.07, h, 6), TM(Math.cos(a) * r, h / 2, Math.sin(a) * r)]); } return mergeG(P); };
BODY.stromatoporoid = o => { const H = o.H, P = []; for (let k = 0; k < 6; k++) P.push([new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), TM(0, -k * H * 0.03, 0, H * (1.6 - k * 0.12), H * (0.8 - k * 0.1), H * (1.5 - k * 0.12))]); for (let k = 0; k < 30; k++) { const a = k * 2.4, r = Math.sqrt(k / 30) * H * 1.3; P.push([new THREE.SphereGeometry(1, 5, 3), TM(Math.cos(a) * r, H * 0.8 * Math.sqrt(Math.max(0, 1 - (r / (H * 1.55)) ** 2)), Math.sin(a) * r, H * 0.08, H * 0.05, H * 0.08)]); } return mergeG(P); };
BODY.eurypterid = o => { const L = o.L, P = [[SPH(10, 6), TM(0, L * 0.05, L * 0.34, L * 0.16, L * 0.05, L * 0.12)]];
  for (let k = 0; k < 12; k++) { const z = L * 0.2 - k * L * 0.05, w = L * 0.17 * (1 - k * 0.06); P.push([SPH(8, 4), TM(0, L * 0.05, z, w, L * 0.04, L * 0.03)]); }
  P.push([CONE(4), TM(0, L * 0.05, -L * 0.48, L * 0.03, L * 0.14, L * 0.012, -Math.PI / 2)]); for (const sd of [-1, 1]) { for (let k = 0; k < 4; k++) P.push(between(V3(sd * L * 0.1, L * 0.03, L * (0.4 - k * 0.04)), V3(sd * L * 0.28, 0, L * (0.44 - k * 0.07)), L * 0.012, 4));
    P.push([SPH(6, 3), TM(sd * L * 0.25, L * 0.02, L * 0.18, L * 0.1, L * 0.012, L * 0.07)]); P.push([SPH(5, 4), TM(sd * L * 0.08, L * 0.09, L * 0.4, L * 0.025, L * 0.02, L * 0.035)]); }
  return mergeG(P); };
BODY.millipede = o => { const L = o.L, P = []; for (let k = 0; k < 24; k++) { const z = L / 2 - k * L / 24, x = Math.sin(k * 0.3) * L * 0.04; P.push([SPH(6, 4), TM(x, L * 0.035, z, L * 0.03, L * 0.03, L * 0.025)]); for (const sd of [-1, 1]) P.push(between(V3(x + sd * L * 0.02, L * 0.02, z), V3(x + sd * L * 0.05, 0, z), L * 0.004, 3)); } return mergeG(P); };
BODY.scorpion = o => { const L = o.L, P = [[SPH(8, 5), TM(0, L * 0.05, L * 0.12, L * 0.12, L * 0.05, L * 0.22)]]; let p = V3(0, L * 0.05, -L * 0.1);
  for (let k = 0; k < 6; k++) { const q = p.clone().add(V3(0, L * 0.07, -L * 0.05 + k * L * 0.02)); P.push(between(p, q, L * (0.04 - k * 0.004), 5)); p = q; } P.push([CONE(5), TM(p.x, p.y, p.z + L * 0.03, L * 0.02, L * 0.08, L * 0.02, Math.PI / 2)]);
  for (const sd of [-1, 1]) { for (let k = 0; k < 4; k++) P.push(between(V3(sd * L * 0.08, L * 0.04, L * (0.2 - k * 0.07)), V3(sd * L * 0.22, 0, L * (0.25 - k * 0.1)), L * 0.01, 4)); P.push(between(V3(sd * L * 0.06, L * 0.05, L * 0.32), V3(sd * L * 0.16, L * 0.05, L * 0.48), L * 0.02, 5)); P.push([SPH(6, 4), TM(sd * L * 0.17, L * 0.05, L * 0.52, L * 0.05, L * 0.03, L * 0.06)]); }
  return mergeG(P); };
// land plants: Archaeopteris (a tall tree with a conifer-like trunk and flat sprays of fern-like foliage), a cladoxylopsid (a palm-like
// trunk with a crown of branchlets), a lycopsid (an unbranched or forked scaly stem with tufts of small leaves), and low plants
BODY.archaeopteris = o => { const H = o.H, P = [[new THREE.CylinderGeometry(H * 0.012, H * 0.03, H * 0.6, 8), TM(0, H * 0.3, 0)]];
  for (let k = 0; k < 14; k++) { const y = H * (0.3 + 0.65 * k / 14), a = k * 2.4, len = H * 0.28 * (1 - k / 16); const d = V3(Math.cos(a), 0.15, Math.sin(a));
    P.push(between(V3(0, y, 0), d.clone().multiplyScalar(len).add(V3(0, y, 0)), H * 0.006, 4)); P.push([BOX(), TM(Math.cos(a) * len * 0.55, y + H * 0.01, Math.sin(a) * len * 0.55, len * 1.05, H * 0.012, len * 0.6, 0, -a, 0)]); }   // flat sprays of fern-like leaves
  P.push([new THREE.CylinderGeometry(H * 0.006, H * 0.012, H * 0.4, 6), TM(0, H * 0.8, 0)]); return mergeG(P); };
BODY.cladoxylopsid = o => { const H = o.H, P = [[new THREE.CylinderGeometry(H * 0.04, H * 0.08, H, 10), TM(0, H / 2, 0)], [new THREE.CylinderGeometry(H * 0.1, H * 0.09, H * 0.04, 10), TM(0, 0.02 * H, 0)]];
  for (let k = 0; k < 16; k++) { const a = k * 2.4, d = V3(Math.cos(a) * 0.7, 0.7 - (k % 3) * 0.25, Math.sin(a) * 0.7).normalize(); P.push(between(V3(0, H, 0), d.clone().multiplyScalar(H * 0.22).add(V3(0, H, 0)), H * 0.008, 4));
    for (let s = 0; s < 4; s++) { const b = d.clone().multiplyScalar(H * (0.08 + s * 0.04)).add(V3(0, H, 0)); P.push(between(b, b.clone().add(V3(Math.cos(a + 1) * H * 0.04, -H * 0.03, Math.sin(a + 1) * H * 0.04)), H * 0.004, 3)); } }
  return mergeG(P); };
BODY.lycopsid = o => { const H = o.H, P = [[new THREE.CylinderGeometry(H * 0.03, H * 0.045, H * 0.8, 8), TM(0, H * 0.4, 0)]]; for (const sd of [-1, 1]) { P.push(between(V3(0, H * 0.78, 0), V3(sd * H * 0.12, H * 0.98, 0), H * 0.022, 6)); P.push([SPH(7, 5), TM(sd * H * 0.13, H, 0, H * 0.06, H * 0.08, H * 0.06)]); }
  for (let k = 0; k < 30; k++) { const y = H * (0.1 + 0.7 * k / 30), a = k * 2.4; P.push([CONE(3), TM(Math.cos(a) * H * 0.04, y, Math.sin(a) * H * 0.04, H * 0.008, H * 0.05, H * 0.008, 0, 0, Math.cos(a) * 1.2)]); } return mergeG(P); };
BODY.lowplants = o => { const H = o.H, P = []; for (let k = 0; k < 14; k++) { const a = k * 2.4, r = Math.sqrt(k) * H * 0.12; let p = V3(Math.cos(a) * r, 0, Math.sin(a) * r);
    for (let s = 0; s < 3; s++) { const q = p.clone().add(V3((s - 1) * H * 0.05 * Math.cos(k), H * (0.3 + 0.05 * (k % 3)), (s - 1) * H * 0.05 * Math.sin(k))); P.push(between(p, q, H * 0.02, 3)); p = q; } } return mergeG(P); };

// paint a body: counter-shaded (top colour above, belly colour below), optional bands along the body
function paint(geo, sp) { const p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3), a = new THREE.Color(sp.col), b = new THREE.Color(sp.col2 ?? sp.col), c = new THREE.Color();
  let z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.count; i++) { z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); }
  const tall = sp.habit === "sessile" && ["sponge", "polyp", "cup", "alga", "archaeo", "bush", "clot", "chancellorid", "frond", "tubes", "stromatoporoid", "tabulate", "horncoral", "crinoid", "archaeopteris", "lycopsid", "cladoxylopsid", "lowplants"].includes(sp.plan);
  for (let i = 0; i < p.count; i++) { const up = tall ? 0.5 + 0.5 * clampN(p.getY(i) / ((sp.o.H ?? 0.05) * 1.1), 0, 1) : clampN(0.5 + 0.7 * n.getY(i), 0, 1);
    c.copy(b).lerp(a, up); if (sp.bands) { const f = (p.getZ(i) - z0) / Math.max(1e-6, z1 - z0); if (Math.floor(f * 9) % 2) c.multiplyScalar(0.78); }
    col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); return geo; }

// ---------- the moment: about 380 million years ago, the Late Devonian (early-middle Frasnian) ----------
// SOURCES: timescale GTS2020 (Frasnian ~382.7-372.2 Ma); O2 ~17-21% (PNAS 2006 and others); CO2 ~500-2,000+ ppm (lycophyte stomatal
// proxy vs GEOCARB models: they disagree); tropical seas ~25 °C early Frasnian (conodont δ18O), Gogo 23-25 °C; day ~22 h (~400 days a
// year: Wells 1963 coral growth lines); Sun ~96.5-97% (Gough 1981 formula); Moon ~375,000 km (~2-3% larger: estimated); a sea-level
// highstand; sky as today. Plants: Archaeopteris gallery forests (to ~24-30 m), lycopsid swamps in deltas (Svalbard Frasnian lycopsid
// forests), declining cladoxylopsids; no seeds, flowers or grass. Land animals: millipedes, scorpions, trigonotarbids, mites, springtails;
// no insects known from the Frasnian; no tetrapods on land as body fossils (trackways ~395 Ma show limbed animals existed). ~8 million
// years before the Kellwasser extinction (~372 Ma). Sites: Gogo (Trinajstic et al. 2022, J. Geol. Soc.), Miguasha (Escuminac Fm),
// Fram Fm (Tiktaalik), Lode (Panderichthys), Scaat Craig; they span about ±5 million years and the page says so.
const ENV = { dateLabel: "about 380 million years ago", siteLabel: "", O2pct: "~18", O2range: "17-21%", CO2ppm: 1000, CO2text: "CO₂ ~500-2,000+ ppm (estimates disagree; today ~420)",
  sunL: 0.967, dayH: 22, moonScale: 1.025, seaT: 25, airT: 27, tideAmp: 1.1, tidesPerDay: 2, startHour: 8,
  murk: 0.09, skyUp: new THREE.Color(0.32, 0.52, 0.86), skyHor: new THREE.Color(0.80, 0.85, 0.88),
  arrival: "", landNote: "Look around: the first forests are rising along the rivers. Walk up to plants and small animals and press E to examine them.", deepNote: "Deeper, darker water." };
// the land's environments, in Devonian dress (the shapes come from the same generator as the Cambrian world)
Object.assign(BIOMES, {
  shoal: ["Sandy shallows", "Warm shallow water over sand."], delta: ["Muddy channel", "Deeper, murkier water over mud."], deep: ["Deep water", "Deeper, darker water."],
  tidal: ["Tidal flats", "Mud and sand flats flooded twice a day; along their edges grow small lycopsids and low plants, and arthropods scavenge the strandline. Lobe-finned fishes hunt the shallows at high tide."],
  plain: ["Floodplain", "Drier floodplain between the rivers: patchy low plants and shrubs, early ferns and their relatives, on red and grey soils that roots are only beginning to deepen. No grass and no flowers anywhere: they are more than 250 million years away."],
  desert: ["Dry red plains", "Semi-arid country of the Old Red Sandstone continent: red soils, seasonal stream beds, sparse low plants and bare ground."],
  humid: ["Archaeopteris forest", "The first true forests: Archaeopteris trees up to 24-30 m tall, with conifer-like wood but fern-like leafy sprays, reproducing by spores. Their roots deepened soils and sped up weathering, changing the chemistry of the seas. Under them: leaf litter, fallen logs, and millipedes, scorpions and spider relatives."],
  river: ["River banks", "Rivers lined with ribbons of Archaeopteris forest, lycopsids in the wetter hollows. Lungfish and lobe-finned fishes, some able to gulp air, live in the warm, shallow channels."],
  upland: ["Uplands", "Higher ground with thin soils: mostly bare rock and crusts, a few low plants."] });
// groups and their living relatives
const PL = "Placoderms (armoured fishes)", AC = "Acanthodians", SH = "Chondrichthyes (sharks)", AP = "Actinopterygii (ray-finned fishes)", LF = "Dipnoi (lungfishes)", TP = "Tetrapodomorphs (the 'fishapods')",
  SA = "Other lobe-finned fishes", JL = "Jawless fishes", CD = "Conodonts", CE = "Cephalopods", TR = "Trilobites", CR = "Crustaceans", EU = "Eurypterids (sea scorpions)", BR2 = "Brachiopods & bryozoans",
  CO = "Corals", EC = "Echinoderms (crinoids)", SP2 = "Sponges (stromatoporoids)", MI2 = "Calcimicrobes", LA = "Land arthropods", PT = "Plants";
const GROUPS = {
  [PL]: { formal: "class Placodermi (extinct)", kin: "No living members: placoderms died out at the end of the Devonian. They were the first jawed vertebrates to dominate, and among the first with live birth; they sit near the base of all jawed animals, so their nearest living relatives are, in a sense, every shark, bony fish and land vertebrate.", col: "Colour unknown (no Devonian fish colour has been recovered): guessed with a dark back and pale belly, as in most living fish." },
  [AC]: { formal: "Acanthodii, 'spiny sharks' (a grade of early jawed fishes)", kin: "No living members; they are now thought to be early relatives of sharks and rays (stem chondrichthyans).", col: "Colour guessed: silvery, counter-shaded, like small schooling fish today." },
  [SH]: { formal: "class Chondrichthyes", kin: "Living relatives: sharks, rays and chimaeras.", col: "Colour guessed from living sharks: grey above, pale below." },
  [AP]: { formal: "class Actinopterygii", kin: "Living relatives: nearly every fish alive today, over 30,000 species, from goldfish to tuna. Devonian ray-fins were small and few; their great rise came later.", col: "Colour guessed: silvery-olive and counter-shaded." },
  [LF]: { formal: "subclass Dipnoi", kin: "Still alive: six species of lungfish in Africa, South America and Australia; they and the coelacanth are our closest living fish relatives.", col: "Colour guessed from living lungfish: mottled olive-brown." },
  [TP]: { formal: "Tetrapodomorpha (lobe-finned fishes on the line to land vertebrates)", kin: "Living relatives: every amphibian, reptile, bird and mammal, including you. Elpistostegalians like Tiktaalik and Elpistostege had fin bones matching our arm and finger bones.", col: "Colour guessed: mottled browns and olives, for life in weedy shallows." },
  [SA]: { formal: "Sarcopterygii (lobe-finned fishes): onychodonts, porolepiforms, coelacanths", kin: "Living relatives: coelacanths (two species alive today), lungfish and, through the tetrapodomorphs, all land vertebrates.", col: "Colour guessed: dark, mottled, counter-shaded." },
  [JL]: { formal: "jawless fishes (osteostracans, anaspid-like forms)", kin: "Living relatives: lampreys and hagfish; the armoured osteostracans are the closest jawless relatives of jawed vertebrates.", col: "Colour guessed: mud tones." },
  [CD]: { formal: "class Conodonta", kin: "No living members: small eel-like animals with big eyes, known mostly from their tooth-like elements; they are early vertebrates or close to them.", col: "Colour guessed: translucent pale." },
  [CE]: { formal: "class Cephalopoda: ammonoids (goniatites) and nautiloids", kin: "Living relatives: the nautilus, and more distantly squid and octopus. Ammonoids lasted until the dinosaurs died, 66 million years ago.", col: "Colour guessed: living nautiluses have banded shells, so these are banded too." },
  [TR]: { formal: "class Trilobita", kin: "No living members (extinct 252 million years ago); relatives of all arthropods. Phacopid trilobites had big compound eyes with large separate lenses.", col: "Colour guessed: brown, banded." },
  [CR]: { formal: "subphylum Crustacea (phyllocarids, clam shrimp)", kin: "Living relatives: shrimp, crabs, lobsters; phyllocarids still live today (e.g. Nebalia).", col: "Colour guessed: translucent amber." },
  [EU]: { formal: "order Eurypterida", kin: "No living members; their closest living relatives are horseshoe crabs, spiders and scorpions.", col: "Colour guessed: brown, banded." },
  [BR2]: { formal: "phyla Brachiopoda and Bryozoa", kin: "Still alive (brachiopods: ~400 species; bryozoans: thousands), but brachiopods were far more common in the Devonian than today.", col: "Colour guessed: buff to grey shells." },
  [CO]: { formal: "rugose and tabulate corals (Anthozoa), both extinct", kin: "Living relatives: modern stony corals and sea anemones (modern reef corals are a separate, later group).", col: "Colour guessed: living corals take colour from symbiotic algae; these are shown in muted creams and browns." },
  [EC]: { formal: "class Crinoidea (sea lilies)", kin: "Still alive: sea lilies and feather stars; relatives of starfish and sea urchins.", col: "Colour guessed from living crinoids: rust, cream and purple." },
  [SP2]: { formal: "stromatoporoids (extinct reef-building sponges)", kin: "Living relatives: sponges; stromatoporoids were among the main builders of the great Devonian reefs, and were devastated in the Kellwasser extinction.", col: "Colour guessed: cream-grey." },
  [MI2]: { formal: "not animals: calcified microbes (probably cyanobacteria)", kin: "Living relatives: cyanobacteria, which still build mats and stromatolites today.", col: "Colour guessed: dark green-brown when alive." },
  [LA]: { formal: "land arthropods: millipedes (Diplopoda), scorpions (Scorpiones), trigonotarbids", kin: "Living relatives: millipedes and scorpions alive today; trigonotarbids are extinct relatives of spiders.", col: "Colour guessed from living relatives: dark browns." },
  [PT]: { formal: "land plants", kin: "", col: "" } };
const at = (site, dens, depth, more) => ({ [site]: { dens, ...(depth ? { depth } : {}), ...(more || {}) } });
const S = (genus, phylum, hint, plan, o, col, col2, habit, sites, speed, range, alt, text, extra = {}) => ({ genus, phylum, hint, plan, o, col, col2, habit, at: sites, depth: [0.5, 300], dens: 0, speed, range, alt, text, ...extra });
const GO = (d, depth = [1, 60], more) => at("gogo", d, depth, more), MG = (d, depth = [0.6, 20], more) => at("miguasha", d, depth, more), FR = (d, depth = [0.4, 8], more) => at("fram", d, depth, more),
  LD = (d, depth = [0.4, 10], more) => at("lode", d, depth, more), SC2 = (d, depth = [0.3, 6], more) => at("scaat", d, depth, more), both = (...xs) => Object.assign({}, ...xs);
const FAUNA = [
  // --- Gogo reef and basin
  S("Eastmanosteus calliaspis", PL, "a big armoured predator", "fish2", { L: 1.2, armour: true, deep: 0.15, wide: 0.11 }, 0x4a4a48, 0xc8c4b8, "hunt", GO(0.06, [3, 120]), 0.6, 10, [1, 8], "An arthrodire placoderm up to ~1.5 m, the top predator of the Gogo reef: its head and chest were encased in bony armour hinged at the neck, so it could fling its head back to open its jaws, which were sharp bony blades rather than teeth.", { cap: 5 }),
  S("Onychodus jandemarrai", SA, "a tusked lobe-finned predator", "fish2", { L: 0.6, lobe: true, second: true }, 0x4e4a3e, 0xc8c0a8, "hunt", GO(0.06, [2, 60]), 0.4, 6, [0.5, 4], "An onychodont, ~0.5 m (perhaps larger), an ambush predator with a whorl of fang-like tusks at the front of its lower jaw; fossils show it ate arthrodires.", { cap: 5 }),
  S("Mcnamaraspis kaprios", PL, "a small armoured predator", "fish2", { L: 0.45, armour: true }, 0x5a5448, 0xd0c8b4, "hunt", GO(0.3, [2, 60]), 0.5, 5, [0.5, 6], "An arthrodire up to ~0.5 m, an active predator; Western Australia's state fossil emblem."),
  S("Compagopiscis croucheri", PL, "an armoured fish", "fish2", { L: 0.3, armour: true }, 0x5e5848, 0xd0c8b0, "swim", GO(0.4), 0.35, 3, [0.5, 6], "An arthrodire ~30 cm; Gogo fossils preserve its muscles and even its liver."),
  S("Holonema westolli", PL, "a tall-bodied armoured fish", "fish2", { L: 0.7, armour: true, deep: 0.22 }, 0x54503e, 0xc8c0a8, "swim", GO(0.2), 0.2, 3, [0.2, 2], "A deep-bodied arthrodire ~0.5-1 m, perhaps a bottom feeder sifting sediment."),
  S("Incisoscutum ritchiei", PL, "an armoured fish, sometimes pregnant", "fish2", { L: 0.3, armour: true }, 0x5a5444, 0xd0c8ae, "swim", GO(0.25), 0.3, 3, [0.5, 5], "An arthrodire ~30 cm: fossils with embryos inside, and males with claspers, show internal fertilization."),
  S("Rolfosteus canningensis", PL, "a long-snouted armoured fish", "fish2", { L: 0.25, armour: true, shark: true }, 0x5a5a50, 0xd4d0c4, "swim", GO(0.2), 0.4, 4, [1, 8], "A streamlined camuropiscid arthrodire with a long tubular snout, swimming in open water."),
  S("Materpiscis attenboroughi", PL, "a small shell-crushing placoderm", "fish2", { L: 0.28, armour: true, deep: 0.18 }, 0x5e5240, 0xcec4a8, "swim", GO(0.08, [2, 30]), 0.2, 2, [0.2, 1.5], "A ptyctodont ~28 cm that crushed shells on the reef slope. The fossil, named for David Attenborough, holds an embryo attached by an umbilical cord: the oldest known live birth."),
  S("Mimipiscis toombsi", AP, "a small ray-finned fish", "fish2", { L: 0.18 }, 0x6a6a56, 0xe0e0d4, "swim", GO(3, [1, 60]), 0.4, 3, [0.5, 8], "An early ray-finned fish ~20 cm, common in schools; its stomach held conodont animals.", { cap: 60 }),
  S("Moythomasia durgaringa", AP, "a small ray-finned fish", "fish2", { L: 0.15, deep: 0.16 }, 0x6e6a54, 0xe4e0d0, "swim", GO(2), 0.35, 3, [0.5, 8], "A small ray-finned fish 10-20 cm."),
  S("Gogonasus andrewsae", TP, "a lobe-finned fish lurking on the reef", "fish2", { L: 0.35, lobe: true, second: true }, 0x5a503a, 0xc8b898, "swim", GO(0.08, [1, 25]), 0.15, 2, [0.2, 1], "A tetrapodomorph 30-40 cm that lurked on the reef; a large spiracle on its head may have let it gulp air, and its fin bones show the beginnings of a limb."),
  S("Griphognathus whitei", LF, "a long-snouted lungfish", "fish2", { L: 0.5, lobe: true, second: true }, 0x5a5440, 0xc0b494, "swim", GO(0.15, [1, 40]), 0.15, 2, [0.1, 0.8], "A lungfish with a long, duck-like snout for probing the bottom; Gogo has more kinds of lungfish than any other site of its age."),
  S("Chirodipterus australis", LF, "a shell-crushing lungfish", "fish2", { L: 0.4, lobe: true, second: true }, 0x5e5642, 0xc4b898, "swim", GO(0.2, [1, 40]), 0.15, 2, [0.1, 0.8], "A lungfish with crushing tooth plates."),
  S("Gogoselachus lingyuani", SH, "an early shark", "fish2", { L: 0.3, shark: true }, 0x5a5e60, 0xd8dcdc, "swim", GO(0.05), 0.5, 4, [1, 6], "An early shark ~30 cm, its cartilage skeleton partly preserved: a glimpse of how shark skeletons began."),
  S("Montecaris gogoensis", CR, "a swimming shrimp-like crustacean", "arthropod", { L: 0.08, W: 0.025, segs: 8, shell: true, antennae: 0.3, tail: 0.15 }, 0xb08a60, 0xe8d0b0, "swim", GO(4, [1, 80]), 0.1, 2, [0.5, 6], "A phyllocarid crustacean 5-15 cm in a folded carapace; bivalved arthropods like it make up a quarter of all Gogo fossils.", { cap: 60 }),
  S("Adelophthalmus waterstoni", EU, "a small sea scorpion", "eurypterid", { L: 0.1 }, 0x6e5034, 0xc89c70, "crawl", GO(0.1, [1, 20]), 0.03, 1, 0, "A eurypterid ~10 cm, its muscles preserved: a relative of horseshoe crabs and scorpions."),
  S("Manticoceras", CE, "a coiled-shell swimmer", "ammonoid", { D: 0.1 }, 0xc8b490, 0x8a6a4a, "swim", both(GO(1.5, [2, 120]), MG(0.05, [3, 20])), 0.1, 3, [1, 10], "A goniatite ammonoid, the shell ~2-30 cm across: the index fossil of the Frasnian. It swam by jet propulsion, buoyant on gas in its shell chambers.", { bands: true }),
  S("Orthocone nautiloid", CE, "a straight-shelled cephalopod", "nautiloid", { L: 0.5 }, 0xc0a880, 0x7a5a3a, "swim", GO(0.3, [3, 120]), 0.15, 4, [1, 10], "A nautiloid with a long straight cone-shaped shell, a predator of the open water.", { bands: true, cap: 8 }),
  S("Conodont animal", CD, "a little eel with big eyes", "fish2", { L: 0.04, eel: true, deep: 0.05, wide: 0.04 }, 0xd8d0c0, 0xece8e0, "swim", GO(5, [1, 120]), 0.12, 2, [0.5, 10], "An eel-like animal 1-5 cm with large eyes; its tooth-like elements are among the most common fossils of the Paleozoic and are used to date the rocks.", { cap: 60 }),
  S("Phacops", TR, "a big-eyed trilobite", "trilobite", { L: 0.05 }, 0x6a5238, 0xb89a72, "crawl", both(GO(0.8, [2, 40], { reef: -1 }), LD(0.2)), 0.008, 0.5, 0, "A phacopid trilobite 3-6 cm with big compound eyes of separate large lenses; it could roll up into a ball. No Frasnian phacopid survived the Kellwasser extinction.", { bands: true }),
  S("Actinostroma", SP2, "a domed reef sponge", "stromatoporoid", { H: 0.4 }, 0xd8d0b8, 0xa89c84, "sessile", GO(6, [1, 25], { reef: 1 }), 0, 0, 0, "A stromatoporoid, a reef-building sponge that grew lumpy domes and sheets, layer on layer: with calcified microbes, the main builder of the Gogo reefs.", { cap: 60 }),
  S("Stachyodes", SP2, "a branching reef sponge thicket", "bush", { H: 0.3, n: 6 }, 0xd0c8b0, 0xa09078, "sessile", GO(4, [1, 15], { reef: 1 }), 0, 0, 0, "A branching stromatoporoid forming finger-like thickets on the reef flat.", { cap: 60 }),
  S("Phillipsastrea", CO, "a colonial coral", "tabulate", { H: 0.25 }, 0xc8b08a, 0x8a7458, "sessile", GO(2, [2, 25], { reef: 1 }), 0, 0, 0, "A colonial rugose coral; corals were secondary reef builders here."),
  S("Disphyllum", CO, "a horn coral", "horncoral", { H: 0.08 }, 0xc8a880, 0x8a6a4a, "sessile", GO(3, [2, 30]), 0, 0, 0, "A rugose coral, its polyps in horn-shaped cups."),
  S("Alveolites", CO, "a tabulate coral", "tabulate", { H: 0.18 }, 0xd0b890, 0x9a8060, "sessile", GO(2, [2, 25], { reef: 1 }), 0, 0, 0, "A tabulate coral colony of fine tubes."),
  S("Crinoid", EC, "a sea lily on a long stalk", "crinoid", { H: 0.7 }, 0xa86a4a, 0xd8b090, "sessile", GO(3, [4, 60], { reef: -1 }), 0, 0, 0, "A crinoid (sea lily): a cup of feathery arms on a stalk up to ~1 m, catching food from the current; they formed meadows on the reef slopes."),
  S("Atrypa", BR2, "a ribbed brachiopod", "brachiopod", { L: 0.03 }, 0xb8a888, 0x8a7a5a, "sessile", both(GO(4, [2, 50]), LD(1)), 0, 0, 0, "An atrypid brachiopod: brachiopods were among the most common shelled animals on Devonian seafloors."),
  S("Renalcis", MI2, "clotted microbial lumps", "clot", { H: 0.15 }, 0x5a5a50, 0x8a8678, "sessile", GO(8, [1, 25], { reef: 1 }), 0, 0, 0, "Calcified microbes in clotted lumps: together with cement, they made much of the reef's bulk.", { cap: 60 }),
  // --- Miguasha estuary
  S("Eusthenopteron foordi", TP, "a big lobe-finned predator", "fish2", { L: 1.2, lobe: true, second: true }, 0x5a5440, 0xc8c0a0, "hunt", both(MG(0.2), FR(0.1)), 0.5, 6, [0.3, 3], "A tristichopterid up to ~1.5-1.8 m, a fast lunging predator, and one of the most studied fossil fish: the bones of its fins are the same bones as in our arms and legs.", { cap: 6 }),
  S("Elpistostege watsoni", TP, "a flat-headed 'fishapod'", "fish2", { L: 1.5, lobe: true, flat: true, wide: 0.12, deep: 0.09 }, 0x5a5038, 0xc0b090, "hunt", MG(0.02, [0.5, 4]), 0.15, 3, [0.05, 0.4], "An elpistostegalian 1.57 m long, very rare: its fin skeleton contains bones matching our finger bones, the closest a fish has come to a hand.", { cap: 2 }),
  S("Bothriolepis canadensis", PL, "a box-armoured fish with jointed arms", "fish2", { L: 0.35, box: true, deep: 0.1 }, 0x6a5e48, 0xc8bca0, "crawl", MG(3), 0.05, 1.5, 0, "An antiarch placoderm 30-40 cm, the most abundant big fish here (thousands of fossils): its front body was a bony box, with jointed, armoured 'arms' instead of pectoral fins, and it grazed the bottom.", { cap: 40 }),
  S("Scaumenacia curta", LF, "a lungfish", "fish2", { L: 0.45, lobe: true, second: true }, 0x5a5440, 0xc0b494, "swim", MG(0.5), 0.15, 2, [0.1, 0.8], "A lungfish 40-50 cm feeding on the bottom; lungfish could gulp air."),
  S("Fleurantia denticulata", LF, "a long-bodied lungfish", "fish2", { L: 0.5, lobe: true, second: true }, 0x5e5642, 0xc4b898, "swim", MG(0.1), 0.15, 2, [0.1, 0.8], "A rarer lungfish ~50 cm."),
  S("Quebecius quebecensis", SA, "a porolepiform predator", "fish2", { L: 0.5, lobe: true, second: true }, 0x4e4a3a, 0xbcb098, "hunt", MG(0.15), 0.3, 4, [0.2, 2], "A porolepiform lobe-finned predator."),
  S("Miguashaia bureaui", SA, "an early coelacanth", "fish2", { L: 0.4, lobe: true, second: true, deep: 0.17 }, 0x3e4a54, 0xbcc4c8, "swim", MG(0.05), 0.2, 2, [0.3, 2], "An early coelacanth ~40 cm: coelacanths survive today, a 'living fossil' line."),
  S("Cheirolepis canadensis", AP, "an early ray-finned predator", "fish2", { L: 0.35 }, 0x5e5e4c, 0xdcdccc, "hunt", MG(0.4), 0.35, 3, [0.3, 3], "An early ray-finned fish 25-50 cm, a predator with small diamond-shaped scales."),
  S("Plourdosteus canadensis", PL, "an armoured predator of the estuary", "fish2", { L: 0.45, armour: true }, 0x5a5448, 0xd0c8b4, "hunt", MG(0.1), 0.4, 4, [0.3, 3], "The only arthrodire placoderm at Miguasha, ~0.3-0.6 m."),
  S("Triazeugacanthus affinis", AC, "a tiny spiny-finned fish, in schools", "fish2", { L: 0.06, second: true }, 0x8a8a7a, 0xe8e8e0, "swim", MG(8, [0.5, 15]), 0.25, 2, [0.3, 3], "An acanthodian a few cm long, every fin fronted by a spine; thousands of fossils, many young, suggest the estuary was a nursery.", { cap: 80 }),
  S("Diplacanthus", AC, "a spiny-finned fish", "fish2", { L: 0.12, second: true }, 0x7a7a6a, 0xe0e0d4, "swim", MG(1), 0.25, 2, [0.3, 3], "An acanthodian ~10-15 cm."),
  S("Euphanerops longaevus", JL, "a small jawless eel-like fish", "fish2", { L: 0.1, eel: true, deep: 0.07, wide: 0.05 }, 0x6a645a, 0xd0ccc0, "swim", MG(4), 0.15, 1.5, [0.1, 1.5], "A jawless, anaspid-like fish ~10 cm: over 3,500 fossils.", { cap: 60 }),
  S("Escuminaspis laticeps", JL, "a jawless fish with a shield-shaped head", "fish2", { L: 0.08, flat: true, wide: 0.16, deep: 0.06 }, 0x5e5848, 0xbcb498, "crawl", MG(0.6), 0.03, 0.8, 0, "An osteostracan 5-10 cm with a horseshoe-shaped bony head shield, living on the bottom."),
  S("Asmusia membranacea", CR, "a clam shrimp", "brachiopod", { L: 0.008 }, 0xa89070, 0xd8c8a8, "crawl", MG(2), 0.002, 0.2, 0, "A clam shrimp: a small crustacean in a two-valved shell, living today in temporary pools."),
  // --- Fram rivers (Tiktaalik)
  S("Tiktaalik roseae", TP, "the famous 'fishapod'", "fish2", { L: 1.8, lobe: true, flat: true, wide: 0.13, deep: 0.08 }, 0x5a4e36, 0xbcac8a, "hunt", FR(0.03, [0.3, 3]), 0.12, 3, [0.02, 0.3], "Tiktaalik, 1.25-2.75 m: a fish with a flat crocodile-like head, a mobile neck (no other fish has one), lungs and spiracles for gulping air, and sturdy fins with wrist-like joints for propping itself up in the shallows. Found in 2004 by searching rocks of just the right age.", { cap: 3 }),
  S("Qikiqtania wakei", TP, "a smaller elpistostegalian", "fish2", { L: 0.7, lobe: true, flat: true }, 0x5e5238, 0xc0b090, "swim", FR(0.05, [0.5, 6]), 0.2, 3, [0.2, 1.5], "A relative of Tiktaalik under 1 m, apparently an open-water swimmer, its fins better for paddling than propping."),
  S("Laccognathus embryi", SA, "a big-mouthed bottom ambusher", "fish2", { L: 1.6, lobe: true, flat: true, wide: 0.12 }, 0x4a4436, 0xb8ac90, "hunt", FR(0.06, [0.5, 6]), 0.1, 3, [0.02, 0.3], "A porolepiform ~1.5-1.8 m that lay on the bottom and ambushed prey with an enormous mouth.", { cap: 3 }),
  S("Holoptychius bergmanni", SA, "a porolepiform", "fish2", { L: 0.8, lobe: true, second: true }, 0x4e4a3a, 0xbcb098, "hunt", both(FR(0.2), SC2(0.2)), 0.25, 3, [0.2, 2], "A porolepiform lobe-finned predator with big rounded scales."),
  S("Asterolepis", PL, "a box-armoured bottom grazer", "fish2", { L: 0.4, box: true, deep: 0.1 }, 0x6a5e48, 0xc8bca0, "crawl", both(FR(1), LD(1)), 0.04, 1.5, 0, "An antiarch placoderm grazing the river bottom."),
  S("Bothriolepis", PL, "a box-armoured fish", "fish2", { L: 0.3, box: true, deep: 0.1 }, 0x665a44, 0xc4b89c, "crawl", both(FR(1), SC2(1), GO(0.05)), 0.05, 1.5, 0, "An antiarch placoderm, found from Gogo to Scotland to the Arctic: the most widespread placoderm of all."),
  // --- Lode (Panderichthys) and Scaat Craig
  S("Panderichthys rhombolepis", TP, "a flat-headed shallow-water fish", "fish2", { L: 1.1, lobe: true, flat: true, wide: 0.12, deep: 0.08 }, 0x5a5038, 0xc0b090, "hunt", LD(0.08, [0.4, 4]), 0.15, 3, [0.02, 0.3], "A tetrapodomorph ~1 m with a flat head and eyes on top, built for the shallow muddy channels of the delta: a step toward Tiktaalik.", { cap: 4 }),
  S("Laccognathus panderi", SA, "a big-mouthed ambusher", "fish2", { L: 0.9, lobe: true, flat: true, wide: 0.12 }, 0x4a4436, 0xb8ac90, "hunt", LD(0.08), 0.1, 3, [0.02, 0.3], "A porolepiform ambush predator of the Baltic deltas."),
  S("Elginerpeton pancheni", TP, "an early limbed animal", "fish2", { L: 1.5, lobe: true, flat: true }, 0x524a34, 0xb8a888, "hunt", SC2(0.01, [0.3, 3]), 0.1, 3, [0.02, 0.3], "An early tetrapod ~1.5 m, known only from fragments of jaws and limbs: one of the first animals with legs rather than fins (shown here with lobe-fin proportions, since its body is unknown).", { cap: 1 }),
  S("Scaat Craig acanthodian", AC, "a spiny-finned fish", "fish2", { L: 0.1, second: true }, 0x7a7a6a, 0xe0e0d4, "swim", SC2(2), 0.25, 2, [0.2, 2], "Acanthodians were common in the rivers of the Old Red Sandstone."),
  // --- land animals (on land, near you)
  S("Zanclodesmus willetti", LA, "a millipede", "millipede", { L: 0.04 }, 0x3a2a1e, 0x6a5038, "crawl", both(at("miguasha", 6, [-40, 0], { land: 1 }), at("fram", 4, [-40, 0], { land: 1 }), at("scaat", 2, [-40, 0], { land: 1 }), at("lode", 3, [-40, 0], { land: 1 })), 0.01, 0.4, 0, "A millipede a few cm long: millipedes were among the first animals on land, eating rotting plant litter.", { cap: 30 }),
  S("Petaloscorpio bureaui", LA, "a scorpion", "scorpion", { L: 0.05 }, 0x3e2e22, 0x7a6048, "crawl", both(at("miguasha", 0.5, [-40, 0], { land: 1 }), at("fram", 0.4, [-40, 0], { land: 1 }), at("scaat", 0.3, [-40, 0], { land: 1 })), 0.01, 0.5, 0, "A scorpion a few cm long, a predator in the leaf litter.", { cap: 10 }),
  S("Trigonotarbid", LA, "a spider-like arachnid", "arthropod", { L: 0.015, W: 0.012, segs: 5, head: 0.4, taper: 0.3 }, 0x2e241c, 0x5a4838, "crawl", both(at("miguasha", 2, [-40, 0], { land: 1 }), at("fram", 2, [-40, 0], { land: 1 }), at("lode", 1, [-40, 0], { land: 1 })), 0.008, 0.3, 0, "A trigonotarbid 1-2 cm: an extinct relative of spiders, without silk spinners.", { cap: 20 })];
FAUNA.forEach((s, k) => s.k = k * 7.3);
// the plants
const FLORA = [
  { genus: "Archaeopteris", phylum: PT, plan: "archaeopteris", o: { H: 22 }, col: 0x6a9a3e, col2: 0x6a5038, habit: "sessile", dens: 0.45, cap: 3500, biomes: { humid: 1, river: 1.2, plain: 0.2, tidal: 0.05, desert: 0.02, upland: 0.05 }, at: { miguasha: 1, fram: 1, lode: 0.7, scaat: 0.5, gogo: 0.15 },
    text: "Archaeopteris, the first great tree: up to 24-30 m, with a trunk of conifer-like wood up to 1 m across, but leaves in flat fern-like sprays and spores instead of seeds (a progymnosperm). It formed the first forests." },
  { genus: "Lycopsid", phylum: PT, plan: "lycopsid", o: { H: 3 }, col: 0x4e6a30, col2: 0x5a5034, habit: "sessile", dens: 2.5, cap: 4000, wet: true, biomes: { tidal: 0.8, humid: 0.6, river: 0.8, plain: 0.1 }, at: { miguasha: 0.6, fram: 1, lode: 1.2, scaat: 0.6, gogo: 0.1 },
    text: "Small tree lycopsids a few metres tall, their stems covered with spirally arranged small leaves, in the wetlands and deltas; relatives of today's clubmosses and quillworts." },
  { genus: "Cladoxylopsid", phylum: PT, plan: "cladoxylopsid", o: { H: 8 }, col: 0x5a6a34, col2: 0x6a5a3c, habit: "sessile", dens: 0.12, cap: 600, biomes: { humid: 0.4, river: 0.4 }, at: { miguasha: 1, fram: 1, lode: 1, scaat: 1, gogo: 0.2 },
    text: "A cladoxylopsid (like Eospermatopteris/Wattieza): a palm-like tree ~8-10 m with a crown of branchlets and no true leaves; the trees of the oldest forests, declining by now." },
  { genus: "Low plants", phylum: PT, plan: "lowplants", o: { H: 0.5 }, col: 0x5a7a34, col2: 0x6a6a3a, habit: "sessile", dens: 6, cap: 6000, biomes: { plain: 1, humid: 0.8, river: 0.9, tidal: 0.5, desert: 0.15, upland: 0.25 }, at: { miguasha: 1, fram: 1, lode: 1, scaat: 1, gogo: 0.4 },
    text: "Low ground cover: early ferns and fern-like plants, relict leafless plants, and mosses and liverworts on damp ground." }];
function findStart() {   // a beach: dry land a little above the water, with the water within ~200 m; you face it
  for (let r = 0; r < 80000; r += 250) { const n = Math.max(1, Math.round(r / 250 * 6)); for (let q = 0; q < n; q++) { const a = q / n * 6.283, x = r * Math.cos(a), z = r * Math.sin(a), h = baseH(x, z);
      if (h < 0.4 || h > 4) continue; for (let k = 0; k < 16; k++) { const b = k / 16 * 6.283; if (baseH(x + Math.cos(b) * 150, z + Math.sin(b) * 150) < -2 && baseH(x + Math.cos(b) * 60, z + Math.sin(b) * 60) < 0.6) return { x, z, yaw: Math.atan2(-Math.cos(b), -Math.sin(b)) }; } } }
  return { x: 0, z: 0, yaw: -Math.PI / 2 }; }
let START = { x: 0, z: 0, yaw: 0 };

// ---------- the places, all within about ±5 million years of 380 Ma ----------
let DENS_X = 2;
const BIOMES0 = JSON.parse(JSON.stringify(BIOMES));
const SITES = {
  miguasha: { name: "Miguasha estuary, Quebec", where: "Gaspé, Quebec, Canada · then the south-east coast of Euramerica, in the tropics", age: "middle Frasnian, ~380 (to ~375) Ma",
    g: { ox: 0, oz: 0, wetBias: 0.12, carbonate: false, deep: 0.6, mud: [0.40, 0.38, 0.32], sand: [0.62, 0.56, 0.44], stroma: false, reef: false },
    water: [0.16, 0.25, 0.20], murk: 0.09, seaT: 25, traces: 0.8, tubes: 0.4, sky: [[0.32, 0.52, 0.86], [0.80, 0.85, 0.88]],
    zones: { shoal: ["The estuary shallows", "Brackish, tidal water where a river meets the sea; the bottom is sand and mud. Here Bothriolepis grazes in thousands, Eusthenopteron hunts, and schools of tiny acanthodians shelter."], delta: ["The estuary channel", "The deeper, murkier channel of the estuary."], deep: ["The outer estuary", "Deeper water toward the open sea."] },
    arrival: "You arrive on the bank of a warm tropical estuary, about 380 million years ago, in what will become Quebec. Behind you rise the first forests: Archaeopteris trees up to 25 m tall, conifer-like trunks with fern-like leaves. In the brackish water ahead swim the fish of Miguasha: box-armoured Bothriolepis in thousands, the big lobe-finned predator Eusthenopteron, lungfish, an early coelacanth, schools of spiny acanthodians, and, very rarely, Elpistostege, a fish with finger bones." },
  gogo: { name: "Gogo reef, Western Australia", where: "Kimberley, Western Australia · then the margin of Gondwana, ~30°S", age: "late Givetian-early Frasnian, ~384-382 Ma (a little older)",
    g: { ox: 120, oz: -80, wetBias: -0.28, carbonate: true, deep: 3, mud: [0.30, 0.30, 0.28], sand: [0.88, 0.85, 0.76], stroma: false, reef: true },
    water: [0.08, 0.34, 0.46], murk: 0.035, seaT: 24, traces: 0.6, tubes: 0.3, sky: [[0.32, 0.52, 0.86], [0.80, 0.85, 0.88]],
    zones: { shoal: ["The reef and reef flat", "Clear, warm water over the reef: lumpy cream-grey domes of stromatoporoid sponges, finger thickets, crusts of calcified microbes, corals: part of a barrier reef system 1,400 km long."], delta: ["The fore-reef slope", "The reef front drops steeply down a slope of rubble and crinoid meadows into the basin."], deep: ["The Gogo basin", "Hundreds of metres deep and stagnant at the bottom: dead fish sank into black mud and were sealed in stone nodules, preserving even muscles and embryos."] },
    deepNote: "You are over the Gogo basin: its deep water had little or no oxygen at the bottom. The fish lived higher up, near the reef.",
    arrival: "You arrive on a dry shore of Gondwana (today's Western Australia) beside one of the great barrier reefs of the Devonian, 1,400 km long, built by stromatoporoid sponges and microbes rather than modern corals. In the clear water: armoured placoderms like the 1.5 m predator Eastmanosteus, tusked Onychodus, lungfish, early sharks, coiled ammonoids, and Materpiscis, the oldest known mother. (This site is a little older, ~383 Ma.)" },
  fram: { name: "Fram rivers (Tiktaalik), Arctic Canada", where: "Ellesmere Island, Nunavut, Canada · then the north of Euramerica, near the equator", age: "Frasnian, ~375 Ma (loosely dated; a little younger)",
    g: { ox: 300, oz: 40, wetBias: 0.1, carbonate: false, deep: 0.25, mud: [0.38, 0.36, 0.30], sand: [0.60, 0.54, 0.42], stroma: false, reef: false },
    water: [0.18, 0.25, 0.18], murk: 0.13, seaT: 24, traces: 0.6, tubes: 0.2, sky: [[0.32, 0.52, 0.86], [0.80, 0.85, 0.88]],
    zones: { shoal: ["Shallow river channels", "Warm, shallow, fresh water in streams winding across a coastal floodplain: the world of Tiktaalik. (The water here is drawn as broad channels and backwaters.)"], delta: ["The river", "Deeper fresh water in the main channels."], deep: ["Deep channel", "The deepest water of the river system."] },
    arrival: "You arrive on a tropical floodplain in what is now the Canadian Arctic. Streams wind through forests of Archaeopteris and lycopsid wetlands. In the warm shallows lurks Tiktaalik, a 2 m fish with a neck, lungs and wrist-like fins; with it the huge-mouthed ambusher Laccognathus, Holoptychius, Eusthenopteron and armoured Bothriolepis. (This site is a little younger, ~375 Ma.)" },
  lode: { name: "Lode delta, Latvia", where: "Gauja river, Latvia · then the Baltic part of Euramerica, in the tropics", age: "early Frasnian, ~380-383 Ma",
    g: { ox: -200, oz: 60, wetBias: 0.05, carbonate: false, deep: 0.35, mud: [0.42, 0.40, 0.34], sand: [0.64, 0.58, 0.46], stroma: false, reef: false },
    water: [0.18, 0.26, 0.22], murk: 0.14, seaT: 25, traces: 0.7, tubes: 0.3, sky: [[0.32, 0.52, 0.86], [0.80, 0.85, 0.88]],
    zones: { shoal: ["Tidal delta channels", "Shallow, murky, brackish channels of a delta, littered with plant debris: the home of Panderichthys."] },
    arrival: "You arrive in a tropical delta of tidal channels on the Baltic coast of Euramerica. In the shallow, murky, plant-strewn water lives Panderichthys, a 1 m flat-headed fish with eyes on top of its head, a step on the way to Tiktaalik; with it porolepiform ambushers and armoured antiarchs." },
  scaat: { name: "Scaat Craig rivers, Scotland", where: "near Elgin, Scotland · then the Old Red Sandstone continent (Euramerica)", age: "late Frasnian, ~375 Ma (a little younger)",
    g: { ox: 77, oz: 190, wetBias: -0.12, carbonate: false, deep: 0.2, mud: [0.46, 0.34, 0.28], sand: [0.70, 0.52, 0.40], stroma: false, reef: false },
    water: [0.22, 0.25, 0.18], murk: 0.12, seaT: 24, traces: 0.5, tubes: 0.2, sky: [[0.32, 0.52, 0.86], [0.80, 0.85, 0.88]],
    zones: { shoal: ["River channel", "A sandy, pebbly river channel in the red Old Red Sandstone country."] },
    arrival: "You arrive by a river on the semi-arid Old Red Sandstone continent, in what will be Scotland: red soils, sparser plants, forests along the water. In the river live armoured Bothriolepis, acanthodians, porolepiforms, and Elginerpeton, one of the first animals with legs, known only from fragments. (This site is a little younger, ~375 Ma.)" } };
let SITE_KEY = "miguasha", SITE = SITES.miguasha;
let applySite = function (key) { SITE_KEY = key; SITE = SITES[key]; Object.assign(SG, SITE.g);
  ENV.siteLabel = SITE.name; ENV.seaT = SITE.seaT; ENV.murk = SITE.murk; ENV.skyUp = new THREE.Color(...SITE.sky[0]); ENV.skyHor = new THREE.Color(...SITE.sky[1]);
  for (const k in BIOMES0) BIOMES[k] = BIOMES0[k].slice(); Object.assign(BIOMES, SITE.zones || {}); ENV.deepNote = SITE.deepNote || "Deeper, darker water."; ENV.arrival = SITE.arrival; };
applySite("miguasha"); START = findStart();

// ---------- the land's plants: forests and groves streamed in around you ----------
// Each plant kind (FLORA) has a size and a preference for the environments (biomes) and wetness; 24 m cells are filled from
// their seeds out to a few hundred metres, nearest first, so the same trees always stand in the same places.
const FCELL = 24, FRAD = IS_HEADSET ? 260 : 420, FLIFE = [];
for (const fl of FLORA) { const geo = paint(BODY[fl.plan](fl.o), fl), im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), fl.cap ?? 4000);
  im.count = 0; im.frustumCulled = false; scene.add(im); FLIFE.push({ fl, im }); }
function floraAt(x, z) { const b = biomeAt(x, z); if (["shoal", "delta", "deep"].includes(b)) return null; return b; }
let floraAt0 = null;
function refreshFlora() { const ci = Math.floor(P_.x / FCELL), cj = Math.floor(P_.z / FCELL), n = Math.ceil(FRAD / FCELL), cnt = FLIFE.map(() => 0), cells = [];
  for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const d = Math.hypot(i - ci, j - cj) * FCELL; if (d <= FRAD) cells.push([d, i, j]); }
  cells.sort((a, b) => a[0] - b[0]);
  for (const [, i, j] of cells) { const x0 = i * FCELL, z0 = j * FCELL, b = floraAt(x0 + FCELL / 2, z0 + FCELL / 2); if (!b) continue; const r = seeded(i * 6151 + j * 9133 + 77);
    const patch = 0.4 + 1.2 * fbm(x0 / 220 + 13 + SG.ox, z0 / 220, 3);
    FLIFE.forEach((F, k) => { const fl = F.fl, w = (fl.biomes[b] ?? 0) * (fl.at?.[SITE_KEY] ?? (fl.at ? 0 : 1)); if (!w) return; let lam = fl.dens * w * patch * FCELL * FCELL / 100, m = Math.floor(lam) + (r() < lam % 1 ? 1 : 0);
      while (m-- > 0 && cnt[k] < F.im.instanceMatrix.count) { const x = x0 + r() * FCELL, z = z0 + r() * FCELL, h = baseH(x, z); if (h < SEA + 0.15 && !fl.wet) continue;
        const s = 0.6 + r() * 0.7; O3.position.set(x, h - 0.05, z); O3.rotation.set((r() - 0.5) * 0.08, r() * 6.28, (r() - 0.5) * 0.08); O3.scale.setScalar(s); O3.updateMatrix(); F.im.setMatrixAt(cnt[k]++, O3.matrix); } }); }
  FLIFE.forEach((F, k) => { F.im.count = cnt[k]; F.im.instanceMatrix.needsUpdate = true; }); }

// ---------- placing and moving the animals ----------
// The seafloor is divided into 16 m cells; each cell's animals are fixed by its seed (species by depth and abundance), so the
// same animals are always in the same places. Only the cells around you are filled (in this murky water you can see ~10-20 m).
const LCELL = 16, LR = IS_HEADSET ? 30 : 40, LIFE = [];
for (const sp of FAUNA) { const geo = paint(BODY[sp.plan](sp.o), sp), mat = sp.glass ? new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: sp.shimmer ? 0.25 : 0.7, metalness: sp.shimmer ? 0.55 : 0.0 }), cap = sp.cap ?? 40, im = new THREE.InstancedMesh(geo, mat, cap);
  im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); const L = { sp, im, cap, act: [] };
  if (sp.plan === "ctenophore") { L.comb = new THREE.InstancedMesh(BODY.combs(sp.o), new THREE.MeshBasicMaterial({ color: 0x88ffee, transparent: true, opacity: 0.8, toneMapped: false }), cap); L.comb.count = 0; L.comb.frustumCulled = false; scene.add(L.comb); }
  LIFE.push(L); }
function cellAnimals(ci, cj) { const r = seeded(ci * 92821 + cj * 68917 + 3), out = [], x0 = ci * LCELL, z0 = cj * LCELL;
  const d = -baseH(x0 + LCELL / 2, z0 + LCELL / 2), onLand = d < 0.3;                            // sea animals in the sea; land animals on land
  const reef = SG.reef ? reefAt(x0 + LCELL / 2, z0 + LCELL / 2) : 0;
  for (const L of LIFE) { const sp = L.sp, at = sp.at?.[SITE_KEY]; if (!at || !!at.land !== onLand) continue; const [d0, d1] = at.depth ?? sp.depth; if (!onLand && (d < d0 || d > d1)) continue;
    const lam = at.dens * DENS_X * LCELL * LCELL / 100 * (0.5 + fbm(x0 / 90 + sp.k, z0 / 90, 2)) * (at.reef === 1 ? reef : at.reef === -1 ? 1 - reef : 1);   // patchy; reef builders only on the reefs
    let n = Math.floor(lam) + (r() < lam % 1 ? 1 : 0); while (n-- > 0) out.push({ L, x: x0 + r() * LCELL, z: z0 + r() * LCELL, s: 0.75 + r() * 0.5, ph: r() * 100, h: r() * 6.28, lift: r() }); }
  return out; }
const CELLS = new Map(); let lifeAt = null, ACTIVE = [];
function refreshLife() { const ci = Math.floor(P_.x / LCELL), cj = Math.floor(P_.z / LCELL), n = Math.ceil(LR / LCELL), keep = new Set(); ACTIVE = [];
  for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const k = i + "," + j; keep.add(k); if (!CELLS.has(k)) CELLS.set(k, cellAnimals(i, j)); }
  for (const k of CELLS.keys()) if (!keep.has(k)) CELLS.delete(k);
  for (const L of LIFE) L.act = [];
  const all = []; for (const k of keep) for (const a of CELLS.get(k)) { a.d = Math.hypot(a.x - P_.x, a.z - P_.z); if (a.d < LR && (a.L.sp.at[SITE_KEY].land || (a.floor ?? baseH(a.x, a.z)) < SEA - 0.3)) all.push(a); }   // none stranded by a low tide
  all.sort((a, b) => a.d - b.d); for (const a of all) if (a.L.act.length < a.L.cap) { a.L.act.push(a); ACTIVE.push(a); } }
// rocks strewn over the bare land: boulders and slabs of weathered bedrock (no soil or plants to hide them)
const ROCKS = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.95, flatShading: true }), 1600); ROCKS.count = 0; ROCKS.frustumCulled = false; scene.add(ROCKS);
// reefs: where the shallow carbonate shelf builds mounds of archaeocyath sponges and calcimicrobes
function reefAt(x, z) { const h = baseH(x, z); if (h > -1.5 || h < -25) return 0; return sstepN(fbm(x / 160 + 41 + SG.ox, z / 160 - 9, 3), 0.48, 0.6) * sstepN(-h, 1.5, 3); }
// stromatolites (carbonate coasts only): knobbly domes and columns of layered microbial carbonate, a living dark mat on top
const STROMA_G = (() => { const P = []; for (let k = 0; k < 9; k++) { const a = k * 2.4, r = k ? 0.55 : 0; P.push([new THREE.SphereGeometry(1, 9, 6), TM(Math.cos(a) * r * 0.6, 0.25 + (k ? 0 : 0.15), Math.sin(a) * r * 0.6, k ? 0.45 : 0.75, k ? 0.45 : 0.6, k ? 0.45 : 0.75)]); } return paint(mergeG(P), { col: 0x2e3428, col2: 0x7a7060, plan: "x", o: {} }); })();
const STROMA = new THREE.InstancedMesh(STROMA_G, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), 700); STROMA.count = 0; STROMA.frustumCulled = false; scene.add(STROMA);
// traces on the seafloor: burrow openings, trails, worm tubes, empty shells and moults (the litter of a living seafloor)
const TR_HOLE = new THREE.InstancedMesh(new THREE.TorusGeometry(0.012, 0.006, 4, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3428, roughness: 1 }), 1500);
const TR_TRAIL = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2e2a22, roughness: 1, transparent: true, opacity: 0.45, depthWrite: false }), 900);
const TR_TUBE = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.005, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 }), 900);
const TR_SHELL = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb8ac90, roughness: 0.8 }), 900);
for (const m of [TR_HOLE, TR_TRAIL, TR_TUBE, TR_SHELL]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
let tracesAt = null;
function refreshTraces() { const C = 8, ci = Math.floor(P_.x / C), cj = Math.floor(P_.z / C), n = IS_HEADSET ? 3 : 4, cnt = [0, 0, 0, 0], T = [TR_HOLE, TR_TRAIL, TR_TUBE, TR_SHELL], cap = [1500, 900, 900, 900];
  const put = (k, x, y, z, ry, sx, sy, sz) => { if (cnt[k] >= cap[k]) return; O3.position.set(x, y, z); O3.rotation.set(0, ry, 0); O3.scale.set(sx, sy, sz); O3.updateMatrix(); T[k].setMatrixAt(cnt[k]++, O3.matrix); };
  for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const x0 = i * C, z0 = j * C, h0 = baseH(x0, z0); if (h0 > -0.4 || h0 < -55) continue;
    const r = seeded(i * 5813 + j * 2711 + 17), bio = SITE.traces * (0.4 + fbm(x0 / 40 + 3, z0 / 40, 2));
    for (let q = 0; q < 14 * bio; q++) { const x = x0 + r() * C, z = z0 + r() * C; put(0, x, baseH(x, z) + 0.003, z, 0, 0.6 + r(), 1, 0.6 + r()); }
    for (let q = 0; q < 5 * bio; q++) { let x = x0 + r() * C, z = z0 + r() * C, a = r() * 6.28; const w = 0.006 + r() * 0.02; for (let s2 = 0; s2 < 6; s2++) { a += (r() - 0.5) * 0.8; const L = 0.06 + r() * 0.08; put(1, x, baseH(x, z) + 0.004, z, a, w, 1, L); x += Math.sin(a) * L; z += Math.cos(a) * L; } }
    for (let q = 0; q < 6 * bio * SITE.tubes; q++) { const x = x0 + r() * C, z = z0 + r() * C; put(2, x, baseH(x, z) - 0.01, z, r() * 6, 1, 0.02 + r() * 0.05, 1); }
    for (let q = 0; q < 5 * bio; q++) { const x = x0 + r() * C, z = z0 + r() * C, sz = 0.003 + r() * 0.01; put(3, x, baseH(x, z), z, r() * 6, sz, sz * 0.4, sz * 1.3); } }
  T.forEach((m, k) => { m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; }); }
let rocksAt = null; const RCELL = 32;
function refreshRocks() { const ci = Math.floor(P_.x / RCELL), cj = Math.floor(P_.z / RCELL), n = 6, c = new THREE.Color(); let k = 0;
  let km = 0; if (SG.stroma) for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const x0 = i * RCELL, z0 = j * RCELL, h0 = baseH(x0, z0); if (h0 > 1.2 || h0 < -4) continue;   // stromatolites: intertidal and just below
    const r = seeded(i * 4421 + j * 9907 + 5), nd = 22 * sstepN(fbm(x0 / 200 + 8, z0 / 200, 3), 0.42, 0.6);
    for (let q = 0; q < nd && km < 700; q++) { const x = x0 + r() * RCELL, z = z0 + r() * RCELL, s = 0.15 + Math.pow(r(), 2) * 0.9, col = r() < 0.3; O3.position.set(x, baseH(x, z) - 0.08, z); O3.rotation.set(0, r() * 6, 0); O3.scale.set(s, s * (col ? 2.2 : 0.8 + 0.4 * r()), s); O3.updateMatrix(); STROMA.setMatrixAt(km++, O3.matrix); } }
  STROMA.count = km; STROMA.instanceMatrix.needsUpdate = true;
  for (let i = ci - n; i <= ci + n && k < 1600; i++) for (let j = cj - n; j <= cj + n && k < 1600; j++) { const x0 = i * RCELL, z0 = j * RCELL, m = landMask(x0, z0); if (m < 0.002) continue;
    const r = seeded(i * 7717 + j * 3301 + 9), dens = 14 * sstepN(fbm(x0 / 300 + 3, z0 / 300, 3), 0.45, 0.7) * (1 - 0.7 * sstepN(fbm(x0 / 1800 + 50, z0 / 1800, 3), 0.5, 0.65));
    for (let q = 0; q < dens && k < 1600; q++) { const x = x0 + r() * RCELL, z = z0 + r() * RCELL, s = 0.15 + Math.pow(r(), 3) * 1.6, flat = r() < 0.4;
      O3.position.set(x, baseH(x, z) - s * 0.3, z); O3.rotation.set(r() * 3, r() * 6, r() * 3); O3.scale.set(s * (flat ? 1.8 : 1), s * (flat ? 0.4 : 0.8), s * (flat ? 1.4 : 1)); O3.updateMatrix(); ROCKS.setMatrixAt(k, O3.matrix);
      c.setHSL(0.06 + 0.04 * r(), 0.12 + 0.12 * r(), 0.36 + 0.2 * r()); ROCKS.setColorAt(k, c); k++; } }
  ROCKS.count = k; ROCKS.instanceMatrix.needsUpdate = true; if (ROCKS.instanceColor) ROCKS.instanceColor.needsUpdate = true; }
const _po = V3(0, 0, 0);
function animalPos(a, t, out) { const sp = a.L.sp, L = sp.o.L ?? sp.o.H ?? sp.o.R * 2, w = t * (sp.speed ?? 0.3) / Math.max(0.3, sp.range ?? 1) + a.ph;
  let x = a.x, z = a.z, h = a.h, floor, y;
  if (sp.habit === "crawl" || sp.habit === "swim" || sp.habit === "hunt" || sp.habit === "drift") { const R = (sp.range ?? 1) * (0.6 + a.lift); x = a.x + R * Math.sin(w); z = a.z + R * Math.sin(w * 0.77 + 1.3) * Math.cos(w * 0.31);
    const dx = R * Math.cos(w), dz = R * (0.77 * Math.cos(w * 0.77 + 1.3) * Math.cos(w * 0.31) - 0.31 * Math.sin(w * 0.77 + 1.3) * Math.sin(w * 0.31)); h = Math.atan2(dx, dz); }
  floor = a.floor ?? (a.floor = baseH(a.x, a.z));                                  // the floor where it lives (it barely changes over its small range)
  if (sp.habit === "crawl") y = floor + 0.002; else if (sp.habit === "burrow") y = floor - L * (sp.bury ?? 0.3); else if (sp.habit === "sessile") y = floor;
  else { const [h0, h1] = sp.alt ?? [0.3, 2]; y = floor + h0 + (h1 - h0) * a.lift + 0.15 * Math.sin(t * 0.7 + a.ph); y = Math.min(y, SEA - 0.4); }
  out.set(x, y, z); return h; }
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _sc = V3(1, 1, 1), _mm = new THREE.Matrix4(), _cc = new THREE.Color();
function updateLife(t, dt) { if (!rocksAt || Math.hypot(P_.x - rocksAt[0], P_.z - rocksAt[1]) > 40) { refreshRocks(); rocksAt = [P_.x, P_.z]; }
  if (!tracesAt || Math.hypot(P_.x - tracesAt[0], P_.z - tracesAt[1]) > 8) { refreshTraces(); tracesAt = [P_.x, P_.z]; } if (!lifeAt || Math.hypot(P_.x - lifeAt[0], P_.z - lifeAt[1]) > 4 || t - lifeAt[2] > 2) { refreshLife(); lifeAt = [P_.x, P_.z, t]; }
  for (const L of LIFE) { const sp = L.sp; L.act.forEach((a, i) => { const h = animalPos(a, t, _po); a.px = _po.x; a.py = _po.y; a.pz = _po.z;
      const sway = sp.habit === "sessile" || sp.habit === "burrow" ? 0.12 * Math.sin(t * 0.8 + a.ph) : 0, roll = sp.habit === "drift" ? t * 0.3 + a.ph : 0;
      _e.set(sway + (sp.habit === "swim" || sp.habit === "hunt" ? 0.08 * Math.sin(t * 2 + a.ph) : 0), sp.habit === "sessile" || sp.habit === "burrow" ? a.h : h, sway * 0.6, "YXZ"); _q.setFromEuler(_e);
      if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), roll)); _sc.setScalar(a.s); _mm.compose(_po, _q, _sc); L.im.setMatrixAt(i, _mm);
      if (L.comb) { L.comb.setMatrixAt(i, _mm); _cc.setHSL((t * 0.25 + a.ph * 0.1 + i * 0.07) % 1, 0.9, 0.6); L.comb.setColorAt(i, _cc); } });   // comb rows scatter light into moving rainbows
    L.im.count = L.act.length; L.im.instanceMatrix.needsUpdate = true; if (L.comb) { L.comb.count = L.act.length; L.comb.instanceMatrix.needsUpdate = true; if (L.comb.instanceColor) L.comb.instanceColor.needsUpdate = true; } } }
function nearestAnimal(r) { const c = camera.getWorldPosition(V3(0, 0, 0)); let best = null, bd = r;
  for (const a of ACTIVE) { if (a.px === undefined) continue; const d = Math.hypot(a.px - c.x, a.py - c.y, a.pz - c.z); if (d < bd) { bd = d; best = a; } } return best ? { sp: best.L.sp, a: best } : null; }

// ---------- the day: air, sun, moon, tides (values from the literature: see ENV) ----------
const DAY_REAL_MIN = 30;                                    // real minutes for one whole day
let clockH = ENV.startHour;                                  // local solar time, on a day of ENV.dayH hours
scene.fog = new THREE.FogExp2(0xc8d0d4, IS_HEADSET ? 0.00016 : 0.00011);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xc4d4e4, 0x8a7a64, 1.0); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(420, 24), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false, toneMapped: false })); scene.add(sunDisc);
const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(420 * ENV.moonScale, 32), new THREE.MeshBasicMaterial({ color: 0xe8e8e0, fog: false, transparent: true })); scene.add(moonDisc);
// the sea surface, seen from above and from below; murky water under it
const waterMat = new THREE.MeshStandardMaterial({ color: 0x4a6a62, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false,
  map: tex(256, 256, speckle("#ffffff", 1400, ["#d0dcd8", "#ffffff", "#b8c8c4"], 6, 1.2), [6000, 6000]) });
const water = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000).rotateX(-Math.PI / 2), waterMat); water.renderOrder = 2; scene.add(water);
let SEA = 0;                                                  // the sea level now (the tide)
// particles drifting in the water: organic flecks, silt ("marine snow")
const NSNOW = IS_HEADSET ? 500 : 1200, snowPos = new Float32Array(NSNOW * 3); for (let i = 0; i < NSNOW * 3; i++) snowPos[i] = (rnd() - 0.5) * 30;
const snow = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(snowPos, 3)), new THREE.PointsMaterial({ color: 0xc8c8b0, size: 0.03, transparent: true, opacity: 0.6 }));
snow.frustumCulled = false; scene.add(snow);

// ---------- you: a biologist with scuba gear ----------
const keys = {}; let yaw = START.yaw ?? -Math.PI / 2, pitch = -0.08, dragging = false, started = false, flying = false, fast = 0;
const P_ = { x: START.x, z: START.z, y: 0 }; yaw = START.yaw; P_.y = baseH(P_.x, P_.z);
const TANK = { bar: 200, litres: 12 }, PACE = [1, 3, 10, 30, 100, 400]; let swimming = false, depthNow = 0, maxDepth = 0, diveMin = 0;
const intro = document.getElementById("intro");
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(12,24,28,.74);color:#e6f0ee;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:600px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(12,24,28,.86);color:#e6f0ee;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:780px;display:none";
const JOURNAL = document.createElement("div"); JOURNAL.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(12,24,28,.74);color:#e6f0ee;padding:10px 12px;border-radius:10px;font:12.5px/1.45 -apple-system,Helvetica,sans-serif;max-height:calc(100vh - 300px);overflow-y:auto;min-width:230px;max-width:290px";
const WRISTC = document.createElement("canvas"); WRISTC.width = 512; WRISTC.height = 400; WRISTC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:14px;width:280px;height:219px;border:2px solid rgba(90,200,190,.6)";
document.body.append(HUD, MSG, JOURNAL, WRISTC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 14) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone"); say(ENV.arrival, 22); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyE") interact(); if (e.code === "KeyF") flying = !flying; if (e.code === "Equal") fast = Math.min(5, fast + 1); if (e.code === "KeyT") toggleTravel(); if (e.code === "Minus") fast = Math.max(0, fast - 1); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// the wrist computer: date and time, the air (on land) or depth, water and tank (in the sea), and your species count
function drawWrist(g, W, H) { g.clearRect(0, 0, W, H); g.fillStyle = "rgba(8,20,24,.92)"; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
  g.strokeStyle = "#5ac8be"; g.lineWidth = 4; g.stroke(); const t = (s, x, y, sz, col = "#e6f0ee", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; g.fillText(s, x, y); };
  const hh = Math.floor(clockH), mm = Math.floor((clockH % 1) * 60);
  t(`${ENV.dateLabel.replace("about ", "~").replace(" million years ago", " Ma")} · ${SITE.name.split(",")[0]}`, 22, 42, 26, "#9ae8de", 700); t(`${hh}:${String(mm).padStart(2, "0")} of a ${ENV.dayH}-hour day  ·  tide ${SEA >= 0 ? "+" : ""}${SEA.toFixed(1)} m`, 22, 78, 22);
  if (swimming || depthNow > 0.3) { const air = TANK.bar, low = air < 50;
    t(`depth ${depthNow.toFixed(1)} m  (max ${maxDepth.toFixed(1)})`, 22, 128, 34, "#ffffff", 700);
    t(`air tank ${Math.round(air)} bar${low ? "  · LOW: surface!" : ""}`, 22, 172, 30, low ? "#ff8a6a" : "#ffe9a8", 700);
    t(`water ${ENV.seaT} °C  ·  dive ${Math.floor(diveMin)} min`, 22, 212, 24);
    t(`pressure ${(1 + depthNow / 10.06).toFixed(2)} atm`, 22, 246, 22, "#a8c8c4"); }
  else { t(`air: O₂ ${ENV.O2pct}%  (est. ${ENV.O2range}; today 21%)`, 22, 128, 28, "#ffffff", 700); t(ENV.CO2text, 22, 168, 21, "#ffe9a8", 600);
    t(`air ${ENV.airT} °C  ·  sun ${Math.round(ENV.sunL * 100)}% of today's`, 22, 206, 22); t(`air tank ${Math.round(TANK.bar)} bar (a full tank is 200 bar)`, 22, 240, 22, "#a8c8c4"); }
  const hd = ((Math.round(-yawNow() * 180 / Math.PI) % 360) + 360) % 360; t(`heading ${hd}° ${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(hd / 45) % 8]}`, 22, 290, 22);
  if (biomeNow) t(BIOMES[biomeNow][0], 300, 290, 20, "#ffe9a8", 600);
  t(`species identified: ${LOGGED.size}  ·  T: travel anywhere`, 22, 330, 22, "#9ae8de", 600);
  t(swimming ? "E: examine the nearest animal" : "walk into the sea to dive; E: examine", 22, 370, 18, "#7a9a98"); }
function yawNow() { const d = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(-d.x, -d.z); }
// the species journal: an animal is logged when you examine it (E) close up
const ALLSP = [...FAUNA, ...FLORA], LOGGED = new Set(), PLACES_SEEN = new Set(); let biomeNow = null, biomeT = 0;
function drawJournal() { const byP = {}; for (const s of ALLSP) if (s.at[SITE_KEY] || LOGGED.has(s)) (byP[s.phylum] = byP[s.phylum] || []).push(s);
  JOURNAL.innerHTML = `<b>Environments</b> · ${PLACES_SEEN.size} of ${Object.keys(BIOMES).length}<br>` + Object.entries(BIOMES).map(([k, [n]]) => PLACES_SEEN.has(k) ? `<div data-b="${k}" style="padding-left:8px;cursor:pointer">✦ ${n}</div>` : `<div style="padding-left:8px;color:#5a7a78">· ?</div>`).join("") + `<div style="margin-top:8px"></div><b>Field notebook</b> · ${LOGGED.size} species identified<br><span style="color:#8ab0ac;font-size:11.5px">swim close to an animal and press E to examine it</span>` +
    Object.entries(byP).map(([p, L]) => `<div style="margin-top:5px;color:#9ae8de;font-weight:600">${p} <span style="color:#6a8a88;font-weight:400">${L.filter(s => LOGGED.has(s)).length}/${L.length}</span></div>` +
      L.map(s => LOGGED.has(s) ? `<div data-g="${ALLSP.indexOf(s)}" style="padding-left:8px;cursor:pointer">✦ <i>${s.genus}</i></div>` : `<div style="padding-left:8px;color:#5a7a78">· ${s.hint}</div>`).join("")).join(""); }
// travel between the places of this moment (the time machine hops across the globe, not through time)
function goSite(key) { applySite(key); START = findStart(); P_.x = START.x; P_.z = START.z; P_.y = baseH(P_.x, P_.z); yaw = START.yaw; if (renderer.xr.isPresenting) vrTurn = yaw; flying = false;
  for (const L of LEVELS) { L.ox = NaN; L.oz = NaN; } CELLS.clear(); lifeAt = null; floraAt0 = null; rocksAt = null; tracesAt = null; biomeNow = null; TANK.bar = 200; updateGround(P_.x, P_.z, 99); drawJournal();
  say(`<b>${SITE.name}</b> · ${SITE.where} · ${SITE.age}<br>${SITE.arrival}`, 30); }
// the travel panel: jump to any of the places, or click anywhere on the map of the land and sea around you
const TRAVEL = document.createElement("div"); TRAVEL.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;background:rgba(10,22,26,.95);color:#e6f0ee;padding:16px 18px;border-radius:14px;font:14px/1.5 -apple-system,Helvetica,sans-serif;display:none;box-shadow:0 20px 60px rgba(0,0,0,.5)";
const TBTN = document.createElement("button"); TBTN.textContent = "🌍 Travel (T)"; TBTN.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:3;padding:8px 16px;font:600 14px -apple-system,sans-serif;border:0;border-radius:10px;background:#2a6a66;color:#fff;cursor:pointer";
document.body.append(TRAVEL, TBTN); TBTN.onclick = e => { e.stopPropagation(); start(); toggleTravel(); };
const TMAP = document.createElement("canvas"); TMAP.width = TMAP.height = 420; TMAP.style.cssText = "width:420px;height:420px;border-radius:10px;cursor:crosshair;display:block;margin-top:8px";
let mapSpan = 40000;
function drawTravelMap() { const g = TMAP.getContext("2d"), N = 140, img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = P_.x + (i / N - 0.5) * mapSpan, z = P_.z + (j / N - 0.5) * mapSpan, h = baseH(x, z), k = 4 * (j * N + i); let r, gg, b;
    if (h < 0) { const d = Math.min(1, -h / (60 * SG.deep)); r = 70 - 40 * d; gg = 140 - 70 * d; b = 150 - 40 * d; } else { const w = wetness(x, z); r = 190 - 60 * Math.min(1, h / 120) - 60 * Math.max(0, w - 0.5) * 4; gg = 160 - 50 * Math.min(1, h / 120) - 30 * Math.max(0, w - 0.5) * 4; b = 120 - 30 * Math.min(1, h / 120); }
    img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255; }
  const tmp = document.createElement("canvas"); tmp.width = tmp.height = N; tmp.getContext("2d").putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, 420, 420);
  g.fillStyle = "#ff5a3a"; g.beginPath(); g.arc(210, 210, 6, 0, 6.283); g.fill(); g.fillStyle = "#fff"; g.font = "600 13px -apple-system,sans-serif"; g.fillText(`you · map ${mapSpan / 1000} km across · north is up · click anywhere to go there`, 10, 410); }
function toggleTravel() { if (TRAVEL.style.display !== "none") { TRAVEL.style.display = "none"; return; }
  TRAVEL.innerHTML = `<b style="font-size:17px">Travel</b> · about 380 million years ago (sites within ~±5 million years)<div style="color:#8ab0ac;font-size:12.5px">Jump to another place on Earth at this time, or click the map to go anywhere nearby. Everything is open; there is nothing to unlock.</div>` +
    Object.entries(SITES).map(([k, S]) => `<div data-s="${k}" style="padding:4px 8px;margin-top:3px;border-radius:7px;cursor:pointer;background:${k === SITE_KEY ? "#2a4a46" : "#16282c"}">${k === SITE_KEY ? "▸" : "⤳"} <b>${S.name}</b> <span style="color:#8ab0ac;font-size:12px">· ${S.age}</span></div>`).join("") +
    `<div style="margin-top:6px">Map: <button data-z="10000">10 km</button> <button data-z="40000">40 km</button> <button data-z="150000">150 km</button> &nbsp; <button data-x="1">close</button></div>`;
  TRAVEL.append(TMAP); drawTravelMap(); TRAVEL.style.display = "block"; }
TRAVEL.addEventListener("click", e => { e.stopPropagation(); const s = e.target.closest("[data-s]"); if (s) { TRAVEL.style.display = "none"; goSite(s.dataset.s); return; }
  if (e.target.dataset.z) { mapSpan = +e.target.dataset.z; drawTravelMap(); return; } if (e.target.dataset.x) { TRAVEL.style.display = "none"; return; }
  if (e.target === TMAP) { const r = TMAP.getBoundingClientRect(), x = P_.x + ((e.clientX - r.left) / r.width - 0.5) * mapSpan, z = P_.z + ((e.clientY - r.top) / r.height - 0.5) * mapSpan; TRAVEL.style.display = "none"; jumpTo(x, z); } });
function jumpTo(x, z) { P_.x = x; P_.z = z; const g = baseH(x, z); P_.y = g < SEA - 1.3 ? SEA + 0.3 - camera.position.y : g; flying = false; lifeAt = null; rocksAt = null; tracesAt = null; updateGround(P_.x, P_.z, 99);
  floraAt0 = null; say(g < SEA - 1.3 ? `You are floating at the surface, over ${(-g).toFixed(0)} m of water. Dive with C (or look down and swim).` : "You arrive on land.", 8); }
// the hand lens: an examined animal floats in front of you, magnified, turning slowly, until you look away or press E again
const LENS = new THREE.Group(); LENS.visible = false; camera.add(LENS); let lensT = 0;
const lensLight = new THREE.PointLight(0xffffff, 1.2, 2, 1); lensLight.position.set(0.2, 0.3, 0.2); LENS.add(lensLight);
const lensC = document.createElement("canvas"); lensC.width = 512; lensC.height = 96; const lensTex = new THREE.CanvasTexture(lensC); lensTex.colorSpace = THREE.SRGBColorSpace;
const lensLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.06), new THREE.MeshBasicMaterial({ map: lensTex, transparent: true, depthTest: false, toneMapped: false, fog: false })); lensLabel.position.set(0, -0.15, 0); lensLabel.renderOrder = 21; LENS.add(lensLabel);
function showLens(sp) { while (LENS.children.length > 2) LENS.remove(LENS.children[2]); const L = LIFE.find(q => q.sp === sp) || FLIFE.find(q => q.fl === sp), size = sp.o.L ?? sp.o.H ?? sp.o.D ?? sp.o.R * 2, k = 0.22 / size;
  const m = new THREE.Mesh(L.im.geometry, L.im.material.clone()); m.material.fog = false; if (sp.glass) m.material.opacity = 0.5; m.scale.setScalar(k); const piv = new THREE.Group(); piv.add(m);
  const box = new THREE.Box3().setFromObject(m); m.position.sub(box.getCenter(V3(0, 0, 0))); LENS.add(piv); LENS.userData.piv = piv;
  if (L.comb) { const c = new THREE.Mesh(L.comb.geometry, L.comb.material); c.scale.setScalar(k); c.position.copy(m.position); piv.add(c); }
  const g = lensC.getContext("2d"); g.clearRect(0, 0, 512, 96); g.fillStyle = "rgba(8,20,24,.8)"; g.beginPath(); g.roundRect(0, 0, 512, 96, 16); g.fill();
  g.fillStyle = "#9ae8de"; g.font = "italic 600 34px -apple-system, Helvetica, sans-serif"; g.fillText(sp.genus.split(" ")[0], 18, 42);
  g.fillStyle = "#e6f0ee"; g.font = "26px -apple-system, Helvetica, sans-serif"; g.fillText(`shown ×${k >= 10 ? Math.round(k) : k.toFixed(1)}  ·  real length ${size >= 0.1 ? (size * 100).toFixed(0) : (size * 100).toFixed(1)} cm`, 18, 80); lensTex.needsUpdate = true;
  LENS.position.set(0, -0.02, -0.55); LENS.visible = true; lensT = 22; }
function speciesCard(sp, first) { const G = GROUPS[sp.phylum] || {}; return `<b><i>${sp.genus}</i></b> <span style="color:#9ae8de">· ${G.formal || sp.phylum}</span>${first ? " · <b>new to your journal</b>" : ""}<br>${sp.text}<br><span style="color:#bfe8c8">🧬 ${G.kin || ""}</span><br><span style="color:#a8b8b4;font-size:13px">🎨 ${G.col || ""}</span>`; }
JOURNAL.addEventListener("click", e => { const ss = e.target.closest("[data-s]"); if (ss) { e.stopPropagation(); start(); goSite(ss.dataset.s); return; } const bb = e.target.closest("[data-b]"); if (bb) { e.stopPropagation(); const [n, tx] = BIOMES[bb.dataset.b]; say(`<b>${n}</b> · ${tx}`, 20); return; } const d = e.target.closest("[data-g]"); if (!d) return; e.stopPropagation(); const sp = ALLSP[+d.dataset.g]; showLens(sp); say(speciesCard(sp, false), 32); });
function nearestPlant(r) { const c = camera.getWorldPosition(V3(0, 0, 0)), m = new THREE.Matrix4(), p = V3(0, 0, 0); let best = null, bd = r;
  for (const F of FLIFE) for (let i = 0; i < F.im.count; i++) { F.im.getMatrixAt(i, m); p.setFromMatrixPosition(m); const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < bd) { bd = d; best = F.fl; } } return best ? { sp: best } : null; }
function interact() { if (!started) return start(); if (LENS.visible) { LENS.visible = false; return; } const s = nearestAnimal(swimming ? 3.5 : 2.5) || (!swimming ? nearestPlant(4) : null);
  if (s) { const first = !LOGGED.has(s.sp); LOGGED.add(s.sp); drawJournal(); showLens(s.sp); say(speciesCard(s.sp, first), 32); return; }
  say(swimming ? "No animal close enough to examine. Look along the seafloor and in the water around you; many are only a few centimetres long." : ENV.landNote, 14); }

// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(txt) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); if (!txt) { vrT.needsUpdate = true; return; } g.fillStyle = "rgba(8,20,24,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  g.fillStyle = "#e6f0ee"; g.font = "27px -apple-system, Helvetica, sans-serif"; const words = txt.replace(/<br>/g, " ").replace(/<[^>]+>/g, "").split(" "); let ln = "", y = 46, n = 0;
  for (const w of words) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += 34; ln = ""; if (++n >= 9) break; } ln += w + " "; } g.fillText(ln, 26, y); vrT.needsUpdate = true; }
const wristT = new THREE.CanvasTexture(WRISTC); wristT.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.125), new THREE.MeshBasicMaterial({ map: wristT, transparent: true, toneMapped: false, fog: false })); wrist.position.set(0, 0.05, 0.05); wrist.rotation.x = -1.0; wrist.visible = false;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrTurn = yaw; vrPanel.visible = true; wrist.visible = true; vrDirty = true;
    s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; wrist.visible = false; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, wristTm = 0, loopErrs = 0;
updateGround(P_.x, P_.z, 99); drawJournal();
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started) clockH = (clockH + dt * ENV.dayH / (DAY_REAL_MIN * 60)) % ENV.dayH;
  SEA = ENV.tideAmp * Math.sin(clockH / ENV.dayH * Math.PI * 2 * ENV.tidesPerDay + 0.7);
  let mx = 0, my = 0, run = 1, up = 0;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) fast = (fast + 1) % 6; if (tap("L", gp, 5)) flying = !flying; }
      else { if (gp.buttons[0]?.value > 0.3) run = 2.5; if (tap("R", gp, 4)) interact(); if (swimming || flying) up = -ay * 0.8; if (tap("R", gp, 5)) up = 0;
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 2.5; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  const floorY = baseH(P_.x, P_.z), eyeY = P_.y + 1.6, waterD = SEA - floorY;
  swimming = !flying && waterD > Math.min(1.3, Math.max(0.9, camera.position.y * 0.8));                                                   // deeper than chest height: you swim
  const look = fwd.clone(); side.crossVectors(V3(fwd.x, 0, fwd.z).normalize(), UP).normalize();
  if (swimming) { const sp = (0.9 * run) * PACE[fast], f = V3(look.x, look.y, look.z).normalize();   // swim where you look; fins
    P_.x += (f.x * -my + side.x * mx) * sp * dt; P_.z += (f.z * -my + side.z * mx) * sp * dt; P_.y += (f.y * -my + up * 0.8) * sp * dt;
    P_.y = clampN(P_.y, baseH(P_.x, P_.z) + 0.25, SEA + 0.3 - camera.position.y); }   // up to floating at the surface, your head (at its real height) out of the water                        // between the floor and floating at the surface
  else { fwd.y = 0; fwd.normalize(); const sp = (waterD > 0.4 ? 0.8 : 1.4) * run * PACE[fast];
    P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt; const g = baseH(P_.x, P_.z);
    if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + 4 * dt) : Math.max(g, P_.y - 6 * dt); }
  rig.position.set(P_.x, P_.y, P_.z);
  updateGround(P_.x, P_.z); updateLife(t, dt); if (!floraAt0 || Math.hypot(P_.x - floraAt0[0], P_.z - floraAt0[1]) > 40) { refreshFlora(); floraAt0 = [P_.x, P_.z]; }
  biomeT -= dt; if (biomeT <= 0 && started) { biomeT = 0.5; const b = biomeAt(P_.x, P_.z); if (b !== biomeNow) { biomeNow = b; const first = !PLACES_SEEN.has(b); PLACES_SEEN.add(b); drawJournal(); if (first) say(`<b>${BIOMES[b][0]}</b> · ${BIOMES[b][1]}`, 18); } }
  // the scuba: air used faster the deeper you are; refilled when you are back on land
  const camY = camera.getWorldPosition(V3(0, 0, 0)).y; depthNow = Math.max(0, SEA - camY);
  if (depthNow > 0.2) { TANK.bar = Math.max(0, TANK.bar - 20 * (1 + depthNow / 10) / TANK.litres / 60 * dt); diveMin += dt / 60; maxDepth = Math.max(maxDepth, depthNow); }
  else if (waterD < 0.1 && TANK.bar < 200) { TANK.bar = Math.min(200, TANK.bar + 40 * dt); if (TANK.bar >= 200) { diveMin = 0; maxDepth = 0; } }
  if (depthNow > 50 && !frame.deepSaid) { frame.deepSaid = true; say(ENV.deepNote, 14); } if (depthNow < 40) frame.deepSaid = false;
  if (TANK.bar <= 0 && depthNow > 0.2) { P_.y = Math.min(P_.y + 1.2 * dt, SEA + 0.3 - camera.position.y); if (msgT <= 0) say("Your tank is empty: you are rising to the surface. Swim back to shore to swap tanks.", 8); }
  // sun, moon and sky through the day; the light dims and turns green-blue underwater
  const dayA = (clockH / ENV.dayH * 24 - 6) / 12 * Math.PI, el = Math.sin(dayA), sunDir = V3(-Math.cos(dayA), Math.max(el, -0.3), 0.3).normalize();
  sun.position.copy(rig.position).addScaledVector(sunDir, 800); sun.target.position.copy(rig.position);
  const day = clampN(el * 3 + 0.3, 0, 1), dusk = clampN(1 - Math.abs(el) * 4, 0, 1) * (el > -0.15 ? 1 : 0), under = depthNow > 0.05, att = under ? Math.exp(-depthNow / 9) : 1;
  sun.intensity = 2.5 * ENV.sunL * clampN(el * 3, 0, 1) * att; sun.color.setRGB(1, 0.9 - 0.3 * dusk, 0.78 - 0.45 * dusk); hemi.intensity = (0.12 + 1.0 * day) * (under ? 0.5 + 0.5 * att : 1);
  const upC = ENV.skyUp.clone().multiplyScalar(0.05 + 0.95 * day), hor = ENV.skyHor.clone().multiplyScalar(0.06 + 0.94 * day).lerp(new THREE.Color(0.95, 0.5, 0.28), dusk * 0.65);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); sky.position.copy(rig.position);
  if (under) { const u = new THREE.Color(...SITE.water).multiplyScalar((0.2 + 0.8 * day) * (0.35 + 0.65 * att)); scene.fog.color.copy(u); scene.fog.density = ENV.murk; renderer.setClearColor(u); sky.visible = false; }
  else { scene.fog.color.copy(hor); scene.fog.density = IS_HEADSET ? 0.00016 : 0.00011; sky.visible = true; }
  sunDisc.position.copy(rig.position).addScaledVector(sunDir, 45000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.05 && !under; sunDisc.material.color.setRGB(1, 0.95 - 0.35 * dusk, 0.85 - 0.5 * dusk);
  const moonDir = V3(Math.cos(dayA + 2.4), Math.sin(dayA + 2.4) * 0.8 + 0.1, -0.25).normalize(); moonDisc.position.copy(rig.position).addScaledVector(moonDir, 45000); moonDisc.lookAt(rig.position); moonDisc.visible = moonDir.y > 0 && !under; moonDisc.material.opacity = 0.35 + 0.65 * (1 - day);
  water.position.set(Math.round(P_.x / 100) * 100, SEA, Math.round(P_.z / 100) * 100); waterMat.opacity = under ? 0.55 : 0.78; waterMat.emissive.setRGB(...SITE.water).multiplyScalar(under ? 2.2 * (0.2 + 0.8 * day) : 0);   // from below, the surface glows with daylight
  snow.visible = under; if (under) { const cp = camera.getWorldPosition(V3(0, 0, 0)); snow.position.set(Math.round(cp.x / 30) * 30, cp.y, Math.round(cp.z / 30) * 30);
    const a = snow.geometry.attributes.position; for (let i = 0; i < NSNOW; i++) { let y = a.getY(i) - dt * 0.02; if (y < -15) y += 30; a.setY(i, y); } a.needsUpdate = true; }
  if (LENS.visible) { LENS.userData.piv.rotation.y += dt * 0.5; LENS.userData.piv.rotation.x = 0.5; lensT -= dt; if (lensT <= 0) LENS.visible = false; }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  wristTm -= dt; if (wristTm <= 0) { wristTm = 0.25; drawWrist(WRISTC.getContext("2d"), 512, 400); wristT.needsUpdate = true; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3; const near = nearestAnimal(swimming ? 6 : 3);
    HUD.innerHTML = `<b>${ENV.dateLabel}</b> · ${ENV.siteLabel}<br>${biomeNow ? `<span style="color:#ffe9a8">${BIOMES[biomeNow][0]}</span> · ` : ""}${swimming ? `diving · ${depthNow.toFixed(1)} m` : waterD > 0.3 ? "wading" : flying ? "flying (to look around)" : "on foot"}${fast ? ` · pace ×${PACE[fast]}` : ""}${near ? ` · nearby: ${LOGGED.has(near.sp) ? "<i>" + near.sp.genus + "</i>" : "an animal: press E to examine"}` : ""}<br>
      <span style="color:#8ab0ac;font-size:12.5px">WASD move · drag to look · in the sea you swim where you look (space up, C down) · shift faster · − / = pace · E examine · F fly</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(msgText); vrDirty = false; } }
  renderer.render(scene, camera);
}

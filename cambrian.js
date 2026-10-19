// cambrian.js -- a day in the Cambrian: you are a biologist who has travelled back to one date, with scuba gear. Built into
// cambrian.html by build.py. The world is generated without end (?seed=2 for another); you start on bare land by the sea.
// The date, the air, the sky, the land and every animal follow the fossil record and the literature (see the notes by each).
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
function landMask(x, z) { const r = Math.hypot(x, z);
  return fbm(x / 9000 + 31, z / 9000 - 17, 4) - 0.5 + 0.22 * Math.tanh(-(x + 120 * Math.sin(z / 700)) / 2500) * Math.exp(-r / 30000) + 0.03 * (fbm(x / 900, z / 900 + 4, 3) - 0.5); }
// Environments on land (no plants, so they differ by water, rock and microbes, not vegetation): a moisture field across the
// region decides dry red sand seas and gravel plains, or humid lowlands darkened by microbial mats with wet hollows; braided
// river plains run through both; bedrock uplands rise inland; tidal flats with wrinkled mats and small microbial mounds edge the sea.
const wetness = (x, z) => fbm(x / 14000 + 120, z / 14000 - 60, 4);
const washW = (x, z) => Math.abs(fbm(x / 2200 + 70, z / 2200 - 30, 3) - 0.5);
function baseH(x, z) { const c = landMask(x, z);
  if (c < 0) { const d = -c;                                                          // the sea: tidal flats, a shallow shelf, then deeper water
    let h = -lerpN(0, 3, sstepN(d, 0, 0.012)) - 27 * sstepN(d, 0.006, 0.09) - 90 * sstepN(d, 0.12, 0.3);
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
  if (m < 0) { c.setRGB(0.42 + 0.06 * n1, 0.40 + 0.05 * n1, 0.33 + 0.03 * n1);                                     // grey-olive mud offshore
    if (h > -6) c.lerp(_c1.setRGB(0.66 + 0.06 * n1, 0.60 + 0.05 * n1, 0.47), sstepN(h, -6, -1.5));                // sand in the shallows
    if (fbm(x / 60 + 11, z / 60, 3) > 0.6 && h > -25) c.lerp(_c1.setRGB(0.32, 0.32, 0.27), 0.4);                   // darker, organic-rich mud
    if (h > -1.5) c.lerp(_c1.setRGB(0.30 + 0.06 * n1, 0.34 + 0.05 * n1, 0.24), 0.55 * sstepN(fbm(x / 30 + 2, z / 30, 3), 0.4, 0.6));   // microbial mats on the low flats
    return c; }
  const wet = wetness(x, z), dry = 1 - sstepN(wet, 0.38, 0.5), hum = sstepN(wet, 0.47, 0.55);
  c.setRGB(0.55 + 0.12 * n2, 0.44 + 0.08 * n2, 0.34 + 0.05 * n1);                                                  // weathered rock and regolith: browns, reds, greys
  c.lerp(_c1.setRGB(0.72 + 0.06 * n1, 0.45 + 0.05 * n1, 0.30), dry * 0.75);                                         // dry country: red-brown iron-stained sand
  const sand = sstepN(fbm(x / 1800 + 50, z / 1800, 3), 0.5, 0.65); c.lerp(_c1.setRGB(0.76 + 0.05 * n1, 0.62 + 0.05 * n1, 0.46), sand * 0.6 * (1 - dry * 0.5));
  if (h < 1.6) c.lerp(_c1.setRGB(0.42 + 0.05 * n1, 0.42, 0.34), sstepN(1.6 - h, 0, 1.2) * 0.8);                       // wet tidal sand and mud, matted
  const damp = Math.max(sstepN(1 - Math.abs(2 * fbm(x / 160 + 3, z / 160, 3) - 1), 0.75, 0.95) * (h < 6 ? 1 : 0.4), hum * (0.8 + 0.2 * sstepN(n1, 0.3, 0.6)));
  c.lerp(_c1.setRGB(0.045 + 0.03 * n1, 0.065 + 0.04 * n1, 0.035), damp * 0.92);                                         // dark microbial crusts and mats
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

// ---------- the date and the world: Chengjiang, about 518 million years ago ----------
// SOURCES: age 518.03 ± 0.69 Ma (maximum; CA-ID-TIMS U-Pb on detrital zircons, Yang et al. 2018, J. Geol. Soc.); setting a river-fed
// delta front, storm floods, murky water, oxygenated shallows above an oxygen-poor outer shelf (Saleh et al. 2022, Nat. Commun.);
// O2 ~5-15% (Krause et al. 2018; COPSE; GEOCARBSULF), CO2 ~2,800-9,000 ppm (GEOCARB); tropical seas ~28-35 °C; Sun ~95.5% (Gough
// 1981); day ~21 h (growth bands; tidal rhythmites); Moon ~369,000 km (cyclostratigraphy at ~493 Ma), ~4% wider; no land plants or
// land animals yet (Wellman 2015; first trackways ~500 Ma); bare land ~10x dustier (2020 Nat. Commun.), so a paler, hazier sky.
const ENV = { dateLabel: "about 518 million years ago", siteLabel: "the Chengjiang delta coast, South China (Cambrian Stage 3)",
  O2pct: "~10", O2range: "5-15%", CO2ppm: 4500, CO2range: "2,800-9,000", sunL: 0.955, dayH: 21, moonScale: 1.045, seaT: 30, airT: 32, tideAmp: 1.2, tidesPerDay: 2, startHour: 7.5,
  murk: 0.12, skyUp: new THREE.Color(0.42, 0.58, 0.80), skyHor: new THREE.Color(0.87, 0.85, 0.81),
  arrival: "You step out of the time machine onto bare land, about 518 million years ago. There is not a single plant anywhere: just rock, sand and dark microbial crusts, under a hazy, dusty sky. The day is about 21 hours long; the Moon is a little closer and bigger. The air holds perhaps half today's oxygen and over ten times the CO₂, so you breathe from your tank. East, past the tidal flats, is the sea: a warm, murky delta front teeming with animals. Walk in and dive; press E close to animals to examine and log them.",
  landNote: "Bare land: no plants yet, no animals; only microbial crusts where it stays damp. The animals are all in the sea, to the east: walk in and dive.",
  deepNote: "Below about 50 m the water here lost its oxygen: the outer shelf held an oxygen-poor water mass. Nothing lives down here; the animals are in the shallower, oxygenated water toward shore." };
const START = (() => { for (let x = -3000; x < 3000; x += 10) if (landMask(x, 0) < 0) return { x: x - 70, z: 0, yaw: -Math.PI / 2 }; return { x: 0, z: 0, yaw: -Math.PI / 2 }; })();
// more body plans
BODY.medusa = o => { const L = o.L, P = [[new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), TM(0, 0, 0, L * 0.5, L * 0.4, L * 0.5)]];
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; P.push(between(V3(Math.cos(a) * L * 0.45, 0, Math.sin(a) * L * 0.45), V3(Math.cos(a) * L * 0.5, -L * 0.9, Math.sin(a) * L * 0.5), L * 0.008, 3)); } return mergeG(P); };
BODY.plated = o => { const L = o.L, P = [[SPH(10, 6), TM(0, L * 0.12, 0, L * 0.3, L * 0.14, L * 0.5)]];
  for (let k = 0; k < 18; k++) { const z = L * 0.4 - k * L * 0.045; for (const sd of [-1, 1]) P.push([BOX(), TM(sd * L * 0.2, L * 0.2, z, L * 0.18, L * 0.01, L * 0.05, 0, 0, sd * 0.5)]); }
  if (o.spines) for (let k = 0; k < 7; k++) for (const sd of [-1, 1]) P.push(between(V3(sd * L * 0.12, L * 0.25, L * 0.3 - k * L * 0.1), V3(sd * L * 0.35, L * 0.75, L * 0.3 - k * L * 0.1 - L * 0.05), L * 0.012, 3)); return mergeG(P); };
// the animals and algae: [genus, group, journal hint, size note, plan, plan options, colour, habit, depth range, per 100 m², speed (m/s), range (m), height above floor, extra]
const AR = "Arthropoda", RA = "Radiodonta (stem arthropods)", LO = "Lobopodians (Lobopodia)", SC = "Priapulids & palaeoscolecids (Scalidophora)", BR = "Brachiopoda", HY = "Hyolitha", PO = "Porifera (sponges)",
  CN = "Cnidaria (jellyfish & polyps)", CT = "Ctenophora (comb jellies)", CH = "Chordata", VE = "Vetulicolia", CA = "Cambroernida", CG = "Chaetognatha & Gnathifera", MO = "Mollusca (stem group)", EN = "Entoprocta", AL = "Algae";
const F = (genus, phylum, hint, plan, o, col, habit, depth, dens, speed, range, alt, text, extra = {}) => ({ genus, phylum, hint, plan, o, col, habit, depth, dens, speed, range, alt, text, ...extra });
const D = [2, 50];
const FAUNA = [
  F("Kunmingella douvillei", AR, "a tiny bean-shaped arthropod, everywhere", "arthropod", { L: 0.005, W: 0.004, segs: 5, shell: true, legs: true }, 0x8a7a5e, "crawl", D, 90, 0.004, 0.3, 0, "The commonest animal here, about a quarter of all individuals: a bradoriid only 3-6 mm long, its body hidden in a bean-shaped two-valved shell, grubbing through the mud for food. Some fossils are found brooding eggs.", { cap: 90 }),
  F("Eoredlichia intermedia", AR, "a trilobite with crescent eyes", "trilobite", { L: 0.045 }, 0x7a6a52, "crawl", D, 10, 0.012, 0.8, 0, "The commonest trilobite of Chengjiang, up to about 5 cm: a calcified shield with crescent-shaped compound eyes, crawling and scavenging over the mud on many pairs of legs."),
  F("Yunnanocephalus yunnanensis", AR, "a small trilobite", "trilobite", { L: 0.015, segs: 10 }, 0x8a7a62, "crawl", D, 8, 0.008, 0.5, 0, "A small trilobite, 1-2 cm, common on the mud."),
  F("Naraoia spinosa", AR, "an arthropod with two soft shields", "arthropod", { L: 0.035, W: 0.026, segs: 3, head: 0.45, taper: 0.2, antennae: 0.35 }, 0x9a8a6a, "crawl", D, 5, 0.012, 0.7, 0, "A nektaspid: a 'soft-shelled trilobite relative' with just two large shields, the head and the tail, 2-4 cm long. It probably scavenged and hunted small prey on the seafloor."),
  F("Misszhouia longicaudata", AR, "a soft arthropod with a long tail shield", "arthropod", { L: 0.035, W: 0.018, segs: 4, head: 0.3, taper: 0.1, antennae: 0.3 }, 0x8e7e60, "crawl", D, 4, 0.012, 0.7, 0, "Another nektaspid, 2-4 cm, with a long tail shield: unmineralised, so it is known only from sites like this one."),
  F("Fuxianhuia protensa", AR, "a long arthropod with a broad head shield", "arthropod", { L: 0.11, W: 0.03, segs: 16, head: 0.14, taper: 0.7, antennae: 0.25, eyes: "stalk", tail: 0.15 }, 0x7a6448, "crawl", D, 3, 0.015, 1.2, 0, "Up to about 11 cm, with stalked eyes and a long tapering trunk. Fossils preserve its brain and nervous system, and adults found with juveniles suggest parental care: some of the earliest evidence of it."),
  F("Chengjiangocaris longiformis", AR, "a long, many-legged arthropod", "arthropod", { L: 0.1, W: 0.022, segs: 18, head: 0.1, taper: 0.6, antennae: 0.2, tail: 0.1 }, 0x806a4e, "crawl", D, 1.2, 0.015, 1.2, 0, "A fuxianhuiid up to about 10 cm, with dozens of pairs of legs: a deposit feeder or scavenger on the mud."),
  F("Leanchoilia illecebrosa", AR, "a swimming arthropod with long whip-claws", "arthropod", { L: 0.04, W: 0.012, segs: 11, head: 0.15, taper: 0.5, great: 0.6, tail: 0.15 }, 0x9a8462, "swim", D, 5, 0.06, 1.2, [0.1, 0.8], "A 'great-appendage' arthropod, 2-5 cm: its first limbs end in long whip-like fingers, used to feel and catch prey as it swam just above the seafloor. Among the commonest arthropods here."),
  F("Alalcomenaeus cambricus", AR, "a great-appendage predator", "arthropod", { L: 0.05, W: 0.014, segs: 11, head: 0.15, great: 0.3, tail: 0.12 }, 0x8a7458, "swim", D, 1.5, 0.05, 1.2, [0.1, 0.6], "A great-appendage arthropod, 3-6 cm, with grasping claws at the front: a predator near the bottom. Its preserved nervous system ties these animals to the line leading to spiders and scorpions."),
  F("Haikoucaris ercaiensis", AR, "a small great-appendage arthropod", "arthropod", { L: 0.03, W: 0.01, segs: 10, great: 0.3, tail: 0.1 }, 0x8a7a5e, "swim", D, 0.5, 0.04, 0.8, [0.1, 0.5], "A rare great-appendage arthropod, about 3 cm."),
  F("Isoxys auritus", AR, "a swimmer in a two-valved shell, big eyes", "arthropod", { L: 0.025, W: 0.02, segs: 6, shell: true, eyes: true, legs: true }, 0xa89878, "swim", [2, 55], 5, 0.1, 2.5, [0.5, 4], "A swimming arthropod in a folded, two-valved shell 1-3 cm long, with big round eyes and grasping front limbs: an active predator up in the water."),
  F("Chuandianella ovata", AR, "a small swimmer with an oval shell", "arthropod", { L: 0.02, W: 0.014, segs: 8, shell: true }, 0xb0a080, "swim", [2, 55], 4, 0.07, 1.5, [0.3, 3], "A common little two-shelled swimming arthropod, about 2 cm."),
  F("Xandarella spectaculum", AR, "an arthropod with many small shields", "arthropod", { L: 0.05, W: 0.025, segs: 10, head: 0.2, taper: 0.4, antennae: 0.3, eyes: true }, 0x84704e, "crawl", D, 1.2, 0.012, 0.8, 0, "An artiopod, 4-6 cm, its back covered by a row of shields, with eyes on short stalks under the head shield."),
  F("Sinoburius lunaris", AR, "a small crescent-headed arthropod", "arthropod", { L: 0.02, W: 0.016, segs: 6, head: 0.4, taper: 0.4 }, 0x8a7a5a, "crawl", D, 0.5, 0.008, 0.5, 0, "A rare artiopod about 2 cm long with a crescent head shield."),
  F("Retifacies abnormalis", AR, "an arthropod with a net-patterned shield", "arthropod", { L: 0.08, W: 0.045, segs: 9, head: 0.22, taper: 0.4, antennae: 0.4, tail: 0.12 }, 0x7e6a4c, "crawl", D, 0.8, 0.012, 1, 0, "An artiopod up to about 10 cm, its shields patterned with a fine network, ending in a tail spine."),
  F("Sidneyia sinica", AR, "a broad predatory arthropod", "arthropod", { L: 0.08, W: 0.04, segs: 10, head: 0.18, taper: 0.4, antennae: 0.3, tail: 0.15 }, 0x766248, "crawl", D, 0.3, 0.015, 1, 0, "A rare predator, 5-10 cm, related to the Burgess Shale Sidneyia, which ate small shelled animals."),
  F("Kylinxia zhangi", AR, "a three-eyed arthropod", "arthropod", { L: 0.05, W: 0.012, segs: 12, great: 0.3, eyes: true, tail: 0.1 }, 0x8a7458, "swim", D, 0.25, 0.04, 0.8, [0.1, 0.5], "About 5 cm, with three eyes and grasping front claws: an animal that bridges the radiodonts and true arthropods."),
  F("Canadaspis laevigata", AR, "a shrimp-like arthropod in a shell", "arthropod", { L: 0.045, W: 0.02, segs: 9, shell: true, antennae: 0.2 }, 0x9a8a6a, "crawl", D, 1.2, 0.015, 0.8, 0, "A hymenocarine, 4-5 cm: a shrimp-like body under a two-valved shell, feeding at the bottom."),
  F("Pectocaris spatiosa", AR, "a filter-feeding swimmer", "arthropod", { L: 0.04, W: 0.018, segs: 12, shell: true }, 0xa89878, "swim", [2, 55], 0.8, 0.05, 1.2, [0.5, 3], "A swimming hymenocarine a few cm long that combed food particles from the water with bristly limbs."),
  F("Tuzoia sinensis", AR, "a swimmer with a big spiny shell", "arthropod", { L: 0.035, W: 0.03, segs: 6, shell: true, eyes: true }, 0xa0906e, "swim", [2, 55], 0.4, 0.06, 1.5, [0.5, 3], "A swimming arthropod with a large two-valved shell, 3-4 cm, edged with spines."),
  F("Synophalos xynos", AR, "a tiny swimmer, in chains", "arthropod", { L: 0.012, W: 0.006, segs: 6, shell: true }, 0xb0a080, "swim", [2, 55], 0.6, 0.05, 1.2, [0.5, 3], "Only about 1 cm long, and found linked together in chains of up to 20, apparently swimming in a line: the oldest known collective behaviour of this kind."),
  F("Primicaris larvaformis", AR, "a tiny larva-like arthropod", "arthropod", { L: 0.005, W: 0.004, segs: 3, head: 0.6 }, 0x9a8a6a, "crawl", D, 0.6, 0.004, 0.3, 0, "A marrellomorph only about 5 mm long that looks like a larva."),
  F("Amplectobelua symbrachiata", RA, "a large predator with grasping arms", "radiodont", { L: 0.7, flaps: 11 }, 0x6e5a48, "hunt", [3, 55], 0.04, 0.5, 8, [0.6, 3], "A radiodont, a cousin of Anomalocaris and among the largest animals here (the biggest specimens suggest up to perhaps 90 cm, an uncertain estimate). It swam by undulating the flaps along its sides and seized prey with spiny arms; one spine on each arm opposed the others like a pincer.", { cap: 4 }),
  F("Houcaris saron", RA, "a swimming predator with big eyes", "radiodont", { L: 0.1, flaps: 11 }, 0x7a6450, "hunt", [3, 55], 0.12, 0.25, 4, [0.4, 2.5], "Formerly called Anomalocaris saron: a radiodont about 10 cm long. Radiodonts had big stalked compound eyes (an Anomalocaris eye from Australia, ~515 Ma, has over 16,000 lenses) and probably chased soft-bodied prey rather than cracking trilobites."),
  F("Lyrarapax unguispinus", RA, "a small radiodont", "radiodont", { L: 0.08, flaps: 11 }, 0x7e6852, "hunt", [3, 55], 0.05, 0.2, 3, [0.3, 2], "A small radiodont, about 8 cm, whose brain is preserved in the fossils."),
  F("Hallucigenia fortis", LO, "a spiny lobopodian on a sponge", "lobopodian", { L: 0.025, r: 0.0012, legs: 7, spines: 0.25 }, 0x9a8468, "sessile", D, 0.25, 0, 0, 0, "A lobopodian 2-3 cm long walking on soft legs with claws, a pair of sharp spines on its back over each pair of legs; it probably clung to and fed on sponges. Only rarely found here."),
  F("Microdictyon sinicum", LO, "a lobopodian with net-like plates", "lobopodian", { L: 0.06, r: 0.003, legs: 10, plates: true }, 0x8a6e52, "crawl", D, 1.5, 0.008, 0.6, 0, "A lobopodian up to about 8 cm, with a pair of net-patterned plates over each pair of legs: the plates are also found loose, as small fossils, around the world."),
  F("Luolishania longicruris", LO, "a small bristly lobopodian", "lobopodian", { L: 0.015, r: 0.001, legs: 16 }, 0x9a8a6e, "crawl", D, 0.8, 0.005, 0.4, 0, "A lobopodian about 1.5 cm long whose long, bristled front legs strained food from the water."),
  F("Onychodictyon ferox", LO, "a clawed, spiny lobopodian", "lobopodian", { L: 0.05, r: 0.003, legs: 10, spines: 0.08 }, 0x84684e, "crawl", D, 0.3, 0.007, 0.5, 0, "A lobopodian 2-7 cm long with clawed legs and spiny plates."),
  F("Paucipodia inermis", LO, "a long, smooth lobopodian", "lobopodian", { L: 0.1, r: 0.004, legs: 9 }, 0x8e7458, "crawl", D, 0.25, 0.008, 0.6, 0, "A large smooth lobopodian, about 10 cm, perhaps a scavenger."),
  F("Cardiodictyon catenulum", LO, "a small lobopodian with tiny plates", "lobopodian", { L: 0.025, r: 0.0012, legs: 24, plates: true }, 0x9a8468, "crawl", D, 0.5, 0.005, 0.4, 0, "A small lobopodian about 2.5 cm long with many pairs of legs; its fossils preserve a simple brain, informing how the arthropod head evolved."),
  F("Diania cactiformis", LO, "an armoured, spiny-legged lobopodian", "lobopodian", { L: 0.06, r: 0.003, legs: 10, spines: 0.05 }, 0x7a6450, "crawl", D, 0.15, 0.006, 0.5, 0, "The 'walking cactus', about 6 cm: a lobopodian with stout spiny legs."),
  F("Facivermis yunnanicus", LO, "a worm in a tube, arms raised", "lobopodian", { L: 0.05, r: 0.002, legs: 5 }, 0x9a8468, "burrow", D, 0.4, 0, 0, 0, "A lobopodian 3-7 cm that lived anchored in a tube in the mud, raising its spiny front limbs to catch food from the water.", { bury: 0.5 }),
  F("Jianshanopodia decora", LO, "a large lobopodian with feathery claws", "lobopodian", { L: 0.22, r: 0.012, legs: 10 }, 0x7a5e48, "crawl", D, 0.06, 0.02, 1.5, 0, "A big lobopodian, about 22 cm, with strong branched front limbs: a predator, and a link between lobopodians and radiodonts."),
  F("Megadictyon haikouensis", LO, "a big predatory lobopodian", "lobopodian", { L: 0.2, r: 0.011, legs: 10 }, 0x7a5e48, "crawl", D, 0.05, 0.02, 1.5, 0, "A large lobopodian up to about 20 cm with grasping front limbs."),
  F("Cricocosmia jinningensis", SC, "a ringed worm with armour plates", "worm", { L: 0.06, r: 0.003, taper: true }, 0x8a7458, "burrow", D, 45, 0, 0, 0, "The second commonest animal here: a palaeoscolecid worm, 3-10 cm, its body ringed and studded with tiny plates, burrowing through the mud.", { cap: 60, bury: 0.6 }),
  F("Maotianshania cylindrica", SC, "a long ringed worm", "worm", { L: 0.08, r: 0.003 }, 0x8e7a5e, "burrow", D, 10, 0, 0, 0, "A palaeoscolecid worm up to about 10 cm, common in the mud.", { bury: 0.6 }),
  F("Mafangscolex sinensis", SC, "a worm with rows of tiny plates", "worm", { L: 0.07, r: 0.003, taper: true }, 0x86725a, "burrow", D, 8, 0, 0, 0, "A palaeoscolecid worm (formerly 'Palaeoscolex'), 5-10 cm, armoured with tiny plates.", { bury: 0.6 }),
  F("Selkirkia elongata", SC, "a worm in a tube", "worm", { L: 0.04, r: 0.003, proboscis: true, curl: 0.1 }, 0x9a8a6e, "burrow", D, 6, 0, 0, 0, "A priapulid worm living in a tube in the mud, its spiny proboscis everted to catch food.", { bury: 0.7 }),
  F("Sicyophorus", SC, "a stout priapulid worm", "worm", { L: 0.03, r: 0.004, proboscis: true }, 0x8a7a5e, "burrow", D, 1.5, 0, 0, 0, "A small priapulid worm, 1-5 cm, burrowing in the mud: priapulids still live today.", { bury: 0.5 }),
  F("Diandongia pista", BR, "a small brachiopod, very common", "brachiopod", { L: 0.015 }, 0x9a8c74, "sessile", D, 35, 0, 0, 0, "The third commonest animal here: a brachiopod 1-2 cm across, two shells hinged together, straining food from the water.", { cap: 60 }),
  F("Lingulellotreta malongensis", BR, "a brachiopod on a stalk in a burrow", "brachiopod", { L: 0.01, pedicle: 1.5 }, 0xa09478, "burrow", D, 10, 0, 0, 0, "A lingulid brachiopod about 1 cm long that lived in a burrow, anchored by a long fleshy stalk (pedicle): its relatives, Lingula, live today almost unchanged.", { bury: 0.2 }),
  F("Heliomedusa orienta", BR, "a round brachiopod with bristles", "brachiopod", { L: 0.025 }, 0x8a7e68, "sessile", D, 5, 0, 0, 0, "A rounded brachiopod 2-3 cm across; its fossils preserve the bristles (setae) around the shell edge."),
  F("Longtancunella chengjiangensis", BR, "brachiopods in clusters", "brachiopod", { L: 0.015, pedicle: 0.8 }, 0x9a8c74, "sessile", D, 2.5, 0, 0, 0, "A brachiopod 1-2 cm long that lived attached in clusters."),
  F("Linevitus", HY, "a cone-shelled animal with two struts", "hyolith", { L: 0.03 }, 0x9a8e78, "crawl", D, 6, 0.002, 0.2, 0, "A hyolith: a cone-shaped shell with a lid and two curved struts (helens) that propped it on the mud. Hyoliths are now thought to be relatives of brachiopods; they died out at the end of the Permian."),
  F("Leptomitus teretiusculus", PO, "a tall tube sponge", "sponge", { H: 0.2, R: 0.012, shape: "tube" }, 0xb4a888, "sessile", D, 3, 0, 0, 0, "A tall, thin-walled tube sponge, 5-30 cm high, pumping water through its walls to filter out food."),
  F("Choia xiaolantianensis", PO, "a disc sponge with radiating spines", "sponge", { H: 0.01, R: 0.015, shape: "disc" }, 0xb0a080, "sessile", D, 5, 0, 0, 0, "A small disc-shaped sponge 1-4 cm across, ringed by long radiating spicules that held it on the soft mud."),
  F("Paraleptomitella", PO, "a vase sponge", "sponge", { H: 0.12, R: 0.025 }, 0xb8ac8c, "sessile", D, 1.2, 0, 0, 0, "A vase-shaped sponge, about 5-20 cm, one of 15 sponge species here."),
  F("Xianguangia sinica", CT, "an anemone-like animal with tentacles", "polyp", { H: 0.07, R: 0.008, tent: 18 }, 0xc0a890, "sessile", D, 0.8, 0, 0, 0, "Once thought to be a sea anemone, about 7 cm tall; in 2019 it was reinterpreted as an early relative of the comb jellies, catching food with feathery tentacles."),
  F("Dinomischus venustus", CT, "a cup on a long stalk", "cup", { H: 0.04 }, 0xb8a888, "sessile", D, 0.3, 0, 0, 0, "A stalked cup a few cm tall that filtered food; also reinterpreted (2019) as a stem-group comb jelly."),
  F("Archisaccophyllia kunmingensis", CN, "a polyp", "polyp", { H: 0.04, R: 0.008, tent: 14 }, 0xc8a890, "sessile", D, 0.25, 0, 0, 0, "A cnidarian polyp a few cm tall, related to sea anemones."),
  F("Yunnanoascus haikouensis", CN, "a small swimming jellyfish", "medusa", { L: 0.04 }, 0xd8e4ec, "drift", [2, 55], 0.12, 0.03, 2, [1, 5], "A true swimming jellyfish a few cm across, with sense organs (rhopalia) round its bell: the earliest known open-water medusa. Rare here.", { glass: true }),
  F("Maotianoascus octonarius", CT, "a comb jelly", "ctenophore", { L: 0.04, rows: 8 }, 0xd8e8f0, "drift", [2, 55], 0.5, 0.03, 1.5, [0.8, 5], "A comb jelly, 2-5 cm: eight rows of beating combs (which scatter light into moving rainbows in living ones) and no tentacles. Cambrian comb jellies were armoured with stiff plates.", { glass: true }),
  F("Haikouichthys ercaicunensis", CH, "a tiny fish", "fish", { L: 0.025 }, 0x9a9488, "swim", [2, 55], 0.5, 0.12, 2, [0.4, 3], "One of the earliest vertebrates, about 2.5 cm: a jawless, finned fish-like animal with a skull of cartilage, two eyes and two more light-sensing pineal eyes, all containing dark melanin pigment (2026 study)."),
  F("Myllokunmingia fengjiaoa", CH, "another tiny fish", "fish", { L: 0.028 }, 0x948e82, "swim", [2, 55], 0.25, 0.12, 2, [0.4, 3], "An early jawless vertebrate about 2.8 cm long, with a sail-like back fin and gill pouches."),
  F("Haikouella lanceolata", CH, "a little chordate near the bottom", "fish", { L: 0.035 }, 0xa09888, "swim", D, 1.5, 0.05, 1, [0.1, 0.6], "A filter-feeding chordate 2.5-4 cm long, swimming near the bottom; it may be close to the ancestry of vertebrates."),
  F("Yunnanozoon lividum", CH, "a puzzling segmented filter feeder", "fish", { L: 0.035 }, 0x9a9282, "swim", D, 0.8, 0.04, 1, [0.1, 0.6], "A 2.5-4 cm filter feeder whose place among the deuterostomes is still argued over."),
  F("Shankouclava", CH, "a tunicate (sea squirt)", "cup", { H: 0.025 }, 0xb8a890, "sessile", D, 0.25, 0, 0, 0, "One of the earliest tunicates, a sea squirt 2-3 cm tall: a chordate that settles down and filters water."),
  F("Vetulicola cuneata", VE, "a two-part swimmer with a jointed tail", "vetulicolian", { L: 0.08 }, 0x8a7e66, "swim", [2, 55], 1.5, 0.08, 2, [0.4, 3], "A vetulicolian, up to about 9 cm: a boxy front with gill slits, and a jointed tail it swam with. Probably a very early deuterostome, a distant relative of us."),
  F("Didazoon haoae", VE, "a vetulicolian near the bottom", "vetulicolian", { L: 0.07 }, 0x84785e, "swim", D, 0.6, 0.05, 1.5, [0.1, 0.8], "A vetulicolian 5-10 cm long that swam or rested near the bottom."),
  F("Stellostomites eumorphus", CA, "a flat disc with a coiled gut", "eldonid", { R: 0.04 }, 0xb0a48a, "sessile", D, 2.5, 0, 0, 0, "An eldoniid (formerly Eldonia), a disc 5-10 cm across with a coiled gut inside: whether it lay on the seafloor or drifted is debated. Cambroernids may be early relatives of echinoderms and hemichordates."),
  F("Rotadiscus grandis", CA, "a disc tethered to the floor", "eldonid", { R: 0.045 }, 0xa89c82, "sessile", D, 0.8, 0, 0, 0, "A disc-shaped cambroernid about 5-10 cm across, tethered to the seafloor and catching food with tentacles."),
  F("Eognathacantha ercainella", CG, "an arrow worm with grasping spines", "arrow", { L: 0.025 }, 0xd0ccc0, "swim", [2, 55], 0.3, 0.1, 1.5, [0.5, 4], "An early arrow worm, 2-3 cm, seizing small prey with spines round its mouth: arrow worms are still major predators of the plankton."),
  F("Amiskwia sinica", CG, "a small finned swimmer", "arrow", { L: 0.015 }, 0xc8c4b8, "swim", [2, 55], 0.25, 0.06, 1.2, [0.5, 3], "A small swimming gnathiferan, 1-2 cm, long a puzzle and now placed with the arrow worms' relatives."),
  F("Wiwaxia papillo", MO, "a little armoured slug with spines", "plated", { L: 0.008, spines: true }, 0x8a7a62, "crawl", D, 0.2, 0.002, 0.2, 0, "A small armoured grazer, its back covered with overlapping scales and two rows of spines; only juveniles under 1 cm are known here. Wiwaxia from the Burgess Shale has diffraction gratings on its scales, so it may have shimmered.", { cap: 10 }),
  F("Orthrozanclus elongata", MO, "a tiny scaly grazer", "plated", { L: 0.01, spines: true }, 0x8e7e66, "crawl", D, 0.2, 0.002, 0.2, 0, "A tiny scale-armoured grazer about 1 cm long, a relative of Wiwaxia and of the molluscs."),
  F("Cotyledion tylodes", EN, "a stalked cup covered in plates", "cup", { H: 0.06 }, 0xb0a088, "sessile", D, 1.2, 0, 0, 0, "An armoured, stalked cup up to about 8 cm tall, filtering water with a ring of tentacles: an early relative of the tiny entoprocts living today."),
  F("Fuxianospira", AL, "thread-like algae", "alga", { H: 0.06, n: 6 }, 0x5e6a42, "sessile", D, 15, 0, 0, 0, "A thread-like, unbranched alga: over half of all algal fossils here. Algae and microbes were the only 'plants' anywhere on Earth."),
  F("Longfengshania", AL, "an alga on a stalk", "alga", { H: 0.05, n: 3 }, 0x6a6a3e, "sessile", D, 1.5, 0, 0, 0, "A stalked, attached alga with a broad blade."),
  F("Sinocylindra", AL, "drifting algal threads", "alga", { H: 0.04, n: 4 }, 0x6e7444, "drift", [2, 55], 1, 0.01, 0.8, [0.3, 3], "A free-floating alga, drifting in the water.")];
FAUNA.forEach((s, k) => s.k = k * 7.3);

// ---------- educated guesses at colour, and how each group relates to animals alive today ----------
// No Cambrian animal's body colour is known (a few fossils keep pigment in eyes, or diffraction gratings that would shimmer).
// The guesses below follow living relatives and common rules: swimmers counter-shaded (dark back, pale belly), seafloor animals
// in mud tones with some pattern, sponges and polyps like their modern kin. Each animal's text says what the guess rests on.
const GROUPS = {
  [AR]: { formal: "phylum Arthropoda", kin: "Living relatives: insects, crustaceans (crabs, shrimp), spiders, scorpions, millipedes. Trilobites died out 252 million years ago; the great-appendage arthropods sit near the line leading to spiders and horseshoe crabs.", col: "Colours guessed from living crustaceans and horseshoe crabs: browns, reds and olives, with a paler underside." },
  [RA]: { formal: "order Radiodonta, in the stem group of Arthropoda (within Panarthropoda)", kin: "No living members. They branched off just before true arthropods: distant aunts and uncles of all insects, crabs and spiders.", col: "Colour guessed: a large open-water predator, so counter-shaded (darker above, paler below), in reds and browns like many crustaceans." },
  [LO]: { formal: "Lobopodia, an informal grade within Panarthropoda", kin: "Living relatives: velvet worms (Onychophora) and tardigrades (water bears) are the nearest; lobopodians also gave rise to arthropods.", col: "Colours guessed from living velvet worms: dusky blue-greys, browns and rusty oranges, often finely banded." },
  [SC]: { formal: "Scalidophora (priapulids and palaeoscolecids), in Ecdysozoa", kin: "Living relatives: priapulid 'penis worms' still live in seafloor mud today; their wider relatives are nematodes and the arthropods (all moult their outer cuticle).", col: "Colours guessed from living priapulids: pinkish to pale brown, with darker rings." },
  [BR]: { formal: "phylum Brachiopoda (lamp shells)", kin: "Still alive: about 400 species today. Lingula and its kin, burrowing on stalks, have barely changed since the Cambrian. Related to phoronid and bryozoan 'moss animals'.", col: "Colours guessed from living Lingula and other brachiopods: green-brown to amber shells." },
  [HY]: { formal: "class Hyolitha, now placed with the Brachiopoda and their kin (Lophophorata)", kin: "No living members (extinct 252 million years ago); closest living relatives are brachiopods and phoronids.", col: "Colour guessed: a dull shell in mud tones, like many brachiopod shells." },
  [PO]: { formal: "phylum Porifera (sponges)", kin: "Still alive everywhere in the sea: some 9,000 species. Sponges are the earliest-branching animals still living.", col: "Colours guessed from living sponges, which are often bright: yellows, oranges, tans and purples (from pigments and symbiotic microbes)." },
  [CN]: { formal: "phylum Cnidaria", kin: "Living relatives: jellyfish, sea anemones, corals and hydras: stinging-celled animals, alive today in great variety.", col: "Colours guessed from living jellyfish and anemones: translucent, tinged pink and amber." },
  [CT]: { formal: "phylum Ctenophora (comb jellies), including stem-group forms", kin: "Living relatives: comb jellies still swim in every ocean; the light rainbows along their comb rows are real (scattered light, not bioluminescence). Some scientists think ctenophores are the earliest-branching animals of all.", col: "Comb jellies are transparent today, so these are drawn glassy; the stalked stem forms are guessed in pale tan." },
  [CH]: { formal: "phylum Chordata (including the earliest vertebrates)", kin: "Living relatives: every fish, amphibian, reptile, bird and mammal, including you. Haikouichthys and Myllokunmingia are among the first vertebrates; tunicates (sea squirts) and lancelets are living chordates too.", col: "Colour partly from evidence: their eyes held dark melanin (2026 study). The bodies are guessed counter-shaded and silvery, as in most small fish." },
  [VE]: { formal: "phylum Vetulicolia (placement debated; probably early deuterostomes)", kin: "No living members. Probably early relatives of the chordates, perhaps near the tunicates: a distant branch of our own lineage.", col: "Colour guessed: a swimmer, so counter-shaded, in olive-browns." },
  [CA]: { formal: "Cambroernida (in Ambulacraria)", kin: "No living members. Probably early relatives of echinoderms (starfish, sea urchins) and hemichordates (acorn worms).", col: "Colour guessed from modern discoid drifters and sea cucumbers: translucent violet-tan." },
  [CG]: { formal: "phylum Chaetognatha (arrow worms) and their gnathiferan relatives", kin: "Living relatives: arrow worms are still major plankton predators today; gnathiferans also include rotifers.", col: "Arrow worms are nearly transparent today: drawn glassy-pale." },
  [MO]: { formal: "stem-group Mollusca (Wiwaxia, Orthrozanclus)", kin: "Living relatives: snails, clams, octopuses and chitons. These armoured grazers sit near the base of the mollusc line.", col: "Colour partly from evidence: Wiwaxia's scales carry diffraction gratings, so they probably shimmered with iridescent colour." },
  [EN]: { formal: "phylum Entoprocta (stem group)", kin: "Living relatives: entoprocts, tiny stalked filter feeders a millimetre or so tall, still alive today.", col: "Colour guessed: pale tan, like living entoprocts." },
  [AL]: { formal: "algae (not animals)", kin: "Living relatives: green, red and brown seaweeds. On land there was nothing but microbes: these algae and cyanobacteria were the only 'plants' on Earth.", col: "Colours guessed from living algae: greens and red-browns." } };
// per-species: back colour, belly or second colour, bands, shimmer (plus a note when it differs from the group's)
const LOOKS = { Kunmingella: [0x9a6a3a, 0xc8a070], Eoredlichia: [0x6a5236, 0xb89a72, 1], Yunnanocephalus: [0x7a5a3e, 0xc0a07a, 1], Naraoia: [0xa8784a, 0xe0c8a0], Misszhouia: [0x8a6e48, 0xd8c09a],
  Fuxianhuia: [0x7a4a2e, 0xc89068, 1], Chengjiangocaris: [0x8a5a34, 0xd0a070, 1], Leanchoilia: [0xb86a3a, 0xf0c8a0], Alalcomenaeus: [0x9a5034, 0xe0b08a], Haikoucaris: [0xa8603a, 0xe8c09a],
  Isoxys: [0x7a7a5a, 0xe8e0c8], Chuandianella: [0x9a8a6a, 0xeee6d0], Xandarella: [0x6a5a3a, 0xb8a078, 1], Sinoburius: [0x7a6a4a, 0xc8b08a], Retifacies: [0x5a4a32, 0xb09870, 1],
  Sidneyia: [0x6a3e2a, 0xb88a64, 1], Kylinxia: [0x9a4a30, 0xe0a880], Canadaspis: [0xa07a50, 0xe8d0a8], Pectocaris: [0xb09a74, 0xf0e8d0], Tuzoia: [0x8a6040, 0xe0c8a0], Synophalos: [0xc0a888, 0xf4ecdc], Primicaris: [0xa08a6a, 0xe0d0b0],
  Amplectobelua: [0x8a3a2a, 0xe0a888, 0], Houcaris: [0xa0442e, 0xe8b498], Lyrarapax: [0x9a5a3a, 0xe0b090],
  Hallucigenia: [0xb8703a, 0xe0b080, 1], Microdictyon: [0x4a4a5a, 0xb08050, 1], Luolishania: [0x6a5a50, 0xc0a080, 1], Onychodictyon: [0x5a3e34, 0xd09060, 1], Paucipodia: [0x8a6a5a, 0xd0b098, 1],
  Cardiodictyon: [0x6a5248, 0xc0987a, 1], Diania: [0x7a5a3a, 0xc89a60, 1], Facivermis: [0xa07a5a, 0xe0c0a0], Jianshanopodia: [0x5a4a40, 0xb88a60, 1], Megadictyon: [0x4e4440, 0xb08458, 1],
  Cricocosmia: [0xb07a6a, 0xe0b8a8, 1], Maotianshania: [0xc08a7a, 0xe8c4b4, 1], Mafangscolex: [0xa87064, 0xdcb0a0, 1], Selkirkia: [0xb88a7a, 0x8a7a5a], Sicyophorus: [0xd09484, 0xecc8b8, 1],
  Diandongia: [0x8a7a4a, 0xc0b080], Lingulellotreta: [0x5a6a3e, 0xa89068], Heliomedusa: [0x7a6a42, 0xc0a878], Longtancunella: [0x6a6a44, 0xb0a07a], Linevitus: [0x8a7a62, 0xc0b090],
  Leptomitus: [0xd8b04a, 0xe8d090], Choia: [0xc8783a, 0xe8c090], Paraleptomitella: [0x8a5a8a, 0xc0a0c0], Xianguangia: [0xd89a8a, 0xf0d0c0], Dinomischus: [0xc8b090, 0xe8dcc0], Archisaccophyllia: [0xc87a6a, 0xf0c0b0],
  Yunnanoascus: [0xf0c8c8, 0xf0c8c8], Maotianoascus: [0xd8ecf4, 0xd8ecf4], Haikouichthys: [0x3e4a4a, 0xd8dcd8], Myllokunmingia: [0x44504e, 0xd8dcd4], Haikouella: [0x6a7a6a, 0xd0d4c8], Yunnanozoon: [0x7a7a5a, 0xd0ccb0], Shankouclava: [0xc0905a, 0xe8c8a0],
  Vetulicola: [0x5a5a3a, 0xc8c0a0, 1], Didazoon: [0x6a5e40, 0xc8b898], Stellostomites: [0x9a7aa8, 0xd0c0d8], Rotadiscus: [0x8a6a9a, 0xc8b0d0], Eognathacantha: [0xe0e4e0, 0xe0e4e0], Amiskwia: [0xd8dcd8, 0xd8dcd8],
  Wiwaxia: [0x4a6a8a, 0xa08060, 0, 1], Orthrozanclus: [0x5a6a7a, 0xa89070, 0, 1], Cotyledion: [0xc8b08a, 0xe8dcc0], Fuxianospira: [0x4a7a3a, 0x6a9a4a], Longfengshania: [0x8a4a3a, 0xb07050], Sinocylindra: [0x5a8a4a, 0x7aa05a] };
for (const sp of FAUNA) { const L = LOOKS[sp.genus.split(" ")[0]]; if (L) { sp.col = L[0]; sp.col2 = L[1]; sp.bands = !!L[2]; sp.shimmer = !!L[3]; } }
// paint a body: counter-shaded (top colour above, belly colour below), optional bands along the body
function paint(geo, sp) { const p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3), a = new THREE.Color(sp.col), b = new THREE.Color(sp.col2 ?? sp.col), c = new THREE.Color();
  let z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.count; i++) { z0 = Math.min(z0, p.getZ(i)); z1 = Math.max(z1, p.getZ(i)); }
  const tall = sp.habit === "sessile" && ["sponge", "polyp", "cup", "alga"].includes(sp.plan);
  for (let i = 0; i < p.count; i++) { const up = tall ? 0.5 + 0.5 * clampN(p.getY(i) / ((sp.o.H ?? 0.05) * 1.1), 0, 1) : clampN(0.5 + 0.7 * n.getY(i), 0, 1);
    c.copy(b).lerp(a, up); if (sp.bands) { const f = (p.getZ(i) - z0) / Math.max(1e-6, z1 - z0); if (Math.floor(f * 9) % 2) c.multiplyScalar(0.78); }
    col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); return geo; }

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
  const d = -baseH(x0 + LCELL / 2, z0 + LCELL / 2); if (d < 0.3) return out;                    // only in the sea (depth at mean sea level)
  for (const L of LIFE) { const sp = L.sp, [d0, d1] = sp.depth; if (d < d0 || d > d1) continue; const lam = sp.dens * LCELL * LCELL / 100 * (0.5 + fbm(x0 / 90 + sp.k, z0 / 90, 2));   // patchy
    let n = Math.floor(lam) + (r() < lam % 1 ? 1 : 0); while (n-- > 0) out.push({ L, x: x0 + r() * LCELL, z: z0 + r() * LCELL, s: 0.75 + r() * 0.5, ph: r() * 100, h: r() * 6.28, lift: r() }); }
  return out; }
const CELLS = new Map(); let lifeAt = null, ACTIVE = [];
function refreshLife() { const ci = Math.floor(P_.x / LCELL), cj = Math.floor(P_.z / LCELL), n = Math.ceil(LR / LCELL), keep = new Set(); ACTIVE = [];
  for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const k = i + "," + j; keep.add(k); if (!CELLS.has(k)) CELLS.set(k, cellAnimals(i, j)); }
  for (const k of CELLS.keys()) if (!keep.has(k)) CELLS.delete(k);
  for (const L of LIFE) L.act = [];
  const all = []; for (const k of keep) for (const a of CELLS.get(k)) { a.d = Math.hypot(a.x - P_.x, a.z - P_.z); if (a.d < LR) all.push(a); }
  all.sort((a, b) => a.d - b.d); for (const a of all) if (a.L.act.length < a.L.cap) { a.L.act.push(a); ACTIVE.push(a); } }
// rocks strewn over the bare land: boulders and slabs of weathered bedrock (no soil or plants to hide them)
const ROCKS = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.95, flatShading: true }), 1600); ROCKS.count = 0; ROCKS.frustumCulled = false; scene.add(ROCKS);
const MATS = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a5034, roughness: 1 }), 900); MATS.count = 0; MATS.frustumCulled = false; scene.add(MATS);   // microbial domes on the tidal flats
let rocksAt = null; const RCELL = 32;
function refreshRocks() { const ci = Math.floor(P_.x / RCELL), cj = Math.floor(P_.z / RCELL), n = 6, c = new THREE.Color(); let k = 0;
  let km = 0; for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) { const x0 = i * RCELL, z0 = j * RCELL, h0 = baseH(x0, z0); if (h0 > 1.4 || h0 < -0.8) continue;
    const r = seeded(i * 4421 + j * 9907 + 5), nd = 18 * sstepN(fbm(x0 / 200 + 8, z0 / 200, 3), 0.45, 0.65);
    for (let q = 0; q < nd && km < 900; q++) { const x = x0 + r() * RCELL, z = z0 + r() * RCELL, s = 0.2 + r() * 0.7; O3.position.set(x, baseH(x, z) - 0.05, z); O3.rotation.set(0, r() * 6, 0); O3.scale.set(s, s * (0.25 + 0.3 * r()), s * (0.8 + 0.4 * r())); O3.updateMatrix(); MATS.setMatrixAt(km++, O3.matrix); } }
  MATS.count = km; MATS.instanceMatrix.needsUpdate = true;
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
function updateLife(t, dt) { if (!rocksAt || Math.hypot(P_.x - rocksAt[0], P_.z - rocksAt[1]) > 40) { refreshRocks(); rocksAt = [P_.x, P_.z]; } if (!lifeAt || Math.hypot(P_.x - lifeAt[0], P_.z - lifeAt[1]) > 4 || t - lifeAt[2] > 2) { refreshLife(); lifeAt = [P_.x, P_.z, t]; }
  for (const L of LIFE) { const sp = L.sp; L.act.forEach((a, i) => { const h = animalPos(a, t, _po); a.px = _po.x; a.py = _po.y; a.pz = _po.z;
      const sway = sp.habit === "sessile" || sp.habit === "burrow" ? 0.12 * Math.sin(t * 0.8 + a.ph) : 0, roll = sp.habit === "drift" ? t * 0.3 + a.ph : 0;
      _e.set(sway + (sp.habit === "swim" || sp.habit === "hunt" ? 0.08 * Math.sin(t * 2 + a.ph) : 0), sp.habit === "sessile" || sp.habit === "burrow" ? a.h : h, sway * 0.6, "YXZ"); _q.setFromEuler(_e);
      if (roll) _q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), roll)); _sc.setScalar(a.s); _mm.compose(_po, _q, _sc); L.im.setMatrixAt(i, _mm);
      if (L.comb) { L.comb.setMatrixAt(i, _mm); _cc.setHSL((t * 0.25 + a.ph * 0.1 + i * 0.07) % 1, 0.9, 0.6); L.comb.setColorAt(i, _cc); } });   // comb rows scatter light into moving rainbows
    L.im.count = L.act.length; L.im.instanceMatrix.needsUpdate = true; if (L.comb) { L.comb.count = L.act.length; L.comb.instanceMatrix.needsUpdate = true; if (L.comb.instanceColor) L.comb.instanceColor.needsUpdate = true; } } }
function nearestAnimal(r) { const c = camera.getWorldPosition(V3(0, 0, 0)); let best = null, bd = r;
  for (const a of ACTIVE) { if (a.px === undefined) continue; const d = Math.hypot(a.px - c.x, a.py - c.y, a.pz - c.z); if (d < bd) { bd = d; best = a; } } return best ? { sp: best.L.sp, a: best } : null; }

// ---------- the day: air, sun, moon, tides (values from the literature: see ENV) ----------
const DAY_REAL_MIN = 30;                                    // real minutes for one whole Cambrian day
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
const P_ = { x: START.x, z: START.z, y: 0 }; P_.y = baseH(P_.x, P_.z);
const TANK = { bar: 200, litres: 12 }; let swimming = false, depthNow = 0, maxDepth = 0, diveMin = 0;
const intro = document.getElementById("intro");
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(12,24,28,.74);color:#e6f0ee;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:600px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(12,24,28,.86);color:#e6f0ee;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:780px;display:none";
const JOURNAL = document.createElement("div"); JOURNAL.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(12,24,28,.74);color:#e6f0ee;padding:10px 12px;border-radius:10px;font:12.5px/1.45 -apple-system,Helvetica,sans-serif;max-height:calc(100vh - 300px);overflow-y:auto;min-width:230px;max-width:290px";
const WRISTC = document.createElement("canvas"); WRISTC.width = 512; WRISTC.height = 400; WRISTC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:14px;width:280px;height:219px;border:2px solid rgba(90,200,190,.6)";
document.body.append(HUD, MSG, JOURNAL, WRISTC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 14) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone"); say(ENV.arrival, 22); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyE") interact(); if (e.code === "KeyF") flying = !flying; if (e.code === "Equal") fast = Math.min(3, fast + 1); if (e.code === "Minus") fast = Math.max(0, fast - 1); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// the wrist computer: date and time, the air (on land) or depth, water and tank (in the sea), and your species count
function drawWrist(g, W, H) { g.clearRect(0, 0, W, H); g.fillStyle = "rgba(8,20,24,.92)"; g.beginPath(); g.roundRect(0, 0, W, H, 26); g.fill();
  g.strokeStyle = "#5ac8be"; g.lineWidth = 4; g.stroke(); const t = (s, x, y, sz, col = "#e6f0ee", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; g.fillText(s, x, y); };
  const hh = Math.floor(clockH), mm = Math.floor((clockH % 1) * 60);
  t(ENV.dateLabel, 22, 42, 26, "#9ae8de", 700); t(`${hh}:${String(mm).padStart(2, "0")} of a ${ENV.dayH}-hour day  ·  tide ${SEA >= 0 ? "+" : ""}${SEA.toFixed(1)} m`, 22, 78, 22);
  if (swimming || depthNow > 0.3) { const air = TANK.bar, low = air < 50;
    t(`depth ${depthNow.toFixed(1)} m  (max ${maxDepth.toFixed(1)})`, 22, 128, 34, "#ffffff", 700);
    t(`tank ${Math.round(air)} bar${low ? "  · LOW: surface!" : ""}`, 22, 172, 30, low ? "#ff8a6a" : "#ffe9a8", 700);
    t(`water ${ENV.seaT} °C  ·  dive ${Math.floor(diveMin)} min`, 22, 212, 24);
    t(`pressure ${(1 + depthNow / 10.06).toFixed(2)} atm`, 22, 246, 22, "#a8c8c4"); }
  else { t(`air: O₂ ${ENV.O2pct}%  (est. ${ENV.O2range}; today 21%)`, 22, 128, 28, "#ffffff", 700); t(`CO₂ ~${ENV.CO2ppm.toLocaleString()} ppm (${ENV.CO2range}; today ~420)`, 22, 168, 23, "#ffe9a8", 600);
    t(`air ${ENV.airT} °C  ·  sun ${Math.round(ENV.sunL * 100)}% of today's`, 22, 206, 22); t(`tank ${Math.round(TANK.bar)} bar (full: 200)`, 22, 240, 22, "#a8c8c4"); }
  const hd = ((Math.round(-yawNow() * 180 / Math.PI) % 360) + 360) % 360; t(`heading ${hd}° ${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(hd / 45) % 8]}`, 22, 290, 22);
  if (biomeNow) t(BIOMES[biomeNow][0], 300, 290, 20, "#ffe9a8", 600);
  t(`species logged: ${LOGGED.size} of ${FAUNA.length}  ·  phyla ${new Set([...LOGGED].map(s => s.phylum)).size}`, 22, 330, 22, "#9ae8de", 600);
  t(swimming ? "E: examine the nearest animal" : "walk into the sea to dive; E: examine", 22, 370, 18, "#7a9a98"); }
function yawNow() { const d = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(-d.x, -d.z); }
// the species journal: an animal is logged when you examine it (E) close up
const LOGGED = new Set(), PLACES_SEEN = new Set(); let biomeNow = null, biomeT = 0;
function drawJournal() { const byP = {}; for (const s of FAUNA) (byP[s.phylum] = byP[s.phylum] || []).push(s);
  JOURNAL.innerHTML = `<b>Environments</b> · ${PLACES_SEEN.size} of ${Object.keys(BIOMES).length}<br>` + Object.entries(BIOMES).map(([k, [n]]) => PLACES_SEEN.has(k) ? `<div data-b="${k}" style="padding-left:8px;cursor:pointer">✦ ${n}</div>` : `<div style="padding-left:8px;color:#5a7a78">· ?</div>`).join("") + `<div style="margin-top:8px"></div><b>Field journal</b> · ${LOGGED.size} of ${FAUNA.length} species<br><span style="color:#8ab0ac;font-size:11.5px">swim close to an animal and press E to examine it</span>` +
    Object.entries(byP).map(([p, L]) => `<div style="margin-top:5px;color:#9ae8de;font-weight:600">${p} <span style="color:#6a8a88;font-weight:400">${L.filter(s => LOGGED.has(s)).length}/${L.length}</span></div>` +
      L.map(s => LOGGED.has(s) ? `<div data-g="${FAUNA.indexOf(s)}" style="padding-left:8px;cursor:pointer">✦ <i>${s.genus}</i></div>` : `<div style="padding-left:8px;color:#5a7a78">· ${s.hint}</div>`).join("")).join(""); }
// the hand lens: an examined animal floats in front of you, magnified, turning slowly, until you look away or press E again
const LENS = new THREE.Group(); LENS.visible = false; camera.add(LENS); let lensT = 0;
const lensLight = new THREE.PointLight(0xffffff, 1.2, 2, 1); lensLight.position.set(0.2, 0.3, 0.2); LENS.add(lensLight);
const lensC = document.createElement("canvas"); lensC.width = 512; lensC.height = 96; const lensTex = new THREE.CanvasTexture(lensC); lensTex.colorSpace = THREE.SRGBColorSpace;
const lensLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.06), new THREE.MeshBasicMaterial({ map: lensTex, transparent: true, depthTest: false, toneMapped: false, fog: false })); lensLabel.position.set(0, -0.15, 0); lensLabel.renderOrder = 21; LENS.add(lensLabel);
function showLens(sp) { while (LENS.children.length > 2) LENS.remove(LENS.children[2]); const L = LIFE.find(q => q.sp === sp), size = sp.o.L ?? sp.o.H ?? sp.o.R * 2, k = 0.22 / size;
  const m = new THREE.Mesh(L.im.geometry, L.im.material.clone()); m.material.fog = false; if (sp.glass) m.material.opacity = 0.5; m.scale.setScalar(k); const piv = new THREE.Group(); piv.add(m);
  const box = new THREE.Box3().setFromObject(m); m.position.sub(box.getCenter(V3(0, 0, 0))); LENS.add(piv); LENS.userData.piv = piv;
  if (L.comb) { const c = new THREE.Mesh(L.comb.geometry, L.comb.material); c.scale.setScalar(k); c.position.copy(m.position); piv.add(c); }
  const g = lensC.getContext("2d"); g.clearRect(0, 0, 512, 96); g.fillStyle = "rgba(8,20,24,.8)"; g.beginPath(); g.roundRect(0, 0, 512, 96, 16); g.fill();
  g.fillStyle = "#9ae8de"; g.font = "italic 600 34px -apple-system, Helvetica, sans-serif"; g.fillText(sp.genus.split(" ")[0], 18, 42);
  g.fillStyle = "#e6f0ee"; g.font = "26px -apple-system, Helvetica, sans-serif"; g.fillText(`shown ×${k >= 10 ? Math.round(k) : k.toFixed(1)}  ·  real length ${size >= 0.1 ? (size * 100).toFixed(0) : (size * 100).toFixed(1)} cm`, 18, 80); lensTex.needsUpdate = true;
  LENS.position.set(0, -0.02, -0.55); LENS.visible = true; lensT = 22; }
function speciesCard(sp, first) { const G = GROUPS[sp.phylum] || {}; return `<b><i>${sp.genus}</i></b> <span style="color:#9ae8de">· ${G.formal || sp.phylum}</span>${first ? " · <b>new to your journal</b>" : ""}<br>${sp.text}<br><span style="color:#bfe8c8">🧬 ${G.kin || ""}</span><br><span style="color:#a8b8b4;font-size:13px">🎨 ${G.col || ""}</span>`; }
JOURNAL.addEventListener("click", e => { const bb = e.target.closest("[data-b]"); if (bb) { e.stopPropagation(); const [n, tx] = BIOMES[bb.dataset.b]; say(`<b>${n}</b> · ${tx}`, 20); return; } const d = e.target.closest("[data-g]"); if (!d) return; e.stopPropagation(); const sp = FAUNA[+d.dataset.g]; showLens(sp); say(speciesCard(sp, false), 32); });
function interact() { if (!started) return start(); if (LENS.visible) { LENS.visible = false; return; } const s = nearestAnimal(swimming ? 3.5 : 2.5);
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
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) fast = (fast + 1) % 4; if (tap("L", gp, 5)) flying = !flying; }
      else { if (gp.buttons[0]?.value > 0.3) run = 2.5; if (tap("R", gp, 4)) interact(); if (swimming || flying) up = -ay * 0.8; if (tap("R", gp, 5)) up = 0;
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 2.5; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  const floorY = baseH(P_.x, P_.z), eyeY = P_.y + 1.6, waterD = SEA - floorY;
  swimming = !flying && waterD > 1.3;                                                   // deeper than chest height: you swim
  const look = fwd.clone(); side.crossVectors(V3(fwd.x, 0, fwd.z).normalize(), UP).normalize();
  if (swimming) { const sp = (0.9 * run) * [1, 3, 10, 30][fast], f = V3(look.x, look.y, look.z).normalize();   // swim where you look; fins
    P_.x += (f.x * -my + side.x * mx) * sp * dt; P_.z += (f.z * -my + side.z * mx) * sp * dt; P_.y += (f.y * -my + up * 0.8) * sp * dt;
    P_.y = clampN(P_.y, baseH(P_.x, P_.z) + 0.25 - 0, SEA - 1.45); }                        // between the floor and floating at the surface
  else { fwd.y = 0; fwd.normalize(); const sp = (waterD > 0.4 ? 0.8 : 1.4) * run * [1, 3, 10, 30][fast];
    P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt; const g = baseH(P_.x, P_.z);
    if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + 4 * dt) : Math.max(g, P_.y - 6 * dt); }
  rig.position.set(P_.x, P_.y, P_.z);
  updateGround(P_.x, P_.z); updateLife(t, dt);
  biomeT -= dt; if (biomeT <= 0 && started) { biomeT = 0.5; const b = biomeAt(P_.x, P_.z); if (b !== biomeNow) { biomeNow = b; const first = !PLACES_SEEN.has(b); PLACES_SEEN.add(b); drawJournal(); if (first) say(`<b>${BIOMES[b][0]}</b> · ${BIOMES[b][1]}`, 18); } }
  // the scuba: air used faster the deeper you are; refilled when you are back on land
  const camY = camera.getWorldPosition(V3(0, 0, 0)).y; depthNow = Math.max(0, SEA - camY);
  if (depthNow > 0.2) { TANK.bar = Math.max(0, TANK.bar - 20 * (1 + depthNow / 10) / TANK.litres / 60 * dt); diveMin += dt / 60; maxDepth = Math.max(maxDepth, depthNow); }
  else if (waterD < 0.1 && TANK.bar < 200) { TANK.bar = Math.min(200, TANK.bar + 40 * dt); if (TANK.bar >= 200) { diveMin = 0; maxDepth = 0; } }
  if (depthNow > 50 && !frame.deepSaid) { frame.deepSaid = true; say(ENV.deepNote, 14); } if (depthNow < 40) frame.deepSaid = false;
  if (TANK.bar <= 0 && depthNow > 0.2) { P_.y = Math.min(P_.y + 1.2 * dt, SEA - 1.45); if (msgT <= 0) say("Your tank is empty: you are rising to the surface. Swim back to shore to swap tanks.", 8); }
  // sun, moon and sky through the day; the light dims and turns green-blue underwater
  const dayA = (clockH / ENV.dayH * 24 - 6) / 12 * Math.PI, el = Math.sin(dayA), sunDir = V3(-Math.cos(dayA), Math.max(el, -0.3), 0.3).normalize();
  sun.position.copy(rig.position).addScaledVector(sunDir, 800); sun.target.position.copy(rig.position);
  const day = clampN(el * 3 + 0.3, 0, 1), dusk = clampN(1 - Math.abs(el) * 4, 0, 1) * (el > -0.15 ? 1 : 0), under = depthNow > 0.05, att = under ? Math.exp(-depthNow / 9) : 1;
  sun.intensity = 2.5 * ENV.sunL * clampN(el * 3, 0, 1) * att; sun.color.setRGB(1, 0.9 - 0.3 * dusk, 0.78 - 0.45 * dusk); hemi.intensity = (0.12 + 1.0 * day) * (under ? 0.5 + 0.5 * att : 1);
  const upC = ENV.skyUp.clone().multiplyScalar(0.05 + 0.95 * day), hor = ENV.skyHor.clone().multiplyScalar(0.06 + 0.94 * day).lerp(new THREE.Color(0.95, 0.5, 0.28), dusk * 0.65);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); sky.position.copy(rig.position);
  if (under) { const u = new THREE.Color(0.16, 0.30, 0.28).multiplyScalar((0.2 + 0.8 * day) * (0.35 + 0.65 * att)); scene.fog.color.copy(u); scene.fog.density = ENV.murk; renderer.setClearColor(u); sky.visible = false; }
  else { scene.fog.color.copy(hor); scene.fog.density = IS_HEADSET ? 0.00016 : 0.00011; sky.visible = true; }
  sunDisc.position.copy(rig.position).addScaledVector(sunDir, 45000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.05 && !under; sunDisc.material.color.setRGB(1, 0.95 - 0.35 * dusk, 0.85 - 0.5 * dusk);
  const moonDir = V3(Math.cos(dayA + 2.4), Math.sin(dayA + 2.4) * 0.8 + 0.1, -0.25).normalize(); moonDisc.position.copy(rig.position).addScaledVector(moonDir, 45000); moonDisc.lookAt(rig.position); moonDisc.visible = moonDir.y > 0 && !under; moonDisc.material.opacity = 0.35 + 0.65 * (1 - day);
  water.position.set(Math.round(P_.x / 100) * 100, SEA, Math.round(P_.z / 100) * 100); waterMat.opacity = under ? 0.9 : 0.78;
  snow.visible = under; if (under) { const cp = camera.getWorldPosition(V3(0, 0, 0)); snow.position.set(Math.round(cp.x / 30) * 30, cp.y, Math.round(cp.z / 30) * 30);
    const a = snow.geometry.attributes.position; for (let i = 0; i < NSNOW; i++) { let y = a.getY(i) - dt * 0.02; if (y < -15) y += 30; a.setY(i, y); } a.needsUpdate = true; }
  if (LENS.visible) { LENS.userData.piv.rotation.y += dt * 0.5; LENS.userData.piv.rotation.x = 0.5; lensT -= dt; if (lensT <= 0) LENS.visible = false; }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  wristTm -= dt; if (wristTm <= 0) { wristTm = 0.25; drawWrist(WRISTC.getContext("2d"), 512, 400); wristT.needsUpdate = true; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3; const near = nearestAnimal(swimming ? 6 : 3);
    HUD.innerHTML = `<b>${ENV.dateLabel}</b> · ${ENV.siteLabel}<br>${biomeNow ? `<span style="color:#ffe9a8">${BIOMES[biomeNow][0]}</span> · ` : ""}${swimming ? `diving · ${depthNow.toFixed(1)} m` : waterD > 0.3 ? "wading" : flying ? "flying (to look around)" : "on foot"}${fast ? ` · pace ×${[1, 3, 10, 30][fast]}` : ""}${near ? ` · nearby: ${LOGGED.has(near.sp) ? "<i>" + near.sp.genus + "</i>" : "an animal: press E to examine"}` : ""}<br>
      <span style="color:#8ab0ac;font-size:12.5px">WASD move · drag to look · in the sea you swim where you look (space up, C down) · shift faster · − / = pace · E examine · F fly</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(msgText); vrDirty = false; } }
  renderer.render(scene, camera);
}

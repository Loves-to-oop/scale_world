// time_train.js -- a train that travels back in time: one year every second. Built into time_train.html by build.py.
//
// The train runs at a steady 25 m/s, and every 25 m of track is one year: so the land beside the line is a timeline laid out in
// space, the year of each spot fixed by its distance from the start (the present). A sign stands at every year; boards mark events;
// and the scenery (buildings, vehicles, people, plants, animals, ice) belongs to the year of the ground it stands on. The place is a
// river valley in the north-east of North America (like the Hudson, along which Amtrak's Empire Service runs), so the deep past is
// that region's: Lenape villages, ice-age tundra and the Laurentide ice sheet, and, two years of travel away, the dinosaurs' last day.

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


// ---------- time and place: the year of a spot is set by its distance along the line ----------
const NOW = 2026, V = 25, WATER = 0;                                   // metres of track per year (and the train's speed, m/s)
const yearAt = x => NOW - x / V;                           // x = distance along the line from the present (track runs toward +x)
const xOfYear = y => (NOW - y) * V;
const BP = y => NOW - y;                                   // years before the present
const fmtYear = y => { const b = Math.round(BP(y)); if (y > NOW) return `${Math.round(y)} (the future)`; if (b >= 10000) return b >= 1e9 ? `${(b / 1e9).toFixed(b >= 1e10 ? 2 : 2)} billion years ago` : b >= 1e6 ? `${(b / 1e6).toFixed(b >= 1e7 ? 0 : 2)} million years ago` : `${b.toLocaleString()} years ago`;
  const r = Math.round(y); return r > 0 ? (r < 1000 ? `${r} CE` : `${r}`) : `${1 - r} BCE`; };   // (there is no year 0: 1 BCE is followed by 1 CE)
// the track: gently curving beside a broad river, as along the Hudson
const trackZ = x => 380 * Math.sin(x / 6100) + 170 * Math.sin(x / 2300 + 1.3), trackDZ = x => 380 / 6100 * Math.cos(x / 6100) + 170 / 2300 * Math.cos(x / 2300 + 1.3);
const trackH = x => Math.atan2(-1, -trackDZ(x));          // the heading of travel toward +x, for a group whose front is -z
const RIVER0 = 160, RIVER1 = 1300;                          // the river lies between these distances to the left (north-west) of the line
// ice: the Laurentide ice sheet covered the valley at the last glacial maximum (~26,000-19,000 years ago), and in earlier glacials
function iceThick(y) { const b = BP(y); let t = 0;
  if (b > 19000 && b < 27000) t = 1; else if (b > 16000 && b <= 19000) t = (b - 16000) / 3000; else if (b >= 27000 && b < 32000) t = 1 - (b - 27000) / 5000;
  const cyc = [[140000, 25000], [250000, 22000], [350000, 22000], [440000, 20000], [630000, 25000], [870000, 20000]]; for (const [c, w] of cyc) { const d = Math.abs(b - c); if (d < w) t = Math.max(t, 1 - sstepN(d, w * 0.6, w)); }
  return clampN(t, 0, 1) * 1100; }
const trackE = x => 22 + 14 * Math.sin(x / 15000) + 6 * Math.sin(x / 3800) + iceThick(yearAt(x));
function terrainH(x, z) { const dz = z - trackZ(x), y = yearAt(x), b = BP(y), ice = iceThick(y), e = trackE(x) - ice;
  let h = e + 8 * (fbm(x / 700, z / 700, 3) - 0.5);
  if (dz < -RIVER0) { const d = -dz; if (d < RIVER1 + 200) h = lerpN(-6 - 4 * sstepN(d, RIVER0 + 100, RIVER0 + 500) * (1 - sstepN(d, RIVER1 - 400, RIVER1)), h, sstepN(d, RIVER0 - 40, RIVER0 + 60) * (1 - sstepN(d, RIVER1 - 60, RIVER1 + 40)));   // the river
    if (d >= RIVER1) h = e + (d - RIVER1 > 0 ? (40 + 260 * fbm(x / 3000 + 4, z / 3000, 4)) * sstepN(d, RIVER1, RIVER1 + 500) : 0); }                                   // the far bank: palisades and highlands
  else if (dz > 60) h += (dz - 60) * 0.06 * (0.4 + fbm(x / 2500 + 9, z / 2500, 3)) + 90 * sstepN(dz, 400, 3000) * fbm(x / 4000, z / 4000 + 3, 4);                       // the near side rising into hills
  if (Math.abs(dz) < 40) h = lerpN(e - 0.6, h, sstepN(Math.abs(dz), 8, 40));                                                                                             // the line's bed
  return h + ice * (1 + 0.04 * (fbm(x / 1200, z / 1200, 3) - 0.5)); }                                                                                                  // ice over everything at a glacial maximum
// eras: what stands beside the line in a given year
function era(y) { const b = BP(y); if (y > 1990) return "modern"; if (y > 1950) return "postwar"; if (y > 1900) return "early20"; if (y > 1830) return "railway"; if (y > 1624) return "colonial";
  if (b < 1100) return "lenape"; if (b < 3000) return "woodland"; if (b < 10500) return "archaic"; if (b < 13500) return "paleo"; if (iceThick(y) > 300) return "ice"; if (b < 2.6e6) return "glacial";
  if (b < 23e6) return "neogene"; if (b < 56e6) return "paleogene"; return "cretaceous"; }

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
// the colour of the land, by the era of the ground: lawns and roads, fields and pasture, forest, tundra, ice, ancient forests
function groundColor(x, z, h, c) { const y = yearAt(x), E = era(y), n1 = fbm(x / 60, z / 60, 3), n2 = fbm(x / 900 + 5, z / 900, 3), dz = z - trackZ(x);
  if (h < -1 && iceThick(y) < 50) { c.setRGB(0.36, 0.34, 0.28); return c; }
  const forest = sstepN(fbm(x / 1800 + 31, z / 1800 - 7, 4), 0.42, 0.6);
  c.setRGB(0.22 + 0.06 * n2, 0.36 + 0.07 * n1, 0.14);                                                         // deciduous woodland floor and meadow (summer)
  if (E === "modern" || E === "postwar" || E === "early20" || E === "railway" || E === "colonial") { const open = 1 - forest * (E === "colonial" ? 0.6 : 0.4);
    const strip = Math.floor((x * 0.8 + z * 0.2) / 70) + Math.floor(z / 260) * 7, k = hash(strip, 3); c.lerp(k < 0.4 ? _c1.setRGB(0.42, 0.55, 0.24) : k < 0.6 ? _c1.setRGB(0.66, 0.6, 0.34) : _c1.setRGB(0.36, 0.5, 0.22), open * 0.6); }
  if (E === "lenape" && forest < 0.3 && fbm(x / 300, z / 300, 2) > 0.55) c.lerp(_c1.setRGB(0.48, 0.52, 0.26), 0.6);                // maize, bean and squash fields in clearings
  if (E === "paleo" || E === "glacial") c.lerp(_c1.setRGB(0.42 + 0.06 * n1, 0.44 + 0.05 * n1, 0.30), E === "glacial" ? 0.5 + 0.3 * n2 : 0.35);   // spruce parkland, tundra and steppe
  if (E === "neogene" || E === "paleogene" || E === "cretaceous") c.lerp(_c1.setRGB(0.18, 0.36 + 0.05 * n1, 0.12), 0.5);           // warm, lush ancient forest
  const ice = iceThick(y); if (ice > 1) c.lerp(_c1.setRGB(0.88 + 0.06 * n1, 0.92 + 0.04 * n1, 0.96), sstepN(ice, 0, 200));          // the ice sheet
  if (h < 1 && h > -1.5) c.lerp(_c1.setRGB(0.55, 0.52, 0.42), 0.6);
  return c; }

// ---------- the train: five cars you can walk through (front to back): two sleeping cars, the dining car, the lounge, and the
// observation car with its open rear platform. Train coordinates: x across (+ right), z along (- toward the front), y up from the floor.
const TRAIN = new THREE.Group(); scene.add(TRAIN); TRAIN.add(rig);
const CAR_L = 24, GAP = 1.2, CAR_W = 3.0, CAR_H = 2.5, NCARS = 5, CARS = ["sleeping car 1 (roomettes)", "sleeping car 2 (roomettes)", "dining car", "lounge car", "observation car"];
const carZ = k => (k - (NCARS - 1) / 2) * (CAR_L + GAP);       // centre of car k
const WALK = [];                                               // walkable rectangles: [x0, x1, z0, z1]
const woodT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6a3e22"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${40 + 30 * Math.sin(y * 0.21)},${20 + 15 * Math.sin(y * 0.13)},10,.18)`; g.fillRect(0, y, w, 1); } }, [2, 1]);
const carpetT = tex(128, 128, (g, w, h) => { g.fillStyle = "#2a3a5a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(220,180,90,.35)"; g.lineWidth = 2; for (let k = -w; k < w * 2; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); } }, [3, 18]);
const IMT = { wood: new THREE.MeshStandardMaterial({ map: woodT, roughness: 0.55 }), panel: M(0xe4e2dc, { roughness: 0.7 }), carpet: new THREE.MeshStandardMaterial({ map: carpetT, roughness: 1 }), brass: M(0xc9a227, { metalness: 0.8, roughness: 0.3 }),
  velvet: M(0x3a4a6a, { roughness: 0.95 }), green: M(0x4a5a78, { roughness: 0.95 }), linen: M(0xf2ede0, { roughness: 0.9 }), dark: M(0x2a241e, { roughness: 0.8 }), glass: new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }), outside: M(0xc8ccd0, { metalness: 0.6, roughness: 0.35 }), roofM: M(0x3a3e44, { metalness: 0.5, roughness: 0.5 }) };
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
  if (!opts.noFront && !opts.noBoard) itineraryBoard(g, L);
  return g; }
const ITC = document.createElement("canvas"); ITC.width = 512; ITC.height = 768; const itT = new THREE.CanvasTexture(ITC); itT.colorSpace = THREE.SRGBColorSpace;
function itineraryBoard(g, L) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.42), new THREE.MeshBasicMaterial({ map: itT, toneMapped: false })); b.position.set(-0.98, 1.35, -L / 2 + 0.06); g.add(b); return b; }
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
{ const k = 3, g = shell(k, { noBoard: true }); WALK.push([-1.3, 1.3, carZ(k) - CAR_L / 2 + 1.1, carZ(k) + CAR_L / 2 - 0.2]); WALK.push([-0.5, 0.5, carZ(k) - CAR_L / 2 - 0.1, carZ(k) - CAR_L / 2 + 1.2]);
  for (let r = 0; r < 5; r++) { const z = -CAR_L / 2 + 4 + r * 3.6; for (const sd of [-1, 1]) { const x = sd * 0.95;
      box(g, 0.7, 0.42, 0.7, x, 0.21, z, IMT.velvet); box(g, 0.12, 0.6, 0.7, x - sd * 0.32, 0.6, z, IMT.velvet); box(g, 0.7, 0.3, 0.12, x, 0.55, z - 0.32, IMT.velvet); box(g, 0.7, 0.3, 0.12, x, 0.55, z + 0.32, IMT.velvet); } }
  box(g, 2.2, 1.05, 0.5, 0, 0.52, CAR_L / 2 - 1.2, IMT.wood); box(g, 2.3, 0.05, 0.6, 0, 1.06, CAR_L / 2 - 1.2, IMT.brass);   // the bar
  mapPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.8), new THREE.MeshBasicMaterial({ map: mapT, toneMapped: false })); mapPanel.position.set(-0.8, 1.35, -CAR_L / 2 + 2.46); g.add(mapPanel);   // on a stand beside the aisle (the door stays clear)
  box(g, 1.35, 1.8, 0.06, -0.8, 0.9, -CAR_L / 2 + 2.42, IMT.wood);
  addLight(g, 0, 2.2, -5, 0.5); addLight(g, 0, 2.2, 5, 0.5); }
// the observation car: glass walls and roof, armchairs turned outward, and an open platform with a railing at the very back
{ const k = 4, g = shell(k, { glass: true, noBack: true }); WALK.push([-1.3, 1.3, carZ(k) - CAR_L / 2 - 0.1, carZ(k) + CAR_L / 2 + 0.05]); WALK.push([-1.35, 1.35, carZ(k) + CAR_L / 2, carZ(k) + CAR_L / 2 + 2.3]);
  for (let r = 0; r < 6; r++) { const z = -CAR_L / 2 + 3 + r * 3.3; for (const sd of [-1, 1]) { const x = sd * 0.85; const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = -sd * Math.PI / 2 * 0.7; g.add(ch);
      box(ch, 0.7, 0.42, 0.7, 0, 0.21, 0, IMT.green); box(ch, 0.7, 0.6, 0.12, 0, 0.6, 0.32, IMT.green); } }
  const pz = CAR_L / 2 + 1.2; box(g, CAR_W, 0.08, 2.4, 0, -0.04, pz, M(0x5a4a3a)); for (const sd of [-1, 1]) box(g, 0.05, 1.05, 2.4, sd * CAR_W / 2, 0.52, pz, IMT.brass); box(g, CAR_W, 1.05, 0.05, 0, 0.52, pz + 1.2, IMT.brass);
  for (const sd of [-1, 1]) box(g, 0.04, 1.05, 0.04, sd * CAR_W / 2, 0.52, pz + 1.2, IMT.brass); box(g, CAR_W, 0.05, 0.05, 0, 1.05, pz + 1.2, IMT.brass);
  addLight(g, 0, 2.2, 0, 0.4); }
// the front of the train: a streamlined nose
itineraryBoard(TRAIN.children.find(c => c.position.z === carZ(0)) || TRAIN, CAR_L);
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


// ---------- the scenery of each era, generated 400 m of track (16 years) at a time; each thing takes the year of its own spot ----------
Object.assign(STYLE, { modern: { wall: [0xe8e8e4, 0xc8d0d8, 0xd8ccb8, 0xa8b4bc], roof: [0x3a3c40, 0x5a5a5a, 0x4a3e38], stone: 0xb8b4ac }, postwar: { wall: [0xe8dcc0, 0xc8d8c8, 0xe0c8c0, 0xd8d8e0], roof: [0x5a5a5a, 0x6a5a4a, 0x3e4a5a], stone: 0xb8b0a0 },
  early20: { wall: [0xe0d8c8, 0xa8584a, 0xd8d0b8, 0x8a6a5a], roof: [0x4a4a4a, 0x5a4a3e, 0x3e3e44], stone: 0xa8584a }, railway: { wall: [0xe8e0d0, 0xc8b8a0, 0x9a5a48], roof: [0x5a5048, 0x4a4440, 0x6a5a48], stone: 0x9a5a48 },
  colonial: { wall: [0xe8e0d0, 0xb8705a, 0xa89878], roof: [0x5a4a3e, 0x6a5a48, 0x4a4038], stone: 0xa89a88 } });
for (const k of ["modern", "postwar", "early20", "railway", "colonial"]) STYLE[k].wall = STYLE[k].wall.slice(0, 3);
const KM2 = { asphalt: M(0x3a3c40, { roughness: 0.95 }), rail: M(0x6a6a6a, { metalness: 0.7, roughness: 0.4 }), tie: M(0x4a3a2a), bark: M(0x7a6a52, { roughness: 1 }), hide: M(0xa88a6a, { roughness: 1 }),
  fur: M(0x6a4a30, { roughness: 1 }), grey: M(0x7a7470, { roughness: 1 }), white: M(0xf0f0ec, { roughness: 0.5 }), dino: M(0x6a6a48, { roughness: 0.9 }), glassDark: M(0x22303c, { metalness: 0.5, roughness: 0.3 }) };
Object.assign(KM, KM2);
Object.assign(UG, { quad: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), arch: new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, 0), ball: new THREE.SphereGeometry(0.5, 10, 7) });
// an animal from simple parts: body, legs, head (with tusks and trunk for proboscideans, a long neck for camels, upright for theropods)
function animal(K, kind, x, gy, z, ry, s = 1) { const c = Math.cos(ry), sn = Math.sin(ry), at = (a, b) => [x + sn * b + c * a, z + c * b - sn * a];
  const A = { mammoth: [3.2, 3.0, 0x5a3e28, "fur"], mastodon: [2.8, 2.6, 0x6a4a30, "fur"], caribou: [1.1, 1.2, 0x8a7a64, "hide"], deer: [0.9, 1.0, 0x9a6a44, "hide"], horse: [1.4, 1.5, 0x8a6a48, "hide"], cow: [1.3, 1.4, 0x7a5a40, "hide"],
    muskox: [1.2, 1.3, 0x3a2a1e, "fur"], camel: [1.6, 2.0, 0xb89a70, "hide"], bison: [1.5, 1.6, 0x4a3424, "fur"], hadrosaur: [4, 3.0, 0x6a6a48, "dino"], theropod: [3.2, 2.6, 0x5a5a40, "dino"] }[kind]; if (!A) return;
  const [L, H, col, mat] = A.map((v, i) => i < 2 ? v * s : v); const biped = kind === "theropod" || kind === "hadrosaur";
  const [bx, bz] = at(0, 0); K.add("ball", mat, bx, gy + H * (biped ? 0.55 : 0.62), bz, L * (biped ? 0.5 : 0.55), H * 0.45, L, ry, col);
  if (!biped) for (const [a, b] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const [lx, lz] = at(a * L * 0.17, b * L * 0.32); K.add("box", mat, lx, gy, lz, L * 0.12, H * 0.5, L * 0.12, ry, col); }
  else for (const a of [-1, 1]) { const [lx, lz] = at(a * L * 0.14, -L * 0.05); K.add("box", mat, lx, gy, lz, L * 0.12, H * 0.42, L * 0.16, ry, col); }
  const [hx, hz] = at(0, L * 0.55); K.add("ball", mat, hx, gy + H * (kind === "camel" ? 1.15 : biped ? 0.75 : 0.72), hz, L * 0.3, H * 0.3, L * 0.38, ry, col);
  if (kind === "mammoth" || kind === "mastodon") { const [tx, tz] = at(0, L * 0.7); K.add("box", mat, tx, gy + H * 0.15, tz, L * 0.08, H * 0.5, L * 0.08, ry, col); for (const a of [-1, 1]) { const [ux, uz] = at(a * L * 0.1, L * 0.75); K.add("box", "white", ux, gy + H * 0.35, uz, L * 0.04, L * 0.04, L * 0.35, ry, 0xf0e8d8); } }
  if (biped) { const [tx, tz] = at(0, -L * 0.7); K.add("ball", mat, tx, gy + H * 0.5, tz, L * 0.18, H * 0.18, L * 0.7, ry, col); } }
function person(K, x, gy, z, ry, col, s = 1) { K.add("cyl", "wall", x, gy, z, 0.45 * s, 1.15 * s, 0.4 * s, ry, col); K.add("ball", "wall", x, gy + 1.38 * s, z, 0.25 * s, 0.28 * s, 0.25 * s, 0, 0xc8a080); }
function car(K, x, gy, z, ry, y, r) { const col = [0xb8382a, 0x2a4a8a, 0xe8e8e4, 0x2a2a2a, 0x8a8a8a, 0x3a6a3a, 0xd8b84a][(r() * 7) | 0], L = y > 1990 ? 4.5 : y > 1950 ? 5.2 : 3.6, H = y > 1990 ? 1.45 : y > 1950 ? 1.35 : 1.9;
  K.add("box", "wall", x, gy + 0.3, z, 1.8, H * 0.5, L, ry, col); K.add("box", y > 1950 ? "glassDark" : "wall", x, gy + 0.3 + H * 0.5, z, 1.6, H * 0.45, L * (y > 1950 ? 0.55 : 0.6), ry, y > 1950 ? 0x22303c : col);
  for (const [a, b] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const c = Math.cos(ry), s = Math.sin(ry); K.add("cyl", "tie", x + c * a * 0.85 + s * b * L * 0.32, gy, z - s * a * 0.85 + c * b * L * 0.32, 0.6, 0.25, 0.6, ry + Math.PI / 2, 0x222222); } }
function wagon(K, x, gy, z, ry) { K.add("box", "wood", x, gy + 0.7, z, 1.6, 0.8, 3.2, ry); const c = Math.cos(ry), s = Math.sin(ry); animal(K, "horse", x + s * 3.2, gy, z + c * 3.2, ry, 1); }
function longhouse(K, x, gy, z, ry, L) { const c = Math.cos(ry), s = Math.sin(ry); for (let k = 0; k < Math.round(L / 2); k++) { const a = -L / 2 + 1 + k * 2; K.add("arch", "bark", x + s * a, gy + 0.2, z + c * a, 2.05, 5.5, 6, ry + Math.PI / 2, 0x7a6a52); } }
function wigwam(K, x, gy, z) { K.add("ball", "bark", x, gy - 0.3, z, 4.5, 5, 4.5, 0, 0x7a6a52); }
function tent(K, x, gy, z) { K.add("cone", "hide", x, gy, z, 4, 3.4, 4, 0, 0xa88a6a); }
function boat(K, x, gy, z, ry, kind) { if (kind === "canoe") { K.add("box", "wood", x, gy, z, 0.8, 0.5, 7, ry); return; }
  K.add("box", "wood", x, gy - 0.5, z, 5, 2, 16, ry, 0x5a4a3a); K.add("box", "wood", x, gy + 1.5, z, 0.35, 14, 0.35, ry); K.add("box", "wall", x, gy + 4, z + 1, 0.1, 9, 7, ry, 0xe8e0d0); }
function steamboat(K, x, gy, z, ry) { K.add("box", "wall", x, gy - 0.5, z, 8, 3, 40, ry, 0xf0ece0); K.add("box", "wall", x, gy + 2.5, z, 6, 3, 24, ry, 0xe8e4d8); K.add("cyl", "wall", x, gy + 5, z, 1.4, 8, 1.4, 0, 0x2a2a2a); K.add("cyl", "wood", x + 4.5 * Math.cos(ry), gy - 0.5, z - 4.5 * Math.sin(ry), 6, 6, 1.5, ry + Math.PI / 2, 0xb83a2a); }
function pole(K, x, gy, z, ry, h = 9) { K.add("box", "wood", x, gy, z, 0.25, h, 0.25, 0); K.add("box", "wood", x, gy + h - 0.6, z, 2.2, 0.15, 0.15, ry); }
function turbine(K, x, gy, z, ry) { K.add("cyl", "white", x, gy, z, 3.5, 90, 3.5, 0, 0xf0f0ec); K.add("box", "white", x, gy + 90, z, 3, 3, 9, ry, 0xf0f0ec); for (let b = 0; b < 3; b++) { const a = b * 2.094; K.add("box", "white", x + Math.sin(ry) * -4.5 + Math.cos(ry) * Math.sin(a) * 24, gy + 91.5 + Math.cos(a) * 24, z + Math.cos(ry) * -4.5 - Math.sin(ry) * Math.sin(a) * 24, 1.2, 48, 0.4, ry, 0xf0f0ec); } }
function factory(K, x, gy, z, ry, col) { K.add("box", "wall", x, gy - 0.5, z, 24, 12, 50, ry, col); K.add("gable", "roof", x, gy + 11.5, z, 25, 5, 51, ry, 0x4a4440); K.add("cyl", "wall", x + 16 * Math.cos(ry), gy - 0.5, z - 16 * Math.sin(ry), 3, 40, 3, 0, col); }
function tree2(K, x, gy, z, s, kind) { if (kind === "spruce") { K.add("trunk", "wood", x, gy, z, s, 2 * s, s, 0); K.add("cone", "leaf", x, gy + 1.5 * s, z, 3.6 * s, 13 * s, 3.6 * s, 0, 0x2e4a2a); return; }
  if (kind === "palm") { K.add("trunk", "wood", x, gy, z, s * 0.8, 9 * s, s * 0.8, 0); K.add("ball", "leaf", x, gy + 9.5 * s, z, 6 * s, 2 * s, 6 * s, 0, 0x3e6a2a); return; }
  if (kind === "cycad") { K.add("trunk", "wood", x, gy, z, s * 1.4, 2 * s, s * 1.4, 0); K.add("ball", "leaf", x, gy + 2.6 * s, z, 3.4 * s, 1.6 * s, 3.4 * s, 0, 0x4a6a2a); return; }
  K.add("trunk", "wood", x, gy, z, s, 5 * s, s, 0); K.add("tree", "leaf", x, gy + 7.5 * s, z, 4.4 * s, 4 * s, 4.4 * s, hash(x | 0, z | 0) * 6, kind === "dark" ? 0x2e4a24 : 0x3a5e2a); }
const TILE = 400, TR = IS_HEADSET ? 6 : 9, TILES = new Map();
function genTile(ti) { const r = seeded(ti * 7919 + 11), x0 = ti * TILE, K = new Kit(), side = (a, b) => r() * (b - a) + a;
  const put = (fn, minDz, maxDz, n) => { for (let k = 0; k < n; k++) { const x = x0 + r() * TILE, dz = side(minDz, maxDz), z = trackZ(x) + dz, gy = terrainH(x, z); fn(x, z, gy, yearAt(x), era(yearAt(x)), dz); } };
  const X = (x) => x - x0, ZZ = (z) => z;   // the tile is anchored at (x0, 0, 0)
  // trees by era
  put((x, z, gy, y, E, dz) => { if (iceThick(y) > 30 || gy < 0.5) return; const f = fbm(x / 1800 + 31, z / 1800 - 7, 4); const dense = ["lenape", "woodland", "archaic", "neogene", "paleogene", "cretaceous"].includes(E) ? 0.35 : E === "paleo" ? 0.45 : E === "glacial" ? 0.6 : 0.5;
    if (f < dense || (Math.abs(dz) < 25)) return; const kind = E === "paleo" || E === "glacial" ? "spruce" : E === "paleogene" ? (r() < 0.4 ? "palm" : "dark") : E === "cretaceous" ? (r() < 0.5 ? "cycad" : r() < 0.6 ? "spruce" : "dark") : "broad";
    tree2(K, X(x), gy, ZZ(z), 0.8 + r() * 0.6, kind); }, -RIVER0 + 30, 900, IS_HEADSET ? 160 : 260);
  put((x, z, gy, y, E, dz) => { if (iceThick(y) > 30) return; const f = fbm(x / 1800 + 31, z / 1800 - 7, 4); if (f < 0.4) return; tree2(K, X(x), gy, ZZ(z), 0.9 + r() * 0.6, E === "paleo" || E === "glacial" ? "spruce" : "broad"); }, -RIVER1 - 900, -RIVER1 - 50, 80);   // the far bank
  // buildings, roads, vehicles: each by the year of its own spot
  put((x, z, gy, y, E, dz) => { const st = STYLE[E]; if (!st || gy < 0.5) return; const ry = trackH(x) + (r() < 0.5 ? 0 : Math.PI / 2);
    if (E === "modern" || E === "postwar") { house(K, X(x), gy, ZZ(z), 9 + r() * 4, 11 + r() * 5, ry, E, r); if (E === "modern" && y > 2010 && r() < 0.3) K.add("box", "glassDark", X(x), gy + 6.4, ZZ(z) - 2, 6, 0.2, 4, ry, 0x22303c); }   // solar panels
    else if (E === "early20" || E === "railway") { if (r() < 0.06 && y > 1840) factory(K, X(x), gy, ZZ(z), ry, st.stone); else { house(K, X(x), gy, ZZ(z), 8 + r() * 3, 10 + r() * 4, ry, E, r); if (r() < 0.25) { K.add("box", "wall", X(x) + 25, gy - 0.5, ZZ(z), 12, 9, 20, ry, 0x9a3a2a); K.add("gable", "roof", X(x) + 25, gy + 8.5, ZZ(z), 13, 5, 21, ry, 0x4a4440); } } }   // houses, red barns, mills
    else if (E === "colonial") { house(K, X(x), gy, ZZ(z), 9, 12, ry, E, r); if (r() < 0.3) { K.add("box", "wall", X(x) + 22, gy - 0.5, ZZ(z) + 8, 12, 8, 18, ry, 0x9a3a2a); K.add("gable", "roof", X(x) + 22, gy + 7.5, ZZ(z) + 8, 13, 6, 19, ry, 0x5a4a3e); } } },
    40, 700, 28);
  put((x, z, gy, y, E, dz) => { if (gy < 0.5) return; const ry = trackH(x) + r() * 3;
    if (E === "lenape") { if (r() < 0.6) longhouse(K, X(x), gy, ZZ(z), ry, 14 + r() * 14); else wigwam(K, X(x), gy, ZZ(z)); for (let q = 0; q < 3; q++) person(K, X(x) + side(-8, 8), gy, ZZ(z) + side(-8, 8), r() * 6, [0x8a6a4a, 0x6a4a30, 0xa88a6a][q]); }
    else if (E === "woodland") { wigwam(K, X(x), gy, ZZ(z)); person(K, X(x) + 5, gy, ZZ(z), r() * 6, 0x8a6a4a); }
    else if (E === "archaic" || (E === "paleo" && BP(y) < 13100)) { tent(K, X(x), gy, ZZ(z)); person(K, X(x) + 4, gy, ZZ(z) + 2, r() * 6, 0x8a6a4a); person(K, X(x) - 3, gy, ZZ(z) + 3, r() * 6, 0x6a4a30); } },
    40, 600, 10);
  // animals
  put((x, z, gy, y, E, dz) => { if (gy < 0.5 || iceThick(y) > 30) return; const b = BP(y), ry = r() * 6.28;
    const kinds = E === "paleo" ? ["mastodon", "caribou", "deer"] : E === "glacial" ? ["mammoth", "mastodon", "caribou", "muskox", "horse", "bison"] : E === "neogene" ? ["mastodon", "horse", "camel", "deer"] : E === "paleogene" ? ["deer", "horse"] : E === "cretaceous" ? ["hadrosaur", "hadrosaur", "theropod"] :
      E === "colonial" || E === "railway" || E === "early20" ? ["cow", "horse", "cow"] : ["deer"]; const kind = kinds[(r() * kinds.length) | 0], n = kind === "caribou" || kind === "bison" || kind === "hadrosaur" ? 4 : 1;
    for (let q = 0; q < n; q++) animal(K, kind, X(x) + side(-15, 15), gy, ZZ(z) + side(-15, 15), ry + side(-0.4, 0.4), 0.9 + r() * 0.2); }, 60, 900, 6);
  // the road beside the line, with vehicles; poles; turbines
  for (let k = 0; k < TILE; k += 20) { const x = x0 + k, y = yearAt(x), E = era(y), z = trackZ(x) + 70, gy = terrainH(x, z), ry = trackH(x); if (gy < 0.5) continue;
    if (E === "modern" || E === "postwar" || E === "early20") K.add("box", "asphalt", X(x), gy - 0.05, ZZ(z), y > 1925 ? 8 : 6, 0.2, 21, ry, y > 1925 ? 0x3a3c40 : 0x8a7a5a);
    else if (E === "railway" || E === "colonial") K.add("box", "asphalt", X(x), gy - 0.08, ZZ(z), 5, 0.2, 21, ry, 0x8a7a5a);
    if (k % 60 === 0 && y > 1846 && y <= NOW + 20) pole(K, X(x), gy, ZZ(z) - 6, ry, y > 1950 ? 11 : 8);
    if (k % 100 === 0 && r() < 0.5) { if (E === "modern" || E === "postwar" || (E === "early20" && y > 1912)) car(K, X(x), gy, ZZ(z) + side(-2, 2), ry + (r() < 0.5 ? Math.PI : 0), y, r); else if (E === "early20" || E === "railway" || (E === "colonial" && y > 1700)) wagon(K, X(x), gy, ZZ(z), ry + (r() < 0.5 ? Math.PI : 0)); } }
  if (r() < 0.35) put((x, z, gy, y) => { if (y > 2004 && y <= NOW + 30 && gy > 30) turbine(K, X(x), gy, ZZ(z), r() * 6); }, 900, 2500, 2);
  // on the river: sloops, steamboats, canoes, barges
  put((x, z, gy, y, E) => { if (iceThick(y) > 30) return; const ry = trackH(x) + (r() < 0.5 ? 0 : Math.PI); if (y > 1807 && y < 1960 && r() < 0.5) steamboat(K, X(x), 0, ZZ(z), ry); else if (y > 1609 && y < 1900) boat(K, X(x), 0, ZZ(z), ry, "sloop"); else if (y > 1950) K.add("box", "wall", X(x), -0.5, ZZ(z), 8, 3, 30, ry, 0x6a3a2a);
    else if (E === "lenape" || E === "woodland" || E === "archaic") { boat(K, X(x), 0.05, ZZ(z), ry, "canoe"); person(K, X(x), 0.2, ZZ(z), ry, 0x6a4a30, 0.8); } }, -RIVER1 + 150, -RIVER0 - 80, 3);
  // the rails, from when the Hudson River Railroad opened (1851) to now; before that the train runs on nothing anyone can see
  for (let k = 0; k < TILE; k += 2.5) { const x = x0 + k, y = yearAt(x); if (y < 1851 || y > NOW + 40) continue; const z = trackZ(x), gy = trackE(x) - 0.6, ry = trackH(x); K.add("box", "tie", X(x), gy, ZZ(z), 2.6, 0.16, 0.25, ry + Math.PI / 2);
    if (k % 10 === 0) for (const e of [-0.72, 0.72]) K.add("box", "rail", X(x) + Math.sin(ry + Math.PI / 2) * e, gy + 0.16, ZZ(z) + Math.cos(ry + Math.PI / 2) * e, 0.08, 0.15, 10.1, ry); }
  periodFolk(K, x0, r);
  return anchor(K.build(), x0, 0, 0); }
function streamTiles(x) { const ci = Math.floor(x / TILE); let made = 0;
  for (let d = 0; d <= TR; d++) for (const i of d ? [ci + d, ci - d] : [ci]) { if (!TILES.has(i) && made < 2) { TILES.set(i, genTile(i)); made++; } }
  for (const [i, g] of TILES) if (Math.abs(i - ci) > TR + 1) { unanchor(g); g.traverse(o => o.isInstancedMesh && o.dispose()); TILES.delete(i); } }

// ---------- a sign at every year, and boards for events ----------
// Signs stand on the right of the line, one every 25 m (one a second). Boards mark events (world and local history), placed at their year.
const signLabel = y => { const b = Math.round(BP(y)), r = Math.round(y); if (y > NOW + 0.5) return [String(r), "the future"]; if (b >= 10000) return [b.toLocaleString(), "years ago"]; return r > 0 ? [String(r), r < 1000 ? "CE" : ""] : [String(1 - r), "BCE"]; };
const SIGNS = []; const NSIGN = 12;   // a big sign every 10 years (the lines on the ground mark every year)
for (let k = 0; k < NSIGN; k++) { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(); g.scale.setScalar(1.8); const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); b.position.y = 3.2; g.add(b); const bk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), M(0x5a5a5a)); bk.rotation.y = Math.PI; bk.position.y = 3.2; g.add(bk);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12).translate(0, 1.6, 0), M(0x5a5a5a)); g.add(p); WORLD.add(g); SIGNS.push({ g, c, t, b, year: null, x: 0 }); }
function drawSign(S, y) { const g = S.c.getContext("2d"), [a, b] = signLabel(y); g.fillStyle = "#123a2a"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#f0e8d0"; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118);
  g.fillStyle = "#f8f4e8"; g.textAlign = "center"; let fs = 70; do { g.font = `700 ${fs}px Helvetica, Arial, sans-serif`; } while (g.measureText(a).width > 230 && --fs > 20); g.fillText(a, 128, b ? 78 : 88); if (b) { g.font = "600 24px Helvetica, Arial, sans-serif"; g.fillText(b, 128, 112); } S.t.needsUpdate = true; }
function updateSigns(xT) { const yT = yearAt(xT), y0 = Math.ceil((yT + 40) / 10) * 10, want = new Set(); for (let k = 0; k < NSIGN; k++) want.add(y0 - k * 10);
  const free = SIGNS.filter(S => !want.has(S.year)); for (const y of want) { if (SIGNS.some(S => S.year === y)) continue; const S = free.pop(); if (!S) break; S.year = y; drawSign(S, y); S.x = xOfYear(y) - 6; }
  for (const S of SIGNS) { if (S.year === null) continue; const z = trackZ(S.x) + 7, gy = Math.max(terrainH(S.x, z), trackE(S.x) - 0.6); S.g.position.set(S.x - ORIGIN.x, gy, z - ORIGIN.z); S.g.rotation.y = trackH(S.x) - Math.PI / 2; } }   // facing the line
// events: [year, text]  (negative years are BCE: -2559 is 2560 BCE; deep-time entries use years before present)
const EVENTS = [[2026, "You board the train. Every second from now is a year further back."], [2020, "The COVID-19 pandemic spreads worldwide."], [2012, "The rover Curiosity lands on Mars."], [2008, "A global financial crisis."],
  [2007, "The first iPhone goes on sale."], [2001, "The attacks of September 11 destroy the World Trade Center, 200 km down the river."], [1998, "Assembly of the International Space Station begins in orbit."], [1991, "The World Wide Web opens to the public; the Soviet Union dissolves."],
  [1989, "The Berlin Wall falls."], [1986, "The Chernobyl nuclear disaster."], [1981, "The first Space Shuttle flight."], [1977, "The Voyager space probes are launched."], [1969, "Apollo 11: people walk on the Moon."], [1962, "The Cuban Missile Crisis."],
  [1957, "Sputnik 1, the first artificial satellite."], [1953, "The structure of DNA is described."], [1945, "The Second World War ends; atomic bombs are used for the first and only times in war."], [1939, "The Second World War begins."],
  [1929, "The Wall Street Crash begins the Great Depression."], [1927, "Lindbergh flies alone across the Atlantic, from New York to Paris."], [1918, "The First World War ends; the influenza pandemic kills tens of millions."], [1914, "The First World War begins."],
  [1913, "Grand Central Terminal opens in New York."], [1912, "The Titanic sinks on its way to New York."], [1908, "The Ford Model T goes on sale."], [1903, "The Wright brothers' first powered flight."], [1886, "The Statue of Liberty is dedicated in New York Harbor."],
  [1883, "The Brooklyn Bridge opens."], [1879, "Edison's practical light bulb."], [1876, "The telephone is patented."], [1869, "The first transcontinental railroad is completed across the United States."], [1865, "The Civil War ends; slavery is abolished in the United States."],
  [1861, "The American Civil War begins."], [1859, "Darwin publishes On the Origin of Species."], [1851, "The Hudson River Railroad opens from New York to East Albany: this line. From here back, no rails."], [1825, "The Erie Canal opens, linking the Hudson to the Great Lakes."],
  [1807, "Fulton's steamboat (the Clermont) steams up the Hudson to Albany."], [1789, "George Washington is inaugurated in New York, then the capital; the French Revolution begins."], [1776, "The Declaration of Independence."], [1769, "James Watt patents his improved steam engine."],
  [1687, "Newton's Principia."], [1664, "The English take New Amsterdam and rename it New York."], [1626, "The Dutch 'buy' Manhattan from the Lenape."], [1624, "The Dutch settle at Fort Orange (Albany) and on the islands of New York harbor."],
  [1609, "Henry Hudson sails up the river in the Half Moon, meeting the Lenape and Mohican peoples who live along it."], [1607, "The English settle Jamestown, in Virginia."], [1543, "Copernicus puts the Sun at the centre."], [1517, "Luther's theses begin the Reformation."],
  [1492, "Columbus reaches the Caribbean."], [1455, "The Gutenberg Bible, printed with movable type."], [1453, "Constantinople falls to the Ottomans."], [1347, "The Black Death reaches Europe."], [1271, "Marco Polo sets out for China."],
  [1250, "In Europe, Gothic cathedrals are rising (take the other train, London to Rome)."], [1215, "Magna Carta."], [1066, "The Norman conquest of England."], [1000, "Norse sailors reach Newfoundland (Vinland); about now maize farming spreads into this valley."],
  [800, "Charlemagne is crowned emperor."], [610, "Muhammad begins preaching in Mecca."], [476, "The Western Roman Empire falls."], [79, "Vesuvius buries Pompeii."], [1, "1 CE. There is no year 0: next comes 1 BCE."], [-43, "Julius Caesar is assassinated (44 BCE)."],
  [-220, "Qin Shi Huang unifies China (221 BCE)."], [-322, "Alexander the Great dies (323 BCE)."], [-507, "Democracy in Athens (508 BCE)."], [-752, "Rome is founded, by tradition (753 BCE)."], [-775, "The first Olympic Games, by tradition (776 BCE)."],
  [-999, "About now pottery appears in the north-east: the Early Woodland period (around 1000 BCE)."], [-1176, "The Late Bronze Age collapse around the eastern Mediterranean (c. 1177 BCE)."], [-1322, "Tutankhamun dies (1323 BCE)."], [-1753, "Hammurabi's code of laws (c. 1754 BCE)."],
  [-2499, "The great sarsen circle of Stonehenge is raised (c. 2500 BCE)."], [-2559, "The Great Pyramid of Giza is completed (c. 2560 BCE)."], [-3099, "Writing in Mesopotamia; Egypt is unified (c. 3100 BCE)."], [-3499, "The wheel appears (c. 3500 BCE)."],
  [-9499, "Farming begins in the Near East (c. 9500 BCE)."], [NOW - 12900, "12,900 years ago: a sudden cold snap (the Younger Dryas); mammoths and mastodons are vanishing from this valley."], [NOW - 13000, "13,000 years ago: Clovis hunters, among the first people here."],
  [NOW - 16000, "16,000 years ago: the ice sheet is melting back from the lower valley."], [NOW - 20000, "20,000 years ago: the last glacial maximum. Ice over a kilometre thick buries this valley."], [NOW - 26000, "26,000 years ago: the Laurentide ice sheet reaches this valley."],
  [NOW - 40000, "40,000 years ago: people are painting cave walls in Europe and Indonesia."], [NOW - 125000, "125,000 years ago: the last interglacial, a little warmer than today."], [NOW - 300000, "300,000 years ago: the oldest known Homo sapiens (Jebel Irhoud, Morocco)."],
  [NOW - 2.6e6, "2.6 million years ago: the ice ages begin."], [NOW - 7e6, "About 7 million years ago: the human and chimpanzee lines part."], [NOW - 34e6, "34 million years ago: Antarctica freezes over."], [NOW - 56e6, "56 million years ago: a burst of global warming (the PETM)."],
  [NOW - 66.0e6, "66 million years ago: an asteroid strikes Chicxulub, Mexico. The dinosaurs (except birds) are gone."]];
const BOARDS = []; for (let k = 0; k < 18; k++) { const c = document.createElement("canvas"); c.width = 768; c.height = 384; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); b.position.y = 4.2; g.add(b); const bk = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), M(0x6a5a4a)); bk.rotation.y = Math.PI; bk.position.y = 4.2; g.add(bk);
  for (const e of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2).translate(0, 2.1, 0), M(0x5a4a3a)); p.position.x = e; g.add(p); } WORLD.add(g); BOARDS.push({ g, c, t, ev: null }); }
function drawBoard(B, ev) { const g = B.c.getContext("2d"); g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 768, 384); g.strokeStyle = "#7a2e1e"; g.lineWidth = 10; g.strokeRect(6, 6, 756, 372);
  g.fillStyle = "#7a2e1e"; g.font = "700 64px Georgia, serif"; g.fillText(fmtYear(ev[0]), 30, 88); g.fillStyle = "#2a2018"; g.font = "36px Georgia, serif";
  const words = ev[1].split(" "); let ln = "", y = 150; for (const w of words) { if (g.measureText(ln + w).width > 700) { g.fillText(ln, 30, y); y += 46; ln = ""; } ln += w + " "; } g.fillText(ln, 30, y); B.t.needsUpdate = true; }
function updateBoards(xT) { const near = EVENTS.filter(ev => Math.abs(xOfYear(ev[0]) - xT) < 1500).sort((a, b) => Math.abs(xOfYear(a[0]) - xT) - Math.abs(xOfYear(b[0]) - xT)).slice(0, BOARDS.length);
  for (const B of BOARDS) if (B.ev && !near.includes(B.ev)) { B.ev = null; B.g.visible = false; }
  for (const ev of near) { if (BOARDS.some(B => B.ev === ev)) continue; const B = BOARDS.find(B => !B.ev); if (!B) break; B.ev = ev; drawBoard(B, ev); B.g.visible = true; }
  for (const B of BOARDS) { if (!B.ev) continue; const same = EVENTS.filter(e => Math.round(e[0]) === Math.round(B.ev[0])).indexOf(B.ev), x = xOfYear(B.ev[0]) + same * 7, z = trackZ(x) + 18 + same * 6, gy = terrainH(x, z); B.g.position.set(x - ORIGIN.x, Math.max(gy, trackE(x) - 1), z - ORIGIN.z); B.g.rotation.y = trackH(x) - Math.PI / 2 - 0.5; } }
// the itinerary: stops on the way, and when we arrive at a year a second
const STOPS = [[2000, "2000"], [1969, "The Moon landing"], [1900, "1900"], [1851, "The railroad opens: rails end"], [1776, "1776"], [1609, "Henry Hudson; the Lenape"], [1492, "1492"], [1250, "Gothic Europe, 1250"], [1000, "The Norse in America"],
  [1, "1 CE"], [-752, "The founding of Rome"], [-2559, "The Great Pyramid"], [-3099, "The first writing"], [-9499, "The first farming"], [NOW - 13000, "The first people here"], [NOW - 20000, "The ice age at its height"],
  [NOW - 125000, "The last interglacial"], [NOW - 300000, "The first Homo sapiens"], [NOW - 2.6e6, "The ice ages begin"], [NOW - 7e6, "The human and chimp lines part"], [NOW - 34e6, "Antarctica freezes"], [NOW - 66.0e6, "The dinosaurs' last day"], [NOW - 150e6, "Archaeopteryx: early birds"], [NOW - 201e6, "End-Triassic extinction"], [NOW - 230e6, "The first dinosaurs"],
  [NOW - 252e6, "The Great Dying (end-Permian extinction)"], [NOW - 320e6, "Pangaea assembles"], [NOW - 365e6, "Four-legged animals with digits"], [NOW - 380e6, "The first forests (the Devonian train)"],
  [NOW - 470e6, "Plants reach land"], [NOW - 518e6, "Chengjiang's seas (the Cambrian page)"], [NOW - 538e6, "The Cambrian explosion"], [NOW - 575e6, "The Ediacaran animals"], [NOW - 700e6, "Snowball Earth"],
  [NOW - 1.6e9, "Complex (eukaryotic) cells, by then"], [NOW - 2.4e9, "The Great Oxidation: oxygen in the air"], [NOW - 3.7e9, "The earliest signs of life"], [NOW - 4.4e9, "The oldest crystals (zircons)"], [NOW - 4.51e9, "The Moon forms"],
  [NOW - 4.54e9, "The Earth forms"], [NOW - 4.6e9, "The Sun forms"], [NOW - 13.6e9, "The first stars"], [NOW - 13.787e9 + 380000, "The universe becomes transparent (the cosmic microwave background)"], [NOW - 13.787e9, "The Big Bang"]];
const fmtDist = s => { const m = s * V; return m < 1000 ? `${Math.round(m)} m` : m < 1e7 ? `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: m < 1e5 ? 1 : 0 })} km` : `${(m / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })} million km`; };
const fmtWait = s => s < 0 ? "passed" : s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : s < 172800 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min` : s < 63072000 ? `${(s / 86400).toFixed(1)} days` : s < 31557600e6 ? `${(s / 31557600).toLocaleString(undefined, { maximumFractionDigits: s < 31557600e3 ? 1 : 0 })} years` : s < 31557600e9 ? `${(s / 31557600e6).toFixed(1)} million years` : `${(s / 31557600e9).toFixed(2)} billion years`;
function drawItinerary(xT) { for (const [C, W, H, big] of [[ITC, 512, 768, false], [MAPC, 1024, 640, true]]) { const g = C.getContext("2d"); g.fillStyle = "#0f2030"; g.fillRect(0, 0, W, H); g.strokeStyle = "#c8a24a"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = "#f0d890"; g.font = `700 ${big ? 40 : 34}px Helvetica, Arial, sans-serif`; g.fillText("ITINERARY", 24, big ? 54 : 50); g.fillStyle = "#e8eef4"; g.font = `${big ? 24 : 20}px Helvetica, Arial, sans-serif`;
    g.fillText(`now: ${fmtYear(yearAt(xT))} · one year every second`, 24, big ? 90 : 82); let y = big ? 132 : 120, n = 0;
    for (const [yr, name] of STOPS) { const wait = (xOfYear(yr) - xT) / V; if (wait < -5) continue; if (++n > (big ? 14 : 18)) break; g.fillStyle = wait < 30 ? "#ffd27a" : "#e8eef4"; g.font = `${big ? 24 : 20}px Helvetica, Arial, sans-serif`;
      if (big) { g.fillText(name, 24, y); g.fillText(fmtYear(yr), 470, y); g.textAlign = "right"; g.fillText(fmtWait(wait), W - 170, y); g.fillStyle = "#9ab4c8"; g.fillText(fmtDist(wait), W - 24, y); g.textAlign = "left"; } else { g.fillText(name, 20, y); g.fillStyle = "#9ab4c8"; g.fillText(`${fmtYear(yr)} · ${fmtWait(wait)} · ${fmtDist(wait)}`, 20, y + 22); y += 12; }
      y += big ? 34 : 24; } }
  itT.needsUpdate = true; mapT.needsUpdate = true; }

// ---------- many more events: the Middle Ages, the first millennium, and before ----------
const BCE = n => 1 - n;
EVENTS.push(
  // the later Middle Ages, 1000-1500
  [1498, "Vasco da Gama reaches India by sea."], [1497, "John Cabot reaches Newfoundland."], [1488, "Dias rounds the Cape of Good Hope."], [1478, "Botticelli paints Primavera (c.)."], [1469, "Guru Nanak, founder of Sikhism, is born."],
  [1453, "The Hundred Years' War ends."], [1450, "Machu Picchu is built for the Inca ruler Pachacuti (c.)."], [1438, "Pachacuti begins the Inca Empire's rise."], [1431, "Joan of Arc is burned at Rouen."], [1428, "The Aztec Triple Alliance is formed."], [1421, "Beijing becomes China's capital; the Forbidden City is finished (1420)."],
  [1405, "Zheng He's treasure fleets begin their voyages across the Indian Ocean."], [1400, "Chaucer dies, leaving The Canterbury Tales."], [1394, "The Joseon dynasty makes Seoul its capital."], [1381, "The Peasants' Revolt in England."], [1368, "The Ming dynasty drives out the Mongols."],
  [1350, "Great Zimbabwe at its height (c.)."], [1337, "The Hundred Years' War between England and France begins."], [1325, "The Aztecs found Tenochtitlan on its lake (c.)."], [1324, "Mansa Musa of Mali makes his pilgrimage to Mecca, so rich in gold he upsets prices in Cairo."],
  [1320, "Dante finishes the Divine Comedy."], [1312, "Mansa Musa becomes king of Mali."], [1299, "The Ottoman state is founded by Osman I."], [1291, "The fall of Acre ends the crusader states."], [1279, "Kublai Khan completes the conquest of China (the Yuan dynasty)."],
  [1274, "The first Mongol invasion of Japan is wrecked by a storm."], [1258, "The Mongols sack Baghdad, ending the Abbasid golden age."], [1248, "Sainte-Chapelle in Paris is consecrated."], [1241, "The Mongols defeat European armies at Legnica and Mohi."], [1227, "Genghis Khan dies."],
  [1220, "Salisbury Cathedral is begun."], [1209, "St Francis founds the Franciscans."], [1206, "Temüjin is proclaimed Genghis Khan."], [1204, "The Fourth Crusade sacks Constantinople."], [1192, "Minamoto no Yoritomo becomes the first shogun of Japan."],
  [1187, "Saladin retakes Jerusalem."], [1170, "Thomas Becket is murdered in Canterbury Cathedral."], [1163, "Notre-Dame de Paris is begun."], [1150, "Angkor Wat is completed in Cambodia (c.)."], [1145, "The Second Crusade."], [1144, "Saint-Denis: the first Gothic choir."],
  [1130, "Roger II is crowned king of Sicily."], [1115, "The Jin dynasty rises in northern China."], [1099, "The First Crusade captures Jerusalem."], [1095, "Pope Urban II calls the First Crusade."], [1088, "The University of Bologna, the first university."],
  [1086, "The Domesday Book surveys England."], [1054, "The Great Schism splits the Eastern and Western churches; a supernova (the Crab Nebula) is seen by day."], [1050, "Cahokia, by the Mississippi, grows into the largest city north of Mexico (c.)."], [1037, "Ibn Sina (Avicenna) dies."],
  [1021, "Murasaki Shikibu's Tale of Genji, the first novel (c.)."], [1016, "Cnut becomes king of England."],
  // the first millennium after Christ: 500-1000
  [997, "Stephen becomes the first king of Hungary (1000)."], [987, "Hugh Capet becomes king of France."], [982, "Erik the Red reaches Greenland."], [969, "The Fatimids found Cairo."], [962, "Otto I is crowned Holy Roman Emperor."], [960, "The Song dynasty unites China."],
  [950, "Chaco Canyon's great houses rise in the American Southwest (c.)."], [936, "Goryeo unites Korea."], [930, "Iceland's Althing, one of the oldest parliaments, first meets."], [907, "The Tang dynasty falls."], [900, "The Classic Maya cities are abandoned (c.)."],
  [886, "Alfred the Great takes London."], [868, "The Diamond Sutra, the oldest dated printed book."], [862, "Rurik founds the state of the Rus (by tradition)."], [859, "Al-Qarawiyyin in Fez, perhaps the oldest university, is founded."], [843, "The Treaty of Verdun splits Charlemagne's empire."],
  [830, "The House of Wisdom flourishes in Baghdad; al-Khwarizmi writes the book that gives us 'algebra'."], [800, "Charlemagne crowned emperor; the Book of Kells (c.)."], [794, "Kyoto becomes Japan's capital."], [793, "Vikings raid Lindisfarne: the Viking Age begins."], [786, "Harun al-Rashid becomes caliph."],
  [762, "Baghdad is founded."], [751, "Papermaking reaches the Islamic world after the Battle of Talas."], [750, "The Abbasids overthrow the Umayyads."], [732, "Charles Martel stops an Umayyad army at Tours."], [711, "The Umayyads cross into Spain."],
  [700, "Beowulf may date from about now; Teotihuacan has fallen (c.)."], [690, "Wu Zetian becomes China's only empress regnant."], [680, "The Battle of Karbala."], [661, "The Umayyad Caliphate is founded."], [632, "Muhammad dies; the caliphate begins."], [622, "The Hijra: Muhammad goes to Medina (year 1 of the Islamic calendar)."],
  [618, "The Tang dynasty begins: China's golden age."], [604, "Prince Shotoku's constitution in Japan."], [597, "Augustine brings Christianity to the English at Canterbury."], [590, "Gregory the Great becomes pope."], [581, "The Sui dynasty reunites China."], [570, "Muhammad is born (c.)."],
  [552, "Silkworms are smuggled to Byzantium."], [541, "The Plague of Justinian."], [537, "Hagia Sophia is completed."], [536, "The coldest year in 2,000 years: a volcanic veil dims the sun."], [529, "Justinian's law code; St Benedict founds Monte Cassino."], [507, "Clovis unites the Franks."],
  // late antiquity: 1-500
  [496, "Clovis is baptized."], [476, "Odoacer deposes the last Western Roman emperor."], [455, "The Vandals sack Rome."], [451, "Attila the Hun is turned back at the Catalaunian Plains."], [432, "St Patrick begins his mission to Ireland (c.)."], [410, "The Visigoths sack Rome; Rome leaves Britain."],
  [400, "The Gupta Empire's golden age in India: the decimal place-value system with zero is taking shape (c.)."], [395, "The Roman Empire divides into East and West for good."], [380, "Christianity becomes Rome's state religion."], [378, "The Goths destroy a Roman army at Adrianople."],
  [330, "Constantinople is dedicated as Rome's new capital."], [325, "The Council of Nicaea."], [320, "The Gupta Empire is founded."], [313, "The Edict of Milan: Christianity is tolerated."], [300, "Teotihuacan, in Mexico, is one of the largest cities in the world (c.)."],
  [284, "Diocletian splits the Roman Empire to govern it."], [250, "The Classic Maya era begins (c.)."], [235, "Rome's Crisis of the Third Century begins."], [220, "The Han dynasty falls: the Three Kingdoms."], [212, "All free men of the Roman Empire become citizens."],
  [184, "The Yellow Turban rebellion in China."], [165, "The Antonine Plague."], [122, "Hadrian's Wall is begun across Britain."], [117, "The Roman Empire at its greatest extent."], [105, "Cai Lun improves papermaking in China."], [70, "The Romans destroy the Temple in Jerusalem."],
  [64, "The Great Fire of Rome."], [43, "Rome invades Britain."], [33, "Jesus is crucified in Jerusalem (c.)."], [9, "Three Roman legions are destroyed in the Teutoburg Forest."],
  // BCE
  [BCE(4), "Jesus of Nazareth is born (c. 6-4 BCE)."], [BCE(27), "Augustus becomes the first Roman emperor."], [BCE(31), "The Battle of Actium."], [BCE(30), "Cleopatra dies; Rome takes Egypt."], [BCE(46), "The Julian calendar."], [BCE(49), "Caesar crosses the Rubicon."],
  [BCE(73), "Spartacus leads a slave revolt."], [BCE(100), "The Silk Road links Han China to the Mediterranean (c.)."], [BCE(146), "Rome destroys Carthage and Corinth."], [BCE(196), "The Rosetta Stone is carved."], [BCE(202), "Hannibal is defeated at Zama."],
  [BCE(206), "The Han dynasty begins."], [BCE(210), "The Terracotta Army is buried with Qin Shi Huang."], [BCE(218), "Hannibal crosses the Alps with elephants."], [BCE(240), "Eratosthenes measures the Earth's circumference (c.)."], [BCE(250), "Ashoka spreads Buddhism across India (c.)."],
  [BCE(260), "Ashoka's conquest of Kalinga, after which he renounces war."], [BCE(287), "Archimedes is born."], [BCE(300), "Euclid's Elements (c.); the Library of Alexandria is founded (c.)."], [BCE(331), "Alexander founds Alexandria (332) and defeats Persia at Gaugamela."], [BCE(336), "Alexander becomes king of Macedon."],
  [BCE(387), "Plato founds the Academy."], [BCE(399), "Socrates is condemned to death."], [BCE(431), "The Peloponnesian War begins."], [BCE(447), "The Parthenon is begun."], [BCE(480), "Thermopylae and Salamis: the Greeks halt Xerxes."], [BCE(490), "The Battle of Marathon."],
  [BCE(500), "Sun Tzu's Art of War (c.); the Nok culture of Nigeria works iron (c.)."], [BCE(509), "The Roman Republic is founded."], [BCE(518), "Persepolis is begun."], [BCE(528), "The Buddha's enlightenment (c.)."], [BCE(539), "Cyrus the Great takes Babylon."], [BCE(551), "Confucius is born."],
  [BCE(586), "Babylon destroys Jerusalem's First Temple."], [BCE(600), "Coins come into use in Lydia (c.); the Olmec heartland declines."], [BCE(612), "Nineveh falls; the Assyrian Empire ends."], [BCE(650), "The Library of Ashurbanipal at Nineveh (c.)."], [BCE(700), "Homer's Iliad and Odyssey are written down (c.)."],
  [BCE(800), "The Greek alphabet is adapted from the Phoenician (c.)."], [BCE(814), "Carthage is founded (by tradition)."], [BCE(900), "The Adena culture builds mounds in the Ohio Valley (c. 800 BCE)."], [BCE(1000), "King David rules in Jerusalem (c.); Polynesian ancestors settle Tonga and Samoa (c.)."],
  [BCE(1046), "The Zhou dynasty replaces the Shang."], [BCE(1200), "The Olmec civilization rises in Mexico (c.); Troy VII falls (c.)."], [BCE(1250), "Ramesses II builds Abu Simbel (c. 1264)."], [BCE(1279), "Ramesses II becomes pharaoh."], [BCE(1300), "Poverty Point, Louisiana: great earthworks in North America (c. 1700-1100)."],
  [BCE(1350), "Akhenaten worships a single sun god."], [BCE(1450), "Mycenaean Greece; Linear B writing."], [BCE(1478), "Hatshepsut becomes pharaoh."], [BCE(1600), "The Thera (Santorini) eruption (c.); the Shang dynasty begins (c.)."], [BCE(1700), "The Indus Valley cities decline (c.)."],
  [BCE(1792), "Hammurabi becomes king of Babylon."], [BCE(1900), "Minoan palaces at Knossos (c.)."], [BCE(2000), "Horses are harnessed to spoked-wheel chariots (c.); the last woolly mammoths live on Wrangel Island."], [BCE(2100), "The Epic of Gilgamesh is written down (c.)."], [BCE(2334), "Sargon founds the Akkadian Empire, the first empire."],
  [BCE(2600), "Mohenjo-daro and Harappa flourish in the Indus Valley (c.)."], [BCE(2630), "Djoser's Step Pyramid, the first pyramid."], [BCE(2900), "The Sumerian city-states (c.)."], [BCE(3000), "Stonehenge's first earthwork (c.); Norte Chico in Peru, the Americas' first cities."],
  [BCE(3200), "Newgrange is built in Ireland (c.)."], [BCE(3300), "Ötzi the Iceman dies in the Alps (c.)."], [BCE(3500), "Uruk, perhaps the first true city."], [BCE(4000), "Horses are domesticated on the steppe (c.)."], [BCE(4500), "Copper is smelted in the Balkans (c.)."],
  [BCE(5000), "Maize is domesticated in Mexico (c.)."], [BCE(6000), "Rice farming in the Yangtze valley (c.)."], [BCE(7000), "Çatalhöyük, one of the first towns (see the Çatalhöyük page)."], [BCE(7500), "Cattle are domesticated (c.)."], [BCE(8000), "Jericho's walls and tower (c.)."]);

// ---------- yard lines: a painted line across the land at every year (thicker every 5), numbers on the ground every 5 years ----------
const LINE_IM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 5000);
LINE_IM.count = 0; LINE_IM.frustumCulled = false; WORLD.add(LINE_IM);
const NUMS = []; for (let k = 0; k < 14; k++) { const c = document.createElement("canvas"); c.width = 512; c.height = 200; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -(Math.PI / 2 - 0.3);
  const g = new THREE.Group(); g.add(m); WORLD.add(g); NUMS.push({ g, c, t, year: null }); }
let linesAt = null; const _lc = new THREE.Color();
function updateLines(xT) { const yT = yearAt(xT), yr = Math.round(yT); if (linesAt === yr) return; linesAt = yr; let n = 0;
  for (let y = yr + 24; y >= yr - 60; y--) { const x = xOfYear(y), ry = trackH(x), five = y % 5 === 0, ten = y % 10 === 0, w = ten ? 1.4 : five ? 0.9 : 0.4; _lc.setHex(ten ? 0xffe27a : 0xffffff);
    for (let dz = -RIVER0 + 15; dz < 280 && n < 5000; dz += 4) { if (Math.abs(dz) < 5) continue; const z = trackZ(x) + dz, h = terrainH(x, z); if (h < 0.3) continue;
      O3.position.set(x - ORIGIN.x, h + 0.04, z - ORIGIN.z); O3.rotation.set(0, ry, 0); O3.scale.set(4.2, 0.06, w); O3.updateMatrix(); LINE_IM.setMatrixAt(n, O3.matrix); LINE_IM.setColorAt(n, _lc); n++; } }
  LINE_IM.count = n; LINE_IM.instanceMatrix.needsUpdate = true; if (LINE_IM.instanceColor) LINE_IM.instanceColor.needsUpdate = true;
  const want = []; for (let y = Math.floor((yr + 25) / 5) * 5; y >= yr - 60; y -= 5) want.push(y);
  for (const N of NUMS) if (!want.includes(N.year)) N.year = null;
  for (const y of want) { if (NUMS.some(N => N.year === y)) continue; const N = NUMS.find(N => N.year === null); if (!N) break; N.year = y; const g = N.c.getContext("2d"), [a, b] = signLabel(y);
    g.clearRect(0, 0, 512, 200); g.textAlign = "center"; let fs = 150; do { g.font = `800 ${fs}px Helvetica, Arial, sans-serif`; } while (g.measureText(a).width > 490 && --fs > 30);
    g.lineWidth = 10; g.strokeStyle = "rgba(0,0,0,.35)"; g.strokeText(a, 256, 150); g.fillStyle = y % 10 === 0 ? "#ffe27a" : "#ffffff"; g.fillText(a, 256, 150); if (b) { g.font = "700 40px Helvetica"; g.fillText(b, 256, 195); } N.t.needsUpdate = true; }
  for (const N of NUMS) { N.g.visible = N.year !== null; if (!N.g.visible) continue; const x = xOfYear(N.year) + 9, z = trackZ(x) + 22, h = Math.max(terrainH(x, z), 0.2);
    N.g.position.set(x - ORIGIN.x, h + 1.0, z - ORIGIN.z); N.g.rotation.y = trackH(x) - Math.PI / 2; }
  updateTimelines(xT); }
function relineAfterRecentre() { linesAt = null; }

// ---------- event scenes: people and things of each event, standing at its year ----------
KM.glow = new THREE.MeshBasicMaterial({ toneMapped: false }); KM.glass2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.3 });
const COLS = y => y > 1990 ? [0x2a4a8a, 0xb8382a, 0x3a3a3a, 0xe8e8e4, 0x6a8a3a, 0xd8a83a] : y > 1945 ? [0x3a5a8a, 0x8a3a3a, 0xc8b88a, 0x5a6a4a, 0xe8dcc0] : y > 1900 ? [0x3a3a3e, 0x5a4a3a, 0x6a6a6a, 0x2a2a3a, 0xc8bca0] :
  y > 1750 ? [0x2a2a3a, 0x5a3a2a, 0x8a2e24, 0xe8e0d0, 0x3a4a6a] : y > 1500 ? [0x5a3a2a, 0x2a2a2a, 0x8a6a4a, 0xa83a2a, 0xe8e0d0] : [0x8a6a4a, 0x6a4a30, 0xa88a6a, 0xc8a878];
function crowd(K, P, along, dz, n, r, y, face = 0, col) { const R = seeded(Math.round(along * 31 + dz * 7 + n)); const C = col ? [col] : COLS(y);
  for (let k = 0; k < n; k++) { const [x, gy, z, ry] = P(along + (R() - 0.5) * r * 2, dz + (R() - 0.5) * r); person(K, x, gy, z, ry + face + (R() - 0.5) * 0.6, C[(R() * C.length) | 0]); } }
function ranks(K, P, along, dz, rows, cols, col, y) { for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const [x, gy, z, ry] = P(along + j * 1.6, dz + i * 1.6); person(K, x, gy, z, ry, col); K.add("box", "wood", x + 0.3, gy + 0.9, z, 0.06, 1.4, 0.06, 0); } }
function flag(K, P, along, dz, cols, h = 8) { const [x, gy, z, ry] = P(along, dz); K.add("box", "wood", x, gy, z, 0.12, h, 0.12, 0); cols.forEach((c, i) => K.add("box", "wall", x + Math.sin(ry) * 0, gy + h - 0.6 - i * 0.5, z + 1.2, 0.05, 0.5, 2.2, ry, c)); }
function shipHull(K, x, gy, z, ry, L, W, H, col) { K.add("box", "wall", x, gy - H * 0.5, z, W, H, L, ry, col); }
const SC = {
  2020: (K, P, y) => { crowd(K, P, 0, 30, 14, 14, y); for (let k = 0; k < 14; k++) {} },
  2012: (K, P, y) => { const [x, gy, z, ry] = P(0, 45); K.add("box", "wall", x, gy + 2, z, 0.6, 7, 12, ry, 0x1a1a1a); K.add("box", "glow", x - 0.4 * Math.sin(ry + Math.PI / 2), gy + 2.5, z, 0.1, 6, 11, ry, 0xc8603a); crowd(K, P, 0, 28, 20, 8, y, Math.PI); },   // Mars on a big screen
  2007: (K, P, y) => crowd(K, P, 0, 25, 16, 10, y),
  2001: (K, P, y) => { for (const a of [-12, 12]) { const [x, gy, z] = P(a, 120); K.add("box", "glow", x, gy, z, 6, 1500, 6, 0, 0x9ab8ff); } crowd(K, P, 0, 30, 24, 10, y, Math.PI, 0x3a3a3a); },   // two beams of light in memory
  1998: (K, P) => { const [x, gy, z, ry] = P(0, 200); K.add("box", "wall", x, gy + 300, z, 4, 4, 70, ry, 0xe8e8e8); for (const e of [-1, 1]) K.add("box", "glow", x, gy + 300, z + e * 30, 30, 0.3, 12, ry + Math.PI / 2, 0x6a7aa8); },   // the space station overhead
  1989: (K, P, y) => { const [x, gy, z, ry] = P(0, 40); K.add("box", "wall", x, gy, z, 1.2, 3.6, 40, ry, 0xd8d0c0); for (let k = 0; k < 8; k++) { const [px, pg, pz] = P(-17 + k * 5, 40); K.add("box", "wall", px - 0.62 * Math.sin(ry + Math.PI / 2), pg + 0.5, pz, 0.05, 2, 3, ry, [0xd83a3a, 0x3a8ad8, 0xe8c83a, 0x3ab85a][k % 4]); person(K, px, pg + 3.6, pz, ry, COLS(y)[k % 5]); } crowd(K, P, 0, 30, 20, 18, y); },   // the Berlin Wall
  1981: (K, P) => { const [x, gy, z, ry] = P(0, 140); K.add("cyl", "wall", x, gy, z, 8.4, 47, 8.4, 0, 0xc86a2a); K.add("cone", "wall", x, gy + 47, z, 8.4, 9, 8.4, 0, 0xc86a2a); for (const e of [-1, 1]) K.add("cyl", "wall", x + e * 6, gy, z, 3.7, 45, 3.7, 0, 0xf0f0ec); K.add("box", "wall", x, gy + 5, z - 6, 6, 37, 24, ry + Math.PI / 2, 0xf0f0ec); },   // the Space Shuttle
  1969: (K, P, y) => { const [x, gy, z] = P(0, 130); let h = gy; for (const [d, L, c] of [[10, 42, 0xf4f4f0], [10, 25, 0xf4f4f0], [6.6, 18, 0xf4f4f0], [6.6, 8, 0x2a2a2a], [3.9, 4, 0xf4f4f0]]) { K.add("cyl", "wall", x, h, z, d, L, d, 0, c); K.add("cyl", "wall", x, h + L * 0.82, z, d + 0.1, L * 0.05, d + 0.1, 0, 0x1a1a1a); h += L; } K.add("cone", "wall", x, h, z, 3.9, 6, 3.9, 0, 0xf4f4f0); K.add("box", "wall", x, h + 6, z, 0.3, 10, 0.3, 0, 0xd83a2a);   // Saturn V
    crowd(K, P, 0, 40, 40, 20, y, 0); flag(K, P, -15, 35, [0xb8382a, 0xf0f0f0, 0xb8382a, 0xf0f0f0, 0x2a3a6a]); },
  1957: (K, P, y) => { const [x, gy, z] = P(20, 150); K.add("ball", "glass2", x, gy + 180, z, 3, 3, 3, 0, 0xe8e8e8); for (let k = 0; k < 4; k++) K.add("box", "wall", x + Math.cos(k) * 4, gy + 178, z + Math.sin(k) * 4, 0.1, 0.1, 8, k, 0xcccccc); crowd(K, P, 0, 30, 20, 12, y); },
  1953: (K, P) => { for (let k = 0; k < 40; k++) { const a = k * 0.5, [x, gy, z] = P(Math.cos(a) * 4, 40 + Math.sin(a) * 4); K.add("ball", "wall", x, gy + k * 0.5, z, 1, 1, 1, 0, 0x3a8ad8); const [x2, , z2] = P(-Math.cos(a) * 4, 40 - Math.sin(a) * 4); K.add("ball", "wall", x2, gy + k * 0.5, z2, 1, 1, 1, 0, 0xd83a3a); } },   // the double helix
  1945: (K, P, y) => { crowd(K, P, 0, 30, 50, 22, y); ranks(K, P, -20, 45, 3, 10, 0x4a5a3a); for (let k = 0; k < 6; k++) flag(K, P, -25 + k * 10, 26, [0xb8382a, 0xf0f0f0, 0x2a3a6a]); },   // V-J Day
  1939: (K, P) => ranks(K, P, -15, 35, 4, 16, 0x5a5a3a),
  1929: (K, P, y) => { const [x, gy, z, ry] = P(0, 60); K.add("box", "wall", x, gy - 0.5, z, 20, 16, 34, ry, 0xd8d0c0); for (let k = 0; k < 8; k++) { const [cx, cg, cz] = P(-14 + k * 4, 49); K.add("cyl", "wall", cx, cg, cz, 1.4, 14, 1.4, 0, 0xe8e0d0); } K.add("gable", "roof", x, gy + 15.5, z, 21, 4, 35, ry, 0xd8d0c0); crowd(K, P, 0, 38, 50, 18, y, Math.PI); },   // a run on the bank
  1927: (K, P) => { const [x, gy, z, ry] = P(0, 60); K.add("box", "wall", x, gy + 120, z, 1.6, 1.6, 8.4, ry, 0xc8c8c8); K.add("box", "wall", x, gy + 120.8, z, 14, 0.3, 2, ry, 0xc8c8c8); },   // the Spirit of St. Louis overhead
  1918: (K, P, y) => { ranks(K, P, -20, 40, 3, 14, 0x7a6a4a); crowd(K, P, 0, 28, 30, 22, y); for (let k = 0; k < 5; k++) flag(K, P, -20 + k * 10, 25, [0xb8382a, 0xf0f0f0, 0x2a3a6a]); },
  1914: (K, P) => ranks(K, P, -18, 35, 4, 14, 0x7a6a4a),
  1913: (K, P, y) => { const [x, gy, z, ry] = P(0, 90); K.add("box", "wall", x, gy - 0.5, z, 60, 34, 90, ry, 0xd8ccb0); for (let k = 0; k < 3; k++) { const [ax, ag, az] = P(-25 + k * 25, 44.5); K.add("box", "glass2", ax, ag + 6, az, 1, 18, 9, ry, 0x6a8aa8); } crowd(K, P, 0, 35, 30, 30, y); },   // Grand Central
  1912: (K, P) => { const [x, , z, ry] = P(0, -450); shipHull(K, x, 2, z, ry, 269, 28, 12, 0x1a1a1a); K.add("box", "wall", x, 2, z, 26, 10, 180, ry, 0xf0ece0); for (let k = 0; k < 4; k++) { const [fx, , fz] = P(-60 + k * 38, -450); K.add("cyl", "wall", fx, 12, fz, 6, 18, 6, 0, 0xd8a85a); K.add("cyl", "wall", fx, 28, fz, 6.1, 3, 6.1, 0, 0x1a1a1a); } },   // the Titanic (on its way to New York)
  1908: (K, P, y) => { const R = seeded(1908); for (let k = 0; k < 10; k++) { const [x, gy, z, ry] = P(-30 + k * 7, 40 + (k % 2) * 5); car(K, x, gy, z, ry, 1910, () => 0.45 + R() * 0.1); } crowd(K, P, 0, 30, 14, 25, y); },   // a row of Model Ts
  1903: (K, P, y) => { const [x, gy, z, ry] = P(0, 50); for (const e of [0, 1.8]) K.add("box", "wall", x, gy + 2 + e, z, 12.3, 0.1, 2, ry + Math.PI / 2, 0xe8dcc0); crowd(K, P, 0, 44, 5, 6, y); },   // the Wright Flyer
  1886: (K, P) => { const [x, , z] = P(0, -520); K.add("box", "wall", x, -6, z, 40, 6, 40, 0, 0xb8b0a0); K.add("box", "wall", x, 0, z, 20, 47, 20, 0, 0xc8c0b0); K.add("cyl", "wall", x, 47, z, 10, 30, 10, 0, 0x6aa89a); K.add("ball", "wall", x, 80, z, 6, 7, 6, 0, 0x6aa89a);
    K.add("box", "wall", x + 4, 80, z, 2, 14, 2, 0, 0x6aa89a); K.add("ball", "glow", x + 4, 95, z, 3, 3, 3, 0, 0xffd27a); },   // the Statue of Liberty
  1883: (K, P) => { const [, , , ry] = P(0, -300); for (const dz of [-280, -760]) { const [x, , z] = P(0, dz); K.add("box", "wall", x, -6, z, 40, 90, 18, ry, 0xb8a888); } const [mx, , mz] = P(0, -520); K.add("box", "wall", mx, 38, mz, 600, 3, 26, ry + Math.PI / 2, 0x8a7a6a); },   // the Brooklyn Bridge
  1879: (K, P, y) => { for (let k = 0; k < 8; k++) { const [x, gy, z] = P(-28 + k * 8, 30); K.add("box", "wood", x, gy, z, 0.25, 6, 0.25, 0); K.add("ball", "glow", x, gy + 6.4, z, 0.8, 0.9, 0.8, 0, 0xffe0a0); } crowd(K, P, 0, 34, 16, 20, y); },   // electric light
  1869: (K, P, y) => { for (const e of [-1, 1]) { const [x, gy, z, ry] = P(e * 8, 30); K.add("cyl", "wall", x, gy + 1.2, z, 2.2, 2.2, 7, ry + Math.PI / 2, 0x2a2a2a); K.add("cone", "wall", x - 3 * e * Math.cos(ry), gy + 3.2, z, 1.8, 3, 1.8, 0, 0x3a3a3a); K.add("box", "wall", x + 4 * e, gy + 1, z, 3, 3.5, 3, ry, 0x8a3a2a); } crowd(K, P, 0, 38, 40, 22, y); },   // the golden spike: two locomotives meet
  1865: (K, P) => ranks(K, P, -18, 35, 3, 14, 0x2a3a6a), 1861: (K, P) => ranks(K, P, -18, 35, 3, 14, 0x2a3a6a),
  1851: (K, P, y) => { const [x, gy, z, ry] = P(18, 8); K.add("cyl", "wall", x, gy + 1.4, z, 2, 2, 6, ry + Math.PI / 2, 0x2a3a2a); K.add("cone", "wall", x, gy + 3, z, 1.4, 2.5, 1.4, 0, 0x2a2a2a); for (let k = 1; k < 4; k++) { const [cx, cg, cz] = P(18 + k * 8, 8); K.add("box", "wall", cx, cg + 0.6, cz, 2.6, 2.6, 7, ry, 0xa85a3a); } crowd(K, P, 0, 25, 40, 22, y); },   // the first train on the Hudson River Railroad
  1825: (K, P, y) => { const [x, , z, ry] = P(0, -200); shipHull(K, x, 0.8, z, ry, 24, 4, 1.6, 0x6a4a2c); K.add("box", "wall", x, 0.8, z, 3, 2, 10, ry, 0xe8dcc0); crowd(K, P, 0, 28, 14, 14, y); },   // a canal boat
  1807: (K, P, y) => { const [x, , z, ry] = P(0, -260); steamboat(K, x, 0, z, ry); crowd(K, P, 0, -150, 30, 18, y); },   // the Clermont, cheered from the bank
  1789: (K, P, y) => { const [x, gy, z, ry] = P(0, 55); K.add("box", "wall", x, gy - 0.5, z, 14, 14, 30, ry, 0xd8d0c0); crowd(K, P, 0, 36, 60, 22, y, Math.PI); flag(K, P, 0, 44, [0xb8382a, 0xf0f0f0, 0xb8382a]); },   // Washington's inauguration
  1776: (K, P, y) => { ranks(K, P, -14, 40, 3, 12, 0x2a3a6a); crowd(K, P, 0, 28, 30, 20, y); flag(K, P, 0, 34, [0xb8382a, 0xf0f0f0, 0xb8382a, 0xf0f0f0]); },
  1664: (K, P) => { for (const a of [-60, 30]) { const [x, , z, ry] = P(a, -380); shipHull(K, x, 1.5, z, ry, 36, 9, 5, 0x4a3a2a); for (const m of [-8, 6]) { const [mx, , mz] = P(a + m, -380); K.add("box", "wood", mx, 2, mz, 0.5, 24, 0.5, 0); K.add("box", "wall", mx, 8, mz + 0.5, 0.1, 12, 12, ry + Math.PI / 2, 0xe8e0d0); } } },   // English warships
  1624: (K, P, y) => { const [x, gy, z, ry] = P(0, 70); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; K.add("box", "wall", x + Math.cos(a) * 25, gy - 1, z + Math.sin(a) * 25, k % 2 ? 2 : 50, 5, k % 2 ? 50 : 2, 0, 0x8a6a4a); } windmill(K, x, gy, z, ry, []); crowd(K, P, 0, 40, 12, 20, y); crowd(K, P, 30, 45, 8, 10, 1300); },   // a Dutch fort and windmill
  1626: (K, P, y) => { crowd(K, P, 0, 32, 8, 6, 1600); crowd(K, P, 6, 32, 8, 6, 1300); },
  1609: (K, P) => { const [x, , z, ry] = P(0, -330); shipHull(K, x, 1.2, z, ry, 25, 6, 4, 0x5a3a24); for (const m of [-6, 2, 8]) { const [mx, , mz] = P(m, -330); K.add("box", "wood", mx, 2, mz, 0.4, 18, 0.4, 0); K.add("box", "wall", mx, 7, mz + 0.4, 0.1, 9, 8, ry + Math.PI / 2, 0xe8dcc0); }
    for (let k = 0; k < 6; k++) { const [cx, , cz, cr] = P(-30 + k * 12, -230 - (k % 2) * 30); boat(K, cx, 0.05, cz, cr, "canoe"); person(K, cx, 0.2, cz, cr, 0x6a4a30, 0.8); } crowd(K, P, 0, -150, 16, 20, 1300); },   // the Half Moon meets Lenape canoes
  1492: (K, P) => { for (const [a, s] of [[-50, 1], [0, 0.8], [40, 0.75]]) { const [x, , z, ry] = P(a, -380); shipHull(K, x, 1.5, z, ry, 24 * s, 7 * s, 4, 0x6a4a30); for (const m of [-6, 3]) { const [mx, , mz] = P(a + m * s, -380); K.add("box", "wood", mx, 2, mz, 0.4, 18 * s, 0.4, 0); K.add("box", "wall", mx, 8 * s, mz + 0.4, 0.1, 9 * s, 9 * s, ry + Math.PI / 2, 0xe8dcc0); } } },   // three caravels
  1000: (K, P) => { const [x, , z, ry] = P(0, -260); shipHull(K, x, 0.8, z, ry, 23, 5, 1.6, 0x5a3a24); K.add("box", "wood", x, 1, z, 0.4, 12, 0.4, 0); K.add("box", "wall", x, 4, z + 0.4, 0.1, 7, 8, ry + Math.PI / 2, 0xb83a2a); for (let k = 0; k < 10; k++) { const [sx, , sz] = P(-9 + k * 2, -257.5); K.add("cyl", "wall", sx, 0.8, sz, 1, 1, 0.1, ry, [0xd8c83a, 0xb83a2a][k % 2]); } },   // a Norse ship
  79: (K, P) => { const [x, gy, z] = P(0, 2500); K.add("cone", "wall", x, gy, z, 1800, 900, 1800, 0, 0x5a5048); K.add("ball", "wall", x, gy + 1500, z, 900, 1200, 900, 0, 0x8a8278); },   // a volcano erupts (Vesuvius stands in)
  [-2559]: (K, P, y) => { const [x, gy, z, ry] = P(0, 320); K.add("pyr", "wall", x, gy, z, 230, 146, 230, ry, 0xe8d8b0); crowd(K, P, -40, 120, 30, 30, y); },   // the Great Pyramid
  [-2499]: (K, P) => { for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2, [x, gy, z] = P(Math.cos(a) * 16, 60 + Math.sin(a) * 16); K.add("box", "wall", x, gy, z, 2, 4.1, 1.1, -a, 0x9a948a); if (k % 2) K.add("box", "wall", x, gy + 4.1, z, 3.4, 0.8, 1.1, -a, 0x9a948a); } },   // Stonehenge
  [-752]: (K, P, y) => { const [x, gy, z, ry] = P(0, 55); K.add("box", "wall", x, gy - 0.5, z, 14, 1.5, 24, ry, 0xe8e0d0); for (let k = 0; k < 6; k++) for (const e of [-1, 1]) { const [cx, cg, cz] = P(-10 + k * 4, 55 + e * 6); K.add("cyl", "wall", cx, cg + 1, cz, 1.2, 9, 1.2, 0, 0xf0ece0); } K.add("gable", "roof", x, gy + 10, z, 15, 3.5, 25, ry, 0xe8e0d0); crowd(K, P, 0, 38, 20, 16, y); },   // a temple
  [-775]: (K, P, y) => { for (let k = 0; k < 8; k++) { const [x, gy, z, ry] = P(-10 + k * 3, 32 + k % 2); person(K, x, gy, z, ry, 0xc8a080); } crowd(K, P, 0, 45, 30, 30, y); },   // runners at Olympia
  [NOW - 13000]: (K, P) => { const [x, gy, z, ry] = P(0, 70); animal(K, "mastodon", x, gy, z, ry, 1.1); for (let k = 0; k < 6; k++) { const a = k * 1.05, [px, pg, pz] = P(Math.cos(a) * 10, 70 + Math.sin(a) * 10); person(K, px, pg, pz, a + Math.PI, 0x8a6a4a); K.add("box", "wood", px, pg + 1.2, pz, 0.06, 0.06, 2.6, a, 0x6a4a2c); } },   // Clovis hunters
  [NOW - 300000]: (K, P) => crowd(K, P, 0, 40, 8, 8, -1e6),
  [NOW - 66.0e6]: (K, P) => { const [x, gy, z] = P(-400, 1500); K.add("ball", "glow", x, gy + 1800, z, 120, 120, 120, 0, 0xfff0c0); for (let k = 1; k < 12; k++) K.add("ball", "glow", x - k * 90, gy + 1800 + k * 60, z - k * 40, 120 - k * 8, 120 - k * 8, 120 - k * 8, 0, k < 4 ? 0xffb050 : 0xc86a3a);   // the asteroid's fireball
    for (let k = 0; k < 6; k++) { const [ax, ag, az, ar] = P(-20 + k * 8, 60 + (k % 2) * 8); animal(K, "hadrosaur", ax, ag, az, ar + 0.5, 1); } } };
const SCENEOBJ = new Map();
function updateScenes(xT) { for (const ev of EVENTS) { const f = SC[ev[0]]; if (!f) continue; const ex = xOfYear(ev[0]), d = ex - xT, on = d > -1200 && d < 2400, has = SCENEOBJ.has(ev[0]);
    if (on && !has) { const K = new Kit(), P = (along, dz) => { const x = ex + along, z = trackZ(x) + dz; return [x - ex, Math.max(terrainH(x, z), dz < -RIVER0 ? 0 : -1e9), z, trackH(x)]; };
      f(K, P, ev[0]); SCENEOBJ.set(ev[0], anchor(K.build(), ex, 0, 0)); }
    else if (!on && has) { const g = SCENEOBJ.get(ev[0]); unanchor(g); g.traverse(o => o.isInstancedMesh && o.dispose()); SCENEOBJ.delete(ev[0]); } } }
// ordinary people of each period, about their business beside the line
function periodFolk(K, x0, r) { for (let k = 0; k < 10; k++) { const x = x0 + r() * TILE, y = yearAt(x), E = era(y); if (!["modern", "postwar", "early20", "railway", "colonial"].includes(E)) continue; const dz = 30 + r() * 120, z = trackZ(x) + dz, gy = terrainH(x, z); if (gy < 0.5) continue;
    const C = COLS(y), n = 1 + Math.floor(r() * 3); for (let q = 0; q < n; q++) person(K, x - x0 + (r() - 0.5) * 4, gy, z + (r() - 0.5) * 4, r() * 6, C[(r() * C.length) | 0]); } }

// ---------- what stands on the timeline lanes: the person, the country's flag, the animal ----------
const FLAGS = { "United States": [0xb8382a, 0xf0f0f0, 0xb8382a, 0xf0f0f0, 0x2a3a6a], "New York State": [0x2a3a7a, 0xd8b84a], "Province of New York (British)": [0xc8302a, 0xf0f0f0, 0x1a2a6a], "New Netherland (Dutch)": [0xe87a2a, 0xf0f0f0, 0x2a4a9a],
  "Haudenosaunee Confederacy (c.)": [0x5a2a7a, 0xf0f0f0], "Soviet Union": [0xc8201a, 0xd8b84a], "United Kingdom": [0x1a2a6a, 0xf0f0f0, 0xc8201a], "Kingdom of England": [0xf0f0f0, 0xc8201a], "Qing dynasty": [0xe8c83a, 0x2a5aa8],
  "Ming dynasty": [0xc8201a, 0xe8c83a], "Mughal Empire": [0x2a7a3a, 0xe8c83a], "Ottoman Empire": [0xc8201a, 0xf0f0f0], "Aztec Empire": [0x2a8a5a, 0xc8201a], "Inca Empire": [0xc8201a, 0xe8a83a, 0xe8e83a, 0x2a8a3a, 0x2a6ac8, 0x7a3a9a],
  "Mali Empire": [0x2a8a3a, 0xe8c83a, 0xc8201a], "Mongol Empire": [0x2a4ac8, 0xf0f0f0], "Holy Roman Empire": [0xe8c83a, 0x1a1a1a], "Byzantine Empire": [0x7a2a6a, 0xe8c83a], "Abbasid Caliphate": [0x1a1a1a], "Tang dynasty": [0xe8c83a, 0xc8201a],
  "Roman Empire (West)": [0xa8201a, 0xe8c83a], "Roman Republic": [0xa8201a, 0xe8c83a], "Han dynasty": [0xc8201a, 0x1a1a1a], "Achaemenid Persian Empire": [0xc8a83a, 0x7a2a2a], "Ancient Egypt, dynastic (c.)": [0xe8c83a, 0x2a6ac8, 0xc8201a] };
const SPECIES_LOOK = { "Woolly mammoth": ["mammoth", 1], "American mastodon": ["mastodon", 1], "Smilodon (sabre-tooth)": ["cat", 1], "Dire wolf": ["wolf", 1], "Giant beaver": ["beaver", 1], "Tyrannosaurus rex": ["theropod", 3.6],
  "Triceratops": ["triceratops", 1], "Megalodon": ["shark", 1], "Dogs, domesticated (c.)": ["wolf", 0.7] };
function animal2(K, kind, x, gy, z, ry, s) { const c = Math.cos(ry), sn = Math.sin(ry), at = (a, b) => [x + sn * b + c * a, z + c * b - sn * a];
  if (kind === "shark") { const [bx, bz] = at(0, 0); K.add("ball", "grey", bx, gy + 3, bz, 3, 3, 16, ry, 0x6a7480); const [fx, fz] = at(0, 1); K.add("box", "grey", fx, gy + 4, fz, 0.3, 3, 3, ry, 0x6a7480); const [tx, tz] = at(0, -8.5); K.add("box", "grey", tx, gy + 1.5, tz, 0.3, 4, 1.5, ry, 0x6a7480); return; }
  const T = { cat: [1.9, 1.0, 0xb08a54], wolf: [1.5, 0.85, 0x7a6a5a], beaver: [2.2, 0.8, 0x5a3e2a], triceratops: [8, 3, 0x6a6a48] }[kind]; if (!T) { animal(K, kind, x, gy, z, ry, s); return; }
  const [L, H, col] = [T[0] * s, T[1] * s, T[2]]; const [bx, bz] = at(0, 0); K.add("ball", "hide", bx, gy + H * 0.62, bz, L * 0.5, H * 0.5, L, ry, col);
  for (const [a, b] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const [lx, lz] = at(a * L * 0.17, b * L * 0.32); K.add("box", "hide", lx, gy, lz, L * 0.12, H * 0.5, L * 0.12, ry, col); }
  const [hx, hz] = at(0, L * 0.55); K.add("ball", "hide", hx, gy + H * 0.7, hz, L * 0.3, H * 0.4, L * 0.32, ry, col);
  if (kind === "cat") for (const a of [-1, 1]) { const [tx, tz] = at(a * 0.06, L * 0.68); K.add("box", "white", tx, gy + H * 0.35, tz, 0.04, 0.3, 0.05, ry, 0xf0e8d8); }   // the sabre teeth
  if (kind === "triceratops") { const [fx, fz] = at(0, L * 0.45); K.add("box", "hide", fx, gy + H * 0.9, fz, L * 0.4, H * 0.8, 0.3, ry, 0x7a6a48); for (const a of [-1, 1]) { const [tx, tz] = at(a * 0.5, L * 0.72); K.add("box", "white", tx, gy + H * 0.9, tz, 0.15, 0.15, 1.2, ry, 0xe8dcc0); } }
  if (kind === "beaver") { const [tx, tz] = at(0, -L * 0.6); K.add("box", "hide", tx, gy + 0.1, tz, L * 0.25, 0.1, L * 0.35, ry, 0x3a2a1e); } }
function lanePropFor(w, K) { const ry = trackH(w.x) + Math.PI / 2, name = w.it[0];
  if (w.G === TL.people) { const mid = (w.it[1] + w.it[2]) / 2, C = COLS(Math.min(mid, NOW)); person(K, 0, 0, 0, ry, C[name.length % C.length], 1.25); }
  else if (w.G === TL.countries) { const cols = FLAGS[name] || [0x4a8ad8, 0xf0f0f0]; K.add("box", "wood", 0, 0, 0, 0.15, 7, 0.15, 0); cols.forEach((c, i) => K.add("box", "wall", 0, 6.4 - (i + 1) * 2.4 / cols.length, 1.4, 0.06, 2.4 / cols.length, 2.6, 0, c)); }
  else { const L = SPECIES_LOOK[name]; if (L) animal2(K, L[0], 0, 0, 0, ry + 1.2, L[1]); else if (/Homo|Neander|Denisov|Australo|Paranthropus/.test(name)) { for (let k = 0; k < 3; k++) person(K, k * 1.2, 0, k * 0.8, ry, [0x7a5a3a, 0x8a6a4a, 0x6a4a30][k], name.includes("Australo") || name.includes("habilis") ? 0.75 : 0.95); }
    else if (name.startsWith("Maize")) for (let k = 0; k < 9; k++) K.add("cyl", "leaf", (k % 3), 0, (k / 3 | 0) - 1, 0.25, 2.4, 0.25, 0, 0x5a8a2a); else if (name.startsWith("Gigantopithecus")) person(K, 0, 0, 0, ry, 0x6a4a2a, 1.8); } }

// ---------- inventions: an exhibit on a stone pedestal beside the line at each invention's year ----------
// [year, name, model]  (years: calendar, negative BCE; deep ones from years before present). Dates are the usual textbook ones; many are approximate.
const INV = [[2007, "the smartphone", "phone"], [1991, "the World Wide Web", "screen"], [1981, "the personal computer (IBM PC)", "pc"], [1973, "the mobile phone call", "brick"], [1971, "the microprocessor", "chip"], [1960, "the laser", "laser"],
  [1947, "the transistor", "chip"], [1945, "the electronic computer (ENIAC)", "racks"], [1928, "penicillin", "dish"], [1927, "television", "tv"], [1895, "radio", "radio"], [1886, "the motor car (Benz)", "benz"], [1885, "the safety bicycle", "bike"],
  [1877, "the phonograph", "phono"], [1876, "the telephone", "phone1876"], [1868, "the typewriter", "typewriter"], [1867, "dynamite", "dynamite"], [1857, "the passenger elevator", "elevator"], [1839, "photography", "camera"], [1837, "the telegraph", "telegraph"],
  [1804, "the steam locomotive", "loco"], [1796, "vaccination", "dish"], [1793, "the cotton gin", "box"], [1769, "Watt's steam engine", "engine"], [1712, "the steam engine (Newcomen)", "engine"], [1656, "the pendulum clock", "clock"], [1608, "the telescope", "telescope"],
  [1440, "the printing press with movable type", "press"], [1286, "eyeglasses", "glasses"], [1280, "the mechanical clock (c.)", "clock"], [1088, "the magnetic compass described (China)", "compass"], [850, "gunpowder (c., China)", "dynamite"], [105, "paper (China)", "paper"],
  [-199, "Roman concrete (c.)", "arch"], [-1199, "ironworking (c.)", "anvil"], [-2999, "bronze (c.)", "anvil"], [-3199, "writing (cuneiform, c.)", "tablet"], [-3499, "the wheel (c.)", "wheel"], [-3999, "the sailing boat (c.)", "sail"], [-6999, "pottery vessels in the Near East (c.)", "pot"],
  [-8999, "farming tools: sickles and grinding stones (c.)", "sickle"], [NOW - 20000, "pottery (c., China)", "pot"], [NOW - 40000, "the sewing needle (c.)", "needle"], [NOW - 70000, "the bow and arrow (c.)", "bow"], [NOW - 1e6, "the control of fire (c.)", "fire"],
  [NOW - 3.3e6, "stone tools (Lomekwi, c.)", "stone"]];
const INV_MODEL = {
  phone: K => { K.add("box", "wall", 0, 0, 0, 2, 4, 0.3, 0, 0x1a1a1a); K.add("box", "glow", 0, 0.2, 0.16, 1.8, 3.6, 0.02, 0, 0x6a9ad8); }, screen: K => { K.add("box", "wall", 0, 0, 0, 3.4, 2.4, 0.3, 0, 0xd8d8d0); K.add("box", "glow", 0, 0.2, 0.16, 3, 2, 0.02, 0, 0x4a7ad8); },
  pc: K => { K.add("box", "wall", 0, 0, 0, 3, 0.8, 2.4, 0, 0xd8d0b8); K.add("box", "wall", 0, 0.8, -0.2, 2.6, 2, 2, 0, 0xd8d0b8); K.add("box", "glow", 0, 1.0, 0.82, 2, 1.5, 0.02, 0, 0x2a8a3a); }, brick: K => { K.add("box", "wall", 0, 0, 0, 1, 3.5, 0.8, 0, 0x2a2a2a); K.add("box", "wall", 0.3, 3.5, 0, 0.12, 1.2, 0.12, 0, 0x2a2a2a); },
  chip: K => { K.add("box", "wall", 0, 0.3, 0, 2.4, 0.3, 2.4, 0, 0x2a2a2a); for (let k = 0; k < 8; k++) for (const e of [-1, 1]) K.add("box", "lead", -1 + k * 0.28, 0, e * 1.3, 0.1, 0.4, 0.3, 0); }, laser: K => { K.add("cyl", "wall", 0, 1, 0, 1, 2.5, 1, 0, 0xc8c8c8); K.add("box", "glow", 0, 2, 0, 0.12, 0.12, 30, 0, 0xff3a2a); },
  racks: K => { for (let k = 0; k < 4; k++) { K.add("box", "wall", -3 + k * 2, 0, 0, 1.6, 3.4, 0.8, 0, 0x3a3a3a); for (let q = 0; q < 6; q++) K.add("ball", "glow", -3 + k * 2, 0.6 + q * 0.45, 0.42, 0.15, 0.15, 0.05, 0, 0xffb040); } }, dish: K => { K.add("cyl", "glass2", 0, 0, 0, 2.6, 0.4, 2.6, 0, 0xe0f0f0); K.add("cyl", "wall", 0, 0.05, 0, 2.2, 0.2, 2.2, 0, 0xd8d8a0); },
  tv: K => { K.add("box", "wood", 0, 0, 0, 3, 3, 2.4, 0); K.add("box", "glow", 0, 1.4, 1.22, 1.6, 1.2, 0.02, 0, 0xa0a8b0); }, radio: K => { K.add("box", "wood", 0, 0, 0, 2.4, 3, 1.4, 0); K.add("cyl", "wall", 0, 2, 0.72, 1.2, 0.05, 1.2, 0, 0xc8b88a); },
  benz: K => { K.add("box", "wood", 0, 1, 0, 1.6, 0.6, 2.6, 0, 0x2a2a2a); for (const [a, b, r] of [[-0.9, -0.8, 1.4], [0.9, -0.8, 1.4], [0, 1.1, 0.9]]) K.add("cyl", "wall", a, r / 2, b, r, 0.12, r, Math.PI / 2, 0x3a3a3a); }, bike: K => { for (const b of [-1, 1]) K.add("cyl", "wall", 0, 0.7, b, 1.4, 0.08, 1.4, Math.PI / 2, 0x2a2a2a); K.add("box", "wall", 0, 1.1, 0, 0.1, 0.1, 2, 0, 0x8a1a1a); },
  phono: K => { K.add("box", "wood", 0, 0, 0, 1.6, 0.8, 1.6, 0); K.add("cone", "lead", 0.4, 1.4, 0, 2, 2.4, 2, 0); }, phone1876: K => { K.add("box", "wood", 0, 0, 0, 1.4, 2.4, 0.8, 0); K.add("cyl", "lead", 0, 2.4, 0.5, 0.4, 0.8, 0.4, 0, 0x2a2a2a); },
  typewriter: K => { K.add("box", "wall", 0, 0, 0, 2.6, 1, 2, 0, 0x1a1a1a); for (let k = 0; k < 12; k++) K.add("cyl", "white", -1 + (k % 6) * 0.4, 1, 0.5 - (k / 6 | 0) * 0.4, 0.25, 0.1, 0.25, 0, 0xf0f0f0); K.add("cyl", "wall", 0, 1.4, -0.6, 0.5, 2.4, 0.5, Math.PI / 2, 0x2a2a2a); },
  dynamite: K => { for (let k = 0; k < 5; k++) K.add("cyl", "wall", -0.8 + k * 0.4, 0, 0, 0.36, 2.4, 0.36, 0, 0xc8302a); K.add("box", "wall", 0, 2.4, 0, 0.05, 1, 0.05, 0, 0xd8c88a); }, elevator: K => { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add("box", "wood", a, 0, b, 0.2, 6, 0.2, 0); K.add("box", "wood", 0, 2, 0, 1.8, 0.2, 1.8, 0); },
  camera: K => { K.add("box", "wood", 0, 2, 0, 1.4, 1.4, 2, 0); K.add("cyl", "lead", 0, 2.7, 1.2, 0.6, 0.6, 0.6, Math.PI / 2, 0x3a3a3a); for (const a of [-0.6, 0, 0.6]) K.add("box", "wood", a, 0, 0, 0.08, 2, 0.08, 0); }, telegraph: K => { K.add("box", "wood", 0, 0, 0, 2.4, 0.3, 1.2, 0); K.add("box", "lead", 0.4, 0.3, 0, 1.2, 0.15, 0.2, 0); K.add("cyl", "wall", -0.6, 0.3, 0, 0.5, 0.8, 0.5, 0, 0x8a5a2a); },
  loco: K => { K.add("cyl", "wall", 0, 1.2, 0, 1.6, 1.6, 4, Math.PI / 2, 0x2a2a2a); K.add("cyl", "wall", 0, 2, 1.6, 0.4, 2.4, 0.4, 0, 0x2a2a2a); K.add("box", "wood", 0, 0.4, -2.4, 1.6, 2, 1.4, 0); }, box: K => { K.add("box", "wood", 0, 0, 0, 2.4, 1.8, 1.6, 0); K.add("cyl", "lead", 0, 1, 0.8, 0.6, 2.4, 0.6, Math.PI / 2, 0x6a6a6a); },
  engine: K => { K.add("cyl", "wall", 0, 0, 0, 1.6, 3, 1.6, 0, 0x8a3a2a); K.add("box", "wood", 2, 3.8, 0, 6, 0.4, 0.4, 0); K.add("box", "wall", 4.6, 0, 0, 0.3, 4, 0.3, 0, 0x5a5a5a); K.add("cyl", "wall", -2, 0, 0, 1.2, 8, 1.2, 0, 0x9a5a48); },
  clock: K => { K.add("box", "wood", 0, 0, 0, 1.4, 5, 0.8, 0); K.add("cyl", "white", 0, 4, 0.42, 1.1, 0.05, 1.1, Math.PI / 2, 0xf0ece0); K.add("box", "lead", 0, 1.2, 0.42, 0.06, 2.2, 0.06, 0, 0xc8a83a); }, telescope: K => { for (const a of [-0.5, 0.5]) K.add("box", "wood", a, 0, 0, 0.08, 2, 0.08, 0); K.add("cyl", "wood", 0, 2.2, 0, 0.35, 4, 0.35, 1.0, 0x6a4a2c); },
  press: K => { K.add("box", "wood", -1, 0, 0, 0.4, 5, 0.4, 0); K.add("box", "wood", 1, 0, 0, 0.4, 5, 0.4, 0); K.add("box", "wood", 0, 4.6, 0, 2.4, 0.4, 0.6, 0); K.add("box", "wood", 0, 1.8, 0, 2, 0.4, 1.8, 0); K.add("cyl", "wood", 0, 2.2, 0, 0.2, 2.4, 0.2, 0); K.add("box", "white", 0, 1.2, 1.2, 1.4, 0.05, 1, 0, 0xf0ece0); },
  glasses: K => { for (const a of [-0.7, 0.7]) K.add("cyl", "glass2", a, 1.5, 0, 1.1, 0.1, 1.1, Math.PI / 2, 0xd8e8f0); K.add("box", "lead", 0, 1.5, 0, 0.4, 0.08, 0.08, 0); }, compass: K => { K.add("cyl", "wood", 0, 0, 0, 2.2, 0.4, 2.2, 0); K.add("box", "wall", 0, 0.45, 0, 0.1, 0.06, 1.8, 0.5, 0xc8201a); },
  paper: K => { for (let k = 0; k < 6; k++) K.add("box", "white", (k % 2) * 0.1, k * 0.05, 0, 2, 0.04, 2.6, k * 0.05, 0xf0e8d0); }, arch: K => { for (const e of [-1, 1]) K.add("box", "wall", e * 1.6, 0, 0, 0.8, 2.6, 1, 0, 0xc8c0b0); K.add("box", "wall", 0, 2.6, 0, 4, 0.8, 1, 0, 0xc8c0b0); },
  anvil: K => { K.add("box", "lead", 0, 0, 0, 1.2, 1, 0.8, 0, 0x3a3a3a); K.add("box", "lead", 0.2, 1, 0, 2.2, 0.5, 0.8, 0, 0x3a3a3a); }, tablet: K => { K.add("box", "wall", 0, 0, 0, 2, 2.6, 0.5, 0, 0xb8906a); for (let k = 0; k < 5; k++) K.add("box", "wall", 0, 0.4 + k * 0.45, 0.26, 1.6, 0.06, 0.02, 0, 0x6a4a30); },
  wheel: K => { K.add("cyl", "wood", 0, 1.6, 0, 3.2, 0.3, 3.2, Math.PI / 2, 0x7a5a3a); K.add("box", "wood", 0, 1.6, 0, 0.3, 3, 0.35, 0); }, sail: K => { K.add("box", "wood", 0, 0, 0, 1.2, 0.6, 4, 0); K.add("box", "wood", 0, 0, 0, 0.12, 4, 0.12, 0); K.add("box", "white", 0, 1.4, 0.1, 0.05, 2.4, 2, 0, 0xe8dcc0); },
  pot: K => { K.add("ball", "wall", 0, 1.1, 0, 1.6, 2, 1.6, 0, 0xa8603a); K.add("cyl", "wall", 0, 1.9, 0, 1, 0.5, 1, 0, 0xa8603a); }, sickle: K => { K.add("box", "wood", 0, 0, 0, 0.15, 1.2, 0.15, 0); K.add("box", "white", 0.5, 1.2, 0, 1.2, 0.15, 0.05, 0.3, 0xd8d0c0); K.add("box", "wall", 1.6, 0, 0, 1.6, 0.4, 1, 0, 0x8a8478); },
  needle: K => { K.add("box", "white", 0, 0.5, 0, 0.12, 3.4, 0.12, 0.2, 0xe8dcc8); }, bow: K => { K.add("box", "wood", 0, 0, 0, 0.12, 3.4, 0.12, 0); K.add("box", "white", 0.6, 0, 0, 0.02, 3.4, 0.02, 0, 0xe8e0d0); K.add("box", "wood", 0.3, 1.7, 0, 2.4, 0.06, 0.06, 0); },
  fire: K => { for (let k = 0; k < 5; k++) K.add("box", "wood", 0, 0.1, 0, 0.2, 0.2, 2.2, k * 0.6, 0x5a3a24); K.add("cone", "glow", 0, 0.2, 0, 1.2, 2.2, 1.2, 0, 0xff8a2a); K.add("cone", "glow", 0, 0.2, 0, 0.6, 1.4, 0.6, 0, 0xffe07a); },
  stone: K => { K.add("ball", "grey", 0, 0.7, 0, 1.8, 1.2, 1.2, 0.4, 0x8a8478); } };
const INVOBJ = new Map();
function updateInventions(xT) { for (const iv of INV) { const ex = xOfYear(iv[0]), d = ex - xT, on = d > -900 && d < 1800, has = INVOBJ.has(iv[0]);
    if (on && !has) { const K = new Kit(), dz = 46, z = trackZ(ex) + dz, gy = Math.max(terrainH(ex, z), 0.3), ry = trackH(ex) - Math.PI / 2;
      K.add("box", "wall", 0, -0.5, 0, 6, 2.0, 6, 0, 0xc8c0b0); const MK = new Kit(); (INV_MODEL[iv[2]] || INV_MODEL.box)(MK); const g = new THREE.Group(), base = K.build(); g.add(base); const mg = MK.build(); mg.position.y = 1.5; mg.rotation.y = ry; mg.scale.setScalar(1.6); g.add(mg);
      const c = document.createElement("canvas"); c.width = 512; c.height = 160; const cg = c.getContext("2d"); cg.fillStyle = "#1a1a1a"; cg.fillRect(0, 0, 512, 160); cg.strokeStyle = "#c8a24a"; cg.lineWidth = 6; cg.strokeRect(4, 4, 504, 152);
      cg.fillStyle = "#f0d890"; cg.font = "700 40px Georgia, serif"; cg.fillText(fmtYear(iv[0]), 20, 54); cg.fillStyle = "#f0ece0"; let fs = 36; do { cg.font = `${fs}px Georgia, serif`; } while (cg.measureText(iv[1]).width > 470 && --fs > 18); cg.fillText(iv[1], 20, 116);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const plq = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.75), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); plq.position.set(0, 0.6, 0); plq.rotation.y = ry; plq.translateZ(3.02); g.add(plq);
      INVOBJ.set(iv[0], anchor(g, ex, gy, z)); }
    else if (!on && has) { const g = INVOBJ.get(iv[0]); unanchor(g); g.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.material?.map) o.material.map.dispose(); }); INVOBJ.delete(iv[0]); } } }

// ---------- great buildings and bridges, at real size, standing at the year they were completed (on the hill side, set back) ----------
// [year, name, builder, distance from the line]. Sizes are the real ones (heights in metres); shapes are simplified.
const AW = 0xf0ece4, ST = 0xd8ccb0;
const AR_ = {
  tower(K, x, gy, z, w, h, col, steps = 4, spire = 0) { let y = gy, ww = w; for (let k = 0; k < steps; k++) { const hh = h / steps; K.add("box", "wall", x, y, z, ww, hh + 0.5, ww, 0, col); y += hh; ww *= 0.82; } if (spire) K.add("cone", "lead", x, y, z, ww * 0.6, spire, ww * 0.6, 0); },
  dome(K, x, gy, z, d, h, col) { K.add("cyl", "wall", x, gy, z, d, h, d, 0, col); K.add("dome", "wall", x, gy + h, z, d, d * 0.55, d, 0, col); },
  cols(K, x, gy, z, ry, n, len, w, h, col) { const c = Math.cos(ry), s = Math.sin(ry); for (let i = 0; i < n; i++) for (const e of [-1, 1]) { const a = -len / 2 + i * len / (n - 1); K.add("cyl", "wall", x + s * a + c * e * w / 2, gy, z + c * a - s * e * w / 2, 1.8, h, 1.8, 0, col); } } };
const ARCH = [
  [2014, "One World Trade Center, New York (541 m)", (K, x, g, z) => { AR_.tower(K, x, g, z, 62, 417, 0x8aa0b8, 6); K.add("box", "lead", x, g + 417, z, 2, 124, 2, 0); }, 500],
  [2010, "Burj Khalifa, Dubai (828 m): the tallest building", (K, x, g, z) => { AR_.tower(K, x, g, z, 70, 640, 0xb8c4cc, 9); K.add("box", "lead", x, g + 640, z, 4, 188, 4, 0); }, 900],
  [1998, "Petronas Towers, Kuala Lumpur (452 m)", (K, x, g, z) => { for (const e of [-40, 40]) { AR_.tower(K, x + e, g, z, 46, 380, 0xc8ccd0, 7); K.add("box", "lead", x + e, g + 380, z, 2, 72, 2, 0); } K.add("box", "wall", x, g + 170, z, 50, 10, 8, 0, 0xc8ccd0); }, 650],
  [1976, "CN Tower, Toronto (553 m)", (K, x, g, z) => { K.add("cyl", "wall", x, g, z, 30, 340, 30, 0, 0xd8d4cc); K.add("cyl", "wall", x, g + 340, z, 50, 22, 50, 0, 0xd8d4cc); K.add("cyl", "wall", x, g + 362, z, 9, 90, 9, 0, 0xd8d4cc); K.add("box", "lead", x, g + 452, z, 2, 100, 2, 0); }, 650],
  [1973, "Sydney Opera House", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 120, 6, 180, ry, 0xc8b8a0); for (let k = 0; k < 5; k++) { const c = Math.cos(ry), s = Math.sin(ry), a = -50 + k * 26; K.add("ball", "white", x + s * a, g + 6, z + c * a, 40 - k * 4, 70 - k * 8, 30, ry, 0xf4f4f0); } }, 320],
  [1965, "the Gateway Arch, St. Louis (192 m)", (K, x, g, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); for (let k = 0; k <= 40; k++) { const t = k / 40 * 2 - 1, a = t * 96, y = 192 * (1 - Math.cosh(t * 1.6) / Math.cosh(1.6) * 1) / (1 - 1 / Math.cosh(1.6)); K.add("box", "lead", x + s * a, g + y, z + c * a, 9 - 5 * (1 - Math.abs(t)), 9, 9, ry, 0xd8dce0); } }, 380],
  [1937, "the Golden Gate Bridge (towers 227 m)", (K, x, g, z, ry) => { for (const dz of [-420, -1060]) K.add("box", "wall", x, -6, z + dz, 18, 233, 27, ry, 0xc0362c);   // two towers in the river
    K.add("box", "wall", x, 67, z - 740, 1100, 6, 27, ry, 0xc0362c); for (let k = 0; k <= 40; k++) { const zz = z - 200 - k * 25, u = (zz - (z - 740)) / 320, y = Math.abs(u) <= 1 ? 72 + 150 * u * u : 222 - 150 * Math.min(1, (Math.abs(u) - 1) * 1.2);
      K.add("box", "wall", x, Math.max(y, 72), zz, 26, 1.2, 1.2, ry, 0xc0362c); } }, 0],
  [1931, "the Empire State Building, New York (443 m)", (K, x, g, z) => { AR_.tower(K, x, g, z, 70, 380, 0xc8c0b0, 6); K.add("cyl", "lead", x, g + 380, z, 8, 63, 8, 0); }, 450],
  [1930, "the Chrysler Building, New York (319 m)", (K, x, g, z) => { AR_.tower(K, x, g, z, 50, 250, 0xd8d0c4, 5, 0); for (let k = 0; k < 6; k++) K.add("cone", "glass2", x, g + 250 + k * 7, z, 26 - k * 4, 14, 26 - k * 4, 0, 0xd8dce0); K.add("box", "lead", x, g + 290, z, 1.5, 30, 1.5, 0); }, 360],
  [1889, "the Eiffel Tower, Paris (300 m)", (K, x, g, z) => { for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k < 8; k++) { const t = k / 8; K.add("box", "lead", x + a * 50 * (1 - t), g + t * 57, z + b * 50 * (1 - t), 10, 8, 10, 0, 0x6a5a48); }
    K.add("box", "lead", x, g + 57, z, 70, 4, 70, 0, 0x6a5a48); for (let k = 0; k < 12; k++) { const t = k / 12, w = 46 * (1 - t) + 6; K.add("box", "lead", x, g + 60 + t * 220, z, w, 19, w, 0, 0x6a5a48); } K.add("box", "lead", x, g + 280, z, 4, 20, 4, 0, 0x6a5a48); }, 420],
  [1884, "the Washington Monument (169 m)", (K, x, g, z) => { K.add("box", "wall", x, g, z, 16.8, 152, 16.8, 0, 0xf0ece0); K.add("pyr", "wall", x, g + 152, z, 11, 17, 11, 0, 0xf0ece0); }, 280],
  [1866, "the U.S. Capitol dome", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 90, 24, 230, ry, AW); AR_.dome(K, x, g + 24, z, 40, 30, AW); K.add("cyl", "wall", x, g + 76, z, 8, 14, 8, 0, AW); }, 360],
  [1859, "the Palace of Westminster and Big Ben (96 m)", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 40, 25, 260, ry, 0xd8c8a0); const c = Math.cos(ry), s = Math.sin(ry); K.add("box", "wall", x + s * 140, g, z + c * 140, 12, 70, 12, 0, 0xd8c8a0); K.add("box", "white", x + s * 140, g + 58, z + c * 140, 12.4, 8, 12.4, 0, 0xf0ecd8); K.add("pyr", "lead", x + s * 140, g + 70, z + c * 140, 12, 26, 12, 0, 0x3a4a3a); }, 380],
  [1653, "the Taj Mahal, Agra", (K, x, g, z) => { K.add("box", "white", x, g, z, 95, 7, 95, 0, AW); K.add("box", "white", x, g + 7, z, 56, 30, 56, 0, AW); K.add("ball", "white", x, g + 52, z, 36, 40, 36, 0, AW); K.add("cone", "lead", x, g + 70, z, 2, 10, 2, 0, 0xd8b84a); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add("cyl", "white", x + a * 44, g + 7, z + b * 44, 6, 40, 6, 0, AW); }, 360],
  [1626, "St. Peter's Basilica, Rome (136 m)", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 120, 46, 210, ry, ST); AR_.dome(K, x, g + 46, z, 50, 30, ST); K.add("cyl", "wall", x, g + 104, z, 8, 18, 8, 0, ST); }, 380],
  [1450, "Machu Picchu", (K, x, g, z) => { K.add("cone", "wall", x, g, z, 500, 260, 400, 0, 0x5a7a3a); for (let k = 0; k < 6; k++) K.add("box", "wall", x - 60 + k * 10, g + 120 + k * 4, z, 60 - k * 6, 4, 80, 0, 0x9a948a); K.add("cone", "wall", x + 150, g, z + 120, 200, 420, 200, 0, 0x4a6a32); }, 900],
  [1420, "the Forbidden City, Beijing", (K, x, g, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); for (let k = 0; k < 4; k++) { const a = -150 + k * 100; K.add("box", "wall", x + s * a, g, z + c * a, 60, 2.5, 30, ry, 0xe8e0d0); K.add("box", "wall", x + s * a, g + 2.5, z + c * a, 54, 12, 26, ry, 0xb8302a); K.add("gable", "roof", x + s * a, g + 14.5, z + c * a, 64, 12, 34, ry + Math.PI / 2, 0xd8a83a); } }, 360],
  [1372, "the Leaning Tower of Pisa (56 m)", (K, x, g, z) => { for (let k = 0; k < 8; k++) K.add("cyl", "white", x + k * 0.55, g + k * 7, z, 15.5, 7.3, 15.5, 0, 0xf0ece0); }, 160],
  [1260, "a Gothic cathedral (Chartres; Notre-Dame, Reims, Amiens rising)", (K, x, g, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); K.add("box", "wall", x, g, z, 46, 34, 130, ry, ST); K.add("gable", "roof", x, g + 34, z, 47, 18, 131, ry, 0x6a7078);
    for (const e of [-1, 1]) { const tx = x + s * -70 + c * e * 16, tz = z + c * -70 - s * e * 16; K.add("box", "wall", tx, g, tz, 16, 105, 16, ry, ST); K.add("pyr", "lead", tx, g + 105, tz, 14, 10, 14, ry, ST); }
    for (let k = 0; k < 9; k++) for (const e of [-1, 1]) { const a = -55 + k * 14; K.add("box", "wall", x + s * a + c * e * 30, g, z + c * a - s * e * 30, 3, 26, 8, ry, ST); } K.add("cone", "lead", x + s * 20, g + 52, z + c * 20, 6, 50, 6, 0); }, 300],
  [1150, "Angkor Wat, Cambodia", (K, x, g, z) => { K.add("box", "wall", x, g, z, 200, 4, 200, 0, 0x9a8a72); K.add("box", "wall", x, g + 4, z, 120, 12, 120, 0, 0x8a7a62); for (const [a, b, h] of [[0, 0, 65], [-40, -40, 42], [40, -40, 42], [-40, 40, 42], [40, 40, 42]]) K.add("cone", "wall", x + a, g + 16, z + b, 20, h, 20, 0, 0x8a7a62); }, 420],
  [1000, "El Castillo, Chichen Itza (c.)", (K, x, g, z) => { for (let k = 0; k < 9; k++) K.add("box", "wall", x, g + k * 3.4, z, 55 - k * 5, 3.4, 55 - k * 5, 0, 0xc8bca0); K.add("box", "wall", x, g + 30, z, 12, 6, 12, 0, 0xc8bca0); }, 260],
  [537, "Hagia Sophia, Constantinople", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 75, 30, 80, ry, 0xd8a888); AR_.dome(K, x, g + 30, z, 32, 8, 0xd8a888); for (const e of [-1, 1]) { const c = Math.cos(ry), s = Math.sin(ry); K.add("dome", "wall", x + s * e * 30, g + 30, z + c * e * 30, 30, 12, 30, 0, 0xd8a888); } }, 360],
  [126, "the Pantheon, Rome (dome 43 m)", (K, x, g, z, ry) => { AR_.dome(K, x, g, z, 58, 22, 0xd8ccb0); const c = Math.cos(ry), s = Math.sin(ry); K.add("box", "wall", x - c * 36, g, z + s * 36, 16, 16, 34, ry + Math.PI / 2, 0xd8ccb0); K.add("gable", "roof", x - c * 36, g + 16, z + s * 36, 18, 7, 34, ry + Math.PI / 2, 0xd8ccb0); }, 260],
  [80, "the Colosseum, Rome (48 m)", (K, x, g, z) => { for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; K.add("box", "wall", x + Math.cos(a) * 94, g, z + Math.sin(a) * 78, 13, 48, 10, -a, 0xd8c098); } }, 300],
  [-214, "the Great Wall (Qin, c.)", (K, x, g, z, ry, ex) => { const c = Math.cos(ry), s = Math.sin(ry); for (let k = -30; k <= 30; k++) { const a = k * 30, px = x + s * a, pz = z + c * a + 60 * Math.sin(k * 0.4), h = terrainH(ex + px, pz); K.add("box", "wall", px, h, pz, 6, 8, 31, ry + 0.3 * Math.cos(k * 0.4), 0xa89a80); if (k % 4 === 0) K.add("box", "wall", px, h, pz, 12, 14, 12, ry, 0xa89a80); } }, 700],
  [-431, "the Parthenon, Athens", (K, x, g, z, ry) => { K.add("box", "wall", x, g, z, 33, 2.5, 72, ry, AW); AR_.cols(K, x, g + 2.5, z, ry, 17, 66, 28, 10.4, AW); K.add("box", "wall", x, g + 12.9, z, 31, 3, 70, ry, AW); K.add("gable", "roof", x, g + 15.9, z, 31, 4, 70, ry, AW); }, 220],
  [-2099, "the Great Ziggurat of Ur (c.)", (K, x, g, z) => { K.add("box", "wall", x, g, z, 64, 12, 46, 0, 0xb8906a); K.add("box", "wall", x, g + 12, z, 44, 10, 30, 0, 0xb8906a); K.add("box", "wall", x, g + 22, z, 24, 8, 16, 0, 0xb8906a); }, 220],
  [-9499, "Göbekli Tepe, the oldest known monumental site (c.)", (K, x, g, z) => { for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; K.add("box", "wall", x + Math.cos(a) * 10, g, z + Math.sin(a) * 10, 1.4, 4.5, 0.5, -a, 0xc8b898); K.add("box", "wall", x + Math.cos(a) * 10, g + 4.5, z + Math.sin(a) * 10, 2.2, 0.8, 0.6, -a, 0xc8b898); } for (const e of [-1.6, 1.6]) K.add("box", "wall", x + e, g, z, 1.6, 5.5, 0.6, 0, 0xc8b898); }, 80]];
for (const [yr, name] of ARCH) EVENTS.push([yr, `${name[0].toUpperCase() + name.slice(1)}: completed.`]);
const ARCHOBJ = new Map();
function updateArch(xT) { for (const A of ARCH) { const [yr, , build, dz0] = A, dz = dz0 ? dz0 + 250 : 0, ex = xOfYear(yr), d = ex - xT, on = d > -2000 && d < 4000, has = ARCHOBJ.has(yr);
    if (on && !has) { const K = new Kit(), z = trackZ(ex) + (dz || 0), g = dz ? Math.max(terrainH(ex, z), 0.3) : 0; build(K, 0, g, z, trackH(ex), ex); ARCHOBJ.set(yr, anchor(K.build(), ex, 0, 0)); }
    else if (!on && has) { const g = ARCHOBJ.get(yr); unanchor(g); g.traverse(o => o.isInstancedMesh && o.dispose()); ARCHOBJ.delete(yr); } } }

// ---------- re-enactments: battles and events playing out, and the everyday work of each age, beside the line ----------
// Figures move (marching, firing, hammering, hoeing, paddling); muzzle flashes, smoke, sparks and fire glow come and go. Each scene
// loops while it is near. Everyday scenes recur every 600 m (24 years) through their age; a plaque says what and where (several are
// world history, not this valley's: North America had no Bronze or Iron Age).
const FIG = { body: new THREE.CylinderGeometry(0.2, 0.28, 1.0, 7).translate(0, 1.0, 0), head: new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.66, 0), hat: new THREE.CylinderGeometry(0.16, 0.19, 0.15, 7).translate(0, 1.83, 0),
  leg: new THREE.BoxGeometry(0.11, 0.55, 0.13).translate(0, -0.28, 0), arm: new THREE.BoxGeometry(0.09, 0.55, 0.1).translate(0, -0.27, 0), tool: new THREE.BoxGeometry(0.05, 0.05, 1.3).translate(0, 0, 0.55) };
const figMat = new THREE.MeshStandardMaterial({ roughness: 0.9 }), ZF = new THREE.Matrix4().makeScale(0, 0, 0);
const _fm = new THREE.Matrix4(), _fq = new THREE.Quaternion(), _fe = new THREE.Euler(), _fs = V3(1, 1, 1), _fp = V3(0, 0, 0);
class Troop { constructor(g, n) { this.n = n; this.M = {}; for (const k of ["body", "head", "hat", "legL", "legR", "armL", "armR", "tool"]) { const im = new THREE.InstancedMesh(FIG[k.replace(/[LR]$/, "")], figMat, n); im.frustumCulled = false; g.add(im); this.M[k] = im; } }
  color(i, cloth, hat, leg = 0x3a3028, skin = 0xc8a080, tool = 0x5a4a3a) { const c = new THREE.Color(), M = this.M; M.body.setColorAt(i, c.setHex(cloth)); M.armL.setColorAt(i, c); M.armR.setColorAt(i, c); M.hat.setColorAt(i, c.setHex(hat ?? skin));
    M.head.setColorAt(i, c.setHex(skin)); M.legL.setColorAt(i, c.setHex(leg)); M.legR.setColorAt(i, c); M.tool.setColorAt(i, c.setHex(tool)); }
  set(i, x, y, z, h, o = {}) { const s = o.s ?? 1, M = this.M, ch = Math.cos(h), sh = Math.sin(h), aR = o.aR ?? 0, walk = o.walk ?? 0; y -= o.sit ? 0.55 * s : 0; _fs.set(s, s, s);
    _fe.set(o.lean ?? 0, h, 0, "YXZ"); _fq.setFromEuler(_fe); _fm.compose(_fp.set(x, y, z), _fq, _fs); M.body.setMatrixAt(i, _fm); M.head.setMatrixAt(i, _fm); M.hat.setMatrixAt(i, o.hat === false ? ZF : _fm);
    for (const [k, sd, a, ht, off] of [["legL", 1, o.sit ? -1.4 : walk, 0.55, 0.1], ["legR", -1, o.sit ? -1.4 : -walk, 0.55, 0.1], ["armL", 1, o.aL ?? 0, 1.45, 0.27], ["armR", -1, aR, 1.45, 0.27]]) {
      _fe.set(a, h, 0, "YXZ"); _fq.setFromEuler(_fe); _fm.compose(_fp.set(x + ch * off * sd * s, y + ht * s, z - sh * off * sd * s), _fq, _fs); M[k].setMatrixAt(i, _fm); }
    if (o.tool !== undefined) { const ly = 1.45 - 0.55 * Math.cos(aR), lz = -0.55 * Math.sin(aR), lx = -0.27; _fe.set(o.tool, h, 0, "YXZ"); _fq.setFromEuler(_fe); _fs.set(s, s, s * (o.tl ?? 1));
      _fm.compose(_fp.set(x + (lx * ch + lz * sh) * s, y + ly * s, z + (-lx * sh + lz * ch) * s), _fq, _fs); M.tool.setMatrixAt(i, _fm); } else M.tool.setMatrixAt(i, ZF); }
  done() { for (const m of Object.values(this.M)) m.instanceMatrix.needsUpdate = true; } }
class FX { constructor(g) { const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.frustumCulled = false; g.add(m); return m; };
    this.F = mk(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd890, toneMapped: false }), 80);
    this.S = mk(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: 0xdedcd4, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1 }), 240);
    this.B = mk(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 200);
    this.G = mk(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false }), 40); this.c = new THREE.Color(); }
  begin() { this.nf = this.ns = this.nb = this.ng = 0; }
  put(m, n, x, y, z, sx, sy, sz, ry = 0, rx = 0) { O3.position.set(x, y, z); O3.rotation.set(rx, ry, 0, "YXZ"); O3.scale.set(sx, sy, sz); O3.updateMatrix(); m.setMatrixAt(n, O3.matrix); }
  flash(x, y, z, s) { if (this.nf < 80) this.put(this.F, this.nf++, x, y, z, s, s, s); }
  smoke(x, y, z, s) { if (this.ns < 240) this.put(this.S, this.ns++, x, y, z, s, s, s); }
  glow(x, y, z, s) { if (this.ng < 40) this.put(this.G, this.ng++, x, y, z, s, s * 1.3, s); }
  box(x, y, z, sx, sy, sz, ry, rx, col) { if (this.nb >= 200) return; this.put(this.B, this.nb, x, y, z, sx, sy, sz, ry, rx); this.B.setColorAt(this.nb++, this.c.setHex(col)); }
  end() { this.F.count = this.nf; this.S.count = this.ns; this.B.count = this.nb; this.G.count = this.ng; for (const m of [this.F, this.S, this.B, this.G]) m.instanceMatrix.needsUpdate = true; if (this.B.instanceColor) this.B.instanceColor.needsUpdate = true; } }
function scaffold(K, x, gy, z, w, h, d, ry) { for (let a = -w / 2; a <= w / 2; a += 4) for (const e of [-1, 1]) K.add("box", "wood", x + Math.cos(ry) * a + Math.sin(ry) * e * d / 2, gy, z - Math.sin(ry) * a + Math.cos(ry) * e * d / 2, 0.2, h, 0.2, ry); }
const fwdOf = h => [Math.sin(h), Math.cos(h)];
function arc(F, x0, z0, x1, z1, gy, f, hgt, col, len = 1.4) { const x = lerpN(x0, x1, f), z = lerpN(z0, z1, f), y = gy + 1.6 + Math.sin(f * Math.PI) * hgt; F.box(x, y, z, 0.05, 0.05, len, Math.atan2(x1 - x0, z1 - z0), -Math.cos(f * Math.PI) * 0.8, col); }
function plaque(g, P, title, text) { const c = document.createElement("canvas"); c.width = 640; c.height = 200; const cg = c.getContext("2d"); cg.fillStyle = "#1e2a24"; cg.fillRect(0, 0, 640, 200); cg.strokeStyle = "#c8a24a"; cg.lineWidth = 6; cg.strokeRect(4, 4, 632, 192);
  cg.fillStyle = "#f0d890"; cg.font = "700 40px Georgia, serif"; cg.fillText(title, 20, 52); cg.fillStyle = "#f0ece0"; cg.font = "28px Georgia, serif"; const words = text.split(" "); let ln = "", y = 96;
  for (const w of words) { if (cg.measureText(ln + w).width > 600) { cg.fillText(ln, 20, y); y += 34; ln = ""; } ln += w + " "; } cg.fillText(ln, 20, y);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const [x, gy, z, ry] = P(-14, 62), m = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, gy + 3.2, z); m.rotation.y = ry - Math.PI / 2; g.add(m);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2).translate(0, 1.5, 0), M(0x4a3a2a)); p.position.set(x, gy, z); g.add(p); }
// ---- a battle between two lines (muskets, rifles), with optional cannon, trenches, tanks and aircraft
function battle(o) { return (K, g, P, y) => { const n = o.n ?? 14, T = new Troop(g, n * 2), F = new FX(g), dA = 70, dB = 140;
  for (let i = 0; i < n; i++) { T.color(i, o.colA, o.hatA, o.legA); T.color(n + i, o.colB, o.hatB, o.legB); }
  if (o.trench) for (const dz of [dA, dB]) for (let a = -40; a <= 40; a += 8) { const [x, gy, z, ry] = P(a, dz); K.add("box", "wall", x, gy - 0.2, z + 1.6 * (dz === dA ? 1 : -1), 8.2, 1.0, 1.2, ry, 0x6a5a40); }
  const guns = o.cannon ? [[-30, dA - 12, 0], [30, dA - 12, 0], [-24, dB + 12, 1], [24, dB + 12, 1]] : [];
  for (const [a, dz, s] of guns) { const [x, gy, z, ry] = P(a, dz); K.add("cyl", "lead", x, gy + 0.9, z, 0.5, 2.8, 0.5, ry + Math.PI / 2, 0x2a2a2a); for (const e of [-1, 1]) K.add("cyl", "wood", x + Math.cos(ry) * e, gy + 0.6, z, 1.3, 0.15, 1.3, ry, 0x5a3a24); }
  return t => { F.begin(); const per = 8;
    for (let s = 0; s < 2; s++) { const ph = (t + s * per / 2) % per, adv = Math.sin(t * 0.12 + s * 2) * (o.trench ? 0 : 5);
      for (let i = 0; i < n; i++) { const al = -n * 1.15 + i * 2.3 + (s ? 1.1 : 0), dz = s ? dB - adv + (i % 2) * 1.3 : dA + adv - (i % 2) * 1.3, [x, gy, z, ry] = P(al, dz), h = ry + (s ? -Math.PI / 2 : Math.PI / 2), [fx, fz] = fwdOf(h);
        const yy = gy - (o.trench ? 0.9 : o.kneel && i % 2 === 0 ? 0.35 : 0), stag = (i % 3) * 0.15;
        if (ph > stag && ph < 2.2 + stag) { T.set(s * n + i, x, yy, z, h, { aR: -1.5, aL: -1.35, tool: -0.05 }); if (ph < 0.25 + stag) F.flash(x + fx * 1.7, yy + 1.4, z + fz * 1.7, 0.32); }
        else T.set(s * n + i, x, yy, z, h, { aR: -0.5 + 0.35 * Math.sin(t * 3 + i), aL: -0.9, tool: -1.35 });
        if (ph < 6) F.smoke(x + fx * (1.8 + ph * 0.4), yy + 1.5 + ph * 0.35, z + fz * (1.8 + ph * 0.4), 0.3 + ph * 0.45); } }
    guns.forEach(([a, dz, s], k) => { const ph = (t + k * 1.7) % 6, [x, gy, z, ry] = P(a, dz), h = ry + (s ? -Math.PI / 2 : Math.PI / 2), [fx, fz] = fwdOf(h); if (ph < 0.3) F.flash(x + fx * 2.2, gy + 0.9, z + fz * 2.2, 1.2);
      if (ph < 5) for (let q = 0; q < 3; q++) F.smoke(x + fx * (2.5 + ph * 0.8 + q), gy + 1 + ph * 0.5, z + fz * (2.5 + ph * 0.8 + q), 0.8 + ph * 0.8);
      const bp = ph - 0.6; if (bp > 0 && bp < 3) { const [bx, bg, bz] = P(a * 0.6 + k * 7, s ? dA + 25 : dB - 25); if (bp < 0.25) F.flash(bx, bg + 1, bz, 2.4); F.smoke(bx, bg + 1 + bp * 2, bz, 1.5 + bp * 1.6); } });
    if (o.tanks) for (let k = 0; k < 3; k++) { const ph = (t * 0.05 + k / 3) % 1, al = -70 + 140 * Math.abs(ph * 2 - 1), [x, gy, z, ry] = P(al, dA - 30 - k * 8), dir = ph < 0.5 ? 0 : Math.PI;
      F.box(x, gy + 1.1, z, 3.4, 1.8, 6.5, ry + dir, 0, 0x4a5a3a); F.box(x, gy + 2.3, z, 2.2, 0.9, 2.6, ry + dir, 0, 0x4a5a3a); const [bx, bz] = fwdOf(ry + Math.PI / 2); F.box(x + bx * 2.4, gy + 2.3, z + bz * 2.4, 0.25, 0.25, 3, ry + Math.PI / 2, 0, 0x3a4a2a);
      if ((t + k * 2) % 7 < 0.3) F.flash(x + bx * 4.2, gy + 2.3, z + bz * 4.2, 1); }
    if (o.planes) for (let k = 0; k < 3; k++) { const a = t * 0.35 + k * 2.1, [cx, cg, cz] = P(0, 110), x = cx + Math.cos(a) * 160, z = cz + Math.sin(a) * 90, yy = cg + 90 + k * 12, hh = Math.atan2(-Math.sin(a) * 160, Math.cos(a) * 90) + Math.PI / 2;
      F.box(x, yy, z, 1.2, 1.2, 9, hh, 0, 0x5a6a5a); F.box(x, yy + 0.2, z, 12, 0.2, 2, hh, 0, 0x5a6a5a); }
    T.done(); F.end(); }; }; }
// ---- the Battle of Hastings: Norman knights charging a Saxon shield wall, archers' volleys
const hastings = (K, g, P, y) => { const T = new Troop(g, 34), F = new FX(g);
  for (let i = 0; i < 14; i++) T.color(i, 0x8a8a90, 0x8a8a90, 0x5a4a3a); for (let i = 14; i < 24; i++) T.color(i, 0x6a4a2a, 0x8a8a90); for (let i = 24; i < 34; i++) T.color(i, 0x7a6a50, 0x4a3a2a);
  return t => { F.begin(); const ch = (t % 14) / 14;
    for (let i = 0; i < 14; i++) { const [x, gy, z, ry] = P(-20 + i * 3, 150); T.set(i, x, gy, z, ry - Math.PI / 2, { aL: -1.2, aR: -0.3 + 0.2 * Math.sin(t * 2 + i), tool: -1.2 }); F.box(x - Math.sin(ry + Math.PI / 2) * 0.6, gy + 1.1, z + 0.6, 1.0, 1.4, 0.12, ry, 0, [0xb8302a, 0xd8c83a, 0x2a4a8a][i % 3]); }   // the shield wall
    for (let i = 0; i < 10; i++) { const d = ch < 0.6 ? 70 + ch / 0.6 * 70 : 140 - (ch - 0.6) / 0.4 * 70, [x, gy, z, ry] = P(-15 + i * 3.5, d - (i % 2) * 3), h = ry + (ch < 0.6 ? Math.PI / 2 : -Math.PI / 2), gal = Math.sin(t * 9 + i) * 0.15;
      F.box(x, gy + 1.2 + gal, z, 0.9, 1.0, 2.4, h, 0, [0x4a3a2a, 0x2a2a2a, 0xd8d0c0][i % 3]); F.box(x + Math.sin(h) * 1.2, gy + 1.8 + gal, z + Math.cos(h) * 1.2, 0.4, 0.9, 0.5, h, -0.5, 0x4a3a2a);
      T.set(14 + i, x, gy + 0.9 + gal, z, h, { aR: -1.5, aL: -0.6, tool: -0.1, tl: 2.2, walk: -1.0 }); }   // knights with lances
    for (let i = 0; i < 10; i++) { const [x, gy, z, ry] = P(-30 + i * 3, 55), h = ry + Math.PI / 2, ph = (t + i * 0.1) % 5; T.set(24 + i, x, gy, z, h, { aL: -2.0, aR: ph < 1 ? -1.6 : -1.9, tool: -0.6, tl: 0.8 });
      if (ph > 1 && ph < 3.2) { const [tx, tg, tz] = P(-20 + i * 3, 150); arc(F, x, z, tx, tz, gy, (ph - 1) / 2.2, 30, 0x3a2a1a, 0.9); } }
    T.done(); F.end(); }; };
// ---- a Roman legion advancing with shields, javelins thrown
const legion = (K, g, P, y) => { const T = new Troop(g, 40), F = new FX(g); for (let i = 0; i < 32; i++) T.color(i, 0xa8302a, 0x9a9aa0, 0x5a4a3a); for (let i = 32; i < 40; i++) T.color(i, 0x5a6a3a, 0x8a6a3a);
  return t => { F.begin(); const adv = (Math.sin(t * 0.2) * 0.5 + 0.5) * 30;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const i = r * 8 + c, [x, gy, z, ry] = P(-10 + c * 2.4, 60 + adv - r * 2.2), h = ry + Math.PI / 2, w = Math.sin(t * 5 + c) * 0.35; T.set(i, x, gy, z, h, { walk: w, aL: -1.0, aR: -0.4, tool: -0.3 });
      F.box(x + Math.sin(h) * 0.5, gy + 1.0, z + Math.cos(h) * 0.5, 0.9, 1.2, 0.1, h, 0, 0xa8302a); }
    for (let i = 0; i < 8; i++) { const [x, gy, z, ry] = P(-12 + i * 3, 150), h = ry - Math.PI / 2, ph = (t + i * 0.3) % 6; T.set(32 + i, x, gy, z, h, { aR: ph < 1 ? -2.6 : -0.4, aL: -0.5 }); }
    const ph = t % 6; if (ph > 1 && ph < 3) for (let c = 0; c < 8; c++) { const [x, gy, z] = P(-10 + c * 2.4, 60 + adv), [tx, , tz] = P(-12 + c * 3, 150); arc(F, x, z, tx, tz, gy, (ph - 1) / 2, 18, 0x6a4a2a, 2); }
    T.done(); F.end(); }; };
// ---- the Saturn V launch (1969), the Wright Flyer (1903), the Clermont (1807), building the pyramid (c. 2580 BCE)
function saturn(K) { let h = 0; for (const [d, L, c] of [[10, 42, 0xf4f4f0], [10, 25, 0xf4f4f0], [6.6, 18, 0xf4f4f0], [6.6, 8, 0x2a2a2a], [3.9, 4, 0xf4f4f0]]) { K.add("cyl", "wall", 0, h, 0, d, L, d, 0, c); K.add("cyl", "wall", 0, h + L * 0.82, 0, d + 0.1, L * 0.05, d + 0.1, 0, 0x1a1a1a); h += L; } K.add("cone", "wall", 0, h, 0, 3.9, 6, 3.9, 0, 0xf4f4f0); K.add("box", "wall", 0, h + 6, 0, 0.3, 10, 0.3, 0, 0xd83a2a); }
const launch = (K, g, P) => { const RK = new Kit(); saturn(RK); const rk = RK.build(); g.add(rk); const [x, gy, z] = P(0, 130); rk.position.set(x, gy, z); const F = new FX(g); K.add("box", "lead", x + 12, gy, z, 4, 110, 4, 0, 0x8a3a2a);
  return t => { F.begin(); const a = t % 45; let yy = 0; if (a > 5) yy = 0.55 * (a - 5) ** 2; rk.position.y = gy + yy; rk.visible = yy < 2500;
    if (a > 3) { F.glow(x, gy + yy - 6, z, 5 + Math.sin(t * 30) * 0.8); F.glow(x, gy + yy - 14, z, 3.5); }
    for (let q = 0; q < 26; q++) { const ag = ((t * 1.3 + q * 0.37) % 9), puffY = Math.max(0, yy - ag * 0.55 * Math.max(0, a - 5) * 2.2); if (a > 3 && puffY < 2000) F.smoke(x + Math.sin(q * 2.3) * (4 + ag * 3), gy + puffY + 2, z + Math.cos(q * 2.3) * (4 + ag * 3), 4 + ag * 2.2); }
    F.end(); }; };
const wright = (K, g, P) => { const W = new Kit(); for (const e of [0, 1.8]) W.add("box", "wall", 0, e, 0, 1.9, 0.08, 12.3, 0, 0xe8dcc0); W.add("box", "wood", 0, 0.9, 2.5, 0.1, 1.8, 0.1, 0); W.add("box", "wall", 0, 0.9, -3.5, 1.2, 1.2, 0.08, 0, 0xe8dcc0); const fl = W.build(); g.add(fl);
  const T = new Troop(g, 1); T.color(0, 0x3a3a3a, 0x3a3a3a); return t => { const a = t % 16, al = -40 + a * 6, [x, gy, z, ry] = P(al, 60), up = a > 3 ? Math.min(3, (a - 3) * 1.5) * (a < 14 ? 1 : (16 - a) / 2) : 0;
    fl.position.set(x, gy + 0.3 + up, z); fl.rotation.y = ry + Math.PI; T.set(0, x, gy + 0.6 + up, z, ry + Math.PI, { lean: -1.4, hat: true }); T.done(); }; };
const clermont = (K, g, P) => { const B = new Kit(); steamboat(B, 0, 0, 0, 0); const bt = B.build(); g.add(bt); const F = new FX(g);
  return t => { F.begin(); const a = (t % 70) / 70, al = -350 + 700 * a, [x, , z, ry] = P(al, -280); bt.position.set(x, 0, z); bt.rotation.y = ry + Math.PI;
    for (let q = 0; q < 14; q++) { const ag = (t * 0.8 + q * 0.4) % 6; F.smoke(x + ag * 4 + 0, 13 + ag * 1.4, z, 1 + ag * 0.7); } F.end(); }; };
const pyramidTeam = (K, g, P, y) => { const T = new Troop(g, 22), F = new FX(g); for (let i = 0; i < 22; i++) T.color(i, 0xe8e0c8, undefined, 0x8a6a48, 0xa8784a);
  return t => { F.begin(); const a = (t % 24) / 24, base = -30 + 60 * a, [bx, bg, bz, ry] = P(base, 110), h = ry + Math.PI;
    F.box(bx, bg + 1.1, bz, 2.4, 1.6, 3, ry, 0, 0xd8c8a0); F.box(bx, bg + 0.15, bz, 1.6, 0.3, 4.2, ry, 0, 0x6a4a2c);
    for (let i = 0; i < 20; i++) { const row = i % 2, k = (i / 2) | 0, [x, gy, z] = P(base + 4 + k * 1.3, 110 + (row ? 1.4 : -1.4)); T.set(i, x, gy, z, h, { walk: 0.4 * Math.sin(t * 3 + k), lean: 0.4, aR: -1.4, aL: -1.4, hat: false }); }
    const [wx, wg, wz] = P(base + 2.5, 110); T.set(20, wx, wg, wz, h, { aR: -1.8, aL: -1.8, lean: 0.5, hat: false }); if ((t % 2) < 1) F.box(wx + 0.3, wg + 0.5, wz, 0.1, 0.8, 0.1, ry, 0, 0x6ab0d8);   // pouring water to wet the sand
    const [ox, og, oz] = P(base + 18, 115); T.set(21, ox, og, oz, h, { aR: -2.6 + 0.6 * Math.sin(t * 4), aL: -0.5 }); T.done(); F.end(); }; };
// ---- everyday work of each age
function hammerer(T, i, x, gy, z, h, t, F, k = 0, sparks = true) { const ph = (t * 1.6 + k) % 1, up = ph < 0.6; T.set(i, x, gy, z, h, { aR: up ? -1.0 - ph / 0.6 * 1.7 : -2.7 + (ph - 0.6) / 0.4 * 1.9, aL: -0.9, tool: up ? -1.6 : 0.2, tl: 0.5 });
  if (sparks && ph > 0.95) { const [fx, fz] = fwdOf(h); for (let q = 0; q < 4; q++) F.flash(x + fx * 0.9 + Math.sin(q * 2.1 + t) * 0.3, gy + 0.9 + q * 0.1, z + fz * 0.9 + Math.cos(q * 1.7 + t) * 0.3, 0.07); } }
const DAILY_ACT = {
  bronze: { title: "Casting bronze", text: "A Bronze Age village melts copper and tin in a clay furnace blown by bellows, pours it into moulds, hammers the blades. (In Europe and Asia: North America had no Bronze Age.)", build: (K, g, P) => { const T = new Troop(g, 6), F = new FX(g); for (let i = 0; i < 6; i++) T.color(i, [0x8a6a4a, 0x6a5a3a, 0xa88a5a][i % 3], undefined, 0x5a4a3a);
      const [fx, fg, fz, ry] = P(0, 110); K.add("cone", "wall", fx, fg, fz, 2.4, 2.6, 2.4, 0, 0x8a5a3a); K.add("box", "wall", fx + 6, fg, fz, 1, 0.8, 0.8, 0, 0x5a5a5a); for (const [a, b] of [[-12, 100], [12, 125], [-14, 130]]) { const [hx, hg, hz] = P(a, b); K.add("cyl", "wall", hx, hg, hz, 6, 2.4, 6, 0, 0xb89a6a); K.add("cone", "roof", hx, hg + 2.4, hz, 7, 3.5, 7, 0, 0x9a8a5a); }
      return t => { F.begin(); const h = ry + Math.PI / 2; F.glow(fx, fg + 2.6, fz, 0.6 + 0.2 * Math.sin(t * 13)); for (let q = 0; q < 8; q++) { const a = (t * 0.7 + q * 0.6) % 5; F.smoke(fx + a * 0.4, fg + 3 + a * 1.2, fz, 0.4 + a * 0.4); }
        for (const [k, sd] of [[0, -1], [1, 1]]) { const ph = Math.sin(t * 5 + k * Math.PI); const [x, gy, z] = P(sd * 2.4, 108); T.set(k, x, gy, z, ry + (sd > 0 ? -Math.PI / 2 * 0 + Math.PI : 0), { sit: true, aR: -1.2 + 0.5 * ph, aL: -1.2 + 0.5 * ph }); }   // pumping the bellows
        const c = (t % 12) / 12, [cx, cg, cz] = P(c < 0.5 ? lerpN(1.5, 6, c * 2) : lerpN(6, 1.5, (c - 0.5) * 2), 112); T.set(2, cx, cg, cz, ry + (c < 0.5 ? Math.PI : 0), { aR: -1.3, aL: -1.3, walk: 0.3 * Math.sin(t * 6) }); if (c < 0.5) F.glow(cx, cg + 1.0, cz + 0.6, 0.25);   // carrying the glowing crucible
        const [ax, ag, az] = P(6, 104); hammerer(T, 3, ax, ag, az, h, t, F); const [bx, bg, bz] = P(-6, 104); hammerer(T, 4, bx, bg, bz, h, t, F, 0.4); const [sx, sg, sz] = P(-4, 115); T.set(5, sx, sg, sz, h, { sit: true, aR: -1.0 + 0.2 * Math.sin(t * 2), aL: -1.0 });
        T.done(); F.end(); }; } },
  iron: { title: "An Iron Age smithy", text: "Iron is smelted in a bloomery and hammered into tools and weapons at the forge. (In Europe, Africa and Asia: iron came to North America only with Europeans.)", build: (K, g, P) => DAILY_ACT.smithy.build(K, g, P, true) },
  smithy: { title: "The blacksmith", text: "A smith hammers hot iron at the anvil; an apprentice works the bellows; horses wait to be shod.", build: (K, g, P, iron) => { const T = new Troop(g, 3), F = new FX(g); T.color(0, iron ? 0x6a5a3a : 0x3a3a3a, undefined, 0x3a3028); T.color(1, 0x8a6a4a); T.color(2, 0x5a4a3a);
      const [x, gy, z, ry] = P(0, 110); K.add("box", "wall", x - 2, gy, z, 2, 1.1, 1.6, ry, 0x7a7068); K.add("box", "lead", x + 1, gy, z, 0.5, 0.7, 0.4, ry, 0x2a2a2a); K.add("box", "lead", x + 1, gy + 0.7, z, 0.9, 0.25, 0.4, ry, 0x2a2a2a);
      K.add("box", "wood", x, gy + 3, z, 8, 0.2, 6, ry, 0x5a4a3a); for (const [a, b] of [[-3.6, -2.6], [3.6, -2.6], [-3.6, 2.6], [3.6, 2.6]]) K.add("box", "wood", x + a * Math.cos(ry) + b * Math.sin(ry), gy, z - a * Math.sin(ry) + b * Math.cos(ry), 0.2, 3, 0.2, 0);
      if (!iron) { const [hx, hg, hz, hr] = P(10, 112); animal(K, "horse", hx, hg, hz, hr, 1); }
      return t => { F.begin(); const h = ry - Math.PI / 2 * 0 + Math.PI / 2; F.glow(x - 2, gy + 1.15, z, 0.35 + 0.15 * Math.sin(t * 11)); for (let q = 0; q < 6; q++) { const a = (t * 0.8 + q * 0.7) % 4; F.smoke(x - 2, gy + 1.5 + a * 1.4, z, 0.3 + a * 0.35); }
        const [ax, ag, az] = P(1, 108.6); hammerer(T, 0, ax, ag, az, h, t, F); const [bx, bg, bz] = P(-3.4, 110); T.set(1, bx, bg, bz, ry, { aR: -1.0 + 0.6 * Math.sin(t * 4), aL: -1.0 + 0.6 * Math.sin(t * 4) }); const [cx, cg, cz] = P(8, 113); T.set(2, cx, cg, cz, ry + Math.PI, { aL: -0.4 }); T.done(); F.end(); }; } },
  plough: { title: "Ploughing", text: "A farmer ploughs behind a team of oxen; others sow and harrow.", build: (K, g, P) => { const T = new Troop(g, 3), F = new FX(g); for (let i = 0; i < 3; i++) T.color(i, [0x5a4a3a, 0xc8bca0, 0x3a4a6a][i], 0x6a5a3a);
      for (let k = 0; k < 10; k++) { const [x, gy, z, ry] = P(0, 95 + k * 4); K.add("box", "wall", x, gy - 0.1, z, 2.2, 0.25, 70, ry, 0x5a4430); }
      return t => { F.begin(); const ph = (t * 0.04) % 1, al = -34 + 68 * Math.abs(ph * 2 - 1), dz = 95 + Math.floor(t * 0.04 * 2) % 10 * 4, back = ph >= 0.5, [x, gy, z, ry] = P(al, dz), h = ry + (back ? 0 : Math.PI), [fx, fz] = fwdOf(h);
        for (const e of [-0.7, 0.7]) F.box(x + fx * 3.5 + Math.cos(h) * e, gy + 0.9, z + fz * 3.5 - Math.sin(h) * e, 0.8, 1.1, 2.1, h, 0, 0x7a5a3a);
        T.set(0, x, gy, z, h, { walk: 0.4 * Math.sin(t * 4), aR: -0.8, aL: -0.8, lean: 0.25 }); const [sx, sg, sz] = P(-al * 0.6, dz + 10); T.set(1, sx, sg, sz, h, { walk: 0.4 * Math.sin(t * 4 + 1), aR: -1.2 + 0.8 * Math.sin(t * 2), aL: -0.6 }); const [kx, kg, kz] = P(20, 88); T.set(2, kx, kg, kz, ry, {}); T.done(); F.end(); }; } },
  lenape: { title: "A Lenape village", text: "Women hoe the maize, beans and squash; men fish from dugout canoes on the river and smoke the catch; the people of this valley before Europeans came.", build: (K, g, P) => { const T = new Troop(g, 8), F = new FX(g); for (let i = 0; i < 8; i++) T.color(i, [0x8a6a4a, 0xa88a6a, 0x6a4a30][i % 3], 0x1a1410, 0x6a4a30, 0xa8784a);
      for (let k = 0; k < 40; k++) { const [x, gy, z] = P(-14 + (k % 8) * 3.5, 100 + ((k / 8) | 0) * 3.5); K.add("cyl", "leaf", x, gy, z, 0.3, 1.8, 0.3, 0, 0x5a8a2a); } const [lx, lg, lz, ry] = P(14, 120); longhouse(K, lx, lg, lz, ry, 18);
      const canoes = [new Kit(), new Kit()].map(C => { C.add("box", "wood", 0, 0, 0, 0.8, 0.5, 7, 0); const m = C.build(); g.add(m); return m; });
      return t => { F.begin(); const h = ry + Math.PI / 2; for (let i = 0; i < 4; i++) { const [x, gy, z] = P(-12 + i * 7, 102 + (i % 2) * 6); T.set(i, x, gy, z, h, { lean: 0.6, aR: -1.6 + 0.6 * Math.sin(t * 2.5 + i), aL: -1.6 + 0.6 * Math.sin(t * 2.5 + i), tool: 0.6, tl: 0.9 }); }
        const [fx, fg, fz] = P(8, 132); F.glow(fx, fg + 0.3, fz, 0.4 + 0.12 * Math.sin(t * 12)); for (let q = 0; q < 6; q++) { const a = (t * 0.6 + q * 0.7) % 5; F.smoke(fx, fg + 1 + a * 1.3, fz, 0.4 + a * 0.4); } const [px, pg, pz] = P(9.5, 133); T.set(4, px, pg, pz, ry, { sit: true, aR: -1.2 });
        canoes.forEach((cm, k) => { const a = ((t * 0.01 + k * 0.5) % 1), al = -200 + 400 * a, [x, , z, rr] = P(al, -205 - k * 30); cm.position.set(x, 0.1, z); cm.rotation.y = rr + Math.PI / 2 * 0; T.set(5 + k, x, -0.3, z, rr + Math.PI, { aR: -1.2 + 0.9 * Math.sin(t * 2 + k), aL: -1.2 + 0.9 * Math.sin(t * 2 + k), tool: 0.9, tl: 1.0 }); });
        const [wx, wg, wz] = P(-18, 125); T.set(7, wx, wg, wz, ry, { walk: 0 }); T.done(); F.end(); }; } },
  masons: { title: "Masons at work", text: "Masons dress stone and set it in the walls; a treadwheel crane, turned by men walking inside it, lifts the blocks. (Europe: the age of castles and cathedrals.)", build: (K, g, P) => { const T = new Troop(g, 6), F = new FX(g); for (let i = 0; i < 6; i++) T.color(i, [0x8a6a4a, 0x6a5a48, 0x9a3a2a][i % 3], 0xd8d0c0);
      const [wx, wg, wz, ry] = P(0, 128); K.add("box", "wall", wx, wg, wz, 26, 9, 2.4, ry + Math.PI / 2, 0xd8ccb0); scaffold(K, wx, wg, wz - 2, 26, 10, 2, ry);
      const wheel = new THREE.Group(); { const W = new Kit(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; W.add("box", "wood", 0, Math.sin(a) * 2.4, Math.cos(a) * 2.4, 2, 0.25, 1.3, 0, 0x6a4a2c); } wheel.add(W.build()); } const [cx, cg, cz] = P(-14, 118); wheel.position.set(cx, cg + 2.6, cz); wheel.rotation.y = ry + Math.PI / 2; g.add(wheel);
      K.add("box", "wood", cx, cg, cz + 3, 0.4, 12, 0.4, 0); return t => { F.begin(); wheel.children[0].rotation.x = t * 0.6; const [tx, tg, tz] = P(-14, 118); T.set(0, tx, tg + 0.3, tz, ry, { walk: 0.4 * Math.sin(t * 3) });
        const lift = (t * 0.4) % 10; F.box(cx, cg + 1 + lift, cz + 3, 1.2, 0.8, 1, ry, 0, 0xd8ccb0);
        for (let i = 1; i < 5; i++) { const [x, gy, z] = P(-8 + i * 4, 120); hammerer(T, i, x, gy, z, ry + Math.PI / 2, t, F, i * 0.25); F.box(x + 0, gy + 0.4, z + 0.9, 0.9, 0.8, 0.9, ry, 0, 0xd8ccb0); } const [ux, ug, uz] = P(6, 128); T.set(5, ux, ug + 9, uz - 1.2, ry + Math.PI / 2, { aR: -1.2, aL: -1.2 }); T.done(); F.end(); }; } },
  farm: { title: "The first farmers", text: "Early farmers hoe, sow and harvest wheat and barley, with mud-brick houses and penned sheep and goats. (First in the Near East, about 11,500 years ago; farming reached this valley much later.)", build: (K, g, P) => { const T = new Troop(g, 6), F = new FX(g); for (let i = 0; i < 6; i++) T.color(i, [0xc8b890, 0x8a6a4a, 0xa88a6a][i % 3], undefined, 0x8a6a48, 0xa8784a);
      for (const [a, b] of [[-14, 128], [-6, 132], [10, 130]]) { const [x, gy, z, ry] = P(a, b); K.add("box", "wall", x, gy, z, 5, 2.6, 5, ry, 0xb89a72); K.add("box", "wall", x, gy + 2.6, z, 5.2, 0.3, 5.2, ry, 0x8a7a5a); } for (let k = 0; k < 6; k++) { const [x, gy, z, ry] = P(-14 + k * 6, 112); animal(K, k % 2 ? "deer" : "cow", x, gy, z, ry, 0.5); }
      return t => { F.begin(); for (let i = 0; i < 5; i++) { const [x, gy, z, ry] = P(-16 + i * 7, 98 + (i % 2) * 4), h = ry + Math.PI / 2; if (i === 4) T.set(i, x, gy, z, h, { walk: 0.3 * Math.sin(t * 2), aR: -1.0 + 0.9 * Math.sin(t * 1.5), aL: -0.6 }); else T.set(i, x, gy, z, h, { lean: 0.55, aR: -1.6 + 0.7 * Math.sin(t * 2.2 + i), aL: -1.6 + 0.7 * Math.sin(t * 2.2 + i), tool: 0.7, tl: 0.8 }); }
        const [x, gy, z, ry] = P(2, 125); T.set(5, x, gy, z, ry, { sit: true, aR: -1.0 + 0.4 * Math.sin(t * 3), aL: -1.0 + 0.4 * Math.sin(t * 3) }); T.done(); F.end(); }; } },
  hunt: { title: "The hunt", text: "Clovis hunters close in on a mastodon with spears tipped with fluted stone points: this valley, about 13,000 years ago.", build: (K, g, P) => { const T = new Troop(g, 6), F = new FX(g); for (let i = 0; i < 6; i++) T.color(i, 0x8a6a4a, 0x5a3a24, 0x6a4a30, 0xa8784a);
      const [mx, mg, mz, ry] = P(0, 115); animal(K, "mastodon", mx, mg, mz, ry + 0.6, 1.1); return t => { F.begin(); for (let i = 0; i < 6; i++) { const a = t * 0.12 + i * 1.05, r = 12 + 2 * Math.sin(t * 0.5 + i), x = mx + Math.cos(a) * r, z = mz + Math.sin(a) * r, gy = mg, h = Math.atan2(mx - x, mz - z), ph = (t + i * 1.3) % 8;
        T.set(i, x, gy, z, h, { walk: 0.5 * Math.sin(t * 5 + i), aR: ph < 1.2 ? -2.8 : -1.2, aL: -0.7, tool: ph < 1.2 ? -0.2 : -0.6, tl: 1.7 }); if (ph > 1.2 && ph < 2.4) arc(F, x, z, mx, mz, gy, (ph - 1.2) / 1.2, 3, 0x6a4a2c, 2.2); } T.done(); F.end(); }; } },
  camp: { title: "A hunters' camp", text: "People sit round the fire; one knaps a stone tool, striking flakes from a core. (Stone tools are more than 3 million years old; fire has been controlled for perhaps a million.)", build: (K, g, P) => { const T = new Troop(g, 5), F = new FX(g); for (let i = 0; i < 5; i++) T.color(i, 0x8a6a4a, 0x2a1a10, 0x6a4a30, 0x9a6a48); const [fx, fg, fz, ry] = P(0, 112); K.add("cone", "hide", fx + 8, fg, fz + 6, 4, 3.4, 4, 0, 0xa88a6a);
      return t => { F.begin(); F.glow(fx, fg + 0.35, fz, 0.5 + 0.15 * Math.sin(t * 13)); for (let q = 0; q < 8; q++) { const a = (t * 0.7 + q * 0.6) % 5; F.smoke(fx + a * 0.3, fg + 1 + a * 1.3, fz, 0.4 + a * 0.4); }
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, x = fx + Math.cos(a) * 2.2, z = fz + Math.sin(a) * 2.2; T.set(i, x, fg, z, Math.atan2(fx - x, fz - z), { sit: true, aR: -1.1 + (i === 0 ? 0.6 * Math.sin(t * 7) : 0), aL: -1.1, hat: false }); if (i === 0 && Math.sin(t * 7) > 0.95) F.flash(x + (fx - x) * 0.3, fg + 0.6, z + (fz - z) * 0.3, 0.05); }
        T.set(4, fx + 6, fg, fz - 4, ry, { walk: 0.3 * Math.sin(t * 4), aR: -0.3 }); T.done(); F.end(); }; } } };
for (const k in DAILY_ACT) { const A = DAILY_ACT[k], b = A.build; A.label = true; }
const DAILY = [[1830, 1900, ["plough"]], [1650, 1830, ["smithy", "plough"]], [1300, 1650, ["lenape"]], [500, 1300, ["lenape", "masons"]], [-500, 500, ["masons", "lenape"]], [-1200, -500, ["iron"]], [-3300, -1200, ["bronze"]],
  [-9500, -3300, ["farm"]], [NOW - 13300, -9500, ["hunt", "camp"]], [NOW - 300000, NOW - 13300, ["camp"]]];
const ACTS = [[1969, { title: "Apollo 11 launches", text: "The Saturn V lifts off, carrying three astronauts toward the Moon." }, launch], [1944, { title: "The Second World War", text: "Infantry, tanks and aircraft (shown as a generic battle of 1944, the year of D-Day)." }, battle({ colA: 0x5a6a3a, hatA: 0x4a5a32, legA: 0x5a6a3a, colB: 0x6a6a68, hatB: 0x5a5a5a, legB: 0x5a5a58, tanks: true, planes: true, cannon: true, kneel: true })],
  [1916, { title: "The First World War", text: "Trench warfare and artillery (shown as 1916, the year of the Somme and Verdun)." }, battle({ colA: 0x8a7a54, hatA: 0x6a6a50, legA: 0x8a7a54, colB: 0x6a6e66, hatB: 0x5a5e58, legB: 0x6a6e66, trench: true, cannon: true })],
  [1863, { title: "The Civil War", text: "Union and Confederate lines fire volleys, cannon behind them (shown as 1863, the year of Gettysburg)." }, battle({ colA: 0x2a3a6a, hatA: 0x2a3a6a, legA: 0x6a7a9a, colB: 0x8a8a8a, hatB: 0x7a7a7a, legB: 0x8a8a8a, cannon: true, kneel: true })],
  [1777, { title: "The Battles of Saratoga", text: "Up this very river: American troops defeat a British army, the turning point of the Revolution." }, battle({ colA: 0x3a4a7a, hatA: 0x1a1a1a, legA: 0xe8e0d0, colB: 0xb8282a, hatB: 0x1a1a1a, legB: 0xe8e0d0, cannon: true })],
  [1903, { title: "The first powered flight", text: "The Wright Flyer hops into the air at Kitty Hawk: 12 seconds, 37 m." }, wright], [1807, { title: "The Clermont", text: "Fulton's steamboat churns up the Hudson to Albany in 32 hours." }, clermont],
  [1066, { title: "The Battle of Hastings", text: "Norman knights and archers attack the Saxon shield wall; William the Conqueror wins England." }, hastings], [-51, { title: "A Roman legion", text: "Legionaries advance behind their shields and hurl javelins (shown as 52 BCE, Caesar's siege of Alesia)." }, legion],
  [-2578, { title: "Building the Great Pyramid", text: "Teams drag limestone blocks on wooden sledges, wetting the sand to ease the way." }, pyramidTeam]];
EVENTS.push([1777, "The Battles of Saratoga, on the Hudson: the turning point of the Revolution."], [1944, "D-Day: the Allied landings in Normandy."], [1916, "The Battles of the Somme and Verdun."], [1863, "The Battle of Gettysburg."], [-51, "Caesar besieges Alesia (52 BCE)."]);
SC[1969] = (K, P, y) => { crowd(K, P, 0, 40, 40, 20, y, 0); flag(K, P, -15, 35, [0xb8382a, 0xf0f0f0, 0xb8382a, 0xf0f0f0, 0x2a3a6a]); };   // the rocket itself now launches (below)
SC[1807] = (K, P, y) => crowd(K, P, 0, -150, 30, 18, y);
const LIVE = new Map();
function actList(xT) { const out = [];
  for (const [yr, lab, build] of ACTS) { const ex = xOfYear(yr); if (ex - xT > -900 && ex - xT < 1800) out.push(["E" + yr, ex, build, lab]); }
  for (let k = Math.floor((xT - 900) / 600); k <= Math.floor((xT + 1800) / 600); k++) { const x = k * 600 + 300, y = yearAt(x), D = DAILY.find(d => y >= d[0] && y < d[1]); if (!D || iceThick(y) > 30 || x < 0) continue;
    if (ACTS.some(A => Math.abs(xOfYear(A[0]) - x) < 260)) continue; const kind = D[2][Math.floor(hash(k, 7) * D[2].length)], A = DAILY_ACT[kind]; out.push(["D" + k, x, A.build, A]); }
  return out; }
function updateActs(xT, t) { const want = actList(xT), keys = new Set(want.map(w => w[0]));
  for (const [k, L] of LIVE) if (!keys.has(k)) { unanchor(L.g); L.g.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.material?.map) o.material.map.dispose(); }); LIVE.delete(k); }
  let built = 0; for (const [k, ex, build, lab] of want) { if (LIVE.has(k) || built >= 1) continue; built++; const g = new THREE.Group(), K = new Kit(), y = yearAt(ex);
    const P = (along, dz0) => { const dz = dz0 >= 0 ? dz0 - 50 : dz0, x = ex + along, z = trackZ(x) + dz;   // (scenes brought 50 m nearer the line)
 return [along, dz < -RIVER0 ? 0 : Math.max(terrainH(x, z), 0.2), z, trackH(x)]; };
    const upd = build(K, g, P, y); g.add(K.build()); plaque(g, P, lab.title, lab.text); LIVE.set(k, { g: anchor(g, ex, 0, 0), upd, ex }); }
  for (const L of LIVE.values()) if (Math.abs(L.ex - xT) < 1600) L.upd(t); }

// ---------- timelines: lanes on the river side of the line, a band for each life, country and species, from its start year to its end ----------
// Years are calendar years (negative = BCE, astronomically: -43 is 44 BCE); species are given in years before present. Dates are the usual
// published ones; "c." ones are approximate. Lanes are assigned so overlapping bands sit side by side.
const B_ = bp => NOW - bp;
const TL = { people: { col: 0xe8b83a, css: "#e8b83a", dz0: -26, items: [
  ["Barack Obama", 1961, NOW], ["Neil Armstrong", 1930, 2012], ["Rosa Parks", 1913, 2005], ["Martin Luther King Jr.", 1929, 1968], ["Albert Einstein", 1879, 1955], ["Marie Curie", 1867, 1934], ["Franklin D. Roosevelt", 1882, 1945],
  ["Harriet Tubman", 1822, 1913], ["Sitting Bull", 1831, 1890], ["Frederick Douglass", 1818, 1895], ["Abraham Lincoln", 1809, 1865], ["Charles Darwin", 1809, 1882], ["Ada Lovelace", 1815, 1852], ["Queen Victoria", 1819, 1901],
  ["Napoleon Bonaparte", 1769, 1821], ["Wolfgang Amadeus Mozart", 1756, 1791], ["George Washington", 1732, 1799], ["Benjamin Franklin", 1706, 1790], ["Tamanend (Lenape chief)", 1625, 1701], ["Isaac Newton", 1643, 1727],
  ["Pocahontas", 1596, 1617], ["Henry Hudson", 1565, 1611], ["Galileo Galilei", 1564, 1642], ["William Shakespeare", 1564, 1616], ["Elizabeth I", 1533, 1603], ["Leonardo da Vinci", 1452, 1519], ["Christopher Columbus", 1451, 1506],
  ["Joan of Arc", 1412, 1431], ["Dante Alighieri", 1265, 1321], ["Genghis Khan", 1162, 1227], ["Charlemagne", 742, 814], ["Muhammad", 570, 632], ["Constantine the Great", 272, 337], ["Jesus of Nazareth (c.)", -3, 30],
  ["Cleopatra VII", -68, -29], ["Julius Caesar", -99, -43], ["Alexander the Great", -355, -322], ["Aristotle", -383, -321], ["Socrates", -469, -398], ["Confucius", -550, -478], ["The Buddha (c.)", -562, -482],
  ["Ramesses II (c.)", -1302, -1212], ["Tutankhamun (c.)", -1340, -1322], ["Hammurabi (c.)", -1809, -1749], ["Ötzi the Iceman (c.)", -3344, -3299]] },
  countries: { col: 0x4a8ad8, css: "#6aa8f0", dz0: -66, items: [
  ["United States", 1776, NOW], ["New York State", 1788, NOW], ["Province of New York (British)", 1664, 1776], ["New Netherland (Dutch)", 1614, 1664], ["Haudenosaunee Confederacy (c.)", 1450, NOW], ["Soviet Union", 1922, 1991],
  ["United Kingdom", 1707, NOW], ["Kingdom of England", 927, 1707], ["Qing dynasty", 1644, 1912], ["Ming dynasty", 1368, 1644], ["Mughal Empire", 1526, 1857], ["Ottoman Empire", 1299, 1922], ["Aztec Empire", 1428, 1521], ["Inca Empire", 1438, 1533],
  ["Mali Empire", 1235, 1670], ["Mongol Empire", 1206, 1368], ["Cahokia (city, c.)", 1050, 1350], ["Great Zimbabwe (c.)", 1100, 1450], ["Holy Roman Empire", 962, 1806], ["Byzantine Empire", 330, 1453], ["Abbasid Caliphate", 750, 1258],
  ["Tang dynasty", 618, 907], ["Classic Maya (c.)", 250, 900], ["Roman Empire (West)", -26, 476], ["Roman Republic", -508, -26], ["Han dynasty", -201, 220], ["Achaemenid Persian Empire", -549, -329], ["Akkadian Empire (c.)", -2333, -2153],
  ["Ancient Egypt, dynastic (c.)", -3099, -29]] },
  species: { col: 0x4ab85a, css: "#6ad87a", dz0: -106, items: [
  ["Homo sapiens (us)", B_(300000), NOW], ["Dogs, domesticated (c.)", B_(15000), NOW], ["Maize, domesticated (c.)", B_(9000), NOW], ["Neanderthals", B_(400000), B_(40000)], ["Denisovans (c.)", B_(300000), B_(30000)],
  ["Homo erectus", B_(1.9e6), B_(110000)], ["Woolly mammoth", B_(800000), B_(4000)], ["American mastodon", B_(3.5e6), B_(10500)], ["Smilodon (sabre-tooth)", B_(2.5e6), B_(10000)], ["Dire wolf", B_(250000), B_(13000)],
  ["Giant beaver", B_(1.4e6), B_(10000)], ["Gigantopithecus", B_(2e6), B_(300000)], ["Homo habilis", B_(2.4e6), B_(1.4e6)], ["Paranthropus", B_(2.7e6), B_(1.2e6)], ["Australopithecus afarensis", B_(3.9e6), B_(2.9e6)],
  ["Megalodon", B_(23e6), B_(3.6e6)], ["Tyrannosaurus rex", B_(68e6), B_(66e6)], ["Triceratops", B_(68e6), B_(66e6)]] } };
const fmtRange = (a, b) => { const ongoing = b >= NOW - 0.5, ba = BP(a); if (ba >= 10000) { const f = v => v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)} million` : `${Math.round(v / 1000).toLocaleString()},000`; return ongoing ? `${f(ba)} years ago – now` : `${f(ba)} – ${f(BP(b))} years ago`; }
  const y = v => Math.round(v) > 0 ? String(Math.round(v)) : `${1 - Math.round(v)} BCE`; return ongoing ? `${y(a)} – now` : `${y(a)} – ${y(b)}`; };
for (const k in TL) { const lanes = []; TL[k].items.sort((p, q) => q[2] - p[2]).forEach(it => { const x0 = xOfYear(it[2]), x1 = xOfYear(it[1]); let L = lanes.findIndex(e => e < x0 - 60); if (L < 0) { L = lanes.length; lanes.push(0); } lanes[L] = x1; it.lane = L; it.x0 = x0; it.x1 = x1; }); TL[k].nl = lanes.length; }
const TLIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), 7000); TLIM.count = 0; TLIM.frustumCulled = false; WORLD.add(TLIM);
const TLAB = []; for (let k = 0; k < 40; k++) { const c = document.createElement("canvas"); c.width = 768; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -0.6; const g = new THREE.Group(); g.add(m); WORLD.add(g); TLAB.push({ g, c, t, key: null, prop: null }); }
function updateTimelines(xT) { const lo = xT - 700, hi = xT + 1400; let n = 0; const want = [];
  for (const k in TL) { const G = TL[k], laneW = Math.min(4.5, 36 / Math.max(1, G.nl)); _lc.setHex(G.col);
    for (const it of G.items) { if (it.x1 < lo || it.x0 > hi) continue; const dz = G.dz0 - it.lane * laneW, a = Math.max(it.x0, lo), b = Math.min(it.x1, hi);
      for (let x = a; x < b && n < 7000; x += 8) { const len = Math.min(8, b - x), xm = x + len / 2, z = trackZ(xm) + dz, h = terrainH(xm, z); if (h < 0.3) continue;
        O3.position.set(xm - ORIGIN.x, h + 0.06, z - ORIGIN.z); O3.rotation.set(0, trackH(xm), 0); O3.scale.set(laneW * 0.8, 0.07, len + 0.2); O3.updateMatrix(); TLIM.setMatrixAt(n, O3.matrix); TLIM.setColorAt(n, _lc); n++; }
      const first = Math.max(it.x0 + 6, lo), step = 160; for (let x = it.x0 + 6 + Math.ceil((first - it.x0 - 6) / step) * step; x < Math.min(it.x1, hi); x += step) want.push({ key: it[0] + "@" + Math.round(x), x, dz, it, G });
      if (it.x1 - it.x0 < 160 && it.x0 > lo && it.x0 < hi) want.push({ key: it[0] + "@s", x: (it.x0 + it.x1) / 2, dz, it, G }); } }
  TLIM.count = n; TLIM.instanceMatrix.needsUpdate = true; if (TLIM.instanceColor) TLIM.instanceColor.needsUpdate = true;
  want.sort((p, q) => Math.abs(p.x - xT) - Math.abs(q.x - xT)); const keep = new Set(want.slice(0, TLAB.length).map(w => w.key));
  for (const L of TLAB) if (L.key && !keep.has(L.key)) { L.key = null; if (L.prop) { WORLD.remove(L.prop); L.prop.traverse(o => o.isInstancedMesh && o.dispose()); L.prop = null; } }
  for (const w of want.slice(0, TLAB.length)) { let L = TLAB.find(L => L.key === w.key); if (!L) { L = TLAB.find(L => !L.key); if (!L) continue; L.key = w.key; const g = L.c.getContext("2d"); g.clearRect(0, 0, 768, 128);
      g.font = "700 48px Helvetica, Arial, sans-serif"; g.lineWidth = 8; g.strokeStyle = "rgba(0,0,0,.45)"; const s1 = w.it[0], s2 = fmtRange(w.it[1], w.it[2]); g.strokeText(s1, 12, 54); g.fillStyle = w.G.css; g.fillText(s1, 12, 54);
      g.font = "600 36px Helvetica, Arial, sans-serif"; g.strokeText(s2, 12, 108); g.fillStyle = "#ffffff"; g.fillText(s2, 12, 108); L.t.needsUpdate = true;
      const K = new Kit(); lanePropFor(w, K); L.prop = K.build(); WORLD.add(L.prop); }
    const z = trackZ(w.x) + w.dz + 1.5, h = Math.max(terrainH(w.x, z), 0.2); L.g.position.set(w.x - ORIGIN.x, h + 1.8, z - ORIGIN.z); L.g.rotation.y = trackH(w.x) + Math.PI / 2; if (L.prop) { const px = w.x + 8, pz = trackZ(px) + w.dz; L.prop.position.set(px - ORIGIN.x, Math.max(terrainH(px, pz), 0.2), pz - ORIGIN.z); } }
  for (const L of TLAB) L.g.visible = !!L.key; }
EVENTS.push([1681, "The last dodos die on Mauritius."], [1768, "The last Steller's sea cows are killed."], [1914, "Martha, the last passenger pigeon, dies; billions once flew over this valley."], [1936, "The last thylacine (Tasmanian tiger) dies."]);

// ---------- leaders: an upright board on each country's lane at the year each leader took power ----------
const LEADERS = {
  "United States": [[1789, "George Washington"], [1797, "John Adams"], [1801, "Thomas Jefferson"], [1809, "James Madison"], [1817, "James Monroe"], [1825, "John Quincy Adams"], [1829, "Andrew Jackson"], [1837, "Martin Van Buren"], [1841, "William Henry Harrison"], [1841.5, "John Tyler"],
    [1845, "James K. Polk"], [1849, "Zachary Taylor"], [1850, "Millard Fillmore"], [1853, "Franklin Pierce"], [1857, "James Buchanan"], [1861, "Abraham Lincoln"], [1865, "Andrew Johnson"], [1869, "Ulysses S. Grant"], [1877, "Rutherford B. Hayes"], [1881, "James A. Garfield"], [1881.5, "Chester A. Arthur"],
    [1885, "Grover Cleveland"], [1889, "Benjamin Harrison"], [1893, "Grover Cleveland"], [1897, "William McKinley"], [1901, "Theodore Roosevelt"], [1909, "William Howard Taft"], [1913, "Woodrow Wilson"], [1921, "Warren G. Harding"], [1923, "Calvin Coolidge"], [1929, "Herbert Hoover"],
    [1933, "Franklin D. Roosevelt"], [1945, "Harry S. Truman"], [1953, "Dwight D. Eisenhower"], [1961, "John F. Kennedy"], [1963, "Lyndon B. Johnson"], [1969, "Richard Nixon"], [1974, "Gerald Ford"], [1977, "Jimmy Carter"], [1981, "Ronald Reagan"], [1989, "George H. W. Bush"],
    [1993, "Bill Clinton"], [2001, "George W. Bush"], [2009, "Barack Obama"], [2017, "Donald Trump"], [2021, "Joe Biden"], [2025, "Donald Trump"]],
  "United Kingdom": [[1707, "Queen Anne"], [1714, "George I"], [1727, "George II"], [1760, "George III"], [1820, "George IV"], [1830, "William IV"], [1837, "Queen Victoria"], [1901, "Edward VII"], [1910, "George V"], [1936, "Edward VIII"], [1936.5, "George VI"], [1952, "Elizabeth II"], [2022, "Charles III"]],
  "Kingdom of England": [[927, "Æthelstan"], [1016, "Cnut the Great"], [1042, "Edward the Confessor"], [1066, "William I (the Conqueror)"], [1087, "William II"], [1100, "Henry I"], [1135, "Stephen"], [1154, "Henry II"], [1189, "Richard I (the Lionheart)"], [1199, "John"], [1216, "Henry III"],
    [1272, "Edward I"], [1307, "Edward II"], [1327, "Edward III"], [1377, "Richard II"], [1399, "Henry IV"], [1413, "Henry V"], [1422, "Henry VI"], [1461, "Edward IV"], [1483, "Richard III"], [1485, "Henry VII"], [1509, "Henry VIII"], [1547, "Edward VI"], [1553, "Mary I"],
    [1558, "Elizabeth I"], [1603, "James I"], [1625, "Charles I"], [1653, "Oliver Cromwell (Lord Protector)"], [1660, "Charles II"], [1685, "James II"], [1689, "William III and Mary II"], [1702, "Queen Anne"]],
  "New Netherland (Dutch)": [[1626, "Peter Minuit (director)"], [1647, "Peter Stuyvesant (director-general)"]],
  "Soviet Union": [[1922, "Vladimir Lenin"], [1924, "Joseph Stalin"], [1953, "Nikita Khrushchev"], [1964, "Leonid Brezhnev"], [1982, "Yuri Andropov"], [1984, "Konstantin Chernenko"], [1985, "Mikhail Gorbachev"]],
  "Qing dynasty": [[1644, "Shunzhi Emperor"], [1661, "Kangxi Emperor"], [1722, "Yongzheng Emperor"], [1735, "Qianlong Emperor"], [1796, "Jiaqing Emperor"], [1850, "Xianfeng Emperor"], [1861, "Empress Dowager Cixi (regent)"], [1908, "Puyi"]],
  "Ming dynasty": [[1368, "Hongwu Emperor"], [1402, "Yongle Emperor"], [1435, "Zhengtong Emperor"], [1572, "Wanli Emperor"], [1627, "Chongzhen Emperor"]],
  "Mughal Empire": [[1526, "Babur"], [1530, "Humayun"], [1556, "Akbar the Great"], [1605, "Jahangir"], [1628, "Shah Jahan"], [1658, "Aurangzeb"], [1707, "Bahadur Shah I"], [1837, "Bahadur Shah II"]],
  "Ottoman Empire": [[1299, "Osman I"], [1326, "Orhan"], [1451, "Mehmed II (the Conqueror)"], [1512, "Selim I"], [1520, "Suleiman the Magnificent"], [1566, "Selim II"], [1623, "Murad IV"], [1808, "Mahmud II"], [1876, "Abdul Hamid II"], [1918, "Mehmed VI"]],
  "Aztec Empire": [[1428, "Itzcoatl"], [1440, "Moctezuma I"], [1486, "Ahuitzotl"], [1502, "Moctezuma II"]], "Inca Empire": [[1438, "Pachacuti"], [1471, "Topa Inca"], [1493, "Huayna Capac"], [1532, "Atahualpa"]],
  "Mali Empire": [[1235, "Sundiata Keita"], [1312, "Mansa Musa"], [1341, "Mansa Suleyman"]], "Mongol Empire": [[1206, "Genghis Khan"], [1229, "Ögedei Khan"], [1251, "Möngke Khan"], [1260, "Kublai Khan"]],
  "Holy Roman Empire": [[962, "Otto I"], [1155, "Frederick I Barbarossa"], [1220, "Frederick II"], [1273, "Rudolf I"], [1519, "Charles V"], [1740, "Maria Theresa (with Francis I)"], [1792, "Francis II"]],
  "Byzantine Empire": [[330, "Constantine the Great"], [527, "Justinian I"], [610, "Heraclius"], [976, "Basil II"], [1081, "Alexios I Komnenos"], [1449, "Constantine XI"]], "Abbasid Caliphate": [[750, "al-Saffah"], [786, "Harun al-Rashid"], [813, "al-Ma'mun"]],
  "Tang dynasty": [[618, "Emperor Gaozu"], [626, "Emperor Taizong"], [690, "Empress Wu Zetian"], [712, "Emperor Xuanzong"]],
  "Roman Empire (West)": [[-26, "Augustus"], [14, "Tiberius"], [37, "Caligula"], [41, "Claudius"], [54, "Nero"], [69, "Vespasian"], [79, "Titus"], [81, "Domitian"], [98, "Trajan"], [117, "Hadrian"], [138, "Antoninus Pius"], [161, "Marcus Aurelius"], [180, "Commodus"],
    [193, "Septimius Severus"], [284, "Diocletian"], [306, "Constantine the Great"], [379, "Theodosius I"], [475, "Romulus Augustulus"]],
  "Roman Republic": [[-508, "the first consuls"], [-81, "Sulla (dictator)"], [-48, "Julius Caesar (dictator)"], [-43, "the Second Triumvirate"]], "Han dynasty": [[-201, "Emperor Gaozu"], [-140, "Emperor Wu"], [25, "Emperor Guangwu"]],
  "Achaemenid Persian Empire": [[-549, "Cyrus the Great"], [-529, "Cambyses II"], [-521, "Darius I"], [-485, "Xerxes I"], [-335, "Darius III"]], "Akkadian Empire (c.)": [[-2333, "Sargon of Akkad"], [-2253, "Naram-Sin"]],
  "Ancient Egypt, dynastic (c.)": [[-3099, "Narmer"], [-2588, "Khufu"], [-1478, "Hatshepsut"], [-1457, "Thutmose III"], [-1352, "Akhenaten"], [-1332, "Tutankhamun"], [-1278, "Ramesses II"], [-50, "Cleopatra VII"]] };
const LEAD = []; for (const [cn, L] of Object.entries(LEADERS)) { const it = TL.countries.items.find(i => i[0] === cn); if (!it) continue; L.forEach(([y, nm], k) => LEAD.push({ cn, nm, y0: y, y1: k + 1 < L.length ? L[k + 1][0] : it[2], it })); }
const LBOARDS = []; for (let k = 0; k < 10; k++) { const c = document.createElement("canvas"); c.width = 640; c.height = 220; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.9), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); b.position.y = 4.6; g.add(b); const bk = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.9), M(0x2a3a5a)); bk.rotation.y = Math.PI; bk.position.y = 4.6; g.add(bk);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.2).translate(0, 1.6, 0), M(0x4a4a4a)); g.add(p); g.scale.setScalar(1.7); WORLD.add(g); LBOARDS.push({ g, c, t, L: null }); }
const fy = v => { const r = Math.floor(v); return r > 0 ? String(r) : `${1 - r} BCE`; };
function updateLeaders(xT) { const near = LEAD.filter(L => { const x = xOfYear(L.y0); return x > xT - 700 && x < xT + 1500; }).sort((a, b) => Math.abs(xOfYear(a.y0) - xT) - Math.abs(xOfYear(b.y0) - xT)).slice(0, LBOARDS.length);
  for (const B of LBOARDS) if (B.L && !near.includes(B.L)) B.L = null;
  for (const L of near) { if (LBOARDS.some(B => B.L === L)) continue; const B = LBOARDS.find(B => !B.L); if (!B) break; B.L = L; const g = B.c.getContext("2d"); g.fillStyle = "#16284a"; g.fillRect(0, 0, 640, 220); g.strokeStyle = "#d8b84a"; g.lineWidth = 8; g.strokeRect(4, 4, 632, 212);
    g.fillStyle = "#ffe08a"; let fs = 54; do { g.font = `700 ${fs}px Georgia, serif`; } while (g.measureText("👑 " + L.nm).width > 600 && --fs > 24); g.fillText("👑 " + L.nm, 22, 80);
    g.fillStyle = "#e8eef8"; g.font = "32px Georgia, serif"; g.fillText(L.cn.replace(/ \(c\.\)/, ""), 22, 136); g.fillStyle = "#9ab8e8"; g.fillText(`${fy(L.y0)} – ${L.y1 >= NOW ? "now" : fy(L.y1)}`, 22, 186); B.t.needsUpdate = true; }
  const laneW = Math.min(4.5, 36 / Math.max(1, TL.countries.nl));
  for (const B of LBOARDS) { B.g.visible = !!B.L; if (!B.L) continue; const x = xOfYear(B.L.y0) - 3, z = trackZ(x) + TL.countries.dz0 - B.L.it.lane * laneW + 3, h = Math.max(terrainH(x, z), 0.2); B.g.position.set(x - ORIGIN.x, h, z - ORIGIN.z); B.g.rotation.y = trackH(x) + Math.PI / 2; } }   // facing the line from the river side

// ---------- the journey ----------
// A year passes every second, so days and seasons would flicker past 365 times a second: the light is held at a summer afternoon.
let trainX = 0, started = false, running = true, sleeping = false;
const keys = {}; let yaw = Math.PI / 2 - 0.15, pitch = -0.02, dragging = false;
const P_ = { x: 1.0, z: carZ(3) + 3 };
const intro = document.getElementById("intro");
// posture for VR, chosen on the start card: sitting lifts your view to a standing eye height (remembered)
let SITTING = localStorage.getItem("vrPosture") === "sitting";
{ const card = intro?.querySelector(".card"), row = document.createElement("p"); row.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => row.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #1d4e66;" + ((b.dataset.p === "sitting") === SITTING ? "background:#1d4e66;color:#fff" : "background:#fff;color:#1d4e66"); });
  row.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(row, card.lastElementChild); }
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(12,22,32,.78);color:#e8eef4;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:640px";
const BIG = document.createElement("div"); BIG.style.cssText = "position:fixed;right:18px;top:12px;z-index:2;background:rgba(12,22,32,.78);color:#f0d890;padding:8px 16px;border-radius:10px;font:700 34px/1.1 Helvetica,Arial,sans-serif;text-align:right";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(12,22,32,.88);color:#e8eef4;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:780px;display:none";
const FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 1.2s;z-index:5";
document.body.append(HUD, BIG, MSG, FADE);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 14) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone");
  say("All aboard. The train is leaving the present: every second is a year further back, a line across the ground at every year (numbers every 5 years, a big sign every 10), and scenes of the events at their years. You are in the lounge car; the itinerary is on the front wall of every car. Walk through the train; the observation car is at the back. N jumps ahead to the next stop; E in a roomette berth sleeps eight hours (28,800 years).", 22); }
function jumpTo(x) { linesAt = null; trainX = x; const T = trackXZ(trainX); recentre(T.x, T.z); for (const L of LEVELS) L.ox = NaN; updateGround(T.x, T.z, 99); }
const trackXZ = x => ({ x, z: trackZ(x) });
function nextStop() { return STOPS.find(([yr]) => (xOfYear(yr) - trainX) / V > 20); }
function goSleep() { if (sleeping) return; sleeping = true; FADE.style.opacity = 1; setTimeout(() => { jumpTo(trainX + 8 * 3600 * V); FADE.style.opacity = 0; sleeping = false; say(`You slept eight hours, and wake 28,800 years earlier: ${fmtYear(yearAt(trainX))}.`, 10); }, 1400); }
function interact() { if (!started) return start(); for (const b of BEDS) if (Math.hypot(P_.x - b.x, P_.z - b.z) < 1.4) { goSleep(); return; }
  const n = nextStop(); say(n ? `Next stop: <b>${n[1]}</b> (${fmtYear(n[0])}), in ${fmtWait((xOfYear(n[0]) - trainX) / V)} at a year a second.` : "We have reached the end of the line.", 10); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyE") interact(); if (e.code === "KeyN") { const n = nextStop(); if (n) { jumpTo(xOfYear(n[0]) - 25 * V); say(`Jumping ahead: arriving at <b>${n[1]}</b> in 25 seconds.`, 8); } } if (e.code === "KeyP") running = !running; });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(head, txt) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); g.fillStyle = "rgba(12,22,32,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  g.fillStyle = "#f0d890"; g.font = "700 40px Helvetica, sans-serif"; g.fillText(head, 26, 54); g.fillStyle = "#e8eef4"; g.font = "26px -apple-system, Helvetica, sans-serif"; const words = (txt || "").replace(/<[^>]+>/g, "").split(" "); let ln = "", y = 100, n = 0;
  for (const w of words) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += 32; ln = ""; if (++n >= 7) break; } ln += w + " "; } g.fillText(ln, 26, y); vrT.needsUpdate = true; }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; vrDirty = true; s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); vrPanel.visible = false; }); }; });
// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, itTm = 0, loopErrs = 0, lastEv = null;
{ recentre(0, trackZ(0)); updateGround(0, trackZ(0), 99); }
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started && running && !sleeping) trainX += V * dt;                                // exactly one year per second
  const tz = trackZ(trainX); if (Math.hypot(trainX - ORIGIN.x, tz - ORIGIN.z) > 1500) { recentre(trainX, tz); linesAt = null; }
  TRAIN.position.set(trainX - ORIGIN.x, trackE(trainX) + 0.5, tz - ORIGIN.z); TRAIN.rotation.set(0, trackH(trainX), 0); TRAIN.rotateX(Math.atan2(trackE(trainX + 40) - trackE(trainX - 40), 80) * 0.5);
  let mx = 0, my = 0, run = 1;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 5)) { const n = nextStop(); if (n) { jumpTo(xOfYear(n[0]) - 25 * V); say(`Jumping ahead: arriving at <b>${n[1]}</b> in 25 seconds.`, 8); } } }
      else { if (tap("R", gp, 4)) interact(); if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyAxisAngle(UP, vrTurn); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ShiftLeft) run = 1.8;
    if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.set(-fwd.z, 0, fwd.x);
  if (mx || my) { const sp = 1.3 * run * dt, nx = P_.x + (fwd.x * -my + side.x * mx) * sp, nz = P_.z + (fwd.z * -my + side.z * mx) * sp; if (walkable(nx, nz)) { P_.x = nx; P_.z = nz; } else if (walkable(nx, P_.z)) P_.x = nx; else if (walkable(P_.x, nz)) P_.z = nz; }
  rig.position.set(P_.x, vr && SITTING ? 0.45 : 0, P_.z);
  updateGround(trainX, tz); streamTiles(trainX); updateSigns(trainX); updateBoards(trainX); updateLines(trainX); updateScenes(trainX); updateInventions(trainX); updateArch(trainX); updateActs(trainX, t); updateLeaders(trainX);
  // a summer afternoon's light; the sky a little colder in the ice ages
  const S = sunDir(15.5, 42), ice = iceThick(yearAt(trainX)) / 1100; sun.position.copy(S.v).multiplyScalar(800); sun.intensity = 2.4; hemi.intensity = 1.05;
  const upC = new THREE.Color(0.32, 0.52, 0.84).lerp(new THREE.Color(0.55, 0.65, 0.8), ice * 0.4), hor = new THREE.Color(0.80, 0.85, 0.88).lerp(new THREE.Color(0.9, 0.93, 0.96), ice * 0.5);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); scene.fog.color.copy(hor); sky.position.copy(TRAIN.position); sunDisc.position.copy(TRAIN.position).addScaledVector(S.v, 45000); sunDisc.lookAt(TRAIN.position); water.position.set(TRAIN.position.x, WATER, TRAIN.position.z);
  // announce events as we pass them
  const ev = EVENTS.find(e => { const d = xOfYear(e[0]) - trainX; return d > -40 && d < 60; }); if (ev && ev !== lastEv) { lastEv = ev; say(`<b>${fmtYear(ev[0])}</b> · ${ev[1]}`, 10); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  itTm -= dt; if (itTm <= 0) { itTm = 0.5; drawItinerary(trainX); }
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; const y = yearAt(camera.getWorldPosition(V3(0, 0, 0)).x + ORIGIN.x), n = nextStop();   // the year where you are standing BIG.textContent = fmtYear(y);
    HUD.innerHTML = `<b>One year every second</b> · ${CARS[carAt(P_.z)]}${running ? "" : " · paused"}<br>${n ? `next: <b>${n[1]}</b> (${fmtYear(n[0])}) in ${fmtWait((xOfYear(n[0]) - trainX) / V)}, ${fmtDist((xOfYear(n[0]) - trainX) / V)} down the line` : ""}<br>
      <span style="color:#9ab4c8;font-size:12.5px">WASD walk · drag to look · N jump to the next stop · P pause · E in a roomette berth: sleep 8 hours (28,800 years)</span>`;
    if (vr) drawVR(fmtYear(y), msgText || (n ? `next: ${n[1]} in ${fmtWait((xOfYear(n[0]) - trainX) / V)} · left stick walk · right stick turn · A sleep / next stop · Y jump ahead` : "")); }
  renderer.render(scene, camera);
}

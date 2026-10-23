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
const fmtYear = y => { const b = Math.round(BP(y)); if (y > NOW) return `${Math.round(y)} (the future)`; if (b >= 10000) return b >= 1e6 ? `${(b / 1e6).toFixed(b >= 1e7 ? 0 : 2)} million years ago` : `${b.toLocaleString()} years ago`;
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
  return anchor(K.build(), x0, 0, 0); }
function streamTiles(x) { const ci = Math.floor(x / TILE); let made = 0;
  for (let d = 0; d <= TR; d++) for (const i of d ? [ci + d, ci - d] : [ci]) { if (!TILES.has(i) && made < 2) { TILES.set(i, genTile(i)); made++; } }
  for (const [i, g] of TILES) if (Math.abs(i - ci) > TR + 1) { unanchor(g); g.traverse(o => o.isInstancedMesh && o.dispose()); TILES.delete(i); } }

// ---------- a sign at every year, and boards for events ----------
// Signs stand on the right of the line, one every 25 m (one a second). Boards mark events (world and local history), placed at their year.
const signLabel = y => { const b = Math.round(BP(y)), r = Math.round(y); if (y > NOW + 0.5) return [String(r), "the future"]; if (b >= 10000) return [b.toLocaleString(), "years ago"]; return r > 0 ? [String(r), r < 1000 ? "CE" : ""] : [String(1 - r), "BCE"]; };
const SIGNS = []; const NSIGN = IS_HEADSET ? 50 : 80;
for (let k = 0; k < NSIGN; k++) { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); b.position.y = 3.2; g.add(b); const bk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), M(0x5a5a5a)); bk.rotation.y = Math.PI; bk.position.y = 3.2; g.add(bk);
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12).translate(0, 1.6, 0), M(0x5a5a5a)); g.add(p); WORLD.add(g); SIGNS.push({ g, c, t, b, year: null, x: 0 }); }
function drawSign(S, y) { const g = S.c.getContext("2d"), [a, b] = signLabel(y); g.fillStyle = "#123a2a"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#f0e8d0"; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118);
  g.fillStyle = "#f8f4e8"; g.textAlign = "center"; let fs = 70; do { g.font = `700 ${fs}px Helvetica, Arial, sans-serif`; } while (g.measureText(a).width > 230 && --fs > 20); g.fillText(a, 128, b ? 78 : 88); if (b) { g.font = "600 24px Helvetica, Arial, sans-serif"; g.fillText(b, 128, 112); } S.t.needsUpdate = true; }
function updateSigns(xT) { const yT = yearAt(xT), y0 = Math.ceil(yT + NSIGN * 0.25), want = new Set(); for (let k = 0; k < NSIGN; k++) want.add(y0 - k);
  const free = SIGNS.filter(S => !want.has(S.year)); for (const y of want) { if (SIGNS.some(S => S.year === y)) continue; const S = free.pop(); if (!S) break; S.year = y; drawSign(S, y); S.x = xOfYear(y); }
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
const BOARDS = []; for (let k = 0; k < 10; k++) { const c = document.createElement("canvas"); c.width = 768; c.height = 384; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); b.position.y = 4.2; g.add(b); const bk = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), M(0x6a5a4a)); bk.rotation.y = Math.PI; bk.position.y = 4.2; g.add(bk);
  for (const e of [-2.6, 2.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2).translate(0, 2.1, 0), M(0x5a4a3a)); p.position.x = e; g.add(p); } WORLD.add(g); BOARDS.push({ g, c, t, ev: null }); }
function drawBoard(B, ev) { const g = B.c.getContext("2d"); g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 768, 384); g.strokeStyle = "#7a2e1e"; g.lineWidth = 10; g.strokeRect(6, 6, 756, 372);
  g.fillStyle = "#7a2e1e"; g.font = "700 64px Georgia, serif"; g.fillText(fmtYear(ev[0]), 30, 88); g.fillStyle = "#2a2018"; g.font = "36px Georgia, serif";
  const words = ev[1].split(" "); let ln = "", y = 150; for (const w of words) { if (g.measureText(ln + w).width > 700) { g.fillText(ln, 30, y); y += 46; ln = ""; } ln += w + " "; } g.fillText(ln, 30, y); B.t.needsUpdate = true; }
function updateBoards(xT) { const near = EVENTS.filter(ev => Math.abs(xOfYear(ev[0]) - xT) < 1500).slice(0, BOARDS.length);
  for (const B of BOARDS) if (B.ev && !near.includes(B.ev)) { B.ev = null; B.g.visible = false; }
  for (const ev of near) { if (BOARDS.some(B => B.ev === ev)) continue; const B = BOARDS.find(B => !B.ev); if (!B) break; B.ev = ev; drawBoard(B, ev); B.g.visible = true; }
  for (const B of BOARDS) { if (!B.ev) continue; const x = xOfYear(B.ev[0]), z = trackZ(x) + 18, gy = terrainH(x, z); B.g.position.set(x - ORIGIN.x, Math.max(gy, trackE(x) - 1), z - ORIGIN.z); B.g.rotation.y = trackH(x) - Math.PI / 2 - 0.5; } }
// the itinerary: stops on the way, and when we arrive at a year a second
const STOPS = [[2000, "2000"], [1969, "The Moon landing"], [1900, "1900"], [1851, "The railroad opens: rails end"], [1776, "1776"], [1609, "Henry Hudson; the Lenape"], [1492, "1492"], [1250, "Gothic Europe, 1250"], [1000, "The Norse in America"],
  [1, "1 CE"], [-752, "The founding of Rome"], [-2559, "The Great Pyramid"], [-3099, "The first writing"], [-9499, "The first farming"], [NOW - 13000, "The first people here"], [NOW - 20000, "The ice age at its height"],
  [NOW - 125000, "The last interglacial"], [NOW - 300000, "The first Homo sapiens"], [NOW - 2.6e6, "The ice ages begin"], [NOW - 7e6, "The human and chimp lines part"], [NOW - 34e6, "Antarctica freezes"], [NOW - 66.0e6, "The dinosaurs' last day"]];
const fmtWait = s => s < 0 ? "passed" : s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : s < 172800 ? `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min` : s < 63072000 ? `${(s / 86400).toFixed(1)} days` : `${(s / 31557600).toFixed(1)} years`;
function drawItinerary(xT) { for (const [C, W, H, big] of [[ITC, 512, 768, false], [MAPC, 1024, 640, true]]) { const g = C.getContext("2d"); g.fillStyle = "#0f2030"; g.fillRect(0, 0, W, H); g.strokeStyle = "#c8a24a"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = "#f0d890"; g.font = `700 ${big ? 40 : 34}px Helvetica, Arial, sans-serif`; g.fillText("ITINERARY", 24, big ? 54 : 50); g.fillStyle = "#e8eef4"; g.font = `${big ? 24 : 20}px Helvetica, Arial, sans-serif`;
    g.fillText(`now: ${fmtYear(yearAt(xT))} · one year every second`, 24, big ? 90 : 82); let y = big ? 132 : 120, n = 0;
    for (const [yr, name] of STOPS) { const wait = (xOfYear(yr) - xT) / V; if (wait < -5) continue; if (++n > (big ? 14 : 18)) break; g.fillStyle = wait < 30 ? "#ffd27a" : "#e8eef4"; g.font = `${big ? 24 : 20}px Helvetica, Arial, sans-serif`;
      if (big) { g.fillText(name, 24, y); g.fillText(fmtYear(yr), 520, y); g.textAlign = "right"; g.fillText(fmtWait(wait), W - 24, y); g.textAlign = "left"; } else { g.fillText(name, 20, y); g.fillStyle = "#9ab4c8"; g.fillText(`${fmtYear(yr)} · ${fmtWait(wait)}`, 20, y + 22); y += 12; }
      y += big ? 34 : 24; } }
  itT.needsUpdate = true; mapT.needsUpdate = true; }

// ---------- the journey ----------
// A year passes every second, so days and seasons would flicker past 365 times a second: the light is held at a summer afternoon.
let trainX = 0, started = false, running = true, sleeping = false;
const keys = {}; let yaw = Math.PI / 2 - 0.15, pitch = -0.02, dragging = false;
const P_ = { x: 1.0, z: carZ(3) + 3 };
const intro = document.getElementById("intro");
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(12,22,32,.78);color:#e8eef4;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:640px";
const BIG = document.createElement("div"); BIG.style.cssText = "position:fixed;right:18px;top:12px;z-index:2;background:rgba(12,22,32,.78);color:#f0d890;padding:8px 16px;border-radius:10px;font:700 34px/1.1 Helvetica,Arial,sans-serif;text-align:right";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(12,22,32,.88);color:#e8eef4;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:780px;display:none";
const FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity 1.2s;z-index:5";
document.body.append(HUD, BIG, MSG, FADE);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 14) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone");
  say("All aboard. The train is leaving the present: every second is a year further back, one sign per year outside. You are in the lounge car; the itinerary is on the front wall of every car. Walk through the train; the observation car is at the back. N jumps ahead to the next stop; E in a roomette berth sleeps eight hours (28,800 years).", 22); }
function jumpTo(x) { trainX = x; const T = trackXZ(trainX); recentre(T.x, T.z); for (const L of LEVELS) L.ox = NaN; updateGround(T.x, T.z, 99); }
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
  const tz = trackZ(trainX); if (Math.hypot(trainX - ORIGIN.x, tz - ORIGIN.z) > 1500) recentre(trainX, tz);
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
  rig.position.set(P_.x, 0, P_.z);
  updateGround(trainX, tz); streamTiles(trainX); updateSigns(trainX); updateBoards(trainX);
  // a summer afternoon's light; the sky a little colder in the ice ages
  const S = sunDir(15.5, 42), ice = iceThick(yearAt(trainX)) / 1100; sun.position.copy(S.v).multiplyScalar(800); sun.intensity = 2.4; hemi.intensity = 1.05;
  const upC = new THREE.Color(0.32, 0.52, 0.84).lerp(new THREE.Color(0.55, 0.65, 0.8), ice * 0.4), hor = new THREE.Color(0.80, 0.85, 0.88).lerp(new THREE.Color(0.9, 0.93, 0.96), ice * 0.5);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(hor); scene.fog.color.copy(hor); sky.position.copy(TRAIN.position); sunDisc.position.copy(TRAIN.position).addScaledVector(S.v, 45000); sunDisc.lookAt(TRAIN.position); water.position.set(TRAIN.position.x, WATER, TRAIN.position.z);
  // announce events as we pass them
  const ev = EVENTS.find(e => { const d = xOfYear(e[0]) - trainX; return d > -40 && d < 60; }); if (ev && ev !== lastEv) { lastEv = ev; say(`<b>${fmtYear(ev[0])}</b> · ${ev[1]}`, 10); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  itTm -= dt; if (itTm <= 0) { itTm = 0.5; drawItinerary(trainX); }
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; const y = yearAt(trainX), n = nextStop(); BIG.textContent = fmtYear(y);
    HUD.innerHTML = `<b>One year every second</b> · ${CARS[carAt(P_.z)]}${running ? "" : " · paused"}<br>${n ? `next: <b>${n[1]}</b> (${fmtYear(n[0])}) in ${fmtWait((xOfYear(n[0]) - trainX) / V)}` : ""}<br>
      <span style="color:#9ab4c8;font-size:12.5px">WASD walk · drag to look · N jump to the next stop · P pause · E in a roomette berth: sleep 8 hours (28,800 years)</span>`;
    if (vr) drawVR(fmtYear(y), msgText || (n ? `next: ${n[1]} in ${fmtWait((xOfYear(n[0]) - trainX) / V)} · left stick walk · right stick turn · A sleep / next stop · Y jump ahead` : "")); }
  renderer.render(scene, camera);
}

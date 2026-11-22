// edwardsville.js -- Edwardsville, Illinois, on Saturday afternoon, 21 July 1962: the town and Leclaire as they stood, downtown on
// Main Street, and the Madison County Sheriff's House and Jail at 210 North Main, inside and out. Built into edwardsville.html by
// build.py, after edwardsville_data.js (the ground, the map and the jail's outline).
//
// What it rests on. The land: USGS 3DEP elevations. The town: today's OpenStreetMap buildings and roads, kept only where the USGS
// Edwardsville 7.5-minute map of 1954 (made from aerial photographs of 1952) shows a building, the built-up tint, a road or a railroad;
// houses the 1954 map shows that are gone today are put back where it shows them (typical houses, since the map gives no shape); the
// 1954 map's woods and ponds. Buildings put up between 1952 and 1962 cannot be dated from these sources and mostly are not shown.
// Downtown: the Sanborn fire insurance maps of 1930 (corrected to 1947), traced against today's map. The jail: its outline, storeys,
// walls and heating from Sanborn sheet 4; its history and fittings from E. W. Bowles, "History of the Madison County Jail" (1960): the
// 1869-71 jail with its cage of iron-barred cells, the grated corridor and the peepholes from the jailer's kitchen and office; the
// 1904-05 addition by the Pauly Jail Building Company of St. Louis, twenty cells on the "side corridor system", tool-proof steel and
// Bessemer steel, sections for women, juveniles, "hardened" and ordinary prisoners, four bathrooms, a conversation cage and a remote
// locking lever. No plans survive: the rooms are laid out as such jails were, and the info points (E) say what is known and what is not.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 40000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const clampN = THREE.MathUtils.clamp, sstepN = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
const SEED = 1; let s0 = 48271; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4) { let a = 0, f = 1, w = 0.5, s = 0; for (let k = 0; k < n; k++) { a += w * vnoise(x * f, z * f); s += w; f *= 2.03; w *= 0.5; } return a / s; }

// ---------- textures ----------
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };


// ---------- surfaces ----------
// textures are one metre square, laid on in metres, so a clapboard is the same width on every wall
const clapT = tex(256, 256, (g, w, h) => { g.fillStyle = "#f4f2ec"; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { const y = k * h / 9; const gr = g.createLinearGradient(0, y, 0, y + h / 9); gr.addColorStop(0, "rgba(0,0,0,0.28)"); gr.addColorStop(0.12, "rgba(0,0,0,0.06)"); gr.addColorStop(1, "rgba(255,255,255,0.05)"); g.fillStyle = gr; g.fillRect(0, y, w, h / 9); }
  for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(90,80,60,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 8 + rnd() * 30, 1); } });
const shingleT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6e6458"; g.fillRect(0, 0, w, h); const rows = 8; for (let r = 0; r < rows; r++) { let x = (r % 2) * 9 - 9; while (x < w) { const sw = 14 + rnd() * 22, c = 92 + rnd() * 40;
      g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.78})`; g.fillRect(x + 1, r * h / rows, sw - 2, h / rows - 2); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x + 1, (r + 1) * h / rows - 4, sw - 2, 3); x += sw; } } });
const brickT = tex(256, 256, (g, w, h) => { g.fillStyle = "#b8b0a0"; g.fillRect(0, 0, w, h); const bh = h / 15, bw = w / 5; for (let r = 0; r < 15; r++) for (let k = -1; k < 6; k++) { const c = 120 + rnd() * 50;
      g.fillStyle = `rgb(${c + 30},${c * 0.55},${c * 0.42})`; g.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 3); } });
const boardT = tex(256, 256, (g, w, h) => { const n = 10; for (let k = 0; k < n; k++) { const c = 150 + rnd() * 40; g.fillStyle = `rgb(${c},${c * 0.72},${c * 0.46})`; g.fillRect(k * w / n, 0, w / n, h);
      g.fillStyle = "rgba(40,25,10,0.5)"; g.fillRect(k * w / n, 0, 2, h); const j = rnd() * h; g.fillRect(k * w / n, j, w / n, 2); for (let s = 0; s < 6; s++) { g.fillStyle = `rgba(80,50,20,${0.1 + rnd() * 0.15})`; g.fillRect(k * w / n + 3 + rnd() * (w / n - 6), 0, 1, h); } } });
const plankT = tex(256, 256, (g, w, h) => { const n = 5; for (let k = 0; k < n; k++) { const c = 110 + rnd() * 50; g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.75})`; g.fillRect(k * w / n, 0, w / n, h); g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(k * w / n, 0, 3, h);
      for (let s = 0; s < 10; s++) { g.fillStyle = `rgba(50,40,30,${0.1 + rnd() * 0.2})`; g.fillRect(k * w / n + rnd() * w / n, 0, 1, h); } } });
// wallpapers: small repeating flowers on a ground, as the parlour photographs show (dark) and lighter papers for the other rooms
const paper = (ground, a, b, size = 32) => tex(256, 256, (g, w, h) => { g.fillStyle = ground; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) { const ox = (y / size) % 2 ? size / 2 : 0;
      g.fillStyle = a; for (let k = 0; k < 5; k++) { const an = k * 1.2566; g.beginPath(); g.ellipse(x + ox + Math.cos(an) * 4, y + Math.sin(an) * 4 + 8, 3, 2, an, 0, 7); g.fill(); } g.fillStyle = b; g.beginPath(); g.arc(x + ox, y + 8, 2, 0, 7); g.fill();
      g.strokeStyle = b; g.lineWidth = 1; g.beginPath(); g.moveTo(x + ox, y + 12); g.quadraticCurveTo(x + ox + 6, y + 20, x + ox + 2, y + 26); g.stroke(); } });
const paperParlour = paper("#4a2a26", "#8a5a3a", "#c8a060"), paperDining = paper("#5a6046", "#8a8a62", "#d0c08a", 28), paperBed = paper("#d8ccb0", "#b88a7a", "#7a8a5a", 36), paperBed2 = paper("#c8d0c0", "#8aa0b8", "#a07a6a", 30), paperHall = paper("#8a7a5a", "#a8946a", "#5a4a32", 30);
const plasterT = tex(64, 64, (g, w, h) => { g.fillStyle = "#e8e2d4"; g.fillRect(0, 0, w, h); for (let k = 0; k < 200; k++) { g.fillStyle = `rgba(120,110,90,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const tarT = tex(64, 64, (g, w, h) => { g.fillStyle = "#3a3836"; g.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(0, k * 16, w, 2); } });
const rugT = tex(128, 128, (g, w, h) => { g.fillStyle = "#6a2a24"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c8a46a"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.strokeStyle = "#2a3a5a"; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
  for (let k = 0; k < 18; k++) { g.fillStyle = ["#c8a46a", "#2a3a5a", "#8a5a2a"][k % 3]; g.beginPath(); g.arc(30 + (k % 6) * 14, 34 + Math.floor(k / 6) * 30, 4, 0, 7); g.fill(); } });
const ragT = tex(128, 128, (g, w, h) => { for (let y = 0; y < h; y += 4) { g.fillStyle = ["#6a5a7a", "#8a4a3a", "#5a6a4a", "#a89a7a", "#4a4a5a", "#9a6a4a"][(Math.floor(y / 4) * 7 + Math.floor(rnd() * 2)) % 6]; g.fillRect(0, y, w, 4); } });
const oilT = tex(64, 64, (g, w, h) => { g.fillStyle = "#e8e4d8"; g.fillRect(0, 0, w, h); g.fillStyle = "#7a9ab8"; for (let k = 0; k < 8; k++) { g.fillRect(k * 8, 0, 4, h); g.fillRect(0, k * 8, w, 4); } }, [1, 1]);
const MAT = {}; const mk = (k, o) => MAT[k] = new THREE.MeshStandardMaterial({ roughness: 0.88, vertexColors: true, ...o });
mk("clap", { map: clapT }); mk("shingle", { map: shingleT, roughness: 0.95 }); mk("brick", { map: brickT }); mk("trim", { roughness: 0.7 }); mk("board", { map: boardT, roughness: 0.75 }); mk("plank", { map: plankT });
mk("parlour", { map: paperParlour }); mk("dining", { map: paperDining }); mk("bed", { map: paperBed }); mk("bed2", { map: paperBed2 }); mk("hall", { map: paperHall }); mk("plaster", { map: plasterT }); mk("tar", { map: tarT });
mk("plain", {}); mk("iron", { roughness: 0.45, metalness: 0.6 }); mk("rug", { map: rugT }); mk("rag", { map: ragT }); mk("oil", { map: oilT, roughness: 0.5 }); mk("cloth", { roughness: 0.95 });
MAT.glass = new THREE.MeshStandardMaterial({ color: 0xa8c0c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });
MAT.lace = new THREE.MeshStandardMaterial({ map: tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(k * 8 + 4, (k % 2) * 8 + 4, 3, 0, 7); g.stroke(); g.strokeRect(0, k * 8, w, 0.5); } }, [6, 6]), transparent: true, opacity: 0.75, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.9 });

// ---------- geometry, merged by material ----------
// Pieces are placed in a frame F (a position on the ground and a turn) in local metres: X along the front, Y up, Z back.
const BK = new Map(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
const frame = (x, z, y, ry) => ({ x, z, y, ry, m: new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1)) });
const toWorld = (F, X, Y, Z) => V3(X, Y, Z).applyMatrix4(F.m);
function metreUV(g) { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i)); else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i)); else uv.setXY(i, p.getX(i), p.getY(i)); } return g; }
function put(mat, geo, m, col = 0xffffff) { if (!BK.has(mat)) BK.set(mat, []); const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m); _c.set(col);
  const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = _c.r; c[i + 1] = _c.g; c[i + 2] = _c.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); BK.get(mat).push(g); }
// a box, centred at (cx, cy, cz) in the frame, sized in metres, its texture laid on in metres; optionally tilted
function box(F, mat, cx, cy, cz, sx, sy, sz, col, rx = 0, ry = 0, rz = 0) { const g = metreUV(new THREE.BoxGeometry(sx, sy, sz)); _e.set(rx, ry, rz); _m.compose(V3(cx, cy, cz), _q.setFromEuler(_e), V3(1, 1, 1)); put(mat, g, F.m.clone().multiply(_m), col); }
function cyl(F, mat, cx, cy, cz, r0, r1, h, col, seg = 10, rx = 0, rz = 0) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); _e.set(rx, 0, rz); _m.compose(V3(cx, cy, cz), _q.setFromEuler(_e), V3(1, 1, 1)); put(mat, g, F.m.clone().multiply(_m), col); }
function lathe(F, mat, cx, cy, cz, prof, col, seg = 12, s = 1) { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * s, y * s)), seg); _m.makeTranslation(cx, cy, cz); put(mat, g, F.m.clone().multiply(_m), col); }
// a flat polygon (planar, listed anticlockwise seen from the side it faces), textured in metres across its own plane
function poly(F, mat, P, col, tris = null) { const n = new THREE.Vector3().crossVectors(V3(...P[1]).sub(V3(...P[0])), V3(...P[2]).sub(V3(...P[0]))).normalize(), u = V3(...P[1]).sub(V3(...P[0])).normalize(), v = new THREE.Vector3().crossVectors(n, u);
  const T = tris || P.slice(1, -1).map((_, i) => [0, i + 1, i + 2]), pos = [], uv = [], nor = [];
  for (const t of T) for (const k of t) { const p = V3(...P[k]); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); const d = p.clone().sub(V3(...P[0])); uv.push(d.dot(u), d.dot(v)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); put(mat, g, F.m, col); }
// both faces of a polygon, each with its own surface (a roof: shingles above, plaster or bare boards below)
function poly2(F, matA, matB, P, colA, colB, off = 0.14, tris = null) { poly(F, matA, P, colA, tris); const n = new THREE.Vector3().crossVectors(V3(...P[1]).sub(V3(...P[0])), V3(...P[2]).sub(V3(...P[0]))).normalize();
  const Q = P.map(p => [p[0] - n.x * off, p[1] - n.y * off, p[2] - n.z * off]).reverse(), T = tris ? tris.map(t => t.map(k => P.length - 1 - k).reverse()) : null; poly(F, matB, Q, colB, T); }
const MESHES = [];
function flushBK(shadow = true) { for (const [mat, list] of BK) { let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3); let o = 0;
    for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); col.set(g.attributes.color.array, o * 3); o += c; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeBoundingSphere();
    const me = new THREE.Mesh(geo, mat); me.castShadow = shadow && mat !== MAT.glass && mat !== MAT.lace; me.receiveShadow = true; scene.add(me); MESHES.push(me); } BK.clear(); }

// ---------- walking: walls that stop you, floors and stairs that carry you ----------
const WALLS = [], FLOORS = [], SOLIDS = [];
function wallSeg(F, ax, az, bx, bz, y0, y1) { const a = toWorld(F, ax, 0, az), b = toWorld(F, bx, 0, bz); WALLS.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, y0: F.y + y0, y1: F.y + y1 }); }
// a floor: a rectangle in a frame, flat at y, or a ramp (a stair) rising from y to y2 along X or Z; holes are cut out of it
function floorRect(F, x0, z0, x1, z1, y, o = {}) { FLOORS.push({ F, x0, z0, x1, z1, y: F.y + y, y2: o.y2 !== undefined ? F.y + o.y2 : null, along: o.along || "x", holes: o.holes || [], c: Math.cos(F.ry), s: Math.sin(F.ry) }); }
function solidBox(F, x0, z0, x1, z1, y0, y1) { SOLIDS.push({ F, x0, z0, x1, z1, y0: F.y + y0, y1: F.y + y1, c: Math.cos(F.ry), s: Math.sin(F.ry) }); }
const toLocal = (R, x, z) => { const dx = x - R.F.x, dz = z - R.F.z; return [dx * R.c - dz * R.s, dx * R.s + dz * R.c]; };

// ---------- walls with openings ----------
// A straight wall in a frame from (ax, az) to (bx, bz), along X or along Z, from y0 to y1, thickness t. Its two faces get their own
// surfaces: P on the +Z side (a wall along X) or the +X side (a wall along Z), N on the other. Openings (doors and windows) lying on its
// line are cut out; doors leave a gap in the walls you bump into. Papered faces get a baseboard.
const OPS = [];
function op(line, at, c, w, b, h, o = {}) { const p = { line, at, c, w, b, h, ...o }; OPS.push(p); return p; }
function wallLine(F, ax, az, bx, bz, y0, y1, t, matP, colP, matN, colN, collide = true, base = true) {
  const alongX = Math.abs(az - bz) < 1e-6, at = alongX ? az : ax, s0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), s1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const ops = OPS.filter(o => o.line === (alongX ? "z" : "x") && Math.abs(o.at - at) < 0.05 && o.c + o.w / 2 > s0 + 0.01 && o.c - o.w / 2 < s1 - 0.01 && (o.base || 0) + o.b < y1 - 0.01 && (o.base || 0) + o.b + o.h > y0 + 0.01).sort((p, q) => p.c - q.c);
  const piece = (a0, a1, yb, yt) => { if (a1 - a0 < 0.005 || yt - yb < 0.005) return; const mid = (a0 + a1) / 2, len = a1 - a0, h = yt - yb, yc = (yb + yt) / 2;
    for (const [mat, col, sg] of [[matP, colP, 1], [matN, colN, -1]]) { if (!mat) continue; const off = sg * t / 4;
      if (alongX) box(F, mat, mid, yc, at + off, len, h, t / 2, col); else box(F, mat, at + off, yc, mid, t / 2, h, len, col);
      if (base && yb <= y0 + 0.01 && mat !== MAT.clap && mat !== MAT.brick) { const bo = sg * (t / 2 + 0.008); if (alongX) box(F, MAT.plain, mid, y0 + 0.08, at + bo, len, 0.16, 0.016, 0x4a3420); else box(F, MAT.plain, at + bo, y0 + 0.08, mid, 0.016, 0.16, len, 0x4a3420); } } };
  // cut along the wall into spans at every opening's edge; in each span, wall between the openings that cover it, bottom to top; each
  // solid piece also stops you (a sill stops you, the space under a door's head does not)
  const cuts = [...new Set([s0, s1, ...ops.flatMap(o => [Math.max(s0, o.c - o.w / 2), Math.min(s1, o.c + o.w / 2)])])].sort((p, q) => p - q);
  const seg = (a0, a1, yb, yt) => { piece(a0, a1, yb, yt); if (collide && yt - yb > 0.05) alongX ? wallSeg(F, a0, at, a1, at, yb, yt) : wallSeg(F, at, a0, at, a1, yb, yt); };
  for (let k = 0; k < cuts.length - 1; k++) { const a0 = cuts[k], a1 = cuts[k + 1], m = (a0 + a1) / 2; if (a1 - a0 < 0.005) continue; const H = ops.filter(o => o.c - o.w / 2 < m && o.c + o.w / 2 > m).map(o => [clampN((o.base || 0) + o.b, y0, y1), clampN((o.base || 0) + o.b + o.h, y0, y1)]).sort((p, q) => p[0] - q[0]);
    let y = y0; for (const [hb, ht] of H) { if (hb > y) seg(a0, a1, y, hb); y = Math.max(y, ht); } if (y1 > y) seg(a0, a1, y, y1); } }
// a gable end (or a wall under a roof): full width up to the knee height, then narrowing to the peak; an opening cut out of it
function gable(F, line, at, a0, a1, yb, yk, yp, t, matP, colP, matN, colN, hole = null) {
  const mid = (a0 + a1) / 2, half = (a1 - a0) / 2, hw = y => y <= yk ? half : half * Math.max(0, (yp - y) / (yp - yk));
  const ys = [...new Set([yb, yk, yp, ...(hole ? [hole.y0, hole.y1] : [])])].filter(y => y >= yb && y <= yp).sort((p, q) => p - q);
  const P = (s, y, off) => line === "z" ? [s, y, at + off] : [at + off, y, s];
  const quad = (sa0, sa1, sb0, sb1, ya, yb2) => { for (const [mat, col, sg] of [[matP, colP, 1], [matN, colN, -1]]) { if (!mat) continue; const off = sg * t / 2;
      let Q = [P(sa0, ya, off), P(sa1, ya, off), P(sb1, yb2, off), P(sb0, yb2, off)]; if (sb1 - sb0 < 1e-4) Q = [Q[0], Q[1], Q[2]];
      const flip = (line === "z" ? sg > 0 : sg < 0); poly(F, mat, flip ? Q : Q.slice().reverse(), col); } };
  for (let k = 0; k < ys.length - 1; k++) { const ya = ys[k], yt = ys[k + 1], wa = hw(ya), wt = hw(yt);
    if (hole && ya >= hole.y0 - 1e-6 && yt <= hole.y1 + 1e-6) { quad(mid - wa, hole.c - hole.w / 2, mid - wt, hole.c - hole.w / 2, ya, yt); quad(hole.c + hole.w / 2, mid + wa, hole.c + hole.w / 2, mid + wt, ya, yt); }
    else quad(mid - wa, mid + wa, mid - wt, mid + wt, ya, yt); } }
// a window: casing inside and out, a moulded head and a sill outside, two sashes (two panes over two, the usual of the 1880s-1900s)
function windowAt(F, o, y0, t, trimC = 0xf2efe6, inC = 0x5a3a22) { const alongX = o.line === "z", W = o.w, H = o.h, yb = y0 + o.b, yc = yb + H / 2, sgOut = o.out || 1;
  const B = (c, y, n, sx, sy, sn, mat, col) => alongX ? box(F, mat, c, y, n, sx, sy, sn, col) : box(F, mat, n, y, c, sn, sy, sx, col);
  for (const sg of [1, -1]) { const n = o.at + sg * (t / 2 + 0.015), col = sg === sgOut ? trimC : inC;
    B(o.c - W / 2 - 0.05, yc, n, 0.1, H + 0.2, 0.03, MAT.plain, col); B(o.c + W / 2 + 0.05, yc, n, 0.1, H + 0.2, 0.03, MAT.plain, col); B(o.c, yb + H + 0.06, n, W + 0.2, 0.12, 0.03, MAT.plain, col); if (!o.door) B(o.c, yb - 0.04, n, W + 0.16, 0.08, 0.03, MAT.plain, col); }
  const no = o.at + sgOut * (t / 2 + 0.06); if (!o.int) { B(o.c, yb + H + 0.17, no, W + 0.34, 0.1, 0.1, MAT.plain, trimC); B(o.c, yb + H + 0.23, no, W + 0.4, 0.035, 0.14, MAT.plain, trimC); if (!o.door) B(o.c, yb - 0.03, no - sgOut * 0.02, W + 0.14, 0.04, 0.12, MAT.plain, trimC); }
  if (o.door) return;
  const sc = o.sashC || trimC; for (const [ya, yt] of [[yb, yb + H / 2], [yb + H / 2, yb + H]]) { const ym = (ya + yt) / 2, n = o.at + (ya === yb ? 0.02 : -0.02) * sgOut;
    B(o.c, ya + 0.025, n, W, 0.05, 0.04, MAT.plain, sc); B(o.c, yt - 0.025, n, W, 0.05, 0.04, MAT.plain, sc); B(o.c - W / 2 + 0.025, ym, n, 0.05, yt - ya, 0.04, MAT.plain, sc); B(o.c + W / 2 - 0.025, ym, n, 0.05, yt - ya, 0.04, MAT.plain, sc);
    B(o.c, ym, n, 0.025, yt - ya - 0.08, 0.03, MAT.plain, sc); B(o.c, ym, n, W - 0.08, yt - ya - 0.08, 0.006, MAT.glass, 0xffffff); } }
// a door leaf, standing open at a right angle into the room beside its hinge: four panels' worth of wood
function doorLeaf(F, o, y0, t, col = 0x6a4a2e, openTo = 1, hingeLeft = true) { const W = o.w - 0.04, H = o.h - 0.03, hx = o.c + (hingeLeft ? -1 : 1) * (o.w / 2 - 0.03), n = o.at + openTo * (t / 2 + W / 2);
  if (o.line === "z") box(F, MAT.plain, hx, y0 + H / 2, n, 0.045, H, W, col); else box(F, MAT.plain, n, y0 + H / 2, hx, W, H, 0.045, col); }
function mergeG(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const q of gs) { const c = q.attributes.position.count; pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3);
    for (let i = 0; i < c; i++) { const sh = q.attributes.color ? q.attributes.color.getX(i) : 1, ny = q.attributes.normal.getY(i), v = sh * (0.8 + 0.2 * (ny * 0.5 + 0.5)); col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = v; } o += c; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); return out; }
const MT = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), V3(sx, sy, sz));
const G1 = (g, m = MT(0, 0, 0)) => mergeG([[g, m]]);
// cloth that hangs in folds: a tapered tube whose radius ripples more toward the hem, shaded in the valleys
function foldTube(rTop, rBot, h, segs, folds, amp, open = 0, thetaStart = 0, seed = 0) { const g = new THREE.CylinderGeometry(rTop, rBot, h, segs, 4, true, thetaStart, Math.PI * 2 - open), p = g.attributes.position, sh = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (h / 2 - y) / h, a = Math.atan2(x, z), wv = Math.sin(a * folds + seed) + 0.4 * Math.sin(a * folds * 2.3 + seed * 3), k = 1 + amp * t * wv;
    p.setXYZ(i, x * k, y - t * t * 0.015 * (1 + Math.sin(a * 3 + seed)), z * k); const s = 0.86 + 0.14 * wv * t - 0.08 * t; sh[i * 3] = sh[i * 3 + 1] = sh[i * 3 + 2] = s; }
  g.setAttribute("color", new THREE.BufferAttribute(sh, 3)); g.computeVertexNormals(); return g; }
// a head: a sphere shaped into skull, cheeks and jaw, with nose, ears and brow
function headGeo() { const g = new THREE.SphereGeometry(0.1, 16, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) / 0.1, y = p.getY(i) / 0.1, z = p.getZ(i) / 0.1;
    x *= 0.84; y *= 1.12; if (y < 0) { x *= 1 - 0.28 * -y; if (z > 0) z = z * (1 - 0.1 * -y) + 0.06 * -y; } if (z < 0) z *= 1.06; if (z > 0.6 && y > 0.32 && y < 0.5) z += 0.025;   // jaw narrows, chin forward, brow
    p.setXYZ(i, x * 0.1, y * 0.1, z * 0.1); } g.computeVertexNormals();
  return mergeG([[g, MT(0, 0.67, 0)], [new THREE.ConeGeometry(0.016, 0.05, 4).rotateX(-Math.PI / 2 - 0.35), MT(0, 0.663, 0.104)], [new THREE.SphereGeometry(0.02, 6, 4), MT(0.087, 0.668, -0.005, 0.35, 1.2, 0.9)], [new THREE.SphereGeometry(0.02, 6, 4), MT(-0.087, 0.668, -0.005, 0.35, 1.2, 0.9)],
    [new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), MT(0, 0.55, -0.005)]]); }
// a cap of hair or cloth over the head that stops at the hairline in front (leaving the face open) and comes lower at the sides and back
function faceCap(r, backT, frontT, width, segs = 14) { const g = new THREE.SphereGeometry(r, segs, 9, 0, Math.PI * 2, 0, backT), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.acos(clampN(y / r, -1, 1)), a = Math.atan2(x, z), f = clampN(1 - Math.abs(a) / width, 0, 1), fs = f * f * (3 - 2 * f), mt = backT + (frontT - backT) * fs;
    if (th > mt) p.setXYZ(i, r * Math.sin(mt) * Math.sin(a), r * Math.cos(mt), r * Math.sin(mt) * Math.cos(a)); }
  g.computeVertexNormals(); return g; }
const HIPY = 0.92, THIGH = 0.44, SHIN = 0.42, UARM = 0.28, FARM = 0.26;
const PG = {
  thigh: G1(new THREE.CylinderGeometry(0.078, 0.058, THIGH, 9).translate(0, -THIGH / 2, 0)),
  shin: mergeG([[new THREE.SphereGeometry(0.058, 7, 5), MT(0, 0, 0)], [new THREE.LatheGeometry([[0.044, -SHIN], [0.048, -SHIN * 0.75], [0.058, -SHIN * 0.35], [0.055, -0.04], [0.05, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 9), MT(0, 0, 0)]]),
  shoe: mergeG([[new THREE.BoxGeometry(0.09, 0.065, 0.2), MT(0, -0.035, 0.035)], [new THREE.SphereGeometry(0.046, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, -0.068, 0.13, 1, 0.9, 1.15)], [new THREE.SphereGeometry(0.048, 7, 4), MT(0, -0.03, -0.035, 1, 0.8, 1)]]),
  uarm: mergeG([[new THREE.SphereGeometry(0.062, 8, 6), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.058, 0.047, UARM, 9).translate(0, -UARM / 2, 0), MT(0, 0, 0)]]),
  farm: mergeG([[new THREE.SphereGeometry(0.048, 7, 5), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.047, 0.036, FARM, 9).translate(0, -FARM / 2, 0), MT(0, 0, 0)]]),
  hand: mergeG([[new THREE.SphereGeometry(0.038, 7, 5), MT(0, -0.05, 0.005, 0.85, 1.35, 0.6)], [new THREE.SphereGeometry(0.016, 5, 4), MT(0.03, -0.03, 0.02, 1, 1.9, 1, 0, 0.5)]]),
  torso: mergeG([[new THREE.LatheGeometry([[0.14, -0.02], [0.13, 0.12], [0.15, 0.25], [0.165, 0.34], [0.17, 0.42], [0.12, 0.49], [0.055, 0.52]].map(([r, y]) => new THREE.Vector2(r, y)), 14), MT(0, 0, 0, 1, 1, 0.68)],
    [new THREE.SphereGeometry(0.07, 8, 6), MT(0.155, 0.43, 0)], [new THREE.SphereGeometry(0.07, 8, 6), MT(-0.155, 0.43, 0)]]),
  head: headGeo(),
  eyeW: mergeG([[new THREE.SphereGeometry(0.014, 6, 4), MT(0.033, 0.694, 0.089, 1, 0.75, 0.55)], [new THREE.SphereGeometry(0.014, 6, 4), MT(-0.033, 0.694, 0.089, 1, 0.75, 0.55)]]),
  eyes: mergeG([[new THREE.SphereGeometry(0.0065, 5, 4), MT(0.033, 0.694, 0.096)], [new THREE.SphereGeometry(0.0065, 5, 4), MT(-0.033, 0.694, 0.096)], [new THREE.BoxGeometry(0.03, 0.004, 0.008), MT(0, 0.632, 0.097)]]),
  brows: mergeG([[new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(0.033, 0.712, 0.097, 1, 1, 1, 0, -0.12)], [new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(-0.033, 0.712, 0.097, 1, 1, 1, 0, 0.12)]]),
  hairShort: G1(faceCap(0.108, Math.PI * 0.52, Math.PI * 0.3, Math.PI * 0.42).scale(0.9, 1.12, 1.04).translate(0, 0.672, -0.006)),
  hairUp: mergeG([[faceCap(0.112, Math.PI * 0.55, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.68, -0.004, 0.96, 1.18, 1.08)], [new THREE.SphereGeometry(0.075, 10, 7), MT(0, 0.79, -0.02, 1.25, 0.75, 1.1)], [new THREE.SphereGeometry(0.05, 8, 6), MT(0, 0.74, -0.1)]]),
  hairGirl: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.095, 0.26, 12, 9, 0.1, Math.PI * 0.85, Math.PI * 0.425), MT(0, 0.54, -0.025)]]),
  bow: mergeG([[new THREE.SphereGeometry(0.07, 8, 5), MT(0.06, 0.78, -0.03, 1, 0.75, 0.3, 0, 0.3)], [new THREE.SphereGeometry(0.07, 8, 5), MT(-0.06, 0.78, -0.03, 1, 0.75, 0.3, 0, -0.3)], [new THREE.SphereGeometry(0.025, 6, 4), MT(0, 0.78, -0.03)]]),
  mustache: G1(new THREE.BoxGeometry(0.07, 0.016, 0.02), MT(0, 0.643, 0.097)),
  coat: G1(foldTube(0.175, 0.205, 0.6, 18, 5, 0.03, Math.PI * 0.3, Math.PI * 0.15, 3).scale(1, 1, 0.8).translate(0, 0.2, -0.01)),
  vest: G1(new THREE.LatheGeometry([[0.148, -0.02], [0.138, 0.12], [0.158, 0.25], [0.172, 0.34], [0.176, 0.42], [0.126, 0.49]].map(([r, y]) => new THREE.Vector2(r, y)), 14).scale(1, 1, 0.7)),
  skirt: G1(foldTube(0.15, 0.3, 0.86, 22, 9, 0.06, 0, 0, 2).scale(1, 1, 0.82).translate(0, -0.37, 0)),
  dress: G1(foldTube(0.15, 0.26, 0.5, 20, 8, 0.07, 0, 0, 5).scale(1, 1, 0.82).translate(0, -0.2, 0)),
  apron: G1(new THREE.PlaneGeometry(0.34, 0.66).translate(0, -0.3, 0.2)),
  braces: mergeG([[new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(0.07, 0.25, 0.127)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(-0.07, 0.25, 0.127)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(0.07, 0.25, -0.128)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(-0.07, 0.25, -0.128)]]),
  tie: G1(new THREE.BoxGeometry(0.04, 0.2, 0.012), MT(0, 0.4, 0.122)),
  belt: mergeG([[new THREE.CylinderGeometry(0.142, 0.142, 0.035, 14, 1, true), MT(0, 0.07, 0, 1, 1, 0.72)], [new THREE.BoxGeometry(0.05, 0.04, 0.02), MT(0, 0.07, 0.105)]]),
  bowler: mergeG([[new THREE.CylinderGeometry(0.15, 0.15, 0.012, 18), MT(0, 0.765, 0)], [new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.77, 0, 1, 1.05, 1.08)]]),
  boater: mergeG([[new THREE.CylinderGeometry(0.17, 0.17, 0.01, 18), MT(0, 0.765, 0)], [new THREE.CylinderGeometry(0.098, 0.098, 0.075, 16), MT(0, 0.8, 0)], [new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16, 1, true), MT(0, 0.78, 0)]]),
  flatcap: mergeG([[new THREE.SphereGeometry(0.115, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.735, 0, 1.0, 0.45, 1.08)], [new THREE.BoxGeometry(0.15, 0.012, 0.08), MT(0, 0.74, 0.11, 1, 1, 1, 0.15, 0)]]),
  ladyHat: mergeG([[new THREE.CylinderGeometry(0.24, 0.24, 0.012, 20), MT(0, 0.82, -0.01)], [new THREE.CylinderGeometry(0.12, 0.13, 0.1, 16), MT(0, 0.87, -0.01)], [new THREE.SphereGeometry(0.06, 8, 5), MT(0.08, 0.9, 0.0, 1.2, 0.7, 1)]]),
  campaign: mergeG([[new THREE.CylinderGeometry(0.19, 0.19, 0.012, 18), MT(0, 0.765, 0)], [new THREE.ConeGeometry(0.11, 0.15, 4), MT(0, 0.84, 0, 1, 1, 1, 0, 0)]]),
  uniCap: mergeG([[new THREE.CylinderGeometry(0.105, 0.11, 0.07, 14), MT(0, 0.78, 0)], [new THREE.BoxGeometry(0.15, 0.01, 0.07), MT(0, 0.75, 0.1, 1, 1, 1, 0.2, 0)]]),
  veil: mergeG([[faceCap(0.125, Math.PI * 0.62, Math.PI * 0.26, Math.PI * 0.5), MT(0, 0.674, -0.008, 0.95, 1.15, 1.08)], [foldTube(0.12, 0.2, 0.42, 14, 6, 0.06, Math.PI * 0.7, Math.PI * 0.35), MT(0, 0.52, -0.03)]]),
  coif: mergeG([[new THREE.TorusGeometry(0.1, 0.02, 4, 18, Math.PI * 1.2).rotateX(-0.25), MT(0, 0.72, 0.0)], [new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3), MT(0, 0.6, 0.02, 1, 0.8, 0.9)]]) };
PG.fedora = mergeG([[new THREE.CylinderGeometry(0.16, 0.16, 0.012, 18), MT(0, 0.765, 0)], [new THREE.CylinderGeometry(0.085, 0.1, 0.11, 14), MT(0, 0.82, 0)], [new THREE.BoxGeometry(0.15, 0.03, 0.03), MT(0, 0.87, 0)]]);
PG.hairUp = mergeG([[faceCap(0.118, Math.PI * 0.58, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.69, -0.006, 1.02, 1.22, 1.1)], [new THREE.SphereGeometry(0.1, 12, 8), MT(0, 0.76, -0.02, 1.15, 0.85, 1.12)]]);
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairShort", "hairUp", "hairGirl", "bow", "mustache",
  "fedora", "coat", "vest", "skirt", "dress", "apron", "braces", "tie", "belt", "bowler", "boater", "flatcap", "ladyHat", "campaign", "uniCap", "veil", "coif"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const METAL = new Set([]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, vertexColors: true });
const SK = [0xecc8ae, 0xe2b898, 0xf0d2bc, 0xdcae90, 0xe6c0a2, 0x8a5a3c, 0x6a4430], HAIR = [0x3a2618, 0x5a3a20, 0x7a5a32, 0x2a1c12, 0x6a4a2a, 0x8a6a42, 0x1a120c, 0xb89a62], DARK = [0x3a3a40, 0x4a4a4e, 0x5a5448, 0x2a3040, 0x6a6458, 0x8a7a5a, 0x3a3428];
const SHIRT = [0xf4f2ec, 0xf0f0ea, 0xd8e4f0, 0xc8d8e8, 0xe8e0c8, 0xd8c8a0, 0xa8b8c8, 0xe8d0c8, 0xc8d8c0], DRESS = [0xf0c8c8, 0xc8d8f0, 0xf4e8a8, 0xc8e8d0, 0xf4f2ec, 0x2a3a5a, 0xc83a3a, 0xe8b890, 0xb8a8d8, 0x7aa8b8];
// roles: man (in shirtsleeves, the usual in July), suit (jacket and tie, a hat), woman, girl, boy, deputy (khaki), jailer, inmate, cook
function looks(i, role, o = {}) { const h = k => hash(i * 13 + k, 91), pick = (A, k) => A[(h(k) * A.length) | 0];
  const L = { role, s: role === "girl" || role === "boy" ? 0.7 + h(5) * 0.18 : 0.95 + h(5) * 0.1, skin: h(4) < 0.08 ? pick([0x8a5a3c, 0x6a4430], 41) : pick(SK.slice(0, 5), 4), hair: h(30) < 0.12 && role !== "girl" && role !== "boy" ? 0x9a948a : pick(HAIR, 6),
    shirt: pick(SHIRT, 7), leg: pick(DARK, 8), shoes: pick([0x1a1612, 0x3a2418, 0x2a2a2a], 9), coat: null, hat: null, hatC: pick([0x5a5448, 0x3a3a3a, 0x7a6a50, 0xd8c8a0], 20), dressC: pick(DRESS, 12), apron: false, apronC: 0xf2eee6, mustache: h(15) < 0.1, tie: false, short: h(16) < 0.6 };
  if (role === "man") Object.assign(L, { hat: h(19) < 0.2 ? "fedora" : h(19) < 0.32 ? "flatcap" : null, hatC: h(19) < 0.1 ? 0xd8c8a0 : L.hatC });
  if (role === "suit") Object.assign(L, { coat: pick([0x3a3a40, 0x4a4a52, 0x5a5448, 0x2a3040, 0x6a6a68], 17), tie: true, short: false, hat: h(19) < 0.5 ? "fedora" : null, shirt: 0xf4f2ec });
  if (role === "woman") Object.assign(L, { leg: L.skin, short: true });
  if (role === "girl") Object.assign(L, { leg: L.skin, short: true });
  if (role === "boy") Object.assign(L, { shirt: pick([0xf4f2ec, 0xc83a3a, 0x3a5a9a, 0xe8d860, 0x6a9a6a], 24), leg: pick([0x2a3a5a, 0x3a4a6a, 0x6a6458], 25), short: true, hat: h(25) < 0.25 ? "flatcap" : null });
  if (role === "deputy") Object.assign(L, { shirt: 0xb8a878, leg: 0x8a7a58, hat: "uniCap", hatC: 0x6a5a3a, short: true, tie: false });
  if (role === "jailer") Object.assign(L, { shirt: 0xf4f2ec, leg: 0x4a4a4e, short: true, tie: h(3) < 0.5 });
  if (role === "inmate") Object.assign(L, { shirt: pick([0x6a7a8a, 0x8a9aaa, 0x5a6a7a, 0xb8b0a0], 26), leg: pick([0x2a3a5a, 0x4a4a4a, 0x3a4a6a], 27), short: h(28) < 0.5 });
  if (role === "cook") Object.assign(L, { role: "woman", leg: L.skin, apron: true, short: true });
  return Object.assign(L, o); }
const isFem = L => L.role === "woman" || L.role === "girl";
function shows(L, p) { const r = L.role, man = !isFem(L) && r !== "boy";
  switch (p) {
    case "hairShort": return !isFem(L); case "hairUp": return r === "woman"; case "hairGirl": return r === "girl"; case "bow": return false; case "mustache": return man && L.mustache;
    case "coat": return !!L.coat; case "vest": return false; case "skirt": return false; case "dress": return isFem(L); case "apron": return !!L.apron; case "braces": return false;
    case "tie": return !!L.tie; case "belt": return !isFem(L) && !L.coat; case "veil": case "coif": return false;
    case "bowler": case "boater": case "flatcap": case "ladyHat": case "campaign": case "uniCap": case "fedora": return L.hat === p; default: return true; } }
function colorOf(L, p) { const r = L.role, top = isFem(L) ? L.dressC : L.shirt;
  if (p.startsWith("leg")) return isFem(L) ? L.skin : L.leg; if (p.startsWith("shin")) return isFem(L) ? L.skin : L.leg; if (p.startsWith("shoe")) return L.shoes;
  if (p.startsWith("hand") || p === "head") return L.skin; if (p.startsWith("arm")) return L.coat || top; if (p.startsWith("fore")) return L.coat ? L.coat : L.short ? L.skin : top;
  switch (p) { case "torso": return top; case "eyes": return 0x2a1e16; case "eyeW": return 0xe8e4dc; case "brows": case "hairShort": case "hairUp": case "hairGirl": case "mustache": return L.hair;
    case "coat": return L.coat; case "dress": return L.dressC; case "apron": return L.apronC; case "tie": return pick2(L); case "belt": return 0x2a1e14; default: return L.hatC; } }
const pick2 = L => [0x2a2a4a, 0x6a2a2a, 0x2a4a3a, 0x4a3a2a][(L.s * 100 | 0) % 4];
// poses: hip flex (l), knee bend (k), shoulder swing (a), elbow bend (e, negative = forearm forward), skirt tilt (sk)
function poseOf(kind, t, ph, walkAmt = 1) { const c = t * 7 + ph, w = Math.sin(c), sway = 0.04 * Math.sin(t * 0.8 + ph);
  const P = { drop: 0, lean: 0, lL: 0, lR: 0, kL: 0.05, kR: 0.05, aL: sway, aR: -sway, eL: -0.15, eR: -0.15, sk: 0 };
  const walk = (amp = 1) => { const A = walkAmt * amp; P.lL = 0.42 * w * A; P.lR = -0.42 * w * A; P.kL = 0.08 + 0.6 * Math.max(0, Math.cos(c)) * A; P.kR = 0.08 + 0.6 * Math.max(0, -Math.cos(c)) * A; P.lean = 0.05; P.aL = -0.35 * w * A; P.aR = 0.35 * w * A; P.eL = -0.25 - 0.15 * Math.max(0, -w) * A; P.eR = -0.25 - 0.15 * Math.max(0, w) * A; };
  const sit = () => Object.assign(P, { drop: HIPY - 0.47, lL: -1.5, lR: -1.45, kL: 1.5, kR: 1.45, lean: -0.04, sk: -1.15 });
  switch (kind) {
    case "walk": walk(); break;
    case "carry": walk(0.9); Object.assign(P, { aL: -0.45, aR: -0.45, eL: -1.15, eR: -1.15 }); break;
    case "shoulder": walk(0.85); Object.assign(P, { aL: -2.6, eL: -1.0, aR: 0.35 * w, eR: -0.3 }); break;   // a load on the shoulder, steadied with one hand
    case "pull": walk(0.7); Object.assign(P, { lean: 0.45, aL: -1.2, aR: -1.0, eL: -0.3, eR: -0.4 }); break;   // hauling on the towline, leaning into it
    case "guard": Object.assign(P, { aR: -0.3, eR: -1.05, aL: -0.15, eL: -0.6 }); break;
    case "kneel": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.06, aL: -0.45, aR: -0.45, eL: -1.25, eR: -1.25 }); break;
    case "pray": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.12, aL: -0.7, aR: -0.7, eL: -1.55, eR: -1.55 }); break;
    case "sit": sit(); Object.assign(P, { aL: -0.55, aR: -0.5, eL: -0.95, eR: -1.0 - 0.15 * Math.max(0, Math.sin(t * 0.9 + ph)) }); break;
    case "sitground": Object.assign(P, { drop: HIPY - 0.12, lL: -1.4, lR: -1.3, kL: 0.4, kR: 0.6, lean: -0.15, aL: -0.3, aR: -0.4, eL: -0.6, eR: -0.8 - 0.2 * Math.max(0, Math.sin(t * 0.5 + ph)), sk: -1.0 }); break;   // sitting on the ground, legs out
    case "row": { sit(); const r = Math.sin(t * 2.4); Object.assign(P, { lean: 0.22 * r, aL: -1.05 - 0.35 * r, aR: -1.05 - 0.35 * r, eL: -0.4 + 0.35 * r, eR: -0.4 + 0.35 * r }); break; }
    case "paddle": { const r = Math.sin(t * 2.1 + ph); Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.25 + 0.15 * r, aL: -1.4 - 0.4 * r, aR: -0.6 - 0.5 * r, eL: -0.3, eR: -0.6 }); break; }   // kneeling in a dugout, paddling
    case "pole": { const q = (t * 0.35 + ph) % 1; Object.assign(P, { lean: 0.35 + 0.3 * Math.sin(q * 6.283), aL: -1.5 + 0.6 * q, aR: -1.3 + 0.6 * q, eL: -0.3, eR: -0.4, lL: 0.2, lR: -0.2 }); walk(0.5); break; }   // walking aft on the keelboat's running board, pushing on the setting pole
    case "hammer": { const q = (t * 1.6 + ph) % 1, up = q < 0.6 ? q / 0.6 : 1 - (q - 0.6) / 0.4; Object.assign(P, { lean: 0.22, lL: -0.1, lR: 0.12, kL: 0.15, kR: 0.1, aL: -0.55, eL: -0.9, aR: -0.5 - 1.9 * up, eR: -0.4 - 0.6 * up }); break; }
    case "hoe": { const q = (t * 0.9 + ph) % 1, up = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5; Object.assign(P, { lean: 0.35 + 0.2 * (1 - up), lL: -0.25, lR: 0.15, kL: 0.3, kR: 0.15, aL: -0.9 - 1.0 * up, aR: -0.7 - 1.0 * up, eL: -0.5, eR: -0.6 }); break; }   // hoeing the corn
    case "lever": { const q = Math.sin(t * 0.8 + ph); Object.assign(P, { lean: 0.3 + 0.25 * q, aL: -1.6 - 0.5 * q, aR: -1.6 - 0.5 * q, eL: -0.2, eR: -0.2, lL: -0.2, lR: 0.25, kL: 0.2, kR: 0.1 }); break; }   // bearing down on the press lever
    case "knead": { const q = Math.sin(t * 3 + ph); Object.assign(P, { lean: 0.3, aL: -0.9 - 0.15 * q, aR: -0.9 + 0.15 * q, eL: -0.9, eR: -0.9 }); break; }
    case "talk": { const g = Math.pow(Math.max(0, Math.sin(t * 0.55 + ph)), 4); Object.assign(P, { aL: 0.04, eL: -0.2, aR: -0.08 - 0.45 * g, eR: -0.28 - 0.85 * g - 0.15 * g * Math.sin(t * 2.1 + ph) }); break; }
    case "ride": Object.assign(P, { drop: HIPY - 0.5, lL: -0.4, lR: -0.4, kL: 0.95, kR: 0.95, spr: 0.42, aL: -0.45, aR: -0.45, eL: -0.95, eR: -0.95, lean: 0.05 }); break;
    case "dance": { const q = Math.sin(t * 4 + ph); walk(0.6); Object.assign(P, { aL: -0.6 + 0.3 * q, aR: -1.4 - 0.3 * q, eL: -0.6, eR: -0.5, lean: -0.03 }); break; }
    case "fiddle": Object.assign(P, { aL: -1.25, eL: -1.4, aR: -0.6 - 0.25 * Math.sin(t * 7 + ph), eR: -1.2 }); break;
    case "spin": Object.assign(P, { aL: -0.55, eL: -1.55, aR: -0.35, eR: -0.75 - 0.25 * Math.sin(t * 3 + ph) }); break;
    case "bow": Object.assign(P, { lean: 0.38, aL: -0.15, aR: -0.15, eL: -0.3, eR: -0.3 }); break;
    case "sell": { const g = Math.pow(Math.max(0, Math.sin(t * 0.45 + ph)), 3); Object.assign(P, { lean: 0.06, aL: -0.12, eL: -0.35, aR: -0.1 - 0.5 * g, eR: -0.3 - 0.75 * g }); break; } }
  return P; }
const _b = new THREE.Matrix4(), _hm = new THREE.Matrix4(), _sk = new THREE.Matrix4(), _j = new THREE.Matrix4(), _tmp = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), ZEROM = new THREE.Matrix4().makeScale(0, 0, 0), _p = V3(0, 0, 0), _s = V3(1, 1, 1);

const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR"]), SKIRT = new Set(["skirt", "apron", "dress"]);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean)); _sk.copy(_hm).multiply(_j.makeRotationX(P.sk - P.lean * 0.5));
  const leg = (sx, l, k, side) => { const th = _b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)); if (P.spr) th.multiply(_tmp.makeRotationZ(P.spr * Math.sign(sx))); th.multiply(_j.makeRotationX(l));
    const sh = th.clone().multiply(_tmp.makeTranslation(0, -THIGH, 0)).multiply(_j.makeRotationX(k));
    _M["leg" + side] = th; _M["shin" + side] = sh; _M["shoe" + side] = sh.clone().multiply(_tmp.makeTranslation(0, -SHIN, 0)).multiply(_j.makeRotationX(-(l + k) * 0.85)); };
  leg(0.085, P.lL, P.kL, "L"); leg(-0.085, P.lR, P.kR, "R");
  const arm = (sx, a, e, sp, side) => { const u = _hm.clone().multiply(_tmp.makeTranslation(sx, 0.43, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), f = u.clone().multiply(_tmp.makeTranslation(0, -UARM, 0)).multiply(_j.makeRotationX(e)), hd = f.clone().multiply(_tmp.makeTranslation(0, -FARM, 0));
    _M["arm" + side] = u; _M["fore" + side] = f; _M["hand" + side] = hd; return [f, hd]; };
  arm(0.19, P.aL, P.eL, -0.07, "L"); const [, hR] = arm(-0.19, P.aR, P.eR, 0.07, "R");
  _M.musket = hR.clone().multiply(_tmp.makeTranslation(0, -0.04, 0.02)).multiply(_j.makeRotationX(-(P.aR + P.eR) - P.lean));   // held upright whatever the arm does
  for (const p of PARTS) { if (!shows(L, p)) { out.push(ZEROM); continue; } out.push(LIMB.has(p) ? _M[p] : SKIRT.has(p) ? _sk.clone() : _hm.clone()); } }
// the crowd: one instanced mesh per garment or part; each packs only the people wearing it into its first slots, so nothing unworn is drawn
class Crowd { constructor(n) { this.n = n; this.L = []; this.P = PARTS.map(p => { const im = new THREE.InstancedMesh(PGEO[p] || PG[p], METAL.has(p) ? new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.7, vertexColors: true }) : personMat, n);
      im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color()); im.count = 0; scene.add(im); return { p, im, slot: new Int32Array(n).fill(-1), who: new Int32Array(n), count: 0 }; });
    this.ms = []; this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this.count = 0; this.on = new Uint8Array(n); }
  free(Q, i) { const s = Q.slot[i]; if (s < 0) return; const last = --Q.count, j = Q.who[last];
    if (s !== last) { Q.im.getMatrixAt(last, this._m); Q.im.setMatrixAt(s, this._m); Q.im.getColorAt(last, this._c); Q.im.setColorAt(s, this._c); Q.slot[j] = s; Q.who[s] = j; } Q.slot[i] = -1; Q.dirty = true; }
  look(i, L) { this.L[i] = L; for (const Q of this.P) if (Q.slot[i] >= 0) { if (shows(L, Q.p)) { Q.im.setColorAt(Q.slot[i], this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } else this.free(Q, i); } }
  set(i, x, y, z, h, kind, t, walkAmt = 1) { const L = this.L[i]; this.ms.length = 0; partMatrices(x, y, z, h, L, poseOf(kind, t, i * 1.7, walkAmt), this.ms); if (!this.on[i]) { this.on[i] = 1; this.count++; }
    this.P.forEach((Q, k) => { const m = this.ms[k]; if (m === ZEROM) { if (Q.slot[i] >= 0) this.free(Q, i); return; }
      if (Q.slot[i] < 0) { const s = Q.count++; Q.slot[i] = s; Q.who[s] = i; Q.im.setColorAt(s, this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } Q.im.setMatrixAt(Q.slot[i], m); }); }
  hide(i) { if (this.on[i]) { this.on[i] = 0; this.count--; } for (const Q of this.P) this.free(Q, i); }
  done() { for (const Q of this.P) { Q.im.count = Q.count; Q.im.instanceMatrix.needsUpdate = true; if (Q.dirty && Q.im.instanceColor) { Q.im.instanceColor.needsUpdate = true; Q.dirty = false; } } } }

// ---------- the land: USGS elevations; x metres east and z metres south of 38.8114 N, 89.9532 W (Main and Vandalia is at x -223, z 7) ----------
const DEG = Math.PI / 180, LAT0 = 38.8114, LON0 = -89.9532, KX = Math.cos(LAT0 * DEG) * 111320, KZ = 110574, R_E = 6371000;
const toLL = (x, z) => [LAT0 - z / KZ, LON0 + x / KX], sstep = (x, a, b) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function loadDem(D) { return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = D.w; c.height = D.h; const g = c.getContext("2d"); g.drawImage(im, 0, 0); const px = g.getImageData(0, 0, D.w, D.h).data, H = new Float32Array(D.w * D.h);
  for (let i = 0; i < H.length; i++) H[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / D.sc; res({ ...D, H }); }; im.src = D.png; }); }
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
function demPx(D, lat, lon) { const n = 2 ** D.z, tx = (lon + 180) / 360 * n, lr = lat * DEG, ty = (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n, f = D.f || 1; return [(tx - D.x0) * 256 / f - 0.5, (ty - D.y0) * 256 / f - 0.5]; }
function demAt(D, fx, fy) { const i = Math.floor(fy), j = Math.floor(fx), ti = fy - i, tj = fx - j, row = k => { const r = clampN(i + k, 0, D.h - 1) * D.w; return cr(D.H[r + clampN(j - 1, 0, D.w - 1)], D.H[r + clampN(j, 0, D.w - 1)], D.H[r + clampN(j + 1, 0, D.w - 1)], D.H[r + clampN(j + 2, 0, D.w - 1)], tj); }; return cr(row(-1), row(0), row(1), row(2), ti); }
const DEM = {}; [DEM.d14, DEM.d11] = await Promise.all([loadDem(DEM14), loadDem(DEM11)]);
function demH(x, z) { const [lat, lon] = toLL(x, z), D = DEM.d14, [fx, fy] = demPx(D, lat, lon), m = Math.min(fx, fy, D.w - 1 - fx, D.h - 1 - fy); let h = 0;
  if (m < 24) { const [gx, gy] = demPx(DEM.d11, lat, lon); h = demAt(DEM.d11, gx, gy); } if (m > 2) h = lerpN(h, demAt(D, fx, fy), sstep(m, 2, 24)); return h; }
// y is height above 160 m (525 ft)
const BASE = 160, PADS = [];
function ground(x, z) { let h = demH(x, z) - BASE + 0.3 * (fbm(x / 35, z / 35, 3) - 0.5);
  for (const P of PADS) { const dx = x - P.x, dz = z - P.z, u = Math.abs(dx * P.c - dz * P.s) - P.hw, v = Math.abs(dx * P.s + dz * P.c) - P.hd, d = Math.max(u, v, 0); if (d < P.f) h = lerpN(P.y, h, sstep(d, 0, P.f)); } return h; }
// a levelled site: centre, half sizes, the turn of the frame (as in frame()), the level, and how far the ground blends back
function pad(x, z, hw, hd, ry, y, f = 6) { PADS.push({ x, z, hw, hd, c: Math.cos(ry), s: Math.sin(ry), y, f }); }
// the 1954 map's built-up tint and woods, on a 20 m grid
function bitGrid(G) { const b = atob(G.b64), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return (x, z) => { const i = Math.floor((x - G.x0) / G.d), j = Math.floor((z - G.z0) / G.d); if (i < 0 || j < 0 || i >= G.n || j >= G.n) return false; const k = j * G.n + i; return (a[k >> 3] >> (k & 7)) & 1; }; }
const red54 = bitGrid(RED54), woods54 = bitGrid(GRN54);
const woodsAt = (x, z) => woods54(x, z) || woods54(x + 9, z + 7) && woods54(x - 7, z - 9);

// ---------- the sky and the sun: Saturday 21 July 1962 at Edwardsville (38.81 N), central standard time ----------
let hour = 14.5;
function sunDir(hr) { const lat = LAT0 * DEG, dec = 20.4 * DEG, H = (hr - 12.06) * 15 * DEG;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H));
  return V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); }
const skyU = { sun: { value: V3(0, 1, 0) }, day: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}",
  fragmentShader: `#include <logdepthbuf_pars_fragment>
  uniform vec3 sun; uniform float day; varying vec3 vD; void main(){
    #include <logdepthbuf_fragment>
    float h = max(vD.y, 0.0), s = max(dot(vD, sun), 0.0);
    vec3 top = mix(vec3(0.02, 0.03, 0.07), vec3(0.30, 0.50, 0.82), day), hor = mix(vec3(0.05, 0.05, 0.09), vec3(0.80, 0.84, 0.86), day);
    vec3 dusk = vec3(0.95, 0.55, 0.3) * pow(1.0 - h, 6.0) * smoothstep(0.35, -0.05, sun.y) * smoothstep(-0.25, 0.0, sun.y) * pow(s, 2.0);
    vec3 c = mix(hor, top, pow(h, 0.55)) + dusk + vec3(1.0, 0.9, 0.7) * pow(s, 900.0) * 6.0 * step(-0.02, sun.y) + vec3(1.0, 0.85, 0.6) * pow(s, 12.0) * 0.25 * day;
    if (vD.y < 0.0) c = hor * 0.8; gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` }));
scene.add(sky);
scene.fog = new THREE.Fog(0xc8d0d4, 500, 9000);
const hemi = new THREE.HemisphereLight(0xc8dcf0, 0x6a6040, 0.9); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0d8, 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048);
Object.assign(sunL.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; scene.add(sunL, sunL.target);
function updateSky() { const d = sunDir(hour), day = clampN((d.y + 0.08) / 0.3, 0, 1); skyU.sun.value.copy(d); skyU.day.value = day;
  sunL.intensity = 2.6 * clampN(d.y / 0.12, 0, 1); sunL.color.setRGB(1, 0.86 + 0.12 * clampN(d.y * 3, 0, 1), 0.7 + 0.25 * clampN(d.y * 3, 0, 1));
  hemi.intensity = 0.12 + 0.8 * day; scene.fog.color.setRGB(0.05 + 0.74 * day, 0.05 + 0.77 * day, 0.08 + 0.75 * day); renderer.toneMappingExposure = 1.0 + 0.6 * (1 - day); return d; }

// ---------- the ground: nested grids that follow you, coloured by what covered it ----------
const noiseT = (() => { const N = 256, d = new Uint8Array(N * N * 4), lat = (seed, f) => { const g = new Float32Array(f * f); for (let i = 0; i < f * f; i++) g[i] = hash(i + seed * 7919, seed); return g; };
  const vnw = (g, f, x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), at = (a, b) => g[((b % f + f) % f) * f + ((a % f + f) % f)]; return lerpN(lerpN(at(i, j), at(i + 1, j), u), lerpN(at(i, j + 1), at(i + 1, j + 1), u), v); };
  const oct = [4, 8, 16, 32, 64].map((f, k) => [f, lat(k + 1, f)]), g2 = lat(30, 64);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let a = 0, w = 0, amp = 1; for (const [f, g] of oct) { a += amp * vnw(g, f, x / N * f, y / N * f); w += amp; amp *= 0.55; } a /= w; const o = (y * N + x) * 4; d[o] = a * 255; d[o + 1] = Math.pow(vnw(g2, 64, x / N * 64, y / N * 64), 3) * 255; d[o + 2] = hash(x + 5, y) * 255; d[o + 3] = hash(x, y + 999) * 255; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
const groundU = { nTex: { value: noiseT } };
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
groundMat.onBeforeCompile = sh => { sh.uniforms.nTex = groundU.nTex;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D nTex; varying vec3 vWP;")
  .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 wp = vWP.xz; float dist = length(vWP - cameraPosition), near = 1.0 - smoothstep(20.0, 220.0, dist), fine = 1.0 - smoothstep(3.0, 25.0, dist), mid = 1.0 - smoothstep(300.0, 3000.0, dist);
  vec4 n1 = texture2D(nTex, wp / 23.0), n2 = texture2D(nTex, wp / 4.1), n3 = texture2D(nTex, wp / 0.9), n5 = texture2D(nTex, wp / 37.0), n6 = texture2D(nTex, wp / 290.0);
  vec3 col = diffuseColor.rgb * mix(1.0, (0.85 + 0.3 * n1.r) * (0.9 + 0.2 * n5.r), mid) * (0.9 + 0.2 * n6.r);
  col *= mix(1.0, (0.85 + 0.3 * n2.r) * (0.9 + 0.2 * n3.b), near); col *= mix(1.0, 0.9 + 0.2 * n3.a, fine); diffuseColor.rgb = col;`); };
// what covered the ground in July 1962: lawns and gardens in town; outside it fields on the quarter-quarter sections of the land survey
// (corn knee- to head-high, soybeans, wheat stubble after the June harvest, pasture, hay); woods where the 1954 map tints them green
const GCOL = Object.fromEntries(Object.entries({ lawn: "#6a8e3e", lawn2: "#7e9a48", worn: "#8a8458", corn: "#4e7a2a", beans: "#5e8a34", stubble: "#c4b070", pasture: "#7a9446", hay: "#9aa452", woods: "#3e5a28", woods2: "#4a6a2e", bare: "#8a7a58" }).map(([k, v]) => [k, new THREE.Color(v)]));
const BUILT = new Uint8Array(450 * 450), builtAt = (x, z) => { const i = Math.floor((x + 4500) / 20), j = Math.floor((z + 4500) / 20); return i < 0 || j < 0 || i >= 450 || j >= 450 ? 0 : BUILT[j * 450 + i]; };
function markBuilt(x, z, r = 2) { const i0 = Math.floor((x + 4500) / 20), j0 = Math.floor((z + 4500) / 20); for (let j = j0 - r; j <= j0 + r; j++) for (let i = i0 - r; i <= i0 + r; i++) if (i >= 0 && j >= 0 && i < 450 && j < 450) BUILT[j * 450 + i] = 1; }
const qq = (x, z) => [Math.floor((x + 100000) / 402.3), Math.floor((z + 100000) / 402.3)];
const _gc = new THREE.Color();
function groundColor(x, z, slope, out) { const n = fbm(x / 60, z / 60, 3); let c;
  if (woodsAt(x, z)) c = _gc.copy(GCOL.woods).lerp(GCOL.woods2, n);
  else if (red54(x, z) || builtAt(x, z)) c = _gc.copy(GCOL.lawn).lerp(GCOL.lawn2, n).lerp(GCOL.worn, 0.25 * fbm(x / 7, z / 7, 2));
  else { const [a, b] = qq(x, z), k = Math.floor(hash(a, b) * 6), rows = 0.5 + 0.5 * Math.sin((k % 2 ? x : z) * 4.2);
    c = _gc.copy([GCOL.corn, GCOL.beans, GCOL.stubble, GCOL.pasture, GCOL.hay, GCOL.corn][k]); if (k === 0 || k === 1 || k === 5) c.multiplyScalar(0.86 + 0.22 * rows); }
  if (slope > 0.45) c.lerp(GCOL.woods, 0.4);
  out[0] = c.r; out[1] = c.g; out[2] = c.b; }
const ME = { x: 0, y: 0, z: 0, vy: 0 };
function grid(size, n, drop, level) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, level, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(240, 120, 0, 0), grid(1600, 160, 0.25, 1), grid(9000, 150, 1.5, 2), grid(60000, 120, 8, 3)] : [grid(320, 160, 0, 0), grid(2000, 200, 0.25, 1), grid(10000, 200, 1.5, 2), grid(60000, 150, 8, 3)];
for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox, 0, oz);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = ground(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    groundColor(x, z, slope, c3); const dme = Math.hypot(x - ME.x, z - ME.z); let y = H[i] - (dme * dme) / (2 * R_E) - drop;
    if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 20 + drop * 4; }
    p.setY(i, y); col.setXYZ(i, c3[0], c3[1], c3[2]); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = true; m.geometry.computeVertexNormals(); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * (m.userData.level === 1 ? 0.05 : 0.08)) { fillGrid(m); if (!force) return; } }
// textures added for 1962: asphalt, concrete, limestone, a storefront row, painted steel, the jail's whitewashed brick
const asphaltT = tex(256, 256, (g, w, h) => { g.fillStyle = "#5a5852"; g.fillRect(0, 0, w, h); for (let k = 0; k < 9000; k++) { const c = 60 + rnd() * 70; g.fillStyle = `rgba(${c},${c},${c * 0.95},0.5)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } for (let k = 0; k < 12; k++) { g.strokeStyle = "rgba(30,30,28,0.35)"; g.lineWidth = 1 + rnd() * 2; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (rnd() - 0.5) * 50; y += (rnd() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); } });
const concT = tex(256, 256, (g, w, h) => { g.fillStyle = "#b8b4aa"; g.fillRect(0, 0, w, h); for (let k = 0; k < 5000; k++) { const c = 150 + rnd() * 60; g.fillStyle = `rgba(${c},${c},${c * 0.96},0.35)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = "rgba(60,60,55,0.5)"; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); });
const stoneT = tex(256, 256, (g, w, h) => { g.fillStyle = "#d8d0bc"; g.fillRect(0, 0, w, h); const rh = h / 4; for (let r = 0; r < 4; r++) { let x = (r % 2) * 40 - 40; while (x < w) { const bw = 70 + rnd() * 50, c = 200 + rnd() * 30; g.fillStyle = `rgb(${c},${c * 0.96},${c * 0.86})`; g.fillRect(x + 1.5, r * rh + 1.5, bw - 3, rh - 3); x += bw; } } for (let k = 0; k < 2000; k++) { g.fillStyle = `rgba(120,110,90,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const whiteBrickT = tex(256, 256, (g, w, h) => { g.fillStyle = "#c8c4b8"; g.fillRect(0, 0, w, h); const bh = h / 15, bw = w / 5; for (let r = 0; r < 15; r++) for (let k = -1; k < 6; k++) { const c = 220 + rnd() * 25; g.fillStyle = `rgb(${c},${c * 0.98},${c * 0.92})`; g.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 3); } for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(110,100,80,${0.05 + rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 20, 2 + rnd() * 6); } });
const steelT = tex(128, 128, (g, w, h) => { g.fillStyle = "#c8ccc4"; g.fillRect(0, 0, w, h); for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(90,90,80,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 10, 1); } for (const y of [0, 64]) { g.fillStyle = "rgba(60,60,55,0.5)"; g.fillRect(0, y, w, 2); for (let x = 6; x < w; x += 16) { g.fillStyle = "rgba(70,70,62,0.7)"; g.beginPath(); g.arc(x, y + 5, 2, 0, 7); g.fill(); } } });
const linoT = tex(128, 128, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? "#7a5a3a" : "#c8b890"; g.fillRect(x * 32, y * 32, 32, 32); } for (let k = 0; k < 800; k++) { g.fillStyle = `rgba(60,40,20,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [1, 1]);
const tinT = tex(128, 128, (g, w, h) => { g.fillStyle = "#6a6c6a"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x, 0, 2, h); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + 2, 0, 2, h); } for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(120,70,40,${rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 2 + rnd() * 6); } });
mk("asphalt", { map: asphaltT, roughness: 0.95 }); mk("conc", { map: concT, roughness: 0.92 }); mk("stone", { map: stoneT }); mk("wbrick", { map: whiteBrickT }); mk("steel", { map: steelT, roughness: 0.55, metalness: 0.35 }); mk("lino", { map: linoT, roughness: 0.6 }); mk("tin", { map: tinT, roughness: 0.6, metalness: 0.3 });
mk("bars", { roughness: 0.5, metalness: 0.55 }); mk("glow", { emissive: 0xfff2d0, emissiveIntensity: 0.0 });

// ---------- the streets and the railroads ----------
const ID = frame(0, 0, 0, 0);
const resample = (line, ds) => { const out = [line[0]]; for (let i = 1; i < line.length; i++) { const [ax, az] = line[i - 1], [bx, bz] = line[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / ds)); for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } return out; };
const pairs = p => { const a = []; for (let i = 0; i < p.length; i += 2) a.push([p[i], p[i + 1]]); return a; };
const SEGIDX = new Map(), segKey = (x, z) => Math.floor(x / 40) * 100000 + Math.floor(z / 40);
function indexRoad(line, hw, R) { for (let i = 1; i < line.length; i++) { const [ax, az] = line[i - 1], [bx, bz] = line[i], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 20); for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, key = segKey(x, z); if (!SEGIDX.has(key)) SEGIDX.set(key, new Set()); SEGIDX.get(key).add({ ax, az, bx, bz, hw, R }); } } }
const segD = (x, z, s) => { const dx = s.bx - s.ax, dz = s.bz - s.az, L = dx * dx + dz * dz || 1, t = clampN(((x - s.ax) * dx + (z - s.az) * dz) / L, 0, 1); return Math.hypot(x - s.ax - t * dx, z - s.az - t * dz); };
// the nearest street centre line within 40 m: the segment and the distance to it
function nearestRoad(x, z, pred = null) { let best = null, bd = 1e9; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const S = SEGIDX.get(segKey(x + a * 40, z + b * 40)); if (!S) continue; for (const s of S) { if (pred && !pred(s)) continue; const d = segD(x, z, s); if (d < bd) { bd = d; best = s; } } } return [best, bd]; }
const nearRoad = (x, z, pad = 0) => { const [s, d] = nearestRoad(x, z); return s && d < s.hw + pad; };
// a strip laid on the ground along a line, w wide, offset sideways by off (+ to the right going along the line)
function ribbon(line, w, lift, mat, col = 0xffffff, off = 0, ds = 4, dash = 0) { const P = resample(line, ds), pos = [], nor = [], uv = []; let acc = 0;
  const pt = i => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, cx = P[i][0] + nx * off, cz = P[i][1] + nz * off;
    return [[cx - nx * w / 2, cz - nz * w / 2], [cx + nx * w / 2, cz + nz * w / 2]]; };
  let prev = pt(0), pa = 0;
  for (let i = 1; i < P.length; i++) { const cur = pt(i), seg = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), a0 = acc; acc += seg; if (dash && Math.floor(a0 / dash) % 2) { prev = cur; continue; }
    const Q = [prev[0], prev[1], cur[1], cur[0]].map(([x, z]) => [x, ground(x, z) + lift, z]), U = [[a0, 0], [a0, w], [acc, w], [acc, 0]];
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...Q[k]); nor.push(0, 1, 0); uv.push(U[k][1], U[k][0]); } prev = cur; }
  if (!pos.length) return; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); put(mat, g, ID.m, col); }
// widths: highways (Route 159 on Main and Buchanan, Route 143 on Vandalia, US 66 City on St. Louis Street), through streets, residential
// streets, alleys and lanes, farm tracks. In 1962 the centre lines were white (yellow came with the 1971 national manual).
const RW = [12, 11, 10, 9, 7.5, 3.6, 3, 3.4], ROADS = [];
mk("dirt", { roughness: 1 });
function buildRoads() { for (const r of OSM_ROADS) { const L = pairs(r[3]), cls = r[0], w = RW[cls], R = { cls, name: r[1], ref: r[2], L }; ROADS.push(R); indexRoad(L, w / 2, R); }
  for (const R of ROADS) { const town = R.L.some(([x, z]) => red54(x, z)), w = RW[R.cls], dirt = R.cls === 7 || R.cls === 5 && !red54(R.L[0][0], R.L[0][1]) && hash(Math.round(R.L[0][0]), 3) < 0.6; ribbon(R.L, w, 0.1 + (R.cls <= 3 ? 0.02 : 0), dirt ? MAT.dirt : MAT.asphalt, dirt ? 0x9a8a68 : R.cls <= 2 ? 0x8a8880 : 0xa8a49a, 0, town ? 4 : 7);
    if (R.cls <= 2) ribbon(R.L, 0.12, 0.135, MAT.plain, 0xe8e6dc, 0, 3, 3);
    if (town && R.cls >= 1 && R.cls <= 4) for (const s of [-1, 1]) ribbon(R.L, 1.4, 0.16, MAT.conc, 0xffffff, s * (w / 2 + 1.6), 6); } }
// the railroads of 1962, most of them trails today: the Illinois Terminal, the Nickel Plate, the Wabash, the Litchfield & Madison, the
// Illinois Central. Ballast, ties and two rails.
const RAILS = [];
mk("ties", { map: tex(128, 128, (g, w, h) => { g.fillStyle = "#7a746a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 1500; k++) { const c = 90 + rnd() * 80; g.fillStyle = `rgba(${c},${c * 0.96},${c * 0.9},0.6)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } for (const y of [10, 74]) { g.fillStyle = "#4a3a2c"; g.fillRect(18, y, w - 36, 26); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(18, y + 22, w - 36, 4); } }), roughness: 1 });
MAT.ties.map.repeat.set(1 / 3.4, 1 / 1.2);
function buildRails() { for (const p of OSM_RAILS) { const L = pairs(p); RAILS.push(L); ribbon(L, 3.4, 0.18, MAT.ties, 0xffffff, 0, 5); for (const s of [-0.72, 0.72]) ribbon(L, 0.08, 0.32, MAT.iron, 0x6a5a4a, s, 10); } }
// ponds and lakes the 1954 map shows (Leclaire Lake, the mine ponds, farm ponds)
function buildWater() { const WM = new THREE.MeshStandardMaterial({ color: 0x4a6a6a, roughness: 0.12, metalness: 0.15 });
  for (const L of OSM_LAND) { if (L[0] !== "water" && L[0] !== "reservoir") continue; const P = pairs(L[2]); if (P.length < 4) continue; let lo = 1e9; for (const [x, z] of P) lo = Math.min(lo, ground(x, z)); const sh = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z)));
    const me = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), WM); me.position.y = lo - 0.25; me.receiveShadow = true; scene.add(me);
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cz = P.reduce((s, p) => s + p[1], 0) / P.length, r = Math.sqrt(Math.abs(THREE.ShapeUtils.area(sh.getPoints()))) / 2; pad(cx, cz, r * 0.6, r * 0.6, 0, lo - 1.2, r * 0.5); } }

// ---------- the buildings ----------
// Every building on today's map that the 1954 map also shows, standing on its true outline; the houses the 1954 map shows that are gone;
// and, where the 1954 map tints whole blocks as built up but today's map has no buildings, typical houses along the streets. Heights come
// from today's map where it gives them; otherwise houses are one, one-and-a-half or two storeys, downtown blocks two or three.
const facadeT = (kind) => tex(256, 256, (g, w, h) => {
  if (kind === "clap") { g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { const y = k * h / 14, gr = g.createLinearGradient(0, y, 0, y + h / 14); gr.addColorStop(0, "rgba(0,0,0,0.22)"); gr.addColorStop(0.15, "rgba(0,0,0,0.04)"); gr.addColorStop(1, "rgba(255,255,255,0.05)"); g.fillStyle = gr; g.fillRect(0, y, w, h / 14); } }
  else if (kind === "brick" || kind === "shop" || kind === "inst") { g.fillStyle = "#a8a090"; g.fillRect(0, 0, w, h); const rows = kind === "shop" || kind === "inst" ? 44 : 34, bh = h / rows, bw = bh * 2.6; for (let r = 0; r < rows; r++) for (let x = -(r % 2) * bw / 2; x < w; x += bw) { const c = 150 + rnd() * 50; g.fillStyle = `rgb(${c + 40},${c * 0.62},${c * 0.48})`; g.fillRect(x + 1, r * bh + 1, bw - 2, bh - 1.5); } }
  else if (kind === "stone") { g.fillStyle = "#dcd4c0"; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) { g.fillStyle = "rgba(90,80,60,0.25)"; g.fillRect(0, r * h / 8, w, 1.5); } }
  const win = (x0, y0, ww, hh, panes) => { g.fillStyle = "#f4f2ea"; g.fillRect(x0 - 5, y0 - 5, ww + 10, hh + 10); const gr = g.createLinearGradient(x0, y0, x0 + ww, y0 + hh); gr.addColorStop(0, "#2a3236"); gr.addColorStop(0.5, "#48545a"); gr.addColorStop(1, "#262c30"); g.fillStyle = gr; g.fillRect(x0, y0, ww, hh);
    g.fillStyle = "rgba(240,236,224,0.85)"; g.fillRect(x0, y0 + hh / 2 - 2, ww, 4); if (panes > 1) g.fillRect(x0 + ww / 2 - 1.5, y0, 3, hh); g.fillStyle = "rgba(235,230,215,0.5)"; g.fillRect(x0 + 2, y0 + 2, ww - 4, hh * 0.18); };
  if (kind === "clap" || kind === "brick") win(w * 0.3, h * 0.26, w * 0.4, h * 0.46, 1);
  if (kind === "shop") { win(w * 0.12, h * 0.2, w * 0.28, h * 0.55, 1); win(w * 0.6, h * 0.2, w * 0.28, h * 0.55, 1); g.fillStyle = "rgba(240,236,220,0.9)"; g.fillRect(0, h * 0.12, w, 4); }
  if (kind === "inst") win(w * 0.18, h * 0.18, w * 0.64, h * 0.56, 2);
  if (kind === "stone") win(w * 0.25, h * 0.2, w * 0.5, h * 0.55, 2); });
mk("fclap", { map: facadeT("clap") }); mk("fbrick", { map: facadeT("brick") }); mk("fshop", { map: facadeT("shop") }); mk("finst", { map: facadeT("inst") }); mk("fstone", { map: facadeT("stone") });
const storeT = tex(512, 256, (g, w, h) => { g.fillStyle = "#3a3a36"; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5a666a"); gr.addColorStop(1, "#22282a"); g.fillStyle = gr; g.fillRect(16, 30, w * 0.38, h - 30); g.fillRect(w * 0.58, 30, w * 0.38, h - 30);
  g.fillStyle = "#2a1e14"; g.fillRect(w * 0.43, 40, w * 0.12, h - 40); g.fillStyle = "#6a5a40"; g.fillRect(w * 0.445, 60, w * 0.09, 80); g.fillStyle = "#c8c0a8"; g.fillRect(0, 0, w, 26); g.fillStyle = "rgba(200,190,160,0.5)"; for (let k = 0; k < 3; k++) g.fillRect(16 + k * 60, 30, 3, h - 30); });
mk("store", { map: storeT, roughness: 0.4 });
const ROOFC = [0x4a4a4a, 0x5a5650, 0x3a3e3a, 0x6a4a3a, 0x4a5a4a, 0x2e2e30, 0x7a7266, 0x5a3a32];
const HOUSEC = [0xf4f2ec, 0xf2eedc, 0xe8e8e2, 0xf0e8c8, 0xd8e4d8, 0xe4e0d0, 0xd8dce4, 0xf0dcd0, 0xc8d4c0, 0xe8dcc0, 0xbcc8cc, 0xf4f0e0];
const BRICKC = [0xffffff, 0xf0e0d8, 0xe0d4cc, 0xd8c8b8, 0xf4ece0];
// walls along a closed outline (listed either way round), from y0 to y1, textured in bays bw wide and storeys sh high from v0
function walls(P, y0, y1, mat, col, bw = 3, sh = 3, v0 = y0) { const pos = [], nor = [], uv = [], A = THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z))), cw = A > 0; let acc = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue; let nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L; if (!cw) { nx = -nx; nz = -nz; }
    const n = Math.max(1, Math.round(L / bw)), bwi = L / n, Q = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], U = [[0, (y0 - v0) / sh], [L / bwi, (y0 - v0) / sh], [L / bwi, (y1 - v0) / sh], [0, (y1 - v0) / sh]];
    const order = cw ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]; for (const k of order) { pos.push(...Q[k]); nor.push(nx, 0, nz); uv.push(...U[k]); } acc += L; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); put(mat, g, ID.m, col); }
// a flat cap over an outline at height y (facing up)
function cap(P, y, mat, col) { const V = P.map(([x, z]) => new THREE.Vector2(x, z)), T = THREE.ShapeUtils.triangulateShape(V, []), pos = [], nor = [], uv = [];
  for (const t of T) { const tri = THREE.ShapeUtils.area([V[t[0]], V[t[1]], V[t[2]]]) > 0 ? [t[0], t[2], t[1]] : t; for (const k of tri) { pos.push(P[k][0], y, P[k][1]); nor.push(0, 1, 0); uv.push(P[k][0], P[k][1]); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); put(mat, g, ID.m, col); }
// the smallest rectangle round an outline: centre, half length along its long side, half width, and the turn of the long side
function obb(P) { let best = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.5) continue; const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, z] of P) { const u = x * ux + z * uz, v = -x * uz + z * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } const A = (u1 - u0) * (v1 - v0);
    if (!best || A < best.A) { const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; best = { A, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, hl: (u1 - u0) / 2, hw: (v1 - v0) / 2, ux, uz }; } }
  if (best.hw > best.hl) { const t = best.hw; best.hw = best.hl; best.hl = t; const ux = best.ux; best.ux = -best.uz; best.uz = ux; } return best; }
// a pitched roof over a rectangle: gable (ridge along the long side) or hip; overhang o; the gable ends in the wall surface
function roofRect(B, ye, pitch, kind, roofCol, wallMat, wallCol, o = 0.35) { const { cx, cz, ux, uz } = B, hl = B.hl + o, hw = B.hw + o, vx = -uz, vz = ux, P = (u, v, y) => [cx + ux * u + vx * v, y, cz + uz * u + vz * v], yr = ye + B.hw * pitch, yo = ye - o * pitch, F = ID, RV = a => a.slice().reverse();
  const slope = Q => poly2(F, MAT.shingle, MAT.plain, RV(Q), roofCol, 0x8a8478, 0.05);
  if (kind === "hip" && B.hl - B.hw > 0.3) { const r = hl - hw; slope([P(-hl, -hw, yo), P(hl, -hw, yo), P(r, 0, yr), P(-r, 0, yr)]); slope([P(hl, hw, yo), P(-hl, hw, yo), P(-r, 0, yr), P(r, 0, yr)]); slope([P(hl, -hw, yo), P(hl, hw, yo), P(r, 0, yr)]); slope([P(-hl, hw, yo), P(-hl, -hw, yo), P(-r, 0, yr)]); return; }
  if (kind === "hip") { slope([P(-hl, -hw, yo), P(hl, -hw, yo), P(0, 0, yr)]); slope([P(hl, -hw, yo), P(hl, hw, yo), P(0, 0, yr)]); slope([P(hl, hw, yo), P(-hl, hw, yo), P(0, 0, yr)]); slope([P(-hl, hw, yo), P(-hl, -hw, yo), P(0, 0, yr)]); return; }
  slope([P(-hl, -hw, yo), P(hl, -hw, yo), P(hl, 0, yr), P(-hl, 0, yr)]); slope([P(hl, hw, yo), P(-hl, hw, yo), P(-hl, 0, yr), P(hl, 0, yr)]);
  for (const s of [-1, 1]) { const u = s * B.hl, T = [P(u, -B.hw, ye), P(u, B.hw, ye), P(u, 0, yr - o * pitch * 0.2)]; poly(F, wallMat, s > 0 ? [T[1], T[0], T[2]] : T, wallCol); } }
const BLD = [], BGRID = new Map(), bKey = (x, z) => Math.floor(x / 25) * 100000 + Math.floor(z / 25);
function noteB(x, z, r) { const k = bKey(x, z); if (!BGRID.has(k)) BGRID.set(k, []); BGRID.get(k).push([x, z, r]); markBuilt(x, z, 1); }
function nearB(x, z, d) { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [bx, bz, r] of BGRID.get(bKey(x + a * 25, z + b * 25)) || []) if (Math.hypot(bx - x, bz - z) < d + r) return true; return false; }
const JAIL_HOLE = [];
function inHole(x, z) { return JAIL_HOLE.some(f => f(x, z)); }
const STOREFRONTS = [];
// one building on its outline. kind: house, garage, shop, inst (school, church, factory, public), big
function building(P, kind, levels, col, roofCol, seed, name = "") { let gmin = 1e9, gmax = -1e9, cx = 0, cz = 0; for (const [x, z] of P) { const g = ground(x, z); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); cx += x; cz += z; } cx /= P.length; cz /= P.length;
  const B = obb(P), fill = Math.abs(THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z)))) / (4 * B.hl * B.hw), h = k => hash(seed * 7 + k, 77);
  noteB(cx, cz, Math.min(B.hl, 12)); BLD.push({ cx, cz, kind, name, B });
  if (kind === "house" || kind === "garage") { const garage = kind === "garage", st = garage ? 0 : levels || (h(1) < 0.42 ? 1 : h(1) < 0.68 ? 1.5 : 2), floor = gmax + (garage ? 0.1 : 0.5), H = garage ? 2.6 : st === 1 ? 2.9 : st === 1.5 ? 3.4 : 5.7, brick = !garage && h(2) < 0.3;
    walls(P, gmin - 0.3, floor, MAT.conc, 0xb8b0a0); walls(P, floor, floor + H, brick ? MAT.fbrick : MAT.fclap, brick ? BRICKC[(h(3) * 5) | 0] : col, 3.2, st === 2 ? H / 2 : H, floor);
    const pitch = garage ? 0.35 : st === 1.5 ? 1.0 : st === 1 ? (h(4) < 0.5 ? 0.42 : 0.6) : 0.62, kindR = garage ? "gable" : h(5) < 0.3 && st !== 1.5 ? "hip" : "gable";
    if (fill > 0.72 && B.hw < 9) roofRect(B, floor + H, pitch, kindR, roofCol, brick ? MAT.fbrick : MAT.clap, brick ? BRICKC[(h(3) * 5) | 0] : col); else { cap(P, floor + H, MAT.tar, 0x6a6a66); walls(P, floor + H, floor + H + 0.25, MAT.plain, 0xd8d4c8); }
    if (!garage && h(6) < 0.55) { const s = B.hw > 3.5 ? 1 : 0, chx = B.cx + B.ux * B.hl * 0.45 * (h(7) < 0.5 ? -1 : 1), chz = B.cz + B.uz * B.hl * 0.45 * (h(7) < 0.5 ? -1 : 1); box(ID, MAT.brick, chx, floor + H + B.hw * pitch * 0.7, chz, 0.55, B.hw * pitch * 1.4 + 1.2, 0.55, 0xffffff); } return; }
  if (kind === "shop") { const st = levels || (h(1) < 0.55 ? 2 : h(1) < 0.85 ? 3 : 1), floor = gmax + 0.1, H = st * 4.0 + 0.4;
    walls(P, gmin - 0.3, floor, MAT.conc, 0xa8a090); walls(P, floor + 3.9, floor + H, st > 1 ? MAT.fshop : MAT.brick, col, 3.6, 4.0, floor + 3.9); walls(P, floor, floor + 3.9, MAT.brick, col);
    walls(P, floor + H, floor + H + 0.8, MAT.brick, col); cap(P, floor + H + 0.15, MAT.tar, 0x5a5a56); STOREFRONTS.push({ P, floor, col, seed, name }); return; }
  const st = levels || (kind === "inst" ? 2 : 1), floor = gmax + 0.3, H = st * 4.2, stone = kind === "stone";
  walls(P, gmin - 0.3, floor, MAT.conc, 0xa8a090); walls(P, floor, floor + H, stone ? MAT.fstone : MAT.finst, stone ? 0xffffff : col, 3.4, 4.2, floor);
  if (kind === "church" && fill > 0.6 && B.hw < 14) { roofRect(B, floor + H, 1.1, "gable", 0x3a3a3c, MAT.brick, col, 0.3); return B; }
  if (fill > 0.8 && B.hw < 12 && kind !== "big") roofRect(B, floor + H, 0.32, "hip", roofCol, MAT.brick, col); else { cap(P, floor + H + 0.1, MAT.tar, 0x5a5a56); walls(P, floor + H, floor + H + 0.6, stone ? MAT.stone : MAT.brick, col); } return B; }
// storefronts on the sides of downtown blocks that face a street: plate glass, a recessed door, a sign band, an awning on some
const SIGNS = ["DRUGS", "HARDWARE", "CAFE", "SHOES", "JEWELRY", "BARBER SHOP", "FURNITURE", "DRY GOODS", "BAKERY", "INSURANCE", "TAVERN", "FIVE & TEN", "CLOTHING", "GROCERY", "APPLIANCES", "LOANS", "TV & RADIO", "FLORIST", "HATS", "OFFICE SUPPLY", "SHOE REPAIR", "PAINT & WALLPAPER", "SPORTING GOODS", "LUNCHEONETTE"];
const SIGNBG = ["#1e2a3a", "#f2ece0", "#7a1e1a", "#1e3a2a"], signAtlas = tex(512, 32 * SIGNS.length * 2, (g, w, h) => { for (let i = 0; i < SIGNS.length; i++) for (let c = 0; c < 4; c++) { const x = (c % 2) * 256, y = (i * 2 + (c >> 1)) * 32; g.fillStyle = SIGNBG[c]; g.fillRect(x, y, 256, 32); g.fillStyle = c === 1 ? "#2a1e14" : "#f4ecd8"; g.font = "bold 20px Futura, 'Trebuchet MS', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(SIGNS[i], x + 128, y + 17); } });
signAtlas.wrapS = signAtlas.wrapT = THREE.ClampToEdgeWrapping; signAtlas.repeat.set(1, 1); mk("signs", { map: signAtlas, roughness: 0.6 });
// a sign board: text i of SIGNS on background c, w by h, placed in frame F at (x, y, z) facing the frame's +Z
function signBoard(F, i, c, x, y, z, w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, n = SIGNS.length * 2, u0 = (c % 2) * 0.5, v1 = 1 - (i * 2 + (c >> 1)) / n, v0 = v1 - 1 / n; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * 0.5, v0 + uv.getY(k) * (v1 - v0)); put(MAT.signs, g, F.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)), 0xffffff); }
function buildStorefronts() { const awnC = [0x2a5a3a, 0x8a2a24, 0x2a3a6a, 0xd8d0b8, 0x5a5a5a, 0x7a5a2a];
  for (const S of STOREFRONTS) { const P = S.P; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 4) continue; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, [s, d] = nearestRoad(mx, mz); if (!s || d > s.hw + 9 || s.R.cls > 4) continue;
      let nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L; if (segD(mx + nx, mz + nz, s) > d) { nx = -nx; nz = -nz; }
      const ry = Math.atan2(nx, nz), F = frame(mx + nx * 0.06, mz + nz * 0.06, S.floor, ry), n = Math.max(1, Math.round(L / 7.5)), wseg = L / n;
      for (let k = 0; k < n; k++) { const xc = -L / 2 + wseg * (k + 0.5), hk = hash(S.seed * 31 + k, i * 7 + 3); box(F, MAT.store, xc, 1.55, 0.04, wseg - 0.3, 3.1, 0.08, 0xffffff);
        if (hk < 0.55) box(F, MAT.cloth, xc, 3.15, 0.75, wseg - 0.5, 0.06, 1.5, awnC[(hk * 11 | 0) % awnC.length], -0.32);
        signBoard(F, (hash(S.seed * 13 + k, i) * SIGNS.length) | 0, (hk * 37 | 0) % 4, xc, 3.55, 0.1, Math.min(wseg - 0.8, 5), 0.6); } } } }
const shopCol = [0xffffff, 0xf0d8c8, 0xe0c0a8, 0xd8b8a0, 0xc8a890, 0xf4e8d8, 0xe8d0b0];
function buildTown() {
  for (const b of OSM_BLDS) { const [k0, lv, red, name] = b, P = pairs(b[4]).slice(0, -1); if (P.length < 3) continue; let cx = 0, cz = 0; for (const [x, z] of P) { cx += x; cz += z; } cx /= P.length; cz /= P.length; if (inHole(cx, cz)) continue;
    const A = Math.abs(THREE.ShapeUtils.area(P.map(([x, z]) => new THREE.Vector2(x, z)))), seed = Math.round(cx * 13 + cz * 7);
    let kind = "house"; if (k0 === "garage" || k0 === "shed" || A < 30) kind = "garage"; else if (/church|chapel/i.test(name) || k0 === "church") kind = "church"; else if (/Courthouse/.test(name)) kind = "stone";
    else if (k0 === "school" || k0 === "university" || k0 === "college" || k0 === "public" || k0 === "industrial" || k0 === "warehouse" || k0 === "hospital" || k0 === "dormitory" || A > 600) kind = A > 2500 ? "big" : "inst";
    else if (red && (k0 === "commercial" || k0 === "retail" || k0 === "office" || k0 === "yes" && (A > 140 || lv >= 2)) && nearestRoad(cx, cz)[1] < 30 && Math.hypot(cx + 300, cz + 120) < 650) kind = "shop";
    else if (A > 260 && k0 !== "house") kind = "inst";
    const col = kind === "house" ? HOUSEC[(hash(seed, 1) * HOUSEC.length) | 0] : kind === "shop" ? shopCol[(hash(seed, 2) * shopCol.length) | 0] : 0xf0e4d8;
    const Bc = building(P, kind, kind === "house" ? Math.min(lv, 2.5) : lv, col, ROOFC[(hash(seed, 3) * ROOFC.length) | 0], seed, name);
    if (kind === "church" && Bc) churchTower(Bc, P, col); }
  // beside the jail, buildings of the Sanborn map that the county administration building has since replaced: stores on North Main, the
  // interurban's waiting room and express office, the county power house of 1916
  for (const [kind, lv, name, P] of SB_BLDS) { const seed = Math.round(P[0][0] * 13 + P[0][1] * 7); building(P, kind, lv, kind === "shop" ? shopCol[(hash(seed, 2) * shopCol.length) | 0] : kind === "house" ? 0xe8e0c8 : 0xf0e4d8, 0x4a4a4a, seed, name); }
  // houses on the 1954 map that are gone today: a typical house of the size the map's symbol stands for, facing the nearest street
  for (const [x, z] of RECON_HOUSES) { if (inHole(x, z)) continue; const [s, d] = nearestRoad(x, z); if (s && d < s.hw + 3.5) continue; houseAt(x, z, s || { ax: 0, az: 0, bx: Math.cos(hash(Math.round(x), 5) * 3), bz: Math.sin(hash(Math.round(x), 5) * 3) }, Math.round(x * 3 + z * 11), true); }
  // whole blocks the 1954 map tints as built up where today's map has no buildings: houses along the streets every 15 m or so
  for (const R of ROADS) { if (R.cls !== 4 && R.cls !== 3) continue; const L = resample(R.L, 15), hw = RW[R.cls] / 2;
    for (let i = 1; i < L.length - 1; i++) { const [ax, az] = L[i - 1], [bx, bz] = L[i + 1], dl = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / dl, uz = (bz - az) / dl;
      for (const sd of [-1, 1]) { const off = hw + 11.5, x = L[i][0] - uz * off * sd, z = L[i][1] + ux * off * sd; if (!red54(x, z) || woodsAt(x, z) || inHole(x, z) || nearB(x, z, 9)) continue; const [s2, d2] = nearestRoad(x, z); if (s2 && d2 < s2.hw + 6) continue; if (Math.hypot(x + 300, z + 120) < 260) continue; if (inPark(x, z)) continue;
        houseAt(x, z, s2 || { ax, az, bx, bz }, Math.round(x * 5 + z * 3), false); } } } }
const PARKS = OSM_LAND.filter(L => L[0] === "park" || L[0] === "cemetery").map(L => pairs(L[2]));
const pip = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
function inPark(x, z) { return PARKS.some(P => pip(x, z, P)); }
const RECON_N = { gone: 0, fill: 0 };
function houseAt(x, z, s, seed, gone) { const dx = s.bx - s.ax, dz = s.bz - s.az, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, w = 7 + 3 * hash(seed, 4), d = 8.5 + 3.5 * hash(seed, 5), vx = -uz, vz = ux;
  const P = [[x - ux * w / 2 - vx * d / 2, z - uz * w / 2 - vz * d / 2], [x + ux * w / 2 - vx * d / 2, z + uz * w / 2 - vz * d / 2], [x + ux * w / 2 + vx * d / 2, z + uz * w / 2 + vz * d / 2], [x - ux * w / 2 + vx * d / 2, z - uz * w / 2 + vz * d / 2]];
  building(P, "house", 0, HOUSEC[(hash(seed, 1) * HOUSEC.length) | 0], ROOFC[(hash(seed, 3) * ROOFC.length) | 0], seed); RECON_N[gone ? "gone" : "fill"]++;
  if (hash(seed, 9) < 0.5) { const gx = x + vx * (d / 2 + 6) + ux * (w / 2 - 1.5), gz = z + vz * (d / 2 + 6) + uz * (w / 2 - 1.5); if (!nearRoad(gx, gz, 2)) building([[gx - ux * 2.8 - vx * 3, gz - uz * 2.8 - vz * 3], [gx + ux * 2.8 - vx * 3, gz + uz * 2.8 - vz * 3], [gx + ux * 2.8 + vx * 3, gz + uz * 2.8 + vz * 3], [gx - ux * 2.8 + vx * 3, gz - uz * 2.8 + vz * 3]], "garage", 0, 0xe8e4d8, 0x4a4a4a, seed + 1); } }
// a church tower and spire at the end of the nave nearest the street
function churchTower(B, P, col) { const ends = [-1, 1].map(s => [B.cx + B.ux * B.hl * s, B.cz + B.uz * B.hl * s]), e = ends.map(([x, z]) => nearestRoad(x, z)[1]), s = e[0] < e[1] ? -1 : 1, tx = B.cx + B.ux * (B.hl - 2.2) * s, tz = B.cz + B.uz * (B.hl - 2.2) * s, g = ground(tx, tz) + 0.3, ry = Math.atan2(B.ux, B.uz), F = frame(tx, tz, g, ry);
  box(F, MAT.brick, 0, 9, 0, 4.4, 18, 4.4, col); box(F, MAT.plain, 0, 18.2, 0, 4.8, 0.5, 4.8, 0xe8e2d4); for (const [a, b] of [[0, 2.21], [0, -2.21], [2.21, 0], [-2.21, 0]]) box(F, MAT.plain, a, 15.5, b, a ? 0.06 : 1.2, 2.4, a ? 1.2 : 0.06, 0x2a2420);
  const g2 = new THREE.ConeGeometry(2.6, 12, 8); g2.rotateY(Math.PI / 8); put(MAT.shingle, g2, F.m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 24.5, 0)), 0x3a3a3c); box(F, MAT.iron, 0, 31.2, 0, 0.08, 1.6, 0.08, 0x2a2a2a); box(F, MAT.iron, 0, 31.4, 0, 0.7, 0.08, 0.08, 0x2a2a2a); }

// ---------- trees: yard and street trees in town (elms, maples, oaks; the elms not yet killed off by the Dutch elm disease that reached
// Edwardsville in the 1960s), the woods the 1954 map shows on the ravines and along the creeks ----------
function treeGeo(kind) { const parts = [], add = (g, col, m) => { const q = (g.index ? g.toNonIndexed() : g).applyMatrix4(m), n = q.attributes.position.count, c = new Float32Array(n * 3), cc = new THREE.Color(col); for (let i = 0; i < n; i++) { const sh = 0.82 + 0.3 * hash(i, kind + 3); c.set([cc.r * sh, cc.g * sh, cc.b * sh], i * 3); } q.setAttribute("color", new THREE.BufferAttribute(c, 3)); q.deleteAttribute("uv"); parts.push(q); };
  const T = (x, y, z, s = 1, sy = s) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion(), V3(s, sy, s));
  if (kind === 0) { add(new THREE.CylinderGeometry(0.22, 0.35, 7, 6), 0x4a3c2e, T(0, 3.5, 0)); for (const [x, y, z, r] of [[0, 9.5, 0, 4.2], [2.6, 8.4, 0.8, 3], [-2.4, 8.6, -0.9, 3.1], [0.6, 8.2, -2.6, 2.9], [-0.8, 8, 2.5, 2.9], [0, 11.6, 0, 3]]) add(new THREE.IcosahedronGeometry(r, 0), 0x4a6e2e, T(x, y, z, 1, 0.78)); }
  else if (kind === 1) { add(new THREE.CylinderGeometry(0.18, 0.28, 4, 6), 0x4a3e32, T(0, 2, 0)); for (const [x, y, z, r] of [[0, 6, 0, 3.4], [1.6, 5.2, 0.6, 2.4], [-1.5, 5.4, -0.5, 2.4], [0.3, 7.3, -0.4, 2.3]]) add(new THREE.IcosahedronGeometry(r, 0), 0x3e6a2a, T(x, y, z)); }
  else if (kind === 2) { add(new THREE.CylinderGeometry(0.3, 0.45, 5, 6), 0x463a2e, T(0, 2.5, 0)); for (const [x, y, z, r] of [[0, 8, 0, 4.6], [3, 7, 1, 3.2], [-3, 7.2, -0.6, 3.4], [0.8, 6.8, -3, 3.1], [-0.6, 7, 3, 3]]) add(new THREE.IcosahedronGeometry(r, 0), 0x3a5e26, T(x, y, z, 1, 0.8)); }
  else { add(new THREE.CylinderGeometry(0.12, 0.2, 2, 5), 0x4a3a2a, T(0, 1, 0)); for (const [y, r, h] of [[2.6, 2.2, 3.6], [4.6, 1.7, 3.2], [6.4, 1.1, 2.6]]) add(new THREE.ConeGeometry(r, h, 7), 0x2e4a2a, T(0, y, 0)); }
  let n = 0; for (const q of parts) n += q.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const q of parts) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); col.set(q.attributes.color.array, o * 3); o += q.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g; }
const TREEMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), TMAX = IS_HEADSET ? 4000 : 8000, TREE_R = IS_HEADSET ? 500 : 700;
const TREES = [0, 1, 2, 3].map(k => { const m = new THREE.InstancedMesh(treeGeo(k), TREEMAT, TMAX); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; scene.add(m); return m; });
const TOWN_TREES = [];
function plantTownTrees() { for (const b of BLD) { if (b.kind !== "house") continue; const s = Math.round(b.cx * 7 + b.cz * 3); for (let k = 0; k < 2; k++) { if (hash(s, k + 20) > 0.62) continue; const a = hash(s, k + 30) * 6.283, r = Math.max(b.B.hl, b.B.hw) + 4 + 6 * hash(s, k + 40), x = b.cx + Math.cos(a) * r, z = b.cz + Math.sin(a) * r;
      if (nearRoad(x, z, 1.5) || nearB(x, z, 2.5) || inHole(x, z)) continue; TOWN_TREES.push([x, z, hash(s, k + 50) < 0.35 ? 0 : hash(s, k + 50) < 0.7 ? 1 : hash(s, k + 50) < 0.9 ? 2 : 3, 0.75 + 0.5 * hash(s, k + 60)]); } } }
let treeC = [1e12, 1e12];
function fillTrees() { treeC = [ME.x, ME.z]; const S = 7.5, cnt = [0, 0, 0, 0], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), sc = V3(1, 1, 1), pp = V3(0, 0, 0);
  const plant = (k, x, z, s, a) => { if (cnt[k] >= TMAX) return; q.setFromAxisAngle(V3(0, 1, 0), a); sc.set(s, s * (0.85 + 0.3 * hash(Math.round(x), Math.round(z))), s); TREES[k].setMatrixAt(cnt[k], m4.compose(pp.set(x, ground(x, z) - 0.2, z), q, sc)); col.setHSL(0.24 + 0.06 * hash(Math.round(z), 5), 0.35, 0.42 + 0.14 * hash(Math.round(x), 6)); TREES[k].setColorAt(cnt[k], col); cnt[k]++; };
  for (const [x, z, k, s] of TOWN_TREES) if (Math.abs(x - ME.x) < TREE_R && Math.abs(z - ME.z) < TREE_R) plant(k, x, z, s, x);
  const i0 = Math.floor((ME.x - TREE_R) / S), i1 = Math.floor((ME.x + TREE_R) / S), j0 = Math.floor((ME.z - TREE_R) / S), j1 = Math.floor((ME.z + TREE_R) / S);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const x = (i + hash(i, j)) * S, z = (j + hash(j, i + 7)) * S; if (!woodsAt(x, z) || hash(i * 3, j * 5) < 0.12) continue; if (nearRoad(x, z, 2) || nearB(x, z, 3) || inHole(x, z)) continue; const r = hash(i + 11, j); plant(r < 0.4 ? 2 : r < 0.75 ? 1 : r < 0.92 ? 0 : 3, x, z, 0.8 + 0.6 * hash(i, j + 3), r * 9); }
  TREES.forEach((m, k) => { m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }); }
// wooden utility poles along the town streets, a crossarm and insulators on each
const POLES = new THREE.InstancedMesh(mergeG([[new THREE.CylinderGeometry(0.13, 0.17, 10, 5, 1, true), MT(0, 5, 0)], [new THREE.BoxGeometry(2.4, 0.12, 0.12), MT(0, 9.3, 0)], [new THREE.BoxGeometry(0.08, 0.2, 0.08), MT(-1, 9.45, 0)], [new THREE.BoxGeometry(0.08, 0.2, 0.08), MT(1, 9.45, 0)]]), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9, vertexColors: true }), 4000);
POLES.castShadow = true; POLES.count = 0; scene.add(POLES);
function buildPoles() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); let n = 0; for (const R of ROADS) { if (R.cls < 1 || R.cls > 4 || !R.L.some(([x, z]) => red54(x, z) || builtAt(x, z))) continue; const L = resample(R.L, 38), hw = RW[R.cls] / 2;
    for (let i = 1; i < L.length; i++) { const [ax, az] = L[i - 1], [bx, bz] = L[i], d = Math.hypot(bx - ax, bz - az) || 1, x = bx + (bz - az) / d * (hw + 2.6), z = bz - (bx - ax) / d * (hw + 2.6); if (n >= 4000 || nearB(x, z, 1)) continue; q.setFromAxisAngle(V3(0, 1, 0), Math.atan2(bx - ax, bz - az) + Math.PI / 2); POLES.setMatrixAt(n++, m4.compose(V3(x, ground(x, z) - 0.3, z), q, V3(1, 1, 1))); } } POLES.count = n; POLES.instanceMatrix.needsUpdate = true; }
const PICS = [];
function picture(F, x, y, z, w, h, ry, draw, frameC = 0x3a2416) { const t = tex(128, Math.round(128 * h / w), draw); const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  const p = toWorld(F, x, y, z); me.position.copy(p); me.rotation.y = F.ry + ry; scene.add(me); PICS.push(me); const n = V3(Math.sin(ry), 0, Math.cos(ry));
  box(F, MAT.plain, x - n.x * 0.026, y, z - n.z * 0.026, Math.abs(n.z) > 0.5 ? w + 0.08 : 0.03, h + 0.08, Math.abs(n.z) > 0.5 ? 0.03 : w + 0.08, frameC); }
function chairB(F, x, z, ry, col = 0x4a2e1a) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.17, 0.17], [0.17, 0.17]]) { const [px, pz] = L(dx, dz); cyl(F, MAT.plain, px, 0.22, pz, 0.014, 0.016, 0.44, col, 6); }
  const [cx, cz] = L(0, 0); cyl(F, MAT.plain, cx, 0.45, cz, 0.21, 0.21, 0.03, col, 12); const [bx, bz] = L(0, 0.19); box(F, MAT.plain, bx, 0.72, bz, 0.4, 0.5, 0.025, col, 0, ry, 0); }
function bedIron(F, x, z, w, l, ry, quilt = 0xe8e0d0, col = 0x2a2a2e) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  const [cx, cz] = L(0, l / 2); box(F, MAT.cloth, cx, 0.5, cz, w, 0.2, l, 0xf0ece4, 0, ry, 0); box(F, MAT.cloth, cx, 0.62, cz + 0.0, w + 0.04, 0.05, l * 0.8, quilt, 0, ry, 0); const [px, pz] = L(0, 0.22); box(F, MAT.cloth, px, 0.66, pz, w * 0.85, 0.12, 0.35, 0xfaf8f2, 0, ry, 0);
  for (const [dz, hh] of [[0, 1.25], [l, 0.9]]) { for (const dx of [-w / 2, w / 2]) { const [qx, qz] = L(dx, dz); cyl(F, MAT.iron, qx, hh / 2, qz, 0.022, 0.022, hh, col, 6); } const [rx, rz] = L(0, dz); box(F, MAT.iron, rx, hh - 0.03, rz, w, 0.03, 0.03, col, 0, ry, 0); box(F, MAT.iron, rx, 0.42, rz, w, 0.03, 0.03, col, 0, ry, 0);
    for (let k = 1; k < 6; k++) { const [vx, vz] = L(-w / 2 + k * w / 6, dz); cyl(F, MAT.iron, vx, (hh + 0.42) / 2, vz, 0.01, 0.01, hh - 0.42, col, 5); } } }
function table(F, x, z, w, d, h, top = 0x7a5232, cloth = null) { box(F, MAT.plain, x, h - 0.02, z, w, 0.04, d, top); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(F, MAT.plain, x + sx * (w / 2 - 0.05), (h - 0.04) / 2, z + sz * (d / 2 - 0.05), 0.05, h - 0.04, 0.05, top);
  if (cloth) box(F, cloth === "oil" ? MAT.oil : MAT.cloth, x, h + 0.003, z, w + 0.12, 0.006, d + 0.12, cloth === "oil" ? 0xffffff : cloth); }

// ---------- the Madison County Sheriff's House and Jail, 210 North Main Street ----------
// Built 1869-71 to Alonzo Keller's design; the cell block enlarged in 1904-05; used until 1979, torn down in 1982. The frame JF stands at
// the front corner of the sheriff's house traced off Sanborn sheet 4: X along the front (46 ft, as the sheet marks it), Z back from Main
// Street. Behind the house the two-storey jail of 1869 (16-inch brick walls, steam heat and electric light, says the sheet), and behind
// that and on its south side the 1904-05 addition; to the north a small two-storey building marked JAIL with a kitchen, and a frame shed.
const JO = JAIL.dwell[1], JXd = [JAIL.dwell[0][0] - JO[0], JAIL.dwell[0][1] - JO[1]], JXL = Math.hypot(...JXd), JUX = JXd[0] / JXL, JUZ = JXd[1] / JXL, JRY = Math.atan2(-JUZ, JUX);
const JW = (X, Z) => [JO[0] + JUX * X - JUZ * Z, JO[1] + JUZ * X + JUX * Z];
const JY = ground(...JW(6.85, 4)), JF = frame(JO[0], JO[1], JY, JRY), sub = (F, dy) => frame(F.x, F.z, F.y + dy, F.ry);
{ const [cx, cz] = JW(9, 13); pad(cx, cz, 19, 23, JRY, JY, 8); }
JAIL_HOLE.push((x, z) => { const dx = x - JO[0], dz = z - JO[1], X = dx * JUX + dz * JUZ, Z = -dx * JUZ + dz * JUX; return X > -4.2 && X < 27.5 && Z > -4 && Z < 33.5; });
const F1 = 0.6, F2 = 4.6, J1 = 0.6, J2 = 5.2, JTOP = 10.4, T = 0.45, TI = 0.15;
const BRICK_OUT = 0xf0d8cc, JAILBRICK = 0xd8c0b0, PLASTER = 0xf2ece0, WASH = 0xf4f0e6, IRON = 0x34383a, CELLGREY = 0x9aa4a0;
const OPEN = [];
// iron straps riveted into a lattice: along X at z = at (line "z") or along Z at x = at (line "x"), from a0 to a1 and y0 to y1; doors are gaps
// with a lattice leaf, shut (you cannot pass) or standing open; plate: the bottom so many metres sheathed in plate iron
function lattice(F, line, at, a0, a1, y0, y1, o = {}) { const sp = o.sp || 0.15, hs = o.hs || 0.45, col = o.col || IRON, doors = o.doors || [], plate = o.plate || 0;
  const B = (c, y, n, sa, sy, sn, mat = MAT.bars, cc = col) => line === "z" ? box(F, mat, c, y, n, sa, sy, sn, cc) : box(F, mat, n, y, c, sn, sy, sa, cc);
  const pieces = []; let a = a0; for (const d of doors.slice().sort((p, q) => p.c - q.c)) { pieces.push([a, d.c - d.w / 2]); a = d.c + d.w / 2; } pieces.push([a, a1]);
  const grid = (p0, p1, yb, yt, n = at) => { if (p1 - p0 < 0.02) return; const k = Math.max(1, Math.round((p1 - p0) / sp)); for (let i = 0; i <= k; i++) B(p0 + (p1 - p0) * i / k, (yb + yt) / 2, n, 0.024, yt - yb, 0.024);
    for (let y = yb; y <= yt + 1e-6; y += hs) B((p0 + p1) / 2, Math.min(y, yt), n, p1 - p0, 0.05, 0.014); B((p0 + p1) / 2, yt, n, p1 - p0, 0.07, 0.03); };
  for (const [p0, p1] of pieces) { grid(p0, p1, y0, y1); if (plate) B((p0 + p1) / 2, y0 + plate / 2, at, p1 - p0, plate, 0.012, MAT.steel, 0x6a706c);
    if (o.collide !== false && p1 - p0 > 0.02) line === "z" ? wallSeg(F, p0, at, p1, at, y0 - 0.6, y1) : wallSeg(F, at, p0, at, p1, y0 - 0.6, y1); }
  for (const d of doors) { B(d.c - d.w / 2, (y0 + y1) / 2, at, 0.06, y1 - y0, 0.06); B(d.c + d.w / 2, (y0 + y1) / 2, at, 0.06, y1 - y0, 0.06); const dh = Math.min(2.05, y1 - y0 - 0.1);
    if (!d.open) { const k = Math.max(1, Math.round(d.w / sp)); for (let i = 1; i < k; i++) B(d.c - d.w / 2 + d.w * i / k, y0 + dh / 2, at, 0.022, dh, 0.022); for (let y = y0 + 0.1; y < y0 + dh; y += 0.4) B(d.c, y, at, d.w, 0.05, 0.016); B(d.c + d.w * 0.35, y0 + 1.05, at, 0.1, 0.22, 0.09, MAT.steel, 0x50585a);
      line === "z" ? wallSeg(F, d.c - d.w / 2, at, d.c + d.w / 2, at, y0 - 0.6, y1) : wallSeg(F, at, d.c - d.w / 2, at, d.c + d.w / 2, y0 - 0.6, y1); }
    else { const n = at + (d.side || 1) * d.w / 2, hx = d.c - d.w / 2; if (line === "z") { for (let i = 0; i <= 5; i++) box(F, MAT.bars, hx + 0.02, y0 + dh / 2, at + (d.side || 1) * (0.05 + i * (d.w - 0.1) / 5), 0.022, dh, 0.022, col); for (let y = y0 + 0.1; y < y0 + dh; y += 0.4) box(F, MAT.bars, hx + 0.02, y, n, 0.016, 0.05, d.w, col); }
      else { for (let i = 0; i <= 5; i++) box(F, MAT.bars, at + (d.side || 1) * (0.05 + i * (d.w - 0.1) / 5), y0 + dh / 2, hx + 0.02, 0.022, dh, 0.022, col); for (let y = y0 + 0.1; y < y0 + dh; y += 0.4) box(F, MAT.bars, n, y, hx + 0.02, d.w, 0.05, 0.016, col); } } } }
// a riveted steel plate wall (the 1904 cells), along X or Z, solid
function plateWall(F, line, at, a0, a1, y0, y1, col = CELLGREY) { const L = a1 - a0, c = (a0 + a1) / 2; if (line === "z") { box(F, MAT.steel, c, (y0 + y1) / 2, at, L, y1 - y0, 0.03, col); wallSeg(F, a0, at, a1, at, y0 - 0.6, y1); } else { box(F, MAT.steel, at, (y0 + y1) / 2, c, 0.03, y1 - y0, L, col); wallSeg(F, at, a0, at, a1, y0 - 0.6, y1); } }
// a wall of brick: outside face brick, inside whitewashed or plastered; openings from op()
function bwall(F, ax, az, bx, bz, y0, y1, inSide, inMat = MAT.wbrick, inCol = WASH, outCol = BRICK_OUT, t = T) { const P = inSide > 0 ? [inMat, inCol, MAT.brick, outCol] : [MAT.brick, outCol, inMat, inCol]; wallLine(F, ax, az, bx, bz, y0, y1, t, P[0], P[1], P[2], P[3], true, false); }
function barredWindow(F, o, t) { windowAt(F, o, o.base, t, 0xe8e2d4, 0xd8d2c4); const alongX = o.line === "z", n = Math.round(o.w / 0.12);
  for (let k = 1; k < n; k++) { const c = o.c - o.w / 2 + o.w * k / n; alongX ? box(F, MAT.bars, c, o.base + o.b + o.h / 2, o.at - (o.in || 1) * 0.12, 0.028, o.h, 0.028, IRON) : box(F, MAT.bars, o.at - (o.in || 1) * 0.12, o.base + o.b + o.h / 2, c, 0.028, o.h, 0.028, IRON); }
  for (const f of [0.33, 0.66]) alongX ? box(F, MAT.bars, o.c, o.base + o.b + o.h * f, o.at - (o.in || 1) * 0.12, o.w, 0.05, 0.02, IRON) : box(F, MAT.bars, o.at - (o.in || 1) * 0.12, o.base + o.b + o.h * f, o.c, 0.02, 0.05, o.w, IRON); }
// a slab with rectangular holes: x0..x1, z0..z1 at y (its top), th thick
function slab(F, mat, col, x0, z0, x1, z1, y, th, holes = []) { const xs = [x0, x1, ...holes.flatMap(h => [h[0], h[2]])].sort((a, b) => a - b), zs = [z0, z1, ...holes.flatMap(h => [h[1], h[3]])].sort((a, b) => a - b);
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) { const a = xs[i], b = xs[i + 1], c = zs[j], d = zs[j + 1]; if (b - a < 0.01 || d - c < 0.01 || a < x0 - 1e-6 || b > x1 + 1e-6 || c < z0 - 1e-6 || d > z1 + 1e-6) continue; const mx = (a + b) / 2, mz = (c + d) / 2; if (holes.some(h => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue; box(F, mat, mx, y - th / 2, mz, b - a, th, d - c, col); } }
// stairs: n steps from (x0, z0) at y0 rising to y1 along +Z or -Z (dir), w wide centred at x
function stairs(F, x, w, z0, z1, y0, y1, mat, col, side = 0x5a4030, iron = false) { const n = Math.round((y1 - y0) / 0.19), dz = (z1 - z0) / n, dy = (y1 - y0) / n;
  for (let k = 0; k < n; k++) { box(F, mat, x, y0 + dy * (k + 1) - 0.025, z0 + dz * (k + 0.5), w, 0.05, Math.abs(dz) + 0.02, col); if (!iron) box(F, mat, x, y0 + dy * (k + 0.5), z0 + dz * k + (dz > 0 ? 0.01 : -0.01), w, dy, 0.02, col); }
  const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0); for (const s of [-1, 1]) box(F, iron ? MAT.bars : MAT.plain, x + s * (w / 2 + 0.03), (y0 + y1) / 2 + 0.1, (z0 + z1) / 2, 0.05, 0.28, L, side, -a);
  const lo = Math.min(z0, z1), hi = Math.max(z0, z1); floorRect(F, x - w / 2, lo, x + w / 2, hi, z1 > z0 ? y0 : y1, { y2: z1 > z0 ? y1 : y0, along: "z" }); }
function light(F, x, y, z, I = 1.2, d = 10) { const L = new THREE.PointLight(0xfff0d0, I, d, 1.6); L.position.copy(toWorld(F, x, y, z)); scene.add(L); cyl(F, MAT.glow, x, y + 0.05, z, 0.06, 0.06, 0.12, 0xfff4d8, 8); return L; }
const JLIGHTS = [];

function buildJail() { const F = JF;
  // ---- the sheriff's house: Second Empire, brick, two storeys and a mansard (the Sanborn's "2 1/2"), 46 by 31 ft ----
  const HX = 13.7, HZ = 9.4;
  for (const [x, w] of [[2.8, 1.0], [10.9, 1.0]]) { op("z", T / 2, x, w, F1 + 0.65, 2.3); op("z", T / 2, x, w, F2 + 0.6, 2.2); }
  op("z", T / 2, 6.85, 1.3, F1, 2.85, { door: true }); op("z", T / 2, 6.85, 1.0, F2, 2.6, { door: true });
  for (const z of [2.6]) { op("x", T / 2, z, 1.0, F1 + 0.65, 2.3); op("x", HX - T / 2, z, 1.0, F1 + 0.65, 2.3); }
  for (const z of [2.6, 6.8]) { op("x", T / 2, z, 1.0, F2 + 0.6, 2.2); op("x", HX - T / 2, z, 1.0, F2 + 0.6, 2.2); }
  op("x", T / 2, 7.0, 0.95, F1, 2.4, { door: true }); op("x", HX - T / 2, 7.4, 0.95, F1, 2.4, { door: true }); op("z", HZ - T / 2, 6.5, 0.95, F1, 2.3, { door: true });
  bwall(F, 0, T / 2, HX, T / 2, -0.4, 8.8, 1, MAT.plaster, PLASTER); bwall(F, T / 2, T, T / 2, HZ - T, -0.4, 8.8, 1, MAT.plaster, PLASTER); bwall(F, HX - T / 2, T, HX - T / 2, HZ - T, -0.4, 8.8, -1, MAT.plaster, PLASTER);
  bwall(F, 0, HZ - T / 2, 2.0, HZ - T / 2, -0.4, 8.8, -1, MAT.plaster, PLASTER); bwall(F, 13.4, HZ - T / 2, HX, HZ - T / 2, -0.4, 8.8, -1, MAT.plaster, PLASTER);
  wallLine(F, 2.0, HZ - T / 2, 13.4, HZ - T / 2, -0.4, JTOP, T, MAT.wbrick, WASH, MAT.plaster, PLASTER, true, false);
  for (const o of OPS.filter(o => !o.door && (o.at === T / 2 || o.at === HX - T / 2) && o.b < 9)) windowAt(F, { ...o, b: o.b - (o.b > F2 ? F2 : F1), out: o.line === "z" ? -1 : (o.at < 1 ? -1 : 1) }, o.b > F2 ? F2 : F1, T, 0xe8e2d4, 0xd8ccb4);
  // stone hoods over the windows, sills below
  for (const o of OPS.filter(o => !o.door && (o.at === T / 2 || o.at === HX - T / 2) && o.b < 9)) { const sg = o.line === "z" ? -1 : (o.at < 1 ? -1 : 1), n = o.at + sg * (T / 2 + 0.08), y = o.b + o.h + 0.2; o.line === "z" ? box(F, MAT.stone, o.c, y, n, o.w + 0.5, 0.3, 0.16, 0xe8e0cc) : box(F, MAT.stone, n, y, o.c, 0.16, 0.3, o.w + 0.5, 0xe8e0cc); }
  // inside: the hall and its stair down the middle; the sheriff's office and the jailer's office to the south, the front room and the jailer's
  // kitchen to the north; bedrooms upstairs, the bathroom (added 1906) in the south-west corner
  for (const y0 of [F1, F2]) { const ups = y0 === F2; op("x", 5.6, ups ? 3.6 : 2.6, 0.9, y0, 2.15, { door: true, int: true }); op("x", 5.6, 7.0, 0.9, y0, 2.15, { door: true, int: true }); op("x", 8.1, ups ? 1.8 : 2.4, 0.9, y0, 2.15, { door: true, int: true });
    if (!ups) op("x", 8.1, 7.6, 0.9, y0, 2.15, { door: true, int: true }); op("z", 4.9, 10.6, 0.9, y0, 2.15, { door: true, int: true }); if (!ups) op("z", 4.9, 3.0, 0.9, y0, 2.15, { door: true, int: true });
    const top = ups ? 8.2 : F2 - 0.25; wallLine(F, 5.6, T, 5.6, HZ - T, y0, top, TI, MAT.hall, 0xffffff, MAT.plaster, ups ? 0xe8e0d0 : 0xd8e0d4); wallLine(F, 8.1, T, 8.1, HZ - T, y0, top, TI, MAT.plaster, ups ? 0xe4dcc8 : 0xe8e0c8, MAT.hall, 0xffffff);
    wallLine(F, T, 4.9, 5.6, 4.9, y0, top, TI, MAT.plaster, ups ? 0xe8e0d0 : 0xe0e4d8, MAT.plaster, ups ? 0xdcd8e0 : 0xd8e0d4); wallLine(F, 8.1, 4.9, HX - T, 4.9, y0, top, TI, MAT.plaster, ups ? 0xe0d8c8 : 0xf0e8d0, MAT.plaster, ups ? 0xe4dcc8 : 0xe8e0c8); }
  op("x", 2.5, 2.2, 0.7, F2, 2.05, { door: true, int: true }); wallLine(F, T, 2.9, 2.5, 2.9, F2, 8.2, TI, MAT.plaster, 0xe0e4e8, MAT.plaster, 0xffffff); wallLine(F, 2.5, T, 2.5, 2.9, F2, 8.2, TI, MAT.plaster, 0xe8e0d0, MAT.plaster, 0xffffff);
  slab(F, MAT.plank, 0xc8a878, T, T, HX - T, HZ - T, F1, 0.25); slab(F, MAT.plank, 0xc8a878, T, T, HX - T, HZ - T, F2, 0.3, [[7.0, 3.0, 8.05, 8.3]]); slab(F, MAT.plaster, 0xf4f0e8, T, T, HX - T, HZ - T, F2 - 0.3, 0.02, [[7.0, 3.0, 8.05, 8.3]]); slab(F, MAT.plaster, 0xf4f0e8, T, T, HX - T, HZ - T, 8.2, 0.05);
  box(F, MAT.lino, 10.68, F1 + 0.006, 6.93, 5.1, 0.012, 4.0, 0xffffff); box(F, MAT.lino, 3.03, F1 + 0.006, 6.93, 5.1, 0.012, 4.0, 0xd8d8d0); box(F, MAT.rug, 3.03, F1 + 0.006, 2.68, 3.4, 0.012, 2.6, 0xffffff); box(F, MAT.rug, 10.68, F1 + 0.006, 2.68, 3.4, 0.012, 2.6, 0xffffff); box(F, MAT.lino, 1.48, F2 + 0.006, 1.68, 2.0, 0.012, 2.4, 0xe8eef0);
  floorRect(F, T, T, HX - T, HZ - T, F1); floorRect(F, T, T, HX - T, HZ - T, F2, { holes: [[7.0, 3.0, 8.05, 8.3]] });
  stairs(F, 7.52, 1.0, 3.0, 8.3, F1, F2, MAT.plank, 0x8a6a48); for (let k = 0; k <= 8; k++) cyl(F, MAT.plain, 7.06, F1 + 0.12 + (F2 - F1) * k / 8 + 0.45, 3.0 + 5.3 * k / 8, 0.018, 0.018, 0.9, 0x4a3020, 6); box(F, MAT.plain, 7.06, (F1 + F2) / 2 + 1.0, 5.65, 0.06, 0.07, 6.3, 0x4a3020, -Math.atan2(F2 - F1, 5.3));
  lattice(F, "x", 7.0, 3.0, 8.3, F2, F2 + 0.9, { sp: 0.3, hs: 0.85, col: 0x4a3020, collide: true });
  // the front porch and the upper porch over it with its iron bannister; the walk to Main Street
  box(F, MAT.plank, 6.8, F1 - 0.1, -1.05, 4.4, 0.2, 2.1, 0xb8a888); box(F, MAT.stone, 6.8, F1 / 2 - 0.2, -1.05, 4.4, F1, 2.1, 0xc8c0b0); floorRect(F, 4.6, -2.1, 9.0, 0, F1);
  for (let k = 0; k < 3; k++) box(F, MAT.stone, 6.8, F1 - 0.2 * (k + 1) + 0.1 - 0.1, -2.1 - 0.3 * (k + 0.5), 2.2, 0.2, 0.3, 0xc8c0b0); floorRect(F, 5.7, -3.0, 7.9, -2.1, F1 - 0.6, { y2: F1, along: "z" });
  for (const x of [4.75, 8.85]) for (const z of [-1.95]) { cyl(F, MAT.iron, x, F1 + 1.85, z, 0.09, 0.11, 3.7, 0x3a3e3a, 10); }
  box(F, MAT.plank, 6.8, F2 - 0.12, -1.05, 4.6, 0.24, 2.3, 0xc8b898); floorRect(F, 4.6, -2.1, 9.0, 0, F2); box(F, MAT.plain, 6.8, F2 - 0.3, -2.18, 4.7, 0.3, 0.1, 0xe8e2d4);
  lattice(F, "z", -2.1, 4.6, 9.0, F2, F2 + 0.95, { sp: 0.12, hs: 0.45, col: 0x2e3230 }); lattice(F, "x", 4.6, -2.1, 0, F2, F2 + 0.95, { sp: 0.12, hs: 0.45, col: 0x2e3230 }); lattice(F, "x", 9.0, -2.1, 0, F2, F2 + 0.95, { sp: 0.12, hs: 0.45, col: 0x2e3230 });
  doorLeaf(F, OPS.find(o => o.line === "z" && o.at === T / 2 && o.b === F1), F1, T, 0x5a3a24, 1, true);
  // the cornice on its brackets, the mansard with six dormers, its deck, two chimneys; tin on the roofs (the 1960 history)
  for (const [ax, az, bx, bz] of [[-0.3, -0.3, HX + 0.3, -0.3], [-0.3, HZ + 0.1, HX + 0.3, HZ + 0.1], [-0.3, -0.3, -0.3, HZ + 0.1], [HX + 0.3, -0.3, HX + 0.3, HZ + 0.1]]) { const L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2, alongX = az === bz;
    box(F, MAT.plain, cx, 8.95, cz, alongX ? L + 0.6 : 0.6, 0.3, alongX ? 0.6 : L + 0.6, 0xe8e2d0); box(F, MAT.plain, cx, 8.6, cz + (alongX ? (az < 0 ? 0.15 : -0.15) : 0) , alongX ? L : 0.3, 0.4, alongX ? 0.3 : L, 0xe8e2d0);
    const n = Math.round(L / 0.9); for (let k = 0; k <= n; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; box(F, MAT.plain, x, 8.55, z, alongX ? 0.12 : 0.5, 0.5, alongX ? 0.5 : 0.12, 0xe0dac8); } }
  { const y0 = 9.1, y1 = 11.9, i = 1.0, A = [-0.35, -0.35], B = [HX + 0.35, HZ + 0.15], P = (x, y, z) => [x, y, z];
    const C0 = [[A[0], A[1]], [B[0], A[1]], [B[0], B[1]], [A[0], B[1]]], C1 = [[A[0] + i, A[1] + i], [B[0] - i, A[1] + i], [B[0] - i, B[1] - i], [A[0] + i, B[1] - i]];
    for (let k = 0; k < 4; k++) { const a0 = C0[k], b0 = C0[(k + 1) % 4], a1 = C1[k], b1 = C1[(k + 1) % 4]; poly2(F, MAT.tin, MAT.plain, [P(b0[0], y0, b0[1]), P(a0[0], y0, a0[1]), P(a1[0], y1, a1[1]), P(b1[0], y1, b1[1])], 0x7a5a50, 0x8a7a68, 0.06); }
    box(F, MAT.tin, HX / 2, y1 + 0.12, HZ / 2 - 0.1, HX - 2 * i + 0.7, 0.24, HZ - 2 * i + 0.5, 0x5a5a58); box(F, MAT.iron, HX / 2, y1 + 0.38, HZ / 2 - 0.1, HX - 2 * i + 0.75, 0.04, HZ - 2 * i + 0.55, 0x2a2a2a);
    const dormer = (x, z, ry) => { const D = frame(...[toWorld(F, x, 0, z)].map(v => [v.x, v.z])[0], F.y, F.ry + ry); box(D, MAT.plain, 0, 10.2, 0, 1.15, 1.9, 1.0, 0xe8e2d0); box(D, MAT.glass, 0, 10.15, -0.51, 0.7, 1.2, 0.02, 0xffffff); box(D, MAT.plain, 0, 10.15, -0.52, 0.06, 1.2, 0.03, 0xf4f0e6);
      cyl(D, MAT.tin, 0, 11.2, 0, 0.62, 0.62, 1.04, 0x6a4e46, 12, Math.PI / 2, 0); box(D, MAT.plain, 0, 11.2, -0.55, 1.3, 0.1, 0.12, 0xe8e2d0); };
    for (const x of [2.8, 6.85, 10.9]) dormer(x, 0.3, 0); dormer(0.3, 4.7, Math.PI / 2); dormer(HX - 0.3, 4.7, -Math.PI / 2); dormer(1.1, HZ - 0.4, Math.PI);
    for (const x of [0.9, HX - 0.9]) box(F, MAT.brick, x, 11.6, 6.5, 0.7, 4.2, 1.1, 0xe8c8b8); }
  // ---- the jail of 1869-71: two storeys, 16-inch walls; inside, on each floor, a cage of six cells of iron bars inside a grated corridor,
  // a hall round it, the cage in front of the inner jail door, and the iron stair ----
  const X0 = 2.0, X1 = 13.4, Z0 = HZ, Z1 = 20.7;
  for (const y0 of [J1, J2]) { for (const z of [12.0, 15.2, 18.4]) op("x", X1 - T / 2, z, 0.9, y0 + 1.5, 1.6); op("x", X0 + T / 2, 12.2, 0.9, y0 + 1.5, 1.6); op("x", X0 + T / 2, 19.6, 0.95, y0, 2.2, { door: true }); op("z", 20.925, 11.0, 1.0, y0, 2.2, { door: true }); op("z", 20.925, 0.75, 0.95, y0, 2.2, { door: true }); }
  bwall(F, X1 - T / 2, Z0, X1 - T / 2, Z1, -0.4, JTOP, -1, MAT.wbrick, WASH, JAILBRICK); bwall(F, X0 + T / 2, Z0, X0 + T / 2, 15.0, -0.4, JTOP, 1, MAT.wbrick, WASH, JAILBRICK); wallLine(F, X0 + T / 2, 15.0, X0 + T / 2, Z1, -0.4, JTOP, T, MAT.wbrick, WASH, MAT.wbrick, 0xe8e4d8, true, false);
  for (const o of OPS.filter(o => !o.door && o.line === "x" && (o.at === X1 - T / 2 || o.at === X0 + T / 2) && o.at !== T / 2)) barredWindow(F, { ...o, base: o.b - 1.5, b: 1.5, out: o.at > 5 ? 1 : -1, in: o.at > 5 ? 1 : -1 }, T);
  slab(F, MAT.conc, 0x9a968c, X0 + T, Z0, X1 - T, Z1, J1, 0.3); slab(F, MAT.conc, 0x8a8a84, X0 + T, Z0, X1 - T, Z1, J2, 0.25, [[11.8, 12.5, 12.95, 19.5]]); slab(F, MAT.plaster, 0xe8e4dc, X0 + T, Z0, X1 - T, Z1, J2 - 0.25, 0.02, [[11.8, 12.5, 12.95, 19.5]]); slab(F, MAT.plaster, 0xe8e4dc, X0 + T, Z0, X1 - T, Z1, JTOP - 0.1, 0.05);
  floorRect(F, X0 + T, Z0, X1 - T, Z1, J1); floorRect(F, X0 + T, Z0, X1 - T, Z1, J2, { holes: [[11.8, 12.5, 12.95, 19.5]] });
  stairs(F, 12.38, 0.95, 19.5, 12.5, J1, J2, MAT.steel, 0x4a4e4c, IRON, true); lattice(F, "z", 19.5, 11.8, 12.95, J2, J2 + 1.0, { sp: 0.25, hs: 0.5 }); lattice(F, "x", 11.8, 19.1, 19.5, J2, J2 + 1.0, { sp: 0.25, hs: 0.5 });
  for (const [y0, k] of [[J1, 0], [J2, 1]]) { const top = y0 + 2.5;
    lattice(F, "z", 11.0, 3.6, 11.8, y0, top, { plate: 0.61, doors: [{ c: 6.7, w: 0.9, open: true, side: 1 }] }); lattice(F, "z", 19.1, 3.6, 11.8, y0, top, { plate: 0.61 }); lattice(F, "x", 3.6, 11.0, 19.1, y0, top, { plate: 0.61 }); lattice(F, "x", 11.8, 11.0, 19.1, y0, top, { plate: 0.61 });
    for (let x = 3.6; x <= 11.81; x += 0.6) box(F, MAT.bars, x, top + 0.02, 15.05, 0.03, 0.04, 8.1, IRON); for (let z = 11.0; z <= 19.11; z += 0.6) box(F, MAT.bars, 7.7, top + 0.02, z, 8.2, 0.04, 0.03, IRON);
    const cx = [4.6, 6.67, 8.73, 10.8];
    for (const [zf, zb, sg] of [[12.0, 15.05, 1], [18.1, 15.05, -1]]) { for (let c = 0; c < 3; c++) { const a = cx[c], b = cx[c + 1], open = (c + k) % 3 === 1;
        lattice(F, "z", zf, a, b, y0, y0 + 2.3, { doors: [{ c: (a + b) / 2, w: 0.7, open, side: sg }] }); const zz0 = Math.min(zf, zb), zz1 = Math.max(zf, zb);
        bunkPair(F, a + 0.42, (zf + zb) / 2, 0.7, 1.9, y0, "z"); toilet(F, b - 0.38, zb - sg * 0.35, y0, sg > 0 ? 0 : Math.PI); CELLS.push({ F, x: (a + b) / 2, z: (zz0 + zz1) / 2, y: y0, open, era: 1869, sg }); }
      lattice(F, "z", 15.05, 4.6, 10.8, y0, y0 + 2.3); for (const x of cx) lattice(F, "x", x, Math.min(zf, zb), Math.max(zf, zb), y0, y0 + 2.3); }
    for (let x = 4.6; x <= 10.81; x += 0.5) box(F, MAT.bars, x, y0 + 2.3, 15.05, 0.03, 0.04, 6.1, IRON);
    lattice(F, "x", 5.8, Z0, 11.0, y0, y0 + 2.6, { doors: k === 0 ? [{ c: 10.3, w: 0.8, open: true, side: -1 }] : [] }); lattice(F, "x", 7.6, Z0, 11.0, y0, y0 + 2.6, { doors: k === 0 ? [{ c: 10.3, w: 0.8, open: true, side: 1 }] : [] }); lattice(F, "z", Z0 + 0.02, 5.8, 7.6, y0 + 2.6, y0 + 2.62, { collide: false });
    JLIGHTS.push(light(F, 7.7, top + 1.6, 10.2, 1.3, 13)); }
  box(F, MAT.tin, (X0 + X1) / 2, JTOP + 0.15, (Z0 + Z1) / 2 + 0.1, X1 - X0 + 0.1, 0.3, Z1 - Z0 + 0.4, 0x5a5c5a);
  for (const [ax, az, bx, bz] of [[X0, Z0 + 0.05, X0, Z1], [X1, Z0 + 0.05, X1, Z1]]) box(F, MAT.brick, ax + (ax < 5 ? 0.22 : -0.22), JTOP + 0.6, (az + bz) / 2, 0.44, 1.2, bz - az, JAILBRICK);
  // the peepholes: half-inch funnels through the house's back wall from the jailer's office and kitchen onto the jail's corridors
  for (const x of [3.2, 11.9]) { const g = new THREE.CylinderGeometry(0.008, 0.06, 0.12, 12, 1, true); g.rotateX(Math.PI / 2); put(MAT.iron, g, F.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, F1 + 1.55, HZ - T - 0.06)), 0x2a2a28); cyl(F, MAT.plain, x, F1 + 1.55, HZ - T - 0.005, 0.012, 0.012, 0.01, 0x050505, 8, Math.PI / 2, 0); box(F, MAT.plain, x, F1 + 1.55, HZ + 0.004, 0.03, 0.03, 0.01, 0x101010); }
  // ---- the addition of 1904-05 (Pauly Jail Building Co., St. Louis): to the rear, two sections side by side on each floor, each a row of five
  // steel cells and a bathroom along the dividing wall, a day corridor in front of them behind a grating, and a side corridor along the
  // outside wall; a small wing on the south side with the conversation cage below and the lockers storeroom above ----
  const RX0 = -0.55, RX1 = 12.7, RZ1 = 31.75;
  for (const y0 of [J1, J2]) { for (const z of [23.3, 26.3, 29.3]) { op("x", RX0 + T / 2, z, 0.9, y0 + 1.5, 1.6); op("x", RX1 - T / 2, z, 0.9, y0 + 1.5, 1.6); } for (const x of [0.9, 11.4]) op("z", RZ1 - T / 2, x, 0.9, y0 + 1.5, 1.6); }
  wallLine(F, RX0, 20.925, 2.0, 20.925, -0.4, JTOP, T, MAT.wbrick, 0xe8e4d8, MAT.wbrick, WASH, true, false); wallLine(F, 2.0, 20.925, X1, 20.925, -0.4, JTOP, T, MAT.wbrick, 0xe8e4d8, MAT.wbrick, WASH, true, false);
  bwall(F, RX0 + T / 2, 20.7, RX0 + T / 2, RZ1, -0.4, JTOP, 1, MAT.wbrick, 0xe8e4d8, JAILBRICK); bwall(F, RX1 - T / 2, 20.7, RX1 - T / 2, RZ1, -0.4, JTOP, -1, MAT.wbrick, 0xe8e4d8, JAILBRICK); bwall(F, RX0, RZ1 - T / 2, RX1, RZ1 - T / 2, -0.4, JTOP, -1, MAT.wbrick, 0xe8e4d8, JAILBRICK);
  box(F, MAT.conc, (RX0 + RX1) / 2, -0.1, (20.7 + RZ1) / 2, RX1 - RX0 + 0.1, 0.6, RZ1 - 20.7 + 0.1, 0xb8b4a8);
  for (const o of OPS.filter(o => !o.door && (o.line === "x" && (o.at === RX0 + T / 2 || o.at === RX1 - T / 2) || o.line === "z" && o.at === RZ1 - T / 2))) barredWindow(F, { ...o, base: o.b - 1.5, b: 1.5, out: o.line === "z" ? 1 : o.at > 5 ? 1 : -1, in: o.line === "z" ? 1 : o.at > 5 ? 1 : -1 }, T);
  wallLine(F, 5.7, 21.15, 5.7, RZ1 - T, J1 - 0.3, JTOP, 0.3, MAT.wbrick, WASH, MAT.wbrick, WASH, true, false);
  slab(F, MAT.conc, 0x9a968c, RX0 + T, 21.15, RX1 - T, RZ1 - T, J1, 0.3); slab(F, MAT.conc, 0x8a8a84, RX0 + T, 21.15, RX1 - T, RZ1 - T, J2, 0.25); slab(F, MAT.plaster, 0xe8e4dc, RX0 + T, 21.15, RX1 - T, RZ1 - T, J2 - 0.25, 0.02); slab(F, MAT.plaster, 0xe8e4dc, RX0 + T, 21.15, RX1 - T, RZ1 - T, JTOP - 0.1, 0.05);
  floorRect(F, RX0 + T, 21.15, RX1 - T, RZ1 - T, J1); floorRect(F, RX0 + T, 21.15, RX1 - T, RZ1 - T, J2);
  const SECT = [];
  for (const [y0, k] of [[J1, 0], [J2, 1]]) for (const side of [-1, 1]) { const back = side < 0 ? 5.55 : 5.85, front = back + side * 2.3, grate = front + side * 1.65, z0 = 21.15, zb = 22.35, cw = (RZ1 - T - zb) / 5, steel = k === 0 ? "TOOL-PROOF STEEL" : "BESSEMER STEEL";
    SECT.push({ y0, side, name: k === 0 ? (side > 0 ? "the section for \"hardened\" prisoners" : "the section for ordinary prisoners") : (side > 0 ? "the juvenile section" : "the women's section") });
    lattice(F, "x", grate, z0, RZ1 - T, y0, y0 + 2.45, { doors: [{ c: 22.5, w: 0.8, open: !(k === 1 && side > 0), side: -side }] });
    for (let c = 0; c <= 5; c++) { const za = c === 0 ? z0 : zb + cw * (c - 1), zz = c === 0 ? zb : zb + cw * c; plateWall(F, "z", zz, Math.min(back, front), Math.max(back, front), y0, y0 + 2.3); box(F, MAT.steel, (back + front) / 2, y0 + 2.31, (za + zz) / 2, 2.3, 0.03, zz - za, CELLGREY);
      const open = c === 0 || (c + k + (side > 0 ? 1 : 0)) % 4 === 0; lattice(F, "x", front, za, zz, y0, y0 + 2.3, { doors: [{ c: za + (c === 0 ? 0.55 : 0.5), w: 0.62, open, side }], col: 0x3a4240 });
      if (c === 0) { shower(F, (back + front) / 2, (za + zz) / 2, y0, side); continue; }
      bunkPair(F, (back + front) / 2, zz - 0.4, 0.68, 1.95, y0, "x"); toilet(F, back + side * 0.35, za + 0.4, y0, side > 0 ? -Math.PI / 2 : Math.PI / 2); CELLS.push({ F, x: (back + front) / 2, z: (za + zz) / 2, y: y0, open, era: 1904, side, k });
      steelPlate(F, front + side * 0.03, y0 + 2.18, (za + zz) / 2, side, steel === "TOOL-PROOF STEEL" ? 0 : 1); }
    plateWall(F, "z", z0 + 0.0, Math.min(back, front), Math.max(back, front), y0, y0 + 2.3);
    box(F, MAT.steel, grate - side * 0.18, y0 + 1.1, 21.45, 0.3, 1.5, 0.36, 0x5a625e); cyl(F, MAT.bars, grate - side * 0.18, y0 + 1.95, 21.45, 0.025, 0.025, 0.6, 0x2a2a2a, 6, 0.4, 0); box(F, MAT.bars, grate - side * 0.18, y0 + 2.25, 21.62, 0.07, 0.07, 0.07, 0x1a1a1a);
    if (side > 0) JLIGHTS.push(light(F, 5.7, y0 + 3.6, 26.3, 1.4, 14)); else cyl(F, MAT.glow, (grate + RX0 + T) / 2, y0 + 3.65, 26.3, 0.06, 0.06, 0.12, 0xfff4d8, 8); }
  // the south wing: the conversation cage (prisoners talk to visitors through two gratings with a gap between), the lockers storeroom above
  const PX0 = -3.2, PZ0 = 15.0;
  for (const y0 of [J1, J2]) { op("z", PZ0 + T / 2, -0.6, 0.9, y0 + 1.5, 1.6); op("x", PX0 + T / 2, 19.3, 0.9, y0 + 1.5, 1.6); } op("x", PX0 + T / 2, 16.6, 1.0, J1, 2.3, { door: true }); op("x", PX0 + T / 2, 16.6, 0.9, J2 + 1.5, 1.6);
  bwall(F, PX0 + T / 2, PZ0, PX0 + T / 2, 20.7, -0.4, JTOP, 1, MAT.wbrick, 0xece8dc, JAILBRICK); bwall(F, PX0, 20.925, RX0, 20.925, -0.4, JTOP, -1, MAT.wbrick, 0xece8dc, JAILBRICK); bwall(F, PX0, PZ0 + T / 2, X0, PZ0 + T / 2, -0.4, JTOP, 1, MAT.wbrick, 0xece8dc, JAILBRICK);
  for (const o of OPS.filter(o => !o.door && (o.line === "x" && o.at === PX0 + T / 2 || o.line === "z" && o.at === PZ0 + T / 2))) barredWindow(F, { ...o, base: o.b - 1.5, b: 1.5, out: -1, in: -1 }, T);
  slab(F, MAT.conc, 0x9a968c, PX0 + T, PZ0 + T, X0, 20.7, J1, 0.3); slab(F, MAT.conc, 0x8a8a84, PX0 + T, PZ0 + T, X0, 20.7, J2, 0.25); slab(F, MAT.plaster, 0xe8e4dc, PX0 + T, PZ0 + T, X0, 20.7, J2 - 0.25, 0.02); slab(F, MAT.plaster, 0xe8e4dc, PX0 + T, PZ0 + T, X0, 20.7, JTOP - 0.1, 0.05);
  floorRect(F, PX0 + T, PZ0 + T, X0, 20.7, J1); floorRect(F, PX0 + T, PZ0 + T, X0, 20.7, J2); box(F, MAT.tin, (PX0 + X0) / 2, JTOP + 0.15, (PZ0 + 20.7) / 2, X0 - PX0 + 0.1, 0.3, 20.7 - PZ0 + 0.1, 0x5a5c5a);
  box(F, MAT.tin, (RX0 + RX1) / 2, JTOP + 0.15, (20.7 + RZ1) / 2, RX1 - RX0 + 0.1, 0.3, RZ1 - 20.7 + 0.1, 0x5a5c5a);
  lattice(F, "z", 17.7, PX0 + T, X0, J1, J1 + 2.6, { sp: 0.06, hs: 0.2, plate: 0.9 }); lattice(F, "z", 18.2, PX0 + T, X0, J1, J1 + 2.6, { sp: 0.06, hs: 0.2, plate: 0.9 }); box(F, MAT.plain, -0.6, J1 + 0.25, 16.5, 2.4, 0.06, 0.4, 0x6a4a2e); for (const x of [-1.6, 0.4]) box(F, MAT.plain, x, J1 + 0.12, 16.5, 0.06, 0.24, 0.36, 0x4a3420);
  floorRect(F, PX0 - 1.4, 16.0, PX0, 17.2, J1 - 0.6, { y2: J1, along: "x" }); for (let k = 0; k < 3; k++) box(F, MAT.stone, PX0 - 1.4 + 0.47 * (k + 0.5), 0.1 * (k + 1), 16.6, 0.47, 0.2 * (k + 1), 1.2, 0xc8c0b0);
  for (let k = 0; k < 8; k++) box(F, MAT.steel, PX0 + T + 0.2, J2 + 0.95, 15.8 + k * 0.42, 0.4, 1.9, 0.4, 0x6a7a6e); for (let k = 0; k < 3; k++) box(F, MAT.plank, X0 - 0.35, J2 + 0.6 + k * 0.55, 17.5, 0.6, 0.03, 3.2, 0xa88a60); box(F, MAT.cloth, X0 - 0.35, J2 + 0.75, 17.5, 0.5, 0.25, 2.8, 0x6a6a5a);
  // ---- the little building to the north marked JAIL on the Sanborn, with a one-storey kitchen; a frame shed between ----
  { const K = JAIL.kitchen.map(([x, z]) => { const dx = x - JO[0], dz = z - JO[1]; return [dx * JUX + dz * JUZ, -dx * JUZ + dz * JUX]; }), kx0 = Math.min(...K.map(p => p[0])), kx1 = Math.max(...K.map(p => p[0])), kz0 = Math.min(...K.map(p => p[1])), kz1 = Math.max(...K.map(p => p[1])), km = 23.0;
    box(F, MAT.fbrick, (kx0 + kx1) / 2, 3.3, (km + kz1) / 2, kx1 - kx0, 6.9, kz1 - km, JAILBRICK); box(F, MAT.tin, (kx0 + kx1) / 2, 6.85, (km + kz1) / 2, kx1 - kx0 + 0.3, 0.2, kz1 - km + 0.3, 0x5a5c5a); solidBox(F, kx0, km, kx1, kz1, -1, 7);
    box(F, MAT.fbrick, (kx0 + kx1) / 2, 1.8, (kz0 + km) / 2, kx1 - kx0, 3.9, km - kz0, JAILBRICK); box(F, MAT.tin, (kx0 + kx1) / 2, 3.8, (kz0 + km) / 2, kx1 - kx0 + 0.3, 0.2, km - kz0 + 0.3, 0x5a5c5a); solidBox(F, kx0, kz0, kx1, km, -1, 4); box(F, MAT.brick, kx1 - 0.6, 4.6, kz0 + 1.2, 0.6, 1.8, 0.6, 0xe8c8b8);
    const S = JAIL.shed.map(([x, z]) => { const dx = x - JO[0], dz = z - JO[1]; return [dx * JUX + dz * JUZ, -dx * JUZ + dz * JUX]; }), sx0 = Math.min(...S.map(p => p[0])), sx1 = Math.max(...S.map(p => p[0])), sz0 = Math.min(...S.map(p => p[1])), sz1 = Math.max(...S.map(p => p[1]));
    box(F, MAT.clap, (sx0 + sx1) / 2, 1.3, (sz0 + sz1) / 2, sx1 - sx0, 2.8, sz1 - sz0, 0xd8d0b8); box(F, MAT.tar, (sx0 + sx1) / 2, 2.78, (sz0 + sz1) / 2, sx1 - sx0 + 0.4, 0.12, sz1 - sz0 + 0.4, 0xffffff); solidBox(F, sx0, sz0, sx1, sz1, -1, 3);
    KITCHEN_B.push({ x: (kx0 + kx1) / 2, z: (kz0 + kz1) / 2 }); }
  // walks: 8 ft to the porch, 4 ft round to the side doors (the 1907 county board's order); iron fences along the side lot lines
  { const [s] = nearestRoad(...JW(6.85, -12)), fr = JW(6.85, -3.0); let dz = 0; if (s) { for (let z = -3; z > -40; z -= 0.5) { const p = JW(6.85, z), d = segD(p[0], p[1], s); if (d < s.hw + 0.4) { dz = z + 0.2; break; } } }
    if (dz < -3.2) { box(F, MAT.conc, 6.85, 0.03, (dz - 3.0) / 2, 2.44, 0.1, -3.0 - dz, 0xffffff); for (const x of [-3.0, 16.7]) { lattice(F, "x", x, dz + 1.8, 0, 0, 1.05, { sp: 0.13, hs: 0.5, col: 0x2a2c2a, collide: true }); } }
    box(F, MAT.conc, -1.0, 0.03, 4.5, 1.22, 0.1, 9.0, 0xffffff); box(F, MAT.conc, 14.6, 0.03, 4.5, 1.22, 0.1, 9.0, 0xffffff); }
  // ---- inside, 1962: the sheriff's office, the jailer's office (desk, telephone, typewriter, the radio, the prisoner register, the keys),
  // the jailer's kitchen (the jailer's wife cooked for the prisoners, as was usual in county jails), bedrooms upstairs ----
  const R1 = sub(F, F1), R2 = sub(F, F2);
  desk(R1, 3.0, 2.2, 0); chairB(R1, 3.0, 2.95, Math.PI, 0x5a3a22); chairB(R1, 2.2, 1.4, 0.3, 0x5a3a22); chairB(R1, 3.8, 1.4, -0.3, 0x5a3a22); fileCab(R1, 0.75, 4.4); fileCab(R1, 1.3, 4.4); gunRack(R1, 5.45, 4.2);
  flagStand(R1, 0.9, 0.9); picture(R1, 3.0, 1.75, T + 0.02, 1.5, 1.1, 0, drawCountyMap); picture(R1, 5.5, 1.7, 1.1, 0.4, 0.5, -Math.PI / 2, drawPortrait62);
  desk(R1, 2.6, 7.6, Math.PI); chairB(R1, 2.6, 6.85, 0, 0x5a4a3a); phone(R1, 3.1, 7.55); typewriter(R1, 2.3, 7.5); radio(R1, 0.9, 8.4); register(R1, 2.8, 7.4); keyBoard(R1, 5.5, 5.7); picture(R1, 1.6, 1.75, HZ - T - 0.02, 0.35, 0.5, Math.PI, drawCalendar62); fileCab(R1, 4.9, 8.55);
  stove(R1, 12.9, 5.9); fridge(R1, 12.85, 8.45); sink(R1, 10.8, 8.6); table(R1, 10.4, 6.5, 1.2, 0.8, 0.76, 0xd8d0c0, null); for (const [x, z, r] of [[9.9, 6.5, Math.PI / 2], [10.9, 6.5, -Math.PI / 2], [10.4, 7.1, Math.PI]]) chairB(R1, x, z, r, 0xc8c0b0); pots(R1, 12.9, 5.9);
  sofa(R1, 10.7, 0.9); chairB(R1, 12.6, 2.6, -Math.PI / 2, 0x6a3a2a); tv(R1, 12.85, 4.3); table(R1, 9.0, 2.0, 0.5, 0.5, 0.55, 0x6a4a2e, null);
  bedIron(R2, 4.0, 1.0, 1.4, 1.95, 0, 0xc8d0e0); bedIron(R2, 2.0, 6.0, 1.4, 1.95, 0, 0xe8d8c0); bedIron(R2, 11.5, 0.7, 1.4, 1.95, 0, 0xd8c8d0); bedIron(R2, 11.5, 5.4, 1.0, 1.95, 0, 0xc8d8c0); tub(R2, 1.0, 1.3); toilet(R2, 2.1, 0.75, 0, Math.PI);
  for (const [x, z] of [[4.9, 0.8], [9.0, 4.4], [9.0, 8.5]]) box(R2, MAT.plain, x, 0.6, z, 0.9, 1.2, 0.5, 0x7a5a3a);
  JLIGHTS.push(light(F, 6.85, F2 - 0.4, 4.9, 1.1, 11)); }
const CELLS = [], KITCHEN_B = [];
// fittings
function bunkPair(F, cx, cz, w, l, y0, along) { for (const y of [0.42, 1.3]) { if (along === "z") { box(F, MAT.steel, cx, y0 + y, cz, w, 0.05, l, 0x7a8480); box(F, MAT.cloth, cx, y0 + y + 0.05, cz, w - 0.08, 0.05, l - 0.1, 0x5a5e5a); box(F, MAT.cloth, cx, y0 + y + 0.09, cz - l / 2 + 0.25, w - 0.2, 0.06, 0.3, 0xe0dcd0); }
    else { box(F, MAT.steel, cx, y0 + y, cz, l, 0.05, w, 0x7a8480); box(F, MAT.cloth, cx, y0 + y + 0.05, cz, l - 0.1, 0.05, w - 0.08, 0x5a5e5a); box(F, MAT.cloth, cx - l / 2 + 0.25, y0 + y + 0.09, cz, 0.3, 0.06, w - 0.2, 0xe0dcd0); } }
  for (const s of [-1, 1]) along === "z" ? box(F, MAT.bars, cx + w / 2 - 0.03, y0 + 0.9, cz + s * (l / 2 - 0.05), 0.02, 1.0, 0.02, 0x3a3a3a) : box(F, MAT.bars, cx + s * (l / 2 - 0.05), y0 + 0.9, cz + w / 2 * 0 - w / 2 + 0.03, 0.02, 1.0, 0.02, 0x3a3a3a); }
function toilet(F, x, z, y0, ry) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c]; let [a, b] = L(0, 0); cyl(F, MAT.plain, a, y0 + 0.2, b, 0.17, 0.13, 0.4, 0xf4f2ee, 12); cyl(F, MAT.plain, a, y0 + 0.41, b, 0.2, 0.2, 0.03, 0xe8e4dc, 12);
  [a, b] = L(0, 0.24); box(F, MAT.plain, a, y0 + 0.62, b, 0.42, 0.42, 0.17, 0xf4f2ee, 0, ry, 0); }
function shower(F, x, z, y0, side) { box(F, MAT.conc, x, y0 + 0.03, z, 2.0, 0.06, 1.0, 0x8a8e88); cyl(F, MAT.bars, x + side * 0.9, y0 + 1.6, z, 0.015, 0.015, 1.8, 0x8a8a8a, 6); cyl(F, MAT.bars, x + side * 0.82, y0 + 2.1, z, 0.06, 0.04, 0.05, 0x8a8a8a, 8); toilet(F, x - side * 0.6, z + 0.25, y0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
function tub(F, x, z) { box(F, MAT.plain, x, 0.3, z, 0.75, 0.6, 1.6, 0xf4f2ee); box(F, MAT.plain, x, 0.58, z, 0.6, 0.04, 1.45, 0xb8c0c4); for (const [a, b] of [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]]) cyl(F, MAT.iron, x + a, 0.05, z + b, 0.04, 0.03, 0.1, 0xd8d0b0, 6); }
function desk(F, x, z, ry) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c]; let [a, b] = L(0, 0); box(F, MAT.plain, a, 0.76, b, 1.5, 0.05, 0.8, 0x6a4a2e, 0, ry, 0);
  for (const dx of [-0.55, 0.55]) { [a, b] = L(dx, 0); box(F, MAT.plain, a, 0.37, b, 0.4, 0.74, 0.76, 0x5a3e26, 0, ry, 0); } }
function fileCab(F, x, z) { box(F, MAT.steel, x, 0.68, z, 0.48, 1.36, 0.6, 0x7a8478); for (let k = 0; k < 4; k++) box(F, MAT.plain, x, 0.2 + k * 0.33, z - 0.31, 0.14, 0.03, 0.02, 0xc8c8c0); }
function gunRack(F, x, z) { box(F, MAT.plain, x, 1.1, z, 0.25, 1.6, 0.9, 0x5a3a22); for (let k = 0; k < 4; k++) box(F, MAT.iron, x - 0.06, 1.15, z - 0.33 + k * 0.22, 0.04, 1.2, 0.04, 0x2a2420); }
function flagStand(F, x, z) { cyl(F, MAT.plain, x, 1.1, z, 0.015, 0.015, 2.2, 0xc8a840, 6); box(F, MAT.cloth, x + 0.45, 1.75, z, 0.9, 0.55, 0.01, 0xffffff); }
function phone(F, x, z) { box(F, MAT.plain, x, 0.83, z, 0.2, 0.1, 0.22, 0x101010); box(F, MAT.plain, x, 0.9, z, 0.22, 0.04, 0.06, 0x101010); cyl(F, MAT.plain, x, 0.885, z + 0.02, 0.04, 0.04, 0.01, 0xd8d8d0, 10); }
function typewriter(F, x, z) { box(F, MAT.plain, x, 0.84, z, 0.42, 0.12, 0.34, 0x2a2a2a); cyl(F, MAT.plain, x, 0.93, z + 0.1, 0.03, 0.03, 0.44, 0x1a1a1a, 8, 0, Math.PI / 2); box(F, MAT.plain, x, 0.96, z + 0.14, 0.2, 0.16, 0.003, 0xf4f2ec); }
function radio(F, x, z) { box(F, MAT.steel, x, 0.95, z, 0.5, 0.3, 0.35, 0x4a5048); box(F, MAT.plain, x, 0.4, z, 0.6, 0.8, 0.5, 0x5a3e26); cyl(F, MAT.plain, x, 0.85, z - 0.25, 0.03, 0.04, 0.12, 0x1a1a1a, 8); box(F, MAT.plain, x, 1.12, z, 0.02, 0.02, 0.02, 0xffffff); }
function register(F, x, z) { box(F, MAT.plain, x, 0.8, z, 0.35, 0.05, 0.48, 0x2a3a5a); box(F, MAT.plain, x, 0.83, z, 0.32, 0.005, 0.44, 0xf0ead8); }
function keyBoard(F, x, z) { box(F, MAT.plain, x, 1.5, z, 0.03, 0.6, 0.8, 0x6a4a2e); for (let k = 0; k < 8; k++) { box(F, MAT.iron, x - 0.04, 1.6 - (k % 2) * 0.22, z - 0.3 + Math.floor(k / 2) * 0.2, 0.03, 0.16, 0.03, 0x8a7a50); } }
function stove(F, x, z) { box(F, MAT.plain, x, 0.46, z, 0.6, 0.92, 0.95, 0xf4f2ee); box(F, MAT.plain, x + 0.25, 1.05, z, 0.1, 0.3, 0.95, 0xf4f2ee); for (const dz of [-0.22, 0.22]) for (const dx of [-0.13, 0.13]) cyl(F, MAT.iron, x + dx, 0.93, z + dz, 0.09, 0.09, 0.02, 0x2a2a2a, 10); }
function pots(F, x, z) { cyl(F, MAT.iron, x + 0.1, 1.08, z - 0.2, 0.17, 0.16, 0.3, 0x9a9a98, 12); cyl(F, MAT.iron, x - 0.1, 1.02, z + 0.22, 0.13, 0.12, 0.17, 0x6a6a68, 12); }
function fridge(F, x, z) { box(F, MAT.plain, x, 0.82, z, 0.7, 1.64, 0.8, 0xf2f0e8); box(F, MAT.plain, x - 0.36, 1.1, z + 0.25, 0.04, 0.3, 0.05, 0xc8c8c0); }
function sink(F, x, z) { box(F, MAT.plain, x, 0.45, z, 1.4, 0.9, 0.6, 0xe8e4d8); box(F, MAT.plain, x, 0.905, z, 0.6, 0.01, 0.4, 0xb8c0c4); cyl(F, MAT.iron, x, 1.05, z + 0.24, 0.015, 0.015, 0.25, 0xd8d8d8, 6); }
function sofa(F, x, z) { box(F, MAT.cloth, x, 0.25, z, 2.0, 0.5, 0.85, 0x5a7a7a); box(F, MAT.cloth, x, 0.65, z - 0.32, 2.0, 0.55, 0.2, 0x5a7a7a); for (const s of [-1, 1]) box(F, MAT.cloth, x + s * 0.95, 0.5, z, 0.15, 0.35, 0.85, 0x4a6a6a); }
function tv(F, x, z) { box(F, MAT.plain, x, 0.75, z, 0.55, 0.55, 0.7, 0x5a3e26); box(F, MAT.plain, x - 0.28, 0.78, z, 0.01, 0.4, 0.5, 0x3a4a48); for (const [a, b] of [[-0.15, -0.25], [0.15, -0.25], [-0.15, 0.25], [0.15, 0.25]]) cyl(F, MAT.plain, x + a, 0.24, z + b, 0.015, 0.01, 0.48, 0x2a2a2a, 5); }
mk("plates", { map: tex(256, 64, (g, w, h) => { for (const [i, t] of [[0, "TOOL-PROOF STEEL"], [1, "BESSEMER STEEL"]]) { g.fillStyle = "#3a3e3a"; g.fillRect(0, i * 32, w, 32); g.fillStyle = "#c8c4b0"; g.font = "bold 17px Georgia"; g.textAlign = "center"; g.fillText(t, w / 2, i * 32 + 22); } }), roughness: 0.5, metalness: 0.5 });
function steelPlate(F, x, y, z, side, i) { const g = new THREE.PlaneGeometry(0.42, 0.06), uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, (1 - i) * 0.5 + uv.getY(k) * 0.5); g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); put(MAT.plates, g, F.m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)), 0xffffff); }
const drawCountyMap = (g, w, h) => { g.fillStyle = "#efe6cc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a6a4a"; g.lineWidth = 2; g.beginPath(); g.moveTo(20, 8); g.lineTo(w - 30, 10); g.lineTo(w - 12, h - 40); g.lineTo(w * 0.6, h - 8); g.lineTo(18, h - 14); g.closePath(); g.stroke();
  g.strokeStyle = "#c0a080"; g.lineWidth = 0.6; for (let x = 20; x < w; x += 12) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 10); g.stroke(); } for (let y = 8; y < h; y += 12) { g.beginPath(); g.moveTo(18, y); g.lineTo(w - 12, y); g.stroke(); } g.fillStyle = "#2a2a2a"; g.font = "bold 9px Georgia"; g.textAlign = "center"; g.fillText("MADISON COUNTY", w / 2, 20); g.fillText("ILLINOIS", w / 2, 30); };
const drawPortrait62 = (g, w, h) => { g.fillStyle = "#8a9aa8"; g.fillRect(0, 0, w, h); g.fillStyle = "#2a2a32"; g.beginPath(); g.ellipse(w / 2, h * 0.95, w * 0.42, h * 0.32, 0, 0, 7); g.fill(); g.fillStyle = "#e0c0a0"; g.beginPath(); g.ellipse(w / 2, h * 0.42, w * 0.18, h * 0.2, 0, 0, 7); g.fill(); g.fillStyle = "#3a2a1c"; g.beginPath(); g.ellipse(w / 2, h * 0.28, w * 0.19, h * 0.08, 0, Math.PI, 0); g.fill(); };
const drawCalendar62 = (g, w, h) => { g.fillStyle = "#f4efe4"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a6a9a"; g.fillRect(6, 6, w - 12, h * 0.42); g.fillStyle = "#f4f0e0"; g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.fillText("ILLINOIS", w / 2, h * 0.2);
  g.fillStyle = "#8a1a1a"; g.font = "bold 14px Georgia"; g.fillText("JULY 1962", w / 2, h * 0.56); g.fillStyle = "#222"; g.font = "8px sans-serif"; for (let d = 0; d < 31; d++) g.fillText(String(d + 1), 14 + (d % 7) * 16, h * 0.66 + Math.floor(d / 7) * 11); };

// ---------- cars and trucks of 1962: full-size sedans of the late 1950s and early 60s (long, low, a little chrome, small fins) and pickups ----------
// Shapes and colours are typical of the time, not particular makes. Parked along the downtown curbs and driven along the through streets.
function carGeo(kind) { const body = [], trim = [], B = (L, x, y, z, sx, sy, sz, rx = 0) => L.push([new THREE.BoxGeometry(sx, sy, sz), MT(x, y, z, 1, 1, 1, rx)]);
  if (kind === 0) { B(body, 0, 0.62, 0, 1.98, 0.5, 5.3); const cab = new THREE.BoxGeometry(1.72, 0.5, 2.5), p = cab.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.9); p.setZ(i, p.getZ(i) * 0.78); } cab.computeVertexNormals(); body.push([cab, MT(0, 1.12, -0.25)]);
    for (const s of [-1, 1]) B(body, s * 0.82, 0.93, -2.35, 0.08, 0.14, 0.7);
    for (const s of [-1, 1]) { const w = new THREE.BoxGeometry(0.02, 0.4, 2.0), q = w.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) > 0) q.setZ(i, q.getZ(i) * 0.78); trim.push([w, MT(s * 0.84, 1.13, -0.25)]); }
    trim.push([new THREE.BoxGeometry(1.5, 0.42, 0.02), MT(0, 1.12, 0.93, 1, 1, 1, -0.5)]); trim.push([new THREE.BoxGeometry(1.5, 0.4, 0.02), MT(0, 1.12, -1.42, 1, 1, 1, 0.5)]);
    trim.push([new THREE.BoxGeometry(2.04, 0.14, 0.14), MT(0, 0.42, 2.66)], [new THREE.BoxGeometry(2.04, 0.14, 0.14), MT(0, 0.42, -2.66)]); trim.push([new THREE.BoxGeometry(1.6, 0.18, 0.04), MT(0, 0.62, 2.66)]); }
  else { B(body, 0, 0.68, 1.2, 1.9, 0.6, 2.4); B(body, 0, 1.25, 0.25, 1.75, 0.6, 1.4); B(body, 0, 0.7, -1.3, 1.9, 0.62, 2.4); for (const s of [-1, 1]) trim.push([new THREE.BoxGeometry(0.02, 0.42, 1.0), MT(s * 0.88, 1.3, 0.25)]); trim.push([new THREE.BoxGeometry(1.5, 0.42, 0.02), MT(0, 1.3, 0.96)]); trim.push([new THREE.BoxGeometry(1.96, 0.14, 0.14), MT(0, 0.42, 2.45)]); body.push([new THREE.BoxGeometry(1.7, 0.05, 2.3), MT(0, 0.95, -1.3)]); }
  const z0 = kind === 0 ? 1.65 : 1.5; for (const [x, z] of [[-0.86, z0], [0.86, z0], [-0.86, -z0], [0.86, -z0]]) { trim.push([new THREE.CylinderGeometry(0.36, 0.36, 0.24, 9).rotateZ(Math.PI / 2), MT(x, 0.36, z)]); trim.push([new THREE.CylinderGeometry(0.2, 0.2, 0.25, 7).rotateZ(Math.PI / 2), MT(x, 0.36, z, 1.01, 1, 1)]); }
  for (const s of [-1, 1]) trim.push([new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6).rotateX(Math.PI / 2), MT(s * 0.68, 0.72, kind === 0 ? 2.66 : 2.42)]);
  const tg = mergeG(trim), tc = tg.attributes.color; let o = 0; for (const [g] of trim) { const n = (g.index ? g.index.count : g.attributes.position.count), c = g.parameters && g.parameters.radiusTop === 0.2 ? 0.92 : g.parameters && g.parameters.radiusTop === 0.36 ? 0.08 : g.parameters && g.parameters.radiusTop === 0.1 ? 1.0 : g.parameters && g.parameters.height === 0.14 ? 0.85 : 0.12; for (let i = 0; i < n; i++) tc.setX(o + i, c), tc.setY(o + i, c), tc.setZ(o + i, c * (c < 0.2 ? 1.25 : 1)); o += n; }
  return [mergeG(body), tg]; }
const CARMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.25 }), TRIMMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5 });
const CARC = [0x1e1e22, 0xe8e6de, 0x3a8a8a, 0x8ab8c8, 0xc84a3a, 0xd8c8a0, 0x4a6a4a, 0x2a3a6a, 0xe8a8a0, 0x9aa0a0, 0xd8d070, 0x6a2a2a, 0xa8c8a8];
const CARS = [0, 1].map(k => { const [b, t] = carGeo(k), N = k === 0 ? 420 : 160, mb = new THREE.InstancedMesh(b, CARMAT, N), mt = new THREE.InstancedMesh(t, TRIMMAT, N); for (const m of [mb, mt]) { m.frustumCulled = false; m.castShadow = true; m.count = 0; scene.add(m); } return { mb, mt, n: 0, N }; });
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cc = new THREE.Color();
function addCar(k, x, z, a, col) { const C = CARS[k]; if (C.n >= C.N) return -1; const i = C.n++; setCar(k, i, x, z, a); C.mb.setColorAt(i, _cc.setHex(col)); C.mt.setColorAt(i, _cc.setHex(0xffffff)); C.mb.count = C.mt.count = C.n; return i; }
function setCar(k, i, x, z, a, y = null) { const C = CARS[k]; _cq.setFromAxisAngle(V3(0, 1, 0), a); _cm.compose(V3(x, y === null ? ground(x, z) + 0.1 : y, z), _cq, V3(1, 1, 1)); C.mb.setMatrixAt(i, _cm); C.mt.setMatrixAt(i, _cm); C.mb.instanceMatrix.needsUpdate = C.mt.instanceMatrix.needsUpdate = true; }
const cumOf = L => { const c = [0]; for (let i = 1; i < L.length; i++) c.push(c[i - 1] + Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1])); return c; };
function along(L, cum, s) { s = clampN(s, 0, cum[cum.length - 1]); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), a = L[lo], b = L[hi]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])]; }
// the through streets joined end to end by name, for the cars to drive
function chains(filter) { const segs = ROADS.filter(filter).map(R => R.L.slice()), out = []; const used = new Set(), near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 3;
  for (let i = 0; i < segs.length; i++) { if (used.has(i)) continue; used.add(i); let L = segs[i].slice(), grew = true;
    while (grew) { grew = false; for (let j = 0; j < segs.length; j++) { if (used.has(j)) continue; const S = segs[j]; if (near(L[L.length - 1], S[0])) L = L.concat(S.slice(1)); else if (near(L[L.length - 1], S[S.length - 1])) L = L.concat(S.slice().reverse().slice(1)); else if (near(L[0], S[S.length - 1])) L = S.concat(L.slice(1)); else if (near(L[0], S[0])) L = S.slice().reverse().concat(L.slice(1)); else continue; used.add(j); grew = true; } }
    out.push(L); } return out.map(L => ({ L, cum: cumOf(L) })).filter(c => c.cum[c.cum.length - 1] > 250); }
const MOVERS = [];
function buildCars() { const names = new Set(ROADS.filter(R => R.cls <= 3 && R.name).map(R => R.name)); let ci = 0;
  for (const nm of names) for (const C of chains(R => R.name === nm && R.cls <= 3)) { const len = C.cum[C.cum.length - 1], n = Math.min(10, Math.max(1, Math.round(len / 450)));
    for (let k = 0; k < n; k++) { const kind = hash(ci, 2) < 0.2 ? 1 : 0, dir = k % 2 ? 1 : -1, i = addCar(kind, 0, 0, 0, CARC[(hash(ci, 3) * CARC.length) | 0]); if (i < 0) continue; MOVERS.push({ C, kind, i, s: hash(ci, 4) * len, dir, v: 10 + 4 * hash(ci, 5), hw: RW[ROADS.find(R => R.name === nm).cls] / 4, wait: 0 }); ci++; } }
  // parked at the downtown curbs
  for (const R of ROADS) { if (R.cls > 4 || R.cls < 1) continue; const L = resample(R.L, 6.2), hw = RW[R.cls] / 2;
    for (let i = 1; i < L.length - 1; i++) { const [x, z] = L[i]; if (Math.hypot(x + 300, z + 120) > 520 && !(red54(x, z) && hash(Math.round(x), Math.round(z)) < 0.1)) continue; const [ax, az] = L[i - 1], [bx, bz] = L[i + 1], d = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / d, uz = (bz - az) / d;
      for (const sd of [-1, 1]) { if (hash(i * 7 + sd, Math.round(x * 3)) > 0.55) continue; const px = x - uz * (hw - 1.15) * sd, pz = z + ux * (hw - 1.15) * sd; if (inHole(px, pz) && Math.hypot(...[px, pz].map((v, j) => v - JW(6.85, -10)[j])) > 30) continue; const [s2, d2] = nearestRoad(px, pz); if (s2 && s2.R !== R && d2 < s2.hw + 1) continue;
        addCar(hash(i, sd + 9) < 0.15 ? 1 : 0, px, pz, Math.atan2(ux * sd, uz * sd), CARC[(hash(i * 3 + sd, Math.round(z)) * CARC.length) | 0]); } } }
  // the sheriff's car in front of the jail: dark, with a red light on the roof (as county cars had; this one is typical)
  { const [s] = nearestRoad(...JW(6.85, -12)); if (s) { const dx = s.bx - s.ax, dz = s.bz - s.az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, p = JW(2.0, -12), t = clampN(((p[0] - s.ax) * ux + (p[1] - s.az) * uz), 0, L), cx = s.ax + ux * t, cz = s.az + uz * t, nx = -uz, nz = ux, sg = ((JW(6.85, 0)[0] - cx) * nx + (JW(6.85, 0)[1] - cz) * nz) > 0 ? 1 : -1, px = cx + nx * sg * (s.hw - 1.15), pz = cz + nz * sg * (s.hw - 1.15);
    addCar(0, px, pz, Math.atan2(ux, uz), 0x1a1a1e); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd82020, emissive: 0x801010, roughness: 0.3 })); dome.position.set(px, ground(px, pz) + 1.47, pz); scene.add(dome); SHERIFF_CAR.push([px, pz]); } } }
const SHERIFF_CAR = [];
function updateCars(dt) { for (const M of MOVERS) { const len = M.C.cum[M.C.cum.length - 1]; M.s += M.dir * M.v * dt; if (M.s > len - 2) { M.s = len - 2; M.dir = -1; } else if (M.s < 2) { M.s = 2; M.dir = 1; }
    const [x, z, a] = along(M.C.L, M.C.cum, M.s), ox = Math.cos(a) * M.hw * M.dir, oz = -Math.sin(a) * M.hw * M.dir; if (Math.abs(x - ME.x) > 1800 || Math.abs(z - ME.z) > 1800) { if ((frameN + M.i) % 30) continue; } setCar(M.kind, M.i, x + ox, z + oz, a + (M.dir < 0 ? Math.PI : 0)); } }
// a freight on the Nickel Plate or the Wabash: a diesel road switcher of the 1950s and a string of boxcars, hoppers and a caboose
const TRAIN = (() => { const g = [], dark = M(0x2a2a2c, { roughness: 0.6 }), loco = M(0x1e2a3a, { roughness: 0.5 }), box1 = M(0x7a3a26), hop = M(0x3a3a38), cab = M(0xa83a2a), mk2 = (geo, m, y = 0) => { const me = new THREE.Mesh(geo, m); me.position.y = y; me.castShadow = true; return me; };
  const car = (kind) => { const G = new THREE.Group(); if (kind === "loco") { G.add(mk2(new THREE.BoxGeometry(3.0, 2.6, 16), loco, 2.4), mk2(new THREE.BoxGeometry(3.1, 1.0, 3.2), loco, 4.1)); G.children[1].position.z = 4.6; }
      else if (kind === "box") G.add(mk2(new THREE.BoxGeometry(3.0, 3.4, 12.5), box1, 2.6)); else if (kind === "hop") G.add(mk2(new THREE.BoxGeometry(3.0, 2.8, 10), hop, 2.4)); else { G.add(mk2(new THREE.BoxGeometry(2.8, 2.5, 9), cab, 2.3), mk2(new THREE.BoxGeometry(1.6, 1.0, 2.6), cab, 4.0)); }
      G.add(mk2(new THREE.BoxGeometry(2.6, 0.5, kind === "loco" ? 15 : 11), dark, 0.9)); G.len = kind === "loco" ? 17 : kind === "box" ? 13.5 : kind === "hop" ? 11 : 10; G.visible = false; scene.add(G); return G; };
  const cars = [car("loco"), car("loco")]; for (let k = 0; k < 18; k++) cars.push(car(hash(k, 77) < 0.6 ? "box" : "hop")); cars.push(car("caboose")); return { cars, s: 0, dir: 1, line: null, t: 30 }; })();
function buildTrain() { let best = null; for (const L of RAILS) { const c = cumOf(L); if (!best || c[c.length - 1] > best.cum[best.cum.length - 1]) best = { L, cum: c }; } TRAIN.line = best; }
function updateTrain(dt) { const T0 = TRAIN, B = T0.line; if (!B) return; const len = B.cum[B.cum.length - 1]; if (T0.t > 0) { T0.t -= dt; for (const c of T0.cars) c.visible = false; return; }
  T0.s += T0.dir * 13 * dt; if (T0.s > len + 300 || T0.s < -300) { T0.dir *= -1; T0.t = 120; T0.s = T0.dir > 0 ? -60 : len + 60; return; }
  let s = T0.s; for (const c of T0.cars) { const sc = s - T0.dir * c.len / 2, on = sc > 1 && sc < len - 1, [x, z, a] = along(B.L, B.cum, sc); c.visible = on; if (on) { c.position.set(x, ground(x, z) + 0.36, z); c.rotation.y = a + (T0.dir < 0 ? Math.PI : 0); } s -= T0.dir * c.len; } }

// ---------- downtown landmarks drawn with more than an outline ----------
// The courthouse (1913-15, stone, three storeys: Sanborn sheet 3 shows it on this outline in 1930, and it stands today): columns across the
// front to Main Street, typical of the courthouses of its day, not traced. The Wildey Theatre (1909): its marquee; what played that week is not known.
const STREETLAMPS = [];
function buildLandmarks() { const ct = BLD.find(b => /Courthouse/.test(b.name)), wt = BLD.find(b => /Wildley|Wildey/.test(b.name));
  if (ct) { const B = ct.B, cand = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([su, sv]) => { const x = B.cx + (B.ux * B.hl * su - B.uz * B.hw * sv), z = B.cz + (B.uz * B.hl * su + B.ux * B.hw * sv); return [su, sv, x, z, nearestRoad(x, z, s => /Main/.test(s.R.name))[1]]; }).sort((a, b) => a[4] - b[4])[0];
    const [su, sv, fx, fz] = cand, nx = su ? B.ux * su : -B.uz * sv, nz = su ? B.uz * su : B.ux * sv, ry = Math.atan2(nx, nz), half = su ? B.hw : B.hl, g = ground(fx, fz), F = frame(fx, fz, g + 0.3, ry);
    const n = 6, span = Math.min(half * 1.4, 22); for (let k = 0; k < n; k++) { const x = -span / 2 + span * k / (n - 1); lathe(F, MAT.stone, x, 1.2, 1.4, [[0.55, 0], [0.5, 0.3], [0.42, 0.4], [0.4, 9.2], [0.5, 9.5], [0.55, 9.8]], 0xffffff, 14); box(F, MAT.stone, x, 0.8, 1.4, 1.2, 0.8, 1.2, 0xffffff); }
    box(F, MAT.stone, 0, 11.4, 1.4, span + 2, 1.2, 2.6, 0xffffff); for (let k = 0; k < 6; k++) box(F, MAT.stone, 0, 0.75 - k * 0.15, 2.8 + k * 0.38, span + 2 - k * 0.2, 0.15, 0.4, 0xe8e4d8); floorRect(F, -span / 2 - 1, 0.6, span / 2 + 1, 5, 0.75, { y2: -0.15, along: "z" }); floorRect(F, -span / 2 - 1, -0.2, span / 2 + 1, 2.7, 0.75);
    COURT.F = F; }
  if (wt) { const B = wt.B, cand = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([su, sv]) => { const x = B.cx + (B.ux * B.hl * su - B.uz * B.hw * sv), z = B.cz + (B.uz * B.hl * su + B.ux * B.hw * sv); return [su, sv, x, z, nearestRoad(x, z, s => /Main/.test(s.R.name))[1]]; }).sort((a, b) => a[4] - b[4])[0];
    const [su, sv, fx, fz] = cand, nx = su ? B.ux * su : -B.uz * sv, nz = su ? B.uz * su : B.ux * sv, ry = Math.atan2(nx, nz), F = frame(fx, fz, ground(fx, fz) + 0.1, ry);
    box(F, MAT.plain, 0, 4.3, 1.6, 7.5, 1.4, 3.0, 0xe8e0c8); box(F, MAT.glow, 0, 3.55, 1.6, 7.6, 0.1, 3.1, 0xfff2c8); const t = tex(512, 128, (g2, w, h) => { g2.fillStyle = "#f4ecd0"; g2.fillRect(0, 0, w, h); g2.fillStyle = "#b02018"; g2.font = "bold 70px Futura, 'Trebuchet MS', sans-serif"; g2.textAlign = "center"; g2.fillText("WILDEY", w / 2, 78); g2.fillStyle = "#1e2a4a"; g2.font = "bold 22px sans-serif"; g2.fillText("AIR CONDITIONED", w / 2, 112); });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 1.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 })); me.position.copy(toWorld(F, 0, 4.3, 3.12)); me.rotation.y = ry; scene.add(me); WILDEY.F = F; WILDEY.sign = me; }
  // street lamps along the downtown streets
  for (const R of ROADS) { if (R.cls > 4) continue; const L = resample(R.L, 32), hw = RW[R.cls] / 2; for (let i = 1; i < L.length; i++) { const [x, z] = L[i]; if (Math.hypot(x + 300, z + 120) > 420) continue; const [ax, az] = L[i - 1], d = Math.hypot(x - ax, z - az) || 1, px = x + (z - az) / d * (hw + 0.6), pz = z - (x - ax) / d * (hw + 0.6); if (nearB(px, pz, 0.5)) continue; STREETLAMPS.push([px, pz, Math.atan2(-(z - az), x - ax)]); } }
  const pole = mergeG([[new THREE.CylinderGeometry(0.08, 0.11, 7.5, 8), MT(0, 3.75, 0)], [new THREE.BoxGeometry(0.08, 0.08, 1.8), MT(0, 7.4, -0.9)], [new THREE.BoxGeometry(0.34, 0.14, 0.6), MT(0, 7.32, -1.8)]]), im = new THREE.InstancedMesh(pole, new THREE.MeshStandardMaterial({ color: 0x6a6e6a, roughness: 0.5, metalness: 0.4, vertexColors: true }), STREETLAMPS.length);
  STREETLAMPS.forEach(([x, z, a], i) => im.setMatrixAt(i, new THREE.Matrix4().compose(V3(x, ground(x, z) + 0.1, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), a), V3(1, 1, 1)))); im.castShadow = true; scene.add(im); }
const COURT = {}, WILDEY = {};

// ---------- the people, Saturday afternoon: shoppers downtown, the jail's household and its prisoners, a few in the yards ----------
const crowd = new Crowd(240), PEOPLE = [];
const wl = (F, X, Z, y = null) => { const w = toWorld(F, X, 0, Z); return [w.x, y === null ? ground(w.x, w.z) : F.y + y, w.z]; };
function person(L, name, info, o) { if (PEOPLE.length >= 240) return null; const p = { L, name, info, i: PEOPLE.length, t0: hash(PEOPLE.length, 3) * 50, ...o }; crowd.look(p.i, L); PEOPLE.push(p); return p; }
function placePeople() { const F = JF, J = (X, Z, y) => wl(F, X, Z, y), ry = F.ry;
  person(looks(1, "jailer"), "The jailer", "On duty in the jailer's office, with the telephone, the radio and the prisoner register. Who held the job in July 1962 was not looked up; he is typical.", { pos: J(2.6, 6.85, F1 + 0.02), h: ry, kind: "sit" });
  person(looks(2, "cook", { dressC: 0xc8d8e8 }), "In the jailer's kitchen", "Cooking for the prisoners: in many county jails of the time the jailer's or sheriff's family lived in the house and cooked the prisoners' meals, the county paying so much a meal. Whether that was so here in 1962 is not known.", { pos: J(12.2, 5.9, F1), h: ry + Math.PI / 2, kind: "knead" });
  person(looks(3, "deputy"), "A deputy", "A sheriff's deputy in a khaki uniform (typical; the county's uniforms of 1962 were not looked up).", { pos: J(6.6, 4.0, F1), h: ry + 0.4, kind: "talk" });
  for (const [i, c] of CELLS.entries()) { if (PEOPLE.length > 16 || hash(i, 41) > 0.38) continue; if (c.era === 1904 && c.k === 1 && c.side > 0) continue; const sit = hash(i, 42) < 0.6, women = c.era === 1904 && c.k === 1 && c.side < 0, L = women ? looks(150 + i, "woman", { dressC: 0x8a9aaa }) : looks(100 + i, "inmate"); let x = c.x, z = c.z, h;
    if (c.era === 1869) { if (sit) { x = c.x - 0.6; h = Math.PI / 2; } else h = c.sg > 0 ? Math.PI : 0; } else { if (sit) { z = c.z + 0.45; h = Math.PI; } else h = c.side > 0 ? Math.PI / 2 : -Math.PI / 2; }
    person(L, null, null, { pos: J(x, z, c.y + (sit ? 0.06 : 0)), h: h + ry, kind: sit ? "sit" : "talk" }); }
  person(looks(160, "woman", { dressC: 0xe8c0a0 }), "A visitor", "Talking to a prisoner through the conversation cage of 1904-05: two gratings with a space between, so nothing could be passed. Visitors came in from the yard by the south door.", { pos: J(-0.9, 16.5, J1 + 0.02), h: ry, kind: "sit" });
  person(looks(161, "inmate"), null, null, { pos: J(-0.9, 18.9, J1), h: ry + Math.PI, kind: "talk" });
  // downtown: walking the sidewalks of Main, Vandalia, Purcell, Second and St. Louis Streets; talking in front of the stores
  const streets = ROADS.filter(R => R.cls >= 1 && R.cls <= 4 && R.L.some(([x, z]) => Math.hypot(x + 300, z + 120) < 350)); let k = 0;
  for (const R of streets) { const L = R.L.filter(([x, z]) => Math.hypot(x + 300, z + 120) < 450); if (L.length < 2) continue; const len = cumOf(L).pop(), n = Math.min(8, Math.round(len / 45));
    for (let j = 0; j < n; j++, k++) { const role = ["man", "woman", "woman", "suit", "man", "girl", "boy", "woman"][k % 8], sd = j % 2 ? 1 : -1; person(looks(200 + k, role), null, null, { path: "poly", pts: L, speed: (role === "girl" || role === "boy" ? 1.1 : 1.25) * (0.85 + 0.3 * hash(k, 8)) * (hash(k, 9) < 0.5 ? 1 : -1), off: hash(k, 10) * len * 2, side: sd * (RW[R.cls] / 2 + 1.5), kind: "walk", lift: 0.16 }); } }
  for (let j = 0; j < 14; j++) { const S = STOREFRONTS[(hash(j, 70) * STOREFRONTS.length) | 0]; if (!S) break; const a = S.P[0], b = S.P[1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, [s, d] = nearestRoad(mx, mz); if (!s || d > s.hw + 9) continue;
    const L = Math.hypot(s.bx - s.ax, s.bz - s.az) || 1, ux = (s.bx - s.ax) / L, uz = (s.bz - s.az) / L, t = clampN((mx - s.ax) * ux + (mz - s.az) * uz, 0, L), cx = s.ax + ux * t, cz = s.az + uz * t, sg = ((mx - cx) * -uz + (mz - cz) * ux) > 0 ? 1 : -1, px = cx - uz * sg * (s.hw + 1.7), pz = cz + ux * sg * (s.hw + 1.7), a0 = Math.atan2(ux, uz);
    for (let q = 0; q < 2; q++) { const o = q ? 0.42 : -0.42; person(looks(400 + j * 2 + q, ["suit", "woman", "man", "woman"][(j + q) % 4]), null, null, { pos: [px + ux * o, ground(px, pz) + 0.16, pz + uz * o], h: a0 + (q ? Math.PI : 0), kind: "talk" }); } }
  if (COURT.F) for (let j = 0; j < 4; j++) person(looks(500 + j, j % 2 ? "suit" : "woman"), null, null, { pos: wl(COURT.F, -3 + j * 2, 4.5 + (j % 2), 0.0), h: COURT.F.ry + (j % 2 ? Math.PI : 0), kind: j < 2 ? "talk" : "walk0" });
  // in the yards and on the residential streets
  const houses = BLD.filter(b => b.kind === "house"); for (let j = 0; j < 40; j++) { const b = houses[(hash(j, 90) * houses.length) | 0]; if (!b) break; const a = hash(j, 91) * 6.28, r = Math.max(b.B.hl, b.B.hw) + 2.5, x = b.cx + Math.cos(a) * r, z = b.cz + Math.sin(a) * r; if (nearRoad(x, z, 0.5)) continue;
    const role = ["man", "boy", "girl", "woman"][j % 4]; person(looks(600 + j, role), null, null, role === "boy" || role === "girl" ? { path: "circle", c: [x, 0, z], r: 2 + 2 * hash(j, 92), speed: 1.6 * (hash(j, 93) < 0.5 ? 1 : -1), kind: "walk" } : { pos: [x, ground(x, z), z], h: a, kind: role === "man" ? "hoe" : "talk" }); } }
function pathPos(p, t) { if (p.pos) return [p.pos[0], p.pos[1], p.pos[2], p.h];
  if (p.path === "circle") { const a = t * p.speed / p.r + (p.phase || 0), x = p.c[0] + Math.cos(a) * p.r, z = p.c[2] + Math.sin(a) * p.r; return [x, ground(x, z), z, -a + (p.speed > 0 ? 0 : Math.PI)]; }
  if (p.path === "poly") { if (!p.cum) p.cum = cumOf(p.pts); const len = p.cum[p.cum.length - 1], s0 = ((t * Math.abs(p.speed) * Math.sign(p.speed) + p.off) % (2 * len) + 2 * len) % (2 * len), fw = s0 < len, s = fw ? s0 : 2 * len - s0;
    const [x, z, a] = along(p.pts, p.cum, s), sx = x + Math.cos(a) * p.side * (fw ? 1 : -1), sz = z - Math.sin(a) * p.side * (fw ? 1 : -1); return [sx, ground(sx, sz) + (p.lift || 0), sz, fw ? a : a + Math.PI]; } return [0, 0, 0, 0]; }

// ---------- building it all ----------
buildWater(); buildRoads(); buildRails(); flushBK(false);
buildJail(); buildTown(); buildStorefronts(); buildLandmarks(); plantTownTrees(); buildPoles(); buildCars(); buildTrain(); flushBK(true);
placePeople();

// ---------- what is known, and what is not: the info points ----------
const INFO = [], infoTex = tex(64, 64, (g, w, h) => { g.fillStyle = "#1e3a5a"; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = "#f4e8c8"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#f4e8c8"; g.font = "bold 36px Georgia"; g.textAlign = "center"; g.fillText("i", 32, 44); });
function info(pos, title, text) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: infoTex, depthTest: true })); sp.scale.setScalar(0.28); sp.position.copy(pos); scene.add(sp); INFO.push({ pos, title, text, sp }); }
const JP = (X, Z, y) => toWorld(JF, X, y, Z), GP = (x, z, dy = 1.8) => V3(x, ground(x, z) + dy, z);
info(JP(11.5, -4.5, 1.8), "The Madison County Sheriff's House and Jail, 1869-1982", "Built 1869-71 to the design of Alonzo Keller; listed on the National Register of Historic Places in 1980 (no. 80001394), the year after the county moved its prisoners out; torn down in 1982. The sheriff's house in front is Second Empire: brick, two storeys and a mansard roof (the Sanborn map counts it as 2 1/2), six dormers, a bracketed cornice, tin roofs, a front porch with an upper porch and its iron bannister (all from E. W. Bowles's history of 1960). Its outline, 46 ft along Main Street and about 31 ft deep, and the jail's outline behind it are traced off Sanborn sheet 4 (1930, corrected to 1947). The colours, the exact windows and the trim are typical of the style, not known.");
info(JP(6.85, 2.0, F1 + 1.9), "The sheriff's house, inside", "No plan survives. The rooms are laid out as such houses usually were: a hall and stair down the middle, two rooms each side. The 1960 history places the jailer's kitchen and office against the back wall, each with a peephole into the jail; the bathroom (1906) upstairs in the south-west corner; the third storey under the mansard was left unfinished until about 1893. The front rooms as the sheriff's office, the bedrooms upstairs and all the furniture are typical of 1962, not known.");
info(JP(3.2, 8.4, F1 + 1.9), "The peephole", "\"Two half-inch funnel-shaped peep holes\" were bored through the back wall of the house, one from the jailer's kitchen and one from his office, so that the corridors of the jail could be watched without going in. Bowles saw them still in 1960. Put your eye to the funnel on this wall.");
info(JP(11.4, 7.3, F1 + 1.9), "The jailer's kitchen", "The kitchen had the other peephole (the funnel beside the door to the jail). The range, refrigerator and table are typical of a 1962 kitchen. Feeding the prisoners from the jailer's kitchen was usual in county jails; whether it was done here in 1962 is not known.");
info(JP(6.7, 10.2, J1 + 1.9), "The jail of 1869: the cage", "From the 1960 history: the cells were enclosed by iron bars, inside a grated corridor; in 1878 the lower two feet of the grating were sheathed with No. 8 plate iron; a cage stood in front of the inner jail door, so the jailer could open one door at a time. A rock floor; furnace heat, then steam heat in 1893 (put in by Tuxhorn Brothers); electric light in 1895 (21 lights); plumbing in 1899. The Sanborn map marks 16-inch brick walls, two storeys, steam heat and electric light. Not known: how many cells, or their layout; six on each floor here is a guess.");
info(JP(3.0, 15.0, J2 + 1.9), "The jail of 1869: upstairs", "The upper floor repeats the lower, reached by an iron stair. The history speaks of \"both halls\"; how the floors were arranged is not recorded.");
info(JP(10.9, 22.6, J1 + 1.9), "The addition of 1904-05", "Built by the Pauly Jail Building Company of St. Louis (Charles Pauly & Son), with the contractor John Keller: brick on a concrete base, to the rear and the south side of the old jail. Twenty cells, ten of tool-proof steel and ten of Bessemer steel, of solid plate with grated fronts, on the \"side corridor system\" with the plumbing in the corridors; separate sections for women, juveniles, \"hardened\" and ordinary prisoners; four bathrooms; a laundry in the basement (not shown); a conversation cage; a storeroom of lockers; the cell doors worked by a lever in a steel casing. Steel plates naming the steel were still on the cells in 1960. Which section was where is not recorded: here the men are below, the women and juveniles above.");
info(JP(1.0, 21.7, J1 + 1.9), "The locking lever", "In the Pauly system the cell doors of a row were locked and unlocked together from outside the corridor, by a lever in a steel casing, so the guard never had to reach in among the prisoners. Its exact form here is typical.");
info(JP(-0.6, 17.0, J1 + 1.9), "The conversation cage", "Where prisoners talked with visitors (1904-05): two close gratings with a space between, so nothing could be handed through. Its place in the little south wing, and the visitors' door from the yard, are guesses.");
info(JP(3.0, 26.0, J2 + 1.9), "The women's section", "The 1904-05 addition kept women apart from men. Upstairs on the south side here; where it really was is not recorded.");
info(JP(18.0, 12.0, 1.8), "The building marked JAIL, and the shed", "Sanborn sheet 4 shows, north of the jail, a small two-storey brick building marked JAIL with a one-storey KITCHEN, and a frame shed. What they were used for, and whether they still stood in 1962, is not known.");
if (COURT.F) info(toWorld(COURT.F, 0, 2.2, 6), "The Madison County Courthouse", "Of 1913-15, stone, three storeys and fireproof (Sanborn sheet 3, 1930), on the outline it still has today. The columns are typical of the courthouses of its time; its true front was not traced.");
if (WILDEY.F) info(toWorld(WILDEY.F, 2, 2.0, 5), "The Wildey Theatre", "Built in 1909 by the Odd Fellows as an opera house and theatre (the Sanborn of 1930 shows it here), a movie theatre by the 1960s. The marquee is typical; what was showing in July 1962 was not looked up.");
info(GP(-213, 17), "Downtown Edwardsville", "Main Street (Route 159) and Vandalia Street. Each building stands on its true outline where today's map and the 1954 map agree, or the Sanborn map of 1930-47 shows it; buildings put up downtown since 1962 are left out where known (the county administration building and the sheriff's office among them), and the stores, the interurban's waiting room and the county power house that the administration building replaced, beside the jail, are put back from the Sanborn map. The storefronts and the signs on them are typical of a county seat of 1962, not the real shops of that summer.");
info(GP(-990, 215), "The high school", "The 1954 map marks the high school here, west of downtown on St. Louis Street (today's Lincoln Middle School building).");
info(GP(-221, -425), "Columbus School", "On the Sanborn map of 1930, as now.");
info(GP(470, 1150), "Leclaire", "N. O. Nelson's cooperative factory village, founded in 1890 round his plumbing-supply works, with Leclaire Lake and its park; part of Edwardsville since 1934. The works' buildings stand on their true outlines.");
info(GP(30, -60), "St. Boniface", "The German Catholic parish of Edwardsville; the church on its outline of today, the tower and spire typical.");
info(GP(-372, -200, 1.8), "How this town was put together", "The ground is the USGS elevation model. The town is today's OpenStreetMap, kept only where the USGS map of 1954 (aerial photographs of 1952) shows the building or the built-up tint; houses the 1954 map shows that are gone today are put back where it shows them, as typical houses (" + RECON_N.gone + " here), and blocks it tints as built up, where today's map has no buildings, are filled with typical houses (" + RECON_N.fill + "). Buildings of 1952-62 cannot be dated from these maps and mostly are not shown; Southern Illinois University's campus (opened 1965) and the interstates (later 1960s) are not here.");

// ---------- moving about ----------
let yaw = 0, pitch = -0.05, vrYaw = 0, started = false, msgT = 0, rateI = 0; const keys = {}, RATES = [1, 60, 600];
const front = (F, X, Z) => toWorld(F, X, 0, Z);
const PLACES = [
  ["North Main Street, in front of the jail", () => JP(6.85, -17, 0), JRY + Math.PI, 0.16],
  ["The sheriff's house: the front hall", () => JP(6.85, 1.2, F1), JRY + Math.PI],
  ["The jailer's office, by the peephole", () => JP(3.9, 6.6, F1), JRY + Math.PI + 0.35],
  ["The jailer's kitchen", () => JP(10.6, 7.6, F1), JRY + Math.PI * 0.75],
  ["The jail of 1869: inside the cage", () => JP(6.7, 11.5, J1), JRY + Math.PI],
  ["The jail of 1869: upstairs", () => JP(3.0, 12.0, J2), JRY + Math.PI],
  ["The 1904 cell block: the side corridor", () => JP(11.0, 22.0, J1), JRY + Math.PI],
  ["The 1904 cell block upstairs: the women's section", () => JP(0.8, 22.0, J2), JRY + Math.PI],
  ["The conversation cage", () => JP(-1.6, 16.0, J1), JRY + Math.PI],
  ["Upstairs in the sheriff's house", () => JP(6.4, 7.8, F2), JRY],
  ["The courthouse", () => COURT.F ? toWorld(COURT.F, 0, 0, 12) : GP(-384, -100, 0), COURT.F ? COURT.F.ry : 0],
  ["Main and Vandalia", () => GP(-210, 20, 0), 0.705],
  ["The Wildey Theatre", () => WILDEY.F ? toWorld(WILDEY.F, 0, 0, 14) : GP(-470, -300, 0), WILDEY.F ? WILDEY.F.ry : 0],
  ["Columbus School", () => GP(-200, -400, 0), 2.6],
  ["The high school, St. Louis Street", () => GP(-950, 215, 0), 1.2],
  ["Leclaire Lake and the N. O. Nelson works", () => { const L = OSM_LAND.find(l => l[1] === "Leclaire Lake"); if (!L) return GP(400, 1182, 0); const P = pairs(L[2]); let w = P[0]; for (const p of P) if (p[0] < w[0]) w = p; return GP(w[0] - 14, w[1], 0); }, -Math.PI / 2],
  ["St. Boniface", () => GP(60, -40, 0), 0.8],
  ["Out in the fields south of town", () => GP(-600, 1900, 0), Math.PI]];
let placeI = 0;
const floorAt = (x, z, yRef) => { let best = ground(x, z); for (const R of FLOORS) { const [lx, lz] = toLocal(R, x, z); if (lx < R.x0 || lx > R.x1 || lz < R.z0 || lz > R.z1) continue; if (R.holes.some(([a, b, c, d]) => lx > a && lx < c && lz > b && lz < d)) continue;
    const y = R.y2 === null ? R.y : R.along === "x" ? lerpN(R.y, R.y2, (lx - R.x0) / (R.x1 - R.x0)) : lerpN(R.y, R.y2, (lz - R.z0) / (R.z1 - R.z0)); if (y <= yRef + 0.45 && y > best) best = y; } return best; };
function goPlace(i) { placeI = (i + PLACES.length) % PLACES.length; const [n, f, h] = PLACES[placeI], p = f(); ME.x = p.x; ME.z = p.z; ME.y = floorAt(p.x, p.z, p.y + 0.1); ME.vy = 0; yaw = h; pitch = PLACES[placeI][3] ?? -0.05; vrYaw = yaw; say(`<b>${n}</b>`, 6); updateGround(true); fillTrees(); menuEl.style.display = "none"; }
function moveTo(nx, nz) { const r = 0.22; let x = nx, z = nz;
  for (let it = 0; it < 3; it++) { for (const w of WALLS) { if (ME.y + 1.7 < w.y0 || ME.y > w.y1 - 0.2) continue; if (Math.max(w.ax, w.bx) < x - 1 || Math.min(w.ax, w.bx) > x + 1 || Math.max(w.az, w.bz) < z - 1 || Math.min(w.az, w.bz) > z + 1) continue;
      const dx = w.bx - w.ax, dz = w.bz - w.az, L2 = dx * dx + dz * dz || 1, t = clampN(((x - w.ax) * dx + (z - w.az) * dz) / L2, 0, 1), px = w.ax + t * dx, pz = w.az + t * dz, d = Math.hypot(x - px, z - pz); if (d < r && d > 1e-6) { x = px + (x - px) / d * r; z = pz + (z - pz) / d * r; } }
    for (const S of SOLIDS) { if (ME.y > S.y1 || ME.y < S.y0 - 1) continue; const [lx, lz] = toLocal(S, x, z); if (lx < S.x0 - r || lx > S.x1 + r || lz < S.z0 - r || lz > S.z1 + r) continue;
      const pen = [[lx - (S.x0 - r), -1, 0], [S.x1 + r - lx, 1, 0], [lz - (S.z0 - r), 0, -1], [S.z1 + r - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0]; const ox = pen[1] * pen[0], oz = pen[2] * pen[0];
      x += ox * S.c + oz * S.s; z += -ox * S.s + oz * S.c; } }
  ME.x = x; ME.z = z; }
// the message box, and in VR a panel before your eyes; the menu of places
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:720px;z-index:2;background:rgba(24,24,30,.9);color:#f2eee4;font:14.5px/1.5 Georgia,serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const CLOCK = document.createElement("div"); CLOCK.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(24,24,30,.78);color:#f2eee4;font:13px Georgia,serif;padding:6px 10px;border-radius:8px;display:none"; document.body.appendChild(CLOCK);
const menuEl = document.createElement("div"); menuEl.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(24,24,30,.9);color:#f2eee4;font:14px/1.6 Georgia,serif;padding:10px 14px;border-radius:10px;display:none;max-height:90vh;overflow:auto";
menuEl.innerHTML = "<b>Go to</b> (M closes)<br>" + PLACES.map(([n], i) => `<a href="#" data-i="${i}" style="color:#f4dca0;text-decoration:none">${i < 10 ? (i + 1) % 10 + ". " : "&nbsp;&nbsp;&nbsp;"}${n}</a>`).join("<br>"); document.body.appendChild(menuEl);
menuEl.addEventListener("click", e => { const i = e.target.dataset?.i; if (i !== undefined) { e.preventDefault(); goPlace(+i); } });
const vrPanelT = tex(1024, 512, () => { }), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: vrPanelT, transparent: true, depthTest: false })); vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
let msgAge = 0; function say(html, secs = 18) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = vrPanelT.image.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(24,24,30,0.92)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f2eee4"; g.font = "27px Georgia";
  const words = html.replace(/<br>/g, " ").replace(/<[^>]+>/g, "").split(" "); let line = "", y = 46; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 34; if (y > 494) break; } line += w + " "; } if (y <= 494) g.fillText(line, 32, y); vrPanelT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
function readNearest() { let best = null, bd = 6; for (const I of INFO) { const d = Math.hypot(I.pos.x - ME.x, I.pos.z - ME.z) + Math.abs(I.pos.y - ME.y - 1.6) * 1.5; if (d < bd) { bd = d; best = ["i", I]; } }
  for (const p of PEOPLE) { if (!p.name || !p.at) continue; const d = Math.hypot(p.at[0] - ME.x, p.at[2] - ME.z) + Math.abs(p.at[1] - ME.y) * 1.5; if (d < Math.min(bd, 3.5)) { bd = d; best = ["p", p]; } }
  if (!best) { say("Nothing to read here. Walk up to a blue <b>i</b>, or to one of the jail's people. <b>M</b> lists places to go."); return; }
  if (best[0] === "i") say(`<b>${best[1].title}</b><br>${best[1].text}`, 45); else say(`<b>${best[1].name}</b><br>${best[1].info}`, 30); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${["real time", "a minute a second", "ten minutes a second"][rateI]}.`, 5); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") readNearest(); if (e.code === "KeyT") setRate(rateI + 1); if (/^Digit[0-9]$/.test(e.code)) goPlace((+e.code.slice(5) + 9) % 10); if (e.code === "KeyN") goPlace(placeI + 1); if (e.code === "KeyP") goPlace(placeI - 1);
  if (e.code === "KeyM") menuEl.style.display = menuEl.style.display === "none" ? "block" : "none"; });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); CLOCK.style.display = "block"; goPlace(0);
  say("<b>Saturday, 21 July 1962, half past two.</b> North Main Street, Edwardsville, in front of the Madison County jail: the sheriff's house of 1869 with the jail behind it. Walk in by the front door; the jail is through the back of the hall. <b>M</b> lists places to go (or <b>1</b>-<b>0</b>, <b>N</b>, <b>P</b>); <b>E</b> reads the blue <b>i</b> points, which say what is known and what is guessed; <b>T</b> speeds up time.", 30); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr"), prevB = {};
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let TIME = 0, frameN = 0;
updateGround(true); fillTrees();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++; TIME += dt; if (started) hour = Math.min(23.9, hour + dt * RATES[rateI] / 3600);
  const sd = updateSky(), night = clampN((0.03 - sd.y) / 0.08, 0, 1); MAT.glow.emissiveIntensity = 0.4 + 2.2 * night; for (const L of JLIGHTS) L.intensity = 0.9 + 1.2 * night; if (WILDEY.sign) WILDEY.sign.material.emissiveIntensity = 0.15 + 0.9 * night;
  let mx = 0, my = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed, bY = gp.buttons[5]?.pressed; if (bX && !prevB.x) setRate(rateI + 1); prevB.x = bX; if (bY && !prevB.y) goPlace(placeI - 1); prevB.y = bY; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) readNearest(); prevB.a = bA; if (bB && !prevB.b) goPlace(placeI + 1); prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; }
  if (started && (mx || my)) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sdv = V3(-f.z, 0, f.x), sp = (run ? 6 : 2.6) * dt; moveTo(ME.x + (f.x * -my + sdv.x * mx) * sp, ME.z + (f.z * -my + sdv.z * mx) * sp); }
  { const fy = floorAt(ME.x, ME.z, ME.y); if (fy >= ME.y - 0.02) { ME.y = fy; ME.vy = 0; } else { ME.vy -= 9.8 * dt; ME.y = Math.max(fy, ME.y + ME.vy * dt); } }
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  sunL.position.set(ME.x + sd.x * 250, ME.y + Math.max(sd.y, 0.05) * 250, ME.z + sd.z * 250); sunL.target.position.set(ME.x, ME.y, ME.z); sky.position.copy(rig.position);
  updateGround(); if (Math.hypot(ME.x - treeC[0], ME.z - treeC[1]) > TREE_R * 0.2) fillTrees();
  updateCars(dt); updateTrain(dt);
  for (const p of PEOPLE) { const [x, y, z, h] = pathPos(p, TIME + p.t0); p.at = [x, y, z]; if (Math.hypot(x - ME.x, z - ME.z) > 200) { crowd.hide(p.i); continue; } crowd.set(p.i, x, y, z, h, p.kind, TIME + p.t0, p.kind === "walk" ? 1 : 0); }
  crowd.done();
  for (const I of INFO) { const d = Math.hypot(I.pos.x - ME.x, I.pos.z - ME.z); I.sp.visible = d < 70 && d > 1.0; }
  if (frameN % 15 === 0) { const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60); CLOCK.textContent = `Saturday 21 July 1962 · ${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}${rateI ? " (fast)" : ""} · M: places`; }
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

// house.js -- Building a platform-framed house, step by step, in VR. A two-storey house 28 by 40 ft on a full basement, the commonest kind
// in the American Midwest, from the staked lot to the finished house. Each step builds itself in front of you (walls are framed lying on
// the deck and tilted up); you can walk anywhere (the floors and stairs carry you as soon as they exist) or fly. Lumber at its true sizes
// (a 2x6 is 1 1/2 by 5 1/2 in), studs and joists at 16 in on centre, trusses at 24 in, sheets 4 by 8 ft. Built into house.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 5000), rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp;
let s0 = 4242; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const F = v => v * 0.3048, IN = v => v * 0.0254;
const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- surfaces: textures laid on in each piece's own metres (a board's grain runs along its length, its local y) ----------
function triMat(map, size, o = {}) { const m = new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
  m.onBeforeCompile = sh => { sh.uniforms.tMap = { value: map }; sh.uniforms.tSize = { value: size };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLP; varying vec3 vLN;").replace("#include <fog_vertex>", `#include <fog_vertex>
      { mat4 M4 = modelMatrix;
      #ifdef USE_INSTANCING
        M4 = instanceMatrix;
      #endif
      vec3 sc = vec3(length(M4[0].xyz), length(M4[1].xyz), length(M4[2].xyz)); vLP = position * sc; vLN = normalize(objectNormal); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tMap; uniform float tSize; varying vec3 vLP; varying vec3 vLN;").replace("#include <map_fragment>", `
      { vec3 w = pow(abs(vLN), vec3(4.0)); w /= (w.x + w.y + w.z); vec3 p = vLP / tSize;
        vec4 t = texture2D(tMap, vec2(vLN.x > 0.0 ? -p.z : p.z, p.y)) * w.x + texture2D(tMap, vec2(p.x, p.z) + 0.37) * w.y + texture2D(tMap, vec2(vLN.z < 0.0 ? -p.x : p.x, p.y)) * w.z; diffuseColor *= t; }`); };
  return m; }
const woodT = tex(256, 512, (g, w, h) => { g.fillStyle = "#e0c89a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 70; k++) { const x = rnd() * w, a = 0.08 + rnd() * 0.15; g.strokeStyle = `rgba(150,105,55,${a})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + 6 * Math.sin(y / 60 + k), y); g.stroke(); }
  for (let k = 0; k < 4; k++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = "rgba(110,70,30,0.6)"; g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, 7); g.fill(); } });
const osbT = tex(512, 512, (g, w, h) => { g.fillStyle = "#c8a468"; g.fillRect(0, 0, w, h); for (let k = 0; k < 1600; k++) { const c = 140 + rnd() * 80; g.fillStyle = `rgb(${c},${c * 0.78},${c * 0.48})`; g.save(); g.translate(rnd() * w, rnd() * h); g.rotate(rnd() * 3.14); g.fillRect(-14, -4, 28 + rnd() * 20, 8); g.restore(); } });
const concT = tex(256, 256, (g, w, h) => { g.fillStyle = "#b0aca4"; g.fillRect(0, 0, w, h); for (let k = 0; k < 5000; k++) { const c = 140 + rnd() * 70; g.fillStyle = `rgba(${c},${c},${c * 0.97},0.5)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const shingleT = tex(256, 128, (g, w, h) => { g.fillStyle = "#3a3a3c"; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const c = 40 + rnd() * 50; g.fillStyle = `rgb(${c},${c},${c + 4})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.fillStyle = "#151515"; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 3, h); });
const grassT = tex(256, 256, (g, w, h) => { g.fillStyle = "#5a8a3a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 8000; k++) { g.fillStyle = rnd() < 0.5 ? "#6a9a44" : "#4a7a30"; g.fillRect(rnd() * w, rnd() * h, 1, 3); } });
const dirtT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6a5034"; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const c = 70 + rnd() * 60; g.fillStyle = `rgb(${c},${c * 0.78},${c * 0.55})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const wrapT = tex(512, 256, (g, w, h) => { g.fillStyle = "#f2f2ee"; g.fillRect(0, 0, w, h); g.fillStyle = "#4a6a9a"; g.font = "bold 28px sans-serif"; for (let y = 40; y < h; y += 120) for (let x = 0; x < w; x += 260) g.fillText("HOUSEWRAP", x + (y % 240 ? 130 : 0), y); });
const MAT = { lumber: triMat(woodT, 0.6, { color: 0xffffff }), treated: triMat(woodT, 0.6, { color: 0xb8c890 }), osb: triMat(osbT, 1.2, { color: 0xffffff }), conc: triMat(concT, 1.0, { color: 0xffffff, roughness: 0.95 }), slab: triMat(concT, 1.0, { color: 0xd8d4cc, roughness: 0.9 }),
  rebar: new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.6, metalness: 0.5 }), steel: new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.45, metalness: 0.7 }), gasket: new THREE.MeshStandardMaterial({ color: 0xe890a8 }), damp: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }),
  drain: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 }), gravel: triMat(concT, 0.3, { color: 0x9a948a }), dirt: triMat(dirtT, 2.0, { color: 0xffffff, roughness: 1 }), grass: triMat(grassT, 2.0, { color: 0xffffff, roughness: 1 }),
  wrap: triMat(wrapT, 2.4, { color: 0xffffff, roughness: 0.6 }), vinyl: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.4 }), glass: new THREE.MeshStandardMaterial({ color: 0x8ab0c8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, depthWrite: false }),
  door: new THREE.MeshStandardMaterial({ color: 0x7a2a22, roughness: 0.5 }), felt: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.9 }), shingle: triMat(shingleT, 1.0, { color: 0xffffff, roughness: 0.95 }), drip: new THREE.MeshStandardMaterial({ color: 0xe8e8e4, metalness: 0.5, roughness: 0.4 }),
  siding: new THREE.MeshStandardMaterial({ color: 0x8aa0b0, roughness: 0.6 }), trim: new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.5 }), drywall: new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.95 }), insul: triMat(osbT, 0.5, { color: 0xf0d870, roughness: 1 }),
  pexR: new THREE.MeshStandardMaterial({ color: 0xc82a20, roughness: 0.5 }), pexB: new THREE.MeshStandardMaterial({ color: 0x2a5ac8, roughness: 0.5 }), pvc: new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.5 }), duct: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.35, metalness: 0.8 }),
  wire: new THREE.MeshStandardMaterial({ color: 0xe8c830, roughness: 0.6 }), ebox: new THREE.MeshStandardMaterial({ color: 0x2a6ad8, roughness: 0.5 }), appliance: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4 }), floor: triMat(woodT, 0.25, { color: 0xb8864a, roughness: 0.5 }),
  carpet: new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 1 }), paint: new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 }), stake: new THREE.MeshStandardMaterial({ color: 0xd8b878 }), string: new THREE.MeshBasicMaterial({ color: 0xff4a8a }), foam: new THREE.MeshStandardMaterial({ color: 0x8ac0e0, roughness: 0.8 }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.9, flatShading: true }), alum: new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.4, metalness: 0.3 }) };
for (const k in MAT) MAT[k].userData.key = k;
const COVER = new Set(["osbwall", "wrap", "siding", "drywall", "shingle", "felt", "osbroof", "trim", "paint", "insul"]);

// ---------- the steps and their pieces ----------
// A piece is a box (or a cylinder) with its own axes; boards are boxes whose local y runs along their length. Pieces of one wall share a
// hinge so the wall can be tilted up. A step may also add floors you can stand on and walls you bump into, and may take away earlier pieces.
const STEPS = []; let CUR = null;
function step(title, text) { CUR = { title, text, pieces: [], groups: [], floors: [], walls: [], i: STEPS.length }; STEPS.push(CUR); return CUR; }
const _M = new THREE.Matrix4();
function piece(mat, c, X, Y, Z, sx, sy, sz, o = {}) { const m = new THREE.Matrix4().makeBasis(X.clone().multiplyScalar(sx), Y.clone().multiplyScalar(sy), Z.clone().multiplyScalar(sz)); m.setPosition(c); CUR.pieces.push({ mat, m, geo: o.geo || "box", grp: o.grp ?? -1, until: o.until ?? 1e9, key: o.key || mat.userData.key }); }
// a board from A to B (its length), w wide toward the side vector, t thick
function board(mat, A, B, w, t, side, o = {}) { const Y = B.clone().sub(A), L = Y.length(); Y.normalize(); const X = side.clone().sub(Y.clone().multiplyScalar(side.dot(Y))).normalize(), Z = X.clone().cross(Y); piece(mat, A.clone().add(B).multiplyScalar(0.5), X, Y, Z, w, L, t, o); }
function aabb(mat, x0, y0, z0, x1, y1, z1, o = {}) { piece(mat, V3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), V3(1, 0, 0), V3(0, 1, 0), V3(0, 0, 1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), o); }
function rod(mat, A, B, r, o = {}) { const Y = B.clone().sub(A), L = Y.length(); Y.normalize(); const X = Math.abs(Y.y) < 0.9 ? V3(0, 1, 0).cross(Y).normalize() : V3(1, 0, 0), Z = X.clone().cross(Y); piece(mat, A.clone().add(B).multiplyScalar(0.5), X, Y, Z, 2 * r, L, 2 * r, { ...o, geo: "cyl" }); }
const floorRect = (x0, z0, x1, z1, y, o = {}) => CUR.floors.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), y, holes: o.holes || [], until: o.until ?? 1e9, ramp: o.ramp || null, from: CUR.i });
const wallSeg = (ax, az, bx, bz, y0, y1, o = {}) => CUR.walls.push({ ax, az, bx, bz, y0, y1, until: o.until ?? 1e9, from: CUR.i });

// ---------- the house's numbers (metres; F() and IN() convert feet and inches) ----------
const LX = F(40), LZ = F(28), MID = F(14);
const Y_FDN = 0.20;                                     // top of the foundation wall, 8 in above the finished grade
const Y_FTGT = Y_FDN - F(8), Y_FTGB = Y_FTGT - IN(8);   // footing top and bottom
const Y_SLAB = Y_FTGT + IN(4);                           // basement slab, 4 in on gravel
const Y_SILL = Y_FDN + IN(1.5), JD = IN(9.25);           // sill plate (2x6 laid flat); joists 2x10 (9 1/4 in deep)
const FL1 = Y_SILL + JD + IN(0.75);                      // first floor surface (3/4 in subfloor)
const WH = IN(1.5 + 92.625 + 3);                         // wall: bottom plate, 92 5/8 in precut studs, double top plate = 97 1/8 in
const FL2 = FL1 + WH + JD + IN(0.75), TOP2 = FL2 + WH;   // second floor surface; top of the second-floor walls
const PITCH = 6 / 12, HEEL = IN(4), EAVE = F(1);         // roof: 6 in 12, 4 in heel, 1 ft overhangs
const PIT = { x0: -F(3), z0: -F(3), x1: LX + F(3), z1: LZ + F(3), y: Y_FTGB };   // the excavation, 3 ft wider than the house all round
const OPEN1 = { x0: F(4), z0: F(14.3), x1: F(15.5), z1: F(17.3) }, OPEN2 = { x0: F(22.5), z0: F(14.3), x1: F(34), z1: F(17.3) };   // stair openings: basement stair, main stair

// ---------- builders ----------
const UP = V3(0, 1, 0);
// a wall: centre line a→b (metres, [x, z]), standing on floor height base, d deep, out = the side its sheathing faces; openings at c (metres
// from a, centre), w wide and h high (rough opening), sill height from the floor (0 for doors)
function wallDef(a, b, base, d, out, ops = [], ext = true) { const A = V3(a[0], 0, a[1]), B = V3(b[0], 0, b[1]), L = A.distanceTo(B), u = B.clone().sub(A).normalize();
  return { A, B, L, u, base, d, out, ext, ops: ops.map(o => ({ ...o, xl: o.c - o.w / 2, xr: o.c + o.w / 2, bot: base + (o.sill || 0), top: base + (o.sill || 0) + o.h })) }; }
const wp = (W, s, y, n = 0) => W.A.clone().addScaledVector(W.u, s).addScaledVector(W.out, n).setY(y);
const layout = (L) => { const s = [IN(0.75)]; for (let k = 1; IN(16 * k) < L - IN(1.5); k++) s.push(IN(16 * k)); s.push(L - IN(0.75)); return s; };
// the frame of a wall: plates, studs at 16 in, king and jack studs and a header at each opening, cripples, rough sills
function frameWall(W, grp) { const { L, base, d, out } = W, t = IN(1.5), yS0 = base + t, yS1 = base + WH - 2 * t, o = { grp }, opts = W.ops;
  const doorCut = s => opts.some(op => !op.sill && s > op.xl && s < op.xr);
  // bottom plate, cut out at doorways
  let s = 0; const cuts = opts.filter(op => !op.sill).map(op => [op.xl, op.xr]).sort((p, q) => p[0] - q[0]); for (const [a, b] of cuts) { if (a > s + 0.01) board(MAT.lumber, wp(W, s, base + t / 2), wp(W, a, base + t / 2), d, t, out, o); s = b; } if (L > s + 0.01) board(MAT.lumber, wp(W, s, base + t / 2), wp(W, L, base + t / 2), d, t, out, o);
  for (const y of [base + WH - 1.5 * t, base + WH - 0.5 * t]) board(MAT.lumber, wp(W, 0, y), wp(W, L, y), d, t, out, o);
  const stud = (x, y0 = yS0, y1 = yS1) => board(MAT.lumber, wp(W, x, y0), wp(W, x, y1), d, t, out, o);
  const inOpen = x => opts.some(op => x > op.xl - IN(3.4) && x < op.xr + IN(3.4));
  const studs = layout(L); if (W.ext) studs.push(IN(2.25), L - IN(2.25)); for (const x of studs) if (!inOpen(x)) stud(x);
  for (const op of opts) { for (const [kx, jx] of [[op.xl - IN(2.25), op.xl - IN(0.75)], [op.xr + IN(2.25), op.xr + IN(0.75)]]) { stud(kx); stud(jx, yS0, op.top); }
    const hTop = Math.min(op.top + JD, yS1); board(MAT.lumber, wp(W, op.xl - t, (op.top + hTop) / 2), wp(W, op.xr + t, (op.top + hTop) / 2), hTop - op.top, d, UP, o);
    for (const x of studs) if (x > op.xl && x < op.xr) { if (yS1 - hTop > IN(1)) stud(x, hTop, yS1); if (op.sill) stud(x, yS0, op.bot - t); }
    if (op.sill) board(MAT.lumber, wp(W, op.xl, op.bot - t / 2), wp(W, op.xr, op.bot - t / 2), d, t, out, o); } }
// a skin over a wall face (sheathing, wrap, drywall, siding courses...), cut around the openings, in panels pw wide
function skin(mat, W, n, th, y0, y1, s0 = 0, s1 = W.L, pw = F(4), o = {}, tilt = 0) { const holes = W.ops.map(op => [op.xl, op.bot, op.xr, op.top]); const cuts = new Set([s0, s1]); for (let x = s0 + pw; x < s1 - 1e-3; x += pw) cuts.add(x); for (const h of holes) { if (h[0] > s0 && h[0] < s1) cuts.add(h[0]); if (h[2] > s0 && h[2] < s1) cuts.add(h[2]); }
  const C = [...cuts].sort((a, b) => a - b), Z = W.u.clone().cross(UP);
  for (let k = 0; k < C.length - 1; k++) { const a = C[k], b = C[k + 1]; if (b - a < 0.002) continue; const m = (a + b) / 2, hs = holes.filter(h => m > h[0] && m < h[2]).map(h => [h[1], h[3]]).sort((p, q) => p[0] - q[0]); let y = y0; const seg = [];
    for (const [hb, ht] of hs) { if (hb > y) seg.push([y, Math.min(hb, y1)]); y = Math.max(y, ht); } if (y1 > y) seg.push([y, y1]);
    for (const [ya, yb] of seg) { if (yb - ya < 0.003) continue; let Yv = UP.clone(), Zv = Z.clone(); if (tilt) { Yv = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(W.out, -Math.sin(tilt)); Zv = W.u.clone().cross(Yv); }
      piece(mat, wp(W, m, (ya + yb) / 2, n), W.u, Yv, Zv, b - a, yb - ya, th, o); } } }
// a gable triangle's worth of a skin: horizontal bands between the top of the wall and the roof
function gable(mat, W, n, th, band, o = {}, tilt = 0) { const y0 = TOP2; for (let y = y0; y < y0 + HEEL + MID * PITCH; y += band) { const yt = y + band, zin = Math.max(0, (yt - y0 - HEEL - IN(3.5)) / PITCH), s0 = zin - (W.A.z - 0) - IN(0) , a = Math.max(-IN(5.5), zin - W.A.z), b = Math.min(W.L + IN(5.5), (LZ - zin) - W.A.z); if (b - a < 0.05) break;
    const Wg = { ...W, ops: [] }; skin(mat, Wg, n, th, y, Math.min(yt, y0 + HEEL + IN(3.5) + MID * PITCH), a, b, 1e3, o, tilt); } }
// rectangles minus a hole
function minus(r, h) { if (!h || h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) return [r]; const out = []; if (h.z0 > r.z0) out.push({ ...r, z1: h.z0 }); if (h.z1 < r.z1) out.push({ ...r, z0: h.z1 }); const zA = Math.max(r.z0, h.z0), zB = Math.min(r.z1, h.z1); if (h.x0 > r.x0) out.push({ x0: r.x0, x1: h.x0, z0: zA, z1: zB }); if (h.x1 < r.x1) out.push({ x0: h.x1, x1: r.x1, z0: zA, z1: zB }); return out; }
// a floor platform: rim joists round the edge, joists at 16 in spanning to the middle bearing line and lapping over it, a framed stair opening
function joists(yb, open) { const t = IN(1.5), yc = yb + JD / 2;
  for (const z of [t / 2, LZ - t / 2]) board(MAT.lumber, V3(0, yc, z), V3(LX, yc, z), JD, t, UP);
  for (const x of [t / 2, LX - t / 2]) board(MAT.lumber, V3(x, yc, t), V3(x, yc, LZ - t), JD, t, UP);
  const jz = (x, z0, z1) => { const segs = [[z0, z1]]; let out = segs; if (x > open.x0 - 0.01 && x < open.x1 + 0.01) { out = []; for (const [a, b] of segs) { if (b <= open.z0 - 2 * t || a >= open.z1 + 2 * t) { out.push([a, b]); continue; } if (a < open.z0 - 2 * t) out.push([a, open.z0 - 2 * t]); if (b > open.z1 + 2 * t) out.push([open.z1 + 2 * t, b]); } }
    for (const [a, b] of out) if (b - a > 0.05) board(MAT.lumber, V3(x, yc, a), V3(x, yc, b), JD, t, UP); };
  for (let k = 1; IN(16 * k) < LX - IN(2); k++) { const x = IN(16 * k); jz(x, t, MID + IN(3)); jz(x + t, MID - IN(3), LZ - t); }
  for (const x of [open.x0 - t / 2, open.x0 - 1.5 * t, open.x1 + t / 2, open.x1 + 1.5 * t]) board(MAT.lumber, V3(x, yc, MID - IN(3)), V3(x, yc, LZ - t), JD, t, UP);
  for (const z of [open.z0 - t / 2, open.z0 - 1.5 * t, open.z1 + t / 2, open.z1 + 1.5 * t]) board(MAT.lumber, V3(open.x0 - 2 * t, yc, z), V3(open.x1 + 2 * t, yc, z), JD, t, UP); }
function subfloor(ytop, open, mat = MAT.osb) { for (let row = 0; row * F(4) < LZ - 0.01; row++) for (let x = (row % 2 ? -F(4) : 0); x < LX - 0.01; x += F(8)) { const r = { x0: Math.max(0, x), x1: Math.min(LX, x + F(8)), z0: row * F(4), z1: Math.min(LZ, (row + 1) * F(4)) }; for (const q of minus(r, open)) aabb(mat, q.x0 + 0.002, ytop - IN(0.75), q.z0 + 0.002, q.x1 - 0.002, ytop, q.z1 - 0.002); } }
// the openings: doors 38 x 82 1/2 in rough, windows 36 in wide with their heads at 82 1/2 in like the doors
const D = (c, w = 38) => ({ c, w: IN(w), h: IN(82.5), sill: 0 }), Wn = (c, w = 36, h = 54) => ({ c, w: IN(w), h: IN(h), sill: IN(82.5 - h) });
function extWalls(base, lvl) { const d = IN(5.5), h = d / 2, e = IN(5.5);
  return [wallDef([0, h], [LX, h], base, d, V3(0, 0, -1), lvl === 1 ? [Wn(F(6)), Wn(F(12)), D(F(20)), Wn(F(28)), Wn(F(34))] : [Wn(F(6)), Wn(F(14)), Wn(F(26)), Wn(F(34))]),
    wallDef([0, LZ - h], [LX, LZ - h], base, d, V3(0, 0, 1), lvl === 1 ? [Wn(F(6)), Wn(F(12)), D(F(20), 74), Wn(F(30), 48, 42), Wn(F(36))] : [Wn(F(8)), Wn(F(16.5), 30, 36), Wn(F(24)), Wn(F(32))]),
    wallDef([h, e], [h, LZ - e], base, d, V3(-1, 0, 0), lvl === 1 ? [Wn(F(9) - e), Wn(F(19) - e)] : [Wn(F(7) - e), Wn(F(21) - e)]),
    wallDef([LX - h, e], [LX - h, LZ - e], base, d, V3(1, 0, 0), lvl === 1 ? [Wn(F(9) - e), Wn(F(19) - e)] : [Wn(F(7) - e), Wn(F(21) - e)])]; }
function intWalls(base, lvl) { const d = IN(3.5), e = IN(5.5), q = IN(1.75);
  if (lvl === 1) return [wallDef([e, MID], [LX - e, MID], base, d, V3(0, 0, -1), [D(F(8) - e), D(F(17.5) - e, 74)], false), wallDef([F(16), MID + q], [F(16), LZ - e], base, d, V3(1, 0, 0), [D(F(5), 32)], false)];
  return [wallDef([e, F(12)], [LX - e, F(12)], base, d, V3(0, 0, -1), [D(F(6) - e, 32), D(F(20) - e, 32), D(F(34) - e, 32)], false), wallDef([e, F(17.6)], [F(22.4), F(17.6)], base, d, V3(0, 0, 1), [D(F(8) - e, 32)], false), wallDef([F(34.1), F(17.6)], [LX - e, F(17.6)], base, d, V3(0, 0, 1), [D(F(2.7), 32)], false),
    wallDef([F(13), e], [F(13), F(12) - q], base, d, V3(1, 0, 0), [], false), wallDef([F(27), e], [F(27), F(12) - q], base, d, V3(1, 0, 0), [], false), wallDef([F(12), F(17.6) + q], [F(12), LZ - e], base, d, V3(1, 0, 0), [], false), wallDef([F(20), F(17.6) + q], [F(20), LZ - e], base, d, V3(1, 0, 0), [], false)]; }
const EXT1 = extWalls(FL1, 1), EXT2 = extWalls(FL2, 2), INT1 = intWalls(FL1, 1), INT2 = intWalls(FL2, 2);
// walls stand up hinged on the outside bottom edge; interior walls on one edge; you bump into a wall except at its doorways
function standWalls(list, flatSide = 1) { for (const W of list) { const gi = CUR.groups.length, sd = W.ext ? -1 : flatSide; CUR.groups.push({ p: wp(W, 0, W.base, sd * -W.d / 2), axis: W.u.clone(), sign: W.ext ? 1 : -1, W }); frameWall(W, gi);
    let s = 0; for (const op of W.ops.filter(o => !o.sill).sort((a, b) => a.xl - b.xl)) { if (op.xl > s) { const a = wp(W, s, 0), b = wp(W, op.xl, 0); wallSeg(a.x, a.z, b.x, b.z, W.base, W.base + WH); } s = op.xr; } if (W.L > s) { const a = wp(W, s, 0), b = wp(W, W.L, 0); wallSeg(a.x, a.z, b.x, b.z, W.base, W.base + WH); } } }
const yTC = z => TOP2 + IN(3.5) + HEEL + IN(2) + Math.min(z, LZ - z) * PITCH;   // the top chord's centre line
const COSR = 1 / Math.sqrt(1 + PITCH * PITCH), RIDGE = yTC(MID) + IN(1.75) / COSR;
const TRUSS_X = (() => { const a = [IN(0.75)]; for (let k = 1; IN(24 * k) < LX - IN(2); k++) a.push(IN(24 * k)); a.push(LX - IN(0.75)); return a; })();

// ---------- the steps ----------
let BACKFILL_STEP = 99;
const T = IN(1.5), FD = IN(8);
step("The lot, staked out", "A surveyor has marked the corners of the house with stakes, and the builder has set up batter boards (the low frames outside each corner) with string lines pulled tight between them. The strings mark the outside faces of the foundation walls exactly, 28 by 40 ft; the diagonals are measured equal (48.4 ft) to make the corners square.");
for (const [x, z] of [[0, 0], [LX, 0], [0, LZ], [LX, LZ]]) { aabb(MAT.stake, x - 0.03, 0, z - 0.03, x + 0.03, 0.45, z + 0.03, { until: 1 }); const sx = x ? 1 : -1, sz = z ? 1 : -1, bx = x + sx * F(5), bz = z + sz * F(5);
  for (const [px, pz] of [[bx, bz], [bx - sx * F(3), bz], [bx, bz - sz * F(3)]]) aabb(MAT.stake, px - 0.03, 0, pz - 0.03, px + 0.03, 0.75, pz + 0.03, { until: 8 }); board(MAT.lumber, V3(bx - sx * F(3.2), 0.68, bz), V3(bx + sx * 0.1, 0.68, bz), IN(3.5), IN(0.75), UP, { until: 8 }); board(MAT.lumber, V3(bx, 0.68, bz - sz * F(3.2)), V3(bx, 0.68, bz + sz * 0.1), IN(3.5), IN(0.75), UP, { until: 8 }); }
for (const [a, b] of [[[0, -F(4.5)], [LX, -F(4.5)]], [[0, LZ + F(4.5)], [LX, LZ + F(4.5)]]]) {}
for (const z of [0, LZ]) aabb(MAT.string, -F(4.5), 0.72, z - 0.002, LX + F(4.5), 0.724, z + 0.002, { until: 4 }); for (const x of [0, LX]) aabb(MAT.string, x - 0.002, 0.72, -F(4.5), x + 0.002, 0.724, LZ + F(4.5), { until: 4 });
aabb(MAT.grass, PIT.x0, -0.6, PIT.z0, PIT.x1, 0, PIT.z1, { until: 1 }); floorRect(PIT.x0, PIT.z0, PIT.x1, PIT.z1, 0, { until: 1 });

step("Excavation", "An excavator digs the hole for the basement, about 3 ft wider than the house on every side so there is room to work outside the walls, down to the bottom of the footings: about 8 1/2 ft below the finished ground. The topsoil is stockpiled for later. In much of the South and West houses sit on a concrete slab or a crawlspace instead of a basement.");
aabb(MAT.dirt, PIT.x0, PIT.y - 0.3, PIT.z0, PIT.x1, PIT.y, PIT.z1); for (const [x0, z0, x1, z1] of [[PIT.x0 - 0.3, PIT.z0 - 0.3, PIT.x1 + 0.3, PIT.z0], [PIT.x0 - 0.3, PIT.z1, PIT.x1 + 0.3, PIT.z1 + 0.3], [PIT.x0 - 0.3, PIT.z0, PIT.x0, PIT.z1], [PIT.x1, PIT.z0, PIT.x1 + 0.3, PIT.z1]]) aabb(MAT.dirt, x0, PIT.y, z0, x1, -0.02, z1);
for (let k = 0; k < 6; k++) { const g = new THREE.Vector3(LX + F(14) + k * 0.9, 0, -F(6) - (k % 3) * 1.2); aabb(MAT.dirt, g.x - 1.2, 0, g.z - 1.2, g.x + 1.2, 0.6 + (k % 2) * 0.5, g.z + 1.2, { until: 24 }); }

step("Footings", "Concrete footings, 20 in wide and 8 in thick, are poured in wooden forms on undisturbed soil under where the walls will stand, with two lines of steel reinforcing bar (rebar) in them. They spread the weight of the house over the soil. Square pads 2 ft across will carry the steel columns under the middle beam.");
{ const w2 = IN(10), off = IN(4); const ring = [[-IN(6), -IN(6), LX + IN(6), IN(14)], [-IN(6), LZ - IN(14), LX + IN(6), LZ + IN(6)], [-IN(6), IN(14), IN(14), LZ - IN(14)], [LX - IN(14), IN(14), LX + IN(6), LZ - IN(14)]];
  for (const [x0, z0, x1, z1] of ring) aabb(MAT.conc, x0, Y_FTGB, z0, x1, Y_FTGT, z1);
  for (const x of [F(10), F(20), F(30)]) aabb(MAT.conc, x - F(1), Y_FTGB, MID - F(1), x + F(1), Y_FTGT, MID + F(1));
  for (const dz of [IN(0), IN(8)]) { const y = Y_FTGB + IN(3); rod(MAT.rebar, V3(-IN(3), y, IN(0) + dz), V3(LX + IN(3), y, dz), IN(0.25)); rod(MAT.rebar, V3(-IN(3), y, LZ - dz), V3(LX + IN(3), y, LZ - dz), IN(0.25)); rod(MAT.rebar, V3(dz, y, -IN(3)), V3(dz, y, LZ + IN(3)), IN(0.25)); rod(MAT.rebar, V3(LX - dz, y, -IN(3)), V3(LX - dz, y, LZ + IN(3)), IN(0.25)); } }

step("Foundation walls", "Poured concrete walls, 8 in thick and 8 ft tall, cast between reusable aluminium forms (already stripped away here) on top of the footings, with rebar inside. Half-inch steel anchor bolts set into the wet concrete every 6 ft, and within a foot of each corner, will hold the wooden house down. Small pockets are left in the end walls for the steel beam.");
{ const t8 = IN(8); aabb(MAT.conc, 0, Y_FTGT, 0, LX, Y_FDN, t8); aabb(MAT.conc, 0, Y_FTGT, LZ - t8, LX, Y_FDN, LZ); aabb(MAT.conc, 0, Y_FTGT, t8, t8, Y_FDN, LZ - t8); aabb(MAT.conc, LX - t8, Y_FTGT, t8, LX, Y_FDN, LZ - t8);
  const bolts = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil((L - F(2)) / F(6)); for (let k = 0; k <= n; k++) { const f = (F(1) + k * (L - F(2)) / n) / L; rod(MAT.steel, V3(ax + (bx - ax) * f, Y_FDN - 0.12, az + (bz - az) * f), V3(ax + (bx - ax) * f, Y_FDN + IN(3), az + (bz - az) * f), IN(0.25)); } };
  bolts(0, IN(2.75), LX, IN(2.75)); bolts(0, LZ - IN(2.75), LX, LZ - IN(2.75)); bolts(IN(2.75), 0, IN(2.75), LZ); bolts(LX - IN(2.75), 0, LX - IN(2.75), LZ);
  for (const [ax, az, bx, bz] of [[0, t8, LX, t8], [0, LZ - t8, LX, LZ - t8], [t8, 0, t8, LZ], [LX - t8, 0, LX - t8, LZ], [0, 0, LX, 0], [0, LZ, LX, LZ], [0, 0, 0, LZ], [LX, 0, LX, LZ]]) wallSeg(ax, az, bx, bz, Y_FTGT, Y_FDN); }

step("Waterproofing, drain tile, the basement floor", "The outside of the walls is sprayed with black damp-proofing. A perforated drain pipe (drain tile) is laid in gravel beside the footings all round, to carry groundwater to a sump pit. Inside, 4 in of gravel and then a 4 in concrete slab make the basement floor.");
{ aabb(MAT.damp, -IN(0.25), Y_FTGT, -IN(0.25), LX + IN(0.25), -0.05, 0); aabb(MAT.damp, -IN(0.25), Y_FTGT, LZ, LX + IN(0.25), -0.05, LZ + IN(0.25)); aabb(MAT.damp, -IN(0.25), Y_FTGT, 0, 0, -0.05, LZ); aabb(MAT.damp, LX, Y_FTGT, 0, LX + IN(0.25), -0.05, LZ);
  const yd = Y_FTGB + IN(2), o = IN(14); rod(MAT.drain, V3(-o, yd, -o), V3(LX + o, yd, -o), IN(2)); rod(MAT.drain, V3(-o, yd, LZ + o), V3(LX + o, yd, LZ + o), IN(2)); rod(MAT.drain, V3(-o, yd, -o), V3(-o, yd, LZ + o), IN(2)); rod(MAT.drain, V3(LX + o, yd, -o), V3(LX + o, yd, LZ + o), IN(2));
  aabb(MAT.gravel, -IN(20), Y_FTGB, -IN(20), LX + IN(20), Y_FTGB + IN(5), -IN(6)); aabb(MAT.gravel, -IN(20), Y_FTGB, LZ + IN(6), LX + IN(20), Y_FTGB + IN(5), LZ + IN(20));
  const t8 = IN(8); aabb(MAT.slab, t8, Y_FTGT, t8, LX - t8, Y_SLAB, LZ - t8); floorRect(t8, t8, LX - t8, LZ - t8, Y_SLAB); }

step("Sill plates and the main beam", "Pressure-treated 2x6 sill plates (green: treated against rot, because they sit on concrete) are drilled and bolted down over a foam sill gasket that seals the gap. Down the middle runs a steel I-beam, an 8-in-deep W8, resting in the wall pockets and on three adjustable steel columns: it will carry the inner ends of the floor joists. The beam's top is level with the sill's.");
{ for (const [ax, az, bx, bz] of [[0, IN(2.75), LX, IN(2.75)], [0, LZ - IN(2.75), LX, LZ - IN(2.75)], [IN(2.75), IN(5.5), IN(2.75), LZ - IN(5.5)], [LX - IN(2.75), IN(5.5), LX - IN(2.75), LZ - IN(5.5)]]) { const n = Math.abs(az - bz) < 1e-6 ? V3(0, 0, 1) : V3(1, 0, 0); board(MAT.gasket, V3(ax, Y_FDN + IN(0.1), az), V3(bx, Y_FDN + IN(0.1), bz), IN(5.5), IN(0.2), n); board(MAT.treated, V3(ax, Y_FDN + IN(0.95), az), V3(bx, Y_FDN + IN(0.95), bz), IN(5.5), T, n); }
  const yt = Y_SILL, yb = yt - IN(8); aabb(MAT.steel, -IN(4), yt - IN(0.33), MID - IN(2.625), LX + IN(4), yt, MID + IN(2.625)); aabb(MAT.steel, -IN(4), yb, MID - IN(2.625), LX + IN(4), yb + IN(0.33), MID + IN(2.625)); aabb(MAT.steel, -IN(4), yb, MID - IN(0.12), LX + IN(4), yt, MID + IN(0.12));
  for (const x of [F(10), F(20), F(30)]) { rod(MAT.steel, V3(x, Y_FTGT, MID), V3(x, yb, MID), IN(1.75)); aabb(MAT.steel, x - IN(3), yb - IN(0.4), MID - IN(3), x + IN(3), yb, MID + IN(3)); } }

step("Floor joists: the first platform", "Rim joists (2x10s on edge) are nailed round the outside on the sills, then floor joists every 16 in, spanning 14 ft from the sill to the beam, where they overlap and are nailed together. Around the opening for the basement stair the joists are doubled (trimmers) and short headers carry the cut ones. Many builders now use engineered I-joists instead of solid 2x10s; the idea is the same. This floor is the platform that gives the method its name: the walls will be built on top of it.");
joists(Y_SILL, OPEN1); floorRect(0, 0, LX, LZ, Y_SILL + JD, { holes: [OPEN1], until: 7 });

step("Subfloor", "Sheets of 3/4 in tongue-and-groove OSB (oriented strand board: wood flakes glued and pressed) are glued and nailed across the joists, their 8 ft length running across the joists and their end joints staggered from row to row. Now there is a flat, solid floor: the deck to build the walls on.");
subfloor(FL1, OPEN1); floorRect(0, 0, LX, LZ, FL1, { holes: [OPEN1] });

step("Backfill", "With the first floor in place to brace the tops of the foundation walls, the excavator pushes soil back into the gap around the outside (backfill), sloping it away from the house so rain runs off.");
{ for (const [x0, z0, x1, z1] of [[PIT.x0, PIT.z0, PIT.x1, 0], [PIT.x0, LZ, PIT.x1, PIT.z1], [PIT.x0, 0, 0, LZ], [LX, 0, PIT.x1, LZ]]) aabb(MAT.dirt, x0, PIT.y, z0, x1, -0.03, z1); BACKFILL_STEP = CUR.i; }

step("First-floor walls: framed flat, tilted up", "Each wall is built lying flat on the deck: a bottom plate, a top plate and 2x6 studs every 16 in (92 5/8 in long, so the finished wall is 8 ft 1 1/8 in), with headers over the doors and windows carried on jack studs beside full-height king studs, and short cripple studs above and below. Then the crew lifts it upright, nails the bottom plate down through the subfloor into the joists, and braces it. The long walls run the full 40 ft; the end walls fit between them.");
standWalls(EXT1); for (const W of EXT1) board(MAT.lumber, wp(W, W.L * 0.3, W.base + 0.05, -1.2), wp(W, W.L * 0.3 + 1.6, W.base + 2.2, -0.04), IN(3.5), T, W.u.clone().cross(UP), { until: 11 });

step("Wall sheathing", "OSB sheathing, 7/16 in thick, is nailed to the outside of the walls (often while they are still lying on the deck). It makes each wall a stiff panel that resists wind and racking, and it laps down over the rim joist and sill to tie the walls to the floor. The window and door openings are cut out with a router.");
for (const W of EXT1) { const ext = Math.abs(W.out.x) > 0.5; skin(MAT.osb, W, W.d / 2 + IN(0.22), IN(7 / 16), Y_FDN - IN(1), W.base + WH, ext ? -IN(5.5) : 0, ext ? W.L + IN(5.5) : W.L, F(4), { key: "osbwall" }); }

step("Interior walls", "The inside walls are framed the same way from 2x4s and tilted up. The long one down the middle stands right over the steel beam: it is a bearing wall that will carry the second floor's joists, so the weight goes straight down wall, beam and columns to the footings.");
standWalls(INT1);

step("Second-floor joists: the second platform", "On the double top plates of the first-floor walls go a second rim and a second set of 2x10 joists at 16 in, spanning from the outside walls to the bearing wall in the middle, with a framed opening for the main stair. This is platform framing's whole idea: each storey is built as a platform on top of the walls below, and the next walls go on top of it. (In the older balloon framing, studs ran continuously from the sill to the roof.)");
joists(FL1 + WH, OPEN2); floorRect(0, 0, LX, LZ, FL1 + WH + JD, { holes: [OPEN2], until: 13 });

step("Second-floor subfloor", "Another layer of 3/4 in OSB, glued and nailed: the second platform is ready for walls.");
subfloor(FL2, OPEN2); floorRect(0, 0, LX, LZ, FL2, { holes: [OPEN2] });

step("Second-floor walls", "The upstairs walls are framed on the second deck and tilted up exactly like the first: outside walls in 2x6, bedroom and hall walls in 2x4, then sheathed.");
standWalls(EXT2); standWalls(INT2);
for (const W of EXT2) { const ext = Math.abs(W.out.x) > 0.5; skin(MAT.osb, W, W.d / 2 + IN(0.22), IN(7 / 16), FL1 + WH, W.base + WH, ext ? -IN(5.5) : 0, ext ? W.L + IN(5.5) : W.L, F(4), { key: "osbwall" }); }

step("Roof trusses", "Factory-built wood trusses, 2x4s joined with steel gusset plates in a W (Fink) pattern, are lifted up by crane and set every 24 in, spanning the full 28 ft so they need no support in the middle. Each is fastened to the top plates with metal hurricane ties, and continuous braces tie them together. The two at the ends are gable trusses with vertical studs to nail sheathing to. Older and custom houses use rafters cut on site instead.");
for (const x of TRUSS_X) { const gableT = x < 0.1 || x > LX - 0.1, yb = TOP2 + IN(1.75), perpL = V3(0, 1, -PITCH).normalize(), perpR = V3(0, 1, PITCH).normalize();
  board(MAT.lumber, V3(x, yb, 0), V3(x, yb, LZ), IN(3.5), T, UP); board(MAT.lumber, V3(x, yTC(-EAVE) - EAVE * PITCH * 0 , -EAVE), V3(x, yTC(MID), MID), IN(3.5), T, perpL); board(MAT.lumber, V3(x, yTC(MID), MID), V3(x, yTC(LZ + EAVE), LZ + EAVE), IN(3.5), T, perpR);
  const B1 = V3(x, TOP2 + IN(3.5), LZ / 3), B2 = V3(x, TOP2 + IN(3.5), 2 * LZ / 3), T1 = V3(x, yTC(LZ / 4) - IN(1.75) / COSR, LZ / 4), T2 = V3(x, yTC(3 * LZ / 4) - IN(1.75) / COSR, 3 * LZ / 4), R = V3(x, yTC(MID) - IN(2), MID);
  if (!gableT) for (const [a, b] of [[B1, T1], [B1, R], [B2, R], [B2, T2]]) { const d = b.clone().sub(a).normalize(); board(MAT.lumber, a, b, IN(3.5), T, V3(0, -d.z, d.y)); }
  else for (let z = IN(16); z < LZ - 0.1; z += IN(16)) { const yt = yTC(z) - IN(1.75) / COSR; if (yt - TOP2 - IN(3.5) > 0.05) board(MAT.lumber, V3(x, TOP2 + IN(3.5), z), V3(x, yt, z), IN(3.5), T, V3(0, 0, 1)); } }
for (const z of [LZ / 3 - IN(2.5), 2 * LZ / 3 + IN(2.5)]) board(MAT.lumber, V3(0, TOP2 + 0.75, z), V3(LX, TOP2 + 0.75, z), IN(3.5), T, V3(0, 0, 1));

step("Roof sheathing", "7/16 in OSB sheets are nailed across the trusses, with metal H-clips holding the sheet edges together between trusses, starting at the eaves and staggered. The gable ends get sheathing too, and 2x6 sub-fascia boards close the ends of the truss tails. The house is now 'framed and sheathed'.");
for (const sd of [-1, 1]) { const zE = sd < 0 ? -EAVE : LZ + EAVE, Y = V3(0, PITCH, -sd).normalize(), N = V3(0, 1, sd * PITCH).normalize(), S = (MID - zE) * -sd / COSR; const X = V3(1, 0, 0), Zb = X.clone().cross(Y);
  for (let row = 0; row * F(4) < S - 0.01; row++) { const s0 = row * F(4), s1 = Math.min(S, s0 + F(4)); for (let x = -EAVE + (row % 2 ? -F(4) : 0); x < LX + EAVE - 0.01; x += F(8)) { const xa = Math.max(-EAVE, x), xb = Math.min(LX + EAVE, x + F(8)), sm = (s0 + s1) / 2, z = zE - sd * sm * COSR, y = yTC(z) + IN(1.75) / COSR + IN(0.22);
      piece(MAT.osb, V3((xa + xb) / 2, y, z), X, Y, Zb, xb - xa - 0.003, s1 - s0 - 0.003, IN(7 / 16), { key: "osbroof" }); } }
  board(MAT.lumber, V3(-EAVE, yTC(zE) - IN(1), zE + sd * IN(0.75)), V3(LX + EAVE, yTC(zE) - IN(1), zE + sd * IN(0.75)), IN(5.5), T, UP); }
for (const W of [EXT2[2], EXT2[3]]) gable(MAT.osb, W, W.d / 2 + IN(0.22), IN(7 / 16), F(4), { key: "osbwall" });

step("Stairs", "Stair stringers (2x12s cut in a sawtooth) are hung from the stair openings, with treads: 14 risers of about 7 5/8 in and 13 treads of 10 in for each flight, within the code's 7 3/4 in maximum rise. The basement stair runs under the first floor's opening, the main stair up to the second. Now you can walk up.");
{ const flight = (x0, x1, y0, y1, z0, z1) => { const n = 14, dx = (x1 - x0) / 13, dy = (y1 - y0) / n; for (let k = 0; k < 13; k++) aabb(MAT.lumber, x0 + k * dx, y0 + (k + 1) * dy - IN(1), z0 + 0.05, x0 + (k + 1) * dx + IN(1), y0 + (k + 1) * dy, z1 - 0.05);
    for (const z of [z0 + IN(1), z1 - IN(1)]) board(MAT.lumber, V3(x0, y0 + IN(4), z), V3(x1, y1 - IN(4), z), IN(11.25), T, V3(-(y1 - y0), x1 - x0, 0).normalize()); floorRect(x0, z0, x1, z1, 0, { ramp: { x0, x1, y0, y1 } }); };
  flight(OPEN1.x0, OPEN1.x0 + IN(130), Y_SLAB, FL1, OPEN1.z0 + 0.03, OPEN1.z1 - 0.03); flight(OPEN2.x0, OPEN2.x0 + IN(130), FL1, FL2, OPEN2.z0 + 0.03, OPEN2.z1 - 0.03); }

step("Housewrap, windows and doors", "A weather-resistant housewrap is stapled over the wall sheathing, lapped like shingles so water runs down and out, and taped at the seams; it stops rain but lets water vapour out. The windows are set in their rough openings and nailed through their flanges, which are sealed with flashing tape; the front door and the patio door go in. The house is closed in.");
for (const W of [...EXT1, ...EXT2]) { const ext = Math.abs(W.out.x) > 0.5; skin(MAT.wrap, W, W.d / 2 + IN(0.5), IN(0.04), W.base > 1.5 ? FL2 : Y_FDN, W.base + WH + (W.base > 1.5 ? 0 : JD + IN(0.75)), ext ? -IN(6) : -IN(0.5), ext ? W.L + IN(6) : W.L + IN(0.5), F(9), { key: "wrap" });
  for (const op of W.ops) { const n = W.d / 2 + IN(1.2), fw = IN(2.2); if (!op.sill) { piece(MAT.door, wp(W, op.c, op.bot + (op.h - IN(1)) / 2, n - IN(0.8)), W.u, UP, W.u.clone().cross(UP), op.w - IN(3), op.h - IN(1), IN(1.75)); }
    else { piece(MAT.glass, wp(W, op.c, (op.bot + op.top) / 2, n - IN(0.5)), W.u, UP, W.u.clone().cross(UP), op.w - IN(1), op.h - IN(1), IN(0.3)); board(MAT.vinyl, wp(W, op.xl + IN(0.5), (op.bot + op.top) / 2, n), wp(W, op.xr - IN(0.5), (op.bot + op.top) / 2, n), IN(1.5), IN(0.5), W.u.clone().cross(UP).negate(), {}); }
    for (const [a, b] of [[wp(W, op.xl + fw / 2, op.bot, n), wp(W, op.xl + fw / 2, op.top, n)], [wp(W, op.xr - fw / 2, op.bot, n), wp(W, op.xr - fw / 2, op.top, n)], [wp(W, op.xl, op.top - fw / 2, n), wp(W, op.xr, op.top - fw / 2, n)], [wp(W, op.xl, op.bot + fw / 2, n), wp(W, op.xr, op.bot + fw / 2, n)]]) board(MAT.vinyl, a, b, fw, IN(3), W.out); } }

step("Roofing", "Metal drip edge goes along the eaves and rakes; a self-sealing ice-and-water membrane covers the first 3 ft above the eaves (against ice dams), then synthetic underlayment the rest; then asphalt shingles, nailed in courses with 5 5/8 in showing, from the eaves up, and a cap along the ridge.");
for (const sd of [-1, 1]) { const zE = sd < 0 ? -EAVE : LZ + EAVE, Y = V3(0, PITCH, -sd).normalize(), S = (MID - zE) * -sd / COSR, X = V3(1, 0, 0), Zb = X.clone().cross(Y), base = s => { const z = zE - sd * s * COSR; return [z, yTC(z) + IN(1.75) / COSR + IN(7 / 16)]; };
  { const [z, y] = base(S / 2); piece(MAT.felt, V3(LX / 2, y + IN(0.05), z), X, Y, Zb, LX + 2 * EAVE, S, IN(0.06), { key: "felt" }); }
  const ex = IN(5.625); for (let k = 0; k * ex < S - IN(4); k++) { const s = k * ex + IN(6), [z, y] = base(Math.min(s, S - IN(6))), dl = 0.025, Yt = Y.clone().multiplyScalar(Math.cos(dl)).addScaledVector(Zb.clone().multiplyScalar(-sd < 0 ? 1 : 1), 0), Ys = Y.clone().applyAxisAngle(X, sd * dl), Zs = X.clone().cross(Ys);
    piece(MAT.shingle, V3(LX / 2, y + IN(0.25), z), X, Ys, Zs, LX + 2 * EAVE + IN(1), IN(12), IN(0.12), { key: "shingle" }); }
  board(MAT.drip, V3(-EAVE, base(0)[1], zE - sd * IN(0.3)), V3(LX + EAVE, base(0)[1], zE - sd * IN(0.3)), IN(2.5), IN(0.05), UP); }
aabb(MAT.shingle, -EAVE, RIDGE + IN(0.1), MID - IN(6), LX + EAVE, RIDGE + IN(0.9), MID + IN(6), { key: "shingle" });

step("Rough-ins: plumbing, wiring, heating", "Before the walls are closed, the trades run everything that hides inside them. Plumbers: a 3 in PVC drain-and-vent stack from the basement up through the roof, drain lines sloping to it, and red (hot) and blue (cold) PEX water lines. Electricians: plastic boxes for outlets, switches and lights, and cable run through holes drilled in the studs, from the panel in the basement. Heating: the furnace and water heater in the basement, a sheet-metal trunk duct along the beam and branch ducts up to every room.");
{ aabb(MAT.appliance, F(33), Y_SLAB, F(22), F(35), Y_SLAB + 1.4, F(24.5)); rod(MAT.appliance, V3(F(37), Y_SLAB, F(23)), V3(F(37), Y_SLAB + 1.5, F(23)), IN(11)); aabb(MAT.duct, F(8), Y_SILL - IN(16), MID + IN(4), F(34), Y_SILL - IN(8.2), MID + IN(18));
  for (const [x, z] of [[F(6), F(3)], [F(14), F(3)], [F(26), F(3)], [F(34), F(3)], [F(6), F(25)], [F(26), F(25)], [F(12), F(10)], [F(30), F(10)]]) { rod(MAT.duct, V3(x, Y_SILL - IN(12), MID + IN(10)), V3(x, Y_SILL - IN(4), z), IN(3)); rod(MAT.duct, V3(x, Y_SILL - IN(4), z), V3(x, FL1 + 0.02, z), IN(3)); }
  rod(MAT.pvc, V3(F(30.5), Y_SLAB, F(26.8)), V3(F(30.5), RIDGE + 0.3, F(26.8)), IN(1.75)); for (const [x, y] of [[F(26), FL1 - IN(4)], [F(17), FL2 - IN(4)]]) rod(MAT.pvc, V3(x, y, F(26.8)), V3(F(30.5), y - IN(2), F(26.8)), IN(1));
  for (const [m, dz] of [[MAT.pexR, 0], [MAT.pexB, IN(3)]]) { const y = Y_SILL - IN(1); rod(m, V3(F(37), Y_SLAB + 1.5, F(23) + dz), V3(F(37), y, F(23) + dz), IN(0.35)); rod(m, V3(F(37), y, F(23) + dz), V3(F(17), y, F(23) + dz), IN(0.35)); rod(m, V3(F(17), y, F(23) + dz), V3(F(17), FL2 + 0.4, F(26.5) + dz), IN(0.35)); rod(m, V3(F(26), y, F(26) + dz), V3(F(26), FL1 + 0.8, F(27.2) + dz), IN(0.35)); }
  aabb(MAT.appliance, IN(8), Y_SLAB + 1.1, F(19), IN(12), Y_SLAB + 1.9, F(20.2));
  for (const W of [...EXT1, ...EXT2, ...INT1, ...INT2]) { const n = W.ext ? -W.d / 2 + IN(1.2) : W.d / 2 + IN(0.1); for (let s = F(2); s < W.L - F(1); s += F(10)) if (!W.ops.some(o => s > o.xl - 0.2 && s < o.xr + 0.2)) piece(MAT.ebox, wp(W, s, W.base + IN(17), n), W.u, UP, W.u.clone().cross(UP), IN(2.2), IN(3.5), IN(2.5));
    if (W.ext) board(MAT.wire, wp(W, 0.3, W.base + IN(24), 0), wp(W, W.L - 0.3, W.base + IN(24), 0), IN(0.5), IN(0.25), UP);
    for (const o of W.ops) if (!o.sill) piece(MAT.ebox, wp(W, o.xr + IN(6), W.base + IN(48), n), W.u, UP, W.u.clone().cross(UP), IN(2.2), IN(3.5), IN(2.5)); } }

step("Insulation", "Fibreglass batts fill the outside wall cavities (5 1/2 in deep: about R-20, what the energy code asks for in northern Illinois), a vapour retarder goes over them on the warm side, and later about 16 in of loose fill is blown over the top-floor ceiling in the attic (R-49).");
for (const W of [...EXT1, ...EXT2]) skin(MAT.insul, W, 0, W.d - IN(0.4), W.base + IN(1.5), W.base + WH - IN(3), IN(1.6), W.L - IN(1.6), F(2), { key: "insul" });

step("Drywall", "Sheets of 1/2 in gypsum board are screwed to the studs and to the ceiling joists, the joints taped and covered with three coats of joint compound and sanded smooth. The framing disappears.");
for (const W of [...EXT1, ...EXT2]) skin(MAT.drywall, W, -W.d / 2 - IN(0.25), IN(0.5), W.base, W.base + WH, IN(5.5) * 0, W.L, F(4), { key: "drywall" });
for (const W of [...INT1, ...INT2]) for (const sd of [-1, 1]) skin(MAT.drywall, W, sd * (W.d / 2 + IN(0.25)), IN(0.5), W.base, W.base + WH, 0, W.L, F(4), { key: "drywall" });
for (const [y, open] of [[FL1 + WH - IN(0.25), OPEN2], [TOP2 - IN(0.25), null]]) for (let x = IN(5.5); x < LX - IN(5.6); x += F(8)) for (let z = IN(5.5); z < LZ - IN(5.6); z += F(4)) for (const q of minus({ x0: x, z0: z, x1: Math.min(x + F(8), LX - IN(5.5)), z1: Math.min(z + F(4), LZ - IN(5.5)) }, open)) aabb(MAT.drywall, q.x0, y - IN(0.25), q.z0, q.x1, y + IN(0.25), q.z1, { key: "drywall" });
aabb(MAT.insul, IN(5.5), TOP2 + IN(3.5), IN(5.5), LX - IN(5.5), TOP2 + IN(16), LZ - IN(5.5), { key: "insul" });

step("Siding, trim and gutters", "Vinyl lap siding is hung over the housewrap in courses showing 4 in each, with corner posts and trim round the windows and doors; the eaves get aluminium fascia and vented soffits, and gutters with downspouts carry roof water away from the foundation.");
for (const W of [...EXT1, ...EXT2]) { const ext = Math.abs(W.out.x) > 0.5, y0 = W.base > 1.5 ? FL2 + IN(0.2) : Y_FDN + IN(2), y1 = W.base + WH + (W.base > 1.5 ? 0 : JD + IN(0.75)); for (let y = y0; y < y1 - 0.01; y += IN(4)) skin(MAT.siding, W, W.d / 2 + IN(0.9), IN(0.4), y, Math.min(y + IN(4.3), y1), ext ? -IN(6) : 0, ext ? W.L + IN(6) : W.L, 1e3, { key: "siding" }, 0.05);
  for (const op of W.ops) { const n = W.d / 2 + IN(1.4), tw = IN(3.5); for (const [a, b] of [[wp(W, op.xl - tw / 2, op.bot - (op.sill ? tw : 0), n), wp(W, op.xl - tw / 2, op.top + tw, n)], [wp(W, op.xr + tw / 2, op.bot - (op.sill ? tw : 0), n), wp(W, op.xr + tw / 2, op.top + tw, n)], [wp(W, op.xl - tw, op.top + tw / 2, n), wp(W, op.xr + tw, op.top + tw / 2, n)]]) board(MAT.trim, a, b, tw, IN(0.8), W.out, { key: "trim" }); } }
for (const W of [EXT2[2], EXT2[3]]) gable(MAT.siding, W, W.d / 2 + IN(0.9), IN(0.4), IN(4), { key: "siding" }, 0.05);
for (const [x, z] of [[-IN(1), -IN(1)], [LX + IN(1), -IN(1)], [-IN(1), LZ + IN(1)], [LX + IN(1), LZ + IN(1)]]) aabb(MAT.trim, x - IN(2.5), Y_FDN, z - IN(2.5), x + IN(2.5), TOP2, z + IN(2.5), { key: "trim" });
for (const sd of [-1, 1]) { const zE = sd < 0 ? -EAVE : LZ + EAVE, ys = yTC(zE) - IN(2); aabb(MAT.trim, -EAVE, ys - IN(6), Math.min(zE, sd < 0 ? 0 : LZ), LX + EAVE, ys - IN(5.5), Math.max(zE, sd < 0 ? 0 : LZ), { key: "trim" }); aabb(MAT.alum, -EAVE, ys - IN(5), zE + sd * IN(0.5), LX + EAVE, ys + IN(1), zE + sd * IN(5.5));
  for (const x of [F(1), LX - F(1)]) aabb(MAT.alum, x - IN(1.5), Y_FDN, zE + sd * IN(2), x + IN(1.5), ys - IN(4), zE + sd * IN(5)); }

step("Finished", "Paint, floors (oak strips downstairs, carpet up), interior doors, cabinets, fixtures and appliances; outside, the concrete front stoop and driveway, topsoil spread back and sod laid, shrubs planted. From the first stake to here takes a crew about four to six months.");
{ aabb(MAT.floor, IN(5.5), FL1, IN(5.5), LX - IN(5.5), FL1 + IN(0.75), LZ - IN(5.5), { key: "floor" }); for (const q of minus({ x0: IN(5.5), z0: IN(5.5), x1: LX - IN(5.5), z1: LZ - IN(5.5) }, OPEN2)) aabb(MAT.carpet, q.x0, FL2, q.z0, q.x1, FL2 + IN(0.6), q.z1);
  for (const q of minus({ x0: IN(5.5), z0: IN(5.5), x1: LX - IN(5.5), z1: LZ - IN(5.5) }, OPEN1)) {} floorRect(IN(5.5), IN(5.5), LX - IN(5.5), LZ - IN(5.5), FL1 + IN(0.75), { holes: [OPEN1] }); floorRect(IN(5.5), IN(5.5), LX - IN(5.5), LZ - IN(5.5), FL2 + IN(0.6), { holes: [OPEN2] });
  aabb(MAT.appliance, F(24), FL1, LZ - IN(5.5) - IN(24), F(36), FL1 + IN(36), LZ - IN(5.5)); aabb(MAT.floor, F(24), FL1 + IN(36), LZ - IN(5.5) - IN(25), F(36), FL1 + IN(37.5), LZ - IN(5.5));
  aabb(MAT.slab, F(18), 0, -F(5), F(22), FL1 - IN(7.5), 0); aabb(MAT.slab, F(18), 0, -F(6), F(22), FL1 - IN(15), -F(5)); aabb(MAT.slab, F(28), -0.04, -F(40), F(40), 0.02, 0);
  for (const [x0, z0, x1, z1] of [[PIT.x0, PIT.z0, PIT.x1, 0], [PIT.x0, LZ, PIT.x1, PIT.z1], [PIT.x0, 0, 0, LZ], [LX, 0, PIT.x1, LZ]]) aabb(MAT.grass, x0, -0.04, z0, x1, -0.005, z1);
  for (let k = 0; k < 9; k++) { const x = F(2) + k * F(4.2); if (x > F(17) && x < F(23) || x > F(27)) continue; piece(MAT.shrub, V3(x, 0.35, -F(2.5)), V3(1, 0, 0), UP, V3(0, 0, 1), 1.1, 0.8, 1.0, { geo: "ico" }); } }

// ---------- the scene round the house: a suburban lot, sky, light ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "varying vec3 vD; void main(){ float h = max(vD.y, 0.0); vec3 c = mix(vec3(0.82, 0.88, 0.92), vec3(0.32, 0.55, 0.86), pow(h, 0.5)); if (vD.y < 0.0) c = vec3(0.5, 0.55, 0.45); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" })); scene.add(sky);
scene.fog = new THREE.Fog(0xcfdce6, 150, 1200);
const hemi = new THREE.HemisphereLight(0xe0ecff, 0x6a6048, 1.1); scene.add(hemi, new THREE.AmbientLight(0xfff4e8, 0.45));
const sunL = new THREE.DirectionalLight(0xfff2dc, 2.6); sunL.position.set(-25, 40, -30); sunL.target.position.set(LX / 2, 0, LZ / 2); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 2048 : 4096, IS_HEADSET ? 2048 : 4096);
Object.assign(sunL.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 }); sunL.shadow.bias = -0.0003; sunL.shadow.normalBias = 0.02; scene.add(sunL, sunL.target);
const LOT = new THREE.Group(); scene.add(LOT);
{ const g = MAT.grass, mk = (x0, z0, x1, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0), g); m.position.set((x0 + x1) / 2, -0.05, (z0 + z1) / 2); m.receiveShadow = true; LOT.add(m); };
  mk(-300, -300, 300, PIT.z0); mk(-300, PIT.z1, 300, 300); mk(-300, PIT.z0, PIT.x0, PIT.z1); mk(PIT.x1, PIT.z0, 300, PIT.z1);
  const road = new THREE.Mesh(new THREE.BoxGeometry(600, 0.06, 9), new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: 0.9 })); road.position.set(0, -0.02, -F(40) - 4.5); road.receiveShadow = true; LOT.add(road);
  // the neighbours' finished houses, for scale: two storeys and a 6-in-12 gable roof like this one
  for (const x of [-F(70), LX + F(30)]) { const h = new THREE.Group(); h.position.set(x, 0, 0); LOT.add(h); const b = new THREE.Mesh(new THREE.BoxGeometry(F(36), TOP2, LZ), MAT.siding); b.position.set(F(18), TOP2 / 2, LZ / 2); b.castShadow = b.receiveShadow = true; h.add(b);
    const sh = new THREE.Shape([new THREE.Vector2(-F(15), 0), new THREE.Vector2(F(15), 0), new THREE.Vector2(0, F(7.5))]), r = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: F(38), bevelEnabled: false }), MAT.felt); r.rotation.y = Math.PI / 2; r.position.set(-F(1), TOP2, LZ / 2); r.castShadow = true; h.add(r); } }

// ---------- every step's pieces become instanced meshes, one per surface and shape ----------
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10), ico: new THREE.IcosahedronGeometry(0.5, 1) };
for (const S of STEPS) { const by = new Map(); S.pieces.forEach((p, i) => { p.idx = i; const k = p.key + "|" + p.geo + "|" + p.until; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }); S.meshes = [];
  for (const [k, list] of by) { const im = new THREE.InstancedMesh(GEO[list[0].geo], list[0].mat, list.length); im.castShadow = list[0].mat !== MAT.glass && list[0].mat !== MAT.string; im.receiveShadow = true; im.frustumCulled = false; list.forEach((p, i) => im.setMatrixAt(i, p.m)); im.visible = false; im.userData = { list, until: list[0].until, cover: COVER.has(list[0].key) }; scene.add(im); S.meshes.push(im); } }
// walls lie flat toward the inside and swing up on their hinge
for (const S of STEPS) for (const g of S.groups) { const W = g.W; g.p = wp(W, 0, W.base, W.d / 2); const test = UP.clone().applyAxisAngle(W.u, Math.PI / 2); g.flat = test.dot(W.out) < 0 ? Math.PI / 2 : -Math.PI / 2; }
let cur = 0, animT = 0, xray = false; const _q = new THREE.Quaternion(), _t = new THREE.Matrix4(), _r = new THREE.Matrix4();
function showStep(i) { cur = clampN(i, 0, STEPS.length - 1); animT = 0; for (const S of STEPS) for (const im of S.meshes) { im.visible = S.i <= cur && cur < im.userData.until && !(xray && im.userData.cover); if (S.i < cur) { im.userData.list.forEach((p, k) => im.setMatrixAt(k, p.m)); im.instanceMatrix.needsUpdate = true; } } drawPanel(); }
// the current step builds itself: pieces drop into place one after another; a step with walls frames each wall flat, then tilts it up
const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function animate(dt) { const S = STEPS[cur]; animT += dt; const N = S.pieces.length, G = S.groups.length, dur = G ? G * 2.2 + 3.0 : clampN(N * 0.035, 2.5, 9);
  if (animT > dur + 1.5) return; for (const im of S.meshes) { im.userData.list.forEach((p, k) => { let m;
      if (p.grp >= 0) { const g = S.groups[p.grp], t0 = p.grp * 2.2, a = (1 - ease((animT - t0 - 0.6) / 1.4)) * g.flat; if (animT < t0) m = ZERO; else { _q.setFromAxisAngle(g.W.u, a); _r.makeRotationFromQuaternion(_q); _t.makeTranslation(g.p.x, g.p.y, g.p.z).multiply(_r).multiply(new THREE.Matrix4().makeTranslation(-g.p.x, -g.p.y, -g.p.z)); m = _t.clone().multiply(p.m); } }
      else { const ti = G ? G * 2.2 + (p.idx / Math.max(1, N)) * 1.5 : (p.idx / Math.max(1, N)) * (dur - 1.2), e = ease((animT - ti) / 0.5); if (animT < ti) m = ZERO; else { m = p.m.clone(); m.elements[13] += (1 - e) * 0.8; } }
      im.setMatrixAt(k, m); }); im.instanceMatrix.needsUpdate = true; } }

// ---------- walking: the ground, the pit, every floor and stair that exists by now; walls you bump into ----------
function groundAt(x, z) { const inPit = x > PIT.x0 && x < PIT.x1 && z > PIT.z0 && z < PIT.z1; if (!inPit) return 0; const inHouse = x > 0 && x < LX && z > 0 && z < LZ; if (!inHouse && cur >= BACKFILL_STEP) return 0; return cur >= 1 ? PIT.y : 0; }
function floorAt(x, z, yRef) { let best = groundAt(x, z); for (const S of STEPS) { if (S.i > cur) break; for (const f of S.floors) { if (cur >= f.until) continue; if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue; if (f.holes.some(h => x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1)) continue;
      const y = f.ramp ? lerpN(f.ramp.y0, f.ramp.y1, clampN((x - f.ramp.x0) / (f.ramp.x1 - f.ramp.x0), 0, 1)) : f.y; if (y <= yRef + 0.5 && y > best) best = y; } } return best; }
function moveTo(nx, nz) { const r = 0.22; let x = nx, z = nz; for (const S of STEPS) { if (S.i > cur) break; for (const w of S.walls) { if (cur >= w.until || ME.y + 1.7 < w.y0 || ME.y > w.y1 - 0.25) continue;
      const dx = w.bx - w.ax, dz = w.bz - w.az, L2 = dx * dx + dz * dz || 1, t = clampN(((x - w.ax) * dx + (z - w.az) * dz) / L2, 0, 1), px = w.ax + t * dx, pz = w.az + t * dz, d = Math.hypot(x - px, z - pz); if (d < r && d > 1e-6) { x = px + (x - px) / d * r; z = pz + (z - pz) / d * r; } } } ME.x = x; ME.z = z; }

// ---------- the panel: on your left wrist in VR, at the top left on a screen ----------
const PANEL = (() => { const c = document.createElement("canvas"); c.width = 640; c.height = 520; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const me = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1625), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); me.renderOrder = 10; return { c, t, me }; })();
function wrap(g, text, x, y, w, lh) { const words = text.split(" "); let line = ""; for (const wd of words) { if (g.measureText(line + wd).width > w) { g.fillText(line, x, y); line = ""; y += lh; } line += wd + " "; } g.fillText(line, x, y); return y + lh; }
function drawPanel() { const g = PANEL.c.getContext("2d"), S = STEPS[cur]; g.clearRect(0, 0, 640, 520); g.fillStyle = "rgba(20,22,26,0.9)"; g.beginPath(); g.roundRect(0, 0, 640, 520, 24); g.fill();
  g.fillStyle = "#e8c070"; g.font = "bold 26px sans-serif"; g.fillText(`Step ${cur + 1} of ${STEPS.length}`, 24, 42); g.fillStyle = "#f4f0e6"; g.font = "bold 32px Georgia"; wrap(g, S.title, 24, 86, 590, 36); g.font = "21px Georgia"; g.fillStyle = "#e0dcd0"; wrap(g, S.text, 24, 136, 592, 27);
  g.fillStyle = "#a8b0b8"; g.font = "18px sans-serif"; g.fillText("A next  ·  B back  ·  trigger: replay  ·  X x-ray  ·  Y places", 24, 505); PANEL.t.needsUpdate = true; HUD.innerHTML = `<b>Step ${cur + 1} of ${STEPS.length}: ${S.title}</b><br>${S.text}<div style="margin-top:6px;color:#a8b0b8;font-size:12px">N / → next · P / ← back · space replay · X x-ray (hide the coverings) · G fly · 1-6 places</div>`; }
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:12px;top:12px;width:420px;z-index:2;background:rgba(20,22,26,.86);color:#f2eee4;font:14px/1.45 Georgia,serif;padding:12px 14px;border-radius:10px;display:none"; document.body.appendChild(HUD);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2;background:rgba(20,22,26,.88);color:#f2eee4;font:15px sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG); let msgT = 0;
const say = (t, s = 3) => { MSG.textContent = t; MSG.style.display = "block"; msgT = s; };

// ---------- moving about ----------
const ME = { x: LX / 2, y: 0, z: -F(30), vy: 0 }; let yaw = Math.PI, pitch = -0.1, vrYaw = Math.PI, flying = false, started = false; const keys = {}, prevB = {};
const PLACES = [["The street", () => [LX / 2, 0, -F(38), Math.PI, false]], ["High above the front corner", () => [-F(22), F(28), -F(26), Math.PI + 0.8, true]], ["In the basement", () => [F(26), Y_SLAB, F(8), -Math.PI / 2, false]],
  ["Inside the front door", () => [F(20), FL1, F(3), Math.PI, false]], ["The second-floor hall", () => [F(10), FL2, F(13.2), -Math.PI / 2, false]], ["The back yard", () => [LX / 2, 0, LZ + F(30), 0, false]]]; let placeI = 0;
function goPlace(i) { placeI = (i + PLACES.length) % PLACES.length; const [x, y, z, h, fly] = PLACES[placeI][1](); ME.x = x; ME.z = z; ME.y = fly ? y : floorAt(x, z, y + 0.3); ME.vy = 0; yaw = vrYaw = h; flying = fly; pitch = fly ? -0.45 : -0.05; say(PLACES[placeI][0]); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyN" || e.code === "ArrowRight") showStep(cur + 1); if (e.code === "KeyP" || e.code === "ArrowLeft") showStep(cur - 1); if (e.code === "Space" && !flying) animT = 0;
  if (e.code === "KeyX") { xray = !xray; showStep(cur); animT = 99; say(xray ? "X-ray: coverings hidden" : "X-ray off"); } if (e.code === "KeyG") { flying = !flying; say(flying ? "Flying: W/S along your view, Q/E down/up" : "Walking"); } if (/^Digit[1-6]$/.test(e.code)) goPlace(+e.code.slice(5) - 1); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = renderer.xr.isPresenting ? "none" : "block"; goPlace(0); showStep(0); }
document.getElementById("intro")?.addEventListener("click", start);
const HANDS = [0, 1].map(i => { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); const H = { grip, src: null }; grip.addEventListener("connected", e => { H.src = e.data; if (e.data.handedness === "left") { PANEL.me.position.set(0, 0.05, 0.12); PANEL.me.rotation.set(-Math.PI / 2 + 0.8, 0, 0); grip.add(PANEL.me); } }); return H; });
const VRB = document.getElementById("vr"); if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); HUD.style.display = "none"; vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); const _fq = new THREE.Quaternion();
showStep(0); goPlace(0);
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.05), vr = renderer.xr.isPresenting; let mx = 0, my = 0, up = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed, bY = gp.buttons[5]?.pressed, bL = gp.buttons[3]?.pressed; if (bX && !prevB.x) { xray = !xray; showStep(cur); animT = 99; } prevB.x = bX; if (bY && !prevB.y) goPlace(placeI + 1); prevB.y = bY; if (bL && !prevB.l) flying = !flying; prevB.l = bL; }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (flying && Math.abs(ty) > 0.3) up = -ty;
        const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed, tr = gp.buttons[0]?.pressed; if (bA && !prevB.a) showStep(cur + 1); prevB.a = bA; if (bB && !prevB.b) showStep(cur - 1); prevB.b = bB; if (tr && !prevB.t) animT = 0; prevB.t = tr; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.KeyE) up += 1; if (keys.KeyQ) up -= 1; }
  camera.getWorldQuaternion(_fq);
  if (flying) { const f = V3(0, 0, -1).applyQuaternion(_fq), sd = V3(1, 0, 0).applyQuaternion(_fq), sp = (run ? 12 : 4) * dt; ME.x += (f.x * -my + sd.x * mx) * sp; ME.z += (f.z * -my + sd.z * mx) * sp; ME.y += (f.y * -my + up) * sp; ME.y = Math.max(ME.y, floorAt(ME.x, ME.z, ME.y)); }
  else { if (started && (mx || my)) { const f = V3(0, 0, -1).applyQuaternion(_fq); f.y = 0; f.normalize(); const sdv = V3(-f.z, 0, f.x), sp = (run ? 4 : 1.6) * dt; moveTo(ME.x + (f.x * -my + sdv.x * mx) * sp, ME.z + (f.z * -my + sdv.z * mx) * sp); }
    const fy = floorAt(ME.x, ME.z, ME.y); if (fy >= ME.y - 0.02) { ME.y = lerpN(ME.y, fy, 0.5); ME.vy = 0; } else { ME.vy -= 9.8 * dt; ME.y = Math.max(fy, ME.y + ME.vy * dt); } }
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  animate(dt); msgT -= dt; if (msgT <= 0) MSG.style.display = "none"; renderer.render(scene, camera); });

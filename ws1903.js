// ws1903.js -- The first World Series, Game 1: Thursday, October 1, 1903, at the Huntington Avenue Baseball Grounds in Boston. Pittsburgh
// Pirates 7, Boston Americans 3. You arrive on Rogers Street, buy a ticket, go in under the grandstand, and walk anywhere or take a seat. The
// park is rebuilt from the descriptions and photographs: a covered grandstand behind home plate on 28-ft columns, open bleachers down both
// lines, a 14-ft board fence, a field 530 ft deep to centre with a tool shed in play, and an overflow crowd of thousands standing in the
// outfield behind ropes (a ball hit into them was a ground-rule triple). Every play of the game comes from the official record (Retrosheet).
// Built into ws1903.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
// ---------- a black box: how far the last visit got, and any error, kept in local storage. If the last visit never got going, this one
// starts at a lighter quality level (2 full, 1 light, 0 minimal); ?q=0, 1 or 2 in the address sets it by hand. ----------
const DIAG = (() => { const K = "ws1903diag2"; let prev = null; try { prev = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) {} const qp = new URLSearchParams(location.search).get("q");
  const q = qp !== null ? clampQ(+qp) : prev ? (prev.stable ? prev.q : clampQ(prev.q - 1)) : (IS_HEADSET ? 1 : 2), cur = { q, stage: "loading", stable: false, err: "", when: Date.now() };
  const save = () => { try { localStorage.setItem(K, JSON.stringify(cur)); } catch (e) {} }; save();
  addEventListener("error", e => { cur.err = String(e.message || e.error || "error").slice(0, 160) + (e.lineno ? " (line " + e.lineno + ")" : ""); save(); }); addEventListener("unhandledrejection", e => { cur.err = String(e.reason || "promise").slice(0, 160); save(); });
  addEventListener("DOMContentLoaded", () => { const card = document.querySelector("#intro .card"); if (!card) return; const p = document.createElement("p"); p.className = "dim"; p.style.fontSize = "13px";
    p.textContent = prev && !prev.stable ? `Last time it stopped while ${prev.stage}${prev.err ? " (error: " + prev.err + ")" : ""}, at quality ${prev.q}. Trying quality ${q} now (2 full, 1 light, 0 minimal).` : `Quality ${q} (2 full, 1 light, 0 minimal; add ?q=0 to the address for the lightest).`; card.appendChild(p); });
  return { q, prev, stage: s => { cur.stage = s; save(); }, stable: () => { if (!cur.stable) { cur.stable = true; save(); } } }; })();
function clampQ(v) { return Math.max(0, Math.min(2, v | 0)); }
const QL = DIAG.q;
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.xr.enabled = true; renderer.xr.setFramebufferScaleFactor(QL === 0 ? 0.75 : 1); renderer.shadowMap.enabled = QL >= 2; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 4000), rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.set(0, 1.6, 0);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp, UP = V3(0, 1, 0), FT = 0.3048;
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = mulberry(1903);
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const box = (w, h, d, mat, x, y, z, ry = 0, P = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; P.add(m); return m; };

// ---------- the field: home plate at the origin, centre field due north (-z), the right-field line toward the north-east ----------
// dir(a): the direction from home at angle a (radians) from the line to centre field, positive toward right field.
const dir = a => V3(Math.sin(a), 0, -Math.cos(a)), D45 = Math.PI / 4;
const BASE = 90 * FT, MOUND = 60.5 * FT;
const B1 = dir(D45).multiplyScalar(BASE), B3 = dir(-D45).multiplyScalar(BASE), B2 = V3(0, 0, -BASE * Math.SQRT2), PM = V3(0, 0, -MOUND);
// the fence, in feet from home: 350 down the left-field line, 440 in left-centre, 530 to centre, 320 down the right-field line
const FENCE = [[-45, 350], [-22.5, 440], [0, 530], [22.5, 420], [45, 320]];
const fenceDist = deg => { for (let i = 0; i < FENCE.length - 1; i++) if (deg <= FENCE[i + 1][0]) { const t = (deg - FENCE[i][0]) / (FENCE[i + 1][0] - FENCE[i][0]); return lerpN(FENCE[i][1], FENCE[i + 1][1], t) * FT; } return FENCE[4][1] * FT; };
// the ropes that held the overflow crowd back (reconstructed: the crowd was deepest where the fence was farthest)
const ROPE = [[-45, 290], [-22.5, 330], [0, 420], [22.5, 320], [45, 265]];
const ropeDist = deg => { for (let i = 0; i < ROPE.length - 1; i++) if (deg <= ROPE[i + 1][0]) { const t = (deg - ROPE[i][0]) / (ROPE[i + 1][0] - ROPE[i][0]); return lerpN(ROPE[i][1], ROPE[i + 1][1], t) * FT; } return ROPE[4][1] * FT; };

DIAG.stage("building the field");
// ---------- the lot, in a frame along the foul lines: u runs out the third-base line (north-west), w out the first-base line (north-east) ----------
const UA = dir(-D45), WA = dir(D45), P2 = (u, w, y = 0) => V3(u * UA.x + w * WA.x, y, u * UA.z + w * WA.z), toUW = (x, z) => [x * UA.x + z * UA.z, x * WA.x + z * WA.z];
const ROT_U = Math.atan2(-UA.x, -UA.z), ROT_W = Math.atan2(-WA.x, -WA.z);
// Rogers Street behind the third-base side, the railroad behind the first-base side, Huntington Avenue beyond left field
var GATE_U = 42, SCORE = { c: null, t: null, line: [[], []] };
const ROGERS = [-50, -38], RAIL = [-80, -42], HUNT = [128, 146], LOT = { u0: -40, w0: -38 };
const SKYC = 0xb8cce0; scene.background = new THREE.Color(SKYC); scene.fog = new THREE.Fog(SKYC, 250, 1400);
const hemi = new THREE.HemisphereLight(0xdde6f0, 0x6a5e48, 1.0); scene.add(hemi);
// October 1, about 3:30 in the afternoon in Boston: the sun in the south-west, about 30° up, behind the third-base stands
const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.position.set(-140, 120, 150); sun.castShadow = QL >= 2; sun.shadow.mapSize.set(IS_HEADSET ? 2048 : 4096, IS_HEADSET ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 500 }); sun.shadow.bias = -0.0004; sun.target.position.set(0, 0, -60); scene.add(sun, sun.target);

// ---------- textures ----------
const grassT = tex(256, 256, (g, w, h) => { g.fillStyle = "#5a7a34"; g.fillRect(0, 0, w, h); const r = mulberry(3); for (let i = 0; i < 5000; i++) { const v = r(); g.fillStyle = v < 0.4 ? "#4e6e2c" : v < 0.8 ? "#68883c" : "#7a8a48"; g.fillRect(r() * w, r() * h, 1.5, 3); } }, [60, 60]);
const dirtT = tex(256, 256, (g, w, h) => { g.fillStyle = "#9a7a58"; g.fillRect(0, 0, w, h); const r = mulberry(4); for (let i = 0; i < 4000; i++) { const v = 120 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v * 0.8 | 0},${v * 0.6 | 0},0.5)`; g.fillRect(r() * w, r() * h, 2, 2); } }, [30, 30]);
const streetT = tex(256, 256, (g, w, h) => { g.fillStyle = "#8a8070"; g.fillRect(0, 0, w, h); const r = mulberry(5); for (let i = 0; i < 3000; i++) { const v = 100 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v * 0.95 | 0},${v * 0.85 | 0},0.6)`; g.fillRect(r() * w, r() * h, 3, 2); } for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(90,70,40,0.3)"; g.beginPath(); g.ellipse(r() * w, r() * h, 6, 3, r() * 3, 0, 7); g.fill(); } }, [40, 40]);
const boardT = tex(128, 256, (g, w, h) => { g.fillStyle = "#6a5a44"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { g.fillStyle = `rgba(0,0,0,${0.15 + (x % 32 ? 0.1 : 0)})`; g.fillRect(x, 0, 2, h); } const r = mulberry(6); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,240,220,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 20); } }, [1, 1]);
const brickT = tex(256, 256, (g, w, h) => { g.fillStyle = "#8a4a34"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 * 8; x < w; x += 16) { g.fillStyle = `rgb(${130 + Math.random() * 30 | 0},${62 + Math.random() * 15 | 0},${44 + Math.random() * 10 | 0})`; g.fillRect(x, y, 15, 7); } }, [1, 1]);
function windowsT(cols, rows, base = "#8a4a34") { return tex(512, 512, (g, w, h) => { g.drawImage(brickT.image, 0, 0, w, h); g.drawImage(brickT.image, 256, 0); g.drawImage(brickT.image, 0, 256); g.drawImage(brickT.image, 256, 256); const cw = w / cols, rh = h / rows; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { g.fillStyle = "#c8b898"; g.fillRect(i * cw + cw * 0.22, j * rh + rh * 0.18, cw * 0.56, rh * 0.62); g.fillStyle = Math.random() < 0.2 ? "#5a6470" : "#2a2e34"; g.fillRect(i * cw + cw * 0.27, j * rh + rh * 0.22, cw * 0.46, rh * 0.54); } }); }
const MAT = { grass: new THREE.MeshStandardMaterial({ map: grassT, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), dirt: new THREE.MeshStandardMaterial({ map: dirtT, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), street: new THREE.MeshStandardMaterial({ map: streetT, roughness: 1 }), board: new THREE.MeshStandardMaterial({ map: boardT, roughness: 0.95 }),
  wood: M(0x7a6448), seat: M(0x5a4a38), paint: M(0x3a5a3a), roof: M(0x5a5a58, { roughness: 0.7 }), col: M(0x5a5a52), chalk: new THREE.MeshBasicMaterial({ color: 0xf4f2ea }), white: M(0xf0eee6), iron: M(0x3a3a3a, { metalness: 0.5, roughness: 0.5 }), rope: M(0xb8a888), stone: M(0x9a968a) };

// ---------- the ground: streets and yards outside, the playing field inside ----------
{ const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), MAT.street); g.position.y = -0.05; g.receiveShadow = true; scene.add(g);
  const sh = new THREE.Shape(); const pts = [P2(LOT.u0, LOT.w0), P2(LOT.u0, 100)]; for (let d = 45; d >= -45; d -= 2.5) pts.push(dir(d * Math.PI / 180).multiplyScalar(fenceDist(d) + 0.3)); pts.push(P2(108, LOT.w0));
  pts.forEach((p, i) => i ? sh.lineTo(p.x, -p.z) : sh.moveTo(p.x, -p.z)); const f = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), MAT.grass); f.receiveShadow = true; scene.add(f);
  const flat = (geo, mat, y) => { const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), mat); m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };
  // the base paths, the dirt round home and the bases, and the pitcher's box (a raised mound, at most 15 in under the 1903 rules)
  for (const [a, b] of [[V3(0, 0, 0), B1], [B1, B2], [B2, B3], [B3, V3(0, 0, 0)]]) { const L = a.distanceTo(b), m = flat(new THREE.PlaneGeometry(6 * FT, L + 2), MAT.dirt, 0.01); m.position.copy(a).add(b).multiplyScalar(0.5).setY(0.01); m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); }
  for (const b of [B1, B2, B3]) flat(new THREE.CircleGeometry(13 * FT / 2 + 0.6, 24), MAT.dirt, 0.012).position.set(b.x, 0.012, b.z);
  flat(new THREE.CircleGeometry(13 * FT, 32), MAT.dirt, 0.013); const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.9, 0.3, 24), MAT.dirt); mound.position.set(PM.x, 0.15, PM.z); mound.receiveShadow = true; scene.add(mound);
  const rubber = box(24 * IN(1), 0.03, 6 * IN(1), MAT.white, PM.x, 0.31, PM.z);
  // the sandy patches in the outfield where the grass would not grow (they're in every account of the park)
  const r = mulberry(11); for (let i = 0; i < 9; i++) { const a = (r() - 0.5) * 1.4, d = 50 + r() * 70, p = dir(a).multiplyScalar(d), s = flat(new THREE.CircleGeometry(1, 18), MAT.dirt, 0.008); s.position.set(p.x, 0.008, p.z); s.scale.set(3 + r() * 6, 1, 2 + r() * 4); s.rotation.y = r() * 3; s.material = MAT.dirt; }
  // home plate (a 17-in pentagon since 1900), the bases (15-in canvas bags), the foul lines, the batter's and coaches' boxes
  const hp = new THREE.Shape([[0, 0], [8.5, -8.5], [8.5, -17], [-8.5, -17], [-8.5, -8.5]].map(([x, y]) => new THREE.Vector2(x * IN(1), y * IN(1)))); const hpm = new THREE.Mesh(new THREE.ShapeGeometry(hp).rotateX(-Math.PI / 2), MAT.white); hpm.rotation.y = Math.PI; hpm.position.y = 0.02; scene.add(hpm);
  for (const b of [B1, B2, B3]) box(15 * IN(1), 0.1, 15 * IN(1), MAT.white, b.x, 0.05, b.z, D45);
  for (const s of [-1, 1]) { const d = dir(s * D45), L = fenceDist(s * 45), m = flat(new THREE.PlaneGeometry(0.08, L), MAT.chalk, 0.02); m.position.copy(d.clone().multiplyScalar(L / 2)).setY(0.02); m.rotation.y = s * D45; }
  for (const s of [-1, 1]) { const cx = s * (6 + 2) * IN(1) + s * 2 * FT; for (const [x0, z0, x1, z1] of [[cx - 2 * FT, -3 * FT, cx + 2 * FT, -3 * FT], [cx - 2 * FT, 3 * FT, cx + 2 * FT, 3 * FT], [cx - 2 * FT, -3 * FT, cx - 2 * FT, 3 * FT], [cx + 2 * FT, -3 * FT, cx + 2 * FT, 3 * FT]]) box(Math.abs(x1 - x0) + 0.05, 0.005, Math.abs(z1 - z0) + 0.05, MAT.chalk, (x0 + x1) / 2, 0.02, (z0 + z1) / 2); } }
function IN(n) { return n * 0.0254; }

// ---------- the fence: 14 ft of boards round the outfield and down the sides of the lot ----------
const FENCE_H = 14 * FT, WALLS = [];
function boardWall(a, b, h = FENCE_H, gapAt = null) { const L = a.distanceTo(b); if (L < 0.05) return; const bg = new THREE.BoxGeometry(L, h, 0.12), uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L / 3); const m = new THREE.Mesh(bg, MAT.board); m.position.copy(a).add(b).multiplyScalar(0.5).setY(h / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); m.castShadow = m.receiveShadow = true; scene.add(m); WALLS.push({ a: a.clone(), b: b.clone(), h }); }
{ let prev = null; for (let d = -45; d <= 45; d += 2.5) { const p = dir(d * Math.PI / 180).multiplyScalar(fenceDist(d)); if (prev) boardWall(prev, p); prev = p; }
  const LFP = dir(-D45).multiplyScalar(fenceDist(-45)), RFP = dir(D45).multiplyScalar(fenceDist(45));
  boardWall(LFP, P2(fenceDist(-45), LOT.w0)); boardWall(RFP, P2(LOT.u0, fenceDist(45))); boardWall(P2(LOT.u0, fenceDist(45)), P2(LOT.u0, LOT.w0));
  // the Rogers Street side, with the gate between the grandstand and the third-base bleachers
  boardWall(P2(fenceDist(-45), LOT.w0), P2(GATE_U + 3, LOT.w0)); boardWall(P2(GATE_U - 3, LOT.w0), P2(LOT.u0, LOT.w0));
  // foul poles were not yet used everywhere; this park marked the line on the fence
  // the tool shed in deep centre field (in play) and the flagpole
  const tsP = dir(0.05).multiplyScalar(fenceDist(3) - 4); box(6, 3.2, 4, MAT.board, tsP.x, 1.6, tsP.z, 0.05); box(6.6, 0.2, 4.6, MAT.roof, tsP.x, 3.3, tsP.z, 0.05);
  const fp = dir(-0.12).multiplyScalar(fenceDist(-7) - 3); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 24, 8), MAT.white); pole.position.set(fp.x, 12, fp.z); scene.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8, 8, 1), new THREE.MeshStandardMaterial({ map: tex(170, 90, (g) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f0f0f0" : "#b22234"; g.fillRect(0, i * 90 / 13, 170, 90 / 13 + 1); } g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, 70, 48); g.fillStyle = "#fff"; for (let j = 0; j < 9; j++) for (let i = 0; i < (j % 2 ? 5 : 6); i++) g.fillRect(5 + i * 11 + (j % 2 ? 5 : 0), 3 + j * 5, 2, 2); }), side: THREE.DoubleSide }));
  flag.position.set(fp.x + 1.75, 22.8, fp.z); scene.add(flag); window.FLAG = flag;
  // the scoreboard, mounted above the right-field fence toward right-centre, with the innings in a row
  const sbA = 33, sbP = dir(sbA * Math.PI / 180).multiplyScalar(fenceDist(sbA) - 0.3); SCORE.c = document.createElement("canvas"); SCORE.c.width = 1024; SCORE.c.height = 256; SCORE.t = new THREE.CanvasTexture(SCORE.c); SCORE.t.colorSpace = THREE.SRGBColorSpace;
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshStandardMaterial({ map: SCORE.t, roughness: 0.9 })); sb.position.set(sbP.x, FENCE_H + 2, sbP.z); sb.lookAt(0, FENCE_H + 2, 0); scene.add(sb); box(12.4, 3.4, 0.2, MAT.wood, sbP.x, FENCE_H + 2, sbP.z, sb.rotation.y).position.addScaledVector(V3(sbP.x, 0, sbP.z).normalize(), 0.12);
  for (const s of [-5, 5]) { const p = sbP.clone().add(V3(-sbP.z, 0, sbP.x).normalize().multiplyScalar(s)); box(0.25, FENCE_H + 3.5, 0.25, MAT.wood, p.x, (FENCE_H + 3.5) / 2, p.z); } }

DIAG.stage("building the stands");
// ---------- the grandstand (covered, behind home) and the open bleachers down both lines ----------
// Each section is a run of stepped rows; the grandstand wings and the corner behind home overlap at the joins.
const SECTIONS = [], SEATS = [], T225 = Math.tan(Math.PI / 8);
function section(name, a, b, out, rows, rowD, rowH, roof, extA, extB) { const A = b.clone().sub(a), L = A.length(); A.normalize(); const S = { name, o: a.clone(), A, out: out.clone().normalize(), L, rows, rowD, rowH, roof, extA, extB }; SECTIONS.push(S);
  const ry = -Math.atan2(A.z, A.x), mat = roof ? MAT.wood : MAT.wood;
  for (let k = 0; k < rows; k++) { const e0 = extA ? k * rowD * T225 + 0.3 : 0, e1 = extB ? k * rowD * T225 + 0.3 : 0, len = L + e0 + e1, y = (k + 1) * rowH, c = a.clone().addScaledVector(A, (L + e1 - e0) / 2).addScaledVector(S.out, (k + 0.5) * rowD);
    const st = new THREE.Mesh(new THREE.BoxGeometry(len, y, rowD), mat); st.position.set(c.x, y / 2, c.z); st.rotation.y = ry; st.receiveShadow = true; st.castShadow = k === rows - 1; scene.add(st);
    const bn = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.3), MAT.seat); bn.position.copy(c).addScaledVector(S.out, 0.05).setY(y + 0.42); bn.rotation.y = ry; bn.receiveShadow = true; scene.add(bn);
    for (let t = -e0 + 0.4; t < L + e1 - 0.4; t += 0.56) { const p = a.clone().addScaledVector(A, t).addScaledVector(S.out, k * rowD + rowD * 0.55); SEATS.push({ p: p.setY(y + 0.42), face: Math.atan2(S.out.x, S.out.z), sec: name, row: k, taken: false }); } }
  const D = rows * rowD, H = rows * rowH, back = a.clone().addScaledVector(S.out, D), eA = extA ? D * T225 : 0, eB = extB ? D * T225 : 0;
  if (roof) { const rb = H + 4.2, rf = 28 * FT, cA = a.clone().addScaledVector(A, -eA * 0.2), N = Math.ceil(L / 6);
    for (let i = 0; i <= N; i++) { const p = a.clone().addScaledVector(A, i * L / N).addScaledVector(S.out, rowD * 0.5); const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, rf, 8), MAT.col); cl.position.set(p.x, rf / 2, p.z); cl.castShadow = true; scene.add(cl); }
    const len = L + eA + eB + 1, mid = a.clone().addScaledVector(A, (L + eB - eA) / 2), slope = Math.atan2(rb - rf, D), rl = Math.hypot(D + 1.5, rb - rf), rm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.15, rl), MAT.roof);
    rm.position.copy(mid).addScaledVector(S.out, (D - 1.5) / 2).setY((rf + rb) / 2 + 0.1); rm.rotation.set(0, 0, 0); rm.rotation.y = ry; rm.rotateX(S.out.dot(V3(-Math.sin(ry), 0, -Math.cos(ry))) > 0 ? slope : -slope); rm.castShadow = true; scene.add(rm);
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 0.1), MAT.paint); fascia.position.copy(mid).addScaledVector(S.out, -1.5).setY(rf - 0.2); fascia.rotation.y = ry; scene.add(fascia);
    const bw = new THREE.Mesh(new THREE.BoxGeometry(len, rb, 0.3), MAT.board); bw.position.copy(back).addScaledVector(A, (L + eB - eA) / 2 - L / 2 * 0).setY(rb / 2); bw.position.copy(mid).addScaledVector(S.out, D + 0.15).setY(rb / 2); bw.rotation.y = ry; bw.castShadow = bw.receiveShadow = true; scene.add(bw); }
  else { const bw = new THREE.Mesh(new THREE.BoxGeometry(L, H + 1.1, 0.12), MAT.board); bw.position.copy(a).addScaledVector(A, L / 2).addScaledVector(S.out, D).setY((H + 1.1) / 2); bw.rotation.y = ry; bw.castShadow = true; scene.add(bw); }
  WALLS.push({ a: a.clone().addScaledVector(S.out, D).addScaledVector(A, -eA), b: a.clone().addScaledVector(S.out, D).addScaledVector(A, L + eB), h: 20 });
  // a rail along the front of each section
  const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.08), MAT.paint); rail.position.copy(a).addScaledVector(A, L / 2).addScaledVector(S.out, -0.1).setY(0.45); rail.rotation.y = ry; scene.add(rail); return S; }
const GS = 19, RD = 0.78, RH = 0.36;
section("third-base grandstand", P2(-6, -GS), P2(38, -GS), WA.clone().negate(), 22, RD, RH, true, true, false);
section("grandstand behind home", P2(-GS, -6), P2(-6, -GS), V3(0, 0, 1), 22, RD, RH, true, true, true);
section("first-base grandstand", P2(-GS, 40), P2(-GS, -6), UA.clone().negate(), 22, RD, RH, true, false, true);
section("third-base bleachers", P2(46, -17), P2(100, -17), WA.clone().negate(), 12, 0.72, 0.34, false, false, false);
section("first-base bleachers", P2(-17, 92), P2(-17, 46), UA.clone().negate(), 12, 0.72, 0.34, false, false, false);
// the wire screen behind home plate, to keep foul balls out of the best seats
{ const a = P2(-GS + 0.6, -5), b = P2(-5, -GS + 0.6), L = a.distanceTo(b), scr = new THREE.Mesh(new THREE.PlaneGeometry(L + 8, 7), new THREE.MeshStandardMaterial({ map: tex(64, 64, (g) => { g.strokeStyle = "rgba(40,40,40,0.9)"; g.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); g.beginPath(); g.moveTo(i - 64, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(i - 64, 64); g.lineTo(i, 0); g.stroke(); } }, [(L + 8) * 2, 14]), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  scr.position.copy(a).add(b).multiplyScalar(0.5).setY(3.5); scr.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(scr); }
// the players' benches: open benches in front of the stands, Boston on the third-base side, Pittsburgh on the first-base side
const BENCH = { BOS: P2(14, -13), PIT: P2(-13, 14) };
for (const [k, p] of Object.entries(BENCH)) { const ry = k === "BOS" ? ROT_U + Math.PI / 2 : ROT_W - Math.PI / 2; box(8, 0.45, 0.45, MAT.wood, p.x, 0.22, p.z, ry); box(8.4, 0.08, 1.8, MAT.roof, p.x, 2.2, p.z, ry); box(8.4, 2.2, 0.08, MAT.board, ...[p.clone().add((k === "BOS" ? WA.clone().negate() : UA.clone().negate()).multiplyScalar(0.8))].map(q => [q.x, 1.1, q.z]).flat(), ry); }
// how high the floor is anywhere: the stepped rows of the stands, the pitcher's mound, and level ground everywhere else
function floorAt(x, z) { const p = V3(x, 0, z); for (const S of SECTIONS) { const d = p.clone().sub(S.o), v = d.dot(S.out), t = d.dot(S.A); if (v < 0 || v > S.rows * S.rowD) continue; const k = Math.floor(v / S.rowD), e0 = S.extA ? k * S.rowD * T225 + 0.3 : 0, e1 = S.extB ? k * S.rowD * T225 + 0.3 : 0; if (t < -e0 || t > S.L + e1) continue; return (k + 1) * S.rowH; }
  const dm = Math.hypot(x - PM.x, z - PM.z); return dm < 2.9 ? 0.3 * clampN((2.9 - dm) / 1.3, 0, 1) : 0; }

DIAG.stage("seating the crowd");
// ---------- the crowd: 16,242 paid. About 7,000 seated, the rest standing in the outfield behind the ropes, on the left-field bank and on the fence ----------
// Men in dark suits and derbies or flat caps, a few straw boaters left over from summer, a few women in broad hats; the Royal Rooters, Boston's
// loudest fans, in the bleachers behind first base.
function mergeG(list) { const pos = [], nor = []; for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); } const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return m; }
// kept very simple so a headset can draw thousands: seated fans are a few boxes, about 70 triangles each; the standing crowd far out in the
// outfield are flat cut-out figures facing the field, two triangles each
const STANDING = mergeG([new THREE.BoxGeometry(0.42, 0.64, 0.24).translate(0, 1.16, 0), new THREE.BoxGeometry(0.34, 0.86, 0.2).translate(0, 0.43, 0)]);
const SEATED = mergeG([new THREE.BoxGeometry(0.42, 0.62, 0.24).translate(0, 0.32, 0.02), new THREE.BoxGeometry(0.36, 0.14, 0.46).translate(0, 0.05, -0.2)]);
const HEADG = new THREE.IcosahedronGeometry(0.1, QL >= 2 ? 1 : 0).scale(0.9, 1.1, 0.95), brim = r => new THREE.CircleGeometry(r, 7).rotateX(-Math.PI / 2);
const HATS = { derby: mergeG([new THREE.CylinderGeometry(0.085, 0.105, 0.1, 5).translate(0, 0.04, 0), brim(0.16)]), cap: mergeG([new THREE.BoxGeometry(0.21, 0.06, 0.22).translate(0, 0.02, 0), new THREE.BoxGeometry(0.18, 0.012, 0.09).translate(0, 0, -0.14)]),
  boater: mergeG([new THREE.CylinderGeometry(0.1, 0.1, 0.07, 5).translate(0, 0.035, 0), brim(0.17)]), lady: mergeG([new THREE.CylinderGeometry(0.1, 0.12, 0.09, 5).translate(0, 0.045, 0), brim(0.26)]) };
const CUTOUT = (() => { const c = document.createElement("canvas"), W = 64, H = 128, NV = 8; c.width = W * NV; c.height = H; const g = c.getContext("2d"), coats = ["#23252b", "#2c2b2e", "#1f2331", "#36312b", "#3b3731", "#4a4437", "#2a2a2a", "#56504a"];
  for (let v = 0; v < NV; v++) { const x0 = v * W, cx = x0 + W / 2, hat = v % 4; g.fillStyle = "#2a2622"; g.fillRect(cx - 10, 70, 8, 56); g.fillRect(cx + 2, 70, 8, 56); g.fillStyle = coats[v]; g.beginPath(); g.roundRect(cx - 14, 30, 28, 46, 6); g.fill(); g.fillStyle = "#d8a888"; g.beginPath(); g.arc(cx, 21, 8, 0, 7); g.fill(); g.fillStyle = "#e8e4dc"; g.fillRect(cx - 3, 30, 6, 6);
    g.fillStyle = hat === 2 ? "#ddd0a0" : hat === 3 ? "#5a3a40" : "#1c1c1c"; if (hat === 0) { g.beginPath(); g.ellipse(cx, 14, 8, 6, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 12, 14, 24, 2); } else if (hat === 1) { g.fillRect(cx - 9, 10, 18, 5); g.fillRect(cx - 9, 14, 22, 2); } else if (hat === 2) { g.fillRect(cx - 8, 9, 16, 6); g.fillRect(cx - 12, 14, 24, 2); } else { g.fillRect(cx - 7, 8, 14, 6); g.fillRect(cx - 16, 13, 32, 3); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; return { t, NV }; })();
const CROWD = { list: [], g: new THREE.Group(), built: false, cheerU: { value: 0 }, timeU: { value: 0 } };
// the crowd rises and bobs when it cheers: done in the shader, so 10,000 people cost nothing to move
function cheerMat(m) { m.onBeforeCompile = sh => { sh.uniforms.uCheer = CROWD.cheerU; sh.uniforms.uTime = CROWD.timeU; sh.vertexShader = "uniform float uCheer; uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n#ifdef USE_INSTANCING\n vec3 ipos = instanceMatrix[3].xyz; float ph = fract(sin(dot(floor(ipos.xz * 4.0), vec2(12.9898, 78.233))) * 43758.5) * 6.28; transformed.y += uCheer * 0.16 * max(0.0, sin(uTime * 8.0 + ph));\n#endif"); }; return m; } const ROOTERS_AT = P2(-24, 64, 4);
function buildCrowd() { if (CROWD.built) return; CROWD.built = true; DIAG.stage("seating the crowd");
 const coat = [0x22242a, 0x2a2a2e, 0x1e2230, 0x34302a, 0x3a3630, 0x2c2a26, 0x4a4436, 0x1a1a1c, 0x3e3a3a, 0x5a5448], hatCol = { derby: [0x1a1a1a, 0x2a2420, 0x3a2e24], cap: [0x3a3a3a, 0x4a4438, 0x2a2a30, 0x5a5040], boater: [0xe0d4a8], lady: [0x3a2a3a, 0x2a2a3a, 0x5a3a30, 0x7a6a5a] };
  const people = []; const hatOf = r => r < 0.6 ? "derby" : r < 0.88 ? "cap" : r < 0.94 ? "boater" : "lady";
  // seated: most seats filled, every one in the Royal Rooters' block, a few left empty (you can take one)
  for (const s of SEATS) { const rooter = s.sec === "first-base bleachers" && s.row < 9 && s.p.distanceTo(P2(-17, 70)) < 16; if (!rooter && R() < [0.7, 0.4, IS_HEADSET ? 0.2 : 0.08][QL]) continue; s.taken = true; people.push({ p: s.p.clone(), face: s.face, seated: true, hat: rooter ? "derby" : hatOf(R()), rooter }); }
  // standing: behind the ropes in the outfield, thicker toward the fence
  let n = 0; while (n < [800, 2000, IS_HEADSET ? 3000 : 6200][QL]) { const d = (R() - 0.5) * 88, rd = ropeDist(d) + 1.2, fd = fenceDist(d) - 0.8; if (fd <= rd) continue; const dist = lerpN(rd, fd, Math.sqrt(R())), p = dir(d * Math.PI / 180).multiplyScalar(dist); people.push({ p: p.setY(0), face: Math.atan2(p.x, p.z) + (R() - 0.5) * 0.6, seated: false, hat: hatOf(R()) }); n++; }
  // and along the top of the left-field fence
  for (let d = -45; d < -12; d += 0.35) { if (R() < 0.35) continue; const p = dir(d * Math.PI / 180).multiplyScalar(fenceDist(d) + 0.1); people.push({ p: p.setY(FENCE_H - 0.42), face: Math.atan2(p.x, p.z), seated: true, hat: hatOf(R()), fence: true }); }
  // along the street outside, people still waiting to get in
  for (let i = 0; i < 60; i++) { const p = P2(GATE_U - 6 - i * 0.75 + R() * 0.3, -40.6 - R() * 0.5); people.push({ p: p.setY(0), face: Math.atan2(WA.x, WA.z) + (R() - 0.5) * 2, seated: false, hat: hatOf(R()), outside: true }); }
  const flatP = people.filter(P => (!P.seated || P.fence) && !P.outside), solid = people.filter(P => (P.seated && !P.fence) || P.outside); people.length = 0; people.push(...solid);
  const cut = []; for (let v = 0; v < CUTOUT.NV; v++) { const g = new THREE.PlaneGeometry(0.62, 1.8).translate(0, 0.9, 0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + v) / CUTOUT.NV); const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: CUTOUT.t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), flatP.length); im.count = 0; cut.push(im); }
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); for (const P of flatP) { const im = cut[R() * CUTOUT.NV | 0], sc = 0.9 + R() * 0.18, y = P.fence ? P.p.y - 0.55 : P.p.y; q.setFromAxisAngle(UP, Math.atan2(P.p.x, P.p.z) + (R() - 0.5) * 0.3); m4.compose(V3(P.p.x, y, P.p.z), q, V3(sc, sc, sc)); im.setMatrixAt(im.count, m4); im.setColorAt(im.count, c.setScalar(0.75 + R() * 0.3)); im.count++; CROWD.list.push(P); }
    for (const im of cut) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.receiveShadow = true; CROWD.g.add(im); } }
  const N = people.length, body = { s: new THREE.InstancedMesh(SEATED, M(0xffffff), N), t: new THREE.InstancedMesh(STANDING, M(0xffffff), N) }, head = new THREE.InstancedMesh(HEADG, M(0xffffff, { roughness: 0.7 }), N), hats = {}; for (const k in HATS) hats[k] = new THREE.InstancedMesh(HATS[k], M(0xffffff), N);
  const cnt = { s: 0, t: 0, h: 0 }, hc = {}; for (const k in HATS) hc[k] = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), one = V3(1, 1, 1);
  for (const P of people) { q.setFromAxisAngle(UP, P.face); const sc = 0.92 + R() * 0.16, s = V3(sc, sc, sc), bm = P.seated ? body.s : body.t, k = P.seated ? "s" : "t"; m4.compose(P.p, q, s); bm.setMatrixAt(cnt[k], m4); bm.setColorAt(cnt[k], c.set(P.hat === "lady" ? [0x4a3a4a, 0x3a3a4a, 0x5a4a3a, 0x6a5a6a][R() * 4 | 0] : coat[R() * coat.length | 0])); cnt[k]++;
    const hy = (P.seated ? 0.78 : 1.6) * sc, hp = P.p.clone().add(V3(0, hy, 0)); m4.compose(hp, q, s); head.setMatrixAt(cnt.h, m4); head.setColorAt(cnt.h, c.setHSL(0.06, 0.4 + R() * 0.1, 0.42 + R() * 0.12)); cnt.h++;
    const hm = hats[P.hat], hcl = hatCol[P.hat]; m4.compose(hp.clone().add(V3(0, 0.05 * sc, 0)), q, s); hm.setMatrixAt(hc[P.hat], m4); hm.setColorAt(hc[P.hat], c.set(hcl[R() * hcl.length | 0])); hc[P.hat]++; P.i = cnt.h - 1; CROWD.list.push(P); }
  for (const [im, n] of [[body.s, cnt.s], [body.t, cnt.t], [head, cnt.h], ...Object.keys(HATS).map(k => [hats[k], hc[k]])]) { im.count = n; im.castShadow = false; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; CROWD.g.add(im); }
  CROWD.n = people.length + flatP.length; CROWD.g.traverse(o => { if (o.isInstancedMesh) cheerMat(o.material); }); scene.add(CROWD.g); DIAG.stage("running inside"); }
// the ropes, on low stakes, that held the standing crowd back
{ let prev = null; for (let d = -45; d <= 45; d += 3) { const p = dir(d * Math.PI / 180).multiplyScalar(ropeDist(d)); box(0.06, 1.0, 0.06, MAT.wood, p.x, 0.5, p.z); if (prev) { const a = prev.clone().setY(0.92), b = p.clone().setY(0.92), cv = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(V3(0, -0.12, 0)), b); scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 6, 0.012, 4), MAT.rope)); } prev = p; } }

DIAG.stage("dressing the players");
// ---------- the players and umpires ----------
// Boston at home in white, "BOSTON" arched in blue across the chest, red stockings; Pittsburgh in road grey with blue trim and blue stockings.
// Gloves were small then, the catcher's mitt a round pillow; catchers wore a wire mask and a chest protector; the umpires wore dark blue suits.
const TEAM = { BOS: { shirt: 0xf2f0e8, trim: 0x2a3a7a, sock: 0xb02a2a, cap: 0xf2f0e8, word: "BOSTON" }, PIT: { shirt: 0x9a9a96, trim: 0x22305a, sock: 0x22305a, cap: 0x22305a, word: "" }, UMP: { shirt: 0x1e2234, trim: 0x1e2234, sock: 0x1a1a1a, cap: 0x1e2234, word: "" } };
function chestTex(word, col) { return tex(256, 128, (g, w, h) => { g.fillStyle = "#" + new THREE.Color(col).getHexString(); g.fillRect(0, 0, w, h); if (!word) return; g.fillStyle = "#2a3a7a"; g.font = "bold 30px Georgia"; g.textAlign = "center"; const n = word.length; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.16; g.save(); g.translate(w / 2 + Math.sin(a) * 160, 104 - Math.cos(a) * 60); g.rotate(a); g.fillText(word[i], 0, 0); g.restore(); } }); }
const SKIN = M(0xd8a888, { roughness: 0.7 });
function makePerson(team, name, role) { const T = TEAM[team], G = new THREE.Group(), shirt = M(T.shirt, { roughness: 0.95 }), pant = M(T.shirt, { roughness: 0.95 }), sock = M(T.sock), shoe = M(0x161412, { roughness: 0.6 }), cap = M(T.cap), trim = M(T.trim), hair = M(0x3a2a1e), dark = M(0x1a1410);
  const part = (geo, mat, x, y, z, P = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !IS_HEADSET; P.add(m); return m; }, cap2 = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 10);
  const hips = new THREE.Group(); hips.position.y = 0.92; G.add(hips); const torso = new THREE.Group(); hips.add(torso);
  // the shirt: a loose flannel shirt with a turned collar and long sleeves, belted at the waist
  part(cap2(0.16, 0.3).scale(1.18, 1, 0.78), shirt, 0, 0.32, 0, torso); part(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16).scale(1.1, 1, 0.8), dark, 0, 0.03, 0, torso); part(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), trim, 0, 0.6, 0, torso);
  if (T.word) { const lt = part(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshStandardMaterial({ map: wordTex(T.word), transparent: true, roughness: 0.9 }), 0, 0.43, -0.128, torso); lt.rotation.y = Math.PI; }
  const neck = part(new THREE.CylinderGeometry(0.048, 0.052, 0.09, 10), SKIN, 0, 0.64, 0, torso);
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head); part(new THREE.SphereGeometry(0.1, 16, 12).scale(0.9, 1.1, 0.98), SKIN, 0, 0.06, 0, head);
  for (const sx of [-1, 1]) { part(new THREE.SphereGeometry(0.022, 8, 6).scale(0.6, 1, 1), SKIN, sx * 0.09, 0.05, 0.005, head); part(new THREE.SphereGeometry(0.011, 6, 5), dark, sx * 0.034, 0.075, -0.088, head); part(new THREE.BoxGeometry(0.03, 0.006, 0.01), hair, sx * 0.034, 0.095, -0.09, head); }
  part(new THREE.BoxGeometry(0.022, 0.04, 0.03), SKIN, 0, 0.05, -0.1, head); part(new THREE.SphereGeometry(0.098, 12, 8, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.45), hair, 0, 0.06, 0.012, head);
  if (team === "UMP") { part(new THREE.CylinderGeometry(0.1, 0.106, 0.07, 14), cap, 0, 0.15, 0, head); part(new THREE.BoxGeometry(0.15, 0.01, 0.07), cap, 0, 0.12, -0.11, head); }
  else { part(new THREE.SphereGeometry(0.106, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.72, 1.02), cap, 0, 0.115, 0, head); part(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 14, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.8), cap, 0, 0.12, -0.075, head); }
  // arms: upper arm and forearm the same length, so the hands can be placed by inverse kinematics; sleeves to the wrist
  const A = 0.27, limb = (P, x, y, len, r, mat, mat2) => { const j = new THREE.Group(); j.position.set(x, y, 0); P.add(j); part(cap2(r, len - r), mat, 0, -len / 2, 0, j); const j2 = new THREE.Group(); j2.position.y = -len; j.add(j2); part(cap2(r * 0.85, len - r), mat2 || mat, 0, -len / 2, 0, j2); return [j, j2]; };
  const [aL, eL] = limb(torso, -0.21, 0.53, A, 0.052, shirt), [aR, eR] = limb(torso, 0.21, 0.53, A, 0.052, shirt);
  // legs: baggy knickers bloused at the knee, then stockings and high shoes
  const [lL, kL] = limb(hips, -0.095, -0.02, 0.44, 0.085, pant, sock), [lR, kR] = limb(hips, 0.095, -0.02, 0.44, 0.085, pant, sock);
  for (const k of [kL, kR]) { part(new THREE.SphereGeometry(0.088, 10, 8).scale(1, 0.75, 1), pant, 0, -0.02, 0, k); k.children[0].scale.set(0.72, 1, 0.72); part(new THREE.BoxGeometry(0.095, 0.08, 0.26), shoe, 0, -0.46, -0.05, k); part(new THREE.BoxGeometry(0.1, 0.02, 0.27), dark, 0, -0.5, -0.05, k); }
  const handL = new THREE.Group(); handL.position.y = -A; eL.add(handL); const handR = new THREE.Group(); handR.position.y = -A; eR.add(handR);
  part(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1.2, 0.7), SKIN, 0, -0.02, 0, handR); if (team === "UMP" || role === "PH" || role === "staff" || role === "vendor") part(new THREE.SphereGeometry(0.04, 8, 6).scale(1, 1.2, 0.7), SKIN, 0, -0.02, 0, handL);
  if (role === "C") { part(new THREE.SphereGeometry(0.13, 14, 10).scale(1, 1, 0.5), M(0x6a4428), 0, -0.04, -0.02, handL); part(new THREE.BoxGeometry(0.32, 0.42, 0.05), M(0x4a3e30), 0, 0.3, -0.13, torso); part(new THREE.BoxGeometry(0.19, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, wireframe: true }), 0, 0.07, -0.1, head); }
  else if (role === "1B") part(new THREE.BoxGeometry(0.13, 0.17, 0.06), M(0x7a5434), 0, -0.05, -0.01, handL);
  else if (team !== "UMP" && role !== "PH" && role !== "staff" && role !== "vendor") part(new THREE.BoxGeometry(0.1, 0.13, 0.05), M(0x8a6a44), 0, -0.04, -0.01, handL);
  if (team === "UMP" && role !== "staff" && role !== "vendor") part(new THREE.BoxGeometry(0.36, 0.2, 0.26), shirt, 0, -0.06, 0, torso);
  G.userData = { name, team, role }; scene.add(G); const P = { G, hips, torso, head, aL, eL, aR, eR, lL, kL, lR, kR, handL, handR, name, team, role, armA: A, armB: A };
  setPose(P, "ready"); return P; }
function wordTex(word) { return tex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#2a3a7a"; g.font = "bold 34px Georgia"; g.textAlign = "center"; const n = word.length; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.13; g.save(); g.translate(w / 2 + Math.sin(a) * 200, 230 - Math.cos(a) * 190); g.rotate(a); g.fillText(word[i], 0, 0); g.restore(); } }); }
// placing a hand exactly: two-bone inverse kinematics for an arm, with the elbow bending toward the pole direction
const _DOWN = V3(0, -1, 0);
function armIK(P, side, target, pole) { const sh = side === "L" ? P.aL : P.aR, el = side === "L" ? P.eL : P.eR, a = P.armA, b = P.armB; P.G.updateMatrixWorld(true);
  const tl = P.torso.worldToLocal(target.clone()), s0 = sh.position.clone(), d = tl.sub(s0); let dist = clampN(d.length(), 0.08, a + b - 0.003); d.normalize();
  const A2 = Math.acos(clampN((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1)), pl = (pole || V3(side === "L" ? -0.6 : 0.6, -1, 0.3)).clone(), n = pl.sub(d.clone().multiplyScalar(pl.dot(d))).normalize();
  const u = d.clone().multiplyScalar(Math.cos(A2)).add(n.multiplyScalar(Math.sin(A2))); sh.quaternion.setFromUnitVectors(_DOWN, u);
  const elbow = s0.clone().addScaledVector(u, a), f = s0.clone().addScaledVector(d, dist).sub(elbow).normalize(); el.quaternion.setFromUnitVectors(_DOWN, f.applyQuaternion(sh.quaternion.clone().invert())); }
function setPose(P, pose) { const z = (j, x, y = 0, zz = 0) => j.rotation.set(x, y, zz); z(P.torso, 0); z(P.aL, 0.1, 0, 0.15); z(P.aR, 0.1, 0, -0.15); z(P.eL, -0.2); z(P.eR, -0.2); z(P.lL, 0); z(P.lR, 0); z(P.kL, 0); z(P.kR, 0); P.hips.position.y = 0.95;
  if (pose === "ready") { z(P.torso, -0.35); P.hips.position.y = 0.86; z(P.lL, -0.35, 0, 0.12); z(P.lR, -0.35, 0, -0.12); z(P.kL, 0.55); z(P.kR, 0.55); z(P.aL, -0.6, 0, 0.2); z(P.aR, -0.6, 0, -0.2); z(P.eL, -0.6); z(P.eR, -0.6); }
  if (pose === "crouch") { P.hips.position.y = 0.5; z(P.torso, -0.25); z(P.lL, -1.5, 0, 0.3); z(P.lR, -1.5, 0, -0.3); z(P.kL, 2.0); z(P.kR, 2.0); z(P.aL, -1.2, 0, 0.3); z(P.eL, -0.3); }
  if (pose === "bat") { z(P.torso, -0.15, 0.5); z(P.lL, -0.15, 0, 0.18); z(P.lR, 0.1, 0, -0.18); z(P.kL, 0.25); z(P.kR, 0.2); z(P.aL, -1.2, 0.6, 0.5); z(P.aR, -1.3, -0.4, -0.2); z(P.eL, -1.0); z(P.eR, -1.1); }
  if (pose === "sit") { P.hips.position.y = 0.48; z(P.lL, -1.55); z(P.lR, -1.55); z(P.kL, 1.55); z(P.kR, 1.55); z(P.aL, -0.4, 0, 0.1); z(P.aR, -0.4, 0, -0.1); z(P.eL, -0.9); z(P.eR, -0.9); }
  if (pose === "relax") { z(P.torso, -0.42); P.hips.position.y = 0.86; z(P.lL, -0.3, 0, 0.1); z(P.lR, -0.3, 0, -0.1); z(P.kL, 0.45); z(P.kR, 0.45); z(P.aL, -0.75, 0, 0.12); z(P.aR, -0.75, 0, -0.12); z(P.eL, -0.25); z(P.eR, -0.25); }
  if (pose === "stand") { z(P.aL, 0.05, 0, 0.12); z(P.aR, 0.05, 0, -0.12); } }
// the bat, a heavy ash bat of the time (they were thicker-handled than today's)
const BATG = new THREE.CylinderGeometry(0.033, 0.016, 0.86, 10).translate(0, 0.43, 0), BATM = M(0xc8a878, { roughness: 0.5 });
// the lineups (the official record)
const LINEUP = { PIT: [["Ginger Beaumont", "CF"], ["Fred Clarke", "LF"], ["Tommy Leach", "3B"], ["Honus Wagner", "SS"], ["Kitty Bransfield", "1B"], ["Claude Ritchey", "2B"], ["Jimmy Sebring", "RF"], ["Ed Phelps", "C"], ["Deacon Phillippe", "P"]],
  BOS: [["Patsy Dougherty", "LF"], ["Jimmy Collins", "3B"], ["Chick Stahl", "CF"], ["Buck Freeman", "RF"], ["Freddy Parent", "SS"], ["Candy LaChance", "1B"], ["Hobe Ferris", "2B"], ["Lou Criger", "C"], ["Cy Young", "P"]] };
const BIO = { "Cy Young": "Boston's pitcher, 36, already the winningest pitcher in baseball (28 wins this season; he'll finish his career with 511, still the record).", "Lou Criger": "Boston's catcher, Cy Young's favourite.", "Candy LaChance": "Boston's first baseman.", "Hobe Ferris": "Boston's second baseman.",
  "Jimmy Collins": "Boston's third baseman and manager, the best fielding third baseman of his day.", "Freddy Parent": "Boston's shortstop.", "Patsy Dougherty": "Boston's left fielder and leadoff man.", "Chick Stahl": "Boston's centre fielder.", "Buck Freeman": "Boston's right fielder, the American League's home-run leader this year with 13.",
  "Ginger Beaumont": "Pittsburgh's centre fielder and leadoff man, the National League's leader in hits this year (209).", "Fred Clarke": "Pittsburgh's left fielder and manager.", "Tommy Leach": "Pittsburgh's third baseman, small and fast.", "Honus Wagner": "Pittsburgh's shortstop, the National League batting champion this year (.355), already called the best player in the game.",
  "Kitty Bransfield": "Pittsburgh's first baseman.", "Claude Ritchey": "Pittsburgh's second baseman.", "Jimmy Sebring": "Pittsburgh's right fielder.", "Ed Phelps": "Pittsburgh's catcher.", "Deacon Phillippe": "Pittsburgh's pitcher, 25 wins this season.",
  "Jack O'Brien": "A Boston substitute; he will pinch-hit in the ninth.", "Duke Farrell": "Boston's veteran substitute catcher; he will pinch-hit in the ninth.", "Tommy Connolly": "The American League umpire, working behind the plate (two umpires for the whole game: one behind the plate, one on the bases).", "Hank O'Day": "The National League umpire, working the bases." };
const FIELDPOS = { P: PM.clone().add(V3(0, 0.3, 0)), C: V3(0, 0, 0.9), "1B": B1.clone().add(dir(D45 + 0.25).multiplyScalar(3)).add(V3(0, 0, -2)), "2B": B2.clone().add(V3(4, 0, 4)), SS: B2.clone().add(V3(-5, 0, 5)), "3B": B3.clone().add(V3(1.5, 0, -1.5)), LF: dir(-0.45).multiplyScalar(76), CF: dir(0).multiplyScalar(90), RF: dir(0.45).multiplyScalar(70) };
const PEOPLE = {};
function buildPlayers() { if (PEOPLE.built) return; Object.defineProperty(PEOPLE, "built", { value: true, enumerable: false }); const face = (P, x, z, tx, tz) => { P.G.position.set(x, floorAt(x, z), z); P.G.rotation.y = Math.atan2(-(tx - x), -(tz - z)); };
  for (const [name, pos] of LINEUP.BOS) { const P = makePerson("BOS", name, pos); PEOPLE[name] = P; const p = FIELDPOS[pos]; face(P, p.x, p.z, 0, 0); if (pos === "C") { setPose(P, "crouch"); face(P, 0, 0.9, 0, -10); } if (pos === "P") setPose(P, "stand"); }
  LINEUP.PIT.forEach(([name, pos], i) => { const P = makePerson("PIT", name, pos); PEOPLE[name] = P; if (i === 0) { P.G.position.set(0.9, 0, 0.1); P.G.rotation.y = Math.PI / 2; setPose(P, "bat"); const bat = new THREE.Mesh(BATG, BATM); bat.rotation.x = -2.2; P.handR.add(bat); }
    else { const b = BENCH.PIT, off = WA.clone().multiplyScalar(-3.5 + i * 0.85); P.G.position.copy(b).add(off).add(UA.clone().multiplyScalar(-0.1)); P.G.rotation.y = ROT_U; setPose(P, "sit"); } });
  for (const name of ["Jack O'Brien", "Duke Farrell"]) { const P = makePerson("BOS", name, "PH"); PEOPLE[name] = P; setPose(P, "sit"); }
  for (const [name, pos] of [["Tommy Connolly", "UMP_HP"], ["Hank O'Day", "UMP_B"]]) { const P = makePerson("UMP", name, pos); PEOPLE[name] = P; if (pos === "UMP_HP") { P.G.position.set(0.3, 0, 1.8); P.G.rotation.y = 0; setPose(P, "ready"); } else { const p = B1.clone().add(V3(3, 0, 3)); P.G.position.copy(p); P.G.rotation.y = Math.atan2(p.x, p.z); setPose(P, "ready"); } } }
DIAG.stage("building the streets");

// ---------- the neighbourhood, as the 1903 photographs show it: brick row houses on Rogers Street, the huge Boston Storage Warehouse across
// Huntington Avenue beyond left field (the famous bird's-eye photo of the park was taken from its roof), the railroad yards and a roundhouse
// beyond the first-base side, the South End Grounds across the tracks, and stables and works beyond right field ----------
// Facades are drawn bay by bay: brick in running bond, two-over-two sash windows with stone lintels and sills; a stone base course and a
// projecting cornice are separate pieces, so the windows keep their real size on every building.
function facadeTex(brick, kind) { return tex(128, 128, (g, w, h) => { const r = mulberry(brick.length * 7 + kind.length); g.fillStyle = "#8a8070"; g.fillRect(0, 0, w, h); const bc = new THREE.Color(brick);
    for (let y = 0; y < h; y += 4) for (let x = (y / 4) % 2 * 5; x < w + 10; x += 10) { const c = bc.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08); g.fillStyle = "#" + c.getHexString(); g.fillRect(x - 5, y, 9, 3); }
    if (kind === "plain") return;
    if (kind === "clap") { g.fillStyle = "#c8c0b0"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y + 6, w, 2); } }
    const ww = kind === "store" ? 84 : kind === "ware" ? 40 : kind === "clap" ? 34 : 44, wh = kind === "store" ? 76 : kind === "ware" ? 56 : 64, x0 = (w - ww) / 2, y0 = kind === "store" ? 24 : 30;
    if (kind === "ware") { g.fillStyle = "#c8b8a0"; g.beginPath(); g.arc(w / 2, y0 + 4, ww / 2 + 5, Math.PI, 0); g.fill(); g.fillStyle = "#1e2228"; g.beginPath(); g.arc(w / 2, y0 + 4, ww / 2, Math.PI, 0); g.fill(); }
    else { g.fillStyle = kind === "clap" ? "#f0ece0" : "#d0c4ac"; g.fillRect(x0 - 5, y0 - 9, ww + 10, 8); }
    g.fillStyle = kind === "clap" ? "#f0ece0" : "#d8ccb4"; g.fillRect(x0 - 4, y0 + wh, ww + 8, 6); g.fillStyle = "#e8e0cc"; g.fillRect(x0, y0, ww, wh);
    const gl = g.createLinearGradient(0, y0, 0, y0 + wh); gl.addColorStop(0, "#5a6a78"); gl.addColorStop(0.5, "#262c34"); gl.addColorStop(1, "#1a1e24"); g.fillStyle = gl; const f = 3; g.fillRect(x0 + f, y0 + f, ww - 2 * f, wh / 2 - f * 1.5); g.fillRect(x0 + f, y0 + wh / 2 + f / 2, ww - 2 * f, wh / 2 - f * 1.5);
    g.fillStyle = "#e8e0cc"; g.fillRect(w / 2 - 1.5, y0, 3, wh); if (kind === "store") { g.fillStyle = "#3a2a1e"; g.fillRect(0, 0, w, 18); } }); }
const FACADE = {}, facadeMat = (brick, kind) => { const k = brick + kind; if (!FACADE[k]) { const t = facadeTex(brick, kind); FACADE[k] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }); } return FACADE[k]; };
const STONE = M(0xb8ae98), CORNICE = M(0x4a443c), ROOFM = M(0x3a3632), TAR = M(0x2a2a2a);
// a building: lu along the u axis, lw along w, h tall; bayW and floorH set how big each window bay is
function bldg(u0, w0, u1, w1, h, brick = "#8a4a34", kind = "row", o = {}) { const lu = Math.abs(u1 - u0), lw = Math.abs(w1 - w0), c = P2((u0 + u1) / 2, (w0 + w1) / 2), ry = -Math.atan2(UA.z, UA.x), bay = o.bay || 3.2, fl = o.floor || 3.6;
  const g = new THREE.BoxGeometry(lu, h, lw), uv = g.attributes.uv; const faceDims = [[lw, h], [lw, h], [lu, lw], [lu, lw], [lu, h], [lu, h]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(faceDims[f][0] / bay)), uv.getY(i) * Math.max(1, Math.round(faceDims[f][1] / fl))); }
  const m = new THREE.Mesh(g, facadeMat(brick, kind)); m.position.set(c.x, h / 2, c.z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; scene.add(m);
  const cap = box(lu + 0.6, 0.55, lw + 0.6, CORNICE, c.x, h + 0.2, c.z, ry); const roof = box(lu, 0.1, lw, TAR, c.x, h + 0.05, c.z, ry); const base = box(lu + 0.12, 0.9, lw + 0.12, STONE, c.x, 0.45, c.z, ry);
  if (o.chimneys) { const r = mulberry(Math.round(u0 * 13 + w0)); for (let k = 0; k < o.chimneys; k++) { const p = P2(u0 + (k + 0.5) * lu / o.chimneys, w0 + (r() - 0.5) * lw * 0.5); box(0.7, 1.6, 0.9, facadeMat(brick, "plain"), p.x, h + 0.8, p.z, ry); } }
  return m; }
function shed(u0, w0, u1, w1, h, ridgeAlongU = true) { const lu = Math.abs(u1 - u0), lw = Math.abs(w1 - w0), c = P2((u0 + u1) / 2, (w0 + w1) / 2), ry = -Math.atan2(UA.z, UA.x); const m = new THREE.Mesh(new THREE.BoxGeometry(lu, h, lw), facadeMat("#8a6a4a", "clap")); m.position.set(c.x, h / 2, c.z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; scene.add(m);
  const span = ridgeAlongU ? lw : lu, len = ridgeAlongU ? lu : lw, sh = new THREE.Shape([new THREE.Vector2(-span / 2 - 0.3, 0), new THREE.Vector2(span / 2 + 0.3, 0), new THREE.Vector2(0, span * 0.35)]), rf = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: len + 0.4, bevelEnabled: false }).translate(0, 0, -(len + 0.4) / 2), ROOFM);
  rf.position.set(c.x, h, c.z); rf.rotation.y = ry + (ridgeAlongU ? Math.PI / 2 : 0); rf.castShadow = true; scene.add(rf); }
{ const r = mulberry(21), BR = ["#8a4a34", "#7a3e2e", "#94563c", "#6e4434", "#9a6a4a"];
  // Rogers Street: three- and four-storey brick row houses with shops below, on the far side of the street
  for (let u = -70; u < 210;) { const w = 6 + r() * 3, n = 2 + (r() * 3 | 0), b = BR[r() * BR.length | 0], h = (3 + (r() * 2 | 0)) * 3.5 + 0.6; bldg(u, -53, u + w * n, -66, h, b, "row", { bay: w / 2, floor: 3.5, chimneys: n }); u += w * n + (r() < 0.2 ? 4 : 0.2); }
  // the Boston Storage Warehouse: eight storeys of brick with arched windows, across Huntington Avenue
  bldg(150, -20, 182, 92, 32, "#7a4434", "ware", { bay: 3.4, floor: 4.0 });
  for (let w = 96; w < 210;) { const L = 12 + r() * 10; bldg(150, w, 168, w + L, 10 + (r() * 3 | 0) * 3.6, BR[r() * BR.length | 0], r() < 0.5 ? "store" : "row", { bay: 3.4, floor: 3.6, chimneys: 2 }); w += L + 0.3; }
  for (let w = -84; w < -24;) { const L = 13 + r() * 6; bldg(150, w, 168, w + L, 11 + (r() * 2 | 0) * 3.6, BR[r() * BR.length | 0], "store", { bay: 3.4, floor: 3.6, chimneys: 2 }); w += L + 0.3; }
  // the trolley tracks down the middle of Huntington Avenue, a pair of electric cars, and the wooden poles for the overhead wire
  for (const o of [-0.75, 0.75, 2.45, 3.95]) { const a = P2(137 + o, -200), b = P2(137 + o, 300), L = a.distanceTo(b), m = box(L, 0.04, 0.07, MAT.iron, (a.x + b.x) / 2, 0.02, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); }
  for (let w = -150; w < 280; w += 30) { const p = P2(132.5, w); box(0.25, 7.5, 0.25, MAT.wood, p.x, 3.75, p.z); }
  for (const [w, k] of [[10, 0], [140, 1]]) { const c = P2(137 + k * 3.2, w), car = new THREE.Group(); car.position.set(c.x, 0, c.z); car.rotation.y = -Math.atan2(WA.z, WA.x); scene.add(car);
    box(10, 2.4, 2.4, M(0x6a4a24), 0, 1.6, 0, 0, car); box(10.4, 0.3, 2.6, M(0x3a3028), 0, 3.0, 0, 0, car); box(9.6, 0.9, 2.42, M(0xd8c8a0), 0, 2.2, 0, 0, car); const pole = box(0.05, 3, 0.05, MAT.iron, 2, 4.4, 0, 0, car); pole.rotation.z = 0.6; }
  // the railroad yards behind the first-base side: tracks, freight cars
  for (let k = 0; k < 7; k++) { const u = -46 - k * 4.5; for (const o of [-0.72, 0.72]) { const a = P2(u + o, -200), b = P2(u + o, 300), L = a.distanceTo(b), m = box(L, 0.12, 0.08, MAT.iron, (a.x + b.x) / 2, 0.1, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); }
    for (let w = -120 + r() * 30; w < 260; w += 12 + r() * 30) { if (r() < 0.45) continue; const c = P2(u, w), fc = box(11, 3.2, 2.8, M([0x6a3424, 0x5a3020, 0x4a3a30, 0x7a4a2a][r() * 4 | 0]), c.x, 1.9, c.z); fc.rotation.y = -Math.atan2(WA.z, WA.x); } }
  // the roundhouse: a fan of brick engine stalls round a turntable, with a smoke jack over each stall
  { const C = P2(-112, 95), R0 = 14, R1 = 34; for (let k = 0; k < 13; k++) { const a = Math.PI * 0.15 + k * Math.PI * 0.7 / 12, mid = (R0 + R1) / 2, p = V3(C.x + Math.cos(a) * mid, 0, C.z + Math.sin(a) * mid), st = box(R1 - R0, 7, 6.2, facadeMat("#5e3a2e", "plain"), p.x, 3.5, p.z, -a); box(R1 - R0 + 0.6, 0.4, 6.6, ROOFM, p.x, 7.2, p.z, -a);
      const j = V3(C.x + Math.cos(a) * (R0 + 6), 0, C.z + Math.sin(a) * (R0 + 6)); box(0.8, 2.2, 0.8, M(0x2a2a2a), j.x, 8.4, j.z, -a); }
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(R0 - 2, R0 - 2, 0.3, 32), M(0x4a4440)); tt.position.set(C.x, 0.05, C.z); scene.add(tt); }
  // the South End Grounds across the tracks: the Beaneaters' covered grandstand
  { const c = P2(-128, 10), g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = -Math.atan2(WA.z, WA.x); scene.add(g); box(70, 10, 16, MAT.board, 0, 5, 0, 0, g); box(72, 0.4, 19, MAT.roof, 0, 11.6, -1, 0, g); for (let i = -6; i <= 6; i++) box(0.3, 2.2, 0.3, MAT.col, i * 5.5, 10.9, 8, 0, g); box(60, 1.2, 0.2, MAT.paint, 0, 10.4, 8.1, 0, g); }
  // beyond right field: livery stables and sheds in wood, and brick works
  for (let u = -30; u < 140;) { const L = 14 + r() * 10; if (r() < 0.5) shed(u, 128, u + L, 142, 4.5 + r() * 2); else bldg(u, 128, u + L, 146, 8 + (r() * 2 | 0) * 4, BR[r() * BR.length | 0], "row", { bay: 4, floor: 4, chimneys: 1 }); u += L + 1.5; }
  // telegraph poles along Rogers Street, with crossarms
  for (let u = -60; u < 200; u += 30) { const c = P2(u, -51.5); box(0.22, 10, 0.22, MAT.wood, c.x, 5, c.z); const arm = box(2.2, 0.12, 0.12, MAT.wood, c.x, 9.3, c.z); arm.rotation.y = ROT_U; } }
// the rest of the city out to the horizon: Back Bay, the South End and Roxbury as plain blocks of brick, three to six storeys
{ const r = mulberry(77), BR = ["#8a4a34", "#7a3e2e", "#94563c", "#6e4434", "#9a6a4a"]; for (let u = -420; u <= 520; u += 34) for (let w = -420; w <= 520; w += 34) { const inPark = u > -100 && u < 200 && w > -90 && w < 175, rail = u > -95 && u < -40, round = Math.hypot(u + 112, w - 95) < 45; if (inPark || rail || round || r() < 0.15) continue;
    const h = (3 + (r() * 4 | 0)) * 3.6, uu = u + (r() - 0.5) * 4, ww = w + (r() - 0.5) * 4; bldg(uu, ww, uu + 22 + r() * 8, ww + 22 + r() * 8, h, BR[r() * BR.length | 0], "row", { bay: 3.3, floor: 3.6, chimneys: r() < 0.5 ? 2 : 0 }); } }

// ---------- the game, play by play, from the official record ----------
// The information used here was obtained free of charge from and is copyrighted by Retrosheet (www.retrosheet.org).
// Each play: who (the batter, or the runner for a steal), what happened, where, and where everyone ended up: B is the batter, 1-3 the runners
// on those bases, H home (a run), x out. The words are Retrosheet's. The record doesn't give the pitches, so the balls and strikes before each
// result are made up to fit it (fouls count as strikes, the rule both leagues used in 1903).
const NAMES = { Beaumont: "Ginger Beaumont", Clarke: "Fred Clarke", Leach: "Tommy Leach", Wagner: "Honus Wagner", Bransfield: "Kitty Bransfield", Ritchey: "Claude Ritchey", Sebring: "Jimmy Sebring", Phelps: "Ed Phelps", Phillippe: "Deacon Phillippe",
  Dougherty: "Patsy Dougherty", Collins: "Jimmy Collins", Stahl: "Chick Stahl", Freeman: "Buck Freeman", Parent: "Freddy Parent", LaChance: "Candy LaChance", Ferris: "Hobe Ferris", Criger: "Lou Criger", Young: "Cy Young", "O'Brien": "Jack O'Brien", Farrell: "Duke Farrell" };
const LEFTY = new Set(["Beaumont", "Clarke", "Bransfield", "Sebring", "Dougherty", "Stahl", "Freeman"]);
const ev = (b, k, loc, mv, text) => ({ b, k, loc, mv, text });
const HALVES = [
  [ev("Beaumont", "F", 8, "Bx", "Beaumont flied out to center."), ev("Clarke", "Pf", 2, "Bx", "Clarke popped to the catcher in foul territory."), ev("Leach", "Tgr", 9, "B3", "Leach tripled: a ground-rule triple into the overflow crowd."),
    ev("Wagner", "S", 7, "B1 3H", "Wagner singled to left; Leach scored, the first run in World Series history."), ev("Wagner", "SB", 0, "1-2", "Wagner stole second."), ev("Bransfield", "E", 4, "B1 2-3", "Bransfield reached on an error by Ferris; Wagner to third."),
    ev("Bransfield", "SBE", 0, "1-3 3H", "Bransfield stole second; Criger's throw got away, Wagner scored and Bransfield went to third."), ev("Ritchey", "BB", 0, "B1", "Ritchey walked."), ev("Ritchey", "SB", 0, "1-2", "Ritchey stole second."),
    ev("Sebring", "S", 7, "B1 3H 2H", "Sebring singled to left; Bransfield and Ritchey scored."), ev("Phelps", "KE", 0, "B1 1-3", "Phelps struck out, but Criger let the third strike get away and Phelps reached first; Sebring to third."), ev("Phillippe", "K", 0, "Bx", "Phillippe struck out.")],
  [ev("Dougherty", "K", 0, "Bx", "Dougherty struck out."), ev("Collins", "K", 0, "Bx", "Collins struck out."), ev("Stahl", "S", 7, "B1", "Stahl singled to left."), ev("Freeman", "F", 9, "Bx", "Freeman flied out to right.")],
  [ev("Beaumont", "K", 0, "Bx", "Beaumont struck out."), ev("Clarke", "SX", 7, "Bx", "Clarke singled to left, but was thrown out trying for second (left fielder to second baseman)."), ev("Leach", "F", 7, "Bx", "Leach flied out to left.")],
  [ev("Parent", "K", 0, "Bx", "Parent struck out."), ev("LaChance", "K", 0, "Bx", "LaChance struck out."), ev("Ferris", "K", 0, "Bx", "Ferris struck out.")],
  [ev("Wagner", "P", 5, "Bx", "Wagner popped to third."), ev("Bransfield", "Tgr", 9, "B3", "Bransfield tripled to right: a ground-rule triple into the overflow crowd."), ev("Ritchey", "K", 0, "Bx", "Ritchey struck out."),
    ev("Sebring", "S", 9, "B1 3H", "Sebring singled to right; Bransfield scored."), ev("Phelps", "G", "1-3", "Bx", "Phelps grounded out, pitcher to first.")],
  [ev("Criger", "G", "5-3", "Bx", "Criger grounded out, third to first."), ev("Young", "G", "4-3", "Bx", "Young grounded out, second to first."), ev("Dougherty", "F", 8, "Bx", "Dougherty flied out to center.")],
  [ev("Phillippe", "P", 6, "Bx", "Phillippe popped to shortstop."), ev("Beaumont", "E", 4, "B1", "Beaumont reached on an error by Ferris."), ev("Clarke", "S", 7, "B1 1-2", "Clarke singled to left; Beaumont to second."), ev("Leach", "S", 8, "B1 2H 1-2", "Leach singled to center; Beaumont scored, Clarke to second."),
    ev("Wagner", "P", 6, "Bx", "Wagner popped to shortstop."), ev("Bransfield", "FC", "4-6", "B1 1x", "Bransfield forced Leach at second, second baseman to shortstop.")],
  [ev("Collins", "F", 7, "Bx", "Collins flied out to left."), ev("Stahl", "F", 8, "Bx", "Stahl flied out to center."), ev("Freeman", "S", 3, "B1", "Freeman singled to first."), ev("Parent", "E", 5, "B1 1-3", "Parent reached on an error by Leach; Freeman to third."), ev("LaChance", "G", "1-3", "Bx", "LaChance grounded out, pitcher to first.")],
  [ev("Ritchey", "G", "5-3", "Bx", "Ritchey grounded out, third to first."), ev("Sebring", "G", "5-3", "Bx", "Sebring grounded out, third to first."), ev("Phelps", "S", 9, "B1", "Phelps singled to right."), ev("Phillippe", "P", 4, "Bx", "Phillippe popped to second.")],
  [ev("Ferris", "K", 0, "Bx", "Ferris struck out."), ev("Criger", "G", "6-3", "Bx", "Criger grounded out, shortstop to first."), ev("Young", "F", 7, "Bx", "Young flied out to left.")],
  [ev("Beaumont", "Pf", 5, "Bx", "Beaumont popped to third in foul territory."), ev("Clarke", "K", 0, "Bx", "Clarke struck out."), ev("Leach", "S", 5, "B1", "Leach singled to third."), ev("Wagner", "BB", 0, "B1 1-2", "Wagner walked; Leach to second."), ev("Bransfield", "FC", "4-6", "B1 1x", "Bransfield forced Wagner at second, second baseman to shortstop.")],
  [ev("Dougherty", "P", 4, "Bx", "Dougherty popped to second."), ev("Collins", "G", "4-3", "Bx", "Collins grounded out, second to first."), ev("Stahl", "Kc", 0, "Bx", "Stahl was called out on strikes.")],
  [ev("Ritchey", "G", "6-3", "Bx", "Ritchey grounded out, shortstop to first."), ev("Sebring", "HRi", 8, "BH", "Sebring hit an inside-the-park home run to center: the first home run in World Series history."), ev("Phelps", "F", 9, "Bx", "Phelps flied out to right."), ev("Phillippe", "G", "6-3", "Bx", "Phillippe grounded out, shortstop to first.")],
  [ev("Freeman", "T", 9, "B3", "Freeman tripled to right."), ev("Parent", "Tgr", 7, "B3 3H", "Parent tripled to left, a ground-rule triple into the overflow crowd; Freeman scored."), ev("LaChance", "F", 7, "Bx 3H", "LaChance flied to left; Parent scored after the catch."),
    ev("Ferris", "HBP", 0, "B1", "Ferris was hit by a pitch."), ev("Criger", "K", 0, "Bx", "Criger struck out."), ev("Young", "K", 0, "Bx", "Young struck out.")],
  [ev("Beaumont", "G", "6-3", "Bx", "Beaumont grounded out, shortstop to first."), ev("Clarke", "F", 9, "Bx", "Clarke flied out to right."), ev("Leach", "T", 9, "B3", "Leach tripled to right."), ev("Wagner", "BB", 0, "B1", "Wagner walked."),
    ev("Leach", "CS", "2-4-2", "3x", "Leach was caught stealing home: catcher to second baseman and back to the catcher.")],
  [ev("Dougherty", "P", 6, "Bx", "Dougherty popped to shortstop."), ev("Collins", "G", "6-3", "Bx", "Collins grounded out, shortstop to first."), ev("Stahl", "F", 8, "Bx", "Stahl flied out to center.")],
  [ev("Bransfield", "F", 8, "Bx", "Bransfield flied out to center."), ev("Ritchey", "G", "5-3", "Bx", "Ritchey grounded out, third to first."), ev("Sebring", "G", "4-3", "Bx", "Sebring grounded out, second to first.")],
  [ev("Freeman", "E", 6, "B1", "Freeman reached on an error by Wagner."), ev("Parent", "S", 7, "B1 1-2", "Parent singled to left; Freeman to second."), ev("LaChance", "F", 7, "Bx 2-3", "LaChance flied to left; Freeman to third."), ev("Ferris", "S", 8, "B1 3H 1-2", "Ferris singled to center; Freeman scored, Parent to second."),
    ev("O'Brien", "K", 0, "Bx", "O'Brien, batting for Criger, struck out."), ev("Farrell", "G", "1-3", "Bx", "Farrell, batting for Young, grounded out, pitcher to first. Pittsburgh wins, 7 to 3.")]];
const EVENTS = []; HALVES.forEach((h, hi) => h.forEach((e, k) => EVENTS.push({ ...e, half: hi, last: k === h.length - 1, i: EVENTS.length })));
const HALF_NAME = hi => `${hi % 2 ? "Bottom" : "Top"} of the ${["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"][hi >> 1]}`;

// ---------- playing the game: everyone moves, the ball flies, the record decides what happens ----------
// Speeds are period-plausible: runners about 7.3 m/s, fielders 6-7 m/s, a pitch about 34 m/s (76 mph), a throw about 30 m/s.
// "Real time" keeps the game's real pace (it took 1 hour 55 minutes); "brisk" cuts the waits between pitches and batters.
const PACE = { real: { gap: 16, between: 24, change: 90 }, brisk: { gap: 3.2, between: 3, change: 6 } }; let paceKey = "real";
const POSN = { P: 1, C: 2, "1B": 3, "2B": 4, "3B": 5, SS: 6, LF: 7, CF: 8, RF: 9 }, NPOS = Object.fromEntries(Object.entries(POSN).map(([k, v]) => [v, k]));
const BP = k => k === 0 || k === 4 ? V3(0, 0, 0) : [null, B1, B2, B3][k], BATTERS_BOX = lefty => V3(lefty ? 0.95 : -0.95, 0, 0.05);
const BALL = new THREE.Mesh(new THREE.SphereGeometry(0.037, 12, 10), M(0xf4f0e4, { roughness: 0.6, emissive: 0x555550 }));
// a faint trail behind the ball in flight, so your eye can follow it (a real ball is very small at 50 m)
const TRAIL = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }), 14); TRAIL.frustumCulled = false; TRAIL.count = 0; scene.add(TRAIL); const TRAILP = []; BALL.castShadow = true; scene.add(BALL); BALL.visible = false;
// the bat is held in both hands and swung on a real arc: three key positions (the stance, the moment of contact out in front of the plate,
// the follow-through), with the hands placed on the handle by inverse kinematics. The sweet spot passes through the contact point.
const BATKEY = s => [[V3(-s * 0.12, 1.32, -0.12), V3(-s * 0.25, 0.95, 0.3).normalize()], [V3(s * 0.02, 1.0, -0.32), V3(s * 0.38, 0.92, -0.92).sub(V3(s * 0.02, 1.0, -0.32)).normalize()], [V3(s * 0.18, 1.25, -0.1), V3(-s * 0.15, 0.55, 0.85).normalize()]];
const C_LOCAL = s => V3(s * 0.38, 0.92, -0.92);
function dropBat(P) { if (P.bat) { P.G.remove(P.bat); P.bat = null; } }
function batFrame(P) { const s = LEFTY.has(P.short) ? 1 : -1, K = BATKEY(s); let H, D, tw; const sw = P.act && P.act.n === "swing" ? clampN((GAME.T - P.act.t0) / P.act.d, 0, 1) : (P.swungAt !== undefined && GAME.T - P.swungAt < 1.2 ? 1 : -1);
  if (sw < 0) { const wg = Math.sin(GAME.T * 2.2) * 0.05; H = K[0][0].clone(); D = K[0][1].clone().add(V3(0, 0, wg)).normalize(); tw = 0.4 * s; }
  else if (sw < 0.4) { const t = (sw / 0.4) ** 2; H = K[0][0].clone().lerp(K[1][0], t); D = K[0][1].clone().lerp(K[1][1], t).normalize(); tw = lerpN(0.4 * s, -0.2 * s, t); }
  else { const t = Math.min(1, (sw - 0.4) / 0.6); H = K[1][0].clone().lerp(K[2][0], t); D = K[1][1].clone().lerp(K[2][1], t).normalize(); tw = lerpN(-0.2 * s, -0.95 * s, t); }
  P.torso.rotation.y = tw; P.bat.position.copy(H); P.bat.quaternion.setFromUnitVectors(UP, D); const bottom = P.G.localToWorld(H.clone().addScaledVector(D, 0.03)), top = P.G.localToWorld(H.clone().addScaledVector(D, 0.12));
  armIK(P, s < 0 ? "L" : "R", bottom, V3(s < 0 ? -0.4 : 0.4, -1, 0.3)); armIK(P, s < 0 ? "R" : "L", top, V3(s < 0 ? 0.4 : -0.4, -1, 0.3)); }
const GAME = { on: false, ei: 0, T: 0, cues: [], st: null, phase: "pre", paused: false, ball: { mode: "hide" }, cheer: 0, last: "", batter: null, balls: 0, strikes: 0 };
const cue = (t, fn) => GAME.cues.push({ t, fn });
const team = hi => hi % 2 ? "BOS" : "PIT", other = t => t === "PIT" ? "BOS" : "PIT", P_ = n => PEOPLE[NAMES[n] || n];
function fielder(n, hi = GAME.st.half) { const t = other(team(hi)); const e = LINEUP[t].find(([, p]) => POSN[p] === n); return PEOPLE[e[0]]; }
function slotOf(tm, short) { if (short === "O'Brien") return 7; if (short === "Farrell") return 8; return LINEUP[tm].findIndex(([n]) => n === NAMES[short]); }
function benchSpot(tm, k) { const b = BENCH[tm], along = tm === "PIT" ? WA : UA, back = tm === "PIT" ? UA : WA; return b.clone().addScaledVector(along, -3.6 + k * 0.72).addScaledVector(back, -0.1); }
const benchFace = tm => tm === "PIT" ? ROT_U : ROT_W;

// ---------- the game's state: bases, outs, runs, whose turn ----------
function freshState() { return { half: 0, bases: [null, null, null, null], outs: 0, score: { PIT: 0, BOS: 0 }, line: [[], []], order: { PIT: 0, BOS: 0 }, halfRuns: 0, card: [] }; }
const CODE = e => ({ K: "K", Kc: "Kc", KE: "K", F: "F" + e.loc, P: "P" + e.loc, Pf: "F" + e.loc + "f", G: e.loc, S: "1B", SX: "1B", T: "3B", Tgr: "3B", HRi: "HR", BB: "BB", HBP: "HP", E: "E" + e.loc, FC: "FC" })[e.k];
function applyEvent(e, S) { const tm = team(e.half), old = S.bases.slice(), nb = [null, null, null, null], moved = new Set(), bat = e.b;
  for (const tok of e.mv.split(" ")) { const f = tok[0], to = tok[tok.length - 1], who = f === "B" ? bat : old[+f]; if (f !== "B") moved.add(+f); if (to === "H") { S.score[tm]++; S.halfRuns++; } else if (to === "x") S.outs++; else nb[+to] = who; }
  for (let b = 1; b <= 3; b++) if (old[b] && !moved.has(b) && !nb[b]) nb[b] = old[b]; S.bases = nb;
  if (!["SB", "SBE", "CS"].includes(e.k)) { const s = slotOf(tm, bat); S.order[tm] = (s + 1) % 9; S.card.push({ tm, slot: s, inn: e.half >> 1, code: CODE(e), pinch: bat === "O'Brien" || bat === "Farrell" ? bat : null }); }
  if (e.last) { S.line[e.half % 2].push(S.halfRuns); S.halfRuns = 0; S.outs = 0; S.bases = [null, null, null, null]; S.half = e.half + 1; } }
const stateAt = i => { const S = freshState(); for (let k = 0; k < i; k++) applyEvent(EVENTS[k], S); return S; };
const batterFor = (e, S) => ["SB", "SBE", "CS"].includes(e.k) ? (() => { const tm = team(e.half), s = S.order[tm]; return LINEUP[tm][s][0].split(" ").pop(); })() : e.b;

// ---------- people moving: a path of points at a speed; then they stand and face something ----------
function turnTo(G, ty, k) { let dy = ty - G.rotation.y; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; G.rotation.y += dy * Math.min(1, k); }
function goTo(P, pts, speed, face) { P.path = (Array.isArray(pts) ? pts : [pts]).map(p => p.clone().setY(0)); P.speed = speed; P.faceAt = face || null; }
function act(P, n, d) { P.act = { n, t0: GAME.T, d }; }
function stand(P, pose, faceAt) { P.path = []; P.base = pose; if (faceAt) P.faceAt = faceAt; }
function updatePerson(P, dt) { const G = P.G; let moving = false; if (P.ph0 === undefined) P.ph0 = Math.random() * 10;
  // walking and running: speed builds up and dies away, and they turn smoothly toward where they're going
  if (P.path && P.path.length) { const tgt = P.path[0], d = V3(tgt.x - G.position.x, 0, tgt.z - G.position.z), L = d.length(), want = P.path.length > 1 ? (P.speed || 3) : Math.min(P.speed || 3, 1.2 + L * 2.2); P.v = lerpN(P.v || 0, want, Math.min(1, dt * 5)); const step = P.v * dt;
    if (L <= Math.max(step, 0.02)) { G.position.x = tgt.x; G.position.z = tgt.z; P.path.shift(); } else { G.position.addScaledVector(d, step / L); moving = true; }
    if (L > 0.05) turnTo(G, Math.atan2(-d.x, -d.z), dt * 9); } else P.v = 0;
  // standing still: face what matters (the ball in play, else where they were told to look)
  const ballLive = GAME.ball.mode === "path" && BALL.visible, onField = !P.bat && P.base !== "sit";
  if (!moving) { const f = ballLive && onField ? BALL.position : P.faceAt; if (f) { const dx = f.x - G.position.x, dz = f.z - G.position.z; if (dx * dx + dz * dz > 0.04) turnTo(G, Math.atan2(-dx, -dz), dt * (ballLive ? 7 : 4)); } }
  G.position.y = floorAt(G.position.x, G.position.z);
  const base = P.base === "ready" && !GAME.live && P.role !== "UMP_B" ? "relax" : (P.base || "ready"); setPose(P, moving ? "stand" : base); const z = (j, x, y, zz) => j.rotation.set(x, y || 0, zz || 0);
  if (!moving && base !== "sit") { const t = GAME.T + P.ph0; P.torso.rotation.z += Math.sin(t * 0.9) * 0.025; P.hips.position.x = Math.sin(t * 0.45) * 0.02; P.torso.rotation.x += Math.sin(t * 1.7) * 0.012; }
  if (moving) { P.ph = (P.ph || 0) + dt * (P.speed || 3) * 1.5; const k = clampN((P.speed || 3) / 7, 0.3, 1), s = Math.sin(P.ph); z(P.lL, s * 0.9 * k); z(P.lR, -s * 0.9 * k); z(P.kL, Math.max(0, -s) * 1.2 * k + 0.1); z(P.kR, Math.max(0, s) * 1.2 * k + 0.1); z(P.aL, -s * 0.8 * k, 0, 0.15); z(P.aR, s * 0.8 * k, 0, -0.15); z(P.eL, -1.2 * k); z(P.eR, -1.2 * k); z(P.torso, -0.25 * k); P.hips.position.y = 0.95 - 0.04 * k + Math.abs(Math.cos(P.ph)) * 0.04 * k; }
  if (P.act) { const u = (GAME.T - P.act.t0) / P.act.d; if (u > 1 || u < 0) P.act = null; else { const n = P.act.n;
      if (n === "windup") { if (u < 0.55) { z(P.aL, -2.6, 0, 0.3); z(P.aR, -2.7, 0, -0.3); z(P.lL, -1.1 * Math.sin(u / 0.55 * Math.PI), 0, 0); z(P.kL, 1.2 * Math.sin(u / 0.55 * Math.PI)); } else { const v = (u - 0.55) / 0.45; z(P.torso, -0.5 * v); z(P.lL, -0.6); z(P.kL, 0.4); z(P.aR, lerpN(-2.9, 1.1, v), 0, -0.3); z(P.aL, -0.6, 0, 0.4); } }
      else if (n === "throw") { z(P.aR, u < 0.4 ? -2.6 : lerpN(-2.6, 0.9, (u - 0.4) / 0.6), 0, -0.3); z(P.torso, -0.3 * u, -0.4 + 0.8 * u); }
      else if (n === "swing") { z(P.torso, -0.15, lerpN(0.7, -1.1, Math.min(1, u * 1.6))); z(P.aL, -1.45, 0, 0.2); z(P.aR, -1.45, 0, -0.2); z(P.eL, -0.2); z(P.eR, -0.2); }
      else if (n === "catch") { z(P.aL, -2.2, 0, 0.25); z(P.eL, -0.3); }
      else if (n === "low") { z(P.torso, -0.9); z(P.aL, -1.0, 0, 0.1); z(P.kL, 0.9); z(P.kR, 0.9); z(P.lL, -0.6); z(P.lR, -0.6); P.hips.position.y = 0.75; }
      else if (n === "call") { z(P.aR, -2.9, 0, -0.2); z(P.eR, -0.6); }
      else if (n === "safe") { z(P.aL, -1.5, 0, 1.3); z(P.aR, -1.5, 0, -1.3); } } }
  if (P.bat && !moving) batFrame(P);
  // the head follows the ball (or home plate), within what a neck can do
  { const tgt = ballLive ? BALL.position : P.base === "sit" ? null : V3(0, 1.2, 0); if (tgt) { P.G.updateMatrixWorld(true); const hp = P.head.getWorldPosition(V3(0, 0, 0)), d = tgt.clone().sub(hp), inv = P.torso.getWorldQuaternion(new THREE.Quaternion()).invert(), l = d.applyQuaternion(inv);
      const yw = clampN(Math.atan2(-l.x, -l.z), -1.2, 1.2), pt = clampN(Math.atan2(l.y, Math.hypot(l.x, l.z)), -0.7, 0.6); P.hy = lerpN(P.hy || 0, yw, Math.min(1, dt * 8)); P.hx = lerpN(P.hx || 0, pt, Math.min(1, dt * 8)); P.head.rotation.set(P.hx, P.hy, 0, "YXZ"); } }
  if (P.reach && GAME.T < P.reach && BALL.visible) { P.G.updateMatrixWorld(true); const sh = P.aL.getWorldPosition(V3(0, 0, 0)), d = BALL.position.clone().sub(sh), L = d.length(); armIK(P, "L", L < 0.6 ? BALL.position : sh.addScaledVector(d, 0.55 / L), V3(-0.8, -0.6, 0.4)); } else if (P.reach && GAME.T >= P.reach) P.reach = null; }

// ---------- the ball: held, or flying along arcs, rolls and straight lines ----------
function hold(P, hand = "R") { GAME.ball = { mode: "held", P, hand }; BALL.visible = true; }
function fly(segs, then) { GAME.ball = { mode: "path", segs, then }; BALL.visible = true; }
const handPos = (P, hand) => (hand === "L" ? P.handL : P.handR).getWorldPosition(V3(0, 0, 0));
function updateTrail() { const B = GAME.ball; if (B.mode === "path" && BALL.visible) { TRAILP.unshift(BALL.position.clone()); if (TRAILP.length > 14) TRAILP.pop(); } else TRAILP.length = 0; const m = new THREE.Matrix4(); TRAIL.count = Math.max(0, TRAILP.length - 1); for (let i = 1; i < TRAILP.length; i++) { const r = 0.034 * (1 - i / 15); m.makeScale(r, r, r).setPosition(TRAILP[i]); TRAIL.setMatrixAt(i - 1, m); } TRAIL.instanceMatrix.needsUpdate = true; }
function updateBall() { const B = GAME.ball; if (B.mode === "hide") { BALL.visible = false; return; } if (B.mode === "held") { BALL.position.copy(handPos(B.P, B.hand)); return; }
  const T = GAME.T; let s = B.segs.find(s => T < s.t1) || B.segs[B.segs.length - 1]; const u = clampN((T - s.t0) / (s.t1 - s.t0), 0, 1);
  if (s.type === "roll") { const e = 1 - Math.pow(1 - u, 1.6); BALL.position.copy(s.a).lerp(s.b, e).setY(0.04); } else { BALL.position.copy(s.a).lerp(s.b, u); BALL.position.y += (s.h || 0) * 4 * u * (1 - u); }
  if (T >= B.segs[B.segs.length - 1].t1 && B.then) { const f = B.then; B.then = null; f(); } }
const seg = (t0, dur, a, b, h, type) => ({ t0, t1: t0 + dur, a: a.clone(), b: b.clone(), h, type });

// ---------- building blocks of plays ----------
const RUN = 7.3, THROW = 30;
function runPath(P, from, to) { const pts = []; for (let b = from + 1; b <= to; b++) pts.push(BP(b)); return pts; }
const pathLen = (P, pts) => { let d = 0, p = P.G.position.clone().setY(0); for (const q of pts) { d += p.distanceTo(q); p = q; } return d; };
function runAt(t, P, from, to, speed = RUN) { const pts = runPath(P, from, to); cue(t, () => goTo(P, pts, speed, to < 4 ? V3(0, 0, 0) : null)); return t + 0.2 + (from === 0 ? 27.4 * (to - from) : 27.43 * (to - from)) / speed; }
function throwAt(t, from, to, toPt, h, onCatch) { const a = from.G.position.clone().setY(1.6), b = (toPt || to.G.position).clone().setY(1.3), d = a.distanceTo(b), dur = Math.max(0.35, d / THROW);
  cue(t, () => { act(from, "throw", 0.5); }); if (to) cue(t + 0.25 + dur - 0.4, () => { to.reach = t + 0.25 + dur + 0.2; }); cue(t + 0.25, () => { const a2 = handPos(from, "R"); fly([seg(GAME.T, dur, a2, b, h ?? d * 0.04, "arc")], () => { if (to) { hold(to, "L"); act(to, "catch", 0.5); sfx("pop", to.G.position, 0.5); } if (onCatch) onCatch(); }); }); return t + 0.25 + dur; }
function catchAt(t, P) { cue(t - 0.45, () => { P.reach = t + 0.25; }); cue(t, () => { hold(P, "L"); act(P, "catch", 0.6); sfx("pop", P.G.position, 0.5); }); }
const CONTACT = V3(0.3, 0.92, 0.1);
function cheer(v, t) { cue(t, () => { GAME.cheer = Math.max(GAME.cheer, v); }); }
function say2(t, text) { cue(t, () => { GAME.last = text; drawPanel(); }); }

// ---------- one pitch; returns when the ball reaches the plate ----------
function throwPitch(t, kind, batter, final) { const Pp = fielder(1), C = fielder(2), ump = PEOPLE["Tommy Connolly"], lefty = LEFTY.has(batter.short);
  cue(t, () => { hold(Pp, "R"); act(Pp, "windup", 1.3); GAME.live = true; }); cue(t + 1.81 + (final ? 6 : 1.4), () => { GAME.live = false; }); const rel = t + 1.25, arr = rel + 0.56;
  const MITT = V3(0, 0.75, 0.75);
  cue(rel, () => { const a = handPos(Pp, "R"); if (kind === "H") fly([seg(GAME.T, 0.56, a, batter.G.position.clone().setY(1.0), 0.25, "arc")]); else if (kind === "X" || kind === "F") fly([seg(GAME.T, 0.56, a, CONTACT, 0.25, "arc")]);
    else { const m = MITT.clone().add(kind === "B" ? V3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.7, 0) : V3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.2, 0)), mid = V3(m.x * 0.6, m.y + 0.05, -0.2); fly([seg(GAME.T, 0.5, a, mid, 0.25, "arc"), seg(GAME.T + 0.5, 0.07, mid, m, 0, "line")]); } });
  cue(arr - 0.45, () => { C.reach = arr + 0.4; });
  if (!final) for (let b = 1; b <= 3; b++) { const rn = GAME.st.bases[b] && P_(GAME.st.bases[b]); if (!rn) continue; const home = BP(b).clone().add(b === 1 ? V3(-0.6, 0, 0.6) : b === 2 ? V3(0.6, 0, 0.6) : V3(0.6, 0, -0.4)), lead = BP(b).clone().lerp(BP(b + 1), b === 3 ? 0.08 : 0.12); cue(t + 0.1, () => goTo(rn, lead, 1.8, V3(0, 0, 0))); cue(arr + 1.0, () => { goTo(rn, home, 2.2, V3(0, 0, 0)); rn.arrive = () => stand(rn, "ready", V3(0, 0, 0)); }); }
  if (["S", "F", "X"].includes(kind)) cue(arr - 0.18, () => { act(batter, "swing", 0.45); batter.swungAt = GAME.T; });
  cue(arr, () => { if (kind === "X" || kind === "F") sfx("crack", CONTACT, kind === "X" ? 1 : 0.6); if (kind === "B" || kind === "S" || kind === "C") cue(GAME.T + 0.07, () => { hold(C, "L"); act(C, "catch", 0.5); sfx("pop", MITT, 0.7); if (kind === "C" || kind === "S") act(ump, "call", 1.0); });
    if (kind === "F") { const side = Math.random() < 0.5 ? -1 : 1, end = V3(side * (8 + Math.random() * 14), 4, 10 + Math.random() * 8); fly([seg(GAME.T, 1.2, CONTACT, end, 6, "arc")], () => { GAME.ball = { mode: "hide" }; }); }
    if (kind === "H") { act(batter, "safe", 0.6); GAME.ball = { mode: "hide" }; }
    if (kind === "B") GAME.balls++; else if (kind === "S" || kind === "C" || (kind === "F" && GAME.strikes < 2)) GAME.strikes++; drawPanel();
    });
  if (!final && (kind === "B" || kind === "S" || kind === "C")) throwAt(arr + 2.0, C, Pp, null, 1.2);
  if (kind === "F") cue(arr + 3, () => hold(Pp, "R"));
  return arr; }

// ---------- the plays themselves ----------
function locPt(n, kind) { const ang = { 7: -0.5, 8: 0.02, 9: 0.5 }[n]; if (ang !== undefined) return dir(ang).multiplyScalar(kind === "F" ? { 7: 72, 8: 86, 9: 66 }[n] : kind === "S" ? { 7: 52, 8: 58, 9: 50 }[n] : 60); return FIELDPOS[NPOS[n]].clone(); }
function choreograph(e, S, tc) { const bat = P_(e.b) || GAME.batter, k = e.k, runners = {}; for (let b = 1; b <= 3; b++) if (S.bases[b]) runners[b] = P_(S.bases[b]);
  const mv = e.mv.split(" "), dest = from => { const t = mv.find(m => m[0] === String(from)); return t ? t[t.length - 1] : null; }, toB = d => d === "H" ? 4 : +d;
  const advanceRunners = (t0, sp = RUN) => { let end = t0; for (const b of [3, 2, 1]) { const r = runners[b], d = dest(b); if (!r || !d || d === "x") continue; end = Math.max(end, runAt(t0, r, b, toB(d), sp)); } return end; };
  cue(tc + 0.15, () => { if (bat.bat) { dropBat(bat); bat.swungAt = undefined; } });
  const BD = dest("B"); let end = tc + 3;
  if (k === "K" || k === "Kc") { end = tc + 2.5; cue(tc + 1.2, () => goTo(bat, benchSpot(team(e.half), slotOf(team(e.half), e.b)), 2.2)); }
  else if (k === "KE") { const C = fielder(2), bs = V3(0.5, 0, 16.5); cue(tc, () => fly([seg(GAME.T, 1.1, V3(0, 0.6, 0.6), bs, 0, "roll")])); cue(tc + 0.3, () => goTo(C, bs, 6.2)); const tB = runAt(tc + 0.4, bat, 0, 1); advanceRunners(tc + 0.3); catchAt(tc + 2.8, C); end = throwAt(tc + 3.3, C, fielder(3), B1) + 1; }
  else if (k === "BB" || k === "HBP") { end = runAt(tc + 1.0, bat, 0, 1, 3.5); advanceRunners(tc + 1.0, 3.5); }
  else if (k === "F" || k === "P" || k === "Pf") { const n = e.loc, Fp = fielder(n), pt = k === "Pf" ? (n === 2 ? V3(-3, 0, 6) : dir(-D45 - 0.18).multiplyScalar(26)) : k === "P" ? FIELDPOS[NPOS[n]].clone().add(V3(1.5, 0, 2)) : locPt(n, "F");
    const hang = k === "F" && n >= 7 ? 4.3 : 4.8, h = k === "F" && n >= 7 ? 28 : 34; cue(tc, () => fly([seg(GAME.T, hang, CONTACT, pt.clone().setY(1.7), h, "arc")])); cue(tc + 0.25, () => goTo(Fp, pt, 6.5, V3(0, 0, 0))); catchAt(tc + hang, Fp);
    cue(tc + 0.3, () => goTo(bat, [V3(0, 0, 0).lerp(B1, 0.6)], 6)); cue(tc + hang + 0.6, () => goTo(bat, benchSpot(team(e.half), slotOf(team(e.half), e.b)), 2.5));
    end = tc + hang + 2; let tagged = false; for (const b of [3, 2]) { const d = dest(b); if (runners[b] && d && d !== "x") { tagged = true; const ta = runAt(tc + hang + 0.15, runners[b], b, toB(d)); end = Math.max(end, throwAt(tc + hang + 0.6, Fp, d === "H" ? fielder(2) : fielder(5), d === "H" ? V3(0, 0, -0.5) : B3, 4) + 0.5, ta); } } }
  else if (k === "G" || k === "E" || k === "FC") { const seq = String(e.loc).split("-").map(Number), a = seq[0], Fa = fielder(a), pt = FIELDPOS[NPOS[a]].clone().lerp(V3(0, 0, 0), a === 1 ? 0.25 : 0.12), dur = Math.max(0.6, CONTACT.distanceTo(pt) / 24);
    cue(tc, () => fly([seg(GAME.T, 0.35, CONTACT, CONTACT.clone().lerp(pt, 0.25).setY(0.05), 0.6, "arc"), seg(GAME.T + 0.35, dur, CONTACT.clone().lerp(pt, 0.25).setY(0.05), pt, 0, "roll")])); cue(tc + 0.1, () => { goTo(Fa, pt, 5); }); cue(tc + 0.35 + dur - 0.05, () => act(Fa, "low", 0.5));
    const tGet = tc + 0.35 + dur; let tBat;
    if (k === "E") { cue(tGet, () => fly([seg(GAME.T, 0.8, pt.clone().setY(0.3), pt.clone().add(V3(1.6, 0, -1.2)), 0.2, "roll")])); cue(tGet + 0.2, () => goTo(Fa, pt.clone().add(V3(1.6, 0, -1.2)), 3)); catchAt(tGet + 1.4, Fa); tBat = runAt(tc + 0.3, bat, 0, 1); advanceRunners(tc + 0.2); end = Math.max(tBat, throwAt(tGet + 2.0, Fa, fielder(3), B1) + 0.8); }
    else if (k === "FC") { const Fb = fielder(seq[1]); catchAt(tGet, Fa); cue(tc + 0.2, () => goTo(Fb, B2.clone().add(V3(0.4, 0, 0.5)), 6.5, Fa.G.position)); const tThrow = throwAt(tGet + 0.3, Fa, Fb, B2); const r1 = runners[1]; cue(tc + 0.1, () => goTo(r1, [B2.clone().lerp(B1, 0.12)], RUN * 0.85)); cue(tThrow + 0.4, () => goTo(r1, benchSpot(team(e.half), slotOf(team(e.half), S.bases[1])), 2.5)); tBat = runAt(tc + 0.3, bat, 0, 1); end = Math.max(tBat, tThrow) + 1; }
    else { const b = seq[seq.length - 1], Fb = fielder(b), covers = b === 3 ? B1 : b === 1 ? B1 : B2; catchAt(tGet, Fa); if (b !== a) cue(tc + 0.2, () => goTo(Fb, covers.clone(), 6, Fa.G.position)); const tThrow = a === b ? tGet + 1.5 : throwAt(tGet + 0.35, Fa, Fb, covers);
      cue(tc + 0.3, () => goTo(bat, [B1.clone().lerp(V3(0, 0, 0), 0.04), B1.clone().lerp(V3(0, 0, 0), -0.25)], Math.min(RUN, 27 / Math.max(1, tThrow + 0.35 - tc - 0.3)))); cue(tThrow + 0.6, () => act(PEOPLE["Hank O'Day"], "call", 0.9)); cue(tThrow + 1.2, () => goTo(bat, benchSpot(team(e.half), slotOf(team(e.half), e.b)), 2.5)); end = tThrow + 2; } }
  else if (k === "S" || k === "SX") { const n = e.loc, Fp = fielder(n); let pt;
    if (n >= 7) { pt = locPt(n, "S"); const mid = V3(0, 0, 0).lerp(pt, 0.4); cue(tc, () => fly([seg(GAME.T, 0.5, CONTACT, mid.clone().setY(0.05), 1.0, "arc"), seg(GAME.T + 0.5, pt.distanceTo(mid) / 20, mid, pt, 0, "roll")])); const tA = tc + 0.5 + pt.distanceTo(mid) / 20; cue(tc + 0.2, () => goTo(Fp, pt, 6.5)); catchAt(tA, Fp);
      if (k === "SX") { const F4 = fielder(4); cue(tc + 0.5, () => goTo(F4, B2.clone().add(V3(0.5, 0, 0.6)), 6, pt)); cue(tc + 0.3, () => goTo(bat, [B1.clone().add(V3(0.6, 0, -0.6)), B2.clone().lerp(B1, 0.1)], RUN)); const tT = throwAt(tA + 0.4, Fp, F4, B2, 3); cue(tT + 0.2, () => act(F4, "low", 0.6)); cue(tT + 0.4, () => act(PEOPLE["Hank O'Day"], "call", 0.9)); cue(tT + 1.4, () => goTo(bat, benchSpot(team(e.half), slotOf(team(e.half), e.b)), 2.5)); end = tT + 2.5; }
      else { const tB = runAt(tc + 0.3, bat, 0, 1), tR = advanceRunners(tc + 0.15); const cut = fielder(6); const tT = throwAt(tA + 0.5, Fp, cut, V3(0, 0, 0).lerp(B2, 0.8), 3); end = Math.max(tB, tR, tT) + 1; cheer(team(e.half) === "BOS" ? 0.8 : 0.15, tc + 0.3); } }
    else { pt = n === 3 ? B1.clone().add(V3(-4, 0, -1)) : B3.clone().add(V3(4, 0, -1)).lerp(V3(0, 0, 0), 0.25); cue(tc, () => fly([seg(GAME.T, Math.max(1.2, CONTACT.distanceTo(pt) / 9), CONTACT, pt, 0.3, "roll")])); const tA = tc + Math.max(1.2, CONTACT.distanceTo(pt) / 9); cue(tc + 0.2, () => goTo(Fp, pt, 6)); catchAt(tA, Fp);
      const tB = runAt(tc + 0.3, bat, 0, 1); advanceRunners(tc + 0.2); end = Math.max(tB, throwAt(tA + 0.5, Fp, fielder(n === 3 ? 1 : 3), B1) + 0.6); cue(tB, () => act(PEOPLE["Hank O'Day"], "safe", 0.8)); } }
  else if (k === "T" || k === "Tgr" || k === "HRi") { const n = e.loc, Fp = fielder(n), ang = { 7: -0.5, 8: 0.05, 9: 0.55 }[n], land = k === "Tgr" ? dir(ang).multiplyScalar(ropeDist(ang * 180 / Math.PI) + 5) : k === "HRi" ? dir(ang).multiplyScalar(112) : dir(ang + 0.08).multiplyScalar(74), hang = k === "T" ? 2.6 : 4.4;
    cue(tc, () => fly([seg(GAME.T, hang, CONTACT, land.clone().setY(k === "Tgr" ? 1.2 : 0.05), k === "T" ? 9 : 30, "arc")], () => { if (k === "Tgr") GAME.ball = { mode: "hide" }; })); cue(tc + 0.2, () => goTo(Fp, k === "Tgr" ? dir(ang).multiplyScalar(ropeDist(ang * 180 / Math.PI) - 1.5) : land, 6.8));
    const toBase = k === "HRi" ? 4 : 3, tB = runAt(tc + 0.3, bat, 0, toBase, k === "Tgr" ? 6 : RUN * (k === "HRi" ? 1.03 : 1)), tR = advanceRunners(tc + 0.15); end = Math.max(tB, tR) + 1.5; cheer(team(e.half) === "BOS" ? 1 : 0.2, tc + 0.5);
    if (k !== "Tgr") { const roll = k === "HRi" ? dir(ang).multiplyScalar(ropeDist(ang * 180 / Math.PI) - 4) : dir(ang + 0.1).multiplyScalar(ropeDist((ang + 0.1) * 180 / Math.PI) - 3), tL = tc + hang, tRoll = tL + land.distanceTo(roll) / 9;
      cue(tL, () => fly([seg(GAME.T, tRoll - tL, land, roll, 0, "roll")])); cue(tL - 0.5, () => goTo(Fp, roll, 6.8)); catchAt(tRoll + 0.2, Fp); const relay = fielder(n === 9 ? 4 : 6), rp = dir(ang).multiplyScalar(42); cue(tc + 1, () => goTo(relay, rp, 6, roll));
      const t1 = throwAt(tRoll + 0.6, Fp, relay, rp, 5); end = Math.max(end, throwAt(t1 + 0.4, relay, fielder(k === "HRi" ? 2 : 5), k === "HRi" ? V3(0, 0, -0.4) : B3) + 1); }
    else { cue(tc + hang + 0.3, () => { act(PEOPLE["Hank O'Day"], "call", 1); }); cue(tc + hang + 3, () => hold(fielder(1), "R")); } }
  else if (k === "SB" || k === "SBE" || k === "CS") { const C = fielder(2), F4 = fielder(4); if (k === "CS") { const r3 = runners[3], r1 = runners[1]; cue(tc - 1.2, () => goTo(r1, [B1.clone().lerp(B2, 0.45)], RUN)); cue(tc + 0.2, () => goTo(F4, B2.clone().add(V3(0.3, 0, 0.4)), 6, V3(0, 0, 0))); const t1 = throwAt(tc + 0.35, C, F4, B2, 2); cue(tc + 0.5, () => goTo(r3, [B3.clone().lerp(V3(0, 0, 0), 0.92)], RUN)); cue(t1 + 0.3, () => goTo(r1, B1.clone(), 5, B2));
      const t2 = throwAt(t1 + 0.3, F4, C, V3(0, 0, -0.6), 2); cue(t2 + 0.1, () => act(C, "low", 0.7)); cue(t2 + 0.5, () => act(ump(), "call", 1)); cue(t2 + 1.5, () => goTo(r3, benchSpot(team(e.half), slotOf(team(e.half), S.bases[3])), 2.5)); end = t2 + 3; }
    else { const r = runners[1], cover = fielder(k === "SB" ? 4 : 4); cue(tc - 1.6, () => goTo(r, [B2.clone().lerp(B1, 0.06)], RUN)); cue(tc + 0.2, () => goTo(cover, B2.clone().add(V3(0.3, 0, 0.5)), 6.5, V3(0, 0, 0)));
      if (k === "SB") { const t1 = throwAt(tc + 0.35, C, cover, B2, 2); cue(t1 + 0.05, () => act(cover, "low", 0.5)); cue(t1 + 0.3, () => act(PEOPLE["Hank O'Day"], "safe", 0.8)); end = t1 + 2.5; }
      else { const cfp = dir(0).multiplyScalar(48), F8 = fielder(8); cue(tc + 0.35, () => act(C, "throw", 0.5)); cue(tc + 0.6, () => fly([seg(GAME.T, 0.9, V3(0, 1.5, 0), B2.clone().setY(1.2), 2, "arc"), seg(GAME.T + 0.9, 2.2, B2, cfp, 0, "roll")])); cue(tc + 0.9, () => goTo(F8, cfp, 6.5)); catchAt(tc + 3.8, F8);
        const tr = runAt(tc + 1.5, r, 2, 3), t3 = runAt(tc + 1.0, runners[3], 3, 4); cheer(0.1, tc + 1.6); end = Math.max(tr, t3, throwAt(tc + 4.2, F8, fielder(5), B3, 4)) + 1; } } }
  return end; }
const ump = () => PEOPLE["Tommy Connolly"];

// ---------- pitches the record doesn't give: plausible ones that fit the result ----------
function pitchesFor(e) { const r = mulberry(e.i * 7919 + 13), seq = [], k = e.k, pick = a => a[r() * a.length | 0];
  if (k === "SB" || k === "SBE" || k === "CS") return ["B"]; let b = 0, s = 0;
  const add = c => { seq.push(c); if (c === "B") b++; else if (c === "S" || c === "C" || (c === "F" && s < 2)) s++; };
  if (k === "K" || k === "Kc" || k === "KE") { const nb = r() * 3 | 0; let pool = [...Array(nb).fill("B"), "S", pick(["S", "F", "C"])]; pool.sort(() => r() - 0.5); pool.forEach(add); if (r() < 0.3) add("F"); seq.push(k === "Kc" ? "C" : "S"); return seq; }
  if (k === "BB") { const pool = ["B", "B", "B", ...Array(r() * 3 | 0).fill(0).map(() => pick(["S", "F", "C"]))]; pool.sort(() => r() - 0.5); pool.forEach(c => { if ((c !== "B" || b < 3) && (c === "B" || s < 2)) add(c); }); while (b < 3) add("B"); seq.push("B"); return seq; }
  const n = r() * 3 | 0; for (let i = 0; i < n; i++) { const c = pick(["B", "S", "F", "C", "B"]); if ((c === "B" && b < 3) || (c !== "B" && s < 2)) add(c); } seq.push(k === "HBP" ? "H" : "X"); return seq; }

// ---------- running the game ----------
function placeAll(S) { GAME.st = S; const bt = team(S.half), ft = other(bt), rng = mulberry(S.half * 31 + 7);
  for (const [nm, pos] of LINEUP[ft]) { const P = PEOPLE[nm], p = FIELDPOS[pos]; P.path = []; P.G.position.set(p.x, floorAt(p.x, p.z), p.z); stand(P, pos === "C" ? "crouch" : pos === "P" ? "stand" : "ready", V3(0, 0, 0)); if (pos === "C") P.G.position.set(0, 0, 0.95); if (pos === "C") P.faceAt = V3(0, 0, -10); }
  const onBase = new Set(S.bases.filter(Boolean).map(n => NAMES[n]));
  const benchers = [...LINEUP[bt].map(([n]) => n), ...(bt === "BOS" ? ["Jack O'Brien", "Duke Farrell"] : [])]; benchers.forEach((nm, k) => { const P = PEOPLE[nm]; if (!P) return; P.path = []; if (onBase.has(nm)) { const b = S.bases.findIndex(x => x && NAMES[x] === nm), p = BP(b).clone().add(b === 1 ? V3(-0.6, 0, 0.6) : b === 2 ? V3(0.6, 0, 0.6) : V3(0.6, 0, -0.4)); P.G.position.copy(p); stand(P, "ready", V3(0, 0, 0)); } else { const p = benchSpot(bt, k); P.G.position.set(p.x, 0, p.z); P.G.rotation.y = benchFace(bt); stand(P, "sit", null); P.faceAt = null; } dropBat(P); });
  for (const nm of (ft === "BOS" ? ["Jack O'Brien", "Duke Farrell"] : [])) { const P = PEOPLE[nm]; if (!P) continue; const p = benchSpot("BOS", 10 + (nm[0] === "D" ? 1 : 0)); P.G.position.set(p.x, 0, p.z); P.G.rotation.y = benchFace("BOS"); stand(P, "sit", null); P.faceAt = null; }
  const u = ump(); u.G.position.set(0.3, 0, 1.9); stand(u, "ready", V3(0, 0, -10)); const o = PEOPLE["Hank O'Day"], op = B1.clone().add(V3(3, 0, 2.5)); o.G.position.copy(op); stand(o, "ready", V3(0, 0, 0));
  hold(fielder(1, S.half), "R"); GAME.balls = GAME.strikes = 0; SCORE.line = S.line.map(a => a.slice()); drawScore(); drawCard(S); }
function batterUp(e, S, instant) { const short = batterFor(e, S), P = P_(short); if (!P) return; P.short = short; GAME.batter = P; const box = BATTERS_BOX(LEFTY.has(short)); const rotY = LEFTY.has(short) ? Math.PI / 2 : -Math.PI / 2; CONTACT.copy(C_LOCAL(LEFTY.has(short) ? 1 : -1).applyAxisAngle(UP, rotY).add(box)); P.swungAt = undefined;
  const done = () => { stand(P, "bat", null); P.G.rotation.y = rotY; if (!P.bat) { P.bat = new THREE.Mesh(BATG, BATM); P.bat.castShadow = true; P.G.add(P.bat); } };
  if (instant) { P.G.position.copy(box); done(); } else { goTo(P, box, 2.4); P.arrive = done; } }
function startEvent(i, instant) { if (i >= EVENTS.length) { GAME.phase = "over"; GAME.last = "Final: Pittsburgh 7, Boston 3. Phillippe struck out ten; the Pirates lead the Series one game to none."; drawPanel(); return; }
  const e = EVENTS[i], S = GAME.st; GAME.ei = i; GAME.T = 0; GAME.cues = []; GAME.phase = "play"; GAME.balls = GAME.strikes = 0; batterUp(e, S, instant); const P = GAME.batter, pace = PACE[paceKey];
  const ps = pitchesFor(e); let t = instant ? 1.0 : 4.5; ps.forEach((c, j) => { const final = j === ps.length - 1; if (!final) { throwPitch(t, c, P); t += pace.gap; } else { const arr = throwPitch(t, c, P, true); const end = choreograph(e, S, arr); GAME.endT = end; cue(end + 0.5, () => finishEvent(e)); } });
  GAME.last = `${HALF_NAME(e.half)}. ${["SB", "SBE", "CS"].includes(e.k) ? "With " + P.short + " at bat" : P.short + " at bat"}.`; drawPanel(); }
function finishEvent(e) { applyEvent(e, GAME.st); GAME.last = e.text; markCard(); SCORE.line = GAME.st.line.map(a => a.slice()); drawScore(); drawPanel(); const pace = PACE[paceKey];
  if (e.last) { GAME.phase = "change"; GAME.T = 0; GAME.cues = []; settle(true); cue(pace.change, () => { placeAll(GAME.st); startEvent(e.i + 1); }); if (e.i === EVENTS.length - 1) { GAME.cues = []; cheer(0.2, 0); cue(1, () => startEvent(EVENTS.length)); } }
  else { GAME.phase = "between"; GAME.T = 0; GAME.cues = []; settle(false); cue(pace.between, () => startEvent(e.i + 1)); } }
// after a play: runners to their bases, the others to the bench, fielders back to their places, the ball back to the pitcher
function settle(change) { const S = GAME.st, bt = team(change ? S.half - 1 : S.half), ft = other(bt);
  for (const [nm, pos] of LINEUP[ft]) { const P = PEOPLE[nm]; if (change) goTo(P, benchSpot(ft, LINEUP[ft].findIndex(([n]) => n === nm)), 3.2); else goTo(P, pos === "C" ? V3(0, 0, 0.95) : FIELDPOS[pos], 3.5, V3(0, 0, 0)); P.arrive = () => stand(P, change ? "sit" : pos === "C" ? "crouch" : pos === "P" ? "stand" : "ready", change ? null : (pos === "C" ? V3(0, 0, -10) : V3(0, 0, 0))); }
  const onBase = S.bases.map(n => n && NAMES[n]); [...LINEUP[bt].map(([n]) => n), ...(bt === "BOS" ? ["Jack O'Brien", "Duke Farrell"] : [])].forEach((nm, k) => { const P = PEOPLE[nm]; if (!P) return; dropBat(P); const b = onBase.indexOf(nm);
    if (!change && b > 0) { goTo(P, BP(b).clone().add(b === 1 ? V3(-0.6, 0, 0.6) : b === 2 ? V3(0.6, 0, 0.6) : V3(0.6, 0, -0.4)), 3, V3(0, 0, 0)); P.arrive = () => stand(P, "ready", V3(0, 0, 0)); }
    else if (change) { const pos = LINEUP[bt].find(([n]) => n === nm); if (pos) { goTo(P, pos[1] === "C" ? V3(0, 0, 0.95) : FIELDPOS[pos[1]], 3.2, V3(0, 0, 0)); P.arrive = () => stand(P, pos[1] === "C" ? "crouch" : pos[1] === "P" ? "stand" : "ready", V3(0, 0, 0)); } }
    else { const p = benchSpot(bt, k); goTo(P, p, 2.6); P.arrive = () => { P.G.rotation.y = benchFace(bt); stand(P, "sit", null); P.faceAt = null; }; } });
  const Pp = fielder(1, change ? S.half : S.half); if (GAME.ball.mode !== "held" || GAME.ball.P !== Pp) { if (GAME.ball.mode === "held") throwAt(1.0, GAME.ball.P, Pp, null, 3); else cue(1.5, () => hold(Pp, "R")); } }
function jumpTo(i) { GAME.cues = []; for (const P of Object.values(PEOPLE)) { P.path = []; P.act = null; P.arrive = null; } const S = stateAt(i); placeAll(S); GAME.last = i < EVENTS.length ? HALF_NAME(EVENTS[i].half) + "." : ""; startEvent(i, true); }
const nextPlay = () => { if (!GAME.on) return; jumpTo(Math.min(EVENTS.length, GAME.phase === "play" ? GAME.ei + 1 : GAME.ei + 1)); };
const nextHalf = () => { if (!GAME.on) return; const h = GAME.st.half; const i = EVENTS.findIndex(e => e.half > (GAME.phase === "change" ? h - 1 : h)); jumpTo(i < 0 ? EVENTS.length : i); };
const toInning = n => { if (!GAME.on) startGame(); jumpTo(EVENTS.findIndex(e => e.half === (n - 1) * 2)); };
function startGame() { if (GAME.on) return; enterPark(); GAME.on = true; placeAll(freshState()); startEvent(0); }
function updateGame(dt) { if (!GAME.on) return; if (!GAME.paused) { GAME.T += dt; GAME.cues.sort((a, b) => a.t - b.t); while (GAME.cues.length && GAME.cues[0].t <= GAME.T) { const c = GAME.cues.shift(); c.fn(); } }
  for (const P of Object.values(PEOPLE)) { const was = P.path && P.path.length; updatePerson(P, GAME.paused ? 0 : dt); if (was && !P.path.length && P.arrive) { const f = P.arrive; P.arrive = null; f(); } } updateBall(); updateTrail(); GAME.cheer = Math.max(0, GAME.cheer - dt * 0.35); audioFrame(); if (CROWD.cheerU) { CROWD.cheerU.value = GAME.cheer; CROWD.timeU.value = performance.now() / 1000; } }

// ---------- sound: the crack of the bat, the pop of the glove, and the crowd (made from noise, nothing recorded) ----------
const AUD = { L: null };
function audioInit() { if (AUD.L) { AUD.L.context.resume(); return; } const L = new THREE.AudioListener(); camera.add(L); AUD.L = L; const ctx = L.context, sr = ctx.sampleRate;
  const buf = (sec, f) => { const b = ctx.createBuffer(1, Math.floor(sr * sec), sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = f(i / sr); return b; };
  AUD.crack = buf(0.3, t => (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.9 + Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 32) * 0.45 + Math.sin(2 * Math.PI * 640 * t) * Math.exp(-t * 24) * 0.3);
  AUD.pop = buf(0.2, t => Math.sin(2 * Math.PI * 170 * t) * Math.exp(-t * 38) * 0.8 + (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.5);
  let last = 0; const noise = (sec, k) => buf(sec, () => (last += ((Math.random() * 2 - 1) - last) * k));
  const loop = (b, freq, type, vol) => { const a = new THREE.Audio(L); a.setBuffer(b); a.setLoop(true); a.setVolume(vol); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; a.setFilter(f); a.play(); return a; };
  AUD.murmur = loop(noise(5, 0.12), 900, "lowpass", 0.08); AUD.roar = loop(noise(5, 0.3), 750, "bandpass", 0); }
function sfx(kind, pos, vol = 1) { if (!AUD.L || !AUD[kind]) return; const a = new THREE.PositionalAudio(AUD.L); a.setBuffer(AUD[kind]); a.setRefDistance(kind === "crack" ? 18 : 8); a.setVolume(vol); const o = new THREE.Object3D(); o.position.copy(pos); o.add(a); scene.add(o); a.play(); setTimeout(() => { scene.remove(o); try { a.disconnect(); } catch (e) {} }, 1200); }
function audioFrame() { if (!AUD.roar) return; const inside = CROWD.g.visible; AUD.roar.setVolume((inside ? 0.7 : 0.15) * GAME.cheer); AUD.murmur.setVolume(inside ? 0.09 : 0.04); }

// ---------- getting in: the ticket windows on Rogers Street, the gate, and the refreshment stand inside ----------
// Prices were doubled for the Series: $1 for the grandstand, 50 cents for the bleachers or standing room. Inside, 5 cents bought a score card
// (the batting orders printed, with a grid to keep score), a bag of peanuts, a glass of lemonade or a cigar.
const signT = (lines, w = 512, h = 256, bg = "#f0e6c8", fg = "#2a1e14") => tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = "center"; lines.forEach(([t, s], i) => { g.font = `bold ${s}px Georgia`; g.fillText(t, w / 2, 20 + (i + 1) * (h - 30) / (lines.length + 0.3)); }); });
const signMesh = (lines, w, h, p, ry, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signT(lines), roughness: 0.9, side: THREE.DoubleSide })); m.position.copy(p).setY(y); m.rotation.y = ry; scene.add(m); return m; };
const FACE_STREET = Math.atan2(WA.x, WA.z), FACE_IN = FACE_STREET + Math.PI;
const BOOTH = P2(GATE_U - 7, -39.6), STAND = P2(GATE_U + 3.6, -30), GATEP = P2(GATE_U, -38);
{ box(4.2, 2.8, 1.6, MAT.paint, BOOTH.x, 1.4, BOOTH.z, ROT_U); box(4.6, 0.15, 2.0, MAT.roof, BOOTH.x, 2.9, BOOTH.z, ROT_U);
  for (const s of [-1, 1]) { const p = BOOTH.clone().addScaledVector(UA, s * 1.0).addScaledVector(WA, -0.82); box(0.7, 0.5, 0.02, M(0x1a1a1a), p.x, 1.45, p.z, ROT_U); }
  signMesh([["WORLD'S CHAMPIONSHIP SERIES", 30], ["GRAND STAND  $1.00", 44], ["BLEACHERS & STANDING  50¢", 36]], 3.6, 1.0, BOOTH.clone().addScaledVector(WA, -0.83), ROT_W, 2.35);
  signMesh([["TICKETS AT THE WINDOW", 34], ["BOSTON vs. PITTSBURG", 36]], 3.2, 0.9, GATEP.clone().addScaledVector(WA, -0.1), ROT_W, FENCE_H - 0.7);
  box(0.4, FENCE_H, 0.4, MAT.paint, ...[GATEP.clone().addScaledVector(UA, -3)].map(q => [q.x, FENCE_H / 2, q.z]).flat()); box(0.4, FENCE_H, 0.4, MAT.paint, ...[GATEP.clone().addScaledVector(UA, 3)].map(q => [q.x, FENCE_H / 2, q.z]).flat());
  box(0.6, 1.0, 3.6, MAT.wood, STAND.x, 0.5, STAND.z, ROT_U); box(1.6, 0.1, 4.2, MAT.roof, STAND.x, 2.6, STAND.z, ROT_U);
  signMesh([["REFRESHMENTS", 40], ["Score Cards 5¢   Peanuts 5¢", 32], ["Lemonade 5¢   Cigars 5¢", 32]], 2.6, 1.0, STAND.clone().addScaledVector(UA, -0.4), ROT_U, 2.0); }
const STAFF = []; { const mk = (p, ry, coat = 0x2a2a2a, white = false) => { const P = makePerson("UMP", "", "staff"); P.G.position.copy(p); P.G.rotation.y = ry; setPose(P, "stand"); if (white) P.torso.children[0].material = M(0xf0eee6); STAFF.push(P); return P; };
  mk(BOOTH.clone().addScaledVector(WA, 0.2), FACE_STREET + Math.PI); mk(GATEP.clone().addScaledVector(WA, 1.2).addScaledVector(UA, 1.4), FACE_IN + Math.PI); mk(STAND.clone().addScaledVector(UA, 0.9), ROT_U + Math.PI / 2, 0, true); }
// vendors walking the aisles in white jackets
const VENDORS = []; for (let i = 0; i < 4; i++) { const P = makePerson("UMP", "", "vendor"); P.torso.children[0].material = M(0xf0eee6); setPose(P, "stand"); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.28), M(0x9a7a4a)); bk.position.set(0, -0.05, -0.12); P.handL.add(bk); VENDORS.push({ P, S: SECTIONS[i % 5], t: 0.2 + i * 0.2, dir: 1, row: 4 + i * 3, item: i % 2 ? "Score cards" : "Peanuts" }); }

// ---------- you: walking, sitting, money, what you hold ----------
const ME = { x: 0, y: 0, z: 0, seat: null, money: 200, ticket: null, inside: false, holding: [] }; let yaw = 0, pitch = 0, vrYaw = 0, started = false, comfortVig = true; const keys = {}, prevB = {};
const VIG = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture((() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 50, 128, 128, 128); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.6, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c; })()), transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
VIG.position.z = -0.35; VIG.renderOrder = 998; camera.add(VIG);
const cents = c => c >= 100 ? "$" + (c / 100).toFixed(2) : c + "¢";
function segHit(ax, az, bx, bz, cx, cz, dx, dz) { const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false; const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1; }
function tryMove(nx, nz) { for (const W of WALLS) if (segHit(ME.x, ME.z, nx, nz, W.a.x, W.a.z, W.b.x, W.b.z) && W.h > ME.y + 0.5) return; const [u, w] = toUW(nx, nz), [u0, w0] = toUW(ME.x, ME.z);
  if (w0 < LOT.w0 !== w < LOT.w0 && Math.abs(u - GATE_U) < 3 && !ME.ticket) { say("The ticket taker stops you: \"Ticket, please.\" The windows are just along the street."); return; }
  if (w0 < LOT.w0 !== w < LOT.w0 && Math.abs(u - GATE_U) < 3 && ME.ticket && !ME.inside) { ME.inside = true; say(`The ticket taker tears your ${ME.ticket} ticket and waves you in.`); drawPanel(); }
  const fy = floorAt(nx, nz); if (fy - ME.y > 0.55) return; ME.x = nx; ME.z = nz; }
// the things you can do, with the nearest one in front of you
const ACTS = [{ name: "Ticket window: grand stand, $1.00", p: BOOTH.clone().addScaledVector(UA, -1).addScaledVector(WA, -0.9), ok: () => !ME.ticket, act: () => buy("grand stand", 100, () => { ME.ticket = "grand stand"; enterPark(); }) },
  { name: "Ticket window: bleachers & standing room, 50¢", p: BOOTH.clone().addScaledVector(UA, 1).addScaledVector(WA, -0.9), ok: () => !ME.ticket, act: () => buy("bleacher", 50, () => { ME.ticket = "bleacher"; enterPark(); }) },
  { name: "Score card, 5¢", p: STAND.clone().addScaledVector(UA, -0.5).addScaledVector(WA, -1), ok: () => !ME.holding.includes("score card"), act: () => buy("score card", 5, () => holdItem("score card")) },
  { name: "Bag of peanuts, 5¢", p: STAND.clone().addScaledVector(UA, -0.5), ok: () => !ME.holding.includes("peanuts"), act: () => buy("bag of peanuts", 5, () => holdItem("peanuts")) },
  { name: "Glass of lemonade, 5¢", p: STAND.clone().addScaledVector(UA, -0.5).addScaledVector(WA, 1), ok: () => true, act: () => buy("glass of lemonade", 5, () => say("Cold lemonade, drunk at the stand; the glass goes back on the counter.")) }];
function buy(what, c, then) { if (ME.money < c) { say(`You haven't enough money for a ${what}.`); return; } ME.money -= c; then(); say(`You pay ${cents(c)} for a ${what}. You have ${cents(ME.money)} left.`); drawPanel(); }
let NEAR = null;
function findNear() { const p = V3(ME.x, 0, ME.z); let best = null, bd = 2.4; for (const A of ACTS) { if (!A.ok()) continue; const d = A.p.distanceTo(p); if (d < bd) { bd = d; best = A; } }
  for (const V of VENDORS) { const d = V.P.G.position.distanceTo(V3(ME.x, V.P.G.position.y, ME.z)); if (d < 2.2 && Math.abs(V.P.G.position.y - ME.y) < 1.5) { const item = V.item === "Peanuts" ? "peanuts" : "score card"; if (!ME.holding.includes(item)) { best = { name: `${V.item}! 5¢ from the vendor`, act: () => buy(item === "peanuts" ? "bag of peanuts" : "score card", 5, () => holdItem(item)) }; bd = d; } } }
  if (!best && !ME.seat && ME.inside) { let bs = null, b2 = 1.0; for (const s of SEATS) { if (s.taken) continue; const d = Math.hypot(s.p.x - ME.x, s.p.z - ME.z); if (d < b2 && Math.abs(s.p.y - 0.42 - ME.y) < 0.5) { b2 = d; bs = s; } } if (bs) best = { name: `Sit down (${bs.sec}, row ${bs.row + 1})`, act: () => sit(bs) }; }
  if (ME.seat) best = { name: "Stand up", act: () => standUp() }; if ((best && best.name) !== (NEAR && NEAR.name)) { NEAR = best; drawPanel(); } NEAR = best; }
function enterPark() { buildCrowd(); buildPlayers(); }
function sit(s) { enterPark(); if (ME.ticket === "bleacher" && s.sec.includes("grandstand")) { say("An usher checks your ticket: \"Bleacher ticket? This is the grand stand, friend.\""); return; } ME.seat = s; s.taken = true; ME.x = s.p.x; ME.z = s.p.z; yaw = s.face; vrYaw = s.face; say(`You sit down: ${s.sec}, row ${s.row + 1}. Move to stand up.`); drawPanel(); }
function standUp() { if (!ME.seat) return; ME.seat.taken = false; const s = ME.seat; ME.seat = null; const fwd = V3(-Math.sin(s.face), 0, -Math.cos(s.face)); ME.x = s.p.x + fwd.x * 0.35; ME.z = s.p.z + fwd.z * 0.35; ME.y = floorAt(ME.x, ME.z); drawPanel(); }
// the score card: the batting orders as printed, held in your left hand in VR
const CARD = (() => { const c = document.createElement("canvas"); c.width = 768; c.height = 1024; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 })); m.visible = false; return { c, t, m }; })();
// the score card fills in as the game goes: one box per batter per inning, in the scoring shorthand of the day
function drawCard(S) { const g = CARD.c.getContext("2d"); g.fillStyle = "#f0e8d0"; g.fillRect(0, 0, 768, 1024); g.strokeStyle = "#3a2a1a"; g.lineWidth = 4; g.strokeRect(8, 8, 752, 1008); g.fillStyle = "#2a1e14"; g.textAlign = "center"; g.font = "bold 30px Georgia"; g.fillText("OFFICIAL SCORE CARD", 384, 50); g.font = "18px Georgia"; g.fillText("Huntington Avenue Base Ball Grounds · World's Championship Series", 384, 76); g.fillText("Thursday, October 1, 1903 · Price 5 Cents", 384, 98);
  let y0 = 130; for (const [tm, nm] of [["PIT", "PITTSBURG"], ["BOS", "BOSTON"]]) { g.textAlign = "left"; g.font = "bold 22px Georgia"; g.fillText(nm, 24, y0 + 6); g.font = "16px Georgia"; g.textAlign = "center"; for (let k = 0; k < 9; k++) g.fillText(String(k + 1), 300 + k * 50, y0 + 6); g.fillText("R", 748 - 10, y0 + 6);
    LINEUP[tm].forEach(([n, p], i) => { const y = y0 + 20 + i * 40; g.textAlign = "left"; g.font = "17px Georgia"; g.fillStyle = "#2a1e14"; g.fillText(`${i + 1}. ${n.split(" ").pop()}`, 24, y + 26); g.fillText(p, 210, y + 26); for (let k = 0; k < 9; k++) { g.strokeStyle = "#9a8a7a"; g.lineWidth = 1; g.strokeRect(278 + k * 50, y + 2, 46, 36); } });
    for (const c of (S ? S.card : []).filter(c => c.tm === tm)) { const y = y0 + 20 + c.slot * 40; g.textAlign = "center"; g.fillStyle = c.code === "K" || c.code === "Kc" ? "#8a1a1a" : "#1a1a6a"; g.font = "bold 17px Georgia"; g.fillText(c.code, 301 + c.inn * 50, y + 26); if (c.pinch) { g.font = "italic 12px Georgia"; g.fillText(c.pinch, 301 + c.inn * 50, y + 38); } }
    g.fillStyle = "#2a1e14"; g.font = "bold 20px Georgia"; g.textAlign = "center"; const runs = S ? S.score[tm] : 0; g.fillText(String(runs), 738, y0 + 200); y0 += 420; }
  g.font = "italic 15px Georgia"; g.textAlign = "center"; g.fillText("Umpires: Connolly (American League), O'Day (National League)", 384, 990); CARD.t.needsUpdate = true; CARD.url = CARD.c.toDataURL(); }
function markCard() { drawCard(GAME.st); }
drawCard(null);
const BAG = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 8), M(0xc8a878)); BAG.visible = false;
function holdItem(item) { ME.holding.push(item); if (item === "score card") CARD.m.visible = true; if (item === "peanuts") BAG.visible = true; }

// ---------- names: look at a player, the umpire, or part of the park ----------
const SIGHTS = [{ name: "The tool shed", p: dir(0.05).multiplyScalar(fenceDist(3) - 4).setY(1.6), r: 3, text: "The groundskeeper's tool shed, out in deepest centre field and in play: a ball that rolled under or behind it was live. Today it is behind the standing crowd." },
  { name: "The scoreboard", p: dir(33 * Math.PI / 180).multiplyScalar(fenceDist(33)).setY(FENCE_H + 2), r: 6, text: "Mounted above the right-field fence. Boys hang the numbers for each half-inning by hand." },
  { name: "The ropes and the overflow crowd", p: dir(-0.3).multiplyScalar(ropeDist(-17)).setY(1), r: 25, text: "The park seats about 9,000; 16,242 paid today. The rest stand in the outfield behind ropes, and on the bank and the fence in left. The ground rule for the day: a ball hit into the crowd is a three-base hit." },
  { name: "The Royal Rooters", p: ROOTERS_AT, r: 10, text: "Boston's most devoted fans, led by Michael 'Nuf Ced' McGreevy, who keeps a saloon on Columbus Avenue. They have reserved seats in the bleachers behind first base, and they sing." },
  { name: "The South End Grounds", p: P2(-128, 10, 8), r: 30, text: "Across the railroad tracks: the home of Boston's National League club, the Beaneaters. When the American League put a team here in 1901, it built this park almost next door." },
  { name: "The Boston Storage Warehouse", p: P2(165, 35, 15), r: 40, text: "A huge brick storage warehouse on Huntington Avenue, beyond left field." },
  { name: "Huntington Avenue", p: P2(137, 60, 2), r: 30, text: "Electric trolleys run down the middle of the avenue; most of the crowd came by streetcar." },
  { name: "The covered grand stand", p: P2(-25, -25, 6), r: 18, text: "A roof of expanded metal and roughcast concrete on 28-ft columns, the rest of it wood. $1 today." },
  { name: "The wire screen", p: P2(-12, -12, 3), r: 6, text: "Wire netting behind home plate, to keep foul balls out of the best seats." }];
const LABEL = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 64; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.renderOrder = 20; sp.visible = false; scene.add(sp); return { c, t, sp, text: "" }; })();
let LOOK = null; const _eye = V3(0, 0, 0), _dir = V3(0, 0, 0);
function updateLook() { camera.getWorldPosition(_eye); camera.getWorldDirection(_dir); let best = null, bs = 1e9; const consider = (name, text, p, r) => { const v = p.clone().sub(_eye), d = v.length(); if (d < 0.5 || d > 200) return; const ang = Math.acos(clampN(v.dot(_dir) / d, -1, 1)), tol = Math.atan(r / d) + 0.015; if (ang > tol) return; const s = ang / tol + d * 0.002; if (s < bs) { bs = s; best = { name, text, p }; } };
  for (const P of Object.values(PEOPLE)) consider(P.name, BIO[P.name], P.G.position.clone().add(V3(0, 1.1, 0)), 0.45); for (const S of SIGHTS) consider(S.name, S.text, S.p, S.r);
  if (best) { if (best.name !== LABEL.text) { const g = LABEL.c.getContext("2d"); g.clearRect(0, 0, 512, 64); g.font = "bold 34px Georgia"; const w = Math.min(500, g.measureText(best.name).width + 30); g.fillStyle = "rgba(20,18,14,0.8)"; g.beginPath(); g.roundRect((512 - w) / 2, 4, w, 56, 14); g.fill(); g.fillStyle = "#f4ecc8"; g.textAlign = "center"; g.fillText(best.name, 256, 44); LABEL.t.needsUpdate = true; LABEL.text = best.name; }
    const d = best.p.distanceTo(_eye); LABEL.sp.visible = true; LABEL.sp.position.copy(best.p).add(V3(0, 0.25 + d * 0.02, 0)); LABEL.sp.scale.set(0.3 * d, 0.0375 * d, 1); } else LABEL.sp.visible = false;
  const ch = (LOOK && LOOK.name) !== (best && best.name); LOOK = best; return ch; }

// ---------- the panel: on your left wrist in VR, top left on a screen ----------
const PANEL = (() => { const c = document.createElement("canvas"); c.width = 640; c.height = 800; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const me = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); me.renderOrder = 10; return { c, t, me }; })();
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:12px;top:12px;width:400px;max-height:94vh;overflow:auto;z-index:2;background:rgba(24,20,14,.86);color:#f2eee4;font:14px/1.45 Georgia,serif;padding:12px 14px;border-radius:10px;display:none"; document.body.appendChild(HUD);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2;background:rgba(24,20,14,.9);color:#f2eee4;font:15px Georgia,serif;padding:10px 14px;border-radius:10px;display:none;max-width:70vw"; document.body.appendChild(MSG); let msgT = 0;
// in VR, messages float in front of you for a few seconds (the screen's message bar can't be seen in the headset)
const TOAST = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 192; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.169), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false, fog: false })); m.position.set(0, -0.28, -1.0); m.renderOrder = 999; m.visible = false; camera.add(m); return { c, t, m }; })();
function toast(text) { const g = TOAST.c.getContext("2d"); g.clearRect(0, 0, 1024, 192); g.fillStyle = "rgba(24,20,14,0.9)"; g.beginPath(); g.roundRect(0, 0, 1024, 192, 28); g.fill(); g.fillStyle = "#f4ecc8"; g.font = "34px Georgia"; const words = text.split(" "); let line = "", y = 52; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 42; if (y > 180) break; } line += w + " "; } if (y <= 180) g.fillText(line, 32, y); TOAST.t.needsUpdate = true; }
const say = (t, s = 4) => { MSG.textContent = t; MSG.style.display = "block"; msgT = s; toast(t); TOAST.m.visible = renderer.xr.isPresenting; };
function wrap(g, text, x, y, w, lh) { const words = text.split(" "); let line = ""; for (const wd of words) { if (g.measureText(line + wd).width > w) { g.fillText(line, x, y); line = ""; y += lh; } line += wd + " "; } g.fillText(line, x, y); return y + lh; }
let preT = 8 * 60; const preStr = () => preT > 0 ? `First pitch in ${Math.floor(preT / 60)}:${String(Math.floor(preT % 60)).padStart(2, "0")}` : "Play ball!";
const BTN = [{ id: "next", label: "Next play", x: 16, y: 600, w: 196, h: 56 }, { id: "half", label: "Next half-inning", x: 222, y: 600, w: 236, h: 56 }, { id: "pause", label: "Pause", x: 468, y: 600, w: 156, h: 56 },
  ...Array.from({ length: 9 }, (_, k) => ({ id: "inn" + (k + 1), label: String(k + 1), x: 16 + k * 68, y: 668, w: 60, h: 50 })), { id: "pace", label: "Pace", x: 16, y: 730, w: 300, h: 50 }, { id: "vig", label: "Vignette", x: 326, y: 730, w: 298, h: 50 }];
let HOVER = null;
function pressBtn(id) { if (id === "next") { if (!GAME.on) startGame(); else nextPlay(); } else if (id === "half") { if (!GAME.on) startGame(); nextHalf(); } else if (id === "pause") { GAME.paused = !GAME.paused; say(GAME.paused ? "Game paused" : "Game resumed"); }
  else if (id.startsWith("inn")) toInning(+id.slice(3)); else if (id === "pace") { paceKey = paceKey === "real" ? "brisk" : "real"; say(paceKey === "real" ? "Real time: the game's own pace (it took 1:55)" : "Brisk: shorter waits between pitches and batters"); } else if (id === "vig") { comfortVig = !comfortVig; } drawPanel(); }
const gameLine = () => { const S = GAME.st; if (!GAME.on || !S) return preStr(); const h = GAME.phase === "change" ? "Between innings" : GAME.phase === "over" ? "Final" : HALF_NAME(S.half); return `Pittsburg ${S.score.PIT}, Boston ${S.score.BOS} · ${h}${GAME.phase === "over" ? "" : " · " + S.outs + " out"}`; };
const atBat = () => { const S = GAME.st; if (!GAME.on || !S || GAME.phase === "over" || !GAME.batter) return ""; const r = [1, 2, 3].filter(b => S.bases[b]).map(b => `${S.bases[b]} on ${["", "first", "second", "third"][b]}`); return `At bat: ${GAME.batter.short} · count ${GAME.balls}-${GAME.strikes}${r.length ? " · " + r.join(", ") : ""}`; };
function drawPanel() { const g = PANEL.c.getContext("2d"); g.clearRect(0, 0, 640, 800); g.fillStyle = "rgba(30,24,16,0.92)"; g.beginPath(); g.roundRect(0, 0, 640, 800, 24); g.fill(); g.fillStyle = "#e8c070"; g.font = "bold 26px Georgia"; g.fillText(gameLine(), 24, 42);
  g.fillStyle = "#c8e0b8"; g.font = "20px Georgia"; g.fillText(atBat(), 24, 72); g.fillStyle = "#f0ece0"; g.font = "21px Georgia"; let y = wrap(g, GAME.last || "", 24, 104, 592, 26) + 6;
  g.fillStyle = "#c8c4b8"; g.font = "18px Georgia"; y = wrap(g, `${cents(ME.money)}${ME.ticket ? " · " + ME.ticket + " ticket" : " · no ticket"}${ME.holding.length ? " · " + ME.holding.join(", ") : ""}${ME.seat ? ` · seated: ${ME.seat.sec}, row ${ME.seat.row + 1}` : ""}`, 24, y + 4, 592, 22);
  if (NEAR) { g.fillStyle = "#9ad88a"; g.font = "bold 19px Georgia"; y = wrap(g, "Trigger / E: " + NEAR.name, 24, y + 2, 592, 24); }
  if (LOOK) { g.fillStyle = "#e8c070"; g.font = "bold 20px Georgia"; g.fillText(LOOK.name, 24, y + 6); g.fillStyle = "#e0dcd0"; g.font = "17px Georgia"; const words = LOOK.text.split(" "); let line = "", yy = y + 30; for (const w of words) { if (g.measureText(line + w).width > 592) { if (yy > 580) break; g.fillText(line, 24, yy); line = ""; yy += 21; } line += w + " "; } if (yy <= 580) g.fillText(line, 24, yy); }
  for (const B of BTN) { const on = B.id === "pause" ? GAME.paused : B.id === "pace" ? paceKey === "brisk" : B.id === "vig" ? comfortVig : false; g.fillStyle = HOVER === B.id ? "#8a6a2a" : on ? "#5a4a2a" : "#3a3226"; g.beginPath(); g.roundRect(B.x, B.y, B.w, B.h, 10); g.fill(); g.fillStyle = "#f4ecc8"; g.font = "bold 21px Georgia"; g.textAlign = "center";
    const lab = B.id === "pause" ? (GAME.paused ? "Resume" : "Pause") : B.id === "pace" ? (paceKey === "real" ? "Pace: real time" : "Pace: brisk") : B.id === "vig" ? (comfortVig ? "Vignette: on" : "Vignette: off") : B.id.startsWith("inn") ? B.label : B.label; g.fillText(lab, B.x + B.w / 2, B.y + B.h / 2 + 7); g.textAlign = "left"; }
  g.fillStyle = "#a8a498"; g.font = "15px sans-serif"; g.fillText("Point your right hand here and pull the trigger · innings: jump to the top of that inning", 18, 795); PANEL.t.needsUpdate = true;
  HUD.innerHTML = `<b style="color:#e8c070">${gameLine()}</b><br><span style="color:#c8e0b8">${atBat()}</span><div style="margin:4px 0">${GAME.last || ""}</div>
    <div style="color:#c8c4b8;font-size:12px">${cents(ME.money)}${ME.ticket ? " · " + ME.ticket + " ticket" : " · no ticket yet: the windows are on the street"}${ME.holding.length ? " · holding " + ME.holding.join(", ") : ""}${ME.seat ? ` · seated: ${ME.seat.sec}, row ${ME.seat.row + 1}` : ""}</div>
    ${NEAR ? `<div style="color:#9ad88a;margin-top:4px"><b>E:</b> ${NEAR.name}</div>` : ""}${LOOK ? `<div style="margin-top:6px"><b style="color:#e8c070">${LOOK.name}</b><br>${LOOK.text}</div>` : ""}
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${BTN.map(B => `<button data-b="${B.id}" style="font:12px Georgia;padding:3px 7px;border-radius:5px;border:1px solid #8a7a50;background:#3a3226;color:#f4ecc8;cursor:pointer">${B.id === "pause" ? (GAME.paused ? "Resume" : "Pause") : B.id === "pace" ? (paceKey === "real" ? "Pace: real time" : "Pace: brisk") : B.id === "vig" ? (comfortVig ? "Vignette: on" : "Vignette: off") : B.id.startsWith("inn") ? "Inning " + B.label : B.label}</button>`).join("")}</div>
    ${ME.holding.includes("score card") ? `<div style="margin-top:6px"><img src="${CARD.url}" style="width:100%;border-radius:4px"></div>` : ""}
    <div style="margin-top:6px;color:#a8a498;font-size:12px">W A S D walk · drag to look · E buy / sit / stand · N next play · H next half-inning · 1-9 jump to an inning · space pause · B pace · V vignette · G start the game now</div>
    <div style="margin-top:4px;color:#7a7468;font-size:10px">Play-by-play: the information used here was obtained free of charge from and is copyrighted by Retrosheet (www.retrosheet.org).</div>`;
  HUD.querySelectorAll("[data-b]").forEach(b => b.onclick = e => { e.stopPropagation(); pressBtn(b.dataset.b); }); }
// the scoreboard: the line score as it stands
function drawScore() { const g = SCORE.c.getContext("2d"); g.fillStyle = "#1e2a1e"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#e8e4d0"; g.font = "bold 34px Georgia"; g.textAlign = "center"; for (let i = 0; i < 9; i++) g.fillText(String(i + 1), 230 + i * 78, 50); g.fillText("R", 960, 50); g.textAlign = "left"; g.fillText("PITTSBURG", 20, 130); g.fillText("BOSTON", 20, 210); g.textAlign = "center";
  for (let t = 0; t < 2; t++) { let tot = 0; SCORE.line[t].forEach((r, i) => { g.fillText(String(r), 230 + i * 78, 130 + t * 80); tot += r; }); if (SCORE.line[t].length) g.fillText(String(tot), 960, 130 + t * 80); } SCORE.t.needsUpdate = true; }
drawScore();

// ---------- controls ----------
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE" && NEAR) NEAR.act(); if (e.code === "KeyV") { comfortVig = !comfortVig; say(comfortVig ? "Comfort vignette on" : "Comfort vignette off"); } if (e.code === "KeyG") { preT = 0; startGame(); } if (e.code === "KeyN") pressBtn("next"); if (e.code === "KeyH") pressBtn("half"); if (e.code === "Space") pressBtn("pause"); if (e.code === "KeyB") pressBtn("pace"); if (/^Digit[1-9]$/.test(e.code)) toInning(+e.code.slice(5)); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; begin(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.4, 1.4); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
const HANDS = [0, 1].map(i => { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.11), SKIN); grip.add(hand); const H = { grip, src: null };
  grip.addEventListener("connected", e => { H.src = e.data; if (e.data.handedness === "left") { PANEL.me.position.set(0, 0.05, 0.12); PANEL.me.rotation.set(-Math.PI / 2 + 0.8, 0, 0); grip.add(PANEL.me); } else { CARD.m.position.set(0, 0.02, -0.1); CARD.m.rotation.set(-1.0, 0, 0); grip.add(CARD.m); BAG.position.set(0.05, 0, -0.05); grip.add(BAG); } }); return H; });
function begin() { audioInit(); if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); const s = P2(GATE_U - 14, -46); ME.x = s.x; ME.z = s.z; yaw = vrYaw = ROT_U + 0.25; HUD.style.display = renderer.xr.isPresenting ? "none" : "block"; drawPanel(); say("Rogers Street, Boston, a little before game time. Buy a ticket at the green booth ahead (walk up to its window and pull the trigger), then go in through the gate.", 9); }
document.getElementById("intro")?.addEventListener("click", begin);
const VRB = document.getElementById("vr"); if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); DIAG.stage("entering VR"); await renderer.xr.setSession(s); frame = 0; begin(); HUD.style.display = "none"; }; });

DIAG.stage("merging the scenery");
// ---------- drawing it cheaply: everything that never moves is merged into one mesh per material ----------
{ const groups = new Map(), keep = new Set([window.FLAG, BALL]); for (const o of [...scene.children]) { if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || keep.has(o)) continue; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); }
  scene.updateMatrixWorld(true);
  for (const [mat, list] of groups) { if (list.length < 2) continue; const pos = [], nor = [], uv = []; let shadow = false;
    for (const o of list) { const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0); shadow = shadow || o.castShadow; scene.remove(o); o.geometry.dispose(); g.dispose(); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); const mm = new THREE.Mesh(mg, mat); mm.castShadow = shadow; mm.receiveShadow = true; scene.add(mm); } }

DIAG.stage("drawing the first frame");
// ---------- pointing at the wrist menu with the right hand ----------
const CTRL = [0, 1].map(i => { const c = renderer.xr.getController(i); rig.add(c); c.addEventListener("connected", e => { c.userData.hand = e.data.handedness; }); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xf4ecc8 })); ln.visible = false; c.add(ln); c.userData.line = ln; return c; });
const _pray = new THREE.Raycaster(), _rm = new THREE.Matrix4(); let POINT_HIT = null;
function updatePointer() { POINT_HIT = null; if (!renderer.xr.isPresenting || !PANEL.me.parent) { if (HOVER) { HOVER = null; drawPanel(); } return; } const c = CTRL.find(c => c.userData.hand === "right"); if (!c) return;
  _rm.identity().extractRotation(c.matrixWorld); _pray.ray.origin.setFromMatrixPosition(c.matrixWorld); _pray.ray.direction.set(0, 0, -1).applyMatrix4(_rm); const h = _pray.intersectObject(PANEL.me, false)[0]; c.userData.line.visible = !!h;
  let id = null; if (h && h.uv) { const x = h.uv.x * 640, y = (1 - h.uv.y) * 800; const B = BTN.find(B => x >= B.x && x <= B.x + B.w && y >= B.y && y <= B.y + B.h); id = B ? B.id : null; c.userData.line.scale.z = h.distance / c.matrixWorld.getMaxScaleOnAxis(); POINT_HIT = h; }
  if (id !== HOVER) { HOVER = id; drawPanel(); } }

// ---------- the loop ----------
const clock = new THREE.Clock(), _fq = new THREE.Quaternion(); let frame = 0, panelT = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.05), vr = renderer.xr.isPresenting; let mx = 0, my = 0, run = false, act = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) comfortVig = !comfortVig; prevB.y = bY; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const tr = gp.buttons[0]?.pressed; if (tr && !prevB.t) act = true; prevB.t = tr; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.ArrowLeft) yaw += dt * 1.5; if (keys.ArrowRight) yaw -= dt * 1.5; }
  if (!started) { renderer.render(scene, camera); return; } if (act && HOVER) pressBtn(HOVER); else if (act && POINT_HIT) {} else if (act && NEAR) NEAR.act();
  camera.getWorldQuaternion(_fq); const moving = !!(mx || my);
  if (moving && ME.seat) standUp(); if (moving && !ME.seat) { const f = V3(0, 0, -1).applyQuaternion(_fq); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 3.2 : 1.4; tryMove(ME.x + (f.x * -my + sd.x * mx) * sp * dt, ME.z + (f.z * -my + sd.z * mx) * sp * dt); }
  const inside = toUW(ME.x, ME.z)[1] > LOT.w0 + 0.3; CROWD.g.visible = inside; for (const P of Object.values(PEOPLE)) P.G.visible = inside; for (const V of VENDORS) V.P.G.visible = inside;
  const fy = ME.seat ? ME.seat.p.y - 0.42 : floorAt(ME.x, ME.z); ME.y = lerpN(ME.y, fy, 0.35);
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (vr && ME.seat) rig.position.y = ME.seat.p.y + 0.78 - camera.position.y; if (!vr) { camera.position.set(0, ME.seat ? 0.42 + 0.78 : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  if (window.CAM_OVERRIDE) { rig.position.copy(CAM_OVERRIDE.p); rig.rotation.set(0, 0, 0); camera.position.set(0, 0, 0); camera.lookAt(CAM_OVERRIDE.t); }
  VIG.material.opacity = comfortVig && moving ? lerpN(VIG.material.opacity, run ? 0.7 : 0.45, 0.1) : lerpN(VIG.material.opacity, 0, 0.15); VIG.visible = VIG.material.opacity > 0.01;
  for (const V of VENDORS) { const S = V.S; V.t += V.dir * dt * 0.6 / S.L; if (V.t > 0.95 || V.t < 0.05) V.dir *= -1; const p = S.o.clone().addScaledVector(S.A, V.t * S.L).addScaledVector(S.out, (V.row + 0.15) * S.rowD); V.P.G.position.set(p.x, (V.row + 1) * S.rowH, p.z); V.P.G.rotation.y = Math.atan2(-S.A.x * V.dir, -S.A.z * V.dir); }
  if (window.FLAG) { const pa = FLAG.geometry.attributes.position, tt = performance.now() / 1000; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) + 1.7; pa.setZ(i, Math.sin(x * 2.2 - tt * 4) * 0.12 * x / 3.4); } pa.needsUpdate = true; }
  if (preT > 0) { preT -= dt; if (preT <= 0) { say("\"Play ball!\" Umpire Connolly calls it, and Cy Young steps onto the pitcher's slab.", 6); startGame(); } }
  updateGame(dt); updatePointer();
  frame++; if (frame === 2) DIAG.stage(vr ? "running in VR" : "running"); if (frame === 600) DIAG.stable(); let redraw = false; if (frame % 5 === 0) { redraw = updateLook(); findNear(); } panelT -= dt; if (panelT <= 0 || redraw) { panelT = 1; drawPanel(); }
  msgT -= dt; if (msgT <= 0) { MSG.style.display = "none"; TOAST.m.visible = false; } renderer.render(scene, camera); });

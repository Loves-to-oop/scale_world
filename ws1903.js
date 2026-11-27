// ws1903.js -- The first World Series, Game 1: Thursday, October 1, 1903, at the Huntington Avenue Baseball Grounds in Boston. Pittsburgh
// Pirates 7, Boston Americans 3. You arrive on Rogers Street, buy a ticket, go in under the grandstand, and walk anywhere or take a seat. The
// park is rebuilt from the descriptions and photographs: a covered grandstand behind home plate on 28-ft columns, open bleachers down both
// lines, a 14-ft board fence, a field 530 ft deep to centre with a tool shed in play, and an overflow crowd of thousands standing in the
// outfield behind ropes (a ball hit into them was a ground-rule triple). Every play of the game comes from the official record (Retrosheet).
// Built into ws1903.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.xr.enabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(renderer.domElement);
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

// ---------- the lot, in a frame along the foul lines: u runs out the third-base line (north-west), w out the first-base line (north-east) ----------
const UA = dir(-D45), WA = dir(D45), P2 = (u, w, y = 0) => V3(u * UA.x + w * WA.x, y, u * UA.z + w * WA.z), toUW = (x, z) => [x * UA.x + z * UA.z, x * WA.x + z * WA.z];
const ROT_U = Math.atan2(-UA.x, -UA.z), ROT_W = Math.atan2(-WA.x, -WA.z);
// Rogers Street behind the third-base side, the railroad behind the first-base side, Huntington Avenue beyond left field
var GATE_U = 42, SCORE = { c: null, t: null, line: [[], []] };
const ROGERS = [-50, -38], RAIL = [-80, -42], HUNT = [128, 146], LOT = { u0: -40, w0: -38 };
const SKYC = 0xb8cce0; scene.background = new THREE.Color(SKYC); scene.fog = new THREE.Fog(SKYC, 250, 1400);
const hemi = new THREE.HemisphereLight(0xdde6f0, 0x6a5e48, 1.0); scene.add(hemi);
// October 1, about 3:30 in the afternoon in Boston: the sun in the south-west, about 30° up, behind the third-base stands
const sun = new THREE.DirectionalLight(0xfff0dc, 2.6); sun.position.set(-140, 120, 150); sun.castShadow = true; sun.shadow.mapSize.set(IS_HEADSET ? 2048 : 4096, IS_HEADSET ? 2048 : 4096);
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

// ---------- the crowd: 16,242 paid. About 7,000 seated, the rest standing in the outfield behind the ropes, on the left-field bank and on the fence ----------
// Men in dark suits and derbies or flat caps, a few straw boaters left over from summer, a few women in broad hats; the Royal Rooters, Boston's
// loudest fans, in the bleachers behind first base.
function mergeG(list) { const pos = [], nor = []; for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); } const m = new THREE.BufferGeometry(); m.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); return m; }
// kept very simple so a headset can draw thousands: seated fans are a few boxes, about 70 triangles each; the standing crowd far out in the
// outfield are flat cut-out figures facing the field, two triangles each
const STANDING = mergeG([new THREE.BoxGeometry(0.42, 0.64, 0.24).translate(0, 1.16, 0), new THREE.BoxGeometry(0.34, 0.86, 0.2).translate(0, 0.43, 0)]);
const SEATED = mergeG([new THREE.BoxGeometry(0.42, 0.62, 0.24).translate(0, 0.32, 0.02), new THREE.BoxGeometry(0.36, 0.14, 0.46).translate(0, 0.05, -0.2)]);
const HEADG = new THREE.IcosahedronGeometry(0.1, 0).scale(0.9, 1.1, 0.95), brim = r => new THREE.CircleGeometry(r, 7).rotateX(-Math.PI / 2);
const HATS = { derby: mergeG([new THREE.CylinderGeometry(0.085, 0.105, 0.1, 5).translate(0, 0.04, 0), brim(0.16)]), cap: mergeG([new THREE.BoxGeometry(0.21, 0.06, 0.22).translate(0, 0.02, 0), new THREE.BoxGeometry(0.18, 0.012, 0.09).translate(0, 0, -0.14)]),
  boater: mergeG([new THREE.CylinderGeometry(0.1, 0.1, 0.07, 5).translate(0, 0.035, 0), brim(0.17)]), lady: mergeG([new THREE.CylinderGeometry(0.1, 0.12, 0.09, 5).translate(0, 0.045, 0), brim(0.26)]) };
const CUTOUT = (() => { const c = document.createElement("canvas"), W = 64, H = 128, NV = 8; c.width = W * NV; c.height = H; const g = c.getContext("2d"), coats = ["#23252b", "#2c2b2e", "#1f2331", "#36312b", "#3b3731", "#4a4437", "#2a2a2a", "#56504a"];
  for (let v = 0; v < NV; v++) { const x0 = v * W, cx = x0 + W / 2, hat = v % 4; g.fillStyle = "#2a2622"; g.fillRect(cx - 10, 70, 8, 56); g.fillRect(cx + 2, 70, 8, 56); g.fillStyle = coats[v]; g.beginPath(); g.roundRect(cx - 14, 30, 28, 46, 6); g.fill(); g.fillStyle = "#d8a888"; g.beginPath(); g.arc(cx, 21, 8, 0, 7); g.fill(); g.fillStyle = "#e8e4dc"; g.fillRect(cx - 3, 30, 6, 6);
    g.fillStyle = hat === 2 ? "#ddd0a0" : hat === 3 ? "#5a3a40" : "#1c1c1c"; if (hat === 0) { g.beginPath(); g.ellipse(cx, 14, 8, 6, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 12, 14, 24, 2); } else if (hat === 1) { g.fillRect(cx - 9, 10, 18, 5); g.fillRect(cx - 9, 14, 22, 2); } else if (hat === 2) { g.fillRect(cx - 8, 9, 16, 6); g.fillRect(cx - 12, 14, 24, 2); } else { g.fillRect(cx - 7, 8, 14, 6); g.fillRect(cx - 16, 13, 32, 3); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; return { t, NV }; })();
const CROWD = { list: [] }; let ROOTERS_AT = null;
{ const coat = [0x22242a, 0x2a2a2e, 0x1e2230, 0x34302a, 0x3a3630, 0x2c2a26, 0x4a4436, 0x1a1a1c, 0x3e3a3a, 0x5a5448], hatCol = { derby: [0x1a1a1a, 0x2a2420, 0x3a2e24], cap: [0x3a3a3a, 0x4a4438, 0x2a2a30, 0x5a5040], boater: [0xe0d4a8], lady: [0x3a2a3a, 0x2a2a3a, 0x5a3a30, 0x7a6a5a] };
  const people = []; const hatOf = r => r < 0.6 ? "derby" : r < 0.88 ? "cap" : r < 0.94 ? "boater" : "lady";
  // seated: most seats filled, every one in the Royal Rooters' block, a few left empty (you can take one)
  for (const s of SEATS) { const rooter = s.sec === "first-base bleachers" && s.row < 9 && s.p.distanceTo(P2(-17, 70)) < 16; if (!rooter && R() < (IS_HEADSET ? 0.2 : 0.08)) continue; s.taken = true; people.push({ p: s.p.clone(), face: s.face, seated: true, hat: rooter ? "derby" : hatOf(R()), rooter }); }
  ROOTERS_AT = P2(-24, 64, 4);
  // standing: behind the ropes in the outfield, thicker toward the fence
  let n = 0; while (n < (IS_HEADSET ? 3000 : 6200)) { const d = (R() - 0.5) * 88, rd = ropeDist(d) + 1.2, fd = fenceDist(d) - 0.8; if (fd <= rd) continue; const dist = lerpN(rd, fd, Math.sqrt(R())), p = dir(d * Math.PI / 180).multiplyScalar(dist); people.push({ p: p.setY(0), face: Math.atan2(p.x, p.z) + (R() - 0.5) * 0.6, seated: false, hat: hatOf(R()) }); n++; }
  // and along the top of the left-field fence
  for (let d = -45; d < -12; d += 0.35) { if (R() < 0.35) continue; const p = dir(d * Math.PI / 180).multiplyScalar(fenceDist(d) + 0.1); people.push({ p: p.setY(FENCE_H - 0.42), face: Math.atan2(p.x, p.z), seated: true, hat: hatOf(R()), fence: true }); }
  // along the street outside, people still waiting to get in
  for (let i = 0; i < 160; i++) { const p = P2(GATE_U - 25 + R() * 50, -40.5 - R() * 3); people.push({ p: p.setY(0), face: Math.atan2(WA.x, WA.z) + (R() - 0.5) * 2, seated: false, hat: hatOf(R()), outside: true }); }
  const flatP = people.filter(P => (!P.seated || P.fence) && !P.outside), solid = people.filter(P => (P.seated && !P.fence) || P.outside); people.length = 0; people.push(...solid);
  const cut = []; for (let v = 0; v < CUTOUT.NV; v++) { const g = new THREE.PlaneGeometry(0.62, 1.8).translate(0, 0.9, 0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + v) / CUTOUT.NV); const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ map: CUTOUT.t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), flatP.length); im.count = 0; cut.push(im); }
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); for (const P of flatP) { const im = cut[R() * CUTOUT.NV | 0], sc = 0.9 + R() * 0.18, y = P.fence ? P.p.y - 0.55 : P.p.y; q.setFromAxisAngle(UP, Math.atan2(P.p.x, P.p.z) + (R() - 0.5) * 0.3); m4.compose(V3(P.p.x, y, P.p.z), q, V3(sc, sc, sc)); im.setMatrixAt(im.count, m4); im.setColorAt(im.count, c.setScalar(0.75 + R() * 0.3)); im.count++; CROWD.list.push(P); }
    for (const im of cut) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.receiveShadow = true; scene.add(im); } }
  const N = people.length, body = { s: new THREE.InstancedMesh(SEATED, M(0xffffff), N), t: new THREE.InstancedMesh(STANDING, M(0xffffff), N) }, head = new THREE.InstancedMesh(HEADG, M(0xffffff, { roughness: 0.7 }), N), hats = {}; for (const k in HATS) hats[k] = new THREE.InstancedMesh(HATS[k], M(0xffffff), N);
  const cnt = { s: 0, t: 0, h: 0 }, hc = {}; for (const k in HATS) hc[k] = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), one = V3(1, 1, 1);
  for (const P of people) { q.setFromAxisAngle(UP, P.face); const sc = 0.92 + R() * 0.16, s = V3(sc, sc, sc), bm = P.seated ? body.s : body.t, k = P.seated ? "s" : "t"; m4.compose(P.p, q, s); bm.setMatrixAt(cnt[k], m4); bm.setColorAt(cnt[k], c.set(P.hat === "lady" ? [0x4a3a4a, 0x3a3a4a, 0x5a4a3a, 0x6a5a6a][R() * 4 | 0] : coat[R() * coat.length | 0])); cnt[k]++;
    const hy = (P.seated ? 0.78 : 1.6) * sc, hp = P.p.clone().add(V3(0, hy, 0)); m4.compose(hp, q, s); head.setMatrixAt(cnt.h, m4); head.setColorAt(cnt.h, c.setHSL(0.06, 0.4 + R() * 0.1, 0.42 + R() * 0.12)); cnt.h++;
    const hm = hats[P.hat], hcl = hatCol[P.hat]; m4.compose(hp.clone().add(V3(0, 0.07 * sc, 0)), q, s); hm.setMatrixAt(hc[P.hat], m4); hm.setColorAt(hc[P.hat], c.set(hcl[R() * hcl.length | 0])); hc[P.hat]++; P.i = cnt.h - 1; CROWD.list.push(P); }
  for (const [im, n] of [[body.s, cnt.s], [body.t, cnt.t], [head, cnt.h], ...Object.keys(HATS).map(k => [hats[k], hc[k]])]) { im.count = n; im.castShadow = false; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; scene.add(im); }
  CROWD.n = people.length + flatP.length; }
// the ropes, on low stakes, that held the standing crowd back
{ let prev = null; for (let d = -45; d <= 45; d += 3) { const p = dir(d * Math.PI / 180).multiplyScalar(ropeDist(d)); box(0.06, 1.0, 0.06, MAT.wood, p.x, 0.5, p.z); if (prev) { const a = prev.clone().setY(0.92), b = p.clone().setY(0.92), cv = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(V3(0, -0.12, 0)), b); scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 6, 0.012, 4), MAT.rope)); } prev = p; } }

// ---------- the players and umpires ----------
// Boston at home in white, "BOSTON" arched in blue across the chest, red stockings; Pittsburgh in road grey with blue trim and blue stockings.
// Gloves were small then, the catcher's mitt a round pillow; catchers wore a wire mask and a chest protector; the umpires wore dark blue suits.
const TEAM = { BOS: { shirt: 0xf2f0e8, trim: 0x2a3a7a, sock: 0xb02a2a, cap: 0xf2f0e8, word: "BOSTON" }, PIT: { shirt: 0x9a9a96, trim: 0x22305a, sock: 0x22305a, cap: 0x22305a, word: "" }, UMP: { shirt: 0x1e2234, trim: 0x1e2234, sock: 0x1a1a1a, cap: 0x1e2234, word: "" } };
function chestTex(word, col) { return tex(256, 128, (g, w, h) => { g.fillStyle = "#" + new THREE.Color(col).getHexString(); g.fillRect(0, 0, w, h); if (!word) return; g.fillStyle = "#2a3a7a"; g.font = "bold 30px Georgia"; g.textAlign = "center"; const n = word.length; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.16; g.save(); g.translate(w / 2 + Math.sin(a) * 160, 104 - Math.cos(a) * 60); g.rotate(a); g.fillText(word[i], 0, 0); g.restore(); } }); }
const SKIN = M(0xd8a888, { roughness: 0.7 });
function makePerson(team, name, role) { const T = TEAM[team], G = new THREE.Group(), shirt = M(T.shirt), pant = M(T.shirt), sock = M(T.sock), shoe = M(0x1a1a1a), cap = M(T.cap), trim = M(T.trim);
  const chest = new THREE.MeshStandardMaterial({ map: chestTex(T.word, T.shirt), roughness: 0.85 }), torsoMats = [shirt, shirt, shirt, shirt, shirt, chest];
  const part = (geo, mat, x, y, z, P = G) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !IS_HEADSET || geo.type === "BoxGeometry" && geo.parameters.height > 0.5; P.add(m); return m; };
  const hips = new THREE.Group(); hips.position.y = 0.95; G.add(hips); const torso = new THREE.Group(); hips.add(torso); part(new THREE.BoxGeometry(0.4, 0.55, 0.24), torsoMats, 0, 0.3, 0, torso); part(new THREE.BoxGeometry(0.2, 0.05, 0.25), trim, 0, 0.56, 0, torso);
  const head = new THREE.Group(); head.position.y = 0.68; torso.add(head); part(new THREE.SphereGeometry(0.11, 14, 10), SKIN, 0, 0.04, 0, head);
  if (team === "UMP") part(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 14), cap, 0, 0.13, 0, head); else { part(new THREE.SphereGeometry(0.115, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1), cap, 0, 0.09, 0, head); part(new THREE.BoxGeometry(0.16, 0.012, 0.08), cap, 0, 0.09, -0.13, head); }
  const limb = (P, x, y, len, r, mat, mat2) => { const j = new THREE.Group(); j.position.set(x, y, 0); P.add(j); part(new THREE.CylinderGeometry(r, r * 0.9, len, 8), mat, 0, -len / 2, 0, j); const j2 = new THREE.Group(); j2.position.y = -len; j.add(j2); part(new THREE.CylinderGeometry(r * 0.9, r * 0.75, len, 8), mat2 || mat, 0, -len / 2, 0, j2); return [j, j2]; };
  const [aL, eL] = limb(torso, -0.25, 0.52, 0.29, 0.05, shirt, team === "UMP" ? shirt : SKIN), [aR, eR] = limb(torso, 0.25, 0.52, 0.29, 0.05, shirt, team === "UMP" ? shirt : SKIN);
  const [lL, kL] = limb(hips, -0.1, 0, 0.44, 0.075, pant, sock), [lR, kR] = limb(hips, 0.1, 0, 0.44, 0.075, pant, sock); for (const k of [kL, kR]) part(new THREE.BoxGeometry(0.1, 0.07, 0.24), shoe, 0, -0.47, -0.05, k);
  const handL = new THREE.Group(); handL.position.y = -0.3; eL.add(handL); const handR = new THREE.Group(); handR.position.y = -0.3; eR.add(handR);
  if (role === "C") { part(new THREE.SphereGeometry(0.12, 12, 8).scale(1, 1, 0.55), M(0x6a4a2a), 0, 0, 0, handL); part(new THREE.BoxGeometry(0.34, 0.4, 0.05), M(0x5a4a3a), 0, 0.28, -0.14, torso); part(new THREE.BoxGeometry(0.2, 0.22, 0.02), M(0x2a2a2a, { wireframe: true }), 0, 0.05, -0.13, head); }
  else if (team !== "UMP") part(new THREE.BoxGeometry(0.11, 0.14, 0.05), M(0x7a5a3a), 0, 0, 0, handL);
  G.userData = { name, team, role }; scene.add(G); const P = { G, hips, torso, head, aL, eL, aR, eR, lL, kL, lR, kR, handL, handR, name, team, role };
  setPose(P, "ready"); return P; }
function setPose(P, pose) { const z = (j, x, y = 0, zz = 0) => j.rotation.set(x, y, zz); z(P.torso, 0); z(P.aL, 0.1, 0, 0.15); z(P.aR, 0.1, 0, -0.15); z(P.eL, -0.2); z(P.eR, -0.2); z(P.lL, 0); z(P.lR, 0); z(P.kL, 0); z(P.kR, 0); P.hips.position.y = 0.95;
  if (pose === "ready") { z(P.torso, -0.35); P.hips.position.y = 0.86; z(P.lL, -0.35, 0, 0.12); z(P.lR, -0.35, 0, -0.12); z(P.kL, 0.55); z(P.kR, 0.55); z(P.aL, -0.6, 0, 0.2); z(P.aR, -0.6, 0, -0.2); z(P.eL, -0.6); z(P.eR, -0.6); }
  if (pose === "crouch") { P.hips.position.y = 0.5; z(P.torso, -0.25); z(P.lL, -1.5, 0, 0.3); z(P.lR, -1.5, 0, -0.3); z(P.kL, 2.0); z(P.kR, 2.0); z(P.aL, -1.2, 0, 0.3); z(P.eL, -0.3); }
  if (pose === "bat") { z(P.torso, -0.15, 0.5); z(P.lL, -0.15, 0, 0.18); z(P.lR, 0.1, 0, -0.18); z(P.kL, 0.25); z(P.kR, 0.2); z(P.aL, -1.2, 0.6, 0.5); z(P.aR, -1.3, -0.4, -0.2); z(P.eL, -1.0); z(P.eR, -1.1); }
  if (pose === "sit") { P.hips.position.y = 0.48; z(P.lL, -1.55); z(P.lR, -1.55); z(P.kL, 1.55); z(P.kR, 1.55); z(P.aL, -0.4, 0, 0.1); z(P.aR, -0.4, 0, -0.1); z(P.eL, -0.9); z(P.eR, -0.9); }
  if (pose === "stand") { z(P.aL, 0.05, 0, 0.12); z(P.aR, 0.05, 0, -0.12); } }
// the bat, a heavy ash bat of the time (they were thicker-handled than today's)
const BATG = new THREE.CylinderGeometry(0.034, 0.018, 0.86, 10).translate(0, 0.43, 0), BATM = M(0xc8a878, { roughness: 0.5 });
// the lineups (the official record)
const LINEUP = { PIT: [["Ginger Beaumont", "CF"], ["Fred Clarke", "LF"], ["Tommy Leach", "3B"], ["Honus Wagner", "SS"], ["Kitty Bransfield", "1B"], ["Claude Ritchey", "2B"], ["Jimmy Sebring", "RF"], ["Ed Phelps", "C"], ["Deacon Phillippe", "P"]],
  BOS: [["Patsy Dougherty", "LF"], ["Jimmy Collins", "3B"], ["Chick Stahl", "CF"], ["Buck Freeman", "RF"], ["Freddy Parent", "SS"], ["Candy LaChance", "1B"], ["Hobe Ferris", "2B"], ["Lou Criger", "C"], ["Cy Young", "P"]] };
const BIO = { "Cy Young": "Boston's pitcher, 36, already the winningest pitcher in baseball (28 wins this season; he'll finish his career with 511, still the record).", "Lou Criger": "Boston's catcher, Cy Young's favourite.", "Candy LaChance": "Boston's first baseman.", "Hobe Ferris": "Boston's second baseman.",
  "Jimmy Collins": "Boston's third baseman and manager, the best fielding third baseman of his day.", "Freddy Parent": "Boston's shortstop.", "Patsy Dougherty": "Boston's left fielder and leadoff man.", "Chick Stahl": "Boston's centre fielder.", "Buck Freeman": "Boston's right fielder, the American League's home-run leader this year with 13.",
  "Ginger Beaumont": "Pittsburgh's centre fielder and leadoff man, the National League's leader in hits this year (209).", "Fred Clarke": "Pittsburgh's left fielder and manager.", "Tommy Leach": "Pittsburgh's third baseman, small and fast.", "Honus Wagner": "Pittsburgh's shortstop, the National League batting champion this year (.355), already called the best player in the game.",
  "Kitty Bransfield": "Pittsburgh's first baseman.", "Claude Ritchey": "Pittsburgh's second baseman.", "Jimmy Sebring": "Pittsburgh's right fielder.", "Ed Phelps": "Pittsburgh's catcher.", "Deacon Phillippe": "Pittsburgh's pitcher, 25 wins this season.",
  "Tommy Connolly": "The American League umpire, working behind the plate (two umpires for the whole game: one behind the plate, one on the bases).", "Hank O'Day": "The National League umpire, working the bases." };
const FIELDPOS = { P: PM.clone().add(V3(0, 0.3, 0)), C: V3(0, 0, 0.9), "1B": B1.clone().add(dir(D45 + 0.25).multiplyScalar(3)).add(V3(0, 0, -2)), "2B": B2.clone().add(V3(4, 0, 4)), SS: B2.clone().add(V3(-5, 0, 5)), "3B": B3.clone().add(V3(1.5, 0, -1.5)), LF: dir(-0.45).multiplyScalar(76), CF: dir(0).multiplyScalar(90), RF: dir(0.45).multiplyScalar(70) };
const PEOPLE = {};
{ const face = (P, x, z, tx, tz) => { P.G.position.set(x, floorAt(x, z), z); P.G.rotation.y = Math.atan2(-(tx - x), -(tz - z)); };
  for (const [name, pos] of LINEUP.BOS) { const P = makePerson("BOS", name, pos); PEOPLE[name] = P; const p = FIELDPOS[pos]; face(P, p.x, p.z, 0, 0); if (pos === "C") { setPose(P, "crouch"); face(P, 0, 0.9, 0, -10); } if (pos === "P") setPose(P, "stand"); }
  LINEUP.PIT.forEach(([name, pos], i) => { const P = makePerson("PIT", name, pos); PEOPLE[name] = P; if (i === 0) { P.G.position.set(0.9, 0, 0.1); P.G.rotation.y = Math.PI / 2; setPose(P, "bat"); const bat = new THREE.Mesh(BATG, BATM); bat.rotation.x = -2.2; P.handR.add(bat); }
    else { const b = BENCH.PIT, off = WA.clone().multiplyScalar(-3.5 + i * 0.85); P.G.position.copy(b).add(off).add(UA.clone().multiplyScalar(-0.1)); P.G.rotation.y = ROT_U; setPose(P, "sit"); } });
  for (const [name, pos] of [["Tommy Connolly", "UMP_HP"], ["Hank O'Day", "UMP_B"]]) { const P = makePerson("UMP", name, pos); PEOPLE[name] = P; if (pos === "UMP_HP") { P.G.position.set(0.3, 0, 1.8); P.G.rotation.y = 0; setPose(P, "ready"); } else { const p = B1.clone().add(V3(3, 0, 3)); P.G.position.copy(p); P.G.rotation.y = Math.atan2(p.x, p.z); setPose(P, "ready"); } } }

// ---------- the neighbourhood: Rogers Street with its brick row houses, Huntington Avenue and its trolley line beyond left field, the huge
// Boston Storage Warehouse, the railroad yards behind first base, and across the tracks the South End Grounds, home of the National League club ----------
const BMAT = new Map(), WIN = { row: windowsT(6, 4), tall: windowsT(10, 8), low: windowsT(8, 2) };
function bldg(u0, w0, u1, w1, h, t, roofC = 0x4a4440) { const c = P2((u0 + u1) / 2, (w0 + w1) / 2), lu = Math.abs(u1 - u0), lw = Math.abs(w1 - w0), m = t.clone(); m.needsUpdate = true;
  const mat = BMAT.get(t) || (BMAT.set(t, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })), BMAT.get(t)); const b = new THREE.Mesh(new THREE.BoxGeometry(lu, h, lw), mat); b.position.set(c.x, h / 2, c.z); b.rotation.y = ROT_U + Math.PI / 2 - Math.PI / 2; b.rotation.y = Math.atan2(UA.z, -UA.x) * 0 + (-Math.atan2(UA.z, UA.x)); b.castShadow = b.receiveShadow = true; scene.add(b); return b; }
{ const r = mulberry(21);
  // Rogers Street: row houses on the far side, three and four storeys
  for (let u = -70; u < 210; u += 9 + r() * 6) { const w = 6 + r() * 4; bldg(u, -54, u + w, -70, 10 + (r() * 2 | 0) * 3.5, WIN.row); }
  // Huntington Avenue: the storage warehouse and a row of buildings beyond left field
  bldg(150, -20, 182, 90, 30, WIN.tall, 0x3a3a3a); for (let w = 95; w < 200; w += 14 + r() * 8) bldg(150, w, 170, w + 12, 12 + r() * 6, WIN.row); for (let w = -80; w < -22; w += 15) bldg(150, w, 168, w + 13, 11 + r() * 5, WIN.row);
  // the trolley tracks down the middle of Huntington Avenue, and a pair of trolley cars
  for (const o of [-0.75, 0.75, 2.45, 3.95]) { const a = P2(137 + o, -200), b = P2(137 + o, 300), L = a.distanceTo(b), m = box(L, 0.04, 0.07, MAT.iron, (a.x + b.x) / 2, 0.02, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); }
  for (const [w, k] of [[10, 0], [140, 1]]) { const c = P2(137 + k * 3.2, w), car = new THREE.Group(); car.position.set(c.x, 0, c.z); car.rotation.y = -Math.atan2(WA.z, WA.x); scene.add(car);
    box(10, 2.4, 2.4, M(0x7a5a2a), 0, 1.6, 0, 0, car); box(10.4, 0.3, 2.6, M(0x3a3028), 0, 3.0, 0, 0, car); box(9.6, 0.9, 2.42, M(0xd8c8a0), 0, 2.2, 0, 0, car); const pole = box(0.05, 3, 0.05, MAT.iron, 2, 4.4, 0, 0, car); pole.rotation.z = 0.6; }
  // the railroad yards behind the first-base side: tracks, freight cars, a locomotive
  for (let k = 0; k < 7; k++) { const u = -46 - k * 4.5; for (const o of [-0.72, 0.72]) { const a = P2(u + o, -200), b = P2(u + o, 300), L = a.distanceTo(b), m = box(L, 0.12, 0.08, MAT.iron, (a.x + b.x) / 2, 0.1, (a.z + b.z) / 2); m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); }
    for (let w = -120 + r() * 30; w < 260; w += 12 + r() * 30) { if (r() < 0.45) continue; const c = P2(u, w), fc = box(11, 3.2, 2.8, M([0x6a3424, 0x5a3020, 0x4a3a30, 0x7a4a2a][r() * 4 | 0]), c.x, 1.9, c.z); fc.rotation.y = -Math.atan2(WA.z, WA.x); } }
  // the South End Grounds across the tracks: the Beaneaters' covered grandstand
  { const c = P2(-128, 10), g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = -Math.atan2(WA.z, WA.x); scene.add(g); box(70, 12, 18, MAT.board, 0, 6, 0, 0, g); box(72, 0.4, 20, MAT.roof, 0, 12.4, 0, 0, g); for (let i = -3; i <= 3; i++) { const t = box(0.8, 3, 0.8, MAT.paint, i * 10, 14, 0, 0, g); } }
  // stables, breweries and works beyond right field, with smokestacks
  for (let u = -30; u < 140; u += 18 + r() * 10) bldg(u, 128, u + 15, 150 + r() * 15, 8 + r() * 10, WIN.low);
  for (const [u, w, h] of [[40, 160, 34], [110, 175, 28], [-60, 180, 40]]) { const c = P2(u, w), s = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, h, 12), new THREE.MeshStandardMaterial({ map: brickT, roughness: 0.9 })); s.position.set(c.x, h / 2, c.z); s.castShadow = true; scene.add(s); }
  // telegraph poles along Rogers Street
  for (let u = -60; u < 200; u += 30) { const c = P2(u, -51.5); box(0.22, 10, 0.22, MAT.wood, c.x, 5, c.z); const arm = box(2.2, 0.12, 0.12, MAT.wood, c.x, 9.3, c.z); arm.rotation.y = ROT_U; } }

// ---------- getting in: the ticket windows on Rogers Street, the gate, and the refreshment stand inside ----------
// Prices were doubled for the Series: $1 for the grandstand, 50 cents for the bleachers or standing room. Inside, 5 cents bought a score card
// (the batting orders printed, with a grid to keep score), a bag of peanuts, a glass of lemonade or a cigar.
const signT = (lines, w = 512, h = 256, bg = "#f0e6c8", fg = "#2a1e14") => tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = "center"; lines.forEach(([t, s], i) => { g.font = `bold ${s}px Georgia`; g.fillText(t, w / 2, 20 + (i + 1) * (h - 30) / (lines.length + 0.3)); }); });
const signMesh = (lines, w, h, p, ry, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signT(lines), roughness: 0.9, side: THREE.DoubleSide })); m.position.copy(p).setY(y); m.rotation.y = ry; scene.add(m); return m; };
const FACE_STREET = Math.atan2(WA.x, WA.z), FACE_IN = FACE_STREET + Math.PI;
const BOOTH = P2(GATE_U - 7, -39.6), STAND = P2(GATE_U + 3.6, -30), GATEP = P2(GATE_U, -38);
{ box(4.2, 2.8, 1.6, MAT.paint, BOOTH.x, 1.4, BOOTH.z, ROT_U); box(4.6, 0.15, 2.0, MAT.roof, BOOTH.x, 2.9, BOOTH.z, ROT_U);
  for (const s of [-1, 1]) { const p = BOOTH.clone().addScaledVector(UA, s * 1.0).addScaledVector(WA, -0.82); box(0.7, 0.5, 0.02, M(0x1a1a1a), p.x, 1.45, p.z, ROT_U); }
  signMesh([["WORLD'S CHAMPIONSHIP SERIES", 30], ["GRAND STAND  $1.00", 44], ["BLEACHERS & STANDING  50¢", 36]], 3.6, 1.0, BOOTH.clone().addScaledVector(WA, -0.83), ROT_U + Math.PI, 2.35);
  signMesh([["BOSTON AMERICANS", 40], ["vs. PITTSBURG", 40]], 3.2, 0.9, GATEP.clone().addScaledVector(WA, -0.1), ROT_U + Math.PI, FENCE_H - 0.7);
  box(0.4, FENCE_H, 0.4, MAT.paint, ...[GATEP.clone().addScaledVector(UA, -3)].map(q => [q.x, FENCE_H / 2, q.z]).flat()); box(0.4, FENCE_H, 0.4, MAT.paint, ...[GATEP.clone().addScaledVector(UA, 3)].map(q => [q.x, FENCE_H / 2, q.z]).flat());
  box(0.6, 1.0, 3.6, MAT.wood, STAND.x, 0.5, STAND.z, ROT_U); box(1.6, 0.1, 4.2, MAT.roof, STAND.x, 2.6, STAND.z, ROT_U);
  signMesh([["REFRESHMENTS", 40], ["Score Cards 5¢   Peanuts 5¢", 32], ["Lemonade 5¢   Cigars 5¢", 32]], 2.6, 1.0, STAND.clone().addScaledVector(UA, 0.4), ROT_U - Math.PI / 2, 2.0); }
const STAFF = []; { const mk = (p, ry, coat = 0x2a2a2a, white = false) => { const P = makePerson("UMP", "", "staff"); P.G.position.copy(p); P.G.rotation.y = ry; setPose(P, "stand"); if (white) P.torso.children[0].material = Array(6).fill(M(0xf0eee6)); STAFF.push(P); return P; };
  mk(BOOTH.clone().addScaledVector(WA, 0.2), FACE_STREET + Math.PI); mk(GATEP.clone().addScaledVector(WA, 1.2).addScaledVector(UA, 1.4), FACE_IN + Math.PI); mk(STAND.clone().addScaledVector(UA, 0.9), ROT_U + Math.PI / 2, 0, true); }
// vendors walking the aisles in white jackets
const VENDORS = []; for (let i = 0; i < 4; i++) { const P = makePerson("UMP", "", "vendor"); P.torso.children[0].material = Array(6).fill(M(0xf0eee6)); setPose(P, "stand"); const bk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.28), M(0x9a7a4a)); bk.position.set(0, -0.05, -0.12); P.handL.add(bk); VENDORS.push({ P, S: SECTIONS[i % 5], t: 0.2 + i * 0.2, dir: 1, row: 4 + i * 3, item: i % 2 ? "Score cards" : "Peanuts" }); }

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
const ACTS = [{ name: "Ticket window: grand stand, $1.00", p: BOOTH.clone().addScaledVector(UA, -1).addScaledVector(WA, -0.9), ok: () => !ME.ticket, act: () => buy("grand stand", 100, () => { ME.ticket = "grand stand"; }) },
  { name: "Ticket window: bleachers & standing room, 50¢", p: BOOTH.clone().addScaledVector(UA, 1).addScaledVector(WA, -0.9), ok: () => !ME.ticket, act: () => buy("bleacher", 50, () => { ME.ticket = "bleacher"; }) },
  { name: "Score card, 5¢", p: STAND.clone().addScaledVector(UA, -0.5).addScaledVector(WA, -1), ok: () => !ME.holding.includes("score card"), act: () => buy("score card", 5, () => hold("score card")) },
  { name: "Bag of peanuts, 5¢", p: STAND.clone().addScaledVector(UA, -0.5), ok: () => !ME.holding.includes("peanuts"), act: () => buy("bag of peanuts", 5, () => hold("peanuts")) },
  { name: "Glass of lemonade, 5¢", p: STAND.clone().addScaledVector(UA, -0.5).addScaledVector(WA, 1), ok: () => true, act: () => buy("glass of lemonade", 5, () => say("Cold lemonade, drunk at the stand; the glass goes back on the counter.")) }];
function buy(what, c, then) { if (ME.money < c) { say(`You haven't enough money for a ${what}.`); return; } ME.money -= c; then(); say(`You pay ${cents(c)} for a ${what}. You have ${cents(ME.money)} left.`); drawPanel(); }
let NEAR = null;
function findNear() { const p = V3(ME.x, 0, ME.z); let best = null, bd = 2.4; for (const A of ACTS) { if (!A.ok()) continue; const d = A.p.distanceTo(p); if (d < bd) { bd = d; best = A; } }
  for (const V of VENDORS) { const d = V.P.G.position.distanceTo(V3(ME.x, V.P.G.position.y, ME.z)); if (d < 2.2 && Math.abs(V.P.G.position.y - ME.y) < 1.5) { const item = V.item === "Peanuts" ? "peanuts" : "score card"; if (!ME.holding.includes(item)) { best = { name: `${V.item}! 5¢ from the vendor`, act: () => buy(item === "peanuts" ? "bag of peanuts" : "score card", 5, () => hold(item)) }; bd = d; } } }
  if (!best && !ME.seat && ME.inside) { let bs = null, b2 = 1.0; for (const s of SEATS) { if (s.taken) continue; const d = Math.hypot(s.p.x - ME.x, s.p.z - ME.z); if (d < b2 && Math.abs(s.p.y - 0.42 - ME.y) < 0.5) { b2 = d; bs = s; } } if (bs) best = { name: `Sit down (${bs.sec}, row ${bs.row + 1})`, act: () => sit(bs) }; }
  if (ME.seat) best = { name: "Stand up", act: () => standUp() }; if ((best && best.name) !== (NEAR && NEAR.name)) { NEAR = best; drawPanel(); } NEAR = best; }
function sit(s) { if (ME.ticket === "bleacher" && s.sec.includes("grandstand")) { say("An usher checks your ticket: \"Bleacher ticket? This is the grand stand, friend.\""); return; } ME.seat = s; s.taken = true; ME.x = s.p.x; ME.z = s.p.z; yaw = s.face; vrYaw = s.face; say(`You sit down: ${s.sec}, row ${s.row + 1}. Move to stand up.`); drawPanel(); }
function standUp() { if (!ME.seat) return; ME.seat.taken = false; const s = ME.seat; ME.seat = null; const fwd = V3(-Math.sin(s.face), 0, -Math.cos(s.face)); ME.x = s.p.x + fwd.x * 0.35; ME.z = s.p.z + fwd.z * 0.35; ME.y = floorAt(ME.x, ME.z); drawPanel(); }
// the score card: the batting orders as printed, held in your left hand in VR
const CARD = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 720; const g = c.getContext("2d"); g.fillStyle = "#f0e8d0"; g.fillRect(0, 0, 512, 720); g.strokeStyle = "#3a2a1a"; g.lineWidth = 4; g.strokeRect(8, 8, 496, 704); g.fillStyle = "#2a1e14"; g.textAlign = "center"; g.font = "bold 26px Georgia"; g.fillText("OFFICIAL SCORE CARD", 256, 52); g.font = "18px Georgia"; g.fillText("Huntington Avenue Base Ball Grounds", 256, 80); g.fillText("World's Championship Series · Thursday, October 1, 1903", 256, 104); g.fillText("Price 5 Cents", 256, 128);
  let y = 172; for (const [team, nm] of [["PIT", "PITTSBURG"], ["BOS", "BOSTON"]]) { g.font = "bold 22px Georgia"; g.textAlign = "left"; g.fillText(nm, 30, y); y += 30; g.font = "19px Georgia"; LINEUP[team].forEach(([n, p], i) => { g.fillText(`${i + 1}. ${n}`, 40, y); g.fillText(p, 300, y); for (let k = 0; k < 4; k++) { g.strokeStyle = "#8a7a6a"; g.lineWidth = 1; g.strokeRect(350 + k * 36, y - 18, 32, 24); } y += 28; }); y += 22; }
  g.textAlign = "center"; g.font = "italic 17px Georgia"; g.fillText("Umpires: Connolly (American League), O'Day (National League)", 256, y + 10); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 })); m.visible = false; return { c, t, m }; })();
const BAG = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 8), M(0xc8a878)); BAG.visible = false;
function hold(item) { ME.holding.push(item); if (item === "score card") CARD.m.visible = true; if (item === "peanuts") BAG.visible = true; }

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
const say = (t, s = 4) => { MSG.textContent = t; MSG.style.display = "block"; msgT = s; };
function wrap(g, text, x, y, w, lh) { const words = text.split(" "); let line = ""; for (const wd of words) { if (g.measureText(line + wd).width > w) { g.fillText(line, x, y); line = ""; y += lh; } line += wd + " "; } g.fillText(line, x, y); return y + lh; }
let preT = 8 * 60; const preStr = () => preT > 0 ? `First pitch in ${Math.floor(preT / 60)}:${String(Math.floor(preT % 60)).padStart(2, "0")}` : "Play ball!";
function drawPanel() { const g = PANEL.c.getContext("2d"); g.clearRect(0, 0, 640, 800); g.fillStyle = "rgba(30,24,16,0.92)"; g.beginPath(); g.roundRect(0, 0, 640, 800, 24); g.fill(); g.fillStyle = "#e8c070"; g.font = "bold 28px Georgia"; g.fillText("Boston, October 1, 1903 · " + preStr(), 24, 44);
  g.fillStyle = "#e0dcd0"; g.font = "21px Georgia"; let y = wrap(g, `In your pocket: ${cents(ME.money)}. ${ME.ticket ? "Ticket: " + ME.ticket + (ME.inside ? " (torn)" : "") : "No ticket yet."}${ME.holding.length ? " Holding: " + ME.holding.join(", ") + "." : ""}${ME.seat ? ` Seated: ${ME.seat.sec}, row ${ME.seat.row + 1}.` : ""}`, 24, 84, 592, 26) + 8;
  if (NEAR) { g.fillStyle = "#9ad88a"; g.font = "bold 22px Georgia"; y = wrap(g, "Trigger / E: " + NEAR.name, 24, y, 592, 28) + 6; }
  if (LOOK) { g.fillStyle = "#e8c070"; g.font = "bold 24px Georgia"; g.fillText(LOOK.name, 24, y + 4); y += 34; g.fillStyle = "#e0dcd0"; g.font = "20px Georgia"; y = wrap(g, LOOK.text, 24, y, 592, 25) + 6; }
  g.fillStyle = "#a8a498"; g.font = "17px sans-serif"; g.fillText("Left stick walk · right stick turn · trigger: buy, sit, stand · Y vignette", 24, 785); PANEL.t.needsUpdate = true;
  HUD.innerHTML = `<b style="color:#e8c070">Boston, Thursday, October 1, 1903 · ${preStr()}</b><br>In your pocket: ${cents(ME.money)}. ${ME.ticket ? "Ticket: " + ME.ticket + (ME.inside ? " (torn)" : "") : "No ticket yet: the windows are on the street."}${ME.holding.length ? " Holding: " + ME.holding.join(", ") + "." : ""}${ME.seat ? ` Seated: ${ME.seat.sec}, row ${ME.seat.row + 1}.` : ""}
    ${NEAR ? `<div style="color:#9ad88a;margin-top:4px"><b>E:</b> ${NEAR.name}</div>` : ""}${LOOK ? `<div style="margin-top:6px"><b style="color:#e8c070">${LOOK.name}</b><br>${LOOK.text}</div>` : ""}${ME.holding.includes("score card") ? `<div style="margin-top:6px;font-size:12px"><b>Score card</b>: ${["PIT", "BOS"].map(t => (t === "PIT" ? "Pittsburg: " : "Boston: ") + LINEUP[t].map(([n, p]) => n.split(" ").pop() + " " + p).join(", ")).join("<br>")}</div>` : ""}
    <div style="margin-top:6px;color:#a8a498;font-size:12px">W A S D walk · drag to look · shift hurry · E buy / sit / stand · look at a player or anything in the park to learn about it · V comfort vignette</div>`; }
// the scoreboard: the line score as it stands
function drawScore() { const g = SCORE.c.getContext("2d"); g.fillStyle = "#1e2a1e"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#e8e4d0"; g.font = "bold 34px Georgia"; g.textAlign = "center"; for (let i = 0; i < 9; i++) g.fillText(String(i + 1), 230 + i * 78, 50); g.fillText("R", 960, 50); g.textAlign = "left"; g.fillText("PITTSBURG", 20, 130); g.fillText("BOSTON", 20, 210); g.textAlign = "center";
  for (let t = 0; t < 2; t++) { let tot = 0; SCORE.line[t].forEach((r, i) => { g.fillText(String(r), 230 + i * 78, 130 + t * 80); tot += r; }); if (SCORE.line[t].length) g.fillText(String(tot), 960, 130 + t * 80); } SCORE.t.needsUpdate = true; }
drawScore();

// ---------- controls ----------
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE" && NEAR) NEAR.act(); if (e.code === "KeyV") { comfortVig = !comfortVig; say(comfortVig ? "Comfort vignette on" : "Comfort vignette off"); } if (e.code === "KeyG") { preT = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; begin(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.4, 1.4); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
const HANDS = [0, 1].map(i => { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.11), SKIN); grip.add(hand); const H = { grip, src: null };
  grip.addEventListener("connected", e => { H.src = e.data; if (e.data.handedness === "left") { PANEL.me.position.set(0, 0.05, 0.12); PANEL.me.rotation.set(-Math.PI / 2 + 0.8, 0, 0); grip.add(PANEL.me); } else { CARD.m.position.set(0, 0.02, -0.1); CARD.m.rotation.set(-1.0, 0, 0); grip.add(CARD.m); BAG.position.set(0.05, 0, -0.05); grip.add(BAG); } }); return H; });
function begin() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); const s = P2(GATE_U - 16, -44.5); ME.x = s.x; ME.z = s.z; yaw = vrYaw = ROT_U + 0.25; HUD.style.display = renderer.xr.isPresenting ? "none" : "block"; drawPanel(); say("Rogers Street, Boston, a little before game time. The ticket windows are just ahead.", 6); }
document.getElementById("intro")?.addEventListener("click", begin);
const VRB = document.getElementById("vr"); if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); begin(); HUD.style.display = "none"; }; });

// ---------- drawing it cheaply: everything that never moves is merged into one mesh per material ----------
{ const groups = new Map(), keep = new Set([window.FLAG]); for (const o of [...scene.children]) { if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || keep.has(o)) continue; if (!groups.has(o.material)) groups.set(o.material, []); groups.get(o.material).push(o); }
  scene.updateMatrixWorld(true);
  for (const [mat, list] of groups) { if (list.length < 2) continue; const pos = [], nor = [], uv = []; let shadow = false;
    for (const o of list) { const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0); shadow = shadow || o.castShadow; scene.remove(o); o.geometry.dispose(); g.dispose(); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); mg.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); const mm = new THREE.Mesh(mg, mat); mm.castShadow = shadow; mm.receiveShadow = true; scene.add(mm); } }

// ---------- the loop ----------
const clock = new THREE.Clock(), _fq = new THREE.Quaternion(); let frame = 0, panelT = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.05), vr = renderer.xr.isPresenting; let mx = 0, my = 0, run = false, act = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) comfortVig = !comfortVig; prevB.y = bY; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.signMesh(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const tr = gp.buttons[0]?.pressed; if (tr && !prevB.t) act = true; prevB.t = tr; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.ArrowLeft) yaw += dt * 1.5; if (keys.ArrowRight) yaw -= dt * 1.5; }
  if (!started) { renderer.render(scene, camera); return; } if (act && NEAR) NEAR.act();
  camera.getWorldQuaternion(_fq); const moving = !!(mx || my);
  if (moving && ME.seat) standUp(); if (moving && !ME.seat) { const f = V3(0, 0, -1).applyQuaternion(_fq); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 3.2 : 1.4; tryMove(ME.x + (f.x * -my + sd.x * mx) * sp * dt, ME.z + (f.z * -my + sd.z * mx) * sp * dt); }
  const fy = ME.seat ? ME.seat.p.y - 0.42 : floorAt(ME.x, ME.z); ME.y = lerpN(ME.y, fy, 0.35);
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (vr && ME.seat) rig.position.y = ME.seat.p.y + 0.78 - camera.position.y; if (!vr) { camera.position.set(0, ME.seat ? 0.42 + 0.78 : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  VIG.material.opacity = comfortVig && moving ? lerpN(VIG.material.opacity, run ? 0.7 : 0.45, 0.1) : lerpN(VIG.material.opacity, 0, 0.15); VIG.visible = VIG.material.opacity > 0.01;
  for (const V of VENDORS) { const S = V.S; V.t += V.dir * dt * 0.6 / S.L; if (V.t > 0.95 || V.t < 0.05) V.dir *= -1; const p = S.o.clone().addScaledVector(S.A, V.t * S.L).addScaledVector(S.out, (V.row + 0.15) * S.rowD); V.P.G.position.set(p.x, (V.row + 1) * S.rowH, p.z); V.P.G.rotation.y = Math.atan2(-S.A.x * V.dir, -S.A.z * V.dir); }
  if (window.FLAG) { const pa = FLAG.geometry.attributes.position, tt = performance.now() / 1000; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i) + 1.7; pa.setZ(i, Math.sin(x * 2.2 - tt * 4) * 0.12 * x / 3.4); } pa.needsUpdate = true; }
  if (preT > 0) { preT -= dt; if (preT <= 0) say("\"Play ball!\" Umpire Connolly calls it, and Cy Young steps onto the pitcher's slab.", 6); }
  frame++; let redraw = false; if (frame % 5 === 0) { redraw = updateLook(); findNear(); } panelT -= dt; if (panelT <= 0 || redraw) { panelT = 1; drawPanel(); }
  msgT -= dt; if (msgT <= 0) MSG.style.display = "none"; renderer.render(scene, camera); });

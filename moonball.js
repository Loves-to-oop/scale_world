// moonball.js -- baseball in a pressurised dome on the Moon. Built into moon_baseball.html by build.py.
//
// The physics, all computed, not scripted:
//   gravity 1.62 m/s²; ordinary air in the dome (1.2 kg/m³), drag Cd 0.35 on a 73 mm ball
//   Lunar League ball: 6× the mass (870 g), so it WEIGHS on the Moon what a baseball weighs on Earth (1.4 N)
//   pitch speed ~31 m/s (70 mph): a 6× heavier ball leaves the hand slower (arm-effective-mass model, which matches
//     weighted-ball training data: a 40% heavier ball loses only ~2-4%)
//   bat-ball collision: exit = q·v_pitch + (1+q)·v_bat, q = (e − r)/(1 + r), r = m_ball / m_bat,effective, e = 0.5.
//     With a standard bat (r ≈ 1.45) the heavy ball barely leaves the bat (~7 m/s), so the league bat has twice the
//     effective mass (1.2 kg): best hits ~19-20 m/s, up to ~170 m, with ~11 s of hang time
//   players: a vertical leap 6× higher (0.5 m → 3 m), but running is a slow, bounding lope (~4 m/s): little traction
//   rolling balls slow ~6× more gently than on Earth (rolling friction ∝ weight)

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 20000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 0.8;   // seated
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const O3 = new THREE.Object3D();
let s0 = 12345; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
const deg = Math.PI / 180;

// ---------- physics ----------
const G = 1.62, RHO = 1.2, BALL_M = 0.87, BALL_R = 0.0366, KD = 0.5 * RHO * 0.35 * Math.PI * BALL_R ** 2;
const BAT_M = 1.2, E_COR = 0.5, PITCH_V = 31, RUN_V = 4.0, FIELD_V = 4.5, THROW_V = 22, REACH = 4.6, ROLL_DECEL = 0.35;
const exitSpeed = (vp, vb) => { const r = BALL_M / BAT_M, q = (E_COR - r) / (1 + r); return q * vp + (1 + q) * vb; };
const fenceR = phi => 140 + 20 * Math.cos(2 * phi);        // phi = spray angle from centre field; 140 m down the lines, 160 m to centre
const FENCE_H = 6;
const DOME = { cz: -60, R: 220, H: 110 };                   // the dome: an ellipsoid 440 m across and 110 m high
const inDome = p => (p.x / DOME.R) ** 2 + ((p.z - DOME.cz) / DOME.R) ** 2 + (p.y / DOME.H) ** 2 < 1;
function simulate(p0, v0, m = BALL_M, g = G, roof = true) {   // → samples [{t, p}], plus what happened
  const pts = [], p = p0.clone(), v = v0.clone(), dt = 1 / 120; let t = 0, bounced = false, roofHit = false, fenceHit = false, overFence = false, firstGround = null, apex = 0;
  const kd = KD / m;
  while (t < 60) {
    const s = v.length(); v.x -= kd * s * v.x * dt; v.z -= kd * s * v.z * dt; v.y -= (g + kd * s * v.y) * dt; p.addScaledVector(v, dt); t += dt; apex = Math.max(apex, p.y);
    if (roof && !inDome(p)) { const n = V3(p.x / DOME.R ** 2, p.y / DOME.H ** 2, (p.z - DOME.cz) / DOME.R ** 2).normalize(); v.addScaledVector(n, -1.4 * v.dot(n)); v.multiplyScalar(0.6); p.addScaledVector(n, -0.5); roofHit = true; }
    const r = Math.hypot(p.x, p.z), phi = Math.atan2(p.x, -p.z);
    if (Math.abs(phi) < 46 * deg && r > fenceR(phi) && !fenceHit) { if (p.y > FENCE_H && !bounced) { overFence = true; pts.push({ t, p: p.clone() }); break; } v.x *= -0.3; v.z *= -0.3; fenceHit = true; }
    if (p.y <= BALL_R) { p.y = BALL_R; if (firstGround === null) firstGround = { t, p: p.clone() };
      if (v.y < -1.2) { v.y = -v.y * 0.45; v.x *= 0.8; v.z *= 0.8; bounced = true; }
      else { v.y = 0; const hs = Math.hypot(v.x, v.z); if (hs < 0.05) { pts.push({ t, p: p.clone() }); break; } const k = Math.max(0, hs - ROLL_DECEL * dt) / hs; v.x *= k; v.z *= k; } }
    if (pts.length === 0 || t - pts[pts.length - 1].t >= 1 / 30) pts.push({ t, p: p.clone() }); }
  return { pts, roofHit, overFence, firstGround, apex, T: t }; }
const pathAt = (pts, t) => { if (t <= pts[0].t) return pts[0].p.clone(); for (let i = 1; i < pts.length; i++) if (pts[i].t >= t) { const a = pts[i - 1], b = pts[i]; return a.p.clone().lerp(b.p, (t - a.t) / (b.t - a.t)); } return pts[pts.length - 1].p.clone(); };

// ---------- the dome, the Moon outside, Earth in the black sky ----------
scene.add(new THREE.HemisphereLight(0xdfe8f4, 0x506040, 1.4));
for (const [x, z] of [[120, 40], [-120, 40], [150, -160], [-150, -160], [0, -230]]) { const l = new THREE.DirectionalLight(0xfff4e8, 0.55); l.position.set(x, 90, z); scene.add(l); }
const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
{ const g = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(DOME.R, DOME.H, DOME.R);
  const glass = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.06, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); glass.position.z = DOME.cz; scene.add(glass);
  const lattice = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), 1), new THREE.LineBasicMaterial({ color: 0x9aa8b8, transparent: true, opacity: 0.5 }));
  lattice.scale.set(DOME.R, DOME.H, DOME.R); lattice.position.z = DOME.cz; scene.add(lattice);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(DOME.R, 1.6, 8, 96).rotateX(Math.PI / 2), M(0x6a7280, { metalness: 0.5 })); ring.position.z = DOME.cz; scene.add(ring);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = (DOME.R - 6) * Math.cos(a), z = DOME.cz + (DOME.R - 6) * Math.sin(a);   // floodlight banks round the rim
    const bank = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff })); bank.position.set(x * 0.92, 55, DOME.cz + (z - DOME.cz) * 0.92); bank.lookAt(0, 0, DOME.cz); scene.add(bank); } }
{ const moonTex = tex(1024, 1024, (g, w) => { g.fillStyle = "#7d7a76"; g.fillRect(0, 0, w, w); for (let k = 0; k < 900; k++) { const x = rnd() * w, y = rnd() * w, r = 2 + Math.pow(rnd(), 3) * 60;
      g.strokeStyle = "rgba(200,198,194,.5)"; g.lineWidth = Math.max(1, r / 8); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); g.fillStyle = "rgba(60,58,56,.35)"; g.beginPath(); g.arc(x + r * 0.1, y + r * 0.1, r * 0.85, 0, 6.283); g.fill(); } });
  moonTex.wrapS = moonTex.wrapT = THREE.RepeatWrapping; moonTex.repeat.set(12, 12);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1 })); ground.position.y = -0.4; scene.add(ground);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(2500, 3500, 1500);   // from behind you as you look up at the Earth: a gibbous Earth scene.add(sun);
  for (let k = 0; k < 14; k++) { const a = rnd() * 6.283, d = 2500 + rnd() * 5000, m = new THREE.Mesh(new THREE.ConeGeometry(300 + rnd() * 600, 80 + rnd() * 260, 24), M(0x8a8680, { roughness: 1 })); m.position.set(d * Math.cos(a), 30, d * Math.sin(a)); scene.add(m); }
  const n = 3000, sp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = rnd(), f = rnd() * 6.283, r = Math.sqrt(1 - y * y); sp.set([r * Math.cos(f) * 15000, y * 15000 + 200, r * Math.sin(f) * 15000], i * 3); }
  scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false })));
  const et = new THREE.TextureLoader().load(EARTH_JPG); et.colorSpace = THREE.SRGBColorSpace;   // the Earth: 2° across, as it looks from the Moon
  const earth = new THREE.Mesh(new THREE.SphereGeometry(160, 48, 24), new THREE.MeshStandardMaterial({ map: et, roughness: 0.6, emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 0.75 })); earth.position.set(2200, 7600, -5000); scene.add(earth); }   // sunlit Earth: bright in the black sky

// ---------- the field ----------
const BASES = [V3(0, 0, 0), V3(19.4, 0, -19.4), V3(0, 0, -38.8), V3(-19.4, 0, -19.4)];
const frontD = phi => { const a = Math.abs(phi); return a <= 45 * deg ? fenceR(phi) + 3 : Math.max(18, Math.min(fenceR(45 * deg) + 3, 18 / Math.sin(a - 45 * deg))); };
{ const S = 400, N = 2048, cz = -150, px = N / S, X = x => (x + S / 2) * px, Z = z => (z - cz + S / 2) * px;
  const ft = tex(N, N, g => { g.fillStyle = "#2f6f2a"; g.fillRect(0, 0, N, N);
    g.save(); g.translate(X(0), Z(0)); for (let k = -20; k < 20; k++) { g.fillStyle = k % 2 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)"; g.save(); g.rotate(Math.PI / 4); g.fillRect(k * 7 * px, -400 * px, 7 * px, 800 * px); g.restore(); } g.restore();   // mowing stripes
    g.fillStyle = "#a8754a"; g.beginPath(); g.moveTo(X(0), Z(0)); for (let a = -45; a <= 45; a += 2) { const r = 29 + 9 * Math.cos(a * deg * 2); g.lineTo(X(r * Math.sin(a * deg) * 1.35), Z(-18.4 - r * Math.cos(a * deg))); } g.closePath(); g.fill();   // infield dirt
    g.fillStyle = "#2f6f2a"; g.beginPath(); g.moveTo(X(0), Z(-3)); g.lineTo(X(16.4), Z(-19.4)); g.lineTo(X(0), Z(-35.8)); g.lineTo(X(-16.4), Z(-19.4)); g.closePath(); g.fill();   // infield grass
    for (const b of [[0, 0, 4.2], [19.4, -19.4, 2.8], [0, -38.8, 2.8], [-19.4, -19.4, 2.8], [0, -18.44, 2.9]]) { g.fillStyle = "#a8754a"; g.beginPath(); g.arc(X(b[0]), Z(b[1]), b[2] * px, 0, 6.283); g.fill(); }
    g.fillStyle = "#9a6a42"; g.beginPath(); for (let a = -46; a <= 46; a += 1) { const r = fenceR(a * deg); g.lineTo(X(r * Math.sin(a * deg)), Z(-r * Math.cos(a * deg))); }
    for (let a = 46; a >= -46; a -= 1) { const r = fenceR(a * deg) - 6; g.lineTo(X(r * Math.sin(a * deg)), Z(-r * Math.cos(a * deg))); } g.closePath(); g.fill();   // warning track
    g.strokeStyle = "#ffffff"; g.lineWidth = 0.1 * px; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(0), Z(0)); g.lineTo(X(s * fenceR(45 * deg) * 0.7071), Z(-fenceR(45 * deg) * 0.7071)); g.stroke(); }
    g.strokeRect(X(-1.7), Z(-0.9), 1.2 * px, 1.8 * px); g.strokeRect(X(0.5), Z(-0.9), 1.2 * px, 1.8 * px); });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.95 })); field.position.set(0, 0, cz); scene.add(field);
  for (const b of BASES.slice(1)) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.38), M(0xffffff)); m.position.copy(b).setY(0.04); m.rotation.y = Math.PI / 4; scene.add(m); }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 5), M(0xffffff)); plate.position.y = 0.02; plate.rotation.y = Math.PI / 10; scene.add(plate);
  const mound = new THREE.Mesh(new THREE.SphereGeometry(2.9, 24, 8, 0, 6.283, 0, 0.35), M(0xa8754a)); mound.position.set(0, -2.66, -18.44); scene.add(mound);
  const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.15), M(0xffffff)); rubber.position.set(0, 0.26, -18.44); scene.add(rubber);
  // the outfield wall, padded, with distance markers
  const wallPts = []; for (let a = -46; a <= 46; a += 1) wallPts.push([fenceR(a * deg) * Math.sin(a * deg), -fenceR(a * deg) * Math.cos(a * deg)]);
  const wg = new THREE.BufferGeometry(), wp = [], wi = []; wallPts.forEach(([x, z], i) => { wp.push(x, 0, z, x, FENCE_H, z); if (i) { const k = 2 * i; wi.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals();
  scene.add(new THREE.Mesh(wg, M(0x1f3d6e, { side: THREE.DoubleSide })));
  const markers = [[-45, "140 m"], [-22, "151"], [0, "160 m"], [22, "151"], [45, "140 m"]];
  for (const [a, txt] of markers) { const r = fenceR(a * deg) - 0.1, t = tex(256, 96, (g, w, h) => { g.fillStyle = "#1f3d6e"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffd84a"; g.font = "700 64px Helvetica"; g.textAlign = "center"; g.fillText(txt, w / 2, 70); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.25), new THREE.MeshBasicMaterial({ map: t })); m.position.set(r * Math.sin(a * deg), 3.6, -r * Math.cos(a * deg)); m.lookAt(0, 3.6, 0); scene.add(m); }
  for (const s of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 40, 8), M(0xffe040, { emissive: 0x403000 })); pole.position.set(s * fenceR(45 * deg) * 0.7071, 20, -fenceR(45 * deg) * 0.7071); scene.add(pole); } }   // foul poles

// ---------- the stands and the crowd ----------
const STAND_D = 40, STAND_H = 24;
{ const NA = 180, NR = 20, pos = [], idx = [], col = [], c = new THREE.Color();
  for (let i = 0; i <= NA; i++) { const phi = -Math.PI + i / NA * 2 * Math.PI;
    for (let j = 0; j <= NR; j++) { const r = frontD(phi) + j / NR * STAND_D, h = 1.2 + Math.pow(j / NR, 0.9) * STAND_H; pos.push(r * Math.sin(phi), h, -r * Math.cos(phi)); c.setHSL(0.6, 0.15, j % 2 ? 0.32 : 0.26); col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })));
  const front = []; for (let i = 0; i <= NA; i++) { const phi = -Math.PI + i / NA * 2 * Math.PI, r = frontD(phi); front.push(V3(r * Math.sin(phi), 0, -r * Math.cos(phi))); }
  const fp = [], fi = []; front.forEach((p, i) => { fp.push(p.x, 0, p.z, p.x, 1.4, p.z); if (i) { const k = 2 * i; fi.push(k - 2, k, k - 1, k - 1, k, k + 1); } });
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals(); scene.add(new THREE.Mesh(fg, M(0x2a3a5a, { side: THREE.DoubleSide }))); }
const NF = IS_HEADSET ? 2500 : 5000, FANS = [];
const fanGeo = (() => { const b = new THREE.BoxGeometry(0.42, 0.62, 0.28).translate(0, 0.31, 0), h = new THREE.SphereGeometry(0.12, 8, 6).translate(0, 0.78, 0); const parts = [b, h].map(x => x.toNonIndexed());
  let n = 0; parts.forEach(q => n += q.attributes.position.count); const p = new Float32Array(n * 3), nn = new Float32Array(n * 3); let o = 0; for (const q of parts) { p.set(q.attributes.position.array, o * 3); nn.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nn, 3)); return g; })();
const fans = new THREE.InstancedMesh(fanGeo, M(0xffffff), NF); fans.frustumCulled = false; scene.add(fans);
{ const c = new THREE.Color(); for (let i = 0; i < NF; i++) { const phi = -Math.PI + rnd() * 2 * Math.PI, j = 1 + Math.floor(rnd() * 19), r = frontD(phi) + (j + 0.5) / 20 * STAND_D, h = 1.2 + Math.pow((j + 0.5) / 20, 0.9) * STAND_H;
    const x = r * Math.sin(phi), z = -r * Math.cos(phi); FANS.push({ x, h, z, ry: Math.atan2(-x, -z), ph: rnd() * 6, home: rnd() < 0.62 });
    c.set(FANS[i].home ? (rnd() < 0.5 ? 0x2a6ad8 : 0xc8d4e4) : (rnd() < 0.5 ? 0x1a1a1a : 0xe0b020)).offsetHSL(0, 0, (rnd() - 0.5) * 0.15); fans.setColorAt(i, c); } }
let cheer = 0, cheerSide = true;

// ---------- the scoreboard ----------
const sbC = document.createElement("canvas"); sbC.width = 2048; sbC.height = 1024; const sbT = new THREE.CanvasTexture(sbC); sbT.colorSpace = THREE.SRGBColorSpace;
{ const sb = new THREE.Mesh(new THREE.PlaneGeometry(48, 24), new THREE.MeshBasicMaterial({ map: sbT, toneMapped: false })); sb.position.set(0, 34, -fenceR(0) - 22); scene.add(sb);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(50, 26, 1), M(0x1a1e26)); frame.position.set(0, 34, -fenceR(0) - 22.6); scene.add(frame);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 22, 1.5), M(0x3a4048)); leg.position.set(s * 18, 11, -fenceR(0) - 23); scene.add(leg); } }

// ---------- players ----------
const TEAMS = [
  { name: "Shackleton Shadows", short: "SHADOWS", city: "from the crater at the south pole, in permanent shadow", shirt: 0x1a1a1a, trim: 0xe0b020, cap: 0xe0b020 },
  { name: "Tranquility Tides", short: "TIDES", city: "from the Sea of Tranquility, where Apollo 11 landed", shirt: 0xe8eef6, trim: 0x2a6ad8, cap: 0x2a6ad8 }];
const ROSTERS = [["Aitken", "Amundsen", "Cabeus", "Faustini", "Haworth", "de Gerlache", "Nobile", "Malapert", "Sverdrup"],
  ["Armstrong", "Aldrin", "Collins", "Sabine", "Ritter", "Arago", "Maskelyne", "Moltke", "Plinius"]];
const POS = { P: V3(0, 0, -18.4), C: V3(0, 0, 1.4), "1B": V3(23, 0, -24), "2B": V3(11, 0, -40), SS: V3(-11, 0, -40), "3B": V3(-23, 0, -24), LF: V3(-62, 0, -100), CF: V3(0, 0, -122), RF: V3(62, 0, -100) };
const SKIN = [0x8d5a3b, 0xc69072, 0x5a3a28, 0xe0b090, 0xa06c4a];
function player(team, k) {
  const T = TEAMS[team], g = new THREE.Group(), s = 0.95 + rnd() * 0.1, skin = M(SKIN[(k * 7 + team * 3) % SKIN.length]), shirt = M(T.shirt), trim = M(T.trim);
  const hip = new THREE.Group(); hip.position.y = 0.92 * s; g.add(hip);
  const legs = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.x = sd * 0.1 * s; hip.add(p); p.add(new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.9 * s, 0.17 * s).translate(0, -0.45 * s, 0), M(0xe6e6e6)));
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.3 * s, 0.18 * s).translate(0, -0.75 * s, 0), trim); p.add(sock); return p; });
  const upper = new THREE.Group(); hip.add(upper);
  upper.add(new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.62 * s, 0.24 * s).translate(0, 0.31 * s, 0), shirt));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 12, 10), skin); head.position.y = 0.76 * s; upper.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125 * s, 12, 8, 0, 6.283, 0, Math.PI * 0.5), M(T.cap)); cap.position.y = 0.79 * s; upper.add(cap);
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.02, 0.12 * s), M(T.cap)); bill.position.set(0, 0.79 * s, 0.13 * s); upper.add(bill);
  const arms = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(sd * 0.26 * s, 0.56 * s, 0); upper.add(p); p.add(new THREE.Mesh(new THREE.BoxGeometry(0.1 * s, 0.62 * s, 0.1 * s).translate(0, -0.31 * s, 0), shirt)); return p; });
  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M(0x6a3a1a)); glove.position.y = -0.62 * s; arms[0].add(glove);
  scene.add(g); return { g, hip, legs, upper, arms, s, team, name: ROSTERS[team][k % 9] }; }
const pose = {
  stand(P) { P.hip.position.y = 0.92 * P.s; P.legs.forEach(l => l.rotation.set(0, 0, 0)); P.upper.rotation.set(0, 0, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); },
  ready(P) { pose.stand(P); P.hip.position.y = 0.8 * P.s; P.legs[0].rotation.set(-0.3, 0, 0.15); P.legs[1].rotation.set(-0.3, 0, -0.15); P.upper.rotation.x = 0.35; P.arms.forEach(a => a.rotation.x = -0.6); },
  lope(P, t) { pose.stand(P); const ph = t * Math.PI / 0.55, a = 0.55 * Math.sin(ph); P.legs[0].rotation.x = a; P.legs[1].rotation.x = -a; P.arms[0].rotation.x = -a; P.arms[1].rotation.x = a; P.upper.rotation.x = 0.15;
    P.hip.position.y = 0.92 * P.s + 0.38 * Math.abs(Math.sin(ph)); },   // the Moon lope: long, slow bounds
  crouch(P) { pose.stand(P); P.hip.position.y = 0.5 * P.s; P.legs.forEach((l, i) => l.rotation.set(-1.2, 0, (i ? -1 : 1) * 0.35)); P.upper.rotation.x = 0.3; P.arms.forEach(a => a.rotation.x = -1.2); } };
let fielders = {}, batter = null, catcherP = null, runners = [null, null, null], ump = null;
function setupHalf() {
  for (const P of Object.values(fielders)) scene.remove(P.g); if (batter) scene.remove(batter.g); runners.forEach(r => r && scene.remove(r.P.g));
  fielders = {}; let k = 0; for (const [pos, p] of Object.entries(POS)) { const P = player(1 - G_.half, k++); P.home = p.clone(); P.g.position.copy(p); P.g.rotation.y = Math.atan2(-p.x, -p.z) + Math.PI; fielders[pos] = P; }
  fielders.C.g.rotation.y = Math.PI; runners = [null, null, null]; newBatter(); }
function newBatter() { if (batter) scene.remove(batter.g); const t = G_.half, P = player(t, G_.order[t]); P.g.position.set(-0.9, 0, 0); P.g.rotation.y = Math.PI / 2; batter = P; }
ump = (() => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.35).translate(0, 0.75, 0), M(0x1a1a1a)); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), M(0xc69072)); h.position.y = 1.65; g.add(h); g.position.set(0, 0, 2.6); g.rotation.y = Math.PI; scene.add(g); return g; })();
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); ball.visible = false; scene.add(ball);   // drawn slightly big so you can follow it
const trailN = 40, trailP = new Float32Array(trailN * 3), trail = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(trailP, 3)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
trail.frustumCulled = false; scene.add(trail); const trailHist = [];
const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.018, 0.95, 8).translate(0, 0.47, 0), M(0xc8a070)); scene.add(bat);

// ---------- the game ----------
const G_ = { inning: 1, half: 0, outs: 0, balls: 0, strikes: 0, score: [0, 0], hits: [0, 0], line: [[], []], order: [0, 0], over: false };
let phase = "prep", phaseT = 0, play = null, lastPlay = "Play ball!", lastStats = "", commentary = [];
function announce(t) { commentary.unshift(t); commentary = commentary.slice(0, 3); lastPlay = t; vrDirty = true; }
function nextPitch() { if (G_.over) { phase = "over"; return; } if (phase !== "change") { phase = "prep"; phaseT = 0; } pose.stand(fielders.P); }
function endPA(desc) { G_.balls = 0; G_.strikes = 0; G_.order[G_.half] = (G_.order[G_.half] + 1) % 9; if (desc) announce(desc); newBatter(); }
function addOut(n = 1) { G_.outs += n; if (G_.outs >= 3) endHalf(); }
function score(n) { if (!n) return; G_.score[G_.half] += n; const L = G_.line[G_.half]; L[G_.inning - 1] = (L[G_.inning - 1] || 0) + n; cheer = 4; cheerSide = G_.half === 1; }
function endHalf() { const L = G_.line[G_.half]; L[G_.inning - 1] = L[G_.inning - 1] || 0;
  if (G_.half === 1 || (G_.inning >= 9 && G_.half === 0 && G_.score[1] > G_.score[0])) { if (G_.inning >= 9 && G_.score[0] !== G_.score[1]) { G_.over = true; announce(`Final: ${TEAMS[0].short} ${G_.score[0]}, ${TEAMS[1].short} ${G_.score[1]}. ${G_.score[1] > G_.score[0] ? "The Tides win!" : "The Shadows win!"}`); phase = "over"; return; } G_.inning++; G_.half = 0; }
  else G_.half = 1;
  G_.outs = 0; G_.balls = 0; G_.strikes = 0; announce(`${G_.half ? "Bottom" : "Top"} of the ${ord(G_.inning)}: the ${TEAMS[G_.half].name} bat.`); setupHalf(); phase = "change"; phaseT = 0; }
const ord = n => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
function runnerObj(base) { const P = player(G_.half, 0); P.g.position.copy(BASES[base]); return { P, base, from: base, to: base, t0: 0, dur: 0 }; }
// the pitch: where it crosses the plate and what the batter does
function startPitch() {
  phase = "pitch"; phaseT = 0;
  const zone = rnd() < 0.55, px = zone ? gauss() * 0.15 : (rnd() < 0.5 ? -1 : 1) * (0.3 + rnd() * 0.25), pz = zone ? 0.75 + gauss() * 0.18 : 0.4 + rnd() * 0.9;
  const rel = V3(0.05, 1.8, -17.0), target = V3(px, pz, 0), v = PITCH_V * (0.93 + 0.07 * rnd());
  // aim so the ball, falling under lunar gravity and drag, arrives at the target: solve by iteration
  let aim = target.clone(); for (let it = 0; it < 6; it++) { const dir = aim.clone().sub(rel).normalize(), sim = simulate(rel, dir.multiplyScalar(v), BALL_M, G, false), at = sim.pts.find(q => q.p.z >= 0) || sim.pts[sim.pts.length - 1]; aim.add(target.clone().sub(at.p)); }
  const sim = simulate(rel, aim.clone().sub(rel).normalize().multiplyScalar(v), BALL_M, G, false), cross = sim.pts.findIndex(q => q.p.z >= 0);
  const pts = sim.pts.slice(0, cross + 1), tCross = pts[pts.length - 1].t, inZone = Math.abs(px) < 0.25 && pz > 0.45 && pz < 1.05;
  const swingP = inZone ? (G_.strikes === 2 ? 0.85 : 0.7) : (G_.strikes === 2 ? 0.4 : 0.22), swing = rnd() < swingP;
  const contactP = inZone ? 0.82 : 0.5, contact = swing && rnd() < contactP;
  const drop = (1.8 - pz - (1.8 - 1.8)) ;
  play = { kind: "pitch", pts, tCross, swing, contact, inZone, v, rel, drop: sim.pts[cross] ? (rel.y + (aim.y - rel.y) - pz) : 0 };
  lastStats = `pitch ${(v * 2.237).toFixed(0)} mph (${v.toFixed(0)} m/s) · ${tCross.toFixed(2)} s to the plate`;
}
function resolvePitch() {
  const p = play;
  if (!p.swing) { if (p.inZone) { G_.strikes++; announce(`Called strike${G_.strikes === 3 ? " three! " + batter.name + " is out looking." : "."}`); if (G_.strikes === 3) { endPA(); addOut(); } }
    else { G_.balls++; if (G_.balls < 4) announce(`Ball ${G_.balls}.`); if (G_.balls === 4) { announce(`Ball four: ${batter.name} walks.`); walk(); endPA(); } } return nextPitch(); }
  if (!p.contact) { G_.strikes++; announce(`Swing and a miss${G_.strikes === 3 ? ": strike three!" : "."}`); if (G_.strikes === 3) { endPA(); addOut(); } return nextPitch(); }
  // contact: the collision, then the flight
  const q = Math.pow(rnd(), 0.55), vbat = 27 * (0.85 + 0.15 * rnd()), v = Math.max(3, exitSpeed(p.v, vbat) * (0.3 + 0.7 * q));
  const la = (12 + gauss() * 24) * deg, spray = gauss() * 28 * deg;
  if (Math.abs(spray) > 45 * deg || la < -20 * deg) { if (G_.strikes < 2) G_.strikes++; announce(`Foul ball${Math.abs(spray) > 45 * deg && la > 30 * deg ? ", high into the stands" : ""}.`); lastStats = `foul · exit ${(v * 2.237).toFixed(0)} mph`;
    const d = V3(Math.sin(spray) * Math.cos(la), Math.sin(la), -Math.cos(spray) * Math.cos(la)).multiplyScalar(v), sim = simulate(V3(0.2, 1, 0), d); play = { kind: "foul", pts: sim.pts.slice(0, 200) }; phase = "flight"; phaseT = 0; return; }
  const d = V3(Math.sin(spray) * Math.cos(la), Math.sin(la), -Math.cos(spray) * Math.cos(la)).multiplyScalar(v), sim = simulate(V3(0.2, 1, -0.4), d);
  const earth = simulate(V3(0, 1, 0), d.clone(), BALL_M, 9.81, false), earthD = (earth.firstGround || earth.pts[earth.pts.length - 1]).p; const eD = Math.hypot(earthD.x, earthD.z);
  // who gets to it first? catchable in the air below REACH metres (a 3 m lunar leap), or fielded on the ground
  let best = null;
  for (const [pos, F] of Object.entries(fielders)) { if (pos === "C" && v > 8) continue;
    for (const s of sim.pts) { if (s.p.y > REACH || s.t < 0.3) continue; const dist = Math.hypot(s.p.x - F.home.x, s.p.z - F.home.z), need = 0.5 + dist / FIELD_V;
      if (need <= s.t) { if (!best || s.t < best.t) best = { pos, F, t: s.t, p: s.p.clone(), air: !sim.firstGround || s.t < sim.firstGround.t, jump: s.p.y > 2.1 }; break; } } }
  if (!best) { const rest = sim.pts[sim.pts.length - 1]; let bd = 1e9;   // nobody reached it in flight or rolling: whoever is nearest walks to where it stopped
    for (const [pos, F] of Object.entries(fielders)) { const d = Math.hypot(rest.p.x - F.home.x, rest.p.z - F.home.z); if (d < bd && pos !== "C") { bd = d; best = { pos, F, t: Math.max(rest.t, 0.5 + d / FIELD_V), p: rest.p.clone(), air: false, jump: false }; } } }
  const landing = sim.firstGround ? sim.firstGround.p : sim.pts[sim.pts.length - 1].p, dist = Math.hypot(landing.x, landing.z), hang = sim.firstGround ? sim.firstGround.t : sim.T;
  lastStats = `exit ${(v * 2.237).toFixed(0)} mph (${v.toFixed(1)} m/s) · launch ${(la / deg).toFixed(0)}° · ${sim.overFence ? "over the wall" : dist.toFixed(0) + " m"} · hang ${hang.toFixed(1)} s · apex ${sim.apex.toFixed(0)} m · the same hit on Earth: ${eD.toFixed(0)} m`;
  play = { kind: "inplay", pts: sim.pts, sim, best, v, la, landing, hang, runnerStarts: runners.map(r => !!r) };
  if (sim.overFence && !best) { play.result = "hr"; }
  else if (best && best.air) { play.result = "flyout"; }
  else if (best) { const toFirst = Math.hypot(best.p.x - BASES[1].x, best.p.z - BASES[1].z), throwT = best.t + 0.6 + toFirst / THROW_V, runT = 0.9 + 27.43 / RUN_V;
    if (Math.hypot(best.p.x, best.p.z) < 48 && throwT < runT) play.result = "groundout";
    else { const back = best.t + 0.6 + Math.hypot(best.p.x - BASES[2].x, best.p.z - BASES[2].z) / THROW_V, bases = back > 0.9 + 3 * 27.43 / RUN_V ? 3 : back > 0.9 + 2 * 27.43 / RUN_V ? 2 : 1; play.result = "hit"; play.bases = bases; } }
  else { play.result = "hit"; play.bases = 3; }
  play.throwT = best ? best.t + 0.6 : null;
  if (sim.roofHit) announce("Off the roof of the dome! Still in play, under Lunar League rules...");
  phase = "flight"; phaseT = 0; }
function walk() { let runs = 0;   // forced runners move up one base
  if (runners[0]) { if (runners[1]) { if (runners[2]) { runs = 1; scene.remove(runners[2].P.g); } runners[2] = runners[1]; } runners[1] = runners[0]; }
  runners[0] = runnerObj(1); score(runs); }
function advanceAll(n, batterToo) {    // move every runner n bases (batter from home); returns runs
  let runs = 0; const nr = [null, null, null];
  for (let b = 2; b >= 0; b--) { const r = runners[b]; if (!r) continue; const to = b + 1 + n; if (to >= 4) { runs++; startRun(r, b + 1, 4); r.scoring = true; } else { nr[to - 1] = r; startRun(r, b + 1, to); } }
  if (batterToo) { const r = runnerObj(0); r.P.g.position.copy(BASES[0]); if (n >= 4) { runs++; startRun(r, 0, 4); r.scoring = true; } else { nr[n - 1] = r; startRun(r, 0, n); } scene.remove(batter.g); }
  runners = nr; return runs; }
const MOVING = [];
function startRun(r, from, to) { r.from = from; r.to = to; r.t0 = phaseT + (from === 0 ? 0.8 : 0.2); r.dur = (to - from) * 27.43 / RUN_V; MOVING.push(r); }
function runnerPos(r, t) { const f = THREE.MathUtils.clamp((t - r.t0) / r.dur, 0, 1), along = r.from + f * (r.to - r.from), i = Math.min(3, Math.floor(along)), k = along - i;
  return BASES[i % 4].clone().lerp(BASES[(i + 1) % 4], k); }

// ---------- seats, controls ----------
const SEATS = [["behind home plate", V3(0, 0, 0), 0], ["first-base line, upper deck", V3(0, 0, 0), 0], ["centre-field bleachers", V3(0, 0, 0), 0], ["third-base line, front row", V3(0, 0, 0), 0]];
[[Math.PI, 0.45], [2.15, 0.85], [0.25, 0.8], [-1.9, 0.08]].forEach(([phi, f], i) => { const r = frontD(phi) + f * STAND_D, h = 1.2 + Math.pow(f, 0.9) * STAND_H; SEATS[i][1].set(r * Math.sin(phi), h + 0.45, -r * Math.cos(phi)); SEATS[i][2] = Math.atan2(r * Math.sin(phi), -r * Math.cos(phi) + 40); });
let seatI = 0, yaw = 0, pitch = -0.1, dragging = false, started = false, speedK = 1, paused = false;
function sit(i) { seatI = (i + SEATS.length) % SEATS.length; const s = SEATS[seatI]; rig.position.copy(s[1]); const toward = V3(0, 0, -45).sub(s[1]); yaw = Math.atan2(-toward.x, -toward.z); pitch = -0.12; vrTurn = 0;
  if (renderer.xr.isPresenting) { rig.rotation.y = yaw; rig.position.y = s[1].y - 0.4; } announceSeat = `Your seat: ${s[0]}`; vrDirty = true; }
let announceSeat = "";
const intro = document.getElementById("intro");
function start() { started = true; intro?.classList.add("gone"); }
addEventListener("keydown", e => { start(); if (/^Digit[1-4]$/.test(e.code)) sit(+e.code.slice(5) - 1); if (e.code === "Space") paused = !paused;
  if (e.code === "BracketRight") speedK = Math.min(8, speedK * 2); if (e.code === "BracketLeft") speedK = Math.max(0.25, speedK / 2); });
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(10,14,24,.75);color:#e8eef6;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:640px";
document.body.appendChild(HUD);
const VRB = document.getElementById("vr"), prevB = {}; let vrTurn = 0, snap = true, vrDirty = true;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0; return [Math.abs(x) > 0.15 ? x : 0, 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 300; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.176), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 20; vrPanel.visible = false; scene.add(vrPanel);
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.85);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); rig.position.y = SEATS[seatI][1].y - 0.4; vrPanel.visible = true; sit(seatI);   // you're sitting: your real eye height, seated
    s.addEventListener("end", () => { camera.position.set(0, 0.8, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; sit(seatI); }); }; });

function drawScoreboard() {
  const g = sbC.getContext("2d"); g.fillStyle = "#06080c"; g.fillRect(0, 0, 2048, 1024);
  g.fillStyle = "#ffd84a"; g.font = "700 64px Helvetica"; g.fillText("LUNAR LEAGUE · TRANQUILITY DOME", 60, 90);
  g.font = "700 46px Helvetica"; g.fillStyle = "#9aa8b8"; for (let i = 0; i < 9; i++) g.fillText(String(i + 1), 760 + i * 92, 170); g.fillText("R", 1640, 170); g.fillText("H", 1760, 170);
  TEAMS.forEach((T, k) => { const y = 250 + k * 90; g.fillStyle = k === G_.half ? "#ffffff" : "#c8d0dc"; g.font = "700 54px Helvetica"; g.fillText(T.name.toUpperCase(), 60, y);
    for (let i = 0; i < 9; i++) { const v = G_.line[k][i]; if (v !== undefined) g.fillText(String(v), 760 + i * 92, y); }
    g.fillStyle = "#ffd84a"; g.fillText(String(G_.score[k]), 1640, y); g.fillStyle = "#c8d0dc"; g.fillText(String(G_.hits[k]), 1760, y); });
  g.fillStyle = "#ffffff"; g.font = "700 52px Helvetica";
  g.fillText(G_.over ? "FINAL" : `${G_.half ? "BOT" : "TOP"} ${G_.inning}   OUTS ${G_.outs}   BALLS ${G_.balls}   STRIKES ${G_.strikes}`, 60, 500);
  g.fillText(`AT BAT: ${batter ? batter.name.toUpperCase() : ""}`, 60, 580); g.fillStyle = "#9aa8b8"; g.font = "44px Helvetica"; g.fillText(`on base: ${runners.map((r, i) => r ? ["1st", "2nd", "3rd"][i] : null).filter(Boolean).join(", ") || "none"}`, 1100, 580);
  g.fillStyle = "#ffd84a"; g.font = "40px Helvetica"; wrapText(g, lastStats, 60, 680, 1930, 50);
  g.fillStyle = "#e8eef6"; g.font = "44px Helvetica"; wrapText(g, lastPlay, 60, 820, 1930, 56);
  g.fillStyle = "#6a7888"; g.font = "32px Helvetica"; g.fillText("gravity 1.62 m/s² · ball 870 g (6×) · league bat 2× · fences 140-160 m · dome 110 m high", 60, 990);
  sbT.needsUpdate = true; }
function wrapText(g, txt, x, y, maxW, lh) { const words = txt.split(" "); let line = ""; for (const w of words) { if (g.measureText(line + w).width > maxW) { g.fillText(line, x, y); y += lh; line = ""; } line += w + " "; } g.fillText(line, x, y); }
function drawVR() { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 300); g.fillStyle = "rgba(10,14,24,.8)"; g.beginPath(); g.roundRect(0, 0, 1024, 300, 20); g.fill();
  g.fillStyle = "#ffd84a"; g.font = "700 34px Helvetica"; g.fillText(`${TEAMS[0].short} ${G_.score[0]} · ${TEAMS[1].short} ${G_.score[1]}   ${G_.over ? "FINAL" : (G_.half ? "▼" : "▲") + G_.inning + "  " + G_.outs + " out  " + G_.balls + "-" + G_.strikes}`, 22, 48);
  g.fillStyle = "#e8eef6"; g.font = "28px Helvetica"; wrapText(g, lastPlay, 22, 100, 980, 34); g.fillStyle = "#9aa8b8"; g.font = "24px Helvetica"; wrapText(g, lastStats, 22, 210, 980, 30);
  g.fillText(`${announceSeat}  ·  X / Y change seat  ·  A / B game speed (×${speedK})`, 22, 285); vrT.needsUpdate = true; }

// ---------- the loop ----------
const clock = new THREE.Clock(); let sbTimer = 0, loopErrs = 0;
G_.order = [0, 0]; setupHalf(); sit(0); announce(`Welcome to Tranquility Dome! The ${TEAMS[0].name} (${TEAMS[0].city}) visit the ${TEAMS[1].name} (${TEAMS[1].city}).`);
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const rdt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting, dt = paused || !started ? 0 : rdt * speedK, t = clock.elapsedTime;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax] = stick(gp.axes);
      if (src.handedness === "left") { if (tap("L", gp, 4)) sit(seatI - 1); if (tap("L", gp, 5)) sit(seatI + 1); }
      else { if (tap("R", gp, 4)) { speedK = Math.max(0.5, speedK / 2); vrDirty = true; } if (tap("R", gp, 5)) { speedK = Math.min(8, speedK * 2); vrDirty = true; }
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = yaw + vrTurn;
    const cp = camera.getWorldPosition(V3(0, 0, 0)), dir = V3(0, 0, -1).applyQuaternion(rig.quaternion); dir.y = 0; dir.normalize();
    vrPanel.position.copy(cp).addScaledVector(dir, 0.8).add(V3(0, -0.42, 0)); vrPanel.lookAt(cp); }
  else camera.rotation.set(pitch, yaw, 0, "YXZ");
  phaseT += dt;
  // fielders' idle stance, batter stance
  if (phase === "prep" || phase === "change") { for (const [pos, F] of Object.entries(fielders)) { F.g.position.lerp(F.home, Math.min(1, dt * 1.5)); if (pos === "C") pose.crouch(F); else if (pos !== "P") pose.ready(F); else pose.stand(F); }
    batter.g.position.set(-0.9, 0, 0); pose.stand(batter); batter.upper.rotation.y = -0.4; batter.arms.forEach(a => a.rotation.set(-2.6, 0, 0.3));
    for (let b = 0; b < 3; b++) if (runners[b]) { runners[b].P.g.position.copy(BASES[b + 1]).add(V3(b === 0 ? -1.5 : 0, 0, b === 1 ? 1.5 : 0)); pose.ready(runners[b].P); }
    if (!G_.over && phaseT > (phase === "change" ? 6 : 4.5)) startPitch(); }
  if (phase === "pitch") { const P = fielders.P, wind = 1.4;
    if (phaseT < wind) { const f = phaseT / wind; pose.stand(P); P.legs[1].rotation.x = -1.2 * Math.sin(f * Math.PI); P.arms[1].rotation.x = 2.8 * f; P.upper.rotation.y = -0.6 * Math.sin(f * Math.PI); ball.visible = false; }
    else { pose.stand(P); P.arms[1].rotation.x = -1.2; P.upper.rotation.x = 0.4; const bt = phaseT - wind; ball.visible = true; ball.position.copy(pathAt(play.pts, bt));
      const sw = play.swing ? THREE.MathUtils.clamp((bt - (play.tCross - 0.25)) / 0.3, 0, 1) : 0; batter.upper.rotation.y = -0.4 + 2.6 * sw; batter.arms.forEach(a => a.rotation.set(-2.6 + 1.4 * sw, 0, 0.3));
      if (bt >= play.tCross) { if (!play.swing || !play.contact) { phase = "caught"; phaseT = 0; ball.position.set(0, 0.8, 1.2); } else { resolvePitch(); } } } }
  if (phase === "caught") { ball.visible = phaseT < 0.8; if (phaseT > 0.8) resolvePitch(); }
  if (phase === "flight") {
    const p = play; ball.visible = true;
    if (p.kind === "foul") { ball.position.copy(pathAt(p.pts, phaseT)); if (phaseT > Math.min(p.pts[p.pts.length - 1].t, 6)) nextPitch(); }
    else {
      const b = p.best, T = phaseT;
      if (b && T >= b.t) {                                     // fielded / caught: the ball is in the glove, then thrown
        const F = b.F;
        if (p.result === "groundout" && T >= p.throwT) { const tt = (T - p.throwT) / (Math.hypot(b.p.x - BASES[1].x, b.p.z - BASES[1].z) / THROW_V); ball.position.copy(b.p.clone().setY(1.5).lerp(V3(BASES[1].x, 1.4, BASES[1].z), Math.min(1, tt))); ball.position.y += 2 * Math.sin(Math.min(1, tt) * Math.PI); }
        else if (p.result === "hit" && T >= p.throwT) { const tt = (T - p.throwT) / (Math.hypot(b.p.x - BASES[2].x, b.p.z - BASES[2].z) / THROW_V); ball.position.copy(b.p.clone().setY(1.5).lerp(V3(BASES[2].x, 1.4, BASES[2].z), Math.min(1, tt))); ball.position.y += 0.08 * Math.hypot(b.p.x, b.p.z) * Math.sin(Math.min(1, tt) * Math.PI); }
        else { ball.position.copy(F.g.position).add(V3(0, (F.jumpY || 0) + 1.3, 0)); } }
      else ball.position.copy(pathAt(p.pts, T));
      // fielders chase: the chosen one runs for the spot (and leaps), the others drift toward the ball
      for (const [pos, F] of Object.entries(fielders)) { const tgt = b && pos === b.pos ? b.p : (pos === "1B" && p.result === "groundout" ? BASES[1] : pos === "SS" && p.result === "hit" ? V3(-4, 0, -40) : null);
        if (tgt) { const d = V3(tgt.x - F.g.position.x, 0, tgt.z - F.g.position.z), dist = d.length(); if (dist > 0.4 && T > 0.5) { F.g.position.addScaledVector(d.normalize(), Math.min(dist, FIELD_V * dt)); F.g.rotation.y = Math.atan2(d.x, d.z); pose.lope(F, T); }
          else { pose.ready(F); if (b && pos === b.pos && b.jump && Math.abs(T - b.t) < 1.2) { const jt = (T - (b.t - 0.75)) / 1.5; F.jumpY = jt > 0 && jt < 1 ? Math.min(b.p.y - 2.1, 3) * Math.sin(jt * Math.PI) : 0; F.g.position.y = F.jumpY; pose.stand(F); F.arms[0].rotation.x = -3.0; } else { F.jumpY = 0; F.g.position.y = 0; } } }
        else { const bp = ball.position, d = V3(bp.x - F.g.position.x, 0, bp.z - F.g.position.z); if (T > 0.6 && pos !== "C" && pos !== "P" && d.length() > 25) { F.g.position.addScaledVector(d.normalize(), 0.35 * FIELD_V * dt); pose.lope(F, T); } } }
      // runners
      if (!p.started) { p.started = true; MOVING.length = 0;
        if (p.result === "hr") { const runs = advanceAll(4, true); score(runs); G_.hits[G_.half]++; announce(`${batter.name} hits it high... and gone! A home run${runs > 1 ? ", " + runs + " runs score" : ""}! (${p.sim.apex.toFixed(0)} m high, ${p.hang.toFixed(0)} s in the air)`); }
        else if (p.result === "hit") { p.batterName = batter.name; const runs = advanceAll(p.bases, true); p.runs = runs; G_.hits[G_.half]++; }
        else if (p.result === "groundout") { p.batterName = batter.name; const r = runnerObj(0); scene.remove(batter.g); startRun(r, 0, 1); p.bRunner = r;
          const nr = [null, null, null]; let runs = 0; for (let k = 2; k >= 0; k--) if (runners[k]) { const forced = runners.slice(0, k).every(Boolean); if (forced || k === 2 && G_.outs < 2) { if (k === 2) { runs++; startRun(runners[k], 3, 4); runners[k].scoring = true; } else { nr[k + 1] = runners[k]; startRun(runners[k], k + 1, k + 2); } } else nr[k] = runners[k]; }
          runners = nr; p.runs = runs; }
        else if (p.result === "flyout") p.batterName = batter.name; }
      for (const r of MOVING) { r.P.g.position.copy(runnerPos(r, T)); const f = (T - r.t0) / r.dur; if (f > 0 && f < 1) { const nx = runnerPos(r, T + 0.1), d = nx.sub(r.P.g.position); if (d.lengthSq() > 1e-6) r.P.g.rotation.y = Math.atan2(d.x, d.z); pose.lope(r.P, T); } else pose.ready(r.P); }
      const doneAt = Math.max(p.best ? p.best.t + 3 : p.hang + 2, ...MOVING.map(r => r.t0 + r.dur + 0.5), p.result === "hr" ? Math.min(p.sim.T, 14) + 1 : 0, p.result === "groundout" ? p.throwT + 2.5 : 0);
      if (p.best && T >= p.best.t && !p.callMade) { p.callMade = true;
        if (p.result === "flyout") { announce(`${p.batterName} lifts it ${p.landing ? Math.hypot(p.best.p.x, p.best.p.z).toFixed(0) + " m" : ""}... ${p.best.F.name} ${p.best.jump ? "LEAPS " + Math.min(p.best.p.y - 2.1 + 0.5, 3.5).toFixed(1) + " m into the air and" : "settles under it and"} makes the catch after ${p.best.t.toFixed(1)} seconds of hang time. Out!`); }
        else if (p.result === "groundout") announce(`${p.batterName} chops it to ${p.best.pos}. ${p.best.F.name} fields it and throws: the heavy ball takes ${(Math.hypot(p.best.p.x - BASES[1].x, p.best.p.z - BASES[1].z) / THROW_V).toFixed(1)} s to cross... out at first.`);
        else announce(`${p.batterName} drives it ${Math.hypot(p.landing.x, p.landing.z).toFixed(0)} m${p.sim.firstGround ? ", it bounces and rolls a long way in the low gravity" : ""}. ${["", "A single", "A double", "A triple"][p.bases]}${p.runs ? ", " + p.runs + (p.runs > 1 ? " runs score" : " run scores") : ""}!`); }
      if (T > doneAt) { MOVING.forEach(r => { if (r.scoring) scene.remove(r.P.g); }); MOVING.length = 0;
        if (p.result === "hr") { score(0); endPA(); }
        else if (p.result === "hit") { score(p.runs || 0); endPA(); }
        else if (p.result === "flyout") { endPA(); addOut(); }
        else if (p.result === "groundout") { scene.remove(p.bRunner.P.g); score(G_.outs < 2 ? (p.runs || 0) : 0); endPA(); addOut(); }
        if (phase === "flight") nextPitch(); ball.visible = false; } } }
  // ball trail
  trailHist.unshift(ball.position.clone()); if (trailHist.length > trailN) trailHist.pop();
  for (let i = 0; i < trailN; i++) { const q = trailHist[Math.min(i, trailHist.length - 1)]; trailP.set([q.x, q.y, q.z], i * 3); } trail.geometry.attributes.position.needsUpdate = true; trail.visible = ball.visible;
  bat.position.copy(batter.g.position).add(V3(0.15, 1.45, 0.1)); bat.rotation.set(0.3, 0, 0); bat.visible = phase !== "flight" || play?.kind === "foul";
  if (phase === "flight" && play.kind === "inplay") bat.visible = false;
  // the crowd
  cheer = Math.max(0, cheer - rdt * 0.6);
  for (let i = 0; i < NF; i += IS_HEADSET ? 2 : 1) { const f = FANS[i], up = cheer > 0 && f.home === cheerSide ? Math.max(0, Math.sin(t * 7 + f.ph)) * 0.35 * Math.min(1, cheer) : 0;
    O3.position.set(f.x, f.h + up, f.z); O3.rotation.set(0, f.ry, 0); O3.scale.setScalar(1); O3.updateMatrix(); fans.setMatrixAt(i, O3.matrix); }
  fans.instanceMatrix.needsUpdate = true;
  sbTimer -= rdt; if (sbTimer <= 0) { sbTimer = 0.5; drawScoreboard();
    HUD.innerHTML = `<b>${TEAMS[0].short} ${G_.score[0]} · ${TEAMS[1].short} ${G_.score[1]}</b> · ${G_.over ? "final" : (G_.half ? "bottom " : "top ") + ord(G_.inning) + " · " + G_.outs + " out · " + G_.balls + "-" + G_.strikes}<br>${lastPlay}<br><span style="color:#ffd84a">${lastStats}</span><br>
      <span style="color:#9aa8b8;font-size:12.5px">${SEATS[seatI][0]} · 1-4 change seat · drag to look · [ ] game speed ×${speedK} · space pause</span>`;
    if (vr) drawVR(); }
  renderer.render(scene, camera);
}

// stellarhole.js -- a black hole of three solar masses, about the lightest a collapsing star is likely to make, sitting in a suburb.
// Its event horizon (the Schwarzschild radius, 2GM/c^2) is 8.86 km: half of it rises out of the ground as a black dome 17.7 km
// across and 8.9 km high, and the neighbourhood's streets ring it, from Horizon Drive at its foot out to 31 km. Drive or walk anywhere.
// The light you see far off is followed along its bent path through Schwarzschild spacetime (Binet's equation for light, integrated
// for every pixel, starting from the directions a clock held still there would measure) until it meets the ground, the horizon or the sky; near you (within about 500 m) the bending is under a degree or
// two and things are drawn straight. Time: real time is your own clock (proper time); the "map" clock is the time far away, which
// runs faster by 1/sqrt(1 - rs/r). One rule is broken on purpose: the ground, the houses, the air and you are held in place, immune
// to the hole's pull and tides (see the panel for what would really happen). Built into stellarhole.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; if (IS_HEADSET) renderer.xr.setFramebufferScaleFactor(0.8);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 3000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; if (draw) draw(c.getContext("2d"), w, h); return t; };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- the physics: a Schwarzschild black hole of three solar masses ----------
const G = 6.674e-11, MSUN = 1.989e30, Mbh = 3 * MSUN, c = 2.998e8, GM = G * Mbh, rs = 2 * GM / (c * c), bcrit = 1.5 * Math.sqrt(3) * rs, HBAR = 1.0546e-34, KB = 1.3807e-23;
const T_HAWK = HBAR * c ** 3 / (8 * Math.PI * GM * KB), T_EVAP_YR = 5120 * Math.PI * G * G * Mbh ** 3 / (HBAR * c ** 4) / 3.156e7;
const rate = r => r > rs ? Math.sqrt(1 - rs / r) : 0;
const fmt = (v, u = "") => { const a = Math.abs(v); if (a === 0) return "0" + u; if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(2) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]) + u; } return (a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(2) : v.toFixed(4)) + u; };
const fmtLen = r => r >= 1000 ? (r / 1000).toFixed(r >= 1e4 ? 2 : 3) + " km" : r.toFixed(r >= 10 ? 0 : 1) + " m";
const fmtT = s => { if (s < 60) return s.toFixed(2) + " s"; if (s < 3600) { const m = Math.floor(s / 60); return m + " min " + Math.floor(s - m * 60) + " s"; } const h = Math.floor(s / 3600); return h + " h " + Math.floor((s - h * 3600) / 60) + " min"; };

// ---------- the neighbourhood: streets in rings round the hole, every 120 m from its foot to 31 km, and radial roads ----------
// Named rings mark the places where the physics changes: Horizon Drive at the foot of the horizon, Photon Sphere Avenue (1.5 rs,
// where light can circle the hole), Last Stable Orbit Boulevard (3 rs, the closest a free orbit can last). The rest are lanes.
const R_IN = rs + 40, R_OUT = 31000, STEP = 120, NG = 650, NEAR = 520;
const TREES_N = ["Maple", "Oak", "Elm", "Cedar", "Birch", "Willow", "Aspen", "Linden", "Hickory", "Pine", "Chestnut", "Poplar", "Sycamore", "Walnut", "Spruce", "Magnolia"], KIND = ["Lane", "Court", "Circle", "Way", "Crescent", "Close"];
const SPECIAL = [{ r: R_IN, name: "Horizon Drive", w: 14, col: "#3a3a3e" }, { r: 1.5 * rs, name: "Photon Sphere Avenue", w: 16, col: "#4a3a2e" }, { r: 3 * rs, name: "Last Stable Orbit Boulevard", w: 16, col: "#2e3a4a" }, { r: R_OUT, name: "Outer Ring Road", w: 16, col: "#3a3a3e" }];
const RINGS = []; for (let r = R_IN; r <= R_OUT + 1; r += STEP) RINGS.push({ r, name: "", w: 8 });
for (const S of SPECIAL) { let best = 0; RINGS.forEach((q, i) => { if (Math.abs(q.r - S.r) < Math.abs(RINGS[best].r - S.r)) best = i; }); Object.assign(RINGS[best], S); }
RINGS.forEach((q, i) => { if (!q.name) q.name = `${TREES_N[i % TREES_N.length]} ${KIND[Math.floor(i / TREES_N.length) % KIND.length]}`; });
// radial roads: 72 from the foot of the horizon, doubling to 144 beyond 12 km and 288 beyond 24 km, so the blocks stay 500 m to 1 km long
// (x is east, z is south: the angle 0 points east)
const SPOKES = []; for (let k = 0; k < 288; k++) { const lev = k % 4 === 0 ? 0 : k % 2 === 0 ? 1 : 2; SPOKES.push({ a: k / 288 * Math.PI * 2, r0: [R_IN, 12000, 24000][lev], w: lev ? 8 : 12, name: k % 72 === 0 ? ["East", "South", "West", "North"][k / 72] + " Road" : lev ? `Radial ${k / 2 | 0}` : `Spoke ${k / 4}` }); }
const angDist = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
function nearSpoke(r, a) { for (const S of SPOKES) if (r >= S.r0 - 20 && angDist(a, S.a) * r < S.w / 2 + 22) return true; return false; }
function streetAt(x, z) { const r = Math.hypot(x, z), a = Math.atan2(z, x); let best = null, bd = 1e9;
  for (const q of RINGS) { const d = Math.abs(r - q.r); if (d < bd) { bd = d; best = q; } }
  for (const S of SPOKES) if (r >= S.r0) { const d = angDist(a, S.a) * r; if (d < bd) { bd = d; best = S; } }
  return bd < 30 ? best.name : null; }

// ---------- the far view: every pixel's light followed along its bent path ----------
// The ground's map, seen from above (streets, house roofs, lawns and the fields beyond), is what the bent rays land on far off.
const EXT = 34000, MAPN = IS_HEADSET ? 2048 : 4096;
const mapTex = canvasTex(MAPN, MAPN, (g, W) => { const S = W / (2 * EXT), P = v => (v + EXT) * S;
  g.fillStyle = "#6f7f4c"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * W, s = 20 + hash(i, 3) * 80; g.fillStyle = ["#7c8a52", "#8a8a58", "#6a7a44", "#9a9258", "#5f7040"][i % 5]; g.fillRect(x, y, s, s * (0.5 + hash(i, 4))); }
  g.fillStyle = "#77874f"; g.beginPath(); g.arc(P(0), P(0), (R_OUT + 60) * S, 0, 7); g.fill();
  for (const q of RINGS) { for (const off of [-18, 18]) { g.strokeStyle = ["#9a6a52", "#7a7a80", "#8a5a4a", "#a8a090", "#6a5a50"][Math.abs(Math.round(q.r + off)) % 5]; g.lineWidth = 10 * S; g.setLineDash([10 * S, 16 * S]); g.beginPath(); g.arc(P(0), P(0), (q.r + off) * S, 0, 7); g.stroke(); }
    g.setLineDash([]); g.strokeStyle = q.col || "#8c8c86"; g.lineWidth = Math.max(0.6, q.w * S); g.beginPath(); g.arc(P(0), P(0), q.r * S, 0, 7); g.stroke(); }
  g.strokeStyle = "#8c8c86"; for (const Sp of SPOKES) { g.lineWidth = Math.max(0.6, Sp.w * S); g.beginPath(); g.moveTo(P(Math.cos(Sp.a) * Sp.r0), P(Math.sin(Sp.a) * Sp.r0)); g.lineTo(P(Math.cos(Sp.a) * R_OUT), P(Math.sin(Sp.a) * R_OUT)); g.stroke(); }
  g.fillStyle = "#000"; g.beginPath(); g.arc(P(0), P(0), rs * S, 0, 7); g.fill(); });
mapTex.anisotropy = 8;
const SKY_HAZE = new THREE.Color(0xb4c4d4), SUN = V3(-0.45, 0.62, 0.35).normalize();
const STEPS = IS_HEADSET ? 130 : 280, HSTEP = IS_HEADSET ? 0.04 : 0.018;
const farMat = new THREE.ShaderMaterial({ uniforms: { map: { value: mapTex }, rsk: { value: rs / 1000 }, EXT: { value: EXT / 1000 }, sun: { value: SUN } },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  defines: { PIXA: (IS_HEADSET ? 0.0024 : 0.0016).toFixed(4), MAPN: MAPN.toFixed(1) },
  fragmentShader: `uniform sampler2D map; uniform float rsk, EXT; uniform vec3 sun; varying vec3 vW;
    vec3 sky(vec3 d){ vec3 c = mix(vec3(0.70, 0.78, 0.86), vec3(0.24, 0.42, 0.74), pow(max(d.y, 0.0), 0.55)); float s = max(dot(d, sun), 0.0);
      c += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 30.0 + pow(s, 10.0) * 0.22); if (d.y < 0.0) c = mix(vec3(0.40, 0.45, 0.33), vec3(0.70, 0.78, 0.86), exp(d.y * 25.0)); return c; }
    vec3 ground(vec3 p, float dist, float graze){ vec2 uv = vec2(p.x / (2.0 * EXT) + 0.5, 0.5 - p.z / (2.0 * EXT)); float lod = log2(max(1.0, dist * PIXA / max(graze, 0.015) / (2.0 * EXT / MAPN)));
      vec3 c = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec3(0.40, 0.45, 0.33) : textureLod(map, uv, lod).rgb; return c * 0.95; }
    vec2 acc(float u, float w){ return vec2(w, -u + 1.5 * rsk * u * u); }
    void main(){ vec3 P = cameraPosition / 1000.0, d = normalize(vW - cameraPosition); float r0 = length(P); vec3 e1 = P / r0; float ca = dot(d, e1); vec3 t = d - ca * e1; float s = length(t);
      vec3 col = vec3(0.0); float L = 0.0;
      if (s < 1e-5) { if (ca < 0.0 && d.y < 0.0 && -P.y / d.y < r0 - rsk) { L = -P.y / d.y; col = ground(P - d * P.y / d.y, L, -d.y); } else if (ca > 0.0) { L = d.y < 0.0 ? -P.y / d.y : 60.0; col = d.y < 0.0 ? ground(P - d * P.y / d.y, L, -d.y) : sky(d); } }
      else { vec3 e2 = t / s; float u = 1.0 / r0, w = -u * sqrt(max(1.0 - rsk * u, 0.0)) * ca / s, ph = 0.0, h = ${HSTEP.toFixed(4)}; vec3 prev = P; bool hit = false;
        for (int i = 0; i < ${STEPS}; i++) {
          vec2 k1 = acc(u, w), k2 = acc(u + 0.5 * h * k1.x, w + 0.5 * h * k1.y), k3 = acc(u + 0.5 * h * k2.x, w + 0.5 * h * k2.y), k4 = acc(u + h * k3.x, w + h * k3.y);
          float un = u + h / 6.0 * (k1.x + 2.0 * k2.x + 2.0 * k3.x + k4.x), wn = w + h / 6.0 * (k1.y + 2.0 * k2.y + 2.0 * k3.y + k4.y);
          if (un < 1.0 / 90.0) { float r = 1.0 / u, dr = -w / (u * u); vec3 dir = normalize(dr * (cos(ph) * e1 + sin(ph) * e2) + r * (-sin(ph) * e1 + cos(ph) * e2));
            if (dir.y < 0.0) { L += -prev.y / dir.y; col = ground(prev - dir * prev.y / dir.y, L, -dir.y); } else { col = sky(dir); L += 40.0; } hit = true; break; }
          ph += h; u = un; w = wn; float r = 1.0 / u; vec3 p = r * (cos(ph) * e1 + sin(ph) * e2); float seg = length(p - prev);
          if (prev.y > 0.0 && p.y <= 0.0) { float f = prev.y / (prev.y - p.y); vec3 hp = mix(prev, p, f); L += seg * f; col = length(hp) > rsk ? ground(hp, L, (prev.y - p.y) / max(seg, 1e-6)) : vec3(0.0); hit = true; break; }
          L += seg; if (u >= 1.0 / rsk) { col = vec3(0.0); hit = true; break; }
          prev = p; }
        if (!hit) col = vec3(0.0); }
      col = mix(col, vec3(0.70, 0.78, 0.86), 1.0 - exp(-L / 110.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, side: THREE.BackSide, depthWrite: false, depthTest: false });
const farView = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), farMat); farView.renderOrder = -10; farView.frustumCulled = false; scene.add(farView);

// ---------- near you: the ground in detail, houses, trees, the rail at the horizon's foot, clock towers ----------
scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x5a6a40, 1.1)); const sunL = new THREE.DirectionalLight(0xfff2dc, 2.2); sunL.position.copy(SUN).multiplyScalar(100); scene.add(sunL);
const nearTex = canvasTex(1024, 1024); nearTex.anisotropy = 8;
const nearGround = new THREE.Mesh(new THREE.PlaneGeometry(2 * NG, 2 * NG).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: nearTex, transparent: true, roughness: 0.95 })); nearGround.renderOrder = 1; scene.add(nearGround);
let nearC = null;
function drawNear(cx, cz) { nearC = [cx, cz]; nearGround.position.set(cx, 0, cz); const g = nearTex.userData.c.getContext("2d"), W = 1024, S = W / (2 * NG), X = x => (x - cx + NG) * S, Z = z => (z - cz + NG) * S;
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#6f8a48"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + hash(i, cx) * 40},${90 + hash(i, cz) * 40},40,0.25)`; g.beginPath(); g.arc(hash(i, 7) * W, hash(i, 9) * W, 2 + hash(i, 5) * 9, 0, 7); g.fill(); }
  const rc = Math.hypot(cx, cz), ac = Math.atan2(cz, cx), span = (NG * 1.5) / Math.max(rc, 1000);
  const arc = (r, w, col, dash) => { g.strokeStyle = col; g.lineWidth = w * S; g.setLineDash(dash ? dash.map(v => v * S) : []); g.beginPath(); g.arc(X(0), Z(0), r * S, ac - span, ac + span); g.stroke(); };
  for (const q of RINGS) if (Math.abs(q.r - rc) < NG * 1.5) { arc(q.r + q.w / 2 + 1.2, 2, "#c8c4b8"); arc(q.r - q.w / 2 - 1.2, 2, "#c8c4b8"); arc(q.r, q.w, q.col || "#5a5a5e"); if (q.w > 10) arc(q.r, 0.25, "#e8c840", [3, 4]); }
  g.setLineDash([]); for (const Sp of SPOKES) { const a0 = Math.max(Sp.r0, rc - NG * 1.5), a1 = Math.min(R_OUT, rc + NG * 1.5); if (a1 < a0 || angDist(Sp.a, ac) * rc > NG * 1.6) continue; const cs = Math.cos(Sp.a), sn = Math.sin(Sp.a);
    g.strokeStyle = "#c8c4b8"; g.lineWidth = (Sp.w + 4) * S; g.beginPath(); g.moveTo(X(cs * a0), Z(sn * a0)); g.lineTo(X(cs * a1), Z(sn * a1)); g.stroke(); g.strokeStyle = "#5a5a5e"; g.lineWidth = Sp.w * S; g.stroke(); }
  forHouses(cx, cz, NG * 1.2, (x, z, a, w, d, k, side) => { const ox = Math.cos(a) * side, oz = Math.sin(a) * side; g.strokeStyle = "#a8a49a"; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x - ox * 14), Z(z - oz * 14)); g.stroke(); });
  g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.beginPath(); g.arc(X(0), Z(0), rs * S, 0, 7); g.fill();
  g.globalCompositeOperation = "destination-in"; const rg = g.createRadialGradient(W / 2, W / 2, W * 0.36, W / 2, W / 2, W / 2); rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, W);
  g.globalCompositeOperation = "source-over"; nearTex.needsUpdate = true; }
// every house within reach of (cx, cz): rows 18 m either side of each ring street, a house every 26 m along the row
function forHouses(cx, cz, reach, fn) { const rc = Math.hypot(cx, cz), ac = Math.atan2(cz, cx);
  RINGS.forEach((q, qi) => { for (const side of [-1, 1]) { const R = q.r + side * 18; if (Math.abs(R - rc) > reach || R < rs + 30 || (qi === 0 && side < 0)) continue;
    const da = Math.acos(Math.max(-1, Math.min(1, (R * R + rc * rc - reach * reach) / (2 * R * rc)))), k0 = Math.ceil((ac - da) * R / 26), k1 = Math.floor((ac + da) * R / 26);
    for (let k = k0; k <= k1; k++) { const a = k * 26 / R; if (nearSpoke(R, a)) continue; const hk = hash(k, R); if (hk < 0.06) continue;
      const x = Math.cos(a) * R, z = Math.sin(a) * R; fn(x, z, a, 9 + hash(k, R + 1) * 5, 8 + hash(k, R + 2) * 4, hk, side); } } }); }
const wallTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#f2ede2"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a4a5a"; for (const x of [30, 160]) { g.fillRect(x, 34, 56, 46); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(x, 34, 56, 46); } g.fillStyle = "#6a4a32"; g.fillRect(108, 58, 34, 70); });
const NH = 1400, houseIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 }), NH);
const roofIM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), M(0xffffff, { roughness: 0.9 }), NH);
const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 6).translate(0, 0.5, 0), M(0x5a4030), NH), crownIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M(0xffffff, { roughness: 0.95, flatShading: true }), NH);
const railIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.1, 0.2).translate(0, 0.55, 0), M(0xd8d8d0), 400);
for (const im of [houseIM, roofIM, trunkIM, crownIM, railIM]) { im.frustumCulled = false; im.count = 0; scene.add(im); }
const O3 = new THREE.Object3D(), COLW = [0xf2ede2, 0xe8dcc4, 0xd8e0e8, 0xf0e0c8, 0xe0d0c0, 0xc8d4c0], COLR = [0x5a4a42, 0x3a3a40, 0x7a3a30, 0x4a5a6a, 0x6a6058];
function fillNear(cx, cz) { let n = 0, t = 0, rl = 0; const tmpC = new THREE.Color();
  forHouses(cx, cz, NEAR, (x, z, a, w, d, hk, side) => { if (n >= NH) return; const dist = Math.hypot(x - cx, z - cz), f = THREE.MathUtils.smoothstep(NEAR - dist, 0, 60), h = (hk < 0.3 ? 6 : 3.4) * f;
    O3.position.set(x, 0, z); O3.rotation.set(0, -a + (side > 0 ? Math.PI / 2 : -Math.PI / 2), 0); O3.scale.set(w, Math.max(0.01, h), d); O3.updateMatrix(); houseIM.setMatrixAt(n, O3.matrix); houseIM.setColorAt(n, tmpC.setHex(COLW[Math.floor(hk * 97) % COLW.length]));
    O3.position.y = h; O3.scale.set(w * 1.02, 2.6 * f + 0.01, d * 1.02); O3.updateMatrix(); roofIM.setMatrixAt(n, O3.matrix); roofIM.setColorAt(n, tmpC.setHex(COLR[Math.floor(hk * 53) % COLR.length])); n++;
    if (t < NH - 2) for (const back of [40, 52]) { const tr = hash(hk * 9, back); if (tr < 0.45) continue; const R = Math.hypot(x, z) + side * (back - 18), b = a + (tr - 0.7) * 20 / R, tx = Math.cos(b) * R, tz = Math.sin(b) * R, s = (5 + tr * 7) * f;
      O3.rotation.set(0, 0, 0); O3.position.set(tx, 0, tz); O3.scale.set(1, s * 0.45, 1); O3.updateMatrix(); trunkIM.setMatrixAt(t, O3.matrix); O3.position.y = s * 0.62; O3.scale.set(s * 0.32, s * 0.38, s * 0.32); O3.updateMatrix(); crownIM.setMatrixAt(t, O3.matrix); crownIM.setColorAt(t, tmpC.setHSL(0.24 + tr * 0.06, 0.45, 0.24 + tr * 0.08)); t++; } });
  const rc = Math.hypot(cx, cz); if (rc - rs < NEAR + 60) { const ac = Math.atan2(cz, cx), R = rs + 24, da = Math.min(Math.PI, (NEAR + 60) / R); for (let a = ac - da; a < ac + da && rl < 400; a += 4 / R) { O3.rotation.set(0, -a, 0); O3.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); O3.scale.set(1, 1, 1); O3.updateMatrix(); railIM.setMatrixAt(rl++, O3.matrix); } }
  houseIM.count = roofIM.count = n; trunkIM.count = crownIM.count = t; railIM.count = rl;
  for (const im of [houseIM, roofIM, trunkIM, crownIM, railIM]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }

// ---------- clocks: map time (far away) against proper time ----------
// Map time is Schwarzschild coordinate time, what a clock very far from the hole reads. A clock held still at distance r ticks
// sqrt(1 - rs/r) as fast. Real time here is your own time: near the horizon the far-away world, and the map clock, race ahead.
let tMap = 0, tYou = 0, T0 = Date.now(), started = false;
const tod = sec => { const d = new Date(T0 + sec * 1000); let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${ap}`; };
const TOWERS = [[rs + 20, "20 m from the horizon"], [1.5 * rs + 28, "Photon Sphere Avenue"], [3 * rs + 28, "Last Stable Orbit Boulevard"], [R_OUT + 30, "Outer Ring Road"]].map(([r, name]) => ({ r, name }));
const towerG = new THREE.Group(); scene.add(towerG);
TOWERS.forEach(T => { const a = 0.0016 * 31000 / T.r, x = Math.cos(a) * T.r, z = Math.sin(a) * T.r, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 7, 10), M(0x2a2a30, { metalness: 0.5 })); pole.position.set(x, 3.5, z); towerG.add(pole);
  T.tex = canvasTex(512, 200); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.tex, toneMapped: false })); s.position.set(x, 8.2, z); s.scale.set(6, 2.35, 1); towerG.add(s); T.pos = V3(x, 0, z); });
function drawTowers() { for (const T of TOWERS) { const g = T.tex.userData.c.getContext("2d"), tau = tMap * rate(T.r); g.clearRect(0, 0, 512, 200); g.fillStyle = "rgba(16,14,22,.9)"; g.beginPath(); g.roundRect(0, 0, 512, 200, 18); g.fill();
    g.fillStyle = "#ffd060"; g.font = "bold 30px sans-serif"; g.fillText(T.name, 18, 42); g.fillStyle = "#f2eadb"; g.font = "bold 50px monospace"; g.fillText(tod(tau), 18, 110); g.font = "26px sans-serif"; g.fillStyle = "#c8c0d8";
    g.fillText(`ticks at ${(rate(T.r) * 100).toFixed(2)}% of map time · ${fmtLen(T.r - rs)} up`, 18, 160); T.tex.needsUpdate = true; } }

// ---------- the car ----------
const car = new THREE.Group(); scene.add(car);
{ const paint = M(0x2a6ab8, { metalness: 0.5, roughness: 0.3 }), dark = M(0x1a1a1a), chrome = M(0xdddddd, { metalness: 0.9, roughness: 0.2 });
  const part = (w, h, d, x, y, z, m = paint) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); car.add(b); };
  part(1.8, 0.25, 4.4, 0, 0.45, 0); part(1.8, 0.45, 1.5, 0, 0.8, -1.45); part(1.8, 0.4, 1.1, 0, 0.78, 1.65);
  for (const x of [-0.85, 0.85]) part(0.1, 0.4, 1.8, x, 0.77, 0.0);
  part(1.6, 0.2, 0.1, 0, 0.84, -0.7, dark);
  const seatM = M(0xe8dcc8, { roughness: 0.8 });
  for (const x of [-0.42, 0.42]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), seatM); s.position.set(x, 0.75, 0.25); car.add(s);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.1), seatM); bk.position.set(x, 1.05, 0.55); car.add(bk); }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.03), new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.25 })); glass.position.set(0, 1.12, -0.85); glass.rotation.x = -0.35; car.add(glass);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), dark); wheel.position.set(-0.42, 0.86, -0.36); wheel.rotation.x = -0.75; car.add(wheel);
  for (const [x, z] of [[-0.85, -1.4], [0.85, -1.4], [-0.85, 1.4], [0.85, 1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20).rotateZ(Math.PI / 2), dark); w.position.set(x, 0.34, z); car.add(w);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16).rotateZ(Math.PI / 2), chrome); h.position.copy(w.position); car.add(h); } }
// the dashboard: your clock, the map clock, and how fast yours is running
const dashT = canvasTex(1024, 440), dash = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.352), new THREE.MeshBasicMaterial({ map: dashT, toneMapped: false })); dash.position.set(0.05, 1.0, -0.66); dash.rotation.x = -0.6; car.add(dash);
const SPEEDS = [[0, "stopped"], [5, "18 km/h"], [14, "50 km/h"], [30, "108 km/h"], [100, "360 km/h"], [400, "1,440 km/h"], [1500, "5,400 km/h"]]; let gear = 0, inCar = true;
car.position.set(19000, 0, 6); car.rotation.y = Math.PI / 2;
function drawDash(r) { const g = dashT.userData.c.getContext("2d"); g.fillStyle = "#0e0c14"; g.fillRect(0, 0, 1024, 440); g.fillStyle = "#8a84a0"; g.font = "26px sans-serif"; g.fillText("YOUR CLOCK", 30, 46); g.fillText("MAP CLOCK (far away)", 540, 46);
  g.fillStyle = "#ffd060"; g.font = "bold 58px monospace"; g.fillText(tod(tYou), 30, 112); g.fillStyle = "#f2eadb"; g.fillText(tod(tMap), 540, 112);
  g.font = "28px sans-serif"; g.fillStyle = "#c8c0d8"; g.fillText(`Your clock runs at ${(rate(r) * 100).toFixed(2)}% of map time: the far world runs ${(1 / rate(r)).toFixed(2)}× faster`, 30, 176);
  g.fillText(`Behind map time by ${fmtT(tMap - tYou)}`, 30, 220); g.fillText(`${fmtLen(r - rs)} from the horizon · ${fmtLen(r)} from the centre`, 30, 264);
  g.fillStyle = "#ffd060"; g.fillText(`Speed ${SPEEDS[gear][1]}  (W / S faster, slower · A / D steer · space stop)`, 30, 320); g.fillStyle = "#8a84a0"; g.font = "24px sans-serif"; g.fillText(streetAt(car.position.x, car.position.z) || "off the road", 30, 370); dashT.needsUpdate = true; }

// ---------- moving about ----------
const P = { x: 0, z: 0 }; let yaw = 0, pitch = -0.08; const keys = {}; let vrYaw = 0;
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return;
  if (e.code === "KeyE") toggleCar();
  if (inCar && (e.code === "KeyW" || e.code === "ArrowUp")) gear = Math.min(SPEEDS.length - 1, gear + 1);
  if (inCar && (e.code === "KeyS" || e.code === "ArrowDown")) gear = Math.max(0, gear - 1);
  if (inCar && e.code === "Space") gear = 0; });
addEventListener("keyup", e => keys[e.code] = false);
function toggleCar() { if (inCar) { inCar = false; gear = 0; const s = V3(-2.4, 0, 0.3).applyEuler(new THREE.Euler(0, car.rotation.y, 0)); P.x = car.position.x + s.x; P.z = car.position.z + s.z; yaw += car.rotation.y; say("On foot. WASD to walk, shift to run; E by the car to get back in."); }
  else if (Math.hypot(P.x - car.position.x, P.z - car.position.z) < 5) { inCar = true; yaw -= car.rotation.y; say("In the car. W / S faster or slower, A / D steer, space stops."); } else say("Walk back to the car (within 5 m) to get in."); }
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", () => drag = null);
const VRB = document.getElementById("vr"), prevB = {};
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 560; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.273), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.32, -0.7); vrPanel.rotation.x = -0.45; vrPanel.visible = false; camera.add(vrPanel);
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = 0; vrPanel.visible = !inCar; s.addEventListener("end", () => { vrPanel.visible = false; }); }; });

// ---------- the panel ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:410px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(18,16,24,.86);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(18,16,24,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0, lastMsg = ""; function say(t) { lastMsg = t; MSG.innerHTML = t; MSG.style.display = "block"; msgT = 18; }
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 220; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:12px;background:rgba(18,16,24,.8);display:none"; document.body.appendChild(MAPC);
const FACTS = `<b>The hole</b>: three times the Sun's mass (${fmt(Mbh, " kg")}), about the lightest black hole a dying star is likely to leave. Event horizon radius ${fmtLen(rs)}, so ${fmtLen(2 * rs)} across: half of it rises from the ground as the black dome, ${fmtLen(rs)} high. From far off its shadow looks ${fmtLen(2 * bcrit)} across (light passing closer than ${fmtLen(bcrit)} is captured). Photon sphere ${fmtLen(1.5 * rs)} from the centre; last stable orbit ${fmtLen(3 * rs)}. Hawking temperature ${fmt(T_HAWK, " K")}; it would take ${fmt(T_EVAP_YR, " years")} to evaporate.`;
function drawPanel(r) { const g = GM / (r * r) / rate(r), tide = 2 * GM * 1.7 / r ** 3, esc = Math.sqrt(2 * GM / r);
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600;margin-bottom:4px">A stellar black hole in the neighbourhood</div><div style="color:#c8c0d8;font-size:12.5px">${FACTS}</div>
    <div style="margin-top:8px"><b>Where you are</b>: ${fmtLen(r - rs)} from the horizon (${fmtLen(r)} from the centre)${streetAt(...(inCar ? [car.position.x, car.position.z] : [P.x, P.z])) ? ", on " + streetAt(...(inCar ? [car.position.x, car.position.z] : [P.x, P.z])) : ""}<br>&middot; your clock <b>${tod(tYou)}</b>; map clock (far away) <b>${tod(tMap)}</b><br>&middot; your clock runs at <b>${(rate(r) * 100).toFixed(3)}%</b> of map time; the far world runs <b>${(1 / rate(r)).toFixed(3)}×</b> faster for you<br>&middot; you are behind map time by <b>${fmtT(tMap - tYou)}</b><br>&middot; light from far away reaches you ${(1 / rate(r)).toFixed(2)}× bluer and brighter (not shown)</div>
    <div style="margin-top:8px"><b>The clock towers</b> (along East Road):<br>${TOWERS.map(T => `&middot; ${T.name}: ${(rate(T.r) * 100).toFixed(2)}%, reads ${tod(tMap * rate(T.r))}`).join("<br>")}</div>
    <div style="margin-top:8px;color:#e8b890;font-size:12.5px"><b>What would really happen</b> (the rule broken here: the ground, houses, air and you are held in place). Here the pull is ${fmt(g, " m/s²")}, ${fmt(g / 9.81)} times Earth's gravity; escape takes ${(esc / c * 100).toFixed(1)}% of the speed of light; the stretch between your head and feet is ${fmt(tide, " m/s²")} (people are torn apart above about 1,000 m/s²; that is reached ${fmtLen(Math.cbrt(2 * GM * 1.7 / 1000))} out). The Earth itself would be torn up and swallowed in minutes.</div>
    <div style="margin-top:8px;color:#c8c0d8;font-size:12.5px">${inCar ? "Driving: W / S faster or slower, A / D steer, space stop, E get out." : "Walking: WASD, shift to run, E get in the car (within 5 m)."} Drag to look.</div>`; }
function drawMap(x, z, h) { const g = MAPC.getContext("2d"), W = 220, S = W / 2 / 33000, X = v => W / 2 + v * S; g.clearRect(0, 0, W, W);
  for (const q of SPECIAL) { g.strokeStyle = q.col === "#3a3a3e" ? "#8a8a90" : q.name.startsWith("Photon") ? "#e0a050" : "#60a0e0"; g.lineWidth = 1.5; g.beginPath(); g.arc(X(0), X(0), q.r * S, 0, 7); g.stroke(); }
  g.fillStyle = "#000"; g.beginPath(); g.arc(X(0), X(0), rs * S, 0, 7); g.fill(); g.strokeStyle = "#6a6a70"; g.stroke();
  for (const T of TOWERS) { g.fillStyle = "#ffd060"; g.fillRect(X(T.pos.x) - 2, X(T.pos.z) - 2, 4, 4); }
  g.save(); g.translate(X(x), X(z)); g.rotate(h); g.fillStyle = "#ff5040"; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.fill(); g.restore(); }
function drawVR(r) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 560); g.fillStyle = "rgba(18,16,24,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 560, 22); g.fill(); g.fillStyle = "#ffd060"; g.font = "bold 34px sans-serif"; g.fillText(`${fmtLen(r - rs)} from the horizon: your clock ${(rate(r) * 100).toFixed(2)}%`, 24, 50);
  g.fillStyle = "#f0e8dc"; g.font = "30px sans-serif"; g.fillText(`you ${tod(tYou)}   map ${tod(tMap)}`, 24, 100); g.fillText(`behind map time by ${fmtT(tMap - tYou)}`, 24, 145);
  if (lastMsg && msgT > 0) { g.fillStyle = "#ffc870"; g.font = "24px sans-serif"; let ln = "", y = 200; for (const w of lastMsg.replace(/<[^>]+>/g, "").split(" ")) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 24, y); y += 31; ln = ""; if (y > 540) break; } ln += w + " "; } if (y <= 540) g.fillText(ln, 24, y); } vrT.needsUpdate = true; }
function start() { if (started) return; started = true; T0 = Date.now(); document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block"; MAPC.style.display = "block";
  say("You are in the car on East Road, 10 km from the horizon. The black dome ahead is the black hole: three times the Sun's mass, its horizon 17.7 km across, half buried. Press W to drive toward it (W again goes faster) and watch your clock fall behind the map clock. The rings of land you see wrapped round its edge are the neighbourhood behind it, its light bent round the hole."); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), headP = V3(0, 0, 0); let frameN = 0, nearAt = null;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0, steer = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0;
        if (inCar) { steer = -mx; if (my < -0.75 && !prevB.up) { gear = Math.min(SPEEDS.length - 1, gear + 1); prevB.up = true; } else if (my > -0.3) prevB.up = false; if (my > 0.75 && !prevB.dn) { gear = Math.max(0, gear - 1); prevB.dn = true; } else if (my < 0.3) prevB.dn = false; } }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed; if (bA && !prevB.a) toggleCar(); prevB.a = bA; } } }
  else { if (!inCar) { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; } else { if (keys.KeyA || keys.ArrowLeft) steer += 1; if (keys.KeyD || keys.ArrowRight) steer -= 1; } }
  if (started && inCar) { const v = SPEEDS[gear][0]; car.rotation.y += steer * dt * 0.9 * Math.min(1, v / 6 + 0.15) * (v > 300 ? 0.5 : 1); const fx = -Math.sin(car.rotation.y), fz = -Math.cos(car.rotation.y);
    let nx = car.position.x + fx * v * dt, nz = car.position.z + fz * v * dt; const nr = Math.hypot(nx, nz); if (nr < rs + 4) { nx *= (rs + 4) / nr; nz *= (rs + 4) / nr; if (gear > 2) gear = 2; } if (nr > 33000) { nx *= 33000 / nr; nz *= 33000 / nr; } car.position.set(nx, 0, nz); }
  if (started && !inCar) { const f = V3(0, 0, -1).applyEuler(new THREE.Euler(0, vr ? vrYaw + camera.rotation.y : yaw, 0)), sd = V3(-f.z, 0, f.x), sp = (keys.ShiftLeft || keys.ShiftRight ? 6 : 1.5) * dt; P.x += (f.x * -my + sd.x * mx) * sp; P.z += (f.z * -my + sd.z * mx) * sp; const pr = Math.hypot(P.x, P.z); if (pr < rs + 1) { P.x *= (rs + 1) / pr; P.z *= (rs + 1) / pr; } }
  if (inCar) { const seat = V3(-0.42, 0.72, 0.3).applyEuler(car.rotation).add(car.position); rig.position.copy(seat); rig.rotation.y = car.rotation.y + (vr ? vrYaw : 0); if (!vr) { camera.position.set(0, 0.55, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); } }
  else { rig.position.set(P.x, 0, P.z); rig.rotation.y = vr ? vrYaw : 0; if (!vr) { camera.position.set(0, 1.65, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); } }
  camera.getWorldPosition(headP); const r = Math.max(rs * 1.0001, headP.length());
  if (started) { tYou += dt; tMap += dt / rate(r); }
  farView.position.copy(headP);
  if (!nearC || Math.hypot(headP.x - nearC[0], headP.z - nearC[1]) > 140) drawNear(headP.x, headP.z);
  if (!nearAt || Math.hypot(headP.x - nearAt[0], headP.z - nearAt[1]) > 25) { fillNear(headP.x, headP.z); nearAt = [headP.x, headP.z]; }
  towerG.children.forEach(o => o.visible = Math.hypot(o.position.x - headP.x, o.position.z - headP.z) < 900);
  vrPanel.visible = vr && !inCar;
  if (frameN % 6 === 0) { drawDash(r); drawTowers(); if (!vr) { drawPanel(r); camera.getWorldDirection(fwd); drawMap(headP.x, headP.z, Math.atan2(fwd.x, -fwd.z)); } else drawVR(r); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; lastMsg = ""; }
  renderer.render(scene, camera); });

// stellarhole.js -- a black hole of three solar masses, about the lightest a collapsing star is likely to make, sitting in a suburb.
// Its event horizon (the Schwarzschild radius, 2GM/c^2) is 8.86 km: half of it rises out of the ground as a black dome 17.7 km
// across, and the neighbourhood's streets ring it. Drive or walk anywhere.
// Space near the hole is stretched along the radius: a tape laid out from the horizon reads far more than the change in the
// Schwarzschild radius r (6 m of tape is 1 mm of r). Every distance here (the field's lines, the streets, the signs) is a tape-measured
// ("proper") distance from the horizon, for things held still. Near you the world is drawn in those distances; the light you see far
// off is followed along its bent path through Schwarzschild spacetime (Binet's equation for light, integrated for every pixel,
// starting from the directions a clock held still there would measure) until it meets the ground, the horizon or the sky.
// Time: real time is your own clock (proper time); the "map" clock is the time far away, which runs faster by 1/sqrt(1 - rs/r).
// One rule is broken on purpose: the ground, the houses, the air and you are held in place, immune to the hole's pull and tides
// (see the panel for what would really happen). Built into stellarhole.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; if (IS_HEADSET) renderer.xr.setFramebufferScaleFactor(0.8);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 14000);
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
// the tape-measured distance from the horizon of a point held still at radius r (the integral of dr / sqrt(1 - rs/r)), and back:
// xOfP gives r - rs for a tape distance p (kept apart from rs, since near the horizon it is tiny: 1 m of tape is 0.03 mm of r)
const pOfR = r => { const x = r - rs; return Math.sqrt(r * x) + rs * Math.log((Math.sqrt(r) + Math.sqrt(x)) / Math.sqrt(rs)); };
const xOfP = p => { let x = p < rs ? p * p / (4 * rs) : p; for (let i = 0; i < 60; i++) { const r = rs + x, f = pOfR(r) - p; if (Math.abs(f) < 1e-10 * (1 + p)) break; x = Math.max(x - f * Math.sqrt(x / r), x * 1e-3); } return x; };
const rOfP = p => rs + xOfP(p), rateP = p => { const x = xOfP(Math.max(p, 1e-6)); return Math.sqrt(x / (rs + x)); };
const fmt = (v, u = "") => { const a = Math.abs(v); if (a === 0) return "0" + u; if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(2) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]) + u; } return (a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(2) : v.toFixed(4)) + u; };
const fmtLen = r => r >= 1000 ? (r / 1000).toFixed(r >= 1e4 ? 2 : 3) + " km" : r >= 1 ? r.toFixed(r >= 10 ? 0 : 1) + " m" : r >= 0.001 ? (r * 1000).toFixed(r >= 0.01 ? 0 : 1) + " mm" : (r * 1e6).toFixed(1) + " µm";
const fmtT = s => { if (s < 60) return s.toFixed(2) + " s"; if (s < 3600) { const m = Math.floor(s / 60); return m + " min " + Math.floor(s - m * 60) + " s"; } if (s < 86400) { const h = Math.floor(s / 3600); return h + " h " + Math.floor((s - h * 3600) / 60) + " min"; } const d = Math.floor(s / 86400); return d + " d " + Math.floor((s - d * 86400) / 3600) + " h"; };
const fmtRate = k => (k * 100).toFixed(k < 0.001 ? 4 : k < 0.01 ? 3 : 2) + "%";
const fmtTiny = s => s >= 1 ? fmtT(s) : s >= 1e-3 ? (s * 1e3).toPrecision(3) + " ms" : s >= 1e-6 ? (s * 1e6).toPrecision(3) + " µs" : s >= 1e-9 ? (s * 1e9).toPrecision(3) + " ns" : (s * 1e12).toPrecision(3) + " ps";
const perSec = k => { const s = 1 / k; return s < 120 ? s.toFixed(1) + " s" : fmtT(s); };

// ---------- the neighbourhood, in tape-measured distance p from the horizon ----------
// Between the horizon and Horizon Drive lies a field 100 m wide, lined every 5 m like a football field from the white line where the
// horizon meets the ground. Beyond it, ring streets every 120 m out to 34 km, with radial roads; named rings mark where the physics
// changes: Photon Sphere Avenue (r = 1.5 rs, where light can circle the hole: 13.5 km of tape from the horizon) and Last Stable Orbit
// Boulevard (r = 3 rs, the closest a free orbit can last: 31.9 km).
const P_IN = 110, P_OUT = 34000, STEP = 120, NG = 650, NEAR = 520, P_PHOTON = pOfR(1.5 * rs), P_ISCO = pOfR(3 * rs), MILE = 1609.344;
const TREES_N = ["Maple", "Oak", "Elm", "Cedar", "Birch", "Willow", "Aspen", "Linden", "Hickory", "Pine", "Chestnut", "Poplar", "Sycamore", "Walnut", "Spruce", "Magnolia"], KIND = ["Lane", "Court", "Circle", "Way", "Crescent", "Close"];
const SPECIAL = [{ p: P_IN, name: "Horizon Drive", w: 14, col: "#3a3a3e" }, { p: P_PHOTON, name: "Photon Sphere Avenue", w: 16, col: "#4a3a2e" }, { p: P_ISCO, name: "Last Stable Orbit Boulevard", w: 16, col: "#2e3a4a" }, { p: P_OUT, name: "Outer Ring Road", w: 16, col: "#3a3a3e" }];
const RINGS = []; for (let p = P_IN; p <= P_OUT + 1; p += STEP) RINGS.push({ p, name: "", w: 8 });
for (const S of SPECIAL) { let best = 0; RINGS.forEach((q, i) => { if (Math.abs(q.p - S.p) < Math.abs(RINGS[best].p - S.p)) best = i; }); Object.assign(RINGS[best], S); }
RINGS.forEach((q, i) => { if (!q.name) q.name = `${TREES_N[i % TREES_N.length]} ${KIND[Math.floor(i / TREES_N.length) % KIND.length]}`; q.rt = rOfP(q.p); });
// radial roads: 72 from Horizon Drive, doubling to 144 at 12.3 km and 288 at 30.1 km, so the blocks stay 500 m to 1.1 km long
// (x is east, z is south: the angle 0 points east)
const SPOKES = []; for (let k = 0; k < 288; k++) { const lev = k % 4 === 0 ? 0 : k % 2 === 0 ? 1 : 2; SPOKES.push({ a: k / 288 * Math.PI * 2, p0: [P_IN, 12300, 30100][lev], w: lev ? 8 : 12, name: k % 72 === 0 ? ["East", "South", "West", "North"][k / 72] + " Road" : lev ? `Radial ${k / 2 | 0}` : `Spoke ${k / 4}` }); }
const angDist = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };
function nearSpoke(p, a, rt) { for (const S of SPOKES) if (p >= S.p0 - 20 && angDist(a, S.a) * rt < S.w / 2 + 22) return true; return false; }
function streetAt(p, a) { const rt = rOfP(p); let best = null, bd = 1e9;
  for (const q of RINGS) { const d = Math.abs(p - q.p); if (d < bd) { bd = d; best = q; } }
  for (const S of SPOKES) if (p >= S.p0) { const d = angDist(a, S.a) * rt; if (d < bd) { bd = d; best = S; } }
  return bd < 30 ? best.name : null; }

// ---------- the far view: every pixel's light followed along its bent path ----------
// The ground's map, seen from above (streets, house roofs, lawns and the fields beyond), drawn in "survey" coordinates (rs + p, angle),
// is what the bent rays land on far off.
const EXT = rs + P_OUT + 1500, MAPN = IS_HEADSET ? 2048 : 4096;
const mapTex = canvasTex(MAPN, MAPN, (g, W) => { const S = W / (2 * EXT), P = v => (v + EXT) * S;
  g.fillStyle = "#6f7f4c"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) { const x = hash(i, 1) * W, y = hash(i, 2) * W, s = 20 + hash(i, 3) * 80; g.fillStyle = ["#7c8a52", "#8a8a58", "#6a7a44", "#9a9258", "#5f7040"][i % 5]; g.fillRect(x, y, s, s * (0.5 + hash(i, 4))); }
  g.fillStyle = "#77874f"; g.beginPath(); g.arc(P(0), P(0), (rs + P_OUT + 60) * S, 0, 7); g.fill();
  for (const q of RINGS) { const k = (rs + q.p) / q.rt; for (const off of [-18, 18]) { if (q.p === P_IN && off < 0) continue; g.strokeStyle = ["#9a6a52", "#7a7a80", "#8a5a4a", "#a8a090", "#6a5a50"][Math.abs(Math.round(q.p + off)) % 5]; g.lineWidth = 10 * S; g.setLineDash([10 * S * k, 16 * S * k]); g.beginPath(); g.arc(P(0), P(0), (rs + q.p + off) * S, 0, 7); g.stroke(); }
    g.setLineDash([]); g.strokeStyle = q.col || "#8c8c86"; g.lineWidth = Math.max(0.6, q.w * S); g.beginPath(); g.arc(P(0), P(0), (rs + q.p) * S, 0, 7); g.stroke(); }
  g.strokeStyle = "#8c8c86"; for (const Sp of SPOKES) { g.lineWidth = Math.max(0.6, Sp.w * S); g.beginPath(); g.moveTo(P(Math.cos(Sp.a) * (rs + Sp.p0)), P(Math.sin(Sp.a) * (rs + Sp.p0))); g.lineTo(P(Math.cos(Sp.a) * (rs + P_OUT)), P(Math.sin(Sp.a) * (rs + P_OUT))); g.stroke(); }
  g.fillStyle = "#000"; g.beginPath(); g.arc(P(0), P(0), rs * S, 0, 7); g.fill(); });
mapTex.anisotropy = 8;
const SUN = V3(-0.45, 0.62, 0.35).normalize();
const STEPS = IS_HEADSET ? 130 : 280, HSTEP = IS_HEADSET ? 0.04 : 0.018;
// camS: your eyes in Schwarzschild coordinates (km); camX: your r - rs (km), kept apart for precision near the horizon
const farMat = new THREE.ShaderMaterial({ uniforms: { map: { value: mapTex }, rsk: { value: rs / 1000 }, EXT: { value: EXT / 1000 }, sun: { value: SUN }, camS: { value: V3(20, 0.002, 0) }, camX: { value: 10 } },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  defines: { PIXA: (IS_HEADSET ? 0.0024 : 0.0016).toFixed(4), MAPN: MAPN.toFixed(1) },
  fragmentShader: `uniform sampler2D map; uniform float rsk, EXT, camX; uniform vec3 sun, camS; varying vec3 vW;
    vec3 sky(vec3 d){ vec3 c = mix(vec3(0.70, 0.78, 0.86), vec3(0.24, 0.42, 0.74), pow(max(d.y, 0.0), 0.55)); float s = max(dot(d, sun), 0.0);
      c += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 30.0 + pow(s, 10.0) * 0.22); if (d.y < 0.0) c = mix(vec3(0.40, 0.45, 0.33), vec3(0.70, 0.78, 0.86), exp(d.y * 25.0)); return c; }
    vec3 ground(vec3 p, float dist, float graze){ float r = max(length(p.xz), rsk), x = max(r - rsk, 0.0), tp = sqrt(r * x) + rsk * log((sqrt(r) + sqrt(x)) / sqrt(rsk)); vec2 q = p.xz * ((rsk + tp) / r);
      vec2 uv = vec2(q.x / (2.0 * EXT) + 0.5, 0.5 - q.y / (2.0 * EXT)); float lod = log2(max(1.0, dist * PIXA / max(graze, 0.015) / (2.0 * EXT / MAPN)));
      vec3 c = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? vec3(0.40, 0.45, 0.33) : textureLod(map, uv, lod).rgb;
      float rm = tp * 1000.0;
      if (rm < 101.0) { float fp = dist * PIXA / max(graze, 0.015) * 1000.0, w = rm < 1.0 ? 2.0 : 0.3, dd = rm < 1.0 ? 0.0 : abs(mod(rm + 2.5, 5.0) - 2.5), ww = max(w, fp); c = mix(c, vec3(0.92), clamp(w / ww, 0.0, 1.0) * step(dd, 0.5 * ww)); }
      return c * 0.95; }
    vec2 acc(float u, float w){ return vec2(w, -u + 1.5 * rsk * u * u); }
    void main(){ vec3 P = camS, d = normalize(vW - cameraPosition); float r0 = length(P); vec3 e1 = P / r0; float ca = dot(d, e1); vec3 t = d - ca * e1; float s = length(t);
      vec3 col = vec3(0.0); float L = 0.0;
      if (s < 1e-5) { if (ca > 0.0) { L = d.y < 0.0 ? -P.y / d.y : 60.0; col = d.y < 0.0 ? ground(P - d * P.y / d.y, L, -d.y) : sky(d); } }
      else { vec3 e2 = t / s; float q0 = (camX + 0.5 * P.y * P.y / rsk) / (rsk + camX), u = 1.0 / r0, w = -u * sqrt(max(q0, 0.0)) * ca / s, ph = 0.0, h; vec3 prev = P; bool hit = false;
        for (int i = 0; i < ${STEPS}; i++) { float rr = 1.0 / u, ds = clamp(0.3 * (rr - rsk), 0.0005, ${HSTEP.toFixed(4)} * rr); h = min(${HSTEP.toFixed(4)}, ds * u / sqrt(1.0 + w * w / (u * u)));
          vec2 k1 = acc(u, w), k2 = acc(u + 0.5 * h * k1.x, w + 0.5 * h * k1.y), k3 = acc(u + 0.5 * h * k2.x, w + 0.5 * h * k2.y), k4 = acc(u + h * k3.x, w + h * k3.y);
          float un = u + h / 6.0 * (k1.x + 2.0 * k2.x + 2.0 * k3.x + k4.x), wn = w + h / 6.0 * (k1.y + 2.0 * k2.y + 2.0 * k3.y + k4.y);
          if (un < 1.0 / 90.0) { float r = 1.0 / u, dr = -w / (u * u); vec3 dir = normalize(dr * (cos(ph) * e1 + sin(ph) * e2) + r * (-sin(ph) * e1 + cos(ph) * e2));
            if (dir.y < 0.0) { L += -prev.y / dir.y; col = ground(prev - dir * prev.y / dir.y, L, -dir.y); } else { col = sky(dir); L += 40.0; } hit = true; break; }
          ph += h; u = un; w = wn; float r = 1.0 / u; vec3 p = r * (cos(ph) * e1 + sin(ph) * e2); float seg = length(p - prev);
          if (prev.y > 0.0 && p.y <= 0.0) { float f = prev.y / (prev.y - p.y); vec3 hp = mix(prev, p, f); L += seg * f; col = length(hp) > rsk ? ground(hp, L, (prev.y - p.y) / max(seg, 1e-6)) : vec3(0.0); hit = true; break; }
          if (u >= 1.0 / rsk) { float rp = length(prev); L += seg * clamp((rp - rsk) / max(rp - r, 1e-6), 0.0, 1.0); col = vec3(0.0); hit = true; break; }
          L += seg;
          prev = p; }
        if (!hit) col = vec3(0.0); }
      col = mix(col, vec3(0.70, 0.78, 0.86), 1.0 - exp(-L / 260.0));
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, side: THREE.BackSide, depthWrite: false, depthTest: false });
const farView = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 32), farMat); farView.renderOrder = -10; farView.frustumCulled = false; scene.add(farView);

// ---------- near you: drawn in tape-measured distances ----------
// Near you the world is drawn in a flat chart: a point at tape distance p and angle a sits at radius p + c0 from the centre, where
// c0 = r - p for wherever you are, so that around you distances along the radius are tape distances and distances across it are true.
// (Space here is curved, so a flat chart is only right near you: within 500 m the error is a few per cent at most.)
let c0 = rs;
const chart = (p, a, y = 0) => V3((p + c0) * Math.cos(a), y, (p + c0) * Math.sin(a));
const groundG = new THREE.Group(), objG = new THREE.Group(); scene.add(groundG, objG); const GB = { C: rs, a: 0, p: -1e9 }, OB = { C: rs, a: 0, p: -1e9 };
scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x5a6a40, 1.1)); const sunL = new THREE.DirectionalLight(0xfff2dc, 2.2); sunL.position.copy(SUN).multiplyScalar(100); scene.add(sunL);
const nearTex = canvasTex(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048); nearTex.anisotropy = 8;
const nearGround = new THREE.Mesh(new THREE.PlaneGeometry(2 * NG, 2 * NG).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: nearTex, transparent: true, roughness: 0.95 })); nearGround.renderOrder = 1; groundG.add(nearGround);
function drawNear(pc, ac) { Object.assign(GB, { C: c0, a: ac, p: pc }); groundG.position.set(0, 0, 0); const C = c0, rc = pc + C, cx = rc * Math.cos(ac), cz = rc * Math.sin(ac); nearGround.position.set(cx, 0, cz);
  const g = nearTex.userData.c.getContext("2d"), W = nearTex.userData.c.width, S = W / (2 * NG), X = x => (x - cx + NG) * S, Z = z => (z - cz + NG) * S;
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#6f8a48"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + hash(i, cx) * 40},${90 + hash(i, cz) * 40},40,0.25)`; g.beginPath(); g.arc(hash(i, 7) * W, hash(i, 9) * W, 2 + hash(i, 5) * 9, 0, 7); g.fill(); }
  const span = (NG * 1.5) / Math.max(rc, 1000);
  const arc = (R, w, col, dash) => { g.strokeStyle = col; g.lineWidth = w * S; g.setLineDash(dash ? dash.map(v => v * S) : []); g.beginPath(); g.arc(X(0), Z(0), R * S, ac - span, ac + span); g.stroke(); };
  for (const q of RINGS) if (Math.abs(q.p - pc) < NG * 1.5) { const R = q.p + C; arc(R + q.w / 2 + 1.2, 2, "#c8c4b8"); arc(R - q.w / 2 - 1.2, 2, "#c8c4b8"); arc(R, q.w, q.col || "#5a5a5e"); if (q.w > 10) arc(R, 0.25, "#e8c840", [3, 4]); }
  g.setLineDash([]); for (const Sp of SPOKES) { const a0 = Math.max(Sp.p0, pc - NG * 1.5), a1 = Math.min(P_OUT, pc + NG * 1.5); if (a1 < a0 || angDist(Sp.a, ac) * rc > NG * 1.6) continue; const cs = Math.cos(Sp.a), sn = Math.sin(Sp.a);
    g.strokeStyle = "#c8c4b8"; g.lineWidth = (Sp.w + 4) * S; g.beginPath(); g.moveTo(X(cs * (a0 + C)), Z(sn * (a0 + C))); g.lineTo(X(cs * (a1 + C)), Z(sn * (a1 + C))); g.stroke(); g.strokeStyle = "#5a5a5e"; g.lineWidth = Sp.w * S; g.stroke(); }
  forHouses(pc, ac, NG * 1.2, C, (x, z, a, w, d, k, side) => { const ox = Math.cos(a) * side, oz = Math.sin(a) * side; g.strokeStyle = "#a8a49a"; g.lineWidth = 3 * S; g.beginPath(); g.moveTo(X(x), Z(z)); g.lineTo(X(x - ox * 14), Z(z - oz * 14)); g.stroke(); });
  if (pc < NG * 1.5 && C > 0) { g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.beginPath(); g.arc(X(0), Z(0), C * S, 0, 7); g.fill(); }
  g.globalCompositeOperation = "destination-in"; const rg = g.createRadialGradient(W / 2, W / 2, W * 0.36, W / 2, W / 2, W / 2); rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, W);
  g.globalCompositeOperation = "source-over"; nearTex.needsUpdate = true; }
// every house within reach (tape distance) of (pc, ac): rows 18 m either side of each ring street, a house every 26 m along the row
function forHouses(pc, ac, reach, C, fn) { const rc = pc + C;
  RINGS.forEach((q, qi) => { for (const side of [-1, 1]) { const pr = q.p + side * 18; if (Math.abs(pr - pc) > reach || (qi === 0 && side < 0)) continue;
    const rt = rOfP(pr), R = pr + C, da = Math.acos(Math.max(-1, Math.min(1, (R * R + rc * rc - reach * reach) / (2 * R * rc)))), k0 = Math.ceil((ac - da) * rt / 26), k1 = Math.floor((ac + da) * rt / 26);
    for (let k = k0; k <= k1; k++) { const a = k * 26 / rt; if (nearSpoke(pr, a, rt)) continue; const hk = hash(k, pr); if (hk < 0.06) continue;
      fn(Math.cos(a) * R, Math.sin(a) * R, a, 9 + hash(k, pr + 1) * 5, 8 + hash(k, pr + 2) * 4, hk, side); } } }); }
const wallTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#f2ede2"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a4a5a"; for (const x of [30, 160]) { g.fillRect(x, 34, 56, 46); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(x, 34, 56, 46); } g.fillStyle = "#6a4a32"; g.fillRect(108, 58, 34, 70); });
const NH = 1400, houseIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 }), NH);
const roofIM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), M(0xffffff, { roughness: 0.9 }), NH);
const trunkIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 6).translate(0, 0.5, 0), M(0x5a4030), NH), crownIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), M(0xffffff, { roughness: 0.95, flatShading: true }), NH);
const railIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 1.1, 0.2).translate(0, 0.55, 0), M(0xd8d8d0), 400);
// the field's lines: the white boundary where the horizon meets the ground, a line every 5 m, a number every 10 m (read facing the hole)
const lineIM = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), M(0xf2f2ea, { roughness: 0.9 }), 7000);
const NUMS = Array.from({ length: 10 }, (_, i) => { const t = canvasTex(256, 160, (g, w, h) => { g.fillStyle = "#f2f2ea"; g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String((i + 1) * 10), w / 2, h / 2 + 6); });
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.6, 2.25).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, depthWrite: false }), 60); im.renderOrder = 2; return im; });
// the car's track: two rails on a dark bed down the middle of East Road, from the fence out to the Outer Ring Road
const trackIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M(0xb8bcc4, { metalness: 0.7, roughness: 0.35 }), 400), bedIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), M(0x3a3430), 200);
for (const im of [houseIM, roofIM, trunkIM, crownIM, railIM, lineIM, ...NUMS, trackIM, bedIM]) { im.frustumCulled = false; im.count = 0; objG.add(im); }
const O3 = new THREE.Object3D(), COLW = [0xf2ede2, 0xe8dcc4, 0xd8e0e8, 0xf0e0c8, 0xe0d0c0, 0xc8d4c0], COLR = [0x5a4a42, 0x3a3a40, 0x7a3a30, 0x4a5a6a, 0x6a6058];
function fillNear(pc, ac) { Object.assign(OB, { C: c0, a: ac, p: pc }); objG.position.set(0, 0, 0); const C = c0; let n = 0, t = 0, rl = 0, ln = 0; const tmpC = new THREE.Color(), nn = NUMS.map(() => 0);
  forHouses(pc, ac, NEAR, C, (x, z, a, w, d, hk, side) => { if (n >= NH) return; const R = Math.hypot(x, z), dist = Math.hypot(R - pc - C, (rc => rc * angDist(a, ac))(pc + C)), f = THREE.MathUtils.smoothstep(NEAR - dist, 0, 60), h = (hk < 0.3 ? 6 : 3.4) * f;
    O3.position.set(x, 0, z); O3.rotation.set(0, -a + (side > 0 ? Math.PI / 2 : -Math.PI / 2), 0); O3.scale.set(w, Math.max(0.01, h), d); O3.updateMatrix(); houseIM.setMatrixAt(n, O3.matrix); houseIM.setColorAt(n, tmpC.setHex(COLW[Math.floor(hk * 97) % COLW.length]));
    O3.position.y = h; O3.scale.set(w * 1.02, 2.6 * f + 0.01, d * 1.02); O3.updateMatrix(); roofIM.setMatrixAt(n, O3.matrix); roofIM.setColorAt(n, tmpC.setHex(COLR[Math.floor(hk * 53) % COLR.length])); n++;
    if (t < NH - 2) for (const back of [40, 52]) { const tr = hash(hk * 9, back); if (tr < 0.45) continue; const Rt = R + side * (back - 18), b = a + (tr - 0.7) * 20 / Rt, tx = Math.cos(b) * Rt, tz = Math.sin(b) * Rt, s = (5 + tr * 7) * f;
      O3.rotation.set(0, 0, 0); O3.position.set(tx, 0, tz); O3.scale.set(1, s * 0.45, 1); O3.updateMatrix(); trunkIM.setMatrixAt(t, O3.matrix); O3.position.y = s * 0.62; O3.scale.set(s * 0.32, s * 0.38, s * 0.32); O3.updateMatrix(); crownIM.setMatrixAt(t, O3.matrix); crownIM.setColorAt(t, tmpC.setHSL(0.24 + tr * 0.06, 0.45, 0.24 + tr * 0.08)); t++; } });
  if (pc < NEAR + 120) {
    for (let d = 0; d <= 100; d += 5) { const R = C + (d || 0.6), wdt = d ? 0.3 : 1.2, da = Math.min(Math.PI, (NEAR + 60) / R), st = 4 / R;
      for (let a = Math.round((ac - da) / st) * st; a < ac + da && ln < 7000; a += st) { O3.rotation.set(0, -a, 0); O3.position.set(Math.cos(a) * R, 0.03, Math.sin(a) * R); O3.scale.set(wdt, 1, 4.04); O3.updateMatrix(); lineIM.setMatrixAt(ln++, O3.matrix); }
      if (d && d % 10 === 0) { const im = NUMS[d / 10 - 1], R2 = C + d + 2.6, st2 = 30 / R2; for (let a = Math.round((ac - da) / st2) * st2; a < ac + da && nn[d / 10 - 1] < 60; a += st2) { O3.rotation.set(0, Math.PI / 2 - a, 0); O3.position.set(Math.cos(a) * R2, 0.04, Math.sin(a) * R2); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(nn[d / 10 - 1]++, O3.matrix); } } }
    const R = C + 2, da = Math.min(Math.PI, (NEAR + 60) / R); for (let a = ac - da; a < ac + da && rl < 400; a += 4 / R) { O3.rotation.set(0, -a, 0); O3.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); O3.scale.set(1, 1, 1); O3.updateMatrix(); railIM.setMatrixAt(rl++, O3.matrix); } }
  let tk = 0, bd = 0; if (angDist(ac, 0) * (pc + C) < NEAR + 60) for (let q = Math.max(4, Math.ceil((pc - NEAR) / 6) * 6); q <= Math.min(P_OUT, pc + NEAR) && bd < 200; q += 6) { const R = q + C;
    O3.rotation.set(0, Math.PI / 2, 0); O3.scale.set(2.4, 0.06, 6.05); O3.position.set(R, 0.01, 0); O3.updateMatrix(); bedIM.setMatrixAt(bd++, O3.matrix);
    for (const lat of [-0.75, 0.75]) { O3.scale.set(0.1, 0.16, 6.05); O3.position.set(R * Math.cos(lat / R), 0.06, R * Math.sin(lat / R)); O3.updateMatrix(); trackIM.setMatrixAt(tk++, O3.matrix); } }
  houseIM.count = roofIM.count = n; trunkIM.count = crownIM.count = t; railIM.count = rl; lineIM.count = ln; NUMS.forEach((im, i) => im.count = nn[i]); trackIM.count = tk; bedIM.count = bd;
  for (const im of [houseIM, roofIM, trunkIM, crownIM, railIM, lineIM, ...NUMS, trackIM, bedIM]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }

// ---------- people, traffic and airplanes, each moving at its normal pace by its own clock ----------
// Each runs on its own proper time, which advances by (map time) x sqrt(1 - rs/r) where it is. People walk at 1.4 m/s and cars drive
// at 12 m/s by their own clocks, round the ring streets (where everyone shares one clock rate) and across the field. So from near the
// horizon those farther out hurry and those nearer crawl; from far out, everything near the horizon creeps. (Like you, they are held
// by the broken rule; their light is drawn straight.)
RINGS.forEach(q => q.k = rateP(q.p));
const FIELD_W = [3, 8, 15, 25, 40, 60, 85].map(p => ({ p, k: rateP(p), rt: rOfP(p), w: 0 }));
const NP = 700, NCAR = 320, COLP = [0x3a5a8a, 0x8a3a3a, 0x3a7a4a, 0xc8a040, 0x6a4a7a, 0x2a2a2a, 0xd8d0c0, 0x8a6a4a];
const bodyIM = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.95, 4, 10).translate(0, 0.72, 0), M(0xffffff), NP), headIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 8).translate(0, 1.6, 0), M(0xc8a080), NP);
const carBIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.75, 4.3).translate(0, 0.62, 0), M(0xffffff, { metalness: 0.4, roughness: 0.4 }), NCAR), carCIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.6, 2.1).translate(0, 1.3, -0.2), M(0x9ab8d0, { metalness: 0.3, roughness: 0.2 }), NCAR);
for (const im of [bodyIM, headIM, carBIM, carCIM]) { im.frustumCulled = false; im.count = 0; scene.add(im); }
const COLC = [0xc0392b, 0x2a6ab8, 0xe8e8e8, 0x2a2a2a, 0x8a8a90, 0x3a7a4a, 0xd8b040];
// along a ring of tape distance p (true radius rt) with clock rate k: things spaced `gap` metres apart, moving at v by their own time
function along(p, rt, k, v, gap, lat, dir, seed, pc, ac, fn) { const base = dir * v * tMap * k, da = (NEAR + 40) / Math.max(rt, 1), s0 = (ac - da) * rt, s1 = (ac + da) * rt;
  for (let j = Math.ceil((s0 - base) / gap); j <= Math.floor((s1 - base) / gap); j++) { if (hash(j, seed) < 0.3) continue; const sj = j * gap + base + hash(j, seed + 1) * gap * 0.5, a = sj / rt; fn(chart(p + lat, a), a, j, k); } }
const tmpCol = new THREE.Color();
function moversStep(pc, ac) { let n = 0, m = 0;
  const person = (pos, a, j, k, seed) => { if (n >= NP) return; const bob = 0.05 * Math.abs(Math.sin(2 * Math.PI * 1.8 * tMap * k + j)); O3.position.set(pos.x, bob, pos.z); O3.rotation.set(0, -a, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); bodyIM.setMatrixAt(n, O3.matrix); headIM.setMatrixAt(n, O3.matrix); bodyIM.setColorAt(n, tmpCol.setHex(COLP[Math.floor(hash(j, seed + 7) * COLP.length)])); n++; };
  for (const q of RINGS) { if (Math.abs(q.p - pc) > NEAR) continue;
    for (const dir of [-1, 1]) { along(q.p, q.rt, q.k, 1.4, 55, dir * (q.w / 2 + 1.6), dir, q.p + dir, pc, ac, (pos, a, j, k) => person(pos, a, j, k, q.p));
      along(q.p, q.rt, q.k, 12, 150, dir * (q.w > 10 ? 3 : 2), dir, q.p * 3 + dir, pc, ac, (pos, a, j) => { if (m >= NCAR) return; O3.position.copy(pos); O3.rotation.set(0, -a, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); carBIM.setMatrixAt(m, O3.matrix); carCIM.setMatrixAt(m, O3.matrix); carBIM.setColorAt(m, tmpCol.setHex(COLC[Math.floor(hash(j, q.p + 9) * COLC.length)])); m++; }); } }
  if (pc < NEAR + 100) for (const F of FIELD_W) for (const dir of [-1, 1]) along(F.p, F.rt, F.k, 1.4, 34, 0, dir, F.p * 7 + dir, pc, ac, (pos, a, j, k) => person(pos, a, j, k, F.p));
  bodyIM.count = headIM.count = n; carBIM.count = carCIM.count = m;
  for (const im of [bodyIM, headIM, carBIM, carCIM]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
// two airliners flying a long loop over East Road, 300 m up: in from 12 km to 600 m from the horizon, round, and out again, at
// 90 m/s by their own clocks. Watch one from far out and it crawls as it nears the hole; from near the hole, it races.
const PLANE_L = 2 * 11400 + 2 * Math.PI * 300, PLANES = [0, PLANE_L / 2].map(s => ({ s, g: new THREE.Group() }));
for (const P of PLANES) { const w = M(0xf2f2f2, { roughness: 0.5 }), b = M(0x2a5aa8); const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; P.g.add(m); };
  add(new THREE.CylinderGeometry(1.9, 1.9, 34, 16), w, 0, 0, 0, Math.PI / 2); add(new THREE.ConeGeometry(1.9, 5, 16), w, 0, 0, 19.5, Math.PI / 2); add(new THREE.ConeGeometry(1.9, 6, 16), w, 0, 0.6, -20, -Math.PI / 2);
  add(new THREE.BoxGeometry(34, 0.4, 5), w, 0, -0.6, 1); add(new THREE.BoxGeometry(11, 0.3, 2.6), w, 0, 0.8, -19); add(new THREE.BoxGeometry(0.4, 6, 4), b, 0, 3.6, -19.5); add(new THREE.BoxGeometry(3.85, 0.5, 30), b, 0, -0.4, 0);
  for (const x of [-7, 7]) add(new THREE.CylinderGeometry(1.1, 1.1, 4.5, 12), M(0xb8bcc4, { metalness: 0.6 }), x, -1.8, 3, Math.PI / 2); P.g.visible = false; scene.add(P.g); }
function planePath(s) { s = ((s % PLANE_L) + PLANE_L) % PLANE_L; const R = 300, A = 11400, T = Math.PI * R;
  if (s < A) return [12000 - s, R, -1, 0]; s -= A; if (s < T) { const t = s / R; return [600 - R * Math.sin(t), R * Math.cos(t), -Math.cos(t), -Math.sin(t)]; } s -= T;
  if (s < A) return [600 + s, -R, 1, 0]; s -= A; const t = s / R; return [12000 + R * Math.sin(t), -R * Math.cos(t), Math.cos(t), Math.sin(t)]; }
function planesStep(dtMap, pc) { for (const P of PLANES) { const [p0] = planePath(P.s); P.s += 90 * dtMap * rateP(Math.max(1, p0)); const [p, lat, dp, dl] = planePath(P.s), rt = rOfP(p), a = lat / rt, pos = chart(p, a, 300);
    P.g.position.copy(pos); const ur = [Math.cos(a), Math.sin(a)], dx = dp * ur[0] - dl * ur[1], dz = dp * ur[1] + dl * ur[0]; P.g.rotation.set(0, Math.atan2(dx, dz), 0); P.g.visible = pos.distanceTo(headP) < 12000; } }

// ---------- comfort: in VR, a soft dark vignette narrows your view while you move ----------
const vig = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { s: { value: 0 } }, vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform float s; varying vec2 vU; void main(){ float d = length(vU - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.0, 0.0, s * smoothstep(0.3, 0.8, d)); }", transparent: true, depthTest: false, depthWrite: false }));
vig.position.set(0, 0, -0.25); vig.renderOrder = 40; vig.visible = false; camera.add(vig); let vigS = 0;

// ---------- clocks: map time (far away) against proper time ----------
// Map time is Schwarzschild coordinate time, what a clock very far from the hole reads. A clock held still at radius r ticks
// sqrt(1 - rs/r) as fast. Real time here is your own time: near the horizon the far-away world, and the map clock, race ahead.
let tMap = 0, tYou = 0, T0 = Date.now(), started = false;
const tod = sec => { const d = new Date(T0 + sec * 1000); let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; const days = Math.floor((d - new Date(T0).setHours(0, 0, 0, 0)) / 86400000); return `${h}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${ap}${days > 0 ? ` +${days} d` : ""}`; };
// clock signs along the four main roads: in the field at 1, 2, 5, 10, 20 and 50 m from the horizon (by tape), then one every 100 m out
// to 34 km, a mile marker every mile on the other side of the road, and at Photon Sphere Avenue and Last Stable Orbit Boulevard. Each
// shows the time on a clock held still there, how fast it runs, how fast it looks from where you are, and the pull it takes to stay put.
// On top of each, a spinner turns once every 2 s and a lamp blinks once a second, by that place's own time: you see them at the rate
// your clock receives them, faster than yours farther out, slower closer in. (Only the signs near you exist at any moment: a pool.)
const ROADS = [[0, "East Road"], [Math.PI / 2, "South Road"], [Math.PI, "West Road"], [Math.PI * 1.5, "North Road"]], SPEC_C = {};
const holdG = (r, k) => GM / (r * r) / k;
function signSpecs(pc, ac) { const out = [], rc = pc + c0;
  for (const [A, road] of ROADS) { if (angDist(ac, A) * rc > 800) continue;
    const add = (d, name, side, kind) => { if (Math.abs(d - pc) > 700) return; const id = road + kind + d; let S = SPEC_C[id]; if (!S) { const rt = rOfP(d), k = rateP(d); S = SPEC_C[id] = { id, d, name, road, rt, k, g: holdG(rt, k), a: A + side * (d <= 100 ? 3 : 10) / rt }; } out.push(S); };
    for (const d of [1, 2, 5, 10, 20, 50]) add(d, `${d} m from the horizon`, 1, "f");
    for (let d = Math.max(100, Math.ceil((pc - 700) / 100) * 100); d <= Math.min(P_OUT, pc + 700); d += 100) add(d, `${d >= 1000 ? (d / 1000).toFixed(1) + " km" : d + " m"} from the horizon`, 1, "h");
    for (let m = Math.max(1, Math.ceil((pc - 700) / MILE)); m * MILE <= Math.min(P_OUT, pc + 700); m++) add(m * MILE, `Mile ${m} (${(m * MILE / 1000).toFixed(2)} km)`, -1, "m");
    add(P_PHOTON, "Photon Sphere Avenue", -1, "p"); add(P_ISCO, "Last Stable Orbit Blvd", -1, "i"); }
  return out; }
const poleG = new THREE.CylinderGeometry(0.07, 0.09, 2.95, 8).translate(0, 1.47, 0), mastG = new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8).translate(0, 1.8, 0), poleM = M(0x9a9aa2, { metalness: 0.6, roughness: 0.4 }), armG = new THREE.BoxGeometry(1.5, 0.06, 0.06).translate(0.75, 0, 0), cupG = new THREE.SphereGeometry(0.14, 10, 8);
const blurM = new THREE.MeshBasicMaterial({ color: 0xe8c040, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), lampOn = new THREE.MeshBasicMaterial({ color: 0xff5030 }), lampOff = M(0x5a2a22);
const POOL = Array.from({ length: 56 }, () => { const o = { id: null, rot: 0, g: new THREE.Group() }; o.g.add(new THREE.Mesh(poleG, poleM)); o.tex = canvasTex(512, 256); o.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: o.tex, toneMapped: false })); o.sprite.position.y = 4.05; o.sprite.scale.set(4.4, 2.2, 1); o.g.add(o.sprite);
  o.mast = new THREE.Group(); o.mast.add(new THREE.Mesh(mastG, poleM)); o.g.add(o.mast); o.spin = new THREE.Group(); o.spin.position.y = 3.7; for (let i = 0; i < 3; i++) { const arm = new THREE.Mesh(armG, M(0xd0d0d8, { metalness: 0.5 })); arm.rotation.y = i * Math.PI * 2 / 3; const cup = new THREE.Mesh(cupG, M(i ? 0xe8c040 : 0xd03020)); cup.position.set(1.5 * Math.cos(-i * Math.PI * 2 / 3), 0, 1.5 * Math.sin(-i * Math.PI * 2 / 3)); o.spin.add(arm, cup); }
  o.blur = new THREE.Mesh(new THREE.CircleGeometry(1.65, 32).rotateX(-Math.PI / 2), blurM); o.blur.position.y = 3.7; o.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), lampOff); o.lamp.position.y = 4.15; o.mast.add(o.spin, o.blur, o.lamp); o.g.visible = false; scene.add(o.g); return o; });
let SPECS = [];
function placeSigns(pc, ac, k, dt) { if (frameN % 10 === 0 || !SPECS.length) { SPECS = signSpecs(pc, ac); const want = new Set(SPECS.map(S => S.id)); for (const o of POOL) if (o.id && !want.has(o.id)) { o.id = null; o.g.visible = false; }
    for (const S of SPECS) if (!POOL.some(o => o.id === S.id)) { const o = POOL.find(o => !o.id); if (!o) break; o.id = S.id; o.S = S; o.g.visible = true; o.drawn = false; } }
  for (const o of POOL) { if (!o.id) continue; const S = o.S; o.g.position.copy(chart(S.d, S.a)); o.mast.position.set(-Math.sin(S.a) * 4.5, 0, Math.cos(S.a) * 4.5); const rel = S.k / k, rps = 0.5 * rel, hz = rel;
    o.rot += dt * TS * 2 * Math.PI * rps; o.spin.rotation.y = -o.rot % (2 * Math.PI); const fast = rps * TS > 6; o.spin.visible = !fast; o.blur.visible = fast;
    o.lamp.material = hz * TS > 12 ? lampOn : ((tMap * S.k) % 1 < 0.2 ? lampOn : lampOff); o.lamp.scale.setScalar(hz > 12 ? 0.8 : 1); } }
function drawSigns(k) { for (const o of POOL) { if (!o.id) continue; const S = o.S, g = o.tex.userData.c.getContext("2d"), rel = S.k / k; g.clearRect(0, 0, 512, 256); g.fillStyle = "rgba(16,14,22,.9)"; g.beginPath(); g.roundRect(0, 0, 512, 256, 18); g.fill();
    g.fillStyle = "#ffd060"; g.font = "bold 30px sans-serif"; g.fillText(S.name, 18, 40, 476); g.fillStyle = "#f2eadb"; g.font = "bold 48px monospace"; g.fillText(tod(tMap * S.k), 18, 98, 476); g.font = "24px sans-serif"; g.fillStyle = "#c8c0d8";
    g.fillText(`ticks at ${fmtRate(S.k)} of map time: 1 s = ${perSec(S.k)} far away`, 18, 140, 476);
    g.fillStyle = rel > 1.02 ? "#9ae08a" : rel < 0.98 ? "#e09a8a" : "#c8c0d8"; g.fillText(rel > 1.02 ? `seen from you: ${fmt(rel)}× faster than your clock` : rel < 0.98 ? `seen from you: ${fmt(1 / rel)}× slower than your clock` : "seen from you: about the same as your clock", 18, 178, 476);
    g.fillStyle = "#e8b890"; g.fillText(`to stay put here: ${fmt(S.g / 9.81)} g`, 18, 216, 476); o.tex.needsUpdate = true; } }

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
let inCar = false;
// where you and the car are: tape distance p from the horizon and angle a. The car runs on a track straight down East Road, always
// facing away from the hole, and never turns: W (or the left stick up) rides out to the next stop, S back in, at an ordinary road speed
// (30 to 130 km/h, 50 by default), speeding up and slowing down gently at 1.2 m/s². (Turning and hard acceleration are what make
// people sick in VR.)
const PL = { p: 6, a: -3 / rs }, CAR = { p: 8, a: 0 }; car.rotation.y = -Math.PI / 2;
const STOPS = [[8, "the fence"], [100, "Horizon Drive (100 m)"], [MILE, "Mile 1"], [3 * MILE, "Mile 3"], [P_PHOTON, "Photon Sphere Avenue"], [10 * MILE, "Mile 10"], [P_ISCO, "Last Stable Orbit Boulevard"]];
const RIDE = { on: false, to: 8, v: 0 }, CRUISE = [[8.33, "30 km/h"], [13.9, "50 km/h"], [25, "90 km/h"], [36.1, "130 km/h"]], ACC = 1.2; let cruiseI = 1;
const stopName = v => (STOPS.find(s => Math.abs(s[0] - v) < 1) || [0, fmtLen(v)])[1];
const tripTime = d => { const v = CRUISE[cruiseI][0]; return d > v * v / ACC ? d / v + v / ACC : 2 * Math.sqrt(d / ACC); };
function setCruise(dj) { cruiseI = Math.max(0, Math.min(CRUISE.length - 1, cruiseI + dj)); say(`Car speed ${CRUISE[cruiseI][1]}.`); }
function nextStop(dir, from) { const L = STOPS.map(s => s[0]); return dir > 0 ? L.find(v => v > from + 1) : [...L].reverse().find(v => v < from - 1); }
function rideTo(dir) { const same = RIDE.on && Math.sign(RIDE.to - CAR.p) === dir, tgt = nextStop(dir, same ? RIDE.to : CAR.p); if (tgt === undefined) { say(dir > 0 ? "This is the last stop outward." : "This is the stop nearest the horizon."); return; }
  const d = Math.abs(tgt - CAR.p); Object.assign(RIDE, { on: true, to: tgt }); const T = tripTime(d); say(`Riding ${dir > 0 ? "out" : "in"} to ${stopName(tgt)}: ${fmtLen(d)} at ${CRUISE[cruiseI][1]}, about ${T < 90 ? Math.round(T) + " s" : Math.round(T / 60) + " min"}. (− and = change the speed.)`); }
function drawDash(p, k) { const g = dashT.userData.c.getContext("2d"); g.fillStyle = "#0e0c14"; g.fillRect(0, 0, 1024, 440); g.fillStyle = "#8a84a0"; g.font = "26px sans-serif"; g.fillText("YOUR CLOCK", 30, 46); g.fillText("MAP CLOCK (far away)", 540, 46);
  g.fillStyle = "#ffd060"; g.font = "bold 58px monospace"; g.fillText(tod(tYou), 30, 112, 480); g.fillStyle = "#f2eadb"; g.fillText(tod(tMap), 540, 112, 470);
  g.font = "28px sans-serif"; g.fillStyle = "#c8c0d8"; g.fillText(`Your clock runs at ${fmtRate(k)}: each of your seconds is ${perSec(k)} far away`, 30, 176, 960);
  g.fillText(`Behind map time by ${fmtT(tMap - tYou)} · time: ${fmtTS()}`, 30, 220, 960); g.fillText(`${fmtLen(p)} from the horizon by tape (r is ${fmtLen(xOfP(p))} above rs)`, 30, 264, 960);
  const no = nextStop(1, CAR.p), ni = nextStop(-1, CAR.p); g.fillStyle = "#ffd060"; g.fillText(RIDE.on ? `Riding to ${stopName(RIDE.to)}: ${(Math.abs(RIDE.v) * 3.6).toFixed(0)} km/h, ${fmtLen(Math.abs(RIDE.to - CAR.p))} to go` : `W: out to ${no !== undefined ? stopName(no) : "(end)"} · S: in to ${ni !== undefined ? stopName(ni) : "(end)"}`, 30, 320, 960); g.fillStyle = "#8a84a0"; g.font = "24px sans-serif"; g.fillText(streetAt(CAR.p, CAR.a) || "off the road", 30, 370); dashT.needsUpdate = true; }

// ---------- moving about ----------
let yaw = Math.PI / 4, pitch = 0.05; const keys = {}; let vrYaw = 0;
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return;
  if (e.code === "KeyE") toggleCar(); if (e.code === "KeyG") dropBall(); if (e.code === "KeyM") slowPreset(); if (e.code === "BracketLeft") setTS(TS / 2); if (e.code === "BracketRight") setTS(TS * 2); if (e.code === "Backslash") setTS(1);
  if (inCar && e.code === "Minus") setCruise(-1); if (inCar && e.code === "Equal") setCruise(1);
  if (inCar && (e.code === "KeyW" || e.code === "ArrowUp")) rideTo(1);
  if (inCar && (e.code === "KeyS" || e.code === "ArrowDown")) rideTo(-1); });
addEventListener("keyup", e => keys[e.code] = false);
const toChart = v => { const R = Math.hypot(v.x, v.z); return { p: R - c0, a: Math.atan2(v.z, v.x) }; };
function toggleCar() { if (inCar) { if (RIDE.on) { say("Wait for the car to stop before you get out."); return; } inCar = false; const s = V3(-2.4, 0, 0.3).applyEuler(new THREE.Euler(0, car.rotation.y, 0)).add(car.position); Object.assign(PL, toChart(s)); PL.p = Math.max(1, PL.p); yaw += car.rotation.y; vrYaw += car.rotation.y; say("On foot. WASD to walk, shift to run; E by the car to get back in."); }
  else if (chart(PL.p, PL.a).distanceTo(car.position) < 5) { inCar = true; yaw -= car.rotation.y; vrYaw -= car.rotation.y; say("In the car, on the track down East Road. W rides out to the next stop, S back in; E gets out."); } else say("Walk back to the car (within 5 m) to get in."); }
// moving by a velocity (vx, vz) in the chart: along the radius it is tape distance, across it true distance at your radius
function move(S, vx, vz, dt, pmin) { const cs = Math.cos(S.a), sn = Math.sin(S.a), vr = vx * cs + vz * sn, vt = -vx * sn + vz * cs; S.p = Math.min(P_OUT + 3000, Math.max(pmin, S.p + vr * dt)); S.a += vt * dt / rOfP(S.p); }
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; start(); });
addEventListener("pointermove", e => { if (!drag) return; drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); yaw -= (e.clientX - drag.x) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", e => { if (drag && drag.moved < 6 && started && !renderer.xr.isPresenting) { if (HELD) releaseHeld(); else { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera); tryGrab(ray.ray.origin, ray.ray.direction, camera); } } drag = null; });
// VR controllers: point at a thing and hold the trigger to pick it up; release the trigger to let it go
[0, 1].forEach(i => { const ct = renderer.xr.getController(i); rig.add(ct); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd060 })); l.scale.z = 4; ct.add(l);
  ct.addEventListener("selectstart", () => { const o = V3(0, 0, 0), d = V3(0, 0, -1); ct.getWorldPosition(o); d.applyQuaternion(ct.getWorldQuaternion(new THREE.Quaternion())); tryGrab(o, d, ct); });
  ct.addEventListener("selectend", () => { if (HELD && HELD.holder === ct) releaseHeld(); }); });
const VRB = document.getElementById("vr"), prevB = {};
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 560; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.273), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.32, -0.7); vrPanel.rotation.x = -0.45; vrPanel.visible = false; camera.add(vrPanel);
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; s.addEventListener("end", () => { vrPanel.visible = false; }); }; });

// ---------- dropping a ball toward the horizon ----------
// It is not held by the broken rule: it falls freely, straight in. Radial infall from rest at r0 (Misner, Thorne & Wheeler 25.37):
// r = r0 (1 + cos e)/2; its own time tau = sqrt(r0^3 / (2 rs c^2)) (e + sin e); map time t = (rs/c) [ln((A + tan(e/2)) / (A - tan(e/2)))
// + A (e + (r0 / 2rs)(e + sin e))] with A = sqrt(r0/rs - 1), which runs to infinity at the horizon. What you see is delayed by the
// light's travel back out to you (the tortoise coordinate r + rs ln(r/rs - 1)). By default it runs in real time, your time: near the
// horizon the pull is so enormous that the ball is gone before you could see it leave your hand. M (X in VR) slows it down so that
// each fall takes a few seconds to watch.
const BALLS = [], ballG = new THREE.SphereGeometry(0.35, 16, 12);
// the rate of time: everything (your clock, the map clock, the signs, people, cars, planes and falling things) runs at TS times real
// time. [ halves it, ] doubles it, \ goes back to real time, M jumps to a slow motion that shows a fall from where you are in about 7 s.
let TS = 1, tsPrev = 1;
const fmtTS = () => TS === 1 ? "real time" : TS < 1 ? `${fmt(1 / TS)}× slower than real time` : `${fmt(TS)}× faster than real time`;
function setTS(v) { TS = Math.min(1e6, Math.max(1e-15, v)); say(`Time now runs ${fmtTS()} (for everything, your clock too). [ slower, ] faster, \\ real time, M slow motion for a fall.`); }
function slowPreset() { if (TS !== 1) { setTS(1); return; } const pY = Math.max(0.5, toChart(headP).p), x0 = xOfP(pY), r0 = rs + x0, A = Math.sqrt(x0 / rs), B = { x0, r0, A, eH: 2 * Math.atan(A) };
  setTS(ballT(B, 2 * Math.asin(Math.sqrt(x0 * (1 - FADE_X) / r0)), x0) * rateP(pY) / 7); }
// the map time, after the drop, at which you see the ball at infall phase e (from where you stand now, xYou = your r - rs)
function ballT(B, e, xYou) { const th = Math.tan(e / 2), x = Math.max(1e-300, B.x0 - B.r0 * Math.sin(e / 2) ** 2); return (rs / c) * (Math.log((B.A + th) / (B.A - th)) + B.A * (e + B.r0 / (2 * rs) * (e + Math.sin(e)))) + ((xYou - x) + rs * Math.log(xYou / x)) / c - ((xYou - B.x0) + rs * Math.log(xYou / B.x0)) / c; }
const FADE_X = (0.02 / 1.6) ** 2;
// start something falling from where it is: not held by the broken rule, it falls straight in
function fallFrom(mesh, at, obj) { const C = toChart(at), p0 = Math.max(0.5, C.p), x0 = xOfP(p0), r0 = rs + x0, A = Math.sqrt(x0 / rs), eH = 2 * Math.atan(A), pY = Math.max(0.5, toChart(headP).p);
  const B = { mesh, obj, a: C.a, y: Math.max(0.25, at.y), x0, r0, A, eH, T: 0, p: p0, op: 1, base: mesh.material.color.clone(), tauH: Math.sqrt(r0 ** 3 / (2 * rs * c * c)) * (eH + Math.sin(eH)) };
  B.tFade = ballT(B, 2 * Math.asin(Math.sqrt(x0 * (1 - FADE_X) / r0)), xOfP(pY)); BALLS.push(B); const yours = B.tFade * rateP(pY), shown = yours / TS;
  return `It is not held, so it falls straight toward the hole. In your own time it reaches the horizon's edge, freezes there and fades in ${fmtTiny(yours)}` + (shown < 0.05 ? `: at ${fmtTS()} that is far too fast to see${TS === 1 ? " (it is gone before you could see it leave your hand)" : ""}. Press M for slow motion, or [ to slow time, and try again.` : `; at ${fmtTS()} you watch it for about ${fmtTiny(shown)}.`) + ` On its own clock it crosses the horizon ${fmtTiny(B.tauH)} after you let go; from outside you never see it cross.`; }
function dropBall() { if (!started) return; if (HELD) { releaseHeld(); return; } if (BALLS.filter(B => !B.obj).length > 5) { const B = BALLS.find(B => !B.obj); scene.remove(B.mesh); BALLS.splice(BALLS.indexOf(B), 1); }
  const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())), at = headP.clone().addScaledVector(f.setY(0).normalize(), 1.2); at.y -= 0.3;
  const mesh = new THREE.Mesh(ballG, new THREE.MeshStandardMaterial({ color: 0xff8a20, emissive: 0x401800, transparent: true })); scene.add(mesh); say("You let go of a ball. " + fallFrom(mesh, at)); }
// things lying about to pick up (click, or point and hold the trigger in VR) and let go (click again, G, or release the trigger)
const OBJS = []; let HELD = null;
{ const kinds = [["crate", new THREE.BoxGeometry(0.5, 0.5, 0.5).translate(0, 0.25, 0), 0xa87a48], ["ball", new THREE.SphereGeometry(0.22, 16, 12).translate(0, 0.22, 0), 0x3a8ad8], ["cone", new THREE.ConeGeometry(0.2, 0.55, 16).translate(0, 0.275, 0), 0xf07020], ["bucket", new THREE.CylinderGeometry(0.2, 0.15, 0.35, 16).translate(0, 0.175, 0), 0xd8d040], ["melon", new THREE.SphereGeometry(0.2, 16, 12).scale(1, 0.8, 1.2).translate(0, 0.16, 0), 0x3a7a3a]];
  const spot = (p, lat, i) => { const [name, geo, col] = kinds[i % kinds.length], mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, transparent: true })); scene.add(mesh); OBJS.push({ name, mesh, home: { p, lat }, state: "rest", base: new THREE.Color(col) }); };
  [[2.5, -2.2], [3.5, -4.5], [4, 2.6], [5, -6.5], [7, -2.0], [9, -5], [11, -2.5], [13, -7], [16, -4], [20, -1.5], [25, -6], [32, -3]].forEach(([p, lat], i) => spot(p, lat, i));
  STOPS.slice(1).forEach(([d], si) => [[-1, 5], [1.5, 6.5], [3, 4.5], [-2.5, 7.5], [0.5, 9]].forEach(([dp, lat], i) => spot(d + dp, lat, si + i))); }
const objRay = new THREE.Raycaster();
function grab(o, holder) { HELD = o; o.state = "held"; o.holder = holder; holder.attach(o.mesh); o.mesh.position.set(holder === camera ? 0.22 : 0, holder === camera ? -0.28 : 0, holder === camera ? -0.6 : -0.08); say(`You picked up the ${o.name}. Click (or G) to let go; in VR, release the trigger.`); }
function tryGrab(origin, dir, holder) { if (HELD) return false; objRay.set(origin, dir); objRay.far = 4; const hit = objRay.intersectObjects(OBJS.filter(o => o.state === "rest" && o.mesh.visible).map(o => o.mesh), false)[0]; if (!hit) return false; grab(OBJS.find(o => o.mesh === hit.object), holder); return true; }
function releaseHeld() { const o = HELD; if (!o) return; HELD = null; const at = o.mesh.getWorldPosition(V3(0, 0, 0)); scene.attach(o.mesh); o.state = "falling"; say(`You let go of the ${o.name}. ` + fallFrom(o.mesh, at, o)); }
function objStep(dt) { for (const o of OBJS) { if (o.state === "rest") { const rt = rOfP(o.home.p); o.mesh.position.copy(chart(o.home.p, o.home.lat / rt)); o.mesh.visible = o.mesh.position.distanceTo(headP) < 600; }
    else if (o.state === "gone" && (o.back -= dt) <= 0) { o.state = "rest"; o.mesh.material.opacity = 1; o.mesh.material.color.copy(o.base); o.mesh.visible = true; } } }
function ballStep(dt, pYou, kYou) { if (!BALLS.length) return; const xYou = xOfP(pYou);
  for (let i = BALLS.length - 1; i >= 0; i--) { const B = BALLS[i]; B.T += dt * TS / kYou;
    let lo = 0, hi = B.eH * (1 - 1e-12); for (let it = 0; it < 70; it++) { const mid = 0.5 * (lo + hi); if (ballT(B, mid, xYou) < B.T) lo = mid; else hi = mid; }
    const x = Math.max(1e-300, B.x0 - B.r0 * Math.sin(lo / 2) ** 2); B.p = pOfR(rs + x); B.op = Math.min(1, Math.sqrt(x / B.x0) * 1.6); B.mesh.position.copy(chart(B.p, B.a, B.y));
    B.mesh.material.opacity = B.op; B.mesh.material.color.copy(B.base).lerp(DEEP_RED, 1 - B.op).multiplyScalar(0.3 + 0.7 * B.op);
    if (B.op < 0.02) { BALLS.splice(i, 1); if (B.obj) { B.obj.state = "gone"; B.obj.back = 5; B.mesh.visible = false; } else scene.remove(B.mesh); } } }
const DEEP_RED = new THREE.Color(0x8a1008);

// ---------- the panel ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:420px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(18,16,24,.86);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(18,16,24,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0, lastMsg = ""; function say(t) { lastMsg = t; MSG.innerHTML = t; MSG.style.display = "block"; msgT = 22; }
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 220; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:12px;background:rgba(18,16,24,.8);display:none"; document.body.appendChild(MAPC);
const FACTS = `<b>The hole</b>: three times the Sun's mass (${fmt(Mbh, " kg")}), about the lightest black hole a dying star is likely to leave. Event horizon radius ${fmtLen(rs)} (its circumference is ${fmtLen(2 * Math.PI * rs)}): half of it rises from the ground as the black dome. Space round it is stretched along the radius: a tape from the horizon to where r = 1.5 rs reads ${fmtLen(P_PHOTON)}, not ${fmtLen(0.5 * rs)}. From far off its shadow looks ${fmtLen(2 * bcrit)} across. Hawking temperature ${fmt(T_HAWK, " K")}; it would take ${fmt(T_EVAP_YR, " years")} to evaporate.`;
function drawPanel(p, k, r) { const g = GM / (r * r) / k, tide = 2 * GM * 1.7 / r ** 3, esc = Math.sqrt(2 * GM / r), S = inCar ? CAR : PL, st = streetAt(S.p, S.a);
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600;margin-bottom:4px">A stellar black hole in the neighbourhood</div><div style="color:#c8c0d8;font-size:12.5px">${FACTS}</div>
    <div style="margin-top:8px"><b>Where you are</b>: ${fmtLen(p)} from the horizon by tape${st ? ", on " + st : ""} (Schwarzschild r is only ${fmtLen(r - rs)} above rs)<br>&middot; the hole's pull here: to stay put takes <b>${fmt(g / 9.81)} g</b> (you are held by the broken rule; you feel ordinary Earth gravity)<br>&middot; your clock <b>${tod(tYou)}</b>; map clock (far away) <b>${tod(tMap)}</b><br>&middot; your clock runs at <b>${fmtRate(k)}</b> of map time: each of your seconds is <b>${perSec(k)}</b> far away<br>&middot; you are behind map time by <b>${fmtT(tMap - tYou)}</b><br>&middot; light from far away reaches you ${fmt(1 / k)}× bluer and brighter (not shown); the outside world is squeezed into a circle ${(2 * Math.asin(Math.min(1, 1.5 * Math.sqrt(3) * k * rs / r)) * 180 / Math.PI).toFixed(k < 0.01 ? 2 : 1)}° across behind you</div>
    <div style="margin-top:8px"><b>Clocks at other distances</b> (signs every 100 m on the main roads; spinners turn once every 2 s and lamps blink once a second, by their own time):<br>${[[1, "1 m"], [100, "100 m"], [MILE, "1 mile"], [5 * MILE, "5 miles"], [P_PHOTON, "Photon Sphere Avenue"], [P_ISCO, "Last Stable Orbit Blvd"]].map(([d, n]) => { const kk = rateP(d); return `&middot; ${n}: ${fmtRate(kk)}, reads ${tod(tMap * kk)}, looks ${kk / k > 1 ? fmt(kk / k) + "× faster" : fmt(k / kk) + "× slower"} from here, ${fmt(holdG(rOfP(d), kk) / 9.81)} g`; }).join("<br>")}</div>
    <div style="margin-top:8px;color:#c8c0d8;font-size:12.5px"><b>A second broken rule</b>: things near you are drawn as if their light travelled straight, so you can see them. Here light bends on a curve of radius ${fmtLen(c * c / Math.max(g, 1e-9))}${c * c / g < 2000 ? `: in truth, light from anything more than about ${fmtLen(1.5 * c * c / g)} to the side falls into the hole before it reaches you, and you would see almost nothing of the scene` : c * c / g < 2e5 ? `, so over 100 m the picture is off by about ${(100 / (2 * c * c / g) * 180 / Math.PI).toFixed(1)}°` : ", so the error is small"}. The far view (beyond about 500 m) is drawn with the bending.</div>
    <div style="margin-top:8px"><b>Time</b> runs ${fmtTS()}: each real second shows ${fmtTiny(TS)} of your time and ${fmtTiny(TS / k)} of map time. [ slower, ] faster, \\ real time, M slow motion for a fall.</div>
    ${BALLS.length ? `<div style="margin-top:8px"><b>Falling</b>: ${BALLS.map(B => `${B.obj ? "the " + B.obj.name : "a ball"} ${fmtLen(B.p)} from the horizon${B.op < 0.5 ? ", frozen at the edge and fading" : ""}`).join("; ")}. From outside you never see anything cross the horizon.</div>` : ""}
    <div style="margin-top:8px;color:#e8b890;font-size:12.5px"><b>What would really happen</b> (the rule broken here: the ground, houses, air and you are held in place). To hold still here takes ${fmt(g, " m/s²")}, ${fmt(g / 9.81)} times Earth's gravity; escape takes ${(esc / c * 100).toFixed(1)}% of the speed of light; the stretch between your head and feet is ${fmt(tide, " m/s²")} (people are torn apart above about 1,000 m/s²; that is reached ${fmtLen(Math.cbrt(2 * GM * 1.7 / 1000))} from the centre). The Earth itself would be torn up and swallowed in minutes.</div>
    <div style="margin-top:8px;color:#c8c0d8;font-size:12.5px">${inCar ? "In the car on the track: W rides out to the next stop, S back in, E get out." : "Walking: WASD, shift to run, E get in the car (within 5 m)."} Click a crate, ball, cone, bucket or melon to pick it up, click again to let go; G lets go of a ball. Drag to look.</div>`; }
function drawMap(S, h) { const g = MAPC.getContext("2d"), W = 220, sc = W / 2 / EXT, X = v => W / 2 + v * sc; g.clearRect(0, 0, W, W);
  for (const q of SPECIAL) { g.strokeStyle = q.col === "#3a3a3e" ? "#8a8a90" : q.name.startsWith("Photon") ? "#e0a050" : "#60a0e0"; g.lineWidth = 1.5; g.beginPath(); g.arc(X(0), X(0), (rs + q.p) * sc, 0, 7); g.stroke(); }
  g.fillStyle = "#000"; g.beginPath(); g.arc(X(0), X(0), rs * sc, 0, 7); g.fill(); g.strokeStyle = "#6a6a70"; g.stroke();
  g.save(); g.translate(X((rs + S.p) * Math.cos(S.a)), X((rs + S.p) * Math.sin(S.a))); g.rotate(h); g.fillStyle = "#ff5040"; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(-5, 5); g.fill(); g.restore(); }
function drawVR(p, k) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 560); g.fillStyle = "rgba(18,16,24,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 560, 22); g.fill(); g.fillStyle = "#ffd060"; g.font = "bold 34px sans-serif"; g.fillText(`${fmtLen(p)} from the horizon: your clock ${fmtRate(k)}`, 24, 50, 980);
  g.fillStyle = "#f0e8dc"; g.font = "30px sans-serif"; g.fillText(`you ${tod(tYou)}   map ${tod(tMap)}`, 24, 100, 980); g.fillText(`each of your seconds is ${perSec(k)} far away · time: ${fmtTS()}`, 24, 145, 980);
  if (lastMsg && msgT > 0) { g.fillStyle = "#ffc870"; g.font = "24px sans-serif"; let ln = "", y = 200; for (const w of lastMsg.replace(/<[^>]+>/g, "").split(" ")) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 24, y); y += 31; ln = ""; if (y > 540) break; } ln += w + " "; } if (y <= 540) g.fillText(ln, 24, y); } vrT.needsUpdate = true; }
function start() { if (started) return; started = true; T0 = Date.now(); document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block"; MAPC.style.display = "block";
  say(`You are standing 6 m (by tape) from the event horizon of a black hole of three solar masses. The black wall is its edge; the white line on the grass is where it meets the ground. Your clock runs at ${fmtRate(rateP(6))} of the time far away: each of your seconds is ${perSec(rateP(6))} out there. So close, almost all light from outside falls in: behind you the whole world is squeezed into a tiny bright dot. The field is lined every 5 m; clock signs show the time at each distance, then a mile marker every mile. Spinners and lamps on the clock signs run at their own pace: from here the farther ones look faster. Click the crates, balls and cones lying about to pick them up, and click again to let go (G lets go of a ball); [ and ] slow and speed up time, M is slow motion. Your car is beside you (E to get in).`); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), headP = V3(0, 0, 0); let frameN = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0, vrRun = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; vrRun = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) slowPreset(); prevB.x = bX;
        if (inCar) { if (mx > 0.75 && !prevB.rt) { setCruise(1); prevB.rt = true; } else if (mx < 0.3) prevB.rt = false; if (mx < -0.75 && !prevB.lf) { setCruise(-1); prevB.lf = true; } else if (mx > -0.3) prevB.lf = false; }
        if (inCar) { if (my < -0.75 && !prevB.up) { rideTo(1); prevB.up = true; } else if (my > -0.3) prevB.up = false; if (my > 0.75 && !prevB.dn) { rideTo(-1); prevB.dn = true; } else if (my < 0.3) prevB.dn = false; } }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (ty < -0.75 && !prevB.tu) { setTS(TS * 2); prevB.tu = true; } else if (ty > -0.3) prevB.tu = false; if (ty > 0.75 && !prevB.td) { setTS(TS / 2); prevB.td = true; } else if (ty < 0.3) prevB.td = false;
        if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed; if (bA && !prevB.a) toggleCar(); prevB.a = bA; const bB = gp.buttons[5]?.pressed; if (bB && !prevB.b) dropBall(); prevB.b = bB; } } }
  else if (!inCar) { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  if (RIDE.on) { const d = RIDE.to - CAR.p, want = Math.sign(d) * Math.min(CRUISE[cruiseI][0], Math.sqrt(2 * ACC * Math.abs(d))); RIDE.v += THREE.MathUtils.clamp(want - RIDE.v, -ACC * dt, ACC * dt); CAR.p = Math.max(3, CAR.p + RIDE.v * dt);
    if (Math.abs(RIDE.to - CAR.p) < 0.05 && Math.abs(RIDE.v) < 0.3) { CAR.p = RIDE.to; RIDE.v = 0; RIDE.on = false; const kk = rateP(CAR.p); say(`${stopName(CAR.p)}: your clock runs at ${fmtRate(kk)}, each of your seconds ${perSec(kk)} far away. W rides on out, S back in, E gets out.`); } }
  if (started && !inCar) { const f = V3(0, 0, 0); camera.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-6) f.set(0, 0, -1); f.normalize(); const sp = keys.ShiftLeft || keys.ShiftRight || vrRun ? 12 : 3; move(PL, (f.x * -my - f.z * mx) * sp, (f.z * -my + f.x * mx) * sp, dt, 1); }
  const Y = inCar ? CAR : PL; c0 = rOfP(Y.p) - Y.p;
  car.position.copy(chart(CAR.p, CAR.a)); car.rotation.x = 0;
  if (inCar) { const seat = V3(-0.42, 0.72, 0.3).applyEuler(car.rotation).add(car.position); rig.position.copy(seat); rig.rotation.y = car.rotation.y + (vr ? vrYaw : 0); if (!vr) { camera.position.set(0, 0.55, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); } }
  else { rig.position.copy(chart(PL.p, PL.a)); rig.rotation.y = vr ? vrYaw : 0; if (!vr) { camera.position.set(0, 1.65, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); } }
  camera.getWorldPosition(headP); const H = toChart(headP); H.p = Math.max(0.3, H.p); const xh = xOfP(H.p), rh = rs + xh, k = Math.sqrt(xh / rh);
  farMat.uniforms.camS.value.set(rh * Math.cos(H.a) / 1000, headP.y / 1000, rh * Math.sin(H.a) / 1000); farMat.uniforms.camX.value = xh / 1000;
  const dtMap = started ? dt * TS / k : 0; if (started) { tYou += dt * TS; tMap += dtMap; } objStep(dt);
  moversStep(Y.p, Y.a); planesStep(dtMap, Y.p);
  vigS += ((vr && ((inCar && RIDE.on) || (!inCar && (mx || my))) ? (inCar ? 0.95 : 0.8) : 0) - vigS) * Math.min(1, dt * 4); vig.material.uniforms.s.value = vigS; vig.visible = vigS > 0.01;
  farView.position.copy(headP);
  const rc = Y.p + c0, moved = B => Math.hypot(Y.p - B.p, rc * angDist(Y.a, B.a));
  if (moved(GB) > 140) drawNear(Y.p, Y.a); if (moved(OB) > 25) fillNear(Y.p, Y.a);
  groundG.position.set((c0 - GB.C) * Math.cos(GB.a), 0, (c0 - GB.C) * Math.sin(GB.a)); objG.position.set((c0 - OB.C) * Math.cos(OB.a), 0, (c0 - OB.C) * Math.sin(OB.a));
  placeSigns(Y.p, Y.a, k, dt); ballStep(dt, H.p, k); vrPanel.visible = vr && !inCar;
  if (frameN % 6 === 0) { drawDash(H.p, k); drawSigns(k); if (!vr) { drawPanel(H.p, k, rh); camera.getWorldDirection(fwd); drawMap(Y, Math.atan2(fwd.x, -fwd.z)); } else drawVR(H.p, k); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; lastMsg = ""; }
  renderer.render(scene, camera); });

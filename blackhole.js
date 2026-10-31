// blackhole.js -- a black hole with the mass of the Earth, floating in the middle of a living room. Its event horizon (the
// Schwarzschild radius, 2GM/c^2) is 8.87 mm: a marble. Everything about it is computed from general relativity (Schwarzschild
// spacetime): the slowing of clocks near it (proper time against "map" time, the time of a clock far away), the bending of light that
// you see around it (its shadow and ring), radial infall, orbits, the bending of a laser beam, the tides. One rule is broken on
// purpose: the room, its air and you stay put. In reality the pull at 1 m is forty trillion times Earth's gravity, and the room, the
// house and you would fall in within microseconds (see the panel). Built into blackhole.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1612);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.002, 200);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const box = (w, h, d, mat, x, y, z, p = scene) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); p.add(m); return m; };
const cyl = (r1, r2, h, mat, x, y, z, p = scene, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); p.add(m); return m; };
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; if (draw) draw(c.getContext("2d"), w, h); return t; };

// ---------- the physics: an Earth-mass Schwarzschild black hole ----------
const G = 6.674e-11, Mbh = 5.972e24, c = 2.998e8, GM = G * Mbh, rs = 2 * GM / (c * c), bcrit = 1.5 * Math.sqrt(3) * rs, HBAR = 1.0546e-34, KB = 1.3807e-23;
const T_HAWK = HBAR * c ** 3 / (8 * Math.PI * GM * KB), T_EVAP = 5120 * Math.PI * G * G * Mbh ** 3 / (HBAR * c ** 4), L_EDD = 1.26e31 * Mbh / 1.989e30;
const rate = r => r > rs ? Math.sqrt(1 - rs / r) : 0;   // dtau/dt for a clock held still at radius r
const BH = new THREE.Vector3(0, 1.2, 0);
const fmt = (v, u = "") => { const a = Math.abs(v); if (a === 0) return "0" + u; if (a >= 1e5 || a < 1e-3) { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(2) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]) + u; } return (a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(2) : v.toFixed(4)) + u; };
const fmtLen = r => r >= 1 ? r.toFixed(2) + " m" : r >= 0.01 ? (r * 100).toFixed(2) + " cm" : (r * 1000).toFixed(2) + " mm";
const fmtT = s => { if (s < 1e-6) return (s * 1e9).toFixed(2) + " ns"; if (s < 1e-3) return (s * 1e6).toFixed(2) + " µs"; if (s < 60) return s.toFixed(3) + " s"; const m = Math.floor(s / 60); return m + " min " + (s - m * 60).toFixed(2) + " s"; };

// ---------- the living room (held still by the one broken rule) ----------
const R = { x0: -2.6, x1: 2.6, z0: -2.1, z1: 2.1, h: 2.6 };
scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3028, 0.7));
for (const [x, z] of [[-1.2, -0.8], [1.2, 0.8]]) { const l = new THREE.PointLight(0xfff0d8, 9, 9, 1.6); l.position.set(x, 2.45, z); scene.add(l); }
const lampL = new THREE.PointLight(0xffd8a0, 3, 4, 1.8); lampL.position.set(-2.1, 1.55, 1.7); scene.add(lampL);
const wallM = M(0xd9cdb8, { roughness: 0.95 }), floorM = M(0x8a6440, { roughness: 0.6 }), ceilM = M(0xf2ede4, { roughness: 1 });
const floorTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8a6440"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -64 : 0; x < w; x += 128) { g.fillStyle = ["#93693f", "#7f5c3a", "#8c6644", "#86603c"][((x + y) / 32 | 0) % 4]; g.fillRect(x + 1, y + 1, 126, 30); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4, 3.2); floorM.map = floorTex;
const plane = (w, h, mat, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); m.rotation.set(...rot); scene.add(m); return m; };
plane(R.x1 - R.x0, R.z1 - R.z0, floorM, [0, 0, 0], [-Math.PI / 2, 0, 0]); plane(R.x1 - R.x0, R.z1 - R.z0, ceilM, [0, R.h, 0], [Math.PI / 2, 0, 0]);
plane(R.x1 - R.x0, R.h, wallM, [0, R.h / 2, R.z0], [0, 0, 0]); plane(R.x1 - R.x0, R.h, wallM, [0, R.h / 2, R.z1], [0, Math.PI, 0]);
plane(R.z1 - R.z0, R.h, wallM, [R.x0, R.h / 2, 0], [0, Math.PI / 2, 0]); plane(R.z1 - R.z0, R.h, wallM, [R.x1, R.h / 2, 0], [0, -Math.PI / 2, 0]);
for (const [x, z, w, d] of [[0, R.z0 + 0.01, 5.2, 0.02], [0, R.z1 - 0.01, 5.2, 0.02], [R.x0 + 0.01, 0, 0.02, 4.2], [R.x1 - 0.01, 0, 0.02, 4.2]]) box(w, 0.1, d, M(0xf4f0e8), x, 0.05, z);   // skirting
const rug = plane(2.6, 1.9, M(0x7a3a34, { roughness: 1 }), [0, 0.004, 0.55], [-Math.PI / 2, 0, 0]); rug.material.map = canvasTex(256, 192, (g, w, h) => { g.fillStyle = "#7a3a34"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d8b878"; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24); g.strokeStyle = "#2a3a5a"; g.lineWidth = 4; g.strokeRect(28, 28, w - 56, h - 56); });
// sofa facing the TV, an armchair, the coffee table, the TV on its stand, a bookcase, a window with curtains, a lamp, a plant, a door
const sofaM = M(0x4a5a6a, { roughness: 1 }); box(2.2, 0.42, 0.9, sofaM, 0, 0.21, 1.6); box(2.2, 0.5, 0.22, sofaM, 0, 0.6, 1.98); for (const s of [-1, 1]) box(0.22, 0.62, 0.9, sofaM, s * 1.0, 0.31, 1.6);
for (const s of [-1, 1]) box(0.95, 0.12, 0.7, M(0x55667a, { roughness: 1 }), s * 0.48, 0.48, 1.55);
const chair = new THREE.Group(); chair.position.set(-1.9, 0, 0.3); chair.rotation.y = Math.PI / 2 - 0.3; scene.add(chair); box(0.85, 0.42, 0.85, M(0x7a5a3a), 0, 0.21, 0, chair); box(0.85, 0.6, 0.2, M(0x7a5a3a), 0, 0.6, 0.33, chair); for (const s of [-1, 1]) box(0.16, 0.55, 0.85, M(0x7a5a3a), s * 0.4, 0.28, 0, chair);
const tableM = M(0x5a3e28, { roughness: 0.5 }); box(1.2, 0.05, 0.6, tableM, 0, 0.43, 1.0); for (const x of [-0.55, 0.55]) for (const z of [0.75, 1.25]) box(0.05, 0.42, 0.05, tableM, x, 0.21, z);
box(1.8, 0.5, 0.42, M(0x2a2a2c), 0, 0.25, R.z0 + 0.22); const tv = box(1.45, 0.84, 0.05, M(0x0a0a0c, { roughness: 0.3 }), 0, 1.0, R.z0 + 0.25);
const shelf = new THREE.Group(); shelf.position.set(R.x1 - 0.2, 0, -1.0); scene.add(shelf); box(0.36, 2.0, 1.0, M(0x6a4a30), 0, 1.0, 0, shelf);
for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) box(0.24, 0.26 + (k % 3) * 0.03, 0.06, M([0x8a2a2a, 0x2a4a7a, 0x3a6a3a, 0xc8a050, 0x5a3a6a][(k + r) % 5]), -0.04, 0.35 + r * 0.45 + (k % 3) * 0.015, -0.42 + k * 0.1, shelf);
box(0.04, 1.3, 1.4, M(0xcfe4f2, { emissive: 0x8aaac8, emissiveIntensity: 0.6 }), R.x0 + 0.02, 1.45, -0.9); for (const z of [-1.75, -0.05]) box(0.06, 1.9, 0.35, M(0xb8a070, { roughness: 1 }), R.x0 + 0.08, 1.4, z);   // window and curtains
cyl(0.16, 0.2, 0.05, M(0x2a2a2a), -2.1, 0.025, 1.7); cyl(0.015, 0.015, 1.45, M(0x2a2a2a), -2.1, 0.75, 1.7); cyl(0.18, 0.25, 0.3, M(0xf0e4c8, { emissive: 0xffd8a0, emissiveIntensity: 0.5 }), -2.1, 1.55, 1.7);
cyl(0.18, 0.14, 0.32, M(0xb06040), 2.2, 0.16, 1.7); const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), M(0x3f6a34, { roughness: 1 })); leaves.position.set(2.2, 0.62, 1.7); scene.add(leaves);
box(0.9, 2.05, 0.04, M(0x6a4a32), -1.4, 1.025, R.z1 - 0.03);
for (const [x, y, w, h] of [[1.2, 1.6, 0.6, 0.45], [-1.0, 1.7, 0.5, 0.65]]) box(w, h, 0.03, M([0x3a5a7a, 0x8a6a3a][x > 0 ? 0 : 1], { roughness: 0.6 }), x, y, R.z1 - 0.02);   // pictures

// ---------- the black hole: a tiny horizon, and the light bent around it ----------
const horizon = new THREE.Mesh(new THREE.SphereGeometry(rs, 32, 24), new THREE.MeshBasicMaterial({ color: 0x000000 })); horizon.position.copy(BH); scene.add(horizon);
// the bending of light: a sphere round the hole whose surface shows the room as seen along bent light rays. The room is captured from the
// hole's position into a cube map; each view ray's impact parameter b gives its bending (2rs/b + 15pi/16 (rs/b)^2); rays with b below
// the critical 3*sqrt(3)/2 rs are captured (the shadow). The bent ray is followed to the room's walls (parallax-corrected). Beyond 30 cm
// the bending (under 3.5 degrees) is faded out to blend with the unbent view: the one approximation here.
const cubeRT = new THREE.WebGLCubeRenderTarget(IS_HEADSET ? 256 : 512, { type: THREE.HalfFloatType }); const cubeCam = new THREE.CubeCamera(0.01, 50, cubeRT); cubeCam.position.copy(BH); scene.add(cubeCam);
const RL = 0.5, lensMat = new THREE.ShaderMaterial({ uniforms: { env: { value: cubeRT.texture }, bh: { value: BH }, rs: { value: rs }, bc: { value: bcrit }, RL: { value: RL }, rmin: { value: new THREE.Vector3(R.x0, 0, R.z0) }, rmax: { value: new THREE.Vector3(R.x1, R.h, R.z1) } },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: `uniform samplerCube env; uniform vec3 bh, rmin, rmax; uniform float rs, bc, RL; varying vec3 vW;
    void main(){ vec3 ro = cameraPosition, rd = normalize(vW - ro); vec3 oc = bh - ro; float tca = dot(oc, rd); vec3 pc = ro + rd * tca; vec3 nb = bh - pc; float b = length(nb);
      if (b < bc && tca > 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      float x = rs / b, a = 2.0 * x + 0.9375 * 3.14159 * x * x; a *= 1.0 + 2.2 * smoothstep(0.32, 0.385, x);   // second-order bending, steepened near the critical ray
      a *= 1.0 - smoothstep(0.3, RL, b); vec3 n = nb / max(b, 1e-6); vec3 d = normalize(rd * cos(a) + n * sin(a));
      vec3 o = tca > 0.0 ? pc : ro; vec3 t1 = (rmax - o) / d, t0 = (rmin - o) / d; vec3 tf = max(t0, t1); float tFar = min(min(tf.x, tf.y), tf.z); vec3 hit = o + d * tFar;
      vec3 col = textureCube(env, normalize(hit - bh)).rgb; gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`, side: THREE.BackSide, depthWrite: false });
const lens = new THREE.Mesh(new THREE.SphereGeometry(RL, 64, 48), lensMat); lens.position.copy(BH); lens.renderOrder = 5; scene.add(lens);
// the photon sphere (1.5 rs: light can orbit here, unstably) and the innermost stable circular orbit (3 rs), as faint rings
const ringAt = (r, col) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 })); m.position.copy(BH); m.rotation.x = Math.PI / 2; m.visible = false; scene.add(m); return m; };
const RINGS = [ringAt(1.5 * rs, 0xffa040), ringAt(3 * rs, 0x60c0ff)];

// ---------- clocks: map time (far away) against proper time ----------
// Map time t is Schwarzschild coordinate time: what a clock very far from the hole reads. A clock held still at radius r ticks
// dtau = sqrt(1 - rs/r) dt. Your own clock follows your head. (A clock "held still" near the hole needs an enormous rocket thrust:
// the hovering acceleration is GM / (r^2 sqrt(1 - rs/r)).)
let tMap = 0, tYou = 0, paused = false, T0 = Date.now();
const tod = sec => { const d = new Date(T0 + sec * 1000); let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")} ${ap}`; };   // a clock reading: the time of day it shows
const LADDER = [0.0095, 1.5 * rs, 3 * rs, 0.1, 1.0, 2.4].map((d, i) => ({ d, tau: 0, name: ["just outside the horizon", "the photon sphere", "the last stable orbit", "10 cm", "1 m", "2.4 m (by the wall)"][i] }));
const ladderG = new THREE.Group(); scene.add(ladderG); const tmpV = new THREE.Vector3();
LADDER.forEach((L, i) => { const p = BH.clone().add(new THREE.Vector3(L.d, 0, 0)); const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.min(0.005, Math.max(0.0015, L.d * 0.04)), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd060 })); dot.position.copy(p); ladderG.add(dot);
  const tex = canvasTex(512, 150); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false })); s.renderOrder = 12; const lp = i < 4 ? BH.clone().add(new THREE.Vector3(0.22 + i * 0.0, 0.62 - i * 0.12, 0)) : p.clone().add(new THREE.Vector3(0, 0.25, 0)); s.position.copy(lp); s.scale.set(0.3, 0.088, 1); ladderG.add(s);
  const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, lp.clone().add(new THREE.Vector3(-0.15, -0.04, 0))]), new THREE.LineBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.6 })); ladderG.add(ln); L.tex = tex; L.sprite = s; });
function drawLadder() { for (const L of LADDER) { const g = L.tex.userData.c.getContext("2d"); g.clearRect(0, 0, 512, 150); g.fillStyle = "rgba(16,14,20,.82)"; g.beginPath(); g.roundRect(0, 0, 512, 150, 18); g.fill();
    g.fillStyle = "#ffd060"; g.font = "bold 30px sans-serif"; g.fillText(fmtLen(L.d) + ": " + L.name, 16, 40); g.fillStyle = "#f2eadb"; g.font = "28px monospace"; g.fillText(tod(L.tau) + "  " + L.tau.toFixed(2) + " s", 16, 84); g.font = "24px sans-serif"; g.fillStyle = "#c8c0d8"; g.fillText("ticks at " + (rate(L.d) * 100).toFixed(rate(L.d) > 0.999 ? 3 : 1) + "% of map time", 16, 124); L.tex.needsUpdate = true; } }
// the big display on the wall
const wallTex = canvasTex(1024, 512), wallPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false })); wallPanel.position.set(1.3, 1.65, R.z0 + 0.03); scene.add(wallPanel);
function drawWall(r) { const g = wallTex.userData.c.getContext("2d"); g.fillStyle = "#0e0c14"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#8a84a0"; g.font = "28px sans-serif"; g.fillText("MAP TIME (a clock far away)", 40, 60); g.fillStyle = "#f2eadb"; g.font = "bold 64px monospace"; g.fillText(tod(tMap), 40, 140); g.font = "30px monospace"; g.fillStyle = "#a8a2c0"; g.fillText(tMap.toFixed(3) + " s elapsed", 640, 140);
  g.fillStyle = "#8a84a0"; g.font = "28px sans-serif"; g.fillText("YOUR CLOCK (proper time, " + fmtLen(r) + " from the hole)", 40, 220); g.fillStyle = "#ffd060"; g.font = "bold 64px monospace"; g.fillText(tod(tYou), 40, 300); g.font = "30px monospace"; g.fillStyle = "#c8b070"; g.fillText(tYou.toFixed(3) + " s elapsed", 640, 300);
  g.fillStyle = "#c8c0d8"; g.font = "30px sans-serif"; g.fillText("Behind map time by " + fmtT(tMap - tYou), 40, 380); g.fillText("Rate " + (rate(r) * 100).toFixed(4) + "%: " + fmtT((1 - rate(r)) * 86400) + " lost per day", 40, 424); wallTex.needsUpdate = true; }

// ---------- demonstrations, in slow motion: map time runs 10 ns (default) per real second ----------
const SLOW = [1, 1e-7, 1e-8, 1e-9]; let slowI = 2; const slow = () => SLOW[slowI];   // 1 = real time
// 1. a marble dropped from 60 cm: a cloud of grains falling radially (Schwarzschild geodesics from rest), so the tide stretches it out.
// Seen in map time the grains slow, redden and dim as they near the horizon and never quite cross; each grain's own clock reaches it in
// a finite, short time.
const MARBLE = { on: false, grains: [], tau: 0, r0: 0.6 };
const grainGeo = new THREE.SphereGeometry(0.0012, 6, 4), marbleCloud = new THREE.InstancedMesh(grainGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 300); marbleCloud.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(900), 3); marbleCloud.count = 0; marbleCloud.frustumCulled = false; scene.add(marbleCloud);
function dropMarble() { MARBLE.on = true; MARBLE.tau = 0; MARBLE.tMap = 0; MARBLE.grains = []; const dir = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 300; i++) { const u = Math.random() * 2 - 1, ph = Math.random() * 6.283, rr = 0.0075 * Math.cbrt(Math.random()), s = Math.sqrt(1 - u * u), off = new THREE.Vector3(s * Math.cos(ph), u, s * Math.sin(ph)).multiplyScalar(rr); const p = BH.clone().addScaledVector(dir, MARBLE.r0).add(off), rel = p.clone().sub(BH);
    const r0 = rel.length(); MARBLE.grains.push({ n: rel.divideScalar(r0), r0, r: r0 * (1 - 1e-7), E: Math.sqrt(1 - rs / r0), tau: 0 }); }   // a hair below rest, so the fall begins
  marbleCloud.count = 300; say("Marble dropped from 60 cm. In reality, the tides would have torn it to dust about 200 m away; here it is a cloud of grains, and the tide stretches it into a stream. Seen from the room, they speed up, then near the horizon slow, redden and dim, and fade out within a fraction of a nanosecond of map time (light from there is stretched e-fold every " + fmtT(2 * rs / c) + "): they never visibly cross. The panel shows the grains' own clock, which reaches the horizon in about 26 ns."); }
const fallRate = (r, r0, E) => r > rs * 1.0005 ? -c * (1 - rs / r) * Math.sqrt(Math.max(0, rs / r - rs / r0)) / E : 0;   // dr/dt along a radial geodesic from rest at r0
function marbleStep(dtMap) { if (!MARBLE.on) return; const col = new THREE.Color(), m4 = new THREE.Matrix4(); let k = 0, minR = 1e9;
  for (const g of MARBLE.grains) { let left = dtMap; while (left > 0) { const v = Math.abs(fallRate(g.r, g.r0, g.E)) || 1e-30, h = Math.min(left, 0.02 * Math.max(g.r - rs, 1e-6) / v + 1e-14); const k1 = fallRate(g.r, g.r0, g.E), k2 = fallRate(g.r + k1 * h, g.r0, g.E); g.r = Math.max(rs * 1.0001, g.r + 0.5 * (k1 + k2) * h); g.tau += (1 - rs / g.r) / g.E * h; left -= h; if (g.r <= rs * 1.0002) { left = 0; } }
    if (g.r <= rs * 1.0002) g.fade = (g.fade ?? 1) * Math.exp(-dtMap * c / (2 * rs));   // at the horizon the light reaching you dims e-fold every 2rs/c
    minR = Math.min(minR, g.r); const p = BH.clone().addScaledVector(g.n, g.r); m4.makeTranslation(p.x, p.y, p.z); if ((g.fade ?? 1) < 0.01) m4.makeScale(0, 0, 0); marbleCloud.setMatrixAt(k, m4);
    const grav = rate(g.r), vloc = Math.sqrt(Math.max(0, (rs / g.r - rs / g.r0) / (1 - rs / g.r0))), dop = Math.sqrt((1 - vloc) / (1 + vloc)), f = grav * dop * (g.fade ?? 1);   // light reaching you: gravitational and Doppler redshift
    col.setRGB(Math.min(1, 1.2 * f + 0.15) * Math.min(1, f * 3), Math.min(1, f * f * 1.1) * Math.min(1, f * 3), Math.min(1, f * f * f) * Math.min(1, f * 3)); marbleCloud.setColorAt(k, col); k++; }
  marbleCloud.instanceMatrix.needsUpdate = true; marbleCloud.instanceColor.needsUpdate = true; MARBLE.tau = Math.max(...MARBLE.grains.map(g => g.tau)); MARBLE.minR = minR; }
// 2. dust in circular orbits: angular velocity (in map time) sqrt(GM/r^3), exactly; stable only outside 3 rs
const DUST = { on: false, list: [] }; const dustMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0009, 6, 4), new THREE.MeshBasicMaterial({ color: 0xbfe4ff }), 400); dustMesh.count = 0; dustMesh.frustumCulled = false; scene.add(dustMesh);
function dustOn() { DUST.on = !DUST.on; RINGS.forEach(r => r.visible = DUST.on); DUST.list = []; if (DUST.on) { for (let i = 0; i < 400; i++) { const r = [3.05 * rs, 0.04, 0.06, 0.1, 0.16][i % 5] * (1 + (Math.random() - 0.5) * 0.04), inc = (Math.random() - 0.5) * 0.5, node = Math.random() * 6.283; DUST.list.push({ r, ph: Math.random() * 6.283, w: Math.sqrt(GM / r ** 3), inc, node }); } dustMesh.count = 400;
    say("Dust in orbit: at 10 cm a grain goes round in " + fmtT(2 * Math.PI / Math.sqrt(GM / 0.001)) + " at " + (Math.sqrt(GM / 0.1) / c * 100).toFixed(0) + "% of light speed. Blue ring: the innermost stable orbit (3 rs, " + fmtLen(3 * rs) + "); inside it, orbits plunge. Orange ring: the photon sphere (1.5 rs), where light itself can circle. Use the magnifier."); }
  else dustMesh.count = 0; }
function dustStep(dtMap) { if (!DUST.on) return; const m4 = new THREE.Matrix4(), p = new THREE.Vector3(); DUST.list.forEach((d, k) => { d.ph += d.w * dtMap; p.set(Math.cos(d.ph) * d.r, 0, Math.sin(d.ph) * d.r); p.applyAxisAngle(new THREE.Vector3(1, 0, 0), d.inc).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.node).add(BH); m4.makeTranslation(p.x, p.y, p.z); dustMesh.setMatrixAt(k, m4); }); dustMesh.instanceMatrix.needsUpdate = true; }
// 3. a laser beam from the windowsill, passing the hole at an impact parameter you choose: the exact light path (Binet's equation
// d2u/dphi2 + u = 1.5 rs u^2), bent, circling, or captured
const LASER = { on: false, bi: 0, B: [0.6, 0.2, 0.08, 0.04, 0.025, 0.0232, 0.022] }; const laserSrc = new THREE.Vector3(R.x0 + 0.12, 1.2, -1.2);
box(0.12, 0.04, 0.04, M(0x303034), laserSrc.x + 0.05, laserSrc.y, laserSrc.z);
const laserLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff2020 })); laserLine.visible = false; scene.add(laserLine);
function laserPath(b) { const rel0 = laserSrc.clone().sub(BH); // aim so that, far from the hole, the beam would pass at distance b (horizontally)
  const toBH = rel0.clone().negate().normalize(), side = new THREE.Vector3(0, 1, 0).cross(toBH).normalize(), aimPt = side.clone().multiplyScalar(b), dir = aimPt.clone().sub(rel0).normalize();
  const r0 = rel0.length(), e1 = rel0.clone().divideScalar(r0), e2 = dir.clone().addScaledVector(e1, -dir.dot(e1)).normalize(), drdphi = r0 * dir.dot(e1) / dir.dot(e2);
  let u = 1 / r0, up = -drdphi / (r0 * r0), phi = 0; const pts = [laserSrc.clone()], fU = (u) => -u + 1.5 * rs * u * u; let fate = "escapes";
  for (let i = 0; i < 60000; i++) { const h = Math.min(0.004, 0.2 / Math.max(1, u * 0.05)); const k1u = up, k1p = fU(u), k2u = up + 0.5 * h * k1p, k2p = fU(u + 0.5 * h * k1u), k3u = up + 0.5 * h * k2p, k3p = fU(u + 0.5 * h * k2u), k4u = up + h * k3p, k4p = fU(u + h * k3u);
    u += h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u); up += h / 6 * (k1p + 2 * k2p + 2 * k3p + k4p); phi += h; if (u >= 1 / rs) { fate = "captured"; break; } if (u <= 0) break;
    const r = 1 / u, p = BH.clone().addScaledVector(e1, r * Math.cos(phi)).addScaledVector(e2, r * Math.sin(phi)); if (i % 3 === 0 || r < 0.1) pts.push(p); if (p.x < R.x0 || p.x > R.x1 || p.z < R.z0 || p.z > R.z1 || p.y < 0 || p.y > R.h) break; if (phi > 30) { fate = "circles"; break; } }
  return { pts, fate, turn: phi }; }
function laserOn(step) { if (step) LASER.bi = (LASER.bi + 1) % LASER.B.length; else LASER.on = !LASER.on; laserLine.visible = LASER.on; if (!LASER.on) return; const b = LASER.B[LASER.bi], L = laserPath(b); laserLine.geometry.dispose(); laserLine.geometry = new THREE.BufferGeometry().setFromPoints(L.pts);
  const defl = 2 * rs / b * 180 / Math.PI; say(`Laser aimed to pass ${fmtLen(b)} from the hole. ${L.fate === "captured" ? "It is captured: closer than " + fmtLen(bcrit) + ", no light escapes, which is why the hole's shadow is bigger than the horizon." : L.fate === "circles" ? "It is caught near the photon sphere and circles the hole many times." : "It bends by about " + (b > 0.05 ? defl.toFixed(2) + "°" : "much more than the simple 2rs/b formula says") + " and goes on."} Use “Aim closer” to step in.`); }

// ---------- the controls: buttons on the coffee table (click, or point and pull the trigger in VR) ----------
const BUTTONS = []; const button = (label, x, z, fn) => { const t = canvasTex(256, 96, (g, w, h) => { g.fillStyle = "#1e1a24"; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill(); g.fillStyle = "#ffe0a0"; let fs = 30; do { g.font = `bold ${fs}px sans-serif`; fs -= 2; } while (g.measureText(label).width > w - 20); g.textAlign = "center"; g.fillText(label, w / 2, 60); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.09), [M(0x2a2630), M(0x2a2630), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), M(0x2a2630), M(0x2a2630), M(0x2a2630)]); m.position.set(x, 0.47, z); m.userData.fn = fn; scene.add(m); BUTTONS.push(m); return m; };
button("Drop a marble", -0.42, 0.85, dropMarble); button("Orbiting dust", -0.14, 0.85, dustOn); button("Laser on/off", 0.14, 0.85, () => laserOn(false)); button("Aim closer", 0.42, 0.85, () => { if (!LASER.on) laserOn(false); else laserOn(true); });
button("Slow-motion speed", -0.42, 1.1, () => { slowI = (slowI + 1) % SLOW.length; say(slow() === 1 ? "Real time: things you let go of vanish into the hole at once (in tens of nanoseconds), as they really would." : "Slow motion: 1 real second = " + fmtT(slow()) + " of map time, for falling things and the dust. The clocks always run in real time."); }); button("Clock ladder", -0.14, 1.1, () => { ladderG.visible = !ladderG.visible; });
button("Reset clocks", 0.14, 1.1, () => { tMap = tYou = 0; T0 = Date.now(); LADDER.forEach(L => L.tau = 0); OBJS.forEach(o => o.tau = 0); say("Clocks reset to the time now."); }); button("Real life?", 0.42, 1.1, () => say(REAL));
const REAL = `What would really happen (the rule broken here is that the room, the air and you stay put). At 1 m the pull is ${fmt(GM, "")} m/s², ${fmt(GM / 9.81)} times Earth's gravity: everything in the room would fall in within microseconds, torn to dust by the tides on the way. The air rushing in would heat to millions of degrees and shine in X-rays, up to the Eddington limit of about ${fmt(L_EDD, " W")}, a tenth of the Sun's whole output, enough to blow the house and much more apart. The hole is too small to swallow much fast, though: Earth itself would still feel the same gravity at its surface if the planet were squeezed this small, and the Moon would orbit as before. Hawking radiation: ${T_HAWK.toFixed(3)} K, colder than space (2.7 K), so it would grow, not evaporate; left alone it would last about ${fmt(T_EVAP / 3.156e7)} years.`;

// ---------- things you can pick up, carry, hold (by magic, like the room) and let go ----------
// Let go of something and it falls straight in from rest along a radial geodesic: in real time it is gone in tens of nanoseconds. In
// slow motion you see the tide stretch it along the fall (its near and far ends are integrated separately) and its light redden and fade
// at the horizon. Its own clock reaches the horizon after sqrt(r0^3/2GM) [sqrt(x(1-x)) + acos(sqrt x)], x = rs/r0. In reality the tides
// would tear it apart hundreds of metres away. The pocket watch shows its own proper time, wherever you hold it.
const OBJS = []; let HELD = null;
box(0.5, 0.03, 0.5, tableM, 1.42, 0.55, 1.5); cyl(0.03, 0.03, 0.54, tableM, 1.42, 0.27, 1.5);   // a side table by the sofa
const thing = (name, make, x, y, z, size) => { const g = new THREE.Group(); make(g); g.position.set(x, y, z); scene.add(g); const o = { name, g, home: g.position.clone(), homeQ: g.quaternion.clone(), size, state: "rest", tau: 0 }; g.traverse(m => { if (m.isMesh) m.userData.obj = o; }); OBJS.push(o); return o; };
thing("mug", g => { cyl(0.04, 0.036, 0.095, M(0xe8ded0, { roughness: 0.4 }), 0, 0, 0, g); const h = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.007, 8, 16, Math.PI), M(0xe8ded0, { roughness: 0.4 })); h.position.set(0.04, 0, 0); h.rotation.z = -Math.PI / 2; g.add(h); }, 1.3, 0.613, 1.42, 0.1);
thing("apple", g => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), M(0xb8221c, { roughness: 0.5 })); a.scale.y = 0.9; g.add(a); cyl(0.003, 0.003, 0.025, M(0x4a3a20), 0, 0.04, 0, g, 5); }, 1.52, 0.6, 1.62, 0.08);
const watchTex = canvasTex(256, 256); const watch = thing("pocket watch", g => { cyl(0.028, 0.028, 0.01, M(0xd4a640, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0, g, 24); const f = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), new THREE.MeshBasicMaterial({ map: watchTex, toneMapped: false })); f.rotation.x = -Math.PI / 2; f.position.y = 0.0056; g.add(f); const r = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 12), M(0xd4a640, { metalness: 0.8 })); r.position.set(0, 0, -0.031); r.rotation.x = Math.PI / 2; g.add(r); }, 1.42, 0.571, 1.42, 0.06);
thing("book", g => { box(0.16, 0.035, 0.23, M(0x2a4a7a), 0, 0, 0, g); box(0.15, 0.03, 0.225, M(0xf2ecdc), 0.006, 0, 0, g); }, -0.55, 0.518, -1.9, 0.23);
thing("tennis ball", g => { g.add(new THREE.Mesh(new THREE.SphereGeometry(0.033, 16, 12), M(0xc8e040, { roughness: 1 }))); }, 0.68, 0.533, -1.86, 0.066);
thing("TV remote", g => { box(0.05, 0.018, 0.17, M(0x18181a, { roughness: 0.5 }), 0, 0, 0, g); box(0.012, 0.004, 0.012, M(0xc02020), 0, 0.011, -0.06, g); }, 0.3, 0.509, -1.88, 0.17);
function drawWatch() { const g = watchTex.userData.c.getContext("2d"); g.fillStyle = "#f6f0e2"; g.beginPath(); g.arc(128, 128, 126, 0, 6.283); g.fill(); const d = new Date(T0 + watch.tau * 1000), sec = d.getSeconds() + d.getMilliseconds() / 1000, mn = d.getMinutes() + sec / 60, hr = (d.getHours() % 12) + mn / 60;
  g.strokeStyle = "#2a2218"; g.lineCap = "round"; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.lineWidth = 4; g.beginPath(); g.moveTo(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108); g.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); g.stroke(); }
  for (const [v, len, w, col] of [[hr / 12, 60, 8, "#2a2218"], [mn / 60, 90, 5, "#2a2218"], [sec / 60, 100, 2, "#b02020"]]) { const a = v * 6.283; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); g.stroke(); } watchTex.needsUpdate = true; }
const objPos = o => o.g.getWorldPosition(new THREE.Vector3());
function grab(o, holder) { if (o.state === "falling" || o.state === "gone") return; HELD = o; o.state = "held"; o.holder = holder; if (holder !== camera) holder.attach(o.g); say(`You pick up the ${o.name}. Carry it close to the hole and watch ${o === watch ? "its hands slow" : "its clock in the panel"}. Click (or pull the trigger) to let go: it will do what it really would.`); }
const tauFall = r0 => Math.sqrt(r0 ** 3 / (2 * GM)) * (Math.sqrt((rs / r0) * (1 - rs / r0)) + Math.acos(Math.sqrt(rs / r0)));
function letGo(o) { HELD = null; scene.attach(o.g); const p = objPos(o), rel = p.clone().sub(BH), r0 = rel.length(), n = rel.clone().divideScalar(r0), L = Math.min(o.size, r0 * 0.5);
  const pivot = new THREE.Group(); pivot.position.copy(p); pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); scene.add(pivot); pivot.attach(o.g);
  o.fall = { pivot, n, r0, L, ends: [r0, r0 - L / 2, r0 + L / 2].map(rr => ({ r0: rr, r: rr * (1 - 1e-7), E: Math.sqrt(1 - rs / rr) })), tau: 0, fade: 1, mats: [] };
  o.g.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); o.fall.mats.push([m.material, m.material.color.clone()]); } }); o.state = "falling";
  say(`You let go of the ${o.name} ${fmtLen(r0)} from the hole. It falls straight in: its own clock reaches the horizon after ${fmtT(tauFall(r0))}, arriving at nearly the speed of light. ${slow() === 1 ? "In real time that is instant: it is simply gone." : "In slow motion you can watch the tide stretch it and its light redden and fade."} In reality the tides would have torn it apart hundreds of metres out, and the impact would flash in X-rays.`); }
function stepR(e, dt) { let left = dt; while (left > 0) { const v = Math.abs(fallRate(e.r, e.r0, e.E)) || 1e-30, h = Math.min(left, 0.02 * Math.max(e.r - rs, 1e-6) / v + 1e-14), k1 = fallRate(e.r, e.r0, e.E), k2 = fallRate(e.r + k1 * h, e.r0, e.E); e.r = Math.max(rs * 1.0001, e.r + 0.5 * (k1 + k2) * h); left -= h; if (e.r <= rs * 1.0002) left = 0; } }
function objStep(dt, dtMap) { for (const o of OBJS) { if (o.state === "rest" || o.state === "held") { if (o.state === "held" && o.holder === camera) { o.g.position.copy(camera.localToWorld(new THREE.Vector3(0.1, -0.1, -0.42))); } o.tau += started && !paused ? dt * rate(objPos(o).distanceTo(BH)) : 0; continue; }
    if (o.state !== "falling") continue; const F = o.fall; F.ends.forEach(e => stepR(e, dtMap)); const [cE, nE, fE] = F.ends; if (cE.r <= rs * 1.0002) F.fade *= Math.exp(-dtMap * c / (2 * rs));
    F.pivot.position.copy(BH).addScaledVector(F.n, cE.r); const lat = cE.r / F.r0; F.pivot.scale.set(lat, Math.max(0.05, (fE.r - nE.r) / F.L), lat);
    const vloc = Math.sqrt(Math.max(0, (rs / cE.r - rs / F.r0) / (1 - rs / F.r0))), f = rate(cE.r) * Math.sqrt((1 - vloc) / (1 + vloc)) * F.fade; for (const [m, base] of F.mats) m.color.setRGB(base.r * Math.min(1, f * 1.3), base.g * f * f, base.b * f * f * f);
    if (F.fade < 0.01) { o.state = "gone"; o.g.visible = false; } } }
function putBack() { for (const o of OBJS) { if (o.fall) { scene.attach(o.g); scene.remove(o.fall.pivot); for (const [m, base] of o.fall.mats) m.color.copy(base); o.fall = null; } if (o.holder && o.holder !== camera) scene.attach(o.g); o.holder = null; o.g.position.copy(o.home); o.g.quaternion.copy(o.homeQ); o.g.scale.set(1, 1, 1); o.g.visible = true; o.state = "rest"; } HELD = null; say("Everything is back in its place."); }
button("Put things back", 0, 1.235, putBack);
// ---------- facts about this black hole: a poster on the wall, and a button that goes through them ----------
const FACTS_LIST = (() => { const per = r => 2 * Math.PI * Math.sqrt(r ** 3 / GM), tideR = Math.cbrt(2 * GM * 1.7 / 98.1), rho = Mbh / (4 / 3 * Math.PI * rs ** 3);
  return [["Mass", `${fmt(Mbh, " kg")}: the whole Earth.`],
    ["Event horizon", `radius ${fmtLen(rs)}, ${fmtLen(2 * rs)} across: the size of a marble. Nothing that crosses it, not even light, can come back out.`],
    ["Density", `the Earth's mass inside that marble would be ${fmt(rho, " kg/m³")}, about ${fmt(rho / 2.3e17)} times the density of an atomic nucleus.`],
    ["Shadow", `light passing closer than ${fmtLen(bcrit)} is captured, so it looks like a black disc ${fmtLen(2 * bcrit)} across, wrapped in a ring of bent light.`],
    ["Photon sphere", `at ${fmtLen(1.5 * rs)} light itself can circle the hole (unstably).`],
    ["Last stable orbit", `${fmtLen(3 * rs)}: closer than this, nothing can orbit; it spirals in.`],
    ["Gravity", `at 1 m, ${fmt(GM, " m/s²")}, ${fmt(GM / 9.81)} times Earth's. But 6,371 km away (the Earth's radius) it is exactly 9.8 m/s²: the same as standing on Earth.`],
    ["Escape speed", `at 1 m, ${fmt(Math.sqrt(2 * GM) / 1000, " km/s")} (${(Math.sqrt(2 * GM) / c * 100).toFixed(1)}% of light); at the horizon, the speed of light.`],
    ["Orbits", `at 10 cm a grain orbits in ${fmtT(per(0.1))} at ${(Math.sqrt(GM / 0.1) / c * 100).toFixed(0)}% of light speed; at 1 m in ${fmtT(per(1))}.`],
    ["Falling in", `dropped from 1 m, an object's own clock reaches the horizon after ${fmtT(tauFall(1))}.`],
    ["Time", `a clock held 1 m away runs ${((1 - rate(1)) * 100).toFixed(2)}% slow (${fmtT((1 - rate(1)) * 86400)} a day); at 10 cm, ${((1 - rate(0.1)) * 100).toFixed(1)}%; just outside the horizon it ticks at a quarter of the rate.`],
    ["Tides", `the difference in pull across your body would stretch you with 10 g from about ${Math.round(tideR / 1000)} km away; a marble would be torn apart about 200 m out.`],
    ["Hawking radiation", `its temperature is ${T_HAWK.toFixed(3)} K, colder than space (2.7 K), so it would absorb more than it emits and grow; alone, it would last about ${fmt(T_EVAP / 3.156e7)} years.`],
    ["Brightness limit", `gas falling in could shine at most about ${fmt(L_EDD, " W")} (the Eddington limit), a tenth of the Sun's output.`],
    ["Where from?", `nothing known in nature makes black holes this small today: stars collapse into ones several times the Sun's mass. Tiny "primordial" black holes might have formed in the Big Bang; none has been found.`]]; })();
const posterTex = canvasTex(1100, 1820, (g, w, h) => { g.fillStyle = "#14121c"; g.fillRect(0, 0, w, h); g.fillStyle = "#ffd060"; g.font = "bold 56px sans-serif"; g.fillText("This black hole", 50, 90); g.fillStyle = "#a8a2c0"; g.font = "30px sans-serif"; g.fillText("Mass of the Earth. Everything computed from general relativity.", 50, 140);
  let y = 210; for (const [k, v] of FACTS_LIST) { g.fillStyle = "#ffd060"; g.font = "bold 30px sans-serif"; g.fillText(k, 50, y); g.fillStyle = "#f0e8dc"; g.font = "26px sans-serif"; let ln = "", yy = y + 34; for (const wd of v.split(" ")) { if (g.measureText(ln + wd).width > 1000) { g.fillText(ln, 50, yy); yy += 32; ln = ""; } ln += wd + " "; } g.fillText(ln, 50, yy); y = yy + 50; } });
const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.655), new THREE.MeshBasicMaterial({ map: posterTex, toneMapped: false })); poster.position.set(R.x0 + 0.02, 1.45, 1.05); poster.rotation.y = Math.PI / 2; scene.add(poster);
let factI = -1; button("Facts", -0.3, 1.235, () => { factI = (factI + 1) % FACTS_LIST.length; const [k, v] = FACTS_LIST[factI]; say(`<b>${k}</b> (${factI + 1} of ${FACTS_LIST.length}): ${v} <span style="color:#a8a2c0">Press again for the next. All of them are on the poster by the armchair.</span>`); });
// ---------- moving about (WASD and drag; in VR, sticks, and point and pull the trigger) ----------
const P = { x: 1.1, z: 1.2 }; let yaw = 0, pitch = 0, started = false; const keys = {};
{ const dx = BH.x - P.x, dz = BH.z - P.z; yaw = Math.atan2(-dx, -dz); pitch = Math.atan2(BH.y - 1.6, Math.hypot(dx, dz)); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyM") magnifier = !magnifier; if (e.code === "KeyP") paused = !paused; if (e.code === "KeyQ") eye = Math.max(0.5, eye - 0.2); if (e.code === "KeyE") eye = Math.min(1.9, eye + 0.2); });
addEventListener("keyup", e => keys[e.code] = false); let eye = 1.6, magnifier = !IS_HEADSET;
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; yaw -= dx * 0.004; pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, -1.5, 1.5); });
addEventListener("pointerup", e => { if (drag && drag.moved < 6 && started) { const v = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(v, camera); act(ray.ray.origin, ray.ray.direction, camera); } drag = null; });
addEventListener("wheel", e => { if (!started || renderer.xr.isPresenting) return; const f = new THREE.Vector3(); camera.getWorldDirection(f); P.x += f.x * -e.deltaY * 0.001; P.z += f.z * -e.deltaY * 0.001; eye = THREE.MathUtils.clamp(eye + f.y * -e.deltaY * 0.001, 0.3, 2.4); });   // the wheel moves you along your gaze: get close to the hole
const ray = new THREE.Raycaster(); function press(o, d) { ray.set(o, d); const h = ray.intersectObjects(BUTTONS, false)[0]; if (h) { const b = h.object; b.position.y = 0.462; setTimeout(() => b.position.y = 0.47, 150); b.userData.fn(); return true; } return false; }
function act(o, d, holder) { if (HELD) { if (HELD.holder === holder) letGo(HELD); return; } if (press(o, d)) return; ray.set(o, d); const h = ray.intersectObjects(OBJS.filter(x => x.state === "rest").map(x => x.g), true)[0]; if (h && h.distance < 6) grab(h.object.userData.obj, holder); }
let vrYaw = 0; const VRB = document.getElementById("vr"), prevB = {};
[0, 1].forEach(i => { const ct = renderer.xr.getController(i); rig.add(ct); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd060 })); l.scale.z = 2; ct.add(l);
  ct.addEventListener("selectstart", () => { const o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1); ct.getWorldPosition(o); d.applyQuaternion(ct.getWorldQuaternion(new THREE.Quaternion())); act(o, d, ct); }); });
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 400; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.195), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.7); vrPanel.rotation.x = -0.4; vrPanel.visible = false; camera.add(vrPanel);
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrYaw = yaw; vrPanel.visible = true; s.addEventListener("end", () => { vrPanel.visible = false; }); }; });

// ---------- the panel: readouts where you stand, the black hole's numbers, the demonstrations ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:400px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(18,16,24,.86);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(18,16,24,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0, lastMsg = ""; function say(t) { lastMsg = t; MSG.innerHTML = t; MSG.style.display = "block"; msgT = 22; }
const FACTS = `<b>The hole</b>: mass of the Earth, ${fmt(Mbh, " kg")}. Event horizon radius ${fmtLen(rs)} (a marble). Its shadow (light closer than ${fmtLen(bcrit)} is captured) looks ${fmtLen(2 * bcrit)} across. Photon sphere ${fmtLen(1.5 * rs)}; last stable orbit ${fmtLen(3 * rs)}.`;
function drawPanel(r) { const g = GM / (r * r) / rate(r), esc = Math.sqrt(2 * GM / r), tide = 2 * GM * 1.7 / r ** 3;
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600;margin-bottom:4px">An Earth-mass black hole in the living room</div><div style="color:#c8c0d8;font-size:12.5px">${FACTS}</div>
    <div style="margin-top:8px"><b>Where you are</b> (your eyes, ${fmtLen(r)} from it):<br>&middot; map time <b>${tod(tMap)}</b> (${tMap.toFixed(3)} s); your clock <b>${tod(tYou)}</b> (${tYou.toFixed(3)} s)<br>&middot; your clock runs at <b>${(rate(r) * 100).toFixed(5)}%</b> of map time, behind by <b>${fmtT(tMap - tYou)}</b> so far<br>&middot; to slow your clock to 90% you must be within ${fmtLen(rs / (1 - 0.81))}; to 50%, ${fmtLen(rs / 0.75)}<br>&middot; gravity ${fmt(g, " m/s²")} (${fmt(g / 9.81)} g)<br>&middot; escape speed ${fmt(esc / 1000, " km/s")} (${(esc / c * 100).toFixed(2)}% of light)<br>&middot; tidal stretch head to foot ${fmt(tide, " m/s²")}</div>
    ${HELD ? `<div style="margin-top:8px"><b>Holding the ${HELD.name}</b>: ${fmtLen(objPos(HELD).distanceTo(BH))} from the hole; its clock runs at ${(rate(objPos(HELD).distanceTo(BH)) * 100).toFixed(4)}% and reads ${tod(HELD.tau)} (${HELD.tau.toFixed(3)} s; map ${tod(tMap)}, ${tMap.toFixed(3)} s).</div>` : `<div style="margin-top:8px;color:#c8c0d8">Pick something up: the mug, apple or pocket watch on the side table, or the book, ball or remote on the TV stand.</div>`}
    ${MARBLE.on ? `<div style="margin-top:8px"><b>The marble</b>: map time since the drop ${fmtT(MARBLE.tMap || 0)}; the grains' own clock ${fmtT(MARBLE.tau)}. Nearest grain ${fmtLen(Math.max(0, (MARBLE.minR || 0) - rs))} above the horizon.</div>` : ""}
    <div style="margin-top:8px;color:#c8c0d8;font-size:12.5px">Buttons on the coffee table (click them). Slow motion: 1 s = ${fmtT(slow())}. <b>M</b> magnifier &middot; WASD walk &middot; drag to look &middot; mouse wheel: move along your gaze (go close!) &middot; Q/E lower/raise &middot; P pause clocks.</div>`; }
function drawVR(r) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 400); g.fillStyle = "rgba(18,16,24,.85)"; g.beginPath(); g.roundRect(0, 0, 1024, 400, 22); g.fill(); g.fillStyle = "#ffd060"; g.font = "bold 34px sans-serif"; g.fillText(`${fmtLen(r)} from the hole: your clock ${(rate(r) * 100).toFixed(4)}%`, 24, 50);
  g.fillStyle = "#f0e8dc"; g.font = "28px sans-serif"; g.fillText(`map ${tod(tMap)} (${tMap.toFixed(2)} s)`, 24, 100); g.fillStyle = "#ffd060"; g.fillText(`you ${tod(tYou)} (${tYou.toFixed(2)} s)  behind ${fmtT(tMap - tYou)}`, 24, 140); g.fillStyle = "#f0e8dc"; g.fillText(`gravity ${fmt(GM / r / r / rate(r) / 9.81)} g   escape ${(Math.sqrt(2 * GM / r) / c * 100).toFixed(2)}% c`, 24, 180);
  if (lastMsg && msgT > 0) { g.fillStyle = "#ffc870"; g.font = "22px sans-serif"; let ln = "", y = 225; for (const w of lastMsg.replace(/<[^>]+>/g, "").split(" ")) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 24, y); y += 28; ln = ""; if (y > 380) break; } ln += w + " "; } if (y <= 380) g.fillText(ln, 24, y); } vrT.needsUpdate = true; }

function start() { if (started) return; started = true; T0 = Date.now(); document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block"; say("The black hole is the tiny black dot in the middle of the room, inside the ring of bent light. Walk up to it (or scroll toward it) and watch your clock on the wall fall behind map time. Try the buttons on the coffee table."); }
document.getElementById("intro")?.addEventListener("click", start);

// the room as seen from the hole, for the bent light: without the things close to the hole (their bent images are not drawn)
function captureRoom() { const hide = [lens, ladderG, horizon, marbleCloud, dustMesh, laserLine, ...RINGS], was = hide.map(o => o.visible); hide.forEach(o => o.visible = false); cubeCam.update(renderer, scene); hide.forEach((o, i) => o.visible = was[i]); }
// ---------- the magnifier (on screen): a close-up of the hole ----------
const magCam = new THREE.PerspectiveCamera(16, 1, 0.001, 20); magCam.position.copy(BH).add(new THREE.Vector3(0.05, 0.06, 0.22)); magCam.lookAt(BH);

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), headP = new THREE.Vector3(); let frameN = 0, slowT = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; } else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; } }
    rig.rotation.y = vrYaw; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  fwd.y = 0; fwd.normalize(); const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)); const sp = 1.3 * dt;
  if (mx || my) { P.x += (fwd.x * -my + side.x * mx) * sp; P.z += (fwd.z * -my + side.z * mx) * sp; } P.x = THREE.MathUtils.clamp(P.x, R.x0 + 0.2, R.x1 - 0.2); P.z = THREE.MathUtils.clamp(P.z, R.z0 + 0.2, R.z1 - 0.2);
  rig.position.set(P.x, 0, P.z); if (!vr) camera.position.y = eye;
  camera.getWorldPosition(headP); const r = Math.max(rs * 1.001, headP.distanceTo(BH));
  if (started && !paused) { tMap += dt; tYou += dt * rate(r); for (const L of LADDER) L.tau += dt * rate(L.d); }
  const dtMap = dt * slow(); marbleStep(dtMap); if (MARBLE.on) MARBLE.tMap = (MARBLE.tMap || 0) + dtMap; else MARBLE.tMap = 0; dustStep(dtMap); objStep(dt, dtMap);
  if (frameN % 6 === 0) { drawWatch(); if (ladderG.visible) drawLadder(); drawWall(r); if (!vr) drawPanel(r); else drawVR(r); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; lastMsg = ""; }
  if (frameN % (vr ? 30 : 10) === 1) captureRoom();
  renderer.clear(); renderer.render(scene, camera);   // (no setRenderTarget(null) here: in VR that would draw to the page instead of the headset)
  if (magnifier && !vr && started) { const s = Math.min(300, innerHeight * 0.38); renderer.setScissorTest(true); renderer.setScissor(innerWidth - s - 14, 14, s, s); renderer.setViewport(innerWidth - s - 14, 14, s, s); renderer.clearDepth(); renderer.render(scene, magCam); renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); } });
camera.position.set(0, 1.6, 0);

// betelgeuse_away.js -- away missions from the ship (loaded after betelgeuse.js): the lander, with its pressurised rover, on the
// landable worlds, and entry probes into the young super-Jupiter and the brown dwarf, seen through their cameras.
// The surfaces are generated without end from noise, in the style each world would have (craters on airless rock, lava channels on
// a young volcanic world, lava fields and vents on a tidally heated moon), with the true gravity, the true curve of the horizon, and
// the true sky: the stars as seen from there, Betelgeuse at its true size, the giant planet in the moons' skies. The probes fall
// through a model atmosphere for a hot young giant: high salt-compound hazes, a deck of molten-rock (silicate) droplets, iron clouds,
// the gas glowing hotter with depth until the probe fails. All of it is plausible, not known: no planet of Betelgeuse has been seen.

// ---------- noise, for the ground ----------
const nh = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn2 = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = nh(xi, yi), b = nh(xi + 1, yi), c = nh(xi, yi + 1), d = nh(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm2 = (x, y, o = 5) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vn2(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.3; a *= 0.5; } return s; };
const ridged2 = (x, y, o = 4) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * (1 - Math.abs(2 * vn2(x, y) - 1)); x = x * 2.1 + 3.7; y = y * 2.1 + 1.9; a *= 0.5; } return s; };
// craters: bowls with raised rims, on a jittered grid of cells S wide (a fraction of cells hold one)
function craters(x, z, S, rMin, rMax, depthK, seed, frac = 0.45) { const ci = Math.floor(x / S), cj = Math.floor(z / S); let h = 0, inside = 0;
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const i = ci + di, j = cj + dj; if (nh(i + seed, j * 1.3) > frac) continue; const cx = (i + nh(i, j + seed)) * S, cz = (j + nh(i + seed * 2, j)) * S, r = rMin + (rMax - rMin) * nh(i * 3 + seed, j * 7) ** 2, d = Math.hypot(x - cx, z - cz) / r;
    if (d < 1) { h -= (1 - d * d) * r * depthK; inside = Math.max(inside, 1 - d); } h += r * depthK * 0.3 * Math.exp(-(((d - 1) / 0.2) ** 2)); } return [h, inside]; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- the landable worlds ----------
// gravity from size and a rock density; temperatures where the lander sets down: near the line between day and night, the coolest
// ground in sunlight (on e, noon would reach about 1,080 K, near the melting point of rock)
const WORLDS = new Map([
  [PE, { name: "Betelgeuse e", R: 3.5e6, g: 4.9, sunEl: 5, eva: true, style: "crater", sky: null,
    about: "A scorched, airless rocky world about Mars's size, 45 AU from Betelgeuse. The lander set down where the star has just risen: at noon the ground reaches about 1,080 K, near rock's melting point; here, with the star low, about 580 K. Betelgeuse's light is 62 times the Sun's at Earth: only a mirror-finished suit with heavy cooling lets you walk here, for half an hour or so. Gravity 0.5 g." }],
  [PC, { name: "Betelgeuse c", R: 1.02e7, g: 17, sunEl: 25, eva: true, hard: true, style: "volcanic", sky: { horizon: [0.62, 0.42, 0.28], zenith: [0.32, 0.2, 0.14], fog: [0.5, 0.34, 0.24], dens: 1 / 2200 },
    about: "A young rocky super-Earth, 1.6 times Earth's size, 350 AU out where the light equals the Sun's at Earth, but at 8 million years old still cooling: a black new crust split by glowing lava, under about 30 times Earth's air pressure of steam and carbon dioxide at about 200 °C. An ordinary spacesuit would be crushed and cooked. You go out in a powered hard-shell suit, like the armoured suits deep-sea divers use at 70 times Earth's pressure, refrigerated against the heat, with motors at the joints to carry its weight in 1.75 g: slow, heavy steps, and no jumping. Gravity 1.75 g." }],
  [PB1, { name: "b I", R: 1.825e6, g: 1.8, sunEl: 10, eva: true, style: "lava", sky: null, planet: PB,
    about: "A volcanic moon the size of our own, kneaded by the giant planet's tides: dark lava fields and glowing vents. The giant fills 17° of the sky. Its magnetic field's radiation belts would make a long stay here deadly; the suit buys you an hour or so. Gravity 0.18 g: you bound." }],
  [PB2, { name: "b II", R: 1.646e6, g: 1.2, sunEl: 10, eva: true, style: "crater2", sky: null, planet: PB,
    about: "A dark, cratered, rocky moon, its ices long since boiled away by Betelgeuse's light (about 9 times the sunlight at Earth). The giant planet hangs 7.5° across in the sky. Gravity 0.12 g: you bound." }],
  [PB3, { name: "b III", R: 2.4e6, g: 2.2, sunEl: 12, eva: true, style: "maria", sky: null, planet: PB,
    about: "The giant's largest moon, a little smaller than Mercury: bright cratered highlands and dark plains of old lava, as on our Moon. The giant planet hangs 3.6° across in the sky. Gravity 0.23 g." }],
  [PD1, { name: "d I", R: 1.2e6, g: 0.64, sunEl: 20, eva: true, style: "ice", sky: null, planet: PD,
    about: "An icy moon of the brown dwarf, 900 AU from Betelgeuse: plains of water ice at about 140 K, split by ridges and cracks where the tides have flexed the crust. White ice looks orange-pink here: the light is Betelgeuse's, and the brown dwarf's, both orange-red. Both look about the same size in the sky, half a degree, like the Sun from Earth. Gravity 0.065 g: a jump would carry you several metres up." }]]);
// the ground: height (m) and colour and glow at a point, by the world's style
function groundAt(W, x, z) { let h = 0, c = [0.3, 0.3, 0.3], glow = 0;
  if (W.style === "crater") { const [c1] = craters(x, z, 520, 40, 200, 0.16, 1), [c2] = craters(x, z, 75, 4, 26, 0.2, 2, 0.55); h = 70 * fbm2(x / 1100, z / 1100) + c1 + c2 + 1.2 * fbm2(x / 7, z / 7, 3);
    const n = fbm2(x / 300, z / 300, 3); c = mix3([0.18, 0.16, 0.15], [0.42, 0.34, 0.27], sstep(0.35, 0.7, n)); c = mix3(c, [0.55, 0.45, 0.36], sstep(30, 80, h) * 0.5); }
  else if (W.style === "volcanic") { const ch = Math.abs(fbm2(x / 900, z / 900, 4) - 0.5); h = 160 * ridged2(x / 2400, z / 2400) + 22 * fbm2(x / 260, z / 260) + 1.5 * fbm2(x / 9, z / 9, 3); const lava = sstep(0.022, 0.0, ch); h -= 8 * lava;
    c = mix3([0.09, 0.08, 0.08], [0.25, 0.2, 0.17], sstep(0.4, 0.75, fbm2(x / 150, z / 150, 3))); glow = lava * (0.6 + 0.4 * fbm2(x / 40, z / 40, 2)); }
  else if (W.style === "lava") { const [p, pin] = craters(x, z, 1100, 80, 320, -0.02, 3, 0.35); h = 28 * fbm2(x / 700, z / 700) + p + 1.5 * fbm2(x / 8, z / 8, 3); const flow = sstep(0.55, 0.62, fbm2(x / 500 + 9, z / 500, 4));
    c = mix3([0.3, 0.24, 0.2], [0.12, 0.1, 0.09], flow); c = mix3(c, [0.55, 0.42, 0.26], sstep(0.6, 0.8, fbm2(x / 200, z / 200, 3)) * 0.4); glow = pin > 0.3 ? sstep(0.3, 0.7, pin) * (0.5 + 0.5 * fbm2(x / 30, z / 30, 2)) : 0; }
  else if (W.style === "maria") { const [c1] = craters(x, z, 600, 50, 260, 0.18, 7), [c2] = craters(x, z, 70, 3, 24, 0.2, 8, 0.6), mare = sstep(0.5, 0.56, fbm2(x / 3000 + 4, z / 3000, 4)); h = (1 - mare) * (90 * fbm2(x / 1400, z / 1400) + c1) + c2 + 1.0 * fbm2(x / 7, z / 7, 3) - 30 * mare;
    c = mix3([0.5, 0.47, 0.44], [0.64, 0.6, 0.56], sstep(0.4, 0.7, fbm2(x / 260, z / 260, 3))); c = mix3(c, [0.2, 0.19, 0.18], mare); }
  else if (W.style === "ice") { const cr = Math.abs(fbm2(x / 1600, z / 1600, 4) - 0.5), cr2 = Math.abs(fbm2(x / 380 + 7, z / 380, 3) - 0.5), ridge = sstep(0.03, 0.0, cr), [c1] = craters(x, z, 1500, 30, 120, 0.12, 9, 0.2);
    h = 14 * fbm2(x / 900, z / 900) + 18 * ridge - 4 * sstep(0.015, 0.0, cr2) + c1 + 0.5 * fbm2(x / 6, z / 6, 3); c = mix3([0.86, 0.88, 0.92], [0.66, 0.6, 0.58], sstep(0.45, 0.75, fbm2(x / 200, z / 200, 3))); c = mix3(c, [0.52, 0.38, 0.3], Math.max(ridge * 0.7, sstep(0.015, 0.0, cr2) * 0.8)); }
  else { const [c1] = craters(x, z, 420, 30, 160, 0.2, 5), [c2] = craters(x, z, 60, 3, 20, 0.22, 6, 0.6); h = 35 * fbm2(x / 800, z / 800) + c1 + c2 + 1.2 * fbm2(x / 7, z / 7, 3); c = mix3([0.24, 0.21, 0.19], [0.44, 0.39, 0.33], sstep(0.35, 0.75, fbm2(x / 250, z / 250, 3))); }
  return { h, c, glow }; }

// ---------- the surface scene ----------
const SURF = { scene: new THREE.Scene(), W: null, B: null, x: 0, z: 0, y: 0, vy: 0, rover: null, inRover: false, desc: null, qSky: new THREE.Quaternion(), sunL: V3(0, 1, 0) };
SURF.scene.background = new THREE.Color(0x000000);
const TERR_VS = "attribute float glow; varying vec3 vC; varying float vG; varying vec3 vN; varying vec3 vW; void main(){ vC = color; vG = glow; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";
const TERR_FS = `uniform vec3 sunL, sunCol, amb, fogCol, glowCol; uniform float fogD; varying vec3 vC; varying float vG; varying vec3 vN; varying vec3 vW;
  void main(){ vec3 n = normalize(vN); vec3 col = vC * (sunCol * max(dot(n, sunL), 0.0) + amb) + glowCol * vG; float f = 1.0 - exp(-length(vW - cameraPosition) * fogD); col = mix(col, fogCol, f); gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const terrU = { sunL: { value: V3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.6, 0.35) }, amb: { value: new THREE.Color(0.03, 0.03, 0.035) }, fogCol: { value: new THREE.Color(0, 0, 0) }, glowCol: { value: new THREE.Color(1.6, 0.45, 0.08) }, fogD: { value: 0 } };
function terrainMesh(size, n, offsetUnits, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); g.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: terrU, vertexShader: TERR_VS, fragmentShader: TERR_FS, vertexColors: true, polygonOffset: true, polygonOffsetFactor: offsetUnits, polygonOffsetUnits: offsetUnits * 4 })); m.frustumCulled = false; m.userData = { size, drop, cx: 1e9, cz: 1e9 }; SURF.scene.add(m); return m; }
const TERR = [terrainMesh(500, 200, -1, 0), terrainMesh(4000, 160, 0, 0.6), terrainMesh(40000, 160, 1, 4), terrainMesh(400000, 128, 2, 30)], SKYK = 50;
// re-centre a terrain grid on (cx, cz) and fill in its heights, colours and glow; the ground drops away by d^2/2R with distance
function fillTerrain(m, cx, cz) { const W = SURF.W, p = m.geometry.attributes.position, col = m.geometry.attributes.color, gl = m.geometry.attributes.glow, half = m.userData.size / 2, n = Math.round(Math.sqrt(p.count)) - 1, step = m.userData.size / n;
  m.position.set(Math.round(cx / step) * step, 0, Math.round(cz / step) * step); m.userData.cx = cx; m.userData.cz = cz;
  for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), x = lx + m.position.x, z = lz + m.position.z, G = groundAt(W, x, z), d2 = (x - SURF.x) ** 2 + (z - SURF.z) ** 2;
    p.setY(i, G.h - d2 / (2 * W.R) - m.userData.drop); col.setXYZ(i, G.c[0], G.c[1], G.c[2]); gl.setX(i, G.glow); }
  p.needsUpdate = col.needsUpdate = gl.needsUpdate = true; m.geometry.computeVertexNormals(); }
const groundY = (x, z) => groundAt(SURF.W, x, z).h - ((x - SURF.x) ** 2 + (z - SURF.z) ** 2) / (2 * SURF.W.R);
// rocks strewn about, near you
const rockIM = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.75 + 0.45 * nh(i, 3.3); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); } g.computeVertexNormals(); return g; })(), new THREE.ShaderMaterial({ uniforms: terrU, vertexShader: "attribute float glow; varying vec3 vC; varying float vG; varying vec3 vN; varying vec3 vW; void main(){ vC = vec3(0.3, 0.27, 0.25); vG = 0.0; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }", fragmentShader: TERR_FS }), 900);
rockIM.frustumCulled = false; SURF.scene.add(rockIM); const O3s = new THREE.Object3D();
function fillRocks() { let n = 0; const S = 7, cx = Math.floor(SURF.x / S), cz = Math.floor(SURF.z / S), tint = SURF.W.style === "volcanic" ? 0.5 : SURF.W.style === "ice" ? 0.3 : 1;
  for (let i = cx - 36; i <= cx + 36 && n < 900; i++) for (let j = cz - 36; j <= cz + 36 && n < 900; j++) { const r = nh(i * 1.7, j * 2.3); if (r > 0.18) continue; const x = (i + nh(i, j)) * S, z = (j + nh(j, i)) * S, sz = 0.15 + 1.4 * r ** 1.5 * 5 * tint; O3s.position.set(x, groundY(x, z) + sz * 0.2, z); O3s.rotation.set(nh(i, 1) * 6, nh(j, 2) * 6, 0); O3s.scale.setScalar(sz); O3s.updateMatrix(); rockIM.setMatrixAt(n++, O3s.matrix); }
  rockIM.count = n; rockIM.instanceMatrix.needsUpdate = true; }
// the sky: the stars and Milky Way from the ship's sky (turned into the local frame), Betelgeuse, the giant planet, an atmosphere
const surfSky = new THREE.Group(); surfSky.add(new THREE.Points(skyG.children[0].geometry, skyG.children[0].material), new THREE.Mesh(skyG.children[1].geometry, skyG.children[1].material)); SURF.scene.add(surfSky);
const sunBall = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), starMat), sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); SURF.scene.add(sunBall, sunGlow);
let skyPlanet = null; const planetGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); SURF.scene.add(planetGlow);
const airDome = new THREE.Mesh(new THREE.SphereGeometry(8500, 48, 24), new THREE.ShaderMaterial({ uniforms: { hor: { value: new THREE.Color() }, zen: { value: new THREE.Color() }, sunL: terrU.sunL }, side: THREE.BackSide, depthWrite: false, transparent: true,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 hor, zen, sunL; varying vec3 vD; void main(){ float u = max(vD.y, 0.0); vec3 c = mix(hor, zen, pow(u, 0.5)) + vec3(1.0, 0.6, 0.3) * pow(max(dot(vD, sunL), 0.0), 8.0) * 0.6; gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" }));
airDome.renderOrder = 0; SURF.scene.add(airDome);
// labels on the sky away from the ship (H, or X in VR): the named stars, and the things of this system with their distances from you;
// those below the horizon are hidden
function skyHud(scene, horizon) { const G = new THREE.Group(); scene.add(G);
  const mk = (col, scale) => { const t = canvasTex(512, 128), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, depthWrite: false, transparent: true, toneMapped: false })); sp.center.set(0.02, 0.7); sp.scale.set(1600 * scale, 400 * scale, 1); sp.renderOrder = 30; G.add(sp); sp.userData = { t, col, last: "", dir: V3(0, 1, 0), on: true }; return sp; };
  const put = (sp, text, sub, dir) => { sp.userData.dir.copy(dir); sp.position.copy(dir).multiplyScalar(SKY_R * 0.9); const key = text + sub; if (key === sp.userData.last) return; sp.userData.last = key; const g = sp.userData.t.userData.c.getContext("2d"); g.clearRect(0, 0, 512, 128);
    g.font = "bold 38px sans-serif"; g.fillStyle = sp.userData.col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = sp.userData.col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); sp.userData.t.needsUpdate = true; };
  for (const L of SKY_LABELS) if (!/^(HD|HIP) /.test(L.name) || L.m < 1.5) put(mk("#cfe6ff", 0.8), L.name, `mag ${L.m.toFixed(1)} · ${L.d.toLocaleString()} ly`, V3(...L.dir));
  for (const N of SKY_NOTES) put(mk(N.name === "the Sun" ? "#ffd060" : N.m < 6.5 ? "#cfe6ff" : "#8a9ab0", 0.9), N.name, `mag ${N.m.toFixed(1)}${N.m < 6.5 ? "" : ", too faint to see"} · ${N.d.toLocaleString()} ly`, V3(...N.dir));
  const things = [{ name: "Betelgeuse", pos: () => V3(0, 0, 0), col: "#ffb060", sub: "red supergiant" }, { name: "Siwarha", pos: () => compPos(tSec / 86400), col: "#ffe8c0", sub: "companion, probable" }, { name: "a comet", pos: CN, col: "#c8e0ff", sub: "plausible" }, ...BODIES.map(B => ({ name: B.name, pos: () => B.pos(), col: B.glowI > 0.5 ? "#ffa070" : "#d8f0d0", sub: B.tag, B }))].map(o => ({ ...o, sp: mk(o.col, 0.85) }));
  const tmp = V3(0, 0, 0);
  return { G, update(obs, q, here) { G.visible = hudOn; if (!hudOn) return; G.quaternion.copy(q);
      for (const o of things) { const rel = o.pos().sub(obs), d = rel.length(); o.sp.userData.on = o.B !== here; put(o.sp, o.name, `${o.sub} · ${fmtD(d)} away`, rel.normalize()); }
      for (const sp of G.children) sp.visible = sp.userData.on && (!horizon || tmp.copy(sp.userData.dir).applyQuaternion(q).y > -0.02); } }; }
const surfHud = skyHud(SURF.scene, true);
// the lander and the rover
// The lander: a descent stage (engine, tanks, four legs, the folded rover strapped to its side) under a crew cabin 4.6 m across that
// you can stand in: two seats facing a band of windows, the controls, lockers, the hatch at the back onto a porch and the ladder.
const CAB_Y = 3.4, LADDER = V3(3.7, 0, 0), PS = 3000;
function landerMesh() { const g = new THREE.Group(), gold = M(0xc8a040, { metalness: 0.8, roughness: 0.3 }), white = M(0xe8eaee, { roughness: 0.5 }), metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), dark = M(0x2a2c32), add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  add(new THREE.CylinderGeometry(2.8, 3.1, 2.6, 8), gold, 0, 2.1, 0); add(new THREE.ConeGeometry(1.0, 1.4, 16), dark, 0, 0.75, 0);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; add(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 6), metal, 3.1 * Math.cos(a), 1.6, 3.1 * Math.sin(a), Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); add(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 12), metal, 3.85 * Math.cos(a), 0.06, 3.85 * Math.sin(a)); }
  for (const z of [-0.35, 0.35]) add(new THREE.BoxGeometry(0.06, 3.4, 0.06), metal, 3.3, 1.7, z); for (let k = 0; k < 10; k++) add(new THREE.BoxGeometry(0.05, 0.05, 0.7), metal, 3.3, 0.3 + k * 0.32, 0);
  add(new THREE.BoxGeometry(1.1, 0.08, 1.3), metal, 2.85, CAB_Y - 0.04, 0);
  g.userData.stowed = add(new THREE.BoxGeometry(1.0, 1.7, 2.8), M(0x9aa0a8, { metalness: 0.4 }), -3.25, 2.2, 0);
  const CR = 2.3, CH = 2.6, w0 = 0.45, w1 = 1.9, gap = 1.6, inner = wallM(10, 1), glass = new THREE.MeshBasicMaterial({ color: 0x9ab8d0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
  for (const [r, m] of [[CR, white], [CR - 0.06, inner]]) { add(new THREE.CylinderGeometry(r, r, w0, 32, 1, true), m, 0, CAB_Y + w0 / 2, 0); add(new THREE.CylinderGeometry(r, r, CH - w1, 32, 1, true), m, 0, CAB_Y + (w1 + CH) / 2, 0); add(new THREE.CylinderGeometry(r, r, w1 - w0, 32, 1, true, Math.PI + gap / 2, 2 * Math.PI - gap), m, 0, CAB_Y + (w0 + w1) / 2, 0); }
  add(new THREE.CylinderGeometry(CR - 0.03, CR - 0.03, w1 - w0, 16, 1, true, Math.PI - gap / 2, gap), glass, 0, CAB_Y + (w0 + w1) / 2, 0);
  for (const a of [-0.27, 0.27]) add(new THREE.BoxGeometry(0.06, w1 - w0, 0.06), metal, (CR - 0.03) * Math.sin(Math.PI + a), CAB_Y + (w0 + w1) / 2, (CR - 0.03) * Math.cos(Math.PI + a));
  add(new THREE.CircleGeometry(CR, 32), white, 0, CAB_Y + CH, 0, -Math.PI / 2); add(new THREE.CircleGeometry(CR - 0.06, 32), ceilPanelM, 0, CAB_Y + CH - 0.02, 0, Math.PI / 2); add(new THREE.CircleGeometry(CR - 0.06, 32), deckM, 0, CAB_Y + 0.01, 0, -Math.PI / 2);
  add(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 16), metal, 0, CAB_Y + CH + 0.3, 0);
  add(new THREE.BoxGeometry(0.08, 1.7, 0.9), dark, CR, CAB_Y + 0.9, 0); add(new THREE.BoxGeometry(0.05, 1.7, 0.9), M(0x6a5a3a, { metalness: 0.5 }), CR - 0.1, CAB_Y + 0.9, 0); add(new THREE.TorusGeometry(0.2, 0.03, 6, 16), metal, CR - 0.14, CAB_Y + 0.95, 0, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(2.4, 0.42, 0.5), dark, 0, CAB_Y + 0.21, -1.85); g.userData.screen = add(new THREE.PlaneGeometry(0.9, 0.264), new THREE.MeshBasicMaterial({ color: 0x0a0c12, toneMapped: false }), 0, CAB_Y + 0.62, -1.62, -0.9);
  for (const x of [-0.65, 0.65]) { add(new THREE.BoxGeometry(0.55, 0.45, 0.55), M(0x3a5a8a, { roughness: 0.8 }), x, CAB_Y + 0.23, -0.6); add(new THREE.BoxGeometry(0.55, 0.85, 0.1), M(0x3a5a8a, { roughness: 0.8 }), x, CAB_Y + 0.75, -0.3); }
  for (const z of [-0.5, 0.6]) add(new THREE.BoxGeometry(0.5, 2.0, 0.9), metal, -1.85, CAB_Y + 1.0, z);
  const L = new THREE.PointLight(0xfff0dc, 4, 7, 1.6); L.position.set(0, CAB_Y + 2.3, 0); g.add(L);
  g.userData.glow = add(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffa050, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), 0, CAB_Y + 1.3, -3.4); g.userData.glow.visible = false;
  return g; }
function roverMesh() { const g = new THREE.Group(), white = M(0xe8eaee, { roughness: 0.5 }), dark = M(0x2a2c32), glass = new THREE.MeshStandardMaterial({ color: 0x8ab8d0, transparent: true, opacity: 0.3, roughness: 0.1 }), add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(2.6, 0.5, 5.2), M(0x8a8e96, { metalness: 0.5 }), 0, 0.95, 0); add(new THREE.BoxGeometry(2.4, 1.6, 3.4), white, 0, 1.95, 0.6); add(new THREE.BoxGeometry(2.3, 1.3, 1.5), glass, 0, 2.1, -1.75); add(new THREE.BoxGeometry(2.2, 0.35, 0.4), M(0x3a3e46), 0, 1.55, -2.35); add(new THREE.BoxGeometry(0.6, 0.6, 0.6), M(0x3a5a8a), -0.45, 1.5, -1.3);
  for (const x of [-1.45, 1.45]) for (const z of [-1.8, 0, 1.8]) { const w = add(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20).rotateZ(Math.PI / 2), dark, x, 0.6, z); } add(new THREE.BoxGeometry(0.6, 0.3, 0.4), dark, 0.5, 1.45, -1.9); for (const [x, c] of [[-0.75, 0x153848], [-0.15, 0x1d4a30], [0.45, 0x153848]]) { const sc = add(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshBasicMaterial({ color: c }), x * 0.6 - 0.2, 1.76, -2.2); sc.rotation.x = -0.5; } return g; }
const lander = landerMesh(), rover = roverMesh(); SURF.scene.add(rover); ship.add(lander); lander.position.copy(BAY_L); lander.rotation.set(0, Math.PI, 0);
const surfSun = new THREE.DirectionalLight(new THREE.Color(...ADAPT), 2.5), surfAmb = new THREE.AmbientLight(0x404858, 0.25); SURF.scene.add(surfSun, surfAmb);
const ROV = { x: 8, z: 10, head: 0, v: 0, steer: 0, y: null, pitch: 0, roll: 0, turn: 0 };
// comfort in VR: a soft dark ring closes in round the edge of your view while you move or turn (the eyes' sense of motion at the edge
// of vision, without the inner ear's, is what makes people sick)
const vigTex = canvasTex(256, 256, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, W * 0.18, W / 2, W / 2, W * 0.5); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const vignette = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: vigTex, transparent: true, opacity: 0, depthTest: false, depthWrite: false })); vignette.position.z = -0.1; vignette.renderOrder = 55; camera.add(vignette);

// the landing site: where the star stands at the chosen height (and, on the moons, the giant planet is up too). Returns the "up"
function landingUp(B, W, d0 = null, tgt = 0) { const s = B.pos().negate().normalize(); let best = null, bs = 1e9; const p = W.planet ? W.planet.pos().sub(B.pos()).normalize() : null;
  for (let i = 0; i < 4000; i++) { const y = 1 - 2 * (i + 0.5) / 4000, r = Math.sqrt(1 - y * y), a = i * 2.39996, n = V3(r * Math.cos(a), y, r * Math.sin(a)), es = Math.asin(n.dot(s)) * 180 / Math.PI - W.sunEl, ep = p ? Math.asin(n.dot(p)) * 180 / Math.PI - 35 : 0, ea = d0 ? (Math.acos(THREE.MathUtils.clamp(n.dot(d0), -1, 1)) - tgt) * 180 / Math.PI : 0, sc = 25 * es * es + ep * ep + 0.05 * ea * ea; if (sc < bs) { bs = sc; best = n; } } return best; }
function setupSurface(B, W, up) {
  SURF.W = W; SURF.B = B; SURF.up = up; SURF.x = 0; SURF.z = 0; const s = B.pos().negate().normalize(), X = s.clone().sub(up.clone().multiplyScalar(s.dot(up))).normalize(), Z = new THREE.Vector3().crossVectors(X, up);
  const basis = new THREE.Matrix4().makeBasis(X, up, Z); SURF.qSky.setFromRotationMatrix(basis).invert(); surfSky.quaternion.copy(SURF.qSky); surfSky.scale.setScalar(SKYK); airDome.scale.setScalar(SKYK);
  const sunLocal = s.clone().applyQuaternion(SURF.qSky); SURF.sunL.copy(sunLocal); terrU.sunL.value.copy(sunLocal); surfSun.position.copy(sunLocal).multiplyScalar(100);
  const dB = B.pos().length(), flux = L_B / dB ** 2, ang = Math.asin(R_B / (dB * 1.496e11 / 1.496e11)); sunBall.position.copy(sunLocal).multiplyScalar(6000 * SKYK); sunBall.scale.setScalar(6000 * SKYK * Math.sin(Math.asin(R_B / dB))); sunGlow.position.copy(sunBall.position); sunGlow.scale.setScalar(sunBall.scale.x * 8); sunBall.userData.p0 = sunBall.position.clone(); sunGlow.userData.p0 = sunBall.position.clone(); airDome.userData.p0 = V3(0, 0, 0);
  const I = 0.9 * Math.pow(flux, 0.18); terrU.sunCol.value.setRGB(ADAPT[0] * I, ADAPT[1] * I, ADAPT[2] * I);
  surfSky.visible = !W.sky; if (W.sky) { airDome.visible = true; airDome.material.uniforms.hor.value.setRGB(...W.sky.horizon); airDome.material.uniforms.zen.value.setRGB(...W.sky.zenith); terrU.fogCol.value.setRGB(...W.sky.fog); terrU.fogD.value = W.sky.dens; terrU.amb.value.setRGB(0.3, 0.2, 0.14); terrU.sunCol.value.multiplyScalar(0.55); }
  else { airDome.visible = false; terrU.fogD.value = 0; terrU.amb.value.setRGB(0.06, 0.045, 0.035); }
  if (skyPlanet) { SURF.scene.remove(skyPlanet); skyPlanet = null; }
  if (W.planet) { const P = W.planet, rel = P.pos().sub(B.pos()), d = rel.length(), dir = rel.normalize().applyQuaternion(SURF.qSky); skyPlanet = new THREE.Mesh(P.mesh.geometry, P.mesh.material.clone()); skyPlanet.material.uniforms.L.value = sunLocal.clone(); skyPlanet.material.uniforms.I.value = 0.35 * Math.pow(L_B / P.pos().lengthSq(), 0.3);
    skyPlanet.position.copy(dir).multiplyScalar(7000 * SKYK); skyPlanet.userData.p0 = skyPlanet.position.clone(); skyPlanet.scale.setScalar(7000 * SKYK * Math.sin(Math.asin(P.R / d))); SURF.scene.add(skyPlanet); }
  planetGlow.visible = !!(W.planet && W.planet.glowI > 0.5); if (planetGlow.visible) { planetGlow.userData.p0 = skyPlanet.userData.p0.clone(); planetGlow.scale.setScalar(skyPlanet.scale.x * 7); } else planetGlow.userData.p0 = null;
  terrU.glowCol.value.setRGB(1.6, 0.45, 0.08); for (const m of TERR) m.userData.cx = 1e9;
  lander.position.set(0, groundY(0, 0), 0); ROV.x = 13; ROV.z = 16; ROV.head = 0.6; ROV.v = 0; ROV.steer = 0; ROV.turn = 0; ROV.y = null; rover.visible = false; SURF.inRover = false; SURF.vy = 0; surfHud.G.userData.done = false; }
// the L key and the missions screen: go to the lander bay (you board the lander yourself)
function startLanding() { const B = parkedBody(), W = B && WORLDS.get(B); if (!W) { say("Park at a landable world first (Betelgeuse e or c, the moons b I, b II, b III, or the brown dwarf's moon d I), then board the lander in the bay."); return; }
  CAB.in = false; shipGo(SHIP_SPOTS.findIndex(sp => sp[0].startsWith("Lander bay"))); const F = flyPlan(B, W, true);
  say(`The lander bay. ${W.name} is below. Walk to the lander's ladder and press E to climb in, then E at the seats to undock. The flight down takes about ${(F.total / 3600 + 0.04).toFixed(1)} hours in real time (${fasterHint()} speeds it up).`); }
const parkedBody = () => TRAVEL.on ? null : DESTS[destI].body || null;

// ---------- the probes: into the young super-Jupiter or the brown dwarf ----------
// A model atmosphere: pressure falls by e every scale height H = kT/(mu m g); temperature rises with depth roughly as an adiabat
// (T = T1 (P / 1 bar)^0.19, at least the upper layer's temperature). Clouds condense where each substance's vapour meets its
// condensation curve: potassium chloride and sodium sulfide hazes high up, a deck of silicate (molten rock) droplets deeper, iron
// clouds deeper still. On the parachute the probe falls at its terminal speed, sqrt(2 m g / (rho Cd A)), slower as the gas thickens.
// It fails when the heat (about 2,600 K) overcomes it. Entry first, from a millionth of a bar: braking from its escape speed (150 to 200 km/s) as the gas
// thickens (the drag grows with the pressure), a glowing fireball, until the parachute opens at about 0.01 bar (heat shields this
// demanding are beyond any yet built).
const PROBE_T = new Map([[PB, { name: "Betelgeuse b", g: 117, T1: 1200, Ttop: 760, H: 37, v1: 520, vE: 147000, layers: [[0.3, "a haze of potassium chloride and sodium sulfide", [0.42, 0.34, 0.28], 0.25], [7, "the silicate deck: droplets of molten rock", [0.62, 0.42, 0.26], 0.6], [40, "iron clouds", [0.85, 0.7, 0.55], 0.5]] }],
  [PD, { name: "the brown dwarf", g: 119, T1: 2750, Ttop: 1900, H: 60, v1: 560, vE: 206000, layers: [[0.005, "a thin haze of corundum (aluminium oxide) dust", [0.55, 0.4, 0.3], 0.2], [0.05, "iron clouds: droplets of molten iron", [0.9, 0.6, 0.35], 0.45], [0.3, "the glowing gas of its surface layers (too hot for any clouds)", [1.0, 0.55, 0.25], 0.3]] }]]);
const PROBE = { scene: new THREE.Scene(), on: false, A: null, z: 0, v: 0, t: 0, phase: "", photos: [], ended: 0, nextPhoto: 0, passed: new Set() };
const PH = PROBE.scene; PH.background = new THREE.Color(0x000000);
const pSky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.ShaderMaterial({ uniforms: { up: { value: new THREE.Color() }, down: { value: new THREE.Color() }, sunL: { value: V3(0.3, 0.8, 0.2).normalize() }, sunV: { value: 1 } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 up, down, sunL; uniform float sunV; varying vec3 vD; void main(){ vec3 c = mix(down, up, smoothstep(-0.35, 0.35, vD.y)) + vec3(1.0, 0.55, 0.25) * sunV * (pow(max(dot(vD, sunL), 0.0), 600.0) * 3.0 + pow(max(dot(vD, sunL), 0.0), 6.0) * 0.3); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" }));
PH.add(pSky);
const pStars = new THREE.Points(skyG.children[0].geometry, skyG.children[0].material); PH.add(pStars);
const cloudMat = col => new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(...col) }, glow: { value: new THREE.Color() }, t: { value: 0 }, a: { value: 0.6 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 col, glow; uniform float t, a; varying vec2 vP; ${NOISE} void main(){ float n = fbm(vec3(vP * 0.0012, t * 0.02)); float m = smoothstep(0.35, 0.7, n); gl_FragColor = vec4(col * (0.6 + 0.6 * n) + glow, m * a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}` });
const CLOUDS = []; for (let k = 0; k < 3; k++) for (let s = 0; s < 3; s++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), cloudMat([0.5, 0.4, 0.3])); m.rotation.x = -Math.PI / 2; m.visible = false; PH.add(m); CLOUDS.push({ m, k, s }); }
const streaks = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(600 * 3).map(() => (Math.random() - 0.5) * 60), 3)), new THREE.PointsMaterial({ color: 0xffd0a0, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false })); PH.add(streaks);
const canopy = new THREE.Group(); { const c = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 8, 0, Math.PI * 2, 0, 1.2), M(0xe86a30, { side: THREE.DoubleSide, roughness: 0.8 })); c.position.y = 22; canopy.add(c); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; canopy.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0.5, 0), V3(9 * Math.sin(1.2) * Math.cos(a), 22 + 9 * Math.cos(1.2), 9 * Math.sin(1.2) * Math.sin(a))]), new THREE.LineBasicMaterial({ color: 0xd8d8d8 }))); } }
canopy.visible = false; PH.add(canopy); const pLight = new THREE.HemisphereLight(0xffc090, 0xff7030, 1.2); PH.add(pLight);
const atm = (A, z) => { const P = Math.exp(-z / A.H), T = Math.max(A.Ttop, A.T1 * Math.pow(P, 0.19)); return { P, T }; };
function launchProbe() { const B = parkedBody(), A = B && PROBE_T.get(B); if (!A) { say("Park at the young super-Jupiter (Betelgeuse b) or the brown dwarf first, then send a probe."); return; }
  Object.assign(PROBE, { on: true, A, z: A.H * Math.log(1e6), v: A.vE, t: 0, phase: "entry", ended: 0, nextPhoto: 0, passed: new Set() }); MODE = "probe"; PH.add(rig); yaw = -Math.PI / 2; pitch = -0.3; canopy.visible = false;
  CLOUDS.forEach(C => { const L = A.layers[C.k]; C.m.material.uniforms.col.value.setRGB(...L[2]); C.m.material.uniforms.a.value = L[3]; C.zL = -A.H * Math.log(L[0]) + (C.s - 1) * A.H * 0.15; });
  say(`The probe separates and falls toward ${A.name}. You are seeing through its camera. Entry at about ${Math.round(A.vE / 1000)} km/s (its escape speed): a fireball as it brakes in the thin upper gas, then the parachute. It runs in real time (${fasterHint()} speeds it up); ${inVR() ? "B" : "C"} takes a photo, ${inVR() ? "A" : "E"} returns to the ship.`); photo("Entry: the top of the atmosphere"); }
// photographs: rendered from the probe's camera into a small image and kept for the gallery aboard the ship
const photoRT = new THREE.WebGLRenderTarget(320, 240), photoCam = new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 30000);
function photo(caption) { try { photoCam.position.set(0, 1.6, 0); photoCam.rotation.set(-0.35, 0, 0); photoCam.updateMatrixWorld(); const prev = renderer.getRenderTarget(), xr = renderer.xr.enabled; renderer.xr.enabled = false; renderer.setRenderTarget(photoRT); renderer.clear(); renderer.render(PH, photoCam); const px = new Uint8Array(320 * 240 * 4); renderer.readRenderTargetPixels(photoRT, 0, 0, 320, 240, px); renderer.setRenderTarget(prev); renderer.xr.enabled = xr;
    const c = document.createElement("canvas"); c.width = 320; c.height = 240; const g = c.getContext("2d"), id = g.createImageData(320, 240); for (let y = 0; y < 240; y++) id.data.set(px.subarray((239 - y) * 1280, (240 - y) * 1280), y * 1280); g.putImageData(id, 0, 0); g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 214, 320, 26); g.fillStyle = "#fff"; g.font = "13px sans-serif"; g.fillText(caption.slice(0, 48), 6, 232);
    PROBE.photos.push({ c, caption }); drawGallery(); } catch (e) { } }

// ---------- one frame away from the ship ----------
const pHud = canvasTex(1024, 300), pHudMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.176), new THREE.MeshBasicMaterial({ map: pHud, transparent: true, depthTest: false, toneMapped: false })); pHudMesh.position.set(0, -0.3, -0.75); pHudMesh.rotation.x = -0.4; pHudMesh.renderOrder = 60; camera.add(pHudMesh); pHudMesh.visible = false;
lander.userData.screen.material.map = pHud; lander.userData.screen.material.color.set(0xffffff); lander.userData.screen.material.needsUpdate = true;
function hudText(lines) { const g = pHud.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 300); g.fillStyle = "rgba(10,12,18,.8)"; g.beginPath(); g.roundRect(0, 0, 1024, 300, 20); g.fill(); lines.forEach((l, i) => { g.fillStyle = i ? "#e8f0ff" : "#ffc070"; g.font = (i ? "" : "bold ") + "30px sans-serif"; g.fillText(l, 22, 46 + i * 50, 980); }); pHud.needsUpdate = true; BAR.innerHTML = lines.join(" &nbsp;·&nbsp; "); }
function backToShip(text) { MODE = "ship"; vignette.material.opacity = 0; ship.add(lander); lander.position.copy(BAY_L); lander.rotation.set(0, Math.PI, 0); lander.userData.stowed.visible = true; lander.userData.glow.visible = false; CAB.in = false; camera.far = 30000; camera.updateProjectionMatrix(); scene.add(rig); pHudMesh.visible = false; ringFade = 1.6; RING.in = false; Object.assign(P, { x: -0.8, y: 0, z: 0 }); yaw = -Math.PI / 2; pitch = 0.35; say(text); }
function awaySelect() { }
let aFrame = 0;
function awayFrame(dt, vr) { aFrame++; dt = Math.max(0, dt); const simDt = dt * RATES[rateI][0];
  let mx = 0, my = 0, jump = false, act = false, snap = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.xA) hudOn = !hudOn; prevB.xA = bX; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turnA) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turnA = true; } else if (Math.abs(tx) < 0.3) prevB.turnA = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.aA) act = true; prevB.aA = bA; if (bB && !prevB.bA) jump = true; prevB.bA = bB; const ty = a[ax + 1] || 0; if (ty < -0.75 && !prevB.tU) { setRate(rateI + 1); prevB.tU = true; } else if (ty > -0.3) prevB.tU = false; if (ty > 0.75 && !prevB.tD) { setRate(rateI - 1); prevB.tD = true; } else if (ty < 0.3) prevB.tD = false; } } }
  if (vr && jump && MODE === "probe" && PROBE.on && !PROBE.ended) photo(`At ${atm(PROBE.A, PROBE.z).P.toFixed(PROBE.z > 0 ? 3 : 1)} bar, ${Math.round(atm(PROBE.A, PROBE.z).T)} K`);
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.Space) jump = true; }
  if (awayKeyE) { if (awayIgnore <= 0) act = true; awayKeyE = false; } awayIgnore--;
  if (started) tSec += simDt;
  if (MODE === "surface") surfaceFrame(dt, simDt, vr, mx, my, jump, act); else if (MODE === "fly") flyFrame(dt, simDt, vr, mx, my, act); else probeFrame(dt, simDt, vr, act);
  if (!vr) camera.rotation.set(pitch, yaw, 0, "YXZ");
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") MSG.style.display = "none";
  renderer.render(MODE === "surface" ? SURF.scene : MODE === "fly" ? FLY.scene : PH, camera); }
let awayKeyE = false, awayPhotoKey = false, awayIgnore = 0;
addEventListener("keydown", e => { if (MODE === "ship") return; if (e.code === "KeyE") awayKeyE = true; if (e.code === "KeyH") hudOn = !hudOn; if (e.code === "KeyC" && MODE === "probe") photo(`At ${atm(PROBE.A, PROBE.z).P.toFixed(PROBE.z > 0 ? 3 : 1)} bar, ${Math.round(atm(PROBE.A, PROBE.z).T)} K`); if (e.code === "BracketRight" || e.code === "KeyT") setRate(rateI + 1); if (e.code === "BracketLeft") setRate(rateI - 1); if (e.code === "Backslash") setRate(0); });

function surfaceFrame(dt, simDt, vr, mx, my, jump, act) { const W = SURF.W;
  // the last 10 km of the descent (hovering down on the engine; on c, parachutes then the engine), and the first 10 km of the climb
  // back up: in real time unless you speed it up
  if (SURF.desc || SURF.lift) { const D = SURF.desc || SURF.lift; easeRate(D.T - D.t); D.t += Math.min(dt * RATES[rateI][0], D.T - D.t + 1e-6); const f = Math.min(1, D.t / D.T), alt = SURF.desc ? 10000 * (1 - f) ** 2.2 : 10000 * f ** 2.2, vz = 10000 * 2.2 * (SURF.desc ? (1 - f) ** 1.2 : f ** 1.2) / D.T;
    lander.position.set(0, groundY(0, 0) + alt, 0); fadeM.opacity = Math.max(0, fadeM.opacity - dt); SURF.x = 0; SURF.z = 0; cabinWalk(dt, mx, my); if (act) cabinAct(); cabinRig(vr); if (!vr) camera.position.set(0, 1.65, 0); updateTerrain();
    if (aFrame % 10 === 0 || !surfHud.G.userData.done) { surfHud.update(SURF.B.pos(), SURF.qSky, SURF.B); surfHud.G.userData.done = true; }
    if (aFrame % 6 === 0) hudText([`LANDER ${SURF.desc ? "→ " + W.name : "→ the ship"}: ${SURF.desc ? (W.sky ? "parachutes, then the engine" : "hovering down on the engine") : "climbing on the ascent engine"}`, `altitude ${alt > 1000 ? (alt / 1000).toFixed(1) + " km" : Math.round(alt) + " m"} · ${SURF.desc ? "descending" : "climbing"} at ${Math.round(vz)} m/s`, `${SURF.desc ? "touchdown" : "out of the air, 10 km up,"} in ${fmtDays(Math.max(0, D.T - D.t))} · time ${RATES[rateI][1]} (${timeHint()})`]); pHudMesh.visible = vr;
    if (f >= 1) { if (SURF.desc) { SURF.desc = null; lander.position.y = groundY(0, 0); rover.visible = true; lander.userData.stowed.visible = false; say(`Touchdown on ${W.name}. The rover has been unfolded from the descent stage beside you. ${W.hard ? "Put on the hard suit: E at the hatch (at the back of the cabin) to climb out" : "E at the hatch (at the back of the cabin) to climb out"}; E at the seats to lift off again. ${W.about}`); } else { SURF.lift = null; enterFly(false); } }
    return; }
  fadeM.opacity = Math.max(0, fadeM.opacity - dt);
  if (CAB.in) { SURF.x = 0; SURF.z = 0; cabinWalk(dt, mx, my); if (act) cabinAct(); }
  else if (SURF.inRover) { const thr = -my; ROV.steer += THREE.MathUtils.clamp(-mx - ROV.steer, -1.5 * dt, 1.5 * dt); ROV.v = THREE.MathUtils.clamp(ROV.v + thr * 1.5 * dt - ROV.v * 0.3 * dt * (thr ? 0 : 1), -4, 12); ROV.turn = ROV.steer * 0.4 * Math.min(1, Math.abs(ROV.v) / 3 + 0.2); ROV.head += ROV.turn * dt; { const nx = ROV.x - Math.sin(ROV.head) * ROV.v * dt, nz = ROV.z - Math.cos(ROV.head) * ROV.v * dt; if (Math.hypot(nx, nz) < 6.5 && Math.hypot(nx, nz) < Math.hypot(ROV.x, ROV.z)) { if (Math.abs(ROV.v) > 0.5) say("Stopped: the lander is in the way."); ROV.v = 0; } else { ROV.x = nx; ROV.z = nz; } } SURF.x = ROV.x; SURF.z = ROV.z;
    if (act) { if (W.eva) { SURF.inRover = false; SURF.x = ROV.x + 3 * Math.cos(ROV.head); SURF.z = ROV.z - 3 * Math.sin(ROV.head); say("Out of the rover. E beside it to get back in."); } else say("No suit could survive outside here: drive back to the lander (E beside it) to leave."); } }
  else { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = (keys.ShiftLeft ? 4 : 1.8) * (W.hard ? 0.45 : 1) * dt; SURF.x += (f.x * -my + sd.x * mx) * sp; SURF.z += (f.z * -my + sd.z * mx) * sp;
    const gy = groundY(SURF.x, SURF.z); if (jump && SURF.y <= gy + 0.05) SURF.vy = Math.sqrt(2 * W.g * (W.hard ? 0.05 : 0.5 * 9.81 / W.g)); SURF.vy -= W.g * dt; SURF.y = Math.max(gy, SURF.y + SURF.vy * dt); if (SURF.y <= gy) SURF.vy = 0;
    if (act) { if (Math.hypot(SURF.x - ROV.x, SURF.z - ROV.z) < 5) { SURF.inRover = true; say("In the rover: W/S drive, A/D steer (up to about 40 km/h). E to get out; to go back up, climb the lander's ladder (E beside it)."); } else if (Math.hypot(SURF.x - LADDER.x, SURF.z - LADDER.z) < 2.4) climbIn(); else say("Walk to the rover, or to the lander's ladder (E beside it)."); } }
  // the rover sits on the ground, tilted to it; you ride in its cab
  { const cs = Math.cos(ROV.head), sn = Math.sin(ROV.head), wh = (f, s) => groundY(ROV.x - sn * f + cs * s, ROV.z - cs * f - sn * s), w = [];
    for (const f of [1.8, 0, -1.8]) for (const sd of [-1.45, 1.45]) w.push(wh(f, sd));
    const yT = w.reduce((a, b) => a + b) / 6, pT = Math.atan2((w[0] + w[1]) - (w[4] + w[5]), 2 * 3.6), rT = Math.atan2((w[0] + w[2] + w[4]) - (w[1] + w[3] + w[5]), 3 * 2.9), k = 1 - Math.exp(-dt / 0.35);
    if (ROV.y === null || !SURF.inRover && Math.abs(ROV.v) < 0.01) { ROV.y = yT; ROV.pitch = pT; ROV.roll = rT; } else { ROV.y += (yT - ROV.y) * k; ROV.pitch += (pT - ROV.pitch) * k; ROV.roll += (rT - ROV.roll) * k; }
    rover.position.set(ROV.x, ROV.y, ROV.z); rover.rotation.set(ROV.pitch, ROV.head, -ROV.roll, "YXZ"); }
  if (CAB.in) cabinRig(vr);
  else if (SURF.inRover) { rover.updateMatrixWorld(); rig.position.copy(rover.localToWorld(V3(-0.45, 1.45, -1.85))); if (vr) { rig.quaternion.identity(); rig.rotateY(ROV.head); } else rig.quaternion.copy(rover.quaternion); }
  else { if (SURF.y === undefined || isNaN(SURF.y)) SURF.y = groundY(SURF.x, SURF.z); rig.position.set(SURF.x, SURF.y, SURF.z); rig.quaternion.identity(); }
  if (!CAB.in) rig.rotateY(vr ? vrYaw : 0); if (!vr) camera.position.set(0, SURF.inRover && !CAB.in ? 0.55 : 1.65, 0);
  vignette.material.opacity = vr ? THREE.MathUtils.clamp(SURF.inRover ? Math.abs(ROV.v) / 12 * 0.55 + Math.abs(ROV.turn) * 1.6 : (mx || my ? 0.3 : 0), 0, 0.85) : 0;
  updateTerrain();
  const dl = Math.hypot(SURF.x, SURF.z); if (aFrame % 10 === 0 || !surfHud.G.userData.done) { surfHud.update(SURF.B.pos(), SURF.qSky, SURF.B); surfHud.G.userData.done = true; } if (aFrame % 10 === 0) hudText([`${W.name}`, `gravity ${(W.g / 9.81).toFixed(2)} g · ${CAB.in ? "in the lander" : SURF.inRover ? "in the rover, " + (Math.abs(ROV.v) * 3.6).toFixed(0) + " km/h" : "on foot"} · lander ${dl < 1000 ? Math.round(dl) + " m" : (dl / 1000).toFixed(1) + " km"} away`, `${CAB.in ? "E at the hatch to climb out, E at the seats to lift off" : W.eva && !SURF.inRover ? "WASD walk, space jump, E at the rover or the lander's ladder" : "W/S drive, A/D steer, E to get out"}`]); pHudMesh.visible = vr; }
function updateTerrain() { for (const m of TERR) { const lim = m.userData.size * 0.08; if (Math.hypot(SURF.x - m.userData.cx, SURF.z - m.userData.cz) > lim) { fillTerrain(m, SURF.x, SURF.z); if (m === TERR[0]) fillRocks(); } } surfSky.position.copy(rig.position); surfHud.G.position.copy(rig.position); for (const o of [sunBall, sunGlow, airDome, skyPlanet, planetGlow]) if (o && o.userData.p0) o.position.copy(o.userData.p0).add(rig.position); }
// ---------- in the lander's cabin, wherever the lander is: in the ship's bay, in flight, on a surface ----------
const CAB = { in: false, x: 1.3, z: 0 };
function cabinWalk(dt, mx, my) { if (!mx && !my) return; const q = lander.getWorldQuaternion(new THREE.Quaternion()).invert(), f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(q); f.y = 0; if (f.lengthSq() < 1e-6) return; f.normalize();
  const sd = V3(-f.z, 0, f.x), sp = 1.4 * dt, nx = CAB.x + (f.x * -my + sd.x * mx) * sp, nz = CAB.z + (f.z * -my + sd.z * mx) * sp; if (Math.hypot(nx, nz) < 1.85 && nz > -1.35) { CAB.x = nx; CAB.z = nz; } }
function cabinRig(vr) { lander.updateWorldMatrix(true, false); rig.position.copy(lander.localToWorld(V3(CAB.x, CAB_Y, CAB.z))); rig.quaternion.copy(lander.getWorldQuaternion(new THREE.Quaternion())); rig.rotateY(vr ? vrYaw : 0); }
function climbIn() { CAB.in = true; CAB.x = 1.3; CAB.z = 0.2; if (MODE === "ship") { ringFade = 1.6; lastArea = "lander"; } else fadeM.opacity = 1; yaw = 0; pitch = -0.1;
  if (MODE === "ship") hudText(["LANDER: docked in the ship's bay", parkedBody() && WORLDS.get(parkedBody()) ? `Ready to fly down to ${WORLDS.get(parkedBody()).name}: E at the seats` : "Park the ship at a world the lander can reach first", "E at the hatch to climb out"]);
  say(`You climb the ladder and through the hatch into the lander's cabin. ${MODE === "ship" ? "E at the seats (by the windows) to undock and fly down; E at the hatch to climb out." : "E at the seats to lift off back to the ship; E at the hatch to climb out."}`); }
function climbOut() { CAB.in = false; if (MODE === "ship") { const lp = LADDER.clone().applyEuler(lander.rotation).add(lander.position); Object.assign(P, { x: lp.x - 0.9, y: -62, z: lp.z }); ringFade = 1.6; yaw = -Math.PI / 2; pitch = 0.1; say("Back down the ladder, in the bay."); }
  else { SURF.x = LADDER.x + 1.2; SURF.z = 0; SURF.y = groundY(SURF.x, SURF.z); SURF.vy = 0; fadeM.opacity = 1; yaw = Math.PI / 2; pitch = 0; say(`Through the hatch and down the ladder onto ${SURF.W.name}${SURF.W.hard ? ", in the hard suit" : ""}. ${SURF.W.hard ? "WASD walk, slowly" : "WASD walk (shift runs), space jumps"}; E at the rover to drive it; E at the ladder to climb back in.`); } }
function cabinAct() { const atSeat = Math.hypot(CAB.x, CAB.z + 0.6) < 1.0, atHatch = CAB.x > 1.15, flying = MODE === "fly" || SURF.desc || SURF.lift;
  if (atSeat) { if (MODE === "ship") beginDescent(); else if (flying) say(`The lander is flying itself: the screen shows where it is and what comes next. ${fasterHint()} speeds up time.`); else beginAscent(); return; }
  if (atHatch) { if (flying) say("Not while flying."); else climbOut(); return; }
  say("Walk to the seats by the windows to fly, or to the hatch at the back to climb out."); }
// E in the ship: climb into the lander at its ladder, or act inside it
function bayAct() { if (MODE !== "ship" || RING.in) return false; if (CAB.in) { cabinAct(); return true; } if (Math.abs(P.y + 62) > 0.01 || lander.parent !== ship) return false;
  const lp = LADDER.clone().applyEuler(lander.rotation).add(lander.position); if (Math.hypot(P.x - lp.x, P.z - lp.z) > 2.4) return false; climbIn(); return true; }
function beginDescent() { const B = parkedBody(), W = B && WORLDS.get(B); if (!W) { say("The ship isn't parked at a world the lander can land on. Fly to one (Betelgeuse e or c, the moons b I, b II, b III, or d I), then come back to the seats."); return; } enterFly(true); }
function beginAscent() { SURF.lift = { t: 0, T: 75 }; rover.visible = true; say(`Lift-off! The ascent engine fires. The rover stays behind on the surface, as Apollo's did.${SURF.W.g > 10 ? " (Climbing off a world this big takes about 17 km/s: only a nuclear engine could do it.)" : ""}`); }
const easeRate = rest => { while (rateI > 0 && rest / RATES[rateI][0] < 6) { rateI--; say(`Time slows to ${RATES[rateI][1]} for what comes next.`); } };

// ---------- the lander's flight between the ship and the surface, in real time ----------
// Real orbital mechanics, simplified. The ship circles the world 5 of its radii out. Going down: undock, a deorbit burn that drops
// the far side of the orbit to 15 km above the ground, half an ellipse coasting down (hours, weightless), then a braking burn that
// kills the orbital speed down to a hover at 10 km, then the hover down to the ground. On c the thick air does the braking (an entry
// behind a heat shield) and parachutes and the engine bring it down. Coming up is the same backwards. The engine is assumed to push
// at 1.6 times the world's gravity (and at least 3 m/s^2).
function flyPlan(B, W, down) { const R = W.R, GM = W.g * R * R, r0 = Math.max(3 * R, SHIP.distanceTo(B.pos()) * AU_M), hp = W.sky ? 120000 : 15000, rp = R + hp, a = (r0 + rp) / 2, e = (r0 - rp) / (r0 + rp), Tc = Math.PI * Math.sqrt(a ** 3 / GM), vp = Math.sqrt(GM * (2 / rp - 1 / a)), vc0 = Math.sqrt(GM / r0), va = Math.sqrt(GM * (2 / r0 - 1 / a)), acc = Math.max(3, 1.6 * W.g), ab = down && W.sky ? 5 * 9.81 : acc, Tb = vp / ab, sb = vp * vp / (2 * ab), Tdo = (vc0 - va) / acc;
  const segs = down ? [["undock", 40], ["deorbit", Tdo], ["coast", Tc], [W.sky ? "entry" : "brake", Tb]] : [["ascent", Tb], ["coast", Tc], ["circularise", Tdo], ["dock", 120]];
  return { B, W, down, R, GM, r0, hp, a, e, Tc, vp, vc0, va, ab, Tb, sb, segs, total: segs.reduce((x, sg) => x + sg[1], 0) + (down ? 150 : 75) }; }
const FLY = { scene: new THREE.Scene(), t: 0 }; FLY.scene.background = new THREE.Color(0x000000);
const flySky = new THREE.Group(); { const st = new THREE.Points(skyG.children[0].geometry, skyG.children[0].material), mw = new THREE.Mesh(skyG.children[1].geometry, skyG.children[1].material); st.frustumCulled = false; mw.frustumCulled = false; flySky.add(st, mw); flySky.scale.setScalar(3); } FLY.scene.add(flySky);
const flyHud = skyHud(FLY.scene, false); flyHud.G.scale.setScalar(3);
const flySun = new THREE.Mesh(sunBall.geometry, starMat), flySunGlow = new THREE.Sprite(sunGlow.material), flyGlow2 = new THREE.Sprite(planetGlow.material); FLY.scene.add(flySun, flySunGlow, flyGlow2);
const flyHaze = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshLambertMaterial({ color: 0x9a6a48 })); FLY.scene.add(flyHaze);
const flyLight = new THREE.DirectionalLight(new THREE.Color(...ADAPT), 2.2); FLY.scene.add(flyLight, new THREE.AmbientLight(0x404858, 0.4));
let flyPlanet = null, flyParent = null;
function enterFly(down) { const B = down ? parkedBody() : SURF.B, W = WORLDS.get(B), F = Object.assign(FLY, flyPlan(B, W, down)); F.d0 = SHIP.clone().sub(B.pos()).normalize(); F.n = down ? landingUp(B, W, F.d0, Math.PI * 0.9) : SURF.up.clone();
  F.Phi = Math.acos(THREE.MathUtils.clamp(F.d0.dot(F.n), -1, 1)); F.axis = new THREE.Vector3().crossVectors(F.d0, F.n); if (F.axis.lengthSq() < 1e-10) F.axis.crossVectors(F.d0, V3(0, 1, 0)); F.axis.normalize(); F.Phib = Math.min(F.sb / F.R, 0.6 * F.Phi); F.Phic = F.Phi - F.Phib; F.t = 0; F.lastK = -1;
  const s = B.pos().negate().normalize(), flux = L_B / B.pos().lengthSq();
  if (flyPlanet) FLY.scene.remove(flyPlanet); flyPlanet = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 96), B.mesh.material.clone()); flyPlanet.material.uniforms.L.value = s.clone(); flyPlanet.material.uniforms.I.value = 0.35 * Math.pow(flux, 0.3); flyPlanet.scale.setScalar(PS); FLY.scene.add(flyPlanet);
  if (flyParent) { FLY.scene.remove(flyParent); flyParent = null; } if (W.planet) { flyParent = new THREE.Mesh(W.planet.mesh.geometry, W.planet.mesh.material.clone()); flyParent.material.uniforms.L.value = W.planet.pos().negate().normalize(); flyParent.material.uniforms.I.value = 0.35 * Math.pow(L_B / W.planet.pos().lengthSq(), 0.3); FLY.scene.add(flyParent); }
  flyHaze.visible = !!W.sky; flyHaze.scale.setScalar(PS * 1.012); if (W.sky) flyHaze.material.color.setRGB(...W.sky.horizon); flyLight.position.copy(s).multiplyScalar(100);
  MODE = "fly"; awayIgnore = 3; FLY.scene.add(rig, lander); lander.userData.stowed.visible = down; lander.userData.glow.visible = true; CAB.in = true; fadeM.opacity = 1; camera.far = 40000; camera.updateProjectionMatrix(); yaw = 0; pitch = -0.15;
  F.msgs = { undock: "Undocking: the lander drifts clear of the ship on its thrusters.", deorbit: `Deorbit burn: the engine takes off ${Math.round(F.vc0 - F.va)} m/s so that the lander's path dips down to ${W.name}. You feel a gentle push.`, coast: down ? `Engine off: coasting down along half an orbit, weightless, for ${fmtDays(F.Tc)}. ${W.name} grows ahead. ${fasterHint()} speeds up time.` : `Engine off: coasting up to the ship's orbit, weightless, for ${fmtDays(F.Tc)}. ${fasterHint()} speeds up time.`,
    brake: `Braking burn, ${F.hp / 1000} km up: the engine kills ${(F.vp / 1000).toFixed(1)} km/s of speed over ${fmtDays(F.Tb)}, the ground streaming by below, down to a hover at 10 km.`, entry: `Entry: ${(F.vp / 1000).toFixed(1)} km/s into the thick air. The heat shield glows as the air brakes the lander at about 5 g; then parachutes and the engine for the last 10 km.`,
    ascent: `Climbing to orbit: the engine burns for ${fmtDays(F.Tb)}, building up ${(F.vp / 1000).toFixed(1)} km/s.`, circularise: "A burn to match the ship's orbit.", dock: "Closing in on the ship, and docking." }; }
function flyState(F, t) { let k = 0; while (k < F.segs.length - 1 && t > F.segs[k][1]) { t -= F.segs[k][1]; k++; } const [name, T] = F.segs[k], f = T > 0 ? THREE.MathUtils.clamp(t / T, 0, 1) : 1, o = { name, k, rest: Math.max(0, T - t), f, alt: 0 };
  if (name === "undock" || name === "dock") { o.r = F.r0; o.phi = 0; o.v = F.vc0; }
  else if (name === "deorbit" || name === "circularise") { o.r = F.r0; o.phi = 0; o.v = F.down ? F.vc0 + (F.va - F.vc0) * f : F.va + (F.vc0 - F.va) * f; }
  else if (name === "coast") { const M = Math.PI + Math.PI * (F.down ? f : 1 - f); let E = M; for (let i = 0; i < 10; i++) E -= (E - F.e * Math.sin(E) - M) / (1 - F.e * Math.cos(E)); o.r = F.a * (1 - F.e * Math.cos(E)); let nu = 2 * Math.atan2(Math.sqrt(1 + F.e) * Math.sin(E / 2), Math.sqrt(1 - F.e) * Math.cos(E / 2)); if (nu < 0) nu += 2 * Math.PI; o.phi = (nu - Math.PI) / Math.PI * F.Phic; o.v = Math.sqrt(F.GM * Math.max(0, 2 / o.r - 1 / F.a)); }
  else { const ff = F.down ? f : 1 - f, tb = ff * T, sd = F.vp * tb - 0.5 * F.ab * tb * tb; o.v = Math.max(0, F.vp - F.ab * tb); o.phi = F.Phic + F.Phib * sd / F.sb; o.r = F.R + 10000 + (F.hp - 10000) * (1 - ff) ** (F.W.sky ? 2 : 1); }
  o.alt = o.r - F.R; return o; }
function flyFrame(dt, simDt, vr, mx, my, act) { const F = FLY, flight = F.total - (F.down ? 150 : 75);
  // time never jumps past the end of a stage: the rate eases off before each one, as on the ship's trips
  { const o0 = flyState(F, F.t); easeRate(o0.rest); F.t = Math.min(flight, F.t + Math.min(dt * RATES[rateI][0], o0.rest + 1e-6)); }
  const o = flyState(F, F.t); if (o.k !== F.lastK) { F.lastK = o.k; say(F.msgs[o.name]); }
  if (F.t >= flight) { if (F.down) landFinal(); else docked(); return; }
  // where the lander is (the world's centre at the origin, its radius PS units), and which way it faces: along its path, tipped down
  // toward the world so that its edge (or the horizon) sits just below the middle of the windows
  const u = F.d0.clone().applyAxisAngle(F.axis, o.phi), h = new THREE.Vector3().crossVectors(F.axis, u).multiplyScalar(F.down ? 1 : -1).normalize(), rho = Math.asin(Math.min(1, F.R / o.r)), beta = Math.max(0, Math.PI / 2 - rho - 4 * Math.PI / 180);
  const fw = h.clone().multiplyScalar(Math.cos(beta)).addScaledVector(u, -Math.sin(beta)).normalize(), Y = u.clone().sub(fw.clone().multiplyScalar(u.dot(fw))).normalize(), Z = fw.clone().negate(), X = new THREE.Vector3().crossVectors(Y, Z);
  lander.position.copy(u).multiplyScalar(o.r / F.R * PS); lander.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  cabinWalk(dt, mx, my); if (act) cabinAct(); cabinRig(vr); if (!vr) camera.position.set(0, 1.65, 0); fadeM.opacity = Math.max(0, fadeM.opacity - dt); pHudMesh.visible = vr;
  const rp = rig.position, s = F.B.pos().negate().normalize(), dB = F.B.pos().length(); flySky.position.copy(rp); flyHud.G.position.copy(rp);
  flySun.position.copy(rp).addScaledVector(s, 26000); flySun.scale.setScalar(26000 * R_B / dB); flySunGlow.position.copy(flySun.position); flySunGlow.scale.setScalar(flySun.scale.x * 8);
  flyGlow2.visible = false; if (flyParent) { const rel = F.W.planet.pos().sub(F.B.pos()), d = rel.length(); flyParent.position.copy(rp).addScaledVector(rel.normalize(), 25000); flyParent.scale.setScalar(25000 * F.W.planet.R / d); if (F.W.planet.glowI > 0.5) { flyGlow2.visible = true; flyGlow2.position.copy(flyParent.position); flyGlow2.scale.setScalar(flyParent.scale.x * 7); } }
  lander.userData.glow.material.opacity = o.name === "entry" ? Math.min(1, 1.6 * Math.sin(Math.PI * Math.min(1, o.f * 1.3))) : 0;
  // inside the haze of a thick atmosphere the stars are gone
  { const inHaze = F.W.sky && o.alt < 0.012 * F.R; flySky.visible = !inHaze; flyPlanet.visible = !F.W.sky || inHaze; flyHaze.material.side = inHaze ? THREE.BackSide : THREE.FrontSide; flyHaze.material.color.setRGB(...(F.W.sky ? F.W.sky.horizon : [0, 0, 0])).multiplyScalar(inHaze ? 0.6 : 1); }
  if (aFrame % 10 === 0 || F.lastHud !== F) { flyHud.update(F.B.pos(), new THREE.Quaternion(), F.B); F.lastHud = F; }
  const fa = o.alt > 1e5 ? Math.round(o.alt / 1000).toLocaleString() + " km" : (o.alt / 1000).toFixed(1) + " km", names = { undock: "undocking", deorbit: "deorbit burn", coast: down => down ? "coasting down (engine off)" : "coasting up (engine off)", brake: "braking burn", entry: "entry: the heat shield glowing", ascent: "climbing to orbit (engine burning)", circularise: "matching the ship's orbit", dock: "docking" }, nm = typeof names[o.name] === "function" ? names[o.name](F.down) : names[o.name];
  if (aFrame % 6 === 0) hudText([`LANDER ${F.down ? "→ " + F.W.name : "→ the ship"}: ${nm}`, `altitude ${fa} · speed ${o.v > 2000 ? (o.v / 1000).toFixed(2) + " km/s" : Math.round(o.v) + " m/s"} · this stage ends in ${fmtDays(o.rest)}`, `${F.down ? "touchdown" : "docking"} in ${fmtDays(F.total - F.t - (F.down ? 0 : 75))} · time ${RATES[rateI][1]} (${timeHint()})`]); }
function landFinal() { const F = FLY; setupSurface(F.B, F.W, F.n); MODE = "surface"; SURF.scene.add(rig, lander); lander.quaternion.identity(); lander.position.set(0, groundY(0, 0) + 10000, 0); lander.userData.glow.visible = false; SURF.desc = { t: 0, T: 150 }; fadeM.opacity = 1; camera.far = 600000; camera.updateProjectionMatrix();
  say(`10 km above ${F.W.name}: ${F.W.sky ? "under parachutes in the thick haze, then on the engine" : "hovering down on the engine"} for the last two and a half minutes.`); }
function docked() { backToShip("Docked. The lander is back in its cradle in the bay; you are still in its cabin. E at the hatch to climb out."); CAB.in = true; lastArea = "lander"; CAB.x = 0.3; CAB.z = 0.1; Object.assign(P, { x: MOD.x + 8.4, y: -62, z: 0 }); ringFade = 1.6; yaw = 0; pitch = 0; }

function probeFrame(dt, simDt, vr, act) { const A = PROBE.A; if (!PROBE.on) return;
  if (act) { backToShip("You leave the probe's camera; it falls on without you. Its photos are in the gallery on the bridge."); PROBE.on = false; return; }
  if (PROBE.ended) { PROBE.ended -= dt; if (PROBE.ended <= 0) { PROBE.on = false; backToShip(`Signal lost: the probe has been crushed and melted. ${PROBE.photos.length} photographs are in the gallery on the bridge and in the observation sphere.`); } return; }
  // the fall, in small steps so that sped-up time stays accurate
  { const nSub = Math.min(600, Math.ceil(simDt / 1.0)); for (let k = 0; k < nSub; k++) { const h = simDt / nSub; PROBE.t += h; const a = atm(A, PROBE.z);
      if (PROBE.phase === "entry") { PROBE.v = A.v1 + (A.vE - A.v1) * Math.exp(-a.P / 0.002); if (a.P > 0.012) { PROBE.phase = "chute"; canopy.visible = true; say("Parachute out. Falling through the upper atmosphere: look down at the glow of the deep, hot layers; look up at the parachute."); photo("Parachute deployed"); } }
      else PROBE.v = A.v1 * Math.sqrt((a.T / A.T1) / a.P);
      PROBE.z -= PROBE.v * h / 1000; if (a.T > 2600) break; } }
  const { P, T } = atm(A, PROBE.z);
  for (const C of CLOUDS) { C.m.position.y = (C.zL - PROBE.z) * 1000; C.m.visible = Math.abs(C.m.position.y) < 8000; C.m.material.uniforms.t.value += dt; const Tl = atm(A, C.zL).T, gc = bbRGB(Tl).map(v => v * Math.min(2, (Tl / 1700) ** 4)); C.m.material.uniforms.glow.value.setRGB(gc[0] * 0.5, gc[1] * 0.5, gc[2] * 0.5);
    if (C.s === 1 && PROBE.z < C.zL && !PROBE.passed.has(C.k)) { PROBE.passed.add(C.k); say(`Through ${A.layers[C.k][1]}, at about ${A.layers[C.k][0]} bar and ${Math.round(Tl)} K.`); photo(A.layers[C.k][1][0].toUpperCase() + A.layers[C.k][1].slice(1)); } }
  // the sky: sunlight fades with depth; the deep gas glows by its heat (a blackbody colour, brighter as the fourth power of T)
  const Tdeep = atm(A, PROBE.z - A.H * 1.5).T, gd = bbRGB(Tdeep).map(v => v * Math.min(3, (Tdeep / 1600) ** 4) * 0.6), sunV = Math.exp(-P / 0.4), haze = Math.min(1, P / 0.02);
  pSky.material.uniforms.up.value.setRGB(0.25 * haze * (0.3 + sunV) + gd[0] * 0.25, 0.17 * haze * (0.3 + sunV) + gd[1] * 0.25, 0.12 * haze * (0.3 + sunV) + gd[2] * 0.25); pSky.material.uniforms.down.value.setRGB(gd[0] + 0.1 * haze, gd[1] + 0.07 * haze, gd[2] + 0.05 * haze); pSky.material.uniforms.sunV.value = sunV;
  pStars.visible = P < 0.01; pStars.material.opacity = 1; pLight.intensity = 0.4 + 1.5 * Math.min(1, (T / 1800) ** 4);
  if (PROBE.phase === "entry") { const k = Math.min(1, P / 2e-5) * Math.max(0, (PROBE.v - A.v1) / (A.vE - A.v1)), dn = pSky.material.uniforms.down.value; dn.setRGB(dn.r + (2.5 - dn.r) * k, dn.g + (1.2 - dn.g) * k, dn.b + (0.5 - dn.b) * k); if (k > 0.3) pStars.visible = false; }
  { const sp = streaks.geometry.attributes.position, up = PROBE.v * dt * (PROBE.phase === "entry" ? 0.002 : 0.05); for (let i = 0; i < 600; i++) { let y = sp.getY(i) + up; if (y > 30) y -= 60; sp.setY(i, y); } sp.needsUpdate = true; streaks.material.color.setRGB(...(PROBE.phase === "entry" ? [1, 0.8, 0.5] : [0.7, 0.55, 0.4])); }
  rig.position.set(0, 0, 0); rig.quaternion.identity(); rig.rotateY(vr ? vrYaw : 0); if (!vr) camera.position.set(0, 1.6, 0); pHudMesh.visible = vr;
  if (PROBE.t > PROBE.nextPhoto && PROBE.phase === "chute") { PROBE.nextPhoto = PROBE.t + 300; if (PROBE.t > 10) photo(`${P.toFixed(P < 1 ? 2 : 0)} bar, ${Math.round(T)} K`); }
  if (aFrame % 6 === 0) hudText([`PROBE into ${A.name}: ${PROBE.phase === "entry" ? "entry fireball" : "on the parachute"}`, `pressure ${P < 0.01 ? (P * 1000).toFixed(1) + " mbar" : P.toFixed(P < 10 ? 2 : 0) + " bar"} · temperature ${Math.round(T)} K (${Math.round(T - 273)} °C) · falling ${PROBE.v > 2000 ? (PROBE.v / 1000).toFixed(1) + " km/s" : Math.round(PROBE.v) + " m/s"}`, `${Math.round(PROBE.t / 60)} min since entry · ${PROBE.photos.length} photos · ${inVR() ? "B" : "C"} photo · ${inVR() ? "A" : "E"} back to the ship · time ${RATES[rateI][1]} (${timeHint()})`]);
  if (T > 2600) { PROBE.ended = 4; photo("Last image before the signal was lost"); say(`At ${P.toFixed(0)} bar and ${Math.round(T)} K, the probe's electronics fail and its hull gives way.`); } }

// ---------- aboard: the missions screen, and the gallery of probe photographs ----------
const misTex = canvasTex(640, 420); const MISSIONS = [];
for (const [x, y, z, ry] of [[2.75, 1.2, 0.75, Math.atan2(-2.75, -0.75)], [MOD.x + 7.2, 4.9, -1.6, -Math.PI / 2 + 0.25]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.525), new THREE.MeshBasicMaterial({ map: misTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.2, ry, 0, "YXZ"); ship.add(m); MISSIONS.push(m); }
function missionRows() { const B = parkedBody(), rows = []; if (B && WORLDS.has(B)) rows.push([`Land on ${WORLDS.get(B).name}: to the lander bay (L)`, startLanding]); else rows.push(["Land: park at e, c, or a moon first", null]); if (B && PROBE_T.has(B)) rows.push([`Send a probe into ${PROBE_T.get(B).name} (key P)`, launchProbe]); else rows.push(["Probe: park at Betelgeuse b or the brown dwarf first", null]); rows.push([`Probe photographs: ${PROBE.photos.length} (in the gallery)`, null]); return rows; }
function drawMissions() { const g = misTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 640, 420); g.fillStyle = "#ffd070"; g.font = "bold 34px sans-serif"; g.fillText("MISSIONS", 24, 50); missionRows().forEach(([t, f], k) => { const y = 74 + k * 100; g.fillStyle = f ? "#2a3a22" : "#181c26"; g.fillRect(16, y, 608, 88); g.fillStyle = f ? "#e8ffd8" : "#8a92a2"; g.font = "bold 25px sans-serif"; g.fillText(t, 30, y + 52, 584); }); misTex.needsUpdate = true; }
function missionHit(uv) { const k = Math.floor(((1 - uv.y) * 420 - 74) / 100), r = missionRows()[k]; if (r && r[1]) r[1](); }
const galTex = canvasTex(1024, 768); const GALS = [];
for (const [x, y, z, ry] of [[MOD.x + 5.5, 6.0, -5.5, -Math.PI * 0.75], [-2.6, 2.3, 1.9, Math.atan2(2.6, -1.9)]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshBasicMaterial({ map: galTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.1, ry, 0, "YXZ"); ship.add(m); GALS.push(m); }
function drawGallery() { const g = galTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 1024, 768); g.fillStyle = "#9ad0ff"; g.font = "bold 34px sans-serif"; g.fillText(`PROBE PHOTOGRAPHS (${PROBE.photos.length})`, 24, 46);
  PROBE.photos.slice(-9).forEach((p, i) => g.drawImage(p.c, 24 + (i % 3) * 330, 66 + Math.floor(i / 3) * 232, 312, 222)); if (!PROBE.photos.length) { g.fillStyle = "#8a92a2"; g.font = "26px sans-serif"; g.fillText("No photographs yet: send a probe into the giant planet or the brown dwarf.", 24, 120); } galTex.needsUpdate = true; }
drawGallery(); setInterval(() => { if (MODE === "ship") drawMissions(); }, 500); drawMissions();

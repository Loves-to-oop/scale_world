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
// ground in sunlight (on e, the day side would reach about 1,200 K, near the melting point of rock)
const WORLDS = new Map([
  [PE, { name: "Betelgeuse e", R: 3.5e6, g: 4.9, sunEl: 5, eva: true, style: "crater", sky: null,
    about: "A scorched, airless rocky world about Mars's size, 45 AU from Betelgeuse. The lander set down where the star has just risen: in full daylight the ground reaches about 1,200 K, near rock's melting point; here, about 500 K, which the suit's cooling can bear for a while. Gravity 0.5 g." }],
  [PC, { name: "Betelgeuse c", R: 1.02e7, g: 17, sunEl: 25, eva: false, style: "volcanic", sky: { horizon: [0.62, 0.42, 0.28], zenith: [0.32, 0.2, 0.14], fog: [0.5, 0.34, 0.24], dens: 1 / 2200 },
    about: "A young rocky super-Earth, 1.6 times Earth's size, 350 AU out where the light equals the Sun's at Earth, but at 8 million years old still cooling: a black new crust split by glowing lava, under about 30 times Earth's air pressure of steam and carbon dioxide at about 200 °C. No spacesuit could survive outside: you stay in the rover's pressure hull. Gravity 1.75 g." }],
  [PB1, { name: "b I", R: 1.825e6, g: 1.8, sunEl: 10, eva: true, style: "lava", sky: null, planet: PB,
    about: "A volcanic moon the size of our own, kneaded by the giant planet's tides: dark lava fields and glowing vents. The giant fills 17° of the sky. Its magnetic field's radiation belts would make a long stay here deadly; the suit buys you an hour or so. Gravity 0.18 g: you bound." }],
  [PB2, { name: "b II", R: 1.646e6, g: 1.2, sunEl: 10, eva: true, style: "crater2", sky: null, planet: PB,
    about: "A dark, cratered, rocky moon, its ices long since boiled away by Betelgeuse's light (about 9 times the sunlight at Earth). The giant planet hangs 7.5° across in the sky. Gravity 0.12 g: you bound." }]]);
// the ground: height (m) and colour and glow at a point, by the world's style
function groundAt(W, x, z) { let h = 0, c = [0.3, 0.3, 0.3], glow = 0;
  if (W.style === "crater") { const [c1] = craters(x, z, 520, 40, 200, 0.16, 1), [c2] = craters(x, z, 75, 4, 26, 0.2, 2, 0.55); h = 70 * fbm2(x / 1100, z / 1100) + c1 + c2 + 1.2 * fbm2(x / 7, z / 7, 3);
    const n = fbm2(x / 300, z / 300, 3); c = mix3([0.18, 0.16, 0.15], [0.42, 0.34, 0.27], sstep(0.35, 0.7, n)); c = mix3(c, [0.55, 0.45, 0.36], sstep(30, 80, h) * 0.5); }
  else if (W.style === "volcanic") { const ch = Math.abs(fbm2(x / 900, z / 900, 4) - 0.5); h = 160 * ridged2(x / 2400, z / 2400) + 22 * fbm2(x / 260, z / 260) + 1.5 * fbm2(x / 9, z / 9, 3); const lava = sstep(0.022, 0.0, ch); h -= 8 * lava;
    c = mix3([0.09, 0.08, 0.08], [0.25, 0.2, 0.17], sstep(0.4, 0.75, fbm2(x / 150, z / 150, 3))); glow = lava * (0.6 + 0.4 * fbm2(x / 40, z / 40, 2)); }
  else if (W.style === "lava") { const [p, pin] = craters(x, z, 1100, 80, 320, -0.02, 3, 0.35); h = 28 * fbm2(x / 700, z / 700) + p + 1.5 * fbm2(x / 8, z / 8, 3); const flow = sstep(0.55, 0.62, fbm2(x / 500 + 9, z / 500, 4));
    c = mix3([0.3, 0.24, 0.2], [0.12, 0.1, 0.09], flow); c = mix3(c, [0.55, 0.42, 0.26], sstep(0.6, 0.8, fbm2(x / 200, z / 200, 3)) * 0.4); glow = pin > 0.3 ? sstep(0.3, 0.7, pin) * (0.5 + 0.5 * fbm2(x / 30, z / 30, 2)) : 0; }
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
const TERR = [terrainMesh(500, 200, -1, 0), terrainMesh(4000, 160, 0, 0.6), terrainMesh(40000, 160, 1, 4)];
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
function fillRocks() { let n = 0; const S = 7, cx = Math.floor(SURF.x / S), cz = Math.floor(SURF.z / S), tint = SURF.W.style === "volcanic" ? 0.5 : 1;
  for (let i = cx - 36; i <= cx + 36 && n < 900; i++) for (let j = cz - 36; j <= cz + 36 && n < 900; j++) { const r = nh(i * 1.7, j * 2.3); if (r > 0.18) continue; const x = (i + nh(i, j)) * S, z = (j + nh(j, i)) * S, sz = 0.15 + 1.4 * r ** 1.5 * 5 * tint; O3s.position.set(x, groundY(x, z) + sz * 0.2, z); O3s.rotation.set(nh(i, 1) * 6, nh(j, 2) * 6, 0); O3s.scale.setScalar(sz); O3s.updateMatrix(); rockIM.setMatrixAt(n++, O3s.matrix); }
  rockIM.count = n; rockIM.instanceMatrix.needsUpdate = true; }
// the sky: the stars and Milky Way from the ship's sky (turned into the local frame), Betelgeuse, the giant planet, an atmosphere
const surfSky = new THREE.Group(); surfSky.add(new THREE.Points(skyG.children[0].geometry, skyG.children[0].material), new THREE.Mesh(skyG.children[1].geometry, skyG.children[1].material)); SURF.scene.add(surfSky);
const sunBall = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), starMat), sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); SURF.scene.add(sunBall, sunGlow);
let skyPlanet = null;
const airDome = new THREE.Mesh(new THREE.SphereGeometry(8500, 48, 24), new THREE.ShaderMaterial({ uniforms: { hor: { value: new THREE.Color() }, zen: { value: new THREE.Color() }, sunL: terrU.sunL }, side: THREE.BackSide, depthWrite: false, transparent: true,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 hor, zen, sunL; varying vec3 vD; void main(){ float u = max(vD.y, 0.0); vec3 c = mix(hor, zen, pow(u, 0.5)) + vec3(1.0, 0.6, 0.3) * pow(max(dot(vD, sunL), 0.0), 8.0) * 0.6; gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" }));
airDome.renderOrder = 0; SURF.scene.add(airDome);
// the lander and the rover
function landerMesh() { const g = new THREE.Group(), gold = M(0xc8a040, { metalness: 0.8, roughness: 0.3 }), white = M(0xe8eaee, { roughness: 0.5 }), metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); };
  add(new THREE.CylinderGeometry(2.4, 2.8, 3.2, 8), gold, 0, 2.8, 0); add(new THREE.CylinderGeometry(1.6, 2.2, 1.8, 8), white, 0, 5.3, 0); add(new THREE.ConeGeometry(1.0, 1.5, 16), M(0x2a2c32), 0, 0.9, 0);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; add(new THREE.CylinderGeometry(0.12, 0.12, 3.8, 6), metal, 3.0 * Math.cos(a), 1.5, 3.0 * Math.sin(a), Math.sin(a) * 0.45, -Math.cos(a) * 0.45); add(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 12), metal, 3.7 * Math.cos(a), 0.06, 3.7 * Math.sin(a)); }
  for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.8, 0.06, 0.1), metal, 2.75, 0.6 + k * 0.4, 0); return g; }
function roverMesh() { const g = new THREE.Group(), white = M(0xe8eaee, { roughness: 0.5 }), dark = M(0x2a2c32), glass = new THREE.MeshStandardMaterial({ color: 0x8ab8d0, transparent: true, opacity: 0.3, roughness: 0.1 }), add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(2.6, 0.5, 5.2), M(0x8a8e96, { metalness: 0.5 }), 0, 0.95, 0); add(new THREE.BoxGeometry(2.4, 1.6, 3.4), white, 0, 1.95, 0.6); add(new THREE.BoxGeometry(2.3, 1.3, 1.5), glass, 0, 2.1, -1.75); add(new THREE.BoxGeometry(2.2, 0.35, 0.4), M(0x3a3e46), 0, 1.55, -2.35); add(new THREE.BoxGeometry(0.6, 0.6, 0.6), M(0x3a5a8a), -0.45, 1.5, -1.3);
  for (const x of [-1.45, 1.45]) for (const z of [-1.8, 0, 1.8]) { const w = add(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20).rotateZ(Math.PI / 2), dark, x, 0.6, z); } add(new THREE.BoxGeometry(0.6, 0.3, 0.4), dark, 0.5, 1.45, -1.9); for (const [x, c] of [[-0.75, 0x153848], [-0.15, 0x1d4a30], [0.45, 0x153848]]) { const sc = add(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshBasicMaterial({ color: c }), x * 0.6 - 0.2, 1.76, -2.2); sc.rotation.x = -0.5; } return g; }
const lander = landerMesh(), rover = roverMesh(); SURF.scene.add(lander, rover);
const surfSun = new THREE.DirectionalLight(0xffa060, 2.5), surfAmb = new THREE.AmbientLight(0x404858, 0.25); SURF.scene.add(surfSun, surfAmb);
const ROV = { x: 8, z: 10, head: 0, v: 0 };

// the landing site: where the star stands at the chosen height (and, on the moons, the giant planet is up too). Returns the "up"
function landingUp(B, W) { const s = B.pos().negate().normalize(); let best = null, bs = 1e9; const p = W.planet ? W.planet.pos().sub(B.pos()).normalize() : null;
  for (let i = 0; i < 4000; i++) { const y = 1 - 2 * (i + 0.5) / 4000, r = Math.sqrt(1 - y * y), a = i * 2.39996, n = V3(r * Math.cos(a), y, r * Math.sin(a)), es = Math.asin(n.dot(s)) * 180 / Math.PI - W.sunEl, ep = p ? Math.asin(n.dot(p)) * 180 / Math.PI - 35 : 0, sc = es * es + ep * ep; if (sc < bs) { bs = sc; best = n; } } return best; }
function startLanding() { const B = parkedBody(); const W = B && WORLDS.get(B); if (!W) { say("Park at a landable world first (Betelgeuse e or c, or the moons b I and b II), then choose Land."); return; }
  SURF.W = W; SURF.B = B; SURF.x = 0; SURF.z = 0; const up = landingUp(B, W), s = B.pos().negate().normalize(), X = s.clone().sub(up.clone().multiplyScalar(s.dot(up))).normalize(), Z = new THREE.Vector3().crossVectors(X, up);
  const basis = new THREE.Matrix4().makeBasis(X, up, Z); SURF.qSky.setFromRotationMatrix(basis).invert(); surfSky.quaternion.copy(SURF.qSky);
  const sunLocal = s.clone().applyQuaternion(SURF.qSky); SURF.sunL.copy(sunLocal); terrU.sunL.value.copy(sunLocal); surfSun.position.copy(sunLocal).multiplyScalar(100);
  const dB = B.pos().length(), flux = L_B / dB ** 2, ang = Math.asin(R_B / (dB * 1.496e11 / 1.496e11)); sunBall.position.copy(sunLocal).multiplyScalar(6000); sunBall.scale.setScalar(6000 * Math.sin(Math.asin(R_B / dB))); sunGlow.position.copy(sunBall.position); sunGlow.scale.setScalar(sunBall.scale.x * 8); sunBall.userData.p0 = sunBall.position.clone(); sunGlow.userData.p0 = sunBall.position.clone(); airDome.userData.p0 = V3(0, 0, 0);
  const I = 0.9 * Math.pow(flux, 0.18); terrU.sunCol.value.setRGB(1.0 * I, 0.55 * I, 0.3 * I);
  surfSky.visible = !W.sky; if (W.sky) { airDome.visible = true; airDome.material.uniforms.hor.value.setRGB(...W.sky.horizon); airDome.material.uniforms.zen.value.setRGB(...W.sky.zenith); terrU.fogCol.value.setRGB(...W.sky.fog); terrU.fogD.value = W.sky.dens; terrU.amb.value.setRGB(0.3, 0.2, 0.14); terrU.sunCol.value.multiplyScalar(0.55); }
  else { airDome.visible = false; terrU.fogD.value = 0; terrU.amb.value.setRGB(0.06, 0.045, 0.035); }
  if (skyPlanet) { SURF.scene.remove(skyPlanet); skyPlanet = null; }
  if (W.planet) { const P = W.planet, rel = P.pos().sub(B.pos()), d = rel.length(), dir = rel.normalize().applyQuaternion(SURF.qSky); skyPlanet = new THREE.Mesh(P.mesh.geometry, P.mesh.material.clone()); skyPlanet.material.uniforms.L.value = sunLocal.clone(); skyPlanet.material.uniforms.I.value = 0.35 * Math.pow(L_B / P.pos().lengthSq(), 0.3);
    skyPlanet.position.copy(dir).multiplyScalar(7000); skyPlanet.userData.p0 = skyPlanet.position.clone(); skyPlanet.scale.setScalar(7000 * Math.sin(Math.asin(P.R / d))); SURF.scene.add(skyPlanet); }
  terrU.glowCol.value.setRGB(1.6, 0.45, 0.08); for (const m of TERR) m.userData.cx = 1e9;
  lander.position.set(0, groundY(0, 0), 0); ROV.x = 13; ROV.z = 16; ROV.head = 0.6; ROV.v = 0; SURF.inRover = !W.eva; SURF.x = W.eva ? 8 : ROV.x; SURF.z = W.eva ? 4 : ROV.z; SURF.vy = 0; SURF.y = groundY(SURF.x, SURF.z);
  SURF.desc = { t: 0, T: 45 }; MODE = "surface"; SURF.scene.add(rig); ringFade = 0; yaw = -Math.PI / 2; pitch = -0.5;
  say(`The lander undocks and drops out of orbit (an hour's descent, skipped). Final descent to ${W.name}: ${W.about}`); }
const parkedBody = () => TRAVEL.on ? null : BODIES.find(b => DESTS[destI].name.startsWith(b.name)) || null;

// ---------- the probes: into the young super-Jupiter or the brown dwarf ----------
// A model atmosphere: pressure falls by e every scale height H = kT/(mu m g); temperature rises with depth roughly as an adiabat
// (T = T1 (P / 1 bar)^0.19, at least the upper layer's temperature). Clouds condense where each substance's vapour meets its
// condensation curve: potassium chloride and sodium sulfide hazes high up, a deck of silicate (molten rock) droplets deeper, iron
// clouds deeper still. On the parachute the probe falls at its terminal speed, sqrt(2 m g / (rho Cd A)), slower as the gas thickens.
// It fails when the heat (about 2,600 K) overcomes it. Entry first, from a millionth of a bar: braking from 150 km/s as the gas
// thickens (the drag grows with the pressure), a glowing fireball, until the parachute opens at about 0.01 bar (heat shields this
// demanding are beyond any yet built).
const PROBE_T = new Map([[PB, { name: "Betelgeuse b", g: 117, T1: 1200, Ttop: 760, H: 37, v1: 520, layers: [[0.3, "a haze of potassium chloride and sodium sulfide", [0.42, 0.34, 0.28], 0.25], [7, "the silicate deck: droplets of molten rock", [0.62, 0.42, 0.26], 0.6], [40, "iron clouds", [0.85, 0.7, 0.55], 0.5]] }],
  [PD, { name: "the brown dwarf", g: 744, T1: 1800, Ttop: 1100, H: 9, v1: 900, layers: [[0.1, "a haze of salts", [0.4, 0.3, 0.25], 0.25], [2, "the silicate deck", [0.7, 0.45, 0.25], 0.6], [9, "iron clouds", [0.9, 0.72, 0.55], 0.5]] }]]);
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
  Object.assign(PROBE, { on: true, A, z: A.H * Math.log(1e6), v: 150000, t: 0, phase: "entry", ended: 0, nextPhoto: 0, passed: new Set() }); MODE = "probe"; PH.add(rig); yaw = -Math.PI / 2; pitch = -0.3; canopy.visible = false;
  CLOUDS.forEach(C => { const L = A.layers[C.k]; C.m.material.uniforms.col.value.setRGB(...L[2]); C.m.material.uniforms.a.value = L[3]; C.zL = -A.H * Math.log(L[0]) + (C.s - 1) * A.H * 0.15; });
  say(`The probe separates and falls toward ${A.name}. You are seeing through its camera. Entry at about 150 km/s: a fireball as it brakes in the thin upper gas, then the parachute. It runs in real time (] speeds it up); C takes a photo, E returns to the ship.`); photo("Entry: the top of the atmosphere"); }
// photographs: rendered from the probe's camera into a small image and kept for the gallery aboard the ship
const photoRT = new THREE.WebGLRenderTarget(320, 240), photoCam = new THREE.PerspectiveCamera(70, 4 / 3, 0.05, 30000);
function photo(caption) { try { photoCam.position.set(0, 1.6, 0); photoCam.rotation.set(-0.35, 0, 0); photoCam.updateMatrixWorld(); const prev = renderer.getRenderTarget(), xr = renderer.xr.enabled; renderer.xr.enabled = false; renderer.setRenderTarget(photoRT); renderer.clear(); renderer.render(PH, photoCam); const px = new Uint8Array(320 * 240 * 4); renderer.readRenderTargetPixels(photoRT, 0, 0, 320, 240, px); renderer.setRenderTarget(prev); renderer.xr.enabled = xr;
    const c = document.createElement("canvas"); c.width = 320; c.height = 240; const g = c.getContext("2d"), id = g.createImageData(320, 240); for (let y = 0; y < 240; y++) id.data.set(px.subarray((239 - y) * 1280, (240 - y) * 1280), y * 1280); g.putImageData(id, 0, 0); g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 214, 320, 26); g.fillStyle = "#fff"; g.font = "13px sans-serif"; g.fillText(caption.slice(0, 48), 6, 232);
    PROBE.photos.push({ c, caption }); drawGallery(); } catch (e) { } }

// ---------- one frame away from the ship ----------
const pHud = canvasTex(1024, 300), pHudMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.176), new THREE.MeshBasicMaterial({ map: pHud, transparent: true, depthTest: false, toneMapped: false })); pHudMesh.position.set(0, -0.3, -0.75); pHudMesh.rotation.x = -0.4; pHudMesh.renderOrder = 60; camera.add(pHudMesh); pHudMesh.visible = false;
function hudText(lines) { const g = pHud.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 300); g.fillStyle = "rgba(10,12,18,.8)"; g.beginPath(); g.roundRect(0, 0, 1024, 300, 20); g.fill(); lines.forEach((l, i) => { g.fillStyle = i ? "#e8f0ff" : "#ffc070"; g.font = (i ? "" : "bold ") + "30px sans-serif"; g.fillText(l, 22, 46 + i * 50, 980); }); pHud.needsUpdate = true; BAR.innerHTML = lines.join(" &nbsp;·&nbsp; "); }
function backToShip(text) { MODE = "ship"; scene.add(rig); pHudMesh.visible = false; ringFade = 1.6; RING.in = false; Object.assign(P, { x: -0.8, y: 0, z: 0 }); yaw = -Math.PI / 2; pitch = 0.35; say(text); }
function awaySelect() { }
let aFrame = 0;
function awayFrame(dt, vr) { aFrame++; dt = Math.max(0, dt); const simDt = dt * RATES[rateI][0];
  let mx = 0, my = 0, jump = false, act = false, snap = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turnA) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turnA = true; } else if (Math.abs(tx) < 0.3) prevB.turnA = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.aA) act = true; prevB.aA = bA; if (bB && !prevB.bA) jump = true; prevB.bA = bB; } } }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.Space) jump = true; }
  if (awayKeyE) { act = true; awayKeyE = false; }
  if (MODE === "surface") surfaceFrame(dt, vr, mx, my, jump, act); else probeFrame(dt, simDt, vr, act);
  if (!vr) camera.rotation.set(pitch, yaw, 0, "YXZ");
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") MSG.style.display = "none";
  renderer.render(MODE === "surface" ? SURF.scene : PH, camera); }
let awayKeyE = false, awayPhotoKey = false;
addEventListener("keydown", e => { if (MODE === "ship") return; if (e.code === "KeyE") awayKeyE = true; if (e.code === "KeyC" && MODE === "probe") photo(`At ${atm(PROBE.A, PROBE.z).P.toFixed(PROBE.z > 0 ? 3 : 1)} bar, ${Math.round(atm(PROBE.A, PROBE.z).T)} K`); if (e.code === "BracketRight" || e.code === "KeyT") setRate(rateI + 1); if (e.code === "BracketLeft") setRate(rateI - 1); if (e.code === "Backslash") setRate(0); });

function surfaceFrame(dt, vr, mx, my, jump, act) { const W = SURF.W;
  // the final descent: from 5 km, slowing to touch down beside where you will stand (a fade in from orbit at the start)
  if (SURF.desc) { const D = SURF.desc; D.t += dt; const f = Math.min(1, D.t / D.T), alt = 5000 * (1 - f) ** 2.2 + 3; rig.position.set(-6, groundY(0, 0) + alt, 4); rig.quaternion.identity(); rig.rotateY(vr ? vrYaw : 0); fadeM.opacity = Math.max(0, 1 - D.t / 2); lander.position.set(0, groundY(0, 0) + Math.max(0, alt - 3), 0);
    if (f >= 1) { SURF.desc = null; lander.position.y = groundY(0, 0); say(`Touchdown on ${W.name}. ${W.eva ? "Step out: WASD to walk (space or B to jump, in " + (W.g / 9.81).toFixed(2) + " g), E at the rover to drive it, E at the lander to go back up to the ship." : "You are in the rover's pressure hull: no suit could survive outside. Drive with W/S and A/D; E near the lander to go back up."}`); }
    updateTerrain(); return; }
  fadeM.opacity = Math.max(0, fadeM.opacity - dt);
  if (SURF.inRover) { const thr = -my, st = -mx; ROV.v = THREE.MathUtils.clamp(ROV.v + thr * 3 * dt - ROV.v * 0.3 * dt * (thr ? 0 : 1), -4, 12); ROV.head += st * dt * 0.6 * Math.min(1, Math.abs(ROV.v) / 3 + 0.2); ROV.x += -Math.sin(ROV.head) * ROV.v * dt; ROV.z += -Math.cos(ROV.head) * ROV.v * dt; SURF.x = ROV.x; SURF.z = ROV.z;
    if (act) { if (Math.hypot(ROV.x, ROV.z) < 16) { returnUp(); return; } if (W.eva) { SURF.inRover = false; SURF.x = ROV.x + 3 * Math.cos(ROV.head); SURF.z = ROV.z - 3 * Math.sin(ROV.head); say("Out of the rover. E beside it to get back in."); } else say("No suit could survive outside here: drive back to the lander (E beside it) to leave."); } }
  else { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = (keys.ShiftLeft ? 4 : 1.8) * dt; SURF.x += (f.x * -my + sd.x * mx) * sp; SURF.z += (f.z * -my + sd.z * mx) * sp;
    const gy = groundY(SURF.x, SURF.z); if (jump && SURF.y <= gy + 0.05) SURF.vy = Math.sqrt(2 * W.g * 0.5) * Math.sqrt(9.81 / W.g); SURF.vy -= W.g * dt; SURF.y = Math.max(gy, SURF.y + SURF.vy * dt); if (SURF.y <= gy) SURF.vy = 0;
    if (act) { if (Math.hypot(SURF.x - ROV.x, SURF.z - ROV.z) < 5) { SURF.inRover = true; say("In the rover: W/S drive, A/D steer (up to about 40 km/h). E to get out; E near the lander to go back up."); } else if (Math.hypot(SURF.x, SURF.z) < 6) { returnUp(); return; } else say("Walk to the rover or the lander (E beside it)."); } }
  // the rover sits on the ground, tilted to it; you ride in its cab
  { const gc = groundY(ROV.x, ROV.z), cs = Math.cos(ROV.head), sn = Math.sin(ROV.head), hf = groundY(ROV.x - sn * 2, ROV.z - cs * 2), hb = groundY(ROV.x + sn * 2, ROV.z + cs * 2), hl = groundY(ROV.x - cs * 1.3, ROV.z + sn * 1.3), hr = groundY(ROV.x + cs * 1.3, ROV.z - sn * 1.3);
    rover.position.set(ROV.x, gc, ROV.z); rover.rotation.set(Math.atan2(hf - hb, 4), ROV.head, Math.atan2(hl - hr, 2.6), "YXZ"); }
  if (SURF.inRover) { rig.position.copy(rover.localToWorld(V3(-0.45, 1.45, -1.85))); rig.quaternion.copy(rover.quaternion); }
  else { if (SURF.y === undefined || isNaN(SURF.y)) SURF.y = groundY(SURF.x, SURF.z); rig.position.set(SURF.x, SURF.y, SURF.z); rig.quaternion.identity(); }
  rig.rotateY(vr ? vrYaw : 0); if (!vr) camera.position.set(0, SURF.inRover ? 0.55 : 1.65, 0);
  updateTerrain();
  const dl = Math.hypot(SURF.x, SURF.z); if (aFrame % 10 === 0) hudText([`${W.name}`, `gravity ${(W.g / 9.81).toFixed(2)} g · ${SURF.inRover ? "in the rover, " + (Math.abs(ROV.v) * 3.6).toFixed(0) + " km/h" : "on foot"} · lander ${dl < 1000 ? Math.round(dl) + " m" : (dl / 1000).toFixed(1) + " km"} away`, `${W.eva && !SURF.inRover ? "WASD walk, space jump, E rover or lander" : "W/S drive, A/D steer, E at the lander to go up"}`]); pHudMesh.visible = vr; }
function updateTerrain() { for (const m of TERR) { const lim = m.userData.size * 0.08; if (Math.hypot(SURF.x - m.userData.cx, SURF.z - m.userData.cz) > lim) { fillTerrain(m, SURF.x, SURF.z); if (m === TERR[0]) fillRocks(); } } surfSky.position.copy(rig.position); for (const o of [sunBall, sunGlow, airDome, skyPlanet]) if (o && o.userData.p0) o.position.copy(o.userData.p0).add(rig.position); }
function returnUp() { backToShip(`The lander lifts off from ${SURF.W.name} and climbs back to the ship (about an hour, skipped). You are back in the observation sphere.`); }

function probeFrame(dt, simDt, vr, act) { const A = PROBE.A; if (!PROBE.on) return;
  if (act) { backToShip("You leave the probe's camera; it falls on without you. Its photos are in the gallery on the bridge."); PROBE.on = false; return; }
  if (PROBE.ended) { PROBE.ended -= dt; if (PROBE.ended <= 0) { PROBE.on = false; backToShip(`Signal lost: the probe has been crushed and melted. ${PROBE.photos.length} photographs are in the gallery on the bridge and in the observation sphere.`); } return; }
  // the fall, in small steps so that sped-up time stays accurate
  { const nSub = Math.min(600, Math.ceil(simDt / 1.0)); for (let k = 0; k < nSub; k++) { const h = simDt / nSub; PROBE.t += h; const a = atm(A, PROBE.z);
      if (PROBE.phase === "entry") { PROBE.v = A.v1 + (150000 - A.v1) * Math.exp(-a.P / 0.002); if (a.P > 0.012) { PROBE.phase = "chute"; canopy.visible = true; say("Parachute out. Falling through the upper atmosphere: look down at the glow of the deep, hot layers; look up at the parachute."); photo("Parachute deployed"); } }
      else PROBE.v = A.v1 * Math.sqrt((a.T / A.T1) / a.P);
      PROBE.z -= PROBE.v * h / 1000; if (a.T > 2600) break; } }
  const { P, T } = atm(A, PROBE.z);
  for (const C of CLOUDS) { C.m.position.y = (C.zL - PROBE.z) * 1000; C.m.visible = Math.abs(C.m.position.y) < 8000; C.m.material.uniforms.t.value += dt; const Tl = atm(A, C.zL).T, gc = bbRGB(Tl).map(v => v * Math.min(2, (Tl / 1700) ** 4)); C.m.material.uniforms.glow.value.setRGB(gc[0] * 0.5, gc[1] * 0.5, gc[2] * 0.5);
    if (C.s === 1 && PROBE.z < C.zL && !PROBE.passed.has(C.k)) { PROBE.passed.add(C.k); say(`Through ${A.layers[C.k][1]}, at about ${A.layers[C.k][0]} bar and ${Math.round(Tl)} K.`); photo(A.layers[C.k][1][0].toUpperCase() + A.layers[C.k][1].slice(1)); } }
  // the sky: sunlight fades with depth; the deep gas glows by its heat (a blackbody colour, brighter as the fourth power of T)
  const Tdeep = atm(A, PROBE.z - A.H * 1.5).T, gd = bbRGB(Tdeep).map(v => v * Math.min(3, (Tdeep / 1600) ** 4) * 0.6), sunV = Math.exp(-P / 0.4), haze = Math.min(1, P / 0.02);
  pSky.material.uniforms.up.value.setRGB(0.25 * haze * (0.3 + sunV) + gd[0] * 0.25, 0.17 * haze * (0.3 + sunV) + gd[1] * 0.25, 0.12 * haze * (0.3 + sunV) + gd[2] * 0.25); pSky.material.uniforms.down.value.setRGB(gd[0] + 0.1 * haze, gd[1] + 0.07 * haze, gd[2] + 0.05 * haze); pSky.material.uniforms.sunV.value = sunV;
  pStars.visible = P < 0.01; pStars.material.opacity = 1; pLight.intensity = 0.4 + 1.5 * Math.min(1, (T / 1800) ** 4);
  if (PROBE.phase === "entry") { const k = Math.min(1, P / 2e-5) * Math.max(0, (PROBE.v - A.v1) / (150000 - A.v1)), dn = pSky.material.uniforms.down.value; dn.setRGB(dn.r + (2.5 - dn.r) * k, dn.g + (1.2 - dn.g) * k, dn.b + (0.5 - dn.b) * k); if (k > 0.3) pStars.visible = false; }
  { const sp = streaks.geometry.attributes.position, up = PROBE.v * dt * (PROBE.phase === "entry" ? 0.002 : 0.05); for (let i = 0; i < 600; i++) { let y = sp.getY(i) + up; if (y > 30) y -= 60; sp.setY(i, y); } sp.needsUpdate = true; streaks.material.color.setRGB(...(PROBE.phase === "entry" ? [1, 0.8, 0.5] : [0.7, 0.55, 0.4])); }
  rig.position.set(0, 0, 0); rig.quaternion.identity(); rig.rotateY(vr ? vrYaw : 0); if (!vr) camera.position.set(0, 1.6, 0); pHudMesh.visible = vr;
  if (PROBE.t > PROBE.nextPhoto && PROBE.phase === "chute") { PROBE.nextPhoto = PROBE.t + 300; if (PROBE.t > 10) photo(`${P.toFixed(P < 1 ? 2 : 0)} bar, ${Math.round(T)} K`); }
  if (aFrame % 6 === 0) hudText([`PROBE into ${A.name}: ${PROBE.phase === "entry" ? "entry fireball" : "on the parachute"}`, `pressure ${P < 0.01 ? (P * 1000).toFixed(1) + " mbar" : P.toFixed(P < 10 ? 2 : 0) + " bar"} · temperature ${Math.round(T)} K (${Math.round(T - 273)} °C) · falling ${PROBE.v > 2000 ? (PROBE.v / 1000).toFixed(1) + " km/s" : Math.round(PROBE.v) + " m/s"}`, `${Math.round(PROBE.t / 60)} min since entry · ${PROBE.photos.length} photos · C photo · E back to the ship · ] faster time (${RATES[rateI][1]})`]);
  if (T > 2600) { PROBE.ended = 4; photo("Last image before the signal was lost"); say(`At ${P.toFixed(0)} bar and ${Math.round(T)} K, the probe's electronics fail and its hull gives way.`); } }

// ---------- aboard: the missions screen, and the gallery of probe photographs ----------
const misTex = canvasTex(640, 420); const MISSIONS = [];
for (const [x, y, z, ry] of [[2.75, 1.2, 0.75, Math.atan2(-2.75, -0.75)], [MOD.x + 7.2, 4.9, -1.6, -Math.PI / 2 + 0.25]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.525), new THREE.MeshBasicMaterial({ map: misTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.2, ry, 0, "YXZ"); ship.add(m); MISSIONS.push(m); }
function missionRows() { const B = parkedBody(), rows = []; if (B && WORLDS.has(B)) rows.push([`Land on ${WORLDS.get(B).name} (key L)`, startLanding]); else rows.push(["Land: park at e, c, b I or b II first", null]); if (B && PROBE_T.has(B)) rows.push([`Send a probe into ${PROBE_T.get(B).name} (key P)`, launchProbe]); else rows.push(["Probe: park at Betelgeuse b or the brown dwarf first", null]); rows.push([`Probe photographs: ${PROBE.photos.length} (in the gallery)`, null]); return rows; }
function drawMissions() { const g = misTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 640, 420); g.fillStyle = "#ffd070"; g.font = "bold 34px sans-serif"; g.fillText("MISSIONS", 24, 50); missionRows().forEach(([t, f], k) => { const y = 74 + k * 100; g.fillStyle = f ? "#2a3a22" : "#181c26"; g.fillRect(16, y, 608, 88); g.fillStyle = f ? "#e8ffd8" : "#8a92a2"; g.font = "bold 25px sans-serif"; g.fillText(t, 30, y + 52, 584); }); misTex.needsUpdate = true; }
function missionHit(uv) { const k = Math.floor(((1 - uv.y) * 420 - 74) / 100), r = missionRows()[k]; if (r && r[1]) r[1](); }
const galTex = canvasTex(1024, 768); const GALS = [];
for (const [x, y, z, ry] of [[MOD.x + 5.5, 6.0, -5.5, -Math.PI * 0.75], [-2.6, 2.3, 1.9, Math.atan2(2.6, -1.9)]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.05), new THREE.MeshBasicMaterial({ map: galTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.1, ry, 0, "YXZ"); ship.add(m); GALS.push(m); }
function drawGallery() { const g = galTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 1024, 768); g.fillStyle = "#9ad0ff"; g.font = "bold 34px sans-serif"; g.fillText(`PROBE PHOTOGRAPHS (${PROBE.photos.length})`, 24, 46);
  PROBE.photos.slice(-9).forEach((p, i) => g.drawImage(p.c, 24 + (i % 3) * 330, 66 + Math.floor(i / 3) * 232, 312, 222)); if (!PROBE.photos.length) { g.fillStyle = "#8a92a2"; g.font = "26px sans-serif"; g.fillText("No photographs yet: send a probe into the giant planet or the brown dwarf.", 24, 120); } galTex.needsUpdate = true; }
drawGallery(); setInterval(() => { if (MODE === "ship") drawMissions(); }, 500); drawMissions();

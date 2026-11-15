// io.js -- on Io, Jupiter's volcanic moon, on the eastern shore of Loki Patera (13 N, 306 W), the largest volcanic depression on Io:
// a lake of lava 202 km across. Built into io.html by build.py.
//
// What it rests on. Loki Patera: 202 km across; a lava lake with a glassy black crust (5-6 m thick by the end of a cycle) that grows dense,
// founders and overturns in a wave sweeping across the lake at 1-3 km a day, every 400-600 days, with at least 20 small islands about 3 km
// wide (Galileo, Juno, ground-based telescopes). Io: 3,643 km across, gravity 1.796 m/s2 (0.18 g), almost no air (a trace of sulfur dioxide,
// a billionth of Earth's pressure), so the sky is black and full of stars by day; surface 90-130 K, but lava at 1,300-1,600 K; colours from
// sulfur (yellows, oranges, reds), sulfur-dioxide frost (white) and dark silicate lava. Jupiter: 421,700 km away, 19.5 degrees across (40
// times the Moon from Earth); Io keeps one face to it, so from Loki's eastern shore (56 degrees from the point under Jupiter) it hangs fixed, 35 degrees up over the lake,
// waxing and waning, rotating every 9.9 hours, and once each Io day (42.5 hours) it hides the Sun for about two hours. Europa, Ganymede and
// Callisto move across the sky in the 1:2:4 dance of their orbits; tiny Amalthea races by. Radiation: Io lies deep in Jupiter's
// magnetosphere, about 36 Sv a day at the surface, a fatal dose in three hours: no person will ever stand here. The lander is a robot,
// imagined (no Io lander is planned). The ground between what spacecraft resolved is generated, in keeping with their images.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, sstep = (x, a, b) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, lerpN = THREE.MathUtils.lerp, DEG = Math.PI / 180;
const R_IO = 1821600, G_IO = 1.796;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 5) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * vn(x, z); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }
function ridged(x, z, n = 4) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * (1 - Math.abs(2 * vn(x, z) - 1)); w += a; x = x * 2.1 + 3.7; z = z * 2.1 + 1.9; a *= 0.5; } return s / w; }

// ---------- the ground, in metres: x east, z south, from a point just outside the patera's eastern rim ----------
// The patera's centre lies 101 km to the west, so Jupiter hangs over the lake. Its floor, the lava lake's crust, lies 1 km below the plains behind a cliff: Io's paterae are
// typically 1-2 km deep with steep walls (Radebaugh et al. 2001); Loki's own depth has not been measured. Small islands (~3 km wide, ~10 km apart)
// stand out of it. The plains are smooth, as Io's mostly are, with lobes of old lava flows; an isolated mountain block rises 70 km to the
// southeast (Io's mountains stand alone like this, up to 17 km high; this one is generated, not a mapped peak).
const PC = { x: -101000, z: 300 }, PR = 101000, FLOOR = -1000, MTN = { x: 45000, z: 54000 };
function pateraD(x, z) { const dx = x - PC.x, dz = z - PC.z, a = Math.atan2(dz, dx); return Math.hypot(dx, dz) - (PR + 3500 * (fbm(a * 3 + 5, 1.3, 4) - 0.5) + 900 * (fbm(a * 25, 2.7, 3) - 0.5)); }
function land(x, z) { const pd = pateraD(x, z);
  let h = 28 * (fbm(x / 6000, z / 6000, 4) - 0.5) + 4 * (fbm(x / 500, z / 500, 3) - 0.5) + 0.35 * (fbm(x / 12, z / 12, 2) - 0.5);
  const flow = sstep(fbm(x / 2600 + 9, z / 2600, 4), 0.56, 0.6); h += 9 * flow;
  const md = Math.hypot(x - MTN.x, z - MTN.z); if (md < 40000) h += 5200 * Math.exp(-((md / 15000) ** 2)) * (0.55 + 0.45 * ridged(x / 6000, z / 6000, 5)) * sstep(md, 40000, 25000);
  if (pd < 400) { const t = sstep(pd, 250, -60); h = lerpN(h, FLOOR + 0.4 * (fbm(x / 40, z / 40, 2) - 0.5), t); }
  if (pd < -2000) { const ii = Math.floor(x / 10000), jj = Math.floor(z / 10000), cx = (ii + 0.3 + 0.4 * hash(ii, jj)) * 10000, cz = (jj + 0.3 + 0.4 * hash(jj, ii)) * 10000, d = Math.hypot(x - cx, z - cz); if (hash(ii * 7, jj * 3) < 0.55 && d < 1700) h = Math.max(h, FLOOR + 40 * sstep(d, 1700, 1300) + 6 * fbm(x / 200, z / 200, 3)); }
  return h; }
// colours: pale yellow sulfur plains, white sulfur-dioxide frost, orange-red sulfur deposits, greenish-grey near the patera, black glassy lava
function groundColor(h, slope, x, z, out) { const pd = pateraD(x, z), n = fbm(x / 9, z / 9, 3), m = fbm(x / 1800 + 4, z / 1800, 4), m2 = fbm(x / 400 + 9, z / 400, 3); let r, g, b;
  r = 0.74 + 0.06 * n; g = 0.66 + 0.05 * n; b = 0.4 + 0.04 * n;
  const frost = sstep(m2, 0.6, 0.72); r = lerpN(r, 0.86, frost); g = lerpN(g, 0.85, frost); b = lerpN(b, 0.8, frost);
  const red = sstep(m, 0.58, 0.68); r = lerpN(r, 0.62, red); g = lerpN(g, 0.34, red); b = lerpN(b, 0.2, red);
  const near = sstep(pd, 6000, 300); r = lerpN(r, 0.44, near * 0.7); g = lerpN(g, 0.45, near * 0.7); b = lerpN(b, 0.32, near * 0.7);
  if (h > 40 && Math.hypot(x - MTN.x, z - MTN.z) < 40000) { const t = sstep(slope, 0.2, 0.6); r = lerpN(r, 0.5, t); g = lerpN(g, 0.42, t); b = lerpN(b, 0.3, t); }
  if (pd < 300) { const t = sstep(pd, 300, -100), isl = h > FLOOR + 3; r = lerpN(r, isl ? 0.36 : 0.05, t); g = lerpN(g, isl ? 0.34 : 0.048, t); b = lerpN(b, isl ? 0.27 : 0.045, t); }
  out[0] = r; out[1] = g; out[2] = b; }

// ---------- the sky: Io's orbit, Jupiter and its moons, the Sun, the stars ----------
// Circular orbits in Jupiter's equatorial plane, with the moons' real periods and distances and the Laplace resonance (Io - 3 Europa +
// 2 Ganymede = 180 degrees). Io keeps one face to Jupiter: in Io's own frame x points at Jupiter, z north. Loki's centre is at 13 N, 51 E (309 W); its eastern shore, here, 3.3 degrees further east.
const MOONS = [["Io", 421700, 1.769138, 0, 1821.6], ["Europa", 671034, 3.551181, 100, 1560.8], ["Ganymede", 1070412, 7.154553, 240, 2634.1], ["Callisto", 1882709, 16.689018, 30, 2410.3], ["Amalthea", 181366, 0.498179, 200, 83]];
const R_J = 71492, LAT = 13 * DEG, LON = 54.3 * DEG, UP = V3(Math.cos(LAT) * Math.cos(LON), Math.cos(LAT) * Math.sin(LON), Math.sin(LAT)), EAST = V3(-Math.sin(LON), Math.cos(LON), 0), NORTH = new THREE.Vector3().crossVectors(UP, EAST);
let tDays = 0, sunAng = 0;
const moonPos = (m, td) => { const a = (m[3] + 360 * td / m[2]) * DEG; return V3(m[1] * Math.cos(a), m[1] * Math.sin(a), 0); };
function toLocal(dJ, td) { const a = (MOONS[0][3] + 360 * td / MOONS[0][2]) * DEG, x = V3(-Math.cos(a), -Math.sin(a), 0), y = V3(Math.sin(a), -Math.cos(a), 0), z = V3(0, 0, 1), b = V3(dJ.dot(x), dJ.dot(y), dJ.dot(z)); return V3(b.dot(EAST), b.dot(UP), -b.dot(NORTH)); }
const sunJ = () => V3(Math.cos(sunAng), Math.sin(sunAng), 0.05).normalize();
// start an hour or two into the Io morning, the Sun about 35 degrees up in the east
{ let best = 0, bs = 1e9; for (let k = 0; k < 720; k++) { sunAng = k / 720 * 2 * Math.PI; const s = toLocal(sunJ(), 0), el = Math.asin(s.y) / DEG, sc = (el - 35) ** 2 + (s.x > 0 ? 0 : 400); if (sc < bs) { bs = sc; best = sunAng; } } sunAng = best; }
const SKY = new THREE.Group(); scene.add(SKY); const SKYR = 300000;
{ const N = 6000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 2 * Math.PI, r = Math.sqrt(1 - u * u), mag = Math.pow(Math.random(), 3);
    pos.set([r * Math.cos(a) * SKYR, u * SKYR, r * Math.sin(a) * SKYR], i * 3); const c = 0.15 + 0.85 * mag, t = Math.random(); col.set([c * (0.85 + 0.15 * t), c * 0.92, c * (1.05 - 0.15 * t)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  SKY.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }))); }
// Jupiter: bands and the Great Red Spot drawn on a canvas; lit by the Sun; rotating every 9.93 hours
const jupT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d"); const bands = [[0, "#c8b8a0"], [0.08, "#a89070"], [0.16, "#e0d6c4"], [0.24, "#b0845a"], [0.3, "#e8dcc8"], [0.38, "#c89a70"], [0.44, "#f0e6d4"], [0.5, "#e8d8c0"], [0.56, "#f0e6d4"], [0.62, "#a8724a"], [0.7, "#e0d0b8"], [0.78, "#b89474"], [0.86, "#d8ccb8"], [0.94, "#a89a88"], [1, "#988a7a"]];
  const gr = g.createLinearGradient(0, 0, 0, 512); bands.forEach(([p, c2]) => gr.addColorStop(p, c2)); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 2500; k++) { const y = Math.random() * 512, x = Math.random() * 1024; g.fillStyle = `rgba(${120 + Math.random() * 100},${90 + Math.random() * 80},${60 + Math.random() * 60},0.12)`; const w = 30 + Math.random() * 90, h = 2 + Math.random() * 3; g.fillRect(x, y, w, h); g.fillRect(x - 1024, y, w, h); }
  g.fillStyle = "#b8604a"; g.beginPath(); g.ellipse(300, 340, 46, 22, 0, 0, 7); g.fill(); g.fillStyle = "#d88a6a"; g.beginPath(); g.ellipse(300, 340, 30, 13, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })();
const bodyMat = (map, col, glow = 0) => new THREE.ShaderMaterial({ uniforms: { map: { value: map }, col: { value: new THREE.Color(col) }, sun: { value: V3(0, 1, 0) }, off: { value: 0 }, glow: { value: glow } }, fog: false,
  vertexShader: "varying vec3 vN; varying vec2 vUv; void main(){ vN = normalize(mat3(modelMatrix) * normal); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D map; uniform vec3 col, sun; uniform float off, glow; varying vec3 vN; varying vec2 vUv; void main(){ vec3 c = col; ${map ? "c *= texture2D(map, vec2(vUv.x + off, vUv.y)).rgb;" : ""} float d = max(dot(normalize(vN), sun), 0.0); gl_FragColor = vec4(c * (d * 1.15 + glow), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` });
const JUP = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), bodyMat(jupT, 0xffffff, 0.004)); SKY.add(JUP);
const MOONM = MOONS.slice(1).map(m => { const me = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), bodyMat(null, { Europa: 0xe8e0d0, Ganymede: 0xa89a88, Callisto: 0x6a6258, Amalthea: 0x9a5a3a }[m[0]])); SKY.add(me); return me; });
const SUN = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })), SUNG = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 2, 64, 64, 64); r.addColorStop(0, "rgba(255,255,240,1)"); r.addColorStop(0.15, "rgba(255,250,220,0.5)"); r.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); SKY.add(SUN, SUNG);
const sunL = new THREE.DirectionalLight(0xfff6ea, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048); Object.assign(sunL.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 300 }); sunL.shadow.bias = -0.0004; scene.add(sunL, sunL.target);
const jupL = new THREE.DirectionalLight(0xffe0c0, 0.0), ambL = new THREE.HemisphereLight(0x101418, 0x4a4030, 0.12); scene.add(jupL, ambL);
let eclipse = 0, jupPhase = 0;
function updateSky() { const td = tDays, I = moonPos(MOONS[0], td), S = sunJ(), sL = toLocal(S, td), jL = toLocal(I.clone().negate().normalize(), td), jd = I.length();
  JUP.position.copy(jL).multiplyScalar(SKYR * 0.6); JUP.scale.set(1, 0.935, 1).multiplyScalar(SKYR * 0.6 * R_J / jd); JUP.quaternion.setFromUnitVectors(V3(0, 1, 0), toLocal(V3(0, 0, 1), td));
  JUP.material.uniforms.off.value = (td * 24 / 9.925) % 1; const sunLocal = sL.clone(); JUP.material.uniforms.sun.value.copy(sunLocal);
  MOONS.slice(1).forEach((m, k) => { const d = moonPos(m, td).sub(I), dist = d.length(), me = MOONM[k]; const far = dist > jd, sr = SKYR * (far ? 0.7 : 0.5); me.position.copy(toLocal(d.normalize(), td)).multiplyScalar(sr); me.scale.setScalar(sr * m[4] / dist); me.userData.hidden = far && me.position.angleTo(jL) < Math.asin(R_J / jd); me.material.uniforms.sun.value.copy(sunLocal); me.userData.dist = dist; me.userData.dir = toLocal(moonPos(m, td).sub(I).normalize(), td); });
  // the Sun hides behind Jupiter once an Io day (about 2.2 hours): Io's shadow side faces the Sun then
  const sep = Math.acos(clampN(sL.dot(jL), -1, 1)), jr = Math.asin(R_J / jd); eclipse = clampN((jr + 0.001 - sep) / 0.002 + 0.5, 0, 1);
  SUN.position.copy(sL).multiplyScalar(SKYR * 0.9); SUN.scale.setScalar(SKYR * 0.9 * 0.00093); SUNG.position.copy(SUN.position); SUNG.scale.setScalar(SKYR * 0.9 * 0.02); SUN.visible = SUNG.visible = eclipse < 0.99;
  const up = clampN(sL.y * 8 + 0.3, 0, 1); sunL.intensity = 3.0 * (1 - eclipse) * up; jupPhase = (1 + jL.clone().negate().dot(sL)) / 2; jupL.position.copy(jL).multiplyScalar(100); jupL.intensity = 0.05 * jupPhase * clampN(jL.y * 5, 0, 1);
  return { sL, jL }; }

// ---------- the ground: nested grids following you, the surface curving away (Io is small: from eye height the horizon is 2.5 km off) ----------
const grainT = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#c0c0c0"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 8000; k++) { const v = 140 + Math.random() * 115; g.fillStyle = `rgba(${v},${v},${v},0.4)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const groundMat = new THREE.MeshStandardMaterial({ map: grainT, vertexColors: true, roughness: 0.92 });
const lavaU = { t: { value: 0 }, fa: { value: 0.15 }, org: { value: new THREE.Vector2() } };
groundMat.onBeforeCompile = sh => { sh.uniforms.t = lavaU.t; sh.uniforms.fa = lavaU.fa; sh.uniforms.org = lavaU.org; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float lava; varying float vLava; varying vec3 vWP;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvLava = lava; vWP = (modelMatrix * vec4(position, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float t, fa; uniform vec2 org; varying float vLava; varying vec3 vWP;\nfloat hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }\nfloat vno(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }")
    .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif (vLava > 0.5) { vec2 p = vWP.xz + org, q = p - vec2(" + PC.x.toFixed(1) + ", " + PC.z.toFixed(1) + "); float r = length(q), s = (atan(q.y, q.x) - fa) * r, c1 = abs(vno(p / 9.0) - 0.5), c2 = abs(vno(p / 31.0 + 7.0) - 0.5), near = smoothstep(2500.0, 400.0, length(vWP - cameraPosition)), crack = smoothstep(0.035, 0.0, c1) * 0.5 + smoothstep(0.02, 0.0, c2), fresh = s > 0.0 ? exp(-s / 3000.0) : 0.0, front = smoothstep(70.0, 0.0, abs(s + 50.0 * (vno(p / 300.0) - 0.5)));\n totalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * (mix(0.012 + 0.12 * fresh, crack * (0.06 + 0.7 * fresh), near) + front * 3.0) * (0.9 + 0.1 * sin(t * 0.7 + p.x * 0.05)); roughnessFactor = 0.18; }"); };
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, x0: 0, z0: 0 };
function grid(size, n, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); g.setAttribute("lava", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(400, 160, 0), grid(4000, 150, 1.5), grid(30000, 120, 12), grid(240000, 100, 90)] : [grid(500, 250, 0), grid(4000, 200, 1.5), grid(30000, 160, 12), grid(240000, 140, 90)]; for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, lv = m.geometry.attributes.lava, uv = m.geometry.attributes.uv, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    let y = H[i] - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_IO) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 60; }
    p.setY(i, y); groundColor(H[i], slope, x, z, c3); col.setXYZ(i, c3[0], c3[1], c3[2]); lv.setX(i, H[i] < FLOOR + 1.5 && pateraD(x, z) < 0 ? 1 : 0); uv.setXY(i, ((x % 4000) + 4000) / 2.5, ((z % 4000) + 4000) / 2.5); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = lv.needsUpdate = uv.needsUpdate = true; m.geometry.computeVertexNormals(); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * 0.06) fillGrid(m); }
// stones and lumps: sparse, Io's plains are mostly smooth and fine-grained (frost, sulfur, ash)
const ROCK = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.75 + 0.45 * vn(p.getX(i) * 2 + 5, p.getY(i) * 2 + p.getZ(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); } g.computeVertexNormals(); return g; })(), new THREE.MeshStandardMaterial({ roughness: 0.85 }), 1500);
ROCK.frustumCulled = false; ROCK.castShadow = true; ROCK.receiveShadow = true; scene.add(ROCK); let rockC = [1e12, 1e12];
function fillRocks() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let k = 0; const S = 1.6, ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S); rockC = [ME.x, ME.z];
  for (let i = ci - 30; i <= ci + 30 && k < 1500; i++) for (let j = cj - 30; j <= cj + 30 && k < 1500; j++) { const r = hash(i * 3 + 1, j * 7 + 2), x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S; if (r > 0.12 || pateraD(x, z) < 100) continue; const h = land(x, z);
    const sz = 0.03 + 0.25 * Math.pow(hash(i + 9, j + 3), 3); q.setFromEuler(new THREE.Euler(hash(i, 1) * 3, hash(j, 2) * 6, 0)); m4.compose(V3(x - ME.x0, h - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_IO) + sz * 0.15, z - ME.z0), q, V3(sz, sz, sz)); ROCK.setMatrixAt(k, m4);
    const v = hash(i + 4, j + 8); col.setRGB(0.42 + 0.2 * v, 0.38 + 0.16 * v, 0.28 + 0.1 * v); ROCK.setColorAt(k, col); k++; }
  ROCK.count = k; ROCK.instanceMatrix.needsUpdate = true; if (ROCK.instanceColor) ROCK.instanceColor.needsUpdate = true; }

// ---------- the lander: a robot, imagined ----------
// No Io lander is planned. One would have to be a robot: Galileo's electronics were damaged on every pass near Io. Its electronics sit in a
// thick-walled vault; its power is nuclear (a radioisotope generator, its fins glowing faintly warm); a camera mast, a seismometer set out on
// the ground, a sampling arm. It would last weeks, not years.
const LANDER = new THREE.Group(); scene.add(LANDER); const LP = { x: 16, z: 12 };
{ const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o }), add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; LANDER.add(m); return m; };
  const gold = M(0xd8b050, { metalness: 0.25, roughness: 0.35 }), metal = M(0xa8aeb4, { metalness: 0.2, roughness: 0.4 }), dark = M(0x2a2a2e), white = M(0xe8e6e0);
  add(new THREE.CylinderGeometry(1.4, 1.6, 0.9, 6), gold, 0, 1.35, 0); add(new THREE.BoxGeometry(1.1, 0.8, 1.1), metal, 0, 2.2, 0);
  for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; add(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), metal, Math.cos(a) * 1.6, 0.75, Math.sin(a) * 1.6, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); add(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 12), metal, Math.cos(a) * 2.0, 0.04, Math.sin(a) * 2.0); }
  add(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), metal, 0.4, 3.4, 0); add(new THREE.BoxGeometry(0.3, 0.2, 0.2), white, 0.4, 4.3, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10).rotateX(Math.PI / 2), dark, 0.4, 4.3, 0.12);
  add(new THREE.CylinderGeometry(0.18, 0.18, 0.8, 10), dark, -0.9, 2.0, -0.6, 0, 0, 0.5); for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.02, 0.6, 0.35), M(0x3a2a20, { emissive: 0x401000 }), -0.9 + Math.cos(k) * 0.22, 2.0, -0.6 + Math.sin(k) * 0.22, 0, k, 0.5);
  add(new THREE.BoxGeometry(0.06, 0.06, 1.6), metal, 1.2, 1.4, 0.8, 0, 0.6, -0.4); add(new THREE.BoxGeometry(0.2, 0.15, 0.25), metal, 1.9, 1.0, 1.4);
  add(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), white, 4, 0, 3); }

// ---------- you: no air, 0.18 g, and the radiation ----------
const keys = {}, prevB = {}; let yaw = Math.PI * 0.5, pitch = 0.05, vrYaw = yaw, started = false, seated = false, hud = true, msgT = 0, msgAge = 0, walked = 0, dose = 0, rateI = 0, factI = -1, tagsOn = true;
const RATES = [[1, "real time"], [60, "a minute a second"], [600, "ten minutes a second"], [3600, "an hour a second"]];
{ let x = 8000; while (pateraD(x, 0) > 252) x -= 1; ME.x = x + 3; ME.z = 0; } ME.y = land(ME.x, ME.z); ME.x0 = ME.x; ME.z0 = ME.z; LP.x += ME.x; LP.z += ME.z;
const FACTS = [
  "<b>Loki Patera</b>, the largest volcanic depression on Io, 202 km across: a lake of lava. Its crust is glassy and black; as it cools it grows denser than the molten rock beneath, founders and sinks, and every 400-600 days a wave of overturning crust sweeps around the lake at 1-3 km a day, the fresh lava glowing at its front. At least 20 small islands, about 3 km wide, stand out of it. At its most active Loki gives off a tenth of all Io's heat.",
  "<b>Jupiter</b> fills 19.5 degrees of the sky, 40 times the width of the Moon from Earth, 421,700 km away. Io keeps one face toward it, so from here it never moves: it hangs 35 degrees up over the lake, waxing and waning over Io's 42.5-hour day, its clouds turning past every 9.9 hours (watch the Great Red Spot). Once each Io day it hides the Sun for about two hours: night falls in the middle of the day. T speeds up time.",
  "<b>The moons</b>: Europa, Ganymede and Callisto move across the sky. Europa, when nearest, looks bigger than our Moon does from Earth. Io, Europa and Ganymede are locked in step: in the time Ganymede goes round once, Europa goes twice and Io four times, and their tugs on one another keep Io's orbit slightly oval, so Jupiter's tides knead it and melt its insides: that is why Io is the most volcanic world in the solar system.",
  "<b>No air, black sky</b>: Io's atmosphere is a wisp of sulfur dioxide a billionth of Earth's pressure, so the sky is black by day and the stars are out (your eyes, dazzled by the sunlit ground, would barely see them). Shadows are knife-sharp. Sunlight here is a 27th of Earth's.",
  "<b>Radiation</b>: Io orbits inside Jupiter's magnetic field, where sulfur and oxygen from Io's own volcanoes are whirled up to near the speed of light. The surface gets about 36 Sv a day: a fatal dose in about three hours. No person will ever stand here; this is a visit no one could make. Watch the dose in the readout.",
  "<b>The colours</b> are sulfur in its many forms, yellow, orange, red, with white sulfur-dioxide frost, and the black of fresh silicate lava. The ground is cold, 90 to 130 K, but the lava in Loki's lake is 1,300 K or more, and the hottest Io lavas reach 1,600 K, hotter than any erupting on Earth today.",
  "<b>Gravity</b> is 0.18 g, a little more than the Moon's. Jump (space, or B in VR) and you rise about 1.9 m, in the air for three seconds; with no air there is nothing to slow you.",
  "<b>The lander</b> is imagined: no Io lander is planned. It would have to be a robot, its electronics in a thick-walled vault, powered by a nuclear generator, lasting weeks before the radiation wore it out. Missions to Io so far have flown by: Voyager, Galileo, New Horizons, Juno; NASA's proposed Io Volcano Observer would make many close passes."];
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(20,16,8,.86);color:#f6ecd0;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(20,16,8,.72);color:#f6ecd0;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(20,16,8,0.9)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f6ecd0"; g.font = "28px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 48; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 35; if (y > 495) break; } line += w + " "; } if (y <= 495) g.fillText(line, 32, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }

// ---------- labels: Jupiter, the moons, the Sun, the lake, the lander; look at one and press E (A) for its info box ----------
const TAGS = [];
function tagTex(title, sub) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(16,12,6,0.72)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.strokeStyle = "rgba(255,220,140,0.6)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#ffe8b0"; g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillText(title, 22, 54, 470); g.fillStyle = "#e8dcc0"; g.font = "28px -apple-system, Helvetica, sans-serif"; g.fillText(sub, 22, 100, 470); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tag(get, title, subF, info, sky = false) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, ""), depthTest: !sky, depthWrite: false, transparent: true, toneMapped: false, fog: false })); sp.center.set(0.5, 0); sp.renderOrder = 30; scene.add(sp); const T = { sp, get, title, subF, info, sky, last: "" }; TAGS.push(T); return T; }
const fmtKm = d => d < 1000 ? Math.round(d) + " m" : d < 1e6 ? Math.round(d / 1000).toLocaleString() + " km" : (d / 1e6).toFixed(2) + " million km";
tag(() => JUP.position.clone().multiplyScalar(1 + 0.18).add(rig.position), "Jupiter", () => `421,700 km · 19.5° across · ${jupPhase > 0.97 ? "full" : jupPhase < 0.03 ? "new" : Math.round(jupPhase * 100) + "% lit"}`, FACTS[1], true);
MOONS.slice(1).forEach((m, k) => { tag(() => MOONM[k].position.clone().add(V3(0, MOONM[k].scale.x * 2.5 + SKYR * 0.01, 0)).add(rig.position), m[0], () => `${fmtKm(MOONM[k].userData.dist * 1000)} · ${(2 * Math.atan(m[4] / MOONM[k].userData.dist) / DEG).toFixed(2)}° across`, m[0] === "Amalthea" ? "<b>Amalthea</b>, a small reddish moon 250 by 150 km, racing round Jupiter inside Io's orbit every 12 hours: a moving point of light." : FACTS[2], true).hid = () => MOONM[k].userData.hidden; });
tag(() => SUN.position.clone().add(V3(0, SKYR * 0.03, 0)).add(rig.position), "The Sun", () => `5.2 AU · a 27th of Earth's sunlight${eclipse > 0.5 ? " · eclipsed by Jupiter" : ""}`, FACTS[3], true);
tag(() => V3(PC.x + PR - 9000 - ME.x0, FLOOR + 300, PC.z - ME.z0), "Loki Patera's lava lake", () => "202 km across · molten rock under the crust", FACTS[0]);
tag(() => { const r = PR - 6000, a = lavaU.fa.value; return V3(PC.x + r * Math.cos(a) - ME.x0, FLOOR + 200 - ((PC.x + r * Math.cos(a) - ME.x) ** 2 + (PC.z + r * Math.sin(a) - ME.z) ** 2) / (2 * R_IO), PC.z + r * Math.sin(a) - ME.z0); }, "Overturn front", () => "moving about 2 km a day", "<b>The overturn front</b>: the lake's crust, thickening and growing denser than the molten rock beneath, cracks and founders here, and fresh lava wells up glowing at 1,300 K or more. Behind the front (here, to its south) the new crust is still hot and glowing in its cracks; ahead it is old, black and cold. The wave works round the lake counterclockwise at 1-3 km a day; a full overturn takes months, every 400-600 days. Speed up time (T) to watch it come.");
tag(() => V3(LP.x - ME.x0, land(LP.x, LP.z) + 5, LP.z - ME.z0), "Robotic lander (imagined)", () => "", FACTS[7]);
tag(() => V3(MTN.x - ME.x0, land(MTN.x, MTN.z) + 300 - ((MTN.x - ME.x) ** 2 + (MTN.z - ME.z) ** 2) / (2 * R_IO), MTN.z - ME.z0), "A mountain", () => "70 km · about 5 km high (generated)", "<b>A mountain</b> (generated, not a mapped peak): Io's mountains stand alone, blocks of crust up to 17 km high (Boösaule Montes) pushed up and tilted as the crust, endlessly buried by new lava, sinks and is squeezed. They are not volcanoes.");
const _cd = V3(0, 0, 0), _cp = V3(0, 0, 0);
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const p = T.get(), d = p.distanceTo(_cp); T.sp.visible = tagsOn && d > 1.2 && !(T.hid && T.hid()) && (T.sky ? p.y - _cp.y > -SKYR * 0.02 : d < 120000); if (!T.sp.visible) continue; T.sp.position.copy(p); const w = clampN(d * 0.12, 0.7, SKYR * 0.2); T.sp.scale.set(w, w / 4, 1);
    const sub = T.subF() + (T.sky ? "" : " · " + fmtKm(d)); if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.09; for (const T of TAGS) { if (!T.sp.visible) continue; const v = T.sp.position.clone().sub(_cp), a = v.normalize().angleTo(_cd); if (a < ba) { ba = a; best = T; } } return best; }
function act() { const T = tagsOn ? lookedAt() : null; if (T) { say(T.info, 50); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${RATES[rateI][1]}. ${rateI ? "Watch Jupiter's clouds turn, its phase change and the moons move." : ""}`, 8); }
function toggleSeated() { seated = !seated; say(seated ? "<b>Sitting mode</b>: your view is raised about 45 cm, to standing height. (M, or click the left stick, for standing.)" : "<b>Standing mode</b>: your own height.", 8); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyT") setRate(rateI + 1); if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyR") { ME.x = ME.x0s; ME.z = ME.z0s; ME.y = land(ME.x, ME.z); ME.vx = ME.vz = ME.vy = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
ME.x0s = ME.x; ME.z0s = ME.z;
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block";
  say("<b>Io, at the edge of Loki Patera.</b> Below you to the west, at the foot of a 1 km cliff, a lake of lava 202 km across under a black glassy crust; above it, Jupiter, 19.5 degrees across, hanging still in a black sky. The glowing line is where the lake's crust is overturning. <b>E</b> tells you about whatever you look at (A in VR); <b>T</b> speeds up time; <b>space</b> jumps. The readout counts the radiation you would be taking: no one could survive here.", 35); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0;
updateGround(true); fillRocks();
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting, simDt = dt * RATES[rateI][0]; T += dt; frameN++; if (started) { tDays += simDt / 86400; dose += simDt * 36 / 86400; }
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) tagsOn = !tagsOn; prevB.x = bX; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setRate(rateI + 1); prevB.y = bY; const bS = gp.buttons[3]?.pressed; if (bS && !prevB.st) toggleSeated(); prevB.st = bS; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed, tr = gp.buttons[0]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; if (tr && !prevB.tr) act(); prevB.tr = tr; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  // walking and jumping in 0.18 g with no air at all
  const gY = land(ME.x, ME.z), onGround = ME.y <= gY + 0.03;
  if (started && onGround) { if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 5 : 2.4, k = 1 - Math.exp(-dt * 6); ME.vx += ((f.x * -my + sd.x * mx) * sp - ME.vx) * k; ME.vz += ((f.z * -my + sd.z * mx) * sp - ME.vz) * k; }
    else { const k = 1 - Math.exp(-dt * 5); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; } if (jump) ME.vy = 2.6; }
  ME.vy -= G_IO * dt; const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; walked += Math.hypot(ME.x - ox, ME.z - oz);
  if (Math.hypot(ME.x - LP.x, ME.z - LP.z) < 2.3) { const dx = ME.x - LP.x, dz = ME.z - LP.z, d = Math.hypot(dx, dz) || 1; ME.x = LP.x + dx / d * 2.3; ME.z = LP.z + dz / d * 2.3; }
  const gN = land(ME.x, ME.z); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.y = land(ox, oz); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } }
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillRocks(); } else { updateGround(); if (Math.hypot(ME.x - rockC[0], ME.z - rockC[1]) > 10) fillRocks(); }
  lavaU.org.value.set(ME.x0, ME.z0); lavaU.t.value = T; lavaU.fa.value = 0.15 - 0.02 * tDays;
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x - ME.x0, ME.y + lift, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  LANDER.position.set(LP.x - ME.x0, land(LP.x, LP.z), LP.z - ME.z0);
  const { sL } = updateSky(); SKY.position.copy(rig.position); sunL.position.copy(rig.position).addScaledVector(sL, 150); sunL.target.position.copy(rig.position);
  updateTags();
  if (hud && frameN % 10 === 0) { const hrs = ((tDays * 24) % 42.46), t36 = dose; HUD.innerHTML = `Loki Patera's east shore, Io · 13° N, 306° W<br>gravity 0.18 g · no air · ${pateraD(ME.x, ME.z) < 0 ? "on the lava lake's crust: 300-400 K, cracks 1,300 K" : "ground about 110 K (−163 °C)"}<br>Io day: hour ${hrs.toFixed(1)} of 42.5${eclipse > 0.5 ? " · <b>eclipse</b>: the Sun behind Jupiter" : ""} · time ${RATES[rateI][1]}<br><span style="color:${t36 > 5 ? "#ff6050" : t36 > 1 ? "#ffb050" : "#f6ecd0"}">radiation dose ${t36 < 1 ? Math.round(t36 * 1000) + " mSv" : t36.toFixed(1) + " Sv"}${t36 > 5 ? " · fatal" : " · a fatal dose (~5 Sv) in " + ((5 - t36) / 36 * 24).toFixed(1) + " h"}</span>`; }
  HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

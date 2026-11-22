// mars.js -- a tourist on Mars in the 2400s, at a hotel on the north rim of Coprates Chasma, Valles Marineris (11.75 S, 62.70 W). Built into mars.html by build.py.
//
// What is real. The ground is Mars as the Mars Orbiter Laser Altimeter measured it (MOLA, Mars Global Surveyor, 1997-2001): all of Valles Marineris at 1.85 km
// resolution, and 350 km round the hotel at 463 m (mars_data.js). Here the canyon is 10 km deep: the rim stands 5,100 m above the areoid (Mars' "sea level"),
// the floor 4,900 m below it, 50 km south; the south wall rises again to 4,300 m, 100 km away. Valles Marineris is 4,000 km long, as long as the United States
// is wide. Gravity 3.72 m/s2 (0.38 g); air 0.6% of Earth's (about 390 Pa up here), nearly all carbon dioxide, too thin to breathe or to keep water liquid;
// the dust in it makes the sky butterscotch by day and blue round the setting Sun. The Sun is two thirds the width it looks from Earth. Phobos and Deimos
// move on their real orbits: Phobos rises in the west and sets in the east twice a day.
// What is generated. Everything smaller than MOLA's 463 m: the gullies and spurs of the canyon walls, their layering, the boulders, in keeping with the images
// of the HiRISE and CTX cameras on Mars Reconnaissance Orbiter.
// What is imagined. The colony, some centuries on. Nothing in it needs more than physics allows: people live under rock or regolith (radiation at the surface is
// about 0.7 mSv a day), the air outside is still thin (warming Mars enough to thicken it would take far longer), so outside you wear a suit. The hotel's
// rooms are carved into the cliff behind two metres of rock; its observation lounge is the one place with glass all round, and nobody stays in it for long.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0604);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1200000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, sstep = (x, a, b) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, lerpN = THREE.MathUtils.lerp, DEG = Math.PI / 180;
const R_M = 3389500, G_M = 3.721, LAT0 = -11.75, LON0 = 297.3, SOL = 88775;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 5) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * vn(x, z); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }
function ridged(x, z, n = 4) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * (1 - Math.abs(2 * vn(x, z) - 1)); w += a; x = x * 2.1 + 3.7; z = z * 2.1 + 1.9; a *= 0.5; } return s / w; }

// ---------- the ground: MOLA, in metres, x east and z south of the hotel ----------
const toLL = (x, z) => { const lat = LAT0 - z / R_M / DEG; return [lat, LON0 + x / (R_M * Math.cos(lat * DEG)) / DEG]; };
const MOLA = { region: null, local: null };
function loadMola(D) { return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = D.w; c.height = D.h; const g = c.getContext("2d"); g.drawImage(im, 0, 0); const px = g.getImageData(0, 0, D.w, D.h).data, H = new Float32Array(D.w * D.h);
  for (let i = 0; i < H.length; i++) H[i] = px[i * 4] * 256 + px[i * 4 + 1] - 32768; res({ ...D, H }); }; im.src = D.png; }); }
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
function sampleD(D, lat, lon) { const fi = (D.lat0 - lat) * D.ppd - 0.5, fj = (lon - D.lon0) * D.ppd - 0.5, i = Math.floor(fi), j = Math.floor(fj), ti = fi - i, tj = fj - j, row = k => { const r = clampN(i + k, 0, D.h - 1) * D.w; return cr(D.H[r + clampN(j - 1, 0, D.w - 1)], D.H[r + clampN(j, 0, D.w - 1)], D.H[r + clampN(j + 1, 0, D.w - 1)], D.H[r + clampN(j + 2, 0, D.w - 1)], tj); };
  return cr(row(-1), row(0), row(1), row(2), ti); }
// MOLA, 463 m where the local tile covers, 1.85 km beyond, blended over the last 20 pixels of the local tile
function mola(x, z) { const [lat, lon] = toLL(x, z), L = MOLA.local; let h = sampleD(MOLA.region, lat, lon);
  if (L) { const m = Math.min((L.lat0 - lat) * L.ppd, (lat - L.lat1) * L.ppd, (lon - L.lon0) * L.ppd, (L.lon1 - lon) * L.ppd); if (m > 2) h = lerpN(h, sampleD(L, lat, lon), sstep(m, 2, 22)); } return h; }
// the generated detail, below MOLA's resolution: gentle undulation and small craters' worth of roughness on the plateau; on the walls, spurs and gullies
// running downslope and the outcrops of the layers the walls are cut through
const SITE = { rimZ: 300, H0: 5000, pads: [] };
function land(x, z) { const e = 3, h0 = mola(x, z), sx = (mola(x + e * 60, z) - mola(x - e * 60, z)) / (e * 120), sz = (mola(x, z + e * 60) - mola(x, z - e * 60)) / (e * 120), sl = Math.hypot(sx, sz), wall = sstep(sl, 0.12, 0.45);
  let h = h0 + 18 * (fbm(x / 900, z / 900, 4) - 0.5) + 3 * (fbm(x / 90, z / 90, 3) - 0.5) + 0.25 * (fbm(x / 7, z / 7, 2) - 0.5);
  if (wall > 0) { const a = Math.atan2(sz, sx), u = x * Math.cos(a) + z * Math.sin(a), v = -x * Math.sin(a) + z * Math.cos(a); h -= wall * (150 * Math.pow(1 - ridged(v / 700, u / 2600, 4), 1.5) + 25 * fbm(x / 160, z / 160, 3) + 14 * (0.5 + 0.5 * Math.sin(h0 / 55 + 3 * fbm(x / 2000, z / 2000, 2)))); }
  for (const P of SITE.pads) { if (x < P.x0 - P.s || x > P.x1 + P.s || z < P.z0 - P.s || z > P.z1 + P.s) continue; const d = Math.max(P.x0 - x, x - P.x1, P.z0 - z, z - P.z1, 0); h = lerpN(h, P.h, sstep(d, P.s, 2)); }
  const C = SITE.cut; if (C && x > C.x0 && x < C.x1 && z > C.z0 && z < C.z1) h = Math.min(h, C.h - Math.max(0, z - C.z0) * 0.8);
  return h; }
// colours, from HiRISE and CTX: dusty butterscotch plains, darker basaltic sand, the walls' alternating light and dark layers, dark talus below them
const MC = Object.fromEntries(Object.entries({ dust: "#b8784a", dust2: "#c48a58", sand: "#5a3a2a", rock: "#8a5a3e", rockL: "#b08460", rockD: "#5e3c2a", talus: "#6a4430", bright: "#d4a47a" }).map(([k, v]) => [k, new THREE.Color(v)]));
const _gc = new THREE.Color();
function groundColor(h, slope, x, z, out) { const n = fbm(x / 9, z / 9, 3), m = fbm(x / 2400 + 4, z / 2400, 4), m2 = fbm(x / 300 + 9, z / 300, 4), c = _gc.copy(MC.dust).lerp(MC.dust2, sstep(m, 0.4, 0.65));
  c.lerp(MC.sand, 0.6 * sstep(m2 + 0.25 * (m - 0.5), 0.6, 0.72)); c.lerp(MC.bright, 0.35 * sstep(m2, 0.36, 0.28));
  const layer = 0.5 + 0.5 * Math.sin(h / 38 + 4 * fbm(x / 3000, z / 3000, 2)) * Math.sin(h / 140 + 1.3), rk = _gc.clone().copy(MC.rockD).lerp(MC.rockL, layer).lerp(MC.rock, 0.3);
  c.lerp(rk, sstep(slope, 0.35, 0.9)); c.lerp(MC.talus, 0.45 * sstep(slope, 0.25, 0.4) * (1 - sstep(slope, 0.5, 0.8)));
  const k = 0.9 + 0.2 * n; out[0] = c.r * k; out[1] = c.g * k; out[2] = c.b * k; }

// ---------- the sky: the Sun through the sol, Phobos and Deimos, the dusty sky, the stars ----------
// Northern spring equinox (solar longitude 0): the Sun on the celestial equator, 78 degrees up at noon, a little to the north. Mars' axis tilts 25.2 degrees.
const LAT = LAT0 * DEG, LST0 = 9.0;
let tSec = 0;
function sunDir(t) { const H = ((LST0 + t / SOL * 24) % 24 - 12) * 15 * DEG, dec = 0, alt = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(-Math.sin(H) * Math.cos(dec), Math.cos(LAT) * Math.sin(dec) - Math.sin(LAT) * Math.cos(dec) * Math.cos(H)); return V3(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)); }
// Phobos and Deimos: circular, equatorial orbits (they are nearly both); Phobos 9,376 km from Mars' centre every 7 h 39 min, Deimos 23,463 km every 30 h 18 min. Seen from the
// rotating surface Phobos goes round the "wrong" way, west to east, in 11 h; Deimos drifts east to west over two and a half sols.
const MOONS = [{ n: "Phobos", a: 9376e3, P: 27554, r: 11.1e3, ph: 2.1 }, { n: "Deimos", a: 23463e3, P: 109075, r: 6.2e3, ph: 4.0 }], SIDEREAL = 88642;
function moonVec(m, t) { const th = m.ph + 2 * Math.PI * t * (1 / m.P - 1 / SIDEREAL), mp = V3(m.a * Math.cos(th), 0, m.a * Math.sin(th)), me = V3(R_M * Math.cos(LAT), R_M * Math.sin(LAT), 0), d = mp.sub(me);
  const up = V3(Math.cos(LAT), Math.sin(LAT), 0), north = V3(-Math.sin(LAT), Math.cos(LAT), 0), east = V3(0, 0, 1); return { v: V3(d.dot(east), d.dot(up), -d.dot(north)).normalize(), dist: d.length() }; }
const SKYR = 250000, SKY = new THREE.Group(); scene.add(SKY);
const skyU = { sun: { value: V3(0, 1, 0) }, day: { value: 1 } };
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(SKYR, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 sun; uniform float day; varying vec3 vD;
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vD); float mu = dot(d, sun), el = max(d.y, 0.0), sEl = sun.y;
      vec3 butterscotch = vec3(0.78, 0.55, 0.36), zenith = vec3(0.52, 0.36, 0.25), horizon = vec3(0.86, 0.66, 0.46);
      vec3 c = mix(horizon, mix(butterscotch, zenith, smoothstep(0.1, 0.9, el)), smoothstep(0.0, 0.35, el));
      float halo = pow(max(mu, 0.0), 12.0), blue = pow(max(mu, 0.0), 40.0);
      vec3 b = vec3(0.45, 0.62, 0.85); float low = 1.0 - smoothstep(0.0, 0.5, sEl);
      c = mix(c, b, blue * (0.35 + 0.55 * low)) + vec3(0.25, 0.22, 0.2) * halo;
      float light = smoothstep(-0.18, 0.12, sEl) * (0.35 + 0.65 * smoothstep(0.0, 0.5, sEl));
      vec3 night = vec3(0.004, 0.004, 0.008) + b * blue * smoothstep(-0.2, 0.0, sEl) * 0.25;
      gl_FragColor = vec4(mix(night, c * (0.9 + 0.35 * halo), light), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` })); SKY.add(skyDome);
const STARS = (() => { const N = 5000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 2 * Math.PI, r = Math.sqrt(1 - u * u), mag = Math.pow(Math.random(), 3);
    pos.set([r * Math.cos(a) * SKYR * 0.95, u * SKYR * 0.95, r * Math.sin(a) * SKYR * 0.95], i * 3); const c = 0.15 + 0.85 * mag, t = Math.random(); col.set([c * (0.85 + 0.15 * t), c * 0.92, c * (1.05 - 0.15 * t)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: true })); SKY.add(p); return p; })();
const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 2, 64, 64, 64); r.addColorStop(0, "rgba(255,255,245,1)"); r.addColorStop(0.12, "rgba(255,250,230,0.55)"); r.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const SUN = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfffaf0, fog: false })), SUNG = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })); SKY.add(SUN, SUNG);
const moonMat = () => new THREE.ShaderMaterial({ uniforms: { sun: { value: V3(0, 1, 0) }, day: { value: 1 } }, fog: false, transparent: true,
  vertexShader: `varying vec3 vN; varying vec3 vP;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 sun; uniform float day; varying vec3 vN; varying vec3 vP; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9, 78.2, 37.7))) * 43758.5); }
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    float d = max(dot(normalize(vN), sun), 0.0), n = 0.75 + 0.25 * h(floor(vP * 6.0)); vec3 c = vec3(0.32, 0.28, 0.25) * n * d * 1.6; gl_FragColor = vec4(c, mix(1.0, 0.75, day));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const MOONM = MOONS.map(m => { const g = new THREE.SphereGeometry(1, 24, 16), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = m.n === "Phobos" ? [1.0, 0.8, 0.7] : [1.0, 0.85, 0.75]; p.setXYZ(i, p.getX(i) * k[0], p.getY(i) * k[1], p.getZ(i) * k[2]); } g.computeVertexNormals(); const me = new THREE.Mesh(g, moonMat()); SKY.add(me); return me; });
const sunL = new THREE.DirectionalLight(0xfff0dc, 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048); Object.assign(sunL.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 400 }); sunL.shadow.bias = -0.0004; scene.add(sunL, sunL.target);
const ambL = new THREE.HemisphereLight(0xd8a070, 0x6a3e26, 0.55); scene.add(ambL);
// the dust: horizontal visibility of tens of kilometres; the far wall, 100 km off, is a pale shape in the haze
scene.fog = new THREE.FogExp2(0xc89a6c, 1 / 48000);
const _sv = V3(0, 0, 0);
function updateSky() { const s = sunDir(tSec), day = sstep(s.y, -0.15, 0.15); skyU.sun.value.copy(s); skyU.day.value = day;
  SUN.position.copy(s).multiplyScalar(SKYR * 0.9); SUN.scale.setScalar(SKYR * 0.9 * Math.tan(0.175 * DEG)); SUNG.position.copy(SUN.position); SUNG.scale.setScalar(SKYR * 0.9 * 0.05); SUN.visible = SUNG.visible = s.y > -0.03;
  STARS.material.opacity = 1 - sstep(s.y, -0.2, -0.02);
  MOONS.forEach((m, k) => { const { v, dist } = moonVec(m, tSec), me = MOONM[k]; me.position.copy(v).multiplyScalar(SKYR * 0.8); me.scale.setScalar(SKYR * 0.8 * m.r / dist); me.visible = v.y > -0.02; me.material.uniforms.sun.value.copy(s); me.material.uniforms.day.value = day; m.v = v; m.dist = dist; });
  const lit = sstep(s.y, -0.05, 0.25); sunL.intensity = 2.6 * lit; sunL.color.setRGB(1, 0.86 + 0.08 * lit, 0.72 + 0.14 * lit); ambL.intensity = 0.05 + 0.5 * sstep(s.y, -0.15, 0.3);
  scene.fog.color.setRGB(0.78, 0.6, 0.42).multiplyScalar(0.03 + 0.97 * sstep(s.y, -0.15, 0.25)); return s; }

// ---------- the ground: nested grids following you, the surface curving away (Mars is small: from eye height on flat ground the horizon is 3.4 km off) ----------
const grainT = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 9000; k++) { const v = 175 + Math.random() * 80; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const groundMat = new THREE.MeshStandardMaterial({ map: grainT, vertexColors: true, roughness: 0.95 });
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, x0: 0, z0: 0 };
function grid(size, n, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(400, 128, 0), grid(4000, 128, 2), grid(24000, 150, 12), grid(120000, 160, 60), grid(600000, 90, 400)] : [grid(500, 200, 0), grid(4000, 180, 2), grid(24000, 200, 12), grid(120000, 200, 60), grid(600000, 120, 400)];
for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, uv = m.geometry.attributes.uv, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    let y = H[i] - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_M) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 40 + drop * 4; }
    p.setY(i, y); groundColor(H[i], slope, x, z, c3); col.setXYZ(i, c3[0], c3[1], c3[2]); uv.setXY(i, ((x % 4000) + 4000) / 2.5, ((z % 4000) + 4000) / 2.5); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = uv.needsUpdate = true; m.geometry.computeVertexNormals(); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * 0.06) fillGrid(m); }
// boulders: sparse on the dusty plateau, many on the talus below the rim
const ROCK = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.7 + 0.5 * vn(p.getX(i) * 2 + 5, p.getY(i) * 2 + p.getZ(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.65, p.getZ(i) * k); } g.computeVertexNormals(); return g; })(), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 1800);
ROCK.frustumCulled = false; ROCK.castShadow = true; ROCK.receiveShadow = true; scene.add(ROCK); let rockC = [1e12, 1e12];
function fillRocks() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let k = 0; const S = 1.8, ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S); rockC = [ME.x, ME.z];
  for (let i = ci - 32; i <= ci + 32 && k < 1800; i++) for (let j = cj - 32; j <= cj + 32 && k < 1800; j++) { const x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S, h = land(x, z), sl = Math.abs(land(x, z + 4) - land(x, z - 4)) / 8 + Math.abs(land(x + 4, z) - land(x - 4, z)) / 8;
    if (hash(i * 3 + 1, j * 7 + 2) > 0.02 + 0.3 * sstep(sl, 0.2, 0.6) || inBuilt(x, z)) continue; const sz = 0.04 + (0.3 + 0.9 * sstep(sl, 0.2, 0.7)) * Math.pow(hash(i + 9, j + 3), 3);
    q.setFromEuler(new THREE.Euler(hash(i, 1) * 3, hash(j, 2) * 6, 0)); m4.compose(V3(x - ME.x0, h - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_M) + sz * 0.2, z - ME.z0), q, V3(sz, sz, sz)); ROCK.setMatrixAt(k, m4);
    const v = hash(i + 4, j + 8); col.setRGB(0.42 + 0.18 * v, 0.27 + 0.1 * v, 0.19 + 0.06 * v); ROCK.setColorAt(k, col); k++; }
  ROCK.count = k; ROCK.instanceMatrix.needsUpdate = true; if (ROCK.instanceColor) ROCK.instanceColor.needsUpdate = true; }

// ---------- the colony (imagined): the Coprates Rim Hotel and what is round it ----------
// Built in hotel coordinates (x east, z south of the hotel's centre point, y up from the graded pad), placed on the ground once MOLA is loaded.
const COL = new THREE.Group(); scene.add(COL);
const WALLS = [], FLOORS = [], CIRCLES = [];
const inBuilt = (x, z) => FLOORS.some(F => x > F.x0 - 1 && x < F.x1 + 1 && z > F.z0 - 1 && z < F.z1 + 1) || CIRCLES.some(C => Math.hypot(x - C.x, z - C.z) < C.r + 1);
const Mt = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const glassM = new THREE.MeshStandardMaterial({ color: 0x9ab8c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
const frameM = Mt(0xd8d4cc, { metalness: 0.5, roughness: 0.35 }), floorM = Mt(0x8a7a6a, { roughness: 0.7 }), regM = Mt(0xa86e48, { roughness: 1, side: THREE.DoubleSide }), whiteM = Mt(0xeeeae2), darkM = Mt(0x2a2826), warmM = new THREE.MeshBasicMaterial({ color: 0xffd8a0 }), greenM = Mt(0x4a8a3a, { roughness: 0.8 });
function put(geo, mat, x, y, z, ry = 0, parent = COL) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = mat !== glassM; m.receiveShadow = true; parent.add(m); return m; }
let PAD_H = 5000;
function buildColony() {
  // where the rim breaks: scan south from the hotel point for the first slope steeper than 22 degrees
  let rimZ = 0; for (let z = -400; z < 2000; z += 4) if (mola(0, z + 30) - mola(0, z) < -12) { rimZ = z; break; }
  SITE.rimZ = rimZ; PAD_H = Math.round(mola(0, rimZ - 60)); SITE.H0 = PAD_H;
  const pad = (x0, x1, z0, z1, h, s = 45) => { SITE.pads.push({ x0, x1, z0, z1, h, s }); return h; };
  pad(-22, 22, rimZ - 26, rimZ - 3, PAD_H - 0.4, 14); pad(-20, 20, rimZ - 3, rimZ + 1, PAD_H - 0.4, 3);
  const site = (x, z, r) => pad(x - r, x + r, z - r, z + r, Math.round(mola(x, z)) - 0.4, 45) - PAD_H + 0.4; SITE.cut = { x0: -14, x1: 14, z0: rimZ + 1, z1: rimZ + 45, h: PAD_H - 2 };
  const ST = { x: -420, z: rimZ - 380 }, RP = { x: 260, z: rimZ - 1500 }, SA = { x: -250, z: rimZ - 230 };
  ST.h = pad(ST.x - 36, ST.x + 36, ST.z - 14, ST.z + 14, Math.round(mola(ST.x, ST.z)) - 0.4) - PAD_H + 0.4; RP.h = pad(RP.x - 46, RP.x + 46, RP.z - 46, RP.z + 46, Math.round(mola(RP.x, RP.z)) - 0.4) - PAD_H + 0.4; SA.h = pad(SA.x - 80, SA.x + 80, SA.z - 25, SA.z + 25, Math.round(mola(SA.x, SA.z)) - 0.4) - PAD_H + 0.4; Object.assign(SITE, { ST, RP, SA });
  COL.userData.y = PAD_H; const R0 = rimZ;
  // the observation lounge: 36 m by 16 m, glass walls and roof on a white frame, its south end at the very edge; from it a glass-floored deck runs 24 m out over the drop
  const L = { x0: -18, x1: 18, z0: R0 - 15, z1: R0 + 1 }, D = { x0: -7, x1: 7, z0: R0 + 1, z1: R0 + 25 };
  put(new THREE.BoxGeometry(L.x1 - L.x0, 0.4, L.z1 - L.z0), floorM, 0, 0.1, (L.z0 + L.z1) / 2); FLOORS.push({ ...L, y: 0.3 });
  const deckFrame = put(new THREE.BoxGeometry(D.x1 - D.x0, 0.12, D.z1 - D.z0), glassM, 0, 0.24, (D.z0 + D.z1) / 2); FLOORS.push({ ...D, y: 0.3, glass: true });
  for (const x of [D.x0, D.x1]) put(new THREE.BoxGeometry(0.3, 0.5, D.z1 - D.z0), frameM, x, 0.1, (D.z0 + D.z1) / 2); for (let z = D.z0; z <= D.z1; z += 4) put(new THREE.BoxGeometry(D.x1 - D.x0, 0.12, 0.2), frameM, 0, 0.12, z);
  put(new THREE.BoxGeometry(0.4, 0.8, 0.4), frameM, D.x0, -0.6, D.z1); put(new THREE.BoxGeometry(0.4, 0.8, 0.4), frameM, D.x1, -0.6, D.z1);
  for (let k = 0; k < 6; k++) { const z = D.z0 + k * 4 + 2; put(new THREE.BoxGeometry(0.25, 0.25, 4.2), frameM, D.x0 + 0.1, -0.5 - k * 0.6, z - 0.2).rotation.x = 0.15; put(new THREE.BoxGeometry(0.25, 0.25, 4.2), frameM, D.x1 - 0.1, -0.5 - k * 0.6, z - 0.2).rotation.x = 0.15; }
  const H = 6, Hd = 3.2;
  const pane = (x0, z0, x1, z1, h, y0 = 0.3) => { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0); put(new THREE.PlaneGeometry(len, h), glassM, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, -a); for (let s = 0; s <= len; s += 4) { const t = s / len; put(new THREE.BoxGeometry(0.16, h, 0.16), frameM, x0 + (x1 - x0) * t, y0 + h / 2, z0 + (z1 - z0) * t); } put(new THREE.BoxGeometry(len, 0.2, 0.2), frameM, (x0 + x1) / 2, y0 + h, (z0 + z1) / 2, -a); WALLS.push([x0, z0, x1, z1]); };
  pane(L.x0, L.z1, -7, L.z1, H); pane(7, L.z1, L.x1, L.z1, H); pane(L.x0, L.z0, L.x0, L.z1, H); pane(L.x1, L.z0, L.x1, L.z1, H);
  pane(L.x0, L.z0, -2, L.z0, H); pane(2, L.z0, L.x1, L.z0, H);
  pane(D.x0, D.z0, D.x0, D.z1, Hd); pane(D.x1, D.z0, D.x1, D.z1, Hd); pane(D.x0, D.z1, D.x1, D.z1, Hd);
  put(new THREE.PlaneGeometry(D.x1 - D.x0, D.z1 - D.z0).rotateX(Math.PI / 2), glassM, 0, 0.3 + Hd, (D.z0 + D.z1) / 2); for (let z = D.z0; z <= D.z1; z += 4) put(new THREE.BoxGeometry(D.x1 - D.x0, 0.16, 0.16), frameM, 0, 0.3 + Hd, z);
  put(new THREE.PlaneGeometry(14, 0.01), glassM, 0, 0.3 + H, L.z1);
  put(new THREE.PlaneGeometry(L.x1 - L.x0, L.z1 - L.z0).rotateX(Math.PI / 2), glassM, 0, 0.3 + H, (L.z0 + L.z1) / 2); for (let x = L.x0; x <= L.x1; x += 4) put(new THREE.BoxGeometry(0.18, 0.18, L.z1 - L.z0), frameM, x, 0.3 + H, (L.z0 + L.z1) / 2);
  put(new THREE.BoxGeometry(14.4, 0.4, 0.4), frameM, 0, 0.3 + Hd, L.z1); put(new THREE.PlaneGeometry(14, H - Hd), glassM, 0, 0.3 + Hd + (H - Hd) / 2, L.z1);
  // inside: benches facing the canyon, planters with real plants (the lounge is warm and at a comfortable pressure), a bar along the north wall
  for (const x of [-12, -6, 6, 12]) { put(new THREE.BoxGeometry(4, 0.45, 0.8), Mt(0x5a3a2a), x, 0.52, L.z1 - 4); put(new THREE.BoxGeometry(4, 0.6, 0.12), Mt(0x5a3a2a), x, 0.95, L.z1 - 4.4); }
  for (const x of [-16, 16]) for (const z of [L.z0 + 2, L.z1 - 2]) { put(new THREE.CylinderGeometry(0.7, 0.6, 0.8, 12), whiteM, x, 0.7, z); const leaf = put(new THREE.IcosahedronGeometry(0.9, 1), greenM, x, 1.7, z); leaf.scale.set(1, 1.3, 1); }
  put(new THREE.BoxGeometry(12, 1.1, 1.0), Mt(0x3a2a22), 0, 0.85, L.z0 + 1.2); put(new THREE.BoxGeometry(12.2, 0.08, 1.2), whiteM, 0, 1.44, L.z0 + 1.2); WALLS.push([-6, L.z0 + 0.6, 6, L.z0 + 0.6], [-6, L.z0 + 1.8, 6, L.z0 + 1.8]);
  for (let x = -14; x <= 14; x += 4) { const lp = put(new THREE.SphereGeometry(0.18, 10, 8), warmM, x, 0.3 + H - 0.5, (L.z0 + L.z1) / 2); }
  const lampL = new THREE.PointLight(0xffd0a0, 18, 30, 1.6); lampL.position.set(0, 4.5, (L.z0 + L.z1) / 2); COL.add(lampL);
  // the airlock north of the lounge: a short regolith-covered tunnel leading back to the hotel domes
  put(new THREE.BoxGeometry(4.4, 3.4, 8), regM, 0, 1.7, L.z0 - 4); for (const zz of [L.z0 - 0.05, L.z0 - 7.95]) { put(new THREE.BoxGeometry(3.4, 0.3, 0.3), frameM, 0, 3.0, zz); for (const xx of [-1.6, 1.6]) put(new THREE.BoxGeometry(0.3, 2.9, 0.3), frameM, xx, 1.55, zz); put(new THREE.BoxGeometry(1.4, 2.6, 0.12), Mt(0x6a7a86, { metalness: 0.6, roughness: 0.3 }), -2.3, 1.6, zz); }
  put(new THREE.BoxGeometry(3.2, 0.2, 0.25), new THREE.MeshBasicMaterial({ color: 0x60ff90 }), 0, 3.1, L.z0 - 0.1); FLOORS.push({ x0: -1.6, x1: 1.6, z0: L.z0 - 8, z1: L.z0, y: 0.3 }); WALLS.push([-1.6, L.z0, -1.6, L.z0 - 8], [1.6, L.z0, 1.6, L.z0 - 8]);
  // the hotel itself: rooms carved into the cliff below the rim, each with a window; from outside, rows of lit windows in the rock
  HOTELW.length = 0; for (let lv = 0; lv < 6; lv++) for (let k = -5; k <= 5; k++) { const x = k * 14 + (lv % 2) * 7, z0 = R0 + 30 + lv * 35; let z = z0; while (land(x, z) > PAD_H - 20 - lv * 40 && z < R0 + 600) z += 2; HOTELW.push([x, z, land(x, z)]); }
  // habitat domes behind the rim, under three metres of regolith piled on a pressurised shell; a glass greenhouse; a lift down the wall; the maglev station; the rocket pad
  for (const [x, z, r] of [[-60, R0 - 90, 22], [10, R0 - 130, 30], [80, R0 - 95, 18], [-110, R0 - 170, 16], [60, R0 - 210, 24]]) { const y0 = site(x, z, r + 4), d = put(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), regM, x, y0 - 0.5, z); d.scale.y = 0.55; CIRCLES.push({ x, z, r: r + 0.5 });
    for (let a = 0; a < 6.28; a += 1.05) put(new THREE.BoxGeometry(1.6, 1.2, 0.3), warmM, x + Math.cos(a) * r * 0.98, y0 + 1.0, z + Math.sin(a) * r * 0.98, -a + Math.PI / 2); }
  { const x = -150, z = R0 - 60, r = 26, y0 = site(x, z, r + 4); put(new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), glassM, x, y0, z); const ribs = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8d4cc, wireframe: true })); ribs.position.set(x, y0, z); COL.add(ribs); CIRCLES.push({ x, z, r: r + 0.5 });
    for (let i = 0; i < 70; i++) { const a = hash(i, 3) * 6.28, rr = Math.sqrt(hash(i, 5)) * r * 0.85, t = put(new THREE.IcosahedronGeometry(1.4 + hash(i, 7) * 1.6, 0), greenM, x + Math.cos(a) * rr, y0 + 1.5 + hash(i, 9) * 3, z + Math.sin(a) * rr); t.scale.y = 1.4; }
    const gl = new THREE.PointLight(0xfff0e0, 30, 60, 1.5); gl.position.set(x, y0 + 12, z); COL.add(gl); SITE.GH = { x, z, y: y0 }; }
  { const x = 150; let rz = R0; for (let z = R0 - 300; z < R0 + 2000; z += 4) if (mola(x, z + 30) - mola(x, z) < -12) { rz = z; break; } const y0 = site(x, rz - 12, 10); SITE.LIFT = { x, z: rz - 12, y: y0 }; put(new THREE.BoxGeometry(14, 22, 14), Mt(0x9a9690, { metalness: 0.3 }), x, y0 + 11, rz - 12); put(new THREE.BoxGeometry(18, 3, 18), Mt(0xb43a2a), x, y0 + 23.5, rz - 12); put(new THREE.BoxGeometry(3, 8, 3), warmM, x - 7.1, y0 + 8, rz - 12);
    CIRCLES.push({ x, z: rz - 12, r: 10 }); LIFTLINE.length = 0; let z = rz - 5; while (z < R0 + 60000) { const h = land(x, z); LIFTLINE.push([x, z, h + 4]); if (h < -4600) break; z += z < R0 + 3000 ? 40 : 300; } }
  { const x = SITE.ST.x, z = SITE.ST.z, y0 = SITE.ST.h; put(new THREE.BoxGeometry(60, 9, 18), Mt(0xd0ccc4, { metalness: 0.3 }), x, y0 + 4.5, z); put(new THREE.BoxGeometry(62, 0.6, 20), frameM, x, y0 + 9.3, z); put(new THREE.BoxGeometry(56, 2, 0.3), warmM, x, y0 + 4, z + 9.05); CIRCLES.push({ x: x - 20, z, r: 12 }, { x, z, r: 12 }, { x: x + 20, z, r: 12 });
    for (let k = 1; k < 40; k++) { const px = x - 30 - k * 60, pz = z - k * 22, gy = land(px, pz) - PAD_H, top = y0 + 9.6 - 2.2; put(new THREE.CylinderGeometry(0.8, 1.1, top - gy, 8), frameM, px, (top + gy) / 2, pz); }
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2560, 16, 1, true).rotateZ(Math.PI / 2), Mt(0xc8c4bc, { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide })); tube.position.set(x - 30 - 1200, y0 + 9.6, z - 440); tube.rotation.y = -Math.atan2(22, 60); COL.add(tube); }
  { const x = SITE.RP.x, z = SITE.RP.z, y0 = SITE.RP.h; put(new THREE.CylinderGeometry(40, 42, 1, 48), Mt(0x6a6660), x, y0 + 0.4, z); put(new THREE.CylinderGeometry(4.5, 4.5, 40, 24), whiteM, x, y0 + 21, z); put(new THREE.ConeGeometry(4.5, 10, 24), whiteM, x, y0 + 46, z); for (let a = 0; a < 6.28; a += 2.094) put(new THREE.BoxGeometry(0.6, 8, 4), darkM, x + Math.cos(a) * 4.8, y0 + 4, z + Math.sin(a) * 4.8, -a);
    CIRCLES.push({ x, z, r: 6 }); }
  for (let k = 0; k < 8; k++) for (let j = 0; j < 3; j++) { const p = put(new THREE.BoxGeometry(16, 0.2, 6), Mt(0x1a2a44, { metalness: 0.6, roughness: 0.3 }), SITE.SA.x - 63 + k * 18, SITE.SA.h + 1.4, SITE.SA.z + 9 - j * 9); p.rotation.x = -0.5; }
  COL.position.set(-ME.x0, PAD_H, -ME.z0); }
const HOTELW = [], LIFTLINE = [];
let winMesh = null, liftMesh = null;
function buildFar() { const wg = new THREE.BoxGeometry(7, 2.2, 1.2), wm = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.15, metalness: 0.4, emissive: 0xffb060, emissiveIntensity: 0.35 }), HOTELW.length), m4 = new THREE.Matrix4(); HOTELW.forEach(([x, z, h], i) => wm.setMatrixAt(i, m4.makeTranslation(x, h + 1.4, z))); winMesh = wm; scene.add(wm);
  const pts = LIFTLINE.map(([x, z, h]) => V3(x, h - (x * x + (z - SITE.rimZ) ** 2) / (2 * R_M), z)), g = new THREE.BufferGeometry().setFromPoints(pts); liftMesh = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe8e0d0 })); scene.add(liftMesh);
  const lights = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts.filter((_, i) => i % 2 === 0)), new THREE.PointsMaterial({ color: 0xffc060, size: 3, sizeAttenuation: false, fog: false })); liftMesh.add(lights); }

// ---------- you: in the lounge at first; through the airlock you are in a suit ----------
const keys = {}, prevB = {}; let yaw = Math.PI, pitch = -0.12, vrYaw = yaw, started = false, seated = false, hud = true, msgT = 0, msgAge = 0, walked = 0, dose = 0, rateI = 0, factI = -1, tagsOn = true, ready = false;
const RATES = [[1, "real time"], [60, "a minute a second"], [600, "ten minutes a second"], [3600, "an hour a second"]];
const FACTS = [
  "<b>Coprates Chasma</b>, the eastern trunk of Valles Marineris. Below this rim the ground falls 10 km to the canyon floor, 50 km to the south: from the edge you look down on the tops of the haze. The south wall, 100 km away, rises again to 4,300 m. Valles Marineris runs 4,000 km, from the maze of Noctis Labyrinthus in the west to the chaos terrain in the east: as long as the United States is wide, and four times as deep as the Grand Canyon. It is a crack in Mars' crust that opened as the Tharsis volcanoes, just to the west, bulged it up; landslides and water widened it.",
  "<b>The ground is real</b>: the shapes you see are Mars as the laser altimeter on Mars Global Surveyor measured it, a pulse of light every few hundred metres, 1997 to 2001. What is smaller than 463 m (the gullies, the boulders, the layering) is generated, in keeping with the HiRISE and CTX cameras' pictures.",
  "<b>The walls are layered</b>: lava flows, ash and sediment piled up over billions of years before the canyon opened. The spurs and gullies between them are carved by rockfalls and landslides; some of the biggest landslides in the solar system ran out across the canyon floors here.",
  "<b>The sky</b> is butterscotch because the air is full of fine dust, which scatters red light; around the Sun, and at sunset, it turns blue, because the dust grains scatter blue light forward. The air is 0.6% of Earth's (here on the rim, 5 km up, even less): carbon dioxide, too thin to breathe, cold (about −60 °C on average), and water boils away in it.",
  "<b>Phobos and Deimos</b>: Phobos, 22 km long, orbits only 6,000 km above the ground, faster than Mars turns, so it rises in the west and sets in the east, crossing the sky in about four hours, twice a sol. It is spiralling inward and will break up in some 40 million years. Deimos, 12 km long, is a bright star that takes two and a half sols to cross the sky.",
  "<b>The colony is imagined</b>, a few centuries from now, with nothing in it physics would not allow. Mars' surface takes about 0.7 mSv of radiation a day (several hundred times Earth's), so people live under rock or regolith: the domes here are pressurised shells under three metres of piled soil; the hotel's rooms are carved into the cliff below you, their windows set back behind two metres of rock. The lounge is the one room with glass all round; visitors come for an hour.",
  "<b>Gravity is 0.38 g</b>: you weigh about a third of what you do on Earth. Jump (space, or B in VR) and you rise three times as high as at home. A sol, Mars' day, is 24 h 40 min.",
  "<b>Getting about</b> (coming next): a maglev in a vacuum tube along the plateau to the other settlements of Valles Marineris; a lift down the cliff to the canyon floor, 10 km below; rocket hops from the pad to anywhere on Mars in under an hour; pressurised rovers. Mars' air is too thin for ordinary aircraft."];
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(30,16,8,.86);color:#f6e6d0;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(30,16,8,.72);color:#f6e6d0;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false, fog: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(30,16,8,0.9)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f6e6d0"; g.font = "28px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 48; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 35; if (y > 495) break; } line += w + " "; } if (y <= 495) g.fillText(line, 32, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
const wristT = (() => { const c = document.createElement("canvas"); c.width = 640; c.height = 512; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t; })(), wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshBasicMaterial({ map: wristT, transparent: true, toneMapped: false, fog: false }));
wrist.visible = false; wrist.position.set(0, 0.06, 0.1); wrist.rotation.x = -1.1; wrist.renderOrder = 98;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
function drawWrist(html) { const g = wristT.userData.c.getContext("2d"); g.clearRect(0, 0, 640, 512); g.fillStyle = "rgba(30,16,8,0.88)"; g.beginPath(); g.roundRect(0, 0, 640, 512, 24); g.fill(); g.font = "24px sans-serif"; let y = 36;
  for (const ln of html.split("<br>")) { const t = ln.replace(/<[^>]+>/g, ""); g.fillStyle = /^<b>/.test(ln) ? "#ffe0a0" : "#f6e6d0"; const words = t.split(" "); let line = ""; for (const w of words) { if (g.measureText(line + w).width > 600) { g.fillText(line, 18, y); y += 29; line = ""; } line += w + " "; } g.fillText(line, 18, y); y += 31; if (y > 500) break; }
  wristT.needsUpdate = true; }

// ---------- labels: look at one and press E (A in VR) ----------
const TAGS = [];
function tagTex(title, sub) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(30,16,8,0.72)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.strokeStyle = "rgba(255,210,150,0.6)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#ffe4c0"; g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillText(title, 22, 54, 470); g.fillStyle = "#ead8c0"; g.font = "28px -apple-system, Helvetica, sans-serif"; g.fillText(sub, 22, 100, 470); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tag(get, title, subF, info, sky = false) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, ""), depthTest: !sky, depthWrite: false, transparent: true, toneMapped: false, fog: false })); sp.center.set(0.5, 0); sp.renderOrder = 30; scene.add(sp); const T = { sp, get, title, subF, info, sky, last: "" }; TAGS.push(T); return T; }
const fmtKm = d => d < 1000 ? Math.round(d) + " m" : d < 1e6 ? Math.round(d / 1000).toLocaleString() + " km" : (d / 1e6).toFixed(2) + " million km";
const curveY = (x, z) => -((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_M);
const W3 = (x, y, z) => V3(x - ME.x0, y + curveY(x, z), z - ME.z0);
function makeTags() { const R0 = SITE.rimZ;
  tag(() => W3(0, -4900 + 900, R0 + 48000), "Coprates Chasma floor", () => "4,900 m below the areoid · 10 km below you", FACTS[0]);
  tag(() => W3(0, 4300 + 1500, R0 + 100000), "The south wall", () => "100 km · 4,300 m high", FACTS[2]);
  tag(() => W3(0, PAD_H + 8, R0 - 6), "Observation lounge", () => "", FACTS[5]);
  tag(() => W3(0, PAD_H - 40, R0 + 90), "Hotel rooms, in the cliff", () => "behind 2 m of rock", FACTS[5]);
  tag(() => W3(SITE.LIFT.x, PAD_H + SITE.LIFT.y + 30, SITE.LIFT.z), "The Canyon Lift", () => "down the wall to the floor (coming next)", "<b>The Canyon Lift</b> (imagined): a cable railway down the wall, then a funicular along the talus to the canyon floor, 10 km lower and 48 km south: a two-hour ride. Its lights run away down the cliff. (Riding it is coming next.)");
  tag(() => W3(SITE.ST.x, PAD_H + SITE.ST.h + 14, SITE.ST.z), "Maglev station", () => "the vacuum tube to the rest of Valles Marineris", "<b>The maglev</b> (imagined): a train floating on magnets in an evacuated tube on pylons. Mars' thin air makes the vacuum easy to keep. Along Valles Marineris it would run at 1,000 km/h or more: Noctis Labyrinthus, 2,000 km west, in two hours. (Riding it is coming next.)");
  tag(() => W3(SITE.RP.x, PAD_H + SITE.RP.h + 55, SITE.RP.z), "Rocket pad", () => "hops anywhere on Mars", "<b>Rocket hops</b> (imagined, but simple physics): with a third of Earth's gravity and almost no air to fight, a rocket can go anywhere on Mars on a ballistic arc in under an hour: Olympus Mons, the poles, Hellas. The only way to fly far: aircraft need air.");
  tag(() => W3(SITE.GH.x, PAD_H + SITE.GH.y + 30, SITE.GH.z), "Greenhouse", () => "under glass and a water shield", "<b>The greenhouse</b> (imagined): plants need light, so this dome is glass, thick and layered, with water between the layers to soak up radiation. Mars gets 43% of Earth's sunlight, enough for crops.");
  tag(() => SUN.position.clone().add(V3(0, SKYR * 0.03, 0)).add(rig.position), "The Sun", () => "1.52 AU · 43% of Earth's sunlight", FACTS[3], true);
  MOONS.forEach((m, k) => tag(() => MOONM[k].position.clone().add(V3(0, SKYR * 0.012, 0)).add(rig.position), m.n, () => `${fmtKm(m.dist)} · ${(2 * Math.atan(m.r / m.dist) / DEG * 60).toFixed(1)}′ across`, FACTS[4], true).hid = () => !MOONM[k].visible); }
const _cd = V3(0, 0, 0), _cp = V3(0, 0, 0);
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const p = T.get(), d = p.distanceTo(_cp); T.sp.visible = tagsOn && d > 1.2 && !(T.hid && T.hid()) && (T.sky ? p.y - _cp.y > -SKYR * 0.02 : d < 300000); if (!T.sp.visible) continue; T.sp.position.copy(p); const w = clampN(d * 0.1, 0.7, SKYR * 0.2); T.sp.scale.set(w, w / 4, 1);
    const sub = T.subF() + (T.sky ? "" : " · " + fmtKm(d)); if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.09; for (const T of TAGS) { if (!T.sp.visible) continue; const v = T.sp.position.clone().sub(_cp), a = v.normalize().angleTo(_cd); if (a < ba) { ba = a; best = T; } } return best; }
function act() { const T = tagsOn ? lookedAt() : null; if (T) { say(T.info, 50); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${RATES[rateI][1]}.${rateI ? " Watch the shadows move down the walls and Phobos cross the sky." : ""}`, 8); }
function toggleSeated() { seated = !seated; say(seated ? "<b>Sitting mode</b>: your view is raised about 45 cm, to standing height. (M, or click the left stick, for standing.)" : "<b>Standing mode</b>: your own height.", 8); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyT") setRate(rateI + 1); if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyR") toStart(); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function toStart() { ME.x = 0; ME.z = SITE.rimZ - 3; ME.y = PAD_H + 0.3; ME.vx = ME.vz = ME.vy = 0; }
function start() { if (started || !ready) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block";
  say("<b>The Coprates Rim Hotel, Mars, some centuries from now.</b> You are in its observation lounge, at the very edge of Valles Marineris: in front of you the ground falls away 10 km to the floor of Coprates Chasma. Walk out on the glass-floored deck. <b>E</b> tells you about whatever you look at (A in VR); <b>T</b> speeds up time; the airlock behind you leads outside, where you wear a suit.", 35); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { if (!ready) return; const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// where you stand: on a floor if over one, else on the ground; walls and domes stop you
function floorAt(x, z) { for (const F of FLOORS) if (x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1) return PAD_H + F.y; return null; }
function standY(x, z) { const f = floorAt(x, z), g = land(x, z); return f !== null && f > g - 2 ? f : g; }
function collide(ox, oz) { const r = 0.35; for (const [x0, z0, x1, z1] of WALLS) { const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz, t = clampN(((ME.x - x0) * dx + (ME.z - z0) * dz) / L2, 0, 1), px = x0 + dx * t, pz = z0 + dz * t, d = Math.hypot(ME.x - px, ME.z - pz);
    if (d < r && ME.y < PAD_H + 6.5) { const nx = (ME.x - px) / (d || 1), nz = (ME.z - pz) / (d || 1); ME.x = px + nx * r; ME.z = pz + nz * r; } }
  for (const C of CIRCLES) { const d = Math.hypot(ME.x - C.x, ME.z - C.z); if (d < C.r) { ME.x = C.x + (ME.x - C.x) / d * C.r; ME.z = C.z + (ME.z - C.z) / d * C.r; } } }
const insideNow = () => { const f = floorAt(ME.x, ME.z); return f !== null && Math.abs(ME.y - f) < 2 && !(ME.z < SITE.rimZ - 15 - 8); };

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0;
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
Promise.all([loadMola(MOLA_REGION), loadMola(MOLA_LOCAL)]).then(([r, l]) => { MOLA.region = r; MOLA.local = l; buildColony(); toStart(); ME.x0 = ME.x; ME.z0 = ME.z; COL.position.set(-ME.x0, PAD_H, -ME.z0); buildFar(); makeTags(); updateGround(true); fillRocks(); ready = true;
  const card = document.querySelector("#intro .dim"); if (card) card.textContent = card.textContent.replace("Loading the ground…", "Click to begin."); });
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting, simDt = dt * RATES[rateI][0]; T += dt; frameN++; if (!ready) { renderer.render(scene, camera); return; }
  if (started) { tSec += simDt; }
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) tagsOn = !tagsOn; prevB.x = bX; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setRate(rateI + 1); prevB.y = bY; const bS = gp.buttons[3]?.pressed; if (bS && !prevB.st) toggleSeated(); prevB.st = bS; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed, tr = gp.buttons[0]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; if (tr && !prevB.tr) act(); prevB.tr = tr; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  // walking and jumping in 0.38 g; the thin air does nothing to slow you
  const gY = standY(ME.x, ME.z), onGround = ME.y <= gY + 0.03;
  if (started && onGround) { if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 5 : 2.2, k = 1 - Math.exp(-dt * 6); ME.vx += ((f.x * -my + sd.x * mx) * sp - ME.vx) * k; ME.vz += ((f.z * -my + sd.z * mx) * sp - ME.vz) * k; }
    else { const k = 1 - Math.exp(-dt * 6); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; } if (jump) ME.vy = 2.4; }
  ME.vy -= G_M * dt; const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; collide(ox, oz); walked += Math.hypot(ME.x - ox, ME.z - oz);
  const gN = standY(ME.x, ME.z); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.y = standY(ox, oz); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } }
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillRocks(); } else { updateGround(); if (Math.hypot(ME.x - rockC[0], ME.z - rockC[1]) > 10) fillRocks(); }
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x - ME.x0, ME.y + lift, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  COL.position.set(-ME.x0, PAD_H + curveY(0, SITE.rimZ), -ME.z0); if (winMesh) { winMesh.position.set(-ME.x0, 0, -ME.z0); liftMesh.position.set(-ME.x0, 0, -ME.z0); }
  const s = updateSky(); SKY.position.copy(rig.position); sunL.position.copy(rig.position).addScaledVector(s, 200); sunL.target.position.copy(rig.position);
  updateTags();
  if (frameN % 10 === 0) { const [lat, lon] = toLL(ME.x, ME.z), h = ME.y, lst = (LST0 + tSec / SOL * 24) % 24, inside = insideNow(), pa = 610 * Math.exp(-h / 11100), el = Math.asin(s.y) / DEG, az = ((Math.atan2(s.x, -s.z) / DEG) + 360) % 360;
    const lines = [`<b>Coprates Chasma, Valles Marineris</b>`, `${Math.abs(lat).toFixed(3)}° S, ${(360 - lon).toFixed(3)}° W · ${Math.round(h).toLocaleString()} m above the areoid`, inside ? "inside: 21 °C, 70 kPa air · no suit" : `outside, in a suit · air ${Math.round(pa)} Pa (${(pa / 1013).toFixed(2)}% of Earth's), CO₂`,
      `sol ${1 + Math.floor((LST0 / 24) + tSec / SOL)}, ${String(Math.floor(lst)).padStart(2, "0")}:${String(Math.floor((lst % 1) * 60)).padStart(2, "0")} local time · Sun ${el < 0 ? "below the horizon" : COMPASS[Math.round(az / 22.5) % 16] + " " + Math.round(el) + "° up"} · time ${RATES[rateI][1]}`,
      ...MOONS.map(m => `${m.n}: ${m.v.y < 0 ? "below the horizon" : COMPASS[Math.round((((Math.atan2(m.v.x, -m.v.z) / DEG) + 360) % 360) / 22.5) % 16] + " " + Math.round(Math.asin(m.v.y) / DEG) + "° up"}`)];
    if (hud) HUD.innerHTML = lines.join("<br>"); if (vr && frameN % 30 === 0) drawWrist(lines.join("<br>")); }
  wrist.visible = vr && hud && started; HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

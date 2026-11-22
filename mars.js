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
// haze: light from a distance d reaches you dimmed by exp(-d / L) (three's FogExp2 uses exp(-(d/L)^2), which hides the far wall too soon)
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace("float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );", "float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );");
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
const MOLA = { region: null, local: null, local2: null };
function loadMola(D) { return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = D.w; c.height = D.h; const g = c.getContext("2d"); g.drawImage(im, 0, 0); const px = g.getImageData(0, 0, D.w, D.h).data, H = new Float32Array(D.w * D.h);
  for (let i = 0; i < H.length; i++) H[i] = px[i * 4] * 256 + px[i * 4 + 1] - 32768; res({ ...D, H }); }; im.src = D.png; }); }
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
function sampleD(D, lat, lon) { const fi = (D.lat0 - lat) * D.ppd - 0.5, fj = (lon - D.lon0) * D.ppd - 0.5, i = Math.floor(fi), j = Math.floor(fj), ti = fi - i, tj = fj - j, row = k => { const r = clampN(i + k, 0, D.h - 1) * D.w; return cr(D.H[r + clampN(j - 1, 0, D.w - 1)], D.H[r + clampN(j, 0, D.w - 1)], D.H[r + clampN(j + 1, 0, D.w - 1)], D.H[r + clampN(j + 2, 0, D.w - 1)], tj); };
  return cr(row(-1), row(0), row(1), row(2), ti); }
// MOLA, 463 m where the local tile covers, 1.85 km beyond, blended over the last 20 pixels of the local tile
function mola(x, z) { const [lat, lon] = toLL(x, z); let h = sampleD(MOLA.region, lat, lon);
  for (const L of [MOLA.local, MOLA.local2]) { if (!L) continue; const m = Math.min((L.lat0 - lat) * L.ppd, (lat - L.lat1) * L.ppd, (lon - L.lon0) * L.ppd, (L.lon1 - lon) * L.ppd); if (m > 2) h = lerpN(h, sampleD(L, lat, lon), sstep(m, 2, 22)); } return h; }
// the generated detail, below MOLA's resolution: gentle undulation and small craters' worth of roughness on the plateau; on the walls, spurs and gullies
// running downslope, and ledges where the harder layers the walls are cut through stand out as cliffs above benches of softer rock
const SITE = { rimZ: 300, H0: 5000, pads: [] };
function landBase(x, z) { const e = 3, h0 = mola(x, z), sx = (mola(x + e * 60, z) - mola(x - e * 60, z)) / (e * 120), sz = (mola(x, z + e * 60) - mola(x, z - e * 60)) / (e * 120), sl = Math.hypot(sx, sz), wall = sstep(sl, 0.3, 0.6);
  let h = h0 + 18 * (fbm(x / 900, z / 900, 4) - 0.5) + 3 * (fbm(x / 90, z / 90, 3) - 0.5) + 0.25 * (fbm(x / 7, z / 7, 2) - 0.5);
  if (wall > 0) { const wz = sz * sz / (sx * sx + sz * sz + 1e-9), rg = ridged(x / 700, z / 2600, 4) * wz + ridged(z / 700 + 31.7, x / 2600, 4) * (1 - wz); h -= wall * (150 * (Math.pow(1 - rg, 1.5) - 0.22) + 25 * (fbm(x / 160, z / 160, 3) - 0.5) + 7 * Math.sin(h0 / 55 + 3 * fbm(x / 2000, z / 2000, 2))); }
  if (sl > 0.4) { const L = 38 + 22 * fbm(x / 5000 + 3, z / 5000, 2), t = h / L, f = t - Math.floor(t), terr = (Math.floor(t) + sstep(f, 0.45, 0.95)) * L; h = lerpN(h, terr, 0.6 * sstep(sl, 0.4, 0.7)); }
  return h; }
function land(x, z) { let h = landBase(x, z);
  let sw = 0, swh = 0, wmax = 0; for (const P of SITE.pads) { if (x < P.x0 - P.s || x > P.x1 + P.s || z < P.z0 - P.s || z > P.z1 + P.s) continue; const d = Math.max(P.x0 - x, x - P.x1, P.z0 - z, z - P.z1, 0), w = sstep(d, P.s, 2), w4 = w * w * w * w + 1e-6; sw += w4; swh += w4 * P.h; wmax = Math.max(wmax, w); } if (wmax > 0) h = lerpN(h, swh / sw, wmax);
  const C = SITE.cut; if (C && x > C.x0 && x < C.x1 && z > C.z0 && z < C.z1) h = Math.min(h, C.h - Math.max(0, z - C.z0) * 0.8);
  const C2 = SITE.cut2; if (C2 && x > C2.x0 && x < C2.x1 && z > C2.z0 && z < C2.z1) h = Math.min(h, C2.h - Math.max(0, C2.x1 - x) * 0.8);
  return h; }
// colours, from Curiosity's and HiRISE's pictures, muted as the real ones are: dusty butterscotch-brown plains, darker basaltic sand, the walls' alternating light and dark layers, dark talus below them
const MC = Object.fromEntries(Object.entries({ dust: "#9a6a48", dust2: "#ad7c56", sand: "#3e322c", rock: "#7a5a46", rockL: "#b4947a", rockD: "#4a362a", talus: "#4e3c30", bright: "#c4a688" }).map(([k, v]) => [k, new THREE.Color(v)]));
const _gc = new THREE.Color();
function groundColor(h, slope, x, z, out) { const n = fbm(x / 9, z / 9, 3), m = fbm(x / 2400 + 4, z / 2400, 4), m2 = fbm(x / 300 + 9, z / 300, 4), m3 = fbm(x / 9000 + 2, z / 9000 + 7, 4), low = sstep(-h, -1000, 3000), c = _gc.copy(MC.dust).lerp(MC.dust2, sstep(m, 0.4, 0.65));
  // dark basaltic sand: sheets and dune fields, most of all on the canyon floors; pale layered deposits in patches on the floors; bright dust on the high plateau
  c.lerp(MC.sand, 0.75 * sstep(m3 + 0.2 * (m - 0.5) + 0.22 * low, 0.5, 0.66)); c.lerp(MC.sand, 0.5 * sstep(m2 + 0.25 * (m - 0.5), 0.62, 0.72));
  c.lerp(MC.bright, 0.55 * low * sstep(m3, 0.38, 0.3)); c.lerp(MC.bright, 0.25 * sstep(h, 4000, 6000) * sstep(m, 0.45, 0.6));
  // the walls: alternating light and dark layers tens to hundreds of metres thick, then dark talus aprons at their feet
  const layer = 0.5 + 0.5 * Math.sin(h / 85 + 3 * fbm(x / 6000, z / 6000, 2)) * (0.55 + 0.45 * Math.sin(h / 310 + 1.3)), rk = new THREE.Color().copy(MC.rockD).lerp(MC.rockL, layer);
  c.lerp(rk, sstep(slope, 0.3, 0.75)); c.lerp(MC.talus, 0.5 * sstep(slope, 0.2, 0.35) * (1 - sstep(slope, 0.45, 0.7)));
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
const ambL = new THREE.HemisphereLight(0xd8a070, 0x5a3420, 0.45); scene.add(ambL);
// the dust: horizontal visibility of tens of kilometres; the far wall, 100 km off, is a pale shape in the haze
scene.fog = new THREE.FogExp2(0xc89a6c, 1 / 60000);
const _sv = V3(0, 0, 0);
function updateSky() { const s = sunDir(tSec), day = sstep(s.y, -0.15, 0.15); skyU.sun.value.copy(s); skyU.day.value = day;
  SUN.position.copy(s).multiplyScalar(SKYR * 0.9); SUN.scale.setScalar(SKYR * 0.9 * Math.tan(0.175 * DEG)); SUNG.position.copy(SUN.position); SUNG.scale.setScalar(SKYR * 0.9 * 0.05); SUN.visible = SUNG.visible = s.y > -0.03;
  STARS.material.opacity = 1 - sstep(s.y, -0.2, -0.02);
  MOONS.forEach((m, k) => { const { v, dist } = moonVec(m, tSec), me = MOONM[k]; me.position.copy(v).multiplyScalar(SKYR * 0.8); me.scale.setScalar(SKYR * 0.8 * m.r / dist); me.visible = v.y > -0.02; me.material.uniforms.sun.value.copy(s); me.material.uniforms.day.value = day; m.v = v; m.dist = dist; });
  const lit = sstep(s.y, -0.05, 0.25); sunL.intensity = 2.6 * lit; sunL.color.setRGB(1, 0.86 + 0.08 * lit, 0.72 + 0.14 * lit); ambL.intensity = 0.05 + 0.42 * sstep(s.y, -0.15, 0.3);
  scene.fog.color.setRGB(0.78, 0.6, 0.42).multiplyScalar(0.03 + 0.97 * sstep(s.y, -0.15, 0.25)); return s; }

// ---------- the ground: nested grids following you, the surface curving away (Mars is small: from eye height on flat ground the horizon is 3.4 km off) ----------
// a tiling noise texture: four independent noises (smooth, pebbly, ridged, fine grain), sampled at several scales by the ground's shader
const noiseT = (() => { const N = 256, d = new Uint8Array(N * N * 4), lat = (seed, f) => { const g = new Float32Array(f * f); for (let i = 0; i < f * f; i++) g[i] = hash(i + seed * 7919, seed); return g; };
  const vnw = (g, f, x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), at = (a, b) => g[((b % f + f) % f) * f + ((a % f + f) % f)]; return lerpN(lerpN(at(i, j), at(i + 1, j), u), lerpN(at(i, j + 1), at(i + 1, j + 1), u), v); };
  const oct = [4, 8, 16, 32, 64].map((f, k) => [f, lat(k + 1, f)]), oct2 = [16, 32, 64, 128].map((f, k) => [f, lat(k + 11, f)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let a = 0, w = 0, amp = 1; for (const [f, g] of oct) { a += amp * vnw(g, f, x / N * f, y / N * f); w += amp; amp *= 0.55; } a /= w;
    let r = 0, w2 = 0; amp = 1; for (const [f, g] of oct2) { r += amp * (1 - Math.abs(2 * vnw(g, f, x / N * f, y / N * f) - 1)); w2 += amp; amp *= 0.5; } r /= w2;
    const peb = vnw(oct2[2][1], 64, x / N * 64, y / N * 64), fine = hash(x, y + 999); const o = (y * N + x) * 4; d[o] = a * 255; d[o + 1] = Math.pow(peb, 3) * 255; d[o + 2] = r * 255; d[o + 3] = fine * 255; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
// the shader works in coordinates near you; for each scale of noise the far-off part of your position is reduced here, in double precision, to a fraction of a tile
const NSC = [37, 5.3, 0.83, 290, 23, 4.1, 0.9, 0.31, 3.0, 2600, 11000], groundU = { nTex: { value: noiseT }, org: { value: new THREE.Vector2() }, nOff: { value: NSC.map(() => new THREE.Vector2()) } };
function setNoiseOrigin(x, z) { groundU.org.value.set(x, z); NSC.forEach((sc, i) => groundU.nOff.value[i].set(((x / sc) % 1 + 1) % 1, ((z / sc) % 1 + 1) % 1)); }
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
groundMat.onBeforeCompile = sh => { sh.uniforms.nTex = groundU.nTex; sh.uniforms.org = groundU.org; sh.uniforms.nOff = groundU.nOff;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vWN;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * normal);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform sampler2D nTex; uniform vec2 org; uniform vec2 nOff[11]; varying vec3 vWP; varying vec3 vWN;
float gH(vec2 p, float near, float fine) { return texture2D(nTex, p / 23.0 + nOff[4]).r * 0.9 + texture2D(nTex, p / 4.1 + nOff[5]).r * 0.35 * near + texture2D(nTex, p / 0.9 + nOff[6]).g * 0.1 * fine + texture2D(nTex, p / 0.31 + nOff[7]).a * 0.012 * fine; }`)
  .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 wp = vWP.xz; float dist = length(vWP - cameraPosition), near = 1.0 - smoothstep(25.0, 260.0, dist), fine = 1.0 - smoothstep(3.0, 22.0, dist), mid = 1.0 - smoothstep(400.0, 4000.0, dist), steep = smoothstep(0.55, 0.85, 1.0 - vWN.y);
  vec4 n1 = texture2D(nTex, wp / 37.0 + nOff[0]), n2 = texture2D(nTex, wp / 5.3 + nOff[1]), n3 = texture2D(nTex, wp / 0.83 + nOff[2]), n4 = texture2D(nTex, wp / 290.0 + nOff[3]);
  float tone = mix(1.0, 0.8 + 0.4 * n4.r, mid) * mix(1.0, (0.86 + 0.28 * n1.r) * (0.9 + 0.2 * n2.r), mid);
  float peb = fine * smoothstep(0.4, 0.75, n3.g) * (1.0 - steep); vec3 pebC = diffuseColor.rgb * mix(0.62, 1.08, n3.a);
  vec3 col = diffuseColor.rgb * tone; col = mix(col, pebC, peb * 0.6);
  float strata = 0.5 + 0.5 * sin(vWP.y * 0.9 + n1.r * 6.0) * sin(vWP.y * 0.23 + 1.0); col *= mix(1.0, 0.85 + 0.3 * strata, steep * mid);
  col *= mix(1.0, 0.96 + 0.08 * n3.a, fine);
  vec4 n5 = texture2D(nTex, wp / 2600.0 + nOff[9]), n6 = texture2D(nTex, wp / 11000.0 + nOff[10]); col *= (0.84 + 0.32 * n5.r) * (0.86 + 0.28 * n6.r); diffuseColor.rgb = col;`)
  .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  { float e = 0.08, h0 = gH(wp, near, fine), hx = gH(wp + vec2(e, 0.0), near, fine), hz = gH(wp + vec2(0.0, e), near, fine); vec3 g = vec3(-(hx - h0) / e, 0.0, -(hz - h0) / e) * (0.3 + 0.7 * near) * (1.0 - 0.6 * steep);
    normal = normalize(normal + (viewMatrix * vec4(g, 0.0)).xyz * 0.45); }`)
  .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = 0.88 + 0.1 * texture2D(nTex, vWP.xz / 3.0 + nOff[8]).r;"); };
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, x0: 0, z0: 0 };
function grid(size, n, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(90, 90, 0), grid(500, 110, 0.3), grid(4000, 128, 2), grid(24000, 150, 12), grid(120000, 160, 60), grid(600000, 90, 400)] : [grid(100, 100, 0), grid(600, 160, 0.3), grid(4000, 180, 2), grid(24000, 200, 12), grid(120000, 200, 60), grid(600000, 120, 400)];
for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, uv = m.geometry.attributes.uv, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    let y = H[i] - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_M) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 40 + drop * 4; }
    p.setY(i, y); groundColor(H[i], slope, x, z, c3); col.setXYZ(i, c3[0], c3[1], c3[2]); uv.setXY(i, ((x % 4000) + 4000) / 2.5, ((z % 4000) + 4000) / 2.5); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = uv.needsUpdate = true; m.geometry.computeVertexNormals(); }
// the height of the ground as drawn (the finest grid covering the point, interpolated across its triangle): rocks sit on what you see
function meshY(x, z) { for (const m of GRIDS) { const { size, n, ox, oz } = m.userData; if (ox === undefined) continue; const step = size / n, fx = (x - ox + size / 2) / step, fz = (z - oz + size / 2) / step; if (fx < 2 || fz < 2 || fx > n - 2 || fz > n - 2) continue;
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, P = m.geometry.attributes.position, Y = (i, k) => P.getY(k * (n + 1) + i), ya = Y(ix, iz), yb = Y(ix, iz + 1), yc = Y(ix + 1, iz + 1), yd = Y(ix + 1, iz);
    return u + v < 1 ? ya + u * (yd - ya) + v * (yb - ya) : yc + (1 - u) * (yb - yc) + (1 - v) * (yd - yc); } return land(x, z) - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_M); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * 0.06) { fillGrid(m); if (!force) return; } }
// boulders: sparse on the dusty plateau, many on the talus below the rim
// rocks: angular blocks, a few on the dusty plateau, many on the talus below the rim and the walls; pebbles round your feet. Their surfaces get the same drawn-in grain
const rockGeo = (seed, det) => { const g = new THREE.IcosahedronGeometry(1, det), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.62 + 0.55 * vn(x * 1.7 + seed, y * 1.7 + z * 1.3 + seed * 2), f = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) * 0.35 + 0.65; p.setXYZ(i, x * k / f, y * k * 0.62 / f, z * k / f); } g.computeVertexNormals(); return g.index ? g.toNonIndexed() : g; };
const rockMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
rockMat.onBeforeCompile = sh => { sh.uniforms.nTex = groundU.nTex; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vRP;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvRP = position * 3.0 + vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]) * 0.37;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D nTex; varying vec3 vRP;").replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb *= (0.7 + 0.4 * texture2D(nTex, vRP.xz * 0.21 + vRP.y * 0.13).r) * (0.85 + 0.25 * texture2D(nTex, vRP.xy * 0.9).a);"); };
const ROCKS = [0, 1, 2].map(k => { const m = new THREE.InstancedMesh(rockGeo(k * 13 + 1, k === 2 ? 0 : 1), rockMat, 900); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; });
const PEB = new THREE.InstancedMesh(rockGeo(77, 0), rockMat, IS_HEADSET ? 1500 : 3000); PEB.frustumCulled = false; PEB.receiveShadow = true; scene.add(PEB);
let rockC = [1e12, 1e12];
function fillRocks() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), cnt = [0, 0, 0]; const S = 1.8, ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S); rockC = [ME.x, ME.z];
  const place = (M, k, x, z, sz, i, j) => { q.setFromEuler(new THREE.Euler(hash(i, 1) * 0.6, hash(j, 2) * 6.3, hash(i, j) * 0.6)); m4.compose(V3(x - ME.x0, meshY(x, z) + sz * 0.12, z - ME.z0), q, V3(sz * (0.8 + 0.5 * hash(i, 7)), sz, sz * (0.8 + 0.5 * hash(j, 9)))); M.setMatrixAt(k, m4);
    const v = hash(i + 4, j + 8), w = hash(i + 6, j + 1); col.setRGB(0.27 + 0.16 * v, 0.2 + 0.1 * v + 0.03 * w, 0.16 + 0.06 * v + 0.04 * w); M.setColorAt(k, col); };
  for (let i = ci - 34; i <= ci + 34; i++) for (let j = cj - 34; j <= cj + 34; j++) { const x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S, sl = Math.abs(land(x, z + 4) - land(x, z - 4)) / 8 + Math.abs(land(x + 4, z) - land(x - 4, z)) / 8;
    if (hash(i * 3 + 1, j * 7 + 2) > 0.03 + 0.35 * sstep(sl, 0.2, 0.6) || inBuilt(x, z)) continue; const t = Math.floor(hash(i + 2, j + 5) * 3); if (cnt[t] >= 900) continue; const sz = 0.05 + (0.35 + 1.1 * sstep(sl, 0.2, 0.7)) * Math.pow(hash(i + 9, j + 3), 3); place(ROCKS[t], cnt[t]++, x, z, sz, i, j); }
  ROCKS.forEach((M, t) => { M.count = cnt[t]; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; });
  let k = 0; const P = 0.45, pi = Math.floor(ME.x / P), pj = Math.floor(ME.z / P), N = PEB.instanceMatrix.count;
  for (let i = pi - 30; i <= pi + 30 && k < N; i++) for (let j = pj - 30; j <= pj + 30 && k < N; j++) { if (hash(i * 5 + 3, j * 11 + 1) > 0.55) continue; const x = (i + hash(i + 1, j)) * P, z = (j + hash(j + 1, i)) * P; if (inBuilt(x, z)) continue; place(PEB, k++, x, z, 0.015 + 0.07 * Math.pow(hash(i + 3, j + 7), 2.5), i + 500, j + 500); }
  PEB.count = k; PEB.instanceMatrix.needsUpdate = true; if (PEB.instanceColor) PEB.instanceColor.needsUpdate = true; }

// ---------- the colony (imagined): the Coprates Rim Hotel and what is round it ----------
// Built in hotel coordinates (x east, z south of the hotel's centre point, y up from the graded pad), placed on the ground once MOLA is loaded.
const COL = new THREE.Group(); scene.add(COL);
const WALLS = [], FLOORS = [], CIRCLES = [];
const inBuilt = (x, z) => inPress(x, z) || PRESS.some(P => P.t === "seg" && (() => { const dx = P.bx - P.ax, dz = P.bz - P.az, t = clampN(((x - P.ax) * dx + (z - P.az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - P.ax - dx * t, z - P.az - dz * t) < 4.5; })()) || FLOORS.some(F => x > F.x0 - 1 && x < F.x1 + 1 && z > F.z0 - 1 && z < F.z1 + 1) || CIRCLES.some(C => Math.hypot(x - C.x, z - C.z) < C.r + 1);
const Mt = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const glassM = new THREE.MeshStandardMaterial({ color: 0x9ab8c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
const frameM = Mt(0xd8d4cc, { metalness: 0.5, roughness: 0.35 }), floorM = Mt(0x8a7a6a, { roughness: 0.7 }), regM = Mt(0xa86e48, { roughness: 1, side: THREE.DoubleSide }), whiteM = Mt(0xeeeae2), darkM = Mt(0x2a2826), warmM = new THREE.MeshBasicMaterial({ color: 0xffd8a0 }), greenM = Mt(0x4a8a3a, { roughness: 0.8 });
function put(geo, mat, x, y, z, ry = 0, parent = COL) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = mat !== glassM; m.receiveShadow = true; parent.add(m); return m; }
let PAD_H = 5000;
// the height to level a patch at: the mean of the ground over it (its middle, corners and edges)
function padH(x0, x1, z0, z1) { let t = 0; for (const u of [0, 0.5, 1]) for (const v of [0, 0.5, 1]) t += landBase(lerpN(x0, x1, u), lerpN(z0, z1, v)); return t / 9; }
function buildColony() {
  // where the rim breaks: scan south from the hotel point for the first slope steeper than 22 degrees
  let rimZ = 0; for (let z = -400; z < 2000; z += 4) if (mola(0, z + 30) - mola(0, z) < -12) { rimZ = z; break; }
  SITE.rimZ = rimZ; PAD_H = Math.round(padH(-18, 18, rimZ - 26, rimZ - 3)); SITE.H0 = PAD_H;
  const pad = (x0, x1, z0, z1, h, s = 45) => { SITE.pads.push({ x0, x1, z0, z1, h, s }); return h; };
  pad(-22, 22, rimZ - 26, rimZ - 3, PAD_H - 0.4, 45); pad(-20, 20, rimZ - 3, rimZ + 1, PAD_H - 0.4, 3);
  const site = (x, z, r) => pad(x - r, x + r, z - r, z + r, Math.round(padH(x - r, x + r, z - r, z + r)) - 0.4, 45) - PAD_H + 0.4; SITE.cut = { x0: -14, x1: 14, z0: rimZ + 1, z1: rimZ + 45, h: PAD_H - 2 };
  const ST = { x: -150, z: rimZ - 210 }, RP = { x: 260, z: rimZ - 1500 }, SA = { x: -250, z: rimZ - 230 };
  RP.h = pad(RP.x - 46, RP.x + 46, RP.z - 46, RP.z + 46, Math.round(padH(RP.x - 46, RP.x + 46, RP.z - 46, RP.z + 46)) - 0.4) - PAD_H + 0.4; ST.h = 0; SA.h = 0; Object.assign(SITE, { ST, RP, SA });
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
  pane(L.x0, L.z0, -1.5, L.z0, H); pane(1.5, L.z0, L.x1, L.z0, H);
  pane(D.x0, D.z0, D.x0, D.z1, Hd); pane(D.x1, D.z0, D.x1, D.z1, Hd); pane(D.x0, D.z1, D.x1, D.z1, Hd);
  put(new THREE.PlaneGeometry(D.x1 - D.x0, D.z1 - D.z0).rotateX(Math.PI / 2), glassM, 0, 0.3 + Hd, (D.z0 + D.z1) / 2); for (let z = D.z0; z <= D.z1; z += 4) put(new THREE.BoxGeometry(D.x1 - D.x0, 0.16, 0.16), frameM, 0, 0.3 + Hd, z);
  put(new THREE.PlaneGeometry(14, 0.01), glassM, 0, 0.3 + H, L.z1);
  put(new THREE.PlaneGeometry(L.x1 - L.x0, L.z1 - L.z0).rotateX(Math.PI / 2), glassM, 0, 0.3 + H, (L.z0 + L.z1) / 2); for (let x = L.x0; x <= L.x1; x += 4) put(new THREE.BoxGeometry(0.18, 0.18, L.z1 - L.z0), frameM, x, 0.3 + H, (L.z0 + L.z1) / 2);
  put(new THREE.BoxGeometry(14.4, 0.4, 0.4), frameM, 0, 0.3 + Hd, L.z1); put(new THREE.PlaneGeometry(14, H - Hd), glassM, 0, 0.3 + Hd + (H - Hd) / 2, L.z1);
  // inside: benches facing the canyon, planters with real plants (the lounge is warm and at a comfortable pressure), a bar along the north wall
  for (const x of [-12, -6, 6, 12]) { put(new THREE.BoxGeometry(4, 0.45, 0.8), Mt(0x5a3a2a), x, 0.52, L.z1 - 4); put(new THREE.BoxGeometry(4, 0.6, 0.12), Mt(0x5a3a2a), x, 0.95, L.z1 - 4.4); }
  for (const x of [-16, 16]) for (const z of [L.z0 + 2, L.z1 - 2]) { put(new THREE.CylinderGeometry(0.7, 0.6, 0.8, 12), whiteM, x, 0.7, z); const leaf = put(new THREE.IcosahedronGeometry(0.9, 1), greenM, x, 1.7, z); leaf.scale.set(1, 1.3, 1); }
  { const bx = L.x0 + 1.4, bz = (L.z0 + L.z1) / 2; put(new THREE.BoxGeometry(1.0, 1.1, 8), Mt(0x3a2a22), bx, 0.85, bz); put(new THREE.BoxGeometry(1.2, 0.08, 8.2), whiteM, bx, 1.44, bz); WALLS.push([bx - 0.6, bz - 4, bx - 0.6, bz + 4], [bx + 0.6, bz - 4, bx + 0.6, bz + 4]); }
  for (let x = -14; x <= 14; x += 4) { const lp = put(new THREE.SphereGeometry(0.18, 10, 8), warmM, x, 0.3 + H - 0.5, (L.z0 + L.z1) / 2); }
  { const ac = document.createElement("canvas"); ac.width = ac.height = 128; const g = ac.getContext("2d"); g.fillStyle = "#60ff90"; g.beginPath(); g.moveTo(64, 10); g.lineTo(118, 70); g.lineTo(84, 70); g.lineTo(84, 118); g.lineTo(44, 118); g.lineTo(44, 70); g.lineTo(10, 70); g.closePath(); g.fill();
    const am = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ac), transparent: true, depthWrite: false }); for (let z = L.z1 - 5; z > L.z0 - 7; z -= 2.5) { const a = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), am); a.position.set(0, 0.33, z); a.renderOrder = 5; COL.add(a); } }
  const lampL = new THREE.PointLight(0xffd0a0, 18, 30, 1.6); lampL.position.set(0, 4.5, (L.z0 + L.z1) / 2); COL.add(lampL);
  // the doorway north, onto the corridor to the hotel's hub
  { const sc = document.createElement("canvas"); sc.width = 512; sc.height = 128; const g = sc.getContext("2d"); g.fillStyle = "#16243a"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#ffffff"; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.fillText("HOTEL LOBBY  ▸", 256, 58); g.font = "28px sans-serif"; g.fillStyle = "#ffd890"; g.fillText("lift · maglev · rovers · rocket port", 256, 102);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; put(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: st }), 0, 3.6, L.z0 + 0.05); put(new THREE.BoxGeometry(3.4, 0.3, 0.3), frameM, 0, 3.0, L.z0); }
  PRESS.push({ t: "rect", x: 0, z: (L.z0 + L.z1) / 2, yaw: 0, hw: 18, hl: 8 }, { t: "rect", x: 0, z: (D.z0 + D.z1) / 2, yaw: 0, hw: 7, hl: 12 });
  // the hotel itself: rooms carved into the cliff below the rim, each with a window; from outside, rows of lit windows in the rock
  HOTELW.length = 0; for (let lv = 0; lv < 6; lv++) for (let k = -5; k <= 5; k++) { const x = k * 14 + (lv % 2) * 7, z0 = R0 + 30 + lv * 35; let z = z0; while (land(x, z) > PAD_H - 20 - lv * 40 && z < R0 + 600) z += 2; HOTELW.push([x, z, land(x, z)]); }
  // the rocket pad, 1.5 km north (rockets need room); the solar field; and the rest of the hotel, joined by corridors (buildComplex)
  { const x = SITE.RP.x, z = SITE.RP.z, y0 = SITE.RP.h; put(new THREE.CylinderGeometry(40, 42, 1, 48), Mt(0x6a6660), x, y0 + 0.4, z); 
    CIRCLES.push({ x, z, r: 6 }); }
  for (let k = 0; k < 8; k++) for (let j = 0; j < 3; j++) { const px = SITE.SA.x - 63 + k * 18, pz = SITE.SA.z + 9 - j * 9, gy = Math.min(land(px - 7, pz), land(px + 7, pz), land(px, pz - 2), land(px, pz + 2)) - PAD_H; const p = put(new THREE.BoxGeometry(16, 0.2, 6), Mt(0x1a2a44, { metalness: 0.6, roughness: 0.3 }), px, gy + 1.6, pz); p.rotation.x = -0.5; for (const sx of [-6, 6]) put(new THREE.BoxGeometry(0.15, 1.8, 0.15), frameM, px + sx, gy + 0.8, pz); }
  buildComplex(R0);
  LIFTLINE.length = 0; { const x = SITE.LIFT.x; let z = SITE.LIFT.z + 11; while (z < R0 + 60000) { const h = land(x, z); LIFTLINE.push([x, z, h + 4]); if (h < -4600) break; z += z < R0 + 3000 ? 40 : 300; } }
  COL.position.set(-ME.x0, PAD_H, -ME.z0); }
const HOTELW = [], LIFTLINE = [];
let winMesh = null, liftMesh = null;
function buildFar() { const wg = new THREE.BoxGeometry(6, 0.12, 2.2), wm = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: 0.08, metalness: 0.2, emissive: 0xffb060, emissiveIntensity: 0.12 }), HOTELW.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  HOTELW.forEach(([x, z, h], i) => { const nrm = V3(land(x - 2, z) - land(x + 2, z), 4, land(x, z - 2) - land(x, z + 2)).normalize(); q.setFromUnitVectors(V3(0, 1, 0), nrm); wm.setMatrixAt(i, m4.compose(V3(x, h + 0.04, z), q, V3(1, 1, 1))); }); winMesh = wm; scene.add(wm);
  const pts = LIFTLINE.map(([x, z, h]) => V3(x, h - (x * x + (z - SITE.rimZ) ** 2) / (2 * R_M), z)), g = new THREE.BufferGeometry().setFromPoints(pts); liftMesh = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe8e0d0 })); scene.add(liftMesh);
  const lights = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts.filter((_, i) => i % 2 === 0)), new THREE.PointsMaterial({ color: 0xffc060, size: 3, sizeAttenuation: false, fog: false })); liftMesh.add(lights); }

// ---------- you: in the lounge at first; the hotel's corridors join everything; you wear a suit only if you go outside, through a suitport ----------
const keys = {}, prevB = {}; let yaw = Math.PI, pitch = -0.12, vrYaw = yaw, started = false, seated = false, hud = true, msgT = 0, msgAge = 0, walked = 0, dose = 0, rateI = 0, factI = -1, tagsOn = true, ready = false;
let wasInside = null, lastHint = "";
const RATES = [[1, "real time"], [60, "a minute a second"], [600, "ten minutes a second"], [3600, "an hour a second"]];
const FACTS = [
  "<b>Coprates Chasma</b>, the eastern trunk of Valles Marineris. Below this rim the ground falls 10 km to the canyon floor, 50 km to the south: from the edge you look down on the tops of the haze. The south wall, 100 km away, rises again to 4,300 m. Valles Marineris runs 4,000 km, from the maze of Noctis Labyrinthus in the west to the chaos terrain in the east: as long as the United States is wide, and four times as deep as the Grand Canyon. It is a crack in Mars' crust that opened as the Tharsis volcanoes, just to the west, bulged it up; landslides and water widened it.",
  "<b>The ground is real</b>: the shapes you see are Mars as the laser altimeter on Mars Global Surveyor measured it, a pulse of light every few hundred metres, 1997 to 2001. What is smaller than 463 m (the gullies, the boulders, the layering) is generated, in keeping with the HiRISE and CTX cameras' pictures.",
  "<b>The walls are layered</b>: lava flows, ash and sediment piled up over billions of years before the canyon opened. The spurs and gullies between them are carved by rockfalls and landslides; some of the biggest landslides in the solar system ran out across the canyon floors here.",
  "<b>The sky</b> is butterscotch because the air is full of fine dust, which scatters red light; around the Sun, and at sunset, it turns blue, because the dust grains scatter blue light forward. The air is 0.6% of Earth's (here on the rim, 5 km up, even less): carbon dioxide, too thin to breathe, cold (about −60 °C on average), and water boils away in it.",
  "<b>Phobos and Deimos</b>: Phobos, 22 km long, orbits only 6,000 km above the ground, faster than Mars turns, so it rises in the west and sets in the east, crossing the sky in about four hours, twice a sol. It is spiralling inward and will break up in some 40 million years. Deimos, 12 km long, is a bright star that takes two and a half sols to cross the sky.",
  "<b>The colony is imagined</b>, a few centuries from now, with nothing in it physics would not allow. Mars' surface takes about 0.7 mSv of radiation a day (several hundred times Earth's), so people live under rock or regolith: the domes here are pressurised shells under three metres of piled soil; the hotel's rooms are carved into the cliff below you, their windows set back behind two metres of rock. The lounge is the one room with glass all round; visitors come for an hour.",
  "<b>Gravity is 0.38 g</b>: you weigh about a third of what you do on Earth. Jump (space, or B in VR) and you rise three times as high as at home. A sol, Mars' day, is 24 h 40 min.",
  "<b>Mars, some centuries on</b> (imagined): a few million people in hundreds of settlements, most of them under the ground or under regolith-covered domes, along Valles Marineris, round the Tharsis volcanoes and on the northern plains, where ice lies close under the surface. Their domes dot the canyon floors and rims you can see from here; at night their windows show as lights strung along the canyon. Maglev trains run every few minutes, rockets hop between settlements and carry people to orbit, and stations and satellites cross the night sky. The air outside is still too thin to breathe: thickening it would take far longer.",
  "<b>Getting about</b>: everything a guest uses is joined to the hub by pressurised corridors, buried under regolith against radiation, so you go about in ordinary clothes. The Canyon Lift's car waits inside its station; the maglev's platform is a sealed hall the train docks against; the rover sits in its garage and drives out through the big door; a tram runs in a glass tube to the rocket port. To go outside on foot, use a suitport: in the suit room, the garage, the terminal and the far stations. Mars' air is too thin for ordinary aircraft."];
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
  tag(() => W3(SITE.HUB.x, SITE.HUB.y + 14, SITE.HUB.z), "Hotel hub", () => "lobby, café, park", "<b>The hotel's hub</b> (imagined): a dome 52 m across under three metres of regolith, with the front desk, a café and a small park under grow lights. Corridors run from it to everything: the lounge, the Canyon Lift, the maglev, the rover garage, the greenhouse, the tram to the rocket port and the suit room. The rooms are below, carved into the cliff.");
  tag(() => W3(BLD.garage.x, BLD.garage.y + 10, BLD.garage.z), "Rover garage", () => "pressurised rovers", "<b>The rover garage</b> (imagined): get into the rover inside, in ordinary clothes; the big door opens as you drive out. Rovers carry a suitport on the back for getting out on the open ground.");
  tag(() => W3(BLD.terminal.x, BLD.terminal.y + 9, BLD.terminal.z), "Rocket port terminal", () => "", "<b>The rocket port terminal</b> (imagined): glass walls looking out on the pad, where a rocket lifts off every half hour. Rocket hops reach anywhere on Mars in under an hour.");
  tag(() => W3(BLD.eva.x, BLD.eva.y + 6, BLD.eva.z), "Suit room", () => "suitports for walks outside", "<b>The suit room</b> (imagined): two suitports. A suitport is a suit hanging on the outside wall with its back open to the room: you climb in from inside, seal it, and step away, without an airlock and without bringing dust in.");
  tag(() => W3(SITE.LIFT.x, PAD_H + SITE.LIFT.y + 30, SITE.LIFT.z), "The Canyon Lift", () => "down the wall to the canyon floor", "<b>The Canyon Lift</b> (imagined): a rack railway down the wall, 10 km lower and 48 km south to the canyon floor, a self-levelling glass car at 17 m/s. Walk to the top station and press E.");
  tag(() => W3(SITE.STB.x, MAG_T.Y0 + 9, SITE.STB.z), "Maglev station", () => "to the Melas Overlook, 570 km", "<b>The maglev</b> (imagined): a train floating on magnets over an open guideway on pylons. Mars' air is so thin that even at 1,000 km/h it needs no tube. This line runs 570 km northwest along the plateau to the Melas Overlook. Walk to the platform and press E.");
  tag(() => W3(SITE.FLOOR.x, SITE.FLOOR.y + 20, SITE.FLOOR.z), "Coprates Floor Station", () => "the bottom of the Canyon Lift", "<b>Coprates Floor Station</b> (imagined): the bottom of the Canyon Lift, on the floor of Coprates Chasma, 10 km below the rim.");
  tag(() => W3(SITE.MELAS.x, SITE.MELAS.y + 22, SITE.MELAS.z), "Melas Overlook", () => "the end of the maglev line", "<b>The Melas Overlook</b> (imagined station, real place: 8.0° S, 71.0° W): the edge of the plateau where the ground falls 8 km to the junction of Melas and Candor Chasmata, the widest part of Valles Marineris, 200 km across.");
  tag(() => W3(RV.x, land(RV.x, RV.z) + 5, RV.z), "Rover", () => "E beside it to drive", "<b>The rover</b> (imagined): a pressurised cab on six wheels. Walk up to it and press E.");
  tag(() => W3(SITE.RP.x, PAD_H + SITE.RP.h + 55, SITE.RP.z), "Rocket pad", () => "hops anywhere on Mars", "<b>Rocket hops</b> (imagined, but simple physics): with a third of Earth's gravity and almost no air to fight, a rocket can go anywhere on Mars on a ballistic arc in under an hour: Olympus Mons, the poles, Hellas. The only way to fly far: aircraft need air.");
  tag(() => W3(SITE.GH.x, PAD_H + SITE.GH.y + 30, SITE.GH.z), "Greenhouse", () => "under glass and a water shield", "<b>The greenhouse</b> (imagined): plants need light, so this dome is glass, thick and layered, with water between the layers to soak up radiation. Mars gets 43% of Earth's sunlight, enough for crops.");
  tag(() => SUN.position.clone().add(V3(0, SKYR * 0.03, 0)).add(rig.position), "The Sun", () => "1.52 AU · 43% of Earth's sunlight", FACTS[3], true);
  MOONS.forEach((m, k) => tag(() => MOONM[k].position.clone().add(V3(0, SKYR * 0.012, 0)).add(rig.position), m.n, () => `${fmtKm(m.dist)} · ${(2 * Math.atan(m.r / m.dist) / DEG * 60).toFixed(1)}′ across`, FACTS[4], true).hid = () => !MOONM[k].visible); }
const _cd = V3(0, 0, 0), _cp = V3(0, 0, 0);
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const p = T.get(), d = p.distanceTo(_cp); T.sp.visible = tagsOn && d > 1.2 && !(T.hid && T.hid()) && (T.sky ? p.y - _cp.y > -SKYR * 0.02 : d < 300000); if (!T.sp.visible) continue; T.sp.position.copy(p); const w = clampN(d * 0.1, 0.7, SKYR * 0.2); T.sp.scale.set(w, w / 4, 1);
    const sub = T.subF() + (T.sky ? "" : " · " + fmtKm(d)); if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.09; for (const T of TAGS) { if (!T.sp.visible) continue; const v = T.sp.position.clone().sub(_cp), a = v.normalize().angleTo(_cd); if (a < ba) { ba = a; best = T; } } return best; }
function act() { if (boardOrAct()) return; const T = tagsOn ? lookedAt() : null; if (T) { say(T.info, 50); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${RATES[rateI][1]}.${rateI ? " Watch the shadows move down the walls and Phobos cross the sky." : ""}`, 8); }
function toggleSeated() { seated = !seated; say(seated ? "<b>Sitting mode</b>: your view is raised about 45 cm, to standing height. (M, or click the left stick, for standing.)" : "<b>Standing mode</b>: your own height.", 8); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyT") setRate(rateI + 1); if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyR") toStart(); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function toStart() { ME.x = 0; ME.z = SITE.rimZ - 3; ME.y = PAD_H + 0.3; ME.vx = ME.vz = ME.vy = 0; }
function start() { if (started || !ready) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block";
  say("<b>The Coprates Rim Hotel, Mars, some centuries from now.</b> You are in its observation lounge, at the very edge of Valles Marineris: in front of you the ground falls 10 km to the floor of Coprates Chasma. Walk out on the glass-floored deck. Behind you, the doorway (follow the green arrows) leads along a corridor to the hotel's hub, and from there, all indoors, to the Canyon Lift, the maglev, the rover garage, the greenhouse, the tram to the rocket port and the suit room. <b>E</b> tells you about whatever you look at (A in VR); <b>T</b> speeds up time.", 40); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { if (!ready) return; const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// where you stand: on a floor if over one, else on the ground; walls and domes stop you
function floorAt(x, z) { for (const F of FLOORS) if (x > F.x0 && x < F.x1 && z > F.z0 && z < F.z1) return PAD_H + F.y; return null; }
function standY(x, z) { const f = floorAt(x, z), g = land(x, z); return f !== null && f > g - 2 ? f : g; }
function collide(ox, oz) { ringCollide(ox, oz); const r = 0.35; for (const [x0, z0, x1, z1] of WALLS) { const dx = x1 - x0, dz = z1 - z0, L2 = dx * dx + dz * dz, t = clampN(((ME.x - x0) * dx + (ME.z - z0) * dz) / L2, 0, 1), px = x0 + dx * t, pz = z0 + dz * t, d = Math.hypot(ME.x - px, ME.z - pz);
    if (d < r && ME.y < PAD_H + 6.5) { const nx = (ME.x - px) / (d || 1), nz = (ME.z - pz) / (d || 1); ME.x = px + nx * r; ME.z = pz + nz * r; } }
  for (const C of CIRCLES) { const d = Math.hypot(ME.x - C.x, ME.z - C.z); if (d < C.r) { ME.x = C.x + (ME.x - C.x) / d * C.r; ME.z = C.z + (ME.z - C.z) / d * C.r; } } }
const insideNow = () => inPress(ME.x, ME.z);

// ---------- getting about (imagined): the Canyon Lift down the wall, a pressurised rover, the maglev to the Melas Overlook ----------
// The tracks are drawn only within a few kilometres of you, rebuilt as you go, so they follow the curve of the ground.
const llXZ = (lat, lon) => [(lon - LON0) * DEG * R_M * Math.cos(lat * DEG), (LAT0 - lat) * DEG * R_M];
const REMOTE = [];
function remote(x, z) { const g = new THREE.Group(); g.userData = { x, z, y: Math.round(mola(x, z)) }; scene.add(g); REMOTE.push(g); return g; }
const trackM = { lift: Mt(0x8a8680, { metalness: 0.4, roughness: 0.5 }), mag: Mt(0xd8d4cc, { metalness: 0.5, roughness: 0.35 }), tram: Mt(0x8a8680, { metalness: 0.4, roughness: 0.5 }) };
const TRACKS = [];
function makeTrack(kind, pts, w, h, pylonEvery) { const T = { kind, pts, w, h, pylonEvery, mesh: null, pyl: null, c: [1e12, 1e12], L: 0, cum: [0] }; for (let i = 1; i < pts.length; i++) T.cum.push(T.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2])); T.L = T.cum[T.cum.length - 1];
  T.pyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.8, 1, 8).translate(0, 0.5, 0), trackM[kind], 200); T.pyl.frustumCulled = false; T.pyl.castShadow = true; scene.add(T.pyl); TRACKS.push(T); return T; }
function trackAt(T, s) { s = clampN(s, 0, T.L); let lo = 0, hi = T.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.cum[m] <= s) lo = m; else hi = m; } const a = T.pts[lo], b = T.pts[hi], t = (s - T.cum[lo]) / Math.max(1e-6, T.cum[hi] - T.cum[lo]);
  return { x: lerpN(a[0], b[0], t), z: lerpN(a[1], b[1], t), y: lerpN(a[2], b[2], t), dx: b[0] - a[0], dz: b[1] - a[1], dy: b[2] - a[2] }; }
function drawTrack(T) { const R = 3000; T.c = [ME.x, ME.z]; const pos = [], m4 = new THREE.Matrix4(); let np = 0;
  const box = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, sx = -dz / L * T.w / 2, sz = dx / L * T.w / 2, ya = a[2] + curveY(a[0], a[1]), yb = b[2] + curveY(b[0], b[1]), P = [];
    for (const [p, y] of [[a, ya], [b, yb]]) for (const sgn of [-1, 1]) for (const up of [0, -T.h]) P.push([p[0] + sx * sgn - ME.x0, y + up, p[1] + sz * sgn - ME.z0]);
    const q = (i, j, k, l) => { pos.push(...P[i], ...P[j], ...P[k], ...P[i], ...P[k], ...P[l]); }; q(0, 2, 6, 4); q(1, 5, 7, 3); q(0, 4, 5, 1); q(2, 3, 7, 6); q(0, 1, 3, 2); q(4, 6, 7, 5); };
  for (let i = 0; i < T.pts.length - 1; i++) { const a = T.pts[i]; if (Math.abs(a[0] - ME.x) > R || Math.abs(a[1] - ME.z) > R) continue; box(a, T.pts[i + 1]);
    if (i % T.pylonEvery === 0 && np < 200) { const g = land(a[0], a[1]), top = a[2] - T.h; if (top - g > 1) { m4.compose(V3(a[0] - ME.x0, g + curveY(a[0], a[1]) - 1, a[1] - ME.z0), new THREE.Quaternion(), V3(1, top - g + 1, 1)); T.pyl.setMatrixAt(np++, m4); } } }
  T.pyl.count = np; T.pyl.instanceMatrix.needsUpdate = true; if (T.mesh) { scene.remove(T.mesh); T.mesh.geometry.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); T.mesh = new THREE.Mesh(g, trackM[T.kind]); T.mesh.castShadow = T.mesh.receiveShadow = true; T.mesh.frustumCulled = false; scene.add(T.mesh); T.x0 = ME.x0; T.z0 = ME.z0; }
function updateTracks() { for (const T of TRACKS) if (Math.hypot(ME.x - T.c[0], ME.z - T.c[1]) > 400 || T.x0 !== ME.x0 || T.z0 !== ME.z0) drawTrack(T); }
// cabins: the lift's level glass car, the maglev's long car with a band of windows
function liftCar() { const g = new THREE.Group(), add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  add(new THREE.BoxGeometry(3.2, 0.3, 6), floorM, 0, 0.15, 0); add(new THREE.BoxGeometry(3.4, 0.25, 6.2), frameM, 0, 2.9, 0);
  for (const x of [-1.6, 1.6]) for (const z of [-3, -1, 1, 3]) add(new THREE.BoxGeometry(0.12, 2.8, 0.12), frameM, x, 1.5, z);
  for (const [w, d, x, z] of [[0.02, 6, -1.6, 0], [0.02, 6, 1.6, 0], [3.2, 0.02, 0, -3], [3.2, 0.02, 0, 3]]) add(new THREE.BoxGeometry(w, 2.6, d), glassM, x, 1.45, z);
  for (const x of [-1.15, 1.15]) add(new THREE.BoxGeometry(0.6, 0.45, 4.4), Mt(0x5a3a2a), x, 0.5, 0); add(new THREE.BoxGeometry(1.2, 1.2, 1.2), Mt(0x6a6660), 0, 3.6, 0);
  const l = new THREE.PointLight(0xffd8b0, 4, 8, 1.6); l.position.set(0, 2.6, 0); g.add(l); g.visible = false; scene.add(g); return g; }
function magCar() { const g = new THREE.Group(), body = Mt(0xe8e4dc, { metalness: 0.4, roughness: 0.3, side: THREE.DoubleSide }), add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  add(new THREE.BoxGeometry(3.4, 0.3, 30), floorM, 0, 0.15, 0); add(new THREE.BoxGeometry(3.6, 0.3, 30), body, 0, 3.0, 0); add(new THREE.BoxGeometry(3.6, 0.6, 30), body, 0, -0.2, 0);
  for (const x of [-1.75, 1.75]) { add(new THREE.BoxGeometry(0.1, 0.9, 30), body, x, 0.6, 0); add(new THREE.BoxGeometry(0.1, 0.7, 30), body, x, 2.55, 0); add(new THREE.BoxGeometry(0.04, 1.2, 30), glassM, x, 1.65, 0); for (let z = -14; z <= 14; z += 2) add(new THREE.BoxGeometry(0.14, 1.2, 0.18), body, x, 1.65, z); }
  for (const z of [-15, 15]) add(new THREE.BoxGeometry(3.6, 3.2, 0.1), body, 0, 1.45, z); const nose = add(new THREE.SphereGeometry(1.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), body, 0, 1.4, -15); nose.rotation.x = -Math.PI / 2; nose.scale.set(1, 3, 0.9);
  for (let z = -12; z <= 12; z += 2) for (const x of [-1.05, 1.05]) add(new THREE.BoxGeometry(0.9, 0.5, 0.6), Mt(0x3a4a6a), x, 0.55, z);
  const l = new THREE.PointLight(0xfff0e0, 6, 14, 1.4); l.position.set(0, 2.6, 0); g.add(l); g.visible = false; scene.add(g); return g; }
function roverMesh() { const g = new THREE.Group(), white = Mt(0xe8e4dc, { metalness: 0.3, roughness: 0.4 }), add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  add(new THREE.BoxGeometry(2.8, 0.4, 6.2), Mt(0x3a3a3c), 0, 0.9, 0); add(new THREE.BoxGeometry(2.6, 0.2, 5.2), white, 0, 1.2, 0.3); add(new THREE.BoxGeometry(2.6, 0.2, 5.2), white, 0, 3.2, 0.3);
  for (const x of [-1.3, 1.3]) { add(new THREE.BoxGeometry(0.1, 0.8, 5.2), white, x, 1.6, 0.3); add(new THREE.BoxGeometry(0.06, 1.2, 5.2), glassM, x, 2.6, 0.3); }
  add(new THREE.BoxGeometry(2.6, 2.0, 0.1), white, 0, 2.2, 2.9); add(new THREE.BoxGeometry(2.6, 0.5, 0.1), white, 0, 1.45, -2.3); add(new THREE.BoxGeometry(2.6, 1.5, 0.06), glassM, 0, 2.45, -2.3);
  for (const z of [-2.2, 0, 2.2]) for (const x of [-1.6, 1.6]) { const w = add(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16).rotateZ(Math.PI / 2), Mt(0x2a2a2a), x, 0.62, z); w.userData.wheel = true; }
  add(new THREE.BoxGeometry(0.8, 0.5, 0.6), Mt(0x3a4a6a), -0.6, 1.55, -1.4); add(new THREE.BoxGeometry(0.8, 0.5, 0.6), Mt(0x3a4a6a), 0.6, 1.55, -1.4); add(new THREE.BoxGeometry(2.4, 0.3, 0.4), Mt(0x2a2a2e), 0, 1.55, -2.0);
  add(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), frameM, 0.9, 3.9, 2.0); add(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), whiteM, 0.9, 4.5, 2.0);
  scene.add(g); return g; }
let LIFT_T = null, MAG_T = null, TRAM_T = null, TRAMCAR = null, LIFTCAR = null, MAGCAR = null, ROVER = null, ride = null, drive = null;
const RV = { x: 0, z: 0, yaw: 0, v: 0 };
const STATIONS = [];
function buildTravel() { const R0 = SITE.rimZ;
  // the Canyon Lift: from the top station by the rim, down the wall to the canyon floor, 4 m above the ground on piers, a dense line of points every 25 m
  { const x0 = SITE.LIFT.x, z0 = SITE.LIFT.z - 4, zo = SITE.LIFT.z + 11, pts = []; let z = z0; while (z < R0 + 60000) { const g = land(x0, z); pts.push([x0, z, g + clampN((z - zo) / 30, 0.25, 4)]); if (g < -4700 && z > R0 + 30000) break; z += 25; }
    for (let i = 1; i < pts.length - 1; i++) pts[i][2] = Math.max(pts[i][2], (pts[i - 1][2] + pts[i + 1][2]) / 2); LIFT_T = makeTrack("lift", pts, 3.6, 0.6, 2); }
  // the floor station at the bottom: a pressurised hall the car runs into, with suitports for walks on the canyon floor
  { const e = LIFT_T.pts[LIFT_T.pts.length - 1], Bd = building({ x: e[0], z: e[1] - 4, W: 14, L: 24, H: 5, doors: [{ side: "n", at: 0, w: 4.4, kind: "block" }], name: "floorhall" });
    signBoard(Bd.g, "COPRATES FLOOR STATION", "4,900 m below the areoid", 0, 3.6, 11.8, Math.PI, 6); suitport(Bd, 6.8, 6, [1, 0], "E to suit up and walk on the canyon floor"); suitport(Bd, -6.8, 6, [-1, 0], "E to suit up and walk on the canyon floor");
    e[2] = Bd.y + 0.25; STATIONS.push({ name: "Coprates Floor Station", x: e[0], z: e[1] - 4, track: LIFT_T, s: LIFT_T.L, dir: -1, info: "the Canyon Lift back up to the rim" }); SITE.FLOOR = { x: e[0], z: e[1] + 30, y: Bd.y }; }
  STATIONS.push({ name: "Canyon Lift, top station", x: SITE.LIFT.x, z: SITE.LIFT.z - 2, track: LIFT_T, s: 0, dir: 1, info: "the Canyon Lift down to the floor of Coprates Chasma, 10 km below" });
  // the maglev: an open guideway on pylons (the air is so thin that a train at 1,000 km/h needs no tube), 12 m over the ground, smoothed to gentle grades, northwest along the plateau to the Melas Overlook
  { const way = [[SITE.ST.x, SITE.ST.z]].concat([[-10.5, 295.5], [-9.0, 293.0], [-8.3, 291.0], [-8.05, 289.4], [-8.0, 288.918]].map(([la, lo]) => llXZ(la, lo))), pts = [];
    for (let i = 0; i < way.length - 1; i++) { const [ax, az] = way[i], [bx, bz] = way[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 60); for (let k = 0; k < n; k++) { const t = k / n; pts.push([ax + (bx - ax) * t, az + (bz - az) * t, 0]); } } pts.push([...way[way.length - 1], 0]);
    for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1]; b[0] = (a[0] + b[0] * 2 + c[0]) / 4; b[1] = (a[1] + b[1] * 2 + c[1]) / 4; }
    // the stations are at ground level: the ground is levelled along the first and last 220 m of the line, and the guideway comes down to it there, rising onto its pylons over the next 1.4 km
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); const Ltot = cum[cum.length - 1];
    const lvl = end => { const ks = pts.map((_, k) => k).filter(k => (end ? Ltot - cum[k] : cum[k]) < 120); let t = 0; for (const k of ks) t += landBase(pts[k][0], pts[k][1]); return Math.round(t / ks.length); }, Y0 = Math.round(SITE.near(SITE.ST.x, SITE.ST.z, 30)), Y1 = lvl(true);
    pts.forEach((p, k) => { const d0 = cum[k], d1 = Ltot - cum[k]; if (d0 < 230 || d1 < 230) SITE.pads.push({ x0: p[0] - 7, x1: p[0] + 7, z0: p[1] - 7, z1: p[1] + 7, h: d0 < 230 ? Y0 : Y1, s: 16 }); });
    const G = pts.map(p => land(p[0], p[1])), W = 25; for (let i = 0; i < pts.length; i++) { let s = 0, n = 0; for (let k = Math.max(0, i - W); k <= Math.min(pts.length - 1, i + W); k++) { s += G[k]; n++; } pts[i][2] = Math.max(s / n + 14, G[i] + 8); }
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i][2] = Math.max(G[i] + 8, (pts[i - 1][2] + pts[i][2] * 2 + pts[i + 1][2]) / 4);
    pts.forEach((p, k) => { const r0 = sstep(cum[k], 220, 1600), r1 = sstep(Ltot - cum[k], 220, 1600); p[2] = Math.max(G[k] + 0.3, lerpN(Y0 + 0.3, lerpN(Y1 + 0.3, p[2], r1), r0)); });
    MAG_T = makeTrack("mag", pts, 3.0, 1.4, 1); MAG_T.Y0 = Y0; MAG_T.Y1 = Y1; }
  { const B = magStation(MAG_T, false, "Melas Overlook · 570 km", [SITE.HUB.x, SITE.HUB.z]); STATIONS.push({ name: "Coprates Rim maglev station", x: B.x, z: B.z, track: MAG_T, s: 30, dir: 1, info: "the maglev to the Melas Overlook, 570 km northwest" }); SITE.STB = B;
    const h = SITE.HUB.door(SITE.aMag); corridor(h[0], h[1], B.door[0], B.door[1]); }
  // the Melas Overlook: the station at the end of the line, a viewing pavilion at the plateau's edge, where the ground falls 8 km to where Melas and Candor Chasmata meet
  { const e = MAG_T.pts[MAG_T.pts.length - 1], g = remote(e[0], e[1]), gy = MAG_T.Y1; g.userData.y = gy;
    const P = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
    let rx = e[0]; for (let x = e[0]; x > e[0] - 3000; x -= 4) if (mola(x - 30, e[1]) - mola(x, e[1]) < -12) { rx = x; break; } const px = rx - e[0], ph = Math.round(mola(rx + 20, e[1])) - gy, F = gy - PAD_H + ph + 0.3;
    SITE.pads.push({ x0: rx - 1, x1: rx + 30, z0: e[1] - 10, z1: e[1] + 10, h: gy + ph - 0.4, s: 12 }); SITE.cut2 = { x0: rx - 30, x1: rx + 1, z0: e[1] - 8, z1: e[1] + 8, h: gy + ph - 2 };
    P(new THREE.BoxGeometry(26, 0.4, 16), floorM, px + 13, ph + 0.1, 0); P(new THREE.BoxGeometry(14, 0.12, 8), glassM, px - 7, ph + 0.24, 0); FLOORS.push({ x0: rx, x1: rx + 26, z0: e[1] - 8, z1: e[1] + 8, y: F - 0.0 }, { x0: rx - 14, x1: rx, z0: e[1] - 4, z1: e[1] + 4, y: F, glass: true });
    for (const [x0, z0, x1, z1, hh] of [[px, -8, px, -4, 5], [px, 4, px, 8, 5], [px, -8, px + 26, -8, 5], [px, 8, px + 26, 8, 5], [px + 26, -8, px + 26, -1.5, 5], [px + 26, 1.5, px + 26, 8, 5], [px - 14, -4, px, -4, 3], [px - 14, 4, px, 4, 3], [px - 14, -4, px - 14, 4, 3]]) { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), m = P(new THREE.PlaneGeometry(len, hh), glassM, (x0 + x1) / 2, ph + 0.3 + hh / 2, (z0 + z1) / 2); m.rotation.y = -a; m.castShadow = false; for (let t = 0; t <= len; t += 4) P(new THREE.BoxGeometry(0.16, hh, 0.16), frameM, x0 + (x1 - x0) * t / len, ph + 0.3 + hh / 2, z0 + (z1 - z0) * t / len); WALLS.push([e[0] + x0, e[1] + z0, e[0] + x1, e[1] + z1]); }
    { const r1 = P(new THREE.PlaneGeometry(26, 16).rotateX(Math.PI / 2), glassM, px + 13, ph + 5.3, 0); r1.castShadow = false; const r2 = P(new THREE.PlaneGeometry(14, 8).rotateX(Math.PI / 2), glassM, px - 7, ph + 3.3, 0); r2.castShadow = false; for (let x = 0; x <= 26; x += 4) P(new THREE.BoxGeometry(0.18, 0.18, 16), frameM, px + x, ph + 5.3, 0); for (let x = 0; x <= 14; x += 3.5) P(new THREE.BoxGeometry(0.18, 0.18, 8), frameM, px - x, ph + 3.3, 0); }
    SITE.MELASVIEW = { x: rx + 6, z: e[1] };
    PRESS.push({ t: "rect", x: rx + 13, z: e[1], yaw: 0, hw: 13, hl: 8 }, { t: "rect", x: rx - 7, z: e[1], yaw: 0, hw: 7, hl: 4 });
    const B = magStation(MAG_T, true, "Coprates Rim Hotel · 570 km", [rx + 26, e[1]]); STATIONS.push({ name: "Melas Overlook station", x: B.x, z: B.z, track: MAG_T, s: MAG_T.L - 30, dir: -1, info: "the maglev back to the Coprates Rim Hotel" }); SITE.MELAS = { x: e[0], z: e[1], y: gy };
    corridor(rx + 26, e[1], B.door[0], B.door[1]); suitport(B.b, B.sd * 2.2, -30, [B.sd, 0], "E to suit up and walk out on the plateau"); }
  // the tram to the rocket port: a small car in a glass tube, from the tram stop north of the hub to the terminal by the pad
  { const A = BLD.tram, B = BLD.terminal, [ax, az] = A.at(0, -3), [bx, bz] = B.at(0, 8), L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 20), pts = []; for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; pts.push([x, z, land(x, z) + 0.25]); }
    TRAM_T = makeTrack("tram", pts, 2.4, 0.3, 100000); const [sx, sz] = A.door("s", 0), [ex, ez] = B.door("n", 0); corridor(sx, sz, ex, ez, { glass: true, noWalls: true, w: 4 });
    STATIONS.push({ name: "Tram stop", x: ax, z: az, track: TRAM_T, s: 0, dir: 1, info: "the tram to the rocket port, 1.4 km" }, { name: "Rocket port terminal", x: bx, z: bz, track: TRAM_T, s: TRAM_T.L, dir: -1, info: "the tram back to the hotel" }); }
  // the rover waits inside the garage, facing its door
  { const G = BLD.garage, [gx, gz] = G.at(0, 3); ROVER = roverMesh(); RV.x = gx; RV.z = gz; RV.yaw = G.yaw; } LIFTCAR = liftCar(); MAGCAR = magCar(); TRAMCAR = liftCar(); }
// a maglev station: a pressurised glass platform hall alongside the track; the train's doors seal against its screen doors; a doorway on the far side to the corridor
function magStation(T, atEnd, label, toward) { const k = atEnd ? T.pts.length - 1 : 0, a = T.pts[k], b = T.pts[atEnd ? k - 3 : 3], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, Y = atEnd ? T.Y1 : T.Y0;
  const sd = (toward[0] - a[0]) * uz + (toward[1] - a[1]) * -ux > 0 ? 1 : -1, cx = a[0] + ux * 30 + uz * sd * 4.7, cz = a[1] + uz * 30 - ux * sd * 4.7;
  const Bd = building({ x: cx, z: cz, yaw: Math.atan2(ux, uz), W: 5, L: 72, H: 3.8, y: Y, glass: true, doors: [{ side: sd > 0 ? "w" : "e", at: 0, w: 66, kind: "block" }, { side: sd > 0 ? "e" : "w", at: 0, w: 3 }], name: atEnd ? "magEnd" : "magStart" });
  Bd.add(new THREE.BoxGeometry(0.3, 0.06, 66), new THREE.MeshBasicMaterial({ color: 0xffd040 }), -sd * 2.2, 0.13, 0); signBoard(Bd.g, "MAGLEV", "to " + label, 0, 3.2, 0, Math.PI / 2, 4);
  return { x: cx, z: cz, door: Bd.door(sd > 0 ? "e" : "w", 0), b: Bd, sd }; }
function nearStation() { for (const S of STATIONS) if (Math.hypot(ME.x - S.x, ME.z - S.z) < (S.track === MAG_T ? 30 : 9)) return S; return null; }
function boardStation(S) { const T = S.track, fast = T.kind === "mag", tram = T.kind === "tram", E = STATIONS.find(S2 => S2.track === T && S2 !== S); ride = { T, s: S.s, end: E ? E.s : (S.dir > 0 ? T.L : 0), dir: S.dir, v: 0, vmax: fast ? 280 : tram ? 20 : 17, acc: fast ? 2.5 : tram ? 1.5 : 1, warp: fast ? 10 : tram ? 5 : 15, car: fast ? MAGCAR : tram ? TRAMCAR : LIFTCAR, name: fast ? "Maglev" : tram ? "Tram" : "Canyon Lift" }; if (tram) { ride.car.visible = true; say("<b>The tram</b> to the rocket port: 1.4 km in a glass tube (rockets need room, so the pad is well away from the hotel).", 8); return; } ride.car.visible = true; ME.vx = ME.vz = ME.vy = 0;
  say(fast ? "<b>The maglev</b> (imagined): an open guideway on pylons, 12 m over the plateau. Mars' air is so thin that at 1,000 km/h it needs no tube: the drag is like an aircraft's 30 km up on Earth. 570 km to the Melas Overlook: 35 minutes, here sped up ten times. Look out of the windows." : "<b>The Canyon Lift</b> (imagined): a self-levelling glass car on a rack railway down the wall, 17 m/s, 10 km down and 48 km south to the canyon floor: about 50 minutes, here sped up fifteen times. Watch the layers of the wall go by.", 25); }
function nearRover() { return Math.hypot(ME.x - RV.x, ME.z - RV.z) < 6 ? ROVER : null; }
function boardOrAct() { if (ride) return false; if (drive) { drive = null; const sd = V3(Math.cos(RV.yaw), 0, -Math.sin(RV.yaw)); ME.x = RV.x - sd.x * 2.6; ME.z = RV.z - sd.z * 2.6; ME.y = standY(ME.x, ME.z); say(inPress(ME.x, ME.z) ? "You step out of the rover into the garage." : "<b>You leave the rover by its rear suitport</b>: you are in a suit now, outside. <b>E</b> beside the rover to get back in.", 8); return true; }
  const sp = nearSuitport(); if (sp) { useSuitport(sp[0], sp[1]); return true; } if (SITE.TERM && Math.hypot(ME.x - SITE.TERM.gate[0], ME.z - SITE.TERM.gate[1]) < 5) { say("<b>The departure gate.</b> Rocket hops leave from here for Olympus Mons, Hellas, the north polar cap and orbit: a ballistic arc, under an hour anywhere on Mars. (Flying them is not in this program yet.)", 12); return true; }
  const S = nearStation(); if (S) { boardStation(S); return true; } if (nearRover()) { drive = true; RV.v = 0; say("<b>The rover</b> (imagined): a pressurised six-wheeled cab, 40 km/h at most. <b>W</b>/<b>S</b> drive and brake, <b>A</b>/<b>D</b> steer (left stick in VR); <b>E</b> gets out. Steep walls stop it.", 14); return true; } return false; }
function updateRide(dt) { const R = ride, T = R.T, end = R.end, left = Math.abs(end - R.s), sdt = dt * R.warp, stopV = Math.sqrt(2 * R.acc * left); R.v = Math.min(R.vmax, R.v + R.acc * sdt, stopV + 0.5); R.s += R.dir * R.v * sdt; tSec += sdt - dt * RATES[rateI][0];
  const p = trackAt(T, R.s), yaw = Math.atan2(-p.dx * R.dir, -p.dz * R.dir); ME.x = p.x; ME.z = p.z; ME.y = p.y + (T.kind === "mag" ? 0.15 : 0.3); R.car.position.set(p.x - ME.x0, p.y, p.z - ME.z0); R.car.rotation.set(0, yaw, 0);
  if (R.dir > 0 ? R.s >= end - 0.5 : R.s <= end + 0.5) { R.car.visible = false; const S = STATIONS.find(S2 => S2.track === T && Math.abs(S2.s - R.s) < 1); ride = null; if (S) { ME.x = S.x; ME.z = S.z; ME.y = standY(S.x, S.z); say(`<b>${S.name}.</b> ${S.name.startsWith("Melas") ? "You are on the plateau at 8° S, 71° W. Walk west into the glass pavilion at the edge: the ground falls 8 km to where Melas and Candor Chasmata meet, the widest part of Valles Marineris." : S.name.startsWith("Coprates Floor") ? "You are on the floor of Coprates Chasma, 4,900 m below the areoid, 10 km below the hotel: the walls rise all round you. The air here is twice as thick as on the rim, still far too thin to breathe." : "Back at the hotel."} <b>E</b> by the platform to ride back.`, 20); } } }
function updateDrive(dt, mx, my) { const acc = -my * 2.5, steer = mx; RV.v = clampN(RV.v + acc * dt - Math.sign(RV.v) * Math.min(Math.abs(RV.v), (my ? 0 : 1.2) * dt), -3, 11); RV.yaw -= steer * dt * 0.6 * clampN(Math.abs(RV.v) / 3, 0, 1) * Math.sign(RV.v || 1);
  const nx = RV.x - Math.sin(RV.yaw) * RV.v * dt, nz = RV.z - Math.cos(RV.yaw) * RV.v * dt, sl = Math.abs(land(nx, nz) - land(RV.x, RV.z)) / Math.max(0.01, Math.hypot(nx - RV.x, nz - RV.z));
  const wallHit = WALLS.some(Wl => { if (Wl[4] === "door") return false; const dx = Wl[2] - Wl[0], dz = Wl[3] - Wl[1], L2 = dx * dx + dz * dz, t = clampN(((nx - Wl[0]) * dx + (nz - Wl[1]) * dz) / L2, 0, 1); return Math.hypot(nx - Wl[0] - dx * t, nz - Wl[1] - dz * t) < 1.7; }) || RINGS.some(Rg => Math.abs(Math.hypot(nx - Rg.x, nz - Rg.z) - Rg.r) < 3);
  if (sl > 0.7 || wallHit || CIRCLES.some(C => Math.hypot(nx - C.x, nz - C.z) < C.r + 2.5)) RV.v = 0; else { RV.x = nx; RV.z = nz; }
  if (SITE.GDOOR) { const [dx2, dz2] = SITE.GDOOR.b.door("n", 0); SITE.GDOOR.m.position.y = 3.3 + 6.4 * sstep(14 - Math.hypot(RV.x - dx2, RV.z - dz2), 0, 6); }
  ME.x = RV.x - Math.sin(RV.yaw) * 1.2; ME.z = RV.z - Math.cos(RV.yaw) * 1.2; ME.y = land(RV.x, RV.z) + 1.0; }
function placeRover() { const h = land(RV.x, RV.z), f = V3(-Math.sin(RV.yaw), 0, -Math.cos(RV.yaw)), sd = V3(-f.z, 0, f.x), hf = land(RV.x + f.x * 2.5, RV.z + f.z * 2.5), hb = land(RV.x - f.x * 2.5, RV.z - f.z * 2.5), hl = land(RV.x + sd.x * 1.4, RV.z + sd.z * 1.4), hr = land(RV.x - sd.x * 1.4, RV.z - sd.z * 1.4);
  ROVER.position.set(RV.x - ME.x0, h + curveY(RV.x, RV.z), RV.z - ME.z0); ROVER.rotation.set(Math.atan2(hf - hb, 5), RV.yaw, -Math.atan2(hl - hr, 2.8), "YXZ"); ROVER.children.forEach(c => { if (c.userData.wheel) c.rotation.x += RV.v * 0.016 / 0.62; }); }

// ---------- Mars some centuries on (imagined): settlements across Valles Marineris, trains on the line, rockets at the pad, satellites overhead ----------
// Settlements: clusters of regolith-covered domes, chosen on real ground (canyon floors and the flat plateau near the rims), their windows lit at night. Two towns grow round
// the stations at the bottom of the Canyon Lift and at the Melas Overlook.
const SETTLE = [];
function pickSettlements() { const add = (x, z, n, r, name) => SETTLE.push({ x, z, n, r, name, k: SETTLE.length });
  add(SITE.FLOOR.x + 60, SITE.FLOOR.z + 500, 16, 700, "Coprates Floor town"); add(SITE.MELAS.x + 1500, SITE.MELAS.z + 600, 14, 800, "Melas Overlook town");
  for (let i = 0; i < 900 && SETTLE.length < 70; i++) { const x = (hash(i, 17) - 0.5) * 700000, z = (hash(i, 29) - 0.5) * 260000 + 60000, h = mola(x, z), sl = Math.abs(mola(x + 400, z) - mola(x - 400, z)) / 800 + Math.abs(mola(x, z + 400) - mola(x, z - 400)) / 800;
    if (Math.hypot(x, z - SITE.rimZ) < 4000 || sl > 0.06) continue; const floor = h < -2500, rim = h > 3000 && Math.abs(mola(x, z + 6000) - h) > 2000; if (!floor && !rim) continue; if (SETTLE.some(S => Math.hypot(S.x - x, S.z - z) < 12000)) continue; add(x, z, 3 + Math.floor(hash(i, 41) * 10), 200 + hash(i, 43) * 500, null); } }
const domeGeo = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
let SDOMES = null, SLIGHTS = null, settleC = [1e12, 1e12, 1e12];
function drawSettlements() { settleC = [ME.x, ME.z, ME.x0]; let N = 0; for (const S of SETTLE) N += S.n; if (!SDOMES) { SDOMES = new THREE.InstancedMesh(domeGeo, Mt(0xb08460, { roughness: 1 }), N); SDOMES.frustumCulled = false; SDOMES.castShadow = true; SDOMES.receiveShadow = true; scene.add(SDOMES);
    let L = 0; for (const S of SETTLE) L += S.n * 10; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(L * 3), 3)); SLIGHTS = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc070, size: 3.2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false })); SLIGHTS.frustumCulled = false; scene.add(SLIGHTS); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), lp = SLIGHTS.geometry.attributes.position; let k = 0, li = 0;
  for (const S of SETTLE) for (let d = 0; d < S.n; d++) { const a = hash(S.k, d) * 6.283, rr = Math.sqrt(hash(d, S.k + 7)) * S.r, x = S.x + Math.cos(a) * rr, z = S.z + Math.sin(a) * rr, r = 8 + 22 * hash(S.k + d, 3), h = land(x, z), y = h + curveY(x, z) - 1;
    m4.compose(V3(x - ME.x0, y, z - ME.z0), q, V3(r, r * 0.5, r)); SDOMES.setMatrixAt(k++, m4); for (let w = 0; w < 10; w++) { const b = w * 0.628 + a; lp.setXYZ(li++, x + Math.cos(b) * r * 0.97 - ME.x0, y + 1.5, z + Math.sin(b) * r * 0.97 - ME.z0); } }
  SDOMES.instanceMatrix.needsUpdate = true; lp.needsUpdate = true; }
// trains: eight on the line, each running the whole way and back at 1,000 km/h with ten minutes at each end; drawn when within a few kilometres of you
const TRAINS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ ph: i / 8 })), TRAINM = [];
function trainMesh() { const g = new THREE.Group(), body = Mt(0xe8e4dc, { metalness: 0.45, roughness: 0.3 }); for (let c = 0; c < 3; c++) { const car = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.4, 29.5), body); car.position.set(0, 1.6, c * 30); car.castShadow = true; g.add(car); const w = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.9, 27), new THREE.MeshStandardMaterial({ color: 0x101418, emissive: 0xffd8a0, emissiveIntensity: 0.25 })); w.position.set(0, 2.0, c * 30); g.add(w); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 8), body); nose.scale.set(1, 0.95, 3.2); nose.position.set(0, 1.6, -15); g.add(nose); g.visible = false; scene.add(g); return g; }
function trainS(Tn, t) { const T = MAG_T, run = (T.L - 60) / 280 + 2 * 280 / 2.5 * 0, P = 2 * (run + 600), u = ((t / P + Tn.ph) % 1) * P; if (u < 600) return [30, 1]; if (u < 600 + run) return [30 + (u - 600) * 280, 1]; if (u < 1200 + run) return [T.L - 30, -1]; return [T.L - 30 - (u - 1200 - run) * 280, -1]; }
function updateTrains() { if (!MAG_T) return; let used = 0; for (const Tn of TRAINS) { const [sx, dir] = trainS(Tn, tSec), p = trackAt(MAG_T, sx); if (Math.hypot(p.x - ME.x, p.z - ME.z) > 6000 || (ride && ride.T === MAG_T)) continue; if (!TRAINM[used]) TRAINM[used] = trainMesh(); const g = TRAINM[used++];
    g.visible = true; g.position.set(p.x - ME.x0, p.y + curveY(p.x, p.z), p.z - ME.z0); g.rotation.set(0, Math.atan2(-p.dx * dir, -p.dz * dir), 0); } for (let i = used; i < TRAINM.length; i++) TRAINM[i].visible = false; }
// rockets at the pad: one lifts off every half hour (a third of Earth's gravity and almost no air: an easy climb), another comes down to land between
const ROCKET = { g: null, flame: null, light: null };
function buildRocketFx() { const tex = glowTex; ROCKET.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffc080, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); ROCKET.flame.visible = false; scene.add(ROCKET.flame);
  ROCKET.light = new THREE.PointLight(0xffb070, 0, 3000, 1.2); scene.add(ROCKET.light); ROCKET.g = new THREE.Group(); const w = Mt(0xe8e4dc, { metalness: 0.4, roughness: 0.3 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 40, 24), w); b.position.y = 20; ROCKET.g.add(b); const c = new THREE.Mesh(new THREE.ConeGeometry(4.5, 10, 24), w); c.position.y = 45; ROCKET.g.add(c);
  for (let a = 0; a < 6.28; a += 2.094) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 4), Mt(0x2a2826)); f.position.set(Math.cos(a) * 4.8, 4, Math.sin(a) * 4.8); f.rotation.y = -a; ROCKET.g.add(f); } ROCKET.g.traverse(o => o.castShadow = true); scene.add(ROCKET.g); }
function updateRocket() { const R = SITE.RP, base = PAD_H + R.h + 0.9, u = tSec % 1800; let alt = 0, fire = 0;
  if (u > 1200 && u < 1500) { const t = u - 1200; alt = 0.5 * 12 * t * t; fire = 1; } else if (u >= 1500 && u < 1600) { alt = 1e7; } else if (u >= 1600) { const t = 1800 - u; alt = 0.5 * 9 * t * t; fire = t > 1 ? 1 : 0; }
  const y = base + alt, cy = curveY(R.x, R.z); ROCKET.g.visible = alt < 2e5; ROCKET.g.position.set(R.x - ME.x0, y + cy, R.z - ME.z0); ROCKET.flame.visible = ROCKET.g.visible && fire > 0; ROCKET.flame.position.set(R.x - ME.x0, y + cy - 8, R.z - ME.z0); const fs = 18 + 6 * Math.sin(T * 40); ROCKET.flame.scale.set(fs, fs * 2.2, 1);
  ROCKET.light.position.copy(ROCKET.flame.position); ROCKET.light.intensity = ROCKET.flame.visible ? 2500 / (1 + alt / 300) : 0; ROCKET.alt = alt; ROCKET.fire = fire; }
// satellites and orbital stations: points of light crossing the night sky
const SATS = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ inc: hash(i, 3) * 1.4, ph: hash(i, 5) * 6.28, P: 6600 + hash(i, 7) * 5000, r: 0.6 + hash(i, 9) * 0.3 }));
const SATP = (() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SATS.length * 3), 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff8e8, size: 2.4, sizeAttenuation: false, fog: false, transparent: true, depthWrite: false })); SKY.add(p); return p; })();
function updateSats(sunY) { const P = SATP.geometry.attributes.position; SATS.forEach((S, i) => { const a = S.ph + tSec * 6.283 / S.P, v = V3(Math.cos(a), Math.sin(a) * Math.cos(S.inc), Math.sin(a) * Math.sin(S.inc)); const d = V3(v.x, Math.abs(v.y) * 0.9 + 0.1, v.z).normalize().multiplyScalar(SKYR * 0.7); P.setXYZ(i, d.x, d.y, d.z); }); P.needsUpdate = true; SATP.material.opacity = 1 - sstep(sunY, -0.25, -0.05); }

// ---------- the hotel as a real one would be: everything a guest uses joined by pressurised corridors, so you go about in ordinary clothes ----------
// Corridors are buried under regolith against radiation: from outside, low mounds; inside, lit hallways. Buildings are levelled into the slope. Going outside
// means a suitport: a suit hanging on the outside wall, its back open to the inside; you climb in and step away (NASA has designed these for rovers).
const PRESS = [], RINGS = [], SUITPORTS = [], BLD = {};
const inMat = new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 0.7, emissive: 0x8a8274, emissiveIntensity: 0.55, side: THREE.DoubleSide });
const lightPanel = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });
function rgroup(x, z, y, yaw = 0) { const g = new THREE.Group(); g.userData = { x, z, y }; g.rotation.y = yaw; scene.add(g); REMOTE.push(g); return g; }
const L2W = (b, lx, lz) => [b.x + lx * Math.cos(b.yaw) + lz * Math.sin(b.yaw), b.z - lx * Math.sin(b.yaw) + lz * Math.cos(b.yaw)];
function inPress(x, z) { for (const P of PRESS) { if (P.t === "rect") { const dx = x - P.x, dz = z - P.z, u = dx * Math.cos(P.yaw) - dz * Math.sin(P.yaw), v = dx * Math.sin(P.yaw) + dz * Math.cos(P.yaw); if (Math.abs(u) < P.hw && Math.abs(v) < P.hl) return true; }
    else if (P.t === "seg") { const dx = P.bx - P.ax, dz = P.bz - P.az, L2 = dx * dx + dz * dz, t = clampN(((x - P.ax) * dx + (z - P.az) * dz) / L2, 0, 1); if (Math.hypot(x - P.ax - dx * t, z - P.az - dz * t) < P.hw) return true; }
    else if (Math.hypot(x - P.x, z - P.z) < P.r) return true; } return false; }
// a building: walls (opaque or glass) with door openings, a roof, a floor; levelled into the slope; doors of kind "block" are open to the eye but closed to walkers (screen doors, a track's way out, the garage door)
function building(o) { const { x, z, yaw = 0, W, L, H = 4, glass = false, roofGlass = false, doors = [], name } = o, b = { x, z, yaw, W, L, H, name };
  const xs = [], zs = []; for (const [lx, lz] of [[-W / 2 - 3, -L / 2 - 3], [W / 2 + 3, -L / 2 - 3], [-W / 2 - 3, L / 2 + 3], [W / 2 + 3, L / 2 + 3]]) { const [wx, wz] = L2W(b, lx, lz); xs.push(wx); zs.push(wz); }
  const y = o.y !== undefined ? o.y : Math.round(padH(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)) * 10) / 10; b.y = y; SITE.pads.push({ x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), h: y, s: 30 });
  const g = rgroup(x, z, y, yaw); b.g = g; const add = (geo, m, lx, ly, lz, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(lx, ly, lz); me.rotation.y = ry; me.castShadow = m !== glassM; me.receiveShadow = true; g.add(me); return me; };
  const wallM = glass ? glassM : inMat, outM = Mt(0xd8d2c8, { metalness: 0.25, roughness: 0.5 });
  add(new THREE.BoxGeometry(W, 0.1, L), Mt(0x8a8076, { roughness: 0.8 }), 0, 0.05, 0);
  const sides = { s: [[-W / 2, L / 2], [W / 2, L / 2]], n: [[W / 2, -L / 2], [-W / 2, -L / 2]], e: [[W / 2, L / 2], [W / 2, -L / 2]], w: [[-W / 2, -L / 2], [-W / 2, L / 2]] };
  for (const [sd, [[ax, az], [bx, bz]]] of Object.entries(sides)) { const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, ds = doors.filter(d => d.side === sd).sort((p, q) => p.at - q.at); let t = 0;
    const piece = (t0, t1, block) => { if (t1 - t0 < 0.05) return; const cx = ax + ux * (t0 + t1) / 2, cz = az + uz * (t0 + t1) / 2, ry = -Math.atan2(uz, ux); if (!block) { add(new THREE.BoxGeometry(t1 - t0, H, 0.25), wallM, cx, H / 2, cz, ry); if (!glass) add(new THREE.BoxGeometry(t1 - t0, H + 0.1, 0.05), outM, cx - uz * 0.16, H / 2, cz + ux * 0.16, ry); }
      const [p0x, p0z] = L2W(b, ax + ux * t0, az + uz * t0), [p1x, p1z] = L2W(b, ax + ux * t1, az + uz * t1); WALLS.push(block === "door" ? [p0x, p0z, p1x, p1z, "door"] : [p0x, p0z, p1x, p1z]); };
    for (const d of ds) { const c = d.at + len / 2; piece(t, c - d.w / 2, false); if (d.kind === "block") piece(c - d.w / 2, c + d.w / 2, d.door ? "door" : true); else add(new THREE.BoxGeometry(d.w + 0.4, 0.3, 0.3), frameM, ax + ux * c, Math.min(2.7, H - 0.3), az + uz * c, -Math.atan2(uz, ux)); t = c + d.w / 2; } piece(t, len, false); }
  add(new THREE.BoxGeometry(W + 0.4, 0.3, L + 0.4), roofGlass ? glassM : outM, 0, H + 0.15, 0); if (!roofGlass) for (let lz = -L / 2 + 3; lz < L / 2 - 1; lz += 5) add(new THREE.BoxGeometry(Math.min(2.5, W * 0.4), 0.04, 1.2), lightPanel, 0, H - 0.02, lz);
  PRESS.push({ t: "rect", x, z, yaw, hw: W / 2, hl: L / 2 }); b.door = (sd, at) => { const [[ax, az], [bx, bz]] = sides[sd], len = Math.hypot(bx - ax, bz - az), c = at + len / 2; return L2W(b, ax + (bx - ax) / len * c, az + (bz - az) / len * c); }; b.at = (lx, lz) => L2W(b, lx, lz); b.add = add; if (name) BLD[name] = b; return b; }
// a buried corridor between two doors, following the ground: an arched hallway inside, a regolith mound outside (or, for the tram, a glass tube)
const CORR_Q = [];
function corridor(ax, az, bx, bz, o = {}) { const w = o.w || 3.0, ri0 = w / 2; if (!o.noWalls) { const L0 = Math.hypot(bx - ax, bz - az), sx0 = -(bz - az) / L0, sz0 = (bx - ax) / L0; WALLS.push([ax + sx0 * ri0, az + sz0 * ri0, bx + sx0 * ri0, bz + sz0 * ri0], [ax - sx0 * ri0, az - sz0 * ri0, bx - sx0 * ri0, bz - sz0 * ri0]); PRESS.push({ t: "seg", ax, az, bx, bz, hw: ri0 }); } CORR_Q.push([ax, az, bx, bz, o]); }
function buildCorridors() { for (const [ax, az, bx, bz, o] of CORR_Q) corridorMesh(ax, az, bx, bz, o); }
function corridorMesh(ax, az, bx, bz, o = {}) { const w = o.w || 3.0, glass = !!o.glass, L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / 5)), ux = (bx - ax) / L, uz = (bz - az) / L, sx = -uz, sz = ux, g = rgroup(ax, az, 0, 0);
  const ri = w / 2, hi = 2.7, ro = w / 2 + 1.6, ho = 3.6, K = 8, inner = [], outer = [], floor = [], lamp = [];
  for (let i = 0; i <= n; i++) { const t = i / n * L, cx = ax + ux * t, cz = az + uz * t, y = land(cx, cz) + 0.02; inner.push([]); outer.push([]); for (let k = 0; k <= K; k++) { const th = Math.PI * k / K; inner[i].push([cx + sx * Math.cos(th) * ri - ax, y + Math.sin(th) * hi, cz + sz * Math.cos(th) * ri - az]); outer[i].push([cx + sx * Math.cos(th) * ro - ax, y - 0.4 + Math.sin(th) * ho, cz + sz * Math.cos(th) * ro - az]); } floor.push([cx - ax, y + 0.04, cz - az]); }
  const strip = (rings, m) => { const pos = []; for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < K; k++) { const a = rings[i][k], b2 = rings[i][k + 1], c = rings[i + 1][k + 1], d = rings[i + 1][k]; pos.push(...a, ...b2, ...c, ...a, ...c, ...d); } const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); const me = new THREE.Mesh(geo, m); me.castShadow = m !== glassM; me.receiveShadow = true; g.add(me); return me; };
  strip(inner, glass ? glassM : inMat); if (!glass) strip(outer, regM);
  { const pos = []; for (let i = 0; i < floor.length - 1; i++) { const a = floor[i], b2 = floor[i + 1], hw = ri * 0.92; const p = (q, s) => [q[0] + sx * s, q[1], q[2] + sz * s]; pos.push(...p(a, -hw), ...p(a, hw), ...p(b2, hw), ...p(a, -hw), ...p(b2, hw), ...p(b2, -hw)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); const me = new THREE.Mesh(geo, Mt(0x8a8076, { roughness: 0.8, side: THREE.DoubleSide })); me.receiveShadow = true; g.add(me); }
  if (!glass) for (let i = 0; i < floor.length - 1; i += 2) { const a = floor[i]; const me = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 2.5), lightPanel); me.position.set(a[0], a[1] + hi - 0.08, a[2]); me.rotation.y = Math.atan2(ux, uz); g.add(me); }
  return g; }
// a round room under a dome: a ring wall with doorways, a cap; regolith over it (the hub) or glass (the greenhouse)
function ringRoom(o) { const { x, z, r, doors = [], glass = false, name } = o, y = o.y !== undefined ? o.y : Math.round(padH(x - r, x + r, z - r, z + r) * 10) / 10, g = rgroup(x, z, y, 0), Hw = 3.4, N = 48, b = { x, z, r, y, g, name };
  SITE.pads.push({ x0: x - r - 4, x1: x + r + 4, z0: z - r - 4, z1: z + r + 4, h: y, s: 35 }); RINGS.push({ x, z, r, gaps: doors.map(a => ({ a, hw: 1.6 / r })) }); PRESS.push({ t: "circ", x, z, r });
  const add = (geo, m, lx, ly, lz, ry = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(lx, ly, lz); me.rotation.y = ry; me.castShadow = m !== glassM; me.receiveShadow = true; g.add(me); return me; };
  const open = a => doors.some(d => Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d))) < 1.8 / r);
  for (let k = 0; k < N; k++) { const a = (k + 0.5) / N * Math.PI * 2; if (open(a)) continue; const seg = 2 * Math.PI * r / N + 0.05, cx = Math.cos(a) * r, cz = Math.sin(a) * r; add(new THREE.BoxGeometry(seg, Hw, 0.25), glass ? glassM : inMat, cx, Hw / 2, cz, -a + Math.PI / 2); if (!glass) add(new THREE.BoxGeometry(seg * 1.08, Hw + 0.6, 1.4), regM, cx * (r + 0.8) / r, (Hw + 0.6) / 2 - 0.3, cz * (r + 0.8) / r, -a + Math.PI / 2); }
  for (const d of doors) add(new THREE.BoxGeometry(3.4, 0.35, 0.4), frameM, Math.cos(d) * r, 2.8, Math.sin(d) * r, -d + Math.PI / 2);
  const cap = (rr, m, hh) => { const me = add(new THREE.SphereGeometry(rr, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, Hw - 0.1, 0); me.scale.y = hh / rr; return me; };
  if (glass) cap(r, glassM, r * 0.5); else { cap(r, inMat, r * 0.35); cap(r + 1.4, regM, r * 0.4 + 1.2); for (let a = 0; a < 6.28; a += 0.785) add(new THREE.BoxGeometry(2.5, 0.05, 0.6), lightPanel, Math.cos(a) * r * 0.55, Hw + r * 0.3, Math.sin(a) * r * 0.55, -a); }
  add(new THREE.CylinderGeometry(r, r, 0.1, 48), Mt(0x8a8076, { roughness: 0.8 }), 0, 0.05, 0); b.add = add; b.door = a => [x + Math.cos(a) * r, z + Math.sin(a) * r]; if (name) BLD[name] = b; return b; }
function signBoard(parent, text, sub, lx, ly, lz, ry, w = 3.4) { const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#16243a"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#ffffff"; g.font = "bold 92px sans-serif"; g.fillText(text, 36, 110, 950); g.fillStyle = "#ffd890"; g.font = "56px sans-serif"; g.fillText(sub || "", 36, 205, 950);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const me = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); me.position.set(lx, ly, lz); me.rotation.y = ry; parent.add(me); return me; }
// a suitport: the suit on the wall, its back to the room; E beside it to go out, E beside the hatch outside to come back in
function suitport(b, lx, lz, outward, label) { const [ix, iz] = b.at(lx, lz), [ox, oz] = b.at(lx + outward[0] * 3, lz + outward[1] * 3), ry = Math.atan2(outward[0], outward[1]);
  const suit = new THREE.Group(), w = Mt(0xf0ece4, { roughness: 0.6 }); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.8, 4, 10), w); body.position.y = 1.15; suit.add(body); const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), Mt(0x3a3020, { metalness: 0.7, roughness: 0.15 })); helm.position.y = 1.85; suit.add(helm);
  for (const sx2 of [-0.42, 0.42]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.6, 4, 8), w); arm.position.set(sx2, 1.25, 0); suit.add(arm); } for (const sx2 of [-0.16, 0.16]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), w); leg.position.set(sx2, 0.45, 0); suit.add(leg); }
  suit.position.set(lx + outward[0] * 0.2, 0, lz + outward[1] * 0.2); suit.rotation.y = ry + Math.PI; b.g.add(suit); signBoard(b.g, "SUITPORT", label || "E to suit up and go outside", lx - outward[0] * 0.05, 2.7, lz - outward[1] * 0.05, ry + Math.PI, 1.8);
  SUITPORTS.push({ ix, iz, ox, oz, y: b.y, name: label }); }
// the whole complex round the lounge
function buildComplex(R0) { const rimAt = x => { for (let z = R0 - 300; z < R0 + 2000; z += 4) if (mola(x, z + 30) - mola(x, z) < -12) return z; return R0; };
  // the maglev station is built later, with the track; its doorway on the hub is reserved here, facing where its platform will be
  const HZ = R0 - 82, ST = SITE.ST, w1 = llXZ(-10.5, 295.5), ul = Math.hypot(w1[0] - ST.x, w1[1] - ST.z), ux = (w1[0] - ST.x) / ul, uz = (w1[1] - ST.z) / ul, sd = (0 - ST.x) * uz + (HZ - ST.z) * -ux > 0 ? 1 : -1, mdoor = [ST.x + ux * 30 + uz * sd * 7.2, ST.z + uz * 30 - ux * sd * 7.2];
  const aMag = Math.atan2(mdoor[1] - HZ, mdoor[0]), aGH = 2.2, aEVA = Math.PI; SITE.aMag = aMag;
  const hubY = PAD_H + clampN(padH(-26, 26, HZ - 26, HZ + 26) - PAD_H, -2, 4), near = (x, z, r) => { const p = padH(x - r, x + r, z - r, z + r), Lc = Math.max(6, Math.hypot(x, z - HZ) - 26 - r); return Math.round(clampN(p, hubY - 0.12 * Lc, hubY + 0.12 * Lc) * 10) / 10; }; SITE.near = near; SITE.hubY = hubY;
  const HUB = ringRoom({ x: 0, z: HZ, r: 26, y: hubY, doors: [Math.PI / 2, 0, -0.6, -Math.PI / 2, aMag, aEVA, aGH], name: "hub" });
  // the park: grass under grow lights, trees, benches, a café and the front desk; signs over each doorway
  { const g = HUB.g; const gr = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 0.12, 40), Mt(0x4a7a34, { roughness: 0.9, emissive: 0x1a2a10, emissiveIntensity: 0.4 })); gr.position.y = 0.12; g.add(gr);
    for (let k = 0; k < 9; k++) { const a = k * 0.698 + 0.3, rr = 4 + 7 * hash(k, 2); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 2.4, 8), Mt(0x5a4030)); tr.position.set(Math.cos(a) * rr, 1.3, Math.sin(a) * rr); g.add(tr); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + hash(k, 4), 1), Mt(0x3a7a2e, { roughness: 0.8, emissive: 0x0e1e08, emissiveIntensity: 0.5 })); cr.position.set(Math.cos(a) * rr, 3.0, Math.sin(a) * rr); cr.scale.y = 1.2; g.add(cr); }
    for (let k = 0; k < 6; k++) { const a = k * 1.047; const bn = new THREE.Mesh(new THREE.BoxGeometry(2, 0.45, 0.6), Mt(0x6a4a32)); bn.position.set(Math.cos(a) * 15, 0.35, Math.sin(a) * 15); bn.rotation.y = -a + Math.PI / 2; g.add(bn); }
    const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 1.2), Mt(0x3a2a22)); desk.position.set(-6, 0.6, 19); g.add(desk); const cafe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 7), Mt(0x3a2a22)); cafe.position.set(19, 0.6, -4); g.add(cafe);
    WALLS.push([HUB.x - 9, HUB.z + 18.4, HUB.x - 3, HUB.z + 18.4], [HUB.x - 9, HUB.z + 19.6, HUB.x - 3, HUB.z + 19.6], [HUB.x + 18.4, HUB.z - 7.5, HUB.x + 18.4, HUB.z - 0.5], [HUB.x + 19.6, HUB.z - 7.5, HUB.x + 19.6, HUB.z - 0.5]);
    const l = new THREE.PointLight(0xfff0dc, 30, 60, 1.4); l.position.set(0, 9, 0); g.add(l); }
  const hubSign = (a, t, s2) => signBoard(HUB.g, t, s2, Math.cos(a) * (HUB.r - 0.6), 3.3, Math.sin(a) * (HUB.r - 0.6), -a - Math.PI / 2, 3.2);
  // the lounge, through a corridor south
  const lng = HUB.door(Math.PI / 2); corridor(lng[0], lng[1], 0, R0 - 15); hubSign(Math.PI / 2, "LOUNGE", "the canyon view ▸");
  // the Canyon Lift's top station, east along the rim: the car waits inside it; the track leaves through the south wall
  { const lx = 100, rz = rimAt(lx), Bd = building({ x: lx, z: rz - 16, y: near(lx, rz - 16, 11), W: 12, L: 22, H: 5, doors: [{ side: "w", at: -5, w: 3 }, { side: "s", at: 0, w: 4.4, kind: "block" }], name: "lift" }); SITE.LIFT = { x: lx, z: rz - 16, y: Bd.y - PAD_H, b: Bd };
    signBoard(Bd.g, "CANYON LIFT", "to the floor of Coprates Chasma, 10 km down", 0, 3.6, -10.8, 0, 5); const d = Bd.door("w", -5), h = HUB.door(0); corridor(h[0], h[1], d[0], d[1]); hubSign(0, "CANYON LIFT", "down the wall to the floor ▸"); }
  // the rover garage, north-east: you get in the rover inside, and the big door opens as you drive out
  { const Bd = building({ x: 62, z: R0 - 150, y: near(62, R0 - 150, 13), W: 16, L: 26, H: 7, doors: [{ side: "s", at: -4, w: 3 }, { side: "n", at: 0, w: 7, kind: "block", door: true }], name: "garage" }); const d = Bd.door("s", -4), h = HUB.door(-0.6); corridor(h[0], h[1], d[0], d[1]);
    hubSign(-0.6, "ROVER GARAGE", "pressurised rovers ▸"); const door = new THREE.Mesh(new THREE.BoxGeometry(7, 6.6, 0.3), Mt(0x6a7a86, { metalness: 0.6, roughness: 0.35 })); door.position.set(0, 3.3, -13); Bd.g.add(door); SITE.GDOOR = { m: door, b: Bd }; suitport(Bd, -7.8, 8, [-1, 0], "E to suit up and go outside"); }
  // the tram to the rocket port, north: a small car in a glass tube, 1.4 km
  { const RP = SITE.RP, d0x = RP.x - 80, d0z = RP.z + 70, a = Math.atan2(d0x - 0, d0z - (R0 - 140)), Bd = building({ x: 0, z: R0 - 140, y: near(0, R0 - 140, 8), yaw: a, W: 7, L: 16, H: 4, doors: [{ side: "n", at: 0, w: 3 }, { side: "s", at: 0, w: 3, kind: "block" }], name: "tram" });
    const d = Bd.door("n", 0), h = HUB.door(-Math.PI / 2); corridor(h[0], h[1], d[0], d[1]); hubSign(-Math.PI / 2, "ROCKET PORT", "tram, 1.4 km ▸"); signBoard(Bd.g, "TRAM", "to the rocket port", 0, 3.2, -7.8, 0, 3.6);
    const Tm = building({ x: d0x, z: d0z, yaw: a, W: 16, L: 30, H: 6, glass: true, doors: [{ side: "n", at: 0, w: 3, kind: "block" }], name: "terminal" });
    signBoard(Tm.g, "DEPARTURES", "Olympus Mons · Hellas · the north polar cap · orbit", 0, 3.2, 10, Math.PI, 7); SITE.TERM = { x: Tm.x, z: Tm.z, y: Tm.y, gate: Tm.at(0, -10) }; suitport(Tm, 7.8, 8, [1, 0], "E to suit up and go out to the pad"); }
  // a suit room off the hub for walks outside
  { const Bd = building({ x: -44, z: HZ, y: near(-44, HZ, 5), yaw: 0, W: 8, L: 10, H: 3.6, doors: [{ side: "e", at: 0, w: 3 }], name: "eva" }); const d = Bd.door("e", 0), h = HUB.door(aEVA); corridor(h[0], h[1], d[0], d[1]); hubSign(aEVA, "SUIT ROOM", "walks outside ▸");
    suitport(Bd, -4, 2, [-1, 0], "E to suit up and go outside"); suitport(Bd, -4, -2, [-1, 0], "E to suit up and go outside"); }
  // the greenhouse, west: glass with water between its layers against radiation; crops under the Martian sun
  { const gx = Math.cos(aGH) * 46, gz = HZ + Math.sin(aGH) * 46, a2 = Math.atan2(HZ - gz, -gx), GH = ringRoom({ x: gx, z: gz, r: 13, y: near(gx, gz, 13), doors: [a2], glass: true, name: "greenhouse" });
    for (let k = 0; k < 9; k++) { const lz = -8 + k * 2, row = new THREE.Mesh(new THREE.BoxGeometry(2 * Math.sqrt(Math.max(4, 110 - lz * lz)), 0.6, 1.1), Mt(0x3e8a30, { roughness: 0.8, emissive: 0x10200a, emissiveIntensity: 0.4 })); row.position.set(0, 0.4, lz); GH.g.add(row); }
    const p1 = GH.door(a2), p2 = HUB.door(aGH); corridor(p1[0], p1[1], p2[0], p2[1]); hubSign(aGH, "GREENHOUSE", "crops under the Martian sun ▸"); SITE.GH = { x: GH.x, z: GH.z, y: GH.y - PAD_H }; }
  SITE.HUB = HUB; }
// collisions with round rooms: you cannot cross the wall except through a doorway
function ringCollide(px, pz) { for (const Rg of RINGS) { const d0 = Math.hypot(px - Rg.x, pz - Rg.z), d1 = Math.hypot(ME.x - Rg.x, ME.z - Rg.z); if ((d0 < Rg.r) === (d1 < Rg.r) && Math.abs(d1 - Rg.r) > 0.35) continue;
    const a = Math.atan2(ME.z - Rg.z, ME.x - Rg.x); if (Rg.gaps.some(G => Math.abs(Math.atan2(Math.sin(a - G.a), Math.cos(a - G.a))) < G.hw)) continue; const inside = d0 < Rg.r, rr = inside ? Rg.r - 0.36 : Rg.r + 0.36; ME.x = Rg.x + Math.cos(a) * rr; ME.z = Rg.z + Math.sin(a) * rr; } }
function nearSuitport() { for (const S of SUITPORTS) { if (Math.hypot(ME.x - S.ix, ME.z - S.iz) < 2.2 && inPress(ME.x, ME.z)) return [S, "out"]; if (Math.hypot(ME.x - S.ox, ME.z - S.oz) < 3 && !inPress(ME.x, ME.z)) return [S, "in"]; } return null; }
function useSuitport(S, dir) { if (dir === "out") { ME.x = S.ox; ME.z = S.oz; ME.y = standY(S.ox, S.oz); say("<b>You climb into the suit from behind and step away from the wall.</b> Outside, the air is 0.6% of Earth's, carbon dioxide, about −50 °C; the suit holds you at 30 kPa of oxygen. <b>E</b> by the hatch to come back in.", 14); }
  else { ME.x = S.ix; ME.z = S.iz; ME.y = standY(S.ix, S.iz); say("Back inside: out of the suit, into the warm.", 5); } wasInside = dir === "in"; }

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0;
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
Promise.all([loadMola(MOLA_REGION), loadMola(MOLA_LOCAL), loadMola(MOLA_LOCAL2)]).then(([r, l, l2]) => { MOLA.region = r; MOLA.local = l; MOLA.local2 = l2; buildColony(); buildTravel(); buildCorridors(); pickSettlements(); buildRocketFx(); toStart(); ME.x0 = ME.x; ME.z0 = ME.z; COL.position.set(-ME.x0, PAD_H, -ME.z0); buildFar(); makeTags(); updateGround(true); fillRocks(); ready = true;
  const card = document.querySelector("#intro .dim"); if (card) card.textContent = card.textContent.replace("Loading the ground…", "Click to begin."); });
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting, simDt = dt * RATES[rateI][0]; T += dt; frameN++; if (!ready) { renderer.render(scene, camera); return; }
  if (started) { tSec += simDt; }
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) tagsOn = !tagsOn; prevB.x = bX; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setRate(rateI + 1); prevB.y = bY; const bS = gp.buttons[3]?.pressed; if (bS && !prevB.st) toggleSeated(); prevB.st = bS; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed, tr = gp.buttons[0]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; if (tr && !prevB.tr) act(); prevB.tr = tr; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  if (ride && started) updateRide(dt); else if (drive && started) updateDrive(dt, mx, my);
  // walking and jumping in 0.38 g; the thin air does nothing to slow you
  const gY = standY(ME.x, ME.z), onGround = !ride && !drive && ME.y <= gY + 0.03;
  if (started && onGround) { if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 5 : 2.2, k = 1 - Math.exp(-dt * 6); ME.vx += ((f.x * -my + sd.x * mx) * sp - ME.vx) * k; ME.vz += ((f.z * -my + sd.z * mx) * sp - ME.vz) * k; }
    else { const k = 1 - Math.exp(-dt * 6); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; } if (jump) ME.vy = 2.4; }
  const hd = vr ? (() => { const c = camera.position, cy = Math.cos(vrYaw), sy = Math.sin(vrYaw); return [c.x * cy + c.z * sy, -c.x * sy + c.z * cy]; })() : [0, 0];
  if (!ride && !drive) { ME.vy -= G_M * dt; const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; ME.x += hd[0]; ME.z += hd[1]; collide(ox, oz); ME.x -= hd[0]; ME.z -= hd[1]; walked += Math.hypot(ME.x - ox, ME.z - oz);
  const gN = standY(ME.x + hd[0], ME.z + hd[1]); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.y = standY(ox + hd[0], oz + hd[1]); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } } }
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillRocks(); } else { updateGround(); if (Math.hypot(ME.x - rockC[0], ME.z - rockC[1]) > 6) fillRocks(); }
  const lift = drive && vr ? land(RV.x, RV.z) + 1.3 + 1.2 - camera.position.y - ME.y : vr && seated ? 0.45 : 0; rig.position.set(ME.x - ME.x0, ME.y + lift, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  setNoiseOrigin(ME.x0, ME.z0); if (Math.hypot(ME.x - settleC[0], ME.z - settleC[1]) > 3000 || settleC[2] !== ME.x0) drawSettlements(); SLIGHTS.material.opacity = 0.25 + 0.75 * (1 - sstep(sunDir(tSec).y, -0.1, 0.1)); updateTrains(); updateRocket(); updateTracks(); for (const g of REMOTE) g.position.set(g.userData.x - ME.x0, g.userData.y + curveY(g.userData.x, g.userData.z), g.userData.z - ME.z0); if (ROVER) placeRover(); if (liftMesh) liftMesh.visible = Math.hypot(ME.x, ME.z - SITE.rimZ) < 4000 && !ride;
  if (started && !ride && !drive && frameN % 40 === 0) { const S = nearStation(), Rv = nearRover(), key = S ? S.name : Rv ? "rover" : ""; if (key && key !== lastHint) say(S ? `<b>${S.name}.</b> <b>E</b> (A in VR) to ride ${S.info}.` : "<b>The rover.</b> <b>E</b> (A in VR) to get in and drive.", 8); lastHint = key; }
  COL.position.set(-ME.x0, PAD_H + curveY(0, SITE.rimZ), -ME.z0); if (winMesh) { winMesh.position.set(-ME.x0, 0, -ME.z0); liftMesh.position.set(-ME.x0, 0, -ME.z0); }
  const s = updateSky(); updateSats(s.y); SKY.position.copy(rig.position); sunL.position.copy(rig.position).addScaledVector(s, 200); sunL.target.position.copy(rig.position);
  updateTags();
  if (frameN % 10 === 0) { const [lat, lon] = toLL(ME.x, ME.z), h = ME.y, lst = (LST0 + tSec / SOL * 24) % 24, inside = insideNow(), pa = 610 * Math.exp(-h / 11100), el = Math.asin(s.y) / DEG, az = ((Math.atan2(s.x, -s.z) / DEG) + 360) % 360;
    const place = Math.hypot(ME.x - (SITE.MELAS ? SITE.MELAS.x : 1e9), ME.z - (SITE.MELAS ? SITE.MELAS.z : 1e9)) < 60000 ? "Melas Overlook, above Melas and Candor Chasmata" : "Coprates Chasma, Valles Marineris";
    const lines = [`<b>${place}</b>`, ...(ride ? [`<b>${ride.name}</b> · ${Math.round(ride.v * 3.6)} km/h · ${fmtKm(Math.abs(ride.end - ride.s))} to go · time ×${ride.warp}`] : drive ? [`<b>Rover</b> · ${Math.round(Math.abs(RV.v) * 3.6)} km/h`] : []), `${Math.abs(lat).toFixed(3)}° S, ${(360 - lon).toFixed(3)}° W · ${Math.round(h).toLocaleString()} m above the areoid`, inside || ride || drive ? "inside: 21 °C, 70 kPa air · no suit" : `outside, in a suit · air ${Math.round(pa)} Pa (${(pa / 1013).toFixed(2)}% of Earth's), CO₂`,
      `sol ${1 + Math.floor((LST0 / 24) + tSec / SOL)}, ${String(Math.floor(lst)).padStart(2, "0")}:${String(Math.floor((lst % 1) * 60)).padStart(2, "0")} local time · Sun ${el < 0 ? "below the horizon" : COMPASS[Math.round(az / 22.5) % 16] + " " + Math.round(el) + "° up"} · time ${RATES[rateI][1]}`,
      ...MOONS.map(m => `${m.n}: ${m.v.y < 0 ? "below the horizon" : COMPASS[Math.round((((Math.atan2(m.v.x, -m.v.z) / DEG) + 360) % 360) / 22.5) % 16] + " " + Math.round(Math.asin(m.v.y) / DEG) + "° up"}`)];
    if (inside !== wasInside && started) wasInside = inside;
    if (hud) HUD.innerHTML = lines.join("<br>"); if (vr && frameN % 30 === 0) drawWrist(lines.join("<br>")); }
  wrist.visible = vr && hud && started; HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

// titan.js -- standing on the southern shore of Ligeia Mare, Titan's second-largest sea (in truth a lake of liquid methane larger than
// Lake Superior), beside the mouth of Vid Flumina. Built into titan.html by build.py.
//
// What it rests on. Place: Ligeia Mare, 79 N 248 W, about 420 by 350 km; its southern and eastern coasts "crenulated", hummocky and
// eroded, with bays that are drowned river mouths (Cassini RADAR). Vid Flumina enters its southern edge at about 73 N 243 W, running
// straight (along faults) through canyons about 1 km wide, 240-570 m deep, with walls of about 40 degrees, the liquid in them at the
// level of the sea (Poggiali et al. 2016). The sea: mostly methane, with nitrogen and some ethane; up to 160 m deep along Cassini's
// track (Mastrogiuseppe et al. 2014; Le Gall et al. 2016), a sludge of organics on its floor; flat to within a few millimetres, so the
// winds are light. The shore underfoot follows the Huygens probe's pictures from its landing site: rounded cobbles of water ice a few
// centimetres across on dark, damp, sandy ground. The air: 1.47 bar, 94 K (-179 C), mostly nitrogen, four times as dense as the air at
// sea level on Earth; gravity 1.352 m/s2 (0.14 g); daylight about a thousandth of Earth's, orange, from a sky of haze in which the Sun
// is only a brighter glow and Saturn cannot be seen. It is late 2144, a year and a half after a northern autumn equinox (they come every
// 29.5 years: 2025, 2055 ... 2143): at 73 N the Sun stands at most
// about 12 degrees up. The ground beyond what Cassini resolved (its radar saw 300 m at best) is generated, in keeping with those maps.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, sstep = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
const R_T = 2574700, G_T = 1.352, RHO_AIR = 5.4, RHO_LIQ = 520;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 5) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * vn(x, z); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }
function ridged(x, z, n = 4) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * (1 - Math.abs(2 * vn(x, z) - 1)); w += a; x = x * 2.1 + 3.7; z = z * 2.1 + 1.9; a *= 0.5; } return s / w; }

// ---------- the land and the sea floor: metres above the sea's surface; x east, z south ----------
// The coast runs roughly east-west with the sea to the north; inland the hummocky ground rises to 300-450 m; tributary valleys cut it and,
// near the coast, are drowned into narrow bays; Vid Flumina's canyon comes in straight from the south-southwest, a kilometre wide at the
// top, walls at 40 degrees, its floor flooded to the sea's level; offshore the floor falls away toward the 160 m of the open sea.
const FLATS = [];
const CANYON = { x0: 1500, z0: -300, dx: -Math.sin(0.18), dz: Math.cos(0.18) };
function land(x, z) { const wx = x + 1800 * (fbm(x / 9000 + 3, z / 9000) - 0.5), wz = z + 1800 * (fbm(x / 9000, z / 9000 + 7) - 0.5);
  const s = wz - 1400 * (fbm(wx / 26000 + 11, 0.5, 4) - 0.5) - 600 * (fbm(wx / 6000 + 2, 3.1, 3) - 0.5);
  let h = s > 0 ? 420 * (1 - Math.exp(-s / 1900)) + 6 * (1 - Math.exp(-s / 250)) : -165 * (1 - Math.exp(s / 14000)) - 3 * (1 - Math.exp(s / 120));
  const L = sstep(s, -1500, 2500);
  h += L * (110 * (fbm(wx / 3200, wz / 3200, 5) - 0.42) + 18 * (fbm(wx / 700, wz / 700, 4) - 0.5)) + 1.5 * (fbm(x / 90, z / 90, 3) - 0.5) + 0.25 * (fbm(x / 9, z / 9, 2) - 0.5);
  const v = ridged(wx / 5200 + 5, wz / 5200, 4); h -= sstep(v, 0.78, 0.96) * 230 * sstep(s, -800, 3000) * (0.4 + 0.6 * fbm(wx / 12000, wz / 12000, 3));
  // the canyon: distance from its axis; a flooded floor 250 m wide, walls at 40 degrees, wider and shallower toward its mouth
  const ax = x - CANYON.x0, az = z - CANYON.z0, along = ax * CANYON.dx + az * CANYON.dz, across = Math.abs(ax * CANYON.dz - az * CANYON.dx) + 120 * (fbm(along / 900, 4.4, 3) - 0.5);
  if (along > -2500) { const floor = -12 - 8 * sstep(along, 0, 8000), half = 125 + 180 * sstep(-along, 0, 2500), wall = floor + Math.max(0, across - half) * 0.84 * (1 + 0.25 * (fbm(along / 300, across / 300, 3) - 0.5)); const k = 22, sm = -k * Math.log(Math.exp(-h / k) + Math.exp(-wall / k)); h = lerpN(h, isFinite(sm) ? sm : Math.min(h, wall), sstep(along, -2500, -500)); }
  for (const f of FLATS) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + f.fall) h = lerpN(f.y, h, sstep(d, f.r, f.r + f.fall)); }
  return h; }
function groundColor(h, slope, x, z, out) { const n = fbm(x / 6, z / 6, 3), m = fbm(x / 140 + 4, z / 140, 3); let r, g, b;
  if (h < 0.4) { r = 0.11; g = 0.075; b = 0.045; }
  else { r = 0.2 + 0.1 * m + 0.05 * n; g = 0.14 + 0.07 * m + 0.035 * n; b = 0.08 + 0.04 * m + 0.02 * n; const dry = sstep(h, 0.4, 3); r = lerpN(0.13, r, dry); g = lerpN(0.09, g, dry); b = lerpN(0.055, b, dry); }
  if (slope > 0.45) { const t = sstep(slope, 0.45, 0.9), band = 0.5 + 0.5 * Math.sin(h * 0.35 + 3 * fbm(x / 80, z / 80, 2)); r = lerpN(r, 0.32 + 0.06 * band, t); g = lerpN(g, 0.25 + 0.05 * band, t); b = lerpN(b, 0.17 + 0.04 * band, t); }
  if (h > 60 && slope < 0.3) { const t = sstep(fbm(x / 400, z / 400, 3), 0.55, 0.7) * 0.6; r = lerpN(r, 0.38, t); g = lerpN(g, 0.3, t); b = lerpN(b, 0.2, t); }
  out[0] = r; out[1] = g; out[2] = b; }

// ---------- the sky: orange haze; the Sun a brighter glow low in the south; no Saturn ----------
let sunAz = Math.PI * 0.92, sunEl = 0.17; const SUN = () => V3(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), -Math.cos(sunAz) * Math.cos(sunEl));
const skyU = { sun: { value: SUN() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 sun; varying vec3 vD; void main(){ float h = vD.y, s = max(dot(vD, sun), 0.0);
    vec3 zen = vec3(0.34, 0.2, 0.08), hor = vec3(0.86, 0.56, 0.26), c = mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.45));
    c += vec3(1.0, 0.72, 0.38) * (pow(s, 6.0) * 0.55 + pow(s, 40.0) * 0.6); if (h < 0.0) c = hor * 0.92; gl_FragColor = vec4(c * 0.75, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` })); sky.layers.enable(1); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky); scene.background = new THREE.Color(0.58, 0.37, 0.17);
const FOGC = new THREE.Color(0.58, 0.37, 0.17); scene.fog = new THREE.FogExp2(FOGC, 1 / 26000);
const hemiL = new THREE.HemisphereLight(0xffb060, 0x3a2410, 1.55), sunL = new THREE.DirectionalLight(0xffc888, 0.35); sunL.position.copy(SUN()).multiplyScalar(100); hemiL.layers.enable(1); sunL.layers.enable(1); scene.add(hemiL, sunL);

// ---------- the ground: nested grids that follow you, the surface curving away (d^2/2R: Titan is small, the horizon close) ----------
const grainT = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#b8b8b8"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 9000; k++) { const v = 120 + Math.random() * 135; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const groundMat = new THREE.MeshStandardMaterial({ map: grainT, vertexColors: true, roughness: 0.96 });
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 };
function grid(size, n, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.userData = { size, n, drop, cx: 1e12, cz: 1e12, inner: null }; m.layers.enable(1); scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(400, 160, 0), grid(4000, 150, 1.5), grid(30000, 120, 10), grid(240000, 100, 70)] : [grid(500, 250, 0), grid(4000, 200, 1.5), grid(30000, 160, 10), grid(240000, 140, 70)]; for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, ix = i % (n + 1), iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    let y = H[i] - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 60; }
    p.setY(i, y); groundColor(H[i], slope, x, z, c3); col.setXYZ(i, c3[0], c3[1], c3[2]); }
  const uv = m.geometry.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, ((p.getX(i) + ox) % 4000) / 2.5, ((p.getZ(i) + oz) % 4000) / 2.5);
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = uv.needsUpdate = true; m.geometry.computeVertexNormals(); }
// everything is drawn relative to a moving origin near you (single-precision floats would shake hundreds of km out); x0, z0 is that origin
ME.x0 = 0; ME.z0 = 0;
function updateGround(force = false) { for (let i = 0; i < GRIDS.length; i++) { const m = GRIDS[i]; if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * 0.06) fillGrid(m); } }

// ---------- the cobbles: rounded lumps of water ice, 2-15 cm, as Huygens saw them; more of them near the shore ----------
const COB = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * vn(p.getX(i) * 2 + 5, p.getY(i) * 2 + p.getZ(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.62, p.getZ(i) * k); } g.computeVertexNormals(); return g; })(),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), 2600); COB.frustumCulled = false; scene.add(COB); let cobC = [1e12, 1e12];
function fillCobbles() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let k = 0; const S = 0.9, ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S); cobC = [ME.x, ME.z];
  for (let i = ci - 34; i <= ci + 34 && k < 2600; i++) for (let j = cj - 34; j <= cj + 34 && k < 2600; j++) { const r = hash(i * 3 + 1, j * 7 + 2), x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S, h = land(x, z); if (h < -0.15 || FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 2)) continue; const dens = h < 6 ? 0.55 : 0.2; if (r > dens) continue;
    const sz = 0.02 + 0.13 * Math.pow(hash(i + 9, j + 3), 2.5) + (hash(i, j + 50) < 0.03 ? 0.25 : 0); q.setFromEuler(new THREE.Euler(hash(i, 1) * 3, hash(j, 2) * 6, 0)); m4.compose(V3(x - ME.x0, h - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T) + sz * 0.15, z - ME.z0), q, V3(sz, sz, sz)); COB.setMatrixAt(k, m4);
    const v = hash(i + 4, j + 8); col.setRGB(0.42 + 0.18 * v, 0.34 + 0.13 * v, 0.24 + 0.08 * v); COB.setColorAt(k, col); k++; }
  COB.count = k; COB.instanceMatrix.needsUpdate = true; if (COB.instanceColor) COB.instanceColor.needsUpdate = true; }

// ---------- the sea: liquid methane, flat as glass, the shore and canyon walls mirrored in it ----------
// A mirror image of the world is rendered each frame from your eye reflected in the sea's surface (as a still lake reflects); the liquid's
// refractive index is about 1.27, so it reflects only 1.4% straight down and nearly everything at a glancing angle, and it is clear: in
// the shallows you see the dark sludge of the bottom. Capillary ripples only, millimetres high (Cassini found it flat to a few mm).
const RES = IS_HEADSET ? 768 : 1536, reflRT = new THREE.WebGLRenderTarget(RES, RES, { type: THREE.HalfFloatType }), reflCam = new THREE.PerspectiveCamera(100, 1, 0.1, 400000), texMat = new THREE.Matrix4(); reflCam.layers.set(1);
const seaU = { tRefl: { value: reflRT.texture }, texMat: { value: texMat }, t: { value: 0 }, fogC: { value: FOGC }, fogD: { value: 1 / 26000 }, under: { value: 0 }, org: { value: new THREE.Vector2() }, wA: { value: 0 }, wL: { value: 4 } };
const seaGeo = (() => { const rings = [0]; let r = 0, d = 1.5; while (r < 200000) { r += d; d *= 1.07; rings.push(r); } const seg = 160, pos = [], idx = [];
  for (let i = 0; i < rings.length; i++) for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2; pos.push(Math.cos(a) * rings[i], 0, Math.sin(a) * rings[i]); }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg; idx.push(a, a + seg, b, b, a + seg, b + seg); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(pos.length / 3), 1)); g.setIndex(idx); return g; })();
const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({ uniforms: seaU, transparent: true, side: THREE.DoubleSide,
  vertexShader: `attribute float depth; uniform mat4 texMat; uniform float t, wA, wL; uniform vec2 org; varying vec3 vW; varying float vDep; varying vec4 vUV; varying vec3 vN; varying float vFoam;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec2 p = w.xz + org; vec3 nrm = vec3(0.0, 1.0, 0.0); float foam = 0.0;
      if (wA > 0.0) { float far = 1.0 - smoothstep(25.0 * wL, 45.0 * wL, length(cameraPosition.xz - w.xz)), Hmax = 0.39 * max(depth, 0.0), sh = clamp(Hmax / max(wA, 1e-4), 0.0, 1.0);
        vec3 dsp = vec3(0.0); vec4 L4 = vec4(1.0, 0.71, 0.53, 1.37) * wL, A4 = vec4(0.5, 0.25, 0.14, 0.2) * wA, D4 = vec4(0.0, 0.35, -0.42, 0.15);
        for (int i = 0; i < 4; i++) { float k = 6.2831853 / L4[i], om = sqrt(1.352 * k * tanh(k * max(depth, 0.05))), a = A4[i] * sh * far; vec2 d = vec2(sin(D4[i]), cos(D4[i]));
          float ph = k * dot(d, p) - om * t + float(i) * 1.7, Q = 0.35 + 0.5 * (1.0 - sh); dsp.xz += Q * a * d * cos(ph); dsp.y += a * sin(ph); nrm.xz -= d * k * a * cos(ph); if (sh < 0.98) foam = max(foam, smoothstep(0.55, 1.0, sin(ph)) * (1.0 - sh)); }
        w.xyz += dsp; nrm = normalize(nrm); foam *= step(0.02, depth) * far; }
      vN = nrm; vFoam = foam; vW = w.xyz; vDep = depth; vUV = texMat * w; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform sampler2D tRefl; uniform float t, fogD, under, wA; uniform vec3 fogC; varying vec3 vW; varying float vDep; varying vec4 vUV; varying vec3 vN; varying float vFoam;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5); float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5);
      float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5); float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
    void main(){
      #include <logdepthbuf_fragment>
      vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      vec2 p = vW.xz; float e = 0.05, amp = 0.012 / (1.0 + dist * 0.02);
      float h0 = n2(p * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2(p * 4.1 - vec2(t * 0.7, -t * 0.3)), hx = n2((p + vec2(e, 0)) * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2((p + vec2(e, 0)) * 4.1 - vec2(t * 0.7, -t * 0.3)), hz = n2((p + vec2(0, e)) * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2((p + vec2(0, e)) * 4.1 - vec2(t * 0.7, -t * 0.3));
      vec3 N = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp) + vec3(vN.x, 0.0, vN.z)); if (under > 0.5) N = -N;
      float c = clamp(abs(dot(N, V)), 0.0, 1.0), R = 0.0141 + 0.9859 * pow(1.0 - c, 5.0);
      vec4 uv = vUV; uv.xy += N.xz * 0.6 * uv.w / max(dist, 1.0); vec3 refl = texture2DProj(tRefl, uv).rgb;
      float cosR = sqrt(max(0.0, 1.0 - (1.0 - c * c) / 1.6129)), path = vDep / max(cosR, 0.05); vec3 T = exp(-path * vec3(1.0 / 16.0, 1.0 / 19.0, 1.0 / 22.0));
      vec3 body = vec3(0.07, 0.045, 0.025); float tav = (T.r + T.g + T.b) / 3.0;
      vec3 col; float a;
      if (under > 0.5) { float tir = smoothstep(0.5, 0.75, 1.0 - c); col = mix(vec3(0.35, 0.22, 0.1) * 0.6, body, tir); a = 0.85; }
      else { a = R + (1.0 - R) * (1.0 - tav); col = (refl * R + body * (1.0 - R) * (1.0 - tav)) / max(a, 0.001); float fm = vFoam * smoothstep(0.35, 0.8, n2(vW.xz * 1.3 + vec2(t * 0.2, 0.0)) * 0.6 + n2(vW.xz * 5.0) * 0.4) * 0.55; col = mix(col, vec3(0.55, 0.45, 0.33), fm); a = mix(a, 1.0, fm * 0.8); }
      float f = 1.0 - exp(-pow(dist * fogD, 2.0)); col = mix(col, fogC, f); a = mix(a, 1.0, f);
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
sea.frustumCulled = false; scene.add(sea); let seaC = [1e12, 1e12];
function fillSea() { const p = seaGeo.attributes.position, d = seaGeo.attributes.depth; seaC = [ME.x, ME.z]; sea.position.set(ME.x - ME.x0, 0, ME.z - ME.z0); seaU.org.value.set(ME.x0, ME.z0);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r2 = x * x + z * z; p.setY(i, -r2 / (2 * R_T)); const rr = Math.sqrt(r2); d.setX(i, rr < 30000 ? Math.max(0, -land(ME.x + x, ME.z + z)) : 160); }
  p.needsUpdate = d.needsUpdate = true; }
const CLIP = [new THREE.Plane(V3(0, 1, 0), 0.02)], _hp = V3(0, 0, 0), _hq = new THREE.Quaternion(), _hs = V3(1, 1, 1);
function updateReflection() { const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera; cam.matrixWorld.decompose(_hp, _hq, _hs);
  const fwd = V3(0, 0, -1).applyQuaternion(_hq), up = V3(0, 1, 0).applyQuaternion(_hq); reflCam.position.set(_hp.x, -_hp.y, _hp.z); reflCam.up.set(up.x, -up.y, up.z); reflCam.lookAt(_hp.x + fwd.x, -(_hp.y + fwd.y), _hp.z + fwd.z);
  reflCam.updateMatrixWorld(); reflCam.updateProjectionMatrix(); sky.position.copy(reflCam.position); sky.updateMatrixWorld(); texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  const xr = renderer.xr.enabled, prev = renderer.getRenderTarget(); renderer.xr.enabled = false; renderer.clippingPlanes = CLIP; renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene, reflCam); renderer.setRenderTarget(prev); renderer.clippingPlanes = []; renderer.xr.enabled = xr; sky.position.copy(rig.position); }

// ---------- you: walking, bounding and jumping in a seventh of Earth's gravity, through air four times as thick ----------
// A person in a suit (say 110 kg) who jumps as hard as on Earth leaves the ground at about 2.6 m/s and rises more than 2 m, coming down
// after nearly four seconds; the dense air drags a little (it would carry a winged person aloft). The sea is about half as dense as you:
// walk in and you sink, slowly, to the bottom, where you can wade on, weighing half as much again less; moving through the liquid is slow.
const CDA = 0.8, MASS = 110, keys = {}, prevB = {}; let seated = false, yaw = -1.2, pitch = -0.02, vrYaw = -1.2, started = false, factI = -1, hud = true, msgT = 0, walked = 0;
const surfaceAt = (x, z) => land(x, z) - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T);
// the start: on the shore west of the canyon's mouth, a couple of metres above the liquid, looking north across the sea
{ let x = 450, z = -5000; while (z < 5000 && land(x, z) < 2.2) z += 2; ME.x = x; ME.z = z; ME.y = land(ME.x, ME.z); ME.x0 = ME.x; ME.z0 = ME.z; }
const FACTS = [
  "<b>Ligeia Mare</b>, Titan's second-largest sea, 420 by 350 km: in truth a lake of liquid methane, with nitrogen and a little ethane dissolved, larger than Lake Superior. Cassini's radar found it up to 160 m deep, its floor covered in a sludge of organic compounds, its surface flat to within a few millimetres.",
  "<b>Vid Flumina</b>, the river to your east, flows into the sea's southern shore here, straight along faults for more than 400 km through canyons about a kilometre wide and up to 570 m deep, with walls of about 40 degrees. Cassini's altimeter found the liquid in the canyon at the same level as the sea. The coast around is \"crenulated\": hummocky, eroded ground with bays that are drowned river mouths.",
  "<b>The gravity</b> is 1.35 m/s2, a seventh of Earth's. Jump (space, or B in VR): you rise over 2 m and hang in the air nearly four seconds. Walking is a loping bound.",
  "<b>The air</b> is 1.47 bar, nearly all nitrogen, at 94 K (-179 C), and four times as dense as Earth's at sea level: you would need warmth and oxygen but no pressure suit. With wings strapped to your arms you could fly.",
  "<b>The light</b>: the Sun gives Titan a hundredth of Earth's sunlight, and the haze lets through a tenth of that: about 0.1% of a sunny day on Earth, like a heavily overcast day or a well-lit room. Your eyes adapt, as they are shown here. The Sun is only a brighter glow in the orange sky; Saturn, 20 times the Moon's width, cannot be seen through the haze. It is late 2144, a year and a half after a northern autumn equinox (they come every 29.5 years: 2025, 2055 ... 2143): here at 73 N the Sun never climbs above about 12 degrees, and a day lasts 16 Earth days.",
  "<b>The horizon</b> is close: Titan is 5,150 km across, so standing at the shore the sea's horizon is only about 3 km away (on Earth, 5 km). Climb the hills and you see far, until the haze swallows the distance.",
  "<b>The sea</b> is clear liquid methane. It reflects only 1.4% of light straight down (its refractive index is about 1.27), so near your feet you see the dark bottom; farther off, at a glancing angle, it is a mirror. Walk in: being about half as dense as you, it will not hold you up. You sink, and walk on the bottom.",
  "<b>The ground</b> follows the Huygens probe's pictures from its landing site in 2005: rounded cobbles of water ice, frozen hard as rock at this cold, a few centimetres across, lying on dark sandy ground damp with methane. The ground farther off is generated in keeping with Cassini's radar maps, which saw details no smaller than about 300 m."];
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(30,18,8,.86);color:#f6e6cc;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(30,18,8,.72);color:#f6e6cc;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel); let msgAge = 0;
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(30,18,8,0.9)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f6e6cc"; g.font = "28px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 48; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 35; if (y > 495) break; } line += w + " "; } if (y <= 495) g.fillText(line, 32, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
const nextFact = () => { if (typeof ITEMS !== "undefined") { let best = null, bd = 1e9; for (const I of ITEMS) { const d = Math.hypot(ME.x - I.x, ME.z - I.z) - I.r; if (d < 0 && d < bd) { bd = d; best = I; } } if (best) { say(`<b>${best.title}</b><br>${best.text}`, 45); return; } } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); };
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyL") { tagsOn = !tagsOn; say(tagsOn ? "Labels on (L)." : "Labels off (L)."); } if (e.code === "KeyG") setWind(windI + 1); if (e.code === "KeyR") { ME.x = ME.x0s; ME.z = ME.z0s; ME.y = land(ME.x, ME.z); ME.vx = ME.vz = ME.vy = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
ME.x0s = ME.x; ME.z0s = ME.z;
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block";
  say("<b>The southern shore of Ligeia Mare, Titan, late 2144.</b> You are the science base's software engineer; your desk is in the workshop. A sea of liquid methane stretches north past a horizon only 3 km away; to the east, the canyon of Vid Flumina comes down to the shore. It is 94 K, the air four times as thick as Earth's, gravity a seventh. <b>Space</b> jumps (B in VR), <b>shift</b> bounds, <b>E</b> tells you about what you see (A in VR). Walk into the sea if you like: you will sink.", 35); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- a small science base, as one might be built in the next century or two ----------
// Plausible, not planned: no one has designed a crewed Titan base. Its logic follows from Titan. Sunlight is a thousandth of Earth's,
// so power comes from a small fission reactor, set half a kilometre off behind a berm of ice gravel and cabled in. The cold (94 K) is the
// great enemy: the modules are thickly insulated and stand on legs, so their warmth does not soften the icy, methane-damp ground under
// them. Methane is everywhere, for fuel: a pipe draws it from the sea; oxygen, to breathe and to burn it with, comes from melting and
// splitting water ice, the bedrock here. The dense air makes flying easy, so the base has a rotorcraft drone (NASA's Dragonfly flies
// on Titan in the 2030s). The crew's lander, a methane-oxygen rocket, stands on a cleared pad 300 m away from the modules because of its
// blast. A weather mast, a seismometer, a drill rig on the shore and a buoy out on the sea carry the science.
const BASE = new THREE.Group(); scene.add(BASE); const BLD = [], ITEMS = [], SOLID = [];
const S0 = { x: ME.x0s, z: ME.z0s }, at = (dx, dz) => ({ x: S0.x + dx, z: S0.z + dz });
const SITE = at(150, 110), PAD = at(-280, 170), REACT = at(160, 640), ISRU = at(215, 70);
for (const [c, r] of [[SITE, 32], [PAD, 18], [REACT, 14], [ISRU, 14]]) { const y = land(c.x, c.z); FLATS.push({ x: c.x, z: c.z, r, fall: 14, y: Math.max(y, 1.5) }); }
const BM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const quiltT = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#e8e4dc"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(90,80,70,0.45)"; g.lineWidth = 2;
  for (let k = 0; k <= 128; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(128, k); g.stroke(); } for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.08})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const M_QUILT = new THREE.MeshStandardMaterial({ map: quiltT, roughness: 0.9 }), M_ORANGE = BM(0xd86a28), M_METAL = BM(0x9aa0a8, { metalness: 0.6, roughness: 0.4 }), M_DARK = BM(0x2a2a2e), M_WIN = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffb060, emissiveIntensity: 1.6 }), M_YEL = BM(0xe8c020), M_GRAVEL = BM(0x3a2a1c, { roughness: 1 }), M_HEAT = BM(0x1a1614, { roughness: 0.95 }), M_WHITE = BM(0xf0eee8);
function part(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = null) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || BASE).add(m); return m; }
function site(c, ry = 0) { const g = new THREE.Group(); g.userData.w = c; g.userData.y = land(c.x, c.z); g.rotation.y = ry; BASE.add(g); BLD.push(g); return g; }
function item(c, r, title, text) { ITEMS.push({ x: c.x, z: c.z, r, title, text }); }
// the habitat: three modules 4.5 m across and 10 m long round a central node, 2 m up on legs; an airlock and stairs; warm lit windows
{ const g = site(SITE, -0.4), H = 3.6;
  part(new THREE.CylinderGeometry(2.6, 2.6, 4.4, 24), M_QUILT, 0, H + 1.2, 0, 0, 0, 0, g); part(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M_QUILT, 0, H + 3.4, 0, 0, 0, 0, g);
  for (const [a, name] of [[0, "quarters"], [Math.PI * 2 / 3, "laboratory"], [-Math.PI * 2 / 3, "workshop and greenhouse"]]) { const mod = new THREE.Group(); mod.rotation.y = a; g.add(mod);
    part(new THREE.CylinderGeometry(2.25, 2.25, 10, 24).rotateZ(Math.PI / 2), M_QUILT, 7.4, H + 1.2, 0, 0, 0, 0, mod); for (const x of [2.4, 12.4]) part(new THREE.CylinderGeometry(2.32, 2.32, 0.25, 24, 1, true).rotateZ(Math.PI / 2), M_ORANGE, x, H + 1.2, 0, 0, 0, 0, mod);
    part(new THREE.SphereGeometry(2.25, 20, 10, 0, Math.PI), M_QUILT, 12.4, H + 1.2, 0, 0, Math.PI / 2, 0, mod);
    for (const x of [5, 8, 11]) for (const s of [-1, 1]) part(new THREE.CircleGeometry(0.22, 16), M_WIN, x, H + 1.7, s * 2.27, 0, s > 0 ? 0 : Math.PI, 0, mod);
    for (const x of [4.5, 10.5]) for (const s of [-1, 1]) { part(new THREE.CylinderGeometry(0.12, 0.12, H + 0.6, 8), M_METAL, x, (H - 0.6) / 2 + 0.1, s * 1.5, s * 0.25, 0, 0, mod); part(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 14), M_METAL, x, 0.06, s * 2.2, 0, 0, 0, mod); } }
  part(new THREE.BoxGeometry(2.2, 2.6, 2.4), M_QUILT, 0, H + 0.9, 3.4, 0, 0, 0, g); part(new THREE.BoxGeometry(1.2, 1.9, 0.08), M_ORANGE, 0, H + 0.8, 4.62, 0, 0, 0, g);
  for (let k = 0; k < 10; k++) part(new THREE.BoxGeometry(1.4, 0.06, 0.36), M_METAL, 0, H - 0.4 - k * 0.32, 5.0 + k * 0.33, 0, 0, 0, g); for (const s of [-0.75, 0.75]) part(new THREE.BoxGeometry(0.05, 0.05, 4.6), M_METAL, s, H / 2 + 0.3, 6.4, -0.79, 0, 0, g);
  part(new THREE.CylinderGeometry(0.04, 0.04, 7, 6), M_METAL, -1.6, H + 6, -0.8, 0, 0, 0, g); const beacon = part(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff3020, emissiveIntensity: 2 }), -1.6, H + 9.6, -0.8, 0, 0, 0, g); beacon.userData.blink = true;
  const L = new THREE.PointLight(0xffc080, 60, 60, 1.8); L.position.set(0, H + 5, 6); g.add(L);
  SOLID.push({ x: SITE.x, z: SITE.z, r: 16 }); item(SITE, 26, "The habitat", "Three modules, each 4.5 m across and 10 m long: the crew's quarters, the laboratory, and a workshop with a small greenhouse under lamps, round a central node and its airlock. Under the white quilting are thick layers of insulation: at 94 K, and in air four times as dense as Earth's that carries heat away fast, keeping warm is the hardest job. They stand 2 m up on legs so their warmth does not soften the ground beneath, frozen ice gravel damp with methane. Outside there is no oxygen, so nothing burns: the methane all around is safe until it meets the base's own oxygen."); }
// the landing pad and the crew lander: a methane-oxygen rocket; parachutes do most of the work in this air, the engines the last few hundred metres
{ const g = site(PAD, 0.6); part(new THREE.CylinderGeometry(17, 17, 0.12, 48), M_GRAVEL, 0, 0.05, 0, 0, 0, 0, g); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; part(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x302000, emissive: 0xffa020, emissiveIntensity: 1.5 }), Math.cos(a) * 16.5, 0.25, Math.sin(a) * 16.5, 0, 0, 0, g); }
  part(new THREE.CylinderGeometry(3.1, 3.4, 1.2, 28), M_HEAT, 0, 2.4, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.6, 3.1, 5.2, 28), M_WHITE, 0, 5.6, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.0, 1.6, 1.6, 24), M_WHITE, 0, 9.0, 0, 0, 0, 0, g); part(new THREE.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M_DARK, 0, 9.8, 0, 0, 0, 0, g);
  for (let k = 0; k < 3; k++) part(new THREE.BoxGeometry(0.5, 0.35, 0.04), M_WIN, Math.sin(k * 0.5 - 0.5) * 2.05, 6.9, Math.cos(k * 0.5 - 0.5) * 2.05, -0.28, k * 0.5 - 0.5, 0, g);
  part(new THREE.BoxGeometry(0.9, 1.6, 0.06), M_ORANGE, 0, 5.2, 2.75, -0.3, 0, 0, g); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; part(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), M_METAL, Math.cos(a) * 3.6, 1.4, Math.sin(a) * 3.6, Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45, g); part(new THREE.CylinderGeometry(0.55, 0.6, 0.15, 14), M_METAL, Math.cos(a) * 4.3, 0.1, Math.sin(a) * 4.3, 0, 0, 0, g); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; part(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 14), M_DARK, Math.cos(a) * 1.4, 1.5, Math.sin(a) * 1.4, 0, 0, 0, g); } for (const [x, z] of [[2.8, -1.4], [-2.6, -2.0]]) part(new THREE.SphereGeometry(0.4, 10, 8), M_METAL, x, 3.1, z, 0, 0, 0, g);
  for (let k = 0; k < 9; k++) part(new THREE.BoxGeometry(0.9, 0.05, 0.3), M_METAL, 0, 0.3 + k * 0.5, 3.5 + k * 0.03 - (k > 6 ? 0 : 0), -0.05, 0, 0, g);
  SOLID.push({ x: PAD.x, z: PAD.z, r: 4.6 }); item(PAD, 24, "The crew lander", "A methane-oxygen rocket about 10 m tall that brought the crew down from orbit and will carry them back up. Landing on Titan is gentle: the thick air slows a capsule so much that parachutes do most of the work (Huygens hung under its parachute for two and a half hours) and the engines only the last few hundred metres; with gravity a seventh of Earth's, climbing back to orbit takes far less fuel than leaving Earth, and the fuel can be made here. It stands on a cleared pad 300 m from the habitat, out of reach of its exhaust."); }
// the reactor: a small fission reactor in a berm, its radiators fins in the cold wind; the cable runs to the base on low posts
{ const g = site(REACT); part(new THREE.TorusGeometry(9, 3, 8, 32).rotateX(Math.PI / 2), M_GRAVEL, 0, 0.6, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 20), M_METAL, 0, 1.7, 0, 0, 0, 0, g); part(new THREE.ConeGeometry(1.1, 0.8, 20), M_METAL, 0, 3.7, 0, 0, 0, 0, g);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; part(new THREE.BoxGeometry(0.06, 2.2, 1.4), M_DARK, Math.cos(a) * 1.6, 1.8, Math.sin(a) * 1.6, 0, -a, 0, g); } for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.6, 0.8, 0.04), M_YEL, s * 12, 1.5, -11, 0, 0, 0, g);
  SOLID.push({ x: REACT.x, z: REACT.z, r: 12 }); item(REACT, 24, "The reactor", "A small fission reactor of a few tens of kilowatts, like NASA's Kilopower design, in a berm of ice gravel half a kilometre from the habitat. Sunlight here is a thousandth of Earth's, too weak for solar panels; the reactor gives power day and night through Titan's 16-day day. Its waste heat goes into the cold, dense air through the fins.");
  const a = SITE, b = REACT, n = 24; for (let k = 1; k < n; k++) { const f = k / n, x = a.x + (b.x - a.x) * f + 18, z = a.z + (b.z - a.z) * f; const pg = site({ x, z }); part(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M_METAL, 0, 0.6, 0, 0, 0, 0, pg); }
  const cab = []; for (let k = 0; k <= n; k++) { const f = k / n, x = a.x + (b.x - a.x) * f + 18, z = a.z + (b.z - a.z) * f; cab.push([x, z]); } BASE.userData.cable = cab; }
// the fuel plant: water ice dug, melted and split for oxygen; methane piped up from the sea; their tanks
{ const g = site(ISRU, 0.3); for (const [x, c] of [[-4, M_WHITE], [4, M_ORANGE]]) { part(new THREE.SphereGeometry(2.2, 20, 14), M_QUILT, x, 3.4, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 20), c, x, 3.4, 0, 0, 0, 0, g); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; part(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), M_METAL, x + Math.cos(a) * 1.5, 1.2, Math.sin(a) * 1.5, 0, 0, 0, g); } }
  part(new THREE.BoxGeometry(4, 2.4, 3), M_QUILT, 0, 1.3, -5, 0, 0, 0, g); part(new THREE.CylinderGeometry(0.25, 0.25, 3, 10), M_DARK, 1.2, 3.4, -5, 0, 0, 0, g);
  SOLID.push({ x: ISRU.x, z: ISRU.z, r: 8 }); item(ISRU, 18, "The fuel plant", "Living off the land. Water ice, Titan's bedrock, is dug, melted and split into hydrogen and oxygen: the oxygen to breathe and to burn, in the white tank. The other tank holds methane, pumped straight from the sea through the pipe to the shore, the lander's fuel and the base's spare power. Methane, ethane and nitrogen also make plastics; a Titan base would never run short of carbon.");
  let z = ISRU.z; while (land(ISRU.x, z) > 0 && z > ISRU.z - 1500) z -= 4; const L = ISRU.z - z, n = Math.ceil(L / 8); BASE.userData.pipe = { x: ISRU.x, z0: ISRU.z - 6, z1: z - 10, n };
  const fl = site({ x: ISRU.x, z: z - 12 }); fl.userData.y = 0; part(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16), M_YEL, 0, 0.15, 0, 0, 0, 0, fl); part(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), M_METAL, 0, 1.2, 0, 0, 0, 0, fl); fl.userData.float = true; }
// science: a weather mast, a seismometer under its dome, a drill rig on the shore, the rotorcraft drone and the pressurised rover
{ const w = site(at(110, 60)); part(new THREE.CylinderGeometry(0.06, 0.08, 10, 8), M_METAL, 0, 5, 0, 0, 0, 0, w); for (const y of [3, 6, 9.6]) part(new THREE.BoxGeometry(0.9, 0.06, 0.06), M_METAL, 0, y, 0, 0, 0, 0, w);
  const cups = new THREE.Group(); cups.position.y = 10.1; w.add(cups); for (let k = 0; k < 3; k++) part(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI), M_WHITE, Math.cos(k * 2.1) * 0.25, 0, Math.sin(k * 2.1) * 0.25, 0, k * 2.1, 0, cups); cups.userData.spin = true; w.userData.cups = cups;
  item(at(110, 60), 9, "The weather mast", "Wind, temperature, pressure, methane humidity. Titan's winds at the surface are gentle (a metre a second or less; the sea is flat as glass), but its methane rain falls in rare, heavy storms, drops twice the size of raindrops falling slowly, like snowflakes, in the dense air.");
  const sm = site(at(190, 150)); part(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M_WHITE, 0, 0, 0, 0, 0, 0, sm); item(at(190, 150), 6, "The seismometer", "Listening for titanquakes and for the deep ocean of salty water thought to lie 50-100 km down, under the ice shell; Titan's tides from Saturn flex the shell every 16 days.");
  let zs = S0.z; while (land(S0.x + 60, zs) > 0.6) zs -= 2; const dr = site({ x: S0.x + 60, z: zs + 4 }); for (let k = 0; k < 3; k++) { const a = k * 2.094; part(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), M_METAL, Math.cos(a) * 0.9, 2.1, Math.sin(a) * 0.9, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22, dr); }
  part(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), M_ORANGE, 0, 1.6, 0, 0, 0, 0, dr); part(new THREE.BoxGeometry(0.6, 0.5, 0.6), M_YEL, 0, 3.9, 0, 0, 0, 0, dr); item({ x: S0.x + 60, z: zs + 4 }, 8, "The drill rig", "Coring the shore: layers of organic sediment washed down Vid Flumina and settled out of the sky. Titan's haze is a chemical factory, sunlight breaking methane and nitrogen into complex organic molecules that snow down for millions of years; some may react with water where impacts or ice volcanoes melted the crust, a natural experiment in the chemistry that led to life.");
  const dg = site(at(120, 135), 0.5); part(new THREE.CylinderGeometry(4, 4, 0.08, 24), M_GRAVEL, 0, 0.04, 0, 0, 0, 0, dg); part(new THREE.BoxGeometry(2.2, 0.7, 1.4), M_WHITE, 0, 1.0, 0, 0, 0, 0, dg); const rot = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; part(new THREE.BoxGeometry(1.6, 0.08, 0.1), M_METAL, Math.cos(a) * 0.8, 1.3, Math.sin(a) * 0.8, 0, -a, 0, dg); for (const y of [1.2, 1.45]) { const r = part(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.55 }), Math.cos(a) * 1.55, y, Math.sin(a) * 1.55, 0, 0, 0, dg); rot.push(r); } }
  for (const s of [-0.7, 0.7]) part(new THREE.BoxGeometry(0.08, 0.6, 1.6), M_METAL, s, 0.35, 0, 0, 0, 0, dg); item(at(120, 135), 8, "The drone", "A rotorcraft, like NASA's Dragonfly (due on Titan in 2034). In air four times as thick as Earth's and a seventh of the gravity, flying takes about a fortieth of the power it does on Earth: the base's scouts fly, hopping kilometres to sample the dunes, the canyon floor and the sea. A person could fly here too, with wings strapped to the arms.");
  const rv = site(at(85, 150), 1.1); part(new THREE.BoxGeometry(3, 2.2, 6.5), M_QUILT, 0, 2.1, 0, 0, 0, 0, rv); part(new THREE.BoxGeometry(2.6, 0.9, 0.08), M_WIN, 0, 2.6, 3.27, 0, 0, 0, rv); for (const z of [-2.3, 0, 2.3]) for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 20).rotateZ(Math.PI / 2), M_DARK, s * 1.75, 0.85, z, 0, 0, 0, rv);
  SOLID.push({ x: at(85, 150).x, z: at(85, 150).z, r: 3.6 }); item(at(85, 150), 9, "The pressurised rover", "For trips up the canyon and along the coast: a heated cabin on six fat, soft wheels for the loose organic sand, running on methane and oxygen from the plant (no shortage of fuel on Titan, only of oxygen).");
  const ant = site(at(175, 85)); part(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), M_METAL, 0, 1.2, 0, 0, 0, 0, ant); const dish = part(new THREE.SphereGeometry(1.6, 20, 8, 0, Math.PI * 2, 0, 0.5), M_WHITE, 0, 2.6, 0, 0, 0, 0, ant); dish.material.side = THREE.DoubleSide; dish.lookAt(dish.getWorldPosition(V3(0, 0, 0)).add(SUN().multiplyScalar(-10))); dish.rotateX(-Math.PI / 2);
  item(at(175, 85), 7, "The antenna", "Pointed at Earth, which from Titan is never far from the Sun (and always hidden in the haze). A message takes 70 to 90 minutes each way, so the crew work on their own."); }
// the buoy out on the sea, moored off the shore
{ let z = S0.z; while (land(S0.x - 40, z) > -2.5 && z > S0.z - 3000) z -= 4; const by = site({ x: S0.x - 40, z }); by.userData.y = 0; by.userData.float = true; part(new THREE.CylinderGeometry(0.7, 0.5, 0.9, 16), M_YEL, 0, 0.1, 0, 0, 0, 0, by); part(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), M_METAL, 0, 1.4, 0, 0, 0, 0, by);
  const lt = part(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x402000, emissive: 0xffc040, emissiveIntensity: 2 }), 0, 2.6, 0, 0, 0, 0, by); lt.userData.blink = true; item({ x: S0.x - 40, z }, 10, "The sea buoy", "Moored in Ligeia Mare, it measures the liquid's depth, temperature and make-up and listens for the waves and the \"magic islands\" Cassini saw come and go (bubbles of nitrogen? floating ice? waves?). A submarine has been proposed to explore Kraken Mare, the largest sea, farther north."); }
// the pipe and the cable as single meshes
function placeBase() { for (const g of BLD) { const c = g.userData.w, y = g.userData.y ?? land(c.x, c.z); g.position.set(c.x - ME.x0, y - ((c.x - ME.x) ** 2 + (c.z - ME.z) ** 2) / (2 * R_T), c.z - ME.z0); }
  if (BASE.userData.pipeMesh) BASE.remove(BASE.userData.pipeMesh); const P = BASE.userData.pipe, pts = []; for (let k = 0; k <= P.n * 2; k++) { const z = P.z0 + (P.z1 - P.z0) * k / (P.n * 2); pts.push(V3(P.x - ME.x0 + 2, Math.max(land(P.x + 2, z), -0.2) + 0.5, z - ME.z0)); }
  BASE.userData.pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.14, 8), M_METAL); BASE.add(BASE.userData.pipeMesh);
  if (BASE.userData.cabMesh) BASE.remove(BASE.userData.cabMesh); const cp = BASE.userData.cable.map(([x, z]) => V3(x - ME.x0, land(x, z) + 1.15, z - ME.z0)); BASE.userData.cabMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), cp.length * 3, 0.03, 5), M_DARK); BASE.add(BASE.userData.cabMesh); }
BASE.traverse(o => o.layers.enable(1));
FACTS.push("<b>The base</b> (imagined: no one has yet planned one) sits on the shore east of you, with its lander on a pad 300 m off and a reactor half a kilometre inland. Climb the stairs into the habitat (the airlock door opens as you come near); get into the rover by its orange door (E) and drive it. Walk up to anything, or anyone, and press E.");

// ---------- inside the habitat ----------
// Floors are 3.45 m above the ground, flat across the lower part of each 4.5 m tube. The airlock leads in from the stairs; the node joins the
// three modules: the crew's quarters, the laboratory (where samples are kept at Titan's own 94 K in a nitrogen-cooled glovebox and freezer,
// or their methane and other volatiles would boil off), and the workshop with the greenhouse at its end.
const HAB = BLD.find(g => g.userData.w === SITE), FL = 3.45, MODS = [0, Math.PI * 2 / 3, -Math.PI * 2 / 3], HAB_RY = -0.4;
const M_PANEL = new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#e4e6e8"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#b8bcc2"; g.lineWidth = 3; g.strokeRect(2, 2, 124, 124); g.fillStyle = "#c8ccd2"; g.fillRect(10, 100, 30, 8); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 4); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.7, side: THREE.BackSide });
const M_FLOOR = BM(0x5a6068, { roughness: 0.9 }), M_LIGHT = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.4 }), M_BENCH = BM(0xd8dce0), M_SCREEN = new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x2a6a9a, emissiveIntensity: 1.2 }), M_GROW = new THREE.MeshStandardMaterial({ color: 0x400040, emissive: 0xff40c0, emissiveIntensity: 1.6 }), M_LEAF = BM(0x3a8a3a), M_FROST = BM(0xd8e8f0, { transparent: true, opacity: 0.7 }), M_BLUE = BM(0x3a5a8a), M_PORT = new THREE.MeshBasicMaterial({ color: 0x8a5a2a });
{ const g = HAB, H = 3.6, ax = H + 1.2;
  for (const [k, a] of MODS.entries()) { const m = new THREE.Group(); m.rotation.y = a; g.add(m);
    part(new THREE.CylinderGeometry(2.14, 2.14, 10, 28, 1, true).rotateZ(Math.PI / 2), M_PANEL, 7.4, ax, 0, 0, 0, 0, m); part(new THREE.CircleGeometry(2.14, 28), M_PANEL, 12.35, ax, 0, 0, Math.PI / 2, 0, m);
    part(new THREE.BoxGeometry(10, 0.1, 3.5), M_FLOOR, 7.4, FL - 0.05, 0, 0, 0, 0, m); part(new THREE.BoxGeometry(9.4, 0.04, 0.3), M_LIGHT, 7.4, ax + 2.05, 0, 0, 0, 0, m);
    for (const x of [5, 8, 11]) for (const s of [-1, 1]) part(new THREE.CircleGeometry(0.2, 16), M_PORT, x, ax + 0.5, s * 2.1, 0, s > 0 ? Math.PI : 0, 0, m);
    const L = new THREE.PointLight(0xf0f4ff, 9, 10, 1.6); L.position.set(7.4, ax + 1.5, 0); m.add(L);
    part(new THREE.TorusGeometry(1.15, 0.09, 8, 24).rotateY(Math.PI / 2), M_METAL, 2.45, FL + 1.2, 0, 0, 0, 0, m); part(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24).rotateZ(Math.PI / 2), M_METAL, 2.95, FL + 1.2, -1.4, 0, -1.2, 0, m);
    const B = (x, y, z, sx, sy, sz, mat) => part(new THREE.BoxGeometry(sx, sy, sz), mat, x, FL + y, z, 0, 0, 0, m);
    if (k === 0) { for (const x of [4.0, 6.3, 8.6]) { for (const y of [0.35, 1.4]) { B(x, y, -1.15, 2.0, 0.08, 0.85, M_METAL); B(x, y + 0.12, -1.15, 1.9, 0.15, 0.8, M_BLUE); B(x - 0.75, y + 0.2, -1.15, 0.35, 0.1, 0.6, M_WHITE); } B(x, 1.0, -0.72, 2.0, 2.0, 0.02, BM(0x6a7a9a, { transparent: true, opacity: 0.6 })); }
      B(10.7, 0.75, 0.4, 1.3, 0.05, 0.9, M_BENCH); B(10.7, 0.37, 0.4, 0.1, 0.74, 0.1, M_METAL); for (const [dx, dz] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 1.2], [0.6, 1.2]]) B(10.7 + dx, 0.25, 0.4 + dz * 0.6, 0.35, 0.5, 0.35, M_METAL);
      B(4.5, 0.47, 1.35, 3, 0.94, 0.55, M_BENCH); B(4.5, 1.6, 1.55, 3, 0.7, 0.2, M_BENCH); B(3.6, 1.3, 1.6, 0.5, 0.35, 0.02, M_SCREEN); B(11.9, 0.5, -0.8, 0.8, 1.0, 0.5, M_DARK); }
    if (k === 1) { for (const s of [-1, 1]) B(7.2, 0.47, s * 1.32, 8.4, 0.94, 0.6, M_BENCH);
      B(5.6, 1.3, 1.3, 1.6, 0.75, 0.7, M_METAL); B(5.6, 1.3, 0.94, 1.4, 0.55, 0.02, M_FROST); for (const dx of [-0.35, 0.35]) part(new THREE.TorusGeometry(0.12, 0.03, 6, 14), M_DARK, 5.6 + dx, FL + 1.2, 0.93, 0, 0, 0, m);
      B(8.9, 0.47, -1.32, 1.2, 0.94, 0.62, M_WHITE); B(8.9, 1.02, -1.32, 1.0, 0.12, 0.5, M_FROST); B(4.0, 1.25, -1.3, 1.1, 0.6, 0.55, BM(0x8a9098, { metalness: 0.4 })); B(4.0, 1.25, -1.02, 0.4, 0.25, 0.02, M_SCREEN);
      B(10.5, 1.15, 1.3, 0.25, 0.4, 0.25, M_DARK); B(10.5, 1.42, 1.25, 0.06, 0.3, 0.06, M_METAL); for (let t = 0; t < 8; t++) part(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8).rotateZ(Math.PI / 2), BM(0x5a3a22), 11.4, FL + 1.2 + (t % 4) * 0.12, -0.6 + Math.floor(t / 4) * 1.2, 0, 0, 0, m);
      for (const x of [6.8, 9.8]) B(x, 1.45, -1.55, 0.6, 0.38, 0.03, M_SCREEN); }
    if (k === 2) { for (let n = 0; n < 3; n++) { B(3.4 + n * 0.75, 1.0, -1.35, 0.55, 1.1, 0.35, M_QUILT); B(3.4 + n * 0.75, 1.75, -1.35, 0.32, 0.32, 0.32, BM(0xffe0a0, { transparent: true, opacity: 0.5 })); }
      B(6.8, 0.47, 1.32, 2.4, 0.94, 0.6, BM(0x8a6a4a)); B(6.8, 1.5, 1.6, 2.4, 1.0, 0.04, BM(0x6a6e74)); for (let t = 0; t < 7; t++) B(6.0 + t * 0.25, 1.5, 1.57, 0.04, 0.3, 0.03, M_DARK); B(6.9, 0.5, -1.3, 0.8, 1.0, 0.7, M_BENCH);
      for (const s of [-1, 1]) for (const y of [0.3, 0.9, 1.5]) { B(10.8, y, s * 1.3, 2.8, 0.05, 0.55, M_METAL); B(10.8, y + 0.35, s * 1.3, 2.8, 0.03, 0.12, M_GROW); for (let p = 0; p < 6; p++) part(new THREE.SphereGeometry(0.13, 8, 6), M_LEAF, 9.6 + p * 0.45, FL + y + 0.12, s * 1.3, 0, 0, 0, m); }
      const GL = new THREE.PointLight(0xff60d0, 5, 6, 1.6); GL.position.set(10.8, ax + 0.6, 0); m.add(GL); } }
  part(new THREE.CylinderGeometry(2.5, 2.5, 0.1, 28), M_FLOOR, 0, FL - 0.05, 0, 0, 0, 0, g);
  { const open = [0, ...MODS.map(a => Math.atan2(Math.cos(a), -Math.sin(a)))].map(t => (t + Math.PI * 4) % (Math.PI * 2)).sort((p, q) => p - q), hw = 0.5;
    for (const t of open) part(new THREE.CylinderGeometry(2.5, 2.5, 0.8, 8, 1, true, t - hw, 2 * hw), M_PANEL, 0, H + 3.0, 0, 0, 0, 0, g);
    for (let i = 0; i < open.length; i++) { const a0 = open[i] + hw, a1 = (i + 1 < open.length ? open[i + 1] : open[0] + Math.PI * 2) - hw; if (a1 > a0) part(new THREE.CylinderGeometry(2.5, 2.5, 4.3, 20, 1, true, a0, a1 - a0), M_PANEL, 0, H + 1.25, 0, 0, 0, 0, g); } }
  part(new THREE.CircleGeometry(2.5, 24), M_PANEL, 0, H + 3.35, 0, -Math.PI / 2, 0, 0, g); part(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 16), M_BENCH, 0, FL + 0.45, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 20), M_SCREEN, 0, FL + 0.92, 0, 0, 0, 0, g);
  const NL = new THREE.PointLight(0xf0f4ff, 7, 8, 1.6); NL.position.set(0, H + 2.6, 0); g.add(NL);
  for (const s of [-1, 1]) part(new THREE.PlaneGeometry(2.4, 2.4), M_PANEL, s * 1.0, FL + 1.2, 3.4, 0, s * Math.PI / 2, 0, g); part(new THREE.PlaneGeometry(2.0, 2.4), M_PANEL, 0, FL + 2.4, 3.4, -Math.PI / 2, 0, 0, g); part(new THREE.BoxGeometry(2.0, 0.08, 2.4), M_FLOOR, 0, FL - 0.04, 3.4, 0, 0, 0, g);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.5, 2.0, 0.5), M_ORANGE, s * 0.7, FL + 1.0, 3.6, 0, 0, 0, g); }
// the airlock: cycled by hand (E, or A in VR). Outer hatch open, step in, close it; the cold nitrogen and methane that came in with you are
// purged and the air warmed (methane mixing with the habitat's oxygen could burn or explode, so nothing opens until the purge is done);
// then the inner hatch opens to the node. Going out, the same backwards. (Shortened here: a real cycle would take a few minutes.)
// The habitat is held at Titan's own pressure, 1.5 bar, with normal oxygen: the hull barely strains, a gift of Titan's thick air.
const DOOR = HAB.children.find(o => o.geometry && o.geometry.parameters && o.geometry.parameters.width === 1.2 && o.geometry.parameters.height === 1.9); if (DOOR) DOOR.userData.x0 = DOOR.position.x;
const IDOOR = part(new THREE.BoxGeometry(1.2, 1.9, 0.08), M_ORANGE, 0, FL + 0.95, 2.25, 0, 0, 0, HAB); IDOOR.userData.x0 = 0;
const AL = { outer: 0, inner: 1, busy: 0, step: "", after: null };
const alTex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.userData.c = c; t.colorSpace = THREE.SRGBColorSpace; return t; })();
part(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: alTex, toneMapped: false }), -0.98, FL + 1.5, 3.4, 0, Math.PI / 2, 0, HAB);
function alPanel(lines, col = "#7ae0a0") { const g = alTex.userData.c.getContext("2d"); g.fillStyle = "#0a1410"; g.fillRect(0, 0, 256, 128); g.fillStyle = col; g.font = "bold 20px monospace"; lines.forEach((l, i) => g.fillText(l, 10, 30 + i * 30)); alTex.needsUpdate = true; }
alPanel(["AIRLOCK", "inner open", "outer closed"]);
function alRun(steps) { AL.busy = 1; let t = 0; for (const [dt, fn] of steps) { t += dt; setTimeout(fn, t * 1000); } setTimeout(() => AL.busy = 0, (t + 0.2) * 1000); }
const zoneOf = (lx, lz) => Math.abs(lx) < 0.9 && lz > 2.25 && lz < 4.6 ? "lock" : inHab(lx, lz) ? "hab" : "out";
function airlockAct() { if (AL.busy) { say("The airlock is cycling: wait."); return true; } const [lx, lz] = habLocal(ME.x, ME.z), z = insideHab() || onStairs(lx, lz) ? zoneOf(lx, lz) : "far";
  if (z === "far") return false; const nearOuter = z === "out" && lz < 6.5, nearInner = z === "hab" && Math.hypot(lx, lz - 2.25) < 2.0;
  if (z === "lock") { if (AL.outer > 0.5) { say("Closing the outer hatch. Purging the methane and nitrogen that came in with you, and warming the air..."); alRun([[0, () => { AL.outer = 0; alPanel(["CYCLING", "outer closed", "purge CH4 2.1%"], "#ffc060"); }], [2.5, () => alPanel(["CYCLING", "purge CH4 0.4%", "temp -40 C"], "#ffc060")], [2.5, () => alPanel(["CYCLING", "CH4 <0.01%", "temp 18 C"], "#ffc060")], [1.5, () => { AL.inner = 1; alPanel(["READY", "inner open", "1.47 bar"]); say("Purge done: the inner hatch opens to the node. Inside the air is held at Titan's own 1.5 bar, so the hull barely strains."); }]]); }
    else { say("Closing the inner hatch. The outer hatch opens: 94 K and 1.47 bar of nitrogen outside."); alRun([[0, () => { AL.inner = 0; alPanel(["CYCLING", "inner closed", "suits sealed?"], "#ffc060"); }], [2.0, () => { AL.outer = 1; alPanel(["OUTER OPEN", "-179 C outside", "1.47 bar"], "#ff8060"); }]]); } return true; }
  if (nearOuter && AL.outer < 0.5) { if (AL.inner > 0.5) { AL.inner = 0; } say("The outer hatch opens. Step into the airlock, then E (A) to cycle it."); AL.outer = 1; alPanel(["OUTER OPEN", "-179 C outside", "1.47 bar"], "#ff8060"); return true; }
  if (nearInner && AL.inner < 0.5) { if (AL.outer > 0.5) { say("The outer hatch is open: step into the airlock and cycle it first."); return true; } AL.inner = 1; alPanel(["READY", "inner open", "1.47 bar"]); say("The inner hatch opens. Step into the airlock, then E (A) to cycle out."); return true; }
  return false; }
// where you can stand inside, in the habitat's own frame (x, z): the node, the airlock, the modules, the stairs
const habLocal = (x, z) => { const dx = x - SITE.x, dz = z - SITE.z, c = Math.cos(HAB_RY), s = Math.sin(HAB_RY); return [dx * c - dz * s, dx * s + dz * c]; };
function inHab(lx, lz) { if (lx * lx + lz * lz < 2.3 * 2.3) return true; if (Math.abs(lx) < 0.9 && lz > 1.8 && lz < 4.6) return true;
  for (const a of MODS) { const u = lx * Math.cos(a) - lz * Math.sin(a), w = lx * Math.sin(a) + lz * Math.cos(a); if (u > 1.9 && u < 12.1 && Math.abs(w) < 1.6) return true; } return false; }
const onStairs = (lx, lz) => Math.abs(lx) < 0.68 && lz >= 4.5 && lz < 8.3;
function habFloor(x, z, yRef) { const gy = HAB.userData.y, [lx, lz] = habLocal(x, z); if (inHab(lx, lz) && yRef > gy + 2.6) return gy + FL; if (onStairs(lx, lz)) { const y = gy + FL * (1 - (lz - 4.5) / 3.8); if (y <= yRef + 0.55) return Math.max(y, land(x, z)); } return null; }
const insideHab = () => { const [lx, lz] = habLocal(ME.x, ME.z); return inHab(lx, lz) && ME.y > HAB.userData.y + 2.6; };

// ---------- the crew: who would be sent, and what they would really be doing ----------
// A first science base would have room for few people, so each would have to count. Titan is above all a world of geology (rivers, rain, seas,
// dunes, canyons, perhaps ice volcanoes), so two of the eight are geologists; then a limnologist for the seas, a geophysicist for the ocean deep
// under the ice, an astrobiologist and organic chemist for the chemistry that might lead toward life, an atmospheric scientist; two engineers
// keep everyone alive, one of them also the physician and commander. The people are imagined; the work is what such a crew would do.
function mergeG(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const q of gs) { const c = q.attributes.position.count; pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3);
    for (let i = 0; i < c; i++) { const sh = q.attributes.color ? q.attributes.color.getX(i) : 1, ny = q.attributes.normal.getY(i), v = sh * (0.8 + 0.2 * (ny * 0.5 + 0.5)); col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = v; } o += c; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); return out; }
const MT = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), V3(sx, sy, sz));
const G1 = (g, m = MT(0, 0, 0)) => mergeG([[g, m]]);
// cloth that hangs in folds: a tapered tube whose radius ripples more toward the hem, shaded in the valleys
function foldTube(rTop, rBot, h, segs, folds, amp, open = 0, thetaStart = 0, seed = 0) { const g = new THREE.CylinderGeometry(rTop, rBot, h, segs, 4, true, thetaStart, Math.PI * 2 - open), p = g.attributes.position, sh = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (h / 2 - y) / h, a = Math.atan2(x, z), wv = Math.sin(a * folds + seed) + 0.4 * Math.sin(a * folds * 2.3 + seed * 3), k = 1 + amp * t * wv;
    p.setXYZ(i, x * k, y - t * t * 0.015 * (1 + Math.sin(a * 3 + seed)), z * k); const s = 0.86 + 0.14 * wv * t - 0.08 * t; sh[i * 3] = sh[i * 3 + 1] = sh[i * 3 + 2] = s; }
  g.setAttribute("color", new THREE.BufferAttribute(sh, 3)); g.computeVertexNormals(); return g; }
// a head: a sphere shaped into skull, cheeks and jaw, with nose, ears and brow
function headGeo() { const g = new THREE.SphereGeometry(0.1, 16, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) / 0.1, y = p.getY(i) / 0.1, z = p.getZ(i) / 0.1;
    x *= 0.84; y *= 1.12; if (y < 0) { x *= 1 - 0.28 * -y; if (z > 0) z = z * (1 - 0.1 * -y) + 0.06 * -y; } if (z < 0) z *= 1.06; if (z > 0.6 && y > 0.32 && y < 0.5) z += 0.025;
    p.setXYZ(i, x * 0.1, y * 0.1, z * 0.1); } g.computeVertexNormals();
  return mergeG([[g, MT(0, 0.67, 0)], [new THREE.ConeGeometry(0.016, 0.05, 4).rotateX(-Math.PI / 2 - 0.35), MT(0, 0.663, 0.104)], [new THREE.SphereGeometry(0.02, 6, 4), MT(0.087, 0.668, -0.005, 0.35, 1.2, 0.9)], [new THREE.SphereGeometry(0.02, 6, 4), MT(-0.087, 0.668, -0.005, 0.35, 1.2, 0.9)],
    [new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), MT(0, 0.55, -0.005)]]); }
// a cap of hair or cloth over the head that stops at the hairline in front (leaving the face open) and comes lower at the sides and back
function faceCap(r, backT, frontT, width, segs = 14) { const g = new THREE.SphereGeometry(r, segs, 9, 0, Math.PI * 2, 0, backT), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.acos(clampN(y / r, -1, 1)), a = Math.atan2(x, z), f = clampN(1 - Math.abs(a) / width, 0, 1), fs = f * f * (3 - 2 * f), mt = backT + (frontT - backT) * fs;
    if (th > mt) p.setXYZ(i, r * Math.sin(mt) * Math.sin(a), r * Math.cos(mt), r * Math.sin(mt) * Math.cos(a)); }
  g.computeVertexNormals(); return g; }
const HIPY = 0.92, THIGH = 0.44, SHIN = 0.42, UARM = 0.28, FARM = 0.26;
const PG = {
  thigh: G1(new THREE.CylinderGeometry(0.078, 0.058, THIGH, 9).translate(0, -THIGH / 2, 0)),
  shin: mergeG([[new THREE.SphereGeometry(0.058, 7, 5), MT(0, 0, 0)], [new THREE.LatheGeometry([[0.044, -SHIN], [0.048, -SHIN * 0.75], [0.058, -SHIN * 0.35], [0.055, -0.04], [0.05, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 9), MT(0, 0, 0)]]),
  shoe: mergeG([[new THREE.BoxGeometry(0.09, 0.065, 0.2), MT(0, -0.035, 0.035)], [new THREE.SphereGeometry(0.046, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, -0.068, 0.13, 1, 0.9, 1.15)], [new THREE.SphereGeometry(0.048, 7, 4), MT(0, -0.03, -0.035, 1, 0.8, 1)]]),
  uarm: mergeG([[new THREE.SphereGeometry(0.062, 8, 6), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.058, 0.047, UARM, 9).translate(0, -UARM / 2, 0), MT(0, 0, 0)]]),
  farm: mergeG([[new THREE.SphereGeometry(0.048, 7, 5), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.047, 0.036, FARM, 9).translate(0, -FARM / 2, 0), MT(0, 0, 0)]]),
  hand: mergeG([[new THREE.SphereGeometry(0.038, 7, 5), MT(0, -0.05, 0.005, 0.85, 1.35, 0.6)], [new THREE.SphereGeometry(0.016, 5, 4), MT(0.03, -0.03, 0.02, 1, 1.9, 1, 0, 0.5)]]),
  torso: mergeG([[new THREE.LatheGeometry([[0.14, -0.02], [0.13, 0.12], [0.15, 0.25], [0.165, 0.34], [0.17, 0.42], [0.12, 0.49], [0.055, 0.52]].map(([r, y]) => new THREE.Vector2(r, y)), 14), MT(0, 0, 0, 1, 1, 0.68)],
    [new THREE.SphereGeometry(0.07, 8, 6), MT(0.155, 0.43, 0)], [new THREE.SphereGeometry(0.07, 8, 6), MT(-0.155, 0.43, 0)]]),
  head: headGeo(),
  eyeW: mergeG([[new THREE.SphereGeometry(0.014, 6, 4), MT(0.033, 0.694, 0.089, 1, 0.75, 0.55)], [new THREE.SphereGeometry(0.014, 6, 4), MT(-0.033, 0.694, 0.089, 1, 0.75, 0.55)]]),
  eyes: mergeG([[new THREE.SphereGeometry(0.0065, 5, 4), MT(0.033, 0.694, 0.096)], [new THREE.SphereGeometry(0.0065, 5, 4), MT(-0.033, 0.694, 0.096)], [new THREE.BoxGeometry(0.03, 0.004, 0.008), MT(0, 0.632, 0.097)]]),
  brows: mergeG([[new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(0.033, 0.712, 0.097, 1, 1, 1, 0, -0.12)], [new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(-0.033, 0.712, 0.097, 1, 1, 1, 0, 0.12)]]),
  helmet: G1(new THREE.SphereGeometry(0.17, 16, 12), MT(0, 0.69, 0.015)),
  pack: G1(new THREE.BoxGeometry(0.34, 0.46, 0.2), MT(0, 0.3, -0.2)),
  suitBody: G1(foldTube(0.19, 0.2, 0.62, 16, 6, 0.03, 0, 0, 2).scale(1, 1, 0.8), MT(0, 0.22, 0)),
  collar: G1(new THREE.TorusGeometry(0.11, 0.035, 6, 16).rotateX(Math.PI / 2), MT(0, 0.53, 0)),
  badge: G1(new THREE.BoxGeometry(0.06, 0.04, 0.01), MT(0.08, 0.42, 0.125)),
  hairShort: G1(faceCap(0.108, Math.PI * 0.52, Math.PI * 0.3, Math.PI * 0.42).scale(0.9, 1.12, 1.04).translate(0, 0.672, -0.006)),
  hairUp: mergeG([[faceCap(0.112, Math.PI * 0.55, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.68, -0.004, 0.96, 1.18, 1.08)], [new THREE.SphereGeometry(0.06, 8, 6), MT(0, 0.72, -0.11)]]) };
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairShort", "hairUp", "suitBody", "pack", "collar", "badge", "helmet"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide, vertexColors: true });
// poses: hip flex (l), knee bend (k), shoulder swing (a), elbow bend (e, negative = forearm forward), skirt tilt (sk)
function poseOf(kind, t, ph, walkAmt = 1) { const c = t * 7 + ph, w = Math.sin(c), sway = 0.04 * Math.sin(t * 0.8 + ph);
  const P = { drop: 0, lean: 0, lL: 0, lR: 0, kL: 0.05, kR: 0.05, aL: sway, aR: -sway, eL: -0.15, eR: -0.15, sk: 0 };
  const walk = (amp = 1) => { const A = walkAmt * amp; P.lL = 0.42 * w * A; P.lR = -0.42 * w * A; P.kL = 0.08 + 0.6 * Math.max(0, Math.cos(c)) * A; P.kR = 0.08 + 0.6 * Math.max(0, -Math.cos(c)) * A; P.lean = 0.05; P.aL = -0.35 * w * A; P.aR = 0.35 * w * A; P.eL = -0.25 - 0.15 * Math.max(0, -w) * A; P.eR = -0.25 - 0.15 * Math.max(0, w) * A; };
  const sit = () => Object.assign(P, { drop: HIPY - 0.47, lL: -1.5, lR: -1.45, kL: 1.5, kR: 1.45, lean: -0.04, sk: -1.15 });
  switch (kind) {
    case "walk": walk(); break;
    case "carry": walk(0.9); Object.assign(P, { aL: -0.45, aR: -0.45, eL: -1.15, eR: -1.15 }); break;
    case "shoulder": walk(0.85); Object.assign(P, { aL: -2.6, eL: -1.0, aR: 0.35 * w, eR: -0.3 }); break;
    case "pull": walk(0.7); Object.assign(P, { lean: 0.45, aL: -1.2, aR: -1.0, eL: -0.3, eR: -0.4 }); break;
    case "guard": Object.assign(P, { aR: -0.3, eR: -1.05, aL: -0.15, eL: -0.6 }); break;
    case "kneel": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.06, aL: -0.45, aR: -0.45, eL: -1.25, eR: -1.25 }); break;
    case "pray": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.12, aL: -0.7, aR: -0.7, eL: -1.55, eR: -1.55 }); break;
    case "sit": sit(); Object.assign(P, { aL: -0.55, aR: -0.5, eL: -0.95, eR: -1.0 - 0.15 * Math.max(0, Math.sin(t * 0.9 + ph)) }); break;
    case "sitground": Object.assign(P, { drop: HIPY - 0.12, lL: -1.4, lR: -1.3, kL: 0.4, kR: 0.6, lean: -0.15, aL: -0.3, aR: -0.4, eL: -0.6, eR: -0.8 - 0.2 * Math.max(0, Math.sin(t * 0.5 + ph)), sk: -1.0 }); break;
    case "row": { sit(); const r = Math.sin(t * 2.4); Object.assign(P, { lean: 0.22 * r, aL: -1.05 - 0.35 * r, aR: -1.05 - 0.35 * r, eL: -0.4 + 0.35 * r, eR: -0.4 + 0.35 * r }); break; }
    case "paddle": { const r = Math.sin(t * 2.1 + ph); Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.25 + 0.15 * r, aL: -1.4 - 0.4 * r, aR: -0.6 - 0.5 * r, eL: -0.3, eR: -0.6 }); break; }
    case "pole": { const q = (t * 0.35 + ph) % 1; Object.assign(P, { lean: 0.35 + 0.3 * Math.sin(q * 6.283), aL: -1.5 + 0.6 * q, aR: -1.3 + 0.6 * q, eL: -0.3, eR: -0.4, lL: 0.2, lR: -0.2 }); walk(0.5); break; }
    case "hammer": { const q = (t * 1.6 + ph) % 1, up = q < 0.6 ? q / 0.6 : 1 - (q - 0.6) / 0.4; Object.assign(P, { lean: 0.22, lL: -0.1, lR: 0.12, kL: 0.15, kR: 0.1, aL: -0.55, eL: -0.9, aR: -0.5 - 1.9 * up, eR: -0.4 - 0.6 * up }); break; }
    case "hoe": { const q = (t * 0.9 + ph) % 1, up = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5; Object.assign(P, { lean: 0.35 + 0.2 * (1 - up), lL: -0.25, lR: 0.15, kL: 0.3, kR: 0.15, aL: -0.9 - 1.0 * up, aR: -0.7 - 1.0 * up, eL: -0.5, eR: -0.6 }); break; }
    case "lever": { const q = Math.sin(t * 0.8 + ph); Object.assign(P, { lean: 0.3 + 0.25 * q, aL: -1.6 - 0.5 * q, aR: -1.6 - 0.5 * q, eL: -0.2, eR: -0.2, lL: -0.2, lR: 0.25, kL: 0.2, kR: 0.1 }); break; }
    case "knead": { const q = Math.sin(t * 3 + ph); Object.assign(P, { lean: 0.3, aL: -0.9 - 0.15 * q, aR: -0.9 + 0.15 * q, eL: -0.9, eR: -0.9 }); break; }
    case "talk": { const g = Math.pow(Math.max(0, Math.sin(t * 0.55 + ph)), 4); Object.assign(P, { aL: 0.04, eL: -0.2, aR: -0.08 - 0.45 * g, eR: -0.28 - 0.85 * g - 0.15 * g * Math.sin(t * 2.1 + ph) }); break; }
    case "ride": Object.assign(P, { drop: HIPY - 0.5, lL: -0.4, lR: -0.4, kL: 0.95, kR: 0.95, spr: 0.42, aL: -0.45, aR: -0.45, eL: -0.95, eR: -0.95, lean: 0.05 }); break;
    case "dance": { const q = Math.sin(t * 4 + ph); walk(0.6); Object.assign(P, { aL: -0.6 + 0.3 * q, aR: -1.4 - 0.3 * q, eL: -0.6, eR: -0.5, lean: -0.03 }); break; }
    case "fiddle": Object.assign(P, { aL: -1.25, eL: -1.4, aR: -0.6 - 0.25 * Math.sin(t * 7 + ph), eR: -1.2 }); break;
    case "spin": Object.assign(P, { aL: -0.55, eL: -1.55, aR: -0.35, eR: -0.75 - 0.25 * Math.sin(t * 3 + ph) }); break;
    case "bow": Object.assign(P, { lean: 0.38, aL: -0.15, aR: -0.15, eL: -0.3, eR: -0.3 }); break;
    case "sell": { const g = Math.pow(Math.max(0, Math.sin(t * 0.45 + ph)), 3); Object.assign(P, { lean: 0.06, aL: -0.12, eL: -0.35, aR: -0.1 - 0.5 * g, eR: -0.3 - 0.75 * g }); break; } }
  return P; }
const _b = new THREE.Matrix4(), _hm = new THREE.Matrix4(), _sk = new THREE.Matrix4(), _j = new THREE.Matrix4(), _tmp = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), ZEROM = new THREE.Matrix4().makeScale(0, 0, 0), _p = V3(0, 0, 0), _s = V3(1, 1, 1);

const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR"]), SKIRT = new Set([]);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean)); _sk.copy(_hm).multiply(_j.makeRotationX(P.sk - P.lean * 0.5));
  const leg = (sx, l, k, side) => { const th = _b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)); if (P.spr) th.multiply(_tmp.makeRotationZ(P.spr * Math.sign(sx))); th.multiply(_j.makeRotationX(l));
    const sh = th.clone().multiply(_tmp.makeTranslation(0, -THIGH, 0)).multiply(_j.makeRotationX(k));
    _M["leg" + side] = th; _M["shin" + side] = sh; _M["shoe" + side] = sh.clone().multiply(_tmp.makeTranslation(0, -SHIN, 0)).multiply(_j.makeRotationX(-(l + k) * 0.85)); };
  leg(0.085, P.lL, P.kL, "L"); leg(-0.085, P.lR, P.kR, "R");
  const arm = (sx, a, e, sp, side) => { const u = _hm.clone().multiply(_tmp.makeTranslation(sx, 0.43, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), f = u.clone().multiply(_tmp.makeTranslation(0, -UARM, 0)).multiply(_j.makeRotationX(e)), hd = f.clone().multiply(_tmp.makeTranslation(0, -FARM, 0));
    _M["arm" + side] = u; _M["fore" + side] = f; _M["hand" + side] = hd; return [f, hd]; };
  arm(0.19, P.aL, P.eL, -0.07, "L"); const [, hR] = arm(-0.19, P.aR, P.eR, 0.07, "R");
  _M.musket = hR.clone().multiply(_tmp.makeTranslation(0, -0.04, 0.02)).multiply(_j.makeRotationX(-(P.aR + P.eR) - P.lean));
  for (const p of PARTS) { if (!shows(L, p)) { out.push(ZEROM); continue; } out.push(LIMB.has(p) ? _M[p] : SKIRT.has(p) ? _sk.clone() : _hm.clone()); } }
// the crowd: one instanced mesh per garment or part; each packs only the people wearing it into its first slots, so nothing unworn is drawn
class Crowd { constructor(n) { this.n = n; this.L = []; this.P = PARTS.map(p => { const im = new THREE.InstancedMesh(PGEO[p] || PG[p], PARTMAT[p] || personMat, n);
      im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color()); im.count = 0; scene.add(im); return { p, im, slot: new Int32Array(n).fill(-1), who: new Int32Array(n), count: 0 }; });
    this.ms = []; this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this.count = 0; this.on = new Uint8Array(n); }
  free(Q, i) { const s = Q.slot[i]; if (s < 0) return; const last = --Q.count, j = Q.who[last];
    if (s !== last) { Q.im.getMatrixAt(last, this._m); Q.im.setMatrixAt(s, this._m); Q.im.getColorAt(last, this._c); Q.im.setColorAt(s, this._c); Q.slot[j] = s; Q.who[s] = j; } Q.slot[i] = -1; Q.dirty = true; }
  look(i, L) { this.L[i] = L; for (const Q of this.P) if (Q.slot[i] >= 0) { if (shows(L, Q.p)) { Q.im.setColorAt(Q.slot[i], this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } else this.free(Q, i); } }
  set(i, x, y, z, h, kind, t, walkAmt = 1) { const L = this.L[i]; this.ms.length = 0; partMatrices(x, y, z, h, L, poseOf(kind, t, i * 1.7, walkAmt), this.ms); if (!this.on[i]) { this.on[i] = 1; this.count++; }
    this.P.forEach((Q, k) => { const m = this.ms[k]; if (m === ZEROM) { if (Q.slot[i] >= 0) this.free(Q, i); return; }
      if (Q.slot[i] < 0) { const s = Q.count++; Q.slot[i] = s; Q.who[s] = i; Q.im.setColorAt(s, this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } Q.im.setMatrixAt(Q.slot[i], m); }); }
  hide(i) { if (this.on[i]) { this.on[i] = 0; this.count--; } for (const Q of this.P) this.free(Q, i); }
  done() { for (const Q of this.P) { Q.im.count = Q.count; Q.im.instanceMatrix.needsUpdate = true; if (Q.dirty && Q.im.instanceColor) { Q.im.instanceColor.needsUpdate = true; Q.dirty = false; } } } }

const PARTMAT = { helmet: new THREE.MeshStandardMaterial({ color: 0xc8d4dc, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false }) };
const SK = [0xecc8ae, 0xc89870, 0x8a5a3a, 0x5a3a24, 0xe2b898, 0xb07850], HAIR = [0x1a120c, 0x3a2618, 0x5a3a20, 0x2a1c12, 0x8a6a42];
function crewLook(i, o) { return { s: 0.96 + hash(i, 5) * 0.08, skin: SK[i % SK.length], hair: HAIR[i % HAIR.length], suit: 0xe8e4dc, accent: 0xd86a28, inside: false, long: false, ...o }; }
function shows(L, p) { if (p === "helmet" || p === "pack" || p === "suitBody" || p === "collar") return !L.inside; if (p === "hairShort") return !L.long; if (p === "hairUp") return L.long; if (p === "badge") return L.inside; return true; }
function colorOf(L, p) { if (p === "head" || p.startsWith("hand") && L.inside) return L.skin; if (p.startsWith("hand")) return 0x5a5a5e; if (p === "eyes") return 0x2a1e16; if (p === "eyeW") return 0xe8e4dc; if (p === "brows" || p === "hairShort" || p === "hairUp") return L.hair;
  if (p.startsWith("shoe")) return L.inside ? 0x2a2a2e : 0x4a4a4e; if (p === "pack") return 0xd0ccc4; if (p === "collar") return L.accent; if (p === "badge") return L.accent; if (p === "helmet") return 0xffffff; return L.inside ? L.suit : (p.startsWith("leg") || p.startsWith("shin") ? 0xdcd8d0 : L.suit); }
const crowd = new Crowd(16), CREW = [];
function crew(L, name, role, info, o) { const p = { L, name, role, info, i: CREW.length, ...o }; crowd.look(p.i, L); CREW.push(p); return p; }
const modPos = (k, x, z) => { const a = MODS[k]; return [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)]; };
// outside, in suits: warm, bulky, a breathing set and a clear helmet; no pressure suit needed at 1.5 bar
{ let zs = S0.z; while (land(S0.x + 60, zs) > 0.6) zs -= 2; const RIG = { x: S0.x + 60, z: zs + 4 };
  crew(crewLook(1, { accent: 0xd86a28 }), "Dr. Amara Okafor", "planetary geologist", "Logging the core from the drill: layer by layer, the sediments of the shore, each a record of the sea's level and the rains. Titan's climate swings over tens of thousands of years as the seasons' strength shifts between the poles (an orbital cycle like the one that brought Earth's ice ages), moving the seas from one pole to the other; cores like this one would show it. She notes grain size, colour, the rounded ice pebbles washed down Vid Flumina, and seals each section in a cold canister: brought indoors warm, its methane would boil away.", { wx: RIG.x + 1.6, wz: RIG.z + 0.6, h: -1.2, kind: "kneel" });
  const ax = CANYON.x0 + CANYON.dx * 700, az = CANYON.z0 + CANYON.dz * 700; let bx = ax; while (land(bx, az) < 25) bx -= 3;
  crew(crewLook(2, { accent: 0x3a7ac8 }), "Kenji Watanabe", "field geologist (geomorphology)", "Sampling the canyon wall a kilometre east, up Vid Flumina. A canyon half a kilometre deep with its floor flooded to the sea's level means the land rose or the sea fell, faster than the river could keep up; the layers he chips out with his hammer (water ice, hard as granite at 94 K, interbedded with organic sediment) will tell which. Fieldwork is slow in the bulky suit, but in a seventh of Earth's gravity the climb is easy.", { wx: bx + 2.5, wz: az, h: -Math.PI / 2, kind: "hammer" });
  let zb = S0.z; while (land(S0.x - 40, zb) > 0.05) zb -= 1;
  crew(crewLook(3, { long: true, accent: 0x3ab87a }), "Sofia Lindqvist", "limnologist (the seas)", "At the water's edge with a sampling pole, drawing liquid from Ligeia Mare. Its make-up (mostly methane, with nitrogen and some ethane; how much of each sets its density and how cold it can get before freezing) changes with the seasons, the rain and the inflow from the rivers. She also tends the buoy's mooring, and watches for the 'magic islands' Cassini saw: perhaps bubbles of nitrogen fizzing out as the sea warms.", { wx: S0.x - 40, wz: zb + 1.2, h: 0, kind: "pole" });
  crew(crewLook(4, { accent: 0xc8b830 }), "Dr. Nadia El-Sayed", "geophysicist", "Checking the seismometer. Under the ice shell, 50 to 100 km down, lies an ocean of salty water bigger than all Earth's oceans; Saturn's tides squeeze Titan every 16 days, and the shell creaks. The seismometer, with Titan's own tides and its slight wobble, can measure how thick the shell is and how deep the ocean, the most likely place in the Saturn system for life.", { wx: at(190, 150).x + 1.0, wz: at(190, 150).z + 0.4, h: -2.0, kind: "kneel" });
  crew(crewLook(5, { accent: 0x8a8a8a }), "Rafael Mendes", "engineer (power and fuel)", "Walking the methane pipe from the fuel plant to the shore, checking the joints and the heaters that stop it clogging: at 94 K, impurities freeze out and ethane and other hydrocarbons can coat the pipe. He also looks after the reactor and the oxygen plant; on Titan, oxygen is the precious thing, and fuel lies all around.", { path: [[ISRU.x + 2, ISRU.z - 8], [ISRU.x + 2, BASE.userData.pipe.z1 + 6]], speed: 0.9, kind: "walk" }); }
// inside, in coveralls
crew(crewLook(6, { inside: true, long: true, suit: 0x2a5a7a, accent: 0xe8c040 }), "Dr. Priya Raman", "astrobiologist and organic chemist", "At the cryogenic glovebox, her hands in its gloves, working at 94 K under dry nitrogen on the organic sediment from the core. Titan's haze makes complex organic molecules (tholins) from sunlight, methane and nitrogen; where they meet liquid water (melted by an impact, or erupted from below) they can form amino acids and other building blocks of life. She is looking for them, and for any sign of chemistry that organises itself in liquid methane, life as we do not know it.", { local: [1, 5.6, 0.45], h: 0, kind: "knead" });
crew(crewLook(7, { inside: true, suit: 0x2a5a7a, accent: 0x6ab8e8 }), "Dr. Lukas Becker", "atmospheric scientist", "At the lab's screens with the weather mast's records and the drone's last flight: methane humidity, wind, the thin clouds. Titan has a full methane weather cycle (evaporation, clouds, rain, rivers, seas) but rain is rare and violent, and he wants to catch a storm. Its haze, too: the same chemistry that may have hazed the young Earth.", { local: [1, 9.8, -0.75], h: Math.PI, kind: "talk" });
crew(crewLook(8, { inside: true, long: true, suit: 0x6a3a3a, accent: 0xe8e4dc }), "Dr. Hana Kowalczyk", "physician and commander", "At the galley table with the day's plan and the medical checks: low gravity weakens bones and muscles, so everyone exercises daily on the bike; she also watches the crew's radiation dose (Titan's thick air shields the surface well, far better than Mars) and their spirits, nine light-minutes... no, more than an hour's signal from home.", { local: [0, 10.7, -0.05], h: 0, kind: "sit" });
crew(crewLook(9, { inside: true, suit: 0x5a5a5e, accent: 0xd86a28 }), "Tomas Reyes", "engineer (life support and suits)", "Repairing a suit glove at the workbench. The cold is the hardest thing on equipment here: seals stiffen, batteries fade, joints wear; at 94 K plastics shatter like glass. He also keeps the habitat's air (oxygen from the plant, carbon dioxide scrubbed) and heat (from the reactor) running.", { local: [2, 6.8, 0.75], h: 0, kind: "hammer" });
CREW.find(p => p.name === "Dr. Hana Kowalczyk").info = CREW.find(p => p.name === "Dr. Hana Kowalczyk").info.replace("nine light-minutes... no, more than an hour's signal from home", "more than an hour's signal from home");
function crewPos(p, t) { if (p.local) { const [k, x, z] = p.local, [lx, lz] = k === null ? [x, z] : modPos(k, x, z), v = HAB.localToWorld(V3(lx, FL, lz)); return [v.x, v.y, v.z, HAB_RY + MODS[k] + p.h + (p.kind === "sit" ? 0 : 0)]; }
  if (p.path) { const [[x0, z0], [x1, z1]] = p.path, L = Math.hypot(x1 - x0, z1 - z0), s = (t * p.speed) % (2 * L), f = s < L ? s / L : 2 - s / L, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f; return [x - ME.x0, land(x, z), z - ME.z0, s < L ? Math.atan2(x1 - x0, z1 - z0) : Math.atan2(x0 - x1, z0 - z1)]; }
  return [p.wx - ME.x0, land(p.wx, p.wz), p.wz - ME.z0, p.h]; }
// their tools: a rock hammer, a sampling pole, a core tray
const PROPS = new THREE.Group(); scene.add(PROPS); const corePart = (geo, mat) => { const m = new THREE.Mesh(geo, mat); PROPS.add(m); return m; };
const coreTray = corePart(new THREE.BoxGeometry(1.4, 0.12, 0.35), M_DARK), coreRod = corePart(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 10).rotateZ(Math.PI / 2), BM(0x5a3a22)), poleM = corePart(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6), M_METAL);

// ---------- the rover: get in (E beside its door) and drive ----------
// A pressurised cabin on six soft wheels for loose organic sand; electric drive from methane-oxygen fuel cells. Top speed about 15 km/h:
// with a seventh of Earth's gravity the wheels grip weakly, so it cannot brake or corner hard.
const RV = { x: at(85, 150).x, z: at(85, 150).z, head: 1.1, v: 0, steer: 0, y: null, pitch: 0, roll: 0, in: false };
const rover = new THREE.Group(); scene.add(rover); rover.traverse(o => o.layers.enable(1));
{ const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => part(geo, mat, x, y, z, rx, ry, rz, rover), GL = new THREE.MeshStandardMaterial({ color: 0x9ab0b8, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), IN = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.8, side: THREE.DoubleSide });
  add(new THREE.BoxGeometry(3, 0.9, 4.3), M_QUILT, 0, 2.15, -1.1); add(new THREE.BoxGeometry(3, 1.4, 4.3), M_QUILT, 0, 3.3, -1.1); add(new THREE.BoxGeometry(3, 0.9, 0.1), M_QUILT, 0, 2.15, 3.2); for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.1, 0.9, 2.2), M_QUILT, sx * 1.47, 2.15, 2.15); add(new THREE.BoxGeometry(3, 0.12, 2.2), M_QUILT, 0, 1.66, 2.15); add(new THREE.BoxGeometry(3, 0.1, 2.25), M_QUILT, 0, 4.0, 2.15);
  add(new THREE.PlaneGeometry(2.9, 1.42), GL, 0, 3.28, 3.12, -0.25); for (const sx of [-1, 1]) { add(new THREE.PlaneGeometry(2.1, 1.35), GL, sx * 1.49, 3.3, 2.15, 0, Math.PI / 2, 0); add(new THREE.BoxGeometry(0.1, 1.4, 0.1), M_QUILT, sx * 1.45, 3.3, 3.2); }
  add(new THREE.PlaneGeometry(2.9, 2.2), IN, 0, 3.93, 2.15, Math.PI / 2); add(new THREE.PlaneGeometry(2.9, 1.35), IN, 0, 3.3, 1.08); add(new THREE.BoxGeometry(0.9, 1.25, 0.04), M_ORANGE, 0, 3.0, 1.1);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(2.2, 0.85), IN, sx * 1.42, 2.18, 2.15, 0, Math.PI / 2, 0); add(new THREE.BoxGeometry(2.8, 0.05, 2.2), M_FLOOR, 0, 1.73, 2.15);
  for (const sx of [-0.65, 0.65]) { add(new THREE.BoxGeometry(0.6, 0.45, 0.6), M_BLUE, sx, 1.98, 1.75); add(new THREE.BoxGeometry(0.6, 0.85, 0.12), M_BLUE, sx, 2.45, 1.45); } add(new THREE.BoxGeometry(2.6, 0.5, 0.55), M_DARK, 0, 2.35, 2.85); add(new THREE.BoxGeometry(0.9, 0.3, 0.02), M_SCREEN, -0.5, 2.68, 2.6, -0.6); add(new THREE.BoxGeometry(0.6, 0.3, 0.02), M_SCREEN, 0.6, 2.68, 2.6, -0.6);
  add(new THREE.TorusGeometry(0.17, 0.025, 6, 18), M_DARK, -0.65, 2.75, 2.45, -0.9); add(new THREE.BoxGeometry(1.0, 1.8, 0.08), M_ORANGE, 1.52, 2.5, -1.4, 0, Math.PI / 2, 0);
  for (const sx of [-1, 1]) add(new THREE.CircleGeometry(0.3, 14), new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xfff0d0, emissiveIntensity: 2 }), sx * 1.0, 2.3, 3.26);
  const RL = new THREE.PointLight(0xffe8c8, 4, 5, 1.6); RL.position.set(0, 3.7, 2.0); rover.add(RL);
  RV.wheels = []; for (const z of [-2.3, 0, 2.3]) for (const sx of [-1, 1]) { const w = add(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 20).rotateZ(Math.PI / 2), M_DARK, sx * 1.75, 0.85, z); RV.wheels.push(w); } }
rover.traverse(o => o.layers.enable(1));
const rvBld = BLD.find(g => Math.abs(g.userData.w.x - RV.x) < 0.1 && Math.abs(g.userData.w.z - RV.z) < 0.1); if (rvBld) { rvBld.visible = false; }
for (let i = SOLID.length - 1; i >= 0; i--) if (Math.abs(SOLID[i].x - RV.x) < 0.1 && Math.abs(SOLID[i].z - RV.z) < 0.1 || Math.abs(SOLID[i].x - SITE.x) < 0.1 && Math.abs(SOLID[i].z - SITE.z) < 0.1) SOLID.splice(i, 1);
for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].title === "The pressurised rover") ITEMS.splice(i, 1);
function updateRover(dt, mx, my) { const c = Math.cos(RV.head), s = Math.sin(RV.head);
  if (RV.in) { const thr = -my; RV.steer += clampN(-mx - RV.steer, -1.2 * dt, 1.2 * dt); RV.v = clampN(RV.v + thr * 0.7 * dt - RV.v * (thr ? 0 : 0.25) * dt, -1.5, 4.2); RV.head += RV.steer * 0.32 * Math.min(1, Math.abs(RV.v) / 2 + 0.15) * dt * Math.sign(RV.v || 1); }
  else RV.v *= Math.max(0, 1 - dt * 2);
  let nx = RV.x + Math.sin(RV.head) * RV.v * dt, nz = RV.z + Math.cos(RV.head) * RV.v * dt; let hit = false; for (const S of SOLID) if (Math.hypot(nx - S.x, nz - S.z) < S.r + 3.2) hit = true; { const [lx, lz] = habLocal(nx, nz); if (inHab(lx, lz) || onStairs(lx, lz)) hit = true; } if (land(nx, nz) < -1.4) hit = true;
  if (hit) { if (Math.abs(RV.v) > 0.4 && RV.in) say("The rover stops: something is in the way."); RV.v = 0; } else { RV.x = nx; RV.z = nz; }
  const wh = (f, sd) => land(RV.x + Math.sin(RV.head) * f + Math.cos(RV.head) * sd, RV.z + Math.cos(RV.head) * f - Math.sin(RV.head) * sd), w = []; for (const f of [2.3, 0, -2.3]) for (const sd of [-1.75, 1.75]) w.push(wh(f, sd));
  const yT = w.reduce((a, b) => a + b) / 6, pT = Math.atan2((w[0] + w[1]) - (w[4] + w[5]), 2 * 4.6), rT = Math.atan2((w[0] + w[2] + w[4]) - (w[1] + w[3] + w[5]), 3 * 3.5), k = 1 - Math.exp(-dt / 0.5);
  if (RV.y === null) { RV.y = yT; RV.pitch = pT; RV.roll = rT; } else { RV.y += (yT - RV.y) * k; RV.pitch += (pT - RV.pitch) * k; RV.roll += (rT - RV.roll) * k; }
  rover.position.set(RV.x - ME.x0, RV.y, RV.z - ME.z0); rover.rotation.set(-RV.pitch, RV.head, -RV.roll, "YXZ"); for (const wl of RV.wheels) wl.rotation.x -= RV.v * dt / 0.85; }


// ---------- wind and waves ----------
// Cassini found Ligeia Mare flat to a few millimetres: the winds have been very light. But waves rise easily here: in low gravity and dense air
// a wind of well under 1 m/s raises them, and they are slow: a wave of a given length travels 2.7 times slower than on Earth. For a sea
// fully worked up by a steady wind U, the waves' height is about 0.21 U^2/g and the peak wavelength about 6 U^2 metres (the Pierson-Moskowitz
// spectrum, with Titan's gravity). In the shallows they steepen and break when they reach about 0.8 of the depth; whether methane surf foams
// (nitrogen bubbling out?) is not known.
const WINDS = [["calm, as Cassini saw it", 0], ["a light breeze, 0.8 m/s", 0.8], ["a fresh wind, 1.5 m/s", 1.5], ["a storm wind, 2.5 m/s", 2.5]]; let windI = 0;
function setWind(i) { windI = (i + WINDS.length) % WINDS.length; const U = WINDS[windI][1], Hs = 0.21 * U * U / G_T, L = 6.04 * U * U, T = Math.sqrt(2 * Math.PI * Math.max(L, 0.1) / G_T);
  seaU.wA.value = Hs / 2; seaU.wL.value = Math.max(L, 1); say(windI ? `<b>Wind: ${WINDS[windI][0]}.</b> Waves about ${Hs < 1 ? Math.round(Hs * 100) + " cm" : Hs.toFixed(1) + " m"} high, ${Math.round(L)} m apart, one every ${T.toFixed(0)} seconds: slow, in Titan's low gravity. They steepen and break on the shore. (G or Y to change.)` : "<b>Calm</b>: the sea flat as glass, as Cassini found it (G or Y for wind).", 14); }
FACTS.push("<b>Surf?</b> Usually not: Cassini found the seas flat to millimetres. But a wind of under 1 m/s would raise waves here, and a storm a swell a metre high and nearly 40 m long, rolling in every 13 seconds and breaking in slow motion. Press G (Y in VR) to change the wind.");

// ---------- labels: names over the things and people around you; look at one and press E (A) for its info box ----------
const TAGS = []; let tagsOn = true;
function tagTex(title, sub) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(20,12,4,0.72)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.strokeStyle = "rgba(255,200,120,0.6)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#ffe0b0"; g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillText(title, 22, 54, 470); g.fillStyle = "#e8d8c0"; g.font = "28px -apple-system, Helvetica, sans-serif"; g.fillText(sub, 22, 100, 470); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tag(get, title, sub, info, maxD = 3000) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, sub), depthTest: true, depthWrite: false, transparent: true, toneMapped: false, fog: false })); sp.center.set(0.5, 0); sp.renderOrder = 30; scene.add(sp);
  const T = { sp, get, title, sub, info, maxD, last: "" }; TAGS.push(T); return T; }
const HT = { "The habitat": 10, "The crew lander": 12.5, "The reactor": 6, "The fuel plant": 7, "The weather mast": 11, "The seismometer": 1.6, "The drill rig": 5.5, "The drone": 2.6, "The antenna": 4.6, "The sea buoy": 3.2 };
for (const I of ITEMS) tag(() => V3(I.x - ME.x0, (I.title === "The sea buoy" ? 0 : land(I.x, I.z)) + (HT[I.title] || 4), I.z - ME.z0), I.title.replace(/^The /, "").replace(/^./, c => c.toUpperCase()), "", `<b>${I.title}</b><br>${I.text}`);
for (const p of CREW) { const T = tag(() => p.at ? V3(p.at[0], p.at[1] + 2.15, p.at[2]) : V3(0, -1e4, 0), p.name, p.role, `<b>${p.name}</b>, ${p.role}<br>${p.info}`, 1500); T.indoor = !!p.local; }
tag(() => V3(RV.x - ME.x0, (RV.y ?? land(RV.x, RV.z)) + 4.8, RV.z - ME.z0), "Pressurised rover", "", "<b>The pressurised rover</b><br>For trips up the canyon and along the coast: a heated cabin on six fat, soft wheels for the loose organic sand, running on methane and oxygen from the plant. Get in at its orange door: E, or A or the trigger in VR. Top speed about 15 km/h: in a seventh of Earth's gravity the wheels grip weakly.");
{ const lm = { x: S0.x, z: S0.z - 2600 }; tag(() => V3(lm.x - ME.x0, 25, lm.z - ME.z0), "Ligeia Mare", "a sea of liquid methane, 420 by 350 km", FACTS[0], 60000); }
{ const cx = CANYON.x0 + CANYON.dx * 1800, cz = CANYON.z0 + CANYON.dz * 1800; tag(() => V3(cx - ME.x0, land(cx, cz) + 60, cz - ME.z0), "Vid Flumina", "a river 400 km long, in a canyon 1 km wide", FACTS[1], 60000); }
const _cd = V3(0, 0, 0), _cp = V3(0, 0, 0);
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const p = T.get(), d = p.distanceTo(_cp); T.sp.visible = tagsOn && d < T.maxD && d > (T.indoor ? 0.5 : 1.2) && (T.indoor === undefined || T.indoor === insideHab()); if (!T.sp.visible) continue; T.sp.position.copy(p); const w = clampN(d * 0.12, 0.7, 900); T.sp.scale.set(w, w / 4, 1);
    const ds = d < 1000 ? Math.round(d / (d < 100 ? 1 : 10)) * (d < 100 ? 1 : 10) + " m" : (d / 1000).toFixed(1) + " km", sub = (T.sub ? T.sub + " · " : "") + ds; if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.07; for (const T of TAGS) { if (!T.sp.visible) continue; const v = T.sp.position.clone().sub(_cp), d = v.length(), a = v.normalize().angleTo(_cd); if (a < ba + 0.5 / d) { ba = a; best = T; } } return best; }

// sitting or standing (M, or click the left stick in VR): if you play seated, your eyes are lower, so the world is raised to meet them, to
// standing height outside and to the windscreen in the rover's cab
function toggleSeated() { seated = !seated; say(seated ? "<b>Sitting mode</b>: your view is raised about 45 cm, to standing height outside and to the windscreen in the rover. (M, or click the left stick, for standing.)" : "<b>Standing mode</b>: your own height. (M, or click the left stick, for sitting.)", 8); }

// ---------- your desk: you are the base's software engineer ----------
// A real crew this small would have someone who writes and keeps the software: every system here runs on it, and Earth is more than an hour
// away by signal, too far to help when something breaks. Most of the work would be in C, C++ and Rust (memory-safe, now used in spacecraft),
// on radiation-tolerant computers, inside a flight-software framework like NASA's F Prime; Python for the science data; a little hardware
// description for the instruments' FPGAs; assembly almost never. The code assistant would be a model running on the base's own computers:
// no cloud an hour and a half away.
const deskTex = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d"); g.fillStyle = "#0e1418"; g.fillRect(0, 0, 1024, 512); g.font = "18px monospace";
  const L = [["#7a8a9a", "// rover/traction.rs  -  tuned for 0.14 g, organic sand at 94 K"], ["#c8a0e8", "pub fn wheel_torque(&mut self, slip: f32, load_n: f32) -> f32 {"], ["#e8e4dc", "    let mu = self.surface.friction(); // ~0.35 on damp tholin sand"],
    ["#e8e4dc", "    let max = mu * load_n;            // 110 kg x 1.352 m/s2 / 6 wheels"], ["#e8e4dc", "    self.pid.update(slip - TARGET_SLIP).clamp(-max, max)"], ["#c8a0e8", "}"], ["#7a8a9a", ""],
    ["#7a8a9a", "// seismo/filter.rs  -  tidal flexing every 15.95 days, notch it out"], ["#c8a0e8", "const TIDE_PERIOD_S: f64 = 15.945 * 86_400.0;"], ["#7a8a9a", ""],
    ["#9ae8a0", "$ cargo test --release --target rad750-titan"], ["#9ae8a0", "running 214 tests ... ok. 0 failed"], ["#ffd070", "uplink queue: 3 bundles, next window 14:20  (light time 79 min)"]];
  L.forEach(([c2, t], i) => { g.fillStyle = c2; g.fillText(t, 20, 34 + i * 34); });
  g.fillStyle = "#1a2a3a"; g.fillRect(700, 300, 310, 200); g.fillStyle = "#9ad0ff"; g.font = "15px sans-serif"; ["assistant (local model, offline)", "Suggest: clamp the slip target lower", "below 2 km/h; the sand shears at", "low load. Want a test for it?"].forEach((t, i) => g.fillText(t, 712, 326 + i * 26));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{ const m = new THREE.Group(); m.rotation.y = MODS[2]; HAB.add(m); const B = (x, y, z, sx, sy, sz, mat) => part(new THREE.BoxGeometry(sx, sy, sz), mat, x, FL + y, z, 0, 0, 0, m);
  B(8.6, 0.74, -1.25, 1.5, 0.05, 0.7, M_BENCH); B(8.6, 0.37, -1.25, 0.06, 0.72, 0.06, M_METAL); part(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: deskTex, toneMapped: false }), 8.6, FL + 1.25, -1.5, 0, 0, 0, m);
  B(8.6, 0.78, -1.15, 0.5, 0.02, 0.18, M_DARK); B(8.6, 0.25, -0.65, 0.5, 0.5, 0.5, M_BLUE); B(8.05, 1.25, -1.48, 0.12, 0.12, 0.01, BM(0xf0e070)); }
{ const [plx, plz] = modPos(2, 8.6, -0.6), c = Math.cos(HAB_RY), sn = Math.sin(HAB_RY), dw = { x: SITE.x + plx * c + plz * sn, z: SITE.z - plx * sn + plz * c }; ITEMS.push({ x: dw.x, z: dw.z, r: 2.5, title: "Your desk", text: "You are the base's software engineer. Every system here runs on code you look after: the life support, the reactor's controls, the airlock's purge interlocks, the rover's traction control (rewritten for a seventh of Earth's gravity), the drone's autonomy (it flies itself: Earth is 70-90 minutes away by signal), and the pipelines that turn the instruments' data into science. Most of it is C, C++ and Rust, built in a flight-software framework like NASA's F Prime and run on radiation-tolerant computers; Python for the science; hardware description for the instruments' FPGAs; assembly almost never. Your code assistant is a model running on the base's own computers, with no cloud to call. Nothing ships without tests: a bug in the airlock could kill." }); } { const I = ITEMS[ITEMS.length - 1], T = tag(() => V3(I.x - ME.x0, HAB.userData.y + FL + 1.65, I.z - ME.z0), "Your desk", "software engineering", `<b>${I.title}</b><br>${I.text}`, 40); T.indoor = true; }
FACTS.push("<b>Who would be here?</b> A first base would hold few people, each with two jobs. Most would be scientists: geologists above all (Titan is a world of geology), a limnologist for the seas, a geophysicist for the deep ocean, an astrobiologist and organic chemist, an atmospheric scientist. Then the people who keep them alive: engineers for power, fuel, life support and suits, a physician, someone who can fly the lander, and a software engineer: you. Walk up to anyone and press E (A).");
FACTS.push("<b>Titan's geology</b>: the bedrock is water ice, frozen as hard as granite. On it lie organic sediments that settle out of the haze and wash down rivers: sand, mud, the rounded ice cobbles at your feet. There are river valleys and canyons like Vid Flumina; seas and lakes, some in steep-sided pits that may have formed like limestone sinkholes, dissolved out of the ground; bright evaporite rings where lakes dried up; dunes of organic sand girdling the equator; mountains pushed up by the crust; few impact craters (they are buried or eroded fast); and perhaps ice volcanoes, like Sotra Patera. Few worlds have so many Earth-like landforms made of such unearthly stuff.");
FACTS.push("<b>Saturn</b>, 20 times the Moon's width, would never be seen from here, and not only because of the haze: Titan always keeps the same face to Saturn, and Ligeia Mare lies on its far side. Saturn sits for ever about 6 degrees below the horizon to the west-northwest. From Titan's Saturn-facing side it would hang motionless in the sky, if the haze ever cleared (it never does, in visible light).");

const groundAt = (x, z, yRef) => { const hf = habFloor(x, z, yRef); return hf === null ? land(x, z) : Math.max(land(x, z), hf); };
function act() { const door = V3(1.6, 0, -1.4).applyAxisAngle(V3(0, 1, 0), RV.head); if (!RV.in && airlockAct()) return;
  if (RV.in) { if (Math.abs(RV.v) > 0.3) { say("Stop the rover first (S to brake)."); return; } RV.in = false; const o = door.clone().multiplyScalar(1.9); ME.x = RV.x + o.x; ME.z = RV.z + o.z; ME.y = land(ME.x, ME.z); ME.vx = ME.vz = ME.vy = 0; yaw = RV.head + Math.PI / 2; say("Out of the rover. E beside its orange door to get back in."); return; }
  if (!insideHab() && Math.hypot(ME.x - (RV.x + door.x), ME.z - (RV.z + door.z)) < 3.5) { RV.in = true; yaw = Math.PI; pitch = -0.08; say("In the rover's cab. <b>W</b>/<b>S</b> drive and brake, <b>A</b>/<b>D</b> steer (left stick in VR); top speed about 15 km/h: in a seventh of Earth's gravity the wheels grip weakly. <b>E</b> to get out."); return; }
  if (tagsOn) { const T = lookedAt(); if (T) { say(T.info, 50); return; } }
  let bp = null, bd = 3.2; for (const p of CREW) { if (!p.at) continue; const d = Math.hypot(p.at[0] + ME.x0 - ME.x, p.at[2] + ME.z0 - ME.z) + Math.abs(p.at[1] - ME.y) * 0.5; if (d < bd) { bd = d; bp = p; } }
  if (bp) { say(`<b>${bp.name}</b>, ${bp.role}<br>${bp.info}`, 50); return; } nextFact(); }
// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0, underFog = false;
updateGround(true); fillCobbles(); fillSea(); placeBase(); BASE.traverse(o => o.layers.enable(1));
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; T += dt; frameN++;
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) { tagsOn = !tagsOn; } prevB.x = bX; const bS = gp.buttons[3]?.pressed; if (bS && !prevB.st) toggleSeated(); prevB.st = bS; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setWind(windI + 1); prevB.y = bY; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; const tr = gp.buttons[0]?.pressed; if (tr && !prevB.tr) act(); prevB.tr = tr; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  // physics: on the ground you push off and steer; in the air only gravity and drag act; in the liquid, buoyancy and heavy drag
  if (RV.in) { updateRover(dt, mx, my); ME.x = RV.x; ME.z = RV.z; ME.y = RV.y; ME.vx = ME.vz = ME.vy = 0; } else { updateRover(dt, 0, 0);
  const gY = groundAt(ME.x, ME.z, ME.y), sub = clampN((0 - ME.y) / 1.7, 0, 1), onGround = ME.y <= gY + 0.03, inH = insideHab();
  if (started && (mx || my) && (onGround || sub > 0.3)) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = inH ? (run ? 2.2 : 1.4) : sub > 0.5 ? 0.7 : run ? 5.5 : 2.5;
    const tx = (f.x * -my + sd.x * mx) * sp, tz = (f.z * -my + sd.z * mx) * sp, k = 1 - Math.exp(-dt * (sub > 0.5 ? 1.5 : 6)); ME.vx += (tx - ME.vx) * k; ME.vz += (tz - ME.vz) * k; }
  else if (onGround) { const k = 1 - Math.exp(-dt * (sub > 0.5 ? 2 : 5)); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; }
  if (jump && onGround && started) ME.vy = inH ? 1.0 : sub > 0.6 ? 0.8 : 2.6;
  const v = Math.hypot(ME.vx, ME.vy, ME.vz), rho = lerpN(RHO_AIR, RHO_LIQ, sub), dragK = 0.5 * rho * CDA * v / MASS, gEff = G_T * (1 - rho / 1000 * (sub > 0 ? 1 : 0.0055));
  ME.vy -= gEff * dt; ME.vx -= ME.vx * dragK * dt; ME.vy -= ME.vy * Math.min(1, dragK * dt); ME.vz -= ME.vz * dragK * dt;
  const ox = ME.x, oz = ME.z, [l0x, l0z] = habLocal(ox, oz), wasIn = inHab(l0x, l0z) && ME.y > HAB.userData.y + 2.6 || onStairs(l0x, l0z) && ME.y > land(ox, oz) + 0.3;
  ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; walked += Math.hypot(ME.x - ox, ME.z - oz);
  { const [lx, lz] = habLocal(ME.x, ME.z); if (wasIn && !inHab(lx, lz) && !onStairs(lx, lz)) { ME.x = ox; ME.z = oz; ME.vx = ME.vz = 0; }
    if (wasIn || ME.y > HAB.userData.y + 2.6) { const z0 = zoneOf(l0x, l0z), z1 = zoneOf(lx, lz); if (z0 !== z1 && ((z0 === "lock" || z1 === "lock") && (z0 === "out" || z1 === "out") ? AL.outer < 0.9 : AL.inner < 0.9)) { ME.x = ox; ME.z = oz; ME.vx = ME.vz = 0; } } if (inH && ME.y > HAB.userData.y + FL + 0.9) { ME.y = HAB.userData.y + FL + 0.9; ME.vy = Math.min(ME.vy, 0); } }
  for (const c of SOLID) { const dx = ME.x - c.x, dz = ME.z - c.z, d = Math.hypot(dx, dz); if (d < c.r && d > 0.01 && ME.y < land(c.x, c.z) + 12) { ME.x = c.x + dx / d * c.r; ME.z = c.z + dz / d * c.r; } }
  const gN = groundAt(ME.x, ME.z, ME.y - ME.vy * dt); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.vx *= -0.2; ME.vz *= -0.2; ME.y = groundAt(ox, oz, ME.y + 0.5); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } } }
  // the world is kept near the origin; far moves shift the origin and rebuild the ground
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillCobbles(); fillSea(); placeBase(); BASE.traverse(o => o.layers.enable(1)); }
  else { updateGround(); if (Math.hypot(ME.x - cobC[0], ME.z - cobC[1]) > 6) fillCobbles(); if (Math.hypot(ME.x - seaC[0], ME.z - seaC[1]) > 40) fillSea(); }
  const lift = vr && seated ? 0.45 : 0;
  if (RV.in) { rover.updateMatrixWorld(); rig.position.copy(rover.localToWorld(V3(-0.65, 1.35 + lift, 1.45))); rig.rotation.set(0, RV.head + (vr ? vrYaw : 0), 0); } else { rig.position.set(ME.x - ME.x0, ME.y + lift, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); } if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  sky.position.copy(rig.position);
  // under the surface: a dim brown murk
  const eyeY = ME.y + 1.6, under = eyeY < 0; if (under !== underFog) { underFog = under; scene.fog.density = under ? 0.12 : 1 / 26000; scene.fog.color.copy(under ? new THREE.Color(0.16, 0.1, 0.05) : FOGC); seaU.under.value = under ? 1 : 0; }
  BASE.traverse(o => { if (o.userData.blink) o.material.emissiveIntensity = (T % 2) < 0.15 ? 3 : 0.2; if (o.userData.spin) o.rotation.y += dt * 2.5; });
  if (DOOR) DOOR.position.x += (DOOR.userData.x0 + 1.3 * AL.outer - DOOR.position.x) * Math.min(1, dt * 2); IDOOR.position.x += (1.3 * AL.inner - IDOOR.position.x) * Math.min(1, dt * 2);
  for (const p of CREW) { const [x, y, z, h] = crewPos(p, T); p.at = [x, y, z]; crowd.set(p.i, x, y, z, h, p.kind, T + p.i, p.kind === "walk" ? 1 : 0);
    if (p.name === "Dr. Amara Okafor") { coreTray.position.set(x + Math.sin(h) * 0.7, y + 0.06, z + Math.cos(h) * 0.7); coreTray.rotation.y = h + Math.PI / 2; coreRod.position.copy(coreTray.position).y += 0.1; coreRod.rotation.y = h + Math.PI / 2; }
    if (p.name === "Sofia Lindqvist") { poleM.position.set(x + Math.sin(h) * 1.3, y + 0.9, z + Math.cos(h) * 1.3); poleM.rotation.set(0, h, 0); poleM.rotateX(1.05); } }
  crowd.done();
  updateTags();
  { const door = V3(1.6, 0, -1.4).applyAxisAngle(V3(0, 1, 0), RV.head), nearDoor = !RV.in && !insideHab() && Math.hypot(ME.x - (RV.x + door.x), ME.z - (RV.z + door.z)) < 3.5; if (nearDoor && !prevB.door) say(vr ? "<b>A</b> (or the right trigger): get into the rover." : "<b>E</b>: get into the rover.", 6); prevB.door = nearDoor; }
  seaU.t.value = T; if (!under && (!IS_HEADSET || frameN % 2 === 0)) { sea.visible = false; COB.visible = false; updateReflection(); sea.visible = true; COB.visible = true; }
  if (hud && frameN % 10 === 0) HUD.innerHTML = RV.in ? `In the rover · ${(Math.abs(RV.v) * 3.6).toFixed(1)} km/h<br>W/S drive, A/D steer, E to get out` : insideHab() ? `Inside the habitat · 21 °C, 1.47 bar (matched to outside), 21 kPa of oxygen<br>outside: 94 K (−179 °C), 1.47 bar of nitrogen and methane` : `Ligeia Mare, Titan · 73° N<br>${ME.y >= 0 ? (ME.y < 1000 ? ME.y.toFixed(1) + " m" : (ME.y / 1000).toFixed(2) + " km") + " above the sea" : (-ME.y).toFixed(1) + " m under the surface"} · walked ${walked < 1000 ? Math.round(walked) + " m" : (walked / 1000).toFixed(2) + " km"}<br>gravity 0.14 g · 94 K (−179 °C) · 1.47 bar${ME.y - groundAt(ME.x, ME.z, ME.y) < 0.05 ? "" : " · in the air " + (ME.y - groundAt(ME.x, ME.z, ME.y)).toFixed(1) + " m"}`;
  HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

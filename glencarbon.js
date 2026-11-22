// glencarbon.js -- Route 157 in Glen Carbon, Illinois, in the summer of 3026: one best guess at what a thousand years of today's trends would make of it. Built into
// glencarbon.html by build.py.
//
// What is real. The ground: USGS elevations (3DEP, through the AWS Terrain Tiles), about 10 m between points for 17 km round the start, 300 m beyond: the flat
// American Bottom of the Mississippi to the west, the bluff, and the uplands cut by branching ravines. Today's map: OpenStreetMap (roads, buildings, railways, streams,
// land use), used to decide what of today is still here and drawn as faint lines where today's roads used to run. The start: Route 157 at Chain of Rocks Road.
// What is a guess, and why (each has a sign where you can see it, with its reasons and how unsure it is):
//  - People: the world's population peaks in the 2080s (UN World Population Prospects 2024) and then falls; birth rates as low as today's could not last a thousand
//    years (there would be almost no one left), so they are assumed to settle near replacement: some 3 to 6 billion people. Round here, about half today's number,
//    living closer together.
//  - Where they live: today's sprawl grew from cheap cars, cheap land and a growing population. With fewer people, and every kilometre of road and pipe costing upkeep,
//    towns shrink back to places with lasting reasons to be: the university (SIUE; universities are among the longest-lived institutions there are), the old county
//    seat (Edwardsville, 1812), and a station on the railway up Judy's Branch (Glen Carbon's old coal-mining village). The subdivisions go back to forest: a wood-frame
//    house left empty falls in within decades.
//  - Roads: most streets vanish under the trees. Routes with a reason to exist outlast everything built on them (Roman roads, London's medieval streets): Route 157 runs
//    along the foot of the bluff, a natural line, and is still a road, narrow and shaded, for small automated electric vehicles, bikes and walkers. The interstate's
//    embankment is an electric railway. The one-mile federal survey grid of the early 1800s still shapes the fields, because property lines last for centuries.
//  - Climate: about 3 degrees C warmer worldwide than before industry (where today's policies lead by 2100; carbon dioxide lingers for centuries), more on land: summers
//    here like Dallas's today, heavier rain, bigger floods. Much of the American Bottom has gone back to wetland and bottomland forest.
//  - Buildings: built to last and to stay cool: thick walls of stone, rammed earth and long-lived concrete, courtyards and shade, green and solar roofs, three to six floors.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
// haze: light from a distance d reaches you dimmed by exp(-d / L) (three's FogExp2 uses exp(-(d/L)^2))
THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace("float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );", "float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );");
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0c10);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, sstep = (x, a, b) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }, lerpN = THREE.MathUtils.lerp, DEG = Math.PI / 180;
const R_E = 6371000, G_E = 9.81, LAT0 = 38.7618, LON0 = -90.0093, KX = Math.cos(LAT0 * DEG) * 111320, KZ = 110574;
const toLL = (x, z) => [LAT0 - z / KZ, LON0 + x / KX], toXZ = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 5) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * vn(x, z); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }

// ---------- the ground: USGS elevations, in metres, x east and z south of the start ----------
function loadDem(D) { return new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = D.w; c.height = D.h; const g = c.getContext("2d"); g.drawImage(im, 0, 0); const px = g.getImageData(0, 0, D.w, D.h).data, H = new Float32Array(D.w * D.h);
  for (let i = 0; i < H.length; i++) H[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / D.sc; res({ ...D, H }); }; im.src = D.png; }); }
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
function demPx(D, lat, lon) { const n = 2 ** D.z, tx = (lon + 180) / 360 * n, lr = lat * DEG, ty = (1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n, f = D.f || 1; return [(tx - D.x0) * 256 / f - 0.5, (ty - D.y0) * 256 / f - 0.5]; }
function demAt(D, fx, fy) { const i = Math.floor(fy), j = Math.floor(fx), ti = fy - i, tj = fx - j, row = k => { const r = clampN(i + k, 0, D.h - 1) * D.w; return cr(D.H[r + clampN(j - 1, 0, D.w - 1)], D.H[r + clampN(j, 0, D.w - 1)], D.H[r + clampN(j + 1, 0, D.w - 1)], D.H[r + clampN(j + 2, 0, D.w - 1)], tj); }; return cr(row(-1), row(0), row(1), row(2), ti); }
const DEM = { d14: null, d11: null };
function demH(x, z) { const [lat, lon] = toLL(x, z), D = DEM.d14, [fx, fy] = demPx(D, lat, lon), m = Math.min(fx, fy, D.w - 1 - fx, D.h - 1 - fy); let h = 0;
  if (m < 24) { const [gx, gy] = demPx(DEM.d11, lat, lon); h = demAt(DEM.d11, gx, gy); } if (m > 2) h = lerpN(h, demAt(D, fx, fy), sstep(m, 2, 24)); return h; }
const PADS = [];
function land(x, z) { let h = demH(x, z) + 0.6 * (fbm(x / 35, z / 35, 3) - 0.5) + 0.12 * (fbm(x / 4, z / 4, 2) - 0.5);
  for (const P of PADS) { const d = Math.max(Math.abs(x - P.x) - P.hw, Math.abs(z - P.z) - P.hd, 0); if (d < P.s) h = lerpN(h, P.h, sstep(d, P.s, 0)); } return h; }

// ---------- the land in 3026: town, village, fields, forest, wetland ----------
// A raster of 25 m cells over 14 km round the start, worked out once. The rules are written out on the signs.
const CELL = 25, CR = 7000, CN = Math.round(2 * CR / CELL), COVER = new Uint8Array(CN * CN), CROP = new Uint8Array(CN * CN);
const C = { FOREST: 0, FIELD: 1, MEADOW: 2, WET: 3, WATER: 4, TOWN: 5, VILLAGE: 6, HAMLET: 7, GROVE: 8 };
// the places with lasting reasons to exist: the university, the old county seat, the station village on the railway, and a crossroads stop where you start
const PLACES = (() => { const p = (name, lat, lon, r, kind) => { const [x, z] = toXZ(lat, lon); return { name, x, z, r, kind }; };
  return [p("University town (SIUE)", 38.7930, -89.9965, 900, C.TOWN), p("Edwardsville", 38.8105, -89.9560, 1000, C.TOWN), p("Glen Carbon", 38.7598, -89.9735, 330, C.VILLAGE), p("Chain of Rocks crossroads", 38.7618, -90.0093, 70, C.HAMLET)]; })();
const pip = (x, z, pts) => { let c = false; for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) { const xi = pts[i], zi = pts[i + 1], xj = pts[j], zj = pts[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-9) + xi) c = !c; } return c; };
const qq = (x, z) => [Math.floor((x + 100000) / 402.3), Math.floor((z + 100000) / 402.3)];
function buildCover() { const water = OSM_LAND.filter(L => L.water || L[0] === "water"), cem = OSM_LAND.filter(L => L[0] === "cemetery"), golf = OSM_LAND.filter(L => L[0] === "golf_course");
  const box = pts => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < pts.length; i += 2) { a = Math.min(a, pts[i]); b = Math.max(b, pts[i]); c = Math.min(c, pts[i + 1]); d = Math.max(d, pts[i + 1]); } return [a, b, c, d]; };
  const W = water.map(L => [box(L[2]), L[2]]), CM = cem.map(L => [box(L[2]), L[2]]);
  // flatness of each quarter-quarter section (the federal survey's 40-acre squares): a field needs ground flat enough to plough
  const qflat = new Map(), qkey = (a, b) => a * 100000 + b;
  for (let i = 0; i < CN; i++) for (let j = 0; j < CN; j++) { const x = -CR + (j + 0.5) * CELL, z = -CR + (i + 0.5) * CELL, h = demH(x, z), sx = (demH(x + 20, z) - demH(x - 20, z)) / 40, sz = (demH(x, z + 20) - demH(x, z - 20)) / 40, sl = Math.hypot(sx, sz), k = i * CN + j;
    const [qa, qb] = qq(x, z), qk = qkey(qa, qb), q = qflat.get(qk) || [0, 0]; q[0] += sl > 0.06 ? 1 : 0; q[1]++; qflat.set(qk, q);
    let c = C.FOREST; const low = h < 134 && x < 2500;
    for (const P of PLACES) { const d = Math.hypot(x - P.x, z - P.z); if (d < P.r * (0.85 + 0.3 * fbm(x / 400, z / 400, 2))) c = P.kind; }
    if (c === C.FOREST) { if (low) { const nb = [demH(x + 350, z), demH(x - 350, z), demH(x, z + 350), demH(x, z - 350), demH(x + 250, z + 250), demH(x - 250, z - 250), demH(x + 250, z - 250), demH(x - 250, z + 250)].filter(v => v < 136), mean = nb.length ? nb.reduce((a, b) => a + b, 0) / nb.length : h, wet = (mean - h) * 0.9 + (fbm(x / 700 + 3, z / 700, 4) - 0.5) * 1.6; c = wet > 1.3 ? C.WATER : wet > 0.45 ? C.WET : fbm(x / 1100, z / 1100, 3) > 0.5 ? C.FIELD : C.FOREST; }
      else c = sl < 0.05 ? C.FIELD : C.FOREST; }
    if (W.some(([b, p]) => x > b[0] && x < b[1] && z > b[2] && z < b[3] && pip(x, z, p))) c = C.WATER;
    if (CM.some(([b, p]) => x > b[0] && x < b[1] && z > b[2] && z < b[3] && pip(x, z, p))) c = C.GROVE;
    COVER[k] = c; CROP[k] = Math.floor(hash(qa, qb) * 6); }
  // a field takes a whole quarter-quarter section, and only if most of it is flat; some flat sections are kept as meadow, some went back to forest
  for (let i = 0; i < CN; i++) for (let j = 0; j < CN; j++) { const k = i * CN + j; if (COVER[k] !== C.FIELD) continue; const x = -CR + (j + 0.5) * CELL, z = -CR + (i + 0.5) * CELL, [qa, qb] = qq(x, z), q = qflat.get(qkey(qa, qb)), hq = hash(qa + 7, qb + 3);
    if (demH(x, z) >= 134 || x >= 2500) COVER[k] = q[0] / q[1] > 0.25 ? C.FOREST : hq < 0.72 ? C.FIELD : hq < 0.86 ? C.MEADOW : C.FOREST; } }
function coverAt(x, z) { const j = Math.floor((x + CR) / CELL), i = Math.floor((z + CR) / CELL); if (i < 0 || j < 0 || i >= CN || j >= CN) { const h = demH(x, z); return h < 134 ? (fbm(x / 900, z / 900, 3) > 0.55 ? C.FIELD : C.WET) : fbm(x / 1500, z / 1500, 3) > 0.5 ? C.FIELD : C.FOREST; } return COVER[i * CN + j]; }
function cropAt(x, z) { const [a, b] = qq(x, z); return Math.floor(hash(a, b) * 6); }

// ---------- the sky: a hot, hazy July afternoon ----------
// 15 July 3026. The Sun's path at 38.8 N is the same as today's (the Earth's orbit and tilt change only over tens of thousands of years).
const LATR = LAT0 * DEG, DECL = 21.6 * DEG; let tHour = 14.5, rateI = 0;
function sunDir(h) { const H = (h - 12.4) * 15 * DEG, alt = Math.asin(Math.sin(LATR) * Math.sin(DECL) + Math.cos(LATR) * Math.cos(DECL) * Math.cos(H)), az = Math.atan2(-Math.sin(H) * Math.cos(DECL), Math.cos(LATR) * Math.sin(DECL) - Math.sin(LATR) * Math.cos(DECL) * Math.cos(H)); return V3(Math.sin(az) * Math.cos(alt), Math.sin(alt), -Math.cos(az) * Math.cos(alt)); }
const SKYR = 150000, SKY = new THREE.Group(); scene.add(SKY); const skyU = { sun: { value: V3(0, 1, 0) } };
SKY.add(new THREE.Mesh(new THREE.SphereGeometry(SKYR, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vD;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform vec3 sun; varying vec3 vD;
    #include <logdepthbuf_pars_fragment>
    void main(){
    #include <logdepthbuf_fragment>
    vec3 d = normalize(vD); float el = max(d.y, 0.0), mu = dot(d, sun), sEl = sun.y;
      vec3 zen = vec3(0.24, 0.42, 0.72), hor = vec3(0.78, 0.8, 0.8), c = mix(hor, zen, pow(smoothstep(0.0, 0.7, el), 0.6));
      c += vec3(1.0, 0.9, 0.75) * (pow(max(mu, 0.0), 8.0) * 0.35 + pow(max(mu, 0.0), 200.0) * 2.0);
      float low = 1.0 - smoothstep(0.0, 0.3, sEl); c = mix(c, vec3(0.95, 0.6, 0.35) * (0.6 + 0.6 * pow(max(mu, 0.0), 3.0)), low * smoothstep(0.35, 0.0, el) * 0.8);
      float day = smoothstep(-0.12, 0.1, sEl); c = mix(vec3(0.01, 0.015, 0.03), c, day);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` })));
const SUND = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfffff4, fog: false })); SKY.add(SUND);
const sunL = new THREE.DirectionalLight(0xfff4e4, 3.0); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048); Object.assign(sunL.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 }); sunL.shadow.bias = -0.0004; scene.add(sunL, sunL.target);
const ambL = new THREE.HemisphereLight(0xc8dcf4, 0x7a8048, 1.2); scene.add(ambL);
// summer haze over the Mississippi valley: the Arch, 21 km off, is a faint line on a clear day
scene.fog = new THREE.FogExp2(0xc4ccd0, 1 / 26000);
function updateSky() { const s = sunDir(tHour), day = sstep(s.y, -0.12, 0.12); skyU.sun.value.copy(s); SUND.position.copy(s).multiplyScalar(SKYR * 0.9); SUND.scale.setScalar(SKYR * 0.9 * 0.0047); SUND.visible = s.y > -0.02;
  sunL.intensity = 3.0 * sstep(s.y, -0.02, 0.2); sunL.color.setRGB(1, 0.8 + 0.18 * sstep(s.y, 0, 0.4), 0.62 + 0.3 * sstep(s.y, 0, 0.4)); ambL.intensity = 0.06 + 1.15 * day; scene.fog.color.setRGB(0.77, 0.8, 0.82).multiplyScalar(0.05 + 0.95 * day); return s; }

// ---------- the ground: nested grids following you; colours from the 3026 land cover; far forest given the height of its canopy ----------
const noiseT = (() => { const N = 256, d = new Uint8Array(N * N * 4), lat = (seed, f) => { const g = new Float32Array(f * f); for (let i = 0; i < f * f; i++) g[i] = hash(i + seed * 7919, seed); return g; };
  const vnw = (g, f, x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), at = (a, b) => g[((b % f + f) % f) * f + ((a % f + f) % f)]; return lerpN(lerpN(at(i, j), at(i + 1, j), u), lerpN(at(i, j + 1), at(i + 1, j + 1), u), v); };
  const oct = [4, 8, 16, 32, 64].map((f, k) => [f, lat(k + 1, f)]), g2 = lat(30, 64);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let a = 0, w = 0, amp = 1; for (const [f, g] of oct) { a += amp * vnw(g, f, x / N * f, y / N * f); w += amp; amp *= 0.55; } a /= w; const o = (y * N + x) * 4; d[o] = a * 255; d[o + 1] = Math.pow(vnw(g2, 64, x / N * 64, y / N * 64), 3) * 255; d[o + 2] = hash(x + 5, y) * 255; d[o + 3] = hash(x, y + 999) * 255; }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; })();
const NSC = [23, 4.1, 0.9, 0.31, 37, 290], groundU = { nTex: { value: noiseT }, nOff: { value: NSC.map(() => new THREE.Vector2()) } };
function setNoiseOrigin(x, z) { NSC.forEach((sc, i) => groundU.nOff.value[i].set(((x / sc) % 1 + 1) % 1, ((z / sc) % 1 + 1) % 1)); }
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
groundMat.onBeforeCompile = sh => { sh.uniforms.nTex = groundU.nTex; sh.uniforms.nOff = groundU.nOff;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D nTex; uniform vec2 nOff[6]; varying vec3 vWP;")
  .replace("#include <color_fragment>", `#include <color_fragment>
  vec2 wp = vWP.xz; float dist = length(vWP - cameraPosition), near = 1.0 - smoothstep(20.0, 220.0, dist), fine = 1.0 - smoothstep(3.0, 25.0, dist), mid = 1.0 - smoothstep(300.0, 3000.0, dist);
  vec4 n1 = texture2D(nTex, wp / 23.0 + nOff[0]), n2 = texture2D(nTex, wp / 4.1 + nOff[1]), n3 = texture2D(nTex, wp / 0.9 + nOff[2]), n5 = texture2D(nTex, wp / 37.0 + nOff[4]), n6 = texture2D(nTex, wp / 290.0 + nOff[5]);
  vec3 col = diffuseColor.rgb * mix(1.0, (0.85 + 0.3 * n1.r) * (0.9 + 0.2 * n5.r), mid) * (0.9 + 0.2 * n6.r);
  col *= mix(1.0, (0.85 + 0.3 * n2.r) * (0.9 + 0.2 * n3.b), near); col *= mix(1.0, 0.9 + 0.2 * n3.a, fine); diffuseColor.rgb = col;`)
  .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
  { vec2 p = vWP.xz; float e = 0.1; float h0 = texture2D(nTex, p / 4.1 + nOff[1]).r * 0.3 + texture2D(nTex, p / 0.9 + nOff[2]).g * 0.06 * fine, hx = texture2D(nTex, (p + vec2(e, 0.0)) / 4.1 + nOff[1]).r * 0.3 + texture2D(nTex, (p + vec2(e, 0.0)) / 0.9 + nOff[2]).g * 0.06 * fine, hz = texture2D(nTex, (p + vec2(0.0, e)) / 4.1 + nOff[1]).r * 0.3 + texture2D(nTex, (p + vec2(0.0, e)) / 0.9 + nOff[2]).g * 0.06 * fine;
    normal = normalize(normal + (viewMatrix * vec4(-(hx - h0) / e, 0.0, -(hz - h0) / e, 0.0)).xyz * 0.4 * near); }`); };
// colours of the land in 3026
const GC = Object.fromEntries(Object.entries({ floor: "#7a7050", forestFar: "#2e4a22", forestFar2: "#3a5628", field0: "#5a8a30", field1: "#3e6e28", field2: "#c8a858", field3: "#9aa048", field4: "#6a7a5a", field5: "#4e7a34", meadow: "#8a9a50", meadow2: "#a8a060", wet: "#4a6a3a", water: "#3a5a5e", town: "#9a9284", village: "#8a8070", grove: "#5a7a3a", garden: "#5a8a3c" }).map(([k, v]) => [k, new THREE.Color(v)]));
const _c = new THREE.Color();
function groundColor(x, z, h, slope, far, out) { const cv = coverAt(x, z), n = fbm(x / 60, z / 60, 3); let c;
  if (cv === C.FOREST) c = far ? _c.copy(GC.forestFar).lerp(GC.forestFar2, n) : _c.copy(GC.floor).lerp(GC.forestFar, 0.3 * n);
  else if (cv === C.FIELD) { const k = cropAt(x, z); c = _c.copy(GC["field" + k]); if (k === 0 || k === 1 || k === 5) { const rows = 0.5 + 0.5 * Math.sin(x * 4.2); if (!far) c.multiplyScalar(0.85 + 0.25 * rows); } }
  else if (cv === C.MEADOW) c = _c.copy(GC.meadow).lerp(GC.meadow2, n);
  else if (cv === C.WET) c = _c.copy(GC.wet).lerp(GC.water, 0.35 * n);
  else if (cv === C.WATER) c = _c.copy(GC.water);
  else if (cv === C.GROVE) c = _c.copy(GC.grove);
  else c = _c.copy(GC.garden).lerp(GC.meadow, 0.5 * n);
  out[0] = c.r; out[1] = c.g; out[2] = c.b; return cv; }
const canopyH = (cv, x, z) => cv === C.FOREST ? 20 + 8 * fbm(x / 80, z / 80, 3) : cv === C.WET ? 6 * fbm(x / 50, z / 50, 2) : cv === C.GROVE ? 16 : cv === C.TOWN ? 9 : cv === C.VILLAGE ? 6 : 0;
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, x0: 0, z0: 0 };
function grid(size, n, drop, level) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, level, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(90, 90, 0, 0), grid(600, 120, 0.3, 1), grid(4000, 128, 2, 2), grid(24000, 140, 10, 3), grid(160000, 90, 60, 4)] : [grid(100, 100, 0, 0), grid(600, 160, 0.3, 1), grid(4000, 180, 2, 2), grid(24000, 180, 10, 3), grid(160000, 110, 60, 4)];
for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
// the trees near you are drawn one by one (out to TREE_R); beyond, the forest is drawn as a canopy surface at the trees' height
const TREE_R = 300;
function fillGrid(m) { const { size, n, drop, inner, level } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    const dme = Math.hypot(x - ME.x, z - ME.z), far = level >= 1 ? sstep(dme, TREE_R - 20, TREE_R + 20) : 0, cv = groundColor(x, z, H[i], slope, far > 0.5, c3);
    let y = H[i] + (far > 0 ? canopyH(cv, x, z) * far : 0) - (dme * dme) / (2 * R_E) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 30 + drop * 4; }
    p.setY(i, y); col.setXYZ(i, c3[0], c3[1], c3[2]); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = true; m.geometry.computeVertexNormals(); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * (m.userData.level === 1 ? 0.04 : 0.06)) { fillGrid(m); if (!force) return; } }
function meshY(x, z) { for (const m of GRIDS) { const { size, n, ox, oz } = m.userData; if (ox === undefined) continue; const step = size / n, fx = (x - ox + size / 2) / step, fz = (z - oz + size / 2) / step; if (fx < 2 || fz < 2 || fx > n - 2 || fz > n - 2) continue;
    const ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz, P = m.geometry.attributes.position, Y = (i, k) => P.getY(k * (n + 1) + i), ya = Y(ix, iz), yb = Y(ix, iz + 1), yc = Y(ix + 1, iz + 1), yd = Y(ix + 1, iz);
    return u + v < 1 ? ya + u * (yd - ya) + v * (yb - ya) : yc + (1 - u) * (yb - yc) + (1 - v) * (yd - yc); } return land(x, z); }

// ---------- what of today's map is still here: roads with a reason to exist; the rest, faint lines where they ran ----------
const WORLD = new THREE.Group(); scene.add(WORLD);
// join a road's pieces into continuous lines
function chain(list) { const segs = list.map(p => { const a = []; for (let i = 0; i < p.length; i += 2) a.push([p[i], p[i + 1]]); return a; }), out = [], used = new Set(), key = q => Math.round(q[0]) + "," + Math.round(q[1]);
  for (let s = 0; s < segs.length; s++) { if (used.has(s)) continue; used.add(s); let line = segs[s].slice(), grew = true;
    while (grew) { grew = false; for (let t = 0; t < segs.length; t++) { if (used.has(t)) continue; const g = segs[t], a = line[0], b = line[line.length - 1], d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 3;
        if (d(b, g[0])) { line = line.concat(g.slice(1)); } else if (d(b, g[g.length - 1])) { line = line.concat(g.slice(0, -1).reverse()); } else if (d(a, g[g.length - 1])) { line = g.slice(0, -1).concat(line); } else if (d(a, g[0])) { line = g.slice(1).reverse().concat(line); } else continue; used.add(t); grew = true; } }
    out.push(line); } return out.sort((p, q) => q.length - p.length); }
const resample = (line, ds) => { const out = [line[0]]; for (let i = 1; i < line.length; i++) { const [ax, az] = line[i - 1], [bx, bz] = line[i], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / ds)); for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } return out; };
const KEPT = { r157: [], gcr: [], main: [], rail: [], i270: [] };
const SEGIDX = new Map(), segKey = (x, z) => Math.floor(x / 40) * 100000 + Math.floor(z / 40);
function indexRoad(line, hw) { for (let i = 1; i < line.length; i++) { const [ax, az] = line[i - 1], [bx, bz] = line[i]; for (const [x, z] of [[ax, az], [bx, bz], [(ax + bx) / 2, (az + bz) / 2]]) { const k = segKey(x, z); if (!SEGIDX.has(k)) SEGIDX.set(k, []); SEGIDX.get(k).push([ax, az, bx, bz, hw]); } } }
function nearRoad(x, z, pad = 0) { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = SEGIDX.get(segKey(x + a * 40, z + b * 40)); if (!L) continue; for (const [ax, az, bx, bz, hw] of L) { const dx = bx - ax, dz = bz - az, t = clampN(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9), 0, 1); if (Math.hypot(x - ax - dx * t, z - az - dz * t) < hw + pad) return true; } } return false; }
const ROADM = new THREE.MeshStandardMaterial({ color: 0x6e6a60, roughness: 0.92 }), PATHM = new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 0.95 }), SLABM = new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.8 }), RAILM = new THREE.MeshStandardMaterial({ color: 0x5a5a5e, metalness: 0.7, roughness: 0.4 });
function ribbon(line, w, lift, mat, off = 0) { const P = resample(line, 4), pos = [], idx = []; for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, sx = -dz / L, sz = dx / L;
    for (const s of [-1, 1]) { const x = P[i][0] + sx * (off + s * w / 2), z = P[i][1] + sz * (off + s * w / 2); pos.push(x, land(x, z) + lift, z); } if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; WORLD.add(m); return m; }
function buildRoads() { const by = f => OSM_ROADS.filter(f).map(r => r[3]);
  // Route 157: a narrow, shaded two-lane road and a footpath beside it
  KEPT.r157 = chain(by(r => r[1] === 1)).map(l => resample(l, 8)); for (const L of KEPT.r157) { ribbon(L, 6.5, 0.08, ROADM); ribbon(L, 2.4, 0.1, PATHM, 6.2); indexRoad(L, 8); }
  // Glen Carbon Road down from the village to 157, and Main Street through the village
  { const R = []; for (let i = 0; i < VILLAGE_ROUTE.length; i += 2) R.push([VILLAGE_ROUTE[i], VILLAGE_ROUTE[i + 1]]); KEPT.route = resample(R, 8); let k = 0; while (k < KEPT.route.length - 1 && nearRoad(KEPT.route[k][0], KEPT.route[k][1], 0)) k++; KEPT.gcr = [KEPT.route.slice(Math.max(0, k - 2))]; for (const L of KEPT.gcr) { ribbon(L, 5.5, 0.08, ROADM); indexRoad(L, 6); } }
  const V = PLACES[2]; KEPT.main = chain(by(r => /Main St/.test(r[2]) && Math.hypot(r[3][0] - V.x, r[3][1] - V.z) < 900)).map(l => resample(l, 8)); for (const L of KEPT.main) { ribbon(L, 5.5, 0.08, ROADM); indexRoad(L, 6); }
  // the interstate's embankment carries an electric railway now; the old railway up the valley is still a railway
  KEPT.i270 = chain(by(r => r[0] === 0 && !/Link/i.test(r[2]))).filter(l => l.length > 20).map(l => resample(l, 10)); for (const L of KEPT.i270) { ribbon(L, 5, 0.25, SLABM); ribbon(L, 0.15, 0.45, RAILM, -0.75); ribbon(L, 0.15, 0.45, RAILM, 0.75); indexRoad(L, 6); }
  KEPT.rail = chain(OSM_RAILS).map(l => resample(l, 10)); for (const L of KEPT.rail) { ribbon(L, 4, 0.2, SLABM); ribbon(L, 0.12, 0.38, RAILM, -0.72); ribbon(L, 0.12, 0.38, RAILM, 0.72); indexRoad(L, 5); }
  // catenary masts along the electric lines
  const masts = []; for (const L of KEPT.i270.concat(KEPT.rail)) for (let i = 0; i < L.length; i += 5) masts.push(L[i]); const MM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.15, 7, 6).translate(0, 3.5, 0), RAILM, masts.length), m4 = new THREE.Matrix4();
  masts.forEach(([x, z], i) => { MM.setMatrixAt(i, m4.makeTranslation(x + 3.2, land(x, z), z)); }); MM.frustumCulled = false; WORLD.add(MM);
  // the rest of today's roads: faint lines where they used to run
  const gp = [], kept = r => r[1] === 1 || /^Glen Carbon Road$/.test(r[2]) || (r[0] === 0 && !/Link/i.test(r[2])); for (const r of OSM_ROADS) { if (kept(r) || r[0] === 6 && /Heritage/.test(r[2])) continue; const p = r[3]; for (let i = 2; i < p.length; i += 2) { const ax = p[i - 2], az = p[i - 1], bx = p[i], bz = p[i + 1]; gp.push(ax, land(ax, az) + 0.25, az, bx, land(bx, bz) + 0.25, bz); } }
  const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3)); GHOST = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.32, depthWrite: false })); WORLD.add(GHOST);
  // the Heritage Trail (an old railway grade, now a trail): footpaths last when people keep walking them
  for (const r of OSM_ROADS) if (r[0] === 6 && /Heritage/.test(r[2])) { const L = []; for (let i = 0; i < r[3].length; i += 2) L.push([r[3][i], r[3][i + 1]]); ribbon(resample(L, 6), 2.5, 0.07, PATHM); } }
let GHOST = null;

// ---------- the trees: old forest on the ravines and where the subdivisions were; hedgerows along the field lines; willows in the wet ground; trees along the roads and streets ----------
// After a few centuries without clearing, the forest here would be oak and hickory with sugar maple, and, in a climate like today's Arkansas or north Texas, more of the
// southern trees already at the edge of their range: sweetgum, southern red oak, shortleaf pine, pecan.
function treeGeo(kind) { const parts = [], add = (g, col) => { const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); parts.push(g.index ? g.toNonIndexed() : g); };
  const trunk = new THREE.Color(0x6a5a48), leaf = new THREE.Color(0x4a7a32), dark = new THREE.Color(0x335a2c);
  const lump = (r, x, y, z, sy, seed, col) => { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), k = 0.72 + 0.5 * vn(vx * 2.1 + seed, vy * 2.1 + vz * 1.7 + seed * 3); p.setXYZ(i, vx * k * r + x, vy * k * r * sy + y, vz * k * r + z); } add(g, col); };
  const lc = s2 => new THREE.Color().setHSL(0.24 + 0.05 * hash(s2, 1), 0.38 + 0.15 * hash(s2, 2), 0.24 + 0.08 * hash(s2, 3));
  if (kind === 0) { add(new THREE.CylinderGeometry(0.3, 0.55, 10, 6).translate(0, 5, 0), trunk); add(new THREE.CylinderGeometry(0.12, 0.2, 6, 5).rotateZ(0.7).translate(2, 10, 0), trunk); add(new THREE.CylinderGeometry(0.12, 0.2, 6, 5).rotateZ(-0.6).rotateY(2).translate(-1.5, 10, 1), trunk);
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3, rr = k ? 3.6 : 0; lump(k ? 3.6 : 4.8, Math.cos(a) * rr, 13 + (k ? 1.5 * hash(k, 5) - 1 : 2.2), Math.sin(a) * rr, 0.8, k * 7 + 1, lc(k)); } }
  else if (kind === 1) { add(new THREE.CylinderGeometry(0.25, 0.45, 13, 6).translate(0, 6.5, 0), trunk); for (let k = 0; k < 5; k++) { const a = k * 1.26, rr = k ? 1.8 : 0; lump(k ? 2.8 : 3.4, Math.cos(a) * rr, 15 + k * 1.6, Math.sin(a) * rr, 1.25, k * 11 + 3, lc(k + 10)); } }
  else if (kind === 2) { add(new THREE.CylinderGeometry(0.25, 0.4, 5, 6).translate(0, 2.5, 0), trunk); add(new THREE.ConeGeometry(3.5, 14, 8).translate(0, 11, 0), dark); }
  else { add(new THREE.CylinderGeometry(0.3, 0.5, 4.5, 6).translate(0, 2.25, 0), trunk); for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4, rr = k ? 2 : 0; lump(k ? 2.6 : 3.2, Math.cos(a) * rr, 6.5 + (k ? 0.6 * hash(k, 9) : 1), Math.sin(a) * rr, 0.85, k * 13 + 5, new THREE.Color().setHSL(0.22 + 0.04 * hash(k, 4), 0.42, 0.3)); } }
  let n = 0; for (const p of parts) n += p.attributes.position.count; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0; for (const p of parts) { pos.set(p.attributes.position.array, o * 3); col.set(p.attributes.color.array, o * 3); o += p.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }
const TREEMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }), TMAX = IS_HEADSET ? 4500 : 8000;
const TREES = [0, 1, 2, 3].map(k => { const m = new THREE.InstancedMesh(treeGeo(k), TREEMAT, TMAX); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; scene.add(m); return m; });
let treeC = [1e12, 1e12];
function fillTrees() { treeC = [ME.x, ME.z]; const S = 6.5, cnt = [0, 0, 0, 0], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S), R = Math.ceil(TREE_R / S);
  const put = (k, x, z, s, i, j) => { if (cnt[k] >= TMAX) return; q.setFromAxisAngle(V3(0, 1, 0), hash(i, j + 5) * 6.28); m4.compose(V3(x - ME.x0, meshY(x, z) - 0.3, z - ME.z0), q, V3(s, s * (0.85 + 0.3 * hash(j, i)), s)); TREES[k].setMatrixAt(cnt[k], m4); const v = hash(i + 3, j + 9); col.setRGB(0.8 + 0.4 * v, 0.85 + 0.3 * hash(i, j + 1), 0.75 + 0.3 * v); TREES[k].setColorAt(cnt[k], col); cnt[k]++; };
  for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) { const x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S; if ((x - ME.x) ** 2 + (z - ME.z) ** 2 > TREE_R * TREE_R) continue; const cv = coverAt(x, z), r = hash(i * 3 + 7, j * 5 + 1);
    let p = cv === C.FOREST ? 0.8 : cv === C.GROVE ? 0.35 : cv === C.WET ? 0.22 : cv === C.MEADOW ? 0.03 : 0;
    if (cv === C.FIELD) { const fx = ((x + 100000) % 402.3), fz = ((z + 100000) % 402.3); if (Math.min(fx, 402.3 - fx, fz, 402.3 - fz) < 5) p = 0.55; }
    if (r > p || nearRoad(x, z, 2.5) || inTown(x, z)) continue; const sp = hash(i + 11, j + 13), k = cv === C.WET ? 3 : sp < 0.55 ? 0 : sp < 0.8 ? 1 : sp < 0.92 ? 2 : 3, s = cv === C.FOREST ? 0.85 + 0.45 * hash(i, j + 77) : 0.6 + 0.4 * hash(i, j + 77); put(k, x, z, s, i, j); }
  // trees along Route 157 and the village and town streets
  for (const L of KEPT.r157.concat(KEPT.gcr, KEPT.main)) for (let i = 0; i < L.length; i++) { const [x, z] = L[i]; if ((x - ME.x) ** 2 + (z - ME.z) ** 2 > TREE_R * TREE_R) continue; const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], ln = Math.hypot(dx, dz) || 1;
    if (i % 2) continue; for (const s of [-1, 1]) { const d = s > 0 ? 10.5 : 6.5, ox = x - dz / ln * s * d, oz = z + dx / ln * s * d; if (inTown(ox, oz)) continue; put(3, ox, oz, 0.7 + 0.2 * hash(i, s + 3), i, s + 50); } }
  for (const [x, z] of STREET_TREES) if ((x - ME.x) ** 2 + (z - ME.z) ** 2 < TREE_R * TREE_R) put(3, x, z, 0.55, Math.round(x), Math.round(z));
  TREES.forEach((M, k) => { M.count = cnt[k]; M.instanceMatrix.needsUpdate = true; if (M.instanceColor) M.instanceColor.needsUpdate = true; }); }
const STREET_TREES = [];

// ---------- the ruins of today's houses under the forest: concrete foundations and slab edges (the wood rotted away within decades) ----------
const RUINM = new THREE.MeshStandardMaterial({ color: 0x7a7a6e, roughness: 0.95 }), RUIN = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), RUINM, 3000); RUIN.frustumCulled = false; RUIN.receiveShadow = true; RUIN.count = 0; scene.add(RUIN);
let ruinC = [1e12, 1e12];
function fillRuins() { ruinC = [ME.x, ME.z]; let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  for (const [kind, p] of OSM_BLDS) { if (k > 2950) break; if (Math.abs(p[0] - ME.x) > 220 || Math.abs(p[1] - ME.z) > 220) continue; const cv = coverAt(p[0], p[1]); if (cv !== C.FOREST && cv !== C.MEADOW && cv !== C.WET) continue;
    const hy = hash(Math.round(p[0]), Math.round(p[1]));
    for (let i = 2; i < p.length && k < 2990; i += 2) { const ax = p[i - 2], az = p[i - 1], bx = p[i], bz = p[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue; if (hash(i, Math.round(ax)) < 0.25) continue; const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      q.setFromAxisAngle(V3(0, 1, 0), -Math.atan2(bz - az, bx - ax)); const hh = 0.25 + 0.5 * hash(i + 1, Math.round(az)); m4.compose(V3(cx - ME.x0, meshY(cx, cz) + hh / 2 - 0.15, cz - ME.z0), q, V3(L * (0.6 + 0.4 * hash(i, 3)), hh, 0.3)); RUIN.setMatrixAt(k, m4); const g = 0.5 + 0.3 * hy; col.setRGB(g * 0.9, g, g * 0.85); RUIN.setColorAt(k, col); k++; } }
  RUIN.count = k; RUIN.instanceMatrix.needsUpdate = true; if (RUIN.instanceColor) RUIN.instanceColor.needsUpdate = true; }

// ---------- the buildings of 3026: courtyard blocks of three to six floors on narrow shaded streets (the town), smaller ones round a square (the village) ----------
// Thick walls of stone, rammed earth and long-lived concrete, pale to reflect the summer sun; green or solar roofs; windows set deep. The streets are narrow so the
// buildings shade them, as in the old towns of hot countries.
const wallU = { night: { value: 0 } };
const WALLM = new THREE.MeshStandardMaterial({ roughness: 0.85 });
WALLM.onBeforeCompile = sh => { sh.uniforms.night = wallU.night;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP2; varying vec3 vWN2;").replace("#include <fog_vertex>", "#include <fog_vertex>\nmat4 imW = modelMatrix * instanceMatrix; vWP2 = (imW * vec4(position, 1.0)).xyz; vWN2 = normalize(mat3(imW) * normal);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float night; varying vec3 vWP2; varying vec3 vWN2; float wh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5); }")
  .replace("#include <color_fragment>", `#include <color_fragment>
  float vert = 1.0 - abs(vWN2.y), along = dot(vWP2.xz, normalize(vec2(-vWN2.z, vWN2.x) + 1e-5)), fy = fract(vWP2.y / 3.4), fx = fract(along / 2.8); vec2 cell = vec2(floor(along / 2.8), floor(vWP2.y / 3.4));
  float win = vert * step(0.32, fy) * step(fy, 0.82) * step(0.22, fx) * step(fx, 0.78); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.08, 0.1, 0.12), win * 0.9);`)
  .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1.0, 0.78, 0.5) * win * night * step(0.45, wh(cell + vWP2.xz * 0.001)) * 0.9;`); };
const ROOFM = new THREE.MeshStandardMaterial({ roughness: 0.8 });
let WALLS = null, ROOFS = null;
const BCOL = [0xd8c8a8, 0xc8b08a, 0xb89a78, 0xe0d8c8, 0xc89a72, 0xd0c0a0];
// occupancy of the ground by buildings, in 2 m cells: keeps buildings apart, and you and the trees out of them
const OCC = new Set(), occK = (x, z) => Math.floor(x / 2) * 100000 + Math.floor(z / 2);
function occupy(cx, cz, L, D, yaw, mark) { const c = Math.cos(yaw), s2 = Math.sin(yaw); for (let u = -L / 2; u <= L / 2; u += 1.5) for (let v = -D / 2; v <= D / 2; v += 1.5) { const x = cx + u * c + v * s2, z = cz - u * s2 + v * c, k = occK(x, z); if (!mark && OCC.has(k)) return false; if (mark) OCC.add(k); } return true; }
const TSTREETS = [];
function buildTown() { const walls = [], roofs = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const bld = (x, z, yaw, L, D, floors, c) => { const lo = Math.min(land(x, z), land(x + Math.cos(yaw) * L / 2, z - Math.sin(yaw) * L / 2), land(x - Math.cos(yaw) * L / 2, z + Math.sin(yaw) * L / 2)) - 1.5, H = floors * 3.4 + 1.5; walls.push([x, lo + H / 2, z, L, H, D, c, yaw]); roofs.push([x, lo + H + 0.15, z, L - 0.4, 0.3, D - 0.4, hash(Math.round(x), Math.round(z)) < 0.55 ? 0x5a7a3a : 0x1e2a44, yaw]); occupy(x, z, L + 1, D + 1, yaw, true); };
  // the towns keep today's street plan: a town that stays lived in keeps its streets for centuries, though every building on them is rebuilt many times
  PLACES.forEach((P, pi) => { if (P.kind === C.HAMLET) return; const town = P.kind === C.TOWN;
    for (const r of OSM_ROADS) { if (r[0] < 1 || r[0] > 5 || r[1] === 1) continue; const p = r[3]; let inside = false; for (let i = 0; i < p.length; i += 2) if (Math.hypot(p[i] - P.x, p[i + 1] - P.z) < P.r * 0.95 && coverAt(p[i], p[i + 1]) === P.kind) { inside = true; break; } if (!inside) continue;
      const L0 = []; for (let i = 0; i < p.length; i += 2) L0.push([p[i], p[i + 1]]); const L = resample(L0, 4).filter(([x, z]) => Math.hypot(x - P.x, z - P.z) < P.r && coverAt(x, z) === P.kind); if (L.length < 3) continue; const hw = r[0] <= 2 ? 5 : r[0] === 5 ? 3 : 4; TSTREETS.push({ L, hw, town, pi }); } });
  for (const T of TSTREETS) { ribbon(T.L, T.hw * 2, 0.07, ROADM); indexRoad(T.L, T.hw); }
  for (const T of TSTREETS) { const { L, hw, town } = T; for (const side of [-1, 1]) { let i = 0; while (i < L.length - 2) { const a = L[i], b = L[Math.min(L.length - 1, i + 3)], dx = b[0] - a[0], dz = b[1] - a[1], ln = Math.hypot(dx, dz) || 1, ux = dx / ln, uz = dz / ln, hb = hash(Math.round(a[0] * 7), Math.round(a[1] * 3) + side);
      const Lb = town ? 14 + 16 * hb : 9 + 9 * hb, D = town ? 11 + 4 * hash(i, side + 5) : 8 + 3 * hash(i, side + 5), off = hw + 1.8 + D / 2, cx = a[0] + ux * Lb / 2 - uz * off * side, cz = a[1] + uz * Lb / 2 + ux * off * side, yaw = -Math.atan2(uz, ux);
      const d = Math.hypot(cx - PLACES[T.pi].x, cz - PLACES[T.pi].z) / PLACES[T.pi].r, floors = town ? Math.max(3, Math.round(6 - 3 * d + hb * 1.5)) : Math.max(2, Math.round(3.5 - 1.5 * d + hb)), slopeOk = Math.abs(land(cx + ux * Lb / 2, cz + uz * Lb / 2) - land(cx - ux * Lb / 2, cz - uz * Lb / 2)) < 4;
      if (slopeOk && !nearRoad(cx, cz, D / 2 - 0.5) && !nearRoad(cx + ux * Lb / 2 - uz * D / 2 * side, cz + uz * Lb / 2 + ux * D / 2 * side, 0.5) && occupy(cx, cz, Lb + 2, D + 2, yaw, false) && hash(i + 77, Math.round(cx)) > 0.08) bld(cx, cz, yaw, Lb, D, floors, BCOL[Math.floor(hash(Math.round(cx), Math.round(cz)) * BCOL.length)]);
      else if (hash(i, Math.round(cz)) < 0.5) STREET_TREES.push([a[0] - uz * (hw + 4) * side, a[1] + ux * (hw + 4) * side]);
      i += Math.max(2, Math.round((Lb + 0.8) / 4)); } } }
  // between the streets: more buildings, turned to face the nearest street, with squares and small parks left open
  const nearestDir = (x, z) => { let best = null, bd = 1e9; for (let a2 = -2; a2 <= 2; a2++) for (let b2 = -2; b2 <= 2; b2++) { const Ls = SEGIDX.get(segKey(x + a2 * 40, z + b2 * 40)); if (!Ls) continue; for (const [ax, az, bx, bz] of Ls) { const dx = bx - ax, dz = bz - az, t = clampN(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz + 1e-9), 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < bd) { bd = d; best = -Math.atan2(dz, dx); } } } return best === null ? 0 : best; };
  PLACES.forEach((P, pi) => { if (P.kind === C.HAMLET) return; const town = P.kind === C.TOWN, step = town ? 26 : 22;
    for (let x = P.x - P.r; x <= P.x + P.r; x += step) for (let z = P.z - P.r; z <= P.z + P.r; z += step) { const jx = x + (hash(Math.round(x), Math.round(z)) - 0.5) * 8, jz = z + (hash(Math.round(z), Math.round(x)) - 0.5) * 8; if (coverAt(jx, jz) !== P.kind || Math.hypot(jx - P.x, jz - P.z) > P.r) continue;
      const hb = hash(Math.round(jx * 3), Math.round(jz * 5)); if (hb < (town ? 0.12 : 0.3)) { if (hb < 0.08) for (let k = 0; k < 3; k++) STREET_TREES.push([jx + (hash(k, Math.round(jx)) - 0.5) * 14, jz + (hash(Math.round(jz), k) - 0.5) * 14]); continue; }
      const yaw = nearestDir(jx, jz), Lb = town ? 16 + 12 * hb : 10 + 8 * hb, D = town ? 12 + 3 * hash(Math.round(jx), 3) : 9, dd = Math.hypot(jx - P.x, jz - P.z) / P.r, floors = town ? Math.max(3, Math.round(5.5 - 2.5 * dd + hb)) : Math.max(2, Math.round(3 - dd + hb));
      if (Math.abs(land(jx + Math.cos(yaw) * Lb / 2, jz - Math.sin(yaw) * Lb / 2) - land(jx - Math.cos(yaw) * Lb / 2, jz + Math.sin(yaw) * Lb / 2)) < 4 && !nearRoad(jx, jz, Math.max(Lb, D) / 2 + 1) && occupy(jx, jz, Lb + 3, D + 3, yaw, false)) bld(jx, jz, yaw, Lb, D, floors, BCOL[Math.floor(hash(Math.round(jx), Math.round(jz) + 1) * BCOL.length)]); } });
  // the crossroads stop where you start: a café, a workshop and a few houses, set back from Route 157
  const H0 = PLACES[3]; for (const [dx, dz, w, d, f] of [[34, -22, 12, 9, 2], [36, 14, 16, 10, 2], [58, -6, 10, 10, 2], [62, 26, 12, 8, 3], [-38, 40, 10, 9, 2]]) { const x = H0.x + dx, z = H0.z + dz; if (nearRoad(x, z, 6)) continue; bld(x, z, 0, w, d, f, BCOL[(dx & 3) + 1]); }
  WALLS = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), WALLM, walls.length); ROOFS = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ROOFM, roofs.length);
  walls.forEach(([x, y, z, w, h, d, c, yaw], i) => { q.setFromAxisAngle(V3(0, 1, 0), yaw); WALLS.setMatrixAt(i, m4.compose(V3(x, y, z), q, V3(w, h, d))); WALLS.setColorAt(i, col.set(c)); }); roofs.forEach(([x, y, z, w, h, d, c, yaw], i) => { q.setFromAxisAngle(V3(0, 1, 0), yaw); ROOFS.setMatrixAt(i, m4.compose(V3(x, y, z), q, V3(w, h, d))); ROOFS.setColorAt(i, col.set(c)); });
  for (const M of [WALLS, ROOFS]) { M.frustumCulled = false; M.castShadow = false; M.receiveShadow = true; WORLD.add(M); } }
const inTown = (x, z) => OCC.has(occK(x, z));

// ---------- water: the ponds and lakes on today's map (the stormwater basins of the subdivisions silt up and become marshes over centuries; the larger lakes remain) ----------
function buildWater() { const WM = new THREE.MeshStandardMaterial({ color: 0x3a5a62, roughness: 0.15, metalness: 0.2 }); for (const L of OSM_LAND) { if (L[0] !== "water") continue; const p = L[2]; if (p.length < 8) continue; const sh = new THREE.Shape(); let lo = 1e9;
    for (let i = 0; i < p.length; i += 2) { (i ? sh.lineTo : sh.moveTo).call(sh, p[i], -p[i + 1]); lo = Math.min(lo, land(p[i], p[i + 1])); } const g = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), m = new THREE.Mesh(g, WM); m.position.y = lo + 0.2; m.receiveShadow = true; WORLD.add(m); } }

// ---------- far off: St. Louis and the Gateway Arch, 21 km south-west; Monks Mound at Cahokia, 12 km south-west ----------
// The Arch (1965) is stainless steel over a concrete core: kept up, as the Eiffel Tower and the Colosseum are, it could stand for a thousand years. The city round it is
// still a city (cities on great rivers last), but its buildings would all be new: the skyline here is a guess. Monks Mound, Cahokia's largest earthwork, was raised a
// thousand years before today, about 1050; it is still there now, and in another thousand years it will be too.
function buildFar() { const FAR = new THREE.Group(); WORLD.add(FAR); const [ax, az] = toXZ(38.6247, -90.1848), base = demH(ax, az), ft = 0.3048, pts = [];
  for (let k = 0; k <= 60; k++) { const x = (k / 60 * 2 - 1) * 299.2239, y = 625.0925 - 68.7672 * Math.cosh(3.0022 * x / 299.2239); pts.push([x * ft, y * ft]); }
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: 0.9, roughness: 0.25 }); for (let k = 0; k < 60; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[k + 1], L = Math.hypot(x2 - x1, y2 - y1), w = lerpN(16.5, 5.2, 1 - Math.abs((x1 + x2) / 2) / (299.2239 * ft)), m = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, L, 3), steel);
    m.position.set(ax, base + (y1 + y2) / 2, az + (x1 + x2) / 2); m.rotation.set(Math.atan2(x2 - x1, y2 - y1), 0, 0); FAR.add(m); }
  const [cx, cz] = toXZ(38.6295, -90.1960), tw = new THREE.MeshStandardMaterial({ color: 0xb8c0c4, roughness: 0.5, metalness: 0.3 });
  for (let k = 0; k < 46; k++) { const r = 250 + 1600 * Math.pow(hash(k, 1), 1.5), a = hash(k, 2) * 6.28, x = cx + Math.cos(a) * r - 400, z = cz + Math.sin(a) * r, h = 30 + 200 * Math.pow(hash(k, 3), 2) * (1 - r / 2200), w = 20 + 30 * hash(k, 4); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.7 + 0.6 * hash(k, 5))), tw); m.position.set(x, demH(x, z) + h / 2, z); FAR.add(m); }
  const [mx, mz] = toXZ(38.6604, -90.0620), mb = demH(mx, mz), mound = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 1 }); const lo = new THREE.Mesh(new THREE.BoxGeometry(291, 12, 236), mound); lo.position.set(mx, mb + 6, mz); FAR.add(lo); const up = new THREE.Mesh(new THREE.BoxGeometry(180, 18, 150), mound); up.position.set(mx, mb + 21, mz - 30); FAR.add(up); SITE.ARCH = [ax, az, base]; SITE.MONKS = [mx, mz, mb]; SITE.STL = [cx, cz]; }
const SITE = {};

// ---------- moving: small automated electric pods on Route 157 and the village road; trains on the old interstate and up the valley ----------
const cumOf = L => { const c = [0]; for (let i = 1; i < L.length; i++) c.push(c[i - 1] + Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1])); return c; };
function along(L, cum, s) { s = clampN(s, 0, cum[cum.length - 1]); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]), a = L[lo], b = L[hi]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[0] - a[0], b[1] - a[1]]; }
function podGeo() { const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 2.0, 6, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8e8e2, metalness: 0.3, roughness: 0.35 })); body.position.y = 1.0; body.scale.set(1, 0.9, 1); g.add(body);
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1.4, 6, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.75 })); glass.position.set(0, 1.35, -0.1); glass.scale.set(1.02, 0.6, 1); g.add(glass);
  for (const x of [-0.75, 0.75]) for (const z of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x222222 })); w.position.set(x, 0.32, z); g.add(w); } g.traverse(o => o.castShadow = true); scene.add(g); return g; }
function trainGeo(n) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xd8dcdc, metalness: 0.4, roughness: 0.35 }), w = new THREE.MeshStandardMaterial({ color: 0x14202a, roughness: 0.1 }); for (let k = 0; k < n; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.6, 24), m); c.position.set(0, 2.3, k * 25); g.add(c); const b = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.9, 22), w); b.position.set(0, 2.9, k * 25); g.add(b); } g.traverse(o => o.castShadow = true); scene.add(g); return g; }
const PODS = [], TRAINS = [];
function buildMovers() { const L = KEPT.r157[0], cum = cumOf(L); for (let k = 0; k < 14; k++) PODS.push({ L, cum, s: hash(k, 1) * cum[cum.length - 1], v: (k % 2 ? 1 : -1) * (12 + 3 * hash(k, 2)), g: podGeo(), side: k % 2 ? 1 : -1 });
  const R = KEPT.route, rc = cumOf(R); for (let k = 0; k < 5; k++) PODS.push({ L: R, cum: rc, s: hash(k, 7) * rc[rc.length - 1], v: (k % 2 ? 1 : -1) * 11, g: podGeo(), side: k % 2 ? 1 : -1 });
  for (const T of KEPT.i270.slice(0, 2).concat(KEPT.rail.slice(0, 1))) { const c = cumOf(T); if (c[c.length - 1] < 1000) continue; TRAINS.push({ L: T, cum: c, s: hash(TRAINS.length, 3) * c[c.length - 1], v: 33 * (TRAINS.length % 2 ? -1 : 1), g: trainGeo(T === KEPT.rail[0] ? 3 : 6) }); } }
function updateMovers(dt) { for (const P of PODS) { if (P === ride?.pod) continue; P.s += P.v * dt; const Lt = P.cum[P.cum.length - 1]; if (P.s > Lt) { P.s = Lt; P.v = -P.v; P.side = -P.side; } if (P.s < 0) { P.s = 0; P.v = -P.v; P.side = -P.side; }
    const [x, z, dx, dz] = along(P.L, P.cum, P.s), ln = Math.hypot(dx, dz) || 1, ox = x - dz / ln * 1.6 * P.side, oz = z + dx / ln * 1.6 * P.side, near = Math.hypot(ox - ME.x, oz - ME.z) < 1500; P.g.visible = near; if (!near) continue; P.g.position.set(ox - ME.x0, land(ox, oz) + 0.1, oz - ME.z0); P.g.rotation.y = Math.atan2(-dx * Math.sign(P.v), -dz * Math.sign(P.v)); }
  for (const T of TRAINS) { T.s += T.v * dt; const Lt = T.cum[T.cum.length - 1]; if (T.s > Lt || T.s < 0) T.s = (T.s + Lt) % Lt; const [x, z, dx, dz] = along(T.L, T.cum, T.s), near = Math.hypot(x - ME.x, z - ME.z) < 4000; T.g.visible = near; if (!near) continue; T.g.position.set(x - ME.x0, land(x, z) + 0.4, z - ME.z0); T.g.rotation.y = Math.atan2(-dx * Math.sign(T.v), -dz * Math.sign(T.v)); } }

// ---------- signs: each tells what you see, why, and how sure anyone could be ----------
const INFO = {
  start: "<b>Route 157 at Chain of Rocks Road, July 3026.</b> This is one best guess, not a prediction: what a thousand years of today's trends would most likely make of this spot. The ground is real (USGS); the faint lines are today's roads. What is here: a crossroads stop for the small automated pods that run along Route 157, a café and a workshop; the old forest where the subdivisions were; to the west, the American Bottom of the Mississippi, mostly wetland and bottomland forest again; 21 km south-west, St. Louis and the Arch in the haze. Every guess has a sign like this one. Look at them and press E.",
  r157: "<b>Why Route 157 is still here.</b> Roads outlast everything built along them when they keep a reason to exist: Roman roads still carry traffic; London's streets still follow medieval lanes. Route 157 runs along the foot of the bluff, where the floodplain meets the uplands: a natural line from Collinsville to Edwardsville. So it is still a road, but a narrow, shaded one, two lanes for small automated electric pods, with a footpath: today's four lanes and turning lanes were for a car per adult, not for a smaller, closer-living population with automated, shared vehicles. Sure? Fairly: that some route runs here is likely; its form is a guess.",
  ghost: "<b>The faint lines are today's roads.</b> Most of them are gone in 3026. A subdivision street exists to reach houses; when the houses go, nothing keeps the street. Asphalt left alone cracks within years, trees root in the cracks within decades, and within a century or two only a line of rubble under the leaf litter, and maybe a row of the old street trees, shows where it ran. Archaeologists today find Roman and medieval roads the same way.",
  forest: "<b>Where the houses were.</b> Here stood one of Glen Carbon's subdivisions, built between the 1970s and 2010s. A wood-frame house left empty loses its roof to leaks in 10 to 20 years and falls in within about 50; saplings take the yards at once (as they have in parts of Detroit, and round Chernobyl since 1986). Five or more centuries on, this is old forest: oak and hickory, sugar maple, and, in a climate like today's north Texas, southern trees such as sweetgum and shortleaf pine. What remains of the houses: concrete foundations and slab edges, a few centimetres proud of the soil, under the leaves. Why were they left? Fewer people (see the village sign), and the cost of keeping up many kilometres of street, pipe and wire for each house, drew people into the towns over a century or two. Sure? This is the most uncertain guess of all: a richer, growing future would rebuild here.",
  bottom: "<b>The American Bottom.</b> The flat land below the bluff is the floodplain of the Mississippi, 175 km long. Today levees hold the river off farms, Granite City and East St. Louis. With summers some 4 degrees C hotter, heavier rain and bigger floods, and fewer people to pay for the levees, the guess here is that much of the Bottom has been let go back to the river: wetland, bottomland forest of cottonwood, sycamore and silver maple, with fields on the higher ground. A thousand years ago the Bottom held Cahokia, the largest city north of Mexico, about 15,000 people in about 1100; its Monks Mound still rises 12 km south-west of here.",
  village: "<b>Glen Carbon, 3026: a station village.</b> It began as a coal-mining town in the 1890s, in the valley of Judy's Branch, on the railway; in 3026 the railway is what keeps it: a stop on the line up the valley. About 1,500 people live in two- to four-storey houses round a square, with a school, a clinic, workshops and a market. How many people, and why: the world's population is expected to peak around 2085 at about 10.3 billion (UN, 2024) and then fall, as birth rates have fallen almost everywhere; rates as low as today's (about 1.6 children per woman in the US) could not last a thousand years, or there would be almost no one left, so the guess is that they settle near replacement: 3 to 6 billion people in 3026. Round here, perhaps 25,000 in all (about half today's), nearly all in the university town, Edwardsville and villages like this one.",
  town: "<b>The university town.</b> Universities are among the longest-lived institutions people have made: Bologna's has taught since 1088, Oxford's since about 1096. SIUE (founded 1957) is the guess for what this area's town grows round, with the old county seat, Edwardsville (1812), 4 km north-east. Its buildings would not be today's; they would have been rebuilt many times. Built for a hotter climate: blocks of three to six floors round shaded courtyards, thick pale walls of stone, rammed earth and long-lived concrete, narrow streets the buildings shade, green and solar roofs. Life: shorter working hours for most (machines doing most of the farming, building and carrying), study, care, craft, research. That part is the hardest to guess.",
  rail: "<b>The interstate is a railway.</b> I-270's embankments and cuttings are the largest earthworks here after the bluff itself, and the right of way runs straight across the region: it would be used, not abandoned. Electric trains carry people and freight; the long-haul trucks and private cars it was built for are gone. Roads become railways and railways become trails all the time; the Heritage Trail through Glen Carbon is an old railway grade.",
  field: "<b>Fields on the old survey lines.</b> In the early 1800s the federal survey divided Illinois into square miles, and those into 40-acre quarter-quarters; roads, fences and farms still follow it. Property lines last for centuries, so the fields of 3026 do too. The uplands' prairie soils are among the best farmland in the world and would still be farmed, by machines: less corn for fuel and feed than today, more perennial grains, beans and orchards, some fields under solar panels. Hedgerows of trees along the field lines shade the crops in the heat.",
  climate: "<b>The climate of 3026.</b> Today's policies lead to about 2.5 to 3 degrees C of warming by 2100 (UN Environment Programme, 2023), and carbon dioxide stays in the air for centuries, so a thousand years on it is still about that warm, and land warms more than the oceans. Summers here would be like Dallas's today: highs of about 36 degrees C (97 F) in July, nights about 26 C; winters mild, snow rare; heavier rain and bigger floods. That is why the buildings have thick walls and the streets are shaded. The sea rises for centuries too, but this is 130 m above it.",
  cemetery: "<b>An old cemetery.</b> Cemeteries are among the things that last: many in Europe have been in use or kept for a thousand years. This one is a grove now, the oldest trees in the area round stones too weathered to read.",
  cahokia: "<b>A thousand years ago, and a thousand years on.</b> In 1026 Cahokia, 12 km south-west of here, was growing into a city of 10,000 to 20,000, with plazas and earthen mounds; Monks Mound covers 6 hectares and stands 30 m high. By 1400 the city was empty, but the mounds are still here. What of ours lasts as long? Earthworks (the interstate embankments), concrete foundations, cemeteries, stone, road lines, place names, and institutions like universities. Wooden houses, asphalt and most of what fills a suburb do not." };
const TAGS = [];
function tagTex(title, sub) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(12,20,16,0.75)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.strokeStyle = "rgba(200,230,180,0.6)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = "#e8f4d8"; g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillText(title, 22, 54, 470); g.fillStyle = "#cce0c0"; g.font = "28px -apple-system, Helvetica, sans-serif"; g.fillText(sub, 22, 100, 470); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function tag(get, title, subF, info, far = false) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, ""), depthTest: false, depthWrite: false, transparent: true, toneMapped: false, fog: false })); sp.center.set(0.5, 0); sp.renderOrder = 30; scene.add(sp); const T = { sp, get, title, subF, info, far, last: "" }; TAGS.push(T); return T; }
const fmtKm = d => d < 1000 ? Math.round(d) + " m" : (d / 1000).toFixed(d < 10000 ? 1 : 0) + " km";
const W3 = (x, y, z) => V3(x - ME.x0, y, z - ME.z0);
// a sign post: a board on a post, and its label
const POSTM = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.8 }), BOARDM = new THREE.MeshStandardMaterial({ color: 0x2a4a32, roughness: 0.6 });
function signPost(x, z, title, key) { const g = new THREE.Group(), y = land(x, z); const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), POSTM); p.position.y = 0.7; g.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), BOARDM); b.position.y = 1.5; b.rotation.x = -0.3; g.add(b); g.position.set(x, y, z); WORLD.add(g);
  tag(() => W3(x, y + 2.0, z), "ⓘ " + title, () => "", INFO[key]); }
function buildSigns() { const s157 = KEPT.r157[0]; let best = s157[0], bd = 1e9; for (const p of s157) { const d = Math.hypot(p[0], p[1]); if (d < bd) { bd = d; best = p; } }
  signPost(10, 6, "Route 157, 3026", "start"); signPost(best[0] + 12, best[1] - 30, "Why 157 is still here", "r157"); signPost(-18, 10, "The American Bottom", "bottom"); signPost(-14, -8, "The climate of 3026", "climate"); signPost(-20, 24, "A thousand years ago", "cahokia");
  // into the forest east of the crossroads, by the first ghost street
  let fx = 120, fz = -60; for (let k = 0; k < 400; k++) { const x = 60 + hash(k, 1) * 400, z = -200 + hash(k, 2) * 400; if (coverAt(x, z) === C.FOREST && !nearRoad(x, z, 4)) { fx = x; fz = z; break; } } signPost(fx, fz, "Where the houses were", "forest"); signPost(fx + 8, fz + 6, "The faint lines", "ghost");
  const V = PLACES[2], T = PLACES[0]; signPost(V.x + 10, V.z + 8, "Glen Carbon, 3026", "village"); signPost(T.x, T.z + 30, "The university town", "town");
  const RL = KEPT.rail[0] || KEPT.i270[0]; if (RL) { let rb = RL[0], rd = 1e9; for (const p of RL) { const d = Math.hypot(p[0] - V.x, p[1] - V.z); if (d < rd) { rd = d; rb = p; } } signPost(rb[0] + 10, rb[1] + 10, "The railway", "rail"); }
  const I = KEPT.i270[0]; if (I) { let rb = I[0], rd = 1e9; for (const p of I) { const d = Math.hypot(p[0], p[1]); if (d < rd) { rd = d; rb = p; } } signPost(rb[0] + 14, rb[1] + 14, "The interstate is a railway", "rail"); }
  for (let k = 0; k < 3000; k++) { const x = (hash(k, 11) - 0.5) * 6000, z = (hash(k, 12) - 0.5) * 6000; if (coverAt(x, z) === C.FIELD && Math.hypot(x, z) > 600 && !nearRoad(x, z, 5)) { signPost(x, z, "Fields on the survey lines", "field"); break; } }
  for (const [n, kind, x, z] of OSM_NAMES) if (kind === "cemetery" && Math.hypot(x, z) < 6000) signPost(x, z, n, "cemetery");
  tag(() => W3(SITE.ARCH[0], SITE.ARCH[2] + 260, SITE.ARCH[1]), "The Gateway Arch, St. Louis", () => "21 km · 192 m high", "<b>The Gateway Arch</b> (1965), 192 m of stainless steel over concrete: kept up as a monument, like the Eiffel Tower, it could stand a thousand years. The city round it is still a city (cities on great rivers last); its skyline here is a guess.", true);
  tag(() => W3(SITE.MONKS[0], SITE.MONKS[2] + 60, SITE.MONKS[1]), "Monks Mound, Cahokia", () => "12 km · raised about 1050", INFO.cahokia, true);
  PLACES.forEach((P, i) => { if (i < 3) tag(() => W3(P.x, land(P.x, P.z) + 40, P.z), P.name, () => "", i === 2 ? INFO.village : INFO.town, true); }); }
const _cp = V3(0, 0, 0), _cd = V3(0, 0, 0);
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const p = T.get(), d = p.distanceTo(_cp); T.sp.visible = tagsOn && d > 1.5 && d < (T.far ? 40000 : 60); if (!T.sp.visible) continue; T.sp.position.copy(p); const w = clampN(d * 0.1, 0.5, 2500); T.sp.scale.set(w, w / 4, 1);
    const sub = T.subF() + " · " + fmtKm(d); if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.12; for (const T of TAGS) { if (!T.sp.visible) continue; const a = T.sp.position.clone().sub(_cp).normalize().angleTo(_cd); if (a < ba) { ba = a; best = T; } } return best; }

// ---------- you: walking, the pods, the readout ----------
const keys = {}, prevB = {}; let yaw = Math.PI / 2, pitch = -0.02, vrYaw = yaw, started = false, seated = false, hud = true, msgT = 0, msgAge = 0, tagsOn = true, ready = false, factI = -1, ride = null;
const RATES = [[1, "real time"], [60, "a minute a second"], [600, "ten minutes a second"]];
const FACTS = ["start", "r157", "ghost", "forest", "bottom", "village", "town", "rail", "field", "climate", "cahokia"].map(k => INFO[k]);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:720px;z-index:2;background:rgba(14,22,16,.88);color:#eef6e4;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(14,22,16,.74);color:#eef6e4;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false, fog: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(14,22,16,0.92)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#eef6e4"; g.font = "26px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 44; for (const w of words) { if (g.measureText(line + w).width > 965) { g.fillText(line, 28, y); line = ""; y += 31; if (y > 500) break; } line += w + " "; } if (y <= 500) g.fillText(line, 28, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
const wristT = (() => { const c = document.createElement("canvas"); c.width = 640; c.height = 512; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t; })(), wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), new THREE.MeshBasicMaterial({ map: wristT, transparent: true, toneMapped: false, fog: false }));
wrist.visible = false; wrist.position.set(0, 0.06, 0.1); wrist.rotation.x = -1.1; wrist.renderOrder = 98;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
function drawWrist(lines) { const g = wristT.userData.c.getContext("2d"); g.clearRect(0, 0, 640, 512); g.fillStyle = "rgba(14,22,16,0.88)"; g.beginPath(); g.roundRect(0, 0, 640, 512, 24); g.fill(); g.font = "24px sans-serif"; let y = 36;
  for (const ln of lines) { g.fillStyle = /^<b>/.test(ln) ? "#d8f0c0" : "#eef6e4"; const t = ln.replace(/<[^>]+>/g, ""), words = t.split(" "); let line = ""; for (const w of words) { if (g.measureText(line + w).width > 600) { g.fillText(line, 18, y); y += 29; line = ""; } line += w + " "; } g.fillText(line, 18, y); y += 31; if (y > 500) break; } wristT.needsUpdate = true; }
// pod stops: at the crossroads, in the village and in the university town
const STOPS = [];
function buildStops() { const L = KEPT.r157[0], idx = (P, x, z) => { let bi = 0, bd = 1e9; P.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; bi = i; } }); return bi; }, T = PLACES[0], V = PLACES[2];
  const i0 = idx(L, 0, 0), iT = idx(L, T.x, T.z), north = i0 < iT ? L.slice(i0, iT + 1) : L.slice(iT, i0 + 1).reverse(), R = KEPT.route;
  const stop = (x, z, name, path, dest) => { const sh = new THREE.Group(), y = land(x, z); const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2), new THREE.MeshStandardMaterial({ color: 0x2a3a4a, metalness: 0.4 })); roof.position.y = 2.6; sh.add(roof); for (const dx of [-1.4, 1.4]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), POSTM); p.position.set(dx, 1.3, -0.8); sh.add(p); }
    sh.position.set(x, y, z); WORLD.add(sh); STOPS.push({ x, z, name, path, cum: cumOf(path), dest }); tag(() => W3(x, y + 3.2, z), "Pod stop: " + name, () => "E to ride", "<b>Pod stop.</b> Small automated electric pods run along Route 157 and the village road. Press E beside the stop to ride.", false); };
  const side = (P, i, d) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [P[i][0] - dz / l * d, P[i][1] + dx / l * d]; };
  let [sx, sz] = side(north, 2, -9); stop(sx, sz, "to the university town (north, 4 km)", north, "the university town");
  [sx, sz] = side(R, 2, 9); stop(sx, sz, "to Glen Carbon village (5.5 km)", R, "Glen Carbon village");
  [sx, sz] = side(north, north.length - 3, -9); stop(sx, sz, "back to the Chain of Rocks crossroads", north.slice().reverse(), "the crossroads");
  [sx, sz] = side(R, R.length - 3, 9); stop(sx, sz, "back to the Chain of Rocks crossroads", R.slice().reverse(), "the crossroads"); }
const RIDEPOD = (() => { const g = podGeo(); g.visible = false; return g; })();
function nearStop() { for (const S of STOPS) if (Math.hypot(ME.x - S.x, ME.z - S.z) < 7) return S; return null; }
function act() { if (ride) return; const S = nearStop(); if (S) { ride = { S, s: 0, v: 0 }; RIDEPOD.visible = true; say(`<b>The pod</b> to ${S.dest}: an automated electric two-seater, 50 km/h on Route 157, sped up four times here. Look about.`, 10); return; }
  const T = tagsOn ? lookedAt() : null; if (T && T.info) { say(T.info, 60); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 60); }
function updateRide(dt) { const R = ride, Lt = R.S.cum[R.S.cum.length - 1], sdt = dt * 4, left = Lt - R.s; R.v = Math.min(14, R.v + 2 * sdt, Math.sqrt(2 * 2 * Math.max(0, left)) + 0.3); R.s += R.v * sdt;
  const [x, z, dx, dz] = along(R.S.path, R.S.cum, R.s), ln = Math.hypot(dx, dz) || 1, ox = x - dz / ln * 1.6, oz = z + dx / ln * 1.6; ME.x = ox; ME.z = oz; ME.y = land(ox, oz) + 0.1; RIDEPOD.position.set(ox - ME.x0, ME.y, oz - ME.z0); RIDEPOD.rotation.y = Math.atan2(-dx, -dz);
  if (R.s >= Lt - 0.5) { ride = null; RIDEPOD.visible = false; ME.x = ox + dz / ln * 4; ME.z = oz - dx / ln * 4; ME.y = land(ME.x, ME.z); say(`<b>${R.S.dest.replace(/^./, c => c.toUpperCase())}.</b> The pod stop for the way back is here. E beside it to ride.`, 10); } }
function toStart() { ME.x = 4; ME.z = 2; ME.y = land(4, 2); ME.vx = ME.vz = ME.vy = 0; }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${RATES[rateI][1]}.`, 5); }
function toggleSeated() { seated = !seated; say(seated ? "<b>Sitting mode</b>: your view is raised about 45 cm." : "<b>Standing mode</b>.", 6); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyT") setRate(rateI + 1); if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyR") { ride = null; RIDEPOD.visible = false; toStart(); } if (e.code === "KeyG" && GHOST) { GHOST.visible = !GHOST.visible; say(GHOST.visible ? "Today's roads shown as faint lines." : "Today's roads hidden.", 4); } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function start() { if (started || !ready) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block"; say(INFO.start, 45); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { if (!ready) return; const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });
function placeName() { for (let i = 0; i < 4; i++) { const P = PLACES[i]; if (Math.hypot(ME.x - P.x, ME.z - P.z) < P.r) return P.name; } const cv = coverAt(ME.x, ME.z);
  if (land(ME.x, ME.z) < 134 && ME.x < 2500) return "the American Bottom"; if (nearRoad(ME.x, ME.z, 4)) return "on the road"; for (const L of OSM_LAND) if (L[0] === "residential" && L[1]) { const p = L[2]; if (Math.abs(p[0] - ME.x) < 1500 && Math.abs(p[1] - ME.z) < 1500 && pip(ME.x, ME.z, p)) return `forest where the ${L[1]} subdivision stood`; }
  return cv === C.FOREST ? "forest" : cv === C.FIELD ? "farmland" : cv === C.MEADOW ? "meadow" : cv === C.WET ? "wetland" : "Glen Carbon"; }

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0;
Promise.all([loadDem(DEM14), loadDem(DEM11)]).then(([a, b]) => { DEM.d14 = a; DEM.d11 = b; buildCover(); buildRoads(); buildTown(); buildWater(); buildFar(); buildMovers(); buildStops(); buildSigns(); toStart(); ME.x0 = ME.x; ME.z0 = ME.z; setNoiseOrigin(ME.x0, ME.z0); WORLD.position.set(-ME.x0, 0, -ME.z0); updateGround(true); fillTrees(); fillRuins(); ready = true;
  const card = document.querySelector("#intro .dim"); if (card) card.textContent = card.textContent.replace("Loading the ground…", "Click to begin."); });
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; T += dt; frameN++; if (!ready) { renderer.render(scene, camera); return; } if (started) tHour = (tHour + dt * RATES[rateI][0] / 3600) % 24;
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) tagsOn = !tagsOn; prevB.x = bX; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setRate(rateI + 1); prevB.y = bY; const bS = gp.buttons[3]?.pressed; if (bS && !prevB.st) toggleSeated(); prevB.st = bS; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed, tr = gp.buttons[0]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; if (tr && !prevB.tr) act(); prevB.tr = tr; if (bB && !prevB.b) jump = true; prevB.b = bB; const bR = gp.buttons[3]?.pressed; if (bR && !prevB.rs && GHOST) GHOST.visible = !GHOST.visible; prevB.rs = bR; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  if (ride && started) updateRide(dt);
  else { const gY = land(ME.x, ME.z), onGround = ME.y <= gY + 0.03; if (started && onGround) { if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = run ? 6 : 2.0, k = 1 - Math.exp(-dt * 8); ME.vx += ((f.x * -my + sd.x * mx) * sp - ME.vx) * k; ME.vz += ((f.z * -my + sd.z * mx) * sp - ME.vz) * k; } else { const k = 1 - Math.exp(-dt * 8); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; } if (jump) ME.vy = 3.5; }
    ME.vy -= G_E * dt; const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; if (inTown(ME.x, ME.z)) { ME.x = ox; ME.z = oz; } const gN = land(ME.x, ME.z); if (ME.y < gN) { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } }
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 2000) { ME.x0 = ME.x; ME.z0 = ME.z; setNoiseOrigin(ME.x0, ME.z0); updateGround(true); fillTrees(); fillRuins(); } else { updateGround(); if (Math.hypot(ME.x - treeC[0], ME.z - treeC[1]) > 25) fillTrees(); if (Math.hypot(ME.x - ruinC[0], ME.z - ruinC[1]) > 40) fillRuins(); }
  WORLD.position.set(-ME.x0, 0, -ME.z0);
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x - ME.x0, ME.y + lift + (ride ? 0.4 : 0), ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, ride ? 1.25 : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  const s = updateSky(); wallU.night.value = 1 - sstep(s.y, -0.05, 0.1); SKY.position.copy(rig.position); sunL.position.copy(rig.position).addScaledVector(s, 300); sunL.target.position.copy(rig.position);
  updateMovers(dt); updateTags();
  if (frameN % 10 === 0) { const [lat, lon] = toLL(ME.x, ME.z), hh = Math.floor(tHour), mm = Math.floor((tHour % 1) * 60), tc = 31 + 5 * Math.cos((tHour - 16) / 24 * 2 * Math.PI), tf = Math.round(tc * 9 / 5 + 32);
    const lines = [`<b>${placeName()}</b>`, `Glen Carbon, Illinois · ${lat.toFixed(4)}° N, ${Math.abs(lon).toFixed(4)}° W · ${Math.round(land(ME.x, ME.z))} m`, `Saturday 15 July 3026, ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} · ${Math.round(tc)} °C (${tf} °F) · time ${RATES[rateI][1]}`, ride ? "<b>riding a pod</b>" : "one best guess at 3026 (signs explain why)"];
    if (hud) HUD.innerHTML = lines.join("<br>"); if (vr && frameN % 30 === 0) drawWrist(lines); }
  wrist.visible = vr && hud && started; HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });

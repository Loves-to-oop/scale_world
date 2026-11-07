// betelgeuse.js -- Betelgeuse, the red supergiant in Orion, seen from the glass cupola of a ship parked 30 AU from it, on the side
// facing the Sun, with the sky as it really is from there (betelgeuse_sky.js: every star brighter than magnitude 6.8, recomputed
// from the AT-HYG catalogue for a point 168 pc from the Sun). Betelgeuse: about 760 times the Sun's radius (3.55 AU), 3,600 K,
// about 126,000 times the Sun's light, about 18 times its mass; a surface of a few giant convection cells, an uneven edge, an extended
// molecular atmosphere, clumps of dust forming farther out; a pulsation of about 416 days; and a probable small companion (Siwarha,
// reported in 2025) orbiting inside its outer atmosphere every 5.8 years. What is measured, what is estimated and what is drawn as
// typical is said in the panel. Built into betelgeuse.html by build.py (after betelgeuse_sky.js).
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 30000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; if (draw) draw(c.getContext("2d"), w, h); return t; };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (v, d = 2) => { const a = Math.abs(v); if (a >= 1e5 || (a < 1e-3 && a > 0)) { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(d) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, x => "⁰¹²³⁴⁵⁶⁷⁸⁹"[x]); } return a >= 100 ? Math.round(v).toLocaleString() : v.toFixed(d); };

// ---------- the numbers ----------
// Radius: 640 to 1,000 solar radii in the literature; 764 (Joyce et al. 2020, from its pulsations) is used. Distance from the Sun:
// 168 pc (548 light-years; same source). Temperature about 3,600 K. Luminosity about 90,000 to 150,000 Suns. Mass now about 16 to 19
// Suns. Main pulsation about 400 to 420 days; a 2,100-day "long secondary period", explained in 2024 by a companion, which images
// from the Gemini telescope in 2025 probably revealed: Siwarha, about the Sun's mass, orbiting about 8.7 AU from Betelgeuse's centre.
const RSUN_AU = 0.0046505, R_B = 764 * RSUN_AU, D_SHIP = 30, L_B = 126000, T_B = 3600, M_B = 18, P_PULSE = 416, P_COMP = 2110, A_COMP = Math.cbrt((M_B + 1) * (P_COMP / 365.25) ** 2);
const FAKE = 5000, SKY_R = 9000, BD = V3(...B_DIR).normalize();
const SUNLIGHT = L_B / D_SHIP ** 2;

// ---------- the sky: the stars as seen from Betelgeuse, and the Milky Way ----------
const bvTemp = bv => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
// the colour of a blackbody of temperature T as the eye sees it in daylight (Tanner Helland's fit to the CIE colours), in linear RGB
function bbRGB(T) { const t = T / 100, r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332, g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * (t - 60) ** -0.0755, b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.0;
  return [r, g, b].map(v => (Math.max(0, Math.min(255, v)) / 255) ** 2.2); }
const skyG = new THREE.Group(); scene.add(skyG); const SKY_DIM = { value: 1 };
{ const pos = new Float32Array(SKY_N * 3), col = new Float32Array(SKY_N * 3), size = new Float32Array(SKY_N);
  for (let i = 0; i < SKY_N; i++) { const m = SKY[i * 5], bv = SKY[i * 5 + 4]; pos.set([SKY[i * 5 + 1] * SKY_R, SKY[i * 5 + 2] * SKY_R, SKY[i * 5 + 3] * SKY_R], i * 3); const f = 10 ** (-0.4 * (m - 6.5)), c = bbRGB(bvTemp(Math.max(-0.4, Math.min(2, bv))));
    col.set(c.map(v => v * Math.min(1, 0.25 + 0.75 * Math.sqrt(f) / 4)), i * 3); size[i] = Math.min(14, 1.6 + 1.2 * Math.sqrt(f)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { px: { value: renderer.getPixelRatio() }, dim: SKY_DIM }, vertexShader: "attribute float size; attribute vec3 color; varying vec3 vC; uniform float px, dim; void main(){ vC = color * dim; gl_PointSize = size * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float a = exp(-r * r * 5.0); if (a < 0.02) discard; gl_FragColor = vec4(vC * a, a); }", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = -5; skyG.add(pts); }
// the Milky Way: a soft band along the galactic plane, brighter toward the galactic centre (in Sagittarius), with dark lanes. From
// 548 light-years away it looks almost as it does from Earth: the galaxy is 100,000 light-years across.
{ const eq = (ra, dec) => { ra *= Math.PI / 180; dec *= Math.PI / 180; const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec); return V3(x, z, -y); };
  const gnp = eq(192.85948, 27.12825), gc = eq(266.405, -28.936);
  const mw = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.02, 64, 32), new THREE.ShaderMaterial({ uniforms: { gnp: { value: gnp }, gc: { value: gc }, dim: SKY_DIM }, side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 gnp, gc; uniform float dim; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ vec3 d = normalize(vD); float b = asin(clamp(dot(d, gnp), -1.0, 1.0)); vec3 e1 = normalize(gc - gnp * dot(gc, gnp)), e2 = cross(gnp, e1); float l = atan(dot(d, e2), dot(d, e1));
        float bulge = exp(-l * l / 0.35), w = 0.09 + 0.10 * bulge, band = exp(-b * b / (w * w)) * (0.35 + 0.65 * bulge + 0.25 * cos(l));
        float lane = smoothstep(0.35, 0.75, n3(d * 9.0) * 0.6 + n3(d * 23.0) * 0.4) * exp(-b * b / (0.03 * 0.03)); float c = band * (0.75 + 0.5 * n3(d * 40.0)) * (1.0 - 0.7 * lane);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.85) * c * 0.06 * dim, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })); mw.renderOrder = -10; skyG.add(mw); }

// ---------- Betelgeuse ----------
// Its visible surface (where the gas turns opaque) is not a crisp, round ball. Simulations and interferometer images show a few
// enormous convection cells, each a good fraction of the star's width, rising and sinking over months to years, with smaller cells
// between; an outline a few per cent out of round; and strong darkening and reddening toward the edge. The pattern here is typical,
// not a map of the real star. Colours: the blackbody colour of a temperature 8% lower, since titanium oxide in the cool atmosphere
// absorbs green and blue light and makes the star redder than its temperature alone (its measured colour, B-V = 1.85, matches about
// 3,300 K); brightness from the true temperature (3,600 K: 0.15 times the Sun's, area for area). The visible surface (photosphere)
// of a red supergiant is not crisp like the Sun's: the gas there is about a millionth as dense as air (a rough vacuum) and the opaque layer is deep
// and ragged, so the edge fades out gradually into the molecular atmosphere (the soft limb below).
const NOISE = `vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
  float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h3(i).x, h3(i + vec3(1,0,0)).x, f.x), mix(h3(i + vec3(0,1,0)).x, h3(i + vec3(1,1,0)).x, f.x), f.y), mix(mix(h3(i + vec3(0,0,1)).x, h3(i + vec3(1,0,1)).x, f.x), mix(h3(i + vec3(0,1,1)).x, h3(i + vec3(1,1,1)).x, f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  vec3 worley(vec3 p, float t){ vec3 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0, id = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = vec3(float(x), float(y), float(z)), o = h3(i + g); o = 0.5 + 0.45 * sin(t * (0.6 + o * 0.8) + 6.2831 * o); float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = dot(i + g, vec3(1.0, 57.0, 113.0)); } else if (d < d2) d2 = d; } return vec3(d1, d2, id); }`;
const starMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, bright: { value: 1 } },
  vertexShader: `uniform float t; varying vec3 vP; varying vec3 vNv; varying vec3 vWp; ${NOISE}
    void main(){ vec3 n = normalize(position); float bump = 0.035 * (fbm(n * 1.6 + vec3(0.0, 0.0, t * 0.05)) - 0.5) * 2.0; vec3 p = position * (1.0 + bump); vP = n; vNv = normalize(normalMatrix * n); vec4 w = modelMatrix * vec4(p, 1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float t, bright; varying vec3 vP; varying vec3 vNv; varying vec3 vWp; ${NOISE}
    vec3 bb(float T){ float t = T * 0.92 / 100.0; vec3 c = vec3(255.0, 99.47 * log(t) - 161.1, t <= 19.0 ? 0.0 : 138.5 * log(t - 10.0) - 305.0); return pow(clamp(c / 255.0, 0.0, 1.0), vec3(2.2)) * pow(T / 3600.0, 4.0); }
    void main(){ vec3 p = normalize(vP); vec3 q = p + 0.18 * vec3(fbm(p * 3.0 + t * 0.1), fbm(p * 3.0 + 7.1), fbm(p * 3.0 + 13.3)) - 0.09; vec3 w = worley(q * 0.95, t), w2 = worley(q * 3.0 + 3.1, t * 1.7);
      float big = smoothstep(0.0, 0.75, w.y - w.x), small = smoothstep(0.0, 0.5, w2.y - w2.x), cellT = fract(sin(w.z) * 43758.5);
      float T = 3050.0 + 650.0 * big * (0.5 + 0.9 * cellT) + 120.0 * small + 260.0 * (fbm(p * 6.0 + t * 0.15) - 0.5);
      vec3 V = normalize(cameraPosition - vWp); float mu = clamp(dot(normalize(vNv), normalize((viewMatrix * vec4(V, 0.0)).xyz)), 0.0, 1.0);
      float limb = 1.0 - 0.72 * (1.0 - mu) - 0.18 * (1.0 - mu) * (1.0 - mu); T *= 0.82 + 0.18 * pow(mu, 0.5);
      vec3 col = bb(T) * limb * bright * 1.35; gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const star = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 6), starMat); skyG.add(star);
// the extended atmosphere: molecules (water, carbon monoxide) and gas reaching out to about 1.5 times the radius. At 1,500-2,000 K
// it glows mostly in infrared; in visible light it is only a faint haze round the disc, drawn as a dim halo
const glowTex = canvasTex(512, 512, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, W * 0.2, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,110,45,0.22)"); r.addColorStop(0.18, "rgba(240,90,40,0.08)"); r.addColorStop(0.45, "rgba(200,70,35,0.02)"); r.addColorStop(1, "rgba(180,60,30,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(glow);
// the soft limb: a dark orange-red veil over the outermost 10% of the disc fading out to 1.2 radii, so the star has no hard edge
const limbTex = canvasTex(512, 512, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(150,40,15,0)"); r.addColorStop(0.74, "rgba(150,40,15,0)"); r.addColorStop(0.83, "rgba(140,38,14,0.55)"); r.addColorStop(0.9, "rgba(120,32,12,0.35)"); r.addColorStop(1, "rgba(100,28,10,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const limb = new THREE.Sprite(new THREE.SpriteMaterial({ map: limbTex, transparent: true, depthWrite: false })); limb.renderOrder = 3; skyG.add(limb);
// from far away, where the disc is small, its glare: Betelgeuse from 3,000 AU is still far brighter than any star
const bGlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(bGlare);
// dust: Betelgeuse sheds about a millionth of a Sun's mass a year; some of it cools into dust, in clumps a few to tens of stellar radii
// out (the Great Dimming of 2019-20 was such a cloud, in front of the star). The ship is 8.5 radii out, so clumps lie all round. Typical.
const dustTex = canvasTex(256, 256, (g, W) => { for (let i = 0; i < 70; i++) { const x = W / 2 + (hash(i, 1) - 0.5) * W * 0.5, y = W / 2 + (hash(i, 2) - 0.5) * W * 0.5, r = W * (0.08 + 0.14 * hash(i, 3)); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(255,255,255,0.10)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, W); } });
const DUST = []; for (let i = 0; i < 46; i++) { const u = hash(i, 11) * 2 - 1, ph = hash(i, 12) * Math.PI * 2, dir = V3(Math.sqrt(1 - u * u) * Math.cos(ph), u, Math.sqrt(1 - u * u) * Math.sin(ph)), r = R_B * (5 + 12 * hash(i, 13));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xc06a3a, transparent: true, depthWrite: false, opacity: 0 })); skyG.add(s); DUST.push({ s, off: dir.multiplyScalar(r), size: R_B * (1.2 + 2.5 * hash(i, 14)) }); }
// the companion, Siwarha: a young star of about the Sun's mass (still contracting toward the main sequence), seen 2025 by speckle
// imaging at Gemini North; its orbit's tilt is not known and is assumed here. Its light: a few Suns' worth, a brilliant point.
const compTex = canvasTex(128, 128, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,252,240,1)"); r.addColorStop(0.06, "rgba(255,248,230,1)"); r.addColorStop(0.14, "rgba(255,236,205,0.55)"); r.addColorStop(0.4, "rgba(255,215,170,0.12)"); r.addColorStop(1, "rgba(255,200,160,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const comp = new THREE.Sprite(new THREE.SpriteMaterial({ map: compTex, blending: THREE.AdditiveBlending, depthWrite: true, transparent: true })); skyG.add(comp);
const COMP_TILT = 0.9, COMP_NODE = 0.6;
// where things are: positions in AU in Betelgeuse's frame (centred on it); the ship is at SHIP. Each thing is drawn at a stand-in
// distance between 1.5 and 8 km from you that grows with the logarithm of its true distance (15 km to 10,000 AU), keeping its true
// direction and angular size, and keeping nearer things in front of farther ones.
const SHIP = BD.clone().multiplyScalar(-D_SHIP), fakeDist = d => 1500 + 6500 * THREE.MathUtils.clamp(Math.log10(d / 1e-7) / 11, 0, 1);
const place = (obj, sys, sizeAU) => { const rel = sys.clone().sub(SHIP), d = rel.length(), f = fakeDist(d); obj.position.copy(rel).multiplyScalar(f / d); if (sizeAU) obj.scale.setScalar(f * sizeAU / d); return d; };
const compPos = days => { const ca = 2 * Math.PI * days / P_COMP; return V3(Math.cos(ca) * A_COMP, 0, Math.sin(ca) * A_COMP).applyAxisAngle(V3(1, 0, 0), COMP_TILT).applyAxisAngle(V3(0, 1, 0), COMP_NODE); };
// Siwarha up close: a young star of about 2 solar radii and 5,500 K, its own glare round it
const R_COMP = 2 * RSUN_AU, compBall = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying vec3 vV; void main(){ float mu = max(dot(normalize(vN), normalize(vV)), 0.0); gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * (0.45 + 0.55 * mu) * 2.2, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" })); skyG.add(compBall);

// ---------- the plausible system ----------
// Nothing but the companion is known. Massive stars' disks are blown away by their ultraviolet light within a few million years, so
// planets near them are rare, and anything inside about 4 AU would since have been swallowed as the star swelled. But massive disks
// can also break up directly into giant planets and brown dwarfs far out, and icy bodies can fall in from a far comet belt. So: a
// young super-Jupiter at 120 AU, still glowing dull red from its own heat at 8 million years old, with a volcanic and an icy moon; an
// ice giant with rings at 350 AU, where the light equals sunlight at Earth; a brown dwarf at 900 AU, glowing orange from its heat;
// a comet falling in at 25 AU with tails stretched by Betelgeuse's light. All invented, all plausible; positions are illustrative.
const PN = V3(0.25, 1, 0.15).normalize(), PE1 = new THREE.Vector3().crossVectors(PN, V3(0, 0, 1)).normalize(), PE2 = new THREE.Vector3().crossVectors(PN, PE1);
const inPlane = (r, ang, lift = 0) => PE1.clone().multiplyScalar(r * Math.cos(ang)).add(PE2.clone().multiplyScalar(r * Math.sin(ang))).add(PN.clone().multiplyScalar(lift));
const PLANET_FS = `uniform vec3 L, lc, c1, c2, c3, glowC; uniform float I, bands, glowI, seed, rock; varying vec3 vN; varying vec3 vO; ${NOISE}
  void main(){ vec3 o = normalize(vO); float turb = fbm(o * 4.0 + seed) * 0.6, b = sin((o.y + turb * 0.15) * bands + seed) * 0.5 + 0.5; vec3 alb;
    if (rock > 0.5) { alb = mix(c1, c2, smoothstep(0.35, 0.7, fbm(o * 6.0 + seed))) * (0.7 + 0.6 * fbm(o * 20.0 + seed)); if (rock > 1.5) alb = mix(alb, vec3(0.08, 0.05, 0.03), smoothstep(0.7, 0.78, fbm(o * 9.0 + seed * 3.0))); }
    else alb = mix(mix(c1, c2, b), c3, smoothstep(0.55, 0.9, fbm(o * 3.0 + seed * 2.0)));
    float dl = max(dot(normalize(vN), L), 0.0); vec3 col = alb * lc * I * dl + glowC * glowI * (0.55 + 0.45 * (1.0 - b)) * (rock > 1.5 ? smoothstep(0.7, 0.78, fbm(o * 9.0 + seed * 3.0)) * 3.0 : 1.0);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const PLANET_VS = "varying vec3 vN; varying vec3 vO; void main(){ vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const dotTex = canvasTex(64, 64, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const BODIES = [];
function body(o) { const u = { L: { value: V3(1, 0, 0) }, lc: { value: new THREE.Color(1, 0.55, 0.3) }, I: { value: 1 }, c1: { value: new THREE.Color(...o.c1) }, c2: { value: new THREE.Color(...o.c2) }, c3: { value: new THREE.Color(...(o.c3 || o.c1)) }, glowC: { value: new THREE.Color(...(o.glowC || [0, 0, 0])) }, glowI: { value: o.glowI || 0 }, bands: { value: o.bands || 12 }, seed: { value: o.seed || 1 }, rock: { value: o.rock || 0 } };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ uniforms: u, vertexShader: PLANET_VS, fragmentShader: PLANET_FS })); mesh.rotation.z = o.tilt || 0.2; skyG.add(mesh);
  const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(dot);
  let ring = null; if (o.ring) { ring = new THREE.Mesh(new THREE.RingGeometry(o.ring[0], o.ring[1], 96, 1), new THREE.ShaderMaterial({ uniforms: { lc: u.lc, I: u.I, r0: { value: o.ring[0] }, r1: { value: o.ring[1] } }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform vec3 lc; uniform float I, r0, r1; varying vec2 vP; void main(){ float r = length(vP), f = (r - r0) / (r1 - r0); float a = (0.35 + 0.35 * sin(f * 60.0) * sin(f * 23.0)) * smoothstep(0.0, 0.05, f) * smoothstep(1.0, 0.9, f); gl_FragColor = vec4(vec3(0.85, 0.8, 0.72) * lc * I * 0.8, a * 0.8);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" }));
    ring.rotation.x = Math.PI / 2 - 0.35; mesh.add(ring); }
  const B = { ...o, mesh, dot, ring, u }; BODIES.push(B); return B; }
const RJ = 0.000477, RE = 4.26e-5;
const PB = body({ name: "Betelgeuse b", tag: "plausible", pos: () => inPlane(120, 2.35), R: 1.3 * RJ, c1: [0.78, 0.62, 0.44], c2: [0.55, 0.32, 0.2], c3: [0.92, 0.86, 0.72], bands: 18, glowC: [1.0, 0.22, 0.05], glowI: 0.05, seed: 3.1, info: "a young super-Jupiter, about 8 times Jupiter's mass, 120 AU out: banded clouds lit orange by Betelgeuse, and on its night side a dull red glow from its own heat (about 1,100 K), since at 8 million years old it is still contracting." });
const PB1 = body({ name: "b I", tag: "plausible", pos: () => PB.pos().add(inPlane(0.0042, 0.8)), R: 1.22e-5, c1: [0.86, 0.76, 0.36], c2: [0.7, 0.42, 0.16], rock: 2, glowC: [1.0, 0.35, 0.08], glowI: 0.25, seed: 7.7, info: "a volcanic moon the size of our Moon, kneaded by the giant's tides like Jupiter's Io: sulphur plains and glowing lava lakes." });
const PB2 = body({ name: "b II", tag: "plausible", pos: () => PB.pos().add(inPlane(0.0095, 3.9)), R: 1.1e-5, c1: [0.86, 0.89, 0.93], c2: [0.55, 0.5, 0.45], rock: 1, seed: 5.2, info: "an icy moon, cracked and bright." });
const PC = body({ name: "Betelgeuse c", tag: "plausible", pos: () => inPlane(350, 4.1, 12), R: 4 * RE, c1: [0.36, 0.62, 0.72], c2: [0.25, 0.46, 0.6], c3: [0.92, 0.96, 1.0], bands: 9, seed: 9.3, ring: [1.7, 2.6], tilt: 0.45, info: "an ice giant of about 18 Earth masses with rings, 350 AU out, where Betelgeuse's light equals the Sun's at Earth: its clouds are water clouds. Young, and under a sun 0.6° across that flickers over the years." });
const PD = body({ name: "a brown dwarf", tag: "plausible", pos: () => inPlane(900, 0.7, -40), R: 1.03 * RJ, c1: [0.12, 0.05, 0.03], c2: [0.06, 0.02, 0.01], bands: 24, glowC: [0.9, 0.22, 0.05], glowI: 0.75, seed: 4.4, info: "a brown dwarf of about 30 Jupiter masses, 900 AU out: too small to fuse hydrogen, glowing orange-red from the heat of its contraction (about 1,800 K)." });
// the comet: a nucleus ~10 km across falling in at 25 AU; its dust tail (curving, yellowish) and ion tail (straight, blue) point away
// from Betelgeuse, hundreds of millions of km long in its enormous light
const CN = () => inPlane(25, 1.15, 6), COMA = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff0dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(COMA);
const TAILS = []; for (const [kind, n, len, col] of [["dust", 220, 0.7, 0xffe2b8], ["ion", 200, 1.6, 0x8ab8ff]]) for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); skyG.add(sp); TAILS.push({ sp, kind, f: (i + 1) / n, len }); }
const tailDir = () => CN().normalize();

// ---------- where to go ----------
// The ship flies by a 1 g drive: speeding up at one Earth gravity to the midpoint, then slowing; the trip's real duration is given,
// and it is shown speeded up. (Faster than such trips would really take: a 1 g drive is far beyond any rocket today.)
const viewNear = (B, k, ang = 0.95) => () => { const P = B.pos(), toStar = P.clone().negate().normalize(), side = new THREE.Vector3().crossVectors(toStar, PN).normalize(); return P.clone().add(toStar.applyAxisAngle(side, ang).multiplyScalar(k * B.R)); };
const DESTS = [
  { name: "30 AU from Betelgeuse (start)", pos: () => BD.clone().multiplyScalar(-D_SHIP), look: () => V3(0, 0, 0) },
  { name: "Siwarha, inside the outer atmosphere", pos: () => { const c = compPos(tSec / 86400), side = new THREE.Vector3().crossVectors(c, PN).normalize(); return c.clone().add(side.multiplyScalar(0.12)).add(c.clone().normalize().multiplyScalar(0.05)); }, look: () => compPos(tSec / 86400) },
  { name: "Close to Betelgeuse: 6 AU from its centre", pos: () => BD.clone().multiplyScalar(-6).applyAxisAngle(PN, 0.3), look: () => V3(0, 0, 0) },
  { name: "The comet, 25 AU out", pos: () => { const c = CN(), side = new THREE.Vector3().crossVectors(c, PN).normalize(); return c.clone().add(side.multiplyScalar(0.25)).add(c.clone().normalize().multiplyScalar(0.2)); }, look: () => CN().add(tailDir().multiplyScalar(0.35)) },
  { name: "Betelgeuse b, a young super-Jupiter (120 AU)", pos: viewNear(PB, 4.5), look: () => PB.pos() },
  { name: "b I, its volcanic moon", pos: viewNear(PB1, 5, 0.6), look: () => PB1.pos() },
  { name: "Betelgeuse c, a ringed ice giant (350 AU)", pos: viewNear(PC, 5.5, 0.7), look: () => PC.pos() },
  { name: "A brown dwarf (900 AU)", pos: viewNear(PD, 4.5, 1.6), look: () => PD.pos() },
  { name: "The comet belt, 3,000 AU out", pos: () => BD.clone().multiplyScalar(-3000).applyAxisAngle(PN, 0.5), look: () => V3(0, 0, 0) }];
let destI = 0; const TRAVEL = { on: false };
const AU_M = 1.496e11, fmtDays = s => s < 3 * 86400 ? (s / 3600).toFixed(0) + " hours" : (s / 86400).toFixed(0) + " days";
function goTo(i) { if (TRAVEL.on || i === destI) return; const D = DESTS[i], to = D.pos(), dist = to.distanceTo(SHIP), t1g = 2 * Math.sqrt(dist * AU_M / 9.81), vmax = 9.81 * t1g / 2;
  Object.assign(TRAVEL, { on: true, from: SHIP.clone(), to, dist, rmin: Math.max(1e-5, to.distanceTo(D.look())), b: 0, st: 0, stage: "out1", flipped: false, tau: 0, T: 14 + 6 * Math.log10(1 + dist * 100), t1g, vmax, i }); destI = i; drawConsole();
  say(`Setting off for ${D.name}: ${fmtD(dist)}. The ship turns its nose toward it (a slow maneuver of many minutes, skipped), then burns at 1 g: halfway, it turns round and burns to slow down. The trip takes ${fmtDays(t1g)}, at up to ${(vmax / 2.998e8 * 100).toFixed(vmax < 3e6 ? 2 : 1)}% of the speed of light; shown in about ${Math.round(TRAVEL.T + 4)} seconds.`); }
// the ship's attitude. Its own "up" (+y) runs along its spine toward the nose: under thrust that is up for the crew. The observation
// sphere looks out to the ship's +x side. Parked, the ship holds the thing you came to see 30° above the sphere's horizon on that side;
// under thrust, its nose (and so the zenith) points along the thrust.
function viewQuat(dir, el = 0.52) { const t = dir.clone().normalize(), wu = Math.abs(t.y) > 0.95 ? V3(1, 0, 0) : V3(0, 1, 0), y0 = wu.clone().sub(t.clone().multiplyScalar(t.dot(wu))).normalize();
  const X = t.clone().multiplyScalar(Math.cos(el)).sub(y0.clone().multiplyScalar(Math.sin(el))), Y = t.clone().multiplyScalar(Math.sin(el)).add(y0.clone().multiplyScalar(Math.cos(el))), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
function thrustQuat(dir) { const Y = dir.clone().normalize(), wu = Math.abs(Y.y) > 0.95 ? V3(1, 0, 0) : V3(0, 1, 0), X = new THREE.Vector3().crossVectors(wu, Y).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }

// ---------- the ship: an observation sphere on the side of a long spine ----------
// A ship that could carry people here would need an antimatter or advanced fusion drive (even at a steady 1 g, the 548 light-years
// from the Sun would take its crew about 12.7 years, while 550 passed on Earth). Such designs share a shape: a long spine with the crew
// far from the engine; a shadow shield between them against its radiation; huge radiators for its waste heat; propellant tanks; a
// shield at the nose against interstellar dust. You are in a glass observation sphere 8 m across on the crew module's side, standing on
// an open grating, so you can look down through the floor and the glass beneath at the spine, the radiators and the engine. Typical of
// such designs, not a particular one. The sphere stands on an arm 34 m out from the spine, clear of the tanks and radiators.
const ship = new THREE.Group(); scene.add(ship); const BUB = V3(0, 1, 0), BUB_R = 4;
const engineParts = [];
{ const metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), dark = M(0x2a2c32, { metalness: 0.4 }), hull = M(0xb8bcc2, { metalness: 0.3, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ship.add(m); return m; };
  add(new THREE.SphereGeometry(BUB_R, 48, 32), new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false }), BUB.x, BUB.y, BUB.z);
  for (let k = 0; k < 6; k++) add(new THREE.TorusGeometry(BUB_R, 0.035, 6, 64), metal, BUB.x, BUB.y, BUB.z, 0, k * Math.PI / 6, 0);
  for (const lat of [-0.75, -0.35, 0.4, 0.8]) add(new THREE.TorusGeometry(BUB_R * Math.cos(lat), 0.03, 6, 64), metal, BUB.x, BUB.y + BUB_R * Math.sin(lat), BUB.z, Math.PI / 2);
  const grate = canvasTex(256, 256, (g, W) => { g.clearRect(0, 0, W, W); g.fillStyle = "#6a6e76"; for (let k = 0; k < W; k += 32) { g.fillRect(k, 0, 3, W); g.fillRect(0, k, W, 3); } }); grate.wrapS = grate.wrapT = THREE.RepeatWrapping; grate.repeat.set(5, 5);
  add(new THREE.CircleGeometry(Math.sqrt(BUB_R ** 2 - 1), 64), new THREE.MeshStandardMaterial({ map: grate, alphaTest: 0.5, transparent: true, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }), 0, 0, 0, -Math.PI / 2);
  add(new THREE.TorusGeometry(Math.sqrt(BUB_R ** 2 - 1), 0.08, 8, 64), metal, 0, 0, 0, Math.PI / 2);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI) < 0.3 || Math.abs(a - Math.PI) < 0.3) continue; add(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), metal, 3.3 * Math.cos(a), 0.52, 3.3 * Math.sin(a)); }
  add(new THREE.TorusGeometry(3.3, 0.035, 6, 64, Math.PI * 2 - 0.62), metal, 0, 1.05, 0, Math.PI / 2, 0, Math.PI + 0.31);
  add(new THREE.CylinderGeometry(1.3, 1.3, 22, 24, 1, true), M(0x50545c, { side: THREE.DoubleSide }), -14.5, 1, 0, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(10, 10, 34, 32), hull, -34, 4, 0); for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(1.2, 30, 0.4), dark, -34 + 10.1 * Math.cos(k * 1.57 + 0.4), 4, 10.1 * Math.sin(k * 1.57 + 0.4), 0, -(k * 1.57 + 0.4));
  add(new THREE.CylinderGeometry(3, 3, 420, 16), metal, -34, -160, 0); for (const [x, z] of [[2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]]) add(new THREE.CylinderGeometry(0.4, 0.4, 420, 6), dark, -34 + x, -160, z);
  add(new THREE.ConeGeometry(26, 34, 40), M(0x5a5e66, { metalness: 0.4, roughness: 0.7 }), -34, 55, 0);
  for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(10, 24, 16), M(0xd8d0c0, { roughness: 0.5 }), -34 + 13 * Math.cos(k * Math.PI / 3), -75, 13 * Math.sin(k * Math.PI / 3));
  for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(10, 24, 16), M(0xd8d0c0, { roughness: 0.5 }), -34 + 13 * Math.cos(k * Math.PI / 3 + 0.5), -102, 13 * Math.sin(k * Math.PI / 3 + 0.5));
  const radM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.3, roughness: 0.8, emissive: 0x000000 }); engineParts.push({ radM });
  for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.6, 150, 60), radM, -34, -190, z * 34);
  add(new THREE.CylinderGeometry(16, 16, 2, 40), dark, -34, -290, 0);
  add(new THREE.SphereGeometry(6, 24, 16), metal, -34, -300, 0); for (let k = 0; k < 4; k++) add(new THREE.TorusGeometry(9 + k * 2.5, 0.8, 8, 40), metal, -34, -306 - k * 6, 0, Math.PI / 2);
  const plumeTex = canvasTex(64, 256, (g, W, Hh) => { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "rgba(200,220,255,0.9)"); gr.addColorStop(0.15, "rgba(150,180,255,0.45)"); gr.addColorStop(1, "rgba(100,130,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); });
  const plume = add(new THREE.CylinderGeometry(9, 70, 900, 32, 1, true), new THREE.MeshBasicMaterial({ map: plumeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -34, -780, 0); plume.visible = false; engineParts[0].plume = plume; }
// the auto-darkening patch: electrochromic glass that darkens only where the star is, like a welding helmet. What harms the eye is how
// bright each bit of the star's surface is, not how far away it is: Betelgeuse's surface is about 15% as bright as the Sun's, enough to
// burn your retina in seconds from any distance. F switches the patch off to show what you would see without it.
let filterOn = true; const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })), patchRim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0x8a8e96, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); ship.add(patch, patchRim);
// fading to black, for the ship's slow turns
const fadeM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }), fade = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), fadeM); fade.position.z = -0.12; fade.renderOrder = 50; camera.add(fade);
// the ship starts parked with Betelgeuse in view
ship.quaternion.copy(viewQuat(BD));
scene.add(new THREE.AmbientLight(0x404858, 0.6)); const starLight = new THREE.DirectionalLight(0xffb070, 3.2); starLight.position.copy(BD).multiplyScalar(100); scene.add(starLight);

// the destination console, on a stand by the dome's edge: click a line (or point a controller and pull the trigger)
const conTex = canvasTex(640, 720), console_ = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), new THREE.MeshBasicMaterial({ map: conTex, toneMapped: false })); console_.position.set(2.15, 1.2, -1.75); console_.rotation.set(-0.35, Math.atan2(-2.15, 1.75), 0, "YXZ"); ship.add(console_);
{ const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), M(0x2a2c32)); st.position.set(2.2, 0.5, -1.8); ship.add(st); }
function drawConsole() { const g = conTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 640, 720); g.fillStyle = "#ffb060"; g.font = "bold 34px sans-serif"; g.fillText("DESTINATIONS", 24, 50);
  DESTS.forEach((D, i) => { const y = 82 + i * 68; g.fillStyle = i === destI ? (TRAVEL.on ? "#5a4a20" : "#2a3a5a") : "#181c26"; g.fillRect(16, y, 608, 60); g.fillStyle = i === destI ? "#ffe0a0" : "#d8e0f0"; g.font = "24px sans-serif"; g.fillText(`${i + 1}. ${D.name}`, 28, y + 38, 584); });
  conTex.needsUpdate = true; }
function consoleHit(origin, dir) { const ray = new THREE.Raycaster(origin, dir); const h = ray.intersectObject(console_)[0]; if (!h) return false; const i = Math.floor(((1 - h.uv.y) * 720 - 82) / 68); if (i >= 0 && i < DESTS.length) goTo(i); return true; }
const ctrls = [0, 1].map(i => { const ct = renderer.xr.getController(i); rig.add(ct); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd060 })); l.scale.z = 3; ct.add(l);
  ct.addEventListener("selectstart", () => { const o = V3(0, 0, 0), d = V3(0, 0, -1); ct.getWorldPosition(o); d.applyQuaternion(ct.getWorldQuaternion(new THREE.Quaternion())); consoleHit(o, d); }); return ct; });

// ---------- the HUD: labels on the sky ----------
const HUD = new THREE.Group(); skyG.add(HUD); let hudOn = true;
function label(text, sub, dir, col = "#cfe6ff", scale = 1) { const t = canvasTex(512, 128, (g, W, Hh) => { g.font = "bold 38px sans-serif"; g.fillStyle = col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.center.set(0.02, 0.7); s.scale.set(1600 * scale, 400 * scale, 1); s.position.copy(dir).multiplyScalar(SKY_R * 0.9); s.renderOrder = 30; HUD.add(s); return s; }
for (const L of SKY_LABELS) if (!/^(HD|HIP) /.test(L.name) || L.m < 1.5) label(L.name, `mag ${L.m.toFixed(1)} · ${L.d.toLocaleString()} ly${L.err > L.d * 0.2 ? " (distance uncertain)" : ""}`, V3(...L.dir), "#cfe6ff", 0.8);
for (const N of SKY_NOTES) { const vis = N.m < 6.5; label(N.name, `${vis ? "mag " + N.m.toFixed(1) : "mag " + N.m.toFixed(1) + ", too faint to see"} · ${N.d.toLocaleString()} ly away${N.name === "the Sun" ? " · directly behind you" : ""}`, V3(...N.dir), N.name === "the Sun" ? "#ffd060" : vis ? "#cfe6ff" : "#8a9ab0", 0.9); }
// labels for the things of the system, kept up to date with their distances
function dynLabel(col, scale) { const t = canvasTex(512, 128), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.center.set(0.02, 0.7); s.scale.set(1600 * scale, 400 * scale, 1); s.renderOrder = 30; HUD.add(s); s.userData = { t, col, last: "" }; return s; }
function setLabel(s, text, sub, sys) { const rel = sys.clone().sub(SHIP); s.position.copy(rel.normalize()).multiplyScalar(SKY_R * 0.9); const key = text + sub; if (key === s.userData.last) return; s.userData.last = key; const g = s.userData.t.userData.c.getContext("2d"); g.clearRect(0, 0, 512, 128);
  g.font = "bold 38px sans-serif"; g.fillStyle = s.userData.col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = s.userData.col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); s.userData.t.needsUpdate = true; }
const fmtD = d => d < 0.01 ? Math.round(d * 1.496e8).toLocaleString() + " km" : d < 1 ? (d * 149.6).toFixed(1) + " million km" : d.toFixed(d < 10 ? 1 : 0) + " AU";
const starLabel = dynLabel("#ffb060", 1.1), compLabel = dynLabel("#ffe8c0", 0.9), cometLabel = dynLabel("#c8e0ff", 0.85); for (const B of BODIES) B.label = dynLabel(B.glowI > 0.5 ? "#ffa070" : "#d8f0d0", 0.85);

// ---------- time ----------
// Real time by default. T steps up: an hour, a day, a month, a year per second (the cells churn over months to years, the pulsation
// takes 416 days, the companion 5.8 years).
const RATES = [[1, "real time"], [3600, "1 hour per second"], [86400, "1 day per second"], [30 * 86400, "1 month per second"], [365.25 * 86400, "1 year per second"]]; let rateI = 0, tSec = 0;

// ---------- you ----------
const P = { x: -0.8, z: 0 }; let yaw = -Math.PI / 2, pitch = 0.35, started = false, vrYaw = -Math.PI / 2; const keys = {};
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (/^Digit[1-9]$/.test(e.code)) goTo(+e.code.slice(5) - 1); if (e.code === "KeyH") hudOn = !hudOn; if (e.code === "KeyF") toggleFilter(); if (e.code === "KeyT") { rateI = (rateI + 1) % RATES.length; say(`Time: ${RATES[rateI][1]}.`); } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; start(); });
addEventListener("pointermove", e => { if (!drag) return; drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); yaw -= (e.clientX - drag.x) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * 0.004, -1.4, 1.5); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", e => { if (drag && drag.moved < 6 && started) { const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera); consoleHit(r.ray.origin, r.ray.direction); } drag = null; });
const VRB = document.getElementById("vr"), prevB = {};
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the panel ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:410px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(14,12,20,.85);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(14,12,20,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0; function say(t) { MSG.innerHTML = t; MSG.style.display = "block"; msgT = 20; }
const ANG = 2 * Math.asin(R_B / D_SHIP) * 180 / Math.PI;
function drawPanel() { const days = tSec / 86400, ph = (days % P_PULSE) / P_PULSE, cph = (days % P_COMP) / P_COMP;
  const dB = SHIP.length(), angB = 2 * Math.asin(Math.min(1, R_B / dB)) * 180 / Math.PI, flux = L_B / dB ** 2, near = BODIES.concat([{ name: "Siwarha", pos: () => compPos(days) }, { name: "the comet", pos: CN }]).map(B => [B, B.pos().distanceTo(SHIP)]).sort((a, b) => a[1] - b[1])[0];
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600">Betelgeuse${TRAVEL.on ? ": travelling" : ""}</div>
  <div style="margin:4px 0 6px"><b>Where you are</b>: ${fmtD(dB)} from Betelgeuse, which is ${angB.toFixed(angB < 1 ? 2 : 1)}° across (${fmt(angB / 0.52, angB < 5 ? 1 : 0)} times the Moon's width from Earth) and gives ${fmt(flux, flux < 10 ? 1 : 0)} times the sunlight at Earth${flux > 30 ? ": deadly without heavy shielding" : flux > 2 ? "" : flux > 0.5 ? ", much like the Sun at Earth" : ""}. Nearest: ${near[0].name}, ${fmtD(near[1])}.
  ${TRAVEL.on ? `<br>On the way to ${DESTS[TRAVEL.i].name}: day ${((TRAVEL.tau || 0) / 86400).toFixed(1)} of ${(TRAVEL.t1g / 86400).toFixed(1)} by 1 g drive; speed ${fmt((TRAVEL.v || 0) / 1000, 0)} km/s (${((TRAVEL.v || 0) / 2.998e6).toFixed(2)}% of light); ${TRAVEL.flipped ? "slowing, destination below" : "speeding up, destination overhead"}; time-lapse ×${fmt(Math.max(1, TRAVEL.lapse || 1), 0)}.` : ""}</div>
  <div style="margin-bottom:6px"><b>Go to</b> (click, press 1-9, or use the console in the dome):<br>${DESTS.map((D, k) => `<span data-d="${k}" style="cursor:pointer;color:${k === destI ? "#ffd070" : "#a8c8ff"}">${k + 1}. ${D.name}</span>`).join("<br>")}</div>
  <b>Measured (with uncertainties)</b><br>&middot; radius about ${Math.round(R_B * 215)} times the Sun's (${R_B.toFixed(2)} AU; estimates 640 to 1,000): in our Solar System it would reach past Mars<br>&middot; surface 3,600 K (deep orange), light about ${fmt(L_B, 0)} Suns, mass now about ${M_B} Suns<br>&middot; age about 8 to 10 million years; it should explode as a supernova within about 100,000 years<br>&middot; mean density about ${fmt(M_B * 1.989e30 / (4 / 3 * Math.PI * (R_B * 1.496e11) ** 3) / 1.2, 1)} of the air you breathe<br>&middot; it pulses every ~${P_PULSE} days, now at ${Math.round(ph * 100)}% of a cycle<br>&middot; it loses about a millionth of a Sun's mass a year, some of it as dust
  <div style="margin-top:6px"><b>Probable</b>: the companion Siwarha, about the Sun's mass, ${A_COMP.toFixed(1)} AU from Betelgeuse's centre (inside its outer atmosphere), once round every 5.8 years (now ${Math.round(cph * 100)}% round). Its orbit's tilt is assumed.</div>
  <div style="margin-top:6px"><b>Drawn as typical</b>: the pattern of giant convection cells and the uneven edge, the glow of the outer atmosphere, the dust clumps.</div>
  <div style="margin-top:6px"><b>Plausible, invented</b>: the young super-Jupiter Betelgeuse b (120 AU) and its two moons, the ringed ice giant Betelgeuse c (350 AU, where the light equals Earth's sunlight), a brown dwarf (900 AU), the comet and the far comet belt. No planets are known; massive stars rarely keep close planets, and anything inside about 4 AU has been swallowed, but giant planets and brown dwarfs can form far out from massive disks.</div>
  <div style="margin-top:6px"><b>The sky here</b> (from the star catalogue): the brightest star is Rigel (mag −1.4), with Orion's belt stars and Saiph close behind. The Sun is magnitude 11, far too faint to see (it is directly behind you), and so is Sirius, the brightest star in Earth's sky (mag 7.6). Stars near Betelgeuse with only older distances may be misplaced by up to ~100 ly; in truth the glare of Betelgeuse would hide the faint ones.</div>
  <div style="margin-top:6px;color:#c8c0d8;font-size:12.5px">Time: ${RATES[rateI][1]} (T to change) · H labels ${hudOn ? "on" : "off"} · drag to look · WASD walk round the cupola</div>`; }
PANEL.addEventListener("click", e => { const d = e.target.closest("[data-d]"); if (d) goTo(+d.dataset.d); });
function toggleFilter() { filterOn = !filterOn; say(filterOn ? "Filter on: the glass darkens over Betelgeuse, about 100,000 times, so you can look at it." : "Filter off: this is closer to the truth. Betelgeuse's surface is about 15% as bright as the Sun's, so it is a blinding glare that would burn your retina in seconds, and its light drowns every other star. F to switch the filter back on."); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block";
  say(`You are in the glass cupola of a ship 30 AU from Betelgeuse. The star is ${ANG.toFixed(0)}° across: a churning orange surface of a few giant cells, darkening to red at its uneven edge, in a faint glow of its outer atmosphere. Its probable companion, Siwarha, is the brilliant point near it. The labels (H) name the stars and the things of this system (the planets are plausible inventions). Fly anywhere with the console beside you, the list in the panel, or keys 1-9. Look down through the grating floor at the ship. The dark patch on the glass is a filter over the star (F to see without it). T speeds up time.`); drawConsole(); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), headP = V3(0, 0, 0), tmpV = V3(0, 0, 0), toCam = V3(0, 0, 0); let frameN = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  if (started) tSec += dt * RATES[rateI][0]; const days = tSec / 86400;
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) toggleFilter(); prevB.x = bX; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bB = gp.buttons[5]?.pressed; if (bB && !prevB.b) hudOn = !hudOn; prevB.b = bB; const bA = gp.buttons[4]?.pressed; if (bA && !prevB.a) { rateI = (rateI + 1) % RATES.length; say(`Time: ${RATES[rateI][1]}.`); } prevB.a = bA; } } }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  // walking round the cupola floor (in the ship's frame)
  if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(ship.quaternion.clone().invert()); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x); P.x += (f.x * -my + sd.x * mx) * 1.4 * dt; P.z += (f.z * -my + sd.z * mx) * 1.4 * dt; const r = Math.hypot(P.x, P.z); if (r > 3.0) { P.x *= 3.0 / r; P.z *= 3.0 / r; } }
  rig.position.copy(V3(P.x, 0, P.z).applyQuaternion(ship.quaternion)); rig.quaternion.copy(ship.quaternion); rig.rotateY(vr ? vrYaw : 0);
  if (!vr) { camera.position.set(0, 1.65, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  camera.getWorldPosition(headP); skyG.position.copy(headP);
  // travelling: the remaining distance shrinks geometrically, so the destination grows steadily; the ship turns to face it
  // the trip: turn (a fade), burn toward it (it stands overhead), turn round at the midpoint (a fade), burn to slow (it lies below your
  // feet), and park (a fade). The remaining distance shrinks geometrically in real time, so the destination grows steadily; the trip's
  // clock follows the true 1 g motion for that distance, so the time-lapse runs fast early and slows near the end.
  let fadeA = 0, burning = false;
  if (TRAVEL.on) { const T = TRAVEL, F = 0.7; T.st += dt; const D = DESTS[T.i];
    if (T.stage === "out1" || T.stage === "out2" || T.stage === "out3") { fadeA = Math.min(1, T.st / F); if (T.st >= F) { T.st = 0;
        if (T.stage === "out1") { ship.quaternion.copy(thrustQuat(T.to.clone().sub(SHIP))); T.stage = "in1"; }
        else if (T.stage === "out2") { ship.quaternion.copy(thrustQuat(SHIP.clone().sub(T.to))); T.stage = "in2"; T.flipped = true; say("Midpoint: the engine has shut down, the ship has turned round (skipped), and it burns again to slow down. Your destination is now beneath your feet: look down through the floor."); }
        else { ship.quaternion.copy(viewQuat(D.look().sub(SHIP))); T.stage = "in3"; } } }
    else if (T.stage === "in1" || T.stage === "in2" || T.stage === "in3") { fadeA = Math.max(0, 1 - T.st / F); if (T.st >= F) { T.st = 0; if (T.stage === "in3") { T.on = false; drawConsole(); const B = BODIES.find(b => D.name.startsWith(b.name)); say(`Arrived and parked: ${D.name}.${B ? " " + B.name[0].toUpperCase() + B.name.slice(1) + ": " + B.info + " (Plausible: invented to fit what such a star could have.)" : ""} Engine off: here you would float; you are held to the floor.`); } else T.stage = "burn"; } }
    if (T.stage === "burn") { burning = true; T.b = Math.min(1, T.b + dt / T.T); const e = T.b * T.b * (3 - 2 * T.b), rem = Math.exp(Math.log(T.dist + T.rmin) * (1 - e) + Math.log(T.rmin) * e) - T.rmin;
      SHIP.copy(T.to).add(T.from.clone().sub(T.to).normalize().multiplyScalar(rem)); const tau = rem > T.dist / 2 ? Math.sqrt(2 * (T.dist - rem) * AU_M / 9.81) : T.t1g - Math.sqrt(2 * rem * AU_M / 9.81); tSec += Math.max(0, tau - T.tau); T.lapse = (tau - T.tau) / Math.max(dt, 1e-3); T.tau = tau; T.v = 9.81 * Math.min(tau, T.t1g - tau);
      if (!T.flipped && rem <= T.dist / 2) { T.stage = "out2"; T.st = 0; } else if (T.b >= 1) { T.stage = "out3"; T.st = 0; } } }
  fadeM.opacity = fadeA; engineParts[0].plume.visible = burning; engineParts[0].radM.emissive.setRGB(burning ? 0.35 : 0, burning ? 0.08 : 0, 0);
  // Betelgeuse: pulsing a few per cent in size and about 0.3 magnitude in light; its cells churning
  const pul = Math.sin(2 * Math.PI * days / P_PULSE), Rnow = R_B * (1 + 0.03 * pul), dB = place(star, V3(0, 0, 0), Rnow); starMat.uniforms.t.value = days / 220; starMat.uniforms.bright.value = (1 + 0.12 * pul) * (filterOn ? 1 : 30); SKY_DIM.value = filterOn ? 1 : 0.06;
  { const f = star.position.length(), rho = star.scale.x, alpha = Math.asin(Math.min(0.999, rho / f)), fr = f - rho, h = fr * Math.tan(alpha), u = star.position.clone().divideScalar(f);
    limb.position.copy(u).multiplyScalar(fr); limb.scale.setScalar(2 * h / 0.83); glow.position.copy(u).multiplyScalar(f); glow.scale.setScalar(2 * f * Math.tan(alpha) * (filterOn ? 2.1 : 6)); glow.material.opacity = filterOn ? 1 : 1; glow.material.color.setScalar(filterOn ? 1 : 3);
    bGlare.position.copy(u).multiplyScalar(fr); bGlare.scale.setScalar(f * 0.06); bGlare.material.opacity = THREE.MathUtils.clamp(1 - alpha / 0.012, 0, 1); }
  setLabel(starLabel, "Betelgeuse", `red supergiant · ${fmtD(dB)} away · ${(2 * Math.asin(Math.min(1, R_B / dB)) * 180 / Math.PI).toFixed(dB > 100 ? 2 : 1)}° across`, V3(0, 0, 0));
  // the companion, and the dust clumps lit from Betelgeuse
  const cpos = compPos(days), cd = place(comp, cpos); place(compBall, cpos, R_COMP); comp.scale.setScalar(Math.max(comp.position.length() * 0.035, compBall.scale.x * 7)); setLabel(compLabel, "Siwarha (companion, probable)", `about 1 Sun's mass · ${fmtD(cd)} away`, cpos);
  for (const D of DUST) { const d = place(D.s, D.off, D.size), toShip = SHIP.clone().sub(D.off).normalize(), cosT = D.off.clone().normalize().dot(toShip), g = 0.55, hg = (1 - g * g) / Math.pow(1 + g * g - 2 * g * cosT, 1.5);
    D.s.material.opacity = Math.min(0.5, 0.05 * hg * (R_B * 8 / D.off.length()) ** 2) * THREE.MathUtils.smoothstep(d, 0.3, 3); }
  // the planets, moons and brown dwarf: lit by Betelgeuse (brightness compressed, as by eyes adapting), a point of light when far
  for (const B of BODIES) { const P = B.pos(), d = place(B.mesh, P, B.R), fluxS = L_B / P.lengthSq(), ang = B.R / d; B.u.L.value.copy(P).negate().normalize(); B.u.I.value = 0.35 * Math.pow(fluxS, 0.3);
    B.dot.position.copy(B.mesh.position); B.dot.scale.setScalar(B.mesh.position.length() * 0.004); const lit = Math.min(1, (0.6 * Math.pow(fluxS, 0.3) * 0.3 + B.glowI) * 1.5); B.dot.material.color.setRGB(lit, lit * 0.8, lit * 0.6); B.dot.material.opacity = THREE.MathUtils.clamp(1 - ang / 0.002, 0, 1); B.mesh.visible = ang > 2e-4;
    setLabel(B.label, B.name, `${B.tag} · ${fmtD(d)} away`, P); }
  // the comet: coma and two tails, each a chain of soft glows placed along its length
  { const c = CN(), td = tailDir(), side = new THREE.Vector3().crossVectors(td, PN).normalize(), dc = place(COMA, c, 0.0016); COMA.material.opacity = 0.9; setLabel(cometLabel, "a comet", `plausible · ${fmtD(dc)} away`, c);
    for (const T of TAILS) { const f = T.f, pt = c.clone().add(td.clone().multiplyScalar(T.len * Math.pow(f, 1.2))); if (T.kind === "dust") pt.add(side.clone().multiplyScalar(T.len * 0.18 * f * f)); place(T.sp, pt, 0.004 + (T.kind === "dust" ? 0.09 : 0.035) * f); T.sp.material.opacity = (T.kind === "dust" ? 0.16 : 0.12) * (1 - f) ** 1.3; } }
  // the darkening patch on the sphere's glass, over Betelgeuse
  // (it tracks your eye, as such glass would have to: the darkened spot is where your line of sight to the star crosses the glass)
  { const dL = SHIP.clone().negate().normalize().applyQuaternion(ship.quaternion.clone().invert()), eye = ship.worldToLocal(headP.clone()), oc = eye.clone().sub(BUB), b = oc.dot(dL), cc = oc.lengthSq() - (BUB_R - 0.05) ** 2, tHit = -b + Math.sqrt(Math.max(0, b * b - cc));
    const hit = eye.clone().add(dL.clone().multiplyScalar(tHit)), aB = Math.asin(Math.min(1, R_B / SHIP.length())), rP = Math.min(9, tHit * Math.tan(Math.min(1.25, aB * 1.2 + 0.004)));
    for (const m of [patch, patchRim]) { m.position.copy(hit).add(dL.clone().multiplyScalar(m === patchRim ? -0.01 : 0)); m.scale.setScalar(rP); m.lookAt(headP); m.visible = filterOn; } }
  // the light on the cupola comes from Betelgeuse's direction, dimmer far away
  starLight.position.copy(SHIP).negate().normalize().multiplyScalar(100).applyQuaternion(new THREE.Quaternion()); starLight.intensity = 3.2 * THREE.MathUtils.clamp(Math.pow(L_B / SHIP.lengthSq() / 140, 0.25), 0.1, 3);
  HUD.visible = hudOn;
  if (frameN % 10 === 0) drawPanel(); msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") MSG.style.display = "none";
  renderer.render(scene, camera); });

// starship.js -- an antimatter starship that can fly to any listed star at a constant 1 g. Built into starship.html by build.py.
//
// The ship accelerates at a constant proper acceleration of 1 g (9.80665 m/s^2) to the midpoint, turns over, and decelerates at 1 g
// to arrive at rest. For constant proper acceleration a, with proper (ship) time tau measured from the start of a leg:
//   coordinate time  t = (c/a) sinh(a tau / c)          distance  x = (c^2/a) (cosh(a tau / c) - 1)
//   map velocity     v = c tanh(a tau / c)              proper velocity  w = gamma v = c sinh(a tau / c)    gamma = cosh(a tau / c)
// all from the metric, c^2 dtau^2 = c^2 dt^2 - dx^2. Both clocks start at the real date and time when the page is opened.
// Outside, the sky is drawn as the ship sees it: relativistic aberration crowds the stars forward and the Doppler effect shifts their
// colour and brightness (blue and bright ahead, red and faint behind); at extreme speed the cosmic microwave background glows ahead.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 90000);
const rig = new THREE.Group(); rig.add(camera); camera.position.y = 1.6; scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.2, ...o });
const clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ 40503) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };
const strSeed = s => { let h = 7; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- constants ----------
const C = 299792458, G0 = 9.80665, YEAR = 365.25 * 86400, LY = C * YEAR, AU = 1.495978707e11, RE = 6.371e6, RJ = 6.9911e7, RSUN = 6.9634e8, PC_LY = 3.26156;
const DEG = Math.PI / 180;

// ---------- the relativity of a 1 g trip (accelerate to the midpoint, turn over, decelerate) ----------
// a trip of map distance D (m) at proper acceleration a: each half is a constant-acceleration leg of length D/2
function tripPlan(D, a = G0) { const tauH = (C / a) * Math.acosh(1 + a * (D / 2) / (C * C)), tH = (C / a) * Math.sinh(a * tauH / C);
  return { D, a, tauH, tH, tau: 2 * tauH, t: 2 * tH, gammaMax: Math.cosh(a * tauH / C), vMax: C * Math.tanh(a * tauH / C), wMax: C * Math.sinh(a * tauH / C), phiMax: a * tauH / C }; }
// the state at proper time tau into the trip: distance covered x, coordinate time t, map velocity v, proper velocity w, gamma, phase
function tripState(P, tau) { tau = clampN(tau, 0, P.tau); const a = P.a, leg = tau <= P.tauH, s = leg ? tau : P.tau - tau, phi = a * s / C;
  const x1 = (C * C / a) * (Math.cosh(phi) - 1), t1 = (C / a) * Math.sinh(phi);
  return { tau, x: leg ? x1 : P.D - x1, t: leg ? t1 : P.t - t1, v: C * Math.tanh(phi), w: C * Math.sinh(phi), gamma: Math.cosh(phi), phi, accel: leg, phase: tau >= P.tau ? "arrived" : leg ? "accelerating" : "decelerating" }; }

// ---------- the stars: real positions (J2000 right ascension, declination, distance in light years) ----------
// [name, RA h, RA m, Dec deg (signed, minutes folded in), distance ly, spectral class, apparent V magnitude, mass (suns), note]
const STARS_RAW = [
  ["Sol (the Sun)", 0, 0, 0, 0, "G2V", -26.7, 1.0, "Our own star."],
  ["Proxima Centauri", 14, 29.7, -62.68, 4.246, "M5.5V", 11.1, 0.12, "The nearest star to the Sun, a red dwarf in the Alpha Centauri system; two known planets."],
  ["Alpha Centauri A & B", 14, 39.6, -60.83, 4.37, "G2V", -0.27, 1.1, "A pair of Sun-like stars orbiting each other every 80 years; no confirmed planets yet."],
  ["Barnard's Star", 17, 57.8, 4.69, 5.96, "M4V", 9.5, 0.16, "A old red dwarf, the fastest-moving star in our sky; four small planets found in 2024-25."],
  ["Wolf 359", 10, 56.5, 7.02, 7.86, "M6V", 13.5, 0.11, "A faint flare star."],
  ["Lalande 21185", 11, 3.3, 35.97, 8.31, "M2V", 7.5, 0.39, "A red dwarf with two known planets."],
  ["Sirius", 6, 45.1, -16.72, 8.6, "A1V", -1.46, 2.06, "The brightest star in our sky, with a white-dwarf companion, Sirius B."],
  ["Luyten 726-8", 1, 39.0, -17.95, 8.73, "M5.5V", 12.5, 0.10, "A pair of red dwarf flare stars (UV Ceti)."],
  ["Ross 154", 18, 49.8, -23.84, 9.7, "M3.5V", 10.4, 0.17, "A red dwarf flare star in Sagittarius."],
  ["Ross 248", 23, 41.9, 44.17, 10.3, "M6V", 12.3, 0.14, "A red dwarf; in about 36,000 years it will be the nearest star to the Sun."],
  ["Epsilon Eridani", 3, 32.9, -9.46, 10.5, "K2V", 3.73, 0.82, "A young orange star with a giant planet and dusty rings."],
  ["Lacaille 9352", 23, 5.9, -35.85, 10.7, "M0.5V", 7.3, 0.48, "A red dwarf with two super-Earths."],
  ["Ross 128", 11, 47.7, 0.80, 11.0, "M4V", 11.1, 0.17, "A quiet red dwarf with a temperate Earth-mass planet."],
  ["61 Cygni", 21, 6.9, 38.75, 11.4, "K5V", 5.2, 0.7, "The first star to have its distance measured (Bessel, 1838)."],
  ["Procyon", 7, 39.3, 5.22, 11.5, "F5IV", 0.34, 1.5, "A bright white star with a white-dwarf companion."],
  ["Epsilon Indi", 22, 3.4, -56.78, 11.9, "K5V", 4.7, 0.76, "An orange star with a cold giant planet photographed by JWST and two brown dwarfs."],
  ["Tau Ceti", 1, 44.1, -15.94, 11.9, "G8V", 3.5, 0.78, "A Sun-like star with four candidate planets."],
  ["Gliese 1061", 3, 36.0, -44.52, 12.0, "M5.5V", 13.0, 0.12, "A red dwarf with three planets."],
  ["Luyten's Star", 7, 27.4, 5.23, 12.2, "M3.5V", 9.9, 0.29, "A red dwarf with a super-Earth in its habitable zone."],
  ["Teegarden's Star", 2, 53.0, 16.88, 12.5, "M7V", 15.1, 0.097, "A tiny red dwarf with three Earth-mass planets."],
  ["Kapteyn's Star", 5, 11.7, -45.02, 12.8, "M1V", 8.9, 0.27, "An ancient halo star, orbiting the galaxy backwards."],
  ["Wolf 1061", 16, 30.3, -12.67, 14.0, "M3V", 10.1, 0.29, "A red dwarf with three planets."],
  ["Altair", 19, 50.8, 8.87, 16.7, "A7V", 0.77, 1.8, "A rapidly spinning white star, flattened by its spin."],
  ["Gliese 876", 22, 53.3, -14.27, 15.2, "M4V", 10.2, 0.37, "A red dwarf with two giant planets in resonance."],
  ["Gliese 581", 15, 19.4, -7.72, 20.5, "M3V", 10.6, 0.31, "A red dwarf with three planets."],
  ["Gliese 667 C", 17, 19.0, -34.99, 23.6, "M1.5V", 10.2, 0.33, "A red dwarf in a triple-star system, with super-Earths."],
  ["Vega", 18, 36.9, 38.78, 25.0, "A0V", 0.03, 2.1, "A bright white star ringed by dust; once the pole star, and will be again."],
  ["Fomalhaut", 22, 57.7, -29.62, 25.1, "A3V", 1.16, 1.9, "A white star with a great dust ring."],
  ["Pollux", 7, 45.3, 28.03, 33.8, "K0III", 1.14, 2.0, "An orange giant with a giant planet."],
  ["Arcturus", 14, 15.7, 19.18, 36.7, "K1.5III", -0.05, 1.1, "An orange giant, the brightest star in the northern sky."],
  ["TRAPPIST-1", 23, 6.5, -5.04, 40.7, "M8V", 18.8, 0.089, "An ultracool dwarf with seven Earth-sized planets, three in its habitable zone."],
  ["55 Cancri", 8, 52.6, 28.33, 41.0, "K0IV", 5.95, 0.95, "A star with five planets, including the lava world 55 Cancri e."],
  ["Upsilon Andromedae", 1, 36.8, 41.41, 44.0, "F8V", 4.1, 1.3, "The first star found with several planets (1999)."],
  ["LHS 1140", 0, 45.0, -15.27, 48.8, "M4.5V", 14.2, 0.18, "A red dwarf with a temperate super-Earth, perhaps an ocean world."],
  ["51 Pegasi", 22, 57.5, 20.77, 50.6, "G2IV", 5.5, 1.1, "Where the first planet around a Sun-like star was found (1995)."],
  ["Beta Pictoris", 5, 47.3, -51.07, 63.4, "A6V", 3.86, 1.75, "A young star with a huge dusty disc and two giant planets."],
  ["Aldebaran", 4, 35.9, 16.51, 65.0, "K5III", 0.85, 1.2, "The orange giant eye of Taurus."],
  ["K2-18", 11, 30.2, 7.59, 124, "M2.5V", 13.5, 0.36, "A red dwarf with a temperate sub-Neptune studied by JWST."],
  ["HR 8799", 23, 7.5, 21.13, 133, "A5V", 5.96, 1.5, "Four giant planets photographed directly."],
  ["HD 209458", 22, 3.2, 18.88, 159, "G0V", 7.65, 1.1, "The first planet seen crossing its star (1999): a hot Jupiter."],
  ["Kepler-16", 19, 16.3, 51.76, 245, "K7V", 12.0, 0.69, "A planet orbiting two suns, like Tatooine."],
  ["Canopus", 6, 24.0, -52.7, 310, "A9II", -0.74, 8.0, "The second-brightest star in our sky, a bright giant."],
  ["Polaris", 2, 31.8, 89.26, 433, "F7Ib", 1.98, 5.4, "The North Star, a yellow supergiant."],
  ["Betelgeuse", 5, 55.2, 7.41, 550, "M1Ia", 0.42, 16, "A red supergiant that will one day explode as a supernova."],
  ["Antares", 16, 29.4, -26.43, 550, "M1Ib", 1.06, 12, "The red supergiant heart of Scorpius."],
  ["Kepler-186", 19, 54.6, 43.95, 579, "M1V", 15.3, 0.54, "Kepler-186f was the first Earth-sized planet found in a habitable zone."],
  ["Kepler-22", 19, 16.9, 47.88, 640, "G5V", 11.7, 0.97, "Kepler-22b, a super-Earth in the habitable zone."],
  ["Rigel", 5, 14.5, -8.2, 860, "B8Ia", 0.13, 21, "A blue supergiant, Orion's foot."],
  ["Kepler-452", 19, 44.0, 44.28, 1800, "G2V", 13.4, 1.04, "Kepler-452b, an 'Earth cousin' circling a Sun-like star in a year of 385 days."],
  ["Deneb", 20, 41.4, 45.28, 2600, "A2Ia", 1.25, 19, "A white supergiant, one of the most luminous stars known."],
  ["Sagittarius A* (the galactic centre)", 17, 45.7, -29.01, 26670, "BH", 99, 4.3e6, "The supermassive black hole at the centre of the Milky Way, four million times the Sun's mass."]];
const TEMP = { O: 35000, B: 15000, A: 9000, F: 6700, G: 5700, K: 4500, M: 3300 };
const STARS = STARS_RAW.map(([name, rh, rm, dec, d, sp, V, mass, note], i) => { const ra = (rh + rm / 60) * 15 * DEG, de = dec * DEG, p = [d * Math.cos(de) * Math.cos(ra), d * Math.cos(de) * Math.sin(ra), d * Math.sin(de)];
  const cls = sp[0], giant = /I/.test(sp.slice(2)) && !/V/.test(sp.slice(2)), temp = sp === "BH" ? 0 : TEMP[cls] || 5000, absMag = d > 0 ? V - 5 * Math.log10(d / PC_LY) + 5 : 4.83;
  const radius = sp === "BH" ? 1.27e10 : giant ? (/Ia|Ib/.test(sp) ? (cls === "M" ? 800 : cls === "B" ? 75 : 100) : cls === "K" ? 22 : 8) * RSUN : { O: 10, B: 4, A: 1.8, F: 1.3, G: 1.0, K: 0.75, M: Math.max(0.12, mass * 1.0) }[cls] * RSUN;
  return { i, name, p, d, sp, V, absMag, mass, temp, radius, note, giant, bh: sp === "BH" }; });

// ---------- known planets: [name, period (days) or orbit (AU, given as negative), radius (Earth radii), kind] ----------
// kinds: rock, lava, hot (hot Jupiter), gas (giant), ice (ice giant / sub-Neptune), ocean, temperate (possibly habitable), earth, venus, mars
const KNOWN = {
  "Sol (the Sun)": [["Mercury", 87.97, 0.383, "rock"], ["Venus", 224.7, 0.949, "venus"], ["Earth", 365.256, 1.0, "earth"], ["Mars", 686.98, 0.532, "mars"], ["Jupiter", 4332.6, 11.21, "gas"], ["Saturn", 10759, 9.45, "saturn"], ["Uranus", 30687, 4.01, "ice"], ["Neptune", 60190, 3.88, "nep"]],
  "Proxima Centauri": [["Proxima d", 5.12, 0.8, "rock"], ["Proxima b", 11.19, 1.07, "temperate"]],
  "Barnard's Star": [["Barnard d", 2.34, 0.7, "rock"], ["Barnard b", 3.15, 0.75, "rock"], ["Barnard c", 4.12, 0.8, "rock"], ["Barnard e", 6.74, 0.65, "rock"]],
  "Lalande 21185": [["Lalande 21185 b", 12.95, 1.3, "rock"], ["Lalande 21185 c", 2900, 3.5, "ice"]],
  "Epsilon Eridani": [["Epsilon Eridani b", 2690, 11, "gas"]],
  "Lacaille 9352": [["Lacaille 9352 b", 9.26, 1.6, "rock"], ["Lacaille 9352 c", 21.8, 1.9, "temperate"]],
  "Ross 128": [["Ross 128 b", 9.87, 1.1, "temperate"]],
  "Epsilon Indi": [["Epsilon Indi Ab", -28, 12, "gas"]],
  "Tau Ceti": [["Tau Ceti g", 20.0, 1.2, "rock"], ["Tau Ceti h", 49.4, 1.2, "rock"], ["Tau Ceti e", 162.9, 1.6, "temperate"], ["Tau Ceti f", 636, 1.6, "ice"]],
  "Gliese 1061": [["Gliese 1061 b", 3.2, 1.1, "rock"], ["Gliese 1061 c", 6.7, 1.2, "rock"], ["Gliese 1061 d", 13.0, 1.1, "temperate"]],
  "Luyten's Star": [["Luyten c", 4.72, 1.2, "rock"], ["Luyten b", 18.65, 1.4, "temperate"]],
  "Teegarden's Star": [["Teegarden b", 4.91, 1.0, "temperate"], ["Teegarden c", 11.4, 1.0, "temperate"], ["Teegarden d", 26.1, 0.9, "ice"]],
  "Wolf 1061": [["Wolf 1061 b", 4.89, 1.2, "rock"], ["Wolf 1061 c", 17.9, 1.6, "temperate"], ["Wolf 1061 d", 217, 2.6, "ice"]],
  "Gliese 876": [["Gliese 876 d", 1.94, 1.7, "lava"], ["Gliese 876 c", 30.1, 11, "gas"], ["Gliese 876 b", 61.1, 12, "gas"], ["Gliese 876 e", 124, 3.4, "ice"]],
  "Gliese 581": [["Gliese 581 e", 3.15, 1.1, "rock"], ["Gliese 581 b", 5.37, 3.7, "ice"], ["Gliese 581 c", 12.9, 1.6, "rock"]],
  "Gliese 667 C": [["Gliese 667 Cb", 7.2, 1.6, "rock"], ["Gliese 667 Cc", 28.1, 1.5, "temperate"]],
  "Pollux": [["Pollux b", 590, 12, "gas"]],
  "TRAPPIST-1": [["TRAPPIST-1 b", 1.51, 1.12, "lava"], ["TRAPPIST-1 c", 2.42, 1.10, "venus"], ["TRAPPIST-1 d", 4.05, 0.79, "rock"], ["TRAPPIST-1 e", 6.10, 0.92, "temperate"], ["TRAPPIST-1 f", 9.21, 1.05, "ocean"], ["TRAPPIST-1 g", 12.35, 1.13, "ice"], ["TRAPPIST-1 h", 18.77, 0.76, "ice"]],
  "55 Cancri": [["55 Cancri e", 0.737, 1.9, "lava"], ["55 Cancri b", 14.65, 11, "hot"], ["55 Cancri c", 44.4, 7, "gas"], ["55 Cancri f", 260, 7, "gas"], ["55 Cancri d", 4800, 12, "gas"]],
  "Upsilon Andromedae": [["Upsilon Andromedae b", 4.6, 13, "hot"], ["Upsilon Andromedae c", 241, 12, "gas"], ["Upsilon Andromedae d", 1276, 12, "gas"]],
  "LHS 1140": [["LHS 1140 c", 3.78, 1.3, "rock"], ["LHS 1140 b", 24.7, 1.7, "ocean"]],
  "51 Pegasi": [["51 Pegasi b", 4.23, 14, "hot"]],
  "Beta Pictoris": [["Beta Pictoris c", -2.7, 12, "gas"], ["Beta Pictoris b", -9.9, 13, "gas"]],
  "K2-18": [["K2-18 b", 32.9, 2.6, "ocean"]],
  "HR 8799": [["HR 8799 e", -16, 13, "gas"], ["HR 8799 d", -27, 13, "gas"], ["HR 8799 c", -43, 13, "gas"], ["HR 8799 b", -68, 12, "gas"]],
  "HD 209458": [["HD 209458 b", 3.52, 15, "hot"]],
  "Kepler-16": [["Kepler-16 b", 228.8, 8.4, "saturn"]],
  "Kepler-186": [["Kepler-186 b", 3.89, 1.07, "lava"], ["Kepler-186 c", 7.27, 1.25, "rock"], ["Kepler-186 d", 13.3, 1.4, "rock"], ["Kepler-186 e", 22.4, 1.27, "rock"], ["Kepler-186 f", 129.9, 1.17, "temperate"]],
  "Kepler-22": [["Kepler-22 b", 289.9, 2.1, "ocean"]],
  "Kepler-452": [["Kepler-452 b", 384.8, 1.6, "temperate"]] };
// the planets of a star: known ones, or generated from its name (the same every visit)
function planetsOf(S) { const known = KNOWN[S.name], R = seeded(strSeed(S.name)), list = [];
  if (known) for (const [name, per, rad, kind] of known) { const aAU = per < 0 ? -per : Math.cbrt(S.mass * (per / 365.25) ** 2); list.push({ name, aAU, period: per < 0 ? 365.25 * Math.sqrt(aAU ** 3 / S.mass) : per, radius: rad * RE, kind, known: true }); }
  else if (!S.bh) { const lum = Math.pow(10, (4.83 - S.absMag) / 2.5), snow = 2.7 * Math.sqrt(lum), hz = Math.sqrt(lum), n = S.giant ? (R() < 0.5 ? 0 : 1 + (R() * 3 | 0)) : 2 + (R() * 7 | 0); let a = Math.max(0.02, 0.15 * Math.sqrt(lum)) * (0.6 + R() * 0.8);
    for (let k = 0; k < n; k++) { if (S.giant && a < 1.5 * Math.sqrt(lum) * 0.5) a = 1.5 * Math.sqrt(lum) * (0.5 + R()); const inner = a < snow, nearHZ = Math.abs(Math.log(a / hz)) < 0.25;
      const kind = inner ? (a < 0.4 * hz ? (R() < 0.4 ? "lava" : "rock") : nearHZ ? (R() < 0.45 ? "temperate" : R() < 0.5 ? "ocean" : "rock") : R() < 0.5 ? "mars" : "venus") : (R() < 0.55 ? "gas" : R() < 0.3 ? "saturn" : "ice");
      const radius = (kind === "gas" || kind === "saturn" ? 8 + R() * 6 : kind === "ice" ? 3 + R() * 2 : 0.5 + R() * 1.2) * RE;
      list.push({ name: `${S.name.split(" (")[0]} ${String.fromCharCode(98 + k)}`, aAU: a, period: 365.25 * Math.sqrt(a ** 3 / S.mass), radius, kind, known: false }); a *= 1.4 + R() * 0.9; } }
  const R2 = seeded(strSeed(S.name) + 5); list.forEach(p => { p.ph = R2() * Math.PI * 2; p.ring = p.kind === "saturn" || (p.kind === "ice" && R2() < 0.3); });
  return list; }

// ---------- the sky as the ship sees it ----------
// Every star is a direction in the equatorial frame. Each frame the graphics card applies relativistic aberration (cos th' =
// (cos th + beta)/(1 + beta cos th)) and the Doppler factor D = 1/(gamma (1 - beta cos th')): the observed colour temperature is D T and
// the brightness rises roughly as D^3 ahead and falls behind. Then the direction is turned into the ship's frame (its bow is +y).
const SKY_R = 60000, R_EQ2SHIP = new THREE.Matrix3(), R_SHIP2EQ = new THREE.Matrix3();
const skyUniforms = { uR: { value: R_EQ2SHIP }, uV: { value: V3(1, 0, 0) }, uBeta: { value: 0 }, uEps: { value: 1 }, uGamma: { value: 1 }, uPix: { value: renderer.getPixelRatio() } };
const BB_GLSL = `vec3 bb(float T){ T = clamp(T, 1000.0, 40000.0) / 100.0; float r = T <= 66.0 ? 1.0 : clamp(1.29293618606 * pow(T - 60.0, -0.1332047592), 0.0, 1.0);
  float g = T <= 66.0 ? clamp(0.390081578769 * log(T) - 0.631841443788, 0.0, 1.0) : clamp(1.12989086089 * pow(T - 60.0, -0.0755148492), 0.0, 1.0);
  float b = T >= 66.0 ? 1.0 : (T <= 19.0 ? 0.0 : clamp(0.543206789110 * log(T - 10.0) - 1.19625408914, 0.0, 1.0)); return vec3(r, g, b); }`;
const starMat = new THREE.ShaderMaterial({ uniforms: skyUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform mat3 uR; uniform vec3 uV; uniform float uBeta, uEps, uGamma, uPix; attribute vec3 aDir; attribute float aMag, aTemp; varying vec3 vCol; varying float vA; ${BB_GLSL}
    void main(){ float c = dot(aDir, uV); vec3 pr = aDir - uV * c; float pl = length(pr); vec3 pn = pl > 1e-6 ? pr / pl : vec3(0.0);
      float omc = 1.0 - c, omc2 = omc * uEps / (1.0 + uBeta * c), c2 = 1.0 - omc2; float s2 = sqrt(max(0.0, omc2 * (2.0 - omc2))); vec3 d2 = uV * c2 + pn * s2;
      float D = 1.0 / (uGamma * (omc2 + uEps * c2)), T = aTemp * D;   // written to keep precision when beta is within a hair of 1
      float vis = smoothstep(700.0, 2600.0, T) / (1.0 + pow(T / 45000.0, 1.5));
      float b = pow(10.0, -0.4 * (aMag + 1.0)) * clamp(pow(D, 3.0), 0.0, 2e4) * vis;
      vCol = bb(T); vA = clamp(b * 40.0, 0.0, 1.0); gl_PointSize = clamp(1.0 + 1.25 * log(1.0 + b * 250.0), 1.0, 7.0) * uPix;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(uR * d2 * ${SKY_R.toFixed(1)}, 1.0); if (vA < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
  fragmentShader: `varying vec3 vCol; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q); if (r > 0.25) discard; gl_FragColor = vec4(vCol * (1.0 - r * 3.0), vA); }` });
// the background: some 9,000 stars to naked-eye brightness, crowded along the Milky Way (galactic coordinates turned to equatorial)
const GAL2EQ = [[-0.0548755604, 0.4941094279, -0.8676661490], [-0.8734370902, -0.4448296300, -0.1980763734], [-0.4838350155, 0.7469822445, 0.4559837762]];
const g2e = (l, b) => { const g = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]; return GAL2EQ.map(r => r[0] * g[0] + r[1] * g[1] + r[2] * g[2]); };
const NBG = IS_HEADSET ? 7000 : 12000, bgDir = new Float32Array(NBG * 3), bgMag = new Float32Array(NBG), bgTemp = new Float32Array(NBG);
{ const R = seeded(1977), temps = [[3400, 0.3], [4400, 0.25], [5700, 0.14], [6800, 0.12], [9200, 0.13], [16000, 0.06]];
  for (let k = 0; k < NBG; k++) { let d; if (R() < 0.42) { const u = R() * 2 - 1, th = R() * 6.2832; d = [Math.sqrt(1 - u * u) * Math.cos(th), Math.sqrt(1 - u * u) * Math.sin(th), u]; }
      else { const l = (R() < 0.35 ? (R() - 0.5) * 1.2 : R() * 6.2832), gb = (R() + R() + R() - 1.5) * 0.16 * (R() < 0.5 ? 1 : 0.4); d = g2e(l, gb); }
    bgDir.set(d, k * 3); bgMag[k] = 6.8 - 7.2 * Math.pow(R(), 4.2); let r = R(), T = 5000; for (const [t, w] of temps) { if (r < w) { T = t * (0.85 + R() * 0.3); break; } r -= w; } bgTemp[k] = T; } }
// the Milky Way's glow: many faint unresolved points along the band
const NMW = IS_HEADSET ? 9000 : 22000, mwDir = new Float32Array(NMW * 3), mwMag = new Float32Array(NMW), mwTemp = new Float32Array(NMW);
{ const R = seeded(2026); for (let k = 0; k < NMW; k++) { const l = R() < 0.4 ? (R() + R() - 1) * 1.3 : R() * 6.2832, gb = (R() + R() + R() + R() - 2) * 0.09 * (1 + 0.8 * Math.cos(l)), d = g2e(l, gb); mwDir.set(d, k * 3); mwMag[k] = 6.6 + R() * 1.2 - 0.9 * Math.max(0, Math.cos(l)); mwTemp[k] = 4500 + R() * 2500; } }
const mkStars = (dir, mag, temp) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dir.length), 3)); g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1)); g.setAttribute("aTemp", new THREE.BufferAttribute(temp, 1));
  g.boundingSphere = new THREE.Sphere(V3(0, 0, 0), 1e9); const p = new THREE.Points(g, starMat); p.frustumCulled = false; p.renderOrder = -5; scene.add(p); return p; };
mkStars(bgDir, bgMag, bgTemp); mkStars(mwDir, mwMag, mwTemp);
// the named stars: directions and brightness recomputed from where the ship is (parallax and distance), each frame
const NS = STARS.length, nsDir = new Float32Array(NS * 3), nsMag = new Float32Array(NS), nsTemp = new Float32Array(NS); STARS.forEach((S, i) => nsTemp[i] = S.temp || 1000);
const NAMED = mkStars(nsDir, nsMag, nsTemp);
function updateNamedStars(pos, hideI) { for (let i = 0; i < NS; i++) { const S = STARS[i], dx = S.p[0] - pos[0], dy = S.p[1] - pos[1], dz = S.p[2] - pos[2], d = Math.hypot(dx, dy, dz);
    if (d < 1e-9 || i === hideI || S.bh) { nsMag[i] = 99; continue; } nsDir[i * 3] = dx / d; nsDir[i * 3 + 1] = dy / d; nsDir[i * 3 + 2] = dz / d; nsMag[i] = S.absMag + 5 * Math.log10(Math.max(d, 1e-6) / PC_LY) - 5; }
  NAMED.geometry.attributes.aDir.needsUpdate = true; NAMED.geometry.attributes.aMag.needsUpdate = true; }
// the cosmic microwave background: invisible at rest (2.7 K), but ahead of a ship with gamma in the thousands it is Doppler-shifted
// into the visible and glows; also a faint deep-space tint
const cmb = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.2, 48, 24), new THREE.ShaderMaterial({ uniforms: { ...skyUniforms, uRi: { value: R_SHIP2EQ } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform mat3 uRi; uniform vec3 uV; uniform float uBeta, uEps, uGamma; varying vec3 vD; ${BB_GLSL}
    void main(){ vec3 e = normalize(uRi * vD); float c = dot(e, uV); float D = 1.0 / (uGamma * ((1.0 - c) + uEps * c)); float T = 2.725 * D;
      float glow = smoothstep(500.0, 1600.0, T) * min(1.0, pow(T / 1600.0, 2.0)); gl_FragColor = vec4(bb(T) * glow + vec3(0.002, 0.003, 0.006), 1.0); }` }));
cmb.renderOrder = -10; cmb.frustumCulled = false; scene.add(cmb);
const FWD = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.08, "rgba(220,235,255,0.9)"); gr.addColorStop(0.3, "rgba(160,190,255,0.25)"); gr.addColorStop(1, "rgba(120,150,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
FWD.renderOrder = -4; scene.add(FWD);
// the ship's attitude: the bow (+y) along a direction in the equatorial frame
function setAttitude(bow) { const b = V3(...bow).normalize(), ref = Math.abs(b.z) > 0.95 ? V3(1, 0, 0) : V3(0, 0, 1), u = V3().crossVectors(b, ref).normalize(), w = V3().crossVectors(u, b);
  setFrame(u, b); }
// the frame directly: x and y axes of the ship (or lander) in the equatorial frame
const Q_E2S = new THREE.Quaternion(), _m4 = new THREE.Matrix4();
function setFrame(x, y) { const z = V3().crossVectors(x, y); R_EQ2SHIP.set(x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z); R_SHIP2EQ.copy(R_EQ2SHIP).transpose(); _m4.setFromMatrix3(R_EQ2SHIP); Q_E2S.setFromRotationMatrix(_m4); }
const eq2ship = v => V3(...v).applyMatrix3(R_EQ2SHIP);

// ---------- the star system around the ship ----------
// Bodies are drawn at their true angular size and direction from the ship (placed at a fixed distance, scaled to match), lit by their
// star. Orbits are circular; in our own system the planets are placed where they are on today's date (mean longitudes at J2000).
const J2000 = Date.UTC(2000, 0, 1, 12), OBL = 23.439 * DEG;
const SOL_L0 = { Mercury: 252.25, Venus: 181.98, Earth: 100.46, Mars: 355.43, Jupiter: 34.35, Saturn: 50.08, Uranus: 314.06, Neptune: 304.35 };
const loadTex = src => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; return t; };
const EARTH_T = loadTex(EARTH_JPG), MOON_T = loadTex(MOON_JPG), TEX_CACHE = {};
function planetTex(kind, seed) { const key = kind + seed; if (TEX_CACHE[key]) return TEX_CACHE[key]; const R = seeded(seed);
  const t = tex(512, 256, (g, w, h) => { const band = (cols, n, wob) => { for (let y = 0; y < h; y++) { const f = y / h, k = Math.floor((f + 0.03 * Math.sin(f * 40 + seed)) * n) % cols.length; g.fillStyle = cols[k]; g.fillRect(0, y, w, 1); } for (let i = 0; i < wob; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(R() * w, R() * h, 10 + R() * 40, 2 + R() * 5, 0, 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    const blobs = (base, cols, n, rmin, rmax) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.globalAlpha = 0.5 + R() * 0.5; g.beginPath(); g.arc(R() * w, h * 0.12 + R() * h * 0.76, rmin + R() * (rmax - rmin), 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    const clouds = a => { g.fillStyle = "#ffffff"; for (let i = 0; i < 260; i++) { g.globalAlpha = a * R(); g.beginPath(); g.ellipse(R() * w, R() * h, 8 + R() * 30, 2 + R() * 6, R() * 0.4, 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    if (kind === "rock") { blobs("#7a746c", ["#5a554e", "#9a948a", "#6a645c"], 500, 2, 12); }
    else if (kind === "lava") { blobs("#1c1614", ["#2a201c", "#3a2a24"], 200, 4, 20); g.strokeStyle = "#ff6a20"; g.lineWidth = 2; for (let i = 0; i < 90; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 20; g.lineTo(x, y); } g.stroke(); } }
    else if (kind === "hot") band(["#4a1c12", "#7a3018", "#a8501e", "#5a2414", "#c8702a"], 13, 40);
    else if (kind === "gas") band(["#c8a878", "#a8825a", "#e0cca8", "#8a6a48", "#d8b890", "#b89068"], 15, 60);
    else if (kind === "saturn") band(["#e0cc9a", "#d0b880", "#ead8b0", "#c8ac78"], 18, 20);
    else if (kind === "ice") band(["#9ad0d8", "#8ac4cc", "#a8dce0", "#80b8c4"], 9, 10);
    else if (kind === "nep") band(["#3a5ab8", "#2a4aa0", "#4a6ac8", "#2a3a90"], 11, 14);
    else if (kind === "venus") { band(["#e0cc98", "#d8c088", "#e8d8a8"], 7, 30); clouds(0.25); }
    else if (kind === "mars") { blobs("#b0603a", ["#8a4428", "#c87848", "#6a3820"], 260, 4, 26); g.fillStyle = "#f0f0f0"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8); }
    else if (kind === "ocean") { g.fillStyle = "#1a3a6a"; g.fillRect(0, 0, w, h); clouds(0.5); g.fillStyle = "#e8f0f8"; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); }
    else { blobs("#1e4a7a", ["#3a6a3a", "#6a7a4a", "#8a7a5a", "#2a5a2a"], 70, 10, 46); clouds(0.6); g.fillStyle = "#f4f8fc"; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12); } });
  return TEX_CACHE[key] = t; }
const ringTex = tex(256, 8, (g, w) => { for (let x = 0; x < w; x++) { const f = x / w; g.fillStyle = `rgba(${210 + 30 * Math.sin(f * 40)},${190 + 30 * Math.sin(f * 33)},${150 + 20 * Math.sin(f * 21)},${(0.25 + 0.6 * Math.abs(Math.sin(f * 17))) * (f > 0.1 && f < 0.95 ? 1 : 0)})`; g.fillRect(x, 0, 1, 8); } });
const BODY_R = 20000, LOCAL = new THREE.Group(); scene.add(LOCAL);
const starLight = new THREE.DirectionalLight(0xffffff, 2.6); scene.add(starLight, starLight.target);
const SPRITE_GLOW = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.15, "rgba(255,255,255,0.8)"); gr.addColorStop(0.4, "rgba(255,255,255,0.15)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const bbColor = T => { T = clampN(T, 1000, 40000) / 100; const r = T <= 66 ? 1 : clampN(1.2929 * Math.pow(T - 60, -0.1332), 0, 1), g = T <= 66 ? clampN(0.3901 * Math.log(T) - 0.6318, 0, 1) : clampN(1.1299 * Math.pow(T - 60, -0.0755), 0, 1), b = T >= 66 ? 1 : T <= 19 ? 0 : clampN(0.5432 * Math.log(T - 10) - 1.1963, 0, 1); return new THREE.Color(r, g, b); };
let SYS = null;
function buildSystem(S) { while (LOCAL.children.length) LOCAL.remove(LOCAL.children[0]);
  const R = seeded(strSeed(S.name) + 11), sol = S.i === 0, n = sol ? [0, -Math.sin(OBL), Math.cos(OBL)] : (() => { const u = R() * 2 - 1, th = R() * 6.28; return [Math.sqrt(1 - u * u) * Math.cos(th), Math.sqrt(1 - u * u) * Math.sin(th), u]; })();
  const nv = V3(...n).normalize(), e1 = (sol ? V3(1, 0, 0) : V3().crossVectors(nv, Math.abs(nv.z) < 0.9 ? V3(0, 0, 1) : V3(1, 0, 0))).normalize(), e2 = V3().crossVectors(nv, e1).normalize();
  const starMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: S.bh ? 0x000000 : bbColor(S.temp).multiplyScalar(1.6), toneMapped: false }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SPRITE_GLOW, color: S.bh ? 0xff9a50 : bbColor(S.temp), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); LOCAL.add(starMesh, glow);
  let disk = null; if (S.bh) { disk = new THREE.Mesh(new THREE.RingGeometry(2.5, 9, 96, 1), new THREE.MeshBasicMaterial({ map: tex(256, 8, (g, w) => { for (let x = 0; x < w; x++) { const f = x / w; g.fillStyle = `rgba(255,${(220 - 160 * f) | 0},${(160 - 140 * f) | 0},${(1 - f) * 0.9})`; g.fillRect(x, 0, 1, 8); } }), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); LOCAL.add(disk); }
  const planets = planetsOf(S).map((p, k) => { const tx = p.kind === "earth" ? EARTH_T : planetTex(p.kind, strSeed(p.name)), mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, metalness: 0, emissive: p.kind === "lava" || p.kind === "hot" ? 0x401008 : 0x000000 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat); if (p.kind === "earth") mesh.userData.axis = V3(0, 0, 1); LOCAL.add(mesh); let ring = null;
    if (p.ring) { ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 2.3, 96, 1), new THREE.MeshStandardMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, depthWrite: false })); const uv = ring.geometry.attributes.uv, pos = ring.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 1.25) / 1.05, 0.5); } LOCAL.add(ring); }
    const L0 = sol ? (SOL_L0[p.name] || 0) * DEG : p.ph; return { ...p, mesh, ring, L0, rot: SOL_ROT[p.name] ?? (p.aAU < 0.1 ? p.period : DENS[p.kind] || p.kind === "hot" ? 0.4 + seeded(strSeed(p.name) + 3)() * 0.6 : 0.6 + seeded(strSeed(p.name) + 3)() * 4) }; });
  let moon = null; if (sol) { moon = { name: "the Moon", radius: 1.7374e6, mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ map: MOON_T, roughness: 1 })) }; LOCAL.add(moon.mesh); }
  SYS = { S, n: nv, e1, e2, starMesh, glow, disk, planets, moon }; }
// where a planet is (metres from its star, equatorial frame) at a coordinate time
function planetPos(p, ms) { const days = (ms - J2000) / 864e5, th = p.L0 + 2 * Math.PI * days / p.period, a = p.aAU * AU; return SYS.e1.clone().multiplyScalar(a * Math.cos(th)).addScaledVector(SYS.e2, a * Math.sin(th)); }
function moonPos(ms) { const days = (ms - J2000) / 864e5, th = 2 * Math.PI * days / 27.3217 + 2.1; return SYS.e1.clone().multiplyScalar(3.844e8 * Math.cos(th)).addScaledVector(SYS.e2, 3.844e8 * Math.sin(th)); }
// the bodies of a system you can fly to: sel -1 the star, 0, 1, 2 ... its planets, -2 our Moon. Masses (GM, m^3/s^2) are real for our
// system; for generated planets they follow from the size and a density (rocky 5,500 kg/m^3). Rotation periods in days (negative:
// backwards); a planet very close to its star is tidally locked. Atmospheres: surface density, scale height, sky colours, haze distance.
const SOL_GM = { Mercury: 2.2032e13, Venus: 3.24859e14, Earth: 3.986004e14, Mars: 4.282837e13, Jupiter: 1.26687e17, Saturn: 3.7931e16, Uranus: 5.794e15, Neptune: 6.8365e15 }, MOON_GM = 4.9048695e12, G_N = 6.674e-11;
const DENS = { gas: 1300, saturn: 700, ice: 1600, nep: 1640 }, SOL_ROT = { Mercury: 58.646, Venus: -243.02, Earth: 1, Mars: 1.0275, Jupiter: 0.41354, Saturn: 0.44401, Uranus: -0.71833, Neptune: 0.67125 };
const EARTHLIKE = { rho: 1.225, H: 8500, zen: [0.16, 0.38, 0.78], hor: [0.66, 0.78, 0.92], sky: 1, vis: 60000 };
const ATM = { earth: EARTHLIKE, temperate: EARTHLIKE, ocean: EARTHLIKE, mars: { rho: 0.020, H: 11100, zen: [0.55, 0.42, 0.3], hor: [0.85, 0.68, 0.5], sky: 0.97, vis: 40000 },
  venus: { rho: 65, H: 15900, h1: 60000, H2: 5000, zen: [0.42, 0.3, 0.14], hor: [0.62, 0.46, 0.24], sky: 1, vis: 4000, cloud: 48000 } };
const SOLID = { rock: 1, lava: 1, mars: 1, venus: 1, temperate: 1, ocean: 1, earth: 1, moon: 1 };
function bodyInfo(sel) { const S = SYS.S; if (sel === -1) return { sel, name: S.name.split(" (")[0], R: S.radius, GM: 1.32712e20 * S.mass, axis: SYS.n, rot: 25, kind: S.bh ? "black hole" : "star", star: true };
  if (sel === -2) return { sel, name: "the Moon", R: 1.7374e6, GM: MOON_GM, axis: SYS.n, rot: 27.3217, kind: "moon", spin0: Math.PI, solid: true, atm: null };
  const p = SYS.planets[sel]; return { sel, name: p.name, R: p.radius, GM: SOL_GM[p.name] ?? G_N * (DENS[p.kind] || (p.kind === "hot" ? 900 : 5500)) * 4 / 3 * Math.PI * p.radius ** 3, axis: p.kind === "earth" ? V3(0, 0, 1) : SYS.n, rot: p.rot, kind: p.kind, atm: ATM[p.kind] || null, solid: !!SOLID[p.kind], p }; }
const bodySpin = (B, ms) => 2 * Math.PI * (ms - J2000) / 864e5 / B.rot + (B.spin0 || 0);
const bodyPosM = (sel, ms) => sel === -1 ? V3(0, 0, 0) : sel === -2 ? planetPos(SYS.planets.find(p => p.name === "Earth"), ms).add(moonPos(ms)) : planetPos(SYS.planets[sel], ms);
// the body's equatorial plane: E1, E2 (a point at angle th there is at E1 cos th + E2 sin th; the body turns toward +th), and its orientation
const qAxis = A => new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), A.clone().normalize());
const bodyBasis = B => { const q = qAxis(B.axis); return [V3(1, 0, 0).applyQuaternion(q), V3(0, 0, -1).applyQuaternion(q)]; };
const bodyQ = (B, ms) => qAxis(B.axis).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), bodySpin(B, ms)));
const sysList = () => SYS ? [-1, ...SYS.planets.map((p, k) => k), ...(SYS.moon ? [-2] : [])] : [-1];
let shipRelM = null;   // the ship's position in metres from the current system's star, when in a system (kept apart from light years for precision)
// draw each body from the ship: rel = body - ship (metres, equatorial)
function placeBody(mesh, rel, radius, spin) { const d = rel.length(); mesh.userData.dist = d; if (d < radius * 1.01 || !isFinite(d)) { mesh.visible = false; return; } const v = rel.clone().applyMatrix3(R_EQ2SHIP).normalize(), rr = BODY_R * clampN(0.12 + 0.88 * (Math.log10(d) - 6) / 12, 0.08, 1); mesh.visible = true; mesh.position.copy(v).multiplyScalar(rr); mesh.scale.setScalar(rr * radius / d); if (spin !== undefined) mesh.quaternion.copy(Q_E2S).multiply(qAxis(mesh.userData.axis || SYS.n)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), spin)); return v; }
function updateSystem(shipPos, ms) { if (!SYS) return; const S = SYS.S, starRel = shipRelM ? shipRelM.clone().negate() : V3((S.p[0] - shipPos[0]) * LY, (S.p[1] - shipPos[1]) * LY, (S.p[2] - shipPos[2]) * LY), near = starRel.length() < 0.2 * LY;
  for (const o of LOCAL.children) o.visible = near; if (!near) return -1;
  const sv = placeBody(SYS.starMesh, starRel, S.radius); if (sv) { starLight.position.copy(sv).multiplyScalar(100); starLight.intensity = S.bh ? 0.4 : 2.6; const ang = S.radius / starRel.length(); SYS.glow.position.copy(SYS.starMesh.position); SYS.glow.scale.setScalar(SYS.starMesh.position.length() * Math.max(ang * 10, 0.012)); }
  if (SYS.disk) { SYS.disk.position.copy(SYS.starMesh.position); SYS.disk.scale.setScalar(SYS.starMesh.scale.x); SYS.disk.lookAt(SYS.disk.position.clone().add(SYS.n.clone().applyMatrix3(R_EQ2SHIP))); }
  const spin = (ms - J2000) / 864e5 * 2 * Math.PI;
  for (const p of SYS.planets) { const rel = starRel.clone().add(planetPos(p, ms)), v = placeBody(p.mesh, rel, p.radius, bodySpin(p, ms)); if (p.ring) { p.ring.visible = !!v; if (v) { p.ring.position.copy(p.mesh.position); p.ring.scale.setScalar(p.mesh.scale.x); p.ring.lookAt(p.ring.position.clone().add(SYS.n.clone().applyMatrix3(R_EQ2SHIP))); } } }
  if (SYS.moon) { const E = SYS.planets.find(p => p.name === "Earth"); placeBody(SYS.moon.mesh, starRel.clone().add(planetPos(E, ms)).add(moonPos(ms)), SYS.moon.radius, bodySpin({ rot: 27.3217, spin0: Math.PI }, ms)); }
  return starRel.length() < 0.01 * LY ? S.i : -1; }

// ---------- the ship ----------
// A tower ship: under constant 1 g thrust "down" is always toward the engine, so the decks are stacked like the floors of a building,
// bow (+y) at the top. The crew section, 22 m across, holds the habitat deck and the bridge, with the cupola, an observation room of
// framed windows like the ISS's, on its roof. Below it (not visible from inside) a long spine carries the hydrogen tanks, the magnetic
// antimatter traps, the radiators and, 600 m aft, the engine; the forward hull carries the radiation shield.
const SHIP = new THREE.Group(); scene.add(SHIP);
const HULL_R = 11, CUP_R = 5.0, DECKS = [{ name: "the habitat deck", y: -5 }, { name: "the bridge", y: 0 }, { name: "the cupola", y: 25 }, { name: "the hangar", y: -12 }], DECK_ORDER = [3, 0, 1, 2];
// surfaces: light grey wall panels with seams and fasteners, non-slip floor plates, ceiling light panels
const panelT = tex(512, 512, (g, w, h) => { g.fillStyle = "#c4c8cc"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 256) { g.fillStyle = (x + y) % 384 ? "#cdd1d4" : "#bfc3c7"; g.fillRect(x + 3, y + 3, 250, 122); g.strokeStyle = "#8a9096"; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, 252, 124);
    g.fillStyle = "#7a8086"; for (const [fx, fy] of [[10, 10], [244, 10], [10, 118], [244, 118]]) { g.beginPath(); g.arc(x + fx, y + fy, 3, 0, 6.28); g.fill(); } } g.fillStyle = "#5a6066"; g.font = "600 13px Helvetica"; g.fillText("P-117", 20, 40); g.fillText("O2 / N2", 280, 168); });
panelT.wrapS = panelT.wrapT = THREE.RepeatWrapping;
const floorT = tex(512, 512, (g, w, h) => { g.fillStyle = "#4e545a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.strokeStyle = "#3a3e44"; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, 124, 124); g.fillStyle = "#585e64"; for (let k = 0; k < 36; k++) { g.beginPath(); g.arc(x + 12 + (k % 6) * 20, y + 12 + Math.floor(k / 6) * 20, 2.2, 0, 6.28); g.fill(); } } });
floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(6, 6);
const ceilT = tex(256, 256, (g, w, h) => { g.fillStyle = "#d4d8dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a8aeb4"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); }); ceilT.wrapS = ceilT.wrapT = THREE.RepeatWrapping; ceilT.repeat.set(10, 10);
const mWall = new THREE.MeshStandardMaterial({ map: panelT, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide }), mFloor = new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.9 }), mCeil = new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.8, side: THREE.DoubleSide });
const mPanel = M(0x2a2e34, { roughness: 0.6 }), mDesk = M(0x8a9096, { metalness: 0.3, roughness: 0.55 }), mRail = M(0xc8b46a, { metalness: 0.6, roughness: 0.35 }), mSeat = M(0x3a4048, { roughness: 0.9 }), mWhite = M(0xe2e4e6, { roughness: 0.7 }), mFrame = M(0x4a4e54, { metalness: 0.6, roughness: 0.4 });
const mGlass = new THREE.MeshPhysicalMaterial({ color: 0xa8c0d0, transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
let PARENT = SHIP; const add = (geo, mat, x, y, z, ry = 0, parent = PARENT) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
function signTex(lines, w = 512, h = 128, bg = "#1a1e22", fg = "#d8dde2", font = 44) { return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `600 ${font}px Helvetica, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; const L = [].concat(lines); L.forEach((t, i) => g.fillText(t, w / 2, h / 2 + (i - (L.length - 1) / 2) * font * 1.15)); }); }
// small stencilled labels, as on a real spacecraft
const plaque = (lines, x, y, z, ry, w = 0.7, h = 0.16) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTex(lines, 512, Math.round(512 * h / w), "#e4e6e8", "#22262a", Math.round(512 * h / w * 0.55)), toneMapped: false }), x, y, z, ry);
const OBST = [[], [], [], []]; const obst = (deck, x, z, w, d) => OBST[deck].push([x, z, w / 2 + 0.25, d / 2 + 0.25]);
// the lift: an enclosed shaft through the decks, its door facing forward (-z) on every deck
const LIFT_R = 1.4, DOOR = 0.42;
const walkable = (deck, x, z) => { const r = Math.hypot(x, z), lim = deck === 2 ? CUP_R - 0.55 : HULL_R - 0.6; if (r > lim) return false;
  if (deck !== 2 && r > LIFT_R - 0.25 && r < LIFT_R + 0.25 && Math.abs(Math.atan2(x, z)) < Math.PI - DOOR * 0.8) return false; return !OBST[deck].some(([ox, oz, hw, hd]) => Math.abs(x - ox) < hw && Math.abs(z - oz) < hd); };
{ for (const D of DECKS) add(new THREE.CircleGeometry(LIFT_R - 0.05, 32), mFloor, 0, D.y + 0.012, 0).rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(LIFT_R, LIFT_R, 17, 40, 1, true, Math.PI + DOOR, Math.PI * 2 - 2 * DOOR), mWall, 0, -3.5, 0);
  { const r = add(new THREE.TorusGeometry(LIFT_R + 0.05, 0.03, 6, 48, Math.PI * 2 - 2 * DOOR), mRail, 0, DECKS[2].y + 1.0, 0); r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.PI / 2 + DOOR; for (let k = 0; k < 8; k++) { const a = DOOR + (k + 0.5) / 8 * (Math.PI * 2 - 2 * DOOR) + Math.PI; box(0.04, 1.0, 0.04, mRail, Math.sin(a) * (LIFT_R + 0.05), DECKS[2].y, Math.cos(a) * (LIFT_R + 0.05)); } }
  for (const D of DECKS.filter((D, i) => i !== 2)) { add(new THREE.CircleGeometry(LIFT_R - 0.05, 32), mFloor, 0, D.y + 0.01, 0).rotation.x = -Math.PI / 2; for (const s of [-1, 1]) box(0.12, 2.2, 0.15, mFrame, s * Math.sin(DOOR) * LIFT_R, D.y, -Math.cos(DOOR) * LIFT_R); box(Math.sin(DOOR) * LIFT_R * 2 + 0.2, 0.25, 0.15, mFrame, 0, D.y + 2.2, -Math.cos(DOOR) * LIFT_R);
    plaque(["LIFT"], 0, D.y + 2.6, -LIFT_R - 0.02, Math.PI, 0.5, 0.14); } }
// the hull: the outer wall panelled inside, floors, ceilings with light panels, handrails, lockers, cable trays
{ add(new THREE.CylinderGeometry(HULL_R, HULL_R, 17.05, 72, 1, true), mWall, 0, -3.525, 0).material.map.repeat.set(26, 8.5);
  const ring = (y0, r0, r1, mat, up) => { const f = add(new THREE.RingGeometry(r0, r1, 72, 1), mat, 0, y0, 0); f.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; return f; };
  ring(-5, LIFT_R, HULL_R, mFloor, true); ring(-1.4, LIFT_R, HULL_R, mCeil, false); ring(0, LIFT_R, HULL_R, mFloor, true); ring(3.6, LIFT_R, HULL_R, mCeil, false);
  ring(-12, LIFT_R, HULL_R, mFloor, true); ring(-5.05, LIFT_R, HULL_R, mCeil, false); add(new THREE.CircleGeometry(HULL_R + 0.2, 72), M(0x5a6068, { metalness: 0.5 }), 0, -12.1, 0).rotation.x = Math.PI / 2;
  ring(5, LIFT_R + 0.3, HULL_R + 0.2, M(0x8a9096, { metalness: 0.4 }), true);
  // the outside of the crew section, seen from the cupola: the hull's outer skin, a rim, and hatches and radiator panels on the roof
  const mOut = M(0x9aa0a6, { metalness: 0.5, roughness: 0.5 }); add(new THREE.CylinderGeometry(HULL_R + 0.2, HULL_R + 0.2, 17.25, 72, 1, true), mOut, 0, -3.525, 0);
  const rim = add(new THREE.TorusGeometry(HULL_R + 0.2, 0.18, 8, 96), mOut, 0, 5.05, 0); rim.rotation.x = Math.PI / 2;
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; box(1.4, 0.12, 3.2, M(0x5a6068, { metalness: 0.6 }), Math.sin(a) * 7.5, 5, Math.cos(a) * 7.5, a); box(0.9, 0.2, 0.9, mOut, Math.sin(a + 0.52) * 4.5, 5, Math.cos(a + 0.52) * 4.5, a); }
  const ledM = new THREE.MeshBasicMaterial({ color: 0xf4f6ff }); for (const y of [-1.42, 3.58, -5.07]) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, l = add(new THREE.PlaneGeometry(1.6, 0.4), ledM, Math.cos(a) * 6, y, Math.sin(a) * 6, -a); l.rotation.x = Math.PI / 2; l.rotation.order = "YXZ"; l.rotation.y = -a; }
  for (const D of DECKS.filter((D, i) => i !== 2)) { const hr = add(new THREE.TorusGeometry(HULL_R - 0.18, 0.025, 6, 96), mRail, 0, D.y + 1.05, 0); hr.rotation.x = Math.PI / 2; const tray = add(new THREE.TorusGeometry(HULL_R - 0.3, 0.12, 4, 96), mPanel, 0, D.y + (D.y < 0 ? 3.3 : 3.35), 0); tray.rotation.x = Math.PI / 2; } }
const canWalk = (x, z) => PLACE === "ship" ? walkable(P_.deck, x, z) : PLACE === "lander" ? Math.hypot(x, z) < 1.85 && !LOBST.some(([ox, oz, hw, hd]) => Math.abs(x - ox) < hw && Math.abs(z - oz) < hd) : Math.hypot(x, z) > 3.9 && Math.hypot(x, z) < 400;
const deckOf = y => DECKS.reduce((b, D, i) => Math.abs(D.y - y) < Math.abs(DECKS[b].y - y) ? i : b, 0);
// screens: canvases on framed displays
const SCREENS = {}; const screen = (key, w, h, cw, ch, x, y, z, ry, tilt = 0) => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), x, y, z, ry); m.rotation.order = "YXZ"; m.rotation.x = tilt; m.rotation.y = ry;
  const f = add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05), mPanel, x - Math.sin(ry) * Math.cos(tilt) * 0.03, y - Math.sin(-tilt) * 0.03, z - Math.cos(ry) * Math.cos(tilt) * 0.03, ry); f.rotation.order = "YXZ"; f.rotation.x = tilt; f.rotation.y = ry;
  return SCREENS[key] = { c, g: c.getContext("2d"), t, w: cw, h: ch, m }; };
// buttons you press: by clicking, or with the VR controller's ray and trigger
const BUTTONS = [];
function button(label, x, y, z, ry, tilt, onPick, w = 0.5, h = 0.18, col = "#2a3a48") { const cw = Math.round(clampN(256 * w / 0.5, 256, 1024)), m = add(new THREE.BoxGeometry(w, h, 0.04), new THREE.MeshBasicMaterial({ map: signTex(label, cw, Math.round(cw * h / w), col, "#eef2f6", Math.round(cw * h / w * 0.42)), toneMapped: false }), x, y, z, ry); m.rotation.order = "YXZ"; m.rotation.x = tilt; m.rotation.y = ry; m.userData.onPick = onPick; BUTTONS.push(m); return m; }
// the bridge: the trip computer on the forward console, the autopilot and navigation stations before two seats, propulsion and ship-systems stations at the sides
{ screen("trip", 4.4, 2.4, 1600, 872, 0, 2.15, -9.6, 0);
  box(6.6, 0.95, 0.9, mDesk, 0, 0, -9.3); obst(1, 0, -9.3, 6.6, 0.9); box(5.8, 0.05, 0.4, mPanel, 0, 0.95, -9.15);
  for (const [x, ry, key, lab] of [[-2.6, 0.22, "auto", "AUTOPILOT"], [2.6, -0.22, "nav", "NAVIGATION"]]) { box(2.0, 0.85, 0.95, mDesk, x, 0, -6.4, ry); obst(1, x, -6.4, 2.0, 1.0); screen(key, 1.6, 1.07, 1200, 800, x + Math.sin(ry) * 0.3, 1.45, -6.75 + Math.cos(ry) * 0.0, ry, -0.32); plaque([lab], x + Math.sin(ry) * 0.42, 2.12, -6.82, ry, 0.7, 0.13);
    const sx = x, sz = -4.9; box(0.62, 0.48, 0.62, mSeat, sx, 0, sz); box(0.62, 0.95, 0.14, mSeat, sx, 0.48, sz + 0.3); box(0.36, 0.26, 0.12, mSeat, sx, 1.43, sz + 0.3); for (const s of [-1, 1]) box(0.08, 0.2, 0.5, mSeat, sx + s * 0.34, 0.6, sz); obst(1, sx, sz, 0.7, 0.75); }
  for (const [x, ry, key, lab] of [[8.4, -1.25, "eng", "PROPULSION"], [-8.4, 1.25, "ship", "SHIP SYSTEMS"]]) { screen(key, 2.2, 1.24, 1280, 720, x, 1.75, -2.7, ry); box(2.4, 0.9, 0.7, mDesk, x - Math.sin(ry) * 0.5, 0, -2.7 - Math.cos(ry) * 0.5, ry); obst(1, x - Math.sin(ry) * 0.5, -2.7 - Math.cos(ry) * 0.5, 1.2, 1.2); plaque([lab], x + Math.sin(ry) * 0.05, 2.55, -2.7 + Math.cos(ry) * 0.05, ry, 0.8, 0.14); }
  plaque(["TRIP COMPUTER"], 0, 3.45, -9.62, 0, 1.0, 0.16);
  for (let k = 0; k < 6; k++) { const a = Math.PI * 0.2 + k * 0.12; box(0.9, 2.2, 0.55, mWhite, Math.cos(a) * 10.4, 0, Math.sin(a) * 10.4, -a + Math.PI / 2); } }
// the habitat deck: four cabins, the galley, a hydroponic garden, an exercise area and a sick bay round the lift
{ const y = -5, wallRun = (x0, z0, x1, z1, gaps = []) => { const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0); let s = 0; for (const [g0, g1] of [...gaps, [L, L]]) { if (g0 > s) { const m = (s + g0) / 2, cx = x0 + (x1 - x0) * m / L, cz = z0 + (z1 - z0) * m / L; box(0.1, 2.4, g0 - s, mWall, cx, y, cz, ry); OBST[0].push([cx, cz, Math.abs(Math.cos(ry)) * 0.3 + Math.abs(Math.sin(ry)) * (g0 - s) / 2, Math.abs(Math.sin(ry)) * 0.3 + Math.abs(Math.cos(ry)) * (g0 - s) / 2]); } s = g1; } };
  // cabins along the aft side: each 3 m wide with a bunk, a desk and a locker
  for (let k = 0; k < 4; k++) { const x0 = -6 + k * 3; wallRun(x0, 3.2, x0, 9.0); if (k === 3) wallRun(x0 + 3, 3.2, x0 + 3, 9.0); wallRun(x0, 3.2, x0 + 3, 3.2, [[0.9, 2.1]]); box(2.0, 0.5, 0.9, M(0x5a6a80), x0 + 1.5, y, 7.6); box(2.0, 0.1, 0.9, mWhite, x0 + 1.5, y + 0.5, 7.6); obst(0, x0 + 1.5, 7.6, 2.0, 0.9); box(0.8, 0.75, 0.5, mDesk, x0 + 2.4, y, 4.2); plaque([`CABIN ${k + 1}`], x0 + 1.5, y + 2.0, 3.14, Math.PI, 0.55, 0.13); }
  // the galley: counter and cabinets, a table with fixed seats
  box(4.0, 0.92, 0.65, mWhite, -7.8, y, -3.2, Math.PI / 2); obst(0, -7.8, -3.2, 0.7, 4.0); box(4.0, 0.9, 0.5, mWhite, -8.3, y + 1.5, -3.2, Math.PI / 2); plaque(["GALLEY"], -7.55, y + 2.6, -3.2, Math.PI / 2, 0.6, 0.14);
  box(2.4, 0.06, 1.0, mDesk, -4.6, y + 0.72, -4.2); box(0.15, 0.72, 0.15, mDesk, -4.6, y, -4.2); obst(0, -4.6, -4.2, 2.4, 1.0); for (const s of [-1, 1]) box(2.2, 0.45, 0.4, mSeat, -4.6, y, -4.2 + s * 0.8);
  // hydroponics: shelving in tiers under LED growth lights
  plaque(["HYDROPONICS"], 5.5, y + 2.6, -8.9, 0, 0.8, 0.14); const leaf = M(0x4a8a3a, { roughness: 0.9 }), led = new THREE.MeshBasicMaterial({ color: 0xffe0f0 });
  for (let r = 0; r < 3; r++) { const x = 3.2 + r * 1.6; box(0.7, 2.2, 3.6, mDesk, x, y, -6.4); obst(0, x, -6.4, 0.8, 3.6); for (const ty of [0.6, 1.3, 2.0]) { for (let k = 0; k < 7; k++) add(new THREE.SphereGeometry(0.16, 8, 6), leaf, x, y + ty + 0.1, -8.0 + k * 0.5); add(new THREE.BoxGeometry(0.4, 0.03, 3.4), led, x, y + ty + 0.5, -6.4); } }
  // exercise: a treadmill with its bungee harness, a cycle ergometer, a resistance machine
  plaque(["EXERCISE"], 9.0, y + 2.6, -1.4, -Math.PI / 2, 0.6, 0.14); box(0.8, 0.2, 2.0, mPanel, 7.6, y, 0.6); box(0.8, 1.1, 0.08, mPanel, 7.6, y, -0.4); obst(0, 7.6, 0.6, 0.9, 2.1); box(0.5, 0.9, 1.0, mPanel, 6.0, y, 2.2); obst(0, 6.0, 2.2, 0.6, 1.1);
  // the sick bay
  plaque(["MEDICAL"], 4.0, y + 2.6, 3.14, Math.PI, 0.55, 0.14); box(2.0, 0.8, 0.8, mWhite, 7.0, y, 5.0, Math.PI / 6); obst(0, 7.0, 5.0, 2.1, 1.1); box(0.6, 1.8, 0.4, mWhite, 8.8, y, 3.5, -Math.PI / 3); }
// the cupola: a glass bubble 10.4 m across, held 20 m above the roof on a neck that carries the lift, so that only the ship below blocks
// the view (a cone some 30 degrees round straight down). Its floor is glass too, on a frame of spokes and rings.
{ const y = DECKS[2].y, RB = 5.2, yc = y + 1.4, NECK_R = LIFT_R + 0.3, mOut = M(0x9aa0a6, { metalness: 0.5, roughness: 0.5 });
  add(new THREE.CylinderGeometry(NECK_R, NECK_R * 1.8, y - 5, 32, 1, true), mOut, 0, (y + 5) / 2, 0);
  add(new THREE.SphereGeometry(RB, 64, 40), mGlass, 0, yc, 0);
  // the frame: eight ribs from bottom to top and rings of latitude, the heaviest at the floor
  // ribs run from the bottom to the top ring, leaving a clear round window overhead
  for (let k = 0; k < 8; k++) { const rib = add(new THREE.TorusGeometry(RB + 0.02, 0.06, 6, 48, Math.PI / 2 + Math.asin(4.3 / RB)), mFrame, 0, yc, 0); rib.rotation.order = "YXZ"; rib.rotation.y = k * Math.PI / 4; rib.rotation.z = -Math.PI / 2; }
  for (const [h, t] of [[-3.6, 0.1], [-2.6, 0.06], [-1.4, 0.14], [0.6, 0.06], [2.6, 0.06], [4.3, 0.08]]) { const r = Math.sqrt(RB * RB - h * h), g = add(new THREE.TorusGeometry(r + 0.02, t, 6, 96), mFrame, 0, yc + h, 0); g.rotation.x = Math.PI / 2; }
  // the glass floor, on spokes and rings
  const mFG = new THREE.MeshPhysicalMaterial({ color: 0x9ab8cc, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const fl = add(new THREE.CircleGeometry(Math.sqrt(RB * RB - 1.96), 64), mFG, 0, y - 0.01, 0); fl.rotation.x = -Math.PI / 2;
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, r0 = NECK_R, r1 = Math.sqrt(RB * RB - 1.96), rm = (r0 + r1) / 2; box(0.08, 0.08, r1 - r0, mFrame, Math.sin(a) * rm, y - 0.1, Math.cos(a) * rm, a); }
  for (const r of [NECK_R, 2.6, 3.8]) { const g = add(new THREE.TorusGeometry(r, 0.05, 6, 64), mFrame, 0, y - 0.05, 0); g.rotation.x = Math.PI / 2; }
  // two reclining couches for looking up, a handrail round the room, a small workstation
  for (const s of [-1, 1]) { const cx = s * 1.9, cz = 1.6; box(0.7, 0.4, 1.9, mSeat, cx, y, cz); const back = box(0.7, 0.1, 1.2, mSeat, cx, y + 0.55, cz - 1.2); back.rotation.x = -0.7; obst(2, cx, cz - 0.3, 0.8, 2.4); }
  const hr = add(new THREE.TorusGeometry(CUP_R - 0.35, 0.025, 6, 64), mRail, 0, y + 1.0, 0); hr.rotation.x = Math.PI / 2;
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; box(0.04, 1.0, 0.04, mRail, Math.sin(a) * (CUP_R - 0.35), y, Math.cos(a) * (CUP_R - 0.35)); }
  box(1.2, 0.85, 0.5, mDesk, -3.0, y, -3.0, Math.PI / 4); obst(2, -3.0, -3.0, 1.0, 1.0); plaque(["CUPOLA"], -3.0 + 0.18, y + 1.0, -3.0 + 0.18, Math.PI / 4, 0.5, 0.12); }
// the hangar, under the habitat deck: the lander on its pad, the bay doors in the hull beyond it, suit lockers and tool racks
{ const y = DECKS[3].y, mStripe = new THREE.MeshBasicMaterial({ map: tex(256, 32, (g, w, h) => { for (let x = -h; x < w; x += 32) { g.fillStyle = "#e8b820"; g.fillRect(0, 0, w, h); } for (let x = -h; x < w + h; x += 32) { g.fillStyle = "#1a1a1a"; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); } }), toneMapped: false });
  const pad = add(new THREE.RingGeometry(4.0, 4.25, 64), new THREE.MeshBasicMaterial({ color: 0xe8b820, toneMapped: false }), 0, y + 0.01, 7.0); pad.rotation.x = -Math.PI / 2;
  // the bay doors: two leaves in the hull ahead of the lander, with hazard stripes round them
  for (const s of [-1, 1]) box(3.0, 5.6, 0.2, M(0x6a7078, { metalness: 0.5, roughness: 0.5 }), s * 1.52, y + 0.2, 10.75);
  for (const [w, h, x, yy] of [[6.4, 0.25, 0, y + 5.8], [6.4, 0.25, 0, y], [0.25, 6.0, -3.2, y], [0.25, 6.0, 3.2, y]]) { const b = box(w, h, 0.05, mStripe, x, yy, 10.62); }
  plaque(["BAY DOORS · LANDER 1"], 0, y + 6.3, 10.6, Math.PI, 1.4, 0.16);
  // suit lockers and racks round the walls
  for (let k = 0; k < 4; k++) { const a = Math.PI * 1.15 + k * 0.16; box(0.9, 2.1, 0.6, mWhite, Math.cos(a) * 10.4, y, Math.sin(a) * 10.4, -a + Math.PI / 2); } plaque(["EVA SUITS"], Math.cos(Math.PI * 1.39) * 10.05, y + 2.4, Math.sin(Math.PI * 1.39) * 10.05, -Math.PI * 1.39 - Math.PI / 2, 0.6, 0.14);
  for (let k = 0; k < 3; k++) { const a = -Math.PI * 0.15 - k * 0.2; box(1.4, 1.6, 0.5, mPanel, Math.cos(a) * 10.5, y, Math.sin(a) * 10.5, -a + Math.PI / 2); }
  obst(3, 0, 7.0, 7.4, 7.4); plaque(["HANGAR"], 0, y + 2.6, -LIFT_R - 0.02, Math.PI, 0.6, 0.14); }
// the lander: a squat vertical lander, a cabin with windows all round over its propellant tanks, heat shield and antimatter engine, on
// four legs. Its origin is the cabin floor, 3.4 m above its footpads.
const CAB_H = 3.4, CAB_R = 2.3, LANDER = new THREE.Group(); LANDER.position.set(0, DECKS[3].y + CAB_H, 7.0); SHIP.add(LANDER); PARENT = LANDER;
const lbox = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, 0, parent);
const strut = (A, Bp, r, mat) => { const L = A.distanceTo(Bp), m = add(new THREE.CylinderGeometry(r, r, L, 8), mat, (A.x + Bp.x) / 2, (A.y + Bp.y) / 2, (A.z + Bp.z) / 2); m.quaternion.setFromUnitVectors(V3(0, 1, 0), Bp.clone().sub(A).normalize()); return m; };
const LOBST = [[0.6, -0.3, 0.5, 0.5], [-0.6, -0.3, 0.5, 0.5], [0, 1.45, 1.1, 0.4]];
let HATCH = null, PLUME = null;
{ const mHull = M(0xd8dadc, { metalness: 0.3, roughness: 0.5 }), mShield = M(0x2a2420, { roughness: 0.95 }), mLeg = M(0x9a9ea4, { metalness: 0.7, roughness: 0.35 }), mFoil = M(0xc8a040, { metalness: 0.8, roughness: 0.3 }), n = 8, wl = 2 * CAB_R * Math.tan(Math.PI / n);
  // the cabin's eight sides: a window in each (0.9 to 1.8 m up), but the hatch side (facing -z)
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, g = new THREE.Group(); g.position.set(Math.sin(a) * CAB_R, 0, Math.cos(a) * CAB_R); g.rotation.y = a; LANDER.add(g);
    for (const s of [-1, 1]) lbox(0.1, 2.4, 0.16, mFrame, s * wl / 2, 0, 0, g);
    if (k === 4) { lbox(wl, 0.4, 0.12, mWall, 0, 2.0, 0, g); HATCH = lbox(wl - 0.1, 2.0, 0.08, mHull, 0, 0, 0.02, g); add(new THREE.PlaneGeometry(0.3, 0.3), mGlass, 0, 1.5, 0.07, 0, g); }
    else { lbox(wl, 0.9, 0.12, mWall, 0, 0, 0, g); lbox(wl, 0.6, 0.12, mWall, 0, 1.8, 0, g); add(new THREE.PlaneGeometry(wl, 0.9), mGlass, 0, 1.35, 0, 0, g); for (const yy of [0.9, 1.8]) lbox(wl, 0.06, 0.16, mFrame, 0, yy - 0.03, 0, g); } }
  const oct = (r, y, mat, up) => { const m = add(new THREE.CircleGeometry(r / Math.cos(Math.PI / n), n, Math.PI / n), mat, 0, y, 0); m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; return m; };
  oct(CAB_R, 0.01, mFloor, true); oct(CAB_R, 2.4, mCeil, false); oct(CAB_R + 0.1, -0.02, mHull, false);
  add(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ color: 0xf4f6ff }), 0, 2.38, 0).rotation.x = Math.PI / 2;
  const roof = add(new THREE.ConeGeometry(CAB_R / Math.cos(Math.PI / n) + 0.06, 0.9, n), mHull, 0, 2.85, 0); roof.rotation.y = Math.PI / n; add(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 24), mLeg, 0, 3.35, 0);
  // below: propellant tanks in gold foil, the heat shield, the engine bell, and the exhaust plume when it fires
  add(new THREE.CylinderGeometry(2.45, 2.6, 2.0, 32), mFoil, 0, -1.0, 0); add(new THREE.CylinderGeometry(2.75, 2.75, 0.25, 48), mShield, 0, -2.12, 0);
  add(new THREE.CylinderGeometry(0.35, 0.95, 0.9, 24, 1, true), M(0x3a3e44, { metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide }), 0, -2.7, 0);
  PLUME = add(new THREE.ConeGeometry(0.85, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9ab8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 0, -3.65, 0); PLUME.rotation.x = Math.PI; PLUME.visible = false;
  // four legs, each with a footpad, and a ladder down from the hatch
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), foot = V3(3.5 * sn, -3.32, 3.5 * c); strut(V3(2.5 * sn, -0.6, 2.5 * c), foot, 0.09, mLeg); strut(V3(2.65 * sn, -2.0, 2.65 * c), foot, 0.07, mLeg); add(new THREE.CylinderGeometry(0.4, 0.45, 0.1, 16), mLeg, foot.x, -3.35, foot.z); }
  for (const s of [-1, 1]) strut(V3(s * 0.35, 0, -2.45), V3(s * 0.35, -3.4, -3.35), 0.03, mLeg); for (let k = 1; k < 11; k++) { const f = k / 11; lbox(0.7, 0.03, 0.03, mLeg, 0, -3.4 * f, -2.45 - 0.9 * f); }
  box(0.08, 1.2, 0.08, mLeg, 0.95, -3.4, -3.7); button("BOARD LANDER", 0.95, -2.1, -3.72, Math.PI, 0, () => board(), 0.55, 0.16, "#2a4a3a");
  // inside: two seats facing the console (+z), its screen, and its buttons
  for (const s of [-1, 1]) { box(0.55, 0.45, 0.55, mSeat, s * 0.6, 0, -0.3); box(0.55, 0.9, 0.12, mSeat, s * 0.6, 0.45, -0.6); }
  box(1.9, 0.85, 0.5, mDesk, 0, 0, 1.45); screen("lander", 1.05, 0.62, 1300, 768, 0, 1.2, 1.62, Math.PI, -0.3); plaque(["LANDER 1"], 0, 2.05, 2.2, Math.PI, 0.5, 0.12);
  const cb = (u, v, label, fn, w = 0.42, col) => button(label, -u, 0.875, 1.45 - v, Math.PI, -1.3, fn, w, 0.15, col);
  cb(-0.76, 0.18, "TIME −", () => { warpI = Math.max(0, warpI - 1); LAND.userWarp = true; }, 0.34); cb(-0.38, 0.18, "LAND", () => startLanding(), 0.34, "#6a2a22"); cb(0, 0.18, "LAUNCH", () => launchLander(), 0.34, "#2a4a6a");
  cb(0.38, 0.18, "GO OUT", () => exitLander(), 0.34, "#2a4a3a"); cb(0.76, 0.18, "TIME +", () => { warpI = Math.min(WARPS.length - 1, warpI + 1); LAND.userWarp = true; }, 0.34);
  const l = new THREE.PointLight(0xf0f4ff, 3, 7, 1.6); l.position.set(0, 2.2, 0); LANDER.add(l); }
PARENT = SHIP;
// light inside: soft white panels; the cupola kept dim so the sky can be seen
const HEMI = new THREE.HemisphereLight(0xdfe6ee, 0x404448, 0.6); scene.add(HEMI); for (const D of DECKS.filter((D, i) => i !== 2)) for (const [x, z] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) { const l = new THREE.PointLight(0xf2f4ff, D.y < -10 ? 22 : 14, 16, 1.6); l.position.set(x, D.y + (D.y < -10 ? 6.6 : 3.2), z); SHIP.add(l); }
{ const l = new THREE.PointLight(0xc8d4e8, 1.5, 8, 2); l.position.set(0, DECKS[2].y + 1.6, 0); SHIP.add(l); }
// ---------- the flight ----------
// Two clocks, both set to the real date and time when the page opens: the ship's own (proper) time, and coordinate time in the rest
// frame of the stars (the galaxy's frame, near enough Earth's). Parked, they run together; under way, coordinate time runs gamma times faster.
const NOW0 = Date.now(); let properMs = NOW0, coordMs = NOW0;
const WARPS = [[1, "real time"], [10, "10 seconds a second"], [60, "1 minute a second"], [3600, "1 hour a second"], [86400, "1 day a second"], [604800, "1 week a second"], [2629800, "1 month a second"], [31557600, "1 year a second"], [315576000, "10 years a second"]];
let warpI = 0, mode = "parked", trip = null, destI = 1, listTop = 0, here = 0, park = null, shipPos = [0, 0, 0], bow = [1, 0, 0], align = null, tripLog = [];
// where to park at a star: in orbit round its most interesting planet (one in the habitable zone if any, else the biggest), or the star.
// A park is a real circular orbit in the body's equatorial plane, going round the way the body turns, at angular speed n = sqrt(GM/r^3).
function mkPark(Si, sel, t0) { const B = bodyInfo(sel), [E1, E2] = bodyBasis(B), S = STARS[Si], k = sel === -1 ? (S.bh ? 40 : S.giant ? 4 : 30) : B.R > 3 * RE ? 4 : 3, r = B.R * k;
  const ts = sel === -1 ? E1.clone() : bodyPosM(sel, t0).negate(), th0 = Math.atan2(ts.dot(E2), ts.dot(E1)) - 1.0;
  return { Si, sel, r, th0, t0, n: Math.sqrt(B.GM / r ** 3), E1, E2 }; }
function parkPlan(Si, ms) { const S = STARS[Si]; if (SYS?.S !== S) buildSystem(S); const P = SYS.planets;
  let p = P.findIndex(q => q.kind === "earth"); if (p < 0) p = P.findIndex(q => q.kind === "temperate" || q.kind === "ocean"); if (p < 0 && P.length) p = P.reduce((b, q, i) => q.radius > P[b].radius ? i : b, 0);
  return mkPark(Si, p, ms); }
const parkOff = (pk, ms) => { const th = pk.th0 + pk.n * (ms - pk.t0) / 1000; return pk.E1.clone().multiplyScalar(pk.r * Math.cos(th)).addScaledVector(pk.E2, pk.r * Math.sin(th)); };
const parkRelM = (pk, ms) => bodyPosM(pk.sel, ms).add(parkOff(pk, ms));
const relToLy = (Si, m) => [STARS[Si].p[0] + m.x / LY, STARS[Si].p[1] + m.y / LY, STARS[Si].p[2] + m.z / LY];
const parkPos = (pk, ms) => relToLy(pk.Si, parkRelM(pk, ms));
// parked, the ship keeps its cupola pointed at the body it orbits
function holdPark() { shipRelM = parkRelM(park, coordMs); shipPos = relToLy(park.Si, shipRelM); const o = parkOff(park, coordMs).negate().normalize(); bow = [o.x, o.y, o.z]; }
function parkAt(Si) { here = Si; park = parkPlan(Si, coordMs); mode = "parked"; trip = null; holdPark(); }
const parkName = () => bodyInfo(park.sel).name;
let autoSys = false, sysI = 0;   // the autopilot's list: the stars, or the bodies of this system
const destName = T => T.local ? T.dname : STARS[T.dest].name;
function engage() { if (mode !== "parked") return say("The autopilot is already flying a course.", 6); if (typeof LAND !== "undefined" && LAND.away) return say("The lander is away; it has to come back first.", 6);
  if (autoSys) return engageLocal();
  if (destI === here) return say("We are already in this system. To fly to one of its planets, press STARS / SYSTEM and choose it.", 7);
  const S = STARS[destI], d0 = Math.hypot(S.p[0] - shipPos[0], S.p[1] - shipPos[1], S.p[2] - shipPos[2]) * LY, est = tripPlan(d0), dpark = parkPlan(destI, coordMs + est.t * 1000);
  const P1 = parkPos(dpark, coordMs + est.t * 1000); buildSystem(STARS[here]); 
  const u = [P1[0] - shipPos[0], P1[1] - shipPos[1], P1[2] - shipPos[2]], L = Math.hypot(...u); u[0] /= L; u[1] /= L; u[2] /= L;
  align = { from: bow.slice(), to: u, t: 0, dur: 20, P1, dest: destI, dpark };
  mode = "align"; say(`Autopilot engaged for <b>${S.name}</b>, ${fmtLy(L)} away. Turning the ship to point at it; then the engine lights and we accelerate at 1 g until the midpoint, turn over, and decelerate at 1 g for the second half.`, 14); }
// within the system: aim at where the body will be when we arrive (found by repeating the estimate), and park in orbit round it
function engageLocal() { const sel = sysList()[sysI]; if (sel === park.sel) return say(`We are already in orbit round ${parkName()}.`, 5);
  let t = 0, dpark = null, R1 = null; for (let k = 0; k < 4; k++) { dpark = mkPark(here, sel, coordMs + t * 1000); R1 = parkRelM(dpark, coordMs + t * 1000); t = tripPlan(R1.distanceTo(shipRelM)).t; }
  const D = R1.distanceTo(shipRelM), uv = R1.clone().sub(shipRelM).normalize(), B = bodyInfo(sel);
  align = { from: bow.slice(), to: [uv.x, uv.y, uv.z], t: 0, dur: 20, P1: relToLy(here, R1), R1, dest: here, dpark, local: true, dname: B.name };
  mode = "align"; say(`Autopilot engaged for <b>${B.name}</b>, ${fmtLy(D / LY)} away. Turning to the course; then 1 g to the midpoint, turnover, and 1 g of braking into orbit round it. The trip: ${fmtDur(tripPlan(D).tau)}.`, 12); }
function startBurn() { const A = align, D = A.local ? A.R1.distanceTo(shipRelM) : Math.hypot(A.P1[0] - shipPos[0], A.P1[1] - shipPos[1], A.P1[2] - shipPos[2]) * LY;
  trip = { P0: shipPos.slice(), P1: A.P1, u: A.to, plan: tripPlan(D), tau: 0, prop0: properMs, coord0: coordMs, dest: A.dest, dpark: A.dpark, flipped: false, switched: false, local: !!A.local, dname: A.dname, R0: A.local ? shipRelM.clone() : null, uv: V3(...A.to) }; mode = "trip"; align = null; if (!trip.local) shipRelM = null;
  say(`Engine lit. Proper acceleration 1.000 g: you feel it as ordinary gravity, toward the decks below. Expected trip: <b>${fmtDur(trip.plan.tau)}</b> by the ship's clock, <b>${fmtDur(trip.plan.t)}</b> by the stars' (and Earth's).`, 14); }
function arrive() { const T = trip; tripLog.push({ from: T.local ? parkName() : STARS[here].name, to: destName(T), tau: T.plan.tau, t: T.plan.t }); if (!T.local) buildSystem(STARS[T.dest]); here = T.dest; park = T.dpark; mode = "parked"; trip = null;
  holdPark(); warpI = Math.min(warpI, 3);
  if (T.local) return say(`In orbit round <b>${parkName()}</b>, ${fmtLy(park.r / LY)} from its centre. ${bodyInfo(park.sel).solid ? "The lander in the hangar (take the lift down) can take you to the surface." : bodyInfo(park.sel).star ? "" : "It has no solid surface to land on."}`, 12);
  say(`Arrived at <b>${STARS[here].name}</b>, in orbit near <b>${parkName()}</b>. ${STARS[here].note} ${SYS.planets.length ? `Planets: ${SYS.planets.map(p => p.name.replace(STARS[here].name.split(" (")[0] + " ", "")).join(", ")} (${SYS.planets[0].known ? "known" : "generated: none are known here"}).` : ""} Look out from the cupola.`, 18); }
function skip(to) { if (mode !== "trip") return say("Engage the autopilot first.", 5); const P = trip.plan; trip.tau = Math.max(trip.tau, to === "turn" ? P.tauH - 120 : P.tau - 6 * 3600); say(to === "turn" ? "Skipping ahead to just before turnover." : "Skipping ahead to six hours (ship time) before arrival.", 6); }
function stepFlight(dt) { if (LAND.away && LAND.s) return stepLander(dt); const w = WARPS[warpI][0], step = dt * w;
  if (mode === "parked") { properMs += step * 1000; coordMs += step * 1000; holdPark(); if (LAND.away && coordMs >= LAND.departAt) undock(); }
  else if (mode === "align") { properMs += dt * 1000; coordMs += dt * 1000; shipRelM = parkRelM(park, coordMs); shipPos = relToLy(park.Si, shipRelM); align.t += dt; const f = Math.min(1, align.t / align.dur), s = f * f * (3 - 2 * f), a = V3(...align.from), b = V3(...align.to), q = new THREE.Quaternion().setFromUnitVectors(a, b), qi = new THREE.Quaternion().slerp(q, s), v = a.clone().applyQuaternion(qi); bow = [v.x, v.y, v.z]; if (f >= 1) startBurn(); }
  else if (mode === "trip") { const T = trip, P = T.plan; T.tau = Math.min(P.tau, T.tau + step); const st = tripState(P, T.tau); T.st = st;
    if (T.local) { shipRelM = T.R0.clone().addScaledVector(T.uv, st.x); shipPos = relToLy(here, shipRelM); } else shipPos = [T.P0[0] + T.u[0] * st.x / LY, T.P0[1] + T.u[1] * st.x / LY, T.P0[2] + T.u[2] * st.x / LY]; properMs = T.prop0 + T.tau * 1000; coordMs = T.coord0 + st.t * 1000;
    bow = st.accel ? T.u : [-T.u[0], -T.u[1], -T.u[2]];
    if (!st.accel && !T.flipped) { T.flipped = true; say("<b>Turnover.</b> At the midpoint the engine shuts down, the ship turns end over end, and the engine lights again pointing ahead: now 1 g of deceleration. The floor is still 'down', but the cupola now faces back the way we came.", 14); }
    if (!T.local && !T.switched && st.x > P.D / 2) { T.switched = true; buildSystem(STARS[T.dest]); }
    if (T.tau >= P.tau) arrive(); } }
// ---------- the lander's flight: Newton's laws, integrated step by step ----------
// Everything happens in the body's equatorial plane (x, y in metres from its centre, the body turning toward +angle at w rad/s): gravity
// GM/r^2, drag from the air (which turns with the body), and the engine, which the autopilot points and throttles, up to 3 g.
// Going down: a Hohmann transfer from the ship's orbit to a low one; where there is air, a small burn to dip into it, entry on the heat
// shield, and the engine lit near the ground; where there is none, powered descent from orbit. Going up: a climb into a low orbit, a wait
// for the ship to come round to the right place, a Hohmann transfer up to it, and a final approach to dock.
const LND = { amax: 29.4, beta: 1800, ld: 0.3 };   // engine: 3 g at most; ballistic coefficient m / (Cd A), kg/m^2, heat shield first; lift / drag in entry
// the air: density falling off exponentially with height (scale height H), above h1 faster (scale height H2), as on Venus
const airRho = (B, h) => { const A = B.atm; if (!A) return 0; h = Math.max(h, 0); return A.h1 && h > A.h1 ? A.rho * Math.exp(-A.h1 / A.H - (h - A.h1) / A.H2) : A.rho * Math.exp(-h / A.H); };
const lowOrbit = B => B.R + (B.atm ? Math.max(150e3, 14 * B.atm.H) : Math.max(15e3, 0.008 * B.R)), entryAlt = B => 5.3 * B.atm.H;
const wrapPi = a => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
// acceleration from gravity and drag; out[2] is the size of the drag
function lnNat(B, x, y, vx, vy, out) { const r = Math.hypot(x, y), g = -B.GM / (r * r * r), rho = airRho(B, r - B.R), ux = vx + B.w * y, uy = vy - B.w * x, u = Math.hypot(ux, uy), k = -0.5 * rho * u / LND.beta;
  out[0] = g * x + k * ux; out[1] = g * y + k * uy; out[2] = -k * u;
  if (B.lift && u > 1) { let px = -uy / u, py = ux / u; if (px * x + py * y < 0) { px = -px; py = -py; } out[0] += B.lift * out[2] * px; out[1] += B.lift * out[2] * py; }   // lift, rolled to point away from the ground
  return out; }
const _la = [0, 0, 0], _lb = [0, 0, 0], _lc = [0, 0, 0], _ld = [0, 0, 0];
// one step of dt seconds with the engine's acceleration (tx, ty) held fixed: fourth-order Runge-Kutta
function lnStep(B, s, tx, ty, dt) { const { x, y, vx, vy } = s;
  lnNat(B, x, y, vx, vy, _la); const k1vx = _la[0] + tx, k1vy = _la[1] + ty, d1 = _la[2];
  lnNat(B, x + vx * dt / 2, y + vy * dt / 2, vx + k1vx * dt / 2, vy + k1vy * dt / 2, _lb); const k2x = vx + k1vx * dt / 2, k2y = vy + k1vy * dt / 2, k2vx = _lb[0] + tx, k2vy = _lb[1] + ty;
  lnNat(B, x + k2x * dt / 2, y + k2y * dt / 2, vx + k2vx * dt / 2, vy + k2vy * dt / 2, _lc); const k3x = vx + k2vx * dt / 2, k3y = vy + k2vy * dt / 2, k3vx = _lc[0] + tx, k3vy = _lc[1] + ty;
  lnNat(B, x + k3x * dt, y + k3y * dt, vx + k3vx * dt, vy + k3vy * dt, _ld); const k4x = vx + k3vx * dt, k4y = vy + k3vy * dt, k4vx = _ld[0] + tx, k4vy = _ld[1] + ty;
  s.x += dt / 6 * (vx + 2 * k2x + 2 * k3x + k4x); s.y += dt / 6 * (vy + 2 * k2y + 2 * k3y + k4y); s.vx += dt / 6 * (k1vx + 2 * k2vx + 2 * k3vx + k4vx); s.vy += dt / 6 * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
  s.t += dt; s.dv += Math.hypot(tx, ty) * dt; s.drag = d1; }
// the orbit's closest and farthest points from the centre (periapsis, apoapsis), from its energy and angular momentum
function apsides(B, s) { const r = Math.hypot(s.x, s.y), E = (s.vx * s.vx + s.vy * s.vy) / 2 - B.GM / r, h = s.x * s.vy - s.y * s.vx; if (E >= 0) return [0, Infinity]; const a = -B.GM / (2 * E), e = Math.sqrt(Math.max(0, 1 + 2 * E * h * h / (B.GM * B.GM))); return [a * (1 - e), a * (1 + e)]; }
// the ship, in its circular orbit (T: radius r, angle th0 at time t0, angular speed n)
const shipAt = (T, t) => { const th = T.th0 + T.n * (t - T.t0), c = Math.cos(th), sn = Math.sin(th); return [T.r * c, T.r * sn, -T.r * T.n * sn, T.r * T.n * c, th]; };
// the autopilot: returns the engine's acceleration for this moment, and moves through the phases
function lnGuide(B, s, T) { const r = Math.hypot(s.x, s.y), rx = s.x / r, ry = s.y / r, tx = -ry, ty = rx, h = r - B.R, amax = LND.amax, retro = k => { const v = Math.hypot(s.vx, s.vy); return [-s.vx / v * k, -s.vy / v * k]; };
  const ux = s.vx + B.w * s.y, uy = s.vy - B.w * s.x, u = Math.hypot(ux, uy), vr = ux * rx + uy * ry, vt = ux * tx + uy * ty, vtIn = s.vx * tx + s.vy * ty, gl = B.GM / (r * r);
  lnNat(B, s.x, s.y, s.vx, s.vy, _la); const dr = (_la[0] + gl * rx) * rx + (_la[1] + gl * ry) * ry, dt_ = _la[0] * tx + _la[1] * ty;   // drag along r and t
  const [rp, ra] = apsides(B, s);
  switch (s.phase) {
    case "deorbit": if (rp <= lowOrbit(B)) { s.phase = "transfer"; s.wasDown = false; return [0, 0]; } return retro(0.5 * amax);
    case "transfer": if (vr < 0) s.wasDown = true; if (B.atm) { if (s.wasDown && vr >= 0) s.phase = "circularize"; return [0, 0]; } break;
    case "circularize": if (Math.hypot(s.vx, s.vy) <= Math.sqrt(B.GM / r)) { s.phase = "entry burn"; return [0, 0]; } return retro(0.5 * amax);
    case "entry burn": if (rp <= B.R + entryAlt(B)) { s.phase = "entry"; return [0, 0]; } return retro(0.5 * amax);
    case "entry": if (h > 3000 && !((h < 25000 || u < 600) && u * u / (2 * Math.max(h - 300, 1)) > 0.4 * amax)) return [0, 0]; s.phase = "powered descent"; break; }
  if (s.phase === "transfer") { if (u * u / (2 * Math.max(h - 300, 1)) < 0.4 * amax) return [0, 0]; s.phase = "powered descent"; }
  if (s.phase === "powered descent") {
    // the descent rate wanted: limited by what the engine can stop, and slow enough to finish braking sideways first; then a gentle 0.8 m/s
    const th = Math.abs(vt) / (0.6 * amax), c = th + 4, k = 0.35 * amax, vs = Math.sqrt(2 * k * Math.max(h, 0)), vl = h / c; let vrDes, ff = 0;
    if (h < 2) vrDes = -0.8; else if (vs < Math.max(vl, 1)) { vrDes = -vs; ff = -k * vr / Math.max(vs, 1); } else if (vl > 1) { vrDes = -vl; ff = -vr / c; } else vrDes = -1;
    const tgo = h / Math.max(-vrDes, 0.5), atDes = clampN(-vt / Math.max(1.5, Math.min(tgo, 30)), -0.7 * amax, 0.7 * amax);
    let Tr = (vrDes - vr) / 1.0 + ff + gl - vtIn * vtIn / r - dr, Tt = atDes + B.w * vr + vr * vtIn / r - dt_;
    const along = Tr * vr + Tt * vt; if (along > 0 && u > 30) { const u2 = vr * vr + vt * vt; Tr -= along * vr / u2; Tt -= along * vt / u2; }   // never push forward against the air
    Tr = clampN(Tr, -amax, amax); const tmax = Math.sqrt(Math.max(0, amax * amax - Tr * Tr)); Tt = clampN(Tt, -tmax, tmax);
    return [Tr * rx + Tt * tx, Tr * ry + Tt * ty]; }
  if (s.phase === "liftoff") { if (h > 150) s.phase = "climb"; return [(gl + 6) * rx, (gl + 6) * ry]; }
  if (s.phase === "climb") { const rl = lowOrbit(B), hl = rl - B.R, vc = Math.sqrt(B.GM / rl);
    if (Math.abs(h - hl) < 3000 && Math.abs(vr) < 15 && vtIn > vc - 10 && rp > B.R + 0.8 * hl) { s.phase = "low orbit"; return [0, 0]; }
    const vrDes = h < hl ? Math.min(B.atm ? 900 : 300, Math.sqrt(2 * 0.25 * amax * (hl - h))) : -(h - hl) / 30, dense = airRho(B, h) > 2e-3 && u > 350;
    let Tr = (vrDes - vr) / 2 + gl - vtIn * vtIn / r - dr, Tt = dense ? -dt_ : clampN((vc - vtIn) / 4, -amax, amax) + vr * vtIn / r - dt_;
    Tr = clampN(Tr, -amax, amax); const tmax = Math.sqrt(Math.max(0, amax * amax - Tr * Tr)); Tt = clampN(Tt, -tmax, tmax); return [Tr * rx + Tt * tx, Tr * ry + Tt * ty]; }
  if (s.phase === "low orbit" && rp < B.R + 0.6 * (lowOrbit(B) - B.R)) s.phase = "climb";   // sagging: trim it again
  if (s.phase === "low orbit") { // wait until the ship leads by the angle a Hohmann transfer needs
    const r2 = T.r, tH = Math.PI * Math.sqrt(((r + r2) / 2) ** 3 / B.GM), lead = Math.PI - T.n * tH, d = wrapPi(shipAt(T, s.t)[4] - Math.atan2(s.y, s.x) - lead);
    if (s.prevD !== undefined && s.prevD > 0 && d <= 0 && d > -0.5) s.phase = "transfer up"; s.prevD = d; return [0, 0]; }
  if (s.phase === "transfer up") { if (ra >= T.r) { s.phase = "coast up"; return [0, 0]; } const v = Math.hypot(s.vx, s.vy); return [s.vx / v * 0.5 * amax, s.vy / v * 0.5 * amax]; }
  const [px, py, pvx, pvy] = shipAt(T, s.t), dx = px - s.x, dy = py - s.y, dist = Math.hypot(dx, dy);
  if (s.phase === "coast up") { if (vr > 20) s.wasUp = true; if (dist < 0.1 * T.r || (s.wasUp && vr <= 0)) s.phase = "approach"; else return [0, 0]; }
  if (s.phase === "approach") { if (dist < 25 && Math.hypot(s.vx - pvx, s.vy - pvy) < 1.5) { s.phase = "docked"; return [0, 0]; }
    const sDes = Math.min(Math.sqrt(2 * 0.3 * amax * dist), dist / 2 + 0.5), gp = -B.GM / T.r ** 3, vdx = pvx + dx / dist * sDes, vdy = pvy + dy / dist * sDes;
    let Ax = (vdx - s.vx) / 2 + gp * px - _la[0], Ay = (vdy - s.vy) / 2 + gp * py - _la[1]; const A = Math.hypot(Ax, Ay); if (A > amax) { Ax *= amax / A; Ay *= amax / A; } return [Ax, Ay]; }
  return [0, 0]; }
const LN_COAST = { transfer: 1, entry: 1, "low orbit": 1, "coast up": 1 };
// advance the flight by dt seconds, in steps short enough for the moment (long in free flight, short near the ground or in the air)
function lnAdvance(B, s, T, dt) { let left = dt; while (left > 1e-9 && s.phase !== "landed" && s.phase !== "docked") { const r = Math.hypot(s.x, s.y), h = r - B.R, v = Math.hypot(s.vx, s.vy);
    const coast = LN_COAST[s.phase], step = Math.min(left, coast ? clampN(0.003 * r / Math.max(v, 1), 0.05, 20) : h < 3000 ? 0.05 : 0.25, airRho(B, h) > 1e-6 ? Math.max(0.05, Math.min(0.5, 30 * LND.beta / (airRho(B, h) * v + 1e-9) / 1000)) : 1e9);
    const [tx, ty] = lnGuide(B, s, T); B.lift = s.phase === "entry" ? LND.ld : 0; lnStep(B, s, tx, ty, step); left -= step; s.thrust = Math.hypot(tx, ty); s.load = (s.thrust + s.drag) / 9.80665; s.maxG = Math.max(s.maxG, s.load);
    const r2 = Math.hypot(s.x, s.y); if (r2 <= B.R) { const ux = s.vx + B.w * s.y, uy = s.vy - B.w * s.x; s.touch = Math.hypot(ux, uy); s.phase = "landed"; const k = B.R / r2; s.x *= k; s.y *= k; s.vx = -B.w * s.y; s.vy = B.w * s.x; s.landAng = Math.atan2(s.y, s.x); } } }
// ---------- the lander's missions ----------
// PLACE: where you are: "ship" (walking the decks), "lander" (in its cabin, docked or away), "outside" (on the surface, in a suit)
let PLACE = "ship";
const LAND = { away: false, s: null, B: null, T: null, departAt: 0, alpha: 0, site: null, userWarp: false, fx: V3(1, 0, 0), fy: V3(0, 1, 0), rocks: null };
const warpTo = sec => { if (!LAND.userWarp) warpI = Math.max(0, WARPS.findIndex(w => w[0] >= sec)); };
function landerBody() { const B = bodyInfo(park.sel); B.w = 2 * Math.PI / (B.rot * 86400); return B; }
// the ship's place and speed in its orbit, in the body's equatorial plane, at a coordinate time
function ship2D(ms) { const th = park.th0 + park.n * (ms - park.t0) / 1000, r = park.r; return { x: r * Math.cos(th), y: r * Math.sin(th), vx: -r * park.n * Math.sin(th), vy: r * park.n * Math.cos(th) }; }
const sunAngle = (B, ms) => { const d = bodyPosM(B.sel, ms).negate(); return Math.atan2(d.dot(park.E2), d.dot(park.E1)); };
// where on Earth's equator there is land, read from the map
let EARTH_LAND = null;
function earthLand() { if (EARTH_LAND) return EARTH_LAND; const im = EARTH_T.image; if (!im || !im.width) return null; const c = document.createElement("canvas"); c.width = 720; c.height = 360; const g = c.getContext("2d"); g.drawImage(im, 0, 0, 720, 360);
  const d = g.getImageData(0, 178, 720, 4).data; EARTH_LAND = []; for (let i = 0; i < 720; i++) { let r = 0, gg = 0, b = 0; for (let k = 0; k < 4; k++) { const o = (k * 720 + i) * 4; r += d[o]; gg += d[o + 1]; b += d[o + 2]; } EARTH_LAND.push(!(b > r + 12 && b >= gg - 4)); } return EARTH_LAND; }
const isLand = lonRad => { const L = earthLand(); if (!L) return true; return L[Math.floor(((lonRad / (2 * Math.PI) + 0.5) % 1 + 1) % 1 * 720)]; };
const PLACES = { Earth: [[-81, -75, "Ecuador"], [-75, -50, "the Amazon rainforest"], [-50, -44, "the mouth of the Amazon"], [9, 14, "Gabon"], [14, 30, "the Congo rainforest"], [30, 35, "Uganda"], [35, 42, "Kenya"], [42, 48, "Somalia"], [95, 106, "Sumatra"], [108, 119, "Borneo"], [119, 125, "Sulawesi"], [130, 141, "New Guinea"]],
  "the Moon": [[-75, -40, "Oceanus Procellarum"], [-40, -8, "the Sinus Medii region"], [-8, 10, "Sinus Medii"], [10, 33, "Mare Tranquillitatis"], [33, 65, "Mare Fecunditatis"]] };
const placeName = (B, lon) => { const d = wrapPi(lon) / DEG, hit = (PLACES[B.name] || []).find(([a, b]) => d >= a && d < b); return `${hit ? hit[2] + ", " : ""}${Math.abs(d).toFixed(1)}° ${d >= 0 ? "E" : "W"} on the equator`; };
// planning: fly the whole descent once in advance (from this point of the orbit), then wait for the moment that brings the lander down
// in the local morning, and on Earth on land
function planLanding(B) { const s0 = ship2D(coordMs), sim = { ...s0, t: 0, dv: 0, phase: "deorbit", maxG: 0, drag: 0 }, th0 = Math.atan2(s0.y, s0.x);
  for (let k = 0; k < 40000 && sim.phase !== "landed" && sim.t < 3e5; k++) lnAdvance(B, sim, null, 30);
  if (sim.phase !== "landed") return null; const dTh = sim.landAng - th0, Td = sim.t, n = park.n, syn = Math.min(2 * Math.PI / Math.abs(n - B.w), 4 * 86400), sg = Math.sign(B.w) || 1;
  const span = B.name === "Earth" ? Math.max(syn, 3 * 86400) : syn, N = Math.ceil(span / 40);
  let best = null; for (let k = 0; k <= N; k++) { const wait = 60 + span * k / N, tL = coordMs + (wait + Td) * 1000, thL = th0 + n * wait + dTh, lon = wrapPi(thL - bodySpin(B, tL)), ha = wrapPi(thL - sunAngle(B, tL)) * sg;
    const score = Math.abs(wrapPi(ha + 0.85)) + (B.name === "Earth" && !isLand(lon) ? 3 : 0) + wait / 86400 * 0.15; if (!best || score < best.score) best = { score, wait, lon, Td, tL, dv: sim.dv, maxG: sim.maxG }; }
  return best; }
function startLanding() { if (PLACE !== "lander") return; if (LAND.away) return say(LAND.s ? "We are already flying." : "The landing is planned: waiting to undock.", 5); if (mode !== "parked") return say("The ship has to be in orbit round a body first.", 6);
  const B = landerBody(); if (B.star) return say("There is no landing on a star.", 5); if (!B.solid) return say(`${B.name} has no solid surface to land on: below the clouds the gas just gets hotter and denser.`, 8);
  const P = planLanding(B); if (!P) return say("The autopilot could not find a way down.", 6);
  Object.assign(LAND, { away: true, s: null, B, T: { r: park.r, th0: park.th0, n: park.n, t0: (park.t0 - NOW0) / 1000 }, departAt: coordMs + P.wait * 1000, plan: P, userWarp: false, rocks: null });
  warpTo(P.wait > 3 * 3600 ? 3600 : P.wait > 600 ? 60 : 10);
  say(`Landing planned on <b>${B.name}</b>: ${placeName(B, P.lon)}, in the local morning. Undocking in ${fmtDur(P.wait)} (the landing site has to come round); then ${fmtDur(P.Td)} down: a Hohmann transfer to a low orbit, ${B.atm ? "entry on the heat shield, and the engine near the ground" : "and powered descent from orbit"}.`, 16); }
function undock() { const s0 = ship2D(coordMs); LAND.s = { ...s0, t: (coordMs - NOW0) / 1000, dv: 0, phase: "deorbit", maxG: 0, drag: 0, load: 0, thrust: 0, tx: 0, ty: 0 }; LAND.alpha = Math.atan2(s0.y, s0.x) + Math.PI;
  scene.add(LANDER); LANDER.position.set(0, 0, 0); SHIP.visible = false; HATCH.visible = true; warpTo(10);
  say(`Undocked; the bay doors close behind us. <b>Deorbit burn</b>: the engine fires against our orbital motion to drop us toward ${LAND.B.name}.`, 10); }
function launchLander() { if (PLACE !== "lander") return; if (!LAND.s || LAND.s.phase !== "landed") return say(LAND.away ? "We can only launch from the ground." : "We are docked: press LAND to go down.", 5);
  const s = LAND.s; s.phase = "liftoff"; s.dv = 0; s.maxG = 0; s.prevD = undefined; s.wasUp = false; LAND.userWarp = false; warpTo(1); LAND.T = { r: park.r, th0: park.th0, n: park.n, t0: (park.t0 - NOW0) / 1000 };
  say(`<b>Liftoff.</b> Up into a low orbit, then a wait for the ship to come round, and a Hohmann transfer up to it.`, 8); }
function dockLander() { LAND.away = false; LAND.s = null; SHIP.add(LANDER); LANDER.position.set(0, DECKS[3].y + CAB_H, 7.0); SHIP.visible = true; HATCH.visible = false; LAND.userWarp = false; warpI = 0; PLUME.visible = false;
  say("<b>Docked.</b> The lander is back in the hangar. Go out through the hatch, and take the lift up.", 10); }
function board() { FADE.style.opacity = 1; setTimeout(() => { PLACE = "lander"; P_.x = 0; P_.z = -1.2; yaw = Math.PI; FADE.style.opacity = 0; say(LAND.away ? "Back in the cabin; the hatch is closed and the cabin repressurised." : "In the lander's cabin. LAND takes it down to the body the ship is orbiting.", 6); }, 450); }
function exitLander() { if (LAND.away && (!LAND.s || LAND.s.phase !== "landed")) return say(LAND.s ? "Not in flight!" : "We are about to undock: stay aboard, or wait in the ship.", 5);
  FADE.style.opacity = 1; setTimeout(() => { if (LAND.away) { PLACE = "outside"; P_.x = 0.6; P_.z = -4.6; yaw = 0; say(`You climb down the ladder in your suit onto <b>${LAND.B.name}</b>. Gravity here: ${(LAND.B.GM / LAND.B.R ** 2 / G0).toFixed(2)} g. ${LAND.B.atm ? "" : "No air: the sky is black even by day."} BOARD LANDER at the foot of the ladder takes you back in.`, 12); }
    else { PLACE = "ship"; P_.deck = 3; P_.x = 0; P_.z = 2.6; yaw = 0; say("In the hangar. The lift is ahead.", 4); } FADE.style.opacity = 0; }, 450); }
const PHASE_SAY = { transfer: "Burn complete. Now coasting down a Hohmann transfer orbit to a low orbit; it takes some time, so time runs faster.", circularize: "At the bottom of the transfer: braking into a low circular orbit.", "entry burn": "A short burn to dip the orbit into the top of the atmosphere.",
  entry: "<b>Entry.</b> The heat shield faces forward into the air; the air slows us, a little lift spreads the braking out. You feel it as weight, toward the floor.", "powered descent": "<b>Powered descent.</b> The engine takes over: braking, then down slowly onto the surface.",
  climb: "Climbing: the engine pushes us up, then sideways to orbital speed.", "low orbit": "In a low orbit. Waiting for the ship to come round to where the transfer up will meet it.", "transfer up": "Burn to rise on a Hohmann transfer to the ship's orbit.", "coast up": "Coasting up the transfer.", approach: "Final approach: matching the ship's speed and closing in to dock." };
function stepLander(dt) { const s = LAND.s, B = LAND.B, ph = s.phase, cap = ph === "landed" ? Infinity : LN_COAST[ph] ? 3600 : 10; if (WARPS[warpI][0] > cap) warpI = WARPS.findIndex(w => w[0] >= cap);
  const step = dt * WARPS[warpI][0];
  if (ph === "landed") { s.t += step; const th = LAND.site + bodySpin(B, NOW0 + s.t * 1000), r = B.R; s.x = r * Math.cos(th); s.y = r * Math.sin(th); s.vx = -B.w * s.y; s.vy = B.w * s.x; s.thrust = 0; s.load = B.GM / r ** 2 / G0; }
  else lnAdvance(B, s, LAND.T, step);
  coordMs = NOW0 + s.t * 1000; properMs += step * 1000;
  if (s.phase !== ph) { LAND.userWarp = false; if (PHASE_SAY[s.phase]) say(PHASE_SAY[s.phase], 9);
    if (s.phase === "landed") { LAND.site = s.landAng - bodySpin(B, coordMs); warpI = 0; say(`<b>Touchdown</b> at ${s.touch.toFixed(1)} m/s on ${B.name}: ${placeName(B, LAND.site)}. Flight ${fmtDur(s.t - (LAND.departAt - NOW0) / 1000)}, most g felt ${s.maxG.toFixed(1)}. GO OUT to step outside; LAUNCH to go back up.`, 16); }
    if (s.phase === "docked") return dockLander(); }
  // automatic time steps for each part of the flight
  const r = Math.hypot(s.x, s.y), h = r - B.R; if (!LAND.userWarp && s.phase !== "landed") { const P = s.phase, d = Math.hypot(...shipAt(LAND.T, s.t).slice(0, 2).map((v, i) => v - [s.x, s.y][i]));
    warpTo(P === "transfer" || P === "low orbit" || P === "coast up" ? 60 : P === "entry" ? (s.drag < 0.3 ? 60 : 10) : P === "powered descent" ? (h > 3000 ? 10 : 1) : P === "liftoff" ? 1 : P === "approach" ? (d > 20000 ? 10 : 1) : 10); }
  // the lander's attitude in its plane: the engine points along the thrust; in entry the heat shield faces the oncoming air; landed, upright
  let want = null; if (s.phase === "landed") LAND.alpha = Math.atan2(s.y, s.x); else if (s.thrust > 0.3) want = Math.atan2(s.ty, s.tx); else if (s.phase === "entry") want = Math.atan2(-(s.vy - B.w * s.x), -(s.vx + B.w * s.y));
  if (want !== null) LAND.alpha += clampN(wrapPi(want - LAND.alpha), -Math.max(0.6 * step, 0.01), Math.max(0.6 * step, 0.01));
  const E1 = park.E1, E2 = park.E2, up = E1.clone().multiplyScalar(Math.cos(LAND.alpha)).addScaledVector(E2, Math.sin(LAND.alpha)); LAND.fy.copy(up); LAND.fx.crossVectors(B.axis.clone().normalize(), up).normalize();
  shipRelM = bodyPosM(B.sel, coordMs).addScaledVector(E1, s.x).addScaledVector(E2, s.y); shipPos = relToLy(here, shipRelM);
  PLUME.visible = s.thrust > 0.3; if (PLUME.visible) { PLUME.scale.set(1, 0.8 + 6 * s.thrust / LND.amax, 1); PLUME.position.y = -3.15 - PLUME.scale.y / 2; } }

// ---------- the surface: ground, air and stones ----------
// Near the surface the body is drawn as a cap of a true sphere round the point below the lander, out to the horizon (at true size close
// to the ground, shrunk in proportion higher up so that it fits the view), coloured from the body's map with fine detail for close up.
const CAP_N = 56, CAP_M = 96, capPos = new Float32Array((CAP_N + 1) * CAP_M * 3), capNor = new Float32Array(capPos.length), capUV = new Float32Array((CAP_N + 1) * CAP_M * 2), capT = new Float32Array(capPos.length);
const capGeo = new THREE.BufferGeometry(); capGeo.setAttribute("position", new THREE.BufferAttribute(capPos, 3)); capGeo.setAttribute("normal", new THREE.BufferAttribute(capNor, 3)); capGeo.setAttribute("aUV", new THREE.BufferAttribute(capUV, 2)); capGeo.setAttribute("aT", new THREE.BufferAttribute(capT, 3));
{ const idx = []; for (let i = 0; i < CAP_N; i++) for (let j = 0; j < CAP_M; j++) { const a = i * CAP_M + j, b = i * CAP_M + (j + 1) % CAP_M, c = a + CAP_M, d = b + CAP_M; idx.push(a, c, b, b, c, d); } capGeo.setIndex(idx); capGeo.boundingSphere = new THREE.Sphere(V3(), 1e9); }
const groundU = { map: { value: null }, uSun: { value: V3(0, 1, 0) }, uSunI: { value: 1 }, uAmb: { value: 0.03 }, uSky: { value: new THREE.Color(0, 0, 0) }, uHaze: { value: 0 }, uVis: { value: 60000 }, uDet: { value: 1 } };
const GROUND = new THREE.Mesh(capGeo, new THREE.ShaderMaterial({ uniforms: groundU,
  vertexShader: `attribute vec2 aUV; attribute vec3 aT; varying vec2 vUV; varying vec3 vT; varying vec3 vN; void main(){ vUV = aUV; vT = aT; vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform vec3 uSun, uSky; uniform float uSunI, uAmb, uHaze, uVis, uDet; varying vec2 vUV; varying vec3 vT; varying vec3 vN;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    void main(){ vec3 base = texture2D(map, vUV).rgb; float d = vT.z, det = 0.0, amp = 0.5;
      for (int k = 0; k < 7; k++) { float sc = 0.4 * pow(4.0, float(k)); det += amp * clamp(sc * 30.0 / (d + 1.0), 0.0, 1.0) * (noise(vT.xy / sc + float(k) * 17.0) - 0.5); amp *= 0.85; }
      vec3 col = base * 1.35 * (1.0 + uDet * det * 1.5); col *= max(dot(normalize(vN), uSun), 0.0) * uSunI + uAmb;
      gl_FragColor = vec4(mix(col, uSky, uHaze * (1.0 - exp(-d / uVis))), 1.0); }` }));
GROUND.frustumCulled = false; GROUND.visible = false; GROUND.renderOrder = -2; scene.add(GROUND);
// the daytime sky of a world with air: blue on Earth, butterscotch on Mars, a dim orange overcast on Venus
const skyU = { uUp: { value: V3(0, 1, 0) }, uSun: { value: V3(0, 1, 0) }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uDay: { value: 0 }, uGlow: { value: 1 } };
const SKYDOME = new THREE.Mesh(new THREE.SphereGeometry(50000, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, transparent: true, depthWrite: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uUp, uSun, uZen, uHor; uniform float uDay, uGlow; varying vec3 vD; void main(){ float el = dot(vD, uUp), sd = max(dot(vD, uSun), 0.0);
    vec3 c = mix(uHor, uZen, pow(clamp(el, 0.0, 1.0), 0.45)) + uGlow * (vec3(1.0, 0.95, 0.85) * pow(sd, 300.0) * 1.5 + uHor * pow(sd, 10.0) * 0.4); gl_FragColor = vec4(c, uDay); }` }));
SKYDOME.renderOrder = -3; SKYDOME.frustumCulled = false; SKYDOME.visible = false; scene.add(SKYDOME);
// stones round the landing site, for scale
const ROCK_N = 140, ROCKS = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x8a8580, roughness: 1, flatShading: true }), ROCK_N); ROCKS.visible = false; ROCKS.frustumCulled = false; scene.add(ROCKS);
const ROCK_COL = { moon: 0x8a8682, mars: 0x7a4a30, venus: 0x4a3e30, earth: 0x6a5e50, temperate: 0x6a5e50, rock: 0x6a645c, lava: 0x2a2422, ocean: 0x6a6a6a };
function makeRocks(B, Lsite) { const R = seeded(Math.floor(Lsite.x * 1e6) + 7), east = V3(0, 1, 0).cross(Lsite).normalize(), out = [];
  for (let k = 0; k < ROCK_N; k++) { const d = 6 + 250 * Math.pow(R(), 1.6), a = R() * 6.2832, size = 0.08 + 1.1 * Math.pow(R(), 3.5); out.push({ L: Lsite.clone().addScaledVector(east, d * Math.cos(a) / B.R).addScaledVector(V3(0, 1, 0), d * Math.sin(a) / B.R).normalize(), size, rot: R() * 6.28, sink: 0.3 + 0.3 * R() }); }
  ROCKS.material.color.setHex(ROCK_COL[B.kind] ?? 0x6a645c); return out; }
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _v = V3(), _w = V3(), _mt = new THREE.Matrix4();
function updateSurface() { const on = LAND.away && LAND.s; GROUND.visible = SKYDOME.visible = ROCKS.visible = false; HEMI.intensity = PLACE === "ship" ? 0.6 : PLACE === "lander" && !on ? 0.6 : 0.3; if (!on) return;
  const B = LAND.B, s = LAND.s, r = Math.hypot(s.x, s.y), h = Math.max(r - B.R, 0), E1 = park.E1, E2 = park.E2, rh = E1.clone().multiplyScalar(s.x / r).addScaledVector(E2, s.y / r), upS = rh.clone().applyMatrix3(R_EQ2SHIP);
  const sunEq = bodyPosM(B.sel, coordMs).negate().normalize(), el = sunEq.dot(rh), sunS = sunEq.clone().applyMatrix3(R_EQ2SHIP), A = B.atm, rho = airRho(B, h), dens = A ? 1 - Math.exp(-4 * rho / A.rho) : 0;
  const eye = h + CAB_H + 2, dip = Math.acos(B.R / (B.R + eye)), clouded = A && A.cloud && h < A.cloud, day = clampN((el + 0.1) / 0.2, 0, 1);
  HEMI.intensity = PLACE === "outside" ? (A ? 0.08 + 0.35 * dens * day : 0.03) : 0.3;
  if (A) { SKYDOME.visible = dens > 0.002; skyU.uUp.value.copy(upS); skyU.uSun.value.copy(sunS); skyU.uZen.value.setRGB(...(clouded ? A.hor : A.zen)).multiplyScalar(clouded ? 0.5 : 1); const tw = clampN(el / 0.3, 0, 1);
    skyU.uHor.value.setRGB(...A.hor).lerp(new THREE.Color(1.0, 0.5, 0.25), clouded ? 0 : 1 - tw).multiplyScalar(clouded ? 0.5 : 1); skyU.uDay.value = A.sky * dens * (clouded ? clampN((el + 0.15) / 0.2, 0, 1) : day); skyU.uGlow.value = clouded ? 0 : 1; }
  // the sun and planets set below the horizon; under Venus's clouds the sun is never seen
  if (h < 0.08 * B.R || clouded) for (const o of LOCAL.children) { if (!o.visible) continue; const dl = o.position.length(); if (dl < 1) continue; const e = o.position.dot(upS) / dl, ang = (o.scale.x || 0) / dl; if (e < -Math.sin(dip) - ang) o.visible = false; }
  if (clouded) { SYS.starMesh.visible = SYS.glow.visible = false; } starLight.intensity = (clouded ? 0.35 : SYS.starMesh.visible ? 2.6 : 0);
  if (h >= 0.05 * B.R) return;
  // the cap of ground; the body's own globe is hidden while it is shown
  const mesh = B.sel === -2 ? SYS.moon.mesh : SYS.planets[B.sel].mesh; mesh.visible = false; if (B.p?.ring) SYS.planets[B.sel].ring.visible = false;
  const map = mesh.material.map; map.wrapS = THREE.RepeatWrapping; map.needsUpdate = map.userData.wrapped ? false : (map.userData.wrapped = true); groundU.map.value = map;
  const hd = Math.sqrt(2 * B.R * eye + eye * eye), sc = Math.min(1, 0.6 * 90000 / hd), thMax = Math.min(Math.PI / 2, dip * 1.08 + 2 / B.R), east = B.axis.clone().normalize().cross(rh).normalize(), north = rh.clone().cross(east);
  _q.copy(bodyQ(B, coordMs)); _qi.copy(_q).invert(); const lon0 = (() => { _v.copy(rh).applyQuaternion(_qi); return Math.atan2(_v.z, -_v.x); })();
  for (let i = 0; i <= CAP_N; i++) { const th = thMax * (i / CAP_N) ** 2.2, st = Math.sin(th), ct = Math.cos(th);
    for (let j = 0; j < CAP_M; j++) { const ph = j / CAP_M * 2 * Math.PI, k = i * CAP_M + j; _w.copy(rh).multiplyScalar(ct).addScaledVector(east, st * Math.cos(ph)).addScaledVector(north, st * Math.sin(ph));
      _v.copy(_w).multiplyScalar(B.R).addScaledVector(rh, -(B.R + h)).applyMatrix3(R_EQ2SHIP).multiplyScalar(sc); capPos[k * 3] = _v.x; capPos[k * 3 + 1] = _v.y - CAB_H; capPos[k * 3 + 2] = _v.z;
      _v.copy(_w).applyMatrix3(R_EQ2SHIP); capNor[k * 3] = _v.x; capNor[k * 3 + 1] = _v.y; capNor[k * 3 + 2] = _v.z;
      _v.copy(_w).applyQuaternion(_qi); const lon = lon0 + wrapPi(Math.atan2(_v.z, -_v.x) - lon0), lat = Math.asin(clampN(_v.y, -1, 1)); capUV[k * 2] = lon / (2 * Math.PI); capUV[k * 2 + 1] = 0.5 + lat / Math.PI;
      capT[k * 3] = B.R * th * Math.cos(ph); capT[k * 3 + 1] = B.R * th * Math.sin(ph); capT[k * 3 + 2] = Math.hypot(B.R * th, h + 2); } }
  for (const n of ["position", "normal", "aUV", "aT"]) capGeo.attributes[n].needsUpdate = true; GROUND.visible = true;
  groundU.uSun.value.copy(sunS); groundU.uSunI.value = (clouded ? 0.18 : 1.1) * clampN((el + 0.02) / 0.06, 0, 1); groundU.uAmb.value = A ? 0.04 + 0.3 * dens * day : 0.02;
  groundU.uSky.value.copy(A ? skyU.uHor.value : new THREE.Color(0, 0, 0)).multiplyScalar(A ? day : 0); groundU.uHaze.value = A ? dens : 0; groundU.uVis.value = A ? A.vis : 1e9; groundU.uDet.value = B.kind === "ocean" ? 0.15 : 1;
  // stones, once low enough
  if (h < 1500) { if (!LAND.rocks) LAND.rocks = makeRocks(B, rh.clone().applyQuaternion(_qi)); ROCKS.visible = true;
    LAND.rocks.forEach((k, i) => { _w.copy(k.L).applyQuaternion(_q); _v.copy(_w).multiplyScalar(B.R).addScaledVector(rh, -(B.R + h)).applyMatrix3(R_EQ2SHIP); _v.y -= CAB_H + k.size * k.sink; _mt.makeRotationY(k.rot).scale(_w.set(k.size, k.size * 0.6, k.size)).setPosition(_v); ROCKS.setMatrixAt(i, _mt); }); ROCKS.instanceMatrix.needsUpdate = true; } }
// ---------- formatting ----------
const pad = (n, k = 2) => String(n).padStart(k, "0");
const fmtDate = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`; };
const fmtDur = s => { s = Math.max(0, s); if (s < 120) return `${s.toFixed(0)} s`; if (s < 7200) return `${(s / 60).toFixed(1)} min`; if (s < 2 * 86400) return `${(s / 3600).toFixed(1)} hours`; if (s < YEAR) return `${(s / 86400).toFixed(1)} days`; const y = s / YEAR; return y < 1000 ? `${y.toFixed(2)} years` : `${Math.round(y).toLocaleString()} years`; };
// distances step up through metres, kilometres, astronomical units and light years as they grow
const fmtLy = ly => { const m = Math.abs(ly) * LY; if (m < 1000) return `${m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)} m`; if (m < 1e9) return `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: m < 1e5 ? 2 : 0 })} km`; if (m < 0.05 * LY) { const au = m / AU; return `${au.toFixed(au < 10 ? 4 : au < 100 ? 2 : 1)} AU`; } return ly < 10 ? `${ly.toFixed(3)} ly` : `${ly.toLocaleString(undefined, { maximumFractionDigits: 1 })} ly`; };
const fmtV = v => { const b = v / C; if (b < 0.9) return `${b.toFixed(6)} c`; const n = Math.min(14, Math.max(4, Math.ceil(-Math.log10(1 - b)) + 3)); return `${b.toFixed(n)} c`; };
// speeds step up from metres a second to kilometres a second as they grow
const fmtKms = v => { const a = Math.abs(v); if (a < 1000) return `${a.toFixed(a < 10 ? 3 : a < 100 ? 2 : 1)} m/s`; return `${(a / 1000).toLocaleString(undefined, { minimumFractionDigits: a < 1e7 ? 2 : 1, maximumFractionDigits: a < 1e7 ? 2 : 1 })} km/s`; };
// a speed in units of c, with enough digits to see it (both velocities use this, so at low speed they read the same)
const fmtC = v => { const b = v / C; if (b === 0) return "0 c"; if (b < 1e-3) return `${b.toExponential(4)} c`; if (b < 0.99) return `${b.toFixed(6)} c`; if (b < 1) return fmtV(v); return `${b.toFixed(b < 10 ? 6 : 3)} c`; };
const fmtG = g => g < 10 ? g.toFixed(g < 1.01 ? 8 : 5) : fmtBig(g);
const fmtBig = x => x < 1e6 ? x.toLocaleString(undefined, { maximumFractionDigits: 2 }) : x.toExponential(3);

// ---------- the screens ----------
function panel(S, title) { const g = S.g; g.fillStyle = "#06121a"; g.fillRect(0, 0, S.w, S.h); g.strokeStyle = "#2a6a8a"; g.lineWidth = 4; g.strokeRect(6, 6, S.w - 12, S.h - 12); g.fillStyle = "#7ad0f0"; g.font = "700 40px Helvetica, sans-serif"; g.fillText(title, 28, 56); return g; }
function row(g, y, label, value, x = 28, vx = 560, size = 34, col = "#e8f4fa") { g.fillStyle = "#8ab0c4"; g.font = `500 ${size * 0.72}px Helvetica, sans-serif`; g.fillText(label, x, y); g.fillStyle = col; g.font = `600 ${size}px Menlo, monospace`; g.fillText(value, vx, y); }
const curState = () => mode === "trip" && trip.st ? trip.st : { tau: 0, x: 0, t: 0, v: 0, w: 0, gamma: 1, phi: 0, accel: false, phase: mode === "align" ? "turning to the course" : "in orbit" };
function drawTrip() { const S = SCREENS.trip, g = panel(S, "TRIP COMPUTER"), st = curState(), T = trip;
  g.fillStyle = "#f0d890"; g.font = "600 34px Helvetica, sans-serif"; g.fillText(mode === "trip" ? `${T.local ? STARS[here].name.split(" (")[0] + ": " : STARS[here].name.split(" (")[0] + "  →  "}${destName(T).split(" (")[0]}   ·   ${st.phase}` : `${mode === "align" ? "turning to the course for " + (align.local ? align.dname : STARS[align.dest].name.split(" (")[0]) : "in orbit near " + parkName() + ", " + STARS[here].name.split(" (")[0]}`, 28, 110);
  let y = 175; const R = (l, v, c) => { row(g, y, l, v, 28, 640, 38, c); y += 58; };
  R("PROPER TIME (ship clock)", fmtDate(properMs), "#9af0b0"); R("COORDINATE TIME (star frame)", fmtDate(coordMs), "#f0c890");
  R("  elapsed this trip: ship / stars", mode === "trip" ? `${fmtDur(st.tau)}  /  ${fmtDur(st.t)}` : "-");
  R("PROPER VELOCITY  w = γv = dx/dτ", `${fmtKms(st.w)}   (${fmtC(st.w)})`, "#9ad8ff"); R("MAP VELOCITY  v = dx/dt", `${fmtKms(st.v)}   (${fmtC(st.v)})`, "#9ad8ff");
  R("LORENTZ FACTOR  γ = dt/dτ", `${fmtG(st.gamma)}      rapidity ${st.phi.toFixed(4)}`);
  R("PROPER ACCELERATION", mode === "trip" ? `${st.accel ? "+" : "−"}1.000 g  (9.807 m/s²)` : "0 g (in orbit: gravity off)");
  if (mode === "trip") { R("DISTANCE: covered / to go (map)", `${fmtLy(st.x / LY)}  /  ${fmtLy((T.plan.D - st.x) / LY)}`); R("  to go as the ship measures it", fmtLy((T.plan.D - st.x) / LY / st.gamma)); R("ARRIVAL: ship clock / star clock", `${fmtDur(T.plan.tau - st.tau)}  /  ${fmtDur(T.plan.t - st.t)}  from now`); }
  g.fillStyle = "#5a8aa0"; g.font = "500 24px Menlo, monospace"; g.fillText("c²dτ² = c²dt² − dx²    t = (c/a) sinh(aτ/c)    x = (c²/a)(cosh(aτ/c) − 1)    v = c tanh(aτ/c)    w = c sinh(aτ/c)", 28, S.h - 30);
  g.fillStyle = "#c8a860"; g.font = "600 28px Helvetica, sans-serif"; g.fillText(`TIME: ${WARPS[warpI][1]}`, S.w - 470, 56); S.t.needsUpdate = true; }
const KIND_NAME = { rock: "rocky", lava: "rocky, molten", mars: "rocky, thin air", venus: "rocky, thick air", temperate: "rocky, temperate", ocean: "ocean world", earth: "rocky, oceans", hot: "hot gas giant", gas: "gas giant", saturn: "gas giant, rings", ice: "ice giant", nep: "ice giant", moon: "rocky moon", star: "star", "black hole": "black hole" };
function drawSys() { const S = SCREENS.auto, g = panel(S, `AUTOPILOT: ${STARS[here].name.split(" (")[0].toUpperCase()} SYSTEM`), L = sysList(), n = 11; sysI = clampN(sysI, 0, L.length - 1); const top = clampN(sysI - 5, 0, Math.max(0, L.length - n));
  for (let k = 0; k < n; k++) { const i = top + k; if (i >= L.length) break; const B = bodyInfo(L[i]), d = Math.max(0, bodyPosM(L[i], coordMs).distanceTo(shipRelM || V3()) - B.R), y = 108 + k * 44, sel = i === sysI, cur = L[i] === park?.sel;
    if (sel) { g.fillStyle = "#1a4a62"; g.fillRect(16, y - 32, S.w - 32, 42); } g.fillStyle = cur ? "#9af0b0" : sel ? "#ffffff" : "#c8dce8"; g.font = `${sel ? 700 : 500} 28px Helvetica, sans-serif`; g.fillText(B.name, 28, y);
    g.font = "500 24px Menlo, monospace"; g.fillStyle = "#8ab0c4"; g.fillText(cur && mode === "parked" ? "in orbit" : fmtLy(d / LY), 520, y); g.fillText(KIND_NAME[B.kind] || B.kind, 800, y); }
  const B = bodyInfo(L[sysI]), D = shipRelM ? parkRelM(mkPark(here, L[sysI], coordMs), coordMs).distanceTo(shipRelM) : 0, P = tripPlan(Math.max(D, 1)), gs = B.GM / B.R ** 2;
  g.fillStyle = "#0e2230"; g.fillRect(16, 600, S.w - 32, 184); g.fillStyle = "#f0d890"; g.font = "700 30px Helvetica, sans-serif"; g.fillText(`${B.name}  ·  ${KIND_NAME[B.kind] || B.kind}`, 30, 640);
  g.fillStyle = "#c8dce8"; g.font = "500 23px Helvetica, sans-serif"; g.fillText(`radius ${fmtLy(B.R / LY)}  ·  surface gravity ${(gs / G0).toFixed(gs / G0 < 10 ? 2 : 0)} g  ·  day ${fmtDur(Math.abs(B.rot) * 86400)}${B.rot < 0 ? " (turns backwards)" : ""}`, 30, 676);
  g.fillText(B.star ? "No landing: a star." : B.solid ? `Landing: yes, by the lander.${B.atm ? ` Air at the surface ${(B.atm.rho / 1.225).toFixed(B.atm.rho < 0.1 ? 3 : 1)} × Earth's density.` : " No air."}` : "No landing: no solid surface.", 30, 704);
  g.fillStyle = "#9ad8ff"; g.font = "600 24px Menlo, monospace"; g.fillText(L[sysI] === park?.sel ? "We are in orbit here." : `1 g trip: ${fmtDur(P.tau)}; top speed ${fmtKms(P.vMax)}`, 30, 750);
  g.fillStyle = "#c8a860"; g.font = "600 22px Helvetica, sans-serif"; g.fillText("STARS / SYSTEM: switch lists", S.w - 380, 56); S.t.needsUpdate = true; }
function drawAuto() { if (autoSys) return drawSys(); const S = SCREENS.auto, g = panel(S, "AUTOPILOT: DESTINATIONS"), n = 11; listTop = clampN(destI - 5, 0, STARS.length - n);
  for (let k = 0; k < n; k++) { const i = listTop + k; if (i >= STARS.length) break; const St = STARS[i], d = Math.hypot(St.p[0] - shipPos[0], St.p[1] - shipPos[1], St.p[2] - shipPos[2]), y = 108 + k * 44, sel = i === destI;
    if (sel) { g.fillStyle = "#1a4a62"; g.fillRect(16, y - 32, S.w - 32, 42); } g.fillStyle = i === here ? "#9af0b0" : sel ? "#ffffff" : "#c8dce8"; g.font = `${sel ? 700 : 500} 28px Helvetica, sans-serif`; g.fillText(St.name, 28, y);
    g.font = "500 24px Menlo, monospace"; g.fillStyle = "#8ab0c4"; g.fillText(i === here ? "here" : fmtLy(d), 640, y); g.fillText(KNOWN[St.name] ? `${KNOWN[St.name].length} known` : St.bh ? "black hole" : "generated", 900, y); }
  const St = STARS[destI], d = Math.hypot(St.p[0] - shipPos[0], St.p[1] - shipPos[1], St.p[2] - shipPos[2]) * LY, P = tripPlan(d);
  g.fillStyle = "#0e2230"; g.fillRect(16, 600, S.w - 32, 184); g.fillStyle = "#f0d890"; g.font = "700 30px Helvetica, sans-serif"; g.fillText(`${St.name}  (${St.sp})`, 30, 640);
  g.fillStyle = "#c8dce8"; g.font = "500 23px Helvetica, sans-serif"; g.fillText(St.note.slice(0, 92), 30, 676); g.fillText(St.note.slice(92, 184), 30, 704);
  g.fillStyle = "#9ad8ff"; g.font = "600 24px Menlo, monospace"; g.fillText(destI === here ? "We are here." : `1 g trip: ${fmtDur(P.tau)} ship, ${fmtDur(P.t)} stars; top speed ${fmtV(P.vMax)}, γ ${fmtBig(P.gammaMax)}`, 30, 750); S.t.needsUpdate = true; }
function drawNav() { const S = SCREENS.nav, g = panel(S, "NAVIGATION: STARS NEAR THE COURSE (top view, celestial north up)"), cx = S.w / 2, cy = S.h / 2 + 20;
  const tgt = mode === "trip" ? trip.P1 : STARS[destI].p, span = Math.max(12, 1.4 * Math.hypot(tgt[0] - shipPos[0], tgt[1] - shipPos[1]), 1.4 * Math.hypot(...shipPos.slice(0, 2))), sc = 330 / span, X = p => cx + (p[0] - shipPos[0] * 0.5 - tgt[0] * 0.5) * sc, Y = p => cy - (p[1] - shipPos[1] * 0.5 - tgt[1] * 0.5) * sc;
  g.strokeStyle = "#16384a"; g.lineWidth = 1; for (let r = 1; r < 6; r++) { g.beginPath(); g.arc(X([0, 0]), Y([0, 0]), r * span / 5 * sc, 0, 6.28); g.stroke(); }
  for (const St of STARS) { const x = X(St.p), y = Y(St.p); if (x < 20 || x > S.w - 20 || y < 80 || y > S.h - 20) continue; g.fillStyle = St.temp ? `#${bbColor(St.temp).getHexString()}` : "#ff9a50"; g.beginPath(); g.arc(x, y, St.i === destI ? 7 : 4, 0, 6.28); g.fill(); g.fillStyle = "#8ab0c4"; g.font = "18px Helvetica"; g.fillText(St.name.split(" (")[0], x + 8, y - 6); }
  if (mode === "trip") { g.strokeStyle = "#f0d890"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(trip.P0), Y(trip.P0)); g.lineTo(X(trip.P1), Y(trip.P1)); g.stroke(); }
  g.fillStyle = "#9af0b0"; g.beginPath(); g.arc(X(shipPos), Y(shipPos), 8, 0, 6.28); g.fill(); g.fillText("ship", X(shipPos) + 10, Y(shipPos) + 22);
  g.fillStyle = "#5a8aa0"; g.font = "20px Helvetica"; g.fillText(`rings every ${fmtLy(span / 5)} from the Sun`, 28, S.h - 22); S.t.needsUpdate = true; }
function drawEng() { const S = SCREENS.eng, g = panel(S, "ENGINE: ANTIMATTER DRIVE"), st = curState(), on = mode === "trip", tau = on ? st.tau : 0, phiUsed = G0 * tau / C;
  let y = 120; const R = (l, v, c) => { row(g, y, l, v, 28, 520, 30, c); y += 50; };
  R("THRUST", on ? "FULL · 1.000 g proper" : "off", on ? "#9af0b0" : "#c8dce8"); R("DRIVE", "beamed-core: H + anti-H annihilation, pions steered by a magnetic nozzle");
  R("FUEL USED (ideal photon rocket)", on ? `mass ratio e^(aτ/c) = ${fmtBig(Math.exp(phiUsed))}` : "-"); R("FUEL USED (real pion exhaust, ~0.33 c)", on ? `mass ratio ${fmtBig(Math.exp(phiUsed / 0.33))}` : "-");
  R("FUEL ON BOARD", "assumed sufficient (see note)", "#f0c890"); R("RADIATORS", on ? "glowing dull red, ~1,000 K" : "cool"); R("FORWARD SHIELD", on && st.gamma > 2 ? `up: interstellar gas arriving at γ = ${fmtG(st.gamma)}` : "standby");
  g.fillStyle = "#8ab0c4"; g.font = "21px Helvetica"; ["Note: a real 1 g trip is limited by fuel. Even a perfect photon rocket needs about 40 kg of matter and antimatter per kg delivered to", "Proxima Centauri (accelerating and stopping); this ship simply assumes an enormous store, as you asked."].forEach((t, i) => g.fillText(t, 28, S.h - 70 + i * 28)); S.t.needsUpdate = true; }
function drawShip() { const S = SCREENS.ship, g = panel(S, "SHIP STATUS"), st = curState(), dSun = Math.hypot(...shipPos);
  let y = 120; const R = (l, v) => { row(g, y, l, v, 28, 480, 30); y += 50; };
  R("WHERE", mode === "trip" ? "between the stars" : `${STARS[here].name.split(" (")[0]}, near ${parkName()}`); R("FROM THE SUN", fmtLy(dSun)); R("LIGHT FROM EARTH TAKES", fmtDur(dSun * LY / C));
  R("DOPPLER: ahead / behind", mode === "trip" ? `×${fmtBig(Math.sqrt((1 + st.v / C) / (1 - st.v / C)))}  /  ×${fmtBig(Math.sqrt((1 - st.v / C) / (1 + st.v / C)))}` : "×1");
  R("TRIPS MADE", String(tripLog.length)); R("CREW SPACE", "3 decks, 22 m across: cupola, bridge, habitat"); R("GRAVITY", mode === "trip" ? "1 g from the thrust" : "weightless in orbit (shown as 1 g)");
  S.t.needsUpdate = true; }
// buttons
{ const deskBtn = (dx, dz, ry, u, v, label, fn, w = 0.42, h = 0.16, col) => button(label, dx + Math.cos(ry) * u + Math.sin(ry) * v, 0.875, dz - Math.sin(ry) * u + Math.cos(ry) * v, ry, -1.3, fn, w, h, col);
  const A = [-2.6, -6.4, 0.22], N = [2.6, -6.4, -0.22];
  const mv = k => { if (autoSys) sysI = clampN(sysI + k, 0, sysList().length - 1); else destI = clampN(destI + k, 0, STARS.length - 1); };
  deskBtn(...A, -0.72, 0.1, "▲", () => mv(-1)); deskBtn(...A, -0.24, 0.1, "▼", () => mv(1)); deskBtn(...A, 0.24, 0.1, "▲ 10", () => mv(-10)); deskBtn(...A, 0.72, 0.1, "▼ 10", () => mv(10));
  deskBtn(...A, -0.55, 0.34, "STARS / SYSTEM", () => { autoSys = !autoSys; if (autoSys) sysI = Math.max(0, sysList().indexOf(park?.sel)); }, 0.62, 0.17, "#2a4a3a"); deskBtn(...A, 0.3, 0.34, "ENGAGE AUTOPILOT", engage, 0.98, 0.17, "#6a2a22");
  deskBtn(...N, -0.5, 0.1, "TIME −", () => { warpI = Math.max(0, warpI - 1); }, 0.55); deskBtn(...N, 0.1, 0.1, "TIME +", () => { warpI = Math.min(WARPS.length - 1, warpI + 1); }, 0.55);
  deskBtn(...N, -0.42, 0.34, "TO TURNOVER", () => skip("turn"), 0.75); deskBtn(...N, 0.42, 0.34, "TO ARRIVAL", () => skip("arrive"), 0.75);
  button("SKY LABELS", -3.0, DECKS[2].y + 0.875, -3.0, Math.PI / 4, -1.3, () => toggleHud(), 0.7, 0.17);
  // inside the lift, on its wall facing the door: a button for each deck
  for (let d = 0; d < 4; d++) { const y = DECKS[d].y; if (d === 2) box(0.12, 1.4, 0.3, mPanel, LIFT_R - 0.02, y, 0); box(0.06, 1.0, 0.5, mPanel, LIFT_R - 0.06, y + 0.8, 0, 0); [["CUPOLA", 2], ["BRIDGE", 1], ["HABITAT", 0], ["HANGAR", 3]].forEach(([lab, to], k) => button(lab, LIFT_R - 0.1, y + 1.64 - k * 0.22, 0, -Math.PI / 2, 0, () => goDeck(to), 0.42, 0.18, to === d ? "#4a5a2a" : "#2a3a48")); } }
function drawLander() { const S = SCREENS.lander; if (!S || !park) return; const g = panel(S, "LANDER 1"), s = LAND.s, B = LAND.away ? LAND.B : landerBody(); let y = 160;
  const R = (l, v, c) => { row(g, y, l, v, 26, 600, 32, c); y += 50; }, gs = B.GM / B.R ** 2;
  g.fillStyle = "#f0d890"; g.font = "600 32px Helvetica, sans-serif";
  if (!LAND.away) { g.fillText(`Docked in the hangar · the ship orbits ${B.name}`, 26, 108);
    R("SURFACE GRAVITY", `${(gs / G0).toFixed(2)} g`); R("AIR AT THE SURFACE", B.atm ? `${(B.atm.rho / 1.225).toFixed(B.atm.rho < 0.1 ? 3 : 1)} × Earth's density` : "none"); R("DAY (one turn)", fmtDur(Math.abs(B.rot) * 86400)); R("ESCAPE SPEED", fmtKms(Math.sqrt(2 * B.GM / B.R)));
    R("LANDING", B.star ? "no: a star" : B.solid ? "yes: press LAND" : "no: no solid surface", B.solid ? "#9af0b0" : "#f0a090"); }
  else if (!s) { g.fillText(`Landing on ${B.name} planned`, 26, 108); R("UNDOCKING IN", fmtDur(Math.max(0, (LAND.departAt - coordMs) / 1000)), "#ffd890"); R("LANDING SITE", placeName(B, LAND.plan.lon)); R("FLIGHT DOWN", fmtDur(LAND.plan.Td)); R("MOST G EXPECTED", LAND.plan.maxG.toFixed(1) + " g"); }
  else { const r = Math.hypot(s.x, s.y), h = r - B.R, rx = s.x / r, ry = s.y / r, ux = s.vx + B.w * s.y, uy = s.vy - B.w * s.x, vr = ux * rx + uy * ry, vt = -ux * ry + uy * rx, sh = shipAt(LAND.T, s.t), dShip = Math.hypot(sh[0] - s.x, sh[1] - s.y);
    g.fillText(`${B.name} · ${s.phase.toUpperCase()}`, 26, 108);
    R("ALTITUDE", s.phase === "landed" ? "on the ground" : fmtLy(Math.max(h, 0) / LY), "#9ad8ff"); R("VERTICAL SPEED", `${vr < 0 ? "down" : "up"} ${fmtKms(Math.abs(vr))}`); R("SPEED OVER THE GROUND", fmtKms(Math.abs(vt))); R("ORBITAL SPEED (from the centre)", fmtKms(Math.hypot(s.vx, s.vy)));
    R("WEIGHT FELT: now / most", `${(s.phase === "landed" ? gs / G0 : s.load).toFixed(2)} g  /  ${s.maxG.toFixed(2)} g`); R("ENGINE", s.thrust > 0.3 ? `${(s.thrust / G0).toFixed(2)} g of thrust` : "off"); R("AIR", B.atm ? `${airRho(B, h).toPrecision(3)} kg/m³` : "none");
    R("THE SHIP", fmtLy(dShip / LY)); R("SPEED CHANGE USED (Δv)", fmtKms(s.dv)); if (s.phase === "landed") { const ha = wrapPi(Math.atan2(s.y, s.x) - sunAngle(B, coordMs)) * (Math.sign(B.w) || 1); R("LOCAL SOLAR TIME", `${pad(Math.floor(((12 + ha / Math.PI * 12) % 24 + 24) % 24))}:${pad(Math.floor((((12 + ha / Math.PI * 12) % 1) + 1) % 1 * 60))}`); } }
  g.fillStyle = "#c8a860"; g.font = "600 26px Helvetica, sans-serif"; g.fillText(`TIME: ${WARPS[warpI][1]}`, S.w - 420, 56); S.t.needsUpdate = true; }
// ---------- you: walking and the lift ----------
const P_ = { x: 0, z: -3.0, deck: 1 }; let yaw = 0, pitch = 0.05, dragging = false, down = null, started = false, vrDirty = true, msgT = 0, msgText = "";
const keys = {}; const intro = document.getElementById("intro"), FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .5s;z-index:5";
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(8,16,24,.8);color:#e0eef6;padding:10px 14px;border-radius:10px;font:13px/1.5 -apple-system,Helvetica,sans-serif;max-width:600px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(8,16,24,.9);color:#e8f2f8;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:800px;display:none";
document.body.append(HUD, MSG, FADE);
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function goDeck(d) { if (Math.hypot(P_.x, P_.z) > LIFT_R - 0.15) return say("Step into the lift first: the shaft in the middle of each deck, its door facing forward. The deck buttons are inside.", 6); if (d === P_.deck) return; FADE.style.opacity = 1; setTimeout(() => { P_.deck = d; P_.x = 0; P_.z = 0.2; yaw = 0; FADE.style.opacity = 0; say(`Lift: ${DECKS[d].name}. Walk out through the door ahead.`, 4); }, 450); }
function start() { if (started) return; started = true; intro?.classList.add("gone"); say("You are on the bridge of an antimatter starship in orbit near Earth. At the AUTOPILOT station (front left) choose a destination and press ENGAGE AUTOPILOT; the TRIP COMPUTER ahead shows both clocks and both velocities. To look out, take the lift behind you up to the CUPOLA.", 16); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyQ") goDeck(DECK_ORDER[Math.min(3, DECK_ORDER.indexOf(P_.deck) + 1)]); if (e.code === "KeyZ") goDeck(DECK_ORDER[Math.max(0, DECK_ORDER.indexOf(P_.deck) - 1)]); if (e.code === "BracketRight") warpI = Math.min(WARPS.length - 1, warpI + 1); if (e.code === "BracketLeft") warpI = Math.max(0, warpI - 1); if (e.code === "KeyH") toggleHud(); });
function toggleHud() { SKYLAB.on = !SKYLAB.on; say(`Cupola sky labels ${SKYLAB.on ? "on" : "off"}.`, 3); }
addEventListener("keyup", e => keys[e.code] = false);
const ray = new THREE.Raycaster();
const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function pick(origin, dir) { ray.set(origin, dir); const hit = ray.intersectObjects(BUTTONS, false).find(h => shown(h.object)); if (hit && hit.distance < 8) { hit.object.userData.onPick(); hit.object.scale.setScalar(0.92); setTimeout(() => hit.object.scale.setScalar(1), 150); return true; } return false; }
renderer.domElement.addEventListener("pointerdown", e => { dragging = true; down = [e.clientX, e.clientY]; start(); });
addEventListener("pointerup", e => { dragging = false; if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5 && !renderer.xr.isPresenting) { const m = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(m, camera); pick(ray.ray.origin.clone(), ray.ray.direction.clone()); } down = null; });
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const CTRL = [0, 1].map(i => { const c = renderer.xr.getController(i); rig.add(c); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -6)]), new THREE.LineBasicMaterial({ color: 0x8ad8ff })); c.add(ln);
  c.addEventListener("selectstart", () => { const o = new THREE.Vector3(), q = new THREE.Quaternion(); c.getWorldPosition(o); c.getWorldQuaternion(q); pick(o, V3(0, 0, -1).applyQuaternion(q)); }); return c; });
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 420; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.23), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 30; vrPanel.position.set(0, -0.32, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(lines) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 420); g.fillStyle = "rgba(8,16,24,.86)"; g.beginPath(); g.roundRect(0, 0, 1024, 420, 22); g.fill(); g.font = "26px -apple-system, Helvetica, sans-serif"; lines.forEach((t, i) => { g.fillStyle = i === 0 ? "#f0d890" : "#e0eef6"; g.fillText(t.replace(/<[^>]+>/g, "").slice(0, 70), 24, 44 + i * 36); }); vrT.needsUpdate = true; }
let SITTING = localStorage.getItem("vrPosture") === "sitting";
{ const card = intro?.querySelector(".card"), r = document.createElement("p"); r.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => r.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #1d4e66;" + ((b.dataset.p === "sitting") === SITTING ? "background:#1d4e66;color:#fff" : "background:#fff;color:#1d4e66"); });
  r.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(r, card.lastElementChild); }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); vrPanel.visible = false; }); }; });
// ---------- the loop ----------
// planets as the eye sees them: too small to show a disc from far off, but bright points, some brighter than any star. Apparent
// magnitude m = H + 5 log10(r d / AU^2) - 2.5 log10(phase) + (the star's brightness relative to the Sun), H the magnitude at 1 AU
// from the Sun and from us, fully lit; the phase is the fraction of the sunlit side facing us (a Lambert sphere).
const SOL_H = { Mercury: -0.6, Venus: -4.4, Earth: -3.99, Mars: -1.5, Jupiter: -9.4, Saturn: -8.9, Uranus: -7.1, Neptune: -7.0 }, MOON_H = 0.25;
const ALBEDO = { rock: 0.14, lava: 0.1, mars: 0.17, venus: 0.69, temperate: 0.3, ocean: 0.3, earth: 0.3, hot: 0.3, gas: 0.5, saturn: 0.5, ice: 0.5, nep: 0.44 };
const PL_TEMP = { rock: 5000, lava: 3200, mars: 3600, venus: 5600, temperate: 6500, ocean: 7500, earth: 6500, hot: 3800, gas: 4800, saturn: 4600, ice: 9000, nep: 12000 };
const NPL = 32, plDir = new Float32Array(NPL * 3), plMag = new Float32Array(NPL).fill(99), plTemp = new Float32Array(NPL).fill(5500), PLANET_PTS = mkStars(plDir, plMag, plTemp);
const _pp = V3();
function updatePlanetPoints(shipPos, ms) { plMag.fill(99); if (SYS && SYS.starMesh.visible) { const S = SYS.S, dm = isFinite(S.absMag) ? S.absMag - 4.83 : 0, starRel = shipRelM ? shipRelM.clone().negate() : V3((S.p[0] - shipPos[0]) * LY, (S.p[1] - shipPos[1]) * LY, (S.p[2] - shipPos[2]) * LY);
    const put = (k, fromStar, H, T) => { if (k >= NPL) return; _pp.copy(starRel).add(fromStar); const d = _pp.length(), r = fromStar.length(), ca = clampN(fromStar.dot(_pp) / (r * d), -1, 1), al = Math.acos(ca), q = (Math.sin(al) + (Math.PI - al) * ca) / Math.PI;
      plDir.set([_pp.x / d, _pp.y / d, _pp.z / d], k * 3); plMag[k] = H + 5 * Math.log10(r * d / (AU * AU)) - 2.5 * Math.log10(Math.max(q, 1e-5)) + dm; plTemp[k] = T; };
    SYS.planets.forEach((p, k) => put(k, planetPos(p, ms), SOL_H[p.name] ?? 5 * Math.log10(1329 / (2 * p.radius / 1000 * Math.sqrt(ALBEDO[p.kind] || 0.3))), PL_TEMP[p.kind] || 5500));
    if (SYS.moon) put(SYS.planets.length, planetPos(SYS.planets.find(p => p.name === "Earth"), ms).add(moonPos(ms)), MOON_H, 5400); }
  PLANET_PTS.geometry.attributes.aDir.needsUpdate = PLANET_PTS.geometry.attributes.aMag.needsUpdate = PLANET_PTS.geometry.attributes.aTemp.needsUpdate = true; }
// ---------- the cupola's head-up display ----------
// In the cupola, labels are projected onto the sky round each object: a ring on it, its name and how far away it is. Their directions get
// the same aberration as the stars, so at speed they crowd forward with them. Some galaxies, nebulae and clusters are drawn as soft glows
// at their true angular size (name, RA and Dec in degrees, distance and size in ly, colour, brightness).
const DSO = [["Andromeda Galaxy (M31)", 10.685, 41.269, 2.5e6, 140000, "#e0d6c4", 0.55], ["Triangulum Galaxy (M33)", 23.462, 30.660, 2.73e6, 61000, "#d8d4cc", 0.3],
  ["Large Magellanic Cloud", 80.894, -69.756, 160000, 14000, "#dcd8d0", 0.6], ["Small Magellanic Cloud", 13.187, -72.829, 200000, 7000, "#dcd8d0", 0.45],
  ["Orion Nebula (M42)", 83.822, -5.391, 1344, 24, "#ff9ab8", 0.5], ["Pleiades (M45)", 56.75, 24.117, 444, 13, "#a8c4ff", 0.4], ["Crab Nebula (M1)", 83.633, 22.015, 6500, 11, "#ffb090", 0.4],
  ["Carina Nebula", 161.265, -59.867, 8500, 460, "#ff8aa0", 0.4], ["Omega Centauri", 201.697, -47.479, 17090, 150, "#f0e0b0", 0.4]].map(([name, ra, de, d, size, col, a]) => ({ name, size, a,
  p: [d * Math.cos(de * DEG) * Math.cos(ra * DEG), d * Math.cos(de * DEG) * Math.sin(ra * DEG), d * Math.sin(de * DEG)],
  glow: (() => { const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: SPRITE_GLOW, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); g.renderOrder = -4; scene.add(g); return g; })() }));
// a direction in the equatorial frame, as seen from the moving ship (the shader's formula); returns the Doppler factor
const _d = V3(), _o = V3(), _pn = V3();
function aberr(d, out) { const u = skyUniforms.uV.value, b = skyUniforms.uBeta.value, eps = skyUniforms.uEps.value, c = d.dot(u); _pn.copy(d).addScaledVector(u, -c); const pl = _pn.length(); if (pl > 1e-9) _pn.divideScalar(pl);
  const omc2 = (1 - c) * eps / (1 + b * c), c2 = 1 - omc2; out.copy(u).multiplyScalar(c2).addScaledVector(_pn, Math.sqrt(Math.max(0, omc2 * (2 - omc2)))).applyMatrix3(R_EQ2SHIP).normalize(); return 1 / (skyUniforms.uGamma.value * (omc2 + eps * c2)); }
const HUD_R = 3000, SKYLAB = { on: true };
function hudLabel() { const c = document.createElement("canvas"); c.width = 512; c.height = 96; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.center.set(40 / 512, 0.5); s.scale.set(HUD_R * 0.05 * 512 / 96, HUD_R * 0.05, 1); s.renderOrder = 5; s.visible = false; scene.add(s); s.userData = { c, t, txt: "" }; return s; }
function hudText(s, a, b, col) { const U = s.userData, k = a + "|" + b + "|" + col; if (U.txt === k) return; U.txt = k; const g = U.c.getContext("2d"); g.clearRect(0, 0, 512, 96);
  g.strokeStyle = g.fillStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(40, 48, 16, 0, 6.2832); g.stroke(); g.beginPath(); g.moveTo(58, 48); g.lineTo(72, 48); g.stroke();
  g.shadowColor = "#000"; g.shadowBlur = 5; g.font = "600 30px Helvetica"; const w = g.measureText(a).width; if (w > 425) g.font = `600 ${Math.floor(30 * 425 / w)}px Helvetica`; g.fillText(a, 80, 42); g.font = "24px Helvetica"; g.globalAlpha = 0.8; g.fillText(b, 80, 76); g.globalAlpha = 1; U.t.needsUpdate = true; }
const starL = STARS.map(hudLabel), dsoL = DSO.map(hudLabel), bodyL = Array.from({ length: 16 }, hudLabel);
// show: in the cupola with the display on; txt: redraw the words (a few times a second, not every frame)
function updateHud(pos, show, txt) { const near = !!SYS && SYS.starMesh.visible, dest = mode === "trip" ? (trip.local ? -1 : trip.dest) : autoSys ? -1 : destI, dsel = mode === "trip" && trip.local ? trip.dpark.sel : autoSys && mode !== "trip" && sysList()[sysI] !== park?.sel ? sysList()[sysI] : -9;
  DSO.forEach((O, k) => { const dx = O.p[0] - pos[0], dy = O.p[1] - pos[1], dz = O.p[2] - pos[2], d = Math.hypot(dx, dy, dz), D = aberr(_d.set(dx / d, dy / d, dz / d), _o), L = dsoL[k];
    O.glow.position.copy(_o).multiplyScalar(SKY_R * 0.8); O.glow.scale.setScalar(SKY_R * 0.8 * Math.max(O.size / d / clampN(D, 0.05, 50), 0.004) * 2.2); O.glow.material.opacity = O.a * clampN(D * D, 0, 1);
    L.visible = show; if (show) { L.position.copy(_o).multiplyScalar(HUD_R); if (txt) hudText(L, O.name, fmtLy(d), "#c8a8ff"); } });
  STARS.forEach((S, i) => { const L = starL[i]; L.visible = false; if (!show || (near && SYS.S.i === i)) return; const dx = S.p[0] - pos[0], dy = S.p[1] - pos[1], dz = S.p[2] - pos[2], d = Math.hypot(dx, dy, dz); if (d < 1e-9) return;
    aberr(_d.set(dx / d, dy / d, dz / d), _o); L.position.copy(_o).multiplyScalar(HUD_R); L.visible = true; if (txt) hudText(L, S.name + (i === dest ? "  ◆ DESTINATION" : ""), fmtLy(d), i === dest ? "#ffb347" : S.bh ? "#ff9a9a" : "#8fe8c0"); });
  let bi = 0; const lab = (mesh, name, col, sel) => { if (sel === dsel) { name += "  ◆ DESTINATION"; col = "#ffb347"; } if (!mesh.visible || bi >= bodyL.length) return; const L = bodyL[bi++], r = Math.min(HUD_R, 0.9 * (mesh.position.length() - mesh.scale.x)); L.position.copy(mesh.position).normalize().multiplyScalar(r); L.scale.set(r * 0.05 * 512 / 96, r * 0.05, 1); L.visible = true; if (txt || !L.userData.txt.startsWith(name + "|")) hudText(L, name, fmtLy(mesh.userData.dist / LY), col); };
  if (show && near) { lab(SYS.starMesh, SYS.S.name, "#ffe08a", -1); SYS.planets.forEach((p, k) => lab(p.mesh, p.name, "#9ad0ff", k)); if (SYS.moon) lab(SYS.moon.mesh, "the Moon", "#9ad0ff", -2); }
  for (; bi < bodyL.length; bi++) bodyL[bi].visible = false; }
parkAt(0); setAttitude(bow);
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0); let scrT = 0, hudT = 0, loopErrs = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting;
  if (started) stepFlight(dt);
  if (LAND.away && LAND.s) setFrame(LAND.fx, LAND.fy); else setAttitude(bow); const st = curState(), u = mode === "trip" ? trip.u : [1, 0, 0]; skyUniforms.uV.value.set(...u); skyUniforms.uBeta.value = st.v / C; skyUniforms.uGamma.value = st.gamma; skyUniforms.uEps.value = mode === "trip" ? Math.exp(-st.phi) / Math.cosh(st.phi) : 1;   // 1 - beta, computed without cancellation
  { const b = st.v / C; FWD.visible = b > 0.98; if (FWD.visible) { FWD.position.copy(eq2ship(u)).multiplyScalar(SKY_R * 0.9); FWD.scale.setScalar(SKY_R * 0.9 * clampN(0.01 + 0.008 * Math.log10(st.gamma), 0.01, 0.07)); } }
  const hideI = updateSystem(shipPos, coordMs); updateNamedStars(shipPos, hideI); updatePlanetPoints(shipPos, coordMs); updateHud(shipPos, PLACE === "ship" && P_.deck === 2 && SKYLAB.on, scrT <= dt); updateSurface();
  // walking
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) warpI = Math.max(0, warpI - 1); if (tap("L", gp, 5)) warpI = Math.min(WARPS.length - 1, warpI + 1); }
      else { if (tap("R", gp, 4) && PLACE === "ship") goDeck(DECK_ORDER[(DECK_ORDER.indexOf(P_.deck) + 1) % 4]); if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyAxisAngle(UP, vrTurn); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.set(-fwd.z, 0, fwd.x);
  if (mx || my) { const sp = 1.4 * dt, nx = P_.x + (fwd.x * -my + side.x * mx) * sp, nz = P_.z + (fwd.z * -my + side.z * mx) * sp; if (canWalk(nx, nz)) { P_.x = nx; P_.z = nz; } else if (canWalk(nx, P_.z)) P_.x = nx; else if (canWalk(P_.x, nz)) P_.z = nz; }
  const sit = vr && SITTING ? 0.45 : 0; if (PLACE === "ship") rig.position.set(P_.x, DECKS[P_.deck].y + sit, P_.z); else if (PLACE === "outside") rig.position.set(P_.x, -CAB_H + sit, P_.z); else rig.position.set(LANDER.position.x + P_.x, LANDER.position.y + sit, LANDER.position.z + P_.z);
  // screens and messages
  scrT -= dt; if (scrT <= 0) { scrT = 0.25; drawLander(); if (PLACE === "ship") { drawTrip(); drawAuto(); drawNav(); drawEng(); drawShip(); } }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; HUD.innerHTML = `<b>${PLACE === "ship" ? DECKS[P_.deck].name : PLACE === "outside" ? "outside, on " + LAND.B.name : "the lander" + (LAND.s ? ": " + LAND.s.phase : LAND.away ? ": waiting to undock" : ", docked")}</b> · ${mode === "trip" ? `to <b>${destName(trip)}</b>, ${st.phase}` : mode === "align" ? "turning to the course" : `in orbit near ${parkName()}`} · time: ${WARPS[warpI][1]}<br>ship ${fmtDate(properMs)} · stars ${fmtDate(coordMs)}<br>map velocity v = ${fmtKms(st.v)} (${fmtC(st.v)}) · proper velocity w = ${fmtKms(st.w)} (${fmtC(st.w)}) · γ = ${fmtG(st.gamma)}<br><span style="color:#8ab0c4;font-size:12px">WASD walk · drag to look · click the console buttons · [ ] time · Q/Z lift up/down (in the lift) · H sky labels (cupola) · the lander is in the hangar</span>`;
    if (vr) drawVR([`${mode === "trip" ? "to " + destName(trip) + " · " + st.phase : "in orbit near " + parkName()} · ${WARPS[warpI][1]}`, `ship ${fmtDate(properMs)}`, `stars ${fmtDate(coordMs)}`, `v ${fmtKms(st.v)}  w ${fmtKms(st.w)}  gamma ${fmtG(st.gamma)}`, msgText.slice(0, 70), msgText.slice(70, 140), "trigger: press buttons · A in the lift: next deck · X/Y: time"]); }
  renderer.render(scene, camera); }

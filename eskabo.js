// eskabo.js -- stick sparring in VR, in the manner of Eskabo Daan and the Filipino arts it comes from. Built into eskabo.html by build.py.
//
// What it rests on. Eskabo Daan was founded in San Francisco by Grandmaster Robert Castro, who trained under Angel Cabales (Cabales
// Serrada Eskrima) and Ernesto Presas (Kombatan); the name stands for Eskrima, Serrada, Kali, Arnis, Boxing and jeet kune dO, and daan means
// "the way". Serrada is close-range fighting with a short stick; its backbone is Cabales' 12 angles of attack (1 left temple, 2 right
// temple, 3 left arm, 4 right arm, 5 thrust to the stomach, 6 left chest, 7 right chest, 8 right leg, 9 left leg, 10 left eye, 11 right
// eye, 12 the crown), with three blocks for each (pass blocks, cross blocks, then shoulder blocks and gating), the live hand checking
// the attacker's weapon hand, and drills where a dagger thrust follows each angle. Eskabo Daan's own numbering may differ; these are
// Serrada's. Your 18-inch rattan stick is in your right hand (a fist's width of butt, the punyo, below your hand); in your left, an
// empty live hand, a training dagger, or a second stick. The partner is a computer: it feeds angles, defends, counters and spars.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2a2620);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 100);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.65;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, UP = V3(0, 1, 0), YAX = V3(0, 1, 0), NZ = V3(0, 0, -1);
const STICK = 0.457, PUNYO = 0.06, STICK_R = 0.0125;

// ---------- the training hall ----------
const canvasTex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; };
const floorT = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { const v = 150 + Math.random() * 40; g.fillStyle = `rgb(${v},${v * 0.72},${v * 0.45})`; g.fillRect(0, i * 64, w, 63); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(80,50,20,${Math.random() * 0.15})`; g.fillRect(Math.random() * w, i * 64 + Math.random() * 60, 40 + Math.random() * 120, 1); } g.fillStyle = "rgba(40,25,10,0.6)"; g.fillRect((i * 173) % w, i * 64, 2, 64); } }, [6, 6]);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.55 })); floor.receiveShadow = true; scene.add(floor);
const matT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#24427a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#16284a"; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); }, [6, 6]);
const mats = new THREE.Mesh(new THREE.BoxGeometry(6, 0.03, 6), new THREE.MeshStandardMaterial({ map: matT, roughness: 0.8 })); mats.position.set(0, 0.015, 0.4); mats.receiveShadow = true; scene.add(mats);
const FLOOR_Y = 0.03;
const wallM = new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.9 });
for (const [x, z, ry] of [[0, -6, 0], [0, 6, Math.PI], [-6, 0, Math.PI / 2], [6, 0, -Math.PI / 2]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallM); w.position.set(x, 2, z); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); }
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8d4cc })); ceil.position.y = 4; scene.add(ceil);
// a banner spelling out the name, crossed sticks, and a rack of rattan sticks
const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 256, (g, w, h) => { g.fillStyle = "#7a1414"; g.fillRect(0, 0, w, h); g.strokeStyle = "#e8c050"; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = "#f4e2b0"; g.font = "bold 92px Georgia, serif"; g.textAlign = "center"; g.fillText("ESKABO DAAN", w / 2, 118); g.font = "34px Georgia, serif"; g.fillText("Eskrima · Serrada · Kali · Arnis · Boxing · jeet kune dO", w / 2, 190); }), roughness: 0.9 }));
banner.position.set(0, 3.2, -5.98); scene.add(banner);
const rattanT = canvasTex(64, 512, (g, w, h) => { g.fillStyle = "#c8a060"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 38 + Math.random() * 30) { g.fillStyle = "#3a2210"; g.fillRect(0, y, w, 10 + Math.random() * 8); g.fillStyle = "#6a4420"; g.fillRect(0, y - 4, w, 4); } for (let y = 50; y < h; y += 120) { g.fillStyle = "rgba(90,60,20,0.8)"; g.fillRect(0, y, w, 3); } });
const rattanM = new THREE.MeshStandardMaterial({ map: rattanT, roughness: 0.6 });
function makeStick() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(STICK_R, STICK_R, STICK, 12).rotateX(Math.PI / 2), rattanM); m.position.z = -(STICK / 2 - PUNYO); m.castShadow = true; g.add(m); return g; }
for (let i = 0; i < 9; i++) { const s = makeStick(); s.rotation.set(-Math.PI / 2 + 0.05, 0, 0); s.position.set(-5.9, 0.9 + (i % 3) * 0.01, -1.5 + i * 0.12); scene.add(s); }
{ const rack = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 1.3), new THREE.MeshStandardMaterial({ color: 0x5a3a1a })); rack.position.set(-5.92, 1.35, -1.0); scene.add(rack); }
for (const [a, x] of [[0.7, -0.5], [-0.7, 0.5]]) { const s = makeStick(); s.position.set(x * 0.3, 3.0 - 0.5, -5.95); s.rotation.set(0, 0, a + Math.PI); s.rotateX(Math.PI / 2); scene.add(s); }
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x504030, 0.9));
const key = new THREE.DirectionalLight(0xfff0dc, 1.6); key.position.set(2, 3.8, 2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 10 }); key.shadow.bias = -0.0005; scene.add(key);
for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const p = new THREE.PointLight(0xffe8c8, 6, 9, 1.6); p.position.set(x, 3.7, z); scene.add(p); const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff8e8 })); f.position.set(x, 3.97, z); scene.add(f); }

// ---------- sound: rattan on rattan, a stick on padding, the round bell ----------
let AC = null; const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function noise(dur, decay) { const a = ac(), b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (a.sampleRate * decay)); const n = a.createBufferSource(); n.buffer = b; return n; }
function clack(v = 1) { if (!AC) return; const a = ac(), t = a.currentTime, n = noise(0.09, 0.012), f = a.createBiquadFilter(), g = a.createGain(); f.type = "bandpass"; f.frequency.value = 1500 + 900 * Math.random(); f.Q.value = 5; g.gain.value = 1.4 * v; n.connect(f).connect(g).connect(a.destination); n.start(t);
  const o = a.createOscillator(), og = a.createGain(); o.frequency.value = 780 + 200 * Math.random(); og.gain.setValueAtTime(0.35 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.07); o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.08); }
function thud(v = 1) { if (!AC) return; const a = ac(), t = a.currentTime, n = noise(0.12, 0.025), f = a.createBiquadFilter(), g = a.createGain(); f.type = "lowpass"; f.frequency.value = 420; g.gain.value = 2.2 * v; n.connect(f).connect(g).connect(a.destination); n.start(t); }
function bell() { if (!AC) return; const a = ac(), t = a.currentTime; for (const [fr, v] of [[880, 0.3], [1320, 0.15], [2210, 0.08]]) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = fr; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.8); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 1.9); } }
let voiceOn = true; const speak = s => { if (!voiceOn || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(s); u.rate = 1.15; speechSynthesis.speak(u); };

// ---------- geometry: closest points between segments (sticks, limbs) ----------
const _d1 = V3(), _d2 = V3(), _r = V3(), _c1 = V3(), _c2 = V3();
function segDist(p1, q1, p2, q2, out1, out2) { _d1.subVectors(q1, p1); _d2.subVectors(q2, p2); _r.subVectors(p1, p2); const a = _d1.dot(_d1), e = _d2.dot(_d2), f = _d2.dot(_r); let s, t;
  if (a < 1e-9 && e < 1e-9) { s = t = 0; } else if (a < 1e-9) { s = 0; t = clampN(f / e, 0, 1); } else { const c = _d1.dot(_r); if (e < 1e-9) { t = 0; s = clampN(-c / a, 0, 1); } else { const b = _d1.dot(_d2), den = a * e - b * b; s = den > 1e-9 ? clampN((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clampN(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clampN((b - c) / a, 0, 1); } } }
  _c1.copy(p1).addScaledVector(_d1, s); _c2.copy(p2).addScaledVector(_d2, t); if (out1) out1.copy(_c1); if (out2) out2.copy(_c2); segDist.s = s; segDist.t = t; return _c1.distanceTo(_c2); }

// ---------- your weapons ----------
// In VR they ride on your controllers' grip poses (the stick along the line of your fist); on a desktop, on the mouse.
const gloveM = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.7 }), bladeM = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.5 });
function makeGlove() { const g = new THREE.Group(), m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), gloveM); m.scale.set(1, 1.1, 1.35); m.castShadow = true; g.add(m); return g; }
function makeDagger() { const g = new THREE.Group(), h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.11, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })), gd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), bladeM), b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.18), bladeM);
  h.position.z = 0.0; gd.position.z = -0.06; b.position.z = -0.15; b.geometry.translate(0, 0, 0); [h, gd, b].forEach(m => { m.castShadow = true; g.add(m); }); return g; }
const OFF = ["live hand", "dagger", "second stick"];
let offI = 0, lefty = false, gripTilt = 0;
const HANDS = { right: new THREE.Group(), left: new THREE.Group() };
const MOUNT = { right: new THREE.Group(), left: new THREE.Group() };
for (const s of ["right", "left"]) HANDS[s].add(MOUNT[s]);
const W = { right: { stick: makeStick(), glove: makeGlove(), dagger: makeDagger(), stick2: makeStick() }, left: { stick: makeStick(), glove: makeGlove(), dagger: makeDagger(), stick2: makeStick() } };
for (const s of ["right", "left"]) for (const k in W[s]) MOUNT[s].add(W[s][k]);
const mainSide = () => lefty ? "left" : "right", offSide = () => lefty ? "right" : "left";
function equip() { const m = mainSide(), o = offSide(); for (const s of ["right", "left"]) { W[s].stick.visible = s === m; W[s].glove.visible = true; W[s].dagger.visible = s === o && offI === 1; W[s].stick2.visible = s === o && offI === 2; MOUNT[s].rotation.x = gripTilt; } }
const SRC = { right: null, left: null }, GRIP = {};
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { const h = e.data.handedness; if (h !== "left" && h !== "right") return; GRIP[h] = grip; grip.add(HANDS[h]); }); grip.addEventListener("disconnected", () => { for (const h in GRIP) if (GRIP[h] === grip) delete GRIP[h]; }); }
// desktop: both hands hang off the camera; the stick hand follows the mouse
const DESK = { right: new THREE.Group(), left: new THREE.Group() }; camera.add(DESK.right, DESK.left); DESK.right.add(HANDS.right); DESK.left.add(HANDS.left);
let mouseX = 0.3, mouseY = 0.1;
function placeDesktop() { const m = mainSide(), o = offSide(), sx = m === "right" ? 1 : -1; DESK[m].position.set(mouseX * 0.45, -0.3 + mouseY * 0.4, -0.5); DESK[m].rotation.set(0.9 + mouseY * 0.3, -mouseX * 0.6, -mouseX * 0.4 * sx);
  DESK[o].position.set(-0.18 * sx, -0.32, -0.38); DESK[o].rotation.set(0.3, 0, 0); }
// segments of what you hold, in world space, and how fast their tips move
const WS = { main: { a: V3(), b: V3(), pb: V3(), v: 0, cd: 0, blockedT: 0 }, off: { a: V3(), b: V3(), pb: V3(), v: 0, cd: 0, blockedT: 0 } }, _q = V3();
function updateSegs(dt) { const m = mainSide(), o = offSide();
  const put = (S, side, near, far) => { const M = MOUNT[side]; M.updateWorldMatrix(true, false); S.pb.copy(S.b); S.a.set(0, 0, -near).applyMatrix4(M.matrixWorld); S.b.set(0, 0, -far).applyMatrix4(M.matrixWorld); S.v = dt > 0 ? S.b.distanceTo(S.pb) / dt : 0; if (S.v > 40) S.v = 0; };
  put(WS.main, m, -PUNYO, STICK - PUNYO); if (offI === 0) put(WS.off, o, -0.03, 0.05); else if (offI === 1) put(WS.off, o, 0.05, 0.24); else put(WS.off, o, -PUNYO, STICK - PUNYO);
  WS.main.cd -= dt; WS.off.cd -= dt; WS.main.blockedT -= dt; WS.off.blockedT -= dt; }
const handPos = side => { const v = V3(); MOUNT[side].getWorldPosition(v); return v; };

// ---------- your body, for the partner to aim at: estimated from your head ----------
const ME = { x: 0, z: 2.0, yaw: 0 }, PB = { head: V3(), f: V3(), r: V3(), s: 1, hips: V3(), neck: V3(), floorH: V3() };
let seated = false;
function updateBody() { camera.getWorldPosition(PB.head); const q = camera.getWorldQuaternion(new THREE.Quaternion()); PB.f.copy(NZ).applyQuaternion(q); PB.f.y = 0; if (PB.f.lengthSq() < 1e-4) PB.f.set(0, 0, -1); PB.f.normalize(); PB.r.crossVectors(PB.f, UP);
  PB.s = clampN((PB.head.y - FLOOR_Y) / 1.62, 0.55, 1.25); PB.neck.copy(PB.head).addScaledVector(UP, -0.2 * PB.s).addScaledVector(PB.f, -0.06); PB.hips.copy(PB.head).addScaledVector(UP, -0.72 * PB.s).addScaledVector(PB.f, -0.06); PB.floorH.set(PB.head.x, FLOOR_Y, PB.head.z).addScaledVector(PB.f, -0.04); }
function playerTarget(i) { const h = PB.head, s = PB.s, L = PB.r.clone().negate(), R = PB.r, F = PB.f, t = h.clone();
  switch (i) { case 1: t.addScaledVector(L, 0.08); break; case 2: t.addScaledVector(R, 0.08); break; case 3: t.addScaledVector(UP, -0.42 * s).addScaledVector(L, 0.24); break; case 4: t.addScaledVector(UP, -0.42 * s).addScaledVector(R, 0.24); break;
    case 5: case 13: t.addScaledVector(UP, -0.62 * s).addScaledVector(F, 0.1); break; case 6: t.addScaledVector(UP, -0.36 * s).addScaledVector(L, 0.1).addScaledVector(F, 0.1); break; case 7: t.addScaledVector(UP, -0.36 * s).addScaledVector(R, 0.1).addScaledVector(F, 0.1); break;
    case 8: t.set(h.x, FLOOR_Y + 0.5 * s, h.z).addScaledVector(R, 0.12).addScaledVector(F, 0.04); break; case 9: t.set(h.x, FLOOR_Y + 0.5 * s, h.z).addScaledVector(L, 0.12).addScaledVector(F, 0.04); break;
    case 10: t.addScaledVector(L, 0.035).addScaledVector(F, 0.07); break; case 11: t.addScaledVector(R, 0.035).addScaledVector(F, 0.07); break; case 12: t.addScaledVector(UP, 0.1); break; }
  return t; }
// your volumes: head, torso, legs, and both hands (a struck hand is the commonest hit in stick fighting)
function playerVolumes() { const v = [{ a: PB.head.clone().addScaledVector(PB.f, -0.04), b: null, r: 0.11, n: "head" }, { a: PB.neck, b: PB.hips, r: 0.16, n: "body" }];
  if (!seated) for (const sd of [1, -1]) { const hip = PB.hips.clone().addScaledVector(PB.r, 0.1 * sd), foot = PB.floorH.clone().addScaledVector(PB.r, 0.13 * sd).setY(FLOOR_Y + 0.08); v.push({ a: hip, b: foot, r: 0.08, n: sd > 0 ? "right leg" : "left leg" }); }
  v.push({ a: handPos(mainSide()), b: null, r: 0.05, n: "stick hand" }, { a: handPos(offSide()), b: null, r: 0.05, n: offI === 0 ? "live hand" : "left hand" }); return v; }

// ---------- the partner ----------
const OPP = { p: V3(0, FLOOR_Y, 0.85), yaw: 0, f: V3(0, 0, 1), r: V3(-1, 0, 0), lunge: 0, flinch: 0, hand: V3(), dir: V3(0, 1, 0), handL: V3(), dirL: V3(0, 1, 0), elbow: V3(), elbowL: V3(), sh: V3(), shL: V3(), head: V3(), chest: V3(), hips: V3(), aR: V3(), aL: V3() };
const shirtM = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.85 }), pantsM = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.9 }), skinM = new THREE.MeshStandardMaterial({ color: 0xa87452, roughness: 0.6 }), padM = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.5 }), helmM = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.45 });
const limb = (r0, r1, m) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 14), m); me.castShadow = true; scene.add(me); return me; }, ball = (r, m) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.castShadow = true; scene.add(me); return me; };
const OB = { torso: limb(0.15, 0.18, shirtM), pelvis: ball(0.155, pantsM), chestB: ball(0.175, shirtM), neck: limb(0.05, 0.05, skinM), uaR: limb(0.05, 0.055, shirtM), faR: limb(0.04, 0.045, skinM), uaL: limb(0.05, 0.055, shirtM), faL: limb(0.04, 0.045, skinM), shR: ball(0.058, shirtM), shL: ball(0.058, shirtM), elR: ball(0.048, skinM), elL: ball(0.048, skinM), hR: ball(0.055, padM), hL: ball(0.055, padM),
  thR: limb(0.06, 0.075, pantsM), shinR: limb(0.05, 0.06, pantsM), thL: limb(0.06, 0.075, pantsM), shinL: limb(0.05, 0.06, pantsM), knR: ball(0.06, pantsM), knL: ball(0.06, pantsM), ftR: ball(0.05, helmM), ftL: ball(0.05, helmM) };
OB.ftR.scale.set(1, 0.6, 2.2); OB.ftL.scale.set(1, 0.6, 2.2);
// head in a padded helmet with a steel face grille, as stick sparring is done
const HEAD = new THREE.Group(); scene.add(HEAD);
{ const sk = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skinM); HEAD.add(sk); const hm = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), helmM); hm.rotation.x = -0.45; hm.castShadow = true; HEAD.add(hm);
  const grT = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#c8ccd0"; g.lineWidth = 7; for (let x = 8; x < w; x += 34) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 8; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  const gr = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.22, Math.PI * 0.5), new THREE.MeshStandardMaterial({ map: grT, alphaTest: 0.5, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); HEAD.add(gr); }
const OSTICK = makeStick(), ODAG = makeDagger(), OSTICK2 = makeStick(); scene.add(OSTICK, ODAG, OSTICK2);
function placeLimb(me, a, b) { const d = _q.subVectors(b, a), L = d.length(); me.position.copy(a).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(YAX, d.divideScalar(L || 1)); me.scale.set(1, L, 1); }
function ik2(S, H, a, b, hint, outE, outH) { const d = V3().subVectors(H, S); let L = d.length(); const dir = d.divideScalar(L || 1); L = Math.min(L, a + b - 0.002); outH.copy(S).addScaledVector(dir, L); const x = (a * a - b * b + L * L) / (2 * L), y = Math.sqrt(Math.max(0, a * a - x * x)); const perp = hint.clone().addScaledVector(dir, -hint.dot(dir)); if (perp.lengthSq() < 1e-6) perp.set(0, -1, 0); perp.normalize(); outE.copy(S).addScaledVector(dir, x).addScaledVector(perp, y); }
const L2W = (o, x, y, z) => V3().addScaledVector(OPP.r, x).addScaledVector(UP, y).addScaledVector(OPP.f, z).add(o);
const dirW = (x, y, z) => V3().addScaledVector(OPP.r, x).addScaledVector(UP, y).addScaledVector(OPP.f, z).normalize();
function weaponAt(obj, hand, dir) { obj.position.copy(hand); obj.quaternion.setFromUnitVectors(NZ, dir); }
function slerpDir(a, b, t) { const q = new THREE.Quaternion().setFromUnitVectors(a, b); return a.clone().applyQuaternion(new THREE.Quaternion().slerp(q, t)).normalize(); }
const ease = t => t * t * (3 - 2 * t);
// the 12 angles (Cabales Serrada), plus the dagger thrust: where the partner's hand chambers (beside its right shoulder: right, up, forward)
// and which way the stick points there
const ANG = [null,
  { n: "left temple", k: "s", ch: [0.15, 0.28, -0.05], cd: [0.35, 0.8, -0.45] }, { n: "right temple", k: "s", ch: [-0.38, 0.22, 0.02], cd: [-0.55, 0.7, -0.4] },
  { n: "left arm", k: "s", ch: [0.22, 0.02, -0.1], cd: [0.7, 0.35, -0.6] }, { n: "right arm", k: "s", ch: [-0.42, -0.02, 0.05], cd: [-0.75, 0.35, -0.5] },
  { n: "thrust to the stomach", k: "t", ch: [0.02, -0.42, -0.12] }, { n: "thrust to the left chest", k: "t", ch: [0.08, -0.25, -0.12] }, { n: "thrust to the right chest", k: "t", ch: [-0.12, -0.25, -0.1] },
  { n: "right leg", k: "s", ch: [-0.38, -0.15, 0.02], cd: [-0.55, 0.6, -0.45] }, { n: "left leg", k: "s", ch: [0.2, 0.08, -0.05], cd: [0.5, 0.7, -0.45] },
  { n: "thrust to the left eye", k: "t", ch: [0.06, -0.12, -0.14] }, { n: "thrust to the right eye", k: "t", ch: [-0.1, -0.12, -0.12] },
  { n: "the crown of the head", k: "s", ch: [0.05, 0.38, -0.08], cd: [0.1, 0.6, -0.8] },
  { n: "dagger thrust", k: "d", ch: [0.05, -0.45, -0.05] }];
const NUMW = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "dagger"];
const SPEEDS = [[0.35, "very slow"], [0.55, "slow"], [0.75, "medium"], [1.0, "fast"], [1.2, "full speed"]], BLOCKP = [0.3, 0.45, 0.6, 0.75, 0.85], REACT = [0.3, 0.22, 0.15, 0.09, 0.05];
const MODES = ["Angles 1 to 12", "Random angles", "Your strikes", "Sparring"];
let modeI = 0, speedI = 1, running = false;
const AI = { noBlock: 0, st: "guard", t: 0, dur: 0, plan: null, next: 1, wait: 1.5, queue: [], blockIn: -1, blockT: 0, fromH: V3(), fromD: V3(), fromHL: V3(), fromDL: V3(), dist: 1.0, roundT: 0, checked: 0 };
const SC = { you: 0, them: 0, blocks: 0, fed: 0, hitsOnYou: 0 };
function guardPose() { const sh = OPP.sh, shL = OPP.shL; return { h: L2W(sh, -0.04, -0.2, 0.3), d: dirW(-0.12, 0.8, 0.45), hl: offI === 0 ? L2W(shL, 0.12, -0.18, 0.26) : L2W(shL, 0.05, -0.28, 0.25), dl: offI === 0 ? dirW(0, 1, 0) : dirW(0.1, 0.55, 0.6) }; }
function startAttack(i, quick = false) { AI.plan = { i, A: ANG[i], left: ANG[i].k === "d", done: false, res: null, quick }; AI.st = "chamber"; AI.t = 0; AI.dur = (quick ? 0.2 : 0.34) / SPEEDS[speedI][0];
  AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); if (modeI < 2) { showTag(i === 13 ? "Dagger thrust" : `Angle ${i}: ${ANG[i].n}`); speak(NUMW[i]); } }
function planGeometry() { const P = AI.plan, A = P.A, sh = P.left ? OPP.shL : OPP.sh, T = playerTarget(P.i); P.T = T; P.Hch = L2W(sh, A.ch[0], A.ch[1], A.ch[2]);
  if (A.k === "s") { P.chD = dirW(A.cd[0], A.cd[1], A.cd[2]); P.Hc = T.clone().add(V3().subVectors(sh, T).normalize().multiplyScalar(0.3)); P.cD = V3().subVectors(T, P.Hc).normalize(); P.fD = P.cD.clone().multiplyScalar(2).sub(P.chD).normalize(); P.Hf = P.Hc.clone().add(V3().subVectors(P.Hc, P.Hch).normalize().multiplyScalar(0.25)); }
  else { const reach = A.k === "d" ? 0.22 : STICK - PUNYO - 0.03; P.chD = V3().subVectors(T, P.Hch).normalize(); P.cD = P.chD.clone(); P.Hc = T.clone().addScaledVector(P.cD, -reach); P.fD = P.cD.clone(); P.Hf = P.Hc.clone(); } }
function endAttack(res) { const P = AI.plan; if (!P || P.done) return; P.done = true; P.res = res; if (modeI < 2) { SC.fed++; if (res === "blocked" || res === "checked") SC.blocks++; } }
function deflect(normal) { AI.st = "deflect"; AI.t = 0; AI.dur = 0.3; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.defH = OPP.hand.clone().addScaledVector(normal, 0.14).addScaledVector(OPP.f, -0.08); AI.defD = slerpDir(OPP.dir, UP, 0.5); }
function setTag(t) { AI.tag = t; }
function aiUpdate(dt) { const spd = SPEEDS[speedI][0], G = guardPose();
  // footwork: keep serrada's close range, step in on the strike, back off between exchanges when sparring
  const want = modeI === 3 && AI.st === "guard" && AI.wait > 0.6 ? 1.3 : 1.0, toMe = V3(PB.head.x - OPP.p.x, 0, PB.head.z - OPP.p.z), d = toMe.length();
  OPP.f.copy(toMe).normalize(); OPP.r.crossVectors(OPP.f, UP); const mv = (d > want ? clampN((d - want) * 3, 0, 1.1) : d < 0.78 ? clampN((d - 0.78) * 3, -1.1, 0) : 0) * dt; OPP.p.addScaledVector(OPP.f, mv); OPP.p.x = clampN(OPP.p.x, -5.3, 5.3); OPP.p.z = clampN(OPP.p.z, -5.3, 5.3);
  let lungeT = 0; AI.t += dt;
  if (AI.st === "guard") { OPP.hand.lerp(G.h, 1 - Math.exp(-dt * 10)); OPP.dir.copy(slerpDir(OPP.dir, G.d, 1 - Math.exp(-dt * 10))); OPP.handL.lerp(G.hl, 1 - Math.exp(-dt * 10)); OPP.dirL.copy(slerpDir(OPP.dirL, G.dl, 1 - Math.exp(-dt * 10)));
    if (running) { AI.wait -= dt; if (AI.wait <= 0) { if (modeI === 0) { let i = AI.next; if (offI === 1 && AI.lastWasAngle) { i = 13; AI.lastWasAngle = false; } else { AI.next = AI.next % 12 + 1; if (seated && (i === 8 || i === 9)) { i = AI.next; AI.next = AI.next % 12 + 1; } AI.lastWasAngle = true; } startAttack(i); AI.wait = 1.7 / Math.sqrt(spd); }
        else if (modeI === 1) { let i; do { i = 1 + Math.floor(Math.random() * 12); } while (seated && (i === 8 || i === 9)); if (offI === 1 && Math.random() < 0.25) i = 13; startAttack(i); AI.wait = (0.9 + Math.random() * 0.9) / Math.sqrt(spd); }
        else if (modeI === 3) { if (!AI.queue.length) { const combos = [[1], [2], [1, 2], [1, 5], [12], [3, 4], [1, 2, 12], [8], [9, 2], [5], [10], [4, 1], [1, 9]]; AI.queue = combos[Math.floor(Math.random() * combos.length)].filter(i => !(seated && (i === 8 || i === 9))); if (offI === 1 && Math.random() < 0.4) AI.queue.push(13); }
          startAttack(AI.queue.shift(), false); AI.wait = AI.queue.length ? 0.05 : (0.8 + Math.random() * 1.6) / spd; } } } }
  else if (AI.st === "chamber") { const P = AI.plan; planGeometry(); const u = ease(Math.min(1, AI.t / AI.dur));
    if (P.left) { OPP.handL.lerpVectors(AI.fromHL, P.Hch, u); OPP.dirL.copy(slerpDir(AI.fromDL, P.chD, u)); } else { OPP.hand.lerpVectors(AI.fromH, P.Hch, u); OPP.dir.copy(slerpDir(AI.fromD, P.chD, u)); }
    if (AI.t >= AI.dur) { AI.st = "strike"; AI.t = 0; AI.dur = 0.2 / spd; } }
  else if (AI.st === "strike") { const P = AI.plan, u = Math.min(1, AI.t / AI.dur), c = 0.55; let h, dd; lungeT = Math.sin(Math.PI * Math.min(1, u * 1.3)) * 0.22;
    if (u < c) { const w = ease(u / c); h = V3().lerpVectors(P.Hch, P.Hc, w); dd = slerpDir(P.chD, P.cD, w); } else { const w = (u - c) / (1 - c); h = V3().lerpVectors(P.Hc, P.Hf, w); dd = slerpDir(P.cD, P.fD, w); }
    if (P.left) { OPP.handL.copy(h); OPP.dirL.copy(dd); } else { OPP.hand.copy(h); OPP.dir.copy(dd); }
    if (AI.t >= AI.dur) { if (!P.done) endAttack("evaded"); AI.st = "recover"; AI.t = 0; AI.dur = 0.32 / spd; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); } }
  else if (AI.st === "deflect") { const u = ease(Math.min(1, AI.t / AI.dur)); OPP.hand.lerpVectors(AI.fromH, AI.defH, u); OPP.dir.copy(slerpDir(AI.fromD, AI.defD, u)); OPP.handL.lerp(G.hl, 1 - Math.exp(-dt * 8));
    if (AI.t >= AI.dur) { AI.st = "recover"; AI.t = 0; AI.dur = 0.28 / spd; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); } }
  else if (AI.st === "recover") { const u = ease(Math.min(1, AI.t / AI.dur)); OPP.hand.lerpVectors(AI.fromH, G.h, u); OPP.dir.copy(slerpDir(AI.fromD, G.d, u)); OPP.handL.lerpVectors(AI.fromHL, G.hl, u); OPP.dirL.copy(slerpDir(AI.fromDL, G.dl, u)); if (AI.t >= AI.dur) { AI.st = "guard"; AI.t = 0; } }
  else if (AI.st === "block") { const Tp = OPP[AI.threat || "head"], mid = V3().lerpVectors(WS.main.a, WS.main.b, 0.7), side = V3().subVectors(mid, Tp); side.addScaledVector(OPP.f, -0.5 * side.dot(OPP.f)); if (side.lengthSq() < 1e-6) side.copy(OPP.f); side.normalize();
    let bd = V3().crossVectors(AI.threatV || UP, OPP.f); if (bd.lengthSq() < 1e-8) bd.copy(dirW(0.3, 1, 0.2)); bd.normalize(); if (bd.dot(UP) < -0.2) bd.negate();
    const center = Tp.clone().addScaledVector(side, 0.2).addScaledVector(OPP.f, 0.1), h = center.addScaledVector(bd, -0.2); OPP.hand.lerp(h, 1 - Math.exp(-dt * 30)); OPP.dir.copy(slerpDir(OPP.dir, bd, 1 - Math.exp(-dt * 30))); AI.blockT -= dt;
    if (offI === 0) OPP.handL.lerp(handPos(mainSide()).lerp(OPP.shL, 0.3), 1 - Math.exp(-dt * 12));
    if (AI.blockT <= 0) { AI.st = "recover"; AI.t = 0; AI.dur = 0.22 / spd; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); if (modeI === 3 && Math.random() < 0.55) { AI.st = "guard"; AI.queue = [[1, 2, 12, 5, 3, 4][Math.floor(Math.random() * 6)]]; AI.wait = 0.05; } } }
  // defending: when your stick comes in fast, block (or not), after a human reaction time
  if (AI.noBlock > 0) AI.noBlock -= dt;
  if ((modeI === 2 || modeI === 3) && running && (AI.st === "guard" || AI.st === "recover") && AI.blockIn < 0 && !(AI.noBlock > 0)) { const v = V3().subVectors(WS.main.b, WS.main.pb).divideScalar(Math.max(dt, 1e-3)), to = V3().subVectors(OPP.chest, WS.main.b), dist = to.length();
    const pred = WS.main.b.clone().addScaledVector(v, 0.2), near = Math.min(pred.distanceTo(OPP.head), segDist(pred, pred, OPP.hips, OPP.chest), pred.distanceTo(OPP.aR));
    if (dist < 1.3 && WS.main.v > 2.2 && (v.dot(to.normalize()) > 1.5 || near < 0.4)) { if (Math.random() < BLOCKP[speedI]) { AI.blockIn = REACT[speedI]; AI.threatV = v.clone(); AI.threat = ["head", "chest", "aR"].reduce((m, k) => pred.distanceTo(OPP[k]) < pred.distanceTo(OPP[m]) ? k : m, "head"); } else AI.noBlock = 0.5; } }
  if (AI.blockIn >= 0) { AI.blockIn -= dt; if (AI.blockIn < 0) { if (AI.st === "guard" || AI.st === "recover") { AI.st = "block"; AI.blockT = 0.32; } AI.blockIn = -1; } }
  OPP.lunge += (lungeT - OPP.lunge) * (1 - Math.exp(-dt * 20)); OPP.flinch = Math.max(0, OPP.flinch - dt); }
function poseOpp() { const p = V3().copy(OPP.p).addScaledVector(OPP.f, OPP.lunge), fl = OPP.flinch > 0 ? Math.sin(OPP.flinch / 0.3 * Math.PI) * 0.07 : 0;
  OPP.hips.copy(p).addScaledVector(UP, 0.95); OPP.chest.copy(p).addScaledVector(UP, 1.32).addScaledVector(OPP.f, 0.03 - fl).addScaledVector(OPP.r, 0.02); OPP.head.copy(p).addScaledVector(UP, 1.6).addScaledVector(OPP.f, 0.02 - fl * 1.5);
  OPP.sh.copy(OPP.chest).addScaledVector(OPP.r, 0.19).addScaledVector(UP, 0.1); OPP.shL.copy(OPP.chest).addScaledVector(OPP.r, -0.19).addScaledVector(UP, 0.1); }
function drawOpp() { const hint = V3().addScaledVector(UP, -1).addScaledVector(OPP.r, 0.6), hintL = V3().addScaledVector(UP, -1).addScaledVector(OPP.r, -0.6);
  ik2(OPP.sh, OPP.hand, 0.3, 0.28, hint, OPP.elbow, OPP.aR); ik2(OPP.shL, OPP.handL, 0.3, 0.28, hintL, OPP.elbowL, OPP.aL);
  placeLimb(OB.torso, OPP.hips, OPP.chest); OB.pelvis.position.copy(OPP.hips); OB.chestB.position.copy(OPP.chest); placeLimb(OB.neck, OPP.chest, OPP.head);
  placeLimb(OB.uaR, OPP.sh, OPP.elbow); placeLimb(OB.faR, OPP.elbow, OPP.aR); placeLimb(OB.uaL, OPP.shL, OPP.elbowL); placeLimb(OB.faL, OPP.elbowL, OPP.aL);
  OB.shR.position.copy(OPP.sh); OB.shL.position.copy(OPP.shL); OB.elR.position.copy(OPP.elbow); OB.elL.position.copy(OPP.elbowL); OB.hR.position.copy(OPP.aR); OB.hL.position.copy(OPP.aL);
  const base = V3().copy(OPP.p).addScaledVector(OPP.f, OPP.lunge * 0.6), fR = L2W(base, 0.14, 0.05, 0.22 + OPP.lunge * 0.5), fL = L2W(base, -0.14, 0.05, -0.2), hipR = OPP.hips.clone().addScaledVector(OPP.r, 0.1), hipL = OPP.hips.clone().addScaledVector(OPP.r, -0.1), kR = V3(), kL = V3(), aR = V3(), aL = V3();
  ik2(hipR, fR, 0.46, 0.45, OPP.f, kR, aR); ik2(hipL, fL, 0.46, 0.45, OPP.f, kL, aL); placeLimb(OB.thR, hipR, kR); placeLimb(OB.shinR, kR, aR); placeLimb(OB.thL, hipL, kL); placeLimb(OB.shinL, kL, aL); OB.knR.position.copy(kR); OB.knL.position.copy(kL);
  OB.ftR.position.copy(aR).setY(FLOOR_Y + 0.03).addScaledVector(OPP.f, 0.06); OB.ftL.position.copy(aL).setY(FLOOR_Y + 0.03).addScaledVector(OPP.f, 0.06); OB.ftR.rotation.y = OB.ftL.rotation.y = Math.atan2(OPP.f.x, OPP.f.z);
  HEAD.position.copy(OPP.head); HEAD.lookAt(PB.head);
  weaponAt(OSTICK, OPP.aR, OPP.dir); ODAG.visible = offI === 1; OSTICK2.visible = offI === 2; weaponAt(ODAG, OPP.aL, OPP.dirL); weaponAt(OSTICK2, OPP.aL, OPP.dirL); }
// partner's volumes, for your hits
function oppVolumes() { return [{ a: OPP.head, b: null, r: 0.14, n: "head" }, { a: OPP.hips, b: OPP.chest, r: 0.18, n: "body" }, { a: OPP.sh, b: OPP.elbow, r: 0.055, n: "arm" }, { a: OPP.elbow, b: OPP.aR, r: 0.05, n: "weapon arm" }, { a: OPP.aR, b: null, r: 0.06, n: "weapon hand" },
  { a: OPP.shL, b: OPP.elbowL, r: 0.055, n: "arm" }, { a: OPP.elbowL, b: OPP.aL, r: 0.05, n: "arm" }, { a: OPP.aL, b: null, r: 0.06, n: "hand" }, { a: OB.thR.position, b: OB.knR.position, r: 0.08, n: "leg" }, { a: OB.thL.position, b: OB.knL.position, r: 0.08, n: "leg" }]; }
const oppSeg = (left) => { const h = left ? OPP.aL : OPP.aR, d = left ? OPP.dirL : OPP.dir; if (left && offI !== 2) return [h.clone().addScaledVector(d, 0.05), h.clone().addScaledVector(d, 0.24)]; return [h.clone().addScaledVector(d, -PUNYO), h.clone().addScaledVector(d, STICK - PUNYO)]; };

// ---------- contact: blocks, hits, clacks ----------
let clackCD = 0, flashT = 0, flashCol = 0;
const SRCH = () => ({ main: mainSide(), off: offSide() });
function buzz(side, s = 0.8, ms = 45) { const g = SRC[side]?.gamepad; if (!g) return; const h = g.hapticActuators?.[0]; if (h?.pulse) h.pulse(s, ms); else g.vibrationActuator?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: s, weakMagnitude: s * 0.6 }); }
const _p1 = V3(), _p2 = V3();
function contact(dt) { clackCD -= dt; const sides = SRCH();
  const segs = [["main", WS.main], ["off", WS.off]];
  // 1. stick on stick, at any time: the clack, and if the partner was striking, a block
  for (const left of [false, true]) { if (left && offI === 0) continue; const [oa, ob] = oppSeg(left); const striking = AI.st === "strike" && AI.plan && !AI.plan.done && AI.plan.left === left;
    for (const [key, S] of segs) { if (key === "off" && offI === 0) continue; const d = segDist(S.a, S.b, oa, ob, _p1, _p2), rad = (key === "off" && offI === 1 ? 0.012 : STICK_R) + STICK_R + 0.02;
      if (d < rad) { const rel = S.v + (striking ? 6 : 1); if (clackCD <= 0 && rel > 1.2) { clack(clampN(rel / 8, 0.3, 1)); buzz(sides[key], clampN(rel / 6, 0.3, 1), 50); clackCD = 0.12; }
        if (striking) { endAttack("blocked"); deflect(V3().subVectors(_p2, _p1).normalize()); showTag("Blocked", "#7ce07c"); }
        else if (AI.st === "block" || AI.st === "guard" || AI.st === "recover") S.blockedT = 0.3; } } }
  // 2. your live hand on the partner's weapon arm while it strikes: a pass or a check
  if (offI === 0 && AI.st === "strike" && AI.plan && !AI.plan.done && !AI.plan.left) { const hp = handPos(sides.off), d = segDist(hp, hp, OPP.elbow, OPP.aR); if (d < 0.1) { endAttack("checked"); showTag("Passed and checked", "#7ce07c"); buzz(sides.off, 0.4, 30); AI.st = "recover"; AI.t = 0; AI.dur = 0.35 / SPEEDS[speedI][0]; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); } }
  // 3. the partner's weapon reaching you
  if (AI.st === "strike" && AI.plan && !AI.plan.done) { const left = AI.plan.left, h = left ? OPP.aL : OPP.aR, dd = left ? OPP.dirL : OPP.dir, a = h.clone().addScaledVector(dd, left ? 0.08 : 0.12), b = h.clone().addScaledVector(dd, left ? 0.24 : STICK - PUNYO);
    for (const v of playerVolumes()) { const d = v.b ? segDist(a, b, v.a, v.b) : segDist(a, b, v.a, v.a); if (d < v.r + STICK_R) { endAttack("hit " + v.n); SC.them += modeI === 3 ? 1 : 0; SC.hitsOnYou++; thud(0.8); flashT = 0.35; flashCol = 1; buzz(sides.main, 1, 120); buzz(sides.off, 1, 120); showTag("Hit: your " + v.n, "#ff7a6a"); break; } } }
  // 4. your weapons reaching the partner
  for (const [key, S] of segs) { if (S.cd > 0) continue; const isDag = key === "off" && offI === 1, isHand = key === "off" && offI === 0, need = isDag ? 1.2 : isHand ? 2.6 : 2.2; if (S.v < need) continue; if (S.blockedT > 0) continue;
    const a = isHand ? S.b : S.a.clone().lerp(S.b, isDag ? 0.3 : 0.25);
    for (const v of oppVolumes()) { const d = v.b ? segDist(a, S.b, v.a, v.b) : segDist(a, S.b, v.a, v.a); if (d < v.r + STICK_R) { S.cd = 0.45; if (modeI === 3 || modeI === 2) SC.you++; thud(0.6); buzz(sides[key], 0.9, 70); OPP.flinch = 0.3;
        if (AI.st === "chamber") { AI.st = "recover"; AI.t = 0; AI.dur = 0.3; AI.fromH.copy(OPP.hand); AI.fromD.copy(OPP.dir); AI.fromHL.copy(OPP.handL); AI.fromDL.copy(OPP.dirL); if (AI.plan) endAttack("interrupted"); }
        showTag((isDag ? "Dagger: " : isHand ? "Strike: " : "Hit: ") + v.n + (v.n === "weapon hand" ? " (defanging the snake)" : ""), "#ffe08a"); break; } } } }

// ---------- signs: a tag over the partner, a scoreboard on the wall ----------
const tagC = document.createElement("canvas"); tagC.width = 1024; tagC.height = 160; const tagT = new THREE.CanvasTexture(tagC); tagT.colorSpace = THREE.SRGBColorSpace;
const TAG = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagT, depthTest: false, transparent: true, toneMapped: false })); TAG.scale.set(0.9, 0.14, 1); TAG.renderOrder = 50; scene.add(TAG); let tagAge = 9;
function showTag(text, col = "#f4e8d0") { const g = tagC.getContext("2d"); g.clearRect(0, 0, 1024, 160); g.fillStyle = "rgba(14,10,6,0.78)"; g.beginPath(); g.roundRect(8, 8, 1008, 144, 30); g.fill(); g.fillStyle = col; g.font = "bold 64px -apple-system, Helvetica, sans-serif"; g.textAlign = "center"; g.fillText(text, 512, 102, 980); tagT.needsUpdate = true; tagAge = 0; }
const boardC = document.createElement("canvas"); boardC.width = 1280; boardC.height = 720; const boardT = new THREE.CanvasTexture(boardC); boardT.colorSpace = THREE.SRGBColorSpace;
const BOARD = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: boardT, toneMapped: false })); BOARD.position.set(-2.1, 1.65, -0.6); BOARD.lookAt(0, 1.6, 2); scene.add(BOARD);
{ const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x333333 })); st.position.set(-2.1, 0.6, -0.6); scene.add(st); const bk = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.96, 0.03), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); bk.position.copy(BOARD.position); bk.quaternion.copy(BOARD.quaternion); bk.translateZ(-0.02); scene.add(bk); }
let boardKey = "";
function drawBoard() { const k = [modeI, speedI, offI, lefty, running, SC.you, SC.them, SC.blocks, SC.fed, Math.ceil(AI.roundT), gripTilt, seated].join(); if (k === boardKey) return; boardKey = k; const g = boardC.getContext("2d");
  g.fillStyle = "#14110e"; g.fillRect(0, 0, 1280, 720); g.strokeStyle = "#c8a050"; g.lineWidth = 6; g.strokeRect(6, 6, 1268, 708); g.fillStyle = "#f4e2b0"; g.font = "bold 60px Georgia, serif"; g.fillText(MODES[modeI] + (running ? "" : "  (paused)"), 40, 84);
  g.font = "38px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#e8dcc0";
  const lines = [`Speed: ${SPEEDS[speedI][1]}   ·   other hand: ${OFF[offI]}   ·   stick in ${lefty ? "left" : "right"} hand${seated ? "   ·   seated" : ""}`];
  if (modeI < 2) lines.push(`Blocked ${SC.blocks} of ${SC.fed} fed   ·   hits on you: ${SC.hitsOnYou}`, "Block with the stick, or pass the weapon arm with your live hand.", "Duck or step back: an attack that misses counts as evaded.");
  else if (modeI === 2) lines.push(`Your clean hits: ${SC.you}`, "Strike the partner; it blocks some, at this speed's reaction time.", "A blocked strike does not count. Hit the weapon hand to defang the snake.");
  else lines.push(`You ${SC.you}  ·  partner ${SC.them}${running ? `   ·   ${Math.max(0, Math.ceil(AI.roundT))} s left` : ""}`, "Two-minute round. Clean hits score; blocked ones do not.", "The partner attacks in combinations, blocks, and counters.");
  lines.push("", IS_HEADSET || renderer.xr.isPresenting ? "A start / pause · B speed · X mode · Y other hand · right stick ↕ stick angle" : "Space start / pause · = − speed · 1-4 mode · H other hand · mouse: stick", IS_HEADSET || renderer.xr.isPresenting ? "click left stick: seated · click right stick: swap hands · left stick: step" : "M seated · L swap hands · W A S D step · arrows turn");
  lines.forEach((l, i) => g.fillText(l, 40, 170 + i * 72, 1200)); boardT.needsUpdate = true; }

// ---------- input ----------
const keys = {}, prevB = {}; let yaw = 0, started = false;
function setMode(i) { modeI = (i + MODES.length) % MODES.length; running = false; resetCounts(); showTag(MODES[modeI]); }
function resetCounts() { SC.you = SC.them = SC.blocks = SC.fed = SC.hitsOnYou = 0; AI.next = 1; AI.lastWasAngle = false; AI.queue = []; AI.roundT = 120; }
function toggleRun() { running = !running; if (running) { if (modeI === 3) { if (AI.roundT <= 0) resetCounts(); bell(); } AI.wait = 1.2; showTag(modeI === 2 ? "Attack when ready" : "Ready", "#f4e2b0"); } else showTag("Paused"); }
function setSpeed(i) { speedI = clampN(i, 0, SPEEDS.length - 1); showTag("Speed: " + SPEEDS[speedI][1]); }
function setOff(i) { offI = (i + OFF.length) % OFF.length; equip(); showTag("Other hand: " + OFF[offI]); }
function swapHands() { lefty = !lefty; equip(); showTag("Stick in your " + (lefty ? "left" : "right") + " hand"); }
function toggleSeated() { seated = !seated; showTag(seated ? "Seated: view raised, no leg attacks" : "Standing"); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "Space") toggleRun(); if (e.code === "Equal") setSpeed(speedI + 1); if (e.code === "Minus") setSpeed(speedI - 1); if (/^Digit[1-4]$/.test(e.code)) setMode(+e.code.slice(5) - 1); if (e.code === "KeyH") setOff(offI + 1); if (e.code === "KeyL") swapHands(); if (e.code === "KeyM") toggleSeated(); if (e.code === "KeyV") { voiceOn = !voiceOn; showTag("Voice " + (voiceOn ? "on" : "off")); } });
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("pointermove", e => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = -((e.clientY / innerHeight) * 2 - 1); });
function start() { if (started) return; started = true; ac().resume?.(); document.getElementById("intro")?.classList.add("gone"); showTag("Press start when ready", "#f4e2b0"); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); boardKey = ""; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0; equip(); resetCounts(); poseOpp(); { const G = guardPose(); OPP.hand.copy(G.h); OPP.dir.copy(G.d); OPP.handL.copy(G.hl); OPP.dirL.copy(G.dl); }
const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0, depthTest: false, toneMapped: false })); flash.position.z = -0.1; flash.scale.setScalar(0.1); flash.renderOrder = 99; camera.add(flash);
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0;
  if (vr) { SRC.left = SRC.right = null; const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; SRC[src.handedness] = src; const a = gp.axes, ax = a.length >= 4 ? 2 : 0, b = gp.buttons;
      const edge = (k, on) => { const r = on && !prevB[k]; prevB[k] = on; return r; };
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.2 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.2 ? a[ax + 1] : 0; if (edge("x", b[4]?.pressed)) setMode(modeI + 1); if (edge("y", b[5]?.pressed)) setOff(offI + 1); if (edge("ls", b[3]?.pressed)) toggleSeated(); }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { ME.yaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3 && Math.abs(ty) < 0.3) prevB.turn = false;
        if (Math.abs(ty) > 0.7 && !prevB.tilt) { gripTilt = clampN(gripTilt - Math.sign(ty) * 5 * Math.PI / 180, -0.8, 0.8); equip(); showTag(`Stick angle ${Math.round(gripTilt * 180 / Math.PI)}°`); prevB.tilt = true; } else if (Math.abs(ty) < 0.3) prevB.tilt = false;
        if (edge("a", b[4]?.pressed)) toggleRun(); if (edge("b", b[5]?.pressed)) setSpeed(speedI === SPEEDS.length - 1 ? 0 : speedI + 1); if (edge("rs", b[3]?.pressed)) swapHands(); } }
    for (const sd of ["right", "left"]) if (GRIP[sd] && HANDS[sd].parent !== GRIP[sd]) GRIP[sd].add(HANDS[sd]); }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ArrowLeft) ME.yaw += dt * 1.5; if (keys.ArrowRight) ME.yaw -= dt * 1.5; placeDesktop(); for (const sd of ["right", "left"]) if (HANDS[sd].parent !== DESK[sd]) DESK[sd].add(HANDS[sd]); }
  // stepping with the stick (most of your footwork is your own, in your room)
  if (mx || my) { const f = V3(0, 0, -1).applyAxisAngle(UP, ME.yaw + (vr ? 0 : 0)), r = V3().crossVectors(f, UP); if (vr) { camera.getWorldDirection(f); f.y = 0; f.normalize(); r.crossVectors(f, UP); } ME.x = clampN(ME.x + (f.x * -my + r.x * mx) * 1.2 * dt, -5.4, 5.4); ME.z = clampN(ME.z + (f.z * -my + r.z * mx) * 1.2 * dt, -5.4, 5.4); }
  rig.position.set(ME.x, FLOOR_Y + (vr && seated ? 0.45 : 0), ME.z); rig.rotation.y = ME.yaw; if (!vr) camera.position.set(0, 1.65, 0);
  updateBody(); if (OPP.p.distanceTo(V3(PB.head.x, FLOOR_Y, PB.head.z)) < 0.55) OPP.p.addScaledVector(OPP.f, -0.02);
  updateSegs(dt);
  if (started) { aiUpdate(dt); poseOpp(); drawOpp(); contact(dt); } else { poseOpp(); drawOpp(); }
  if (running && modeI === 3) { AI.roundT -= dt; if (AI.roundT <= 0) { running = false; bell(); showTag(SC.you > SC.them ? `You win, ${SC.you} to ${SC.them}` : SC.you < SC.them ? `Partner wins, ${SC.them} to ${SC.you}` : `A draw, ${SC.you} all`, "#f4e2b0"); AI.roundT = 0; } }
  tagAge += dt; TAG.position.copy(OPP.head).addScaledVector(UP, 0.42); TAG.material.opacity = tagAge < 2.5 ? 1 : Math.max(0, 1 - (tagAge - 2.5) * 2);
  if (frameN % 6 === 0) drawBoard();
  flashT = Math.max(0, flashT - dt); flash.material.opacity = flashT > 0 ? flashT * 0.9 : 0;
  renderer.render(scene, camera); });

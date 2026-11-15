// eskabo.js -- stick sparring in VR, in the manner of Eskabo Daan and the Filipino arts it comes from. Built into eskabo.html by build.py.
//
// What it rests on. Eskabo Daan was founded in San Francisco by Grandmaster Robert Castro, who trained under Angel Cabales (Cabales
// Serrada Eskrima) and Ernesto Presas (Kombatan); the name stands for Eskrima, Serrada, Kali, Arnis, Boxing and jeet kune dO, and daan means
// "the way". Serrada is close-range fighting with a short stick; its backbone is Cabales' 12 angles of attack (1 left temple, 2 right
// temple, 3 left arm, 4 right arm, 5 thrust to the stomach, 6 left chest, 7 right chest, 8 right leg, 9 left leg, 10 left eye, 11 right
// eye, 12 the crown), with three blocks for each (pass blocks, cross blocks, then shoulder blocks and gating), the live hand checking
// the attacker's weapon hand, and drills where a dagger thrust follows each angle. Eskabo Daan's own numbering may differ; these are
// Serrada's. Your 18-inch rattan stick is in your right hand (a fist's width of butt, the punyo, below your hand); in your left, an
// empty live hand, a training dagger, or a second stick; or a knife, or empty hands. A computer partner feeds angles, defends, counters
// and spars; in combat, one to four attackers with sticks, knives or fists come at you at full intensity and spread round you.
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
function makeGlove(m = gloveM) { const g = new THREE.Group(), me = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), m); me.scale.set(1, 1.1, 1.35); me.castShadow = true; g.add(me); return g; }
function makeKnife() { const g = new THREE.Group(), h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.11, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })), gd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.02), bladeM), b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.18), bladeM);
  gd.position.z = -0.06; b.position.z = -0.15; [h, gd, b].forEach(m => { m.castShadow = true; g.add(m); }); return g; }
// what each kind of weapon reaches with (along the line of the fist), how fast it must move to count, how thick it is
const KIND = { stick: { near: -PUNYO, far: STICK - PUNYO, hit0: 0.25, need: 2.2, r: STICK_R }, knife: { near: 0.05, far: 0.24, hit0: 0.3, need: 1.2, r: 0.012 }, hand: { near: -0.03, far: 0.05, hit0: 1, need: 2.6, r: 0.05 } };
const YOUR = [{ n: "stick and live hand", m: "stick", o: "hand" }, { n: "stick and dagger", m: "stick", o: "knife" }, { n: "two sticks", m: "stick", o: "stick" }, { n: "knife and live hand", m: "knife", o: "hand" }, { n: "empty hands", m: "hand", o: "hand" }];
let yourI = 0, lefty = false, gripTilt = 0;
const HANDS = { right: new THREE.Group(), left: new THREE.Group() }, MOUNT = { right: new THREE.Group(), left: new THREE.Group() };
for (const s of ["right", "left"]) HANDS[s].add(MOUNT[s]);
const W = { right: { stick: makeStick(), glove: makeGlove(), knife: makeKnife() }, left: { stick: makeStick(), glove: makeGlove(), knife: makeKnife() } };
for (const s of ["right", "left"]) for (const k in W[s]) MOUNT[s].add(W[s][k]);
const mainSide = () => lefty ? "left" : "right", offSide = () => lefty ? "right" : "left", kindOf = which => which === "main" ? YOUR[yourI].m : YOUR[yourI].o;
function equip() { for (const s of ["right", "left"]) { const k = s === mainSide() ? YOUR[yourI].m : YOUR[yourI].o; W[s].stick.visible = k === "stick"; W[s].knife.visible = k === "knife"; MOUNT[s].rotation.x = gripTilt; } }
const SRC = { right: null, left: null }, GRIP = {};
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { const h = e.data.handedness; if (h !== "left" && h !== "right") return; GRIP[h] = grip; grip.add(HANDS[h]); }); grip.addEventListener("disconnected", () => { for (const h in GRIP) if (GRIP[h] === grip) delete GRIP[h]; }); }
// desktop: both hands hang off the camera; the main hand follows the mouse
const DESK = { right: new THREE.Group(), left: new THREE.Group() }; camera.add(DESK.right, DESK.left); DESK.right.add(HANDS.right); DESK.left.add(HANDS.left);
let mouseX = 0.3, mouseY = 0.1;
function placeDesktop() { const m = mainSide(), o = offSide(), sx = m === "right" ? 1 : -1; DESK[m].position.set(mouseX * 0.45, -0.3 + mouseY * 0.4, -0.5); DESK[m].rotation.set(0.9 + mouseY * 0.3, -mouseX * 0.6, -mouseX * 0.4 * sx);
  DESK[o].position.set(-0.18 * sx, -0.32, -0.38); DESK[o].rotation.set(0.3, 0, 0); }
// segments of what you hold, in world space, and how fast their tips move
const WS = { main: { a: V3(), b: V3(), pb: V3(), v: 0, cd: 0, blockedT: 0 }, off: { a: V3(), b: V3(), pb: V3(), v: 0, cd: 0, blockedT: 0 } };
function updateSegs(dt) { for (const which of ["main", "off"]) { const S = WS[which], K = KIND[kindOf(which)], M = MOUNT[which === "main" ? mainSide() : offSide()]; M.updateWorldMatrix(true, false); S.pb.copy(S.b);
    S.a.set(0, 0, -K.near).applyMatrix4(M.matrixWorld); S.b.set(0, 0, -K.far).applyMatrix4(M.matrixWorld); S.v = dt > 0 ? S.b.distanceTo(S.pb) / dt : 0; if (S.v > 40) S.v = 0; S.cd -= dt; S.blockedT -= dt; } }
const handPos = side => { const v = V3(); MOUNT[side].getWorldPosition(v); return v; };

// ---------- your body, for attackers to aim at: estimated from your head ----------
const ME = { x: 0, z: 2.0, yaw: 0, hp: 10 }, PB = { head: V3(), f: V3(), r: V3(), s: 1, hips: V3(), neck: V3(), floorH: V3() };
let seated = false;
function updateBody() { camera.getWorldPosition(PB.head); const q = camera.getWorldQuaternion(new THREE.Quaternion()); PB.f.copy(NZ).applyQuaternion(q); PB.f.y = 0; if (PB.f.lengthSq() < 1e-4) PB.f.set(0, 0, -1); PB.f.normalize(); PB.r.crossVectors(PB.f, UP);
  PB.s = clampN((PB.head.y - FLOOR_Y) / 1.62, 0.55, 1.25); PB.neck.copy(PB.head).addScaledVector(UP, -0.2 * PB.s).addScaledVector(PB.f, -0.06); PB.hips.copy(PB.head).addScaledVector(UP, -0.72 * PB.s).addScaledVector(PB.f, -0.06); PB.floorH.set(PB.head.x, FLOOR_Y, PB.head.z).addScaledVector(PB.f, -0.04); }
// targets on you, by angle; seen from the attacker, so "front" is toward it
function playerTarget(i, F) { const h = PB.head, s = PB.s, R = PB.r, L = R.clone().negate(), tw = F ? V3(F.p.x - h.x, 0, F.p.z - h.z).normalize() : PB.f, t = h.clone();
  switch (i) { case 1: t.addScaledVector(L, 0.08); break; case 2: t.addScaledVector(R, 0.08); break; case 3: t.addScaledVector(UP, -0.42 * s).addScaledVector(L, 0.24); break; case 4: t.addScaledVector(UP, -0.42 * s).addScaledVector(R, 0.24); break;
    case 5: case 13: t.addScaledVector(UP, -0.62 * s).addScaledVector(tw, 0.1); break; case 6: t.addScaledVector(UP, -0.36 * s).addScaledVector(L, 0.1).addScaledVector(tw, 0.1); break; case 7: t.addScaledVector(UP, -0.36 * s).addScaledVector(R, 0.1).addScaledVector(tw, 0.1); break;
    case 8: t.set(h.x, FLOOR_Y + 0.5 * s, h.z).addScaledVector(R, 0.12).addScaledVector(tw, 0.04); break; case 9: t.set(h.x, FLOOR_Y + 0.5 * s, h.z).addScaledVector(L, 0.12).addScaledVector(tw, 0.04); break;
    case 10: t.addScaledVector(L, 0.035).addScaledVector(tw, 0.07); break; case 11: t.addScaledVector(R, 0.035).addScaledVector(tw, 0.07); break; case 12: t.addScaledVector(UP, 0.1); break; case 14: t.addScaledVector(tw, 0.08).addScaledVector(UP, -0.04); break; case 15: t.addScaledVector(UP, -0.55 * s).addScaledVector(tw, 0.12); break; case 16: t.copy(handPos(mainSide())); break; }
  return t; }
// your volumes: head, torso, legs, and both hands (a struck hand is the commonest hit in stick fighting)
function playerVolumes() { const v = [{ a: PB.head.clone().addScaledVector(PB.f, -0.04), b: null, r: 0.11, n: "head" }, { a: PB.neck, b: PB.hips, r: 0.16, n: "body" }];
  if (!seated) for (const sd of [1, -1]) { const hip = PB.hips.clone().addScaledVector(PB.r, 0.1 * sd), foot = PB.floorH.clone().addScaledVector(PB.r, 0.13 * sd).setY(FLOOR_Y + 0.08); v.push({ a: hip, b: foot, r: 0.08, n: sd > 0 ? "right leg" : "left leg" }); }
  v.push({ a: handPos(mainSide()), b: null, r: 0.05, n: "hand" }, { a: handPos(offSide()), b: null, r: 0.05, n: "hand" }); return v; }

// ---------- the attacks ----------
// The 12 angles (Cabales Serrada), plus the dagger thrust: where the hand chambers (beside its shoulder: right, up, forward) and which
// way the weapon points there. Knife attacks follow the same angles, as in the Filipino arts; empty-hand attackers box.
const ANG = [null,
  { n: "left temple", k: "s", ch: [0.15, 0.28, -0.05], cd: [0.35, 0.8, -0.45] }, { n: "right temple", k: "s", ch: [-0.38, 0.22, 0.02], cd: [-0.55, 0.7, -0.4] },
  { n: "left arm", k: "s", ch: [0.22, 0.02, -0.1], cd: [0.7, 0.35, -0.6] }, { n: "right arm", k: "s", ch: [-0.42, -0.02, 0.05], cd: [-0.75, 0.35, -0.5] },
  { n: "thrust to the stomach", k: "t", ch: [0.02, -0.42, -0.12] }, { n: "thrust to the left chest", k: "t", ch: [0.08, -0.25, -0.12] }, { n: "thrust to the right chest", k: "t", ch: [-0.12, -0.25, -0.1] },
  { n: "right leg", k: "s", ch: [-0.38, -0.15, 0.02], cd: [-0.55, 0.6, -0.45] }, { n: "left leg", k: "s", ch: [0.2, 0.08, -0.05], cd: [0.5, 0.7, -0.45] },
  { n: "thrust to the left eye", k: "t", ch: [0.06, -0.12, -0.14] }, { n: "thrust to the right eye", k: "t", ch: [-0.1, -0.12, -0.12] },
  { n: "the crown of the head", k: "s", ch: [0.05, 0.38, -0.08], cd: [0.1, 0.6, -0.8] },
  { n: "dagger thrust", k: "t", left: true, ch: [0.05, -0.45, -0.05] }];
const PUNCH = { jab: { n: "jab", k: "p", left: true, tgt: 14, ch: [0.05, -0.02, 0.12] }, cross: { n: "cross", k: "p", tgt: 14, ch: [-0.05, -0.02, 0.05] }, hook: { n: "hook", k: "s", tgt: 1, hookP: true, ch: [0.25, -0.05, 0.1], cd: [0.4, 0.3, 0.2] }, body: { n: "body shot", k: "p", tgt: 15, ch: [0.0, -0.25, 0.05] }, lbody: { n: "body shot", k: "p", left: true, tgt: 15, ch: [0.0, -0.25, 0.08] } };
const NUMW = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "dagger"];
const SPEEDS = [[0.35, "very slow"], [0.55, "slow"], [0.75, "medium"], [1.0, "fast"], [1.2, "full speed"], [1.4, "master"]], BLOCKP = [0.3, 0.45, 0.6, 0.75, 0.85, 0.93], REACT = [0.3, 0.22, 0.15, 0.09, 0.05, 0.03];
// master: fastest, blocks nearly everything, counters every block, feints, attacks your stick hand and whatever you leave open
const MASTER = () => speedI === SPEEDS.length - 1;
const MODES = ["Angles 1 to 12", "Random angles", "Your strikes", "Sparring", "Combat"];
const ATTW = ["sticks", "knives", "empty hands", "mixed"];
let modeI = 0, speedI = 1, running = false, nAtt = 2, attW = 0;
const SC = { you: 0, them: 0, blocks: 0, fed: 0, hitsOnYou: 0, downs: 0 };

// ---------- the fighters: a sparring partner, or up to four attackers ----------
const shirtCols = [0x18181c, 0x6a1c1c, 0x1c3a6a, 0x2c4a2a], skinCols = [0xa87452, 0x7a5236, 0xc89a78, 0x5a3a26];
const pantsM = new THREE.MeshStandardMaterial({ color: 0x2a2c34, roughness: 0.9 }), padM = new THREE.MeshStandardMaterial({ color: 0x8a1818, roughness: 0.5 }), helmM = new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.45 }), hairM = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9 });
const grT = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#c8ccd0"; g.lineWidth = 7; for (let x = 8; x < w; x += 34) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 8; y < h; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
function makeFighter(idx) { const shirtM = new THREE.MeshStandardMaterial({ color: shirtCols[idx], roughness: 0.85 }), skinM = new THREE.MeshStandardMaterial({ color: skinCols[idx], roughness: 0.6 }), G = new THREE.Group(); scene.add(G);
  const limb = (r0, r1, m) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 14), m); me.castShadow = true; G.add(me); return me; }, ball = (r, m) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); me.castShadow = true; G.add(me); return me; };
  const OB = { torso: limb(0.15, 0.18, shirtM), pelvis: ball(0.155, pantsM), chestB: ball(0.175, shirtM), neck: limb(0.05, 0.05, skinM), uaR: limb(0.05, 0.055, shirtM), faR: limb(0.04, 0.045, skinM), uaL: limb(0.05, 0.055, shirtM), faL: limb(0.04, 0.045, skinM), shR: ball(0.058, shirtM), shL: ball(0.058, shirtM), elR: ball(0.048, skinM), elL: ball(0.048, skinM), hR: ball(0.055, padM), hL: ball(0.055, padM),
    thR: limb(0.06, 0.075, pantsM), shinR: limb(0.05, 0.06, pantsM), thL: limb(0.06, 0.075, pantsM), shinL: limb(0.05, 0.06, pantsM), knR: ball(0.06, pantsM), knL: ball(0.06, pantsM), ftR: ball(0.05, helmM), ftL: ball(0.05, helmM) };
  OB.ftR.scale.set(1, 0.6, 2.2); OB.ftL.scale.set(1, 0.6, 2.2);
  const HEAD = new THREE.Group(); G.add(HEAD); HEAD.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 14), skinM));
  const helm = new THREE.Group(); HEAD.add(helm); { const hm = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), helmM); hm.rotation.x = -0.45; hm.castShadow = true; helm.add(hm);
    helm.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.22, Math.PI * 0.5), new THREE.MeshStandardMaterial({ map: grT, alphaTest: 0.5, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }))); }
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM); hair.rotation.x = -0.35; HEAD.add(hair);
  const wR = { stick: makeStick(), knife: makeKnife() }, wL = { stick: makeStick(), knife: makeKnife() }; G.add(wR.stick, wR.knife, wL.stick, wL.knife);
  const F = { idx, G, OB, HEAD, helm, hair, wR, wL, p: V3(0, FLOOR_Y, 0.85), f: V3(0, 0, 1), r: V3(-1, 0, 0), lunge: 0, flinch: 0, hand: V3(), dir: V3(0, 1, 0), handL: V3(), dirL: V3(0, 1, 0), elbow: V3(), elbowL: V3(), sh: V3(), shL: V3(), head: V3(), chest: V3(), hips: V3(), aR: V3(), aL: V3(), kR: V3(), kL: V3(),
    st: "guard", t: 0, dur: 0, plan: null, wait: 1.5, queue: [], blockIn: -1, blockT: 0, noBlock: 0, threat: "head", threatV: null, fromH: V3(), fromD: V3(), fromHL: V3(), fromDL: V3(), weapon: "stick", off: "hand", hp: 6, down: 0, active: idx === 0, slot: 0, next: 1, lastWasAngle: false };
  return F; }
const FIGHTERS = [0, 1, 2, 3].map(makeFighter);
const L2W = (F, o, x, y, z) => V3().addScaledVector(F.r, x).addScaledVector(UP, y).addScaledVector(F.f, z).add(o);
const dirW = (F, x, y, z) => V3().addScaledVector(F.r, x).addScaledVector(UP, y).addScaledVector(F.f, z).normalize();
function placeLimb(me, a, b) { const d = V3().subVectors(b, a), L = d.length(); me.position.copy(a).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(YAX, d.divideScalar(L || 1)); me.scale.set(1, L, 1); }
function ik2(S, H, a, b, hint, outE, outH) { const d = V3().subVectors(H, S); let L = d.length(); const dir = d.divideScalar(L || 1); L = Math.min(L, a + b - 0.002); outH.copy(S).addScaledVector(dir, L); const x = (a * a - b * b + L * L) / (2 * L), y = Math.sqrt(Math.max(0, a * a - x * x)); const perp = hint.clone().addScaledVector(dir, -hint.dot(dir)); if (perp.lengthSq() < 1e-6) perp.set(0, -1, 0); perp.normalize(); outE.copy(S).addScaledVector(dir, x).addScaledVector(perp, y); }
function weaponAt(obj, hand, dir) { obj.position.copy(hand); obj.quaternion.setFromUnitVectors(NZ, dir); }
function slerpDir(a, b, t) { const q = new THREE.Quaternion().setFromUnitVectors(a, b); return a.clone().applyQuaternion(new THREE.Quaternion().slerp(q, t)).normalize(); }
const ease = t => t * t * (3 - 2 * t);
const wantDist = F => F.weapon === "stick" ? 1.0 : 0.72;
function guardPose(F) { const sh = F.sh, shL = F.shL; let h, d, hl, dl;
  if (F.weapon === "stick") { h = L2W(F, sh, -0.04, -0.2, 0.3); d = dirW(F, -0.12, 0.8, 0.45); } else if (F.weapon === "knife") { h = L2W(F, sh, -0.05, -0.25, 0.3); d = dirW(F, -0.1, 0.45, 0.9); } else { h = L2W(F, sh, -0.12, 0.02, 0.16); d = dirW(F, 0, 1, 0.3); }
  if (F.weapon === "hand") { hl = L2W(F, shL, 0.1, 0.04, 0.26); dl = dirW(F, 0, 1, 0.3); } else if (F.off === "hand") { hl = L2W(F, shL, 0.12, -0.18, 0.26); dl = dirW(F, 0, 1, 0); } else { hl = L2W(F, shL, 0.05, -0.28, 0.25); dl = dirW(F, 0.1, 0.55, 0.6); }
  return { h, d, hl, dl }; }
const kindOfF = (F, left) => left ? F.off : F.weapon;
function startAttack(F, A, label, quick = false) { F.plan = { A, i: A.tgt || A.idx, left: !!A.left, done: false, res: null }; F.st = "chamber"; F.t = 0; const fast = A.k === "p" ? 0.45 : 1; F.dur = (quick ? 0.2 : 0.34) * fast / SPEEDS[speedI][0];
  F.fromH.copy(F.hand); F.fromD.copy(F.dir); F.fromHL.copy(F.handL); F.fromDL.copy(F.dirL); if (label) { showTag(label); if (A.idx) speak(NUMW[A.idx]); } }
function planGeometry(F) { const P = F.plan, A = P.A, sh = P.left ? F.shL : F.sh, T = playerTarget(P.i, F), wk = kindOfF(F, P.left); P.T = T; P.Hch = L2W(F, sh, A.ch[0], A.ch[1], A.ch[2]);
  if (A.k === "s") { const sweet = wk === "stick" ? 0.3 : wk === "knife" ? 0.17 : 0.0; P.chD = dirW(F, A.cd[0], A.cd[1], A.cd[2]); P.Hc = T.clone().add(V3().subVectors(sh, T).normalize().multiplyScalar(sweet)); if (wk === "hand") P.Hc = T.clone(); P.cD = V3().subVectors(T, P.Hc); if (P.cD.lengthSq() < 1e-6) P.cD.copy(V3().subVectors(T, sh)); P.cD.normalize(); P.fD = P.cD.clone().multiplyScalar(2).sub(P.chD).normalize(); P.Hf = P.Hc.clone().add(V3().subVectors(P.Hc, P.Hch).normalize().multiplyScalar(wk === "hand" ? 0.08 : 0.25)); }
  else { const reach = wk === "stick" ? STICK - PUNYO - 0.03 : wk === "knife" ? 0.22 : 0.0; P.chD = V3().subVectors(T, P.Hch).normalize(); P.cD = P.chD.clone(); P.Hc = T.clone().addScaledVector(P.cD, -reach); P.fD = P.cD.clone(); P.Hf = P.Hc.clone(); } }
function endAttack(F, res) { const P = F.plan; if (!P || P.done) return; P.done = true; P.res = res; if (modeI < 2) { SC.fed++; if (res === "blocked" || res === "checked") SC.blocks++; } }
function toRecover(F, d) { F.st = "recover"; F.t = 0; F.dur = d; F.fromH.copy(F.hand); F.fromD.copy(F.dir); F.fromHL.copy(F.handL); F.fromDL.copy(F.dirL); }
function deflect(F, normal) { F.st = "deflect"; F.t = 0; F.dur = 0.3; F.fromH.copy(F.hand); F.fromD.copy(F.dir); F.fromHL.copy(F.handL); F.fromDL.copy(F.dirL); const left = F.plan && F.plan.left; F.defLeft = left;
  F.defH = (left ? F.handL : F.hand).clone().addScaledVector(normal, 0.14).addScaledVector(F.f, -0.08); F.defD = slerpDir(left ? F.dirL : F.dir, UP, 0.5); }
// what an attacker throws next
function chooseAttack(F) { const w = F.weapon;
  if (MASTER() && w !== "hand") { const hi = handPos(mainSide()).y > PB.head.y - 0.3, r = Math.random(); if (r < 0.35) return [{ n: "your stick hand", k: "s", tgt: 16, ch: ANG[1].ch, cd: ANG[1].cd }, { ...ANG[hi ? 5 : 1], idx: hi ? 5 : 1 }];
    const open = hi ? [5, 8, 9, 3, 4] : [1, 2, 12, 10, 11]; return [0, 1, 2].slice(0, 1 + Math.floor(Math.random() * 3)).map(() => { const i = open[Math.floor(Math.random() * open.length)]; return { ...ANG[i], idx: i }; }).filter(a => !(seated && (a.idx === 8 || a.idx === 9))); }
  if (w === "hand") { const c = [["jab", "cross"], ["jab", "jab", "cross"], ["cross", "hook"], ["jab", "body"], ["lbody", "hook"], ["jab", "cross", "hook"]][Math.floor(Math.random() * 6)]; return c.map(k => PUNCH[k]); }
  const combos = w === "knife" ? [[5], [1, 5], [2], [6], [7, 1], [10], [3, 4], [5, 5]] : [[1], [2], [1, 2], [1, 5], [12], [3, 4], [1, 2, 12], [8], [9, 2], [5], [10], [4, 1], [1, 9]];
  let c = combos[Math.floor(Math.random() * combos.length)].filter(i => !(seated && (i === 8 || i === 9))); if (!c.length) c = [1]; const out = c.map(i => ({ ...ANG[i], idx: i })); if (F.off === "knife" && Math.random() < 0.35) out.push({ ...ANG[13], idx: 13 }); return out; }
function aiUpdate(F, dt, others) { const spd = SPEEDS[speedI][0], G = guardPose(F);
  if (F.down > 0) return;
  // footwork: keep range, step in on the strike; sparring partners back off between exchanges; attackers spread round you
  const combat = modeI === 4, want = (modeI === 3 && F.st === "guard" && F.wait > 0.6 ? 1.3 : wantDist(F)), toMe = V3(PB.head.x - F.p.x, 0, PB.head.z - F.p.z), d = toMe.length();
  F.f.copy(toMe).normalize(); F.r.crossVectors(F.f, UP); const mv = (d > want ? clampN((d - want) * 3, 0, 1.4) : d < want - 0.22 ? clampN((d - want + 0.22) * 3, -1.1, 0) : 0) * dt; F.p.addScaledVector(F.f, mv);
  if (combat && others.length > 1) { const myA = Math.atan2(F.p.x - PB.head.x, F.p.z - PB.head.z), wantA = Math.atan2(PB.f.x, PB.f.z) + F.slot, da = Math.atan2(Math.sin(wantA - myA), Math.cos(wantA - myA)); F.p.addScaledVector(F.r, clampN(da, -1, 1) * 0.9 * dt * d);
    for (const o of others) if (o !== F && o.down <= 0) { const dx = F.p.x - o.p.x, dz = F.p.z - o.p.z, dd = Math.hypot(dx, dz); if (dd < 0.65 && dd > 1e-3) { F.p.x += dx / dd * (0.65 - dd) * 0.5; F.p.z += dz / dd * (0.65 - dd) * 0.5; } } }
  F.p.x = clampN(F.p.x, -5.3, 5.3); F.p.z = clampN(F.p.z, -5.3, 5.3);
  let lungeT = 0; F.t += dt; const lerpK = 1 - Math.exp(-dt * 10);
  if (F.st === "guard") { F.hand.lerp(G.h, lerpK); F.dir.copy(slerpDir(F.dir, G.d, lerpK)); F.handL.lerp(G.hl, lerpK); F.dirL.copy(slerpDir(F.dirL, G.dl, lerpK));
    if (running) { F.wait -= dt; if (F.wait <= 0) {
        if (modeI === 0) { let i = F.next; if (F.off === "knife" && F.lastWasAngle) { i = 13; F.lastWasAngle = false; } else { F.next = F.next % 12 + 1; if (seated && (i === 8 || i === 9)) { i = F.next; F.next = F.next % 12 + 1; } F.lastWasAngle = true; } startAttack(F, { ...ANG[i], idx: i }, i === 13 ? "Dagger thrust" : `Angle ${i}: ${ANG[i].n}`); F.wait = 1.7 / Math.sqrt(spd); }
        else if (modeI === 1) { let i; do { i = 1 + Math.floor(Math.random() * 12); } while (seated && (i === 8 || i === 9)); if (F.off === "knife" && Math.random() < 0.25) i = 13; startAttack(F, { ...ANG[i], idx: i }, i === 13 ? "Dagger thrust" : `Angle ${i}: ${ANG[i].n}`); F.wait = (0.9 + Math.random() * 0.9) / Math.sqrt(spd); }
        else if (modeI === 3 || combat) { const striking = others.filter(o => o !== F && (o.st === "chamber" || o.st === "strike")).length; if (combat && striking >= 2) F.wait = 0.15; else { if (!F.queue.length) F.queue = chooseAttack(F); startAttack(F, F.queue.shift()); F.wait = F.queue.length ? 0.04 : combat ? (0.35 + Math.random() * 0.9) / spd : (0.8 + Math.random() * 1.6) / spd; } } } } }
  else if (F.st === "chamber") { const P = F.plan; planGeometry(F); const u = ease(Math.min(1, F.t / F.dur));
    if (P.left) { F.handL.lerpVectors(F.fromHL, P.Hch, u); F.dirL.copy(slerpDir(F.fromDL, P.chD, u)); } else { F.hand.lerpVectors(F.fromH, P.Hch, u); F.dir.copy(slerpDir(F.fromD, P.chD, u)); }
    if (F.t >= F.dur && MASTER() && !P.feint && P.A.k !== "p" && modeI >= 3 && Math.random() < 0.25) { P.feint = true; const opp = { 1: 8, 2: 9, 3: 12, 4: 12, 5: 1, 6: 2, 7: 1, 8: 2, 9: 1, 10: 5, 11: 5, 12: 5 }[P.A.idx] || 5; P.A = { ...ANG[opp], idx: opp }; P.i = opp; F.t = 0; F.dur = 0.12 / spd; F.fromH.copy(F.hand); F.fromD.copy(F.dir); F.fromHL.copy(F.handL); F.fromDL.copy(F.dirL); }
    else if (F.t >= F.dur) { F.st = "strike"; F.t = 0; F.dur = (P.A.k === "p" ? 0.14 : 0.2) / spd; } }
  else if (F.st === "strike") { const P = F.plan, u = Math.min(1, F.t / F.dur), c = 0.55; let h, dd; lungeT = Math.sin(Math.PI * Math.min(1, u * 1.3)) * (F.weapon === "stick" ? 0.22 : 0.15);
    if (u < c) { const w = ease(u / c); h = V3().lerpVectors(P.Hch, P.Hc, w); dd = slerpDir(P.chD, P.cD, w); } else { const w = (u - c) / (1 - c); h = V3().lerpVectors(P.Hc, P.Hf, w); dd = slerpDir(P.cD, P.fD, w); }
    if (P.left) { F.handL.copy(h); F.dirL.copy(dd); } else { F.hand.copy(h); F.dir.copy(dd); }
    if (F.t >= F.dur) { if (!P.done) endAttack(F, "evaded"); toRecover(F, (P.A.k === "p" ? 0.18 : 0.32) / spd); } }
  else if (F.st === "deflect") { const u = ease(Math.min(1, F.t / F.dur)); if (F.defLeft) { F.handL.lerpVectors(F.fromHL, F.defH, u); F.dirL.copy(slerpDir(F.fromDL, F.defD, u)); F.hand.lerp(G.h, lerpK); } else { F.hand.lerpVectors(F.fromH, F.defH, u); F.dir.copy(slerpDir(F.fromD, F.defD, u)); F.handL.lerp(G.hl, lerpK * 0.8); } if (F.t >= F.dur) toRecover(F, 0.28 / spd); }
  else if (F.st === "recover") { const u = ease(Math.min(1, F.t / F.dur)); F.hand.lerpVectors(F.fromH, G.h, u); F.dir.copy(slerpDir(F.fromD, G.d, u)); F.handL.lerpVectors(F.fromHL, G.hl, u); F.dirL.copy(slerpDir(F.fromDL, G.dl, u)); if (F.t >= F.dur) { F.st = "guard"; F.t = 0; } }
  else if (F.st === "block") { const Tp = F[F.threat || "head"], mid = V3().lerpVectors(WS.main.a, WS.main.b, 0.7), side = V3().subVectors(mid, Tp); side.addScaledVector(F.f, -0.5 * side.dot(F.f)); if (side.lengthSq() < 1e-6) side.copy(F.f); side.normalize();
    let bd = V3().crossVectors(F.threatV || UP, F.f); if (bd.lengthSq() < 1e-8) bd.copy(dirW(F, 0.3, 1, 0.2)); bd.normalize(); if (bd.dot(UP) < -0.2) bd.negate();
    const center = Tp.clone().addScaledVector(side, 0.2).addScaledVector(F.f, 0.1), h = F.weapon === "stick" ? center.clone().addScaledVector(bd, -0.2) : center.clone().addScaledVector(F.f, -0.02); const k = 1 - Math.exp(-dt * 30); F.hand.lerp(h, k); F.dir.copy(slerpDir(F.dir, bd, k)); F.blockT -= dt;
    if (F.off === "hand" || F.weapon === "hand") F.handL.lerp(F.weapon === "hand" ? L2W(F, F.shL, 0.12, 0.12, 0.18) : handPos(mainSide()).lerp(F.shL, 0.3), 1 - Math.exp(-dt * 12));
    if (F.blockT <= 0) { toRecover(F, 0.22 / spd); if ((modeI === 3 && Math.random() < (MASTER() ? 0.95 : 0.55)) || (combat && Math.random() < (MASTER() ? 0.95 : 0.7))) { F.st = "guard"; F.queue = chooseAttack(F).slice(0, 1); F.wait = MASTER() ? 0.0 : 0.05; } } }
  // defending: when your weapon comes in fast, block (or not), after a human reaction time
  if (F.noBlock > 0) F.noBlock -= dt;
  if ((modeI >= 2) && running && (F.st === "guard" || F.st === "recover") && F.blockIn < 0 && !(F.noBlock > 0)) { for (const which of ["main", "off"]) { const S = WS[which]; if (S.v < KIND[kindOf(which)].need) continue; const v = V3().subVectors(S.b, S.pb).divideScalar(Math.max(dt, 1e-3)), to = V3().subVectors(F.chest, S.b), dist = to.length();
      const pred = S.b.clone().addScaledVector(v, 0.2), near = Math.min(pred.distanceTo(F.head), segDist(pred, pred, F.hips, F.chest), pred.distanceTo(F.aR));
      if (dist < 1.3 && (v.dot(to.normalize()) > 1.5 || near < 0.4)) { const p = BLOCKP[speedI] * (combat ? 0.7 : 1); if (Math.random() < p) { F.blockIn = REACT[speedI]; F.threatV = v.clone(); F.threat = ["head", "chest", "aR"].reduce((m, k) => pred.distanceTo(F[k]) < pred.distanceTo(F[m]) ? k : m, "head"); } else F.noBlock = 0.5; break; } } }
  if (F.blockIn >= 0) { F.blockIn -= dt; if (F.blockIn < 0) { if (F.st === "guard" || F.st === "recover") { F.st = "block"; F.blockT = 0.32; } F.blockIn = -1; } }
  F.lunge += (lungeT - F.lunge) * (1 - Math.exp(-dt * 20)); F.flinch = Math.max(0, F.flinch - dt); }
function poseF(F) { const p = V3().copy(F.p).addScaledVector(F.f, F.lunge), fl = F.flinch > 0 ? Math.sin(F.flinch / 0.3 * Math.PI) * 0.07 : 0;
  if (F.down > 0) { const u = Math.min(1, F.down / 0.8); F.hips.copy(p).addScaledVector(UP, lerpN(0.95, 0.14, u)).addScaledVector(F.f, -0.3 * u); F.chest.copy(F.hips).addScaledVector(UP, lerpN(0.37, 0.0, u)).addScaledVector(F.f, -0.37 * u).setY(lerpN(F.hips.y + 0.37, 0.16, u)); F.head.copy(F.chest).addScaledVector(F.f, -0.28 * u).setY(lerpN(F.chest.y + 0.28, 0.13, u)); }
  else { F.hips.copy(p).addScaledVector(UP, 0.95); F.chest.copy(p).addScaledVector(UP, 1.32).addScaledVector(F.f, 0.03 - fl).addScaledVector(F.r, 0.02); F.head.copy(p).addScaledVector(UP, 1.6).addScaledVector(F.f, 0.02 - fl * 1.5); }
  F.sh.copy(F.chest).addScaledVector(F.r, 0.19).addScaledVector(UP, 0.1); F.shL.copy(F.chest).addScaledVector(F.r, -0.19).addScaledVector(UP, 0.1);
  if (F.down > 0) { F.hand.copy(F.sh).addScaledVector(F.r, 0.3).setY(0.08); F.handL.copy(F.shL).addScaledVector(F.r, -0.3).setY(0.08); } }
const lerpN = THREE.MathUtils.lerp;
function drawF(F) { const O = F.OB, hint = V3().addScaledVector(UP, -1).addScaledVector(F.r, 0.6), hintL = V3().addScaledVector(UP, -1).addScaledVector(F.r, -0.6);
  ik2(F.sh, F.hand, 0.3, 0.28, hint, F.elbow, F.aR); ik2(F.shL, F.handL, 0.3, 0.28, hintL, F.elbowL, F.aL);
  placeLimb(O.torso, F.hips, F.chest); O.pelvis.position.copy(F.hips); O.chestB.position.copy(F.chest); placeLimb(O.neck, F.chest, F.head);
  placeLimb(O.uaR, F.sh, F.elbow); placeLimb(O.faR, F.elbow, F.aR); placeLimb(O.uaL, F.shL, F.elbowL); placeLimb(O.faL, F.elbowL, F.aL);
  O.shR.position.copy(F.sh); O.shL.position.copy(F.shL); O.elR.position.copy(F.elbow); O.elL.position.copy(F.elbowL); O.hR.position.copy(F.aR); O.hL.position.copy(F.aL);
  const base = V3().copy(F.p).addScaledVector(F.f, F.lunge * 0.6), fR = F.down > 0 ? L2W(F, base, 0.14, 0.08, 0.5) : L2W(F, base, 0.14, 0.05, 0.22 + F.lunge * 0.5), fL = F.down > 0 ? L2W(F, base, -0.14, 0.08, 0.45) : L2W(F, base, -0.14, 0.05, -0.2), hipR = F.hips.clone().addScaledVector(F.r, 0.1), hipL = F.hips.clone().addScaledVector(F.r, -0.1), aR = V3(), aL = V3();
  ik2(hipR, fR, 0.46, 0.45, F.down > 0 ? UP : F.f, F.kR, aR); ik2(hipL, fL, 0.46, 0.45, F.down > 0 ? UP : F.f, F.kL, aL); placeLimb(O.thR, hipR, F.kR); placeLimb(O.shinR, F.kR, aR); placeLimb(O.thL, hipL, F.kL); placeLimb(O.shinL, F.kL, aL); O.knR.position.copy(F.kR); O.knL.position.copy(F.kL);
  O.ftR.position.copy(aR).setY(Math.max(FLOOR_Y + 0.03, aR.y)).addScaledVector(F.f, 0.06); O.ftL.position.copy(aL).setY(Math.max(FLOOR_Y + 0.03, aL.y)).addScaledVector(F.f, 0.06); O.ftR.rotation.y = O.ftL.rotation.y = Math.atan2(F.f.x, F.f.z);
  F.HEAD.position.copy(F.head); if (F.down > 0) F.HEAD.lookAt(F.head.clone().add(UP)); else F.HEAD.lookAt(PB.head); F.helm.visible = modeI !== 4; F.hair.visible = modeI === 4;
  F.wR.stick.visible = F.weapon === "stick"; F.wR.knife.visible = F.weapon === "knife"; F.wL.stick.visible = F.off === "stick"; F.wL.knife.visible = F.off === "knife";
  weaponAt(F.wR.stick, F.aR, F.dir); weaponAt(F.wR.knife, F.aR, F.dir); weaponAt(F.wL.stick, F.aL, F.dirL); weaponAt(F.wL.knife, F.aL, F.dirL); }
// a fighter's volumes, for your hits, and its weapons as segments
function fVolumes(F) { return [{ a: F.head, b: null, r: 0.14, n: "head" }, { a: F.hips, b: F.chest, r: 0.18, n: "body" }, { a: F.sh, b: F.elbow, r: 0.055, n: "arm" }, { a: F.elbow, b: F.aR, r: 0.05, n: "weapon arm" }, { a: F.aR, b: null, r: 0.06, n: "weapon hand" },
  { a: F.shL, b: F.elbowL, r: 0.055, n: "arm" }, { a: F.elbowL, b: F.aL, r: 0.05, n: "arm" }, { a: F.aL, b: null, r: 0.06, n: "hand" }, { a: F.OB.thR.position, b: F.kR, r: 0.08, n: "leg" }, { a: F.OB.thL.position, b: F.kL, r: 0.08, n: "leg" }]; }
function fSeg(F, left) { const h = left ? F.aL : F.aR, d = left ? F.dirL : F.dir, k = KIND[kindOfF(F, left)]; if (kindOfF(F, left) === "hand") return [h.clone(), h.clone(), 0.055]; return [h.clone().addScaledVector(d, k.near), h.clone().addScaledVector(d, k.far), k.r]; }

// ---------- contact: blocks, hits, clacks ----------
let clackCD = 0, flashT = 0;
function buzz(side, s = 0.8, ms = 45) { const g = SRC[side]?.gamepad; if (!g) return; const h = g.hapticActuators?.[0]; if (h?.pulse) h.pulse(s, ms); else g.vibrationActuator?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: s, weakMagnitude: s * 0.6 }); }
const DMG_ON_YOU = (F, part) => { const k = kindOfF(F, F.plan.left); if (k === "hand") return part === "head" ? 2 : 1; if (k === "knife") return part === "body" || part === "head" ? 4 : 2; return part === "head" ? 3 : part === "body" ? 2 : 1; };
const DMG_BY_YOU = (kind, part) => kind === "hand" ? (part === "head" ? 2 : 1) : kind === "knife" ? (part === "body" || part === "head" ? 3 : 1) : part === "head" ? 3 : part === "body" ? 2 : 1;
const _p1 = V3(), _p2 = V3();
function contact(dt) { clackCD -= dt; const sides = { main: mainSide(), off: offSide() }, combat = modeI === 4;
  for (const F of FIGHTERS) { if (!F.active || F.down > 0) continue;
    // 1. weapon on weapon, at any time: the clack, and if it was striking, a block
    for (const left of [false, true]) { const [oa, ob, orad] = fSeg(F, left), striking = F.st === "strike" && F.plan && !F.plan.done && F.plan.left === left, fk = kindOfF(F, left);
      if (fk === "hand" && !striking) continue;
      for (const which of ["main", "off"]) { const S = WS[which], k = kindOf(which), K = KIND[k]; const d = segDist(S.a, S.b, oa, ob, _p1, _p2);
        if (d < K.r + orad + 0.02) { if (k === "hand" && striking && fk !== "hand" && segDist.t > 0.3) { endAttack(F, "hit hand"); hurtYou(F, "hand", 1); showTag("Hit on your hand", "#ffb070"); continue; }
          const rel = S.v + (striking ? 6 : 1); if (clackCD <= 0 && rel > 1.2 && k !== "hand" && fk !== "hand") { clack(clampN(rel / 8, 0.3, 1)); buzz(sides[which], clampN(rel / 6, 0.3, 1), 50); clackCD = 0.12; }
          if (striking) { endAttack(F, "blocked"); deflect(F, V3().subVectors(_p2, _p1).normalize()); showTag(fk === "hand" ? "Parried" : "Blocked", "#7ce07c"); if (fk === "hand") buzz(sides[which], 0.3, 25); }
          else if (F.st === "block" || F.st === "guard" || F.st === "recover") S.blockedT = 0.3; } } }
    // 2. your live hand on its weapon arm while it strikes: a pass or a check
    if (F.st === "strike" && F.plan && !F.plan.done) { const left = F.plan.left, el = left ? F.elbowL : F.elbow, wr = left ? F.aL : F.aR;
      for (const which of ["main", "off"]) { if (kindOf(which) !== "hand") continue; const hp = handPos(sides[which]); if (segDist(hp, hp, el, wr) < 0.1) { endAttack(F, "checked"); showTag("Passed and checked", "#7ce07c"); buzz(sides[which], 0.4, 30); toRecover(F, 0.35 / SPEEDS[speedI][0]); break; } } }
    // 3. its weapon reaching you
    if (F.st === "strike" && F.plan && !F.plan.done) { const [a0, b0, orad] = fSeg(F, F.plan.left), a = kindOfF(F, F.plan.left) === "stick" ? a0.clone().lerp(b0, 0.35) : a0;
      for (const v of playerVolumes()) { const d = v.b ? segDist(a, b0, v.a, v.b) : segDist(a, b0, v.a, v.a); if (d < v.r + orad) { endAttack(F, "hit " + v.n); hurtYou(F, v.n, DMG_ON_YOU(F, v.n)); showTag("Hit: your " + v.n, "#ff7a6a"); break; } } } }
  // 4. your weapons reaching them
  for (const which of ["main", "off"]) { const S = WS[which], k = kindOf(which), K = KIND[k]; if (S.cd > 0 || S.v < K.need || S.blockedT > 0) continue; const a = k === "hand" ? S.b : S.a.clone().lerp(S.b, K.hit0);
    let done = false; for (const F of FIGHTERS) { if (!F.active || F.down > 0 || done) continue;
      for (const v of fVolumes(F)) { const d = v.b ? segDist(a, S.b, v.a, v.b) : segDist(a, S.b, v.a, v.a); if (d < v.r + K.r) { S.cd = 0.45; done = true; thud(0.6); buzz(sides[which], 0.9, 70); F.flinch = 0.3;
          if (modeI === 2 || modeI === 3) SC.you++; if (F.st === "chamber") { toRecover(F, 0.3); if (F.plan) endAttack(F, "interrupted"); }
          let msg = (k === "knife" ? "Cut: " : k === "hand" ? "Strike: " : "Hit: ") + v.n + (v.n === "weapon hand" && k !== "hand" ? " (defanging the snake)" : "");
          if (combat) { F.hp -= DMG_BY_YOU(k, v.n); if (v.n === "weapon hand" && F.weapon !== "hand" && Math.random() < 0.4) { F.weapon = "hand"; msg += ", disarmed"; } if (F.hp <= 0) { F.down = 0.001; F.st = "down"; SC.downs++; msg = "Down"; thud(1); } }
          showTag(msg, "#ffe08a"); break; } } } } }
function hurtYou(F, part, dmg) { SC.them += modeI === 3 ? 1 : 0; SC.hitsOnYou++; thud(0.8); flashT = 0.35; buzz("right", 1, 120); buzz("left", 1, 120); if (modeI === 4) { ME.hp -= dmg; if (ME.hp <= 0) { running = false; showTag("You are down", "#ff5040"); bell(); showMenu(true); } } }

// ---------- signs: a tag over the fighters, a scoreboard on a stand ----------
const tagC = document.createElement("canvas"); tagC.width = 1024; tagC.height = 160; const tagT = new THREE.CanvasTexture(tagC); tagT.colorSpace = THREE.SRGBColorSpace;
const TAG = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagT, depthTest: false, transparent: true, toneMapped: false })); TAG.scale.set(0.9, 0.14, 1); TAG.renderOrder = 50; scene.add(TAG); let tagAge = 9;
function showTag(text, col = "#f4e8d0") { const g = tagC.getContext("2d"); g.clearRect(0, 0, 1024, 160); g.fillStyle = "rgba(14,10,6,0.78)"; g.beginPath(); g.roundRect(8, 8, 1008, 144, 30); g.fill(); g.fillStyle = col; g.font = "bold 64px -apple-system, Helvetica, sans-serif"; g.textAlign = "center"; g.fillText(text, 512, 102, 980); tagT.needsUpdate = true; tagAge = 0; }
const boardC = document.createElement("canvas"); boardC.width = 1280; boardC.height = 720; const boardT = new THREE.CanvasTexture(boardC); boardT.colorSpace = THREE.SRGBColorSpace;
const BOARD = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: boardT, toneMapped: false })); BOARD.position.set(-2.1, 1.65, -0.6); BOARD.lookAt(0, 1.6, 2); scene.add(BOARD);
{ const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x333333 })); st.position.set(-2.1, 0.6, -0.6); scene.add(st); const bk = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.96, 0.03), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); bk.position.copy(BOARD.position); bk.quaternion.copy(BOARD.quaternion); bk.translateZ(-0.02); scene.add(bk); }
let boardKey = "";
function drawBoard() { const k = [modeI, speedI, yourI, lefty, running, SC.you, SC.them, SC.blocks, SC.fed, SC.downs, ME.hp, nAtt, attW, Math.ceil(roundT), seated].join(); if (k === boardKey) return; boardKey = k; const g = boardC.getContext("2d");
  g.fillStyle = "#14110e"; g.fillRect(0, 0, 1280, 720); g.strokeStyle = "#c8a050"; g.lineWidth = 6; g.strokeRect(6, 6, 1268, 708); g.fillStyle = "#f4e2b0"; g.font = "bold 60px Georgia, serif"; g.fillText(MODES[modeI] + (running ? "" : "  (paused)"), 40, 84);
  g.font = "38px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#e8dcc0";
  const lines = [`Speed: ${SPEEDS[speedI][1]}   ·   you: ${YOUR[yourI].n}${lefty ? " (left-handed)" : ""}${seated ? "   ·   seated" : ""}`];
  if (modeI < 2) lines.push(`Blocked ${SC.blocks} of ${SC.fed} fed   ·   hits on you: ${SC.hitsOnYou}`, "Block with the stick, or pass the weapon arm with your live hand.", "Duck or step back: an attack that misses counts as evaded.");
  else if (modeI === 2) lines.push(`Your clean hits: ${SC.you}`, "Strike the partner; it blocks some, at this speed's reaction time.", "A blocked strike does not count. Hit the weapon hand to defang the snake.");
  else if (modeI === 3) lines.push(`You ${SC.you}  ·  partner ${SC.them}${running ? `   ·   ${Math.max(0, Math.ceil(roundT))} s left` : ""}`, "Two-minute round. Clean hits score; blocked ones do not.", "The partner attacks in combinations, blocks, and counters.");
  else lines.push(`Your health: ${"█".repeat(clampN(ME.hp, 0, 10))}${"░".repeat(10 - clampN(ME.hp, 0, 10))}   ·   down: ${SC.downs} of ${nAtt}`, `${nAtt} attacker${nAtt > 1 ? "s" : ""} with ${ATTW[attW]}, full intensity: they spread round you.`, "Keep moving; put one between you and the others. A knife cuts deep.");
  lines.push("", "A (or space): pause and the menu   ·   point your stick and pull the trigger to choose");
  lines.forEach((l, i) => g.fillText(l, 40, 170 + i * 72, 1200)); boardT.needsUpdate = true; }

// ---------- the menu: point your stick (or the mouse) at a line and pull the trigger (or click) ----------
const menuC = document.createElement("canvas"); menuC.width = 1024; menuC.height = 900; const menuT = new THREE.CanvasTexture(menuC); menuT.colorSpace = THREE.SRGBColorSpace;
const MENU = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.79), new THREE.MeshBasicMaterial({ map: menuT, toneMapped: false, transparent: true })); MENU.renderOrder = 60; scene.add(MENU);
const laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd080 })); laser.visible = false; scene.add(laser);
let voiceOn2 = true, menuHover = -1, menuKey = "";
const ROWS = () => [
  { n: "Mode", v: MODES[modeI], f: () => setMode(modeI + 1) },
  { n: "Your weapons", v: YOUR[yourI].n, f: () => { yourI = (yourI + 1) % YOUR.length; equip(); arm(); } },
  ...(modeI === 4 ? [{ n: "Attackers", v: String(nAtt), f: () => { nAtt = nAtt % 4 + 1; arm(); } }, { n: "Attackers armed with", v: ATTW[attW], f: () => { attW = (attW + 1) % ATTW.length; arm(); } }] : []),
  { n: "Speed", v: SPEEDS[speedI][1], f: () => speedI = (speedI + 1) % SPEEDS.length },
  { n: "Stick hand", v: lefty ? "left" : "right", f: () => { lefty = !lefty; equip(); } },
  { n: "Seated", v: seated ? "yes: no leg attacks" : "no", f: () => seated = !seated },
  { n: "Voice", v: voiceOn ? "on" : "off", f: () => voiceOn = !voiceOn },
  { n: started && roundStarted ? "Resume" : "Start", v: "", f: () => { showMenu(false); go(); } }];
function drawMenu() { const rows = ROWS(), k = rows.map(r => r.v).join() + menuHover + roundStarted; if (k === menuKey) return; menuKey = k; const g = menuC.getContext("2d"); g.clearRect(0, 0, 1024, 900); g.fillStyle = "rgba(16,12,8,0.92)"; g.beginPath(); g.roundRect(0, 0, 1024, 900, 30); g.fill(); g.strokeStyle = "#c8a050"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#f4e2b0"; g.font = "bold 54px Georgia, serif"; g.fillText("Stick sparring", 40, 74); g.font = "30px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#c8b890"; g.fillText("Point and pull the trigger (or click) to change", 40, 120);
  rows.forEach((r, i) => { const y = 150 + i * 82; if (i === menuHover) { g.fillStyle = "rgba(200,160,80,0.3)"; g.fillRect(24, y, 976, 74); } g.fillStyle = r.v ? "#e8dcc0" : "#ffe08a"; g.font = (r.v ? "" : "bold ") + "40px -apple-system, Helvetica, sans-serif"; g.fillText(r.n, 44, y + 50); if (r.v) { g.fillStyle = "#ffe08a"; g.textAlign = "right"; g.fillText(r.v, 980, y + 50); g.textAlign = "left"; } });
  menuT.needsUpdate = true; }
let menuOn = true;
function showMenu(on) { menuOn = on; MENU.visible = on; if (on) { const f = V3(PB.f.x, 0, PB.f.z).normalize(); MENU.position.copy(PB.head).addScaledVector(f, 0.85).addScaledVector(UP, -0.18); MENU.lookAt(PB.head); menuKey = ""; } laser.visible = false; }
const ray = new THREE.Raycaster();
function menuPick(origin, dir) { ray.set(origin, dir); const hit = ray.intersectObject(MENU)[0]; if (!hit) return -1; const y = (1 - hit.uv.y) * 900, i = Math.floor((y - 150) / 82), n = ROWS().length; return i >= 0 && i < n ? i : -1; }
function menuSelect() { if (menuHover >= 0) { ROWS()[menuHover].f(); menuKey = ""; clack(0.4); } }

// ---------- modes and rounds ----------
let started = false, roundStarted = false, roundT = 120;
function arm() { const n = modeI === 4 ? nAtt : 1; FIGHTERS.forEach((F, i) => { F.active = i < n; F.G.visible = F.active; F.down = 0; F.hp = 6; F.st = "guard"; F.plan = null; F.queue = []; F.next = 1; F.lastWasAngle = false; F.blockIn = -1;
    if (modeI === 4) { F.weapon = attW === 3 ? ["stick", "knife", "hand", "stick"][i] : ["stick", "knife", "hand"][attW]; F.off = "hand"; } else { F.weapon = "stick"; F.off = YOUR[yourI].o === "stick" ? "stick" : YOUR[yourI].o === "knife" ? "knife" : "hand"; }
    F.slot = n === 1 ? 0 : [0, 1.3, -1.3, Math.PI][i]; const dS = PB.f.clone().applyAxisAngle(UP, F.slot), dist = modeI === 4 ? 2.2 : 1.15; F.p.set(PB.head.x + dS.x * dist, FLOOR_Y, PB.head.z + dS.z * dist); F.f.set(PB.head.x - F.p.x, 0, PB.head.z - F.p.z).normalize(); F.r.crossVectors(F.f, UP); poseF(F); const G = guardPose(F); F.hand.copy(G.h); F.dir.copy(G.d); F.handL.copy(G.hl); F.dirL.copy(G.dl); });
  SC.you = SC.them = SC.blocks = SC.fed = SC.hitsOnYou = SC.downs = 0; ME.hp = 10; roundT = 120; roundStarted = false; boardKey = ""; }
function setMode(i) { modeI = (i + MODES.length) % MODES.length; running = false; arm(); }
function go() { if (!roundStarted) { arm(); roundStarted = true; if (modeI >= 3) bell(); } running = true; FIGHTERS.forEach(F => F.wait = 1.0 + F.idx * 0.4); showTag(modeI === 2 ? "Attack when ready" : modeI === 4 ? "Defend yourself" : "Ready", "#f4e2b0"); }
function pause() { running = false; showMenu(true); showTag("Paused"); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "Space") { if (running) pause(); else { showMenu(false); go(); } } if (e.code === "KeyM") seated = !seated; if (e.code === "KeyV") voiceOn = !voiceOn; });
const keys = {}, prevB = {};
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("pointermove", e => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = -((e.clientY / innerHeight) * 2 - 1); });
renderer.domElement.addEventListener("pointerdown", e => { if (!started) { start(); return; } if (menuOn) { ray.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera); menuHover = menuPick(ray.ray.origin, ray.ray.direction); menuSelect(); } });
function start() { if (started) return; started = true; ac().resume?.(); document.getElementById("intro")?.classList.add("gone"); updateBody(); arm(); showMenu(true); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); setTimeout(() => { updateBody(); showMenu(true); }, 600); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0; equip(); updateBody(); arm();
const flash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0, depthTest: false, toneMapped: false })); flash.position.z = -0.1; flash.scale.setScalar(0.1); flash.renderOrder = 99; camera.add(flash);
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0, trig = false;
  if (vr) { SRC.left = SRC.right = null; const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; SRC[src.handedness] = src; const a = gp.axes, ax = a.length >= 4 ? 2 : 0, b = gp.buttons;
      const edge = (k, on) => { const r = on && !prevB[k]; prevB[k] = on; return r; };
      if (edge("t" + src.handedness, b[0]?.pressed)) trig = true;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.2 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.2 ? a[ax + 1] : 0; if (edge("ls", b[3]?.pressed)) seated = !seated; if (edge("x", b[4]?.pressed) && started) { if (running) pause(); else { showMenu(false); go(); } } }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { ME.yaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3 && Math.abs(ty) < 0.3) prevB.turn = false;
        if (Math.abs(ty) > 0.7 && !prevB.tilt) { gripTilt = clampN(gripTilt - Math.sign(ty) * 5 * Math.PI / 180, -0.8, 0.8); equip(); showTag(`Stick angle ${Math.round(gripTilt * 180 / Math.PI)}°`); prevB.tilt = true; } else if (Math.abs(ty) < 0.3) prevB.tilt = false;
        if (edge("a", b[4]?.pressed) && started) { if (running) pause(); else { showMenu(false); go(); } } } }
    for (const sd of ["right", "left"]) if (GRIP[sd] && HANDS[sd].parent !== GRIP[sd]) GRIP[sd].add(HANDS[sd]); }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ArrowLeft) ME.yaw += dt * 1.5; if (keys.ArrowRight) ME.yaw -= dt * 1.5; placeDesktop(); for (const sd of ["right", "left"]) if (HANDS[sd].parent !== DESK[sd]) DESK[sd].add(HANDS[sd]); }
  if (mx || my) { const f = V3(), r = V3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); r.crossVectors(f, UP); ME.x = clampN(ME.x + (f.x * -my + r.x * mx) * 1.4 * dt, -5.4, 5.4); ME.z = clampN(ME.z + (f.z * -my + r.z * mx) * 1.4 * dt, -5.4, 5.4); }
  rig.position.set(ME.x, FLOOR_Y + (vr && seated ? 0.45 : 0), ME.z); rig.rotation.y = ME.yaw; if (!vr) camera.position.set(0, 1.65, 0);
  updateBody(); updateSegs(dt);
  const act = FIGHTERS.filter(F => F.active);
  for (const F of act) { if (F.down <= 0) { const dd = Math.hypot(F.p.x - PB.head.x, F.p.z - PB.head.z); if (dd < 0.55) F.p.addScaledVector(F.f, -0.02); } }
  if (started && !menuOn) { for (const F of act) { aiUpdate(F, dt, act); poseF(F); drawF(F); } contact(dt); } else for (const F of act) { if (F.down <= 0) { F.f.set(PB.head.x - F.p.x, 0, PB.head.z - F.p.z).normalize(); F.r.crossVectors(F.f, UP); } poseF(F); drawF(F); }
  for (const F of act) if (F.down > 0) { F.down += dt; if (F.down > 4) { F.G.visible = false; } }
  if (running && modeI === 4 && act.every(F => F.down > 0)) { running = false; roundStarted = false; bell(); showTag(`All ${nAtt} down`, "#7ce07c"); setTimeout(() => showMenu(true), 1500); }
  if (running && modeI === 3) { roundT -= dt; if (roundT <= 0) { running = false; roundStarted = false; bell(); showTag(SC.you > SC.them ? `You win, ${SC.you} to ${SC.them}` : SC.you < SC.them ? `Partner wins, ${SC.them} to ${SC.you}` : `A draw, ${SC.you} all`, "#f4e2b0"); showMenu(true); } }
  if (menuOn) { drawMenu(); if (vr) { const o = WS.main.a.clone(), d = V3().subVectors(WS.main.b, WS.main.a).normalize(); menuHover = menuPick(o, d); laser.visible = true; laser.position.copy(o); laser.quaternion.setFromUnitVectors(NZ, d); laser.scale.setScalar(2); if (trig) menuSelect(); }
    else { ray.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera); menuHover = menuPick(ray.ray.origin, ray.ray.direction); } }
  const lead = act.find(F => F.down <= 0) || act[0]; tagAge += dt; if (lead) TAG.position.copy(lead.head).addScaledVector(UP, 0.42); TAG.material.opacity = tagAge < 2.5 ? 1 : Math.max(0, 1 - (tagAge - 2.5) * 2);
  if (frameN % 6 === 0) drawBoard();
  flashT = Math.max(0, flashT - dt); flash.material.opacity = flashT > 0 ? flashT * 0.9 : 0;
  renderer.render(scene, camera); });

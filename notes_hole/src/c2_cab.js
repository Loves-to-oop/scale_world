
// ---------- mixed reality only: a round booth over the hole, standing in your own room. Step in, the curved door slides shut behind you, and
// the lift goes down. With the door shut you can't see your room, so you never see that it isn't rising; below the floor the basement and the
// shaft are drawn all round you, and looking up you see the inside of the booth.
const CAB_R = R_HOLE + 0.13, CAB_H = 2.15, DOOR_H = 0.5, CAB = new THREE.Group(); CAB.visible = false; HOLE.add(CAB);
const DOOR = { t: 1, want: 1, then: null };
{ const panel = texOf((g, w, h) => { g.fillStyle = "#e4e8ea"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = "#b8bec2"; g.fillRect(x, 0, 2, h); } for (let y = 0; y < h; y += 128) { g.fillStyle = "#c4cacd"; g.fillRect(0, y, w, 2); } for (let k = 0; k < 900; k++) { g.fillStyle = "rgba(120,130,135,0.08)"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, 256, 256); panel.repeat.set(6, 2);
  const shell = M(0xffffff, { map: panel, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }), trim = M(0x3a4248, { metalness: 0.5, roughness: 0.4 }), glow = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x9fd8ff, emissiveIntensity: 1.2 });
  const th0 = Math.PI / 2 - GAP_A - Math.PI * 2 + DOOR_H, wall = new THREE.Mesh(new THREE.CylinderGeometry(CAB_R, CAB_R, CAB_H, 64, 1, true, th0, Math.PI * 2 - DOOR_H * 2), shell); wall.position.y = CAB_H / 2; CAB.add(wall);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(CAB_R + 0.03, CAB_R + 0.03, 0.08, 64), shell); cap.position.y = CAB_H + 0.04; CAB.add(cap);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(CAB_R - 0.05, 0.02, 8, 64).rotateX(Math.PI / 2), glow); ring.position.y = CAB_H - 0.06; CAB.add(ring);
  const base = new THREE.Mesh(new THREE.RingGeometry(R_HOLE - 0.005, CAB_R + 0.04, 64).rotateX(-Math.PI / 2), M(0x4a5258, { metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide })); base.position.y = 0.003; CAB.add(base);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(CAB_R + 0.04, CAB_R + 0.04, 0.06, 64, 1, true), trim); plinth.position.y = 0.03; CAB.add(plinth);
  for (const s of [-1, 1]) { const a = GAP_A + s * DOOR_H, jamb = new THREE.Mesh(new THREE.BoxGeometry(0.06, CAB_H, 0.08), trim); jamb.position.set(Math.cos(a) * CAB_R, CAB_H / 2, Math.sin(a) * CAB_R); jamb.rotation.y = -a; CAB.add(jamb); }
  const lamp = new THREE.PointLight(0xeaf6ff, 3, 4, 1.5); lamp.position.y = CAB_H - 0.25; CAB.add(lamp);
  // the door: a curved panel that slides round the outside of the booth, from beside the opening to across it
  const door = new THREE.Mesh(new THREE.CylinderGeometry(CAB_R + 0.025, CAB_R + 0.025, CAB_H - 0.02, 32, 1, true, Math.PI / 2 - GAP_A - DOOR_H - 0.04, DOOR_H * 2 + 0.08), M(0xffffff, { map: panel, roughness: 0.4, metalness: 0.15, side: THREE.DoubleSide })); door.position.y = CAB_H / 2; CAB.add(door); DOOR.mesh = door;
  const win = new THREE.Mesh(new THREE.CylinderGeometry(CAB_R + 0.03, CAB_R + 0.03, 0.05, 16, 1, true, Math.PI / 2 - GAP_A - 0.25, 0.5), glow); win.position.y = CAB_H * 0.55 - CAB_H / 2; door.add(win); }
// t = 0 shut, 1 open; the door is drawn rotated out of the way by (1 - closedness)
function updateDoor(dt) { if (!CAB.visible) return; const sp = dt / 1.8; DOOR.t = DOOR.want > DOOR.t ? Math.min(DOOR.want, DOOR.t + sp) : Math.max(DOOR.want, DOOR.t - sp); const e = DOOR.t * DOOR.t * (3 - 2 * DOOR.t); DOOR.mesh.rotation.y = -e * (DOOR_H * 2 + 0.12); if (DOOR.t === DOOR.want && DOOR.then) { const f = DOOR.then; DOOR.then = null; f(); } }

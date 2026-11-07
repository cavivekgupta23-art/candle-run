// Voxel characters built from boxes. Models face +x (the run direction); the world turns them a little toward the camera.
import * as THREE from 'three';

const GEO = new THREE.BoxGeometry(1, 1, 1);
const MATS = new Map<string, THREE.MeshLambertMaterial>();
const mat = (c: string) => {
  let m = MATS.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); MATS.set(c, m); }
  return m;
};
function box(p: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number) {
  const m = new THREE.Mesh(GEO, mat(c));
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true;
  p.add(m);
  return m;
}
function pivot(p: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
  return g;
}

export interface Rig { root: THREE.Group; body: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Group }

/** the runner (about 1.6 units tall, like the City's avatars) */
export function makePlayer(shirt = '#3b82f6'): Rig {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const legL = pivot(body, 0, 0.62, -0.13), legR = pivot(body, 0, 0.62, 0.13);
  for (const L of [legL, legR]) { box(L, 0.24, 0.5, 0.22, '#253047', 0, -0.27, 0); box(L, 0.3, 0.12, 0.25, '#1b1b1b', 0.04, -0.56, 0); }
  box(body, 0.34, 0.58, 0.56, shirt, 0, 0.9, 0);
  box(body, 0.35, 0.08, 0.57, '#ffd54f', 0, 0.78, 0);                     // belt
  const armL = pivot(body, 0, 1.13, -0.37), armR = pivot(body, 0, 1.13, 0.37);
  for (const A of [armL, armR]) { box(A, 0.19, 0.2, 0.19, shirt, 0, -0.06, 0); box(A, 0.16, 0.36, 0.16, '#f2c28b', 0, -0.33, 0); }
  const head = pivot(body, 0, 1.19, 0);
  box(head, 0.44, 0.42, 0.46, '#f2c28b', 0, 0.21, 0);
  box(head, 0.47, 0.11, 0.49, '#3b2a1a', -0.01, 0.45, 0);
  box(head, 0.13, 0.32, 0.49, '#3b2a1a', -0.17, 0.3, 0);
  box(head, 0.02, 0.08, 0.07, '#1b1b1b', 0.225, 0.26, -0.1); box(head, 0.02, 0.08, 0.07, '#1b1b1b', 0.225, 0.26, 0.1);
  box(head, 0.02, 0.03, 0.14, '#8d4b36', 0.225, 0.12, 0);
  return { root, body, legL, legR, armL, armR, head };
}

/** "Nirmala Taxaraman": saree, grey bun, glasses, bindi, the red Budget ledger and a giant 30% calculator */
export function makeTaxaraman(calcTex: THREE.Texture): Rig {
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const cream = '#f2e8d2', mag = '#c2185b', gold = '#d4a017', skin = '#b67d4e', grey = '#5f5f66';
  const legL = pivot(body, 0, 0, 0), legR = pivot(body, 0, 0, 0);       // the saree hides the legs; kept for the rig shape
  box(legL, 0.2, 0.08, 0.16, '#3e2723', 0.18, 0.04, -0.15); box(legR, 0.2, 0.08, 0.16, '#3e2723', 0.18, 0.04, 0.15);
  box(body, 0.62, 0.95, 0.84, cream, 0, 0.52, 0);
  box(body, 0.64, 0.16, 0.86, mag, 0, 0.15, 0);
  box(body, 0.645, 0.03, 0.865, gold, 0, 0.245, 0); box(body, 0.645, 0.03, 0.865, gold, 0, 0.055, 0);
  box(body, 0.5, 0.62, 0.7, cream, 0, 1.3, 0);
  const pallu = box(body, 0.05, 1.0, 0.24, mag, 0.27, 1.28, 0); pallu.rotation.x = 0.62;
  const edge = box(body, 0.055, 1.0, 0.03, gold, 0.272, 1.28, 0); edge.rotation.x = 0.62; edge.position.z = 0.12;
  const armL = pivot(body, 0, 1.55, -0.43), armR = pivot(body, 0, 1.55, 0.43);
  box(armL, 0.16, 0.62, 0.16, skin, 0, -0.31, 0);
  box(armL, 0.5, 0.62, 0.14, '#c62828', 0.14, -0.68, -0.06);              // the red bahi-khata ledger
  box(armL, 0.52, 0.06, 0.15, gold, 0.14, -0.62, -0.06);
  box(armR, 0.16, 0.58, 0.16, skin, 0, -0.29, 0);
  const calc = pivot(armR, 0.02, -0.6, 0);
  box(calc, 0.18, 0.72, 0.56, '#455a64', 0, -0.22, 0);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.22), new THREE.MeshBasicMaterial({ map: calcTex }));
  scr.position.set(0.095, -0.02, 0); scr.rotation.y = Math.PI / 2; calc.add(scr);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box(calc, 0.02, 0.09, 0.11, '#cfd8dc', 0.095, -0.24 - r * 0.13, -0.15 + c * 0.15);
  armR.rotation.z = 2.25;
  const head = pivot(body, 0, 1.62, 0);
  box(head, 0.5, 0.52, 0.5, skin, 0, 0.27, 0);
  box(head, 0.27, 0.27, 0.27, '#55555c', -0.37, 0.36, 0);                 // the bun, behind
  box(head, 0.54, 0.12, 0.54, grey, -0.01, 0.57, 0);
  box(head, 0.56, 0.13, 0.08, '#c9c9cf', -0.01, 0.575, 0);               // the white streak
  box(head, 0.14, 0.42, 0.54, grey, -0.2, 0.36, 0);
  for (const z of [-0.12, 0.12]) { box(head, 0.02, 0.15, 0.19, '#e3e8ea', 0.255, 0.33, z); box(head, 0.025, 0.08, 0.1, '#1b1b1b', 0.262, 0.33, z); }
  box(head, 0.02, 0.03, 0.08, '#e3e8ea', 0.255, 0.35, 0);
  box(head, 0.03, 0.055, 0.055, '#d32f2f', 0.258, 0.46, 0);              // bindi
  box(head, 0.02, 0.04, 0.17, '#5d2f22', 0.258, 0.16, 0);                // smile
  root.scale.setScalar(1.25);
  return { root, body, legL, legR, armL, armR, head };
}

export type Pose = 'idle' | 'run' | 'jump' | 'fall' | 'slide' | 'walk' | 'cheer';
/** procedural animation: t in seconds, speed 0..1 */
export function animate(r: Rig, t: number, pose: Pose, speed = 1) {
  const w = Math.sin(t * 15 * Math.max(0.5, speed)), b = Math.abs(w);
  r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0); r.head.rotation.set(0, 0, 0);
  switch (pose) {
    case 'run':
      r.legL.rotation.z = w * 0.95; r.legR.rotation.z = -w * 0.95; r.armL.rotation.z = -w * 0.9; r.armR.rotation.z = w * 0.9;
      r.body.position.y = b * 0.07; r.body.rotation.z = -0.1;
      break;
    case 'walk': {
      const s = Math.sin(t * 9);
      r.legL.rotation.z = s * 0.4; r.legR.rotation.z = -s * 0.4; r.armL.rotation.z = -s * 0.35;
      r.armR.rotation.z = 2.25 + Math.sin(t * 18) * 0.12; r.body.position.y = Math.abs(s) * 0.05; r.head.rotation.z = Math.sin(t * 4.5) * 0.06;
      break;
    }
    case 'jump': r.legL.rotation.z = 0.7; r.legR.rotation.z = -0.25; r.armL.rotation.z = 2.4; r.armR.rotation.z = 2.7; break;
    case 'fall': r.legL.rotation.z = 0.25; r.legR.rotation.z = -0.15; r.armL.rotation.z = 1.6; r.armR.rotation.z = 1.9; break;
    case 'slide':
      r.body.rotation.z = 1.15; r.body.position.set(0.15, 0.24, 0);
      r.legL.rotation.z = -0.4; r.legR.rotation.z = -0.2; r.armL.rotation.z = 2.6; r.armR.rotation.z = 2.8;
      break;
    case 'cheer': r.armL.rotation.z = 2.8 + w * 0.2; r.armR.rotation.z = 2.8 - w * 0.2; r.body.position.y = b * 0.25; r.legL.rotation.z = r.legR.rotation.z = 0; break;
    default: r.legL.rotation.z = r.legR.rotation.z = 0; r.armL.rotation.z = 0.08; r.armR.rotation.z = -0.08; r.body.position.y = Math.sin(t * 3) * 0.015;
  }
}

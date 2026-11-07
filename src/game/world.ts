// The 3D voxel world built from a level, and its per-frame update.
import * as THREE from 'three';
import * as C from '../sim/constants.ts';
import { cellOf, flareAt, flareWarn, type Level, type Spike } from '../sim/level.ts';
import { playerH, type Sim } from '../sim/physics.ts';
import { calcScreen, canvas, edgeTex, eventCard, glassTex, hazardSign, label, nameTag, powerTile, sign, stamp, windowsTex } from './art2d.ts';
import { animate, makePlayer, makeTaxaraman, type Rig } from './voxel.ts';

const GEO = new THREE.BoxGeometry(1, 1, 1);
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();
const setBox = (m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, w: number, h: number, d: number, rot = 0) => {
  Q.setFromAxisAngle(V.set(0, 1, 0), rot);
  M4.compose(V.set(x, y, z), Q, S.set(w, h, d));
  m.setMatrixAt(i, M4);
};
const sprite = (c: HTMLCanvasElement, w: number, h: number) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), depthWrite: false }));
  s.scale.set(w, h, 1);
  return s;
};
const rnd = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
const JOKES = [['BUY HIGH', 'SELL LOW'], ['WEN', 'LAMBO?'], ['NOT FINANCIAL', 'ADVICE'], ['HODL'], ['1% TDS', 'APPLIES'],
  ['STOP LOSS?', 'NEVER HEARD'], ['WAGMI*', '*not guaranteed'], ['THIS IS FINE,', 'PROBABLY'], ['DIAMOND', 'HANDS ONLY']];
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

interface Brick { i: number; y: number; h: number }

/** a dark voxel storm cloud with a flickering lightning bolt (named 'bolt') */
function stormCloud(s: number) {
  const g = new THREE.Group(), dark = new THREE.MeshLambertMaterial({ color: '#4b5563' }), mid = new THREE.MeshLambertMaterial({ color: '#6b7280' });
  [[-0.5, 0, 0.7, mid], [0, 0.18, 0.85, dark], [0.5, 0, 0.7, mid], [0.25, -0.12, 0.6, dark], [-0.28, -0.1, 0.6, dark]].forEach(([x, y, z, m]) => {
    const c = new THREE.Mesh(GEO, m as THREE.Material); c.scale.set((z as number) * s * 1.1, (z as number) * s * 0.8, (z as number) * s); c.position.set((x as number) * s, (y as number) * s, 0); g.add(c);
  });
  const bolt = new THREE.Group(); bolt.name = 'bolt';
  const yellow = new THREE.MeshBasicMaterial({ color: '#ffd400' });
  [[0, -0.42], [-0.1, -0.58], [0.04, -0.72], [-0.06, -0.88]].forEach(([x, y]) => { const b = new THREE.Mesh(GEO, yellow); b.scale.set(0.12 * s, 0.18 * s, 0.12 * s); b.position.set(x * s, y * s, 0.2 * s); bolt.add(b); });
  g.add(bolt);
  return g;
}

export class World {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera;
  player: Rig; tax: Rig; tag: THREE.Sprite; camX = 0;
  private bricks: THREE.InstancedMesh; private glass: THREE.InstancedMesh; private coins: THREE.InstancedMesh; private stamps: THREE.InstancedMesh;
  private parts: THREE.InstancedMesh; private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.InstancedMesh; private skyMat: THREE.MeshLambertMaterial; private clouds: THREE.InstancedMesh;
  private tips: THREE.MeshBasicMaterial; private poolMat: THREE.MeshBasicMaterial; private volSigns: THREE.Sprite[] = [];
  private flares: { i: number; g: THREE.Group; warn: THREE.Mesh }[] = []; private volCoins: THREE.InstancedMesh; private fin: THREE.Group;
  private rekt: { g: THREE.Group; on: boolean; x: number; y: number; vy: number; r: number }[] = []; private rektT = 0;
  private powers: THREE.Group[] = []; private heart: THREE.Group; private jet: THREE.Group; private shield: THREE.Mesh; private magnet: THREE.Sprite; private fud: THREE.Group;
  private brickOf: Brick[][] = []; private glassOf: number[] = []; private springs: { g: THREE.Group; i: number; t: number }[] = [];
  private lasers: THREE.Mesh[] = []; private taxed = 0; private stampN = 0; private sparkT = 0; private danger = 0;
  private pv: Float32Array; private pl: Float32Array; private pc: THREE.Color[]; private pn = 0;
  private cam = new THREE.Vector3(); private camT = new THREE.Vector3(); private shakeA = 0; private taxY = 0; private time = 0;
  dist = 30;

  constructor(cv: HTMLCanvasElement, public lv: Level, hi: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: hi, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, hi ? 1.5 : 1.25));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = hi;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 500);
    const sc = this.scene;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a9ac0, 1.25); sc.add(this.hemi);
    sc.fog = new THREE.Fog(0xdfe9f7, 40, 120);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5); this.sun.castShadow = hi;
    Object.assign(this.sun.shadow.camera, { left: -18, right: 18, top: 14, bottom: -14, near: 1, far: 80 });
    this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.bias = -0.002;
    sc.add(this.sun, this.sun.target);

    const n = lv.n, P = lv.plats, edge = tex(edgeTex());
    // candle bodies as stacked bricks (the voxel look); glass planks separately
    const layers = P.map(p => (p.doji ? 0 : Math.max(1, Math.round((p.top - p.bot) / 0.95))));
    this.bricks = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ map: edge }), layers.reduce((a, b) => a + b, 0));
    this.bricks.castShadow = this.bricks.receiveShadow = true;
    let k = 0;
    P.forEach((p, i) => {
      this.brickOf[i] = [];
      const nL = layers[i], lh = (p.top - p.bot) / Math.max(1, nL);
      for (let l = 0; l < nL; l++) {
        const b = { i: k, y: p.bot + (l + 0.5) * lh, h: lh * 0.97 };
        setBox(this.bricks, k, p.cx, b.y, 0, C.BODY_W, b.h, C.BODY_W);
        this.bricks.setColorAt(k, COL.set(p.up ? (l % 2 ? '#3cc472' : '#35b866') : (l % 2 ? '#e8525a' : '#e0474f')));
        this.brickOf[i].push(b); k++;
      }
    });
    sc.add(this.bricks);
    const gl = P.filter(p => p.doji);
    this.glass = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ map: tex(glassTex()), color: '#cdeeff', transparent: true, opacity: 0.8 }), Math.max(1, gl.length));
    gl.forEach((p, j) => { this.glassOf[p.i] = j; setBox(this.glass, j, p.cx, (p.top + p.bot) / 2, 0, C.BODY_W, p.top - p.bot, C.BODY_W); });
    sc.add(this.glass);

    // wicks (a stop-hunt candle keeps only the part of its wick above the hazard)
    const spikeOf = new Map(lv.spikes.map(s => [s.i, s]));
    const wicks = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial(), n * 2);
    let w = 0;
    P.forEach(p => {
      const c = COL.set(p.up ? '#2a9a55' : '#c13b43'), from = spikeOf.get(p.i)?.y1 ?? p.top;
      if (p.wickTop - from > 0.05) { setBox(wicks, w, p.cx, (p.wickTop + from) / 2, 0, 0.26, p.wickTop - from, 0.26); wicks.setColorAt(w++, c); }
      if (p.bot - p.wickBot > 0.05) { setBox(wicks, w, p.cx, (p.bot + p.wickBot) / 2, 0, 0.26, p.bot - p.wickBot, 0.26); wicks.setColorAt(w++, c); }
    });
    wicks.count = w; wicks.castShadow = true; sc.add(wicks);

    // hazards you must not touch: red-black electrified poles with a glowing tip and a warning sign
    this.tips = new THREE.MeshBasicMaterial({ color: '#ff1744' });
    const all = [...lv.spikes, ...lv.volSpikes];
    const segN = all.reduce((a, s) => a + Math.ceil((s.y1 - s.y0) / 0.24), 0);
    const segs = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial(), Math.max(1, segN));
    const tipM = new THREE.InstancedMesh(GEO, this.tips, Math.max(1, all.length * 3));
    const glow = new THREE.InstancedMesh(GEO, new THREE.MeshBasicMaterial({ color: '#ff1744', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }), Math.max(1, all.length));
    let sg = 0, tp = 0;
    all.forEach((s: Spike, j) => {
      const nseg = Math.ceil((s.y1 - s.y0) / 0.24), sh = (s.y1 - s.y0) / nseg;
      for (let m = 0; m < nseg; m++) { setBox(segs, sg, s.x, s.y0 + (m + 0.5) * sh, 0, 0.42, sh, 0.42); segs.setColorAt(sg++, COL.set(m % 2 ? '#111111' : '#e53935')); }
      [[0.5, 0.12], [0.34, 0.33], [0.18, 0.5]].forEach(([sz, dy]) => setBox(tipM, tp++, s.x, s.y1 + dy, 0, sz, 0.22, sz));
      setBox(glow, j, s.x, (s.y0 + s.y1) / 2 + 0.2, 0, 0.95, s.y1 - s.y0 + 0.9, 0.95);
      const vol = j >= lv.spikes.length, sgn = sprite(hazardSign(vol ? 'LIQUIDATION' : 'STOP HUNT'), 2.3, 0.58);
      sgn.position.set(s.x, s.y1 + 1.25, 0.3); sc.add(sgn);
      if (vol) { sgn.visible = false; this.volSigns.push(sgn); }
    });
    sc.add(segs, tipM, glow);

    // grass and flowers on green candles, embers on red ones
    const deco = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial(), n * 4), ember = new THREE.InstancedMesh(GEO, new THREE.MeshBasicMaterial(), n * 2);
    let d = 0, e = 0;
    P.forEach(p => {
      if (p.doji) return;
      if (p.up) {
        for (let j = 0; j < 3; j++) { const s = 0.14 + rnd(p.i * 3 + j) * 0.12; setBox(deco, d, p.cx - 0.7 + j * 0.65 + rnd(p.i + j) * 0.2, p.top + s / 2, 0.55 - rnd(p.i * 7 + j) * 1.1, s, s * 1.4, s); deco.setColorAt(d++, COL.set(j % 2 ? '#6fe39a' : '#4fd081')); }
        if (rnd(p.i * 11) > 0.6) { setBox(deco, d, p.cx + 0.3, p.top + 0.32, 0.3, 0.14, 0.14, 0.14); deco.setColorAt(d++, COL.set(['#ffffff', '#ffd54f', '#ff8fb1'][p.i % 3])); }
      } else {
        for (let j = 0; j < 2; j++) { setBox(ember, e, p.cx - 0.5 + j * 0.9, p.top + 0.07, 0.4 - j * 0.8, 0.16, 0.12, 0.16); ember.setColorAt(e++, COL.set(j ? '#ffb74d' : '#ff7043')); }
      }
    });
    deco.count = d; ember.count = e; sc.add(deco, ember);

    // the volume bars (the last-chance lane) standing in the glowing liquidation pool; the quietest days are pits
    const vol = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ map: edge }), n);
    let vn = 0;
    lv.vol.forEach(v => {
      if (v.pit) return;
      setBox(vol, vn, v.cx, (v.top + v.bot) / 2, 0, C.BODY_W, v.top - v.bot, C.BODY_W); vol.setColorAt(vn++, COL.set(v.up ? '#3fae6a' : '#d2525a'));
    });
    vol.count = vn; vol.receiveShadow = true; sc.add(vol);
    this.poolMat = new THREE.MeshBasicMaterial({ color: '#3a0710', fog: false });
    const pool = new THREE.InstancedMesh(GEO, this.poolMat, n);
    lv.vol.forEach((v, i) => setBox(pool, i, v.cx, v.bot - 0.9, 0, C.CELL + 0.02, 1.8, 3.4));
    sc.add(pool);
    // liquidation flares leaping out of the pits, with a yellow warning glow just before
    const core = new THREE.MeshBasicMaterial({ color: '#ffab00' });
    const halo = new THREE.MeshBasicMaterial({ color: '#ff3d00', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const v of lv.vol) if (v.pit) {
      const g = new THREE.Group(), c = new THREE.Mesh(GEO, core), hl = new THREE.Mesh(GEO, halo);
      c.scale.setScalar(0.55); hl.scale.setScalar(0.95); g.add(c, hl); g.visible = false; sc.add(g);
      const warn = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color: '#ffea00', transparent: true, opacity: 0, depthWrite: false }));
      warn.scale.set(C.CELL - 0.8, 0.06, 1.8); warn.position.set(v.cx, v.bot + 0.03, 0); sc.add(warn);
      this.flares.push({ i: v.i, g, warn });
    }
    // insurance-fund coins on the volume bars (shown in the last chance)
    this.volCoins = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ color: '#ffe08a', emissive: '#7a5a00' }), Math.max(1, lv.volCoins.length));
    sc.add(this.volCoins);
    // a whale fin cruising the lava, and liquidated traders tumbling in
    this.fin = new THREE.Group();
    const finM = new THREE.MeshLambertMaterial({ color: '#334155' });
    [[0.9, 0], [0.65, 0.3], [0.42, 0.6], [0.2, 0.9]].forEach(([fw, fy]) => {
      const b = new THREE.Mesh(GEO, finM); b.scale.set(fw, 0.3, 0.18); b.position.set(-fw / 2 + 0.45, fy + 0.15, 0); this.fin.add(b);
    });
    const ft = sprite(label('FEEDING ON LIQUIDATIONS', '#334155', 640), 3.4, 0.5); ft.position.y = 1.7; this.fin.add(ft);
    this.fin.visible = false; sc.add(this.fin);
    const TAGS = ['100x LONG', 'REKT', 'MARGIN CALLED', 'WEN BOUNCE?'];
    for (let j = 0; j < 4; j++) {
      const g = new THREE.Group(), m = makePlayer(['#ef4444', '#f59e0b', '#8b5cf6', '#10b981'][j]);
      m.root.scale.setScalar(0.55); m.armL.rotation.z = 2.6; m.armR.rotation.z = 2.6; g.add(m.root);
      const tg = sprite(label(TAGS[j], '#b91c1c', 448), 1.9, 0.38); tg.position.y = 1.35; g.add(tg);
      g.visible = false; sc.add(g); this.rekt.push({ g, on: false, x: 0, y: 0, vy: 0, r: 0 });
    }

    // resistance lasers, boost pads, coins
    const emit = new THREE.MeshLambertMaterial({ color: '#5a2d82' }), beamM = new THREE.MeshBasicMaterial({ color: '#ff2e63' });
    const glowM = new THREE.MeshBasicMaterial({ color: '#ff5c8a', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const l of lv.lasers) {
      for (const x of [l.x0 - 0.18, l.x1 + 0.18]) { const m = new THREE.Mesh(GEO, emit); m.scale.set(0.36, 0.7, 0.7); m.position.set(x, l.y, 0); sc.add(m); }
      const b = new THREE.Mesh(GEO, beamM); b.scale.set(l.x1 - l.x0, 0.1, 0.1); b.position.set((l.x0 + l.x1) / 2, l.y, 0); sc.add(b);
      const gm = new THREE.Mesh(GEO, glowM.clone()); gm.scale.set(l.x1 - l.x0, 0.34, 0.34); gm.position.copy(b.position); sc.add(gm); this.lasers.push(gm);
      const sgn = sprite(hazardSign('RESISTANCE · SLIDE ▼', 448), 2.7, 0.58); sgn.position.set((l.x0 + l.x1) / 2, l.y + 0.75, 0.3); sc.add(sgn);
    }
    const padM = new THREE.MeshLambertMaterial({ color: '#f5b700' }), baseM = new THREE.MeshLambertMaterial({ color: '#7a5a00' });
    for (const s of lv.springs) {
      const g = new THREE.Group(); g.position.set(s.x, P[s.i].top, 0);
      const base = new THREE.Mesh(GEO, baseM); base.scale.set(1.1, 0.1, 1.1); base.position.y = 0.05; g.add(base);
      const pad = new THREE.Mesh(GEO, padM); pad.scale.set(1.0, 0.18, 1.0); pad.position.y = 0.32; g.add(pad);
      for (let j = 0; j < 3; j++) { const c = new THREE.Mesh(GEO, baseM); c.scale.set(0.7, 0.04, 0.7); c.position.y = 0.12 + j * 0.06; g.add(c); }
      sc.add(g); this.springs.push({ g, i: s.i, t: 9 });
    }
    this.coins = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ color: '#ffc928', emissive: '#6b4a00' }), Math.max(1, lv.coins.length));
    sc.add(this.coins);

    // power-ups: a spinning tile with a glow and its name
    const NAMES = { moon: ['100x TO THE MOON', '#7c3aed'], shield: ['STOP-LOSS', '#0284c7'], magnet: ['AIRDROP MAGNET', '#d97706'], fud: ['FUD · SLOWS YOU 3s', '#475569'] } as const;
    for (const pw of lv.powers) {
      const g = new THREE.Group(); g.position.set(pw.x, pw.y, 0);
      if (pw.kind === 'fud') { g.add(stormCloud(0.9)); const t = sprite(label(NAMES.fud[0], NAMES.fud[1]), 2.9, 0.55); t.position.y = 1.15; g.add(t); sc.add(g); this.powers.push(g); continue; }
      const cube = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ map: tex(powerTile(pw.kind)) })); cube.scale.setScalar(0.78); cube.name = 'cube'; g.add(cube);
      const halo = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color: NAMES[pw.kind][1], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(1.25); g.add(halo);
      const t = sprite(label(NAMES[pw.kind][0], NAMES[pw.kind][1]), 2.9, 0.55); t.position.y = 1.0; g.add(t);
      sc.add(g); this.powers.push(g);
    }

    // "TAXED" stamps get added on the candles the taxman passes
    this.stamps = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: tex(stamp('TAXED')), transparent: true, depthWrite: false }), n);
    this.stamps.count = 0; sc.add(this.stamps);

    // the chart grid: round price levels and every fifth day
    const nl = n * C.CELL, topMax = Math.max(...P.map(p => p.top)), gridM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false });
    for (const pr of lv.prices) { const m = new THREE.Mesh(GEO, gridM); m.scale.set(nl + 40, 0.035, 0.02); m.position.set(nl / 2, pr.y, -1.6); sc.add(m); }
    const yLow = Math.min(...lv.vol.map(v => v.bot)) - 2;
    for (let i = 0; i < n; i += 5) { const m = new THREE.Mesh(GEO, gridM); m.scale.set(0.03, topMax + 8 - yLow, 0.02); m.position.set(P[i].cx, (topMax + 8 + yLow) / 2, -1.6); sc.add(m); }

    // the City skyline behind (windows light up at night), clouds, joke billboards
    const wt = tex(windowsTex()), { c: ec, g: eg } = canvas(64, 128);
    eg.fillStyle = '#000'; eg.fillRect(0, 0, 64, 128);
    for (let y = 10; y < 124; y += 18) for (let x = 8; x < 60; x += 14) if ((x * 7 + y * 3) % 5 < 3) { eg.fillStyle = '#ffd27a'; eg.fillRect(x, y, 7, 10); }
    this.skyMat = new THREE.MeshLambertMaterial({ map: wt, emissiveMap: tex(ec), emissive: '#000000' });
    const blds: number[][] = [], floorAt = (x: number) => lv.floor[cellOf(x, n)];
    for (const [z, col, hmin, hmax] of [[-34, '#9db3d8', 9, 19], [-60, '#bccbe6', 14, 30]] as const)
      for (let x = -90; x < nl + 90; x += 6 + rnd(x + z) * 7) blds.push([x, z, 4 + rnd(x * 3 + z) * 4.5, hmin + rnd(x * 5 - z) * (hmax - hmin), parseInt(col.slice(1), 16)]);
    this.sky = new THREE.InstancedMesh(GEO, this.skyMat, blds.length);
    blds.forEach(([x, z, bw, bh, c], i) => { const b0 = floorAt(x) - 9 - (z < -50 ? 3 : 0); setBox(this.sky, i, x, b0 + bh / 2, z, bw, bh, 4); this.sky.setColorAt(i, COL.setHex(c)); });
    sc.add(this.sky);
    this.clouds = new THREE.InstancedMesh(GEO, new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#555555' }), 160);
    let cn = 0;
    for (let x = -40; x < nl + 40 && cn < 156; x += 22 + rnd(x) * 18) {
      const cy = topMax + 4 + rnd(x * 2) * 7, cz = -28 - rnd(x * 4) * 10;
      for (let j = 0; j < 4 && cn < 160; j++) setBox(this.clouds, cn++, x + j * 1.8 - (j % 2) * 0.6, cy - (j % 3) * 0.6, cz, 2.4, 1.2, 1.4);
    }
    this.clouds.count = cn; sc.add(this.clouds);
    const poleM = new THREE.MeshLambertMaterial({ color: '#4a5a7a' });
    JOKES.forEach((lines, j) => {
      const i = 12 + j * 21; if (i >= n - 4) return;
      const y = P[i].top + 6.5, m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: tex(sign(lines)) }));
      m.position.set(P[i].cx, y, -12); sc.add(m);
      for (const dx of [-2, 2]) { const p = new THREE.Mesh(GEO, poleM); p.scale.set(0.25, 30, 0.25); p.position.set(P[i].cx + dx, y - 16.5, -12.2); sc.add(p); }
    });

    // start and finish
    const f = lv.file, mk = (lines: string[], bg: string, fg: string, x: number, y: number, sx = 4.4) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sx / 2), new THREE.MeshBasicMaterial({ map: tex(sign(lines, bg, fg)) })); m.position.set(x, y, -1.6); sc.add(m);
    };
    mk(['START', dayLabel(f.from)], '#1e2b4a', '#ffffff', P[0].cx, P[1].top + 3.6);
    const fx = lv.finishX + 0.9, fy = P[n - 1].top, pole = new THREE.Mesh(GEO, poleM);
    pole.scale.set(0.16, 4.2, 0.16); pole.position.set(fx, fy + 2.1, 0); sc.add(pole);
    const flag = new THREE.Mesh(GEO, new THREE.MeshLambertMaterial({ color: '#ffd84d' })); flag.scale.set(1.5, 0.9, 0.08); flag.position.set(fx + 0.8, fy + 3.7, 0); sc.add(flag);
    mk(['FINISH', dayLabel(f.to)], '#ffd84d', '#1e1b4b', fx + 2.6, fy + 3.2);

    // the level's real events, each on a billboard behind its candle
    for (const ev of lv.events) {
      const ei = ev.idx, card = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 5.75), new THREE.MeshBasicMaterial({ map: tex(eventCard(ev, f.candles[ei])) }));
      card.position.set(P[ei].cx + 5.5, Math.max(P[ei].top, P[Math.min(n - 1, ei + 3)].top) + 5.2, -7); card.rotation.y = -0.12; sc.add(card);
      const frame = new THREE.Mesh(GEO, poleM); frame.scale.set(10.8, 6.2, 0.3); frame.position.set(card.position.x, card.position.y, -7.25); frame.rotation.y = -0.12; sc.add(frame);
      for (const dx of [-3.5, 3.5]) { const p = new THREE.Mesh(GEO, poleM); p.scale.set(0.3, 30, 0.3); p.position.set(card.position.x + dx, card.position.y - 18, -7.4); sc.add(p); }
    }

    // characters and what the runner carries
    this.player = makePlayer(); sc.add(this.player.root);
    this.jet = new THREE.Group();
    const tank = new THREE.MeshLambertMaterial({ color: '#cfd8dc' }), nose = new THREE.MeshLambertMaterial({ color: '#7c3aed' });
    for (const z of [-0.15, 0.15]) {
      const t = new THREE.Mesh(GEO, tank); t.scale.set(0.28, 0.72, 0.28); t.position.set(-0.36, 0.95, z * 1.3); this.jet.add(t);
      const tp = new THREE.Mesh(GEO, nose); tp.scale.set(0.3, 0.16, 0.3); tp.position.set(-0.36, 1.38, z * 1.3); this.jet.add(tp);
    }
    this.jet.visible = false; this.player.body.add(this.jet);
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1.15, 18, 12), new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.shield.position.y = 0.85; this.shield.visible = false; this.player.root.add(this.shield);
    this.magnet = sprite(label('🧲 AIRDROP', '#d97706', 384), 1.6, 0.4); this.magnet.position.y = 2.25; this.magnet.visible = false; this.player.root.add(this.magnet);
    this.fud = stormCloud(0.55); this.fud.position.y = 2.3; this.fud.visible = false; this.player.root.add(this.fud);
    this.tax = makeTaxaraman(tex(calcScreen('30%'))); sc.add(this.tax.root);
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(nameTag('NIRMALA TAXARAMAN')), depthWrite: false }));
    this.tag.scale.set(3.6, 0.68, 1); sc.add(this.tag);

    // the MARGIN TOP-UP heart in the volume, with a beam you can see from far away
    this.heart = new THREE.Group();
    const hm = new THREE.MeshBasicMaterial({ color: '#ff2d55' });
    HEART.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') { const b = new THREE.Mesh(GEO, hm); b.scale.setScalar(0.22); b.position.set((c - 3) * 0.22, (2.5 - r) * 0.22, 0); this.heart.add(b); } }));
    const beam = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ color: '#ff6b8b', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.scale.set(0.8, 14, 0.8); beam.position.y = 7; this.heart.add(beam);
    const ht = sprite(label('MARGIN TOP-UP ♥', '#e11d48'), 3.2, 0.6); ht.position.y = 1.2; this.heart.add(ht);
    this.heart.visible = false; sc.add(this.heart);

    // particles
    this.parts = new THREE.InstancedMesh(GEO, new THREE.MeshBasicMaterial(), 320);
    this.pv = new Float32Array(320 * 6); this.pl = new Float32Array(320 * 2); this.pc = Array.from({ length: 320 }, () => new THREE.Color());
    for (let i = 0; i < 320; i++) { setBox(this.parts, i, 0, -999, 0, 0, 0, 0); this.parts.setColorAt(i, COL.set('#fff')); }
    sc.add(this.parts);
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    const a = w / h;
    this.camera.aspect = a; this.camera.updateProjectionMatrix();
    const needW = a < 1 ? 18 : 26;                                   // world units across the screen
    this.dist = Math.max(21, needW / 2 / (Math.tan(THREE.MathUtils.degToRad(19)) * a));
  }

  burst(x: number, y: number, color: string, count: number, speed = 6, up = 4, size = 0.22) {
    for (let j = 0; j < count; j++) {
      const i = this.pn = (this.pn + 1) % 320, a = Math.random() * Math.PI * 2;
      this.pv.set([x, y, (Math.random() - 0.5) * 1.2, Math.cos(a) * speed * Math.random(), up + Math.sin(a) * speed * Math.random(), (Math.random() - 0.5) * 3], i * 6);
      this.pl[i * 2] = this.pl[i * 2 + 1] = 0.5 + Math.random() * 0.5;
      this.pc[i].set(color); this.parts.setColorAt(i, this.pc[i]);
      setBox(this.parts, i, x, y, 0, size, size, size);
    }
    this.parts.instanceColor!.needsUpdate = true;
  }
  shake(a: number) { this.shakeA = Math.max(this.shakeA, a); }
  bounceSpring(i: number) { const s = this.springs.find(q => q.i === i); if (s) s.t = 0; }
  setDanger(on: boolean) { this.danger = on ? 1 : 0; }

  /** day to night as the run goes on; 0..1 */
  setTime(p: number) {
    const dg = this.danger, night = Math.max(0, (p - 0.72) / 0.28) * (1 - dg * 0.7);
    this.hemi.intensity = 1.25 - night * 0.4 + dg * 0.2; this.sun.intensity = 1.5 - night * 0.65;
    this.sun.color.setHSL(0.09, 0.6 * Math.min(1, Math.max(0, (p - 0.5) * 3)), 0.6 + 0.4 * (1 - Math.min(1, Math.max(0, (p - 0.5) * 3))));
    this.hemi.color.setRGB(1, 1 - dg * 0.16, 1 - dg * 0.2);
    this.skyMat.emissive.setRGB(night * 0.9, night * 0.75, night * 0.45);
    (this.scene.fog as THREE.Fog).color.setRGB(0.87 - night * 0.55 + dg * 0.08, 0.91 - night * 0.6 - dg * 0.22, 0.97 - night * 0.5 - dg * 0.25);
  }

  update(s: Sim, dt: number, focusX?: number) {
    this.time += dt;
    const p = s.p, lv = this.lv, P = lv.plats, n = lv.n;
    // runner and what it carries
    const r = this.player;
    r.root.position.set(p.x, p.y, 0);
    r.root.rotation.y = p.face > 0 ? -0.62 : Math.PI + 0.62;
    const pose = s.state === 'won' ? 'cheer' : p.jet > 0 ? 'jump' : p.sliding ? 'slide' : !p.grounded ? (p.vy > 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 0.5 ? 'run' : 'idle';
    animate(r, this.time, pose, Math.abs(p.vx) / C.RUN_V);
    r.root.visible = !(p.invuln > 0 && Math.floor(this.time * 18) % 2 === 0 && s.state === 'play');
    this.jet.visible = p.jet > 0;
    if (p.jet > 0) this.burst(p.x - 0.45, p.y + 0.5, Math.random() < 0.5 ? '#ffd54f' : '#ff5722', 3, 1.4, -6, 0.3);
    this.shield.visible = p.shield; this.shield.scale.setScalar(1 + Math.sin(this.time * 6) * 0.04);
    this.magnet.visible = p.magnet > 0;
    this.fud.visible = p.slow > 0;
    if (p.slow > 0 && Math.random() < 0.6) this.burst(p.x + (Math.random() - 0.5) * 0.8, p.y + 2.1, '#94a3b8', 1, 0.3, -7, 0.1);
    const bolt = this.fud.getObjectByName('bolt'); if (bolt) bolt.visible = Math.sin(this.time * 23) > 0.6;
    // the taxman walks on the candle tops behind
    const ci = cellOf(Math.max(0, s.ch.x), n), ty = P[ci].top;
    this.taxY += (ty - this.taxY) * Math.min(1, dt * 8);
    if (this.time < 0.1) this.taxY = ty;
    this.tax.root.position.set(s.ch.x, this.taxY, 0.1);
    this.tax.root.rotation.y = -0.55;
    animate(this.tax, this.time, (s.ch.started && s.ch.wait <= 0) || s.state !== 'play' ? 'walk' : 'idle');
    this.tag.position.set(s.ch.x, this.taxY + 3.75, 0.2);
    // taxed candles shrink by 30% and get a stamp
    while (this.taxed < s.ch.taxedUpTo) {
      const i = this.taxed++, pl = P[i];
      if (pl.doji) continue;
      const span = pl.top - pl.bot;
      for (const b of this.brickOf[i]) { const ny = pl.bot + (b.y - pl.bot) * 0.7; setBox(this.bricks, b.i, pl.cx, ny, 0, C.BODY_W, b.h * 0.7, C.BODY_W); }
      this.bricks.instanceMatrix.needsUpdate = true;
      setBox(this.stamps, this.stampN++, pl.cx, pl.bot + span * 0.35, C.BODY_W / 2 + 0.02, 1.7, 0.85, 1);
      this.stamps.count = this.stampN; this.stamps.instanceMatrix.needsUpdate = true;
    }
    // glass planks: shake while cracking, vanish when broken
    for (const pl of P) if (pl.doji) {
      const j = this.glassOf[pl.i], gone = s.gone[pl.i] > 0, jit = !gone && s.crumble[pl.i] > 0 ? (Math.random() - 0.5) * 0.08 : 0;
      setBox(this.glass, j, pl.cx + jit, (pl.top + pl.bot) / 2, 0, gone ? 0 : C.BODY_W, gone ? 0 : pl.top - pl.bot, gone ? 0 : C.BODY_W);
    }
    this.glass.instanceMatrix.needsUpdate = true;
    // coins spin; power-ups spin and bob; collected ones are gone
    lv.coins.forEach((c, j) => setBox(this.coins, j, c.x, c.y + Math.sin(this.time * 3 + j) * 0.08, 0, s.got[j] ? 0 : 0.44, s.got[j] ? 0 : 0.44, s.got[j] ? 0 : 0.12, this.time * 3 + j));
    this.coins.instanceMatrix.needsUpdate = true;
    this.powers.forEach((g, j) => {
      g.visible = !s.gotPow[j];
      g.position.y = lv.powers[j].y + Math.sin(this.time * 2.5 + j) * 0.12;
      const c = g.getObjectByName('cube'); if (c) { c.rotation.y = this.time * 1.8; c.rotation.x = 0.35; }
      const b = g.getObjectByName('bolt'); if (b) b.visible = Math.sin(this.time * 19 + j) > 0.5;
    });
    // hazards crackle: a pulsing tip and sparks near the runner
    this.tips.color.setHSL(0.98, 1, 0.5 + Math.sin(this.time * 9) * 0.12);
    if ((this.sparkT -= dt) <= 0) {
      this.sparkT = 0.22;
      for (const sp of p.lane === 'top' ? lv.spikes : lv.volSpikes) if (Math.abs(sp.x - p.x) < 16 && Math.random() < 0.5) this.burst(sp.x, sp.y1 + 0.3, '#ffe14d', 3, 2.5, 2.5, 0.12);
    }
    for (const sg of this.volSigns) sg.visible = p.lane === 'vol';
    for (const f of this.flares) {                              // flares: real positions from the sim clock
      const fy = flareAt(lv, f.i, s.t), wm = f.warn.material as THREE.MeshBasicMaterial;
      f.g.visible = fy !== null;
      if (fy !== null) {
        f.g.position.set(lv.vol[f.i].cx, fy, 0); f.g.rotation.set(this.time * 5, this.time * 4, 0);
        if (Math.random() < 0.3) this.burst(lv.vol[f.i].cx, fy - 0.2, '#ff6d00', 1, 0.5, -1, 0.16);
      }
      wm.opacity = flareWarn(f.i, s.t) ? 0.45 + Math.sin(this.time * 30) * 0.3 : 0;
    }
    const inVol = p.lane === 'vol';
    this.volCoins.visible = inVol;
    if (inVol) {
      lv.volCoins.forEach((c, j) => { const k = s.gotVol[j] ? 0 : 1; setBox(this.volCoins, j, c.x, c.y + Math.sin(this.time * 3 + j) * 0.08, 0, 0.44 * k, 0.44 * k, 0.12 * k, this.time * 3 + j); });
      this.volCoins.instanceMatrix.needsUpdate = true;
    }
    this.fin.visible = inVol;
    if (inVol) { const fx = p.x - 12 + ((this.time * 2.6) % 30), fv = lv.vol[cellOf(fx, n)]; this.fin.position.set(fx, fv.bot + 0.02, 1.7); }
    if (inVol && (this.rektT -= dt) <= 0) {                    // a liquidated trader tumbles into the lava now and then
      this.rektT = 1.2 + Math.random() * 0.8;
      const r0 = this.rekt.find(q => !q.on);
      if (r0) { r0.on = true; r0.x = p.x + 3 + Math.random() * 11; r0.y = lv.vol[cellOf(r0.x, n)].top + 9; r0.vy = 0; r0.r = 0; }
    }
    for (const q of this.rekt) {
      if (!q.on) { q.g.visible = false; continue; }
      q.vy -= 14 * dt; q.y += q.vy * dt; q.r += dt * 3;
      const bot = lv.vol[cellOf(q.x, n)].bot;
      if (q.y < bot - 0.4 || !inVol) { q.on = false; q.g.visible = false; if (inVol) this.burst(q.x, bot + 0.1, '#ff6d00', 12, 3.5, 4); continue; }
      q.g.visible = true; q.g.position.set(q.x, q.y, -0.8); q.g.rotation.z = q.r;
    }
    this.poolMat.color.setRGB(0.62 + this.danger * (0.3 + Math.sin(this.time * 5) * 0.06), 0.16 + this.danger * (0.1 + Math.sin(this.time * 3) * 0.04), 0.06);
    if (p.lane === 'vol' && Math.random() < 0.35) { const bx = p.x - 10 + Math.random() * 24, v = lv.vol[cellOf(bx, n)]; this.burst(bx, v.bot + 0.05, Math.random() < 0.5 ? '#ff6d00' : '#ff1744', 1, 0.6, 2.2, 0.2); }
    // the MARGIN TOP-UP heart
    const hv = !!s.heart && !s.heart.got && p.lane === 'vol';
    this.heart.visible = hv;
    if (hv && s.heart) { this.heart.position.set(s.heart.x, s.heart.y + Math.sin(this.time * 3) * 0.12, 0.2); this.heart.rotation.y = Math.sin(this.time * 2) * 0.6; }
    for (const l of this.lasers) (l.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.random() * 0.18;
    for (const sp of this.springs) { sp.t += dt; const k = sp.t < 0.25 ? 1 - Math.sin(sp.t / 0.25 * Math.PI) * 0.6 : 1; sp.g.scale.y = k; }
    this.clouds.position.x = Math.sin(this.time * 0.05) * 6;
    // particles
    for (let i = 0; i < 320; i++) {
      if (this.pl[i * 2] <= 0) continue;
      const o = i * 6; this.pl[i * 2] -= dt;
      this.pv[o + 4] -= 16 * dt; this.pv[o] += this.pv[o + 3] * dt; this.pv[o + 1] += this.pv[o + 4] * dt; this.pv[o + 2] += this.pv[o + 5] * dt;
      const sz = Math.max(0, this.pl[i * 2] / this.pl[i * 2 + 1]) * 0.24;
      setBox(this.parts, i, this.pv[o], this.pv[o + 1], this.pv[o + 2], sz, sz, sz, this.time * 4);
    }
    this.parts.instanceMatrix.needsUpdate = true;
    // camera: a little ahead of the runner, looking at the coming candles (or down at the volume in the last chance)
    const cc = cellOf(p.x, n);
    let look: number;
    const localTop = Math.min(...[-1, 0, 1].map(k => P[Math.max(0, Math.min(n - 1, cc + k))].top));
    if (p.lane === 'vol') look = lv.vol[cc].top + 1.9;
    else if (p.downT > 0 || (!p.grounded && p.vy < -4 && p.y < localTop - 0.6)) look = p.y + 1.7;
    else {
      const ahead = [1, 2, 3, 4].map(k => P[Math.min(n - 1, cc + k)].top);
      look = p.y * 0.55 + (ahead.reduce((a, b) => a + b, 0) / 4) * 0.45 + 1.4 + (p.sliding ? 0 : playerH(p) * 0.2);
    }
    this.camT.set(focusX ?? p.x + 3.2, focusX === undefined ? look : this.taxY + 1.6 + (look - this.taxY - 1.6) * Math.min(1, Math.max(0, (focusX - s.ch.x) / (p.x + 3.2 - s.ch.x))), 0);
    if (this.cam.lengthSq() === 0) this.cam.copy(this.camT);
    this.cam.lerp(this.camT, Math.min(1, dt * (p.lane === 'vol' ? 3.5 : 5)));
    this.camX = this.cam.x;
    this.shakeA = Math.max(0, this.shakeA - dt * 2.5);
    const sh = this.shakeA * this.shakeA, jx = (Math.random() - 0.5) * sh, jy = (Math.random() - 0.5) * sh;
    this.camera.position.set(this.cam.x + 4.8 + jx, this.cam.y + 4.6 + jy, this.dist);
    this.camera.lookAt(this.cam.x + jx * 0.5, this.cam.y + jy * 0.5, 0);
    this.sun.position.set(this.cam.x - 8, this.cam.y + 18, 14); this.sun.target.position.set(this.cam.x, this.cam.y - 2, 0);
    this.renderer.render(this.scene, this.camera);
  }

  /** world position to CSS pixels (for speech bubbles, labels and the chart axes) */
  toScreen(x: number, y: number, z = 0) {
    V.set(x, y, z).project(this.camera);
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: (V.x + 1) / 2 * r.width, y: (1 - V.y) / 2 * r.height, on: V.z < 1 && Math.abs(V.x) < 1.05 && Math.abs(V.y) < 1.05 };
  }
}

export const dayLabel = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase();

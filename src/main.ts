import './style.css';
import * as C from './sim/constants.ts';
import { buildLevel, cellOf, type LevelFile } from './sim/level.ts';
import { enterVolume, margin, newSim, step, type Sim, type State } from './sim/physics.ts';
import { bot } from './sim/bot.ts';
import { taxFigure } from './game/art2d.ts';
import { audio } from './game/audio.ts';
import { bindTouch, on, read, touch } from './game/input.ts';
import { Hud, dayStr } from './game/hud.ts';
import { World } from './game/world.ts';

const $ = (id: string) => document.getElementById(id)!;
const VOICE = { thirty: 'audio/sitharaman_30_per_cent.mp3', tds: 'audio/sitharaman_tds_1_per_cent.mp3', setoff: 'audio/sitharaman_cannot_be_set_off.mp3' };
const VOICE_CREDIT = 'Voice: PIB India, Union Budget 2022-23 speech (1 Feb 2022), her own words, unedited. Parody.';
const LINES = ['30% + 1% TDS, please!', 'Is that a profit I see?', 'Loss? Still no set-off!', 'Every candle is taxable!'];
const SKY: [number, string, string][] = [[0, '#ffb38a', '#ffe6c7'], [0.18, '#7cc8ff', '#ffe2bf'], [0.6, '#74b9ff', '#ffe9c9'], [0.82, '#ff8a65', '#ffd180'], [1, '#18204a', '#3f3570']];
type Mode = 'title' | 'count' | 'play' | 'pause' | 'over' | 'won';
const QS = new URLSearchParams(location.search), AUTO = QS.get('bot') === '1', SEEK = Number(QS.get('seek') || 0);

async function boot() {
  if (touch) document.body.classList.add('touch');
  const idx = await (await fetch('levels/index.json', { cache: 'no-cache' })).json();
  const file = await (await fetch(`levels/${idx.BTC}.json`, { cache: 'no-cache' })).json() as LevelFile;
  const lv = buildLevel(file);
  const world = new World($('c') as HTMLCanvasElement, lv, !touch);
  const hud = new Hud(lv, world);
  const fit = () => world.resize(innerWidth, innerHeight);
  addEventListener('resize', fit); fit();
  bindTouch($('pads'));
  audio.preload([VOICE.thirty, VOICE.tds, VOICE.setoff, ...lv.events.map(e => e.sound)]);

  let sim: Sim = newSim(lv), mode: Mode = 'title', countT = 0, acc = 0, last = performance.now(), sayCd = 6, lineN = 0, voicedTds = false, skyT = 0, tipT = 0, popT = 0;
  const POPS = ['100x LONG LIQUIDATED', 'LONG REKT', 'MARGIN CALLED', 'STOP-LOSS HIT', 'SHORT SQUEEZED', '50x LONG GONE', 'WEN BOUNCE?', 'HODLER REKT'];
  const seen = new Set<string>();
  const bestKey = `cr_best_${file.id}`;
  const best = () => { try { return JSON.parse(localStorage.getItem(bestKey) || 'null'); } catch { return null; } };

  // title screen
  const coinrow = $('coinrow');
  for (const [sym, name, live] of [['BTC', 'Bitcoin', true], ['ETH', 'Ethereum', false], ['BNB', 'BNB', false], ['SOL', 'Solana', false], ['XRP', 'XRP', false]] as const) {
    const b = document.createElement('button');
    b.className = `coin ${live ? 'sel' : 'soon'}`; b.disabled = !live;
    b.innerHTML = `<b>${sym}</b>${live ? '<canvas width="280" height="80"></canvas>' : ''}<i>${live ? `${name} · Level 1` : `${name} · coming soon`}</i>`;
    coinrow.appendChild(b);
    if (live) {
      const cv = b.querySelector('canvas')!, g = cv.getContext('2d')!, k = file.candles, lo = Math.min(...k.map(a => a[3])), hi = Math.max(...k.map(a => a[2]));
      const y = (p: number) => 4 + 72 * (1 - (p - lo) / (hi - lo)), cw = 280 / k.length;
      k.forEach((a, i) => { g.fillStyle = a[4] >= a[1] ? '#26a69a' : '#ef5350'; g.fillRect(i * cw, y(a[2]), Math.max(1, cw * 0.3), y(a[3]) - y(a[2])); g.fillRect(i * cw - cw * 0.2, y(Math.max(a[1], a[4])), Math.max(1, cw * 0.8), Math.max(1, y(Math.min(a[1], a[4])) - y(Math.max(a[1], a[4])))); });
    }
  }
  $('lvinfo').textContent = `${file.name} level: ${file.candles.length} real daily candles, ${dayStr(file.candles[0][0])} → ${dayStr(file.candles[file.candles.length - 1][0])}. ` +
    `Charts update to the newest month at each month end (next update ${dayStr(Date.parse(file.next_update))}).`;
  $('keys').textContent = touch ? 'The runner runs by itself: ▲ jump · ▼ slide (hold under lasers) · ◀ hold back' : '◀ ▶ move · ▲ / W / Space jump · ▼ / S slide (hold it under lasers) · P pause · M mute';
  const showBest = () => { const b = best(); $('best').textContent = b ? `Your best: ${b.time.toFixed(1)} s · ${b.coins} coins` : ''; };
  showBest();

  const screens = ['title', 'over', 'won', 'paused', 'req', 'loading'];
  const show = (id: string | null) => screens.forEach(s => $(s).classList.toggle('hidden', s !== id));
  const muteBtn = $('mute');
  const syncMute = () => muteBtn.classList.toggle('off', audio.muted);
  syncMute();

  function start() {
    audio.unlock();
    sim = newSim(lv); acc = 0; countT = 2.4; mode = 'count'; voicedTds = false; sayCd = 6; lineN = 0;
    if (SEEK > 1) { const q = lv.plats[SEEK]; Object.assign(sim.p, { x: q.cx, y: q.top, plat: SEEK, lastSafe: SEEK, best: SEEK }); sim.ch.x = q.cx - 18; sim.ch.taxedUpTo = Math.max(0, SEEK - 7); }
    if (QS.get('catch') === '1') { sim.ch.x = sim.p.x - 5; sim.ch.started = true; }
    hud.reset(); show(null); $('hud').classList.remove('hidden'); world.setDanger(false); seen.clear();
    hud.say(LINES[0], 3.2);
    audio.startMusic();
    if (QS.get('last') === '1') { enterVolume(sim); world.setDanger(true); audio.startMusic('danger'); setTimeout(() => hud.showZoneEvent(), 1800); }
    if (QS.get('drop') === '1') sim.p.y = lv.floor[Math.max(0, SEEK)] - 2;
  }
  function end(state: State) {
    mode = state === 'won' ? 'won' : 'over';
    hud.hideEvent(); hud.quiet();
    if (state === 'won') {
      audio.sfx('win');
      const t = sim.t, b = best();
      if (!b || t < b.time) { try { localStorage.setItem(bestKey, JSON.stringify({ time: t, coins: sim.p.coins })); } catch { /* storage blocked */ } }
      $('wstats').innerHTML = [['Time', `${t.toFixed(1)} s`], ['Coins', `${sim.p.coins} / ${lv.coins.length}`], ['Hearts left', `${sim.p.hearts}`],
        ['Closest call', `${Math.round(sim.minMargin * 100)}% margin`], ['Last chance', sim.lastUsed ? 'used' : 'not needed'], ['Taxman got', '0%']].map(([a, v]) => `<div>${a}<b>${v}</b></div>`).join('');
      setTimeout(() => { show('won'); showBest(); }, 900);
      return;
    }
    audio.sfx('taxed');
    const taxed = state === 'taxed', ci = cellOf(sim.p.x, lv.n), k = file.candles[ci];
    $('otitle').textContent = taxed ? 'TAXED OUT!' : 'LIQUIDATED!';
    const where = `candle ${ci + 1} of ${lv.n}  ·  ${dayStr(k[0])}`;
    $('osub').textContent = taxed ? `Nirmala Taxaraman caught you at ${where}` : sim.cause === 'pool' ? `You fell into the liquidation pool at ${where}` : sim.lastUsed ? `Your last life got liquidated at ${where}` : `Out of hearts at ${where}`;
    $('obubble').textContent = taxed ? '“…cannot be set off against any other income.”' : 'Out of hearts? The 1% TDS still applies.';
    $('ocredit').textContent = taxed ? VOICE_CREDIT : 'Parody character. Not tax advice.';
    const rows = taxed
      ? [['P&L this run', 'LOSS'], ['Tax on gains (30%)', '0, no gains'], ['TDS (1% on sales)', 'ALREADY CUT'], ['Set off this loss?', 'NOT ALLOWED'], ['Carry it forward?', 'NOT ALLOWED']]
      : [['Hearts left', '0'], ['Last chance', sim.lastUsed ? 'USED' : 'NOT USED'], ['Margin call', 'MISSED'], ['TDS (1% on sales)', 'ALREADY CUT'], ['Set off this loss?', 'NOT ALLOWED']];
    $('receipt').innerHTML = `<h2>${taxed ? 'TAX STATEMENT' : 'LIQUIDATION NOTICE'}</h2><div class="meta">${file.coin} run · ${dayStr(k[0])} · candle ${ci + 1}/${lv.n}</div>` +
      rows.map(([a, b]) => `<div class="row"><span>${a}</span>${/LOSS|NOT|MISSED|^0$/.test(b) ? `<b>${b}</b>` : `<span>${b}</span>`}</div>`).join('') +
      `<div class="net"><span>NET RESULT</span><b>REKT</b></div><div class="stamp">1% TDS</div>`;
    const pc = $('portrait') as HTMLCanvasElement, g = pc.getContext('2d')!;
    g.clearRect(0, 0, pc.width, pc.height); g.save(); g.translate(176, 430); g.scale(2.6, 2.6); taxFigure(g); g.restore();
    setTimeout(() => { show('over'); if (taxed) audio.voice(VOICE.setoff); }, 700);
  }
  const pause = () => { if (mode === 'play') { mode = 'pause'; show('paused'); } else if (mode === 'pause') { mode = 'play'; show(null); last = performance.now(); } };
  const toTitle = () => { mode = 'title'; audio.stopMusic(); world.setDanger(false); $('hud').classList.add('hidden'); show('title'); showBest(); };

  $('start').onclick = start; $('retry').onclick = start; $('again').onclick = start;
  $('menu').onclick = toTitle; $('menu2').onclick = toTitle; $('menu3').onclick = toTitle;
  $('resume').onclick = pause; $('pausebtn').onclick = pause;
  $('reqbtn').onclick = () => show('req'); $('reqclose').onclick = () => show('title');
  muteBtn.onclick = () => { audio.toggleMute(); syncMute(); if (!audio.muted && mode === 'play') audio.startMusic(sim.p.lane === 'vol' ? 'danger' : 'run'); };
  on('pause', pause);
  on('mute', () => muteBtn.click());
  on('enter', () => { if (mode === 'title' || mode === 'over' || mode === 'won') start(); });
  on('retry', () => { if (mode === 'over' || mode === 'won') start(); });
  on('any', () => audio.unlock());

  function events() {
    for (const e of sim.events) {
      switch (e.type) {
        case 'jump': audio.sfx('jump'); break;
        case 'land': audio.sfx('land'); world.burst(e.x, e.y + 0.05, '#e8eef7', 5, 2.5, 1.5); break;
        case 'coin': audio.sfx('coin'); world.burst(e.x, e.y, '#ffd84d', 10, 3, 3); break;
        case 'hit': audio.sfx('hit'); world.shake(0.8); world.burst(e.x, e.y + 0.8, '#ff4d6d', 14, 5, 4); hud.toast('−1 ♥'); break;
        case 'spring': audio.sfx('spring'); world.bounceSpring(e.i); world.burst(e.x, e.y, '#ffd84d', 12, 4, 6); hud.toast('BOOST!', 0.7); break;
        case 'slide': audio.sfx('slide'); break;
        case 'crumble': audio.sfx('crumble'); world.burst(lv.plats[e.i].cx, lv.plats[e.i].top, '#cdeeff', 18, 4, 3); hud.toast('GLASS CRACKED!', 0.8); break;
        case 'fall': audio.sfx('fall'); world.shake(0.7); world.burst(e.x, e.y + 0.2, '#ff5c8a', 18, 5, 4); hud.toast('FELL TO THE VOLUME FLOOR −1 ♥', 1.4); break;
        case 'event': {
          const ev = lv.events[e.i];
          audio.sfx(ev.sfx === 'alarm' ? 'alarm' : 'sting'); hud.showEvent(e.i, 9.5); world.shake(0.4);
          if (ev.sound) setTimeout(() => audio.voice(ev.sound), 450);
          else if (ev.sfx === 'alarm') [600, 1200].forEach(ms => setTimeout(() => audio.sfx('alarm'), ms));
          break;
        }
        case 'power': {
          const kd = e.kind;
          audio.sfx(kd === 'moon' ? 'jet' : kd === 'fud' ? 'thunder' : 'power');
          world.burst(e.x, e.y, kd === 'moon' ? '#a78bfa' : kd === 'shield' ? '#5ee7ff' : kd === 'fud' ? '#64748b' : '#fbbf24', 16, 4, 4);
          if (kd === 'fud') world.shake(0.3);
          hud.toast(kd === 'moon' ? '100x TO THE MOON! 🚀 5s' : kd === 'shield' ? 'STOP-LOSS SET 🛡️ blocks one hit' : kd === 'fud' ? 'FUD! SLOWED FOR 3s 😱' : 'AIRDROP MAGNET 🧲 8s', 1.6);
          break;
        }
        case 'block': audio.sfx('block'); world.burst(e.x, e.y + 0.9, '#5ee7ff', 18, 5, 4); hud.toast('STOP-LOSS SAVED YOU!', 1.2); break;
        case 'jetend': audio.sfx('jetend'); break;
        case 'lastchance':
          audio.sfx('lastchance'); audio.startMusic('danger'); world.setDanger(true); world.shake(1);
          hud.toast('LIQUIDATION ZONE! 1 LIFE · GRAB THE ♥', 2.8); hud.say('Down in the volume? I can wait.', 2.5);
          setTimeout(() => { if (sim.p.lane === 'vol' && sim.state === 'play') { hud.showZoneEvent(); audio.sfx('alarm'); } }, 1800);
          break;
        case 'rescued':
          audio.sfx('rescued'); audio.startMusic('run'); world.setDanger(false); world.burst(e.x, e.y + 1, '#ff2d55', 24, 6, 6);
          hud.toast('MARGIN TOPPED UP! BACK WITH 1 ♥', 2);
          break;
        case 'close':
          audio.sfx('close');
          if (!voicedTds) { voicedTds = true; audio.voice(VOICE.tds); hud.say('“…at the rate of 1 per cent.”', 4.5); }
          break;
      }
    }
    sim.events.length = 0;
  }

  function frame(now: number) {
    const dt = Math.min(AUTO ? 0.25 : 0.05, (now - last) / 1000); last = now;
    if (mode === 'count') {
      countT -= dt;
      const n = Math.ceil(countT / 0.8);
      const txt = countT > 0 ? String(n) : '';
      if ($('count').textContent !== txt) { if (txt) audio.sfx('tick'); hud.count(txt); }
      if (countT <= 0) { mode = 'play'; audio.sfx('go'); hud.toast('GO!', 0.8); setTimeout(() => { audio.voice(VOICE.thirty); hud.say('“…taxed at the rate of 30 per cent!”', 4.8); }, 600); }
    }
    if (mode === 'play') {
      acc += dt;
      const inp = AUTO ? bot(lv, sim) : read();
      while (acc >= C.DT && sim.state === 'play') { step(sim, AUTO ? bot(lv, sim) : inp); acc -= C.DT; events(); }
      if (sim.state !== 'play') end(sim.state);
      if (sim.state === 'play' && sim.p.lane === 'vol' && (popT -= dt) <= 0) {   // liquidations popping out of the pool
        popT = 0.5 + Math.random() * 0.5;
        const px = sim.p.x + 2 + Math.random() * 12, v = lv.vol[cellOf(px, lv.n)], sp = world.toScreen(px, v.bot + 0.3, 0);
        const w0 = POPS[Math.floor(Math.random() * POPS.length)];
        if (sp.on) hud.popup(w0, sp.x, sp.y, w0.startsWith('SHORT') ? '#4ade80' : '#ff6b6b');
      }
      if (sim.state === 'play' && sim.p.lane === 'vol' && !seen.has('flare') && lv.vol.some(q => q.pit && q.cx > sim.p.x && q.cx - sim.p.x < 9)) {
        seen.add('flare'); hud.toast('LAVA FLARES: WAIT, THEN JUMP THE PIT', 2.2);
      }
      if (sim.state === 'play' && sim.p.lane === 'top' && (tipT -= dt) <= 0) {
        tipT = 0.25;
        const x = sim.p.x, near = (v: number) => v > x && v - x < 11;
        const tips: [string, boolean, string][] = [
          ['spike', lv.spikes.some(sp => near(sp.x)), '⚠ STOP-HUNT WICK: JUMP OVER IT ▲'],
          ['laser', lv.lasers.some(l => near(l.x0)), 'RESISTANCE LASER: HOLD ▼ TO SLIDE'],
          ['glass', lv.plats.some(q => q.doji && near(q.cx)), "GLASS DOJI: DON'T STOP ON IT"],
          ['fud', lv.powers.some(w => w.kind === 'fud' && near(w.x)), 'FUD CLOUD AHEAD: JUMP OVER IT ▲'],
          ['power', lv.powers.some(w => w.kind !== 'fud' && near(w.x)), 'POWER-UP AHEAD: GRAB IT!'],
        ];
        const tip = tips.find(([id, on]) => on && !seen.has(id));
        if (tip) { seen.add(tip[0]); hud.toast(tip[2], 2.2); }
      }
      if (sim.state === 'play' && (sayCd -= dt) <= 0) { sayCd = 7 + Math.random() * 5; lineN = (lineN + 1) % LINES.length; hud.say(LINES[lineN], 2.6); }
    }
    const prog = Math.min(1, sim.p.x / (lv.n * C.CELL));
    if ((skyT -= dt) <= 0) { skyT = 0.25; document.body.style.background = sky(prog); world.setTime(prog); }
    const pan = mode === 'count' ? Math.min(1, Math.max(0, 1 - (countT - 0.3) / 2.1)) : 1;
    world.update(sim, mode === 'pause' ? 0 : dt, pan < 1 ? sim.ch.x + (sim.p.x + 3.2 - sim.ch.x) * pan * pan * (3 - 2 * pan) : undefined);
    hud.update(sim); hud.tick(dt);
    if (mode === 'play' && margin(sim) > 0.9 && sim.ch.started) hud.say('', 0);
    requestAnimationFrame(frame);
  }
  show('title');
  requestAnimationFrame(frame);
}

function sky(p: number) {
  let i = 0; while (i < SKY.length - 2 && p > SKY[i + 1][0]) i++;
  const [a, b] = [SKY[i], SKY[i + 1]], t = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
  const mix = (x: string, y: string) => { const u = parseInt(x.slice(1), 16), v = parseInt(y.slice(1), 16);
    return '#' + [16, 8, 0].map(s => Math.round(((u >> s) & 255) * (1 - t) + ((v >> s) & 255) * t).toString(16).padStart(2, '0')).join(''); };
  return `linear-gradient(${mix(a[1], b[1])}, ${mix(a[2], b[2])})`;
}

boot().catch(err => { $('loadmsg').textContent = 'Could not load the chart. Please reload.'; console.error(err); });

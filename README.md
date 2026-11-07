# Candle Run

A voxel platformer on the **real Bitcoin daily chart**. Run 200 daily candles, jump the wick spikes, slide under the
resistance lasers, take the boost pads on the big green days, cross the glass planks (dojis) fast, and outrun
**Nirmala Taxaraman**, who taxes every candle she passes 30%. One real news event per level shows up on the candle it moved.

Play: https://candle-run-8rz.pages.dev · part of [AI Survivor City](https://city.peakai.si)

## Controls
- Keyboard: ◀ ▶ move · ▲ / W / Space jump · ▼ / S slide (hold it under lasers) · P pause · M mute · Enter start · R retry
- Phones: the runner runs by itself; ▲ jump, ▼ slide, ◀ hold back

## How a chart becomes a level
- 1 candle = 1 day. The body is the platform; height is log price (a 4% rise is one easy jump).
- Upper wicks of about 2% or more become spikes; flat runs of three candles get a resistance laser at head height;
  a rise too big to jump gets a boost pad; a doji (body under 0.12%) is a glass plank that cracks if you stand still.
- The taxman speeds up on red candles (sell-offs) and slows down on green ones, and hurries when she falls far behind.
- `tools/check_level.ts` plays every level with a bot through the same physics and fails if it cannot be finished.

## Make or update a level
```
python tools/make_level.py BTC 2026-10      # the 200 daily candles ending 31 Oct 2026 + levels_src/btc-2026-10.event.json
node tools/check_level.ts                   # prove it can be finished, show the taxman margins
```
Levels are frozen per month and updated at each month end.

## Develop
```
npm install
npm run dev        # http://127.0.0.1:5190   (?bot=1 autopilot, ?seek=N start at candle N)
npm run build
python tools/deploy.py
```

Code: MIT. Fonts, voices and data: see CREDITS.md. Parody characters; not financial or tax advice.

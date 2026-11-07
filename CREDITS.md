# Credits

## Code and libraries
- Candle Run code: MIT, The Survivor Bot (see LICENSE).
- [three.js](https://threejs.org) 0.160: MIT.
- [ZzFX](https://github.com/KilledByAPixel/ZzFX) 1.4 by Frank Force: MIT (all sound effects are made in code).
- [ZzFXM](https://github.com/keithclark/ZzFXM) 2.0.3 by Keith Clark and Frank Force: MIT (the music is made in code); see vendor/ZzFXM_LICENSE.txt.

## Fonts
- Space Grotesk and Archivo Black: SIL Open Font License 1.1 (public/fonts/OFL-*.txt).

## Chart data
- Daily candles from the Binance public market data API (BTCUSDT, 1d). Levels are frozen per month and rebuilt at each month end
  with `tools/make_level.py`.

## Voices (short official clips, unedited)
- `public/audio/trump_clarity_act.mp3`: The White House official video "President Trump Delivers Remarks with Technology Leaders",
  19 Aug 2026 (https://www.youtube.com/watch?v=SDbFxr3HbHI). A US government work: public domain in the United States
  (whitehouse.gov/copyright). Used as parody; no endorsement of this game is implied.
- `public/audio/sitharaman_*.mp3`: PIB India, "Union Budget 2022-23: Live from Parliament", 1 Feb 2022
  (https://www.youtube.com/watch?v=2WgKQ_HhEWw). Reproduced accurately and with credit under PIB's copyright policy
  (pib.gov.in/content/102_2_Copyright-Policy.aspx). Her own words about the tax on virtual digital assets, in context.

- `public/audio/muskrat_spacex.mp3`: NOT a real person's voice. ELON MUSKRAT's line ("SpaceX is, uh... public! Eighteen thousand
  Bitcoin on board. Next stop: Mars!") is a stock text-to-speech voice (Kokoro v1.0, voice am_puck, Apache-2.0), pitched up a
  little for the rat. No voice cloning of anyone.

Full clip list with timestamps: levels_src/AUDIO_SOURCES.md.

## Characters and events
- "Nirmala Taxaraman", "Donald Trumpet" and "Elon Muskrat" are parody caricatures drawn in code; "0xHACKERMAN" and
  "REKT RANDY" are made-up characters. None of them endorses anything.
- Each level shows real events on the candles around them, each from named sources (Bitcoin Oct 2026: CoinDesk, Yahoo
  Finance and IPOScoop for SpaceX's 12 Jun listing; Reuters and CNBC for 19-20 Aug; Reuters, Bloomberg, CNBC and CoinDesk for the 29 Oct Binance hack; CoinGlass for the June 2026
  liquidations). Not financial or tax advice.

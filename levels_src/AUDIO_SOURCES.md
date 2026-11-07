# Candle Run research: sources, clips, licence notes (7 Nov 2026)

## Event (see event.json)
Chosen: 2026-08-19 UTC candle, Binance BTCUSDT 1d O 64,725.42 H 70,000.00 L 64,166.00 C 69,334.79 (+7.12%).
Candle data: Binance public klines API, fetched 2026-11-07 (also checked 17-28 Aug, 31 May-6 Jun, 14-22 Sep, 27-31 Oct).
Cause: Trump's remarks at a White House crypto event on Wed 19 Aug 2026 ("a fair version of the Clarity Act"). Multi-cause: Treasury doubled long-bond buybacks, yields fell, ~2.7B USD short squeeze (CNBC, Reuters). Do not present Trump as the sole cause.

Sources read in full:
- Reuters 2026-08-19, Trump calls for Congress to pass crypto bill at White House event: https://www.reuters.com/legal/government/trump-host-crypto-executives-sec-weighs-regulations-2026-08-19/ (search excerpt only, not scraped in full)
- Reuters 2026-08-20, Crypto shares climb after Treasury's doubled buybacks boost risk assets: https://www.reuters.com/legal/government/bitcoin-crypto-shares-climb-after-trump-pushes-clarity-act-2026-08-20/ (full)
- CNBC 2026-08-20, Bitcoin surges 12% in two days as Trump, crypto execs lead last ditch effort for Clarity Act: https://www.cnbc.com/2026/08/20/bitcoin-surges-as-trump-crypto-execs-lead-final-push-for-clarity-act.html (full)
- Investing.com (Reuters content) 2026-08-21, Bitcoin rockets nearly 23% for the week: https://www.investing.com/news/cryptocurrency-news/bitcoin-tests-75k-as-trump-spurs-us-regulatory-optimism-4870820 (full)
- Official video, The White House YouTube channel, 2026-08-19: https://www.youtube.com/watch?v=SDbFxr3HbHI

Alternatives (details in event.json): 2026-10-29 Binance hack (Reuters, Bloomberg, CNBC, CoinDesk, Bitcoin Magazine; only search excerpts read, plus our own facts.json); 2026-08-21 continuation; 2026-06-01 Strategy's first BTC sale (CNBC, Bloomberg; excerpts).
NOT verified: cause of 2026-06-02 (-6.5%) and 2026-06-05 (-4.4%) with two sources; 2026-09-21 cause only from snippets.

## Clips
All: mono, 44.1 kHz, 128 kbps mp3, 20 ms fade in / 40-50 ms fade out, ffmpeg loudnorm I=-16 LUFS TP=-1.5. Words checked by transcribing each final mp3 with faster-whisper base.en (matches the words below; the ASR mis-heard only the clipped last word of two clips, see notes). Video timestamps are approximate (+-0.5 s for Trump, +-1 s for Sitharaman) because yt-dlp's section download starts at the nearest packet and I aligned to the YouTube auto-captions.

### (a) Trump, official White House recording
Source: https://www.youtube.com/watch?v=SDbFxr3HbHI , "President Trump Delivers Remarks with Technology Leaders", channel "The White House" (https://www.youtube.com/channel/UCYxRlFDqcWM4y7FfpiAN3KQ), uploaded 2026-08-19 (the event day, Roosevelt Room). yt-dlp reports no Creative Commons licence (standard YouTube licence), so reuse rests on the US-government-work rule below.

| file | video time | exact words |
|---|---|---|
| trump_clarity_act.mp3 (4.6 s) | ~10:53.5 - 10:58.1 | "So, now we need Congress to take the next step by passing the CLARITY Act" |
| trump_clarity_act_fair_version.mp3 (6.2 s) | ~10:53.5 - 10:59.8 | "So, now we need Congress to take the next step by passing the CLARITY Act, a fair version of the CLARITY Act" (this is the line Reuters and CNBC quote) |
| trump_bitcoin_reserve.mp3 (3.4 s) | ~6:03.0 - 6:06.4 | "making Bitcoin a permanent asset of the United States Treasury" (preceded in the speech by "I established a United States Strategic Bitcoin Reserve"; ASR disagreed whether it is "a" or "the", so the clip starts after it) |

Terms: White House Copyright Policy, https://www.whitehouse.gov/copyright/ (fetched 7 Nov 2026): "Pursuant to federal law, government-produced materials appearing on this site are not copyright protected." Third-party content on the site is CC BY 3.0 US. Note: this page covers whitehouse.gov; the YouTube upload is a White House-produced recording of an official event, i.e. a US government work (17 U.S.C. 105), but I did not find a YouTube-specific statement. Not copyright is not the same as free of other rights: a voice clip in a satirical game still raises right-of-publicity / false-endorsement questions, so keep the caricature clearly parody and never imply Trump endorses the game or Bitcoin.

### (b) Nirmala Sitharaman, Union Budget 2022-23 speech, 1 Feb 2022
Source: https://www.youtube.com/watch?v=2WgKQ_HhEWw , "Union Budget 2022-23: Live from Parliament", channel "PIB India" (https://www.youtube.com/channel/UCGn6a5SI8SNlj7WylmPD6GQ, the Government of India's Press Information Bureau), uploaded 2022-02-01, 93 min. yt-dlp reports the standard YouTube licence.
Speech text in this part: "...I propose to provide that any income from transfer of any virtual digital asset shall be taxed at the rate of 30 per cent, 3-0 per cent. No deduction in respect of any expenditure or allowance shall be allowed while computing such income except cost of acquisition. Further, loss from transfer of virtual digital asset cannot be set off against any other income. Further, in order to capture the transaction details, I also propose to provide for TDS on payment made in relation to transfer of virtual digital asset at the rate of 1 per cent of such consideration above a monetary threshold." (captions + Whisper agree)

| file | video time | exact words |
|---|---|---|
| sitharaman_30_per_cent.mp3 (4.7 s) | ~1:14:36.6 - 1:14:41.3 | "shall be taxed at the rate of 30 per cent, three-zero per cent" (starts mid-sentence: "...transfer of any virtual digital asset" precedes it) |
| sitharaman_cannot_be_set_off.mp3 (4.0 s) | ~1:14:56.7 - 1:15:00.7 | "cannot be set off against any other income" (ASR mis-hears the last, clipped word; it is "income" per captions) |
| sitharaman_loss_cannot_be_set_off_full.mp3 (7.3 s, over the 6 s target) | ~1:14:53.5 - 1:15:00.7 | "loss from transfer of virtual digital asset cannot be set off against any other income" |
| sitharaman_tds_1_per_cent.mp3 (4.5 s) | ~1:15:12.1 - 1:15:16.6 | "to transfer of virtual digital asset at the rate of 1 per cent" (starts on the word "to" of "in relation to transfer"; ASR once heard "a" for "of") |

Terms: PIB Copyright Policy, https://www.pib.gov.in/content/102_2_Copyright-Policy.aspx : "Material featured on this website may be reproduced free of charge and there is no need for any prior approval... The permission to reproduce this material shall not extend to any third-party material... The material must be reproduced accurately and not used in a derogatory manner or in a misleading context. Wherever the material is being published or issued to others, the source must be prominently acknowledged." Also see PIB Terms and Conditions https://www.pib.gov.in/content/101_2_Terms-and-Conditions.aspx .
Risks: (1) the policy covers material on the PIB website; the YouTube upload is PIB's own channel but I found no separate YouTube terms, and the footage is a relay of the Parliament feed (Sansad TV / DD), whose own terms I did NOT look up. (2) "Not used in a derogatory manner or in a misleading context": a mocking "Nirmala Taxaraman" chaser using her real voice may breach that clause. Safer: keep clips accurate and unaltered, credit "Source: PIB India, Union Budget 2022-23, 1 Feb 2022", keep the joke on the tax (30% / no loss set-off / 1% TDS), not on the person. This is a legal-judgement call for the owner; I am not a lawyer.

## Not done / uncertain
- Official Sansad TV or DD News recordings of the exact lines were not downloaded (Sansad TV's 1 Feb 2022 uploads are TV-coverage blocks with no speech-only video found); PIB India's live relay was used.
- No two-source confirmation for 2 Jun and 5 Jun 2026 causes.
- Tools used: yt-dlp (pip, D: cache), ffmpeg, faster-whisper base.en (model downloaded to the research/work folder, deleted afterwards). Raw WAV downloads deleted; work/ keeps only the caption files and tr.py.

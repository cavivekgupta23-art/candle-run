CREATE TABLE IF NOT EXISTS counts (
  day TEXT NOT NULL,      -- IST date, YYYY-MM-DD
  ev  TEXT NOT NULL,      -- open: page opened | start: run started | at: run reached a candle | end: run ended
  how TEXT NOT NULL,      -- end only: won, taxed, hit, fall, pool, broke
  v   INTEGER NOT NULL,   -- start: this browser's run number (1 = new player, 0 = unknown, 20 = 20 or more) | at, end: candle | open: 0
  tag TEXT NOT NULL,      -- live | test (?count=test, our own checks)
  n   INTEGER NOT NULL,   -- how many
  PRIMARY KEY (day, ev, how, v, tag)
) WITHOUT ROWID

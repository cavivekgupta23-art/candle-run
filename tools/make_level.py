"""Build one level file: the 200 daily candles that end on the last day of a month, from Binance's public API (no key).

    python tools/make_level.py BTC 2026-10            -> public/levels/btc-2026-10.json
    python tools/make_level.py BTC 2026-10 --dry      prints the window, writes nothing

The level's real events come from levels_src/<id>.events.json (a list, hand-checked: date, headline, sources) and are
merged in when that file exists. Levels are frozen per month: the game shows the newest month's file and says when it updates.
"""
import calendar, datetime as dt, json, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
NAMES = {"BTC": "Bitcoin", "ETH": "Ethereum", "BNB": "BNB", "SOL": "Solana", "XRP": "XRP"}


def main(argv):
    if len(argv) < 2:
        raise SystemExit(__doc__)
    sym, month = argv[0].upper(), argv[1]
    y, m = map(int, month.split("-"))
    last = dt.date(y, m, calendar.monthrange(y, m)[1])
    end = int(dt.datetime(last.year, last.month, last.day, 23, 59, 59, tzinfo=dt.timezone.utc).timestamp() * 1000)
    r = requests.get("https://api.binance.com/api/v3/klines",
                     params={"symbol": sym + "USDT", "interval": "1d", "endTime": end, "limit": 200}, timeout=20)
    r.raise_for_status()
    k = [[int(a[0]), float(a[1]), float(a[2]), float(a[3]), float(a[4]), round(float(a[5]), 2)] for a in r.json()]
    day = lambda t: dt.datetime.fromtimestamp(t / 1000, dt.timezone.utc).date()
    assert len(k) == 200, f"only {len(k)} candles"
    assert day(k[-1][0]) == last, f"last candle {day(k[-1][0])} is not {last}"
    assert all((day(b[0]) - day(a[0])).days == 1 for a, b in zip(k, k[1:])), "a day is missing"
    nxt = last.replace(day=1) + dt.timedelta(days=32)
    lid = f"{sym.lower()}-{month}"
    out = {"id": lid, "coin": sym, "pair": f"{sym}/USDT", "name": NAMES.get(sym, sym), "source": f"Binance {sym}USDT daily",
           "from": str(day(k[0][0])), "to": str(last), "month": last.strftime("%b %Y"),
           "next_update": str(dt.date(nxt.year, nxt.month, calendar.monthrange(nxt.year, nxt.month)[1])),
           "made": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "candles": k, "event": None}
    ev = ROOT / "levels_src" / f"{lid}.events.json"
    out["events"] = []
    if ev.exists():
        for e in json.loads(ev.read_text(encoding="utf-8")):
            idx = next((i for i, a in enumerate(k) if str(day(a[0])) == e["date"]), None)
            assert idx is not None, f"event date {e['date']} is not in the window"
            at = lambda d: next(i for i, a in enumerate(k) if str(day(a[0])) == d)
            out["events"].append(dict(e, idx=idx, r0=at(e.get("from", e["date"])), r1=at(e.get("to", e["date"]))))
        out["event"] = out["events"][0] if out["events"] else None
    print(f"{lid}: {out['from']} -> {out['to']} ({len(k)} candles), events: {', '.join(e['date'] for e in out['events']) or 'none'}")
    if "--dry" not in argv:
        p = ROOT / "public" / "levels" / f"{lid}.json"
        p.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
        (ROOT / "public" / "levels" / "index.json").write_text(json.dumps(
            {"BTC": lid, "updated": out["made"], "next_update": out["next_update"]}, indent=1), encoding="utf-8")
        print("wrote", p.relative_to(ROOT))


if __name__ == "__main__":
    main(sys.argv[1:])

"""Candle Run's anonymous play counts (functions/api/run.js adds them, this reads them through the Cloudflare API).

    python tools/counts.py            the report: live plays per IST day, how far runs got, how they ended
    python tools/counts.py --test     the same for ?count=test rows (our own checks; never in the live numbers)
    python tools/counts.py --setup    once: the D1 database + table, bound to the Pages project as DB (then: python tools/deploy.py)

Players = browsers that started their first run, not people: a second device or cleared site data counts again. Only counts
exist here (no person, no IP, no id). Secrets come through deploy.py's loader and are never printed.
"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import deploy  # noqa: E402  (same folder: secrets loader, Cloudflare API helper, scrubber)

DB_NAME = "candle-run-counts"
SCHEMA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "counts.sql")


def db_id(token, account, scrub):
    st, js = deploy.api("GET", f"/accounts/{account}/d1/database?name={DB_NAME}", token)
    if st != 200:
        sys.exit(f"listing D1 failed (HTTP {st}): {scrub(str(js.get('errors')))}")
    found = [x for x in js.get("result") or [] if x.get("name") == DB_NAME]
    return found[0]["uuid"] if found else None


def query(token, account, scrub, db, sql):
    st, js = deploy.api("POST", f"/accounts/{account}/d1/database/{db}/query", token, {"sql": sql})
    if st != 200 or not js.get("success"):
        sys.exit(f"D1 query failed (HTTP {st}): {scrub(str(js.get('errors')))}")
    return js["result"][0]["results"]


def setup(token, account, scrub):
    db = db_id(token, account, scrub)
    if db:
        print(f"D1 database {DB_NAME} exists")
    else:
        st, js = deploy.api("POST", f"/accounts/{account}/d1/database", token, {"name": DB_NAME})
        if not js.get("success"):
            sys.exit(f"creating D1 {DB_NAME} failed (HTTP {st}): {scrub(str(js.get('errors')))}")
        db = js["result"]["uuid"]
        print(f"D1 database {DB_NAME} created")
    query(token, account, scrub, db, open(SCHEMA, encoding="utf-8").read())
    print("table counts ready")
    path = f"/accounts/{account}/pages/projects/{deploy.PROJECT}"
    st, js = deploy.api("GET", path, token)
    if st != 200:
        sys.exit(f"reading the Pages project failed (HTTP {st}): {scrub(str(js.get('errors')))}")
    configs = js["result"].get("deployment_configs") or {}
    body = {"deployment_configs": {}}
    for env in ("production", "preview"):
        dbs = dict((configs.get(env) or {}).get("d1_databases") or {})
        dbs["DB"] = {"id": db}
        body["deployment_configs"][env] = {"d1_databases": dbs}
    st, js = deploy.api("PATCH", path, token, body)
    if not js.get("success"):
        sys.exit(f"binding D1 to the Pages project failed (HTTP {st}): {scrub(str(js.get('errors')))}")
    print("bound to the Pages project as DB (production + preview); redeploy so the function sees it: python tools/deploy.py")


def report(token, account, scrub, tag):
    db = db_id(token, account, scrub)
    if not db:
        sys.exit(f"no D1 database {DB_NAME}: run python tools/counts.py --setup")
    rows = query(token, account, scrub, db, f"SELECT day, ev, how, v, n FROM counts WHERE tag = '{tag}' ORDER BY day")
    days = sorted({r["day"] for r in rows})
    total = lambda f: sum(r["n"] for r in rows if f(r))
    print(f"Candle Run play counts ({tag}, IST days). Players = browsers on their first run.")
    print(f"{'day':<12}{'opened':>8}{'players':>9}{'runs':>7}{'ended':>7}{'won':>6}")
    for d in days + ["all"]:
        on = (lambda r: True) if d == "all" else (lambda r, d=d: r["day"] == d)
        print(f"{d:<12}{total(lambda r: on(r) and r['ev'] == 'open'):>8}{total(lambda r: on(r) and r['ev'] == 'start' and r['v'] == 1):>9}"
              f"{total(lambda r: on(r) and r['ev'] == 'start'):>7}{total(lambda r: on(r) and r['ev'] == 'end'):>7}"
              f"{total(lambda r: on(r) and r['how'] == 'won'):>6}")
    unknown = total(lambda r: r["ev"] == "start" and r["v"] == 0)
    if unknown:
        print(f"runs from browsers that block storage (may be new players, not in 'players'): {unknown}")
    marks = sorted({r["v"] for r in rows if r["ev"] == "at"})
    print("runs that reached candle:", " · ".join(f"{m}: {total(lambda r: r['ev'] == 'at' and r['v'] == m)}" for m in marks) or "none yet")
    hows = sorted({r["how"] for r in rows if r["ev"] == "end"})
    print("how runs ended:", " · ".join(f"{h}: {total(lambda r: r['how'] == h)}" for h in hows) or "none yet")
    print("runs with no ending (closed, quit to the menu or still playing):", total(lambda r: r["ev"] == "start") - total(lambda r: r["ev"] == "end"))
    ends = {}
    for r in rows:
        if r["ev"] == "end" and r["how"] != "won":
            ends[r["v"]] = ends.get(r["v"], 0) + r["n"]
    top = sorted(ends.items(), key=lambda kv: (-kv[1], kv[0]))[:8]
    print("candles where most runs died:", " · ".join(f"{c}: {n}" for c, n in top) or "none yet")
    today = query(token, account, scrub, db, "SELECT COALESCE(SUM(n), 0) AS n FROM counts WHERE day = date('now', '+330 minutes')")[0]["n"]
    print(f"counter requests today: {today} of the 100,000 a day the free plan allows, shared with the City" + ("  WARNING: over half used" if today > 50000 else ""))


def main():
    token, account, secret_vals = deploy.secrets()
    scrub = deploy.scrub_fn([token, account] + secret_vals)
    if "--setup" in sys.argv:
        setup(token, account, scrub)
    else:
        report(token, account, scrub, "test" if "--test" in sys.argv else "live")


if __name__ == "__main__":
    main()

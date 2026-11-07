"""Deploy Candle Run to Cloudflare Pages (project "candle-run"; its address, the project's subdomain, is printed at the end).

    python tools/deploy.py              build (npm run build), check the level, create the project if missing, deploy dist/
    python tools/deploy.py --no-build   deploy the dist/ that is already there

Secrets work exactly as in the City's tools/deploy.py: CLOUDFLARE_ACCOUNT_ID and CITY_CF_API_TOKEN are read only with the
Survivor Bot's own loader (engine.util.load_env), never printed, logged or written; the token goes only into the wrangler
child's environment and the API header, every output line is scrubbed, and dist/ is scanned for secret values before upload.
Outside the bot checkout set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment instead.
Wrangler is the City's pinned copy (../city/node_modules/wrangler); its config, logs and temp files stay in .tmp/ (on D:).
"""
import importlib.util, json, os, shutil, subprocess, sys, urllib.error, urllib.request

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT, BRANCH, API = "candle-run", "main", "https://api.cloudflare.com/client/v4"
SECRET_FILE = "." + "env"
TMP = os.path.join(GAME, ".tmp")


def bot_root():
    d = GAME
    while True:
        if os.path.isfile(os.path.join(d, "engine", "util.py")) and os.path.isfile(os.path.join(d, SECRET_FILE)):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def secrets():
    root = bot_root()
    if not root:
        t, a = os.environ.get("CLOUDFLARE_API_TOKEN", ""), os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        if not (t and a):
            sys.exit("no bot checkout found and CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID are not set")
        return t, a, [t]
    spec = importlib.util.spec_from_file_location("survivor_engine_util", os.path.join(root, "engine", "util.py"))
    util = importlib.util.module_from_spec(spec); spec.loader.exec_module(util)
    before = dict(os.environ)
    try:
        vals = {}
        vals.update(util.load_env(os.path.join(root, SECRET_FILE)))
        vals.update(util.load_env(os.path.join(root, "social", SECRET_FILE)))
    finally:
        os.environ.clear(); os.environ.update(before)
    t, a = vals.get("CITY_CF_API_TOKEN", ""), vals.get("CLOUDFLARE_ACCOUNT_ID", "")
    if not (t and a):
        sys.exit("CITY_CF_API_TOKEN / CLOUDFLARE_ACCOUNT_ID missing in the bot's secrets files")
    secret_vals = [v.strip() for k, v in vals.items() if v and len(v.strip()) >= 12 and any(w in k.upper() for w in ("TOKEN", "KEY", "SECRET", "PASS"))]
    return t, a, secret_vals


def scrub_fn(vals):
    def s(text):
        for v in vals:
            text = text.replace(v, "<redacted>")
        return text
    return s


def clean_env():
    env = {k: v for k, v in os.environ.items() if not k.upper().startswith(("CLOUDFLARE_", "CF_"))}
    for sub in ("tmp", "wrangler-config", "wrangler-logs"):
        os.makedirs(os.path.join(TMP, sub), exist_ok=True)
    env.update({"TEMP": os.path.join(TMP, "tmp"), "TMP": os.path.join(TMP, "tmp"), "XDG_CONFIG_HOME": os.path.join(TMP, "wrangler-config"),
                "WRANGLER_LOG_PATH": os.path.join(TMP, "wrangler-logs"), "WRANGLER_LOG_SANITIZE": "true", "WRANGLER_SEND_METRICS": "false",
                "NO_COLOR": "1", "FORCE_COLOR": "0"})
    return env


def run(cmd, env, scrub, label):
    print(f"\n$ {label}", flush=True)
    p = subprocess.Popen(cmd, cwd=GAME, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace")
    out = []
    for line in p.stdout:
        line = scrub(line.rstrip("\n")); out.append(line); print(line, flush=True)
    p.wait()
    return p.returncode, "\n".join(out)


def api(method, path, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": "Bearer " + token, "Content-Type": "application/json", "User-Agent": "candle-run-deploy"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except ValueError:
            return e.code, {}
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return 0, {"errors": [{"message": f"network error: {e.__class__.__name__}"}]}


def main():
    token, account, secret_vals = secrets()
    scrub = scrub_fn([token, account] + secret_vals)
    base = clean_env()
    npm = shutil.which("npm") or sys.exit("npm not found")
    node = shutil.which("node") or sys.exit("node not found")
    if "--no-build" not in sys.argv:
        rc, _ = run([node, os.path.join("tools", "check_level.ts")], base, scrub, "node tools/check_level.ts")
        if rc:
            sys.exit("the level checker failed: nothing deployed")
        rc, _ = run([npm, "run", "build"], base, scrub, "npm run build")
        if rc:
            sys.exit("build failed: nothing deployed")
    hits = []
    for b, _, files in os.walk(os.path.join(GAME, "dist")):
        for f in files:
            data = open(os.path.join(b, f), "rb").read()
            if any(v.encode() in data for v in [token, account] + secret_vals):
                hits.append(os.path.relpath(os.path.join(b, f), GAME))
    if hits:
        sys.exit(f"STOP: a secret value is inside {', '.join(hits)}; nothing deployed")
    print(f"dist/ scanned for {len(secret_vals) + 2} secret value(s): clean")
    st, js = api("GET", f"/accounts/{account}/pages/projects/{PROJECT}", token)
    if st != 200:
        st, js = api("POST", f"/accounts/{account}/pages/projects", token,
                     {"name": PROJECT, "production_branch": BRANCH, "deployment_configs": {"production": {}, "preview": {}}})
        if st not in (200, 201):
            sys.exit(f"project create failed (HTTP {st}): {scrub(str(js.get('errors')))}")
        print(f"created Pages project {PROJECT}")
    wr = os.path.join(GAME, "..", "city", "node_modules", "wrangler", "bin", "wrangler.js")
    if not os.path.isfile(wr):
        sys.exit("wrangler not found (run npm install in ../city)")
    env = dict(base, CLOUDFLARE_API_TOKEN=token, CLOUDFLARE_ACCOUNT_ID=account)
    rc, out = run([node, wr, "pages", "deploy", "dist", "--project-name", PROJECT, "--branch", BRANCH, "--commit-dirty=true"], env, scrub,
                  f"wrangler pages deploy dist --project-name {PROJECT} --branch {BRANCH}")
    if rc:
        sys.exit(f"deploy failed (rc {rc})")
    st, js = api("GET", f"/accounts/{account}/pages/projects/{PROJECT}", token)
    sub = (js.get("result") or {}).get("subdomain") if st == 200 else None
    print(f"\nlive: https://{sub}" if sub else "\nlive: see the deployment URL above")


if __name__ == "__main__":
    main()

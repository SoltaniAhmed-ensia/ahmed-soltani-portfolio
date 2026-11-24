"""Ahmed Soltani portfolio — Flask backend. Run: python app.py  (http://localhost:3000)"""
import json, os, re, smtplib, sqlite3, threading, time
from email.message import EmailMessage
from pathlib import Path
import requests
from flask import Flask, Response, jsonify, request, send_from_directory, stream_with_context

ROOT = Path(__file__).parent
def _load_env():  # tiny .env loader, no dependency
    f = ROOT / ".env"
    if f.exists():
        for l in f.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", l)
            if m and m.group(1) not in os.environ: os.environ[m.group(1)] = m.group(2).strip("\"'")
_load_env()

import llm
from cv_data import P, public_profile
from rag import classify, detect_lang, expand, offline_answer, retrieve, system_prompt

app = Flask(__name__, static_folder=None)
PUB = ROOT / "public"; DB = ROOT / "data" / "messages.db"
num = lambda k, d: float(os.getenv(k) or d)

CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
@app.after_request
def headers(r):
    r.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin",
                      "Permissions-Policy": "camera=(), microphone=(self), geolocation=()", "Content-Security-Policy": CSP})
    if request.path.startswith("/api/"): r.headers["Cache-Control"] = "no-store"
    return r

# ---- helpers: rate limit + sanitising ----
_b, _lock = {}, threading.Lock()
def rate_ok(key, mx, window):
    now = time.time()
    with _lock:
        n, reset = _b.get(key, (0, now + window))
        if now > reset: n, reset = 0, now + window
        _b[key] = (n + 1, reset)
        if len(_b) > 5000: [_b.pop(k) for k in [k for k, v in _b.items() if now > v[1]]]
        return n + 1 <= mx, int(reset - now)
def ip(): return (request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr or "?")
def clean(s, mx, multiline=False):
    s = "" if s is None else str(s)
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]" if multiline else r"[\x00-\x1f\x7f]", " " if not multiline else "", s)
    return s.strip()[:mx]
def err(code, error, message="", **kw): return jsonify(error=error, message=message, **kw), code

# ---- API ----
@app.get("/api/health")
def health():
    pv = llm.provider()
    return jsonify(ok=True, ai=bool(pv), mode="llm" if pv else "offline", provider=pv["name"] if pv else None, model=pv["model"] if pv else None,
                   email=bool(os.getenv("SMTP_HOST") or os.getenv("RESEND_API_KEY")))

@app.get("/api/profile")
def profile(): return jsonify(public_profile())

def sse(o): return "data: " + json.dumps(o, ensure_ascii=False) + "\n\n"

@app.post("/api/chat")
def chat():
    ok, wait = rate_ok("chat:" + ip(), num("CHAT_RATE_MAX", 30), num("CHAT_RATE_WINDOW_S", 600))
    if not ok: return err(429, "rate_limited", "Too many messages. Please wait a few minutes.")
    body = request.get_json(silent=True) or {}
    msgs = [{"role": "assistant" if (m or {}).get("role") == "assistant" else "user", "content": clean((m or {}).get("content"), 2000, True)}
            for m in (body.get("messages") if isinstance(body.get("messages"), list) else [])[-10:]]
    msgs = [m for m in msgs if m["content"]]
    if not msgs or msgs[-1]["role"] != "user": return err(400, "empty_message", "Please type a message.")
    last = msgs[-1]["content"]; prev = next((m for m in reversed(msgs[:-1]) if m["role"] == "user"), None)
    lang = detect_lang(last, body.get("lang")); intent = classify(expand(last), classify(expand(prev["content"])) if prev else None)
    pv = llm.provider(); embed, em = llm.embedder(pv)
    q = expand((prev["content"] + " " if prev and len(last.split()) <= 8 else "") + last)
    hits = [] if intent == "general" else retrieve(q, embed, em)
    sources = sorted({h["chunk"]["section"] for h in hits if h["score"] > 0})

    def gen():
        yield sse({"type": "meta", "intent": intent, "sources": sources, "mode": "llm" if pv else "offline", "lang": lang})
        if not pv:  # offline: grounded answer composed from the CV, streamed word by word
            text, secs = offline_answer(last, intent, lang)
            yield sse({"type": "meta", "intent": intent, "sources": secs, "mode": "offline"})
            for w in re.findall(r"\S+\s*", text):
                yield sse({"type": "delta", "text": w}); time.sleep(0.018)
            yield sse({"type": "done"}); return
        try:
            for t in llm.stream_chat(pv, [{"role": "system", "content": system_prompt(intent, hits, lang)}] + msgs): yield sse({"type": "delta", "text": t})
            yield sse({"type": "done"})
        except Exception as e:
            s = getattr(e, "status", 0); app.logger.error("[chat] %s", e)
            yield sse({"type": "error", "message": "The AI provider rejected the API key. Check LLM_API_KEY." if s in (401, 403) else
                       "The AI provider is rate limiting requests. Try again shortly." if s == 429 else "The AI service is temporarily unavailable."})
    return Response(stream_with_context(gen()), mimetype="text/event-stream", headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"})

# ---- contact: always saved to SQLite; also emailed when SMTP or Resend is configured ----
def _db():
    DB.parent.mkdir(exist_ok=True); c = sqlite3.connect(DB)
    c.execute("CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, ts TEXT, name TEXT, email TEXT, subject TEXT, message TEXT, emailed INTEGER DEFAULT 0)")
    return c
def store(d, emailed):
    with _db() as c: c.execute("INSERT INTO messages(ts,name,email,subject,message,emailed) VALUES(datetime('now'),?,?,?,?,?)", (d["name"], d["email"], d["subject"], d["message"], int(emailed)))
def send_email(d):
    to = os.getenv("CONTACT_TO") or P["email"]; body = f"From: {d['name']} <{d['email']}>\n\n{d['message']}"; subj = "[Portfolio] " + d["subject"]
    if os.getenv("SMTP_HOST"):
        m = EmailMessage(); m["Subject"] = subj; m["To"] = to; m["Reply-To"] = d["email"]
        m["From"] = os.getenv("CONTACT_FROM") or os.getenv("SMTP_USER") or to; m.set_content(body)
        port = int(os.getenv("SMTP_PORT") or 587)
        cls = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
        with cls(os.getenv("SMTP_HOST"), port, timeout=15) as s:
            if cls is smtplib.SMTP: s.starttls()
            if os.getenv("SMTP_USER"): s.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS", ""))
            s.send_message(m)
        return True
    if os.getenv("RESEND_API_KEY") and os.getenv("CONTACT_FROM"):
        r = requests.post("https://api.resend.com/emails", timeout=15, headers={"authorization": "Bearer " + os.environ["RESEND_API_KEY"]},
                          json={"from": os.environ["CONTACT_FROM"], "to": [to], "reply_to": d["email"], "subject": subj, "text": body})
        r.raise_for_status(); return True
    return False

@app.post("/api/contact")
def contact():
    ok, _ = rate_ok("contact:" + ip(), num("CONTACT_RATE_MAX", 5), num("CONTACT_RATE_WINDOW_S", 3600))
    if not ok: return err(429, "rate_limited", "Too many messages. Please try again later.")
    b = request.get_json(silent=True) or {}
    if b.get("website"): return jsonify(ok=True, delivered="stored")  # honeypot
    d = {"name": clean(b.get("name"), 100), "email": clean(b.get("email"), 200), "subject": clean(b.get("subject"), 150), "message": clean(b.get("message"), 4000, True)}
    e = {}
    if len(d["name"]) < 2: e["name"] = "Please enter your name."
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", d["email"]): e["email"] = "Please enter a valid email."
    if len(d["subject"]) < 3: e["subject"] = "Please enter a subject."
    if len(d["message"]) < 10: e["message"] = "Message must be at least 10 characters."
    if isinstance(b.get("t"), (int, float)) and b["t"] < 2500: e["message"] = "That was fast — please try again."
    if e: return jsonify(error="validation", errors=e), 422
    try:
        emailed = send_email(d)
    except Exception as ex:
        app.logger.error("[contact] email failed: %s", ex); emailed = False
    try: store(d, emailed)
    except Exception as ex:
        app.logger.error("[contact] store failed: %s", ex)
        if not emailed: return err(500, "save_failed", "Could not save your message. Please email directly: " + P["email"])
    return jsonify(ok=True, delivered="email" if emailed else "stored")

@app.route("/api/<path:_>", methods=["GET", "POST", "PUT", "DELETE"])
def api_404(_): return err(404, "not_found")

# ---- static site ----
@app.get("/")
def index(): return send_from_directory(PUB, "index.html", max_age=0)
@app.get("/<path:p>")
def static_files(p):
    f = PUB / p
    if not f.is_file(): return not_found(None)
    return send_from_directory(PUB, p, max_age=0 if p.endswith(".html") else 3600)
@app.errorhandler(404)
def not_found(_):
    return Response((PUB / "404.html").read_text(encoding="utf-8"), 404, mimetype="text/html")

if __name__ == "__main__":
    port = int(os.getenv("PORT") or 3000); pv = llm.provider()
    print(f"Portfolio on http://localhost:{port}  | chat: {('LLM ' + pv['name'] + ' / ' + pv['model']) if pv else 'offline mode (CV answers only)'}"
          f"  | contact: {'email + saved' if os.getenv('SMTP_HOST') or os.getenv('RESEND_API_KEY') else 'saved to data/messages.db'}")
    try:
        from waitress import serve; serve(app, host=os.getenv("HOST", "0.0.0.0"), port=port, threads=8)
    except ImportError:
        app.run(host="127.0.0.1", port=port, threaded=True)

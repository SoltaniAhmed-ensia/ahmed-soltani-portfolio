import json, os, sys, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.update(DISABLE_OLLAMA="1", CONTACT_RATE_MAX="50", CHAT_RATE_MAX="500")
for k in ("LLM_API_KEY", "OPENAI_API_KEY", "SMTP_HOST", "RESEND_API_KEY"): os.environ.pop(k, None)
import app as A
A.DB = __import__("pathlib").Path(tempfile.mkdtemp()) / "m.db"

def chat(c, text, hist=()):
    r = c.post("/api/chat", json={"messages": [*hist, {"role": "user", "content": text}]})
    ev = [json.loads(l[5:]) for l in r.get_data(as_text=True).split("\n\n") if l.startswith("data:")]
    return r, "".join(e.get("text", "") for e in ev if e["type"] == "delta"), ev

class T(unittest.TestCase):
    def setUp(self): self.c = A.app.test_client()
    def test_static_and_api(self):
        self.assertEqual(self.c.get("/").status_code, 200)
        for f in ("/app.js", "/fx.js", "/wow.css", "/styles.css", "/ahmed.jpg", "/Ahmed_Soltani_CV.pdf"): self.assertEqual(self.c.get(f).status_code, 200, f)
        self.assertEqual(self.c.get("/nope").status_code, 404); self.assertEqual(self.c.get("/../app.py").status_code, 404)
        h = self.c.get("/api/health").get_json(); self.assertEqual(h["mode"], "offline")
        self.assertIn("Content-Security-Policy", self.c.get("/").headers)
    def test_offline_chat(self):
        _, t, _ = chat(self.c, "What is Ahmed's academic background?"); self.assertIn("ENSIA", t)
        _, t, _ = chat(self.c, "What were his semester averages?"); self.assertIn("13.62", t)
        _, t, _ = chat(self.c, "Which of his projects use AI?"); self.assertIn("DiskPilot", t)
        _, t, _ = chat(self.c, "Has he won any awards?"); self.assertIn("isn’t documented", t)
        _, t, _ = chat(self.c, "How can I contact him?"); self.assertIn("ahmedsoltani772@gmail.com", t); self.assertNotIn("668", t)
        _, t, _ = chat(self.c, "Explain transformers"); self.assertIn("self-attention", t)
        self.assertEqual(self.c.post("/api/chat", json={"messages": []}).status_code, 400)
    def test_offline_general_knowledge(self):
        _, t, _ = chat(self.c, "What is RAG?"); self.assertIn("Retrieval", t)
        _, t, _ = chat(self.c, "Write a Python function for binary search"); self.assertIn("def binary_search", t)
        _, t, _ = chat(self.c, "hello"); self.assertIn("Ahmed AI", t)
        _, t, _ = chat(self.c, "Explain quantum gravity"); self.assertIn("offline mode", t)
    def test_multilingual(self):
        from rag import detect_lang, expand, retrieve
        self.assertEqual([detect_lang(s) for s in ("Quels sont ses projets ?", "ما هي مهارات أحمد؟", "What are his skills?")], ["fr", "ar", "en"])
        self.assertEqual(retrieve(expand("ما هي دراسة أحمد؟"))[0]["chunk"]["section"], "Education")
        self.assertEqual(retrieve(expand("Quelles sont ses compétences ?"))[0]["chunk"]["section"], "Skills")
        _, t, _ = chat(self.c, "Quelle est sa formation à l’ENSIA ?"); self.assertIn("ingénieur", t)
        _, t, _ = chat(self.c, "ما هي مشاريع أحمد؟"); self.assertIn("DiskPilot", t); self.assertIn("المشاريع", t)
        _, t, _ = chat(self.c, "A-t-il remporté des prix ?"); self.assertIn("pas documentée", t)
        _, t, _ = chat(self.c, "هل فاز أحمد بجوائز؟"); self.assertIn("غير موثّقة", t)
        _, t, _ = chat(self.c, "Comment le contacter ?"); self.assertIn("ahmedsoltani772@gmail.com", t)
    def test_contact(self):
        r = self.c.post("/api/contact", json={"name": "A", "email": "x", "subject": "", "message": "hi"}); self.assertEqual(r.status_code, 422)
        self.assertEqual(set(r.get_json()["errors"]), {"name", "email", "subject", "message"})
        ok = {"name": "Sara Ben", "email": "sara@example.com", "subject": "Internship offer\r\nBcc: evil@x.com", "message": "Hello Ahmed, we would like to talk.", "t": 9000}
        r = self.c.post("/api/contact", json=ok); self.assertEqual(r.status_code, 200); self.assertEqual(r.get_json()["delivered"], "stored")
        row = A._db().execute("select subject,message from messages").fetchone(); self.assertNotIn("\n", row[0]); self.assertIn("Hello Ahmed", row[1])
        self.assertEqual(self.c.post("/api/contact", json={**ok, "t": 100}).status_code, 422)
        self.assertEqual(self.c.post("/api/contact", json={**ok, "website": "bot"}).get_json()["delivered"], "stored")
    def test_llm_stream_and_errors(self):
        class H(BaseHTTPRequestHandler):
            def log_message(*a): pass
            def do_POST(s):
                n = int(s.headers["content-length"]); body = json.loads(s.rfile.read(n))
                if s.headers["authorization"] == "Bearer bad": s.send_response(401); s.end_headers(); return
                self.sys = body["messages"][0]["content"]; s.send_response(200); s.send_header("content-type", "text/event-stream"); s.end_headers()
                for t in ("Hel", "lo"): s.wfile.write(("data: " + json.dumps({"choices": [{"delta": {"content": t}}]}) + "\n\n").encode())
                s.wfile.write(b"data: [DONE]\n\n")
        srv = HTTPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
        os.environ.update(LLM_BASE_URL=f"http://127.0.0.1:{srv.server_port}", LLM_API_KEY="k")
        try:
            r, t, ev = chat(self.c, "What are Ahmed's skills?"); self.assertEqual(t, "Hello"); self.assertIn("VERIFIED CONTEXT", self.sys)
            self.assertEqual(self.c.get("/api/health").get_json()["mode"], "llm")
            os.environ["LLM_API_KEY"] = "bad"; _, _, ev = chat(self.c, "hi there ahmed"); self.assertEqual(ev[-1]["type"], "error"); self.assertIn("API key", ev[-1]["message"])
        finally: os.environ.pop("LLM_API_KEY"); srv.shutdown()
if __name__ == "__main__": unittest.main()

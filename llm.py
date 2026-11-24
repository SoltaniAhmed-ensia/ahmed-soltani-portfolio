"""LLM provider: any OpenAI-compatible API. Order: explicit LLM_API_KEY -> local Ollama (auto-detected) -> offline mode."""
import json, os, time, requests

def _env(k, d=""): return os.getenv(k, d).strip()
_cache = {"t": 0, "v": None}

def provider():
    """Returns dict(base,key,model,name) or None (offline). Ollama detection is cached for 15 s."""
    key = _env("LLM_API_KEY") or _env("OPENAI_API_KEY")
    if key:
        return {"base": _env("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/"), "key": key, "model": _env("OPENAI_MODEL", "gpt-4o-mini"), "name": "api"}
    if _env("DISABLE_OLLAMA") == "1": return None
    if time.time() - _cache["t"] < 15: return _cache["v"]
    host = _env("OLLAMA_URL", "http://localhost:11434").rstrip("/"); v = None
    try:
        models = [m["name"] for m in requests.get(host + "/api/tags", timeout=0.7).json().get("models", [])]
        pick = _env("OLLAMA_MODEL") or next((m for m in models if "embed" not in m), "")
        if pick: v = {"base": host + "/v1", "key": "ollama", "model": pick, "name": "ollama"}
    except Exception: pass
    _cache.update(t=time.time(), v=v); return v

def timeout(): return float(_env("LLM_TIMEOUT_S", "60"))

def stream_chat(prov, messages):
    r = requests.post(prov["base"] + "/chat/completions", headers={"authorization": "Bearer " + prov["key"]}, stream=True, timeout=timeout(),
                      json={"model": prov["model"], "messages": messages, "stream": True, "max_tokens": int(_env("MAX_OUTPUT_TOKENS", "900")), "temperature": 0.3})
    if r.status_code != 200:
        e = RuntimeError("provider_%s" % r.status_code); e.status = r.status_code; raise e
    for raw in r.iter_lines(decode_unicode=True):
        if not raw or not raw.startswith("data:"): continue
        d = raw[5:].strip()
        if d == "[DONE]": return
        try:
            t = json.loads(d)["choices"][0]["delta"].get("content")
            if t: yield t
        except Exception: pass

def embedder(prov):
    model = _env("EMBEDDING_MODEL")
    if not (prov and model): return None, ""
    def embed(texts):
        r = requests.post(prov["base"] + "/embeddings", headers={"authorization": "Bearer " + prov["key"]}, json={"model": model, "input": texts}, timeout=timeout())
        r.raise_for_status(); return [d["embedding"] for d in r.json()["data"]]
    return embed, model

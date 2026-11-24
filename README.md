# Ahmed Soltani — AI Portfolio (Python / Flask)

Portfolio site + **Ahmed AI** chatbot + working contact form. Backend: Python (Flask). Frontend: plain HTML/CSS/JS (no build step).

## Run (2 minutes)
```bash
cd ahmed-soltani-portfolio
python -m venv .venv
.venv\Scripts\activate          # Windows   |  Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Linux/macOS: cp .env.example .env
python app.py                   # http://localhost:3000
python -m unittest tests.test_app   # optional tests
```

## The chat — 3 modes, picked automatically
1. **Local Ollama (no key, free):** install Ollama, run `ollama pull llama3.1`. It is auto-detected at `localhost:11434` (set `OLLAMA_MODEL` to choose a model).
2. **Any OpenAI-compatible API:** set `LLM_API_KEY` (+ `LLM_BASE_URL`, `OPENAI_MODEL`) — OpenAI, Groq, OpenRouter...
3. **Offline mode (default if nothing above):** answers about the CV from `cv_data.py`, plus a built-in set of ~20 common AI/programming topics (RAG, transformers, K-Means, binary search, Big-O...). To answer **any** question (science, writing, translation, math...), use mode 1 or 2. Free option: a Groq key with `LLM_BASE_URL=https://api.groq.com/openai/v1` and `OPENAI_MODEL=llama-3.1-8b-instant`.

Personal questions are answered **only** from the CV (RAG: BM25, or embeddings if `EMBEDDING_MODEL` is set); missing facts get "not documented". General questions use the LLM freely. The API key never reaches the browser.

## The contact form
Every valid message is **saved** to `data/messages.db` (read with `python manage.py messages`). If email is configured it is **also emailed** to `CONTACT_TO`:
- Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<Google App Password>` (needs 2-step verification on)
- or Resend: `RESEND_API_KEY` + `CONTACT_FROM`

Protections: server-side validation, header-injection stripping, honeypot, time-to-fill check, rate limit.

## Your content
Edit **`cv_data.py`** only (site, RAG and API all read it). Set `GITHUB_URL` and `LINKEDIN_URL` in `.env` (the CV's links are placeholders, so the buttons stay hidden until set). Add project descriptions only when true.
Note: `public/Ahmed_Soltani_CV.pdf` contains your phone number and is publicly downloadable — replace it with a version without it if you prefer.

## Structure
```
app.py        Flask routes, SSE chat streaming, contact (SQLite + SMTP/Resend), security headers
cv_data.py    verified CV data      rag.py   retrieval, intent routing, prompt, offline answerer
llm.py        Ollama / OpenAI-compatible provider      manage.py  read saved messages
public/       index.html, styles.css, wow.css, app.js, fx.js, ahmed.jpg, CV pdf, 404
tests/        backend tests
```

## Deploy
Needs a host that runs Python (not static-only): Render / Railway / Fly.io — build `pip install -r requirements.txt`, start `waitress-serve --port=$PORT app:app` (Procfile included), add env vars in the dashboard. Use SMTP/Resend there; for a local LLM use an API key instead of Ollama. `data/messages.db` needs a persistent disk on hosts with ephemeral storage — email delivery avoids that problem.


## New in the pro layer
`public/pro.css` + `public/pro.js`: hero Ask-AI bar, project detail dialogs, voice input (EN/FR/AR), chat export, topic chips, 5 accent colors, mobile bottom dock, back-to-top, copy-email, `/` shortcut, Ctrl/Cmd+K palette.

## Languages (English / Français / العربية)
- `public/i18n.js` holds ONE dictionary (English text -> French, Arabic) and a small engine that translates static and dynamically built text, sets `lang`/`dir` (RTL for Arabic) and remembers the choice. To translate a new string, add one line to the dictionary; nothing is duplicated.
- Chat: the browser sends its language; the backend also detects the question's language (`rag.detect_lang`). Retrieval stays on the English CV, so FR/AR questions are expanded with English keywords first (`rag.ALIAS` / `expand`). With an LLM the reply is written in the user's language; offline mode answers the core CV questions in all three (`rag.LT`).
- Arabic font: the site uses IBM Plex Sans Arabic / Cairo if installed, else Segoe UI / Tahoma (the CSP blocks external fonts; to bundle a font, put the .woff2 in `public/` and add an @font-face in `luxe.css`).
- Unverified items (karate, certificates, awards) are intentionally absent until you add them to `cv_data.py` (`achievements`).

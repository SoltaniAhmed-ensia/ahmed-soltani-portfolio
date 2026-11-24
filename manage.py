"""Read contact messages saved by the form:  python manage.py messages"""
import sqlite3, sys
from pathlib import Path
db = Path(__file__).parent / "data" / "messages.db"
if len(sys.argv) < 2 or sys.argv[1] != "messages": sys.exit("usage: python manage.py messages")
if not db.exists(): sys.exit("No messages yet.")
for r in sqlite3.connect(db).execute("SELECT id,ts,name,email,subject,message,emailed FROM messages ORDER BY id DESC"):
    print(f"#{r[0]}  {r[1]} UTC  {'(emailed)' if r[6] else '(saved only)'}\nFrom: {r[2]} <{r[3]}>\nSubject: {r[4]}\n{r[5]}\n{'-'*60}")

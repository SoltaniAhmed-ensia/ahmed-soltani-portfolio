"""Single source of truth: everything here comes from Ahmed's CV. Add only true facts."""
import os

P = {
    "name": "Ahmed Soltani",
    "title": "Third-Year Artificial Intelligence Engineering Student",
    "school": "National Higher School of Artificial Intelligence (ENSIA)",
    "location": "Sidi Abdallah, Algiers, Algeria",
    "email": "ahmedsoltani772@gmail.com",
    # Set GITHUB_URL / LINKEDIN_URL in .env (the CV's links are still placeholders). Empty = hidden.
    "links": {"github": os.getenv("GITHUB_URL", ""), "linkedin": os.getenv("LINKEDIN_URL", "")},
    "summary": ("Third-year Artificial Intelligence engineering student at ENSIA, Algeria, with a strong interest in AI models, "
                "LLMs, data mining, and intelligent software systems. Builds academic and personal projects in optimization "
                "algorithms, software development, and data-driven applications, and is looking for an internship to apply "
                "and deepen these skills in a real-world environment."),
    "education": [
        {"institution": "National Higher School of Artificial Intelligence (ENSIA)", "program": "Engineering Degree in Artificial Intelligence",
         "period": "2024 – Present", "country": "Algeria",
         "details": ["Currently in third year.", "Semester averages: S1 13.62/20, S2 14.88/20, S3 12.12/20, S4 13.31/20."],
         "coursework": ["Artificial Intelligence", "Data Mining", "Algorithms", "Probability and Statistics", "Operating Systems",
                        "Computer Architecture", "Automata Theory", "Programming"]},
        {"institution": "Baccalaureate – Scientific Secondary Education", "program": "Scientific Secondary Education",
         "period": "2024", "country": "Algeria", "details": ["Final grade: 18.05/20."], "coursework": []},
    ],
    "projects": [
        {"name": "AI-Powered Car Buying Website", "category": "Web / AI", "tech": ["Web Development", "AI"]},
        {"name": "Ahmed CV AI – Personal AI Chatbot", "category": "AI", "tech": ["Python", "Flask", "Ollama", "LLMs"],
         # Facts below are taken from this project's own source code (app.py, rag.py, llm.py).
         "summary": "The assistant on this portfolio: it answers questions about Ahmed from his CV and explains general AI topics.",
         "problem": "Recruiters need quick, trustworthy answers about a candidate without reading a whole CV, and a chatbot must not invent facts.",
         "objective": "Answer personal questions only from verified CV data, and answer general AI and programming questions freely.",
         "architecture": "Flask backend, retrieval over CV chunks (BM25, or embeddings when configured), intent routing, then a local Ollama or OpenAI-compatible model, streamed to the browser over server-sent events. Offline mode answers from the CV without any model.",
         "features": ["Grounded answers with the portfolio sections used as sources", "Streaming responses and stop/regenerate controls", "Honest 'not documented' replies instead of guesses", "Voice input in English, French and Arabic"]},
        {"name": "DiskPilot – Local AI Disk Management Agent", "category": "AI", "tech": ["Python", "Flask", "Ollama", "Windows"]},
        {"name": "Smart Diet Planner – Intelligent Meal Planning System", "category": "AI", "tech": ["Python", "AI Optimization"]},
        {"name": "Quranic School Management System", "category": "Software", "tech": ["Software Engineering", "Databases"]},
        {"name": "Study Abroad Assistant", "category": "Mobile", "tech": ["Flutter", "Dart"]},
        {"name": "Algeria Forest Fire Risk Analysis", "category": "Data / ML", "tech": ["Data Mining", "Machine Learning"]},
    ],
    "projectsNote": ("Other smaller LLM-based projects are available on Ahmed’s GitHub. The CV does not document descriptions, "
                     "results or completion status for the projects above."),
    "skills": {
        "Programming Languages": ["Python", "JavaScript", "Java", "Dart", "C", "C++", "PHP"],
        "Artificial Intelligence": ["AI Agents", "Large Language Models (LLMs)", "Retrieval-Augmented Generation (RAG)"],
        "Mobile Development": ["Flutter", "Android"],
        "Web Development": ["HTML", "CSS", "JavaScript", "Flask", "Laravel"],
        "Machine Learning": ["Machine Learning", "Data Mining"],
        "Databases": ["Databases", "SQLite"],
        "Developer Tools": ["Git", "GitHub", "Jupyter Notebook", "VS Code", "CUDA"],
        "Operating Systems": ["Linux (Fedora)", "Windows"],
    },
    "achievements": [  # verified from the CV only. Add karate, certificates or awards here once you have proof.
        {"title": "Baccalaureate, Scientific Secondary Education", "detail": "Final grade 18.05/20", "year": "2024", "type": "Academic"},
        {"title": "Consistent results at ENSIA", "detail": "Semester averages: S1 13.62, S2 14.88, S3 12.12, S4 13.31 (out of 20)", "year": "2024 – Present", "type": "Academic"},
    ],
    "softSkills": ["Teamwork and leadership", "Communication", "Critical thinking and problem-solving", "Time management", "Adaptability", "Self-learning"],
    "languages": [["Arabic", "Native"], ["English", "Professional working proficiency"], ["French", "Intermediate"], ["Chinese", "Beginner"]],
}

PUBLIC_KEYS = ["name", "title", "school", "location", "email", "links", "summary", "education", "projects", "projectsNote", "skills", "softSkills", "languages", "achievements"]
def public_profile():
    return {k: P[k] for k in PUBLIC_KEYS}

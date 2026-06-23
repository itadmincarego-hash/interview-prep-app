# Interview Prep App — Web Version 🎤

Full-stack web app: React frontend + Flask/Whisper backend.
Record your interview answer in the browser → AI coaching feedback instantly.

---

## Architecture

```
browser (React + Vite)
    │  POST /api/transcribe  (audio blob)
    │  POST /api/feedback    (transcript + CV + JD)
    ▼
Flask server (Python)
    ├── Whisper  → speech-to-text (runs locally on server)
    └── OpenAI / Gemini / Perplexity → coaching feedback
```

---

## Local Development

### 1 — Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python app.py
# → running on http://localhost:5000
```

### 2 — Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
# → running on http://localhost:5173
```

The Vite proxy in `vite.config.js` forwards `/api/*` to Flask automatically.

---

## Deploy to Railway (free)

### Backend
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repo, set **Root Directory** to `backend`
3. Railway auto-detects the `Procfile` and deploys Flask
4. Copy the Railway URL e.g. `https://interview-prep-backend.up.railway.app`

### Frontend
1. New Service → GitHub → set Root Directory to `frontend`
2. Add environment variable: `VITE_API_URL=https://your-backend-url.up.railway.app`
3. Build command: `npm run build` | Output: `dist`

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | frontend `.env` | Points frontend to backend URL |
| `PORT` | backend | Auto-set by Railway/Render |

---

## Project Structure

```
interview-prep-app/
├── backend/
│   ├── app.py              ← Flask API (transcribe + feedback)
│   ├── requirements.txt
│   └── Procfile            ← gunicorn start command
├── frontend/
│   ├── src/
│   │   ├── App.jsx         ← Main layout + state
│   │   ├── components/
│   │   │   ├── SettingsPanel.jsx
│   │   │   ├── DocumentPanel.jsx
│   │   │   ├── RecorderPanel.jsx
│   │   │   └── FeedbackPanel.jsx
│   │   └── hooks/
│   │       └── useRecorder.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

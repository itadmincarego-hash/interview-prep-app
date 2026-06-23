# Interview Prep App 🎤

AI-powered desktop interview coach built with Python + Tkinter.

Record your spoken answers, get instant AI coaching feedback based on your CV and the job description.

---

## Features

- 🎙️ Voice recording via `sounddevice`
- 📝 Speech-to-text via OpenAI Whisper (runs locally)
- 🤖 AI coaching via OpenAI GPT, Google Gemini, or Perplexity
- 📄 Upload CV and Job Description (paste text, PDF, or DOCX)
- 📊 STAR method scoring out of 10
- 💾 Session save/load
- 🪟 Windows-ready — builds to `.exe` via PyInstaller

---

## Quick Start

```bat
git clone https://github.com/itadmincarego-hash/interview-prep-app.git
cd interview-prep-app
```

**Option A — One-click setup (recommended)**
```bat
installer\install.bat
```

**Option B — Manual**
```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python interview_prep_assistant_revised.py
```

---

## Daily Launch (after setup)

```bat
installer\launch.bat
```

---

## API Keys Needed

At least one of:
- [OpenAI](https://platform.openai.com/api-keys)
- [Google Gemini](https://aistudio.google.com/app/apikey)
- [Perplexity](https://www.perplexity.ai/settings/api)

Enter the key in the **Settings** panel inside the app.

---

## Build Windows .exe

```bat
venv\Scripts\activate
pip install pyinstaller
pyinstaller --clean --noconfirm --onedir --windowed --name InterviewPrep --hidden-import=whisper --hidden-import=google.genai interview_prep_assistant_revised.py
```

Output: `dist\InterviewPrep\InterviewPrep.exe`

---

## Project Structure

```
interview-prep-app/
├── interview_prep_assistant_revised.py   ← Main app
├── requirements.txt
├── installer/
│   ├── install.bat                        ← One-click first-time setup
│   ├── launch.bat                         ← Daily launcher
│   └── InterviewPrep.iss                  ← Inno Setup script
└── README.md
```

---

## Roadmap

- [ ] Inno Setup Windows installer (auto-installs Python + packages)
- [ ] Faster startup with onedir build
- [ ] Question bank per role type
- [ ] Export feedback to PDF report

---

Built by [CareGo](https://github.com/itadmincarego-hash)

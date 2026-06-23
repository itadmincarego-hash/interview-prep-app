# 🎤 Interview Prep Assistant

AI-powered interview practice — record your answer in the browser, get instant coaching feedback.
**No server. No installation. Just open the link.**

🔗 **Live app:** https://itadmincarego-hash.github.io/interview-prep-app/

---

## How it works

```
Your browser
  ├── 🎙️ Records your mic (browser MediaRecorder API)
  ├── 📤 Sends audio → OpenAI Whisper API (transcription)
  └── 💬 Sends transcript + CV + JD → Gemini / OpenAI / Perplexity (feedback)
```

Everything runs in the browser. Your API keys never touch GitHub or any third-party server.

---

## Setup (first time)

1. Open the live link above
2. Click ⚙️ Settings → paste your API key(s)
3. Paste your CV and Job Description
4. Hit **⏺ Start Recording** — answer out loud
5. Hit **⏹ Stop & Analyse** — get instant feedback

### API Keys needed

| Provider | Key for transcription | Key for feedback |
|---|---|---|
| **Google Gemini** | OpenAI key (Whisper) | Gemini key |
| **OpenAI** | OpenAI key (Whisper) | Same OpenAI key |
| **Perplexity** | OpenAI key (Whisper) | Perplexity key |

Get keys free:
- [Google AI Studio](https://aistudio.google.com/apikey) — Gemini key
- [OpenAI Platform](https://platform.openai.com/api-keys) — OpenAI key

---

## Microphone permissions

If the mic doesn't work:
1. Click the 🔒 **lock icon** in the browser address bar
2. Go to **Site settings → Microphone → Allow**
3. Refresh the page

---

## Local development

```bash
npm install
npm run dev
```

## Auto-deploy

Every push to `main` triggers GitHub Actions → builds React → deploys to GitHub Pages automatically.

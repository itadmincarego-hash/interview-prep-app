import io, logging, os, tempfile
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    import whisper as _whisper
    WHISPER_OK = True
except ImportError:
    WHISPER_OK = False

try:
    import openai as _openai
    OPENAI_OK = True
except ImportError:
    OPENAI_OK = False

try:
    from google import genai as _ggenai
    GENAI_OK = True
except ImportError:
    GENAI_OK = False

app = Flask(__name__)
CORS(app, origins="*")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
log = logging.getLogger(__name__)

_wmodel = None

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "whisper": WHISPER_OK, "openai": OPENAI_OK, "gemini": GENAI_OK})

@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    global _wmodel
    if not WHISPER_OK:
        return jsonify({"error": "openai-whisper not installed on server"}), 500
    audio_file = request.files.get("audio")
    if not audio_file:
        return jsonify({"error": "No audio file received"}), 400
    try:
        if _wmodel is None:
            log.info("Loading Whisper base model…")
            _wmodel = _whisper.load_model("base")
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name
        log.info("Transcribing %s …", tmp_path)
        result = _wmodel.transcribe(tmp_path, language="en")
        os.unlink(tmp_path)
        text = (result.get("text") or "").strip()
        if not text:
            return jsonify({"error": "No speech detected"}), 422
        return jsonify({"transcript": text})
    except Exception as e:
        log.exception("Transcription failed")
        return jsonify({"error": str(e)}), 500

@app.route("/api/feedback", methods=["POST"])
def feedback():
    body       = request.get_json(force=True) or {}
    transcript = body.get("transcript", "").strip()
    cv         = body.get("cv", "").strip()
    jd         = body.get("jd", "").strip()
    qtype      = body.get("qtype", "Behavioral")
    custom_q   = body.get("custom_q", "").strip()
    provider   = body.get("provider", "Google Gemini")
    model      = body.get("model", "gemini-2.5-flash")
    api_key    = body.get("api_key", "").strip()
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400
    if not api_key:
        return jsonify({"error": "API key is required"}), 400
    question_hint = (f'Custom question: "{custom_q}"' if custom_q else f"Question type: {qtype}")
    sys_p = "You are an expert interview coach specialising in helping candidates secure roles by giving structured, specific, actionable feedback. Always use the STAR framework."
    usr_p = (f"## Candidate CV\n{cv or '(not provided)'}\n\n## Job Description\n{jd or '(not provided)'}\n\n## {question_hint}\n\n## Candidate's spoken answer\n{transcript}\n\nPlease provide:\n1. **STAR Score** (x/10) with brief justification\n2. **Strengths** — what worked well (2-3 bullets)\n3. **Improvements** — what to add/change (2-3 bullets)\n4. **Suggested Reframe** — a concise improved version\n5. **JD Keywords** to weave in next time\n")
    try:
        reply = _call_ai(provider, model, api_key, sys_p, usr_p)
        return jsonify({"feedback": reply})
    except Exception as e:
        log.exception("AI feedback failed")
        return jsonify({"error": str(e)}), 500

def _call_ai(provider, model, api_key, sys_p, usr_p):
    if provider == "Google Gemini":
        if not GENAI_OK: raise RuntimeError("pip install google-genai")
        client = _ggenai.Client(api_key=api_key)
        resp   = client.models.generate_content(model=model, contents=f"{sys_p}\n\n{usr_p}")
        return resp.text
    if provider in ("OpenAI", "Perplexity"):
        if not OPENAI_OK: raise RuntimeError("pip install openai")
        base   = None if provider == "OpenAI" else "https://api.perplexity.ai"
        client = _openai.OpenAI(api_key=api_key, base_url=base)
        resp   = client.chat.completions.create(model=model, messages=[{"role":"system","content":sys_p},{"role":"user","content":usr_p}], max_tokens=1200)
        return resp.choices[0].message.content
    raise ValueError(f"Unknown provider: {provider}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

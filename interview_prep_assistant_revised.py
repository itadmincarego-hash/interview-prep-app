#!/usr/bin/env python3
"""
Interview Prep Assistant
========================
Single-file Tkinter app — voice record → Whisper STT → AI coaching feedback.
Supports OpenAI GPT, Google Gemini, Perplexity as AI providers.

Requirements:
    pip install numpy sounddevice openai openai-whisper google-genai pymupdf python-docx

Build .exe (fast startup with --onedir):
    pyinstaller --clean --noconfirm --onedir --windowed --name InterviewPrep \
        --hidden-import=whisper --hidden-import=google.genai \
        interview_prep_assistant_revised.py
"""
# ── std-lib ────────────────────────────────────────────────────────────────────
import io, json, logging, os, pathlib, queue, struct, tempfile, threading, time, wave
import tkinter as tk
from tkinter import filedialog, font as tkfont, messagebox, scrolledtext, ttk

# ── optional heavy deps (soft-imported so the GUI still opens if missing) ─────
try:
    import numpy as np
    NUMPY_OK = True
except ImportError:
    NUMPY_OK = False

try:
    import sounddevice as sd
    SD_OK = True
except ImportError:
    SD_OK = False

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

try:
    import fitz as _fitz          # pymupdf
    PDF_OK = True
except ImportError:
    PDF_OK = False

try:
    import docx as _docx          # python-docx
    DOCX_OK = True
except ImportError:
    DOCX_OK = False

# ── constants ─────────────────────────────────────────────────────────────────
APP_NAME    = "Interview Prep Assistant"
APP_VERSION = "1.1.0"
SAMPLERATE  = 16_000
CHANNELS    = 1
DTYPE       = "int16"
MAX_REC_SEC = 300       # 5 min hard cap

OUTPUT_DIR  = pathlib.Path.home() / "InterviewPrepOutput"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LOG_PATH    = OUTPUT_DIR / "debug_log.txt"
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(module)s:%(lineno)d | %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)
log.info("Debug log ready: %s", LOG_PATH)

PROVIDERS = {
    "Google Gemini": ("gemini",),
    "OpenAI":        ("openai",),
    "Perplexity":    ("perplexity",),
}
GEMINI_MODELS  = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro",
                   "gemini-2.0-flash", "gemini-2.0-flash-lite"]
OPENAI_MODELS  = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]
PERP_MODELS    = ["sonar", "sonar-pro"]

PALETTE = {
    "bg":      "#1a1a2e",
    "surface": "#16213e",
    "panel":   "#0f3460",
    "accent":  "#e94560",
    "accent2": "#4ecca3",
    "text":    "#eaeaea",
    "muted":   "#8892a4",
    "success": "#4ecca3",
    "error":   "#e94560",
    "warn":    "#f5a623",
    "border":  "#2a3a5c",
}

SESSION_FILE = OUTPUT_DIR / "last_session.json"

# ── helpers ───────────────────────────────────────────────────────────────────
def _read_file(path: str) -> str:
    """Return text content of a .txt / .pdf / .docx file."""
    p = pathlib.Path(path)
    ext = p.suffix.lower()
    if ext == ".pdf":
        if not PDF_OK:
            raise RuntimeError("pip install pymupdf")
        doc = _fitz.open(str(p))
        return "\n".join(page.get_text() for page in doc)
    if ext in (".docx", ".doc"):
        if not DOCX_OK:
            raise RuntimeError("pip install python-docx")
        return "\n".join(para.text for para in _docx.Document(str(p)).paragraphs)
    return p.read_text(encoding="utf-8", errors="replace")


def _dep_check() -> list[str]:
    missing = []
    if not NUMPY_OK:   missing.append("numpy")
    if not SD_OK:      missing.append("sounddevice")
    if not WHISPER_OK: missing.append("openai-whisper")
    if not OPENAI_OK:  missing.append("openai")
    if not GENAI_OK:   missing.append("google-genai")
    return missing


# ── Audio recorder ────────────────────────────────────────────────────────────
class Recorder:
    def __init__(self):
        self.frames: list[bytes] = []
        self._stream = None
        self._q: queue.Queue = queue.Queue()
        self.peak: float = 0.0

    def start(self):
        self.frames.clear()
        self.peak = 0.0
        if not SD_OK:
            raise RuntimeError("sounddevice not installed — pip install sounddevice")
        self._stream = sd.RawInputStream(
            samplerate=SAMPLERATE, channels=CHANNELS,
            dtype=DTYPE, blocksize=4096,
            callback=self._cb,
        )
        self._stream.start()

    def _cb(self, indata, frames, time_info, status):
        raw = bytes(indata)
        self._q.put(raw)
        if NUMPY_OK:
            arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32)
            self.peak = float(np.abs(arr).max()) / 32768.0

    def drain(self):
        while not self._q.empty():
            self.frames.append(self._q.get_nowait())

    def stop(self):
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self.drain()

    def get_audio_for_whisper(self):
        if not NUMPY_OK:
            raise RuntimeError("numpy not installed — pip install numpy")
        raw = b"".join(self.frames)
        if not raw:
            return None
        arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        return arr

    def save_wav(self, path: str):
        raw = b"".join(self.frames)
        with wave.open(path, "wb") as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLERATE)
            wf.writeframes(raw)


# ── Main Application ──────────────────────────────────────────────────────────
class InterviewApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"{APP_NAME} v{APP_VERSION}")
        self.root.geometry("1320x820")
        self.root.configure(bg=PALETTE["bg"])
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        self.rec      = Recorder()
        self.wmodel   = None          # lazy-loaded Whisper model
        self._rec_thr = None
        self._rec_on  = False
        self._start_t = 0.0
        self._meter_id = None

        self._build_fonts()
        self._build_ui()
        self._load_session()

        missing = _dep_check()
        if missing:
            self._w(f"⚠ Missing packages: pip install {' '.join(missing)}\n", "warn")

        log.info("App started — v%s", APP_VERSION)

    # ── font setup ────────────────────────────────────────────────────────────
    def _build_fonts(self):
        self.f_title  = tkfont.Font(family="Segoe UI", size=14, weight="bold")
        self.f_body   = tkfont.Font(family="Segoe UI", size=10)
        self.f_mono   = tkfont.Font(family="Consolas",  size=10)
        self.f_btn    = tkfont.Font(family="Segoe UI", size=10, weight="bold")
        self.f_small  = tkfont.Font(family="Segoe UI", size=8)

    # ── UI build ──────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ── top bar ────────────────────────────────────────────────────────
        top = tk.Frame(self.root, bg=PALETTE["panel"], height=52)
        top.pack(fill="x", side="top")
        tk.Label(top, text=f"🎤  {APP_NAME}", font=self.f_title,
                 bg=PALETTE["panel"], fg=PALETTE["accent2"]).pack(side="left", padx=16, pady=10)
        tk.Label(top, text=f"v{APP_VERSION}", font=self.f_small,
                 bg=PALETTE["panel"], fg=PALETTE["muted"]).pack(side="left", pady=14)

        # ── main panes ────────────────────────────────────────────────────
        pane = tk.PanedWindow(self.root, orient="horizontal",
                              bg=PALETTE["bg"], sashwidth=4, sashrelief="flat")
        pane.pack(fill="both", expand=True, padx=8, pady=8)

        left  = tk.Frame(pane, bg=PALETTE["bg"])
        right = tk.Frame(pane, bg=PALETTE["bg"])
        pane.add(left,  minsize=380, width=420)
        pane.add(right, minsize=600)

        self._build_left(left)
        self._build_right(right)

    # ── LEFT PANEL ────────────────────────────────────────────────────────────
    def _build_left(self, parent):
        # Settings card
        self._card(parent, "⚙  Settings").pack(fill="x", pady=(0, 6))
        sf = self._last_card_inner

        # Provider row
        r0 = tk.Frame(sf, bg=PALETTE["surface"])
        r0.pack(fill="x", pady=2)
        tk.Label(r0, text="Provider:", bg=PALETTE["surface"],
                 fg=PALETTE["muted"], font=self.f_small, width=10, anchor="w").pack(side="left")
        self.v_provider = tk.StringVar(value="Google Gemini")
        cb_prov = ttk.Combobox(r0, textvariable=self.v_provider,
                               values=list(PROVIDERS), width=18, state="readonly")
        cb_prov.pack(side="left", padx=4)
        cb_prov.bind("<<ComboboxSelected>>", self._on_provider_change)

        # Model row
        r1 = tk.Frame(sf, bg=PALETTE["surface"])
        r1.pack(fill="x", pady=2)
        tk.Label(r1, text="Model:", bg=PALETTE["surface"],
                 fg=PALETTE["muted"], font=self.f_small, width=10, anchor="w").pack(side="left")
        self.v_model = tk.StringVar(value=GEMINI_MODELS[0])
        self.mcb = ttk.Combobox(r1, textvariable=self.v_model,
                                values=GEMINI_MODELS, width=26)
        self.mcb.pack(side="left", padx=4)

        # API Key row
        r2 = tk.Frame(sf, bg=PALETTE["surface"])
        r2.pack(fill="x", pady=2)
        tk.Label(r2, text="API Key:", bg=PALETTE["surface"],
                 fg=PALETTE["muted"], font=self.f_small, width=10, anchor="w").pack(side="left")
        self.v_key = tk.StringVar()
        tk.Entry(r2, textvariable=self.v_key, show="•", font=self.f_small,
                 bg=PALETTE["bg"], fg=PALETTE["text"],
                 insertbackground=PALETTE["text"], relief="flat",
                 width=32).pack(side="left", padx=4)

        # ── CV card ───────────────────────────────────────────────────────
        self._card(parent, "📄  Your CV / Resume").pack(fill="both", expand=True, pady=(0, 6))
        cf = self._last_card_inner
        btn_row = tk.Frame(cf, bg=PALETTE["surface"])
        btn_row.pack(fill="x", pady=(0, 4))
        self._btn(btn_row, "📂 Load File", self._load_cv).pack(side="left")
        self._btn(btn_row, "🗑 Clear", lambda: self._clear_ta(self.ta_cv)).pack(side="left", padx=6)
        self.ta_cv = self._textarea(cf)

        # ── JD card ───────────────────────────────────────────────────────
        self._card(parent, "💼  Job Description").pack(fill="both", expand=True, pady=(0, 6))
        jf = self._last_card_inner
        btn_row2 = tk.Frame(jf, bg=PALETTE["surface"])
        btn_row2.pack(fill="x", pady=(0, 4))
        self._btn(btn_row2, "📂 Load File", self._load_jd).pack(side="left")
        self._btn(btn_row2, "🗑 Clear", lambda: self._clear_ta(self.ta_jd)).pack(side="left", padx=6)
        self.ta_jd = self._textarea(jf)

    # ── RIGHT PANEL ───────────────────────────────────────────────────────────
    def _build_right(self, parent):
        # ── Question type card ────────────────────────────────────────────
        self._card(parent, "🎯  Interview Question").pack(fill="x", pady=(0, 6))
        qf = self._last_card_inner

        qtype_row = tk.Frame(qf, bg=PALETTE["surface"])
        qtype_row.pack(fill="x", pady=2)
        tk.Label(qtype_row, text="Type:", bg=PALETTE["surface"],
                 fg=PALETTE["muted"], font=self.f_small).pack(side="left")
        self.v_qtype = tk.StringVar(value="Behavioral")
        for t in ("Behavioral", "Technical", "Situational", "Motivation"):
            tk.Radiobutton(qtype_row, text=t, variable=self.v_qtype, value=t,
                           bg=PALETTE["surface"], fg=PALETTE["text"],
                           selectcolor=PALETTE["panel"], activebackground=PALETTE["surface"],
                           font=self.f_small).pack(side="left", padx=6)

        custom_row = tk.Frame(qf, bg=PALETTE["surface"])
        custom_row.pack(fill="x", pady=4)
        tk.Label(custom_row, text="Custom question (optional):",
                 bg=PALETTE["surface"], fg=PALETTE["muted"], font=self.f_small).pack(anchor="w")
        self.v_custom_q = tk.StringVar()
        tk.Entry(custom_row, textvariable=self.v_custom_q, font=self.f_small,
                 bg=PALETTE["bg"], fg=PALETTE["text"],
                 insertbackground=PALETTE["text"], relief="flat").pack(fill="x", pady=2)

        # ── Recording card ────────────────────────────────────────────────
        self._card(parent, "🎙  Voice Recording").pack(fill="x", pady=(0, 6))
        rf = self._last_card_inner

        # meter
        meter_frame = tk.Frame(rf, bg=PALETTE["surface"])
        meter_frame.pack(fill="x", pady=4)
        tk.Label(meter_frame, text="Mic level:", bg=PALETTE["surface"],
                 fg=PALETTE["muted"], font=self.f_small).pack(side="left")
        self.meter_canvas = tk.Canvas(meter_frame, height=14, bg=PALETTE["bg"],
                                      highlightthickness=0)
        self.meter_canvas.pack(side="left", fill="x", expand=True, padx=8)

        # timer + status
        ctrl_row = tk.Frame(rf, bg=PALETTE["surface"])
        ctrl_row.pack(fill="x", pady=4)
        self.v_timer  = tk.StringVar(value="00:00")
        self.v_status = tk.StringVar(value="Ready")
        tk.Label(ctrl_row, textvariable=self.v_timer, font=self.f_title,
                 bg=PALETTE["surface"], fg=PALETTE["accent2"], width=6).pack(side="left")
        tk.Label(ctrl_row, textvariable=self.v_status, font=self.f_small,
                 bg=PALETTE["surface"], fg=PALETTE["muted"]).pack(side="left", padx=12)

        self.rec_btn = self._btn(rf, "⏺  Start Recording", self._toggle_rec,
                                 accent=True, width=22)
        self.rec_btn.pack(pady=6)

        # ── Transcript & Feedback card ────────────────────────────────────
        self._card(parent, "📋  Transcript & AI Feedback").pack(fill="both", expand=True, pady=(0, 0))
        ff = self._last_card_inner

        toolbar = tk.Frame(ff, bg=PALETTE["surface"])
        toolbar.pack(fill="x", pady=(0, 4))
        self._btn(toolbar, "🗑 Clear", self._clear_feedback).pack(side="left")
        self._btn(toolbar, "💾 Save Session", self._save_session).pack(side="left", padx=6)
        self._btn(toolbar, "📂 Load Session", self._load_session_dialog).pack(side="left")
        self._btn(toolbar, "📋 Copy All", self._copy_feedback).pack(side="right")

        self.ta_feedback = scrolledtext.ScrolledText(
            ff, font=self.f_mono, wrap="word",
            bg=PALETTE["bg"], fg=PALETTE["text"],
            insertbackground=PALETTE["text"],
            relief="flat", padx=10, pady=8,
            selectbackground=PALETTE["panel"],
        )
        self.ta_feedback.pack(fill="both", expand=True)

        # colour tags
        for tag, col in [("head", PALETTE["accent2"]), ("em", PALETTE["accent"]),
                         ("sm", PALETTE["muted"]),   ("er", PALETTE["error"]),
                         ("warn", PALETTE["warn"]),  ("ok", PALETTE["success"])]:
            self.ta_feedback.tag_config(tag, foreground=col)
        self.ta_feedback.tag_config("head", font=self.f_btn)
        self.ta_feedback.config(state="disabled")

        self._w(f"Welcome to {APP_NAME} v{APP_VERSION}\n", "head")
        self._w("Paste your CV and Job Description on the left, then record your answer.\n\n", "sm")

    # ── widget helpers ────────────────────────────────────────────────────────
    def _card(self, parent, title: str):
        outer = tk.Frame(parent, bg=PALETTE["border"], padx=1, pady=1)
        header = tk.Frame(outer, bg=PALETTE["panel"])
        header.pack(fill="x")
        tk.Label(header, text=title, font=self.f_btn,
                 bg=PALETTE["panel"], fg=PALETTE["accent2"],
                 padx=10, pady=5).pack(anchor="w")
        inner = tk.Frame(outer, bg=PALETTE["surface"], padx=10, pady=8)
        inner.pack(fill="both", expand=True)
        self._last_card_inner = inner
        return outer

    def _btn(self, parent, text, cmd, accent=False, width=None):
        kw = dict(text=text, command=cmd, font=self.f_btn, relief="flat",
                  cursor="hand2", padx=10, pady=4,
                  bg=PALETTE["accent"] if accent else PALETTE["panel"],
                  fg=PALETTE["text"],
                  activebackground=PALETTE["accent2"],
                  activeforeground=PALETTE["bg"])
        if width:
            kw["width"] = width
        b = tk.Button(parent, **kw)
        return b

    def _textarea(self, parent, height=8):
        ta = scrolledtext.ScrolledText(
            parent, font=self.f_small, wrap="word", height=height,
            bg=PALETTE["bg"], fg=PALETTE["text"],
            insertbackground=PALETTE["text"], relief="flat",
            padx=8, pady=6,
            selectbackground=PALETTE["panel"],
        )
        ta.pack(fill="both", expand=True)
        return ta

    def _clear_ta(self, ta):
        ta.delete("1.0", "end")

    # ── feedback text writer ──────────────────────────────────────────────────
    def _w(self, text: str, tag: str = ""):
        self.ta_feedback.config(state="normal")
        if tag:
            self.ta_feedback.insert("end", text, tag)
        else:
            self.ta_feedback.insert("end", text)
        self.ta_feedback.see("end")
        self.ta_feedback.config(state="disabled")

    # ── provider change ───────────────────────────────────────────────────────
    def _on_provider_change(self, _=None):
        p = self.v_provider.get()
        vals = {"Google Gemini": GEMINI_MODELS,
                "Perplexity":    PERP_MODELS,
                "OpenAI":        OPENAI_MODELS}.get(p, [])
        self.mcb["values"] = vals
        if vals:
            self.v_model.set(vals[0])

    # ── recording ─────────────────────────────────────────────────────────────
    def _toggle_rec(self):
        if self._rec_on:
            self._stop_rec()
        else:
            self._start_rec()

    def _start_rec(self):
        if not SD_OK:
            messagebox.showerror("Missing package", "pip install sounddevice")
            return
        self._rec_on = True
        self.rec_btn.config(text="⏹  Stop & Analyse", bg=PALETTE["error"])
        self.v_status.set("Recording…")
        self._start_t = time.time()
        self.rec.start()
        self._tick()
        self._meter_loop()

    def _stop_rec(self):
        self._rec_on = False
        self.rec.stop()
        if self._meter_id:
            self.root.after_cancel(self._meter_id)
        self.rec_btn.config(text="⏺  Start Recording", bg=PALETTE["accent"])
        self.v_status.set("Processing…")
        self._w("\n──────────────────────────────────\n", "sm")
        threading.Thread(target=self._transcribe, args=(self.rec,),
                         daemon=True).start()

    def _tick(self):
        if not self._rec_on:
            return
        elapsed = int(time.time() - self._start_t)
        if elapsed >= MAX_REC_SEC:
            self._stop_rec()
            return
        m, s = divmod(elapsed, 60)
        self.v_timer.set(f"{m:02d}:{s:02d}")
        self.root.after(500, self._tick)

    def _meter_loop(self):
        if not self._rec_on:
            return
        self.rec.drain()
        peak = self.rec.peak
        w = self.meter_canvas.winfo_width() or 200
        bar_w = int(w * min(peak * 4, 1.0))
        col = PALETTE["success"] if peak < 0.6 else PALETTE["error"]
        self.meter_canvas.delete("all")
        self.meter_canvas.create_rectangle(0, 0, bar_w, 14, fill=col, outline="")
        self._meter_id = self.root.after(80, self._meter_loop)

    # ── transcription ─────────────────────────────────────────────────────────
    def _transcribe(self, rec: Recorder):
        if not rec.frames:
            self.root.after(0, lambda: self._w("\nNo audio captured — check mic permissions.\n", "er"))
            self.root.after(0, lambda: self.v_status.set("No audio"))
            return
        if not WHISPER_OK:
            self.root.after(0, lambda: self._w(
                "\nopenai-whisper not installed.\nRun: pip install openai-whisper\n", "er"))
            self.root.after(0, lambda: self.v_status.set("Whisper missing"))
            return
        try:
            self.root.after(0, lambda: self.v_status.set("Loading Whisper (first run ~150 MB)…"))
            if self.wmodel is None:
                self.wmodel = _whisper.load_model("base")
            if self.wmodel is None:
                raise RuntimeError("Whisper model failed to load.")
            audio = rec.get_audio_for_whisper()
            if audio is None or len(audio) == 0:
                raise RuntimeError("Audio buffer empty after recording.")
            result = self.wmodel.transcribe(audio, language="en")
            if result is None:
                raise RuntimeError("Whisper returned no result.")
            txt = (result.get("text") or "").strip()
            if txt:
                self.root.after(0, lambda t=txt: self._on_transcript(t))
            else:
                self.root.after(0, lambda: self._w("\nNo speech detected.\n", "sm"))
                self.root.after(0, lambda: self.v_status.set("No speech detected"))
        except Exception as e:
            log.exception("Transcription error")
            self.root.after(0, lambda m=str(e): self._w(f"\nTranscription error: {m}\n", "er"))
            self.root.after(0, lambda: self.v_status.set("Transcription failed"))

    def _on_transcript(self, txt: str):
        self._w(f"🗣  You said:\n{txt}\n\n", "em")
        self.v_status.set("Sending to AI…")
        threading.Thread(target=self._get_feedback, args=(txt,), daemon=True).start()

    # ── AI feedback ───────────────────────────────────────────────────────────
    def _get_feedback(self, transcript: str):
        cv  = self.ta_cv.get("1.0", "end").strip()
        jd  = self.ta_jd.get("1.0", "end").strip()
        qt  = self.v_qtype.get()
        cq  = self.v_custom_q.get().strip()

        question_hint = f'Custom question: "{cq}"' if cq else f"Question type: {qt}"

        sys_p = (
            "You are an expert interview coach specialising in helping candidates "
            "secure roles by giving structured, specific, actionable feedback. "
            "Always use the STAR framework (Situation, Task, Action, Result)."
        )
        usr_p = (
            f"## Candidate CV\n{cv or '(not provided)'}\n\n"
            f"## Job Description\n{jd or '(not provided)'}\n\n"
            f"## {question_hint}\n\n"
            f"## Candidate's spoken answer\n{transcript}\n\n"
            "Please provide feedback with these sections:\n"
            "1. **STAR Score** (x/10) with brief justification\n"
            "2. **Strengths** — what worked well (2-3 bullet points)\n"
            "3. **Improvements** — what to add/change (2-3 bullet points)\n"
            "4. **Suggested Reframe** — a concise improved version of the answer\n"
            "5. **JD Keywords** to weave in next time\n"
        )
        try:
            reply = self._ai(sys_p, usr_p)
            self.root.after(0, lambda r=reply: self._show_feedback(r))
        except Exception as e:
            log.exception("AI feedback error")
            self.root.after(0, lambda m=str(e): self._w(f"\nAI error: {m}\n", "er"))
            self.root.after(0, lambda: self.v_status.set("AI error — see above"))

    def _show_feedback(self, reply: str):
        self._w("🤖  AI Feedback:\n", "head")
        self._w(reply + "\n\n", "")
        self.v_status.set("Done ✓")

    # ── AI call ───────────────────────────────────────────────────────────────
    def _ai(self, sys_p: str, usr_p: str, maxtok: int = 1200) -> str:
        prov  = self.v_provider.get()
        key   = self.v_key.get().strip()
        model = self.v_model.get().strip()
        kind  = PROVIDERS[prov][0]

        if not key:
            raise ValueError("API key is missing — enter it in Settings.")

        if kind == "gemini":
            if not GENAI_OK:
                raise RuntimeError("pip install google-genai")
            client = _ggenai.Client(api_key=key)
            resp   = client.models.generate_content(
                model=model,
                contents=f"{sys_p}\n\n{usr_p}",
            )
            return resp.text

        if kind in ("openai", "perplexity"):
            if not OPENAI_OK:
                raise RuntimeError("pip install openai")
            base = None if kind == "openai" else "https://api.perplexity.ai"
            client = _openai.OpenAI(api_key=key, base_url=base)
            resp   = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system",  "content": sys_p},
                    {"role": "user",    "content": usr_p},
                ],
                max_tokens=maxtok,
            )
            return resp.choices[0].message.content

        raise ValueError(f"Unknown provider: {prov}")

    # ── file loaders ──────────────────────────────────────────────────────────
    def _load_cv(self):
        path = filedialog.askopenfilename(
            title="Load CV",
            filetypes=[("Documents", "*.txt *.pdf *.docx"), ("All", "*.*")]
        )
        if path:
            try:
                text = _read_file(path)
                self.ta_cv.delete("1.0", "end")
                self.ta_cv.insert("1.0", text)
            except Exception as e:
                messagebox.showerror("Load CV", str(e))

    def _load_jd(self):
        path = filedialog.askopenfilename(
            title="Load Job Description",
            filetypes=[("Documents", "*.txt *.pdf *.docx"), ("All", "*.*")]
        )
        if path:
            try:
                text = _read_file(path)
                self.ta_jd.delete("1.0", "end")
                self.ta_jd.insert("1.0", text)
            except Exception as e:
                messagebox.showerror("Load JD", str(e))

    # ── session ───────────────────────────────────────────────────────────────
    def _save_session(self):
        data = {
            "cv":       self.ta_cv.get("1.0", "end"),
            "jd":       self.ta_jd.get("1.0", "end"),
            "feedback": self.ta_feedback.get("1.0", "end"),
            "provider": self.v_provider.get(),
            "model":    self.v_model.get(),
            "qtype":    self.v_qtype.get(),
        }
        try:
            SESSION_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
            self._w("\n💾 Session saved.\n", "ok")
        except Exception as e:
            messagebox.showerror("Save Session", str(e))

    def _load_session(self):
        if SESSION_FILE.exists():
            try:
                data = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
                self.ta_cv.insert("1.0", data.get("cv", ""))
                self.ta_jd.insert("1.0", data.get("jd", ""))
                if data.get("provider"):
                    self.v_provider.set(data["provider"])
                    self._on_provider_change()
                if data.get("model"):
                    self.v_model.set(data["model"])
                if data.get("qtype"):
                    self.v_qtype.set(data["qtype"])
            except Exception:
                pass

    def _load_session_dialog(self):
        path = filedialog.askopenfilename(
            title="Load Session",
            filetypes=[("JSON", "*.json"), ("All", "*.*")]
        )
        if path:
            try:
                data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
                self.ta_cv.delete("1.0", "end")
                self.ta_jd.delete("1.0", "end")
                self.ta_cv.insert("1.0", data.get("cv", ""))
                self.ta_jd.insert("1.0", data.get("jd", ""))
                self.ta_feedback.config(state="normal")
                self.ta_feedback.delete("1.0", "end")
                self.ta_feedback.insert("1.0", data.get("feedback", ""))
                self.ta_feedback.config(state="disabled")
            except Exception as e:
                messagebox.showerror("Load Session", str(e))

    # ── feedback tools ────────────────────────────────────────────────────────
    def _clear_feedback(self):
        self.ta_feedback.config(state="normal")
        self.ta_feedback.delete("1.0", "end")
        self.ta_feedback.config(state="disabled")
        self.v_status.set("Ready")
        self.v_timer.set("00:00")

    def _copy_feedback(self):
        text = self.ta_feedback.get("1.0", "end")
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self._w("\n📋 Copied to clipboard.\n", "ok")

    # ── log helper ────────────────────────────────────────────────────────────
    def _log_exception(self, stage: str, exc: Exception):
        log.error("[%s] %s", stage, exc, exc_info=True)

    # ── close ─────────────────────────────────────────────────────────────────
    def _on_close(self):
        if self._rec_on:
            self.rec.stop()
        self._save_session()
        log.info("Application closing")
        self.root.destroy()


# ── entry point ───────────────────────────────────────────────────────────────
def main():
    root = tk.Tk()
    app  = InterviewApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()

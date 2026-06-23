import React, { useState, useEffect, useCallback } from "react";
import SettingsPanel  from "./components/SettingsPanel";
import DocumentPanel  from "./components/DocumentPanel";
import RecorderPanel  from "./components/RecorderPanel";
import FeedbackPanel  from "./components/FeedbackPanel";
import { useRecorder } from "./hooks/useRecorder";

const API = import.meta.env.VITE_API_URL || "";

const defaultSettings = {
  provider: "Google Gemini",
  model:    "gemini-2.5-flash",
  apiKey:   "",
};

function loadStorage(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const [settings, setSettings] = useState(() => loadStorage("settings", defaultSettings));
  const [cv,       setCV]       = useState(() => loadStorage("cv", ""));
  const [jd,       setJD]       = useState(() => loadStorage("jd", ""));
  const [qtype,    setQtype]    = useState("Behavioral");
  const [customQ,  setCustomQ]  = useState("");
  const [entries,  setEntries]  = useState([]);
  const [status,   setStatus]   = useState("Ready");
  const [elapsed,  setElapsed]  = useState(0);
  const [busy,     setBusy]     = useState(false);

  const { recording, audioBlob, level, start, stop } = useRecorder();

  useEffect(() => { sessionStorage.setItem("settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { sessionStorage.setItem("cv",       JSON.stringify(cv));       }, [cv]);
  useEffect(() => { sessionStorage.setItem("jd",       JSON.stringify(jd));       }, [jd]);

  useEffect(() => {
    if (!recording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!audioBlob) return;
    handleAudio(audioBlob);
  }, [audioBlob]);

  function addEntry(type, text) {
    setEntries(prev => [...prev, { type, text }]);
  }

  async function handleAudio(blob) {
    setBusy(true);
    setStatus("Transcribing…");
    addEntry("info", "⏳ Sending audio to Whisper…");

    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");

      const res = await fetch(`${API}/api/transcribe`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");

      const transcript = data.transcript;
      addEntry("transcript", transcript);
      setStatus("Getting AI feedback…");
      addEntry("info", "⏳ Asking AI coach…");

      const fbRes = await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          cv, jd, qtype,
          custom_q:  customQ,
          provider:  settings.provider,
          model:     settings.model,
          api_key:   settings.apiKey,
        }),
      });
      const fbData = await fbRes.json();
      if (!fbRes.ok) throw new Error(fbData.error || "AI feedback failed");

      setEntries(prev => {
        const filtered = prev.filter(e => !(e.type === "info" && e.text.includes("Asking AI")));
        return [...filtered, { type: "feedback", text: fbData.feedback }];
      });
      setStatus("Done ✓");
    } catch (err) {
      addEntry("error", err.message);
      setStatus("Error — see above");
    } finally {
      setBusy(false);
    }
  }

  function toggleRec() {
    if (recording) { stop(); }
    else           { start(); setStatus("Recording…"); }
  }

  return (
    <div style={layout.root}>
      <header style={layout.header}>
        <div style={layout.logo}>
          <span style={layout.logoIcon}>🎤</span>
          <span style={layout.logoText}>Interview Prep Assistant</span>
        </div>
        <a href="https://github.com/itadmincarego-hash/interview-prep-app" target="_blank" rel="noopener noreferrer" style={layout.ghLink}>GitHub ↗</a>
      </header>

      <main style={layout.body}>
        <div style={layout.left}>
          <SettingsPanel settings={settings} onChange={setSettings} />
          <DocumentPanel label="CV / Resume"     icon="📄" value={cv} onChange={setCV} />
          <DocumentPanel label="Job Description"  icon="💼" value={jd} onChange={setJD} />
        </div>
        <div style={layout.right}>
          <RecorderPanel
            recording={recording} level={level} elapsed={elapsed}
            status={busy ? status : (recording ? "Recording…" : status)}
            onToggle={toggleRec}
            qtype={qtype} onQtype={setQtype}
            customQ={customQ} onCustomQ={setCustomQ}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <FeedbackPanel entries={entries} onClear={() => setEntries([])} />
          </div>
        </div>
      </main>
    </div>
  );
}

const layout = {
  root:  { minHeight: "100dvh", display: "flex", flexDirection: "column" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.75rem 1.5rem",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    position: "sticky", top: 0, zIndex: 10,
  },
  logo:     { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: "1.3rem" },
  logoText: { fontWeight: 700, fontSize: "1rem", color: "var(--accent2)" },
  ghLink:   { fontSize: "0.8rem", color: "var(--muted)", textDecoration: "none" },
  body: {
    flex: 1, display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "1rem", padding: "1rem 1.25rem", alignItems: "start",
  },
  left:  { display: "flex", flexDirection: "column", gap: "0.75rem" },
  right: { display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" },
};

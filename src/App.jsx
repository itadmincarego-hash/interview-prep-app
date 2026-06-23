import React, { useState, useEffect } from "react";
import SettingsDrawer from "./components/SettingsDrawer";
import DocPanel       from "./components/DocPanel";
import MicPanel       from "./components/MicPanel";
import FeedbackPanel  from "./components/FeedbackPanel";
import { useRecorder } from "./hooks/useRecorder";
import { transcribeAudio, getFeedback } from "./hooks/useAI";

const DEFAULT_SETTINGS = {
  provider:  "Google Gemini",
  model:     "gemini-2.5-flash",
  apiKey:    "",
  openaiKey: "",
};

function ss(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const [settings, setSettings] = useState(() => ss("cfg", DEFAULT_SETTINGS));
  const [cv,       setCV]       = useState(() => ss("cv",  ""));
  const [jd,       setJD]       = useState(() => ss("jd",  ""));
  const [qtype,    setQtype]    = useState("Behavioral");
  const [customQ,  setCustomQ]  = useState("");
  const [entries,  setEntries]  = useState([]);
  const [status,   setStatus]   = useState("Ready — configure API key in ⚙️ Settings");
  const [busy,     setBusy]     = useState(false);
  const [elapsed,  setElapsed]  = useState(0);

  const rec = useRecorder();

  useEffect(() => sessionStorage.setItem("cfg", JSON.stringify(settings)), [settings]);
  useEffect(() => sessionStorage.setItem("cv",  JSON.stringify(cv)),       [cv]);
  useEffect(() => sessionStorage.setItem("jd",  JSON.stringify(jd)),       [jd]);

  useEffect(() => {
    if (!rec.recording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [rec.recording]);

  useEffect(() => {
    if (!rec.audioBlob) return;
    processAudio(rec.audioBlob);
  }, [rec.audioBlob]);

  function add(type, text) { setEntries(prev => [...prev, { type, text }]); }

  async function processAudio(blob) {
    setBusy(true);
    const whisperKey = settings.provider === "OpenAI" ? settings.apiKey : settings.openaiKey;

    if (!whisperKey) {
      add("error", "OpenAI API key needed for Whisper transcription. Add it in ⚙️ Settings.");
      setBusy(false); setStatus("Missing OpenAI key"); return;
    }
    if (!settings.apiKey) {
      add("error", `${settings.provider} API key needed for feedback. Add it in ⚙️ Settings.`);
      setBusy(false); setStatus("Missing API key"); return;
    }

    setStatus("Transcribing audio…");
    add("info", "⏳ Sending to Whisper…");
    let transcript;
    try {
      transcript = await transcribeAudio(blob, whisperKey);
      setEntries(p => p.filter(e => !(e.type==="info" && e.text.includes("Whisper"))));
      if (!transcript) throw new Error("No speech detected.");
      add("transcript", transcript);
    } catch (err) {
      setEntries(p => p.filter(e => !(e.type==="info" && e.text.includes("Whisper"))));
      add("error", `Transcription failed: ${err.message}`);
      setBusy(false); setStatus("Error"); return;
    }

    setStatus("Getting AI feedback…");
    add("info", "⏳ Asking AI coach…");
    try {
      const feedback = await getFeedback({ transcript, cv, jd, qtype, customQ, provider: settings.provider, model: settings.model, apiKey: settings.apiKey });
      setEntries(p => { const f = p.filter(e => !(e.type==="info" && e.text.includes("AI coach"))); return [...f, { type:"feedback", text:feedback }]; });
      setStatus("Done ✓ — record again to practice more");
    } catch (err) {
      setEntries(p => p.filter(e => !(e.type==="info" && e.text.includes("AI coach"))));
      add("error", `AI feedback failed: ${err.message}`);
      setStatus("Error");
    } finally { setBusy(false); }
  }

  function toggleRec() {
    if (rec.recording) { rec.stop(); setStatus("Processing…"); }
    else { rec.start(); setStatus("Recording…"); }
  }

  return (
    <div style={L.root}>
      <header style={L.header}>
        <div style={L.brand}>
          <span style={{fontSize:"1.25rem"}}>🎤</span>
          <span style={{fontWeight:700,fontSize:"1rem",color:"var(--accent2)"}}>Interview Prep Assistant</span>
          {busy && <span className="spin" style={{fontSize:"1rem",color:"var(--muted)",marginLeft:8}}>⟳</span>}
        </div>
        <div style={{position:"relative"}}>
          <SettingsDrawer settings={settings} onChange={setSettings} />
        </div>
      </header>
      <main style={L.main}>
        <div style={L.left}>
          <DocPanel label="CV / Resume"    icon="📄" value={cv} onChange={setCV} />
          <DocPanel label="Job Description" icon="💼" value={jd} onChange={setJD} />
        </div>
        <div style={L.right}>
          <MicPanel recording={rec.recording} level={rec.level} elapsed={elapsed} micError={rec.micError} devices={rec.devices} deviceId={rec.deviceId} setDeviceId={rec.setDeviceId} onToggle={toggleRec} loadDevices={rec.loadDevices} qtype={qtype} onQtype={setQtype} customQ={customQ} onCustomQ={setCustomQ} status={status} />
          <FeedbackPanel entries={entries} onClear={() => setEntries([])} />
        </div>
      </main>
    </div>
  );
}

const L = {
  root: {minHeight:"100dvh",display:"flex",flexDirection:"column"},
  header: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:".7rem 1.25rem",background:"var(--surface)",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:50},
  brand: {display:"flex",alignItems:"center",gap:10},
  main: {flex:1,display:"grid",gridTemplateColumns:"360px 1fr",gap:"1rem",padding:"1rem 1.25rem",alignItems:"start"},
  left: {display:"flex",flexDirection:"column",gap:".75rem"},
  right: {display:"flex",flexDirection:"column",gap:".75rem"},
};

import React from "react";

export default function RecorderPanel({
  recording, level, elapsed, status,
  onToggle, qtype, onQtype, customQ, onCustomQ,
}) {
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>🎙️ Voice Recording</h3>
      <div style={styles.qtypeRow}>
        {["Behavioral","Technical","Situational","Motivation"].map(t => (
          <button key={t} onClick={() => onQtype(t)} style={{
            ...styles.qtypeBtn,
            background: qtype === t ? "var(--accent2)" : "var(--panel)",
            color: qtype === t ? "#000" : "var(--text)",
          }}>{t}</button>
        ))}
      </div>
      <input placeholder="Custom question (optional)…" value={customQ} onChange={e => onCustomQ(e.target.value)} style={{ marginTop: "0.5rem", fontSize: "0.83rem" }} />
      <div style={styles.meterWrap}>
        <span style={styles.meterLabel}>Mic</span>
        <div style={styles.meterTrack}>
          <div style={{ ...styles.meterBar, width: `${level * 100}%`, background: level > 0.75 ? "var(--danger)" : "var(--accent)" }} />
        </div>
      </div>
      <div style={styles.ctrlRow}>
        <span style={styles.timer}>{mins}:{secs}</span>
        <span style={styles.status}>{status}</span>
        <button onClick={onToggle} style={{ ...styles.recBtn, background: recording ? "var(--danger)" : "var(--accent)" }}>
          {recording ? <>■ Stop & Analyse</> : <><span style={{ width:10,height:10,borderRadius:"50%",background:"#fff",display:"inline-block" }} /> Start Recording</>}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: { background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",display:"flex",flexDirection:"column",gap:"0.65rem" },
  title: { fontSize:"0.85rem",fontWeight:700,color:"var(--accent2)",textTransform:"uppercase",letterSpacing:"0.06em" },
  qtypeRow: { display:"flex",gap:6,flexWrap:"wrap" },
  qtypeBtn: { borderRadius:20,padding:"0.28rem 0.75rem",fontSize:"0.78rem",fontWeight:600,transition:"background 0.15s,color 0.15s" },
  meterWrap: { display:"flex",alignItems:"center",gap:8 },
  meterLabel: { fontSize:"0.75rem",color:"var(--muted)",width:26 },
  meterTrack: { flex:1,height:10,background:"var(--panel)",borderRadius:5,overflow:"hidden" },
  meterBar: { height:"100%",borderRadius:5,transition:"width 0.06s linear" },
  ctrlRow: { display:"flex",alignItems:"center",gap:12 },
  timer: { fontFamily:"var(--font-mono)",fontSize:"1.3rem",color:"var(--accent2)",minWidth:52 },
  status: { fontSize:"0.8rem",color:"var(--muted)",flex:1 },
  recBtn: { color:"#fff",fontWeight:700,fontSize:"0.9rem",padding:"0.55rem 1.2rem",display:"flex",alignItems:"center",gap:8 },
};

import React from "react";
import ReactMarkdown from "react-markdown";

export default function FeedbackPanel({ entries, onClear }) {
  const endRef = React.useRef();
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entries]);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>📋 Transcript & AI Feedback</h3>
        <button style={styles.clearBtn} onClick={onClear}>🗑 Clear</button>
        <button style={styles.clearBtn} onClick={() => {
          const text = entries.map(e =>
            e.type === "transcript" ? `You said:\n${e.text}` : `AI Feedback:\n${e.text}`
          ).join("\n\n---\n\n");
          navigator.clipboard.writeText(text);
        }}>📋 Copy</button>
      </div>
      <div style={styles.scroll}>
        {entries.length === 0 && <p style={styles.empty}>Your transcripts and AI feedback will appear here after recording.</p>}
        {entries.map((entry, i) => (
          <div key={i} style={styles.entry} className="fade-in">
            {entry.type === "transcript" && (<><span style={styles.badge("transcript")}>🗣 You said</span><p style={styles.transcript}>{entry.text}</p></>)}
            {entry.type === "feedback"   && (<><span style={styles.badge("feedback")}>🤖 AI Feedback</span><div className="md-output" style={styles.feedbackBody}><ReactMarkdown>{entry.text}</ReactMarkdown></div></>)}
            {entry.type === "error"      && <p style={styles.error}>⚠ {entry.text}</p>}
            {entry.type === "info"       && <p style={styles.info}>{entry.text}</p>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

const styles = {
  card: { background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",display:"flex",flexDirection:"column",height:"100%",minHeight:400 },
  header: { display:"flex",alignItems:"center",gap:6,marginBottom:"0.75rem" },
  title: { fontSize:"0.85rem",fontWeight:700,color:"var(--accent2)",flex:1,textTransform:"uppercase",letterSpacing:"0.06em" },
  clearBtn: { background:"var(--panel)",color:"var(--text)",padding:"0.3rem 0.65rem",fontSize:"0.78rem" },
  scroll: { flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"1rem" },
  empty: { color:"var(--faint)",textAlign:"center",marginTop:"3rem",fontSize:"0.875rem" },
  entry: { borderLeft:"3px solid var(--border)",paddingLeft:"0.75rem" },
  badge: (type) => ({ display:"inline-block",fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",padding:"0.15rem 0.5rem",borderRadius:4,marginBottom:"0.4rem",background:type==="transcript"?"var(--panel)":"rgba(88,166,255,0.12)",color:type==="transcript"?"var(--muted)":"var(--accent2)" }),
  transcript: { fontSize:"0.9rem",lineHeight:1.6,color:"var(--text)",fontStyle:"italic" },
  feedbackBody: { fontSize:"0.875rem",lineHeight:1.7 },
  error: { color:"var(--danger)",fontSize:"0.875rem" },
  info:  { color:"var(--muted)",fontSize:"0.8rem" },
};

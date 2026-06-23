import React, { useRef } from "react";

export default function DocumentPanel({ label, value, onChange, icon }) {
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name.endsWith(".txt")) {
      onChange(await file.text());
    } else {
      alert("For PDF/DOCX, please copy-paste the text directly.");
    }
    fileRef.current.value = "";
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{icon} {label}</h3>
        <button style={styles.loadBtn} onClick={() => fileRef.current.click()}>📂 Load .txt</button>
        <button style={{ ...styles.loadBtn, marginLeft: 6 }} onClick={() => onChange("")}>🗑</button>
      </div>
      <input ref={fileRef} type="file" accept=".txt" hidden onChange={handleFile} />
      <textarea
        rows={9}
        placeholder={`Paste your ${label} here…`}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={styles.ta}
      />
    </div>
  );
}

const styles = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "1rem",
    display: "flex", flexDirection: "column", gap: "0.5rem",
  },
  header: { display: "flex", alignItems: "center", gap: 6 },
  title: { fontSize: "0.85rem", fontWeight: 700, color: "var(--accent2)", flex: 1, textTransform: "uppercase", letterSpacing: "0.06em" },
  loadBtn: { background: "var(--panel)", color: "var(--text)", padding: "0.3rem 0.65rem", fontSize: "0.78rem" },
  ta: { minHeight: 160, fontFamily: "var(--font-body)", fontSize: "0.83rem" },
};

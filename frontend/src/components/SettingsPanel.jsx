import React from "react";

const PROVIDERS = {
  "Google Gemini": ["gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.5-pro","gemini-2.0-flash","gemini-2.0-flash-lite"],
  "OpenAI":        ["gpt-4o-mini","gpt-4o","gpt-4-turbo"],
  "Perplexity":    ["sonar","sonar-pro"],
};

export default function SettingsPanel({ settings, onChange }) {
  const models = PROVIDERS[settings.provider] || [];

  function set(key, val) {
    const next = { ...settings, [key]: val };
    if (key === "provider") next.model = (PROVIDERS[val] || [])[0] || "";
    onChange(next);
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>⚙️ Settings</h3>
      <div style={styles.grid}>
        <div>
          <label>Provider</label>
          <select value={settings.provider} onChange={e => set("provider", e.target.value)}>
            {Object.keys(PROVIDERS).map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label>Model</label>
          <select value={settings.model} onChange={e => set("model", e.target.value)}>
            {models.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: "0.75rem" }}>
        <label>API Key</label>
        <input
          type="password"
          placeholder="Paste your API key here…"
          value={settings.apiKey}
          onChange={e => set("apiKey", e.target.value)}
        />
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "1rem",
  },
  cardTitle: {
    fontSize: "0.85rem", fontWeight: 700, color: "var(--accent2)",
    marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
};

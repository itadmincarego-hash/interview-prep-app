import React, { useState } from "react";

const PROVIDERS = {
  "Google Gemini": ["gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.5-pro","gemini-2.0-flash"],
  "OpenAI":        ["gpt-4o-mini","gpt-4o","gpt-4-turbo"],
  "Perplexity":    ["sonar","sonar-pro"],
};

export default function SettingsDrawer({ settings, onChange }) {
  const [show, setShow] = useState(false);
  const models = PROVIDERS[settings.provider] || [];

  function set(key, val) {
    const next = { ...settings, [key]: val };
    if (key === "provider") next.model = (PROVIDERS[val]||[])[0]||"";
    onChange(next);
  }

  return (
    <>
      <button onClick={() => setShow(s=>!s)} style={{background:"var(--panel)",color:"var(--text)",padding:".35rem .8rem",fontSize:".8rem"}}>
        ⚙️ Settings
      </button>
      {show && (
        <div className="fade-up" style={{position:"absolute",top:50,right:12,zIndex:100,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",width:320,boxShadow:"0 8px 32px rgba(0,0,0,.5)",display:"flex",flexDirection:"column",gap:".7rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:".85rem",color:"var(--accent2)"}}>API Settings</span>
            <button onClick={()=>setShow(false)} style={{background:"none",color:"var(--muted)",padding:".15rem .4rem",fontSize:".9rem"}}>✕</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
            <label>AI Provider</label>
            <select value={settings.provider} onChange={e=>set("provider",e.target.value)}>
              {Object.keys(PROVIDERS).map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
            <label>Model</label>
            <select value={settings.model} onChange={e=>set("model",e.target.value)}>
              {models.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          {settings.provider !== "OpenAI" && (
            <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
              <label>OpenAI Key <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(Whisper transcription)</span></label>
              <input type="password" placeholder="sk-…" value={settings.openaiKey||""} onChange={e=>set("openaiKey",e.target.value)} />
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:".3rem"}}>
            <label>{settings.provider} Key <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(AI feedback)</span></label>
            <input type="password" placeholder={settings.provider==="Google Gemini"?"AIza…":"sk-…"} value={settings.apiKey} onChange={e=>set("apiKey",e.target.value)} />
          </div>
          <p style={{fontSize:".72rem",color:"var(--muted)",lineHeight:1.5}}>🔒 Keys live only in this browser tab — never sent to GitHub or any server except the AI provider directly.</p>
        </div>
      )}
    </>
  );
}

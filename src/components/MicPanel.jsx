import React, { useEffect } from "react";

export default function MicPanel({ recording, level, elapsed, micError, devices, deviceId, setDeviceId, onToggle, loadDevices, qtype, onQtype, customQ, onCustomQ, status }) {
  const mins = String(Math.floor(elapsed/60)).padStart(2,"0");
  const secs = String(elapsed%60).padStart(2,"0");
  useEffect(() => { loadDevices(); }, []);

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",display:"flex",flexDirection:"column",gap:".75rem"}}>
      <span style={{fontSize:".82rem",fontWeight:700,color:"var(--accent2)",textTransform:"uppercase",letterSpacing:".06em"}}>🎙️ Voice Recording</span>

      <div>
        <label>🔊 Microphone Input</label>
        <select value={deviceId} onChange={e=>setDeviceId(e.target.value)}>
          <option value="default">Default microphone</option>
          {devices.map(d=>(<option key={d.deviceId} value={d.deviceId}>{d.label||`Microphone ${d.deviceId.slice(0,6)}`}</option>))}
        </select>
        <p style={{fontSize:".7rem",color:"var(--muted)",marginTop:4,lineHeight:1.5}}>To change mic: click 🔒 in the address bar → Site settings → Microphone</p>
      </div>

      <div>
        <label>Question Type</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
          {["Behavioral","Technical","Situational","Motivation"].map(t=>(
            <button key={t} onClick={()=>onQtype(t)} style={{borderRadius:20,padding:".26rem .7rem",fontSize:".76rem",fontWeight:600,transition:"background .15s,color .15s",background:qtype===t?"var(--accent2)":"var(--panel)",color:qtype===t?"#000":"var(--text)"}}>{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label>Custom Question <span style={{color:"var(--muted)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
        <input placeholder="e.g. Tell me about a time you led a project…" value={customQ} onChange={e=>onCustomQ(e.target.value)} />
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:".72rem",color:"var(--muted)",minWidth:60}}>Mic level</span>
        <div style={{flex:1,height:9,background:"var(--panel)",borderRadius:5,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:5,transition:"width .06s linear,background .15s",width:`${level*100}%`,background:level>.8?"var(--danger)":level>.5?"#f0a500":"var(--accent)"}} />
        </div>
        <span style={{fontSize:".72rem",color:"var(--muted)",minWidth:28,textAlign:"right"}}>{Math.round(level*100)}%</span>
      </div>

      {micError && (
        <div style={{background:"rgba(248,81,73,.1)",border:"1px solid rgba(248,81,73,.3)",borderRadius:8,padding:".6rem .8rem",fontSize:".8rem",color:"var(--danger)",lineHeight:1.5}}>
          <strong>🚫 Mic issue:</strong> {micError}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:"var(--font-mono)",fontSize:"1.25rem",color:"var(--accent2)",minWidth:50}}>{mins}:{secs}</span>
        <span style={{flex:1,fontSize:".78rem",color:"var(--muted)"}}>{status}</span>
        <button onClick={onToggle} className={recording?"rec-pulse":""} style={{color:"#fff",fontWeight:700,fontSize:".88rem",padding:".55rem 1.1rem",background:recording?"var(--danger)":"var(--accent)"}}>
          {recording?"⏹ Stop & Analyse":"⏺ Start Recording"}
        </button>
      </div>
    </div>
  );
}

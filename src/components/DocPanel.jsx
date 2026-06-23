import React, { useRef } from "react";

export default function DocPanel({ label, icon, value, onChange }) {
  const fileRef = useRef();
  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.name.endsWith(".txt")) onChange(await file.text());
    else alert("Please paste PDF/DOCX content as text, or upload a .txt file.");
    fileRef.current.value = "";
  }
  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",display:"flex",flexDirection:"column",gap:".5rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{flex:1,fontSize:".82rem",fontWeight:700,color:"var(--accent2)",textTransform:"uppercase",letterSpacing:".06em"}}>{icon} {label}</span>
        <button style={{background:"var(--panel)",color:"var(--text)",padding:".28rem .6rem",fontSize:".75rem"}} onClick={()=>fileRef.current.click()}>📂 .txt</button>
        <button style={{background:"var(--panel)",color:"var(--text)",padding:".28rem .6rem",fontSize:".75rem"}} onClick={()=>onChange("")}>🗑</button>
      </div>
      <input ref={fileRef} type="file" accept=".txt" hidden onChange={handleFile} />
      <textarea rows={9} placeholder={`Paste your ${label} here…`} value={value} onChange={e=>onChange(e.target.value)} style={{fontSize:".82rem"}} />
    </div>
  );
}

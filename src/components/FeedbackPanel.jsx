import React, { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function FeedbackPanel({ entries, onClear }) {
  const endRef = useRef();
  useEffect(() => endRef.current?.scrollIntoView({behavior:"smooth"}), [entries]);

  function copyAll() {
    const text = entries.filter(e=>e.type!=="info").map(e=>e.type==="transcript"?`YOU SAID:\n${e.text}`:e.type==="feedback"?`AI FEEDBACK:\n${e.text}`:e.text).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"1rem",display:"flex",flexDirection:"column",flex:1,minHeight:400}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:".75rem",flexShrink:0}}>
        <span style={{flex:1,fontSize:".82rem",fontWeight:700,color:"var(--accent2)",textTransform:"uppercase",letterSpacing:".06em"}}>📋 Transcript & Feedback</span>
        <button style={{background:"var(--panel)",color:"var(--text)",padding:".28rem .6rem",fontSize:".75rem"}} onClick={copyAll}>📋 Copy</button>
        <button style={{background:"var(--panel)",color:"var(--text)",padding:".28rem .6rem",fontSize:".75rem"}} onClick={onClear}>🗑 Clear</button>
      </div>
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:".85rem"}}>
        {entries.length===0&&(<div style={{color:"var(--muted)",textAlign:"center",marginTop:"3rem",lineHeight:1.7,fontSize:".875rem"}}><div style={{fontSize:"2rem",marginBottom:12}}>🎙️</div><p>Record your answer and get instant AI coaching feedback.</p><p style={{marginTop:6,fontSize:".75rem"}}>Configure your API key in ⚙️ Settings first.</p></div>)}
        {entries.map((e,i)=>(
          <div key={i} className="fade-up">
            {e.type==="transcript"&&(<div style={{borderLeft:"3px solid var(--border)",paddingLeft:".85rem"}}><span style={{display:"inline-block",fontSize:".68rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",padding:".12rem .45rem",borderRadius:4,background:"#30363d",color:"#8b949e"}}>🗣 You said</span><p style={{fontSize:".9rem",lineHeight:1.65,fontStyle:"italic",marginTop:6}}>{e.text}</p></div>)}
            {e.type==="feedback"&&(<div style={{borderLeft:"3px solid var(--accent2)",paddingLeft:".85rem"}}><span style={{display:"inline-block",fontSize:".68rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",padding:".12rem .45rem",borderRadius:4,background:"rgba(88,166,255,.12)",color:"var(--accent2)"}}>🤖 AI Feedback</span><div className="md" style={{marginTop:6,fontSize:".875rem"}}><ReactMarkdown>{e.text}</ReactMarkdown></div></div>)}
            {e.type==="info"&&<p style={{fontSize:".78rem",color:"var(--muted)",padding:"0 .5rem"}}>{e.text}</p>}
            {e.type==="error"&&<div style={{background:"rgba(248,81,73,.1)",border:"1px solid rgba(248,81,73,.3)",borderRadius:8,padding:".55rem .8rem",fontSize:".8rem",color:"var(--danger)"}}><strong>⚠️ Error:</strong> {e.text}</div>}
          </div>
        ))}
        <div ref={endRef}/>
      </div>
    </div>
  );
}

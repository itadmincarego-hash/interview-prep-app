export async function transcribeAudio(blob, apiKey) {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  form.append("model", "whisper-1");
  form.append("language", "en");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Whisper error ${res.status}`);
  }
  return (await res.json()).text?.trim() || "";
}

export async function getFeedback({ transcript, cv, jd, qtype, customQ, provider, model, apiKey }) {
  const qHint = customQ ? `Custom question: "${customQ}"` : `Question type: ${qtype}`;
  const sys = "You are an expert interview coach. Give structured, specific, actionable feedback using the STAR framework.";
  const usr = `## Candidate CV\n${cv||("(not provided)"}\n\n## Job Description\n${jd||("(not provided)")}\n\n## ${qHint}\n\n## Candidate answer\n${transcript}\n\nProvide:\n1. **STAR Score** (x/10) with brief justification\n2. **Strengths** — 2-3 bullets\n3. **Improvements** — 2-3 bullets\n4. **Suggested Reframe** — a concise improved version\n5. **JD Keywords** to weave in next time\n`;
  if (provider === "Google Gemini") return callGemini(model, apiKey, sys, usr);
  return callOpenAICompat(provider, model, apiKey, sys, usr);
}

async function callGemini(model, apiKey, sys, usr) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({contents:[{role:"user",parts:[{text:`${sys}\n\n${usr}`}]}],generationConfig:{maxOutputTokens:1200}}),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`Gemini ${res.status}`); }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text||"No response";
}

async function callOpenAICompat(provider, model, apiKey, sys, usr) {
  const base = provider==="Perplexity" ? "https://api.perplexity.ai" : "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},
    body: JSON.stringify({model, messages:[{role:"system",content:sys},{role:"user",content:usr}], max_tokens:1200}),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e?.error?.message||`API ${res.status}`); }
  return (await res.json()).choices?.[0]?.message?.content||"No response";
}

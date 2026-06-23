import { useRef, useState, useCallback } from "react";

export function useRecorder() {
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const ctxRef    = useRef(null);
  const animRef   = useRef(null);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [level,     setLevel]     = useState(0);
  const [micError,  setMicError]  = useState(null);
  const [devices,   setDevices]   = useState([]);
  const [deviceId,  setDeviceId]  = useState("default");

  const loadDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter(d => d.kind === "audioinput");
      setDevices(mics);
      if (mics.length) setDeviceId(mics[0].deviceId);
    } catch (e) {
      setMicError("Microphone access denied. Please allow mic in browser settings.");
    }
  }, []);

  const start = useCallback(async () => {
    setMicError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    let stream;
    try {
      const constraints = { audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Mic blocked — click the 🔒 icon in the address bar and allow microphone access."
        : err.name === "NotFoundError"
        ? "No microphone found. Plug one in and try again."
        : `Mic error: ${err.message}`;
      setMicError(msg); return;
    }

    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    ctxRef.current = ctx;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      setLevel(Math.min(buf.reduce((a,b)=>a+b,0)/buf.length/70,1));
      animRef.current = requestAnimationFrame(tick);
    };
    tick();

    const mime = ["audio/webm;codecs=opus","audio/webm","audio/ogg","audio/mp4"]
      .find(m => MediaRecorder.isTypeSupported(m)) || "";
    const mr = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
    mr.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      cancelAnimationFrame(animRef.current);
      setLevel(0); ctx.close();
      stream.getTracks().forEach(t => t.stop());
      setAudioBlob(new Blob(chunksRef.current, {type: mime||"audio/webm"}));
    };
    mr.start(200);
    mediaRef.current = mr;
    setRecording(true);
  }, [deviceId]);

  const stop = useCallback(() => {
    if (mediaRef.current?.state !== "inactive") mediaRef.current?.stop();
    setRecording(false);
  }, []);

  return { recording, audioBlob, level, micError, devices, deviceId, setDeviceId, start, stop, loadDevices };
}

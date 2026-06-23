import { useRef, useState, useCallback } from "react";

export function useRecorder() {
  const mediaRef    = useRef(null);
  const chunksRef   = useRef([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [level,     setLevel]     = useState(0);
  const animRef     = useRef(null);
  const analyserRef = useRef(null);

  const start = useCallback(async () => {
    setAudioBlob(null);
    chunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ctx      = new AudioContext();
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setLevel(Math.min(avg / 80, 1));
      animRef.current = requestAnimationFrame(tick);
    };
    tick();

    const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      cancelAnimationFrame(animRef.current);
      setLevel(0);
      ctx.close();
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);
    };
    mr.start(100);
    mediaRef.current = mr;
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  }, []);

  return { recording, audioBlob, level, start, stop };
}

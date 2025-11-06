import { useEffect, useRef, useState } from "react";

// Lightweight singleton manager to ensure only one audio element plays at a time.
const audioManager = (() => {
  let current: HTMLAudioElement | null = null;
  return {
    claim(a: HTMLAudioElement) {
      if (current && current !== a) {
        try { current.pause(); } catch {}
      }
      current = a;
    },
    release(a: HTMLAudioElement) {
      if (current === a) current = null;
    },
    pauseAll() {
      if (current) {
        try { current.pause(); } catch {}
        current = null;
      }
    }
  };
})();

// Simple WebAudio hook that wraps an HTMLAudioElement and exposes an Analyser for a visualizer.
export function useAudio(src: string) {
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [levels, setLevels] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // create audio element (but do not autoplay)
    const el = new Audio();
    el.src = src;
    el.crossOrigin = "anonymous";
    el.preload = "none";
    audioElRef.current = el;

    const onEnded = () => {
      setIsPlaying(false);
      audioManager.release(el);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        el.pause();
        audioManager.release(el);
        el.src = "";
      } catch {}
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch {}
        ctxRef.current = null;
      }
    };
  }, [src]);

  const ensureAudioGraph = () => {
    if (!audioElRef.current) return false;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioElRef.current!);
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
      return true;
    } catch (err: any) {
      setError(err?.message || String(err));
      return false;
    }
  };

  const pulse = () => {
    const a = analyserRef.current;
    if (!a) return;
    const buf = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(buf);
    setLevels(buf);
    rafRef.current = requestAnimationFrame(pulse);
  };

  const play = async () => {
    if (!audioElRef.current) return;
    // ensure graph (must be created after a user gesture in many browsers)
    ensureAudioGraph();
    try {
      // Claim this audio element so other players pause
      audioManager.claim(audioElRef.current);
      // Resume audio context if suspended (autoplay policy)
      if (ctxRef.current && ctxRef.current.state === "suspended") await ctxRef.current.resume();
      await audioElRef.current.play();
      setIsPlaying(true);
      if (analyserRef.current && !rafRef.current) pulse();
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  const pause = () => {
    if (!audioElRef.current) return;
    audioElRef.current.pause();
    // release ownership when paused
    audioManager.release(audioElRef.current);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const toggle = async () => {
    if (isPlaying) pause(); else await play();
  };

  return { audioEl: audioElRef.current, isPlaying, play, pause, toggle, levels, error };
}

export default useAudio;

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// Lightweight singleton manager to ensure only one audio element plays at a time.
const audioManager = (() => {
  let current: HTMLAudioElement | null = null;
  return {
    claim(a: HTMLAudioElement) {
      if (current && current !== a) {
        try { current.pause(); } catch {
          // ignore
          void 0;
        }
      }
      current = a;
    },
    release(a: HTMLAudioElement) {
      if (current === a) current = null;
    },
    pauseAll() {
      if (current) {
        try { current.pause(); } catch {
          // ignore
          void 0;
        }
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
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
    const onTime = () => {
      try { setCurrentTime(el.currentTime || 0); } catch {
        void 0;
      }
    };
    const onLoaded = () => {
      try { setDuration(isFinite(el.duration) ? el.duration : null); } catch {
        void 0;
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onCanPlay = () => setError(null);
    const onError = () => {
      const e = (el.error && el.error.message) ? el.error.message : "Audio playback error";
      setError(e);
      console.warn("Audio element error:", el.error);
    };

  el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);
  el.addEventListener("timeupdate", onTime);
  el.addEventListener("loadedmetadata", onLoaded);

    return () => {
  el.removeEventListener("ended", onEnded);
  el.removeEventListener("play", onPlay);
  el.removeEventListener("pause", onPause);
  el.removeEventListener("canplay", onCanPlay);
  el.removeEventListener("error", onError);
  el.removeEventListener("timeupdate", onTime);
  el.removeEventListener("loadedmetadata", onLoaded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        el.pause();
        audioManager.release(el);
        el.src = "";
      } catch {
        void 0;
      }
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch {
          void 0;
        }
        ctxRef.current = null;
      }
    };
  }, [src]);

  const ensureAudioGraph = () => {
    if (!audioElRef.current) return false;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!ctxRef.current) {
        if (!AC) throw new Error("WebAudio not supported in this browser");
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audioElRef.current!);
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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
    const ok = ensureAudioGraph();
    try {
      // Claim this audio element so other players pause
      audioManager.claim(audioElRef.current);
      // Resume audio context if suspended (autoplay policy)
      if (ctxRef.current && ctxRef.current.state === "suspended") await ctxRef.current.resume();
      // attempt to play; if AudioContext couldn't be created, still try the element directly
      try {
        await audioElRef.current.play();
      } catch (err: unknown) {
        // If play fails, surface a helpful error message
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.warn("audio.play() failed:", err);
        // If we couldn't create the audio graph but play failed, try loading the element then play once more
        if (!ok) {
          try {
            audioElRef.current.load();
            await audioElRef.current.play();
          } catch (err2: unknown) {
            const msg2 = err2 instanceof Error ? err2.message : String(err2);
            setError(msg2);
            console.warn("audio.play() retry failed:", err2);
            return;
          }
        } else {
          return;
        }
      }
      setIsPlaying(true);
      if (analyserRef.current && !rafRef.current) pulse();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
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

  const seek = (t: number) => {
    if (!audioElRef.current) return;
    try { audioElRef.current.currentTime = Math.max(0, Math.min(t, audioElRef.current.duration || t)); } catch {
      void 0;
    }
    setCurrentTime(audioElRef.current.currentTime || 0);
  };

  const toggle = async () => {
    if (isPlaying) pause(); else await play();
  };

  return { audioEl: audioElRef.current, isPlaying, play, pause, toggle, levels, error, currentTime, duration, seek };
}

export default useAudio;

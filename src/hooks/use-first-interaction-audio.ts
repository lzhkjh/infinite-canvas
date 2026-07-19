import * as React from "react";

/**
 * Plays an audio file on the first user interaction (click, touch, or keypress).
 * @param src - Public path to the audio file (e.g. "/music.mp3")
 */
export function useFirstInteractionAudio(src: string) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);

  React.useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    // Bind first-interaction listeners
    const trigger = () => {
      if (hasInteracted) return;
      setHasInteracted(true);
      audio.play().catch(() => {
        // Autoplay may be blocked; user can retry by clicking
      });
    };

    document.addEventListener("click", trigger, { once: true });
    document.addEventListener("touchstart", trigger, { once: true });
    document.addEventListener("keydown", trigger, { once: true });

    return () => {
      document.removeEventListener("click", trigger);
      document.removeEventListener("touchstart", trigger);
      document.removeEventListener("keydown", trigger);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return { hasInteracted, volume, setVolume };
}

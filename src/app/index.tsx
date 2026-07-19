import * as React from "react";
import manifest from "~/src/artworks/manifest.json";
import { Frame } from "~/src/frame";
import { InfiniteCanvas } from "~/src/infinite-canvas";
import type { MediaItem } from "~/src/infinite-canvas/types";
import { PageLoader } from "~/src/loader";
import { GestureOverlay } from "~/src/gesture-overlay";
import { useHandibleGesture } from "~/src/hooks/use-handible-gesture";

export function App() {
  const [media] = React.useState<MediaItem[]>(manifest);
  const [textureProgress, setTextureProgress] = React.useState(0);
  const {
    videoRef,
    startGestureControl,
    stopGestureControl,
    isGestureActive,
    gestureState,
  } = useHandibleGesture();

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);

  // Create audio ONCE on mount
  React.useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const trigger = () => {
      setHasInteracted(true);
      audio.play().catch(() => {});
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
  }, []);

  // Update volume when changed
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleGestureControl = async () => {
    if (isGestureActive) {
      stopGestureControl();
    } else {
      await startGestureControl();
    }
  };

  if (!media.length) {
    return <PageLoader progress={0} />;
  }

  return (
    <>
      <Frame />
      <PageLoader progress={textureProgress} />
      <InfiniteCanvas
        media={media}
        onTextureProgress={setTextureProgress}
        gestureState={isGestureActive ? gestureState : undefined}
      />

      {/* Music control */}
      {hasInteracted && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "10px 16px",
            borderRadius: "10px",
            color: "#fff",
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
          }}
        >
          <button
            onClick={togglePlay}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
            }}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: "80px", accentColor: "#00cc66" }}
          />
          <span>{Math.round(volume * 100)}%</span>
        </div>
      )}

      <button
        onClick={toggleGestureControl}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          padding: "12px 24px",
          backgroundColor: isGestureActive ? "#ff4444" : "#00cc66",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          transition: "all 0.3s ease",
        }}
      >
        {isGestureActive ? "停止手势控制" : "启用手势控制"}
      </button>
      {isGestureActive && (
        <GestureOverlay
          videoRef={videoRef}
          gestureState={gestureState}
          onStop={toggleGestureControl}
        />
      )}
    </>
  );
}

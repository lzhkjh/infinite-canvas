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
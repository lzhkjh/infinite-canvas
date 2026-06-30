import * as React from "react";

interface GestureOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  gestureState: any;
  onStop: () => void;
}

export function GestureOverlay({
  videoRef,
  gestureState,
  onStop,
}: GestureOverlayProps) {
  const [cameraError, setCameraError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onError = () => {
      setCameraError("摄像头无画面，请检查浏览器权限");
    };
    video.addEventListener("error", onError);
    return () => video.removeEventListener("error", onError);
  }, [videoRef]);

  const gestureLabels: Record<string, string> = {
    forward: "👆 前进",
    backward: "✋ 后退",
    left: "⬅ 左转",
    right: "➡ 右转",
    up: "⬆ 上升",
    down: "⬇ 下降",
  };

  let activeLabel = "等待手势...";
  if (gestureState.forward) activeLabel = gestureLabels.forward;
  else if (gestureState.backward) activeLabel = gestureLabels.backward;
  else if (gestureState.left) activeLabel = gestureLabels.left;
  else if (gestureState.right) activeLabel = gestureLabels.right;
  else if (gestureState.up) activeLabel = gestureLabels.up;
  else if (gestureState.down) activeLabel = gestureLabels.down;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "white",
        padding: "16px",
        borderRadius: "12px",
        fontFamily: "Arial, sans-serif",
        minWidth: "220px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.6)",
      }}
    >
      <h3
        style={{ margin: "0 0 12px 0", fontSize: "16px", color: "#00ffff" }}
      >
        手势控制
      </h3>
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "12px",
            marginBottom: "6px",
            color: "#aaa",
          }}
        >
          当前手势:
        </div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: "bold",
            minHeight: "20px",
          }}
        >
          {activeLabel}
        </div>
      </div>
      <div
        style={{
          fontSize: "12px",
          marginBottom: "12px",
          color: "#aaa",
        }}
      >
        速度: {Math.round(gestureState.velocity * 100)}%
      </div>
      <video
        ref={videoRef}
        style={{
          width: "160px",
          height: "120px",
          borderRadius: "8px",
          border: "2px solid #00ffff",
          transform: "scaleX(-1)",
          display: "block",
          marginBottom: "10px",
          objectFit: "cover",
          backgroundColor: "#111",
        }}
        autoPlay
        muted
        playsInline
      />
      {cameraError && (
        <div
          style={{
            fontSize: "11px",
            color: "#ff6666",
            marginBottom: "8px",
          }}
        >
          {cameraError}
        </div>
      )}
      <button
        onClick={onStop}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: "#ff4444",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        停止手势控制
      </button>
    </div>
  );
}

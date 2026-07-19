import { useState, useEffect, useRef, useCallback } from "react";

interface GestureControlResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  startGestureControl: () => Promise<void>;
  stopGestureControl: () => void;
  isGestureActive: boolean;
  gestureState: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    velocity: number;
    gestureName: string;
    extendedFingers: number;
  };
}

export function useHandibleGesture(): GestureControlResult {
  const videoRef = useRef<HTMLVideoElement>(null as unknown as HTMLVideoElement);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [gestureState, setGestureState] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    velocity: 0,
    gestureName: "none",
    extendedFingers: 0,
  });

  const handLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stabilization: require N consecutive frames of the same gesture before switching
  const GESTURE_STABLE_FRAMES = 8;
  const lastGestureRef = useRef<string>("none");
  const gestureFrameCountRef = useRef<number>(0);

  const startGestureControl = useCallback(async () => {
    try {
      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });

      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;

      let retries = 0;
      while (!videoRef.current && retries < 50) {
        await new Promise((r) => setTimeout(r, 100));
        retries++;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const onLoaded = () => {
            videoRef.current!.removeEventListener("loadeddata", onLoaded);
            resolve();
          };
          videoRef.current!.addEventListener("loadeddata", onLoaded);
          if (videoRef.current!.readyState >= 2) {
            videoRef.current!.removeEventListener("loadeddata", onLoaded);
            resolve();
          }
        });
      }

      setIsGestureActive(true);
    } catch (error) {
      console.error("Failed to start gesture control:", error);
      setIsGestureActive(false);
    }
  }, []);

  const stopGestureControl = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    handLandmarkerRef.current = null;
    lastGestureRef.current = "none";
    gestureFrameCountRef.current = 0;
    setIsGestureActive(false);
    setGestureState({
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      velocity: 0,
      gestureName: "none",
      extendedFingers: 0,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isGestureActive || !videoRef.current || !handLandmarkerRef.current)
      return;

    const detectLoop = async () => {
      if (!isGestureActive || !videoRef.current || !handLandmarkerRef.current)
        return;
      if (videoRef.current.readyState >= 2) {
        const results = handLandmarkerRef.current.detectForVideo(
          videoRef.current,
          performance.now()
        );
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          const thumbTip = landmarks[4];
          const indexUp = indexTip.y < landmarks[6].y;
          const middleUp = middleTip.y < landmarks[9].y;
          const ringUp = ringTip.y < landmarks[14].y;
          const pinkyUp = pinkyTip.y < landmarks[18].y;
          const thumbUp = thumbTip.x > landmarks[3].x;
          const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(
            Boolean
          ).length;

          // Determine gesture name from extended fingers
          let gestureName = "none";
          if (extendedCount === 1 && indexUp) {
            gestureName = "forward";
          } else if (extendedCount === 2 && indexUp && middleUp) {
            gestureName = "backward";
          } else if (extendedCount === 3 && indexUp && middleUp && ringUp) {
            gestureName = "left";
          } else if (extendedCount === 4 && thumbUp) {
            gestureName = "down";
          } else if (extendedCount === 4) {
            gestureName = "right";
          } else if (extendedCount === 0) {
            gestureName = "up";
          }

          // Stabilization: only switch gesture after N consecutive frames
          if (lastGestureRef.current === gestureName) {
            gestureFrameCountRef.current += 1;
            if (gestureFrameCountRef.current >= GESTURE_STABLE_FRAMES) {
              // Apply gesture
              const newState = {
                forward: gestureName === "forward",
                backward: gestureName === "backward",
                left: gestureName === "left",
                right: gestureName === "right",
                up: gestureName === "up",
                down: gestureName === "down",
                velocity: 0.8,
                gestureName: gestureName,
                extendedFingers: extendedCount,
              };
              setGestureState(newState);
            }
          } else {
            // New gesture detected, reset counter
            lastGestureRef.current = gestureName;
            gestureFrameCountRef.current = 1;
            
            if (gestureFrameCountRef.current >= GESTURE_STABLE_FRAMES) {
              const newState = {
                forward: gestureName === "forward",
                backward: gestureName === "backward",
                left: gestureName === "left",
                right: gestureName === "right",
                up: gestureName === "up",
                down: gestureName === "down",
                velocity: 0.8,
                gestureName: gestureName,
                extendedFingers: extendedCount,
              };
              setGestureState(newState);
            } else {
              // Not stable yet, keep previous state but don't apply new one
              const prevState = gestureState;
              setGestureState(prevState);
            }
          }
        } else {
          // No hand detected - reset gesture
          lastGestureRef.current = "none";
          gestureFrameCountRef.current = 0;
          setGestureState({
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            velocity: 0,
            gestureName: "none",
            extendedFingers: 0,
          });
        }
      }
      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animationFrameRef.current = requestAnimationFrame(detectLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isGestureActive]);

  return {
    videoRef,
    startGestureControl,
    stopGestureControl,
    isGestureActive,
    gestureState,
  };
}

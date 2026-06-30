import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { predictWebcam } from "./handTracking.js";

// New: Function to activate webcam in corner
export async function activateWebcamInCorner(videoElement) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;
    videoElement.onloadeddata = () => {
      console.log("웹캠 비디오 로드 완료.");
    };
    // Apply corner styling (assumes style.css is loaded; users can override)
    videoElement.style.position = 'fixed';
    videoElement.style.bottom = '20px';
    videoElement.style.right = '20px';
    videoElement.style.width = '240px';
    videoElement.style.height = '180px';
    videoElement.style.borderRadius = '12px';
    videoElement.style.border = '2px solid #00ffff';
    videoElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
    videoElement.style.zIndex = '100';
    videoElement.style.transform = 'scaleX(-1)'; // Mirror effect
    document.body.appendChild(videoElement); // Add to body if not already
  } catch (error) {
    console.error("웹캠 접근 오류:", error);
    document.getElementById("loading-message").textContent =
      "오류: 웹캠에 접근할 수 없습니다. 카메라 접근을 허용해 주십시오.";
    document.getElementById("loading-message").style.color = "red";
  }
}

// Updated: Combined init into one function for one-line activation
export async function initializeMediaPipe(videoElement) {
  console.log("MediaPipe HandLandmarker 모델 로드 중...");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
  console.log("MediaPipe HandLandmarker 로드 완료.");

  // Activate webcam and start prediction
  await activateWebcamInCorner(videoElement);
  videoElement.onloadeddata = () => predictWebcam(videoElement, handLandmarker);

  return handLandmarker; // Return for further use if needed
}
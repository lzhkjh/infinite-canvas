// index.js - Entry point for the hand gesture control library

import { activateWebcamInCorner, initializeMediaPipe } from "./mediaPipeSetup.js";
import { setSceneObjects, getSceneObjects } from "./sceneManager.js";
import { audioSystem, toggleButtonSounds, setButtonVolume, AudioSystem } from "./audioSystem.js";
import { 
  initGestureControl, 
  isPinching2D, 
  onPinchStart, 
  onPinchEnd, 
  registerOnPinchStart, 
  registerOnPinchEnd, 
  updateRaycast, 
  grabNearestObject, 
  getRayVisualsPerHand, 
  getConeVisualsPerHand,
  SurfaceInteractionSystem,
  isPinchingState,
  lastSnappedSquarePerHand,
  BUTTON_HOVER_THRESHOLD,
  UIBUTTON_HOVER_THRESHOLD,
  UI_CURSOR_THRESHOLD,
  CHESSBOARD_SIZE,
  HIGHLIGHT_COLOR,
  sceneLoader
} from "./gestureControl.js";
import { 
  handConfig, 
  setupHandTracking, 
  getWristPosition, 
  getForwardDirection, 
  predictWebcam, 
  cleanupHandTracking, 
  getHandTrackingData 
} from "./handTracking.js";

// Re-export core functions and configurations for easy import
export { activateWebcamInCorner, initializeMediaPipe };
export { setSceneObjects, getSceneObjects };
export { audioSystem, toggleButtonSounds, setButtonVolume, AudioSystem };
export { 
  initGestureControl, 
  isPinching2D, 
  onPinchStart, 
  onPinchEnd, 
  registerOnPinchStart, 
  registerOnPinchEnd, 
  updateRaycast, 
  grabNearestObject, 
  getRayVisualsPerHand, 
  getConeVisualsPerHand,
  SurfaceInteractionSystem,
  isPinchingState,
  lastSnappedSquarePerHand,
  BUTTON_HOVER_THRESHOLD,
  UIBUTTON_HOVER_THRESHOLD,
  UI_CURSOR_THRESHOLD,
  CHESSBOARD_SIZE,
  HIGHLIGHT_COLOR,
  sceneLoader
};
export { 
  handConfig, 
  setupHandTracking, 
  getWristPosition, 
  getForwardDirection, 
  predictWebcam, 
  cleanupHandTracking, 
  getHandTrackingData 
};

// Optional: Export a convenience function to initialize the library with a Three.js scene
// Assumes user has set up their own Three.js scene, camera, renderer, etc.
// and passes them via setSceneObjects({ scene, camera, renderer, controls })
export async function startGestureControl(videoElement, scene, numHands = 2) {
  // Initialize MediaPipe with the provided video element
  const handLandmarker = await initializeMediaPipe(videoElement);
  
  // Set up hand tracking in the provided scene
  await setupHandTracking(scene);
  
  // Initialize gesture control in the provided scene
  initGestureControl(scene, numHands);
  
  // Return handLandmarker for manual prediction if needed
  return handLandmarker;
}
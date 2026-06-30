import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";
import { getSceneObjects } from "./sceneManager.js";
import { setupThreeScene } from "./threeSetup.js";
import { initializeMediaPipe } from "./mediaPipeSetup.js";
import { setupHandTracking } from "./handTracking.js";
import { initGestureControl, sceneLoader } from './gestureControl.js';
import { setupTableScene } from "./tableSetup.js";
import { startGestureControl } from "./index.js";



let scene, camera, renderer;
let video;
let handLandmarker;
let controls;

async function init() {
  console.log("애플리케이션 초기화 중...");
  
  // Initialize loading system first
  sceneLoader.init();
  
  // Show initial loading gauge
  sceneLoader.show('initial');
  sceneLoader.loadingText.textContent = 'Initializing Handible';
  sceneLoader.loadingSubtitle.textContent = 'Setting up environment...';
  
  // Start progress simulation for initial load
  const progressPromise = sceneLoader.simulateProgress(3000);
  
  document.getElementById("ema-alpha-display").textContent = 0.35;

  // Small delay to let loading animation start
  await new Promise(resolve => setTimeout(resolve, 100));
  
  sceneLoader.setSubtitle('Loading Three.js scene...');
  
  // Initialize Three.js
  setupThreeScene(); 

  // Add resize listener once, using current objects
  window.addEventListener("resize", onResize);

  sceneLoader.setSubtitle('Initializing MediaPipe...');
  
  // Initialize MediaPipe HandLandmarker
  video = document.getElementById("webcamVideo");

  sceneLoader.setSubtitle('Setting up hand tracking...');
  
  await startGestureControl(video, getSceneObjects().scene, 2);

  // Wait for progress animation to complete
  await progressPromise;
  
  sceneLoader.setSubtitle('Ready!');
  
  // Small delay before hiding
  await new Promise(resolve => setTimeout(resolve, 300));

  // Hide both loading systems
  document.getElementById("loading-message").style.display = "none";
  sceneLoader.hide();
  
  animate();
}

function onResize() {
  const { camera, renderer } = getSceneObjects();
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const { scene, camera, renderer, controls } = getSceneObjects(); // Fetch fresh each frame
  controls.update();
  renderer.render(scene, camera);
}

window.onload = init;
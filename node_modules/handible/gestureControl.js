import * as THREE from "three";
import { getSceneObjects } from "./sceneManager.js";
import { cleanupHandTracking, getHandTrackingData, setupHandTracking } from "./handTracking.js";
import { audioSystem } from "./audioSystem.js";

// Loading System for Scene Transitions
class SceneLoadingSystem {
  constructor() {
    this.overlay = null;
    this.gaugeFill = null;
    this.loadingText = null;
    this.loadingSubtitle = null;
    this.progress = 0;
    this.isActive = false;
  }

  init() {
    this.overlay = document.getElementById('sceneLoadingOverlay');
    this.gaugeFill = document.getElementById('gaugeFill');
    this.loadingText = document.getElementById('loadingText');
    this.loadingSubtitle = document.getElementById('loadingSubtitle');
  }

  show(sceneName = '') {
    if (!this.overlay) this.init();
    
    this.isActive = true;
    this.progress = 0;
    
    // Update text based on scene
    const sceneDisplayNames = {
      'whiteboard': 'Demo Scene',
      'table': 'Table Scene',
      'simple': 'Simple Scene'
    };
    
    this.loadingText.textContent = `Loading ${sceneDisplayNames[sceneName] || 'Scene'}`;
    this.loadingSubtitle.textContent = 'Initializing environment...';
    
    // Show overlay with fade in
    this.overlay.classList.add('active');
    this.updateGauge(0);
  }

  hide() {
    if (!this.overlay) return;
    
    this.isActive = false;
    this.overlay.classList.remove('active');
  }

  updateGauge(progress) {
    if (!this.gaugeFill || !this.isActive) return;
    
    this.progress = Math.max(0, Math.min(100, progress));
    const rotation = (this.progress / 100) * 360;
    this.gaugeFill.style.transform = `rotate(${-90 + rotation}deg)`;
  }

  setSubtitle(text) {
    if (this.loadingSubtitle) {
      this.loadingSubtitle.textContent = text;
    }
  }

  // Simulate realistic loading progress with stages
  async simulateProgress(totalDuration = 2000) {
    if (!this.isActive) return;

    const stages = [
      { progress: 15, text: 'Disposing old scene...' },
      { progress: 35, text: 'Loading scene assets...' },
      { progress: 60, text: 'Setting up lighting...' },
      { progress: 80, text: 'Initializing hand tracking...' },
      { progress: 95, text: 'Finalizing setup...' },
      { progress: 100, text: 'Ready!' }
    ];

    for (const stage of stages) {
      if (!this.isActive) break;
      
      this.setSubtitle(stage.text);
      await this.animateToProgress(stage.progress, totalDuration / stages.length);
      
      // Small delay between stages for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async animateToProgress(targetProgress, duration) {
    const startProgress = this.progress;
    const progressDiff = targetProgress - startProgress;
    const startTime = Date.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentProgress = startProgress + (progressDiff * easeProgress);
        
        this.updateGauge(currentProgress);
        
        if (progress >= 1) {
          resolve();
        } else {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }
}

// Create global instance
const sceneLoader = new SceneLoadingSystem();

// Core state management
const raycaster = new THREE.Raycaster();
let grabbedObject = null;
let sceneCache = {};

/**
 * Surface interaction system for handling cursor interactions with flat surfaces
 */
class SurfaceInteractionSystem {
  constructor() {
    this.surfaces = new Map();
    this.hoveredButtons = new Map(); // Store hovered button per hand-surface combination
  }

  registerSurface(surface, config) {
    const defaultConfig = {
      width: 1,
      height: 1,
      cursorScaleFactor: 2.5,
      buttonHoverThreshold: 0.4,
      getNormal: () => new THREE.Vector3(0, 0, 1),
      getButtonFilter: () => true,
      handleCursorPosition: null
    };

    this.surfaces.set(surface.uuid, {
      surface,
      config: { ...defaultConfig, ...config }
    });
  }

  getSurfaceConfig(surface) {
    return this.surfaces.get(surface.uuid)?.config;
  }

  getHoveredButton(surface, handIndex) {
    const key = `${surface.uuid}-${handIndex}`;
    return this.hoveredButtons.get(key);
  }

  setHoveredButton(surface, handIndex, button) {
    const key = `${surface.uuid}-${handIndex}`;
    if (button) {
      this.hoveredButtons.set(key, button);
    } else {
      this.hoveredButtons.delete(key);
    }
  }

  updateCursorOnSurface(handIndex, handLandmarks, surface, cone) {
    const config = this.getSurfaceConfig(surface);
    if (!config) return false;

    const cursorPoint = handLandmarks[3];
    let worldPos;

    // Check for chessboard first
    const chessboard = surface.getObjectByProperty('isChessboard', true);
    if (chessboard) {
      worldPos = this.handleChessboardInteraction(handIndex, cursorPoint, surface, chessboard, cone);
    } else if (config.handleCursorPosition) {
      worldPos = config.handleCursorPosition(cursorPoint, surface, config);
    } else {
      const scaledX = cursorPoint.x * config.cursorScaleFactor;
      const scaledY = cursorPoint.y * config.cursorScaleFactor;
      
      const clampedX = Math.max(-config.width / 2, Math.min(config.width / 2, scaledX));
      const clampedY = Math.max(-config.height / 2, Math.min(config.height / 2, scaledY));

      const localPos = new THREE.Vector3(clampedX, clampedY, 0);
      worldPos = localPos.applyMatrix4(surface.matrixWorld);
    }

    if (!worldPos) return false;

    const normal = config.getNormal(surface);
    const coneDirection = normal.clone().negate();
    
    cone.position.copy(worldPos).add(normal.clone().multiplyScalar(CONE_HEIGHT));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coneDirection);
    cone.visible = true;

    // Update grabbed object position if any
    if (grabbedObject && grabbedObject.userData.handIndex === handIndex) {
      if (grabbedObject.userData.isKnob) {
        this.handleKnobMovement(grabbedObject, cone, surface);
      } else {
        grabbedObject.position.copy(cone.position);
      }
    }

    const buttons = surface.children.filter(config.getButtonFilter);
    this.handleButtonInteractions(handIndex, cone, surface, buttons, config.buttonHoverThreshold);

    return true;
  }

  handleButtonInteractions(handIndex, cone, surface, buttons, threshold) {
    // Reset previously hovered button if it's no longer in the buttons list
    const previousHovered = this.getHoveredButton(surface, handIndex);
    if (previousHovered && !buttons.includes(previousHovered)) {
      this.resetButtonState(previousHovered);
      this.setHoveredButton(surface, handIndex, null);
    }

    // Find closest button within threshold
    let closestButton = null;
    let minDistance = Infinity;

    for (const button of buttons) {
      if (!button.userData.defaultPosition) {
        button.userData.defaultPosition = button.position.clone();
      }

      const buttonWorldPos = new THREE.Vector3();
      button.getWorldPosition(buttonWorldPos);
      const distanceToButton = cone.position.distanceTo(buttonWorldPos);

      if (distanceToButton < threshold) {
        if (!isPinchingState[handIndex]) {
          this.setButtonHoverState(button);
        }
        if (distanceToButton < minDistance) {
          minDistance = distanceToButton;
          closestButton = button;
        }
      } else if (button === previousHovered) {
        this.resetButtonState(button);
      }
    }

    // Update hover state
    this.setHoveredButton(surface, handIndex, closestButton);

    // Update cone position if hovering over a button
    if (closestButton) {
      const buttonWorldPos = new THREE.Vector3();
      closestButton.getWorldPosition(buttonWorldPos);
      const normal = this.getSurfaceConfig(surface)?.getNormal(surface) || new THREE.Vector3(0, 0, 1);
      const buttonTop = buttonWorldPos.clone().add(normal.clone().multiplyScalar(0.05));
      cone.position.copy(buttonTop).add(normal.clone().multiplyScalar(CONE_HEIGHT));
    }
  }

  setButtonHoverState(button) {
    if (!button) return;
    button.scale.set(1.1, 1.1, 1.1);
    button.material.color.set(button.userData.hoverColor || 0xffa500);
  }

  resetButtonState(button) {
    if (!button) return;
    button.scale.set(1, 1, 1);
    button.material.color.set(button.userData.defaultColor || 0xffffff);
  }

  handleChessboardInteraction(handIndex, cursorPoint, surface, chessboard, cone) {
    const scaledX = cursorPoint.x * CHESSBOARD_SCALE_FACTOR;
    const scaledZ = -cursorPoint.y * CHESSBOARD_SCALE_FACTOR;

    // Map to grid 0-7
    const col = Math.floor((scaledX + 1) * (CHESSBOARD_SIZE / 2));
    const row = Math.floor((scaledZ + 1) * (CHESSBOARD_SIZE / 2));
    const clampedCol = Math.max(0, Math.min(CHESSBOARD_SIZE - 1, col));
    const clampedRow = Math.max(0, Math.min(CHESSBOARD_SIZE - 1, row));

    // Get square and its world position
    const squareIndex = clampedRow * CHESSBOARD_SIZE + clampedCol;
    const square = chessboard.children[squareIndex];
    
    if (!square) return null;

    // Reset previous square colors
    chessboard.children.forEach(s => {
      if (s !== square) {
        // Store original color if not already stored
        if (!s.userData.defaultColor) {
          s.userData.defaultColor = s.material.color.clone();
        }
        s.material.color.set(s.userData.defaultColor);
        s.userData.isHighlighted = false; // Reset highlight flag
      }
    });

    // Store original color if not already stored
    if (!square.userData.defaultColor) {
      square.userData.defaultColor = square.material.color.clone();
    }

    // Highlight current square
    const currentColor = square.material.color.clone();
    if (!square.userData.isHighlighted) {
      square.userData.isHighlighted = true;
      square.userData.lastColor = currentColor;
      square.material.color.set(HIGHLIGHT_COLOR);
    }
    
    // Get world position for cursor
    const worldPos = new THREE.Vector3();
    square.getWorldPosition(worldPos);

    // Store last snapped square
    lastSnappedSquarePerHand[handIndex] = { row: clampedRow, col: clampedCol, square };

    // Update grabbable objects on the chessboard
    const grabbableObjects = chessboard.children.filter(obj => obj.userData.isGrabbable);
    grabbableObjects.forEach(obj => {
      // Ensure we preserve the original color
      if (!obj.userData.defaultColor) {
        obj.userData.defaultColor = obj.material.color.clone();
      }
      if (!obj.userData.handIndex) {
        obj.material.color.copy(obj.userData.defaultColor);
      }
    });

    return worldPos;
  }

  handleKnobMovement(knob, cone, surface) {
    if (!knob.userData.isKnob) return;

    raycaster.set(cone.position, smoothedRayDirections[knob.userData.handIndex]);
    const intersects = raycaster.intersectObject(surface);
    
    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;
      const localPos = intersectPoint.clone().applyMatrix4(surface.matrixWorld.clone().invert());
      localPos.x = Math.max(-1.5, Math.min(1.5, localPos.x));
      localPos.y = -0.5;
      localPos.z = 0.1;
      knob.position.copy(localPos.applyMatrix4(surface.matrixWorld));
    }
  }
}

// Create single instance of surface system
const surfaceSystem = new SurfaceInteractionSystem();

// Export surface system for advanced usage
export { surfaceSystem as SurfaceInteractionSystem };

// Visual elements arrays
const rayVisualsPerHand = [];
const coneVisualsPerHand = [];
const smoothedRayOrigins = [];
const smoothedRayDirections = [];

// Gesture state
export const isPinchingState = Array(2).fill(false);
const EMA_ALPHA = 0.35; // Match hand tracking smoothing
const GRAB_SCALE_FACTOR = 3; // Scale grabbed object for visual feedback
const CLOSE_DISTANCE_THRESHOLD = 3.0; // Increased further to ensure interactions trigger
const SPHERE_RADIUS = 0.05; // Size of the created sphere
const CONE_RADIUS = 0.05; // Radius of the cone base
const CONE_HEIGHT = 0.1; // Height of the cone
const WHITEBOARD_WIDTH = 5; // Matches whiteboard width in threeSetup.js
const WHITEBOARD_HEIGHT = 3; // Matches whiteboard height in threeSetup.js
const TABLE_WIDTH = 3;
const TABLE_DEPTH = 2;
const TABLE_CURSOR_SCALE_FACTOR = 2.5; // Adjust as needed; higher = more coverage on table
const UI_PANEL_WIDTH = 1.0;
const UI_PANEL_HEIGHT = 0.6;
const CURSOR_SCALE_FACTOR = 2.5; // Adjust as needed to fit webcam FOV to whiteboard; higher = more coverage
const BUTTON_HOVER_THRESHOLD = 0.4; // Increased to account for 3D button size
const UIBUTTON_HOVER_THRESHOLD = 0.2; // Threshold for UI button hover (reduced for more precise interaction)
const UI_CURSOR_THRESHOLD = 1.5; // Distance threshold for right hand to UI panel
const UI_CURSOR_SENSITIVITY = 1.0; // Controls sensitivity of wrist rotation for UI cursor
const UI_CURSOR_ROTATION_OFFSET = -Math.PI / 6; // Rotation offset only for UI panel cursor
const KNOB_HOVER_THRESHOLD = 0.6; // Increased for easier knob grabbing

const CHESSBOARD_SIZE = 8; // 8x8 grid
const CHESSBOARD_SCALE_FACTOR = 4; // Adjust sensitivity to cover the chessboard; higher = more grid coverage
const HIGHLIGHT_COLOR = 0xffff00; // Yellow for snapped square
const ORANGE_COLOR = 0xffa500; // Orange for selected square
export const lastSnappedSquarePerHand = Array(2).fill(null); // {row, col, square} per hand

let onPinchStartCallbacks = []; // New: Array for user callbacks
let onPinchEndCallbacks = []; // New: Array for user callbacks

// New: Simple registration functions
export function registerOnPinchStart(callback) {
  onPinchStartCallbacks.push(callback);
}

export function registerOnPinchEnd(callback) {
  onPinchEndCallbacks.push(callback);
}

// Initialize ray and cone visuals for each hand
export function initGestureControl(scene, numHands) {
  for (let i = 0; i < numHands; i++) {
    // Cone visual (no initial rotation; we'll set quaternion dynamically)
    const coneGeometry = new THREE.ConeGeometry(CONE_RADIUS, CONE_HEIGHT, 32);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red cone
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.visible = false;
    scene.add(cone);
    coneVisualsPerHand.push(cone);

    smoothedRayOrigins.push(new THREE.Vector3());
    smoothedRayDirections.push(new THREE.Vector3(0, 0, -1));
  }
}

// returns boolean whether the hand is pinching
export function isPinching2D(rawLandmarks, videoWidth, videoHeight, thresholdPixels = 30) {
  const thumbTip = rawLandmarks[4];
  const indexTip = rawLandmarks[8];
  const thumbX = thumbTip.x * videoWidth;
  const thumbY = thumbTip.y * videoHeight;
  const indexX = indexTip.x * videoWidth;
  const indexY = indexTip.y * videoHeight;
  const dx = thumbX - indexX;
  const dy = thumbY - indexY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < thresholdPixels;
}

export function onPinchStart(handIndex, handedness, isUIActive) {
  // Call user callbacks
  onPinchStartCallbacks.forEach(cb => cb(handIndex, handedness));

  console.log("pinch Start", handIndex, handedness, isUIActive);
  // console.log(`Hand ${handIndex} pinch START, isUIActive: ${isUIActive}, handedness: ${handedness}`);
  const { scene } = getSceneObjects();
  const { smoothedLandmarksPerHand } = getHandTrackingData();
  const handLandmarks = smoothedLandmarksPerHand[handIndex];

  const cone = coneVisualsPerHand[handIndex];

  // Skip if cursor disabled
  if (isUIActive && handedness === 'Left') {
    console.log(`Hand ${handIndex} skipped: left hand with UI active`);
    return; // Disable for left hand when UI open
  }

  let buttons = [];
  let normal = new THREE.Vector3();
  let triggeredButton = false;

  // right hand UI cursor logic
  if (isUIActive && handedness === 'Right') {
    const panel = scene.children.find(obj => obj.isMesh && obj.material?.color?.getHex() === 0xbffbff); // color matches UI panel
    if (panel) {
      const wrist = handLandmarks[0];
      const distanceToPanel = wrist.distanceTo(panel.position);
      if (distanceToPanel >= UI_CURSOR_THRESHOLD) {
        return; // Skip if right hand not close to UI
      }
      buttons = panel.children.filter(obj => obj.userData.isUIButton);
      normal = new THREE.Vector3(0, 0, 1).applyQuaternion(panel.quaternion).normalize();
    } else {
      // UI panel not found
      return;
    }
  } else {
    const wall = scene.children.find(obj => obj.userData.isWall);
    if (wall) {
      buttons = wall.children.filter(obj => obj.userData.isButton);
      normal = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
    } else {
      const table = scene.children.find(obj => obj.userData.isTable);
      if (table) {
        buttons = table.children.filter(obj => obj.userData.isButton); // If buttons on table
        normal = new THREE.Vector3(0, 1, 0).applyQuaternion(table.quaternion).normalize(); // Up for table
      } else {
        return; // No interactive surface
      }
    }
  }

  // Check for button interactions based on cone proximity
  buttons.forEach(button => {
    const buttonWorldPos = new THREE.Vector3();
    button.getWorldPosition(buttonWorldPos);
    const distanceToButton = cone.position.distanceTo(buttonWorldPos);
    // Use UIBUTTON_HOVER_THRESHOLD for UI buttons, BUTTON_HOVER_THRESHOLD for others
    const threshold = button.userData.isUIButton ? UIBUTTON_HOVER_THRESHOLD : BUTTON_HOVER_THRESHOLD;
    if (distanceToButton < threshold) {
      // Play button click sound
      audioSystem.createClickSound();
      
      // Press effect: move button "down" along its local z (towards board/panel)
      button.position.z -= 0.05; // Depress by half height
      button.material.color.set(button.userData.activeColor);
      console.log("Button pressed:", button);
      
      // Trigger scene switch if this is a scene-switching button
      const action = button.userData.action;
      if (action && action.startsWith('switchTo')) {
        // Extract scene name from action, e.g., "switchToSimpleScene" -> "simple"
        let sceneName = action.replace('switchTo', '').replace('Scene', '').toLowerCase();
        
        // Handle special case for the main scene
        if (sceneName === 'three') {
          sceneName = 'whiteboard';
        }
        
        audioSystem.createSuccessSound(); // Play success sound for scene switch
        switchToScene(sceneName);
      }
      
      triggeredButton = true;
    }
  });

  
  grabNearestObject(handIndex, handedness, isUIActive, triggeredButton); // Pass checks
  

  // Reset buttons after press
  if (triggeredButton) {
    buttons.forEach(button => {
      setTimeout(() => {
        button.position.copy(button.userData.defaultPosition);
        button.material.color.set(button.userData.defaultColor);
      }, 200); // 200ms press duration
    });
  }
}

export function onPinchEnd(handIndex) {
  // Call user callbacks
  onPinchEndCallbacks.forEach(cb => cb(handIndex, handedness));

  console.log(`Hand ${handIndex} pinch END`);
  releaseObject(handIndex);
}

// New: Cache function (call in initGestureControl or on scene switch)
function cacheSceneObjects(scene) {
  sceneCache.wall = scene.children.find(obj => obj.userData.isWall);
  sceneCache.table = scene.children.find(obj => obj.userData.isTable);
  sceneCache.chessboard = scene.getObjectByProperty('isChessboard', true);
  sceneCache.uiPanel = scene.children.find(obj => obj.isMesh && obj.material?.color?.getHex() === 0xbffbff);
  console.log('Scene objects cached'); // Debug
}

// Ray calculation functions
function calculateRayOrigin(handLandmarks) {
  return handLandmarks[3].clone(); // Use thumb IP as ray origin
}

function calculateRayDirection(handLandmarks) {
  const wrist = handLandmarks[0];
  const middleTip = handLandmarks[12];
  return new THREE.Vector3()
    .subVectors(middleTip, wrist)
    .normalize();
}

function smoothRayTransform(handIndex, rayOrigin, rayDirection) {
  smoothedRayOrigins[handIndex].lerp(rayOrigin, EMA_ALPHA);
  smoothedRayDirections[handIndex].lerp(rayDirection, EMA_ALPHA);
  return {
    origin: smoothedRayOrigins[handIndex],
    direction: smoothedRayDirections[handIndex]
  };
}

// UI Panel interaction
function shouldSkipUIInteraction(handedness, isUIActive, wrist, panel) {
  if (!isUIActive) return false;
  
  if (handedness === 'Left') return true;
  
  // Right hand should always be able to interact with UI panel when UI is active
  if (handedness === 'Right') return false;
  
  return false;
}

function getUIPanelIntersection(wrist, rayDirection, panel) {
  // Apply UI-specific rotation offset
  const adjustedDirection = rayDirection.clone();
  const rotationMatrix = new THREE.Matrix4().makeRotationX(UI_CURSOR_ROTATION_OFFSET);
  adjustedDirection.applyMatrix4(rotationMatrix).normalize();

  // Raycast to panel
  raycaster.set(wrist, adjustedDirection);
  const intersects = raycaster.intersectObject(panel);
  
  return intersects.length > 0 ? intersects[0] : null;
}

function calculatePanelInteractionPoint(intersection, panel) {
  if (!intersection) return null;

  // Convert to local coordinates for clamping
  const localPos = intersection.point.clone().applyMatrix4(panel.matrixWorld.clone().invert());
  
  // Clamp to panel bounds
  const clampedX = Math.max(-UI_PANEL_WIDTH / 2, Math.min(UI_PANEL_WIDTH / 2, localPos.x * UI_CURSOR_SENSITIVITY));
  const clampedY = Math.max(-UI_PANEL_HEIGHT / 2, Math.min(UI_PANEL_HEIGHT / 2, localPos.y * UI_CURSOR_SENSITIVITY));
  
  localPos.set(clampedX, clampedY, 0);
  return localPos.applyMatrix4(panel.matrixWorld);
}

// Visual feedback
function updateConeVisual(cone, position, direction) {
  if (!position) {
    cone.visible = false;
    return;
  }

  cone.visible = true;
  cone.position.copy(position);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
}

// UI Panel interaction handler
function handleUIPanelInteraction(handIndex, wristPosition, smoothedRay, panel, cone) {
  const intersection = getUIPanelIntersection(wristPosition, smoothedRay.direction, panel);
  if (!intersection) {
    cone.visible = false;
    return;
  }

  const interactionPoint = calculatePanelInteractionPoint(intersection, panel);
  if (!interactionPoint) {
    cone.visible = false;
    return;
  }

  // Get panel normal for visual feedback
  const panelNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(panel.quaternion).normalize();
  updateConeVisual(cone, interactionPoint, panelNormal.clone().negate());

  // Handle button interactions
  handleUIButtonInteractions(handIndex, cone, panel);
}

// UI Button interaction handler
function handleUIButtonInteractions(handIndex, cone, panel) {
  handleButtonInteractions(handIndex, cone, panel, panel.children, UIBUTTON_HOVER_THRESHOLD);
}

// Wall interaction handler
function handleWallInteraction(handIndex, handLandmarks, wall, cone) {
  // Calculate cursor position on wall
  const cursorPoint = handLandmarks[3];
  const scaledX = cursorPoint.x * CURSOR_SCALE_FACTOR;
  const scaledY = cursorPoint.y * CURSOR_SCALE_FACTOR;
  
  // Clamp to whiteboard boundaries
  const clampedX = Math.max(-WHITEBOARD_WIDTH / 2, Math.min(WHITEBOARD_WIDTH / 2, scaledX));
  const clampedY = Math.max(-WHITEBOARD_HEIGHT / 2, Math.min(WHITEBOARD_HEIGHT / 2, scaledY));

  // Convert to world space
  const localPos = new THREE.Vector3(clampedX, clampedY, 0);
  const worldPos = localPos.applyMatrix4(wall.matrixWorld);

  // Calculate wall normal and update cone
  const wallNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(wall.quaternion).normalize();
  const coneDirection = wallNormal.clone().negate();
  
  // Position cone at the correct height
  cone.position.copy(worldPos).add(wallNormal.clone().multiplyScalar(CONE_HEIGHT));
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coneDirection);
  cone.visible = true;

  // Handle button interactions
  handleButtonInteractions(handIndex, cone, wall, wall.children, BUTTON_HOVER_THRESHOLD);

  // Handle knob interactions
  handleKnobInteractions(handIndex, cone, wall);
}

// Generic button interaction handler
function handleButtonInteractions(handIndex, cone, parent, children, threshold) {
  const buttons = children.filter(obj => obj.userData.isButton || obj.userData.isUIButton);
  let hoveredButton = null;
  let minDistance = Infinity;

  // Track which buttons this specific hand is hovering over
  const handHoverKey = `hand-${handIndex}`;

  buttons.forEach(button => {
    // Store original button position if not already stored
    if (!button.userData.defaultPosition) {
      button.userData.defaultPosition = button.position.clone();
    }

    const buttonWorldPos = new THREE.Vector3();
    button.getWorldPosition(buttonWorldPos);
    const distanceToButton = cone.position.distanceTo(buttonWorldPos);

    if (distanceToButton < threshold) {
      if (!isPinchingState[handIndex]) {
        // Only set hover state if this hand is the closest to this button
        if (!button.userData.hoveredByHand || button.userData.hoveredByHand === handHoverKey) {
          button.scale.set(1.1, 1.1, 1.1);
          button.material.color.set(button.userData.hoverColor || 0xffa500);
          button.userData.hoveredByHand = handHoverKey;
        }
      }
      if (distanceToButton < minDistance) {
        minDistance = distanceToButton;
        hoveredButton = button;
      }
    } else {
      // Only reset if this hand was the one hovering over this button
      if (button.userData.hoveredByHand === handHoverKey) {
        button.scale.set(1, 1, 1);
        button.material.color.set(button.userData.defaultColor || 0xffffff);
        delete button.userData.hoveredByHand;
      }
    }
  });

  // Handle button snapping
  if (hoveredButton) {
    const buttonWorldPos = new THREE.Vector3();
    hoveredButton.getWorldPosition(buttonWorldPos);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(parent.quaternion).normalize();
    const buttonTop = buttonWorldPos.clone().add(normal.clone().multiplyScalar(0.05));
    cone.position.copy(buttonTop).add(normal.clone().multiplyScalar(CONE_HEIGHT));
  }
}

// Knob interaction handler
function handleKnobInteractions(handIndex, cone, wall) {
  const knobs = wall.children.filter(obj => obj.userData.isKnob);
  
  knobs.forEach(knob => {
    const knobWorldPos = new THREE.Vector3();
    knob.getWorldPosition(knobWorldPos);
    const distanceToKnob = cone.position.distanceTo(knobWorldPos);

    if (distanceToKnob < KNOB_HOVER_THRESHOLD) {
      if (!isPinchingState[handIndex]) {
        knob.scale.set(1.1, 1.1, 1.1);
        knob.material.color.set(knob.userData.hoverColor || 0xffa500);
      }
    } else {
      knob.scale.set(1, 1, 1);
      knob.material.color.set(knob.userData.defaultColor || 0xffffff);
    }
  });
}

export function updateRaycast(handIndex, handedness, isUIActive) {
  // Get scene objects and hand data
  const { scene } = getSceneObjects();
  const { smoothedLandmarksPerHand } = getHandTrackingData();
  const handLandmarks = smoothedLandmarksPerHand[handIndex];
  const cone = coneVisualsPerHand[handIndex];

  // Early return if no valid landmarks
  if (!handLandmarks || handLandmarks.length === 0) {
    cone.visible = false;
    return;
  }

  // Calculate and smooth ray properties
  const rayOrigin = calculateRayOrigin(handLandmarks);
  const rayDirection = calculateRayDirection(handLandmarks);
  const smoothedRay = smoothRayTransform(handIndex, rayOrigin, rayDirection);

  // Get interaction surfaces
  const panel = scene.children.find(obj => obj.isMesh && obj.material?.color?.getHex() === 0xbffbff);
  const wallObj = scene.children.find(obj => obj.userData.isWall);
  const tableObj = scene.children.find(obj => obj.userData.isTable);
  
  // If UI is not active, ensure the cone is not visible unless interacting with another surface
  if (!isUIActive) {
    cone.visible = false;
  }

  // Check if we should skip UI interaction
  if (shouldSkipUIInteraction(handedness, isUIActive, handLandmarks[0], panel)) {
    cone.visible = false;
    return;
  }

  // Register surfaces if not already registered
  if (panel && !surfaceSystem.getSurfaceConfig(panel)) {
    surfaceSystem.registerSurface(panel, {
      width: UI_PANEL_WIDTH,
      height: UI_PANEL_HEIGHT,
      cursorScaleFactor: UI_CURSOR_SENSITIVITY,
      buttonHoverThreshold: UIBUTTON_HOVER_THRESHOLD,
      getNormal: (surface) => new THREE.Vector3(0, 0, 1).applyQuaternion(surface.quaternion).normalize(),
      getButtonFilter: (obj) => obj.userData.isUIButton
    });
  }

  if (wallObj && !surfaceSystem.getSurfaceConfig(wallObj)) {
    surfaceSystem.registerSurface(wallObj, {
      width: WHITEBOARD_WIDTH,
      height: WHITEBOARD_HEIGHT,
      cursorScaleFactor: CURSOR_SCALE_FACTOR,
      buttonHoverThreshold: BUTTON_HOVER_THRESHOLD,
      getNormal: (surface) => new THREE.Vector3(0, 0, 1).applyQuaternion(surface.quaternion).normalize(),
      getButtonFilter: (obj) => obj.userData.isButton || obj.userData.isKnob
    });
  }

  if (tableObj && !surfaceSystem.getSurfaceConfig(tableObj)) {
    surfaceSystem.registerSurface(tableObj, {
      width: TABLE_WIDTH,
      height: TABLE_DEPTH,
      cursorScaleFactor: TABLE_CURSOR_SCALE_FACTOR,
      buttonHoverThreshold: BUTTON_HOVER_THRESHOLD,
      getNormal: (surface) => new THREE.Vector3(0, 1, 0).applyQuaternion(surface.quaternion).normalize(),
      getButtonFilter: (obj) => obj.userData.isButton,
      handleCursorPosition: (cursorPoint, surface, config) => {
        const scaledX = cursorPoint.x * config.cursorScaleFactor;
        const scaledZ = -cursorPoint.y * config.cursorScaleFactor;
        const clampedX = Math.max(-config.width / 2, Math.min(config.width / 2, scaledX));
        const clampedZ = Math.max(-config.height / 2, Math.min(config.height / 2, scaledZ));
        const localPos = new THREE.Vector3(clampedX, 0.1, clampedZ);
        return localPos.applyMatrix4(surface.matrixWorld);
      }
    });
  }

  // Handle surface interactions
  if (isUIActive && handedness === 'Right' && panel) {
    if (surfaceSystem.updateCursorOnSurface(handIndex, handLandmarks, panel, cone)) {
      return;
    }
  }

  if (wallObj) {
    if (surfaceSystem.updateCursorOnSurface(handIndex, handLandmarks, wallObj, cone)) {
      return;
    }
  }

  if (tableObj) {
    if (surfaceSystem.updateCursorOnSurface(handIndex, handLandmarks, tableObj, cone)) {
      return;
    }
  }

  // Fallback for scenes without specific surfaces (like simpleScene)
  // This prevents the app from crashing if no interactive surfaces are found.
  // It provides a basic raycasting interaction in 3D space.
  if (!wallObj && !tableObj && !panel) {
    // Standard 3D space raycasting
    raycaster.set(smoothedRay.origin, smoothedRay.direction);
    
    // Update cone position and orientation
    const conePosition = smoothedRay.origin.clone().add(smoothedRay.direction.clone().multiplyScalar(1.5));
    cone.position.copy(conePosition);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smoothedRay.direction);
    cone.visible = true;
    
    // Basic object intersection test (optional)
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      // You could add hover effects here for simple scenes
    }
    return;
  }
}
// Add these functions at the top level

function handleChessboardInteraction(handIndex, handLandmarks, table, chessboard, cone) {
  const cursorPoint = handLandmarks[3]; // Thumb IP
  const scaledX = cursorPoint.x * CHESSBOARD_SCALE_FACTOR;
  const scaledZ = -cursorPoint.y * CHESSBOARD_SCALE_FACTOR; // Negated for vertical direction

  // Map to grid 0-7
  const col = Math.floor((scaledX + 1) * (CHESSBOARD_SIZE / 2));
  const row = Math.floor((scaledZ + 1) * (CHESSBOARD_SIZE / 2));
  const clampedCol = Math.max(0, Math.min(CHESSBOARD_SIZE - 1, col));
  const clampedRow = Math.max(0, Math.min(CHESSBOARD_SIZE - 1, row));

  // Get square and its world position
  const squareIndex = clampedRow * CHESSBOARD_SIZE + clampedCol;
  const square = chessboard.children[squareIndex];
  if (square) {
    const worldPos = new THREE.Vector3();
    square.getWorldPosition(worldPos);

    // Highlight the square
    square.material.color.set(HIGHLIGHT_COLOR);

    // Set cone position to square center (above surface)
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(table.quaternion).normalize();
    cone.position.copy(worldPos);

    // Cone direction: point upwards
    const coneDirection = normal;
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), coneDirection);

    cone.visible = true;

    // If grabbedObject, move it to snapped position
    if (grabbedObject && grabbedObject.userData.handIndex === handIndex) {
      console.log(grabbedObject.position.y, worldPos.y, cone.position.y);
    }
  }
  // Store last snapped for pinch
  lastSnappedSquarePerHand[handIndex] = { row: clampedRow, col: clampedCol, square };
}

function handleTableInteraction(handIndex, handLandmarks, table, cone) {
  const cursorPoint = handLandmarks[3];
  const scaledX = cursorPoint.x * TABLE_CURSOR_SCALE_FACTOR;
  const scaledZ = -cursorPoint.y * TABLE_CURSOR_SCALE_FACTOR;
  const clampedX = Math.max(-TABLE_WIDTH / 2, Math.min(TABLE_WIDTH / 2, scaledX));
  const clampedZ = Math.max(-TABLE_DEPTH / 2, Math.min(TABLE_DEPTH / 2, scaledZ));

  const localPos = new THREE.Vector3(clampedX, 0.1, clampedZ);
  const worldPos = localPos.applyMatrix4(table.matrixWorld);

  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(table.quaternion).normalize();
  cone.position.copy(worldPos);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  cone.visible = true;

  if (grabbedObject && grabbedObject.userData.handIndex === handIndex) {
    grabbedObject.position.copy(cone.position);
  }
}

// If the grabbed object is the knob, constrain its movement horizontally along the slider track
function handleKnobMovement(handIndex, cone, wall) {
  if (grabbedObject && grabbedObject.userData.isKnob && grabbedObject.userData.handIndex === handIndex) {
    raycaster.set(cone.position, smoothedRayDirections[handIndex]); // Use cursor position for raycasting
    const intersects = raycaster.intersectObject(wall);
    if (intersects.length > 0) {
      const intersectPoint = intersects[0].point;
      const localPos = intersectPoint.clone().applyMatrix4(wall.matrixWorld.clone().invert());
      localPos.x = Math.max(-1.5, Math.min(1.5, localPos.x)); // Clamp to slider track width (3 units wide)
      localPos.y = -0.5; // Fixed y position of slider
      localPos.z = 0.1; // Fixed z position (above board)
      grabbedObject.position.copy(localPos.applyMatrix4(wall.matrixWorld));
    }
  }
}

// If an object is grabbed (non-knob), move it to the cursor position
function handleGrabbedObjectMovement(handIndex, cone) {
  if (grabbedObject && !grabbedObject.userData.isKnob && grabbedObject.userData.handIndex === handIndex) {
    grabbedObject.position.copy(cone.position);
  }
}

export function grabNearestObject(handIndex, handedness, isUIActive, triggeredButton) {
  if (isUIActive || triggeredButton) {
    return; // Internal check: Skip if UI or button context
  }

  const { scene } = getSceneObjects();
  const { smoothedLandmarksPerHand, landmarkVisualsPerHand, connectionVisualsPerHand } = getHandTrackingData();
  const handLandmarks = smoothedLandmarksPerHand[handIndex];
  if (!handLandmarks || handLandmarks.length === 0) {
    return; // Guard: No landmarks
  }

  const cone = coneVisualsPerHand[handIndex];
  if (!cone || !cone.visible) {
    return; // No cone, skip
  }

  const conePosition = new THREE.Vector3();
  cone.getWorldPosition(conePosition); // Get cone's world position (cursor tip)
  
  // Find nearest grabbable object near cone
  const grabbableObjects = [];
  scene.traverse(obj => {
    if (obj.userData?.isGrabbable && 
        !obj.userData?.isWall && 
        !landmarkVisualsPerHand.flat().includes(obj) && 
        !connectionVisualsPerHand.flat().includes(obj)) {
      // Calculate distance
      const objPos = new THREE.Vector3();
      obj.getWorldPosition(objPos);
      grabbableObjects.push({ obj, distance: conePosition.distanceTo(objPos) });
    }
  });

  // Sort by distance and get the closest
  grabbableObjects.sort((a, b) => a.distance - b.distance);

  const closestObject = grabbableObjects[0];
  if (!closestObject || closestObject.distance > 0.5) { // Threshold, adjust as needed
    return;
  }
  
  // Grab the nearest
  grabbedObject = closestObject.obj;

  // Ensure userData exists and store original state
  if (!grabbedObject.userData) {
    grabbedObject.userData = {};
  }

  // Store original parent and re-parent to scene for smooth world-space movement
  grabbedObject.userData.originalParent = grabbedObject.parent;
  const worldPosition = new THREE.Vector3();
  grabbedObject.getWorldPosition(worldPosition);
  
  scene.add(grabbedObject); // Temporarily move to world space
  grabbedObject.position.copy(worldPosition); // Set position in world space

  // Store original color if not already stored
  if (grabbedObject.material && !grabbedObject.userData.defaultColor) {
    grabbedObject.userData.defaultColor = grabbedObject.material.color.clone();
  }

  // Store original scale if needed
  if (!grabbedObject.userData.originalScale) {
    grabbedObject.userData.originalScale = grabbedObject.scale.clone();
  }

  // Update visual feedback
  if (grabbedObject.material) {
    grabbedObject.material.color.set(0xffa500); // Orange for grabbed state
  }

  // Associate with hand
  grabbedObject.userData.handIndex = handIndex;

  if (grabbedObject) {
    console.log("grabbedObject");
  }
  // if (grabbedObject.userData.isKnob) {
  //   grabbedObject.material.color.set(grabbedObject.userData.activeColor);
  // }
  // console.log(`Hand ${handIndex} grabbed: ${grabbedObject.name || grabbedObject.id}`);
}

function releaseObject(handIndex) {
  if (grabbedObject && grabbedObject.userData.handIndex === handIndex) {
    // Restore original color if it was stored
    if (grabbedObject.material) {
      if (grabbedObject.userData.defaultColor) {
        grabbedObject.material.color.copy(grabbedObject.userData.defaultColor);
      } else {
        // Default to red if no stored color
        grabbedObject.material.color.set(0xff0000);
      }
    }

    // Restore original scale if needed
    if (grabbedObject.userData.originalScale) {
      grabbedObject.scale.copy(grabbedObject.userData.originalScale);
    }

    // Re-parent the object to its original parent (e.g., the chessboard)
    if (grabbedObject.userData.originalParent) {
      const worldPosition = new THREE.Vector3();
      grabbedObject.getWorldPosition(worldPosition);
      
      grabbedObject.userData.originalParent.add(grabbedObject);
      
      // Convert world position back to local position relative to the new parent
      const localPosition = grabbedObject.userData.originalParent.worldToLocal(worldPosition);
      grabbedObject.position.copy(localPosition);
      
      delete grabbedObject.userData.originalParent;
    }

    // Clean up hand association
    delete grabbedObject.userData.handIndex;
    grabbedObject = null;
  }
}

async function switchToScene(sceneName) {
  // Show loading overlay
  sceneLoader.show(sceneName);
  
  // Start progress simulation
  const progressPromise = sceneLoader.simulateProgress(2500);
  
  let { scene, camera, renderer, controls } = getSceneObjects();

  // Reset surface system state
  surfaceSystem.surfaces.clear();
  surfaceSystem.hoveredButtons.clear();

  // Small delay to let loading animation start
  await new Promise(resolve => setTimeout(resolve, 200));

  // Dispose old scene resources
  scene.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
      else child.material.dispose();
    }
  });
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  renderer.dispose();
  controls.dispose();

  // Clear hand tracking state (visuals arrays, counters, etc.)
  cleanupHandTracking(scene);

  // Clear gesture control state (visuals and smoothed arrays)
  coneVisualsPerHand.length = 0;
  smoothedRayOrigins.length = 0;
  smoothedRayDirections.length = 0;
  isPinchingState.fill(false);
  grabbedObject = null; // Clear any grabbed reference

  let setupFunction;
  switch (sceneName) {
    case 'whiteboard':
      const { setupThreeScene } = await import('./threeSetup.js');
      setupFunction = setupThreeScene;
      break;
    case 'table':
      const { setupTableScene } = await import('./tableSetup.js');
      setupFunction = setupTableScene;
      break;
    case 'simple':
      const { setupSimpleScene } = await import('./simpleScene.js');
      setupFunction = setupSimpleScene;
      break;
    default:
      console.error(`Unknown scene: ${sceneName}`);
      sceneLoader.hide();
      return;
  }

  setupFunction();

  // Re-setup hand tracking and gestures with new scene
  const { scene: newScene } = getSceneObjects();
  await setupHandTracking(newScene);
  initGestureControl(newScene, 2); // Re-add cones and reset gesture state

  // Wait for progress animation to complete
  await progressPromise;
  
  // Small delay before hiding to show "Ready!" message
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Hide loading overlay
  sceneLoader.hide();
}

export function getRayVisualsPerHand() {
  return rayVisualsPerHand;
}

export function getConeVisualsPerHand() {
  return coneVisualsPerHand;
}

// Export useful constants for configuration
export {
  BUTTON_HOVER_THRESHOLD,
  UIBUTTON_HOVER_THRESHOLD,
  UI_CURSOR_THRESHOLD,
  CHESSBOARD_SIZE,
  HIGHLIGHT_COLOR,
  sceneLoader // Export loading system for external use
};
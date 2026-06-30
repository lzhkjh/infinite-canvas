// tableSetup.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setSceneObjects } from "./sceneManager.js";
import { handConfig } from "./handTracking.js";

export function setupTableScene() {
  let scene, camera, renderer, controls; // Add this declaration line

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  // Copy floor from threeSetup.js
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // Add table instead of wall
  const tableGeometry = new THREE.BoxGeometry(3, 0.2, 2);
  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.5,
    metalness: 0.1
  });
  const tableTop = new THREE.Mesh(tableGeometry, tableMaterial);
  tableTop.position.set(0, -1.3, -1);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableTop.userData.isTable = true;
  scene.add(tableTop);

  // Optionally add table legs (e.g., 4 cylinders)
  const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 32);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const positions = [
    { x: 1.4, z: 0.9 }, { x: 1.4, z: -0.9 },
    { x: -1.4, z: 0.9 }, { x: -1.4, z: -0.9 }
  ];
  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(pos.x, -1.9, pos.z - 1); // Adjusted for height/centering
    leg.castShadow = true;
    scene.add(leg);
  });

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.3, 0.8);

  const canvas = document.getElementById("threeCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -1);

  // Copy lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(5, 10, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -10;
  sunLight.shadow.camera.right = 10;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -10;
  scene.add(sunLight);
  const pointLight = new THREE.PointLight(0xffffff, 0.8, 10);
  pointLight.position.set(0, 2, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // New: Add chessboard on table top
  const chessboardGroup = new THREE.Group();
  chessboardGroup.isChessboard = true;
  const squareSize = 0.2; // Each square 0.2x0.2
  const chessboardSize = squareSize * 8; // 1.6x1.6
  const halfSize = chessboardSize / 2;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const color = (row + col) % 2 === 0 ? 0xffffff : 0x000000; // Alternating white/black
      const squareGeometry = new THREE.PlaneGeometry(squareSize, squareSize);
      const squareMaterial = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
      const square = new THREE.Mesh(squareGeometry, squareMaterial);
      square.position.set(
        (col * squareSize) - halfSize + squareSize / 2, // Center x
        0.101, // Slightly above table top (thickness 0.2 / 2 = 0.1 + epsilon)
        (row * squareSize) - halfSize + squareSize / 2 // Center z
      );
      square.rotation.x = -Math.PI / 2; // Flat on table (plane defaults to xy)
      square.userData.defaultColor = color; // Store for reset
      chessboardGroup.add(square);
    }
  }
  chessboardGroup.position.set(0, 0, 0); // Centered on table top
  tableTop.add(chessboardGroup); // Add to table top (moves with it if needed)

  // New: Add objects on specific squares (e.g., chess pieces as cylinders)
  const piecePositions = [
    { row: 0, col: 0, color: 0xff0000 }, // Red piece on (0,0)
    { row: 7, col: 7, color: 0xff0000 } // Red piece on (7,7)
  ];

  piecePositions.forEach(pos => {
    const squareIndex = pos.row * 8 + pos.col;
    const targetSquare = chessboardGroup.children[squareIndex];
    if (targetSquare) {
      const pieceGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 32); // Small cylinder for piece
      const pieceMaterial = new THREE.MeshStandardMaterial({ color: pos.color });
      const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
      piece.position.copy(targetSquare.position.clone().add(new THREE.Vector3(0, 0.08, 0))); // Above square center
      piece.castShadow = true;
      piece.userData.isGrabbable = true; // Mark as grabbable
      chessboardGroup.add(piece);
    }
  });

  // Set table-specific offsets (resets every time this scene is loaded)
  handConfig.xScale = 2; // Example: Wider x spread
  handConfig.yScale = -2; // Example: Taller y (flipped)
  handConfig.zMagnification = 2; // Example: Less z depth exaggeration
  handConfig.zOffset = 0; // Example: Push hands further back in z
  handConfig.rotationOffset.set(- Math.PI / 12, 0, 0); // Example: 45-degree y rotation

  setSceneObjects({ scene, camera, renderer, controls });
}

// Remove the resize listener and getSceneObjects (handled elsewhere)
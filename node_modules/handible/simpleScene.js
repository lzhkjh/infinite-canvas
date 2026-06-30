// Simple Scene - Minimalist hand tracking environment
// Features: Beautiful sky background, nice floor tiles, and clean hand tracking

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getSceneObjects, setSceneObjects } from "./sceneManager.js";

export function setupSimpleScene() {
  console.log("🌅 Setting up Simple Scene...");
  
  // Get existing scene objects
  let { scene, camera, renderer, controls } = getSceneObjects();
  
  // Create new scene, camera, and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
  );
  
  // Re-use existing renderer, but create new controls for the new camera
  controls = new OrbitControls(camera, renderer.domElement);
  
  
  
  // Configure renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  // Configure controls
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI / 2;
  
  // Clear existing renderer if any
  const existingCanvas = document.querySelector('canvas');
  if (existingCanvas) {
    existingCanvas.remove();
  }
  
  // Add new renderer to DOM
  document.body.appendChild(renderer.domElement);
  
  // Clear scene first
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  
  // Clear all existing objects
  while(scene.children.length > 0) {
    const child = scene.children[0];
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      } else {
        child.material.dispose();
      }
    }
    scene.remove(child);
  }

  // 🌌 Create beautiful sky background
  const skyGeometry = new THREE.SphereGeometry(100, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x87CEEB) },    // Sky blue
      bottomColor: { value: new THREE.Color(0xFFFFFF) }, // White
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide
  });
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // ☀️ Add sun-like light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 100, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  // 🏛️ Create beautiful tiled floor
  const floorSize = 20;
  const tileSize = 2;
  const tilesPerSide = floorSize / tileSize;

  // Create floor group
  const floorGroup = new THREE.Group();
  
  for (let x = 0; x < tilesPerSide; x++) {
    for (let z = 0; z < tilesPerSide; z++) {
      // Alternate between two tile colors for checkerboard pattern
      const isLight = (x + z) % 2 === 0;
      const tileColor = isLight ? 0xf0f0f0 : 0xe0e0e0;
      
      // Create tile geometry
      const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);
      const tileMaterial = new THREE.MeshLambertMaterial({ 
        color: tileColor,
        transparent: true,
        opacity: 0.9
      });
      
      const tile = new THREE.Mesh(tileGeometry, tileMaterial);
      tile.rotation.x = -Math.PI / 2; // Lay flat
      tile.position.set(
        x * tileSize - floorSize / 2 + tileSize / 2,
        -1.5,
        z * tileSize - floorSize / 2 + tileSize / 2
      );
      tile.receiveShadow = true;
      
      floorGroup.add(tile);
    }
  }
  
  scene.add(floorGroup);

  // 🌸 Add some floating particles for ambiance
  const particleCount = 50;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 40;     // x
    particlePositions[i * 3 + 1] = Math.random() * 10 + 2;    // y
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 40; // z
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // ✨ Add gentle animation to particles
  function animateParticles() {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 1; i < positions.length; i += 3) {
      positions[i] += 0.002; // Slow upward drift
      if (positions[i] > 15) {
        positions[i] = 2; // Reset to bottom
      }
    }
    particles.geometry.attributes.position.needsUpdate = true;
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // 📷 Position camera for nice view
  camera.position.set(0, 0.5, 1.0); // right, up, back
  camera.lookAt(0, 1, 0);

  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  console.log("🌟 Simple Scene setup complete!");

  // Register scene objects with manager
  setSceneObjects({ scene, camera, renderer, controls });
}

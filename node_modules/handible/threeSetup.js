// Enhanced threeSetup.js with impressive visuals
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setSceneObjects } from "./sceneManager.js";
import { handConfig } from "./handTracking.js";

export function setupThreeScene() {
  let scene, camera, renderer, controls;

  scene = new THREE.Scene();
  
  // Enhanced background with gradient
  const gradientTexture = createGradientTexture();
  scene.background = gradientTexture;
  
  // Add atmospheric fog for depth
  scene.fog = new THREE.Fog(0x87ceeb, 5, 15);

  // Enhanced floor with reflection-like material
  const floorGeometry = new THREE.PlaneGeometry(15, 15);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.1,
    metalness: 0.8,
    envMapIntensity: 1.0
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.5;
  floor.receiveShadow = true;
  scene.add(floor);

  // Add subtle grid pattern to floor
  const gridHelper = new THREE.GridHelper(15, 30, 0x34495e, 0x34495e);
  gridHelper.position.y = -1.49; // Slightly above floor
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Enhanced whiteboard with modern glass-like material
  const wallGeometry = new THREE.PlaneGeometry(5, 3);
  const wallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.1,
    thickness: 0.5,
    ior: 1.5
  });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.z = -1;
  wall.position.y = 0;
  wall.rotation.x = -Math.PI / 12;
  wall.receiveShadow = true;
  wall.castShadow = true;
  wall.userData.isWall = true;
  scene.add(wall);

  // Add glowing frame around whiteboard
  const frameGeometry = new THREE.RingGeometry(2.4, 2.6, 32);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x3498db,
    emissive: 0x1a5490,
    emissiveIntensity: 0.3,
    roughness: 0.2,
    metalness: 0.8
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(0, 0, 0.02);
  frame.rotation.x = -Math.PI / 12;
  scene.add(frame);

  // Enhanced 3D buttons with glowing effects
  const buttonPositions = [
    { x: -1, y: 0.5, color: 0xe74c3c, emissive: 0x8b2626 },
    { x: 0, y: 0.5, color: 0x2ecc71, emissive: 0x1a7041 },
    { x: 1, y: 0.5, color: 0x3498db, emissive: 0x1a5490 }
  ];

  buttonPositions.forEach(pos => {
    const buttonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32);
    const buttonMaterial = new THREE.MeshStandardMaterial({ 
      color: pos.color,
      emissive: pos.emissive,
      emissiveIntensity: 0.2,
      roughness: 0.3,
      metalness: 0.7
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.position.set(pos.x, pos.y, 0.05);
    button.rotation.x = Math.PI / 2;
    wall.add(button);
    
    // Add glowing ring around button
    const ringGeometry = new THREE.RingGeometry(0.22, 0.25, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: pos.color,
      transparent: true,
      opacity: 0.4
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(pos.x, pos.y, 0.06);
    wall.add(ring);
    
    button.userData.isButton = true;
    button.userData.defaultColor = pos.color;
    button.userData.hoverColor = 0xffd700;
    button.userData.activeColor = 0xff6b35;
    button.userData.defaultPosition = button.position.clone();
    button.userData.glowRing = ring;
    button.castShadow = true;
  });

  // Enhanced 3D slider with modern design
  const sliderTrackGeometry = new THREE.BoxGeometry(3, 0.1, 0.1);
  const sliderTrackMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x34495e,
    roughness: 0.3,
    metalness: 0.8,
    emissive: 0x1a252f,
    emissiveIntensity: 0.1
  });
  const sliderTrack = new THREE.Mesh(sliderTrackGeometry, sliderTrackMaterial);
  sliderTrack.position.set(0, -0.5, 0.05);
  sliderTrack.castShadow = true;
  wall.add(sliderTrack);

  // Enhanced knob with glow effect
  const knobGeometry = new THREE.SphereGeometry(0.15, 32, 32);
  const knobMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xecf0f1,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x95a5a6,
    emissiveIntensity: 0.1
  });
  const knob = new THREE.Mesh(knobGeometry, knobMaterial);
  knob.position.set(0, -0.5, 0.05 + 0.05);
  
  // Add inner glow sphere
  const innerGlowGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const innerGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x3498db,
    transparent: true,
    opacity: 0.3
  });
  const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
  knob.add(innerGlow);
  
  knob.userData.isKnob = true;
  knob.userData.defaultColor = 0xecf0f1;
  knob.userData.hoverColor = 0xffd700;
  knob.userData.activeColor = 0xff6b35;
  knob.userData.innerGlow = innerGlow;
  knob.castShadow = true;
  wall.add(knob);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0.0, 1);

  const canvas = document.getElementById("threeCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.minDistance = 1;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -1);

  // Enhanced lighting setup for dramatic effect
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambientLight);

  // Key light with color temperature
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  // Fill light with warm color
  const fillLight = new THREE.DirectionalLight(0xffa726, 0.4);
  fillLight.position.set(-5, 5, 3);
  scene.add(fillLight);

  // Accent light with cool color
  const accentLight = new THREE.PointLight(0x29b6f6, 0.6, 15);
  accentLight.position.set(2, 3, 2);
  accentLight.castShadow = true;
  scene.add(accentLight);

  // Add rim light for edge definition
  const rimLight = new THREE.SpotLight(0xffffff, 0.8, 10, Math.PI / 4, 0.5, 2);
  rimLight.position.set(-3, 4, 3);
  rimLight.target.position.set(0, 0, -1);
  scene.add(rimLight);
  scene.add(rimLight.target);

  // Add floating particles for ambiance
  createFloatingParticles(scene);

  // Add environment reflection probe
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  scene.add(cubeCamera);
  
  // Update materials to use environment map
  const envMap = cubeRenderTarget.texture;
  [floorMaterial, wallMaterial].forEach(material => {
    if (material.envMap !== undefined) {
      material.envMap = envMap;
      material.needsUpdate = true;
    }
  });

  const objectsGroup = new THREE.Group();
  scene.add(objectsGroup);
  
  // Set whiteboard-specific offsets (keep interaction logic intact)
  handConfig.xScale = 2;
  handConfig.yScale = -2;
  handConfig.zMagnification = 2;
  handConfig.zOffset = 0;
  handConfig.rotationOffset.set(0, 0, 0);

  setSceneObjects({ scene, camera, renderer, controls });
  
  // Animation loop for dynamic effects
  animate();
  
  function animate() {
    requestAnimationFrame(animate);
    
    // Animate particles
    animateParticles(scene);
    
    // Update environment map occasionally
    if (Math.random() < 0.005) {
      cubeCamera.update(renderer, scene);
    }
  }
}

// Helper function to create gradient background texture
function createGradientTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#1e3c72');    // Deep blue
  gradient.addColorStop(0.5, '#2a5298'); // Mid blue
  gradient.addColorStop(1, '#87ceeb');    // Sky blue
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Helper function to create floating particles
function createFloatingParticles(scene) {
  const particleCount = 50;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;     // x
    positions[i * 3 + 1] = Math.random() * 10 - 2;     // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
  }
  
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x74b9ff,
    size: 0.02,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.userData.originalPositions = positions.slice();
  particles.userData.velocities = new Float32Array(particleCount * 3);
  
  // Initialize random velocities
  for (let i = 0; i < particleCount; i++) {
    particles.userData.velocities[i * 3] = (Math.random() - 0.5) * 0.002;
    particles.userData.velocities[i * 3 + 1] = Math.random() * 0.001 + 0.0005;
    particles.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
  }
  
  scene.add(particles);
}

// Helper function to animate particles
function animateParticles(scene) {
  scene.children.forEach(child => {
    if (child instanceof THREE.Points) {
      const positions = child.geometry.attributes.position.array;
      const velocities = child.userData.velocities;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];         // x
        positions[i + 1] += velocities[i + 1]; // y
        positions[i + 2] += velocities[i + 2]; // z
        
        // Reset particles that go too high
        if (positions[i + 1] > 8) {
          positions[i + 1] = -2;
          positions[i] = (Math.random() - 0.5) * 20;
          positions[i + 2] = (Math.random() - 0.5) * 20;
        }
      }
      
      child.geometry.attributes.position.needsUpdate = true;
    }
  });
}
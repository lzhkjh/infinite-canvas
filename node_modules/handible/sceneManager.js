let scene, camera, renderer, controls;

export function setSceneObjects(newObjects) {
  scene = newObjects.scene;
  camera = newObjects.camera;
  renderer = newObjects.renderer;
  controls = newObjects.controls;
}

export function getSceneObjects() {
  return {
    scene: scene || null,
    camera: camera || null,
    renderer: renderer || null,
    controls: controls || null
  };
}
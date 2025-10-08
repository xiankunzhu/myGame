// Minimal Three.js first-person target practice engine
// Handles scene setup, player movement, target spawning, shooting logic.

import * as THREE from 'three';

// Engine constants
const MOVE_SPEED = 6; // units / second
const LOOK_SENS = 0.0022; // mouse sensitivity
const TARGET_COUNT = 12;
const TARGET_AREA_SIZE = 40; // spawning cube size
const TARGET_RESPAWN_DELAY = 500; // ms

// Reusable geometries / materials (performance)
const targetGeometry = new THREE.BoxGeometry(1, 1, 1);
const targetMaterials = [
  new THREE.MeshBasicMaterial({ color: 0xff5555 }),
  new THREE.MeshBasicMaterial({ color: 0x55ff55 }),
  new THREE.MeshBasicMaterial({ color: 0x5599ff }),
  new THREE.MeshBasicMaterial({ color: 0xffff55 }),
];

export function initGame({ canvas, onScore }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Simple ambient / hemi light
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
  scene.add(hemi);

  // Ground (large plane)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0x202020 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const raycaster = new THREE.Raycaster();
  const targets = new Set();
  let score = 0;
  let running = false;
  let animationHandle = null;

  // Player orientation state (yaw/pitch)
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let yaw = 0;
  let pitch = 0;
  const directionVector = new THREE.Vector3();
  const tmpMove = new THREE.Vector3();

  const keys = new Set();

  function handleKey(e) {
    if (e.type === 'keydown') keys.add(e.code);
    else keys.delete(e.code);
  }

  window.addEventListener('keydown', handleKey);
  window.addEventListener('keyup', handleKey);

  function handleMouseMove(e) {
    if (document.pointerLockElement !== canvas) return;
    yaw -= e.movementX * LOOK_SENS;
    pitch -= e.movementY * LOOK_SENS;
    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }
  window.addEventListener('mousemove', handleMouseMove);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  function addTarget() {
    const mesh = new THREE.Mesh(targetGeometry, targetMaterials[Math.floor(Math.random() * targetMaterials.length)]);
    randomizeTargetPosition(mesh);
    mesh.userData.isTarget = true;
    scene.add(mesh);
    targets.add(mesh);
  }

  function randomizeTargetPosition(mesh) {
    const half = TARGET_AREA_SIZE / 2;
    mesh.position.set(
      (Math.random() * TARGET_AREA_SIZE) - half,
      1 + Math.random() * 5,
      -Math.random() * TARGET_AREA_SIZE - 5 // always in front-ish (negative Z)
    );
  }

  function populateTargets() {
    while (targets.size < TARGET_COUNT) addTarget();
  }

  populateTargets();

  function incrementScore(delta) {
    score += delta;
    onScore?.(score);
  }

  function update(dt) {
    // Movement in camera space (ignoring vertical tilt for direction)
    tmpMove.set(0, 0, 0);
    const forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    if (forward !== 0 || strafe !== 0) {
      directionVector.set(0, 0, -1).applyQuaternion(camera.quaternion);
      directionVector.y = 0; directionVector.normalize();
      const right = new THREE.Vector3().copy(directionVector).cross(camera.up).normalize();
      tmpMove.addScaledVector(directionVector, forward);
      tmpMove.addScaledVector(right, strafe);
      if (tmpMove.lengthSq() > 0) tmpMove.normalize().multiplyScalar(MOVE_SPEED * dt);
      camera.position.add(tmpMove);
    }
  }

  let lastTime = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    update(dt);
    renderer.render(scene, camera);
    animationHandle = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    animationHandle = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (animationHandle) cancelAnimationFrame(animationHandle);
  }

  function reset() {
    // Remove existing targets
    targets.forEach(t => scene.remove(t));
    targets.clear();
    populateTargets();
    score = 0;
    onScore?.(score);
    camera.position.set(0, 1.6, 5);
    yaw = 0; pitch = 0; euler.set(0, 0, 0);
    camera.quaternion.setFromEuler(euler);
  }

  function shoot() {
    // Raycast straight from camera
    raycaster.set(camera.getWorldPosition(new THREE.Vector3()), camera.getWorldDirection(new THREE.Vector3()));
    const intersects = raycaster.intersectObjects(Array.from(targets), false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      targets.delete(hit);
      scene.remove(hit);
      incrementScore(10);
      // respawn later
      setTimeout(addTarget, TARGET_RESPAWN_DELAY);
      return true;
    }
    return false;
  }

  function dispose() {
    stop();
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('keydown', handleKey);
    window.removeEventListener('keyup', handleKey);
    renderer.dispose();
    targetGeometry.dispose();
    targetMaterials.forEach(m => m.dispose());
  }

  return {
    scene, camera, renderer,
    start, stop, reset, shoot,
    dispose,
    get score() { return score; },
  };
}

export function startGameLoop(engine) {
  engine.start();
}
export function stopGameLoop(engine) {
  engine.stop();
}
export function shoot(engine) {
  return engine.shoot();
}

import * as THREE from 'three';
import { gsap } from 'gsap';
import { Dice } from './Dice';
import { Cup } from './Cup';
import { playDiceRattle } from './sound';
import './style.css';

/* ──────────────────────────────────────────────
   State
   ────────────────────────────────────────────── */
let isAnimating = false;
const diceArray: Dice[] = [];

/* ──────────────────────────────────────────────
   Fixed dice positions in a "1 center + 4 corners" pattern
   so they NEVER overlap.
   ────────────────────────────────────────────── */
const DICE_SIZE = 1.3;
const HALF = DICE_SIZE / 2;           // dice sit at y = HALF
const SPREAD = 1.65;                  // distance from center
const DICE_POSITIONS: [number, number, number][] = [
  [0,         HALF,  0],                        // center
  [-SPREAD,   HALF, -SPREAD],                   // top-left
  [ SPREAD,   HALF, -SPREAD],                   // top-right
  [-SPREAD,   HALF,  SPREAD],                   // bottom-left
  [ SPREAD,   HALF,  SPREAD],                   // bottom-right
];

/* ──────────────────────────────────────────────
   Renderer
   ────────────────────────────────────────────── */
const container = document.getElementById('canvas-container')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

/* ──────────────────────────────────────────────
   Scene & background
   ────────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1222);
scene.fog = new THREE.FogExp2(0x0c1222, 0.018);

/* ──────────────────────────────────────────────
   Camera — nice top-down angle so all 5 dice are visible
   ────────────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 16, 14);
camera.lookAt(0, 0, 0);

/* ──────────────────────────────────────────────
   Lighting — 3-point setup for cinematic look
   ────────────────────────────────────────────── */
// Soft ambient
const ambient = new THREE.AmbientLight(0xfff5e6, 0.5);
scene.add(ambient);

// Key light (warm)
const key = new THREE.DirectionalLight(0xffecd2, 2.5);
key.position.set(8, 18, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 50;
key.shadow.camera.left = -12;
key.shadow.camera.right = 12;
key.shadow.camera.top = 12;
key.shadow.camera.bottom = -12;
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.02;
scene.add(key);

// Fill light (cool blue)
const fill = new THREE.DirectionalLight(0xb4c4ff, 1.2);
fill.position.set(-10, 12, -6);
scene.add(fill);

// Rim / back light
const rim = new THREE.DirectionalLight(0xffffff, 0.8);
rim.position.set(0, 5, -15);
scene.add(rim);

/* ──────────────────────────────────────────────
   Table — dark felt surface
   ────────────────────────────────────────────── */
const tableGeo = new THREE.PlaneGeometry(80, 80);
const tableMat = new THREE.MeshStandardMaterial({
  color: 0x0e3b1e,   // dark green felt
  roughness: 0.95,
  metalness: 0.0,
});
const table = new THREE.Mesh(tableGeo, tableMat);
table.rotation.x = -Math.PI / 2;
table.receiveShadow = true;
scene.add(table);

/* ──────────────────────────────────────────────
   Game objects
   ────────────────────────────────────────────── */
const GAME_GROUP = new THREE.Group();
scene.add(GAME_GROUP);

// 5 dice
for (let i = 0; i < 5; i++) {
  const d = new Dice(DICE_SIZE);
  diceArray.push(d);
  GAME_GROUP.add(d);
}

// Cup
const cup = new Cup();
GAME_GROUP.add(cup);

/* ──────────────────────────────────────────────
   resetGame — cover the dice & randomize
   ────────────────────────────────────────────── */
function resetGame() {
  // Lower cup back down first
  const tl = gsap.timeline({
    onComplete: () => {
      // Only AFTER the cup is fully down do we randomize the dice values
      diceArray.forEach((d, i) => {
        const val = Math.floor(Math.random() * 6) + 1;
        d.setFaceUp(val);
        const [px, py, pz] = DICE_POSITIONS[i];
        d.position.set(px, py, pz);
      });

      // Show OPEN button
      document.getElementById('open-btn')!.classList.remove('hidden');
    }
  });

  tl.to(cup.position, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'power2.inOut' }, 0);
  tl.to(cup.rotation, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'power2.inOut' }, 0);

  // Hide SHAKE button immediately
  document.getElementById('shake-btn')!.classList.add('hidden');
}

/* ──────────────────────────────────────────────
   openCup — shake 1.5s then lift the cup
   ────────────────────────────────────────────── */
const SHAKE_DURATION = 1.5; // seconds

function openCup() {
  if (isAnimating) return;
  isAnimating = true;

  document.getElementById('open-btn')!.classList.add('hidden');
  document.getElementById('shake-btn')!.classList.add('hidden');

  // Show status hint
  const hint = document.getElementById('status-hint')!;
  hint.classList.remove('hidden');

  // ── Phase 1: shake animation + sound ──────────
  playDiceRattle(SHAKE_DURATION);

  const shakeTl = gsap.timeline();
  const shakeAmp = 0.18;
  const shakeFreq = 0.07; // seconds per shake step
  const steps = Math.floor(SHAKE_DURATION / shakeFreq);

  for (let i = 0; i < steps; i++) {
    const dx = (Math.random() - 0.5) * shakeAmp * 2;
    const dz = (Math.random() - 0.5) * shakeAmp * 2;
    const rx = (Math.random() - 0.5) * 0.06;
    const rz = (Math.random() - 0.5) * 0.06;
    shakeTl.to(cup.position, { x: dx, z: dz, duration: shakeFreq, ease: 'none' });
    shakeTl.to(cup.rotation, { x: rx, z: rz, duration: shakeFreq, ease: 'none' }, `<`);
  }
  // Return to center before lift
  shakeTl.to(cup.position, { x: 0, z: 0, duration: 0.1, ease: 'power1.out' });
  shakeTl.to(cup.rotation, { x: 0, z: 0, duration: 0.1, ease: 'power1.out' }, `<`);

  // ── Phase 2: lift after shake finishes ────────
  shakeTl.call(() => {
    hint.classList.add('hidden'); // hide hint when cup lifts
    const liftTl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        document.getElementById('shake-btn')!.classList.remove('hidden');
      },
    });

    // Lift cup straight up and back
    liftTl.to(cup.position, { y: 10, z: -5, duration: 1.1, ease: 'power3.inOut' }, 0);
    liftTl.to(cup.rotation, { x: -0.25, duration: 1.1, ease: 'power3.inOut' }, 0);

    // Dice settle with staggered bounces
    diceArray.forEach((d, i) => {
      const baseY = DICE_POSITIONS[i][1];
      liftTl.fromTo(
        d.position,
        { y: baseY + 1.2 },
        { y: baseY, duration: 0.7, ease: 'bounce.out' },
        0.12 + i * 0.07
      );
    });
  });
}

/* ──────────────────────────────────────────────
   UI bindings
   ────────────────────────────────────────────── */
document.getElementById('open-btn')!.addEventListener('click', openCup);

document.getElementById('shake-btn')!.addEventListener('click', () => {
  if (isAnimating) return;
  resetGame();
});

/* ──────────────────────────────────────────────
   DeviceMotion — shake phone to open/shake
   ────────────────────────────────────────────── */
{
  let lastShakeTime = 0;
  const SHAKE_THRESHOLD = 18; // m/s² delta

  function handleMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const total = Math.abs(acc.x ?? 0) + Math.abs(acc.y ?? 0) + Math.abs(acc.z ?? 0);
    const now = Date.now();
    if (total > SHAKE_THRESHOLD && now - lastShakeTime > 1000) {
      lastShakeTime = now;
      if (!isAnimating) {
        // If cup is covering dice → open; if dice showing → reset
        const openBtn = document.getElementById('open-btn')!;
        const shakeBtn = document.getElementById('shake-btn')!;
        if (!openBtn.classList.contains('hidden')) {
          openCup();
        } else if (!shakeBtn.classList.contains('hidden')) {
          resetGame();
        }
      }
    }
  }

  // iOS 13+ requires permission
  if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    // We'll request on first button press to satisfy the user gesture requirement
    const requestMotion = async () => {
      try {
        const perm = await (DeviceMotionEvent as any).requestPermission();
        if (perm === 'granted') {
          window.addEventListener('devicemotion', handleMotion);
        }
      } catch { /* ignore */ }
    };
    document.getElementById('open-btn')!.addEventListener('click', requestMotion, { once: true });
    document.getElementById('shake-btn')!.addEventListener('click', requestMotion, { once: true });
  } else {
    // Android / older iOS — no permission needed
    window.addEventListener('devicemotion', handleMotion);
  }
}

/* ──────────────────────────────────────────────
   Responsive resize (handles orientation change)
   ────────────────────────────────────────────── */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 150));

/* ──────────────────────────────────────────────
   Render loop
   ────────────────────────────────────────────── */
function animate() {
  requestAnimationFrame(animate);

  // Very gentle camera orbit for a premium feel
  const t = performance.now() * 0.00025;
  camera.position.x = Math.sin(t) * 1.5;
  camera.position.z = 14 + Math.cos(t) * 1.5;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}

// Boot
resetGame();
animate();

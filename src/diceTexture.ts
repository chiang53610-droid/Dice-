import * as THREE from 'three';

const CANVAS_SIZE = 1024;

export function createFaceTexture(num: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  // --- Ivory / bone white background with subtle texture ---
  // Base fill
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Add subtle noise grain for realism
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * CANVAS_SIZE;
    const y = Math.random() * CANVAS_SIZE;
    const brightness = 220 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${brightness}, ${brightness - 5}, ${brightness - 15})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Rounded rectangle border with inset shadow effect
  const borderR = 40;
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 8;
  roundRect(ctx, 4, 4, CANVAS_SIZE - 8, CANVAS_SIZE - 8, borderR);
  ctx.stroke();

  // Inner subtle shadow on the edges (vignette)
  const vignette = ctx.createRadialGradient(
    CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.25,
    CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.55
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.06)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // --- Draw pips ---
  const isRed = num === 1 || num === 4;
  const baseColor = isRed ? '#c41e2a' : '#1a1a1a';
  const highlightColor = isRed ? '#ff6b74' : '#555555';
  const shadowColor = isRed ? '#7a0010' : '#000000';

  const pipRadius = CANVAS_SIZE * 0.082;
  const center = CANVAS_SIZE / 2;
  const offset = CANVAS_SIZE * 0.26;
  const left = center - offset;
  const right = center + offset;
  const top = center - offset;
  const bottom = center + offset;

  const drawPip = (x: number, y: number, radiusMul = 1) => {
    const r = pipRadius * radiusMul;

    // Outer shadow (indentation effect)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
    ctx.restore();

    // Main pip circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, shadowColor);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner highlight (glossy sphere effect)
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    const shiny = ctx.createRadialGradient(
      x - r * 0.25, y - r * 0.25, r * 0.05,
      x - r * 0.25, y - r * 0.25, r * 0.35
    );
    shiny.addColorStop(0, 'rgba(255,255,255,0.55)');
    shiny.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shiny;
    ctx.fill();
  };

  switch (num) {
    case 1:
      drawPip(center, center, 1.6);
      break;
    case 2:
      drawPip(right, top);
      drawPip(left, bottom);
      break;
    case 3:
      drawPip(right, top);
      drawPip(center, center);
      drawPip(left, bottom);
      break;
    case 4:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
    case 5:
      drawPip(left, top);
      drawPip(right, top);
      drawPip(center, center);
      drawPip(left, bottom);
      drawPip(right, bottom);
      break;
    case 6:
      drawPip(left, top);
      drawPip(left, center);
      drawPip(left, bottom);
      drawPip(right, top);
      drawPip(right, center);
      drawPip(right, bottom);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Pre-generate materials for faces 1..6
export const diceFaceMaterials: THREE.MeshStandardMaterial[] = [];
for (let i = 1; i <= 6; i++) {
  const tex = createFaceTexture(i);
  diceFaceMaterials.push(
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.25,
      metalness: 0.05,
      bumpMap: tex,
      bumpScale: 0.015,
    })
  );
}

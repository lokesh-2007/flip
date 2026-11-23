import * as THREE from 'three';

export function createTrenchGridTexture(accentHex: number, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const accent = new THREE.Color(accentHex);
  const accentCss = `#${accent.getHexString()}`;

  // Deep midnight navy-indigo base
  ctx.fillStyle = '#070b1e';
  ctx.fillRect(0, 0, size, size);

  // Subtle sub-grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  const subStep = size / 8;
  for (let i = 0; i <= 8; i++) {
    const p = i * subStep;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Primary cyber rail grid lines
  ctx.strokeStyle = accentCss;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Bright intersection nodes
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = accentCss;
  for (const x of [0, size / 2, size]) {
    for (const y of [0, size / 2, size]) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createCheckerboardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cells = 8;
  const cellSize = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const isLight = (x + y) % 2 === 0;
      ctx.fillStyle = isLight ? '#f8fafc' : '#0b1026';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // Subtle cyan trim border
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createDashedBeamTexture(colorHex: number): THREE.CanvasTexture {
  const w = 32;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const c = new THREE.Color(colorHex);
  const css = `#${c.getHexString()}`;

  ctx.clearRect(0, 0, w, h);
  const dashCount = 8;
  const step = h / dashCount;
  for (let i = 0; i < dashCount; i++) {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, css);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(2, i * step + 4, w - 4, step * 0.55);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

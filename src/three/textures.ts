import * as THREE from 'three';

export function createTrenchGridTexture(
  accentHex: number,
  hazardHex: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const accent = new THREE.Color(accentHex);
  const hazard = new THREE.Color(hazardHex);
  const accentCss = `#${accent.getHexString()}`;
  const hazardCss = `#${hazard.getHexString()}`;

  // Deep cyber-indigo gradient floor base
  const bgGrad = ctx.createLinearGradient(0, 0, size, 0);
  bgGrad.addColorStop(0, '#0a0f2c');
  bgGrad.addColorStop(0.5, '#050817');
  bgGrad.addColorStop(1, '#0a0f2c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle vertical neon edge glow bands along left/right edges
  const edgeGradL = ctx.createLinearGradient(0, 0, size * 0.22, 0);
  edgeGradL.addColorStop(0, `${accentCss}55`);
  edgeGradL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edgeGradL;
  ctx.fillRect(0, 0, size * 0.22, size);

  const edgeGradR = ctx.createLinearGradient(size, 0, size * 0.78, 0);
  edgeGradR.addColorStop(0, `${hazardCss}55`);
  edgeGradR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edgeGradR;
  ctx.fillRect(size * 0.78, 0, size * 0.22, size);

  // Multi-stop neon gradient for cross-lines
  const lineGrad = ctx.createLinearGradient(0, 0, size, size);
  lineGrad.addColorStop(0, accentCss);
  lineGrad.addColorStop(0.5, '#a855f7');
  lineGrad.addColorStop(1, hazardCss);

  // Fine sub-grid
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
  ctx.lineWidth = 1.5;
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

  // Primary neon gradient grid rails
  ctx.strokeStyle = lineGrad;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Center lane forward chevron accents
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  for (const cy of [size * 0.25, size * 0.75]) {
    ctx.beginPath();
    ctx.moveTo(size * 0.42, cy + 16);
    ctx.lineTo(size * 0.5, cy - 12);
    ctx.lineTo(size * 0.58, cy + 16);
    ctx.stroke();
  }

  // Bloom-ready bright intersection nodes
  ctx.globalAlpha = 0.95;
  for (const x of [0, size / 2, size]) {
    for (const y of [0, size / 2, size]) {
      const nodeGrad = ctx.createRadialGradient(x, y, 0, x, y, 10);
      nodeGrad.addColorStop(0, '#ffffff');
      nodeGrad.addColorStop(0.45, accentCss);
      nodeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nodeGrad;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
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

export function createNeonGradientRibbonTexture(
  accentHex: number,
  hazardHex: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const c1 = `#${new THREE.Color(accentHex).getHexString()}`;
  const c2 = `#${new THREE.Color(hazardHex).getHexString()}`;

  ctx.clearRect(0, 0, w, h);

  // Horizontal sweeping neon gradient band
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.35, '#818cf8');
  grad.addColorStop(0.65, c2);
  grad.addColorStop(1, c1);

  // Vertical soft fade from bright rail core outward
  const vMask = ctx.createLinearGradient(0, 0, 0, h);
  vMask.addColorStop(0, 'rgba(255,255,255,0)');
  vMask.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  vMask.addColorStop(0.5, 'rgba(255,255,255,1)');
  vMask.addColorStop(0.65, 'rgba(255,255,255,0.65)');
  vMask.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = vMask;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createHorizonGradientTexture(
  accentHex: number,
  hazardHex: number
): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const c1 = `#${new THREE.Color(accentHex).getHexString()}`;
  const c2 = `#${new THREE.Color(hazardHex).getHexString()}`;

  const grad = ctx.createRadialGradient(w * 0.5, h * 0.55, 8, w * 0.5, h * 0.5, w * 0.5);
  grad.addColorStop(0, `${c1}99`);
  grad.addColorStop(0.45, `${c2}55`);
  grad.addColorStop(1, 'rgba(6, 9, 24, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

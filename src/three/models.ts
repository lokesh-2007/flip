import * as THREE from 'three';
import {
  BlockObstacle,
  CraftSkin,
  SawObstacle,
  SpikeClusterObstacle,
  StarMineObstacle,
} from '../types/game';

export interface PlayerCraftHandles {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  thrusterCone: THREE.Mesh;
  pointLight: THREE.PointLight;
  setSkin: (skin: CraftSkin) => void;
}

export function createPlayerCraft(skin: CraftSkin): PlayerCraftHandles {
  const group = new THREE.Group();

  // 1. Inner faceted energy core
  const coreGeo = new THREE.IcosahedronGeometry(0.28, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: skin.coreColor,
    emissive: skin.coreColor,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.2,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  // 2. Translucent energy shell
  const shellGeo = new THREE.SphereGeometry(0.36, 20, 20);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: skin.trailColor,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  group.add(shellMesh);

  // 3. Primary brushed titanium gyro ring
  const outerRingGeo = new THREE.TorusGeometry(0.5, 0.055, 12, 32);
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.22,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, metalMat);
  outerRing.rotation.y = Math.PI / 2;
  group.add(outerRing);

  // 4. Inner glowing gimbal ring
  const innerRingGeo = new THREE.TorusGeometry(0.41, 0.032, 10, 28);
  const rimMat = new THREE.MeshStandardMaterial({
    color: skin.trailColor,
    emissive: skin.trailColor,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.7,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, rimMat);
  innerRing.rotation.x = Math.PI / 3;
  group.add(innerRing);

  // 5. Beveled side winglets (ExtrudeGeometry)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(-0.35, 0);
  wingShape.lineTo(0.22, 0);
  wingShape.lineTo(0.05, 0.22);
  wingShape.lineTo(-0.28, 0.14);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  wingGeo.center();

  const leftWing = new THREE.Mesh(wingGeo, metalMat);
  leftWing.rotation.y = Math.PI / 2;
  leftWing.rotation.x = 0.35;
  leftWing.position.set(-0.46, 0, -0.05);
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, metalMat);
  rightWing.rotation.y = Math.PI / 2;
  rightWing.rotation.x = -0.35;
  rightWing.position.set(0.46, 0, -0.05);
  group.add(rightWing);

  // 6. Rear plasma thruster cone (pointing along -Z)
  const thrusterGeo = new THREE.ConeGeometry(0.2, 0.55, 16);
  thrusterGeo.rotateX(-Math.PI / 2);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: skin.coreColor,
    emissive: skin.trailColor,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.88,
  });
  const thrusterCone = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterCone.position.set(0, 0, -0.52);
  group.add(thrusterCone);

  // 7. Dynamic craft point light
  const pointLight = new THREE.PointLight(skin.trailColor, 5.5, 14, 1.5);
  pointLight.position.set(0, 0, 0.2);
  group.add(pointLight);

  const setSkin = (nextSkin: CraftSkin) => {
    coreMat.color.setHex(nextSkin.coreColor);
    coreMat.emissive.setHex(nextSkin.coreColor);
    shellMat.emissive.setHex(nextSkin.trailColor);
    rimMat.color.setHex(nextSkin.trailColor);
    rimMat.emissive.setHex(nextSkin.trailColor);
    thrusterMat.color.setHex(nextSkin.coreColor);
    thrusterMat.emissive.setHex(nextSkin.trailColor);
    pointLight.color.setHex(nextSkin.trailColor);
  };

  return {
    group,
    coreMesh,
    outerRing,
    innerRing,
    thrusterCone,
    pointLight,
    setSkin,
  };
}

export function createSawBlade(obs: SawObstacle, hazardHex: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, obs.y, obs.z);

  const teeth = 14;
  const rOuter = obs.radius;
  const rInner = obs.radius * 0.76;
  const shape = new THREE.Shape();

  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const aTip = ((i + 0.35) / teeth) * Math.PI * 2;
    const aNext = ((i + 1) / teeth) * Math.PI * 2;

    const x0 = Math.cos(a0) * rInner;
    const y0 = Math.sin(a0) * rInner;
    const xTip = Math.cos(aTip) * rOuter;
    const yTip = Math.sin(aTip) * rOuter;
    const xNext = Math.cos(aNext) * rInner;
    const yNext = Math.sin(aNext) * rInner;

    if (i === 0) shape.moveTo(x0, y0);
    else shape.lineTo(x0, y0);
    shape.lineTo(xTip, yTip);
    shape.lineTo(xNext, yNext);
  }
  shape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  bladeGeo.center();
  // Rotate so the saw blade faces along the Z-Y plane (rotating around X)
  bladeGeo.rotateY(Math.PI / 2);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x1a102e,
    emissive: hazardHex,
    emissiveIntensity: 0.55,
    metalness: 0.85,
    roughness: 0.25,
  });
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  group.add(bladeMesh);

  // Glowing neon rim ring
  const ringGeo = new THREE.TorusGeometry(rInner * 0.82, 0.06, 10, 28);
  ringGeo.rotateY(Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color: hazardHex,
    emissive: hazardHex,
    emissiveIntensity: 1.9,
    roughness: 0.2,
    metalness: 0.4,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.x = 0.2;
  group.add(ringMesh);

  const ringMeshBack = ringMesh.clone();
  ringMeshBack.position.x = -0.2;
  group.add(ringMeshBack);

  // Center brushed metallic axle hub
  const hubGeo = new THREE.CylinderGeometry(rInner * 0.38, rInner * 0.38, 0.72, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.92,
    roughness: 0.2,
  });
  const hubMesh = new THREE.Mesh(hubGeo, hubMat);
  group.add(hubMesh);

  return group;
}

export function createStarMine(obs: StarMineObstacle, hazardHex: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, obs.y, obs.z);

  const points = 4;
  const rOuter = obs.radius;
  const rInner = obs.radius * 0.36;
  const shape = new THREE.Shape();

  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const starGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  starGeo.center();
  starGeo.rotateY(Math.PI / 2);

  const starMat = new THREE.MeshStandardMaterial({
    color: 0x2a0f3e,
    emissive: hazardHex,
    emissiveIntensity: 0.7,
    metalness: 0.75,
    roughness: 0.25,
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  group.add(starMesh);

  // Crisp glowing neon wireframe edge
  const edges = new THREE.EdgesGeometry(starGeo, 20);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xf472b6 });
  group.add(new THREE.LineSegments(edges, edgeMat));

  // Center faceted energy core
  const coreGeo = new THREE.OctahedronGeometry(rInner * 0.9, 0);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.8,
    roughness: 0.15,
    metalness: 0.3,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  group.add(coreMesh);

  return group;
}

export function createSpikeCluster(obs: SpikeClusterObstacle, hazardHex: number): THREE.Group {
  const group = new THREE.Group();
  const len = obs.zEnd - obs.zStart;
  const zCenter = (obs.zStart + obs.zEnd) * 0.5;
  const isFloor = obs.placement === 'floor';

  // Dark metallic base rail anchored flush to floor (0) or ceiling (12)
  const baseH = 0.22;
  const baseGeo = new THREE.BoxGeometry(2.2, baseH, len);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x161b33,
    metalness: 0.85,
    roughness: 0.35,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.set(0, isFloor ? baseH * 0.5 : 12 - baseH * 0.5, zCenter);
  group.add(baseMesh);

  // Warning strip along rail edge
  const stripGeo = new THREE.BoxGeometry(2.26, 0.08, len);
  const stripMat = new THREE.MeshStandardMaterial({
    color: hazardHex,
    emissive: hazardHex,
    emissiveIntensity: 1.5,
    roughness: 0.3,
    metalness: 0.2,
  });
  const stripMesh = new THREE.Mesh(stripGeo, stripMat);
  stripMesh.position.set(0, isFloor ? baseH : 12 - baseH, zCenter);
  group.add(stripMesh);

  // Spikes using InstancedMesh along Z (and 2 rows across X for 3D depth!)
  const spikePitch = 1.45;
  const countZ = Math.max(2, Math.floor(len / spikePitch));
  const totalSpikes = countZ * 2;
  const coneH = obs.height - baseH * 0.7;
  const coneGeo = new THREE.ConeGeometry(0.46, coneH, 4);
  coneGeo.rotateY(Math.PI / 4);

  const spikeMat = new THREE.MeshStandardMaterial({
    color: 0x241338,
    emissive: hazardHex,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.25,
  });

  const instanced = new THREE.InstancedMesh(coneGeo, spikeMat, totalSpikes);
  const dummy = new THREE.Object3D();
  let idx = 0;

  for (let i = 0; i < countZ; i++) {
    const z = obs.zStart + (i + 0.5) * (len / countZ);
    for (const xOffset of [-0.48, 0.48]) {
      dummy.position.set(
        xOffset,
        isFloor ? baseH + coneH * 0.5 : 12 - baseH - coneH * 0.5,
        z
      );
      dummy.rotation.set(isFloor ? 0 : Math.PI, 0, 0);
      dummy.updateMatrix();
      instanced.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instanced.instanceMatrix.needsUpdate = true;
  instanced.computeBoundingSphere();
  group.add(instanced);

  return group;
}

export function getBlockSubBoxes(obs: BlockObstacle): Array<{ zMin: number; zMax: number; yMin: number; yMax: number }> {
  if (obs.shape === 'rect') {
    return [
      {
        zMin: obs.z - obs.width * 0.5,
        zMax: obs.z + obs.width * 0.5,
        yMin: obs.y - obs.height * 0.5,
        yMax: obs.y + obs.height * 0.5,
      },
    ];
  }

  const barH = obs.height * 0.36;
  const stemH = obs.height * 0.64;
  const stemW = obs.width * 0.42;

  if (obs.shape === 'tTop') {
    const topY = obs.y + obs.height * 0.5;
    const barCenterY = topY - barH * 0.5;
    const stemCenterY = topY - barH - stemH * 0.5;
    return [
      {
        zMin: obs.z - obs.width * 0.5,
        zMax: obs.z + obs.width * 0.5,
        yMin: barCenterY - barH * 0.5,
        yMax: barCenterY + barH * 0.5,
      },
      {
        zMin: obs.z - stemW * 0.5,
        zMax: obs.z + stemW * 0.5,
        yMin: stemCenterY - stemH * 0.5,
        yMax: stemCenterY + stemH * 0.5,
      },
    ];
  }

  // tBottom
  const botY = obs.y - obs.height * 0.5;
  const barCenterY = botY + barH * 0.5;
  const stemCenterY = botY + barH + stemH * 0.5;
  return [
    {
      zMin: obs.z - obs.width * 0.5,
      zMax: obs.z + obs.width * 0.5,
      yMin: barCenterY - barH * 0.5,
      yMax: barCenterY + barH * 0.5,
    },
    {
      zMin: obs.z - stemW * 0.5,
      zMax: obs.z + stemW * 0.5,
      yMin: stemCenterY - stemH * 0.5,
      yMax: stemCenterY + stemH * 0.5,
    },
  ];
}

export function createBlockObstacle(obs: BlockObstacle, accentHex: number, hazardHex: number): THREE.Group {
  const group = new THREE.Group();
  const boxes = getBlockSubBoxes(obs);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0d132c,
    metalness: 0.78,
    roughness: 0.28,
  });

  const edgeMat = new THREE.LineBasicMaterial({
    color: hazardHex,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.5,
  });

  for (const box of boxes) {
    const wZ = box.zMax - box.zMin;
    const hY = box.yMax - box.yMin;
    const cZ = (box.zMin + box.zMax) * 0.5;
    const cY = (box.yMin + box.yMax) * 0.5;

    const geo = new THREE.BoxGeometry(2.6, hY, wZ);
    const mesh = new THREE.Mesh(geo, bodyMat);
    mesh.position.set(0, cY, cZ);
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, edgeMat);
    line.position.set(0, cY, cZ);
    group.add(line);

    // Side recessed glowing plate for 3D depth readability
    const plateGeo = new THREE.BoxGeometry(2.66, hY * 0.56, wZ * 0.65);
    const plate = new THREE.Mesh(plateGeo, trimMat);
    plate.position.set(0, cY, cZ);
    group.add(plate);
  }

  return group;
}

export function createGoldCube(): THREE.Group {
  const group = new THREE.Group();

  const outerGeo = new THREE.BoxGeometry(0.56, 0.56, 0.56);
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    metalness: 0.9,
    roughness: 0.18,
  });
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerMesh);

  const edges = new THREE.EdgesGeometry(outerGeo);
  const edgeLine = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xfef08a })
  );
  group.add(edgeLine);

  const innerGeo = new THREE.OctahedronGeometry(0.24, 0);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 1.6,
    roughness: 0.1,
    metalness: 0.2,
  });
  group.add(new THREE.Mesh(innerGeo, innerMat));

  return group;
}

export function createStarCollectible(): THREE.Group {
  const group = new THREE.Group();

  const shape = new THREE.Shape();
  const points = 5;
  const rOuter = 0.68;
  const rInner = 0.31;
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.center();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    metalness: 0.88,
    roughness: 0.15,
  });
  const starMesh = new THREE.Mesh(geo, mat);
  group.add(starMesh);

  // Orbiting halo ring
  const ringGeo = new THREE.TorusGeometry(0.84, 0.04, 8, 28);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  return group;
}

export function createSpeedGate(z: number, multiplier: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 6.0, z);

  const isBoost = multiplier > 1.05;
  const color = isBoost ? 0x22d3ee : 0x34d399;

  // Hexagonal gate frame spanning full track height
  const ringGeo = new THREE.TorusGeometry(4.8, 0.14, 8, 6);
  ringGeo.rotateY(Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.6,
    roughness: 0.25,
    metalness: 0.6,
  });
  const gateRing = new THREE.Mesh(ringGeo, ringMat);
  gateRing.scale.set(1, 1.12, 0.5);
  group.add(gateRing);

  // Translucent energy curtain inside gate
  const innerGeo = new THREE.RingGeometry(1.4, 4.65, 6);
  innerGeo.rotateY(Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.scale.set(1, 1.12, 0.5);
  group.add(innerMesh);

  // Vertical guide struts to floor/ceiling
  const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 12, 8);
  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.25,
  });
  const strutL = new THREE.Mesh(strutGeo, strutMat);
  strutL.position.set(-2.4, 0, 0);
  group.add(strutL);

  const strutR = strutL.clone();
  strutR.position.set(2.4, 0, 0);
  group.add(strutR);

  return group;
}

export function createCheckpointMarker(
  z: number,
  beamTex: THREE.CanvasTexture,
  accentHex: number
): { group: THREE.Group; activate: () => void; reset: () => void } {
  const group = new THREE.Group();
  group.position.set(0, 0, z);

  // Vertical dashed laser curtain
  const beamGeo = new THREE.PlaneGeometry(0.42, 11.6);
  beamGeo.rotateY(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: accentHex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, 6.0, 0);
  group.add(beamMesh);

  // Floor & ceiling beacon pads
  const padGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.22, 6);
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const botPad = new THREE.Mesh(padGeo, padMat);
  botPad.position.set(-1.5, 0.11, 0);
  group.add(botPad);

  const topPad = botPad.clone();
  topPad.position.set(-1.5, 11.89, 0);
  group.add(topPad);

  // Checkpoint flag prism
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(1.1, 0.4);
  flagShape.lineTo(0, 0.8);
  flagShape.closePath();

  const flagGeo = new THREE.ExtrudeGeometry(flagShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  flagGeo.rotateY(Math.PI / 2);

  const flagMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.0,
    roughness: 0.25,
    metalness: 0.4,
  });
  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(-1.5, 1.4, -0.1);
  group.add(flagMesh);

  // Flag pole
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8);
  const pole = new THREE.Mesh(poleGeo, padMat);
  pole.position.set(-1.5, 1.15, 0);
  group.add(pole);

  const activate = () => {
    beamMat.color.setHex(0x34d399);
    beamMat.opacity = 0.95;
    flagMat.color.setHex(0x34d399);
    flagMat.emissive.setHex(0x10b981);
    flagMat.emissiveIntensity = 1.9;
  };

  const reset = () => {
    beamMat.color.setHex(accentHex);
    beamMat.opacity = 0.65;
    flagMat.color.setHex(accentHex);
    flagMat.emissive.setHex(accentHex);
    flagMat.emissiveIntensity = 1.0;
  };

  return { group, activate, reset };
}

export function createFinishPortal(
  length: number,
  checkerTex: THREE.CanvasTexture,
  accentHex: number
): { group: THREE.Group; ring: THREE.Mesh } {
  const group = new THREE.Group();
  group.position.set(0, 0, length);

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.2,
  });

  // Left & Right arch pillars
  const pillarGeo = new THREE.BoxGeometry(0.9, 12.6, 1.2);
  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-3.2, 6.0, 0);
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(3.2, 6.0, 0);
  group.add(rightPillar);

  // Checkered goal strip along both pillars and top/bottom lintels
  const checkerMat = new THREE.MeshStandardMaterial({
    map: checkerTex,
    emissive: 0xffffff,
    emissiveMap: checkerTex,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.2,
  });

  const checkerWallGeo = new THREE.PlaneGeometry(5.6, 11.4);
  checkerWallGeo.rotateY(Math.PI / 2);
  const checkerBannerGeo = new THREE.BoxGeometry(6.8, 1.1, 1.35);
  const topBanner = new THREE.Mesh(checkerBannerGeo, checkerMat);
  topBanner.position.set(0, 12.1, 0);
  group.add(topBanner);

  const botBanner = new THREE.Mesh(checkerBannerGeo, checkerMat);
  botBanner.position.set(0, -0.1, 0);
  group.add(botBanner);

  // Translucent energy finish gate curtain
  const portalCurtainGeo = new THREE.PlaneGeometry(5.8, 11.6);
  const portalCurtainMat = new THREE.MeshBasicMaterial({
    map: checkerTex,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const curtain = new THREE.Mesh(portalCurtainGeo, portalCurtainMat);
  curtain.position.set(0, 6.0, 0);
  group.add(curtain);

  // Rotating neon portal ring
  const ringGeo = new THREE.TorusGeometry(4.2, 0.16, 12, 40);
  const ringMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(0, 6.0, 0.2);
  group.add(ring);

  return { group, ring };
}

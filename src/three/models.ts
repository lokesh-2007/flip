import * as THREE from 'three';
import {
  BlockObstacle,
  CraftSkin,
  LaserBarObstacle,
  OrbitMineObstacle,
  PatrolDroneObstacle,
  RotaryGateObstacle,
  SawObstacle,
  SpikeClusterObstacle,
  StarMineObstacle,
  WarpGateObstacle,
} from '../types/game';

export interface PlayerCraftHandles {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  coreMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  thrusterCone: THREE.Mesh;
  shieldMesh: THREE.Group;
  auraRing: THREE.Mesh;
  laserBeam: THREE.Mesh;
  pointLight: THREE.PointLight;
  setSkin: (skin: CraftSkin) => void;
}

function buildAvatarBody(
  skin: CraftSkin,
  metalMat: THREE.MeshStandardMaterial,
  coreMat: THREE.MeshStandardMaterial,
  rimMat: THREE.MeshStandardMaterial,
  shellMat: THREE.MeshPhysicalMaterial
): { bodyGroup: THREE.Group; coreMesh: THREE.Mesh; outerRing: THREE.Mesh; innerRing: THREE.Mesh } {
  const bodyGroup = new THREE.Group();

  // Shared anchor placeholders for rotation animations
  let coreMesh: THREE.Mesh;
  let outerRing: THREE.Mesh;
  let innerRing: THREE.Mesh;

  if (skin.shape === 'dart') {
    // Solar Dart: Swept-wing delta interceptor
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 0.65);
    hullShape.lineTo(0.24, 0.05);
    hullShape.lineTo(0.62, -0.36);
    hullShape.lineTo(0.18, -0.28);
    hullShape.lineTo(0, -0.46);
    hullShape.lineTo(-0.18, -0.28);
    hullShape.lineTo(-0.62, -0.36);
    hullShape.lineTo(-0.24, 0.05);
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    hullGeo.center();
    hullGeo.rotateX(Math.PI / 2);

    coreMesh = new THREE.Mesh(hullGeo, metalMat);
    bodyGroup.add(coreMesh);

    const canopyGeo = new THREE.OctahedronGeometry(0.22, 1);
    canopyGeo.scale(0.8, 0.6, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, coreMat);
    canopy.position.set(0, 0.12, 0.08);
    bodyGroup.add(canopy);

    const railGeo = new THREE.BoxGeometry(0.08, 0.06, 0.72);
    const leftPod = new THREE.Mesh(railGeo, rimMat);
    leftPod.position.set(-0.42, 0, -0.1);
    bodyGroup.add(leftPod);

    const rightPod = new THREE.Mesh(railGeo, rimMat);
    rightPod.position.set(0.42, 0, -0.1);
    bodyGroup.add(rightPod);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 24), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    outerRing.position.z = -0.18;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 20), coreMat);
    innerRing.position.z = -0.32;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'prism') {
    // Prism Star: Crystalline octahedron + 4 orbiting shards + twin halos
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), coreMat);
    bodyGroup.add(coreMesh);

    const shellMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), shellMat);
    bodyGroup.add(shellMesh);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 6, 6), metalMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 8, 24), rimMat);
    innerRing.rotation.x = Math.PI / 4;
    bodyGroup.add(innerRing);

    const shardGeo = new THREE.TetrahedronGeometry(0.14, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const shard = new THREE.Mesh(shardGeo, rimMat);
      shard.position.set(Math.cos(a) * 0.54, Math.sin(a) * 0.54, 0);
      bodyGroup.add(shard);
    }
  } else if (skin.shape === 'scythe') {
    // Apex Scythe: Twin forward-swept cyber fangs
    coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.62), metalMat);
    bodyGroup.add(coreMesh);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, -0.35);
    bladeShape.lineTo(0.16, 0.15);
    bladeShape.lineTo(0.06, 0.72);
    bladeShape.lineTo(-0.08, 0.28);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    bladeGeo.center();
    bladeGeo.rotateX(Math.PI / 2);

    const leftBlade = new THREE.Mesh(bladeGeo, rimMat);
    leftBlade.position.set(-0.34, 0, 0.15);
    bodyGroup.add(leftBlade);

    const rightBlade = new THREE.Mesh(bladeGeo, rimMat);
    rightBlade.position.set(0.34, 0, 0.15);
    rightBlade.rotation.z = Math.PI;
    bodyGroup.add(rightBlade);

    const eyeCore = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), coreMat);
    eyeCore.position.set(0, 0.08, 0.22);
    bodyGroup.add(eyeCore);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 24), metalMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 20), coreMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'phantom') {
    // Jade Phantom: Hexagonal stealth disc + tri-wing fins
    coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 6), metalMat);
    coreMesh.rotation.z = Math.PI / 2;
    bodyGroup.add(coreMesh);

    const coreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), coreMat);
    bodyGroup.add(coreOrb);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.038, 6, 6), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.028, 6, 6), coreMat);
    innerRing.rotation.x = Math.PI / 2;
    bodyGroup.add(innerRing);

    const finGeo = new THREE.BoxGeometry(0.55, 0.05, 0.24);
    for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      const fin = new THREE.Mesh(finGeo, metalMat);
      fin.rotation.z = angle;
      fin.position.set(Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, -0.1);
      bodyGroup.add(fin);
    }
  } else if (skin.shape === 'nova') {
    // Nova Crown: Celestial core + 3 interlocking crown rings + spire fins
    coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), coreMat);
    bodyGroup.add(coreMesh);

    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 18), shellMat);
    bodyGroup.add(shellMesh);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.048, 10, 32), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.036, 10, 28), metalMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);

    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.032, 10, 28), coreMat);
    crownRing.rotation.x = -Math.PI / 3;
    bodyGroup.add(crownRing);

    const spikeGeo = new THREE.ConeGeometry(0.08, 0.28, 4);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spire = new THREE.Mesh(spikeGeo, rimMat);
      spire.position.set(0, Math.sin(a) * 0.56, Math.cos(a) * 0.56);
      spire.rotation.x = a + Math.PI / 2;
      bodyGroup.add(spire);
    }
  } else if (skin.shape === 'shuriken') {
    // Volt Shuriken: 4 swept extruded plasma blades + rotating spinner core
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), coreMat);
    bodyGroup.add(coreMesh);

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0.14);
    bladeShape.lineTo(0.22, 0.22);
    bladeShape.lineTo(0.56, 0.04);
    bladeShape.lineTo(0.26, -0.14);
    bladeShape.closePath();

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    bladeGeo.center();

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const arm = new THREE.Mesh(bladeGeo, i % 2 === 0 ? metalMat : rimMat);
      arm.rotation.y = Math.PI / 2;
      arm.rotation.x = angle;
      arm.position.set(0, Math.sin(angle) * 0.34, Math.cos(angle) * 0.34);
      bodyGroup.add(arm);
    }

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.036, 8, 28), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 20), coreMat);
    innerRing.rotation.x = Math.PI / 4;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'viper') {
    // Cobalt Viper: Twin-prong cyber jet + needle prow + turbine pods
    const prowGeo = new THREE.ConeGeometry(0.2, 0.85, 6);
    prowGeo.rotateX(Math.PI / 2);
    coreMesh = new THREE.Mesh(prowGeo, metalMat);
    coreMesh.position.z = 0.18;
    bodyGroup.add(coreMesh);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), coreMat);
    canopy.scale.set(0.85, 0.7, 1.8);
    canopy.position.set(0, 0.12, 0.08);
    bodyGroup.add(canopy);

    const prongGeo = new THREE.BoxGeometry(0.12, 0.08, 0.92);
    const leftProng = new THREE.Mesh(prongGeo, rimMat);
    leftProng.position.set(-0.32, -0.02, 0.04);
    leftProng.rotation.y = 0.12;
    bodyGroup.add(leftProng);

    const rightProng = new THREE.Mesh(prongGeo, rimMat);
    rightProng.position.set(0.32, -0.02, 0.04);
    rightProng.rotation.y = -0.12;
    bodyGroup.add(rightProng);

    const wingGeo = new THREE.BoxGeometry(0.95, 0.045, 0.28);
    const wing = new THREE.Mesh(wingGeo, metalMat);
    wing.position.set(0, 0, -0.16);
    bodyGroup.add(wing);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.032, 8, 24), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    outerRing.position.z = -0.12;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.026, 8, 18), coreMat);
    innerRing.position.z = -0.34;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'lotus') {
    // Crimson Lotus: Crystalline bloom core + 6 sculpted geometric petals
    coreMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), coreMat);
    bodyGroup.add(coreMesh);

    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), shellMat);
    bodyGroup.add(shellMesh);

    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.lineTo(0.14, 0.24);
    petalShape.lineTo(0, 0.52);
    petalShape.lineTo(-0.14, 0.24);
    petalShape.closePath();

    const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    petalGeo.center();

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, i % 2 === 0 ? rimMat : metalMat);
      petal.position.set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, -0.05);
      petal.rotation.z = a - Math.PI / 2;
      petal.rotation.x = 0.35;
      bodyGroup.add(petal);
    }

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 28), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 24), coreMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'titan') {
    // Obsidian Titan: Heavy armored mech-pod + twin shield plates + molten core
    coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.56, 6), metalMat);
    coreMesh.rotation.x = Math.PI / 2;
    bodyGroup.add(coreMesh);

    const furnaceCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), coreMat);
    furnaceCore.position.z = 0.2;
    bodyGroup.add(furnaceCore);

    const plateGeo = new THREE.BoxGeometry(0.14, 0.54, 0.64);
    const leftPlate = new THREE.Mesh(plateGeo, metalMat);
    leftPlate.position.set(-0.44, 0, 0.02);
    leftPlate.rotation.z = 0.2;
    bodyGroup.add(leftPlate);

    const rightPlate = new THREE.Mesh(plateGeo, metalMat);
    rightPlate.position.set(0.44, 0, 0.02);
    rightPlate.rotation.z = -0.2;
    bodyGroup.add(rightPlate);

    const bumperGeo = new THREE.BoxGeometry(0.52, 0.14, 0.22);
    const bumper = new THREE.Mesh(bumperGeo, rimMat);
    bumper.position.set(0, 0, 0.34);
    bodyGroup.add(bumper);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.048, 8, 6), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.032, 8, 24), coreMat);
    innerRing.rotation.x = Math.PI / 2;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'reaper') {
    // Inferno Reaper: Aggressive twin-scythe war-frame + plasma furnace + dorsal fins
    coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), coreMat);
    bodyGroup.add(coreMesh);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.68), metalMat);
    chassis.position.z = -0.04;
    bodyGroup.add(chassis);

    const fangShape = new THREE.Shape();
    fangShape.moveTo(0, -0.25);
    fangShape.lineTo(0.22, 0.08);
    fangShape.lineTo(0.14, 0.78);
    fangShape.lineTo(-0.04, 0.42);
    fangShape.closePath();

    const fangGeo = new THREE.ExtrudeGeometry(fangShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    fangGeo.center();
    fangGeo.rotateX(Math.PI / 2);

    const leftFang = new THREE.Mesh(fangGeo, rimMat);
    leftFang.position.set(-0.36, 0, 0.14);
    leftFang.rotation.y = -0.18;
    bodyGroup.add(leftFang);

    const rightFang = new THREE.Mesh(fangGeo, rimMat);
    rightFang.position.set(0.36, 0, 0.14);
    rightFang.rotation.z = Math.PI;
    rightFang.rotation.y = 0.18;
    bodyGroup.add(rightFang);

    const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.45), rimMat);
    dorsalFin.position.set(0, 0.24, -0.14);
    dorsalFin.rotation.x = -0.35;
    bodyGroup.add(dorsalFin);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 24), metalMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 20), coreMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'annihilator') {
    // Void Annihilator: Triaxial void dreadnought + singularity core + 3 monolith blades
    coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), coreMat);
    bodyGroup.add(coreMesh);

    const shellMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), shellMat);
    bodyGroup.add(shellMesh);

    const monolithGeo = new THREE.BoxGeometry(0.14, 0.42, 0.62);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const pylon = new THREE.Mesh(monolithGeo, i === 0 ? rimMat : metalMat);
      pylon.position.set(Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.04);
      pylon.rotation.z = a;
      bodyGroup.add(pylon);
    }

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 8, 6), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.032, 8, 28), coreMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'aegis') {
    // Aegis Bulwark: Heavy hexagonal bastion core + twin beveled deflector shields + dual shield halos
    coreMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.52, 6), metalMat);
    coreMesh.rotation.x = Math.PI / 2;
    bodyGroup.add(coreMesh);

    const reactorOrb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), coreMat);
    reactorOrb.position.z = 0.22;
    bodyGroup.add(reactorOrb);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, -0.38);
    shieldShape.lineTo(0.24, -0.18);
    shieldShape.lineTo(0.28, 0.26);
    shieldShape.lineTo(0, 0.42);
    shieldShape.lineTo(-0.16, 0.16);
    shieldShape.closePath();

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    shieldGeo.center();

    const leftShield = new THREE.Mesh(shieldGeo, metalMat);
    leftShield.position.set(-0.44, 0, 0.12);
    leftShield.rotation.y = 0.45;
    bodyGroup.add(leftShield);

    const rightShield = new THREE.Mesh(shieldGeo, metalMat);
    rightShield.position.set(0.44, 0, 0.12);
    rightShield.rotation.y = -0.45;
    rightShield.rotation.z = Math.PI;
    bodyGroup.add(rightShield);

    const visorBar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.18), rimMat);
    visorBar.position.set(0, 0.06, 0.3);
    bodyGroup.add(visorBar);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 8, 6), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.032, 8, 24), coreMat);
    innerRing.rotation.x = Math.PI / 2;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'bastion') {
    // Chrono Bastion: Faceted diamond cryo-hull + twin vertical stabilizer fins + cryo glass canopy
    const hullGeo = new THREE.OctahedronGeometry(0.38, 0);
    hullGeo.scale(0.95, 0.72, 1.45);
    coreMesh = new THREE.Mesh(hullGeo, metalMat);
    bodyGroup.add(coreMesh);

    const glassDome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), shellMat);
    glassDome.position.set(0, 0.08, 0.06);
    bodyGroup.add(glassDome);

    const cryoCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), coreMat);
    cryoCore.position.set(0, 0.04, 0.14);
    bodyGroup.add(cryoCore);

    const arcGeo = new THREE.TorusGeometry(0.46, 0.038, 8, 18, Math.PI * 1.15);
    const topArc = new THREE.Mesh(arcGeo, rimMat);
    topArc.rotation.z = -Math.PI * 0.075;
    topArc.position.z = -0.06;
    bodyGroup.add(topArc);

    const finGeo = new THREE.BoxGeometry(0.06, 0.44, 0.48);
    const topFin = new THREE.Mesh(finGeo, metalMat);
    topFin.position.set(0, 0.34, -0.14);
    bodyGroup.add(topFin);

    const botFin = new THREE.Mesh(finGeo, metalMat);
    botFin.position.set(0, -0.34, -0.14);
    bodyGroup.add(botFin);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.038, 8, 28), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.028, 8, 24), coreMat);
    innerRing.rotation.x = Math.PI / 4;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'sentinel') {
    // Sentinel Ward: Sapphire icosahedron core + 3 beveled prism ward plates + twin interceptor rings
    coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 0), coreMat);
    bodyGroup.add(coreMesh);

    const wardShell = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 1), shellMat);
    bodyGroup.add(wardShell);

    const plateShape = new THREE.Shape();
    plateShape.moveTo(0, 0.24);
    plateShape.lineTo(0.22, -0.14);
    plateShape.lineTo(-0.22, -0.14);
    plateShape.closePath();

    const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    plateGeo.center();

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const plate = new THREE.Mesh(plateGeo, i === 0 ? rimMat : metalMat);
      plate.position.set(Math.cos(angle) * 0.46, Math.sin(angle) * 0.46, 0.05);
      plate.rotation.z = angle - Math.PI / 2;
      plate.rotation.x = 0.28;
      bodyGroup.add(plate);
    }

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 28), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 24), coreMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);
  } else if (skin.shape === 'phoenix') {
    // Phoenix Core: Sculpted swept solar wings + glowing furnace orb + twin dorsal plumes
    coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), coreMat);
    bodyGroup.add(coreMesh);

    const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), shellMat);
    bodyGroup.add(cage);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.2);
    wingShape.lineTo(0.26, 0.34);
    wingShape.lineTo(0.68, -0.1);
    wingShape.lineTo(0.44, -0.22);
    wingShape.lineTo(0.56, -0.44);
    wingShape.lineTo(0.14, -0.26);
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    wingGeo.center();
    wingGeo.rotateX(Math.PI / 2);

    const leftWing = new THREE.Mesh(wingGeo, rimMat);
    leftWing.position.set(-0.38, 0.02, -0.02);
    leftWing.rotation.z = 0.18;
    bodyGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, rimMat);
    rightWing.position.set(0.38, 0.02, -0.02);
    rightWing.scale.x = -1;
    rightWing.rotation.z = -0.18;
    bodyGroup.add(rightWing);

    const crestGeo = new THREE.ConeGeometry(0.08, 0.42, 4);
    crestGeo.rotateX(-Math.PI * 0.42);
    const crest = new THREE.Mesh(crestGeo, metalMat);
    crest.position.set(0, 0.24, -0.18);
    bodyGroup.add(crest);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.042, 8, 30), rimMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 24), coreMat);
    innerRing.rotation.x = -Math.PI / 3;
    bodyGroup.add(innerRing);
  } else {
    // Gyro Orb (default): Core + shell + titanium outer ring + glowing gimbal + beveled winglets
    coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), coreMat);
    bodyGroup.add(coreMesh);

    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 20), shellMat);
    bodyGroup.add(shellMesh);

    outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.055, 12, 32), metalMat);
    outerRing.rotation.y = Math.PI / 2;
    bodyGroup.add(outerRing);

    innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.032, 10, 28), rimMat);
    innerRing.rotation.x = Math.PI / 3;
    bodyGroup.add(innerRing);

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
    bodyGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, metalMat);
    rightWing.rotation.y = Math.PI / 2;
    rightWing.rotation.x = -0.35;
    rightWing.position.set(0.46, 0, -0.05);
    bodyGroup.add(rightWing);
  }

  return { bodyGroup, coreMesh, outerRing, innerRing };
}

export function createPlayerCraft(skin: CraftSkin): PlayerCraftHandles {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.22,
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: skin.coreColor,
    emissive: skin.coreColor,
    emissiveIntensity: 1.15,
    roughness: 0.15,
    metalness: 0.2,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: skin.trailColor,
    emissive: skin.trailColor,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.7,
  });

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

  let current = buildAvatarBody(skin, metalMat, coreMat, rimMat, shellMat);
  group.add(current.bodyGroup);

  // Rear plasma thruster cone (pointing along -Z)
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
  thrusterCone.position.set(0, 0, -0.54);
  group.add(thrusterCone);

  // Special Power FX 1: Phase Shield / Phase Blink Dome
  const shieldMesh = new THREE.Group();
  const domeGeo = new THREE.IcosahedronGeometry(0.82, 1);
  const domeMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  shieldMesh.add(new THREE.Mesh(domeGeo, domeMat));
  shieldMesh.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(domeGeo),
      new THREE.LineBasicMaterial({ color: 0x67e8f9 })
    )
  );
  shieldMesh.visible = false;
  group.add(shieldMesh);

  // Special Power FX 2: Magnet / Score Overdrive Aura Ring
  const auraGeo = new THREE.TorusGeometry(1.15, 0.045, 8, 36);
  auraGeo.rotateY(Math.PI / 2);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.78,
  });
  const auraRing = new THREE.Mesh(auraGeo, auraMat);
  auraRing.visible = false;
  group.add(auraRing);

  // Special Power FX 3: Laser Breaker Forward Plasma Lance (+Z)
  const beamGeo = new THREE.CylinderGeometry(0.22, 0.36, 13.0, 12);
  beamGeo.rotateX(Math.PI / 2);
  beamGeo.translate(0, 0, 7.0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfb7185,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const laserBeam = new THREE.Mesh(beamGeo, beamMat);
  laserBeam.visible = false;
  group.add(laserBeam);

  // Dynamic craft point light
  const pointLight = new THREE.PointLight(skin.trailColor, 5.5, 14, 1.5);
  pointLight.position.set(0, 0, 0.2);
  group.add(pointLight);

  const handles: PlayerCraftHandles = {
    group,
    bodyGroup: current.bodyGroup,
    coreMesh: current.coreMesh,
    outerRing: current.outerRing,
    innerRing: current.innerRing,
    thrusterCone,
    shieldMesh,
    auraRing,
    laserBeam,
    pointLight,
    setSkin: (nextSkin: CraftSkin) => {
      coreMat.color.setHex(nextSkin.coreColor);
      coreMat.emissive.setHex(nextSkin.coreColor);
      shellMat.emissive.setHex(nextSkin.trailColor);
      rimMat.color.setHex(nextSkin.trailColor);
      rimMat.emissive.setHex(nextSkin.trailColor);
      thrusterMat.color.setHex(nextSkin.coreColor);
      thrusterMat.emissive.setHex(nextSkin.trailColor);
      pointLight.color.setHex(nextSkin.trailColor);

      // Swap 3D composite avatar geometry
      group.remove(current.bodyGroup);
      current.bodyGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
        }
      });
      current = buildAvatarBody(nextSkin, metalMat, coreMat, rimMat, shellMat);
      group.add(current.bodyGroup);
      handles.bodyGroup = current.bodyGroup;
      handles.coreMesh = current.coreMesh;
      handles.outerRing = current.outerRing;
      handles.innerRing = current.innerRing;
    },
  };

  return handles;
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

interface SharedCollectibleCache {
  goldOuterGeo: THREE.BoxGeometry;
  goldOuterMat: THREE.MeshStandardMaterial;
  goldEdgeGeo: THREE.EdgesGeometry;
  goldEdgeMat: THREE.LineBasicMaterial;
  goldInnerGeo: THREE.OctahedronGeometry;
  goldInnerMat: THREE.MeshStandardMaterial;
  starGeo: THREE.ExtrudeGeometry;
  starMat: THREE.MeshStandardMaterial;
  starRingGeo: THREE.TorusGeometry;
  starRingMat: THREE.MeshStandardMaterial;
}

let sharedCache: SharedCollectibleCache | null = null;

function markShared<T extends THREE.BufferGeometry | THREE.Material>(res: T): T {
  res.userData.sharedResource = true;
  return res;
}

function getSharedCollectibleCache(): SharedCollectibleCache {
  if (sharedCache) return sharedCache;

  const goldOuterGeo = markShared(new THREE.BoxGeometry(0.56, 0.56, 0.56));
  const goldOuterMat = markShared(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      metalness: 0.9,
      roughness: 0.18,
    })
  );
  const goldEdgeGeo = markShared(new THREE.EdgesGeometry(goldOuterGeo));
  const goldEdgeMat = markShared(new THREE.LineBasicMaterial({ color: 0xfef08a }));
  const goldInnerGeo = markShared(new THREE.OctahedronGeometry(0.24, 0));
  const goldInnerMat = markShared(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.2,
    })
  );

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

  const starGeo = markShared(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 2,
    })
  );
  starGeo.center();

  const starMat = markShared(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      metalness: 0.88,
      roughness: 0.15,
    })
  );
  const starRingGeo = markShared(new THREE.TorusGeometry(0.84, 0.04, 8, 28));
  const starRingMat = markShared(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.5,
    })
  );

  sharedCache = {
    goldOuterGeo,
    goldOuterMat,
    goldEdgeGeo,
    goldEdgeMat,
    goldInnerGeo,
    goldInnerMat,
    starGeo,
    starMat,
    starRingGeo,
    starRingMat,
  };
  return sharedCache;
}

export function disposeSharedModelCache(): void {
  if (!sharedCache) return;
  sharedCache.goldOuterGeo.dispose();
  sharedCache.goldOuterMat.dispose();
  sharedCache.goldEdgeGeo.dispose();
  sharedCache.goldEdgeMat.dispose();
  sharedCache.goldInnerGeo.dispose();
  sharedCache.goldInnerMat.dispose();
  sharedCache.starGeo.dispose();
  sharedCache.starMat.dispose();
  sharedCache.starRingGeo.dispose();
  sharedCache.starRingMat.dispose();
  sharedCache = null;
}

export function createGoldCube(): THREE.Group {
  const c = getSharedCollectibleCache();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(c.goldOuterGeo, c.goldOuterMat));
  group.add(new THREE.LineSegments(c.goldEdgeGeo, c.goldEdgeMat));
  group.add(new THREE.Mesh(c.goldInnerGeo, c.goldInnerMat));
  return group;
}

export function createStarCollectible(): THREE.Group {
  const c = getSharedCollectibleCache();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(c.starGeo, c.starMat));
  const ring = new THREE.Mesh(c.starRingGeo, c.starRingMat);
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

export function createLaserBar(obs: LaserBarObstacle, hazardHex: number): THREE.Group {
  const group = new THREE.Group();
  const dz = obs.z2 - obs.z1;
  const dy = obs.y2 - obs.y1;
  const length = Math.hypot(dz, dy);
  const midZ = (obs.z1 + obs.z2) * 0.5;
  const midY = (obs.y1 + obs.y2) * 0.5;
  const thickness = obs.thickness ?? 0.24;

  // Metallic emitter pylons at both ends
  const capGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.55, 8);
  capGeo.rotateZ(Math.PI / 2);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x161c36,
    metalness: 0.9,
    roughness: 0.25,
  });
  const emitterRingMat = new THREE.MeshStandardMaterial({
    color: hazardHex,
    emissive: hazardHex,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  for (const [z, y] of [
    [obs.z1, obs.y1],
    [obs.z2, obs.y2],
  ]) {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, y, z);
    group.add(cap);

    const node = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), emitterRingMat);
    node.position.set(0, y, z);
    group.add(node);
  }

  // Plasma beam core & outer sheath oriented between (0, y1, z1) and (0, y2, z2)
  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, midY, midZ);
  // Default cylinder points along +Y; rotate around X to align in Z-Y plane
  const angle = Math.atan2(dz, dy);
  beamGroup.rotation.x = angle;

  const coreGeo = new THREE.CylinderGeometry(thickness * 0.45, thickness * 0.45, length, 10);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: hazardHex,
    emissiveIntensity: 1.65,
    roughness: 0.15,
  });
  beamGroup.add(new THREE.Mesh(coreGeo, coreMat));

  const sheathGeo = new THREE.CylinderGeometry(thickness * 0.85, thickness * 0.85, length, 10);
  const sheathMat = new THREE.MeshBasicMaterial({
    color: hazardHex,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  beamGroup.add(new THREE.Mesh(sheathGeo, sheathMat));

  group.add(beamGroup);
  return group;
}

export function createPatrolDrone(
  obs: PatrolDroneObstacle,
  accentHex: number,
  hazardHex: number
): { group: THREE.Group; droneBody: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(0, 0, obs.z);

  // Faint vertical patrol rail spanning travel range
  const railH = Math.max(0.5, obs.ampY * 2);
  const railGeo = new THREE.CylinderGeometry(0.05, 0.05, railH, 8);
  const railMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.35,
  });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.set(0, obs.baseY, 0);
  group.add(rail);

  const endCapGeo = new THREE.BoxGeometry(0.45, 0.12, 0.45);
  const endCapMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });
  for (const dir of [-1, 1]) {
    const cap = new THREE.Mesh(endCapGeo, endCapMat);
    cap.position.set(0, obs.baseY + dir * obs.ampY, 0);
    group.add(cap);
  }

  // Animated drone body subgroup
  const droneBody = new THREE.Group();
  droneBody.position.set(0, obs.baseY, 0);

  const hullGeo = new THREE.OctahedronGeometry(obs.radius * 0.82, 0);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x1e1336,
    emissive: hazardHex,
    emissiveIntensity: 0.65,
    metalness: 0.85,
    roughness: 0.22,
  });
  droneBody.add(new THREE.Mesh(hullGeo, hullMat));

  const ringGeo = new THREE.TorusGeometry(obs.radius * 0.96, 0.075, 8, 24);
  ringGeo.rotateY(Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({
    color: hazardHex,
    emissive: hazardHex,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  droneBody.add(new THREE.Mesh(ringGeo, ringMat));

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf97316,
    emissiveIntensity: 1.5,
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(obs.radius * 0.34, 12, 12), coreMat);
  droneBody.add(eye);

  group.add(droneBody);
  return { group, droneBody };
}

export function createRotaryGate(
  obs: RotaryGateObstacle,
  accentHex: number,
  hazardHex: number
): { group: THREE.Group; rotor: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(0, obs.y, obs.z);

  const blades = obs.blades ?? 2;

  // Armored center hub
  const hubGeo = new THREE.CylinderGeometry(0.46, 0.46, 1.1, 12);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x161d36,
    metalness: 0.9,
    roughness: 0.25,
  });
  group.add(new THREE.Mesh(hubGeo, hubMat));

  const hubGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.07, 8, 24).rotateY(Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.3,
    })
  );
  group.add(hubGlow);

  // Rotating blades subgroup
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x28103c,
    emissive: hazardHex,
    emissiveIntensity: 0.85,
    metalness: 0.78,
    roughness: 0.25,
  });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xf472b6 });

  const bladeGeo = new THREE.BoxGeometry(0.56, obs.armLength, 0.28);
  const bladeEdges = new THREE.EdgesGeometry(bladeGeo);

  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2;
    const armGroup = new THREE.Group();
    armGroup.rotation.x = angle;

    const mesh = new THREE.Mesh(bladeGeo, bladeMat);
    mesh.position.y = obs.armLength * 0.5;
    armGroup.add(mesh);

    const wire = new THREE.LineSegments(bladeEdges, edgeMat);
    wire.position.y = obs.armLength * 0.5;
    armGroup.add(wire);

    rotor.add(armGroup);
  }

  group.add(rotor);
  return { group, rotor };
}

export function createOrbitMine(
  obs: OrbitMineObstacle,
  accentHex: number,
  hazardHex: number
): { group: THREE.Group; rotor: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(0, obs.y, obs.z);

  // Central beacon node
  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });
  group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), beaconMat));

  // Orbit path indicator ring
  const trackGeo = new THREE.TorusGeometry(obs.orbitRadius, 0.035, 6, 36);
  trackGeo.rotateY(Math.PI / 2);
  const trackMat = new THREE.MeshBasicMaterial({
    color: hazardHex,
    transparent: true,
    opacity: 0.28,
  });
  group.add(new THREE.Mesh(trackGeo, trackMat));

  // Rotor holding twin opposite mines + laser tether
  const rotor = new THREE.Group();

  const tetherGeo = new THREE.CylinderGeometry(0.06, 0.06, obs.orbitRadius * 2, 8);
  const tetherMat = new THREE.MeshBasicMaterial({
    color: hazardHex,
    transparent: true,
    opacity: 0.45,
  });
  rotor.add(new THREE.Mesh(tetherGeo, tetherMat));

  const mineGeo = new THREE.IcosahedronGeometry(obs.mineRadius, 0);
  const mineMat = new THREE.MeshStandardMaterial({
    color: 0x2b0d3e,
    emissive: hazardHex,
    emissiveIntensity: 1.05,
    metalness: 0.72,
    roughness: 0.22,
  });
  const mineEdgeMat = new THREE.LineBasicMaterial({ color: 0xfda4af });
  const mineEdges = new THREE.EdgesGeometry(mineGeo);

  for (const dir of [-1, 1]) {
    const mine = new THREE.Mesh(mineGeo, mineMat);
    mine.position.set(0, dir * obs.orbitRadius, 0);
    rotor.add(mine);

    const wire = new THREE.LineSegments(mineEdges, mineEdgeMat);
    wire.position.set(0, dir * obs.orbitRadius, 0);
    rotor.add(wire);
  }

  group.add(rotor);
  return { group, rotor };
}

export function createWarpGate(obs: WarpGateObstacle): {
  group: THREE.Group;
  rotor: THREE.Group;
  membraneMat: THREE.MeshBasicMaterial;
} {
  const group = new THREE.Group();
  group.position.set(0, 6.0, obs.z);

  const isShift = obs.warpEffect === 'shiftLeft' || obs.warpEffect === 'shiftRight';
  const isInvert = obs.warpEffect === 'invertCam';

  const primaryHex = isShift ? 0xa855f7 : isInvert ? 0xf43f5e : 0x6366f1;
  const secondaryHex = isShift ? 0x22d3ee : isInvert ? 0xfbbf24 : 0xf472b6;

  // 1. Primary silhouette: twin brushed-metallic portal pylons at trench flanks
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x111833,
    metalness: 0.9,
    roughness: 0.24,
  });
  const pylonGeo = new THREE.BoxGeometry(0.55, 11.8, 0.72);
  for (const xPos of [-2.95, 2.95]) {
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(xPos, 0, 0);
    group.add(pylon);
  }

  // Accent anchor caps at floor & ceiling
  const capMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    emissive: primaryHex,
    emissiveIntensity: 1.25,
    roughness: 0.55,
    metalness: 0.2,
  });
  const capGeo = new THREE.BoxGeometry(0.95, 0.34, 1.05);
  for (const xPos of [-2.95, 2.95]) {
    for (const yPos of [-5.75, 5.75]) {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(xPos, yPos, 0);
      group.add(cap);
    }
  }

  // 2. Outer octagonal warp arch (XY plane facing +Z so craft flies cleanly through)
  const archGeo = new THREE.TorusGeometry(4.4, 0.14, 10, 8);
  const archMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    emissive: primaryHex,
    emissiveIntensity: 1.35,
    metalness: 0.4,
    roughness: 0.3,
  });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.scale.set(0.7, 1.22, 1);
  group.add(arch);

  // 3. Translucent vortex energy curtain inside portal
  const membraneGeo = new THREE.RingGeometry(0.85, 4.25, 8);
  const membraneMat = new THREE.MeshBasicMaterial({
    color: primaryHex,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const membrane = new THREE.Mesh(membraneGeo, membraneMat);
  membrane.scale.set(0.7, 1.22, 1);
  group.add(membrane);

  // 4. Inner rotating gyroscope & directional symbol rotor
  const rotor = new THREE.Group();

  const innerRingGeo = new THREE.TorusGeometry(2.35, 0.085, 8, 24);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: secondaryHex,
    emissive: secondaryHex,
    emissiveIntensity: 1.5,
    metalness: 0.35,
    roughness: 0.28,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  rotor.add(innerRing);

  const markerMat = new THREE.MeshStandardMaterial({
    color: secondaryHex,
    emissive: secondaryHex,
    emissiveIntensity: 1.65,
    roughness: 0.25,
    metalness: 0.3,
  });

  if (isShift) {
    // 3D chevron arrowheads clearly pointing left (-X) or right (+X)
    const dir = obs.warpEffect === 'shiftRight' ? 1 : -1;
    const coneGeo = new THREE.ConeGeometry(0.32, 0.72, 4);
    coneGeo.rotateZ(-dir * (Math.PI / 2));
    for (const xOff of [-1.0, 0, 1.0]) {
      const arrow = new THREE.Mesh(coneGeo, markerMat);
      arrow.position.set(xOff, 0, 0);
      rotor.add(arrow);
    }
  } else if (isInvert) {
    // Twin opposing vertical invert-prisms + tilted orbit ring
    const tiltRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.06, 8, 20), archMat);
    tiltRing.rotation.x = Math.PI / 3;
    rotor.add(tiltRing);

    const triGeo = new THREE.ConeGeometry(0.36, 0.85, 3);
    const topArrow = new THREE.Mesh(triGeo, markerMat);
    topArrow.position.set(0, 2.7, 0);
    topArrow.rotation.z = Math.PI;
    rotor.add(topArrow);

    const botArrow = new THREE.Mesh(triGeo, markerMat);
    botArrow.position.set(0, -2.7, 0);
    rotor.add(botArrow);
  } else {
    // Twin opposing horizontal flank mirrors + tilted indigo ring
    const tiltRing = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.06, 8, 20), archMat);
    tiltRing.rotation.y = Math.PI / 3;
    rotor.add(tiltRing);

    const coneGeo = new THREE.ConeGeometry(0.34, 0.78, 4);
    const leftChevron = new THREE.Mesh(coneGeo, markerMat);
    leftChevron.position.set(-2.2, 0, 0);
    leftChevron.rotation.z = -Math.PI / 2;
    rotor.add(leftChevron);

    const rightChevron = new THREE.Mesh(coneGeo, markerMat);
    rightChevron.position.set(2.2, 0, 0);
    rightChevron.rotation.z = Math.PI / 2;
    rotor.add(rightChevron);
  }

  group.add(rotor);
  return { group, rotor, membraneMat };
}


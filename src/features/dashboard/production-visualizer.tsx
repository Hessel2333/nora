"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const DURATION = 36;
const STAGE_CENTERS = [0, 14, 28, 42, 56] as const;
const STAGE_KEYS = [0, 7, 14, 21, 29] as const;

export type ProductionVisualizerHandle = {
  seek: (progress: number) => void;
};

type ProductionVisualizerProps = {
  playing: boolean;
  onProgress: (progress: number) => void;
};

type SceneObjects = {
  rawCarrier: THREE.Group;
  rawScanner: THREE.Mesh;
  blade: THREE.Group;
  wholeVegetables: THREE.Group;
  dicedVegetables: THREE.Group;
  dicedPieces: THREE.Mesh[];
  mixer: THREE.Group;
  mixingChicken: THREE.Mesh[];
  sauceStream: THREE.Mesh;
  wok: THREE.Group;
  cookingPieces: THREE.Mesh[];
  flames: THREE.Mesh[];
  steam: THREE.Points;
  packageGroup: THREE.Group;
  packageFood: THREE.Mesh[];
  lid: THREE.Mesh;
  sealScanner: THREE.Mesh;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const seeded = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const material = (color: number, roughness = 0.5, metalness = 0.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const emissiveMaterial = (color: number, intensity: number) => new THREE.MeshStandardMaterial({
  color,
  emissive: color,
  emissiveIntensity: intensity,
  roughness: 0.35,
  metalness: 0.12,
});

function addMesh<T extends THREE.BufferGeometry>(
  parent: THREE.Object3D,
  geometry: T,
  meshMaterial: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addConveyor(scene: THREE.Scene, centerX: number, width = 10) {
  const group = new THREE.Group();
  group.position.x = centerX;
  scene.add(group);

  const belt = addMesh(group, new RoundedBoxGeometry(width, 0.32, 3.3, 4, 0.14), material(0x101820, 0.7, 0.46), [0, 0.75, 0]);
  belt.receiveShadow = true;
  addMesh(group, new THREE.BoxGeometry(width + 0.25, 0.2, 0.12), material(0x677886, 0.38, 0.78), [0, 1, 1.72]);
  addMesh(group, new THREE.BoxGeometry(width + 0.25, 0.2, 0.12), material(0x677886, 0.38, 0.78), [0, 1, -1.72]);

  const rollerMaterial = material(0x283844, 0.32, 0.82);
  for (let index = -4; index <= 4; index += 1) {
    addMesh(group, new THREE.CylinderGeometry(0.16, 0.16, 3.1, 20), rollerMaterial, [index * (width / 9), 0.95, 0], [Math.PI / 2, 0, 0]);
  }

  for (const x of [-width * 0.4, width * 0.4]) {
    addMesh(group, new THREE.BoxGeometry(0.28, 2.1, 0.28), material(0x101820, 0.62, 0.55), [x, -0.35, 1.25]);
    addMesh(group, new THREE.BoxGeometry(0.28, 2.1, 0.28), material(0x101820, 0.62, 0.55), [x, -0.35, -1.25]);
  }
  return group;
}

function createFactory(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x030609);
  scene.fog = new THREE.FogExp2(0x030609, 0.018);

  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0c1319, roughness: 0.68, metalness: 0.34 });
  const floor = addMesh(scene, new THREE.PlaneGeometry(90, 30), floorMaterial, [27, -1.42, 4], [-Math.PI / 2, 0, 0]);
  floor.receiveShadow = true;

  const wall = addMesh(scene, new THREE.PlaneGeometry(92, 18), material(0x0b141c, 0.76, 0.24), [27, 6.2, -7]);
  wall.receiveShadow = true;

  const seamMaterial = material(0x1d2a33, 0.48, 0.72);
  for (let x = -17; x < 74; x += 5.5) {
    addMesh(scene, new THREE.BoxGeometry(0.025, 14, 0.025), seamMaterial, [x, 5.5, -6.92]);
  }
  for (let y = 0; y < 12; y += 2.25) {
    addMesh(scene, new THREE.BoxGeometry(92, 0.025, 0.025), seamMaterial, [27, y, -6.92]);
  }

  const railMaterial = material(0x26343e, 0.3, 0.86);
  addMesh(scene, new THREE.CylinderGeometry(0.14, 0.14, 92, 20), railMaterial, [27, 9.6, -3.7], [0, 0, Math.PI / 2]);
  addMesh(scene, new THREE.CylinderGeometry(0.08, 0.08, 92, 20), material(0x586975, 0.26, 0.9), [27, 9.25, -4.2], [0, 0, Math.PI / 2]);

  const ambient = new THREE.HemisphereLight(0xb4e4ff, 0x27150d, 1.18);
  scene.add(ambient);
  scene.add(new THREE.AmbientLight(0x7892a6, 0.48));
  const key = new THREE.DirectionalLight(0xc5e9ff, 2.8);
  key.position.set(-4, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -40;
  key.shadow.camera.right = 40;
  key.shadow.camera.top = 22;
  key.shadow.camera.bottom = -10;
  scene.add(key);

  for (const x of STAGE_CENTERS) {
    const target = new THREE.Object3D();
    target.position.set(x, 1.1, 0);
    scene.add(target);
    const spot = new THREE.SpotLight(0xc5ecff, 44, 24, Math.PI / 5, 0.58, 1.35);
    spot.position.set(x, 9.1, 3.5);
    spot.target = target;
    spot.castShadow = x === 28 || x === 42;
    scene.add(spot);
    const warmFill = new THREE.PointLight(0xff9b5d, 3.2, 10, 2);
    warmFill.position.set(x - 2.7, 3.8, 4.5);
    scene.add(warmFill);
    addMesh(scene, new RoundedBoxGeometry(2.2, 0.3, 0.8, 4, 0.12), material(0x111a22, 0.4, 0.72), [x, 9.55, -3.5]);
    addMesh(scene, new RoundedBoxGeometry(1.25, 0.08, 0.38, 3, 0.06), emissiveMaterial(0xbbeaff, 2.2), [x, 9.34, -3.15]);
  }
}

function createRawStation(scene: THREE.Scene) {
  addConveyor(scene, STAGE_CENTERS[0]);
  const rawCarrier = new THREE.Group();
  rawCarrier.position.set(-3.4, 1.25, 0);
  scene.add(rawCarrier);

  addMesh(rawCarrier, new THREE.CylinderGeometry(2.35, 2.45, 0.28, 52), material(0x26313a, 0.34, 0.75), [0, 0, 0]);
  const chickenMaterial = material(0xf1a07d, 0.62, 0.02);
  for (let index = 0; index < 18; index += 1) {
    const angle = seeded(index + 4) * Math.PI * 2;
    const radius = 0.2 + seeded(index + 20) * 1.35;
    const chunk = addMesh(rawCarrier, new RoundedBoxGeometry(0.48, 0.34, 0.42, 4, 0.13), chickenMaterial, [Math.cos(angle) * radius, 0.3 + seeded(index) * 0.34, Math.sin(angle) * radius * 0.72]);
    chunk.rotation.set(seeded(index + 70), seeded(index + 30) * Math.PI, seeded(index + 9));
  }

  const cucumberMaterial = material(0x2f6b35, 0.72, 0.02);
  const scallionMaterial = material(0x80b75b, 0.64, 0.01);
  const pepperMaterial = material(0xc93421, 0.48, 0.02);
  addMesh(rawCarrier, new THREE.CylinderGeometry(0.38, 0.38, 3.2, 30), cucumberMaterial, [0.1, 1.05, -0.95], [0, 0, Math.PI / 2]);
  addMesh(rawCarrier, new THREE.CylinderGeometry(0.1, 0.1, 3.5, 18), scallionMaterial, [0.1, 1.2, 0.05], [0, 0, Math.PI / 2]);
  const pepper = new THREE.Group();
  pepper.position.set(0.2, 0.9, 1.02);
  rawCarrier.add(pepper);
  for (const [x, z] of [[-0.24, 0], [0.24, 0], [0, 0.2]] as const) {
    const lobe = addMesh(pepper, new THREE.SphereGeometry(0.48, 24, 18), pepperMaterial, [x, 0, z]);
    lobe.scale.set(0.82, 1.15, 0.76);
  }
  addMesh(pepper, new THREE.CylinderGeometry(0.09, 0.13, 0.45, 14), scallionMaterial, [0, 0.65, 0]);

  const scannerGroup = new THREE.Group();
  scannerGroup.position.set(2.25, 1.02, 0);
  scene.add(scannerGroup);
  const scannerMetal = material(0x1f303b, 0.38, 0.78);
  addMesh(scannerGroup, new THREE.BoxGeometry(0.28, 5.6, 0.28), scannerMetal, [0, 2.8, 1.75]);
  addMesh(scannerGroup, new THREE.BoxGeometry(0.28, 5.6, 0.28), scannerMetal, [0, 2.8, -1.75]);
  addMesh(scannerGroup, new THREE.BoxGeometry(0.42, 0.28, 3.8), scannerMetal, [0, 5.5, 0]);
  const rawScanner = addMesh(scannerGroup, new THREE.BoxGeometry(0.08, 3.8, 3.5), new THREE.MeshBasicMaterial({ color: 0x5fd3ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 2.5, 0]);

  return { rawCarrier, rawScanner };
}

function createCuttingStation(scene: THREE.Scene) {
  const centerX = STAGE_CENTERS[1];
  addConveyor(scene, centerX);
  const machine = new THREE.Group();
  machine.position.x = centerX;
  scene.add(machine);
  const machineMaterial = material(0x202d36, 0.28, 0.82);
  addMesh(machine, new RoundedBoxGeometry(4.2, 1.05, 4.5, 4, 0.18), machineMaterial, [0, 6.65, 0]);
  addMesh(machine, new THREE.BoxGeometry(0.32, 5.8, 0.32), machineMaterial, [-1.8, 3.7, 1.8]);
  addMesh(machine, new THREE.BoxGeometry(0.32, 5.8, 0.32), machineMaterial, [-1.8, 3.7, -1.8]);
  addMesh(machine, new THREE.BoxGeometry(0.32, 5.8, 0.32), machineMaterial, [1.8, 3.7, 1.8]);
  addMesh(machine, new THREE.BoxGeometry(0.32, 5.8, 0.32), machineMaterial, [1.8, 3.7, -1.8]);

  const blade = new THREE.Group();
  machine.add(blade);
  const bladeMesh = addMesh(blade, new THREE.BoxGeometry(0.22, 2.4, 3.15), material(0xdde7e9, 0.16, 0.95), [0, 3.3, 0]);
  bladeMesh.castShadow = true;
  addMesh(blade, new THREE.BoxGeometry(0.3, 0.13, 2.8), emissiveMaterial(0xbbefff, 1.4), [0.13, 2.2, 0]);

  const wholeVegetables = new THREE.Group();
  wholeVegetables.position.set(centerX - 3.2, 1.35, 0);
  scene.add(wholeVegetables);
  addMesh(wholeVegetables, new THREE.CylinderGeometry(0.36, 0.36, 2.8, 30), material(0x2f723d, 0.68, 0.02), [0, 0.3, -0.65], [0, 0, Math.PI / 2]);
  addMesh(wholeVegetables, new THREE.CylinderGeometry(0.11, 0.11, 3.1, 16), material(0x94c45e, 0.6, 0.01), [0.1, 0.45, 0.15], [0, 0, Math.PI / 2]);
  const pepper = new THREE.Group();
  pepper.position.set(0.15, 0.45, 0.95);
  wholeVegetables.add(pepper);
  const pepperMaterial = material(0xc83a26, 0.46, 0.02);
  for (const [x, z] of [[-0.22, 0], [0.22, 0], [0, 0.18]] as const) {
    const lobe = addMesh(pepper, new THREE.SphereGeometry(0.44, 22, 16), pepperMaterial, [x, 0, z]);
    lobe.scale.set(0.82, 1.15, 0.76);
  }
  addMesh(pepper, new THREE.CylinderGeometry(0.08, 0.12, 0.4, 12), material(0x5e9d4d, 0.62, 0.02), [0, 0.6, 0]);

  const dicedVegetables = new THREE.Group();
  dicedVegetables.position.set(centerX, 1.42, 0);
  scene.add(dicedVegetables);
  const dicedPieces: THREE.Mesh[] = [];
  const colors = [0x55a14d, 0xc63c28, 0xcbd483, 0x7abf5d, 0xe2d193];
  for (let index = 0; index < 44; index += 1) {
    const piece = addMesh(dicedVegetables, new RoundedBoxGeometry(0.36, 0.28, 0.34, 3, 0.08), material(colors[index % colors.length], 0.55, 0.02), [0, 0, 0]);
    piece.userData.seed = seeded(index + 40);
    dicedPieces.push(piece);
  }
  return { blade, wholeVegetables, dicedVegetables, dicedPieces };
}

function createMixingStation(scene: THREE.Scene) {
  const centerX = STAGE_CENTERS[2];
  const support = new THREE.Group();
  support.position.x = centerX;
  scene.add(support);
  addMesh(support, new RoundedBoxGeometry(8.2, 0.45, 5.3, 5, 0.18), material(0x172128, 0.34, 0.72), [0, 0.25, 0]);
  addMesh(support, new THREE.BoxGeometry(0.42, 2.6, 0.42), material(0x172128, 0.4, 0.68), [-3.2, -0.9, 1.9]);
  addMesh(support, new THREE.BoxGeometry(0.42, 2.6, 0.42), material(0x172128, 0.4, 0.68), [3.2, -0.9, 1.9]);

  const bowlMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3339, roughness: 0.22, metalness: 0.9, side: THREE.DoubleSide });
  const bowl = addMesh(support, new THREE.SphereGeometry(3.25, 64, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bowlMaterial, [0, 2.1, 0]);
  bowl.scale.y = 0.72;
  addMesh(support, new THREE.TorusGeometry(3.25, 0.1, 14, 64), material(0xb7c3c8, 0.18, 0.92), [0, 2.1, 0], [Math.PI / 2, 0, 0]);

  const mixer = new THREE.Group();
  mixer.position.set(centerX, 0, 0);
  scene.add(mixer);
  addMesh(mixer, new THREE.CylinderGeometry(0.18, 0.18, 6.6, 24), material(0xaebcc2, 0.2, 0.9), [0, 5.25, 0]);
  addMesh(mixer, new RoundedBoxGeometry(4.5, 0.72, 1.5, 4, 0.16), material(0x18242c, 0.28, 0.82), [0, 8.45, 0]);
  addMesh(mixer, new RoundedBoxGeometry(3.8, 0.28, 0.45, 4, 0.1), material(0xbcc8cc, 0.18, 0.94), [0, 2.35, 0]);

  const mixingChicken: THREE.Mesh[] = [];
  const marinatedMaterial = material(0xd27736, 0.45, 0.03);
  for (let index = 0; index < 30; index += 1) {
    const piece = addMesh(scene, new RoundedBoxGeometry(0.46, 0.35, 0.42, 4, 0.13), marinatedMaterial, [centerX, 2.4, 0]);
    piece.userData.seed = seeded(index + 90);
    mixingChicken.push(piece);
  }

  const sauceStream = addMesh(scene, new THREE.CylinderGeometry(0.13, 0.2, 4.6, 20), new THREE.MeshPhysicalMaterial({ color: 0x7c190f, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 }), [centerX + 2.3, 5.2, 0.2], [0, 0, -0.45]);
  const sauceLight = new THREE.PointLight(0xff5b24, 2.2, 7);
  sauceLight.position.set(centerX + 1.2, 4.2, 1.5);
  scene.add(sauceLight);
  return { mixer, mixingChicken, sauceStream };
}

function createCookingStation(scene: THREE.Scene) {
  const centerX = STAGE_CENTERS[3];
  const station = new THREE.Group();
  station.position.x = centerX;
  scene.add(station);
  addMesh(station, new RoundedBoxGeometry(11, 1.25, 6, 5, 0.26), material(0x121b21, 0.35, 0.76), [0, 0.15, 0]);

  const wok = new THREE.Group();
  wok.position.set(centerX, 2.15, 0);
  scene.add(wok);
  const wokMaterial = new THREE.MeshStandardMaterial({ color: 0x151a1d, roughness: 0.24, metalness: 0.9, side: THREE.DoubleSide });
  const bowl = addMesh(wok, new THREE.SphereGeometry(3.7, 64, 28, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wokMaterial, [0, 0, 0]);
  bowl.scale.y = 0.72;
  addMesh(wok, new THREE.TorusGeometry(3.7, 0.12, 18, 72), material(0xc1c9c9, 0.16, 0.94), [0, 0, 0], [Math.PI / 2, 0, 0]);
  addMesh(wok, new THREE.CylinderGeometry(0.2, 0.26, 5.4, 24), material(0x20282c, 0.25, 0.86), [5.9, 0.15, 0], [0, 0, Math.PI / 2]);

  const cookingPieces: THREE.Mesh[] = [];
  const foodColors = [0xdf8b48, 0xc83c27, 0x5cac54, 0xe4b35e, 0x8e2419, 0xd8a338, 0x7fbd63];
  for (let index = 0; index < 76; index += 1) {
    const pieceGeometry = index % 6 === 0
      ? new THREE.SphereGeometry(0.23, 16, 12)
      : index % 5 === 0
        ? new THREE.CylinderGeometry(0.18, 0.21, 0.42, 14)
        : new RoundedBoxGeometry(index % 3 === 0 ? 0.48 : 0.36, 0.3, 0.34, 3, 0.1);
    const pieceMaterial = new THREE.MeshPhysicalMaterial({ color: foodColors[index % foodColors.length], roughness: 0.36, clearcoat: 0.44, clearcoatRoughness: 0.3 });
    const piece = addMesh(scene, pieceGeometry, pieceMaterial, [centerX, 2.3, 0]);
    piece.userData.seed = seeded(index + 130);
    cookingPieces.push(piece);
  }

  const flames: THREE.Mesh[] = [];
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff7a24, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const flame = addMesh(scene, new THREE.ConeGeometry(0.24, 1.25, 12), flameMaterial.clone(), [centerX + Math.cos(angle) * 2.35, 0.18, Math.sin(angle) * 1.25]);
    flame.userData.seed = seeded(index + 210);
    flames.push(flame);
  }
  const fireLight = new THREE.PointLight(0xff6a22, 22, 14, 2);
  fireLight.position.set(centerX, 1.3, 2.2);
  scene.add(fireLight);

  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(28 * 3), 3));
  const steam = new THREE.Points(steamGeometry, new THREE.PointsMaterial({ color: 0xdcecf2, size: 0.46, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(steam);
  return { wok, cookingPieces, flames, steam };
}

function createPackingStation(scene: THREE.Scene) {
  const centerX = STAGE_CENTERS[4];
  addConveyor(scene, centerX, 11);
  const frame = new THREE.Group();
  frame.position.x = centerX;
  scene.add(frame);
  const frameMaterial = material(0x1c2830, 0.3, 0.82);
  addMesh(frame, new RoundedBoxGeometry(6.8, 0.85, 4.9, 4, 0.16), frameMaterial, [0, 7.9, 0]);
  for (const x of [-3, 3]) {
    addMesh(frame, new THREE.BoxGeometry(0.36, 6.8, 0.36), frameMaterial, [x, 4.35, 2.05]);
    addMesh(frame, new THREE.BoxGeometry(0.36, 6.8, 0.36), frameMaterial, [x, 4.35, -2.05]);
  }

  const packageGroup = new THREE.Group();
  packageGroup.position.set(centerX, 1.42, 0);
  scene.add(packageGroup);
  addMesh(packageGroup, new RoundedBoxGeometry(5.8, 0.5, 4.2, 8, 0.5), material(0x22292d, 0.3, 0.78), [0, 0, 0]);
  addMesh(packageGroup, new RoundedBoxGeometry(5.2, 0.22, 3.65, 8, 0.45), material(0x0a0d0f, 0.56, 0.38), [0, 0.35, 0]);

  const packageFood: THREE.Mesh[] = [];
  const colors = [0xd77d39, 0xc33a25, 0x5da64e, 0xe1a755, 0x8f2418, 0xd7a13b, 0x67ae55];
  for (let index = 0; index < 58; index += 1) {
    const pieceGeometry = index % 6 === 0
      ? new THREE.SphereGeometry(0.22, 16, 12)
      : index % 5 === 0
        ? new THREE.CylinderGeometry(0.17, 0.2, 0.4, 14)
        : new RoundedBoxGeometry(index % 3 === 0 ? 0.46 : 0.36, 0.3, 0.34, 3, 0.09);
    const piece = addMesh(packageGroup, pieceGeometry, new THREE.MeshPhysicalMaterial({ color: colors[index % colors.length], roughness: 0.34, clearcoat: 0.42, clearcoatRoughness: 0.3 }), [0, 0.5, 0]);
    piece.userData.seed = seeded(index + 270);
    packageFood.push(piece);
  }

  const lid = addMesh(packageGroup, new RoundedBoxGeometry(6.15, 0.22, 4.5, 8, 0.55), new THREE.MeshPhysicalMaterial({ color: 0xc7f1ff, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0, transmission: 0.42, thickness: 0.1, clearcoat: 1 }), [0, 5.2, 0]);
  const sealScanner = addMesh(frame, new THREE.BoxGeometry(0.08, 0.06, 4.4), new THREE.MeshBasicMaterial({ color: 0x62d7ff, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false }), [-2.7, 1.82, 0]);
  const scannerLight = new THREE.PointLight(0x55d8ff, 5, 8);
  scannerLight.position.set(centerX, 3.2, 2.8);
  scene.add(scannerLight);
  return { packageGroup, packageFood, lid, sealScanner };
}

function createSceneObjects(scene: THREE.Scene): SceneObjects {
  createFactory(scene);
  const raw = createRawStation(scene);
  const cutting = createCuttingStation(scene);
  const mixing = createMixingStation(scene);
  const cooking = createCookingStation(scene);
  const packing = createPackingStation(scene);
  return { ...raw, ...cutting, ...mixing, ...cooking, ...packing };
}

function cameraAt(time: number) {
  for (let index = 0; index < STAGE_KEYS.length - 1; index += 1) {
    const end = STAGE_KEYS[index + 1];
    if (time < end) {
      const transitionStart = end - 1.9;
      if (time <= transitionStart) return STAGE_CENTERS[index];
      const mix = smooth((time - transitionStart) / 1.9);
      return THREE.MathUtils.lerp(STAGE_CENTERS[index], STAGE_CENTERS[index + 1], mix);
    }
  }
  return STAGE_CENTERS[STAGE_CENTERS.length - 1];
}

function updateObjects(objects: SceneObjects, time: number) {
  const rawProgress = smooth(clamp(time / 6.2));
  objects.rawCarrier.position.x = -3.6 + rawProgress * 5.1;
  objects.rawCarrier.rotation.y = Math.sin(time * 0.7) * 0.035;
  objects.rawScanner.position.x = Math.sin(time * 3.2) * 0.32;
  (objects.rawScanner.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.abs(Math.sin(time * 3.2)) * 0.18;

  const cutLocal = clamp((time - 7) / 7);
  const cutProgress = smooth(clamp((cutLocal - 0.18) / 0.55));
  objects.wholeVegetables.visible = time > 5.2 && cutProgress < 0.97;
  objects.wholeVegetables.position.x = STAGE_CENTERS[1] - 3.3 + cutLocal * 3.6;
  objects.wholeVegetables.scale.setScalar(1 - cutProgress * 0.18);
  objects.dicedVegetables.visible = time > 7.7;
  objects.dicedVegetables.position.x = STAGE_CENTERS[1] + cutProgress * 3;
  objects.blade.position.y = -Math.pow(Math.abs(Math.sin(time * 8.4)), 6) * 2.15;
  objects.dicedPieces.forEach((piece, index) => {
    const seed = piece.userData.seed as number;
    const appear = clamp(cutProgress * 1.5 - seeded(index + 8) * 0.55);
    piece.visible = appear > 0.02;
    piece.position.set(
      (seeded(index + 22) - 0.5) * 3.3 + appear * 0.9,
      0.2 + seeded(index + 44) * 0.55 + Math.sin(appear * Math.PI) * seeded(index + 2) * 0.8,
      (seeded(index + 66) - 0.5) * 2.25,
    );
    piece.rotation.set(time * (0.4 + seed), time * (0.7 + seed), seed * Math.PI);
    piece.scale.setScalar(0.6 + appear * 0.4);
  });

  const mixLocal = clamp((time - 14) / 7);
  const mixingProgress = smooth(clamp((mixLocal - 0.12) / 0.7));
  objects.mixer.rotation.y = time * 2.5;
  objects.mixingChicken.forEach((piece, index) => {
    const seed = piece.userData.seed as number;
    const angle = time * (1.8 + seed) + index * 0.82;
    const radius = 0.45 + seeded(index + 13) * 2.15;
    piece.visible = time > 12.5;
    piece.position.set(
      STAGE_CENTERS[2] + Math.cos(angle) * radius,
      2.25 + seeded(index + 55) * 0.78 + Math.abs(Math.sin(angle * 0.7)) * mixingProgress * 1.2,
      Math.sin(angle) * radius * 0.7,
    );
    piece.rotation.set(angle, angle * 0.35, angle * 0.7);
  });
  objects.sauceStream.visible = time > 13.6 && mixLocal < 0.58;
  objects.sauceStream.scale.y = 0.65 + Math.sin(time * 7) * 0.08;

  const cookLocal = clamp((time - 21) / 8);
  objects.wok.rotation.z = Math.sin(time * 2.4) * 0.055 * smooth(cookLocal);
  objects.wok.rotation.x = Math.sin(time * 1.6) * 0.025 * smooth(cookLocal);
  objects.cookingPieces.forEach((piece, index) => {
    const seed = piece.userData.seed as number;
    const speed = 0.5 + seeded(index + 17) * 0.55;
    const cycle = (time * speed + seed * 3) % 1;
    const angle = seed * Math.PI * 2 + time * 0.32;
    const radius = 0.45 + seeded(index + 35) * 2.8;
    const arc = Math.sin(cycle * Math.PI);
    piece.visible = time > 19.1;
    piece.position.set(
      STAGE_CENTERS[3] + Math.cos(angle) * radius * (0.7 + cycle * 0.3),
      2.25 + arc * (1.6 + seeded(index + 64) * 3.9),
      Math.sin(angle) * radius * 0.62,
    );
    piece.rotation.set(time * (1.2 + seed), angle, time * (1.8 + seed));
  });
  objects.flames.forEach((flame, index) => {
    const flicker = 0.7 + Math.abs(Math.sin(time * (7 + index * 0.13) + (flame.userData.seed as number) * 8)) * 0.68;
    flame.scale.set(0.75 + flicker * 0.22, flicker, 0.75 + flicker * 0.22);
    flame.visible = time > 19;
  });
  const steamPositions = objects.steam.geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < steamPositions.count; index += 1) {
    const cycle = (time * (0.11 + seeded(index) * 0.05) + seeded(index + 18)) % 1;
    steamPositions.setXYZ(
      index,
      STAGE_CENTERS[3] + (seeded(index + 2) - 0.5) * 4.4 + Math.sin(cycle * 8 + index) * 0.3,
      2.6 + cycle * 5.8,
      (seeded(index + 38) - 0.5) * 2.1,
    );
  }
  steamPositions.needsUpdate = true;
  objects.steam.visible = time > 19.5;

  const packLocal = clamp((time - 29) / 7);
  const fillProgress = smooth(clamp((packLocal - 0.04) / 0.42));
  const sealProgress = smooth(clamp((packLocal - 0.46) / 0.28));
  const exitProgress = smooth(clamp((packLocal - 0.8) / 0.16));
  objects.packageGroup.visible = time > 27.3;
  objects.packageGroup.position.x = STAGE_CENTERS[4] + exitProgress * 3.4;
  objects.packageFood.forEach((piece, index) => {
    const angle = seeded(index + 3) * Math.PI * 2;
    const radius = 0.2 + seeded(index + 23) * 2.25;
    const delay = seeded(index + 62) * 0.3;
    const settle = smooth(clamp((fillProgress - delay) / 0.7));
    piece.visible = settle > 0.02;
    piece.position.set(Math.cos(angle) * radius, 0.6 + (1 - settle) * (3 + seeded(index) * 2.5), Math.sin(angle) * radius * 0.68);
    piece.rotation.set(index * 0.3 + settle, angle, time * 0.2 + index);
  });
  objects.lid.position.y = 5.2 - sealProgress * 3.95;
  objects.sealScanner.position.x = -2.7 + ((time * 2.4) % 5.4);
  objects.sealScanner.visible = sealProgress > 0.25;
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
    object.geometry.dispose();
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((meshMaterial) => meshMaterial.dispose());
  });
}

export const ProductionVisualizer = forwardRef<ProductionVisualizerHandle, ProductionVisualizerProps>(
  function ProductionVisualizer({ playing, onProgress }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const elapsedRef = useRef(0);
    const playingRef = useRef(playing);
    const progressCallbackRef = useRef(onProgress);
    const lastFrameRef = useRef<number | null>(null);
    const lastProgressRef = useRef(0);

    useEffect(() => {
      playingRef.current = playing;
      lastFrameRef.current = null;
    }, [playing]);

    useEffect(() => {
      progressCallbackRef.current = onProgress;
    }, [onProgress]);

    useImperativeHandle(ref, () => ({
      seek(progress: number) {
        elapsedRef.current = clamp(progress) * DURATION;
        lastFrameRef.current = null;
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.32;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
      const objects = createSceneObjects(scene);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.44, 0.48, 0.9));

      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        renderer.setSize(bounds.width, bounds.height, false);
        composer.setSize(bounds.width, bounds.height);
        camera.aspect = bounds.width / bounds.height;
        camera.updateProjectionMatrix();
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);

      let animationFrame = 0;
      const render = (timestamp: number) => {
        if (playingRef.current) {
          if (lastFrameRef.current !== null) {
            const delta = Math.min(0.05, (timestamp - lastFrameRef.current) / 1000);
            elapsedRef.current = (elapsedRef.current + delta) % DURATION;
          }
          lastFrameRef.current = timestamp;
        } else {
          lastFrameRef.current = null;
        }

        const time = elapsedRef.current;
        updateObjects(objects, time);
        const cameraX = cameraAt(time);
        const verticalViewport = camera.aspect < 0.72;
        camera.position.set(
          cameraX + Math.sin(time * 0.36) * 0.32,
          verticalViewport ? 5.05 : 4.65 + Math.sin(time * 0.24) * 0.12,
          verticalViewport ? 15.8 : 11.8,
        );
        camera.lookAt(cameraX, verticalViewport ? 2.25 : 2.05, 0);
        composer.render();

        if (timestamp - lastProgressRef.current > 45) {
          progressCallbackRef.current(time / DURATION);
          lastProgressRef.current = timestamp;
        }
        animationFrame = window.requestAnimationFrame(render);
      };
      animationFrame = window.requestAnimationFrame(render);

      return () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        composer.dispose();
        renderer.dispose();
        disposeScene(scene);
      };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="原料经过切配、腌制、烹饪、装盒和封装成为成品的实时三维加工过程" />;
  },
);

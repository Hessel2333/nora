"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ZoneStatus } from "@/lib/types";
import { CAD_ROOM_GEOMETRIES, cadPointToWorld, type CadRoomGeometry } from "./factory-geometry";
import type { FactoryRoomSnapshot } from "./room-monitoring";

const WORLD_SCALE = 0.04;
const WALL_HEIGHT = 1.55;
const WALL_THICKNESS = 0.12;
const FACTORY_CENTER = new THREE.Vector3(2.7, 0, 0.65);
// Prototype-standard front view: the camera sits exactly on the factory's
// longitudinal center line. Keep X at zero so the long facade stays horizontal
// and both ends use the same projection instead of an isometric side bias.
const DEFAULT_CAMERA_OFFSET = new THREE.Vector3(0, 36, 31);
const FACTORY_VIEW_WIDTH = 43;
const FACTORY_VIEW_HEIGHT = 24.5;
const DEFAULT_CAMERA_ZOOM = 1;

const STATUS_COLORS: Record<ZoneStatus, number> = {
  normal: 0x87d9be,
  running: 0x73a9ff,
  waiting: 0xf4c56b,
  warning: 0xf0ae45,
  critical: 0xef777b,
  offline: 0xb8c0cc,
};

export interface FactoryModel3DHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface FactoryModel3DProps {
  rooms: FactoryRoomSnapshot[];
  selectedId: string;
  focusedId: string | null;
  showRooms: boolean;
  onSelect: (id: string) => void;
  onOpenRoom: (id: string) => void;
}

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  roomMeshes: Map<string, THREE.Mesh>;
  roomLabels: Map<string, CSS2DObject>;
  selectedOutline: THREE.LineSegments;
  resizeObserver: ResizeObserver;
  render: () => void;
  resetView: () => void;
  zoomBy: (factor: number) => void;
  focusRoom: (roomId: string) => void;
  dispose: () => void;
}

function roomShape(room: CadRoomGeometry) {
  const shape = new THREE.Shape();
  room.points.forEach((point, index) => {
    const world = cadPointToWorld(point, WORLD_SCALE);
    if (index === 0) shape.moveTo(world.x, world.z);
    else shape.lineTo(world.x, world.z);
  });
  shape.closePath();
  return shape;
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWallSegment(parent: THREE.Object3D, a: { x: number; z: number }, b: { x: number; z: number }, material: THREE.Material) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < 0.15) return;
  const wall = addBox(parent, [length, WALL_HEIGHT, WALL_THICKNESS], [(a.x + b.x) / 2, WALL_HEIGHT / 2, (a.z + b.z) / 2], material);
  wall.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
}

function addRoomEquipment(parent: THREE.Object3D, room: CadRoomGeometry) {
  if (["R20", "R21"].includes(room.id)) return;
  const center = cadPointToWorld({ x: room.x + room.width / 2, y: room.y + room.height / 2 }, WORLD_SCALE);
  const width = Math.max(1, room.width * WORLD_SCALE);
  const depth = Math.max(1, room.height * WORLD_SCALE);
  const steel = new THREE.MeshStandardMaterial({ color: 0xcbd3dc, roughness: 0.34, metalness: 0.62 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f8fb, roughness: 0.7, metalness: 0.08 });

  if (["R11", "R12", "R13", "R14"].includes(room.id)) {
    const count = Math.max(2, Math.min(4, Math.round(width / 2.2)));
    for (let index = 0; index < count; index += 1) {
      const x = center.x - width * 0.34 + (index * width * 0.68) / Math.max(1, count - 1);
      addBox(parent, [0.45, 1.35, Math.max(0.8, depth * 0.52)], [x, 0.7, center.z], white);
    }
    return;
  }

  const longSide = Math.max(1.2, Math.min(3.4, width * 0.58));
  const tableDepth = Math.max(0.65, Math.min(1.15, depth * 0.2));
  const rows = depth > 5.5 ? [-depth * 0.2, depth * 0.2] : [0];
  rows.forEach((offset, index) => {
    addBox(parent, [longSide, 0.12, tableDepth], [center.x + (index % 2 ? 0.2 : -0.2), 0.95, center.z + offset], steel);
    for (const x of [-longSide * 0.42, longSide * 0.42]) {
      addBox(parent, [0.08, 0.9, 0.08], [center.x + x, 0.47, center.z + offset - tableDepth * 0.35], steel);
      addBox(parent, [0.08, 0.9, 0.08], [center.x + x, 0.47, center.z + offset + tableDepth * 0.35], steel);
    }
  });
}

function makeRoomLabel(room: CadRoomGeometry, live: FactoryRoomSnapshot | undefined) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "factory-3d-label";
  element.dataset.roomId = room.id;
  element.setAttribute("aria-label", `${room.id} ${room.name}${live ? `，${live.mapMetric}` : ""}`);
  element.innerHTML = `<span class="factory-3d-label__id">${room.id}</span><strong>${room.name}</strong><span class="factory-3d-label__metric">${live?.mapMetric ?? ""}</span>`;
  const label = new CSS2DObject(element);
  const center = cadPointToWorld({ x: room.x + room.width / 2, y: room.y + room.height / 2 }, WORLD_SCALE);
  label.position.set(center.x, 0.26, center.z);
  return label;
}

function createScene(container: HTMLDivElement, rooms: FactoryRoomSnapshot[], onSelect: (id: string) => void, onOpenRoom: (id: string) => void): SceneState {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f9fc);
  scene.fog = new THREE.Fog(0xf7f9fc, 42, 70);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.className = "absolute inset-0 h-full w-full";
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "pointer-events-none absolute inset-0 h-full w-full overflow-hidden";
  container.appendChild(labelRenderer.domElement);

  const camera = new THREE.OrthographicCamera(-24, 24, 14, -14, 0.1, 120);
  camera.position.copy(FACTORY_CENTER).add(DEFAULT_CAMERA_OFFSET);
  camera.lookAt(FACTORY_CENTER);
  camera.zoom = DEFAULT_CAMERA_ZOOM;
  camera.updateProjectionMatrix();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enablePan = true;
  controls.minZoom = 0.7;
  controls.maxZoom = 3.2;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.target.copy(FACTORY_CENTER);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb1c7, 1.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.25);
  sunlight.position.set(-18, 32, 22);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -30;
  sunlight.shadow.camera.right = 30;
  sunlight.shadow.camera.top = 24;
  sunlight.shadow.camera.bottom = -24;
  scene.add(sunlight);

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xf9fbfd, roughness: 0.82, metalness: 0.02 });
  addBox(scene, [41.5, 0.35, 15.7], [2.1, -0.24, 0.1], platformMaterial);
  addBox(scene, [5.3, 0.35, 15.7], [20.6, -0.24, 0.1], platformMaterial);

  const roomMeshes = new Map<string, THREE.Mesh>();
  const roomLabels = new Map<string, CSS2DObject>();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd9e1eb, roughness: 0.78, metalness: 0.04 });
  const equipmentGroup = new THREE.Group();
  scene.add(equipmentGroup);
  const wallSegments = new Set<string>();
  const walls = new THREE.Group();
  scene.add(walls);

  CAD_ROOM_GEOMETRIES.forEach((room) => {
    const live = rooms.find((item) => item.id === room.id);
    const geometry = new THREE.ShapeGeometry(roomShape(room));
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: STATUS_COLORS[live?.status ?? "normal"],
      transparent: true,
      opacity: 0.46,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.position.y = 0.015;
    floor.receiveShadow = true;
    floor.userData.roomId = room.id;
    scene.add(floor);
    roomMeshes.set(room.id, floor);

    room.points.forEach((point, index) => {
      const next = room.points[(index + 1) % room.points.length];
      const first = cadPointToWorld(point, WORLD_SCALE);
      const second = cadPointToWorld(next, WORLD_SCALE);
      const key = [
        `${first.x.toFixed(2)},${first.z.toFixed(2)}`,
        `${second.x.toFixed(2)},${second.z.toFixed(2)}`,
      ].sort().join("|");
      if (!wallSegments.has(key)) {
        wallSegments.add(key);
        addWallSegment(walls, first, second, wallMaterial);
      }
    });

    addRoomEquipment(equipmentGroup, room);
    const label = makeRoomLabel(room, live);
    label.element.addEventListener("click", () => onSelect(room.id));
    label.element.addEventListener("dblclick", () => onOpenRoom(room.id));
    scene.add(label);
    roomLabels.set(room.id, label);
  });

  const columnMaterial = new THREE.MeshStandardMaterial({ color: 0xb8c2cf, roughness: 0.56, metalness: 0.15 });
  [235.5, 454.2, 672.9, 891.7].forEach((x) => {
    const world = cadPointToWorld({ x, y: 52 }, WORLD_SCALE);
    addBox(scene, [0.66, 2.7, 0.66], [world.x, 1.35, world.z], columnMaterial);
  });

  const selectedOutline = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x1768f2, transparent: true, opacity: 0.95 }),
  );
  selectedOutline.position.y = 0.1;
  scene.add(selectedOutline);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDown = { x: 0, y: 0 };
  const onPointerDown = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...roomMeshes.values()])[0];
    const roomId = hit?.object.userData.roomId as string | undefined;
    if (roomId) onSelect(roomId);
  };
  const onDoubleClick = (event: MouseEvent) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...roomMeshes.values()])[0];
    const roomId = hit?.object.userData.roomId as string | undefined;
    if (roomId) onOpenRoom(roomId);
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("dblclick", onDoubleClick);

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    // Fit the complete CAD footprint at every canvas ratio. A fixed frustum
    // clipped the long sides on narrow dashboard canvases and made fullscreen
    // views feel excessively zoomed out.
    const viewHeight = Math.max(FACTORY_VIEW_HEIGHT, FACTORY_VIEW_WIDTH / aspect);
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const render = () => {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };
  controls.addEventListener("change", render);

  // Door entities are read from the same CAD SVG as the 2D plan. They are
  // projected onto the 3D floor as swing/leaf guides instead of being redrawn.
  const doorGroup = new THREE.Group();
  scene.add(doorGroup);
  void fetch("/cad/factory-plan.svg")
    .then((response) => response.text())
    .then((svgText) => {
      const documentNode = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const doorMaterial = new THREE.LineBasicMaterial({ color: 0x8292a5, transparent: true, opacity: 0.86 });
      documentNode.querySelectorAll<SVGPathElement>('path[data-layer="门"]').forEach((path) => {
        const values = path.getAttribute("d")?.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        if (values.length < 4) return;
        const points: THREE.Vector3[] = [];
        for (let index = 0; index < values.length - 1; index += 2) {
          const world = cadPointToWorld({ x: values[index], y: values[index + 1] }, WORLD_SCALE);
          points.push(new THREE.Vector3(world.x, 0.12, world.z));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        doorGroup.add(new THREE.Line(geometry, doorMaterial));
      });
      render();
    })
    .catch(() => undefined);

  const resetView = () => {
    camera.position.copy(FACTORY_CENTER).add(DEFAULT_CAMERA_OFFSET);
    camera.zoom = DEFAULT_CAMERA_ZOOM;
    camera.updateProjectionMatrix();
    controls.target.copy(FACTORY_CENTER);
    controls.update();
    render();
  };
  const zoomBy = (factor: number) => {
    camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom);
    camera.updateProjectionMatrix();
    render();
  };
  const focusRoom = (roomId: string) => {
    const room = CAD_ROOM_GEOMETRIES.find((item) => item.id === roomId);
    if (!room) return;
    const center = cadPointToWorld({ x: room.x + room.width / 2, y: room.y + room.height / 2 }, WORLD_SCALE);
    controls.target.set(center.x, 0, center.z);
    camera.zoom = Math.min(2.6, Math.max(1.35, 15 / Math.max(room.width * WORLD_SCALE, room.height * WORLD_SCALE)));
    camera.updateProjectionMatrix();
    controls.update();
    render();
  };
  render();

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    raycaster,
    pointer,
    roomMeshes,
    roomLabels,
    selectedOutline,
    resizeObserver,
    render,
    resetView,
    zoomBy,
    focusRoom,
    dispose: () => {
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      controls.removeEventListener("change", render);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}

export const FactoryModel3D = forwardRef<FactoryModel3DHandle, FactoryModel3DProps>(function FactoryModel3D({ rooms, selectedId, focusedId, showRooms, onSelect, onOpenRoom }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState | null>(null);
  const handlersRef = useRef({ onSelect, onOpenRoom });
  handlersRef.current = { onSelect, onOpenRoom };

  useEffect(() => {
    if (!containerRef.current) return;
    const state = createScene(containerRef.current, rooms, (id) => handlersRef.current.onSelect(id), (id) => handlersRef.current.onOpenRoom(id));
    stateRef.current = state;
    return () => {
      state.dispose();
      stateRef.current = null;
    };
  }, [rooms]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    CAD_ROOM_GEOMETRIES.forEach((room) => {
      const mesh = state.roomMeshes.get(room.id);
      const label = state.roomLabels.get(room.id);
      if (!mesh || !label) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = showRooms ? (room.id === selectedId ? 0.72 : 0.46) : 0.08;
      label.visible = showRooms;
      label.element.classList.toggle("is-selected", room.id === selectedId);
    });

    const selected = state.roomMeshes.get(selectedId);
    state.selectedOutline.geometry.dispose();
    if (selected) {
      state.selectedOutline.geometry = new THREE.EdgesGeometry(selected.geometry);
      state.selectedOutline.position.x = selected.position.x;
      state.selectedOutline.position.z = selected.position.z;
      state.selectedOutline.visible = true;
    } else {
      state.selectedOutline.visible = false;
    }
    state.render();
  }, [selectedId, showRooms]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    if (focusedId) state.focusRoom(focusedId);
    else state.resetView();
  }, [focusedId]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => stateRef.current?.zoomBy(1.18),
    zoomOut: () => stateRef.current?.zoomBy(0.84),
    reset: () => stateRef.current?.resetView(),
  }), []);

  return (
    <div ref={containerRef} className="factory-3d-stage relative h-[510px] w-full overflow-hidden bg-[#f7f9fc]" role="application" aria-label="呆大厨工厂三维数字孪生模型">
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-white/80 bg-white/90 px-2.5 py-1.5 text-[10px] font-medium text-[#667085] shadow-sm backdrop-blur">
        拖动旋转 · 滚轮缩放 · 双击查看详情
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 grid h-12 w-12 place-items-center rounded-xl border border-[#dfe6ef] bg-white/90 text-[9px] font-bold text-[#1768f2] shadow-sm">
        <span className="absolute top-1">北</span><span className="mt-2 text-[#7c8ba1]">顶视</span>
      </div>
    </div>
  );
});

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BUILDING_W = 12;
const BUILDING_D = 15;
const WALL = 0.2;
const HALF_WALL = WALL / 2;
const WALL_HEIGHT = 2.7;
const CORRIDOR_W = 2;
const DOOR_W = 1;
const MAIN_DOOR_W = 2;

const LEFT = -6;
const RIGHT = 6;
const FRONT = -7.5;
const BACK = 7.5;
const CORRIDOR_LEFT = -1;
const CORRIDOR_RIGHT = 1;

type Point = { x: number; z: number };
type Orientation = "horizontal" | "vertical";

type WallSegment = {
  id: string;
  start: Point;
  end: Point;
  orientation: Orientation;
  trimStart?: number;
  trimEnd?: number;
};

const segment = (
  id: string,
  start: Point,
  end: Point,
  orientation: Orientation,
  trimStart = 0,
  trimEnd = 0,
): WallSegment => ({ id, start, end, orientation, trimStart, trimEnd });

/*
 * AUTHORITATIVE FLOOR-PLAN GEOMETRY
 *
 * Building: X -6..+6, Z -7.5..+7.5
 * Corridor: X -1..+1, Z -7.5..+7.5
 * Wall thickness: 0.20m
 *
 * Horizontal walls own corners. Vertical walls are trimmed by 0.10m at
 * wall intersections. Door openings are gaps in the wall list, not meshes.
 * This keeps the corridor clear and prevents duplicate corner geometry.
 */
const WALL_SEGMENTS: WallSegment[] = [
  segment("W01_BACK", { x: LEFT, z: BACK }, { x: RIGHT, z: BACK }, "horizontal"),
  segment("W02_LEFT", { x: LEFT, z: FRONT }, { x: LEFT, z: BACK }, "vertical", HALF_WALL, HALF_WALL),
  segment("W03_RIGHT", { x: RIGHT, z: FRONT }, { x: RIGHT, z: BACK }, "vertical", HALF_WALL, HALF_WALL),

  segment("W04_FRONT_L", { x: LEFT, z: FRONT }, { x: -1, z: FRONT }, "horizontal"),
  segment("W05_FRONT_R", { x: 1, z: FRONT }, { x: RIGHT, z: FRONT }, "horizontal"),

  // Left corridor boundary: doors at -5.5, -1.5, +4.0.
  segment("W06_OFFICE1_L", { x: -1, z: FRONT }, { x: -1, z: -6 }, "vertical", HALF_WALL),
  segment("W07_OFFICE1_L", { x: -1, z: -5 }, { x: -1, z: -3.5 }, "vertical", 0, HALF_WALL),
  segment("W08_OFFICE3_L", { x: -1, z: -3.5 }, { x: -1, z: -2 }, "vertical", HALF_WALL),
  segment("W09_OFFICE3_L", { x: -1, z: -1 }, { x: -1, z: 0.5 }, "vertical", 0, HALF_WALL),
  segment("W10_MEETING_L", { x: -1, z: 0.5 }, { x: -1, z: 3.5 }, "vertical", HALF_WALL),
  segment("W11_MEETING_L", { x: -1, z: 4.5 }, { x: -1, z: BACK }, "vertical", HALF_WALL, HALF_WALL),

  // Right corridor boundary: doors at -5.5, -1.5, +4.0.
  segment("W12_OFFICE2_R", { x: 1, z: FRONT }, { x: 1, z: -6 }, "vertical", HALF_WALL),
  segment("W13_OFFICE2_R", { x: 1, z: -5 }, { x: 1, z: -3.5 }, "vertical", 0, HALF_WALL),
  segment("W14_OFFICE4_R", { x: 1, z: -3.5 }, { x: 1, z: -2 }, "vertical", HALF_WALL),
  segment("W15_OFFICE4_R", { x: 1, z: -1 }, { x: 1, z: 0.5 }, "vertical", 0, HALF_WALL),
  segment("W16_BREAK_R", { x: 1, z: 0.5 }, { x: 1, z: 3.5 }, "vertical", HALF_WALL),
  segment("W17_BREAK_R", { x: 1, z: 4.5 }, { x: 1, z: BACK }, "vertical", HALF_WALL, HALF_WALL),

  // Horizontal room dividers own their intersections.
  segment("W18_OFFICE1_3", { x: LEFT, z: -3.5 }, { x: -1, z: -3.5 }, "horizontal"),
  segment("W19_OFFICE2_4", { x: 1, z: -3.5 }, { x: RIGHT, z: -3.5 }, "horizontal"),
  segment("W20_OFFICE3_MEETING", { x: LEFT, z: 0.5 }, { x: -1, z: 0.5 }, "horizontal"),
  segment("W21_OFFICE4_BREAK", { x: 1, z: 0.5 }, { x: RIGHT, z: 0.5 }, "horizontal"),
];

const ROOM_RECTS = [
  { id: "office-1", name: "OFFICE 1", minX: -6, maxX: -1, minZ: -7.5, maxZ: -3.5 },
  { id: "office-2", name: "OFFICE 2", minX: 1, maxX: 6, minZ: -7.5, maxZ: -3.5 },
  { id: "office-3", name: "OFFICE 3", minX: -6, maxX: -1, minZ: -3.5, maxZ: 0.5 },
  { id: "office-4", name: "OFFICE 4", minX: 1, maxX: 6, minZ: -3.5, maxZ: 0.5 },
  { id: "meeting", name: "MEETING ROOM", minX: -6, maxX: -1, minZ: 0.5, maxZ: 7.5 },
  { id: "break", name: "BREAK ROOM", minX: 1, maxX: 6, minZ: 0.5, maxZ: 7.5 },
] as const;

const DOOR_OPENINGS = [
  { id: "office-1-door", x: -1, z: -5.5, width: DOOR_W, side: "left" },
  { id: "office-3-door", x: -1, z: -1.5, width: DOOR_W, side: "left" },
  { id: "meeting-door", x: -1, z: 4, width: DOOR_W, side: "left" },
  { id: "office-2-door", x: 1, z: -5.5, width: DOOR_W, side: "right" },
  { id: "office-4-door", x: 1, z: -1.5, width: DOOR_W, side: "right" },
  { id: "break-door", x: 1, z: 4, width: DOOR_W, side: "right" },
] as const;

function meshBox(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function addWallSegment(scene: THREE.Scene, item: WallSegment, material: THREE.Material) {
  const dx = item.end.x - item.start.x;
  const dz = item.end.z - item.start.z;
  const length = Math.hypot(dx, dz);
  const trimStart = item.trimStart ?? 0;
  const trimEnd = item.trimEnd ?? 0;
  const usableLength = length - trimStart - trimEnd;

  if (length <= 0 || usableLength <= 0) return;

  const ux = dx / length;
  const uz = dz / length;
  const cx = item.start.x + ux * (trimStart + usableLength / 2);
  const cz = item.start.z + uz * (trimStart + usableLength / 2);

  const mesh = item.orientation === "horizontal"
    ? meshBox(usableLength, WALL_HEIGHT, WALL, material)
    : meshBox(WALL, WALL_HEIGHT, usableLength, material);

  mesh.position.set(cx, WALL_HEIGHT / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.wallId = item.id;
  scene.add(mesh);
}

function addLabel(scene: THREE.Scene, text: string, x: number, z: number, color = 0x24334a) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.beginPath();
  ctx.roundRect(14, 28, 612, 104, 22);
  ctx.fill();
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.font = "700 34px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 320, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, 0.08, z);
  sprite.scale.set(2.6, 0.65, 1);
  scene.add(sprite);
}

function buildFloorPlan(scene: THREE.Scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3f4650, roughness: 0.78 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf0eee9, roughness: 0.92 });
  const corridorMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e9ee, roughness: 0.9 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0xb6c1cc, roughness: 0.75 });

  const floor = meshBox(BUILDING_W, 0.12, BUILDING_D, floorMaterial);
  floor.position.set(0, 0.06, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const corridorFloor = meshBox(CORRIDOR_W, 0.025, BUILDING_D - 0.4, corridorMaterial);
  corridorFloor.position.set(0, 0.125, 0);
  corridorFloor.receiveShadow = true;
  scene.add(corridorFloor);

  const grid = new THREE.GridHelper(BUILDING_W, BUILDING_W, 0xb9c2cb, 0xd5dbe1);
  grid.position.y = 0.14;
  grid.scale.z = BUILDING_D / BUILDING_W;
  scene.add(grid);

  for (const item of WALL_SEGMENTS) addWallSegment(scene, item, wallMaterial);

  for (const door of DOOR_OPENINGS) {
    const leaf = meshBox(0.04, 0.035, 0.92, doorMaterial);
    leaf.position.set(
      door.side === "left" ? CORRIDOR_LEFT - 0.46 : CORRIDOR_RIGHT + 0.46,
      0.145,
      door.z,
    );
    leaf.rotation.y = door.side === "left" ? Math.PI / 2 : -Math.PI / 2;
    leaf.receiveShadow = true;
    leaf.userData.doorId = door.id;
    scene.add(leaf);
  }

  const threshold = meshBox(MAIN_DOOR_W, 0.04, 0.55, doorMaterial);
  threshold.position.set(0, 0.145, FRONT + 0.27);
  threshold.receiveShadow = true;
  threshold.userData.doorId = "main-entrance";
  scene.add(threshold);

  addLabel(scene, "OFFICE 1 · 5 × 4 m", -3.5, -5.5);
  addLabel(scene, "OFFICE 2 · 5 × 4 m", 3.5, -5.5);
  addLabel(scene, "OFFICE 3 · 5 × 4 m", -3.5, -1.5);
  addLabel(scene, "OFFICE 4 · 5 × 4 m", 3.5, -1.5);
  addLabel(scene, "MEETING ROOM · 5 × 7 m", -3.5, 4);
  addLabel(scene, "BREAK ROOM · 5 × 7 m", 3.5, 4);
  addLabel(scene, "2 m CORRIDOR", 0, 0, 0x4a5d73);
  addLabel(scene, "MAIN ENTRANCE", 0, FRONT + 0.75, 0x4a5d73);

  scene.userData.roomRects = ROOM_RECTS;
  scene.userData.corridor = { minX: -1, maxX: 1, minZ: FRONT, maxZ: BACK };
  scene.userData.wallThickness = WALL;
}

export default function Office3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 35, 60);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(18, 20, -20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 10;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.25;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xf8fbff, 0x67717c, 2.2));

    const sun = new THREE.DirectionalLight(0xfff3d2, 3.0);
    sun.position.set(-8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    scene.add(sun);

    const foundation = meshBox(
      BUILDING_W + 1.2,
      0.55,
      BUILDING_D + 1.2,
      new THREE.MeshStandardMaterial({ color: 0xc6b298, roughness: 0.92 }),
    );
    foundation.position.y = -0.3;
    foundation.receiveShadow = true;
    scene.add(foundation);

    buildFloorPlan(scene);

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(520, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      controls.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else {
            material.map?.dispose();
            material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={mountRef} className="office-3d-viewer" aria-label="Interactive six-space office floor plan">
      <div className="office-3d-help">
        <strong>Buildable six-space floor plan</strong>
        <span>12 × 15 m · 2 m corridor · 1 m room doors · 2 m main entrance · 0.20 m walls</span>
      </div>
      <div className="office-3d-badge">FLOOR PLAN</div>
    </div>
  );
}

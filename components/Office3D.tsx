"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const W = 12;
const D = 15;
const WALL = 0.2;
const H = 2.7;
const CORRIDOR = 2;
const LEFT = -W / 2;
const RIGHT = W / 2;
const BACK = -D / 2;
const FRONT = D / 2;

function meshBox(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function wallX(
  scene: THREE.Scene,
  x: number,
  z: number,
  width: number,
  material: THREE.Material,
) {
  const wall = meshBox(width, H, WALL, material);
  wall.position.set(x, H / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

function wallZ(
  scene: THREE.Scene,
  x: number,
  z: number,
  depth: number,
  material: THREE.Material,
) {
  const wall = meshBox(WALL, H, depth, material);
  wall.position.set(x, H / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

function wallXWithDoor(
  scene: THREE.Scene,
  x: number,
  z: number,
  width: number,
  doorCenter: number,
  doorWidth: number,
  material: THREE.Material,
) {
  const start = x - width / 2;
  const end = x + width / 2;
  const doorStart = doorCenter - doorWidth / 2;
  const doorEnd = doorCenter + doorWidth / 2;

  if (doorStart > start) {
    wallX(scene, (start + doorStart) / 2, z, doorStart - start, material);
  }
  if (doorEnd < end) {
    wallX(scene, (doorEnd + end) / 2, z, end - doorEnd, material);
  }
}

function wallZWithDoor(
  scene: THREE.Scene,
  x: number,
  z: number,
  depth: number,
  doorCenter: number,
  doorWidth: number,
  material: THREE.Material,
) {
  const start = z - depth / 2;
  const end = z + depth / 2;
  const doorStart = doorCenter - doorWidth / 2;
  const doorEnd = doorCenter + doorWidth / 2;

  if (doorStart > start) {
    wallZ(scene, x, (start + doorStart) / 2, doorStart - start, material);
  }
  if (doorEnd < end) {
    wallZ(scene, x, (doorEnd + end) / 2, end - doorEnd, material);
  }
}

function addDoorLeaf(
  scene: THREE.Scene,
  x: number,
  z: number,
  rotation: number,
  material: THREE.Material,
) {
  const leaf = meshBox(0.04, 0.035, 0.92, material);
  leaf.position.set(x, 0.025, z);
  leaf.rotation.y = rotation;
  leaf.receiveShadow = true;
  scene.add(leaf);
}

function label(
  scene: THREE.Scene,
  text: string,
  x: number,
  z: number,
  color = 0x24334a,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  ctx.roundRect(12, 20, 488, 88, 18);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "700 30px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, 0.06, z);
  sprite.scale.set(2.3, 0.58, 1);
  scene.add(sprite);
}

function buildFloorPlan(scene: THREE.Scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f4650,
    roughness: 0.78,
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0eee9,
    roughness: 0.92,
  });

  const corridorMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5e9ee,
    roughness: 0.9,
  });

  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0xb6c1cc,
    roughness: 0.75,
  });

  const floor = meshBox(W, 0.12, D, floorMaterial);
  floor.position.set(0, 0.06, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Main one-metre planning grid.
  const grid = new THREE.GridHelper(W, W, 0xb9c2cb, 0xd5dbe1);
  grid.position.y = 0.125;
  grid.scale.z = D / W;
  scene.add(grid);

  // Outer walls: 12m x 15m, with a centered 2m entrance.
  wallX(scene, 0, BACK, W, wallMaterial);
  wallZ(scene, LEFT, 0, D, wallMaterial);
  wallZ(scene, RIGHT, 0, D, wallMaterial);
  wallXWithDoor(scene, 0, FRONT, W, 0, 2.0, wallMaterial);

  // Central 2m corridor. Side-room partitions leave real 1m doors.
  const corridorLeft = -CORRIDOR / 2;
  const corridorRight = CORRIDOR / 2;

  // Left/right corridor walls with doors into every room.
  const doorCenters = [-4.85, -1.35, 2.35];
  for (const z of doorCenters) {
    wallZWithDoor(scene, corridorLeft, z, 3.5, z, 1.0, wallMaterial);
    wallZWithDoor(scene, corridorRight, z, 3.5, z, 1.0, wallMaterial);
  }

  // Bottom rooms are 4m deep; their corridor doors open into the lower section.
  wallZWithDoor(scene, corridorLeft, 5.35, 4.0, 5.35, 1.0, wallMaterial);
  wallZWithDoor(scene, corridorRight, 5.35, 4.0, 5.35, 1.0, wallMaterial);

  // Horizontal room separators. Each side uses a continuous 4.9m room bay.
  const sideWidth = (W - CORRIDOR - WALL * 2) / 2;
  const sideCenter = CORRIDOR / 2 + sideWidth / 2;

  wallX(scene, -sideCenter, -3.1, sideWidth, wallMaterial);
  wallX(scene, sideCenter, -3.1, sideWidth, wallMaterial);

  wallX(scene, -sideCenter, 0.4, sideWidth, wallMaterial);
  wallX(scene, sideCenter, 0.4, sideWidth, wallMaterial);

  // Meeting and break room fronts. These are left/right of the corridor.
  wallX(scene, -sideCenter, 4.25, sideWidth, wallMaterial);
  wallX(scene, sideCenter, 4.25, sideWidth, wallMaterial);

  // Door leaf hints at the corridor openings.
  for (const z of doorCenters) {
    addDoorLeaf(scene, corridorLeft + 0.45, z, Math.PI / 2, doorMaterial);
    addDoorLeaf(scene, corridorRight - 0.45, z, -Math.PI / 2, doorMaterial);
  }
  addDoorLeaf(scene, -0.45, 5.35, Math.PI / 2, doorMaterial);
  addDoorLeaf(scene, 0.45, 5.35, -Math.PI / 2, doorMaterial);

  // Main entrance threshold.
  const threshold = meshBox(2.0, 0.05, 0.7, doorMaterial);
  threshold.position.set(0, 0.09, FRONT + 0.35);
  threshold.receiveShadow = true;
  scene.add(threshold);

  label(scene, "OFFICE 1 · 4.8 × 3.5 m", -3.55, -5.25);
  label(scene, "OFFICE 2 · 4.8 × 3.5 m", 3.55, -5.25);
  label(scene, "OFFICE 3 · 4.8 × 3.5 m", -3.55, -1.75);
  label(scene, "OFFICE 4 · 4.8 × 3.5 m", 3.55, -1.75);
  label(scene, "MEETING ROOM · 4.8 × 4.0 m", -3.55, 5.8);
  label(scene, "BREAK ROOM · 4.8 × 4.0 m", 3.55, 5.8);
  label(scene, "MAIN CORRIDOR · 2.0 m", 0, 0, 0x4a5d73);
  label(scene, "MAIN ENTRANCE", 0, FRONT + 0.9, 0x4a5d73);
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
    camera.position.set(18, 20, 20);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
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
      W + 1.2,
      0.55,
      D + 1.2,
      new THREE.MeshStandardMaterial({
        color: 0xc6b298,
        roughness: 0.92,
      }),
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

      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="office-3d-viewer"
      aria-label="Interactive 12 by 15 metre office floor plan"
    >
      <div className="office-3d-help">
        <strong>Buildable floor plan</strong>
        <span>12 × 15 m · 2 m corridor · 1 m doors · empty rooms</span>
      </div>
      <div className="office-3d-badge">FLOOR PLAN</div>
    </div>
  );
}

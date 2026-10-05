"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { OfficeRoom } from "../lib/office-sim";

type Props = {
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

const ROOM_DATA: {
  name: Exclude<OfficeRoom, "Reception">;
  x: number;
  z: number;
  w: number;
  d: number;
  color: number;
}[] = [
  { name: "Manager Office", x: -10, z: -6, w: 8, d: 7, color: 0xe8dfcf },
  { name: "Meeting Room", x: 0, z: -6, w: 10, d: 7, color: 0xe2ecea },
  { name: "Support", x: 10, z: -6, w: 8, d: 7, color: 0xddebed },
  { name: "Design Studio", x: -9, z: 3.5, w: 10, d: 9, color: 0xeee8f5 },
  { name: "Finance", x: 1, z: 3.5, w: 7, d: 9, color: 0xe8e6df },
  { name: "Open Office", x: -1, z: 10, w: 11, d: 5, color: 0xe6eee5 },
  { name: "Break Room", x: 10, z: 5, w: 8, d: 9, color: 0xf0eadf },
];

type DoorSide = "north" | "south" | "east" | "west";

const ROOM_DOORWAYS: Record<Exclude<OfficeRoom, "Reception">, { side: DoorSide; offset: number }[]> = {
  "Manager Office": [{ side: "east", offset: -6 }, { side: "south", offset: -10 }],
  "Meeting Room": [{ side: "west", offset: -6 }, { side: "east", offset: -6 }, { side: "south", offset: 0 }],
  Support: [{ side: "west", offset: -6 }],
  "Design Studio": [{ side: "north", offset: -10 }, { side: "east", offset: 3.5 }, { side: "south", offset: -9 }],
  Finance: [{ side: "north", offset: 1 }, { side: "west", offset: 3.5 }, { side: "east", offset: 3.5 }, { side: "south", offset: 1 }],
  "Open Office": [{ side: "north", offset: -3 }, { side: "north", offset: 1 }, { side: "east", offset: 8.5 }],
  "Break Room": [{ side: "west", offset: 3.5 }, { side: "west", offset: 8.5 }],
};

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function makeTextSprite(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.beginPath();
  ctx.roundRect(12, 24, 488, 78, 22);
  ctx.fill();
  ctx.font = "700 34px Arial";
  ctx.fillStyle = "#475569";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 63);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.25, 0.54, 1);
  return sprite;
}

function addWall(
  scene: THREE.Scene,
  width: number,
  height: number,
  depth: number,
  x: number,
  z: number,
  material: THREE.Material,
) {
  const wall = box(width, height, depth, material);
  wall.position.set(x, height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

function buildExteriorShell(scene: THREE.Scene) {
  const minX = -14.34;
  const maxX = 14.34;
  const minZ = -9.84;
  const maxZ = 12.84;
  const centerZ = (minZ + maxZ) / 2;
  const wallHeight = 2.5;
  const wallThickness = 0.38;

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1c2af,
    roughness: 0.86,
  });

  addWall(scene, maxX - minX + wallThickness * 2 + 0.22, wallHeight, wallThickness, 0, minZ, wallMaterial);
  addWall(scene, maxX - minX + wallThickness * 2 + 0.22, wallHeight, wallThickness, 0, maxZ, wallMaterial);
  addWall(scene, wallThickness, wallHeight, maxZ - minZ + wallThickness * 2 + 0.22, minX, centerZ, wallMaterial);
  addWall(scene, wallThickness, wallHeight, maxZ - minZ + wallThickness * 2 + 0.22, maxX, centerZ, wallMaterial);

  for (const [x, z] of [[minX, minZ], [maxX, minZ], [minX, maxZ], [maxX, maxZ]] as const) {
    addWall(scene, 0.6, wallHeight + 0.08, 0.6, x, z, wallMaterial);
  }

  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: 0xb59b7d,
    roughness: 0.9,
  });
  const skirtHeight = 0.46;
  const skirtThickness = 0.52;

  addWall(scene, maxX - minX + skirtThickness * 2, skirtHeight, skirtThickness, 0, minZ, skirtMaterial);
  addWall(scene, maxX - minX + skirtThickness * 2, skirtHeight, skirtThickness, 0, maxZ, skirtMaterial);
  addWall(scene, skirtThickness, skirtHeight, maxZ - minZ + skirtThickness * 2, minX, centerZ, skirtMaterial);
  addWall(scene, skirtThickness, skirtHeight, maxZ - minZ + skirtThickness * 2, maxX, centerZ, skirtMaterial);

  const floor = box(
    maxX - minX,
    0.1,
    maxZ - minZ,
    new THREE.MeshStandardMaterial({ color: 0xe4e0d8, roughness: 0.92 }),
  );
  floor.position.set(0, 0.05, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);
}

function buildRoom(scene: THREE.Scene, room: typeof ROOM_DATA[number], selectedRoom?: OfficeRoom | null) {
  const group = new THREE.Group();
  group.userData.room = room.name;

  const inset = 0.5;
  const w = Math.max(1, room.w - inset * 2);
  const d = Math.max(1, room.d - inset * 2);

  const floor = box(
    w,
    0.12,
    d,
    new THREE.MeshStandardMaterial({ color: room.color, roughness: 0.8 }),
  );
  floor.position.set(room.x, 0.12, room.z);
  floor.userData.room = room.name;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd5c7b4,
    roughness: 0.85,
  });

  const wallHeight = 2.35;
  const thickness = 0.18;
  const doorwayWidth = 1.8;
  const doors = ROOM_DOORWAYS[room.name];

  const addSegment = (width: number, depth: number, x: number, z: number) => {
    if (width <= 0.08 || depth <= 0.08) return;
    const wall = box(width, wallHeight, depth, wallMaterial);
    wall.position.set(x, wallHeight / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.room = room.name;
    group.add(wall);
  };

  const horizontalWall = (z: number, centers: number[]) => {
    const left = room.x - (w + thickness) / 2;
    const right = room.x + (w + thickness) / 2;
    let cursor = left;

    for (const center of [...centers].sort((a, b) => a - b)) {
      const openingLeft = Math.max(left, center - doorwayWidth / 2);
      const openingRight = Math.min(right, center + doorwayWidth / 2);
      addSegment(openingLeft - cursor, thickness, (cursor + openingLeft) / 2, z);
      cursor = Math.max(cursor, openingRight);
    }

    addSegment(right - cursor, thickness, (cursor + right) / 2, z);
  };

  const verticalWall = (x: number, centers: number[]) => {
    const top = room.z - (d + thickness) / 2;
    const bottom = room.z + (d + thickness) / 2;
    let cursor = top;

    for (const center of [...centers].sort((a, b) => a - b)) {
      const openingTop = Math.max(top, center - doorwayWidth / 2);
      const openingBottom = Math.min(bottom, center + doorwayWidth / 2);
      addSegment(thickness, openingTop - cursor, x, (cursor + openingTop) / 2);
      cursor = Math.max(cursor, openingBottom);
    }

    addSegment(thickness, bottom - cursor, x, (cursor + bottom) / 2);
  };

  horizontalWall(room.z - d / 2, doors.filter((door) => door.side === "north").map((door) => door.offset));
  horizontalWall(room.z + d / 2, doors.filter((door) => door.side === "south").map((door) => door.offset));
  verticalWall(room.x - w / 2, doors.filter((door) => door.side === "west").map((door) => door.offset));
  verticalWall(room.x + w / 2, doors.filter((door) => door.side === "east").map((door) => door.offset));

  const label = makeTextSprite(room.name);
  label.position.set(room.x, 2.75, room.z - d / 2 + 0.72);
  label.userData.room = room.name;
  group.add(label);

  if (selectedRoom === room.name) {
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.14, d)),
      new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.55,
      }),
    );
    outline.position.set(room.x, 0.2, room.z);
    outline.userData.room = room.name;
    group.add(outline);
  }

  scene.add(group);
}

export default function Office3D({ onRoomSelect, selectedRoom }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onRoomSelectRef = useRef(onRoomSelect);
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => {
    onRoomSelectRef.current = onRoomSelect;
    selectedRoomRef.current = selectedRoom;
  }, [onRoomSelect, selectedRoom]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 32, 58);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(20, 19, 23);

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
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 10;
    controls.maxDistance = 36;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.28;
    controls.target.set(0, 0.2, 1.2);

    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x687269, 2.15));

    const sun = new THREE.DirectionalLight(0xfff3d2, 3.0);
    sun.position.set(-8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    scene.add(sun);

    const foundation = box(
      32,
      0.7,
      30,
      new THREE.MeshStandardMaterial({ color: 0xbca489, roughness: 0.92 }),
    );
    foundation.position.y = -0.375;
    foundation.receiveShadow = true;
    scene.add(foundation);

    buildExteriorShell(scene);
    ROOM_DATA.forEach((room) => buildRoom(scene, room, selectedRoomRef.current));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData.room) obj = obj.parent;

        if (obj?.userData.room) {
          onRoomSelectRef.current?.(obj.userData.room as OfficeRoom);
          return;
        }
      }
    };

    renderer.domElement.addEventListener("pointerup", handlePointer);

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(420, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerup", handlePointer);
      controls.dispose();
      renderer.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });

      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="office-3d-viewer"
      aria-label="Interactive empty 3D office shell"
    >
      <div className="office-3d-help">
        <strong>Office shell</strong>
        <span>Drag to rotate · Pinch/scroll to zoom · Tap a room</span>
      </div>
      <div className="office-3d-badge">EMPTY OFFICE</div>
    </div>
  );
}

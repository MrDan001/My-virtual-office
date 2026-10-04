"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  deskSpots,
  type OfficeRoom,
} from "../lib/office-sim";

type StaffStatus = "Working" | "Meeting" | "Break" | "Away";

type Staff = {
  id: number;
  name: string;
  role: string;
  department: string;
  status: StaffStatus;
  task: string;
  x: number;
  y: number;
  color: string;
  location?: OfficeRoom;
  walking?: boolean;
};

type Props = {
  staff: Staff[];
  running: boolean;
  onSelect: (staff: Staff) => void;
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

type DoorSide = "top" | "bottom";

type RoomData = {
  name: Exclude<OfficeRoom, "Reception">;
  x: number;
  z: number;
  w: number;
  d: number;
  floor: number;
  doorSide: DoorSide;
  doorX: number;
  doorY: number;
};

type HumanRig = {
  group: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  rightThigh: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  hands: THREE.Mesh[];
  eyes: THREE.Mesh[];
  pupils: THREE.Mesh[];
};

const ROOM_DATA: RoomData[] = [
  {
    name: "Manager Office",
    x: -7.35,
    z: -5.95,
    w: 5.9,
    d: 5.45,
    floor: 0xe8dfcf,
    doorSide: "bottom",
    doorX: 16.5,
    doorY: 33,
  },
  {
    name: "Meeting Room",
    x: 0.15,
    z: -5.95,
    w: 7.55,
    d: 5.45,
    floor: 0xe1ecea,
    doorSide: "bottom",
    doorX: 51,
    doorY: 33,
  },
  {
    name: "Support",
    x: 7.55,
    z: -5.25,
    w: 5.35,
    d: 6.85,
    floor: 0xdcebed,
    doorSide: "bottom",
    doorX: 84.5,
    doorY: 40.5,
  },
  {
    name: "Design Studio",
    x: -6.15,
    z: 3.05,
    w: 7.85,
    d: 7.75,
    floor: 0xeee8f5,
    doorSide: "top",
    doorX: 22,
    doorY: 45.5,
  },
  {
    name: "Finance",
    x: 1.25,
    z: 3.05,
    w: 5.6,
    d: 7.75,
    floor: 0xe8e6df,
    doorSide: "top",
    doorX: 56.5,
    doorY: 45.5,
  },
  {
    name: "Break Room",
    x: 7.55,
    z: 4.65,
    w: 5.35,
    d: 8.2,
    floor: 0xf1eadf,
    doorSide: "top",
    doorX: 84.5,
    doorY: 53,
  },
  {
    name: "Open Office",
    x: 0.0,
    z: 4.7,
    w: 8.0,
    d: 7.2,
    floor: 0xe4ede3,
    doorSide: "top",
    doorX: 52,
    doorY: 53,
  },
];

const FACE_TONES = [0xf2c5a3, 0xdca27f, 0xb87953, 0x925b43, 0x704437];
const HAIR_TONES = [0x221b1a, 0x3b2b25, 0x161a20, 0x35231e, 0x24191a];
const PANTS_TONES = [0x293646, 0x3b4554, 0x252c35];
const SHOE_TONES = [0x171b21, 0x222a34, 0x343434];

function worldFromPercent(x: number, y: number) {
  return {
    x: (x / 100) * 22 - 11,
    z: (y / 100) * 19 - 9.5,
  };
}

function percentDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material,
  );
}

function capsule(radius: number, length: number, material: THREE.Material) {
  return new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 5, 10),
    material,
  );
}

function makeTextSprite(text: string, color = "#263445") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Group();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.96)";
  ctx.roundRect(10, 25, 492, 76, 23);
  ctx.fill();

  ctx.font = "800 34px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 63);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(2.2, 0.54, 1);
  return sprite;
}

function addPlant(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.33, 0.42, 16),
    new THREE.MeshStandardMaterial({
      color: 0xb87452,
      roughness: 0.78,
    }),
  );
  pot.position.y = 0.21;
  group.add(pot);

  const green = new THREE.MeshStandardMaterial({
    color: 0x3e7b54,
    roughness: 0.86,
  });

  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 10, 8),
      green,
    );
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(
      Math.cos(angle) * 0.18,
      0.62 + (i % 2) * 0.12,
      Math.sin(angle) * 0.18,
    );
    leaf.scale.set(0.7, 1.6, 0.7);
    group.add(leaf);
  }

  scene.add(group);
}

function addDesk(
  scene: THREE.Scene,
  seatX: number,
  seatZ: number,
  rotation: number,
  label: string,
) {
  const group = new THREE.Group();
  const facing = new THREE.Vector3(
    Math.sin(rotation),
    0,
    Math.cos(rotation),
  );
  group.position.set(
    seatX - facing.x * 0.98,
    0,
    seatZ - facing.z * 0.98,
  );
  group.rotation.y = rotation;

  const wood = new THREE.MeshStandardMaterial({
    color: 0xa26d49,
    roughness: 0.62,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1f2630,
    roughness: 0.35,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xadb7c0,
    metalness: 0.72,
    roughness: 0.24,
  });

  const top = roundedBox(2.15, 0.18, 1.1, wood);
  top.position.y = 1.18;
  top.castShadow = true;
  group.add(top);

  for (const x of [-0.78, 0.78]) {
    const leg = roundedBox(0.11, 1.12, 0.11, metal);
    leg.position.set(x, 0.55, 0.38);
    leg.castShadow = true;
    group.add(leg);
  }

  const monitor = roundedBox(0.86, 0.52, 0.08, dark);
  monitor.position.set(0, 1.58, -0.17);
  monitor.castShadow = true;
  group.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.35),
    new THREE.MeshStandardMaterial({
      color: 0x89b9c7,
      emissive: 0x17343b,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  screen.position.set(0, 1.58, -0.215);
  screen.rotation.y = Math.PI;
  group.add(screen);

  const keyboard = roundedBox(0.76, 0.045, 0.27, metal);
  keyboard.position.set(0, 1.38, 0.18);
  group.add(keyboard);

  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x41586c,
    roughness: 0.67,
  });
  const chair = new THREE.Group();
  chair.position.set(0, 0, 0.98);

  const seat = roundedBox(0.82, 0.18, 0.82, chairMat);
  seat.position.y = 0.63;
  chair.add(seat);

  const back = roundedBox(0.8, 0.96, 0.15, chairMat);
  back.position.set(0, 1.03, -0.3);
  chair.add(back);

  const stem = roundedBox(0.09, 0.58, 0.09, metal);
  stem.position.y = 0.3;
  chair.add(stem);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.5, 0.05, 16),
    metal,
  );
  base.position.y = 0.03;
  chair.add(base);

  group.add(chair);

  if (label) {
    const tag = makeTextSprite(label, "#5a6876");
    tag.position.set(0, 2.13, 0);
    tag.scale.set(1.25, 0.31, 1);
    group.add(tag);
  }

  scene.add(group);
  return group;
}

function addMeetingChair(
  scene: THREE.Scene,
  x: number,
  z: number,
  rotation: number,
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x50697c,
    roughness: 0.63,
  });

  const seat = roundedBox(0.78, 0.18, 0.78, chairMat);
  seat.position.y = 0.62;
  group.add(seat);

  const back = roundedBox(0.76, 0.9, 0.14, chairMat);
  back.position.set(0, 1.01, -0.3);
  group.add(back);

  const leg = roundedBox(
    0.09,
    0.58,
    0.09,
    new THREE.MeshStandardMaterial({
      color: 0x9da7b1,
      metalness: 0.62,
      roughness: 0.33,
    }),
  );
  leg.position.y = 0.3;
  group.add(leg);

  scene.add(group);
}

function addDoor(scene: THREE.Scene, room: RoomData) {
  const group = new THREE.Group();
  const hinge = new THREE.Group();

  const doorW = Math.min(1.28, room.w * 0.3);
  const doorH = 2.08;

  const frame = new THREE.MeshStandardMaterial({
    color: 0x745e4c,
    roughness: 0.58,
  });

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x9d7657,
    roughness: 0.58,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa9ccd6,
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
    metalness: 0.1,
  });

  const panel = roundedBox(doorW, doorH, 0.08, panelMat);
  panel.position.set(doorW / 2, doorH / 2, 0.02);
  panel.castShadow = true;
  hinge.add(panel);

  const glass = roundedBox(
    doorW * 0.54,
    doorH * 0.42,
    0.09,
    glassMat,
  );
  glass.position.set(doorW / 2, doorH * 0.66, -0.05);
  hinge.add(glass);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xd8b873,
      metalness: 0.8,
      roughness: 0.2,
    }),
  );
  handle.position.set(doorW * 0.8, doorH * 0.48, -0.09);
  hinge.add(handle);

  const leftPost = roundedBox(0.13, doorH + 0.18, 0.2, frame);
  const rightPost = roundedBox(0.13, doorH + 0.18, 0.2, frame);
  leftPost.position.set(-0.08, doorH / 2, 0);
  rightPost.position.set(doorW + 0.08, doorH / 2, 0);
  group.add(leftPost, rightPost);

  const top = roundedBox(doorW + 0.29, 0.13, 0.2, frame);
  top.position.set(doorW / 2, doorH + 0.08, 0);
  group.add(top);

  const edge = room.doorSide === "bottom"
    ? room.z + room.d / 2 + 0.09
    : room.z - room.d / 2 - 0.09;

  if (room.doorSide === "bottom") {
    group.position.set(room.x + 0.01 - doorW / 2, 0, edge);
  } else {
    group.position.set(room.x + 0.01 - doorW / 2, 0, edge);
    hinge.rotation.y = Math.PI;
  }

  group.add(hinge);
  group.userData.room = room.name;
  group.userData.hinge = hinge;
  group.userData.closed = hinge.rotation.y;
  group.userData.open =
    hinge.rotation.y + (room.doorSide === "bottom" ? -Math.PI * 0.48 : Math.PI * 0.48);

  scene.add(group);
  return group;
}

function addRoom(
  scene: THREE.Scene,
  room: RoomData,
  doors: Map<OfficeRoom, THREE.Group>,
) {
  const floorMat = new THREE.MeshStandardMaterial({
    color: room.floor,
    roughness: 0.82,
    metalness: 0.01,
  });

  const floor = roundedBox(room.w, 0.12, room.d, floorMat);
  floor.position.set(room.x, 0.06, room.z);
  floor.receiveShadow = true;
  floor.userData.room = room.name;
  scene.add(floor);

  if (room.name === "Open Office") {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(room.w * 0.9, 0.035, room.d * 0.86),
      new THREE.MeshStandardMaterial({
        color: 0xcbd8cd,
        roughness: 1,
      }),
    );
    rug.position.set(room.x, 0.12, room.z);
    rug.receiveShadow = true;
    rug.userData.room = room.name;
    scene.add(rug);

    const label = makeTextSprite("Open Office", "#5d6b77");
    label.position.set(room.x, 2.82, room.z - room.d / 2 + 0.72);
    label.scale.set(2.0, 0.47, 1);
    label.userData.room = room.name;
    scene.add(label);

    const light = new THREE.PointLight(0xfff2d1, 0.46, 8);
    light.position.set(room.x, 2.25, room.z);
    scene.add(light);
    return;
  }

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd1c5b6,
    roughness: 0.86,
  });

  const wallH = 2.55;
  const wallT = 0.16;
  const doorW = Math.min(1.28, room.w * 0.3);

  const frontZ = room.z + room.d / 2;
  const backZ = room.z - room.d / 2;
  const leftX = room.x - room.w / 2;
  const rightX = room.x + room.w / 2;

  const addWall = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const wall = roundedBox(width, height, depth, wallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  };

  const gapHalf = doorW / 2 + 0.02;
  const sideW = Math.max(0.25, room.w / 2 - gapHalf);

  if (room.doorSide === "bottom") {
    addWall(sideW, wallH, wallT, leftX + sideW / 2, wallH / 2, frontZ);
    addWall(sideW, wallH, wallT, rightX - sideW / 2, wallH / 2, frontZ);
    addWall(room.w, wallH, wallT, room.x, wallH / 2, backZ);
  } else {
    addWall(sideW, wallH, wallT, leftX + sideW / 2, wallH / 2, backZ);
    addWall(sideW, wallH, wallT, rightX - sideW / 2, wallH / 2, backZ);
    addWall(room.w, wallH, wallT, room.x, wallH / 2, frontZ);
  }

  addWall(wallT, wallH, room.d, leftX, wallH / 2, room.z);
  addWall(wallT, wallH, room.d, rightX, wallH / 2, room.z);

  // Interior window panels make the offices feel like real rooms rather than boxes.
  const glass = new THREE.MeshStandardMaterial({
    color: 0xc3dfe6,
    transparent: true,
    opacity: 0.58,
    roughness: 0.2,
    metalness: 0.15,
  });

  const windowZ =
    room.doorSide === "bottom" ? backZ - 0.09 : frontZ + 0.09;
  const window = roundedBox(
    Math.min(room.w * 0.48, 2.35),
    0.72,
    0.05,
    glass,
  );
  window.position.set(room.x, 1.78, windowZ);
  scene.add(window);

  const door = addDoor(scene, room);
  doors.set(room.name, door);

  const tag = makeTextSprite(room.name, "#5d6b77");
  tag.position.set(room.x, 2.82, room.doorSide === "bottom" ? backZ + 0.62 : backZ + 0.62);
  tag.scale.set(2.0, 0.47, 1);
  scene.add(tag);

  const light = new THREE.PointLight(0xfff2d1, 0.43, 7.5);
  light.position.set(room.x, 2.3, room.z);
  scene.add(light);
}

function addOfficeFurniture(scene: THREE.Scene) {
  const toWorld = (p: { x: number; y: number }) => worldFromPercent(p.x, p.y);

  for (const point of deskSpots["Manager Office"]) {
    const p = toWorld(point);
    addDesk(scene, p.x, p.z, Math.PI, "Manager");
  }

  for (const point of deskSpots["Design Studio"]) {
    const p = toWorld(point);
    addDesk(scene, p.x, p.z, 0, "Design");
  }

  for (const point of deskSpots.Finance) {
    const p = toWorld(point);
    addDesk(scene, p.x, p.z, 0, "Finance");
  }

  for (const point of deskSpots.Support) {
    const p = toWorld(point);
    addDesk(scene, p.x, p.z, Math.PI, "Support");
  }

  for (const point of deskSpots["Open Office"]) {
    const p = toWorld(point);
    addDesk(scene, p.x, p.z, 0, "Open");
  }

  const meeting = new THREE.Group();
  const table = roundedBox(
    5.0,
    0.28,
    2.2,
    new THREE.MeshStandardMaterial({
      color: 0x9b684a,
      roughness: 0.66,
    }),
  );
  table.position.set(0.15, 1.04, -5.95);
  table.castShadow = true;
  meeting.add(table);

  const tableBase = roundedBox(
    0.45,
    0.92,
    1.05,
    new THREE.MeshStandardMaterial({
      color: 0x6a7782,
      roughness: 0.62,
    }),
  );
  tableBase.position.set(0.15, 0.48, -5.95);
  meeting.add(tableBase);

  [-1.9, -0.65, 0.65, 1.9].forEach((x) => {
    addMeetingChair(scene, 0.15 + x, -4.25, Math.PI);
    addMeetingChair(scene, 0.15 + x, -7.65, 0);
  });

  const board = roundedBox(
    2.9,
    1.35,
    0.08,
    new THREE.MeshStandardMaterial({
      color: 0xf9fafb,
      roughness: 0.42,
    }),
  );
  board.position.set(2.85, 1.63, -8.6);
  meeting.add(board);

  const boardText = makeTextSprite("TEAM PLAN", "#678096");
  boardText.position.set(2.85, 1.67, -8.66);
  boardText.scale.set(1.35, 0.34, 1);
  meeting.add(boardText);

  scene.add(meeting);

  const breakTable = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: 0x9b7556,
      roughness: 0.72,
    }),
  );
  breakTable.position.set(7.55, 1, 5.0);
  breakTable.castShadow = true;
  scene.add(breakTable);

  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    addMeetingChair(
      scene,
      7.55 + Math.cos(angle) * 1.72,
      5 + Math.sin(angle) * 1.72,
      angle,
    );
  }

  const counter = roundedBox(
    3.0,
    0.78,
    0.55,
    new THREE.MeshStandardMaterial({
      color: 0xc5b7a4,
      roughness: 0.82,
    }),
  );
  counter.position.set(7.55, 0.55, 2.1);
  scene.add(counter);

  const coffee = makeTextSprite("COFFEE", "#6c5e50");
  coffee.position.set(7.55, 1.36, 1.74);
  coffee.scale.set(1.0, 0.27, 1);
  scene.add(coffee);

  addPlant(scene, -9.65, -8.15, 1.05);
  addPlant(scene, 9.45, -8.05, 0.9);
  addPlant(scene, -9.25, 8.2, 1.0);
  addPlant(scene, 4.45, 9.0, 0.86);

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.035, 2.45),
    new THREE.MeshStandardMaterial({
      color: 0xcdd8cb,
      roughness: 1,
    }),
  );
  rug.position.set(0, 0.12, 7.75);
  scene.add(rug);
}

function addHuman(scene: THREE.Scene, person: Staff): HumanRig {
  const group = new THREE.Group();
  const p = worldFromPercent(person.x, person.y);
  group.position.set(p.x, 0, p.z);
  group.userData.staffId = person.id;

  const shirt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.color),
    roughness: 0.74,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: PANTS_TONES[Math.abs(person.id) % PANTS_TONES.length],
    roughness: 0.83,
  });
  const shoe = new THREE.MeshStandardMaterial({
    color: SHOE_TONES[Math.abs(person.id * 2) % SHOE_TONES.length],
    roughness: 0.74,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: FACE_TONES[Math.abs(person.id) % FACE_TONES.length],
    roughness: 0.78,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: HAIR_TONES[Math.abs(person.id * 3) % HAIR_TONES.length],
    roughness: 0.9,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xf7f7f4,
    roughness: 0.45,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x17151a,
    roughness: 0.5,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x814b48,
    roughness: 0.75,
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.53, 26),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.14,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  group.add(shadow);

  const hips = new THREE.Group();
  hips.position.y = 0.84;
  group.add(hips);

  const torso = capsule(0.4, 0.55, shirt) as THREE.Mesh;
  torso.scale.set(1.02, 1.08, 0.86);
  torso.position.y = 1.36;
  torso.castShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.125, 0.16, 12),
    skin,
  );
  neck.position.y = 1.84;
  group.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 2.2;
  group.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.365, 24, 18),
    skin,
  );
  head.scale.set(0.96, 1.06, 0.92);
  head.castShadow = true;
  headGroup.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.382,
      24,
      14,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.53,
    ),
    hair,
  );
  hairCap.scale.set(1.01, 0.9, 0.98);
  hairCap.position.y = 0.12;
  headGroup.add(hairCap);

  // Hairline/fringe varies slightly by employee.
  const hairStyle = Math.abs(person.id) % 4;
  const fringeCount = hairStyle === 0 ? 4 : hairStyle === 1 ? 3 : 2;
  for (let i = 0; i < fringeCount; i += 1) {
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 12, 9),
      hair,
    );
    const x = (i - (fringeCount - 1) / 2) * 0.13;
    fringe.scale.set(0.95, 1.35, 0.8);
    fringe.position.set(x, 0.1 + (i % 2) * 0.025, 0.3);
    headGroup.add(fringe);
  }

  if (hairStyle === 2) {
    const sideL = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 14, 12),
      hair,
    );
    sideL.scale.set(0.66, 1.1, 0.7);
    sideL.position.set(-0.32, -0.02, 0.08);
    headGroup.add(sideL);
    const sideR = sideL.clone();
    sideR.position.x = 0.32;
    headGroup.add(sideR);
  }

  if (hairStyle === 3) {
    const bun = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 12),
      hair,
    );
    bun.position.set(0, 0.15, -0.34);
    bun.scale.set(1.05, 1.05, 0.8);
    headGroup.add(bun);
  }

  const eyes: THREE.Mesh[] = [];
  const pupils: THREE.Mesh[] = [];
  for (const x of [-0.135, 0.135]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 14, 12),
      eyeWhite,
    );
    eye.scale.set(1, 0.82, 0.65);
    eye.position.set(x, 0.02, 0.34);
    headGroup.add(eye);
    eyes.push(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 10, 8),
      pupilMat,
    );
    pupil.position.set(x, 0.02, 0.378);
    headGroup.add(pupil);
    pupils.push(pupil);
  }

  const browMat = new THREE.MeshStandardMaterial({
    color: 0x46342d,
    roughness: 0.88,
  });
  for (const [x, rz] of [
    [-0.14, 0.1],
    [0.14, -0.1],
  ] as const) {
    const brow = roundedBox(0.13, 0.024, 0.018, browMat);
    brow.position.set(x, 0.13, 0.33);
    brow.rotation.z = rz;
    headGroup.add(brow);
  }

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.048, 0.13, 8),
    skin,
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.05, 0.375);
  headGroup.add(nose);

  const mouth = roundedBox(0.12, 0.026, 0.018, lipMat);
  mouth.position.set(0, -0.18, 0.342);
  headGroup.add(mouth);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.032, 8, 18, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0xe0e8ef,
      roughness: 0.66,
    }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.75;
  group.add(collar);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.44, 1.53, 0);
  const leftUpper = capsule(0.105, 0.47, shirt);
  leftUpper.position.y = -0.24;
  leftArm.add(leftUpper);

  const leftForearm = new THREE.Group();
  leftForearm.position.y = -0.53;
  const leftFore = capsule(0.09, 0.41, shirt);
  leftFore.position.y = -0.21;
  leftForearm.add(leftFore);
  leftArm.add(leftForearm);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.44, 1.53, 0);
  const rightUpper = capsule(0.105, 0.47, shirt);
  rightUpper.position.y = -0.24;
  rightArm.add(rightUpper);

  const rightForearm = new THREE.Group();
  rightForearm.position.y = -0.53;
  const rightFore = capsule(0.09, 0.41, shirt);
  rightFore.position.y = -0.21;
  rightForearm.add(rightFore);
  rightArm.add(rightForearm);
  group.add(rightArm);

  const handL = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 12, 10),
    skin,
  );
  handL.position.set(-0.44, 0.79, 0);
  group.add(handL);

  const handR = handL.clone();
  handR.position.x = 0.44;
  group.add(handR);

  const leftThigh = new THREE.Group();
  leftThigh.position.set(-0.17, 0.88, 0);
  const thighMesh = capsule(0.12, 0.46, pants);
  thighMesh.position.y = -0.26;
  leftThigh.add(thighMesh);

  const leftShin = new THREE.Group();
  leftShin.position.y = -0.62;
  const shinMesh = capsule(0.095, 0.37, pants);
  shinMesh.position.y = -0.22;
  leftShin.add(shinMesh);

  const shoeL = roundedBox(0.23, 0.13, 0.45, shoe);
  shoeL.position.set(0, -0.55, 0.16);
  leftShin.add(shoeL);

  leftThigh.add(leftShin);
  group.add(leftThigh);

  const rightThigh = new THREE.Group();
  rightThigh.position.set(0.17, 0.88, 0);
  const thighMeshR = capsule(0.12, 0.46, pants);
  thighMeshR.position.y = -0.26;
  rightThigh.add(thighMeshR);

  const rightShin = new THREE.Group();
  rightShin.position.y = -0.62;
  const shinMeshR = capsule(0.095, 0.37, pants);
  shinMeshR.position.y = -0.22;
  rightShin.add(shinMeshR);

  const shoeR = roundedBox(0.23, 0.13, 0.45, shoe);
  shoeR.position.set(0, -0.55, 0.16);
  rightShin.add(shoeR);

  rightThigh.add(rightShin);
  group.add(rightThigh);

  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  scene.add(group);

  return {
    group,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftThigh,
    rightThigh,
    leftShin,
    rightShin,
    hands: [handL, handR],
    eyes,
    pupils,
  };
}

function applyHumanPose(
  rig: HumanRig,
  person: Staff,
  time: number,
) {
  const walking = Boolean(person.walking);
  const working = person.status === "Working" && !walking;
  const meeting = person.status === "Meeting" && !walking;
  const breaking = person.status === "Break" && !walking;

  if (walking) {
    const phase = time * 8.5 + person.id * 0.7;
    const stride = Math.sin(phase);

    rig.group.position.y = 0.02 + Math.abs(Math.sin(phase)) * 0.025;
    rig.torso.position.y = 1.36;
    rig.torso.rotation.x = 0;
    rig.torso.rotation.z = stride * 0.02;

    rig.headGroup.position.y = 2.2;
    rig.headGroup.rotation.x = 0;
    rig.headGroup.rotation.z = stride * 0.018;

    rig.leftArm.rotation.x = stride * 0.5;
    rig.rightArm.rotation.x = -stride * 0.5;
    rig.leftForearm.rotation.x = -0.08;
    rig.rightForearm.rotation.x = -0.08;

    rig.leftThigh.rotation.x = stride * 0.62;
    rig.rightThigh.rotation.x = -stride * 0.62;
    rig.leftShin.rotation.x = Math.max(0, -stride) * 0.35;
    rig.rightShin.rotation.x = Math.max(0, stride) * 0.35;

    rig.hands[0].position.set(-0.44, 0.79, 0);
    rig.hands[1].position.set(0.44, 0.79, 0);

    for (const eye of rig.eyes) eye.scale.y = 0.82;
    return;
  }

  // Standing, meeting, break and work poses are deliberately height-stable.
  rig.group.position.y = 0;
  rig.torso.rotation.x = 0;
  rig.torso.rotation.z = 0;
  rig.headGroup.rotation.x = 0;
  rig.headGroup.rotation.z = 0;

  if (working) {
    // Fixed seated work pose: no vertical bobbing.
    rig.torso.position.y = 1.28;
    rig.torso.rotation.x = 0.08;
    rig.headGroup.position.y = 2.05;
    rig.headGroup.rotation.x = 0.05;

    rig.leftArm.rotation.z = -0.46;
    rig.rightArm.rotation.z = 0.46;
    rig.leftForearm.rotation.x = 1.17;
    rig.rightForearm.rotation.x = 1.17;

    rig.hands[0].position.set(-0.24, 1.18, -0.38);
    rig.hands[1].position.set(0.24, 1.18, -0.38);

    rig.leftThigh.rotation.x = 1.16;
    rig.rightThigh.rotation.x = 1.16;
    rig.leftShin.rotation.x = -1.23;
    rig.rightShin.rotation.x = -1.23;
    rig.leftThigh.position.y = 0.76;
    rig.rightThigh.position.y = 0.76;

    for (const eye of rig.eyes) eye.scale.y = 0.82;
    return;
  }

  if (meeting) {
    rig.torso.position.y = 1.36;
    rig.headGroup.position.y = 2.2;

    rig.leftArm.rotation.z = -0.28;
    rig.rightArm.rotation.z = 0.28;
    rig.leftForearm.rotation.x = 0.25;
    rig.rightForearm.rotation.x = 0.25;
    rig.hands[0].position.set(-0.36, 0.94, -0.06);
    rig.hands[1].position.set(0.36, 0.94, -0.06);

    rig.leftThigh.rotation.x = 1.02;
    rig.rightThigh.rotation.x = 1.02;
    rig.leftShin.rotation.x = -1.05;
    rig.rightShin.rotation.x = -1.05;
    return;
  }

  if (breaking) {
    rig.torso.position.y = 1.36;
    rig.headGroup.position.y = 2.2;
    rig.leftArm.rotation.z = -0.12;
    rig.rightArm.rotation.z = 0.12;
    rig.leftForearm.rotation.x = 0.35;
    rig.rightForearm.rotation.x = 0.35;
    rig.hands[0].position.set(-0.3, 1.02, 0);
    rig.hands[1].position.set(0.3, 1.02, 0);
    return;
  }

  // Away / fallback standing.
  rig.torso.position.y = 1.36;
  rig.headGroup.position.y = 2.2;
  rig.leftArm.rotation.z = -0.06;
  rig.rightArm.rotation.z = 0.06;
  rig.leftForearm.rotation.x = 0;
  rig.rightForearm.rotation.x = 0;
  rig.leftThigh.rotation.x = 0;
  rig.rightThigh.rotation.x = 0;
  rig.leftShin.rotation.x = 0;
  rig.rightShin.rotation.x = 0;
}

export default function Office3D({
  staff,
  running,
  onSelect,
  onRoomSelect,
  selectedRoom,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef(staff);
  const runningRef = useRef(running);
  const onSelectRef = useRef(onSelect);
  const onRoomSelectRef = useRef(onRoomSelect);
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onRoomSelectRef.current = onRoomSelect;
  }, [onRoomSelect]);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 28, 52);

    const camera = new THREE.PerspectiveCamera(
      44,
      Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight),
      0.1,
      100,
    );
    camera.position.set(18, 18, 22);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.minPolarAngle = 0.26;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 0, 0.7);

    scene.add(
      new THREE.HemisphereLight(0xf8fbff, 0x6d756d, 2.3),
    );

    const sun = new THREE.DirectionalLight(0xfff4dc, 3.15);
    sun.position.set(-10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    scene.add(sun);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(25, 0.38, 22),
      new THREE.MeshStandardMaterial({
        color: 0xb49a7c,
        roughness: 0.92,
      }),
    );
    base.position.y = -0.2;
    base.receiveShadow = true;
    scene.add(base);

    // Clean central circulation floor makes the door-to-door routes readable.
    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(20.8, 0.045, 2.1),
      new THREE.MeshStandardMaterial({
        color: 0xd5ddd8,
        roughness: 0.93,
      }),
    );
    corridor.position.set(0, 0.02, -0.35);
    corridor.receiveShadow = true;
    scene.add(corridor);

    const corridorLine = new THREE.Mesh(
      new THREE.BoxGeometry(20.8, 0.018, 0.045),
      new THREE.MeshStandardMaterial({
        color: 0xb3c1ba,
        roughness: 0.92,
      }),
    );
    corridorLine.position.set(0, 0.05, 0.55);
    scene.add(corridorLine);

    const doors = new Map<OfficeRoom, THREE.Group>();
    ROOM_DATA.forEach((room) => addRoom(scene, room, doors));
    addOfficeFurniture(scene);

    const rigs = new Map<number, HumanRig>();
    staffRef.current.forEach((person) => {
      rigs.set(person.id, addHuman(scene, person));
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (
        Math.hypot(
          event.clientX - pointerDown.x,
          event.clientY - pointerDown.y,
        ) > 8
      ) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x =
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointer.y =
        -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        let object: THREE.Object3D | null = hit.object;
        while (
          object &&
          !object.userData.staffId &&
          !object.userData.room
        ) {
          object = object.parent;
        }

        if (object?.userData.staffId) {
          const selected = staffRef.current.find(
            (person) => person.id === object!.userData.staffId,
          );
          if (selected) {
            onSelectRef.current(selected);
          }
          return;
        }

        if (object?.userData.room && onRoomSelectRef.current) {
          onRoomSelectRef.current(
            object.userData.room as OfficeRoom,
          );
          return;
        }
      }
    };

    renderer.domElement.addEventListener(
      "pointerdown",
      handlePointerDown,
    );
    renderer.domElement.addEventListener(
      "pointerup",
      handlePointerUp,
    );

    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      controls.update();

      for (const person of staffRef.current) {
        let rig = rigs.get(person.id);
        if (!rig) {
          rig = addHuman(scene, person);
          rigs.set(person.id, rig);
        }

        const target = worldFromPercent(person.x, person.y);
        const current = rig.group.position;
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        const distance = Math.hypot(dx, dz);

        // Visual interpolation keeps the fast simulation smooth.
        if (runningRef.current && distance > 0.004) {
          const blend = Math.min(
            1,
            delta * (person.walking ? 7.5 : 11),
          );
          current.x += dx * blend;
          current.z += dz * blend;

          if (person.walking) {
            const desired = Math.atan2(dx, dz);
            let angle = desired - rig.group.rotation.y;
            angle = Math.atan2(Math.sin(angle), Math.cos(angle));
            rig.group.rotation.y +=
              angle * Math.min(1, delta * 10);
          }
        }

        applyHumanPose(rig, person, time);

        // A door opens only for approaching staff or a selected room.
        for (const [room, door] of doors) {
          const node = ROOM_DATA.find((item) => item.name === room);
          if (!node) continue;

          const distanceToDoor = percentDistance(
            { x: person.x, y: person.y },
            { x: node.doorX, y: node.doorY },
          );

          const open =
            distanceToDoor < 4.4 ||
            selectedRoomRef.current === room;

          const hinge = door.userData.hinge as THREE.Group;
          const closed = Number(door.userData.closed);
          const openRotation = Number(door.userData.open);
          const targetRotation = open ? openRotation : closed;

          hinge.rotation.y +=
            (targetRotation - hinge.rotation.y) *
            Math.min(1, delta * 8);
        }
      }

      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = () => {
      animate();
      raf = requestAnimationFrame(loop);
    };
    loop();

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
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
      renderer.domElement.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      renderer.domElement.removeEventListener(
        "pointerup",
        handlePointerUp,
      );
      controls.dispose();
      renderer.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });

      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="office-3d-viewer"
      aria-label="Interactive redesigned 3D virtual office"
    >
      <div className="office-3d-help">
        <strong>3D Office</strong>
        <span>Drag to rotate · Pinch/scroll to zoom · Tap people or rooms</span>
      </div>
      <div className="office-3d-badge">REAL-TIME 3D</div>
    </div>
  );
}

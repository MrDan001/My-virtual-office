"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Design Studio"
  | "Finance"
  | "Support"
  | "Break Room"
  | "Open Office";

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

type RoomData = {
  name: OfficeRoom;
  x: number;
  z: number;
  w: number;
  d: number;
  color: number;
  doorSide: "front" | "back" | "left" | "right";
  doorOffset: number;
};

type Rig = {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  eyes: THREE.Object3D[];
  hands: THREE.Object3D[];
  chair?: THREE.Group;
  workDesk?: THREE.Group;
};

const ROOM_DATA: RoomData[] = [
  // These coordinates intentionally match the app's percent-based office layout.
  { name: "Manager Office", x: -7.37, z: -5.89, w: 5.94, d: 5.32, color: 0xe8dfcf, doorSide: "front", doorOffset: 0 },
  { name: "Meeting Room", x: 0.22, z: -5.89, w: 7.48, d: 5.32, color: 0xe2ecea, doorSide: "front", doorOffset: 0 },
  { name: "Support", x: 7.59, z: -4.39, w: 5.50, d: 8.36, color: 0xddebed, doorSide: "front", doorOffset: 0 },
  { name: "Design Studio", x: -6.16, z: 3.33, w: 8.36, d: 11.21, color: 0xeee8f5, doorSide: "front", doorOffset: 0 },
  { name: "Finance", x: 1.43, z: 3.33, w: 5.06, d: 11.21, color: 0xe8e6df, doorSide: "front", doorOffset: 0 },
  { name: "Break Room", x: 7.59, z: 4.75, w: 5.50, d: 8.36, color: 0xf0eadf, doorSide: "front", doorOffset: 0 },
  { name: "Open Office", x: 0.44, z: 2.76, w: 7.48, d: 11.59, color: 0xe6eee5, doorSide: "front", doorOffset: 0 },
];

const FACE_TONES = [0xf0c3a2, 0xd9a079, 0xb87852, 0x915b43, 0x704638];
const HAIR_TONES = [0x2a211e, 0x44322a, 0x171c25, 0x35231f, 0x211717];
const SHOE_TONES = [0x20242a, 0x29333e, 0x1c2026];

function worldFromPercent(x: number, y: number) {
  return {
    x: (x / 100) * 22 - 11,
    z: (y / 100) * 19 - 9.5,
  };
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function capsule(radius: number, length: number, material: THREE.Material) {
  return new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 5, 10),
    material,
  );
}

function makeTextSprite(text: string, color = "#1f2937") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.roundRect(12, 24, 488, 78, 24);
  ctx.fill();
  ctx.font = "bold 34px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 63);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true }),
  );
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

function addDesk(
  scene: THREE.Scene,
  x: number,
  z: number,
  rotation = 0,
  label = "",
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const wood = new THREE.MeshStandardMaterial({
    color: 0x9a6848,
    roughness: 0.62,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x252b33,
    roughness: 0.35,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb7bec6,
    metalness: 0.75,
    roughness: 0.25,
  });

  const top = roundedBox(2.45, 0.18, 1.1, wood);
  top.position.y = 1.2;
  top.castShadow = true;
  group.add(top);

  [-0.9, 0.9].forEach((px) => {
    const leg = roundedBox(0.12, 1.15, 0.12, chrome);
    leg.position.set(px, 0.56, 0.36);
    leg.castShadow = true;
    group.add(leg);
  });

  const monitor = roundedBox(0.82, 0.52, 0.08, dark);
  monitor.position.set(0, 1.57, -0.18);
  monitor.castShadow = true;
  group.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.36, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x73a9b8,
      emissive: 0x19333b,
      emissiveIntensity: 0.35,
    }),
  );
  screen.position.set(0, 1.57, -0.225);
  group.add(screen);

  const keyboard = roundedBox(0.78, 0.05, 0.28, chrome);
  keyboard.position.set(0, 1.38, 0.19);
  group.add(keyboard);

  const chair = new THREE.Group();
  chair.position.set(0, 0.02, 0.98);
  chair.rotation.y = Math.PI;
  const seat = roundedBox(
    0.86,
    0.18,
    0.86,
    new THREE.MeshStandardMaterial({ color: 0x40566b, roughness: 0.65 }),
  );
  seat.position.y = 0.62;
  seat.castShadow = true;
  chair.add(seat);
  const back = roundedBox(
    0.82,
    0.95,
    0.16,
    new THREE.MeshStandardMaterial({ color: 0x40566b, roughness: 0.65 }),
  );
  back.position.set(0, 1.06, -0.34);
  back.castShadow = true;
  chair.add(back);
  const stem = roundedBox(
    0.1,
    0.6,
    0.1,
    new THREE.MeshStandardMaterial({
      color: 0x9aa4ad,
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  stem.position.y = 0.31;
  chair.add(stem);
  group.add(chair);

  if (label) {
    const tag = makeTextSprite(label);
    tag.position.set(0, 2.18, 0);
    tag.scale.set(1.45, 0.36, 1);
    group.add(tag);
  }

  group.userData.type = "desk";
  scene.add(group);
  return group;
}

function addMeetingChair(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x536b7c,
    roughness: 0.6,
  });
  const seat = roundedBox(0.82, 0.18, 0.82, seatMat);
  seat.position.y = 0.62;
  group.add(seat);
  const back = roundedBox(0.78, 0.95, 0.15, seatMat);
  back.position.set(0, 1.04, -0.32);
  group.add(back);
  const leg = roundedBox(
    0.1,
    0.62,
    0.1,
    new THREE.MeshStandardMaterial({
      color: 0x9aa4ad,
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  leg.position.y = 0.31;
  group.add(leg);
  scene.add(group);
}

function buildDoor(
  scene: THREE.Scene,
  room: RoomData,
  wallH: number,
  thickness: number,
) {
  const group = new THREE.Group();
  const doorW = Math.min(1.25, room.w * 0.34);
  const doorH = 2.05;
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x6f5948,
    roughness: 0.55,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa8c4ce,
    transparent: true,
    opacity: 0.58,
    roughness: 0.2,
    metalness: 0.1,
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x8b6d52,
    roughness: 0.6,
  });

  const hinge = new THREE.Group();
  const panel = roundedBox(doorW, doorH, 0.07, panelMat);
  panel.position.set(doorW / 2, doorH / 2, 0);
  panel.castShadow = true;
  hinge.add(panel);

  const glass = roundedBox(doorW * 0.62, doorH * 0.52, 0.085, glassMat);
  glass.position.set(doorW / 2, doorH * 0.62, -0.045);
  hinge.add(glass);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd7b76d,
      metalness: 0.75,
      roughness: 0.2,
    }),
  );
  handle.position.set(doorW * 0.8, doorH * 0.48, -0.09);
  hinge.add(handle);

  const frameLeft = roundedBox(0.13, doorH + 0.16, 0.18, frameMat);
  const frameRight = roundedBox(0.13, doorH + 0.16, 0.18, frameMat);
  frameLeft.position.set(-0.08, doorH / 2, 0);
  frameRight.position.set(doorW + 0.08, doorH / 2, 0);
  group.add(frameLeft, frameRight);

  const top = roundedBox(doorW + 0.26, 0.13, 0.18, frameMat);
  top.position.set(doorW / 2, doorH + 0.08, 0);
  group.add(top);

  const frontZ = room.z + room.d / 2 + thickness * 0.55;
  const backZ = room.z - room.d / 2 - thickness * 0.55;
  const leftX = room.x - room.w / 2 - thickness * 0.55;
  const rightX = room.x + room.w / 2 + thickness * 0.55;

  if (room.doorSide === "front") {
    group.position.set(room.x + room.doorOffset - doorW / 2, 0, frontZ);
    hinge.position.set(0, 0, 0.02);
    group.add(hinge);
  } else if (room.doorSide === "back") {
    group.position.set(room.x + room.doorOffset + doorW / 2, 0, backZ);
    hinge.rotation.y = Math.PI;
    group.add(hinge);
  } else if (room.doorSide === "left") {
    group.position.set(leftX, 0, room.z + room.doorOffset + doorW / 2);
    hinge.rotation.y = -Math.PI / 2;
    group.add(hinge);
  } else {
    group.position.set(rightX, 0, room.z + room.doorOffset - doorW / 2);
    hinge.rotation.y = Math.PI / 2;
    group.add(hinge);
  }

  group.userData.room = room.name;
  group.userData.doorHinge = hinge;
  group.userData.closedRotation = hinge.rotation.y;
  group.userData.openRotation = hinge.rotation.y + (room.doorSide === "front" ? -Math.PI * 0.46 : Math.PI * 0.46);
  scene.add(group);
  return group;
}

function buildRoom(
  scene: THREE.Scene,
  room: RoomData,
  doorGroups: Map<OfficeRoom, THREE.Group>,
) {
  const mat = new THREE.MeshStandardMaterial({
    color: room.color,
    roughness: 0.8,
    metalness: 0.02,
  });

  const floor = roundedBox(room.w, 0.12, room.d, mat);
  floor.position.set(room.x, 0.06, room.z);
  floor.userData.room = room.name;
  floor.receiveShadow = true;
  scene.add(floor);

  // Open Office is intentionally a shared, open-plan zone.
  if (room.name !== "Open Office") {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd5c7b4,
      roughness: 0.85,
    });
    const wallH = 2.35;
    const thickness = 0.16;
    const doorW = Math.min(1.25, room.w * 0.34);
    const frontY = room.z + room.d / 2;
    const backY = room.z - room.d / 2;
    const leftX = room.x - room.w / 2;
    const rightX = room.x + room.w / 2;

    const addWallSegment = (
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

    if (room.doorSide === "front") {
      const halfGap = doorW / 2 + 0.02;
      const leftWidth = Math.max(0.2, room.w / 2 - halfGap);
      const rightWidth = leftWidth;
      addWallSegment(leftWidth, wallH, thickness, leftX + leftWidth / 2, wallH / 2, frontY);
      addWallSegment(rightWidth, wallH, thickness, rightX - rightWidth / 2, wallH / 2, frontY);
      addWallSegment(room.w, wallH, thickness, room.x, wallH / 2, backY);
      addWallSegment(thickness, wallH, room.d, leftX, wallH / 2, room.z);
      addWallSegment(thickness, wallH, room.d, rightX, wallH / 2, room.z);
    } else {
      addWallSegment(room.w, wallH, thickness, room.x, wallH / 2, frontY);
      addWallSegment(room.w, wallH, thickness, room.x, wallH / 2, backY);
      addWallSegment(thickness, wallH, room.d, leftX, wallH / 2, room.z);
      addWallSegment(thickness, wallH, room.d, rightX, wallH / 2, room.z);
    }

    const door = buildDoor(scene, room, wallH, thickness);
    doorGroups.set(room.name, door);

    const light = new THREE.PointLight(0xfff1cc, 0.38, 7);
    light.position.set(room.x, 2.1, room.z);
    scene.add(light);
  } else {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(room.w * 0.92, 0.03, room.d * 0.88),
      new THREE.MeshStandardMaterial({
        color: 0xcad6c7,
        roughness: 1,
        transparent: true,
        opacity: 0.72,
      }),
    );
    rug.position.set(room.x, 0.13, room.z);
    scene.add(rug);
  }

  const label = makeTextSprite(room.name, "#475569");
  label.position.set(
    room.x,
    2.78,
    room.z - room.d / 2 + 0.72,
  );
  label.scale.set(2.15, 0.5, 1);
  label.userData.room = room.name;
  scene.add(label);
}

function addManagerOffice(scene: THREE.Scene) {
  addDesk(scene, -8.1, -5.2, 0, "Manager");
  addDesk(scene, -6.45, -5.2, 0, "Manager");
}

function addDepartmentDesks(scene: THREE.Scene) {
  // Design Studio
  addDesk(scene, -8.1, 0.6, 0, "Design");
  addDesk(scene, -5.0, 0.6, 0, "Design");
  addDesk(scene, -8.1, 5.0, Math.PI, "Design");
  addDesk(scene, -5.0, 5.0, Math.PI, "Design");

  // Finance
  addDesk(scene, 0.1, 0.6, 0, "Finance");
  addDesk(scene, 2.5, 0.6, 0, "Finance");
  addDesk(scene, 0.1, 5.0, Math.PI, "Finance");
  addDesk(scene, 2.5, 5.0, Math.PI, "Finance");

  // Support
  addDesk(scene, 6.8, -5.9, 0, "Support");
  addDesk(scene, 8.6, -5.9, 0, "Support");
  addDesk(scene, 6.8, -2.6, Math.PI, "Support");
  addDesk(scene, 8.6, -2.6, Math.PI, "Support");

  // Open-plan area for Operations + Marketing.
  addDesk(scene, -0.9, -0.1, 0, "Open");
  addDesk(scene, 2.0, -0.1, 0, "Open");
  addDesk(scene, -0.9, 4.0, Math.PI, "Open");
  addDesk(scene, 2.0, 4.0, Math.PI, "Open");
}

function addMeetingSetup(scene: THREE.Scene) {
  const table = roundedBox(
    5.2,
    0.28,
    2.35,
    new THREE.MeshStandardMaterial({ color: 0x9a6848, roughness: 0.65 }),
  );
  table.position.set(0.25, 1.05, -5.95);
  table.castShadow = true;
  scene.add(table);

  [-2.0, -0.7, 0.7, 2.0].forEach((x) => {
    addMeetingChair(scene, 0.25 + x, -4.28, Math.PI);
    addMeetingChair(scene, 0.25 + x, -7.63, 0);
  });

  const board = roundedBox(
    3.4,
    1.45,
    0.08,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
    }),
  );
  board.position.set(2.7, 1.7, -8.45);
  scene.add(board);

  const boardText = makeTextSprite("TEAM PLAN", "#5d7990");
  boardText.position.set(2.7, 1.75, -8.52);
  boardText.scale.set(1.65, 0.42, 1);
  scene.add(boardText);
}

function addBreakSetup(scene: THREE.Scene) {
  const counter = roundedBox(
    3.25,
    0.8,
    0.55,
    new THREE.MeshStandardMaterial({ color: 0xc6b7a4, roughness: 0.8 }),
  );
  counter.position.set(7.8, 0.58, 1.0);
  scene.add(counter);

  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 0.18, 32),
    new THREE.MeshStandardMaterial({ color: 0x9b7556, roughness: 0.7 }),
  );
  table.position.set(7.8, 1.0, 5.2);
  scene.add(table);

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) =>
    addMeetingChair(
      scene,
      7.8 + Math.cos(a) * 1.85,
      5.2 + Math.sin(a) * 1.85,
      a,
    ),
  );

  const coffee = makeTextSprite("COFFEE", "#766454");
  coffee.position.set(7.9, 1.62, 0.65);
  coffee.scale.set(1.25, 0.32, 1);
  scene.add(coffee);
}

function addHuman(
  scene: THREE.Scene,
  person: Staff,
): Rig {
  const group = new THREE.Group();
  const p = worldFromPercent(person.x, person.y);
  group.position.set(p.x, 0, p.z);
  group.userData.staffId = person.id;

  const shirt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.color),
    roughness: 0.76,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: 0x344256,
    roughness: 0.82,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: FACE_TONES[Math.abs(person.id) % FACE_TONES.length],
    roughness: 0.8,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: HAIR_TONES[Math.abs(person.id * 3) % HAIR_TONES.length],
    roughness: 0.9,
  });
  const shoe = new THREE.MeshStandardMaterial({
    color: SHOE_TONES[Math.abs(person.id * 5) % SHOE_TONES.length],
    roughness: 0.7,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1b1720,
    roughness: 0.55,
  });
  const lipMat = new THREE.MeshStandardMaterial({
    color: 0x7a3e3a,
    roughness: 0.75,
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.57, 28),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.17,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const hips = new THREE.Group();
  hips.position.y = 0.9;
  group.add(hips);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.62, 6, 12),
    shirt,
  );
  torso.position.y = 1.38;
  torso.castShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.16, 10),
    skin,
  );
  neck.position.y = 1.86;
  group.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 20, 16),
    skin,
  );
  head.scale.set(0.95, 1.08, 0.9);
  head.position.y = 2.23;
  head.castShadow = true;
  group.add(head);

  // Hair cap + front hairline gives each Sim-like person a readable silhouette.
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.385,
      20,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52,
    ),
    hair,
  );
  hairCap.position.set(0, 2.34, 0);
  hairCap.scale.set(1, 0.9, 0.96);
  group.add(hairCap);

  for (const sx of [-0.19, -0.07, 0.07, 0.19]) {
    const strand = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      hair,
    );
    strand.scale.set(1, 1.4, 0.8);
    strand.position.set(sx, 2.34, 0.28);
    group.add(strand);
  }

  const earL = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 12, 10),
    skin,
  );
  const earR = earL.clone();
  earL.position.set(-0.34, 2.23, 0);
  earR.position.set(0.34, 2.23, 0);
  group.add(earL, earR);

  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.046, 12, 10),
    eyeMat,
  );
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.135, 2.25, 0.335);
  eyeR.position.set(0.135, 2.25, 0.335);
  group.add(eyeL, eyeR);

  const browMat = new THREE.MeshStandardMaterial({
    color: 0x48342d,
    roughness: 0.9,
  });
  for (const [x, rot] of [
    [-0.13, 0.1],
    [0.13, -0.1],
  ] as const) {
    const brow = roundedBox(0.105, 0.025, 0.02, browMat);
    brow.position.set(x, 2.36, 0.33);
    brow.rotation.z = rot;
    group.add(brow);
  }

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.11, 8),
    skin,
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.17, 0.36);
  group.add(nose);

  const mouth = roundedBox(0.11, 0.028, 0.018, lipMat);
  mouth.position.set(0, 2.05, 0.34);
  group.add(mouth);

  // A subtle collar makes the body read as clothing rather than a single capsule.
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.035, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0xdce5ef,
      roughness: 0.65,
    }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.75;
  group.add(collar);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.43, 1.52, 0);
  const upperArmL = capsule(0.105, 0.48, shirt);
  upperArmL.position.y = -0.26;
  const foreArmL = capsule(0.09, 0.42, shirt);
  foreArmL.position.y = -0.67;
  leftArm.add(upperArmL, foreArmL);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.43, 1.52, 0);
  const upperArmR = capsule(0.105, 0.48, shirt);
  upperArmR.position.y = -0.26;
  const foreArmR = capsule(0.09, 0.42, shirt);
  foreArmR.position.y = -0.67;
  rightArm.add(upperArmR, foreArmR);
  group.add(rightArm);

  const handL = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 12, 10),
    skin,
  );
  const handR = handL.clone();
  handL.position.set(-0.43, 0.84, 0);
  handR.position.set(0.43, 0.84, 0);
  group.add(handL, handR);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.92, 0);
  const thighL = capsule(0.12, 0.44, pants);
  thighL.position.y = -0.25;
  const shinL = capsule(0.095, 0.38, pants);
  shinL.position.y = -0.67;
  const shoeL = roundedBox(0.24, 0.13, 0.46, shoe);
  shoeL.position.set(0, -0.95, 0.11);
  leftLeg.add(thighL, shinL, shoeL);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.92, 0);
  const thighR = capsule(0.12, 0.44, pants);
  thighR.position.y = -0.25;
  const shinR = capsule(0.095, 0.38, pants);
  shinR.position.y = -0.67;
  const shoeR = roundedBox(0.24, 0.13, 0.46, shoe);
  shoeR.position.set(0, -0.95, 0.11);
  rightLeg.add(thighR, shinR, shoeR);
  group.add(rightLeg);

  const label = makeTextSprite(person.name.split(" ")[0]);
  label.position.y = 2.95;
  label.scale.set(1.8, 0.45, 1);
  group.add(label);

  const rank = /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i.test(person.role);
  if (rank) {
    const leaderTag = makeTextSprite("LEAD", "#72521d");
    leaderTag.scale.set(0.82, 0.24, 1);
    leaderTag.position.set(0, 2.74, 0.02);
    group.add(leaderTag);
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(group);

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftLowerLeg: shinL instanceof THREE.Object3D ? (leftLeg.children[1] as THREE.Group) : leftLeg,
    rightLowerLeg: shinR instanceof THREE.Object3D ? (rightLeg.children[1] as THREE.Group) : rightLeg,
    torso,
    head,
    eyes: [eyeL, eyeR],
    hands: [handL, handR],
  };
}

function applyPose(rig: Rig, person: Staff, time: number) {
  const walking = Boolean(person.walking);
  const working = person.status === "Working" && !walking;
  const meeting = person.status === "Meeting" && !walking;
  const breakState = person.status === "Break" && !walking;
  const walk = walking ? Math.sin(time * 9 + person.id * 0.65) : 0;

  // Natural whole-body idle motion.
  rig.torso.position.y = 1.38 + (working ? Math.sin(time * 2.1 + person.id) * 0.012 : 0);
  rig.head.position.y = 2.23 + Math.sin(time * 1.75 + person.id) * 0.008;

  if (walking) {
    rig.leftArm.rotation.z = -0.2 + walk * 0.58;
    rig.rightArm.rotation.z = 0.2 - walk * 0.58;
    rig.leftLeg.rotation.x = walk * 0.62;
    rig.rightLeg.rotation.x = -walk * 0.62;
    rig.leftLowerLeg.rotation.x = Math.max(0, -walk) * 0.34;
    rig.rightLowerLeg.rotation.x = Math.max(0, walk) * 0.34;
    rig.hands[0].position.y = 0.84;
    rig.hands[1].position.y = 0.84;
    rig.group.position.y = 0.03 + Math.abs(Math.sin(time * 9 + person.id)) * 0.025;
    rig.torso.rotation.z = walk * 0.025;
    rig.head.rotation.z = walk * 0.018;
    return;
  }

  rig.group.position.y = 0;
  rig.torso.rotation.z = 0;
  rig.head.rotation.z = 0;

  if (working) {
    // Sit naturally in the work chair, lean toward the monitor, and "type".
    rig.torso.position.y = 1.33;
    rig.torso.rotation.x = 0.06;
    rig.head.position.y = 2.18;
    rig.head.rotation.x = 0.05;
    rig.leftArm.rotation.z = -0.66;
    rig.rightArm.rotation.z = 0.66;
    rig.hands[0].position.set(-0.25, 1.21, 0.24);
    rig.hands[1].position.set(0.25, 1.21, 0.24);
    rig.leftLeg.rotation.x = -0.95;
    rig.rightLeg.rotation.x = -0.95;
    rig.leftLowerLeg.rotation.x = 1.22;
    rig.rightLowerLeg.rotation.x = 1.22;
    rig.leftLeg.position.z = 0.03;
    rig.rightLeg.position.z = 0.03;
    rig.leftLeg.position.y = 0.96;
    rig.rightLeg.position.y = 0.96;
    rig.leftArm.children[1].rotation.x = -0.45 + Math.sin(time * 6 + person.id) * 0.08;
    rig.rightArm.children[1].rotation.x = -0.45 + Math.cos(time * 6 + person.id) * 0.08;
    return;
  }

  if (meeting) {
    rig.torso.rotation.x = 0;
    rig.head.rotation.x = 0;
    rig.leftArm.rotation.z = -0.35 + Math.sin(time * 2.5 + person.id) * 0.05;
    rig.rightArm.rotation.z = 0.35 - Math.sin(time * 2.5 + person.id) * 0.05;
    rig.hands[0].position.set(-0.34, 0.88, 0.02);
    rig.hands[1].position.set(0.34, 0.88, 0.02);
    rig.leftLeg.rotation.x = -0.85;
    rig.rightLeg.rotation.x = -0.85;
    rig.leftLowerLeg.rotation.x = 1.16;
    rig.rightLowerLeg.rotation.x = 1.16;
    return;
  }

  if (breakState) {
    rig.torso.rotation.x = 0.02;
    rig.leftArm.rotation.z = -0.18;
    rig.rightArm.rotation.z = 0.18;
    rig.hands[0].position.y = 0.96;
    rig.hands[1].position.y = 0.96;
    rig.leftLeg.rotation.x = -0.7;
    rig.rightLeg.rotation.x = -0.7;
    rig.leftLowerLeg.rotation.x = 0.95;
    rig.rightLowerLeg.rotation.x = 0.95;
    return;
  }

  // Away / fallback standing pose.
  rig.torso.rotation.x = 0;
  rig.leftArm.rotation.z = -0.08;
  rig.rightArm.rotation.z = 0.08;
  rig.leftLeg.rotation.x = 0;
  rig.rightLeg.rotation.x = 0;
  rig.leftLowerLeg.rotation.x = 0;
  rig.rightLowerLeg.rotation.x = 0;
}

function distanceToPoint(
  person: { x: number; y: number },
  point: { x: number; y: number },
) {
  return Math.hypot(person.x - point.x, person.y - point.y);
}

function roomDoorPercent(room: OfficeRoom) {
  const map: Record<OfficeRoom, { x: number; y: number }> = {
    Reception: { x: 50, y: 91 },
    "Manager Office": { x: 16.5, y: 33 },
    "Meeting Room": { x: 51, y: 33 },
    "Design Studio": { x: 22, y: 67 },
    Finance: { x: 56.5, y: 67 },
    Support: { x: 84.5, y: 49 },
    "Break Room": { x: 84.5, y: 97 },
    "Open Office": { x: 52, y: 34 },
  };
  return map[room];
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
    scene.fog = new THREE.Fog(0xdce8e5, 30, 52);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(18.5, 19.5, 22.5);

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
    controls.minDistance = 9;
    controls.maxDistance = 38;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.28;
    controls.target.set(0, 0, 1.1);

    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x6f776e, 2.25));
    const sun = new THREE.DirectionalLight(0xfff3d2, 3.0);
    sun.position.set(-8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    scene.add(sun);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(25, 0.4, 22),
      new THREE.MeshStandardMaterial({
        color: 0xb69b7e,
        roughness: 0.9,
      }),
    );
    base.position.y = -0.22;
    base.receiveShadow = true;
    scene.add(base);

    const doorGroups = new Map<OfficeRoom, THREE.Group>();
    ROOM_DATA.forEach((room) => buildRoom(scene, room, doorGroups));

    addManagerOffice(scene);
    addDepartmentDesks(scene);
    addMeetingSetup(scene);
    addBreakSetup(scene);

    const staffGroups = new Map<number, Rig>();
    staffRef.current.forEach((person) => {
      staffGroups.set(person.id, addHuman(scene, person));
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0 };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (
        Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 8
      ) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj && !obj.userData.staffId && !obj.userData.room) {
          obj = obj.parent;
        }
        if (obj?.userData.staffId) {
          const person = staffRef.current.find(
            (item) => item.id === obj!.userData.staffId,
          );
          if (person) onSelectRef.current(person);
          return;
        }
        if (obj?.userData.room && onRoomSelectRef.current) {
          onRoomSelectRef.current(obj.userData.room as OfficeRoom);
          return;
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const clock = new THREE.Clock();
    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      controls.update();

      staffRef.current.forEach((person) => {
        let rig = staffGroups.get(person.id);
        if (!rig) {
          rig = addHuman(scene, person);
          staffGroups.set(person.id, rig);
        }

        const target = worldFromPercent(person.x, person.y);
        const current = rig.group.position;
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        const distance = Math.hypot(dx, dz);
        const speed = person.walking ? 2.25 : 5.8;

        if (runningRef.current && distance > 0.006) {
          const step = Math.min(1, delta * speed);
          current.x += dx * step;
          current.z += dz * step;

          const desired = Math.atan2(dx, dz);
          let angle = desired - rig.group.rotation.y;
          angle = Math.atan2(Math.sin(angle), Math.cos(angle));
          rig.group.rotation.y += angle * Math.min(1, delta * 9);
        }

        applyPose(rig, person, elapsed);

        // Office doors open as a staff member approaches or when the room is selected.
        doorGroups.forEach((door, room) => {
          const dp = roomDoorPercent(room);
          const d = distanceToPoint(person, dp);
          const shouldOpen =
            d < 3.2 ||
            selectedRoomRef.current === room;
          const hinge = door.userData.doorHinge as THREE.Group;
          const closed = Number(door.userData.closedRotation);
          const open = Number(door.userData.openRotation);
          const targetRotation = shouldOpen ? open : closed;
          hinge.rotation.y +=
            (targetRotation - hinge.rotation.y) * Math.min(1, delta * 8);
        });
      });

      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = () => {
      animate();
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
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((material) => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="office-3d-viewer"
      aria-label="Interactive 3D virtual office. Drag to rotate, pinch or scroll to zoom. Tap staff or rooms."
    >
      <div className="office-3d-help">
        <strong>3D Office</strong>
        <span>Drag to rotate · Pinch/scroll to zoom · Tap staff or rooms</span>
      </div>
      <div className="office-3d-badge">REAL-TIME 3D</div>
    </div>
  );
}

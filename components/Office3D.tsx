"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { deskSpots, type OfficeRoom } from "../lib/office-sim";

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
  name: Exclude<OfficeRoom, "Reception">;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  door: { x: number; y: number; side: "top" | "bottom" };
};

type HumanRig = {
  group: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftUpperLeg: THREE.Group;
  rightUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  hands: THREE.Mesh[];
};

const ROOM_DATA: RoomData[] = [
  {
    name: "Manager Office",
    x: 4,
    y: 4,
    w: 25,
    h: 29,
    color: 0xe9dfcf,
    door: { x: 16, y: 33, side: "bottom" },
  },
  {
    name: "Meeting Room",
    x: 32,
    y: 4,
    w: 37,
    h: 29,
    color: 0xe2ecea,
    door: { x: 51, y: 33, side: "bottom" },
  },
  {
    name: "Support",
    x: 72,
    y: 4,
    w: 25,
    h: 41,
    color: 0xdcebed,
    door: { x: 84, y: 45, side: "bottom" },
  },
  {
    name: "Design Studio",
    x: 4,
    y: 45,
    w: 36,
    h: 50,
    color: 0xeee8f5,
    door: { x: 22, y: 45, side: "top" },
  },
  {
    name: "Finance",
    x: 41,
    y: 45,
    w: 28,
    h: 50,
    color: 0xe8e6df,
    door: { x: 56, y: 45, side: "top" },
  },
  {
    name: "Open Office",
    x: 70,
    y: 45,
    w: 27,
    h: 28,
    color: 0xe4ede3,
    door: { x: 77, y: 45, side: "top" },
  },
  {
    name: "Break Room",
    x: 70,
    y: 73,
    w: 27,
    h: 22,
    color: 0xf1eadf,
    door: { x: 84, y: 73, side: "top" },
  },
];

const FACE_TONES = [0xf2c5a3, 0xdca27f, 0xb87953, 0x925b43, 0x704437];
const HAIR_TONES = [0x221b1a, 0x3b2b25, 0x161a20, 0x35231e, 0x24191a];
const PANTS_TONES = [0x283746, 0x3b4554, 0x252c35, 0x4a3b36];
const SHOE_TONES = [0x171b21, 0x222a34, 0x30343a];

function worldFromPercent(x: number, y: number) {
  return {
    x: (x / 100) * 22 - 11,
    z: (y / 100) * 19 - 9.5,
  };
}

function percentFromWorld(x: number, z: number) {
  return {
    x: ((x + 11) / 22) * 100,
    y: ((z + 9.5) / 19) * 100,
  };
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

function capsule(
  radius: number,
  length: number,
  material: THREE.Material,
) {
  return new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 5, 10),
    material,
  );
}

function labelSprite(text: string, color = "#465767") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Group();

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.roundRect(10, 25, 492, 76, 22);
  ctx.fill();
  ctx.font = "800 32px Arial";
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
  sprite.scale.set(2.05, 0.48, 1);
  return sprite;
}

function addPlant(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.31, 0.4, 16),
    new THREE.MeshStandardMaterial({ color: 0xb87452, roughness: 0.8 }),
  );
  pot.position.y = 0.2;
  group.add(pot);

  const leaves = new THREE.MeshStandardMaterial({
    color: 0x3d7a51,
    roughness: 0.86,
  });

  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      leaves,
    );
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(
      Math.cos(a) * 0.17,
      0.57 + (i % 2) * 0.1,
      Math.sin(a) * 0.17,
    );
    leaf.scale.set(0.7, 1.55, 0.7);
    group.add(leaf);
  }

  scene.add(group);
}

function addDesk(
  scene: THREE.Scene,
  seatX: number,
  seatZ: number,
  rotation = 0,
) {
  const group = new THREE.Group();

  // The seat point is the employee's exact chair centre.
  // The desk is placed in front of the employee, never behind them.
  const facing = new THREE.Vector3(
    Math.sin(rotation),
    0,
    Math.cos(rotation),
  );

  group.position.set(
    seatX + facing.x * 0.98,
    0,
    seatZ + facing.z * 0.98,
  );
  group.rotation.y = rotation;

  const wood = new THREE.MeshStandardMaterial({
    color: 0xa36d48,
    roughness: 0.63,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xaeb9c2,
    metalness: 0.72,
    roughness: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1e2730,
    roughness: 0.34,
  });
  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x41586d,
    roughness: 0.68,
  });

  const top = roundedBox(2.18, 0.18, 1.08, wood);
  top.position.y = 1.2;
  top.castShadow = true;
  group.add(top);

  for (const px of [-0.78, 0.78]) {
    const leg = roundedBox(0.11, 1.12, 0.11, metal);
    leg.position.set(px, 0.55, 0.35);
    leg.castShadow = true;
    group.add(leg);
  }

  const monitor = roundedBox(0.8, 0.5, 0.08, dark);
  monitor.position.set(0, 1.56, -0.18);
  group.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0x8bbdca,
      emissive: 0x16333b,
      emissiveIntensity: 0.44,
      side: THREE.DoubleSide,
    }),
  );
  screen.position.set(0, 1.56, -0.23);
  screen.rotation.y = Math.PI;
  group.add(screen);

  const keyboard = roundedBox(0.74, 0.045, 0.25, metal);
  keyboard.position.set(0, 1.37, 0.18);
  group.add(keyboard);

  // Chair is behind the desk and exactly under the employee's seat point.
  const chair = new THREE.Group();
  chair.position.set(0, 0, -0.98);

  const seat = roundedBox(0.8, 0.17, 0.8, chairMat);
  seat.position.y = 0.62;
  chair.add(seat);

  const back = roundedBox(0.78, 0.92, 0.14, chairMat);
  back.position.set(0, 1.03, -0.29);
  chair.add(back);

  const stem = roundedBox(0.09, 0.56, 0.09, metal);
  stem.position.y = 0.3;
  chair.add(stem);

  const star = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.48, 0.05, 12),
    metal,
  );
  star.position.y = 0.04;
  chair.add(star);
  group.add(chair);

  group.userData.type = "desk";
  scene.add(group);
}

function addDoor(scene: THREE.Scene, room: RoomData) {
  const group = new THREE.Group();
  const hinge = new THREE.Group();
  const width = Math.min(1.28, (room.w / 100) * 22 * 0.34);
  const height = 2.08;

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x735d4b,
    roughness: 0.56,
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x966f51,
    roughness: 0.58,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa9ccd5,
    transparent: true,
    opacity: 0.54,
    roughness: 0.2,
    metalness: 0.12,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd5b36d,
    metalness: 0.8,
    roughness: 0.18,
  });

  const panel = roundedBox(width, height, 0.08, panelMat);
  panel.position.set(width / 2, height / 2, 0);
  panel.castShadow = true;
  hinge.add(panel);

  const glass = roundedBox(width * 0.55, height * 0.42, 0.09, glassMat);
  glass.position.set(width / 2, height * 0.66, -0.05);
  hinge.add(glass);

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    gold,
  );
  knob.position.set(width * 0.82, height * 0.48, -0.09);
  hinge.add(knob);

  const leftPost = roundedBox(0.13, height + 0.18, 0.2, frameMat);
  leftPost.position.set(-0.08, height / 2, 0);
  const rightPost = roundedBox(0.13, height + 0.18, 0.2, frameMat);
  rightPost.position.set(width + 0.08, height / 2, 0);
  group.add(leftPost, rightPost);

  const lintel = roundedBox(width + 0.3, 0.13, 0.2, frameMat);
  lintel.position.set(width / 2, height + 0.08, 0);
  group.add(lintel);

  const wp = worldFromPercent(room.door.x, room.door.y);
  if (room.door.side === "bottom") {
    group.position.set(wp.x - width / 2, 0, wp.z + 0.02);
  } else {
    group.position.set(wp.x - width / 2, 0, wp.z - 0.02);
    hinge.rotation.y = Math.PI;
  }

  group.add(hinge);
  const wayfinding = labelSprite("ENTRY / EXIT", "#365267");
  wayfinding.position.set(width / 2, height + 0.46, 0.03);
  wayfinding.scale.set(0.74, 0.17, 1);
  group.add(wayfinding);
  group.userData.room = room.name;
  group.userData.hinge = hinge;
  group.userData.closed = hinge.rotation.y;
  group.userData.open =
    hinge.rotation.y +
    (room.door.side === "bottom" ? -Math.PI * 0.5 : Math.PI * 0.5);

  scene.add(group);
  return group;
}

function addLobbyAndWayfinding(scene: THREE.Scene) {
  const entrance = worldFromPercent(50, 96);
  const welcome = labelSprite("OFFICEHUB  •  MAIN ENTRANCE", "#1e3a4a");
  welcome.position.set(entrance.x, 2.75, entrance.z);
  welcome.scale.set(2.7, 0.48, 1);
  scene.add(welcome);

  const mat = new THREE.MeshStandardMaterial({ color: 0x31526a, roughness: 0.28, metalness: 0.34 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9bc9d8, transparent: true, opacity: 0.58, roughness: 0.14, metalness: 0.08 });
  const frame = new THREE.Group();
  frame.position.set(entrance.x, 0, entrance.z - 0.12);
  const postLeft = roundedBox(0.13, 2.35, 0.14, mat);
  postLeft.position.set(-1.02, 1.17, 0);
  const postRight = postLeft.clone();
  postRight.position.x = 1.02;
  const lintel = roundedBox(2.16, 0.14, 0.14, mat);
  lintel.position.set(0, 2.3, 0);
  frame.add(postLeft, postRight, lintel);
  for (const x of [-0.5, 0.5]) {
    const panel = roundedBox(0.9, 2.1, 0.06, glass);
    panel.position.set(x, 1.05, 0);
    frame.add(panel);
  }
  scene.add(frame);

  const carpet = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.018, 1.55),
    new THREE.MeshStandardMaterial({ color: 0x34546b, roughness: 0.9 }),
  );
  carpet.position.set(entrance.x, 0.075, entrance.z - 0.84);
  scene.add(carpet);
}

function addRoom(
  scene: THREE.Scene,
  room: RoomData,
  doors: Map<OfficeRoom, THREE.Group>,
) {
  const topLeft = worldFromPercent(room.x, room.y);
  const bottomRight = worldFromPercent(
    room.x + room.w,
    room.y + room.h,
  );
  const center = worldFromPercent(
    room.x + room.w / 2,
    room.y + room.h / 2,
  );

  const roomW = bottomRight.x - topLeft.x;
  const roomD = bottomRight.z - topLeft.z;

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.12, roomD),
    new THREE.MeshStandardMaterial({
      color: room.color,
      roughness: 0.84,
    }),
  );
  floor.position.set(center.x, 0.06, center.z);
  floor.receiveShadow = true;
  floor.userData.room = room.name;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd0c5b7,
    roughness: 0.88,
  });
  const wallH = 2.5;
  const wallT = 0.16;

  const addWall = (
    w: number,
    h: number,
    d: number,
    x: number,
    z: number,
  ) => {
    const wall = roundedBox(w, h, d, wallMat);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  };

  const leftX = topLeft.x;
  const rightX = bottomRight.x;
  const topZ = topLeft.z;
  const bottomZ = bottomRight.z;
  const doorPoint = worldFromPercent(room.door.x, room.door.y);
  const doorW = Math.min(1.28, roomW * 0.3);
  const gap = doorW + 0.04;

  if (room.door.side === "bottom") {
    const leftWidth = Math.max(0.25, doorPoint.x - leftX - gap / 2);
    const rightWidth = Math.max(0.25, rightX - doorPoint.x - gap / 2);
    addWall(leftWidth, wallH, wallT, leftX + leftWidth / 2, bottomZ);
    addWall(rightWidth, wallH, wallT, rightX - rightWidth / 2, bottomZ);
    addWall(roomW, wallH, wallT, center.x, topZ);

    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 1.05, 0.035, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xb7a28a, roughness: 0.84 }),
    );
    threshold.position.set(doorPoint.x, 0.075, bottomZ + 0.12);
    scene.add(threshold);
  } else {
    const leftWidth = Math.max(0.25, doorPoint.x - leftX - gap / 2);
    const rightWidth = Math.max(0.25, rightX - doorPoint.x - gap / 2);
    addWall(leftWidth, wallH, wallT, leftX + leftWidth / 2, topZ);
    addWall(rightWidth, wallH, wallT, rightX - rightWidth / 2, topZ);
    addWall(roomW, wallH, wallT, center.x, bottomZ);

    const threshold = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 1.05, 0.035, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xb7a28a, roughness: 0.84 }),
    );
    threshold.position.set(doorPoint.x, 0.075, topZ - 0.12);
    scene.add(threshold);
  }

  addWall(wallT, wallH, roomD, leftX, center.z);
  addWall(wallT, wallH, roomD, rightX, center.z);

  const windowZ =
    room.door.side === "bottom" ? topZ + 0.08 : bottomZ - 0.08;
  const window = roundedBox(
    Math.min(roomW * 0.46, 2.4),
    0.72,
    0.05,
    new THREE.MeshStandardMaterial({
      color: 0xc6e1e7,
      transparent: true,
      opacity: 0.5,
      roughness: 0.22,
      metalness: 0.12,
    }),
  );
  window.position.set(center.x, 1.8, windowZ);
  scene.add(window);

  const tag = labelSprite(room.name);
  tag.position.set(center.x, 2.78, room.door.side === "bottom" ? topZ + 0.65 : bottomZ - 0.65);
  scene.add(tag);

  const light = new THREE.PointLight(0xfff2d1, 0.4, 8);
  light.position.set(center.x, 2.25, center.z);
  scene.add(light);

  doors.set(room.name, addDoor(scene, room));
}

function addOfficeFurniture(scene: THREE.Scene) {
  const placeDesks = (room: OfficeRoom) => {
    for (const point of deskSpots[room]) {
      const p = worldFromPercent(point.x, point.y);
      addDesk(scene, p.x, p.z, 0);
    }
  };

  placeDesks("Manager Office");
  placeDesks("Design Studio");
  placeDesks("Finance");
  placeDesks("Support");
  placeDesks("Open Office");
  // Break Room is intentionally not a workstation room.
}

function addMeetingAndBreakFurniture(scene: THREE.Scene) {
  const meetingCenter = worldFromPercent(51, 19);

  const table = roundedBox(
    5.1,
    0.28,
    2.25,
    new THREE.MeshStandardMaterial({
      color: 0x9c6849,
      roughness: 0.66,
    }),
  );
  table.position.set(meetingCenter.x, 1.04, meetingCenter.z);
  table.castShadow = true;
  scene.add(table);

  // Six physical meeting chairs for six staff. These coordinates are exactly
  // the same coordinates returned by activitySpotForStaff("Meeting").
  for (const seat of deskSpots["Meeting Room"]) {
    const p = worldFromPercent(seat.x, seat.y);
    const facing = Math.atan2(
      meetingCenter.x - p.x,
      meetingCenter.z - p.z,
    );
    addMeetingChair(scene, p.x, p.z, facing);
  }

  const board = roundedBox(
    2.8,
    1.25,
    0.08,
    new THREE.MeshStandardMaterial({
      color: 0xf9fafb,
      roughness: 0.44,
    }),
  );
  const boardPoint = worldFromPercent(63, 8);
  board.position.set(boardPoint.x, 1.62, boardPoint.z);
  scene.add(board);

  const boardText = labelSprite("TEAM PLAN", "#687f93");
  boardText.position.set(boardPoint.x, 1.66, boardPoint.z - 0.05);
  boardText.scale.set(1.28, 0.34, 1);
  scene.add(boardText);

  const breakCenter = worldFromPercent(84.25, 84.5);
  const roundTable = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.15, 0.18, 32),
    new THREE.MeshStandardMaterial({
      color: 0x9b7556,
      roughness: 0.72,
    }),
  );
  roundTable.position.set(breakCenter.x, 1.0, breakCenter.z);
  roundTable.castShadow = true;
  scene.add(roundTable);

  for (const seat of deskSpots["Break Room"]) {
    const p = worldFromPercent(seat.x, seat.y);
    const facing = Math.atan2(
      breakCenter.x - p.x,
      breakCenter.z - p.z,
    );
    addMeetingChair(scene, p.x, p.z, facing);
  }

  const counter = roundedBox(
    2.6,
    0.75,
    0.52,
    new THREE.MeshStandardMaterial({
      color: 0xc4b5a2,
      roughness: 0.82,
    }),
  );
  const counterPoint = worldFromPercent(74, 81);
  counter.position.set(counterPoint.x, 0.54, counterPoint.z);
  scene.add(counter);
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

  const mat = new THREE.MeshStandardMaterial({
    color: 0x506a7d,
    roughness: 0.66,
  });
  const seat = roundedBox(0.78, 0.18, 0.78, mat);
  seat.position.y = 0.62;
  group.add(seat);
  const back = roundedBox(0.76, 0.9, 0.14, mat);
  back.position.set(0, 1.0, -0.3);
  group.add(back);
  const leg = roundedBox(
    0.09,
    0.58,
    0.09,
    new THREE.MeshStandardMaterial({
      color: 0x9aa6af,
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  leg.position.y = 0.3;
  group.add(leg);
  scene.add(group);
}

function addHuman(
  scene: THREE.Scene,
  person: Staff,
): HumanRig {
  const group = new THREE.Group();
  const p = worldFromPercent(person.x, person.y);
  group.position.set(p.x, 0, p.z);
  group.userData.staffId = person.id;

  const skin = new THREE.MeshStandardMaterial({
    color: FACE_TONES[Math.abs(person.id) % FACE_TONES.length],
    roughness: 0.8,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: HAIR_TONES[Math.abs(person.id * 3) % HAIR_TONES.length],
    roughness: 0.9,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.color).lerp(new THREE.Color(0x1f2c3a), 0.45),
    roughness: 0.74,
  });
  const pants = new THREE.MeshStandardMaterial({
    color: PANTS_TONES[Math.abs(person.id) % PANTS_TONES.length],
    roughness: 0.84,
  });
  const shoes = new THREE.MeshStandardMaterial({
    color: SHOE_TONES[Math.abs(person.id) % SHOE_TONES.length],
    roughness: 0.74,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xf6f6f1,
    roughness: 0.45,
  });
  const pupil = new THREE.MeshStandardMaterial({
    color: 0x17161a,
    roughness: 0.5,
  });
  const lip = new THREE.MeshStandardMaterial({
    color: 0x824a47,
    roughness: 0.76,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x47342d,
    roughness: 0.9,
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.15,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.014;
  group.add(shadow);

  const hips = roundedBox(
    0.55,
    0.32,
    0.32,
    new THREE.MeshStandardMaterial({
      color: pants.color,
      roughness: 0.84,
    }),
  );
  hips.position.set(0, 0.86, 0);
  group.add(hips);

  const torso = capsule(0.39, 0.56, shirt);
  torso.position.y = 1.36;
  torso.scale.set(1.04, 1.05, 0.88);
  torso.castShadow = true;
  group.add(torso);

  // A consistent business wardrobe: jacket, shirt panel and tie/lanyard make
  // every avatar read as a real team member rather than a moving marker.
  const shirtFront = roundedBox(0.18, 0.44, 0.035, new THREE.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.7 }));
  shirtFront.position.set(0, 1.36, 0.35);
  group.add(shirtFront);
  const lapelMaterial = new THREE.MeshStandardMaterial({ color: shirt.color, roughness: 0.62 });
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.33, 3), lapelMaterial);
    lapel.position.set(side * 0.16, 1.48, 0.36);
    lapel.rotation.z = side * 0.58;
    lapel.rotation.x = Math.PI / 2;
    group.add(lapel);
  }
  const tie = roundedBox(0.06, 0.27, 0.025, new THREE.MeshStandardMaterial({ color: Math.abs(person.id) % 2 ? 0x9c3043 : 0x315d8c, roughness: 0.64 }));
  tie.position.set(0, 1.38, 0.39);
  group.add(tie);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.16, 12),
    skin,
  );
  neck.position.y = 1.86;
  group.add(neck);

  const head = new THREE.Group();
  head.position.y = 2.2;
  group.add(head);

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.37, 24, 18),
    skin,
  );
  face.scale.set(0.95, 1.06, 0.92);
  face.castShadow = true;
  head.add(face);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.385,
      24,
      14,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.52,
    ),
    hair,
  );
  cap.scale.set(1.01, 0.9, 0.97);
  cap.position.y = 0.12;
  head.add(cap);

  const style = Math.abs(person.id) % 4;
  const fringeCount = style === 0 ? 4 : style === 1 ? 3 : 2;
  for (let i = 0; i < fringeCount; i += 1) {
    const fringe = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 11, 9),
      hair,
    );
    fringe.scale.set(0.95, 1.35, 0.78);
    fringe.position.set(
      (i - (fringeCount - 1) / 2) * 0.13,
      0.1 + (i % 2) * 0.025,
      0.29,
    );
    head.add(fringe);
  }

  for (const sx of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.064, 14, 12),
      eyeWhite,
    );
    eye.scale.set(1, 0.82, 0.62);
    eye.position.set(sx, 0.03, 0.335);
    head.add(eye);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 10, 8),
      pupil,
    );
    ball.position.set(sx, 0.03, 0.38);
    head.add(ball);
  }

  for (const [x, rot] of [
    [-0.14, 0.1],
    [0.14, -0.1],
  ] as const) {
    const brow = roundedBox(0.13, 0.024, 0.018, browMat);
    brow.position.set(x, 0.14, 0.33);
    brow.rotation.z = rot;
    head.add(brow);
  }

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.047, 0.12, 8),
    skin,
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.05, 0.36);
  head.add(nose);

  const mouth = roundedBox(0.12, 0.026, 0.018, lip);
  mouth.position.set(0, -0.18, 0.345);
  head.add(mouth);

  if (Math.abs(person.id) % 3 === 0) {
    const glasses = new THREE.MeshStandardMaterial({ color: 0x263640, metalness: 0.6, roughness: 0.24 });
    for (const x of [-0.14, 0.14]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.012, 6, 12), glasses);
      lens.position.set(x, 0.03, 0.385);
      head.add(lens);
    }
    const bridge = roundedBox(0.12, 0.018, 0.018, glasses);
    bridge.position.set(0, 0.03, 0.385);
    head.add(bridge);
  }

  if (style === 3) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), hair);
    bun.position.set(0.2, 0.18, -0.27);
    head.add(bun);
  }

  const earL = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 12, 10),
    skin,
  );
  earL.position.set(-0.34, 0, 0);
  const earR = earL.clone();
  earR.position.x = 0.34;
  head.add(earL, earR);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.03, 8, 18, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0xe0e7ed,
      roughness: 0.66,
    }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.76;
  group.add(collar);

  function arm(side: number) {
    const upper = new THREE.Group();
    upper.position.set(side * 0.43, 1.53, 0);
    const upperMesh = capsule(0.105, 0.46, shirt);
    upperMesh.position.y = -0.24;
    upper.add(upperMesh);

    const fore = new THREE.Group();
    fore.position.y = -0.51;
    const foreMesh = capsule(0.09, 0.4, shirt);
    foreMesh.position.y = -0.2;
    fore.add(foreMesh);
    upper.add(fore);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.092, 12, 10),
      skin,
    );
    hand.position.set(side * 0.43, 0.79, 0);
    group.add(hand);

    group.add(upper);

    return { upper, fore, hand };
  }

  const aL = arm(-1);
  const aR = arm(1);

  function leg(side: number) {
    const upper = new THREE.Group();
    upper.position.set(side * 0.17, 0.9, 0);
    const thigh = capsule(0.12, 0.43, pants);
    thigh.position.y = -0.23;
    upper.add(thigh);

    const lower = new THREE.Group();
    lower.position.y = -0.58;
    const shin = capsule(0.095, 0.36, pants);
    shin.position.y = -0.22;
    lower.add(shin);

    const shoe = roundedBox(0.23, 0.13, 0.44, shoes);
    shoe.position.set(0, -0.53, 0.14);
    lower.add(shoe);

    upper.add(lower);
    group.add(upper);
    return { upper, lower };
  }

  const lL = leg(-1);
  const lR = leg(1);

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
    head,
    leftArm: aL.upper,
    rightArm: aR.upper,
    leftForearm: aL.fore,
    rightForearm: aR.fore,
    leftUpperLeg: lL.upper,
    rightUpperLeg: lR.upper,
    leftLowerLeg: lL.lower,
    rightLowerLeg: lR.lower,
    hands: [aL.hand, aR.hand],
  };
}

function applyPose(
  rig: HumanRig,
  person: Staff,
  time: number,
) {
  const walking = Boolean(person.walking);
  const seated =
    !walking &&
    (person.status === "Working" ||
      person.status === "Meeting" ||
      person.status === "Break");

  rig.torso.rotation.x = 0;
  rig.torso.rotation.z = 0;
  rig.head.rotation.x = 0;
  rig.head.rotation.z = 0;

  if (walking) {
    const phase = time * 9 + person.id * 0.7;
    const stride = Math.sin(phase);

    rig.group.position.y =
      0.02 + Math.abs(Math.sin(phase)) * 0.018;
    rig.torso.position.set(0, 1.36, 0);
    rig.head.position.set(0, 2.2, 0);

    rig.leftArm.rotation.z = -0.06 - stride * 0.48;
    rig.rightArm.rotation.z = 0.06 + stride * 0.48;
    rig.leftArm.rotation.x = 0.04;
    rig.rightArm.rotation.x = -0.04;
    rig.leftForearm.rotation.x = -0.08;
    rig.rightForearm.rotation.x = -0.08;

    rig.leftUpperLeg.rotation.x = stride * 0.62;
    rig.rightUpperLeg.rotation.x = -stride * 0.62;
    rig.leftLowerLeg.rotation.x = Math.max(0, -stride) * 0.32;
    rig.rightLowerLeg.rotation.x = Math.max(0, stride) * 0.32;

    rig.hands[0].position.set(-0.43, 0.79, 0);
    rig.hands[1].position.set(0.43, 0.79, 0);
    return;
  }

  if (seated) {
    // One stable seating rig for all chair types. The character's pelvis is
    // lower than the chair back, thighs point toward the table/desk, and
    // shins return to the floor. No vertical bobbing.
    rig.group.position.y = 0;
    rig.torso.position.set(0, 1.21, 0.02);
    rig.head.position.set(0, 2.0, 0.08);

    rig.leftUpperLeg.position.set(-0.17, 0.82, 0);
    rig.rightUpperLeg.position.set(0.17, 0.82, 0);
    rig.leftUpperLeg.rotation.x = -Math.PI / 2;
    rig.rightUpperLeg.rotation.x = -Math.PI / 2;

    rig.leftLowerLeg.position.set(0, -0.02, 0.27);
    rig.rightLowerLeg.position.set(0, -0.02, 0.27);
    rig.leftLowerLeg.rotation.x = Math.PI / 2;
    rig.rightLowerLeg.rotation.x = Math.PI / 2;

    if (person.status === "Working") {
      rig.torso.rotation.x = 0.045;
      rig.head.rotation.x = 0.035;
      rig.leftArm.rotation.x = -0.48;
      rig.rightArm.rotation.x = -0.48;
      rig.leftArm.rotation.z = -0.08;
      rig.rightArm.rotation.z = 0.08;
      rig.leftForearm.rotation.x = -0.78;
      rig.rightForearm.rotation.x = -0.78;

      const typing = Math.sin(time * 4.5 + person.id) * 0.022;
      rig.hands[0].position.set(-0.23, 1.16, 0.43 + typing);
      rig.hands[1].position.set(0.23, 1.16, 0.43 - typing);
      return;
    }

    rig.torso.rotation.x = 0.02;
    rig.head.rotation.x = 0.015;
    rig.leftArm.rotation.x = -0.34;
    rig.rightArm.rotation.x = -0.34;
    rig.leftArm.rotation.z = -0.08;
    rig.rightArm.rotation.z = 0.08;
    rig.leftForearm.rotation.x = 0.72;
    rig.rightForearm.rotation.x = 0.72;
    rig.hands[0].position.set(-0.25, 1.08, 0.43);
    rig.hands[1].position.set(0.25, 1.08, 0.43);
  } else {
    rig.group.position.y = 0;
    rig.torso.position.set(0, 1.36, 0);
    rig.head.position.set(0, 2.2, 0);
    rig.leftUpperLeg.position.set(-0.17, 0.9, 0);
    rig.rightUpperLeg.position.set(0.17, 0.9, 0);
    rig.leftUpperLeg.rotation.x = 0;
    rig.rightUpperLeg.rotation.x = 0;
    rig.leftLowerLeg.position.set(0, -0.58, 0);
    rig.rightLowerLeg.position.set(0, -0.58, 0);
    rig.leftLowerLeg.rotation.x = 0;
    rig.rightLowerLeg.rotation.x = 0;
    rig.leftArm.rotation.z = -0.05;
    rig.rightArm.rotation.z = 0.05;
    rig.leftArm.rotation.x = 0;
    rig.rightArm.rotation.x = 0;
    rig.leftForearm.rotation.x = 0;
    rig.rightForearm.rotation.x = 0;
    rig.hands[0].position.set(-0.43, 0.79, 0);
    rig.hands[1].position.set(0.43, 0.79, 0);
  }
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
    scene.background = new THREE.Color(0xdde9e6);
    scene.fog = new THREE.Fog(0xdde9e6, 31, 53);

    const camera = new THREE.PerspectiveCamera(
      46,
      Math.max(1, mount.clientWidth) /
        Math.max(1, mount.clientHeight),
      0.1,
      100,
    );
    camera.position.set(17.5, 15.5, 21.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.minDistance = 8;
    controls.maxDistance = 34;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0, 1.2);

    scene.add(
      new THREE.HemisphereLight(0xf8fbff, 0x6e766f, 2.35),
    );
    const sun = new THREE.DirectionalLight(0xfff3da, 3.15);
    sun.position.set(-10, 20, 11);
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
        color: 0xb79d7f,
        roughness: 0.92,
      }),
    );
    base.position.y = -0.21;
    base.receiveShadow = true;
    scene.add(base);

    // A clean central corridor is the circulation spine connecting all office entrances.
    const corridor = new THREE.Mesh(
      new THREE.BoxGeometry(20.5, 0.05, 2.65),
      new THREE.MeshStandardMaterial({
        color: 0xd7dfda,
        roughness: 0.94,
      }),
    );
    corridor.position.set(0, 0.03, -1.82);
    corridor.receiveShadow = true;
    scene.add(corridor);

    const corridorLine = new THREE.Mesh(
      new THREE.BoxGeometry(20.5, 0.018, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xb8c4bd,
        roughness: 0.94,
      }),
    );
    corridorLine.position.set(0, 0.062, -1.20);
    scene.add(corridorLine);

    const doors = new Map<OfficeRoom, THREE.Group>();
    for (const room of ROOM_DATA) {
      addRoom(scene, room, doors);
    }

    addLobbyAndWayfinding(scene);

    addOfficeFurniture(scene);
    addMeetingAndBreakFurniture(scene);

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
          const person = staffRef.current.find(
            (item) => item.id === object!.userData.staffId,
          );
          if (person) onSelectRef.current(person);
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
        const dx = target.x - rig.group.position.x;
        const dz = target.z - rig.group.position.z;
        const distance = Math.hypot(dx, dz);

        if (runningRef.current && distance > 0.003) {
          const blend = Math.min(
            1,
            delta * (person.walking ? 10.5 : 14),
          );
          rig.group.position.x += dx * blend;
          rig.group.position.z += dz * blend;

          if (person.walking) {
            const desired = Math.atan2(dx, dz);
            let angle = desired - rig.group.rotation.y;
            angle = Math.atan2(Math.sin(angle), Math.cos(angle));
            rig.group.rotation.y +=
              angle * Math.min(1, delta * 12);
          }
        }

        // Seated staff face the center of their actual activity table.
        if (!person.walking && person.status === "Meeting") {
          const center = worldFromPercent(51, 19);
          rig.group.rotation.y = Math.atan2(
            center.x - rig.group.position.x,
            center.z - rig.group.position.z,
          );
        } else if (!person.walking && person.status === "Break") {
          const center = worldFromPercent(84.25, 84.5);
          rig.group.rotation.y = Math.atan2(
            center.x - rig.group.position.x,
            center.z - rig.group.position.z,
          );
        } else if (!person.walking && person.status === "Working") {
          rig.group.rotation.y = 0;
        }

        // Open only the doorway that a nearby worker is approaching.
        for (const [room, door] of doors) {
          const data = ROOM_DATA.find((item) => item.name === room);
          if (!data) continue;

          const d = Math.hypot(
            person.x - data.door.x,
            person.y - data.door.y,
          );
          const shouldOpen =
            d < 5 ||
            selectedRoomRef.current === room;

          const hinge = door.userData.hinge as THREE.Group;
          const closed = Number(door.userData.closed);
          const opened = Number(door.userData.open);
          const targetRotation = shouldOpen ? opened : closed;

          hinge.rotation.y +=
            (targetRotation - hinge.rotation.y) *
            Math.min(1, delta * 9);
        }

        applyPose(rig, person, time);
      }

      renderer.render(scene, camera);
    };

    let frame = 0;
    const loop = () => {
      animate();
      frame = requestAnimationFrame(loop);
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
      cancelAnimationFrame(frame);
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
            object.material.forEach((material) =>
              material.dispose(),
            );
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
      aria-label="Redesigned 3D virtual office"
    >
      <div className="office-3d-help">
        <strong>3D Office</strong>
        <span>Drag to rotate · Pinch/scroll to zoom · Tap people or rooms</span>
      </div>
      <div className="office-3d-badge">REAL-TIME 3D</div>
    </div>
  );
}


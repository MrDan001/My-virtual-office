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
};

type Props = {
  staff: Staff[];
  onSelect: (staff: Staff) => void;
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

const ROOM_DATA: { name: OfficeRoom; x: number; z: number; w: number; d: number; color: number }[] = [
  { name: "Manager Office", x: -10, z: -6, w: 8, d: 7, color: 0xe8dfcf },
  { name: "Meeting Room", x: 0, z: -6, w: 10, d: 7, color: 0xe2ecea },
  { name: "Support", x: 10, z: -6, w: 8, d: 7, color: 0xddebed },
  { name: "Design Studio", x: -9, z: 3.5, w: 10, d: 9, color: 0xeee8f5 },
  { name: "Finance", x: 1, z: 3.5, w: 7, d: 9, color: 0xe8e6df },
  { name: "Open Office", x: -1, z: 10, w: 11, d: 5, color: 0xe6eee5 },
  { name: "Break Room", x: 10, z: 5, w: 8, d: 9, color: 0xf0eadf },
];

type DoorSide = "north" | "south" | "east" | "west";

const ROOM_DOORWAYS: Record<OfficeRoom, { side: DoorSide; offset: number }[]> = {
  Reception: [],
  "Manager Office": [
    { side: "east", offset: -6 },
    { side: "south", offset: -10 },
  ],
  "Meeting Room": [
    { side: "west", offset: -6 },
    { side: "east", offset: -6 },
    { side: "south", offset: 0 },
  ],
  Support: [
    { side: "west", offset: -6 },
  ],
  "Design Studio": [
    { side: "north", offset: -10 },
    { side: "east", offset: 3.5 },
    { side: "south", offset: -9 },
  ],
  Finance: [
    { side: "north", offset: 1 },
    { side: "west", offset: 3.5 },
    { side: "east", offset: 3.5 },
    { side: "south", offset: 1 },
  ],
  "Open Office": [
    { side: "north", offset: -3 },
    { side: "north", offset: 1 },
    { side: "east", offset: 8.5 },
  ],
  "Break Room": [
    { side: "west", offset: 3.5 },
    { side: "west", offset: 8.5 },
  ],
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function worldFromPercent(x: number, y: number) {
  const minX = -14.34;
  const maxX = 14.34;
  const minZ = -9.84;
  const maxZ = 12.84;
  return {
    x: (x / 100) * (maxX - minX) + minX,
    z: (y / 100) * (maxZ - minZ) + minZ,
  };
}

function roundedBox(width: number, height: number, depth: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  return mesh;
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.2, 0.55, 1);
  return sprite;
}

function addDesk(scene: THREE.Scene, x: number, z: number, rotation = 0, label = "") {
  // Workstation is a single coherent unit:
  // desk -> keyboard -> monitor, with the chair and employee on the opposite side.
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;

  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6848, roughness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252b33, roughness: 0.35 });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb7bec6,
    metalness: 0.75,
    roughness: 0.25,
  });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x40566b, roughness: 0.65 });

  // Smaller footprint keeps the office circulation lanes open.
  const top = roundedBox(2.55, 0.18, 1.12, wood);
  top.position.set(0, 1.25, 0.08);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  [-0.92, 0.92].forEach((px) => {
    const leg = roundedBox(0.12, 1.2, 0.12, chrome);
    leg.position.set(px, 0.6, 0.14);
    group.add(leg);
  });

  // Monitor is furthest away from the employee.
  const monitor = roundedBox(0.82, 0.54, 0.08, dark);
  monitor.position.set(0, 1.62, 0.48);
  monitor.castShadow = true;
  group.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.37, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x73a9b8,
      emissive: 0x19333b,
      emissiveIntensity: 0.35,
    }),
  );
  screen.position.set(0, 1.62, 0.435);
  group.add(screen);

  // Keyboard sits between employee and monitor.
  const keyboard = roundedBox(0.78, 0.05, 0.28, chrome);
  keyboard.position.set(0, 1.39, 0.18);
  keyboard.castShadow = true;
  group.add(keyboard);

  // Real chair: seat under the employee, backrest behind the employee.
  const chair = new THREE.Group();
  chair.position.set(0, 0, -0.78);

  const seat = roundedBox(0.84, 0.18, 0.84, chairMat);
  seat.position.y = 0.72;
  seat.castShadow = true;
  chair.add(seat);

  const back = roundedBox(0.78, 0.95, 0.14, chairMat);
  back.position.set(0, 1.15, -0.31);
  back.castShadow = true;
  chair.add(back);

  const stem = roundedBox(0.1, 0.65, 0.1, chrome);
  stem.position.y = 0.34;
  chair.add(stem);

  group.add(chair);

  if (label) {
    const tag = makeTextSprite(label);
    tag.position.set(0, 2.2, 0);
    tag.scale.set(1.55, 0.38, 1);
    group.add(tag);
  }

  scene.add(group);
  return group;
}function staffDeskFacing(person: Staff) {
  const slot = (Math.max(1, person.id) - 1) % 4;

  if (person.location === "Meeting Room") {
    return person.y < 17 ? 0 : Math.PI;
  }

  if (person.location === "Break Room") {
    const dx = person.x - 84;
    const dy = person.y - 81;
    return Math.atan2(-dx, -dy);
  }

  // The first row faces +Z; the second row faces -Z.
  // This matches the two rows of desks in Design Studio and Finance.
  if (person.department === "Design" || person.department === "Finance") {
    return slot >= 2 ? Math.PI : 0;
  }

  return 0;
}

function addStaff(scene: THREE.Scene, person: Staff) {
  const group = new THREE.Group();
  const deskPoint = worldFromPercent(person.x, person.y);
  const deskRotation = staffDeskFacing(person);

  // Person root is the centre of the chair, not the centre of the desk.
  const chairDistance = 0.78;
  deskPoint.x += Math.sin(deskRotation) * -chairDistance;
  deskPoint.z += Math.cos(deskRotation) * -chairDistance;

  group.position.set(deskPoint.x, 0, deskPoint.z);
  group.rotation.y = deskRotation;
  group.userData.staffId = person.id;
  group.scale.setScalar(1.0);

  const skinTones = [0xf2c7aa, 0xd99b73, 0xb87352, 0x97563d, 0x75412f, 0x563125];
  const hairTones = [0x17120f, 0x2a1c16, 0x4a2d20, 0x6b432c, 0x211c26];
  const eyeTones = [0x302018, 0x4b2d1d, 0x25354d, 0x17251d];

  const skin = new THREE.MeshStandardMaterial({
    color: skinTones[(person.id - 1) % skinTones.length],
    roughness: 0.82,
  });
  const skinSoft = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skin.color).offsetHSL(0, -0.03, 0.035),
    roughness: 0.86,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: hairTones[(person.id - 1) % hairTones.length],
    roughness: 0.92,
  });
  const shirt = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.color),
    roughness: 0.8,
  });
  const shirtDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(person.color).multiplyScalar(0.72),
    roughness: 0.84,
  });
  const trousers = new THREE.MeshStandardMaterial({
    color: [0x25324a, 0x3c4654, 0x2f3440][(person.id - 1) % 3],
    roughness: 0.88,
  });
  const shoe = new THREE.MeshStandardMaterial({
    color: [0x16191f, 0x22262c, 0x30261f][(person.id - 1) % 3],
    roughness: 0.72,
  });

  const faceWhite = new THREE.MeshStandardMaterial({ color: 0xfffaf5, roughness: 0.55 });
  const iris = new THREE.MeshStandardMaterial({
    color: eyeTones[(person.id - 1) % eyeTones.length],
    roughness: 0.4,
  });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.25 });
  const brow = new THREE.MeshStandardMaterial({
    color: hairTones[(person.id - 1) % hairTones.length],
    roughness: 0.95,
  });
  const lip = new THREE.MeshStandardMaterial({ color: 0x8e4b4e, roughness: 0.7 });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.13 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  group.add(shadow);

  const addSegment = (
    name: string,
    startPoint: THREE.Vector3,
    endPoint: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ) => {
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.06, length - radius * 2), 7, 12),
      material,
    );
    mesh.name = name;
    mesh.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // Proper seated pose: hips on the chair, thighs forward, knees bent,
  // lower legs down to the floor. Nothing is vertically planted on the seat.
  const hipY = 0.9;
  const kneeY = 0.62;
  const footY = 0.18;

  addSegment("left thigh", new THREE.Vector3(-0.18, hipY, 0.0), new THREE.Vector3(-0.18, kneeY, 0.52), 0.145, trousers);
  addSegment("right thigh", new THREE.Vector3(0.18, hipY, 0.0), new THREE.Vector3(0.18, kneeY, 0.52), 0.145, trousers);
  addSegment("left shin", new THREE.Vector3(-0.18, kneeY, 0.52), new THREE.Vector3(-0.18, footY, 0.70), 0.105, trousers);
  addSegment("right shin", new THREE.Vector3(0.18, kneeY, 0.52), new THREE.Vector3(0.18, footY, 0.70), 0.105, trousers);

  [-0.18, 0.18].forEach((x) => {
    const foot = roundedBox(0.24, 0.14, 0.48, shoe);
    foot.position.set(x, 0.10, 0.78);
    foot.castShadow = true;
    group.add(foot);
  });

  const pelvis = roundedBox(0.66, 0.38, 0.5, trousers);
  pelvis.position.set(0, 0.88, 0.0);
  pelvis.rotation.x = -0.06;
  pelvis.castShadow = true;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.40, 0.62, 8, 16), shirt);
  torso.position.set(0, 1.38, -0.02);
  torso.rotation.x = -0.08;
  torso.scale.set(1, 1, 0.8);
  torso.castShadow = true;
  group.add(torso);

  const collar = roundedBox(0.32, 0.08, 0.16, faceWhite);
  collar.position.set(0, 1.73, 0.27);
  collar.rotation.x = -0.08;
  group.add(collar);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.24, 14), skin);
  neck.position.set(0, 1.83, 0.12);
  neck.castShadow = true;
  group.add(neck);

  // Arms angle naturally down toward the keyboard in front of the torso.
  addSegment("left upper arm", new THREE.Vector3(-0.38, 1.55, 0.02), new THREE.Vector3(-0.40, 1.30, 0.28), 0.095, shirtDark);
  addSegment("right upper arm", new THREE.Vector3(0.38, 1.55, 0.02), new THREE.Vector3(0.40, 1.30, 0.28), 0.095, shirtDark);
  addSegment("left forearm", new THREE.Vector3(-0.40, 1.30, 0.28), new THREE.Vector3(-0.28, 1.19, 0.68), 0.08, skinSoft);
  addSegment("right forearm", new THREE.Vector3(0.40, 1.30, 0.28), new THREE.Vector3(0.28, 1.19, 0.68), 0.08, skinSoft);

  [-0.28, 0.28].forEach((x) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), skin);
    hand.position.set(x, 1.18, 0.70);
    hand.scale.set(1, 0.82, 1.15);
    hand.castShadow = true;
    group.add(hand);
  });

  // Human head and face.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 20), skin);
  head.position.set(0, 2.16, 0.04);
  head.scale.set(0.94, 1.06, 0.9);
  head.castShadow = true;
  group.add(head);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.30, 20, 16), skinSoft);
  jaw.position.set(0, 2.02, 0.08);
  jaw.scale.set(1, 0.68, 0.84);
  jaw.castShadow = true;
  group.add(jaw);

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skin);
    ear.position.set(side * 0.34, 2.14, 0.04);
    ear.scale.set(0.72, 1, 0.62);
    ear.castShadow = true;
    group.add(ear);
  });

  const eyeSpacing = 0.13;
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), faceWhite);
    eye.position.set(side * eyeSpacing, 2.18, 0.36);
    eye.scale.set(1.1, 0.7, 0.7);
    group.add(eye);

    const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), iris);
    irisMesh.position.set(side * eyeSpacing, 2.18, 0.41);
    irisMesh.scale.set(1, 0.92, 0.55);
    group.add(irisMesh);

    const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), pupil);
    pupilMesh.position.set(side * eyeSpacing, 2.18, 0.435);
    group.add(pupilMesh);

    const browMesh = roundedBox(0.13, 0.03, 0.025, brow);
    browMesh.position.set(side * eyeSpacing, 2.29, 0.39);
    browMesh.rotation.z = side * -0.08;
    group.add(browMesh);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skin);
  nose.position.set(0, 2.08, 0.43);
  nose.scale.set(1, 0.9, 0.9);
  group.add(nose);

  const upperLip = roundedBox(0.16, 0.022, 0.032, lip);
  upperLip.position.set(0, 1.99, 0.415);
  group.add(upperLip);

  const lowerLip = roundedBox(0.12, 0.026, 0.034, lip);
  lowerLip.position.set(0, 1.96, 0.42);
  group.add(lowerLip);

  const hairstyle = (person.id - 1) % 4;
  if (hairstyle === 0) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.39, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.53),
      hair,
    );
    cap.position.set(0, 2.31, 0.0);
    cap.scale.set(1, 0.92, 0.94);
    group.add(cap);
  } else if (hairstyle === 1) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.66),
      hair,
    );
    cap.position.set(0, 2.29, 0.0);
    cap.scale.set(1.02, 0.93, 1.0);
    group.add(cap);
    [-0.34, 0.34].forEach((x) => {
      const lock = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hair);
      lock.position.set(x, 2.19, -0.01);
      group.add(lock);
    });
  } else if (hairstyle === 2) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.39, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.60),
      hair,
    );
    cap.position.set(0, 2.30, 0.0);
    group.add(cap);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), hair);
    bun.position.set(0, 2.50, -0.16);
    group.add(bun);
  } else {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.40, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.57),
      hair,
    );
    cap.position.set(0, 2.31, 0.0);
    group.add(cap);
    [-0.25, 0.25].forEach((x) => {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), hair);
      curl.position.set(x, 2.22, -0.02);
      group.add(curl);
    });
  }

  const cheek = new THREE.MeshStandardMaterial({
    color: skinSoft.color,
    roughness: 0.88,
    transparent: true,
    opacity: 0.35,
  });
  [-1, 1].forEach((side) => {
    const cheekMesh = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), cheek);
    cheekMesh.position.set(side * 0.18, 2.06, 0.34);
    cheekMesh.scale.set(1.2, 0.7, 0.45);
    group.add(cheekMesh);
  });

  const nameLabel = makeTextSprite(person.name.split(" ")[0]);
  nameLabel.position.set(0, 2.70, 0);
  nameLabel.scale.set(1.8, 0.45, 1);
  group.add(nameLabel);

  scene.add(group);
  return group;
}
function buildWall(
  scene: THREE.Scene,
  width: number,
  height: number,
  depth: number,
  x: number,
  z: number,
  wallMat: THREE.Material,
) {
  const wall = roundedBox(width, height, depth, wallMat);
  wall.position.set(x, height / 2, z);
  scene.add(wall);
}

function buildExteriorShell(scene: THREE.Scene) {
  // Overall room footprint bounds, expanded slightly so the shell overlaps
  // the room edges and sits firmly on the continuous foundation.
  // Slightly oversize the shell so all perimeter corners and edge joints overlap
  // instead of leaving hairline openings visible from low camera angles.
  const minX = -14.34;
  const maxX = 14.34;
  const minZ = -9.84;
  const maxZ = 12.84;
  const centerZ = (minZ + maxZ) / 2;

  const wallHeight = 2.5;
  const wallThickness = 0.38;
  const cornerOverlap = 0.22;
  const cornerPostSize = 0.60;
  const cornerPostPenetration = 0.08;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1c2af,
    roughness: 0.86,
    metalness: 0,
  });

  const addWall = (width: number, depth: number, x: number, z: number) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, wallHeight, depth),
      wallMaterial,
    );
    wall.position.set(x, wallHeight / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  };

  // Continuous perimeter. Each wall deliberately extends past the nominal
  // corner so the adjoining wall and corner posts physically overlap.
  addWall(maxX - minX + wallThickness * 2 + cornerOverlap, wallThickness, 0, minZ);
  addWall(maxX - minX + wallThickness * 2 + cornerOverlap, wallThickness, 0, maxZ);
  addWall(wallThickness, maxZ - minZ + wallThickness * 2 + cornerOverlap, minX, centerZ);
  addWall(wallThickness, maxZ - minZ + wallThickness * 2 + cornerOverlap, maxX, centerZ);

  // Solid corner posts at the two historically visible seam locations, plus
  // matching posts at the opposite corners to keep the shell structurally uniform.
  const addCornerPost = (x: number, z: number) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(cornerPostSize, wallHeight + cornerPostPenetration, cornerPostSize),
      wallMaterial,
    );
    post.position.set(x, (wallHeight - cornerPostPenetration) / 2, z);
    post.castShadow = true;
    post.receiveShadow = true;
    scene.add(post);
  };

  addCornerPost(minX, minZ);
  addCornerPost(maxX, minZ);
  addCornerPost(minX, maxZ);
  addCornerPost(maxX, maxZ);

  // Continuous lower closure band. This seals the wall-to-floor/foundation
  // junction so low camera angles cannot see a slit along either side.
  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: 0xb59b7d,
    roughness: 0.9,
    metalness: 0,
  });
  const skirtHeight = 0.46;
  const skirtT = 0.52;

  const addSkirt = (width: number, depth: number, x: number, z: number) => {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(width, skirtHeight, depth),
      skirtMaterial,
    );
    skirt.position.set(x, -0.04, z);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    scene.add(skirt);
  };

  addSkirt(maxX - minX + skirtT * 2, skirtT, 0, minZ);
  addSkirt(maxX - minX + skirtT * 2, skirtT, 0, maxZ);
  addSkirt(skirtT, maxZ - minZ + skirtT * 2, minX, centerZ);
  addSkirt(skirtT, maxZ - minZ + skirtT * 2, maxX, centerZ);

  // A continuous office floor closes all small gaps between individual room slabs.
  // It sits directly on the foundation and below the room-specific floors/furniture.
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xe4e0d8,
    roughness: 0.92,
    metalness: 0,
  });

  const officeFloor = new THREE.Mesh(
    new THREE.BoxGeometry(maxX - minX, 0.1, maxZ - minZ),
    floorMaterial,
  );
  officeFloor.position.set(0, 0.05, (minZ + maxZ) / 2);
  officeFloor.receiveShadow = true;
  scene.add(officeFloor);
}

function buildRoom(scene: THREE.Scene, room: typeof ROOM_DATA[number]) {
  const mat = new THREE.MeshStandardMaterial({
    color: room.color,
    roughness: 0.8,
    metalness: 0.02,
  });

  // Pull each room footprint inward on every side to create wider circulation
  // passages while keeping the room centers and overall office layout unchanged.
  const passageInset = 0.5;
  const visualW = Math.max(1, room.w - passageInset * 2);
  const visualD = Math.max(1, room.d - passageInset * 2);

  const floor = roundedBox(visualW, 0.12, visualD, mat);
  floor.position.set(room.x, 0.12, room.z);
  floor.userData.room = room.name;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd5c7b4,
    roughness: 0.85,
  });

  const wallH = 2.35;
  const thickness = 0.18;
  const doorwayWidth = 1.8;

  const addSolidWall = (
    width: number,
    depth: number,
    x: number,
    z: number,
  ) => {
    if (width <= 0.08 || depth <= 0.08) return;
    const wall = roundedBox(width, wallH, depth, wallMat);
    wall.position.set(x, wallH / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  };

  const doors = ROOM_DOORWAYS[room.name] ?? [];

  const horizontalWall = (z: number, centers: number[]) => {
    const left = room.x - (visualW + thickness) / 2;
    const right = room.x + (visualW + thickness) / 2;
    let cursor = left;
    for (const center of [...centers].sort((a, b) => a - b)) {
      const openingLeft = Math.max(left, center - doorwayWidth / 2);
      const openingRight = Math.min(right, center + doorwayWidth / 2);
      addSolidWall(openingLeft - cursor, thickness, (cursor + openingLeft) / 2, z);
      cursor = Math.max(cursor, openingRight);
    }
    addSolidWall(right - cursor, thickness, (cursor + right) / 2, z);
  };

  const verticalWall = (x: number, centers: number[]) => {
    const top = room.z - visualD / 2;
    const bottom = room.z + visualD / 2;
    let cursor = top;
    for (const center of [...centers].sort((a, b) => a - b)) {
      const openingTop = Math.max(top, center - doorwayWidth / 2);
      const openingBottom = Math.min(bottom, center + doorwayWidth / 2);
      addSolidWall(thickness, openingTop - cursor, x, (cursor + openingTop) / 2);
      cursor = Math.max(cursor, openingBottom);
    }
    addSolidWall(thickness, bottom - cursor, x, (cursor + bottom) / 2);
  };

  horizontalWall(
    room.z - visualD / 2,
    doors.filter((d) => d.side === "north").map((d) => d.offset),
  );
  horizontalWall(
    room.z + visualD / 2,
    doors.filter((d) => d.side === "south").map((d) => d.offset),
  );
  verticalWall(
    room.x - visualW / 2,
    doors.filter((d) => d.side === "west").map((d) => d.offset),
  );
  verticalWall(
    room.x + visualW / 2,
    doors.filter((d) => d.side === "east").map((d) => d.offset),
  );

  const label = makeTextSprite(room.name, "#475569");
  label.position.set(room.x, 2.75, room.z - visualD / 2 + 0.7);
  label.scale.set(2.3, 0.55, 1);
  label.userData.room = room.name;
  scene.add(label);
}
export default function Office3D({ staff, onSelect, onRoomSelect, selectedRoom }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef(staff);
  const onSelectRef = useRef(onSelect);
  const onRoomSelectRef = useRef(onRoomSelect);
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => { staffRef.current = staff; }, [staff]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onRoomSelectRef.current = onRoomSelect; }, [onRoomSelect]);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 30, 52);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(20, 20, 23);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 8;
    controls.maxDistance = 34;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.28;
    controls.target.set(0, 0, 1);

    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x6f776e, 2.2));
    const sun = new THREE.DirectionalLight(0xfff3d2, 3.2);
    sun.position.set(-8, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    scene.add(sun);

    // Continuous foundation: room footprints extend beyond the previous 25x22 slab.
    // The larger slab closes the underside/gaps and gives every camera angle a finished edge.
    const foundationMaterial = new THREE.MeshStandardMaterial({
      color: 0xbca489,
      roughness: 0.92,
      metalness: 0,
    });

    const foundation = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.7, 30),
      foundationMaterial
    );
    foundation.position.y = -0.375;
    foundation.receiveShadow = true;
    scene.add(foundation);

    // A low perimeter curb covers the exposed outside edges without boxing in the rooms.
    const curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x9f866d,
      roughness: 0.9,
      metalness: 0,
    });
    const curbH = 0.42;
    const curbW = 32;
    const curbD = 30;
    const curbT = 0.22;
    const curbY = 0.02;

    const addCurb = (width: number, depth: number, x: number, z: number) => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(width, curbH, depth),
        curbMaterial
      );
      curb.position.set(x, curbY, z);
      curb.receiveShadow = true;
      curb.castShadow = true;
      scene.add(curb);
    };

    addCurb(curbW, curbT, 0, -curbD / 2 + curbT / 2);
    addCurb(curbW, curbT, 0, curbD / 2 - curbT / 2);
    addCurb(curbT, curbD, -curbW / 2 + curbT / 2, 0);
    addCurb(curbT, curbD, curbW / 2 - curbT / 2, 0);

    buildExteriorShell(scene);

    ROOM_DATA.forEach((room) => buildRoom(scene, room));    addDesk(scene, -12, -7.8, 0.08, "Manager");
    // Four-desk offices: keep the two rows centered on each room's actual center.
    addDesk(scene, -10.75, 1.7, 0, "Design");
    addDesk(scene, -7.25, 1.7, 0, "Design");
    addDesk(scene, -10.75, 5.3, Math.PI, "Design");
    addDesk(scene, -7.25, 5.3, Math.PI, "Design");

    addDesk(scene, -0.75, 1.7, 0, "Finance");
    addDesk(scene, 2.75, 1.7, 0, "Finance");
    addDesk(scene, -0.75, 5.3, Math.PI, "Finance");
    addDesk(scene, 2.75, 5.3, Math.PI, "Finance");

    // Support sits beside the Break Room, so it uses only two centered desks.
    addDesk(scene, 8.25, -6, 0, "Support");
    addDesk(scene, 11.75, -6, 0, "Support");

    // Open Office gets two centered desks for Operations + Marketing.
    addDesk(scene, -3, 9.4, 0, "Open");
    addDesk(scene, 1, 9.4, 0, "Open");

    const table = roundedBox(5.5, 0.28, 2.4, new THREE.MeshStandardMaterial({ color: 0x9a6848, roughness: 0.65 }));
    table.position.set(0, 1.05, -6);
    scene.add(table);
    [-2.2, -0.75, 0.75, 2.2].forEach((x) => {
      addChair(scene, x, -4.15, Math.PI);
      addChair(scene, x, -7.85, 0);
    });

    const breakTable = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0x9b7556, roughness: 0.7 })
    );
    breakTable.position.set(10, 1.0, 5.5);
    scene.add(breakTable);
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => addChair(scene, 10 + Math.cos(a) * 2, 5.5 + Math.sin(a) * 2, a));

    const staffGroups = new Map<number, THREE.Group>();
    staff.forEach((person) => staffGroups.set(person.id, addStaff(scene, person)));

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
        while (obj && !obj.userData.staffId && !obj.userData.room) obj = obj.parent;
        if (obj?.userData.staffId) {
          const person = staffRef.current.find((p) => p.id === obj!.userData.staffId);
          if (person) onSelectRef.current(person);
          return;
        }
        if (obj?.userData.room && onRoomSelectRef.current) {
          onRoomSelectRef.current(obj.userData.room as OfficeRoom);
          return;
        }
      }
    };

    renderer.domElement.addEventListener("pointerup", handlePointer);

    const clock = new THREE.Clock();
    const animate = () => {
      controls.update();

      staffRef.current.forEach((person) => {
        let group = staffGroups.get(person.id);
        if (!group) {
          group = addStaff(scene, person);
          staffGroups.set(person.id, group);
        }
        group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.userData.selected) child.scale.setScalar(1.12);
        });
      });

      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = () => { animate(); raf = requestAnimationFrame(loop); };
    loop();

    const resize = () => {
      const w = mount.clientWidth;
      const h = Math.max(420, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerup", handlePointer);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="office-3d-viewer"
      aria-label="Interactive 3D virtual office. Drag to rotate, pinch or scroll to zoom."
    >
      <div className="office-3d-help">
        <strong>3D Office</strong>
        <span>Drag to rotate · Pinch/scroll to zoom · Tap staff or rooms</span>
      </div>
      <div className="office-3d-badge">REAL-TIME 3D</div>
    </div>
  );
}

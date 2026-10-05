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

const ROOM_DATA: { name: OfficeRoom; x: number; z: number; w: number; d: number; color: number }[] = [
  { name: "Manager Office", x: -10, z: -6, w: 8, d: 7, color: 0xe8dfcf },
  { name: "Meeting Room", x: 0, z: -6, w: 10, d: 7, color: 0xe2ecea },
  { name: "Support", x: 10, z: -6, w: 8, d: 7, color: 0xddebed },
  { name: "Design Studio", x: -9, z: 3.5, w: 10, d: 9, color: 0xeee8f5 },
  { name: "Finance", x: 1, z: 3.5, w: 7, d: 9, color: 0xe8e6df },
  { name: "Open Office", x: -1, z: 10, w: 11, d: 5, color: 0xe6eee5 },
  { name: "Break Room", x: 10, z: 5, w: 8, d: 9, color: 0xf0eadf },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function worldFromPercent(x: number, y: number) {
  return {
    x: (x / 100) * 22 - 11,
    z: (y / 100) * 19 - 9.5,
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
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6848, roughness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252b33, roughness: 0.35 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb7bec6, metalness: 0.75, roughness: 0.25 });

  const top = roundedBox(2.8, 0.18, 1.25, wood);
  top.position.y = 1.25;
  group.add(top);

  [-1.05, 1.05].forEach((px) => {
    const leg = roundedBox(0.12, 1.2, 0.12, chrome);
    leg.position.set(px, 0.6, 0.42);
    group.add(leg);
  });

  const monitor = roundedBox(0.85, 0.55, 0.08, dark);
  monitor.position.set(0, 1.62, -0.2);
  group.add(monitor);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.38, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x73a9b8, emissive: 0x19333b, emissiveIntensity: 0.35 })
  );
  screen.position.set(0, 1.62, -0.245);
  group.add(screen);

  const keyboard = roundedBox(0.8, 0.05, 0.3, chrome);
  keyboard.position.set(0, 1.39, 0.22);
  group.add(keyboard);

  const chair = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.18, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x40566b, roughness: 0.65 })
  );
  chair.position.set(0, 0.72, 1.0);
  group.add(chair);

  if (label) {
    const tag = makeTextSprite(label);
    tag.position.set(0, 2.25, 0);
    tag.scale.set(1.6, 0.4, 1);
    group.add(tag);
  }
  scene.add(group);
  return group;
}

function addChair(scene: THREE.Scene, x: number, z: number, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x536b7c, roughness: 0.6 });
  const seat = roundedBox(0.9, 0.2, 0.9, seatMat);
  seat.position.y = 0.72;
  group.add(seat);
  const back = roundedBox(0.85, 1.0, 0.16, seatMat);
  back.position.set(0, 1.12, -0.35);
  group.add(back);
  const leg = roundedBox(0.1, 0.65, 0.1, new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.6 }));
  leg.position.y = 0.34;
  group.add(leg);
  scene.add(group);
}

function addStaff(scene: THREE.Scene, person: Staff) {
  const group = new THREE.Group();
  const p = worldFromPercent(person.x, person.y);
  group.position.set(p.x, 0, p.z);
  group.userData.staffId = person.id;

  const shirt = new THREE.MeshStandardMaterial({ color: new THREE.Color(person.color), roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98761, roughness: 0.8 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x38291f, roughness: 0.9 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.7 });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const legs = new THREE.Group();
  const legL = roundedBox(0.22, 0.85, 0.22, shoe);
  const legR = roundedBox(0.22, 0.85, 0.22, shoe);
  legL.position.set(-0.18, 0.52, 0);
  legR.position.set(0.18, 0.52, 0);
  legs.add(legL, legR);
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 6, 12), shirt);
  torso.position.y = 1.35;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), skin);
  head.position.y = 2.15;
  group.add(head);

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    hair
  );
  hairCap.position.y = 2.27;
  group.add(hairCap);

  const armL = roundedBox(0.18, 0.75, 0.18, shirt);
  const armR = roundedBox(0.18, 0.75, 0.18, shirt);
  armL.position.set(-0.5, 1.35, 0);
  armR.position.set(0.5, 1.35, 0);
  armL.rotation.z = -0.15;
  armR.rotation.z = 0.15;
  group.add(armL, armR);

  const label = makeTextSprite(person.name.split(" ")[0]);
  label.position.y = 2.85;
  group.add(label);

  if (person.status === "Working" && !person.walking) {
    group.userData.seated = true;
    group.position.y = -0.38;
    group.rotation.x = 0.04;
  }

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

  const floor = roundedBox(room.w, 0.12, room.d, mat);
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

  // For this cleanup pass every room wall is fully closed.
  // No doorway cuts, no frame gaps and no broken wall segments.
  const addSolidWall = (
    width: number,
    depth: number,
    x: number,
    z: number,
  ) => {
    const wall = roundedBox(width, wallH, depth, wallMat);
    wall.position.set(x, wallH / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  };

  addSolidWall(
    room.w + thickness,
    thickness,
    room.x,
    room.z - room.d / 2,
  );
  addSolidWall(
    room.w + thickness,
    thickness,
    room.x,
    room.z + room.d / 2,
  );
  addSolidWall(
    thickness,
    room.d,
    room.x - room.w / 2,
    room.z,
  );
  addSolidWall(
    thickness,
    room.d,
    room.x + room.w / 2,
    room.z,
  );

  const label = makeTextSprite(room.name, "#475569");
  label.position.set(room.x, 2.75, room.z - room.d / 2 + 0.7);
  label.scale.set(2.3, 0.55, 1);
  label.userData.room = room.name;
  scene.add(label);
}

export default function Office3D({ staff, running, onSelect, onRoomSelect, selectedRoom }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef(staff);
  const runningRef = useRef(running);
  const onSelectRef = useRef(onSelect);
  const onRoomSelectRef = useRef(onRoomSelect);
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => { staffRef.current = staff; }, [staff]);
  useEffect(() => { runningRef.current = running; }, [running]);
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

    ROOM_DATA.forEach((room) => buildRoom(scene, room));

    addDesk(scene, -12, -7.8, 0.08, "Manager");
    addDesk(scene, -9, 1.8, 0, "Design");
    addDesk(scene, -5.5, 1.8, 0, "Design");
    addDesk(scene, -9, 5.8, Math.PI, "Design");
    addDesk(scene, -5.5, 5.8, Math.PI, "Design");
    addDesk(scene, 0, 1.8, 0, "Finance");
    addDesk(scene, 3.5, 1.8, 0, "Finance");
    addDesk(scene, 0, 5.8, Math.PI, "Finance");
    addDesk(scene, 3.5, 5.8, Math.PI, "Finance");
    addDesk(scene, 7.5, -7.7, 0, "Support");
    addDesk(scene, 11, -7.7, 0, "Support");
    addDesk(scene, 7.5, -3.8, Math.PI, "Support");
    addDesk(scene, 11, -3.8, Math.PI, "Support");

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
      const delta = Math.min(clock.getDelta(), 0.05);
      controls.update();

      staffRef.current.forEach((person) => {
        let group = staffGroups.get(person.id);
        if (!group) {
          group = addStaff(scene, person);
          staffGroups.set(person.id, group);
        }

        const target = worldFromPercent(person.x, person.y);
        const current = group.position;
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        const distance = Math.hypot(dx, dz);
        const smoothing = runningRef.current ? Math.min(1, delta * (person.walking ? 4.5 : 8)) : 0;
        if (distance > 0.01 && smoothing > 0) {
          current.x += dx * smoothing;
          current.z += dz * smoothing;
          if (person.walking) {
            const desired = Math.atan2(dx, dz);
            let angle = desired - group.rotation.y;
            angle = Math.atan2(Math.sin(angle), Math.cos(angle));
            group.rotation.y += angle * Math.min(1, delta * 8);
            group.position.y = Math.sin(clock.elapsedTime * 9) * 0.025;
          }
        }

        const seated = !person.walking && person.status === "Working";
        if (seated) {
          group.position.y += (-0.38 - group.position.y) * Math.min(1, delta * 8);
          group.rotation.x += (0.04 - group.rotation.x) * Math.min(1, delta * 8);
        } else {
          group.position.y += (0 - group.position.y) * Math.min(1, delta * 8);
          group.rotation.x += (0 - group.rotation.x) * Math.min(1, delta * 8);
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

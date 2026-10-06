"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
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

function buildOpenShell(scene: THREE.Scene) {
  const minX = -14.34;
  const maxX = 14.34;
  const minZ = -9.84;
  const maxZ = 12.84;
  const centerZ = (minZ + maxZ) / 2;
  const wallHeight = 2.5;
  const wallThickness = 0.38;
  const frontEntranceWidth = 4.2;

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1c2af,
    roughness: 0.86,
  });

  // Back wall.
  addWall(
    scene,
    maxX - minX + wallThickness * 2 + 0.22,
    wallHeight,
    wallThickness,
    0,
    minZ,
    wallMaterial,
  );

  // Left and right exterior walls.
  addWall(
    scene,
    wallThickness,
    wallHeight,
    maxZ - minZ + wallThickness * 2 + 0.22,
    minX,
    centerZ,
    wallMaterial,
  );
  addWall(
    scene,
    wallThickness,
    wallHeight,
    maxZ - minZ + wallThickness * 2 + 0.22,
    maxX,
    centerZ,
    wallMaterial,
  );

  // Front wall with a deliberately wide central opening.
  const frontHalf = (maxX - minX) / 2;
  const openingHalf = frontEntranceWidth / 2;
  addWall(
    scene,
    Math.max(0.1, frontHalf - openingHalf),
    wallHeight,
    wallThickness,
    minX + (frontHalf - openingHalf) / 2,
    maxZ,
    wallMaterial,
  );
  addWall(
    scene,
    Math.max(0.1, frontHalf - openingHalf),
    wallHeight,
    wallThickness,
    maxX - (frontHalf - openingHalf) / 2,
    maxZ,
    wallMaterial,
  );

  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: 0xb59b7d,
    roughness: 0.9,
  });
  const skirtHeight = 0.46;
  const skirtThickness = 0.52;

  addWall(
    scene,
    maxX - minX + skirtThickness * 2,
    skirtHeight,
    skirtThickness,
    0,
    minZ,
    skirtMaterial,
  );
  addWall(
    scene,
    skirtThickness,
    skirtHeight,
    maxZ - minZ + skirtThickness * 2,
    minX,
    centerZ,
    skirtMaterial,
  );
  addWall(
    scene,
    skirtThickness,
    skirtHeight,
    maxZ - minZ + skirtThickness * 2,
    maxX,
    centerZ,
    skirtMaterial,
  );

  // Keep the front threshold open as well.
  addWall(
    scene,
    Math.max(0.1, frontHalf - openingHalf),
    skirtHeight,
    skirtThickness,
    minX + (frontHalf - openingHalf) / 2,
    maxZ,
    skirtMaterial,
  );
  addWall(
    scene,
    Math.max(0.1, frontHalf - openingHalf),
    skirtHeight,
    skirtThickness,
    maxX - (frontHalf - openingHalf) / 2,
    maxZ,
    skirtMaterial,
  );

  const floor = box(
    maxX - minX,
    0.1,
    maxZ - minZ,
    new THREE.MeshStandardMaterial({
      color: 0xe7e1d6,
      roughness: 0.9,
    }),
  );
  floor.position.set(0, 0.05, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  const entrancePad = box(
    frontEntranceWidth,
    0.08,
    1.7,
    new THREE.MeshStandardMaterial({
      color: 0xcab99e,
      roughness: 0.84,
    }),
  );
  entrancePad.position.set(0, 0.08, maxZ + 0.72);
  entrancePad.receiveShadow = true;
  scene.add(entrancePad);
}

export default function Office3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 36, 64);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(20, 19, 24);

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
    controls.minDistance = 11;
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
      new THREE.MeshStandardMaterial({
        color: 0xbca489,
        roughness: 0.92,
      }),
    );
    foundation.position.y = -0.375;
    foundation.receiveShadow = true;
    scene.add(foundation);

    buildOpenShell(scene);

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
      controls.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
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
      aria-label="Interactive open-plan 3D office shell"
    >
      <div className="office-3d-help">
        <strong>Open office shell</strong>
        <span>Drag to rotate · Pinch/scroll to zoom</span>
      </div>
      <div className="office-3d-badge">OPEN SPACE</div>
    </div>
  );
}

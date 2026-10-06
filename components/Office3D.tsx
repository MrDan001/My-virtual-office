"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BUILDING_W = 12;
const BUILDING_D = 20;
const WALL = 0.2;
const HALF_WALL = WALL / 2;
const WALL_HEIGHT = 2.7;
const CORRIDOR_W = 2;
const DOOR_W = 1;
const MAIN_DOOR_W = 2;

const LEFT = -6;
const RIGHT = 6;
const FRONT = -7.5;
const BACK = 12.5;
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
 * Building: X -6..+6, Z -7.5..+12.5
 * Corridor: X -1..+1, Z -7.5..+12.5
 * Wall thickness: 0.20m
 *
 * Vertical wall segments own the physical corners. Horizontal segments are
 * trimmed by the full 0.20m wall thickness where they meet a vertical wall.
 * Corridor-boundary vertical segments are trimmed by 0.10m at horizontal
 * intersections so the horizontal divider owns that T-junction. Door
 * openings are gaps in the wall list, not meshes.
 *
 * Meeting and break rooms are followed by a manager's office and a
 * director's office at the rear of the building.
 * The renderer and validator both consume this same canonical geometry.
 */
const WALL_SEGMENTS: WallSegment[] = [
  segment("W01_BACK", { x: LEFT, z: BACK }, { x: RIGHT, z: BACK }, "horizontal", WALL, WALL),
  segment("W02_LEFT", { x: LEFT, z: FRONT }, { x: LEFT, z: BACK }, "vertical", WALL, WALL),
  segment("W03_RIGHT", { x: RIGHT, z: FRONT }, { x: RIGHT, z: BACK }, "vertical", WALL, WALL),

  segment("W04_FRONT_L", { x: LEFT, z: FRONT }, { x: -1, z: FRONT }, "horizontal", WALL),
  segment("W05_FRONT_R", { x: 1, z: FRONT }, { x: RIGHT, z: FRONT }, "horizontal", 0, WALL),

  // Left corridor boundary: doors at -5.5, -1.5, +4.0, +10.0.
  segment("W06_OFFICE1_L", { x: -1, z: FRONT }, { x: -1, z: -6 }, "vertical", WALL),
  segment("W07_OFFICE1_L", { x: -1, z: -5 }, { x: -1, z: -3.5 }, "vertical", 0, HALF_WALL),
  segment("W08_OFFICE3_L", { x: -1, z: -3.5 }, { x: -1, z: -2 }, "vertical", HALF_WALL),
  segment("W09_OFFICE3_L", { x: -1, z: -1 }, { x: -1, z: 0.5 }, "vertical", 0, HALF_WALL),
  segment("W10_MEETING_L", { x: -1, z: 0.5 }, { x: -1, z: 3.5 }, "vertical", HALF_WALL),
  segment("W11A_MEETING_L", { x: -1, z: 4.5 }, { x: -1, z: 7.5 }, "vertical", HALF_WALL, HALF_WALL),
  segment("W11B_MEETING_L", { x: -1, z: 7.5 }, { x: -1, z: 9 }, "vertical", HALF_WALL, 0),
  segment("W24_MANAGER_L", { x: -1, z: 10.5 }, { x: -1, z: BACK }, "vertical", 0, WALL),

  // Right corridor boundary: doors at -5.5, -1.5, +4.0, +10.0.
  segment("W12_OFFICE2_R", { x: 1, z: FRONT }, { x: 1, z: -6 }, "vertical", WALL),
  segment("W13_OFFICE2_R", { x: 1, z: -5 }, { x: 1, z: -3.5 }, "vertical", 0, HALF_WALL),
  segment("W14_OFFICE4_R", { x: 1, z: -3.5 }, { x: 1, z: -2 }, "vertical", HALF_WALL),
  segment("W15_OFFICE4_R", { x: 1, z: -1 }, { x: 1, z: 0.5 }, "vertical", 0, HALF_WALL),
  segment("W16_BREAK_R", { x: 1, z: 0.5 }, { x: 1, z: 3.5 }, "vertical", HALF_WALL),
  segment("W17A_BREAK_R", { x: 1, z: 4.5 }, { x: 1, z: 7.5 }, "vertical", HALF_WALL, HALF_WALL),
  segment("W17B_BREAK_R", { x: 1, z: 7.5 }, { x: 1, z: 9 }, "vertical", HALF_WALL, 0),
  segment("W25_DIRECTOR_R", { x: 1, z: 10.5 }, { x: 1, z: BACK }, "vertical", 0, WALL),

  // Horizontal room dividers own their intersections.
  segment("W18_OFFICE1_3", { x: LEFT, z: -3.5 }, { x: -1, z: -3.5 }, "horizontal", WALL, WALL),
  segment("W19_OFFICE2_4", { x: 1, z: -3.5 }, { x: RIGHT, z: -3.5 }, "horizontal", WALL, WALL),
  segment("W20_OFFICE3_MEETING", { x: LEFT, z: 0.5 }, { x: -1, z: 0.5 }, "horizontal", WALL, WALL),
  segment("W21_OFFICE4_BREAK", { x: 1, z: 0.5 }, { x: RIGHT, z: 0.5 }, "horizontal", WALL, WALL),
  segment("W22_MEETING_MANAGER", { x: LEFT, z: 7.5 }, { x: -1, z: 7.5 }, "horizontal", WALL, WALL),
  segment("W23_BREAK_DIRECTOR", { x: 1, z: 7.5 }, { x: RIGHT, z: 7.5 }, "horizontal", WALL, WALL),
];

const ROOM_RECTS = [
  { id: "office-1", name: "OFFICE 1", minX: -6, maxX: -1, minZ: -7.5, maxZ: -3.5 },
  { id: "office-2", name: "OFFICE 2", minX: 1, maxX: 6, minZ: -7.5, maxZ: -3.5 },
  { id: "office-3", name: "OFFICE 3", minX: -6, maxX: -1, minZ: -3.5, maxZ: 0.5 },
  { id: "office-4", name: "OFFICE 4", minX: 1, maxX: 6, minZ: -3.5, maxZ: 0.5 },
  { id: "meeting", name: "MEETING ROOM", minX: -6, maxX: -1, minZ: 0.5, maxZ: 7.5 },
  { id: "break", name: "BREAK ROOM", minX: 1, maxX: 6, minZ: 0.5, maxZ: 7.5 },
  { id: "manager", name: "MANAGER'S OFFICE", minX: -6, maxX: -1, minZ: 7.5, maxZ: 12.5 },
  { id: "director", name: "DIRECTOR'S OFFICE", minX: 1, maxX: 6, minZ: 7.5, maxZ: 12.5 },
] as const;

const DOOR_OPENINGS = [
  { id: "office-1-door", x: -1, z: -5.5, width: DOOR_W, side: "left" },
  { id: "office-3-door", x: -1, z: -1.5, width: DOOR_W, side: "left" },
  { id: "meeting-door", x: -1, z: 4, width: DOOR_W, side: "left" },
  { id: "manager-door", x: -1, z: 10, width: DOOR_W, side: "left" },
  { id: "office-2-door", x: 1, z: -5.5, width: DOOR_W, side: "right" },
  { id: "office-4-door", x: 1, z: -1.5, width: DOOR_W, side: "right" },
  { id: "break-door", x: 1, z: 4, width: DOOR_W, side: "right" },
  { id: "director-door", x: 1, z: 10, width: DOOR_W, side: "right" },
] as const;

type WallRect = {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type GeometryValidation = {
  valid: boolean;
  errors: string[];
  wallCount: number;
  junctionCount: number;
  doorCount: number;
  roomCount: number;
};

const GEOMETRY_EPS = 0.001;
const GEOMETRY_AREA_EPS = 0.000001;

function getTrimmedEndpoints(item: WallSegment) {
  const dx = item.end.x - item.start.x;
  const dz = item.end.z - item.start.z;
  const length = Math.hypot(dx, dz);

  if (length <= GEOMETRY_EPS) {
    return { start: item.start, end: item.end, length: 0 };
  }

  const ux = dx / length;
  const uz = dz / length;
  const startTrim = item.trimStart ?? 0;
  const endTrim = item.trimEnd ?? 0;

  return {
    start: {
      x: item.start.x + ux * startTrim,
      z: item.start.z + uz * startTrim,
    },
    end: {
      x: item.end.x - ux * endTrim,
      z: item.end.z - uz * endTrim,
    },
    length: length - startTrim - endTrim,
  };
}

function getWallRect(item: WallSegment): WallRect {
  const trimmed = getTrimmedEndpoints(item);
  const half = HALF_WALL;

  return {
    id: item.id,
    minX: Math.min(trimmed.start.x, trimmed.end.x) - half,
    maxX: Math.max(trimmed.start.x, trimmed.end.x) + half,
    minZ: Math.min(trimmed.start.z, trimmed.end.z) - half,
    maxZ: Math.max(trimmed.start.z, trimmed.end.z) + half,
  };
}

function intersectionArea(a: WallRect, b: WallRect) {
  const width = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const depth = Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
  return width * depth;
}

function rectDistance(a: WallRect, b: WallRect) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

function samePoint(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.z - b.z) <= GEOMETRY_EPS;
}

function intervalUnionLength(intervals: Array<[number, number]>) {
  const normalized = intervals
    .map(([start, end]) => [Math.min(start, end), Math.max(start, end)] as [number, number])
    .filter(([start, end]) => end - start > GEOMETRY_EPS)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let current: [number, number] | null = null;

  for (const interval of normalized) {
    if (!current) {
      current = [...interval];
      continue;
    }

    if (interval[0] <= current[1] + GEOMETRY_EPS) {
      current[1] = Math.max(current[1], interval[1]);
    } else {
      total += current[1] - current[0];
      current = [...interval];
    }
  }

  if (current) total += current[1] - current[0];
  return total;
}

function boundaryCoverage(
  orientation: Orientation,
  fixed: number,
  min: number,
  max: number,
) {
  const intervals: Array<[number, number]> = [];

  for (const item of WALL_SEGMENTS) {
    if (item.orientation !== orientation) continue;

    const matchesBoundary = orientation === "horizontal"
      ? Math.abs(item.start.z - fixed) <= GEOMETRY_EPS && Math.abs(item.end.z - fixed) <= GEOMETRY_EPS
      : Math.abs(item.start.x - fixed) <= GEOMETRY_EPS && Math.abs(item.end.x - fixed) <= GEOMETRY_EPS;

    if (!matchesBoundary) continue;

    const itemMin = orientation === "horizontal"
      ? Math.min(item.start.x, item.end.x)
      : Math.min(item.start.z, item.end.z);
    const itemMax = orientation === "horizontal"
      ? Math.max(item.start.x, item.end.x)
      : Math.max(item.start.z, item.end.z);

    const overlapMin = Math.max(min, itemMin);
    const overlapMax = Math.min(max, itemMax);

    if (overlapMax - overlapMin > GEOMETRY_EPS) {
      intervals.push([overlapMin, overlapMax]);
    }
  }

  return intervalUnionLength(intervals);
}

function validateBaseFloorPlan(): GeometryValidation {
  const errors: string[] = [];
  const wallRects = WALL_SEGMENTS.map(getWallRect);

  for (const rect of wallRects) {
    if (
      rect.minX < LEFT - GEOMETRY_EPS ||
      rect.maxX > RIGHT + GEOMETRY_EPS ||
      rect.minZ < FRONT - GEOMETRY_EPS ||
      rect.maxZ > BACK + GEOMETRY_EPS
    ) {
      errors.push(`${rect.id}: wall volume extends outside the 12 × 15 m building footprint`);
    }
  }

  for (let i = 0; i < wallRects.length; i += 1) {
    for (let j = i + 1; j < wallRects.length; j += 1) {
      const overlap = intersectionArea(wallRects[i], wallRects[j]);

      if (overlap > GEOMETRY_AREA_EPS) {
        errors.push(
          `${wallRects[i].id} ↔ ${wallRects[j].id}: duplicate wall volume ${overlap.toFixed(6)} m²`,
        );
      }
    }
  }

  let junctionCount = 0;

  for (let i = 0; i < WALL_SEGMENTS.length; i += 1) {
    for (let j = i + 1; j < WALL_SEGMENTS.length; j += 1) {
      const a = WALL_SEGMENTS[i];
      const b = WALL_SEGMENTS[j];

      const joins =
        samePoint(a.start, b.start) ||
        samePoint(a.start, b.end) ||
        samePoint(a.end, b.start) ||
        samePoint(a.end, b.end);

      if (!joins) continue;

      junctionCount += 1;

      const distance = rectDistance(wallRects[i], wallRects[j]);
      const overlap = intersectionArea(wallRects[i], wallRects[j]);

      if (distance > GEOMETRY_EPS) {
        errors.push(
          `${a.id} ↔ ${b.id}: corner/T-junction gap ${distance.toFixed(6)} m`,
        );
      }

      if (overlap > GEOMETRY_AREA_EPS) {
        errors.push(
          `${a.id} ↔ ${b.id}: junction overlap ${overlap.toFixed(6)} m²`,
        );
      }
    }
  }

  for (const door of DOOR_OPENINGS) {
    const doorMin = door.z - door.width / 2;
    const doorMax = door.z + door.width / 2;

    for (const item of WALL_SEGMENTS) {
      if (
        item.orientation !== "vertical" ||
        Math.abs(item.start.x - door.x) > GEOMETRY_EPS
      ) {
        continue;
      }

      const itemMin = Math.min(item.start.z, item.end.z);
      const itemMax = Math.max(item.start.z, item.end.z);
      const overlap = Math.max(0, Math.min(itemMax, doorMax) - Math.max(itemMin, doorMin));

      if (overlap > GEOMETRY_EPS) {
        errors.push(
          `${door.id}: ${item.id} intrudes ${overlap.toFixed(6)} m into the 1 m doorway`,
        );
      }
    }
  }

  const mainDoorOverlap = WALL_SEGMENTS
    .filter(
      (item) =>
        item.orientation === "horizontal" &&
        Math.abs(item.start.z - FRONT) <= GEOMETRY_EPS &&
        Math.abs(item.end.z - FRONT) <= GEOMETRY_EPS,
    )
    .reduce((total, item) => {
      const minX = Math.max(-MAIN_DOOR_W / 2, Math.min(item.start.x, item.end.x));
      const maxX = Math.min(MAIN_DOOR_W / 2, Math.max(item.start.x, item.end.x));
      return total + Math.max(0, maxX - minX);
    }, 0);

  if (mainDoorOverlap > GEOMETRY_EPS) {
    errors.push(`main-entrance: front wall blocks ${mainDoorOverlap.toFixed(6)} m of the 2 m opening`);
  }

  const corridorClear = {
    minX: CORRIDOR_LEFT + HALF_WALL,
    maxX: CORRIDOR_RIGHT - HALF_WALL,
    minZ: FRONT + HALF_WALL,
    maxZ: BACK - HALF_WALL,
  };

  const corridorRect: WallRect = {
    id: "corridor-clear-interior",
    ...corridorClear,
  };

  for (const rect of wallRects) {
    const overlap = intersectionArea(rect, corridorRect);
    if (overlap > GEOMETRY_AREA_EPS) {
      errors.push(
        `${rect.id}: wall volume intrudes into the 1.80 m clear corridor interior by ${overlap.toFixed(6)} m²`,
      );
    }
  }

  const roomSides = ROOM_RECTS.flatMap((room) => [
    { room: room.id, label: "left", orientation: "vertical" as Orientation, fixed: room.minX, min: room.minZ, max: room.maxZ },
    { room: room.id, label: "right", orientation: "vertical" as Orientation, fixed: room.maxX, min: room.minZ, max: room.maxZ },
    { room: room.id, label: "front", orientation: "horizontal" as Orientation, fixed: room.minZ, min: room.minX, max: room.maxX },
    { room: room.id, label: "back", orientation: "horizontal" as Orientation, fixed: room.maxZ, min: room.minX, max: room.maxX },
  ]);

  for (const side of roomSides) {
    const sideLength = side.max - side.min;
    const covered = boundaryCoverage(side.orientation, side.fixed, side.min, side.max);

    const expectedDoorGap = DOOR_OPENINGS
      .filter((door) => {
        if (side.orientation !== "vertical") return false;
        if (Math.abs(door.x - side.fixed) > GEOMETRY_EPS) return false;
        return door.z - door.width / 2 >= side.min - GEOMETRY_EPS &&
          door.z + door.width / 2 <= side.max + GEOMETRY_EPS;
      })
      .reduce((total, door) => total + door.width, 0);

    const uncovered = sideLength - covered;

    if (Math.abs(uncovered - expectedDoorGap) > GEOMETRY_EPS) {
      errors.push(
        `${side.room} ${side.label} boundary: expected ${expectedDoorGap.toFixed(3)} m open, found ${uncovered.toFixed(3)} m open`,
      );
    }
  }

  const frontWallCoverage = boundaryCoverage("horizontal", FRONT, LEFT, RIGHT);
  const expectedFrontCoverage = BUILDING_W - MAIN_DOOR_W;

  if (Math.abs(frontWallCoverage - expectedFrontCoverage) > GEOMETRY_EPS) {
    errors.push(
      `front exterior: expected ${expectedFrontCoverage.toFixed(3)} m of wall, found ${frontWallCoverage.toFixed(3)} m`,
    );
  }

  const result: GeometryValidation = {
    valid: errors.length === 0,
    errors,
    wallCount: WALL_SEGMENTS.length,
    junctionCount,
    doorCount: DOOR_OPENINGS.length,
    roomCount: ROOM_RECTS.length,
  };

  if (result.valid) {
    console.info(
      `[Office3D] GEOMETRY VALID — ${result.wallCount} walls, ${result.junctionCount} junctions, ${result.doorCount} room doors, ${result.roomCount} rooms.`,
    );
  } else {
    console.error("[Office3D] GEOMETRY INVALID", result.errors);
  }

  return result;
}


type GeometryTransform = {
  id: string;
  label: string;
  map: (point: Point) => Point;
};

const GEOMETRY_TRANSFORMS: GeometryTransform[] = [
  { id: "identity", label: "identity", map: (p) => ({ x: p.x, z: p.z }) },
  { id: "rotate-90", label: "rotate 90°", map: (p) => ({ x: -p.z, z: p.x }) },
  { id: "rotate-180", label: "rotate 180°", map: (p) => ({ x: -p.x, z: -p.z }) },
  { id: "rotate-270", label: "rotate 270°", map: (p) => ({ x: p.z, z: -p.x }) },
  { id: "mirror-x", label: "mirror X", map: (p) => ({ x: -p.x, z: p.z }) },
  { id: "mirror-z", label: "mirror Z", map: (p) => ({ x: p.x, z: -p.z }) },
  { id: "mirror-both", label: "mirror X + Z", map: (p) => ({ x: -p.x, z: -p.z }) },
];

function boundaryCoverageForWalls(
  walls: WallSegment[],
  orientation: Orientation,
  fixed: number,
  min: number,
  max: number,
) {
  const intervals: Array<[number, number]> = [];

  for (const item of walls) {
    if (item.orientation !== orientation) continue;

    const matchesBoundary = orientation === "horizontal"
      ? Math.abs(item.start.z - fixed) <= GEOMETRY_EPS && Math.abs(item.end.z - fixed) <= GEOMETRY_EPS
      : Math.abs(item.start.x - fixed) <= GEOMETRY_EPS && Math.abs(item.end.x - fixed) <= GEOMETRY_EPS;

    if (!matchesBoundary) continue;

    const itemMin = orientation === "horizontal"
      ? Math.min(item.start.x, item.end.x)
      : Math.min(item.start.z, item.end.z);
    const itemMax = orientation === "horizontal"
      ? Math.max(item.start.x, item.end.x)
      : Math.max(item.start.z, item.end.z);

    const overlapMin = Math.max(min, itemMin);
    const overlapMax = Math.min(max, itemMax);

    if (overlapMax - overlapMin > GEOMETRY_EPS) {
      intervals.push([overlapMin, overlapMax]);
    }
  }

  return intervalUnionLength(intervals);
}

function transformedPoint(transform: GeometryTransform, point: Point) {
  return transform.map(point);
}

function transformedWalls(transform: GeometryTransform): WallSegment[] {
  return WALL_SEGMENTS.map((wall) => {
    const start = transformedPoint(transform, wall.start);
    const end = transformedPoint(transform, wall.end);
    return {
      ...wall,
      start,
      end,
      orientation:
        Math.abs(end.x - start.x) >= Math.abs(end.z - start.z)
          ? "horizontal"
          : "vertical",
    };
  });
}

function transformedRooms(transform: GeometryTransform) {
  return ROOM_RECTS.map((room) => {
    const corners = [
      transform.map({ x: room.minX, z: room.minZ }),
      transform.map({ x: room.minX, z: room.maxZ }),
      transform.map({ x: room.maxX, z: room.minZ }),
      transform.map({ x: room.maxX, z: room.maxZ }),
    ];
    return {
      ...room,
      minX: Math.min(...corners.map((p) => p.x)),
      maxX: Math.max(...corners.map((p) => p.x)),
      minZ: Math.min(...corners.map((p) => p.z)),
      maxZ: Math.max(...corners.map((p) => p.z)),
    };
  });
}

function transformedDoor(
  transform: GeometryTransform,
  door: (typeof DOOR_OPENINGS)[number],
) {
  const center = transform.map({ x: door.x, z: door.z });
  const axisPoint = transform.map({ x: door.x, z: door.z + door.width / 2 });
  return {
    ...door,
    ...center,
    orientation:
      Math.abs(axisPoint.x - center.x) >= Math.abs(axisPoint.z - center.z)
        ? ("horizontal" as Orientation)
        : ("vertical" as Orientation),
  };
}

function transformedBounds(transform: GeometryTransform, minX: number, maxX: number, minZ: number, maxZ: number) {
  const corners = [
    transform.map({ x: minX, z: minZ }),
    transform.map({ x: minX, z: maxZ }),
    transform.map({ x: maxX, z: minZ }),
    transform.map({ x: maxX, z: maxZ }),
  ];
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minZ: Math.min(...corners.map((p) => p.z)),
    maxZ: Math.max(...corners.map((p) => p.z)),
  };
}

function transformedMainEntrance(transform: GeometryTransform) {
  const center = transform.map({ x: 0, z: FRONT });
  const axisPoint = transform.map({ x: MAIN_DOOR_W / 2, z: FRONT });
  return {
    ...center,
    orientation:
      Math.abs(axisPoint.x - center.x) >= Math.abs(axisPoint.z - center.z)
        ? ("horizontal" as Orientation)
        : ("vertical" as Orientation),
  };
}

function centerlineCrossing(a: WallSegment, b: WallSegment) {
  if (a.orientation === b.orientation) return null;
  const horizontal = a.orientation === "horizontal" ? a : b;
  const vertical = a.orientation === "vertical" ? a : b;
  const point = { x: vertical.start.x, z: horizontal.start.z };
  const onHorizontal =
    point.x >= Math.min(horizontal.start.x, horizontal.end.x) - GEOMETRY_EPS &&
    point.x <= Math.max(horizontal.start.x, horizontal.end.x) + GEOMETRY_EPS;
  const onVertical =
    point.z >= Math.min(vertical.start.z, vertical.end.z) - GEOMETRY_EPS &&
    point.z <= Math.max(vertical.start.z, vertical.end.z) + GEOMETRY_EPS;
  return onHorizontal && onVertical ? point : null;
}

function validateTransformedGeometry(transform: GeometryTransform) {
  const errors: string[] = [];
  const walls = transformedWalls(transform);
  const wallRects = walls.map(getWallRect);
  const building = transformedBounds(transform, LEFT, RIGHT, FRONT, BACK);
  const corridor = transformedBounds(transform, CORRIDOR_LEFT, CORRIDOR_RIGHT, FRONT, BACK);
  const doors = DOOR_OPENINGS.map((door) => transformedDoor(transform, door));
  const mainEntrance = transformedMainEntrance(transform);

  const allowed = {
    minX: building.minX - HALF_WALL - GEOMETRY_EPS,
    maxX: building.maxX + HALF_WALL + GEOMETRY_EPS,
    minZ: building.minZ - HALF_WALL - GEOMETRY_EPS,
    maxZ: building.maxZ + HALF_WALL + GEOMETRY_EPS,
  };

  for (const rect of wallRects) {
    if (
      rect.minX < allowed.minX ||
      rect.maxX > allowed.maxX ||
      rect.minZ < allowed.minZ ||
      rect.maxZ > allowed.maxZ
    ) {
      errors.push(transform.label + ": " + rect.id + " extends outside the transformed footprint");
    }
  }

  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      const overlap = intersectionArea(wallRects[i], wallRects[j]);
      if (overlap > GEOMETRY_AREA_EPS) {
        errors.push(
          transform.label +
            ": duplicate wall volume " +
            walls[i].id +
            " ↔ " +
            walls[j].id +
            " = " +
            overlap.toFixed(6) +
            " m²",
        );
      }

      const crossing = centerlineCrossing(walls[i], walls[j]);
      if (crossing && rectDistance(wallRects[i], wallRects[j]) > GEOMETRY_EPS) {
        errors.push(
          transform.label +
            ": corner/T-junction gap at (" +
            crossing.x.toFixed(3) +
            ", " +
            crossing.z.toFixed(3) +
            ") between " +
            walls[i].id +
            " and " +
            walls[j].id,
        );
      }
    }
  }

  for (const door of doors) {
    const fixed = door.orientation === "vertical" ? door.x : door.z;
    const min = (door.orientation === "vertical" ? door.z : door.x) - door.width / 2;
    const max = (door.orientation === "vertical" ? door.z : door.x) + door.width / 2;

    for (const wall of walls) {
      if (wall.orientation !== door.orientation) continue;
      const wallFixed = wall.orientation === "vertical" ? wall.start.x : wall.start.z;
      if (Math.abs(wallFixed - fixed) > GEOMETRY_EPS) continue;

      const wallMin = wall.orientation === "vertical"
        ? Math.min(wall.start.z, wall.end.z)
        : Math.min(wall.start.x, wall.end.x);
      const wallMax = wall.orientation === "vertical"
        ? Math.max(wall.start.z, wall.end.z)
        : Math.max(wall.start.x, wall.end.x);

      if (Math.max(0, Math.min(wallMax, max) - Math.max(wallMin, min)) > GEOMETRY_EPS) {
        errors.push(transform.label + ": doorway " + door.id + " is blocked by " + wall.id);
      }
    }
  }

  const corridorClear = {
    minX: corridor.minX + HALF_WALL,
    maxX: corridor.maxX - HALF_WALL,
    minZ: corridor.minZ + HALF_WALL,
    maxZ: corridor.maxZ - HALF_WALL,
  };
  const corridorRect: WallRect = { id: "corridor", ...corridorClear };

  for (const rect of wallRects) {
    const overlap = intersectionArea(rect, corridorRect);
    if (overlap > GEOMETRY_AREA_EPS) {
      errors.push(
        transform.label +
          ": " +
          rect.id +
          " intrudes into the clear corridor by " +
          overlap.toFixed(6) +
          " m²",
      );
    }
  }

  const rooms = transformedRooms(transform);
  for (const room of rooms) {
    const sides = [
      { orientation: "vertical" as Orientation, fixed: room.minX, min: room.minZ, max: room.maxZ },
      { orientation: "vertical" as Orientation, fixed: room.maxX, min: room.minZ, max: room.maxZ },
      { orientation: "horizontal" as Orientation, fixed: room.minZ, min: room.minX, max: room.maxX },
      { orientation: "horizontal" as Orientation, fixed: room.maxZ, min: room.minX, max: room.maxX },
    ];

    for (const side of sides) {
      const sideLength = side.max - side.min;
      const covered = boundaryCoverageForWalls(walls, side.orientation, side.fixed, side.min, side.max);
      const expectedDoorGap = doors
        .filter((door) => {
          if (door.orientation !== side.orientation) return false;
          const fixed = door.orientation === "vertical" ? door.x : door.z;
          const min = door.orientation === "vertical" ? door.z - door.width / 2 : door.x - door.width / 2;
          const max = door.orientation === "vertical" ? door.z + door.width / 2 : door.x + door.width / 2;
          return (
            Math.abs(fixed - side.fixed) <= GEOMETRY_EPS &&
            min >= side.min - GEOMETRY_EPS &&
            max <= side.max + GEOMETRY_EPS
          );
        })
        .reduce((total, door) => total + door.width, 0);

      if (Math.abs(sideLength - covered - expectedDoorGap) > GEOMETRY_EPS) {
        errors.push(
          transform.label +
            ": room boundary has an incorrect opening on " +
            room.id +
            " (expected " +
            expectedDoorGap.toFixed(3) +
            " m, found " +
            (sideLength - covered).toFixed(3) +
            " m)",
        );
      }
    }
  }

  const entranceFixed = mainEntrance.orientation === "horizontal" ? mainEntrance.z : mainEntrance.x;
  const entranceMin = (mainEntrance.orientation === "horizontal" ? mainEntrance.x : mainEntrance.z) - MAIN_DOOR_W / 2;
  const entranceMax = (mainEntrance.orientation === "horizontal" ? mainEntrance.x : mainEntrance.z) + MAIN_DOOR_W / 2;

  for (const wall of walls) {
    if (wall.orientation !== mainEntrance.orientation) continue;
    const fixed = wall.orientation === "horizontal" ? wall.start.z : wall.start.x;
    if (Math.abs(fixed - entranceFixed) > GEOMETRY_EPS) continue;

    const wallMin = wall.orientation === "horizontal"
      ? Math.min(wall.start.x, wall.end.x)
      : Math.min(wall.start.z, wall.end.z);
    const wallMax = wall.orientation === "horizontal"
      ? Math.max(wall.start.x, wall.end.x)
      : Math.max(wall.start.z, wall.end.z);

    if (Math.max(0, Math.min(wallMax, entranceMax) - Math.max(wallMin, entranceMin)) > GEOMETRY_EPS) {
      errors.push(transform.label + ": 2 m main entrance is blocked by " + wall.id);
    }
  }

  return errors;
}

function validateTransformedVariants() {
  const errors: string[] = [];

  for (const transform of GEOMETRY_TRANSFORMS) {
    const transformErrors = validateTransformedGeometry(transform);
    if (transformErrors.length === 0) {
      console.info("[Office3D] TRANSFORM VALID — " + transform.label);
    } else {
      errors.push(...transformErrors);
      console.error("[Office3D] TRANSFORM INVALID — " + transform.label, transformErrors);
    }
  }

  if (errors.length === 0) {
    console.info(
      "[Office3D] ALL ROTATION/MIRROR CHECKS VALID — " +
        GEOMETRY_TRANSFORMS.length +
        " transforms",
    );
  }

  return errors;
}


function validateFloorPlan(): GeometryValidation {
  const base = validateBaseFloorPlan();
  const transformErrors = validateTransformedVariants();
  return {
    ...base,
    valid: base.valid && transformErrors.length === 0,
    errors: [...base.errors, ...transformErrors],
  };
}

function meshBox(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

/*
 * Render wall boxes from the exact same footprint used by the geometry
 * validator. The old renderer used the trimmed centerline length directly,
 * so each box stopped at the centerline endpoint and left a visible gap at
 * every corner/T-junction. getWallRect() includes the 0.10 m half-thickness
 * on the long axis as well, so using it here keeps rendering and validation
 * on one geometry definition.
 */
function addWallSegment(scene: THREE.Scene, item: WallSegment, material: THREE.Material) {
  const rect = getWallRect(item);
  const width = rect.maxX - rect.minX;
  const depth = rect.maxZ - rect.minZ;

  if (width <= 0 || depth <= 0) return;

  const mesh = meshBox(width, WALL_HEIGHT, depth, material);
  mesh.position.set(
    (rect.minX + rect.maxX) / 2,
    WALL_HEIGHT / 2,
    (rect.minZ + rect.maxZ) / 2,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.wallId = item.id;
  scene.add(mesh);
}

function getConnectedJointPoints() {
  const points: Point[] = [];

  const addPoint = (point: Point) => {
    if (!points.some((existing) => samePoint(existing, point))) {
      points.push(point);
    }
  };

  for (let i = 0; i < WALL_SEGMENTS.length; i += 1) {
    for (let j = i + 1; j < WALL_SEGMENTS.length; j += 1) {
      const a = WALL_SEGMENTS[i];
      const b = WALL_SEGMENTS[j];

      const sharedEndpoints = [
        [a.start, b.start],
        [a.start, b.end],
        [a.end, b.start],
        [a.end, b.end],
      ] as Array<[Point, Point]>;

      for (const [left, right] of sharedEndpoints) {
        if (samePoint(left, right)) addPoint(left);
      }

      const crossing = centerlineCrossing(a, b);
      if (crossing) {
        const isEndpoint =
          samePoint(crossing, a.start) ||
          samePoint(crossing, a.end) ||
          samePoint(crossing, b.start) ||
          samePoint(crossing, b.end);

        if (isEndpoint) addPoint(crossing);
      }
    }
  }

  return points;
}

function addWallJointCaps(scene: THREE.Scene, material: THREE.Material) {
  /*
   * A small 0.24 m × 0.24 m solid at each real wall junction removes
   * sub-pixel seams where two independently rendered wall boxes meet only
   * along an edge/corner. These caps do not occupy corridor door openings
   * because only connected wall junctions are included.
   */
  const jointSize = WALL + 0.04;

  for (const point of getConnectedJointPoints()) {
    const joint = meshBox(jointSize, WALL_HEIGHT, jointSize, material);
    joint.position.set(point.x, WALL_HEIGHT / 2, point.z);
    joint.castShadow = true;
    joint.receiveShadow = true;
    joint.userData.wallJoint = true;
    scene.add(joint);
  }
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

  const buildingCenterZ = (FRONT + BACK) / 2;
  const floor = meshBox(BUILDING_W, 0.12, BUILDING_D, floorMaterial);
  floor.position.set(0, 0.06, buildingCenterZ);
  floor.receiveShadow = true;
  scene.add(floor);

  const corridorFloor = meshBox(CORRIDOR_W, 0.025, BUILDING_D - 0.4, corridorMaterial);
  corridorFloor.position.set(0, 0.125, buildingCenterZ);
  corridorFloor.receiveShadow = true;
  scene.add(corridorFloor);

  const grid = new THREE.GridHelper(BUILDING_W, BUILDING_W, 0xb9c2cb, 0xd5dbe1);
  grid.position.set(0, 0.14, buildingCenterZ);
  grid.scale.z = BUILDING_D / BUILDING_W;
  scene.add(grid);

  for (const item of WALL_SEGMENTS) addWallSegment(scene, item, wallMaterial);
  addWallJointCaps(scene, wallMaterial);

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
  addLabel(scene, "MANAGER'S OFFICE · 5 × 5 m", -3.5, 10);
  addLabel(scene, "DIRECTOR'S OFFICE · 5 × 5 m", 3.5, 10);
  addLabel(scene, "2 m CORRIDOR", 0, 2.5, 0x4a5d73);
  addLabel(scene, "MAIN ENTRANCE", 0, FRONT + 0.75, 0x4a5d73);

  scene.userData.roomRects = ROOM_RECTS;
  scene.userData.corridor = { minX: -1, maxX: 1, minZ: FRONT, maxZ: BACK };
  scene.userData.wallThickness = WALL;
  return validateFloorPlan();
}

export default function Office3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce8e5);
    scene.fog = new THREE.Fog(0xdce8e5, 35, 60);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
    camera.position.set(20, 23, -22);

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
    controls.target.set(0, 0, (FRONT + BACK) / 2);

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
    foundation.position.set(0, -0.3, (FRONT + BACK) / 2);
    foundation.receiveShadow = true;
    scene.add(foundation);

    const geometryValidation = buildFloorPlan(scene);
    scene.userData.geometryValidation = geometryValidation;

    const geometryBadge = mount.querySelector(".office-geometry-status");
    if (geometryBadge) {
      geometryBadge.textContent = geometryValidation.valid ? "GEOMETRY VALID" : "GEOMETRY INVALID";
      geometryBadge.setAttribute("data-valid", String(geometryValidation.valid));
      geometryBadge.setAttribute(
        "title",
        geometryValidation.valid
          ? `${geometryValidation.wallCount} walls · ${geometryValidation.junctionCount} junctions · ${geometryValidation.doorCount} doors · ${geometryValidation.roomCount} rooms`
          : geometryValidation.errors.join(" | "),
      );
    }

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
    <div ref={mountRef} className="office-3d-viewer" aria-label="Interactive eight-space office floor plan">
      <div className="office-3d-help">
        <strong>Buildable eight-space floor plan</strong>
        <span>12 × 20 m · 2 m corridor · 1 m room doors · 2 m main entrance · 0.20 m walls</span>
      </div>
      <div className="office-3d-badge">FLOOR PLAN</div>
      <div className="office-geometry-status" data-valid="false">CHECKING GEOMETRY…</div>
    </div>
  );
}

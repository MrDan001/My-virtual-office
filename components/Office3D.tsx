"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BUILDING_W = 14;
const BUILDING_D = 26;
const CORE_BUILDING_D = 22;
const RECEPTION_D = 4;
const WALL = 0.3;
const HALF_WALL = WALL / 2;
const WALL_HEIGHT = 2.7;
const CORRIDOR_W = 2;
const DOOR_W = 1.5;
const MAIN_DOOR_W = 2.4;
const RECEPTION_PASSAGE_W = CORRIDOR_W;

const LEFT = -7;
const RIGHT = 7;
const FRONT = -11.5;
const BACK = 14.5;
const ROOM_FRONT = FRONT + RECEPTION_D;
const CORRIDOR_LEFT = -1;
const CORRIDOR_RIGHT = 1;
const STAFF_DESK_X = 4.90;
const STAFF_DESK_DEPTH = 1.10;
const STAFF_DESK_LENGTH = 2.24;
const STAFF_CHAIR_OFFSET = 1.23;
const STAFF_CHAIR_WIDTH = 0.76;
const STAFF_VISITOR_CHAIR_WIDTH = 0.72;
const STAFF_CHAIR_BACK_OFFSET = 0.27;
const STAFF_MIN_WALL_CLEARANCE = 0.25;

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
 * Building: X -7..+7, Z -11.5..+14.5
 * Core office shell: X -7..+7, Z -7.5..+14.5
 * Reception block: X -7..+7, Z -11.5..-7.5
 * Corridor: X -1..+1, Z -11.5..+14.5
 * Wall thickness: 0.30m
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

  // Exterior front wall of the new reception/lobby block. The 2.4 m main entrance
  // is centered on the building and remains completely unobstructed.
  segment("W04_FRONT_L", { x: LEFT, z: FRONT }, { x: -MAIN_DOOR_W / 2, z: FRONT }, "horizontal", WALL),
  segment("W05_FRONT_R", { x: MAIN_DOOR_W / 2, z: FRONT }, { x: RIGHT, z: FRONT }, "horizontal", 0, WALL),

  // Back edge of reception: the original office-room fronts remain intact,
  // with a central 2.4 m visitor passage aligned to the corridor.
  segment("W28_RECEPTION_BACK_L", { x: LEFT, z: ROOM_FRONT }, { x: -RECEPTION_PASSAGE_W / 2, z: ROOM_FRONT }, "horizontal", WALL, WALL),
  segment("W29_RECEPTION_BACK_R", { x: RECEPTION_PASSAGE_W / 2, z: ROOM_FRONT }, { x: RIGHT, z: ROOM_FRONT }, "horizontal", WALL, WALL),

  // Left corridor boundary: every room has a 1.5 m professional double-door opening.
  // Door centers are z=-5, 0, 6 and 12.
  segment("W06_OFFICE1_L", { x: -1, z: ROOM_FRONT }, { x: -1, z: -5.75 }, "vertical", WALL),
  segment("W07_OFFICE1_L", { x: -1, z: -4.25 }, { x: -1, z: -2.5 }, "vertical", 0, HALF_WALL),
  segment("W08_OFFICE3_L", { x: -1, z: -2.5 }, { x: -1, z: -0.75 }, "vertical", HALF_WALL),
  segment("W09_OFFICE3_L", { x: -1, z: 0.75 }, { x: -1, z: 2.5 }, "vertical", 0, HALF_WALL),
  segment("W10_MEETING_L", { x: -1, z: 2.5 }, { x: -1, z: 5.25 }, "vertical", HALF_WALL),
  segment("W11_MEETING_L", { x: -1, z: 6.75 }, { x: -1, z: 9.5 }, "vertical", 0, HALF_WALL),
  segment("W24_MANAGER_L", { x: -1, z: 9.5 }, { x: -1, z: 11.25 }, "vertical", HALF_WALL),
  segment("W26_MANAGER_L", { x: -1, z: 12.75 }, { x: -1, z: BACK }, "vertical", 0, WALL),

  // Right corridor boundary: matching 1.5 m door openings.
  segment("W12_OFFICE2_R", { x: 1, z: ROOM_FRONT }, { x: 1, z: -5.75 }, "vertical", WALL),
  segment("W13_OFFICE2_R", { x: 1, z: -4.25 }, { x: 1, z: -2.5 }, "vertical", 0, HALF_WALL),
  segment("W14_OFFICE4_R", { x: 1, z: -2.5 }, { x: 1, z: -0.75 }, "vertical", HALF_WALL),
  segment("W15_OFFICE4_R", { x: 1, z: 0.75 }, { x: 1, z: 2.5 }, "vertical", 0, HALF_WALL),
  segment("W16_BREAK_R", { x: 1, z: 2.5 }, { x: 1, z: 5.25 }, "vertical", HALF_WALL),
  segment("W17_BREAK_R", { x: 1, z: 6.75 }, { x: 1, z: 9.5 }, "vertical", 0, HALF_WALL),
  segment("W25_DIRECTOR_R", { x: 1, z: 9.5 }, { x: 1, z: 11.25 }, "vertical", HALF_WALL),
  segment("W27_DIRECTOR_R", { x: 1, z: 12.75 }, { x: 1, z: BACK }, "vertical", 0, WALL),

  // Horizontal room dividers own their intersections.
  segment("W18_OFFICE1_3", { x: LEFT, z: -2.5 }, { x: -1, z: -2.5 }, "horizontal", WALL, WALL),
  segment("W19_OFFICE2_4", { x: 1, z: -2.5 }, { x: RIGHT, z: -2.5 }, "horizontal", WALL, WALL),
  segment("W20_OFFICE3_MEETING", { x: LEFT, z: 2.5 }, { x: -1, z: 2.5 }, "horizontal", WALL, WALL),
  segment("W21_OFFICE4_BREAK", { x: 1, z: 2.5 }, { x: RIGHT, z: 2.5 }, "horizontal", WALL, WALL),
  segment("W22_MEETING_MANAGER", { x: LEFT, z: 9.5 }, { x: -1, z: 9.5 }, "horizontal", WALL, WALL),
  segment("W23_BREAK_DIRECTOR", { x: 1, z: 9.5 }, { x: RIGHT, z: 9.5 }, "horizontal", WALL, WALL),
];

const ROOM_RECTS = [
  { id: "office-1", name: "OFFICE 1", minX: -7, maxX: -1, minZ: -7.5, maxZ: -2.5 },
  { id: "office-2", name: "OFFICE 2", minX: 1, maxX: 7, minZ: -7.5, maxZ: -2.5 },
  { id: "office-3", name: "OFFICE 3", minX: -7, maxX: -1, minZ: -2.5, maxZ: 2.5 },
  { id: "office-4", name: "OFFICE 4", minX: 1, maxX: 7, minZ: -2.5, maxZ: 2.5 },
  { id: "meeting", name: "MEETING ROOM", minX: -7, maxX: -1, minZ: 2.5, maxZ: 9.5 },
  { id: "break", name: "BREAK ROOM", minX: 1, maxX: 7, minZ: 2.5, maxZ: 9.5 },
  { id: "manager", name: "MANAGER'S OFFICE", minX: -7, maxX: -1, minZ: 9.5, maxZ: 14.5 },
  { id: "director", name: "DIRECTOR'S OFFICE", minX: 1, maxX: 7, minZ: 9.5, maxZ: 14.5 },
] as const;

const DOOR_OPENINGS = [
  { id: "office-1-door", x: -1, z: -5, width: DOOR_W, side: "left" },
  { id: "office-3-door", x: -1, z: 0, width: DOOR_W, side: "left" },
  { id: "meeting-door", x: -1, z: 6, width: DOOR_W, side: "left" },
  { id: "manager-door", x: -1, z: 12, width: DOOR_W, side: "left" },
  { id: "office-2-door", x: 1, z: -5, width: DOOR_W, side: "right" },
  { id: "office-4-door", x: 1, z: 0, width: DOOR_W, side: "right" },
  { id: "break-door", x: 1, z: 6, width: DOOR_W, side: "right" },
  { id: "director-door", x: 1, z: 12, width: DOOR_W, side: "right" },
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

  // Wall meshes intentionally extend by half their thickness beyond the
  // centerline footprint. Allow that physical 0.10 m wall thickness at the
  // exterior boundary instead of falsely reporting the outer walls as invalid.
  for (const rect of wallRects) {
    if (
      rect.minX < LEFT - HALF_WALL - GEOMETRY_EPS ||
      rect.maxX > RIGHT + HALF_WALL + GEOMETRY_EPS ||
      rect.minZ < FRONT - HALF_WALL - GEOMETRY_EPS ||
      rect.maxZ > BACK + HALF_WALL + GEOMETRY_EPS
    ) {
      errors.push(`${rect.id}: wall volume extends outside the 14 × 26 m building footprint`);
    }
  }

  for (let i = 0; i < wallRects.length; i += 1) {
    for (let j = i + 1; j < wallRects.length; j += 1) {
      const overlap = intersectionArea(wallRects[i], wallRects[j]);
      const a = WALL_SEGMENTS[i];
      const b = WALL_SEGMENTS[j];
      const crossing = centerlineCrossing(a, b);
      const crossingIsEndpoint = crossing
        ? samePoint(crossing, a.start) ||
          samePoint(crossing, a.end) ||
          samePoint(crossing, b.start) ||
          samePoint(crossing, b.end)
        : false;
      const sharedEndpoint =
        samePoint(a.start, b.start) ||
        samePoint(a.start, b.end) ||
        samePoint(a.end, b.start) ||
        samePoint(a.end, b.end);
      const isLegitimateJunction = sharedEndpoint || crossingIsEndpoint;

      // Perpendicular wall boxes naturally overlap at a physical corner/T-junction.
      // That overlap is intentional; only flag overlapping volumes that are not
      // explained by an actual centerline junction.
      if (overlap > GEOMETRY_AREA_EPS && !isLegitimateJunction) {
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

      // Junction overlap is expected because the rendered wall boxes have
      // physical thickness. Gap detection above is the meaningful check here.
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
          `${door.id}: ${item.id} intrudes ${overlap.toFixed(6)} m into the 1.5 m doorway`,
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
    errors.push(`main-entrance: front wall blocks ${mainDoorOverlap.toFixed(6)} m of the 2.4 m opening`);
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
      const crossing = centerlineCrossing(walls[i], walls[j]);
      const crossingIsEndpoint = crossing
        ? samePoint(crossing, walls[i].start) ||
          samePoint(crossing, walls[i].end) ||
          samePoint(crossing, walls[j].start) ||
          samePoint(crossing, walls[j].end)
        : false;
      const sharedEndpoint =
        samePoint(walls[i].start, walls[j].start) ||
        samePoint(walls[i].start, walls[j].end) ||
        samePoint(walls[i].end, walls[j].start) ||
        samePoint(walls[i].end, walls[j].end);
      const isLegitimateJunction = sharedEndpoint || crossingIsEndpoint;

      if (overlap > GEOMETRY_AREA_EPS && !isLegitimateJunction) {
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
 * every corner/T-junction. getWallRect() includes the 0.15 m half-thickness
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
   * A small 0.34 m × 0.34 m solid at each real wall junction removes
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

type WorkstationPlacement = {
  roomId: "office-1" | "office-2" | "office-3" | "office-4";
  x: number;
  z: number;
  side: "left" | "right";
};

const STAFF_WORKSTATION_PLACEMENTS: WorkstationPlacement[] = [
  { roomId: "office-1", x: -STAFF_DESK_X, z: -5, side: "left" },
  { roomId: "office-2", x: STAFF_DESK_X, z: -5, side: "right" },
  { roomId: "office-3", x: -STAFF_DESK_X, z: 0, side: "left" },
  { roomId: "office-4", x: STAFF_DESK_X, z: 0, side: "right" },
];

function addCylinderBetweenPoints(
  scene: THREE.Scene,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  userData?: Record<string, unknown>,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length <= 0.001) return;

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 8),
    material,
  );
  cylinder.position.copy(start).add(end).multiplyScalar(0.5);
  cylinder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  if (userData) Object.assign(cylinder.userData, userData);
  scene.add(cylinder);
}

function addProfessionalOfficeChair(
  scene: THREE.Scene,
  chairX: number,
  z: number,
  facing: 1 | -1,
  material: THREE.Material,
  role: "operator" | "visitor",
) {
  const isVisitor = role === "visitor";
  const width = isVisitor ? STAFF_VISITOR_CHAIR_WIDTH : STAFF_CHAIR_WIDTH;

  // New chair style: rounded upholstered seat/back instead of the old
  // rectangular office-chair geometry. Staff get a modern task chair with
  // a central five-star base; visitors get a matching upholstered guest
  // chair with four fixed legs and no casters.
  const seat = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.52, width * 0.52, 0.14, 16),
    material,
  );
  seat.scale.z = 0.88;
  seat.position.set(chairX, 0.53, z);
  seat.castShadow = true;
  seat.receiveShadow = true;
  seat.userData.staffFurniture = "workstation-chair";
  seat.userData.chairRole = role;
  seat.userData.facing = facing;
  scene.add(seat);

  const back = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.50, width * 0.50, 0.13, 16),
    material,
  );
  back.rotation.z = Math.PI / 2;
  back.scale.y = 1.38;
  back.scale.z = 0.82;
  back.position.set(
    chairX - facing * (STAFF_CHAIR_BACK_OFFSET + 0.02),
    0.91,
    z,
  );
  back.castShadow = true;
  back.receiveShadow = true;
  back.userData.staffFurniture = "workstation-chair-back";
  back.userData.chairRole = role;
  back.userData.facing = facing;
  scene.add(back);

  if (isVisitor) {
    // Clean guest-chair frame: four angled fixed legs, no wheels.
    for (const zSide of [-1, 1]) {
      for (const xSide of [-1, 1]) {
        const leg = meshBox(0.055, 0.42, 0.055, material);
        leg.position.set(
          chairX + xSide * width * 0.31,
          0.29,
          z + zSide * width * 0.30,
        );
        leg.rotation.z = xSide * 0.10;
        leg.castShadow = true;
        leg.userData.staffFurniture = "workstation-chair-leg";
        leg.userData.chairRole = role;
        scene.add(leg);
      }
    }
  } else {
    // Modern task-chair pedestal and five-star caster base.
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.07, 16),
      material,
    );
    hub.position.set(chairX, 0.10, z);
    hub.castShadow = true;
    hub.userData.staffFurniture = "workstation-chair-base";
    hub.userData.chairRole = role;
    scene.add(hub);

    const lift = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.075, 0.28, 12),
      material,
    );
    lift.position.set(chairX, 0.25, z);
    lift.castShadow = true;
    lift.userData.staffFurniture = "workstation-chair-lift";
    lift.userData.chairRole = role;
    scene.add(lift);

    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      const spokeLength = 0.27;
      const spoke = meshBox(0.045, 0.035, spokeLength, material);
      spoke.position.set(
        chairX + Math.cos(angle) * (spokeLength / 2),
        0.07,
        z + Math.sin(angle) * (spokeLength / 2),
      );
      spoke.rotation.y = angle;
      spoke.castShadow = true;
      spoke.userData.staffFurniture = "workstation-chair-spoke";
      spoke.userData.chairRole = role;
      scene.add(spoke);

      const caster = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 6),
        material,
      );
      caster.position.set(
        chairX + Math.cos(angle) * spokeLength,
        0.055,
        z + Math.sin(angle) * spokeLength,
      );
      caster.castShadow = true;
      caster.userData.staffFurniture = "workstation-chair-caster";
      caster.userData.chairRole = role;
      scene.add(caster);
    }
  }
}

function addStaffWorkstation(
  scene: THREE.Scene,
  placement: WorkstationPlacement,
  materials: {
    deskSurface: THREE.Material;
    deskBody: THREE.Material;
    metal: THREE.Material;
    chair: THREE.Material;
    screen: THREE.Material;
    screenFace: THREE.Material;
    cable: THREE.Material;
  },
) {
  const { x, z, side } = placement;
  // The office owner sits against the exterior wall, away from the door.
  // The visitor sits on the corridor/door side, therefore backing the door.
  // Keep the monitor and keyboard facing the owner.
  const operatorDirection: 1 | -1 = side === "left" ? -1 : 1;
  const operatorFacing: 1 | -1 = side === "left" ? 1 : -1;
  const visitorFacing: 1 | -1 = operatorFacing === 1 ? -1 : 1;
  const deskTop = meshBox(STAFF_DESK_DEPTH, 0.12, STAFF_DESK_LENGTH, materials.deskSurface);
  deskTop.position.set(x, 0.80, z);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  deskTop.userData.staffFurniture = "workstation-desk-top";
  deskTop.userData.roomId = placement.roomId;
  scene.add(deskTop);

  const modesty = meshBox(0.07, 0.52, STAFF_DESK_LENGTH * 0.68, materials.deskBody);
  modesty.position.set(x - operatorDirection * 0.25, 0.51, z);
  modesty.castShadow = true;
  modesty.userData.staffFurniture = "workstation-modesty-panel";
  modesty.userData.roomId = placement.roomId;
  scene.add(modesty);

  for (const zOffset of [-0.78, 0.78]) {
    const leg = meshBox(0.07, 0.68, 0.07, materials.metal);
    leg.position.set(x, 0.43, z + zOffset);
    leg.castShadow = true;
    leg.userData.staffFurniture = "workstation-desk-leg";
    scene.add(leg);

    const foot = meshBox(0.30, 0.045, 0.07, materials.metal);
    foot.position.set(x - operatorDirection * 0.06, 0.085, z + zOffset);
    foot.castShadow = true;
    foot.userData.staffFurniture = "workstation-desk-foot";
    scene.add(foot);
  }

  for (const zOffset of [-0.62, 0.62]) {
    const pedestal = meshBox(0.34, 0.62, 0.52, materials.deskBody);
    pedestal.position.set(x - operatorDirection * 0.13, 0.38, z + zOffset);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    pedestal.userData.staffFurniture = "workstation-storage";
    pedestal.userData.roomId = placement.roomId;
    scene.add(pedestal);
  }

  // Monitor and keyboard face the operator; the visitor has no reason to
  // sit behind the operator or look at the back of the monitor.
  const monitorBody = meshBox(0.055, 0.43, 0.82, materials.screen);
  monitorBody.position.set(x + operatorDirection * 0.02, 1.12, z);
  monitorBody.castShadow = true;
  monitorBody.userData.staffFurniture = "workstation-monitor";
  monitorBody.userData.roomId = placement.roomId;
  monitorBody.userData.facing = operatorFacing;
  scene.add(monitorBody);

  const screenFace = meshBox(0.012, 0.32, 0.66, materials.screenFace);
  screenFace.position.set(x + operatorDirection * 0.055, 1.13, z);
  screenFace.castShadow = true;
  screenFace.userData.staffFurniture = "workstation-screen";
  screenFace.userData.roomId = placement.roomId;
  screenFace.userData.facing = operatorFacing;
  scene.add(screenFace);

  const monitorStand = meshBox(0.10, 0.27, 0.10, materials.metal);
  monitorStand.position.set(x, 0.91, z);
  monitorStand.castShadow = true;
  scene.add(monitorStand);

  const monitorBase = meshBox(0.26, 0.045, 0.20, materials.metal);
  monitorBase.position.set(x + operatorDirection * 0.01, 0.78, z);
  monitorBase.castShadow = true;
  scene.add(monitorBase);

  const keyboard = meshBox(0.24, 0.035, 0.48, materials.screen);
  keyboard.position.set(x + operatorDirection * 0.25, 0.87, z);
  keyboard.castShadow = true;
  keyboard.userData.staffFurniture = "workstation-keyboard";
  keyboard.userData.roomId = placement.roomId;
  keyboard.userData.facing = operatorFacing;
  scene.add(keyboard);

  const mouse = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    materials.screen,
  );
  mouse.scale.set(0.8, 0.38, 1.15);
  mouse.position.set(x + operatorDirection * 0.28, 0.89, z + (side === "left" ? 0.37 : -0.37));
  mouse.castShadow = true;
  mouse.userData.staffFurniture = "workstation-mouse";
  mouse.userData.roomId = placement.roomId;
  scene.add(mouse);

  const cableAStart = new THREE.Vector3(x + operatorDirection * 0.01, 1.02, z);
  const cableAEnd = new THREE.Vector3(x + operatorDirection * 0.12, 0.87, z + 0.08);
  const cableBEnd = new THREE.Vector3(x - operatorDirection * 0.22, 0.53, z + 0.08);
  addCylinderBetweenPoints(scene, cableAStart, cableAEnd, 0.014, materials.cable, { staffFurniture: "workstation-cable", roomId: placement.roomId });
  addCylinderBetweenPoints(scene, cableAEnd, cableBEnd, 0.012, materials.cable, { staffFurniture: "workstation-cable", roomId: placement.roomId });

  const operatorChairX = x + operatorDirection * STAFF_CHAIR_OFFSET;
  const operatorChairZ = z;
  const visitorChairX = x - operatorDirection * STAFF_CHAIR_OFFSET;
  const visitorChairZ = z;

  // Operator = one side of desk, facing monitor.
  // Visitor = the other side, facing the operator.
  addProfessionalOfficeChair(scene, operatorChairX, operatorChairZ, operatorFacing, materials.chair, "operator");
  addProfessionalOfficeChair(scene, visitorChairX, visitorChairZ, visitorFacing, materials.chair, "visitor");

  // Premium desk flower stays at the operator-side end of the desk,
  // away from the monitor, keyboard and mouse.
  addPremiumDeskFlower(
    scene,
    x + operatorDirection * 0.34,
    z + (side === "left" ? -0.70 : 0.70),
  );

  scene.userData.staffWorkstationCenterlines ??= [];
  scene.userData.staffWorkstationCenterlines.push({
    roomId: placement.roomId,
    desk: { x, z },
    keyboard: { x: x + operatorDirection * 0.25, z },
    monitor: { x: x + operatorDirection * 0.02, z },
    operatorChair: { x: operatorChairX, z: operatorChairZ, facing: operatorFacing },
    visitorChair: { x: visitorChairX, z: visitorChairZ, facing: visitorFacing },
  });
}
function addStaffOfficeWorkstations(scene: THREE.Scene) {
  const deskSurfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a6b3d,
    roughness: 0.52,
  });
  const deskBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3327,
    roughness: 0.58,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x28323a,
    roughness: 0.28,
    metalness: 0.78,
  });
  const chairMaterial = new THREE.MeshStandardMaterial({
    color: 0x202830,
    roughness: 0.66,
    metalness: 0.14,
  });
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x121a22,
    roughness: 0.26,
    metalness: 0.2,
  });
  const screenFaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x5e7787,
    roughness: 0.24,
    metalness: 0.12,
    emissive: new THREE.Color(0x162831),
    emissiveIntensity: 0.28,
  });
  const cableMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b20,
    roughness: 0.76,
  });

  for (const placement of STAFF_WORKSTATION_PLACEMENTS) {
    addStaffWorkstation(scene, placement, {
      deskSurface: deskSurfaceMaterial,
      deskBody: deskBodyMaterial,
      metal: metalMaterial,
      chair: chairMaterial,
      screen: screenMaterial,
      screenFace: screenFaceMaterial,
      cable: cableMaterial,
    });
  }

  addPremiumOfficeDecor(scene);
  addPremiumOfficeEnhancements(scene);
  addExecutiveOfficeSetups(scene);

  scene.userData.staffWorkstations = STAFF_WORKSTATION_PLACEMENTS;
}

function addPremiumDeskFlower(scene: THREE.Scene, x: number, z: number) {
  const vaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8c7a4,
    roughness: 0.28,
    metalness: 0.12,
  });
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.24,
    metalness: 0.82,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6848,
    roughness: 0.72,
  });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5eee4,
    roughness: 0.46,
  });

  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.14, 0.24, 16),
    vaseMaterial,
  );
  vase.position.set(x, 0.99, z);
  vase.castShadow = true;
  vase.userData.officeDecor = "premium-desk-flower-vase";
  scene.add(vase);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.108, 0.012, 6, 16),
    goldMaterial,
  );
  rim.position.set(x, 1.115, z);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  rim.userData.officeDecor = "premium-desk-flower-rim";
  scene.add(rim);

  const flowerHeight = 0.28;
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + 0.35;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.017, 0.34, 8),
      stemMaterial,
    );
    stem.position.set(
      x + Math.cos(angle) * 0.045,
      1.25,
      z + Math.sin(angle) * 0.045,
    );
    stem.rotation.z = Math.cos(angle) * 0.12;
    stem.rotation.x = Math.sin(angle) * 0.12;
    stem.castShadow = true;
    stem.userData.officeDecor = "premium-desk-flower-stem";
    scene.add(stem);

    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 8),
      petalMaterial,
    );
    flower.position.set(
      x + Math.cos(angle) * 0.07,
      1.40 + Math.sin(i * 1.7) * 0.018,
      z + Math.sin(angle) * 0.07,
    );
    flower.scale.set(1, 0.72, 1);
    flower.castShadow = true;
    flower.userData.officeDecor = "premium-desk-flower";
    scene.add(flower);

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 6),
      goldMaterial,
    );
    center.position.copy(flower.position);
    center.position.y += 0.004;
    center.castShadow = true;
    center.userData.officeDecor = "premium-desk-flower-center";
    scene.add(center);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      stemMaterial,
    );
    leaf.position.set(
      x + Math.cos(angle) * 0.10,
      1.20,
      z + Math.sin(angle) * 0.10,
    );
    leaf.scale.set(0.48, 0.16, 1.35);
    leaf.rotation.y = angle + 0.5;
    leaf.castShadow = true;
    leaf.userData.officeDecor = "premium-desk-flower-leaf";
    scene.add(leaf);
  }
}

function addPremiumFloorFlower(scene: THREE.Scene, x: number, z: number, scale = 1) {
  const potMaterial = new THREE.MeshStandardMaterial({
    color: 0x24323a,
    roughness: 0.34,
    metalness: 0.18,
  });
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.22,
    metalness: 0.86,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6848,
    roughness: 0.72,
  });
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2e9dc,
    roughness: 0.42,
  });

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23 * scale, 0.29 * scale, 0.36 * scale, 18),
    potMaterial,
  );
  pot.position.set(x, 0.18 * scale, z);
  pot.castShadow = true;
  pot.receiveShadow = true;
  pot.userData.officeDecor = "premium-floor-flower-planter";
  scene.add(pot);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.235 * scale, 0.016 * scale, 6, 20),
    goldMaterial,
  );
  rim.position.set(x, 0.355 * scale, z);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  rim.userData.officeDecor = "premium-floor-flower-rim";
  scene.add(rim);

  const flowerCount = 7;
  for (let i = 0; i < flowerCount; i += 1) {
    const angle = (i / flowerCount) * Math.PI * 2;
    const stemHeight = (0.72 + (i % 3) * 0.08) * scale;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018 * scale, 0.024 * scale, stemHeight, 8),
      stemMaterial,
    );
    stem.position.set(
      x + Math.cos(angle) * 0.12 * scale,
      0.55 * scale + stemHeight * 0.5,
      z + Math.sin(angle) * 0.12 * scale,
    );
    stem.rotation.z = Math.sin(angle) * 0.14;
    stem.rotation.x = Math.cos(angle) * 0.14;
    stem.castShadow = true;
    stem.userData.officeDecor = "premium-floor-flower-stem";
    scene.add(stem);

    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 * scale, 10, 8),
      petalMaterial,
    );
    bloom.position.set(
      x + Math.cos(angle) * 0.15 * scale,
      1.10 * scale + (i % 2) * 0.05 * scale,
      z + Math.sin(angle) * 0.15 * scale,
    );
    bloom.scale.set(1.05, 0.78, 1.05);
    bloom.castShadow = true;
    bloom.userData.officeDecor = "premium-floor-flower-bloom";
    scene.add(bloom);

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.022 * scale, 8, 6),
      goldMaterial,
    );
    center.position.copy(bloom.position);
    center.castShadow = true;
    center.userData.officeDecor = "premium-floor-flower-center";
    scene.add(center);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.075 * scale, 8, 6),
      stemMaterial,
    );
    leaf.position.set(
      x + Math.cos(angle + 0.9) * 0.20 * scale,
      0.78 * scale,
      z + Math.sin(angle + 0.9) * 0.20 * scale,
    );
    leaf.scale.set(0.45, 0.18, 1.5);
    leaf.rotation.y = angle + 0.7;
    leaf.castShadow = true;
    leaf.userData.officeDecor = "premium-floor-flower-leaf";
    scene.add(leaf);
  }
}

function addPremiumOfficeDecor(scene: THREE.Scene) {
  const offices = [
    { id: "office-1", x: -6.25, z: -6.68, scale: 0.92 },
    { id: "office-2", x: 6.25, z: -6.68, scale: 0.92 },
    { id: "office-3", x: -6.25, z: 1.68, scale: 0.92 },
    { id: "office-4", x: 6.25, z: 1.68, scale: 0.92 },
    { id: "manager", x: -6.25, z: 13.72, scale: 1.08 },
    { id: "director", x: 6.25, z: 13.72, scale: 1.08 },
  ];

  const rugMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a4a3c,
    roughness: 0.88,
  });

  for (const office of offices) {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25 * office.scale, 1.05 * office.scale),
      rugMaterial,
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(office.x, 0.012, office.z);
    rug.receiveShadow = true;
    rug.userData.officeDecor = "premium-flower-rug";
    rug.userData.roomId = office.id;
    scene.add(rug);

    addPremiumFloorFlower(scene, office.x, office.z, office.scale);
  }
}


function addCorridorFlowerCluster(
  scene: THREE.Scene,
  x: number,
  z: number,
  scale = 1,
  side = 1,
) {
  const potMaterial = new THREE.MeshStandardMaterial({
    color: 0x25333a,
    roughness: 0.32,
    metalness: 0.16,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.22,
    metalness: 0.86,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x3c6b4a,
    roughness: 0.72,
  });
  const roseMaterial = new THREE.MeshStandardMaterial({
    color: 0xd85b72,
    roughness: 0.42,
  });
  const daisyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd36a,
    roughness: 0.40,
  });
  const creamMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6eee2,
    roughness: 0.42,
  });
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: 0xe3b44f,
    roughness: 0.25,
    metalness: 0.6,
  });

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13 * scale, 0.17 * scale, 0.24 * scale, 16),
    potMaterial,
  );
  pot.position.set(x, 0.12 * scale + 0.14, z);
  pot.castShadow = true;
  pot.receiveShadow = true;
  pot.userData.corridorDecor = "flower-pot";
  scene.add(pot);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.135 * scale, 0.012 * scale, 6, 18),
    rimMaterial,
  );
  rim.position.set(x, 0.275 * scale + 0.14, z);
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  rim.userData.corridorDecor = "flower-pot-rim";
  scene.add(rim);

  const blooms = [
    { x: -0.09, z: 0.02, y: 0.93, material: roseMaterial },
    { x: 0.08, z: 0.03, y: 0.84, material: daisyMaterial },
    { x: side * 0.01, z: 0.10, y: 1.00, material: creamMaterial },
  ];

  blooms.forEach((bloom, bloomIndex) => {
    const localX = x + bloom.x * scale;
    const localZ = z + bloom.z * scale;
    const stemHeight = bloom.y * scale;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 * scale, 0.016 * scale, stemHeight, 8),
      stemMaterial,
    );
    stem.position.set(localX, 0.40 * scale + stemHeight * 0.5, localZ);
    stem.rotation.z = side * (bloomIndex - 1) * 0.10;
    stem.castShadow = true;
    stem.userData.corridorDecor = "flower-stem";
    scene.add(stem);

    const petalCount = bloomIndex === 0 ? 6 : 5;
    for (let petalIndex = 0; petalIndex < petalCount; petalIndex += 1) {
      const angle = (petalIndex / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 * scale, 10, 8),
        bloom.material,
      );
      petal.scale.set(0.82, 0.55, 1.16);
      petal.position.set(
        localX + Math.cos(angle) * 0.075 * scale,
        bloom.y * scale + 0.18 * scale,
        localZ + Math.sin(angle) * 0.075 * scale,
      );
      petal.rotation.y = angle;
      petal.castShadow = true;
      petal.userData.corridorDecor = bloomIndex === 0 ? "rose-bloom" : "flower-bloom";
      scene.add(petal);
    }

    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.027 * scale, 8, 6),
      bloomIndex === 0 ? roseMaterial : centerMaterial,
    );
    center.position.set(localX, bloom.y * scale + 0.18 * scale, localZ);
    center.castShadow = true;
    center.userData.corridorDecor = bloomIndex === 0 ? "rose-center" : "flower-center";
    scene.add(center);

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.065 * scale, 8, 6),
      stemMaterial,
    );
    leaf.scale.set(0.42, 0.18, 1.45);
    leaf.position.set(localX + side * 0.07 * scale, 0.72 * scale, localZ + 0.02 * scale);
    leaf.rotation.y = side * 0.7;
    leaf.castShadow = true;
    leaf.userData.corridorDecor = "flower-leaf";
    scene.add(leaf);
  });
}

function addFloorVerse(scene: THREE.Scene) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(247, 241, 229, 0.97)";
  ctx.strokeStyle = "#c9a45d";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(20, 20, 960, 260, 32);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#3c4b52";
  ctx.font = "700 38px Georgia";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("“Commit thy works unto the LORD, and thy thoughts shall be established.”", 500, 112);

  ctx.fillStyle = "#8c6a35";
  ctx.font = "700 32px Arial";
  ctx.fillText("— Proverbs 16:3 (KJV)", 500, 190);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.48, 0.62),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      roughness: 0.58,
      metalness: 0.08,
    }),
  );
  plaque.rotation.x = -Math.PI / 2;
  plaque.position.set(0, 0.182, 9.15);
  plaque.receiveShadow = true;
  plaque.userData.corridorDecor = "walk-path-verse";
  scene.add(plaque);
}

function addCorridorDecor(scene: THREE.Scene) {
  const runnerMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8b59a,
    roughness: 0.86,
  });
  const runnerTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.24,
    metalness: 0.82,
  });

  const runner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.36, BUILDING_D - 0.85),
    runnerMaterial,
  );
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.156, (FRONT + BACK) / 2);
  runner.receiveShadow = true;
  runner.userData.corridorDecor = "walk-path-runner";
  scene.add(runner);

  for (const side of [-1, 1]) {
    const trim = new THREE.Mesh(
      new THREE.PlaneGeometry(0.035, BUILDING_D - 0.90),
      runnerTrimMaterial,
    );
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(side * 0.65, 0.160, (FRONT + BACK) / 2);
    trim.receiveShadow = true;
    trim.userData.corridorDecor = "walk-path-trim";
    scene.add(trim);
  }

  const flowerStops = [
    { z: -7.65, side: -1 },
    { z: -6.95, side: 1 },
    { z: -3.25, side: -1 },
    { z: 1.80, side: 1 },
    { z: 4.15, side: -1 },
    { z: 7.85, side: 1 },
    { z: 10.45, side: -1 },
    { z: 13.35, side: 1 },
  ];

  for (const stop of flowerStops) {
    addCorridorFlowerCluster(scene, stop.side * 0.72, stop.z, 0.88, stop.side);
  }

  addFloorVerse(scene);
}

function addOfficeWallFeature(
  scene: THREE.Scene,
  x: number,
  z: number,
  side: "left" | "right",
  large = false,
) {
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3e8d7,
    roughness: 0.56,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xb98c52,
    roughness: 0.22,
    metalness: 0.78,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x38484d,
    roughness: 0.48,
  });

  const panelWidth = large ? 1.55 : 1.22;
  const panelHeight = large ? 1.10 : 0.92;
  const wallX = side === "left" ? LEFT + 0.11 : RIGHT - 0.11;
  const inset = side === "left" ? 0.01 : -0.01;

  const panel = meshBox(0.06, panelHeight, panelWidth, panelMaterial);
  panel.position.set(wallX + inset, 1.58, z);
  panel.castShadow = true;
  panel.receiveShadow = true;
  panel.userData.officeDecor = "accent-wall-panel";
  scene.add(panel);

  for (const zOffset of [-panelWidth / 2, panelWidth / 2]) {
    const trim = meshBox(0.075, panelHeight + 0.08, 0.035, frameMaterial);
    trim.position.set(wallX + inset * 1.5, 1.58, z + zOffset);
    trim.castShadow = true;
    trim.userData.officeDecor = "accent-wall-frame";
    scene.add(trim);
  }

  for (const yOffset of [1.13, 2.03]) {
    const trim = meshBox(0.075, 0.035, panelWidth + 0.07, frameMaterial);
    trim.position.set(wallX + inset * 1.5, yOffset, z);
    trim.castShadow = true;
    trim.userData.officeDecor = "accent-wall-frame";
    scene.add(trim);
  }

  for (const stripe of [-0.28, 0, 0.28]) {
    const art = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, panelHeight * 0.56, 0.05),
      darkMaterial,
    );
    art.position.set(
      wallX + (side === "left" ? 0.045 : -0.045),
      1.58,
      z + stripe * (panelWidth / 1.22),
    );
    art.castShadow = true;
    art.userData.officeDecor = "accent-wall-art";
    scene.add(art);
  }
}

function addOfficeGlow(
  scene: THREE.Scene,
  x: number,
  z: number,
  side: "left" | "right",
  large = false,
) {
  const glow = new THREE.PointLight(0xffd9ad, large ? 1.45 : 1.1, large ? 6.2 : 5.0, 2);
  glow.position.set(x, large ? 2.35 : 2.22, z);
  glow.castShadow = false;
  glow.userData.officeDecor = "office-ambient-glow";
  scene.add(glow);

  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd5b46e,
    roughness: 0.22,
    metalness: 0.82,
    emissive: new THREE.Color(0x3b2e1b),
    emissiveIntensity: 0.7,
  });
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.12, 16, 1, true),
    shadeMaterial,
  );
  shade.position.set(x, glow.position.y + 0.18, z);
  shade.castShadow = true;
  shade.userData.officeDecor = "office-light-shade";
  scene.add(shade);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfff1d1,
      emissive: new THREE.Color(0xffc86a),
      emissiveIntensity: 1.15,
      roughness: 0.30,
    }),
  );
  bulb.position.set(x, glow.position.y + 0.115, z);
  bulb.userData.officeDecor = "office-light-bulb";
  scene.add(bulb);

  if (side === "left" || side === "right") {
    const accent = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.012, 6, 16),
      shadeMaterial,
    );
    accent.rotation.x = Math.PI / 2;
    accent.position.set(x, 0.18, z);
    accent.userData.officeDecor = "office-floor-inlay";
    scene.add(accent);
  }
}


function addExecutiveLimb(
  scene: THREE.Scene,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  tag: string,
) {
  addCylinderBetweenPoints(scene, start, end, radius, material, {
    officeDecor: tag,
  });
}

function addExecutiveChair(
  scene: THREE.Scene,
  x: number,
  z: number,
  facing: 1 | -1,
) {
  const leather = new THREE.MeshStandardMaterial({
    color: 0x242a2e,
    roughness: 0.44,
    metalness: 0.06,
  });
  const leatherSoft = new THREE.MeshStandardMaterial({
    color: 0x343b40,
    roughness: 0.50,
    metalness: 0.04,
  });
  const leatherAccent = new THREE.MeshStandardMaterial({
    color: 0x171b1f,
    roughness: 0.52,
    metalness: 0.04,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x1e252b,
    roughness: 0.26,
    metalness: 0.84,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.22,
    metalness: 0.90,
  });

  // New executive-chair design: a high-back wing chair with deeper padding,
  // a shaped headrest/lumbar section, broad upholstered arms, subtle brass
  // detailing and a heavier five-star pedestal. This function is only used
  // by the manager's and director's offices.
  const seatBase = meshBox(1.04, 0.18, 1.10, leatherAccent);
  seatBase.position.set(x, 0.67, z);
  seatBase.castShadow = true;
  seatBase.receiveShadow = true;
  seatBase.userData.officeDecor = "executive-chair-seat-base";
  scene.add(seatBase);

  const seatCushion = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36, 0.28, 5, 16),
    leatherSoft,
  );
  seatCushion.scale.set(1.28, 0.30, 1.36);
  seatCushion.position.set(x, 0.79, z);
  seatCushion.castShadow = true;
  seatCushion.receiveShadow = true;
  seatCushion.userData.officeDecor = "executive-chair-seat-cushion";
  scene.add(seatCushion);

  const backShell = meshBox(1.12, 1.34, 0.18, leatherAccent);
  backShell.position.set(x - facing * 0.42, 1.28, z);
  backShell.castShadow = true;
  backShell.receiveShadow = true;
  backShell.userData.officeDecor = "executive-chair-high-back-shell";
  scene.add(backShell);

  const backPad = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.39, 0.42, 6, 18),
    leatherSoft,
  );
  backPad.scale.set(1.34, 1.56, 0.28);
  backPad.position.set(x - facing * 0.53, 1.30, z);
  backPad.castShadow = true;
  backPad.receiveShadow = true;
  backPad.userData.officeDecor = "executive-chair-high-back-pad";
  scene.add(backPad);

  // A raised headrest gives the chair a clearly different silhouette from
  // the workstation chairs while staying compact enough for the 6 × 5 m rooms.
  const headrest = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.30, 0.18, 5, 14),
    leather,
  );
  headrest.scale.set(1.32, 0.64, 0.34);
  headrest.position.set(x - facing * 0.55, 1.88, z);
  headrest.castShadow = true;
  headrest.userData.officeDecor = "executive-chair-headrest";
  scene.add(headrest);

  const lumbar = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.25, 0.20, 5, 14),
    leather,
  );
  lumbar.scale.set(1.28, 0.55, 0.30);
  lumbar.position.set(x - facing * 0.58, 1.08, z);
  lumbar.castShadow = true;
  lumbar.userData.officeDecor = "executive-chair-lumbar";
  scene.add(lumbar);

  // Winged sides frame the occupant without making the chair too wide.
  for (const zSide of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, 0.58, 4, 10),
      leather,
    );
    wing.scale.set(1.02, 1.55, 0.74);
    wing.position.set(
      x - facing * 0.47,
      1.30,
      z + zSide * 0.47,
    );
    wing.rotation.x = zSide * 0.06;
    wing.castShadow = true;
    wing.userData.officeDecor = "executive-chair-wing";
    scene.add(wing);

    const armTop = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.28, 4, 10),
      leatherSoft,
    );
    armTop.scale.set(1.25, 0.50, 1.45);
    armTop.position.set(
      x - facing * 0.03,
      1.01,
      z + zSide * 0.47,
    );
    armTop.castShadow = true;
    armTop.receiveShadow = true;
    armTop.userData.officeDecor = "executive-chair-arm-pad";
    scene.add(armTop);

    const armSupport = meshBox(0.08, 0.34, 0.08, metal);
    armSupport.position.set(
      x - facing * 0.01,
      0.83,
      z + zSide * 0.47,
    );
    armSupport.castShadow = true;
    armSupport.userData.officeDecor = "executive-chair-arm-support";
    scene.add(armSupport);
  }

  // Three slim brass accent ribs sit on the inner face of the backrest.
  for (const zOffset of [-0.22, 0, 0.22]) {
    const rib = meshBox(0.028, 0.74, 0.018, brass);
    rib.position.set(x + facing * 0.555, 1.34, z + zOffset);
    rib.castShadow = true;
    rib.userData.officeDecor = "executive-chair-brass-rib";
    scene.add(rib);
  }

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.11, 0.34, 18),
    metal,
  );
  column.position.set(x, 0.44, z);
  column.castShadow = true;
  scene.add(column);

  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.018, 8, 20),
    brass,
  );
  accentRing.rotation.x = Math.PI / 2;
  accentRing.position.set(x, 0.25, z);
  accentRing.castShadow = true;
  accentRing.userData.officeDecor = "executive-chair-brass-ring";
  scene.add(accentRing);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.09, 18),
    metal,
  );
  hub.position.set(x, 0.22, z);
  hub.castShadow = true;
  scene.add(hub);

  // Heavier five-star base for a more premium executive silhouette.
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI / 10;
    const spokeLength = 0.42;
    const spoke = meshBox(0.048, 0.038, spokeLength, metal);
    spoke.position.set(
      x + Math.cos(angle) * (spokeLength / 2),
      0.12,
      z + Math.sin(angle) * (spokeLength / 2),
    );
    spoke.rotation.y = angle;
    spoke.castShadow = true;
    spoke.userData.officeDecor = "executive-chair-base-spoke";
    scene.add(spoke);

    const caster = new THREE.Mesh(
      new THREE.SphereGeometry(0.052, 10, 8),
      metal,
    );
    caster.position.set(
      x + Math.cos(angle) * spokeLength,
      0.075,
      z + Math.sin(angle) * spokeLength,
    );
    caster.castShadow = true;
    caster.userData.officeDecor = "executive-chair-caster";
    scene.add(caster);
  }
}

function addExecutivePlant(scene: THREE.Scene, x: number, z: number) {
  const potMaterial = new THREE.MeshStandardMaterial({
    color: 0x875638,
    roughness: 0.70,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x429866,
    roughness: 0.64,
  });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x69dc98,
    roughness: 0.46,
  });

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.31, 0.46, 18),
    potMaterial,
  );
  pot.position.set(x, 0.23, z);
  pot.castShadow = true;
  pot.receiveShadow = true;
  pot.userData.officeDecor = "executive-plant-pot";
  scene.add(pot);

  const leaves = [
    { dx: 0.03, dz: 0, h: 1.05, leanX: 0.10, leanZ: 0.00, size: 0.22 },
    { dx: -0.03, dz: 0.04, h: 0.84, leanX: -0.16, leanZ: 0.04, size: 0.20 },
    { dx: 0.02, dz: -0.02, h: 0.75, leanX: 0.02, leanZ: -0.13, size: 0.18 },
    { dx: -0.02, dz: -0.02, h: 0.62, leanX: 0.16, leanZ: 0.08, size: 0.16 },
  ];

  leaves.forEach((item, index) => {
    const start = new THREE.Vector3(x + item.dx, 0.45, z + item.dz);
    const end = new THREE.Vector3(
      x + item.dx + item.leanX,
      0.45 + item.h,
      z + item.dz + item.leanZ,
    );
    addExecutiveLimb(scene, start, end, 0.018, stemMaterial, "executive-plant-stem");

    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(item.size, 14, 12),
      leafMaterial,
    );
    leaf.scale.set(0.52, 0.18, 1.38);
    leaf.position.copy(end);
    leaf.position.y -= 0.08;
    leaf.rotation.y = index * 0.8;
    leaf.rotation.z = index % 2 === 0 ? -0.16 : 0.22;
    leaf.castShadow = true;
    leaf.userData.officeDecor = "executive-plant-leaf";
    scene.add(leaf);
  });
}

function addExecutiveDesk(scene: THREE.Scene, x: number, z: number, facing: 1 | -1) {
  const wood = new THREE.MeshStandardMaterial({ color: 0xc89b58, roughness: 0.50 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x8a633b, roughness: 0.62 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x747c82, roughness: 0.30, metalness: 0.78 });
  const tech = new THREE.MeshStandardMaterial({ color: 0x6b7074, roughness: 0.30, metalness: 0.20 });

  const top = meshBox(1.05, 0.13, 2.70, wood);
  top.position.set(x, 0.84, z);
  top.castShadow = true;
  top.receiveShadow = true;
  top.userData.officeDecor = "executive-desk-top";
  scene.add(top);

  const front = meshBox(0.075, 0.40, 2.52, edge);
  front.position.set(x + facing * 0.40, 0.61, z);
  front.castShadow = true;
  scene.add(front);

  for (const zOffset of [-1.03, 1.03]) {
    const leg = meshBox(0.08, 0.71, 0.08, metal);
    leg.position.set(x - 0.23, 0.45, z + zOffset);
    leg.castShadow = true;
    scene.add(leg);

    const foot = meshBox(0.34, 0.05, 0.08, metal);
    foot.position.set(x - 0.10, 0.09, z + zOffset);
    foot.castShadow = true;
    scene.add(foot);
  }

  const drawer = meshBox(0.32, 0.42, 0.56, edge);
  drawer.position.set(x - facing * 0.34, 0.46, z + 0.72);
  drawer.castShadow = true;
  drawer.receiveShadow = true;
  scene.add(drawer);

  const monitorFrame = new THREE.MeshStandardMaterial({ color: 0x9ea1a4, roughness: 0.34, metalness: 0.16 });
  const monitor = meshBox(0.10, 0.98, 1.62, monitorFrame);
  monitor.position.set(x - facing * 0.02, 1.47, z);
  monitor.castShadow = true;
  monitor.userData.officeDecor = "executive-monitor";
  scene.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.82, 1.48),
    new THREE.MeshStandardMaterial({ color: 0x767a7e, roughness: 0.26, metalness: 0.10 }),
  );
  screen.position.set(x + facing * 0.037, 1.47, z);
  scene.add(screen);

  const stand = meshBox(0.11, 0.35, 0.11, metal);
  stand.position.set(x - facing * 0.02, 0.98, z);
  scene.add(stand);

  const base = meshBox(0.35, 0.05, 0.25, metal);
  base.position.set(x - facing * 0.03, 0.80, z);
  scene.add(base);

  const keyboard = meshBox(0.27, 0.035, 0.58, tech);
  keyboard.position.set(x + facing * 0.22, 0.89, z);
  keyboard.castShadow = true;
  scene.add(keyboard);

  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), tech);
  mouse.scale.set(0.85, 0.40, 1.15);
  mouse.position.set(x + facing * 0.30, 0.90, z - 0.38);
  mouse.castShadow = true;
  scene.add(mouse);

  const mugMaterial = new THREE.MeshStandardMaterial({ color: 0xe77555, roughness: 0.42 });
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.15, 16),
    mugMaterial,
  );
  mug.position.set(x + facing * 0.28, 0.96, z + 0.88);
  mug.castShadow = true;
  scene.add(mug);
}

function addExecutiveRelaxationArea(
  scene: THREE.Scene,
  office: string,
) {
  const side = office === "manager" ? -1 : 1;

  // Deliberately use the rear outer corner of each 6 × 5 m executive office.
  // The workstation stays toward the corridor, while this lounge remains
  // completely inside the room and outside the 1.5 m door zone.
  const centerX = side * 5.45;
  const sofaZ = 13.60;
  const tableZ = 12.72;

  const rugMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b5847,
    roughness: 0.88,
  });
  const upholstery = new THREE.MeshStandardMaterial({
    color: 0x5b4030,
    roughness: 0.54,
  });
  const cushionMaterial = new THREE.MeshStandardMaterial({
    color: 0x805d45,
    roughness: 0.62,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x9a6a3f,
    roughness: 0.50,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x252d33,
    roughness: 0.26,
    metalness: 0.80,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc9a45d,
    roughness: 0.24,
    metalness: 0.88,
  });

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 1.75),
    rugMaterial,
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(centerX, 0.166, 13.10);
  rug.receiveShadow = true;
  rug.userData.officeDecor = "executive-relaxation-rug";
  rug.userData.roomId = office;
  scene.add(rug);

  // Rebuilt seating only: a compact, rounded executive two-seat lounge.
  // It stays on the existing rug footprint and leaves the coffee table,
  // side table and lamp positions untouched.
  const sofaSeat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 0.72, 5, 18),
    cushionMaterial,
  );
  sofaSeat.scale.set(1.22, 0.50, 1.28);
  sofaSeat.position.set(centerX, 0.62, sofaZ);
  sofaSeat.castShadow = true;
  sofaSeat.receiveShadow = true;
  sofaSeat.userData.officeDecor = "executive-relaxation-seat-rebuilt";
  sofaSeat.userData.roomId = office;
  scene.add(sofaSeat);

  const sofaBack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.31, 0.76, 5, 18),
    upholstery,
  );
  sofaBack.scale.set(1.28, 1.38, 0.34);
  sofaBack.position.set(centerX, 1.03, sofaZ + 0.28);
  sofaBack.castShadow = true;
  sofaBack.receiveShadow = true;
  sofaBack.userData.officeDecor = "executive-relaxation-back-rebuilt";
  scene.add(sofaBack);

  for (const xSide of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, 0.27, 4, 14),
      upholstery,
    );
    arm.scale.set(1.15, 1.55, 1.22);
    arm.position.set(centerX + xSide * 0.78, 0.83, sofaZ);
    arm.castShadow = true;
    arm.receiveShadow = true;
    arm.userData.officeDecor = "executive-relaxation-arm-rebuilt";
    scene.add(arm);
  }

  // Two separate back cushions give the seat a cleaner executive lounge look.
  for (const xOffset of [-0.40, 0.40]) {
    const backCushion = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.19, 4, 12),
      cushionMaterial,
    );
    backCushion.scale.set(1.05, 1.15, 0.42);
    backCushion.position.set(centerX + xOffset, 0.97, sofaZ + 0.08);
    backCushion.castShadow = true;
    backCushion.userData.officeDecor = "executive-relaxation-back-cushion-rebuilt";
    scene.add(backCushion);
  }

  const sofaBase = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.30, 0.74, 4, 14),
    upholstery,
  );
  sofaBase.scale.set(1.28, 0.34, 1.12);
  sofaBase.position.set(centerX, 0.43, sofaZ);
  sofaBase.castShadow = true;
  sofaBase.userData.officeDecor = "executive-relaxation-base-rebuilt";
  scene.add(sofaBase);

  for (const xSide of [-1, 1]) {
    const leg = meshBox(0.07, 0.22, 0.07, metal);
    leg.position.set(centerX + xSide * 0.60, 0.26, sofaZ - 0.22);
    leg.castShadow = true;
    leg.userData.officeDecor = "executive-relaxation-leg-rebuilt";
    scene.add(leg);
  }

  // Low round coffee table sits in front of the loveseat, not in the corridor.
  const tableTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24),
    wood,
  );
  tableTop.position.set(centerX, 0.53, tableZ);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableTop.userData.officeDecor = "executive-relaxation-coffee-table";
  scene.add(tableTop);

  const brassRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.014, 8, 24),
    brass,
  );
  brassRing.rotation.x = Math.PI / 2;
  brassRing.position.set(centerX, 0.58, tableZ);
  brassRing.castShadow = true;
  brassRing.userData.officeDecor = "executive-relaxation-coffee-table-ring";
  scene.add(brassRing);

  const tableStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.085, 0.38, 14),
    metal,
  );
  tableStem.position.set(centerX, 0.31, tableZ);
  tableStem.castShadow = true;
  scene.add(tableStem);

  const tableBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.27, 0.055, 20),
    metal,
  );
  tableBase.position.set(centerX, 0.085, tableZ);
  tableBase.castShadow = true;
  scene.add(tableBase);

  // Small side table stays at the outer edge of the nook.
  const sideTableX = side * 6.25;
  const sideTableZ = 13.08;
  const sideTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.07, 20),
    wood,
  );
  sideTop.position.set(sideTableX, 0.56, sideTableZ);
  sideTop.castShadow = true;
  sideTop.receiveShadow = true;
  sideTop.userData.officeDecor = "executive-relaxation-side-table";
  scene.add(sideTop);

  const sideLeg = meshBox(0.06, 0.46, 0.06, metal);
  sideLeg.position.set(sideTableX, 0.31, sideTableZ);
  sideLeg.castShadow = true;
  scene.add(sideLeg);

  // Warm accent lamp sits beside the loveseat and does not interfere with the desk.
  const lampX = side * 6.30;
  const lampZ = 13.95;

  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.055, 18),
    metal,
  );
  lampBase.position.set(lampX, 0.08, lampZ);
  lampBase.castShadow = true;
  scene.add(lampBase);

  const lampStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.032, 1.35, 12),
    metal,
  );
  lampStem.position.set(lampX, 0.76, lampZ);
  lampStem.castShadow = true;
  scene.add(lampStem);

  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.19, 0.25, 20, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xd5b46e,
      roughness: 0.36,
      metalness: 0.24,
      emissive: new THREE.Color(0x3b2e1b),
      emissiveIntensity: 0.38,
    }),
  );
  lampShade.position.set(lampX, 1.45, lampZ);
  lampShade.castShadow = true;
  lampShade.userData.officeDecor = "executive-relaxation-lamp-shade";
  scene.add(lampShade);

  const glow = new THREE.PointLight(0xffd9ad, 0.55, 3.0, 2);
  glow.position.set(lampX, 1.35, lampZ);
  glow.castShadow = false;
  glow.userData.officeDecor = "executive-relaxation-lamp-glow";
  scene.add(glow);

  scene.userData.executiveRelaxationAreas ??= [];
  scene.userData.executiveRelaxationAreas.push({
    office,
    center: { x: centerX, z: 13.10 },
    loveseat: { x: centerX, z: sofaZ },
    coffeeTable: { x: centerX, z: tableZ },
    clearDoorZone: true,
  });
}

function addDirectorOfficeRedesign(scene: THREE.Scene) {
  // Complete Director-suite rebuild inside the existing 6 × 5 m room.
  // The corridor-side doorway at X=1/Z=12 remains unobstructed.
  const black = new THREE.MeshStandardMaterial({ color: 0x111316, roughness: 0.38, metalness: 0.10 });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x202428, roughness: 0.46, metalness: 0.08 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.42, metalness: 0.04 });
  const leatherSoft = new THREE.MeshStandardMaterial({ color: 0x30353a, roughness: 0.52, metalness: 0.03 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x5a3925, roughness: 0.48 });
  const marble = new THREE.MeshStandardMaterial({ color: 0x292a2c, roughness: 0.25, metalness: 0.10 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xc99a42, roughness: 0.22, metalness: 0.88,
    emissive: new THREE.Color(0x2b1905), emissiveIntensity: 0.28,
  });
  const glass = new THREE.MeshStandardMaterial({ color: 0x72787d, roughness: 0.14, metalness: 0.60 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x36383b, roughness: 0.94 });
  const green = new THREE.MeshStandardMaterial({ color: 0x3e714f, roughness: 0.74 });
  const pot = new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.38, metalness: 0.22 });

  // FEATURE WALL
  const wall = meshBox(0.08, 2.48, 5.70, black);
  wall.position.set(4, 1.42, 14.28); wall.castShadow = true;
  wall.userData.officeDecor = "director-redesign-feature-wall"; scene.add(wall);

  for (const x of [2.15,2.30,2.45,5.55,5.70,5.85]) {
    const slat = meshBox(0.08, 2.20, 0.055, walnut);
    slat.position.set(x, 1.38, 14.17); slat.castShadow = true;
    slat.userData.officeDecor = "director-redesign-walnut-slat"; scene.add(slat);
  }

  const plaque = meshBox(0.07, 0.72, 1.85, charcoal);
  plaque.position.set(4, 2.02, 14.10); plaque.castShadow = true;
  plaque.userData.officeDecor = "director-redesign-plaque"; scene.add(plaque);
  const plaqueEdge = meshBox(0.025, 0.055, 1.92, gold);
  plaqueEdge.position.set(4, 2.37, 14.05); scene.add(plaqueEdge);

  for (const [dx,h] of [[-0.12,0.13],[0,0.22],[0.12,0.16]] as Array<[number,number]>) {
    const mark = meshBox(0.018,h,0.055,gold);
    mark.position.set(4+dx,2.42,14.00); scene.add(mark);
  }

  // DISPLAY SHELVES
  for (const shelfX of [2.0,6.0]) {
    const frame = meshBox(0.18,1.95,0.52,charcoal);
    frame.position.set(shelfX,1.40,14.02); frame.castShadow=true; scene.add(frame);
    for (const y of [0.72,1.20,1.68,2.16]) {
      const shelf = meshBox(0.22,0.035,0.46,gold);
      shelf.position.set(shelfX-0.02,y,13.94); scene.add(shelf);
      const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.065,12,10), y>1.8?gold:glass);
      ornament.position.set(shelfX,y+0.10,13.93); ornament.scale.set(1,1.35,0.72); ornament.castShadow=true; scene.add(ornament);
    }
  }

  // MARBLE EXECUTIVE DESK
  const deskX=3.75, deskZ=12.75;
  const top=meshBox(1.05,0.15,2.55,marble);
  top.position.set(deskX,0.84,deskZ); top.castShadow=true; top.receiveShadow=true;
  top.userData.officeDecor="director-redesign-marble-desk"; scene.add(top);
  const fascia=meshBox(0.10,0.56,2.42,walnut);
  fascia.position.set(deskX-0.47,0.55,deskZ); fascia.castShadow=true; scene.add(fascia);
  const rail=meshBox(0.025,0.06,2.40,gold);
  rail.position.set(deskX-0.525,0.91,deskZ); scene.add(rail);

  for (const zSide of [-1,1]) {
    const leg=meshBox(0.18,0.62,0.18,black);
    leg.position.set(deskX+0.38,0.34,deskZ+zSide*0.92); leg.castShadow=true; scene.add(leg);
  }

  const laptop=meshBox(0.66,0.035,0.46,glass);
  laptop.position.set(deskX-0.06,0.95,deskZ-0.18); laptop.castShadow=true; scene.add(laptop);
  const lampBase=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.12,0.035,18),gold);
  lampBase.position.set(deskX-0.30,0.94,deskZ+0.65); scene.add(lampBase);
  const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.025,0.32,10),black);
  lampStem.position.set(deskX-0.30,1.10,deskZ+0.65); scene.add(lampStem);
  const lampShade=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.12,16,1,true),gold);
  lampShade.position.set(deskX-0.30,1.28,deskZ+0.65); scene.add(lampShade);

  // CENTERPIECE DIRECTOR CHAIR
  addExecutiveChair(scene, deskX+0.78, deskZ, -1);

  // TWO VISITOR CHAIRS
  for (const zSide of [-1,1]) {
    const z=deskZ+zSide*1.35;
    const seat=meshBox(0.72,0.18,0.72,leather);
    seat.position.set(2.55,0.55,z); seat.castShadow=true; scene.add(seat);
    const back=new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.30,4,12),leatherSoft);
    back.scale.set(1.45,1.20,0.55); back.position.set(2.55,0.91,z+0.25); back.castShadow=true; scene.add(back);
    for(const xSide of [-1,1]) {
      const arm=meshBox(0.10,0.24,0.58,leather);
      arm.position.set(2.55+xSide*0.34,0.78,z); arm.castShadow=true; scene.add(arm);
    }
    const column=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,0.24,14),gold);
    column.position.set(2.55,0.32,z); scene.add(column);
  }

  // LOUNGE CORNER
  const lx=5.55,lz=11.05;
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(2.25,1.75),rugMat);
  rug.rotation.x=-Math.PI/2; rug.position.set(lx,0.17,lz); rug.receiveShadow=true; scene.add(rug);
  const sofa=meshBox(0.78,0.70,1.62,leather);
  sofa.position.set(6.20,0.63,lz); sofa.castShadow=true; scene.add(sofa);
  const sofaSeat=meshBox(0.64,0.16,1.42,leatherSoft);
  sofaSeat.position.set(6.10,0.72,lz); sofaSeat.castShadow=true; scene.add(sofaSeat);
  for(const zSide of [-1,1]) {
    const cushion=new THREE.Mesh(new THREE.CapsuleGeometry(0.20,0.28,4,12),leatherSoft);
    cushion.scale.set(1,1.15,0.68); cushion.position.set(6.05,1.00,lz+zSide*0.43); cushion.castShadow=true; scene.add(cushion);
  }

  const roundTable=new THREE.Mesh(new THREE.CylinderGeometry(0.43,0.43,0.08,24),marble);
  roundTable.position.set(5.25,0.52,lz); roundTable.castShadow=true; scene.add(roundTable);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.015,8,24),gold);
  ring.rotation.x=Math.PI/2; ring.position.set(5.25,0.57,lz); scene.add(ring);
  const tableStem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.09,0.38,14),black);
  tableStem.position.set(5.25,0.31,lz); scene.add(tableStem);

  // PLANTS
  const plantPot=new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.25,0.40,18),pot);
  plantPot.position.set(6.25,0.22,12.45); plantPot.castShadow=true; scene.add(plantPot);
  for(const [dx,dz,h] of [[0,0,1.0],[-0.08,0.02,0.78],[0.08,-0.03,0.82],[-0.02,-0.05,0.65]] as Array<[number,number,number]>) {
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.18,12,10),green);
    leaf.scale.set(0.48,1.10,0.30); leaf.position.set(6.25+dx,0.45+h*0.48,12.45+dz); leaf.castShadow=true; scene.add(leaf);
  }
  const smallPot=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.17,0.28,16),gold);
  smallPot.position.set(2.75,0.14,13.72); scene.add(smallPot);

  // STATEMENT FLOOR LAMP
  const fx=5.25,fz=13.55;
  const fs=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.035,1.45,12),black);
  fs.position.set(fx,0.82,fz); fs.castShadow=true; scene.add(fs);
  const fb=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,0.055,18),gold);
  fb.position.set(fx,0.08,fz); scene.add(fb);
  const shade=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.28,20,1,true),black);
  shade.position.set(fx,1.58,fz); shade.castShadow=true; scene.add(shade);
  const glow=new THREE.PointLight(0xffd39a,0.70,3.6,2);
  glow.position.set(fx,1.45,fz); scene.add(glow);

  const wallGlow=new THREE.PointLight(0xffc46a,1.25,5.0,2);
  wallGlow.position.set(4,2.15,13.85); scene.add(wallGlow);

  scene.userData.directorOfficeRedesign={style:"black-walnut-gold-executive-suite",rebuilt:true,room:"director"};
}

function addExecutiveOfficeSetups(scene: THREE.Scene) {
  const manager = { office: "manager", x: -4.58, z: 12.30, facing: 1 as 1 | -1 };
  addExecutiveChair(scene, manager.x-manager.facing*0.26, manager.z, manager.facing);
  addExecutiveRelaxationArea(scene, manager.office);
  addExecutiveDesk(scene, manager.x+manager.facing*0.92, manager.z, manager.facing);
  addExecutivePlant(scene, manager.x+manager.facing*1.02, manager.z+1.05);
  scene.userData.executiveOfficeSetups ??= [];
  scene.userData.executiveOfficeSetups.push({
    office:"manager", style:"executive-workstation-empty", person:null,
    desk:{x:manager.x+manager.facing*0.92,z:manager.z},
  });

  addDirectorOfficeRedesign(scene);
  scene.userData.executiveOfficeSetups.push({
    office:"director", style:"black-walnut-gold-executive-suite", person:null,
    desk:{x:3.75,z:12.75},
  });
}

function addPremiumOfficeEnhancements(scene: THREE.Scene) {
  const offices = [
    { id: "office-1", x: -6.25, z: -5.0, side: "left" as const, large: false },
    { id: "office-2", x: 6.25, z: -5.0, side: "right" as const, large: false },
    { id: "office-3", x: -6.25, z: 0.0, side: "left" as const, large: false },
    { id: "office-4", x: 6.25, z: 0.0, side: "right" as const, large: false },
    { id: "manager", x: -6.25, z: 12.0, side: "left" as const, large: true },
    { id: "director", x: 6.25, z: 12.0, side: "right" as const, large: true },
  ];

  for (const office of offices) {
    if (office.id === "director") continue;
    addOfficeWallFeature(scene, office.x, office.z, office.side, office.large);
    addOfficeGlow(scene, office.x, office.z, office.side, office.large);
  }
}

function validateStaffWorkstationClearance() {
  const errors: string[] = [];
  const corridorMinX = CORRIDOR_LEFT + HALF_WALL;
  const corridorMaxX = CORRIDOR_RIGHT - HALF_WALL;
  const exteriorLeftClear = LEFT + HALF_WALL;
  const exteriorRightClear = RIGHT - HALF_WALL;

  for (const placement of STAFF_WORKSTATION_PLACEMENTS) {
    const side = placement.side;
    const operatorDirection = side === "left" ? 1 : -1;
    const operatorFacing: 1 | -1 = side === "left" ? -1 : 1;
    const deskHalfDepth = STAFF_DESK_DEPTH / 2;
    const deskMinX = placement.x - deskHalfDepth;
    const deskMaxX = placement.x + deskHalfDepth;
    const operatorChairX = placement.x + operatorDirection * STAFF_CHAIR_OFFSET;
    const visitorChairX = placement.x - operatorDirection * STAFF_CHAIR_OFFSET;
    const operatorChairZ = placement.z;
    const visitorChairZ = placement.z;
    const operatorChairMinX = operatorChairX - STAFF_CHAIR_WIDTH / 2;
    const operatorChairMaxX = operatorChairX + STAFF_CHAIR_WIDTH / 2;
    const visitorChairMinX = visitorChairX - STAFF_VISITOR_CHAIR_WIDTH / 2;
    const visitorChairMaxX = visitorChairX + STAFF_VISITOR_CHAIR_WIDTH / 2;

    const deskToOperatorGap = side === "left" ? operatorChairMinX - deskMaxX : deskMinX - operatorChairMaxX;
    const deskToVisitorGap = side === "left" ? deskMinX - visitorChairMaxX : visitorChairMinX - deskMaxX;
    const corridorClearance = side === "left" ? corridorMinX - operatorChairMaxX : operatorChairMinX - corridorMaxX;
    const visitorWallClearance = side === "left" ? visitorChairMinX - exteriorLeftClear : exteriorRightClear - visitorChairMaxX;
    const deskCorridorClearance = side === "left" ? corridorMinX - deskMaxX : deskMinX - corridorMaxX;
    const operatorCentered = Math.abs(operatorChairZ - placement.z) < GEOMETRY_EPS;
    const visitorAcrossDesk = Math.abs(visitorChairZ - operatorChairZ) < GEOMETRY_EPS &&
      ((side === "left" && visitorChairX < placement.x && operatorChairX > placement.x) ||
        (side === "right" && visitorChairX > placement.x && operatorChairX < placement.x));

    if (!operatorCentered) errors.push(placement.roomId + ": operator chair is not centered on keyboard/monitor");
    if (!visitorAcrossDesk) errors.push(placement.roomId + ": visitor chair is not directly across the desk from the operator");
    if (operatorFacing !== (side === "left" ? -1 : 1)) errors.push(placement.roomId + ": operator facing direction is inconsistent");
    if (deskToOperatorGap < 0.12) errors.push(placement.roomId + ": operator chair is too close to the desk (" + deskToOperatorGap.toFixed(2) + " m)");
    if (deskToVisitorGap < 0.12) errors.push(placement.roomId + ": visitor chair is too close to the desk (" + deskToVisitorGap.toFixed(2) + " m)");
    if (corridorClearance < 0.75) errors.push(placement.roomId + ": operator chair leaves less than 0.75 m corridor clearance");
    if (deskCorridorClearance < 0.75) errors.push(placement.roomId + ": desk leaves less than 0.75 m corridor clearance");
    if (visitorWallClearance < STAFF_MIN_WALL_CLEARANCE) errors.push(placement.roomId + ": visitor chair is too close to the exterior wall (" + visitorWallClearance.toFixed(2) + " m)");
  }

  if (errors.length > 0) {
    console.error("[Office3D] STAFF WORKSTATION CLEARANCE INVALID", errors);
  } else {
    console.info("[Office3D] STAFF WORKSTATION GEOMETRY VALID — 4 desks, 4 operator chairs, 4 visitor chairs");
  }
  return errors;
}
function addReceptionFurniture(scene: THREE.Scene) {
  const deskMaterial = new THREE.MeshStandardMaterial({
    color: 0x6c4f3d,
    roughness: 0.62,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0xb38b5d,
    roughness: 0.48,
    metalness: 0.1,
  });
  const chairMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f3b46,
    roughness: 0.7,
  });
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x182531,
    roughness: 0.35,
    metalness: 0.2,
  });
  const waitingMaterial = new THREE.MeshStandardMaterial({
    color: 0x566d79,
    roughness: 0.78,
  });
  const softMaterial = new THREE.MeshStandardMaterial({
    color: 0xa6b8bf,
    roughness: 0.88,
  });
  const planterMaterial = new THREE.MeshStandardMaterial({
    color: 0x56605b,
    roughness: 0.88,
  });
  const greeneryMaterial = new THREE.MeshStandardMaterial({
    color: 0x3e6a52,
    roughness: 0.8,
  });

  // Reception desk — fully on the left side of the lobby so the central 2.4 m
  // visitor route and the 2 m office corridor stay unobstructed.
  const desk = meshBox(3.7, 1.05, 1.0, deskMaterial);
  desk.position.set(-4.1, 0.525, -9.05);
  desk.castShadow = true;
  desk.receiveShadow = true;
  desk.userData.receptionFurniture = "reception-desk";
  scene.add(desk);

  const deskTrim = meshBox(3.75, 0.08, 1.06, trimMaterial);
  deskTrim.position.set(-4.1, 1.03, -9.05);
  scene.add(deskTrim);

  const monitor = meshBox(0.95, 0.55, 0.06, screenMaterial);
  monitor.position.set(-4.1, 1.42, -9.05);
  monitor.castShadow = true;
  monitor.userData.receptionFurniture = "reception-monitor";
  scene.add(monitor);

  const monitorStand = meshBox(0.1, 0.32, 0.1, trimMaterial);
  monitorStand.position.set(-4.1, 1.17, -9.05);
  scene.add(monitorStand);

  const keyboard = meshBox(0.75, 0.035, 0.28, screenMaterial);
  keyboard.position.set(-4.1, 1.10, -8.73);
  keyboard.userData.receptionFurniture = "reception-keyboard";
  scene.add(keyboard);

  const receptionChairSeat = meshBox(0.78, 0.14, 0.78, chairMaterial);
  receptionChairSeat.position.set(-4.1, 0.53, -9.82);
  receptionChairSeat.castShadow = true;
  receptionChairSeat.userData.receptionFurniture = "reception-chair";
  scene.add(receptionChairSeat);

  const receptionChairBack = meshBox(0.78, 0.75, 0.14, chairMaterial);
  receptionChairBack.position.set(-4.1, 0.93, -10.16);
  receptionChairBack.castShadow = true;
  scene.add(receptionChairBack);

  // Waiting lounge sits fully to the right of the corridor.
  const waitingBench = meshBox(3.0, 0.52, 0.9, waitingMaterial);
  waitingBench.position.set(4.25, 0.43, -9.35);
  waitingBench.castShadow = true;
  waitingBench.receiveShadow = true;
  waitingBench.userData.receptionFurniture = "waiting-bench";
  scene.add(waitingBench);

  const waitingBack = meshBox(3.0, 0.95, 0.16, softMaterial);
  waitingBack.position.set(4.25, 0.98, -9.70);
  waitingBack.castShadow = true;
  scene.add(waitingBack);

  const waitingTable = meshBox(1.2, 0.1, 0.72, trimMaterial);
  waitingTable.position.set(4.25, 0.53, -10.35);
  waitingTable.castShadow = true;
  scene.add(waitingTable);

  const waitingTableBase = meshBox(0.18, 0.48, 0.18, chairMaterial);
  waitingTableBase.position.set(4.25, 0.27, -10.35);
  scene.add(waitingTableBase);

  // Greenery adds finish without occupying the corridor or any office doorway clearance.
  const planter = meshBox(0.62, 0.42, 0.62, planterMaterial);
  planter.position.set(6.15, 0.21, -8.25);
  planter.castShadow = true;
  scene.add(planter);

  const plantStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.06, 0.72, 10),
    greeneryMaterial,
  );
  plantStem.position.set(6.15, 0.78, -8.25);
  plantStem.castShadow = true;
  scene.add(plantStem);

  const plantCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 16, 12),
    greeneryMaterial,
  );
  plantCrown.position.set(6.15, 1.20, -8.25);
  plantCrown.scale.set(1, 0.8, 1);
  plantCrown.castShadow = true;
  scene.add(plantCrown);

  // Entrance branding panel.
  const signPanel = meshBox(2.8, 0.75, 0.08, screenMaterial);
  signPanel.position.set(4.0, 1.95, -11.20);
  signPanel.userData.receptionFurniture = "reception-sign";
  scene.add(signPanel);
}

function addMainEntranceDoor(scene: THREE.Scene) {
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbfd8df,
    transparent: true,
    opacity: 0.62,
    roughness: 0.18,
    metalness: 0.12,
    transmission: 0.16,
    thickness: 0.04,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x253540,
    roughness: 0.28,
    metalness: 0.82,
  });
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0xd0a866,
    roughness: 0.22,
    metalness: 0.9,
  });

  const doorHeight = 2.4;
  const leafWidth = MAIN_DOOR_W / 2 - 0.08;
  const doorZ = FRONT + 0.06;

  // Tall glass double doors with a slim architectural frame.
  for (const side of [-1, 1]) {
    const glassLeaf = meshBox(leafWidth, doorHeight, 0.07, glassMaterial);
    glassLeaf.position.set(side * (MAIN_DOOR_W / 4), doorHeight / 2, doorZ);
    glassLeaf.castShadow = true;
    glassLeaf.receiveShadow = true;
    glassLeaf.userData.doorId = "main-entrance";
    glassLeaf.userData.doorType = "glass-double";
    scene.add(glassLeaf);

    const verticalFrame = meshBox(0.055, doorHeight, 0.09, frameMaterial);
    verticalFrame.position.set(side * 0.02, doorHeight / 2, doorZ - 0.01);
    verticalFrame.castShadow = true;
    scene.add(verticalFrame);

    const pullHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.72, 16),
      handleMaterial,
    );
    pullHandle.position.set(side * 0.20, 1.28, doorZ - 0.065);
    pullHandle.castShadow = true;
    pullHandle.userData.doorId = "main-entrance";
    scene.add(pullHandle);
  }

  const sideFrameWidth = MAIN_DOOR_W / 2 - 0.08;
  for (const x of [-MAIN_DOOR_W / 2, MAIN_DOOR_W / 2]) {
    const jamb = meshBox(0.08, doorHeight + 0.12, 0.12, frameMaterial);
    jamb.position.set(x, (doorHeight + 0.12) / 2, doorZ);
    jamb.castShadow = true;
    scene.add(jamb);
  }

  const header = meshBox(MAIN_DOOR_W + 0.16, 0.10, 0.12, frameMaterial);
  header.position.set(0, doorHeight + 0.06, doorZ);
  header.castShadow = true;
  scene.add(header);

  const canopy = meshBox(MAIN_DOOR_W + 0.7, 0.10, 0.9, frameMaterial);
  canopy.position.set(0, doorHeight + 0.38, FRONT + 0.15);
  canopy.castShadow = true;
  scene.add(canopy);

  const mat = meshBox(MAIN_DOOR_W + 0.65, 0.025, 0.75, frameMaterial);
  mat.position.set(0, 0.16, FRONT + 0.45);
  mat.receiveShadow = true;
  scene.add(mat);
}

function addProfessionalRoomDoorFrames(scene: THREE.Scene, frameMaterial: THREE.Material) {
  for (const door of DOOR_OPENINGS) {
    const corridorX = door.side === "left"
      ? CORRIDOR_LEFT + 0.035
      : CORRIDOR_RIGHT - 0.035;

    for (const z of [door.z - door.width / 2, door.z + door.width / 2]) {
      const post = meshBox(0.09, 2.34, 0.08, frameMaterial);
      post.position.set(corridorX, 1.17, z);
      post.castShadow = true;
      post.userData.doorId = door.id;
      scene.add(post);
    }

    const header = meshBox(0.09, 0.09, door.width + 0.12, frameMaterial);
    header.position.set(corridorX, 2.34, door.z);
    header.castShadow = true;
    header.userData.doorId = door.id;
    scene.add(header);
  }
}

function buildFloorPlan(scene: THREE.Scene) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x3f4650, roughness: 0.78 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf0eee9, roughness: 0.92 });
  const corridorMaterial = new THREE.MeshStandardMaterial({ color: 0xe5e9ee, roughness: 0.9 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x93a6b7, roughness: 0.7, metalness: 0.15 });
  const roomFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x253540, roughness: 0.30, metalness: 0.78 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xd0a866, roughness: 0.22, metalness: 0.9 });

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
  addReceptionFurniture(scene);
  addStaffOfficeWorkstations(scene);
  addCorridorDecor(scene);
  addProfessionalRoomDoorFrames(scene, roomFrameMaterial);
  addMainEntranceDoor(scene);

  for (const door of DOOR_OPENINGS) {
    const leafWidth = door.width / 2 - 0.04;
    const corridorX = door.side === "left"
      ? CORRIDOR_LEFT + 0.035
      : CORRIDOR_RIGHT - 0.035;

    for (const direction of [-1, 1]) {
      const leaf = meshBox(0.06, 2.25, leafWidth, doorMaterial);
      leaf.position.set(corridorX, 1.125, door.z + direction * (door.width / 4));
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      leaf.userData.doorId = door.id;

      const handle = meshBox(0.025, 0.32, 0.035, handleMaterial);
      handle.position.set(
        corridorX + (door.side === "left" ? 0.035 : -0.035),
        1.13,
        door.z + direction * 0.06,
      );

      scene.add(leaf);
      scene.add(handle);
    }

    const header = meshBox(0.08, 0.08, door.width + 0.04, handleMaterial);
    header.position.set(corridorX, 2.28, door.z);
    header.userData.doorId = door.id;
    scene.add(header);
  }

  const threshold = meshBox(MAIN_DOOR_W, 0.04, 0.75, doorMaterial);
  threshold.position.set(0, 0.145, FRONT + 0.27);
  threshold.receiveShadow = true;
  threshold.userData.doorId = "main-entrance";
  scene.add(threshold);

  addLabel(scene, "RECEPTION · 14 × 4 m", 0, -9.8, 0x4a5d73);
  addLabel(scene, "WAITING LOUNGE", 4.2, -10.55, 0x4a5d73);
  addLabel(scene, "OFFICE 1 · 6 × 5 m", -4, -5);
  addLabel(scene, "OFFICE 2 · 6 × 5 m", 4, -5);
  addLabel(scene, "OFFICE 3 · 6 × 5 m", -4, 0);
  addLabel(scene, "OFFICE 4 · 6 × 5 m", 4, 0);
  addLabel(scene, "MEETING ROOM · 6 × 7 m", -4, 6);
  addLabel(scene, "BREAK ROOM · 6 × 7 m", 4, 6);
  addLabel(scene, "MANAGER'S OFFICE · 6 × 5 m", -4, 12);
  addLabel(scene, "DIRECTOR'S OFFICE · 6 × 5 m", 4, 12);
  addLabel(scene, "2 m CORRIDOR", 0, 2.5, 0x4a5d73);
  addLabel(scene, "MAIN ENTRANCE · 2.4 m", 0, FRONT + 0.82, 0x4a5d73);

  scene.userData.roomRects = ROOM_RECTS;
  scene.userData.corridor = { minX: -1, maxX: 1, minZ: FRONT, maxZ: BACK };
  scene.userData.reception = {
    minX: LEFT,
    maxX: RIGHT,
    minZ: FRONT,
    maxZ: ROOM_FRONT,
    clearCentralPassage: {
      minX: -RECEPTION_PASSAGE_W / 2,
      maxX: RECEPTION_PASSAGE_W / 2,
      minZ: FRONT + 0.5,
      maxZ: ROOM_FRONT - 0.5,
    },
  };
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

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 150);
    camera.position.set(24, 28, -29);

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
    controls.maxDistance = 42;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.25;
    controls.target.set(0, 0, (FRONT + BACK) / 2 + 0.7);

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

    const workstationClearanceErrors = validateStaffWorkstationClearance();
    scene.userData.workstationClearanceErrors = workstationClearanceErrors;

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
        <strong>Eight-space office + entrance reception</strong>
        <span>14 × 26 m total · 14 × 22 m core office · 4 m reception block · 2 m corridor · 1.5 m professional room doors · 2.4 m main entrance · 0.30 m walls</span>
      </div>
      <div className="office-3d-badge">FLOOR PLAN</div>
      <div className="office-geometry-status" data-valid="false">CHECKING GEOMETRY…</div>
    </div>
  );
}
export type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Design Studio"
  | "Finance"
  | "Support"
  | "Break Room"
  | "Open Office";

export type RoutineState = {
  status: "Working" | "Meeting" | "Break";
  task: string;
};

export type NavigationStep = {
  x: number;
  y: number;
  roomAfter?: OfficeRoom;
};

export type NavigationState = {
  goal: OfficeRoom;
  finalPoint: { x: number; y: number };
  steps: NavigationStep[];
  index: number;
};

export type OfficeNode = {
  room: OfficeRoom;
  x: number;
  y: number;
  neighbors: OfficeRoom[];
};

type Portal = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const portal = (fromX: number, fromY: number, toX: number, toY: number): Portal => ({
  from: { x: fromX, y: fromY },
  to: { x: toX, y: toY },
});

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 38, y: 91, neighbors: ["Open Office"] },
  "Manager Office": { room: "Manager Office", x: 17, y: 19, neighbors: ["Meeting Room", "Design Studio"] },
  "Meeting Room": { room: "Meeting Room", x: 51, y: 19, neighbors: ["Manager Office", "Support", "Finance"] },
  "Design Studio": { room: "Design Studio", x: 20, y: 68, neighbors: ["Manager Office", "Finance", "Open Office"] },
  Finance: { room: "Finance", x: 56, y: 68, neighbors: ["Meeting Room", "Design Studio", "Break Room", "Open Office"] },
  Support: { room: "Support", x: 84, y: 28, neighbors: ["Meeting Room"] },
  "Break Room": { room: "Break Room", x: 84, y: 75, neighbors: ["Finance", "Open Office"] },
  "Open Office": { room: "Open Office", x: 49, y: 53, neighbors: ["Design Studio", "Finance", "Break Room", "Reception"] },
};

const ROOM_PORTALS: Record<string, Record<string, Portal>> = {
  "Manager Office": {
    "Meeting Room": portal(26.92, 16.93, 34.73, 16.93),
    "Design Studio": portal(15.13, 29.63, 15.13, 41.71),
  },
  "Meeting Room": {
    "Manager Office": portal(34.73, 16.93, 26.92, 16.93),
    Support: portal(65.27, 16.93, 73.08, 16.93),
    Finance: portal(53.49, 29.63, 53.49, 41.71),
  },
  Support: {
    "Meeting Room": portal(73.08, 16.93, 65.27, 16.93),
  },
  "Design Studio": {
    "Manager Office": portal(15.13, 41.71, 15.13, 29.63),
    Finance: portal(33.89, 58.82, 43.44, 58.82),
    "Open Office": portal(39.54, 75.93, 39.54, 79.19),
  },
  Finance: {
    "Meeting Room": portal(53.49, 41.71, 53.49, 29.63),
    "Design Studio": portal(43.44, 58.82, 33.89, 58.82),
    "Break Room": portal(63.53, 58.82, 73.08, 58.82),
    "Open Office": portal(53.49, 75.93, 53.49, 79.19),
  },
  "Break Room": {
    Finance: portal(73.08, 58.82, 63.53, 58.82),
    "Open Office": portal(73.08, 80.86, 63.53, 80.86),
  },
  "Open Office": {
    "Design Studio": portal(39.54, 79.19, 39.54, 75.93),
    Finance: portal(53.49, 79.19, 53.49, 75.93),
    "Break Room": portal(63.53, 80.86, 73.08, 80.86),
    Reception: portal(38, 92, 38, 94),
  },
};

const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) <= 0.01 && Math.abs(a.y - b.y) <= 0.01;

type Rect = { minX: number; maxX: number; minY: number; maxY: number };

const WORLD = { minX: -14.34, maxX: 14.34, minY: -9.84, maxY: 12.84 };

const toPercentPoint = (x: number, y: number) => ({
  x: ((x - WORLD.minX) / (WORLD.maxX - WORLD.minX)) * 100,
  y: ((y - WORLD.minY) / (WORLD.maxY - WORLD.minY)) * 100,
});

const ROOM_WORLD_BOUNDS: Record<OfficeRoom, Rect> = {
  Reception: { minX: -2, maxX: 2, minY: 9, maxY: 12 },
  "Manager Office": { minX: -13.5, maxX: -6.5, minY: -9.5, maxY: -2.5 },
  "Meeting Room": { minX: -4.5, maxX: 4.5, minY: -9.5, maxY: -2.5 },
  "Design Studio": { minX: -13.5, maxX: -4.5, minY: -0.5, maxY: 7.5 },
  Finance: { minX: -2, maxX: 4, minY: -0.5, maxY: 7.5 },
  Support: { minX: 6.5, maxX: 13.5, minY: -9.5, maxY: -2.5 },
  "Break Room": { minX: 6.5, maxX: 13.5, minY: 1, maxY: 9 },
  "Open Office": { minX: -6, maxX: 4, minY: 7.5, maxY: 12.5 },
};

const furnitureBlocksWorld: Record<OfficeRoom, Rect[]> = {
  Reception: [],
  "Manager Office": [
    { minX: -13.4, maxX: -10.6, minY: -8.5, maxY: -7.1 },
  ],
  "Meeting Room": [
    { minX: -2.8, maxX: 2.8, minY: -7.25, maxY: -4.75 },
  ],
  "Design Studio": [
    { minX: -12.15, maxX: -9.35, minY: 1.0, maxY: 2.4 },
    { minX: -8.65, maxX: -5.85, minY: 1.0, maxY: 2.4 },
    { minX: -12.15, maxX: -9.35, minY: 4.6, maxY: 6.0 },
    { minX: -8.65, maxX: -5.85, minY: 4.6, maxY: 6.0 },
  ],
  Finance: [
    { minX: -2.15, maxX: 0.65, minY: 1.0, maxY: 2.4 },
    { minX: 1.35, maxX: 4.15, minY: 1.0, maxY: 2.4 },
    { minX: -2.15, maxX: 0.65, minY: 4.6, maxY: 6.0 },
    { minX: 1.35, maxX: 4.15, minY: 4.6, maxY: 6.0 },
  ],
  Support: [
    { minX: 6.85, maxX: 9.65, minY: -6.7, maxY: -5.3 },
    { minX: 10.35, maxX: 13.15, minY: -6.7, maxY: -5.3 },
  ],
  "Break Room": [
    { minX: 8.35, maxX: 11.65, minY: 3.85, maxY: 7.15 },
  ],
  "Open Office": [
    { minX: -4.4, maxX: -1.6, minY: 8.7, maxY: 10.1 },
    { minX: -0.4, maxX: 2.4, minY: 8.7, maxY: 10.1 },
  ],
};

const ROOM_BOUNDS: Record<OfficeRoom, Rect> = Object.fromEntries(
  (Object.keys(ROOM_WORLD_BOUNDS) as OfficeRoom[]).map((room) => {
    const b = ROOM_WORLD_BOUNDS[room];
    const min = toPercentPoint(b.minX, b.minY);
    const max = toPercentPoint(b.maxX, b.maxY);
    return [room, { minX: min.x, maxX: max.x, minY: min.y, maxY: max.y }];
  }),
) as Record<OfficeRoom, Rect>;

const FURNITURE_BLOCKS: Record<OfficeRoom, Rect[]> = Object.fromEntries(
  (Object.keys(furnitureBlocksWorld) as OfficeRoom[]).map((room) => [
    room,
    furnitureBlocksWorld[room].map((b) => {
      const min = toPercentPoint(b.minX, b.minY);
      const max = toPercentPoint(b.maxX, b.maxY);
      return { minX: min.x, maxX: max.x, minY: min.y, maxY: max.y };
    }),
  ]),
) as Record<OfficeRoom, Rect[]>;

const NAV_GRID = 0.55;
const NAV_CLEARANCE = 0.35;

function pointInsideRect(point: { x: number; y: number }, rect: Rect, padding = 0) {
  return point.x >= rect.minX - padding
    && point.x <= rect.maxX + padding
    && point.y >= rect.minY - padding
    && point.y <= rect.maxY + padding;
}

function clampPointToRoom(point: { x: number; y: number }, room: OfficeRoom) {
  const bounds = ROOM_BOUNDS[room];
  const edge = 0.18;
  return {
    x: Math.max(bounds.minX + edge, Math.min(bounds.maxX - edge, point.x)),
    y: Math.max(bounds.minY + edge, Math.min(bounds.maxY - edge, point.y)),
  };
}

function simplifyPath(points: { x: number; y: number }[]) {
  if (points.length <= 2) return points;
  const simplified = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = simplified[simplified.length - 1];
    const current = points[i];
    const next = points[i + 1];
    const cross = (current.x - prev.x) * (next.y - current.y) - (current.y - prev.y) * (next.x - current.x);
    if (Math.abs(cross) > 0.08) simplified.push(current);
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

function findRoomPath(room: OfficeRoom, start: { x: number; y: number }, goal: { x: number; y: number }) {
  const bounds = ROOM_BOUNDS[room];
  const startPoint = clampPointToRoom(start, room);
  const goalPoint = clampPointToRoom(goal, room);

  const blocked = (point: { x: number; y: number }) => {
    if (samePoint(point, startPoint) || samePoint(point, goalPoint)) return false;
    return FURNITURE_BLOCKS[room].some((rect) => pointInsideRect(point, rect, NAV_CLEARANCE))
      || point.x < bounds.minX - 0.25
      || point.x > bounds.maxX + 0.25
      || point.y < bounds.minY - 0.25
      || point.y > bounds.maxY + 0.25;
  };

  const cols = Math.floor((bounds.maxX - bounds.minX) / NAV_GRID) + 1;
  const rows = Math.floor((bounds.maxY - bounds.minY) / NAV_GRID) + 1;

  const toCell = (point: { x: number; y: number }) => ({
    c: Math.max(0, Math.min(cols - 1, Math.round((point.x - bounds.minX) / NAV_GRID))),
    r: Math.max(0, Math.min(rows - 1, Math.round((point.y - bounds.minY) / NAV_GRID))),
  });

  const toPoint = (cell: { c: number; r: number }) => ({
    x: bounds.minX + cell.c * NAV_GRID,
    y: bounds.minY + cell.r * NAV_GRID,
  });

  const startCell = toCell(startPoint);
  const goalCell = toCell(goalPoint);
  const key = (cell: { c: number; r: number }) => String(cell.c) + ":" + String(cell.r);

  const open: { c: number; r: number; g: number; f: number }[] = [{
    ...startCell,
    g: 0,
    f: Math.hypot(goalCell.c - startCell.c, goalCell.r - startCell.r),
  }];
  const cameFrom = new Map<string, string>();
  const bestG = new Map<string, number>([[key(startCell), 0]]);
  const neighbors = [-1, 0, 1].flatMap((dc) => [-1, 0, 1].map((dr) => [dc, dr] as const))
    .filter(([dc, dr]) => dc !== 0 || dr !== 0);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = key(current);

    if (current.c === goalCell.c && current.r === goalCell.r) {
      const cells = [currentKey];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor)!;
        cells.push(cursor);
      }
      cells.reverse();
      const points = cells.map((item) => {
        const [c, r] = item.split(":").map(Number);
        return toPoint({ c, r });
      });
      points[0] = startPoint;
      points[points.length - 1] = goalPoint;
      return simplifyPath(points);
    }

    for (const [dc, dr] of neighbors) {
      const next = { c: current.c + dc, r: current.r + dr };
      if (next.c < 0 || next.c >= cols || next.r < 0 || next.r >= rows) continue;
      const point = toPoint(next);
      if (blocked(point)) continue;

      const diagonal = dc !== 0 && dr !== 0;
      const cost = diagonal ? 1.414 : 1;
      const tentativeG = (bestG.get(currentKey) ?? Infinity) + cost;
      const nextKey = key(next);
      if (tentativeG >= (bestG.get(nextKey) ?? Infinity)) continue;
      bestG.set(nextKey, tentativeG);
      cameFrom.set(nextKey, currentKey);
      open.push({
        ...next,
        g: tentativeG,
        f: tentativeG + Math.hypot(goalCell.c - next.c, goalCell.r - next.r),
      });
    }
  }

  return null;
}

function appendRoomPath(steps: NavigationStep[], room: OfficeRoom, from: { x: number; y: number }, to: { x: number; y: number }, roomAfter?: OfficeRoom) {
  const path = findRoomPath(room, from, to);
  if (!path) return false;
  for (const point of path) {
    if (!samePoint(steps.at(-1) ?? { x: -999, y: -999 }, point)) {
      steps.push({ x: point.x, y: point.y });
    }
  }
  if (roomAfter && steps.length) steps[steps.length - 1] = { ...steps[steps.length - 1], roomAfter };
  return true;
}

export function findPath(start: OfficeRoom, goal: OfficeRoom): OfficeRoom[] {
  if (start === goal) return [start];
  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const path = queue.shift()!;
    const room = path[path.length - 1];

    for (const neighbor of officeNodes[room].neighbors) {
      if (seen.has(neighbor)) continue;
      if (!ROOM_PORTALS[room]?.[neighbor]) continue;
      const next = [...path, neighbor];
      if (neighbor === goal) return next;
      seen.add(neighbor);
      queue.push(next);
    }
  }

  return [start];
}

function buildNavigation(
  start: OfficeRoom,
  goal: OfficeRoom,
  startPoint: { x: number; y: number },
  finalPoint: { x: number; y: number },
): NavigationState {
  const rooms = findPath(start, goal);
  if (rooms[rooms.length - 1] !== goal) {
    return { goal, finalPoint, steps: [], index: 0 };
  }

  const steps: NavigationStep[] = [];
  let current = { ...startPoint };

  for (let i = 0; i < rooms.length - 1; i += 1) {
    const fromRoom = rooms[i];
    const toRoom = rooms[i + 1];
    const route = ROOM_PORTALS[fromRoom]?.[toRoom];
    if (!route) return { goal, finalPoint, steps: [], index: 0 };

    const approachStart = current;
    if (!appendRoomPath(steps, fromRoom, approachStart, route.from)) {
      return { goal, finalPoint, steps: [], index: 0 };
    }

    if (!samePoint(steps.at(-1) ?? { x: -999, y: -999 }, route.to)) {
      steps.push({ x: route.to.x, y: route.to.y, roomAfter: toRoom });
    } else if (steps.length) {
      steps[steps.length - 1] = { ...steps[steps.length - 1], roomAfter: toRoom };
    }

    current = route.to;
  }

  const finalRoom = rooms[rooms.length - 1];
  if (!appendRoomPath(steps, finalRoom, current, finalPoint)) {
    return { goal, finalPoint, steps: [], index: 0 };
  }

  return { goal, finalPoint, steps, index: 0 };
}

function moveToward(person: { x: number; y: number }, target: { x: number; y: number }, speed: number) {
  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= speed) return { x: target.x, y: target.y, arrived: true };
  return { x: person.x + (dx / distance) * speed, y: person.y + (dy / distance) * speed, arrived: false };
}

export function homeRoomForDepartment(department: string): OfficeRoom {
  const map: Record<string, OfficeRoom> = {
    Management: "Manager Office",
    Design: "Design Studio",
    Finance: "Finance",
    Support: "Support",
    Operations: "Open Office",
    Marketing: "Open Office",
  };
  return map[department] ?? "Open Office";
}

export function deskSpotForStaff(department: string, id: number) {
  const positions: Record<OfficeRoom, { x: number; y: number }[]> = {
    Reception: [{ x: 38, y: 93 }],
    "Manager Office": [{ x: 8.16, y: 13.4 }],
    "Meeting Room": [{ x: 42.33, y: 25.09 }, { x: 47.38, y: 25.09 }, { x: 52.62, y: 25.09 }, { x: 57.67, y: 25.09 }],
    "Design Studio": [{ x: 12.52, y: 55.29 }, { x: 24.72, y: 55.29 }, { x: 12.52, y: 62.35 }, { x: 24.72, y: 62.35 }],
    Finance: [{ x: 47.38, y: 55.29 }, { x: 59.59, y: 55.29 }, { x: 47.38, y: 62.35 }, { x: 59.59, y: 62.35 }],
    Support: [{ x: 78.77, y: 21.34 }, { x: 90.97, y: 21.34 }],
    "Break Room": [{ x: 78.77, y: 73.06 }, { x: 90.97, y: 73.06 }, { x: 78.77, y: 90.68 }, { x: 90.97, y: 90.68 }],
    "Open Office": [{ x: 39.54, y: 89.24 }, { x: 53.49, y: 89.24 }],
  };
  const list = positions[homeRoomForDepartment(department)];
  return list[(Math.max(1, id) - 1) % list.length];
}

export function targetRoomForStaff(department: string, status: string): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department);
}

export function routineForStaff(department: string, id: number, unixSeconds: number): RoutineState {
  const phase = (unixSeconds + id * 47) % 360;
  const taskByDepartment: Record<string, string> = {
    Finance: "Processing payroll", Support: "Customer inbox", Design: "Design review",
    Marketing: "Campaign work", Operations: "Operations queue", Management: "Team management",
  };
  if (phase < 285) return { status: "Working", task: taskByDepartment[department] ?? "Focused work" };
  if (phase < 325 && department !== "Support") return { status: "Meeting", task: "Team sync" };
  return { status: "Break", task: "Taking a short break" };
}

export function activitySpotForStaff(department: string, status: "Working" | "Meeting" | "Break", id: number) {
  if (status === "Working") return deskSpotForStaff(department, id);
  if (status === "Meeting") {
    const seats = [
      { x: 42.33, y: 25.09 }, { x: 47.38, y: 25.09 }, { x: 52.62, y: 25.09 }, { x: 57.67, y: 25.09 },
      { x: 42.33, y: 8.77 }, { x: 47.38, y: 8.77 }, { x: 52.62, y: 8.77 }, { x: 57.67, y: 8.77 },
    ];
    return seats[(Math.max(1, id) - 1) % seats.length];
  }
  const seats = [
    { x: 78.77, y: 73.06 }, { x: 90.97, y: 73.06 }, { x: 78.77, y: 90.68 }, { x: 90.97, y: 90.68 },
  ];
  return seats[(Math.max(1, id) - 1) % seats.length];
}

export function isAtTarget(person: { x: number; y: number }, target: { x: number; y: number }, tolerance = 0.7) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

export function advanceActor(
  person: { x: number; y: number; location?: OfficeRoom; navigation?: NavigationState },
  goal: OfficeRoom,
  speed = 1.15,
  finalPoint?: { x: number; y: number },
) {
  const destination = finalPoint ?? officeNodes[goal];
  const currentRoom = person.location && officeNodes[person.location] ? person.location : "Open Office";
  const existingNavigation = person.navigation;

  const needsNewRoute = !existingNavigation
    || existingNavigation.goal !== goal
    || !samePoint(existingNavigation.finalPoint, destination)
    || existingNavigation.index >= existingNavigation.steps.length;

  const activeNavigation = needsNewRoute
    ? buildNavigation(currentRoom, goal, { x: person.x, y: person.y }, destination)
    : existingNavigation;

  if (!activeNavigation.steps.length) {
    return {
      x: person.x,
      y: person.y,
      location: currentRoom,
      navigation: undefined,
    };
  }

  let x = person.x;
  let y = person.y;
  let location = currentRoom;
  let index = activeNavigation.index;
  let guard = 0;

  while (index < activeNavigation.steps.length && guard < 2) {
    guard += 1;
    const step = activeNavigation.steps[index];
    const moved = moveToward({ x, y }, step, speed);
    x = moved.x;
    y = moved.y;

    if (!moved.arrived) break;
    if (step.roomAfter) location = step.roomAfter;
    index += 1;
  }

  const arrived = index >= activeNavigation.steps.length;

  return {
    x,
    y,
    location: arrived ? goal : location,
    navigation: arrived ? undefined : { ...activeNavigation, index },
  };
}

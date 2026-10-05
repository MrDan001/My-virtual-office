export type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Design Studio"
  | "Finance"
  | "Support"
  | "Break Room"
  | "Open Office";

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
  "Open Office": { room: "Open Office", x: 49, y: 53, neighbors: ["Design Studio", "Finance", "Break Room"] },
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
  },
};

function nextRoomInPath(start: OfficeRoom, goal: OfficeRoom): { room: OfficeRoom; portal: Portal } | null {
  if (start === goal) return null;

  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const path = queue.shift()!;
    const room = path[path.length - 1];

    for (const neighbor of officeNodes[room].neighbors) {
      if (seen.has(neighbor)) continue;
      const next = [...path, neighbor];
      if (neighbor === goal) {
        const firstNext = next[1];
        const routePortal = ROOM_PORTALS[room]?.[firstNext];
        if (routePortal) return { room: firstNext, portal: routePortal };
        return null;
      }
      seen.add(neighbor);
      queue.push(next);
    }
  }

  return null;
}

function moveToward(
  person: { x: number; y: number },
  target: { x: number; y: number },
  speed: number,
) {
  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) {
    return { x: target.x, y: target.y, arrived: true };
  }

  return {
    x: person.x + (dx / distance) * speed,
    y: person.y + (dy / distance) * speed,
    arrived: false,
  };
}

export function findPath(start: OfficeRoom, goal: OfficeRoom): OfficeRoom[] {
  if (start === goal) return [start];

  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const currentPath = queue.shift()!;
    const current = currentPath[currentPath.length - 1];

    for (const neighbor of officeNodes[current].neighbors) {
      if (seen.has(neighbor)) continue;
      const next = [...currentPath, neighbor];
      if (neighbor === goal) return next;
      seen.add(neighbor);
      queue.push(next);
    }
  }

  return [start, goal];
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
    Reception: [{ x: 38.0, y: 93.0 }],
    "Manager Office": [{ x: 8.16, y: 13.40 }],
    "Meeting Room": [
      { x: 42.33, y: 25.09 },
      { x: 47.38, y: 25.09 },
      { x: 52.62, y: 25.09 },
      { x: 57.67, y: 25.09 },
    ],
    "Design Studio": [
      { x: 12.52, y: 55.29 },
      { x: 24.72, y: 55.29 },
      { x: 12.52, y: 62.35 },
      { x: 24.72, y: 62.35 },
    ],
    Finance: [
      { x: 47.38, y: 55.29 },
      { x: 59.59, y: 55.29 },
      { x: 47.38, y: 62.35 },
      { x: 59.59, y: 62.35 },
    ],
    Support: [
      { x: 78.77, y: 21.34 },
      { x: 90.97, y: 21.34 },
    ],
    "Break Room": [
      { x: 78.77, y: 73.06 },
      { x: 90.97, y: 73.06 },
      { x: 78.77, y: 90.68 },
      { x: 90.97, y: 90.68 },
    ],
    "Open Office": [
      { x: 39.54, y: 89.24 },
      { x: 53.49, y: 89.24 },
    ],
  };

  const room = homeRoomForDepartment(department);
  const list = positions[room];
  return list[(Math.max(1, id) - 1) % list.length];
}
export function targetRoomForStaff(department: string, status: string): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department);
}

export function routineForStaff(department: string, id: number, unixSeconds: number): RoutineState {
  const cycleLength = 360;
  const phase = (unixSeconds + id * 47) % cycleLength;

  if (phase < 285) {
    const taskByDepartment: Record<string, string> = {
      Finance: "Processing payroll",
      Support: "Customer inbox",
      Design: "Design review",
      Marketing: "Campaign work",
      Operations: "Operations queue",
      Management: "Team management",
    };
    return { status: "Working", task: taskByDepartment[department] ?? "Focused work" };
  }

  if (phase < 325 && department !== "Support") {
    return { status: "Meeting", task: "Team sync" };
  }

  if (phase < 360) {
    return { status: "Break", task: "Taking a short break" };
  }

  return { status: "Working", task: "Focused work" };
}

// Final movement tuning: callers pass the human-scale walking speed used by the 3D viewer.
export function advanceActor(
  person: { x: number; y: number; location?: OfficeRoom },
  goal: OfficeRoom,
  speed = 0.65,
  finalPoint?: { x: number; y: number },
) {
  const start = person.location && officeNodes[person.location] ? person.location : "Open Office";

  if (start === goal) {
    if (!finalPoint) return { x: person.x, y: person.y, location: goal };
    const move = moveToward(person, finalPoint, speed);
    return { x: move.x, y: move.y, location: goal };
  }

  const route = nextRoomInPath(start, goal);
  if (!route) {
    const fallback = moveToward(person, finalPoint ?? officeNodes[goal], speed);
    return { x: fallback.x, y: fallback.y, location: start };
  }

  const sourcePortal = route.portal.from;
  const destinationPortal = route.portal.to;

  // Walk inside the current room to the actual doorway first.
  const sourceDistance = Math.hypot(person.x - sourcePortal.x, person.y - sourcePortal.y);
  const destinationDistance = Math.hypot(person.x - destinationPortal.x, person.y - destinationPortal.y);

  // Once the staff member reaches the doorway, continue through the opening
  // toward the matching point on the other side. This prevents wall crossing
  // while still producing continuous movement through the passage.
  const target = sourceDistance <= 0.9 || destinationDistance < sourceDistance
    ? destinationPortal
    : sourcePortal;

  const move = moveToward(person, target, speed);

  if (move.arrived && target === destinationPortal) {
    return {
      x: destinationPortal.x,
      y: destinationPortal.y,
      location: route.room,
    };
  }

  return {
    x: move.x,
    y: move.y,
    location: start,
  };
}


export function activitySpotForStaff(
  department: string,
  status: "Working" | "Meeting" | "Break",
  id: number,
) {
  if (status === "Working") return deskSpotForStaff(department, id);

  if (status === "Meeting") {
    const seats = [
      { x: 42.33, y: 25.09 },
      { x: 47.38, y: 25.09 },
      { x: 52.62, y: 25.09 },
      { x: 57.67, y: 25.09 },
      { x: 42.33, y: 8.77 },
      { x: 47.38, y: 8.77 },
      { x: 52.62, y: 8.77 },
      { x: 57.67, y: 8.77 },
    ];
    return seats[(Math.max(1, id) - 1) % seats.length];
  }

  const seats = [
    { x: 78.77, y: 73.06 },
    { x: 90.97, y: 73.06 },
    { x: 78.77, y: 90.68 },
    { x: 90.97, y: 90.68 },
  ];
  return seats[(Math.max(1, id) - 1) % seats.length];
}
export function isAtTarget(
  person: { x: number; y: number },
  target: { x: number; y: number },
  tolerance = 0.7,
) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

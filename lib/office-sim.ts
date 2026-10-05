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

export function findPath(start: OfficeRoom, goal: OfficeRoom): OfficeRoom[] {
  if (start === goal) return [start];
  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);
  while (queue.length) {
    const path = queue.shift()!;
    const room = path[path.length - 1];
    for (const neighbor of officeNodes[room].neighbors) {
      if (seen.has(neighbor)) continue;
      const next = [...path, neighbor];
      if (neighbor === goal) return next;
      seen.add(neighbor);
      queue.push(next);
    }
  }
  return [start];
}

function buildNavigation(start: OfficeRoom, goal: OfficeRoom, finalPoint: { x: number; y: number }): NavigationState {
  const rooms = findPath(start, goal);
  const steps: NavigationStep[] = [];

  for (let i = 0; i < rooms.length - 1; i += 1) {
    const route = ROOM_PORTALS[rooms[i]]?.[rooms[i + 1]];
    if (!route) continue;
    if (!samePoint(steps.at(-1) ?? { x: -999, y: -999 }, route.from)) {
      steps.push({ x: route.from.x, y: route.from.y });
    }
    steps.push({ x: route.to.x, y: route.to.y, roomAfter: rooms[i + 1] });
  }

  if (!samePoint(steps.at(-1) ?? { x: -999, y: -999 }, finalPoint)) {
    steps.push({ x: finalPoint.x, y: finalPoint.y });
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
  let navigation = person.navigation;

  const needsNewRoute = !navigation
    || navigation.goal !== goal
    || !samePoint(navigation.finalPoint, destination)
    || navigation.index >= navigation.steps.length;

  if (needsNewRoute) navigation = buildNavigation(currentRoom, goal, destination);

  let x = person.x;
  let y = person.y;
  let location = currentRoom;
  let index = navigation.index;
  let guard = 0;

  while (index < navigation.steps.length && guard < 4) {
    guard += 1;
    const step = navigation.steps[index];
    const moved = moveToward({ x, y }, step, speed);
    x = moved.x;
    y = moved.y;
    if (!moved.arrived) break;
    if (step.roomAfter) location = step.roomAfter;
    index += 1;
  }

  const arrived = index >= navigation.steps.length;
  return {
    x,
    y,
    location: arrived ? goal : location,
    navigation: arrived ? undefined : { ...navigation, index },
  };
}

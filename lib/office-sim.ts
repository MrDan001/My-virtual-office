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

export type OfficeNode = {
  room: OfficeRoom;
  x: number;
  y: number;
  neighbors: OfficeRoom[];
};

const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

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

  return [start, goal];
}

export function advanceActor(
  person: { x: number; y: number; location?: OfficeRoom },
  goal: OfficeRoom,
  speed = 0.65,
  finalPoint?: { x: number; y: number },
) {
  const start = person.location && officeNodes[person.location] ? person.location : "Open Office";
  const path = findPath(start, goal);
  const nextRoom = path[1] ?? goal;
  const target = nextRoom === goal && finalPoint ? finalPoint : officeNodes[nextRoom];

  const distance = distanceBetween(person, target);

  if (distance <= speed) {
    return {
      x: target.x,
      y: target.y,
      location: nextRoom,
    };
  }

  const ratio = speed / distance;
  return {
    x: person.x + (target.x - person.x) * ratio,
    y: person.y + (target.y - person.y) * ratio,
    location: start,
  };
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

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

export type RoutineState = {
  status: "Working" | "Meeting" | "Break";
  task: string;
};

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 38, y: 91, neighbors: ["Open Office", "Support"] },
  "Manager Office": { room: "Manager Office", x: 17, y: 19, neighbors: ["Open Office", "Meeting Room"] },
  "Meeting Room": { room: "Meeting Room", x: 51, y: 19, neighbors: ["Manager Office", "Open Office", "Support"] },
  "Design Studio": { room: "Design Studio", x: 20, y: 68, neighbors: ["Open Office", "Support"] },
  Finance: { room: "Finance", x: 56, y: 68, neighbors: ["Open Office", "Meeting Room", "Break Room"] },
  Support: { room: "Support", x: 84, y: 28, neighbors: ["Reception", "Meeting Room", "Design Studio", "Break Room"] },
  "Break Room": { room: "Break Room", x: 84, y: 75, neighbors: ["Support", "Finance", "Open Office"] },
  "Open Office": { room: "Open Office", x: 49, y: 53, neighbors: ["Reception", "Manager Office", "Meeting Room", "Design Studio", "Finance", "Break Room"] },
};

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
    Reception: [{ x: 38, y: 88 }],
    "Manager Office": [{ x: 17, y: 23 }, { x: 24, y: 23 }],
    "Meeting Room": [{ x: 43, y: 25 }, { x: 48, y: 25 }, { x: 53, y: 25 }, { x: 58, y: 25 }],
    "Design Studio": [{ x: 18, y: 50 }, { x: 29, y: 50 }, { x: 18, y: 78 }, { x: 29, y: 78 }],
    Finance: [{ x: 51, y: 55 }, { x: 61, y: 55 }, { x: 51, y: 83 }, { x: 61, y: 83 }],
    Support: [{ x: 80, y: 20 }, { x: 88, y: 20 }, { x: 80, y: 38 }, { x: 88, y: 38 }],
    "Break Room": [{ x: 80, y: 72 }, { x: 88, y: 72 }, { x: 80, y: 82 }, { x: 88, y: 82 }],
    "Open Office": [{ x: 42, y: 45 }, { x: 51, y: 45 }, { x: 42, y: 70 }, { x: 51, y: 70 }],
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

export function advanceActor(
  person: { x: number; y: number; location?: OfficeRoom },
  goal: OfficeRoom,
  speed = 0.65,
  finalPoint?: { x: number; y: number },
) {
  const start = person.location && officeNodes[person.location] ? person.location : "Open Office";
  const path = findPath(start, goal);
  const nextRoom = path[1] ?? goal;
  const roomTarget = officeNodes[nextRoom];
  const target = nextRoom === goal && finalPoint ? finalPoint : roomTarget;

  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) {
    return { x: target.x, y: target.y, location: nextRoom as OfficeRoom };
  }

  return {
    x: person.x + (dx / distance) * speed,
    y: person.y + (dy / distance) * speed,
    location: start,
  };
}

export function isAtTarget(
  person: { x: number; y: number },
  target: { x: number; y: number },
  tolerance = 0.7,
) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

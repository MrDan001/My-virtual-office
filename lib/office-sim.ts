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

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 37, y: 92, neighbors: ["Open Office", "Support"] },
  "Manager Office": { room: "Manager Office", x: 17, y: 17, neighbors: ["Open Office", "Meeting Room"] },
  "Meeting Room": { room: "Meeting Room", x: 51, y: 18, neighbors: ["Manager Office", "Open Office", "Support"] },
  "Design Studio": { room: "Design Studio", x: 20, y: 67, neighbors: ["Open Office", "Support"] },
  Finance: { room: "Finance", x: 56, y: 67, neighbors: ["Open Office", "Meeting Room", "Break Room"] },
  Support: { room: "Support", x: 84, y: 27, neighbors: ["Reception", "Meeting Room", "Design Studio", "Break Room"] },
  "Break Room": { room: "Break Room", x: 84, y: 75, neighbors: ["Support", "Finance", "Open Office"] },
  "Open Office": { room: "Open Office", x: 43, y: 52, neighbors: ["Reception", "Manager Office", "Meeting Room", "Design Studio", "Finance", "Break Room"] },
};

export function findPath(start: OfficeRoom, goal: OfficeRoom): OfficeRoom[] {
  if (start === goal) return [start];
  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    for (const neighbor of officeNodes[node].neighbors) {
      if (seen.has(neighbor)) continue;
      const next = [...path, neighbor];
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

export function targetRoomForStaff(department: string, status: string, second: number): OfficeRoom {
  if (status === "Away") return homeRoomForDepartment(department);
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";

  const home = homeRoomForDepartment(department);
  const rotation = second % 24;
  if (rotation >= 10 && rotation < 14 && department !== "Support") return "Open Office";
  if (rotation >= 18 && rotation < 21) return "Reception";
  return home;
}

export function advanceActor(
  person: { x: number; y: number; location?: OfficeRoom },
  goal: OfficeRoom,
  speed = 3.2,
) {
  const start = person.location && officeNodes[person.location] ? person.location : "Open Office";
  const path = findPath(start, goal);
  const nextRoom = path[1] ?? goal;
  const target = officeNodes[nextRoom];

  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) return { x: target.x, y: target.y, location: nextRoom as OfficeRoom };
  return {
    x: person.x + (dx / distance) * speed,
    y: person.y + (dy / distance) * speed,
    location: start,
  };
}


export function routineForStaff(department: string, id: number, unixSeconds: number) {
  const cycle = Math.floor(unixSeconds / 12) + id;
  const phase = cycle % 4;

  if (phase === 1 && department !== "Support") return { status: "Meeting", task: "Team sync" as const };
  if (phase === 2) return { status: "Break", task: "Taking a short break" as const };
  if (phase === 3) return { status: "Working", task: department === "Finance" ? "Processing payroll" : department === "Support" ? "Customer inbox" : "Focused work" };
  return { status: "Working", task: department === "Design" ? "Design review" : department === "Operations" ? "Operations queue" : "Focused work" };
}

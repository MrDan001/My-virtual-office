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

const leadershipPattern =
  /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i;

export function isLeadershipRole(role = "") {
  return leadershipPattern.test(role);
}

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 50, y: 93, neighbors: ["Open Office", "Support"] },
  "Manager Office": { room: "Manager Office", x: 16.5, y: 33, neighbors: ["Open Office", "Meeting Room"] },
  "Meeting Room": { room: "Meeting Room", x: 51, y: 33, neighbors: ["Manager Office", "Open Office", "Support"] },
  "Design Studio": { room: "Design Studio", x: 22, y: 38, neighbors: ["Open Office", "Support"] },
  Finance: { room: "Finance", x: 56.5, y: 38, neighbors: ["Open Office", "Meeting Room", "Break Room"] },
  Support: { room: "Support", x: 84.5, y: 49, neighbors: ["Reception", "Meeting Room", "Design Studio", "Break Room"] },
  "Break Room": { room: "Break Room", x: 84.5, y: 53, neighbors: ["Support", "Finance", "Open Office"] },
  "Open Office": { room: "Open Office", x: 52, y: 53, neighbors: ["Reception", "Manager Office", "Meeting Room", "Design Studio", "Finance", "Break Room"] },
};

export const deskSpots: Record<OfficeRoom, { x: number; y: number }[]> = {
  Reception: [{ x: 50, y: 88 }],
  "Manager Office": [{ x: 17, y: 24 }, { x: 24, y: 24 }],
  "Meeting Room": [
    { x: 44, y: 23 },
    { x: 48.5, y: 23 },
    { x: 53, y: 23 },
    { x: 57.5, y: 23 },
    { x: 44, y: 30 },
    { x: 57.5, y: 30 },
  ],
  "Design Studio": [
    { x: 13, y: 62 },
    { x: 28, y: 62 },
    { x: 13, y: 82 },
    { x: 28, y: 82 },
  ],
  Finance: [
    { x: 49, y: 62 },
    { x: 63, y: 62 },
    { x: 49, y: 82 },
    { x: 63, y: 82 },
  ],
  Support: [
    { x: 82, y: 17 },
    { x: 89, y: 17 },
    { x: 82, y: 36 },
    { x: 89, y: 36 },
  ],
  "Break Room": [
    { x: 79, y: 72 },
    { x: 87, y: 72 },
    { x: 79, y: 85 },
    { x: 87, y: 85 },
  ],
  "Open Office": [
    { x: 40, y: 64 },
    { x: 49, y: 64 },
    { x: 40, y: 82 },
    { x: 49, y: 82 },
    { x: 58, y: 64 },
    { x: 58, y: 82 },
  ],
};

export function homeRoomForDepartment(
  department: string,
  role = "",
): OfficeRoom {
  if (department === "Management" || isLeadershipRole(role)) {
    return "Manager Office";
  }

  const map: Record<string, OfficeRoom> = {
    Design: "Design Studio",
    Finance: "Finance",
    Support: "Support",
    Operations: "Open Office",
    Marketing: "Open Office",
  };

  return map[department] ?? "Open Office";
}

export function deskSpotForStaff(
  department: string,
  id: number,
  role = "",
  seatIndex = 0,
) {
  const room = homeRoomForDepartment(department, role);
  const spots = deskSpots[room];
  const safeIndex = Math.max(0, Number.isFinite(seatIndex) ? seatIndex : 0);
  return spots[safeIndex % spots.length] ?? spots[0];
}

export function targetRoomForStaff(
  department: string,
  status: string,
  role = "",
): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department, role);
}

export function routineForStaff(
  department: string,
  id: number,
  unixSeconds: number,
  role = "",
): RoutineState {
  // Long work blocks keep staff in their own office most of the time.
  const cycleLength = 600;
  const phase = (unixSeconds + id * 73) % cycleLength;

  if (
    (department === "Management" || isLeadershipRole(role)) &&
    phase >= 180 &&
    phase < 220
  ) {
    return { status: "Meeting", task: "Leadership sync" };
  }

  const meetingDepartments = [
    "Design",
    "Finance",
    "Operations",
    "Marketing",
    "Support",
  ];
  const meetingSlot = meetingDepartments[Math.floor(phase / 55) % meetingDepartments.length];

  if (phase >= 240 && phase < 300 && meetingSlot === department) {
    return { status: "Meeting", task: "Department sync" };
  }

  if (phase >= 515 && phase < 570) {
    return { status: "Break", task: "Taking a short break" };
  }

  const taskByDepartment: Record<string, string> = {
    Finance: "Processing payroll",
    Support: "Customer inbox",
    Design: "Design review",
    Marketing: "Campaign work",
    Operations: "Operations queue",
    Management: "Team management",
  };

  return {
    status: "Working",
    task: taskByDepartment[department] ?? "Focused work",
  };
}

export function findPath(
  start: OfficeRoom,
  goal: OfficeRoom,
): OfficeRoom[] {
  if (start === goal) return [start];

  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const currentPath = queue.shift()!;
    const current = currentPath[currentPath.length - 1];

    for (const nextRoom of officeNodes[current].neighbors) {
      if (seen.has(nextRoom)) continue;
      const nextPath = [...currentPath, nextRoom];
      if (nextRoom === goal) return nextPath;
      seen.add(nextRoom);
      queue.push(nextPath);
    }
  }

  return [start, goal];
}

export function advanceActor(
  person: {
    x: number;
    y: number;
    location?: OfficeRoom;
  },
  goal: OfficeRoom,
  speed = 2.25,
  finalPoint?: { x: number; y: number },
) {
  const start =
    person.location && officeNodes[person.location]
      ? person.location
      : "Open Office";

  const path = findPath(start, goal);
  const nextRoom = path[1] ?? goal;
  const roomTarget = officeNodes[nextRoom];
  const target =
    nextRoom === goal && finalPoint ? finalPoint : roomTarget;

  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) {
    return {
      x: target.x,
      y: target.y,
      location: nextRoom as OfficeRoom,
    };
  }

  return {
    x: person.x + (dx / distance) * speed,
    y: person.y + (dy / distance) * speed,
    location: start,
  };
}

export function activitySpotForStaff(
  department: string,
  status: "Working" | "Meeting" | "Break",
  id: number,
  seatIndex = 0,
  role = "",
) {
  if (status === "Working") {
    return deskSpotForStaff(department, id, role, seatIndex);
  }

  const seats =
    status === "Meeting"
      ? deskSpots["Meeting Room"]
      : deskSpots["Break Room"];

  return seats[Math.max(0, seatIndex) % seats.length];
}

export function isAtTarget(
  person: { x: number; y: number },
  target: { x: number; y: number },
  tolerance = 0.7,
) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

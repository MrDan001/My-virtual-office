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

// Each coordinate is a real entrance/exit point in the rebuilt 3D floor plan.
export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: {
    room: "Reception",
    x: 50,
    y: 93,
    neighbors: ["Open Office", "Support"],
  },
  "Manager Office": {
    room: "Manager Office",
    x: 16,
    y: 34,
    neighbors: ["Meeting Room", "Design Studio"],
  },
  "Meeting Room": {
    room: "Meeting Room",
    x: 51,
    y: 34,
    neighbors: ["Manager Office", "Support", "Finance"],
  },
  "Design Studio": {
    room: "Design Studio",
    x: 22,
    y: 45,
    neighbors: ["Manager Office", "Finance"],
  },
  Finance: {
    room: "Finance",
    x: 56,
    y: 45,
    neighbors: ["Meeting Room", "Design Studio", "Open Office"],
  },
  Support: {
    room: "Support",
    x: 84,
    y: 45,
    neighbors: ["Meeting Room", "Break Room", "Reception"],
  },
  "Break Room": {
    room: "Break Room",
    x: 84,
    y: 73,
    neighbors: ["Support", "Open Office"],
  },
  "Open Office": {
    room: "Open Office",
    x: 77,
    y: 45,
    neighbors: ["Finance", "Break Room", "Reception"],
  },
};

export function findPath(
  start: OfficeRoom,
  goal: OfficeRoom,
): OfficeRoom[] {
  if (start === goal) return [start];

  const queue: OfficeRoom[][] = [[start]];
  const seen = new Set<OfficeRoom>([start]);

  while (queue.length) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const next of officeNodes[current].neighbors) {
      if (seen.has(next)) continue;
      const candidate = [...path, next];
      if (next === goal) return candidate;
      seen.add(next);
      queue.push(candidate);
    }
  }

  return [start, goal];
}

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

// Coordinates are the FRONT EDGE OF A DESK where the worker's chair belongs.
// The 3D renderer uses these exact points to place one chair + one worker per desk.
export const deskSpots: Record<OfficeRoom, { x: number; y: number }[]> = {
  Reception: [{ x: 50, y: 89 }],
  "Manager Office": [
    { x: 10, y: 22 },
    { x: 22, y: 22 },
  ],
  "Meeting Room": [
    { x: 40, y: 22 },
    { x: 46, y: 22 },
    { x: 52, y: 22 },
    { x: 58, y: 22 },
    { x: 64, y: 22 },
    { x: 40, y: 28 },
  ],
  "Design Studio": [
    { x: 10, y: 58 },
    { x: 25, y: 58 },
    { x: 10, y: 79 },
    { x: 25, y: 79 },
  ],
  Finance: [
    { x: 48, y: 58 },
    { x: 60, y: 58 },
    { x: 48, y: 79 },
    { x: 60, y: 79 },
  ],
  Support: [
    { x: 77, y: 18 },
    { x: 89, y: 18 },
    { x: 77, y: 32 },
    { x: 89, y: 32 },
  ],
  "Break Room": [
    { x: 77, y: 83 },
    { x: 89, y: 83 },
    { x: 77, y: 91 },
    { x: 89, y: 91 },
  ],
  "Open Office": [
    { x: 73, y: 55 },
    { x: 84, y: 55 },
    { x: 73, y: 66 },
    { x: 84, y: 66 },
  ],
};

export function deskSpotForStaff(
  department: string,
  id: number,
  role = "",
  seatIndex = 0,
) {
  const room = homeRoomForDepartment(department, role);
  const spots = deskSpots[room];
  const safeIndex = Math.max(
    0,
    Number.isFinite(seatIndex) ? seatIndex : 0,
  );
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
  // Long, stable work blocks. Staff should feel like they belong to their offices.
  const cycleLength = 900;
  const phase = (unixSeconds + id * 83) % cycleLength;

  if (
    (department === "Management" || isLeadershipRole(role)) &&
    phase >= 180 &&
    phase < 235
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
  const departmentSlot =
    meetingDepartments[Math.floor(phase / 60) % meetingDepartments.length];

  if (
    phase >= 300 &&
    phase < 375 &&
    departmentSlot === department
  ) {
    return { status: "Meeting", task: "Department sync" };
  }

  if (phase >= 700 && phase < 760) {
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

export function advanceActor(
  person: {
    x: number;
    y: number;
    location?: OfficeRoom;
  },
  goal: OfficeRoom,
  speed = 3.8,
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
      location: nextRoom,
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
  tolerance = 0.55,
) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

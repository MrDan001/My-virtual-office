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

export type OfficeSeat = {
  x: number;
  y: number;
};

const leadershipPattern =
  /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i;

export function isLeadershipRole(role = "") {
  return leadershipPattern.test(role);
}

// These are actual door thresholds in the rebuilt floor plan.
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
    y: 33,
    neighbors: ["Meeting Room", "Design Studio"],
  },
  "Meeting Room": {
    room: "Meeting Room",
    x: 51,
    y: 33,
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

// Every workstation has one exact chair centre. Break/meeting seats are separate
// so nobody is accidentally sent to a work desk while on a break.
export const deskSpots: Record<OfficeRoom, OfficeSeat[]> = {
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
    { x: 77, y: 84.5 },
    { x: 91.5, y: 84.5 },
    { x: 84.25, y: 76.5 },
    { x: 84.25, y: 92.5 },
  ],
  "Open Office": [
    { x: 73, y: 57 },
    { x: 84, y: 57 },
    { x: 73, y: 66 },
    { x: 84, y: 66 },
  ],
};

export const breakSpots = deskSpots["Break Room"];

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

export function routineForStaff(
  department: string,
  id: number,
  unixSeconds: number,
  role = "",
): RoutineState {
  // Work is the dominant state. Meetings/breaks are short, deliberate trips.
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

// Navigation is a floor-plan graph, not a room-to-room straight line.
// Every transition goes current doorway -> circulation point(s) -> next doorway.
type NavPoint = {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
};

const navPoints: NavPoint[] = [
  { id: "managerDoor", x: 16, y: 33, neighbors: ["managerHall"] },
  { id: "managerHall", x: 16, y: 40, neighbors: ["managerDoor", "designHall"] },
  { id: "designDoor", x: 22, y: 45, neighbors: ["designHall"] },
  { id: "designHall", x: 22, y: 40, neighbors: ["managerHall", "financeHall", "designDoor"] },
  { id: "meetingDoor", x: 51, y: 33, neighbors: ["meetingHall"] },
  { id: "meetingHall", x: 51, y: 40, neighbors: ["designHall", "financeHall", "meetingDoor", "supportHall"] },
  { id: "financeDoor", x: 56, y: 45, neighbors: ["financeHall"] },
  { id: "financeHall", x: 56, y: 40, neighbors: ["meetingHall", "openHall", "financeDoor"] },
  { id: "openDoor", x: 77, y: 45, neighbors: ["openHall"] },
  { id: "openHall", x: 77, y: 40, neighbors: ["financeHall", "supportHall", "openDoor", "breakHall"] },
  { id: "supportDoor", x: 84, y: 45, neighbors: ["supportHall"] },
  { id: "supportHall", x: 84, y: 40, neighbors: ["meetingHall", "openHall", "supportDoor", "breakHall"] },
  { id: "breakDoor", x: 84, y: 73, neighbors: ["breakHall"] },
  { id: "breakHall", x: 84, y: 63, neighbors: ["openHall", "supportHall", "breakDoor"] },
];

const roomDoorPoint: Record<OfficeRoom, OfficeSeat> = {
  Reception: { x: 50, y: 93 },
  "Manager Office": { x: 16, y: 33 },
  "Meeting Room": { x: 51, y: 33 },
  "Design Studio": { x: 22, y: 45 },
  Finance: { x: 56, y: 45 },
  Support: { x: 84, y: 45 },
  "Break Room": { x: 84, y: 73 },
  "Open Office": { x: 77, y: 45 },
};

function navPoint(id: string) {
  return navPoints.find((point) => point.id === id)!;
}

const roomNavId: Record<OfficeRoom, string> = {
  Reception: "openHall",
  "Manager Office": "managerDoor",
  "Meeting Room": "meetingDoor",
  "Design Studio": "designDoor",
  Finance: "financeDoor",
  Support: "supportDoor",
  "Break Room": "breakDoor",
  "Open Office": "openDoor",
};

function navPath(fromRoom: OfficeRoom, toRoom: OfficeRoom) {
  const startId = roomNavId[fromRoom];
  const goalId = roomNavId[toRoom];
  if (startId === goalId) return [navPoint(startId)];

  const queue: string[][] = [[startId]];
  const seen = new Set([startId]);

  while (queue.length) {
    const path = queue.shift()!;
    const currentId = path[path.length - 1];
    const current = navPoint(currentId);

    for (const nextId of current.neighbors) {
      if (seen.has(nextId)) continue;
      const nextPath = [...path, nextId];
      if (nextId === goalId) {
        return nextPath.map(navPoint);
      }
      seen.add(nextId);
      queue.push(nextPath);
    }
  }

  return [navPoint(startId), navPoint(goalId)];
}

export function findPath(start: OfficeRoom, goal: OfficeRoom): OfficeRoom[] {
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

export function advanceActor(
  person: {
    x: number;
    y: number;
    location?: OfficeRoom;
  },
  goal: OfficeRoom,
  speed = 4,
  finalPoint?: OfficeSeat,
) {
  const start =
    person.location && officeNodes[person.location]
      ? person.location
      : "Open Office";

  // Same room: go straight to the exact chair/activity point.
  if (start === goal && finalPoint) {
    const dx = finalPoint.x - person.x;
    const dy = finalPoint.y - person.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= speed) {
      return {
        x: finalPoint.x,
        y: finalPoint.y,
        location: goal,
      };
    }

    return {
      x: person.x + (dx / distance) * speed,
      y: person.y + (dy / distance) * speed,
      location: start,
    };
  }

  if (start === goal) {
    return { x: person.x, y: person.y, location: goal };
  }

  const currentDoor = roomDoorPoint[start];
  const currentDoorDistance = Math.hypot(
    currentDoor.x - person.x,
    currentDoor.y - person.y,
  );

  // Phase 1: walk from inside the current room to its actual door.
  if (currentDoorDistance > 0.7) {
    const dx = currentDoor.x - person.x;
    const dy = currentDoor.y - person.y;
    const distance = Math.hypot(dx, dy);

    return {
      x: person.x + (dx / distance) * Math.min(speed, distance),
      y: person.y + (dy / distance) * Math.min(speed, distance),
      location: start,
    };
  }

  // Phase 2: follow the safe circulation graph from this door to the
  // next room's door. We never mark the next room as entered until the
  // worker has actually reached that next doorway.
  const rooms = findPath(start, goal);
  const nextRoom = rooms[1] ?? goal;
  const route = navPath(start, nextRoom);

  let waypointIndex = 1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 1; i < route.length; i += 1) {
    const d = Math.hypot(
      route[i].x - person.x,
      route[i].y - person.y,
    );

    if (d < bestDistance) {
      bestDistance = d;
      waypointIndex = i;
    }
  }

  // Move to the next waypoint after the nearest point on the route.
  // This avoids turning backward when the actor is already part-way through
  // the corridor.
  const nextIndex = Math.min(
    route.length - 1,
    Math.max(waypointIndex, waypointIndex + (bestDistance < 0.9 ? 1 : 0)),
  );
  const nextPoint = route[nextIndex];

  const dx = nextPoint.x - person.x;
  const dy = nextPoint.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) {
    const reachedGoalDoor = nextIndex === route.length - 1;

    return {
      x: nextPoint.x,
      y: nextPoint.y,
      location: reachedGoalDoor ? nextRoom : start,
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

  const room = status === "Meeting" ? "Meeting Room" : "Break Room";
  const seats = deskSpots[room];
  return seats[Math.max(0, seatIndex) % seats.length];
}

export function isAtTarget(
  person: { x: number; y: number },
  target: OfficeSeat,
  tolerance = 0.55,
) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

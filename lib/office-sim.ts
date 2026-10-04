
export type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Office 1"
  | "Office 2"
  | "Office 3"
  | "Office 4"
  | "Break Room";

export type OfficeNode = { room: OfficeRoom; x: number; y: number; neighbors: OfficeRoom[] };
export type RoutineState = { status: "Working" | "Meeting" | "Break"; task: string };
export type OfficeSeat = { x: number; y: number };
export type OfficeDoor = { x: number; y: number; side: "top" | "bottom" };

const leadershipPattern = /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i;
export function isLeadershipRole(role = "") {
  return leadershipPattern.test(role);
}

export const officeLayouts: {
  room: Exclude<OfficeRoom, "Reception">;
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  doors: OfficeDoor[];
}[] = [
  { room: "Office 1", x: 3, y: 4, w: 21, h: 28, color: 0xe6edf2, doors: [{ x: 13.5, y: 32, side: "bottom" }] },
  { room: "Office 2", x: 27, y: 4, w: 21, h: 28, color: 0xeee6ef, doors: [{ x: 37.5, y: 32, side: "bottom" }] },
  { room: "Office 3", x: 51, y: 4, w: 21, h: 28, color: 0xe7efe7, doors: [{ x: 61.5, y: 32, side: "bottom" }] },
  { room: "Office 4", x: 75, y: 4, w: 22, h: 28, color: 0xe9e9f0, doors: [{ x: 86, y: 32, side: "bottom" }] },
  {
    room: "Manager Office", x: 3, y: 39, w: 25, h: 26, color: 0xeee4d7,
    doors: [{ x: 15.5, y: 39, side: "top" }, { x: 15.5, y: 65, side: "bottom" }],
  },
  {
    room: "Meeting Room", x: 31, y: 39, w: 38, h: 26, color: 0xe3eeec,
    doors: [{ x: 50, y: 39, side: "top" }, { x: 50, y: 65, side: "bottom" }],
  },
  {
    room: "Break Room", x: 72, y: 39, w: 25, h: 26, color: 0xf0e8dc,
    doors: [{ x: 84.5, y: 39, side: "top" }, { x: 84.5, y: 65, side: "bottom" }],
  },
];

export const deskSpots: Record<OfficeRoom, OfficeSeat[]> = {
  "Office 1": [{ x: 8, y: 12 }, { x: 19, y: 12 }, { x: 8, y: 23 }, { x: 19, y: 23 }],
  "Office 2": [{ x: 32, y: 12 }, { x: 43, y: 12 }, { x: 32, y: 23 }, { x: 43, y: 23 }],
  "Office 3": [{ x: 56, y: 12 }, { x: 67, y: 12 }, { x: 56, y: 23 }, { x: 67, y: 23 }],
  "Office 4": [{ x: 80, y: 12 }, { x: 92, y: 12 }, { x: 80, y: 23 }, { x: 92, y: 23 }],
  "Manager Office": [{ x: 10, y: 51 }],
  "Meeting Room": [
    { x: 39, y: 46 }, { x: 46, y: 46 }, { x: 54, y: 46 }, { x: 61, y: 46 },
    { x: 39, y: 58 }, { x: 46, y: 58 }, { x: 54, y: 58 }, { x: 61, y: 58 },
  ],
  "Break Room": [{ x: 78, y: 49 }, { x: 91, y: 49 }, { x: 78, y: 58 }, { x: 91, y: 58 }],
  Reception: [{ x: 50, y: 87 }],
};

export const breakSpots = deskSpots["Break Room"];
export const managerDeskSpot: OfficeSeat = { x: 10, y: 51 };
export const managerVisitorSpots: OfficeSeat[] = [{ x: 20.5, y: 47 }, { x: 20.5, y: 56 }];
export const meetingSpots = deskSpots["Meeting Room"];

export function officeForDepartment(department: string): OfficeRoom {
  if (/design|marketing/i.test(department)) return "Office 1";
  if (/finance|operations|hr/i.test(department)) return "Office 2";
  if (/product|engineering|it|tech/i.test(department)) return "Office 3";
  return "Office 4";
}

export function homeRoomForDepartment(department: string, role = ""): OfficeRoom {
  if (department === "Management" || isLeadershipRole(role)) return "Manager Office";
  return officeForDepartment(department);
}

export function deskSpotForRoom(room: OfficeRoom, seatIndex = 0) {
  const seats = deskSpots[room] ?? deskSpots["Office 1"];
  if (!seats.length) return { x: 50, y: 87 };
  return seats[Math.abs(seatIndex) % seats.length] ?? seats[0];
}

export function deskSpotForStaff(department: string, id: number, role = "", seatIndex = 0) {
  return deskSpotForRoom(homeRoomForDepartment(department, role), seatIndex || Math.max(0, id - 1));
}

export function targetRoomForStaff(department: string, status: string, role = ""): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department, role);
}

export function routineForStaff(department: string, id: number, unixSeconds: number, role = ""): RoutineState {
  const cycleLength = 900;
  const phase = (unixSeconds + id * 83) % cycleLength;
  if ((department === "Management" || isLeadershipRole(role)) && phase >= 180 && phase < 235) {
    return { status: "Meeting", task: "Leadership sync" };
  }
  const meetingDepartments = ["Design", "Finance", "Operations", "Marketing", "Support"];
  const departmentSlot = meetingDepartments[Math.floor(phase / 60) % meetingDepartments.length];
  if (phase >= 300 && phase < 375 && departmentSlot === department) {
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
    Product: "Product work",
    IT: "System checks",
    Healthcare: "Healthcare operations",
  };
  return { status: "Working", task: taskByDepartment[department] ?? "Focused work" };
}

type NavPoint = { id: string; x: number; y: number; neighbors: string[] };

const navPoints: NavPoint[] = [
  { id: "u1", x: 13.5, y: 35.5, neighbors: ["u2", "gL"] },
  { id: "u2", x: 37.5, y: 35.5, neighbors: ["u1", "u3", "gL"] },
  { id: "u3", x: 61.5, y: 35.5, neighbors: ["u2", "u4", "gR"] },
  { id: "u4", x: 86, y: 35.5, neighbors: ["u3", "gR"] },
  { id: "gL", x: 29.5, y: 35.5, neighbors: ["u2", "l1"] },
  { id: "gR", x: 70.5, y: 35.5, neighbors: ["u3", "l3"] },

  { id: "l1", x: 15.5, y: 68.5, neighbors: ["l2", "gL"] },
  { id: "l2", x: 50, y: 68.5, neighbors: ["l1", "l3", "reception"] },
  { id: "l3", x: 84.5, y: 68.5, neighbors: ["l2", "gR"] },
  { id: "reception", x: 50, y: 87, neighbors: ["l2"] },

  { id: "o1In", x: 13.5, y: 31.0, neighbors: ["o1Out"] },
  { id: "o1Out", x: 13.5, y: 35.5, neighbors: ["o1In", "u1"] },
  { id: "o2In", x: 37.5, y: 31.0, neighbors: ["o2Out"] },
  { id: "o2Out", x: 37.5, y: 35.5, neighbors: ["o2In", "u2"] },
  { id: "o3In", x: 61.5, y: 31.0, neighbors: ["o3Out"] },
  { id: "o3Out", x: 61.5, y: 35.5, neighbors: ["o3In", "u3"] },
  { id: "o4In", x: 86, y: 31.0, neighbors: ["o4Out"] },
  { id: "o4Out", x: 86, y: 35.5, neighbors: ["o4In", "u4"] },

  { id: "mTopIn", x: 15.5, y: 43.0, neighbors: ["mTopOut"] },
  { id: "mTopOut", x: 15.5, y: 35.5, neighbors: ["mTopIn", "u1"] },
  { id: "mBotIn", x: 15.5, y: 61.0, neighbors: ["mBotOut"] },
  { id: "mBotOut", x: 15.5, y: 68.5, neighbors: ["mBotIn", "l1"] },

  { id: "eTopIn", x: 50, y: 43.0, neighbors: ["eTopOut"] },
  { id: "eTopOut", x: 50, y: 35.5, neighbors: ["eTopIn", "u2", "u3"] },
  { id: "eBotIn", x: 50, y: 61.0, neighbors: ["eBotOut"] },
  { id: "eBotOut", x: 50, y: 68.5, neighbors: ["eBotIn", "l2"] },

  { id: "bTopIn", x: 84.5, y: 43.0, neighbors: ["bTopOut"] },
  { id: "bTopOut", x: 84.5, y: 35.5, neighbors: ["bTopIn", "u4"] },
  { id: "bBotIn", x: 84.5, y: 61.0, neighbors: ["bBotOut"] },
  { id: "bBotOut", x: 84.5, y: 68.5, neighbors: ["bBotIn", "l3"] },
];

const roomPortals: Record<OfficeRoom, string[]> = {
  Reception: ["reception"],
  "Manager Office": ["mTopIn", "mBotIn"],
  "Meeting Room": ["eTopIn", "eBotIn"],
  "Office 1": ["o1In"],
  "Office 2": ["o2In"],
  "Office 3": ["o3In"],
  "Office 4": ["o4In"],
  "Break Room": ["bTopIn", "bBotIn"],
};

const pointById = new Map(navPoints.map((item) => [item.id, item]));

function point(id: string) {
  const found = pointById.get(id);
  if (!found) throw new Error("Unknown navigation point: " + id);
  return found;
}

function graphPath(startId: string, goalId: string) {
  if (startId === goalId) return [startId];
  const queue: string[][] = [[startId]];
  const seen = new Set([startId]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = point(path[path.length - 1]);
    for (const next of current.neighbors) {
      if (seen.has(next)) continue;
      const candidate = [...path, next];
      if (next === goalId) return candidate;
      seen.add(next);
      queue.push(candidate);
    }
  }
  return [startId];
}

function distance2D(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function chooseRoute(startRoom: OfficeRoom, startPosition: OfficeSeat, goalRoom: OfficeRoom, finalPoint: OfficeSeat) {
  if (startRoom === goalRoom) return [{ id: "final", x: finalPoint.x, y: finalPoint.y }];

  const startCandidates = roomPortals[startRoom] ?? [];
  const goalCandidates = roomPortals[goalRoom] ?? [];
  let best: { route: string[]; startId: string; goalId: string; score: number } | undefined;

  for (const startId of startCandidates) {
    const startPoint = point(startId);
    const startOut = startId.endsWith("In") ? startId.replace(/In$/, "Out") : startId;
    for (const goalId of goalCandidates) {
      const goalPoint = point(goalId);
      const goalOut = goalId.endsWith("In") ? goalId.replace(/In$/, "Out") : goalId;
      const route = graphPath(startOut, goalOut);
      const graphLength = route.reduce((sum, id, index) => {
        if (index === 0) return 0;
        return sum + distance2D(point(route[index - 1]), point(id));
      }, 0);
      const score = distance2D(startPosition, startPoint) + graphLength + distance2D(goalPoint, finalPoint);
      if (!best || score < best.score) best = { route, startId, goalId, score };
    }
  }

  if (!best) return [{ id: "final", x: finalPoint.x, y: finalPoint.y }];

  const route: { id: string; x: number; y: number }[] = [
    { id: best.startId, ...point(best.startId) },
  ];

  const startOut = best.startId.endsWith("In") ? best.startId.replace(/In$/, "Out") : best.startId;
  route.push({ id: startOut, ...point(startOut) });
  for (const id of best.route.slice(1)) route.push({ id, ...point(id) });
  route.push({ id: best.goalId, ...point(best.goalId) });
  route.push({ id: "final", x: finalPoint.x, y: finalPoint.y });
  return route;
}

export function targetRoomForStaff(department: string, status: string, role = ""): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department, role);
}

export function activitySpotForStaff(
  department: string,
  status: "Working" | "Meeting" | "Break",
  id: number,
  seatIndex = 0,
  role = "",
) {
  if (status === "Working") return deskSpotForStaff(department, id, role, seatIndex);
  const room = status === "Meeting" ? "Meeting Room" : "Break Room";
  const seats = deskSpots[room];
  return seats[Math.abs(seatIndex) % seats.length] ?? seats[0];
}

export function advanceActor(
  person: {
    x: number;
    y: number;
    location?: OfficeRoom;
    navGoal?: OfficeRoom;
    navStep?: number;
    navRoute?: string[];
  },
  goal: OfficeRoom,
  speed = 4,
  finalPoint?: OfficeSeat,
) {
  const target = finalPoint ?? deskSpotForRoom(goal, 0);
  const startRoom = person.location && roomPortals[person.location] ? person.location : "Reception";

  if (startRoom === goal) {
    const dx = target.x - person.x;
    const dy = target.y - person.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= speed) {
      return { x: target.x, y: target.y, location: goal, navGoal: undefined, navStep: undefined, navRoute: undefined };
    }
    return {
      x: person.x + (dx / distance) * speed,
      y: person.y + (dy / distance) * speed,
      location: goal,
      navGoal: undefined,
      navStep: undefined,
      navRoute: undefined,
    };
  }

  const routeChanged = person.navGoal !== goal || !Array.isArray(person.navRoute) || !Number.isInteger(person.navStep);
  let route: { id: string; x: number; y: number }[];
  let step = person.navStep ?? 0;

  if (routeChanged) {
    route = chooseRoute(startRoom, { x: person.x, y: person.y }, goal, target);
    step = 0;
  } else {
    route = person.navRoute.map((id) => id === "final" ? { id, x: target.x, y: target.y } : { id, ...point(id) });
  }

  while (step < route.length - 1) {
    const waypoint = route[step];
    if (distance2D(person, waypoint) > Math.max(0.55, speed * 0.9)) break;
    step += 1;
  }

  const destination = route[Math.min(step, route.length - 1)];
  const dx = destination.x - person.x;
  const dy = destination.y - person.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= Math.max(0.35, speed * 0.9)) {
    const nextStep = step + 1;
    if (nextStep >= route.length) {
      return { x: destination.x, y: destination.y, location: goal, navGoal: undefined, navStep: undefined, navRoute: undefined };
    }
    return { x: destination.x, y: destination.y, location: startRoom, navGoal: goal, navStep: nextStep, navRoute: route.map((item) => item.id) };
  }

  return {
    x: person.x + (dx / distance) * Math.min(speed, distance),
    y: person.y + (dy / distance) * Math.min(speed, distance),
    location: startRoom,
    navGoal: goal,
    navStep: step,
    navRoute: route.map((item) => item.id),
  };
}

export function isAtTarget(person: { x: number; y: number }, target: OfficeSeat, tolerance = 0.75) {
  return distance2D(person, target) <= tolerance;
}

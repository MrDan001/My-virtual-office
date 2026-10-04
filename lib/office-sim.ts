export type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Design Studio"
  | "Finance"
  | "Support"
  | "Break Room"
  | "Open Office";

export type OfficeNode = { room: OfficeRoom; x: number; y: number; neighbors: OfficeRoom[] };
export type RoutineState = { status: "Working" | "Meeting" | "Break"; task: string };
export type OfficeSeat = { x: number; y: number };

const leadershipPattern = /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i;
export function isLeadershipRole(role = "") { return leadershipPattern.test(role); }

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 50, y: 93, neighbors: ["Open Office", "Support"] },
  "Manager Office": { room: "Manager Office", x: 16, y: 33, neighbors: ["Meeting Room", "Design Studio"] },
  "Meeting Room": { room: "Meeting Room", x: 51, y: 33, neighbors: ["Manager Office", "Support", "Finance"] },
  "Design Studio": { room: "Design Studio", x: 22, y: 45, neighbors: ["Manager Office", "Finance"] },
  Finance: { room: "Finance", x: 56, y: 45, neighbors: ["Meeting Room", "Design Studio", "Open Office"] },
  Support: { room: "Support", x: 84, y: 45, neighbors: ["Meeting Room", "Break Room", "Reception"] },
  "Break Room": { room: "Break Room", x: 84, y: 73, neighbors: ["Support", "Open Office"] },
  "Open Office": { room: "Open Office", x: 77, y: 45, neighbors: ["Finance", "Break Room", "Reception"] },
};

export const deskSpots: Record<OfficeRoom, OfficeSeat[]> = {
  Reception: [{ x: 50, y: 89 }],
  "Manager Office": [{ x: 10, y: 22 }, { x: 22, y: 22 }],
  "Meeting Room": [
    { x: 40, y: 28 }, { x: 46, y: 28 }, { x: 52, y: 28 },
    { x: 40, y: 10 }, { x: 46, y: 10 }, { x: 52, y: 10 },
  ],
  "Design Studio": [{ x: 10, y: 58 }, { x: 25, y: 58 }, { x: 10, y: 79 }, { x: 25, y: 79 }],
  Finance: [{ x: 48, y: 58 }, { x: 60, y: 58 }, { x: 48, y: 79 }, { x: 60, y: 79 }],
  Support: [{ x: 77, y: 18 }, { x: 89, y: 18 }, { x: 77, y: 32 }, { x: 89, y: 32 }],
  "Break Room": [
    { x: 76.75, y: 84.5 }, { x: 91.75, y: 84.5 },
    { x: 80.5, y: 77 }, { x: 88, y: 77 },
    { x: 80.5, y: 92 }, { x: 88, y: 92 },
  ],
  "Open Office": [{ x: 73, y: 57 }, { x: 84, y: 57 }, { x: 73, y: 66 }, { x: 84, y: 66 }],
};
export const breakSpots = deskSpots["Break Room"];

export function homeRoomForDepartment(department: string, role = ""): OfficeRoom {
  if (department === "Management" || isLeadershipRole(role)) return "Manager Office";
  const map: Record<string, OfficeRoom> = { Design: "Design Studio", Finance: "Finance", Support: "Support", Operations: "Open Office", Marketing: "Open Office" };
  return map[department] ?? "Open Office";
}

export function deskSpotForStaff(department: string, id: number, role = "", seatIndex = 0) {
  const seats = deskSpots[homeRoomForDepartment(department, role)];
  const index = Math.max(0, Number.isFinite(seatIndex) ? seatIndex : 0);
  return seats[index % seats.length] ?? seats[0];
}

export function targetRoomForStaff(department: string, status: string, role = ""): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department, role);
}

export function routineForStaff(department: string, id: number, unixSeconds: number, role = ""): RoutineState {
  const cycleLength = 900;
  const phase = (unixSeconds + id * 83) % cycleLength;
  if ((department === "Management" || isLeadershipRole(role)) && phase >= 180 && phase < 235) return { status: "Meeting", task: "Leadership sync" };
  const meetingDepartments = ["Design", "Finance", "Operations", "Marketing", "Support"];
  const departmentSlot = meetingDepartments[Math.floor(phase / 60) % meetingDepartments.length];
  if (phase >= 300 && phase < 375 && departmentSlot === department) return { status: "Meeting", task: "Department sync" };
  if (phase >= 700 && phase < 760) return { status: "Break", task: "Taking a short break" };
  const taskByDepartment: Record<string, string> = { Finance: "Processing payroll", Support: "Customer inbox", Design: "Design review", Marketing: "Campaign work", Operations: "Operations queue", Management: "Team management" };
  return { status: "Working", task: taskByDepartment[department] ?? "Focused work" };
}

type NavPoint = { id: string; x: number; y: number; neighbors: string[] };
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

const roomNavId: Record<OfficeRoom, string> = { Reception: "openHall", "Manager Office": "managerDoor", "Meeting Room": "meetingDoor", "Design Studio": "designDoor", Finance: "financeDoor", Support: "supportDoor", "Break Room": "breakDoor", "Open Office": "openDoor" };
const roomDoorPoint: Record<OfficeRoom, OfficeSeat> = { Reception: { x: 50, y: 93 }, "Manager Office": { x: 16, y: 33 }, "Meeting Room": { x: 51, y: 33 }, "Design Studio": { x: 22, y: 45 }, Finance: { x: 56, y: 45 }, Support: { x: 84, y: 45 }, "Break Room": { x: 84, y: 73 }, "Open Office": { x: 77, y: 45 } };
function point(id: string) { const found = navPoints.find((item) => item.id === id); if (!found) throw new Error("Unknown navigation point: " + id); return found; }

function navPath(from: OfficeRoom, to: OfficeRoom) {
  const start = roomNavId[from];
  const goal = roomNavId[to];
  if (start === goal) return [point(start)];
  const queue: string[][] = [[start]];
  const seen = new Set([start]);
  while (queue.length) {
    const path = queue.shift()!;
    const current = point(path[path.length - 1]);
    for (const next of current.neighbors) {
      if (seen.has(next)) continue;
      const candidate = [...path, next];
      if (next === goal) return candidate.map(point);
      seen.add(next);
      queue.push(candidate);
    }
  }
  throw new Error("No route from " + from + " to " + to);
}

export function findPath(start: OfficeRoom, goal: OfficeRoom) {
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

export function advanceActor(person: { x: number; y: number; location?: OfficeRoom; navGoal?: OfficeRoom; navStep?: number }, goal: OfficeRoom, speed = 4, finalPoint?: OfficeSeat) {
  const startRoom = person.location && officeNodes[person.location] ? person.location : "Open Office";
  if (startRoom === goal) {
    if (!finalPoint) return { x: person.x, y: person.y, location: goal, navGoal: undefined, navStep: undefined };
    const dx = finalPoint.x - person.x;
    const dy = finalPoint.y - person.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= speed) return { x: finalPoint.x, y: finalPoint.y, location: goal, navGoal: undefined, navStep: undefined };
    return { x: person.x + (dx / distance) * speed, y: person.y + (dy / distance) * speed, location: goal, navGoal: undefined, navStep: undefined };
  }
  const route = navPath(startRoom, goal);
  const routeChanged = person.navGoal !== goal || !Number.isInteger(person.navStep) || (person.navStep ?? 0) >= route.length;
  let step = routeChanged ? 0 : Math.max(0, person.navStep ?? 0);
  if (step === 0) {
    const door = route[0];
    const dx = door.x - person.x;
    const dy = door.y - person.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0.7) step = 1;
    else return { x: person.x + (dx / distance) * Math.min(speed, distance), y: person.y + (dy / distance) * Math.min(speed, distance), location: startRoom, navGoal: goal, navStep: 0 };
  }
  const target = route[Math.min(step, route.length - 1)];
  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.7) {
    const nextStep = step + 1;
    if (nextStep >= route.length) return { x: target.x, y: target.y, location: goal, navGoal: undefined, navStep: undefined };
    return { x: target.x, y: target.y, location: startRoom, navGoal: goal, navStep: nextStep };
  }
  return { x: person.x + (dx / distance) * speed, y: person.y + (dy / distance) * speed, location: startRoom, navGoal: goal, navStep: step };
}

export function activitySpotForStaff(department: string, status: "Working" | "Meeting" | "Break", id: number, seatIndex = 0, role = "") {
  if (status === "Working") return deskSpotForStaff(department, id, role, seatIndex);
  const room = status === "Meeting" ? "Meeting Room" : "Break Room";
  const seats = deskSpots[room];
  return seats[Math.max(0, seatIndex) % seats.length] ?? seats[0];
}

export function isAtTarget(person: { x: number; y: number }, target: OfficeSeat, tolerance = 0.55) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}
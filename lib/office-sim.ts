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

const departmentMeetingOrder = ["Design", "Finance", "Operations", "Marketing", "Support"] as const;
const leadershipPattern = /\b(owner|founder|ceo|cto|cfo|coo|director|manager|head|lead|chief|vp|president)\b/i;

export function isLeadershipRole(role = "") { return leadershipPattern.test(role); }

export const officeNodes: Record<OfficeRoom, OfficeNode> = {
  Reception: { room: "Reception", x: 50, y: 91, neighbors: ["Open Office", "Support"] },
  "Manager Office": { room: "Manager Office", x: 17, y: 28, neighbors: ["Open Office", "Meeting Room"] },
  "Meeting Room": { room: "Meeting Room", x: 52, y: 28, neighbors: ["Manager Office", "Open Office", "Support"] },
  "Design Studio": { room: "Design Studio", x: 21, y: 70, neighbors: ["Open Office", "Support"] },
  Finance: { room: "Finance", x: 55, y: 70, neighbors: ["Open Office", "Meeting Room", "Break Room"] },
  Support: { room: "Support", x: 85, y: 31, neighbors: ["Reception", "Meeting Room", "Design Studio", "Break Room"] },
  "Break Room": { room: "Break Room", x: 85, y: 78, neighbors: ["Support", "Finance", "Open Office"] },
  "Open Office": { room: "Open Office", x: 37, y: 59, neighbors: ["Reception", "Manager Office", "Meeting Room", "Design Studio", "Finance", "Break Room"] },
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

export function homeRoomForDepartment(department: string, role = ""): OfficeRoom {
  if (department === "Management" || isLeadershipRole(role)) return "Manager Office";
  const map: Record<string, OfficeRoom> = { Design: "Design Studio", Finance: "Finance", Support: "Support", Operations: "Open Office", Marketing: "Open Office" };
  return map[department] ?? "Open Office";
}

const deskSpots: Record<OfficeRoom, { x: number; y: number }[]> = {
  Reception: [{ x: 50, y: 88 }],
  "Manager Office": [{ x: 17, y: 34 }, { x: 24, y: 34 }],
  "Meeting Room": [{ x: 44, y: 25 }, { x: 48.5, y: 25 }, { x: 53, y: 25 }, { x: 57.5, y: 25 }, { x: 44, y: 33 }, { x: 57.5, y: 33 }],
  "Design Studio": [{ x: 13, y: 68 }, { x: 28, y: 68 }, { x: 13, y: 86 }, { x: 28, y: 86 }],
  Finance: [{ x: 49, y: 67 }, { x: 63, y: 67 }, { x: 49, y: 87 }, { x: 63, y: 87 }],
  Support: [{ x: 82, y: 31 }, { x: 88, y: 31 }, { x: 82, y: 39 }, { x: 88, y: 39 }],
  "Break Room": [{ x: 80, y: 80 }, { x: 89, y: 80 }, { x: 80, y: 89 }, { x: 89, y: 89 }],
  "Open Office": [{ x: 37, y: 49 }, { x: 37, y: 63 }, { x: 37, y: 77 }, { x: 37, y: 89 }, { x: 43, y: 49 }, { x: 43, y: 63 }, { x: 43, y: 77 }, { x: 43, y: 89 }],
};

export function deskSpotForStaff(department: string, id: number, role = "", seatIndex = 0) {
  const room = homeRoomForDepartment(department, role);
  const list = deskSpots[room];
  const index = Math.max(0, Number.isFinite(seatIndex) ? seatIndex : 0);
  return list[index % list.length] ?? list[0];
}

export function targetRoomForStaff(department: string, status: string, role = ""): OfficeRoom {
  if (status === "Meeting") return "Meeting Room";
  if (status === "Break") return "Break Room";
  return homeRoomForDepartment(department, role);
}

export function routineForStaff(department: string, id: number, unixSeconds: number, role = ""): RoutineState {
  const cycleLength = 300;
  const phase = unixSeconds % cycleLength;
  const meetingSlot = Math.floor(phase / 30);
  const meetingWindow = phase < 150 && (phase % 30) < 22;
  const departmentSlot = departmentMeetingOrder[meetingSlot % departmentMeetingOrder.length];
  const leadershipMeeting = (department === "Management" || isLeadershipRole(role)) && (meetingSlot % 2 === 0);
  const scheduledMeeting = meetingWindow && (department === departmentSlot || leadershipMeeting);
  if (scheduledMeeting) return { status: "Meeting", task: leadershipMeeting ? "Leadership sync" : "Department sync" };
  const personalPhase = (unixSeconds + id * 47) % cycleLength;
  if (personalPhase >= 270) return { status: "Break", task: "Taking a short break" };
  const taskByDepartment: Record<string, string> = { Finance: "Processing payroll", Support: "Customer inbox", Design: "Design review", Marketing: "Campaign work", Operations: "Operations queue", Management: "Team management" };
  return { status: "Working", task: taskByDepartment[department] ?? "Focused work" };
}

export function advanceActor(person: { x: number; y: number; location?: OfficeRoom }, goal: OfficeRoom, speed = 0.72, finalPoint?: { x: number; y: number }) {
  const start = person.location && officeNodes[person.location] ? person.location : "Open Office";
  const path = findPath(start, goal);
  const nextRoom = path[1] ?? goal;
  const roomTarget = officeNodes[nextRoom];
  const target = nextRoom === goal && finalPoint ? finalPoint : roomTarget;
  const dx = target.x - person.x;
  const dy = target.y - person.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= speed) return { x: target.x, y: target.y, location: nextRoom as OfficeRoom };
  return { x: person.x + (dx / distance) * speed, y: person.y + (dy / distance) * speed, location: start };
}

export function activitySpotForStaff(department: string, status: "Working" | "Meeting" | "Break", id: number, seatIndex = 0, role = "") {
  if (status === "Working") return deskSpotForStaff(department, id, role, seatIndex);
  const seats = status === "Meeting" ? deskSpots["Meeting Room"] : deskSpots["Break Room"];
  return seats[Math.max(0, seatIndex) % seats.length];
}

export function isAtTarget(person: { x: number; y: number }, target: { x: number; y: number }, tolerance = 0.7) {
  return Math.hypot(person.x - target.x, person.y - target.y) <= tolerance;
}

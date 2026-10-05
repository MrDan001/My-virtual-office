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
    "Manager Office": [{ x: 8.44, y: 4.60 }],
    "Meeting Room": [
      { x: 42.33, y: 25.09 },
      { x: 47.38, y: 25.09 },
      { x: 52.62, y: 25.09 },
      { x: 57.67, y: 25.09 },
    ],
    "Design Studio": [
      { x: 12.52, y: 46.47 },
      { x: 24.72, y: 46.47 },
      { x: 12.52, y: 71.17 },
      { x: 24.72, y: 71.17 },
    ],
    Finance: [
      { x: 47.38, y: 46.47 },
      { x: 59.59, y: 46.47 },
      { x: 47.38, y: 71.17 },
      { x: 59.59, y: 71.17 },
    ],
    Support: [
      { x: 78.77, y: 12.53 },
      { x: 90.97, y: 12.53 },
    ],
    "Break Room": [
      { x: 78.77, y: 73.06 },
      { x: 90.97, y: 73.06 },
      { x: 78.77, y: 90.68 },
      { x: 90.97, y: 90.68 },
    ],
    "Open Office": [
      { x: 39.54, y: 80.42 },
      { x: 53.49, y: 80.42 },
    ],
  };

  const room = homeRoomForDepartment(department);
  const list = positions[room];
  return list[(Math.max(1, id) - 1) % list.length];
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

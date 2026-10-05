"use client";

import Office3D from "./Office3D";

export type OfficeRoom =
  | "Reception"
  | "Manager Office"
  | "Meeting Room"
  | "Design Studio"
  | "Finance"
  | "Support"
  | "Break Room"
  | "Open Office";

type StaffStatus = "Working" | "Meeting" | "Break" | "Away";

type Staff = {
  id: number;
  name: string;
  role: string;
  department: string;
  status: StaffStatus;
  task: string;
  x: number;
  y: number;
  color: string;
  location?: OfficeRoom;
  walking?: boolean;
};

type Props = {
  staff: Staff[];
  running: boolean;
  onSelect: (staff: Staff) => void;
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

export default function OfficeView(props: Props) {
  return <Office3D {...props} />;
}

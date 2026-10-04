"use client";

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
  location?: string;
  walking?: boolean;
};

type Props = {
  staff: Staff[];
  running: boolean;
  onSelect: (staff: Staff) => void;
  onRoomSelect?: (room: string) => void;
  selectedRoom?: string | null;
};

/**
 * The previous office artwork has intentionally been removed.
 * This component remains as the integration point for the office rebuild.
 */
export default function Office3D(_props: Props) {
  return null;
}

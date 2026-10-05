"use client";

import Office3D from "./Office3D";
import type { OfficeRoom } from "../lib/office-sim";

type Props = {
  onRoomSelect?: (room: OfficeRoom) => void;
  selectedRoom?: OfficeRoom | null;
};

export default function OfficeView({ onRoomSelect, selectedRoom }: Props) {
  return <Office3D onRoomSelect={onRoomSelect} selectedRoom={selectedRoom} />;
}

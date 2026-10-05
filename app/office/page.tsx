"use client";

import { useEffect, useState } from "react";
import OfficeView from "../../components/OfficeView";
import { type OfficeRoom } from "../../lib/office-sim";

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
};

const seedStaff: Staff[] = [
  { id: 1, name: "Sarah Johnson", role: "Team Lead", department: "Management", status: "Meeting", task: "Weekly standup", x: 44, y: 25, color: "#f59e0b", location: "Meeting Room" },
  { id: 2, name: "Mike Williams", role: "Product Designer", department: "Design", status: "Working", task: "Landing page", x: 24.72, y: 55.29, color: "#22c55e", location: "Design Studio" },
  { id: 3, name: "Emma Davis", role: "Marketing", department: "Marketing", status: "Working", task: "Campaign review", x: 39.54, y: 89.24, color: "#a855f7", location: "Open Office" },
  { id: 4, name: "James Brown", role: "Accountant", department: "Finance", status: "Away", task: "Payroll", x: 59.59, y: 62.35, color: "#ef4444", location: "Finance" },
  { id: 5, name: "Lina Wilson", role: "Support Agent", department: "Support", status: "Working", task: "Customer inbox", x: 78.77, y: 21.34, color: "#06b6d4", location: "Support" },
  { id: 6, name: "David Miller", role: "Operations", department: "Operations", status: "Break", task: "Inventory check", x: 78.77, y: 90.68, color: "#3b82f6", location: "Break Room" },
];

export default function VirtualOfficePage() {
  const [staff, setStaff] = useState<Staff[]>(seedStaff);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<OfficeRoom | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("officehub:staff");
      if (saved) setStaff(JSON.parse(saved) as Staff[]);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("officehub:staff", JSON.stringify(staff));
    } catch {}
  }, [staff]);

  const online = staff.filter((person) => person.status !== "Away").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f5f8fb 0%,#eef3f7 100%)",
        padding: "22px",
        color: "#172338",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", color: "#3b74dd" }}>
              LIVE WORKSPACE
            </div>
            <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(24px,4vw,38px)", letterSpacing: "-.04em" }}>
              Virtual Office
            </h1>
            <p style={{ margin: 0, color: "#728097", fontSize: 14 }}>
              View your team in the workplace at their assigned desks and rooms.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a
              href="/"
              style={{
                border: "1px solid #d9e1ea",
                background: "#fff",
                color: "#172338",
                textDecoration: "none",
                borderRadius: 10,
                padding: "10px 13px",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              ← Dashboard
            </a>
            <span
              style={{
                border: "1px solid #d9e1ea",
                background: "#fff",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {online}/{staff.length} online
            </span>
          </div>
        </div>

        <section
          style={{
            background: "#fff",
            border: "1px solid #dfe6ee",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 18px 50px rgba(24,42,65,.08)",
          }}
        >
          <OfficeView
            staff={staff}
            onSelect={setSelected}
            onRoomSelect={setSelectedRoom}
            selectedRoom={selectedRoom}
          />
        </section>

        {(selected || selectedRoom) && (
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              background: "#fff",
              border: "1px solid #dfe6ee",
              borderRadius: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              {selected ? (
                <>
                  <strong style={{ display: "block", fontSize: 14 }}>
                    {selected.name}
                  </strong>
                  <span style={{ color: "#728097", fontSize: 12 }}>
                    {selected.role} · {selected.department} · {selected.task}
                  </span>
                </>
              ) : (
                <>
                  <strong style={{ display: "block", fontSize: 14 }}>
                    {selectedRoom}
                  </strong>
                  <span style={{ color: "#728097", fontSize: 12 }}>
                    {staff.filter((person) => person.location === selectedRoom).length} staff currently linked to this room.
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setSelectedRoom(null);
              }}
              style={{
                border: "1px solid #d9e1ea",
                background: "#fff",
                borderRadius: 9,
                padding: "8px 11px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

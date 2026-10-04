import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";

export async function GET() {
  const db = await requireDb();
  if (!db) return NextResponse.json({ configured: false, staff: [] });

  const result = await db.execute(
    "SELECT id, name, role, department, status, task, x, y, color, location FROM employees ORDER BY id DESC",
  );

  return NextResponse.json({ configured: true, staff: result.rows });
}

export async function POST(request: Request) {
  const db = await requireDb();
  if (!db) {
    return NextResponse.json({ configured: false, error: "Turso database is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim();
  const department = String(body.department ?? "").trim();
  const location = String(body.location ?? "Open Office").trim() || "Open Office";

  if (!name || !role || !department) {
    return NextResponse.json({ error: "Name, role and department are required" }, { status: 400 });
  }

  const result = await db.execute({
    sql: `INSERT INTO employees (name, role, department, status, task, x, y, color, location)
           VALUES (?, ?, ?, 'Working', 'Getting started', 46, 58, '#3b82f6', ?)`,
    args: [name, role, department, location],
  });

  const newId = result.lastInsertRowid;
  if (newId === undefined) {
    return NextResponse.json({ error: "Employee was created but no id was returned" }, { status: 500 });
  }

  const created = await db.execute({
    sql: "SELECT id, name, role, department, status, task, x, y, color, location FROM employees WHERE id = ?",
    args: [newId],
  });

  return NextResponse.json({
    configured: true,
    staff: created.rows[0] ?? null,
  }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = await requireDb();
  if (!db) {
    return NextResponse.json({ configured: false, error: "Turso database is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const id = Number(body.id);
  const role = String(body.role ?? "").trim();
  const department = String(body.department ?? "").trim();
  const status = String(body.status ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "A valid employee id is required" }, { status: 400 });
  }
  if (!role || !department) {
    return NextResponse.json({ error: "Role and department are required" }, { status: 400 });
  }
  if (status && !["Working", "Meeting", "Break", "Away"].includes(status)) {
    return NextResponse.json({ error: "Invalid employee status" }, { status: 400 });
  }

  await db.execute({
    sql: "UPDATE employees SET role = ?, department = ?, status = CASE WHEN ? = '' THEN status ELSE ? END WHERE id = ?",
    args: [role, department, status, status, id],
  });
  const result = await db.execute({
    sql: "SELECT id, name, role, department, status, task, x, y, color, location FROM employees WHERE id = ?",
    args: [id],
  });

  return NextResponse.json({ configured: true, staff: result.rows[0] ?? null });
}

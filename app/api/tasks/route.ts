import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";

export async function GET() {
  const db = await requireDb();
  if (!db) return NextResponse.json({ configured: false, tasks: [] });

  const result = await db.execute(`
    SELECT t.id, t.title, t.priority, t.status, t.due_label,
           e.id AS assignee_id, e.name AS assignee_name
    FROM tasks t
    LEFT JOIN employees e ON e.id = t.assignee_id
    ORDER BY t.id DESC
  `);

  return NextResponse.json({ configured: true, tasks: result.rows });
}

export async function POST(request: Request) {
  const db = await requireDb();
  if (!db) return NextResponse.json({ configured: false, error: "Turso database is not configured" }, { status: 503 });

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const priority = String(body.priority ?? "Medium");
  const assigneeId = body.assigneeId ? Number(body.assigneeId) : null;

  if (!title) return NextResponse.json({ error: "Task title is required" }, { status: 400 });

  const result = await db.execute({
    sql: "INSERT INTO tasks (title, assignee_id, priority) VALUES (?, ?, ?)",
    args: [title, assigneeId, priority],
  });

  const newId = result.lastInsertRowid;
  if (newId === undefined) {
    return NextResponse.json({ error: "Task was created but no id was returned" }, { status: 500 });
  }

  return NextResponse.json({ configured: true, id: Number(newId) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = await requireDb();
  if (!db) {
    return NextResponse.json({ configured: false, error: "Turso database is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const id = Number(body.id);
  const status = String(body.status ?? "Pending");
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Valid task id is required" }, { status: 400 });
  }

  const allowed = new Set(["Pending", "In Progress", "Completed"]);
  if (!allowed.has(status)) {
    return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
  }

  await db.execute({ sql: "UPDATE tasks SET status = ? WHERE id = ?", args: [status, id] });
  const result = await db.execute({
    sql: "SELECT id, title, priority, status, due_label, assignee_id FROM tasks WHERE id = ?",
    args: [id],
  });

  return NextResponse.json({ configured: true, task: result.rows[0] ?? null });
}

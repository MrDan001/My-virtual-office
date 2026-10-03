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

  return NextResponse.json({ configured: true, id: result.lastInsertRowid }, { status: 201 });
}
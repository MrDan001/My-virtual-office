import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";

export async function GET() {
  const db = await requireDb();
  if (!db) return NextResponse.json({ configured: false, posts: [] });
  const result = await db.execute(
    "SELECT id, body, platform, scheduled_for, status, created_at FROM social_posts ORDER BY COALESCE(scheduled_for, created_at) ASC",
  );
  return NextResponse.json({ configured: true, posts: result.rows });
}

export async function POST(request: Request) {
  const db = await requireDb();
  if (!db) return NextResponse.json({ configured: false, error: "Turso database is not configured" }, { status: 503 });

  const body = await request.json();
  const copy = String(body.body ?? "").trim();
  const scheduledFor = String(body.scheduledFor ?? "").trim() || null;
  if (!copy) return NextResponse.json({ error: "Post copy is required" }, { status: 400 });

  const result = await db.execute({
    sql: "INSERT INTO social_posts (body, scheduled_for, status) VALUES (?, ?, ?)",
    args: [copy, scheduledFor, scheduledFor ? "Scheduled" : "Draft"],
  });
  return NextResponse.json({ configured: true, id: Number(result.lastInsertRowid) }, { status: 201 });
}

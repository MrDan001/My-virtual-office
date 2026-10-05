import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

export function getDb(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  if (!cached) cached = createClient({ url, authToken });
  return cached;
}

export async function ensureSchema(db: Client) {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Pending',
        due_label TEXT NOT NULL DEFAULT 'Today',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
    ],
    "write",
  );

  // One-time clean-slate migration: remove the legacy staff/event data layer.
  const staffCleanup = await db.execute({
    sql: "SELECT version FROM schema_migrations WHERE version = ?",
    args: ["clean-staff-layer-v1"],
  });

  if (staffCleanup.rows.length === 0) {
    await db.batch(
      [
        "DROP TABLE IF EXISTS office_events",
        "DROP TABLE IF EXISTS employees",
        {
          sql: "INSERT INTO schema_migrations (version) VALUES (?)",
          args: ["clean-staff-layer-v1"],
        },
      ],
      "write",
    );
  }

  // Existing installations may still have the legacy tasks.assignee_id column.
  // Rebuild the table once so the database itself no longer carries task-to-employee coupling.
  const taskColumns = await db.execute("PRAGMA table_info(tasks)");
  const hasAssigneeId = taskColumns.rows.some((row) => String(row.name) === "assignee_id");

  if (hasAssigneeId) {
    await db.batch(
      [
        `CREATE TABLE tasks_clean (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'Pending',
          due_label TEXT NOT NULL DEFAULT 'Today',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT INTO tasks_clean (id, title, priority, status, due_label, created_at)
         SELECT id, title, priority, status, due_label, created_at FROM tasks`,
        "DROP TABLE tasks",
        "ALTER TABLE tasks_clean RENAME TO tasks",
        "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
      ],
      "write",
    );
  }
}

export async function requireDb() {
  const db = getDb();
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

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
      `CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Working',
        task TEXT NOT NULL DEFAULT 'Getting started',
        x REAL NOT NULL DEFAULT 46,
        y REAL NOT NULL DEFAULT 58,
        color TEXT NOT NULL DEFAULT '#3b82f6',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Pending',
        due_label TEXT NOT NULL DEFAULT 'Today',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS office_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_events_created_at ON office_events(created_at)`
    ],
    "write",
  );

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
        `DROP TABLE tasks`,
        `ALTER TABLE tasks_clean RENAME TO tasks`,
      ],
      "write",
    );
  }

  const columns = await db.execute("PRAGMA table_info(employees)");
  const hasLocation = columns.rows.some((row) => String(row.name) === "location");
  if (!hasLocation) {
    await db.execute("ALTER TABLE employees ADD COLUMN location TEXT NOT NULL DEFAULT 'Open Office'");
  }
}

export async function requireDb() {
  const db = getDb();
  if (!db) return null;
  await ensureSchema(db);
  return db;
}

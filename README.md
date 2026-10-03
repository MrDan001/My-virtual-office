# My Virtual Office

OfficeHub is a Sims-inspired virtual workplace built with Next.js and designed for Vercel.

## Current build

- Responsive OfficeHub dashboard
- Live animated office floorplan
- Staff characters with role-driven routines
- Connected room navigation graph
- Clickable staff profiles and rooms
- Persistent employee and task APIs
- SQLite-compatible Turso/libSQL data layer
- Task creation and persistent completion
- Local-persistent office layout editor
- Light/dark mode
- GitHub Actions build workflow

## Runtime

The application runs without database credentials in local prototype mode. Add the following environment variables for persistent server data:

```env
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

When configured, the API creates/migrates the employee, task and office-event tables automatically.

## Vercel

Turso is available as a Vercel Marketplace Serverless SQLite integration. Connect the integration to the Vercel project so `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are supplied to the app.

## Product roadmap

1. Authentication and workspace accounts
2. Rich character sprites and directional walking animations
3. Real schedules, meetings and shift rules
4. Office furniture/object editor
5. Staff task queues driving movement and state
6. Permissions and audit events
7. Vercel production deployment and observability

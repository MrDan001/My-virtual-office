# My Virtual Office

OfficeHub is a clean-slate virtual workplace foundation built with Next.js and designed for Vercel.

## Current build

- Responsive OfficeHub dashboard
- Interactive architectural 3D office shell
- Rooms, walls, door openings and circulation spaces
- Standalone task system with no employee assignment coupling
- SQLite-compatible Turso/libSQL data layer
- Light/dark mode
- Clean foundation for rebuilding staff and furniture from scratch

The current office intentionally contains **no staff, desks, chairs, furniture, movement system or legacy staff-management layer**.

## Runtime

The application runs without database credentials in local prototype mode. Add the following environment variables for persistent server data:

```env
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

When configured, the API creates the standalone task schema and performs a one-time cleanup migration for the removed legacy staff/event tables.

## Vercel

Turso is available as a Vercel Marketplace Serverless SQLite integration. Connect the integration to the Vercel project so `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are supplied to the app.

## Next build phase

1. Design the new staff/worker UI independently
2. Add the new staff data model
3. Add furniture/workstations without blocking room entrances or circulation
4. Add staff placement and movement only after the physical layout is stable
5. Connect real schedules, meetings, tasks and integrations

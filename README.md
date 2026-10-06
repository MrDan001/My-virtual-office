# My Virtual Office

OfficeHub is a clean-slate virtual workplace foundation built with Next.js, Three.js and Vercel.

Production deploys follow the `main` branch.

## Current approved build

The current approved office foundation is now **locked as the baseline** before premium decoration and later business/staff features are added.

- Responsive OfficeHub dashboard
- Interactive architectural 3D office shell
- Full building footprint: **14 × 26 m**
- Core office footprint: **14 × 22 m**
- Reception/lobby block: **4 m deep**
- Four staff offices, each **6 × 5 m**
- Meeting Room: **6 × 7 m**
- Break Room: **6 × 7 m**
- Manager's Office: **6 × 5 m**
- Director's Office: **6 × 5 m**
- Continuous **2 m corridor**
- Professional **1.5 m room entrances**
- **2.4 m main entrance**
- Reception desk, monitor/keyboard, waiting lounge and unobstructed central visitor path
- Standalone task system
- SQLite-compatible Turso/libSQL data layer
- Light/dark mode
- Staff workstation layer with four desks
- Eight workstation chairs total: four operator chairs and four visitor chairs
- Modern upholstered operator task chairs with five-star caster bases
- Modern upholstered visitor chairs with fixed four-leg bases
- Workstation orientation is approved:
  - office owner/staff sits on the **exterior-wall side**
  - visitor sits on the **corridor/door side**
  - visitor therefore **backs the office door**
  - monitor, screen face, keyboard and mouse face the office owner
- Workstation clearance remains validated so desks/chairs do not block the corridor or room entrance approach

## Approved workstation geometry

The workstation system is intentionally simple and predictable.

### Operator

The office owner sits between the desk and exterior wall, centered with the keyboard and monitor.

### Visitor

The visitor sits directly across the desk on the corridor/door side. The visitor's back is toward the room entrance/corridor.

### Screen and input devices

The monitor display, keyboard and mouse are positioned on the operator side and face the operator.

### Safety and circulation

No furniture placement should reduce the intended corridor or doorway clearance.

## Baseline lock

The approved workstation/layout baseline was captured on:

`b80afa21a2bf5135c22a31295960b71554050539`

A preservation branch was created from that commit:

`baseline/locked-workstation-layout-2026-10-06`

This baseline must remain available as the rollback/reference point for future decoration, staff visuals and interaction work.

## Runtime

The application runs without database credentials in local prototype mode. Add the following environment variables for persistent server data:

```env
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

## Vercel

The production Vercel project is **my-virtual-office**.

Repository:

`MrDan001/My-virtual-office`

The `main` branch is the production source of truth.

## Next build phase

The next visual phase is **premium office decoration**.

Decoration must be additive. It must not move approved room boundaries, doors, desks, chairs, the monitor/keyboard orientation, or corridor circulation.

Planned premium layer:

- tasteful flowers and decorative planters
- refined materials and accents
- office-by-office decorative identity
- premium visual polish without clutter
- all decorations kept outside doorway and circulation clearance zones

After decoration, staff/worker visuals and office-management interactions can continue on top of the locked physical layout.

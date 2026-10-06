# Virtual Office — Build Specification

## Purpose

This repository is being rebuilt as a **real, buildable virtual office management application** rather than a game-like office scene.

The architectural floor plan is the authoritative physical foundation. Every later layer—furniture, decoration, staff, movement and business interactions—must build on top of it without silently changing approved geometry.

## Current approved floor plan

### Building

- Total footprint: **14 × 26 m**
- Core office: **14 × 22 m**
- Reception/lobby: **4 m deep**
- X axis: **-7.0 m to +7.0 m**
- Z axis: **-11.5 m to +14.5 m**
- Wall thickness: **0.30 m**
- Wall height: **2.70 m**
- Main corridor: **2.00 m wide**
- Room doors: **1.50 m wide**
- Main entrance: **2.40 m wide**

The corridor runs continuously through the building from the reception/main entrance toward the rear.

### Room arrangement

| Area | X range | Z range | Size | Door |
|---|---:|---:|---:|---|
| Office 1 | -7 to -1 | -7.5 to -2.5 | 6 × 5 m | x=-1, z=-5.0, 1.5 m |
| Office 2 | +1 to +7 | -7.5 to -2.5 | 6 × 5 m | x=+1, z=-5.0, 1.5 m |
| Office 3 | -7 to -1 | -2.5 to +2.5 | 6 × 5 m | x=-1, z=0.0, 1.5 m |
| Office 4 | +1 to +7 | -2.5 to +2.5 | 6 × 5 m | x=+1, z=0.0, 1.5 m |
| Meeting Room | -7 to -1 | +2.5 to +9.5 | 6 × 7 m | x=-1, z=+6.0, 1.5 m |
| Break Room | +1 to +7 | +2.5 to +9.5 | 6 × 7 m | x=+1, z=+6.0, 1.5 m |
| Manager's Office | -7 to -1 | +9.5 to +14.5 | 6 × 5 m | x=-1, z=+12.0, 1.5 m |
| Director's Office | +1 to +7 | +9.5 to +14.5 | 6 × 5 m | x=+1, z=+12.0, 1.5 m |

The manager's and director's offices sit behind the meeting and break rooms in the rear section.

## Wall ownership and corner rules

Walls are defined as authoritative centerline segments in `components/Office3D.tsx`.

Important rules:

- wall geometry and validation consume the same canonical definitions
- physical wall boxes use the approved 0.30 m thickness
- doorway openings are gaps in wall geometry, not decorative meshes over an opening
- wall intersections must close cleanly without blocking circulation
- corridor boundaries remain physically clear
- any architectural change must update the renderer and validator together

## Entrance standard

All eight rooms use a **1.5 m professional entrance**. The visual door system uses paired leaves, handles and headers while preserving the actual wall opening.

The front entrance is **2.4 m wide** and centered on the main corridor.

## Geometry validation

Runtime validation in `components/Office3D.tsx` covers the approved architecture, including:

- building footprint containment
- duplicate wall overlap detection
- corner/T-junction gap detection
- room-boundary coverage
- doorway obstruction detection
- corridor intrusion detection
- main entrance obstruction detection
- room and door counts
- transformed-layout checks

The transform validation covers:

- identity
- rotate 90°
- rotate 180°
- rotate 270°
- mirror X
- mirror Z
- mirror X + Z

## Workstation layer — approved

The workstation layer has now been rebuilt and approved.

### Four staff workstations

Staff workstations are currently installed in:

- Office 1
- Office 2
- Office 3
- Office 4

Each workstation contains:

- desk
- monitor
- screen face
- monitor stand/base
- keyboard
- mouse
- cable detail
- operator chair
- visitor chair
- storage/pedestal elements
- desk legs/feet

### Approved seating orientation

The approved geometry is:

**Exterior wall → office owner → desk/monitor → visitor → corridor/door**

In practical terms:

- the office owner sits on the exterior-wall side
- the office owner faces inward toward the workstation
- the monitor screen faces the office owner
- the keyboard and mouse are on the office-owner side
- the visitor is opposite the desk
- the visitor is on the corridor/door side
- the visitor's back faces the room entrance/corridor

This orientation is now part of the project baseline and must not be reversed in future edits.

### Chair styles

Operator chairs use a modern upholstered task-chair design with:

- rounded padded seat
- rounded padded back
- central lift
- five-star caster base

Visitor chairs use:

- matching upholstered seat/back styling
- fixed four-leg base
- no casters

### Workstation clearance

The workstation validator checks:

- operator chair centering
- visitor alignment across the desk
- operator/visitor separation
- corridor clearance
- desk-to-corridor clearance
- exterior-wall clearance for visitor seating

No future decoration may violate these established clearances.

## Reception/lobby

The reception block contains:

- reception desk
- monitor and keyboard
- reception chair
- waiting bench
- waiting table
- decorative greenery
- entrance branding panel

The central visitor route and office corridor must remain unobstructed.

## Premium decoration layer — implemented

Premium decorative styling has now been added to the approved office layer.

Each staff office, Manager's Office and Director's Office receives:

- a premium floor flower planter
- warm gold-toned accent trim
- cream floral blooms
- green foliage
- a restrained floor rug
- no doorway/corridor obstruction

Each staff workstation also receives a small desk flower arrangement positioned at the operator-side end of the desk, away from the monitor, keyboard and mouse.

Decoration is intentionally **additive**. The approved architectural coordinates and workstation geometry remain unchanged.

Decoration must never:

- move walls
- resize doors
- move desks or chairs without explicit approval
- reverse the workstation orientation
- put the visitor behind the owner
- block a doorway
- narrow the corridor
- interfere with staff routes

## Repository baseline lock

The approved pre-decoration state is locked at commit:

`b80afa21a2bf5135c22a31295960b71554050539`

Preservation branch:

`baseline/locked-workstation-layout-2026-10-06`

That branch is the rollback/reference point before premium decoration begins.

## Production

Vercel project:

`my-virtual-office`

GitHub repository:

`MrDan001/My-virtual-office`

Production source branch:

`main`

## Non-negotiable rules for future developers

1. Do not redesign the floor plan from screenshots alone.
2. Do not casually change approved coordinates.
3. Do not place furniture or decoration in corridors or doorway openings.
4. Do not reverse the approved owner/visitor workstation orientation.
5. Do not put the visitor behind the office owner.
6. The monitor, keyboard and mouse must face the office owner.
7. Any architectural change must update renderer and validator together.
8. Any decoration change must preserve geometry and clearance.
9. Keep the locked baseline branch available for rollback/reference.
10. Prefer coherent changes over scattered patches.

## Current milestone

**Milestone: approved physical office + approved workstation layer + premium decoration**

The current foundation is:

**Reception + 4 staff offices + meeting room + break room + manager's office + director's office + continuous corridor + professional doors + four complete workstations + approved owner/visitor seating orientation + premium flowers/planters and desk floral accents.**

The next milestone is:

**Staff/worker visuals and office-management interactions on top of the locked physical layout.**

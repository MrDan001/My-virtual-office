# Virtual Office — Build Specification

## Purpose

This repository is being rebuilt as a **real, buildable virtual office management application** rather than a game-like office scene.

The current work starts with the architectural floor plan. The rule is to establish correct room geometry, walls, entrances, corridors, and validation first. Furniture, staff avatars, movement systems, and other visual/business layers must not be reintroduced until the architecture is correct and explicitly approved.

## Current floor plan

The current building is a **12 m × 20 m** rectangular footprint.

Coordinate system:

- X axis: **-6.0 m to +6.0 m**
- Z axis: **-7.5 m to +12.5 m**
- Wall thickness: **0.20 m**
- Wall height: **2.70 m**
- Main corridor: **2.00 m wide**
- Standard room doors: **1.00 m wide**
- Main entrance: **2.00 m wide**

The corridor runs continuously through the full building from the main entrance at the front to the rear.

### Room arrangement

From the front entrance toward the rear:

| Area | X range | Z range | Size | Door |
|---|---:|---:|---:|---|
| Office 1 | -6 to -1 | -7.5 to -3.5 | 5 × 4 m | x=-1, z=-5.5 |
| Office 2 | +1 to +6 | -7.5 to -3.5 | 5 × 4 m | x=+1, z=-5.5 |
| Office 3 | -6 to -1 | -3.5 to +0.5 | 5 × 4 m | x=-1, z=-1.5 |
| Office 4 | +1 to +6 | -3.5 to +0.5 | 5 × 4 m | x=+1, z=-1.5 |
| Meeting Room | -6 to -1 | +0.5 to +7.5 | 5 × 7 m | x=-1, z=+4.0 |
| Break Room | +1 to +6 | +0.5 to +7.5 | 5 × 7 m | x=+1, z=+4.0 |
| Manager's Office | -6 to -1 | +7.5 to +12.5 | 5 × 5 m | x=-1, z=+10.0 |
| Director's Office | +1 to +6 | +7.5 to +12.5 | 5 × 5 m | x=+1, z=+10.0 |

The manager's office and director's office were added **after the meeting room and break room**, sharing the same rear section of the corridor.

## Wall ownership and corner rules

Walls are defined as authoritative centerline segments in `components/Office3D.tsx`.

Every wall is rendered with a 0.20 m physical thickness.

Important rule: wall corners must close physically without double-thick geometry.

- Horizontal dividers own their intersections where applicable.
- Vertical corridor-boundary walls are trimmed by 0.10 m at horizontal T-junctions.
- Door openings are represented as **gaps in the wall geometry**, not as solid meshes covering the opening.
- The renderer uses the same expanded physical wall rectangles used by validation.
- Real wall junctions receive small solid joint caps to eliminate visible sub-pixel seams between independently rendered wall boxes.
- The corridor must remain clear; no wall geometry may intrude into its usable path.

This was added specifically because earlier wall boxes ended at centerline endpoints and produced thin visible seams at corners.

## Main entrance

The front exterior wall is at **z = -7.5 m**.

There is a **2.0 m opening** centered on the corridor:

- X = -1.0 m to +1.0 m
- Z = -7.5 m

The opening must remain physically clear.

## Geometry validation

The architecture includes runtime validation in `components/Office3D.tsx`.

Validation checks include:

- wall volumes stay inside the building footprint
- duplicate wall-volume overlap detection
- corner/T-junction gap detection
- junction counting
- room-boundary coverage
- doorway obstruction detection
- corridor intrusion detection
- main entrance obstruction detection
- expected room count and door count
- rotation and mirror validation of the canonical layout

The transform validator tests:

- identity
- rotate 90°
- rotate 180°
- rotate 270°
- mirror X
- mirror Z
- mirror X + Z

The goal is that the floor plan remains geometrically valid even when transformed.

## Rendering architecture

`components/Office3D.tsx` currently owns the canonical floor-plan geometry and its Three.js renderer.

The renderer contains:

1. building floor
2. corridor floor
3. grid reference
4. exterior and interior walls
5. doorway visual hints
6. main entrance threshold
7. room labels
8. geometry validation status

There are deliberately **no staff characters, desks, chairs, furniture-routing systems, or legacy 2.5D staff movement visuals** in this floor-plan renderer.

## Current design principle

Build in this order:

1. **Architecture**
2. **Geometry validation**
3. **Doors and access paths**
4. **Furniture**
5. **Staff/workers**
6. **Office functionality and management interactions**

A later feature must not silently modify the canonical architectural coordinates.

## Repository history relevant to the rebuild

The project previously contained an older staff/furniture/movement implementation. The office visual layer was intentionally reset so the architectural system could be rebuilt cleanly.

Task management was also decoupled from employee assignment:

- tasks no longer require `assigneeId`
- tasks no longer require `assignee_name`
- task API does not join employees
- the canonical tasks table is standalone

Legacy employee/business data still exists elsewhere in the application because the eventual virtual-office management product will need staff/business functionality, but it is intentionally separated from the current architectural renderer.

## Current production intent

The Vercel project is **my-virtual-office**, linked to GitHub repository:

`MrDan001/My-virtual-office`

The `main` branch is the source of truth for the current production build.

## Non-negotiable rules for future developers

- Do not redesign the floor plan from the screenshot alone.
- Do not change the approved coordinates casually.
- Do not place furniture where it blocks a corridor or doorway.
- Do not close an intended doorway with a decorative mesh.
- Do not reintroduce the old staff movement/furniture visual layer without an explicit requirement.
- Any geometry change must update both rendering and validation together.
- New rooms must be added to the authoritative room definitions, wall geometry, doorway definitions, labels, and validation.
- Validate the full transformed layout after architectural changes.
- Prefer full coherent updates over ad-hoc patches when changing the floor-plan system.

## Current milestone

**Milestone: architectural shell**

The current target is a clean, validated, eight-space office shell:

**4 offices + meeting room + break room + manager's office + director's office + continuous 2 m corridor + main entrance.**

Furniture and staff/workers are the next layers, to be added only after the geometry is visually confirmed.

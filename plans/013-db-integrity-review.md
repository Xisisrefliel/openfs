# 013 — Database structure & integrity review (implemented)

> Status: **implemented** on branch `electron-rewrite`.

## Scope

Full review of the schema (19 tables), how entities reference each
other, and an audit of the live database for dangling references.

## What was sound

- **Accounting core** (accounts/transactions/bookings/quittungen/
  sequences): real FKs, `PRAGMA foreign_keys = ON`, immutable bookings,
  bidirectional Storno links consistent, complete VAT splits, gapless
  sequences — `PRAGMA foreign_key_check` clean. The student snapshot
  columns on `transactions` are intentional (GoBD: a Beleg must show
  the data as it was at booking time) — not duplication to "fix".
- **Delete paths** already reassigned + archived most references
  (students↔theory groups/conversations, instructor/vehicle→students).

## Illogicalities found (live data confirmed all three)

The non-accounting world references entities by display name/model with
no FK — a deliberate denormalized design, but its maintenance had gaps:

1. **Renames never propagated.** `updateInstructor` left
   `students.instructor`, `calendar_events.instructor`,
   `theory_groups.instructor` pointing at the old name (live orphan:
   student → "Köksal2 Gül"). Same for `updateVehicle` model changes and
   `updateStudent` vs `conversations.student_name`.
2. **`calendar_events` was forgotten by every delete path.** Deleting
   an instructor/vehicle reassigned students but left events pointing
   at the deleted name (live orphans: events with "Emre Gül",
   "Nadine Aksoy", vehicles "Golf", "BMW X1").
3. **No healing for already-broken data.**

## Fixes

- `instructors.ts` / `vehicles.ts` / `students.ts`: rename propagation
  (transactional) into every referencing table; deletes now also cover
  `calendar_events`; archive links extended (`calendarEvents`) and
  `archive.ts` restore re-links events. Vehicle rename/delete only
  reassigns when no fleet mate still carries the same model.
- `db.ts repairSoftReferences()`: idempotent self-healing pass on every
  `openDb()` — orphaned instructor/vehicle names → "Nicht zugeteilt"
  (events: vehicle → ''), dead `conversations.student_id` → NULL, ghost
  theory-group member ids pruned. Safe because all writers are
  select-based (no free-text entity references in the UI).
- `integrity.test.ts`: 9 tests covering rename/delete propagation,
  restore re-linking, fleet-mate guards, and the repair pass.

## Known-by-design (left alone, documented)

- `students.balance/last_lesson/next_lesson/progress` are denormalized
  display strings — lessons/billing unification is plan 010's spike.
- `students.lessons/documents/theory`, `theory_groups.student_ids` are
  JSON columns — fine at this scale; revisit if they need querying.
- `conversations.student_id` has no FK clause (SQLite can't ALTER one
  in); code-level cleanup + repair pass covers it.

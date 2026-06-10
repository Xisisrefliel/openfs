# Plan 006: Neutralize CSV formula injection in the DATEV export

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/server/datev.ts src/server/datev.test.ts`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (cheap, real security hygiene on a financial export)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

The DATEV export (`GET /api/accounting/datev`) writes user-entered
transaction descriptions into a CSV that an accountant will open — often in
Excel or LibreOffice, not only in DATEV software. The `text()` sanitizer
strips quotes and line breaks but not formula triggers: a description
beginning with `=`, `+`, `-`, `@`, or a tab/CR character is interpreted as a
formula by spreadsheet applications (e.g. `=cmd|' /c calc'!A1` or
`=WEBSERVICE(...)` exfiltration). Descriptions are free-text user input
(entered in the Buchhaltung payment dialog), so the export is a classic
CSV-injection sink. The fix is the standard mitigation: prefix a `'`
(apostrophe) to any field value that starts with a formula trigger.

## Current state

- `src/server/datev.ts:68-72` — the sanitizer:

```ts
/** Quote a DATEV text field; quotes/semicolons/line breaks sanitized. */
function text(value: string, limit: number): string {
  const cleaned = value.replace(/["\r\n]/g, "'").slice(0, limit);
  return `"${cleaned}"`;
}
```

- `src/server/datev.ts:242` — the user-controlled sink:

```ts
fields[COL.buchungstext] = text(row.description, 60);
```

  `row.description` comes from `transactions.description`, populated from
  the request body of `POST /api/accounting/transactions` (free text).
  Check for other `text(...)` call sites with
  `grep -n "text(" src/server/datev.ts` — apply the fix inside `text()` so
  every call site is covered (company-profile fields flow through the file
  header too and are also user-editable via `/profil`).

- `src/server/datev.ts:75-78` — `belegfeld()` is already safe (strips to an
  alphanumeric whitelist). Do not change it.

- Existing test conventions: `src/server/datev.test.ts` — in-memory DB via
  `openDb(":memory:")`, `createTransaction(...)` to author rows,
  `exportLines()` helper (lines 31–36) decodes the windows-1252 bytes and
  splits lines. Extend this file; reuse `exportLines`.

## Commands you will need

| Purpose   | Command                     | Expected on success |
|-----------|-----------------------------|---------------------|
| Tests     | `bun test src/server/datev` | all pass            |
| Full      | `bun test`                  | all pass            |
| Typecheck | `bunx tsc --noEmit`         | no new errors       |

## Scope

**In scope**:
- `src/server/datev.ts` — only the `text()` function.
- `src/server/datev.test.ts` — add tests.

**Out of scope** (do NOT touch):
- `belegfeld()`, `datevAmount()`, `belegdatum()`, the column layout,
  `encodeCp1252` — the DATEV format is verified by existing tests; changing
  the layout breaks real imports.
- Input validation at transaction creation (`src/server/engine.ts`) —
  rejecting `=`-prefixed descriptions at entry was considered and rejected:
  legitimate descriptions may start with `-` (e.g. "-10% Rabattaktion"), so
  neutralize at the export boundary instead.

## Git workflow

- Branch: `advisor/006-datev-csv-injection` (or direct to `main`).
- One commit: `neutralize csv formula injection in datev export`.
- Do NOT push unless instructed.

## Steps

### Step 1: Harden `text()`

Replace the function body so that, after cleaning, a leading formula trigger
gets an apostrophe prefix (apply BEFORE the length limit so the prefix never
pushes content over `limit`):

```ts
/** Quote a DATEV text field; quotes/semicolons/line breaks sanitized and
 *  spreadsheet formula triggers (=, +, -, @, tab) neutralized with a
 *  leading apostrophe so exported CSVs are inert in Excel/LibreOffice. */
function text(value: string, limit: number): string {
  let cleaned = value.replace(/["\r\n\t]/g, "'");
  if (/^[=+\-@]/.test(cleaned)) {
    cleaned = `'${cleaned}`;
  }
  return `"${cleaned.slice(0, limit)}"`;
}
```

Notes:
- `\t` is added to the cleaned set (tab is also a formula trigger and is
  invalid in a DATEV text field anyway).
- Only the FIRST character is checked — `Rabatt -10%` must pass through
  unchanged.

**Verify**: `bun test src/server/datev` → existing tests still pass (none of
the current fixtures start with a trigger character; if one fails, read the
fixture before assuming the fix is wrong — then STOP if the format
assertions themselves break).

### Step 2: Add regression tests

In `src/server/datev.test.ts`, add a `describe("formula injection", ...)`
block. Create transactions whose `description` is:

1. `=cmd|' /c calc'!A1` → the Buchungstext field in the exported line must
   start with `"'=` (apostrophe-prefixed) and the line must still have
   `DATEV_COLUMN_COUNT` fields when split on `;` outside quotes (simplest
   robust assertion: the exported field equals the expected full quoted
   string).
2. `+49 Telefonpauschale` → field starts with `"'+`.
3. `@sum important` → field starts with `"'@`.
4. `Rabatt -10% Aktion` (trigger char NOT in first position) → unchanged,
   no apostrophe.
5. `-Anzahlung Storno` → field starts with `"'-`.

Use the existing `exportLines()` helper and locate your booking's line by
its unique description substring. Follow the existing test style for
creating transactions (see how other tests in the file call
`createTransaction(db, {...})` — copy a working payload and change only the
description).

**Verify**: `bun test src/server/datev` → all pass, including 5 new tests.

### Step 3: Full gate

**Verify**: `bun test` → all pass. `bunx tsc --noEmit` → no new errors.

## Test plan

See Step 2 — five regression cases in `src/server/datev.test.ts`, modeled on
that file's existing structure (`exportLines`, in-memory DB, seeded company
profile in `beforeEach`).

## Done criteria

- [ ] `text()` in `src/server/datev.ts` neutralizes leading `=` `+` `-` `@`
      and cleans `\t`
- [ ] 5 new tests in `src/server/datev.test.ts`, all passing
- [ ] `bun test` exits 0 (no existing DATEV format test broken)
- [ ] `git status` shows only the two in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any EXISTING datev test fails after Step 1 (a current fixture or the
  header fields depend on the old behavior — the format may be stricter
  than assessed; do not weaken existing assertions to make them pass).
- You find `text()` used for a field where an apostrophe prefix would break
  a documented DATEV field format (report the field and line number).

## Maintenance notes

- If a DATEV *import* of these files into actual DATEV software ever
  misbehaves on apostrophe-prefixed Buchungstexte, the alternative is
  stripping the trigger characters instead of prefixing — keep the tests,
  change only `text()`.
- Anyone adding a new free-text column to the export must route it through
  `text()` — reviewer should check that in future DATEV changes.

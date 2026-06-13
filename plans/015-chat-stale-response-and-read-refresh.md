# Plan 015: Chat polish — stale-response guard in useMessages, optimistic mark-as-read

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/hooks/use-chat.ts src/Plaudern.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

Two small chat-page defects. (1) `useMessages` has no stale-response guard:
when the user switches conversations while a fetch is in flight, the old
conversation's response can resolve *after* the switch and briefly render
thread A's messages under thread B (self-heals on the next 10s poll, but it is
a real mis-render of the wrong person's messages). (2) Opening a thread with
unread messages triggers a full conversation-list refetch just to clear one
unread badge, on top of the 10-second poll — an optimistic local update makes
the badge instant and removes the redundant request.

## Current state

- `src/hooks/use-chat.ts` — `useMessages` (lines 108–133):

  ```ts
  // src/hooks/use-chat.ts:112-130
  const refresh = useCallback(async () => {
    if (conversationId === null) {
      setMessages([]);
      return;
    }
    try {
      setMessages(await fetchMessages(conversationId));
    } catch (error) {
      console.error("Nachrichten konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setLoading(conversationId !== null);
    void refresh();
  }, [conversationId, refresh]);
  ```

  Nothing cancels or ignores an in-flight `fetchMessages(oldId)` when
  `conversationId` changes — its `setMessages(...)` lands anyway.

- `src/Plaudern.tsx` — mark-as-read effect (lines 281–288):

  ```tsx
  // src/Plaudern.tsx:281-288
  useEffect(() => {
    if (!selected || selected.unread === 0) return;
    void markConversationRead(selected.id)
      .then(() => refresh())
      .catch(error =>
        console.error("Unterhaltung konnte nicht als gelesen markiert werden:", error)
      );
  }, [selected, refresh]);
  ```

  `refresh()` is the full `useConversations()` list refetch.

- `useConversations` (use-chat.ts, near line 95) delegates to the shared
  `useFetchList` in `src/lib/api.ts` — it exposes `{ conversations, loading,
  refresh }` and currently has no way to patch one item locally.

- Repo conventions: hooks live in `src/hooks/`, are small and hand-rolled
  around `src/lib/api.ts`; UI errors logged via `console.error` with German
  messages; no DOM test infra (do not add one).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/hooks/use-chat.ts`
- `src/Plaudern.tsx`

**Out of scope** (do NOT touch):
- `src/lib/api.ts` — do not generalize `useFetchList` here; a previous audit
  explicitly deferred fetch-layer abstraction.
- `src/server/chat.ts` — no server changes.
- The 10-second poll itself (`POLL_INTERVAL_MS`, Plaudern.tsx:256) — it is a
  documented deliberate choice ("No WebSockets — a slow poll…"); leave it.

## Git workflow

- Branch: `advisor/015-chat-polish` from `main` (`160eccc`)
- Commits: title-only, e.g. "chat: ignore stale message responses on thread switch"
- Do NOT push or open a PR.

## Steps

### Step 1: Stale-response guard in useMessages

Use a request-version ref. In `useMessages`:

```ts
const requestVersion = useRef(0);

const refresh = useCallback(async () => {
  if (conversationId === null) {
    setMessages([]);
    return;
  }
  const version = ++requestVersion.current;
  try {
    const result = await fetchMessages(conversationId);
    if (requestVersion.current === version) setMessages(result);
  } catch (error) {
    console.error("Nachrichten konnten nicht geladen werden:", error);
  } finally {
    if (requestVersion.current === version) setLoading(false);
  }
}, [conversationId]);
```

Keep the existing effect as-is (it already resets messages and loading on id
change). Import `useRef` from react if not present.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Optimistic unread clear in useConversations

In `use-chat.ts`, extend `useConversations` to return one more function
`clearUnread(id: number)` that patches local state:
the hook currently returns `useFetchList`'s state directly — wrap it: keep
`useFetchList` for fetching, add a local patch via its returned setter **if it
exposes one**; if `useFetchList` does not expose a setter (check
`src/lib/api.ts:19-47`), maintain a local `overrides: Record<number, number>`
state in `useConversations` mapping conversation id → unread override, applied
over the fetched list with `useMemo`, and cleared whenever a fresh fetch
arrives. Choose whichever is smaller WITHOUT modifying `src/lib/api.ts`.

In `src/Plaudern.tsx`, change the mark-read effect to:

```tsx
void markConversationRead(selected.id)
  .then(() => clearUnread(selected.id))
  .catch(...)
```

(no `refresh()` call — the next poll reconciles with the server).

**Verify**: `bun run typecheck` → exit 0; `bun run build` → exit 0.

### Step 3: Manual smoke note

This page has no DOM tests. In your report, state how you convinced yourself
the behavior is right (e.g. traced the state flow; or if a dev server is
available, opened /plaudern, switched threads rapidly, watched the network
tab). Do not add a DOM test framework.

## Test plan

No new automated tests (frontend has deliberately no DOM test infra, and the
changed logic is React-state plumbing). `bun test` must stay green —
no existing tests cover these files.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0 (no regressions)
- [ ] `bun run build` exits 0
- [ ] `grep -n "requestVersion\|version" src/hooks/use-chat.ts` shows the guard in place
- [ ] `grep -n "then(() => refresh())" src/Plaudern.tsx` returns NO match in the mark-read effect
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- The excerpts don't match the live code (drift).
- Implementing `clearUnread` cleanly seems to require changing
  `src/lib/api.ts` — stop and report; do not modify it.

## Maintenance notes

- If chat ever moves to WebSockets, both the version guard and the optimistic
  unread patch become obsolete — delete them with the poll.
- Reviewer: confirm the optimistic override is cleared when fresh data arrives,
  otherwise a later real unread count could be masked.

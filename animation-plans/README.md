# Animation Plans

Plans were written against commit `f6d3a99`. Source code is unchanged.

| # | Plan | Severity | Status | Dependencies |
|---|---|---|---|---|
| 001 | [Make keyboard sidebar toggling instant](001-make-keyboard-sidebar-toggle-instant.md) | HIGH | DONE | None |
| 002 | [Make shared hover feedback instant](002-make-shared-hover-feedback-instant.md) | HIGH | DONE | None |
| 003 | [Make form rail scrubbing direct](003-make-form-rail-scrub-direct.md) | HIGH | DONE | None |
| 004 | [Tighten page entrance timing](004-tighten-page-entrance-timing.md) | MEDIUM | DONE | None |
| 005 | [Add reduced motion to overlays](005-add-reduced-motion-to-overlays.md) | MEDIUM | DONE | None |
| 006 | [Tokenize overlay easing](006-tokenize-overlay-easing.md) | MEDIUM | DONE | 005 |
| 007 | [Make sidebar disclosure retargetable](007-make-sidebar-disclosure-retargetable.md) | MEDIUM | DONE | None |
| 008 | [Replace broad control transitions](008-replace-broad-control-transitions.md) | MEDIUM | DONE | None |
| 009 | [Tighten tab content fades](009-tighten-tab-content-fades.md) | MEDIUM | DONE | None |
| 010 | [Reduce continuous loading motion](010-reduce-continuous-loading-motion.md) | LOW | DONE | None |

## Recommended execution order

1. `001`, `002`, and `003`: highest-leverage frequent interaction fixes.
2. `005`, then `006`: establish reduced-motion behavior before changing overlay timing classes in the same files.
3. `007` and `008`: retargetability and transition-property cleanup.
4. `004` and `009`: global entrance and content-swap timing.
5. `010`: reduced-motion polish for continuous loading states.

Plans without a listed dependency can be executed independently. When multiple plans touch the same file, preserve completed-plan changes and apply only the current plan's stated scope.

# ADR 0016: Tag Management

**Status:** Accepted
**Date:** 2026-10-26
**Resolves:** open question G3

## Context

[PRD.md](../../PRD.md) §2.4 defines a tag as a coloured, named label, created and managed per project, that applies to test cases and bugs. §3 lets Contributors "create tags". Tags appear in the test case detail (§6.2.3, editable inline), the bug detail (§6.4, via a tag picker), the New Bug flow (§7.3), and as filters on the Test Cases tree, the execution list (an execution matches when it contains at least one test case carrying any selected tag) and the bug list. Nothing says how tags are renamed, recoloured or deleted, or by whom (open question G3), and §2.11 does not list tags among the things that go to the Trash.

## Decision

1. **Tags belong to a project.** A name is required, trimmed, at most 50 characters, and unique within the project ignoring case.
2. **Colours come from a fixed palette** of eight named tokens (gray, red, orange, amber, green, teal, blue, violet), stored as the token name, not a hex value, so each renders correctly in light and dark mode. A new tag gets the next palette colour in turn; it can be changed afterwards.
3. **Creating is inline.** Contributors and Admins create a tag by typing a new name into a tag picker and choosing "Create". There is no separate create screen.
4. **A "Manage tags" dialog** (opened from the tag filter) lists the project's tags with how many test cases and bugs carry each. Contributors and Admins rename and recolour there; **Admins** delete.
5. **Deleting is immediate and permanent.** The tag is removed from every test case and bug that carried it, after a confirmation stating those counts. Tags don't go to the Trash, consistent with PRD §2.11. Items keep their own history through the activity log.
6. **Applying and removing tags** on a test case or bug is an edit of that item: Contributors and Admins, not Viewers.
7. **Filters use "any of" semantics** everywhere, matching PRD §6.3.2's execution filter.
8. **Everything is activity-logged** (ADR 0007): tag created, renamed, recoloured, deleted (with counts); tags added to or removed from an item, logged on that item.

## Alternatives Considered

- **Management in a Project Settings page.** Cleaner long term, but no Project Settings screen exists yet; it can host the same dialog's content later without changing these rules.
- **Soft-deleted tags in the Trash.** Restore would have to re-attach the tag to items that may have changed meanwhile, for a low-value object that's cheap to recreate.
- **Free hex colours.** Infinite choice, but unreadable combinations in one theme or the other, and no consistent look.
- **Only Admins rename or recolour.** Tags are lightweight shared vocabulary; Contributors already create them.

## Consequences

- One `tag` table plus two join tables (test case, bug), all tenant-scoped with RLS. Deleting a tag hard-deletes its join rows, so the API role needs `DELETE` on those tables.
- The palette tokens join the semantic colour tokens in `globals.css`.

## Revisit Triggers

- Projects accumulate hundreds of tags (consider tag groups or archiving).
- A Project Settings screen is built (move Manage tags there, rules unchanged). *Note (2026-10-27):* this move is planned; the dialog opened from the tag filter is an interim home (roadmap-full.md Phase 11).

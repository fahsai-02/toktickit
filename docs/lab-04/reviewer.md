# Lab 4 — Peer Review Record

**Author:** Nakagamon Saengdara — 67070501064 — GitHub: @fahsai-02  
**Last verified against the GitHub API:** 2026-10-14

> **Status.** This file is opened while Lab 4 is in progress. The pull-request
> review tables are added at sprint close, after each PR is reviewed; the entry
> below records a merge-coordination decision that affects how two issues branch.

## Merge coordination — Issue 26 (#79) and Issue 27 (#80)

Both issues edit `client/src/StaffTicketDetail.tsx`, so their branches must not be
opened independently from `lab4-staging`. Agreed split of the file: Issue 26 owns
the Actions Taken tab/area, Issue 27 owns the status controls + resolution gate.

Agreed workflow (stacked PR), decided 2026-10-14:

1. Branch of Issue 27 is cut **from `feature/26-actions-taken-ui`**, not from
   `lab4-staging` (`git checkout -b feature/27-... feature/26-actions-taken-ui`).
2. PR of Issue 27 targets **`feature/26-actions-taken-ui`** as its base.
3. PR of Issue 26 merges into `lab4-staging` **first**.
4. After that, the PR of Issue 27 is **retargeted** back to `lab4-staging`, its
   issue linked through the PR's Development panel (the project's Git flow needs
   the manual link), and closed by hand after merge.

Reason: a stack lets Issue 27 see Issue 26's code from the start, so no conflict
has to be untangled with a later rebase.

Fallback: if the stack proves awkward, revert to the plain order — merge Issue 26
first, then rebase Issue 27 onto the updated `lab4-staging`.

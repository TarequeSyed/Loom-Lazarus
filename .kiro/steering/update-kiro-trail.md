---
inclusion: manual
---

# Command: update-kiro-trail

Review actual repository evidence and append only verified new activity to `docs/KIRO_TRAIL.md`. Follow the entry format in kiro-evidence.md.

Steps:
1. Read `docs/KIRO_TRAIL.md` and note the latest dated entry and commit.
2. Inspect evidence since then: `git log` since that commit, new or changed folders under `.kiro/specs`, `.kiro/hooks` and `.kiro/steering`, MCP configuration changes, files in `docs/trail/`, and the latest test results (run the test command if the user allows it).
3. Draft entries only for activity the evidence shows. For each field you cannot verify, write "unverified" or leave it out. Never infer that a hook fired or a tool was used from its mere existence.
4. Show the draft entries to the user and ask for confirmation of anything uncertain.
5. Append the confirmed entries. Do not edit or delete earlier entries.
6. Report what you added and what you left out for lack of evidence.

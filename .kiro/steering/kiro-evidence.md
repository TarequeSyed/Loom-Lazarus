---
inclusion: manual
---

# Kiro Evidence Procedure

Record real Kiro development evidence in `docs/KIRO_TRAIL.md`. This file supports the hackathon submission, so it must be verifiable. Never fabricate actions, screenshots, test results or Kiro usage.

## Entry fields
Append entries in date order:

```
### YYYY-MM-DD  <task>
- Surface: Kiro IDE | Kiro CLI | Kiro Crew
- Steering: <files that applied>
- Feature Spec: <feature name and phase, if any>
- Hooks fired: <hook name, trigger, result> or "none observed"
- MCP tools used: <server and tool> or "none"
- Bugfix Spec: <identifier> or "none"
- Tests: <command and outcome>
- Screenshots: <docs/trail/YYYY-MM-DD-topic.png> or "none"
- Commits: <short hashes>
- Decisions: <what was decided and why>
```

## Procedure
1. Gather evidence from the repository: `git log`, spec folders, hook files, MCP config, test output and files in `docs/trail/`.
2. Record only what the evidence shows. If a field cannot be verified, write "unverified" or omit it.
3. Save screenshots under `docs/trail/` with real dates. Do not edit them to change meaning.
4. Do not include secrets, private photos or personal data.
5. Keep the log append-only. Correct mistakes with a dated correction entry.

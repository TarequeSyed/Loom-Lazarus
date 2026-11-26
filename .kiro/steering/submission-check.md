---
inclusion: manual
---

# Command: submission-check

Verify the repository is ready for submission. Report each item as pass, fail or not applicable, with the evidence. Do not fix anything without asking.

Checks:
1. `.kiro` is committed (`git ls-files .kiro` lists steering, specs and hooks) and is not matched by any `.gitignore` rule (`git check-ignore .kiro`).
2. A `LICENSE` file exists and is the MIT licence with the correct year and holder.
3. The README has working run and test instructions. Run them in a clean checkout or state that you could not.
4. The repository has no obvious secrets: scan tracked files for keys, tokens, passwords and `.env` files, and check MCP config for credentials.
5. Tests pass. Run the test command and report the result and seed output.
6. If a demo URL is configured, it responds with a success status. Otherwise report "not configured".
7. Submission documentation is complete: README credits Rodas Lorente et al. (2025) and Garín5, states the educational-simulation disclaimer, reports metrics only from recorded runs, and `docs/KIRO_TRAIL.md` has verified entries.
8. Data licensing: every third-party sample in `data` has a documented source and licence.
9. The VERIFY items in jacquard-card-format.md are resolved, or the README states which remain unverified.

End with a short list of failures and the suggested next action for each.

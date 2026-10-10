# CODEX.md
## Proofly continuation and resume guide

This file tells Codex-style execution agents how to pick up Proofly work from where it stopped.

The goal is exact continuation, not re-analysis from zero.

---

# 1. Purpose

Use this file when:
- the previous agent hit a limit,
- a document is partially complete,
- a new agent must continue exactly from the last checkpoint,
- the system needs to read the docs and resume safely.

---

# 2. Continuation rule

Before writing anything new, the agent should read:

1. `idea.md`
2. `technicalstack.md`
3. `implementation.md`
4. `workflow.md`
5. `wallet_website.md`
6. `wallet_extension.md`
7. `wallet_website_design.md`
8. `wallet_extension_design.md`
9. `CLAUDE.md`
10. `AGENTS.md`

Then identify:
- what is already complete,
- what is partially complete,
- what is missing,
- what needs to be rewritten,
- what should be preserved exactly.

---

# 3. Resume protocol

## Step 1
Read the latest file first.

## Step 2
Find the last finished heading or section.

## Step 3
Continue from the next missing section only.

## Step 4
Do not restate full background unless it is needed for coherence.

## Step 5
Keep naming, numbering, and terminology consistent.

---

# 4. File precedence

If documents conflict, follow this order of authority:

1. latest implementation file,
2. latest design file,
3. workflow file,
4. technical stack file,
5. original idea file.

Always preserve the wallet/website separation.

---

# 5. What Codex should optimize for

Codex should optimize for:
- precise continuation,
- minimal token waste,
- direct file completion,
- stable architecture,
- no duplicated sections,
- compatibility with previous docs.

---

# 6. What Codex should not do

Codex should not:
- rewrite completed sections,
- change the project vocabulary,
- introduce new architecture unless necessary,
- collapse separate files into one,
- improvise on already-decided core stack,
- ignore the document chain.

---

# 7. Checkpointing standard

Large docs should be written in atomic sections:
- each section has one purpose,
- each section ends cleanly,
- each section can be resumed independently.

Recommended checkpoints:
- architecture,
- folder structure,
- data model,
- flows,
- UI states,
- APIs,
- contract behaviors,
- sync behavior,
- design principles,
- implementation plan.

---

# 8. Safe continuation format

When resuming, output should begin with:
- what file is being continued,
- the last completed section,
- the next section to write.

Then continue writing only the missing content.

---

# 9. Proofly project checkpoints

If the agent stops during Proofly work, the most important checkpoints are:

- extension wallet architecture,
- website wallet UX,
- proof flow,
- contract flow,
- database sync,
- design system,
- popup approval flow,
- AI leash policy flow.

These should be preserved as explicit headings in the docs.

---

# 10. Final rule

Read the docs, find the checkpoint, continue exactly there, and do not re-burn tokens on already-finished context.

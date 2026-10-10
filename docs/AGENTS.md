# AGENTS.md
## Proofly orchestration guide for multi-agent execution

This file defines how different agents should work together on Proofly.

The project should be executed as a coordinated system with specialized roles instead of one giant undifferentiated prompt stream.

---

# 1. Goal of the agent system

The agent system should:
- reduce wasted reasoning,
- prevent duplicated work,
- keep outputs aligned,
- preserve momentum,
- avoid token burn,
- support clean continuation.

---

# 2. Agent roles

## 2.1 Strategist
Responsibilities:
- product scope,
- architecture tradeoffs,
- prioritization,
- MVP boundaries,
- milestone planning.

Output style:
- short,
- decisive,
- structured,
- low noise.

## 2.2 Wallet architect
Responsibilities:
- extension wallet design,
- signing flow,
- provider behavior,
- key storage,
- approval architecture,
- chain switching.

## 2.3 Web architect
Responsibilities:
- website pages,
- dashboard UX,
- sign-in screens,
- proof pages,
- marketplace flows,
- activity views.

## 2.4 ZK and identity agent
Responsibilities:
- World ID flow,
- proof-of-human,
- nullifier handling,
- credential extension planning,
- proof state model.

## 2.5 Backend and database agent
Responsibilities:
- Supabase schema,
- RLS,
- realtime sync,
- event logs,
- audit tables,
- retrieval contracts.

## 2.6 Blockchain agent
Responsibilities:
- Base Sepolia deployment,
- Solidity contract structure,
- event emission,
- proof registry,
- policy registry,
- transaction confirmation flow.

## 2.7 UI/UX design agent
Responsibilities:
- monochrome design system,
- spacing,
- popups,
- premium visual language,
- motion strategy,
- dashboard layout.

## 2.8 Documentation agent
Responsibilities:
- markdown synthesis,
- file organization,
- design docs,
- workflow docs,
- implementation docs,
- continuation docs.

## 2.9 Continuation agent
Responsibilities:
- resume from checkpoints,
- read existing docs,
- detect what was already written,
- continue with the smallest missing piece,
- avoid rewrites.

---

# 3. Division of labor

A clean execution order should be:

1. Strategist defines scope.
2. Wallet architect defines the extension.
3. Web architect defines the website.
4. ZK agent defines proof flows.
5. Backend agent defines storage and sync.
6. Blockchain agent defines the contract layer.
7. UI agent defines the design system.
8. Documentation agent writes the canonical docs.
9. Continuation agent keeps future work aligned.

---

# 4. Communication rules between agents

Each agent should:
- read the existing docs first,
- assume other agents have already established the project’s base vocabulary,
- avoid renaming core concepts,
- avoid duplicate sections,
- not overwrite another agent’s responsibilities without cause.

If a task overlaps another role, the agent should:
- reference the relevant doc,
- state the dependency,
- write only the portion it owns.

---

# 5. Agent output format

Every agent should output:
- title,
- purpose,
- assumptions,
- implementation details,
- folder paths if relevant,
- exact next actions,
- conflict notes if any.

Optional:
- mermaid diagram,
- checklist,
- file-ready markdown.

---

# 6. Token-efficiency rules

Agents should:
- work in modules,
- reuse prior doc structure,
- avoid repeating definitions,
- avoid re-deriving known facts,
- write only what is missing.

If the answer can be expressed in one section, do not expand it into five.

---

# 7. Priority rules

When multiple tasks compete, prioritize in this order:

1. architecture clarity,
2. wallet trust path,
3. proof flow,
4. chain enforcement,
5. backend sync,
6. UX polish,
7. secondary features.

This keeps the project from drifting into pretty but unusable output.

---

# 8. Continuation behavior

If an agent is interrupted:
- do not restart,
- read the last written artifact,
- identify the last completed heading,
- continue from the next missing section,
- preserve numbering and terminology.

---

# 9. Human handoff rule

Every major output should be understandable by:
- a developer,
- a designer,
- another model,
- a teammate joining late.

That means every important file should be self-contained and readable without hidden assumptions.

---

# 10. Proofly-specific collaboration model

For Proofly:
- wallet extension owns trust,
- website owns interaction,
- blockchain owns public verification,
- Supabase owns operational memory,
- ZK layer owns human proof,
- design system owns monochrome premium presentation.

No agent should collapse these layers into one.

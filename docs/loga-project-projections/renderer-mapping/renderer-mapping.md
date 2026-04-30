# LOGA Renderer Mapping

## Core rule

Each projection page answers one primary human question.

```text
Project Detail      -> orient
Project Roadmap     -> focus
Roadmap Item        -> execute
Task Detail         -> act
Evidence Packet     -> trust
Promotions          -> evolve
Workflow Runs       -> monitor
CI/CD Status        -> verify delivery health
Agent Session       -> observe memory and DB turns
```

## Block mapping

| Markdown block | UI treatment | Purpose |
|---|---|---|
| `::breadcrumb` | thin path header | Show where the user is |
| `::focus` | hero/focus statement | Answer the primary question |
| `::panel` | quiet information block | Summarize important state |
| `::nav` | document-native links | Move to related projection documents |
| `::next_actions` | command row | Show what can happen next |
| `::roadmap` | roadmap list | Show items without dumping all metadata |
| `::task_list` | task status list | Show work breakdown |
| `::checklist` | validation list | Show completion or gate requirements |
| `::evidence_drawer` | collapsible drawer | Keep raw trust material available but out of the way |
| `::promotion_list` | promotion lane | Observe SDK/platform capability evolution |
| `::run_list` | workflow run list | Observe workflow execution |
| `::cicd_list` | CI/CD lane | Observe delivery health |
| `::memory` | memory reminder list | Show bounded agent memory |
| `::turn_list` | DB turn timeline | Show persisted agent turns |

## Navigation flow

```text
operator.project_detail
  -> operator.project_roadmap
    -> operator.roadmap_item
      -> operator.task_detail
      -> operator.evidence_packet
    -> operator.promotions
    -> operator.workflow_runs
      -> operator.cicd_status
    -> operator.agent_session
```

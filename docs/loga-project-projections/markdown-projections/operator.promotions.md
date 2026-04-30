---
loga_contract: "ai-engine-ui/v1"
projection_type: "operator.promotions"
projection_id: "project:ai-engine:promotions"
source_truth: "sql"
primary_question: "What capabilities were promoted?"
---

# Promotions
## AI Engine SDK and Platform

::focus
question: "What capabilities were promoted?"
answer: "Core governed workflow primitives are promoted. Refactor-specific SDK surfaces are the next promotion lane."
status: "active"
::

## Recent Promotions

::promotion_list
- key: "startWork"
  title: "startWork"
  status: "promoted"
  impact: "Unified governed entrypoint"

- key: "completeTurn"
  title: "completeTurn"
  status: "promoted"
  impact: "Governed execution exit and DB turn persistence"

- key: "runCharter"
  title: "runCharter"
  status: "promoted"
  impact: "Charter execution through a single workflow primitive"
::

## Needed Promotions

::promotion_list
- key: "createRefactorImplementationPlan"
  title: "createRefactorImplementationPlan"
  status: "needed"
  impact: "Prevents local plan files and bespoke choreography"

- key: "executeGovernedRefactorWrapper"
  title: "executeGovernedRefactorWrapper"
  status: "needed"
  impact: "Makes wrapper execution observable through SDK"

- key: "getRefactorWrapperEvidence"
  title: "getRefactorWrapperEvidence"
  status: "needed"
  impact: "Makes wrapper evidence inspectable from project surfaces"
::

::next_actions
- Promote refactor SDK surfaces
- Verify downstream consumer posture
- Check CI/CD status
::


Key confirmations:
1. Route fallback behavior will silently serve fixtures whenever route defs are missing, params are missing, or API calls fail in projection-detail.js, projection-detail.js, projection-detail.js, projection-detail.js, projection-detail.js.
2. Route config includes operator.project_portfolio and transform-only agent/promotions entries in markdown-ui-elements.json, markdown-ui-elements.json, markdown-ui-elements.json.
3. SDK docs currently list only six LOGA projection methods in api-client.md.
4. Projections page and tree link to workflow-runs, cicd-status, promotions, agent-session surfaces in projections.js, projections.js, projections.js, tree.mjs, but no corresponding LOGA projection routes are configured for workflow_runs or cicd_status.
5. Data source registry contains invented method names in markdown-ui-elements.json, and hydration is wired in projection-detail.js, projection-detail.js, projection-detail.js.

Complete taxonomy for fully data-driven pages

A) Projection surfaces (LOGA markdown documents)
1. operator.home
- Current: getLogaOperatorHomeProjection
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

2. operator.project_catalog
- Current: getLogaProjectCatalogProjection
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

3. operator.project_portfolio
- Current: getLogaProjectPortfolioProjection
- Status: missing in SDK docs
- Source: markdown-ui-elements.json, LOGA table at api-client.md

4. operator.project_roadmap
- Current: getLogaProjectRoadmapProjection(projectId)
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

5. operator.roadmap_item
- Current: getLogaRoadmapItemProjection(projectId, itemKey)
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

6. operator.workflow_run
- Current: getLogaWorkflowRunProjection(workflowRunId)
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

7. operator.evidence_packet
- Current: getLogaEvidencePacketProjection(packetKey)
- Status: documented and aligned
- Source: markdown-ui-elements.json, api-client.md

8. operator.workflow_runs
- Current: linked from UI/tree but no route entry, falls back to fixture via unknown route
- Needed: getLogaWorkflowRunsProjection(projectId)
- Source: links in projections.js, tree.mjs, unknown-route fallback in projection-detail.js

9. operator.cicd_status
- Current: linked from tree but no route entry, falls back to fixture via unknown route
- Needed: getLogaCicdStatusProjection(projectId)
- Source: link in tree.mjs, unknown-route fallback in projection-detail.js

10. operator.agent_session
- Current: transform-only local template path keyed by turn; project-level session view falls back to fixture
- Needed: getLogaAgentSessionProjection(projectId), and optionally getLogaAgentTurnProjection(projectId, turn)
- Source: route in markdown-ui-elements.json, fallback behavior in projection-detail.js

11. operator.promotions
- Current: transform-only local template path keyed by promotionKey; project-level list view falls back to fixture
- Needed: getLogaPromotionsProjection(projectId), optionally getLogaPromotionProjection(projectId, promotionKey)
- Source: route in markdown-ui-elements.json, fallback behavior in projection-detail.js

B) Tree and navigation support domain
Current tree backend depends on:
- listProjects
- getProjectRoadmap
- listImplementationTasks
- listImplementationSubtasks
Source: tree.mjs, tree.mjs, tree.mjs, tree.mjs

These are documented in SDK docs:
- getProjectRoadmap at api-client.md
- listImplementationTasks at api-client.md
- listImplementationSubtasks at api-client.md

Gap for full runtime surfaces:
- listWorkflowRunsByProject(projectId, filters) is still needed; listRecentInspectorRuns is global only at api-client.md

C) Data source registry for each blocks
Configured methods:
- getLogaRoadmapItems
- getLogaPortfolioProjects
- getLogaWorkflowRuns
- getLogaAgentTurns
- getLogaPromotions
Source: markdown-ui-elements.json

Hydration path exists:
- projection-detail.js

But shapes/methods are undocumented. For reliable each mapping you need either:
1. Official SDK methods with stable response contracts, or
2. Official docs for dataPath fields on existing methods (for example getPortfolioBundle, getProjectRoadmap, listPromotionCandidates).

D) Non-projection pages to make fully data-driven
Currently dynamic and mostly feasible with existing SDK:
1. Repositories
- methods: listRepositories
- source: repositories.js, docs at api-client.md

2. Repository Detail
- methods: listCodeFiles
- source: repository-detail.js, docs at api-client.md

3. Code Intelligence
- methods: searchSymbols
- source: code-intelligence.js, docs at api-client.md

4. Symbol Detail
- methods: getSymbolDefinition
- source: symbol-detail.js, docs at api-client.md

Currently static-only (registry styles, no data calls):
- index.html
- patterns.html
- anti-pattern-detail.html
- file-detail.html
- refactor-workbench.html
- candidate-analysis.html
- remediation-proposals.html

To make those fully data-driven, SDK/domain coverage needed:
1. Pattern registry domain
- listPatternCatalog
- listAntiPatternRules
- listAntiPatternFindings(ruleId or scope)
- getAntiPatternDetail(ruleId)

2. File analysis domain
- getCodeFile(fileId)
- getCodeFileContentWindow(fileId, startLine, endLine)
- listCodeSymbolsByFile(fileId)
- listCodebaseShapeFindings(fileId or project scope)
- listObjectFlowObservations(fileId)

3. Refactor candidate domain
- listRefactorCandidates (already documented)
- analyzeRefactorCandidate (already documented)
- evaluateProposalScope (already documented)
- optional: getCandidateAnalysisPacket(candidateId) for stable deep-linking

4. Remediation proposal domain
- createRemediationProposal
- getRemediationProposal
- listRemediationProposals
- submitRemediationProposalForApproval
- getRemediationProposalEvidenceBundle

The existing UX-gate remediation endpoints in docs are useful but not a complete replacement for generic governed remediation proposals.

Recommended upstream remediation package
1. Add five LOGA projection methods:
- getLogaProjectPortfolioProjection
- getLogaWorkflowRunsProjection(projectId)
- getLogaAgentSessionProjection(projectId)
- getLogaPromotionsProjection(projectId)
- getLogaCicdStatusProjection(projectId)

2. Add listWorkflowRunsByProject(projectId, filters).

3. Either:
- formalize the five each data source methods currently configured in registry, or
- publish canonical dataPath contracts for existing methods so each source can be mapped deterministically.

4. Publish typed response schemas for the domain objects LOGA needs:
- portfolio summary and portfolio project card
- workflow run list item
- promotion list/detail item
- agent session summary and turn item
- cicd status summary
- anti-pattern rule and finding
- remediation proposal and evidence bundle

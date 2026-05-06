To enable live real-time monitoring of the roadmap execution, let me map what we have vs. what's needed:

**What we have working today:**
1. ✅ Live SDK access to roadmap and tasks (`getProjectRoadmap`, `listImplementationTasks`)
2. ✅ Task detail projections that pull live data
3. ✅ Navigation tree that shows roadmap hierarchy
4. ✅ Contract-driven renderer that displays projections

**What's missing for live monitoring:**

| Capability | Status | What's needed |
|-----------|--------|---------------|
| **Status dashboard** | ❌ | A projection (`operator.project_status` or similar) that shows: current active item, task completion % per slice, last-updated timestamps, blocked/at-risk indicators |
| **Activity feed** | ❌ | SDK method to get task activity log + UI component to display who worked on what, when |
| **Current work context** | ⚠️ partial | SDK has `getProjectRoadmapActiveItem()` but it's not wired into any UI surface. Need a "current work" projection or card |
| **Workflow-roadmap linking** | ❌ | No SDK method to correlate workflow runs with roadmap items. Need method like `getWorkflowRunContext(workflowRunId)` to return linked roadmap item |
| **Task status transitions** | ❌ | No audit trail method. Need `listImplementationTaskActivity(taskId)` or similar to see when tasks moved from `open` → `in_progress` → `completed` |
| **Live polling** | ❌ | No client-side refresh mechanism. Need auto-poll interval (or WebSocket if available) to detect changes |
| **Real-time indicators** | ❌ | No "live update" UI components that refresh without full page reload |

**Minimal viable monitoring setup** would require:

1. **A "Roadmap Status" projection** (frontend, contract-driven)
   - Calls `getProjectRoadmap(projectId)` + `getProjectRoadmapActiveItem(projectId)`
   - Renders task counts, completion %, current item highlight
   - Uses registry-driven `::grid` or `::portfolio_grid` to show slice cards

2. **Live polling in the tree/dashboard** (frontend, JavaScript)
   - Auto-refresh roadmap every 5-10s
   - Detect status changes and highlight them
   - Optionally show "last updated X seconds ago"

3. **Task activity method** (backend, SDK)
   - Expose `listImplementationTaskActivity(taskId)` to show who touched what and when
   - Or extend task response to include `last_updated_by`, `last_updated_at`, `current_assignee`

4. **Workflow-roadmap context** (backend, SDK)
   - Add method like `getWorkflowRunRoadmapContext(workflowRunId)` that returns `{ roadmap_item_id, active_task_id, execution_status }`

**Quick wins we can do today** (without backend changes):

- ✅ Create a "Roadmap Status" projection that displays current roadmap state
- ✅ Add auto-poll to the projection-detail.js to refresh every 5-10s
- ✅ Add a "live update" indicator badge in the UI
- ✅ Link the task detail view to show "part of execute-scope-N" with progress

**What requires backend work:**

- Task activity audit trail
- Workflow-roadmap linking  
- Project status aggregation query


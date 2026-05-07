# AI Engine SDK Projection Runtime Platformization - Research

## Objective
Promote app-local LOGA projection rendering capabilities into a reusable AI Engine SDK and backend platform domain runtime.

## Capabilities To Platformize
1. Template runtime with `{{#each}}` collection iteration.
2. Nested token resolution with dot notation.
3. Fallback chains using `{{a||b}}`.
4. Declarative transform execution with `dataMap` mappings and filters.
5. Derived field evaluation (`rules`, `gt` comparator, template interpolation pipes such as `|encode`).
6. Contract-first route execution driven by registry transforms.

## Reuse Targets
1. AI Engine SDK package as shared execution runtime.
2. AI Engine backend projection endpoints as governed execution surfaces.
3. Multiple application UIs consuming common transform contracts and templates.

## API Surface Research Findings
1. Project creation endpoints discovered:
   - `createProjectCharter(...)`
   - `runCharter({ contract: ... })`
   - `createProjectDelivery(...)`
2. Roadmap and task surfaces discovered:
   - `getProjectRoadmap(projectId)`
   - `ensureProjectRoadmapTaskSurface(projectId, ...)`
   - `importImplementationPacket(body)`
3. SDK compatibility gate discovered:
   - `createProjectDelivery` requires `@bpmsoftwaresolutions/ai-engine-client >= 1.1.35`.

## Backend Blocking Issues (Observed)
1. `createProjectCharter(...)` returned HTTP 500 from the backend service.
2. `runCharter({ contract })` validated contract schema, then failed execution with:
   - `FileNotFoundError: Runtime query contract not found: project_bootstrap_task_by_key`
3. `createProjectDelivery(...)` also failed with:
   - `project_delivery_unavailable`
   - `Runtime query contract not found: project_bootstrap_task_by_key`
4. `importImplementationPacket(...)` accepted schema validation guidance but eventually returned HTTP 500 after domain metadata requirements were satisfied.

## What It Will Take (Backend Platform Work)
1. Restore runtime query contract required by charter/project delivery services:
   - `project_bootstrap_task_by_key`
2. Validate and harden `/api/projects/charter` and `/api/project-delivery` execution paths.
3. Ensure implementation packet import path is stable for domain-tagged items (`originDomain`, `targetDomain`).
4. Add integration tests for chartering and roadmap import using current SDK version (`1.1.35+`).
5. Expose actionable backend error contracts (not generic 500 HTML) for mutation APIs.

## Ready Charter Contract (runCharter)
Use this payload once backend blockers are fixed:

```json
{
  "mode": "execute",
  "operation": "runCharter",
  "contract": {
    "project_name": "AI Engine SDK Projection Runtime Platformization",
    "objective": "Promote LOGA projection rendering capabilities from app-local runtime into the AI Engine SDK and backend platform domain so multiple applications can reuse one governed rendering contract and execution engine.",
    "business_context": "Rendering capabilities are currently implemented in one application runtime. Reusing them across products requires duplicate implementations, causing drift and slower delivery. Platformizing these capabilities in the SDK and backend creates a single governed path for contract transforms, template rendering, and projection hydration.",
    "success_criteria": "A versioned SDK runtime supports each loops, dot-notation token resolution, fallback chaining, declarative dataMap mapping, and derive evaluation. Backend platform APIs expose governed transform execution metadata. At least two applications can render the same portfolio projection contract without app-specific transform logic.",
    "priority": "high",
    "requested_by": "copilot:platform-domain",
    "constraints": [
      "Backward compatibility with existing token syntax must be preserved for current consumers.",
      "Projection contract execution must remain deterministic and auditable with provenance metadata.",
      "SDK runtime must not embed application-specific transform knowledge; it executes declarative contracts only.",
      "Backend transform orchestration must remain SQL-truth aligned and governance-aware."
    ],
    "in_scope": [
      "Define a reusable SDK projection runtime module for template loading, scalar substitution, each loops, nested token lookup, and fallback chains.",
      "Define declarative transform contract schema for template, dataMap, and derive sections with rule chains and template interpolation pipes such as encode.",
      "Implement SDK utilities for dataMap application, filter evaluation, derive rule execution, and per-item derived token injection.",
      "Implement backend platform integration points to execute transform contracts consistently and return projection metadata and provenance.",
      "Add validation and compatibility tests covering portfolio projection parity between existing app runtime and SDK runtime.",
      "Publish migration guidance and reference examples for adopting SDK runtime in multiple applications."
    ],
    "out_of_scope": [
      "Rewriting every existing projection surface in the first increment.",
      "Designing a visual template builder UI.",
      "Introducing a general-purpose expression language beyond declared rule and pipe support.",
      "Changing domain business semantics of existing projections during runtime extraction."
    ],
    "assumptions": [
      "Current declarative portfolio projection is a representative pilot for broader runtime extraction.",
      "AI Engine backend can host shared contract execution and provenance metadata surfaces.",
      "Existing applications can adopt SDK runtime incrementally without full rewrite."
    ],
    "testing_strategy": {
      "summary": "Validate feature parity with the existing app runtime, ensure deterministic outputs, and verify backend provenance and governance metadata for every transform execution.",
      "validation_surfaces": [
        "SDK unit tests for token resolver, loop rendering, fallback behavior, dataMap filtering, and derive evaluation",
        "Contract parity tests comparing existing portfolio projection output to SDK runtime output",
        "Backend integration tests for contract execution response shape, provenance, and error handling",
        "Cross-application smoke tests rendering shared projection templates through SDK runtime"
      ],
      "required_checks": [
        "each loop rendering produces stable ordering and expected card count",
        "fallback token chains resolve correctly when primary field is missing or empty",
        "derive rule chains evaluate in priority order including gt comparisons",
        "template interpolation pipes like encode produce URL-safe outputs",
        "projection response includes expected contract metadata and provenance fields"
      ],
      "release_boundary": "Do not promote as platform default until parity and governance checks pass for pilot projections."
    }
  }
}
```

## Ready Roadmap Packet Draft
If roadmap import is required independently, use an implementation plan packet with per-item domain metadata (`originDomain`, `targetDomain`) and acceptance checks.

## Current Status
Charter and roadmap creation in AI Engine are currently blocked by backend defects. Payloads and SDK prerequisites are now prepared so execution can proceed immediately after backend repair.

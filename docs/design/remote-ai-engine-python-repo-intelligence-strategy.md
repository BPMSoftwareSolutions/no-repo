# Remote AI Engine Python Repo Intelligence Strategy

## Purpose

Define the strategy for proving and then productizing a remote-only workflow that analyzes Python code in the `ai-engine` repository through the SDK-backed repo-intelligence layer.

This doc is intentionally not an implementation spec. It is the operating strategy we should follow so we do not improvise the process turn by turn.

## Boundary

The client must not depend on any local filesystem view of the agent machine.

All repository discovery, file lookup, symbol lookup, and evidence capture must come from the remote SDK surface.

## Target Scope

Default scope:

- Python code files in the remote `ai-engine` repository
- Repository inventory, file inventory, and symbol inventory exposed by the SDK

Optional narrower scopes:

- `src/**/*.py` for engine runtime code
- `scripts/**/*.py` for operational Python code
- Exclude tests unless the refactor request explicitly includes them

## Core Thesis

The client should not try to guess what exists in the repository.

Instead, it should:

1. Resolve the canonical remote `ai-engine` repository record.
2. Query Python files only from that repository.
3. Resolve the symbols and line spans for each target file.
4. Build a file-scoped evidence packet.
5. Draft a refactor candidate from the evidence packet.
6. Promote the candidate through the governed engine workflow.

The engine remains the authority layer. The client remains the discovery and composition layer.

## Strategy

### 1. Resolve the canonical repository remotely

The first step is to identify the canonical `ai-engine` repository record in the remote intelligence store.

Selection should prefer:

- the repository whose name is `ai-engine`
- the repository whose root path matches the deployed remote inventory
- the repository that actually exposes file rows and symbol rows

If multiple `ai-engine` records exist, the client should use the one that has live file inventory, not the one that merely exists as a repository shell.

### 2. Filter to Python files only

Once the canonical repository is selected, the client should query only Python files.

The remote query should always carry an explicit language filter:

- `language = python`

The client should then narrow by path prefix when needed:

- `src/` for engine runtime code
- `scripts/` for utility and automation code

The client should not rely on a manifest to decide the scope.

### 3. Resolve file-level evidence

For each Python file, the client should gather:

- file path
- repository id
- content hash
- line count
- symbol count
- file content or content window
- symbol list with line anchors

If symbol inventory is missing for a file, the client should fall back to file content windows and record the missing surface explicitly.

### 4. Build a file-scoped work packet

The refactor loop should operate one file at a time.

Each work packet should contain:

- repository metadata
- file metadata
- target line regions
- symbol anchors
- evidence notes
- intended refactor outcome
- promotion state

The packet should be replayable so the same file can be re-evaluated after changes.

### 5. Draft the refactor candidate

The client should produce a draft refactor for the file, but only from the remote evidence packet.

That draft should:

- preserve behavior unless the violation requires a behavior change
- stay limited to the single file
- carry the observed evidence and line regions
- be treated as a candidate, not canonical truth

### 6. Promote through the engine

The draft should then be submitted to the governed engine workflow.

Promotion should be treated as a separate step from discovery.

The engine should validate:

- scope correctness
- policy compliance
- repeatability
- evidence completeness
- whether the draft can become canonical

### 7. Iterate until the file is clean

If the engine reports missing surfaces, unresolved spans, or follow-up violations, the client should repeat the same file-scoped loop.

The loop ends only when:

- the file is analyzed remotely
- the evidence packet is complete enough for the intended scope
- the draft is accepted or explicitly rejected
- any follow-up work is enumerated

## Execution Flow

```text
remote repo intelligence
-> canonical ai-engine repository selection
-> python file query
-> symbol and line-span query
-> evidence packet
-> file-scoped draft
-> governed engine promotion
-> validation
-> repeat if needed
```

## What We Should Not Do

- Do not read the agent machine's local repository directly.
- Do not use a manifest as the source of truth for the workflow.
- Do not assume the `ai-engine` repo is the only repository record with that name.
- Do not expand the analysis to non-Python files unless the request says to.
- Do not merge file discovery, refactor drafting, and promotion into one opaque step.

## Implementation Implications

This strategy implies three concrete product needs:

1. A stable remote SDK path for listing repository records, Python files, and symbols.
2. A file-scoped refactor packet format that carries evidence and line anchors.
3. A governed promotion path that turns the draft into backend-owned workflow state.

If any of those are missing, the client should fail closed and report the missing surface rather than guessing.

## Success Criteria

We will know this strategy is working when the client can do all of the following remotely:

1. Resolve the canonical `ai-engine` repository record.
2. List only Python files from that repository.
3. Retrieve symbols and line anchors for each target file.
4. Produce a draft refactor packet from the evidence.
5. Submit the draft to the governed engine path.
6. Receive a validation result that clearly says whether the file is promoted, blocked, or needs another pass.

## Open Questions

- Which path filter should be the default for `ai-engine` Python analysis: `src/`, `scripts/`, or both?
- Should tests be excluded by default for refactor workflows, or included when they are part of the target surface?
- Which remote SDK method should become the standard entrypoint for the file-scoped loop if the current wrapper surface is too broad?


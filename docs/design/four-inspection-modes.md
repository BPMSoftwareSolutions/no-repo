# Four Inspection Modes

This is the playground needs **four inspection modes**, not just projection rendering.

## The experiment should become

```text
Multi-repo SDK playground
→ inspect projections
→ inspect repositories
→ detect patterns / anti-patterns
→ propose governed remediation
```

## The key boundary

The AI can **inspect, classify, propose, and submit** through the SDK.

It should not silently fall back to:

```text
local scripts
manual repo scans
untracked markdown notes
direct patches
```

The repo already points this way: repo intelligence should be SQL-backed, bounded, explainable, and exposed through SDK methods rather than raw repo hunting. 

## Required playground surfaces

### 1. Repository Explorer

For multiple repos:

```ts
client.listRepositories()
client.getRepository(repositoryId)
client.listProjects({ repositoryId })
client.listCodeFiles({ repositoryId, projectId })
client.getCodeFile(fileId)
client.getCodeFileContentWindow(fileId, { startLine, endLine })
```

The client API already names this family. 

### 2. Code Intelligence Panel

For symbols and relationships:

```ts
client.listCodeSymbolsByFile(fileId)
client.getCodeSymbol(symbolId, { includeCode: true })
client.searchSymbols({ query })
client.getSymbolRelationships(symbolId)
client.getChangeAnalysis({ fileId })
```

### 3. Refactor Candidate Workbench

For God-file and seam discovery:

```ts
client.listRefactorCandidates({ repositoryRoot })
client.analyzeRefactorCandidate({
  filePath,
  requestedBy,
  refactorIntent
})
client.evaluateProposalScope({
  filePath,
  projectId,
  changeType,
  refactorIntent
})
```

This matches the pattern inventory direction: large mixed-responsibility files, bespoke wrappers, and tight coupling should become detectable system findings, not vibes. 

### 4. Pattern / Anti-pattern Registry

The playground should let the AI:

```text
view patterns
view anti-pattern rules
map anti-patterns to files/symbols
submit new candidate pattern
submit new anti-pattern finding
submit remediation proposal
```

That should become durable truth, not a markdown-only exercise. The architecture review explicitly says patterns and anti-patterns should become governed records, with trigger conditions, severity, and remediation guidance. 

## Remediation should be “proposal,” not “patch”

For your “submit new scripts or code” goal, I’d frame it as:

```text
AI proposes remediation artifact
→ SDK submits proposal
→ engine evaluates scope
→ wrapper/governance decides execution path
```

Not:

```text
AI writes local script
→ calls it done
```

The healthy execution pattern is still:

```text
approved contract
→ generic wrapper/runtime
→ persisted evidence
→ gate
```

and the known anti-pattern is bespoke local scripts or manual evidence. 

## The real UX test

Ask the AI:

> “Across all repos, find the best refactor candidate, explain the anti-pattern, choose an architecture pattern to replace it, and submit a governed remediation proposal.”

Pass only if it uses SDK surfaces end-to-end.

Fail if it invents a side process.

# SDK Projection Surface Sketch

## Project projection methods

```ts
client.getLogaProjectDetailProjection(projectId)
client.getLogaProjectRoadmapProjection(projectId)
client.getLogaRoadmapItemProjection(projectId, itemKey)
client.getLogaTaskDetailProjection(projectId, taskKey)
client.getLogaEvidencePacketProjection(projectId, evidenceKey)
client.getLogaPromotionsProjection(projectId)
client.getLogaWorkflowRunsProjection(projectId)
client.getLogaCicdStatusProjection(projectId)
client.getLogaAgentSessionProjection(projectId)
```

## Refactor promotion surfaces

```ts
client.createRefactorImplementationPlan(...)
client.getRefactorImplementationPlan(planId)
client.approveRefactorImplementationPlan(planId)
client.executeGovernedRefactorWrapper(planId)
client.getRefactorWrapperEvidence(planId)
client.queueRefactorPromotionPacket(planId)
client.getQueuedRefactorPromotionPackets(...)
```

## Observability surfaces

```ts
client.getCurrentMemoryProjection()
client.getCurrentAssistantTurnSnapshot()
client.getWorkflowRunProjection(workflowRunId)
client.getCicdStatusProjection(projectId)
client.getSdkPromotionStatus(projectId)
```

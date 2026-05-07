import { AIEngineClient } from '@bpmsoftwaresolutions/ai-engine-client';

const client = AIEngineClient.fromEnv();

const projectId = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!projectId) {
  console.error('Usage: node scripts/seed-sdk-runtime-granular-tasks.mjs <projectId> [--dry-run]');
  process.exit(1);
}

const TASK_PLAN = {
  'baseline-current-runtime-capabilities': [
    {
      title: 'Build behavior parity matrix',
      subtasks: [
        'Catalog current behavior for each loops, nested tokens, fallback chains, dataMap, and derive rules.',
        'Capture edge-case examples from the working projection flow.',
        'Define expected deterministic behavior for null, empty, and missing token values.',
      ],
    },
    {
      title: 'Capture reference fixtures',
      subtasks: [
        'Extract representative input payloads for portfolio bundle responses.',
        'Save expected markdown outputs for baseline snapshots.',
        'Record metadata/provenance expectations from current runtime responses.',
      ],
    },
  ],
  'define-sdk-runtime-contract': [
    {
      title: 'Define runtime API surface',
      subtasks: [
        'Define module boundaries for template runtime, resolver, dataMap engine, and derive engine.',
        'Define input/output contracts per module.',
        'Define error model for invalid templates and transform specs.',
      ],
    },
    {
      title: 'Define compatibility guarantees',
      subtasks: [
        'Enumerate must-not-break behavior from existing scalar token substitution.',
        'Define compatibility test criteria for existing consumers.',
        'Define deprecation strategy for future syntax changes.',
      ],
    },
  ],
  'define-transform-contract-schema': [
    {
      title: 'Finalize transform schema',
      subtasks: [
        'Finalize template, dataMap, and derive sections.',
        'Define filter operators and comparison semantics.',
        'Define derive rule evaluation order and default behavior.',
      ],
    },
    {
      title: 'Add schema validation contract',
      subtasks: [
        'Define required and optional properties.',
        'Define field-level validation errors.',
        'Add examples for valid and invalid transform declarations.',
      ],
    },
  ],
  'design-backward-compatibility-guardrails': [
    {
      title: 'Design rollout strategy',
      subtasks: [
        'Define feature flags for runtime selection.',
        'Define shadow mode verification path.',
        'Define rollback path and triggers.',
      ],
    },
    {
      title: 'Define governance guardrails',
      subtasks: [
        'Define production promotion checks for runtime migration.',
        'Define evidence requirements for parity signoff.',
        'Define ownership and escalation paths for regressions.',
      ],
    },
  ],
  'implement-sdk-token-resolver-core': [
    {
      title: 'Implement nested token lookup',
      subtasks: [
        'Implement arbitrary-depth dot path resolution.',
        'Add null-safe traversal behavior.',
        'Add deterministic string conversion policy.',
      ],
    },
    {
      title: 'Implement fallback chain semantics',
      subtasks: [
        'Parse fallback expressions split by ||.',
        'Resolve first non-empty candidate value.',
        'Preserve final fallback behavior for unresolved chains.',
      ],
    },
  ],
  'implement-sdk-each-renderer': [
    {
      title: 'Implement each block parser',
      subtasks: [
        'Parse each block boundaries and collection expression.',
        'Render item-scoped body templates.',
        'Preserve collection order and stable output.',
      ],
    },
    {
      title: 'Implement nested substitution inside each',
      subtasks: [
        'Merge item tokens with shared token context.',
        'Validate behavior for non-object collection entries.',
        'Ensure recursion safety for nested template calls.',
      ],
    },
  ],
  'implement-sdk-datamap-filter-engine': [
    {
      title: 'Implement data mapping primitives',
      subtasks: [
        'Map scalar source paths.',
        'Map collection source paths.',
        'Support optional path/source declaration variants.',
      ],
    },
    {
      title: 'Implement filtering behavior',
      subtasks: [
        'Implement string value matching.',
        'Implement array contains matching.',
        'Implement numeric gt comparison handling.',
      ],
    },
  ],
  'implement-sdk-derive-engine': [
    {
      title: 'Implement rule-chain derive evaluation',
      subtasks: [
        'Evaluate ordered derive rules.',
        'Support default fallbacks.',
        'Handle missing and malformed derive specs safely.',
      ],
    },
    {
      title: 'Implement template-based derive values',
      subtasks: [
        'Implement interpolation field replacement.',
        'Implement interpolation pipes including encode.',
        'Apply fallback values when derived output is empty.',
      ],
    },
  ],
  'implement-sdk-runtime-engine': [
    {
      title: 'Compose shared runtime pipeline',
      subtasks: [
        'Sequence dataMap, derive injection, and template rendering.',
        'Define common runtime entrypoint for projection transforms.',
        'Add provenance hooks for contract execution tracing.',
      ],
    },
    {
      title: 'Package and publish SDK module',
      subtasks: [
        'Export runtime through stable SDK surface.',
        'Add versioned release notes for new runtime capability.',
        'Publish usage examples for application integrators.',
      ],
    },
  ],
  'integrate-sdk-runtime-into-operator-projections': [
    {
      title: 'Integrate portfolio projection path',
      subtasks: [
        'Replace app-local portfolio transform logic with shared runtime call.',
        'Validate rendered output parity with baseline fixtures.',
        'Confirm fallback behavior on missing API data.',
      ],
    },
    {
      title: 'Integrate routing fallback strategy',
      subtasks: [
        'Keep legacy transform fallback for non-migrated surfaces.',
        'Add logging to distinguish shared runtime vs legacy runtime execution.',
        'Add migration toggle controls for incremental rollout.',
      ],
    },
  ],
  'integrate-platform-transform-executor': [
    {
      title: 'Backend execution endpoint integration',
      subtasks: [
        'Use shared runtime in backend projection execution path.',
        'Return contract metadata and provenance fields consistently.',
        'Ensure transform validation failures return actionable diagnostics.',
      ],
    },
    {
      title: 'Error contract hardening',
      subtasks: [
        'Replace generic 500 responses with structured mutation errors.',
        'Include contract path details in validation errors.',
        'Add correlation IDs and troubleshooting hints.',
      ],
    },
  ],
  'harden-mutation-and-governance-paths': [
    {
      title: 'Fix project bootstrap dependency',
      subtasks: [
        'Restore runtime query contract project_bootstrap_task_by_key.',
        'Verify charter and project-delivery APIs succeed after restoration.',
        'Add regression test for bootstrap task lookup path.',
      ],
    },
    {
      title: 'Harden roadmap import path',
      subtasks: [
        'Validate item domain requirements end-to-end.',
        'Ensure packet import errors are structured and actionable.',
        'Add integration tests for packet import success and failure paths.',
      ],
    },
  ],
  'build-runtime-unit-test-suite': [
    {
      title: 'Add resolver and renderer coverage',
      subtasks: [
        'Add unit tests for nested token resolution and fallback chains.',
        'Add unit tests for each rendering behavior and context scoping.',
        'Add unit tests for malformed expression handling.',
      ],
    },
    {
      title: 'Add dataMap and derive coverage',
      subtasks: [
        'Add tests for filter permutations including gt.',
        'Add tests for derive rule priority and default handling.',
        'Add tests for interpolation and encode pipe behavior.',
      ],
    },
  ],
  'establish-parity-verification-suite': [
    {
      title: 'Build snapshot parity harness',
      subtasks: [
        'Capture baseline markdown outputs from current runtime.',
        'Render same inputs through shared runtime.',
        'Diff outputs and assert parity.',
      ],
    },
    {
      title: 'Build metadata parity harness',
      subtasks: [
        'Verify required metadata fields are present.',
        'Verify provenance/source-truth consistency.',
        'Fail builds on metadata regressions.',
      ],
    },
  ],
  'validate-backend-provenance-contract': [
    {
      title: 'Implement contract validation tests',
      subtasks: [
        'Validate transport metadata fields for projection responses.',
        'Validate correlation and source version fields.',
        'Validate behavior for contract mismatch scenarios.',
      ],
    },
    {
      title: 'Add runtime observability checks',
      subtasks: [
        'Add execution traces for transform contract path.',
        'Ensure errors include correlation IDs.',
        'Add report for runtime adoption status.',
      ],
    },
  ],
  'publish-migration-guidance-and-onboard': [
    {
      title: 'Publish migration playbook',
      subtasks: [
        'Create migration steps for legacy to shared runtime path.',
        'Document fallback and rollback procedures.',
        'Document validation checklist before production cutover.',
      ],
    },
    {
      title: 'Onboard first two consumers',
      subtasks: [
        'Select two target applications.',
        'Execute migration and parity checks in each app.',
        'Capture post-migration evidence and lessons learned.',
      ],
    },
  ],
};

async function getRoadmapItems() {
  const roadmap = await client.getProjectRoadmap(projectId);
  const items = Array.isArray(roadmap?.items) ? roadmap.items : [];
  return items;
}

async function createTask(implementationItemId, title, parentTaskId = undefined) {
  if (dryRun) {
    console.log(`[dry-run] create task: ${title}`);
    return { implementation_item_task_id: `dry-${title}` };
  }

  return client.createImplementationTask(implementationItemId, {
    title,
    assignedTo: 'platform-domain',
    createdBy: 'copilot:platform-domain',
    executionType: 'implementation_task',
    executionPurpose: title,
    ...(parentTaskId ? { parentTaskId } : {}),
  });
}

async function run() {
  const items = await getRoadmapItems();
  const byKey = new Map(items.map((item) => [item.item_key || item.stable_item_key, item]));

  const summary = {
    projectId,
    dryRun,
    itemsFound: items.length,
    itemsSeeded: 0,
    tasksCreated: 0,
    subtasksCreated: 0,
    missingItemKeys: [],
  };

  for (const [itemKey, taskGroups] of Object.entries(TASK_PLAN)) {
    const item = byKey.get(itemKey);
    if (!item?.implementation_item_id) {
      summary.missingItemKeys.push(itemKey);
      continue;
    }

    summary.itemsSeeded += 1;

    for (const group of taskGroups) {
      const parent = await createTask(item.implementation_item_id, group.title);
      summary.tasksCreated += 1;
      const parentId = parent?.implementation_item_task_id || parent?.id;

      for (const subtaskTitle of group.subtasks) {
        await createTask(item.implementation_item_id, subtaskTitle, parentId);
        summary.subtasksCreated += 1;
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error('FAILED_SEED_GRANULAR_TASKS');
  console.error(error?.message || error);
  process.exit(1);
});

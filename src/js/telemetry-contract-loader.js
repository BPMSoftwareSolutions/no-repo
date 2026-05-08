(() => {
  const SCRIPT_BASE_URL = document.currentScript?.src
    ? new URL('.', document.currentScript.src).href
    : './';

  const MANIFEST_URL = new URL('../renderer/contracts/telemetry/scenario-manifest.json', SCRIPT_BASE_URL).href;
  let manifestPromise = null;

  async function loadTelemetryScenarioManifest() {
    if (!manifestPromise) {
      manifestPromise = fetchJson(MANIFEST_URL);
    }
    return manifestPromise;
  }

  async function listTelemetryScenarios() {
    const manifest = await loadTelemetryScenarioManifest();
    const scenarios = manifest?.scenarios && typeof manifest.scenarios === 'object'
      ? Object.entries(manifest.scenarios)
      : [];

    return scenarios.map(([scenarioKey, entry]) => ({
      scenarioKey,
      label: entry?.label || scenarioKey,
      projectionType: entry?.projection_type || '',
      markdownPath: resolveScenarioPath(entry?.markdown_path),
      uiContractPath: resolveScenarioPath(entry?.ui_contract_path),
    }));
  }

  async function loadTelemetryScenario(scenarioKey) {
    const manifest = await loadTelemetryScenarioManifest();
    const entry = manifest?.scenarios?.[scenarioKey];
    if (!entry) {
      throw new Error(`Unknown telemetry scenario: ${scenarioKey}`);
    }

    const markdownUrl = resolveScenarioPath(entry.markdown_path);
    const uiContractUrl = resolveScenarioPath(entry.ui_contract_path);
    const [markdown, uiContract] = await Promise.all([
      fetchText(markdownUrl),
      fetchJson(uiContractUrl),
    ]);

    return {
      scenarioKey,
      entry,
      markdown,
      uiContract,
      markdownUrl,
      uiContractUrl,
      manifest,
    };
  }

  function resolveScenarioPath(path) {
    if (!path) return '';
    return new URL(path, MANIFEST_URL).href;
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load JSON contract: ${response.status} ${response.statusText || ''}`.trim());
    }
    return response.json();
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load markdown contract: ${response.status} ${response.statusText || ''}`.trim());
    }
    return response.text();
  }

  globalThis.TelemetryContractLoader = {
    listTelemetryScenarios,
    loadTelemetryScenario,
    loadTelemetryScenarioManifest,
  };
})();

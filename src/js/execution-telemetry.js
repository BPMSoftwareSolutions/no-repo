import { mountExecutionActivityMonitor } from './execution-activity-monitor.js';

const stopTelemetryMonitor = mountExecutionActivityMonitor({
  projectIdInputEl: document.getElementById('telemetry-project-id'),
  loadButtonEl: document.getElementById('telemetry-load-button'),
  statusEl: document.getElementById('execution-monitor-status'),
  summaryEl: document.getElementById('execution-monitor-summary'),
  feedEl: document.getElementById('execution-monitor-feed'),
  metaEl: document.getElementById('execution-monitor-meta'),
  projectLabelEl: document.getElementById('execution-project-label'),
  refreshMs: 5000,
});

window.addEventListener('beforeunload', () => stopTelemetryMonitor?.());

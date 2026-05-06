# AI Engine Inspection UI - Contract-Driven Styling

This folder no longer contains the source of truth for inspection page UI styles.

## Source of truth

- `src/renderer/markdown-ui-elements.json`

Styles are generated and injected at runtime from the markdown UI contract registry.

## Guidance

- Do not add page styling to `src/css` for projection surfaces.
- Change tokens, element styles, media rules, shell rules, and routes in the registry JSON.
- Keep styling changes contract-driven so markdown + registry fully define the UI.

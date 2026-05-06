## Research: Full Markdown-UI-Contract Driven Projection Detail

### What the architecture looks like today

The page has **four distinct layers**, each at a different point on the contract-driven spectrum:

| Layer | Today | Contract-driven? |
|---|---|---|
| Projection content (`#projection-content`) | Markdown fixture → `renderMarkdown()` | ✅ Fully driven |
| Workspace chrome (`#workspace-chrome`) | `operator.workspace_chrome.md` + frontmatter overrides | ✅ Fully driven |
| CSS for content blocks | markdown-ui-elements.json → `injectRegistryStyles()` | ✅ Fully driven |
| Page header (title, question, breadcrumb) | Hardcoded HTML + JS lookup tables | ❌ Not driven |
| Page shell layout (header/aside/article) | Hardcoded HTML + global-inspection.css | ❌ Not driven |
| Design tokens (`:root` CSS vars) | Hardcoded global-inspection.css | ❌ Not driven |
| Routing (projType → API call) | JS switch/if chain in projection-detail.js | ❌ Not driven |
| Inline markdown templates (task/subtask/project-detail) | Template strings built in JS | ❌ Not driven |

---

### Gap 1: Page header — small effort

The `<header>` in the HTML has three hardcoded things: a static breadcrumb trail, an `id="detail-title"` heading, and an `id="detail-question"` paragraph. These are currently populated by `getSurfaceTitle(projType)` and `getSurfaceQuestion(projType)` JS lookup tables.

The markdown frontmatter already carries this data:
- `primary_question` → already used by `renderQuestionFirst()` in renderer.js
- `projection_type` → could map to a display label  
- `breadcrumb` → already a supported markdown directive

**What it takes**: Remove `getSurfaceTitle()` / `getSurfaceQuestion()` from JS. Read `primary_question` and a new `surface_label` frontmatter field. Strip the static `<header>` out of the HTML and render it from the frontmatter after the markdown loads. The chrome contract's `::breadcrumb` block already handles navigation hierarchy.

---

### Gap 2: Page shell layout — medium effort

The HTML shell is:
```html
<main class="projection-shell">
  <aside class="projection-shell__tree">...</aside>
  <article class="projection-shell__surface">...</article>
</main>
```

The CSS in global-inspection.css lays this out as a two-column grid. This structure is currently unconditional — every projection gets a tree sidebar.

The markdown frontmatter has `workspace_mode` (`focus`, `execution`, `governed`) and `active_surfaces`. The chrome contract already reads these to show/hide toolbar controls. The same mechanism could drive whether the sidebar renders, what its title is, and whether it starts collapsed.

**What it takes**: 
1. Add a `page_shell` section to the JSON registry that defines shell layout rules per `workspace_mode`
2. Add `show_tree`, `tree_title`, `surface_label` as recognized frontmatter keys
3. The page bootstrap reads frontmatter after load and mutates the shell accordingly (already partially done — frontmatter overrides are passed to `mountWorkspaceChrome`)

The harder part is global-inspection.css owning the `.projection-shell` grid, typography resets, and design tokens. These aren't in the registry today.

---

### Gap 3: Design tokens — low-hanging, medium payoff

All CSS custom properties (`--bg`, `--text`, `--accent`, `--line`, etc.) live in global-inspection.css `:root`. The `injectRegistryStyles()` function already generates and injects CSS from the JSON registry — it could be extended to include a `tokens` section:

```json
"tokens": {
  "--bg": "#0d1117",
  "--accent": "#7c9cff",
  ...
}
```

This would emit a `:root { --bg: ...; }` block. That removes the token definitions from the CSS file entirely. Base resets (`*`, `html`, `body`, `h1`-`h4`, `a`) are lower value to migrate — they rarely change and don't carry projection-specific meaning — but they *could* move to a `base` section in the registry if full CSS-file independence is the goal.

---

### Gap 4: Routing — largest effort, highest value

projection-detail.js contains a 200+ line imperative routing function that maps `projType` + URL params to API calls. Every time a new projection type is added, this file must change.

A declarative routing contract would look like:

```json
"routes": {
  "operator.project_portfolio": {
    "api": "getLogaProjectPortfolioProjection",
    "params": [],
    "fixtureFallback": "operator.project_portfolio"
  },
  "operator.project_detail": {
    "api": "getPortfolioProject",
    "params": ["projectId"],
    "transform": "buildProjectDetailProjection",
    "fixtureFallback": "operator.project_detail"
  }
}
```

The JS would become a generic executor: look up the route, call the API, apply any transform, fall back to fixture. Adding a new surface type requires only a JSON entry — no JS touch.

The `transforms` (like `buildProjectDetailProjection`) are the hard part — they construct markdown from raw API data. Long-term, those move server-side: the AI Engine endpoint returns the full markdown document, and the client is purely a renderer.

---

### Gap 5: Inline markdown templates — depends on server contract

`buildTaskProjection()`, `buildSubtaskProjection()`, `buildProjectDetailProjection()` are template strings in projection-detail.js. They exist because the AI Engine API returns raw data objects, not pre-rendered markdown.

The full contract-driven outcome requires those endpoints to return markdown directly — which the fixtures already demonstrate (the `.md` files are the target shape). Until the API returns markdown, client-side template builders are a necessary bridge.

A halfway measure: move the template strings to `.md.template` fixture files that use `{{placeholder}}` tokens. The JS becomes a simple token-replacer against the fixture rather than a string concatenator. This keeps the template structure in files (changeable without touching JS) while still assembling from API data on the client.

---

### What a full contract-driven architecture looks like

```
markdown-ui-elements.json
  ├── tokens          → :root CSS vars (replaces global-inspection.css :root)
  ├── base            → typography resets (optional, low priority)
  ├── elements        → component definitions (already exists)
  ├── styles          → CSS rules (already exists)
  ├── media           → responsive rules (already exists)
  ├── routes          → projection type → API + fixture mapping (new)
  └── shell           → workspace_mode → layout rules (new)

fixtures/
  ├── projections/operator.*.md       → content contracts (mostly done)
  ├── operator.workspace_chrome.md    → toolbar/chrome contract (done)
  └── templates/operator.*.md.tmpl    → JS template strings moved to files (new)
```

The HTML becomes a minimal host:
```html
<body>
  <div id="workspace-chrome"></div>
  <div id="page-header"></div>
  <main id="workspace-shell">
    <div id="projection-tree"></div>
    <div id="projection-content"></div>
  </main>
</body>
```

projection-detail.js shrinks to: load registry → look up route → fetch markdown → parse frontmatter → apply shell rules → render chrome → render content.

---

### Recommended sequencing

1. **Tokens in registry** — isolated, additive, no regressions. Drops global-inspection.css `:root` block.
2. **Header from frontmatter** — remove `getSurfaceTitle` / `getSurfaceQuestion`, read from parsed frontmatter after load.
3. **Routes contract in JSON** — replace the routing `if/else` chain with a declarative lookup.
4. **Templates to fixture files** — move `buildTaskProjection` et al. to `.md.tmpl` files with `{{token}}` substitution.
5. **Shell layout from registry** — define `workspace_mode` → layout rules, let frontmatter drive sidebar visibility.
6. **Base CSS in registry** — final step: migrate typography and reset rules; at this point global-inspection.css is near-empty or gone.

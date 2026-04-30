The surface list looks great and we can keep that. However, we also need a side-panel - an expandable knowledge tree - in the projections inspection page that will automatically drill down.

> **A document-native, expandable knowledge tree — not navigation, but exploration.**

```text
expand → understand → expand deeper → compare → collapse
```

---

# 🔥 Side Panel

We need more than:

* pages
* tables
* lists

Let's include:

> **A living tree of meaning**

---

# 🌳 What the Tree Should Actually Look Like

Here’s the **correct structure for your Projection Inspection tree**:

```text
AI Engine Inspection
└── Projections
    ├── Operator Home
    │   └── (1 projection)
    │
    ├── Project Surfaces
    │   ├── AI Engine
    │   │   ├── Project Detail
    │   │   └── Roadmap
    │   │       ├── Current Focus
    │   │       │   └── Generic Wrapper Runtime
    │   │       │       ├── Tasks
    │   │       │       ├── Evidence
    │   │       │       └── Workflow Runs
    │   │       │
    │   │       ├── Promotions
    │   │       ├── CI/CD Status
    │   │       └── Agent Memory + DB Turns
    │   │
    │   ├── Azure SQL Migration
    │   └── Neon Auth Integration
    │
    ├── Workflow Surfaces
    │   ├── Active Runs
    │   └── Completed Runs
    │
    └── System Surfaces
        ├── Promotions
        ├── CI/CD
        └── Agent Sessions
```

---

# 🧠 Why This Works

Because it answers:

```text
Where am I?
What can I open?
What is inside?
How deep does this go?
```

WITHOUT leaving the page.

---

# ✨ What It Should Feel Like

Think:

* Not Windows tree
* Not file explorer
* Not side nav

👉 More like:

* Notion nested pages
* Linear outline
* Replit file tree (but cleaner)
* Markdown outline with power

---

# 💻 Example Implementation (Clean Tree UI)

This is a **smooth, markdown-like expandable tree** (we will include it as a left sidebar though:

```html
<!doctype html>
<html>
<head>
<style>
body {
  background: #0d1117;
  color: #e5e7eb;
  font-family: system-ui;
  margin: 40px;
}

.tree {
  max-width: 800px;
}

.node {
  margin-left: 16px;
  position: relative;
}

.node::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 10px;
  width: 6px;
  height: 6px;
  background: #7c9cff;
  border-radius: 50%;
}

.summary {
  cursor: pointer;
  padding: 6px 0;
  display: flex;
  gap: 8px;
  align-items: center;
}

.summary:hover {
  color: #7c9cff;
}

.label {
  font-weight: 600;
}

.meta {
  color: #8b949e;
  font-size: 13px;
}

details > summary {
  list-style: none;
}

details > summary::-webkit-details-marker {
  display: none;
}

.arrow {
  width: 12px;
  transform: rotate(0deg);
  transition: 0.15s ease;
}

details[open] .arrow {
  transform: rotate(90deg);
}
</style>
</head>

<body>

<div class="tree">

<h1>Projection Inspection</h1>

<details open>
  <summary class="summary">
    <span class="arrow">▶</span>
    <span class="label">Projections</span>
  </summary>

  <div class="node">

    <details>
      <summary class="summary">
        <span class="arrow">▶</span>
        <span class="label">Operator Home</span>
        <span class="meta">1 projection</span>
      </summary>
    </details>

    <details open>
      <summary class="summary">
        <span class="arrow">▶</span>
        <span class="label">AI Engine</span>
        <span class="meta">project</span>
      </summary>

      <div class="node">

        <details>
          <summary class="summary">
            <span class="arrow">▶</span>
            <span class="label">Project Detail</span>
          </summary>
        </details>

        <details open>
          <summary class="summary">
            <span class="arrow">▶</span>
            <span class="label">Roadmap</span>
            <span class="meta">in progress</span>
          </summary>

          <div class="node">

            <details open>
              <summary class="summary">
                <span class="arrow">▶</span>
                <span class="label">Current Focus</span>
              </summary>

              <div class="node">

                <details open>
                  <summary class="summary">
                    <span class="arrow">▶</span>
                    <span class="label">Generic Wrapper Runtime</span>
                    <span class="meta">2 / 4 tasks</span>
                  </summary>

                  <div class="node">

                    <div class="summary">
                      <span class="label">Tasks</span>
                    </div>

                    <div class="summary">
                      <span class="label">Evidence</span>
                    </div>

                    <div class="summary">
                      <span class="label">Workflow Runs</span>
                    </div>

                  </div>

                </details>

              </div>

            </details>

            <div class="summary">
              <span class="label">Promotions</span>
            </div>

            <div class="summary">
              <span class="label">CI/CD Status</span>
            </div>

            <div class="summary">
              <span class="label">Agent Memory + DB Turns</span>
            </div>

          </div>

        </details>

      </div>

    </details>

  </div>

</details>

</div>

</body>
</html>
```

---

# 🚀 What This Unlocks

Now the user can:

* Expand **AI Engine**
* See roadmap **without leaving**
* Expand **current focus**
* Inspect **tasks, evidence, workflows**
* Jump sideways to:

  * promotions
  * CI/CD
  * memory

👉 This becomes a **workspace**, not navigation.

---

# 🧩 Next Level (What You Should Do Next)

You’re *very* close to something powerful.

Next steps:

### 1. Replace table with tree

Kill the projection table entirely.

---

### 2. Group by meaning, not type

NOT:

```text
operator.project_detail x5
```

BUT:

```text
AI Engine (project)
Azure Migration (project)
Neon Auth (project)
```

---

### 3. Add state inline

```text
Generic Wrapper Runtime (2/4 tasks)
```

---

### 4. Add lateral visibility

From roadmap node:

* promotions
* CI/CD
* agent

---

### 5. Make everything expandable

No dead ends.


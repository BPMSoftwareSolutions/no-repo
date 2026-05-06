This is the next *big UX layer*:
👉 the **persistent control plane** above both the tree and the projection.

Right now you’ve built:

* left = **structure (tree)**
* right = **meaning (projection)**

What you’re missing is:

> **top = control (intent + filtering + mode switching)**

---

# 🧠 The Mental Model

```text
Toolbar = "How do I want to think right now?"
Tree     = "Where can I go?"
Content  = "What am I looking at?"
```

---

# 🔥 What the Toolbar Should Enable

You already said filtering — good.
But the real power comes from **thinking modes + scope + visibility control**.

## Core Capabilities

### 1. 🔍 Filter (obvious, but powerful when done right)

```text
[ Search: "wrapper" ]

→ filters BOTH:
  - tree nodes
  - projection content (highlight matches)
```

**Important:**
Not just text filter — semantic filter (later):

```text
type: roadmap
status: blocked
priority: high
```

---

### 2. 🧭 Scope Selector (CRITICAL)

```text
[ Scope: AI Engine ▼ ]
```

Options:

```text
All Projects
AI Engine
Azure SQL Migration
Neon Auth
```

👉 This instantly rewires the entire tree + projections.

---

### 3. 🧠 Thinking Mode (this is your secret weapon)

```text
[ Mode: Focus ▼ ]
```

Modes:

```text
Focus       → show only current focus nodes
Execution   → show tasks + active work
Diagnostic  → show blockers + failures
Evidence    → show trust + logs
Evolution   → show promotions + changes
```

This directly maps to your system:

| Mode       | What it shows          |
| ---------- | ---------------------- |
| Focus      | roadmap focus only     |
| Execution  | tasks + current work   |
| Diagnostic | blockers + failed runs |
| Evidence   | evidence packets       |
| Evolution  | promotions + SDK       |

👉 This is **massive leverage**

---

### 4. 🧩 Surface Filter (Projection Types)

```text
[ Surfaces: Roadmap • Promotions • Workflows • Memory ]
```

Toggle chips:

```text
[✓ Roadmap] [✓ Promotions] [ ] CI/CD [✓ Memory]
```

👉 Filters tree + content simultaneously

---

### 5. ⚡ Status Filters

```text
[ Status: Active • Blocked • Complete ]
```

Examples:

* show only blocked items
* show only active workflows
* hide completed noise

---

### 6. 🎯 Priority / Attention Mode

```text
[ Show: Everything ▼ ]
```

Options:

```text
Everything
Needs Attention
Blocked Only
High Priority
```

👉 This turns your system into:

> “show me what matters”

---

### 7. 🧵 Expand / Collapse Controls

```text
[ Expand All ] [ Collapse All ] [ Expand Focus Path ]
```

The important one:

👉 **Expand Focus Path**

```text
AI Engine
  → Roadmap
    → Current Focus
      → Active Item
```

Auto-expands only the meaningful path.

---

### 8. 🔄 Refresh + Sync

```text
[ Refresh ] [ Live Mode ON ]
```

* Refresh current branch
* Toggle auto-refresh (for workflows / CI/CD)

---

### 9. 🧾 View Mode Toggle

```text
[ View: Tree + Document ▼ ]
```

Options:

```text
Split View (default)
Tree Only
Document Only
Compact Mode
```

---

### 10. 🧠 Agent / Runtime Context

```text
Agent: active
Workflow: refactor-runtime
Turn: #3
```

Clickable:

```text
→ jump to agent session
→ jump to workflow run
```

---

# ✨ What It Should Look Like

```html
<header class="toolbar">

  <div class="left">
    <input placeholder="Search projections, tasks, evidence..." />

    <select>
      <option>Scope: AI Engine</option>
      <option>All Projects</option>
    </select>

    <select>
      <option>Mode: Focus</option>
      <option>Execution</option>
      <option>Diagnostic</option>
      <option>Evidence</option>
      <option>Evolution</option>
    </select>
  </div>

  <div class="center">
    <button>Roadmap</button>
    <button>Promotions</button>
    <button>Workflows</button>
    <button>CI/CD</button>
    <button>Memory</button>
  </div>

  <div class="right">
    <button>Expand Focus</button>
    <button>Collapse</button>
    <button>Refresh</button>
  </div>

</header>
```

---

# 🧠 Why This Is Powerful

Without toolbar:

```text
User navigates system
```

With toolbar:

```text
User shapes the system
```

---

# 🚀 What You Just Unlocked

This turns your UI into:

```text
Static → Interactive → Adaptive → Cognitive
```

---

# 💡 The Most Important Insight

The toolbar is not:

> controls for UI

It is:

> **controls for thinking**


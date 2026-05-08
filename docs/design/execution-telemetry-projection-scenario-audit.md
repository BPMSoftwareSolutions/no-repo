# Execution Telemetry Projection Scenario Audit

## Purpose

Track markdown projection scenarios from draft to Contract Lab verification,
approval, and promotion to official UX.

Lab URL: http://localhost:5000/lab.html

## Status definitions

- Draft: Scenario markdown exists but has not passed verification.
- Approved: Scenario has passed Contract Lab verification and is approved.
- Promoted: Approved scenario has been promoted to official UX.
- Blocked: Scenario failed verification or violated architecture boundaries.

## Audit table

| scenario_key | markdown_path | contract_key | verification_result | approved_by | approved_at_et | promotion_status | promoted_at_et | notes |
|---|---|---|---|---|---|---|---|---|

## Scenario checklist (run per row)

- [ ] Markdown file exists for this scenario.
- [ ] Scenario is loaded in Contract Lab.
- [ ] Rendering matches markdown + contract declarations.
- [ ] Iterators and data bindings render correctly.
- [ ] Actions and navigation execute declaratively.
- [ ] No bespoke domain logic is required in JavaScript runtime.
- [ ] Separation boundaries are intact (Markdown vs JSON contract vs JS runtime).
- [ ] Audit row updated with result and status.
- [ ] Only `Approved` rows are eligible for `Promoted`.

## Promotion rule

A scenario may be promoted only when:

1. verification_result = Pass
2. promotion_status = Approved
3. approved_by and approved_at_et are both populated

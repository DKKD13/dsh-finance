---
name: product-review
description: Use when asked to review, audit, or evaluate a web application's UX, AI features, visual design, or interaction quality. Also use when the user says review, test, evaluate product, or wants PM-style feedback on their app.
---

# Product Review

**Operate the app as a real user, capture screenshots, write a structured PM-style report. Don't modify code.**

## When

- Review/evaluate web app UX, AI features, visual design
- PM/UX feedback before release
- Test user flows, AI quality, edge cases

**Not for**: bug fixing, code review, performance benchmarking

## Workflow

```
Setup → Browse → Feature Test → Edge Cases → Report → Deliver
```

## Phase 1: Setup
- Verify app running (curl health endpoints)
- Auth: log in or use storageState
- Create `test-results/review-screenshots/`
- Launch headless Chromium via Playwright. Viewport 1400×900. Use `storageState` for auth if available.

## Phase 2: Systematic Browse

Visit every route. For each page:
1. `goto(url)` → `waitForLoadState('networkidle')`
2. `screenshot({ fullPage: true })`
3. **View screenshot via Read tool** — record observations

**Per-page checklist**: load without blank? meaningful empty state? navigation highlight correct? console errors? color scheme consistent?

## Phase 3: Feature Testing

For each core feature:
1. Perform action (click, fill, submit)
2. Screenshot before & after
3. View & record: did it work? feedback (toast/animation/loading)? expected result?

| Scenario | Observe |
|---|---|
| Create entity | Dialog UX, validation, success feedback |
| AI chat | Response time, reply quality, info leaks |
| Import/upload | Progress, error handling |
| Settings | Clarity, help text, save confirmation |
| Dark mode | Color adaptation, contrast |
| Mobile (375×812) | Layout, touch targets, readability |

## Phase 4: Edge Cases

- Empty states (no data)
- Error states (mock API 500 via `page.route`)
- Long input
- Rapid double-click
- Page refresh (state recovery)

## Phase 5: Report

Output to `docs/superpowers/product-review.md` (or user-specified).

```markdown
# [Product] Review Report
> Date: YYYY-MM-DD | Reviewer: AI PM

## S1 First Impression & Branding
## S2 Navigation & IA
## S3 Core Feature Experience
## S4 Visual Design (light/dark/mobile)
## S5 Interaction Quality
## S6 Overall Scores (table: dimension, 1-5, notes)
## S7 Top Improvements (P0/P1/P2)
## S8 Screenshot Index
```

## Scoring

| Score | Meaning |
|---|---|
| 5 | Polished, delightful |
| 4 | Good, minor improvements |
| 3 | Functional but needs polish |
| 2 | Significant gaps |
| 1 | Broken or severely lacking |

## Phase 6: Deliver

向用户交付报告路径与截图索引，总结 P0/P1 发现。**绝不自动执行 `git add` / `git commit` / `git push`** — 是否提交、何时提交由用户决定；用户明确要求提交时，再按用户指定的 message 执行。

## Key Rules

1. **Don't modify product code** — you're a reviewer, not developer
2. **View every screenshot** — use Read tool
3. **Record real observations** — no `_(PM fills in)_` placeholders
4. **Prioritize P0/P1/P2** with clear reasoning
5. **Be specific** — "Button color #7c3aed clashes with warm #f4f2ec palette" not "colors are off"
6. **Test as new user** — don't assume product knowledge
7. **Distinguish placeholder from value** — a screenshot's input hint is not a user default. Require actual `input.value` or interaction evidence to claim a default value; otherwise describe only the visible input hint.
8. **Separate content language from UI locale** — Chinese user input or report content is not evidence of an English UI locale defect; judge the interface labels separately.
9. **Keep static and interactive evidence separate** — a static screenshot does not prove interactions were tested; mark interactions without actual execution evidence as untested.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Screenshots without viewing | Always Read each screenshot |
| Generic observations | Reference specific elements/colors/text |
| Only happy path | Include errors / edge cases / mobile |
| Skipping dark mode | Always test if supported |
| Forgetting empty states | First-time user sees these first |
| Modifying code to fix | Document, don't fix |

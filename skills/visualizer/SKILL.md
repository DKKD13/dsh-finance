---
name: visualizer
description: Turn an existing research report into a standalone HTML visual plus a Markdown-native summary for DSH, while preserving the original report and explicit Obsidian output mode.
---

# Research Report Visualizer

Turn an existing research report into two files without changing the source report:

1. a standalone, self-contained HTML visual;
2. a GFM Markdown summary that DSH can render and link natively.

Do not put raw HTML visual blocks into the Markdown shown in DSH Reports. DSH renders those reports with raw HTML omitted, so the visual would disappear.

## Trigger and mode

Use this skill when the user asks to visualize, chart, turn into a web page, or add visual summaries to an existing report.

- **Default: DSH mode.** Produce `{stem}-visual.html` and `{stem}-visual-summary.md`.
- **Obsidian mode.** Use only when the user explicitly names Obsidian or asks for an inline-HTML Markdown copy. Then also produce `{stem}-report-visual.md` using the Obsidian rules below.

Use paths supplied by the user. Otherwise place outputs beside the source report. Never overwrite the source report.

## Evidence gate

Read the complete source report before designing anything. For every number, comparison, timeline item, and claimed causal link:

- identify the source node, source document, URL, filing, transcript, or user-provided evidence already present in the report;
- retain the source's `asOf` or `availableAt` when available;
- distinguish a reported fact from a calculation or the report author's inference;
- preserve the original unit, currency, period, and denominator;
- mark missing, conflicting, stale, or unverifiable data as unknown instead of filling it from memory.

Recompute every new displayed calculation with an actual deterministic tool. Keep full precision through the calculation and round once for the final label; subtracting already-rounded percentages can change the result. Check chart labels, tables, callouts, and the Markdown summary against that same calculation output. Keep small labels readable: use at least 4.5:1 contrast for ordinary text against its background.

Do not add a new data source, API call, dependency, or fabricated provenance. If the report does not contain enough evidence for a proposed visual, omit that visual and state the gap in the summary.

## Default DSH output

### 1. Standalone HTML

Write `{stem}-visual.html`, preserving the source report and its nearby assets.

- Use one complete HTML document with inline CSS and inline SVG.
- Escape all report text before inserting it into HTML.
- Use no JavaScript, `<iframe>`, external stylesheet, external font, remote image, form, or runtime network request.
- Link only to HTTP(S) source URLs when a clickable source is useful. Keep local artifact access in the Markdown summary and conversation, not as invented `file://` or `dsh-*` URLs inside the HTML.
- Prefer small ranked bars, range plots, timelines, tables, and labeled callouts over decorative dashboard chrome.
- Give every chart a title, readable labels, units, source/as-of note, accessible text alternative, and a short interpretation.
- Use responsive CSS with a readable print layout. Do not rely on hover to reveal essential information.

The HTML file is the visual artifact DSH can preview in its native document viewer. Do not assume it is embedded in a graph report.

### Record the artifact on the deliverable

When the report (or a visual summary deliverable) is committed to the research graph, put the HTML's workspace-relative path in the deliverable's metadata so the DSH report page can offer an entry that opens the host sidebar preview:

```json
"metadata": { "visualArtifact": "reports/<stem>-visual.html" }
```

Use the real relative path of the file just written. Never invent a path, use an absolute path or `file://` URL, or point `visualArtifact` at anything that is not the standalone HTML produced here. The report-reading UI validates the field and shows no entry when it is missing or unusable.

### 2. Markdown-native graph summary

Write `{stem}-visual-summary.md` beside the HTML. This file must render with ordinary DSH Markdown and contain no raw HTML blocks.

Use this order:

1. **Conclusion:** the report's main judgment in one short paragraph.
2. **Key visuals:** a GFM table or compact list of the metrics, periods, values, units, and what changes.
3. **Causal chain:** the evidence-backed mechanism and the strongest countercase.
4. **Catalysts and tracking:** date, event, current status, and source; use a table when dates are known.
5. **Provenance:** one row per source with title or node id, publisher or provider, `asOf`/`availableAt`, the facts used, and URL or local file label. Mark calculations with their formula and deterministic tool output.
6. **Artifacts:** link the HTML file, the source report, and any optional Obsidian copy with normal Markdown file links.
7. **Limits:** missing data, conflicts, stale snapshots, and items that were not visualized.

Keep the full research report available at its original path. The summary is a navigation and reading aid, not a replacement.

In DSH, when the registered `finance_briefing` and `finance_graph` tools are available, save this same Markdown summary as a new graph deliverable so it appears in Historical Research. Use `finance_briefing` with `action: "record"` and `input: {id, title, content, references, metadata}`; only include source/report node IDs that were actually read. Preserve the source report's confirmed research cutoff as `metadata.asOf`, use the actual current generation time for `metadata.availableAt` and `metadata.fetchedAt`, and set `metadata.provider` to `visualizer`. Carry the current request's `runId` and `sessionId` only when provided; never invent them. Keep `metadata.localArtifact` pointed at the Markdown summary, not the HTML. Read the saved node back through `finance_graph` (`action: "get"`, top-level `id`) and confirm its content matches the summary file. Do not replace the host-generated `contentHash` with a file hash. If these tools or required provenance inputs are unavailable, report file-only delivery explicitly.

Read the host clock immediately before saving and use the exact returned timestamp, including seconds; never round it into the future. After saving, use the actual node readback's `content` as the canonical Markdown file bytes, without adding a newline or reformatting table alignment. Read the file again and compare byte length and SHA-256 against those exact readback bytes before claiming they match. For corrections, create a new report revision and retain the earlier report.

### 3. Native DSH links and delivery

Use the verified DSH file-link form in the final assistant response and in the summary:

```markdown
[Visual HTML](<relative/or/absolute/path/report-visual.html>)
[Markdown summary](<relative/or/absolute/path/report-visual-summary.md>)
[Original report](<relative/or/absolute/path/report.md>)
```

Use a workspace-relative or absolute path. Enclose destinations in angle brackets when they contain spaces. Use filename labels rather than dumping full paths into prose.

When the `present` tool is actually available and the files are final, call it once for the HTML and Markdown summary so DSH can show native delivery cards with Sidebar preview and open actions. If `present` is unavailable, omit it and use the Markdown links above. Do not invent `dsh-resource:`, `dsh-app:`, or `file://` URLs.

Do not add a custom file-link UI or change `omitHtml`; this skill produces artifacts and uses the host's existing controls.

## Obsidian mode

Only after the user explicitly requests Obsidian, also create `{stem}-report-visual.md`.

- Start from the source report and preserve its text.
- Insert visual blocks at relevant section boundaries without rewriting the analysis.
- Keep zero `<iframe>`, zero `<script>`, and no `<style>` block.
- Use inline `style="..."` and inline SVG.
- Keep blank lines before and after each HTML block.
- Preserve the original source report unchanged.

The standalone HTML can still be produced in this mode.

## Verification

Verify the formats requested by the user. In default DSH mode, deliver the HTML and Markdown summary; do not add PDF generation or repeated print-layout rounds unless requested. Use the host's available preview or image tools for visual checks. If a browser check is unavailable, report that limit rather than changing browser security flags or inspecting user browser profiles. A local rendering check does not replace opening the final artifact in DSH.

Before reporting completion:

- verify both default artifacts exist and are non-empty;
- verify the source report was not overwritten;
- verify the Markdown summary renders with no raw HTML dependency;
- inspect the HTML for scripts, frames, remote asset loads, and unresolved placeholders;
- check that each visual value appears in the provenance table;
- open the HTML locally when a local file-opening check is available, without claiming a native DSH browser test unless one was actually run.

Report the output paths, source/as-of coverage, omitted-visual gaps, and the checks actually performed.

# DSH Local Clipper

Clean-room Manifest V3 extension. Load `dist/clipper` as an unpacked extension after running `node scripts/build-clipper.mjs` from the repository root.

The popup captures the active page or current selection, adds optional topic/tags/note, and posts `{bundle:clip,dryRun:false,asOf}` to `<loopback-endpoint>/clipper/v1/import` (default `http://127.0.0.1:47643`). The Host requires a 43-character Bearer token and an exact extension Origin in `clipperHttp.allowedOrigins`. Endpoint and token are stored only in `chrome.storage.local`; no sync storage, remote host permission, automatic tab creation, remote code, or third-party clipper API is used. The recent list keeps at most ten metadata-only results and never stores clip text or tokens.

The extension supplies `capturedAt` only as capture provenance. It never derives `availableAt` from it. The Host decides quarantine, content versions, duplicate handling, and `supersedes` relations.

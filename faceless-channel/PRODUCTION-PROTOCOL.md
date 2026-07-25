# Production Protocol

Operating rules for this channel. The folders are the source of truth — if it
isn't in a folder, it didn't happen. This file governs how work moves through them.

## 1. Folder contract

```
faceless-channel/
├── 01-research/            channel-level research library (evergreen, cross-video)
├── 02-channel-strategy/    positioning, audience, naming, cadence, benchmarks
├── 03-scripts/             script style guides, hook banks, VO direction notes
├── 04-storyboards/         shot-language conventions, sequence templates
├── 05-reference-images/    style refs, character/scene locks, LUT plates
├── 06-video-clips/         generated + stock clips (heavy binaries)
├── 07-audio/               music beds, SFX library, voice models
├── 08-edits/               project files, rough cuts, masters
├── 09-thumbnails/          thumbnail renders + A/B variants
├── 10-publishing/          publish log, metadata archive, performance data
└── videos/
    └── NNN-slug/           one folder per video — the working unit
```

The ten numbered stage folders hold **channel-level and shared** material: things
reused across videos, plus the heavy binaries. Each individual video gets a
numbered folder under `videos/` holding its own thirteen deliverables.

> Structural note: `videos/` is an addition to the originally specified tree.
> Per-video folders numbered `001-…` sitting directly beside stage folders
> numbered `01-…` read as the same axis when they are not. Say the word and I
> will flatten them back up a level.

Video folders are numbered `001`, `002`, … in production order, never reused,
never renumbered, with a short kebab-case slug: `videos/001-why-rome-fell/`.

## 2. Required deliverables per video

Every `videos/NNN-slug/` contains exactly these, and `_template/` is its skeleton:

| File | Stage | Gate |
|---|---|---|
| `research.md` | 01 | G1 |
| `concept.md` | 02 | G1 |
| `script-v1.md` | 03 | G2 |
| `approved-script.md` | 03 | G2 — frozen on approval |
| `storyboard.csv` | 04 | G3 |
| `asset-manifest.csv` | 04–06 | G3 |
| `voiceover.wav` | 07 | post-G3 |
| `music-and-sfx-plan.md` | 07 | post-G3 |
| `edit-plan.md` | 08 | G4 |
| `titles.md` | 10 | post-G4 |
| `description.md` | 10 | post-G4 |
| `thumbnail-briefs.md` | 09 | G3 direction, renders post-G3 |
| `qa-report.md` | 10 | pre-publish |

A video is not shippable with any of the thirteen missing or still at TODO.

## 3. Approval gates

Work stops at each gate and waits. No gate is self-granted.

- **G1 — Topic selection.** Deliver `research.md` + `concept.md`. Nothing else starts.
- **G2 — Script.** Deliver `script-v1.md`. On approval it is copied verbatim to
  `approved-script.md` and frozen.
- **G3 — Storyboard and visual direction.** Deliver `storyboard.csv`,
  `asset-manifest.csv`, and the visual direction section of `thumbnail-briefs.md`.
  **This is the spend gate — see §5.**
- **G4 — Rough cut.** Deliver `edit-plan.md` and an assembled rough cut in `08-edits/`.

Each granted approval is appended to `APPROVALS.md` with the date, the gate, the
artifacts covered, and the commit SHA that froze them.

## 4. Never overwrite approved work

Once an artifact passes a gate it is immutable. Revisions never edit in place.

- Scripts iterate as `script-v1.md`, `script-v2.md`, … `approved-script.md` is
  written **once**, from whichever version was approved.
- A superseded approval is not deleted: the new version is added, and
  `APPROVALS.md` records what replaced what and why.
- Storyboards revise as `storyboard.csv` → `storyboard-v2.csv`, same rule.
- Regenerated media gets a new filename with a version suffix. Approved renders
  are never overwritten by a re-run of the same prompt.

If a change would destroy approved work, the correct move is to stop and ask.

## 5. Spend gate

No expensive asset generation before **G3** is granted. Specifically blocked pre-G3:

- video generation, image generation, 3D generation
- upscales, reframes, motion control, background removal
- full voiceover renders
- any paid API call that burns credits

Permitted pre-G3: text research, web search, writing, and planning. Style
exploration happens as written direction and existing reference material, not
as test renders.

Post-G3, generation follows `asset-manifest.csv` — one row, one asset, no
freelancing outside the manifest.

## 6. Working rules

- Costed actions are estimated in the manifest before they are run.
- QA (`qa-report.md`) runs before publish: factual claims sourced, audio levels,
  captions, aspect ratio, thumbnail legibility at small size, description links,
  and rights clearance on every third-party asset.
- Nothing publishes without an explicit go, separate from G4.

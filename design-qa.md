# Design QA — WebGL 食物加工过程可视化

## Evidence

- Source visual truth: `/Users/tian/Desktop/录屏2026-08-06 21.39.48.mov`
- Source contact sheet: `/Users/tian/.codex/visualizations/2026/08/06/019fd74d-b13d-7d00-aa0b-03e3da488711/video-audit/contact-sheet.png`
- Source comparison frame: `/Users/tian/.codex/visualizations/2026/08/06/019fd74d-b13d-7d00-aa0b-03e3da488711/video-audit/step-05.png`
- Browser-rendered implementation:
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-raw.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-cutting-final.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-mixing.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-final-post-build.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-packing-final.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-mobile.png`
- Full-view comparison: `/Users/tian/Codes/nora/output/playwright/nora-webgl-reference-comparison-v2.png`
- Focused machinery comparison: `/Users/tian/Codes/nora/output/playwright/nora-webgl-reference-focus-comparison-v2.png`
- Motion evidence:
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-motion-a.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-motion-b.png`
  - `/Users/tian/Codes/nora/output/playwright/nora-webgl-motion-difference.png`

## Normalization

- Source frame: 712 × 498 px.
- Desktop implementation: 1280 × 720 CSS px and screenshot pixels at the in-app browser's default density.
- Mobile implementation: 390 × 844 CSS px and screenshot pixels. The temporary viewport override was reset after capture.
- Full-view comparison normalized the source frame to 720 px high while preserving its aspect ratio, then placed it beside the unscaled 1280 × 720 implementation.
- Focused comparison used same-height 750 × 450 crops around the active machinery and moving food.
- State: dark cinematic theme, cooking checkpoint paused at 68%; additional fixed checkpoints captured for raw input, cutting, mixing, and sealing.

## Findings

- No actionable P0/P1/P2 issue remains.
- The source is a photoreal coffee-machine visualization while Nora depicts a central-kitchen food line. The product subject and machinery are intentionally different; the comparison target is the source's cinematic visual grammar: a single close-up 3D process, continuous camera travel, deep black industrial environment, metal reflections, controlled warm/cool lighting, and sparse edge controls.
- The implementation now uses a real WebGL scene with perspective camera, physical materials, shadows, fog, bloom, moving machinery, volumetric-looking steam particles, fire, sauce flow, food toss arcs, a descending transparent lid, and a scanning seal line. It is no longer a still image, raster sprite sequence, or 2D Canvas illustration.
- Visible explanatory copy remains absent as explicitly requested. Only icon controls and an unlabeled timeline remain.

## Required Fidelity Surfaces

- Fonts and typography: no visible type is present in the full-screen visualization. Accessible names are non-visual and do not change the composition.
- Spacing and layout rhythm: the active process fills the central frame like the reference. Edge controls preserve generous safe areas; desktop and 390 × 844 mobile captures show no clipped persistent control.
- Colors and visual tokens: near-black metal, cool overhead illumination, warm process lighting, and restrained emissive accents align with the source. The final pass reduced tone-mapping exposure and bloom to prevent clipped highlights.
- Image quality and asset fidelity: geometry remains sharp at both tested viewports, metal surfaces reflect stage lights, translucent sealing material reads separately from the food, and no low-resolution raster background or stretched still is visible. Food forms are intentionally stylized procedural 3D assets rather than a scan of a specific real dish; this is acceptable for the current product-demo scope.
- Copy and content: no visible cards, captions, metrics, development instructions, or placeholder text appear in the experience.
- Icons: play/pause and close use the project's consistent icon library; chapter controls are minimal dots matching the source's unobtrusive chrome.

## Interaction, Accessibility, and Runtime Checks

- Entry from `演示业务流程`: passed.
- Continuous autoplay and camera journey: passed.
- Play/pause and progress scrubber: passed.
- Five direct process checkpoints: passed.
- Escape and close control: passed.
- Reduced-motion default pause behavior: implemented.
- Keyboard labels and screen-reader names: present.
- Desktop and 390 × 844 mobile composition: passed.
- Browser console errors after the production build: none.
- Two cooking frames captured 420 ms apart produced SSIM `0.847145`, confirming strong frame-to-frame 3D motion.
- TypeScript, ESLint, 29 unit tests, and optimized Next.js production build: passed.

## Comparison History

1. Previous 2.5D implementation: P1 mismatch — the food moved, but equipment and camera depth remained illustrative rather than genuinely three-dimensional.
   - Fix: replaced the 2D renderer with a Three.js/WebGL scene, perspective camera, PBR materials, real lights, shadows, fog, post-processing, and animated 3D geometry.
2. First WebGL pass: P2 — the industrial environment was underexposed, the camera sat too far back, the raw pepper read as an egg, and the packaging checkpoint did not show the sealing lid clearly.
   - Fix: increased controlled ambient/key lighting, tightened the camera, built a lobed pepper form, moved the cutting checkpoint later, moved the packaging checkpoint to the sealed state, and changed the seal scanner from a broad plane to a thin light line.
3. Second WebGL comparison: P2 — reflective highlights and bloom were slightly clipped relative to the reference's restrained copper/black treatment.
   - Fix: reduced ACES exposure from 1.45 to 1.32 and bloom strength/radius while raising the bloom threshold. Revised comparison evidence is in `nora-webgl-reference-comparison-v2.png` and `nora-webgl-reference-focus-comparison-v2.png`.
4. Final pass: no P0/P1/P2 issue remains in desktop, mobile, interaction, or visual comparison evidence.

## Implementation Checklist

- [x] Replace the 2.5D Canvas renderer with WebGL/Three.js.
- [x] Add perspective, depth, physical materials, shadows, fog, and post-processing.
- [x] Animate raw input, cutting, mixing, cooking, plating, and sealing in 3D.
- [x] Preserve the wordless interface and existing entry/control model.
- [x] Verify responsive framing, motion, keyboard exit, controls, and console state.
- [x] Pass typecheck, lint, unit tests, and production build.

## Follow-up Polish

- P3: a future asset-production pass can replace the procedural food and machine geometry with art-directed GLB scans while preserving the current timeline, physics, lighting, and camera system.

final result: passed

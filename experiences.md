# Astral Strike — project experiences

## 2026-09-06 — Starting from illustrated reference sheets

- The references are JPEG contact sheets on white backgrounds, rather than transparent sprite atlases. Keep the originals untouched and extract textures in memory at startup using boundary-connected white removal, preserving enclosed white ship details.
- Use an orthographic Three.js scene and a fixed portrait playfield so movement, bullet speed, and bomb radius stay consistent across mobile and desktop.
- Keep simulation separate from rendering. A fixed time step prevents collisions and wave timing from changing with device frame rate and enables repeatable campaign validation.
- PWA delivery uses locally bundled dependencies and an explicit offline cache. No runtime CDN or account is required by the game.

## Sprite and rendering findings

- A player crop initially included a small detached wing fragment from the neighbouring boss. Keeping the largest connected ship silhouette removes that fragment without modifying any reference image. White interior armour remains intact.
- Sprite instances are batched by texture. A representative combat scene required 13 draw calls, including the background, stars, HUD-independent effects, ships, and bullets.
- Visual checks covered the desktop cabinet and a 390 × 844 touch viewport. The fixed portrait field is centred on taller phone screens so collision geometry and bomb radius do not stretch.

## Gameplay and browser checks

- Focused simulation checks passed for bomb-radius boundaries, boss inclusion, empty bomb stock, repeat protection, normalized diagonal speed, pause freezing, damage invulnerability, sector checkpoints, pickup caps, and final-stage victory.
- A movement-only pilot completed the full simulation in 394.45 seconds, with 331 kills and three shields remaining. It used normal movement and bombs; it did not modify health or skip wave time.
- Playwright verified title/help navigation, WASD, auto-fire, the I key, and pause/resume. Touch tests used actual browser touch input with two simultaneous pointers: moving diagonally and firing a bomb worked together, release reset movement, and touch pause froze the simulation. No mobile page errors or layout overflow were observed.
- A paused Playwright virtual clock also pauses the CLI's post-action settling timers. Resume the clock at the end of a deterministic test, after pausing gameplay if necessary, so the CLI can return its result.
- The initial dependency audit identified a vulnerable Vite development-server release. Upgraded to Vite 7.3.6; npm reported zero vulnerabilities afterward.

## Final end-to-end results

- Playwright completed the real rendered campaign using keyboard input and the virtual clock, with no health changes or stage skips: **victory in 377.42 seconds, 330 kills, 118,700 points, one shield remaining**. All three boss scenes, both sector-clear screens, and the victory screen were captured.
- Standing still produced a real game over. The retry button restored the same sector at 0.5 seconds with six shields, three bombs, and the sector's starting score. The 320 × 568 layout also passed overflow checks.
- The first disconnected production reload exposed an HTTP `Vary: Origin` cache mismatch for module scripts/styles. The service worker now matches only its explicit static-asset allowlist against its own versioned cache with `ignoreVary`, preserving normal network-first navigation.
- The corrected production build passed a clean offline reload, mission launch, bomb input, and pause in Playwright's mobile context. Thirteen required files were cached; 192px and 512px PWA icons decoded correctly, and development state inspection was absent from production. No page errors were observed.
- SHA-256 comparison confirmed all six reference files and their runtime copies are byte-identical. No source artwork was overwritten.
- Mobile checks use Chromium touch emulation, not a physical phone. Real-device installation and long-session thermal performance remain useful follow-up checks.

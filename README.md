# Astral Strike

A complete three-sector vertical arcade shooter. Three.js rendering, plain JavaScript simulation, Vite packaging, and offline PWA support. Original reference artwork is kept in `reference/`; runtime copies are in `public/assets/`.

## Why this exists

This is an educational project created to test GPT 6 Astra and to show Product AI students how quickly a working prototype can be built with OpenAI Codex. It was produced in a single, one-shot 40-minute work session. The asset artwork was publicly available and free to use; unfortunately, I no longer remember who the original author was.

## Run

Node.js 22.12+ is recommended.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production/offline test:

```sh
npm run build
npm run preview
```

For phone testing on the same network, use Vite’s network URL. Installing a PWA and offline caching require HTTPS, or localhost on the testing device; a plain HTTP LAN address supports gameplay but not installation. Deploy the contents of `dist/` to any static HTTPS host.

## Controls and campaign

- WASD moves; weapons fire automatically. I fires a bomb. Escape pauses/resumes.
- Touch: drag in the lower-left flight area to position and move the floating joystick. The right button fires a bomb. Pause is at the top right. Simultaneous joystick and bomb input is supported.
- Six shields, a small bullet hitbox, brief damage invulnerability, and three bombs per sector.
- Bombs destroy all enemies whose centres are inside the 188-unit radius at activation, including bosses. Nearby enemy bullets are cleared too.
- Green + restores two shields; arrow pickups increase firepower up to level three.
- Each sector has 100 seconds of enemy waves followed by a boss. Defeat all three bosses to finish. Cleared sectors restore two shields and replenish bombs.
- Failure offers a retry from the beginning of the current sector, restoring its starting score and weapon level. Personal best and audio preference are optional local browser storage.
- Audio is synthesized locally. No runtime external font, image, sound, or library requests.

## Structure

- `src/game.js`: renderer-independent fixed-step rules and campaign state.
- `src/renderer.js`: orthographic Three.js scene; instanced sprite batches.
- `src/assets.js`: source-sheet texture extraction in memory.
- `src/main.js`: UI, input, lifecycle, and frame loop.
- `src/audio.js`: synthesized sound and music.
- `vite.config.js`: build-specific offline cache generation.

The development build exposes `window.__arcade` for inspecting live state in desktop debugging. Vite removes that branch from the production build. It does not change damage, timing, or progression.

See `experiences.md` for implementation findings and `output/playwright/` for local QA artifacts (excluded from source control).

## Validation

`node scripts/verify-game.mjs` checks combat and progression boundaries. Playwright completed all three stages through the victory screen with normal keyboard input (6:17, 330 kills), and verified desktop controls, real game-over/retry, two-finger touch controls, small-screen layout, and a disconnected production reload with playable combat. Mobile validation used Chromium emulation; physical-phone installation was not tested.

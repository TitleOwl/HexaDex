# Elemental video effects

Looping video clips used as the 3D-view ambiance, one per Pokémon type.
The 3D view auto-detects the file by type. **Any type without a file falls back
to the built-in tsParticles effect** — so you can add clips one at a time.

## How to add a clip
1. Download a clip — a clip on a **solid BLACK background** works best, because
   `mix-blend-mode: screen` makes the black transparent and leaves only the effect.
2. Save it with the exact filename for that type (all lowercase, `.mp4` / H.264):

| Type | File | Type | File |
|------|------|------|------|
| normal   | `normal.mp4`   | psychic | `psychic.mp4` |
| fire     | `fire.mp4`     | bug     | `bug.mp4`     |
| water    | `water.mp4`    | rock    | `rock.mp4`    |
| electric | `electric.mp4` | ghost   | `ghost.mp4`   |
| grass    | `grass.mp4`    | dragon  | `dragon.mp4`  |
| ice      | `ice.mp4`      | dark    | `dark.mp4`    |
| fighting | `fighting.mp4` | steel   | `steel.mp4`   |
| poison   | `poison.mp4`   | fairy   | `fairy.mp4`   |
| ground   | `ground.mp4`   | flying  | `flying.mp4`  |

3. Hard refresh — that type now uses the video automatically.

## Tips
- Prefer a **black background** clip for the cleanest blend.
- Keep files small (compress to a few MB each) so the page loads fast.
- `.mp4` (H.264) plays in every modern browser.

## Licensing reminder
If a clip is from Vecteezy "Free" (or similar), you must credit the author per
their Free License (e.g. in the app's About/footer). Don't redistribute the raw file.

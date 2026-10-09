# The homepage glimpse: review stills (2026-10-09)

Mocked Supabase (`tests/e2e/mockSupabase.ts`), 24 starred essays, Chromium.

| file | build | what |
|---|---|---|
| `home-1440.png` | flag off (production today) | the row at rest, first column on the container's left edge, the fifth peeking |
| `home-1440-scrolled.png` | flag off | after one press of the forward button |
| `home-390.png` | flag off | the phone: one column and a peek |
| `home-390-scrolled.png` | flag off | after a swipe |
| `world-1440.png` | `VITE_WORLD_KAWASAN=true` | the whole page: the world in the map's slot, the glimpse under it |
| `world-390.png` | `VITE_WORLD_KAWASAN=true` | the whole page on a phone, the world not yet started by hand |

The four `home-*` stills are written by `tests/e2e/glimpse.spec.ts` (`GLIMPSE_SHOTS=<dir>`); the two
`world-*` stills are full-page captures of the same spec's data on the `dist-world` build.

# Lighthouse A/B, flag on, mobile

`node scripts/world/lighthouse.mjs --off http://127.0.0.1:4182 --on http://127.0.0.1:4184 --runs 5 --only off-mobile,on-mobile`

The script names its two pages `off` and `on`; here both have the world flag on: **`off` is v1** (`main` at `edc944a`)
and **`on` is v2** (phase D's head). Five rounds, each measuring both once, so the machine's drift falls on both alike.
See `docs/world/report-v2.md` §4.

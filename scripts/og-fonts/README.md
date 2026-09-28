# Share-card fonts

Plus Jakarta Sans, the site's own sans, as **static TrueType** files for
`scripts/lib/shareCard.mjs`. The card renderer (satori) reads TTF, OTF and WOFF.
It cannot read the WOFF2 files in `public/fonts/`. It also cannot read a
variable font: the only Plus Jakarta Sans TTF in `google/fonts` is the variable
`PlusJakartaSans[wght].ttf`, and satori 0.33.5's font parser throws on its
`fvar` table (`TypeError … parseFvarAxis`).

| File | sha256 |
|---|---|
| `PlusJakartaSans-Bold.ttf` (700: title, footer) | `5f5342ef76862b5b5365d1dff1a667629dfa484e388dd602552f647219c3870f` |
| `PlusJakartaSans-SemiBold.ttf` (600: label) | `65dbcedb6596a41c30869729eb31cb57d1f5edfe365684314bba8a1994eaa4cb` |
| `OFL.txt` (SIL Open Font License 1.1) | `995c7199cab65954f545996326755daee7b63cc6b42b06c13da1f9502ab08a99` |

**Source:** `https://github.com/tokotype/PlusJakartaSans` at commit
`18d1cd2f7ea10481919d2f05c1f7064b7307fc26`, the files `fonts/ttf/<name>.ttf` and
`OFL.txt`, unmodified. That repository and commit are the ones
`google/fonts/ofl/plusjakartasans/METADATA.pb` (at `google/fonts`
`23e54b51ddffbc7713c583748e3bd86f62b1fa4a`) names as the source of the fonts it
ships. The variable TTF and `OFL.txt` at that commit are byte-identical to the
copies in `google/fonts` (variable TTF sha256
`89b3fb38aa0d275d7a731d0d817a4f1622b316b4d7fbdedcf02ee9099ff68bc8`), so these are
the same release (v2.071) in static form.

`tests/unit/shareCard.test.ts` pins all three hashes. Replacing a file is a
deliberate change: update the table, the test, and the review set in
`docs/review/share-cards/` together.

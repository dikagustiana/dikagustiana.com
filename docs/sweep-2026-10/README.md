# Site sweep Oktober 2026

Sepuluh temuan tinjauan Dika (10 Oktober 2026), dikerjakan per fase, satu branch dan satu draft PR per fase.
Spesifikasi lengkap: `PRD-PLAN-PROMPT-site-sweep.md` (lampiran sesi; Bagian 1 PRD, Bagian 2 Plan, Bagian 3
Prompt). Keputusan Dika: [`DECISIONS.md`](DECISIONS.md). Teks yang ditulis Dika untuk situs: [`copy/`](copy/).
Laporan per fase: `report-<fase>.md`. Screenshot: `screenshots/<fase>/`. Laporan akhir: [`report-final.md`](report-final.md). Catatan saat sesi
dijeda (sudah dilanjutkan): [`HANDOFF.md`](HANDOFF.md).

Referensi: `main` @ `0487609` (merge PR #58 `world-v2/e-quality`, 10 Okt 2026).

## Fase

Kolom **Status** diperbarui di setiap PR fase. Nilai: `belum mulai`, `dikerjakan`, `draft PR`, `menunggu Dika`,
`merged`, `diblokir`.

| Fase | Isi | Branch | Bergantung pada | Ukuran | Gate Dika | Status |
|---|---|---|---|---|---|---|
| 0 | Bootstrap: `docs/sweep-2026-10/` (DECISIONS.md dari §1.3, README fase), cek HEAD, cek DB, cek `fsre_published` exposure | `sweep/0-bootstrap` | — | kecil | tidak (laporan saja) | merged (#59) |
| A | R7 nav dropdown | `sweep/a-nav` | — | kecil | merge | merged (#60) |
| B | R1 FSLI | `sweep/b-fsli` | D1, D2 | sedang | migrasi D2(a), merge | merged (#62) |
| C | R2 Glimpse + R8 About | `sweep/c-home` | D3, D4, D5 | sedang | merge | merged (#63) |
| D | R6 Capital in Motion | `sweep/d-capital` | D6, D7 | kecil | migrasi D6(a), merge | merged (#61) |
| E | R4 Workbook viewer | `sweep/e-workbook` | D8–D11, D15–D17, file xlsx + html | besar | merge | merged (#65) |
| F | R5 Section 06 | `sweep/f-fia` | D12, DB exposure | sedang | migrasi, env Vercel, approve PTBA di 4F, merge | merged (#64) |
| W1 | R10.1 izin + rule 10, R10.2 fidelity audit, R10.3 layout audit (tanpa mengubah world) | `world-v3/a-audit` | D14, FY lokal | sedang | NOTICE, setujui daftar audit | diblokir (D14 kosong) |
| W2 | R9 kendaraan | `world-v3/b-vehicles` | W1 | besar | merge | diblokir (W1) |
| W3 | R10.4–R10.6 detail dan layout | `world-v3/c-fidelity` | W1, W2 | sangat besar | side-by-side akhir | diblokir (W1, W2) |
| W4 | R3 flag on | `world-v3/d-launch` (docs + DECISIONS saja) | W3, D13 | kecil | env Vercel | diblokir (W3) |

Semua PR fase 0–F merged 10 Okt 2026 (`main` @ `776803a`). Perbaikan atas temuan review Codex pada #60, #62, #63
dan #65 ada di satu PR susulan dari branch `claude/opus-site-sweep-d68k41`. Langkah yang masih menunggu Dika ada di
[`report-final.md`](report-final.md) §2.

A, B, C, D, E saling bebas dan boleh dikerjakan paralel di branch terpisah dari `main`; C harus di-rebase setelah B
kalau keduanya menyentuh `Index.tsx` (B tidak). F bergantung pada langkah DB yang dikerjakan Dika; kode F
dikerjakan lebih dulu lalu menunggu. W1–W4 berurutan, mulai setelah A–D merge supaya `Index.tsx` stabil (W4
menyentuh Home lewat flag).

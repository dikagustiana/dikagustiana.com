# Keputusan Dika — site sweep Oktober 2026

Disalin apa adanya dari `PRD-PLAN-PROMPT-site-sweep.md` §1.3 (lampiran sesi, 10 Oktober 2026) pada fase 0
(`sweep/0-bootstrap`). File ini adalah sumber keputusan untuk seluruh sweep: setiap fase membaca keputusan
dari sini, bukan dari obrolan. Perubahan keputusan ditulis Dika di file ini lewat PR, dengan tanggal.

---

Status: **diisi 10 Oktober 2026** (Dika menyerahkan pengisian; default dipilih kecuali disebut lain). Opus menyalin tabel ini apa adanya ke `docs/sweep-2026-10/DECISIONS.md` di fase 0. Dua baris bertanda **BELUM** (D7 teks premise, D14 bukti izin) tidak bisa diisi oleh siapa pun selain Dika; perlakuannya ditulis di kolom Keputusan.

| ID | Pertanyaan | Keputusan | Alasan singkat |
|---|---|---|---|
| D1 | FSLI: kerangka sepuluh subbagian kosong | **(a)** hapus kerangka dan tabel-bacaannya; essay menjadi satu-satunya isi; TOC dari heading essay | `fsli_sections` berisi 0 baris konten; tidak ada rencana mengisinya. Kerangka yang tetap ada hanya menunggu diisi oleh teks generik |
| D2 | FSLI: 11 halaman yang tercakup essay lain | **(a)** kolom `fsli_pages.covered_by_slug` + kalimat "Covered in …" | Pembaca yang membuka `restricted-cash-non-current` harus tahu ke mana harus pergi, bukan melihat halaman kosong |
| D3 | Glimpse: aturan pengisian | **(a)** semua essay terbit; yang dibintangi tampil dulu urut `selected_rank`, sisanya `created_at desc`; batas 30 | 21 terbit, 3 dibintangi. Urutan tetap milik Dika lewat Admin; essay baru otomatis masuk tanpa harus dibintangi |
| D4 | About: "The argument" dan "Changed my mind" | **(a)** pindah ke Home di bawah Glimpse, copy tidak diubah | Ini argumen inti situs; `#the-argument` dan `#changed-my-mind` dirujuk dari essay dan tes |
| D5 | About: "On the shelf" | **(a)** dibuang | Daftar bacaan statis tanpa tautan ke isi situs |
| D6 | Capital in Motion: nama | **(a)** "Capital in Motion" di semua tempat (kartu `/finance` lewat migrasi, nav, breadcrumb, judul); URL `/finance/capital-allocation` tetap | Satu nama. Halaman sudah memakai nama ini sebagai h1 dan SEO; kartu dan nav yang menyimpang |
| D7 | Capital in Motion: teks premise | **BELUM — blok PREMISE dihapus.** Halaman menyisakan h1 "Capital in Motion" + subjudul "Twenty-one conditions I wish I understood earlier." lalu langsung daftar kondisi. Kalau Dika menulis teks baru nanti, taruh di `docs/sweep-2026-10/copy/capital-in-motion-premise.md` dan Opus memasangnya di fase D atau PR susulan | Tidak boleh ada yang menulis atas nama Dika. Subjudul yang ada sudah cukup sebagai pembuka |
| D8 | Working paper: 49 sel error | **(a)** tampilkan sebagai sel error dengan warna error, daftar di panel Method | Ini workbook dummy; errornya bagian dari "memeriksa Excel". Memperbaiki di sumber adalah pekerjaan Dika di luar sweep |
| D9 | Working paper: sheet hidden dan kosong | **(a)** `Adjustment Consolaa`, `Face Report`, `WP Consol` tidak ikut dipublikasikan | Tidak ada isi yang hilang bagi pembaca |
| D10 | Working paper: font merah (969) dan biru (30) | **(a)** merah = penyesuaian/perhatian reviewer, biru = input manual; viewer menjaga dua warna itu dan legenda menjelaskannya. Opus mencantumkan di build-report 10 contoh sel merah dan 10 biru supaya Dika bisa mengoreksi maknanya di PR review | Konvensi umum working paper audit; mudah dibalik kalau salah |
| D11 | Working paper: tombol Download .xlsx | **(a)** ada, mengunduh `pt-dummy-psak-338-working-paper.xlsx` | Data dummy; pengunjung yang serius ingin membuka di Excel |
| D12 | Section 06: kapan `VITE_FIA_LIVE=true` di production | **(a)** sekarang, di fase F; halaman live menampilkan slate "Planned; no model yet" sampai paket pertama di-approve | Section 06 harus ada di situs sekarang. Slate tanpa angka lebih jujur daripada halaman legacy "0 of 0 models". `assert-no-synthetic` menjamin tidak ada fixture di production |
| D13 | World: urutan penyalaan flag production | **(a)** flag dinyalakan hanya setelah W1–W4 selesai dan Dika menyetujui side-by-side | Versi v2 adalah yang Dika tolak (truk ramai, detail kurang). Menyalakan v2 berarti mempublikasikan versi yang sudah dinyatakan belum layak |
| D14 | World: bukti izin Factory Yard | **BELUM — wajib diisi Dika sebelum fase W.** Format: tanggal · kanal · kutipan verbatim · cakupan (publik / modifikasi / atribusi). Sampai terisi, Opus mengerjakan fase 0, A–F, dan hanya bagian W1 yang tidak menyentuh kode Factory Yard (audit side-by-side boleh dijalankan dari clone lokal FY, karena hanya membaca) | Izin tertulis adalah satu-satunya dasar hukum; Factory Yard tidak punya LICENSE |

Dua pertanyaan lama yang ikut ditutup di sweep ini:
- **O-V2-1 … O-V2-11** (`docs/world/report-v2.md` §8): O-V2-5 (timbang hanya laden), O-V2-6 (hold 10 %), O-V2-7 (van ≥ 18 px), O-V2-11 (Follow time-lapse tetap) diputuskan oleh R9.7. Sisanya **pakai default yang diusulkan laporan v2**, dengan satu catatan: O-V2-9 (tujuh family yang tidak dipakai blok mana pun) → **retire** di W3, karena W3 menaikkan detail per family dan family tak terpakai hanya menambah beban.
- **`docs/world/review-registry.md`** (130 penempatan, 0 dikonfirmasi): **tetap "proposed" sampai W1 selesai.** Layout audit W1 adalah momen reviewnya; setelah Dika menyetujui daftar audit, Opus menandai `placedBy = owner` untuk semua penempatan yang tidak diubah audit, dan `proposed` untuk yang diubah sampai W3 selesai. Ini lebih jujur daripada konfirmasi massal sebelum ada yang melihat.

## Keputusan tambahan — 10 Oktober 2026 (fase E)

Diambil Dika di sesi sweep setelah langkah E1 melaporkan isi file sumber. Kata-kata Dika, apa adanya:
"kosongkan DATA block PTBA, sisanya lanjut aja. company namesnya hapus. metadatanya ilangin".

| ID | Pertanyaan | Keputusan | Pelaksanaan |
|---|---|---|---|
| D15 | Workbook: nama perusahaan nyata (bukan "Dummy") di sel teks | **Dihapus** | Sel ditunjuk lewat alamat, bukan lewat namanya, sehingga nama itu tidak pernah tertulis di repo: 26 sel dikosongkan nilainya (format tetap), 5 label dipotong bagian namanya (mis. "Account Receivable - …" → "Account Receivable"). Tidak ada angka, formula, atau nilai cache yang berubah. Kode tiga huruf (STL, PSD, KLI, SLL, SLB, ALI) dibiarkan karena bukan nama; Dika bisa minta dihapus juga. |
| D16 | Workbook: metadata file yang ikut terunduh (D11) | **Dihilangkan** | Nama penulis di properti dokumen, path OneDrive dan revision pointer, semua komentar sel dan komentar berutas beserta daftar penulisnya, dan 73.336 defined name warisan (sebagian memuat path file orang lain). Empat print range milik sheet sendiri dipertahankan. |
| D17 | Referensi visual `Company_models__PTBA.html` | **Di-commit dengan DATA block dikosongkan** | Semua angka laporan (`rep`) dan register sumber (`docs`) dikosongkan; kunci struktur tanpa angka (identitas, satuan, periode, label kelas aset dan komponen biaya) dipertahankan supaya referensi tetap tampil (semua input OPEN). Contoh angka di legenda, yang berasal dari laporan PTBA, diganti `1.234`. |

File asli workbook (sebelum D15–D16) tetap di tangan Dika dan tidak masuk repo atau riwayat git yang di-push.

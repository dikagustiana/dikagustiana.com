# Foundations of Knowing — PRD, Plan & Prompt

Oct 25, 2026 · @Dika Gustiana Irawan

## Ringkasan

Section Critical Thinking diganti nama jadi **Foundations of Knowing**, naik ke nav utama, dan diisi kerangka 56 esai dalam 10 part (Part 0–9) sebagai stub draft. Posisinya tepat di sebelah Home. Development Finance ikut dilebur ke The Next Big Thing sebagai satu tema. Tidak ada esai yang ditulis di pekerjaan ini.

Kondisi database per 25 Oktober 2026: section `critical-thinking` sudah ada di tabel `sections` (sort\_order 8), tapi **belum ada satu pun esai**. Jadi ganti URL hampir tanpa risiko link rusak. Development Finance juga belum punya esai. The Next Big Thing punya 5 esai terbit di tema economy, growth, dan technology.

**Keputusan default (konfirmasi atau ganti sebelum prompt dijalankan)**

| Keputusan | Default | Alasan |
| --- | --- | --- |
| Posisi di nav | Tepat di sebelah kanan Home (item kedua) | Sudah diputuskan |
| Slug database | Tetap `critical-thinking` | Pipeline agent (critical-thinking-researcher, checker) memakai slug ini; ganti nama tampilan saja |
| URL publik | `/foundations-of-knowing`, redirect 301 dari `/critical-thinking-research/*` | Belum ada esai, jadi murah sekarang |
| Istilah internal | 10 bagian disebut **Part 0–9**, disimpan di kolom `phase` | Menghindari tabrakan dengan "section" di level situs |
| Development Finance | Jadi tema `development-finance` di The Next Big Thing; nav, halaman, dan kartu homepage lama dihapus; `/development-finance/*` redirect 301 | Sudah diputuskan; belum ada esai, jadi tidak ada yang hilang |
| Dropdown Masyarakat Baru | Dipertahankan (Books + IELTS) | Perubahan paling kecil; nasibnya diputuskan terpisah |
| Manifesto | Ditulis ulang olehmu | Manifesto lama ("pattern recognition applied to claims") tidak lagi mencerminkan isi |
| Empat fase lama sebagai tag | Ditunda ke v2 | Butuh kolom baru; tidak menghalangi v1 |

## PRD

**Tujuan.** Pembaca situs finance bisa menemukan dan menelusuri section epistemik yang menjelaskan kenapa fondasi berpikir datang sebelum disiplin teknis. Penulis bisa mengisi 56 esai satu per satu tanpa mengubah struktur lagi.

**Pengguna**

- *Pembaca:* profesional finance senior dan panel beasiswa. Mereka melihat peta 10 part, termasuk esai yang belum terbit sebagai penanda progres.
- *Penulis (kamu):* membuat dan mengedit esai lewat admin editor, memilih part dari dropdown, bukan mengetik bebas.

**Kebutuhan fungsional**

1. **Nama dan identitas.** Nama tampilan section jadi "Foundations of Knowing" di nav, halaman section, breadcrumb, judul halaman (tag title dan meta), dan admin. Manifesto diganti teks baru darimu.
2. **Navigasi.** Section keluar dari dropdown Masyarakat Baru dan jadi item nav utama, tepat di sebelah kanan Home (item kedua), di desktop maupun menu ponsel.
3. **Routing.**
   - `/foundations-of-knowing` → halaman section (peta 10 part)
   - `/foundations-of-knowing/:part` → halaman part (daftar esai berurutan)
   - `/foundations-of-knowing/:part/:slug` → halaman esai
   - `/critical-thinking-research/*` → redirect 301 ke path baru yang setara
4. **Struktur part.** Sepuluh nilai `phase` tetap, dengan label tampilan dan urutan:

| Part | Nilai phase | Label tampilan | Jumlah esai |
| --- | --- | --- | --- |
| 0 | before-we-go-far | Before We Go Far | 2 |
| 1 | knowing | Knowing | 6 |
| 2 | logic | Logic | 5 |
| 3 | argument | Argument | 6 |
| 4 | evidence-and-sources | Evidence & Sources | 7 |
| 5 | how-science-corrects-itself | How Science Corrects Itself | 5 |
| 6 | dialectics-and-change | Dialectics & Change | 7 |
| 7 | uncertainty | Uncertainty | 6 |
| 8 | judgment-under-pressure | Judgment Under Pressure | 6 |
| 9 | strategic-finance | Strategic Finance as Applied Judgment | 6 |

5. **Seed stub.** 56 baris di tabel `essays`: `section='critical-thinking'`, `phase` sesuai part, `slug` dan `title` dari daftar seed, `status='draft'`, `published=false`, `content` kosong, `sort_order` = part × 100 + nomor urut (contoh: Part 4 esai 2 = 402). Pola ini sama dengan 144 stub Finance yang sudah ada.
6. **Tampilan stub.** Esai draft muncul di halaman section dan part sebagai penanda progres, tanpa link ke isi, mengikuti perilaku stub Finance.
7. **Admin editor.** Saat section = critical-thinking, field Phase berubah jadi dropdown 10 part dengan label. Section lain tidak berubah.
8. **URL preview admin.** `getPublicUrl` untuk critical-thinking menghasilkan path baru.

9) **Development Finance → The Next Big Thing.** Item nav, halaman, dan kartu homepage Development Finance dihapus. The Next Big Thing mendapat tema baru `development-finance` (label "Development Finance") di samping tema yang ada; deskripsi section lama (sovereign funds, multilateral lenders, blended finance) dipakai sebagai deskripsi tema. `/development-finance/*` redirect 301 ke `/the-next-big-thing?theme=development-finance`. Di admin, tema ini muncul di dropdown phase untuk next-big-thing, dan opsi section development-finance dihapus. Lima esai TNBT yang sudah terbit tidak disentuh.

**Di luar cakupan v1**

- Menulis isi esai
- Tag lintas-part (Clarify/Analyze/Construct/Apply). Ditunda ke v2 karena butuh kolom baru.
- Perubahan pada dropdown Masyarakat Baru selain mengeluarkan CT
- Library buku, Verification Register, dan pipeline agent
- Redesign visual. Pakai template halaman section yang sudah ada.

**Kriteria selesai**

- [ ] Nav utama menampilkan Foundations of Knowing tepat di sebelah Home; Masyarakat Baru tinggal Books dan IELTS; Development Finance tidak lagi muncul
- [ ] Ketiga route baru tampil benar; route lama redirect 301
- [ ] Tepat 56 stub di database, 10 nilai phase, sort\_order unik dan berurutan
- [ ] Halaman section menampilkan 10 part dengan jumlah esai yang cocok dengan tabel di atas
- [ ] Dropdown part di admin bekerja; menyimpan esai uji lalu menghapusnya lagi tanpa efek samping
- [ ] Build lolos, tidak ada error console, tampilan aman di lebar ponsel
- [ ] Tidak ada perubahan pada section lain (cek halaman Finance, Accounting, Green Transition)

* [ ] `/development-finance` redirect ke tema Development Finance di The Next Big Thing; tema tampil di filter; 5 esai TNBT yang sudah terbit tetap di tema masing-masing

## Plan

Empat fase berurutan. Setiap fase berhenti di gerbang persetujuanmu sebelum lanjut, jadi Claude Code tidak mengubah apa pun tanpa izin.

1. **Audit (hanya baca).** Petakan semua tempat yang mereferensikan `critical-thinking`, `/critical-thinking-research`, "Critical Thinking", dan "Masyarakat Baru": komponen nav, routes, halaman CriticalThinking\*, AdminContentEditor, getPublicUrl, kartu homepage, SEO/meta, sitemap, konfigurasi redirect Vercel, dan agent atau skrip yang memakai slug ini. Petakan juga semua referensi Development Finance (halaman, route, nav, kartu homepage, opsi admin) dan cara kerja sistem tema The Next Big Thing. Pelajari juga cara halaman Finance menampilkan stub draft.
   - *Gerbang 1:* daftar file yang akan berubah (File | Perubahan | Risiko), posisi nav yang diusulkan, dan cara redirect. Kamu setujui atau koreksi.
2. **Kode (di branch baru).** Ganti nama tampilan, pindahkan ke nav utama, buat route baru dan redirect, konstanta 10 part dengan label dan urutan, dropdown part di admin, perbaikan getPublicUrl, tampilan stub draft, serta peleburan Development Finance ke The Next Big Thing.
   - *Gerbang 2:* diff ringkas plus screenshot halaman section dan part di desktop dan ponsel.
3. **Data.** Update nama dan manifesto di tabel `sections`, lalu insert 56 stub. Sebelum dijalankan, tampilkan SQL lengkap dan hasil cek bahwa belum ada esai CT (jumlah harus 0).
   - *Gerbang 3:* kamu setujui SQL-nya, baru dieksekusi. Setelah itu verifikasi: 56 baris, 10 phase, jumlah per part cocok.
4. **Verifikasi dan PR.** Jalankan build, cek semua kriteria selesai di PRD satu per satu, buka PR. Merge dilakukan olehmu.
   - *Gerbang 4:* laporan kriteria selesai, mana yang lolos dan mana yang belum.

**Risiko yang perlu diawasi**

- Agent pipeline (critical-thinking-researcher, checker) memakai nilai phase lama. Aman selama slug section tidak berubah, tapi validasi phase di checker perlu diperbarui ke 10 nilai baru.
- Kalau redirect ditaruh di `vercel.json`, pastikan tidak bentrok dengan rule SPA rewrite yang sudah ada.
- Domain sedang dipertimbangkan pindah ke Cloudflare. Redirect di level aplikasi lebih aman daripada di level DNS.

## Prompt Claude Code

Isi baris MANIFESTO dulu, lalu tempel apa adanya di terminal, di folder repo dikagustiana.com. Kalau ada default di Ringkasan yang kamu ubah, ubah juga baris KEPUTUSAN.

```
KONTEKS
Section "Critical Thinking" di dikagustiana.com diganti nama jadi "Foundations of Knowing",
naik ke nav utama tepat di sebelah Home, dan diisi 56 stub esai dalam 10 part (Part 0-9).
Sekaligus, section Development Finance dilebur ke The Next Big Thing sebagai satu tema.
Baca dulu README, SESSION_LOG, dan CLAUDE.md kalau ada.
Supabase project: dikagustiana-com (asypkbkiebjvvpimewfp).
Per 25 Okt 2026: section 'critical-thinking' ada di tabel sections (sort_order 8) dengan 0 esai.
Development Finance punya 0 esai. The Next Big Thing punya 5 esai published
(tema economy, growth, technology).

KEPUTUSAN (sudah final)
- Posisi nav: Foundations of Knowing tepat di sebelah kanan Home (item kedua),
  di desktop dan menu ponsel.
- Slug database TETAP 'critical-thinking'. Yang berubah hanya nama tampilan.
- URL baru: /foundations-of-knowing, /foundations-of-knowing/:part, /foundations-of-knowing/:part/:slug
- /critical-thinking-research/* redirect 301 ke path baru yang setara.
- 10 bagian disebut "Part", disimpan di kolom essays.phase.
- Development Finance: item nav, halaman, dan kartu homepage dihapus. The Next Big Thing
  mendapat tema baru 'development-finance' (label "Development Finance").
  Deskripsi section lama dipakai sebagai deskripsi tema.
  /development-finance/* redirect 301 ke /the-next-big-thing?theme=development-finance.
- Dropdown Masyarakat Baru dipertahankan, isinya tinggal Books dan IELTS.
- Tag lintas-part (clarify/analyze/construct/apply) TIDAK dikerjakan sekarang.
- MANIFESTO baru: "[ISI SENDIRI]"

ATURAN KERAS
- Kerja di branch baru: feat/foundations-of-knowing. JANGAN push ke main, JANGAN merge.
- JANGAN menulis isi esai apa pun.
- JANGAN menulis ke database sebelum Gerbang 3 aku setujui.
- JANGAN mengubah 5 esai The Next Big Thing yang sudah published.
- Hapus file HANYA untuk halaman/komponen Development Finance, dan hanya yang sudah
  aku setujui di Gerbang 1. Selain itu JANGAN hapus file, baris database, atau konten lain.
- Setiap fase berakhir di GERBANG: tampilkan hasil, lalu BERHENTI dan tunggu persetujuanku.
- Kalau MANIFESTO masih "[ISI SENDIRI]" saat Fase 3, berhenti dan tanya.

FASE 1 - AUDIT (hanya baca)
a. Petakan semua referensi ke: 'critical-thinking', '/critical-thinking-research',
   "Critical Thinking", "Masyarakat Baru". Minimal cek: komponen nav/dropdown (desktop
   dan ponsel), routes, CriticalThinkingResearch / CriticalThinkingPhase /
   CriticalThinkingEssay, AdminContentEditor (field Phase), getPublicUrl di AdminContent,
   kartu homepage, title/meta SEO, sitemap, vercel.json (rewrite/redirect), dan
   agent/skrip yang memakai slug atau nilai phase (termasuk validasi phase di checker).
b. Petakan semua referensi Development Finance: halaman (DevelopmentFinance*),
   hook query, route, item nav, kartu homepage, opsi section/phase di admin.
c. Pelajari sistem tema The Next Big Thing: di mana daftar tema didefinisikan,
   bagaimana filter ?theme= bekerja, dan bagaimana admin memilih phase untuk section ini.
d. Pelajari bagaimana halaman Finance menampilkan stub draft (status draft, published=false).
GERBANG 1: tabel File | Perubahan | Risiko (tandai file yang akan DIHAPUS),
urutan nav baru (desktop dan ponsel), dan cara redirect yang dipilih
(aplikasi vs vercel.json) beserta alasannya. BERHENTI.

FASE 2 - KODE
Foundations of Knowing:
- Nama tampilan "Foundations of Knowing" di nav, halaman, breadcrumb, title/meta, admin.
- Pindahkan dari dropdown Masyarakat Baru ke nav utama, tepat di sebelah kanan Home.
- Route baru + redirect 301 dari route lama.
- Satu konstanta untuk 10 part (nilai phase, label, nomor, urutan) - dipakai di semua tempat.
- Halaman section: peta 10 part dengan jumlah esai per part.
- Halaman part: daftar esai urut sort_order; stub draft tampil sebagai penanda progres
  tanpa link, mengikuti perilaku stub Finance.
- Admin editor: jika section = critical-thinking, field Phase jadi dropdown 10 part.
- getPublicUrl: critical-thinking -> /foundations-of-knowing/{phase}/{slug}
- Perbarui validasi phase di checker/agent ke 10 nilai baru.
Development Finance -> The Next Big Thing:
- Tambah tema 'development-finance' (label "Development Finance") ke daftar tema TNBT,
  dengan deskripsi dari section lama.
- Tambah tema itu ke dropdown phase admin untuk next-big-thing; hapus opsi section
  development-finance dari admin.
- Hapus item nav, kartu homepage, route, dan halaman Development Finance yang disetujui
  di Gerbang 1.
- Redirect 301 /development-finance/* -> /the-next-big-thing?theme=development-finance.
GERBANG 2: diff ringkas + screenshot: nav (desktop dan ponsel), halaman section
Foundations of Knowing, satu halaman part, dan The Next Big Thing dengan filter
Development Finance. BERHENTI.

FASE 3 - DATA
a. Cek ulang: jumlah esai section='critical-thinking' harus 0. Kalau tidak 0, BERHENTI.
b. Cek tabrakan: tidak boleh ada slug di tabel essays yang sama dengan slug seed.
c. Siapkan SQL:
   - UPDATE sections SET name='Foundations of Knowing', manifesto=<MANIFESTO>
     WHERE slug='critical-thinking'
   - INSERT 56 baris essays: section='critical-thinking', phase, slug, title,
     sort_order dari SEED; status='draft', published=false, content NULL,
     voice_role ikut nilai section ini.
   - Kalau tabel sections punya baris development-finance, JANGAN hapus; laporkan saja.
GERBANG 3: tampilkan SQL lengkap + hasil cek a dan b. BERHENTI.
Setelah aku setujui: eksekusi, lalu verifikasi 56 baris, 10 phase,
jumlah per part = 2/6/5/6/7/5/7/6/6/6, sort_order unik.

FASE 4 - VERIFIKASI DAN PR
- Build harus lolos, tidak ada error console.
- Cek satu per satu:
  1. Nav utama: Foundations of Knowing tepat di sebelah Home (desktop dan ponsel);
     Masyarakat Baru tinggal Books dan IELTS; Development Finance tidak lagi muncul
  2. Ketiga route baru tampil benar; route lama redirect 301
  3. 56 stub, 10 phase, sort_order unik dan berurutan
  4. Halaman section menampilkan 10 part dengan jumlah esai yang benar
  5. Dropdown part di admin bekerja (simpan esai uji, lalu hapus esai uji itu saja)
  6. /development-finance redirect ke tema Development Finance di The Next Big Thing;
     tema tampil di filter; 5 esai TNBT tetap di tema masing-masing
  7. Tampilan aman di lebar ponsel
  8. Halaman Finance, Accounting, Green Transition tidak berubah
- Buka PR dari feat/foundations-of-knowing. JANGAN merge.
GERBANG 4: laporan delapan kriteria (LOLOS / BELUM + bukti). BERHENTI.

SEED (sort_order | phase | slug | title)
1 | before-we-go-far | why-a-finance-site-needs-epistemology | Why a Finance Site Needs Epistemology
2 | before-we-go-far | sequence-matters | Sequence Matters: Foundations Before Disciplines
101 | knowing | what-does-it-mean-to-know-something | What Does It Mean to Know Something?
102 | knowing | descartes-doubt | Descartes' Doubt: Tearing Down to Rebuild
103 | knowing | hume-and-the-problem-of-induction | Hume and the Problem of Induction
104 | knowing | how-to-make-our-ideas-clear | How to Make Our Ideas Clear
105 | knowing | map-and-territory | Map and Territory: Models as Representations
106 | knowing | logika-mistika | Logika Mistika: When Explanation Escapes Evidence
201 | logic | validity-is-not-truth | Validity Is Not Truth
202 | logic | grammar-of-formal-logic | If-Then, All, Some: The Grammar of Formal Logic
203 | logic | necessary-and-sufficient-conditions | Necessary and Sufficient Conditions
204 | logic | induction-and-abduction | Induction and Abduction
205 | logic | fallacies | Fallacies, Formal and Informal
301 | argument | anatomy-of-an-argument | Anatomy of an Argument
302 | argument | the-premise-you-didnt-say | The Premise You Didn't Say
303 | argument | steelmanning | Steelmanning
304 | argument | when-analogies-mislead | When Analogies Mislead
305 | argument | what-would-change-your-mind | What Would Change Your Mind
306 | argument | writing-an-argument-that-survives-review | Writing an Argument That Survives Review
401 | evidence-and-sources | who-produced-this-and-why | Who Produced This, and Why?
402 | evidence-and-sources | power-and-knowledge | Power and Knowledge
403 | evidence-and-sources | primary-secondary-generated | Primary, Secondary, Generated
404 | evidence-and-sources | correlation-causation-confounding | Correlation, Causation, Confounding
405 | evidence-and-sources | base-rates-survivorship-selection | Base Rates, Survivorship, Selection
406 | evidence-and-sources | detecting-deception | Detecting Deception
407 | evidence-and-sources | building-a-verification-register | Building a Verification Register
501 | how-science-corrects-itself | method-as-an-invention | Method as an Invention: The Scientific Revolution
502 | how-science-corrects-itself | popper-falsifiability | Popper: Falsifiability
503 | how-science-corrects-itself | kuhn-and-lakatos | Kuhn and Lakatos: Paradigms and Research Programmes
504 | how-science-corrects-itself | replication-crisis | The Replication Crisis and the Limits of Peer Review
505 | how-science-corrects-itself | is-economics-a-science | Is Economics a Science?
601 | dialectics-and-change | hegel-and-the-myth-of-the-triad | Hegel and the Myth of the Triad
602 | dialectics-and-change | marx-historical-materialism | Marx: Historical Materialism
603 | dialectics-and-change | contradiction-as-the-engine-of-change | Contradiction as the Engine of Change
604 | dialectics-and-change | madilog | Madilog: Tan Malaka's Synthesis
605 | dialectics-and-change | institutions-are-historical-products | Institutions Are Historical Products
606 | dialectics-and-change | path-dependence | Path Dependence
607 | dialectics-and-change | holding-two-opposing-frameworks | Holding Two Opposing Frameworks
701 | uncertainty | risk-vs-uncertainty | Risk vs Uncertainty
702 | uncertainty | probability-frequency-or-belief | Probability: Frequency or Belief?
703 | uncertainty | bayesian-updating | Bayesian Updating
704 | uncertainty | fat-tails | Fat Tails
705 | uncertainty | forecasting-and-calibration | Forecasting and Calibration
706 | uncertainty | expected-value-vs-survival | Expected Value vs Survival
801 | judgment-under-pressure | fast-thinking-and-its-biases | Fast Thinking and Its Biases
802 | judgment-under-pressure | the-premortem | The Premortem
803 | judgment-under-pressure | red-teams-and-devils-advocates | Red Teams and Devil's Advocates
804 | judgment-under-pressure | competing-hypotheses | Competing Hypotheses
805 | judgment-under-pressure | deciding-with-incomplete-information | Deciding With Incomplete Information
806 | judgment-under-pressure | signposts | Signposts: When to Change Course
901 | strategic-finance | numbers-are-claims | Numbers Are Claims
902 | strategic-finance | the-business-plan-as-a-falsifiable-hypothesis | The Business Plan as a Falsifiable Hypothesis
903 | strategic-finance | capital-allocation-under-uncertainty | Capital Allocation Under Uncertainty
904 | strategic-finance | variance-analysis-as-inquiry | Variance Analysis as Inquiry
905 | strategic-finance | who-produces-the-forecast | Who Produces the Forecast?
906 | strategic-finance | decisions-that-cannot-be-undone | Decisions That Cannot Be Undone
```

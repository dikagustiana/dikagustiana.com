# Transition Data Layer — PRD, Arsitektur & Rencana

Oct 24, 2026 · @Dika Gustiana Irawan

## Ringkasan

Yang dibangun: satu lapisan data transisi di dikagustiana.com. Lapisan ini menarik seri bersumber primer, menyimpannya dengan cap sumber dan vintage, lalu menyajikannya sebagai grafik di satu halaman tracker dan di dalam esai. Grafik disusun menurut tesis sequencing (kebijakan → infrastruktur → pembiayaan → transisi → harga karbon), bukan menurut sektor.

Keputusan kunci di dokumen ini:

- **Bentuk halaman.** Tracker menjadi halaman indeks grafik. Esai seri "current condition" menyematkan grafik dari situ. Ini aku ambil sebagai default karena pertanyaan terakhir belum kamu jawab. Kalau kamu memilih "hanya sumber grafik untuk esai", Fase 3 dipangkas dan sisanya tetap.
- **Satu seri, satu sumber.** Tidak ada penyambungan antarsumber dalam satu garis. Setiap observasi membawa sumber, kode seri, tanggal tarik, dan vintage.
- **Dua jalur masuk.** Seri ber-API ditarik otomatis. Seri tanpa API masuk lewat admin dengan sitasi wajib. Kedua jalur berakhir di gerbang publish yang sama.
- **Pola yang sudah terbukti dipakai ulang.** Publish lewat fungsi database yang menjalankan check, meniru `fs_publish_period()` dan `fs_check` di FSLI.
- **Register `tracker_entry` (14 baris) dipertahankan.** Isinya menjadi anotasi kebijakan yang menempel di grafik, bukan halaman sendiri.
- **Runtime penarik data.** GitHub Actions terjadwal dengan Python lebih dulu. Pindah ke VPS hermesagent nanti, sejalan dengan rencana FSRE.
- **FSRE memakai lapisan yang sama** untuk asumsi makro (WEO, harga batu bara, kurs). Ini masuk Fase 4, setelah tracker publik berjalan.

## PRD

### Masalah

Halaman Green Transition Tracker sekarang terbaca seperti AI slop. Isinya temuan kualitatif per sektor per kuartal tanpa angka yang bisa dilacak ke sumber. Seri esai "current condition" butuh lampiran berangka, tapi belum ada tempat menyimpan angka itu. Akibatnya angka diketik ulang di tiap esai dan tidak bisa diaudit. Lapisan makro dalam arsitektur situs (ekonomi membaca situasi dari makro) juga belum punya data sama sekali.

### Tujuan

1. Setiap angka di halaman transisi bisa dilacak ke sumber primer, kode seri, dan tanggal tarik dalam satu klik.
2. Pembaca bisa melihat mata rantai sequencing mana yang sedang macet dari satu halaman.
3. Esai menyematkan grafik hidup, sehingga angka yang sama tidak diketik dua kali.
4. Data yang sama dipakai ulang oleh FSRE dan working paper tanpa ditarik ulang.

### Bukan tujuan

- Bukan dashboard energi umum. Ember dan Our World in Data sudah melakukannya lebih lengkap.
- Tidak ada data internal SAMB, BMG, atau KGR. Data internal hanya untuk sanity check pribadi.
- Tidak ada proyeksi buatan sendiri di tracker publik. Proyeksi yang tampil hanya milik lembaga (misalnya WEO).
- Tidak membangun ulang tema atau admin situs. Admin hanya ditambah layar entri data.

### Pengguna

| Pengguna | Butuh apa | Di mana |
| --- | --- | --- |
| Pembaca senior finance dan policy (BKF, BAPPENAS, panel beasiswa) | Melihat di mata rantai mana transisi macet, dengan sumber yang bisa dicek | Halaman tracker, esai |
| Dika sebagai penulis | Menyematkan grafik di esai tanpa menyalin angka | Editor TipTap |
| Dika sebagai admin | Memasukkan seri manual dengan sitasi, menyetujui hasil tarik otomatis | Admin |
| Pipeline FSRE | Satu set asumsi makro berversi untuk forecast sampai 2031 | Supabase, baca saja |

### Kebutuhan fungsional

1. **Registri seri.** Setiap seri punya sumber, kode asli, satuan, frekuensi, mata rantai sequencing, dan jalur masuk (API atau manual).
2. **Penarikan otomatis.** Job terjadwal menarik seri ber-API, menulis ke staging, lalu menjalankan check.
3. **Entri manual.** Form admin untuk satu observasi atau tempel CSV, dengan URL sumber dan halaman/tabel wajib.
4. **Gerbang publish.** Seri hanya tampil publik setelah fungsi publish lulus semua check. Hasil check tersimpan per run.
5. **Vintage.** Revisi data tidak menimpa nilai lama. Proyeksi menyimpan edisi rilisnya.
6. **Definisi grafik.** Grafik adalah baris di database (seri apa, jenis grafik, judul temuan). Halaman dan esai membaca definisi yang sama.
7. **Embed di esai.** Node TipTap `chartEmbed` yang merujuk slug grafik.
8. **Anotasi kebijakan.** Baris `tracker_entry` yang terverifikasi bisa ditempel sebagai penanda di sumbu waktu grafik.
9. **Jejak sumber di UI.** Setiap grafik menampilkan sumber, kode seri, tanggal tarik, dan vintage di bawahnya, plus unduh CSV.

### Kebutuhan non-fungsional

- **Keterlacakan.** Memenuhi Verification Register: tidak ada nilai tanpa sumber, dan konten buatan AI bukan sumber.
- **Keamanan.** RLS di semua tabel baru. Anon hanya membaca seri yang sudah publish. Penulisan hanya lewat service role (job) atau admin.
- **Kegagalan yang terlihat.** Job yang gagal tidak menghapus data publik. Grafik menampilkan tanggal tarik terakhir supaya data basi kelihatan.
- **Biaya.** Nol untuk sumber data. Hanya pakai tier gratis yang ada.
- **Performa.** Halaman tracker memuat di bawah 2 detik di 4G. Grafik membaca view agregat, bukan seluruh observasi.

### Metrik sukses

| Metrik | Target |
| --- | --- |
| Seri publik dengan sumber, kode, dan tanggal tarik lengkap | 100% |
| Mata rantai sequencing yang punya minimal satu grafik | 5 dari 5 |
| Esai seri current condition yang menyematkan grafik, bukan angka ketik | Semua esai baru |
| Job terjadwal yang sukses dalam 30 hari | ≥ 95% |
| Selisih nilai tracker vs sumber pada uji sampel acak | 0 |

## Inventaris indikator

Dari 14 indikator kandidat, 8 bisa ditarik lewat API (satu di antaranya belum pasti) dan 6 harus masuk lewat entri manual atau unduhan sekali. Hampir separuh tracker manual, jadi jalur manual adalah fitur inti, bukan pengecualian. Kolom Status membedakan yang sudah aku cek di sumbernya dari yang masih ingatan.

| Mata rantai | Indikator | Sumber | Jalur | Frekuensi | Status |
| --- | --- | --- | --- | --- | --- |
| Kebijakan | Timeline regulasi kunci (RUPTL, target NZE, pajak karbon, JETP) | ESDM, Kemenkeu, register `tracker_entry` | Manual | Per peristiwa | Sumber jelas, tanpa API |
| Infrastruktur | Bauran pembangkitan per sumber (TWh) | Ember Yearly Electricity Data | API | Tahunan | Terverifikasi: API dan cakupan Indonesia ada |
| Infrastruktur | Kapasitas terpasang per sumber (GW) | Ember API, endpoint installed-capacity | API | Bulanan (tidak ada endpoint tahunan) | Terverifikasi dari OpenAPI Ember |
| Infrastruktur | Jumlah SPKLU | Rilis ESDM dan PLN | Manual | Tidak teratur | Tanpa API. Definisi berubah-ubah (unit vs lokasi, PLN saja vs semua operator) |
| Pembiayaan | Suku bunga kebijakan BI | IMF, seri `FPOLM_PA` (dataflow MFS\_IR) | API | Bulanan | FPOLM\_PA adalah kode IFS lama. Kode di dataflow MFS\_IR baru belum diketahui |
| Pembiayaan | Kurs IDR/USD rata-rata periode | IMF, seri `ENDA_XDC_USD_RATE` | API | Bulanan | Kode seri terlihat di katalog. Belum ditarik |
| Pembiayaan | Penerbitan green sukuk dan green bond | DJPPR, OJK | Manual | Per penerbitan | Belum diverifikasi |
| Pembiayaan | Cost of capital EBT | Dataset Steffen et al. (2025), Scientific Data | Unduhan sekali | Tahunan, sampai 2022 | Dari catatan riset. Belum dibuka |
| Pembiayaan | Data moneter rinci (kredit, DPK) | BI SEKI | Manual (Excel) | Bulanan | Terverifikasi: tidak ada API maupun unduhan massal |
| Transisi | Intensitas karbon grid (gCO2e/kWh) | Ember | API | Tahunan, bulanan bila tersedia | Terverifikasi untuk tahunan. Cakupan bulanan Indonesia belum dicek |
| Transisi | Emisi sektor listrik (MtCO2e) | Ember | API | Tahunan | Terverifikasi |
| Transisi | Porsi batu bara di pembangkitan (%) | Ember | API | Tahunan | Terverifikasi |
| Harga karbon | Volume dan nilai transaksi IDXCarbon | Rilis BEI dan IDXCarbon | Manual | Bulanan atau kuartalan | Tanpa API. Angka hanya dari rilis dan pemberitaan |
| Konteks makro | PDB, inflasi, proyeksi sampai 2031 | IMF WEO | API | Tahunan, 2 edisi per tahun | Terverifikasi: terbuka tanpa key, vintage bisa ditarik |

Catatan verifikasi:

- **IMF.** Portal pindah ke SDMX 3.0. IFS sudah dipensiunkan dan isinya dipecah ke banyak dataflow tematik. WEO terbuka tanpa key, tapi kueri wildcard negara di beberapa dataflow butuh key. Kode di atas terlihat di dokumentasi wrapper pihak ketiga ([readimf](https://cran.r-project.org/web/packages/readimf/readme/README.html)), jadi tetap harus diuji langsung ke `api.imf.org` di Fase 1.
- **Ember.** API REST resmi, key gratis lewat registrasi email. Datasetnya pembangkitan, emisi, permintaan, dan intensitas karbon, tahunan dan bulanan ([Ember API](https://ember-energy.org/data/api)). Data bulanan mencakup 88 negara. Indonesia termasuk atau tidak, belum aku cek.
- **BPS.** WebAPI butuh registrasi, persetujuan akses, dan ada batas bandwidth ([dokumen BPS](https://ppid.bps.go.id/upload/doc/LW12_Website_BPS_GO_ID_V_4_1647413425.pdf)). Belum ada indikator BPS di daftar MVP. BPS masuk saat seri per provinsi dibutuhkan.
- **BI.** SEKI terbit bulanan dalam bentuk tabel web dan Excel. Tidak ada SDMX, REST API, maupun unduhan massal ([DBnomics](https://git.nomics.world/dbnomics-fetchers/management/wikis/Fetcher-Description/BI)). Suku bunga dan kurs karena itu diambil dari IMF.
- **SPKLU adalah contoh paling jelas kenapa satu seri harus satu sumber.** Akhir 2023 PLN menyebut lebih dari 900 SPKLU di 411 lokasi ([Otodriver](https://otodriver.com/berita/2024/ada-900-spklu-di-411-titik-seluruh-indonesia-adaddeeesia)). Maret 2025 PLN menyebut 3.558 unit di 2.412 titik ([Antara](https://babel.antaranews.com/berita/475177/pln-tambah-spklu-antisipasi-lonjakan-pemudik-kendaraan-listrik-saat-idul-fitri-1446-hijriah)). Februari 2026 ESDM menyebut sekitar 4 ribu ([detikOto](https://oto.detik.com/mobil-listrik/d-8463676/indonesia-ditargetkan-punya-192-ribu-spklu-pada-2034)). Ketiganya berbeda pelapor dan definisi. Disambung jadi satu garis, hasilnya menyesatkan.
- **IDXCarbon.** Volume transaksi 494.254 tCO2e (26 Sep–Des 2023), 413.764 tCO2e (2024), dan 690.675 tCO2e (Q1 2025) ([Bisnis.com](https://market.bisnis.com/read/20250417/94/1869993/bei-catat-volume-perdagangan-bursa-karbon-melejit-pada-kuartal-i2025)). Angka ini dari pernyataan BEI yang dikutip media. Untuk publish, cari rilis BEI aslinya.

## Arsitektur

Dua jalur masuk, satu gerbang. Data dari API dan data manual sama-sama mendarat di staging. Keduanya hanya bisa jadi publik lewat `ds_publish_series()`, yang menjalankan check dan mencatat hasilnya. Situs dan FSRE hanya membaca view publik.

&#91;embedded content: alur data · dua jalur masuk, satu gerbang publish\]

### Komponen

| Komponen | Teknologi | Tanggung jawab |
| --- | --- | --- |
| Fetcher | Python 3.12 di GitHub Actions, repo situs, folder `pipelines/transition/` | Tarik seri ber-API sesuai jadwal di `ds_series`, normalisasi ke format panjang, tulis ke staging dengan service role, panggil fungsi publish |
| Adaptor sumber | Satu modul per sumber: `ember.py`, `imf_sdmx.py`, nanti `bps.py` | Tahu cara bicara dengan satu API, mengembalikan baris standar (seri, periode, nilai, vintage, metadata) |
| Gerbang publish | Fungsi Postgres `ds_publish_series(series_id)` | Jalankan check, tulis `ds_check`, pindahkan staging ke `ds_observation` bila lulus |
| Form admin | Halaman baru di admin React yang sudah ada | Entri manual satu nilai atau tempel CSV ke staging, lalu tombol publish yang memanggil fungsi yang sama |
| View publik | `v_chart_data`, `v_series_latest` | Satu-satunya pintu baca untuk anon. Hanya vintage terbaru dari seri yang sudah publish |
| Halaman tracker | Route `/transition/tracker`, React + komponen grafik | Indeks grafik per mata rantai |
| Embed esai | Extension TipTap `chartEmbed` | Merender grafik dari slug di dalam esai |

### Keputusan runtime

- **GitHub Actions, bukan Edge Function.** Parsing SDMX dan pembersihan data lebih mudah di Python. Repo situs sudah memakai Actions. Kodenya bisa dipindah utuh ke VPS hermesagent saat FSRE pindah ke sana.
- **Frekuensi tarik.** Ember dan IMF bulanan dicek mingguan, Senin 02:13 WIB. WEO ditarik saat edisi April dan Oktober terbit, dipicu manual.
- **Penulisan hanya lewat service role.** Key service role disimpan sebagai secret Actions. Item P0 "backup secrets di GitHub Actions" harus beres lebih dulu (lihat Risiko).
- **Grafik digambar di klien** dari data view, bukan gambar statis. Tujuannya supaya tooltip, unduh CSV, dan jejak sumber bisa jalan.
- **Library grafik.** Pakai Recharts kalau sudah ada di bundle, cek di Fase 0. Kalau belum, Recharts tetap pilihan default karena cocok dengan React dan shadcn/ui.

## Referensi API

Ember sudah terverifikasi penuh dari spesifikasi OpenAPI resminya. IMF baru sebagian: dua sumber sekunder bertentangan soal key dan urutan dimensi. Uji langsung dari workspace Claude gagal karena jaringan workspace memblokir kedua domain. Uji kontrak karena itu tetap dikerjakan di Fase 0, dengan perintah siap tempel di akhir bagian ini.

### Ember: terverifikasi dari OpenAPI v1

| Item | Nilai |
| --- | --- |
| Base URL | `https://api.ember-energy.org/v1` |
| Autentikasi | Query parameter `api_key`. Key gratis lewat registrasi di [halaman API Ember](https://ember-energy.org/data/api/) |
| Format respons | JSON dengan dua bagian: `stats` (termasuk `rate_limit`) dan `data` |
| Filter negara | `entity_code=IDN` |
| Filter waktu | `start_date`, `end_date`, format `YYYY` atau `YYYY-MM` |
| Filter sumber energi | `series` (dipisah koma), `is_aggregate_series=true/false` |
| Batas request | Dilaporkan di `stats.rate_limit` tiap respons. Angka pastinya belum diketahui |

Contoh request:

```
GET https://api.ember-energy.org/v1/electricity-generation/yearly?entity_code=IDN&start_date=2000&is_aggregate_series=false&api_key=<EMBER_API_KEY>
```

Key ikut di URL, jadi fetcher tidak boleh mencetak URL lengkap ke log GitHub Actions.

| Seri | Endpoint | Field nilai | Filter tambahan |
| --- | --- | --- | --- |
| `ember.idn.gen_share` | `/electricity-generation/yearly` | `share_of_generation_pct` | `is_aggregate_series=false`, satu baris per sumber energi |
| `ember.idn.coal_share` | `/electricity-generation/yearly` | `share_of_generation_pct` | `series` = batu bara. Nama persisnya diambil dari `/options/electricity-generation/yearly/series` |
| `ember.idn.co2_intensity` | `/carbon-intensity/yearly` | `emissions_intensity_gco2_per_kwh` | Tidak ada |
| `ember.idn.power_emissions` | `/power-sector-emissions/yearly` | `emissions_mtco2` | Baris agregat total |
| `ember.idn.capacity` | `/installed-capacity/monthly` | `capacity_gw` | Per sumber energi |

Pemetaan ke `ds_observation`: `date` menjadi `period_start` (`2024` → `2024-01-01`, `2024-03` → `2024-03-01`). Field nilai menjadi `value`. `source_code` = endpoint ditambah nama series. `vintage` = tanggal tarik.

Koreksi dari spesifikasi ini: kapasitas terpasang hanya ada sebagai endpoint bulanan, tidak ada versi tahunan. Baris inventaris sudah aku perbaiki.

### IMF: sebagian terverifikasi

| Item | Nilai | Keyakinan |
| --- | --- | --- |
| Base URL | `https://api.imf.org/external/sdmx/3.0` | Konsisten di semua sumber |
| Pola kueri data | `/data/dataflow/{agency}/{dataflow}/{version}/{key}` | Dari [panduan bd-econ](https://bd-econ.com/imfapi3.html). Satu sumber lain memakai bentuk `/data/{agency},{dataflow},{version}/{key}` |
| Filter waktu | `c[TIME_PERIOD]=ge:2016` | Dari panduan bd-econ |
| Format | Header `Accept: text/csv` atau `Accept: application/json` | Dari panduan bd-econ |
| Autentikasi | **Bertentangan.** Satu sumber menyebut tanpa key. Sumber lain menyebut setiap request `/data` wajib membawa header `Ocp-Apim-Subscription-Key`, dan tanpa key gateway menjawab 404, bukan 401 | Harus diuji. 404 jangan dibaca sebagai dataset tidak ada |
| Batas request | Sekitar 10 request per 5 detik | Satu sumber, belum dikonfirmasi IMF |

| Seri | Agency, dataflow, versi | Key kandidat | Masalah terbuka |
| --- | --- | --- | --- |
| PDB riil WEO | IMF.RES, WEO, 9.0.0 | `IDN.NGDP_RPCH.A` | Urutan dimensi bertentangan antarsumber: negara-indikator-frekuensi vs frekuensi-negara-indikator |
| Suku bunga kebijakan | IMF.STA, MFS\_IR, 8.0.1 | `IDN.[kode indikator].M` | `FPOLM_PA` adalah kode IFS lama. Kode indikator di MFS\_IR yang baru belum diketahui |
| Kurs IDR/USD | IMF.STA, ER, 4.0.1 | `IDN.USD_XDC.PA_RT.M` | Arah kuotasi `USD_XDC` harus dicek: rupiah per dolar atau sebaliknya |
| Harga batu bara | IMF.RES, PCPS, 9.0.0 | `G001.PCOALAU.USD.M` | Kode `PCOALAU` terkonfirmasi lewat [FRED](https://fred.stlouisfed.org/series/PCOALAUUSDM). Menurut satu sumber, agency pindah dari IMF.STA ke IMF.RES pada Mei 2026 |

Agency, versi, dan urutan dimensi di tabel ini berasal dari [kamus data IMF riksdagsmonitor](https://github.com/Hack23/riksdagsmonitor/blob/main/analysis/imf/data-dictionary.md), bukan dari IMF langsung.

Akibatnya untuk desain: adaptor IMF tidak boleh menulis urutan dimensi secara tetap. Saat mulai, adaptor mengambil struktur data (DSD) dataflow, lalu menyusun key dari nama dimensi. Versi dataflow disimpan di `ds_series.source_code`. Bila IMF menaikkan versi, job gagal dengan pesan jelas dan tidak diam-diam menarik struktur yang berbeda.

### Uji yang sudah dijalankan

| Uji | Hasil |
| --- | --- |
| Request ke `api.imf.org` dari shell workspace | Diblokir proxy workspace (403). Ini bukan jawaban IMF |
| Request ke `api.ember-energy.org` dari shell workspace | Diblokir proxy workspace (403) |
| Kueri data IMF lewat fetcher web | Ditolak robots.txt IMF |
| Spesifikasi OpenAPI Ember v1 | Terbaca lengkap. Jadi dasar tabel Ember di atas |

### Perintah uji Fase 0

Jalankan di PowerShell laptop kamu. Hasilnya berupa file di folder tempat kamu menjalankan perintah. Kirim semua file itu ke aku untuk dibaca.

```
mkdir C:\uji-api; cd C:\uji-api

# 1. IMF tanpa key, dua urutan dimensi. Catat kode HTTP yang muncul.
curl.exe -s -g -o weo_a.csv -w "WEO urutan A: %{http_code}`n" -H "Accept: text/csv" "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/WEO/~/IDN.NGDP_RPCH.A?c[TIME_PERIOD]=ge:2020"
curl.exe -s -g -o weo_b.csv -w "WEO urutan B: %{http_code}`n" -H "Accept: text/csv" "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/WEO/~/A.IDN.NGDP_RPCH?c[TIME_PERIOD]=ge:2020"

# 2. IMF kurs dan harga batu bara
curl.exe -s -g -o er.csv -w "ER: %{http_code}`n" -H "Accept: text/csv" "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/ER/~/IDN.USD_XDC.PA_RT.M?c[TIME_PERIOD]=ge:2024"
curl.exe -s -g -o coal.csv -w "PCPS: %{http_code}`n" -H "Accept: text/csv" "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/PCPS/~/G001.PCOALAU.USD.M?c[TIME_PERIOD]=ge:2024"

# 3. Ember. Tempel key Ember saat diminta.
$k = Read-Host "Tempel API key Ember"
curl.exe -s -g -o ember_gen_yearly.json "https://api.ember-energy.org/v1/electricity-generation/yearly?entity_code=IDN&start_date=2020&api_key=$k"
curl.exe -s -g -o ember_gen_monthly.json "https://api.ember-energy.org/v1/electricity-generation/monthly?entity_code=IDN&start_date=2025-01&api_key=$k"
curl.exe -s -g -o ember_series_options.json "https://api.ember-energy.org/v1/options/electricity-generation/yearly/series?api_key=$k"
```

Cara membaca hasilnya:

- Semua kueri IMF menjawab 404: kemungkinan besar butuh subscription key. Daftar di portal API IMF, lalu ulangi dengan header `Ocp-Apim-Subscription-Key`.
- Hanya salah satu urutan WEO yang menjawab 200: itu urutan yang benar.
- `ember_gen_monthly.json` berisi data: Indonesia masuk data bulanan Ember. Kosong: tracker listrik cukup tahunan.

## Skema Supabase

Delapan tabel baru dan dua view, semua berawalan `ds_` di schema `public`. Tidak ada kolom tabel lama yang diubah. Polanya meniru FSLI: data masuk sebagai draft, publish lewat fungsi yang menjalankan aturan, hasil aturan tersimpan per run.

### Tabel

| Tabel | Isi | Kolom kunci |
| --- | --- | --- |
| `ds_source` | Satu baris per lembaga sumber | `id` (`ember`, `imf`, `esdm`, `bei`, …), `name`, `homepage_url`, `license`, `access` (`api` / `manual` / `download`) |
| `ds_series` | Registri seri. Satu seri = satu sumber, terkunci | `id` slug, `source_id`, `source_code` (kode asli, misalnya `IDN.ENDA_XDC_USD_RATE.M`), `title_id`, `title_en`, `unit`, `frequency` (`A`/`Q`/`M`/`event`), `chain_link`, `ingest` (`api`/`manual`), `is_projection`, `definition_note`, `status` (`draft`/`published`/`retired`) |
| `ds_observation` | Nilai publik. Revisi menambah baris, tidak menimpa | PK (`series_id`, `period_start`, `vintage`), `period_label`, `value`, `retrieved_at`, `source_url`, `source_locator`, `fetch_run_id`, `entered_by` |
| `ds_observation_stage` | Bentuk sama dengan `ds_observation` plus `stage_token`. Tempat semua data mendarat lebih dulu | sama, plus `stage_token`, `staged_at` |
| `ds_fetch_run` | Log setiap job fetcher | `id`, `source_id`, `started_at`, `finished_at`, `status` (`ok`/`partial`/`failed`), `rows_staged`, `error`, `git_sha` |
| `ds_check` | Hasil aturan per run. Badge di grafik membaca run terakhir | `series_id`, `run_at`, `rule_id`, `severity` (`fail`/`warn`), `passed`, `expected`, `actual`, `detail` |
| `ds_chart` + `ds_chart_series` | Definisi grafik dan seri yang dipakainya | `ds_chart`: `slug`, `title` (kalimat temuan), `subtitle`, `chain_link`, `chart_type`, `annotation_sectors`, `published`, `sort_order`. `ds_chart_series`: `chart_slug`, `series_id`, `label`, `role` (`primary`/`context`), `sort_order` |

Enum baru: `chain_link` = `policy`, `infrastructure`, `finance`, `transition`, `carbon_price`, `macro`. Enum `chart_type` = `line`, `bar`, `stacked_bar`, `step`, `dot_whisker`.

### Aturan vintage

- Seri yang direvisi sumber (Ember, IMF): `vintage` = tanggal tarik, format `YYYY-MM-DD`. Revisi menghasilkan baris baru, nilai lama tetap ada untuk audit.
- Proyeksi (WEO): `vintage` = edisi, misalnya `WEO-2026-10`. FSRE selalu meminta edisi secara eksplisit.
- Entri manual: `vintage` = tanggal dokumen sumber. `source_locator` wajib (halaman, tabel, atau paragraf).

### Aturan check di `ds_publish_series()`

| ID | Aturan | Severity |
| --- | --- | --- |
| R1 | Setiap baris punya `source_url`. Seri API juga punya `source_code` | fail |
| R2 | Baris manual punya `source_locator` | fail |
| R3 | Periode jatuh di grid frekuensi seri (tahunan 1 Jan, bulanan tanggal 1) | fail |
| R4 | Tidak ada duplikat (`series_id`, `period_start`, `vintage`) di staging | fail |
| R5 | Satuan baris sama dengan satuan registri | fail |
| R6 | Baris proyeksi hanya di seri `is_projection = true` dan vintage-nya berlabel edisi | fail |
| R7 | Perubahan nilai lebih dari 25% terhadap vintage sebelumnya di periode yang sama | warn, butuh konfirmasi admin |
| R8 | Celah periode di tengah seri | warn |

Aturan "satu seri satu sumber" tidak perlu check karena sudah dijaga struktur: `source_id` ada di `ds_series`, bukan di observasi.

### View dan akses

- `v_series_latest`: vintage terbaru per seri per periode, hanya seri `published`.
- `v_chart_data`: gabungan `ds_chart`, seri, observasi terbaru, dan metadata sumber. Ini yang dibaca halaman dan embed.
- RLS: anon hanya `select` di dua view tadi. Admin penuh di semua tabel `ds_`. Fetcher menulis dengan service role ke staging dan `ds_fetch_run` saja. Fungsi publish berjalan `security definer`, dan hanya admin atau service role yang boleh memanggilnya.

### Hubungan dengan tabel yang ada

- `tracker_entry` tidak diubah. `ds_chart.annotation_sectors` memilih sektor mana yang tampil sebagai penanda. Penanda hanya dari baris `published = true` dan `verification = 'verified'`. Kuartal dipetakan ke tanggal akhir kuartal.
- `essays.content_json` tidak berubah skemanya. Embed adalah node TipTap `{type: 'chartEmbed', attrs: {slug}}`. Embed ke slug yang belum publish tampil sebagai placeholder di admin dan disembunyikan di publik.
- Tidak ada relasi ke tabel `fs_`. Keduanya hanya berbagi pola publish dan check.

## Desain

Empat layar ada di kanvas [Transition Tracker Design](https://claude.ai/artifact/AQ2vjKTWzJgZdGvh2BHpXn). Semua grafik di mockup berlabel Illustrative karena datanya baru ada setelah Fase 1. Judul temuan dan status mata rantai sengaja dibiarkan sebagai placeholder dalam kurung siku, karena isinya keputusan editorial kamu.

| Layar | Isi utama | Keputusan desain |
| --- | --- | --- |
| Indeks tracker | Lima kartu mata rantai, lalu satu bagian per mata rantai berisi kartu grafik | Urutan halaman mengikuti tesis sequencing. Setiap kartu punya slot status yang ditulis penulis, bukan dihitung mesin |
| Detail grafik | Grafik besar, pilihan rentang waktu, pilihan vintage, penanda kebijakan, panel sumber, hasil check, riwayat revisi, daftar esai pemakai | Jejak sumber berada di samping grafik, tidak tersembunyi di footnote |
| Embed di esai | Grafik ringkas di dalam kolom esai, dengan sumber dan tautan ke tracker | Latar embed berbeda dari teks esai supaya jelas bahwa ini bukti, bukan ilustrasi |
| Admin data transisi | Tabel seri dengan status, panel entri manual (satu nilai atau tempel CSV), hasil check setelah staging | Tombol publish nonaktif sampai ada baris di staging. Peringatan R7 harus dikonfirmasi lewat centang |

Sistem visual memakai palet situs (navy #1E2761 untuk struktur, biru #0070C0 khusus untuk garis data) dan oranye tua hanya untuk penanda kebijakan. Tipografi Source Serif 4 untuk judul dan teks esai, Inter untuk UI, JetBrains Mono untuk kode seri. Font ini usulan, karena aku belum melihat font situs yang sekarang. Di Fase 3 diganti dengan font situs.

## Rencana detail

Lima fase, satu PR per fase, dan setiap fase punya gerbang yang harus lulus sebelum fase berikutnya mulai. Tracker publik hidup di akhir Fase 3. Konsumsi FSRE menyusul di Fase 4 supaya tidak menahan peluncuran. Formatnya disiapkan untuk diserahkan ke Claude Code sebagai PRD + plan + prompt, sama seperti sapuan situs sebelumnya.

&#91;embedded content: roadmap · 5 fase, 5 gerbang\]

### Fase 0 · Persiapan

- [ ] Selesaikan item P0: secrets backup di GitHub Actions
- [ ] Daftar API key Ember (gratis, lewat email) dan simpan sebagai secret `EMBER_API_KEY`
- [ ] Uji tiga kueri langsung ke `api.imf.org`: WEO `IDN.NGDP_RPCH.A`, suku bunga kebijakan `FPOLM_PA` untuk IDN, dan kurs `ENDA_XDC_USD_RATE` untuk IDN. Catat dataflow, agency, dan key yang benar
- [ ] Cari kode batu bara di dataflow harga komoditas IMF (PCPS). Kode pastinya belum terverifikasi
- [ ] Cek apakah Indonesia termasuk dalam data bulanan Ember
- [ ] Cek apakah Recharts sudah ada di bundle situs

**G0 lulus bila:** tiga kueri IMF mengembalikan data Indonesia, key Ember aktif, dan secrets backup beres.

### Fase 1 · Data layer

- [ ] Migrasi: delapan tabel `ds_`, dua enum, dua view, kebijakan RLS
- [ ] Fungsi `ds_publish_series()` dengan aturan R1 sampai R8, menulis `ds_check`
- [ ] Adaptor `ember.py` dan `imf_sdmx.py`, masing-masing dengan uji unit pada respons rekaman
- [ ] Workflow Actions `transition-fetch.yml`: cron mingguan plus pemicu manual untuk WEO
- [ ] Seed `ds_source` dan registri 8 seri API
- [ ] Uji negatif: paksa job gagal di tengah jalan, pastikan data publik tidak berubah

**G1 lulus bila:** 8 seri publish dengan semua check fail lulus. Sampel acak 10 nilai dicocokkan manual ke situs sumber dengan selisih 0. Uji negatif lulus.

### Fase 2 · Entri manual

- [ ] Layar admin "Data transisi": daftar seri, status publish, badge check terakhir
- [ ] Form satu nilai dan tempel CSV, dengan pratinjau sebelum masuk staging
- [ ] Tombol publish yang memanggil fungsi yang sama dengan job
- [ ] Seed manual pertama: SPKLU (satu definisi dari satu pelapor), volume IDXCarbon per kuartal dari rilis BEI asli
- [ ] Pastikan baris `tracker_entry` kategori kebijakan siap dipakai sebagai anotasi

**G2 lulus bila:** 3 seri manual publish dengan `source_locator` terisi. Baris tanpa locator ditolak R2 (uji negatif).

### Fase 3 · Tampilan publik

- [ ] Komponen `TransitionChart` yang membaca `v_chart_data`: grafik, jejak sumber, unduh CSV, penanda anotasi
- [ ] Halaman `/transition/tracker`: kartu status per mata rantai, lalu grafik per mata rantai
- [ ] Halaman detail grafik `/transition/tracker/:slug`
- [ ] Extension TipTap `chartEmbed` dengan pemilih grafik di editor
- [ ] Redirect halaman Tracker lama ke halaman baru
- [ ] Satu esai pilot dari seri current condition menyematkan minimal satu grafik
- [ ] Tinjauan Verification Register untuk setiap grafik yang publish

**G3 lulus bila:** lima mata rantai masing-masing punya minimal satu grafik publish. Setiap grafik menampilkan sumber, kode seri, tanggal tarik, dan vintage. Halaman memuat di bawah 2 detik di 4G. Esai pilot live.

### Fase 4 · FSRE

- [ ] View `v_macro_assumptions` dengan parameter edisi WEO eksplisit
- [ ] FSRE membaca PDB, inflasi, kurs, dan harga batu bara dari view, bukan input tangan
- [ ] Catat edisi asumsi di setiap paket model FSRE

**G4 lulus bila:** forecast satu emiten (mulai dari PTBA atau INDY) bisa direproduksi identik dengan asumsi yang ditarik dari view. Jalankan verify-financial-model sebelum dinyatakan selesai.

## Risiko dan keputusan terbuka

| Risiko | Akibat | Mitigasi |
| --- | --- | --- |
| API IMF berubah lagi setelah migrasi portal | Job gagal diam-diam, data basi | Uji kontrak di setiap run. Gagal = `ds_fetch_run.status = failed` dan notifikasi. Grafik selalu menampilkan tanggal tarik |
| Indonesia tidak ada di data bulanan Ember | Seri listrik hanya tahunan, jeda sampai 12 bulan | Terima tahunan untuk MVP. Jangan menambal dengan sumber lain dalam garis yang sama |
| Seri manual tidak diperbarui | Tracker terlihat mati | Setiap seri manual punya tanggal tinjau berikutnya. Admin menampilkan seri yang lewat tanggal |
| Definisi SPKLU berubah antarrilis | Lompatan palsu di grafik | Satu pelapor per seri. Pergantian definisi = seri baru, ditampilkan berdampingan |
| Key service role bocor lewat Actions | Penulisan tak sah ke database | Beresin P0 dulu (G0). Key hanya bisa menulis staging, publish tetap lewat aturan |
| Grafik berubah jadi dashboard generik | Hilang pembeda dari Ember dan OWID | Setiap grafik wajib punya judul berupa temuan dan terikat ke satu mata rantai sequencing |
| Angka media dipakai karena rilis resmi sulit dicari | Melanggar Verification Register | R1 dan R2 menolak baris tanpa URL dan locator. Tinjauan manual di G3 |

### Keputusan yang masih kamu pegang

- [ ] Tracker sebagai halaman indeks plus embed (default dokumen ini), atau hanya sumber grafik untuk esai
- [ ] Bahasa halaman tracker: Inggris saja, atau dwibahasa seperti label FSLI (`label_id`, `label_en`)
- [ ] Indikator kebijakan: cukup memakai `tracker_entry` sebagai penanda, atau perlu seri sendiri (misalnya target bauran EBT per tahun dari RUPTL)
- [ ] Ambang R7 (lonjakan lebih dari 25%): tetap, atau berbeda per seri
- [ ] Seri pertama untuk esai pilot: intensitas karbon grid atau porsi batu bara

### Sumber

- [Ember, API data listrik](https://ember-energy.org/data/api)
- [Ember, Electricity Data Explorer](https://ember-energy.org/data/data-explorer/)
- [readimf, dokumentasi wrapper IMF SDMX 3.0](https://cran.r-project.org/web/packages/readimf/readme/README.html)
- [BPS, dokumen Website BPS 4.0 dan WebAPI](https://ppid.bps.go.id/upload/doc/LW12_Website_BPS_GO_ID_V_4_1647413425.pdf)
- [Bank Indonesia, SEKI](https://www.bi.go.id/id/statistik/ekonomi-keuangan/seki/default.aspx)
- [DBnomics, profil fetcher Bank Indonesia](https://git.nomics.world/dbnomics-fetchers/management/wikis/Fetcher-Description/BI)
- [Bisnis.com, volume IDXCarbon Q1 2025](https://market.bisnis.com/read/20250417/94/1869993/bei-catat-volume-perdagangan-bursa-karbon-melejit-pada-kuartal-i2025)
- [detikOto, jumlah SPKLU Februari 2026](https://oto.detik.com/mobil-listrik/d-8463676/indonesia-ditargetkan-punya-192-ribu-spklu-pada-2034)
- [Antara, SPKLU PLN Maret 2025](https://babel.antaranews.com/berita/475177/pln-tambah-spklu-antisipasi-lonjakan-pemudik-kendaraan-listrik-saat-idul-fitri-1446-hijriah)
- [Otodriver, SPKLU akhir 2023](https://otodriver.com/berita/2024/ada-900-spklu-di-411-titik-seluruh-indonesia-adaddeeesia)

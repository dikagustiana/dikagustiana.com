#!/usr/bin/env python3
"""
fs_extract_phe_fy2024.py: reads PT Pertamina Hulu Energi's FY2024 primary
statements out of data/fs/phe/fy2024/source.pdf into statements.json (Plan 1.4).

A one-off reading aid, not part of the gate: it needs pdfplumber, which CI does
not install, and its output is checked by scripts/fs_check.py like any other
statements file. Run it from the repository root:

    python3 scripts/fs_extract_phe_fy2024.py            # writes statements.json
    python3 scripts/fs_extract_phe_fy2024.py --check    # fails if it differs

How a row is read. Every figure and every note reference comes from the PDF's
text layer (the statement pages are native text, not scans), found by its
position: the line at a row's anchor `top`, the notes column, the 2024 column
and the 2023 column. Nothing numeric is typed here. What is typed here is the
structure the PDF's layout shows but its text does not carry: each row's type,
indent, the subtotal it sums into, and the line_key the rules address. The
labels are typed too, joined across their printed lines, and each one is
checked against the PDF: with whitespace and dashes ignored, the typed label
must equal the text printed between the previous row and this one.

Conventions (data/fs/phe/fy2024/README.md):
  * source_page is the page of the full audited report; the PDF here is the
    excerpt of its pages 10-18, so excerpt page n is report page n + 9.
  * a label printed over several lines is joined with single spaces;
  * the dash that marks a sub-item or a qualifier is written once, before the
    qualifier, in both languages (the English column prints it at the end of
    the line, mirrored);
  * "-" in a figure column is nil, stored as 0; a cell with nothing printed is
    null;
  * the two attribution totals on page 15 are printed without a label of their
    own; they carry the label of the heading they total.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'data' / 'fs' / 'phe' / 'fy2024'
PDF = FOLDER / 'source.pdf'
OUT = FOLDER / 'statements.json'
OFFSET = 9  # excerpt page n is page n + 9 of the full report

NOTES_X = (215, 262)
CY_X = (262, 345)
PY_X = (345, 405)
EN_X = 405
NUM = re.compile(r'^\(?[\d.]+\)?$|^-$')

# The line below which a page's rows begin (the column heading "Notes 2024
# 2023", or on report page 13 the repeated "LIABILITAS DAN EKUITAS (lanjutan)").
PAGE_START = {2: 206, 3: 198, 4: 215, 5: 208, 6: 218, 8: 201}

H, I, S, T = 'header', 'item', 'subtotal', 'total'

# (excerpt page, anchor top, line_type, indent, label_id, label_en, name, parent name, line_key, fsli_slug)
# name: a local handle for parents; parent: the name of the subtotal or total the row sums into.
SOFP = [
    (2, 233, H, 0, 'ASET', 'ASSETS', None, None, None, None),
    (2, 242, H, 0, 'ASET LANCAR', 'CURRENT ASSETS', None, None, None, None),
    (2, 250, I, 0, 'Kas dan setara kas', 'Cash and cash equivalents', None, 'tca', 'cash_and_cash_equivalents', 'cash-and-cash-equivalents'),
    (2, 276, I, 0, 'Kas yang dibatasi penggunaannya - bagian lancar', 'Restricted cash - current portion', None, 'tca', None, 'restricted-cash'),
    (2, 285, H, 0, 'Piutang usaha, neto', 'Trade receivables, net', None, None, None, 'trade-receivables-net'),
    (2, 294, I, 1, 'Pihak berelasi', 'Related parties', None, 'tca', None, 'related-parties'),
    (2, 302, I, 1, 'Pihak ketiga', 'Third parties', None, 'tca', None, 'third-parties'),
    (2, 311, I, 0, 'Piutang Pemerintah', 'Due from the Government', None, 'tca', None, 'due-from-government'),
    (2, 320, H, 0, 'Piutang lain-lain, neto', 'Other receivables, net', None, None, None, 'other-receivables-net'),
    (2, 328, I, 1, 'Pihak berelasi', 'Related parties', None, 'tca', None, None),
    (2, 337, I, 1, 'Pihak ketiga', 'Third parties', None, 'tca', None, None),
    (2, 346, I, 0, 'Persediaan, neto', 'Inventories, net', None, 'tca', None, 'inventories-net'),
    (2, 363, I, 0, 'Piutang pajak lainnya - bagian lancar', 'Other taxes receivable - current portion', None, 'tca', None, None),
    (2, 380, I, 0, 'Piutang pajak penghasilan dan dividen - bagian lancar', 'Corporate and dividend taxes receivables - current portion', None, 'tca', None, 'corporate-dividend-taxes-receivable-current'),
    (2, 406, I, 0, 'Uang muka dan biaya dibayar di muka - bagian lancar', 'Advances and prepayments - current portion', None, 'tca', None, 'advances-prepayments-current'),
    (2, 415, I, 0, 'Aset lancar lainnya', 'Other current assets', None, 'tca', None, 'other-current-assets'),
    (2, 432, S, 0, 'Jumlah Aset Lancar', 'Total Current Assets', 'tca', 'ta', 'total_current_assets', None),
    (2, 450, H, 0, 'ASET TIDAK LANCAR', 'NON-CURRENT ASSETS', None, None, None, None),
    (2, 475, I, 0, 'Kas yang dibatasi penggunaannya - bagian tidak lancar', 'Restricted cash - non-current portion', None, 'tnca', None, 'restricted-cash-non-current'),
    (2, 484, I, 0, 'Piutang jangka panjang', 'Long term receivables', None, 'tnca', None, None),
    (2, 493, I, 0, 'Aset tetap, neto', 'Fixed assets, net', None, 'tnca', None, 'fixed-assets-net'),
    (2, 501, I, 0, 'Aset tak berwujud, neto', 'Intangible assets, net', None, 'tnca', None, None),
    (2, 510, I, 0, 'Properti investasi', 'Investment properties', None, 'tnca', None, 'investment-properties'),
    (2, 519, I, 0, 'Aset pajak tangguhan', 'Deferred tax assets', None, 'tnca', None, 'deferred-tax-assets'),
    (2, 527, I, 0, 'Investasi jangka panjang', 'Long term investments', None, 'tnca', None, 'long-term-investments'),
    (2, 553, I, 0, 'Uang muka dan biaya dibayar di muka - bagian tidak lancar', 'Advances and prepayments - non-current portion', None, 'tnca', None, 'advances-prepayments-non-current'),
    (2, 570, I, 0, 'Piutang pajak lainnya - bagian tidak lancar', 'Other taxes receivable - non-current portion', None, 'tnca', None, None),
    (2, 597, I, 0, 'Piutang pajak penghasilan dan dividen - bagian tidak lancar', 'Corporate and dividend taxes receivables - non-current portion', None, 'tnca', None, 'corporate-dividend-taxes-receivable-non-current'),
    (2, 605, I, 0, 'Aset minyak dan gas bumi, neto', 'Oil and gas properties, net', None, 'tnca', None, 'oil-gas-properties-net'),
    (2, 614, I, 0, 'Aset hak guna, neto', 'Right of use assets, net', None, 'tnca', None, 'right-of-use-assets-net'),
    (2, 622, I, 0, 'Aset tidak lancar lainnya', 'Other non-current assets', None, 'tnca', None, 'other-non-current-assets-final'),
    (2, 640, S, 0, 'Jumlah Aset Tidak Lancar', 'Total Non-current Assets', 'tnca', 'ta', 'total_non_current_assets', None),
    (2, 657, T, 0, 'JUMLAH ASET', 'TOTAL ASSETS', 'ta', None, 'total_assets', None),

    (3, 222, H, 0, 'LIABILITAS DAN EKUITAS', 'LIABILITIES AND EQUITY', None, None, None, None),
    (3, 240, H, 0, 'LIABILITAS', 'LIABILITIES', None, None, None, None),
    (3, 257, H, 0, 'LIABILITAS JANGKA PENDEK', 'CURRENT LIABILITIES', None, None, None, None),
    (3, 265, H, 0, 'Utang usaha', 'Trade payables', None, None, None, None),
    (3, 274, I, 1, 'Pihak berelasi', 'Related parties', None, 'tcl', None, None),
    (3, 283, I, 1, 'Pihak ketiga', 'Third parties', None, 'tcl', None, None),
    (3, 300, I, 0, 'Utang Pemerintah - jangka pendek', 'Due to the Government - current portion', None, 'tcl', None, None),
    (3, 317, I, 0, 'Utang pajak penghasilan dan dividen - jangka pendek', 'Corporate and dividend taxes payable - current portion', None, 'tcl', None, None),
    (3, 326, I, 0, 'Utang pajak lainnya', 'Other taxes payables', None, 'tcl', None, None),
    (3, 335, H, 0, 'Utang lain-lain', 'Other payables', None, None, None, None),
    (3, 343, I, 1, 'Pihak berelasi', 'Related parties', None, 'tcl', None, None),
    (3, 352, I, 1, 'Pihak ketiga', 'Third parties', None, 'tcl', None, None),
    (3, 361, I, 0, 'Beban yang masih harus dibayar', 'Accrued expenses', None, 'tcl', None, None),
    (3, 369, I, 0, 'Imbalan kerja jangka pendek', 'Short-term employee benefits', None, 'tcl', None, None),
    (3, 378, I, 0, 'Pinjaman bank jangka pendek', 'Short-term bank loans', None, 'tcl', None, None),
    (3, 387, H, 0, 'Bagian jangka pendek atas:', 'Current maturities of:', None, None, None, None),
    (3, 395, I, 1, 'Pendapatan tangguhan', 'Deferred revenue', None, 'tcl', None, None),
    (3, 404, I, 1, 'Pinjaman bank jangka panjang', 'Long-term bank loans', None, 'tcl', None, None),
    (3, 413, I, 1, 'Liabilitas sewa', 'Lease liabilities', None, 'tcl', None, None),
    (3, 421, I, 1, 'Pinjaman lain-lain', 'Other loans', None, 'tcl', None, None),
    (3, 430, I, 0, 'Liabilitas jangka pendek lainnya', 'Other current liabilities', None, 'tcl', None, None),
    (3, 456, S, 0, 'Jumlah Liabilitas Jangka Pendek', 'Total Current Liabilities', 'tcl', 'tl', 'total_current_liabilities', None),
    (3, 482, H, 0, 'LIABILITAS JANGKA PANJANG', 'NON-CURRENT LIABILITIES', None, None, None, None),
    (3, 499, I, 0, 'Utang Pemerintah - jangka panjang', 'Due to the Government - non-current portion', None, 'tncl', None, None),
    (3, 508, I, 0, 'Utang sukuk', 'Sukuk payables', None, 'tncl', None, None),
    (3, 525, I, 0, 'Pinjaman bank jangka panjang - bagian jangka panjang', 'Long-term bank loan - non-current portion', None, 'tncl', None, None),
    (3, 543, I, 0, 'Pendapatan tangguhan - bagian jangka panjang', 'Deferred revenue - non-current portion', None, 'tncl', None, None),
    (3, 551, I, 0, 'Liabilitas pajak tangguhan', 'Deferred tax liabilities', None, 'tncl', None, None),
    (3, 577, I, 0, 'Utang pajak penghasilan dan dividen - jangka panjang', 'Corporate and dividend taxes payables - non-current portion', None, 'tncl', None, None),
    (3, 594, I, 0, 'Provisi pembongkaran dan restorasi lokasi aset', 'Provision for decommissioning and site restoration', None, 'tncl', None, None),
    (3, 612, I, 0, 'Liabilitas imbalan kerja karyawan - jangka panjang', 'Employee benefits liabilities - non-current portion', None, 'tncl', None, None),
    (3, 629, I, 0, 'Liabilitas sewa - jangka panjang', 'Lease liabilities - non-current portion', None, 'tncl', None, None),
    (3, 638, I, 0, 'Liabilitas jangka panjang lainnya', 'Other non-current liabilities', None, 'tncl', None, None),
    (3, 663, S, 0, 'Jumlah Liabilitas Jangka Panjang', 'Total Non-current Liabilities', 'tncl', 'tl', 'total_non_current_liabilities', None),
    (3, 681, S, 0, 'JUMLAH LIABILITAS', 'TOTAL LIABILITIES', 'tl', 'tle', 'total_liabilities', None),

    (4, 233, H, 0, 'EKUITAS', 'EQUITY', None, None, None, None),
    (4, 258, H, 0, 'Ekuitas yang diatribusikan kepada pemilik entitas induk', 'Equity attributable to owners of the parent', None, None, None, None),
    (4, 267, H, 0, 'Modal saham', 'Share capital', None, None, None, None),
    (4, 319, H, 1,
     'Modal dasar - 1.580.000.000.000 saham pada tanggal 31 Desember 2024 dan 31 Desember 2023; nilai nominal Rp500 (nilai penuh) per saham;',
     'Authorized - 1,580,000,000,000 shares as of December 31, 2024 and December 31, 2023; at par value of Rp500 (full amount) per share;',
     None, None, None, None),
    (4, 362, I, 1,
     'Modal ditempatkan dan disetor penuh - 396.225.242.340 saham pada tanggal 31 Desember 2024 dan 31 Desember 2023',
     'Issued and paid-up capital - 396,225,242,340 shares as of December 31, 2024 and December 31, 2023',
     None, 'eqp', None, None),
    (4, 371, I, 0, 'Tambahan modal disetor', 'Additional paid in capital', None, 'eqp', None, None),
    (4, 380, I, 0, 'Komponen ekuitas lainnya', 'Others Equity Component', None, 'eqp', None, None),
    (4, 388, H, 0, 'Saldo laba', 'Retained earnings', None, None, None, None),
    (4, 397, I, 1, 'Ditentukan penggunaannya', 'Appropriated', None, 'eqp', None, None),
    (4, 414, I, 1, 'Belum ditentukan penggunaannya', 'Unappropriated', None, 'eqp', None, None),
    (4, 423, I, 0, 'Penghasilan komprehensif lainnya', 'Other comprehensive income', None, 'eqp', None, None),
    (4, 458, S, 0, 'Jumlah ekuitas yang diatribusikan kepada pemilik entitas induk', 'Total equity attributable to the owners of the parent', 'eqp', 'te', 'equity_parent', None),
    (4, 484, I, 0, 'Kepentingan nonpengendali (“KNP”)', 'Non-controlling interest (“NCI”)', None, 'te', 'nci', None),
    (4, 501, S, 0, 'JUMLAH EKUITAS', 'TOTAL EQUITY', 'te', 'tle', 'total_equity', None),
    (4, 527, T, 0, 'JUMLAH LIABILITAS DAN EKUITAS', 'TOTAL LIABILITIES AND EQUITY', 'tle', None, 'total_liabilities_and_equity', None),
]

PL = [
    (5, 225, I, 0, 'PENDAPATAN USAHA', 'REVENUES', None, 'gp', 'revenue', None),
    (5, 243, H, 0, 'BEBAN POKOK PENJUALAN', 'COSTS OF REVENUE', None, None, None, None),
    (5, 252, I, 0, 'Beban eksplorasi', 'Exploration expenses', None, 'cor', None, None),
    (5, 260, I, 0, 'Beban produksi', 'Production expenses', None, 'cor', None, None),
    (5, 277, I, 0, 'Beban depresiasi, deplesi dan amortisasi', 'Depreciation, depletion and amortization expenses', None, 'cor', None, None),
    (5, 295, I, 0, 'Beban umum dan administrasi', 'General and administration expenses', None, 'cor', None, None),
    (5, 312, I, 0, 'Beban dari aktivitas operasi lainnya', 'Expense from other operations', None, 'cor', None, None),
    (5, 329, S, 0, 'Jumlah beban pokok penjualan', 'Total costs of revenue', 'cor', 'gp', 'total_cost_of_revenue', None),
    (5, 347, S, 0, 'LABA KOTOR', 'GROSS PROFIT', 'gp', 'pbt', 'gross_profit', None),
    (5, 372, I, 0, 'Penyisihan penurunan nilai aset non-keuangan', 'Provision for impairment of non-financial assets', None, 'pbt', None, None),
    (5, 381, I, 0, 'Penghasilan keuangan', 'Finance income', None, 'pbt', None, None),
    (5, 390, I, 0, 'Beban keuangan', 'Finance cost', None, 'pbt', None, None),
    (5, 399, I, 0, 'Kerugian selisih kurs, neto', 'Foreign exchange loss, net', None, 'pbt', None, None),
    (5, 407, I, 0, 'Pendapatan/(beban) lain-lain, neto', 'Other income/(expense), net', None, 'pbt', None, None),
    (5, 433, S, 0, 'LABA SEBELUM PAJAK PENGHASILAN', 'PROFIT BEFORE INCOME TAX', 'pbt', 'ni', 'profit_before_tax', None),
    (5, 459, I, 0, 'BEBAN PAJAK PENGHASILAN - NETO', 'INCOME TAX EXPENSE - NET', None, 'ni', 'income_tax', None),
    (5, 476, S, 0, 'LABA TAHUN BERJALAN', 'PROFIT FOR THE YEAR', 'ni', 'tci', 'profit_for_the_year', None),
    (5, 502, H, 0, 'PENGHASILAN KOMPREHENSIF LAIN', 'OTHER COMPREHENSIVE INCOME', None, None, None, None),
    (5, 520, H, 0, 'Pos yang akan di reklasifikasikan ke laba rugi:', 'Item that may be reclassified subsequently to profit or loss:', None, None, None, None),
    (5, 537, I, 1, 'Selisih kurs karena penjabaran laporan keuangan', 'Translation adjustments', None, 'tci', None, None),
    (5, 572, I, 1, 'Penyesuaian nilai wajar atas instrumen lindung nilai arus kas setelah dikurangi pajak', 'Fair value adjustment on cash flow hedging instruments - net of tax', None, 'tci', None, None),
    (5, 598, H, 0, 'Pos yang tidak akan di reklasifikasikan ke laba rugi:', 'Item that will not be reclassified to profit or loss:', None, None, None, None),
    (5, 615, I, 1, 'Laba atas pengukuran kembali liabilitas imbalan kerja', 'Gain on re-measurement of employee benefit liability', None, 'tci', None, None),
    (5, 648, T, 0, 'JUMLAH PENGHASILAN KOMPREHENSIF TAHUN BERJALAN', 'TOTAL COMPREHENSIVE INCOME FOR THE YEAR', 'tci', None, 'total_comprehensive_income', None),

    (6, 253, H, 0, 'LABA TAHUN BERJALAN YANG DAPAT DIATRIBUSIKAN KEPADA:', 'PROFIT FOR THE YEAR ATTRIBUTABLE TO:', None, None, None, None),
    (6, 261, I, 1, 'Pemilik entitas induk', 'Owners of the parent entity', None, 'attr_profit', 'profit_parent', None),
    (6, 270, I, 1, 'Kepentingan nonpengendali', 'Non-controlling interests', None, 'attr_profit', 'profit_nci', None),
    (6, 287, T, 0, 'LABA TAHUN BERJALAN YANG DAPAT DIATRIBUSIKAN KEPADA:', 'PROFIT FOR THE YEAR ATTRIBUTABLE TO:', 'attr_profit', None, None, None),
    (6, 330, H, 0, 'JUMLAH PENGHASILAN KOMPREHENSIF TAHUN BERJALAN YANG DAPAT DIATRIBUSIKAN KEPADA:', 'TOTAL COMPREHENSIVE INCOME FOR THE YEAR ATTRIBUTABLE TO:', None, None, None, None),
    (6, 339, I, 1, 'Pemilik entitas induk', 'Owners of the parent entity', None, 'attr_tci', 'tci_parent', None),
    (6, 348, I, 1, 'Kepentingan non-pengendali', 'Non-controlling interests', None, 'attr_tci', 'tci_nci', None),
    (6, 365, T, 0, 'JUMLAH PENGHASILAN KOMPREHENSIF TAHUN BERJALAN YANG DAPAT DIATRIBUSIKAN KEPADA:', 'TOTAL COMPREHENSIVE INCOME FOR THE YEAR ATTRIBUTABLE TO:', 'attr_tci', None, None, None),
]
# Printed without a label; they carry the label of the heading they total.
UNLABELLED = {(6, 287), (6, 365)}
# The cost group whose items the FS prints in parentheses (SIGN).
NEGATIVE_GROUPS = {'cor'}

CF = [
    (8, 227, H, 0, 'ARUS KAS DARI AKTIVITAS OPERASI:', 'CASH FLOWS FROM OPERATING ACTIVITIES:', None, None, None, None),
    (8, 250, I, 1, 'Penerimaan kas dari pelanggan', 'Cash receipts from customers', None, 'op', None, None),
    (8, 259, I, 1, 'Pembayaran kas kepada pemasok', 'Cash paid to suppliers', None, 'op', None, None),
    (8, 276, I, 1, '(Pemberian dana ke)/ penyediaan dana dari Pertamina', '(Cash provided to)/ cash provided by Pertamina', None, 'op', None, None),
    (8, 294, I, 1, 'Pembayaran kas untuk pajak penghasilan dan pajak lainnya', 'Cash paid for income taxes and other taxes', None, 'op', None, None),
    (8, 311, I, 1, 'Penerimaan kas dari Pemerintah', 'Cash receipts from the Government', None, 'op', None, None),
    (8, 320, I, 1, 'Pembayaran kas ke Pemerintah', 'Cash paid to the Government', None, 'op', None, None),
    (8, 337, I, 1, 'Pembayaran kas untuk aktivitas operasi lainnya', 'Cash paid to other operating activities', None, 'op', None, None),
    (8, 346, I, 1, 'Pembayaran manfaat pensiun', 'Cash paid for pension benefits', None, 'op', None, None),
    (8, 370, S, 0, 'Kas neto yang diperoleh dari aktivitas operasi', 'Net cash generated from operating activities', 'op', 'net', 'net_cash_operating', None),
    (8, 395, H, 0, 'ARUS KAS DARI AKTIVITAS INVESTASI:', 'CASH FLOWS FROM INVESTING ACTIVITIES:', None, None, None, None),
    (8, 417, I, 1, 'Pembelian aset minyak dan gas bumi', 'Purchase of oil and gas properties', None, 'inv', None, None),
    (8, 426, I, 1, 'Kas yang dibayar untuk aset tetap', 'Cash paid for fixed asset', None, 'inv', None, None),
    (8, 443, I, 1, 'Penerimaan kas terkait investasi pada entitas anak', 'Cash receipts related to investments in subsidiaries', None, 'inv', None, None),
    (8, 469, I, 1, 'Penerimaan/(pembayaran) kas atas penambahan/(penjualan) investasi pada entitas anak', 'Cash receipts/(paid) from sales/(additions) of investments in subsidiaries', None, 'inv', None, None),
    (8, 494, S, 0, 'Kas neto yang digunakan untuk aktivitas investasi', 'Net cash used in investing activities', 'inv', 'net', 'net_cash_investing', None),
    (8, 515, H, 0, 'ARUS KAS DARI AKTIVITAS PENDANAAN:', 'CASH FLOWS FROM FINANCING ACTIVITIES:', None, None, None, None),
    (8, 532, I, 1, 'Pembayaran dividen', 'Payment of dividend', None, 'fin', None, None),
    (8, 540, I, 1, 'Penerimaan pinjaman', 'Loans received', None, 'fin', None, None),
    (8, 549, I, 1, 'Pembayaran pinjaman', 'Loans payment', None, 'fin', None, None),
    (8, 558, I, 1, 'Pembayaran liabilitas sewa', 'Payments of lease liabilities', None, 'fin', None, None),
    (8, 575, I, 1, 'Pembayaran kas dari aktivitas pendanaan lainnya', 'Cash paid from other financing activities', None, 'fin', None, None),
    (8, 601, S, 0, 'Kas neto yang digunakan untuk aktivitas pendanaan', 'Net cash used in financing activities', 'fin', 'net', 'net_cash_financing', None),
    (8, 634, S, 0, '(PENURUNAN)/KENAIKAN NETO KAS DAN SETARA KAS', 'NET (DECREASE)/INCREASE IN CASH AND CASH EQUIVALENTS', 'net', 'end', 'net_change_in_cash', None),
    (8, 659, I, 0, 'Efek perubahan nilai kurs pada kas dan setara kas', 'Effect of exchange rate changes on cash and cash equivalents', None, 'end', None, None),
    (8, 685, I, 0, 'SALDO KAS DAN SETARA KAS PADA AWAL TAHUN', 'CASH AND CASH EQUIVALENTS AT BEGINNING OF THE YEAR', None, 'end', 'cash_begin', None),
    (8, 710, T, 0, 'SALDO KAS DAN SETARA KAS PADA AKHIR TAHUN', 'CASH AND CASH EQUIVALENTS AT END OF THE YEAR', 'end', None, 'cash_end', None),
]

# Statement of changes in equity, report page 16 (excerpt page 7). The page is
# printed in landscape, so in the text layer a column is a line (a `top`) and a
# row is an x position, and each word reads backwards.
SOCE_PAGE = 7
SOCE_COLS = [  # (col_key, top band, label_id, label_en)
    ('share_capital', (618, 632), 'Modal saham', 'Share capital'),
    ('appropriated', (563, 576), 'Ditentukan penggunaannya', 'Appropriated'),
    ('unappropriated', (508, 520), 'Belum ditentukan penggunaanya', 'Unappropriated'),
    ('apic', (446, 458), 'Tambahan modal disetor', 'Additional paid in capital'),
    ('oci', (392, 402), 'Penghasilan komprehensif lainnya', 'Other Comprehensive Income'),
    ('merging', (328, 338), 'Penggabungan Entitas', 'Merging Entities'),
    ('other_equity', (276, 287), 'Penyesuaian terhadap akun ekuitas (Komponen ekuitas lainnya)', 'Other equity component - net of tax'),
    ('total_parent', (221, 232), 'Jumlah ekuitas yang diatribusikan kepada pemilik entitas induk', 'Total equity attributable to owners of the parent'),
    ('nci', (165, 176), 'Kepentingan nonpengendali', 'Non-controlling interests'),
    ('total', (113, 124), 'Jumlah ekuitas', 'Total equity'),
]
SOCE_NOTES_BAND = (668, 678)
SOCE_FIGURES = (110, 640)  # the band of `top` holding the ten figure columns
SOCE_ROWS = [  # (row_key, x, label_id, label_en)
    ('balance_2022', 260, 'Saldo per 31 Desember 2022', 'Balance at December 31, 2022'),
    ('dividend_2023', 272, 'Pembagian dividen', 'Dividend declared'),
    ('dividend_nci_2023', 278, 'Pembagian dividen ke KNP', 'Dividend declared to NCI'),
    ('reserve_2023', 297, 'Cadangan wajib serta cadangan umum dan investasi', 'Statutory reserve and general and investment reserve'),
    ('equity_adjustment_2023', 309, 'Penyesuaian ekuitas pada entitas anak', 'Equity adjustment in subsidiaries'),
    ('tci_2023', 328, 'Jumlah penghasilan komprehensif tahun berjalan', 'Total comprehensive income for the year'),
    ('balance_2023', 347, 'Saldo per 31 Desember 2023', 'Balance at December 31, 2023'),
    ('dividend_2024', 359, 'Pembagian dividen', 'Dividend declared'),
    ('dividend_nci_2024', 366, 'Pembagian dividen ke KNP', 'Dividend declared to NCI'),
    ('reserve_2024', 384, 'Cadangan wajib serta cadangan umum dan investasi', 'Statutory reserve and general and investment reserve'),
    ('equity_adjustment_2024', 397, 'Penyesuaian ekuitas pada entitas anak', 'Equity adjustment in subsidiaries'),
    ('tci_2024', 415, 'Jumlah penghasilan komprehensif tahun berjalan', 'Total comprehensive income for the year'),
    ('balance_2024', 434, 'Saldo per 31 Desember 2024', 'Balance at December 31, 2024'),
]


def figure(token: str) -> int:
    if token == '-':
        return 0
    neg = token.startswith('(') and token.endswith(')')
    value = int(token.strip('()').replace('.', ''))
    return -value if neg else value


def squash(text: str) -> str:
    """The comparison form of a label: no whitespace, no dashes, curly quotes kept."""
    return re.sub(r'[\s\-]', '', text)


def page_lines(pdf, excerpt_page):
    lines = {}
    for w in pdf.pages[excerpt_page - 1].extract_words():
        lines.setdefault(round(w['top']), []).append(w)
    return {top: sorted(ws, key=lambda w: w['x0']) for top, ws in lines.items()}


def read_vertical(pdf, rows, statement):
    out, problems = [], []
    by_page = {}
    for spec in rows:
        by_page.setdefault(spec[0], []).append(spec)
    names = {}
    order = 0
    cache = {}
    for spec in rows:
        page, top, lt, indent, lid, len_, name, parent, key, slug = spec
        order += 10
        if name:
            names[name] = order
    order = 0
    for spec in rows:
        page, top, lt, indent, lid, len_, name, parent, key, slug = spec
        order += 10
        lines = cache.setdefault(page, page_lines(pdf, page))
        if top not in lines:
            problems.append(f'{statement} p{page}: no line at top {top}')
            continue
        prev_tops = [s[1] for s in by_page[page] if s[1] < top]
        lo = max(prev_tops) if prev_tops else PAGE_START[page]
        span = [t for t in sorted(lines) if lo < t <= top]
        words = [w for t in span for w in lines[t]]
        id_text = ' '.join(w['text'] for w in words if w['x0'] < NOTES_X[0])
        en_text = ' '.join(w['text'] for w in words if w['x0'] >= EN_X)
        # No figure prints this far left, so everything in the notes band is a note
        # reference, plain numbers (16, 28) included.
        notes = [w['text'] for w in words if NOTES_X[0] <= w['x0'] < NOTES_X[1]]
        anchor = lines[top]
        cy = [w['text'] for w in anchor if CY_X[0] <= w['x0'] < CY_X[1] and NUM.match(w['text'])]
        py = [w['text'] for w in anchor if PY_X[0] <= w['x0'] < PY_X[1] and NUM.match(w['text'])]

        if (page, top) not in UNLABELLED:
            if squash(id_text) != squash(lid):
                problems.append(f'{statement} p{page}@{top} label_id: typed {lid!r}, printed {id_text!r}')
            if squash(en_text) != squash(len_):
                problems.append(f'{statement} p{page}@{top} label_en: typed {len_!r}, printed {en_text!r}')
        elif id_text.strip() or en_text.strip():
            problems.append(f'{statement} p{page}@{top}: expected no printed label, found {id_text!r} / {en_text!r}')

        if lt == H:
            if cy or py:
                problems.append(f'{statement} p{page}@{top}: a header with figures {cy} {py}')
            value_cy = value_py = None
        else:
            if len(cy) != 1 or len(py) != 1:
                problems.append(f'{statement} p{page}@{top}: expected one figure per year, found {cy} {py}')
                continue
            value_cy, value_py = figure(cy[0]), figure(py[0])

        line = {
            'statement': statement,
            'sort_order': order,
            'line_type': lt,
            'indent': indent,
            'label_id': lid,
            'label_en': len_,
            'notes_ref': ','.join(notes) if notes else None,
            'value_cy': value_cy,
            'value_py': value_py,
            'parent': names[parent] if parent else None,
            'line_key': key,
            'fsli_slug': slug,
            'source_page': page + OFFSET,
        }
        if name in NEGATIVE_GROUPS:
            line['expect_sign'] = 'negative'
        if (page, top) in UNLABELLED:
            line['label_note'] = 'printed without a label; carries the label of the heading it totals'
        out.append(line)
    return out, problems


def read_soce(pdf):
    page = pdf.pages[SOCE_PAGE - 1]
    grid, notes, problems = {}, {}, []
    for w in page.extract_words():
        text = w['text'][::-1]  # the landscape page's words read backwards
        if not NUM.match(text):
            continue
        in_notes = SOCE_NOTES_BAND[0] <= w['top'] <= SOCE_NOTES_BAND[1]
        if not (SOCE_FIGURES[0] <= w['top'] <= SOCE_FIGURES[1] or in_notes):
            continue  # the years and days inside the row labels
        row = next((r for r in SOCE_ROWS if abs(w['x0'] - r[1]) <= 3), None)
        if row is None:
            continue
        if in_notes:
            notes[row[0]] = text
            continue
        col = next((c for c in SOCE_COLS if c[1][0] <= w['top'] <= c[1][1]), None)
        if col is None:
            problems.append(f'soce: figure {text} at top {w["top"]:.0f} x {w["x0"]:.0f} is in no column')
            continue
        if (row[0], col[0]) in grid:
            problems.append(f'soce: two figures in {row[0]}/{col[0]}')
        grid[(row[0], col[0])] = figure(text)
    cells = []
    for ri, (rk, _x, rid, ren) in enumerate(SOCE_ROWS, start=1):
        for ci, (ck, _band, cid, cen) in enumerate(SOCE_COLS, start=1):
            cells.append({
                'row_key': rk, 'row_label_id': rid, 'row_label_en': ren, 'row_order': ri,
                'col_key': ck, 'col_label_id': cid, 'col_label_en': cen, 'col_order': ci,
                'notes_ref': notes.get(rk),
                'value': grid.get((rk, ck)),  # None: nothing printed in the cell
                'source_page': SOCE_PAGE + OFFSET,
            })
    return cells, problems


def build():
    with pdfplumber.open(PDF) as pdf:
        sofp, p1 = read_vertical(pdf, SOFP, 'sofp')
        pl, p2 = read_vertical(pdf, PL, 'pl_oci')
        cf, p3 = read_vertical(pdf, CF, 'cf')
        cells, p4 = read_soce(pdf)
    problems = p1 + p2 + p3 + p4
    doc = {
        '_about': (
            'PT Pertamina Hulu Energi dan entitas anaknya, consolidated financial statements for the year ended '
            '31 December 2024, as presented: labels, note references and signs verbatim, every record with the page '
            'of the full audited report it was read from. Written by scripts/fs_extract_phe_fy2024.py from '
            'data/fs/phe/fy2024/source.pdf; proven by scripts/fs_check.py. Conventions: README.md in this folder. '
            'fsli_slug links a row to its line-item page on the site and is not read from the PDF.'
        ),
        'company': {'id': 'phe', 'legal_name': 'PT Pertamina Hulu Energi dan entitas anaknya', 'short_name': 'PHE'},
        'period': {
            'period_key': 'fy2024',
            'period_end': '2024-12-31',
            'comparative_end': '2023-12-31',
            'currency': 'USD',
            'unit': 'thousands',
            'auditor': 'KAP Purwantono, Sungkoro & Surja (EY)',
            'auditor_report_no': '00489/2.1032/AU.1/02/1726-4/1/III/2025',
            'auditor_opinion': 'unmodified',
            'source_file': 'data/fs/phe/fy2024/source.pdf',
            'statement_pages': {'sofp': [11, 13], 'pl_oci': [14, 15], 'soce': [16, 16], 'cf': [17, 17]},
        },
        'lines': sofp + pl + cf,
        'soce_cells': cells,
    }
    return doc, problems


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--check', action='store_true', help='fail if statements.json differs from a fresh read')
    args = ap.parse_args(argv)
    doc, problems = build()
    if problems:
        print('The PDF does not read as specified:', file=sys.stderr)
        for p in problems:
            print('  ' + p, file=sys.stderr)
        return 1
    text = json.dumps(doc, indent=2, ensure_ascii=False) + '\n'
    if args.check:
        if OUT.read_text(encoding='utf-8') != text:
            print(f'{OUT} differs from a fresh read of {PDF}', file=sys.stderr)
            return 1
        print(f'{OUT} matches a fresh read of {PDF}')
        return 0
    OUT.write_text(text, encoding='utf-8')
    print(f'wrote {OUT}: {len(doc["lines"])} lines, {len(doc["soce_cells"])} SoCE cells')
    return 0


if __name__ == '__main__':
    sys.exit(main())

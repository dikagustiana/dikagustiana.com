-- =============================================================================
-- Line-item pages for the accounting essays of 11 Oct 2026 that have none yet
-- (owner brief of 12 Oct 2026, Group B): intangible assets, other taxes
-- receivable, and the first liability, equity and profit or loss lines.
--
-- The existing 24 rows set the pattern: the title is the English caption as
-- printed, the subtitle the Indonesian one (fs_line.label_id), the category a
-- snake_case statement section beside current_assets / non_current_assets.
-- sort_order continues after 24 in statement order instead of renumbering the
-- 24: an UPDATE would restamp their updated_at (trigger
-- update_fsli_pages_updated_at), which each page prints as "Updated <date>".
--
-- A page shows its essay (essays.fsli_slug) and the figures of the statement
-- rows linked to it (fs_line.fsli_slug, 20261012100200). Re-running inserts
-- nothing that is already there.
--
-- DOWN (fs_line links to these pages are set to NULL by the foreign key):
--   DELETE FROM public.fsli_pages WHERE slug IN (
--     'intangible-assets-net', 'other-taxes-receivable-current', 'trade-payables',
--     'accrued-expenses', 'deferred-revenue-current', 'long-term-bank-loans-non-current',
--     'decommissioning-site-restoration-provision', 'employee-benefits-liabilities-non-current',
--     'share-capital', 'retained-earnings', 'other-comprehensive-income',
--     'non-controlling-interest', 'revenues', 'production-expenses',
--     'impairment-non-financial-assets', 'finance-cost', 'foreign-exchange-loss-net');
-- =============================================================================

INSERT INTO public.fsli_pages (slug, title, subtitle, category, sort_order) VALUES
  ('intangible-assets-net', 'Intangible assets, net', 'Aset tak berwujud, neto', 'non_current_assets', 25),
  ('other-taxes-receivable-current', 'Other taxes receivable - current portion', 'Piutang pajak lainnya - bagian lancar', 'current_assets', 26),
  ('trade-payables', 'Trade payables', 'Utang usaha', 'current_liabilities', 27),
  ('accrued-expenses', 'Accrued expenses', 'Beban yang masih harus dibayar', 'current_liabilities', 28),
  ('deferred-revenue-current', 'Deferred revenue - current maturities', 'Pendapatan tangguhan', 'current_liabilities', 29),
  ('long-term-bank-loans-non-current', 'Long-term bank loan - non-current portion', 'Pinjaman bank jangka panjang - bagian jangka panjang', 'non_current_liabilities', 30),
  ('decommissioning-site-restoration-provision', 'Provision for decommissioning and site restoration', 'Provisi pembongkaran dan restorasi lokasi aset', 'non_current_liabilities', 31),
  ('employee-benefits-liabilities-non-current', 'Employee benefits liabilities - non-current portion', 'Liabilitas imbalan kerja karyawan - jangka panjang', 'non_current_liabilities', 32),
  ('share-capital', 'Share capital', 'Modal saham', 'equity', 33),
  ('retained-earnings', 'Retained earnings', 'Saldo laba', 'equity', 34),
  ('other-comprehensive-income', 'Other comprehensive income', 'Penghasilan komprehensif lainnya', 'equity', 35),
  ('non-controlling-interest', 'Non-controlling interest', 'Kepentingan nonpengendali', 'equity', 36),
  ('revenues', 'Revenues', 'Pendapatan usaha', 'profit_or_loss', 37),
  ('production-expenses', 'Production expenses', 'Beban produksi', 'profit_or_loss', 38),
  ('impairment-non-financial-assets', 'Provision for impairment of non-financial assets', 'Penyisihan penurunan nilai aset non-keuangan', 'profit_or_loss', 39),
  ('finance-cost', 'Finance cost', 'Beban keuangan', 'profit_or_loss', 40),
  ('foreign-exchange-loss-net', 'Foreign exchange loss, net', 'Kerugian selisih kurs, neto', 'profit_or_loss', 41)
ON CONFLICT (slug) DO NOTHING;

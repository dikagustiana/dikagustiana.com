-- FSLI: mark sub-lines so the statement subtotals stop double-counting them,
-- and correct the Indonesian captions that were mistyped in the seed.
--
-- NOT APPLIED TO PRODUCTION. The owner applies it through the apply_migration
-- tooling (README, "Database & migrations"). The page treats a missing flag as
-- "not a component", so it renders either side of this migration; the totals
-- are only right once it is applied.
--
-- is_component: true for a row that breaks down another row. In the seed that
-- is third-parties and related-parties, which sit under trade-receivables-net.
-- Nullable, no default, so the column add rewrites no existing row.
--
-- CHECK BEFORE RELYING ON THE TOTALS: at 31 Dec 2024 the two components add to
-- 1,344,233 against a parent of 2,203,018 (2023: 1,516,756 against 2,063,070),
-- so they are not a complete breakdown of it. Confirm against the issuer's
-- statement that they are sub-lines of the parent and not separate face lines.
--
-- Captions (Q6, unconfirmed against the issuer's own Indonesian statement):
--   Piutang ketiga                      -> Piutang usaha - pihak ketiga
--   Piutang bermiutah                   -> Piutang usaha - pihak berelasi
--   Aset hak dan gas bumi, neto         -> Aset minyak dan gas bumi, neto
--   Piutang pajak penghasilan dan dividen taxes
--                                       -> Piutang pajak penghasilan badan dan pajak dividen
--                                          (bagian lancar / bagian tidak lancar)

ALTER TABLE public.fsli_pages
  ADD COLUMN IF NOT EXISTS is_component boolean;

COMMENT ON COLUMN public.fsli_pages.is_component IS
  'true when the row breaks down another row; shown indented and excluded from the statement subtotals.';

UPDATE public.fsli_pages SET is_component = true
 WHERE slug IN ('third-parties', 'related-parties');

UPDATE public.fsli_pages SET subtitle = 'Piutang usaha – pihak ketiga'
 WHERE slug = 'third-parties' AND subtitle = 'Piutang ketiga';

UPDATE public.fsli_pages SET subtitle = 'Piutang usaha – pihak berelasi'
 WHERE slug = 'related-parties' AND subtitle = 'Piutang bermiutah';

UPDATE public.fsli_pages SET subtitle = 'Aset minyak dan gas bumi, neto'
 WHERE slug = 'oil-gas-properties-net' AND subtitle = 'Aset hak dan gas bumi, neto';

UPDATE public.fsli_pages SET subtitle = 'Piutang pajak penghasilan badan dan pajak dividen – bagian lancar'
 WHERE slug = 'corporate-dividend-taxes-receivable-current'
   AND subtitle = 'Piutang pajak penghasilan dan dividen taxes';

UPDATE public.fsli_pages SET subtitle = 'Piutang pajak penghasilan badan dan pajak dividen – bagian tidak lancar'
 WHERE slug = 'corporate-dividend-taxes-receivable-non-current'
   AND subtitle = 'Piutang pajak penghasilan dan dividen taxes';

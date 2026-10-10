-- Finance in Action joins the /finance landing as section 06 (site sweep
-- October 2026, PRD R5.1; owner decision D12(a)).
--
-- NOT APPLIED TO PRODUCTION; owner applies via apply_migration (README,
-- "Database & migrations"). Until it is applied the landing lists the five
-- rows it lists today; FinanceLanding draws whatever finance_sections holds,
-- so either side of this migration renders.
--
-- ORDER: apply it only once the Production deploy built with
-- VITE_FIA_LIVE=true (VITE_FIA_PREVIEW unset) is live and
-- /finance/finance-in-action shows the slate, or in the same sitting as that
-- redeploy. The card appears the moment the row exists, with no deploy; on a
-- build without the flag it opens the legacy FinanceInActionIndex, "0 of 0
-- models available", the page D12 rejects.
--
-- The card opens /finance/finance-in-action: the landing links every row to
-- /finance/<slug>, and App.tsx declares /finance/finance-in-action ahead of
-- /finance/:track, so the card reaches the Finance in Action index and never
-- an empty track index. No finance_modules row points at this slug.
--
-- OWNER-REPLACEABLE: the description is COPY.seoDescription in
-- src/lib/finance-in-action/copy.ts, the section's existing one-line summary
-- ("Company models of IDX-listed companies, rebuilt from their own filings
-- and ordered along the industry chain."). The owner can rewrite it in place
-- (Finance Workspace, Section Metadata) without another migration.
--
-- icon 'Table' is a lucide-react name, like the other five rows' icons; the
-- landing draws the two-digit number, not the icon.
--
-- 20260731070000 counted five rows only while it ran (a DO block, not a
-- constraint), so a sixth row breaks nothing. ON CONFLICT (slug) DO NOTHING:
-- re-running the file, or a row the owner already added, changes nothing.

INSERT INTO public.finance_sections (slug, title, description, icon, sort_order)
VALUES ('finance-in-action', 'Finance in Action',
        'Company models of IDX-listed companies, rebuilt from their own filings and ordered along the industry chain.',
        'Table', 6)
ON CONFLICT (slug) DO NOTHING;

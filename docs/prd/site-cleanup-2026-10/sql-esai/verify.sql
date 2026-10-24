-- After every apply part: the essays (drafts included) that still mention the lecture notes. Expected: no rows.
SELECT slug, section, status FROM public.essays
 WHERE content ~* 'lecture note|Rumpun Akuntansi|AKL\s*[–-]\s*Chapter'
    OR content_json::text ~* 'lecture note|Rumpun Akuntansi|AKL\s*[–-]\s*Chapter'
    OR presentation::text ~* 'lecture note|Rumpun Akuntansi|AKL\s*[–-]\s*Chapter'
 ORDER BY slug;

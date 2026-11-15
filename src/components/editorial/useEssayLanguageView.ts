/**
 * The language × view state both article shells share
 * (docs/prd/essay-language/03-PEMBACA.md §C2–C3).
 *
 * View (Full · Brief) is client state, reset to Full when the essay changes —
 * the Brief's rule, unchanged. Language (EN · ID) lives in the address as
 * `?lang=id`, so an Indonesian link can be shared; English carries no
 * parameter. The rules for what is shown are src/lib/essayLanguage.ts.
 *
 * A shell that is not given `translation` behaves exactly as before: no
 * language toggle, `?lang` ignored, English bodies only.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseBriefDoc, isEmptyBrief } from '@/lib/brief';
import { contentToHtml } from '@/lib/tiptap/serialize';
import {
  essayCells,
  localizeShellFields,
  parseLanguageParam,
  resolveSelection,
  translationBody,
  viewsFor,
  withLanguageParam,
  type EnglishShellFields,
  type EssayLanguage,
  type EssayTranslation,
  type EssayView,
} from '@/lib/essayLanguage';

/** What a page hands a shell: the translation query's result and whether it is still in flight. */
export interface TranslationState {
  data: EssayTranslation | null;
  loading: boolean;
}

interface Args {
  /** English body as the shell renders it (annotations already filtered). */
  content: string;
  /** English HTML for the table of contents. */
  tocHtml: string;
  /** Raw `essays.brief_json`. */
  brief: unknown;
  english: EnglishShellFields;
  translation?: TranslationState;
}

export function useEssayLanguageView({ content, tocHtml, brief, english, translation }: Args) {
  const location = useLocation();
  const navigate = useNavigate();
  const wired = translation !== undefined;
  const data = translation?.data ?? null;
  const loading = translation?.loading ?? false;

  const englishBrief = useMemo(() => {
    const doc = parseBriefDoc(brief);
    return doc && !isEmptyBrief(doc) ? JSON.stringify(doc) : null;
  }, [brief]);

  const cells = useMemo(
    () => essayCells({ hasBrief: englishBrief != null }, wired ? data : null),
    [englishBrief, wired, data],
  );

  const wantedLanguage: EssayLanguage = wired ? parseLanguageParam(new URLSearchParams(location.search).get('lang')) : 'en';
  const [wantedView, setView] = useState<EssayView>('full');
  useEffect(() => {
    setView('full');
  }, [content]);

  const selection = resolveSelection(cells, { language: wantedLanguage, view: wantedView });

  // ?lang=id on an essay without a published Indonesian version: once the
  // query has settled, drop the parameter so the address says what is shown.
  const staleParam = wired && !loading && wantedLanguage === 'id' && selection.language === 'en';
  useEffect(() => {
    if (!staleParam) return;
    navigate({ search: withLanguageParam(location.search, 'en'), hash: location.hash }, { replace: true });
  }, [staleParam, navigate, location.search, location.hash]);

  const setLanguage = (language: EssayLanguage) => {
    if (language === selection.language) return;
    // Keep the reader's view across the switch when the other language has it.
    const next = resolveSelection(cells, { language, view: selection.view });
    setView(next.view);
    navigate({ search: withLanguageParam(location.search, language), hash: location.hash }, { replace: true });
  };

  const isId = selection.language === 'id';
  const isBrief = selection.view === 'brief';

  const body = useMemo(() => {
    if (isId) return translationBody(data, selection.view) ?? content;
    return isBrief && englishBrief ? englishBrief : content;
  }, [isId, isBrief, data, selection.view, content, englishBrief]);

  const toc = useMemo(() => {
    if (!isId) return tocHtml;
    const json = translationBody(data, 'full');
    return json ? contentToHtml(json) : '';
  }, [isId, data, tocHtml]);

  const fields = useMemo(() => localizeShellFields(english, data, selection.language), [english, data, selection.language]);

  return {
    selection,
    setView,
    setLanguage,
    fields,
    body,
    tocHtml: toc,
    isBrief,
    /** `lang` attribute for the translated parts; undefined in English (the page is already en). */
    lang: isId ? ('id' as const) : undefined,
    showLanguageToggle: cells.id != null,
    showViewToggle: viewsFor(cells, selection.language).length > 1,
    /** `?lang=id` asked for and the translation not here yet: render nothing rather than flash English. */
    pending: wired && loading && wantedLanguage === 'id',
  };
}

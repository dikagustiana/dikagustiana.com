import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllFinanceModules } from '@/hooks/queries/useFinance';
import { useFsliPages } from '@/hooks/queries/useFsliPages';
import { CONSOLIDATION_TOPICS } from '@/config/consolidationTopics';
import { buildCanonicalUrl } from '../schema/placement';
import type { WritingSection, WritingCategory, EssayStatus } from '../schema/types';

interface RightSidebarProps {
  // Section/Category
  sections: WritingSection[];
  sectionsLoading: boolean;
  sectionId: string;
  onSectionChange: (id: string) => void;
  categories: WritingCategory[];
  categoriesLoading: boolean;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  // Slug
  slug: string;
  onSlugChange: (slug: string) => void;
  // Status
  status: EssayStatus;
  onStatusChange: (status: EssayStatus) => void;
  // Preview toggle
  showPreview: boolean;
  onTogglePreview: () => void;
  // Finance placement
  moduleId: string | null;
  onModuleIdChange: (id: string | null) => void;
  financeSection: string;
  onFinanceSectionChange: (s: string) => void;
  financeOrder: number | null;
  onFinanceOrderChange: (n: number | null) => void;
  lessonType: string;
  onLessonTypeChange: (t: string) => void;
  // Accounting placement
  fsliSlug: string;
  onFsliSlugChange: (s: string) => void;
  topic: string;
  onTopicChange: (s: string) => void;
  currentSectionSlug: string;
}

const LESSON_TYPE_OPTIONS = ['concept', 'framework', 'case-study', 'exercise', 'model-walkthrough'] as const;
const NONE = '__none__';

function FinanceModulePanel({
  moduleId,
  onModuleIdChange,
  financeOrder,
  onFinanceOrderChange,
  lessonType,
  onLessonTypeChange,
  onFinanceSectionChange,
}: {
  moduleId: string | null;
  onModuleIdChange: (id: string | null) => void;
  financeOrder: number | null;
  onFinanceOrderChange: (n: number | null) => void;
  lessonType: string;
  onLessonTypeChange: (t: string) => void;
  onFinanceSectionChange: (s: string) => void;
}) {
  const { data: allModules = [], isLoading } = useAllFinanceModules();
  const groupedModules = allModules.reduce<Record<string, typeof allModules>>((acc, mod) => {
    if (!acc[mod.track_slug]) acc[mod.track_slug] = [];
    acc[mod.track_slug].push(mod);
    return acc;
  }, {});

  const handleModuleChange = (value: string) => {
    const nextId = value === NONE ? null : value;
    onModuleIdChange(nextId);
    const selectedModule = allModules.find((mod) => mod.id === nextId);
    onFinanceSectionChange(selectedModule?.track_slug || '');
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-background/60">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Finance Module</Label>
      {isLoading ? (
        <div className="h-9 rounded-md bg-muted animate-pulse" />
      ) : (
        <Select value={moduleId || NONE} onValueChange={handleModuleChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Assign module..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— No module —</SelectItem>
            {Object.entries(groupedModules).map(([track, modules]) => (
              <SelectGroup key={track}>
                <SelectLabel>{track}</SelectLabel>
                {modules.map((mod) => (
                  <SelectItem key={mod.id} value={mod.id}>
                    [{mod.track_slug}] {mod.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lesson Order</Label>
        <Input
          type="number"
          min={1}
          value={financeOrder ?? ''}
          onChange={(e) => onFinanceOrderChange(e.target.value ? Number(e.target.value) : null)}
          className="h-9 text-sm"
          placeholder="e.g. 1"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lesson Type</Label>
        <Select value={lessonType} onValueChange={onLessonTypeChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select lesson type" />
          </SelectTrigger>
          <SelectContent>
            {LESSON_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AccountingPlacementPanel({
  fsliSlug,
  onFsliSlugChange,
  topic,
  onTopicChange,
}: {
  fsliSlug: string;
  onFsliSlugChange: (s: string) => void;
  topic: string;
  onTopicChange: (s: string) => void;
}) {
  const { data: fsliPages = [], isLoading } = useFsliPages();

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-background/60">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accounting placement</Label>
      <p className="text-[11px] text-muted-foreground">
        Attach this essay to an FSLI line item or a consolidation topic so it appears under the right
        leaf in the public nav.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FSLI line item</Label>
        {isLoading ? (
          <div className="h-9 rounded-md bg-muted animate-pulse" />
        ) : (
          <Select value={fsliSlug || NONE} onValueChange={(v) => onFsliSlugChange(v === NONE ? '' : v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Assign FSLI line item..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>— None —</SelectItem>
              {fsliPages.map((page) => (
                <SelectItem key={page.id} value={page.slug}>{page.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consolidation topic</Label>
        <Select value={topic || NONE} onValueChange={(v) => onTopicChange(v === NONE ? '' : v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Assign consolidation topic..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— None —</SelectItem>
            {CONSOLIDATION_TOPICS.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function RightSidebar({
  sections,
  sectionsLoading,
  sectionId,
  onSectionChange,
  categories,
  categoriesLoading,
  categoryId,
  onCategoryChange,
  slug,
  onSlugChange,
  status,
  onStatusChange,
  showPreview,
  onTogglePreview,
  moduleId,
  onModuleIdChange,
  financeSection,
  onFinanceSectionChange,
  financeOrder,
  onFinanceOrderChange,
  lessonType,
  onLessonTypeChange,
  fsliSlug,
  onFsliSlugChange,
  topic,
  onTopicChange,
  currentSectionSlug,
}: RightSidebarProps) {
  const { data: allModules = [] } = useAllFinanceModules();

  const selectedModule = allModules.find((m) => m.id === moduleId);
  const categorySlug = categories.find((c) => c.id === categoryId)?.slug || null;
  const canonicalUrl = buildCanonicalUrl({
    sectionSlug: currentSectionSlug,
    slug,
    categorySlug,
    moduleId,
    moduleTrackSlug: selectedModule?.track_slug || null,
    moduleSlug: selectedModule?.slug || null,
    financeSection,
    fsliSlug,
    topic,
  });

  // Reset category when section changes and the selected one no longer belongs.
  useEffect(() => {
    if (sectionId && categoryId) {
      const catBelongsToSection = categories.some(
        (c) => c.id === categoryId && c.section_id === sectionId,
      );
      if (!catBelongsToSection) {
        onCategoryChange('');
      }
    }
  }, [sectionId, categoryId, categories, onCategoryChange]);

  return (
    <aside className="w-72 shrink-0 border-l border-border bg-muted/20 overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Section */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Section <span className="text-destructive">*</span>
          </Label>
          {sectionsLoading ? (
            <div className="h-9 rounded-md bg-muted animate-pulse" />
          ) : (
            <Select value={sectionId} onValueChange={onSectionChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select section..." />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Category (filtered by section) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category <span className="text-destructive">*</span>
          </Label>
          {!sectionId ? (
            <p className="text-xs text-muted-foreground italic">Select a section first.</p>
          ) : categoriesLoading ? (
            <div className="h-9 rounded-md bg-muted animate-pulse" />
          ) : categories.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No categories in this section.</p>
          ) : (
            <Select value={categoryId} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="auto-generated-slug"
            className="h-9 text-sm font-mono"
          />
        </div>

        {currentSectionSlug === 'finance' && (
          <FinanceModulePanel
            moduleId={moduleId}
            onModuleIdChange={onModuleIdChange}
            financeOrder={financeOrder}
            onFinanceOrderChange={onFinanceOrderChange}
            lessonType={lessonType}
            onLessonTypeChange={onLessonTypeChange}
            onFinanceSectionChange={onFinanceSectionChange}
          />
        )}

        {currentSectionSlug === 'accounting' && (
          <AccountingPlacementPanel
            fsliSlug={fsliSlug}
            onFsliSlugChange={onFsliSlugChange}
            topic={topic}
            onTopicChange={onTopicChange}
          />
        )}

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v as EssayStatus)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Canonical URL Preview */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL Preview</Label>
          {canonicalUrl ? (
            <p className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded px-2 py-1.5">
              {canonicalUrl}
            </p>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-500/10 rounded px-2 py-1.5">
              {currentSectionSlug === 'accounting'
                ? 'Pick an FSLI line item or consolidation topic so this essay is reachable.'
                : 'Add a slug to preview the URL.'}
            </p>
          )}
        </div>

        {/* Desktop Preview Toggle */}
        <div className="pt-2">
          <button
            onClick={onTogglePreview}
            className="w-full text-sm text-center py-2 rounded border border-border hover:bg-muted transition-colors"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>
    </aside>
  );
}

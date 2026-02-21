import { useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useAllFinanceModules } from '@/hooks/queries/useFinance';
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
  // Tags
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  // Status
  status: EssayStatus;
  onStatusChange: (status: EssayStatus) => void;
  // Meta
  metaDescription: string;
  onMetaDescriptionChange: (desc: string) => void;
  // Preview toggle
  showPreview: boolean;
  onTogglePreview: () => void;
  moduleId: string | null;
  onModuleIdChange: (id: string | null) => void;
  financeSection: string;
  onFinanceSectionChange: (s: string) => void;
  financeOrder: number | null;
  onFinanceOrderChange: (n: number | null) => void;
  lessonType: string;
  onLessonTypeChange: (t: string) => void;
  currentSectionSlug: string;
}

const LESSON_TYPE_OPTIONS = ['concept', 'framework', 'case-study', 'exercise', 'model-walkthrough'] as const;

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
  const groupedModules = useMemo(() => {
    return allModules.reduce<Record<string, typeof allModules>>((acc, mod) => {
      if (!acc[mod.track_slug]) acc[mod.track_slug] = [];
      acc[mod.track_slug].push(mod);
      return acc;
    }, {});
  }, [allModules]);

  const handleModuleChange = (value: string) => {
    const nextId = value === '__none__' ? null : value;
    onModuleIdChange(nextId);
    const selectedModule = allModules.find(mod => mod.id === nextId);
    onFinanceSectionChange(selectedModule?.track_slug || '');
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-background/60">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Finance Module</Label>
      {isLoading ? (
        <div className="h-9 rounded-md bg-muted animate-pulse" />
      ) : (
        <Select value={moduleId || '__none__'} onValueChange={handleModuleChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Assign module..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No module —</SelectItem>
            {Object.entries(groupedModules).map(([track, modules]) => (
              <SelectGroup key={track}>
                <SelectLabel>{track}</SelectLabel>
                {modules.map(mod => (
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
          onChange={e => onFinanceOrderChange(e.target.value ? Number(e.target.value) : null)}
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
            {LESSON_TYPE_OPTIONS.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
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
  tags,
  onTagsChange,
  status,
  onStatusChange,
  metaDescription,
  onMetaDescriptionChange,
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
  currentSectionSlug,
}: RightSidebarProps) {
  const { data: allModules } = useAllFinanceModules();

  const canonicalUrl = useMemo(() => {
    if (!slug) return '';
    const section = sections.find(s => s.id === sectionId);
    if (!section) return `/${slug}`;
    switch (section.slug) {
      case 'green-transition': {
        const cat = categories.find(c => c.id === categoryId);
        const phase = cat?.slug?.replace(`${section.slug}-`, '') || 'general';
        return `/green-transition/${phase}/${slug}`;
      }
      case 'next-big-thing':
        return `/the-next-big-thing/${slug}`;
      case 'finance':
        if (moduleId && allModules) {
          const mod = allModules.find(m => m.id === moduleId);
          if (mod) return `/finance/${mod.track_slug}/${mod.slug}/${slug}`;
        }
        if (financeSection) return `/finance/${financeSection}/${slug}`;
        return `/finance/${slug}`;
      case 'critical-thinking': {
        const cat = categories.find(c => c.id === categoryId);
        const phase = cat?.slug?.replace(`${section.slug}-`, '') || 'clarify';
        return `/critical-thinking-research/${phase}/${slug}`;
      }
      default:
        return `/${section.slug}/${slug}`;
    }
  }, [slug, sectionId, categoryId, sections, categories, moduleId, allModules, financeSection]);

  // Reset category when section changes
  useEffect(() => {
    if (sectionId && categoryId) {
      const catBelongsToSection = categories.some(
        c => c.id === categoryId && c.section_id === sectionId
      );
      if (!catBelongsToSection) {
        onCategoryChange('');
      }
    }
  }, [sectionId, categoryId, categories, onCategoryChange]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const value = input.value.trim();
      if (value && !tags.includes(value)) {
        onTagsChange([...tags, value]);
      }
      input.value = '';
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

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
                {sections.map(s => (
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
                {categories.map(c => (
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
            onChange={e => onSlugChange(e.target.value)}
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

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</Label>
          <Input
            placeholder="Type and press Enter..."
            className="h-9 text-sm"
            onKeyDown={handleTagKeyDown}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
          <Select value={status} onValueChange={v => onStatusChange(v as EssayStatus)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Meta Description */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta Description</Label>
          <Textarea
            value={metaDescription}
            onChange={e => onMetaDescriptionChange(e.target.value)}
            placeholder="Brief description for search engines..."
            className="text-sm min-h-[60px] resize-none"
            maxLength={160}
          />
          <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
        </div>

        {/* Canonical URL Preview */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL Preview</Label>
          <p className="text-xs font-mono text-muted-foreground break-all bg-muted/50 rounded px-2 py-1.5">
            {canonicalUrl || '/...'}
          </p>
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

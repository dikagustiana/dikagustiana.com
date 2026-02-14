/**
 * PostSettingsPanel — Collapsible metadata panel.
 *
 * Lives below the editor. Collapsed by default so the writing
 * surface dominates the page. Contains all fields that are NOT
 * the body content:
 *   - Section (also shown in the header bar)
 *   - Phase (section-aware dropdown), Voice Role, Status
 *   - FSLI picker (when section=accounting, phase=fsli)
 *   - Topic picker (when phase needs sub-topic)
 *   - Finance Domain & Order (when section=finance)
 *   - Fundamental picker (when finance_section=fundamentals)
 *   - Slug, Author, Date, Read Time
 *   - Snippet
 *   - Template selector (new essays only)
 *
 * Rules:
 *   - Metadata is optional during drafting.
 *   - Metadata is required only at publish (validated separately).
 *   - Changing metadata never reinitializes the editor.
 */

import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemplateSelector } from '@/components/admin/TemplateSelector';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import type { Section } from '@/hooks/queries/useSections';
import type { VoiceRole, ContentStatus } from '@/lib/types/toneFields';
import type { EssayTemplateType } from '@/lib/essayTemplates';
import { SECTION_PHASE_CONFIG, PHASE_TOPIC_CONFIG, FINANCE_DOMAIN_OPTIONS } from '@/lib/admin/sectionPhaseConfig';
import type { FsliPage } from '@/hooks/queries/useFsliPages';
import type { FinanceFundamental } from '@/hooks/queries/useFinance';

interface PostSettingsPanelProps {
  // Section
  sections: Section[] | undefined;
  sectionsLoading: boolean;
  sectionValue: string;
  onSectionChange: (value: string) => void;

  // Resolved section slug (after slug resolution)
  resolvedSection: string;

  // Phase
  phase: string;
  onPhaseChange: (value: string) => void;

  // FSLI
  fsliSlug: string;
  onFsliSlugChange: (value: string) => void;
  fsliPages: FsliPage[] | undefined;

  // Topic
  topic: string;
  onTopicChange: (value: string) => void;

  // Finance-specific
  financeSection: string;
  onFinanceSectionChange: (value: string) => void;
  financeOrder: string;
  onFinanceOrderChange: (value: string) => void;
  fundamentals: FinanceFundamental[] | undefined;

  // Voice role
  voiceRole: VoiceRole;
  onVoiceRoleChange: (value: VoiceRole) => void;

  // Status
  status: ContentStatus;
  onStatusChange: (value: ContentStatus) => void;

  // Slug
  slug: string;
  onSlugChange: (value: string) => void;

  // Author
  author: string;
  onAuthorChange: (value: string) => void;

  // Date
  date: string;
  onDateChange: (value: string) => void;

  // Read time
  readTime: string;
  onReadTimeChange: (value: string) => void;

  // Snippet
  snippet: string;
  onSnippetChange: (value: string) => void;

  // Template (new essays only)
  isNew: boolean;
  selectedTemplate: EssayTemplateType;
  onTemplateSelect: (template: EssayTemplateType) => void;
}

export function PostSettingsPanel({
  sections,
  sectionsLoading,
  sectionValue,
  onSectionChange,
  resolvedSection,
  phase,
  onPhaseChange,
  fsliSlug,
  onFsliSlugChange,
  fsliPages,
  topic,
  onTopicChange,
  financeSection,
  onFinanceSectionChange,
  financeOrder,
  onFinanceOrderChange,
  fundamentals,
  voiceRole,
  onVoiceRoleChange,
  status,
  onStatusChange,
  slug,
  onSlugChange,
  author,
  onAuthorChange,
  date,
  onDateChange,
  readTime,
  onReadTimeChange,
  snippet,
  onSnippetChange,
  isNew,
  selectedTemplate,
  onTemplateSelect,
}: PostSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Finance section active?
  const isFinance = resolvedSection === 'finance';

  // Look up phase config for the current section
  const phaseConfig = useMemo(
    () => resolvedSection ? SECTION_PHASE_CONFIG[resolvedSection] : undefined,
    [resolvedSection],
  );

  // Look up topic config for the current section + phase
  const topicConfig = useMemo(() => {
    if (!resolvedSection || !phase) return undefined;
    return PHASE_TOPIC_CONFIG[`${resolvedSection}/${phase}`];
  }, [resolvedSection, phase]);

  // Show FSLI picker when section=accounting and phase=fsli
  const showFsliPicker = resolvedSection === 'accounting' && phase === 'fsli';

  // Show fundamental topic picker when finance_section=fundamentals
  const showFundamentalPicker = isFinance && financeSection === 'fundamentals';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} id="post-settings">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg border border-border transition-colors">
        <Settings2 className="h-4 w-4" />
        <span className="flex-1 text-left">Post Settings</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 rounded-lg border border-border bg-card p-4 space-y-6">
        {/* Template (new essays only) */}
        {isNew && (
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
          />
        )}

        {/* Section & Phase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2" id="section-selector">
            <Label htmlFor="settings-section">Section</Label>
            {sectionsLoading ? (
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            ) : (
              <Select value={sectionValue} onValueChange={(v) => onSectionChange(v.trim())}>
                <SelectTrigger id="settings-section">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((s) => (
                    <SelectItem key={s.id} value={s.slug}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Phase — dropdown when config exists, hidden otherwise */}
          {phaseConfig && (
            <div className="space-y-2">
              <Label htmlFor="settings-phase">{phaseConfig.phaseLabel}</Label>
              <Select value={phase} onValueChange={onPhaseChange}>
                <SelectTrigger id="settings-phase">
                  <SelectValue placeholder={`Select ${phaseConfig.phaseLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {phaseConfig.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Finance Domain & Order — shown when section=finance */}
        {isFinance && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-finance-section">Finance Domain</Label>
              <Select value={financeSection} onValueChange={onFinanceSectionChange}>
                <SelectTrigger id="settings-finance-section">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_DOMAIN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-finance-order">Finance Order</Label>
              <Input
                id="settings-finance-order"
                type="number"
                value={financeOrder}
                onChange={(e) => onFinanceOrderChange(e.target.value)}
                placeholder="Sort position"
                min={0}
              />
            </div>
          </div>
        )}

        {/* Fundamental picker — shown when finance domain = fundamentals */}
        {showFundamentalPicker && (
          <div className="space-y-2">
            <Label htmlFor="settings-fundamental">Fundamental</Label>
            <Select value={topic} onValueChange={onTopicChange}>
              <SelectTrigger id="settings-fundamental">
                <SelectValue placeholder="Select fundamental" />
              </SelectTrigger>
              <SelectContent>
                {fundamentals?.map((f) => (
                  <SelectItem key={f.slug} value={f.slug}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Links this essay to a fundamental concept on the Fundamentals page.
            </p>
          </div>
        )}

        {/* FSLI picker — shown when section=accounting, phase=fsli */}
        {showFsliPicker && (
          <div className="space-y-2">
            <Label htmlFor="settings-fsli">FSLI Line Item</Label>
            <Select value={fsliSlug} onValueChange={onFsliSlugChange}>
              <SelectTrigger id="settings-fsli">
                <SelectValue placeholder="Select FSLI page" />
              </SelectTrigger>
              <SelectContent>
                {fsliPages?.map((page) => (
                  <SelectItem key={page.id} value={page.slug}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The essay will appear on the selected FSLI detail page.
            </p>
          </div>
        )}

        {/* Topic picker — shown when phase has sub-topics (non-finance) */}
        {topicConfig && (
          <div className="space-y-2">
            <Label htmlFor="settings-topic">{topicConfig.topicLabel}</Label>
            <Select value={topic} onValueChange={onTopicChange}>
              <SelectTrigger id="settings-topic">
                <SelectValue placeholder={`Select ${topicConfig.topicLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {topicConfig.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Voice Role & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-voice-role">Voice Role</Label>
            <Select value={voiceRole} onValueChange={(v) => onVoiceRoleChange(v as VoiceRole)}>
              <SelectTrigger id="settings-voice-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="economist">Economist</SelectItem>
                <SelectItem value="educator">Educator</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-status">Status</Label>
            <Select value={status} onValueChange={(v) => onStatusChange(v as ContentStatus)}>
              <SelectTrigger id="settings-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="tone_pending">Tone Pending</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Slug & Author */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-slug">Slug</Label>
            <Input
              id="settings-slug"
              value={slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="url-friendly-slug"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-author">Author</Label>
            <Input
              id="settings-author"
              value={author}
              onChange={(e) => onAuthorChange(e.target.value)}
              placeholder="Author name"
            />
          </div>
        </div>

        {/* Date & Read Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="settings-date">Date</Label>
            <Input
              id="settings-date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              placeholder="e.g., January 2025"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-read-time">Read Time</Label>
            <Input
              id="settings-read-time"
              value={readTime}
              onChange={(e) => onReadTimeChange(e.target.value)}
              placeholder="e.g., 5 min read"
            />
          </div>
        </div>

        {/* Snippet */}
        <div className="space-y-2">
          <Label htmlFor="settings-snippet">Snippet (Preview Text)</Label>
          <Textarea
            id="settings-snippet"
            value={snippet}
            onChange={(e) => onSnippetChange(e.target.value)}
            placeholder="A brief preview of the content..."
            rows={2}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

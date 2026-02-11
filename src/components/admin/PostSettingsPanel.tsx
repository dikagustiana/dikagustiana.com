/**
 * PostSettingsPanel — Collapsible metadata panel.
 *
 * Lives below the editor. Collapsed by default so the writing
 * surface dominates the page. Contains all fields that are NOT
 * the body content:
 *   - Section (also shown in the header bar)
 *   - Phase, Voice Role, Status
 *   - Slug, Author, Date, Read Time
 *   - Snippet
 *   - Template selector (new essays only)
 *
 * Rules:
 *   - Metadata is optional during drafting.
 *   - Metadata is required only at publish (validated separately).
 *   - Changing metadata never reinitializes the editor.
 */

import { useState } from 'react';
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

interface PostSettingsPanelProps {
  // Section
  sections: Section[] | undefined;
  sectionsLoading: boolean;
  sectionValue: string;
  onSectionChange: (value: string) => void;

  // Phase
  phase: string;
  onPhaseChange: (value: string) => void;

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
  phase,
  onPhaseChange,
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
          <div className="space-y-2">
            <Label htmlFor="settings-phase">Phase</Label>
            <Input
              id="settings-phase"
              value={phase}
              onChange={(e) => onPhaseChange(e.target.value)}
              placeholder="e.g., now, transition"
            />
          </div>
        </div>

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

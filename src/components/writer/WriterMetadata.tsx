import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useAllFinanceModules } from '@/hooks/queries/useFinance';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface WriterMetadataProps {
  title: string;
  setTitle: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  phase: string;
  setPhase: (v: string) => void;
  phaseOptions: { id: string; label: string }[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  categories: CategoryOption[];
  author: string;
  setAuthor: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  deck: string;
  setDeck: (v: string) => void;
  heroImageUrl: string;
  setHeroImageUrl: (v: string) => void;
  heroCaption: string;
  setHeroCaption: (v: string) => void;
  keyTakeaways: string[];
  setKeyTakeaways: (v: string[]) => void;
  references: { label: string; url: string }[];
  setReferences: (v: { label: string; url: string }[]) => void;
  authorBio: string;
  setAuthorBio: (v: string) => void;
  isNew: boolean;
  moduleId: string | null;
  setModuleId: (v: string | null) => void;
  financeOrder: number | null;
  setFinanceOrder: (v: number | null) => void;
  lessonType: string;
  setLessonType: (v: string) => void;
  isFinanceSection: boolean;
}

export function WriterMetadata({
  title,
  setTitle,
  slug,
  setSlug,
  phase,
  setPhase,
  phaseOptions,
  categoryId,
  setCategoryId,
  categories,
  author,
  setAuthor,
  date,
  setDate,
  deck,
  setDeck,
  heroImageUrl,
  setHeroImageUrl,
  heroCaption,
  setHeroCaption,
  keyTakeaways,
  setKeyTakeaways,
  references,
  setReferences,
  authorBio,
  setAuthorBio,
  isNew,
  moduleId,
  setModuleId,
  financeOrder,
  setFinanceOrder,
  lessonType,
  setLessonType,
  isFinanceSection,
}: WriterMetadataProps) {
  const { data: allFinanceModules = [] } = useAllFinanceModules();

  const modulesByTrack = allFinanceModules.reduce<Record<string, typeof allFinanceModules>>((acc, mod) => {
    if (!acc[mod.track_slug]) acc[mod.track_slug] = [];
    acc[mod.track_slug].push(mod);
    return acc;
  }, {});

  // Key takeaways handlers
  const updateTakeaway = (index: number, value: string) => {
    const updated = [...keyTakeaways];
    updated[index] = value;
    setKeyTakeaways(updated);
  };

  const addTakeaway = () => {
    setKeyTakeaways([...keyTakeaways, '']);
  };

  const removeTakeaway = (index: number) => {
    if (keyTakeaways.length <= 3) return; // Keep minimum 3
    setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index));
  };

  // References handlers
  const updateReference = (index: number, field: 'label' | 'url', value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const addReference = () => {
    setReferences([...references, { label: '', url: '' }]);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Essay Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a compelling title..."
              className="text-lg font-medium"
            />
          </div>

          {/* Slug & Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-slug"
                disabled={!isNew}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              {/* For a curriculum essay the module determines this, so it is
                  shown derived and read-only — one field set instead of three
                  (DECISIONS.md 2026-08-01). The old asterisk is gone from the
                  editable variant too: validateEssay never checked the field,
                  so "required" was decorative — the worst of both options. */}
              {isFinanceSection && moduleId ? (
                <>
                  <Label>Topic/Phase</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                    {(() => {
                      const mod = allFinanceModules.find(m => m.id === moduleId);
                      const label = phaseOptions.find(o => o.id === phase)?.label ?? phase ?? '—';
                      return mod
                        ? `Derived from module: ${label} · ${mod.slug.toUpperCase()}`
                        : `Derived from module: ${label}`;
                    })()}
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="phase">Topic/Phase</Label>
                  <Select value={phase} onValueChange={setPhase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {phaseOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>

          {/* Category (dependent on section) */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Author & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Publish Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Deck line */}
          <div className="space-y-2">
            <Label htmlFor="deck">Deck Line (One Sentence Thesis) *</Label>
            <Textarea
              id="deck"
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              placeholder="A single sentence that captures the essay's core argument..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This appears below the title. Make it compelling.
            </p>
          </div>
        </CardContent>
      </Card>


      {isFinanceSection && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Finance Module</CardTitle>
            <CardDescription>Assign this lesson to a module and set ordering metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={moduleId || '__none__'}
                onValueChange={(v) => setModuleId(v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select finance module..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No module —</SelectItem>
                  {Object.entries(modulesByTrack).map(([track, modules]) => (
                    <SelectGroup key={track}>
                      <SelectLabel>{track}</SelectLabel>
                      {modules.map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>[{mod.track_slug}] {mod.title}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finance Order</Label>
                <Input
                  type="number"
                  min={1}
                  value={financeOrder ?? ''}
                  onChange={(e) => setFinanceOrder(e.target.value ? Number(e.target.value) : null)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Lesson Type</Label>
                <Select value={lessonType} onValueChange={setLessonType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Lesson type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concept">concept</SelectItem>
                    <SelectItem value="framework">framework</SelectItem>
                    <SelectItem value="case-study">case-study</SelectItem>
                    <SelectItem value="exercise">exercise</SelectItem>
                    <SelectItem value="model-walkthrough">model-walkthrough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hero Image */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Hero Image (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroUrl">Image URL</Label>
            <Input
              id="heroUrl"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroCaption">Caption</Label>
            <Input
              id="heroCaption"
              value={heroCaption}
              onChange={(e) => setHeroCaption(e.target.value)}
              placeholder="Photo credit or description..."
            />
          </div>
          {heroImageUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={heroImageUrl}
                alt="Hero preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Takeaways */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Key Takeaways</CardTitle>
          <CardDescription>
            {/* Mirror the gate exactly: the per-lesson-type relaxation only
                applies when WriterEditor passes a real lesson type, which it
                does only for module-placed finance lessons. Everywhere else
                validateEssay runs strict, so the guidance must too. */}
            {isFinanceSection && moduleId
              ? 'Three required for concept and framework lessons; optional (but all-or-nothing) for case studies, exercises and model walkthroughs. They appear at the end of the article.'
              : 'Three are required to publish. They appear at the end of the article.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keyTakeaways.map((takeaway, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <Input
                value={takeaway}
                onChange={(e) => updateTakeaway(index, e.target.value)}
                placeholder={`Takeaway ${index + 1}...`}
                className="flex-1"
              />
              {keyTakeaways.length > 3 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTakeaway(index)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addTakeaway}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Takeaway
          </Button>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">References</CardTitle>
          <CardDescription>
            Optional. Add sources and citations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {references.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No references added yet.
            </p>
          ) : (
            references.map((ref, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground mt-2">[{index + 1}]</span>
                <div className="flex-1 space-y-2">
                  <Input
                    value={ref.label}
                    onChange={(e) => updateReference(index, 'label', e.target.value)}
                    placeholder="Reference title or description..."
                  />
                  <Input
                    value={ref.url}
                    onChange={(e) => updateReference(index, 'url', e.target.value)}
                    placeholder="URL (optional)"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeReference(index)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addReference}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Reference
          </Button>
        </CardContent>
      </Card>

      {/* Author Bio */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Author Bio (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={authorBio}
            onChange={(e) => setAuthorBio(e.target.value)}
            placeholder="Short bio for the author box at the end of the article..."
            rows={2}
          />
        </CardContent>
      </Card>
    </div>
  );
}

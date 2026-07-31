import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from './RichTextEditor';
import { ContentPreview } from './ContentPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Edit3,
  Eye,
  Columns,
  Maximize2,
  Minimize2,
  Save,
  ArrowLeft,
} from 'lucide-react';

export type ViewMode = 'editor' | 'preview' | 'split';

interface WriterModeEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  snippet: string;
  onSnippetChange: (snippet: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  author?: string;
  date?: string;
  readTime?: string;
  onSave: () => void;
  onBack: () => void;
  isSaving?: boolean;
  isNew?: boolean;
}

export function WriterModeEditor({
  title,
  onTitleChange,
  snippet,
  onSnippetChange,
  content,
  onContentChange,
  author,
  date,
  readTime,
  onSave,
  onBack,
  isSaving = false,
  isNew = false,
}: WriterModeEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  // Handle escape to exit distraction-free mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDistractionFree) {
        setIsDistractionFree(false);
      }
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDistractionFree, onSave]);

  // Toggle distraction-free mode
  const toggleDistractionFree = useCallback(() => {
    setIsDistractionFree((prev) => !prev);
    if (!isDistractionFree) {
      setViewMode('editor');
    }
  }, [isDistractionFree]);

  // Distraction-free mode
  if (isDistractionFree) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Minimal header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDistractionFree(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4 mr-2" />
            Exit Focus Mode
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to exit
            </span>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Full-screen editor */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-3xl mx-auto h-full flex flex-col py-8 px-4">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Title"
              className="text-4xl font-display font-bold bg-transparent border-none outline-none mb-4 placeholder:text-muted-foreground/50"
            />
            <textarea
              value={snippet}
              onChange={(e) => onSnippetChange(e.target.value)}
              placeholder="Write a brief summary..."
              className="text-lg text-muted-foreground bg-transparent border-none outline-none resize-none mb-6 placeholder:text-muted-foreground/40"
              rows={2}
            />
            <div className="flex-1 overflow-y-auto">
              <RichTextEditor
                content={content}
                onChange={onContentChange}
                placeholder="Start writing your content..."
                distractionFree
                minHeight="calc(100vh - 280px)"
                className="border-0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm font-medium">
            {isNew ? 'New Essay' : 'Editing'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('editor')}
              className="rounded-none border-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="rounded-none border-0"
            >
              <Columns className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="rounded-none border-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleDistractionFree}
            title="Focus Mode (distraction-free)"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="writer-title">Title</Label>
                  <Input
                    id="writer-title"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Essay title"
                    className="text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="writer-snippet">Summary</Label>
                  <Textarea
                    id="writer-snippet"
                    value={snippet}
                    onChange={(e) => onSnippetChange(e.target.value)}
                    placeholder="Brief summary of your essay..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <RichTextEditor
                    content={content}
                    onChange={onContentChange}
                    placeholder="Start writing your content..."
                    minHeight="400px"
                  />
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full overflow-y-auto p-8 bg-muted/30 border-l border-border">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-4 font-medium">
                  Live Preview
                </div>
                <ContentPreview
                  title={title}
                  snippet={snippet}
                  content={content}
                  author={author}
                  date={date}
                  readTime={readTime}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : viewMode === 'editor' ? (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-4">
            <div className="space-y-2">
              <Label htmlFor="writer-title-full">Title</Label>
              <Input
                id="writer-title-full"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Essay title"
                className="text-xl font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="writer-snippet-full">Summary</Label>
              <Textarea
                id="writer-snippet-full"
                value={snippet}
                onChange={(e) => onSnippetChange(e.target.value)}
                placeholder="Brief summary of your essay..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                content={content}
                onChange={onContentChange}
                placeholder="Start writing your content..."
                minHeight="500px"
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8 bg-muted/30">
            <ContentPreview
              title={title}
              snippet={snippet}
              content={content}
              author={author}
              date={date}
              readTime={readTime}
            />
          </div>
        )}
      </div>
    </div>
  );
}

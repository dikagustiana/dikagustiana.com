/**
 * FigureUploader — Image/graph upload dialog for the editor.
 *
 * Changes from original:
 *   - `section` is now optional. Figures can be inserted at any time
 *     regardless of which section is selected.
 *   - Source validation is no longer enforced at insert time.
 *     It is checked only at publish (see publishValidation.ts).
 *   - Upload path defaults to 'drafts/' when no section is set.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Image as ImageIcon,
  Upload,
  Link,
  X,
  Check,
  Loader2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { FigureBlockData } from './FigureBlock';

interface FigureUploaderProps {
  onInsert: (data: FigureBlockData) => void;
  onCancel: () => void;
  /** Optional — used only for the storage upload path. */
  section?: string;
  initialData?: FigureBlockData;
}

type UploadMode = 'upload' | 'url';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const WARN_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function FigureUploader({ onInsert, onCancel, section, initialData }: FigureUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<UploadMode>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Figure data state
  const [imageSrc, setImageSrc] = useState(initialData?.src || '');
  const [altText, setAltText] = useState(initialData?.altText || '');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [sourceName, setSourceName] = useState(initialData?.sourceName || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [noSource, setNoSource] = useState(initialData?.noSource || false);
  const [widthMode, setWidthMode] = useState<'content' | 'wide'>(initialData?.widthMode || 'content');
  const [kind, setKind] = useState<'image' | 'graph'>(initialData?.kind || 'image');
  const [naturalWidth, setNaturalWidth] = useState(initialData?.naturalWidth);
  const [naturalHeight, setNaturalHeight] = useState(initialData?.naturalHeight);

  // Warnings
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);

  // Source is never required at insert time — validated at publish only
  const canInsert = !!imageSrc && !!altText.trim();

  // Handle paste from clipboard (within the uploader dialog)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleFileUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PNG, JPG, or WebP images only.',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > WARN_FILE_SIZE) {
      setSizeWarning(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Consider optimizing for faster loading.`);
    } else {
      setSizeWarning(null);
    }

    return true;
  };

  const checkAspectRatio = (width: number, height: number) => {
    const ratio = height / width;
    if (ratio > 2) {
      setAspectWarning('Very tall image may hurt reading flow. Consider cropping.');
    } else {
      setAspectWarning(null);
    }
    setNaturalWidth(width);
    setNaturalHeight(height);
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);

    try {
      // Generate unique filename — use section for path if available, else 'drafts'
      const ext = file.name.split('.').pop() || 'png';
      const folder = section || 'drafts';
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('essay-images')
        .upload(filename, file, {
          cacheControl: '31536000', // 1 year
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('essay-images')
        .getPublicUrl(filename);

      console.log('Image public URL:', urlData.publicUrl);
      setImageSrc(urlData.publicUrl);

      // Get dimensions from loaded image
      const img = new window.Image();
      img.onload = () => checkAspectRatio(img.width, img.height);
      img.src = urlData.publicUrl;

      toast({ title: 'Image uploaded!' });
    } catch (error) {
      console.error('Upload failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown',
        statusCode: (error as Record<string, unknown>)?.statusCode,
      });
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handleFileUpload(file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadUrl = async () => {
    if (!urlInput.trim()) return;

    setIsLoadingUrl(true);

    // Validate URL format
    try {
      new URL(urlInput);
    } catch {
      toast({
        title: 'Invalid URL',
        description: 'Please enter a valid image URL.',
        variant: 'destructive',
      });
      setIsLoadingUrl(false);
      return;
    }

    // Load image to get dimensions
    const img = new window.Image();
    img.onload = () => {
      checkAspectRatio(img.width, img.height);
      setImageSrc(urlInput.trim());
      setIsLoadingUrl(false);
    };
    img.onerror = () => {
      toast({
        title: 'Failed to load image',
        description: 'Could not load image from URL. Check the URL is valid and accessible.',
        variant: 'destructive',
      });
      setIsLoadingUrl(false);
    };
    img.src = urlInput.trim();
  };

  const handleInsert = () => {
    const data: FigureBlockData = {
      src: imageSrc,
      altText: altText.trim(),
      caption: caption.trim() || undefined,
      sourceName: sourceName.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      noSource,
      widthMode,
      kind,
      naturalWidth,
      naturalHeight,
      aspectRatio: naturalWidth && naturalHeight ? naturalHeight / naturalWidth : undefined,
    };
    onInsert(data);
  };

  return (
    <Card className="p-4 space-y-4 border-2 border-dashed border-primary/20 bg-card">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('upload')}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
        <Button
          type="button"
          variant={mode === 'url' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('url')}
        >
          <Link className="h-4 w-4 mr-1" />
          URL
        </Button>
      </div>

      {/* Upload zone */}
      {mode === 'upload' && !imageSrc && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drop image here, paste from clipboard, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/75 mt-1">
                PNG, JPG, WebP &bull; Max 5MB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && !imageSrc && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleLoadUrl}
              disabled={!urlInput.trim() || isLoadingUrl}
            >
              {isLoadingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste any public image URL and click Load
          </p>
        </div>
      )}

      {/* Preview */}
      {imageSrc && (
        <div className="relative">
          <img
            src={imageSrc}
            alt={altText || 'Preview'}
            className="w-full max-h-48 object-contain rounded-lg bg-muted"
            onLoad={(e) => {
              const img = e.currentTarget;
              checkAspectRatio(img.naturalWidth, img.naturalHeight);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 hover:bg-background"
            onClick={() => {
              setImageSrc('');
              setUrlInput('');
              setSizeWarning(null);
              setAspectWarning(null);
              setNaturalWidth(undefined);
              setNaturalHeight(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Warnings */}
      {(sizeWarning || aspectWarning) && (
        <div className="space-y-1">
          {sizeWarning && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {sizeWarning}
            </p>
          )}
          {aspectWarning && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {aspectWarning}
            </p>
          )}
        </div>
      )}

      {/* Fields */}
      {imageSrc && (
        <div className="space-y-4">
          {/* Kind toggle */}
          <div className="space-y-2">
            <Label className="text-sm">Type</Label>
            <RadioGroup
              value={kind}
              onValueChange={(v) => setKind(v as 'image' | 'graph')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="kind-image" />
                <Label htmlFor="kind-image" className="text-sm font-normal flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" /> Image
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="graph" id="kind-graph" />
                <Label htmlFor="kind-graph" className="text-sm font-normal flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" /> Graph
                </Label>
              </div>
            </RadioGroup>
            {kind === 'graph' && (
              <p className="text-xs text-muted-foreground">
                Graphs have tap-to-zoom for mobile readability
              </p>
            )}
          </div>

          {/* Alt text */}
          <div className="space-y-1">
            <Label className="text-sm">
              Alt text <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Describe the image for accessibility"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
            />
          </div>

          {/* Caption */}
          <div className="space-y-1">
            <Label className="text-sm">Caption</Label>
            <Textarea
              placeholder="Optional caption displayed below image"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
          </div>

          {/* Source — always optional at insert time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Source</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={noSource}
                  onChange={(e) => setNoSource(e.target.checked)}
                  className="rounded"
                />
                Original/self-created
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Source name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                disabled={noSource}
              />
              <Input
                placeholder="Source URL (optional)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={noSource}
              />
            </div>
          </div>

          {/* Width mode */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Wide width</Label>
            <Switch
              checked={widthMode === 'wide'}
              onCheckedChange={(checked) => setWidthMode(checked ? 'wide' : 'content')}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleInsert}
          disabled={!canInsert}
        >
          <Check className="h-4 w-4 mr-1" />
          {initialData ? 'Update Figure' : 'Insert Figure'}
        </Button>
      </div>
    </Card>
  );
}

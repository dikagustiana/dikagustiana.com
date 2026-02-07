import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
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
} from 'lucide-react';
import { ImageBlockData } from './ImageBlock';

interface ImageUploaderProps {
  onInsert: (data: ImageBlockData) => void;
  onCancel: () => void;
  section: 'next-big-thing' | 'green-transition';
  initialData?: ImageBlockData;
}

type UploadMode = 'upload' | 'url';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function ImageUploader({ onInsert, onCancel, section, initialData }: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<UploadMode>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Image data state
  const [imageUrl, setImageUrl] = useState(initialData?.src || '');
  const [alt, setAlt] = useState(initialData?.alt || '');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [sourceName, setSourceName] = useState(initialData?.sourceName || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [isFullWidth, setIsFullWidth] = useState(initialData?.widthMode === 'full');
  const [noSourceReason, setNoSourceReason] = useState(false);

  // Warnings
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);

  const isGreenTransition = section === 'green-transition';
  const sourceRequired = isGreenTransition && !noSourceReason;
  const canInsert = imageUrl && alt && (!sourceRequired || sourceName);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
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
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'png';
      const filename = `${section}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

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

      setImageUrl(urlData.publicUrl);

      // Check aspect ratio
      const img = new window.Image();
      img.onload = () => checkAspectRatio(img.width, img.height);
      img.src = urlData.publicUrl;

      toast({ title: 'Image uploaded!' });
    } catch (error) {
      console.error('Upload error:', error);
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
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInsert = () => {
    const data: ImageBlockData = {
      src: imageUrl,
      alt,
      caption: caption || undefined,
      sourceName: sourceName || undefined,
      sourceUrl: sourceUrl || undefined,
      widthMode: isFullWidth ? 'full' : 'content',
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
      {mode === 'upload' && !imageUrl && (
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
                PNG, JPG, WebP • Max 2MB recommended
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
      {mode === 'url' && !imageUrl && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (urlInput.trim()) {
                  setImageUrl(urlInput.trim());
                }
              }}
              disabled={!urlInput.trim()}
            >
              Load
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste any public image URL and click Load
          </p>
        </div>
      )}

      {/* Preview */}
      {imageUrl && (
        <div className="relative">
          <img
            src={imageUrl}
            alt={alt || 'Preview'}
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
              setImageUrl('');
              setUrlInput('');
              setSizeWarning(null);
              setAspectWarning(null);
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
      {imageUrl && (
        <div className="space-y-3">
          {/* Alt text - Required */}
          <div className="space-y-1">
            <Label className="text-sm">
              Alt text <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Describe the image for accessibility"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </div>

          {/* Caption - Optional */}
          <div className="space-y-1">
            <Label className="text-sm">Caption</Label>
            <Textarea
              placeholder="Optional caption displayed below image"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
            />
          </div>

          {/* Source - Required for Green Transition */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Source
                {isGreenTransition && !noSourceReason && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              {isGreenTransition && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={noSourceReason}
                    onChange={(e) => setNoSourceReason(e.target.checked)}
                    className="rounded"
                  />
                  No source (original/self-created)
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Source name"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                disabled={noSourceReason}
              />
              <Input
                placeholder="Source URL (optional)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                disabled={noSourceReason}
              />
            </div>
          </div>

          {/* Width mode */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Full width</Label>
            <Switch
              checked={isFullWidth}
              onCheckedChange={setIsFullWidth}
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
          Insert Image
        </Button>
      </div>
    </Card>
  );
}

import { useState, useCallback, useRef } from 'react';
import { RichTextEditor, htmlToMarkdown } from '@/components/admin/RichTextEditor';
import { ImageUploader } from '@/components/editorial/ImageUploader';
import { ImageBlockData, serializeImageBlock } from '@/components/editorial/ImageBlock';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EssayBodyEditorProps {
  content: string;
  onChange: (content: string) => void;
  section: 'next-big-thing' | 'green-transition';
  distractionFree?: boolean;
  minHeight?: string;
}

export function EssayBodyEditor({
  content,
  onChange,
  section,
  distractionFree = false,
  minHeight = '400px',
}: EssayBodyEditorProps) {
  const [showImageUploader, setShowImageUploader] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleImageInsert = useCallback((imageData: ImageBlockData) => {
    // Serialize image to markdown format
    const imageMarkdown = serializeImageBlock(imageData);
    
    // Get current content as markdown and append image
    const currentMarkdown = htmlToMarkdown(content);
    
    // Add image on new line with proper spacing
    const newContent = currentMarkdown 
      ? `${currentMarkdown}\n\n${imageMarkdown}\n\n`
      : `${imageMarkdown}\n\n`;
    
    // Convert back to HTML for the editor
    // For now, we'll just append to the HTML content directly
    // The RichTextEditor handles HTML, so we need to create an HTML representation
    const imageHtml = `<p><img src="${imageData.src}" alt="${imageData.alt}" data-caption="${imageData.caption || ''}" data-source="${imageData.sourceName || ''}" data-source-url="${imageData.sourceUrl || ''}" data-width="${imageData.widthMode || 'content'}" /></p>`;
    
    // Actually, let's insert as a special marker that ArticleBody can parse
    // This way we preserve the rich format in the editor but ArticleBody knows how to render it
    const imageMarker = `<p class="image-block" data-image='${JSON.stringify(imageData)}'>📷 [Image: ${imageData.alt}]</p>`;
    
    const newHtmlContent = content 
      ? `${content}${imageMarker}`
      : imageMarker;
    
    onChange(newHtmlContent);
    setShowImageUploader(false);
  }, [content, onChange]);

  return (
    <div className="space-y-2" ref={editorRef}>
      <div className="flex items-center justify-between">
        <Label>Body Content</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowImageUploader(true)}
          className="gap-1"
        >
          <ImageIcon className="h-4 w-4" />
          Insert Image
        </Button>
      </div>

      {showImageUploader && (
        <ImageUploader
          section={section}
          onInsert={handleImageInsert}
          onCancel={() => setShowImageUploader(false)}
        />
      )}

      <RichTextEditor
        content={content}
        onChange={onChange}
        placeholder="Start writing your essay..."
        minHeight={minHeight}
        distractionFree={distractionFree}
      />

      <p className="text-xs text-muted-foreground">
        Tip: Use H2 and H3 for headings. Paste images from clipboard or click "Insert Image" above.
      </p>
    </div>
  );
}

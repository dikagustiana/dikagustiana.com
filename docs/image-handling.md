# Image & Figure Handling for Editorial Sections

## Overview

Images and graphs are handled as **FigureBlock** nodes within the TipTap JSON content format. This applies **only** to:

- **The Next Big Thing** (`next-big-thing`)
- **The Green Transition** (`green-transition`)

Other sections use the standard RichTextEditor without figure support.

## Writer Experience

### Inserting a Figure

1. Open the essay in the admin editor (`/admin/content/:slug` or `/admin/writer/:section/:slug`)
2. For Next Big Thing or Green Transition essays, the editor shows a **"Figures enabled"** badge
3. Click the **Insert Figure** button (📷) in the toolbar
4. Choose upload method:
   - **Upload tab**: Drag & drop, paste from clipboard, or click to browse
   - **URL tab**: Paste an image URL and click "Load"
5. Fill in the required metadata:
   - **Alt text** (required) - Describes the image for accessibility
   - **Caption** (optional) - Displayed below the image
   - **Type**: Image or Graph
   - **Width mode**: Content width (default) or Wide
   - **Source name** (required for Green Transition unless marked as original)
   - **Source URL** (optional)
   - **"Original/self-created"** checkbox - Bypasses source requirement
6. Click **Insert Figure**

### Editing a Figure

Click on any figure in the editor to select it. The figure shows a selection ring. You can:
- Delete it using the X button
- Drag to reorder within the content

### Figure Types

| Type | Behavior |
|------|----------|
| **Image** | Standard rendering, no zoom |
| **Graph** | Tap-to-zoom lightbox on mobile for readability |

### Width Modes

| Mode | Description |
|------|-------------|
| **Content** | Fits within article column width (default) |
| **Wide** | Extends beyond column with page gutters respected |

## Validation Rules

### Publishing is Blocked When:

- Any figure is missing **alt text**
- Green Transition figures are missing **source name** (unless "Original" is checked)

### Warnings (Non-blocking):

- More than 8 figures in one essay
- Image file size > 2MB
- Very tall aspect ratio (height/width > 2)
- Next Big Thing figures without source attribution

## Storage

Images are stored in the `essay-images` Supabase storage bucket:
- **Path**: `{section}/{timestamp}-{random}.{ext}`
- **Access**: Public read, authenticated write
- **Formats**: PNG, JPG, WebP
- **Max size**: 5MB

## Technical Details

### Content Format

The canonical format is **TipTap HTML** with embedded figure blocks:

```html
<figure data-type="figure-block" data-figure='{"src":"...","altText":"...","kind":"graph","widthMode":"wide"}'>
  <img src="..." alt="..." />
</figure>
```

### FigureBlockData Schema

```typescript
interface FigureBlockData {
  src: string;           // Image URL
  altText: string;       // Required
  caption?: string;      // Optional
  sourceName?: string;   // Required for green-transition
  sourceUrl?: string;    // Optional
  noSource?: boolean;    // "Original/self-created" flag
  widthMode?: 'content' | 'wide';  // Default: 'content'
  kind?: 'image' | 'graph';        // Default: 'image'
  naturalWidth?: number;
  naturalHeight?: number;
  aspectRatio?: number;
}
```

### Components

| Component | Purpose |
|-----------|---------|
| `FigureBlock` | Renders figures in reader view |
| `FigureUploader` | Upload/URL input UI |
| `FigureExtension` | TipTap node extension |
| `EssayEditor` | Editor with figure support |

### Validation Functions

```typescript
import { 
  validateFigures, 
  extractFiguresFromContent 
} from '@/lib/figureValidation';

// Extract figures from HTML content
const figures = extractFiguresFromContent(htmlContent);

// Validate figures for a section
const result = validateFigures(figures, 'green-transition');
// result.errors - blocking issues
// result.warnings - non-blocking issues
```

## Rendering

The same `FigureBlock` component is used in:
- Editor preview (via `FigureExtension` node view)
- Published article (via `ArticleBody` parsing)

This ensures **preview matches published** exactly.

## Mobile Considerations

- All figures are lazy-loaded
- Aspect ratio placeholder prevents layout shift
- Graph type figures have tap-to-zoom lightbox
- Wide mode respects safe area gutters

## Best Practices

1. **Always write descriptive alt text** - Screen readers depend on it
2. **Credit your sources** - Especially important for Green Transition essays
3. **Use reasonable file sizes** - Compress images before uploading (under 2MB)
4. **Consider mobile readers** - Wide images should still be readable on small screens
5. **Use Graph type for data visualizations** - Enables tap-to-zoom for mobile
6. **Don't overuse figures** - 3-5 per essay is typically optimal

# Image Handling in Editorial Essays

This document explains how to insert and manage images in essays for **The Next Big Thing** and **Green Transition** sections.

## Inserting Images

### From the Editor

1. Click the **"Insert Image"** button above the body editor
2. Choose your upload method:
   - **Upload**: Drag-and-drop, click to browse, or paste from clipboard
   - **URL**: Paste any public image URL
3. Fill in the required fields:
   - **Alt text** (required): Describe the image for accessibility
   - **Caption** (optional): Displayed below the image
   - **Source** (required for Green Transition): Attribution for the image
   - **Source URL** (optional): Link to the source
   - **Full width** (optional): Toggle for edge-to-edge display
4. Click **"Insert Image"** to add it to your essay

### Supported Formats

- PNG (recommended for graphics/screenshots)
- JPG (recommended for photos)
- WebP (recommended for web-optimized images)

### Size Recommendations

- **Max file size**: 2MB (larger files trigger a warning)
- **Aspect ratio**: Avoid very tall images (height > 2x width) as they disrupt reading flow

## Image Fields

| Field | Required | Description |
|-------|----------|-------------|
| Alt text | ✅ Yes | Screen reader description (accessibility) |
| Caption | No | Visible text below image |
| Source name | ✅ Green Transition only | Attribution (e.g., "Reuters", "Author's photo") |
| Source URL | No | Link to source |
| Width mode | No | "content" (760px max) or "full" (wider) |

## Validation Rules

### Blocking (Cannot Publish)

- Any image missing alt text
- Green Transition: Any image missing source name (unless "No source" checkbox is checked)

### Warnings (Can Override)

- More than 8 images in one essay
- Image file larger than 2MB
- Very tall aspect ratio (may hurt scroll experience)
- Next Big Thing: Missing source attribution (recommended but not required)

## Storage

Images are stored in the `essay-images` Supabase storage bucket:
- Public access for reading
- Admin-only upload permissions
- Cached for 1 year

## Technical Format

Images are stored in the content as HTML with JSON metadata:

```html
<p class="image-block" data-image='{"src":"url","alt":"text","caption":"..."}'>📷 [Image: alt text]</p>
```

Or in markdown format for direct editing:

```markdown
![Alt text](https://example.com/image.jpg){caption="Caption here",source="Source Name",sourceUrl="https://source.com",width="full"}
```

Both formats are automatically rendered by the ArticleBody component.

## Best Practices

1. **Always write descriptive alt text** - Screen readers depend on it
2. **Credit your sources** - Especially important for Green Transition essays
3. **Use reasonable file sizes** - Compress images before uploading
4. **Consider mobile readers** - Full-width images should still be readable on small screens
5. **Don't overuse images** - 3-5 images per essay is typically optimal

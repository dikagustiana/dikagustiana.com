/**
 * The single image-upload path for the editor.
 *
 * Harvested from WriterStudio's `handleImageUpload` and FigureUploader's
 * client-side validation, which had drifted apart: the Studio path accepted
 * any file the browser would hand it, the uploader path enforced type and
 * size. One writing surface means one set of rules, so they are merged here
 * and both callers now go through this module.
 *
 * Storage is admin-only by policy (`public_buckets_admin_insert` on
 * storage.objects). A non-admin upload is refused by the database, not by
 * this function — the check lives where it cannot be bypassed.
 */

import { supabase } from '@/integrations/supabase/client';

export const IMAGE_BUCKET = 'essay-images';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const WARN_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export class ImageUploadError extends Error {}

/**
 * Validate before touching the network. Returns null when the file is
 * acceptable, otherwise the reason to show the author.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only PNG, JPG, WebP or GIF images can be uploaded.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `Image is ${mb}MB. The maximum is 5MB.`;
  }
  return null;
}

/** True when the file is an image the editor is willing to take. */
export function isUploadableImage(file: File | null | undefined): file is File {
  return !!file && file.type.startsWith('image/');
}

/**
 * Upload one image and return its public URL.
 *
 * Throws `ImageUploadError` with a message fit to show the author. Callers
 * treat a throw as "nothing was inserted" — no placeholder is left behind.
 */
export async function uploadEssayImage(file: File, folder?: string): Promise<string> {
  const invalid = validateImageFile(file);
  if (invalid) throw new ImageUploadError(invalid);

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const prefix = folder && folder.trim() ? folder.trim() : 'drafts';
  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(filename, file, { cacheControl: '31536000', upsert: false });

  if (error) {
    // Storage returns a bare "new row violates row-level security policy" for
    // a non-admin. Say what that actually means to the person reading it.
    const message = /row-level security|Unauthorized|403/i.test(error.message)
      ? 'You do not have permission to upload images.'
      : error.message;
    throw new ImageUploadError(message);
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filename);
  if (!data?.publicUrl) {
    throw new ImageUploadError('Upload succeeded but no public URL was returned.');
  }
  return data.publicUrl;
}

/** Read the intrinsic dimensions of an uploaded image, best-effort. */
export function readImageSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

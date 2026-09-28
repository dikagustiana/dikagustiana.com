/** Types for shareImage.mjs (plain JavaScript so the prerender can import it unbundled). */
export declare const SHARE_IMAGE_ORIGIN: string;

export declare function unixSeconds(timestamp: string | null | undefined): number | null;

export interface EssayShareImage {
  url: string;
  /** True for the build's generated 1200×630 PNG card; false for a hero image of unknown size. */
  generated: boolean;
}

export declare function essayShareImage(essay: {
  slug: string;
  thumbnail_url?: string | null;
  updated_at?: string | null;
}): EssayShareImage;

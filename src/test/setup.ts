import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the supabase client module can initialise in jsdom even though no
// real backend exists (component tests mock it explicitly where needed).
process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= 'test-anon-key';

// jsdom lays nothing out, and its Range has no getClientRects at all: give it
// the empty list its elements give (the Home hero reads the text's line boxes).
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = function getClientRects() {
    return Object.assign([], { item: () => null }) as unknown as DOMRectList;
  };
}

afterEach(() => cleanup());

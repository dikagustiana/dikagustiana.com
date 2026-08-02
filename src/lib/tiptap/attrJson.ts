/**
 * Reading and writing the JSON blobs that `figure` and `linkCard` keep in a
 * `data-*` attribute.
 *
 * There is one rule and it is easy to get wrong: **escape once, at the layer
 * that needs it.**
 *
 *   - Building real DOM (a node's `renderHTML`): pass the raw JSON string.
 *     `setAttribute` stores it verbatim and `innerHTML` escapes it on the way
 *     out. Escaping it yourself means it is escaped twice.
 *   - Building an HTML *string* (`serialize.ts`): escape it, because nothing
 *     else will.
 *   - Reading it back: `getAttribute` un-escapes, so a plain `JSON.parse` is
 *     right — with a fallback for the doubly-escaped values already sitting in
 *     the database.
 *
 * Getting this wrong is not cosmetic. `figure` pre-escaped its blob and parsed
 * it raw, so `JSON.parse` threw on every reload and every attribute fell back
 * to its default: an image reloaded as `src=""`. The editor showed a blank
 * figure and nothing errored.
 */

/** Serialise for a raw HTML attribute value inside a string-built document. */
export function attrJsonAttribute(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Serialise for `renderHTML`, where the DOM does the escaping. */
export function attrJsonRaw(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Read a blob back. Accepts the current raw form and the legacy pre-escaped
 * form, so content written before the fix still opens.
 */
export function parseAttrJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Legacy: the value was escaped before it was stored, so `getAttribute`
    // hands back `{&quot;src&quot;: …}`. Un-escape and try once more.
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as T;
    } catch {
      return null;
    }
  }
}

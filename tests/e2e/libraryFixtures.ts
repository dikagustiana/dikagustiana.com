/**
 * Shelves and books for the library's browser tests and screenshots (docs/prd/library-phase-2): a few named
 * books the tests click, and, for the full shelf, two hundred more spread over eight shelves with page counts,
 * sizes and years, some paid. Deterministic: no Math.random.
 */

export const SHELVES = [
  { id: 's1', slug: 'corporate-finance', name: 'Corporate Finance', sort_order: 0 },
  { id: 's2', slug: 'accounting', name: 'Accounting', sort_order: 1 },
];

const base = {
  author: null,
  year: null,
  purchase_url: null,
  license_note: null,
  filepath: null,
  file_store: 'r2',
  filename: null,
  mime_type: null,
  size_bytes: null,
  cover_path: null,
  synopsis_json: null,
  synopsis_html: null,
  synopsis_excerpt: null,
  published: true,
  deleted_at: null,
  page_count: null,
  spine_color: null,
  ai_ready: false,
};

export const BOOKS = [
  {
    ...base,
    id: 'b1',
    slug: 'open-corporate-finance',
    title: 'Open Corporate Finance',
    author: 'A. Author',
    year: 2023,
    shelf_id: 's1',
    access: 'free',
    license_note: 'CC BY 4.0',
    filepath: 'files/open-corporate-finance/1-ocf.pdf',
    filename: 'ocf.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2_400_000,
    page_count: 320,
    synopsis_html: '<p>A free textbook on <em>corporate finance</em>.</p>',
    synopsis_excerpt: 'A free textbook on corporate finance.',
    sort_order: 0,
  },
  { ...base, id: 'b2', slug: 'valuation', title: 'Valuation', author: 'B. Writer', year: 2020, shelf_id: 's1', access: 'paid', purchase_url: 'https://example.com/valuation', sort_order: 1 },
  { ...base, id: 'b3', slug: 'advanced-accounting', title: 'Advanced Accounting', shelf_id: 's2', access: 'paid', purchase_url: 'https://example.com/aa', sort_order: 0 },
];

const SUBJECTS = [
  ['economics', 'Economics'],
  ['history', 'History'],
  ['philosophy', 'Philosophy'],
  ['accounting', 'Accounting'],
  ['corporate-finance', 'Corporate Finance'],
  ['development', 'Development'],
  ['energy', 'Energy and Mining'],
  ['law', 'Law and the State'],
] as const;
const WORDS = ['Capital', 'Republic', 'Method', 'Value', 'Labour', 'Ledger', 'Coal', 'Trade', 'Reason', 'Market', 'Order', 'Money', 'Power', 'Land', 'Debt', 'Rice'];
const AUTHORS = ['Tan Malaka', 'Adam Smith', 'Mohammad Hatta', 'John Stuart Mill', 'Ibn Khaldun', 'Rosa Luxemburg', 'Sutan Sjahrir', 'Alfred Marshall', 'Kartini', 'David Ricardo', 'Max Weber', 'Karl Polanyi'];

/** Eight shelves and two hundred books: the full shelf (§1 Acceptance). */
export function fullLibrary() {
  const shelves = SUBJECTS.map(([slug, name], i) => ({ id: `fs${i}`, slug, name, sort_order: i }));
  const books = Array.from({ length: 200 }, (_, i) => {
    const shelf = shelves[i % shelves.length];
    const paid = i % 7 === 3;
    const k = Math.floor(i / shelves.length);
    const title = `${WORDS[(k * 3 + i) % WORDS.length]} ${['and', 'of', 'in', 'against'][(k + i) % 4]} ${WORDS[(k * 7 + i * 5 + 3) % WORDS.length]}${k % 3 === 0 ? ', a Study' : ''}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${i}`;
    return {
      ...base,
      id: `fb${i}`,
      slug,
      title,
      author: AUTHORS[(k * 5 + i) % AUTHORS.length],
      year: 1850 + ((i * 37) % 175),
      shelf_id: shelf.id,
      access: paid ? 'paid' : 'free',
      purchase_url: paid ? `https://example.com/${slug}` : null,
      license_note: paid ? null : 'Public domain',
      filepath: paid ? null : `files/${slug}/1-${slug}.pdf`,
      size_bytes: paid ? null : 120_000 + ((i * 7919) % 40) * 600_000,
      page_count: paid ? null : 60 + ((i * 131) % 560),
      sort_order: Math.floor(i / shelves.length),
    };
  });
  return { shelves, books };
}

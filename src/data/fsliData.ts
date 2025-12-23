export interface FsliItem {
  slug: string;
  notes: string;
  indonesian: string;
  english: string;
  dec2024: string;
  dec2023: string;
  category: 'current_assets' | 'non_current_assets';
}

export const fsliItems: FsliItem[] = [
  { notes: '3i.6', indonesian: 'Kas dan setara kas', english: 'Cash and cash equivalents', dec2024: '2,614,318', dec2023: '5,018,739', slug: 'cash-and-cash-equivalents', category: 'current_assets' },
  { notes: '3i.7', indonesian: 'Kas yang dibatasi penggunaannya', english: 'Restricted cash', dec2024: '154,217', dec2023: '133,537', slug: 'restricted-cash', category: 'current_assets' },
  { notes: '3b,4dc', indonesian: 'Piutang usaha, neto', english: 'Trade receivables, net', dec2024: '2,203,018', dec2023: '2,063,070', slug: 'trade-receivables-net', category: 'current_assets' },
  { notes: '3b.5', indonesian: 'Piutang ketiga', english: 'Third parties', dec2024: '520,885', dec2023: '715,327', slug: 'third-parties', category: 'current_assets' },
  { notes: '3g.9', indonesian: 'Piutang bermiutah', english: 'Related parties', dec2024: '823,348', dec2023: '801,429', slug: 'related-parties', category: 'current_assets' },
  { notes: '3h,10,14d', indonesian: 'Piutang lain-lain, neto', english: 'Other receivables, net', dec2024: '28,830', dec2023: '28,217', slug: 'other-receivables-net', category: 'current_assets' },
  { notes: '3h,10', indonesian: 'Piutang dari Pemerintah', english: 'Due from the Government', dec2024: '85,053', dec2023: '94,887', slug: 'due-from-government', category: 'current_assets' },
  { notes: '3j,11', indonesian: 'Persediaan, neto', english: 'Inventories, net', dec2024: '809,397', dec2023: '658,712', slug: 'inventories-net', category: 'current_assets' },
  { notes: '3c,43a', indonesian: 'Piutang pajak penghasilan dan dividen taxes', english: 'Corporate and dividend taxes receivable - current portion', dec2024: '300,738', dec2023: '275,812', slug: 'corporate-dividend-taxes-receivable-current', category: 'current_assets' },
  { notes: '3c,43a', indonesian: 'Uang muka dan biaya dibayar di muka', english: 'Advances and prepayments - current portion', dec2024: '20,268', dec2023: '12,503', slug: 'advances-prepayments-current', category: 'current_assets' },
  { notes: '3h,15', indonesian: 'Aset lancar lainnya', english: 'Other current assets', dec2024: '179,426', dec2023: '177,429', slug: 'other-current-assets', category: 'current_assets' },
  { notes: '14a', indonesian: 'Aset tidak lancar lainnya', english: 'Other non-current assets', dec2024: '60,913', dec2023: '210,253', slug: 'other-non-current-assets', category: 'non_current_assets' },
  { notes: '3i,7', indonesian: 'Kas yang dibatasi penggunaannya', english: 'Restricted cash - non-current portion', dec2024: '1,890,493', dec2023: '1,700,675', slug: 'restricted-cash-non-current', category: 'non_current_assets' },
  { notes: '3i,12', indonesian: 'Piutang usaha, neto', english: 'Trade receivables, net - non-current portion', dec2024: '544,278', dec2023: '522,121', slug: 'trade-receivables-net-non-current', category: 'non_current_assets' },
  { notes: '3d,13', indonesian: 'Aset tetap, neto', english: 'Fixed assets, net', dec2024: '71,814', dec2023: '73,800', slug: 'fixed-assets-net', category: 'non_current_assets' },
  { notes: '3c,43a', indonesian: 'Properti investasi', english: 'Investment properties', dec2024: '5,149', dec2023: '3,301', slug: 'investment-properties', category: 'non_current_assets' },
  { notes: '10', indonesian: 'Aset pajak tangguhan', english: 'Deferred tax assets', dec2024: '53,721', dec2023: '95,263', slug: 'deferred-tax-assets', category: 'non_current_assets' },
  { notes: '', indonesian: 'Investasi jangka panjang', english: 'Long-term investments', dec2024: '1,109,172', dec2023: '1,602,821', slug: 'long-term-investments', category: 'non_current_assets' },
  { notes: '3h,15', indonesian: 'Uang muka dan biaya dibayar di muka', english: 'Advances and prepayments - non-current portion', dec2024: '50', dec2023: '2,242', slug: 'advances-prepayments-non-current', category: 'non_current_assets' },
  { notes: '3c,43a', indonesian: 'Piutang pajak penghasilan dan dividen taxes', english: 'Corporate and dividend taxes receivable - non-current portion', dec2024: '262,713', dec2023: '213,492', slug: 'corporate-dividend-taxes-receivable-non-current', category: 'non_current_assets' },
  { notes: '3c,43a', indonesian: 'Piutang tidak lancar lainnya', english: 'Other non-current receivables', dec2024: '3,106', dec2023: '3,460', slug: 'other-non-current-receivables', category: 'non_current_assets' },
  { notes: '3m,17', indonesian: 'Aset hak dan gas bumi, neto', english: 'Oil and gas properties, net', dec2024: '17,905,149', dec2023: '16,130,200', slug: 'oil-gas-properties-net', category: 'non_current_assets' },
  { notes: '3n,18', indonesian: 'Aset hak guna, neto', english: 'Right of use assets, net', dec2024: '123,977', dec2023: '203,379', slug: 'right-of-use-assets-net', category: 'non_current_assets' },
  { notes: '15b', indonesian: 'Aset tidak lancar lainnya', english: 'Other non-current assets', dec2024: '533,865', dec2023: '455,380', slug: 'other-non-current-assets-final', category: 'non_current_assets' },
];

export const fsliSections = [
  { key: 'quick-facts', title: 'Quick Facts', placeholder: 'Overview of key characteristics, classification, and basic information about this financial statement line item.' },
  { key: 'definition', title: 'Definition', placeholder: 'Comprehensive definition and scope of this line item according to accounting standards and best practices.' },
  { key: 'recognition', title: 'Recognition', placeholder: 'Criteria and conditions for recognizing this item in the financial statements, including timing and threshold considerations.' },
  { key: 'measurement', title: 'Measurement', placeholder: 'Measurement basis, valuation methods, and calculation approaches used for this financial statement component.' },
  { key: 'presentation', title: 'Presentation Example', placeholder: 'Practical examples of how this item appears in financial statements with real-world context and formatting.' },
  { key: 'journal-entries', title: 'Journal Entry Examples', placeholder: 'Common journal entries and accounting transactions related to this line item with debits and credits.' },
  { key: 'disclosure', title: 'Disclosure Items', placeholder: 'Required and recommended disclosure items in the notes to financial statements for this component.' },
  { key: 'common-mistakes', title: 'Common Mistakes', placeholder: 'Frequent errors, misconceptions, and pitfalls to avoid when accounting for this financial statement element.' },
  { key: 'essay', title: 'TODO Essay', placeholder: 'Space reserved for detailed analysis, industry-specific considerations, and advanced topics to be added.' },
];

export function getFsliItemBySlug(slug: string): FsliItem | undefined {
  return fsliItems.find(item => item.slug === slug);
}

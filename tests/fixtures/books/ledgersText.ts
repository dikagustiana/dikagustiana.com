/**
 * The text of "A Short Book of Ledgers", the library's sample book (tests/fixtures/books/text.pdf, made by
 * makeFixtures.ts). Written for these tests; no third-party text. Shared by the PDF writer, the paragraph
 * splitter's tests and the browser tests, which serve its text as the R2 files extract-paragraphs.ts writes.
 */
export const CHAPTERS: { title: string; paragraphs: string[] }[] = [
  {
    title: 'Chapter One. The Ledger',
    paragraphs: [
      'A ledger is a book of accounts. Each account has a page, and each page has two sides: what came in on the left, what went out on the right. The habit is older than printing, and it has outlived every machine that was supposed to replace it.',
      'The first rule of the ledger is that nothing is written in it directly. Every figure arrives from somewhere else, from a journal or a day book, and carries with it the date and the reference of the entry it came from.',
      'The second rule is that every figure is written twice. A sale is a credit to sales and a debit to the customer; a payment is a credit to cash and a debit to the supplier. The two sides must agree, or the book is wrong.',
      'Because of the second rule a clerk can test the whole book with one addition. If the debits and the credits of every page are added up, the two totals must be equal. When they are not, an error has been made somewhere in the posting.',
      'Equality proves less than it seems to. A figure posted to the wrong account, or a transaction left out altogether, leaves the totals in balance. The test catches a slip of the pen; it does not catch a mistake of judgement.',
      'The ledger therefore needs a reader as well as a writer. Someone must look along each page and ask whether the entries make sense: whether rent is paid each month, whether a customer who owes money is still buying, whether a balance has grown that should have shrunk.',
      'This reading is slow work, and it is the part of bookkeeping that the old manuals praise most. A merchant who reads his own ledger, they say, knows his business better than one who only signs the totals at the end of the year.',
      'The page of an account is arranged for that reading. Dates run down the left margin, a short description follows, then the reference, then the amount. A glance down the amounts shows the rhythm of the account; a glance down the descriptions shows its story.',
      'Balances are carried forward from page to page. When a page is full the clerk totals both sides, writes the difference on the smaller side as the balance carried down, and begins the next page with the same figure brought down on the other side.',
      'At the year end every account is closed in the same way. Revenue and expense accounts are emptied into a single account of profit and loss, and what remains in that account is the result of the year, ready to be carried to the owner.',
      'The balances that survive the closing are the assets, the debts and the owner’s interest. Listed together they form the balance sheet, which is nothing more than the ledger seen from a distance, with the detail folded away.',
      'It follows that a balance sheet can never be better than the ledger beneath it. A tidy statement drawn from a careless book is still a careless book, and an auditor who wants to know the truth of the statement goes back to the pages.',
      'That is the reason the ledger is kept in ink and never erased. A wrong figure is corrected by a new entry that reverses it, so that the page shows both the mistake and its correction, and the reader can follow what happened and when.',
      'A ledger kept this way is a record of decisions as much as of money. Each line says that somebody, on a certain day, judged a transaction to belong to a certain account. The sum of those judgements is the picture of the business.',
    ],
  },
  {
    title: 'Chapter Two. The Journal',
    paragraphs: [
      'Before a figure reaches the ledger it is written in the journal, in the order in which things happened. The journal is a diary; the ledger is an index. One answers the question of what happened on a day, the other the question of what happened to an account.',
      'Each journal entry names the accounts to be debited and credited, the amounts, and a short narration. The narration is the clerk’s explanation, and a good one tells a stranger, years later, why the entry was made.',
      'Posting is the work of copying the journal into the ledger. As each figure is posted the clerk writes the ledger page beside it in the journal, so that a reader can travel in either direction between the two books.',
      'Some businesses keep several journals: one for sales, one for purchases, one for cash. Each is ruled for its own kind of entry, and only the totals are posted at the end of the month, which saves a great deal of copying.',
      'The general journal remains for everything else: corrections, accruals, the closing entries at the end of the year. It is the book of the unusual, and an experienced reader turns to it first.',
      'An accrual records a cost that has been incurred but not yet paid, such as wages earned in the last days of a month. Without it the month would look cheaper than it was, and the next month dearer.',
      'A prepayment is the opposite: a cost paid before it is used, such as a year of insurance bought in advance. The payment is spread over the months that benefit from it, so that each month bears its own share.',
      'These adjustments are where judgement enters the books most openly. The clerk must decide how much has been earned, how much is owed, how long an asset will last. The journal records the decision and the narration records the reason.',
    ],
  },
  {
    title: 'Chapter Three. The Trial Balance',
    paragraphs: [
      'At the end of a period the clerk lists every account with its balance, debits in one column and credits in the other. This list is the trial balance, and the two columns must add to the same total.',
      'If they do not, the search begins. A difference divisible by nine suggests two digits transposed; a difference equal to a single entry suggests a posting made to one side only; a difference twice an entry suggests a posting made to the wrong side.',
      'When the trial balance agrees, the adjustments are made, and a second trial balance is drawn up after them. From this adjusted list the statements of the period are prepared.',
      'The trial balance is a working paper, not a report. It is seldom shown to anyone outside the office, but it is the bridge between the books and the statements, and every figure in the statements can be traced back across it.',
    ],
  },
];

/** The book's paragraphs as extract-paragraphs.ts numbers them: a heading and its paragraphs per chapter, numbered through. */
export function ledgerParagraphs(bookId: string) {
  let para = 0;
  return CHAPTERS.flatMap((c, i) => [c.title, ...c.paragraphs].map((text) => ({ book_id: bookId, chapter: i + 1, para: ++para, page: i === 0 ? 1 : i + 2, text })));
}

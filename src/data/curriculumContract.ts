/**
 * What the public syllabus is, said in the interface rather than assumed.
 *
 * The curriculum lists 161 planned questions across 49 modules and five
 * tracks. Two of them are written. Every unwritten row carried the label
 * "Coming soon", which is a delivery promise: a reader who arrives cold reads
 * 159 of those and concludes they are looking at a product that has not
 * shipped, rather than at a working syllabus and its author's progress record.
 *
 * The fix is not to hide the unwritten rows. Every planned item stays listed,
 * discoverable and inert — the inventory IS the point, because a question
 * someone intends to answer is worth publishing before the answer exists. What
 * changes is what the interface claims about them: "Planned" states a fact,
 * "Coming soon" makes a schedule commitment nobody made.
 */

export const CURRICULUM_CONTRACT = {
  /** The one-line standing over any track or module inventory. */
  standfirst:
    'A working syllabus, kept in public. Every question stays listed whether or not it has been answered yet, because the shape of what is being studied is worth reading on its own.',

  /** The status of an item nobody has written. */
  plannedLabel: 'Planned',

  /** The longer note, shown once per track index rather than on every row. */
  note:
    'Rows marked Planned are questions, not drafts and not scheduled work: nothing here commits to a date. Written items link; planned ones do not, and are deliberately not clickable rather than clickable-and-empty.',

  /** Shown where a module has no framing yet. */
  unframed: 'No framing written for this module yet.',
} as const;

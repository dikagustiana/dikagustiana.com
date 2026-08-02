export { ReadingProgress } from './ReadingProgress';
export { LinkableHeading } from './LinkableHeading';
export { FontSizeToggle, useFontSize } from './FontSizeToggle';
export { ArticleHeader } from './ArticleHeader';
export { ArticleBody } from './ArticleBody';
export { ArticleToc } from './ArticleToc';
export { EssayNavigation } from './EssayNavigation';
export { KeyTakeaways } from './KeyTakeaways';
export { References } from './References';
export { AuthorBox } from './AuthorBox';
export { RelatedEssays } from './RelatedEssays';
export { EditorialFeed } from './EditorialFeed';
export { ArticleLayout } from './ArticleLayout';
export { ArticleShell } from './ArticleShell';
export type { ArticleShellProps } from './ArticleShell';
export { LongformArticleShell } from './LongformArticleShell';
export type { LongformArticleShellProps } from './LongformArticleShell';
// Legacy image block exports (deprecated - use FigureBlock instead)
export { ImageBlock, parseImageBlock, serializeImageBlock } from './ImageBlock';
export type { ImageBlockData } from './ImageBlock';
// New FigureBlock system
export { FigureBlock, serializeFigureBlock, parseFigureBlock } from './FigureBlock';
export { FigureUploader } from './FigureUploader';
// EssayEditor is deliberately NOT exported here. This barrel is imported by
// every public reading page (ArticleShell &c.), and re-exporting the editor
// pulled the ENTIRE TipTap graph — extensions, ProseMirror, KaTeX — into the
// static bundle of every essay a reader opens. Import it directly from
// './EssayEditor' (the writer studio already does).
export type { FigureBlockData } from './FigureBlock';

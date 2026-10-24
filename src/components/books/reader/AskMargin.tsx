/**
 * The margin where a question about a selected passage is asked and answered (docs/prd/library-phase-2 §3
 * Margin questions; the idea from Gloss's reader, by permission, docs/licenses/gloss.md). To the right of the
 * page from md up, below it on a phone.
 *
 * The passage quoted, a question, and the answer as it streams from the `book-ask` edge function. Each [¶n] the
 * answer cites becomes a link that takes the reader to that paragraph (onCite); a number that was not in the
 * question's context stays plain text. The foot says how many questions are left today and that answers are
 * generated, to be checked against the paragraphs.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/components/ui/button';
import { answerParts, askBook, askQuota, quotaLine, type AskSelection } from '@/lib/bookAsk';

interface Props {
  bookId: string;
  chapter: number;
  selection: AskSelection;
  owner: boolean;
  /** Whether a paragraph is in the chapter on screen (so a citation can be checked while the answer streams). */
  inChapter: (para: number) => boolean;
  onCite: (para: number) => void;
  onClose: () => void;
}

const QUESTION_MAX = 500;

export function AskMargin({ bookId, chapter, selection, owner, inChapter, onCite, onClose }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [state, setState] = useState<'idle' | 'asking' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [cited, setCited] = useState<Set<number> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let live = true;
    void askQuota(bookId).then((n) => live && setRemaining(n));
    field.current?.focus();
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, [bookId]);

  // A new passage is a new question.
  useEffect(() => {
    abort.current?.abort();
    setAnswer('');
    setState('idle');
    setError(null);
    setCited(null);
  }, [selection.para_from, selection.para_to, selection.text]);

  const outOfQuestions = !owner && remaining === 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || state === 'asking' || outOfQuestions) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setAnswer('');
    setError(null);
    setCited(null);
    setState('asking');
    await askBook(
      { bookId, chapter, selection, question: q },
      {
        onMeta: (m) => setRemaining(m.remaining),
        onDelta: (t) => setAnswer((a) => a + t),
        onDone: (d) => {
          setCited(new Set(d.cited));
          setRemaining(d.remaining);
          setState('done');
        },
        onError: (err) => {
          setError(err.message);
          setState('error');
          if (err.reason === 'visitor_cap') setRemaining(0);
        },
      },
      ctrl.signal,
    );
  };

  const known = (n: number) => (cited ? cited.has(n) : inChapter(n));
  const range = selection.para_from === selection.para_to ? `¶${selection.para_from}` : `¶${selection.para_from}–¶${selection.para_to}`;

  return (
    <aside aria-label="Question in the margin" data-ask-margin className="flex h-full min-h-0 flex-col rounded-sm bg-neutral-800 text-neutral-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <h2 className="font-sans text-sm font-semibold">Ask about {range}</h2>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-neutral-300 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close the margin">
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <blockquote className="border-l-2 border-amber-400 pl-3 font-serif text-sm italic text-neutral-300">
          {selection.text.length > 280 ? `${selection.text.slice(0, 280)}…` : selection.text}
        </blockquote>
        <form onSubmit={submit} className="mt-4">
          <label htmlFor="ask-question" className="sr-only">
            Your question about the passage
          </label>
          <TextareaAutosize
            id="ask-question"
            ref={field}
            minRows={2}
            maxRows={6}
            maxLength={QUESTION_MAX}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="What does this passage mean by…?"
            disabled={outOfQuestions}
            className="w-full resize-none rounded-md border border-white/15 bg-neutral-900 px-3 py-2 font-sans text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          />
          <Button type="submit" size="sm" className="mt-2" disabled={!question.trim() || state === 'asking' || outOfQuestions} aria-busy={state === 'asking'}>
            {state === 'asking' && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Ask
          </Button>
        </form>
        <div aria-live="polite" className="mt-4 font-serif text-[15px] leading-relaxed">
          {answer && (
            <p data-answer className="whitespace-pre-wrap">
              {answerParts(answer, known).map((part, i) =>
                part.kind === 'cite' ? (
                  <button
                    key={i}
                    type="button"
                    data-cite={part.para}
                    onClick={() => onCite(part.para)}
                    className="mx-0.5 rounded font-mono text-[13px] text-amber-300 underline decoration-amber-300/50 underline-offset-2 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                    aria-label={`Paragraph ${part.para}: go to it`}
                  >
                    [¶{part.para}]
                  </button>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          )}
          {state === 'asking' && !answer && <p className="font-sans text-sm text-neutral-400">Reading the chapter…</p>}
          {error && (
            <p role="alert" className="font-sans text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
      <footer className="border-t border-white/10 px-4 py-2 font-sans text-xs text-neutral-400">
        <p data-quota>{quotaLine(remaining, owner)}</p>
        <p className="mt-0.5">Answers are generated; check the cited paragraphs.</p>
      </footer>
    </aside>
  );
}

/**
 * Inline [n] references to the numbered source list (PRD §B5, item 5). Each
 * goes to its entry in the list, `#source-n`, drawn by SourceList.
 */
export function SourceRefs({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) return null;
  return (
    <span className="whitespace-normal">
      {numbers.map((n, i) => (
        <span key={n}>
          {i > 0 && ' '}
          <a
            href={`#source-${n}`}
            aria-label={`Source ${n}`}
            onClick={(event) => event.stopPropagation()}
            className="text-accent underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            [{n}]
          </a>
        </span>
      ))}
    </span>
  );
}

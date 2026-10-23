/**
 * A stage box's door into Finance in Action, at the finance distance only
 * (chain view, PROMPT-site §3.7). Over the generated box: a transparent hit
 * area that is a link to the stage's section of the index, with a small "n
 * models" (or "planned") label inside the box's bottom right corner, clear of
 * the stage's own name. At the economy distance, or for a stage with no
 * company on the slate, it renders nothing, so that distance is unchanged.
 */
import { useContext, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChainLensContext } from './chainLensContext';
import { ChainModelsContext, type StageModels } from './chainModelsContext';

/**
 * Inset of the label from the box's bottom right corner, and its size, in the
 * plate's units: under the stage's last line of name, clear of its letters.
 */
const INSET = 6;
const LABEL_BOTTOM = 3;
const LABEL_SIZE = 10;

function Door({ models: m, id, x, y, width, height }: { models: StageModels; id: string; x: number; y: number; width: number; height: number }) {
  const navigate = useNavigate();
  const go = (e: MouseEvent<Element>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(m.href);
  };
  return (
    <a href={m.href} onClick={go} aria-label={m.name} className="group cursor-pointer outline-none" data-chain-models={id}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        className="fill-transparent stroke-transparent group-hover:stroke-accent group-focus-visible:stroke-ring"
        strokeWidth={3}
        style={{ pointerEvents: 'all' }}
      />
      <text
        x={x + width - INSET}
        y={y + height - LABEL_BOTTOM}
        textAnchor="end"
        aria-hidden="true"
        className="fill-accent font-semibold underline"
        style={{ fontSize: LABEL_SIZE }}
      >
        {m.text}
      </text>
    </a>
  );
}

export function StageModelsHit({ id, x, y, width, height }: { id: string; x: number; y: number; width: number; height: number }) {
  const { lens } = useContext(ChainLensContext);
  const models = useContext(ChainModelsContext);
  const m = lens === 'finance' ? models?.get(id) : undefined;
  if (!m) return null;
  return <Door models={m} id={id} x={x} y={y} width={width} height={height} />;
}

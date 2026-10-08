/**
 * The world in the chain map's slot (PRD §7.1): the same section wrapper the
 * schematic uses, so the page around it does not move.
 */
import WorldFrame from './WorldFrame';

export default function WorldSection({ variant, heading }: { variant: 'preview' | 'full'; heading: 'h1' | 'h2' }) {
  return (
    <section id="industry-chain" className="border-b border-border py-12">
      <div className="container">
        <WorldFrame variant={variant} heading={heading} />
      </div>
    </section>
  );
}

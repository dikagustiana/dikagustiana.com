/**
 * CouncilPanel — runs a Writing Council session and renders the transcript.
 *
 * Two modes:
 *   - review: reviews the current draft (content supplied by the caller).
 *   - brainstorm: evaluates a rough essay idea typed into the panel.
 *
 * The chairman verdict is rendered prominently; per-advisor responses and
 * peer reviews are collapsible (closed by default). Past sessions are loaded
 * from `council_sessions` via React Query.
 */

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Gavel,
  Loader2,
  ChevronDown,
  Users,
  MessageSquareQuote,
  History,
  AlertCircle,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useRunCouncil,
  useCouncilSessions,
  sessionRowToTranscript,
  CouncilNotConfiguredError,
  type CouncilMode,
  type CouncilTranscript,
  type CouncilPeerReview,
} from '@/hooks/queries/useCouncil';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CouncilPanelProps {
  mode: CouncilMode;
  /** Review mode: returns the current draft as markdown/plain text. */
  getContent?: () => string;
  /** Review mode: essay id, used to link and scope session history. */
  postId?: string | null;
  /** Review mode: working title passed as context to the council. */
  topic?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Transcript sub-components
// ---------------------------------------------------------------------------

function VerdictSection({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function VerdictCard({ transcript }: { transcript: CouncilTranscript }) {
  const { verdict } = transcript;
  const hasStructure =
    verdict.consensus || verdict.disagreements || verdict.recommendation || verdict.firstStep;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" />
          Chairman&apos;s Verdict
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasStructure ? (
          <>
            <VerdictSection label="Where the council agrees" text={verdict.consensus} />
            <VerdictSection label="Where the council disagrees" text={verdict.disagreements} />
            <VerdictSection label="Blind spots caught" text={verdict.blindSpots} />
            <VerdictSection label="Recommendation" text={verdict.recommendation} />
            {verdict.firstStep && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>First step</AlertTitle>
                <AlertDescription>{verdict.firstStep}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{verdict.raw}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PeerReviewBody({ review }: { review: CouncilPeerReview['review'] }) {
  if (review.raw) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{review.raw}</p>;
  }
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {review.strongest && (
        <p>
          <Badge variant="outline" className="mr-2">Strongest: {review.strongest.letter}</Badge>
          {review.strongest.reason}
        </p>
      )}
      {review.biggestBlindSpot && (
        <p>
          <Badge variant="outline" className="mr-2">Blind spot: {review.biggestBlindSpot.letter}</Badge>
          {review.biggestBlindSpot.reason}
        </p>
      )}
      {review.missedByAll && (
        <p>
          <Badge variant="outline" className="mr-2">Missed by all</Badge>
          {review.missedByAll}
        </p>
      )}
    </div>
  );
}

function CollapsibleBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border border-border rounded-md">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50 rounded-md">
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {subtitle && <Badge variant="secondary" className="shrink-0 text-[10px]">{subtitle}</Badge>}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function CouncilTranscriptView({ transcript }: { transcript: CouncilTranscript }) {
  return (
    <div className="space-y-4">
      <VerdictCard transcript={transcript} />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Advisor responses
        </p>
        {transcript.advisor_responses.map(response => (
          <CollapsibleBlock
            key={response.advisorId}
            title={response.advisorName}
            subtitle={`Response ${response.letter}`}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{response.text}</p>
          </CollapsibleBlock>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <MessageSquareQuote className="h-3.5 w-3.5" /> Peer reviews (anonymized)
        </p>
        {transcript.peer_reviews.map(peer => (
          <CollapsibleBlock key={peer.reviewerId} title={`Review by ${peer.reviewerName}`}>
            <PeerReviewBody review={peer.review} />
          </CollapsibleBlock>
        ))}
      </div>

      {!transcript.persisted && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>
            The session finished but could not be saved to history. Copy anything you need.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function SessionHistory({ postId, mode }: { postId?: string | null; mode: CouncilMode }) {
  const { data: sessions = [], isLoading } = useCouncilSessions(
    // Review history is scoped per essay; brainstorm history is global.
    mode === 'review' ? { postId: postId ?? undefined, mode } : { mode },
  );

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading history…</p>;
  }
  if (sessions.length === 0) {
    return <p className="text-xs text-muted-foreground">No previous sessions.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map(row => (
        <CollapsibleBlock
          key={row.id}
          title={formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
          subtitle={row.mode}
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap border-l-2 border-border pl-2">
              {row.input_snapshot.slice(0, 400)}
            </p>
            <CouncilTranscriptView transcript={sessionRowToTranscript(row)} />
          </div>
        </CollapsibleBlock>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function CouncilPanel({ mode, getContent, postId, topic, className }: CouncilPanelProps) {
  const [idea, setIdea] = useState('');
  const [transcript, setTranscript] = useState<CouncilTranscript | null>(null);
  const runCouncil = useRunCouncil();

  const handleRun = () => {
    const content = mode === 'brainstorm' ? idea.trim() : (getContent?.() ?? '').trim();
    if (!content) return;

    setTranscript(null);
    runCouncil.mutate(
      {
        mode,
        content,
        topic: topic?.trim() || undefined,
        post_id: postId ?? undefined,
      },
      { onSuccess: setTranscript },
    );
  };

  const canRun = mode === 'brainstorm' ? idea.trim().length > 0 : true;

  return (
    <div className={cn('space-y-4', className)}>
      {mode === 'brainstorm' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Describe the essay idea — a topic, a rough angle, or a few messy sentences. The council
            will judge whether it&apos;s worth writing and how to shape it.
          </p>
          <Textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="e.g. Why Indonesia's nickel downstreaming bet might be the most underrated green-transition story in Asia…"
            rows={5}
            disabled={runCouncil.isPending}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleRun} disabled={!canRun || runCouncil.isPending}>
          {runCouncil.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Users className="h-4 w-4 mr-2" />
          )}
          {mode === 'brainstorm' ? 'Convene the Council' : 'Run Council Review'}
        </Button>
        {runCouncil.isPending && (
          <span className="text-xs text-muted-foreground">
            5 advisors → anonymized peer review → chairman. Usually 20–40 seconds.
          </span>
        )}
      </div>

      {runCouncil.isError && (
        runCouncil.error instanceof CouncilNotConfiguredError ? (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertTitle>Writing Council not configured</AlertTitle>
            <AlertDescription>
              The AI gateway has not been set up yet. An admin needs to set
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">AI_GATEWAY_URL</code>
              and
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">AI_GATEWAY_API_KEY</code>
              in the edge function secrets. Past sessions below still load; new runs stay
              disabled until it is configured.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Council session failed</AlertTitle>
            <AlertDescription>
              {runCouncil.error instanceof Error ? runCouncil.error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        )
      )}

      {transcript && <CouncilTranscriptView transcript={transcript} />}

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Past sessions
        </p>
        <SessionHistory postId={postId} mode={mode} />
      </div>
    </div>
  );
}

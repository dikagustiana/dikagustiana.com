import { sanitizeSearchParams } from "@/lib/admin/sanitizeQueryParams";
import { Badge } from "@/components/ui/badge";

export interface AdminEditorDebugLineProps {
  editorComponentName: string;
  pathname: string;
  search: string;
  sectionValue: string;
  resolvedSlug: string;
  figuresEnabled: boolean;
}

export function AdminEditorDebugLine({
  editorComponentName,
  pathname,
  search,
  sectionValue,
  resolvedSlug,
  figuresEnabled,
}: AdminEditorDebugLineProps) {
  const params = sanitizeSearchParams(search);
  const querySummary = params.length
    ? params.map((p) => `${p.key}=${p.value}`).join("&")
    : "(none)";

  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
        <Badge variant="secondary" className="text-xs font-normal">
          admin debug
        </Badge>
        <span>
          <span className="text-foreground">editorComponentName</span>={editorComponentName}
        </span>
        <span className="text-muted-foreground">•</span>
        <span>
          <span className="text-foreground">currentRoute</span>={pathname}
        </span>
        <span className="text-muted-foreground">•</span>
        <span>
          <span className="text-foreground">query</span>={querySummary}
        </span>
        <span className="text-muted-foreground">•</span>
        <span>
          <span className="text-foreground">sectionValue</span>={sectionValue || "(empty)"}
        </span>
        <span className="text-muted-foreground">•</span>
        <span>
          <span className="text-foreground">resolvedSlug</span>={resolvedSlug || "(empty)"}
        </span>
        <span className="text-muted-foreground">•</span>
        <span>
          <span className="text-foreground">figuresEnabled</span>={String(figuresEnabled)}
        </span>
      </div>
    </div>
  );
}

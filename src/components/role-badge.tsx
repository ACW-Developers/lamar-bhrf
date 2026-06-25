import { Badge } from "@/components/ui/badge";
import { ROLE_SHORT, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const toneByRole: Record<AppRole, string> = {
  administrator: "bg-primary/15 text-primary border-primary/20",
  bhp: "bg-chart-2/20 text-foreground border-chart-2/30",
  bht: "bg-chart-3/25 text-foreground border-chart-3/30",
  bhpp: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role, className }: { role: AppRole; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", toneByRole[role], className)}>
      {ROLE_SHORT[role]}
    </Badge>
  );
}

export function StatusPill({
  status,
  tone = "default",
}: {
  status: string;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/25 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    primary: "bg-primary/12 text-primary",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        toneClass,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

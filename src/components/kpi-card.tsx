import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "destructive";
}) {
  const toneRing = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/12 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/12 text-destructive",
  }[tone];

  return (
    <div className="surface-elevated relative overflow-hidden rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-3xl font-semibold text-foreground tabular-nums">{value}</div>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneRing)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {(delta !== undefined || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                delta >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}

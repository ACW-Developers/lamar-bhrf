import { useState, type ReactNode } from "react";
import { MoreHorizontal, Trash2, Pencil, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";

type Table =
  | "residents"
  | "medication_logs"
  | "incidents"
  | "group_sessions"
  | "therapy_sessions"
  | "supervision_logs"
  | "transportation_logs"
  | "progress_notes"
  | "admissions"
  | "assessments"
  | "treatment_plans"
  | "daily_observations"
  | "discharges"
  | "family_contacts"
  | "visitor_logs"
  | "resident_documents"
  | "staff_shifts";

export function useCanManage(recordAuthorId?: string | null, allowRoles: AppRole[] = []) {
  const { user, hasRole, hasAnyRole } = useAuth();
  const isAdmin = hasRole("administrator");
  const isAuthor = !!user && !!recordAuthorId && user.id === recordAuthorId;
  const isAllowedRole = allowRoles.length > 0 && hasAnyRole(allowRoles);
  return {
    isAdmin,
    canEdit: isAdmin || isAuthor || isAllowedRole,
    canDelete: isAdmin, // deletion is admin-only per BHRF policy
  };
}

export function RowActions({
  table,
  id,
  queryKey,
  authorId,
  onEdit,
  extra,
  label = "record",
}: {
  table: Table;
  id: string;
  queryKey: readonly unknown[];
  authorId?: string | null;
  onEdit?: () => void;
  extra?: ReactNode;
  label?: string;
}) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { canEdit, canDelete } = useCanManage(authorId);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} deleted`);
      qc.invalidateQueries({ queryKey });
      setConfirmOpen(false);
    },
    onError: (e) => toast.error("Delete failed", { description: (e as Error).message }),
  });

  if (!canEdit && !canDelete && !extra) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-0" aria-label="Actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onEdit && canEdit && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          )}
          {extra}
          {canDelete && (
            <>
              {(onEdit || extra) && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be removed and logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); del.mutate(); }}
              disabled={del.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import { RoleBadge } from "@/components/role-badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DataEmpty } from "@/components/data-empty";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Lamar BHRF" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, roles, hasRole, refresh } = useAuth();
  const isAdmin = hasRole("administrator");
  const qc = useQueryClient();

  const [form, setForm] = useState({ full_name: "", title: "", phone: "", on_duty: false });
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        title: profile.title ?? "",
        phone: profile.phone ?? "",
        on_duty: !!profile.on_duty,
      });
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Profile updated"); await refresh(); },
    onError: (e) => toast.error("Update failed", { description: (e as Error).message }),
  });

  const { data: staff } = useQuery({
    queryKey: ["all-staff"],
    enabled: isAdmin,
    queryFn: async () => {
      const [p, ur] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, title, on_duty").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rolesByUser = new Map<string, AppRole[]>();
      (ur.data ?? []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });
      return (p.data ?? []).map((s) => ({ ...s, roles: rolesByUser.get(s.id) ?? [] }));
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role assigned"); qc.invalidateQueries({ queryKey: ["all-staff"] }); },
    onError: (e) => toast.error("Could not assign role", { description: (e as Error).message }),
  });

  return (
    <div>
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, duty status, and (for admins) team access." />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="surface-elevated rounded-2xl p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Your profile</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lead BHT" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
            <div>
              <div className="text-sm font-medium">On duty</div>
              <div className="text-xs text-muted-foreground">Mark yourself active for shift staffing counts.</div>
            </div>
            <Switch checked={form.on_duty} onCheckedChange={(v) => setForm({ ...form, on_duty: v })} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save profile
            </Button>
          </div>
        </div>

        <div className="surface-elevated rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><SettingsIcon className="h-4 w-4" /> Your roles</div>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles yet. Ask an administrator to assign access.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-sm">{ROLE_LABELS[r]}</span>
                  <RoleBadge role={r} />
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Roles control which clinical modules you can read or write to, in accordance with your facility's RBAC policy.
          </p>
        </div>

        {isAdmin && (
          <div className="surface-elevated rounded-2xl p-6 lg:col-span-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Staff & role management</div>
            {!staff?.length ? (
              <DataEmpty icon={ShieldCheck} title="No staff loaded yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="w-56">Assign role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                      <TableCell className="text-sm">{s.title ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {s.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          {s.roles.map((r) => <RoleBadge key={r} role={r} />)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(role) => assignRole.mutate({ userId: s.id, role: role as AppRole })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add role…" /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([k, v]) => (
                              <SelectItem key={k} value={k} disabled={s.roles.includes(k)}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

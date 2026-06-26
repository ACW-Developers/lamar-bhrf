import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users2, Loader2, Plus, LogIn, LogOut } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "Contacts & Visitation — Lamar BHRF" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const [openC, setOpenC] = useState(false);
  const [openV, setOpenV] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: contacts } = useQuery({
    queryKey: ["family-contacts"],
    queryFn: async () => {
      const { data } = await supabase.from("family_contacts").select("*, resident:residents(first_name, last_name, mrn)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: visits } = useQuery({
    queryKey: ["visitor-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("visitor_logs").select("*, resident:residents(first_name, last_name, mrn)").order("check_in", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const checkout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visitor_logs").update({ check_out: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Visitor checked out"); qc.invalidateQueries({ queryKey: ["visitor-logs"] }); },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Family"
        title="Contacts & Visitation"
        description="Manage emergency contacts and visitor check-ins."
        actions={
          <div className="flex gap-2">
            <Dialog open={openV} onOpenChange={setOpenV}>
              <DialogTrigger asChild><Button variant="outline"><LogIn className="mr-2 h-4 w-4" /> Check in visitor</Button></DialogTrigger>
              <NewVisitorDialog onClose={() => setOpenV(false)} userId={user?.id} />
            </Dialog>
            <Dialog open={openC} onOpenChange={setOpenC}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add contact</Button></DialogTrigger>
              <NewContactDialog onClose={() => setOpenC(false)} userId={user?.id} />
            </Dialog>
          </div>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="contacts">
          <TabsList><TabsTrigger value="contacts">Contacts</TabsTrigger><TabsTrigger value="visits">Visitor log</TabsTrigger></TabsList>
          <TabsContent value="contacts">
            <div className="surface-elevated rounded-2xl overflow-hidden">
              {!contacts?.length ? <DataEmpty icon={Users2} title="No contacts yet" /> : (
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Resident</TableHead><TableHead>Name</TableHead><TableHead>Relationship</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Flags</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {contacts.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.resident?.first_name} {c.resident?.last_name}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-sm">{c.relationship ?? "—"}</TableCell>
                        <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                        <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                        <TableCell className="space-x-1">
                          {c.is_emergency && <Badge variant="destructive">Emergency</Badge>}
                          {c.can_visit && <Badge variant="secondary">Visit OK</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
          <TabsContent value="visits">
            <div className="surface-elevated rounded-2xl overflow-hidden">
              {!visits?.length ? <DataEmpty icon={LogIn} title="No visits logged" /> : (
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Visitor</TableHead><TableHead>Resident</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {visits.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.visitor_name} <span className="text-xs text-muted-foreground">({v.relationship ?? "—"})</span></TableCell>
                        <TableCell>{v.resident?.first_name} {v.resident?.last_name}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(v.check_in)}</TableCell>
                        <TableCell className="text-sm">{v.check_out ? formatDateTime(v.check_out) : <Badge variant="secondary">On site</Badge>}</TableCell>
                        <TableCell>{!v.check_out && <Button size="sm" variant="ghost" onClick={() => checkout.mutate(v.id)}><LogOut className="mr-1 h-3.5 w-3.5" /> Check out</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function useResidents() {
  return useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => {
      const { data } = await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name");
      return data ?? [];
    },
  });
}

function NewContactDialog({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const qc = useQueryClient();
  const { data: residents } = useResidents();
  const [f, setF] = useState({ resident_id: "", name: "", relationship: "", phone: "", email: "", is_emergency: false, can_visit: true, notes: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!f.resident_id || !f.name) throw new Error("Resident and name are required");
      const { error } = await supabase.from("family_contacts").insert({ ...f, created_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contact added"); qc.invalidateQueries({ queryKey: ["family-contacts"] }); onClose(); },
    onError: (e) => toast.error("Failed", { description: (e as Error).message }),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add contact</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="space-y-1.5"><Label>Resident</Label>
          <Select value={f.resident_id} onValueChange={(v) => setF({ ...f, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>{residents?.map((r) => <SelectItem key={r.id} value={r.id}>{r.last_name}, {r.first_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Relationship</Label><Input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} placeholder="e.g. Mother" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2"><Label>Emergency contact</Label><Switch checked={f.is_emergency} onCheckedChange={(v) => setF({ ...f, is_emergency: v })} /></div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2"><Label>Visitation allowed</Label><Switch checked={f.can_visit} onCheckedChange={(v) => setF({ ...f, can_visit: v })} /></div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
    </DialogContent>
  );
}

function NewVisitorDialog({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const qc = useQueryClient();
  const { data: residents } = useResidents();
  const [f, setF] = useState({ resident_id: "", visitor_name: "", relationship: "", notes: "" });
  const create = useMutation({
    mutationFn: async () => {
      if (!f.resident_id || !f.visitor_name) throw new Error("Resident and visitor name required");
      const { error } = await supabase.from("visitor_logs").insert({ ...f, logged_by: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Visitor checked in"); qc.invalidateQueries({ queryKey: ["visitor-logs"] }); onClose(); },
    onError: (e) => toast.error("Failed", { description: (e as Error).message }),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Visitor check-in</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="space-y-1.5"><Label>Resident</Label>
          <Select value={f.resident_id} onValueChange={(v) => setF({ ...f, resident_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>{residents?.map((r) => <SelectItem key={r.id} value={r.id}>{r.last_name}, {r.first_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Visitor name</Label><Input value={f.visitor_name} onChange={(e) => setF({ ...f, visitor_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Relationship</Label><Input value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Check in</Button></DialogFooter>
    </DialogContent>
  );
}

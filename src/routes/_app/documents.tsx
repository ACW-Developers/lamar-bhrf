import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileLock2, Loader2, Upload, Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DataEmpty } from "@/components/data-empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/documents")({
  head: () => ({ meta: [{ title: "Documents - Lamar BHRF" }] }),
  component: DocumentsPage,
});

const CATEGORIES = ["Intake", "Consent", "Insurance", "Clinical", "Discharge", "Legal", "Other"];

function DocumentsPage() {
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("administrator");
  const [open, setOpen] = useState(false);

  const { data: docs } = useQuery({
    queryKey: ["resident-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("resident_documents")
        .select("*, resident:residents(first_name, last_name, mrn), uploader:profiles!resident_documents_uploaded_by_fkey(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("resident-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Could not generate link"); return; }
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = name; a.click();
  };

  const remove = useMutation({
    mutationFn: async (d: any) => {
      await supabase.storage.from("resident-documents").remove([d.storage_path]);
      const { error } = await supabase.from("resident_documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Document deleted"); qc.invalidateQueries({ queryKey: ["resident-documents"] }); },
    onError: (e) => toast.error("Delete failed", { description: (e as Error).message }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="HIPAA Vault"
        title="Resident Documents"
        description="Securely store consents, intake paperwork, and clinical files. Encrypted at rest."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Upload className="mr-2 h-4 w-4" /> Upload</Button></DialogTrigger>
            <UploadDialog onClose={() => setOpen(false)} userId={user?.id} />
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="surface-elevated rounded-2xl overflow-hidden">
          {!docs?.length ? <DataEmpty icon={FileLock2} title="No documents uploaded" description="All files are stored in a private, HIPAA-aligned bucket." /> : (
            <Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>File</TableHead><TableHead>Resident</TableHead><TableHead>Category</TableHead><TableHead>Uploaded</TableHead><TableHead>By</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.resident?.first_name} {d.resident?.last_name}</TableCell>
                    <TableCell className="text-sm">{d.category ?? "-"}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(d.created_at)}</TableCell>
                    <TableCell className="text-sm">{d.uploader?.full_name ?? "-"}</TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => download(d.storage_path, d.name)}><Download className="h-3.5 w-3.5" /></Button>
                      {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove.mutate(d)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadDialog({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const qc = useQueryClient();
  const [residentId, setResidentId] = useState("");
  const [category, setCategory] = useState("Intake");
  const [file, setFile] = useState<File | null>(null);

  const { data: residents } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () => {
      const { data } = await supabase.from("residents").select("id, first_name, last_name, mrn").order("last_name");
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!residentId || !file) throw new Error("Resident and file required");
      const path = `${residentId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("resident-documents").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("resident_documents").insert({
        resident_id: residentId, name: file.name, category, storage_path: path,
        mime_type: file.type, size_bytes: file.size, uploaded_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Uploaded"); qc.invalidateQueries({ queryKey: ["resident-documents"] }); onClose(); },
    onError: (e) => toast.error("Upload failed", { description: (e as Error).message }),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Upload document</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="space-y-1.5"><Label>Resident</Label>
          <Select value={residentId} onValueChange={setResidentId}>
            <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
            <SelectContent>{residents?.map((r) => <SelectItem key={r.id} value={r.id}>{r.last_name}, {r.first_name} • {r.mrn}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>File</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => upload.mutate()} disabled={upload.isPending}>{upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Upload</Button></DialogFooter>
    </DialogContent>
  );
}

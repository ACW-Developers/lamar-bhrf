import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth, ROLE_SHORT } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile - Lamar BHRF" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, roles, refresh, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setTitle(profile.title ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const initials = (fullName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, title, phone })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile", { description: error.message });
    } else {
      toast.success("Profile updated");
      await refresh();
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Update how your name and contact details appear across the facility."
      />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="surface-elevated grid gap-6 rounded-2xl p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/15 text-primary text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold">{fullName || "Unnamed"}</div>
            <div className="truncate text-sm text-muted-foreground">{profile?.email}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roles.length ? (
                roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {ROLE_SHORT[r]}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-[10px]">No role assigned</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="surface-elevated rounded-2xl p-6">
          <div className="mb-4">
            <div className="text-sm font-semibold">Personal details</div>
            <div className="text-xs text-muted-foreground">Only administrators can change your role.</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Behavioral Health Professional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

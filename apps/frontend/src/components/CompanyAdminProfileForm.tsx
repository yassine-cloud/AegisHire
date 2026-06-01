"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Lock, Mail, UserRound } from "lucide-react";

export default function CompanyAdminProfileForm({
  initialData,
}: {
  initialData: { displayName?: string; email?: string };
}) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initialData.displayName || "");
  const [email] = useState(initialData.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError("The new password confirmation does not match.");
      setLoading(false);
      return;
    }

    try {
      const trimmedDisplayName = displayName.trim();

      const updateData: any = {};
      if (trimmedDisplayName) {
        updateData.data = { display_name: trimmedDisplayName, full_name: trimmedDisplayName };
      }
      if (newPassword) {
        updateData.password = newPassword;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.auth.updateUser(updateData);
        if (error) throw new Error(error.message);
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update account settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4" />
          Account settings saved successfully!
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="displayName" className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          Display name
        </Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Email address
        </Label>
        <Input id="email" value={email} readOnly aria-readonly="true" className="bg-muted/40 text-muted-foreground" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            New password
          </Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" autoComplete="new-password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Confirm password
          </Label>
          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

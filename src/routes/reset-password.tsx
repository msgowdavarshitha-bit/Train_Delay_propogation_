import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SurfaceCard } from "@/components/rail/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — RailSense" },
      { name: "description", content: "Choose a new password for your RailSense account." },
      { property: "og:title", content: "Reset password — RailSense" },
      { property: "og:description", content: "Set a new password for your RailSense account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="ambient-glow flex min-h-screen items-center justify-center bg-background px-4">
      <SurfaceCard className="animate-rise relative z-10 w-full max-w-md p-6">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <KeyRound className="size-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a new password for your RailSense account.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl bg-secondary/50"
            />
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Update password
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </SurfaceCard>
    </div>
  );
}

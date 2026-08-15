import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/rail/app-shell";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  SurfaceCard,
} from "@/components/rail/primitives";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts — RailSense" },
      { name: "description", content: "Delay alerts and journey notifications for your saved trains." },
      { property: "og:title", content: "Alerts — RailSense" },
      { property: "og:description", content: "Stay ahead of delays with train alerts." },
    ],
  }),
  component: NotificationsPage,
});

const priorityTone: Record<string, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
};

function NotificationsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All alerts marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Could not update alerts"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Alerts"
          title="Notifications"
          description="Delay, departure and arrival alerts for the trains you follow."
          actions={
            user ? (
              <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                <CheckCheck className="size-4" /> Mark all read
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : !user ? (
          <EmptyState
            icon={<Bell className="size-5" />}
            title="Sign in to get alerts"
            description="Create a free account to follow trains and receive delay notifications."
            action={
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            }
          />
        ) : isLoading ? (
          <LoadingSkeleton rows={3} />
        ) : !notifications?.length ? (
          <EmptyState
            icon={<BellRing className="size-5" />}
            title="No alerts yet"
            description="When a train you follow slips behind schedule, the alert will appear here."
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/settings">Alert preferences</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((item, i) => (
              <li key={item.id}>
                <SurfaceCard
                  className={
                    item.is_read
                      ? "animate-rise p-4"
                      : "animate-rise border-primary/30 p-4 ring-1 ring-primary/15"
                  }
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                      <TriangleAlert className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("en-IN")}
                        {item.train_id ? ` · ${item.train_id}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={priorityTone[item.priority] ?? "info"}>{item.priority}</StatusBadge>
                  </div>
                </SurfaceCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

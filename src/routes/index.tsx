import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meet Map — the PMF Circle connection map" },
      {
        name: "description",
        content:
          "A private connection map for PMF Circle members. Find founders by Chennai neighbourhood, log your meets, and watch your network grow.",
      },
      { property: "og:title", content: "Meet Map — the PMF Circle connection map" },
      {
        property: "og:description",
        content: "Private, members-only map of PMF Circle founders across Chennai.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/map", replace: true });
    });
  }, [navigate]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden map-dots px-6 text-center">
      <div className="island-coral blob absolute -left-16 top-10 h-56 w-56" aria-hidden />
      <div className="island-teal blob-alt absolute -right-20 bottom-24 h-64 w-64" aria-hidden />

      <div className="relative z-10 max-w-sm">
        <span className="inline-block rounded-full bg-secondary px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-secondary-foreground">
          PMF Circle only
        </span>
        <h1 className="mt-5 font-display text-5xl leading-[1.05]">Meet Map</h1>
        <p className="mt-4 text-[17px] leading-7 text-muted-foreground">
          The little map of founders you actually know. Find your neighbours, log your meets, grow
          your threads.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 font-display text-base font-bold text-primary-foreground shadow-pop transition active:translate-y-1 active:scale-[0.98]"
        >
          I'm in the Circle →
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Private by design. No public directory, no open signups.
        </p>
      </div>
    </main>
  );
}

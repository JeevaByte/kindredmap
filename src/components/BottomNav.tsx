import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Network, Plus, User } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { to: "/map", label: "Map", Icon: Map },
  { to: "/network", label: "Network", Icon: Network },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav({ onLogMeet }: { onLogMeet?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {onLogMeet ? (
        <button
          onClick={onLogMeet}
          className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-primary px-6 py-4 font-display text-sm font-bold text-primary-foreground shadow-pop transition active:translate-y-1 active:scale-95"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Log a Meet
          </span>
        </button>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-4 py-2">
          {items.map(({ to, label, Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition",
                  active ? "bg-surface-2 text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";

import { AvatarBubble } from "@/components/AvatarBubble";
import { BottomNav } from "@/components/BottomNav";
import { ConfirmBanners } from "@/components/ConfirmBanners";
import { FounderSheet } from "@/components/FounderSheet";
import { LogMeetSheet } from "@/components/LogMeetSheet";
import { Sheet } from "@/components/Sheet";
import {
  useCurrentUserId,
  useIsRegistered,
  useMembers,
  useMyConnections,
  useMyProfile,
} from "@/hooks/use-meetmap";
import {
  OUTSIDE_CHENNAI,
  buildingLine,
  matchesMyBuild,
  otherUserId,
  type ConnectionType,
  type Profile,
} from "@/lib/meetmap";

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { title: "The Map — Meet Map" },
      {
        name: "description",
        content: "Founder islands across Chennai. Tap a neighbourhood to see who's there.",
      },
      { property: "og:title", content: "The Map — Meet Map" },
      { property: "og:description", content: "Founder islands across Chennai." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MapPage,
});

type Filter = "everyone" | "near" | "match";

function MapPage() {
  const navigate = useNavigate();
  const myId = useCurrentUserId();
  const { data: me } = useMyProfile();
  const { data: members = [] } = useMembers();
  const { data: connections = [] } = useMyConnections();
  const { registered } = useIsRegistered();

  const [filter, setFilter] = useState<Filter>("everyone");
  const [zoomChennai, setZoomChennai] = useState(false);
  const [areaOpen, setAreaOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Profile | null>(null);
  const [logType, setLogType] = useState<ConnectionType | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Always keep myself on the map so I can find my own island after onboarding.
  const visible = useMemo(
    () =>
      members.filter((m) => {
        if (m.id === myId) return true;
        if (filter === "near") return !!me?.area && m.area === me.area;
        if (filter === "match") return matchesMyBuild(me, m);
        return true;
      }),
    [members, myId, filter, me],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const m of visible) {
      const key = m.area ?? OUTSIDE_CHENNAI;
      map.set(key, [...(map.get(key) ?? []), m]);
    }
    // Alphabetical islands; only areas with at least one member exist here.
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  const outside = groups.filter(([area]) => area === OUTSIDE_CHENNAI);
  const inside = groups.filter(([area]) => area !== OUTSIDE_CHENNAI);
  const hasOutside = outside.length > 0;
  const worldView = hasOutside && !zoomChennai;

  const chennaiCount = inside.reduce((n, [, list]) => n + list.length, 0);
  const outsideCount = outside.reduce((n, [, list]) => n + list.length, 0);

  const areaMembers = areaOpen ? (groups.find(([a]) => a === areaOpen)?.[1] ?? []) : [];
  const pickedConnections =
    picked && myId
      ? connections.filter((c) => otherUserId(c, myId) === picked.id && c.user_a_id !== c.user_b_id)
      : [];

  const searchResults = members
    .filter((m) => m.id !== myId)
    .filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="min-h-screen map-dots pb-40">
      <header className="px-5 pt-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          PMF Circle
        </p>
        <h1 className="font-display text-4xl leading-tight">
          {worldView ? "The world" : "Chennai"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {visible.length} founders {filter === "near" ? "on your island" : "on the map"}
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["everyone", "Everyone"],
              ["near", "Near me"],
              ["match", "Looking for what I'm building"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow-pop"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {key === "match" ? (
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> {label}
                </span>
              ) : (
                label
              )}
            </button>
          ))}
        </div>
      </header>

      <ConfirmBanners connections={connections} members={members} myId={myId} />

      {!registered ? (
        <section className="mt-5 px-5">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Almost there
            </p>
            <h2 className="mt-2 font-display text-xl leading-tight">
              Complete your details to unlock the Circle
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can look around now. Logging meets and confirming connections opens up once your
              profile is done.
            </p>
            <Link
              to="/register"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 font-display text-sm font-bold text-primary-foreground shadow-pop"
            >
              Complete my details →
            </Link>
          </div>
        </section>
      ) : null}

      {worldView ? (
        <section className="mt-6 grid gap-5 px-5">
          <button
            onClick={() => setZoomChennai(true)}
            className="island-coral blob pop-in flex min-h-44 flex-col items-center justify-center p-6 text-center transition active:scale-95"
          >
            <span className="font-display text-2xl">Chennai</span>
            <span className="mt-1 text-sm font-bold opacity-80">{chennaiCount} founders</span>
            <span className="mt-2 text-xs font-bold uppercase tracking-widest opacity-70">
              Tap to zoom in
            </span>
          </button>
          <button
            onClick={() => setAreaOpen(OUTSIDE_CHENNAI)}
            className="island-teal blob-alt pop-in flex min-h-36 flex-col items-center justify-center p-6 text-center transition active:scale-95"
          >
            <span className="font-display text-xl">Elsewhere</span>
            <span className="mt-1 text-sm font-bold opacity-80">{outsideCount} founders</span>
          </button>
        </section>
      ) : (
        <section className="mt-6 px-5">
          {hasOutside ? (
            <button
              onClick={() => setZoomChennai(false)}
              className="mb-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground"
            >
              ← Zoom out to the world
            </button>
          ) : null}

          {inside.length === 0 ? (
            <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
              No founders here yet with this filter. Try “Everyone”.
            </p>
          ) : (
            <div className="relative flex flex-col items-stretch gap-2 pb-6">
              {inside.map(([area, list], i) => {
                const mine = list.some((m) => m.id === myId);
                const tone = ["disc-coral", "disc-mustard", "disc-teal"][i % 3] as string;
                const size = Math.min(196, 132 + list.length * 8);
                const align = i % 3 === 0 ? "self-start" : i % 3 === 1 ? "self-center" : "self-end";
                return (
                  <div key={area} className={`${align} flex flex-col items-center`}>
                    {i > 0 ? (
                      <span
                        className="mb-1 -mt-2 select-none text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40"
                        style={{ transform: `rotate(${i % 2 ? 8 : -8}deg)` }}
                      >
                        · · · · ·
                      </span>
                    ) : null}
                    <button
                      onClick={() => setAreaOpen(area)}
                      style={{ animationDelay: `${i * 70}ms`, width: size, height: size }}
                      className={`${tone} pop-in relative grid shrink-0 place-items-center rounded-full transition active:scale-95 ${
                        mine ? "ring-4 ring-primary/30" : ""
                      }`}
                    >
                      {mine ? (
                        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary shadow-soft">
                          You
                        </span>
                      ) : null}
                      <span className="flex -space-x-3">
                        {list.slice(0, 3).map((m) => (
                          <AvatarBubble
                            key={m.id}
                            name={m.name}
                            avatar={m.avatar_url}
                            size={list.length > 1 ? 52 : 64}
                          />
                        ))}
                        {list.length > 3 ? (
                          <span className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-card bg-card/80 text-xs font-extrabold text-muted-foreground">
                            +{list.length - 3}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <span className="mt-2 font-display text-[13px] font-bold text-foreground">
                      {area} ({list.length})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <Sheet open={!!areaOpen} onClose={() => setAreaOpen(null)} title={areaOpen ?? ""}>
        <h2 className="font-display text-2xl">{areaOpen}</h2>
        <p className="text-sm text-muted-foreground">{areaMembers.length} founders</p>
        <div className="mt-4 space-y-2">
          {areaMembers.map((m) => {
            const isMe = m.id === myId;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setAreaOpen(null);
                  if (isMe) void navigate({ to: "/profile" });
                  else setPicked(m);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition active:scale-[0.98]"
              >
                <AvatarBubble name={m.name} avatar={m.avatar_url} size={44} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-display text-base">
                    {m.name}
                    {isMe ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary">
                        You
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {buildingLine(m)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>

      <FounderSheet
        open={!!picked && !logType}
        profile={picked}
        existing={pickedConnections}
        onClose={() => setPicked(null)}
        onPick={(type) => {
          if (!registered) {
            setPicked(null);
            void navigate({ to: "/register" });
            return;
          }
          setLogType(type);
        }}
      />

      <LogMeetSheet
        open={!!logType}
        type={logType}
        target={picked}
        myId={myId}
        onClose={() => {
          setLogType(null);
          setPicked(null);
        }}
      />

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Log a meet">
        <h2 className="font-display text-2xl">Who did you meet?</h2>
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search founders"
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>
        <div className="mt-3 space-y-2">
          {searchResults.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setPickerOpen(false);
                setPicked(m);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition active:scale-[0.98]"
            >
              <AvatarBubble name={m.name} avatar={m.avatar_url} size={40} />
              <span className="font-display text-base">{m.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <BottomNav
        onLogMeet={() => {
          if (!registered) return void navigate({ to: "/register" });
          setPickerOpen(true);
        }}
      />
    </main>
  );
}

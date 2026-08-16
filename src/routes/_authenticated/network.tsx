import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";

import emptyArt from "@/assets/network-empty.jpg";
import { AvatarBubble } from "@/components/AvatarBubble";
import { BottomNav } from "@/components/BottomNav";
import { ConfirmBanners } from "@/components/ConfirmBanners";
import { Sheet } from "@/components/Sheet";
import { supabase } from "@/integrations/supabase/client";
import {
  useCurrentUserId,
  useInvalidateMeetMap,
  useIsRegistered,
  useMembers,
  useMyConnections,
  useMyProfile,
  useStoredUrl,
} from "@/hooks/use-meetmap";
import {
  CONNECTION_EMOJI,
  CONNECTION_LABEL,
  otherUserId,
  type Connection,
  type ConnectionType,
  type Profile,
} from "@/lib/meetmap";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "My Network — Meet Map" },
      { name: "description", content: "Your confirmed threads across the PMF Circle." },
      { property: "og:title", content: "My Network — Meet Map" },
      { property: "og:description", content: "Your confirmed threads across the PMF Circle." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NetworkPage,
});

const SIZE = 340;
const CENTER = SIZE / 2;

/** Thread thickness/opacity grows with how real the connection is. */
const THREAD: Record<ConnectionType, { width: number; opacity: number; stroke: string }> = {
  know: { width: 1.5, opacity: 0.35, stroke: "var(--accent)" },
  met_online: { width: 2.75, opacity: 0.5, stroke: "var(--secondary-foreground)" },
  met_in_person: { width: 4.5, opacity: 0.72, stroke: "var(--primary)" },
};

/** Even rings of 6, 10, 14… so the orbit stays legible as it grows. */
function ringLayout(count: number) {
  const rings: { size: number; radius: number }[] = [];
  let placed = 0;
  let ring = 0;
  while (placed < count) {
    const capacity = 6 + ring * 4;
    const size = Math.min(capacity, count - placed);
    rings.push({ size, radius: 108 + ring * 62 });
    placed += size;
    ring += 1;
  }
  return rings;
}

function MeetDetail({ connection, who }: { connection: Connection; who: Profile }) {
  const photo = useStoredUrl(connection.photo_url);
  return (
    <div>
      <div className="flex items-center gap-3">
        <AvatarBubble name={who.name} avatar={who.avatar_url} size={56} />
        <div>
          <h2 className="font-display text-2xl">{who.name}</h2>
          <p className="text-sm font-bold text-accent-deep">
            {CONNECTION_EMOJI[connection.type]} {CONNECTION_LABEL[connection.type]}
            {connection.meet_date ? ` · ${connection.meet_date}` : ""}
          </p>
        </div>
      </div>
      {connection.note ? (
        <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-[15px] italic">“{connection.note}”</p>
      ) : null}
      {photo ? <img src={photo} alt="Meet photo" className="mt-3 w-full rounded-2xl object-cover" /> : null}
      {connection.fun_fact ? (
        <p className="mt-3 rounded-2xl border border-dashed border-accent/50 px-4 py-3 text-[15px]">
          <span className="font-bold text-accent-deep">Fun fact · </span>
          {connection.fun_fact}
        </p>
      ) : null}
    </div>
  );
}

function EmptyOrbit() {
  return (
    <section className="mt-8 px-6 text-center">
      <img
        src={emptyArt}
        alt="Two paper boats tied together by a thread"
        width={768}
        height={768}
        loading="lazy"
        className="mx-auto w-56 max-w-full"
      />
      <h2 className="mt-2 font-display text-2xl">No threads yet</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
        Go meet someone on the map — once they confirm, your thread shows up right here.
      </p>
      <Link
        to="/map"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground shadow-pop transition active:scale-95"
      >
        <Compass className="h-4 w-4" /> Explore the map
      </Link>
    </section>
  );
}

function NetworkPage() {
  const navigate = useNavigate();
  const myId = useCurrentUserId();
  const { data: me } = useMyProfile();
  const { data: members = [] } = useMembers();
  const { data: connections = [], refetch } = useMyConnections();
  const { registered } = useIsRegistered();
  const invalidate = useInvalidateMeetMap();
  const [open, setOpen] = useState<Connection | null>(null);

  // Live updates: a freshly confirmed connection appears without a manual refresh.
  useEffect(() => {
    if (!myId) return;
    const channel = supabase
      .channel("network-connections")
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => invalidate())
      .subscribe();
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [myId, invalidate, refetch]);

  const nodes = useMemo(() => {
    if (!myId) return [];
    return connections
      .filter((c) => c.status === "confirmed" && (c.user_a_id === myId || c.user_b_id === myId))
      .map((c) => {
        const person = members.find((m) => m.id === otherUserId(c, myId));
        return person ? { c, person } : null;
      })
      .filter(Boolean) as { c: Connection; person: Profile }[];
  }, [connections, members, myId]);

  const placed = useMemo(() => {
    const rings = ringLayout(nodes.length);
    let index = 0;
    return rings.flatMap((ring, r) =>
      Array.from({ length: ring.size }, (_, i) => {
        const node = nodes[index++]!;
        const angle = (-90 + r * 18 + (i * 360) / ring.size) * (Math.PI / 180);
        const x = CENTER + ring.radius * Math.cos(angle);
        const y = CENTER + ring.radius * Math.sin(angle);
        const bow = 26 + r * 10;
        const mx = (CENTER + x) / 2 + Math.cos(angle + Math.PI / 2) * bow;
        const my = (CENTER + y) / 2 + Math.sin(angle + Math.PI / 2) * bow;
        return { ...node, x, y, mx, my };
      }),
    );
  }, [nodes]);

  const board = SIZE + Math.max(0, (ringLayout(nodes.length).length - 1) * 124);

  return (
    <main className="min-h-screen map-dots pb-36">
      <header className="px-5 pt-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">My network</p>
        <h1 className="font-display text-4xl leading-tight">
          {nodes.length} thread{nodes.length === 1 ? "" : "s"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only confirmed meets show up here — that's what makes it real.
        </p>
      </header>

      <ConfirmBanners connections={connections} members={members} myId={myId} />

      {!registered ? (
        <section className="mt-5 px-5">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
            <h2 className="font-display text-lg leading-tight">
              Finish your details to start weaving threads
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connections open up once your profile is complete.
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

      {nodes.length === 0 ? (
        <EmptyOrbit />
      ) : (
        <>
          <section className="mt-6 flex justify-center overflow-x-auto no-scrollbar">
            <div className="relative shrink-0" style={{ width: board, height: board }}>
              <svg
                width={board}
                height={board}
                viewBox={`${(SIZE - board) / 2} ${(SIZE - board) / 2} ${board} ${board}`}
                className="absolute inset-0"
              >
                {placed.map(({ c, x, y, mx, my }) => {
                  const t = THREAD[c.type];
                  return (
                    <path
                      key={c.id}
                      d={`M ${CENTER} ${CENTER} Q ${mx} ${my} ${x} ${y}`}
                      className="thread"
                      fill="none"
                      stroke={t.stroke}
                      strokeWidth={t.width}
                      strokeOpacity={t.opacity}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              <button
                onClick={() => void navigate({ to: "/profile" })}
                aria-label="Open your profile"
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition active:scale-95"
                style={{ left: board / 2, top: board / 2 }}
              >
                <AvatarBubble name={me?.name ?? "You"} avatar={me?.avatar_url ?? null} size={86} />
              </button>

              {placed.map(({ c, person, x, y }) => (
                <button
                  key={c.id}
                  onClick={() => setOpen(c)}
                  className="pop-in absolute -translate-x-1/2 -translate-y-1/2 transition active:scale-90"
                  style={{ left: x + (board - SIZE) / 2, top: y + (board - SIZE) / 2 }}
                >
                  <AvatarBubble name={person.name} avatar={person.avatar_url} size={48} />
                  <span className="absolute -bottom-1 -right-1 text-sm">{CONNECTION_EMOJI[c.type]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 space-y-2 px-5">
            {placed.map(({ c, person }) => (
              <button
                key={c.id}
                onClick={() => setOpen(c)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-soft transition active:scale-[0.98]"
              >
                <AvatarBubble name={person.name} avatar={person.avatar_url} size={44} />
                <span className="min-w-0">
                  <span className="block font-display text-base">{person.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {CONNECTION_EMOJI[c.type]} {CONNECTION_LABEL[c.type]}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </section>
        </>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title="Meet details">
        {open ? (
          <MeetDetail
            connection={open}
            who={
              (members.find((m) => myId && m.id === otherUserId(open, myId)) ?? {
                name: "Founder",
                avatar_url: null,
              }) as Profile
            }
          />
        ) : null}
      </Sheet>

      <BottomNav />
    </main>
  );
}

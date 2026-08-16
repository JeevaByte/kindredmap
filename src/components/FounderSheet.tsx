import { useEffect, useState } from "react";
import { Handshake, HeartHandshake, Laptop, Link2, Sparkles } from "lucide-react";

import { useFunFacts } from "@/hooks/use-meetmap";
import { PortraitCard } from "@/components/PortraitCard";
import { Sheet } from "@/components/Sheet";
import { buildingLine, type Connection, type ConnectionType, type Profile } from "@/lib/meetmap";

const actions = [
  { type: "know" as ConnectionType, label: "Know them", Icon: HeartHandshake },
  { type: "met_online" as ConnectionType, label: "Met online", Icon: Laptop },
  { type: "met_in_person" as ConnectionType, label: "Met in person", Icon: Handshake },
];

type Props = {
  profile: Profile | null;
  open: boolean;
  onClose: () => void;
  onPick: (type: ConnectionType) => void;
  existing: Connection[];
};

function FunFacts({ name, profileId }: { name: string; profileId: string }) {
  const { data: facts = [] } = useFunFacts(profileId);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (facts.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % facts.length), 4500);
    return () => clearInterval(id);
  }, [facts.length, profileId]);

  if (!facts.length) return null;
  const fact = facts[index % facts.length] as string;

  return (
    <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-3">
      <div className="flex items-start gap-2 text-left">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
        <p key={fact} className="pop-in text-sm leading-5 text-muted-foreground">
          Someone said {name} {fact.charAt(0).toLowerCase() + fact.slice(1)}
        </p>
      </div>
      {facts.length > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5">
          {facts.map((f, i) => (
            <span
              key={f + i}
              className={`h-1.5 w-1.5 rounded-full ${i === index % facts.length ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FounderSheet({ profile, open, onClose, onPick, existing }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={profile?.name ?? "Founder"}>
      {profile ? (
        <div>
          <PortraitCard
            name={profile.name}
            avatar={profile.avatar_url}
            line={buildingLine(profile) || "Still figuring out the pitch."}
            area={profile.area}
          />

          <div className="mt-5 grid grid-cols-3 gap-3">
            {actions.map(({ type, label, Icon }) => {
              const logged = existing.find((c) => c.type === type);
              return (
                <button
                  key={type}
                  disabled={!!logged}
                  onClick={() => onPick(type)}
                  className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-full border-2 px-2 text-center font-display text-[13px] font-bold leading-4 transition active:translate-y-1 active:scale-[0.97] disabled:active:translate-y-0 ${
                    logged
                      ? "border-secondary bg-secondary text-secondary-foreground shadow-pop"
                      : "border-secondary/70 bg-secondary/25 text-secondary-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{logged ? (logged.status === "confirmed" ? "Confirmed" : "Pending") : label}</span>
                </button>
              );
            })}
          </div>

          {profile.linkedin_url ? (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-display text-[17px] font-bold text-accent-foreground shadow-pop transition active:translate-y-1 active:scale-[0.98]"
            >
              <Link2 className="h-5 w-5" /> Connect (LinkedIn)
            </a>
          ) : (
            <p className="mt-5 rounded-full bg-surface-2 px-4 py-3.5 text-center text-sm text-muted-foreground">
              No LinkedIn on file yet.
            </p>
          )}

          <FunFacts name={profile.name} profileId={profile.id} />
        </div>
      ) : null}
    </Sheet>
  );
}

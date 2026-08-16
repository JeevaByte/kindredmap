import { toast } from "sonner";

import { AvatarBubble } from "@/components/AvatarBubble";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateMeetMap, useStoredUrl } from "@/hooks/use-meetmap";
import { daysSince, nudgeCopy, type Connection, type Profile } from "@/lib/meetmap";

function Row({ connection, from }: { connection: Connection; from: Profile }) {
  const invalidate = useInvalidateMeetMap();
  const photo = useStoredUrl(connection.photo_url);
  const waiting = daysSince(connection.created_at);

  async function confirm() {
    const { error } = await supabase
      .from("connections")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", connection.id);
    if (error) {
      toast.error("Couldn't confirm", { description: error.message });
      return;
    }
    invalidate();
    toast.success("Confirmed!", { description: `You and ${from.name} are now on the map together.` });
  }

  return (
    <div className="pop-in rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <AvatarBubble name={from.name} avatar={from.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-5">{nudgeCopy(connection.type, from.name)}</p>
          {connection.note ? (
            <p className="mt-1 text-sm italic text-muted-foreground">“{connection.note}”</p>
          ) : null}
          {waiting >= 3 ? (
            <p className="mt-1 text-xs font-bold text-primary-deep">
              Still hanging here since {waiting} days ago 🙈
            </p>
          ) : null}
        </div>
      </div>
      {photo ? (
        <img src={photo} alt="Meet photo" className="mt-3 h-36 w-full rounded-2xl object-cover" />
      ) : null}
      <button
        onClick={confirm}
        className="mt-3 w-full rounded-full bg-secondary py-3 font-display font-bold text-secondary-foreground shadow-soft transition active:translate-y-1 active:scale-[0.98]"
      >
        Confirm
      </button>
    </div>
  );
}

export function ConfirmBanners({
  connections,
  members,
  myId,
}: {
  connections: Connection[];
  members: Profile[];
  myId: string | null;
}) {
  if (!myId) return null;
  const incoming = connections.filter((c) => c.status === "pending" && c.initiated_by !== myId);
  if (incoming.length === 0) return null;

  return (
    <div className="space-y-3 px-5 pt-2">
      {incoming.map((c) => {
        const from = members.find((m) => m.id === c.initiated_by);
        if (!from) return null;
        return <Row key={c.id} connection={c} from={from} />;
      })}
    </div>
  );
}

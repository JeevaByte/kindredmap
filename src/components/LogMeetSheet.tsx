import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

import { Sheet } from "@/components/Sheet";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, useInvalidateMeetMap } from "@/hooks/use-meetmap";
import { CONNECTION_LABEL, type ConnectionType, type Profile } from "@/lib/meetmap";

type Props = {
  open: boolean;
  onClose: () => void;
  target: Profile | null;
  type: ConnectionType | null;
  myId: string | null;
};

export function LogMeetSheet({ open, onClose, target, type, myId }: Props) {
  const [note, setNote] = useState("");
  const [funFact, setFunFact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateMeetMap();

  async function submit(skip: boolean) {
    if (!target || !type || !myId) return;
    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (!skip && file) photoPath = await uploadImage(file, myId, "meets");

      const { error } = await supabase.from("connections").insert({
        user_a_id: myId,
        user_b_id: target.id,
        initiated_by: myId,
        type,
        note: skip ? null : note.trim() || null,
        photo_url: photoPath,
        meet_date: skip ? null : date,
        fun_fact: skip ? null : funFact.trim() || null,
      });
      if (error) throw error;

      invalidate();
      setNote("");
      setFunFact("");
      setFile(null);
      onClose();
      toast.success("Sent!", { description: `We'll let you know when ${target.name} confirms.` });
    } catch (e) {
      toast.error("Couldn't send that", {
        description: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setSaving(false);
    }
  }

  const isKnow = type === "know";

  return (
    <Sheet open={open} onClose={onClose} title="Log a meet">
      {target && type ? (
        <div>
          <h2 className="font-display text-2xl">
            {CONNECTION_LABEL[type]} — {target.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isKnow
              ? "Add a note if you want. Totally skippable."
              : "Add proof of the vibes. Totally skippable."}
          </p>

          {!isKnow ? (
            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-4">
              <ImagePlus className="h-6 w-6 text-accent-deep" />
              <span className="text-sm font-bold">
                {file ? file.name : "Photo or screenshot (optional)"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : null}

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Note
          </label>
          <textarea
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Where'd you meet? What'd you talk about?"
            rows={3}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            One fun thing about them? <span className="normal-case">(optional)</span>
          </label>
          <input
            value={funFact}
            maxLength={140}
            onChange={(e) => setFunFact(e.target.value)}
            placeholder="Makes the best filter coffee in Adyar"
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown anonymously on their card — no name attached.
          </p>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            When
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-[15px] outline-none focus:border-primary"
          />

          <button
            disabled={saving}
            onClick={() => submit(false)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-pop transition active:translate-y-1 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Send it
          </button>
          <button
            disabled={saving}
            onClick={() => submit(true)}
            className="mt-2 w-full rounded-full py-3 text-sm font-bold text-muted-foreground"
          >
            Skip the details
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

import { AreaSelect } from "@/components/AreaSelect";
import { AvatarBubble } from "@/components/AvatarBubble";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, useInvalidateMeetMap, useMyProfile } from "@/hooks/use-meetmap";
import { PRESET_AVATARS, randomBuildExample } from "@/lib/meetmap";

export const Route = createFileRoute("/_authenticated/register")({
  head: () => ({
    meta: [
      { title: "Complete your details — Meet Map" },
      {
        name: "description",
        content: "Add your name, photo, what you're building and your area to join the map.",
      },
      { property: "og:title", content: "Complete your details — Meet Map" },
      { property: "og:description", content: "A minute of details and you're on the map." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const invalidate = useInvalidateMeetMap();
  const { data: me, isLoading } = useMyProfile();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [what, setWhat] = useState("");
  const [forWho, setForWho] = useState("");
  const [so, setSo] = useState("");
  const [area, setArea] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [example] = useState(() => randomBuildExample());

  // Prefill from whatever the member already saved — nothing is ever lost.
  useEffect(() => {
    if (!me || prefilled) return;
    setName(me.name ?? "");
    setAvatar(me.avatar_url ?? null);
    setWhat(me.building_what ?? "");
    setForWho(me.building_for ?? "");
    setSo(me.building_so ?? "");
    setArea(me.area ?? "");
    setLinkedin(me.linkedin_url ?? "");
    setPhone(me.phone ?? "");
    setPrefilled(true);
  }, [me, prefilled]);

  const canSave =
    name.trim().length > 1 &&
    !!(avatar || file) &&
    !!what.trim() &&
    !!forWho.trim() &&
    !!so.trim() &&
    !!area;

  async function save() {
    if (!me) return;
    setBusy(true);
    try {
      let avatarRef = avatar;
      if (file) avatarRef = await uploadImage(file, me.id, "avatars");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          avatar_url: avatarRef,
          area,
          building_what: what.trim(),
          building_for: forWho.trim(),
          building_so: so.trim(),
          building_line: `Building ${what.trim()} for ${forWho.trim()} so they can ${so.trim()}`,
          linkedin_url: linkedin.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", me.id)
        .select("registration_status")
        .maybeSingle();
      if (error) throw error;

      invalidate();
      if (data?.registration_status === "complete") {
        toast.success("You're in!", { description: "Full access unlocked." });
        void navigate({ to: "/map", replace: true });
      } else {
        toast.message("Saved", { description: "A few details are still missing." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Try again";
      toast.error("Couldn't save that", {
        description: /duplicate|unique/i.test(msg)
          ? "That mobile number is already on another account."
          : msg,
      });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center map-dots">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen map-dots px-6 pb-16 pt-8">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-3xl leading-tight">Complete your details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Just the essentials — then you get full access to the map.
        </p>

        <section className="mt-8 space-y-3">
          <label className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Your name"
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg outline-none focus:border-primary"
          />
        </section>

        <section className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Your photo
          </p>
          <div className="mt-3 flex justify-center">
            <AvatarBubble name={name || "You"} avatar={file ? null : avatar} size={88} />
          </div>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-sm font-bold">
            <ImagePlus className="h-5 w-5 text-accent-deep" />
            {file ? file.name : "Upload a photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setAvatar(null);
              }}
            />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {PRESET_AVATARS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setAvatar(`preset:${emoji}`);
                  setFile(null);
                }}
                className={`rounded-2xl bg-card py-3 text-2xl shadow-soft transition active:scale-95 ${
                  avatar === `preset:${emoji}` ? "ring-2 ring-primary" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            What you're building
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-surface-2 px-3 py-3">
            <span className="mt-0.5 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              e.g.
            </span>
            <p className="text-sm italic leading-5 text-muted-foreground">{example}</p>
          </div>
          <div className="mt-3 space-y-3 rounded-3xl bg-card p-4 text-lg leading-9 shadow-soft">
            <span className="font-display">Building</span>
            <input
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="a hiring copilot"
              className="w-full rounded-xl bg-surface-2 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="font-display">for</span>
            <input
              value={forWho}
              onChange={(e) => setForWho(e.target.value)}
              placeholder="early-stage founders"
              className="w-full rounded-xl bg-surface-2 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="font-display">so they can</span>
            <input
              value={so}
              onChange={(e) => setSo(e.target.value)}
              placeholder="hire without recruiters"
              className="w-full rounded-xl bg-surface-2 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Your area
          </p>
          <div className="mt-3">
            <AreaSelect value={area} onChange={setArea} placeholder="Search your area" />
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Optional
          </p>
          <input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/you"
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none focus:border-primary"
          />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Mobile is only for future notifications — never shown publicly.
          </p>
        </section>

        <button
          disabled={!canSave || busy}
          onClick={() => void save()}
          className="mt-10 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-display text-base font-bold text-primary-foreground shadow-pop transition active:translate-y-1 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Finish registration
        </button>
        <button
          onClick={() => void navigate({ to: "/map" })}
          className="mt-2 w-full py-2 text-sm font-bold text-muted-foreground"
        >
          Back to the map
        </button>
      </div>
    </main>
  );
}

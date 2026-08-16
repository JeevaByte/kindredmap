import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  ChevronDown,
  Link2,
  Loader2,
  LogOut,
  MapPin,
  Rocket,
  Trash2,
  Upload,
} from "lucide-react";

import { AreaSelect } from "@/components/AreaSelect";
import { AvatarBubble } from "@/components/AvatarBubble";
import { BottomNav } from "@/components/BottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadImage,
  useCurrentUserId,
  useInvalidateMeetMap,
  useMembers,
  useMyConnections,
  useMyProfile,
  useStoredUrl,
} from "@/hooks/use-meetmap";
import {
  avatarTone,
  CONNECTION_EMOJI,
  CONNECTION_LABEL,
  FOUNDER_STAGES,
  initials,
  otherUserId,
  PRESET_AVATARS,
} from "@/lib/meetmap";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Edit Profile — Meet Map" },
      {
        name: "description",
        content: "Update your photo, your pitch, your stage and your island.",
      },
      { property: "og:title", content: "Edit Profile — Meet Map" },
      {
        property: "og:description",
        content: "Update your photo, your pitch, your stage and your island.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const fieldLabel = "block text-[13px] font-bold text-muted-foreground";
const pill =
  "w-full rounded-full border-0 bg-card px-5 py-4 text-[15px] text-foreground shadow-soft outline-none ring-primary/40 placeholder:text-muted-foreground/70 focus:ring-2";

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const myId = useCurrentUserId();
  const { data: me } = useMyProfile();
  const { data: members = [] } = useMembers();
  const { data: connections = [] } = useMyConnections();
  const invalidate = useInvalidateMeetMap();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [what, setWhat] = useState("");
  const [stage, setStage] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  function reset(profile = me) {
    if (!profile) return;
    setName(profile.name ?? "");
    setArea(profile.area ?? "");
    setWhat(profile.building_what ?? "");
    setStage(profile.founder_stage ?? "");
    setBio(profile.bio ?? "");
    setLinkedin(profile.linkedin_url ?? "");
    setAvatar(profile.avatar_url ?? null);
    setFile(null);
  }

  useEffect(() => {
    reset(me);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const pending = myId ? connections.filter((c) => c.status === "pending") : [];

  const storedAvatar = useStoredUrl(file ? null : avatar);
  const presetAvatar = !file && avatar?.startsWith("preset:") ? avatar.slice(7) : null;
  const heroUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : storedAvatar),
    [file, storedAvatar],
  );

  async function save() {
    if (!myId) return;
    setSaving(true);
    try {
      let avatarRef = avatar;
      if (file) avatarRef = await uploadImage(file, myId, "avatars");
      const trimmedWhat = what.trim();
      const forWho = me?.building_for?.trim() ?? "";
      const so = me?.building_so?.trim() ?? "";
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          area,
          avatar_url: avatarRef,
          building_what: trimmedWhat,
          building_line:
            forWho && so
              ? `Building ${trimmedWhat} for ${forWho} so they can ${so}`
              : trimmedWhat
                ? `Building ${trimmedWhat}`
                : null,
          founder_stage: stage || null,
          bio: bio.trim() || null,
          linkedin_url: linkedin.trim() || null,
        })
        .eq("id", myId);
      if (error) throw error;
      setFile(null);
      invalidate();
      toast.success("Saved!");
    } catch (e) {
      toast.error("Couldn't save", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    reset(me);
    void navigate({ to: "/map" });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  }

  async function deactivate() {
    if (!myId) return;
    const ok = window.confirm(
      "Deactivate your account? You'll be hidden from the map until you sign back in and finish your profile.",
    );
    if (!ok) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null, area: null })
      .eq("id", myId);
    if (error) {
      toast.error("Couldn't deactivate", { description: error.message });
      return;
    }
    await signOut();
  }

  return (
    <main className="min-h-screen bg-surface pb-36">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-surface/90 px-5 py-4 backdrop-blur">
        <button onClick={cancel} className="text-[15px] font-bold text-foreground">
          Cancel
        </button>
        <h1 className="font-display text-xl font-bold">Edit Profile</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-display text-[15px] font-bold text-primary-foreground shadow-pop transition active:translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </button>
      </header>

      <section className="px-5 pt-2">
        <div className="relative mx-auto h-36 w-36">
          <div className="h-36 w-36 overflow-hidden rounded-full border-[5px] border-card bg-surface-2 shadow-pop">
            {heroUrl ? (
              <img
                src={heroUrl}
                alt={name || "Your photo"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-5xl text-accent-deep">
                {presetAvatar ?? initials(name || "?")}
              </div>
            )}
          </div>
          <label
            className="absolute bottom-1 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-pop"
            aria-label="Update photo"
          >
            <Camera className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <p className="mt-5 text-center text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Choose an avatar
        </p>
        <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
          {PRESET_AVATARS.map((emoji, i) => (
            <button
              key={emoji}
              onClick={() => {
                setAvatar(`preset:${emoji}`);
                setFile(null);
              }}
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl transition active:scale-95 ${avatarTone(i)} ${
                !file && avatar === `preset:${emoji}`
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                  : ""
              }`}
              aria-label={`Use ${emoji} avatar`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-widest text-primary">
          <Upload className="h-4 w-4" />
          {file ? file.name : "Update photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </section>

      <section className="mt-8 space-y-5 px-5">
        <div>
          <label className={fieldLabel} htmlFor="full-name">
            Full Name
          </label>
          <input
            id="full-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={`mt-2 ${pill}`}
          />
        </div>

        <div>
          <label className={fieldLabel} htmlFor="building">
            What are you building?
          </label>
          <div className="relative mt-2">
            <input
              id="building"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="a hiring copilot"
              className={`${pill} pr-14`}
            />
            <Rocket className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-deep" />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Founder Stage</label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger
              className={`mt-2 h-auto justify-between ${pill} [&>svg]:hidden`}
              aria-label="Founder stage"
            >
              <SelectValue placeholder="Pick your stage" />
              <ChevronDown className="h-5 w-5 shrink-0 text-accent-deep" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {FOUNDER_STAGES.map((s) => (
                <SelectItem key={s} value={s} className="text-[15px] font-bold">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className={fieldLabel}>Neighborhood</label>
          <AreaSelect
            value={area}
            onChange={setArea}
            placeholder="Pick your area"
            className={`mt-2 font-normal ${pill}`}
            icon={<MapPin className="h-5 w-5 shrink-0 text-accent-deep" />}
          />
        </div>

        <div>
          <label className={fieldLabel} htmlFor="bio">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            maxLength={600}
            placeholder="A little about you, what you care about, who you'd love to meet."
            className="mt-2 w-full resize-none rounded-3xl border-0 bg-card px-5 py-4 text-[15px] leading-6 text-foreground shadow-soft outline-none ring-primary/40 placeholder:text-muted-foreground/70 focus:ring-2"
          />
        </div>

        <div>
          <label className={fieldLabel} htmlFor="linkedin">
            LinkedIn Profile URL
          </label>
          <div className="relative mt-2">
            <Link2 className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-deep" />
            <input
              id="linkedin"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/you"
              className={`${pill} pl-14`}
            />
          </div>
        </div>

        {pending.length ? (
          <div className="rounded-3xl bg-card p-4 shadow-soft">
            <h2 className="font-display text-lg">Waiting on confirmation</h2>
            <div className="mt-2 space-y-2">
              {pending.map((c) => {
                const who = members.find((m) => myId && m.id === otherUserId(c, myId));
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                    <AvatarBubble
                      name={who?.name ?? "?"}
                      avatar={who?.avatar_url ?? null}
                      size={36}
                    />
                    <span className="text-sm font-bold">
                      {who?.name ?? "Someone"}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {CONNECTION_EMOJI[c.type]} {CONNECTION_LABEL[c.type]}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <div className="h-px w-full bg-border" />
          <button
            onClick={deactivate}
            className="mx-auto mt-6 flex items-center gap-2 text-[15px] font-bold text-primary"
          >
            <Trash2 className="h-4 w-4" /> Deactivate Account
          </button>
          <button
            onClick={signOut}
            className="mx-auto mt-4 flex items-center gap-2 text-sm font-bold text-muted-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

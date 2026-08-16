import type { Tables, Enums } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Connection = Tables<"connections">;
export type ConnectionType = Enums<"connection_type">;

export const OUTSIDE_CHENNAI = "Outside Chennai";

/** Alphabetical localities, with "Outside Chennai" pinned last. */
export const CHENNAI_AREAS = [
  "Adyar",
  "Alwarpet",
  "Ambattur",
  "Anna Nagar",
  "Ashok Nagar",
  "Besant Nagar",
  "Chetpet",
  "Choolaimedu",
  "ECR",
  "Egmore",
  "George Town",
  "Guindy",
  "K.K. Nagar",
  "Kilpauk",
  "Kodambakkam",
  "Kotturpuram",
  "Mandaveli",
  "Medavakkam",
  "Mylapore",
  "Nandanam",
  "Neelankarai",
  "Nungambakkam",
  "OMR",
  "Pallavaram",
  "Perambur",
  "Perungudi",
  "Porur",
  "Royapettah",
  "Saidapet",
  "Sholinganallur",
  "T Nagar",
  "Tambaram",
  "Teynampet",
  "Thiruvanmiyur",
  "Triplicane",
  "Vadapalani",
  "Valasaravakkam",
  "Velachery",
  "Virugambakkam",
  "West Mambalam",
  OUTSIDE_CHENNAI,
] as const;

export const PRESET_AVATARS = ["🦊", "🐙", "🦉", "🐝", "🦕", "🐳", "🌶️", "🚀"];

/** Where a founder is at, shown as a dropdown on the profile screen. */
export const FOUNDER_STAGES = ["Idea", "MVP", "Early Revenue", "Scaling"] as const;

/** Soft pastel backgrounds cycled through the avatar picker row. */
const AVATAR_TONES = [
  "bg-primary/15 text-primary",
  "bg-secondary/50 text-secondary-foreground",
  "bg-accent/25 text-accent-deep",
  "bg-primary/25 text-primary",
  "bg-accent/15 text-accent-deep",
] as const;

export function avatarTone(index: number) {
  return AVATAR_TONES[index % AVATAR_TONES.length] as string;
}

const TONES = ["island-coral", "island-mustard", "island-teal"] as const;
export function islandTone(index: number) {
  return TONES[index % TONES.length] as string;
}

export const CONNECTION_LABEL: Record<ConnectionType, string> = {
  know: "Know them",
  met_online: "Met online",
  met_in_person: "Met in person",
};

export const CONNECTION_EMOJI: Record<ConnectionType, string> = {
  know: "👋",
  met_online: "💻",
  met_in_person: "🤝",
};

export function nudgeCopy(type: ConnectionType, name: string) {
  switch (type) {
    case "know":
      return `${name} says you two already know each other. Deny it if you dare 👀`;
    case "met_online":
      return `${name} says you two met online. Confirm before the internet forgets 💻`;
    case "met_in_person":
      return `${name} says you two met IRL. Vouch for it? 🤝`;
  }
}

export function buildingLine(p: Pick<Profile, "building_what" | "building_for" | "building_so" | "building_line">) {
  if (p.building_line) return p.building_line;
  if (!p.building_what) return "";
  return `Building ${p.building_what} for ${p.building_for ?? "…"} so they can ${p.building_so ?? "…"}`;
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
}

/** Rough "looking for what I'm building" match: audience/keyword overlap. */
export function matchesMyBuild(me: Profile | null | undefined, other: Profile) {
  if (!me) return false;
  const mine = new Set([...tokens(me.building_what ?? ""), ...tokens(me.building_for ?? "")]);
  if (mine.size === 0) return false;
  const theirs = [...tokens(other.building_for ?? ""), ...tokens(other.building_what ?? "")];
  return theirs.some((t) => mine.has(t));
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

export function otherUserId(c: Connection, myId: string) {
  return c.user_a_id === myId ? c.user_b_id : c.user_a_id;
}

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/**
 * Registration completeness. The database owns this via profiles.registration_status;
 * this helper mirrors the same rule for optimistic UI only.
 */
export function isProfileComplete(
  p:
    | (Pick<Profile, "name" | "avatar_url" | "building_what" | "building_for" | "building_so" | "area"> & {
        registration_status?: Profile["registration_status"];
      })
    | null
    | undefined,
) {
  if (!p) return false;
  if (p.registration_status) return p.registration_status === "complete";
  const filled = (v: string | null | undefined) => !!v && v.trim().length > 0;
  return (
    filled(p.name) &&
    filled(p.avatar_url) &&
    filled(p.building_what) &&
    filled(p.building_for) &&
    filled(p.building_so) &&
    filled(p.area)
  );
}

/** Playful example pitches shown (never pre-filled) on the mad-lib onboarding step. */
export const BUILD_EXAMPLES = [
  "Building a snack brand so office fridges everywhere stop being sad.",
  "Building an app that nags you to drink water so you actually remember (again).",
  "Building a way for founders to stop cold-DMing strangers on LinkedIn and actually getting replies.",
  "Building the thing that finally answers \u201cwait, what does your startup even do?\u201d in one sentence.",
  "Building spreadsheets that don't make finance teams want to cry.",
  "Building a matchmaking tool for co-founders so \u201clet's grab coffee and see\u201d stops being the entire strategy.",
  "Building an AI that writes your Reddit posts so you don't get roasted by the mods.",
  "Building the Duolingo of gym habits \u2014 minus the owl, plus a little guilt-tripping anyway.",
  "Building a way for D2C brands to stop burning money on ads that don't convert.",
  "Building a meal kit so \u201cwhat's for dinner\u201d stops ruining everyone's evening.",
];

export function randomBuildExample() {
  return BUILD_EXAMPLES[Math.floor(Math.random() * BUILD_EXAMPLES.length)] as string;
}

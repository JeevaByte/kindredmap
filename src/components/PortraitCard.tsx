import { useStoredUrl } from "@/hooks/use-meetmap";
import { initials } from "@/lib/meetmap";

type Props = {
  name: string;
  /** Storage path, "preset:🦊", or null. */
  avatar: string | null;
  line?: string | null;
  area?: string | null;
  /** Local file preview, takes priority over `avatar`. */
  file?: File | null;
};

/** Full-bleed portrait card with the name and pitch laid over the bottom. */
export function PortraitCard({ name, avatar, line, area, file }: Props) {
  const stored = useStoredUrl(file ? null : avatar);
  const preset = !file && avatar?.startsWith("preset:") ? avatar.slice(7) : null;
  const url = file ? URL.createObjectURL(file) : stored;

  return (
    <div className="rounded-[2rem] bg-card p-2 shadow-pop">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.6rem] disc-mustard">
        {url ? (
          <img src={url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-7xl text-accent-deep">
            {preset ?? initials(name)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent px-5 pb-5 pt-16 text-left">
          <h2 className="font-display text-3xl font-bold leading-tight text-card">{name}</h2>
          {line ? <p className="mt-0.5 text-[15px] leading-5 text-card/85">{line}</p> : null}
          {area ? (
            <p className="mt-1 text-xs font-extrabold uppercase tracking-widest text-card/70">{area}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

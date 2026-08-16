import { cn } from "@/lib/utils";
import { useStoredUrl } from "@/hooks/use-meetmap";
import { initials } from "@/lib/meetmap";

type Props = {
  name: string;
  avatar: string | null;
  size?: number;
  className?: string;
};

export function AvatarBubble({ name, avatar, size = 44, className }: Props) {
  const url = useStoredUrl(avatar);
  const preset = avatar?.startsWith("preset:") ? avatar.slice(7) : null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-card bg-surface-2 font-display font-bold text-foreground shadow-soft",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden={false}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : preset ? (
        <span>{preset}</span>
      ) : (
        <span className="text-muted-foreground">{initials(name)}</span>
      )}
    </span>
  );
}

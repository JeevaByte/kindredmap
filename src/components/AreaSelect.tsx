import { type ReactNode, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CHENNAI_AREAS } from "@/lib/meetmap";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (area: string) => void;
  placeholder?: string;
  /** Override the trigger styling (e.g. pill-shaped inputs on the profile screen). */
  className?: string;
  /** Replaces the default chevron on the right of the trigger. */
  icon?: ReactNode;
};

/** Searchable locality dropdown. Values are stored exactly as listed. */
export function AreaSelect({
  value,
  onChange,
  placeholder = "Pick your area",
  className,
  icon,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-left text-[15px] font-bold outline-none focus:border-primary",
            className,
          )}
        >
          <span className={value ? "" : "font-normal text-muted-foreground"}>
            {value || placeholder}
          </span>
          {icon ?? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-3rem))] rounded-2xl p-0">
        <Command>
          <CommandInput placeholder="Search areas…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No area found.</CommandEmpty>
            <CommandGroup>
              {CHENNAI_AREAS.map((area) => (
                <CommandItem
                  key={area}
                  value={area}
                  onSelect={() => {
                    onChange(area);
                    setOpen(false);
                  }}
                  className="text-[15px] font-bold"
                >
                  {area}
                  {value === area ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

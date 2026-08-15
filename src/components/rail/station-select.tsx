import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Station } from "@/lib/rail/data";

export function StationSelect({
  stations,
  value,
  onChange,
  placeholder = "Select station",
  label,
}: {
  stations: Station[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = stations.find((s) => s.StationCode === value);

  return (
    <div className="min-w-0">
      {label ? <p className="label-meta mb-1.5">{label}</p> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-12 w-full justify-between rounded-xl border-border bg-secondary/50 px-3 text-left font-normal"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                {selected ? (
                  <>
                    <span className="font-medium">{selected.StationName}</span>
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {selected.StationCode}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search station or city…" />
            <CommandList>
              <CommandEmpty>No station found.</CommandEmpty>
              <CommandGroup>
                {stations.map((station) => (
                  <CommandItem
                    key={station.StationID}
                    value={`${station.StationName} ${station.StationCode} ${station.City}`}
                    onSelect={() => {
                      onChange(station.StationCode);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        value === station.StationCode ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{station.StationName}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {station.StationCode}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

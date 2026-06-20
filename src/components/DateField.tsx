import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateDMY, parseDMYtoISO } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // dd/mm/yyyy
  onChange: (v: string) => void;
  placeholder?: string;
  /** Minimum selectable date (ISO yyyy-mm-dd). Dates before are disabled. */
  minDate?: string;
  /** Fallback month shown when no value is set (ISO yyyy-mm-dd). Defaults to today. */
  defaultMonth?: string;
};

export function DateField({ value, onChange, placeholder = "dd/mm/yyyy", minDate, defaultMonth }: Props) {
  const [open, setOpen] = useState(false);
  const iso = parseDMYtoISO(value);
  const selected = iso ? new Date(iso) : undefined;
  const min = minDate ? new Date(minDate) : undefined;
  const fallback = defaultMonth ? new Date(defaultMonth) : new Date();
  const month = selected ?? min ?? fallback;

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="اختر التاريخ">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={month}
            weekStartsOn={0}
            disabled={min ? { before: min } : undefined}
            modifiers={{ weekend: (d) => d.getDay() === 5 || d.getDay() === 6 }}
            modifiersClassNames={{ weekend: "text-destructive font-semibold" }}
            onSelect={(d) => {
              if (d) {
                onChange(formatDateDMY(d.toISOString()));
                setOpen(false);
              }
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // "YYYY-MM-DD"
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export default function DatePickerField({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Chọn ngày",
  className,
}: Props) {
  const parseDate = (s?: string) => {
    if (!s) return undefined;
    const d = parse(s, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  };

  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-40 justify-start gap-2 px-3 text-left text-sm font-normal",
            !selected && "text-slate-400",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
          {selected ? (
            <span className="font-medium text-slate-800">
              {format(selected, "dd/MM/yyyy")}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(format(d, "yyyy-MM-dd"));
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          defaultMonth={selected || minDate}
        />
      </PopoverContent>
    </Popover>
  );
}
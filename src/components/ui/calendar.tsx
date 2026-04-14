import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  blockedDates?: Date[];
  mode?: "single" | "range";
  selected?: Date | DateRange | undefined;
  onSelect?: (date: Date | DateRange | undefined) => void;
};

function normalize(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  blockedDates = [],
  mode = "single",
  selected,
  onSelect,
  defaultMonth,
  ...props
}: CalendarProps) {
  const blockedSet = new Set(blockedDates.map(normalize));

  const isDateBlocked = (date: Date) => blockedSet.has(normalize(date));

  const disabled = (date: Date) => {
    return isDateBlocked(date);
  };

  const modifiers = {
    blocked: (date: Date) => blockedSet.has(normalize(date)),
  };

  const modifiersClassNames: Record<string, string> = {
    blocked: "bg-red-100 text-red-900 line-through opacity-70 cursor-not-allowed",
  };

  if (mode === "range") {
    modifiersClassNames.selected = "bg-[#0071c2] text-white rounded-none";
    modifiersClassNames.range_middle = "bg-[#0071c2]/20 text-[#0071c2] rounded-none";
    modifiersClassNames.range_start = "bg-[#0071c2] text-white rounded-l-md rounded-r-none";
    modifiersClassNames.range_end = "bg-[#0071c2] text-white rounded-r-md rounded-l-none";
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 md:p-3", className)}
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={defaultMonth || new Date()}
      disabled={disabled}
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      numberOfMonths={1}
      fixedWeeks
      {...props}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-8 w-8 md:h-9 md:w-9 text-center text-xs md:text-sm p-0",
        day: cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 md:h-9 md:w-9 p-0 font-normal text-xs md:text-sm"),
        day_selected: mode === "single" ? "bg-primary text-primary-foreground" : "",
        day_today: "font-bold text-[#0071c2]",
        day_disabled: "opacity-40 cursor-not-allowed text-muted-foreground",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        ...props.components,
      }}
    />
  );
}

export { Calendar };
export type { DateRange };
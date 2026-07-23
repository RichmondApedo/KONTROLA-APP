"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useMediaQuery } from "@/hooks/use-media-query"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}


/**
 * DateRangePicker
 *
 * Uses a Popover with `modal={false}` so it works correctly when embedded
 * inside a Dialog or Sheet. Without this, the Radix focus trap blocks click
 * events on the calendar, making date selection impossible.
 *
 * On mobile, numberOfMonths=1 keeps it compact. avoidCollisions repositions
 * the popover automatically near screen edges.
 */
export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = React.useState(false);

  const handleSelect = (newDate: DateRange | undefined) => {
    onDateChange(newDate);
    // Close once a full range is selected
    if (newDate?.from && newDate?.to) {
      setOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal md:w-[260px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} &ndash;{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          sideOffset={4}
          avoidCollisions
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={isDesktop ? 2 : 1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

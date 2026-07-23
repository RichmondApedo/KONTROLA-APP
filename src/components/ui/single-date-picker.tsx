"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SingleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * SingleDatePicker
 *
 * Uses a Popover with `modal={false}` so it works correctly when embedded
 * inside a Dialog or Sheet (ResponsiveModal). Without `modal={false}`, Radix
 * Dialog's focus trap prevents click events from reaching the calendar,
 * making dates impossible to select.
 *
 * The PopoverContent portals to document.body by default in Radix UI, so it
 * always renders above any parent overlay at the correct z-index.
 */
export function SingleDatePicker({
  className,
  date,
  onDateChange,
  disabled
}: SingleDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (newDate: Date | undefined) => {
    onDateChange(newDate);
    if (newDate) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        // Ensure the calendar popover is never blocked by its parent Dialog/Sheet.
        // This is the critical fix: sideOffset gives touch-friendly spacing.
        sideOffset={4}
        // avoidCollisions repositions automatically near screen edges on mobile.
        avoidCollisions
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

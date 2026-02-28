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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}


export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    onDateChange(selectedDate);
    // On mobile, automatically close the sheet once a complete range is selected.
    if (!isDesktop && selectedDate?.from && selectedDate?.to) {
      setSheetOpen(false);
    }
  }

  const triggerButton = (
    <Button
      id="date"
      variant={"outline"}
      className={cn(
        "w-full justify-start text-left font-normal md:w-[260px]",
        !date && "text-muted-foreground"
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date?.from ? (
        date.to ? (
          <>
            {format(date.from, "LLL dd, y")} -{" "}
            {format(date.to, "LLL dd, y")}
          </>
        ) : (
          format(date.from, "LLL dd, y")
        )
      ) : (
        <span>Pick a date range</span>
      )}
    </Button>
  );

  // Desktop view: Use a Popover with 2 months
  if (isDesktop) {
      return (
        <div className={cn("grid gap-2", className)}>
          <Popover>
            <PopoverTrigger asChild>
              {triggerButton}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      )
  }
  
  // Mobile view: Use a Sheet with 1 month
  return (
    <div className={cn("grid gap-2", className)}>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl p-0">
            <div className="flex justify-center p-4">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={handleDateSelect}
                    numberOfMonths={1}
                />
            </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

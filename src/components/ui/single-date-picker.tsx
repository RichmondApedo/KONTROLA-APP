"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SingleDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
}

export function SingleDatePicker({
  className,
  date,
  onDateChange,
  disabled
}: SingleDatePickerProps) {
  // Format Date to YYYY-MM-DD string for native date input
  const dateValue = React.useMemo(() => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onDateChange(undefined);
      return;
    }
    const parts = val.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      const parsedDate = new Date(year, month - 1, day);
      onDateChange(parsedDate);
    }
  };

  const formattedDisplay = React.useMemo(() => {
    if (!date) return 'Pick a date';
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? 'Pick a date' : format(d, 'PPP');
  }, [date]);

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground z-10">
        <CalendarIcon className="h-4 w-4" />
      </div>
      <div className="absolute left-9 pointer-events-none text-sm font-medium text-foreground truncate z-10 pr-2">
        {formattedDisplay}
      </div>
      <input
        type="date"
        value={dateValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "w-full h-12 pl-9 pr-3 rounded-xl border border-border/40 bg-muted/30 text-transparent focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer select-none opacity-0 sm:opacity-100",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          // Hide standard webkit calendar indicator text while retaining full clickability
          color: 'transparent',
        }}
      />
    </div>
  );
}

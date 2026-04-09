import { 
    startOfDay, 
    endOfDay, 
    addMonths, 
    subMonths, 
    setDays, 
    lastDayOfMonth, 
    format,
    isAfter,
    getDate,
    setDate
} from 'date-fns';

/**
 * Calculates the current income cycle range based on a specific income day.
 * 
 * If today is March 20 and the income day is 15:
 * Range: March 15 to April 14.
 * 
 * If today is March 10 and the income day is 15:
 * Range: Feb 15 to March 14.
 * 
 * Handles month length variations automatically (e.g., if day is 31 and month has 30).
 */
export function getIncomeCycleRange(incomeDay: number, anchorDate: Date = new Date()) {
    const today = startOfDay(anchorDate);
    const year = today.getFullYear();
    const month = today.getMonth();

    // Calculate start date for this month
    let startDate = startOfDay(new Date(year, month, incomeDay));
    
    // If we are at the end of a month (e.g. 31st) and this month only has 30 days,
    // Date constructor handles it by rolling over, but we want it to snap to the last day.
    const lastDay = lastDayOfMonth(today);
    if (incomeDay > getDate(lastDay)) {
        startDate = startOfDay(lastDay);
    }

    // Determine if the current date is before the calculated start date for THIS month.
    // If so, the cycle actually started last month.
    if (isAfter(startDate, today)) {
        const prevMonth = subMonths(today, 1);
        startDate = startOfDay(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), incomeDay));
        
        const lastDayPrev = lastDayOfMonth(prevMonth);
        if (incomeDay > getDate(lastDayPrev)) {
            startDate = startOfDay(lastDayPrev);
        }
    }

    // The end date is exactly one cycle interval later, minus one day.
    // We calculate it by taking the start date of the NEXT cycle and subtracting 1 day.
    let nextCycleStart = addMonths(startDate, 1);
    
    // Ensure next cycle start also snaps to correct day if it's the 31st
    const lastDayNext = lastDayOfMonth(nextCycleStart);
    if (incomeDay > getDate(lastDayNext)) {
        nextCycleStart = startOfDay(lastDayNext);
    } else {
        // We need to re-set the day in case the previous cycle snapped to a shorter month
        // but this month is longer.
        nextCycleStart = startOfDay(setDate(nextCycleStart, incomeDay));
    }

    const endDate = endOfDay(new Date(nextCycleStart.getTime() - 86400000)); // Subtract 1 day in ms

    return {
        startDate,
        endDate,
        label: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
    };
}

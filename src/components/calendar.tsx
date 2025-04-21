import { useState } from "preact/hooks";
import { getLocalTimeZone, today } from "@internationalized/date";
import { RangeCalendar } from "../components/ui/range-calendar";
import { Button } from "../components/ui/button";
import { DateRange } from "../utils/date-range";

interface RangeCalendarProps {
  selectedDateRange: DateRange | null;
  setSelectedDateRange: (dateRange: DateRange | null) => void;
}

/**
 * Calendar component for selecting date ranges
 */
export function CustomRangeCalendar({
  selectedDateRange,
  setSelectedDateRange,
}: RangeCalendarProps) {
  const now = today(getLocalTimeZone());
  const tomorrowWeek = today(getLocalTimeZone()).add({ days: 7 });

  // Initialize with current value or default to now + 7 days
  const [value, setValue] = useState(
    selectedDateRange
      ? selectedDateRange.toDateValue()
      : {
          start: now,
          end: tomorrowWeek,
        }
  );

  /**
   * Handle date range selection
   */
  const handleSelectDateRange = () => {
    setSelectedDateRange(DateRange.fromDateValue(value));
  };

  /**
   * Clear date selection
   */
  const handleClearSelection = () => {
    setSelectedDateRange(null);
    setValue({
      start: now,
      end: tomorrowWeek,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <RangeCalendar
        className="**:data-[slot=calendar-header]:items-center"
        aria-label="Date range"
        value={value}
        onChange={(newValue) => {
          setValue(newValue as any);
        }}
      />

      <div className="flex flex-row gap-2 mt-2">
        <Button
          intent="primary"
          onClick={handleSelectDateRange}
          className="w-full"
        >
          Set Date Range
        </Button>
        <Button
          intent="outline"
          onClick={handleClearSelection}
          isDisabled={!selectedDateRange}
          className="w-full"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

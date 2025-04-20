import {
  CalendarDate,
  CalendarDateTime,
  DateValue,
  getLocalTimeZone,
  toCalendarDateTime,
  toZoned,
} from "@internationalized/date";

/**
 * DateRange class to manage date selections
 */
export class DateRange {
  start: Date;
  end: Date;

  /**
   * Create a date range
   */
  constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }

  /**
   * Get string representation of the date range
   */
  toString(): string {
    return `${this.formatDate(this.start)} to ${this.formatDate(this.end)}`;
  }

  /**
   * Format a date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleString();
  }

  /**
   * Convert the DateRange to IntentUI date format
   */
  toDateValue(): { start: DateValue; end: DateValue } {
    const startDt = new CalendarDateTime(
      this.start.getFullYear(),
      this.start.getMonth() + 1,
      this.start.getDate(),
      this.start.getHours(),
      this.start.getMinutes(),
      this.start.getSeconds()
    );

    const endDt = new CalendarDateTime(
      this.end.getFullYear(),
      this.end.getMonth() + 1,
      this.end.getDate(),
      this.end.getHours(),
      this.end.getMinutes(),
      this.end.getSeconds()
    );

    return {
      start: toZoned(startDt, getLocalTimeZone()),
      end: toZoned(endDt, getLocalTimeZone()),
    };
  }

  /**
   * Create a DateRange from IntentUI date objects
   */
  static fromDateValue(value: { start: DateValue; end: DateValue }): DateRange {
    const start = value.start.toDate(getLocalTimeZone());
    const end = value.end.toDate(getLocalTimeZone());
    return new DateRange(start, end);
  }
}

/**
 * Format date for input field
 */
export function formatDateTimeForInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

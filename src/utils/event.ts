import { DateRange } from "./date-range";

/**
 * Event interface representing a calendar event
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  dateRange: DateRange;
  color?: string; // Optional color for the event
  type?: string; // Optional type category for the event
}

/**
 * Check if an event falls on a specific date
 */
export function isEventOnDate(event: CalendarEvent, date: Date): boolean {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  return event.dateRange.start <= dateEnd && event.dateRange.end >= dateStart;
}

/**
 * Check if a date is the start date of an event
 */
export function isEventStartDate(event: CalendarEvent, date: Date): boolean {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const eventStart = new Date(event.dateRange.start);
  eventStart.setHours(0, 0, 0, 0);

  return eventStart.getTime() === dateStart.getTime();
}

/**
 * Check if a date is the end date of an event
 */
export function isEventEndDate(event: CalendarEvent, date: Date): boolean {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const eventEnd = new Date(event.dateRange.end);
  eventEnd.setHours(0, 0, 0, 0);

  return eventEnd.getTime() === dateStart.getTime();
}

/**
 * Update an event with a new date range
 */
export function updateEventDates(
  event: CalendarEvent,
  newStart?: Date,
  newEnd?: Date
): CalendarEvent {
  const start = newStart || event.dateRange.start;
  const end = newEnd || event.dateRange.end;

  // Ensure end date is not before start date
  const validEnd = end < start ? new Date(start) : end;

  return {
    ...event,
    dateRange: new DateRange(start, validEnd),
  };
}

/**
 * Move an event by a number of days
 */
export function moveEventByDays(
  event: CalendarEvent,
  days: number
): CalendarEvent {
  if (days === 0) return event;

  const newStart = new Date(event.dateRange.start);
  newStart.setDate(newStart.getDate() + days);

  const newEnd = new Date(event.dateRange.end);
  newEnd.setDate(newEnd.getDate() + days);

  return {
    ...event,
    dateRange: new DateRange(newStart, newEnd),
  };
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  events: CalendarEvent[],
  date: Date
): CalendarEvent[] {
  return events.filter((event) => isEventOnDate(event, date));
}

/**
 * Helper to create a new event
 */
export function createEvent(
  id: string,
  title: string,
  start: Date,
  end: Date,
  options: {
    description?: string;
    color?: string;
    type?: string;
  } = {}
): CalendarEvent {
  return {
    id,
    title,
    dateRange: new DateRange(start, end),
    ...options,
  };
}

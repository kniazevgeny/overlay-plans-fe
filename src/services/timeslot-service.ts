import { CalendarEvent, createEvent } from "../utils/event";
import { DateRange } from "../utils/date-range";

/**
 * Interface for timeslot data from server
 */
export interface TimeslotData {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  type?: string;
  status?: "available" | "booked" | "pending";
  meta?: Record<string, any>;
}

/**
 * Convert server timeslot data to calendar event
 */
export function timeslotToEvent(timeslot: TimeslotData): CalendarEvent {
  const startDate = new Date(timeslot.startTime);
  const endDate = new Date(timeslot.endTime);

  // Color based on status
  let color = "bg-blue-500"; // Default color
  if (timeslot.status === "available") {
    color = "bg-green-500";
  } else if (timeslot.status === "booked") {
    color = "bg-red-500";
  } else if (timeslot.status === "pending") {
    color = "bg-yellow-500";
  }

  return createEvent(timeslot.id, timeslot.title, startDate, endDate, {
    description: timeslot.description,
    color,
    type: timeslot.type,
  });
}

/**
 * Timeslot service for fetching timeslots from server
 */
export class TimeslotService {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/timeslots") {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch timeslots for a date range
   */
  async getTimeslots(dateRange: DateRange): Promise<CalendarEvent[]> {
    try {
      const startStr = dateRange.start.toISOString();
      const endStr = dateRange.end.toISOString();

      const response = await fetch(
        `${this.baseUrl}?startDate=${encodeURIComponent(
          startStr
        )}&endDate=${encodeURIComponent(endStr)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch timeslots: ${response.statusText}`);
      }

      const data: TimeslotData[] = await response.json();
      return data.map(timeslotToEvent);
    } catch (error) {
      console.error("Error fetching timeslots:", error);
      throw error;
    }
  }

  /**
   * Mock implementation that returns fake timeslots for testing
   */
  async getMockTimeslots(
    dateRange: DateRange,
    count: number = 15
  ): Promise<CalendarEvent[]> {
    const startMs = dateRange.start.getTime();
    const endMs = dateRange.end.getTime();
    const timeslots: TimeslotData[] = [];

    const statuses: Array<"available" | "booked" | "pending"> = [
      "available",
      "booked",
      "pending",
    ];
    const types = ["Session", "Appointment", "Consultation", "Meeting"];

    for (let i = 0; i < count; i++) {
      // Random time within the date range
      const randomTime = startMs + Math.random() * (endMs - startMs);
      const startTime = new Date(randomTime);

      // Duration between 30 minutes and 2 hours
      const durationMs = (30 + Math.floor(Math.random() * 90)) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationMs);

      // Skip if endTime is beyond the requested range
      if (endTime.getTime() > endMs) continue;

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const type = types[Math.floor(Math.random() * types.length)];

      timeslots.push({
        id: `timeslot-${i}`,
        title: `${type} ${i + 1}`,
        description: `${status} ${type.toLowerCase()} slot`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type,
        status,
      });
    }

    return timeslots.map(timeslotToEvent);
  }
}

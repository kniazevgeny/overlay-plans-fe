import { useState, useEffect } from "preact/hooks";
import { getLocalTimeZone, today, CalendarDate } from "@internationalized/date";
import { RangeCalendar, CalendarEvent } from "./ui/range-calendar";
import { WebSocketService } from "../utils/websocket-service";

interface RangeCalendarExampleProps {
  webSocketService: WebSocketService | null;
  connected: boolean;
  userId: string;
  projectId: string;
}

export function RangeCalendarExample({
  webSocketService,
  connected,
  userId,
  projectId,
}: RangeCalendarExampleProps) {
  // Set the default view to April-May 2025 where most of the events are
  const defaultStart = new CalendarDate(2025, 4, 1);
  const defaultEnd = new CalendarDate(2025, 5, 15);

  const [value, setValue] = useState({
    start: defaultStart,
    end: defaultEnd,
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Function to extract timeslots from different response formats
  const extractTimeslots = (data: any): any[] => {
    console.log("Extracting timeslots from data:", data);
    setDebugInfo(
      (prev) =>
        prev +
        "\nExtracting timeslots: " +
        JSON.stringify(data).substring(0, 100) +
        "..."
    );

    // If it's already a timeslots array, return it directly
    if (Array.isArray(data)) {
      console.log("Data is an array, using directly");
      return data;
    }

    // Check for standard timeslots_updated format
    if (data && Array.isArray(data.timeslots)) {
      console.log(`Found ${data.timeslots.length} timeslots in data.timeslots`);
      return data.timeslots;
    }

    // Check for response with timeslots at root level (like the server response you showed)
    if (data && data.success && Array.isArray(data.timeslots)) {
      console.log(`Found ${data.timeslots.length} timeslots at root level`);
      return data.timeslots;
    }

    // Check for getUserTimeslots response format
    if (data && data.success && data.data) {
      if (Array.isArray(data.data.timeslots)) {
        console.log(
          `Found ${data.data.timeslots.length} timeslots in data.data.timeslots`
        );
        return data.data.timeslots;
      }
      if (Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} timeslots in data.data array`);
        return data.data;
      }
    }

    // Return empty array if no timeslots found
    console.warn("No timeslots found in data:", data);
    return [];
  };

  // Function to process timeslots into calendar events
  const processTimeslots = (timeslotsData: any) => {
    try {
      console.log(
        "Processing timeslots:",
        timeslotsData.timeslots
          ? `${timeslotsData.timeslots.length} timeslots`
          : "no timeslots array found"
      );

      const timeslots = extractTimeslots(timeslotsData);

      if (timeslots.length === 0) {
        console.log("No timeslots to process");
        setEvents([]);
        setLastUpdate(`No events found (${new Date().toLocaleTimeString()})`);
        return;
      }

      console.log("Processing timeslots:", timeslots);
      setDebugInfo(
        (prev) => prev + "\nProcessing " + timeslots.length + " timeslots"
      );

      // Convert server timeslots to calendar events
      const calendarEvents: CalendarEvent[] = timeslots
        .filter((timeslot: any) => {
          // Ensure we have the required fields
          if (!timeslot.startTime || !timeslot.endTime) {
            console.error("Timeslot missing required fields:", timeslot);
            setDebugInfo(
              (prev) =>
                prev +
                "\nTimeslot missing required fields: " +
                JSON.stringify(timeslot)
            );
            return false;
          }
          return true;
        })
        .map((timeslot: any) => {
          // Default color if none provided
          const defaultColor =
            timeslot.status === "busy" ? "#ff5722" : "#4CAF50";

          // Convert to the expected CalendarEvent format
          const event: CalendarEvent = {
            id: timeslot.id ? timeslot.id.toString() : `temp-${Date.now()}`,
            title: timeslot.label || timeslot.status || "Untitled",
            startDate: new Date(timeslot.startTime),
            endDate: new Date(timeslot.endTime),
            color: timeslot.color || defaultColor,
          };

          return event;
        });

      console.log(`Created ${calendarEvents.length} calendar events`);

      // Only update if there are events to show
      if (calendarEvents.length > 0) {
        setEvents(calendarEvents);
        setLastUpdate(
          `Updated with ${
            calendarEvents.length
          } events (${new Date().toLocaleTimeString()})`
        );
      } else {
        setLastUpdate(
          `No valid events created (${new Date().toLocaleTimeString()})`
        );
      }
    } catch (error) {
      console.error("Error processing timeslots:", error);
      setDebugInfo(
        (prev) =>
          prev +
          "\nError processing timeslots: " +
          (error instanceof Error ? error.message : String(error))
      );
      setLastUpdate(
        `Error processing events (${new Date().toLocaleTimeString()})`
      );
    }
  };

  // Listen for timeslots_updated events and convert them to calendar events
  useEffect(() => {
    if (!webSocketService) return;

    console.log("Setting up timeslot subscription");

    // Subscribe to timeslot updates
    const cleanup = webSocketService.subscribeToTimeslotUpdates((data: any) => {
      console.log(
        "Received timeslot update with",
        data.timeslots ? data.timeslots.length : 0,
        "timeslots"
      );
      setRawData(data);
      processTimeslots(data);
    });

    // Initial fetch of timeslots based on the provided userId and projectId
    const userIdNum = parseInt(userId) || 1;
    const projectIdNum = parseInt(projectId) || 1;

    if (connected) {
      console.log(
        `Fetching timeslots for user ${userIdNum}, project ${projectIdNum}`
      );
      webSocketService.getUserTimeslots(userIdNum, projectIdNum);
    } else {
      console.log("Not connected, skipping initial fetch");
    }

    return cleanup;
  }, [webSocketService, userId, projectId, connected]);

  // Simplified logging when events change
  useEffect(() => {
    console.log(`Events state updated: ${events.length} events`);
    setDebugInfo(
      (prev) => prev + "\nEvents state updated: " + events.length + " events"
    );
  }, [events]);

  // Handler for event drag operations
  const handleEventDragEnd = (
    event: CalendarEvent,
    newStartDate: Date,
    newEndDate: Date
  ) => {
    if (!webSocketService) return;

    const userIdNum = parseInt(userId) || 1;
    const projectIdNum = parseInt(projectId) || 1;

    console.log("Updating event via drag:", {
      id: event.id,
      newStartDate,
      newEndDate,
    });

    // Set a loading message
    setLastUpdate(
      `Updating event ${event.title}... (${new Date().toLocaleTimeString()})`
    );

    // Update the event on the server
    webSocketService.updateTimeslot(
      parseInt(event.id),
      projectIdNum,
      userIdNum,
      { start: newStartDate, end: newEndDate },
      "", // notes
      "active" // status
    );

    // Fetch updated events after a short delay to ensure the update has processed
    setTimeout(() => {
      console.log("Fetching updated events after drag");
      webSocketService.getUserTimeslots(userIdNum, projectIdNum);
      setLastUpdate(
        `Refreshing events after update... (${new Date().toLocaleTimeString()})`
      );
    }, 300);
  };

  // Add mock events if real events aren't available (for testing)
  const addMockEvents = () => {
    // Use 2025 for the mock events to match server data
    const mockEvents: CalendarEvent[] = [
      {
        id: "mock-1",
        title: "Mock Event 1",
        startDate: new Date(2025, 3, 15), // April 15, 2025
        endDate: new Date(2025, 3, 18), // April 18, 2025
        color: "#4b99d2",
      },
      {
        id: "mock-2",
        title: "Mock Event 2",
        startDate: new Date(2025, 4, 5), // May 5, 2025
        endDate: new Date(2025, 4, 5), // May 5, 2025
        color: "#e7ba51",
      },
    ];
    setEvents(mockEvents);
    setLastUpdate(`Added mock events (${new Date().toLocaleTimeString()})`);
  };

  // Manual refresh button handler
  const handleRefresh = () => {
    if (webSocketService && connected) {
      const userIdNum = parseInt(userId) || 1;
      const projectIdNum = parseInt(projectId) || 1;

      console.log(
        `Manual refresh - fetching events for user ${userIdNum}, project ${projectIdNum}`
      );
      webSocketService.getUserTimeslots(userIdNum, projectIdNum);
    }
  };

  return (
    <div className="w-full mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time Calendar Events</h1>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-600">
              {connected ? "Connected to server" : "Disconnected"}
            </span>
          </div>

          {connected && (
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Refresh</span>
            </button>
          )}
        </div>

        <div className="text-sm flex justify-between items-center mt-1">
          <span className="text-gray-600">
            {events.length > 0
              ? `${events.length} events loaded`
              : "No events loaded"}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">{lastUpdate}</span>
          )}
        </div>

        <div className="text-xs text-gray-500 mt-1">
          Calendar view set to April-May 2025 (where most events are located)
        </div>

        {events.length === 0 && connected && (
          <div className="mt-2">
            <button
              onClick={addMockEvents}
              className="text-sm text-blue-600 hover:underline"
            >
              Add mock events (for testing)
            </button>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 bg-white shadow">
        <RangeCalendar
          value={value}
          onChange={setValue}
          events={events}
          onEventDragEnd={handleEventDragEnd}
        />
      </div>

      {rawData && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <details>
            <summary className="text-sm font-medium cursor-pointer">
              Raw WebSocket Data
            </summary>
            <pre className="mt-2 text-xs overflow-auto max-h-40">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <details>
          <summary className="text-sm font-medium cursor-pointer">
            Debug Information
          </summary>
          <pre className="mt-2 text-xs overflow-auto max-h-40">{debugInfo}</pre>
        </details>
      </div>
    </div>
  );
}

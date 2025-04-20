import { useState, useRef, useEffect } from "preact/hooks";
import "./app.css";

import { WebSocketService } from "./utils/websocket-service";
import { DateRange } from "./utils/date-range";
import { CustomRangeCalendar } from "./components/calendar";
import {
  ConnectionPanel,
  UserInfoPanel,
  AddTimeslotPanel,
  UpdateDeleteTimeslotPanel,
  EventLogPanel,
} from "./components/websocket-components";
import { RangeCalendarExample } from "./components/range-calendar-example";

export function App() {
  // State management
  const [webSocketService, setWebSocketService] =
    useState<WebSocketService | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:3000");
  const [userId, setUserId] = useState("1");
  const [projectId, setProjectId] = useState("1");
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(
    null
  );
  const [timeslotId, setTimeslotId] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("available");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#4CAF50");
  const [showDraggableEvents, setShowDraggableEvents] = useState(false);

  const eventLogRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocketService
  useEffect(() => {
    const service = new WebSocketService(
      (connected) => setConnected(connected),
      (eventLogFn) => setEventLog((prevLog) => eventLogFn(prevLog))
    );
    setWebSocketService(service);

    return () => {
      if (service) {
        service.disconnect();
      }
    };
  }, []);

  // Auto-scroll event log when new events are added
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [eventLog]);

  const handleConnect = () => {
    if (!webSocketService) return;
    if (!serverUrl) {
      alert("Please enter a server URL");
      return;
    }
    webSocketService.connect(serverUrl);
  };

  const handleDisconnect = () => {
    if (!webSocketService) return;
    webSocketService.disconnect();
  };

  const handleGetTimeslots = () => {
    if (!webSocketService) return;

    const userIdNum = parseInt(userId);
    const projectIdNum = parseInt(projectId);

    if (isNaN(userIdNum) || isNaN(projectIdNum)) {
      alert("Please enter valid User ID and Project ID");
      return;
    }

    webSocketService.getUserTimeslots(userIdNum, projectIdNum);
  };

  const handleAddTimeslot = () => {
    if (!webSocketService || !selectedDateRange) return;

    const userIdNum = parseInt(userId);
    const projectIdNum = parseInt(projectId);

    if (isNaN(userIdNum) || isNaN(projectIdNum)) {
      alert("Please enter valid User ID and Project ID");
      return;
    }

    webSocketService.addTimeslot(
      userIdNum,
      projectIdNum,
      selectedDateRange,
      notes,
      status,
      label,
      color
    );
  };

  const handleUpdateTimeslot = () => {
    if (!webSocketService || !selectedDateRange) return;

    const timeslotIdNum = parseInt(timeslotId);
    const projectIdNum = parseInt(projectId);
    const userIdNum = parseInt(userId);

    if (isNaN(timeslotIdNum) || isNaN(projectIdNum) || isNaN(userIdNum)) {
      alert("Please enter valid Timeslot ID, Project ID, and User ID");
      return;
    }

    webSocketService.updateTimeslot(
      timeslotIdNum,
      projectIdNum,
      userIdNum,
      selectedDateRange,
      notes,
      status
    );
  };

  const handleDeleteTimeslot = () => {
    if (!webSocketService) return;

    const timeslotIdNum = parseInt(timeslotId);
    const projectIdNum = parseInt(projectId);
    const userIdNum = parseInt(userId);

    if (isNaN(timeslotIdNum) || isNaN(projectIdNum) || isNaN(userIdNum)) {
      alert("Please enter valid Timeslot ID, Project ID, and User ID");
      return;
    }

    webSocketService.deleteTimeslot(timeslotIdNum, projectIdNum, userIdNum);
  };

  // Create a callback that will be passed to the EventLogPanel
  const setEventLogRef = (element: HTMLDivElement | null) => {
    eventLogRef.current = element;
  };

  return (
    <div className="app bg-background text-foreground p-4 max-w-10xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Timeslot WebSocket Client</h1>

      <div className="mb-4">
        <div className="mb-4 flex items-center gap-2">
          Connection Status:
          <span
            className={`px-2 py-0.5 rounded-md text-sm font-medium ${
              connected
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ConnectionPanel
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            connected={connected}
            handleConnect={handleConnect}
            handleDisconnect={handleDisconnect}
          />

          <UserInfoPanel
            userId={userId}
            setUserId={setUserId}
            projectId={projectId}
            setProjectId={setProjectId}
            connected={connected}
            handleGetTimeslots={handleGetTimeslots}
          />
        </div>

        <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Select Date Range</h2>
          </div>

          <RangeCalendarExample
            webSocketService={webSocketService}
            connected={connected}
            userId={userId}
            projectId={projectId}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <AddTimeslotPanel
            notes={notes}
            setNotes={setNotes}
            status={status}
            setStatus={setStatus}
            label={label}
            setLabel={setLabel}
            color={color}
            setColor={setColor}
            connected={connected}
            selectedDateRange={selectedDateRange}
            handleAddTimeslot={handleAddTimeslot}
          />

          <UpdateDeleteTimeslotPanel
            timeslotId={timeslotId}
            setTimeslotId={setTimeslotId}
            connected={connected}
            selectedDateRange={selectedDateRange}
            handleUpdateTimeslot={handleUpdateTimeslot}
            handleDeleteTimeslot={handleDeleteTimeslot}
          />
        </div>

        <EventLogPanel eventLog={eventLog} eventLogRef={setEventLogRef} />
      </div>
    </div>
  );
}

import { JSX, RefCallback } from 'preact';
import { Button } from './ui/button';

interface ConnectionPanelProps {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  connected: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
}

/**
 * Connection Panel Component
 */
export function ConnectionPanel({
  serverUrl,
  setServerUrl,
  connected,
  handleConnect,
  handleDisconnect,
}: ConnectionPanelProps): JSX.Element {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">Connection</h2>
      <div className="mb-4">
        <label htmlFor="server-url" className="block text-sm font-medium mb-1">Server URL:</label>
        <input
          type="text"
          id="server-url"
          value={serverUrl}
          onChange={(e) => setServerUrl((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="flex gap-2">
        <Button
          intent="primary"
          onClick={handleConnect}
          isDisabled={connected}
          className="w-full"
        >
          Connect
        </Button>
        <Button
          intent="outline"
          onClick={handleDisconnect}
          isDisabled={!connected}
          className="w-full"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

interface UserInfoPanelProps {
  userId: string;
  setUserId: (id: string) => void;
  projectId: string;
  setProjectId: (id: string) => void;
  connected: boolean;
  handleGetTimeslots: () => void;
}

/**
 * User Info Panel Component
 */
export function UserInfoPanel({
  userId,
  setUserId,
  projectId,
  setProjectId,
  connected,
  handleGetTimeslots,
}: UserInfoPanelProps): JSX.Element {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">User and Project Info</h2>
      <div className="mb-4">
        <label htmlFor="user-id" className="block text-sm font-medium mb-1">User ID:</label>
        <input
          type="number"
          id="user-id"
          value={userId}
          onChange={(e) => setUserId((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="project-id" className="block text-sm font-medium mb-1">Project ID:</label>
        <input
          type="number"
          id="project-id"
          value={projectId}
          onChange={(e) => setProjectId((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <Button
        intent="primary"
        onClick={handleGetTimeslots}
        isDisabled={!connected}
        className="w-full"
      >
        Get User Timeslots
      </Button>
    </div>
  );
}

interface AddTimeslotPanelProps {
  notes: string;
  setNotes: (notes: string) => void;
  status: string;
  setStatus: (status: string) => void;
  label: string;
  setLabel: (label: string) => void;
  color: string;
  setColor: (color: string) => void;
  connected: boolean;
  selectedDateRange: any;
  handleAddTimeslot: () => void;
}

/**
 * Add Timeslot Panel Component
 */
export function AddTimeslotPanel({
  notes,
  setNotes,
  status,
  setStatus,
  label,
  setLabel,
  color,
  setColor,
  connected,
  selectedDateRange,
  handleAddTimeslot,
}: AddTimeslotPanelProps): JSX.Element {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">Add Timeslot</h2>
      <div className="mb-4">
        <label htmlFor="add-notes" className="block text-sm font-medium mb-1">Notes:</label>
        <input
          type="text"
          id="add-notes"
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="add-status" className="block text-sm font-medium mb-1">Status:</label>
        <select
          id="add-status"
          value={status}
          onChange={(e) => setStatus((e.target as HTMLSelectElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="available">Available</option>
          <option value="busy">Busy</option>
        </select>
      </div>
      <div className="mb-4">
        <label htmlFor="add-label" className="block text-sm font-medium mb-1">Label:</label>
        <input
          type="text"
          id="add-label"
          placeholder="Optional label"
          value={label}
          onChange={(e) => setLabel((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="add-color" className="block text-sm font-medium mb-1">Color:</label>
        <div className="flex items-center">
          <input
            type="color"
            id="add-color"
            value={color}
            onChange={(e) => setColor((e.target as HTMLInputElement).value)}
            className="w-10 h-10 rounded-md mr-2 border border-border"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
      <Button
        intent="primary"
        onClick={handleAddTimeslot}
        isDisabled={!connected || !selectedDateRange}
        className="w-full"
      >
        Add Timeslot
      </Button>
    </div>
  );
}

interface UpdateDeleteTimeslotPanelProps {
  timeslotId: string;
  setTimeslotId: (id: string) => void;
  connected: boolean;
  selectedDateRange: any;
  handleUpdateTimeslot: () => void;
  handleDeleteTimeslot: () => void;
}

/**
 * Update/Delete Timeslot Panel Component
 */
export function UpdateDeleteTimeslotPanel({
  timeslotId,
  setTimeslotId,
  connected,
  selectedDateRange,
  handleUpdateTimeslot,
  handleDeleteTimeslot,
}: UpdateDeleteTimeslotPanelProps): JSX.Element {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">Update/Delete Timeslot</h2>
      <div className="mb-4">
        <label htmlFor="timeslot-id" className="block text-sm font-medium mb-1">Timeslot ID:</label>
        <input
          type="number"
          id="timeslot-id"
          placeholder="ID of timeslot to modify"
          value={timeslotId}
          onChange={(e) => setTimeslotId((e.target as HTMLInputElement).value)}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          intent="primary"
          onClick={handleUpdateTimeslot}
          isDisabled={!connected || !timeslotId || !selectedDateRange}
          className="w-full"
        >
          Update Timeslot
        </Button>
        <Button
          intent="danger"
          onClick={handleDeleteTimeslot}
          isDisabled={!connected || !timeslotId}
          className="w-full"
        >
          Delete Timeslot
        </Button>
      </div>
    </div>
  );
}

interface EventLogPanelProps {
  eventLog: string[];
  eventLogRef: RefCallback<HTMLDivElement>;
}

/**
 * Event Log Panel Component
 */
export function EventLogPanel({
  eventLog,
  eventLogRef,
}: EventLogPanelProps): JSX.Element {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">Event Log</h2>
      <div 
        ref={eventLogRef}
        className="bg-muted p-3 rounded-md h-64 overflow-y-auto font-mono text-sm"
      >
        {eventLog.length === 0 ? (
          <p className="text-muted-foreground">No events yet</p>
        ) : (
          eventLog.map((event, index) => (
            <div key={index} className="mb-1 break-all">
              {event}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 
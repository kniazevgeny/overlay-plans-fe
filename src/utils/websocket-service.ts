import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Service for Timeslot Client
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private setConnected: (isConnected: boolean) => void;
  private setEventLog: (updateFn: (prevLog: string[]) => string[]) => void;

  /**
   * Create a WebSocket service instance
   * @param setConnected - Function to update connection status
   * @param setEventLog - Function to update event log
   */
  constructor(
    setConnected: (isConnected: boolean) => void,
    setEventLog: (updateFn: (prevLog: string[]) => string[]) => void
  ) {
    this.socket = null;
    this.setConnected = setConnected;
    this.setEventLog = setEventLog;
  }

  /**
   * Connect to WebSocket server
   * @param serverUrl - Server URL to connect to
   * @returns Success status
   */
  connect(serverUrl: string): boolean {
    if (!serverUrl) {
      return false;
    }

    try {
      this.socket = io(serverUrl);

      this.socket.on('connect', () => {
        this.setConnected(true);
        this.setEventLog((prev) => this.logEvent(prev, 'Connected to server'));
      });

      this.socket.on('disconnect', () => {
        this.setConnected(false);
        this.setEventLog((prev) => this.logEvent(prev, 'Disconnected from server'));
      });

      this.socket.on('timeslots_updated', (data) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, 'Timeslots updated event received', data)
        );
      });

      this.socket.on('connect_error', (error) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, 'Connection error', { message: error.message })
        );
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.setEventLog((prev) =>
        this.logEvent(prev, 'Error connecting to server', {
          message: errorMessage,
        })
      );
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Get user timeslots
   * @param userId - User ID
   * @param projectId - Project ID
   */
  getUserTimeslots(userId: number, projectId: number): void {
    if (!this.socket) return;

    this.setEventLog((prev) =>
      this.logEvent(prev, 'Getting timeslots', { userId, projectId })
    );

    this.socket.emit(
      'get_user_timeslots',
      { userId, projectId },
      (response: any) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, 'Get timeslots response', response)
        );
      }
    );
  }

  /**
   * Add a timeslot
   */
  addTimeslot(
    userId: number,
    projectId: number,
    selectedDateRange: { start: Date; end: Date },
    notes: string,
    status: string,
    label: string,
    color: string
  ): void {
    if (!this.socket || !selectedDateRange) return;

    const startDateTime = selectedDateRange.start.toISOString();
    const endDateTime = selectedDateRange.end.toISOString();

    const timeslotData = {
      projectId,
      userId,
      timeslots: [
        {
          startTime: startDateTime,
          endTime: endDateTime,
          notes,
          status,
          label,
          color,
        },
      ],
    };

    this.setEventLog((prev) => this.logEvent(prev, 'Adding timeslot', timeslotData));

    this.socket.emit('project_add_timeslots', timeslotData, (response: any) => {
      this.setEventLog((prev) =>
        this.logEvent(prev, 'Add timeslot response', response)
      );
    });
  }

  /**
   * Update a timeslot
   */
  updateTimeslot(
    timeslotId: number,
    projectId: number,
    userId: number,
    selectedDateRange: { start: Date; end: Date },
    notes: string,
    status: string
  ): void {
    if (!this.socket || !selectedDateRange) return;

    const startDateTime = selectedDateRange.start.toISOString();
    const endDateTime = selectedDateRange.end.toISOString();

    const updateData = {
      projectId,
      requestUserId: userId,
      timeslots: [
        {
          id: timeslotId,
          startTime: startDateTime,
          endTime: endDateTime,
          notes: notes || undefined,
          status,
        },
      ],
    };

    this.setEventLog((prev) => this.logEvent(prev, 'Updating timeslot', updateData));

    this.socket.emit('project_update_timeslots', updateData, (response: any) => {
      this.setEventLog((prev) =>
        this.logEvent(prev, 'Update timeslot response', response)
      );
    });
  }

  /**
   * Delete a timeslot
   */
  deleteTimeslot(
    timeslotId: number,
    projectId: number,
    userId: number
  ): void {
    if (!this.socket) return;

    const deleteData = {
      projectId,
      timeslotIds: [timeslotId],
      requestUserId: userId,
    };

    this.setEventLog((prev) => this.logEvent(prev, 'Deleting timeslot', deleteData));

    this.socket.emit('project_delete_timeslots', deleteData, (response: any) => {
      this.setEventLog((prev) =>
        this.logEvent(prev, 'Delete timeslot response', response)
      );
    });
  }

  /**
   * Log event to the event log
   */
  private logEvent(
    eventLog: string[],
    message: string,
    data: any = null
  ): string[] {
    const timestamp = new Date().toLocaleTimeString();
    let logMessage = `[${timestamp}] ${message}`;

    if (data) {
      logMessage += '\n' + JSON.stringify(data, null, 2);
    }

    return [...eventLog, logMessage];
  }
} 
import { io, Socket } from "socket.io-client";

/**
 * WebSocket Service for Timeslot Client
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private setConnected: (isConnected: boolean) => void;
  private setEventLog: (updateFn: (prevLog: string[]) => string[]) => void;
  private timeslotUpdateListeners: ((data: any) => void)[] = [];

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

      this.socket.on("connect", () => {
        this.setConnected(true);
        this.setEventLog((prev) => this.logEvent(prev, "Connected to server"));
      });

      this.socket.on("disconnect", () => {
        this.setConnected(false);
        this.setEventLog((prev) =>
          this.logEvent(prev, "Disconnected from server")
        );
      });

      // This handler logs the event, but doesn't process the timeslots
      // The actual processing happens via the callbacks registered with subscribeToTimeslotUpdates
      // Our directUpdate method manually calls these callbacks since emit() only sends to server
      this.socket.on("timeslots_updated", (data) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, "Timeslots updated event received", data)
        );
      });

      this.socket.on("connect_error", (error) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, "Connection error", { message: error.message })
        );
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.setEventLog((prev) =>
        this.logEvent(prev, "Error connecting to server", {
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
      this.logEvent(prev, "Getting timeslots", { userId, projectId })
    );

    this.socket.emit(
      "get_user_timeslots",
      { userId, projectId },
      (response: any) => {
        // Log a summary instead of the full response
        const responseSize = response
          ? (JSON.stringify(response).length / 1024).toFixed(2) + " KB"
          : "empty";

        this.setEventLog((prev) =>
          this.logEvent(prev, `Get timeslots response (${responseSize})`, {
            success: response?.success || false,
          })
        );

        // Handle different response formats
        if (response) {
          let timeslotsData: { timeslots: any[] } = { timeslots: [] };
          let found = false;
          let source = "";

          // Case 1: Timeslots directly in the response root
          if (response.success && Array.isArray(response.timeslots)) {
            timeslotsData = {
              timeslots: response.timeslots,
            };
            found = true;
            source = "root level";
          }
          // Case 2: Timeslots in the data.timeslots property
          else if (
            response.success &&
            response.data &&
            Array.isArray(response.data.timeslots)
          ) {
            timeslotsData = {
              timeslots: response.data.timeslots,
            };
            found = true;
            source = "data.timeslots";
          }
          // Case 3: Timeslots in the data array
          else if (response.success && Array.isArray(response.data)) {
            timeslotsData = {
              timeslots: response.data,
            };
            found = true;
            source = "data array";
          }
          // Case 4: No success flag, but has timeslots array
          else if (Array.isArray(response.timeslots)) {
            timeslotsData = {
              timeslots: response.timeslots,
            };
            found = true;
            source = "timeslots array without success flag";
          }
          // Case 5: Response is the array itself
          else if (Array.isArray(response)) {
            timeslotsData = {
              timeslots: response,
            };
            found = true;
            source = "array of timeslots";
          }

          // Log a summary after parsing
          if (found) {
            this.setEventLog((prev) =>
              this.logEvent(
                prev,
                `Found ${timeslotsData.timeslots.length} timeslots in ${source}`
              )
            );
          }

          // Use our directUpdate method to process the data
          if (timeslotsData.timeslots.length > 0) {
            this.directUpdate(timeslotsData);
          } else {
            // If no valid data, log an error and update with empty timeslots
            this.setEventLog((prev) =>
              this.logEvent(prev, "No timeslots found in response")
            );
            this.directUpdate({ timeslots: [] });
          }
        } else {
          // If no valid response, log an error and update with empty timeslots
          this.setEventLog((prev) =>
            this.logEvent(prev, "Invalid or empty response")
          );
          this.directUpdate({ timeslots: [] });
        }
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

    this.setEventLog((prev) =>
      this.logEvent(prev, "Adding timeslot", timeslotData)
    );

    this.socket.emit("project_add_timeslots", timeslotData, (response: any) => {
      this.setEventLog((prev) =>
        this.logEvent(prev, "Add timeslot response", response)
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

    this.setEventLog((prev) =>
      this.logEvent(prev, "Updating timeslot", updateData)
    );

    this.socket.emit(
      "project_update_timeslots",
      updateData,
      (response: any) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, "Update timeslot response", response)
        );
      }
    );
  }

  /**
   * Delete a timeslot
   */
  deleteTimeslot(timeslotId: number, projectId: number, userId: number): void {
    if (!this.socket) return;

    const deleteData = {
      projectId,
      timeslotIds: [timeslotId],
      requestUserId: userId,
    };

    this.setEventLog((prev) =>
      this.logEvent(prev, "Deleting timeslot", deleteData)
    );

    this.socket.emit(
      "project_delete_timeslots",
      deleteData,
      (response: any) => {
        this.setEventLog((prev) =>
          this.logEvent(prev, "Delete timeslot response", response)
        );
      }
    );
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
      logMessage += "\n" + JSON.stringify(data, null, 2);
    }

    return [...eventLog, logMessage];
  }

  /**
   * Subscribe to timeslot updates
   * @param callback - Function to call when timeslots are updated
   * @returns Cleanup function
   */
  subscribeToTimeslotUpdates(callback: (data: any) => void): () => void {
    if (!this.socket) return () => {};

    // Store the callback
    const wrappedCallback = (data: any) => {
      this.setEventLog((prev) =>
        this.logEvent(prev, "Timeslots update received in subscriber", data)
      );
      callback(data);
    };

    // Add to socket.io listeners
    this.socket.on("timeslots_updated", wrappedCallback);

    // Also store in our local array for direct updates
    this.timeslotUpdateListeners.push(wrappedCallback);

    return () => {
      this.socket?.off("timeslots_updated", wrappedCallback);
      // Also remove from our local array
      this.timeslotUpdateListeners = this.timeslotUpdateListeners.filter(
        (listener) => listener !== wrappedCallback
      );
    };
  }

  /**
   * Directly update calendar with timeslot data
   * Helper method for direct updates without socket events
   * @param timeslotData - Timeslot data to process
   */
  directUpdate(timeslotData: any): void {
    const count = timeslotData.timeslots?.length || 0;
    console.log(`Direct update with ${count} timeslots`);

    if (!this.socket) return;

    // Log that we're manually updating
    this.setEventLog((prev) =>
      this.logEvent(prev, `Direct update with ${count} timeslots`)
    );

    // FIXED: Instead of trying to trigger Socket.io's internal event system,
    // manually call all our registered listeners directly
    if (this.timeslotUpdateListeners.length > 0) {
      this.setEventLog((prev) =>
        this.logEvent(
          prev,
          `Notifying ${this.timeslotUpdateListeners.length} timeslot update listeners`
        )
      );

      // Call each registered listener with the timeslot data
      this.timeslotUpdateListeners.forEach((listener) => {
        try {
          listener(timeslotData);
        } catch (error) {
          console.error("Error in timeslot update listener:", error);
        }
      });
    } else {
      this.setEventLog((prev) =>
        this.logEvent(prev, "No timeslot update listeners registered")
      );
      console.warn("No timeslot update listeners registered");
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.socket?.connected || false;
  }
}

import { getLocalTimeZone, today } from "@internationalized/date";
import type {
  DateValue,
  RangeCalendarProps as RangeCalendarPrimitiveProps,
} from "react-aria-components";
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  RangeCalendar as RangeCalendarPrimitive,
  Text,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { CalendarGridHeader, CalendarHeader } from "./calendar";
import { ComponentChildren } from "preact";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "preact/hooks";
import { JSX } from "preact";
import { Avatar } from "./avatar";
import { Popover } from "./popover";
import React from "preact/compat";

// Represents a calendar event with start and end dates
interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  // User-related fields for avatar display
  userId?: string | number;
  userPhotoUrl?: string;
  userFirstName?: string;
  userLastName?: string;
  // Status of the event (e.g., "busy", "active")
  status?: string;
  // Internal field for drag state tracking
  _dragData?: {
    startDate: Date;
    currentDate: Date;
    isDragging: boolean;
  };
}

interface RangeCalendarProps<T extends DateValue>
  extends RangeCalendarPrimitiveProps<T> {
  errorMessage?: string;
  events?: CalendarEvent[];
  onEventDragEnd?: (
    event: CalendarEvent,
    newStartDate: Date,
    newEndDate: Date
  ) => void;
  renderCellContent?: (props: {
    date: DateValue;
    formattedDate: string;
    isSelected: boolean;
    isSelectionStart: boolean;
    isSelectionEnd: boolean;
    isDisabled: boolean;
    isInRange: boolean;
  }) => ComponentChildren;
}

// Helper function to convert DateValue to JavaScript Date
const toJSDate = (date: DateValue): Date => {
  return date.toDate(getLocalTimeZone());
};

// Helper function to check if a date (year, month, day) matches a JS Date
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Helper to check if an event falls on a specific date
const isEventOnDate = (event: CalendarEvent, date: Date): boolean => {
  const eventStart = new Date(event.startDate);
  eventStart.setHours(0, 0, 0, 0);

  const eventEnd = new Date(event.endDate);
  eventEnd.setHours(23, 59, 59, 999);

  const checkDate = new Date(date);
  checkDate.setHours(12, 0, 0, 0);

  return checkDate >= eventStart && checkDate <= eventEnd;
};

// Helper to check if a date is the start date of an event
const isEventStartDate = (event: CalendarEvent, date: Date): boolean => {
  return isSameDay(event.startDate, date);
};

// Helper to check if a date is the end date of an event
const isEventEndDate = (event: CalendarEvent, date: Date): boolean => {
  return isSameDay(event.endDate, date);
};

// Helper to create initials from a name
const getInitials = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return "";

  // Get the first character of each name and capitalize it
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";

  return firstInitial + lastInitial;
};

// Helper to find busy events for a given date
const getBusyEventsForDate = (
  date: Date,
  allEvents: CalendarEvent[]
): CalendarEvent[] => {
  return allEvents
    .filter((event) => event.status === "busy")
    .filter((event) => isEventOnDate(event, date));
};

const RangeCalendar = <T extends DateValue>({
  errorMessage,
  className,
  visibleDuration = { months: 2 },
  renderCellContent,
  events = [],
  onEventDragEnd,
  ...props
}: RangeCalendarProps<T>) => {
  const now = today(getLocalTimeZone());

  // State for tracking dragged events
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragCurrentDate, setDragCurrentDate] = useState<Date | null>(null);
  // Add original event ref to preserve it during drag operations
  const draggedEventRef = useRef<CalendarEvent | null>(null);

  // State for controlling popover visibility
  const [activePopover, setActivePopover] = useState<string | null>(null);
  // Additional state to store information about the active popover
  const [activePopoverData, setActivePopoverData] = useState<{
    busyEvents: CalendarEvent[];
    dateKey: string;
  } | null>(null);
  // Map of refs for popover triggers
  const triggerRefs = useRef<Map<string, { current: HTMLElement | null }>>(
    new Map()
  );

  const cellRefs = useRef<HTMLTableCellElement[]>([]);

  // Helper to extract date from DOM element with performance optimization
  const extractDateFromEvent = useCallback((e: DragEvent): Date | null => {
    // Performance optimization: Use cached element when possible
    if (e.target) {
      const target = e.target as HTMLElement;
      // Direct attribute check first (fastest path)
      const dateAttr = target.getAttribute("data-date");
      if (dateAttr) {
        try {
          return new Date(dateAttr);
        } catch (err) {
          // Silent fail and continue to fallbacks
        }
      }
    }

    // Only use elementFromPoint as a fallback (expensive operation)
    const x = e.clientX;
    const y = e.clientY;
    const elementFromPoint = document.elementFromPoint(x, y);
    if (elementFromPoint) {
      const cellWithDate = elementFromPoint.closest("[data-date]");
      if (cellWithDate) {
        const pointDateAttr = cellWithDate.getAttribute("data-date");
        if (pointDateAttr) {
          try {
            return new Date(pointDateAttr);
          } catch (err) {
            debugLog("Error parsing date from point:", pointDateAttr, err);
          }
        }
      }
    }

    return null;
  }, []);

  // Throttle drag updates to improve performance
  const throttledSetDragCurrentDate = useCallback(
    (() => {
      let lastDate: Date | null = null;
      let lastUpdateTime = 0;
      const throttleMs = 50; // Only update every 50ms max

      return (date: Date) => {
        const now = Date.now();

        // Skip if we updated too recently
        if (now - lastUpdateTime < throttleMs) {
          return;
        }

        // Skip if the date hasn't changed
        if (lastDate && isSameDay(lastDate, date)) {
          return;
        }

        // Update state and cache
        lastDate = date;
        lastUpdateTime = now;
        setDragCurrentDate(date);
      };
    })(),
    [setDragCurrentDate]
  );

  // Calculate adjusted events based on current drag state
  const adjustedEvents = useMemo(() => {
    // If we're dragging an event, adjust its dates to show it in the new position immediately
    if (draggedEventId && dragCurrentDate && dragStartDate) {
      const daysDiff = Math.round(
        (dragCurrentDate.getTime() - dragStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysDiff !== 0) {
        return events.map((event) => {
          if (event.id === draggedEventId) {
            // Store the original event in ref for drag end
            if (!draggedEventRef.current) {
              draggedEventRef.current = { ...event };
            }

            // Create a temporary adjusted event for display purposes
            const newStartDate = new Date(event.startDate);
            newStartDate.setDate(newStartDate.getDate() + daysDiff);

            const newEndDate = new Date(event.endDate);
            newEndDate.setDate(newEndDate.getDate() + daysDiff);

            return {
              ...event,
              startDate: newStartDate,
              endDate: newEndDate,
            };
          }
          return event;
        });
      }
    }

    // Default case: no drag or no change needed
    return events;
  }, [events, draggedEventId, dragCurrentDate, dragStartDate]);

  // Reset all drag-related state
  const resetDragState = useCallback(() => {
    setDraggedEventId(null);
    setDragStartDate(null);
    setDragCurrentDate(null);
    draggedEventRef.current = null;
  }, []);

  // Forward declaration for circular dependency
  let handleDocDragOver: (ev: DragEvent) => void;
  let handleDocDragEnd: (ev: DragEvent) => void;

  // *** COMPLETE OVERHAUL: Using more direct approach to drag state management ***

  // Handle drag start on an event
  const handleDragStart = (
    event: CalendarEvent,
    date: Date,
    e: JSX.TargetedDragEvent<HTMLDivElement>
  ) => {
    // Prevent the event from propagating to parent elements
    e.stopPropagation();

    // Don't prevent default here - that would prevent the drag from starting
    // e.preventDefault();

    debugLog(`Starting drag for event: ${event.id} (${event.title})`);

    // Immediately store all drag-related data in the ref
    // This avoids state timing issues during drag operations
    draggedEventRef.current = {
      ...event,
      _dragData: {
        startDate: date,
        currentDate: date,
        isDragging: true,
      },
    };

    // Set drag data and effect right away (this is safe)
    if (e.dataTransfer) {
      // Create a transparent drag image (1x1 pixel)
      const img = new Image();
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);

      // Set allowed effects and data
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", event.id);
      debugLog("drag start", event.id, "at date", date.toISOString());
    }

    // CRITICAL: Use setTimeout to delay DOM manipulations and state updates
    // This avoids the Chrome bug where dragEnd fires immediately when DOM is manipulated in dragStart
    setTimeout(() => {
      // Set React state for UI updates only after the timeout
      setDraggedEventId(event.id);
      setDragStartDate(date);
      setDragCurrentDate(date);

      // First, ensure we remove old listeners
      try {
        document.removeEventListener("dragover", handleDocDragOver, {
          capture: true,
        });
        document.removeEventListener("dragend", handleDocDragEnd, {
          capture: true,
        });
        document.removeEventListener("drop", handleDocDragEnd, {
          capture: true,
        });
      } catch (e) {
        debugLog("Could not remove listeners:", e);
      }

      // Then add new listeners with capture: true to ensure they fire
      document.addEventListener("dragover", handleDocDragOver, {
        capture: true,
      });
      document.addEventListener("dragend", handleDocDragEnd, { capture: true });
      document.addEventListener("drop", handleDocDragEnd, { capture: true });

      debugLog("Added document-level drag handlers (after timeout)");
    }, 0);
  };

  // Optimized document drag handler
  handleDocDragOver = useCallback(
    (ev: DragEvent) => {
      // First check if we're dragging anything - early return for performance
      if (!draggedEventRef.current) return;

      // Always prevent default to allow dropping
      ev.preventDefault();
      ev.stopPropagation();

      // Set the drop effect
      if (ev.dataTransfer) {
        ev.dataTransfer.dropEffect = "move";
      }

      // Extract date from event (optimized)
      const dragDate = extractDateFromEvent(ev);
      if (dragDate) {
        // Update the drag data in the ref (fast)
        if (draggedEventRef.current?._dragData) {
          draggedEventRef.current._dragData.currentDate = dragDate;
        }

        // Throttled state update to prevent excessive renders
        throttledSetDragCurrentDate(dragDate);
      }
    },
    [extractDateFromEvent, throttledSetDragCurrentDate]
  );

  handleDocDragEnd = useCallback(
    (ev: DragEvent) => {
      // Prevent default event behavior
      ev.preventDefault();
      ev.stopPropagation();

      debugLog("Document drag end triggered");

      // Immediately capture all drag data from the ref (most reliable source)
      const draggedEvent = draggedEventRef.current;
      const dragData = draggedEvent?._dragData;

      // Clean up listeners immediately
      try {
        document.removeEventListener("dragover", handleDocDragOver, {
          capture: true,
        });
        document.removeEventListener("dragend", handleDocDragEnd, {
          capture: true,
        });
        document.removeEventListener("drop", handleDocDragEnd, {
          capture: true,
        });
      } catch (e) {
        debugLog("Could not remove listeners:", e);
      }

      if (!draggedEvent || !dragData) {
        debugLog("Drag end: No valid drag data found");
        resetDragState();
        return;
      }

      debugLog("Processing drag end with data:", {
        eventId: draggedEvent.id,
        startDate: dragData.startDate.toISOString(),
        currentDate: dragData.currentDate.toISOString(),
      });

      // Calculate the day difference using the ref data (most reliable)
      const startDate = dragData.startDate;
      const currentDate = dragData.currentDate;

      // If we don't have both dates, we can't calculate
      if (!startDate || !currentDate) {
        debugLog("Missing dates for drag calculation");
        resetDragState();
        return;
      }

      // Calculate the offset in days between the drag start and current position
      const daysDiff = Math.round(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      debugLog(`Calculated day difference: ${daysDiff}`);

      if (daysDiff !== 0 && onEventDragEnd) {
        // Calculate new dates for the event
        const newStartDate = new Date(draggedEvent.startDate);
        newStartDate.setDate(newStartDate.getDate() + daysDiff);

        const newEndDate = new Date(draggedEvent.endDate);
        newEndDate.setDate(newEndDate.getDate() + daysDiff);

        debugLog("Drag completed: moving event by", daysDiff, "days");
        debugLog(
          `From ${draggedEvent.startDate.toDateString()} to ${newStartDate.toDateString()}`
        );

        // Reset drag state immediately to avoid any race conditions
        const eventToUpdate = { ...draggedEvent };
        delete eventToUpdate._dragData; // Remove internal tracking data

        resetDragState();

        // Call the callback with the updated event dates
        onEventDragEnd(eventToUpdate, newStartDate, newEndDate);
      } else {
        debugLog("Drag ended with no day difference, not moving event");
        resetDragState();
      }
    },
    [handleDocDragOver, onEventDragEnd, resetDragState]
  );

  // Handle direct onDragEnd on the event div
  const handleDragEnd = useCallback(
    (e?: JSX.TargetedDragEvent<HTMLDivElement>) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      debugLog("Direct event drag end handler called");

      // Call the document handler directly to ensure consistent processing
      // We create a synthetic event just to pass to the handler
      const syntheticEvent = new DragEvent("dragend");
      handleDocDragEnd(syntheticEvent);
    },
    [handleDocDragEnd]
  );

  // Render event indicators for a specific date
  const renderEvents = (date: Date) => {
    // Filter out busy events and use the memoized adjusted events
    const eventsOnDate = adjustedEvents
      .filter((event) => event.status !== "busy") // Filter out busy events
      .filter((event) => isEventOnDate(event, date));

    if (eventsOnDate.length === 0) return null;

    // Create a map of event IDs to their position index to ensure consistent positioning
    // This will determine the grid row for each event
    const eventPositionMap = useMemo(() => {
      // Create a list of all unique events, excluding busy events
      const uniqueEvents = [
        ...new Map(
          events
            .filter((event) => event.status !== "busy") // Filter out busy events
            .map((event) => [event.id, event])
        ).values(),
      ];

      // Sort by duration (longer events first)
      const sortedEvents = uniqueEvents.sort((a, b) => {
        const durationA =
          Math.round(
            (a.endDate.getTime() - a.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        const durationB =
          Math.round(
            (b.endDate.getTime() - b.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        return durationB - durationA;
      });

      // Map each event ID to its position index
      return new Map(sortedEvents.map((event, index) => [event.id, index + 1])); // Grid rows start at 1
    }, [events]);

    // Identify if we're dealing with a drag operation into this date
    const isDraggedDate =
      draggedEventId && dragCurrentDate && isSameDay(dragCurrentDate, date);

    // If this is the date being dragged to, check if it would be empty without the dragged event
    // We need to separate the dragged event from other events to determine if the target is "empty"
    const draggedEvent = draggedEventId
      ? eventsOnDate.find((e) => e.id === draggedEventId)
      : null;
    const otherEvents = draggedEventId
      ? eventsOnDate.filter((e) => e.id !== draggedEventId)
      : eventsOnDate;

    // Calculate if the target range is "effectively empty" - meaning it has no events other than the one being dragged
    const isTargetRangeEmpty =
      isDraggedDate && otherEvents.length === 0 && draggedEvent !== null;

    // Get the maximum number of event rows we might need
    const maxRow = Math.max(...Array.from(eventPositionMap.values())) || 1;

    return (
      <div
        className="absolute top-0 left-0 right-0 grid gap-[2px] w-full overflow-visible"
        style={{
          gridTemplateRows: `repeat(${maxRow}, minmax(6px, auto))`,
          paddingTop: "2px",
          zIndex: isDraggedDate
            ? 100
            : eventsOnDate.some((e) => isEventStartDate(e, date))
            ? 40
            : 20,
        }}
      >
        {eventsOnDate.map((event) => {
          const isStart = isEventStartDate(event, date);
          const isEnd = isEventEndDate(event, date);
          const isDragged = draggedEventId === event.id;

          // Days duration of the event
          const eventDuration =
            Math.round(
              (event.endDate.getTime() - event.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;

          // Determine the height of the event indicator
          const heightPx = eventDuration <= 3 ? 20 : 20;

          // Get the grid row position for this event
          const gridRow = eventPositionMap.get(event.id) || 1;

          // Special handling for dragged events:
          // 1. If this is the dragged event being moved to an empty range, it goes to row 1
          // 2. Otherwise, it maintains its consistent position
          const shouldMoveUp = isDragged && isTargetRangeEmpty;
          const actualGridRow = shouldMoveUp ? 1 : gridRow;

          return (
            <div
              key={event.id}
              draggable={true}
              onDragStart={(e: JSX.TargetedDragEvent<HTMLDivElement>) =>
                handleDragStart(event, date, e)
              }
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                // Ensure drag over works even on the event itself
                e.preventDefault();
                e.stopPropagation();
                if (draggedEventId) {
                  const date = extractDateFromEvent(e);
                  if (date) setDragCurrentDate(date);
                }
              }}
              className={twMerge(
                "cursor-move flex items-center overflow-visible relative",
                isStart ? "rounded-l-full ml-0.5" : "",
                isEnd ? "rounded-r-full mr-0.5" : "",
                isStart && isEnd ? "rounded-full mx-0.5" : "",
                "transition-all duration-100",
                isDragged ? "opacity-90 shadow-lg" : "hover:opacity-90"
              )}
              style={{
                backgroundColor: event.color || "var(--color-primary)",
                zIndex: isDragged ? 2 : 1,
                height: `${heightPx}px`,
                gridRow: actualGridRow,
              }}
              title={`${
                event.title
              } (${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()})`}
            >
              {isStart && (
                <span className="text-white text-xs font-semibold whitespace-nowrap pl-2 pr-1 drop-shadow-sm flex items-center gap-1 pointer-events-none">
                  {/* Avatar component */}
                  {(event.userPhotoUrl ||
                    event.userFirstName ||
                    event.userLastName) && (
                    <Avatar
                      src={event.userPhotoUrl}
                      initials={getInitials(
                        event.userFirstName,
                        event.userLastName
                      )}
                      size="extra-small"
                      className="flex-shrink-0"
                    />
                  )}
                  <span className="truncate max-w-[100px]">{event.title}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Optimized cell event handler
  const handleCellDragEvent = useCallback(
    (e: DragEvent) => {
      // Make sure we've started dragging something
      if (!draggedEventRef.current) {
        return;
      }

      // Always prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();

      // Force move effect
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      // Extract the date and update if found
      const date = extractDateFromEvent(e);
      if (date) {
        // Update the drag data in the ref first (fast operation)
        if (draggedEventRef.current?._dragData) {
          draggedEventRef.current._dragData.currentDate = date;
        }

        // Use throttled state update to prevent excessive renders
        throttledSetDragCurrentDate(date);
      }
    },
    [extractDateFromEvent, throttledSetDragCurrentDate]
  );

  // Optimized cell refs management
  useEffect(() => {
    if (cellRefs.current.length === 0) return;

    // Pre-calculate event handlers to avoid closures in the loop
    const dragoverHandler = (e: DragEvent) => handleCellDragEvent(e);
    const dragenterHandler = (e: DragEvent) => handleCellDragEvent(e);

    // Use a Set for faster lookups when checking if a cell already has listeners
    const processedCells = new Set<HTMLTableCellElement>();

    // Add cell-level event listeners for cells that don't already have them
    cellRefs.current.forEach((cell) => {
      if (cell && !processedCells.has(cell)) {
        // Mark this cell as processed
        processedCells.add(cell);

        // Add the drag listeners in capture phase
        cell.addEventListener("dragover", dragoverHandler, { capture: true });
        cell.addEventListener("dragenter", dragenterHandler, { capture: true });
      }
    });

    // Clean up cell listeners when component unmounts or dependencies change
    return () => {
      processedCells.forEach((cell) => {
        cell.removeEventListener("dragover", dragoverHandler, {
          capture: true,
        });
        cell.removeEventListener("dragenter", dragenterHandler, {
          capture: true,
        });
      });
    };
  }, [handleCellDragEvent]);

  // Clean up refs when component unmounts
  useEffect(() => {
    return () => {
      cellRefs.current = [];
      draggedEventRef.current = null;
    };
  }, []);

  // Define the memoized component properly
  const EventIndicatorsComponent = React.memo(
    ({
      date,
      events,
      dragInfo,
    }: {
      date: Date;
      events: CalendarEvent[];
      dragInfo?: { currentDate: Date; startDate: Date; isDragging: boolean };
    }) => {
      // Use the existing renderEvents function
      return renderEvents(date);
    },
    (prevProps, nextProps) => {
      // Custom comparison function to determine if we need to re-render
      // Only re-render if the drag state changes for this date or events change
      const sameDate = isSameDay(prevProps.date, nextProps.date);
      const sameEvents = prevProps.events === nextProps.events;

      // Drag info comparison
      let sameDragInfo = false;
      if (!prevProps.dragInfo && !nextProps.dragInfo) {
        sameDragInfo = true;
      } else if (prevProps.dragInfo && nextProps.dragInfo) {
        sameDragInfo = isSameDay(
          prevProps.dragInfo.currentDate,
          nextProps.dragInfo.currentDate
        );
      } else {
        sameDragInfo = false; // One has drag info, the other doesn't
      }

      return sameDate && sameEvents && sameDragInfo;
    }
  );

  // Replace process.env with a direct check for production mode
  const isProduction =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    !window.location.hostname.startsWith("192.168.");

  const debugLog = (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(message, ...args);
    }
  };

  // Function to get a unique key for a date
  const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  // Function to handle opening a specific popover
  const openPopover = (dateKey: string, busyEvents: CalendarEvent[]) => {
    if (busyEvents.length === 0) return;
    debugLog("Opening popover for date:", dateKey, "with events:", busyEvents);

    setActivePopover(dateKey);
    setActivePopoverData({
      busyEvents,
      dateKey,
    });
  };

  // Function to get or create a ref for a specific date
  const getTriggerRef = (dateKey: string) => {
    if (!triggerRefs.current.has(dateKey)) {
      triggerRefs.current.set(dateKey, { current: null });
    }
    return triggerRefs.current.get(dateKey)!;
  };

  // Handle drop on a date cell
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      debugLog("Drop event detected");

      if (!draggedEventRef.current) {
        debugLog("No dragged event found on drop");
        return;
      }

      const dragData = draggedEventRef.current._dragData;
      if (!dragData) {
        debugLog("No drag data found on drop");
        return;
      }

      // Get the target date (either from drag state or extract from drop event)
      const targetDate = dragData.currentDate || extractDateFromEvent(e);
      if (!targetDate) {
        debugLog("No target date found on drop");
        return;
      }

      debugLog(
        `Dropping event from ${dragData.startDate.toDateString()} to ${targetDate.toDateString()}`
      );

      // Calculate the difference in days
      const diffDays = Math.round(
        (targetDate.getTime() - dragData.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // If there's no change, don't do anything
      if (diffDays === 0) {
        debugLog("No date change detected, canceling drop");
        return;
      }

      // Get the original event from context
      if (!draggedEventId) {
        debugLog("No dragged event ID available");
        return;
      }

      // Find the event in the events list
      const eventToMove = events?.find((evt) => evt.id === draggedEventId);
      if (!eventToMove) {
        debugLog("Could not find the event to move");
        return;
      }

      // Update the event dates
      const newStart = new Date(eventToMove.startDate);
      newStart.setDate(newStart.getDate() + diffDays);

      // Create newEnd as a Date (not null)
      const newEnd = eventToMove.endDate
        ? new Date(eventToMove.endDate)
        : new Date(newStart); // Use the same date as start if no end date exists

      if (eventToMove.endDate) {
        newEnd.setDate(newEnd.getDate() + diffDays);
      }

      debugLog(
        `Moving event by ${diffDays} days: ${eventToMove.startDate.toDateString()} -> ${newStart.toDateString()}`
      );

      // Call the onEventMove callback if provided
      onEventDragEnd?.(eventToMove, newStart, newEnd);

      // Reset drag state
      setDraggedEventId(null);
      setDragCurrentDate(null);
      draggedEventRef.current = null;
    },
    [extractDateFromEvent, onEventDragEnd, draggedEventId, events]
  );

  // Set up document-level drop and dragend handlers
  useEffect(() => {
    // Handle drop anywhere in the document
    const handleDocDrop = (e: DragEvent) => {
      // Convert the native event to a React synthetic event and pass to our handler
      const syntheticEvent = {
        ...e,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as unknown as React.DragEvent<HTMLDivElement>;

      handleDrop(syntheticEvent);
    };

    // Handle drag end (occurs whether drop happened or not)
    const handleDragEnd = (e: DragEvent) => {
      debugLog("Drag ended");

      // Clean up drag state
      setDraggedEventId(null);
      setDragCurrentDate(null);
      draggedEventRef.current = null;
    };

    // Add document-level drop and dragend listeners with capture
    document.addEventListener("drop", handleDocDrop, { capture: true });
    document.addEventListener("dragend", handleDragEnd, { capture: true });

    // Clean up
    return () => {
      document.removeEventListener("drop", handleDocDrop, { capture: true });
      document.removeEventListener("dragend", handleDragEnd, { capture: true });
    };
  }, [handleDrop]);

  // Add drop listeners to cells
  useEffect(() => {
    if (cellRefs.current.length === 0) return;

    debugLog(`Setting up drop listeners for ${cellRefs.current.length} cells`);

    // Handle cell-level drop events
    const handleCellDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Convert to synthetic event and call our handler
      const syntheticEvent = {
        ...e,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      } as unknown as React.DragEvent<HTMLDivElement>;

      // Pass to our main drop handler
      handleDrop(syntheticEvent);
    };

    // Add drop listeners to all cells
    cellRefs.current.forEach((cell) => {
      if (cell) {
        cell.addEventListener("drop", handleCellDrop, { capture: true });
      }
    });

    // Clean up
    return () => {
      cellRefs.current.forEach((cell) => {
        if (cell) {
          cell.removeEventListener("drop", handleCellDrop, { capture: true });
        }
      });
    };
  }, [handleDrop]);

  // Add a throttled drag handler for improved performance
  // This will significantly reduce the number of operations during drag
  useEffect(() => {
    // Only set up throttled handlers if we're currently dragging
    if (draggedEventId) {
      let lastUpdateTime = 0;
      const throttleInterval = 40; // 40ms throttle = max ~25 updates per second

      const throttledMoveHandler = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastUpdateTime < throttleInterval) {
          // Skip this update if it's too soon
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        lastUpdateTime = now;

        // Extract the date from the element at the current position
        const x = e.clientX;
        const y = e.clientY;
        const elementAtPoint = document.elementFromPoint(x, y);

        if (elementAtPoint) {
          const cellWithDate = elementAtPoint.closest("[data-date]");
          if (cellWithDate) {
            const dateAttr = cellWithDate.getAttribute("data-date");
            if (dateAttr) {
              try {
                const date = new Date(dateAttr);

                // Only update if the date has changed
                if (dragCurrentDate && !isSameDay(dragCurrentDate, date)) {
                  // Update the drag ref first (fast)
                  if (draggedEventRef.current?._dragData) {
                    draggedEventRef.current._dragData.currentDate = date;
                  }

                  // Then update state (triggers render)
                  setDragCurrentDate(date);
                }
              } catch (err) {
                // Ignore date parsing errors
              }
            }
          }
        }
      };

      // Add the throttled mousemove listener at document level
      document.addEventListener("mousemove", throttledMoveHandler, {
        passive: false,
      });

      return () => {
        // Clean up the handler when done dragging
        document.removeEventListener("mousemove", throttledMoveHandler);
      };
    }
  }, [draggedEventId, dragCurrentDate]);

  return (
    <>
      <RangeCalendarPrimitive visibleDuration={visibleDuration} {...props}>
        <CalendarHeader isRange />
        <div className="flex snap-x items-start justify-stretch gap-6 overflow-auto sm:gap-10 pb-12">
          {Array.from({ length: visibleDuration?.months ?? 1 }).map(
            (_, index) => {
              const id = index + 1;
              return (
                <CalendarGrid
                  key={index}
                  offset={id >= 2 ? { months: id - 1 } : undefined}
                  className="[&_td]:border-collapse [&_td]:px-0 [&_td]:py-0.5"
                >
                  <CalendarGridHeader />
                  <CalendarGridBody className="snap-start">
                    {(date: DateValue) => (
                      <CalendarCell
                        date={date}
                        className={twMerge([
                          "shrink-0 [--cell-fg:var(--color-primary)] [--cell:color-mix(in_oklab,var(--color-primary)_15%,white_85%)]",
                          "dark:[--cell-fg:color-mix(in_oklab,var(--color-primary)_80%,white_20%)] dark:[--cell:color-mix(in_oklab,var(--color-primary)_30%,black_45%)]",
                          "group relative size-22 cursor-default outline-hidden [line-height:2.286rem] sm:size-20 sm:text-sm",
                          "[td:first-child_&]:rounded-s-lg [td:last-child_&]:rounded-e-lg",
                          // Style for unavailable dates
                          "[&[data-unavailable]]:text-[var(--danger)] [&[data-unavailable]]:line-through",
                          date.compare(now) === 0 &&
                            "after:-translate-x-1/2 after:pointer-events-none after:absolute after:start-1/2 after:bottom-1 after:z-10 after:size-[3px] after:rounded-full after:bg-primary",
                          draggedEventId ? "cursor-move" : "cursor-default", // Change cursor when dragging
                        ])}
                        data-date={toJSDate(date).toISOString()}
                        ref={(el: HTMLTableCellElement) => {
                          if (el) {
                            // Optimize cell refs storage to prevent memory issues
                            // Use a Set-like approach by checking inclusion before adding
                            if (!cellRefs.current.includes(el)) {
                              // Limit max number of refs to prevent memory issues
                              if (cellRefs.current.length > 200) {
                                // Only keep the most recent cells in the array
                                cellRefs.current = cellRefs.current.slice(-150);
                              }
                              cellRefs.current.push(el);
                            }
                          }
                        }}
                      >
                        {({
                          formattedDate,
                          isSelected,
                          isSelectionStart,
                          isSelectionEnd,
                          isDisabled,
                        }: {
                          formattedDate: string;
                          isSelected: boolean;
                          isSelectionStart: boolean;
                          isSelectionEnd: boolean;
                          isDisabled: boolean;
                        }) => (
                          <span className="w-full h-full flex flex-col">
                            {/* Event indicators */}
                            <EventIndicatorsComponent
                              date={toJSDate(date)}
                              events={adjustedEvents}
                              dragInfo={draggedEventRef.current?._dragData}
                            />

                            {/* Date content */}
                            {(() => {
                              // Get busy events for this date to show in popover
                              const jsDate = toJSDate(date);
                              const dateKey = getDateKey(jsDate);
                              const busyEvents = getBusyEventsForDate(
                                jsDate,
                                events
                              );
                              const hasBusyEvents = busyEvents.length > 0;

                              // Format the date content
                              const dateContent = (
                                <span
                                  className={twMerge([
                                    "flex-grow flex items-center justify-center",
                                    isDisabled && "opacity-50",
                                  ])}
                                  ref={(el) => {
                                    const refObj = getTriggerRef(dateKey);
                                    refObj.current = el;
                                  }}
                                  onClick={() =>
                                    openPopover(dateKey, busyEvents)
                                  }
                                >
                                  {renderCellContent
                                    ? renderCellContent({
                                        date,
                                        formattedDate,
                                        isSelected,
                                        isSelectionStart,
                                        isSelectionEnd,
                                        isDisabled,
                                        isInRange:
                                          isSelected &&
                                          !isSelectionStart &&
                                          !isSelectionEnd,
                                      })
                                    : formattedDate}
                                </span>
                              );
                              // Otherwise just return the date content
                              return dateContent;
                            })()}
                          </span>
                        )}
                      </CalendarCell>
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              );
            }
          )}
        </div>

        {errorMessage && (
          <Text slot="errorMessage" className="text-danger text-sm">
            {errorMessage}
          </Text>
        )}
      </RangeCalendarPrimitive>
      <Popover.Content
        triggerRef={getTriggerRef(activePopoverData?.dateKey ?? "")}
        isOpen={!!activePopover}
        onOpenChange={(isOpen) => {
          debugLog("Popover open state changed to:", isOpen);
          if (!isOpen) {
            setActivePopover(null);
            setActivePopoverData(null);
          }
        }}
        showArrow={true}
        placement="bottom"
      >
        <Popover.Header>
          <Popover.Title>Unavailable Date</Popover.Title>
        </Popover.Header>
        <Popover.Body>
          {(activePopoverData?.busyEvents?.length ?? 0) > 0 ? (
            <div className="space-y-2 mt-2">
              {activePopoverData?.busyEvents?.map((event) => (
                <div key={event.id} className="flex items-center gap-2 text-sm">
                  {(event.userPhotoUrl ||
                    event.userFirstName ||
                    event.userLastName) && (
                    <Avatar
                      src={event.userPhotoUrl}
                      initials={getInitials(
                        event.userFirstName,
                        event.userLastName
                      )}
                      size="small"
                    />
                  )}
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-muted-fg">
                      {event.startDate.toLocaleDateString()} -{" "}
                      {event.endDate.toLocaleDateString()}
                    </div>
                    {(event.userFirstName || event.userLastName) && (
                      <div className="text-xs mt-1">
                        {event.userFirstName} {event.userLastName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm mt-2">
              This date cannot be selected based on the calendar constraints.
            </div>
          )}
        </Popover.Body>
      </Popover.Content>
    </>
  );
};

export type { RangeCalendarProps, CalendarEvent };
export { RangeCalendar };

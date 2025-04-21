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

// Represents a calendar event with start and end dates
interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
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

  // Helper to handle date changes during drag operations
  const updateDragDate = useCallback(
    (date: Date) => {
      if (!dragCurrentDate || !isSameDay(dragCurrentDate, date)) {
        setDragCurrentDate(date);
      }
    },
    [dragCurrentDate]
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

  // Handle drag start on an event
  const handleDragStart = (
    event: CalendarEvent,
    date: Date,
    e: JSX.TargetedDragEvent<HTMLDivElement>
  ) => {
    // Prevent the event from propagating to parent elements
    e.stopPropagation();

    // Store the event immediately in the ref for backup
    draggedEventRef.current = { ...event };

    // Set state for tracking
    setDraggedEventId(event.id);
    setDragStartDate(date);
    setDragCurrentDate(date); // Initialize current date to prevent null values

    // Set drag data and effect
    if (e.dataTransfer) {
      // Create a transparent drag image (1x1 pixel)
      const img = new Image();
      img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);

      // Set allowed effects and data
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", event.id);
      console.log("drag start", event.id, "at date", date.toISOString());
    }
  };

  // Handle the end of a drag operation
  const handleDragEnd = useCallback(
    (e?: JSX.TargetedDragEvent<HTMLDivElement>) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const originalEvent = draggedEventRef.current;

      if (
        draggedEventId &&
        dragStartDate &&
        dragCurrentDate &&
        (originalEvent || events.find((e) => e.id === draggedEventId))
      ) {
        // Prefer the ref event, fall back to finding in the events array
        const draggedEvent =
          originalEvent || events.find((e) => e.id === draggedEventId);

        if (draggedEvent && onEventDragEnd) {
          // Calculate the offset in days between the drag start and current position
          const daysDiff = Math.round(
            (dragCurrentDate.getTime() - dragStartDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (daysDiff !== 0) {
            // Calculate new dates for the event
            const newStartDate = new Date(draggedEvent.startDate);
            newStartDate.setDate(newStartDate.getDate() + daysDiff);

            const newEndDate = new Date(draggedEvent.endDate);
            newEndDate.setDate(newEndDate.getDate() + daysDiff);

            console.log("Drag completed: moving event by", daysDiff, "days");
            // Call the callback with the updated event dates
            onEventDragEnd(draggedEvent, newStartDate, newEndDate);
          }
        }
      } else {
        console.log("Drag ended with incomplete data:", {
          draggedEventId,
          dragStartDate,
          dragCurrentDate,
          originalEvent,
        });
      }

      // Reset drag state
      resetDragState();
    },
    [
      draggedEventId,
      dragStartDate,
      dragCurrentDate,
      events,
      onEventDragEnd,
      resetDragState,
    ]
  );

  // Extract date from drag events
  const extractDateFromEvent = useCallback((e: DragEvent): Date | null => {
    const target = e.target as HTMLElement;
    const cellElement = target.closest("[data-date]");
    const dateAttr = cellElement?.getAttribute("data-date");

    if (dateAttr) {
      try {
        return new Date(dateAttr);
      } catch (err) {
        console.error("Error parsing date:", dateAttr, err);
      }
    }
    return null;
  }, []);

  const cellRefs = useRef<HTMLTableCellElement[]>([]);

  // Handle drag over a calendar cell
  const handleDragOver = useCallback(
    (date: Date, e: DragEvent | JSX.TargetedDragEvent<HTMLDivElement>) => {
      // Always prevent default to allow drop
      e.preventDefault();

      // Enable dropEffect
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      if (draggedEventId) {
        updateDragDate(date);
      }
    },
    [draggedEventId, updateDragDate]
  );

  // Render event indicators for a specific date
  const renderEvents = (date: Date) => {
    // Use the memoized adjusted events
    const eventsOnDate = adjustedEvents.filter((event) =>
      isEventOnDate(event, date)
    );

    if (eventsOnDate.length === 0) return null;

    // Create a map of event IDs to their position index to ensure consistent positioning
    // This will determine the grid row for each event
    const eventPositionMap = useMemo(() => {
      // Create a list of all unique events
      const uniqueEvents = [
        ...new Map(events.map((event) => [event.id, event])).values(),
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
          zIndex: isDraggedDate ? 100 : (eventsOnDate.some(e => isEventStartDate(e, date)) ? 40 : 20),
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
                <span className="text-white text-xs font-semibold whitespace-nowrap pl-2 drop-shadow-sm">
                  {event.title}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Consolidated event listener management for all drag operations
  useEffect(() => {
    if (!draggedEventId && cellRefs.current.length === 0) return;

    // Create a single throttle mechanism for all drag events
    let lastUpdateTime = 0;
    let lastDate: Date | null = null;
    const throttleTime = 50; // Throttle time in ms

    // Generic throttled function to update drag date
    const throttledDateUpdate = (date: Date) => {
      const now = Date.now();

      if (!lastDate || !isSameDay(lastDate, date)) {
        // Always update if it's a new day
        lastUpdateTime = now;
        lastDate = date;
        updateDragDate(date);
      } else if (now - lastUpdateTime >= throttleTime) {
        // Throttle same-day updates
        lastUpdateTime = now;
        updateDragDate(date);
      }
    };

    // Handler for cell-level drag over events
    const handleCellDragOver = (e: DragEvent) => {
      if (!draggedEventId) return;
      e.preventDefault();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }

      const date = extractDateFromEvent(e);
      if (date) {
        throttledDateUpdate(date);
      }
    };

    // Handler for cell-level drag enter events
    const handleCellDragEnter = (e: DragEvent) => {
      if (!draggedEventId) return;
      e.preventDefault();

      const date = extractDateFromEvent(e);
      if (date) {
        throttledDateUpdate(date);
      }
    };

    // Generic handler for all drag end events
    const handleGlobalDragEnd = (e: DragEvent) => {
      if (!draggedEventId) return;
      e.preventDefault();
      handleDragEnd();
    };

    // Set up event listeners
    const setupListeners = () => {
      // Add cell-level event listeners
      cellRefs.current.forEach((cell) => {
        if (cell) {
          cell.addEventListener("dragover", handleCellDragOver, {
            capture: true,
          });
          cell.addEventListener("dragenter", handleCellDragEnter, {
            capture: true,
          });
        }
      });

      // Add document-level event listeners only when dragging
      if (draggedEventId) {
        document.addEventListener("dragover", handleCellDragOver, {
          capture: true,
        });
        document.addEventListener("dragenter", handleCellDragEnter, {
          capture: true,
        });
        document.addEventListener("dragend", handleGlobalDragEnd, {
          capture: true,
        });
        document.addEventListener("drop", handleGlobalDragEnd, {
          capture: true,
        });
      }
    };

    // Clean up all listeners
    const cleanupListeners = () => {
      // Clean up cell listeners
      cellRefs.current.forEach((cell) => {
        if (cell) {
          cell.removeEventListener("dragover", handleCellDragOver, {
            capture: true,
          });
          cell.removeEventListener("dragenter", handleCellDragEnter, {
            capture: true,
          });
        }
      });

      // Clean up document listeners
      document.removeEventListener("dragover", handleCellDragOver, {
        capture: true,
      });
      document.removeEventListener("dragenter", handleCellDragEnter, {
        capture: true,
      });
      document.removeEventListener("dragend", handleGlobalDragEnd, {
        capture: true,
      });
      document.removeEventListener("drop", handleGlobalDragEnd, {
        capture: true,
      });
    };

    // Set up listeners when the effect runs
    setupListeners();

    // Clean up listeners when dependencies change or component unmounts
    return cleanupListeners;
  }, [draggedEventId, extractDateFromEvent, updateDragDate, handleDragEnd]);

  // Clean up refs when component unmounts
  useEffect(() => {
    return () => {
      cellRefs.current = [];
      draggedEventRef.current = null;
    };
  }, []);

  return (
    <RangeCalendarPrimitive visibleDuration={visibleDuration} {...props}>
      <CalendarHeader isRange />
      <div className="flex snap-x items-start justify-stretch gap-6 overflow-auto sm:gap-10">
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
                        "group/calendar-cell relative size-20 cursor-default outline-hidden [line-height:2.286rem] sm:size-18 sm:text-sm",
                        "[td:first-child_&]:rounded-s-lg [td:last-child_&]:rounded-e-lg",
                        date.compare(now) === 0 &&
                          "after:-translate-x-1/2 after:pointer-events-none after:absolute after:start-1/2 after:bottom-1 after:z-10 after:size-[3px] after:rounded-full after:bg-primary",
                        draggedEventId ? "cursor-move" : "cursor-default", // Change cursor when dragging
                      ])}
                      data-date={toJSDate(date).toISOString()}
                      ref={(el: HTMLTableCellElement) => {
                        if (el) {
                          // Use a more efficient way to check if the element is already in the array
                          if (!cellRefs.current.includes(el)) {
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
                          {events &&
                            events.length > 0 &&
                            renderEvents(toJSDate(date))}

                          {/* Date content */}
                          <span className="flex-grow flex items-center justify-center">
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
  );
};

export type { RangeCalendarProps, CalendarEvent };
export { RangeCalendar };

"use client";

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 272;
const PANEL_ESTIMATED_HEIGHT = 280;
const PANEL_Z_INDEX = 100;
const OPTION_HEIGHT_PX = 36;
const COLUMN_HEIGHT_PX = 220;

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTE_OPTIONS = [0, 15, 30, 45] as const;
type DayPeriod = "am" | "pm";

const PERIOD_OPTIONS: { id: DayPeriod; label: string }[] = [
  { id: "am", label: "AM" },
  { id: "pm", label: "PM" },
];

export const SOFT_TIME_PICKER_PANEL_SELECTOR = "[data-soft-time-picker-panel]";

export function isSoftTimePickerPanelTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(SOFT_TIME_PICKER_PANEL_SELECTOR) !== null
  );
}

function parseHm(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function toHm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapMinute(m: number) {
  return MINUTE_OPTIONS.reduce((best, option) =>
    Math.abs(option - m) < Math.abs(best - m) ? option : best,
  );
}

function to24h(hour12: number, minute: number, period: DayPeriod): string {
  let h24: number;
  if (period === "am") {
    h24 = hour12 === 12 ? 0 : hour12;
  } else {
    h24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return toHm(h24, minute);
}

function from24h(value: string): {
  hour12: number;
  minute: number;
  period: DayPeriod;
} {
  const parsed = parseHm(value);
  if (!parsed) {
    return { hour12: 7, minute: 0, period: "pm" };
  }
  const period: DayPeriod = parsed.h < 12 ? "am" : "pm";
  let hour12 = parsed.h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: snapMinute(parsed.m), period };
}

function formatDisplay(value: string) {
  const parts = parseHm(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(2000, 0, 1, parts.h, parts.m));
  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const selectedOptionClass =
  "bg-[#C8E6C9] font-semibold text-zinc-900 dark:bg-[#5FA88A] dark:text-white";

const columnPaddingY = (COLUMN_HEIGHT_PX - OPTION_HEIGHT_PX) / 2;

function scrollOptionToCenter(
  container: HTMLDivElement,
  index: number,
  behavior: ScrollBehavior = "instant",
) {
  const button = container.querySelectorAll<HTMLElement>("[data-time-option]")[
    index
  ];
  if (!button) return;
  const targetTop =
    button.offsetTop - (container.clientHeight - button.offsetHeight) / 2;
  container.scrollTo({ top: targetTop, behavior });
}

function ScrollPickerColumn<T extends string | number>({
  ariaLabel,
  options,
  selected,
  onSelect,
  columnRef,
  formatOption = (v) => String(v),
}: {
  ariaLabel: string;
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  columnRef?: RefObject<HTMLDivElement | null>;
  formatOption?: (value: T) => ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        ref={columnRef}
        role="listbox"
        aria-label={ariaLabel}
        className={cn(
          "touch-pan-y overflow-y-auto overscroll-contain",
          "rounded-xl bg-muted/30 ring-1 ring-border/50",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
        style={{
          height: COLUMN_HEIGHT_PX,
          paddingTop: columnPaddingY,
          paddingBottom: columnPaddingY,
        }}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <button
              key={String(option)}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-time-option
              data-time-option-selected={isSelected ? "" : undefined}
              onClick={() => onSelect(option)}
              className={cn(
                "flex h-9 w-full shrink-0 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                !isSelected && "text-foreground hover:bg-muted/80",
                isSelected && selectedOptionClass,
              )}
            >
              {formatOption(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SoftTimePicker({
  id,
  value,
  onChange,
  align = "start",
  className,
  triggerClassName,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);
  const periodColRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const parts = from24h(value);
  const [hour12, setHour12] = useState(parts.hour12);
  const [minute, setMinute] = useState(parts.minute);
  const [period, setPeriod] = useState<DayPeriod>(parts.period);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    const next = from24h(value);
    setHour12(next.hour12);
    setMinute(next.minute);
    setPeriod(next.period);

    const alignWheels = () => {
      const columns: {
        ref: RefObject<HTMLDivElement | null>;
        index: number;
      }[] = [
        {
          ref: hourColRef,
          index: HOURS_12.indexOf(next.hour12 as (typeof HOURS_12)[number]),
        },
        {
          ref: minuteColRef,
          index: MINUTE_OPTIONS.indexOf(
            next.minute as (typeof MINUTE_OPTIONS)[number],
          ),
        },
        {
          ref: periodColRef,
          index: PERIOD_OPTIONS.findIndex((o) => o.id === next.period),
        },
      ];
      for (const col of columns) {
        if (col.index < 0) continue;
        const container = col.ref.current;
        if (container) scrollOptionToCenter(container, col.index, "instant");
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(alignWheels));
  }, [open, value]);

  const commit = useCallback(
    (h: number, m: number, p: DayPeriod) => {
      setHour12(h);
      setMinute(m);
      setPeriod(p);
      onChange(to24h(h, m, p));
    },
    [onChange],
  );

  function updatePanelPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 32);
    const margin = 16;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openBelow =
      spaceBelow >= PANEL_ESTIMATED_HEIGHT || spaceBelow >= spaceAbove;

    let top = openBelow
      ? rect.bottom + 8
      : rect.top - PANEL_ESTIMATED_HEIGHT - 8;
    let left = align === "end" ? rect.right - width : rect.left;
    left = clamp(left, margin, window.innerWidth - width - margin);
    top = clamp(
      top,
      margin,
      window.innerHeight - PANEL_ESTIMATED_HEIGHT - margin,
    );

    setPanelPosition({ top, left, width });
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const panel =
    open && panelPosition
      ? createPortal(
          <DismissableLayerBranch>
            <div
              ref={panelRef}
              data-soft-time-picker-panel
              role="dialog"
              aria-label="Elegir hora"
              className="pointer-events-auto rounded-[20px] bg-card p-3 text-card-foreground shadow-lg ring-1 ring-border"
              style={{
                position: "fixed",
                top: panelPosition.top,
                left: panelPosition.left,
                width: panelPosition.width,
                zIndex: PANEL_Z_INDEX,
              }}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="grid grid-cols-3 gap-2">
                <ScrollPickerColumn
                  ariaLabel="Hora"
                  columnRef={hourColRef}
                  options={HOURS_12}
                  selected={hour12}
                  onSelect={(h) => commit(h, minute, period)}
                />
                <ScrollPickerColumn
                  ariaLabel="Minutos"
                  columnRef={minuteColRef}
                  options={MINUTE_OPTIONS}
                  selected={minute}
                  formatOption={(m) => String(m).padStart(2, "0")}
                  onSelect={(m) => commit(hour12, m, period)}
                />
                <ScrollPickerColumn
                  ariaLabel="AM o PM"
                  columnRef={periodColRef}
                  options={PERIOD_OPTIONS.map((o) => o.id)}
                  selected={period}
                  formatOption={(id) =>
                    PERIOD_OPTIONS.find((o) => o.id === id)?.label ?? id
                  }
                  onSelect={(p) => commit(hour12, minute, p)}
                />
              </div>
            </div>
          </DismissableLayerBranch>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        data-slot="input"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={cn(
          "haus-input-control rounded-input",
          triggerClassName ??
            cn(
              "flex h-11 w-full items-center gap-2 bg-muted px-3.5 text-left text-sm text-foreground outline-none ring-1 ring-input-border transition-colors",
              "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "cursor-not-allowed opacity-50",
            ),
        )}
      >
        <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {formatDisplay(value)}
        </span>
      </button>
      {panel}
    </div>
  );
}

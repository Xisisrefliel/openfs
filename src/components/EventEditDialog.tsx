import { useEffect, useRef, useState } from "react";
import { CalendarClock, CalendarDays, Check, Clock, X } from "lucide-react";

import {
  type CalEvent,
  type EventType,
  eventTypeOptions,
  parseISODate,
  toISODate,
  toMinutes,
} from "@/lib/calendar-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NO_VEHICLE = "__none__";
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

const formatDateLabel = (value: string) =>
  parseISODate(value).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const parseTimeValue = (value: string) => {
  const [hour = "00", minute = "00"] = value.split(":");
  return {
    hour: hour.padStart(2, "0"),
    minute: minute.padStart(2, "0"),
  };
};

const formatTimeValue = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const scrollTimeListWithWheel = (
  event: React.WheelEvent<HTMLDivElement>
) => {
  if (!event.deltaY) return;

  event.currentTarget.scrollTop += event.deltaY;
  event.preventDefault();
  event.stopPropagation();
};

const keepDialogOpenForPopover = (event: Event) => {
  const target = event.target;
  if (
    document.querySelector('[data-slot="popover-content"]') ||
    (target instanceof Element &&
      target.closest('[data-slot="popover-content"]'))
  ) {
    event.preventDefault();
  }
};

function DatePickerField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-8 w-full justify-start px-2.5 font-normal"
        >
          <CalendarDays data-icon="inline-start" />
          <span className="truncate">{formatDateLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          required
          selected={selected}
          month={selected}
          onSelect={date => {
            onChange(toISODate(date));
            setOpen(false);
          }}
          weekStartsOn={1}
          showOutsideDays
          className="p-0"
          formatters={{
            formatCaption: date =>
              date.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              }),
            formatWeekdayName: date =>
              date
                .toLocaleDateString("de-DE", { weekday: "short" })
                .slice(0, 2),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function TimePickerField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { hour, minute } = parseTimeValue(value);
  const selectedHourRef = useRef<HTMLButtonElement | null>(null);
  const setTime = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      selectedHourRef.current?.scrollIntoView({
        block: "center",
      });
    });
  }, [open, hour]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-8 w-full justify-start px-2.5 font-normal tabular-nums"
        >
          <Clock data-icon="inline-start" />
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2.5">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Uhrzeit
            </span>
            <span className="text-lg font-medium tabular-nums">
              {hour}:{minute}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="px-1 text-center text-xs font-medium text-muted-foreground">
                Stunde
              </div>
              <div
                className="subtle-scrollbar h-44 overflow-y-auto overscroll-contain rounded-lg border bg-background"
                role="listbox"
                aria-label="Stunde auswählen"
                onWheel={scrollTimeListWithWheel}
              >
                <div className="flex flex-col gap-1 p-1">
                  {HOUR_OPTIONS.map(option => (
                    <Button
                      key={option}
                      ref={option === hour ? selectedHourRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={option === hour}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 justify-center rounded-md px-2 text-base font-normal tabular-nums",
                        option === hour &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                      onClick={() => setTime(option, minute)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center pt-7 text-xl font-medium text-muted-foreground">
              :
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="px-1 text-center text-xs font-medium text-muted-foreground">
                Minute
              </div>
              <div
                className="subtle-scrollbar h-44 overflow-y-auto overscroll-contain rounded-lg border bg-background"
                role="listbox"
                aria-label="Minute auswählen"
                onWheel={scrollTimeListWithWheel}
              >
                <div className="flex flex-col gap-1 p-1">
                  {MINUTE_OPTIONS.map(option => (
                    <Button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={option === minute}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 justify-center rounded-md px-2 text-base font-normal tabular-nums",
                        option === minute &&
                          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                      onClick={() => setTime(hour, option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            <Check data-icon="inline-start" />
            Übernehmen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function EventEditDialog({
  event,
  open,
  onOpenChange,
  onSave,
  instructorOptions,
  vehicleOptions,
}: {
  event: CalEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: CalEvent) => void;
  instructorOptions: string[];
  vehicleOptions: string[];
}) {
  const [draft, setDraft] = useState<CalEvent | null>(event);

  // Reset the working copy whenever a different event is opened for editing.
  useEffect(() => {
    setDraft(event);
  }, [event]);

  if (!event || !draft) return null;

  const update = <K extends keyof CalEvent>(key: K, value: CalEvent[K]) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const updateStartTime = (value: string) => {
    setDraft(current => {
      if (!current) return current;

      const nextStartMinutes = toMinutes(value);
      const currentEndMinutes = toMinutes(current.end);

      return {
        ...current,
        start: value,
        end:
          nextStartMinutes >= currentEndMinutes
            ? formatTimeValue(nextStartMinutes + 30)
            : current.end,
      };
    });
  };

  const dateLabel = parseISODate(draft.date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const cancel = () => {
    setDraft(event);
    onOpenChange(false);
  };

  const save = () => {
    onSave(event.id, draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-auto sm:max-w-2xl"
        onFocusOutside={keepDialogOpenForPopover}
        onInteractOutside={keepDialogOpenForPopover}
        onPointerDownOutside={keepDialogOpenForPopover}
      >
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CalendarClock />
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-xl">
                  {draft.title || "Termin"}
                </DialogTitle>
                <DialogDescription>
                  {dateLabel} · {draft.start}–{draft.end}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={save}>
                <Check data-icon="inline-start" />
                Speichern
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
              >
                <X data-icon="inline-start" />
                Abbrechen
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Card size="sm">
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="event-title">Titel</FieldLabel>
                <Input
                  id="event-title"
                  value={draft.title}
                  onChange={e => update("title", e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-type">Ereignistyp</FieldLabel>
                <Select
                  value={draft.type}
                  onValueChange={value => update("type", value as EventType)}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {eventTypeOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="event-date">Datum</FieldLabel>
                <DatePickerField
                  id="event-date"
                  value={draft.date}
                  onChange={value => update("date", value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-start">Von</FieldLabel>
                <TimePickerField
                  id="event-start"
                  value={draft.start}
                  onChange={updateStartTime}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-end">Bis</FieldLabel>
                <TimePickerField
                  id="event-end"
                  value={draft.end}
                  onChange={value => update("end", value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-subtitle">Teilnehmer/in</FieldLabel>
                <Input
                  id="event-subtitle"
                  value={draft.subtitle ?? ""}
                  onChange={e =>
                    update("subtitle", e.target.value || undefined)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="event-instructor">Fahrlehrer/in</FieldLabel>
                <Select
                  value={draft.instructor}
                  onValueChange={value => update("instructor", value)}
                >
                  <SelectTrigger id="event-instructor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(instructorOptions.includes(draft.instructor)
                        ? instructorOptions
                        : [draft.instructor, ...instructorOptions]
                      ).map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="event-vehicle">Fahrzeug</FieldLabel>
                <Select
                  value={draft.vehicle ?? NO_VEHICLE}
                  onValueChange={value =>
                    update("vehicle", value === NO_VEHICLE ? undefined : value)
                  }
                >
                  <SelectTrigger id="event-vehicle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={NO_VEHICLE}>Kein Fahrzeug</SelectItem>
                      {vehicleOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="event-location">Ort</FieldLabel>
                <Input
                  id="event-location"
                  value={draft.location ?? ""}
                  onChange={e =>
                    update("location", e.target.value || undefined)
                  }
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm sm:col-span-2">
                <Checkbox
                  checked={draft.tentative ?? false}
                  onCheckedChange={checked =>
                    update("tentative", checked === true)
                  }
                />
                Vorläufig (unbestätigt)
              </label>
            </FieldGroup>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

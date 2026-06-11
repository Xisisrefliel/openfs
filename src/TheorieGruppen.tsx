import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  DoorOpen,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import { useInstructors } from "@/hooks/use-instructors";
import { useStudents } from "@/hooks/use-students";
import {
  useTheoryGroups,
  createTheoryGroup,
  updateTheoryGroup,
  deleteTheoryGroup,
  type TheoryGroup,
  type TheoryGroupInput,
  type TheoryGroupStatus,
} from "@/hooks/use-theory-groups";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

const CLASS_OPTIONS = ["A", "A1", "B", "B197", "BE"] as const;

/* ------------------------------------------------------------------ */
/* Create/Edit dialog                                                  */
/* ------------------------------------------------------------------ */

type GroupDraft = {
  name: string;
  klass: string;
  weekday: string;
  time: string;
  room: string;
  instructor: string;
  capacity: string;
  status: TheoryGroupStatus;
};

function createEmptyDraft(): GroupDraft {
  return {
    name: "",
    klass: "B",
    weekday: "Montag",
    time: "18:00",
    room: "",
    instructor: "Nicht zugeteilt",
    capacity: "20",
    status: "aktiv",
  };
}

function groupToDraft(group: TheoryGroup): GroupDraft {
  return {
    name: group.name,
    klass: group.klass,
    weekday: group.weekday,
    time: group.time,
    room: group.room,
    instructor: group.instructor,
    capacity: String(group.capacity),
    status: group.status,
  };
}

function draftToPayload(draft: GroupDraft): Partial<TheoryGroupInput> {
  return {
    name: draft.name,
    klass: draft.klass,
    weekday: draft.weekday,
    time: draft.time,
    room: draft.room,
    instructor: draft.instructor,
    capacity: Number(draft.capacity),
    status: draft.status,
  };
}

function GroupEditDialog({
  group,
  open,
  onOpenChange,
  onSave,
  instructorOptions,
  mode,
}: {
  group: TheoryGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Partial<TheoryGroupInput>) => Promise<void>;
  instructorOptions: string[];
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<GroupDraft | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }
    setDraft(group ? groupToDraft(group) : createEmptyDraft());
  }, [open, group?.id]);

  function update<Key extends keyof GroupDraft>(key: Key, value: GroupDraft[Key]) {
    setDraft(current => (current ? { ...current, [key]: value } : current));
  }

  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Gruppe hinzufügen" : "Gruppe bearbeiten"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Neue Theorie-Gruppe anlegen."
              : "Termin, Raum, Fahrlehrer/in und Kapazität aktualisieren."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="group-name">Name</FieldLabel>
            <Input
              id="group-name"
              value={draft.name}
              onChange={event => update("name", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-class">Klasse</FieldLabel>
            <Select
              value={draft.klass}
              onValueChange={value => update("klass", value)}
            >
              <SelectTrigger id="group-class" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(CLASS_OPTIONS.includes(draft.klass as never)
                    ? [...CLASS_OPTIONS]
                    : [draft.klass, ...CLASS_OPTIONS]
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
            <FieldLabel htmlFor="group-weekday">Wochentag</FieldLabel>
            <Select
              value={draft.weekday}
              onValueChange={value => update("weekday", value)}
            >
              <SelectTrigger id="group-weekday" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {WEEKDAYS.map(weekday => (
                    <SelectItem key={weekday} value={weekday}>
                      {weekday}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="group-time">Uhrzeit</FieldLabel>
            <Input
              id="group-time"
              type="time"
              value={draft.time}
              onChange={event => update("time", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-room">Raum</FieldLabel>
            <Input
              id="group-room"
              value={draft.room}
              placeholder="z. B. Schulungsraum 1"
              onChange={event => update("room", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-instructor">Fahrlehrer/in</FieldLabel>
            <Select
              value={draft.instructor}
              onValueChange={value => update("instructor", value)}
            >
              <SelectTrigger id="group-instructor" className="w-full">
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
            <FieldLabel htmlFor="group-capacity">Kapazität</FieldLabel>
            <Input
              id="group-capacity"
              type="number"
              min={1}
              value={draft.capacity}
              onChange={event => update("capacity", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="group-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={value =>
                update("status", value as TheoryGroupStatus)
              }
            >
              <SelectTrigger id="group-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={async () => {
              try {
                await onSave(draftToPayload(draft));
                onOpenChange(false);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Gruppe konnte nicht gespeichert werden."
                );
              }
            }}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Manage members dialog                                               */
/* ------------------------------------------------------------------ */

function MembersDialog({
  group,
  students,
  open,
  onOpenChange,
  onChangeMembers,
}: {
  group: TheoryGroup | null;
  students: { id: number; firstName: string; lastName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeMembers: (group: TheoryGroup, nextIds: number[]) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setSelectedId("");
  }, [open, group?.id]);

  const availableStudents = useMemo(() => {
    if (!group) return [];
    const memberIds = new Set(group.studentIds);
    return students.filter(student => !memberIds.has(student.id));
  }, [group, students]);

  if (!group) {
    return null;
  }

  const occupied = group.members.length;
  const isFull = group.studentIds.length >= group.capacity;

  async function change(nextIds: number[], successMessage: string) {
    if (!group) return;
    setBusy(true);
    try {
      await onChangeMembers(group, nextIds);
      setSelectedId("");
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Teilnehmerliste konnte nicht aktualisiert werden."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Teilnehmer verwalten</DialogTitle>
          <DialogDescription>
            {group.name} · {occupied} von {group.capacity} Plätzen belegt
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="member-select">
                Fahrschüler/in hinzufügen
              </FieldLabel>
              <Select
                value={selectedId}
                onValueChange={setSelectedId}
                disabled={isFull || availableStudents.length === 0}
              >
                <SelectTrigger id="member-select" className="w-full">
                  <SelectValue
                    placeholder={
                      isFull
                        ? "Gruppe ist voll"
                        : availableStudents.length === 0
                          ? "Keine weiteren Fahrschüler"
                          : "Fahrschüler/in wählen"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableStudents.map(student => (
                      <SelectItem key={student.id} value={String(student.id)}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              disabled={busy || isFull || selectedId === ""}
              onClick={() =>
                void change(
                  [...group.studentIds, Number(selectedId)],
                  "Teilnehmer/in hinzugefügt."
                )
              }
            >
              <UserPlus data-icon="inline-start" />
              Hinzufügen
            </Button>
          </div>

          <Separator />

          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Teilnehmer in dieser Gruppe.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-auto">
              {group.members.map(member => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5"
                >
                  <span className="truncate text-sm font-medium">
                    {member.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`${member.name} entfernen`}
                    disabled={busy}
                    onClick={() =>
                      void change(
                        group.studentIds.filter(id => id !== member.id),
                        "Teilnehmer/in entfernt."
                      )
                    }
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Schließen
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Group card                                                          */
/* ------------------------------------------------------------------ */

function GroupCard({
  group,
  onEdit,
  onMembers,
  onDelete,
}: {
  group: TheoryGroup;
  onEdit: () => void;
  onMembers: () => void;
  onDelete: () => void;
}) {
  const occupied = group.members.length;
  const percent =
    group.capacity > 0
      ? Math.min(100, Math.round((occupied / group.capacity) * 100))
      : 0;

  const details = [
    { Icon: CalendarDays, label: "Wochentag", value: group.weekday },
    { Icon: Clock, label: "Uhrzeit", value: `${group.time} Uhr` },
    { Icon: DoorOpen, label: "Raum", value: group.room || "Kein Raum" },
    { Icon: User, label: "Fahrlehrer/in", value: group.instructor },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <GraduationCap className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{group.name}</CardTitle>
            <CardDescription>
              {group.weekday}, {group.time} Uhr
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant={group.status === "aktiv" ? "secondary" : "outline"}>
              {group.status === "aktiv" ? "Aktiv" : "Abgeschlossen"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${group.name} bearbeiten`}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`${group.name} löschen`}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit">
          Klasse {group.klass}
        </Badge>
        <Separator />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {details.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate text-sm font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Belegung</span>
            <span className="tabular-nums">
              {occupied}/{group.capacity}
            </span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
        <Button type="button" variant="outline" onClick={onMembers}>
          <Users data-icon="inline-start" />
          Teilnehmer verwalten
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function TheorieGruppen() {
  const { groups, loading, refresh } = useTheoryGroups();
  const { assignableNames: instructorOptions } = useInstructors();
  const { students } = useStudents();

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [membersGroupId, setMembersGroupId] = useState<number | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const editingMode: "create" | "edit" = isCreateOpen ? "create" : "edit";
  const editingGroup = isCreateOpen
    ? null
    : groups.find(group => group.id === editingGroupId) ?? null;
  const isEditDialogOpen = isCreateOpen || editingGroup !== null;
  const membersGroup = groups.find(group => group.id === membersGroupId) ?? null;
  const deleteGroup = groups.find(group => group.id === deleteGroupId) ?? null;

  async function saveGroup(payload: Partial<TheoryGroupInput>) {
    if (editingMode === "create") {
      await createTheoryGroup(payload);
      toast.success("Gruppe angelegt.");
    } else if (editingGroupId !== null) {
      await updateTheoryGroup(editingGroupId, payload);
      toast.success("Gruppe gespeichert.");
    } else {
      return;
    }
    await refresh();
    setEditingGroupId(null);
    setIsCreateOpen(false);
  }

  async function changeMembers(group: TheoryGroup, nextIds: number[]) {
    await updateTheoryGroup(group.id, { studentIds: nextIds });
    await refresh();
  }

  async function confirmDelete() {
    if (deleteGroup === null) return;
    try {
      await deleteTheoryGroup(deleteGroup.id);
      await refresh();
      toast.success("Gruppe gelöscht.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
    } finally {
      setDeleteGroupId(null);
      if (editingGroupId === deleteGroup.id) setEditingGroupId(null);
      if (membersGroupId === deleteGroup.id) setMembersGroupId(null);
    }
  }

  // DB-backed list — same students/instructors sources as the other pages.
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingGroupId(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Gruppe hinzufügen
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="stagger-in grid gap-4 md:grid-cols-2 2xl:gap-5">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Lade Theorie-Gruppen…
            </div>
          )}
          {!loading && groups.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Noch keine Theorie-Gruppen angelegt.
            </div>
          )}
          {groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={() => {
                setIsCreateOpen(false);
                setEditingGroupId(group.id);
              }}
              onMembers={() => setMembersGroupId(group.id)}
              onDelete={() => setDeleteGroupId(group.id)}
            />
          ))}
        </div>
      </div>

      <GroupEditDialog
        group={editingGroup}
        instructorOptions={instructorOptions}
        mode={editingMode}
        open={isEditDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setEditingGroupId(null);
            setIsCreateOpen(false);
          }
        }}
        onSave={saveGroup}
      />

      <MembersDialog
        group={membersGroup}
        students={students}
        open={membersGroup !== null}
        onOpenChange={open => {
          if (!open) setMembersGroupId(null);
        }}
        onChangeMembers={changeMembers}
      />

      <AlertDialog
        open={deleteGroup !== null}
        onOpenChange={open => {
          if (!open) setDeleteGroupId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleteGroup?.name}“ wird dauerhaft gelöscht. Die Fahrschüler
              selbst bleiben erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TheorieGruppen;

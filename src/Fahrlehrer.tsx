import { useState } from "react";
import {
  Car,
  CalendarDays,
  GraduationCap,
  IdCard,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  createInstructor,
  deleteInstructor,
  instructorName,
  updateInstructor,
  useInstructors,
  type Instructor,
  type InstructorInput,
} from "@/hooks/use-instructors";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const accents = [
  "bg-sky-500/10 text-sky-600",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-rose-500/10 text-rose-600",
  "bg-violet-500/10 text-violet-600",
];

const emptyDraft: InstructorInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  classes: "",
  vehicle: "",
  since: "",
  status: "aktiv",
};

function instructorToDraft(instructor: Instructor): InstructorInput {
  const { id: _id, ...draft } = instructor;
  return draft;
}

function InstructorDialog({
  title,
  description,
  draft,
  open,
  saving,
  onOpenChange,
  onChange,
  onSave,
  onDelete,
}: {
  title: string;
  description: string;
  draft: InstructorInput;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (draft: InstructorInput) => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  function update<Key extends keyof InstructorInput>(
    key: Key,
    value: InstructorInput[Key],
  ) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="instructor-first-name">Vorname</FieldLabel>
            <Input
              id="instructor-first-name"
              value={draft.firstName}
              onChange={(event) => update("firstName", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-last-name">Nachname</FieldLabel>
            <Input
              id="instructor-last-name"
              value={draft.lastName}
              onChange={(event) => update("lastName", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-classes">Ausbildungsklassen</FieldLabel>
            <Input
              id="instructor-classes"
              placeholder="z. B. B, B197"
              value={draft.classes}
              onChange={(event) => update("classes", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={(value) =>
                update("status", value as InstructorInput["status"])
              }
            >
              <SelectTrigger id="instructor-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="inaktiv">Inaktiv</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-phone">Telefon</FieldLabel>
            <Input
              id="instructor-phone"
              value={draft.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-email">E-Mail</FieldLabel>
            <Input
              id="instructor-email"
              type="email"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-vehicle">Stammfahrzeug</FieldLabel>
            <Input
              id="instructor-vehicle"
              placeholder="z. B. VW Golf"
              value={draft.vehicle}
              onChange={(event) => update("vehicle", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="instructor-since">Dabei seit</FieldLabel>
            <Input
              id="instructor-since"
              placeholder="z. B. 03/2019"
              value={draft.since}
              onChange={(event) => update("since", event.target.value)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button
              type="button"
              variant="destructive"
              disabled={saving}
              onClick={onDelete}
            >
              <Trash2 data-icon="inline-start" />
              Löschen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Abbrechen
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={saving || !draft.firstName.trim() || !draft.lastName.trim()}
              onClick={onSave}
            >
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstructorCard({
  instructor,
  accent,
  onEdit,
}: {
  instructor: Instructor;
  accent: string;
  onEdit: () => void;
}) {
  const fullName = instructorName(instructor);
  const details = [
    { Icon: Phone, label: "Telefon", value: instructor.phone },
    { Icon: Mail, label: "E-Mail", value: instructor.email },
    { Icon: Car, label: "Stammfahrzeug", value: instructor.vehicle },
    { Icon: CalendarDays, label: "Dabei seit", value: instructor.since },
  ].filter((detail) => detail.value);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              accent,
            )}
          >
            <GraduationCap className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{fullName}</CardTitle>
            <CardDescription>Fahrlehrer/in</CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant={instructor.status === "aktiv" ? "secondary" : "outline"}>
              {instructor.status === "aktiv" ? "Aktiv" : "Inaktiv"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${fullName} bearbeiten`}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit">
          <IdCard data-icon="inline-start" />
          Klassen {instructor.classes || "—"}
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
      </CardContent>
    </Card>
  );
}

export function Fahrlehrer() {
  const { instructors, loading, refresh } = useInstructors();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<InstructorInput>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const startCreating = () => {
    setDraft(emptyDraft);
    setCreating(true);
  };

  const startEditing = (instructor: Instructor) => {
    setDraft(instructorToDraft(instructor));
    setEditingId(instructor.id);
  };

  const save = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await action();
      await refresh();
      setCreating(false);
      setEditingId(null);
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const removeEditingInstructor = async () => {
    if (editingId === null) return;
    const name = `${draft.firstName} ${draft.lastName}`.trim();
    const confirmed = window.confirm(
      `${name || "Diese/n Fahrlehrer/in"} wirklich löschen? Zugeordnete Fahrschüler werden auf „Nicht zugeteilt“ gesetzt.`,
    );
    if (!confirmed) return;

    await save(
      () => deleteInstructor(editingId),
      "Fahrlehrer/in gelöscht. Zugeordnete Fahrschüler wurden aktualisiert.",
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <Button type="button" size="sm" onClick={startCreating}>
            <Plus data-icon="inline-start" />
            Fahrlehrer/in hinzufügen
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:gap-5">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <div className="stagger-in grid gap-4 md:grid-cols-2 2xl:gap-5">
            {instructors.map((instructor, index) => (
              <InstructorCard
                key={instructor.id}
                instructor={instructor}
                accent={accents[index % accents.length]!}
                onEdit={() => startEditing(instructor)}
              />
            ))}
          </div>
        )}
      </div>

      <InstructorDialog
        title="Fahrlehrer/in hinzufügen"
        description="Neue Fahrlehrerin oder neuen Fahrlehrer anlegen."
        draft={draft}
        open={creating}
        saving={saving}
        onOpenChange={(open) => !open && setCreating(false)}
        onChange={setDraft}
        onSave={() => save(() => createInstructor(draft), "Fahrlehrer/in angelegt.")}
      />

      <InstructorDialog
        title="Fahrlehrer/in bearbeiten"
        description="Stammdaten, Status und Zuordnung aktualisieren."
        draft={draft}
        open={editingId !== null}
        saving={saving}
        onOpenChange={(open) => !open && setEditingId(null)}
        onChange={setDraft}
        onSave={() =>
          save(() => updateInstructor(editingId!, draft), "Änderungen gespeichert.")
        }
        onDelete={removeEditingInstructor}
      />
    </div>
  );
}

export default Fahrlehrer;

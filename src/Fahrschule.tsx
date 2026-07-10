import { useEffect, useState } from "react";
import {
  Building2,
  Clock,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { CompanyProfile } from "@/lib/accounting-types";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  createBranch,
  deleteBranch,
  updateBranch,
  useBranches,
  type Branch,
  type BranchInput,
} from "@/hooks/use-branches";
import { useInstructors } from "@/hooks/use-instructors";
import { useStudents } from "@/hooks/use-students";
import { useVehicles } from "@/hooks/use-vehicles";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  panelActionsClass,
  panelCardClass,
  panelHeaderClass,
  panelInteractiveClass,
  Readout,
} from "@/components/Panel";

/* ------------------------------------------------------------------ */
/* School summary (read-only — edited on /profil)                      */
/* ------------------------------------------------------------------ */

function SchoolSummaryCard({ profile }: { profile: CompanyProfile | null }) {
  const details = profile
    ? [
        { Icon: MapPin, label: "Anschrift", value: profile.address },
        { Icon: Phone, label: "Telefon", value: profile.phone },
        { Icon: Mail, label: "E-Mail", value: profile.email },
        { Icon: Globe, label: "Webseite", value: profile.website },
      ].filter((detail) => detail.value)
    : [];

  return (
    <Card className={panelCardClass}>
      <CardHeader className={panelHeaderClass}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <CardTitle className="truncate text-[15px] font-semibold tracking-[-0.01em]">
              {profile?.name || "Fahrschule"}
            </CardTitle>
            <CardDescription className="text-xs">Unternehmensprofil</CardDescription>
          </div>
        </div>
      </CardHeader>
      {details.length > 0 && (
        <CardContent className="py-0">
          <dl className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {details.map(({ Icon, label, value }, index) => (
              <div
                key={label}
                className={`flex min-w-0 items-center gap-2.5 py-3 sm:px-4 ${index === 0 ? "sm:pl-0" : ""}`}
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="truncate text-sm font-medium">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stats                                                         */
/* ------------------------------------------------------------------ */

function StatReadout({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="min-w-20 px-4 first:pl-0 last:pr-0">
      {loading ? (
        <Skeleton className="mb-1 h-4 w-8" />
      ) : (
        <Readout label={label} value={String(value)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Branch dialog (create + edit)                                       */
/* ------------------------------------------------------------------ */

const emptyDraft: BranchInput = {
  name: "",
  address: "",
  phone: "",
  email: "",
  openingHours: "",
  isMain: false,
  status: "offen",
};

function branchToDraft(branch: Branch): BranchInput {
  const { id: _id, createdAt: _createdAt, ...draft } = branch;
  return draft;
}

function BranchDialog({
  title,
  description,
  draft,
  open,
  saving,
  onOpenChange,
  onChange,
  onSave,
}: {
  title: string;
  description: string;
  draft: BranchInput;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (draft: BranchInput) => void;
  onSave: () => void;
}) {
  function update<Key extends keyof BranchInput>(key: Key, value: BranchInput[Key]) {
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
            <FieldLabel htmlFor="branch-name">Name</FieldLabel>
            <Input
              id="branch-name"
              placeholder="z. B. Hauptstelle Mitte"
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-address">Adresse</FieldLabel>
            <Input
              id="branch-address"
              placeholder="Straße Nr., PLZ Ort"
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-phone">Telefon</FieldLabel>
            <Input
              id="branch-phone"
              type="tel"
              value={draft.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-email">E-Mail</FieldLabel>
            <Input
              id="branch-email"
              type="email"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-hours">Öffnungszeiten</FieldLabel>
            <Input
              id="branch-hours"
              placeholder="z. B. Mo–Fr 14–18 Uhr"
              value={draft.openingHours}
              onChange={(event) => update("openingHours", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={(value) => update("status", value as BranchInput["status"])}
            >
              <SelectTrigger id="branch-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="offen">Offen</SelectItem>
                  <SelectItem value="geschlossen">Geschlossen</SelectItem>
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
            disabled={saving || !draft.name.trim() || !draft.address.trim()}
            onClick={onSave}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Branch card                                                         */
/* ------------------------------------------------------------------ */

function BranchCard({
  branch,
  onEdit,
  onDelete,
  onMakeMain,
}: {
  branch: Branch;
  onEdit: () => void;
  onDelete: () => void;
  onMakeMain: () => void;
}) {
  const details = [
    { Icon: MapPin, label: "Adresse", value: branch.address },
    { Icon: Phone, label: "Telefon", value: branch.phone },
    { Icon: Mail, label: "E-Mail", value: branch.email },
    { Icon: Clock, label: "Öffnungszeiten", value: branch.openingHours },
  ].filter((detail) => detail.value);

  return (
    <Card className={`group/card ${panelCardClass} ${panelInteractiveClass}`}>
      <CardHeader className={`${panelHeaderClass} grid-cols-1 sm:grid-cols-[1fr_auto]`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-medium">{branch.name}</CardTitle>
            <CardDescription className="truncate text-xs">
              {branch.address}
            </CardDescription>
          </div>
        </div>
        <CardAction className="col-start-1 row-start-2 row-span-1 justify-self-start sm:col-start-2 sm:row-start-1 sm:row-span-2 sm:justify-self-end">
          <div className="flex items-center gap-1.5">
            {branch.isMain && (
              <Badge variant="outline" className="gap-1.5 font-normal">
                <span className="size-1.5 rounded-full bg-primary" />
                Hauptstandort
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span
                className={`size-1.5 rounded-full ${branch.status === "offen" ? "bg-green-600 dark:bg-green-400" : "bg-muted-foreground"}`}
              />
              {branch.status === "offen" ? "Offen" : "Geschlossen"}
            </Badge>
            <div className={`flex items-center ${panelActionsClass}`}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${branch.name} bearbeiten`}
                onClick={onEdit}
              >
                <Pencil />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`${branch.name} löschen`}
                onClick={onDelete}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 py-3">
        {details.length > 0 && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {details.map(({ Icon, label, value }) => (
              <div key={label} className="flex min-w-0 items-center gap-2.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <dt className="text-[11px] font-medium text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="truncate text-sm">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
        {!branch.isMain && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={onMakeMain}
          >
            <Star data-icon="inline-start" />
            Als Hauptstandort festlegen
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Fahrschule() {
  const { branches, loading: branchesLoading, refresh } = useBranches();
  const { students, loading: studentsLoading } = useStudents();
  const { instructors, loading: instructorsLoading } = useInstructors();
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [draft, setDraft] = useState<BranchInput>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Profil-Request fehlgeschlagen.");
        return res.json();
      })
      .then((data: CompanyProfile) => setProfile(data))
      .catch(() => toast.error("Profil konnte nicht geladen werden."));
  }, []);

  const startCreating = () => {
    setDraft(emptyDraft);
    setCreating(true);
  };

  const startEditing = (branch: Branch) => {
    setDraft(branchToDraft(branch));
    setEditingId(branch.id);
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

  const makeMain = async (branch: Branch) => {
    try {
      await updateBranch(branch.id, { isMain: true });
      await refresh();
      toast.success(`„${branch.name}" ist jetzt der Hauptstandort.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    }
  };

  const removeBranch = async () => {
    if (!deleting) return;
    try {
      await deleteBranch(deleting.id);
      await refresh();
      toast.success("Standort gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        center={
          <div className="hidden divide-x divide-border/70 lg:flex">
            <StatReadout
              label="Fahrschüler"
              value={students.length}
              loading={studentsLoading}
            />
            <StatReadout
              label="Fahrlehrer/innen"
              value={instructors.length}
              loading={instructorsLoading}
            />
            <StatReadout
              label="Fahrzeuge"
              value={vehicles.length}
              loading={vehiclesLoading}
            />
            <StatReadout
              label="Standorte"
              value={branches.length}
              loading={branchesLoading}
            />
          </div>
        }
        end={
          <Button type="button" size="sm" onClick={startCreating}>
            <Plus data-icon="inline-start" />
            <span className="hidden sm:inline">Standort hinzufügen</span>
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="stagger-in mx-auto flex max-w-[1180px] flex-col gap-5">
          <SchoolSummaryCard profile={profile} />

          <div className="grid grid-cols-2 divide-x divide-y divide-border/70 rounded-lg border border-border/80 px-4 py-3 lg:hidden">
            <StatReadout
              label="Fahrschüler"
              value={students.length}
              loading={studentsLoading}
            />
            <StatReadout
              label="Fahrlehrer/innen"
              value={instructors.length}
              loading={instructorsLoading}
            />
            <StatReadout
              label="Fahrzeuge"
              value={vehicles.length}
              loading={vehiclesLoading}
            />
            <StatReadout
              label="Standorte"
              value={branches.length}
              loading={branchesLoading}
            />
          </div>

          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Standorte</h2>
              <p className="text-xs text-muted-foreground">
                Filialen und Anmeldestellen Ihrer Fahrschule verwalten.
              </p>
            </div>
            {!branchesLoading && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {branches.length} {branches.length === 1 ? "Standort" : "Standorte"}
              </span>
            )}
          </div>

          {branchesLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  onEdit={() => startEditing(branch)}
                  onDelete={() => setDeleting(branch)}
                  onMakeMain={() => void makeMain(branch)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BranchDialog
        title="Standort hinzufügen"
        description="Neue Filiale oder Anmeldestelle anlegen."
        draft={draft}
        open={creating}
        saving={saving}
        onOpenChange={(open) => !open && setCreating(false)}
        onChange={setDraft}
        onSave={() => save(() => createBranch(draft), "Standort angelegt.")}
      />

      <BranchDialog
        title="Standort bearbeiten"
        description="Adresse, Kontakt und Öffnungszeiten aktualisieren."
        draft={draft}
        open={editingId !== null}
        saving={saving}
        onOpenChange={(open) => !open && setEditingId(null)}
        onChange={setDraft}
        onSave={() =>
          save(() => updateBranch(editingId!, draft), "Änderungen gespeichert.")
        }
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Standort löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `„${deleting.name}" (${deleting.address}) wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void removeBranch()}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Fahrschule;

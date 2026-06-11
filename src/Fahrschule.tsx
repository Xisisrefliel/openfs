import { useEffect, useState } from "react";
import {
  Building2,
  Car,
  Clock,
  GraduationCap,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  Users,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

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
      ].filter(detail => detail.value)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
            <Building2 className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">
              {profile?.name || "Fahrschule"}
            </CardTitle>
            <CardDescription>Stammdaten der Fahrschule</CardDescription>
          </div>
        </div>
      </CardHeader>
      {details.length > 0 && (
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
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
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stats                                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  Icon,
  accent,
  label,
  value,
  loading,
}: {
  Icon: IconCmp;
  accent: string;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          {loading ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <span className="text-xl font-semibold tabular-nums">{value}</span>
          )}
          <span className="truncate text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
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
  function update<Key extends keyof BranchInput>(
    key: Key,
    value: BranchInput[Key]
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
            <FieldLabel htmlFor="branch-name">Name</FieldLabel>
            <Input
              id="branch-name"
              placeholder="z. B. Hauptstelle Mitte"
              value={draft.name}
              onChange={event => update("name", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-address">Adresse</FieldLabel>
            <Input
              id="branch-address"
              placeholder="Straße Nr., PLZ Ort"
              value={draft.address}
              onChange={event => update("address", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-phone">Telefon</FieldLabel>
            <Input
              id="branch-phone"
              type="tel"
              value={draft.phone}
              onChange={event => update("phone", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-email">E-Mail</FieldLabel>
            <Input
              id="branch-email"
              type="email"
              value={draft.email}
              onChange={event => update("email", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-hours">Öffnungszeiten</FieldLabel>
            <Input
              id="branch-hours"
              placeholder="z. B. Mo–Fr 14–18 Uhr"
              value={draft.openingHours}
              onChange={event => update("openingHours", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="branch-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={value =>
                update("status", value as BranchInput["status"])
              }
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
  ].filter(detail => detail.value);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              branch.isMain
                ? "bg-amber-500/10 text-amber-600"
                : "bg-sky-500/10 text-sky-600"
            )}
          >
            <Building2 className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{branch.name}</CardTitle>
            <CardDescription>Standort</CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            {branch.isMain && (
              <Badge variant="secondary">
                <Star data-icon="inline-start" />
                Hauptstandort
              </Badge>
            )}
            <Badge variant={branch.status === "offen" ? "secondary" : "outline"}>
              {branch.status === "offen" ? "Offen" : "Geschlossen"}
            </Badge>
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
              variant="destructive"
              size="icon-sm"
              aria-label={`${branch.name} löschen`}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {details.length > 0 && (
          <>
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
            {!branch.isMain && <Separator />}
          </>
        )}
        {!branch.isMain && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
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
      .then(res => {
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
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
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
      toast.error(
        error instanceof Error ? error.message : "Aktion fehlgeschlagen."
      );
    }
  };

  const removeBranch = async () => {
    if (!deleting) return;
    try {
      await deleteBranch(deleting.id);
      await refresh();
      toast.success("Standort gelöscht.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <Button type="button" size="sm" onClick={startCreating}>
            <Plus data-icon="inline-start" />
            Standort hinzufügen
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="stagger-in flex flex-col gap-4 2xl:gap-5">
          {/* School summary */}
          <SchoolSummaryCard profile={profile} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 2xl:gap-5">
            <StatCard
              Icon={Users}
              accent="bg-emerald-500/10 text-emerald-600"
              label="Fahrschüler"
              value={students.length}
              loading={studentsLoading}
            />
            <StatCard
              Icon={GraduationCap}
              accent="bg-violet-500/10 text-violet-600"
              label="Fahrlehrer/innen"
              value={instructors.length}
              loading={instructorsLoading}
            />
            <StatCard
              Icon={Car}
              accent="bg-rose-500/10 text-rose-600"
              label="Fahrzeuge"
              value={vehicles.length}
              loading={vehiclesLoading}
            />
            <StatCard
              Icon={Building2}
              accent="bg-sky-500/10 text-sky-600"
              label="Standorte"
              value={branches.length}
              loading={branchesLoading}
            />
          </div>

          {/* Branches */}
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Standorte</h2>
            <p className="text-xs text-muted-foreground">
              Filialen und Anmeldestellen Ihrer Fahrschule verwalten.
            </p>
          </div>

          {branchesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:gap-5">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:gap-5">
              {branches.map(branch => (
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
        onOpenChange={open => !open && setCreating(false)}
        onChange={setDraft}
        onSave={() => save(() => createBranch(draft), "Standort angelegt.")}
      />

      <BranchDialog
        title="Standort bearbeiten"
        description="Adresse, Kontakt und Öffnungszeiten aktualisieren."
        draft={draft}
        open={editingId !== null}
        saving={saving}
        onOpenChange={open => !open && setEditingId(null)}
        onChange={setDraft}
        onSave={() =>
          save(() => updateBranch(editingId!, draft), "Änderungen gespeichert.")
        }
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={open => !open && setDeleting(null)}
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
            <AlertDialogAction
              variant="destructive"
              onClick={() => void removeBranch()}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Fahrschule;

import { useEffect, useMemo, useState } from "react";
import { Car, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import { useInstructors } from "@/hooks/use-instructors";
import {
  useVehicles,
  updateVehicle,
  createVehicle,
  deleteVehicle,
  type Vehicle as VehicleRecord,
  type VehicleDetail,
} from "@/hooks/use-vehicles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Detail = { label: string; value: string };
type Vehicle = Omit<VehicleRecord, "details"> & {
  details: Detail[];
};

type VehicleDraft = Omit<VehicleRecord, "id" | "details" | "accent"> & {
  gearbox: string;
  fuel: string;
  mileage: string;
  instructor: string;
  inspection: string;
  insurance: string;
};

const detailLabels = {
  gearbox: "Getriebe",
  fuel: "Kraftstoff",
  mileage: "Kilometerstand",
  instructor: "Fahrlehrer/in",
  inspection: "Nächste HU",
  insurance: "Versicherung",
} as const;

const STATUS_DOTS: Record<VehicleRecord["status"], string> = {
  aktiv: "bg-green-500",
  wartung: "bg-amber-500",
};

const STATUS_LABELS: Record<VehicleRecord["status"], string> = {
  aktiv: "Aktiv",
  wartung: "In Wartung",
};

function mapVehicleDetails(details: VehicleDetail[]): Detail[] {
  const values = new Map(details.map((item) => [item.label, item.value]));
  return Object.values(detailLabels).map((label) => ({
    label,
    value: values.get(label) ?? "",
  }));
}

function toVehicle(record: VehicleRecord): Vehicle {
  return {
    ...record,
    details: mapVehicleDetails(record.details),
  };
}

function createEmptyVehicle(): Vehicle {
  return {
    id: 0,
    model: "",
    plate: "",
    klass: "",
    status: "aktiv",
    accent: "bg-slate-500/10 text-slate-600",
    details: Object.values(detailLabels).map((label) => ({
      label,
      value: label === "Fahrlehrer/in" ? "Nicht zugeteilt" : "",
    })),
  };
}

function toApiPayload(vehicle: Vehicle) {
  return {
    model: vehicle.model,
    plate: vehicle.plate,
    klass: vehicle.klass,
    status: vehicle.status,
    accent: vehicle.accent,
    details: vehicle.details.map((detail) => ({
      label: detail.label,
      value: detail.value,
    })),
  };
}

function vehicleToDraft(vehicle: Vehicle): VehicleDraft {
  const detailValue = (label: string) =>
    vehicle.details.find((detail) => detail.label === label)?.value ?? "";

  return {
    model: vehicle.model,
    plate: vehicle.plate,
    klass: vehicle.klass,
    status: vehicle.status,
    gearbox: detailValue(detailLabels.gearbox),
    fuel: detailValue(detailLabels.fuel),
    mileage: detailValue(detailLabels.mileage),
    instructor: detailValue(detailLabels.instructor),
    inspection: detailValue(detailLabels.inspection),
    insurance: detailValue(detailLabels.insurance),
  };
}

function applyDraft(vehicle: Vehicle, draft: VehicleDraft): Vehicle {
  const detailValues = new Map<string, string>([
    [detailLabels.gearbox, draft.gearbox],
    [detailLabels.fuel, draft.fuel],
    [detailLabels.mileage, draft.mileage],
    [detailLabels.instructor, draft.instructor],
    [detailLabels.inspection, draft.inspection],
    [detailLabels.insurance, draft.insurance],
  ]);

  return {
    ...vehicle,
    model: draft.model,
    plate: draft.plate,
    klass: draft.klass,
    status: draft.status,
    details: vehicle.details.map((detail) => ({
      ...detail,
      value: detailValues.get(detail.label) ?? detail.value,
    })),
  };
}

/* Status as a colored dot + plain label in an outline badge (guideline §3). */
function StatusBadge({ status }: { status: VehicleRecord["status"] }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOTS[status])} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function VehicleEditDialog({
  vehicle,
  open,
  onOpenChange,
  onSave,
  instructorOptions,
  mode,
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicle: Vehicle) => Promise<void> | void;
  instructorOptions: string[];
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<VehicleDraft | null>(null);

  useEffect(() => {
    setDraft(open && vehicle ? vehicleToDraft(vehicle) : null);
  }, [open, vehicle?.id]);

  function update<Key extends keyof VehicleDraft>(key: Key, value: VehicleDraft[Key]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setDraft(null);
    }
  }

  if (!vehicle || !draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Fahrzeug hinzufügen" : "Fahrzeug bearbeiten"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Fahrzeugdaten anlegen."
              : "Stammdaten, Status und Fahrzeugdetails aktualisieren."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vehicle-model">Modell</FieldLabel>
            <Input
              id="vehicle-model"
              value={draft.model}
              onChange={(event) => update("model", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-plate">Kennzeichen</FieldLabel>
            <Input
              id="vehicle-plate"
              value={draft.plate}
              onChange={(event) => update("plate", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-class">Klasse</FieldLabel>
            <Input
              id="vehicle-class"
              value={draft.klass}
              onChange={(event) => update("klass", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={(value) => update("status", value as Vehicle["status"])}
            >
              <SelectTrigger id="vehicle-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="wartung">In Wartung</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-gearbox">Getriebe</FieldLabel>
            <Input
              id="vehicle-gearbox"
              value={draft.gearbox}
              onChange={(event) => update("gearbox", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-fuel">Kraftstoff</FieldLabel>
            <Input
              id="vehicle-fuel"
              value={draft.fuel}
              onChange={(event) => update("fuel", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-mileage">Kilometerstand</FieldLabel>
            <Input
              id="vehicle-mileage"
              value={draft.mileage}
              onChange={(event) => update("mileage", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-instructor">Fahrlehrer/in</FieldLabel>
            <Select
              value={draft.instructor}
              onValueChange={(value) => update("instructor", value)}
            >
              <SelectTrigger id="vehicle-instructor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(instructorOptions.includes(draft.instructor)
                    ? instructorOptions
                    : [draft.instructor, ...instructorOptions]
                  ).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-inspection">Nächste HU</FieldLabel>
            <Input
              id="vehicle-inspection"
              value={draft.inspection}
              onChange={(event) => update("inspection", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vehicle-insurance">Versicherung</FieldLabel>
            <Input
              id="vehicle-insurance"
              value={draft.insurance}
              onChange={(event) => update("insurance", event.target.value)}
            />
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
                await onSave(applyDraft(vehicle, draft));
                handleOpenChange(false);
              } catch (error) {
                console.error("Fahrzeug konnte nicht gespeichert werden:", error);
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

function vehicleDetail(vehicle: Vehicle, label: string) {
  return vehicle.details.find((detail) => detail.label === label)?.value || "—";
}

function VehicleRow({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow
      tabIndex={0}
      className="group/row cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit();
        }
      }}
    >
      <TableCell>
        <div className="flex min-w-40 flex-col gap-0.5">
          <span className="font-medium">{vehicle.model}</span>
          <span className="font-mono text-xs tracking-tight text-muted-foreground">
            {vehicle.plate}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{vehicle.klass || "—"}</TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {vehicleDetail(vehicle, detailLabels.gearbox)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground lg:table-cell">
        {vehicleDetail(vehicle, detailLabels.fuel)}
      </TableCell>
      <TableCell className="hidden tabular-nums xl:table-cell">
        {vehicleDetail(vehicle, detailLabels.mileage)}
      </TableCell>
      <TableCell className="hidden xl:table-cell">
        {vehicleDetail(vehicle, detailLabels.instructor)}
      </TableCell>
      <TableCell className="hidden tabular-nums 2xl:table-cell">
        {vehicleDetail(vehicle, detailLabels.inspection)}
      </TableCell>
      <TableCell>
        <StatusBadge status={vehicle.status} />
      </TableCell>
      <TableCell className="w-20 text-right">
        <div className="flex justify-end opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${vehicle.model} bearbeiten`}
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`${vehicle.model} löschen`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function Fahrzeuge() {
  const { assignableNames: instructorOptions } = useInstructors();
  const { vehicles: storedVehicles, loading, refresh } = useVehicles();
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const emptyVehicle = useMemo(() => createEmptyVehicle(), []);
  const vehicleList = useMemo(() => storedVehicles.map(toVehicle), [storedVehicles]);
  const editingMode: "create" | "edit" = isCreateVehicleOpen ? "create" : "edit";
  const editingVehicle = isCreateVehicleOpen
    ? emptyVehicle
    : (vehicleList.find((vehicle) => vehicle.id === editingVehicleId) ?? null);
  const isDialogOpen = editingMode === "create" || editingVehicleId !== null;
  const deletingVehicle =
    vehicleList.find((vehicle) => vehicle.id === deletingVehicleId) ?? null;

  async function removeVehicle() {
    if (!deletingVehicle) return;
    try {
      await deleteVehicle(deletingVehicle.id);
      await refresh();
      toast.success("Fahrzeug gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    } finally {
      if (editingVehicleId === deletingVehicle.id) {
        setEditingVehicleId(null);
      }
      setDeletingVehicleId(null);
    }
  }

  // DB-backed roster — same source as /fahrlehrer and the calendar.
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingVehicleId(null);
              setIsCreateVehicleOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Fahrzeug hinzufügen
          </Button>
        }
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Fahrzeuge</h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {loading ? "—" : vehicleList.length}
          </span>
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        {loading ? (
          <div className="overflow-hidden rounded-lg border">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-14 rounded-none border-b last:border-0"
              />
            ))}
          </div>
        ) : vehicleList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-muted-foreground">
            <Car className="size-5" />
            <span className="text-sm">Noch keine Fahrzeuge angelegt.</span>
          </div>
        ) : (
          <div className="animate-enter overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Fahrzeug</TableHead>
                  <TableHead>Klasse</TableHead>
                  <TableHead className="hidden md:table-cell">Getriebe</TableHead>
                  <TableHead className="hidden lg:table-cell">Kraftstoff</TableHead>
                  <TableHead className="hidden xl:table-cell">Kilometerstand</TableHead>
                  <TableHead className="hidden xl:table-cell">Fahrlehrer/in</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Nächste HU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Aktionen</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleList.map((vehicle) => (
                  <VehicleRow
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={() => setEditingVehicleId(vehicle.id)}
                    onDelete={() => setDeletingVehicleId(vehicle.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <VehicleEditDialog
        vehicle={editingVehicle}
        instructorOptions={instructorOptions}
        mode={editingMode}
        open={isDialogOpen && editingVehicle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVehicleId(null);
            setIsCreateVehicleOpen(false);
          }
        }}
        onSave={async (updatedVehicle) => {
          if (editingMode === "create") {
            await createVehicle(toApiPayload(updatedVehicle));
          } else if (editingVehicleId !== null) {
            await updateVehicle(editingVehicleId, toApiPayload(updatedVehicle));
          } else {
            return;
          }
          await refresh();
          setEditingVehicleId(null);
          setIsCreateVehicleOpen(false);
        }}
      />

      <AlertDialog
        open={deletingVehicle !== null}
        onOpenChange={(open) => !open && setDeletingVehicleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fahrzeug löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingVehicle
                ? `„${deletingVehicle.model}" (${deletingVehicle.plate}) wird entfernt. Zugeordnete Schüler und Fahrlehrer werden auf „Nicht zugeteilt" gesetzt.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void removeVehicle()}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Fahrzeuge;

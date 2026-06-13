import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Cog,
  Fuel,
  Gauge,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

type Detail = { Icon: IconCmp; label: string; value: string };
type Vehicle = Omit<VehicleRecord, "details"> & {
  details: Detail[];
};

const detailIcons: Readonly<Record<string, IconCmp>> = {
  Getriebe: Cog,
  Kraftstoff: Fuel,
  Kilometerstand: Gauge,
  "Fahrlehrer/in": User,
  "Nächste HU": Wrench,
  Versicherung: ShieldCheck,
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

const DEFAULT_ICON = Wrench;

function mapVehicleDetails(details: VehicleDetail[]): Detail[] {
  const values = new Map(details.map((item) => [item.label, item.value]));
  return Object.values(detailLabels).map((label) => ({
    Icon: detailIcons[label] ?? DEFAULT_ICON,
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
      Icon: detailIcons[label] ?? DEFAULT_ICON,
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

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              vehicle.accent,
            )}
          >
            <Car className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{vehicle.model}</CardTitle>
            <CardDescription className="font-mono tracking-tight">
              {vehicle.plate}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant={vehicle.status === "aktiv" ? "secondary" : "outline"}>
              {vehicle.status === "aktiv" ? "Aktiv" : "In Wartung"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${vehicle.model} bearbeiten`}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`${vehicle.model} löschen`}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit">
          Klasse {vehicle.klass}
        </Badge>
        <Separator />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {vehicle.details.map(({ Icon, label, value }) => (
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

export function Fahrzeuge() {
  const { assignableNames: instructorOptions } = useInstructors();
  const { vehicles: storedVehicles, loading, refresh } = useVehicles();
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const emptyVehicle = useMemo(() => createEmptyVehicle(), []);
  const vehicleList = useMemo(() => storedVehicles.map(toVehicle), [storedVehicles]);
  const editingMode: "create" | "edit" = isCreateVehicleOpen ? "create" : "edit";
  const editingVehicle = isCreateVehicleOpen
    ? emptyVehicle
    : (vehicleList.find((vehicle) => vehicle.id === editingVehicleId) ?? null);
  const isDialogOpen = editingMode === "create" || editingVehicleId !== null;

  async function removeVehicle(vehicle: Vehicle) {
    const confirmed = window.confirm(
      `"${vehicle.model}" (${vehicle.plate}) wirklich löschen? Zugeordnete Schüler und Fahrlehrer werden auf „Nicht zugeteilt“ gesetzt.`,
    );
    if (!confirmed) return;

    try {
      await deleteVehicle(vehicle.id);
      await refresh();
      toast.success("Fahrzeug gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    } finally {
      if (editingVehicleId === vehicle.id) {
        setEditingVehicleId(null);
      }
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
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="stagger-in grid gap-4 md:grid-cols-2 2xl:gap-5">
          {loading && (
            <div className="text-sm text-muted-foreground">Lade Fahrzeuge…</div>
          )}
          {vehicleList.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={() => setEditingVehicleId(vehicle.id)}
              onDelete={() => void removeVehicle(vehicle)}
            />
          ))}
        </div>
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
    </div>
  );
}

export default Fahrzeuge;
